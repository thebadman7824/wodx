import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/*
 * WoDX Senses: the rules (senses-rules.mjs), the line tables, and the runtime (main.mjs) on a small stand-in for
 * Foundry: one tavern scene, a player's token, NPCs, Interactables tiles, a chat log and dice that roll what the test
 * says. The gate in Foundry checks the real canvas, lights and walls.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const R = await import(join(root, "modules/wodx-senses/scripts/senses-rules.mjs"));
const places = JSON.parse(readFileSync(join(root, "modules/wodx-senses/data/places.json"), "utf8"));
const world = JSON.parse(readFileSync(join(root, "modules/wodx-senses/data/world.json"), "utf8"));
const TABLES = {places, ...world};
const MOD = "wodx-senses";

/* ---------------- the tables ---------------- */

test("every place kind WoDX NPC tags has lines for all four senses, with something anyone notices in every era", () => {
  const kinds = ["home", "workplace", "church", "tavern", "haven", "gate", "market", "street", "castle", "wilds", "caern", "other"];
  for ( const k of kinds ) for ( const s of R.SENSE_KEYS ) {
    const lines = places.kinds[k]?.[s] ?? [];
    assert.ok(lines.length, `${k} ${s}`);
    for ( const era of Object.keys(R.ERA_BANDS) ) for ( const indoor of [true, false] ) {
      const fit = R.placeLines(TABLES, {kind: k}, s, {era, part: "day", sky: "clear", indoor});
      assert.ok(fit.some(l => !l.n), `${k} ${s} ${era} has a free line`);
    }
  }
});

test("every line is well formed: text, a need from 0 to 5, known tags", () => {
  const WX_TAGS = ["rain", "downpour", "snow", "sleet", "hail", "fog", "mist", "wind", "gale", "thunder", "snow-lying", "cold", "hot", "leaves"];
  const bands = Object.keys(R.ERA_BANDS), parts = ["night", "dawn", "day", "dusk"], skies = ["clear", "cloudy", "overcast", "storm"];
  const walk = (x, path) => {
    if ( Array.isArray(x) ) for ( const l of x ) {
      assert.equal(typeof l.t, "string", path); assert.ok(l.t.length > 3 && l.t.length < 200, `${path}: ${l.t}`);
      assert.ok((l.n ?? 0) >= 0 && (l.n ?? 0) <= 5, path);
      for ( const e of l.e ?? [] ) assert.ok(bands.includes(e), `${path} band ${e}`);
      for ( const p of l.p ?? [] ) assert.ok(parts.includes(p), `${path} part ${p}`);
      for ( const k of l.sky ?? [] ) assert.ok(skies.includes(k), `${path} sky ${k}`);
      for ( const k of l.wx ?? [] ) assert.ok(WX_TAGS.includes(k), `${path} weather ${k}`);
      if ( l.io ) assert.ok(["in", "out"].includes(l.io), path);
      assert.ok(!/\s—\s|--/.test(l.t), `${path}: no dashes in ${l.t}`);
    }
    else if ( x && typeof x === "object" ) for ( const [k, v] of Object.entries(x) ) if ( k !== "sense" ) walk(v, `${path}.${k}`);
  };
  walk(TABLES, "tables");
  for ( const [k, c] of Object.entries(world.channels) ) assert.ok(R.SENSES[c.sense], `channel ${k} names a sense`);
});

/* ---------------- the rules ---------------- */

test("era bands, indoors by kind, parts of the day, the moon", () => {
  assert.equal(R.eraBand(1197), "medieval");
  assert.equal(R.eraBand(1600), "early");
  assert.equal(R.eraBand(1890), "industrial");
  assert.equal(R.eraBand(1995), "modern");
  assert.equal(R.eraBand(2050), "future");
  assert.equal(R.isIndoor({kind: "tavern"}), true);
  assert.equal(R.isIndoor({kind: "street"}), false);
  assert.equal(R.isIndoor({kind: "street", io: "in"}), true);
  assert.equal(R.partOfDay({hours: 12, sunrise: 6, sunset: 18}), "day");
  assert.equal(R.partOfDay({hours: 6.2, sunrise: 6, sunset: 18}), "dawn");
  assert.equal(R.partOfDay({hours: 17.5, sunrise: 6, sunset: 18}), "dusk");
  assert.equal(R.partOfDay({hours: 2, sunrise: 6, sunset: 18}), "night");
  assert.equal(R.moonWord(4), "full");
  assert.equal(R.moonWord(0), "new");
});

