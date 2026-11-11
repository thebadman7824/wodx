import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Item descriptions and Examine (Library 0.7.0) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const G = await imp("modules/wodx-library/data/goods.mjs");
const T = await imp("modules/wodx-library/data/goods-text.mjs");
const X = await imp("modules/wodx-library/scripts/examine-rules.mjs");

test("examine: every good has a description, and no description names a good that is not there", () => {
  const names = new Set(G.GOODS.map(g => g.name));
  for ( const g of G.GOODS ) assert.ok(T.describe(g.name), `${g.name} has no description`);
  for ( const n of Object.keys(T.DESC) ) assert.ok(names.has(n), `description for unknown good: ${n}`);
  for ( const [n, forms] of Object.entries(T.DESC) ) for ( const f of forms ) {
    assert.doesNotMatch(f.text, /—|–/, `${n}: no dashes`);
    assert.doesNotMatch(f.text, /\b(he|she|his|her|him|hers|himself|herself)\b/i, `${n}: gender-neutral`);
    assert.match(f.text, /[.!?]$/, `${n}: a full sentence`);
  }
});

test("examine: the wording follows the year where the thing changed", () => {
  assert.match(T.describe("a match", 1850), /sulphur head/);
  assert.match(T.describe("a match", 1950), /safety match/);
  assert.equal(T.describe("a match"), T.describe("a match", 1850));
  assert.equal(T.describe("no such thing", 1900), "");
});

test("examine: every category has Abilities and three lines for a closer look", () => {
  for ( const k of Object.keys(G.KINDS) ) {
    assert.ok(X.ABILITIES[k]?.length, `${k} abilities`);
    assert.equal(X.LINES[k]?.length, 3, `${k} lines`);
  }
});

test("examine: pool, successes and what a closer look finds", () => {
  assert.deepEqual(X.closerPool("coin", {perception: 3, abilities: {commerce: 2, finance: 1}}), {pool: 5, ability: "commerce", dots: 2, difficulty: 6});
  assert.equal(X.closerPool("coin", {perception: 0}).pool, 1);
  assert.deepEqual(X.countSuccesses([10, 6, 1, 3]), {successes: 1, botch: false});
  assert.deepEqual(X.countSuccesses([1, 3]), {successes: 0, botch: true});
  assert.equal(X.findings("coin", 0).length, 0);
  const f = {forged: true, forgedTell: "the lead shows at the rim", origin: "Struck in Brno", quality: "poor", uncanny: "It is cold as a grave.", lines: [{need: 2, text: "A notch cut in the edge."}]};
  const two = X.findings("coin", 2, f).map(l => l.text);
  assert.ok(two.includes("Struck in Brno") && two.includes("A notch cut in the edge.") && two.includes("The work is poor."));
  assert.ok(!two.some(t => /not genuine/.test(t)), "the forgery needs three");
  const three = X.findings("coin", 3, f).map(l => l.text);
  assert.ok(three.some(t => /not genuine: the lead shows/.test(t)));
  assert.ok(!three.includes("It is cold as a grave."), "the uncanny needs four");
  assert.ok(X.findings("coin", 4, f).some(l => l.text === "It is cold as a grave." && l.secret));
  assert.ok(X.findings("coin", 3, {}, {stolen: true}).some(l => /stolen/.test(l.text)), "the owner record's stolen mark counts");
  assert.ok(X.findings("coin", 3, {}).some(l => l.text === "Nothing about it is false."));
});

test("examine: the Storyteller's own lines and a good found by any of its names", () => {
  assert.deepEqual(X.parseLines("2: A mark\nplain line\n9) deep"), [{need: 2, text: "A mark"}, {need: 1, text: "plain line"}, {need: 9, text: "deep"}]);
  assert.equal(X.joinLines([{need: 2, text: "A mark"}]), "2: A mark");
  assert.equal(X.goodOf("a bronze coin (7)", G.GOODS)?.id, G.GOODS.find(g => g.name === "a bronze coin").id);
  assert.equal(X.goodOf("7 bronze coins", G.GOODS)?.name, "a bronze coin");
  assert.equal(X.goodOf("A Bronze Coin", G.GOODS)?.name, "a bronze coin");
  assert.equal(X.goodOf("a sword of legend", G.GOODS), null);
  const facts = X.factsOf(G.GOODS.find(g => g.name === "a bronze coin"), {kinds: G.KINDS, values: G.VALUES, conceal: G.CONCEAL});
  assert.deepEqual(facts.map(f => f[0]), ["Kind", "Used to", "Hides in", "Worth", "Stacks"]);
});

test("examine: Library fills descriptions as goods become items and puts Examine on item sheets", () => {
  const src = readFileSync(join(root, "modules/wodx-library/scripts/examine.mjs"), "utf8");
  assert.match(src, /Hooks\.on\("preCreateItem", onPreCreateItem\)/);
  assert.match(src, /getHeaderControlsItemSheetV2/);
  assert.match(src, /getItemSheetHeaderButtons/);
  assert.match(readFileSync(join(root, "modules/wodx-library/scripts/main.mjs"), "utf8"), /api\.examine = examineApi\(\)/);
});

test("examine: names and descriptions say plainly what a thing is; origin and hidden features wait for a closer look", () => {
  const plainWords = /\b(Chinese|Muslim|Byzantine|Florence|Venetian|Spanish|Swiss|Confederate|Thor's|unicorn|forged|stolen|loaded)\b/i;
  for ( const g of G.GOODS ) assert.doesNotMatch(g.name, plainWords, `name: ${g.name}`);
  for ( const [n, forms] of Object.entries(T.DESC) ) for ( const f of forms ) assert.doesNotMatch(f.text, /\b(Chinese|Muslim|Byzantine|Florence|Venice|Spanish|Swiss|Confederate|laced with)\b/, `description: ${n}`);
  const names = new Set(G.GOODS.map(g => g.name));
  for ( const n of Object.keys(T.DETAILS) ) assert.ok(names.has(n), `detail for unknown good: ${n}`);
  const dinar = G.GOODS.find(g => g.name === "a gold dinar");
  assert.equal(dinar.id, "a-gold-dinar-from-a-muslim-mint", "a renamed good keeps its id");
  assert.equal(X.goodOf("a gold dinar from a Muslim mint", G.GOODS)?.name, "a gold dinar", "the old name still finds it");
  assert.ok(!X.findings("coin", 1, {}, null, T.detailsOf("a gold dinar")).some(l => /Muslim/.test(l.text)));
  assert.ok(X.findings("coin", 2, {}, null, T.detailsOf("a gold dinar")).some(l => /Muslim mint/.test(l.text)));
  const pass = X.findings("papers", 3, {}, null, T.detailsOf("a passport in a plastic sleeve"));
  assert.ok(pass.some(l => /forgery/.test(l.text) && l.secret));
  assert.ok(!pass.some(l => l.text === "Nothing about it is false."));
});
