import test from "node:test";
import {fileURLToPath} from "node:url";
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
  const out = execFileSync("node", [fileURLToPath(new URL("../encyclopedia-check.mjs", import.meta.url))], {encoding: "utf8"});
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

/* Library 0.4.0: the plan's tiers, books that differ, a rule edition by edition, the Shelf choice. */
test("might be true and unknown are tiers; versions need two, each with a source", () => {
  assert.equal(E.TIERS.rumour, "Might be true");
  assert.equal(E.TIERS.open, "Unknown");
  const b = {v20: books[0], rev: {id: "rev", title: "Vampire: The Masquerade Revised", short: "VtM Rev"}};
  const ok = {...other, claims: [{text: "Who founded the sect is in question.", tier: "rumour", refs: [{book: "v20", page: 13}],
    versions: [{text: "Seven clans met at the founding.", refs: [{book: "v20", page: 13}]}, {text: "The founders were fewer.", refs: [{book: "rev", page: 20}]}]}]};
  assert.deepEqual(E.checkEntry(ok, b), []);
  assert.match(E.checkEntry({...ok, claims: [{...ok.claims[0], versions: [ok.claims[0].versions[0]]}]}, b).join(), /two or more versions/);
  assert.match(E.checkEntry({...ok, claims: [{...ok.claims[0], versions: [ok.claims[0].versions[0], {text: "Her line came first.", refs: []}]}]}, b).join(), /version 2 has no source/);
  const html = E.toJournal(ok, {books: b}).pages[0].text.content;
  assert.match(html, /Might be true/);
  assert.match(html, /wodx-ency-versions.*Seven clans.*V20, p\. 13.*The founders were fewer.*VtM Rev, p\. 20/);
});
test("a rule traced edition by edition, with how WoDX plays it and a link", () => {
  const b = {v20: books[0]};
  const rule = {...other, id: "blood-pool", kind: "mechanic", editions: [{edition: "V20", text: "Blood points by generation.", refs: [{book: "v20", page: 121}]}],
    wodx: {text: "Tracked on the sheet as the pool.", rule: "Compendium.world.wodx-shelf-rules.JournalEntry.abc123"}};
  assert.deepEqual(E.checkEntry(rule, b), []);
  assert.match(E.checkEntry({...rule, editions: [{text: "x", refs: [{book: "v20", page: 1}]}]}, b).join(), /no edition name/);
  assert.match(E.checkEntry({...rule, wodx: {text: "x", rule: "javascript:alert(1)"}}, b).join(), /document UUID/);
  assert.match(E.checkEntry({...rule, wodx: {text: "A sect — old."}}, b).join(), /em-dash/);
  const html = E.toJournal(rule, {books: b}).pages[0].text.content;
  assert.match(html, /From edition to edition.*<em>V20:<\/em> Blood points by generation/);
  assert.match(html, /In WoDX:.*@UUID\[Compendium\.world\.wodx-shelf-rules\.JournalEntry\.abc123\]\{the rule\}/);
  assert.match(E.entryText(rule), /Blood points by generation.*Tracked on the sheet/);
});
test("an entry with none of the new parts makes the same journal as before", () => {
  const html = E.toJournal(good, {books: {v20: books[0]}}).pages[0].text.content;
  assert.equal(html, `<p><em>Faction</em></p><p>The largest sect of the Kindred, keeper of the Masquerade.</p><ul><li>Its members keep the Six Traditions. <span class="wodx-ency-tier wodx-ency-stated">Stated</span> <span class="wodx-shelf-src">V20, p. 13 (pdf 15)</span></li></ul><p><strong>See also:</strong> @UUID[Compendium.world.wodx-encyclopedia.JournalEntry.${E.docId("the-masquerade")}]{the-masquerade}</p>`);
});
test("the Library window has a Shelf choice, marked fixed", async () => {
  const src = (await import("node:fs")).readFileSync(fileURLToPath(new URL("../../modules/wodx-library/scripts/shelves.mjs", import.meta.url)), "utf8");
  assert.match(src, /select name="shelf" data-fixed/);
  assert.match(src, /this\.shelf === "all" \|\| e\.shelf === this\.shelf/);
});
