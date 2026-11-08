import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/*
 * WoDX Interactables: the rules (interact-rules.mjs) and the runtime (main.mjs) on a small stand-in for Foundry: one
 * scene, a few walls, a player's token and an NPC, a chat log and dice that roll what the test says. It is not Foundry:
 * the gate in Foundry checks the real canvas, door controls, wall config window and collisions.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const R = await import(join(root, "modules/wodx-interactables/scripts/interact-rules.mjs"));
const MOD = "wodx-interactables";

/* ---------------- the rules ---------------- */

test("a plain door needs no setup: a locked one has a good lock, the build follows the material", () => {
  const o = R.describe({door: true, ds: "locked", flags: {}});
  assert.equal(o.kind, "door");
  assert.equal(o.material, "wood");
  assert.equal(o.build, "interior");
  assert.equal(o.lock, "good");
  const w = R.describe({door: true, ds: "closed", flags: {kind: "window"}});
  assert.equal(w.material, "glass");
  assert.equal(w.build, "pane");
  assert.equal(w.lock, "none");
  assert.equal(R.describe({door: true, ds: "closed", flags: {material: "ironbound"}}).build, "reinforced");
  assert.equal(R.nameOf(R.describe({door: true, ds: "locked", flags: {material: "ironbound"}})), "Locked iron-bound door");
});

test("four named lock grades, harder and slower as they go", () => {
  const g = ["cheap", "good", "excellent", "masterwork"].map(k => R.LOCKS[k]);
  for ( let i = 1; i < g.length; i++ ) {
    assert.ok(g[i].diff >= g[i - 1].diff);
    assert.ok(g[i].need > g[i - 1].need);
    assert.ok(g[i].seconds >= g[i - 1].seconds);
  }
  assert.equal(g[0].diff, 5);
  assert.equal(g[3].diff, 9);
});

test("the lock skill follows the line and era: Larceny, Legerdemain in the Dark Ages, Security for hunters", () => {
  assert.deepEqual(R.lockSkill({larceny: 2, security: 0}, {kind: "kindred", eraId: "victorian"}), {key: "larceny", value: 2});
  assert.deepEqual(R.lockSkill({legerdemain: 1, larceny: 0}, {eraId: "dark-ages"}), {key: "legerdemain", value: 1});
  assert.deepEqual(R.lockSkill({larceny: 3}, {eraId: "dark-ages"}), {key: "larceny", value: 3});
  assert.deepEqual(R.lockSkill({larceny: 1, security: 1}, {kind: "hunter", eraId: "modern"}), {key: "security", value: 1});
  // The best rated wins over the line's first name
  assert.deepEqual(R.lockSkill({larceny: 1, security: 3}, {kind: "kindred", eraId: "modern"}), {key: "security", value: 3});
  // Nothing on the sheet: the line's name, untrained
  assert.deepEqual(R.lockSkill({}, {eraId: "modern"}), {key: "larceny", value: 0});
  assert.deepEqual(R.electronicSkill({technology: 2, security: 1}), {key: "technology", value: 2});
});

const ch = (x = {}) => ({actorId: "pc1", strength: 2, dexterity: 3, perception: 3, intelligence: 2, potence: 0, abilities: {larceny: 2, stealth: 1, alertness: 2}, eraId: "victorian", year: 1890, side: "a", hasTools: true, ...x});
const ids = list => list.map(o => o.id);

test("a locked door offers pick, force, listen and knock, each with its pool, difficulty, time and noise", () => {
  const o = R.describe({door: true, ds: "locked", flags: {lock: "excellent"}});
  const ops = R.optionsFor(o, ch());
  assert.deepEqual(ids(ops), ["pick", "force", "listen", "knock"]);
  const pick = ops[0];
  assert.equal(pick.roll.dice, 5);
  assert.equal(pick.roll.diff, 8);
  assert.equal(pick.roll.need, 5);
  assert.equal(pick.seconds, 60);
  assert.equal(pick.noise.success, "quiet");
  // No tools: +2 difficulty
  assert.equal(R.optionsFor(o, ch({hasTools: false}))[0].roll.diff, 10);
  const force = ops[1];
  assert.equal(force.roll.dice, 2);
  assert.equal(force.roll.need, 1);
  assert.equal(force.noise.success, "loud");
  assert.equal(ops[2].roll.dice, 5);
  assert.equal(ops[2].roll.diff, 6);
});

