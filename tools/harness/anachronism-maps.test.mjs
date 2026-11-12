import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* The anachronism check reads the maps (WoDX Sheets 0.14.0): the Foundry side against a mock world */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const IR = await import(pathToFileURL(join(root, "modules/wodx-interactables/scripts/interact-rules.mjs")).href);

const coll = docs => { const m = new Map(docs.map(d => [d.id, d])); m.contents = docs; m.getName = n => docs.find(d => d.name === n) ?? null; return m; };
const doc = (id, data) => ({id, ...data, flags: data.flags ?? {}, async update(ch) {
  for ( const [k, v] of Object.entries(ch) ) { const path = k.split("."); let o = this; while ( path.length > 1 ) { const p = path.shift(); o = o[p] ??= {}; } o[path[0]] = v; }
}});
const IX = "wodx-interactables", MOD = "wodx-sheets";
const scene = (id, name, walls, tiles) => ({id, name, walls: coll(walls), tiles: coll(tiles), viewed: 0, async view() { this.viewed++; globalThis.canvas.scene = this; }});
const car = doc("t1", {x: 100, y: 200, width: 100, height: 50, flags: {[IX]: {mount: true, mountKind: "car"}}});
const safe = doc("t2", {x: 0, y: 0, width: 50, height: 50, flags: {[IX]: {container: true, kind: "safe", items: "Compendium.world.wodx-gear.Item.abc\nBread\nWorld pistol (2)"}}});
const horse = doc("t3", {x: 0, y: 0, width: 50, height: 50, flags: {[IX]: {mount: true, mountKind: "horse"}}});
const plain = doc("t4", {x: 0, y: 0, width: 50, height: 50});
const door = doc("w1", {c: [0, 0, 100, 0], door: 1, flags: {[IX]: {electronic: "good"}}});
const wallOnly = doc("w2", {c: [0, 0, 100, 0], door: 0, flags: {[IX]: {electronic: "good"}}});
const s1 = scene("s1", "Market square", [door, wallOnly], [car, safe, horse, plain]);
const s2 = scene("s2", "Castle", [], [doc("t9", {x: 0, y: 0, width: 10, height: 10, flags: {[IX]: {watch: true, watchKind: "phone", title: "<b>Hall</b> phone"}}})]);

const posted = [], settings = new Map([[`${MOD}.anachronism`, "on"], [`${MOD}.anachronismAt`, {}]]), notes = [];
let year = 1850, ixOn = true;
globalThis.canvas = {scene: null, pans: [], async animatePan(p) { this.pans.push(p); }};
globalThis.ui = {notifications: {info: m => notes.push(m), warn: m => notes.push(m)}};
globalThis.ChatMessage = {create: async d => { posted.push(d); return d; }, getWhisperRecipients: () => [{id: "gm"}]};
globalThis.game = {
  user: {isGM: true, id: "gm"}, users: {activeGM: {id: "gm"}}, world: {id: "rothenstein-wodx"},
  actors: coll([]), scenes: coll([s1, s2]),
  items: coll([{id: "i1", name: "World pistol", flags: {"wodx-library": {firstYear: 1600, lastYear: 1850}}}]),
  settings: {get: (m, k) => settings.get(`${m}.${k}`), set: async (m, k, v) => settings.set(`${m}.${k}`, v), register() {}},
  modules: {get: id => id === IX ? {active: ixOn, api: {rules: IR, fill: {index: async () => [{name: "Revolver", uuid: "Compendium.world.wodx-gear.Item.abc", flags: {"wodx-library": {firstYear: 1836}}}]}}}
    : id === "wodx-chronicle" ? {active: true, api: {eras: {activeEra: () => ({profile: {id: "victorian"}}), currentYear: () => year}, isSkipping: () => false}} : null}
};
const AN = await import(pathToFileURL(join(root, "modules/wodx-sheets/scripts/anachronism.mjs")).href);

test("the maps are read: doors and tiles with something dated, on every scene", () => {
  const things = AN.mapThings();
  assert.deepEqual(things.map(t => t.id).sort(), ["t1", "t2", "t9", "w1"], "the horse, the bare tile and the wall that is no door say nothing");
  assert.equal(things.find(t => t.id === "w1").wall, true);
});

