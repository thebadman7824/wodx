#!/usr/bin/env node
/**
 * Nightly full gate run on the Secondary PC (B7020), the second tier beside the touched-only runs on each pull request
 * (pc-gates.yml, B7010). The "WoDX nightly gates" task starts it at 05:00 UTC. It:
 *   1. takes the GPU guard (gpuguard.mjs, class other), so it waits while the book OCR or a model job holds the card,
 *      and gives up if it has not got the card by 13:00 UTC, so a long OCR night never runs the suite into the day;
 *   2. queues one pc-job, every gate ("all": true) on lane 8 for main's current commit, opened with the owner's sign-in;
 *   3. queues a second job on lane 8 after it: the clean smoke set in the lane's clean test world ("world": "clean",
 *      "cleanSet": true; gatecleanworld and the shared gates that must pass with no chronicle in play, PR 2169), so a
 *      change that only works with a chronicle in play shows up overnight;
 *   4. waits for both jobs to finish and opens a summary issue (label nightly-gates) with the results and the counts;
 *      a gate that passed on the last nightly run and fails now names the pull requests merged in between (B7443).
 * It skips the run (and says so in a summary issue) when main's gate inputs are the same as at the last nightly result
 * (B7443); --force runs it anyway. Its job carries class "health" (B7448), so PR gate jobs go before it in the queue.
 * The PC runner posts the wodx/gates status for main's commit as it does for any all-gates job (B7000).
 * It runs at below-normal priority (the task's .cmd starts it that way, and the PC runner on this PC runs below normal
 * too, B7021).
 *   node tools/pcq/nightly-gates.mjs [--dry] [--no-guard]
 */
import fs from "node:fs";
import path from "node:path";
import {spawnSync, execFileSync} from "node:child_process";
import {fileURLToPath, pathToFileURL} from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../..");
const REPO = "thebadman7824/wodx", LANE = 8, GIVE_UP_UTC_HOUR = 13;
const args = process.argv.slice(2), DRY = args.includes("--dry"), NO_GUARD = args.includes("--no-guard");
const LOG = "D:/WoDX/pcq/logs/nightly-gates.log";
const log = s => { const l = `${new Date().toISOString()} ${s}`; console.log(l); try { fs.appendFileSync(LOG, l + "\n"); } catch {} };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Minutes from now until the give-up hour (UTC) today, or 0 when it has passed. */
export function minutesUntil(hourUtc, now = new Date()) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hourUtc));
  return Math.max(0, Math.floor((end - now) / 60000));
}

/** The pass, fail and gate counts in the PC runner's result comment, as far as they can be read. */
export function counts(text = "") {
  const n = re => { const m = re.exec(text); return m ? Number(m[1]) : null; };
  return {passed: n(/(\d+)\s+passed/i), failed: n(/(\d+)\s+failed/i), gates: n(/(\d+)\s+gate\(?s\)?/i)};
}

/** B7443: the gates failing tonight that passed on the last night's run (a gate new since then counts as new too). */
export function newFailures(last, now) {
  const before = new Set(last ?? []);
  return (now ?? []).filter(g => !before.has(g));
}