test("a closed door opens with no roll, or quietly with Dexterity + Stealth; an open one closes", () => {
  const closed = R.describe({door: true, ds: "closed", flags: {}});
  assert.deepEqual(ids(R.optionsFor(closed, ch())), ["open", "openQuiet", "force", "listen", "knock"]);
  const open = R.describe({door: true, ds: "open", flags: {}});
  assert.deepEqual(ids(R.optionsFor(open, ch())), ["close"]);
});

test("Strength (with Potence) at the door's feat forces it with no roll; below, Potence adds automatic successes", () => {
  const o = R.describe({door: true, ds: "locked", flags: {material: "ironbound"}});
  const weak = R.optionsFor(o, ch({strength: 3, potence: 2})).find(x => x.id === "force");
  assert.equal(weak.roll.dice, 3);
  assert.equal(weak.roll.auto, 2);
  assert.equal(weak.roll.need, 5);
  assert.equal(weak.roll.diff, 8);
  const strong = R.optionsFor(o, ch({strength: 5, potence: 5})).find(x => x.id === "force");
  assert.equal(strong.roll, null);
  assert.ok(strong.auto);
  assert.match(strong.note, /no roll/);
});

test("a bar: lifted from its own side, and from the other side picking is no use and forcing needs 2 more successes", () => {
  const o = R.describe({door: true, ds: "closed", flags: {barSide: "a", barred: true}});
  assert.ok(ids(R.optionsFor(o, ch({side: "a"}))).includes("unbar"));
  const other = R.optionsFor(o, ch({side: "b"}));
  assert.ok(!ids(other).includes("open"));
  assert.equal(other.find(x => x.id === "force").roll.need, 3);
  const lockedBarred = R.describe({door: true, ds: "locked", flags: {barSide: "a", barred: true}});
  assert.ok(R.optionsFor(lockedBarred, ch({side: "b"})).find(x => x.id === "barredNote").disabled);
});

test("windows: a glass pane breaks with no roll; a stuck window takes Strength; windows are not listened at", () => {
  const w = R.describe({door: true, ds: "closed", flags: {kind: "window"}});
  const ops = ids(R.optionsFor(w, ch()));
  assert.ok(ops.includes("smash"));
  assert.ok(!ops.includes("force"));
  assert.ok(!ops.includes("listen"));
  const stuck = R.describe({door: true, ds: "closed", flags: {kind: "window", stuck: true}});
  const u = R.optionsFor(stuck, ch()).find(x => x.id === "unstick");
  assert.equal(u.roll.attr, "strength");
  assert.equal(u.roll.diff, 6);
  assert.ok(!ids(R.optionsFor(stuck, ch())).includes("open"));
});

test("keys, keypads and the era: a key unlocks; a keypad shows only in the modern eras", () => {
  const o = R.describe({door: true, ds: "locked", flags: {keyName: "Cellar key", electronic: "good"}});
  assert.ok(ids(R.optionsFor(o, ch({hasKey: true}))).includes("unlock"));
  assert.ok(!ids(R.optionsFor(o, ch())).includes("unlock"));
  assert.ok(!ids(R.optionsFor(o, ch({eraId: "victorian", year: 1890}))).includes("hack"));
  const hack = R.optionsFor(o, ch({eraId: "modern", year: 1999, abilities: {computer: 3}})).find(x => x.id === "hack");
  assert.equal(hack.roll.ability, "computer");
  assert.equal(hack.roll.dice, 5);
});

