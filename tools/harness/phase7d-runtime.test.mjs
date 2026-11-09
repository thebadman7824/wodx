import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/*
 * Phase 7d: the factions runtime (factions.mjs) on a small stand-in for Foundry: world settings, the approval queue,
 * the seeded generator, places from 7c, actors and a chat log. It is not Foundry: the gate checks the real world.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MOD = "wodx-npc";
const G = await import(join(root, "modules/wodx-chronicle/scripts/gen-core.mjs"));

/* ---- the stand-in ---- */
const store = new Map(), registered = new Map();
const hooks = new Map();
let idn = 0;
globalThis.Hooks = {on: (k, f) => { if ( !hooks.has(k) ) hooks.set(k, []); hooks.get(k).push(f); }, callAll: (k, ...a) => (hooks.get(k) ?? []).forEach(f => f(...a))};
globalThis.foundry = {utils: {deepClone: o => (o === undefined ? o : structuredClone(o)), randomID: () => `id${String(++idn).padStart(6, "0")}`},
  applications: {api: {ApplicationV2: class {}, DialogV2: {confirm: async () => true, wait: async () => null}}}};
const chat = [];
globalThis.ChatMessage = {create: async d => { const m = {...structuredClone(d), id: `msg${chat.length}`}; m.update = async u => { for ( const [k, v] of Object.entries(u) ) { if ( k === "content" ) m.content = v; else { const parts = k.split("."); let o = m; for ( const p of parts.slice(0, -1) ) o = (o[p] ??= {}); o[parts.at(-1)] = v; } } return m; }; chat.push(m); return m; },
  getSpeaker: () => ({alias: "x"})};
globalThis.ui = {notifications: {info: () => {}, warn: () => {}, error: () => {}}};
let rollQueue = [];
globalThis.Roll = class { constructor(f) { this.n = Number(f.split("d")[0]); } async evaluate() { const dice = Array.from({length: this.n}, (_, i) => rollQueue.length ? rollQueue.shift() : 5); this.dice = [{results: dice.map(result => ({result}))}]; return this; } };
const actors = new Map();
const actor = (id, name, type = "Mortal", more = {}) => {
  const a = {id, name, type, uuid: `Actor.${id}`, hasPlayerOwner: false, flags: {}, items: [], system: {attributes: {}}, ...more};
  actors.set(id, a);
  return a;
};
const contents = m => [...m.values()];
globalThis.game = {
  user: {isGM: true, id: "gm"}, users: {activeGM: {id: "gm"}, filter: () => [{id: "gm"}]},
  time: {worldTime: 0},
  actors: Object.defineProperty(actors, "contents", {get() { return contents(actors); }}),
  scenes: [], journal: Object.assign([], {}),
  settings: {register: (m, k, cfg) => { registered.set(`${m}.${k}`, cfg); if ( !store.has(`${m}.${k}`) ) store.set(`${m}.${k}`, structuredClone(cfg.default)); },
    get: (m, k) => structuredClone(store.get(`${m}.${k}`)), set: async (m, k, v) => { store.set(`${m}.${k}`, structuredClone(v)); return v; }}
};
globalThis.fromUuidSync = id => null;
globalThis.fromUuid = async id => actors.get(String(id).replace(/^Actor\./, "")) ?? null;
globalThis.canvas = {scene: null, tokens: {placeables: [], controlled: []}};

// WoDX Chronicle: the queue and the generator
const queue = [], handlers = new Map();
const chronApi = {
  propose: async req => { if ( req.key && queue.some(q => q.key === req.key) ) return; queue.push({id: `q${queue.length}`, ...structuredClone(req)}); },
  registerApprovalHandler: (t, h) => handlers.set(t, h),
  gen: {random: key => G.stream("rothenstein", key)},
  eras: {activeEra: () => ({profile: {id: "dark-ages", name: "Dark Ages", rules: {morality: "roads"}}}), currentYear: () => 1200},
  isSkipping: () => false
};
const decide = async (q, verdict) => { queue.splice(queue.indexOf(q), 1); const h = handlers.get(q.type); if ( verdict === "approve" ) await h.approve(q); else await h.reject(q); };

