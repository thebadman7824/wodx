#!/usr/bin/env node
/**
 * Book text tools for cloud threads (B3085): page lookups and the 8-word overlap check against the OCR and text-layer
 * texts, without a PC job. The texts are the PC's tools-env\text, copied to the project files folder by a PC job
 * (they never go in this repository).
 *
 *   node tools/books/books.mjs list [--grep <id part>]           books found, with page counts
 *   node tools/books/books.mjs page <book> <page> [--around 1] [--offset <pdf minus printed>]
 *                                                               a page's text; <page> is the pdf page unless --offset
 *                                                               is given, then it is the printed page
 *   node tools/books/books.mjs find "<words>" [--book <id>] [--max 20]
 *                                                               pages holding these words in this order (case,
 *                                                               punctuation and line breaks ignored)
 *   node tools/books/books.mjs overlap <file or folder> ... [--n 8] [--book <id>] [--max 200]
 *                                                               every run of n words (default 8) a WoDX file shares
 *                                                               with a book; exit 1 when there is one
 *   --text <folder>      default $WODX_BOOK_TEXT, else /mnt/project-files/book-text
 *
 * Layout read: <folder>/**\/<book id>/pNNNN.txt (one file per pdf page, as tools-env\text keeps them), or
 * <folder>/**\/<book id>.txt with pages split by form feeds. Words are squashed the way the Encyclopaedia check does
 * it (ency-rules.mjs): lower case, apostrophes dropped, everything else not a letter or digit a space.
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

export const SHINGLE = 8;
export const words = t => String(t ?? "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);

/** Every book under a folder: {id, pages: [{n, file}] or {id, file} for one form-feed file}. */
export function findBooks(root) {
  const books = new Map();
  const walk = d => {
    let pageFiles = [];
    for ( const e of fs.readdirSync(d, {withFileTypes: true}) ) {
      const p = path.join(d, e.name);
      if ( e.isDirectory() ) walk(p);
      else if ( /^p\d+\.txt$/i.test(e.name) ) pageFiles.push({n: +/\d+/.exec(e.name)[0], file: p});
      else if ( /\.txt$/i.test(e.name) ) { const id = e.name.replace(/\.txt$/i, ""); if ( !books.has(id) ) books.set(id, {id, file: p}); }
    }
    if ( pageFiles.length ) {
      const id = path.basename(d);
      const key = books.has(id) ? `${path.basename(path.dirname(d))}/${id}` : id;
      books.set(key, {id: key, pages: pageFiles.sort((a, b) => a.n - b.n)});
    }
  };
  if ( fs.existsSync(root) ) walk(root);
  return [...books.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/** The pages of one book as [{n, text}], pdf page numbers. */
export function pagesOf(book) {
  if ( book.pages ) return book.pages.map(p => ({n: p.n, get text() { return fs.readFileSync(p.file, "utf8"); }}));
  return fs.readFileSync(book.file, "utf8").split("\f").map((text, i) => ({n: i + 1, text}));
}

function fnv(s) {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for ( let i = 0; i < s.length; i++ ) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619); h2 = Math.imul(h2 ^ c, 2246822519); }
  return (h1 >>> 0) * 2097152 + ((h2 >>> 0) & 0x1fffff);
}

/** Runs of n words in a WoDX text, with the line each run starts on. */
export function runsWithLines(text, n = SHINGLE) {
  const ws = [];
  String(text).split("\n").forEach((line, i) => { for ( const w of words(line) ) ws.push({w, line: i + 1}); });
  const out = [];
  for ( let i = 0; i + n <= ws.length; i++ ) out.push({run: ws.slice(i, i + n).map(x => x.w).join(" "), line: ws[i].line});
  return out;
}

/** Overlap of WoDX files with the books. files: [{file, text}]. Returns [{file, line, run, book, page}]. */
export function overlap(files, books, {n = SHINGLE, max = Infinity} = {}) {
  const want = new Map();
  for ( const f of files ) for ( const r of runsWithLines(f.text, n) ) {
    const h = fnv(r.run);
    let list = want.get(h);
    if ( !list ) want.set(h, list = []);
    list.push({...r, file: f.file});
  }
  const hits = [], seen = new Set();
  for ( const b of books ) for ( const p of pagesOf(b) ) {
    const w = words(p.text);
    for ( let i = 0; i + n <= w.length; i++ ) {
      const run = w.slice(i, i + n).join(" "), list = want.get(fnv(run));
      if ( !list ) continue;
      for ( const r of list ) {
        if ( r.run !== run ) continue;
        const key = `${r.file}:${r.line}:${b.id}`;
        if ( seen.has(key) ) continue;
        seen.add(key);
        hits.push({file: r.file, line: r.line, run, book: b.id, page: p.n});
        if ( hits.length >= max ) return hits;
      }
    }
  }
  return hits;
}

