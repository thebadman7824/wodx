/**
 * Fetch the Kokoro engine for WoDX Voices into a folder (normally Foundry's Data\wodx-voices-engine):
 *   node tools/voices/fetch-engine.mjs <folder> [--fp32]
 * Downloads, once: the kokoro-js 1.2.1 web build and the ONNX runtime wasm it needs (from the npm registry), the
 * Kokoro-82M ONNX model (quantized; --fp32 adds the full model for WebGPU) and the English voice tables (Hugging
 * Face). Writes manifest.json with each file's size and MD5, and NOTICE.txt with the licences. Run it again to
 * check: files already there with the right size are kept. Needs Node 18 or later. Nothing here is committed.
 */
import {mkdir, writeFile, readFile, stat} from "node:fs/promises";
import {createHash} from "node:crypto";
import {gunzipSync} from "node:zlib";
import {join, dirname} from "node:path";
import {KOKORO_VOICES, KOKORO_REMOTE} from "../../modules/wodx-voices/scripts/voice-rules.mjs";

const out = process.argv[2];
const fp32 = process.argv.includes("--fp32");
if ( !out ) { console.error("Usage: node tools/voices/fetch-engine.mjs <folder> [--fp32]"); process.exit(1); }
const KJS = "1.2.1", HFT = "3.5.1";
const NPM = [
  ["kokoro.web.js", `https://registry.npmjs.org/kokoro-js/-/kokoro-js-${KJS}.tgz`, "package/dist/kokoro.web.js"],
  ["ort/ort-wasm-simd-threaded.jsep.mjs", `https://registry.npmjs.org/@huggingface/transformers/-/transformers-${HFT}.tgz`, "package/dist/ort-wasm-simd-threaded.jsep.mjs"],
  ["ort/ort-wasm-simd-threaded.jsep.wasm", `https://registry.npmjs.org/@huggingface/transformers/-/transformers-${HFT}.tgz`, "package/dist/ort-wasm-simd-threaded.jsep.wasm"]
];
const files = [
  ...["config.json", "tokenizer.json", "tokenizer_config.json", "onnx/model_quantized.onnx", ...(fp32 ? ["onnx/model.onnx"] : [])].map(f => [`hf/${f}`, KOKORO_REMOTE + f]),
  ...KOKORO_VOICES.map(v => [`hf/voices/${v}.bin`, `${KOKORO_REMOTE}voices/${v}.bin`])
];
const optional = ["generation_config.json", "preprocessor_config.json", "special_tokens_map.json"].map(f => [`hf/${f}`, KOKORO_REMOTE + f]);

const md5 = b => createHash("md5").update(b).digest("hex");
const manifest = {kokoroJs: KJS, transformers: HFT, fp32, made: new Date().toISOString(), files: []};
async function save(rel, buf) {
  const dest = join(out, rel);
  await mkdir(dirname(dest), {recursive: true});
  manifest.files.push({path: rel, bytes: buf.length, md5: md5(buf)});
  try { const s = await stat(dest); if ( s.size === buf.length && md5(await readFile(dest)) === md5(buf) ) { console.log(`kept ${rel}`); return; } } catch (e) { /* new */ }
  await writeFile(dest, buf);
  console.log(`got  ${rel} ${(buf.length / 1048576).toFixed(1)} MB`);
}
async function get([rel, url], must) {
  const r = await fetch(url);
  if ( !r.ok ) { if ( must ) throw new Error(`${r.status} for ${url}`); console.log(`skip ${rel} (${r.status})`); return; }
  await save(rel, Buffer.from(await r.arrayBuffer()));
}
/** One file out of a .tgz from the npm registry (plain ustar, as npm packs them). */
export function untar(tgz, want) {
  const t = gunzipSync(tgz);
  for ( let o = 0; o + 512 <= t.length; ) {
    const h = t.subarray(o, o + 512);
    if ( h.every(b => b === 0) ) break;
    const str = (a, b) => h.subarray(a, b).toString("utf8").replace(/\0.*$/s, "");
    const name = [str(345, 500), str(0, 100)].filter(Boolean).join("/");
    const size = parseInt(str(124, 136).trim() || "0", 8);
    if ( name === want ) return Buffer.from(t.subarray(o + 512, o + 512 + size));
    o += 512 + Math.ceil(size / 512) * 512;
  }
  throw new Error(`${want} not in the package`);
}
const tgz = new Map();
for ( const [rel, url, inner] of NPM ) {
  if ( !tgz.has(url) ) { const r = await fetch(url); if ( !r.ok ) throw new Error(`${r.status} for ${url}`); tgz.set(url, Buffer.from(await r.arrayBuffer())); }
  await save(rel, untar(tgz.get(url), inner));
}
for ( const f of files ) await get(f, true);
for ( const f of optional ) await get(f, false);
await writeFile(join(out, "manifest.json"), JSON.stringify(manifest, null, 1));
await writeFile(join(out, "NOTICE.txt"), [
  "Kokoro engine for WoDX Voices (private use only).",
  "Kokoro-82M model and voices: Apache License 2.0 (hexgrad).",
  `kokoro-js ${KJS}: Apache License 2.0. It bundles @huggingface/transformers (Apache 2.0), onnxruntime-web (MIT) and`,
  "phonemizer, which is espeak-ng compiled to WebAssembly (GPL 3.0 or later).",
  ""
].join("\n"));
console.log(`done: ${manifest.files.length} files, ${(manifest.files.reduce((s, f) => s + f.bytes, 0) / 1048576).toFixed(0)} MB in ${out}`);
