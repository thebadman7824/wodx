/**
 * WoDX Voices: the Kokoro engine, in the Storyteller's browser only.
 *
 * The engine folder in Foundry's Data (made by tools/voices/fetch-engine.mjs) holds the kokoro-js web build, the ONNX
 * runtime's wasm files, the model and the voice tables. The library asks for its files at their online home; a
 * narrow fetch shim answers those requests (and only those) from the engine folder, so nothing leaves the machine.
 * Blended voices are made here and answered from memory under a name of their own.
 */
import * as V from "./voice-rules.mjs";

let tts = null;
let base = "";
let shim = false;
let loading = null;
let queue = Promise.resolve();
const blends = new Map();
export const status = {state: "off", error: null, device: null, dtype: null, renders: 0, ms: 0};

function installShim() {
  if ( shim ) return;
  shim = true;
  const real = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input?.url;
    const m = base ? V.engineUrl(url, base) : null;
    if ( !m ) return real(input, init);
    if ( m.blend ) {
      const t = blends.get(m.blend);
      return t ? new Response(t.slice().buffer, {status: 200, headers: {"Content-Type": "application/octet-stream"}}) : new Response(null, {status: 404});
    }
    return real(m.path, init);
  };
}

/** Load the engine from a Data folder. Resolves to the status; never throws. */
export function load({dir = "wodx-voices-engine", device = "wasm", route = p => `/${p}`} = {}) {
  if ( status.state === "ready" ) return Promise.resolve(status);
  if ( loading ) return loading;
  loading = (async () => {
    status.state = "loading"; status.error = null;
    try {
      base = route(dir).replace(/\/+$/, "");
      const res = await fetch(`${base}/manifest.json`, {cache: "no-store"});
      if ( !res.ok ) throw new Error(`no engine in Data/${dir} (run tools/voices/fetch-engine.mjs)`);
      const manifest = await res.json();
      const lib = await import(`${base}/kokoro.web.js`);
      lib.env.wasmPaths = `${base}/ort/`;
      installShim();
      const gpu = device === "webgpu" && !!globalThis.navigator?.gpu;
      const dtype = gpu && manifest.fp32 ? "fp32" : "q8";
      tts = await lib.KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {dtype, device: gpu ? "webgpu" : "wasm"});
      const check = tts._validate_voice.bind(tts);
      tts._validate_voice = v => (/^[ab]_wodx_/.test(v) ? v[0] : check(v));
      Object.assign(status, {state: "ready", device: gpu ? "webgpu" : "wasm", dtype});
    } catch (e) {
      Object.assign(status, {state: "failed", error: e?.message ?? String(e)});
      tts = null;
    }
    loading = null;
    return status;
  })();
  return loading;
}

async function table(name) {
  const r = await fetch(`${V.KOKORO_REMOTE}voices/${name}.bin`);
  if ( !r.ok ) throw new Error(`voice ${name} missing`);
  return new Float32Array(await r.arrayBuffer());
}

async function ensureVoice(spec) {
  if ( spec.parts.length === 1 || blends.has(spec.id) ) return;
  const tables = await Promise.all(spec.parts.map(([v]) => table(v)));
  blends.set(spec.id, V.blendTables(tables, spec.parts.map(([, w]) => w)));
}

/** Render a line in a voice spec. Resolves to a WAV Blob. One line at a time. */
export function render(text, spec, speed = 1) {
  const job = queue.then(async () => {
    if ( status.state !== "ready" || !tts ) throw new Error(`engine ${status.state}`);
    const t0 = performance.now();
    await ensureVoice(spec);
    const audio = await tts.generate(String(text).slice(0, 1200), {voice: spec.id, speed});
    status.renders += 1; status.ms = Math.round(performance.now() - t0);
    return audio.toBlob();
  });
  queue = job.catch(() => null);
  return job;
}