// 7c: places and the state of NPCs
const places = [
  {id: "Scene.keep", name: "Kranzfels Keep", kind: "castle"}, {id: "Scene.tavern", name: "The Tavern", kind: "tavern"}, {id: "Scene.square", name: "Lower Town · Market Square", kind: "market"},
  {id: "Scene.church", name: "Church Close", kind: "church"}, {id: "Scene.lane", name: "Craftsmen's Lane", kind: "street"}, {id: "Scene.dolany", name: "Dolany", kind: "home"},
  {id: "Scene.adit", name: "Silver Adit", kind: "other"}, {id: "Scene.bailey", name: "Outer Bailey", kind: "gate"}
];
const down = new Set();
const routines = {listPlaces: () => places.map(p => ({...p, scene: {flags: {}}, region: null})), downState: a => (down.has(a.id) ? "dead" : null), whereOf: a => a.flags?.[MOD]?.where ?? null};

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const {build} = await import(join(root, "modules/wodx-npc/scripts/factions.mjs"));
const Fx = build({MOD, esc, gmIds: () => ["gm"], isActiveGM: () => true, chron: () => chronApi, routines});
Fx.registerSettings();
Fx.hooks();
Fx.registerHandler();

// Rothenstein's people, by the names in the world
const people = [["bogdan", "Voivode Bogdan Ursu", "Vampire"], ["konrad", "Konrad the Flesh-Smith", "Vampire"], ["kasimir", "Kasimir the Pale Miller", "Vampire"], ["marta", "\"Sister\" Marta", "Vampire"],
  ["radu", "Old Radu", "Vampire"], ["graff", "Richter Hannes Graff"], ["dvorak", "Jan Dvorak"], ["ludwig", "Ludwig of Regensburg"], ["ludovic", "Father Ludovic"], ["paval", "Brother Paval"],
  ["gizela", "Gizela the Midwife"], ["yaro", "Baba Yaroslava"], ["krejci", "Bohumil Krejci"], ["jitka", "Jitka the Herbwife"], ["lenka", "Lenka Prochazka"], ["jakub", "Jakub Hlavac"],
  ["ondrej", "Captain Ondrej \"Ironjaw\""], ["anselm", "Brother Anselm"]];
for ( const [id, name, type] of people ) actor(id, name, type, {system: {attributes: {manipulation: {value: 3}, wits: {value: 3}, charisma: {value: 3}, perception: {value: 3}}}});
actors.get("bogdan").items = [{type: "Feature", name: "Fame", system: {type: "wod.types.background", value: 1}}];
const pc = actor("ilse", "Ilse", "Vampire", {hasPlayerOwner: true});

const setMode = m => store.set(`${MOD}.factionMode`, m);
const fac = name => Fx.state().factions.find(f => f.name.startsWith(name));

test("settings: the state, the mode (Suggest by default) and the week between turns", () => {
  assert.equal(registered.get(`${MOD}.factionMode`).default, "suggest");
  assert.equal(registered.get(`${MOD}.turnDays`).default, 7);
  assert.deepEqual(Fx.state().factions, []);
});

test("Rothenstein's factions: ten powers, leaders and members found by name, places by name, standing both ways", async () => {
  const list = await Fx.setupRothenstein({confirm: false});
  assert.equal(list.length, 10);
  const court = fac("The Voivode");
  assert.equal(court.leader, "bogdan");
  assert.equal(court.ruler, true);
  assert.ok(court.places.includes("Scene.keep"));
  assert.equal(court.assets.herd, 4);
  assert.equal(fac("Konrad").leader, "konrad");
  assert.deepEqual(fac("Konrad").members, ["konrad", "kasimir"]);
  assert.equal(fac("Sister Marta").leader, "marta");
  assert.ok(fac("The German").places.includes("Scene.square"));
  assert.equal(fac("The Church's").kind, "hunters");
  assert.equal(court.standing[fac("The parish").id], -2);
  assert.equal(fac("The parish").standing[court.id], -1);
  // the goals that name a rival point at its id
  assert.equal(fac("Konrad").goals.find(g => g.move === "scheme").target, fac("The parish").id);
  // never twice
  assert.equal(await Fx.setupRothenstein({confirm: false}), null);
  assert.ok(Fx.state().lastTurn !== null);
});

