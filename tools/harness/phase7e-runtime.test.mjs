import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/*
 * Phase 7e: the open world's runtime (WoDX Storyteller core.mjs) on a small stand-in for Foundry: world settings, the
 * approval queue, actors and their owners, scenes with tokens, the clock and the chat log. The gate checks the real world.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MOD = "wodx-storyteller";
const G = await import(join(root, "modules/wodx-chronicle/scripts/gen-core.mjs"));
const {secondsToNextDusk} = await import(join(root, "modules/wodx-chronicle/scripts/calendar.mjs"));

/* ---- the stand-in ---- */
const store = new Map();
let idn = 0;
globalThis.Hooks = {on: () => {}, once: () => {}, callAll: () => {}};
globalThis.foundry = {utils: {deepClone: o => (o === undefined ? o : structuredClone(o)), randomID: () => `id${String(++idn).padStart(6, "0")}`}};
const chat = [];
globalThis.ChatMessage = {create: async d => { chat.push(structuredClone(d)); return d; }};
const notes = [];
globalThis.ui = {notifications: {info: m => notes.push(["info", m]), warn: m => notes.push(["warn", m]), error: m => notes.push(["error", m])}};
const users = new Map([["gm", {id: "gm", name: "Storyteller", isGM: true}], ["u1", {id: "u1", name: "Ana", isGM: false}], ["u2", {id: "u2", name: "Bea", isGM: false}]]);
const actors = new Map();
function actor(id, name, owner, type = "Mortal") {
  const a = {id, name, type, hasPlayerOwner: !!owner, flags: {}, ownership: owner ? {[owner]: 3} : {},
    prototypeToken: {width: 1, height: 1},
    testUserPermission: (u, lvl) => !!owner && u.id === owner && lvl === "OWNER",
    getTokenDocument: async data => ({toObject: () => ({actorId: id, name, actorLink: true, ...data})})};
  actors.set(id, a);
  return a;
}
class Coll extends Map { get contents() { return [...this.values()]; } find(f) { return this.contents.find(f); } filter(f) { return this.contents.filter(f); } }
function scene(id, name, flags = {}) {
  const s = {id, uuid: `Scene.${id}`, name, flags, active: false, tokens: new Coll(), dimensions: {sceneX: 0, sceneY: 0, sceneWidth: 2000, sceneHeight: 1000, size: 100},
    async createEmbeddedDocuments(type, list, options) { return list.map(d => { const t = {id: `t${++idn}`, parent: s, ...d}; s.tokens.set(t.id, t); return t; }); },
    async deleteEmbeddedDocuments(type, ids) { for ( const i of ids ) s.tokens.delete(i); },
    async update(u) { for ( const [k, v] of Object.entries(u) ) { const parts = k.split("."); let o = s; for ( const p of parts.slice(0, -1) ) o = (o[p] ??= {}); o[parts.at(-1)] = v; } },
    view: () => {}};
  scenes.set(id, s);
  return s;
}
const scenes = new Coll();
const time = {worldTime: 0, advance: async d => { time.worldTime += d; }};
globalThis.game = {
  user: users.get("gm"), users: Object.assign(new Coll(users), {activeGM: users.get("gm")}),
  time, actors: new Coll(), scenes, tables: new Coll(),
  socket: {emit: () => {}},
  settings: {register: (m, k, cfg) => { if ( !store.has(`${m}.${k}`) ) store.set(`${m}.${k}`, structuredClone(cfg.default)); },
    get: (m, k) => { if ( !store.has(`${m}.${k}`) ) throw new Error(`no setting ${m}.${k}`); return structuredClone(store.get(`${m}.${k}`)); },
    set: async (m, k, v) => { store.set(`${m}.${k}`, structuredClone(v)); return v; }},
  modules: new Map()
};
game.actors = actors; Object.defineProperty(actors, "contents", {get() { return [...actors.values()]; }});
globalThis.fromUuid = async () => null;
globalThis.fromUuidSync = () => null;
globalThis.canvas = {scene: null};
store.set("wodx-chronicle.latitude", 50.1);

// WoDX Chronicle: the queue and the generator
const queue = [], handlers = new Map();
const chronApi = {
  propose: async req => { if ( req.key && queue.some(q => q.key === req.key) ) return; queue.push({id: `q${queue.length}`, ...structuredClone(req)}); },
  registerApprovalHandler: (t, h) => handlers.set(t, h),
  gen: {random: key => G.stream("rothenstein", key)},
  approvals: {pending: () => queue},
  isSkipping: () => false
};
game.modules.set("wodx-chronicle", {api: chronApi});
const decide = async (q, verdict) => { queue.splice(queue.indexOf(q), 1); const h = handlers.get(q.type); if ( verdict === "approve" ) await h.approve?.(q); else await h.reject?.(q); };

