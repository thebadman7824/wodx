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
class ForcedDeletion {}
const clone = o => (o === undefined ? o : structuredClone(o));
function setPath(obj, path, value) {
  const parts = path.split(".");
  let o = obj;
  for ( let k = 0; k < parts.length - 1; k++ ) o = (o[parts[k]] ??= {});
  const last = parts.at(-1);
  if ( last.startsWith("-=") ) delete o[last.slice(2)];
  else if ( value instanceof ForcedDeletion ) delete o[last];
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
  s.update = async d => { applyUpdate(s, d); return s; };
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
globalThis.foundry = {utils: {deepClone: clone, randomID: () => newId("r")}, data: {operators: {ForcedDeletion}}, applications: {api: {}}};
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
  assert.equal(m.version, "0.9.0");
  assert.deepEqual(m.documentTypes, {RegionBehavior: {reaction: {}, alertZone: {}, trigger: {}}});
  for ( const f of ["routines.mjs", "routine-rules.mjs"] ) {
    const src = readFileSync(join(root, "modules/wodx-npc/scripts", f), "utf8");
    const strings = (src.match(/`[^`]*`|"[^"\n]*"/g) ?? []).join(" ").replace(/<[^>]+>/g, " ");
    assert.ok(!/\b(he|she|him|her|his|hers|himself|herself)\b/i.test(strings), `${f}: gender-neutral`);
    // Rule 11: no words put in an NPC's mouth (no quoted speech in cards)
    assert.ok(!/(says|shouts|cries|calls out)[,:]\s*[“"']/i.test(src), `${f}: no NPC dialogue`);
  }
});

/* ---- 0.4.0: alarms on places, and NPCs who hear the map ---- */
const AR = await import(join(root, "modules/wodx-npc/scripts/alert-rules.mjs"));

test("alarms: an hour on alarm, wary until the next dusk, then calm; raising it again starts the hour over", () => {
  const a = AR.raise(null, {now: 1000, cause: "a bell", toDusk: () => 5000});
  assert.equal(a.until, 1000 + 3600);
  assert.equal(a.waryUntil, 1000 + 3600 + 5000);
  assert.equal(AR.levelAt(a, 1000), "alarm");
  assert.equal(AR.levelAt(a, 4700), "wary");
  assert.equal(AR.levelAt(a, 9700), "calm");
  assert.equal(AR.levelAt(null, 0), "calm");
  const again = AR.raise(a, {now: 3000, toDusk: () => 100});
  assert.equal(again.since, 1000);
  assert.equal(again.until, 6600);
  assert.equal(again.waryUntil, 9600);
  assert.deepEqual(AR.fade(a, 2000, "X"), {level: "alarm", changed: false, text: ""});
  assert.match(AR.fade(a, 5000, "The square").text, /dies down/);
  assert.match(AR.fade({...a, shown: "wary"}, 99999, "The square").text, /calm again/);
  assert.deepEqual(AR.NOTICE_DIFF, {calm: 6, wary: 5, alarm: 4});
  assert.deepEqual(AR.sortHearers([{uuid: "a"}, {uuid: "b", asleep: true}, {uuid: "c", down: true}]), {react: ["a"], wake: ["b"]});
  assert.equal(AR.eventSituation({kind: "force"}).trespass, true);
  assert.equal(AR.eventSituation({kind: "noise"}).trespass, false);
  assert.equal(AR.eventHead({kind: "force", objectName: "Locked iron-bound door"}, "Ilse"), "Ilse: forcing locked iron-bound door");
});

test("map events: the NPC who heard a door forced reacts by profile on the same card; a sleeper wakes instead", async () => {
  const yardScene = scene("Upper Town · The Merchant's Yard", {kind: "home", owner: "Ludwig"});
  yardScene.update = async d => { applyUpdate(yardScene, d); return yardScene; };
  const guard = actor("Watchman Kunz", {template: "guard"});
  const sleeper = actor("Old Berthold", {template: "civilian", routine: {on: true, preset: "labourer", roles: {}}});
  sleeper.flags[MOD].where = {place: yardScene.uuid, activity: "sleep"};
  const pcA = actor("Ilse the burglar", {template: "neonate", pc: true});
  const [tg, ts, tp] = await yardScene.createEmbeddedDocuments("Token", [{actorId: guard.id, x: 500, y: 500}, {actorId: sleeper.id, x: 800, y: 500}, {actorId: pcA.id, x: 300, y: 500}]);
  view(yardScene);
  game.time.worldTime = at(4, 16, 23);
  const before = chat.length;
  const ev = {kind: "force", scene: yardScene.id, place: yardScene.uuid, noise: "loud", who: tp.uuid, whoName: "Ilse the burglar", object: "door1", objectName: "Locked door",
    heard: [tg.uuid, ts.uuid], supernatural: false, message: "msgA", undone: false};
  const cards = await RT.onMapEvent(ev);
  assert.equal(cards.length, 1);
  const data = cards[0].flags[MOD].reaction;
  assert.equal(data.trigger, "heard");
  assert.equal(data.watcher, tg.uuid);
  assert.equal(data.intruder, tp.uuid);
  assert.equal(data.event.kind, "force");
  assert.ok(data.options.length >= 1);
  assert.equal(data.mode, "suggest");
  assert.ok(data.lines.some(l => /Old Berthold wakes/.test(l)));
  assert.equal(sleeper.flags[MOD].paused.reason, "woken");
  assert.match(cards[0].content, /Ilse the burglar: forcing locked door/);
  // An undone event, an off switch, or another scene: nothing
  assert.deepEqual(await RT.onMapEvent({...ev, message: "msgB", undone: true}), []);
  settings.set("wodx-npc.mapReactions", false);
  assert.deepEqual(await RT.onMapEvent({...ev, message: "msgC"}), []);
  settings.delete("wodx-npc.mapReactions");
  assert.deepEqual(await RT.onMapEvent({...ev, message: "msgD", scene: square.id}), []);
  assert.equal(chat.length, before + 1);
});

test("map events: a tripped alarm puts the place on alarm; the clock fades it with a note; Undo on the card takes it back", async () => {
  const shop = scene("Lower Town · The Goldsmith", {kind: "workplace"});
  shop.update = async d => { applyUpdate(shop, d); return shop; };
  view(shop);
  game.time.worldTime = at(4, 17, 2);
  const t0 = game.time.worldTime;
  const [card] = await RT.onMapEvent({kind: "alarm", scene: shop.id, noise: "loud", objectName: "Strongbox", heard: [], message: "msgE"});
  assert.ok(card.flags[MOD].alarmCard);
  assert.equal(RT.alertLevel(shop), "alarm");
  assert.equal(RT.alertOf(shop).until, t0 + 3600);
  await RT.undoAlarmCard(card);
  assert.equal(RT.alertOf(shop), null);
  await RT.raiseAlarm(shop, "the Storyteller");
  game.time.worldTime = t0 + 3700;
  const n = chat.length;
  await RT.checkAlerts();
  assert.equal(shop.flags[MOD].alert.shown, "wary");
  assert.match(chat.at(-1).content, /dies down/);
  assert.equal(chat.length, n + 1);
  await RT.checkAlerts();
  assert.equal(chat.length, n + 1, "said once");
  game.time.worldTime = RT.alertOf(shop).waryUntil + 1;
  await RT.checkAlerts();
  assert.equal(shop.flags[MOD].alert, undefined);
  assert.match(chat.at(-1).content, /calm again/);
});

test("marks: a door forced in an owned place is put right at the next dawn, on one card; Undo puts it back as it was and it stays", async () => {
  const yard = scene("Upper Town · The Saddler", {kind: "home", owner: "Margit"});
  yard.update = async d => { applyUpdate(yard, d); return yard; };
  const wall = {id: "wallX", ds: 1, flags: {"wodx-interactables": {lock: "good", lockBroken: true, progress: {pick: 0, force: 3, hack: 0}}}};
  wall.update = async d => { applyUpdate(wall, d); return wall; };
  yard.walls = new Coll([[wall.id, wall]]);
  yard.tiles = new Coll();
  globalThis.CONST.WALL_DOOR_STATES = {CLOSED: 0, OPEN: 1, LOCKED: 2};
  game.time.worldTime = at(4, 18, 23);
  const ev = {kind: "force", scene: yard.id, place: yard.uuid, at: game.time.worldTime, noise: "loud", object: wall.id, objectName: "Back door", objectType: "Wall", state: "forced", heard: [], message: "msgM", undone: false};
  const m = await RT.noteMark(ev);
  assert.ok(m.repairAt > ev.at, "repaired later");
  assert.equal(yard.flags[MOD].marks.length, 1);
  assert.equal(await RT.repairMarks(yard), null, "not yet");
  game.time.worldTime = m.repairAt + 1;
  const card = await RT.repairMarks(yard);
  assert.match(card.content, /Back door is relocked/);
  assert.equal(wall.ds, 2, "locked again");
  assert.equal(wall.flags["wodx-interactables"].lockBroken, undefined);
  assert.equal(wall.flags["wodx-interactables"].progress.force, 0);
  assert.equal(yard.flags[MOD].marks.length, 0);
  card.update = async d => { applyUpdate(card, d); return card; };
  await RT.undoRepairCard(card);
  assert.equal(wall.ds, 1);
  assert.equal(wall.flags["wodx-interactables"].lockBroken, true);
  assert.equal(yard.flags[MOD].marks[0].repairAt, null, "the mark is back, and not repaired again");
  assert.equal(await RT.repairMarks(yard), null);
  // An undone event takes its mark away; a place nobody owns keeps the damage
  await RT.noteMark({...ev, undone: true});
  assert.equal(yard.flags[MOD].marks.length, 0);
  const ruin = scene("Outskirts · The Old Mill");
  ruin.update = async d => { applyUpdate(ruin, d); return ruin; };
  assert.equal((await RT.noteMark({...ev, scene: ruin.id, place: ruin.uuid})).repairAt, null);
});

test("alarm carriers: a bell takes the alarm to the watch house at once, a runner reaches the mill later; Undo takes both back", async () => {
  const yard = scene("Upper Town · The Tannery", {kind: "workplace"});
  const watch = scene("Upper Town · The Watch House", {kind: "watch"});
  const mill = scene("Outskirts · The Water Mill", {kind: "workplace"});
  const zone = region(yard, "Bell zone", {x: 0, y: 0, width: 100, height: 100});
  zone.behaviors.push({type: "wodx-npc.alertZone", disabled: false, system: {lights: "", sounds: "", carryTo: "watch house", carrier: "bell", minutes: 0}},
    {type: "wodx-npc.alertZone", disabled: false, system: {lights: "", sounds: "", carryTo: "water mill", carrier: "runner", minutes: 15}});
  view(yard);
  game.time.worldTime = at(4, 19, 22);
  const t0 = game.time.worldTime;
  const [card] = await RT.onMapEvent({kind: "alarm", scene: yard.id, noise: "loud", objectName: "Bell rope", heard: [], message: "msgK"});
  assert.equal(RT.alertLevel(watch), "alarm", "the bell carries at once");
  assert.equal(RT.alertLevel(mill), "calm", "the runner is on the road");
  assert.equal(yard.flags[MOD].carrying.length, 1);
  assert.ok(chat.some(m => /the alarm spreads/.test(m.content) && /runner sets off for Outskirts · The Water Mill: about 15 minutes/.test(m.content)));
  // Undo before the runner arrives: both turn back
  await RT.undoAlarmCard(card);
  assert.equal(RT.alertOf(watch), null);
  assert.equal(yard.flags[MOD].carrying.length, 0);
  // Again, and this time the runner arrives
  await RT.raiseAlarm(yard, "the Storyteller");
  game.time.worldTime = t0 + 16 * 60;
  await RT.checkAlerts();
  assert.equal(RT.alertLevel(mill), "alarm");
  assert.match(chat.at(-1).content, /runner from Upper Town · The Tannery reaches Outskirts · The Water Mill/);
  assert.equal(yard.flags[MOD].carrying.length, 0);
  assert.equal((mill.flags[MOD].carrying ?? []).length, 0, "a carried alarm goes no further");
});

test("trigger regions: a player character walking in tells the Storyteller and passes a map event on; once means once; NPCs pass freely", async () => {
  const cellar = scene("Upper Town · The Wine Cellar", {kind: "home"});
  const r = region(cellar, "Cellar stairs", {x: 0, y: 0, width: 200, height: 200});
  const beh = {id: "trg1", type: "wodx-npc.trigger", disabled: false, parent: r, system: {label: "the cellar stairs", does: "note", who: "pcs", once: true, fired: false}};
  beh.update = async d => { applyUpdate(beh, d); return beh; };
  beh.system.parent = beh;
  r.behaviors.push(beh);
  const pcB = actor("Bruno the thief", {template: "neonate", pc: true});
  const npcB = actor("Cellar cat", {template: "civilian"});
  const [tp, tn] = await cellar.createEmbeddedDocuments("Token", [{actorId: pcB.id, x: 50, y: 50}, {actorId: npcB.id, x: 60, y: 60}]);
  const seen = [];
  const old = globalThis.Hooks.callAll;
  globalThis.Hooks.callAll = (k, e) => { if ( k === "wodxMapEvent" ) seen.push(e); };
  try {
    const n = chat.length;
    assert.equal(await RT.onTrigger(beh.system, {data: {token: tn}, region: r}), null, "an NPC passes freely");
    const ev = await RT.onTrigger(beh.system, {data: {token: tp}, region: r});
    assert.deepEqual([ev.kind, ev.objectName, ev.who, ev.place], ["trigger", "the cellar stairs", tp.uuid, cellar.uuid]);
    assert.equal(seen.length, 1);
    assert.match(chat.at(-1).content, /Bruno the thief reached the cellar stairs/);
    assert.equal(chat.length, n + 1);
    assert.equal(beh.system.fired, true);
    assert.equal(await RT.onTrigger(beh.system, {data: {token: tp}, region: r}), null, "once");
  } finally { globalThis.Hooks.callAll = old; }
});
