// The item tagging pass (the owner, 2026-11-25): every good of a tagged kind says who owns it, what it is for and
// what it is made of; tools say whose trade; weapons, armour and shields say who carries them.
import {test} from "node:test";
import assert from "node:assert/strict";

const G = await import("../../modules/wodx-library/data/goods.mjs");
const T = await import("../../modules/wodx-library/data/goods-tags.mjs");
const GEAR = (await import("../../modules/wodx-library/data/gear.json", {with: {type: "json"}})).default.items;
const DONE = ["cloth", "tools", "arms", "coin"];

test("every good of a tagged kind has a station, a style and its materials", () => {
  for ( const g of G.GOODS.filter(x => DONE.includes(x.kind)) ) {
    assert.ok(g.station?.length, `${g.name}: no station`);
    assert.ok(g.station.every(s => Object.values(T.STATIONS).includes(s)), `${g.name}: ${g.station}`);
    assert.ok(g.style?.length && g.style.every(s => T.STYLES.includes(s)), `${g.name}: style ${g.style}`);
    assert.ok(Array.isArray(g.material), `${g.name}: material`);
    assert.deepEqual(g.tags.station, g.station);
  }
});

test("every tool names whose trade it serves", () => {
  for ( const g of G.GOODS.filter(x => x.kind === "tools") ) assert.ok(g.trade?.length, `${g.name}: no trade`);
});

test("every tag row names a real good, and the new place rules use known keys", () => {
  const names = new Set(G.ALL_ROWS.map(r => r[0]));
  for ( const n of Object.keys(T.TAGS) ) assert.ok(names.has(n), `TAGS: no good ${n}`);
  for ( const n of Object.keys(T.TAG_WAYS) ) assert.ok(names.has(n), `TAG_WAYS: no good ${n}`);
  assert.deepEqual(G.GOODS.find(g => g.name === "a pair of breeches").ways, {latin: null, orthodox: null, "*": 1850});
});

test("weapons, armour and shields carry stations: a lance is a warrior's or a lord's, a sling anyone's", () => {
  assert.deepEqual(T.gearStationOf("Lance"), ["well-off", "noble"]);
  assert.deepEqual(T.gearStationOf("Sling"), ["poor", "common"]);
  for ( const i of GEAR.filter(x => ["Melee Weapon", "Ranged Weapon", "Armor"].includes(x.type)) ) assert.ok(T.gearStationOf(i.name), `${i.name}: no station`);
  for ( const n of Object.keys(T.GEAR_TAGS) ) assert.ok(GEAR.some(i => i.name === n), `GEAR_TAGS: no gear ${n}`);
});
