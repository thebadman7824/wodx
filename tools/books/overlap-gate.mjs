#!/usr/bin/env node
/**
 * Book overlap gate (B8020-B8023): the 8-word overlap check of books.mjs, made a pass or fail check. A run of 8 words
 * that WoDX shares with a book fails it, unless it is a game term or list:
 *   - every word of the run is a number or a word on the terms list (overlap-terms.json: trait, Ability, Background,
 *     Discipline and similar names, one word at a time), so stat lines and trait lists pass; or
 *   - the run's hash is on the allowlist (overlap-allow.json), for names and titles such as a book title or a power
 *     called by its book name. Only hashes are kept: the allowlist never holds a book's words, so it cannot itself
 *     become a hit.
 * Books listed under ownBooks in overlap-allow.json are Ben's own writing (the Rothenstein scripts) and are not read.
 *
 *   node tools/books/overlap-gate.mjs                         whole repository (the public folders)
 *   node tools/books/overlap-gate.mjs --changed origin/main   only files changed since that commit
 *   node tools/books/overlap-gate.mjs <file or folder> ...
 *   --text <folder>   book text (default $WODX_BOOK_TEXT, else /mnt/project-files/book-text)
 *   --show            also print each failing run's words (for the thread doing the rewrite; never paste them into
 *                     the repository, an issue or a pull request)
 *   --require         fail when no book text is found (default: skip, so GitHub's runners, which never hold the
 *                     books, still pass)
 *   --allow "<note>"  add every failing run's hash to the allowlist with this note (after a person has checked that
 *                     each one is a term), then pass
 *   --json <file>     write the failures as JSON (file, line, hash, book, page; no words)
 * Exit 0: no failing run (or skipped). Exit 1: failing runs. Exit 2: usage or setup error.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {findBooks, overlap, SHINGLE} from "./books.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../..");
export const TERMS_FILE = path.join(HERE, "overlap-terms.json"), ALLOW_FILE = path.join(HERE, "overlap-allow.json");
/** The folders of the repository that are published (everything but .git, node_modules and Foundry packs). */
export const PUBLIC = ["modules", "system", "docs", "worlds", "tools", "registry", "changes", "README.md", "NOTICE.md"];
const EXT = /\.(m?js|json|md|hbs|html|txt|csv|ya?ml|css)$/i, SKIP = new Set(["node_modules", ".git", "packs"]);

/** The hash kept on the allowlist: the first 16 hex digits of the run's SHA-256. */
export const runHash = run => crypto.createHash("sha256").update(run).digest("hex").slice(0, 16);

export function loadLists(termsFile = TERMS_FILE, allowFile = ALLOW_FILE) {
  const terms = JSON.parse(fs.readFileSync(termsFile, "utf8"));
  const allow = JSON.parse(fs.readFileSync(allowFile, "utf8"));
  return {terms: new Set(terms.words), allow: new Map(Object.entries(allow.runs ?? {})), ownBooks: allow.ownBooks ?? [], allowRaw: allow};
}

/** A run every word of which is a number or a listed term: a stat line or a trait list. */
export const isTermRun = (run, terms) => run.split(" ").every(w => /^\d+$/.test(w) || terms.has(w));

/** Hits split into allowed (term or allowlisted) and failing. */
export function judge(hits, {terms, allow}) {
  const fail = [], passed = {term: 0, allowlist: 0};
  for ( const h of hits ) {
    if ( isTermRun(h.run, terms) ) passed.term++;
    else if ( allow.has(runHash(h.run)) ) passed.allowlist++;
    else fail.push({...h, hash: runHash(h.run)});
  }
  return {fail, passed};
}

/** Books to read: all but the ones under an ownBooks prefix (matched on the book id or its folder). */
export function readableBooks(root, ownBooks = []) {
  return findBooks(root).filter(b => {
    const where = (b.file ?? b.pages?.[0]?.file ?? "").replace(/\\/g, "/");
    return !ownBooks.some(o => b.id.startsWith(o) || where.includes(`/${o}`));
  });
}

