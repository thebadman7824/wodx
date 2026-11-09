#!/usr/bin/env node
/**
 * The Encyclopaedia Tenebrarum's gate checks (WoDX Library 0.3.0).
 *   node tools/encyclopedia-check.mjs                 the format: tiers, sources, pages, links, no 5th edition
 *   node tools/encyclopedia-check.mjs --text <dir>    also the overlap check: no run of 8 words shared with any
 *                                                     .txt file under <dir> (the OCR texts, on the PC)
 *   --sample <n>                                      print n entries per line with their references, for the
 *                                                     page-reference spot check
 * Exits 1 on any problem.
 */
import {readFileSync, readdirSync, statSync, existsSync} from "node:fs";
import {join, dirname} from "node:path";
import {fileURLToPath} from "node:url";
import * as E from "../modules/wodx-library/scripts/ency-rules.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "modules/wodx-library/data/encyclopedia");
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const idx = JSON.parse(readFileSync(join(dir, "index.json"), "utf8"));
const entries = idx.files.flatMap(f => { const d = JSON.parse(readFileSync(join(dir, f), "utf8")); return Array.isArray(d) ? d : d.entries ?? []; });
const problems = E.checkAll(entries, idx.books);
for ( const f of readdirSync(dir) ) if ( f.endsWith(".json") && f !== "index.json" && !idx.files.includes(f) ) problems.push(`${f} is not listed in index.json`);

const textDir = arg("--text");
if ( textDir ) {
  if ( !existsSync(textDir) ) problems.push(`no such folder: ${textDir}`);
  else {
    const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : f.toLowerCase().endsWith(".txt") ? [p] : []; });
    const files = walk(textDir);
    const src = new Set();
    for ( const f of files ) for ( const s of E.shingles(readFileSync(f, "utf8")) ) src.add(s);
    let hits = 0;
    for ( const e of entries ) { const o = E.overlap(E.entryText(e), src); if ( o.length ) { hits++; problems.push(`${e.id}: shares words with a book: "${o[0]}"`); } }
    console.log(`Overlap: ${entries.length} entries against ${files.length} texts, ${hits} with copied runs.`);
  }
}
const n = Number(arg("--sample")) || 0;
if ( n ) {
  const byLine = {};
  for ( const e of entries ) for ( const l of e.lines ) (byLine[l] ??= []).push(e);
  for ( const [l, list] of Object.entries(byLine) ) {
    console.log(`\n${l}:`);
    for ( const e of list.filter((_, i) => i % Math.max(1, Math.floor(list.length / n)) === 0).slice(0, n) )
      for ( const c of e.claims ) console.log(`  ${e.id}: ${c.text}  [${c.refs.map(r => `${r.book} p. ${r.page}${r.pdf ? ` (pdf ${r.pdf})` : ""}`).join("; ")}]`);
  }
}
console.log(`${entries.length} entries from ${idx.books.length} books; ${problems.length} problem(s).`);
for ( const p of problems ) console.log(`  ${p}`);
process.exit(problems.length ? 1 : 0);
