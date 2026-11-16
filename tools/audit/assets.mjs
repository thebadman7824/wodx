#!/usr/bin/env node
/**
 * Asset check for an audit (B6903): every image, sound and font git tracks must be a real file of its kind and be
 * named by some code, template, style or data file. Writes one item per asset to <out dir>/items.jsonl.
 *   node tools/audit/assets.mjs <out dir>
 * verdict: working (well formed and named literally), unreferenced (well formed, named nowhere literally: check by
 * hand, a name can be built at run time), broken (empty or not the kind its extension says).
 */
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {ROOT} from "./coverage.mjs";

export const ASSET = /\.(png|jpe?g|webp|gif|svg|ogg|mp3|wav|webm|m4a|woff2?|ttf|otf)$/i;
const TEXT = /\.(m?js|json|hbs|html|css)$/i;
const MAGIC = {png: [0x89, 0x50, 0x4e, 0x47], jpg: [0xff, 0xd8], jpeg: [0xff, 0xd8], gif: [0x47, 0x49, 0x46], ogg: [0x4f, 0x67, 0x67, 0x53],
  webp: [0x52, 0x49, 0x46, 0x46], woff2: [0x77, 0x4f, 0x46, 0x32], woff: [0x77, 0x4f, 0x46, 0x46], wav: [0x52, 0x49, 0x46, 0x46], webm: [0x1a, 0x45, 0xdf, 0xa3]};
/** Is this buffer the kind its extension says? */
export function wellFormed(ext, buf) {
  if ( !buf.length ) return false;
  ext = ext.toLowerCase();
  if ( ext === "svg" ) return /<svg[\s>]/i.test(buf.subarray(0, 4096).toString("utf8"));
  if ( ext === "ttf" || ext === "otf" ) { const t = buf.readUInt32BE(0); return t === 0x00010000 || t === 0x4f54544f || t === 0x74727565; }
  const m = MAGIC[ext];
  return m ? m.every((b, i) => buf[i] === b) : true;
}
/** Is the asset named in the text, by its repo path from any folder down or by its file name? */
export function named(file, corpus) {
  const parts = file.split("/");
  for ( let i = 0; i < parts.length; i++ ) if ( corpus.includes(parts.slice(i).join("/")) && (i < parts.length - 1 || parts[i].length > 6) ) return parts.slice(i).join("/");
  // a name built at run time ("${folder}/${name}.png"): the file's stem, quoted, in the code or data
  const stem = parts.at(-1).replace(/\.[^.]+$/, "").replace(/-(still|sheet|token)$/, "");
  if ( stem.length > 3 && new RegExp(`["'\`/]${stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'\`.]`).test(corpus) ) return `stem ${stem}`;
  return null;
}

if ( process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname ) {
  const out = process.argv[2];
  if ( !out ) { console.error("Usage: node tools/audit/assets.mjs <out dir>"); process.exit(2); }
  const files = execFileSync("git", ["ls-files"], {cwd: ROOT, encoding: "utf8"}).split("\n").filter(Boolean);
  const corpus = files.filter(f => TEXT.test(f) && !f.startsWith("tools/harness/") && !ASSET.test(f)).map(f => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n");
  fs.mkdirSync(out, {recursive: true});
  const rows = files.filter(f => ASSET.test(f)).map(f => {
    const ext = f.split(".").pop(), ok = wellFormed(ext, fs.readFileSync(path.join(ROOT, f))), by = named(f, corpus);
    return {file: f, kind: "asset", verdict: !ok ? "broken" : by ? "working" : "unreferenced", how: "run:tools/audit/assets.mjs", evidence: !ok ? "empty or not the kind its extension says" : by ? `named as ${by}` : "named by no code, template, style or data file"};
  });
  fs.writeFileSync(path.join(out, "items.jsonl"), rows.map(r => JSON.stringify(r)).join("\n") + "\n");
  const c = rows.reduce((o, r) => (o[r.verdict] = (o[r.verdict] ?? 0) + 1, o), {});
  console.log(`${rows.length} assets:`, c);
}
