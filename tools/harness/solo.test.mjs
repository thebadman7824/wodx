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
  globalThis.game = {settings, modules: mods, user: me, users, world: {id: "rothenstein-wodx", flags: {wodx: true}}, time: {worldTime: 5}, messages,
    scenes: new Map([["s1", {id: "s1", name: "The yard", view: async () => { viewed = "s1"; }}]])};
  globalThis.canvas = {scene: {id: "s0"}};
  globalThis.foundry = {utils: {deepClone: v => structuredClone(v)}};
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
  assert.equal(created.length, 1);

  const msg = {id: "m1", whisper: ["g1"], flags: {"wodx-npc": {}}, content: `<p><b>The guard's plan</b></p><button data-action="a">Accept</button><a data-action="u">Undo</a>`};
  messages.set("m1", msg);
  hooks.createChatMessage[0](msg);
  hooks.createChatMessage[0]({id: "m2", whisper: ["g1", "p1"], flags: {}, content: `<button>Accept</button>`});
  await hooks.updateUser[0](users[1], {viewedScene: "s1"});
  await new Promise(r => setTimeout(r, 1200));
  assert.equal(clicked, 1);
  assert.equal(viewed, "s1");
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
