import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
import {JSDOM} from "jsdom";

/* WoDX Targeting 0.1.0: the power tags, the ranking, and the window panel on a small stand-in for Foundry */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const T = await import(pathToFileURL(join(root, "modules/wodx-targeting/scripts/target-rules.mjs")));
const {allPowers} = await import(pathToFileURL(join(root, "tools/targeting/powers.mjs")));
const TABLE = JSON.parse(readFileSync(join(root, "modules/wodx-targeting/data/tags.json"), "utf8"));
const powers = await allPowers();

/* ---- the tags ---- */

test("every library power has a valid tag, and the table names no power that is gone", () => {
  const missing = powers.filter(p => !T.validTag(TABLE[p.lib]?.[p.id])).map(p => `${p.lib}:${p.id}`);
  assert.deepEqual(missing, []);
  const ids = new Set(powers.map(p => `${p.lib}:${p.id}`));
  const stale = Object.entries(TABLE).flatMap(([lib, m]) => Object.keys(m).map(id => `${lib}:${id}`)).filter(k => !ids.has(k));
  assert.deepEqual(stale, []);
  assert.ok(powers.length >= 931, `${powers.length} powers`);
});

test("reviewed tags: spot checks against the summaries", () => {
  const tag = (lib, id) => TABLE[lib][id];
  assert.equal(tag("disc", "dominate-command"), "h.s");
  assert.equal(tag("disc", "valeren-healer-healers-touch"), "x.t");
  assert.equal(tag("disc", "celerity-1"), "s.t");
  assert.equal(tag("disc", "presence-awe"), "a.v");
  assert.equal(tag("disc", "dominate-the-forgetful-mind"), "e.s", "a witness is neutral: either, not hostile");
  assert.equal(tag("gift", "mothers-touch"), "x.t");
  assert.equal(tag("gift", "clap-of-thunder"), "a.r");
  assert.equal(tag("w20", "outrage-deaths-touch"), "h.t");
  assert.equal(tag("gw", "gw-usury-charity"), "x.t");
  assert.equal(tag("edge", "respire"), "x.t");
  assert.equal(tag("evo", "flame:2"), "h.s");
  // the counts by intent stay plausible: most powers are on the user, and every intent is used
  const by = {};
  for ( const m of Object.values(TABLE) ) for ( const c of Object.values(m) ) by[c[0]] = (by[c[0]] ?? 0) + 1;
  for ( const k of Object.keys(T.INTENTS) ) assert.ok(by[k] > 0, `intent ${k} used`);
});

test("seedTag reads the power's own data", () => {
  assert.equal(T.tagCode(T.seedTag({passive: true, text: "Always on."})), "s.t");
  assert.equal(T.seedTag({text: "Bends a subject's emotions.", diff: "t:willpower"}).intent, "hostile");
  assert.equal(T.seedTag({text: "Heals a touched creature."}).intent, "heal");
  assert.equal(T.seedTag({text: "Projects an impression to everyone around."}).intent, "area");
  assert.equal(T.seedTag({text: "Speaks mind to mind with someone known, at any distance."}).range, "unlimited");
  assert.equal(T.tagFor(TABLE, "disc", "no-such-power", {text: "Senses the weather."}).by, "seed");
  assert.equal(T.tagFor(TABLE, "disc", "dominate-command").by, "table");
  assert.equal(T.parseTag("q.z"), null);
});

test("casting windows: the default aim from what the casting uses", () => {
  assert.equal(T.castIntent({spheres: {life: 3}}), "x");
  assert.equal(T.castIntent({spheres: {forces: 2, prime: 2}}), "h");
  assert.equal(T.castIntent({spheres: {mind: 2}}), "e");
  assert.equal(T.castIntent({arts: ["pyretics"]}), "h");
  assert.equal(T.castIntent({arts: ["dragonsire"]}), "h");
  assert.equal(T.castIntent({arts: ["wayfare"], realms: ["nature"]}), "s");
  assert.equal(T.castIntent({arts: ["wayfare"], realms: ["actor"]}), "e");
  assert.equal(T.castIntent({}), "e");
});

/* ---- sides, modes and the ranking ---- */

