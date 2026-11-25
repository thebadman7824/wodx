/* Book overlap gate (B8020-B8023): terms pass, allowlisted hashes pass, prose fails, own books are not read. Made-up books only. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import * as B from "../books/books.mjs";
import * as G from "../books/overlap-gate.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wodx-gate-"));
fs.mkdirSync(path.join(dir, "batch1"), {recursive: true});
fs.mkdirSync(path.join(dir, "own-scripts"), {recursive: true});
fs.writeFileSync(path.join(dir, "batch1", "made.txt"),
  "=== p0001\nStrength 3 Dexterity 2 Stamina 4 Charisma 1 Manipulation 2 Appearance 3\n" +
  "=== p0002\nThe lantern keeper climbs the tower each night before the ferry crosses the river.\n" +
  "=== p0003\nThe Lantern Book of the Grey Ferry and Other Tales\n");
fs.writeFileSync(path.join(dir, "own-scripts", "mine.txt"), "=== p0001\nthe miller's daughter counts the sacks twice every single autumn morning\n");

const lists = {terms: new Set(["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance"]),
  allow: new Map([[G.runHash("the lantern book of the grey ferry and"), "title"]]), ownBooks: ["own-scripts/"]};

test("the shipped lists load, hold single words and hashes only, and keep no stop words", () => {
  const l = G.loadLists();
  assert.ok(l.terms.size > 100);
  for ( const w of l.terms ) assert.match(w, /^[a-z0-9]+$/);
  for ( const w of ["the", "of", "and", "a"] ) assert.equal(l.terms.has(w), false);
  for ( const h of l.allow.keys() ) assert.match(h, /^[0-9a-f]{16}$/);
  assert.deepEqual(l.ownBooks, ["rothenstein-scripts/"]);
});

test("own books are left out", () => {
  const books = G.readableBooks(dir, lists.ownBooks);
  assert.deepEqual(books.map(b => b.id), ["made"]);
  assert.equal(B.findBooks(dir).length, 2);
});

test("stat lines and allowlisted titles pass, prose fails", () => {
  const files = [
    {file: "stats.mjs", text: "// strength 3 dexterity 2 stamina 4 charisma 1 manipulation 2 appearance 3"},
    {file: "title.json", text: '{"book": "The Lantern Book of the Grey Ferry and Other Tales"}'},
    {file: "prose.js", text: '"each night before the ferry crosses the river, the lantern keeper climbs the tower"'},
    {file: "mine.js", text: "the miller's daughter counts the sacks twice every single autumn morning"}];
  const books = G.readableBooks(dir, lists.ownBooks);
  const {fail, passed} = G.judge(B.overlap(files, books), lists);
  assert.ok(passed.term >= 1);
  assert.ok(passed.allowlist >= 1);
  assert.deepEqual([...new Set(fail.map(f => f.file))], ["prose.js"]);
  assert.match(fail[0].hash, /^[0-9a-f]{16}$/);
  assert.equal(fail[0].page, 2);
});

test("a term run needs every word listed or a number", () => {
  assert.equal(G.isTermRun("strength 3 dexterity 2 stamina 4 charisma 1", lists.terms), true);
  assert.equal(G.isTermRun("strength of the lantern keeper climbs the tower", lists.terms), false);
});

test("the allowlist and terms files are never scanned themselves", () => {
  const got = G.collect(["tools/books"], ROOT).map(f => f.file);
  assert.ok(got.includes("tools/books/overlap-gate.mjs"));
  assert.equal(got.some(f => /overlap-(allow|terms)\.json$/.test(f)), false);
});

test("the command passes with a skip note when there is no book text, and fails on prose", () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "wodx-gate-none-"));
  const out = execFileSync(process.execPath, [path.join(ROOT, "tools/books/overlap-gate.mjs"), "--text", empty, "tools/books"], {encoding: "utf8"});
  assert.match(out, /skipped, no book text/);
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "wodx-gate-work-"));
  fs.writeFileSync(path.join(work, "prose.md"), "each night before the ferry crosses the river, the lantern keeper climbs the tower\n");
  let code = 0, text = "";
  try { execFileSync(process.execPath, [path.join(ROOT, "tools/books/overlap-gate.mjs"), "--text", dir, work], {encoding: "utf8"}); }
  catch (e) { code = e.status; text = e.stdout; }
  assert.equal(code, 1);
  assert.match(text, /failing/);
  assert.equal(text.includes("ferry crosses"), false, "words are printed only with --show");
});
