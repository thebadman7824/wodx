import {test} from "node:test";
import assert from "node:assert/strict";
import * as STOCK from "../../modules/wodx-npc/data/stock-talk.mjs";
import * as MORE from "../../modules/wodx-npc/data/stock-talk-more.mjs";
import {HOUSE} from "../../modules/wodx-npc/data/grammar/house.mjs";
import {REGION_TALK} from "../../modules/wodx-npc/data/region-talk.mjs";
import * as RT from "../../modules/wodx-rules/npc/region-talk-rules.mjs";
import * as G from "../../modules/wodx-rules/npc/talk-grammar.mjs";
import {WORLD_REGIONS, regionOf} from "../../modules/wodx-rules/chronicle/world-rules.mjs";
import {moneyFor} from "../../modules/wodx-rules/storyteller/money-rules.mjs";

/* Small talk and coin by home region (Chronicle Packs Desk d3, B7600-B7603) */

const PLACES = /\b(Brno|Olomouc|Morava|Moravia|Svratka|Prague|Vienna|Wenceslas|slivovice)\b/;
const lines = x => Array.isArray(x) ? x.flatMap(lines) : x && typeof x === "object" ? Object.values(x).flatMap(lines) : typeof x === "string" ? [x] : [];

test("the shared stock talk and house grammar name no place, saint or drink of one land", () => {
  const hits = [...lines(STOCK), ...lines(MORE), ...lines(HOUSE)].filter(l => PLACES.test(l));
  assert.deepEqual(hits, []);
});

test("every region with its own talk is a WoDX Chronicle region", () => {
  for ( const id of Object.keys(REGION_TALK) ) assert.ok(Object.hasOwn(WORLD_REGIONS, id), id);
});

test("a region's lines join the shared pools, they do not replace them", () => {
  const m = RT.withRegion(STOCK, {NEWS: REGION_TALK.moravia.NEWS});
  assert.equal(m.NEWS.medieval.length, STOCK.NEWS.medieval.length + REGION_TALK.moravia.NEWS.medieval.length);
  assert.ok(m.NEWS.medieval.some(l => /Olomouc/.test(l)));
  assert.deepEqual(m.NEWS.modern, STOCK.NEWS.modern, "eras the region adds nothing to are as before");
  assert.equal(RT.withRegion(STOCK, null), STOCK);
  const small = RT.withRegion(MORE.SMALL, REGION_TALK.moravia.SMALL);
  assert.ok(small.winter.some(l => /Morava/.test(l)) && small.winter.length === MORE.SMALL.winter.length + 1);
  assert.ok(STOCK.NEWS.medieval.every(l => !/Olomouc/.test(l)), "the shared table is not changed");
});

const GRAMMAR = G.mergeGrammars({rules: G.poolRules(STOCK, MORE)}, HOUSE, RT.regionGrammar(REGION_TALK, G.poolRules));
const said = (kind, facts, n = 200) => new Set(Array.from({length: n}, (_, i) => G.generate(kind, facts, {grammar: GRAMMAR, seed: i})?.say).filter(Boolean));

test("in Moravia the generator pools Moravian news with the shared lines; elsewhere only the shared lines", () => {
  const home = [...said("news", {era: "medieval", year: 1250, regard: "neutral", region: "moravia"})];
  assert.ok(home.some(l => /Olomouc|Morava/.test(l)), "Moravian lines are said in Moravia");
  assert.ok(home.some(l => !PLACES.test(l)), "so are the shared lines");
  const away = [...said("news", {era: "medieval", year: 1250, regard: "neutral", region: "france"})];
  assert.ok(away.length && away.every(l => !PLACES.test(l)), "no Moravian place is named in France");
  const none = [...said("news", {era: "medieval", year: 1250, regard: "neutral"})];
  assert.ok(none.every(l => !PLACES.test(l)), "nor where the region is not known");
  const g = [...said("gossip", {era: "medieval", year: 1250, regard: "neutral", voice: "merchant", region: "moravia"})];
  assert.ok(g.some(l => /Brno|Morava/.test(l)), "a merchant's Moravian gossip");
});

test("a land's own oath and drink: Moravia keeps Saint Wenceslas and slivovice, others do not hear them", () => {
  const sym = (name, facts) => new Set(Array.from({length: 60}, (_, i) => G.expand(`#${name}#`, facts, GRAMMAR.symbols, i)));
  assert.ok(sym("oath", {era: "medieval", year: 1250, region: "moravia"}).has("by Saint Wenceslas"));
  assert.ok(![...sym("oath", {era: "medieval", year: 1250, region: "italy"})].some(w => PLACES.test(w)));
  assert.ok(sym("drink", {era: "nineteenth", year: 1880, region: "moravia"}).has("some slivovice"));
  assert.ok(![...sym("drink", {era: "nineteenth", year: 1880, region: "british-isles"})].some(w => PLACES.test(w)));
});

test("small change is named in the money of the region here", () => {
  assert.deepEqual(RT.regionFacts(regionOf("moravia"), 1400, moneyFor), {region: "moravia"}, "Moravia keeps the house grammar's own coin rows");
  const eng = RT.regionFacts(regionOf("british-isles"), 1600, moneyFor);
  assert.equal(eng.coinSmall, "farthings");
  assert.equal(eng.coinBig, "pence");
  const coin = f => new Set(Array.from({length: 40}, (_, i) => G.expand("#coin#", f, GRAMMAR.symbols, i)));
  assert.deepEqual([...coin({year: 1600, ...eng})].sort(), ["farthings", "pence"]);
  assert.ok(coin({year: 1400, region: "moravia"}).has("groschen"), "Moravia by year, as before");
  assert.ok(coin({year: 1400}).has("groschen"), "and where the region is not known");
  assert.deepEqual(RT.regionFacts(regionOf("france"), 1600, null), {region: "france"}, "no money rules: no coin facts");
  assert.deepEqual(RT.regionFacts(null, 1600, moneyFor), {});
  assert.deepEqual(RT.coinWords({units: [["mark", "Mark", 100]]}), ["Mark", "Mark"]);
  assert.equal(RT.coinWords({}), null);
});

test("every region's money gives two coin words in every century the timeline covers", () => {
  for ( const [id, r] of Object.entries(WORLD_REGIONS) ) for ( const y of [1197, 1500, 1800, 1950, 2022] ) {
    const f = RT.regionFacts({id, ...r}, y, moneyFor);
    if ( r.money === "moravian" ) continue;
    assert.ok(f.coinSmall && f.coinBig, `${id} ${y}`);
  }
});
