import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* How things work together (Library 0.11.0, Ben approved 2026-11-12) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const G = await imp("modules/wodx-library/data/goods.mjs");
const U = await imp("modules/wodx-library/scripts/use-rules.mjs");
const L = await imp("modules/wodx-library/scripts/link-rules.mjs");
const good = n => G.GOODS.find(g => g.name === n);

test("links: qualities come from the name, for goods and Gear alike", () => {
  assert.ok(L.qualitiesOf(good("a pocket knife")).includes("cuts"));
  assert.ok(L.qualitiesOf("Knife").includes("cuts"), "a Gear knife cuts too");
  assert.ok(L.qualitiesOf(good("a matchbox")).includes("fire"));
  assert.ok(L.qualitiesOf(good("a tin canteen")).includes("vessel"));
  assert.ok(L.qualitiesOf(good("a glass syringe")).includes("injects"));
  assert.ok(L.qualitiesOf(good("a clay pipe")).includes("pipe"));
  assert.ok(L.qualitiesOf(good("a pencil")).includes("writes"));
  assert.deepEqual(L.qualitiesOf("bagpipes"), []);
  assert.deepEqual(L.qualitiesOf(good("pipe tobacco")), []);
  assert.ok(!L.qualitiesOf("a pair of rollerblades").includes("cuts"));
  for ( const [k, q] of Object.entries(L.QUALITIES) ) assert.ok(q.label && q.need && q.re, k);
});

test("links: a use that needs another thing says what is missing", () => {
  const needs = (n, a) => L.needsOf(good(n), a, U.lightOf(good(n)));
  assert.deepEqual(needs("pipe tobacco", "smoke"), ["fire", "pipe"]);
  assert.deepEqual(needs("a cigarette", "smoke"), ["fire"]);
  assert.deepEqual(needs("an electronic cigarette", "smoke"), []);
  assert.deepEqual(needs("heroin", "take"), ["injects"]);
  assert.deepEqual(needs("laudanum", "take"), []);
  assert.deepEqual(needs("a tallow candle", "light"), ["fire"]);
  assert.deepEqual(needs("a flashlight", "light"), []);
  assert.deepEqual(needs("a leather journal", "write"), ["writes"]);
  assert.deepEqual(needs("a quill pen", "letter"), ["ink"]);
  assert.deepEqual(needs("a fountain pen", "letter"), []);
  assert.deepEqual(L.missingOf(["fire", "pipe"], ["a clay pipe", "a matchbox"]), []);
  assert.deepEqual(L.missingOf(["fire", "pipe"], ["a clay pipe"]), ["fire"]);
  assert.match(L.missingLine(["fire", "pipe"]), /^Nothing in Possessions is a light .* or a pipe\.$/);
  assert.equal(L.missingLine([]), "");
});

test("links: liquids need something to carry them in; pills and tins do not", () => {
  for ( const n of ["claret", "lamp oil", "holy water", "milk", "petrol", "laudanum"] ) assert.ok(L.isLiquid(good(n)), n);
  for ( const n of ["aspirin", "a tin canteen", "fish", "coffee beans", "tea", "graveyard dirt", "a pocket knife"] ) assert.ok(!L.isLiquid(good(n)), n);
});

test("links: lamps, lighters, pens, sewing kits, flashlights and phones are full or empty", () => {
  assert.equal(L.supplyOf(good("a storm lantern"))?.key, "lamp");
  assert.equal(L.supplyOf(good("a petrol lighter"))?.key, "lighter");
  assert.equal(L.supplyOf(good("a fountain pen"))?.key, "pen");
  assert.equal(L.supplyOf(good("a needle case"))?.key, "sewing");
  assert.equal(L.supplyOf(good("a flashlight"))?.key, "torch");
  assert.equal(L.supplyOf(good("a cheap mobile phone"))?.key, "phone");
  assert.equal(L.supplyOf(good("an amphetamine tablet")), null);
  assert.equal(L.supplyOf(good("a phone power bank")), null);
  const names = new Set(G.GOODS.map(g => g.name));
  for ( const s of L.SUPPLIES ) for ( const r of [...(s.refill ?? []), ...(s.charge ?? [])] ) assert.ok(names.has(r), `${s.key}: no good ${r}`);
  assert.ok(L.fills(L.supplyOf("a flashlight"), "a torch battery"));
  assert.ok(L.fills(L.supplyOf("a fountain pen"), "ink"));
  assert.ok(!L.fills(L.supplyOf("a fountain pen"), "lamp oil"));
});

test("links: the five kits are separate goods, old ids kept on the first part", () => {
  for ( const n of ["a glass syringe", "a bent spoon", "a needle case", "a hank of thread", "a toothbrush", "toothpaste", "a quill pen", "a penknife", "ink", "a sling", "a sling stone"] )
    assert.ok(good(n), n);
  assert.equal(good("a quill pen").id, "a-quill-a-knife-and-a-pot-of-ink");
  assert.equal(good("a glass syringe").id, "a-glass-syringe-and-a-bent-spoon");
  for ( const g of G.GOODS ) assert.doesNotMatch(g.name, /^an? [^,]+(, an? [^,]+)? and an? (tube|pouch|pot) of /, g.name);
  assert.deepEqual(U.abilitiesOf(good("a bent spoon")), []);
  assert.ok(good("a sling stone").stacks);
});

test("links: wired into the Use window", () => {
  const u = src("modules/wodx-library/scripts/use.mjs");
  assert.match(u, /import \* as L from "\.\/link-rules\.mjs"/);
  assert.match(u, /whatIsMissing\(actor, item, good, ability\)/);
  assert.match(u, /Hooks\.on\("createItem", onCreateItem\)/);
  assert.match(u, /"_refill"/);
});
