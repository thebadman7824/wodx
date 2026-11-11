import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* The Foundry side of ownership (Storyteller 0.27.0) against small stand-ins for Foundry's documents */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const MOD = "wodx-storyteller";

const set = (o, path, v) => {
  const ks = path.split("."); let cur = o;
  for ( let i = 0; i < ks.length - 1; i++ ) cur = cur[ks[i]] ??= {};
  const last = ks[ks.length - 1];
  if ( last.startsWith("-=") ) delete cur[last.slice(2)]; else cur[last] = v;
};
const coll = arr => Object.assign(arr, {contents: arr, get: id => arr.find(x => x.id === id), getName: n => arr.find(x => x.name === n)});
let n = 0;
function doc(documentName, data = {}, parent = null) {
  const d = {id: `${documentName[0]}${++n}`, documentName, parent, flags: {}, ...data};
  d.uuid = `${parent ? `${parent.uuid}.` : ""}${documentName}.${d.id}`;
  d.update = async u => { for ( const [k, v] of Object.entries(u) ) set(d, k, v); return d; };
  d.delete = async () => { const list = parent?.[documentName === "Region" ? "regions" : "items"]; if ( list ) list.splice(list.indexOf(d), 1); };
  return d;
}
function actor(name, {pc = false} = {}) {
  const a = doc("Actor", {name, type: "Mortal", hasPlayerOwner: pc, isOwner: true});
  a.items = coll([]);
  a.createEmbeddedDocuments = async (t, list) => list.map(x => { const i = doc("Item", foundry.utils.deepClone(x), a); i.flags = x.flags ?? {}; a.items.push(i); return i; });
  a.updateEmbeddedDocuments = async (t, list) => { for ( const u of list ) { const i = a.items.get(u._id); for ( const [k, v] of Object.entries(u) ) if ( k !== "_id" ) set(i, k, v); } };
  a.deleteEmbeddedDocuments = async (t, ids) => { for ( const id of ids ) a.items.splice(a.items.findIndex(i => i.id === id), 1); };
  return a;
}
function scene(name) {
  const s = doc("Scene", {name, width: 3000, height: 2000, grid: {size: 100}});
  s.regions = coll([]);
  s.createEmbeddedDocuments = async (t, list) => list.map(x => { const r = doc("Region", x, s); r.flags = x.flags ?? {}; r.testPoint = () => false; s.regions.push(r); return r; });
  return s;
}

const chats = [], settings = {"wodx-storyteller.moneyRegion": "moravian", "wodx-storyteller.log": {entries: []}};
globalThis.foundry = {utils: {randomID: () => `r${++n}`, deepClone: x => JSON.parse(JSON.stringify(x))}};
globalThis.ChatMessage = {create: async m => { chats.push(m); return m; }};
globalThis.Hooks = {on: () => 0, callAll: () => true};
globalThis.ui = {notifications: {warn: () => 0, info: () => 0}};
const anna = actor("Anna Novak", {pc: true}), bert = actor("Bertold the Tanner");
const town = scene("Rothenstein market");
let year = 1400;
const purse = new Map();
const moneyApi = {
  format: v => `${v} d`,
  receive: async (a, amt) => { purse.set(a.id, (purse.get(a.id) ?? 0) + amt); return {ok: true}; },
  pay: async (a, amt) => { const have = purse.get(a.id) ?? 0; if ( have < amt ) return {ok: false, text: `${amt - have} d`}; purse.set(a.id, have - amt); return {ok: true}; }
};
const marketState = {markets: [{id: "rot", name: "Rothenstein", scenes: [town.id], index: {}, supply: {tools: "short"}, traders: []}]};
const marketsApi = {state: () => marketState, set: async (id, patch) => { const m = marketState.markets.find(x => x.id === id); m.supply = {...m.supply, ...patch.supply}; return m; }};
globalThis.game = {
  user: {id: "gm", isGM: true}, users: Object.assign([{id: "gm", isGM: true}], {activeGM: {id: "gm"}}),
  time: {worldTime: 1000}, actors: coll([anna, bert]), scenes: coll([town]), packs: coll([]), items: coll([]),
  settings: {get: (m, k) => settings[`${m}.${k}`], set: async (m, k, v) => { settings[`${m}.${k}`] = v; }},
  modules: {get: id => ({
    "wodx-chronicle": {api: {eras: {currentYear: () => year}, propose: async () => null}},
    "wodx-storyteller": {api: {upkeep: {money: moneyApi, markets: marketsApi}, tasks: {save: async (a, t) => t}}},
    "wodx-npc": {api: {factions: {state: () => ({factions: [{id: "f1", name: "The Tanners' Guild", members: [bert.id], leader: bert.id, assets: {resources: 3, retainers: 2}, places: []}]})}}}
  })[id] ?? null}
};
globalThis.canvas = {scene: town};

