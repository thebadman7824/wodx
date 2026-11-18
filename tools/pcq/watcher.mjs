/**
 * PC watcher (B7290): the laptop (DESKTOP-S6NV3Q9) checks every few minutes that the PC job system is running as it
 * should, and writes what it finds to one issue. It only looks and reports: it never kills or starts a process,
 * restarts OCR or art, touches a lane or a world, closes another tool's alert or moves a job.
 *
 *   node tools/pcq/watcher.mjs [--once] [--dry]      (started by run-watcher.ps1, every 5 minutes)
 *
 * What it reads, all from GitHub plus the laptop's own process list:
 * - registry/pc-status/<pc>.json on the pc-status branch (status-push.mjs on each PC, every 5 minutes): is each PC's
 *   status push alive, its runner up, its lanes answering, its graphics card cool.
 * - the open pc-status issues (each runner rewrites its own every 2 minutes): is each runner alive.
 * - open pc-job issues: a job running or waiting too long.
 * - the merge train line, as the Main PC's status issue shows it: the same front for too long.
 * - open pc-alert issues: alerts left open after the thing they named came back.
 * - on the laptop itself: its runner, watchdog and status push are running.
 * Book OCR on the Secondary PC and ComfyUI on the Main PC publish no status the laptop can read, so the report says
 * what it can see of them (the graphics card load and guard) and says plainly what it cannot.
 *
 * Writes: the issue "PC watcher report" (label pc-watch), rewritten each cycle; one issue "PC watcher alert" (label
 * pc-alert) opened when a problem lasts two cycles, commented when the problem list changes and closed when it clears;
 * logs\watcher-report.md, logs\watcher-<date>.log and logs\watcher-state.json under the runner's home.
 * A file named watcher-off in the home stops run-watcher.ps1.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath, pathToFileURL} from "node:url";

export const OWNER = "thebadman7824", REPO_NAME = "wodx";
export const REPORT_TITLE = "PC watcher report", ALERT_TITLE = "PC watcher alert", REPORT_LABEL = "pc-watch", ALERT_LABEL = "pc-alert";
const MIN = 60e3, HOUR = 60 * MIN;

/** Thresholds. A runner rewrites its status issue every 2 minutes and status-push.mjs its file every 5. */
export const LIMITS = {
  pushStaleMin: 15,      // a PC's status file older than this: the PC's status push is silent
  runnerStaleMin: 20,    // a runner's status issue older than this: the runner is silent
  jobRunHours: 6,        // a job running longer than this is probably stuck
  jobWaitHours: 6,       // a job waiting longer than this is probably stuck
  trainFrontHours: 3.5,  // the train takes a pull request out after trainMaxHours (3); the same front past this is stuck
  alertOldHours: 24,     // an alert open longer than this is listed as old
  confirmCycles: 2,      // a problem must show this many cycles in a row before the alert issue opens
  renderStallMin: 30,    // ComfyUI has work but nothing finished for this long: renders look stalled (B7296)
  ocrStallMin: 60,       // OCR workers run but the output folder has nothing newer than this (B7296)
  laneConfirmCycles: 3,  // a lane must be down this many cycles (about 15 minutes): each gates job resets its lane first
};
/** Lanes that are down on purpose: 6 is kept for the local agents, which are paused (17 November 2026). */
export const IGNORE_LANES = [6];

/** The PCs: name in pc-status, runner status issue title, lanes. Lane 9 (the cloud lane) has no PC and no status. */
export const PCS = [
  {key: "main", label: "Main PC", statusTitle: "PC runner status", lanes: [2, 3, 4, 5, 6]},
  {key: "secondary", label: "Secondary PC", statusTitle: "PC runner status (Secondary PC)", lanes: [8]},
  {key: "laptop", label: "Laptop", statusTitle: "PC runner status (second PC)", lanes: [7]},
];

const ageMin = (t, now) => t ? Math.round((now - Date.parse(t)) / MIN) : null;
const hm = m => m === null ? "never" : m < 90 ? `${m} min` : `${(m / 60).toFixed(1)} h`;

