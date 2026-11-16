import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync, readdirSync, existsSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* WoDX Solo 0.1.0: the switch, the watcher's choices and the log, with no Foundry */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const R = await import(pathToFileURL(join(root, "modules/wodx-solo/scripts/solo-rules.mjs")));

function sources(mod) {
  const dir = join(root, "modules", mod, "scripts");
  return existsSync(dir) ? readdirSync(dir).filter(f => /\.m?js$/.test(f)).map(f => readFileSync(join(dir, f), "utf8")).join("\n") : "";
}

test("every setting on the preset list is registered by its module", () => {
  for ( const p of R.PRESET ) {
    const src = sources(p.mod);
    const key = p.key.startsWith("rule.") ? "rule." : p.key;
    const found = p.key.startsWith("rule.")
      ? /`rule\.\$\{/.test(src) && readFileSync(join(root, "modules", p.mod, "data/house-rules.mjs"), "utf8").includes(p.key.slice(5))
      : new RegExp(`(register\\(\\s*(MOD|MODULE_ID),\\s*|\\bs\\()"${key}"`).test(src);
    assert.ok(found, `${p.mod}.${p.key} is not registered`);
  }
});

test("the preset's values are choices those settings offer", () => {
  const has = (mod, re) => assert.match(sources(mod), re);
  has("wodx-npc", /MODES = \{suggest: [^}]*auto: /);
  has("wodx-npc", /factionMode[\s\S]{0,700}auto: "Auto/);
  has("wodx-combat", /LEVELS = \{[^}]*everyone: /);
  has("wodx-combat", /MODES = \{[\s\S]{0,300}auto: /);
  has("wodx-actions", /dawnDusk[\s\S]{0,600}auto: "New Night/);
  has("wodx-actions", /sunDamage[\s\S]{0,900}apply: "Roll and apply/);
});

test("the switch changes only what differs, and names what is missing", () => {
  const world = {"wodx-npc.mode": "suggest", "wodx-npc.routineMode": "auto", "wodx-combat.turnConductor": "off"};
  const read = (m, k) => world[`${m}.${k}`];
  const plan = R.planPreset(read);
  assert.deepEqual(plan.changes.map(c => `${c.mod}.${c.key}`), ["wodx-npc.mode", "wodx-combat.turnConductor"]);
  assert.equal(plan.changes[0].from, "suggest");
  assert.equal(plan.missing.length, R.PRESET.length - 3);
});

test("the way back leaves alone what was changed by hand since", () => {
  const changes = [{mod: "a", key: "x", from: "suggest", to: "auto"}, {mod: "a", key: "y", from: "off", to: "everyone"}, {mod: "a", key: "z", from: 3, to: 0}, {mod: "gone", key: "q", from: 1, to: 2}];
  const world = {"a.x": "auto", "a.y": "npc", "a.z": 3};
  const plan = R.planRestore(changes, (m, k) => world[`${m}.${k}`]);
  assert.deepEqual(plan.back, [{mod: "a", key: "x", to: "suggest"}]);
  assert.deepEqual(plan.kept, [{mod: "a", key: "y", now: "npc"}]);
});

test("standing approvals: every kind but a player's request, and none twice", () => {
  assert.deepEqual(R.autoPlan([{type: "era"}, {type: "request"}, {type: "wodx-people"}, "xp"], {era: true}), ["wodx-people", "xp"]);
});

test("the buttons on a card", () => {
  const b = R.buttonsOf(`<p><b>Plan</b></p><button data-action="go">Accept &amp; go</button><a data-action='undo'><i class="fa"></i> Undo</a><a href="x">a link</a><button disabled>Gone</button>`);
  assert.deepEqual(b.map(x => x.label), ["Accept & go", "Undo"]);
  assert.equal(b[1].action, "undo");
});

test("the seat's choice goes ahead and never back", () => {
  const pick = labels => R.pickButton(labels.map((label, n) => ({label, n})));
  assert.equal(pick(["Undo", "Accept", "Do this instead", "Behaviour"]).label, "Accept");
  assert.equal(pick(["Reject", "Approve"]).label, "Approve");
  assert.equal(pick(["Start the fight", "Not this time"]).label, "Start the fight");
  assert.equal(pick(["Let the journey's time pass"]).label, "Let the journey's time pass");
  assert.equal(pick(["Keep it"]).why, "the only choice");
  assert.equal(pick(["The left road", "The right road"]), null);
  assert.equal(pick(["Undo"]), null);
  assert.equal(pick(["Undo the harm", "Delete", "Cancel", "No"]), null);
  assert.equal(R.waits([{label: "Undo"}]), false);
  assert.equal(R.waits([{label: "Undo"}, {label: "Accept"}]), true);
});

test("only a whisper to Storytellers alone counts", () => {
  assert.equal(R.forStoryteller(["g1"], ["g1", "g2"]), true);
  assert.equal(R.forStoryteller(["g1", "p1"], ["g1"]), false);
  assert.equal(R.forStoryteller([], ["g1"]), false);
});

test("a card's name and where it came from", () => {
  assert.equal(R.titleOf({flavor: "<i>Dusk</i>", content: "x"}), "Dusk");
  assert.equal(R.titleOf({content: "<p><b>The guard's plan</b></p><p>more</p>"}), "The guard's plan");
  assert.equal(R.sourceOf({core: {}, "wodx-npc": {plan: 1}}), "wodx-npc");
  assert.equal(R.sourceOf({}), "unknown");
});

test("the log keeps its cap and the stall report counts by ending", () => {
  let log = R.blankLog();
  for ( let i = 0; i < 5; i++ ) log = R.addEntry(log, {at: 10 + i, kind: "card", source: "wodx-npc", title: "A plan", choice: "Accept", acted: true}, {cap: 4});
  assert.equal(log.entries.length, 4);
  log = R.addEntry(log, {at: 30, kind: "queue", source: "request", title: "May I?"});
  log = R.addEntry(log, {at: 31, kind: "scene", source: "wodx-solo", title: "The yard"});
  log = R.addEntry(log, {at: 32, kind: "strange", title: "x"});
  assert.equal(log.entries.at(-1).kind, "note");
  const rep = R.stallReport(log.entries, 12);
  assert.equal(rep.total, 4);
  assert.equal(rep.waiting, 1);
  assert.equal(rep.rows[0].count, 3);
  assert.equal(rep.rows[0].end, "answered by the seat");
});

test("it never acts in the Live world, and the name is the one chosen", () => {
  assert.ok(R.NEVER_WORLDS.includes("rothenstein-live"));
  assert.equal(R.NAME, "The Lone Chronicle");
  const main = readFileSync(join(root, "modules/wodx-solo/scripts/main.mjs"), "utf8");
  assert.match(main, /const blocked = \(\) => R\.NEVER_WORLDS\.includes\(game\.world\?\.id\)/);
  assert.match(main, /const isOn = \(\) => get\("on"\) === true && !blocked\(\)/);
});

/* The module itself on a small stand-in for Foundry: the switch on, a card answered, the switch off */
test("main.mjs: the switch sets and restores, the seat presses Accept, a player gets no log", async () => {
  const hooks = {}, once = {};
  const store = new Map(), registered = new Map();
  const reg = (m, k, def) => { registered.set(`${m}.${k}`, {default: def}); if ( !store.has(`${m}.${k}`) ) store.set(`${m}.${k}`, def); };
  let auto = {};
  const settings = {
    settings: registered,
    register: (m, k, d) => { registered.set(`${m}.${k}`, d); if ( !store.has(`${m}.${k}`) ) store.set(`${m}.${k}`, structuredClone(d.default)); },
    get: (m, k) => { if ( !registered.has(`${m}.${k}`) ) throw new Error("not registered"); return k === "autoApprove" ? auto : store.get(`${m}.${k}`); },
    set: async (m, k, v) => { if ( k === "autoApprove" ) auto = v; else store.set(`${m}.${k}`, structuredClone(v)); registered.get(`${m}.${k}`)?.onChange?.(v); return v; }
  };
  const mods = new Map(["wodx-solo", "wodx-chronicle", "wodx-npc", "wodx-combat"].map(id => [id, {active: true, id}]));
  mods.get("wodx-chronicle").api = {approvals: {types: () => [{type: "era"}, {type: "request"}, {type: "xp"}], setAuto: async (t, on) => { auto = {...auto, [t]: on}; }, pending: () => []}};
  const me = {id: "g1", isGM: true, active: true, name: "Seat"};
  const users = [me, {id: "p1", isGM: false, active: true, name: "Player", viewedScene: "s1"}];
  users.activeGM = me;
  const messages = new Map(), created = [];
  let clicked = 0, viewed = null;
  let pauses = 0;
  globalThis.game = {paused: true, togglePause: async p => { game.paused = p; pauses++; }, settings, modules: mods, user: me, users, world: {id: "rothenstein-wodx", flags: {wodx: true}}, time: {worldTime: 5}, messages, socket: {on: () => {}, emit: () => {}},
    scenes: new Map([["s1", {id: "s1", name: "The yard", view: async () => { viewed = "s1"; }}]])};
  globalThis.canvas = {scene: {id: "s0"}};
  globalThis.foundry = {utils: {deepClone: v => structuredClone(v)}, applications: {api: {ApplicationV2: class {}, DialogV2: class {}}, instances: new Map()}};
  globalThis.ui = {notifications: {warn: () => {}, info: () => {}}};
  globalThis.HTMLElement = class {};
  globalThis.ChatMessage = {create: async d => { created.push(d); return d; }};
  globalThis.Hooks = {once: (n, f) => { once[n] = f; }, on: (n, f) => { (hooks[n] ??= []).push(f); }};
  const button = {disabled: false, hasAttribute: () => false, innerHTML: "Accept", click: () => { clicked++; }};
  globalThis.document = {querySelectorAll: sel => (sel.includes("m1") ? [{querySelectorAll: () => [button]}] : [])};
  reg("wodx-npc", "mode", "suggest"); reg("wodx-npc", "routineMode", "suggest"); reg("wodx-combat", "turnConductor", "npc");
  reg("wodx-chronicle", "autoApprove", {}); auto = {era: true};

  await import(pathToFileURL(join(root, "modules/wodx-solo/scripts/main.mjs")));
  once.init(); once.ready();
  const api = mods.get("wodx-solo").api;
  assert.equal(api.isOn(), false);
  await settings.set("wodx-solo", "wait", 1);
  await settings.set("wodx-solo", "on", true);
  await new Promise(r => setTimeout(r, 50));
  assert.equal(store.get("wodx-npc.mode"), "auto");
  assert.equal(store.get("wodx-combat.turnConductor"), "everyone");
  assert.deepEqual(auto, {era: true, xp: true});
  assert.equal(store.get("wodx-solo.before").settings.length, 3);
  assert.equal(api.isSeat(), true);
  assert.equal(game.paused, false, "the seat starts a paused game when the mode begins");
  assert.equal(pauses, 1);
  assert.equal(created.length, 1);

  const msg = {id: "m1", whisper: ["g1"], flags: {"wodx-npc": {}}, content: `<p><b>The guard's plan</b></p><button data-action="a">Accept</button><a data-action="u">Undo</a>`};
  messages.set("m1", msg);
  hooks.createChatMessage[0](msg);
  hooks.createChatMessage[0]({id: "m2", whisper: ["g1", "p1"], flags: {}, content: `<button>Accept</button>`});
  await new Promise(r => setTimeout(r, 2300));
  assert.equal(clicked, 1);
  assert.equal(viewed, "s1", "the seat finds the player's scene by looking, with no hook");
  const rep = api.log.stalls(0);
  assert.equal(rep.total, 1);
  assert.equal(rep.rows[0].end, "answered by the seat");

  await settings.set("wodx-npc", "routineMode", "off");
  await settings.set("wodx-solo", "on", false);
  await new Promise(r => setTimeout(r, 50));
  assert.equal(store.get("wodx-npc.mode"), "suggest");
  assert.equal(store.get("wodx-npc.routineMode"), "off");
  assert.equal(store.get("wodx-combat.turnConductor"), "npc");
  assert.deepEqual(auto, {era: true});
  assert.deepEqual(store.get("wodx-solo.before"), {});

  game.user = users[1];
  assert.deepEqual(api.log.entries(), []);
  game.user = me;
  game.world.id = "rothenstein-live";
  await settings.set("wodx-solo", "on", true);
  await new Promise(r => setTimeout(r, 50));
  assert.equal(api.isOn(), false);
  assert.equal(store.get("wodx-npc.mode"), "suggest");
});

/* WoDX Solo 0.2.0: the player's panel (B2640 to B2644) */

test("the panel holds the steps' buttons and nothing of the Storyteller's", () => {
  assert.deepEqual(R.PANEL.map(b => b.id), ["oracle", "leads", "time", "travel", "places", "years", "pause", "stuck", "curtain", "carry"]);
  // B5980, B5982: the oracle's and the Leads page's actions live in world.mjs
  // B6040: places with no map live in card.mjs
  // B6533: sleep through the years lives in fate.mjs
  const src = ["panel.mjs", "world.mjs", "card.mjs", "fate.mjs"].map(f => readFileSync(join(root, "modules/wodx-solo/scripts", f), "utf8")).join("\n");
  for ( const b of R.PANEL ) assert.ok(new RegExp(`\\b${b.id}\\(\\)`).test(src), `no action for ${b.id}`);
});

test("waits: their lengths, the cap, and dusk and dawn from the sun", () => {
  assert.equal(R.secondsFor("ten"), 600);
  assert.equal(R.secondsFor("hour"), 3600);
  assert.equal(R.secondsFor("dusk", {toDusk: 5000, toDawn: 40000}), 5000);
  assert.equal(R.secondsFor("dawn", {toDusk: 5000, toDawn: 40000}), 40000);
  assert.equal(R.secondsFor("day", {toDusk: 30000}), 30000);
  assert.equal(R.secondsFor("day", {toDusk: 1e7}), R.MAX_WAIT);
  assert.equal(R.secondsFor("nap"), 0);
  assert.equal(R.secondsFor("dusk", {toDusk: NaN}), 0);
});

test("a wait goes in steps of ten minutes at most", () => {
  assert.deepEqual(R.chunks(1500), [600, 600, 300]);
  assert.deepEqual(R.chunks(0), []);
  assert.equal(R.chunks(R.MAX_WAIT).reduce((a, b) => a + b, 0), R.MAX_WAIT);
  assert.ok(R.chunks(7777).every(n => n <= R.STEP));
});

test("what stops a wait, and a sleeper notices less", () => {
  assert.equal(R.stopFor("hour", {}), null);
  assert.equal(R.stopFor("hour", {word: true}), "word");
  assert.equal(R.stopFor("hour", {newcomer: true, fight: true}), "fight");
  assert.equal(R.stopFor("day", {word: true, newcomer: true}), null);
  assert.equal(R.stopFor("day", {paused: true}), "paused");
  for ( const w of Object.values(R.WAITS) ) for ( const k of w.stops ) assert.ok(R.STOP_WORDS[k], k);
});

test("time in plain words", () => {
  assert.equal(R.span(600), "10 minutes");
  assert.equal(R.span(3600), "1 hour");
  assert.equal(R.span(4860), "1 hour 21 minutes");
  assert.equal(R.span(10), "no time");
});

test("the way in: the starting view, else the middle, snapped to the grid", () => {
  assert.deepEqual(R.wayIn({initial: {x: 1030, y: 640}, width: 3000, height: 2000, grid: {size: 100}}), {x: 1000, y: 600});
  assert.deepEqual(R.wayIn({width: 2000, height: 1000, padding: 0.25, grid: {size: 100}}), {x: 1500, y: 800});
  assert.deepEqual(R.wayIn({initial: {x: null, y: null}, width: 1000, height: 1000, padding: 0, grid: {size: 50}}, 2), {x: 450, y: 450});
});

test("tonight began at the last dusk", () => {
  assert.equal(R.nightStart(100000, 80000), 93600);
  assert.equal(R.nightStart(100000, 0), 100000);
  assert.equal(R.nightStart(1000, 86000), 600);
});

test("the curtain shows tonight only, in plain words", () => {
  const entries = [
    {wt: 10, kind: "card", title: "Old", choice: "Approve", acted: true},
    {wt: 200, kind: "card", title: "A fight", choice: "Approve", acted: true, note: "goes ahead"},
    {wt: 300, kind: "window", title: "Roll", choice: "OK", acted: false, note: "the seat only watches"},
    {wt: 400, kind: "queue", title: "A trade", note: "waits in the approval queue"}
  ];
  const rows = R.curtainRows(entries, 100);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].what, "the seat chose Approve");
  assert.equal(rows[0].note, "goes ahead");
  assert.equal(rows[1].what, "the seat would choose OK");
  assert.equal(rows[2].what, "waits in the approval queue");
  assert.equal(rows[2].kind, "The approval queue");
});

test("nights seen: no doubles, the last sixty kept", () => {
  assert.deepEqual(R.markSeen([1, 2], 2), [1, 2]);
  assert.deepEqual(R.markSeen(null, 5), [5]);
  const many = Array.from({length: 70}, (_, i) => i);
  assert.equal(R.markSeen(many, 999).length, 60);
});

test("the switch ends fights by themselves, and the module talks over its socket", () => {
  assert.ok(R.PRESET.some(p => p.mod === "wodx-combat" && p.key === "fightEnd" && p.to === "auto"));
  const mod = JSON.parse(readFileSync(join(root, "modules/wodx-solo/module.json"), "utf8"));
  assert.equal(mod.socket, true);
  for ( const f of [...mod.esmodules, ...(mod.styles ?? [])] ) assert.ok(existsSync(join(root, "modules/wodx-solo", f)), f);
  const src = readFileSync(join(root, "modules/wodx-solo/scripts/panel.mjs"), "utf8");
  // Every ask is done on the seat only
  for ( const fn of ["passTime", "togglePause", "unstick", "curtain"] )
    assert.match(src, new RegExp(`export async function ${fn}\\([^)]*\\) \\{\\n  if \\( !H\\.isSeat\\(\\)`), fn);
});

test("panel.mjs: a wait moves the clock in steps and stops when word comes; the seat frees a token", async () => {
  const hooks = {};
  let hid = 0;
  globalThis.Hooks = {on: (n, f) => { (hooks[n] ??= new Map()).set(++hid, f); return hid; }, off: (n, id) => hooks[n]?.delete(id), once: () => {}};
  const said = [], logged = [];
  globalThis.ChatMessage = {create: async d => { said.push(d); return d; }};
  const token = {actorId: "a1", width: 1, update: async function (d) { Object.assign(this, d); }};
  const scene = {id: "s1", name: "The yard", active: true, tokens: [token], initial: {x: 550, y: 550}, width: 1000, height: 1000, padding: 0, grid: {size: 100}};
  const actor = {id: "a1", name: "Mila", hasPlayerOwner: true, type: "Mortal"};
  const player = {id: "p1", isGM: false, active: true, name: "Player", viewedScene: "s1", character: actor};
  const seat = {id: "g1", isGM: true, active: true};
  const users = [seat, player];
  users.get = id => users.find(u => u.id === id);
  users.activeGM = seat;
  let steps = 0;
  globalThis.game = {paused: false, users, user: seat, actors: [actor], scenes: [scene], combats: [], modules: new Map(), settings: {get: () => [], set: async () => {}},
    socket: {on: () => {}, emit: () => {}},
    time: {worldTime: 0, advance: async s => {
      game.time.worldTime += s; steps++;
      // word for the player arrives in the third step
      if ( steps === 3 ) for ( const f of hooks.createChatMessage.values() ) f({whisper: ["p1"], flags: {}});
    }}};
  globalThis.foundry = {utils: {deepClone: v => structuredClone(v)}, applications: {api: {ApplicationV2: class {}, DialogV2: class {}}, instances: new Map()}};
  globalThis.ui = {notifications: {warn: () => {}, info: () => {}}};
  const P = await import(pathToFileURL(join(root, "modules/wodx-solo/scripts/panel.mjs")));
  P.installPanel({isOn: () => true, isSeat: () => true, log: async e => { logged.push(e); }, entries: () => [], get: () => []});
  const r = await P.passTime("p1", "hour");
  assert.equal(steps, 3);
  assert.equal(r.passed, 1800);
  assert.equal(r.why, "word");
  assert.match(said.at(-1).content, /stopped after 30 minutes, because word came for you/);
  assert.equal(hooks.createChatMessage.size, 0, "the wait leaves no hooks behind");
  // A fight on the scene: no wait at all
  game.combats = [{started: true, scene: {id: "s1"}}];
  assert.equal(await P.passTime("p1", "ten"), null);
  assert.match(said.at(-1).content, /Not while a fight is running/);
  // Free my token
  const to = await P.unstick("p1", "token");
  assert.deepEqual(to, {x: 500, y: 500});
  assert.equal(token.x, 500);
  assert.ok(logged.some(e => /token was freed/.test(e.title)));
});

test("panel.mjs 0.2.1: with no assigned character, the one on the viewed scene is used, never another's", async () => {
  globalThis.Hooks = {on: () => 0, off: () => {}, once: () => {}};
  const said = [];
  globalThis.ChatMessage = {create: async d => { said.push(d); return d; }};
  const owner = ids => function (u) { return ids.includes(u.id); };
  const monk = {id: "monk", name: "Brother", hasPlayerOwner: true, type: "Mortal", testUserPermission: owner(["p1", "p2"])};
  const mine = {id: "mine", name: "Gate character", hasPlayerOwner: true, type: "Mortal", testUserPermission: owner(["p1"])};
  const tokA = {actorId: "monk", width: 1, update: async function (d) { Object.assign(this, d); }, x: 7, y: 7};
  const tokB = {actorId: "mine", width: 1, update: async function (d) { Object.assign(this, d); }, x: 0, y: 0};
  const village = {id: "v", name: "Village", active: false, tokens: [tokA], width: 1000, height: 1000, padding: 0, grid: {size: 100}};
  const gate = {id: "g", name: "Gate", active: false, tokens: [tokB], width: 800, height: 800, padding: 0, grid: {size: 100}};
  const p1 = {id: "p1", isGM: false, viewedScene: "g", character: null};
  const users = [{id: "gm", isGM: true}, p1, {id: "p2", isGM: false}];
  users.get = id => users.find(u => u.id === id);
  globalThis.game = {paused: false, user: users[0], users, actors: [monk, mine], scenes: [village, gate], combats: [{started: true, scene: {id: "v"}}],
    modules: new Map(), settings: {get: () => [], set: async () => {}}, socket: {on: () => {}, emit: () => {}}, time: {worldTime: 0, advance: async () => {}}};
  const P = await import(pathToFileURL(join(root, "modules/wodx-solo/scripts/panel.mjs")));
  P.installPanel({isOn: () => true, isSeat: () => true, log: async () => {}, entries: () => [], get: () => []});
  const to = await P.unstick("p1", "token");
  assert.deepEqual(to, {x: 400, y: 400});
  assert.equal(tokB.x, 400);
  assert.equal(tokA.x, 7, "the shared character on another scene is left alone");
  // Not viewing a scene with their own token: the one they own alone, not the shared one
  p1.viewedScene = "nowhere";
  await P.unstick("p1", "token");
  assert.equal(tokA.x, 7);
});

/* Storyteller tools for the lone player (B4800 to B4805) */

test("the tools go on only in solo mode, for a player, with nobody else playing", () => {
  const base = {soloOn: true, blocked: false, userId: "p1", isGM: false, activePlayers: ["p1"]};
  assert.equal(R.mayTurnOn(base).ok, true);
  assert.equal(R.mayTurnOn({...base, soloOn: false}).ok, false);
  assert.equal(R.mayTurnOn({...base, blocked: true}).ok, false);
  assert.equal(R.mayTurnOn({...base, isGM: true}).ok, false);
  assert.equal(R.mayTurnOn({...base, activePlayers: ["p1", "p2"]}).ok, false);
  assert.equal(R.mayTurnOn({...base, userId: null}).ok, false);
});

test("only the player who switched them on may use them, and only while nobody else plays", () => {
  const w = {soloOn: true, blocked: false, activePlayers: ["p1"]};
  const st = {on: true, userId: "p1", at: 1};
  assert.equal(R.mayUse(st, "p1", w), true);
  assert.equal(R.mayUse(st, "p2", {...w, activePlayers: ["p2"]}), false);
  assert.equal(R.mayUse(st, "p1", {...w, activePlayers: ["p1", "p2"]}), false);
  assert.equal(R.mayUse(st, "p1", {...w, soloOn: false}), false);
  assert.equal(R.mayUse(st, "p1", {...w, blocked: true}), false);
  assert.equal(R.mayUse({on: false, userId: "p1"}, "p1", w), false);
  assert.equal(R.mayUse(undefined, "p1", w), false);
  assert.deepEqual(R.normSt(null), R.ST_OFF());
});

test("the item search puts names that start with the words first and keeps one row per item", () => {
  const idx = [{uuid: "a", name: "Knife", type: "melee", from: "World"}, {uuid: "b", name: "Butcher's Knife", type: "melee", from: "Gear"},
    {uuid: "c", name: "Knife", type: "melee", from: "Gear"}, {uuid: "a", name: "Knife", type: "melee", from: "World"}, {uuid: "d", name: "Rope"}, {name: "no uuid"}];
  const rows = R.itemMatches(idx, "kni");
  assert.deepEqual(rows.map(r => r.uuid), ["c", "a", "b"]);
  assert.deepEqual(R.itemMatches(idx, "k"), []);
  assert.equal(R.itemMatches(Array.from({length: 99}, (_, i) => ({uuid: `u${i}`, name: `Knife ${i}`})), "knife", 40).length, 40);
});

test("a given item loses its id, folder and ownership and says who asked for it", () => {
  const src = {_id: "x", name: "Knife", type: "melee", folder: "f", sort: 5, ownership: {default: 0}, _stats: {}, system: {damage: 2}, flags: {other: {a: 1}}};
  const d = R.grantData(src, {by: "Ben", at: 100});
  assert.equal(d._id, undefined); assert.equal(d.folder, undefined); assert.equal(d.ownership, undefined); assert.equal(d.sort, undefined);
  assert.deepEqual(d.system, {damage: 2});
  assert.deepEqual(d.flags.other, {a: 1});
  assert.deepEqual(d.flags["wodx-solo"].granted, {by: "Ben", at: 100});
  assert.equal(src._id, "x", "the source is left alone");
});

test("the systems check marks what to look at", () => {
  const fine = R.checkRows({modules: [{id: "wodx-npc", title: "WoDX NPC", version: "1"}], off: ["WoDX Voices"], broken: [], drift: [], missing: [],
    pending: 0, held: 0, waiting: 0, errors: [], paused: false, sameScene: true, fights: 0});
  assert.ok(fine.every(r => r.state === "ok"), JSON.stringify(fine));
  assert.match(fine[0].text, /switched off: WoDX Voices/);
  const bad = R.checkRows({modules: [], broken: [{id: "wodx-solo", title: "WoDX Solo", needs: ["wodx-chronicle"]}], drift: [{what: "NPCs in combat act"}],
    pending: 2, held: 1, waiting: 3, errors: [{text: "boom"}], paused: true, sameScene: false});
  const warn = bad.filter(r => r.state === "warn").map(r => r.area);
  for ( const a of ["WoDX parts", "The switch", "Approval queue", "Tonight", "Errors on the seat", "The seat's map", "The game"] ) assert.ok(warn.includes(a), a);
  assert.match(bad.find(r => r.area === "Errors on the seat").text, /boom/);
});

test("hidden tokens show by square and stance; the card list keeps the newest, one per card", () => {
  assert.deepEqual(R.hiddenRow({name: "Watcher", kind: "Vampire", disposition: -1, x: 250, y: 0}, 100), {name: "Watcher", kind: "Vampire", disposition: "hostile", square: "3, 1"});
  let l = [];
  for ( let i = 0; i < 70; i++ ) l = R.addEyes(l, {id: `m${i}`});
  assert.equal(l.length, R.EYES_CAP);
  assert.equal(l.at(-1).id, "m69");
  l = R.addEyes(l, {id: "m30", v: 2});
  assert.equal(l.filter(c => c.id === "m30").length, 1);
  assert.equal(l.at(-1).v, 2);
});

test("the tools are asks to the seat: the player's side never makes items or presses cards itself", () => {
  const src = readFileSync(join(root, "modules/wodx-solo/scripts/st-tools.mjs"), "utf8");
  for ( const fn of ["toggle", "eyes", "press", "items", "give", "xp", "check", "hidden"] ) {
    const body = src.split(`async function ${fn}(`)[1]?.split("\n}\n")[0] ?? "";
    assert.ok(body, fn);
    if ( fn !== "toggle" ) assert.match(body, /if \( !usable\(userId\) \)/, `${fn} checks the player may use the tools`);
  }
  assert.match(src, /senderId|addAsks/);
  const panel = readFileSync(join(root, "modules/wodx-solo/scripts/panel.mjs"), "utf8");
  assert.match(panel, /senderId !== payload\.userId/, "an ask naming another user than its sender is dropped");
  assert.match(src, /userConnected[\s\S]{0,120}guard\(/, "a second player logging in takes the tools away");
});

test("experience from the tools is a whole number from 1 to the cap, with a plain reason when none is given", () => {
  assert.equal(R.xpAmount(5), 5);
  assert.equal(R.xpAmount("7"), 7);
  for ( const bad of [0, -1, 2.5, R.XP_MAX + 1, "x", null, undefined, NaN] ) assert.equal(R.xpAmount(bad), null, String(bad));
  assert.equal(R.xpAmount(R.XP_MAX), R.XP_MAX);
  assert.equal(R.xpNote("  "), "Given with the Storyteller tools");
  assert.equal(R.xpNote("Testing Thaumaturgy"), "Testing Thaumaturgy");
  assert.equal(R.xpNote("x".repeat(300)).length, 100);
  assert.ok(R.ST_TOOLS.some(t => t.id === "xp"));
  const src = readFileSync(join(root, "modules/wodx-solo/scripts/st-tools.mjs"), "utf8");
  assert.match(src, /wodx-creation"\)\?\.api\?\.award/, "the award goes through WoDX Creation, so the sheet and its log stay right");
});

/* Arrival: a scene to land on, a character and its token (B5140 to B5145) */

test("arrival: the landing is the flagged scene, then the chosen, then a Rothenstein map, market first", () => {
  const s = (id, name, x = {}) => ({id, name, img: "map.webp", active: false, landing: false, ...x});
  const world = [s("a", "A Moravian Village"), s("b", "Rothenstein: Lower Town"), s("c", "Market Square"), s("d", "The yard", {active: true})];
  assert.equal(R.pickLanding(world), "c");
  assert.equal(R.pickLanding(world, "a"), "a");
  assert.equal(R.pickLanding([...world, s("e", "Cellar", {landing: true})], "a"), "e");
  assert.equal(R.pickLanding(world, "gone"), "c", "a chosen scene that is gone is passed over");
  assert.equal(R.pickLanding([s("d", "The yard", {active: true}), s("f", "Field")]), "d", "no Rothenstein map: the active one");
  assert.equal(R.pickLanding([s("g", "Blank", {img: ""})]), null, "no map anywhere: none, so the plain night scene is made");
  assert.equal(R.pickLanding([]), null);
});

test("arrival: the plain night scene is dark, gridded and seen through the token's eyes", () => {
  const b = R.LANDING_BLANK;
  assert.ok(b.environment.darknessLevel >= 0.5, "night");
  assert.equal(b.tokenVision, true);
  assert.equal(b.grid.size, 100);
  const at = R.wayIn(b, 1);
  assert.ok(at.x >= 0 && at.y >= 0 && at.x % 100 === 0 && at.y % 100 === 0);
});

test("arrival: the steps, the lines and a typed name", () => {
  assert.equal(R.arrivalStep({}), "make");
  assert.equal(R.arrivalStep({character: true}), "place");
  assert.equal(R.arrivalStep({character: true, token: true}), "pull");
  assert.equal(R.arrivalStep({character: true, token: true, viewing: true}), "ready");
  assert.deepEqual(R.ARRIVAL_LINES.map(l => l.type), ["Vampire", "Werewolf", "Mage", "Changeling", "Wraith", "Hunter", "Mortal"]);
  const types = JSON.parse(readFileSync(join(root, "system/worldofdarkness/template.json"), "utf8")).Actor?.types
    ?? JSON.parse(readFileSync(join(root, "system/worldofdarkness/system.json"), "utf8")).documentTypes?.Actor;
  const known = Array.isArray(types) ? types : Object.keys(types ?? {});
  if ( known.length ) for ( const l of R.ARRIVAL_LINES ) assert.ok(known.includes(l.type), `${l.type} is an actor type`);
  assert.equal(R.arrivalName("  Ilse   of  Dolany "), "Ilse of Dolany");
  assert.equal(R.arrivalName("<b>x</b>"), "bx/b");
  assert.equal(R.arrivalName(""), R.DEFAULT_NAME);
  assert.equal(R.arrivalName("x".repeat(90)).length, R.NAME_MAX);
  const d = R.newCharacterData({name: "Ilse", line: "werewolf", userId: "p1", at: 7});
  assert.equal(d.type, "Werewolf");
  assert.equal(d.ownership.p1, 3);
  assert.equal(d.ownership.default, 0);
  assert.equal(d.prototypeToken.actorLink, true);
  assert.equal(d.prototypeToken.sight.enabled, true);
  assert.equal(R.newCharacterData({line: "nonsense", userId: "p1"}).type, "Mortal");
});

test("arrival.mjs: the seat makes the character, assigns it, places its token and brings the player there", async () => {
  const src = readFileSync(join(root, "modules/wodx-solo/scripts/arrival.mjs"), "utf8");
  for ( const k of ["\"ask.arrive\"", "\"ask.arrive.make\"", "\"arrive.pick\"", "\"arrive.ready\"", "pullToScene", "wodxSoloArrived", "api?.wizard"] ) assert.ok(src.includes(k), `arrival.mjs has ${k}`);
  const guide = readFileSync(join(root, "modules/wodx-chronicle/scripts/player-guide.mjs"), "utf8");
  assert.ok(/soloWaits\(\)\s*\)\s*\{\s*Hooks\.once\("wodxSoloArrived"/.test(guide), "the first-night tour waits for the token in solo play");
  assert.ok(guide.indexOf("soloWaits()") < guide.indexOf("put({offered: true})"), "the tour is not marked offered before the token is there");
  const panel = readFileSync(join(root, "modules/wodx-solo/scripts/panel.mjs"), "utf8");
  assert.ok(panel.includes("ARRIVE_UI.html?.()") && panel.includes("arrive: () => ARRIVE_UI.open?.()"), "the panel offers Make my character");
});

test("arrival: Foundry's welcome scene is never the landing and always gives way; a default owner is nobody's (B5146, B5147)", () => {
  const core = {id: "NUEDEFAULTSCENE0", name: "Foundry Virtual Tabletop", img: "nue/defaultscene/fvtt-background.webp", active: true};
  const ferry = {id: "f", name: "Toll-post and Ivo's Ferry", img: "ferry.webp"};
  assert.equal(R.isCoreScene(core), true);
  assert.equal(R.pickLanding([core]), null);
  assert.equal(R.pickLanding([core, ferry], "f"), "f");
  assert.equal(R.mayReplaceActive(core), true);
  assert.equal(R.mayReplaceActive(null), true);
  assert.equal(R.mayReplaceActive({id: "x", img: ""}), true);
  assert.equal(R.mayReplaceActive(ferry), false, "a map made active by the Storyteller stays");
  assert.equal(R.ownsByName({default: 3}, "p1"), false);
  assert.equal(R.ownsByName({default: 0, p1: 3}, "p1"), true);
  assert.equal(R.ownsByName({p1: 2}, "p1"), false);
});
