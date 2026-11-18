#!/usr/bin/env node
/**
 * The PC job runner (B4100-B4109). Runs on the owner's PC, takes PC jobs straight from GitHub issues (label pc-job, opened
 * by the owner's account; format in jobs.mjs) and runs them on the testbed lanes side by side, one job per lane, in
 * priority order (a waiting job gains a step each hour, B6490), with no thread or coordinator passing them along. Results go back to the issue as a comment and the
 * issue is closed with pc-done or pc-failed.
 *
 *   node tools/pcq/runner.mjs [--once] [--dry] [--no-update]         (started by run-runner.ps1, which restarts it after updates)
 *
 * Error checking:
 * - Lane clash check at start (jobs.mjs laneClashes): no lane 1, no shared port or folder, no Live world.
 * - Health: every idle lane is probed every 5 minutes; a lane that is down is started once; one that stays down is
 *   taken out of service and gets an alert issue (label pc-alert), closed again when it comes back.
 * - Hang guard: every step has a time limit and is ended with its whole process tree past it (run-gate.mjs has its
 *   own per-gate limits inside that). B7201: a lane's share of a gates job stops at jobCeilingMinutes (240), a
 *   run-gate that prints nothing for longer than its longest gate limit plus 11 minutes is ended, and run-gate's own
 *   hang watch ends a run whose lane stops answering within about two minutes; each is a lane fault (reset, retry).
 * - One retry on a lane fault (no free lane, drift, run-gate's watchdog, a deploy or start that fails): reset the
 *   lane, deploy again and run once more. A gate that fails is a result, not a fault, and is not retried.
 * - Recheck (B4610, B7310): each failing gate is rerun alone on a fresh lane (a failure twice), then on main, and the result says whether it
 *   is new with this change, failing on main too, or failing only after other gates.
 * - Resources: no lane job starts below minFreeRamGB of free memory or minFreeGB on a drive; a hold of more than
 *   30 minutes raises an alert.
 * - A runner that stopped mid-job: on start, issues still marked pc-running are queued again.
 * - Status: the issue labelled pc-status shows each lane, the queue and the last results, updated every 2 minutes,
 *   so any thread can see the runner is alive.
 * Every hour it also sweeps stale pull requests (sweep.mjs, B4110). Every few minutes the Main PC's runner moves the
 * merge train on (train.mjs, B7202), and the gate job of the pull request at its front runs before other gate jobs. Every minute it logs the graphics card heat (gpu.mjs).
 * Never touches lane 1 or the Live world; writes nothing to the shared project folder.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawn, spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {OWNER, REPO_NAME, LABEL, LANE_KINDS, parseBody, validate, order, gateArgs, isInfraFault, laneClashes, fit, failingGates, gateDigest, gatePassed, recheckStep, gateStatusFor, GATE_CONTEXT, resetsFirst} from "./jobs.mjs";
import {loadConfig, getLane, laneDir, laneUrl, laneRefuses, lockState, isUp, readJson} from "../lanes/lib.mjs";
import {sweep, HOUR} from "./sweep.mjs";
import {step as trainStep, isFrontJob} from "./train.mjs";
import * as gpu from "./gpu.mjs";
import {readQueue, putBack, stop as stopQueue} from "../lanes/gate-queue.mjs";
import {prMark, staleWhy, jobOfLog} from "./stale.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../..");
const args = process.argv.slice(2), DRY = args.includes("--dry"), ONCE = args.includes("--once");
const expand = s => String(s).replace(/%(\w+)%/g, (_, k) => process.env[k] ?? "");
// B6880: a PC with its own runner.<hostname>.json (the second PC) takes those keys over runner.json's.
const HOST = (process.env.WODX_HOST ?? os.hostname()).toLowerCase();
const conf = {...readJson(path.join(HERE, "runner.json")), ...readJson(path.join(HERE, `runner.${HOST}.json`), {})};
const NAME = conf.name ?? "PC runner", STATUS_TITLE = conf.statusTitle ?? "PC runner status", ALERT_PREFIX = conf.alertPrefix ?? "PC runner alert";
const HOME = expand(conf.home), LOGS = path.join(HOME, "logs"), WT = path.join(HOME, "wt");
fs.mkdirSync(LOGS, {recursive: true}); fs.mkdirSync(WT, {recursive: true});
const logFile = path.join(LOGS, `runner-${new Date().toISOString().slice(0, 10)}.log`);
const log = (...a) => { const l = `${new Date().toISOString()} ${a.join(" ")}`; console.log(l); fs.appendFileSync(logFile, l + "\n"); };
const cfg = loadConfig();
const LANES = conf.lanes.map(String);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const short = s => String(s).slice(0, 8);

// ---- GitHub ----
function token() {
  if ( process.env.WODX_PCQ_TOKEN ) return process.env.WODX_PCQ_TOKEN;
  const r = spawnSync("git", ["credential", "fill"], {input: "protocol=https\nhost=github.com\n\n", encoding: "utf8", windowsHide: true});
  const t = /^password=(.+)$/m.exec(r.stdout ?? "")?.[1];
  if ( !t ) throw new Error("No GitHub token from git credential fill (Git Credential Manager signed in as the owner).");
  return t.trim();
}
let TOKEN = token();
async function gh(method, url, body) {
  for ( let i = 0; i < 4; i++ ) {
    try {
      const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO_NAME}${url}`, {method, body: body ? JSON.stringify(body) : undefined,
        headers: {Authorization: `token ${TOKEN}`, "User-Agent": "wodx-pcq", Accept: "application/vnd.github+json", "Content-Type": "application/json"}});
      if ( r.status === 401 && i === 0 ) { TOKEN = token(); continue; }
      if ( r.status >= 500 || r.status === 429 ) throw new Error(`GitHub ${r.status}`);
      const text = await r.text();
      if ( !r.ok ) throw new Error(`GitHub ${method} ${url}: ${r.status} ${text.slice(0, 300)}`);
      return text ? JSON.parse(text) : null;
    } catch (e) { if ( i === 3 ) throw e; await sleep(5000 * 2 ** i); }
  }
}
const comment = (n, body) => DRY ? log(`[dry] comment #${n}: ${body.slice(0, 200)}`) : gh("POST", `/issues/${n}/comments`, {body: fit(body)});
const setLabels = (n, add = [], remove = []) => DRY ? null : Promise.all([
  add.length ? gh("POST", `/issues/${n}/labels`, {labels: add}) : null,
  ...remove.map(l => gh("DELETE", `/issues/${n}/labels/${encodeURIComponent(l)}`).catch(() => null))]);
const close = n => DRY ? null : gh("PATCH", `/issues/${n}`, {state: "closed"});
const openIssues = async label => (await gh("GET", `/issues?state=open&labels=${label}&per_page=100&sort=created&direction=asc`))
  .filter(i => !i.pull_request && i.user?.login === OWNER);

// ---- processes ----
/**
 * Runs a command with a time limit; past it the whole process tree is ended. Returns {code, out}. B7201: with
 * stallMinutes, a command that prints nothing for that long is ended the same way (a run-gate that froze), so a lane
 * is back in minutes rather than at the end of a limit of hours.
 */
