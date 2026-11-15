/**
 * Graphics card heat watch (B6520). The runner reads nvidia-smi once a minute, writes one line to logs/gpu-YYYY-MM-DD.csv,
 * and raises a pc-alert issue when the core stays hot (or the memory, where the card reports it). The alert clears
 * after the card has been back under the clear line for 10 minutes.
 */
import {spawnSync} from "node:child_process";

export const GPU_LIMITS = {core: 83, memory: 100, hotMinutes: 5, clearCore: 78, clearMemory: 95, coolMinutes: 10};
export const QUERY = "timestamp,temperature.gpu,temperature.memory,power.draw,fan.speed,utilization.gpu,memory.used";

/** One nvidia-smi csv line into numbers; a field the card does not report ("N/A") is null. */
export function parseLine(line) {
  const f = String(line).split(",").map(s => s.trim());
  if ( f.length < 7 ) return null;
  const n = s => { const v = parseFloat(s); return Number.isFinite(v) ? v : null; };
  const core = n(f[1]);
  if ( core === null ) return null;
  return {time: f[0], core, memory: n(f[2]), watts: n(f[3]), fan: n(f[4]), util: n(f[5]), vramMiB: n(f[6])};
}

export function read() {
  const r = spawnSync("nvidia-smi", [`--query-gpu=${QUERY}`, "--format=csv,noheader,nounits"], {encoding: "utf8", timeout: 20000, windowsHide: true});
  if ( r.status !== 0 ) return null;
  return {raw: r.stdout.trim().split(/\r?\n/)[0], reading: parseLine(r.stdout.trim().split(/\r?\n/)[0])};
}

/** Feed readings in; returns "hot" once the limit has held hotMinutes, "cool" once back under the clear line coolMinutes, else null. */
export function watcher(limits = GPU_LIMITS) {
  let hotSince = null, coolSince = null, hot = false;
  return (r, now = Date.now()) => {
    if ( !r ) return null;
    const over = r.core > limits.core || (r.memory !== null && r.memory > limits.memory);
    const under = r.core < limits.clearCore && (r.memory === null || r.memory < limits.clearMemory);
    if ( over ) { hotSince ??= now; coolSince = null; } else hotSince = null;
    if ( under ) coolSince ??= now; else if ( !over ) coolSince = null;
    if ( !hot && hotSince !== null && now - hotSince >= limits.hotMinutes * 60000 ) { hot = true; return "hot"; }
    if ( hot && coolSince !== null && now - coolSince >= limits.coolMinutes * 60000 ) { hot = false; return "cool"; }
    return null;
  };
}
