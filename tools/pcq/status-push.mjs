/**
 * Public-safe PC status, pushed every 5 minutes to the `pc-status` branch of the wodx repo as registry/pc-status/<name>.json.
 * The repo is PUBLIC: the file holds only booleans and numbers (up/down, counts, GPU temperature and percentages),
 * never paths, user names, process names, ports or log lines.
 *
 * One script for every PC. Env (all optional):
 *   PC_STATUS_NAME   main | secondary | laptop | newpc   (default main)
 *   PC_LANES         lane ids this PC drives, e.g. "2,3,4,5,6" (port = 30000 + 10 * id)   default "" (none)
 *   PC_RUNNER_MATCH  regex on a process command line that means "the PC job runner is running"  default "pcq.*runner\.mjs|runner\.mjs"
 *   PC_HOME          working folder for the clone (default <script folder>/../status-push-clone)
 *   PC_BUILD_ALL     "1" on the Main PC only: also builds registry/pc-status/all.json from the four files each cycle
 *   PC_LOCAL_AGENT_DIR  optional, a local-agent tasks folder (inbox/running counts), Main PC only
 *   PC_COMFY_URL     optional, ComfyUI's address on this PC (Main PC: http://127.0.0.1:8188): adds "comfy" (B7296)
 *   PC_OCR_MATCH, PC_OCR_LOOP_MATCH, PC_OCR_OUT, PC_OCR_LOG   optional, the book OCR (Secondary PC): adds "ocr" (B7296)
 *   PC_LANES_JSON    optional, the path of this PC's tools/lanes/lanes.json: lets the daily tally count lane busy minutes
 *                    (a lane counts as busy while its lock.json is held by a live process)
 * Daily tally (B7755, desk items 2026-11-17-us2 and 2026-11-23-us2b): each cycle also adds its five minutes to
 * registry/pc-status/daily/<name>-<YYYY-MM-DD>.json (UTC day): runner up, each lane up and busy, GPU busy (load 50% or
 * more) and GPU held by the guard by class (art, ocr, local, other), ComfyUI renders finished, OCR working minutes.
 * Only counts and minutes. The Monday review reads seven of them; the gate jobs per lane come from the job issues.
 * B7296: this copy in tools/pcq is the one to deploy. Each PC runs it from <home>\gpu-tools\status-push.mjs (copy it
 * there; PC_HOME then defaults to <home>\status-push-clone). The laptop's PC watcher reads the comfy and ocr fields.
 * Push is never forced: fetch, write only our own file(s), commit, push; if rejected, fetch, rebase and retry (3 tries).
 * Files from other PCs are never touched except all.json, which only the Main PC writes.
 * First run creates the clone and, if the branch does not exist yet, an orphan `pc-status` branch.
 * Run detached, outside any helper's process tree (Win32_Process Create), e.g.
 *   PC_STATUS_NAME=secondary PC_LANES=8 node status-push.mjs
 *   PC_STATUS_NAME=newpc PC_LANES=10 node status-push.mjs   (the New PC)
 */
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NAME = process.env.PC_STATUS_NAME || "main";
const LANES = (process.env.PC_LANES || "").split(",").map(s => s.trim()).filter(Boolean).map(Number);
const RUNNER_RE = new RegExp(process.env.PC_RUNNER_MATCH || "runner\\.mjs", "i");
const DIR = process.env.PC_HOME || path.resolve(HERE, "../status-push-clone");
const BUILD_ALL = process.env.PC_BUILD_ALL === "1";
const LA_DIR = process.env.PC_LOCAL_AGENT_DIR || "";
const REMOTE = "https://github.com/thebadman7824/wodx.git";
const BRANCH = "pc-status";
const REL = "registry/pc-status";
const STALE_MIN = 15;
const STEP_MIN = 5;
const LANES_JSON = process.env.PC_LANES_JSON || "";

const sleep = ms => new Promise(r => setTimeout(r, ms));
const git = (...a) => spawnSync("git", a, {cwd: DIR, encoding: "utf8", windowsHide: true, timeout: 90000});

