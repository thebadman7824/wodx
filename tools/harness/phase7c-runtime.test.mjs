import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/*
 * Phase 7c: the routines and reactions runtime (routines.mjs) on a small stand-in for Foundry: one square grid of
 * 100-pixel cells, scenes with regions, linked NPCs, a chat log. It is not Foundry: the gate in Foundry checks the real
 * canvas, walls and region events.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MOD = "wodx-npc";

/* ---- the stand-in ---- */
const uuids = new Map();
const clone = o => (o === undefined ? o : structuredClone(o));
function setPath(obj, path, value) {
  const parts = path.split(".");
  let o = obj;
  for ( let k = 0; k < parts.length - 1; k++ ) o = (o[parts[k]] ??= {});
  const last = parts.at(-1);
  if ( last.startsWith("-=") ) delete o[last.slice(2)];
  else o[last] = clone(value);
}
const applyUpdate = (doc, data) => { for ( const [k, v] of Object.entries(data) ) if ( k !== "_id" ) setPath(doc, k, v); };
class Coll extends Map {
  get contents() { return [...this.values()]; }
  find(f) { return this.contents.find(f); }
  filter(f) { return this.contents.filter(f); }
  some(f) { return this.contents.some(f); }
  [Symbol.iterator]() { return this.values(); }
}
let idn = 0;
const newId = p => `${p}${String(++idn).padStart(12, "0")}`;

const SIZE = 100;
function region(scene, name, rect, place = null) {
  const r = {id: newId("reg"), name, parent: scene, flags: place ? {[MOD]: {place}} : {}, shapes: [{type: "rectangle", ...rect}], behaviors: [], elevation: {bottom: 0},
    testPoint: p => p.x >= rect.x && p.x < rect.x + rect.width && p.y >= rect.y && p.y < rect.y + rect.height};
  r.uuid = `${scene.uuid}.Region.${r.id}`;
  uuids.set(r.uuid, r);
  scene.regions.set(r.id, r);
  return r;
}
function scene(name, place = null) {
  const s = {id: newId("scn"), name, flags: place ? {[MOD]: {place}} : {}, regions: new Coll(), tokens: new Coll()};
  s.uuid = `Scene.${s.id}`;
  uuids.set(s.uuid, s);
  s.createEmbeddedDocuments = async (type, list, opts = {}) => list.map(d => makeToken(s, d, opts.keepId));
  s.updateEmbeddedDocuments = async (type, ups) => ups.map(u => { const r = s.regions.get(u._id); applyUpdate(r, u); return r; });
  game.scenes.set(s.id, s);
  return s;
}
function refreshRegions(t) {
  const c = {x: t.x + SIZE / 2, y: t.y + SIZE / 2};
  t.regions = new Set(t.parent.regions.filter(r => r.testPoint(c)));
}
function makeToken(s, data, keepId = false) {
  const actor = game.actors.get(data.actorId);
  const t = {id: keepId && data._id ? data._id : newId("tok"), actorId: data.actorId, x: data.x, y: data.y, width: 1, height: 1, hidden: false, disposition: data.disposition ?? -1,
    flags: clone(data.flags ?? {}), parent: s, name: actor?.name};
  Object.defineProperty(t, "actor", {get: () => game.actors.get(t.actorId), enumerable: false});
  t.uuid = `${s.uuid}.Token.${t.id}`;
  t.update = async (d) => { applyUpdate(t, d); refreshRegions(t); return t; };
  t.delete = async () => { s.tokens.delete(t.id); uuids.delete(t.uuid); placeables(); return t; };
  t.toObject = () => ({_id: t.id, actorId: t.actorId, x: t.x, y: t.y, flags: clone(t.flags), disposition: t.disposition});
  t.getFlag = (sc, k) => t.flags?.[sc]?.[k];
  refreshRegions(t);
  s.tokens.set(t.id, t);
  uuids.set(t.uuid, t);
  // The placeable
  t.object = {id: t.id, document: t, get name() { return t.name; }, get actor() { return t.actor; },
    get center() { return {x: t.x + SIZE / 2, y: t.y + SIZE / 2}; }, w: SIZE, h: SIZE};
  placeables();
  return t;
}
function placeables() {
  canvas.tokens.placeables = canvas.scene ? canvas.scene.tokens.contents.map(t => t.object) : [];
}
function actor(name, {template = "guard", routine = null, pc = false, stats = {}} = {}) {
  const a = {id: newId("act"), name, type: "Mortal", hasPlayerOwner: pc, flags: {[MOD]: {behavior: {template}, ...(routine ? {routine} : {})}},
    prototypeToken: {width: 1, height: 1}, statuses: new Set(), items: [],
    system: {attributes: {perception: {value: stats.perception ?? 3}, dexterity: {value: stats.dexterity ?? 2}, manipulation: {value: 2}},
      abilities: {alertness: {value: stats.alertness ?? 2}, stealth: {value: stats.stealth ?? 0}, awareness: {value: 0}, subterfuge: {value: 0}}}};
  a.uuid = `Actor.${a.id}`;
  a.update = async d => { applyUpdate(a, d); return a; };
  a.getFlag = (sc, k) => a.flags?.[sc]?.[k];
  a.getTokenDocument = async d => ({toObject: () => ({...clone(d), actorId: a.id})});
  game.actors.set(a.id, a);
  uuids.set(a.uuid, a);
  return a;
}