test("hunting grounds: the court in its keep, a stranger trespassing, the area table of the Dark Ages", () => {
  const h = Fx.huntingFor(actors.get("bogdan"), "Scene.keep");
  // patrolled 8, less Domain 4 and Fame 1, to 3
  assert.equal(h.difficulty, 3);
  assert.equal(h.herdDice, 4);
  assert.equal(h.trespass, null);
  const x = Fx.huntingFor(pc, "Scene.keep");
  assert.equal(x.trespass.name, "The Voivode's court");
  assert.equal(x.difficulty, 9);
  assert.equal(Fx.huntingFor(pc, "Scene.tavern").difficulty, 5);
});

test("a hunt rolls hour by hour; a noticed trespass sours the holder's standing, through the queue", async () => {
  const mine = await (async () => { const f = Fx.state().factions.find(x => x.name.startsWith("Old Radu")); return f; })();
  rollQueue = [2, 3, 4, 2, 2, 3, 1, 4, 2, 3];
  const r = await Fx.hunt(actors.get("radu"), "Scene.keep", {method: "wits+streetwise", hours: 2});
  assert.equal(r.trespass.faction, fac("The Voivode").id);
  assert.equal(r.caught, false);
  assert.ok(chat.at(-1).content.includes("trespass"));
  const q = queue.find(x => x.key === `trespass:radu:${fac("The Voivode").id}`);
  assert.ok(q, "the trespass waits in the queue");
  await decide(q, "approve");
  assert.equal(fac("The Voivode").standing[mine.id], -1);
  rollQueue = [];
});

test("Suggest: a turn sends every result to the queue and changes nothing itself", async () => {
  setMode("suggest");
  queue.length = 0;
  const before = JSON.stringify(Fx.state().factions);
  const reps = await Fx.runTurns({reason: "test", forced: true});
  assert.equal(reps.length, 1);
  assert.equal(Fx.state().turns, 1);
  const withChanges = reps[0].lines.filter(l => l.status.startsWith("sent"));
  assert.equal(queue.filter(q => q.type === "wodx-npc.faction").length, withChanges.length);
  // nothing landed but the guard counters and the turn count
  const strip = s => JSON.parse(s).map(f => ({...f, guard: 0}));
  assert.deepEqual(strip(JSON.stringify(Fx.state().factions)), strip(before));
  assert.ok(chat.at(-1).content.includes("Faction turn 1"));
  // approving one applies its changes
  const q = queue.find(x => x.data.changes.some(c => c.op === "bg"));
  if ( q ) {
    const c = q.data.changes.find(x => x.op === "bg");
    const f0 = Fx.state().factions.find(f => f.id === c.faction);
    const was = c.key === "influence" ? (f0.assets.influence[c.sphere] ?? 0) : f0.assets[c.key];
    await decide(q, "approve");
    const f1 = Fx.state().factions.find(f => f.id === c.faction);
    assert.equal(c.key === "influence" ? (f1.assets.influence[c.sphere] ?? 0) : f1.assets[c.key], Math.max(0, Math.min(5, was + c.delta)));
  }
  queue.length = 0;
});

