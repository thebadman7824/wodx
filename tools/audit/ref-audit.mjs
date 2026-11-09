#!/usr/bin/env node
/**
 * Page-reference audit: does the book's text on the cited page back up what WoDX says it says?
 *
 *   node tools/audit/ref-audit.mjs --list                 refs found per book, and which books have no offset
 *   node tools/audit/ref-audit.mjs --text <dir> --map <books.json> [--out <file.md>] [--min 0.34]
 *
 * books.json maps a book id to its OCR text and, where the Encyclopaedia doesn't already give it, the offset
 * (pdf page minus printed page): {"v20": {"file": "v20/v20.txt"}, "cb": {"file": "cb.txt", "offset": 2}}.
 * Paths are relative to --text. Pages are split on form feeds, or on "page N" marker lines.
 *
 * Every Encyclopaedia claim is checked, and every "p. N" in module code, data and docs. A ref scores the share
 * of its keywords found on the cited page (one page either side). Bare refs are tried as printed and as pdf
 * pages, and the better reading is reported, so the report also says how to pin each one.
 * The report lists refs under --min (default 0.34) first: those are the ones to read by hand.
 * Exit code is 0; this is a reading list, not a gate.
 */
import {readFileSync, writeFileSync, readdirSync, statSync, existsSync} from "node:fs";
import {join, dirname, relative} from "node:path";
import {fileURLToPath} from "node:url";
import * as R from "./ref-rules.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const ency = join(root, "modules/wodx-library/data/encyclopedia");
const idx = JSON.parse(readFileSync(join(ency, "index.json"), "utf8"));

// 1. Encyclopaedia claims
const refs = [];
for ( const f of idx.files ) {
  const data = JSON.parse(readFileSync(join(ency, f), "utf8"));
  for ( const e of Array.isArray(data) ? data : data.entries ?? [] ) {
    const add = (c, part) => { for ( const r of c.refs ?? [] ) refs.push({book: r.book, page: r.page, to: r.page, pdf: r.pdf ?? null, kind: "printed",
      text: c.text, title: e.title, kind: e.kind, where: `ency ${e.id} (${part})`, file: `modules/wodx-library/data/encyclopedia/${f}`}); };
    for ( const c of e.claims ?? [] ) { add(c, "claim"); for ( const v of c.versions ?? [] ) add(v, "version"); }
    for ( const ed of e.editions ?? [] ) add(ed, `edition ${ed.edition}`);
  }
}
const offsets = R.offsetsFrom(refs);