const Own = await imp("modules/wodx-storyteller/scripts/owners.mjs");

test("taking from someone else's chest marks the things stolen, with a card for the Storyteller", async () => {
  const chest = doc("Tile", {x: 0, y: 0, width: 100, height: 100}, town);
  await Own.setOwner(chest, {id: bert.uuid, kind: "actor", name: bert.name});
  const [it] = await anna.createEmbeddedDocuments("Item", [{name: "a tanned hide", type: "Item"}]);
  await Own.onItemsTaken({actor: anna, items: [it.id], doc: chest});
  const rec = Own.ownerOf(anna.items.get(it.id));
  assert.equal(rec.stolen, true);
  assert.equal(rec.id, bert.uuid);
  assert.ok(chats.some(c => /Taken without leave/.test(c.content)));
  assert.equal(Own.stolenGoods().length, 1);
  assert.equal(Own.whose(chest, anna), "someone's");
  assert.equal(Own.whose(chest, bert), "yours");
});

test("a faction's chest is its members' own", async () => {
  const bin = doc("Tile", {x: 0, y: 0, width: 50, height: 50}, town);
  await Own.setOwner(bin, {id: "faction:f1", kind: "faction", name: "The Tanners' Guild"});
  const [it] = await bert.createEmbeddedDocuments("Item", [{name: "a pot of lye", type: "Item"}]);
  await Own.onItemsTaken({actor: bert, items: [it.id], doc: bin});
  assert.equal(Own.ownerOf(bert.items.get(it.id)).stolen, false);
});

test("an older place tag's owner name still counts", async () => {
  town.flags["wodx-npc"] = {place: {kind: "market", owner: "Bertold Tanner", private: false}};
  const crate = doc("Tile", {x: 0, y: 0, width: 50, height: 50}, town);
  assert.equal(Own.ownerRecordAt(crate)?.id, bert.uuid);
  delete town.flags["wodx-npc"];
});

test("holdings: upkeep and income on pay day", async () => {
  await Own.saveHolding(town, {owner: {id: anna.uuid, kind: "actor", name: anna.name}, held: "burgher", since: 1400, type: "tavern"});
  const h = Own.holdings().find(x => x.doc === town);
  assert.ok(h.value > 0 && h.income > h.upkeep);
  assert.equal(town.flags["wodx-npc"].place.owner, anna.name, "the place tag follows the owner");
  const r = await Own.payHoldings(anna, 2);
  assert.equal(r.net, (h.income - h.upkeep) * 2);
  assert.equal(purse.get(anna.id), r.net);
});

test("a finished building is a tagged Region on the scene, and Undo takes it away", async () => {
  const t = {id: "t1", building: "smithy", scene: town.id, owner: {id: anna.uuid, kind: "actor", name: anna.name}};
  const made = await Own.finishBuild(anna, t);
  const r = town.regions.find(x => x.uuid === made.region);
  assert.ok(r);
  assert.equal(r.flags["wodx-npc"].place.kind, "workplace");
  assert.equal(r.flags[MOD].owner.held, "burgher");
  assert.equal(r.flags[MOD].property.makes, "tools");
  globalThis.fromUuid = async id => town.regions.find(x => x.uuid === id) ?? null;
  await Own.unbuild(made);
  assert.equal(town.regions.length, 0);
});

test("stage costs come from the purse, and a faction's from its Resources", async () => {
  purse.set(anna.id, 10);
  assert.equal((await Own.payStage(anna, {stage: 0, stages: [{name: "Walls", goal: 3, cost: 50}]})).ok, false);
  purse.set(anna.id, 60);
  assert.equal((await Own.payStage(anna, {stage: 0, stages: [{name: "Walls", goal: 3, cost: 50}]})).ok, true);
  assert.equal(purse.get(anna.id), 10);
  assert.equal((await Own.payStage(bert, {stage: 0, faction: "f1", stages: [{name: "Walls", goal: 3, cost: 50}]})).ok, true);
  assert.equal(Own.factionPool("f1"), 5);
});

test("working places keep their market supplied; private trade stops 1948 to 1989", async () => {
  const r = await (await town.createEmbeddedDocuments("Region", [{name: "Smithy", flags: {[MOD]: {owner: {id: bert.uuid, kind: "actor", name: bert.name}, property: {type: "smithy"}}}}]))[0];
  year = 1970;
  marketState.markets[0].supply.tools = "short";
  assert.equal((await Own.workshopsMonth()).length, 0);
  year = 1400;
  const ch = await Own.workshopsMonth();
  assert.ok(ch.some(c => c.cat === "tools" && c.to === "normal"));
  assert.equal(marketState.markets[0].supply.tools, "normal");
  await r.delete();
});