/** The merge train line from the Main PC's status issue body: {front, line[], why}. */
export function parseTrain(body) {
  const m = /^Merge train: (.*)$/m.exec(body ?? "");
  if ( !m ) return null;
  if ( /empty|no pull requests/i.test(m[1]) && !/front #/.test(m[1]) ) return {front: null, line: [], why: m[1]};
  const front = /front #(\d+)/.exec(m[1])?.[1] ?? null;
  const line = [...(/line (.*)$/.exec(m[1])?.[1] ?? "").matchAll(/#(\d+)/g)].map(x => Number(x[1]));
  return {front: front ? Number(front) : null, line, why: /front #\d+, (.*?);? line /.exec(m[1])?.[1] ?? ""};
}

/** The "Updated <iso>" stamp a runner writes at the top of its status issue. */
export const statusStamp = body => /^Updated (\d{4}-\d\d-\d\dT\d\d:\d\dZ?)/m.exec(body ?? "")?.[1]?.replace(/Z?$/, ":00Z") ?? null;

/**
 * Pure: turn one snapshot into problems and notes. prev is the state saved by the last cycle.
 * snap: {now, pcs: {main: json|null, ...}, statusIssues: [{number,title,updated_at,body}], jobs: [{number,title,
 * created_at, running, startedAt}], alerts: [{number,title,created_at}], local: {runner, watchdog, statusPush}|null}
 */
export function assess(snap, prev = {}) {
  const now = snap.now, problems = [], notes = [], rows = [];
  const add = (key, text) => problems.push({key, text});
  const status = Object.fromEntries(PCS.map(p => [p.key, snap.statusIssues.find(i => i.title === p.statusTitle) ?? null]));
  const silent = {};
  for ( const p of PCS ) {
    const f = snap.pcs[p.key], iss = status[p.key];
    const pushAge = ageMin(f?.time, now), runAge = ageMin(iss ? (statusStamp(iss.body) ?? iss.updated_at) : null, now);
    const pushSilent = pushAge === null || pushAge > LIMITS.pushStaleMin, runSilent = runAge === null || runAge > LIMITS.runnerStaleMin;
    silent[p.key] = runSilent;
    let state = "ok";
    if ( pushSilent && runSilent ) { state = "silent"; add(`${p.key}:silent`, `${p.label} is silent: no status push for ${hm(pushAge)} and no runner update for ${hm(runAge)}. It is probably off, asleep, rebooting or offline.`); }
    else if ( runSilent ) { state = "runner silent"; add(`${p.key}:runner`, `${p.label} is on (status push ${hm(pushAge)} ago) but its runner has not updated its status issue${iss ? ` #${iss.number}` : ""} for ${hm(runAge)}${f && f.runnerUp === false ? ", and the PC says the runner is not running" : ""}.`); }
    else if ( pushSilent && pushAge !== null && pushAge <= 2 * LIMITS.pushStaleMin ) { state = "push silent"; notes.push(`${p.label}: the runner is alive but its status push has been quiet for ${hm(pushAge)}, so lane and graphics card readings are old.`); }
    else if ( pushSilent ) { state = "push silent"; add(`${p.key}:push`, `${p.label}: the runner is alive but its status push (status-push.mjs) has been quiet for ${hm(pushAge)}; it may not have come back after a restart, so lane and graphics card readings are old.`); }
    if ( f && !pushSilent ) {
      // One key per lane, so a lane that flaps beside another still counts up (B7295). Lane 6 is kept for the
      // paused local agents and is down on purpose.
      for ( const l of f.lanes ?? [] ) if ( !l.up && !IGNORE_LANES.includes(l.id) ) add(`${p.key}:lane:${l.id}`, `${p.label}: lane ${l.id} not answering.`);
      if ( f.gpu && f.gpu.warning && f.gpu.warning !== "ok" ) add(`${p.key}:gpu`, `${p.label}: graphics card ${f.gpu.warning} (${f.gpu.tempC} C, memory ${f.gpu.vramPct}% used).`);
    }
    rows.push({pc: p.label, lanes: p.lanes.join(", "), push: hm(pushAge), runner: `${hm(runAge)} ago${iss ? ` (#${iss.number})` : ""}`, state});
  }
  // Jobs
  for ( const j of snap.jobs ) {
    if ( j.running ) {
      const h = (now - Date.parse(j.startedAt ?? j.created_at)) / HOUR;
      if ( h > LIMITS.jobRunHours ) add(`job:${j.number}:run`, `Job #${j.number} has been running ${h.toFixed(1)} h: ${j.title.slice(0, 90)}`);
    } else {
      const h = (now - Date.parse(j.created_at)) / HOUR;
      if ( h > LIMITS.jobWaitHours ) add(`job:${j.number}:wait`, `Job #${j.number} has waited ${h.toFixed(1)} h without starting: ${j.title.slice(0, 90)}`);
    }
  }
  // Merge train: the same front, seen by this watcher, for too long.
  const train = parseTrain(status.main?.body);
  const state = {problems: {}, train: prev.train ?? null};
  if ( train?.front ) {
    const since = prev.train?.front === train.front ? prev.train.since : now;
    state.train = {front: train.front, since};
    const h = (now - since) / HOUR;
    if ( h > LIMITS.trainFrontHours ) add(`train:${train.front}`, `Merge train: #${train.front} has been at the front ${h.toFixed(1)} h (${train.why || "no reason shown"}).${silent.main ? " The Main PC, which drives the train, is silent." : ""}`);
  } else if ( train ) state.train = null;
  // Alerts left open: a "silent" alert whose PC is alive again, and any alert open over a day.
  const leaked = [], old = [];
  for ( const a of snap.alerts ) {
    if ( a.title === ALERT_TITLE ) continue;
    if ( /main PC runner has been silent/i.test(a.title) && !silent.main ) leaked.push(a.number);
    else if ( (now - Date.parse(a.created_at)) / HOUR > LIMITS.alertOldHours ) old.push(a.number);
  }
  if ( leaked.length ) notes.push(`Alerts about the Main PC going silent that did not close when it came back: ${leaked.map(n => `#${n}`).join(", ")}.`);
  if ( old.length ) notes.push(`Alerts open over ${LIMITS.alertOldHours} h: ${old.map(n => `#${n}`).join(", ")}.`);
  // The laptop's own processes.
  if ( snap.local ) for ( const [k, label] of [["runner", "runner"], ["watchdog", "runner watchdog"], ["statusPush", "status push"]] )
    if ( !snap.local[k] ) add(`laptop:local:${k}`, `Laptop: its ${label} is not running.`);
  // Art renders and book OCR (B7296): read from the status file's comfy and ocr fields where a PC sends them.
  const fresh = k => snap.pcs[k] && !(ageMin(snap.pcs[k].time, now) > LIMITS.pushStaleMin);
  let sawComfy = false, sawOcr = false;
  for ( const p of PCS ) {
    if ( !fresh(p.key) ) continue;
    const c = snap.pcs[p.key].comfy, o = snap.pcs[p.key].ocr;
    if ( c ) {
      sawComfy = true;
      if ( !c.up ) notes.push(`${p.label}: ComfyUI is not answering (off, or not started after a restart).`);
      else if ( (c.running || c.pending) && c.lastDoneMin !== null && c.lastDoneMin > LIMITS.renderStallMin )
        add(`${p.key}:render`, `${p.label}: renders look stalled: ${c.running} running and ${c.pending} waiting in ComfyUI, and nothing has finished for ${hm(c.lastDoneMin)}.`);
      else notes.push(`${p.label}: ComfyUI ${c.running || c.pending ? `${c.running} running, ${c.pending} waiting` : "idle"}${c.lastDoneMin !== null ? `, last render ${hm(c.lastDoneMin)} ago` : ""}.`);
    }
    if ( o ) {
      sawOcr = true;
      if ( o.gaveUp ) add(`${p.key}:ocr:gaveup`, `${p.label}: the book OCR's log says it gave up${o.memWait ? " while waiting for memory" : ""}.`);
      else if ( o.workers > 0 && o.lastOutputMin !== null && o.lastOutputMin !== undefined && o.lastOutputMin > LIMITS.ocrStallMin )
        add(`${p.key}:ocr:stalled`, `${p.label}: the book OCR has ${o.workers} worker${o.workers > 1 ? "s" : ""} running but no new output for ${hm(o.lastOutputMin)}${o.memWait ? "; its log says it is waiting for memory" : ""}.`);
      else notes.push(`${p.label}: book OCR ${o.workers ? `${o.workers} worker${o.workers > 1 ? "s" : ""} running` : "not running"}${o.lastOutputMin != null ? `, last output ${hm(o.lastOutputMin)} ago` : ""}${o.memWait ? ", waiting for memory" : ""}${o.stopped ? ", stopped (pause file or end of loop)" : ""}.`);
    }
  }
  if ( !sawComfy ) { const g = fresh("main") ? snap.pcs.main.gpu : null;
    notes.push(`ComfyUI sends no status yet; ${g ? `the Main PC's card shows ${g.loadPct}% load, ${g.tempC} C, guard ${g.jobHeld ? "held by a job" : "free"}` : "the Main PC's card readings are old or missing"}.`); }
  if ( !sawOcr ) notes.push("Book OCR (Secondary PC) sends no status yet, so the watcher cannot see it.");
  // Debounce: count cycles in a row for each problem.
  for ( const p of problems ) state.problems[p.key] = (prev.problems?.[p.key] ?? 0) + 1;
  const confirmed = problems.filter(p => state.problems[p.key] >= (/:lane:/.test(p.key) ? LIMITS.laneConfirmCycles : LIMITS.confirmCycles));
  return {problems, confirmed, notes, rows, train, state};
}

/** The report issue body. */
export function report(a, now, host) {
  const t = new Date(now).toISOString().slice(0, 16) + "Z";
  const L = [`Updated ${t} by the PC watcher on the ${host}. It only looks and reports; see tools/pcq/watcher.mjs.`, "",
    a.problems.length ? `**${a.problems.length} problem${a.problems.length > 1 ? "s" : ""}**` : "**All clear.**", ""];
  for ( const p of a.problems ) L.push(`- ${p.text}${a.confirmed.includes(p) ? "" : " _(first sighting)_"}`);
  L.push("", "| PC | Lanes | Status push | Runner update | State |", "|---|---|---|---|---|");
  for ( const r of a.rows ) L.push(`| ${r.pc} | ${r.lanes} | ${r.push} ago | ${r.runner} | ${r.state} |`);
  L.push("", `Merge train: ${a.train?.front ? `front #${a.train.front}, line ${a.train.line.map(n => `#${n}`).join(", ")}` : a.train ? "empty" : "not shown (Main PC status issue missing)"}`, "");
  for ( const n of a.notes ) L.push(`- ${n}`);
  return L.join("\n");
}

// ---------------------------------------------------------------- live run
function token() {
  if ( process.env.WODX_PCQ_TOKEN ) return process.env.WODX_PCQ_TOKEN;
  const r = spawnSync("git", ["credential", "fill"], {input: "protocol=https\nhost=github.com\n\n", encoding: "utf8", windowsHide: true});
  const t = /^password=(.+)$/m.exec(r.stdout ?? "")?.[1];
  if ( !t ) throw new Error("No GitHub token from git credential fill.");
  return t.trim();
}
async function gh(method, url, body) {
  for ( let i = 0; i < 3; i++ ) {
    try {
      const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO_NAME}${url}`, {method, body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(30000),
        headers: {Authorization: `token ${token()}`, "User-Agent": "wodx-pc-watcher", Accept: "application/vnd.github+json", "Content-Type": "application/json"}});
      if ( r.status >= 500 || r.status === 429 ) throw new Error(`GitHub ${r.status}`);
      if ( !r.ok ) throw new Error(`GitHub ${r.status} ${method} ${url}: ${(await r.text()).slice(0, 200)}`);
      return r.status === 204 ? null : r.json();
    } catch (e) { if ( i === 2 || /GitHub 4\d\d/.test(e.message) ) throw e; await new Promise(r => setTimeout(r, 5000 * (i + 1))); }
  }
}
const open = label => gh("GET", `/issues?state=open&labels=${label}&per_page=100`).then(l => l.filter(i => !i.pull_request));

function localProcs() {
  if ( process.platform !== "win32" ) return null;
  const r = spawnSync("powershell", ["-NoProfile", "-Command", "Get-CimInstance Win32_Process | ForEach-Object { $_.CommandLine }"],
    {encoding: "utf8", timeout: 60000, windowsHide: true, maxBuffer: 20 * 1024 * 1024});
  const l = (r.stdout ?? "").split(/\r?\n/);
  return {runner: l.some(x => /pcq[\\/]repo[\\/]tools[\\/]pcq[\\/]runner\.mjs/i.test(x)), watchdog: l.some(x => /pcq[\\/]watchdog\.ps1/i.test(x)),
    statusPush: l.some(x => /status-push\.mjs/i.test(x))};
}

async function snapshot() {
  const now = Date.now(), pcs = {};
  for ( const p of PCS ) {
    try { const f = await gh("GET", `/contents/registry/pc-status/${p.key}.json?ref=pc-status`); pcs[p.key] = JSON.parse(Buffer.from(f.content, "base64").toString("utf8")); }
    catch { pcs[p.key] = null; }
  }
  const [statusIssues, jobsRaw, alerts] = [await open("pc-status"), await open("pc-job"), await open(ALERT_LABEL)];
  const jobs = [];
  for ( const j of jobsRaw ) {
    const running = j.labels.some(l => l.name === "pc-running");
    let startedAt = null;
    if ( running ) try { startedAt = (await gh("GET", `/issues/${j.number}/comments?per_page=100`)).filter(c => /^Started /.test(c.body)).at(-1)?.created_at ?? null; } catch {}
    jobs.push({number: j.number, title: j.title, created_at: j.created_at, running, startedAt});
  }
  return {now, pcs, statusIssues, jobs, alerts, local: localProcs()};
}

async function main() {
  const args = process.argv.slice(2), DRY = args.includes("--dry");
  const home = process.env.WODX_PCQ_HOME ?? (fs.existsSync("D:/WoDX/pcq") ? "D:/WoDX/pcq" : "C:/WoDX/pcq");
  const logs = path.join(home, "logs"); fs.mkdirSync(logs, {recursive: true});
  const log = s => { const l = `${new Date().toISOString()} ${s}`; console.log(l); if ( !DRY ) fs.appendFileSync(path.join(logs, `watcher-${l.slice(0, 10)}.log`), l + "\n"); };
  const stateFile = path.join(logs, "watcher-state.json");
  let prev = {}; try { prev = JSON.parse(fs.readFileSync(stateFile, "utf8")); } catch {}
  const host = os.hostname().toLowerCase() === "desktop-s6nv3q9" ? "Laptop" : os.hostname();
  const snap = await snapshot();
  const a = assess(snap, prev);
  const body = report(a, snap.now, host);
  if ( DRY ) { console.log(body); return; }
  fs.writeFileSync(path.join(logs, "watcher-report.md"), body + "\n");
  // Report issue, found by title so a restart never opens a second one.
  const mine = (await open(REPORT_LABEL)).find(i => i.title === REPORT_TITLE);
  if ( mine ) await gh("PATCH", `/issues/${mine.number}`, {body});
  else log(`report issue #${(await gh("POST", "/issues", {title: REPORT_TITLE, labels: [REPORT_LABEL], body})).number} opened`);
  // One alert issue for confirmed problems.
  const alert = snap.alerts.find(i => i.title === ALERT_TITLE);
  const keys = a.confirmed.map(p => p.key).sort().join("|");
  const list = a.confirmed.map(p => `- ${p.text}`).join("\n");
  if ( a.confirmed.length && !alert ) {
    const i = await gh("POST", "/issues", {title: ALERT_TITLE, labels: [ALERT_LABEL], body: `The PC watcher on the ${host} sees:\n\n${list}\n\nThe full report is the issue "${REPORT_TITLE}". This issue closes when all of these clear.`});
    log(`alert #${i.number} opened: ${keys}`);
  } else if ( a.confirmed.length && alert && keys !== prev.alertKeys ) {
    await gh("POST", `/issues/${alert.number}/comments`, {body: `Now:\n\n${list}`}); log(`alert #${alert.number} updated: ${keys}`);
  } else if ( !a.confirmed.length && alert ) {
    await gh("POST", `/issues/${alert.number}/comments`, {body: "All clear."}); await gh("PATCH", `/issues/${alert.number}`, {state: "closed"});
    log(`alert #${alert.number} cleared`);
  }
  fs.writeFileSync(stateFile, JSON.stringify({...a.state, alertKeys: a.confirmed.length ? keys : null, at: new Date(snap.now).toISOString()}, null, 1));
  log(`${a.problems.length} problem(s), ${a.confirmed.length} confirmed${a.problems.length ? ": " + a.problems.map(p => p.key).join(" ") : ""}`);
}

if ( import.meta.url === pathToFileURL(process.argv[1] ?? "").href ) {
  try { os.setPriority(os.constants.priority.PRIORITY_BELOW_NORMAL); } catch {}
  await main().catch(e => { console.error(`${new Date().toISOString()} watcher failed: ${e.message}`); process.exitCode = 1; });
}