const C = await import(join(root, "modules/wodx-storyteller/scripts/core.mjs"));
C.registerSettings();
C.registerHandlers();
const set = (k, v) => store.set(`${MOD}.${k}`, v);

const anna = actor("anna", "Anna", "u1", "Vampire");
const bo = actor("bo", "Bo", "u2");
const npcA = actor("npc", "The Bishop", null);
const tavern = scene("tavern", "The Tavern");
const keep = scene("keep", "Kranzfels Keep");
scene("battle", "⚔ BATTLEMAP · The Ford");
const mill = scene("mill", "The Mill");
await tavern.createEmbeddedDocuments("Token", [{actorId: "anna", actorLink: true}, {actorId: "bo", actorLink: true}, {actorId: "npc", actorLink: true}]);
// Start at dusk on the first night, so dawn is hours away
time.worldTime = secondsToNextDusk(0, 50.1) + 60;
const start = time.worldTime;

test("characters: player-owned only; where they are; who owns them", () => {
  assert.deepEqual(C.pcs().map(a => a.id), ["anna", "bo"]);
  assert.equal(C.whereIs(anna).id, "tavern");
  assert.equal(C.ownerOf(bo).id, "u2");
  assert.equal(C.personalTime("anna"), start, "no time of their own yet: the clock's");
});

test("travel places: while none is marked, every scene but battle maps and tests", () => {
  assert.deepEqual(C.travelPlaces().map(p => p.id).sort(), ["keep", "mill", "tavern"]);
});

test("a trip: the token moves, the character's time moves, the log says so, the clock does not", async () => {
  set("encounters", false);
  const r = await C.travel({actorId: "bo", destId: "mill"});
  assert.equal(r.ok, true);
  assert.equal(C.whereIs(bo).id, "mill");
  assert.equal(tavern.tokens.filter(t => t.actorId === "bo").length, 0, "the old token is gone");
  assert.equal(mill.tokens.filter(t => t.actorId === "bo").length, 1);
  const t = mill.tokens.find(x => x.actorId === "bo");
  assert.deepEqual([t.x, t.y], [950, 450], "the middle of the scene, less half a token");
  assert.equal(C.personalTime("bo"), start + 30 * 60, "30 minutes by default");
  assert.equal(time.worldTime, start, "the world clock stays the Storyteller's");
  const e = C.entries()[0];
  assert.equal(e.kind, "travel");
  assert.equal(e.user, "u2");
  assert.match(e.text, /From The Tavern to The Mill, 30 min on the way/);
});

test("a place that asks first goes to the queue; approving it makes the trip", async () => {
  await C.setTravel(keep, {ask: true, minutes: 20});
  const before = C.personalTime("anna");
  const r = await C.travel({actorId: "anna", destId: "keep"});
  assert.equal(r.waiting, true);
  assert.equal(C.whereIs(anna).id, "tavern", "not moved yet");
  const q = queue.find(x => x.type === `${MOD}.travel`);
  assert.ok(q);
  assert.match(q.title, /Anna wants to go to Kranzfels Keep/);
  // Now that one place is marked, only marked places are open
  assert.deepEqual(C.travelPlaces().map(p => p.id), ["keep"]);
  await decide(q, "approve");
  assert.equal(C.whereIs(anna).id, "keep");
  assert.equal(C.personalTime("anna"), before + 20 * 60);
  await keep.update({[`flags.${MOD}.travel`]: null}); delete keep.flags[MOD];
});

test("an encounter on the road waits in the queue, and never touches the character by itself", async () => {
  set("encounters", true);
  set("encounterChance", 100);
  const r = await C.travel({actorId: "anna", destId: "tavern"});
  assert.equal(r.ok, true);
  const q = queue.find(x => x.type === `${MOD}.encounter`);
  assert.ok(q, "an encounter was queued");
  assert.match(q.detail, /no encounter table is set/);
  assert.equal(C.entries()[0].kind, "encounter");
  assert.equal(C.entries()[0].attention, "An encounter on the road");
  await decide(q, "reject");
  assert.match(C.entries()[0].text, /quiet after all/);
  set("encounterChance", 10);
  set("encounters", false);
});

