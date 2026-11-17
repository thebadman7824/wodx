/**
 * GPU guard (Ben, 2026-11-17). One GPU job at a time, a free-VRAM check before launch, art first.
 *
 *   node gpuguard.mjs run --class art|local|other [--need-gb 8] [--label name] [--max-wait-min 240] -- <command> [args]
 *   node gpuguard.mjs state          one JSON line: card reading, holder, waiters, warning level
 *
 * Classes: art (ComfyUI) goes before local (OpenHands, Devstral, Qwen) goes before other. A job that does not fit
 * in the free VRAM waits; it is never started. Art also asks Ollama to unload its models before it takes the card.
 * Files live in GPU_GUARD_DIR (default: <script folder>/../../../gpu-guard, i.e. D:\WoDX\pcq\gpu-guard):
 *   lock.json            the holder {pid, class, label, needGb, since}
 *   waiters/<id>.json    one file per waiting job {pid, class, label, needGb, since}
 * A lock or waiter whose pid is gone is ignored and cleaned up, so a crash never blocks the card.
 * The same file layout and state JSON are used on every PC, so the status page reads them the same way.
 * Warning levels in state: ok, warn (core >= 80 C or VRAM >= 90%), critical (core >= 83 C or VRAM >= 97%).
 */
import {spawn, spawnSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DIR = process.env.GPU_GUARD_DIR || path.resolve(HERE, "../../../gpu-guard");
const LOCK = path.join(DIR, "lock.json");
const WAIT = path.join(DIR, "waiters");
export const RANK = {art: 0, local: 1, other: 2};
export const LIMITS = {warnCore: 80, critCore: 83, warnVramPct: 90, critVramPct: 97, headroomGb: 0.5};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; } };
const readJson = f => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };

/** Card reading from nvidia-smi: {name, usedMiB, totalMiB, freeMiB, core, util, watts} or null. */
export function card() {
  const r = spawnSync("nvidia-smi", ["--query-gpu=name,memory.used,memory.total,memory.free,temperature.gpu,utilization.gpu,power.draw",
    "--format=csv,noheader,nounits"], {encoding: "utf8", timeout: 20000, windowsHide: true});
  if ( r.status !== 0 ) return null;
  const f = r.stdout.trim().split(/\r?\n/)[0].split(",").map(s => s.trim());
  const n = s => { const v = parseFloat(s); return Number.isFinite(v) ? v : null; };
  return {name: f[0], usedMiB: n(f[1]), totalMiB: n(f[2]), freeMiB: n(f[3]), core: n(f[4]), util: n(f[5]), watts: n(f[6])};
}

export function warning(c) {
  if ( !c ) return "unknown";
  const pct = c.totalMiB ? 100 * c.usedMiB / c.totalMiB : 0;
  if ( c.core >= LIMITS.critCore || pct >= LIMITS.critVramPct ) return "critical";
  if ( c.core >= LIMITS.warnCore || pct >= LIMITS.warnVramPct ) return "warn";
  return "ok";
}

function holder() {
  const l = readJson(LOCK);
  if ( l && !alive(l.pid) ) { try { fs.unlinkSync(LOCK); } catch {} return null; }
  return l;
}
function waiters() {
  fs.mkdirSync(WAIT, {recursive: true});
  const out = [];
  for ( const f of fs.readdirSync(WAIT) ) {
    const p = path.join(WAIT, f), w = readJson(p);
    if ( !w || !alive(w.pid) ) { try { fs.unlinkSync(p); } catch {} continue; }
    out.push({...w, id: f});
  }
  return out.sort((a, b) => RANK[a.class] - RANK[b.class] || a.since.localeCompare(b.since));
}

export function state() {
  fs.mkdirSync(DIR, {recursive: true});
  const c = card();
  return {time: new Date().toISOString(), card: c, warning: warning(c), holder: holder(), waiters: waiters(), limits: LIMITS};
}