export function collect(paths, root = ROOT) {
  const out = [];
  const add = p => {
    const abs = path.resolve(root, p);
    if ( !fs.existsSync(abs) ) return;
    const st = fs.statSync(abs);
    if ( st.isDirectory() ) { for ( const e of fs.readdirSync(abs) ) if ( !SKIP.has(e) && !e.startsWith(".") ) add(path.join(p, e)); }
    else if ( EXT.test(p) && st.size < 20 << 20 && path.resolve(abs) !== ALLOW_FILE && path.resolve(abs) !== TERMS_FILE )
      out.push({file: p.replace(/\\/g, "/"), text: fs.readFileSync(abs, "utf8")});
  };
  for ( const p of paths ) add(p);
  return out;
}

function changedSince(base) {
  const mb = execFileSync("git", ["merge-base", base, "HEAD"], {cwd: ROOT, encoding: "utf8"}).trim();
  const names = execFileSync("git", ["diff", "--name-only", "--diff-filter=d", mb], {cwd: ROOT, encoding: "utf8"}).split("\n").filter(Boolean);
  const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], {cwd: ROOT, encoding: "utf8"}).split("\n").filter(Boolean);
  return [...new Set([...names, ...untracked])].filter(f => PUBLIC.some(p => f === p || f.startsWith(`${p}/`)));
}

function main() {
  const args = process.argv.slice(2), opt = k => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };
  const valued = new Set(["text", "changed", "allow", "json"]);
  const pos = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && valued.has(args[i - 1].slice(2))));
  const text = opt("text") ?? process.env.WODX_BOOK_TEXT ?? "/mnt/project-files/book-text";
  const lists = loadLists();
  const books = fs.existsSync(text) ? readableBooks(text, lists.ownBooks) : [];
  if ( !books.length ) {
    console.log(`Book overlap: skipped, no book text under ${text}.`);
    process.exit(args.includes("--require") ? 2 : 0);
  }
  const base = opt("changed");
  const files = collect(base ? changedSince(base) : pos.length ? pos : PUBLIC);
  if ( !files.length ) { console.log("Book overlap: no files to check."); return; }
  const t0 = Date.now(), hits = overlap(files, books, {n: SHINGLE});
  const {fail, passed} = judge(hits, lists);
  const note = opt("allow");
  if ( note !== null && fail.length ) {
    const raw = lists.allowRaw;
    raw.runs ??= {};
    for ( const f of fail ) raw.runs[f.hash] ??= `${note} (${f.file}:${f.line})`;
    raw.runs = Object.fromEntries(Object.entries(raw.runs).sort(([a], [b]) => a.localeCompare(b)));
    fs.writeFileSync(ALLOW_FILE, JSON.stringify(raw, null, 1) + "\n");
    console.log(`Book overlap: ${new Set(fail.map(f => f.hash)).size} run(s) added to the allowlist.`);
    return;
  }
  for ( const f of fail ) console.log(`${f.file}:${f.line}  ${f.hash}  ${f.book} pdf p. ${f.page}${args.includes("--show") ? `  "${f.run}"` : ""}`);
  if ( opt("json") ) fs.writeFileSync(opt("json"), JSON.stringify(fail.map(({run, ...f}) => f), null, 1));
  const runs = new Set(fail.map(f => f.hash)).size;
  console.log(`Book overlap: ${files.length} file(s) against ${books.length} book(s) in ${((Date.now() - t0) / 1000).toFixed(1)} s. ` +
    `${hits.length} shared run(s): ${passed.term} term or list, ${passed.allowlist} allowlisted, ${fail.length} failing (${runs} distinct).`);
  if ( fail.length ) {
    console.log("Reword each failing line in WoDX's own words (rule 5), keeping the mechanics exact. Where the run is a name, title or list, " +
      "a person adds it with --allow \"<why>\" after checking it.");
    process.exit(1);
  }
}

if ( process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ) main();