/** Pages where these words stand in this order. */
export function find(phrase, books, {max = 20} = {}) {
  const q = words(phrase).join(" "), out = [];
  if ( !q ) return out;
  for ( const b of books ) for ( const p of pagesOf(b) ) {
    const t = words(p.text).join(" "), i = t.indexOf(q);
    if ( i < 0 ) continue;
    out.push({book: b.id, page: p.n, snippet: t.slice(Math.max(0, i - 80), i + q.length + 80)});
    if ( out.length >= max ) return out;
  }
  return out;
}

const SKIP = new Set(["node_modules", ".git", "packs"]);
function wodxFiles(paths) {
  const out = [];
  const add = p => {
    const st = fs.statSync(p);
    if ( st.isDirectory() ) { for ( const e of fs.readdirSync(p) ) if ( !SKIP.has(e) && !e.startsWith(".") ) add(path.join(p, e)); }
    else if ( /\.(m?js|json|md|hbs|html|txt|csv|ya?ml)$/i.test(p) && st.size < 20 << 20 ) out.push({file: p, text: fs.readFileSync(p, "utf8")});
  };
  for ( const p of paths ) add(p);
  return out;
}

function main() {
  const args = process.argv.slice(2), opt = k => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };
  const valued = new Set(["text", "around", "offset", "book", "max", "n", "grep"]);
  const pos = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && valued.has(args[i - 1].slice(2))));
  const root = opt("text") ?? process.env.WODX_BOOK_TEXT ?? "/mnt/project-files/book-text";
  let books = findBooks(root);
  if ( !books.length ) { console.error(`No book texts under ${root}. The PC job in tools/books/README.md copies them there.`); process.exit(2); }
  const only = opt("book");
  if ( only ) books = books.filter(b => b.id === only || b.id.endsWith(`/${only}`));
  const cmd = pos[0];
  if ( cmd === "list" ) {
    const g = opt("grep");
    for ( const b of books.filter(b => !g || b.id.includes(g)) ) console.log(`${b.id.padEnd(28)} ${b.pages ? b.pages.length : pagesOf(b).length} pages`);
    console.log(`${books.length} books under ${root}`);
  } else if ( cmd === "page" ) {
    const b = books.find(b => b.id === pos[1] || b.id.endsWith(`/${pos[1]}`));
    if ( !b ) { console.error(`No book ${pos[1]}; try: list --grep ${pos[1]}`); process.exit(2); }
    const off = opt("offset") === null ? 0 : Number(opt("offset")), around = Number(opt("around") ?? 0), at = Number(pos[2]) + off;
    const pages = pagesOf(b);
    for ( const p of pages.filter(p => Math.abs(p.n - at) <= around) ) console.log(`==== ${b.id} pdf page ${p.n}${off ? ` (printed ${p.n - off})` : ""}\n${p.text.trim()}\n`);
  } else if ( cmd === "find" ) {
    const hits = find(pos.slice(1).join(" "), books, {max: Number(opt("max") ?? 20)});
    for ( const h of hits ) console.log(`${h.book} pdf p. ${h.page}: ...${h.snippet}...`);
    console.log(`${hits.length} page(s).`);
  } else if ( cmd === "overlap" ) {
    const files = wodxFiles(pos.slice(1).length ? pos.slice(1) : ["modules"]);
    const t0 = Date.now(), hits = overlap(files, books, {n: Number(opt("n") ?? SHINGLE), max: Number(opt("max") ?? 200)});
    for ( const h of hits ) console.log(`${h.file}:${h.line}  "${h.run}"  ${h.book} pdf p. ${h.page}`);
    console.log(`Overlap: ${files.length} file(s) against ${books.length} book(s), ${hits.length} shared run(s) of ${opt("n") ?? SHINGLE} words, ${((Date.now() - t0) / 1000).toFixed(1)} s.`);
    process.exit(hits.length ? 1 : 0);
  } else {
    console.error("Commands: list, page, find, overlap (see the header of tools/books/books.mjs)");
    process.exit(2);
  }
}

if ( process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ) main();