test("sides follow WoDX NPC's rule: a neutral token is a foe only after harm", () => {
  assert.equal(T.sideOf(1, -1), "foe");
  assert.equal(T.sideOf(1, 1), "friend");
  assert.equal(T.sideOf(1, 0), "neutral");
  assert.equal(T.sideOf(1, 0, true), "foe");
  assert.equal(T.sideOf(0, -1), "neutral");
  assert.equal(T.sideOf(1, -2), "neutral");
});

test("Automatic is for the Storyteller only; players keep Suggest", () => {
  assert.equal(T.modeFor("auto", {isGM: true}), "auto");
  assert.equal(T.modeFor("auto", {isGM: false}), "suggest");
  assert.equal(T.modeFor("off"), "off");
  assert.equal(T.modeFor("nonsense"), "suggest");
});

const scene = () => ({
  self: {id: "me", name: "Anezka", wounds: 2},
  lastTargetId: null,
  tokens: [
    {id: "g1", name: "Ghoul A", side: "foe", disposition: -1, visible: true, distance: 12, reach: false, los: true, wounds: 0, lastHitMe: null},
    {id: "g2", name: "Ghoul B", side: "foe", disposition: -1, visible: true, distance: 4, reach: false, los: true, wounds: 1, lastHitMe: null},
    {id: "g3", name: "Ghoul C", side: "foe", disposition: -1, visible: true, distance: 1, reach: true, los: true, wounds: 0, lastHitMe: null},
    {id: "far", name: "Archer", side: "foe", disposition: -1, visible: true, distance: 60, reach: false, los: true, wounds: 0, lastHitMe: null},
    {id: "hid", name: "Unseen", side: "foe", disposition: -1, visible: false, distance: 2, reach: true, los: true, wounds: 0, lastHitMe: 9},
    {id: "wall", name: "Behind a wall", side: "foe", disposition: -1, visible: true, distance: 3, reach: false, los: false, wounds: 0, lastHitMe: null},
    {id: "a1", name: "Bogdan", side: "friend", disposition: 1, visible: true, distance: 6, reach: false, los: true, wounds: 4, lastHitMe: null},
    {id: "a2", name: "Mira", side: "friend", disposition: 1, visible: true, distance: 2, reach: true, los: true, wounds: 0, lastHitMe: null},
    {id: "n1", name: "Villager", side: "neutral", disposition: 0, visible: true, distance: 3, reach: false, los: true, wounds: 0, lastHitMe: null}
  ]
});

test("hostile: engaged before nearest, the last attacker first; hidden and out-of-range tokens never", () => {
  const s = scene();
  let r = T.rank("h.s", s);
  assert.equal(r.pick.id, "g3", "engaged in melee");
  assert.deepEqual(r.others.map(o => o.id), ["g2", "g1", "far"]);
  assert.ok(!r.others.some(o => o.id === "hid" || o.id === "wall"));
  s.tokens.find(t => t.id === "g1").lastHitMe = 5;
  s.tokens.find(t => t.id === "far").lastHitMe = 2;
  r = T.rank("h.s", s);
  assert.equal(r.pick.id, "g1");
  assert.match(r.pick.why, /attacked Anezka last/);
  assert.equal(r.others[0].id, "far");
  // voice: 30 yards, so the archer at 60 drops out
  r = T.rank("h.v", s);
  assert.ok(![r.pick, ...r.others].some(o => o?.id === "far"));
  // touch: only those in reach
  r = T.rank("h.t", s);
  assert.equal(r.pick.id, "g3");
  assert.equal(r.others.length, 0);
});

test("hostile: a neutral token that was hurt is a foe, with a warning", () => {
  const s = scene();
  s.tokens = s.tokens.filter(t => t.disposition === 0 || t.side === "friend");
  s.tokens.find(t => t.id === "n1").side = "foe";
  const r = T.rank("h.s", s);
  assert.equal(r.pick.id, "n1");
  assert.equal(r.warn, "neutral");
  s.tokens.find(t => t.id === "n1").side = "neutral";
  const none = T.rank("h.s", s);
  assert.equal(none.pick, null);
  assert.equal(none.why, "no foe in range");
});

