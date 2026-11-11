import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Markets, the living economy's first build (Storyteller 0.24.0, B599) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const MK = await imp("modules/wodx-storyteller/scripts/market-rules.mjs");
const G = await imp("modules/wodx-library/data/goods.mjs");
const kinds = Object.keys(G.KINDS);
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

test("markets: kept tidy, one per settlement, found by scene, tile or trader", () => {
  const st = MK.normState({markets: [
    {name: "Rothenstein town", scenes: ["s1", "s2", "s1"], index: {food: 9, drink: 0.1, nope: 2, tools: 1}, supply: {food: "short", drink: "weird"},
      traders: [{actor: "a1", tile: "Scene.s1.Tile.t1"}, {actor: "", tile: "x"}]},
    {name: "Rothenstein town"}]}, kinds);
  assert.equal(st.markets.length, 2);
  assert.notEqual(st.markets[0].id, st.markets[1].id);
  const m = st.markets[0];
  assert.deepEqual(m.scenes, ["s1", "s2"]);
  assert.deepEqual(m.index, {food: 3, drink: 0.5});
  assert.deepEqual(m.supply, {food: "short"});
  assert.equal(m.traders.length, 1);
  assert.equal(MK.marketOfScene(st, "s2").id, m.id);
  assert.equal(MK.marketOfScene(st, "zz"), null);
  assert.equal(MK.traderOfTile(st, "Scene.s1.Tile.t1").actor, "a1");
  assert.equal(MK.marketOfActor(st, "a1").id, m.id);
  assert.equal(MK.indexOf(m, "food"), 3);
  assert.equal(MK.indexOf(m, "cloth"), 1);
  assert.equal(MK.supplyOf(m, "cloth"), "normal");
});

test("markets: supply thins or fills a trader's stock draw", () => {
  const kindOf = n => (/bread|egg/.test(n) ? "food" : /candle/.test(n) ? "light" : /nail/.test(n) ? "tools" : null);
  const m = MK.normMarket({name: "x", supply: {food: "none", light: "plenty", tools: "short"}}, kinds);
  const out = MK.applySupply(["a loaf of dark bread", "a tallow candle (4)", "a strange idol", "an iron nail (10)"], m, kindOf, seq(0.1));
  assert.deepEqual(out, ["a tallow candle (6)", "a strange idol", "an iron nail (5)"]);
  assert.deepEqual(MK.applySupply(["an iron nail (10)"], m, kindOf, seq(0.9)), []);
  assert.deepEqual(MK.splitLine("silver pennies (7)"), {name: "silver pennies", count: 7});
  assert.equal(MK.joinLine("a cigar", 1), "a cigar");
});

test("markets: the till pays half price, and a thin till buys a thin restock", () => {
  const price = (name, n) => (name === "a cigar" ? 10 * n : name === "a horse" ? 1000 : null);
  assert.equal(MK.restockCost(["a cigar (4)", "a horse", "an unknown thing"], price), 20 + 500);
  const r = MK.affordable(["a horse", "a cigar (4)"], 100, price);
  assert.deepEqual(r, {lines: ["a cigar (4)"], cost: 20});
});

test("markets: Interactables lets the market filter a draw, and the Storyteller can open Markets", () => {
  const stock = src("modules/wodx-interactables/scripts/stock.mjs");
  assert.match(stock, /Hooks\.callAll\("wodxStockFilter", tile, fresh\)/);
  assert.ok(stock.indexOf("wodxStockFilter") < stock.indexOf("tile.update("), "the filter runs before the draw is saved");
  assert.match(src("modules/wodx-storyteller/scripts/upkeep.mjs"), /action: "markets", label: "Markets"/);
  assert.match(src("modules/wodx-storyteller/scripts/main.mjs"), /markets: Markets\.api\(\)/);
});