function procLines() {
  if ( process.platform === "win32" ) {
    const r = spawnSync("powershell", ["-NoProfile", "-Command", "Get-CimInstance Win32_Process | ForEach-Object { $_.CommandLine }"],
      {encoding: "utf8", timeout: 30000, windowsHide: true, maxBuffer: 20 * 1024 * 1024});
    return (r.stdout || "").split(/\r?\n/);
  }
  return (spawnSync("ps", ["-eo", "args"], {encoding: "utf8"}).stdout || "").split("\n");
}

function lanePort(port) {
  return new Promise(res => {
    const s = net.connect({host: "127.0.0.1", port, timeout: 2000});
    s.on("connect", () => { s.destroy(); res(true); });
    s.on("error", () => res(false));
    s.on("timeout", () => { s.destroy(); res(false); });
  });
}

function gpu() {
  const r = spawnSync("nvidia-smi", ["--query-gpu=temperature.gpu,utilization.gpu,memory.used,memory.total", "--format=csv,noheader,nounits"],
    {encoding: "utf8", timeout: 20000, windowsHide: true});
  if ( r.status !== 0 ) return null;
  const f = r.stdout.trim().split(/\r?\n/)[0].split(",").map(s => parseFloat(s));
  if ( f.some(n => !Number.isFinite(n)) ) return null;
  const vramPct = Math.round(100 * f[2] / f[3]);
  const warning = f[0] >= 83 || vramPct >= 97 ? "critical" : f[0] >= 80 || vramPct >= 90 ? "warn" : "ok";
  return {tempC: f[0], loadPct: f[1], vramPct, warning};
}

function guardBusy() {
  try {
    const dir = process.env.GPU_GUARD_DIR || path.resolve(HERE, "../gpu-guard");
    const l = JSON.parse(fs.readFileSync(path.join(dir, "lock.json"), "utf8"));
    let alive = true; try { process.kill(l.pid, 0); } catch (e) { alive = e.code === "EPERM"; }
    const w = fs.existsSync(path.join(dir, "waiters")) ? fs.readdirSync(path.join(dir, "waiters")).length : 0;
    return {jobHeld: alive, waiting: w, ...(alive && l.class ? {class: String(l.class).replace(/[^a-z]/gi, "").slice(0, 12)} : {})};
  } catch { return {jobHeld: false, waiting: 0}; }
}

function localAgents(procs) {
  if ( !LA_DIR ) return undefined;
  const n = d => { try { return fs.readdirSync(path.join(LA_DIR, d)).length; } catch { return null; } };
  return {runnerUp: procs.some(l => /la-runner/i.test(l)), queued: n("inbox"), running: n("running")};
}

/**
 * B7296: art renders. With PC_COMFY_URL (e.g. http://127.0.0.1:8188), reads ComfyUI's /queue and /history and gives
 * {up, running, pending, lastDoneMin}: how many prompts run and wait, and minutes since the last one finished.
 */
export function comfyFrom(queue, history, now = Date.now()) {
  const running = queue?.queue_running?.length ?? 0, pending = queue?.queue_pending?.length ?? 0;
  let last = null;
  for ( const h of Object.values(history ?? {}) )
    for ( const [kind, m] of h?.status?.messages ?? [] )
      if ( (kind === "execution_success" || kind === "execution_error") && Number.isFinite(m?.timestamp) ) last = Math.max(last ?? 0, m.timestamp);
  return {up: true, running, pending, lastDoneMin: last ? Math.round((now - last) / 60000) : null, doneLast5: doneSince(history, now - STEP_MIN * 60000)};
}
/** Prompts ComfyUI finished after a time (ms), for the daily tally. */
export function doneSince(history, since) {
  let k = 0;
  for ( const h of Object.values(history ?? {}) )
    if ( (h?.status?.messages ?? []).some(([kind, m]) => kind === "execution_success" && Number.isFinite(m?.timestamp) && m.timestamp > since) ) k++;
  return k;
}