// 2. Page refs in code, data and docs
const walk = d => readdirSync(d).flatMap(f => {
  const p = join(d, f);
  if ( f === "node_modules" || f === "encyclopedia" || f.startsWith(".") ) return [];
  return statSync(p).isDirectory() ? walk(p) : /\.(m?js|json|md|hbs)$/.test(f) ? [p] : [];
});
const unresolved = [];
for ( const p of [...walk(join(root, "modules")), ...walk(join(root, "docs"))] ) {
  const lines = readFileSync(p, "utf8").split("\n");
  let carry = null;
  lines.forEach((line, i) => {
    if ( !line.trim() || /^\s*(\/\*\*|#|\|---)/.test(line) ) carry = null;
    const {refs: found, last} = R.refsInLine(line, carry);
    carry = last;
    for ( const r of found ) {
      const row = {...r, text: line.trim().slice(0, 400), where: `${relative(root, p)}:${i + 1}`, file: relative(root, p)};
      if ( r.book ) refs.push(row); else unresolved.push(row);
    }
  });
}

const byBook = {};
for ( const r of refs ) (byBook[r.book] ??= []).push(r);

if ( process.argv.includes("--list") ) {
  for ( const [b, rs] of Object.entries(byBook).sort((x, y) => y[1].length - x[1].length) )
    console.log(`${b.padEnd(12)} ${String(rs.length).padStart(5)} refs  offset ${offsets[b] ?? "unknown (give it in books.json)"}`);
  console.log(`no book named: ${unresolved.length}`);
  process.exit(0);
}

const textDir = arg("--text"), mapFile = arg("--map");
if ( !textDir || !mapFile ) { console.error("Give --text <dir> and --map <books.json>, or --list."); process.exit(2); }
const map = JSON.parse(readFileSync(mapFile, "utf8"));
const min = Number(arg("--min") ?? 0.34);
const out = [], skipped = {}, summary = [];
for ( const [b, rs] of Object.entries(byBook) ) {
  const m = map[b];
  const file = m?.file && join(textDir, m.file);
  if ( !file || !existsSync(file) ) { skipped[b] = `${rs.length} refs, no text`; continue; }
  const pages = R.splitPages(readFileSync(file, "utf8"));
  if ( !pages ) { skipped[b] = `${rs.length} refs, text has no page breaks`; continue; }
  const offset = m.offset ?? offsets[b] ?? null;
  let low = 0, nopage = 0, pdfReads = 0, printedReads = 0;
  for ( const r of rs ) {
    const words = R.keywords(r.text);
    if ( words.length < 3 ) continue;
    const j = R.judge(r, words, pages, offset);
    if ( j.score == null ) nopage++;
    else { if ( j.score < min ) low++; if ( r.pdf == null ) j.reading === "pdf" ? pdfReads++ : printedReads++; }
    // A named figure, place or faction: its name should be on the cited page.
    if ( r.title && ["character", "place", "faction"].includes(r.kind) ) {
      const name = R.keywords(r.title.replace(/\(.*?\)/g, ""));
      const s = name.length ? R.support(name, pages, r.pdf ?? r.page + (offset ?? 0)) : null;
      if ( s === 0 ) j.score = Math.min(j.score ?? 0, 0), j.nameMissing = true;
    }
    out.push({...r, ...j, nwords: words.length});
  }
  summary.push(`| ${b} | ${rs.length} | ${offset ?? "?"} | ${low} | ${nopage} | ${printedReads} | ${pdfReads} |`);
}
out.sort((a, b) => (a.score ?? -1) - (b.score ?? -1));
const fmt = r => `| ${r.score == null ? "no page" : r.score.toFixed(2)} | ${r.book} ${r.page}${r.to !== r.page ? `-${r.to}` : ""}${r.pdf ? ` (pdf ${r.pdf})` : ""} | ${r.reading ?? ""}${r.nameMissing ? ", name not on page" : ""} | ${r.where} | ${r.text.replace(/\|/g, "/").slice(0, 160)} |`;
const md = [
  `# Page-reference audit (${new Date().toISOString().slice(0, 10)})`, "",
  `Score: share of a ref's keywords found on the cited page, one page either side. Under ${min} means read it by hand. "Reading" is which page numbering fits a bare ref best.`, "",
  "| Book | Refs | Offset | Under min | Page missing | Best read as printed | Best read as pdf |", "|---|---|---|---|---|---|---|", ...summary, "",
  "Skipped: " + (Object.entries(skipped).map(([b, w]) => `${b} (${w})`).join(", ") || "none"), "",
  `Refs with no book named on the line: ${unresolved.length} (first 20 below).`, "",
  "## Lowest first", "", "| Score | Ref | Reading | Where | Text |", "|---|---|---|---|---|",
  ...out.filter(r => r.score == null || r.score < min).map(fmt), "",
  "## No book named", "", ...unresolved.slice(0, 20).map(r => `- ${r.where}: ${r.text.slice(0, 160)}`)
].join("\n");
const dest = arg("--out");
if ( dest ) writeFileSync(dest, md); else console.log(md);
console.log(`${out.length} refs scored, ${out.filter(r => r.score == null || r.score < min).length} to read by hand; skipped ${Object.keys(skipped).length} books.`);