test("retrying a single roll adds one to the difficulty each time", () => {
  const o = R.describe({door: true, ds: "closed", flags: {tries: {"pc1:listen": 2}}});
  const listen = R.optionsFor(o, ch()).find(x => x.id === "listen");
  assert.equal(listen.roll.diff, 8);
  assert.match(listen.note, /\+2 difficulty/);
});

test("extended rolls: successes add up on the door; enough of them opens it; a botch loses them and jams the lock", () => {
  const o = R.describe({door: true, ds: "locked", flags: {lock: "excellent", progress: {pick: 2}}});
  const pick = R.optionsFor(o, ch()).find(x => x.id === "pick");
  assert.equal(pick.roll.have, 2);
  const part = R.resolve(o, pick, [{successes: 1, botch: false}]);
  assert.equal(part.result, "progress");
  assert.equal(part.patch.flags.progress.pick, 3);
  assert.equal(part.patch.ds, undefined);
  assert.equal(part.seconds, 60);
  const full = R.resolve(o, pick, [{successes: 1, botch: false}, {successes: 2, botch: false}, {successes: 2, botch: false}]);
  assert.equal(full.result, "done");
  assert.equal(full.patch.ds, "closed");
  assert.equal(full.patch.flags.progress.pick, 0);
  assert.equal(full.seconds, 120, "it stops rolling once enough successes are in");
  const bad = R.resolve(o, pick, [{successes: 0, botch: true}]);
  assert.equal(bad.result, "botch");
  assert.equal(bad.patch.flags.jammed, true);
  assert.equal(bad.patch.flags.progress.pick, 0);
  const jammed = R.describe({door: true, ds: "locked", flags: {jammed: true}});
  assert.ok(R.optionsFor(jammed, ch()).find(x => x.id === "jammed").disabled);
});

test("forcing: loud; a botch hurts (one lethal); success opens it and lifts a bar", () => {
  const o = R.describe({door: true, ds: "closed", flags: {barSide: "a", barred: true, material: "heavy"}});
  const force = R.optionsFor(o, ch({side: "b"})).find(x => x.id === "force");
  const bad = R.resolve(o, force, [{successes: 0, botch: true}]);
  assert.equal(bad.hurt, 1);
  assert.equal(bad.noise, "loud");
  const good = R.resolve(o, force, [{successes: 5, botch: false}]);
  assert.equal(good.patch.ds, "open");
  assert.equal(good.patch.flags.barred, false);
  const auto = R.optionsFor(o, ch({strength: 5})).find(x => x.id === "force");
  assert.equal(R.resolve(o, auto, []).patch.ds, "open");
});

test("quiet opening: success is silent, failure opens it with the usual noise, a botch is loud", () => {
  const o = R.describe({door: true, ds: "closed", flags: {}});
  const op = R.optionsFor(o, ch()).find(x => x.id === "openQuiet");
  assert.equal(R.resolve(o, op, [{successes: 1}]).noise, "silent");
  const f = R.resolve(o, op, [{successes: 0}], {actorId: "pc1"});
  assert.equal(f.noise, "quiet");
  assert.equal(f.patch.ds, "open");
  assert.equal(f.patch.flags.tries["pc1:openQuiet"], 1);
  assert.equal(R.resolve(o, op, [{successes: 0, botch: true}]).noise, "loud");
});

test("a live alarm goes off when the door opens in a modern era, but not once beaten", () => {
  const o = R.describe({door: true, ds: "closed", flags: {electronic: "cheap"}});
  const op = R.optionsFor(o, ch({eraId: "modern"})).find(x => x.id === "open");
  const out = R.resolve(o, op, [], {eraId: "modern"});
  assert.equal(out.patch.flags.alarm, true);
  assert.equal(out.noise, "loud");
  const beaten = R.describe({door: true, ds: "closed", flags: {electronic: "cheap", beaten: true}});
  assert.equal(R.resolve(beaten, op, [], {eraId: "modern"}).patch.flags.alarm, undefined);
  const hack = R.optionsFor(o, ch({eraId: "modern", abilities: {security: 2}})).find(x => x.id === "hack");
  assert.equal(R.resolve(o, hack, [{successes: 0, botch: true}], {eraId: "modern"}).patch.flags.alarm, true);
  assert.equal(R.resolve(o, hack, [{successes: 3}], {eraId: "modern"}).patch.flags.beaten, true);
});