/**
 * The lanes' state folders from lanes.json, as WoDX's lanes tools read them (tools/lanes/lib.mjs loadConfig): a PC
 * named in "hosts" sees only its own lanes, with its paths; %NAME% reads an environment variable. ids: this PC's lanes.
 * Returns {id: folder of lock.json}.
 */
export function laneStateDirs(cfg, ids, host, env = process.env) {
  const h = String(host ?? "").toLowerCase(), mine = cfg?.hosts?.[h];
  const lanes = (cfg?.lanes ?? []).filter(l => (mine ? l.host === h : !l.host) && ids.includes(Number(l.id)));
  const expand = v => typeof v === "string" ? v.replace(/%([A-Za-z_][A-Za-z0-9_]*)%/g, (m, n) => (env[n] ?? m).replace(/\\/g, "/")) : v;
  return Object.fromEntries(lanes.filter(l => l.dataPath).map(l => [Number(l.id), path.join(expand(l.dataPath), "wodx-lane")]));
}
/** Is a lane's lock held now? (a live process, not past its deadline) */
export function lockHeld(lock, now = Date.now(), alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; } }) {
  if ( !lock?.pid || !alive(lock.pid) ) return false;
  return !(lock.until && now > Date.parse(lock.until));
}
function laneBusy() {
  if ( !LANES_JSON ) return null;
  try {
    const dirs = laneStateDirs(JSON.parse(fs.readFileSync(LANES_JSON, "utf8")), LANES, process.env.WODX_HOST || os.hostname());
    return Object.fromEntries(Object.entries(dirs).map(([id, d]) => { let l = null; try { l = JSON.parse(fs.readFileSync(path.join(d, "lock.json"), "utf8")); } catch {} return [id, lockHeld(l)]; }));
  } catch { return null; }
}

/**
 * Adds one cycle's sample to the day's tally. tally: the day's file so far (or null); s: what collect() gave, with
 * laneBusy {id: bool} when known. Every count is minutes except comfyRenders and samples. Returns the new tally.
 */
export function addSample(tally, s, {step = STEP_MIN} = {}) {
  const day = String(s.time ?? new Date().toISOString()).slice(0, 10);
  const t = tally && tally.day === day ? structuredClone(tally) : {host: s.host, day, stepMin: step, samples: 0, runnerUpMin: 0, lanes: {}, gpu: {busyMin: 0, heldMin: {}}, comfyRenders: 0, ocrWorkingMin: 0};
  t.samples += 1;
  t.last = s.time;
  if ( s.runnerUp ) t.runnerUpMin += step;
  for ( const l of s.lanes ?? [] ) {
    const r = t.lanes[l.id] ??= {upMin: 0, busyMin: 0};
    if ( l.up ) r.upMin += step;
    if ( s.laneBusy?.[l.id] ) r.busyMin += step;
  }
  if ( s.laneBusy ) t.laneBusyKnown = true;
  if ( s.gpu ) {
    if ( s.gpu.loadPct >= 50 ) t.gpu.busyMin += step;
    if ( s.gpu.jobHeld ) { const c = s.gpu.class || "job"; t.gpu.heldMin[c] = (t.gpu.heldMin[c] ?? 0) + step; }
  }
  if ( s.comfy?.doneLast5 ) t.comfyRenders += s.comfy.doneLast5;
  if ( s.ocr && s.ocr.workers > 0 && !(s.ocr.lastOutputMin > 2 * step) ) t.ocrWorkingMin += step;
  return t;
}
async function comfy() {
  const base = process.env.PC_COMFY_URL;
  if ( !base ) return undefined;
  try {
    const get = async p => { const r = await fetch(base.replace(/\/$/, "") + p, {signal: AbortSignal.timeout(10000)}); if ( !r.ok ) throw new Error(String(r.status)); return r.json(); };
    return comfyFrom(await get("/queue"), await get("/history?max_items=20"));
  } catch { return {up: false, running: 0, pending: 0, lastDoneMin: null}; }
}