const procs = new Map(); // job tag -> its running child processes (B7206)
const endTree = p => { if ( process.platform === "win32" ) spawnSync("taskkill", ["/PID", String(p.pid), "/T", "/F"], {windowsHide: true}); else p.kill("SIGKILL"); };
function run(cmd, argv, {cwd = ROOT, minutes = 30, stallMinutes = 0, logTo} = {}) {
  return new Promise(done => {
    if ( DRY ) { log(`[dry] ${cmd} ${argv.join(" ")}`); return done({code: 0, out: ""}); }
    const p = spawn(cmd, argv, {cwd, windowsHide: true, env: {...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1"}});
    try { os.setPriority(p.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch {}
    // B7206: each job's processes are known by its log name (jobN-...), so a cancelled job can end them
    const owner = jobOfLog(logTo);
    if ( owner ) { (procs.get(owner) ?? procs.set(owner, new Set()).get(owner)).add(p); p.on("exit", () => procs.get(owner)?.delete(p)); }
    let out = "", timedOut = false, lastData = Date.now();
    const keep = d => { lastData = Date.now(); out += d; if ( out.length > 400000 ) out = out.slice(-300000); if ( logTo ) fs.appendFileSync(logTo, d); };
    p.stdout.on("data", keep); p.stderr.on("data", keep);
    const end = why => {
      if ( timedOut ) return;
      timedOut = true; log(`${why} for ${path.basename(argv[0] ?? cmd)}: ending process tree ${p.pid}`);
      if ( process.platform === "win32" ) spawnSync("taskkill", ["/PID", String(p.pid), "/T", "/F"], {windowsHide: true}); else p.kill("SIGKILL");
    };
    const t = setTimeout(() => end(`time limit (${minutes} min)`), minutes * 60000);
    const s = stallMinutes > 0 ? setInterval(() => { if ( Date.now() - lastData > stallMinutes * 60000 ) end(`no output for ${stallMinutes} min`); }, 30000) : null;
    const stopTimers = () => { clearTimeout(t); if ( s ) clearInterval(s); };
    p.on("error", e => { stopTimers(); done({code: null, out: out + `\n${e.message}`}); });
    p.on("exit", code => { stopTimers(); done({code: timedOut ? null : code, out, timedOut}); });
  });
}
const node = (script, argv, o) => run(process.execPath, [path.join(ROOT, script), ...argv], o);
const lanesCmd = (argv, o) => node("tools/lanes/lanes.mjs", argv, {minutes: 25, ...o});

// ---- git: one operation at a time ----
let gitChain = Promise.resolve();
const git = (argv, cwd = ROOT) => (gitChain = gitChain.then(() => spawnSync("git", argv, {cwd, encoding: "utf8", windowsHide: true})));
/** A worktree for a lane, checked out at the job's ref. Returns {dir, sha} or {error}. */
async function worktree(lane, ref) {
  const dir = path.join(WT, `l${lane}`);
  const branch = /^(claude|handoff)\//.test(ref);
  const remote = ref === "main" ? "origin/main" : branch ? `origin/${ref}` : ref;
  const f = await git(branch ? ["fetch", "-q", "origin", `+refs/heads/${ref}:refs/remotes/origin/${ref}`] : ["fetch", "-q", "origin"]);
  if ( f.status ) return {error: `git fetch failed: ${f.stderr.trim()}`};
  const sha = (await git(["rev-parse", "--verify", `${remote}^{commit}`])).stdout.trim();
  if ( !sha ) return {error: `No commit for ref ${ref}.`};
  if ( !fs.existsSync(path.join(dir, ".git")) ) {
    const a = await git(["worktree", "add", "--detach", "-f", dir, sha]);
    if ( a.status ) return {error: `git worktree add failed: ${a.stderr.trim()}`};
  }
  const c = await git(["checkout", "-q", "-f", "--detach", sha], dir);
  if ( c.status ) return {error: `checkout failed: ${c.stderr.trim()}`};
  await git(["clean", "-q", "-fd"], dir);
  return {dir, sha};
}

// ---- resources and lanes ----
const GB = 1024 ** 3;
function resources() {
  const free = {};
  for ( const [drive, min] of Object.entries(conf.minFreeGB ?? {}) ) {
    try { const s = fs.statfsSync(`${drive}:\\`); free[drive] = {gb: Math.round(s.bavail * s.bsize / GB), min}; } catch { free[drive] = {gb: null, min}; }
  }
  const ram = Math.round(os.freemem() / GB * 10) / 10;
  const low = [...Object.entries(free).filter(([, v]) => v.gb !== null && v.gb < v.min).map(([d, v]) => `${d}: ${v.gb} GB free (needs ${v.min})`),
    ...(ram < conf.minFreeRamGB ? [`${ram} GB of memory free (needs ${conf.minFreeRamGB})`] : [])];
  return {free, ram, low};
}
const state = Object.fromEntries(LANES.map(id => [id, {busy: null, down: false, checked: 0, alert: null}]));
const laneOf = id => getLane(cfg, id);
const laneFree = id => !state[id].busy && !state[id].down && !lockState(laneOf(id), cfg).held;
async function healthCheck(id, force = false) {
  const s = state[id];
  if ( s.busy || (!force && Date.now() - s.checked < 5 * 60000) ) return;
  s.checked = Date.now();
  if ( lockState(laneOf(id), cfg).held ) return; // someone else is using it (a helper, the nightly run)
  if ( !fs.existsSync(path.join(laneOf(id).dataPath, "Data", "worlds", cfg.world)) ) { s.down = true; s.why = "not set up (queue a setup-lane job)"; return; }
  // B6885: a lane on another PC whose setup never finished (no clean fingerprint, e.g. stopped at Foundry's licence
  // screen) takes no jobs but setup-lane, or a gate job fails there without running a gate (job #1816 on lane 7).
  // Only lanes with a host: the main PC's older lanes may predate clean.json and must keep working.
  if ( laneOf(id).host && !fs.existsSync(path.join(laneDir(laneOf(id)), "clean.json")) ) { s.down = true; s.why = "setup not finished (no clean fingerprint; queue a setup-lane job)"; return; }
  if ( await isUp(laneOf(id)) ) { if ( s.down ) await recovered(id); return; }
  log(`lane ${id} is down; starting it`);
  const r = await lanesCmd(["start", "--lane", id], {minutes: 6});
  if ( r.code === 0 && await isUp(laneOf(id)) ) { if ( s.down ) await recovered(id); return; }
  s.down = true;
  await alert(id, `Lane ${id} (port ${laneOf(id).port}) is down and did not start.`, r.out.slice(-1500));
}
async function alert(key, title, detail = "") {
  const s = state[key] ?? (state[`_${key}`] ??= {});
  if ( s.alert || DRY ) return;
  try {
    const i = await gh("POST", "/issues", {title: `${ALERT_PREFIX}: ${title}`, labels: [LABEL.alert],
      body: `${title}\n\n\`\`\`\n${detail.slice(-3000)}\n\`\`\`\n\nThe runner closes this issue when it clears. Jobs keep running on the other lanes.`});
    s.alert = i.number; log(`alert #${i.number}: ${title}`);
  } catch (e) { log(`could not open alert: ${e.message}`); }
}
async function recovered(key) {
  const s = state[key] ?? state[`_${key}`]; if ( !s ) return;
  s.down = false; s.why = null;
  if ( s.alert ) { await comment(s.alert, "Cleared.").catch(() => {}); await close(s.alert).catch(() => {}); log(`alert #${s.alert} cleared`); s.alert = null; }
}

// ---- jobs ----
// B7201: the most one lane's share of a gates job may run (a full suite takes 50 to 80 minutes on four lanes; the
// old limit was 15 hours), and the silence after which a run-gate counts as frozen: the longest gate limit (15
// minutes unless gate-map-extra.json gives one more) plus the 3 minutes run-gate waits on a page, plus 8.
const CEILING = Number(conf.jobCeilingMinutes ?? 240);
function stallFor(dir) {
  if ( conf.stallMinutes !== undefined ) return Number(conf.stallMinutes);
  const t = readJson(path.join(dir, "tools", "lanes", "gate-map-extra.json"), {})?.timeouts ?? {};
  return Math.max(15, ...Object.values(t).map(Number).filter(Number.isFinite)) + 3 + 8;
}
const recent = [];
async function finish(issue, ok, text) {
  await comment(issue.number, text);
  await setLabels(issue.number, [ok ? LABEL.done : LABEL.failed], [LABEL.running]);
  await close(issue.number);
  recent.unshift(`#${issue.number} ${ok ? "done" : "FAILED"} ${new Date().toISOString().slice(11, 16)}Z`); recent.length = Math.min(recent.length, 12);
}
// ---- stale pull request jobs (B7205) ----
// A gates job for an old commit of a pull request is not run, and one that is running stops after its current gates.
const pullCache = new Map();
async function staleJob(issue) {
  const mark = prMark(issue.title);
  if ( !mark ) return null;
  const fetchPull = async () => {
    try { const c = {at: Date.now(), pull: await gh("GET", `/pulls/${mark.pr}`)}; pullCache.set(mark.pr, c); return c; }
    catch (e) { return null; } // unknown: never drop on a lookup failure
  };
  let c = pullCache.get(mark.pr);
  if ( !c || Date.now() - c.at > 2 * 60000 ) c = await fetchPull();
  if ( !c || !staleWhy(mark, c.pull) ) return null;
  // B7205 fix: the cache can hold the head from before the push that queued this job (jobs 1967, 1969 and 1970 were
  // dropped as "moved on" to their older commit), so a job is only dropped on a pull request read just now
  if ( c.at < Date.now() - 5000 ) c = await fetchPull();
  return c ? staleWhy(mark, c.pull) : null;
}
async function drop(issue, text) {
  await comment(issue.number, text);
  await setLabels(issue.number, [], [LABEL.running]).catch(() => {});
  if ( !DRY ) await gh("PATCH", `/issues/${issue.number}`, {state: "closed", state_reason: "not_planned"});
  finished.set(issue.number, Date.now());
  recent.unshift(`#${issue.number} dropped ${new Date().toISOString().slice(11, 16)}Z`); recent.length = Math.min(recent.length, 12);
}
let lastStale = 0;
async function stopStale() {
  if ( Date.now() - lastStale < 3 * 60000 ) return;
  lastStale = Date.now();
  for ( const g of growing.values() ) {
    if ( g.stale || !g.job.queue ) continue;
    const why = await staleJob(g.issue);
    if ( !why ) continue;
    g.stale = why;
    let left = 0; try { left = stopQueue(g.job.queue); } catch (e) { log(`#${g.issue.number}: could not stop its queue: ${e.message}`); }
    log(`#${g.issue.number}: ${why}; stopping after the running gates (${left} not run)`);
    g.staleLeft = left;
  }
}
// ---- cancel (B7206): close a running job's issue, or label it pc-cancel, and the runner ends it ----
const halted = new Set(); // job tags whose lanes neither retry nor recheck
const running = new Map(); // issue number -> job record, while start() runs it
async function cancelJob(g, why) {
  if ( g.cancelled || g.finishing ) return;
  g.cancelled = why;
  halted.add(g.tag);
  if ( g.job.queue ) { try { stopQueue(g.job.queue); } catch (e) { log(`#${g.issue.number}: could not stop its queue: ${e.message}`); } }
  const ps = [...(procs.get(g.tag) ?? [])];
  log(`#${g.issue.number}: ${why}; ending ${ps.length} process tree(s) and freeing its lanes`);
  for ( const p of ps ) { try { endTree(p); } catch (e) { log(`#${g.issue.number}: could not end ${p.pid}: ${e.message}`); } }
}
/** Running jobs whose issue was closed by hand or labelled pc-cancel. openNums: the open job issues just listed. */
async function cancelCheck(issues, openNums) {
  for ( const g of running.values() ) {
    if ( g.cancelled || g.finishing ) continue;
    const listed = issues.find(i => i.number === g.issue.number);
    if ( listed?.labels?.some(l => l.name === LABEL.cancel) ) { await cancelJob(g, "labelled pc-cancel"); continue; }
    if ( openNums.has(g.issue.number) ) continue;
    // The list can lag; only a closed state read from the issue itself cancels
    let st = null; try { st = (await gh("GET", `/issues/${g.issue.number}`)).state; } catch (e) { continue; }
    if ( st === "closed" && !g.finishing ) await cancelJob(g, "its issue was closed");
  }
}
/** The failing steps of the gates in a report, from each lane's result files. */
function failDetail(lane, report) {
  const out = [];
  for ( const m of report.matchAll(/^(\w[\w-]*): (?!(\d+)\/\2 passed$)(.*)$/gm) ) {
    const f = path.join(laneOf(lane).dataPath, "Data", "wodx-gate", `${m[1]}-result.json`);
    const j = readJson(f);
    const bad = (j?.steps ?? []).filter(s => !s.pass).slice(0, 8).map(s => `  FAIL ${JSON.stringify(s).slice(0, 700)}`);
    out.push(`${m[1]}: ${m[3]}`, ...bad, ...(j?.errors ?? []).slice(0, 4).map(e => `  ERR ${String(e).slice(0, 400)}`));
  }
  return out.join("\n");
}
/** One lane's part of a lane job. Returns {code, text}. */
async function laneWork(job, lane, i, n, tag, retried = false) {
  const wt = await worktree(lane, job.ref);
  if ( wt.error ) return {code: null, text: wt.error};
  const L = path.join(LOGS, `${tag}-l${lane}.log`);
  const repo = ["--repo", wt.dir];
  // B7205: a job stopped as stale neither retries a lane nor reruns failing gates
  const stopped = () => halted.has(tag) || (!!job.queue && fs.existsSync(`${job.queue}.stop`));
  const faultRetry = async (why, out = "") => {
    // B6526: gates this lane took from the shared queue and did not finish go back on it for any lane
    if ( job.queue ) requeueUnfinished(job.queue, lane, out);
    if ( retried || stopped() ) return {code: null, text: `${why} (after one retry)\n${out.slice(-1500)}`};
    log(`${tag} lane ${lane}: ${why}; resetting the lane and trying once more`);
    await lanesCmd(["reset", "--lane", lane], {logTo: L});
    return laneWork(job, lane, i, n, tag, true);
  };
  if ( job.kind === "setup-lane" ) {
    const r = await lanesCmd(["setup", "--lane", lane, ...(job.again ? ["--again"] : []), ...repo], {logTo: L, minutes: 90});
    if ( r.code === 0 ) { state[lane].down = false; state[lane].why = null; }
    return {code: r.code, text: r.out.trim().split("\n").slice(-10).join("\n")};
  }
  if ( !(await isUp(laneOf(lane))) ) {
    const s = await lanesCmd(["start", "--lane", lane], {logTo: L, minutes: 6});
    if ( s.code !== 0 ) return faultRetry(`lane ${lane} would not start`, s.out);
  }
  if ( job.kind === "reset" ) { const r = await lanesCmd(["reset", "--lane", lane, ...repo], {logTo: L}); return {code: r.code, text: r.out.trim().split("\n").slice(-6).join("\n")}; }
  if ( resetsFirst(job) ) await lanesCmd(["reset", "--lane", lane, ...repo], {logTo: L});
  const d = await lanesCmd(["deploy", "--lane", lane, "--if-changed", ...repo], {logTo: L});
  if ( d.code !== 0 ) return faultRetry(`deploy to lane ${lane} failed (exit ${d.code})`, d.out);
  if ( job.kind === "deploy" ) return {code: 0, text: d.out.trim().split("\n").slice(-3).join("\n")};
  if ( job.kind === "gate-two" ) {
    const f = path.join(laneOf(lane).dataPath, "Data", "wodx-gate", `${job.gate}-result.json`);
    fs.rmSync(f, {force: true});
    const r = await node("tools/harness/gate-two.mjs", [job.gate, "--url", laneUrl(laneOf(lane)), ...(job.diag ? ["--diag"] : [])], {logTo: L, minutes: 30});
    // The failing steps are read before the reset, which may put the lane's data back
    const line = r.out.split("\n").filter(x => x.startsWith(`${job.gate}:`)).pop() ?? r.out.trim().split("\n").slice(-3).join("\n");
    const detail = failDetail(lane, line);
    await lanesCmd(["reset", "--lane", lane, ...repo], {logTo: L});
    if ( r.code === null ) return faultRetry("gate-two ran past its time limit", r.out);
    // B6970: with diag the [diag] lines (both browsers' console, full failing steps) follow
    const diag = job.diag ? r.out.split("\n").filter(x => x.startsWith("[diag]")).slice(-300).join("\n") : "";
    return {code: r.code, text: `${line}\n${detail}${diag ? `\n\n${diag}` : ""}`.trim()};
  }
  const report = path.join(LOGS, `${tag}-l${lane}-report.txt`);
  fs.rmSync(report, {force: true});
  const gatesN = job.queue ? job.queueSize : job.all ? 400 : job.touched ? 150 : job.gates.length;
  const minutes = job.queue ? job.maxMinutes + 10 : Math.min(16 * Math.ceil(gatesN / n) + 20, CEILING);
  // B7220: branchTools runs the branch's own run-gate (from its worktree, which also holds the lane tools it imports)
  const r = job.branchTools
    ? await run(process.execPath, [path.join(wt.dir, "tools", "lanes", "run-gate.mjs"), ...gateArgs(job, lane, i, n, report), ...repo], {cwd: wt.dir, logTo: L, minutes, stallMinutes: stallFor(wt.dir)})
    : await node("tools/lanes/run-gate.mjs", [...gateArgs(job, lane, i, n, report), ...repo], {logTo: L, minutes, stallMinutes: stallFor(wt.dir)});
  const rep = (job.branchTools ? `Gate tools from ${job.ref} at ${wt.sha.slice(0, 8)} (branchTools).\n` : "") +
    (fs.existsSync(report) ? fs.readFileSync(report, "utf8") : r.out.slice(-4000));
  if ( isInfraFault(r.code) ) return faultRetry(`run-gate on lane ${lane} stopped with ${r.code === null ? "a time limit" : `exit ${r.code}`}`, rep);
  const text = `${rep.trim()}\n${failDetail(lane, rep)}`.trim();
  // B7002: the commit this lane ran, for the gate status the merge rules read
  if ( r.code !== 1 || job.recheck === false || stopped() ) return {code: r.code, text, sha: wt.sha};
  return {code: r.code, text: `${text}\n\n${await recheck(job, lane, tag, wt, rep, L)}`, sha: wt.sha};
}

/**
 * B4610, B7310: a failing gate is run again before the result goes back, so the thread knows whose it is. Each gate
 * runs ALONE, one gate per run-gate call on a freshly reset lane, so no other gate's leftovers decide it, and no
 * verdict rests on a single run (recheckStep): a failure alone is run once more (two different results: flaky), and
 * two failures alone then go to main the same way, where a pass is confirmed by a second run before it says NEW.
 * All the runs on this commit come first and the runs on main after, so the lane is deployed twice at most.
 * The whole recheck stops taking runs after RECHECK_MINUTES; gates it did not finish say so.
 */
const RECHECK_MINUTES = 120;
async function recheck(job, lane, tag, wt, rep, L) {
  const failing = failingGates(rep).slice(0, 12);
  if ( !failing.length ) return "";
  const until = Date.now() + RECHECK_MINUTES * 60000;
  let runs = 0;
  const runOne = async (dir, gate) => {
    const f = path.join(LOGS, `${tag}-l${lane}-re${++runs}-${gate}.txt`);
    fs.rmSync(f, {force: true});
    await lanesCmd(["reset", "--lane", lane, "--repo", dir], {logTo: L});
    const d = await lanesCmd(["deploy", "--lane", lane, "--if-changed", "--repo", dir], {logTo: L});
    if ( d.code !== 0 ) return null;
    await node("tools/lanes/run-gate.mjs", [gate, "--lane", String(lane), "--wait", "10", "--report", f, "--repo", dir], {logTo: L, minutes: 36, stallMinutes: stallFor(dir)});
    return fs.existsSync(f) ? gatePassed(gate, fs.readFileSync(f, "utf8")) : null;
  };
  log(`${tag} lane ${lane}: rechecking ${failing.join(" ")}, each alone on a fresh lane`);
  const st = Object.fromEntries(failing.map(g => [g, {alone: [], main: job.ref === "main" ? null : [], notOnMain: false}]));
  const outOfTime = new Set();
  const settle = async (dir, side) => {
    for ( const g of failing ) {
      for ( ;; ) {
        const s = recheckStep(st[g].alone, st[g].main, {notOnMain: st[g].notOnMain});
        if ( s.next !== side ) break;
        if ( stopped() || Date.now() > until ) { outOfTime.add(g); break; }
        st[g][side].push(await runOne(dir, g));
      }
    }
  };
  await settle(wt.dir, "alone");
  if ( job.ref !== "main" && failing.some(g => recheckStep(st[g].alone, st[g].main).next === "main") ) {
    const m = await worktree(lane, "main");
    if ( m.error ) failing.forEach(g => { if ( st[g].main ) st[g].main.push(null); });
    else {
      for ( const g of failing ) if ( !fs.existsSync(path.join(m.dir, "tools", "gate", `${g}.mjs`)) ) st[g].notOnMain = true;
      if ( m.sha === wt.sha ) failing.forEach(g => { st[g].main = [...st[g].alone]; });
      else await settle(m.dir, "main");
    }
  }
  const rows = failing.map(g => {
    const s = recheckStep(st[g].alone, st[g].main, {notOnMain: st[g].notOnMain});
    const v = s.verdict ?? (outOfTime.has(g) ? `not settled: the recheck ran out of time (alone ${JSON.stringify(st[g].alone)}, main ${JSON.stringify(st[g].main)})` : "not settled");
    return `- ${g}: ${v}`;
  });
  return [`Recheck (each failing gate alone on a fresh lane, ${runs} run(s)):`, ...rows].join("\n");
}
async function runLight(job, tag) {
  const L = path.join(LOGS, `${tag}.log`);
  if ( job.kind === "books-find" ) {
    const lines = [];
    for ( const t of job.terms ) {
      const r = await node("tools/books/books.mjs", ["find", t, "--text", expand(conf.bookText), "--max", "40", ...(job.book ? ["--book", job.book] : [])], {logTo: L, minutes: 15});
      const hits = r.out.split("\n").map(l => /^(\S+) pdf p\. (\d+):/.exec(l)).filter(Boolean);
      const by = {};
      for ( const [, b, p] of hits ) (by[b] ??= []).push(p);
      lines.push(`${t}: ${hits.length ? Object.entries(by).map(([b, ps]) => `${b} p. ${ps.join(", ")}`).join("; ") : "no pages"}${r.code ? ` (exit ${r.code})` : ""}`);
    }
    return {code: 0, text: `Book and pdf page only (no text: this repository is public).\n${lines.join("\n")}`};
  }
  if ( job.kind === "trove-find" ) {
    const base = path.resolve(expand(conf.trove)), root = path.resolve(base, job.under ?? ".");
    if ( !root.toLowerCase().startsWith(base.toLowerCase()) ) return {code: 2, text: "under must stay inside the Trove."};
    const want = job.pattern.toLowerCase(), found = [];
    const walk = (d, depth) => {
      if ( depth > 8 || found.length >= 300 ) return;
      let ents = []; try { ents = fs.readdirSync(d, {withFileTypes: true}); } catch { return; }
      for ( const e of ents ) {
        const p = path.join(d, e.name);
        if ( e.name.toLowerCase().includes(want) ) found.push(path.relative(base, p) + (e.isDirectory() ? "\\" : ""));
        if ( e.isDirectory() ) walk(p, depth + 1);
      }
    };
    walk(root, 0);
    return {code: 0, text: `${found.length}${found.length >= 300 ? "+" : ""} name(s) under the Trove holding "${job.pattern}":\n${found.join("\n")}`};
  }
  return {code: 2, text: `No light runner for ${job.kind}.`};
}
const active = new Set();
// Issues this runner finished in the last hour. GitHub's issue list can still show a just-closed issue as open for a
// while, which ran finished jobs a second time; these are skipped.
const finished = new Map();
const recentlyFinished = n => { for ( const [k, t] of finished ) if ( Date.now() - t > 3600e3 ) finished.delete(k); return finished.has(n); };
/**
 * B6526: gates jobs share one queue of gates between their lanes. A job that started on fewer lanes than it asked for
 * (they were busy) takes more as they free, up to what it asked for, or every lane when nothing else is waiting
 * (growJobs). Before, a 294-gate touched run that found one lane free ran on it alone for hours.
 */
const growing = new Map();
async function makeQueue(job, lane, tag) {
  if ( job.kind !== "gates" || job.branchTools ) return null; // B7220: a branch-tools test runs on its one lane
  const wt = await worktree(lane, job.ref);
  if ( wt.error ) return null;
  const r = await node("tools/lanes/run-gate.mjs", [...job.gates, ...(job.touched ? ["--touched"] : []), ...(job.all ? ["--all"] : []), "--list", "--repo", wt.dir],
    {logTo: path.join(LOGS, `${tag}-list.log`), minutes: 5});
  const m = /^GATES (\[.*\])$/m.exec(r.out ?? "");
  let list = null;
  try { list = m ? JSON.parse(m[1]) : null; } catch (e) { list = null; }
  if ( !list || list.length < 2 ) return null;
  const file = path.join(LOGS, `${tag}-queue.json`);
  fs.writeFileSync(file, JSON.stringify(list));
  fs.rmSync(`${file}.taken`, {force: true}); fs.rmSync(`${file}.stop`, {force: true});
  return {file, size: list.length, sha: wt.sha};
}
const queueLeft = file => readQueue(file).length;
function requeueUnfinished(file, lane, report) {
  try { const lost = putBack(file, lane, report); if ( lost.length ) log(`lane ${lane}: ${lost.length} unfinished gate(s) back on the shared queue`); }
  catch (e) { log(`lane ${lane}: could not give gates back: ${e.message}`); }
}
function addLane(g, lane, n = 1) {
  const i = g.used.length;
  g.used.push(lane); state[lane].busy = g.issue.number;
  // On a shared queue there is nothing to split; otherwise lane i of n runs shard i of n, as before
  const p = laneWork(g.job, lane, i, g.job.queue ? 1 : n, g.tag).then(r => r, e => ({code: null, text: `Runner error on lane ${lane}: ${e.message}`}))
    .then(r => { g.parts.push({lane, ...r}); if ( state[lane].busy === g.issue.number ) state[lane].busy = null; });
  g.pending.add(p); p.finally(() => g.pending.delete(p));
}
/** Free lanes join a running gates job whose queue still holds work. waiting: lane jobs still in the queue. */
function growJobs(waiting) {
  for ( const g of growing.values() ) {
    if ( g.job.lane !== undefined ) continue; // pinned to one lane
    const cap = waiting ? g.job.lanes ?? 1 : LANES.length;
    // No more lanes than gates left for the lanes still starting up to take
    while ( g.used.length < cap && queueLeft(g.job.queue) >= 2 && queueLeft(g.job.queue) > g.used.length - g.parts.length ) {
      const l = LANES.find(laneFree);
      if ( !l ) return;
      log(`#${g.issue.number} takes lane ${l} too (${queueLeft(g.job.queue)} gate(s) left on its queue)`);
      addLane(g, l);
    }
  }
}

async function start(issue, job, lanes) {
  active.add(issue.number);
  const tag = `job${issue.number}`, t0 = Date.now();
  for ( const l of lanes ) state[l].busy = issue.number;
  log(`#${issue.number} ${job.kind} starting${lanes.length ? ` on lane(s) ${lanes.join(", ")}` : ""}`);
  const g = {issue, job, tag, used: [], parts: [], pending: new Set()};
  running.set(issue.number, g);
  try {
    await setLabels(issue.number, [LABEL.running]);
    await comment(issue.number, `Started ${new Date().toISOString().slice(0, 16)}Z${lanes.length ? ` on lane(s) ${lanes.join(", ")}` : ""} (ref ${job.ref}) by the ${NAME} [host:${HOST}].`);
    if ( lanes.length ) {
      const q = await makeQueue(job, lanes[0], tag);
      if ( q ) {
        g.job = {...job, queue: q.file, queueSize: q.size, queueSha: q.sha, maxMinutes: Math.min(16 * q.size + 20, CEILING)};
        growing.set(issue.number, g);
        log(`#${issue.number}: ${q.size} gate(s) on a shared queue`);
      }
      for ( const l of lanes ) addLane(g, l, lanes.length);
      while ( g.pending.size ) await Promise.race([...g.pending]);
      growing.delete(issue.number);
    } else g.parts.push({lane: null, ...(await runLight(job, tag))});
    if ( g.cancelled ) {
      for ( const l of new Set([...lanes, ...g.used]) ) await lanesCmd(["reset", "--lane", l], {logTo: path.join(LOGS, `${tag}-l${l}.log`)}).catch(() => {});
      halted.delete(tag);
      const mins = Math.round((Date.now() - t0) / 60000);
      await comment(issue.number, `**Cancelled** after ${mins} min (${g.cancelled}). Its processes were ended and its lanes reset; no result or gate status was posted.`).catch(() => {});
      await setLabels(issue.number, [], [LABEL.running, LABEL.cancel]).catch(() => {});
      if ( !DRY ) await gh("PATCH", `/issues/${issue.number}`, {state: "closed", state_reason: "not_planned"}).catch(() => {});
      recent.unshift(`#${issue.number} cancelled ${new Date().toISOString().slice(11, 16)}Z`); recent.length = Math.min(recent.length, 12);
      log(`#${issue.number} cancelled`);
      return;
    }
    g.finishing = true;
    if ( g.stale ) {
      const mins = Math.round((Date.now() - t0) / 60000);
      await drop(issue, `**Stopped** after ${mins} min: ${g.stale}. ${g.staleLeft ?? 0} gate(s) were not run; the run for the newer commit gives the result.`);
      log(`#${issue.number} stopped (${g.stale})`);
      return;
    }
    const parts = g.parts.sort((a, b) => g.used.indexOf(a.lane) - g.used.indexOf(b.lane));
    const ok = parts.every(p => p.code === 0);
    const mins = Math.round((Date.now() - t0) / 60000);
    const used = parts.filter(p => p.lane).map(p => p.lane);
    const body = `**${ok ? "Passed" : "Failed"}** in ${mins} min${job.thread ? ` (for thread ${job.thread})` : ""}${g.job.queue ? `, ${g.job.queueSize} gates shared over lanes ${used.join(", ")}` : ""}.\n\n` +
      gateDigest(parts) +
      parts.map(p => `${p.lane ? `Lane ${p.lane}, exit ${p.code ?? "fault"}:\n` : ""}\`\`\`\n${p.text}\n\`\`\``).join("\n");
    await finish(issue, ok, body);
    log(`#${issue.number} ${ok ? "passed" : "failed"} in ${mins} min`);
    await gateStatus(issue, g.job, parts, ok).catch(e => log(`#${issue.number}: gate status not posted: ${e.message}`));
  } catch (e) {
    log(`#${issue.number} runner error: ${e.stack ?? e.message}`);
    if ( !g.cancelled ) await finish(issue, false, `Runner error: ${e.message}`).catch(() => {});
  } finally {
    running.delete(issue.number); halted.delete(tag);
    growing.delete(issue.number);
    for ( const l of new Set([...lanes, ...g.used]) ) if ( state[l].busy === issue.number ) state[l].busy = null;
    finished.set(issue.number, Date.now()); active.delete(issue.number);
  }
}

// ---- gate status for the merge rules (B7002) ----
/**
 * A gates job that ran every gate the branch needs (touched or all) sets the wodx/gates commit status on the commit it
 * ran; tools/release/merge-rules.mjs reads it. Then the branch's pull request checks are run again, so a check that
 * failed while the gates were still running turns green by itself.
 */
async function gateStatus(issue, job, parts, ok) {
  const st = gateStatusFor(job, parts, ok, failingGates, issue.html_url);
  if ( !st || DRY ) return;
  await gh("POST", `/statuses/${st.sha}`, st.body);
  log(`#${issue.number}: ${GATE_CONTEXT} ${st.body.state} on ${short(st.sha)}`);
  rerunChecks(st.sha, 0);
}
/** Runs the failed checks again of each open pull request holding the gated commit (the job's ref may be a branch or
 *  a sha); waits for a run still going (up to an hour). */
async function rerunChecks(sha, tries) {
  try {
    for ( const pr of (await gh("GET", `/commits/${sha}/pulls`)) ?? [] ) if ( pr.state === "open" ) await rerunFor(pr, sha, tries);
  } catch (e) { log(`checks rerun for ${short(sha)}: ${e.message}`); }
}
async function rerunFor(pr, sha, tries) {
  try {
    const runs = await gh("GET", `/actions/workflows/checks.yml/runs?head_sha=${pr.head.sha}&event=pull_request&per_page=5`);
    const run = runs?.workflow_runs?.[0];
    if ( !run ) return;
    if ( run.status !== "completed" ) { if ( tries < 12 ) setTimeout(() => rerunFor(pr, sha, tries + 1), 5 * 60000); return; }
    // B7006: the merge rules job passes while it waits for the gates (its wodx/merge-rules status is pending), so it
    // is run again by name, with the checks job after it
    const jobs = await gh("GET", `/actions/runs/${run.id}/jobs?per_page=50`);
    const mr = jobs?.jobs?.find(j => j.name === "merge rules");
    if ( mr ) { await gh("POST", `/actions/jobs/${mr.id}/rerun`); log(`PR #${pr.number}: merge rules run again after the gate result`); }
    else if ( run.conclusion === "failure" ) { await gh("POST", `/actions/runs/${run.id}/rerun-failed-jobs`); log(`PR #${pr.number}: failed checks started again after the gate result`); }
  } catch (e) { log(`checks rerun for PR #${pr.number}: ${e.message}`); }
}

// ---- merge train (B7202): only the runner with "train" on (the Main PC's) drives it ----
const graphql = async (query, variables) => {
  const r = await fetch("https://api.github.com/graphql", {method: "POST", body: JSON.stringify({query, variables}),
    headers: {Authorization: `bearer ${TOKEN}`, "User-Agent": "wodx-pcq", "Content-Type": "application/json"}});
  const j = await r.json();
  if ( !r.ok || j.errors?.length ) throw new Error(`GraphQL ${r.status} ${JSON.stringify(j.errors ?? j).slice(0, 200)}`);
  return j.data;
};
let trainNow = null, trainBusy = false, lastTrain = 0;
function trainTick() {
  if ( !conf.train || trainBusy || Date.now() - lastTrain < (conf.trainMinutes ?? 3) * 60000 ) return;
  lastTrain = Date.now(); trainBusy = true;
  trainStep({gh, graphql, git, home: HOME, repoRoot: ROOT, log, apply: !DRY, maxHours: conf.trainMaxHours ?? 3})
    .then(r => { trainNow = r; }).catch(e => log(`train step failed: ${e.message}`)).finally(() => { trainBusy = false; });
}
/** The front pull request's gate jobs go first, so the train never waits behind the rest of the queue. */
const trainFirst = jobs => trainNow?.front ? [...jobs.filter(j => isFrontJob(j.issue?.title, trainNow.front)), ...jobs.filter(j => !isFrontJob(j.issue?.title, trainNow.front))] : jobs;

// ---- status issue ----
let statusIssue = null, lastStatus = "", lastStatusAt = 0, heldSince = null;
async function status(queue, note = null) {
  const res = resources();
  const lanes = await Promise.all(LANES.map(async id => {
    const l = laneOf(id), s = state[id], lk = lockState(l, cfg);
    const what = s.busy ? `job #${s.busy}` : s.down ? `DOWN${s.why ? `: ${s.why}` : ""}` : lk.held ? `in use outside the runner (${(lk.lock?.gates ?? []).join(" ").slice(0, 60)})` : "free";
    return `| ${id} | ${l.port} | ${what} |`;
  }));
  const body = [`Updated ${new Date().toISOString().slice(0, 16)}Z by the ${NAME} (${HOST}) at ${short(spawnSync("git", ["rev-parse", "HEAD"], {cwd: ROOT, encoding: "utf8"}).stdout)}.`,
    "", "| Lane | Port | State |", "|---|---|---|", ...lanes, "",
    ...(note ? [`HOLD: ${note}`, ""] : []),
    `Queue (${queue.length}): ${queue.map(q => `#${q.number} ${q.job.kind} p${q.job.prio}`).join(", ") || "empty"}`,
    `Last results: ${recent.join(", ") || "none yet"}`,
    ...(conf.train ? [`Merge train: ${trainNow?.front ? `front #${trainNow.front}, ${trainNow.action} (${trainNow.why}); line ${trainNow.line.map(n => `#${n}`).join(", ")}` : "empty (label a ready pull request merge-train)"}`] : []),
    `Free: ${Object.entries(res.free).map(([d, v]) => `${d}: ${v.gb} GB`).join(", ")}, memory ${res.ram} GB${res.low.length ? ` (HOLDING: ${res.low.join("; ")})` : ""}`,
    "", "How to queue a job: tools/pcq/README.md."].join("\n");
  const changed = body.replace(/^Updated.*$/m, "") !== lastStatus.replace(/^Updated.*$/m, "");
  if ( DRY || (!changed && Date.now() - lastStatusAt < 10 * 60000) ) return;
  try {
    statusIssue ??= (await openIssues(LABEL.status)).find(i => i.title === STATUS_TITLE)?.number ?? (await gh("POST", "/issues", {title: STATUS_TITLE, labels: [LABEL.status], body})).number;
    await gh("PATCH", `/issues/${statusIssue}`, {body});
    lastStatus = body; lastStatusAt = Date.now();
  } catch (e) { log(`status update failed: ${e.message}`); statusIssue = null; }
}

// ---- self update: exit 75 when main changed the runner or lane tools and nothing is running ----
let MY_SHA = spawnSync("git", ["rev-parse", "HEAD"], {cwd: ROOT, encoding: "utf8"}).stdout.trim();
// A busy runner stops taking new jobs once an update is due ("draining") and exits when the last job ends, so an update
// never waits for a quiet moment that may not come.
let draining = false, drainSince = 0, deferUntilIdle = false;
// B6353: a drain waits at most DRAIN_MIN minutes. A 100-gate touched run once held 19 queued jobs (four of them p1) for
// most of an hour behind it; past the limit the runner takes jobs again and updates the next time it is idle (and at
// the nightly lane reset, which restarts it anyway).
const DRAIN_MIN = Number(conf.drainMinutes ?? 10);
async function updateDue() {
  if ( args.includes("--no-update") ) return false;
  if ( deferUntilIdle ) return !active.size;
  const d = await git(["diff", "--quiet", MY_SHA, "origin/main", "--", "tools/pcq", "tools/lanes", "tools/harness/gate-two.mjs"]);
  if ( d.status !== 1 ) return false;
  // B7194: when only the lane tools changed, the runner's own code is the same, and each job spawns run-gate and
  // lanes.mjs afresh, so the checkout moves to main in place and the next job uses the new tools. A busy runner used
  // to wait for an idle moment that never came: on 17 Nov the Main PC ran ad006f90 for four hours after main moved on.
  if ( (await git(["diff", "--quiet", MY_SHA, "origin/main", "--", "tools/pcq"])).status === 0 ) {
    const co = await git(["checkout", "-q", "-f", "--detach", "origin/main"]);
    const now = (await git(["rev-parse", "HEAD"])).stdout?.trim();
    if ( co.status === 0 && now ) { log(`lane tools updated in place: ${short(MY_SHA)} to ${short(now)}`); MY_SHA = now; return false; }
  }
  if ( !draining ) { log(`main changed the runner; taking no new jobs until the running ones end (at most ${DRAIN_MIN} min)`); drainSince = Date.now(); }
  draining = true;
  return !active.size;
}

// ---- two PCs (B6880) ----
// Both runners read the same queue. Before starting a job each posts a claim comment; the earliest claim since the
// job was last queued again wins and the other runner leaves the job alone for ten minutes.
const skipUntil = new Map();
const comments = async n => gh("GET", `/issues/${n}/comments?per_page=100`);
async function claim(n) {
  if ( DRY ) return true;
  try {
    await comment(n, `Claim [host:${HOST}]`);
    await sleep(4000);
    const cs = await comments(n);
    const reset = cs.reduce((k, c, i) => /will run again/.test(c.body) ? i : k, -1);
    const first = cs.slice(reset + 1).find(c => /^Claim \[host:/.test(c.body));
    if ( first && first.body.includes(`[host:${HOST}]`) ) return true;
    log(`#${n} claimed by another runner; leaving it`); skipUntil.set(n, Date.now() + 10 * 60000); return false;
  } catch (e) { log(`claim #${n} failed: ${e.message}`); return false; }
}
/** True when the last start of this job was on this PC (a start with no host tag predates B6880 and is the main PC's). */
async function startedHere(n) {
  try {
    const s = (await comments(n)).filter(c => /^Started /.test(c.body)).at(-1);
    if ( !s ) return !conf.host && !readJson(path.join(HERE, `runner.${HOST}.json`));
    const m = /\[host:([^\]]+)\]/.exec(s.body);
    return m ? m[1] === HOST : !readJson(path.join(HERE, `runner.${HOST}.json`));
  } catch { return false; }
}
// Watchdog duties: the live site answers, and the other runner's status issue keeps moving.
const watchFails = {};
async function watch() {
  for ( const url of conf.watch.urls ?? [] ) {
    let ok = false;
    try { const r = await fetch(url, {signal: AbortSignal.timeout(20000), redirect: "follow"}); ok = r.status < 500; } catch {}
    watchFails[url] = ok ? 0 : (watchFails[url] ?? 0) + 1;
    if ( ok ) await recovered(`site ${url}`);
    else if ( watchFails[url] >= (conf.watch.failsBeforeAlert ?? 3) ) await alert(`site ${url}`, `${url} is not answering`, `${watchFails[url]} checks in a row failed, ${conf.watch.everyMinutes ?? 5} minutes apart.`);
  }
  if ( conf.watch.peerStatusTitle ) {
    try {
      const peer = (await openIssues(LABEL.status)).find(i => i.title === conf.watch.peerStatusTitle);
      const mins = peer ? Math.round((Date.now() - Date.parse(peer.updated_at)) / 60000) : null;
      if ( mins !== null && mins > (conf.watch.peerSilentMinutes ?? 20) ) await alert("peer", `the main PC runner has been silent for ${mins} minutes`, `Its status issue #${peer.number} has not moved. The main PC may be off, asleep or its runner stopped (D:\\WoDX\\pcq\\logs).`);
      else if ( mins !== null ) await recovered("peer");
    } catch (e) { log(`peer check failed: ${e.message}`); }
  }
}

// ---- main loop ----
const clashes = laneClashes(cfg, LANES);
if ( clashes.length ) { log(`Lane clash check failed; not starting:\n  ${clashes.join("\n  ")}`); process.exit(2); }
log(`runner ${short(MY_SHA)} up; lanes ${LANES.join(", ")}; light slots ${conf.light}${DRY ? " (dry run)" : ""}`);
for ( const i of await openIssues(LABEL.running) ) {
  if ( !(await startedHere(i.number)) ) continue;
  log(`#${i.number} was running when the runner stopped; queued again`);
  await setLabels(i.number, [], [LABEL.running]);
  await comment(i.number, "The runner restarted while this ran; it will run again from the start.").catch(() => {});
}
let light = 0, lastFetch = 0, lastSweep = 0, sweeping = false, lastWatch = 0;
let lastGpu = 0; const gpuWatch = gpu.watcher();
function gpuCheck() {
  if ( Date.now() - lastGpu < 60000 ) return null;
  lastGpu = Date.now();
  const g = gpu.read(); if ( !g?.reading ) return null;
  fs.appendFileSync(path.join(LOGS, `gpu-${new Date().toISOString().slice(0, 10)}.csv`), g.raw + "\n");
  return {r: g.reading, change: gpuWatch(g.reading)};
}
for ( ;; ) {
  try {
    if ( draining && !active.size ) { log("exiting for an update"); process.exit(75); }
    if ( draining && Date.now() - drainSince > DRAIN_MIN * 60000 ) {
      log(`the update has waited ${DRAIN_MIN} min on ${active.size} running job(s); taking jobs again, updating when idle`);
      draining = false; deferUntilIdle = true;
    }
    if ( deferUntilIdle && !active.size ) { log("idle: exiting for the update"); process.exit(75); }
    if ( !draining && Date.now() - lastFetch > 5 * 60000 ) { await git(["fetch", "-q", "origin"]); lastFetch = Date.now(); if ( await updateDue() ) { log("main changed the runner; exiting for an update"); process.exit(75); } }
    if ( fs.existsSync(path.join(HOME, "runner-off")) ) {
      if ( !active.size ) { log("runner-off found and nothing running; stopping"); process.exit(0); }
      // B7207: the status issue still says what is running while it waits
      await status([], "runner-off: stops once the running job(s) end").catch(() => {});
      // B7330: a job still running while the runner stops can be cancelled (pc-cancel or a closed issue): runner-off
      // used to skip the cancel pass, so job 2031 ran on stale code for half an hour after its pc-cancel label
      try { const open = await openIssues(LABEL.job); await cancelCheck(open, new Set(open.map(i => i.number))); } catch (e) { log(`cancel check failed: ${e.message}`); }
      await sleep(30000); continue;
    }
    // B7207: runner-hold takes no new jobs but keeps every other pass (status, sweep, train, updates, cancel) running
    const holding = fs.existsSync(path.join(HOME, "runner-hold"));
    // Stale pull requests, every hour, beside the jobs (B4110).
    if ( conf.sweep !== false && !sweeping && Date.now() - lastSweep > HOUR ) {
      lastSweep = Date.now(); sweeping = true;
      sweep(gh, {apply: !DRY, log: m => log(`sweep ${m}`), stateFile: path.join(HOME, "sweep-state.json"), update: !!conf.sweepUpdates})
        .then(r => log(`sweep: ${r.rows.length} open, ${r.stuck} stuck, ${r.red} red, ${r.fixed} moved on`))
        .catch(e => log(`sweep failed: ${e.message}`)).finally(() => { sweeping = false; });
    }
    // Graphics card heat (B6520): log each minute, alert when it stays hot.
    const g = gpuCheck();
    if ( g?.change === "hot" ) await alert("gpu", `graphics card running hot (core ${g.r.core} C${g.r.memory !== null ? `, memory ${g.r.memory} C` : ""})`,
      `Over ${gpu.GPU_LIMITS.core} C core${g.r.memory !== null ? ` or ${gpu.GPU_LIMITS.memory} C memory` : ""} for ${gpu.GPU_LIMITS.hotMinutes} minutes. Power ${g.r.watts} W, fan ${g.r.fan}%, load ${g.r.util}%. Log: logs/gpu-*.csv in the runner folder.`);
    else if ( g?.change === "cool" ) await recovered("gpu");
    for ( const id of LANES ) await healthCheck(id);
    if ( conf.watch && Date.now() - lastWatch > (conf.watch.everyMinutes ?? 5) * 60000 ) { lastWatch = Date.now(); await watch(); }
    const issues = await openIssues(LABEL.job);
    const openNums = new Set(issues.map(i => i.number));
    const queue = [];
    for ( const i of issues ) {
      if ( active.has(i.number) || recentlyFinished(i.number) || i.labels.some(l => l.name === LABEL.running) ) continue;
      if ( (skipUntil.get(i.number) ?? 0) > Date.now() ) continue;
      const p = parseBody(i.body);
      // B6880: a job that names a lane on the other PC is that PC's runner's to take.
      if ( !p.error && p.job?.lane !== undefined && !LANES.includes(String(p.job.lane)) && cfg.allLaneIds.includes(String(p.job.lane)) && String(p.job.lane) !== "1" ) continue;
      const v = p.error ? p : validate(p.job, LANES);
      if ( v.error ) { await finish(i, false, `Not run: ${v.error}\n\nFormat: tools/pcq/README.md.`); continue; }
      if ( i.labels.some(l => l.name === LABEL.cancel) ) { await drop(i, "Not run: labelled pc-cancel."); continue; }
      const why = await staleJob(i);
      if ( why ) { log(`#${i.number}: ${why}; not run`); await drop(i, `Not run: ${why}, so this commit's result would not be used.`); continue; }
      queue.push({number: i.number, issue: i, job: v.job});
    }
    await stopStale();
    await cancelCheck(issues, openNums);
    trainTick();
    const ready = trainFirst(order(queue, openNums));
    const res = resources();
    if ( res.low.length ) {
      heldSince ??= Date.now();
      if ( Date.now() - heldSince > 30 * 60000 ) await alert("resources", "jobs held for low disk or memory", res.low.join("\n"));
    } else { heldSince = null; await recovered("resources"); }
    for ( const q of draining || holding ? [] : ready ) {
      if ( LANE_KINDS.has(q.job.kind) ) {
        if ( res.low.length ) continue;
        // A setup-lane job runs on a lane that is not set up yet; every other job needs a healthy free lane.
        const free = q.job.kind === "setup-lane" ? l => !state[l].busy && !lockState(laneOf(l), cfg).held : laneFree;
        // B6887: a small-jobs lane (lane 7) never takes a touched, every-gate or large run. Named on it, the job is
        // refused; otherwise this runner leaves it for the main PC's lanes.
        if ( q.job.lane !== undefined && LANES.includes(String(q.job.lane)) && laneRefuses(laneOf(q.job.lane), q.job) ) {
          await finish(q.issue, false, `Not run: ${laneRefuses(laneOf(q.job.lane), q.job)}. Queue it without a lane so the main PC's lanes take it.`); continue;
        }
        const want = q.job.lane !== undefined ? [String(q.job.lane)] : LANES.filter(l => laneFree(l) && !laneRefuses(laneOf(l), q.job)).slice(0, q.job.lanes);
        // A job that asked for several lanes takes what is free now rather than waiting for all of them.
        if ( !want.length || want.some(l => !free(l)) ) continue;
        for ( const l of want ) state[l].busy = q.number;
        if ( !(await claim(q.number)) ) { for ( const l of want ) state[l].busy = null; continue; }
        start(q.issue, q.job, want);
      } else if ( light < conf.light ) {
        if ( !(await claim(q.number)) ) continue;
        light++;
        start(q.issue, q.job, []).finally(() => light--);
      }
    }
    // B6526: lanes still free join a running gates job that has work left on its shared queue
    if ( !draining && !holding && !res.low.length ) growJobs(ready.some(q => LANE_KINDS.has(q.job.kind) && !active.has(q.number)));
    await status(queue.filter(q => !active.has(q.number)), holding ? "runner-hold: taking no new jobs" : null);
  } catch (e) { log(`loop error: ${e.stack ?? e.message}`); }
  if ( ONCE ) break;
  await sleep((conf.pollSeconds ?? 30) * 1000);
}