/** B7443: the pull requests merged between two main commits, from the compare's commit messages, oldest first. */
export function mergedPulls(messages = []) {
  const out = [];
  for ( const m of messages ) { const n = /^Merge pull request #(\d+)/.exec(m)?.[1]; if ( n && !out.includes(Number(n)) ) out.push(Number(n)); }
  return out;
}

/** B7443: the newest finished nightly job before this one: {number, sha12, failing} from its result comment, or null. */
async function lastNightly(tok, jobResult, skip = 0) {
  const closed = await api(tok, "GET", `/issues?state=closed&labels=pc-job&per_page=50&sort=created&direction=desc`);
  for ( const i of closed.filter(x => /^PC job: nightly full gates \[main [0-9a-f]{12}\]/.test(x.title) && x.number !== skip) ) {
    const comments = await api(tok, "GET", `/issues/${i.number}/comments?per_page=100`);
    const res = comments.map(c => jobResult(c.body ?? "")).filter(Boolean).at(-1);
    if ( res ) return {number: i.number, sha12: /\[main ([0-9a-f]{12})\]/.exec(i.title)[1], failing: res.failing};
  }
  return null;
}

function ownerToken() {
  const r = spawnSync("git", ["credential", "fill"], {input: "protocol=https\nhost=github.com\n\n", encoding: "utf8", windowsHide: true, env: {...process.env, GCM_INTERACTIVE: "never"}});
  const t = /^password=(.+)$/m.exec(r.stdout ?? "")?.[1];
  if ( !t ) throw new Error("no owner token from git credential fill");
  return t;
}
async function api(token, method, p, body) {
  const r = await fetch(`https://api.github.com/repos/${REPO}${p}`, {method,
    headers: {Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "wodx-nightly-gates"},
    body: body ? JSON.stringify(body) : undefined});
  if ( !r.ok ) throw new Error(`${method} ${p}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.status === 204 ? null : r.json();
}

async function loadGuard() {
  process.env.GPU_GUARD_DIR ||= "D:\\WoDX\\pcq\\gpu-guard";
  for ( const f of [path.join(HERE, "gpuguard.mjs"), "D:/WoDX/pcq/gpu-tools/gpuguard.mjs"] )
    if ( fs.existsSync(f) ) return import(pathToFileURL(f).href);
  return null;
}

async function main() {
  const tok = ownerToken();
  const day = new Date().toISOString().slice(0, 10);
  let guard = null;
  if ( !NO_GUARD ) {
    guard = await loadGuard();
    if ( !guard ) log("no gpuguard.mjs found: running without the GPU guard");
    else {
      const wait = minutesUntil(GIVE_UP_UTC_HOUR);
      if ( !wait ) { log("past the give-up hour: skipped"); return 0; }
      log(`waiting for the GPU guard (up to ${wait} min)`);
      try { await guard.acquire({cls: "other", needGb: 1, label: "nightly-gates", maxWaitMin: wait}); }
      catch (e) {
        log(`skipped: ${e.message}`);
        if ( !DRY ) await api(tok, "POST", "/issues", {title: `Nightly full gates ${day}: skipped`, labels: ["nightly-gates"],
          body: `The nightly full gate run on the Secondary PC did not get the card before ${GIVE_UP_UTC_HOUR}:00 UTC (the book OCR or a model job held it). Nothing ran.`});
        return 0;
      }
    }
  }
  try {
    execFileSync("git", ["fetch", "-q", "origin", "main"], {cwd: ROOT, stdio: "ignore"});
    const sha = execFileSync("git", ["rev-parse", "origin/main"], {cwd: ROOT, encoding: "utf8"}).trim();
    const {jobResult} = await import(pathToFileURL(path.join(HERE, "pr-gates.mjs")).href);
    const git = (...a) => execFileSync("git", a, {cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]}).trim();
    const last = await lastNightly(tok, jobResult).catch(e => { log(`could not read the last nightly run: ${e.message}`); return null; });
    // B7443: main's gate inputs (modules, system, gates, lane tools) unchanged since the last nightly result: nothing
    // new to learn, so the lane stays free
    if ( last && !args.includes("--force") ) {
      let same = false;
      try { same = !git("diff", "--name-only", last.sha12, sha, "--", "modules", "system", "tools/gate", "tools/lanes").length; } catch {}
      if ( same ) {
        log(`skipped: main ${sha.slice(0, 8)} has the same gate inputs as the last nightly run #${last.number} (${last.sha12.slice(0, 8)})`);
        if ( !DRY ) await api(tok, "POST", "/issues", {title: `Nightly full gates ${day}: skipped, nothing changed`, labels: ["nightly-gates"],
          body: `Main ${sha.slice(0, 8)} has the same modules, system, gates and lane tools as ${last.sha12.slice(0, 8)}, which the last nightly run (#${last.number}) gated: ${last.failing.length ? `${last.failing.length} gate(s) did not pass there (${last.failing.join(" ")})` : "every gate passed there"}. Nothing ran tonight.`});
        return 0;
      }
    }
    const sub = spawnSync(process.execPath, [path.join(HERE, "submit.mjs"), "gates", "--all", "--lane", String(LANE), "--ref", sha, "--prio", "3", "--class", "health", "--json"], {cwd: ROOT, encoding: "utf8", windowsHide: true});
    if ( sub.status !== 0 ) throw new Error(`submit.mjs refused: ${(sub.stdout + sub.stderr).slice(-400)}`);
    const job = JSON.parse(sub.stdout.slice(sub.stdout.indexOf("{")));
    const title = `PC job: nightly full gates [main ${sha.slice(0, 12)}]`;
    if ( DRY ) { log(`DRY: would open "${title}" with ${JSON.stringify(job)}`); return 0; }
    const issue = await api(tok, "POST", "/issues", {title, labels: ["pc-job"], body: `Nightly full gate run (B7020).\n\n\`\`\`json\n${JSON.stringify(job, null, 1)}\n\`\`\`\n`});
    log(`queued #${issue.number} for main ${sha.slice(0, 8)}`);
    // The clean smoke set in the lane's clean world, after the full run on the same lane (a refused submit, such as a
    // lane with no clean world yet, leaves the full run's result to stand alone)
    let cleanIssue = null;
    const subClean = spawnSync(process.execPath, [path.join(HERE, "submit.mjs"), "gates", "--world", "clean", "--clean-set", "--lane", String(LANE), "--ref", sha, "--prio", "3", "--class", "health", "--after", String(issue.number), "--json"], {cwd: ROOT, encoding: "utf8", windowsHide: true});
    if ( subClean.status !== 0 ) log(`clean set not queued: ${(subClean.stdout + subClean.stderr).slice(-300)}`);
    else {
      const cleanJob = JSON.parse(subClean.stdout.slice(subClean.stdout.indexOf("{")));
      cleanIssue = await api(tok, "POST", "/issues", {title: `PC job: nightly clean set [main ${sha.slice(0, 12)}]`, labels: ["pc-job"], body: `Nightly clean smoke set in lane ${LANE}'s clean world (PR 2169).\n\n\`\`\`json\n${JSON.stringify(cleanJob, null, 1)}\n\`\`\`\n`});
      log(`queued clean set #${cleanIssue.number}`);
    }
    const finish = async n => {
      for ( ;; ) {
        await sleep(5 * 60000);
        const it = await api(tok, "GET", `/issues/${n}`);
        if ( it.state !== "closed" ) continue;
        const comments = await api(tok, "GET", `/issues/${n}/comments?per_page=100`);
        return {ok: (it.labels ?? []).some(l => l.name === "pc-done"), result: [...comments].reverse().find(c => !/^(Claim|Started)\b/.test(c.body))?.body ?? ""};
      }
    };
    const {ok, result} = await finish(issue.number);
    const clean = cleanIssue ? await finish(cleanIssue.number) : null;
    const c = counts(result);
    // B7443: a gate that passed last night and fails tonight names the pull requests merged in between
    let blame = "";
    const now = jobResult(result);
    if ( now && last ) {
      const fresh = newFailures(last.failing, now.failing);
      if ( fresh.length ) {
        let pulls = [];
        try { pulls = mergedPulls((await api(tok, "GET", `/compare/${last.sha12}...${sha}`)).commits?.map(x => x.commit?.message ?? "") ?? []); } catch (e) { log(`compare failed: ${e.message}`); }
        blame = `**New since the last nightly run** (#${last.number}, main ${last.sha12.slice(0, 8)}): ${fresh.join(" ")}. ` +
          (pulls.length ? `Pull requests merged in between: ${pulls.map(n => `#${n}`).join(", ")}. A fix or revert of the one at fault goes to the front of the merge train.` : "No pull request merged in between, so these are flaky or depend on the lane.") + "\n\n";
      }
    }
    const head = `${ok ? "passed" : "FAILED"}${c.failed !== null ? `, ${c.passed ?? "?"} passed, ${c.failed} failed` : ""}${clean ? `; clean set ${clean.ok ? "passed" : "FAILED"}` : ""}`;
    const cleanPart = clean ? `\n\n**Clean set** (no chronicle in play, job #${cleanIssue.number}): ${clean.ok ? "passed" : "FAILED"}.\n\n${clean.result.slice(0, 2500)}` : "";
    await api(tok, "POST", "/issues", {title: `Nightly full gates ${day}: ${head}`, labels: ["nightly-gates"],
      body: `${ok ? "" : `**Gates fail on main ${sha.slice(0, 8)}.** These are faults in main itself, not in a pull request (there is no main to recheck against), so the wodx/gates status on that commit is a failure. Fix them first.\n\n`}` +
        blame + `Every gate on lane 8 (Secondary PC) for main ${sha.slice(0, 8)}: job #${issue.number}.\n\n${result.slice(0, 6000)}${cleanPart}`});
    log(`done: ${head}`);
    return 0;
  } finally { guard?.release?.(); }
}

if ( import.meta.url === pathToFileURL(process.argv[1] ?? "").href ) main().then(c => process.exit(c)).catch(e => { log(`fault: ${e.message}`); process.exit(1); });
