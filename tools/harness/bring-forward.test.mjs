import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Bring forward on the anachronism card (WoDX Sheets 0.17.0, Interactables 0.37.0; B2720, B2721) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)).href);
const IR = await imp("modules/wodx-interactables/scripts/interact-rules.mjs");
const AR = await imp("modules/wodx-sheets/scripts/anachronism-rules.mjs");
const G = await imp("modules/wodx-library/data/goods.mjs");

const spanOk = (p, y) => (!Number.isFinite(p.from) || y >= p.from) && (!Number.isFinite(p.until) || y <= p.until);
const FAMS = {light: ["lightKind", IR.LIGHTS], mount: ["mountKind", IR.MOUNTS], watch: ["watchKind", IR.WATCHES]};

test("each kind out of its year turns into the nearest kind in use then, both ways in time", () => {
  const one = (f, year) => IR.bringForward(f, {year});
  assert.deepEqual(one({mount: true, mountKind: "car"}, 1850).patch, {mountKind: "carriage"});
  assert.deepEqual(one({mount: true, mountKind: "motorbike"}, 1850).patch, {mountKind: "horse"});
  assert.deepEqual(one({mount: true, mountKind: "motorboat"}, 1600).patch, {mountKind: "boat"});
  assert.deepEqual(one({mount: true, mountKind: "carriage"}, 2020).patch, {mountKind: "car"});
  assert.deepEqual(one({light: true, lightKind: "switch"}, 1300).patch, {lightKind: "lamp"});
  assert.deepEqual(one({light: true, lightKind: "lamp"}, 2000).patch, {lightKind: "switch"});
  assert.deepEqual(one({watch: true, watchKind: "radio"}, 1900).patch, {watchKind: "phone"});
  assert.deepEqual(one({watch: true, watchKind: "radio"}, 1700).patch, {watchKind: "bell"}, "a radio in 1700 passes the telephone and ends at a bell");
  assert.deepEqual(one({mount: true, mountKind: "car"}, 1950).patch, {}, "in its time, nothing changes");
});

test("a keypad before 1970 becomes a lock of its grade; sprinklers and live wires have nothing like them", () => {
  const k = IR.bringForward({container: true, kind: "safe", electronic: "excellent"}, {year: 1800});
  assert.deepEqual(k.patch, {electronic: "none", lock: "excellent"});
  assert.deepEqual(k.was, {electronic: "excellent", lock: null});
  const k2 = IR.bringForward({electronic: "cheap", lock: "masterwork"}, {wall: true, year: 1800});
  assert.deepEqual(k2.patch, {electronic: "none"}, "a door that has a lock keeps its own");
  assert.equal(IR.bringForward({watch: true, watchKind: "sprinkler"}, {year: 1500}).none[0].label, "Fire sprinklers");
  assert.equal(IR.bringForward({hazard: true, hazardKind: "shock"}, {year: 1500}).none[0].key, "hazard");
});

test("a title the Storyteller wrote stays; the kind's own label goes with the kind; keys pick the parts", () => {
  assert.deepEqual(IR.bringForward({mount: true, mountKind: "car", title: "Motor car"}, {year: 1850}).patch, {mountKind: "carriage", title: ""});
  assert.deepEqual(IR.bringForward({mount: true, mountKind: "car", title: "The mayor's Benz"}, {year: 1850}).patch, {mountKind: "carriage"});
  assert.deepEqual(IR.bringForward({container: true, electronic: "good"}, {year: 1850, keys: ["mount"]}).patch, {});
  assert.deepEqual(IR.bringForward({mount: true, mountKind: "car"}, {year: 0}).patch, {}, "no year, no change");
});

test("every era: after Bring forward each thing is in its time or named as having nothing like it", () => {
  const years = [...new Set(Object.values(G.ERA_YEARS).flat())];
  for ( const [fam, [flag, list]] of Object.entries(FAMS) ) for ( const kind of Object.keys(list) ) for ( const y of years ) {
    const f = {[fam]: true, [flag]: kind}, r = IR.bringForward(f, {year: y});
    const after = IR.datedParts({...f, ...r.patch});
    for ( const p of after.parts ) assert.ok(spanOk(p, y) || r.none.some(n => n.key === p.key), `${kind} in ${y}`);
  }
  for ( const y of years ) {
    const r = IR.bringForward({container: true, electronic: "good"}, {year: y});
    assert.ok(IR.datedParts({container: true, electronic: "good", ...r.patch}).parts.every(p => spanOk(p, y)), `keypad in ${y}`);
  }
});