test("healing goes to the most hurt in range; helpful to the nearest ally; self to the user", () => {
  const s = scene();
  let r = T.rank("x.s", s);
  assert.equal(r.pick.id, "a1");
  assert.equal(r.others[0].name, "Anezka");
  r = T.rank("x.t", s);
  assert.equal(r.pick.name, "Anezka", "Bogdan is out of reach: the user is the most hurt in touch");
  s.self.wounds = 0;
  r = T.rank("x.t", s);
  assert.equal(r.pick.self, true);
  assert.match(r.pick.why, /no one in range is hurt/);
  r = T.rank("p.s", s);
  assert.equal(r.pick.id, "a2");
  r = T.rank("s.t", s);
  assert.equal(r.pick.self, true);
  assert.equal(r.others.length, 0);
});

test("area lists everyone in range, allies unticked; either keeps the last target", () => {
  const s = scene();
  let r = T.rank("a.v", s);
  assert.equal(r.pick, null);
  assert.ok(r.area.find(a => a.id === "a2" && a.tick === false));
  assert.ok(r.area.find(a => a.id === "g3" && a.tick === true));
  assert.ok(!r.area.find(a => a.id === "far" || a.id === "hid"));
  r = T.rank("e.s", s);
  assert.equal(r.pick.id, "g3", "no last target: the nearest foe");
  s.lastTargetId = "a2";
  r = T.rank("e.s", s);
  assert.equal(r.pick.id, "a2");
  assert.equal(r.pick.why, "the last target");
});

test("a target set by hand is kept; the picker's own may be replaced", () => {
  assert.equal(T.handSet([], []), false);
  assert.equal(T.handSet(["a"], ["a"]), false);
  assert.equal(T.handSet(["a"], ["b"]), true);
  assert.equal(T.handSet(["a"], []), true);
  const hits = T.lastHits([{attacker: "x", target: "me"}, {attacker: "y", target: "me"}, {attacker: "x", target: "z"}]);
  assert.equal(hits.get("me").get("y"), 2);
  assert.equal(hits.get("me").get("x"), 1);
});

/* ---- the panel, on a stand-in for Foundry ---- */

const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
const hooks = new Map();
globalThis.Hooks = {once: (k, f) => { (hooks.get(k) ?? hooks.set(k, []).get(k)).push(f); }, on: (k, f) => { (hooks.get(k) ?? hooks.set(k, []).get(k)).push(f); },
  call: (k, ...a) => (hooks.get(k) ?? []).forEach(f => f(...a))};
const store = new Map([["wodx-targeting.mode", "suggest"], ["wodx-targeting.mine", "world"]]);
const chat = [];
globalThis.ChatMessage = {create: async d => { chat.push(d); return d; }};
const mod = {active: true};
const mkTok = (id, name, disposition, x, y, more = {}) => {
  const actor = {id: `A${id}`, uuid: `Actor.A${id}`, name, system: {health: {damage: {bashing: more.wounds ?? 0}}}, statuses: new Set(), isOwner: !!more.owned, hasPlayerOwner: !!more.owned,
    getActiveTokens: () => [tok]};
  const tok = {id, name, actor, center: {x, y}, visible: more.visible ?? true, document: {disposition, hidden: !!more.hidden, width: 1},
    setTarget(on) { if ( on ) game.user.targets.add(tok); else game.user.targets.delete(tok); }};
  return tok;
};
const toks = [mkTok("me", "Anezka", 1, 0, 0, {owned: true}), mkTok("g1", "Ghoul A", -1, 300, 0), mkTok("g2", "Ghoul B", -1, 100, 0), mkTok("a1", "Bogdan", 1, 150, 0, {wounds: 3}),
  mkTok("h1", "Hidden", -1, 50, 0, {hidden: true}), mkTok("n1", "Villager", 0, 60, 0)];
