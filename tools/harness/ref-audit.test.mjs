import "./win-paths.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import * as R from "../audit/ref-rules.mjs";

/* The page-reference audit's helpers (tools/audit). */
test("refs in a line take the nearest book named before them", () => {
  const {refs, last} = R.refsInLine("Shift difficulty (W20 p. 285; DA:W pp. 106–107), V20 Dark Ages p. 144 (pdf 145).");
  assert.deepEqual(refs.map(r => [r.book, r.page, r.to, r.pdf ?? null]), [["w20", 285, 285, null], ["wtda", 106, 107, null], ["v20da", 144, 144, 145]]);
  assert.equal(last, "v20da");
  assert.equal(R.refsInLine("and p. 12 again", "w20").refs[0].book, "w20");
  assert.equal(R.refsInLine("pdf p. 40 says", null).refs[0].kind, "pdf");
  assert.equal(R.refsInLine("V20 Companion p. 9").refs[0].book, "v20comp");
  assert.equal(R.refsInLine("Sorcerers Crusade p. 9").refs[0].book, "sc");
});

test("pages split on form feeds or page markers", () => {
  assert.equal(R.splitPages("a\fb\fc").get(2), "b");
  const m = R.splitPages("=== page 1 ===\nalpha\n=== page 2 ===\nbeta\n=== page 3 ===\ngamma");
  assert.equal(m.get(2).trim(), "beta");
  assert.equal(R.splitPages("no breaks here"), null);
});

test("a claim scores against the right page, and a bare ref is read as printed or pdf", () => {
  const pages = new Map([[1, "front matter"], [10, "werewolves shapeshift between forms with difficulty"], [20, "nothing about it here, only the rules for something else entirely. ".repeat(5)], [21, ""], [19, ""]]);
  const words = R.keywords("Werewolves shapeshift between their forms.");
  assert.ok(words.includes("werewo") && words.includes("shapes"));
  // printed 8 = pdf 10 with offset 2
  const j = R.judge({page: 8, to: 8}, words, pages, 2);
  assert.equal(j.reading, "printed");
  assert.equal(j.score, 1);
  // the same number read as pdf hits page 10 directly
  assert.equal(R.judge({page: 10, to: 10, kind: "pdf"}, words, pages, 2).reading, "pdf");
  // a wrong page scores low
  assert.ok(R.judge({page: 20, to: 20, pdf: 20}, words, pages, 2).score < 0.34);
});

test("offsets come from the most common pdf-minus-printed gap", () => {
  assert.deepEqual(R.offsetsFrom([{book: "v20", page: 1, pdf: 9}, {book: "v20", page: 2, pdf: 10}, {book: "v20", page: 3, pdf: 3}]), {v20: 8});
});

test("the audit lists the repo's refs", () => {
  const out = execFileSync("node", [fileURLToPath(new URL("../audit/ref-audit.mjs", import.meta.url)), "--list"], {encoding: "utf8"});
  assert.match(out, /v20 +\d+ refs {2}offset 8/);
});

/* The 2026-11-12 sample of 60 low scores: about half came from short book names read as another book, and two from
 * cited pages with blank OCR (stale design desk 2026-11-12b-d2). */
test("short book names resolve to their own book, not the last book named", () => {
  const book = line => R.refsInLine(line, "v20").refs[0].book;
  assert.equal(book("the first arcology (CP2020 p. 176)"), "cp2020");
  assert.equal(book("Kelvin vanishes (WoFD p. 19)"), "wofd");
  assert.equal(book("Major Bond of Fate, Mummy: The Resurrection p. 111"), "mtr");
  assert.equal(book("Time of Judgment p. 69"), "toj");
  assert.equal(book("KotE Companion p. 9"), "kotecomp");
  assert.equal(book("Kindred of the East p. 9"), "kote");
});

test("books.json aliases join the built-in names, and the list can be put back", () => {
  const list = R.withAliases({ndb: {file: "x.txt", aliases: ["Night City Sourcebook", ""]}});
  assert.ok(list.some(a => a[0] === "Night City Sourcebook" && a[1] === "ndb"));
  assert.ok(list.some(a => a[0] === "CP2020"));
  R.useAliases(list);
  assert.equal(R.refsInLine("Night City Sourcebook p. 12").refs[0].book, "ndb");
  R.useAliases(R.ALIASES);
  assert.equal(R.refsInLine("Night City Sourcebook p. 12").refs[0].book, null);
});

test("a cited page with blank OCR is marked blank, not scored low", () => {
  const pages = new Map([[20, ""], [21, "  12  "], [22, ""], [30, "werewolves shapeshift between forms ".repeat(10)]]);
  const words = R.keywords("Werewolves shapeshift between their forms.");
  assert.equal(R.blankPages(pages, 21), true);
  assert.equal(R.blankPages(pages, 30), false);
  assert.equal(R.blankPages(pages, 99), false, "a page not in the text is missing, not blank");
  const j = R.judge({page: 21, to: 21, pdf: 21}, words, pages, 0);
  assert.equal(j.blank, true); assert.equal(j.reading, "blank"); assert.equal(j.score, null);
  assert.equal(R.judge({page: 30, to: 30, pdf: 30}, words, pages, 0).blank, undefined);
});