test("Auto: small results apply with an Undo card, big ones wait; Undo puts back exactly what changed", async () => {
  setMode("auto");
  const before = Fx.state();
  const reps = await Fx.runTurns({reason: "test auto", forced: true});
  const card = chat.at(-1);
  const inv = card.flags[MOD].factionTurn.inverse;
  const applied = reps[0].lines.filter(l => l.status === "applied");
  if ( applied.length ) {
    assert.ok(inv.length > 0);
    assert.ok(card.content.includes("wnpc-f-undo"));
    await Fx.undoCard(card);
    const after = Fx.state();
    const strip = s => s.factions.map(f => ({...f, guard: 0, places: [...f.places].sort()}));
    assert.deepEqual(strip(after), strip(before));
    assert.ok(card.content.includes("Undone"));
    assert.equal(card.flags[MOD].factionTurn.undone, true);
    // a second Undo does nothing
    assert.equal(await Fx.undoCard(card), null);
  }
  for ( const l of reps[0].lines.filter(x => x.status.includes("big")) ) assert.ok(queue.some(q => q.title.startsWith(l.faction)));
  queue.length = 0;
});

test("the clock: a two-week skip runs two turns; a year's skip runs twelve and counts the rest", async () => {
  setMode("auto");
  const s0 = Fx.state();
  game.time.worldTime = s0.lastTurn + 14 * 86400;
  await Fx.onClock("skip");
  assert.equal(Fx.state().turns, s0.turns + 2);
  assert.equal(Fx.state().lastTurn, s0.lastTurn + 14 * 86400);
  game.time.worldTime += 365 * 86400;
  await Fx.onClock("skip");
  assert.equal(Fx.state().turns, s0.turns + 2 + 12);
  assert.ok(chat.some(m => /more quiet weeks pass unplayed/.test(m.content)));
  // Off: nothing runs by itself
  setMode("off");
  const t = Fx.state().turns;
  game.time.worldTime += 30 * 86400;
  await Fx.onClock("skip");
  assert.equal(Fx.state().turns, t);
  setMode("auto");
  queue.length = 0;
});

test("a breach from WoDX Actions becomes a rumour, spreads by day in Auto, and rises to the Prince only through the queue", async () => {
  setMode("auto");
  // bring the clock level so no turn is due
  await Fx.mutate(s => { s.lastTurn = game.time.worldTime; return {state: s}; });
  queue.length = 0;
  const entry = {id: "masq1", by: "Konrad the Flesh-Smith", event: "seen feeding", witnesses: [{name: "a", state: "saw"}, {name: "b", state: "saw"}, {name: "c", state: "saw"}]};
  await Fx.onActionsBreach({entry, by: {uuid: "Actor.konrad"}});
  const b = Fx.state().breaches.at(-1);
  assert.equal(b.severity, 2);
  assert.equal(b.faction, fac("Konrad").id);
  assert.equal(b.masq, "masq1");
  assert.ok(chat.at(-1).content.includes("A rumour starts"));
  // three days later
  const t0 = game.time.worldTime;
  game.time.worldTime = t0 + 3 * 86400 + 60;
  await Fx.tickBreaches();
  const b1 = Fx.state().breaches.find(x => x.id === b.id);
  assert.ok(b1.heard.length >= 2);
  const rise = queue.find(q => q.key === `breach:${b.id}`);
  assert.ok(rise, "the rise waits in the queue");
  assert.ok(rise.data.changes.some(c => c.op === "stage" && c.stage === 1));
  assert.equal(b1.stage, 0);
  // the Storyteller lets it rise: the Prince thinks worse of the cult
  const cultStanding = fac("The Voivode").standing[fac("Konrad").id] ?? 0;
  await decide(rise, "approve");
  assert.equal(Fx.state().breaches.find(x => x.id === b.id).stage, 1);
  assert.equal(fac("The Voivode").standing[fac("Konrad").id] ?? 0, cultStanding - 1);
});