test("goods: a line becomes the everyday good of that year, keeping its count", () => {
  const latin = (g, y) => G.inUseAt(g, y, {way: "latin"});
  assert.equal(AR.goodsSwap("a tallow candle", G.GOODS, 2020, G.valueAt, latin), "a votive candle", "the same thing by name first");
  assert.equal(AR.goodsSwap("a silver penny (7)", G.GOODS, 1900, G.valueAt, latin), "a silver thaler (7)");
  assert.equal(AR.goodsSwap("a banknote", G.GOODS, 1300, G.valueAt, latin), "a silver penny");
  assert.equal(AR.goodsSwap("a banknote", G.GOODS, 1950, G.valueAt), null, "in its time: nothing to do");
  assert.equal(AR.goodsSwap("Compendium.world.wodx-gear.Item.abc", G.GOODS, 1300, G.valueAt), null, "not an everyday good");
  const t = AR.swapLines("a banknote (3)\nBread\na banknote (3)", l => AR.goodsSwap(l, G.GOODS, 1300, G.valueAt, latin), ["a banknote (3)", "bread"]);
  assert.equal(t.text, "a silver penny (3)\nBread\na silver penny (3)");
  assert.deepEqual(t.none, ["Bread"]);
});

test("goods in every era: whatever a line becomes is in use in that year", () => {
  const years = [-2000, -500, 300, 1197, 1400, 1550, 1700, 1870, 1916, 1950, 1995, 2004, 2050, 2099];
  const sample = G.GOODS.filter((g, i) => !g.ways && i % 7 === 0);
  let swapped = 0;
  for ( const g of sample ) for ( const y of years ) {
    const to = AR.goodsSwap(g.name, G.GOODS, y, G.valueAt);
    if ( !to ) continue;
    swapped++;
    const ng = G.GOODS.find(x => x.name === to);
    assert.ok(ng && G.inUseAt(ng, y), `${g.name} -> ${to} in ${y}`);
  }
  assert.ok(swapped > 500, `swapped ${swapped}`);
});

/* The Foundry side, against a mock world */
const coll = docs => { const m = new Map(docs.map(d => [d.id, d])); m.contents = docs; m.getName = n => docs.find(d => d.name === n) ?? null; return m; };
const doc = (id, data) => ({id, ...data, flags: data.flags ?? {}, async update(ch) {
  for ( const [k, v] of Object.entries(ch) ) { const path = k.split("."); let o = this; while ( path.length > 1 ) { const p = path.shift(); o = o[p] ??= {}; } o[path[0]] = v; }
}});
const IX = "wodx-interactables", MOD = "wodx-sheets";
const scene = (id, name, walls, tiles) => ({id, name, walls: coll(walls), tiles: coll(tiles), async view() {}});
const car = doc("t1", {x: 0, y: 0, width: 50, height: 50, flags: {[IX]: {mount: true, mountKind: "car", title: "Motor car"}}});
const chest = doc("t2", {x: 0, y: 0, width: 50, height: 50, flags: {[IX]: {container: true, kind: "chest", items: "a banknote (4)\nBread"}}});
const phone = doc("t3", {x: 0, y: 0, width: 50, height: 50, flags: {[IX]: {watch: true, watchKind: "phone"}}});
const kept = doc("t4", {x: 0, y: 0, width: 50, height: 50, flags: {[IX]: {mount: true, mountKind: "motorbike"}, [MOD]: {keepOutOfEra: true}}});
const sprink = doc("t5", {x: 0, y: 0, width: 50, height: 50, flags: {[IX]: {watch: true, watchKind: "sprinkler"}}});
const door = doc("w1", {c: [0, 0, 100, 0], door: 1, flags: {[IX]: {electronic: "good"}}});
const s1 = scene("s1", "Market square", [door], [car, chest, phone, kept, sprink]);
const posted = [], notes = [];
let ixOn = true;
globalThis.canvas = {scene: null, async animatePan() {}};
globalThis.ui = {notifications: {info: m => notes.push(m), warn: m => notes.push(m)}};
globalThis.ChatMessage = {create: async d => { posted.push(d); return d; }, getWhisperRecipients: () => [{id: "gm"}]};
globalThis.game = {
  user: {isGM: true, id: "gm"}, users: {activeGM: {id: "gm"}}, world: {id: "rothenstein-wodx"},
  actors: coll([]), scenes: coll([s1]), items: coll([]),
  settings: {get: () => "on", set: async () => {}, register() {}},
  modules: {get: id => id === IX ? {active: ixOn, api: ixOn ? {rules: IR, fill: {index: async () => []}} : null}
    : id === "wodx-chronicle" ? {active: true, api: {eras: {activeEra: () => ({profile: {id: "dark-ages"}}), currentYear: () => 1300}, isSkipping: () => false,
      world: {here: () => ({id: "moravia"}), rules: {sphereFor: () => "latin"}}}} : null}
};
const AN = await imp("modules/wodx-sheets/scripts/anachronism.mjs");

