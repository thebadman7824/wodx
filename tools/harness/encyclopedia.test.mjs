import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import * as E from "../../modules/wodx-library/scripts/ency-rules.mjs";
import * as S from "../../modules/wodx-library/scripts/shelf-rules.mjs";

/* WoDX Library 0.3.0: the Encyclopaedia Tenebrarum's frame. */
const books = [{id: "v20", title: "Vampire: The Masquerade 20th Anniversary Edition", short: "V20"}];
const good = {id: "the-camarilla", title: "The Camarilla", kind: "faction", lines: ["vampire"], eras: ["modern"], summary: "The largest sect of the Kindred, keeper of the Masquerade.",
  claims: [{text: "Its members keep the Six Traditions.", tier: "stated", refs: [{book: "v20", page: 13, pdf: 15}]}], see: ["the-masquerade"]};
const other = {...good, id: "the-masquerade", title: "The Masquerade", kind: "term", see: []};
test("a good entry passes; each missing part is named", () => {
  assert.deepEqual(E.checkAll([good, other], books), []);
  const bad = {id: "Bad Id", kind: "x", lines: [], eras: [], claims: [{text: "", tier: "maybe", refs: [{book: "nope", page: 0}]}]};
  const p = E.checkEntry(bad, {v20: books[0]}).join("\n");
  for ( const w of ["id must be", "no title", "kind must", "no lines", "no eras", "no summary", "has no text", "has no tier", "unknown book", "has no page"] ) assert.match(p, new RegExp(w));
  assert.match(E.checkAll([good], books).join(), /sees "the-masquerade"/);
  assert.match(E.checkAll([good, good, other], books).join(), /used twice/);
});
test("no 5th edition, no em-dashes, no unknown gender", () => {
  assert.match(E.checkAll([], [{id: "v5", title: "Vampire: The Masquerade 5th Edition"}]).join(), /5th edition/);
  assert.match(E.checkEntry({...other, summary: "As V5 says."}, {v20: books[0]}).join(), /5th edition or later/);
  assert.match(E.checkEntry({...other, summary: "A sect — old."}, {v20: books[0]}).join(), /em-dash/);
  assert.match(E.checkEntry({...other, summary: "She rules."}, {v20: books[0]}).join(), /gendered/);
  assert.deepEqual(E.checkEntry({...other, summary: "She rules.", gender: "f"}, {v20: books[0]}), []);
});
test("the overlap check finds a copied run of eight words, and only that", () => {
  const src = E.shingles("The Camarilla is the largest of the sects and it keeps the Masquerade above all.");
  assert.deepEqual(E.overlap("A sect. The largest of the sects and it keeps the Masquerade.", src), ["the largest of the sects and it keeps", "largest of the sects and it keeps the", "of the sects and it keeps the masquerade"]);
  assert.deepEqual(E.overlap("The biggest sect guards the Masquerade.", src), []);
});
test("an entry becomes a journal with a fixed id, its tiers, pages and links", () => {
  assert.equal(E.docId("the-camarilla"), E.docId("the-camarilla"));
  assert.notEqual(E.docId("the-camarilla"), E.docId("the-masquerade"));
  assert.match(E.docId("x"), /^[a-z0-9]{16}$/);
  const j = S.fromEncyclopedia({books, entries: [good, other, {id: "broken"}]});
  assert.equal(j.length, 2);
  const html = j[0].pages[0].text.content;
  assert.match(html, /V20, p\. 13 \(pdf 15\)/);
  assert.match(html, /Stated/);
  assert.ok(html.includes(`@UUID[Compendium.world.wodx-encyclopedia.JournalEntry.${E.docId("the-masquerade")}]{The Masquerade}`));
  assert.equal(j[0]._id, E.docId("the-camarilla"));
  assert.equal(j[0].shelf, "encyclopedia");
});
test("the check script passes on the shipped data", () => {
  const out = execFileSync("node", [new URL("../encyclopedia-check.mjs", import.meta.url).pathname], {encoding: "utf8"});
  assert.match(out, /0 problem\(s\)/);
});
test("one shelf install at a time, and no delete of a document already gone", async () => {
  const {readFileSync} = await import("node:fs");
  const src = readFileSync(new URL("../../modules/wodx-library/scripts/shelves.mjs", import.meta.url), "utf8");
  assert.match(src, /RUNNING \?\?= doInstall\(\)/);
  assert.match(src, /remove\.filter\(id => still\.has\(id\)\)/);
});
test("a claim says something about the world, not where the book puts it", () => {
  const e = {...other, claims: [{text: "It has its own section in Chapter Two.", tier: "stated", refs: [{book: "v20", page: 13}]}]};
  assert.match(E.checkEntry(e, {v20: books[0]}).join(), /describes the book/);
});