const chat = [];
const settings = new Map([["wodx-npc.routineMode", "suggest"], ["wodx-npc.curfewStart", 21], ["wodx-npc.feasts", ""], ["wodx-npc.mode", "suggest"], ["wodx-chronicle.latitude", 50]]);
globalThis.game = {
  user: {isGM: true, id: "gm"}, users: {activeGM: {id: "gm"}, filter: f => [{id: "gm", isGM: true}].filter(f)},
  actors: new Coll(), scenes: new Coll(), combats: new Coll(), model: {RegionBehavior: {}},
  time: {worldTime: 0},
  settings: {get: (m, k) => settings.get(`${m}.${k}`), set: async (m, k, v) => settings.set(`${m}.${k}`, v), register: () => {}},
  messages: new Coll(),
  modules: new Map()
};
globalThis.foundry = {utils: {deepClone: clone, randomID: () => newId("r")}, data: {}, applications: {api: {}}};
globalThis.CONST = {};
globalThis.CONFIG = {Canvas: {polygonBackends: {sight: {testCollision: () => false}}}};
globalThis.fromUuid = async u => uuids.get(u) ?? null;
globalThis.Actor = {updateDocuments: async ups => Promise.all(ups.map(u => game.actors.get(u._id).update(u)))};
globalThis.Scene = {updateDocuments: async ups => ups.map(u => { const s = game.scenes.get(u._id); applyUpdate(s, u); return s; })};
globalThis.ChatMessage = {
  create: async data => {
    const m = {id: newId("msg"), ...clone(data)};
    m.update = async d => { applyUpdate(m, d); return m; };
    chat.push(m); game.messages.set(m.id, m);
    return m;
  },
  getSpeaker: () => ({alias: "npc"})
};
globalThis.Hooks = {on: () => {}, once: () => {}, callAll: () => {}};
globalThis.ui = {notifications: {info: () => {}, warn: () => {}, error: m => { throw new Error(m); }}};
globalThis.canvas = {
  ready: true, scene: null,
  grid: {size: SIZE, getOffset: p => ({i: Math.floor(p.y / SIZE), j: Math.floor(p.x / SIZE)}), getCenterPoint: c => ({x: c.j * SIZE + SIZE / 2, y: c.i * SIZE + SIZE / 2})},
  dimensions: {sceneX: 0, sceneY: 0, sceneWidth: 20 * SIZE, sceneHeight: 20 * SIZE},
  tokens: {placeables: [], get: id => canvas.tokens.placeables.find(t => t.id === id)}
};