test("a breakable wall: a break-through option that waits for the Storyteller", () => {
  const o = R.describe({door: false, ds: "closed", flags: {wall: "stone"}});
  const ops = R.optionsFor(o, ch());
  assert.deepEqual(ids(ops), ["breach"]);
  assert.ok(ops[0].waits);
  assert.equal(ops[0].roll.need, 10);
  const out = R.resolve(o, ops[0], [{successes: 10}]);
  assert.equal(out.result, "done");
  assert.ok(out.waits);
  assert.equal(R.optionsFor(R.describe({door: false, flags: {wall: "stone", breached: true}}), ch()).length, 0);
});

test("listening: what the successes tell", () => {
  assert.match(R.listenText(0, [{moving: true}]), /nothing/);
  assert.match(R.listenText(1, [{moving: true}]), /Someone/);
  assert.match(R.listenText(1, []), /nobody/);
  assert.match(R.listenText(2, [{moving: true}, {moving: false}]), /Two people/);
  assert.match(R.listenText(3, [{moving: true, talking: true}, {moving: true, talking: true}]), /all moving about, and voices/);
  assert.match(R.listenText(-1, [{moving: true}]), /nothing you can be sure of/);
});

test("noise: loud is heard by anyone awake in earshot; a wall cuts it to 10 yards; quiet needs a roll and stops at a wall", () => {
  const no = () => 0, yes = () => 0.99;
  assert.equal(R.hears("loud", {yards: 25}).hears, true);
  assert.equal(R.hears("loud", {yards: 25, walls: 1}).inRange, false);
  assert.equal(R.hears("loud", {yards: 8, walls: 1}).hears, true);
  assert.equal(R.hears("loud", {yards: 8, walls: 2}).inRange, false);
  assert.equal(R.hears("quiet", {yards: 4, walls: 1}).inRange, false);
  assert.equal(R.hears("quiet", {yards: 4}, yes).hears, true);
  assert.equal(R.hears("quiet", {yards: 4}, no).hears, false);
  assert.equal(R.hears("loud", {yards: 4, asleep: true}, no).hears, false, "a sleeper rolls even for a loud noise");
  assert.equal(R.hears("silent", {yards: 0}).inRange, false);
});

test("geometry: sides of a wall, compass words, distance", () => {
  const c = [0, 0, 100, 0];
  assert.equal(R.sideOf(c, {x: 50, y: 10}), "a");
  assert.equal(R.sideOf(c, {x: 50, y: -10}), "b");
  assert.equal(R.sideLabel(c, "a"), "south");
  assert.equal(R.sideLabel(c, "b"), "north");
  assert.equal(R.sideLabel([0, 0, 0, 100], "a"), "west");
  assert.equal(R.distanceToWall(c, {x: 50, y: 30}), 30);
  assert.equal(R.distanceToWall(c, {x: 130, y: 40}), 50);
  const p = R.besideWall(c, "a", 4);
  assert.equal(R.sideOf(c, p), "a");
});

test("the config form is cleaned: unknown values dropped, the key name trimmed", () => {
  const s = R.cleanSettings({kind: "portal", lock: "masterwork", keyName: "  Cellar key ", barSide: "x", stuck: "on"});
  assert.equal(s.kind, "door");
  assert.equal(s.lock, "masterwork");
  assert.equal(s.keyName, "Cellar key");
  assert.equal(s.barSide, "");
  assert.equal(s.stuck, true);
});

/* ---------------- the runtime, on a stand-in for Foundry ---------------- */

