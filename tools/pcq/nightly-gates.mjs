#!/usr/bin/env node
/**
 * Nightly full gate run on the Secondary PC (B7012), the second tier beside the touched-only runs on each pull request
 * (pc-gates.yml, B7010). The "WoDX nightly gates" task starts it at 05:00 UTC. It:
 *   1. takes the GPU guard (gpuguard.mjs, class other), so it waits while the book OCR or a model job holds the card,
 *      and gives up if it has not got the card by 13:00 UTC, so a long OCR night never runs the suite into the day;
 *   2. queues one pc-job, every gate ("all": true) on lane 8 for main's current commit, opened with the owner's sign-in;
 *   3. waits for the job to finish and opens a summary issue (label nightly-gates) with the result and the counts.
 * The PC runner posts the wodx/gates status for main's commit as it does for any all-gates job (B7000).
 * It runs at below-normal priority (the task's .cmd starts it that way, and the PC runner on this PC runs below normal
 * too, B7013).
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
    const sub = spawnSync(process.execPath, [path.join(HERE, "submit.mjs"), "gates", "--all", "--lane", String(LANE), "--ref", sha, "--prio", "3", "--json"], {cwd: ROOT, encoding: "utf8", windowsHide: true});
    if ( sub.status !== 0 ) throw new Error(`submit.mjs refused: ${(sub.stdout + sub.stderr).slice(-400)}`);
    const job = JSON.parse(sub.stdout.slice(sub.stdout.indexOf("{")));
    const title = `PC job: nightly full gates [main ${sha.slice(0, 12)}]`;
    if ( DRY ) { log(`DRY: would open "${title}" with ${JSON.stringify(job)}`); return 0; }
    const issue = await api(tok, "POST", "/issues", {title, labels: ["pc-job"], body: `Nightly full gate run (B7012).\n\n\`\`\`json\n${JSON.stringify(job, null, 1)}\n\`\`\`\n`});
    log(`queued #${issue.number} for main ${sha.slice(0, 8)}`);
    let it;
    for ( ;; ) {
      await sleep(5 * 60000);
      it = await api(tok, "GET", `/issues/${issue.number}`);
      if ( it.state === "closed" ) break;
    }
    const ok = (it.labels ?? []).some(l => l.name === "pc-done");
    const comments = await api(tok, "GET", `/issues/${issue.number}/comments?per_page=100`);
    const result = [...comments].reverse().find(c => !/^(Claim|Started)\b/.test(c.body))?.body ?? "";
    const c = counts(result);
    const head = `${ok ? "passed" : "FAILED"}${c.failed !== null ? `, ${c.passed ?? "?"} passed, ${c.failed} failed` : ""}`;
    await api(tok, "POST", "/issues", {title: `Nightly full gates ${day}: ${head}`, labels: ["nightly-gates"],
      body: `${ok ? "" : `**Gates fail on main ${sha.slice(0, 8)}.** These are faults in main itself, not in a pull request (there is no main to recheck against), so the wodx/gates status on that commit is a failure. Fix them first.\n\n`}` +
        `Every gate on lane 8 (Secondary PC) for main ${sha.slice(0, 8)}: job #${issue.number}.\n\n${result.slice(0, 6000)}`});
    log(`done: ${head}`);
    return 0;
  } finally { guard?.release?.(); }
}

if ( import.meta.url === pathToFileURL(process.argv[1] ?? "").href ) main().then(c => process.exit(c)).catch(e => { log(`fault: ${e.message}`); process.exit(1); });
