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

test("the panel holds step 2's buttons and nothing of the Storyteller's", () => {
  assert.deepEqual(R.PANEL.map(b => b.id), ["time", "travel", "pause", "stuck", "curtain"]);
  const src = readFileSync(join(root, "modules/wodx-solo/scripts/panel.mjs"), "utf8");
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