test("solo play: time moves on, the night's limit holds, a world-changing result is queued", async () => {
  set("soloLimit", 2);
  const t0 = C.personalTime("bo");
  let r = await C.solo({actorId: "bo", kind: "research", note: "Reads the parish records"});
  assert.equal(r.ok, true);
  assert.equal(C.personalTime("bo"), t0 + 2 * 3600);
  r = await C.solo({actorId: "bo", kind: "talk", hours: 0.5, note: "Asks the miller about the bishop", changesWorld: true});
  assert.equal(r.waiting, true);
  assert.ok(queue.find(x => x.type === `${MOD}.solo`));
  r = await C.solo({actorId: "bo", kind: "downtime"});
  assert.equal(r.ok, false);
  assert.match(r.why, /2 solo actions a night/);
  const solo = C.entries().filter(e => e.kind === "solo");
  assert.equal(solo.length, 2);
  assert.equal(solo[0].attention, "A result that changes the world");
  set("soloLimit", 0);
});

test("convening: tokens arrive, times line up, the clock moves to the scene, solo play pauses, players are told", async () => {
  const a = C.personalTime("anna"), b = C.personalTime("bo");
  assert.ok(b > a, "Bo is ahead");
  chat.length = 0;
  const r = await C.convene({actorIds: ["anna", "bo"], sceneId: "keep", reason: "The bishop has come"});
  assert.equal(r.ok, true);
  assert.equal(r.target, b);
  assert.equal(time.worldTime, b, "the world clock moves on to the scene's time");
  assert.equal(C.personalTime("anna"), b);
  assert.equal(C.whereIs(anna).id, "keep");
  assert.equal(C.whereIs(bo).id, "keep");
  const annaCard = chat.find(m => m.whisper.includes("u1"));
  assert.match(annaCard.content, /behind\. Sum up what they did/);
  assert.ok(annaCard.whisper.includes("gm"));
  assert.match(chat.find(m => m.whisper.includes("u2")).content, /ahead of the others and waits/);
  const s = await C.solo({actorId: "anna", kind: "hunt"});
  assert.equal(s.ok, false);
  assert.match(s.why, /called this character/);
  const tr = await C.travel({actorId: "bo", destId: "mill"});
  assert.equal(tr.ok, false, "travel waits too");
  await C.release(["anna"]);
  assert.equal((await C.solo({actorId: "anna", kind: "hunt"})).ok, true);
  await C.release();
  assert.deepEqual(C.convenedMap(), {});
});

test("beats: a place beat that calls characters goes to the queue; approving it convenes them; it fires once", async () => {
  await C.saveBeat({id: "b1", name: "The bishop's sermon", on: "place", place: "Scene.mill", actor: "anna", convene: ["anna", "bo"], scene: "tavern", reason: "The sermon begins"});
  await C.saveBeat({id: "b2", name: "Midnight bell", on: "time", time: time.worldTime + 600});
  set("encounters", false);
  await C.travel({actorId: "anna", destId: "mill"});
  const q = queue.find(x => x.type === `${MOD}.beat`);
  assert.ok(q, "the beat waits in the queue");
  assert.match(q.detail, /Call Anna, Bo to The Tavern/);
  assert.equal(C.beats().find(b => b.id === "b1").fired, true);
  await decide(q, "approve");
  assert.equal(C.whereIs(anna).id, "tavern");
  assert.ok(C.convenedMap().bo);
  await C.release();
  // Arriving again does not fire it twice
  await C.travel({actorId: "anna", destId: "mill"});
  assert.equal(queue.filter(x => x.type === `${MOD}.beat`).length, 0);
  // A time beat with nobody to call is a card for the Storyteller
  chat.length = 0;
  await time.advance(700);
  await C.onClock();
  assert.ok(chat.some(m => /Midnight bell/.test(m.content) && m.whisper.includes("gm") && !m.whisper.includes("u1")));
  // Beats switched off wait
  await C.saveBeat({id: "b3", name: "Later", on: "time", time: time.worldTime});
  set("beatsOn", false);
  await C.onClock();
  assert.equal(C.beats().find(b => b.id === "b3").fired, false);
  set("beatsOn", true);
});

test("dawn: a warning once, then a night left behind catches up when the clock passes dawn", async () => {
  const dawn = C.dawnAfter(time.worldTime);
  await time.advance(dawn - time.worldTime - 1800);
  await C.setPersonal("anna", time.worldTime);
  chat.length = 0;
  await C.dawnWarnings();
  const warned = chat.filter(m => /Dawn is near/.test(m.content));
  assert.ok(warned.some(m => m.whisper.includes("u1")), "Anna's player is warned");
  await C.dawnWarnings();
  assert.equal(chat.filter(m => /Dawn is near/.test(m.content)).length, warned.length, "once a dawn");
  await C.setPersonal("anna", dawn - 7200);
  await time.advance(3600);
  await C.onClock();
  assert.equal(C.personalTime("anna"), time.worldTime, "dawn came for everyone");
  assert.ok(C.entries().some(e => e.kind === "dawn" && e.actor === "anna"));
});