const G = 100;
class ForcedDeletion {}
function setPath(obj, path, value) {
  const parts = path.split(".");
  let o = obj;
  for ( let k = 0; k < parts.length - 1; k++ ) o = (o[parts[k]] ??= {});
  if ( value instanceof ForcedDeletion ) delete o[parts.at(-1)];
  else o[parts.at(-1)] = structuredClone(value);
}
class Coll extends Map {
  get contents() { return [...this.values()]; }
  find(f) { return this.contents.find(f); }
  filter(f) { return this.contents.filter(f); }
}
const hooks = new Map();
const chat = [];
let worldTime = 1000;
let faces = [];
const users = new Coll();
const gm = {id: "gm", isGM: true, active: true}, player = {id: "pl", isGM: false, active: true};
users.set("gm", gm); users.set("pl", player);
Object.defineProperty(users, "activeGM", {get: () => gm});
let me = gm;
const scene = {id: "scn1", name: "Gate town", grid: {size: G, units: "ft"}, walls: new Coll()};
const uuids = new Map();
const damage = [];

function wall(id, c, door, ds, flags = {}) {
  const doc = {id, c, door, ds, levels: new Set(), flags: {[MOD]: flags}, parent: scene,
    async update(data) { for ( const [k, v] of Object.entries(data) ) setPath(doc, k, v); return doc; }};
  scene.walls.set(id, doc);
  return {id, document: doc};
}
function actor(id, name, {str = 2, dex = 3, per = 3, larceny = 2, player: pc = true, items = []} = {}) {
  return {id, name, hasPlayerOwner: pc, items, flags: {},
    system: {attributes: {strength: {value: str}, dexterity: {value: dex}, perception: {value: per}, intelligence: {value: 2}},
      abilities: {larceny: {value: larceny, type: "skill", isvisible: true}, stealth: {value: 1, type: "skill"}, alertness: {value: 2, type: "talent"}},
      advantages: {willpower: {temporary: 3}}, health: {damage: {woundpenalty: 0}}},
    async update(data) { for ( const [k, v] of Object.entries(data) ) setPath(this, k, v); return this; }};
}
function token(id, a, x, y, owner = "pl") {
  const doc = {id, x, y, width: 1, height: 1, actor: a, hidden: false, uuid: `Scene.scn1.Token.${id}`, testUserPermission: u => u.isGM || u.id === owner, get isOwner() { return me.isGM || me.id === owner; }};
  const t = {id, name: a.name, actor: a, document: doc, w: G, h: G, get center() { return {x: doc.x + G / 2, y: doc.y + G / 2}; }};
  doc.object = t;
  uuids.set(doc.uuid, doc);
  return t;
}
class FakeRoll {
  constructor(formula) { this.n = Number(formula.split("d")[0]); }
  async evaluate() { this.dice = [{results: Array.from({length: this.n}, (_, k) => ({result: faces[k] ?? 5}))}]; return this; }
}

globalThis.Hooks = {
  on: (n, f) => { if ( !hooks.has(n) ) hooks.set(n, []); hooks.get(n).push(f); },
  once: (n, f) => { if ( !hooks.has(n) ) hooks.set(n, []); hooks.get(n).push(f); },
  callAll: (n, ...a) => { for ( const f of hooks.get(n) ?? [] ) f(...a); }
};
const settings = new Map();
globalThis.CONST = {WALL_DOOR_STATES: {CLOSED: 0, OPEN: 1, LOCKED: 2}, WALL_DOOR_TYPES: {NONE: 0, DOOR: 1, SECRET: 2}, EDGE_SENSE_TYPES: {NONE: 0, NORMAL: 20}, WALL_MOVEMENT_TYPES: {NONE: 0, NORMAL: 20}};
const blockedPairs = [];
globalThis.CONFIG = {Canvas: {polygonBackends: Object.fromEntries(["move", "sight", "sound"].map(t => [t, {testCollision: (a, b, {mode}) => {
  // A test wall stops a sense when the line between the points crosses it
  const hits = blockedPairs.filter(w => w.types.includes(t) && crosses(w.c, a, b));
  return mode === "all" ? hits : hits.length > 0;
}}]))}, sounds: {dice: "dice.wav"}};
function crosses(c, a, b) {
  const s1 = R.sideOf(c, a), s2 = R.sideOf(c, b);
  if ( !s1 || !s2 || s1 === s2 ) return false;
  const d = [b.x - a.x, b.y - a.y], s3 = R.sideOf([a.x, a.y, b.x, b.y], {x: c[0], y: c[1]}), s4 = R.sideOf([a.x, a.y, b.x, b.y], {x: c[2], y: c[3]});
  return d && s3 !== s4;
}
globalThis.foundry = {utils: {deepClone: o => (o === undefined ? o : structuredClone(o)), randomID: () => Math.random().toString(36).slice(2)}, data: {operators: {ForcedDeletion}},
  applications: {api: {DialogV2: {wait: async () => null}}}};