globalThis.canvas = {ready: true, scene: {grid: {distance: 5, units: "ft"}},
  grid: {measurePath: ([a, b]) => ({distance: Math.hypot(a.x - b.x, a.y - b.y) / 100 * 5})},
  tokens: {placeables: toks, controlled: [toks[0]], get: id => toks.find(t => t.id === id),
    setTargets(ids) { const before = new Set(game.user.targets); game.user.targets.clear(); for ( const id of ids ) game.user.targets.add(toks.find(t => t.id === id));
      for ( const t of toks ) { const on = game.user.targets.has(t); if ( on !== before.has(t) ) Hooks.call("targetToken", game.user, t, on); } }}};
globalThis.CONFIG = {Canvas: {polygonBackends: {sight: {testCollision: () => false}}}};
globalThis.game = {user: {id: "u1", name: "Player", isGM: false, targets: new Set()}, users: {filter: () => [{id: "gm"}]},
  settings: {register: (m, k, cfg) => { if ( !store.has(`${m}.${k}`) ) store.set(`${m}.${k}`, cfg.default); }, get: (m, k) => store.get(`${m}.${k}`)},
  modules: new Map([["wodx-targeting", mod]]), messages: {contents: []}, wodxCombat: null};
globalThis.fetch = async () => ({ok: true, json: async () => TABLE});
await import(pathToFileURL(join(root, "modules/wodx-targeting/scripts/main.mjs")));
Hooks.call("init");
for ( const f of hooks.get("ready") ?? [] ) await f();
const api = mod.api;

const windowFor = () => {
  const app = document.createElement("div");
  app.className = "application";
  app.innerHTML = `<form><select name="power"><option value="dominate-command">Command</option><option value="valeren-healer-healers-touch">Healer's Touch</option>
    <option value="celerity-1">Celerity</option><option value="presence-awe">Awe</option></select></form><footer><button type="button" data-action="ok">Use</button></footer>`;
  document.body.append(app);
  return app;
};
const panelFor = (app, picks) => api.attach(app, {actor: toks[0].actor, onPick: a => picks.push(a?.name ?? null),
  tag: () => api.tagFor("disc", app.querySelector("[name=power]").value)});

test("panel, Suggest: names the nearest foe, lists the others, never the hidden one, and follows the power", () => {
  game.user.targets.clear();
  const app = windowFor(), picks = [];
  const h = panelFor(app, picks);
  assert.ok(h);
  const box = app.querySelector(".wodx-aim");
  assert.match(box.textContent, /Suggested: Ghoul B/);
  assert.ok(!box.textContent.includes("Hidden"));
  assert.ok(!box.textContent.includes("Villager"), "a neutral bystander is not a foe");
  assert.deepEqual(picks, ["Ghoul B"]);
  assert.equal(game.user.targets.size, 0, "Suggest sets nothing until the window is used");
  // switch to another candidate
  box.querySelector('button[data-aim="g1"]').click();
  assert.equal(picks.at(-1), "Ghoul A");
  assert.match(box.textContent, /Suggested: Ghoul A/);
  // a healing power: the hurt ally
  const sel = app.querySelector("[name=power]");
  sel.value = "valeren-healer-healers-touch";
  sel.dispatchEvent(new window.Event("change", {bubbles: true}));
  assert.match(box.textContent, /Anezka|Bogdan/);
  // a power on the user: no target
  sel.value = "celerity-1";
  sel.dispatchEvent(new window.Event("change", {bubbles: true}));
  assert.match(box.textContent, /Anezka/);
  assert.equal(picks.at(-1), null);
  // an area power: a list to confirm, allies unticked
  sel.value = "presence-awe";
  sel.dispatchEvent(new window.Event("change", {bubbles: true}));
  const ticks = [...box.querySelectorAll("input[type=checkbox]")];
  assert.ok(ticks.length >= 3);
  box.querySelector(".wodx-aim-area-go").click();
  assert.ok([...game.user.targets].every(t => t.document.disposition !== 1), "allies left out unless ticked");
  app.remove();
});

