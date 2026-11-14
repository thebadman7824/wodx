/**
 * WoDX Voices: the Chatterbox voice server, in the Storyteller's browser only.
 *
 * The server (tools/voices/chatterbox_server.py) runs on the Storyteller's own PC and uses its graphics card. It holds
 * a set of human reference voices and copies the chosen one for each line, with the emotion and pace asked for. This
 * client only asks it for a line and gets a WAV back; the module then caches that file and plays it to whoever sees
 * the line, as with Kokoro. The address and key are this browser's own settings, never shared with players.
 */
import * as V from "./voice-rules.mjs";

export const status = {state: "off", error: null, voices: [], device: null, renders: 0, ms: 0};
let queue = Promise.resolve();

async function call(base, key, path, init = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), init.timeout ?? 60000);
  try {
    const r = await fetch(`${base}${path}`, {...init, signal: ctl.signal,
      headers: {...(init.headers ?? {}), "X-WoDX-Key": String(key ?? "")}});
    if ( !r.ok ) throw new Error(`voice server ${path}: ${r.status}`);
    return r;
  } finally { clearTimeout(timer); }
}

/** Reach the server and read its voices. Returns the status. */
export async function load({url, key} = {}) {
  const base = V.serverBase(url);
  if ( !base ) { Object.assign(status, {state: "off", error: "no server address"}); return status; }
  status.state = "loading";
  try {
    const h = await (await call(base, key, "/health", {timeout: 5000})).json();
    const v = await (await call(base, key, "/voices", {timeout: 5000})).json();
    Object.assign(status, {state: "ready", error: null, voices: Array.isArray(v?.voices) ? v.voices : [], device: h?.device ?? null, base, key});
  } catch (e) {
    Object.assign(status, {state: "error", error: String(e?.message ?? e), voices: []});
  }
  return status;
}

/** Render one line: {voice, exaggeration, cfg, temperature}. Lines go one at a time, as the server does. Returns a WAV Blob. */
export function render(text, voice, d = {}, seed = 0) {
  const job = queue.then(async () => {
    if ( status.state !== "ready" ) throw new Error(status.error ?? "voice server not ready");
    const t0 = performance.now();
    const r = await call(status.base, status.key, "/render", {method: "POST", headers: {"Content-Type": "application/json"},
      body: JSON.stringify({text, voice, exaggeration: d.exaggeration, cfg: d.cfg, temperature: d.temperature, seed: Number(seed) % 2147483647})});
    const blob = await r.blob();
    status.renders += 1; status.ms = Math.round(performance.now() - t0);
    return blob;
  });
  queue = job.catch(() => null);
  return job;
}