test("the card has Bring forward for the maps, and one on each row", async () => {
  posted.length = 0;
  const m = await AN.report({year: 2020}, {era: "dark-ages", year: 1300}, []);
  assert.equal((m.content.match(/data-wodx-bring-forward/g) ?? []).length, 1);
  assert.equal((m.content.match(/data-wodx-forward-map=/g) ?? []).length, (m.content.match(/data-wodx-keep-map=/g) ?? []).length);
});

test("Bring forward swaps every thing out of its time, says what has nothing like it, and Undo puts it back", async () => {
  posted.length = 0;
  const rows = await AN.scanMaps({}, {era: "dark-ages", year: 1300});
  const m = await AN.bringForward(rows, {era: "dark-ages", year: 1300});
  assert.equal(car.flags[IX].mountKind, "carriage");
  assert.equal(car.flags[IX].title, "", "the old kind's label goes");
  assert.equal(phone.flags[IX].watchKind, "bell");
  assert.equal(door.flags[IX].electronic, "none");
  assert.equal(door.flags[IX].lock, "good");
  assert.equal(chest.flags[IX].items, "a silver penny (4)\nBread", "the scene's way of life picks the coin");
  assert.equal(kept.flags[IX].mountKind, "motorbike", "a kept thing is left alone");
  assert.equal(sprink.flags[IX].watchKind, "sprinkler");
  assert.match(m.content, /Brought to 1300/);
  assert.match(m.content, /Motor car is now Carriage or coach/);
  assert.match(m.content, /Nothing like these is found in 1300/);
  assert.match(m.content, /Fire sprinklers/);
  assert.deepEqual(m.whisper, ["gm"]);
  assert.equal((await AN.scanMaps({}, {year: 1300})).filter(r => r.id !== "t5").length, 0, "only the sprinklers are left");
  assert.equal(await AN.undoForward(m.flags[MOD].broughtForward.undo), 4);
  assert.equal(car.flags[IX].mountKind, "car");
  assert.equal(car.flags[IX].title, "Motor car");
  assert.equal(door.flags[IX].electronic, "good");
  assert.equal(door.flags[IX].lock, null);
  assert.equal(chest.flags[IX].items, "a banknote (4)\nBread");
  assert.equal(phone.flags[IX].watchKind, "phone");
});

test("one row at a time; forward from the past to the present; without Interactables a warning and nothing else", async () => {
  await AN.bringForward([{scene: "s1", id: "t1", wall: false, key: "mount"}], {year: 1300});
  assert.equal(car.flags[IX].mountKind, "carriage");
  assert.equal(phone.flags[IX].watchKind, "phone", "only the row pressed");
  const m = await AN.bringForward(null, {year: 2020});
  assert.equal(car.flags[IX].mountKind, "car", "a carriage in 2020 is a motor car again");
  assert.match(m.content, /Brought to 2020/);
  assert.equal(await AN.bringForward(null, {year: 2020}), null, "nothing left to bring");
  assert.match(notes.at(-1), /Nothing on the maps needs bringing/);
  ixOn = false;
  assert.equal(await AN.bringForward(null, {year: 1300}), null);
  assert.match(notes.at(-1), /Interactables 0\.37\.0/);
  ixOn = true;
});