/**
 * B7296: book OCR. PC_OCR_MATCH (a regex on process command lines, default book_pipeline) counts the OCR workers;
 * PC_OCR_OUT (a folder) gives minutes since its newest file, looked for two levels down; PC_OCR_LOG (a log file) gives
 * whether its last lines say it waits for memory or gave up. Only counts, minutes and booleans leave the PC.
 */
// The newest line that names a state decides it. The log mixes UTF-16 lines (the GPU guard's redirected errors) with
// plain ones, so NULs are stripped first. Wordings seen on the Secondary PC, 18 November 2026: "waiting: 8.5 GB free
// commit, 10013 pages left", "batch cut short: 3.2 GB free commit", "gpu guard: waited 120 min for 7 GB free, gave
// up" then "batch N exit 3", "pause file present; stopping", "loop end".
const OCR_STATES = [
  ["gaveUp", /gave up|giving up|timed out|abort/i],
  ["stopped", /pause file present|stopping|loop end/i],
  ["memWait", /waiting:\s*[\d.]+\s*GB free|free commit|wait\w*[^\n]*(memory|ram)|(memory|ram)[^\n]*wait/i],
  ["running", /pages? (done|written)|batch \d+ (start|done|ok)|^\S+ (page|ocr) /i],
];
export function ocrLogState(lines) {
  const out = {memWait: false, gaveUp: false, stopped: false};
  const clean = lines.map(l => String(l).replace(/\0/g, "").trim()).filter(Boolean);
  for ( let i = clean.length - 1; i >= 0 && i >= clean.length - 20; i-- ) {
    if ( /^batch \d+ exit [1-9]|batch \S+ exit [1-9]/i.test(clean[i]) ) continue;  // follows a "gave up" line
    const hit = OCR_STATES.find(([, re]) => re.test(clean[i]));
    if ( hit ) { if ( hit[0] !== "running" ) out[hit[0]] = true; break; }
  }
  return out;
}
function newestMin(dir, depth = 2, now = Date.now()) {
  let best = 0, seen = 0;
  const walk = (d, left) => {
    let ents = []; try { ents = fs.readdirSync(d, {withFileTypes: true}); } catch { return; }
    for ( const e of ents ) {
      if ( ++seen > 20000 ) return;
      const p = path.join(d, e.name);
      if ( e.isDirectory() ) { if ( left > 0 ) walk(p, left - 1); }
      else try { best = Math.max(best, fs.statSync(p).mtimeMs); } catch {}
    }
  };
  walk(dir, depth);
  return best ? Math.round((now - best) / 60000) : null;
}
function ocr(procs) {
  if ( !process.env.PC_OCR_MATCH && !process.env.PC_OCR_LOOP_MATCH && !process.env.PC_OCR_OUT && !process.env.PC_OCR_LOG ) return undefined;
  const re = new RegExp(process.env.PC_OCR_MATCH || "book_pipeline", "i");
  const out = {workers: procs.filter(l => re.test(l) && !/status-push/.test(l)).length};
  // PC_OCR_LOOP_MATCH (Secondary PC: vl-loop): the loop that starts the workers batch by batch, so a dead loop and
  // a loop waiting between batches read differently.
  if ( process.env.PC_OCR_LOOP_MATCH ) { const lr = new RegExp(process.env.PC_OCR_LOOP_MATCH, "i"); out.loopUp = procs.some(l => lr.test(l) && !/status-push/.test(l)); }
  if ( process.env.PC_OCR_OUT ) out.lastOutputMin = newestMin(process.env.PC_OCR_OUT);
  if ( process.env.PC_OCR_LOG ) {
    try { const t = fs.readFileSync(process.env.PC_OCR_LOG, "utf8"); Object.assign(out, ocrLogState(t.slice(-8000).split(/\r?\n/))); }
    catch { out.memWait = null; out.gaveUp = null; out.stopped = null; }
  }
  return out;
}

