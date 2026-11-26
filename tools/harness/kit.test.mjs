// Desk picks inv1 and inv2 (26 Nov): the starting kit and an NPC's things at first meeting (kit-rules.mjs)
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const K = await import(join(root, "modules/wodx-creation/scripts/kit-rules.mjs"));
const {GOODS} = await import(join(root, "modules/wodx-library/data/goods.mjs"));
const W = await import(join(root, "modules/wodx-library/data/goods-ways.mjs"));
const T = await import(join(root, "modules/wodx-library/data/goods-tags.mjs"));
const GR = await import(join(root, "modules/wodx-library/scripts/gear-rules.mjs"));
const MR = await import(join(root, "modules/wodx-storyteller/scripts/money-rules.mjs"));
const gear = JSON.parse(readFileSync(join(root, "modules/wodx-library/data/gear.json"), "utf8")).items;

const year = 1197, place = {region: "moravia", way: "latin"};
const inUse = g => W.inUseAt(g, year, place);
const price = r => r.type ? MR.priceOf({name: r.name, value: 2}, year) : MR.priceOf(r, year);
const kit = (station, abilities, seed = "t") => K.suggestKit({goods: GOODS, gear: GR.forEra(gear, "dark-ages", {year, ...place}), inUse, price, station, abilities,
  gearStation: T.gearStationOf, seed});

test("stations from Resources: none is poor, five is noble", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(K.stationFor), ["p", "c", "c", "w", "n", "n"]);
  assert.ok(K.suits(["poor", "common"], "p"));
  assert.ok(!K.suits(["noble"], "p"));
  assert.ok(K.suits(["well-off"], "n"), "the nobility use the better things of the well-off too");
});

test("a kit dresses the character for free, one piece a part, all in use in Moravia in 1197", () => {
  const rows = kit("c", {});
  const worn = rows.filter(r => r.free);
  assert.ok(worn.length >= 3, "at least body, feet and a cloak or belt");
  const slots = worn.map(r => K.slotOf(r.name));
  assert.equal(new Set(slots).size, slots.length, "one piece for each part of the body");
  assert.ok(worn.every(r => inUse(r.good)), "nothing out of its land or time");
  assert.ok(!rows.some(r => /kimono|sneakers|jeans/.test(r.name)));
});

test("the Abilities bring the tools of a trade and a weapon", () => {
  const smith = kit("c", {crafts: 3});
  assert.ok(smith.some(r => r.why.includes("crafts") && r.good?.kind === "tools"), "a crafter carries tools");
  const fighter = kit("p", {melee: 2});
  assert.ok(fighter.some(r => r.from === "gear" && r.item.type === "Melee Weapon"), "a fighter carries a book weapon");
  assert.ok(kit("c", {}).some(r => r.why === "what anyone carries"), "a purse, a light and the like");
});

test("the same seed gives the same kit", () => {
  assert.deepEqual(kit("c", {crafts: 2}, "a").map(r => r.key), kit("c", {crafts: 2}, "a").map(r => r.key));
});

test("the budget: free clothes stay, the dearest bought things go first, the rest is coin", () => {
  const rows = [{key: "a", free: true, price: 0}, {key: "b", price: 10}, {key: "c", price: 50}, {key: "d", price: 5}];
  assert.deepEqual(K.tally(rows, 100), {spent: 65, left: 35, over: false});
  assert.deepEqual(K.fitBudget(rows, 20).map(r => r.key), ["a", "b", "d"]);
  assert.deepEqual(K.fitBudget(rows, 0).map(r => r.key), ["a"]);
  assert.equal(K.budgetFrom(MR.allowance(2, 1197)), MR.allowance(2, 1197), "one month of the allowance");
});

test("an NPC with a thin purse carries less", () => {
  const rows = [{key: "a", free: true}, {key: "b"}, {key: "c"}, {key: "d"}, {key: "e"}];
  assert.deepEqual(K.npcKit(rows, {purse: 2, wage: 1}).map(r => r.key), ["a", "b"]);
  assert.deepEqual(K.npcKit(rows, {purse: 10, wage: 1}).map(r => r.key), ["a", "b", "c"]);
  assert.equal(K.npcKit(rows, {purse: 100, wage: 1}).length, 5);
  assert.equal(K.npcKit(rows, {}).length, 5, "with no purse known, the whole kit");
});

test("an item made from a good carries its tags", () => {
  const row = kit("c", {}).find(r => r.from === "good");
  const d = K.itemData(row);
  assert.equal(d.type, "Item");
  assert.equal(d.flags["wodx-library"].good, row.good.id);
  assert.ok("station" in d.flags["wodx-library"].tags);
  assert.equal(d.flags["wodx-creation"].kit, true);
});

test("the wizard has a What they carry page, and the NPC menu fills an NPC at first meeting", () => {
  const Wz = readFileSync(join(root, "modules/wodx-creation/scripts/wizard.mjs"), "utf8");
  assert.match(Wz, /case "kit": return this\.#kit\(ctx\);/);
  assert.match(Wz, /KIT\.takeKit\(a, k\.chosen, k\.budget\)/, "Ready takes the list as it stands");
  const S = readFileSync(join(root, "modules/wodx-actions/scripts/social.js"), "utf8");
  assert.match(S, /api\?\.kit\?\.ensure\?\.\(npc\)/);
  const M = readFileSync(join(root, "modules/wodx-creation/scripts/main.mjs"), "utf8");
  assert.match(M, /message\?\.type === "kit\.npc"/);
});