test("the hunters: a rise to them names the era's hunters; approving gives them the hunt, rejecting stops the rumour", async () => {
  setMode("auto");
  queue.length = 0;
  const b = Fx.state().breaches.at(-1);
  // the Church's hunters hear through their Contacts
  await Fx.mutate(s => { const h = s.factions.find(f => f.kind === "hunters"); h.assets.contacts = 5; return {state: s}; });
  let q = null;
  for ( let d = 0; d < 10 && !q; d++ ) { game.time.worldTime += 86400; await Fx.tickBreaches(); q = queue.find(x => x.data.changes.some(c => c.op === "stage" && c.stage === 2)); }
  assert.ok(q, "a rise to the hunters is queued");
  assert.ok(q.detail.includes("the Inquisition"));
  await decide(q, "approve");
  const hunters = fac("The Church's");
  assert.ok(hunters.goals.some(g => g.move === "hunt" && g.target === b.faction));
  assert.equal(Fx.state().breaches.find(x => x.id === b.id).stage, 2);
  // a second rumour, stopped at the Prince
  queue.length = 0;
  const id2 = await Fx.reportBreach({severity: 3, place: "Scene.tavern", faction: fac("Sister Marta").id, event: "a nun walked through fire"});
  let q2 = null;
  for ( let d = 0; d < 6 && !q2; d++ ) { game.time.worldTime += 86400; await Fx.tickBreaches(); q2 = queue.find(x => x.key === `breach:${id2}`); }
  assert.ok(q2);
  await decide(q2, "reject");
  assert.equal(Fx.state().breaches.find(x => x.id === id2).state, "stopped");
  game.time.worldTime += 5 * 86400;
  const heard = Fx.state().breaches.find(x => x.id === id2).heard.length;
  await Fx.tickBreaches();
  assert.equal(Fx.state().breaches.find(x => x.id === id2).heard.length, heard);
});

test("containment and fading: every witness dealt with before the talk begins contains it; a quiet week fades it", async () => {
  setMode("auto");
  queue.length = 0;
  game.journal.push({flags: {"wodx-actions": {kind: "masquerade", entries: [{id: "masq2", witnesses: [{name: "x", state: "forgot"}]}]}}});
  const id = await Fx.reportBreach({severity: 1, faction: fac("Old Radu").id, event: "a wolf that spoke", masq: "masq2"});
  await Fx.mutate(s => { s.breaches.find(b => b.id === id).masq = "masq2"; return {state: s}; });
  game.time.worldTime += 86400 + 5;
  await Fx.tickBreaches();
  assert.equal(Fx.state().breaches.find(b => b.id === id).state, "contained");
  // a rumour nobody feeds: after seven quiet days it loses a step, and at 0 it is over
  // (one the Prince has heard already, at severity 1, so it cannot rise to the hunters)
  const id3 = await Fx.reportBreach({severity: 1, place: "Scene.dolany", event: "lights in the woods"});
  await Fx.mutate(s => { s.breaches.find(b => b.id === id3).stage = 1; return {state: s}; });
  game.time.worldTime += 8 * 86400;
  await Fx.tickBreaches();
  assert.equal(Fx.state().breaches.find(b => b.id === id3).state, "over");
});

test("the card's 'Do not follow it' removes the rumour again", async () => {
  const id = await Fx.reportBreach({severity: 2, place: "Scene.square", event: "a body in the square"});
  const card = chat.at(-1);
  assert.ok(Fx.state().breaches.some(b => b.id === id));
  await Fx.undoCard(card, "breachStart");
  assert.ok(!Fx.state().breaches.some(b => b.id === id));
});

test("untended: a faction whose people are all dead loses a dot of each Background a decade, through the queue", async () => {
  setMode("suggest");
  queue.length = 0;
  down.add("ondrej");
  const s = Fx.state();
  game.time.worldTime = s.lastTurn + 21 * 365.25 * 86400;
  await Fx.onClock("skip");
  const q = queue.find(x => x.data.kind === "untended");
  assert.ok(q);
  assert.ok(q.title.startsWith("Ondrej's company"));
  assert.ok(q.data.changes.some(c => c.key === "retainers" && c.delta === -2));
  down.delete("ondrej");
  queue.length = 0;
});