async function collect() {
  const procs = procLines();
  const lanes = await Promise.all(LANES.map(async id => ({id, up: await lanePort(30000 + 10 * id)})));
  const g = gpu();
  const out = {host: NAME, time: new Date().toISOString(), runnerUp: procs.some(l => RUNNER_RE.test(l) && !/status-push/.test(l)),
    lanes, gpu: g ? {...g, ...guardBusy()} : null};
  const la = localAgents(procs); if ( la ) out.localAgents = la;
  const c = await comfy(); if ( c ) out.comfy = c;
  const o = ocr(procs); if ( o ) out.ocr = o;
  const lb = laneBusy(); if ( lb ) out.laneBusy = lb;
  const issues = [];
  if ( !out.runnerUp ) issues.push("runner down");
  if ( lanes.some(l => !l.up) ) issues.push("lane down");
  if ( g && g.warning !== "ok" ) issues.push("gpu " + g.warning);
  out.issues = issues.length;
  return out;
}

function init() {
  fs.mkdirSync(DIR, {recursive: true});
  if ( !fs.existsSync(path.join(DIR, ".git")) ) {
    git("init", "-q"); git("remote", "add", "origin", REMOTE);
    git("config", "user.name", "wodx-pc-status"); git("config", "user.email", "noreply@example.invalid");
  }
}

/** Bring the clone to origin/pc-status, or an orphan branch when it does not exist yet. */
function sync() {
  const f = git("fetch", "-q", "origin", BRANCH);
  if ( f.status === 0 ) { git("checkout", "-q", "-B", BRANCH, `origin/${BRANCH}`); git("reset", "-q", "--hard", `origin/${BRANCH}`); }
  else if ( git("rev-parse", "--verify", "-q", BRANCH).status !== 0 ) git("checkout", "-q", "--orphan", BRANCH);
}

function write(rel, obj) {
  const f = path.join(DIR, rel);
  fs.mkdirSync(path.dirname(f), {recursive: true});
  fs.writeFileSync(f, JSON.stringify(obj, null, 1) + "\n");
}

function buildAll() {
  const now = Date.now(), all = {time: new Date().toISOString(), staleAfterMin: STALE_MIN, pcs: {}};
  for ( const n of ["main", "secondary", "laptop", "newpc"] ) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(DIR, REL, `${n}.json`), "utf8"));
      const age = Math.round((now - Date.parse(j.time)) / 60000);
      all.pcs[n] = {ageMin: age, stale: !(age <= STALE_MIN), ...j};
    } catch { all.pcs[n] = {stale: true, ageMin: null, missing: true}; }
  }
  all.anyStale = Object.values(all.pcs).some(p => p.stale);
  all.issues = Object.values(all.pcs).reduce((s, p) => s + (p.issues || 0), 0);
  return all;
}

async function cycle() {
  const mine = await collect();
  for ( let attempt = 0; attempt < 3; attempt++ ) {
    sync();
    write(`${REL}/${NAME}.json`, mine);
    // The daily tally (us2b): read back from the branch after sync, so a restart or another clone loses nothing
    const dayRel = `${REL}/daily/${NAME}-${mine.time.slice(0, 10)}.json`;
    let before = null; try { before = JSON.parse(fs.readFileSync(path.join(DIR, dayRel), "utf8")); } catch {}
    if ( !before || before.last !== mine.time ) write(dayRel, addSample(before, mine));
    if ( BUILD_ALL ) write(`${REL}/all.json`, buildAll());
    git("add", "-A");
    const c = git("commit", "-q", "-m", `pc status ${NAME}`);
    if ( c.status !== 0 && /nothing to commit/.test(c.stdout + c.stderr) ) return;
    const p = git("push", "-q", "origin", BRANCH);
    if ( p.status === 0 ) return;
    await sleep(2000 + Math.random() * 3000);
  }
  console.error(new Date().toISOString(), "push failed 3 times");
}

// Run only when started as a script, so the harness can import comfyFrom and ocrLogState.
if ( path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url) ) {
  if ( process.argv.includes("--collect") ) { console.log(JSON.stringify(await collect(), null, 1)); process.exit(0); }
  init();
  if ( process.argv.includes("--once") ) { await cycle(); process.exit(0); }
  for ( ;; ) { try { await cycle(); } catch (e) { console.error(String(e).slice(0, 200)); } await sleep(300000); }
}