test("light: a lit spot is bright; outdoors at night the moon and the clouds decide; a dark room indoors is pitch", () => {
  assert.equal(R.lightLevel({lit: true}), "bright");
  assert.equal(R.lightLevel({daylight: true}), "bright");
  assert.equal(R.lightLevel({daylight: true, indoor: true}), "dim");
  assert.equal(R.lightLevel({part: "night", moon: 1}), "dim");
  assert.equal(R.lightLevel({part: "night", moon: 1, sky: "overcast"}), "dark");
  assert.equal(R.lightLevel({part: "night", moon: 0}), "pitch");
  assert.equal(R.lightLevel({part: "night", indoor: true}), "pitch");
});

test("difficulty: dark and noise add steps, powers take them off, never below 3; pitch dark is blind without dark sight", () => {
  assert.deepEqual(R.difficulty("sight", {light: "bright"}).diff, 6);
  assert.equal(R.difficulty("sight", {light: "dark"}).diff, 8);
  assert.equal(R.difficulty("sight", {light: "pitch"}).blind, true);
  const cat = R.powersFor({eyesOfCat: true});
  assert.equal(R.difficulty("sight", {light: "pitch"}, cat).blind, false);
  assert.equal(R.difficulty("sight", {light: "pitch"}, cat).diff, 6);
  assert.equal(R.difficulty("sound", {crowd: true, sky: "storm", indoor: false}).diff, 8);
  assert.equal(R.difficulty("sound", {crowd: true, sky: "storm", indoor: true}).diff, 7);
  const auspex = R.powersFor({auspex: 4});
  assert.equal(R.difficulty("smell", {}, auspex).diff, 3);
  assert.ok(R.difficulty("smell", {}, auspex).parts.some(p => /no lower/.test(p)));
  assert.equal(R.difficulty("smell", {}, R.powersFor({auspex: 4, useAuspex: false})).diff, 6);
});

test("powers: the Gift is -2 in human forms and -3 in the wolf forms; wolf forms put smell first; channels by power", () => {
  assert.equal(R.powersFor({heightened: true, form: "homid"}).mods[0].n, 2);
  assert.equal(R.powersFor({heightened: true, form: "lupus"}).mods[0].n, 3);
  assert.equal(R.powersFor({form: "hispo"}).smellFirst, true);
  assert.equal(R.powersFor({form: "homid"}).smellFirst, false);
  assert.deepEqual(R.powersFor({senseWyrm: true, awareness: 2, spheres: {life: 1}}).channels.sort(), ["sphere-life", "taint", "uncanny"]);
  assert.ok(R.powersFor({kind: "wraith", layer: "shadowlands"}).channels.includes("lifesight"));
  assert.ok(!R.powersFor({kind: "wraith", layer: "physical"}).channels.includes("lifesight"));
  assert.ok(R.powersFor({secondSight: true}).channels.includes("unnatural"));
});

test("reach: sight needs light and a clear line; sound gets through one wall muffled; smell stops at a wall", () => {
  assert.equal(R.reachOf("sight", {yards: 10}, {light: "bright"}), 0);
  assert.equal(R.reachOf("sight", {yards: 10, sightBlocked: true}), null);
  assert.equal(R.reachOf("sight", {yards: 10}, {light: "pitch"}), null);
  assert.equal(R.reachOf("sight", {yards: 10, glows: true}, {light: "pitch"}), 0);
  assert.equal(R.reachOf("sound", {yards: 10, walls: 0}), 0);
  assert.equal(R.reachOf("sound", {yards: 10, walls: 1}), 1);
  assert.equal(R.reachOf("sound", {yards: 10, walls: 2}), null);
  assert.equal(R.reachOf("sound", {yards: 10, walls: 2}, {extra: {sound: 1}}), 2);
  assert.equal(R.reachOf("sound", {yards: 12, loud: "quiet"}), null);
  assert.equal(R.reachOf("smell", {yards: 5, walls: 1}), null);
  assert.equal(R.reachOf("smell", {yards: 15, strong: true}), 0);
  assert.equal(R.reachOf("touch", {yards: 3}), 0);
});

test("the Storyteller's own lines lead, can need successes, and can replace the built-in ones", () => {
  const own = R.parseOwnLines("The Boar's sign creaks.\n2: A smear of wax on the cellar latch.");
  assert.deepEqual(own.map(l => l.n), [0, 2]);
  const ctx = {era: "medieval", part: "night", sky: "clear", indoor: true};
  const both = R.placeLines(TABLES, {kind: "tavern", own: {sight: "The Boar's sign creaks."}}, "sight", ctx);
  assert.ok(both.length > 1 && both[0].own);
  const only = R.placeLines(TABLES, {kind: "tavern", own: {sight: "The Boar's sign creaks."}, replace: true}, "sight", ctx);
  assert.equal(only.length, 1);
});

