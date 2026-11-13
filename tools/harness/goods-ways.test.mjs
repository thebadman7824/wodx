import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Goods by way of life and region (Library 0.19.0, Interactables 0.36.0, B2680-B2682) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const G = await imp("modules/wodx-library/data/goods.mjs");
const L = await imp("modules/wodx-library/data/goods-ways.mjs");
const T = await imp("modules/wodx-library/data/goods-text.mjs");
const F = await imp("modules/wodx-interactables/scripts/fill-rules.mjs");
const W = await imp("modules/wodx-chronicle/scripts/world-rules.mjs");
const M = await imp("modules/wodx-storyteller/scripts/money-rules.mjs");

const row = n => G.GOODS.find(g => (g.former ?? g.name) === n);
const at = (n, year, region) => G.inUseAt(row(n), year, {region, way: W.sphereFor(region, year)});
const KEYS = new Set(["*", ...Object.keys(W.SPHERES), ...Object.keys(W.WORLD_REGIONS)]);

test("goods-ways: every entry names a good, a way of life or a region, and a sound rule", () => {
  const rows = new Set(G.ALL_ROWS.map(r => r[0]));
  const check = (name, where) => {
    for ( const [k, v] of Object.entries(where) ) {
      assert.ok(KEYS.has(k), `${name}: unknown place ${k}`);
      const ok = v === null || v === false || Number.isFinite(v) || (Array.isArray(v) && v.length === 2 && v[0] <= v[1]);
      assert.ok(ok, `${name}: rule for ${k}`);
    }
  };
  for ( const [name, where] of Object.entries(L.WAYS) ) { assert.ok(rows.has(name), `no good ${name}`); check(name, where); }
  for ( const r of L.WAY_ROWS ) { assert.equal(r.length, 8, r[0]); check(r[0], r[7]); }
  const names = G.GOODS.map(g => g.name);
  assert.equal(new Set(names).size, names.length, "a good is listed twice");
});

test("goods-ways: every way of life has goods of its own, and each new good has a description", () => {
  for ( const way of Object.keys(W.SPHERES) ) {
    const own = L.WAY_ROWS.filter(r => r[0] !== L.LOCAL_COIN && (way in r[7]));
    assert.ok(own.length >= 3 || L.WAY_ROWS.some(r => Object.keys(r[7]).some(k => W.REGION_SPHERE[k]?.some(([, s]) => s === way))), `${way} has no goods of its own`);
  }
  for ( const r of L.WAY_ROWS ) {
    const d = T.describe(r[0]);
    assert.ok(d, `${r[0]} has no description`);
    assert.doesNotMatch(d, /—|–/);
    assert.doesNotMatch(d, /\b(he|she|his|her|him|hers|woman|man)\b/i, `${r[0]}: gender-neutral`);
  }
});

test("goods-ways: things of faith and dress stay where they are at home", () => {
  assert.equal(at("a rosary", 1300, "moravia"), true);
  assert.equal(at("a rosary", 1300, "egypt"), false);
  assert.equal(at("a rosary", 1600, "japan"), true, "the Jesuit years in Japan");
  assert.equal(at("a rosary", 1700, "japan"), false);
  assert.equal(at("a handwritten Quran", 1300, "egypt"), true);
  assert.equal(at("a handwritten Quran", 1300, "moravia"), false);
  assert.equal(at("a handwritten Quran", 1300, "iberia"), true, "al-Andalus");
  assert.equal(at("a kimono", 1400, "japan"), true);
  assert.equal(at("a kimono", 1400, "france"), false);
  assert.equal(at("a starched ruff", 1580, "china"), false);
  assert.equal(at("a top hat", 1890, "japan"), true, "western dress spreads");
  assert.equal(at("a mezuzah case", 1300, "moravia"), true, "Jewish communities in Christendom");
  assert.equal(at("a mezuzah case", 1300, "egypt"), true);
});