test("watching the table: a player character's roll and a frenzy card are logged; an NPC's are not", async () => {
  const n = C.entries().length;
  await C.onChat({speaker: {actor: "bo", scene: "mill"}, rolls: [{}], flavor: "Wits + Alertness", content: "", author: {id: "u2"}});
  await C.onChat({speaker: {actor: "anna"}, rolls: [], flavor: "", content: "<p>Anna fights the Beast: <b>Frenzy</b> check</p>"});
  await C.onChat({speaker: {actor: "npc"}, rolls: [{}], flavor: "The Bishop rolls"});
  await C.onChat({speaker: {actor: "anna"}, rolls: [], content: "Hello"});
  const added = C.entries().slice(0, C.entries().length - n);
  assert.equal(added.length, 2);
  assert.equal(added[1].kind, "roll");
  assert.equal(added[1].place, "The Mill");
  assert.equal(added[0].attention, "A frenzy");
  // A token placed by hand is an arrival; one placed by WoDX travel is not logged twice
  await C.onToken({actor: bo, parent: keep}, {});
  await C.onToken({actor: bo, parent: keep}, {wodxTravel: true});
  await C.onToken({actor: npcA, parent: keep}, {});
  assert.equal(C.entries().filter(e => e.kind === "arrive").length, 1);
});

test("the session: ending it marks the report; the report shows who moved and what is brewing", async () => {
  await C.endSession({factions: false});
  const mark = store.get(`${MOD}.session`);
  assert.equal(mark.at, time.worldTime);
  assert.equal(C.report().sections.find(s => s.title === "Who moved").lines.length, 0, "nothing since the mark");
  await time.advance(60);
  set("encounters", false);
  await C.travel({actorId: "bo", destId: "tavern"});
  const rep = C.report();
  assert.deepEqual(rep.sections.find(s => s.title === "Who moved").lines, ["Bo: The Tavern"]);
  assert.ok(rep.sections.find(s => s.title === "What is brewing").lines.some(l => /Waiting for you/.test(l)), "the queue's waiting cards");
});

test("only the active Storyteller writes", async () => {
  const n = C.entries().length;
  game.user = users.get("u1");
  assert.equal((await C.travel({actorId: "anna", destId: "keep"})).ok, false);
  assert.equal((await C.solo({actorId: "anna", kind: "hunt"})).ok, false);
  await C.log({kind: "note", text: "x"});
  assert.equal(C.entries().length, n);
  game.user = users.get("gm");
});

test("map events (0.3.0): a player character's change goes in the log and fires a map beat; Undo takes the line out; NPCs stay out", async () => {
  game.user = users.get("gm");
  const tok = {actor: anna};
  globalThis.fromUuidSync = u => (u === "Scene.keep.Token.ta" ? tok : u === "Scene.keep.Token.tn" ? {actor: npcA} : null);
  await C.saveBeat({id: "bm", name: "Someone in the cellar", on: "map", place: "Scene.keep", value: "force"});
  chat.length = 0;
  const ev = {kind: "force", scene: "keep", place: "Scene.keep", at: time.worldTime, noise: "loud", who: "Scene.keep.Token.ta", whoName: "Anna",
    object: "w1", objectName: "The cellar door", objectType: "Wall", state: "forced", heard: ["x"], message: "msg1", undone: false};
  const e = await C.onMapEvent(ev);
  assert.equal(e.actor, "anna");
  assert.equal(e.user, "u1");
  assert.equal(C.entries().find(x => x.id === "map:msg1").text, "Anna forced the cellar door (heard by 1).");
  assert.equal(C.beats().find(b => b.id === "bm").fired, true);
  assert.ok(chat.some(m => /Someone in the cellar/.test(m.content)));
  await C.onMapEvent({...ev, undone: true});
  assert.equal(C.entries().some(x => x.id === "map:msg1"), false, "Undo takes the line out");
  assert.equal(await C.onMapEvent({...ev, message: "msg2", who: "Scene.keep.Token.tn", whoName: "The Bishop"}), null, "an NPC's doing is not a player's log line");
  assert.equal(C.entries().some(x => x.id === "map:msg2"), false);
  globalThis.fromUuidSync = () => null;
});