test("compose: a free look gives what anyone notices; each success adds lines, rarest sources first; a botch gives only the free lines", () => {
  const ctx = {era: "medieval", part: "night", sky: "overcast", indoor: true, moon: "full"};
  const place = R.placeLines(TABLES, {kind: "tavern"}, "sound", ctx);
  const cond = R.conditionLines(TABLES, "sound", ctx);
  const sources = [{t: "Breathing in the wardrobe.", n: 3, id: "hide"}, {t: "Talk and cups.", n: 0, id: "drink"}];
  const rand = () => 0.3;
  const free = R.compose({place, cond, sources, successes: 0, rand});
  assert.ok(free.lines.every(l => !l.n));
  assert.ok(free.lines.some(l => l.id === "drink"));
  assert.ok(free.held.some(l => l.id === "hide"));
  const three = R.compose({place, cond, sources, successes: 3, rand});
  assert.ok(three.lines.some(l => l.id === "hide"));
  assert.ok(three.lines.length > free.lines.length && three.lines.length <= 6);
  const botch = R.compose({place, cond, sources, successes: 3, botch: true, rand});
  assert.ok(botch.lines.every(l => !l.n));
});

test("the same seed gives the same answer; memory lets a new roll in only when something changed", () => {
  const ctx = {era: "medieval", part: "night", sky: "clear", indoor: true, moon: "full"};
  const place = R.placeLines(TABLES, {kind: "church"}, "sight", ctx);
  const a = R.render(R.compose({place, successes: 2, rand: R.seedFor("s", {scene: "x", sense: "sight", actor: "a"})}).lines, R.seedFor("s", {}));
  const b = R.render(R.compose({place, successes: 2, rand: R.seedFor("s", {scene: "x", sense: "sight", actor: "a"})}).lines, R.seedFor("s", {}));
  assert.deepEqual(a, b);
  const fp = R.fingerprint(["b", "a", "a"]);
  assert.equal(fp, "a,b");
  assert.equal(R.canRoll(undefined, fp), true);
  assert.equal(R.canRoll({fp, closer: false}, fp), true);
  assert.equal(R.canRoll({fp, closer: true}, fp), false);
  assert.equal(R.canRoll({fp: "a", closer: true}, fp), true);
  const mem = Object.fromEntries(Array.from({length: 30}, (_, i) => [`k${i}`, {at: i}]));
  assert.equal(Object.keys(R.trimMemory(mem)).length, 24);
  assert.ok(R.trimMemory(mem).k29);
});

test("commands and questions in chat", () => {
  assert.deepEqual(R.parseCommand("/look door"), {sense: "sight", focus: "door"});
  assert.deepEqual(R.parseCommand("/listen"), {sense: "sound", focus: ""});
  assert.deepEqual(R.parseCommand("/sense"), {sense: "all", focus: ""});
  assert.equal(R.parseCommand("/lookup"), null);
  assert.equal(R.parseCommand("hello"), null);
  assert.equal(R.questionSense("What do I smell?"), "smell");
  assert.equal(R.questionSense("can I hear anything"), "sound");
  assert.equal(R.questionSense("What do we see when we get there?"), "sight");
  assert.equal(R.questionSense("Do I notice anything odd?"), "sight");
  assert.equal(R.questionSense("I smell the rose."), null);
  assert.equal(R.questionSense("what time is it?"), null);
});

test("Obfuscate: Auspex below the Obfuscate can't try; equal is 8, each dot above takes one off; second sight needs no roll", () => {
  assert.equal(R.obfuscateCheck(1, 2).canTry, false);
  assert.equal(R.obfuscateCheck(2, 2).diff, 8);
  assert.equal(R.obfuscateCheck(4, 2).diff, 6);
  assert.equal(R.obfuscateCheck(0, 3, {secondSight: true}).auto, true);
});

test("the other worlds swap the place layer; the Penumbra reads the place's resonance", () => {
  const ctx = {era: "medieval", part: "night", sky: "clear", indoor: true};
  const p = R.layerLines(TABLES, "penumbra", {kind: "church", resonance: "wyrm"}, "sight", ctx);
  assert.ok(p.some(l => /slime/.test(l.t)) && p.some(l => /church/i.test(l.t)));
  const s = R.layerLines(TABLES, "shadowlands", {kind: "tavern"}, "sight", ctx);
  assert.ok(s.some(l => /grey/.test(l.t)));
});

