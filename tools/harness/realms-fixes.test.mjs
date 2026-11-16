// B6797, B6798: the Maelstrom strikes the selected tokens; a Bridge opened or a Wayfare portal stands on the map as a way.
import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
mock.asGM();
const M = "wodx-otherworlds";
const faces = [];
globalThis.Roll = class { constructor(f) { this.formula = f; } async evaluate() { const k = Number(this.formula.split("d")[0]); this.dice = [{results: (faces.length ? faces.shift() : Array(k).fill(8)).map(result => ({result}))}]; return this; } };
const waits = [];
foundry.applications.api.DialogV2.wait = async opts => { const fn = waits.shift(); if ( !fn ) throw new Error(`Unexpected dialog: ${opts?.window?.title}`); return fn(opts); };
globalThis.canvas = {ready: false, tokens: {controlled: []}};
class Col extends Map { [Symbol.iterator]() { return this.values(); } }
game.scenes = new Col();
const R = await import(join(root, "modules/wodx-otherworlds/scripts/realms.mjs"));

let n = 0;
function makeScene(name, layers = ["physical", "penumbra", "dreaming"]) {
  const regions = [];
  const sc = {id: `s${++n}`, name, grid: {size: 100}, dimensions: {sceneX: 0, sceneY: 0, sceneWidth: 2000, sceneHeight: 2000}, regions,
    levels: layers.map((l, i) => ({id: `${name}-l${i}`, flags: {[M]: {layer: l}}, getFlag(s, k) { return this.flags?.[s]?.[k]; }})),
    async createEmbeddedDocuments(type, data) {
      return data.map(d => { const r = {...d, id: `r${++n}`, parent: sc, behaviors: [], async createEmbeddedDocuments(t, bs) { this.behaviors.push(...bs); return bs; }}; r.uuid = `Scene.${sc.id}.Region.${r.id}`; regions.push(r); return r; });
    }};
  game.scenes.set(sc.id, sc);
  return sc;
}
const tok = (name, scene, actor = {name, system: {attributes: {wits: {value: 3}}, abilities: {enigmas: {value: 3}}}}) => ({id: name, name, actor, parent: scene, texture: {tint: "#ffffff"}, async update() {}});

test("the Maelstrom strikes each selected token through WoDX Combat's soak, lethal, the Haunt added to soak (B6797)", async () => {
  const calls = [];
  game.wodxCombat = {soakAndApply: async (doc, fd) => { calls.push({name: doc.name, ...fd}); return {levels: 2}; }};
  const here = makeScene("The Necropolis gate");
  const r = await R.maelstromStrike([tok("Ash", here), tok("Bell", here)], {bells: 4, haunt: 1});
  assert.equal(r.dice, 12);
  assert.deepEqual(calls.map(c => [c.name, c.amount, c.type, c.mode, c.soak, c.soakBonus]), [["Ash", 12, "lethal", "pool", true, 1], ["Bell", 12, "lethal", "pool", true, 1]]);
  assert.match(mock.log.chat.at(-1).content, /Ash: 2 lethal; Bell: 2 lethal/);
});

test("a Haunt that holds the bells off shelters them: nobody is struck", async () => {
  const calls = [];
  game.wodxCombat = {soakAndApply: async doc => { calls.push(doc.name); return {levels: 1}; }};
  const r = await R.maelstromStrike([tok("Ash", makeScene("A Haunt"))], {bells: 2, haunt: 3});
  assert.equal(r.sheltered, true);
  assert.deepEqual(calls, []);
});

test("the rolls window's Maelstrom strikes the selected tokens, not only a card", async () => {
  const calls = [];
  game.wodxCombat = {soakAndApply: async doc => { calls.push(doc.name); return {levels: 1}; }};
  const here = makeScene("Open ground");
  canvas.tokens.controlled = [{document: tok("Cole", here)}];
  waits.push(() => ({kind: "maelstrom", bells: "1", haunt: "0"}));
  await R.rollsDialog();
  assert.deepEqual(calls, ["Cole"]);
});

test("an Opened Bridge that opens stands on the map: a Moon Path way to the far caern's scene (B6798)", async () => {
  const here = makeScene("Caern of the Hollow Oak"), far = makeScene("Caern of the White Stag");
  canvas.tokens.controlled = [{document: tok("Ritemaster", here)}];
  faces.push([8, 8, 8, 8, 8, 8]);
  waits.push(() => ({kind: "bridge", caern: "3", target: "3", totem: false, failed: false}));
  waits.push(opts => { const form = document.createElement("form"); form.innerHTML = opts.content; form.elements.to.value = far.id; return opts.buttons[0].callback(null, {form}); });
  const res = await R.rollsDialog();
  assert.equal(res.open, true);
  assert.ok(res.way?.from && res.way?.to, "a region at each end");
  assert.equal(here.regions[0].flags[M].way, "moonpath");
  assert.equal(here.regions[0].levels[0], here.levels[1].id, "on the Penumbra level");
  assert.deepEqual(here.regions[0].behaviors[0].system.destinations, [far.regions[0].uuid]);
});

test("a Wayfare portal makes a trod between the Near Dreaming levels; Not on the map makes nothing", async () => {
  const here = makeScene("The Silver Glade"), far = makeScene("The Thorn Court");
  const fae = {name: "Bramble", type: "Changeling", items: [{name: "Wayfare", system: {value: 3}}, {name: "Fae Realm", system: {value: 5}}]};
  canvas.tokens.controlled = [{document: tok("Bramble", here, fae)}];
  faces.push([9, 9, 2, 3, 4, 5, 6, 7]);
  waits.push(() => ({kind: "wayfare"}));
  waits.push(opts => { const form = document.createElement("form"); form.innerHTML = opts.content; form.elements.to.value = far.id; return opts.buttons[0].callback(null, {form}); });
  const res = await R.rollsDialog();
  assert.equal(here.regions[0].flags[M].way, "trod");
  assert.ok(res.way);
  const lone = makeScene("Nowhere much");
  canvas.tokens.controlled = [{document: tok("Bramble", lone, fae)}];
  faces.push([9, 9, 2, 3, 4, 5, 6, 7]);
  waits.push(() => ({kind: "wayfare"}));
  waits.push(() => "none");
  const r2 = await R.rollsDialog();
  assert.equal(r2.way, null);
  assert.equal(lone.regions.length, 0);
});

test("a world with no loop file says so once instead of a sound switch that seems dead (B6793)", async () => {
  const seen = new Map(), reg = game.settings.register;
  game.settings.register = (ns, key, data) => { seen.set(`${ns}.${key}`, data); return reg.call(game.settings, ns, key, data); };
  R.registerRealmSettings();
  game.settings.register = reg;
  const hint = seen.get("wodx-otherworlds.layerSound")?.hint ?? "";
  assert.match(hint, /ships no loops yet: nothing plays until/);
  const lv = {id: "pen", flags: {[M]: {layer: "penumbra"}}, getFlag(s, k) { return this.flags?.[s]?.[k]; }};
  const scene = {levels: new Map([["pen", lv]])};
  canvas.tokens.controlled = [{document: {parent: scene, _source: {level: "pen"}, actor: {statuses: new Set()}}}];
  globalThis.fetch = async () => ({ok: false});
  const before = mock.log.notifications.length;
  assert.equal(await R.applyLayerSound(), null);
  await R.applyLayerSound();
  const told = mock.log.notifications.slice(before).filter(([, m]) => /No sound for this world yet: wodx-kits\/layers\/penumbra\.ogg/.test(m));
  assert.equal(told.length, 1);
});