test("back to 1850: the card lists the car, the keypad and the telephone by scene, with Keep it and Show me", async () => {
  const found = await AN.scanMaps({era: "modern", year: 2020}, {era: "victorian", year: 1850});
  assert.deepEqual(found.map(f => `${f.scene} ${f.id} ${f.key}`).sort(), ["s1 t1 mount", "s1 w1 electronic", "s2 t9 watch"]);
  posted.length = 0;
  const m = await AN.report({era: "modern", year: 2020}, {era: "victorian", year: 1850}, []);
  assert.ok(m && posted.length === 1);
  assert.match(m.content, /On the maps/);
  assert.match(m.content, /<b>Market square<\/b>/);
  assert.match(m.content, /Motor car: not made yet in 1850/);
  assert.match(m.content, /&lt;b&gt;Hall&lt;\/b&gt; phone/, "a title is escaped");
  assert.equal((m.content.match(/data-wodx-keep-map=/g) ?? []).length, 3);
  assert.equal((m.content.match(/data-wodx-show-map=/g) ?? []).length, 3);
  assert.equal((m.content.match(/data-wodx-keep=/g) ?? []).length, 0, "no sheet rows");
  assert.deepEqual(m.whisper, ["gm"]);
  // The button's reference reads back as [scene, id, wall, key]
  const raw = /data-wodx-keep-map="([^"]+)"/.exec(m.content)[1].replaceAll("&quot;", '"').replaceAll("&amp;", "&");
  assert.equal(JSON.parse(raw).length, 4);
});

test("forward to 1900: the revolver by its link is fine, the world pistol in the safe is an antique", async () => {
  const found = await AN.scanMaps({year: 1840}, {era: "victorian", year: 1900});
  assert.deepEqual(found.map(f => f.key), ["goods:world pistol (2)"]);
  assert.match(found[0].name, /World pistol, in safe/);
  const early = await AN.scanMaps({year: 1900}, {year: 1800});
  assert.ok(early.some(f => f.key === "goods:compendium.world.wodx-gear.item.abc" && /Revolver/.test(f.name)), "a linked thing is read by its link and named");
});

test("Keep it marks the thing or the line, and the next read leaves it out; Show me opens the scene there", async () => {
  assert.equal(await AN.keepThing("s1", "t1", false, "mount"), true);
  assert.equal(car.flags[MOD].keepOutOfEra, true);
  assert.equal(await AN.keepThing("s1", "t2", false, "goods:world pistol (2)"), true);
  await AN.keepThing("s1", "t2", false, "goods:world pistol (2)");
  assert.deepEqual(safe.flags[MOD].keptGoods, ["world pistol (2)"]);
  assert.equal((await AN.scanMaps({year: 1840}, {year: 1900})).length, 0);
  assert.ok(!(await AN.scanMaps({year: 2020}, {year: 1850})).some(f => f.id === "t1"));
  assert.equal(await AN.keepThing("s1", "nope", false, "mount"), false);
  assert.equal(await AN.showThing("s1", "t1", false), true);
  assert.equal(s1.viewed, 1);
  assert.deepEqual({x: canvas.pans.at(-1).x, y: canvas.pans.at(-1).y}, {x: 150, y: 225});
  await AN.showThing("s1", "w1", true);
  assert.equal(s1.viewed, 1, "already on that scene");
  assert.deepEqual({x: canvas.pans.at(-1).x, y: canvas.pans.at(-1).y}, {x: 50, y: 0});
  assert.equal(await AN.showThing("s9", "t1", false), false);
});

test("the clock check raises map things on a jump; Out of their time lists everything now; nothing without Interactables", async () => {
  posted.length = 0; year = 1850;
  settings.set(`${MOD}.anachronismAt`, {era: "modern", year: 2020});
  const m = await AN.check();
  assert.ok(m && /keypad/i.test(m.content) && !/Motor car/.test(m.content), "the kept car stays quiet");
  assert.deepEqual(settings.get(`${MOD}.anachronismAt`), {era: "victorian", year: 1850});
  assert.equal(await AN.check(), null, "no second card for the same year");
  const all = await AN.everything();
  assert.match(all.content, /Everything that does not belong to 1850/);
  assert.match(all.content, /keypad/i);
  ixOn = false;
  assert.deepEqual(AN.mapThings(), []);
  assert.equal(await AN.everything(), null);
  assert.match(notes.at(-1), /Nothing on the sheets or the maps/);
  ixOn = true;
});

test("a long list is cut and the rest counted", async () => {
  const many = Array.from({length: 75}, (x, i) => doc(`m${i}`, {x: 0, y: 0, width: 1, height: 1, flags: {[IX]: {mount: true, mountKind: "car"}}}));
  const big = scene("s3", "Car park", [], many);
  posted.length = 0;
  const rows = await AN.scanMaps({}, {year: 1850}, [big]);
  assert.equal(rows.length, 75);
  const m = await AN.report({}, {year: 1850}, [], {maps: rows, all: true});
  assert.equal((m.content.match(/data-wodx-keep-map=/g) ?? []).length, 60);
  assert.match(m.content, /And 15 more on the maps/);
  assert.equal(await AN.report({}, {year: 1850}, [], {maps: false}), null);
});