test("directions and people in words", () => {
  assert.equal(R.directionWord({x: 0, y: 0}, {x: 0, y: -10}), "to the north");
  assert.equal(R.directionWord({x: 0, y: 0}, {x: 10, y: 10}), "to the south-east");
  assert.equal(R.peopleWord(1), "one person");
  assert.equal(R.peopleWord(3), "a few people");
  assert.equal(R.peopleWord(20), "a crowd");
});

/* ---------------- the runtime, on a stand-in for Foundry ---------------- */

const G = 100;
class Coll extends Map {
  get contents() { return [...this.values()]; }
  find(f) { return this.contents.find(f); }
  filter(f) { return this.contents.filter(f); }
  [Symbol.iterator]() { return this.values(); }
}
function setPath(obj, path, value) {
  const parts = path.split(".");
  let o = obj;
  for ( let k = 0; k < parts.length - 1; k++ ) o = (o[parts[k]] ??= {});
  o[parts.at(-1)] = structuredClone(value);
}
const hooks = new Map();
const chat = [];
const socket = [];
let faces = [];
const users = new Coll();
const gm = {id: "gm", isGM: true, active: true, name: "Storyteller"}, player = {id: "pl", isGM: false, active: true, name: "Player"};
users.set("gm", gm); users.set("pl", player);
Object.defineProperty(users, "activeGM", {get: () => gm});
let me = gm;
const settings = new Map([["wodx-chronicle.latitude", 50], ["wodx-actions.sky", "overcast"], ["wodx-actions.wraithScene", 0]]);
const scene = {id: "scn1", name: "The Gilded Boar", navName: "The Gilded Boar", grid: {size: G, units: "ft", distance: 5}, environment: {darknessLevel: 1},
  walls: new Coll(), tiles: new Coll(), tokens: new Coll(), lights: new Coll(), regions: new Coll(), levels: new Coll(),
  flags: {"wodx-npc": {place: {kind: "tavern"}}}, async update(d) { for ( const [k, v] of Object.entries(d) ) setPath(scene, k, v); return scene; }};
