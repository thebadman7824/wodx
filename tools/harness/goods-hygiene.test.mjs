import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* The no-effect audit, washing, grooming and cosmetics (B3909) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const H = await imp("modules/wodx-library/scripts/hygiene-rules.mjs");
const L = await imp("modules/wodx-library/scripts/look-rules.mjs");
const G = await imp("modules/wodx-library/data/goods.mjs");
const U = await imp("modules/wodx-library/scripts/use-rules.mjs");

test("every hygiene good washes, grooms, is worn, or is a plain thing with no Use; none only posts a note", () => {
  for ( const g of G.GOODS.filter(x => x.kind === "hygiene") ) {
    const ab = U.abilitiesOf(g);
    for ( const k of ab ) assert.notEqual(U.ABILITIES[k].effect, "note", `${g.name}: ${k}`);
    if ( H.hasNoUse(g.name) ) assert.ok(!ab.includes("wash"), g.name);
  }
  assert.ok(H.isCleaner("a cake of lye soap") && H.isCleaner("a towel") && !H.isCleaner("rouge"));
});

test("soap takes blood and filth off; a comb or rouge grooms but leaves them", () => {
  const w = H.washResult("a bar of scented soap", ["bloody", "filthy"]);
  assert.deepEqual(w.clears, ["filthy", "bloody"]); assert.ok(w.groomed);
  const c = H.washResult("a bone comb", ["bloody"]);
  assert.deepEqual(c.clears, []); assert.match(c.line, /blood still shows/);
  const n = H.nightOf(86400 * 5 + 50000);
  assert.ok(H.groomedTonight(n, 86400 * 5 + 50000 + 3600)); assert.ok(!H.groomedTonight(n - 1, 86400 * 5 + 50000)); assert.ok(!H.groomedTonight(null, 0));
});

test("a new lethal or aggravated wound marks them bloody, bashing does not", () => {
  assert.ok(H.newWound({lethal: 0}, {lethal: 1}));
  assert.ok(H.newWound({aggravated: 1}, {aggravated: 2}));
  assert.ok(!H.newWound({bashing: 0, lethal: 1}, {bashing: 3}));
  assert.ok(!H.newWound({lethal: 2}, {lethal: 1}), "healing");
});

test("the look reads the marks and grooming at a first meeting", () => {
  // the same clothes either way: only grooming and the marks differ
  const seed = conds => L.lookSeed(L.lookOf({items: [], conditions: conds}), {station: 3, mortal: true});
  const base = seed([]).delta;
  assert.equal(seed(["groomed"]).delta, base + 1); assert.ok(seed(["groomed"]).names.includes("well groomed"));
  assert.equal(seed(["groomed", "filthy"]).delta, base - 1, "groomed does not hide filth");
  assert.equal(seed(["bloody"]).delta, base - 1);
  assert.equal(L.lookSeed(L.lookOf({items: [], conditions: ["groomed"]}), {station: 1, mortal: true}).delta, 0, "a peasant does not care");
  assert.match(src("modules/wodx-library/scripts/look.mjs"), /groomedTonight\(a\.flags\?\.\[MOD\]\?\.groomed/);
  assert.match(src("modules/wodx-library/scripts/hygiene-use.mjs"), /registerCondition\(\{id: "bloody"/);
});