globalThis.Roll = FakeRoll;
globalThis.ui = {notifications: {info: () => {}, warn: () => {}}};
globalThis.fromUuid = async u => uuids.get(u) ?? null;
const proposals = [];
const time = {get worldTime() { return worldTime; }, advance: async s => { worldTime += s; }};
globalThis.game = {
  users, get user() { return me; }, time, scenes: new Coll([["scn1", scene]]), combat: null,
  settings: {register: (m, k, cfg) => settings.set(`${m}.${k}`, cfg.default), get: (m, k) => settings.get(`${m}.${k}`)},
  keybindings: {register: () => {}},
  modules: new Coll([[MOD, {}], ["wodx-chronicle", {api: {propose: async p => proposals.push(p), registerApprovalHandler: () => {}, eras: {activeEra: () => ({profile: {id: "victorian"}}), currentYear: () => 1890}}}]]),
  wodxActions: {getKind: () => "mortal"},
  wodxCombat: {applyDamage: async (a, t, n) => damage.push([a.id, t, n]), healDamage: async (a, t, n) => damage.push([a.id, t, -n])},
  messages: new Coll()
};
globalThis.ChatMessage = {
  getSpeaker: ({token: t}) => ({alias: t?.object?.name ?? t?.actor?.name ?? "?"}),
  create: async data => {
    const msg = {id: `m${chat.length}`, ...structuredClone({...data, rolls: undefined}), rolls: data.rolls ?? [], author: me,
      async update(d) { for ( const [k, v] of Object.entries(d) ) setPath(msg, k, v); return msg; }};
    chat.push(msg);
    game.messages.set(msg.id, msg);
    // The Storyteller's client picks the card up
    if ( msg.flags?.[MOD]?.ask ) { const was = me; me = gm; try { await game.modules.get(MOD).api.applyAsk(msg); } finally { me = was; } }
    return msg;
  }
};
globalThis.document = {styleSheets: [], querySelector: () => null, head: {appendChild: () => {}}, createElement: () => ({})};

const pc = actor("pc1", "Anna Weiss", {items: [{name: "Lock picks"}]});
const npc = actor("npc1", "Sergeant Volker", {player: false});
const tokPc = token("tpc", pc, 400, 300);        // above the door wall, side "b" of [300,500]-[600,500]... set below
const tokNpc = token("tnpc", npc, 400, 1500, "gm");
const door = wall("door1", [300, 450, 600, 450], 1, 2, {lock: "good"});
const win = wall("win1", [560, 250, 560, 380], 1, 0, {kind: "window"});
const far = wall("far1", [3000, 3000, 3300, 3000], 1, 2, {});
const brk = wall("brk1", [300, 200, 300, 400], 0, 0, {wall: "wattle"});
globalThis.canvas = {scene, grid: {size: G, measurePath: ([a, b]) => ({distance: Math.hypot(a.x - b.x, a.y - b.y) / G * 5})},
  walls: {placeables: [door, win, far, brk]}, tokens: {placeables: [tokPc, tokNpc], controlled: [tokPc], get: id => [tokPc, tokNpc].find(t => t.id === id)}};
