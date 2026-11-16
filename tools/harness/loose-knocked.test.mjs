/* B6788: a weapon knocked out of a hand lands on the map as loose gear, where it was sent, for anyone to pick up. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";

globalThis.Hooks = {on() {}, once() {}, callAll() {}};
const gm = {id: "gm", isGM: true};
const chat = [];
globalThis.game = {user: gm, users: {activeGM: gm}, settings: {get: () => null}, modules: new Map(), socket: {on() {}, emit() {}}};
globalThis.ChatMessage = {create: async d => { chat.push(d); return d; }};
globalThis.canvas = {ready: false};
const tiles = new Map();
const scene = {id: "s1", grid: {size: 100}, tiles: {get contents() { return [...tiles.values()]; }},
  async createEmbeddedDocuments(type, list) { return list.map((d, i) => { const t = {...d, id: `t${tiles.size + i}`, async update(u) { Object.assign(this, u); return this; }}; tiles.set(t.id, t); return t; }); }};
const items = [{id: "w1", name: "Mace", type: "Melee Weapon", system: {isequipped: true}, toObject() { return {_id: "w1", name: "Mace", type: "Melee Weapon", system: {isequipped: true}}; }}];
const actor = {name: "Guard", items: Object.assign(items, {get: id => items.find(i => i.id === id)}),
  async deleteEmbeddedDocuments(type, ids) { for ( const id of ids ) items.splice(items.findIndex(i => i.id === id), 1); }};
const tok = {id: "tk", name: "Guard", x: 200, y: 200, width: 1, height: 1, elevation: 0, actor, parent: scene};
const LS = await import("../../modules/wodx-interactables/scripts/loose.mjs");
const api = LS.setupLoose({});

test("a weapon knocked away lands as a pile where it was sent, unequipped, and leaves the sheet", async () => {
  const pile = await api.setDown(tok, ["w1"], {at: {x: 560, y: 250}, how: "loses hold of Mace: it lands 3 yards away."});
  assert.ok(pile, "a pile");
  assert.equal(pile.x, 500); assert.equal(pile.y, 200, "on the square it was sent to, not the guard's");
  const f = pile.flags["wodx-interactables"];
  assert.deepEqual(f.items, ["Mace"]);
  assert.equal(f.loose[0].data.system.isequipped, false, "a thing on the ground is not in anyone's hand");
  assert.equal(items.length, 0, "gone from the sheet");
  assert.match(chat.at(-1).content, /Knocked away/);
  assert.match(chat.at(-1).content, /loses hold of Mace: it lands 3 yards away/);
});
