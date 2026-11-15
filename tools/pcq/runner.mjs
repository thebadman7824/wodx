#!/usr/bin/env node
/**
 * The PC job runner (B4100-B4109). Runs on Ben's PC, takes PC jobs straight from GitHub issues (label pc-job, opened
 * by the owner's account; format in jobs.mjs) and runs them on the testbed lanes side by side, one job per lane, in
 * priority order, with no thread or coordinator passing them along. Results go back to the issue as a comment and the
 * issue is closed with pc-done or pc-failed.
 *
 *   node tools/pcq/runner.mjs [--once] [--dry] [--no-update]         (started by run-runner.ps1, which restarts it after updates)
 *
 * Error checking:
 * - Lane clash check at start (jobs.mjs laneClashes): no lane 1, no shared port or folder, no Live world.
 * - Health: every idle lane is probed every 5 minutes; a lane that is down is started once; one that stays down is
 *   taken out of service and gets an alert issue (label pc-alert), closed again when it comes back.
 * - Hang guard: every step has a time limit and is ended with its whole process tree past it (run-gate.mjs has its
 *   own per-gate limits inside that).
 * - One retry on a lane fault (no free lane, drift, run-gate's watchdog, a deploy or start that fails): reset the
 *   lane, deploy again and run once more. A gate that fails is a result, not a fault, and is not retried.
 * - Recheck (B4610): each failing gate is rerun on a fresh lane, alone and then on main, and the result says whether it
 *   is new with this change, failing on main too, or failing only after other gates.
 * - Resources: no lane job starts below minFreeRamGB of free memory or minFreeGB on a drive; a hold of more than
 *   30 minutes raises an alert.
 * - A runner that stopped mid-job: on start, issues still marked pc-running are queued again.
 * - Status: the issue labelled pc-status shows each lane, the queue and the last results, updated every 2 minutes,
 *   so any thread can see the runner is alive.
 * Every hour it also sweeps stale pull requests (sweep.mjs, B4110).
 * Never touches lane 1 or the Live world; writes nothing to the shared project folder.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawn, spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {OWNER, REPO_NAME, LABEL, LANE_KINDS, parseBody, validate, order, gateArgs, isInfraFault, laneClashes, fit, failingGates, recheckVerdicts} from "./jobs.mjs";
import {loadConfig, getLane, lockState, isUp, readJson} from "../lanes/lib.mjs";
import {sweep, HOUR} from "./sweep.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../..");
const args = process.argv.slice(2), DRY = args.includes("--dry"), ONCE = args.includes("--once");
const expand = s => String(s).replace(/%(\w+)%/g, (_, k) => process.env[k] ?? "");
const conf = readJson(path.join(HERE, "runner.json"));
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
/** Runs a command with a time limit; past it the whole process tree is ended. Returns {code, out}. */
function run(cmd, argv, {cwd = ROOT, minutes = 30, logTo} = {}) {
  return new Promise(done => {
    if ( DRY ) { log(`[dry] ${cmd} ${argv.join(" ")}`); return done({code: 0, out: ""}); }
    const p = spawn(cmd, argv, {cwd, windowsHide: true, env: {...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1"}});
    try { os.setPriority(p.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch {}
    let out = "", timedOut = false;
    const keep = d => { out += d; if ( out.length > 400000 ) out = out.slice(-300000); if ( logTo ) fs.appendFileSync(logTo, d); };
    p.stdout.on("data", keep); p.stderr.on("data", keep);
    const t = setTimeout(() => {
      timedOut = true; log(`time limit (${minutes} min) for ${path.basename(argv[0] ?? cmd)}: ending process tree ${p.pid}`);
      if ( process.platform === "win32" ) spawnSync("taskkill", ["/PID", String(p.pid), "/T", "/F"], {windowsHide: true}); else p.kill("SIGKILL");
    }, minutes * 60000);
    p.on("error", e => { clearTimeout(t); done({code: null, out: out + `\n${e.message}`}); });
    p.on("exit", code => { clearTimeout(t); done({code: timedOut ? null : code, out, timedOut}); });
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
  const remote = ref === "main" ? "origin/main" : ref.startsWith("claude/") ? `origin/${ref}` : ref;
  const f = await git(ref.startsWith("claude/") ? ["fetch", "-q", "origin", `+refs/heads/${ref}:refs/remotes/origin/${ref}`] : ["fetch", "-q", "origin"]);
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
    const i = await gh("POST", "/issues", {title: `PC runner alert: ${title}`, labels: [LABEL.alert],
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
const recent = [];
async function finish(issue, ok, text) {
  await comment(issue.number, text);
  await setLabels(issue.number, [ok ? LABEL.done : LABEL.failed], [LABEL.running]);
  await close(issue.number);
  recent.unshift(`#${issue.number} ${ok ? "done" : "FAILED"} ${new Date().toISOString().slice(11, 16)}Z`); recent.length = Math.min(recent.length, 12);
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
  const faultRetry = async (why, out = "") => {
    if ( retried ) return {code: null, text: `${why} (after one retry)\n${out.slice(-1500)}`};
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
  if ( job.reset || job.kind === "gate-two" ) await lanesCmd(["reset", "--lane", lane, ...repo], {logTo: L});
  const d = await lanesCmd(["deploy", "--lane", lane, "--if-changed", ...repo], {logTo: L});
  if ( d.code !== 0 ) return faultRetry(`deploy to lane ${lane} failed (exit ${d.code})`, d.out);
  if ( job.kind === "deploy" ) return {code: 0, text: d.out.trim().split("\n").slice(-3).join("\n")};
  if ( job.kind === "gate-two" ) {
    const f = path.join(laneOf(lane).dataPath, "Data", "wodx-gate", `${job.gate}-result.json`);
    fs.rmSync(f, {force: true});
    const r = await node("tools/harness/gate-two.mjs", [job.gate, "--url", `https://localhost:${laneOf(lane).port}`], {logTo: L, minutes: 30});
    // The failing steps are read before the reset, which may put the lane's data back
    const line = r.out.split("\n").filter(x => x.startsWith(`${job.gate}:`)).pop() ?? r.out.trim().split("\n").slice(-3).join("\n");
    const detail = failDetail(lane, line);
    await lanesCmd(["reset", "--lane", lane, ...repo], {logTo: L});
    if ( r.code === null ) return faultRetry("gate-two ran past its time limit", r.out);
    return {code: r.code, text: `${line}\n${detail}`.trim()};
  }
  const report = path.join(LOGS, `${tag}-l${lane}-report.txt`);
  fs.rmSync(report, {force: true});
  const gatesN = job.all ? 400 : job.touched ? 150 : job.gates.length;
  const r = await node("tools/lanes/run-gate.mjs", [...gateArgs(job, lane, i, n, report), ...repo], {logTo: L, minutes: Math.min(16 * Math.ceil(gatesN / n) + 20, 900)});
  const rep = fs.existsSync(report) ? fs.readFileSync(report, "utf8") : r.out.slice(-4000);
  if ( isInfraFault(r.code) ) return faultRetry(`run-gate on lane ${lane} stopped with ${r.code === null ? "a time limit" : `exit ${r.code}`}`, rep);
  const text = `${rep.trim()}\n${failDetail(lane, rep)}`.trim();
  if ( r.code !== 1 || job.recheck === false ) return {code: r.code, text};
  return {code: r.code, text: `${text}\n\n${await recheck(job, lane, tag, wt, rep, L)}`};
}

/**
 * B4610: a failing gate is run again before the result goes back, so the thread knows whose it is: alone on a fresh
 * lane on the same commit (does it fail only after other gates?), then on main (was it failing already?).
 */
async function recheck(job, lane, tag, wt, rep, L) {
  const failing = failingGates(rep).slice(0, 12);
  if ( !failing.length ) return "";
  const runOn = async (dir, name) => {
    const f = path.join(LOGS, `${tag}-l${lane}-${name}.txt`);
    fs.rmSync(f, {force: true});
    await lanesCmd(["reset", "--lane", lane, "--repo", dir], {logTo: L});
    const d = await lanesCmd(["deploy", "--lane", lane, "--if-changed", "--repo", dir], {logTo: L});
    if ( d.code !== 0 ) return null;
    await node("tools/lanes/run-gate.mjs", [...failing, "--lane", String(lane), "--wait", "10", "--report", f, "--repo", dir], {logTo: L, minutes: 16 * failing.length + 20});
    return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null;
  };
  log(`${tag} lane ${lane}: rechecking ${failing.join(" ")}`);
  const alone = await runOn(wt.dir, "alone");
  let main = null; const notOnMain = new Set();
  if ( job.ref !== "main" ) {
    const m = await worktree(lane, "main");
    if ( !m.error ) {
      for ( const g of failing ) if ( !fs.existsSync(path.join(m.dir, "tools", "gate", `${g}.mjs`)) ) notOnMain.add(g);
      main = m.sha === wt.sha ? alone : await runOn(m.dir, "main");
    }
  }
  if ( alone === null ) return "Recheck: the lane would not take the rerun; nothing more to say.";
  const rows = recheckVerdicts(failing, alone, main, notOnMain);
  return ["Recheck (each failing gate rerun on a fresh lane):", ...rows.map(r => `- ${r.gate}: ${r.verdict}`)].join("\n");
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
async function start(issue, job, lanes) {
  active.add(issue.number);
  const tag = `job${issue.number}`, t0 = Date.now();
  for ( const l of lanes ) state[l].busy = issue.number;
  log(`#${issue.number} ${job.kind} starting${lanes.length ? ` on lane(s) ${lanes.join(", ")}` : ""}`);
  try {
    await setLabels(issue.number, [LABEL.running]);
    await comment(issue.number, `Started ${new Date().toISOString().slice(0, 16)}Z${lanes.length ? ` on lane(s) ${lanes.join(", ")}` : ""} (ref ${job.ref}).`);
    const parts = lanes.length ? await Promise.all(lanes.map((l, i) => laneWork(job, l, i, lanes.length, tag))) : [await runLight(job, tag)];
    const ok = parts.every(p => p.code === 0);
    const mins = Math.round((Date.now() - t0) / 60000);
    const body = `**${ok ? "Passed" : "Failed"}** in ${mins} min${job.thread ? ` (for thread ${job.thread})` : ""}.\n\n` +
      parts.map((p, i) => `${lanes.length ? `Lane ${lanes[i]}, exit ${p.code ?? "fault"}:\n` : ""}\`\`\`\n${p.text}\n\`\`\``).join("\n");
    await finish(issue, ok, body);
    log(`#${issue.number} ${ok ? "passed" : "failed"} in ${mins} min`);
  } catch (e) {
    log(`#${issue.number} runner error: ${e.stack ?? e.message}`);
    await finish(issue, false, `Runner error: ${e.message}`).catch(() => {});
  } finally { for ( const l of lanes ) state[l].busy = null; finished.set(issue.number, Date.now()); active.delete(issue.number); }
}

// ---- status issue ----
let statusIssue = null, lastStatus = "", lastStatusAt = 0, heldSince = null;
async function status(queue) {
  const res = resources();
  const lanes = await Promise.all(LANES.map(async id => {
    const l = laneOf(id), s = state[id], lk = lockState(l, cfg);
    const what = s.busy ? `job #${s.busy}` : s.down ? `DOWN${s.why ? `: ${s.why}` : ""}` : lk.held ? `in use outside the runner (${(lk.lock?.gates ?? []).join(" ").slice(0, 60)})` : "free";
    return `| ${id} | ${l.port} | ${what} |`;
  }));
  const body = [`Updated ${new Date().toISOString().slice(0, 16)}Z by the PC runner at ${short(spawnSync("git", ["rev-parse", "HEAD"], {cwd: ROOT, encoding: "utf8"}).stdout)}.`,
    "", "| Lane | Port | State |", "|---|---|---|", ...lanes, "",
    `Queue (${queue.length}): ${queue.map(q => `#${q.number} ${q.job.kind} p${q.job.prio}`).join(", ") || "empty"}`,
    `Last results: ${recent.join(", ") || "none yet"}`,
    `Free: ${Object.entries(res.free).map(([d, v]) => `${d}: ${v.gb} GB`).join(", ")}, memory ${res.ram} GB${res.low.length ? ` (HOLDING: ${res.low.join("; ")})` : ""}`,
    "", "How to queue a job: tools/pcq/README.md."].join("\n");
  const changed = body.replace(/^Updated.*$/m, "") !== lastStatus.replace(/^Updated.*$/m, "");
  if ( DRY || (!changed && Date.now() - lastStatusAt < 10 * 60000) ) return;
  try {
    statusIssue ??= (await openIssues(LABEL.status))[0]?.number ?? (await gh("POST", "/issues", {title: "PC runner status", labels: [LABEL.status], body})).number;
    await gh("PATCH", `/issues/${statusIssue}`, {body});
    lastStatus = body; lastStatusAt = Date.now();
  } catch (e) { log(`status update failed: ${e.message}`); statusIssue = null; }
}

// ---- self update: exit 75 when main changed the runner or lane tools and nothing is running ----
const MY_SHA = spawnSync("git", ["rev-parse", "HEAD"], {cwd: ROOT, encoding: "utf8"}).stdout.trim();
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
  if ( !draining ) { log(`main changed the runner; taking no new jobs until the running ones end (at most ${DRAIN_MIN} min)`); drainSince = Date.now(); }
  draining = true;
  return !active.size;
}

// ---- main loop ----
const clashes = laneClashes(cfg, LANES);
if ( clashes.length ) { log(`Lane clash check failed; not starting:\n  ${clashes.join("\n  ")}`); process.exit(2); }
log(`runner ${short(MY_SHA)} up; lanes ${LANES.join(", ")}; light slots ${conf.light}${DRY ? " (dry run)" : ""}`);
for ( const i of await openIssues(LABEL.running) ) {
  log(`#${i.number} was running when the runner stopped; queued again`);
  await setLabels(i.number, [], [LABEL.running]);
  await comment(i.number, "The runner restarted while this ran; it will run again from the start.").catch(() => {});
}
let light = 0, lastFetch = 0, lastSweep = 0, sweeping = false;
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
      await sleep(30000); continue;
    }
    // Stale pull requests, every hour, beside the jobs (B4110).
    if ( !sweeping && Date.now() - lastSweep > HOUR ) {
      lastSweep = Date.now(); sweeping = true;
      sweep(gh, {apply: !DRY, log: m => log(`sweep ${m}`), stateFile: path.join(HOME, "sweep-state.json")})
        .then(r => log(`sweep: ${r.rows.length} open, ${r.stuck} stuck, ${r.red} red, ${r.fixed} moved on`))
        .catch(e => log(`sweep failed: ${e.message}`)).finally(() => { sweeping = false; });
    }
    for ( const id of LANES ) await healthCheck(id);
    const issues = await openIssues(LABEL.job);
    const openNums = new Set(issues.map(i => i.number));
    const queue = [];
    for ( const i of issues ) {
      if ( active.has(i.number) || recentlyFinished(i.number) || i.labels.some(l => l.name === LABEL.running) ) continue;
      const p = parseBody(i.body), v = p.error ? p : validate(p.job, LANES);
      if ( v.error ) { await finish(i, false, `Not run: ${v.error}\n\nFormat: tools/pcq/README.md.`); continue; }
      queue.push({number: i.number, issue: i, job: v.job});
    }
    const ready = order(queue, openNums);
    const res = resources();
    if ( res.low.length ) {
      heldSince ??= Date.now();
      if ( Date.now() - heldSince > 30 * 60000 ) await alert("resources", "jobs held for low disk or memory", res.low.join("\n"));
    } else { heldSince = null; await recovered("resources"); }
    for ( const q of draining ? [] : ready ) {
      if ( LANE_KINDS.has(q.job.kind) ) {
        if ( res.low.length ) continue;
        // A setup-lane job runs on a lane that is not set up yet; every other job needs a healthy free lane.
        const free = q.job.kind === "setup-lane" ? l => !state[l].busy && !lockState(laneOf(l), cfg).held : laneFree;
        const want = q.job.lane !== undefined ? [String(q.job.lane)] : LANES.filter(laneFree).slice(0, q.job.lanes);
        // A job that asked for several lanes takes what is free now rather than waiting for all of them.
        if ( !want.length || want.some(l => !free(l)) ) continue;
        for ( const l of want ) state[l].busy = q.number;
        start(q.issue, q.job, want);
      } else if ( light < conf.light ) {
        light++;
        start(q.issue, q.job, []).finally(() => light--);
      }
    }
    await status(queue.filter(q => !active.has(q.number)));
  } catch (e) { log(`loop error: ${e.stack ?? e.message}`); }
  if ( ONCE ) break;
  await sleep((conf.pollSeconds ?? 30) * 1000);
}