test("goods-ways: a land can have a thing long before Europe, or never", () => {
  assert.equal(at("a packet of tea", 1300, "china"), true);
  assert.equal(at("a packet of tea", 1300, "moravia"), false);
  assert.equal(at("a packet of tea", 1700, "moravia"), true);
  assert.equal(at("a bag of maize meal", 1450, "mexico"), true);
  assert.equal(at("a bag of maize meal", 1450, "moravia"), false);
  assert.equal(at("a smoked ham", 1300, "egypt"), false);
  assert.equal(at("a smoked ham", 1450, "mexico"), false, "no pigs before the Spanish");
  assert.equal(at("a smoked ham", 1600, "mexico"), true);
  assert.equal(at("a jug of ale", 1300, "egypt"), false);
  assert.equal(at("a hand prayer wheel", 1700, "tibet-himalaya"), true);
  assert.equal(at("a hand prayer wheel", 1700, "moravia"), false);
  assert.equal(at("a bag of cacao beans", 1450, "mexico"), true);
  assert.equal(at("a bag of cacao beans", 1800, "mexico"), false, "cacao stops being money");
  // A good with no entry is at home everywhere from its own first year
  assert.equal(at("a pair of dice", 1300, "japan"), true);
  assert.equal(G.inUseAt(row("a rosary"), 1300), true, "no place given: the good's own years");
});

test("goods-ways: the old coins of Europe stay home; the coin of the place names the local money", () => {
  assert.equal(at("a silver groat", 1350, "moravia"), true);
  assert.equal(at("a silver groat", 1350, "egypt"), false);
  assert.equal(at("a euro note", 2010, "moravia"), false, "the Czech lands keep the koruna");
  assert.equal(at("a euro note", 2010, "german-lands"), true);
  assert.equal(at(L.LOCAL_COIN, 1300, "egypt"), true);
  assert.equal(L.localCoinLine(M.moneyFor(1300, W.WORLD_REGIONS.egypt.money).units, 7), "7 dirhams");
  assert.equal(L.localCoinLine(M.moneyFor(1350, W.WORLD_REGIONS.moravia.money).units, 1), "one groschen");
  assert.equal(L.localCoinLine(null, 4), null);
});

test("fill 0.36.0: the draw follows the region and year, and names the coin of the place", () => {
  const draw = (region, year, place = "church") => F.goodsCandidates(G.GOODS, G.PLACE_WEIGHTS, {place, year, region, way: W.sphereFor(region, year), inUse: G.inUseAt}).map(c => c.item.name);
  const cairo = draw("egypt", 1300), prague = draw("moravia", 1300), kyoto = draw("japan", 1400);
  assert.ok(cairo.includes("a prayer rug") && !cairo.includes("a rosary"));
  assert.ok(prague.includes("a rosary") && !prague.includes("a prayer rug"));
  assert.ok(kyoto.includes("a wooden prayer tablet from a shrine") && !kyoto.includes("a consecrated host"));
  // Without a place it draws by era, as before
  const byEra = F.goodsCandidates(G.GOODS, G.PLACE_WEIGHTS, {place: "church", era: "dark-ages"}).map(c => c.item.name);
  assert.ok(byEra.includes("a rosary") && byEra.includes("a prayer rug"));
  // The coin of the place
  const coin = row(L.LOCAL_COIN);
  const out = F.drawMixed({goods: [coin], weights: {home: {coin: 1}}, what: "goods", place: "home", year: 1300, region: "egypt", way: "islamic", inUse: G.inUseAt,
    count: 1, rng: () => 0, coin: n => L.localCoinLine(M.moneyFor(1300, W.WORLD_REGIONS.egypt.money).units, n)});
  assert.equal(out.length, 1);
  assert.match(out[0].line, /^\d+ dirhams$/);
  assert.equal(out[0].name, out[0].line);
  assert.equal(F.goodsLine(coin, () => 0, null), "3 coins of the place", "no money known: the plain name");
});