/* ---- the module, with stand-in grid helpers ---- */
const NR = await import(join(root, "modules/wodx-npc/scripts/npc-rules.mjs"));
const {build} = await import(join(root, "modules/wodx-npc/scripts/routines.mjs"));
const cellOf = tok => ({i: Math.floor(tok.document.y / SIZE), j: Math.floor(tok.document.x / SIZE)});
const topLeftFor = (tok, c) => ({x: c.j * SIZE, y: c.i * SIZE});
const walls = new Set(); // "i,j|i,j" steps that are blocked
const walked = [];
const ctx = {
  MOD, esc: s => String(s ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"})[c]), gmIds: () => ["gm"], isActiveGM: () => true,
  C: () => ({movementFor: () => ({run: 20})}), chron: () => ({isSkipping: () => false, conditions: {hasCondition: () => false}, eras: {activeEra: () => ({profile: {id: "dark-ages"}})}}),
  profileFor: a => NR.profileOf(a.flags?.[MOD]?.behavior ?? {}, "guard"), H3: "",
  gridKind: () => "square", cellOf, cellsAt: (tok, c) => [c], topLeftFor,
  passableFor: () => (a, b) => !walls.has(`${a.i},${a.j}|${b.i},${b.j}`) && b.i >= 0 && b.j >= 0 && b.i < 20 && b.j < 20,
  stepsFor: () => NR.squareSteps, stepCost: () => NR.squareCost, hexHeuristic: () => () => 0, cellsFor: y => Math.floor(y * 3 / 5),
  walk: async (tok, path) => { walked.push({name: tok.name, path}); const c = path.at(-1); await tok.document.update(topLeftFor(tok, c)); return true; },
  approach: (tok, target) => { const t = cellOf(target); return {path: [cellOf(tok), {i: t.i, j: t.j - 1}]}; },
  yardsBetween: (a, b) => Math.hypot(a.center.x - b.center.x, a.center.y - b.center.y) / SIZE * 5 / 3,
  obvious: () => false, hiddenByObfuscate: tok => tok.actor?.statuses?.has?.("wodx-obfuscated")
};
const RT = build(ctx);
await RT.loadCalendar();
const {getEngine} = await import(join(root, "modules/wodx-chronicle/scripts/calendar.mjs"));
const at = (m, d, h, min = 0) => getEngine().dateToTime({year: 1197, month: m, day: d, hour: h, minute: min});

/* ---- Rothenstein in miniature ---- */
const square = scene("Lower Town · Market Square", {kind: "market"});
const watch = region(square, "The Watch-house", {x: 1000, y: 1000, width: 300, height: 300}, {kind: "gate"});
const door = region(square, "West door", {x: 0, y: 900, width: 100, height: 200});
const yard = region(square, "The church close", {x: 400, y: 0, width: 400, height: 300});
const home = scene("Trespass · Sergeant Heinz's House", {kind: "home", owner: "Heinz"});
const tavern = scene("Locus · The Tavern", {kind: "tavern"});
const heinz = actor("Sergeant Heinz Volker", {template: "guard", routine: {on: true, preset: "night-watch", roles: {home: home.uuid}}});
const ludwig = actor("Ludwig of Regensburg", {template: "civilian", routine: {on: true, preset: "merchant", roles: {work: square.uuid, home: tavern.uuid}}});
const nobody = actor("A passer-by", {template: "civilian"}); // no routine: never moved
const ilse = actor("Ilse", {template: "neonate", pc: true});
const view = s => { canvas.scene = s; placeables(); };
const lastCard = () => chat.at(-1);
const routineCard = () => [...chat].reverse().find(m => m.flags?.[MOD]?.routine);

test("the clock places, walks and removes NPCs on the scene in view; Suggest waits for Accept", async () => {
  view(square);
  game.time.worldTime = at(4, 14, 23); // Monday 23:00: the night watch is on rounds (the streets: the square)
  const r1 = await RT.tick("walk");
  assert.equal(RT.whereOf(heinz).place, square.uuid);
  assert.equal(RT.whereOf(heinz).activity, "patrol");
  assert.equal(RT.whereOf(ludwig).place, tavern.uuid); // home is the tavern here
  assert.deepEqual(r1.items.map(i => i.type), ["place"]);
  assert.equal(square.tokens.size, 0, "Suggest: nothing yet");
  assert.match(routineCard().content, /Sergeant Heinz Volker arrives at Lower Town · Market Square, rounds of the streets/);
  // The same plan is not posted twice
  const n = chat.length;
  await RT.tick("walk");
  assert.equal(chat.length, n);
  await RT.acceptRoutineCard(routineCard());
  assert.equal(square.tokens.size, 1);
  const tok = square.tokens.contents[0];
  assert.equal(tok.flags[MOD].placed, true);
  assert.ok(tok.regions.has(door), "placed at the way in");
  // 01:00: to the watch post, a region of this scene: a walk along a path
  game.time.worldTime = at(4, 15, 1);
  const r2 = await RT.tick("walk");
  assert.deepEqual(r2.items.map(i => i.type), ["walk"]);
  walked.length = 0;
  await RT.acceptRoutineCard(routineCard());
  assert.ok(tok.regions.has(watch), "inside the watch-house");
  assert.equal(walked.length, 1);
  assert.ok(walked[0].path.length >= 2);
  // 07:00: home to sleep, off this scene: removed
  game.time.worldTime = at(4, 15, 7);
  const r3 = await RT.tick("walk");
  // ...and Ludwig opens his stall on the square
  assert.deepEqual(r3.items.map(i => [i.type, i.hand ?? null]), [["remove", false], ["place", null]]);
  await RT.acceptRoutineCard(routineCard());
  assert.equal(square.tokens.filter(t => t.actorId === heinz.id).length, 0);
  assert.equal(square.tokens.filter(t => t.actorId === ludwig.id).length, 1);
  // Undo puts Heinz back where he stood and takes Ludwig away again
  await RT.undoRoutineCard(routineCard());
  assert.equal(square.tokens.size, 1);
  assert.ok(square.tokens.contents[0].regions.has(watch));
});

test("Auto acts with an Undo card, and never removes a token placed by hand", async () => {
  settings.set("wodx-npc.routineMode", "auto");
  view(square);
  // Ludwig placed by hand at 07:00 on a weekday: he should be at work here, so he stays; Heinz's WoDX token goes home
  for ( const t of square.tokens.contents ) await t.delete();
  makeToken(square, {actorId: heinz.id, x: 1000, y: 1000, flags: {[MOD]: {placed: true}}});
  makeToken(square, {actorId: nobody.id, x: 500, y: 500});
  game.time.worldTime = at(4, 15, 8);
  await RT.tick("walk");
  assert.equal(square.tokens.filter(t => t.actorId === heinz.id).length, 0, "Heinz went home");
  assert.equal(square.tokens.filter(t => t.actorId === ludwig.id).length, 1, "Ludwig arrived for work");
  assert.equal(square.tokens.filter(t => t.actorId === nobody.id).length, 1, "an NPC with no routine is left alone");
  assert.match(routineCard().content, /Undo/);
  // A hand-placed Heinz at 08:00 is not removed in Auto: the card waits for the Storyteller
  makeToken(square, {actorId: heinz.id, x: 1500, y: 1500});
  game.time.worldTime = at(4, 15, 8, 30);
  await RT.tick("walk");
  assert.equal(square.tokens.filter(t => t.actorId === heinz.id).length, 1);
  assert.match(routineCard().content, /placed by hand: needs the Storyteller/);
  await RT.acceptRoutineCard(routineCard());
  assert.equal(square.tokens.filter(t => t.actorId === heinz.id).length, 0);
  // Undo of the earlier Auto card brings Heinz's WoDX token back and takes Ludwig away
  const autoCard = chat.filter(m => m.flags?.[MOD]?.routine?.mode === "auto").at(-2);
  await RT.undoRoutineCard(autoCard);
  assert.equal(square.tokens.filter(t => t.actorId === ludwig.id).length, 0);
  settings.set("wodx-npc.routineMode", "suggest");
});

test("a week's skip jumps everyone to where the routine says; a scene opening places without walking", async () => {
  view(square);
  for ( const t of square.tokens.contents ) await t.delete();
  game.time.worldTime = at(4, 15, 8, 30) + 7 * 86400 - 9.5 * 3600; // a week on, 23:00 on Monday
  const r = await RT.tick("skip");
  assert.equal(RT.whereOf(heinz).place, square.uuid);
  assert.ok(r.items.every(i => i.type === "place" && !i.walkIn));
  await RT.acceptRoutineCard(routineCard());
  const tok = square.tokens.find(t => t.actorId === heinz.id);
  assert.ok(tok);
  // Move him by hand out of the watch-house at 01:00: opening the scene jumps him back in, no walk
  game.time.worldTime += 2 * 3600;
  walked.length = 0;
  const o = await RT.tick("open");
  assert.deepEqual(o.items.map(i => i.type), ["jump"]);
  await RT.acceptRoutineCard(routineCard());
  assert.equal(walked.length, 0);
  assert.ok(tok.regions.has(watch));
});

test("a fight pauses a routine and the NPC walks back after; the dead are reported once", async () => {
  view(square);
  const tok = square.tokens.find(t => t.actorId === heinz.id);
  await heinz.update({[`flags.${MOD}.paused`]: {reason: "fight", combatId: "c1"}});
  await tok.update({x: 200, y: 200});
  const r = await RT.tick("walk");
  assert.equal(r.items.length, 0, "paused: left alone");
  await heinz.update({[`flags.${MOD}.-=paused`]: null});
  const back = await RT.tick("resume");
  assert.deepEqual(back.items.map(i => i.type), ["walk"]);
  heinz.statuses.add("dead");
  const n = chat.length;
  await RT.tick("walk");
  assert.match(chat.at(-1).content, /Sergeant Heinz Volker is dead/);
  await RT.tick("walk");
  assert.equal(chat.length, n + 1, "reported once");
  heinz.statuses.delete("dead");
});

test("a Reaction region: the guard notices a player character after curfew and challenges; Obfuscate keeps a Kindred unseen", async () => {
  view(square);
  for ( const t of square.tokens.contents ) await t.delete();
  game.time.worldTime = at(4, 21, 23, 30);
  await RT.tick("jump", {post: false});
  const g = makeToken(square, {actorId: heinz.id, x: 600, y: 100, flags: {[MOD]: {placed: true}}});
  const system = {watchers: "scene", names: "", triggers: new Set(["enter"]), stayMinutes: 10, conditions: new Set(["curfew"]), match: "any",
    private: false, allowed: "", who: "pcs", response: "profile"};
  const pc = makeToken(square, {actorId: ilse.id, x: 500, y: 100, disposition: 1});
  const card = await RT.react(system, yard, pc, "enter");
  const data = card.flags[MOD].reaction;
  assert.equal(data.options[0].action, "challenge");
  assert.match(card.content, /during the curfew/);
  assert.match(card.content, /Sergeant Heinz Volker: notices \(in plain sight\)/);
  const before = {x: g.x, y: g.y};
  await RT.acceptReactionCard(card, 0);
  assert.match(card.content, /challenges Ilse and goes to them/);
  assert.equal(heinz.flags[MOD].paused.reason, "reaction");
  await RT.undoReactionCard(card);
  assert.deepEqual({x: g.x, y: g.y}, before);
  assert.equal(heinz.flags[MOD].paused, undefined);
  // By day there is no curfew: nothing happens
  game.time.worldTime = at(4, 22, 12);
  assert.equal(await RT.react(system, yard, pc, "enter"), null);
  // Obfuscated, after curfew: unseen by a mortal
  game.time.worldTime = at(4, 22, 23, 30);
  ilse.statuses.add("wodx-obfuscated");
  ilse.items = [{type: "Power", name: "Obfuscate", system: {type: "wod.types.discipline", value: 2}}];
  const unseen = await RT.react(system, yard, pc, "enter");
  assert.match(unseen.content, /Unseen/);
  assert.match(unseen.content, /Obfuscate 2 against Auspex 0/);
  ilse.statuses.delete("wodx-obfuscated");
  // A sleeping watcher notices nothing (by its routine)
  await heinz.update({[`flags.${MOD}.where.activity`]: "sleep"});
  assert.match((await RT.react(system, yard, pc, "enter")).content, /does not notice \(asleep\)/);
});

test("the module: manifest declares the Reaction behaviour; in-game text is gender-neutral and writes no NPC dialogue", async () => {
  const {readFileSync} = await import("node:fs");
  const m = JSON.parse(readFileSync(join(root, "modules/wodx-npc/module.json"), "utf8"));
  assert.equal(m.version, "0.2.0");
  assert.deepEqual(m.documentTypes, {RegionBehavior: {reaction: {}}});
  for ( const f of ["routines.mjs", "routine-rules.mjs"] ) {
    const src = readFileSync(join(root, "modules/wodx-npc/scripts", f), "utf8");
    const strings = (src.match(/`[^`]*`|"[^"\n]*"/g) ?? []).join(" ").replace(/<[^>]+>/g, " ");
    assert.ok(!/\b(he|she|him|her|his|hers|himself|herself)\b/i.test(strings), `${f}: gender-neutral`);
    // Rule 11: no words put in an NPC's mouth (no quoted speech in cards)
    assert.ok(!/(says|shouts|cries|calls out)[,:]\s*[“"']/i.test(src), `${f}: no NPC dialogue`);
  }
});