await import(join(root, "modules/wodx-interactables/scripts/main.mjs"));
for ( const f of hooks.get("init") ?? [] ) f();
const api = game.modules.get(MOD).api;

test("runtime: within reach, nearest first; far doors and other levels are left out", () => {
  const list = api.interactablesFor(tokPc);
  assert.deepEqual(list.map(x => x.doc.id), ["door1", "win1", "brk1"]);
  door.document.levels = new Set(["upper"]);
  tokPc.document.level = "ground";
  assert.ok(!api.interactablesFor(tokPc).some(x => x.doc.id === "door1"));
  door.document.levels = new Set();
  delete tokPc.document.level;
});

test("runtime: a door behind another wall is out of reach", () => {
  blockedPairs.push({c: [350, 420, 550, 420], types: ["move"]});
  assert.ok(!api.interactablesFor(tokPc).some(x => x.doc.id === "door1"));
  blockedPairs.length = 0;
});

test("runtime: a secret door is hidden from players until found", () => {
  door.document.door = 2;
  me = player;
  assert.ok(!api.interactablesFor(tokPc).some(x => x.doc.id === "door1"));
  door.document.flags[MOD].found = true;
  assert.ok(api.interactablesFor(tokPc).some(x => x.doc.id === "door1"));
  me = gm;
  door.document.door = 1;
  delete door.document.flags[MOD].found;
});

test("runtime: picking the lock, rolled on the player's side, applied by the Storyteller's, with the clock untouched for turns", async () => {
  me = player;
  faces = [8, 9, 3, 2, 7];          // 3 successes at 6
  const t0 = worldTime;
  const msg = await api.attempt(tokPc, "door1", "pick", {fd: {bonus: 0, extraDiff: 0}});
  me = gm;
  assert.equal(msg.flags[MOD].ask.dice, 5);
  assert.equal(msg.flags[MOD].ask.diff, 6);
  assert.equal(msg.flags[MOD].done.result, "done");
  assert.equal(door.document.ds, 0, "unlocked, still closed");
  assert.equal(worldTime, t0, "a turn does not move the clock");
  assert.match(msg.content, /Undo/);
  await api.undoCard(msg);
  assert.equal(door.document.ds, 2, "Undo locks it again");
  assert.match(msg.content, /Undone/);
});

test("runtime: a masterwork lock keeps its progress, moves the clock, and the next roll goes on from there", async () => {
  door.document.flags[MOD].lock = "masterwork";
  faces = [9, 9, 3, 2, 2];          // 2 at 9
  const t0 = worldTime;
  const m1 = await api.attempt(tokPc, "door1", "pick", {fd: {}});
  assert.equal(m1.flags[MOD].done.result, "progress");
  assert.equal(door.document.flags[MOD].progress.pick, 2);
  assert.equal(worldTime - t0, 300, "five minutes on the clock");
  faces = [10, 10, 10, 10, 10];
  await api.attempt(tokPc, "door1", "pick", {fd: {}});
  assert.equal(door.document.flags[MOD].progress.pick, 7);
  await api.undoCard(m1);
  door.document.flags[MOD] = {lock: "good"};
});

test("runtime: a botched force hurts, is loud, and the NPC in earshot hears it; Undo heals", async () => {
  tokNpc.document.y = 700; // within 30 yards, on the far side
  faces = [1, 1];
  const msg = await api.attempt(tokPc, "door1", "force", {fd: {}});
  const done = msg.flags[MOD].done;
  assert.equal(done.result, "botch");
  assert.deepEqual(damage.at(-1), ["pc1", "lethal", 1]);
  assert.ok(done.lines.some(l => /Heard by Sergeant Volker/.test(l)), done.lines.join(" | "));
  await api.undoCard(msg);
  assert.deepEqual(damage.at(-1), ["pc1", "lethal", -1]);
  tokNpc.document.y = 1500;
});