test("panel, Suggest: using the window makes the choice the user's target; the next window may suggest again", () => {
  game.user.targets.clear();
  const app = windowFor(), picks = [];
  panelFor(app, picks);
  app.querySelector('button[data-action="ok"]').click();
  assert.deepEqual([...game.user.targets].map(t => t.id), ["g2"]);
  assert.equal(api.handSet(), false, "the picker's own target is not counted as set by hand");
  app.remove();
  const app2 = windowFor();
  app2.querySelector("[name=power]").value = "valeren-healer-healers-touch";
  panelFor(app2, picks);
  assert.match(app2.querySelector(".wodx-aim").textContent, /Suggested: Bogdan/);
  app2.remove();
});

test("panel: a target set by hand is kept and named", () => {
  game.user.targets.clear();
  toks[1].setTarget(true);
  Hooks.call("targetToken", game.user, toks[1], true);
  const app = windowFor(), picks = [];
  panelFor(app, picks);
  assert.match(app.querySelector(".wodx-aim").textContent, /Ghoul A.*set by hand/);
  assert.deepEqual(picks, []);
  app.querySelector('button[data-action="ok"]').click();
  assert.deepEqual([...game.user.targets].map(t => t.id), ["g1"]);
  app.remove();
});

test("panel: a player asking for Automatic gets Suggest; the Storyteller's Automatic sets the target at once", () => {
  store.set("wodx-targeting.mode", "auto");
  game.user.targets.clear();
  Hooks.call("targetToken", game.user, toks[1], false);
  let app = windowFor();
  panelFor(app, []);
  assert.equal(game.user.targets.size, 0);
  assert.match(app.querySelector(".wodx-aim").textContent, /Suggested/);
  app.remove();
  game.user.isGM = true;
  app = windowFor();
  panelFor(app, []);
  assert.deepEqual([...game.user.targets].map(t => t.id), ["g2"]);
  assert.match(app.querySelector(".wodx-aim").textContent, /Targeted: Ghoul B/);
  app.remove();
  game.user.isGM = false;
  store.set("wodx-targeting.mode", "suggest");
});

test("panel: Off, or off on this computer, adds nothing", () => {
  store.set("wodx-targeting.mode", "off");
  let app = windowFor();
  assert.equal(panelFor(app, []), null);
  assert.equal(app.querySelector(".wodx-aim"), null);
  app.remove();
  store.set("wodx-targeting.mode", "suggest");
  store.set("wodx-targeting.mine", "off");
  app = windowFor();
  assert.equal(panelFor(app, []), null);
  app.remove();
  store.set("wodx-targeting.mine", "world");
});

test("a casting window asks what it is aimed at, with a default from the casting", () => {
  game.user.targets.clear();
  const app = document.createElement("div");
  app.className = "application";
  app.innerHTML = `<form><select name="s-life"><option value="0">0</option><option value="2" selected>2</option></select></form>`;
  document.body.append(app);
  const picks = [];
  api.attach(app, {actor: toks[0].actor, onPick: a => picks.push(a?.name ?? null), cast: {from: r => T.castIntent({spheres: {life: Number(r.querySelector("[name=s-life]").value)}})}});
  const sel = app.querySelector(".wodx-aim-intent");
  assert.equal(sel.value, "x");
  assert.match(app.querySelector(".wodx-aim").textContent, /Bogdan/);
  sel.value = "h";
  sel.dispatchEvent(new window.Event("change", {bubbles: true}));
  assert.match(app.querySelector(".wodx-aim").textContent, /Ghoul B/);
  app.remove();
});

test("attacks: the likeliest foe, and the panel can switch or clear it", () => {
  game.user.targets.clear();
  Hooks.call("targetToken", game.user, toks[1], false);
  const pre = api.preAttack(toks[0].actor);
  assert.equal(pre.token.id, "g2");
  const app = windowFor();
  let reopened = "unset";
  api.attackPanel(app, pre, tok => { reopened = tok?.id ?? null; });
  app.querySelector('.wodx-aim button[data-aim="g1"]').click();
  assert.equal(reopened, "g1");
  app.querySelector('.wodx-aim button[data-aim=""]').click();
  assert.equal(reopened, null);
  app.remove();
  toks[1].setTarget(true);
  Hooks.call("targetToken", game.user, toks[1], true);
  assert.equal(api.preAttack(toks[0].actor), null, "a target set by hand: the attack keeps it");
  game.user.targets.clear();
});