test("a player character is never changed without the Storyteller: a loss for a faction with one among its members is big", async () => {
  setMode("auto");
  await Fx.mutate(s => { const f = s.factions.find(x => x.name.startsWith("Old Radu")); f.members.push("ilse"); return {state: s}; });
  const F = Fx.rules;
  const s = Fx.state();
  const radu = s.factions.find(x => x.name.startsWith("Old Radu"));
  assert.equal(F.sizeOf([{op: "bg", faction: radu.id, key: "contacts", delta: -1}], {pcActors: new Set(["ilse"]), state: s}), "big");
});

test("a world with no places tagged in 7c still has places: every scene but a battle map, its kind from its name, and a rumour spreads through them", async () => {
  const saved = places.splice(0);
  game.scenes.push({uuid: "Scene.k1", name: "Kranzfels · Inner Ward and Great Hall", flags: {}}, {uuid: "Scene.k2", name: "Kranzfels · The Outer Bailey", flags: {}},
    {uuid: "Scene.t1", name: "The Black Boar Tavern", flags: {}}, {uuid: "Scene.b1", name: "Ambush Battlemap", flags: {}});
  try {
    const list = Fx.placeList();
    assert.deepEqual(list.map(p => [p.id, p.kind]), [["Scene.k1", "castle"], ["Scene.k2", "gate"], ["Scene.t1", "tavern"]]);
    setMode("auto");
    const id = await Fx.reportBreach({severity: 2, event: "a corpse with no blood"});
    const start = Fx.state().breaches.find(b => b.id === id).lastStep;
    game.time.worldTime = start + 86400 + 60;
    await Fx.tickBreaches();
    const b = Fx.state().breaches.find(x => x.id === id);
    assert.deepEqual(b.heard, ["Scene.t1", "Scene.k2"], "the tavern hears first, then the gate");
    await Fx.mutate(s => { s.breaches = s.breaches.filter(x => x.id !== id); return {state: s}; });
  } finally {
    places.push(...saved);
    game.scenes.length = 0;
    queue.length = 0;
  }
});

test("map events: a theft at a faction's place is a wrong against it, Undo takes it back; a desecration offers a rumour on a button", async () => {
  setMode("suggest");
  const court = fac("The Voivode");
  const ev = {kind: "theft", scene: "keep", place: "Scene.keep", at: 5000, who: "Scene.keep.Token.ilse", whoName: "Ilse", objectName: "The treasury chest", message: "mT", undone: false};
  const r = await Fx.onMapEvent(ev);
  assert.equal(r.wrong.faction, court.id);
  assert.equal(r.card, null);
  assert.equal(Fx.state().wrongs.filter(w => w.id === "mT").length, 1);
  await Fx.onMapEvent(ev);
  assert.equal(Fx.state().wrongs.filter(w => w.id === "mT").length, 1, "the same card twice is one wrong");
  assert.deepEqual(await Fx.onMapEvent({...ev, undone: true}), {removed: "mT"});
  assert.equal(Fx.state().wrongs.some(w => w.id === "mT"), false);
  assert.equal((await Fx.onMapEvent({...ev, kind: "open", message: "mO"})).wrong, null, "opening a door is no wrong");
  const n = Fx.state().breaches.length;
  const d = await Fx.onMapEvent({...ev, kind: "desecrate", supernatural: true, place: "Scene.church", objectName: "The altar", message: "mD"});
  assert.ok(d.card.flags[MOD].mapBreach);
  assert.equal(Fx.state().breaches.length, n, "no rumour until the Storyteller says");
  assert.ok(!/—|\b(he|she|him|her|his)\b/i.test(d.card.content.replace(/<[^>]+>/g, " ")));
  await Fx.startMapBreach(d.card);
  assert.equal(Fx.state().breaches.length, n + 1);
  assert.match(d.card.content, /Rumour started/);
  assert.equal(await Fx.startMapBreach(d.card), null, "once");
});