test("runtime: forcing it open; a sound wall between keeps the NPC from hearing", async () => {
  tokNpc.document.y = 2400; // 21 yards away
  blockedPairs.push({c: [0, 1800, 2000, 1800], types: ["sound"]});
  faces = [9, 9];
  const msg = await api.attempt(tokPc, "door1", "force", {fd: {}});
  assert.equal(door.document.ds, 1);
  assert.ok(!msg.flags[MOD].done.lines.some(l => /Heard by/.test(l)));
  blockedPairs.length = 0;
  await api.undoCard(msg);
  assert.equal(door.document.ds, 2);
  tokNpc.document.y = 1500;
});

test("runtime: a player cannot act for someone else's character", async () => {
  me = {id: "other", isGM: false, active: true};
  const msg = await ChatMessage.create({content: "<h3>x</h3>", flags: {[MOD]: {ask: {scene: "scn1", wall: "door1", token: tokPc.document.uuid, op: "knock"}}}});
  me = gm;
  assert.equal(msg.flags[MOD].ask.state, "refused");
  assert.equal(door.document.ds, 2);
});

test("runtime: a card for something that no longer applies changes nothing", async () => {
  me = player;
  const msg = await ChatMessage.create({content: "<h3>x</h3>", flags: {[MOD]: {ask: {scene: "scn1", wall: "door1", token: tokPc.document.uuid, op: "close"}}}});
  me = gm;
  assert.equal(msg.flags[MOD].ask.state, "refused");
});

test("runtime: the pane breaks at once, can't be closed after, and Undo mends it", async () => {
  const msg = await api.attempt(tokPc, "win1", "smash");
  assert.equal(win.document.ds, 1);
  assert.equal(win.document.flags[MOD].broken, true);
  assert.equal(api.rules.optionsFor(api.describeWall(win.document), api.characterFor(pc, tokPc.center, win.document)).length, 0);
  await api.undoCard(msg);
  assert.equal(win.document.ds, 0);
  assert.equal(win.document.flags[MOD].broken, undefined);
});

test("runtime: breaking through a wall waits in the approval queue; the wall stays until approved", async () => {
  faces = [9, 9, 9];
  pc.system.attributes.strength.value = 3;
  const msg = await api.attempt(tokPc, "brk1", "breach", {fd: {}});
  assert.equal(msg.flags[MOD].done.waiting, true);
  assert.equal(proposals.at(-1).type, `${MOD}.breach`);
  assert.equal(brk.document.flags[MOD].breached, undefined);
  pc.system.attributes.strength.value = 2;
});

test("runtime: Willpower is spent from the sheet and counts one success", async () => {
  faces = [2, 2, 2, 2, 2];
  const before = pc.system.advantages.willpower.temporary;
  const msg = await api.attempt(tokPc, "door1", "pick", {fd: {willpower: true}});
  assert.equal(pc.system.advantages.willpower.temporary, before - 1);
  assert.equal(door.document.flags[MOD].progress.pick, 1);
  await api.undoCard(msg);
  pc.system.advantages.willpower.temporary = before;
});

test("runtime: the WoDX part of the wall config names the bar sides by compass and keeps the saved choices", () => {
  const html = api.configHtml({c: [0, 0, 100, 0], flags: {[MOD]: {lock: "excellent", barSide: "a", keyName: "Cellar key"}}});
  assert.match(html, /On the south side/);
  assert.match(html, /On the north side/);
  assert.match(html, /value="excellent" selected/);
  assert.match(html, /value="Cellar key"/);
  assert.match(html, /data-fixed/);
});

test("runtime: the summary before a roll names pool, difficulty, successes, time and noise", () => {
  const o = api.describeWall(door.document);
  const pick = api.rules.optionsFor(o, api.characterFor(pc, tokPc.center, door.document)).find(x => x.id === "pick");
  const s = api.optionSummary(pick);
  assert.match(s, /Dexterity \+ Larceny: 5 dice at 6/);
  assert.match(s, /3 successes needed/);
  assert.match(s, /a turn a roll/);
  assert.match(s, /quiet/);
});