/** Take the lock atomically (exclusive create). */
function tryLock(info) {
  try { fs.writeFileSync(LOCK, JSON.stringify(info), {flag: "wx"}); return true; } catch { return false; }
}

function ollamaUnload() {
  const ps = spawnSync("ollama", ["ps"], {encoding: "utf8", timeout: 15000, windowsHide: true});
  if ( ps.status !== 0 ) return;
  for ( const line of ps.stdout.split(/\r?\n/).slice(1) ) {
    const name = line.trim().split(/\s+/)[0];
    if ( name ) spawnSync("ollama", ["stop", name], {timeout: 30000, windowsHide: true});
  }
}

export async function acquire({cls, needGb, label, maxWaitMin = 240}) {
  fs.mkdirSync(WAIT, {recursive: true});
  const me = {pid: process.pid, class: cls, label, needGb, since: new Date().toISOString()};
  const wfile = path.join(WAIT, `${cls}-${process.pid}.json`);
  fs.writeFileSync(wfile, JSON.stringify(me));
  const deadline = Date.now() + maxWaitMin * 60000;
  let unloaded = false;
  try {
    while ( Date.now() < deadline ) {
      const h = holder();
      const ws = waiters();
      const first = ws[0];
      const myTurn = first && first.pid === process.pid;
      if ( !h && myTurn ) {
        if ( cls === "art" && !unloaded ) { ollamaUnload(); unloaded = true; await sleep(3000); }
        const c = card();
        const freeGb = c ? c.freeMiB / 1024 : 0;
        if ( c && freeGb >= needGb + LIMITS.headroomGb && warning(c) !== "critical" && tryLock(me) ) return me;
      }
      await sleep(15000);
    }
    throw new Error(`gpu guard: waited ${maxWaitMin} min for ${needGb} GB free, gave up`);
  } finally { try { fs.unlinkSync(wfile); } catch {} }
}

export function release() { const l = readJson(LOCK); if ( l && l.pid === process.pid ) try { fs.unlinkSync(LOCK); } catch {} }

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if ( cmd === "state" ) { console.log(JSON.stringify(state())); return; }
  if ( cmd !== "run" ) { console.error("usage: gpuguard.mjs run --class art|local|other [--need-gb N] [--label x] -- cmd args | state"); process.exit(2); }
  const dd = rest.indexOf("--");
  const opts = rest.slice(0, dd < 0 ? rest.length : dd), child = dd < 0 ? [] : rest.slice(dd + 1);
  const get = (k, d) => { const i = opts.indexOf(k); return i >= 0 ? opts[i + 1] : d; };
  const cls = get("--class", "other");
  if ( !(cls in RANK) || !child.length ) { console.error("need --class art|local|other and a command after --"); process.exit(2); }
  const needGb = Number(get("--need-gb", cls === "art" ? 8 : 4));
  const label = get("--label", child[0]);
  console.log(`gpu guard: waiting for the card (${cls}, ${needGb} GB, ${label})`);
  let lock; try { lock = await acquire({cls, needGb, label, maxWaitMin: Number(get("--max-wait-min", 240))}); } catch (e) { console.error(e.message); process.exit(3); }
  console.log(`gpu guard: got the card at ${new Date().toISOString()}`);
  const p = spawn(child[0], child.slice(1), {stdio: "inherit", shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(child[0])});
  // Hand the lock to the child's pid so it dies with the job, not with this wrapper being killed first.
  fs.writeFileSync(LOCK, JSON.stringify({...lock, pid: process.pid, childPid: p.pid}));
  p.on("exit", code => { release(); process.exit(code ?? 1); });
  p.on("error", e => { console.error(e.message); release(); process.exit(1); });
  for ( const s of ["SIGINT", "SIGTERM"] ) process.on(s, () => { try { p.kill(); } catch {} release(); process.exit(1); });
}
if ( process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ) main();
