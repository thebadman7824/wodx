import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Old imported goods dated 1197 that belong to later centuries (B3150-B3151) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const G = await imp("modules/wodx-library/data/goods.mjs");
const L = await imp("modules/wodx-library/data/goods-ways.mjs");
const W = await imp("modules/wodx-chronicle/scripts/world-rules.mjs");
const KEYS = new Set([...Object.keys(W.WORLD_REGIONS), ...Object.keys(W.SPHERES), "*"]);
const good = n => G.GOODS.find(g => g.name === n);
const MOR = {way: "latin", region: "moravia"}, JP = {way: "japanese", region: "japan"}, MEX = {way: "mesoamerican", region: "mexico"};

test("goods redated: every entry names an imported good and a later year; place rules are sound", () => {
  const rows = new Map(G.ROWS.map(r => [r[0], r]));
  for ( const [name, y] of Object.entries(L.REDATED) ) {
    assert.ok(rows.has(name), `no good ${name}`);
    assert.equal(rows.get(name)[2], 1197, `${name} was not dated 1197`);
    assert.ok(Number.isInteger(y) && y > 1197 && y <= 2022, `${name}: ${y}`);
  }
  for ( const [name, where] of Object.entries(L.REDATED_WAYS) ) {
    assert.ok(rows.has(name), `no good ${name}`);
    for ( const [k, v] of Object.entries(where) ) {
      assert.ok(KEYS.has(k), `${name}: unknown place ${k}`);
      assert.ok(v === null || v === false || Number.isFinite(v), `${name}: rule for ${k}`);
    }
  }
});

test("goods redated: no shorts, cheongsam or pesto in the Dark Ages; old where they began", () => {
  for ( const n of ["a pair of shorts", "a cheongsam", "pesto", "a water heater", "a black belt", "a bathrobe", "ravioli"] ) {
    assert.ok(!G.inUseAt(good(n), 1250, MOR), `${n} in 1250`);
  }
  assert.ok(G.inUseAt(good("ravioli"), 1350, MOR));
  assert.ok(G.inUseAt(good("a pair of shorts"), 1950, MOR));
  assert.ok(G.inUseAt(good("koji"), 1250, JP) && !G.inUseAt(good("koji"), 1250, MOR) && G.inUseAt(good("koji"), 2000, MOR));
  assert.ok(G.inUseAt(good("a hammock"), 1250, MEX) && !G.inUseAt(good("a hammock"), 1250, MOR) && G.inUseAt(good("a hammock"), 1600, MOR));
  // years only (no place): the good's own first year
  assert.equal(good("a water heater").from, 1868);
  assert.ok(!good("a pair of shorts").eras.includes("dark-ages"));
});