const uuids = new Map();
function actor(id, name, {per = 3, alertness = 2, awareness = 0, items = [], kind = "mortal", flags = {}} = {}) {
  return {id, name, items, flags, kindForTest: kind, statuses: new Set(),
    system: {attributes: {perception: {value: per}}, abilities: {alertness: {value: alertness}, awareness: {value: awareness}}, health: {damage: {woundpenalty: 0}}},
    async update(data) { for ( const [k, v] of Object.entries(data) ) setPath(this, k, v); return this; }};
}
function token(id, a, x, y) {
  const doc = {id, name: a.name, x, y, width: 1, height: 1, actor: a, hidden: false, parent: scene, uuid: `Scene.scn1.Token.${id}`};
  uuids.set(doc.uuid, doc);
  scene.tokens.set(id, doc);
  return doc;
}
function tile(id, x, y, flags = {}, {hidden = false} = {}) {
  const doc = {id, x, y, width: G, height: G, hidden, flags: {"wodx-interactables": flags}, parent: scene};
  scene.tiles.set(id, doc);
  return doc;
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
globalThis.CONST = {WALL_DOOR_STATES: {CLOSED: 0, OPEN: 1, LOCKED: 2}};
const soundWalls = [];
globalThis.CONFIG = {Canvas: {polygonBackends: {
  sound: {testCollision: (a, b, {mode}) => { const h = soundWalls.filter(w => (a.y < w) !== (b.y < w)); return mode === "all" ? h : h.length > 0; }},
  sight: {testCollision: (a, b) => soundWalls.some(w => (a.y < w) !== (b.y < w))}
}}, sounds: {dice: "dice.wav"}};
globalThis.foundry = {utils: {deepClone: o => (o === undefined ? o : structuredClone(o))}, applications: {api: {DialogV2: {wait: async () => null}}}};
globalThis.Roll = FakeRoll;
globalThis.ui = {notifications: {info: () => {}, warn: () => {}}};
globalThis.fromUuid = async u => uuids.get(u) ?? null;
globalThis.fetch = async url => {
  const f = String(url).replace(/^modules\//, "");
  return {ok: true, json: async () => JSON.parse(readFileSync(join(root, "modules", f), "utf8"))};
};
const IXR = await import(join(root, "modules/wodx-interactables/scripts/interact-rules.mjs"));
globalThis.game = {
  users, get user() { return me; }, time: {worldTime: 0}, scenes: new Coll([["scn1", scene]]), world: {id: "w"},
  settings: {register: (m, k, cfg) => { if ( !settings.has(`${m}.${k}`) ) settings.set(`${m}.${k}`, cfg.default); }, get: (m, k) => { if ( !settings.has(`${m}.${k}`) ) throw new Error("no setting"); return settings.get(`${m}.${k}`); }},
  socket: {on: () => {}, emit: (n, m) => socket.push(m)},
  modules: new Coll([[MOD, {active: true}], ["wodx-chronicle", {active: true, api: {gen: {seed: () => "seed"}, eras: {currentYear: () => 1197}, conditions: {hasCondition: (a, id) => a?.statuses?.has?.(`wodx-${id}`)}}}], ["wodx-interactables", {active: true, api: {}}]]),
  wodxActions: {getKind: a => a?.kindForTest ?? "mortal"}
};
globalThis.ChatMessage = {create: async data => { const msg = {id: `m${chat.length}`, ...structuredClone({...data, rolls: undefined}), rolls: data.rolls ?? []}; chat.push(msg); return msg; }};
globalThis.canvas = {ready: true, scene, grid: {size: G, measurePath: ([a, b]) => ({distance: Math.hypot(a.x - b.x, a.y - b.y) / G * 5})}, effects: {lightSources: []}, environment: {}, tokens: {controlled: [], placeables: []}};

const pc = actor("pc1", "Anna Weiss");
const tokPc = token("tpc", pc, 400, 400);
const drinker = actor("npc1", "Old Tomas", {flags: {"wodx-npc": {where: {activity: "drink"}}}});
token("tnpc", drinker, 600, 400);
tile("wardrobe", 300, 300, {hide: true, hideKind: "wardrobe", occupants: [{a: "x", s: 0}]});
tile("brazier", 500, 500, {hazard: true, hazardKind: "fire", size: "small"});
tile("letter", 200, 400, {clue: true, clueKind: "document", title: "A folded letter", need: 2}, {hidden: true});

await import(join(root, "modules/wodx-senses/scripts/main.mjs"));
for ( const f of hooks.get("init") ?? [] ) f();
for ( const f of hooks.get("ready") ?? [] ) await f();
const api = game.modules.get(MOD).api;
const last = (n = 1) => chat.slice(-n);

test("runtime: the tables load, and a player's ask goes to the Storyteller's table", async () => {
  assert.ok(api.tables.places.kinds.tavern);
  me = player;
  await api.ask({sense: "sound", token: tokPc});
  me = gm;
  assert.equal(socket.at(-1).type, "ask");
  assert.equal(socket.at(-1).payload.sense, "sound");
});

test("runtime: a free look at night in a tavern in 1197: whispered to the player, a fuller copy to the Storyteller, the hidden one held back", async () => {
  chat.length = 0;
  const res = await api.answer({user: "pl", token: tokPc.uuid, sense: "sound", closer: false});
  assert.equal(res.ctx.place.kind, "tavern");
  assert.equal(res.ctx.era, "medieval");
  assert.equal(res.ctx.part, "night");
  const [pMsg, stMsg] = last(2);
  assert.deepEqual(pMsg.whisper.sort(), ["gm", "pl"]);
  assert.ok(pMsg.content.includes("Share with the party"));
  assert.ok(pMsg.content.includes("Look closer"));
  assert.ok(!/Breathing|breathing, slow/.test(pMsg.content));
  assert.deepEqual(stMsg.whisper, ["gm"]);
  assert.equal(stMsg.blind, true);
  assert.ok(/Held back: .*Wardrobe/.test(stMsg.content), stMsg.content);
  assert.ok(/Talk and the knock of cups/.test(pMsg.content), "the drinker can be heard");
  assert.ok(/fire/i.test(pMsg.content), "the fire roars");
});

test("runtime: looking closer rolls Perception + Alertness blind; successes find the one hiding; asking again repeats the answer", async () => {
  chat.length = 0;
  faces = [9, 9, 9, 3, 3];
  const res = await api.answer({user: "pl", token: tokPc.uuid, sense: "sound", closer: true});
  const s = res.sections[0];
  assert.equal(s.rolled, true);
  assert.equal(s.successes, 3);
  assert.equal(last(1)[0].rolls.length, 1);
  assert.ok(s.lines.some(l => /breathing/i.test(l)), s.lines.join(" / "));
  faces = [1, 1, 1, 1, 1];
  const again = await api.answer({user: "pl", token: tokPc.uuid, sense: "sound", closer: true});
  assert.equal(again.sections[0].rolled, false);
  assert.equal(again.sections[0].repeat, true);
  assert.deepEqual(again.sections[0].lines, s.lines);
  assert.ok(pc.flags[MOD].memory);
});

test("runtime: a new wall changes the answer: the remembered closer look no longer carries over", async () => {
  soundWalls.push(450);
  const res = await api.answer({user: "pl", token: tokPc.uuid, sense: "sound", closer: false});
  soundWalls.length = 0;
  assert.equal(res.sections[0].repeat, false, "a wall between makes it a new answer");
  assert.equal(res.sections[0].successes, 0, "the earlier successes are not reused behind the wall");
});

test("runtime: a sound wall between muffles the source; two walls stop it", async () => {
  soundWalls.push(500);
  const res = await api.answer({user: "pl", token: tokPc.uuid, sense: "smell", closer: false});
  assert.ok(!res.sections[0].lines.some(l => /Thick smoke/.test(l)), "the fire's smoke stops at the wall");
  soundWalls.length = 0;
  const res2 = await api.answer({user: "pl", token: tokPc.uuid, sense: "smell", closer: false});
  assert.ok(res2.sections[0].lines.some(l => /Thick smoke/.test(l)), res2.sections[0].lines.join(" / "));
});

test("runtime: the Storyteller's own lines come first; everything at once gives a section per sense", async () => {
  scene.flags[MOD] = {own: {sight: "The Boar's sign creaks on its chain."}};
  canvas.effects.lightSources = [{active: true, shape: {contains: () => true}}];
  const res = await api.answer({user: "pl", token: tokPc.uuid, sense: "all", closer: false});
  assert.deepEqual(res.sections.map(s => s.sense), ["sight", "sound", "smell", "touch"]);
  assert.equal(res.sections[0].lines[0], "The Boar's sign creaks on its chain.");
  delete scene.flags[MOD];
  canvas.effects.lightSources = [];
});

test("runtime: a hidden clue shows only to successes; a pitch-dark room is blind unless the character has Eyes of the Cat", async () => {
  const dark = await api.answer({user: "pl", token: tokPc.uuid, sense: "sight", closer: false});
  assert.equal(dark.ctx.light, "pitch");
  assert.ok(/pitch dark/i.test(dark.sections[0].lines[0]));
  assert.ok(dark.sections[0].lines.some(l => /fire/i.test(l)), "a fire still shows in the dark");
  const cat = actor("pc2", "Ilse", {items: [{type: "Power", name: "Eyes of the Cat", system: {value: 1}}], kind: "lupine"});
  const t2 = token("tpc2", cat, 400, 420);
  faces = [9, 9, 9, 9, 3];
  const seen = await api.answer({user: "pl", token: t2.uuid, sense: "sight", closer: true});
  assert.ok(!/pitch dark/i.test(seen.sections[0].lines[0] ?? ""));
  assert.ok(seen.sections[0].lines.some(l => /folded letter/i.test(l)), seen.sections[0].lines.join(" / "));
  scene.tokens.delete("tpc2");
});

test("runtime: Obfuscate is held back from ordinary eyes, and Auspex at least equal gets a roll at 8 less the difference", async () => {
  const lurker = actor("npc2", "The Lurker", {items: [{type: "Power", name: "Obfuscate", system: {value: 2}}], kind: "kindred"});
  lurker.statuses.add("wodx-obfuscated");
  token("tlurk", lurker, 450, 400);
  canvas.effects.lightSources = [{active: true, shape: {contains: () => true}}];
  const plain = await api.answer({user: "pl", token: tokPc.uuid, sense: "sight", closer: false});
  assert.ok(plain.sections[0].held.some(h => h.name === "The Lurker"));
  assert.ok(!plain.sections[0].lines.some(l => /hidden from ordinary eyes/.test(l)));
  const seer = actor("pc3", "Markus", {awareness: 2, items: [{type: "Power", name: "Auspex", system: {value: 3}}], kind: "kindred"});
  const t3 = token("tpc3", seer, 400, 380);
  faces = [9, 9, 9, 9, 9];
  const seen = await api.answer({user: "pl", token: t3.uuid, sense: "sight", closer: true});
  assert.ok(seen.sections[0].lines.some(l => /hidden from ordinary eyes/.test(l)), seen.sections[0].lines.join(" / "));
  scene.tokens.delete("tlurk"); scene.tokens.delete("tpc3");
  canvas.effects.lightSources = [];
});

test("runtime: Sense Wyrm smells the dead; a wraith in the Shadowlands gets that world's lines and sees the living", async () => {
  const vamp = actor("npc3", "Brother Anselm", {kind: "kindred"});
  token("tv", vamp, 500, 400);
  const garou = actor("pc4", "Runs-at-Dusk", {items: [{type: "Power", name: "Sense Wyrm", system: {value: 1}}], kind: "lupine"});
  const t4 = token("tg", garou, 420, 400);
  faces = [9, 9, 9, 3, 3];
  const res = await api.answer({user: "pl", token: t4.uuid, sense: "smell", closer: true});
  assert.ok(res.sections[0].lines.some(l => /Wyrm-taint/.test(l)), res.sections[0].lines.join(" / "));
  scene.levels.set("sh", {id: "sh", flags: {"wodx-otherworlds": {layer: "shadowlands"}}});
  const ghost = actor("pc5", "Lisl", {kind: "wraith"});
  const t5 = token("tw", ghost, 420, 420);
  t5.level = "sh"; t5._source = {level: "sh"};
  canvas.effects.lightSources = [{active: true, shape: {contains: () => true}}];
  const w = await api.answer({user: "pl", token: t5.uuid, sense: "sight", closer: false});
  assert.equal(w.ctx.layer, "shadowlands");
  assert.ok(w.sections[0].lines.some(l => /grey|half fallen/i.test(l)), w.sections[0].lines.join(" / "));
  assert.ok(w.sections[0].lines.some(l => /living burn bright/.test(l)), w.sections[0].lines.join(" / "));
  for ( const id of ["tv", "tg", "tw"] ) scene.tokens.delete(id);
  canvas.effects.lightSources = [];
});

test("runtime: Storyteller reviews first holds the player's card; the copy has Send to the player", async () => {
  settings.set(`${MOD}.mode`, "review");
  chat.length = 0;
  await api.answer({user: "pl", token: tokPc.uuid, sense: "touch", closer: false});
  assert.equal(chat.length, 1);
  assert.ok(chat[0].content.includes("Send to the player"));
  settings.set(`${MOD}.mode`, "send");
});

test("runtime: a module can add its own source through the hook", async () => {
  Hooks.on("wodxSensesGather", ({sources}) => sources.push({id: "bell", key: "custom", at: {x: 450, y: 450}, lines: {touch: [{t: "The floor shivers as the bell rings below."}]}}));
  const res = await api.answer({user: "pl", token: tokPc.uuid, sense: "touch", closer: false});
  assert.ok(res.sections[0].lines.includes("The floor shivers as the bell rings below."), res.sections[0].lines.join(" / "));
});

test("runtime: the chat commands ask; Describe this place posts the free lines for everyone", async () => {
  const before = socket.length;
  me = player;
  canvas.tokens.controlled = [{actor: pc, document: tokPc}];
  const kept = hooks.get("chatMessage").map(f => f(null, "/smell the cellar"));
  me = gm;
  assert.ok(kept.includes(false));
  assert.equal(socket.length, before + 1);
  assert.equal(socket.at(-1).payload.focus, "the cellar");
  chat.length = 0;
  await api.describePlace({scene});
  assert.equal(chat.length, 1);
  assert.equal(chat[0].whisper, undefined);
  canvas.tokens.controlled = [];
});

test("memory keys carry no dots, so Foundry keeps each entry whole", () => {
  const key = R.memoryKey({scene: "abc", place: "s.P7mB", hour: "1197-3-4-22", sense: "sound"});
  assert.ok(!key.includes("."), key);
  assert.ok(key.endsWith("|sound"));
  // what Foundry does with a dotted key on update: expand it into a path
  const expand = o => { const out = {}; for ( const [k, v] of Object.entries(o) ) { const parts = k.split("."); let t = out; parts.slice(0, -1).forEach(p => { t = t[p] ??= {}; }); t[parts.at(-1)] = v; } return out; };
  const saved = expand({[key]: {fp: "x"}});
  assert.equal(saved[key]?.fp, "x");
});

test("a scene made fully dark stays pitch indoors at dawn and dusk", () => {
  assert.equal(R.lightLevel({indoor: true, part: "dusk", darkness: 1}), "pitch");
  assert.equal(R.lightLevel({indoor: true, part: "dawn", darkness: 0.2}), "dark");
  assert.equal(R.lightLevel({indoor: false, part: "dusk", darkness: 1, moon: 0}), "pitch");
  assert.equal(R.lightLevel({indoor: true, part: "dusk", darkness: 1, lit: true}), "bright");
});

/* Senses 0.5.0: the quiet interface. */
import * as QR from "../../modules/wodx-senses/scripts/quiet-rules.mjs";
import {readFileSync as readQ} from "node:fs";
test("difficulties in words, from V20's table, and only the difficulty changes", () => {
  assert.equal(QR.difficultyWord(6), "standard");
  assert.equal(QR.difficultyWord(3), "easy");
  assert.equal(QR.difficultyWord(9), "extremely difficult");
  assert.equal(QR.difficultyWord(2), "trivial");
  assert.equal(QR.difficultyWord(10), "all but impossible");
  assert.equal(QR.difficultyWord("x"), null);
  assert.equal(QR.quietText("Difficulty: 7"), "Difficulty: challenging");
  assert.equal(QR.quietText("Hurt (-1) · Difficulty: 6 · 3 successes"), "Hurt (-1) · Difficulty: standard · 3 successes");
  assert.equal(QR.quietText("3 successes"), "3 successes");
});
test("the health level as a word", () => {
  assert.equal(QR.healthWord(""), "Unhurt");
  assert.equal(QR.healthWord(null), "Unhurt");
  assert.equal(QR.healthWord("Mauled"), "Mauled");
});
test("the quiet interface is per player, has a hotkey and leaves the scene controls", () => {
  const src = readQ(new URL("../../modules/wodx-senses/scripts/quiet.mjs", import.meta.url), "utf8");
  assert.match(src, /scope: "client"/);
  assert.match(src, /default: false/);
  assert.match(src, /keybindings\?\.register/);
  const css = readQ(new URL("../../modules/wodx-senses/styles/wodx-senses.css", import.meta.url), "utf8");
  assert.match(css, /wsn-quiet #sidebar/);
  assert.doesNotMatch(css, /wsn-quiet #scene-controls|wsn-quiet #controls/);
  assert.deepEqual(QR.TUCKED.filter(s => /controls/.test(s)), []);
});

/* Senses 0.5.0: supernatural sight on the map. */
import * as SR from "../../modules/wodx-senses/scripts/sight-rules.mjs";
test("which sights a character has, and the button's order", () => {
  assert.deepEqual(SR.sightsFor({auspex: 0, profile: "mortal"}), []);
  assert.deepEqual(SR.sightsFor({auspex: 1, profile: "kindred"}), ["heightened"]);
  assert.deepEqual(SR.sightsFor({auspex: 3, profile: "kindred"}), ["heightened", "aura"]);
  assert.deepEqual(SR.sightsFor({heightenedGift: true, profile: "lupine"}), ["heightened"]);
  assert.deepEqual(SR.sightsFor({profile: "wraith"}), ["lifesight"]);
  assert.equal(SR.nextSight(null, ["heightened", "aura"]), "heightened");
  assert.equal(SR.nextSight("heightened", ["heightened", "aura"]), "aura");
  assert.equal(SR.nextSight("aura", ["heightened", "aura"]), null);
  assert.equal(SR.nextSight("lifesight", ["heightened"]), "heightened");
  assert.equal(SR.nextSight(null, []), null);
});
test("rings: auras by nature, the living warm under Lifesight, none under Heightened Senses", () => {
  assert.equal(SR.ringFor("aura", "kindred").words, "pale");
  assert.equal(SR.ringFor("aura", "mage").words, "sparkling");
  assert.equal(SR.ringFor("aura", "unknown-kind").words, "living colours");
  assert.equal(SR.ringFor("lifesight", "kindred"), null);
  assert.ok(SR.ringFor("lifesight", "mortal"));
  assert.equal(SR.ringFor("heightened", "mortal"), null);
  for ( const k of SR.SIGHT_ORDER ) assert.match(SR.SIGHTS[k].filter, /\(/);
});
test("the sight is drawn per player, behind a client setting", () => {
  const src = readQ(new URL("../../modules/wodx-senses/scripts/sight.mjs", import.meta.url), "utf8");
  assert.match(src, /"sightMap", \{[\s\S]*?scope: "client"/);
  assert.match(src, /setting\("sightMap"\) === false \? null/);
  assert.match(src, /flags\.\$\{MOD\}\.sight/);
});
