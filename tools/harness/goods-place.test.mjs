/**
 * Market goods by region (Storyteller, B5930 to B5936): imports dearer by distance, the land's own goods cheaper,
 * each way of life's trade by kind fading with world trade, caravans naming real goods, and world news that moves markets.
 */
import {test} from "node:test";
import assert from "node:assert/strict";
import * as GP from "../../modules/wodx-storyteller/scripts/goods-place-rules.mjs";
import * as N from "../../modules/wodx-storyteller/scripts/market-news-rules.mjs";
import {GOODS} from "../../modules/wodx-library/data/goods.mjs";
import {inUseAt} from "../../modules/wodx-library/data/goods-ways.mjs";

const at = (region, way) => ({region, way, inUse: (g, y) => inUseAt(g, y, {way, region})});
const named = n => GOODS.find(g => g.name === n);

test("B5930: a rosary is the land's own in Moravia, dear in Kyoto, dearer from another part of the world", () => {
  const r = named("a rosary");
  assert.ok(r, "the rosary is in the goods list");
  const mo = at("moravia", "latin"), jp = at("japan", "japanese"), eg = at("egypt", "islamic");
  assert.deepEqual(GP.placeOf(r, 1400, mo.inUse, mo), {factor: GP.OWN, why: "own"});
  assert.equal(GP.placeOf(r, 1400, jp.inUse, jp).why, "far");
  assert.equal(GP.placeOf(r, 1400, jp.inUse, jp).factor, GP.IMPORT.far);
  assert.ok(["near", "far"].includes(GP.placeOf(r, 1400, eg.inUse, eg).why));
  // in the Jesuit years Japan has rosaries of its own
  assert.equal(GP.placeOf(r, 1600, jp.inUse, jp).factor, GP.OWN);
});

test("B5930: an import from the same part of the world is twice the price, from across the ocean three times", () => {
  const mo = at("moravia", "latin");
  assert.deepEqual(GP.placeOf(named("a small hammer amulet"), 1250, mo.inUse, mo), {factor: GP.IMPORT.near, why: "near"});
  assert.deepEqual(GP.placeOf(named("potatoes"), 1500, mo.inUse, mo), {factor: GP.IMPORT.far, why: "far"});
  // potatoes are everywhere from 1600, and the Andes' own
  assert.deepEqual(GP.placeOf(named("potatoes"), 1700, mo.inUse, mo), {factor: 1, why: null});
  const an = at("andes", "andean");
  assert.deepEqual(GP.placeOf(named("potatoes"), 1500, an.inUse, an), {factor: GP.OWN, why: "own"});
});

test("B5930: goods found everywhere, coins and goods out of their time keep their price", () => {
  const mo = at("moravia", "latin");
  const plain = GOODS.find(g => !g.ways && g.kind === "tools");
  assert.deepEqual(GP.placeOf(plain, 1400, mo.inUse, mo), {factor: 1, why: null});
  const coin = GOODS.find(g => g.kind === "coin" && g.ways);
  assert.equal(GP.placeOf(coin, 1400, mo.inUse, mo).factor, 1);
  assert.deepEqual(GP.placeOf(null, 1400, mo.inUse, mo), {factor: 1, why: null});
});

test("B5932: each way of life's trade, fading from 1900 to nothing by 2000", () => {
  assert.equal(Object.keys(GP.LAND_TRADE).length, 16);
  assert.equal(GP.landTrade("papers", "sinic", 1500), GP.CHEAP);
  assert.equal(GP.landTrade("valuables", "sinic", 1500), GP.DEAR);
  assert.equal(GP.landTrade("food", "sinic", 1500), 1);
  assert.ok(GP.landTrade("papers", "sinic", 1950) > GP.CHEAP && GP.landTrade("papers", "sinic", 1950) < 1);
  assert.equal(GP.landTrade("papers", "sinic", 2010), 1);
  assert.equal(GP.landTrade("papers", "nowhere", 1500), 1);
  assert.equal(GP.tradeOf("sinic", 2050), null);
  for ( const [way, t] of Object.entries(GP.LAND_TRADE) ) assert.ok(t.cheap.length && t.dear.length && !t.cheap.some(k => t.dear.includes(k)), way);
});

test("B5933: a caravan out of a Chinese market names Chinese goods, the same each time", () => {
  const cn = at("china", "sinic");
  const a = GP.namedGoods("drink", GOODS, 1400, cn.inUse, cn, "c1");
  assert.ok(a.length >= 1 && a.length <= 2, String(a));
  assert.deepEqual(GP.namedGoods("drink", GOODS, 1400, cn.inUse, cn, "c1"), a);
  assert.ok(a.every(n => !/^(a|an|some) /.test(n)));
  assert.deepEqual(GP.namedGoods("drink", GOODS, 1400, null, cn, "c1"), []);
});

test("B5934: plague and famine at home move the markets; far news, old news and the hidden story do not", () => {
  const ev = (o = {}) => ({id: "wh-1347-x", year: 1347, region: "EU", tags: ["plague"], ...o});
  assert.equal(N.worldNewsFor(ev(), {homePart: "EU", year: 1347}), "plague");
  assert.equal(N.worldNewsFor(ev({tags: ["famine"]}), {homePart: "EU", year: 1347}), "famine");
  assert.equal(N.worldNewsFor(ev(), {homePart: "AS", year: 1347}), null);
  assert.equal(N.worldNewsFor(ev(), {homePart: "EU", year: 1360}), null);
  assert.equal(N.worldNewsFor(ev({hidden: true}), {homePart: "EU", year: 1347}), null);
  assert.equal(N.worldNewsFor(ev({tags: ["war"]}), {homePart: "EU", year: 1347}), null);
  assert.equal(N.worldNewsFor(ev({tags: ["war"], region: "MO"}), {homePart: "MO", year: 1347}), "war");
  assert.equal(N.worldNewsFor({id: "black-death", region: "EU", tags: ["plague"]}, {homePart: "EU"}), null, "book events keep their own table");
  assert.ok(N.tooSoon(0, 30 * 86400) && !N.tooSoon(0, 100 * 86400) && !N.tooSoon(100, 0) && !N.tooSoon(-Infinity, 0));
});
