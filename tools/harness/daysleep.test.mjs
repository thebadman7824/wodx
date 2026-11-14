import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";

/* WoDX Actions, B4890-B4899: the day's sleep, the dawn vigil, waking when hurt, rising at each one's hour, healing on rising */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
CONFIG.statusEffects = [];
globalThis.canvas = {scene: null, tokens: {controlled: [], placeables: []}};
game.combat = null;

const DS = await import(join(root, "modules/wodx-actions/scripts/daysleep-rules.js"));
const DSX = await import(join(root, "modules/wodx-actions/scripts/daysleep.js"));
const cal = await import(join(root, "modules/wodx-chronicle/scripts/calendar.mjs"));

/* ---------------- Pure rules ---------------- */

test("who sleeps: by day, unless sunset is near enough for their rating; never by night", () => {
  assert.equal(DS.wantsSleep({isNight: true, toDusk: 5000, rating: 5}), false);
  assert.equal(DS.wantsSleep({isNight: false, toDusk: 5000, rating: 5}), true);
  // Road or Humanity 7+ rise ten minutes before sunset (V20 p. 311)
  assert.equal(DS.wantsSleep({isNight: false, toDusk: 500, rating: 8}), false);
  assert.equal(DS.wantsSleep({isNight: false, toDusk: 500, rating: 5}), true);
  // polar day: no sunset to wait for
  assert.equal(DS.wantsSleep({isNight: false, toDusk: null, rating: 9}), true);
  assert.equal(DS.wantsSleep({isNight: null}), false, "no clock, no sleep");
});

test("rising hour, vigil length and the Awakening roll", () => {
  assert.equal(DS.wakeAt(1000, 3600, 8), 1000 + 3600 - 600);
  assert.equal(DS.wakeAt(1000, 3600, 5), 4600);
  assert.equal(DS.wakeAt(1000, 3600, 3), 4600 + 35 * 60);
  assert.equal(DS.wakeAt(1000, 3600, 1), 4600 + 3600);
  assert.equal(DS.wakeAt(1000, null, 5), null);
  assert.equal(DS.awakeUntil(100, 3), 109);
  assert.equal(DS.awakeUntil(100, "scene"), 3700);
  assert.deepEqual(DS.awakening({successes: 0}), {awake: false, turns: 0, deep: false, text: "Slips back into slumber."});
  assert.equal(DS.awakening({successes: 2}).turns, 2);
  assert.equal(DS.awakening({successes: 5}).turns, Infinity);
  assert.equal(DS.awakening({successes: 0, botch: true}).deep, true);
  assert.equal(DS.awakening(null, {light: true}).awake, true);
  assert.equal(DS.daytimeSpent({turns: 0, until: 999}, 0), true);
  assert.equal(DS.daytimeSpent({turns: 2, until: 999}, 100), false);
  assert.equal(DS.daytimeSpent({turns: 2, until: 999}, 999), true);
  assert.equal(DS.daytimeSpent({turns: "scene"}, 5), false, "an old flag without an end waits for its end to be set");
});

/* ---------------- The engine ---------------- */

await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
await Hooks.callAll("init");
mock.setupTime();
await Hooks.callAll("ready");

const setPath = (o, path, v) => { const p = path.split("."); for ( const k of p.slice(0, -1) ) o = (o[k] ??= {}); o[p.at(-1)] = v; };
let ids = 0;
function vampire(name, {road = 5, player = true, damage = {}, blood = 8} = {}) {
  const a = {
    id: `v${++ids}`, uuid: `Actor.v${ids}`, name, type: "Vampire", flags: {}, hasPlayerOwner: player, isOwner: true, items: [], effects: [], statuses: new Set(),
    system: {advantages: {path: {permanent: road}, bloodpool: {temporary: blood, max: 10}, virtues: {selfcontrol: {permanent: 3}}}, health: {damage: {bashing: 0, lethal: 0, aggravated: 0, ...damage}}},
    getFlag(s, k) { return this.flags?.[s]?.[k]; },
    async setFlag(s, k, v) { setPath(this.flags, `${s}.${k}`, structuredClone(v)); return this; },
    async unsetFlag(s, k) { delete this.flags?.[s]?.[k]; return this; },
    getActiveTokens: () => [], testUserPermission: () => true
  };
  return a;
}

const lat = () => game.settings.get("wodx-chronicle", "latitude");
/** A world time at noon and at midnight, found on the clock itself. */
function findTime(wantNight) {
  for ( let t = 0; t < 3 * 86400; t += 1800 ) {
    const d = cal.describeTime(t, lat());
    if ( d.isNight === wantNight && (wantNight ? cal.secondsToNextDawn(t, lat()) > 3 * 3600 : cal.secondsToNextDusk(t, lat()) > 3 * 3600) ) return t;
  }
  throw new Error("no such time");
}

const rolls = [], posts = [], actors = [];
const S = {daySleep: true, riseHeal: true};
const statuses = [];
const ctx = {
  rollPool: async (dice, diff) => { const q = rolls.shift() ?? 0; const r = typeof q === "number" ? {successes: q, botch: false} : q; return {...r, dice, difficulty: diff, roll: null}; },
  rollBlock: (label, r) => `<div>${label}: ${r.successes} at ${r.difficulty}</div>`,
  setting: k => S[k],
  setFlag: (a, k, v) => (v === null ? a.unsetFlag("wodx-actions", k) : a.setFlag("wodx-actions", k, v)),
  statusEffect: async (a, id, on) => { statuses.push([a.name, id, on]); if ( on ) a.statuses.add(id); else a.statuses.delete(id); },
  post: async (a, title, body) => { posts.push({actor: a.name, title, body}); return {}; },
  clockActors: () => actors,
  riseHeal: async (a, {quiet} = {}) => { const d = a.system.health.damage; const h = d.lethal; d.lethal = 0; a.system.advantages.bloodpool.temporary -= h; return {text: `heals ${h} lethal`}; }
};
const E = DSX.build(ctx);
const reset = () => { rolls.length = 0; posts.length = 0; actors.length = 0; statuses.length = 0; mock.log.chat.length = 0; };

test("at day every Cainite falls asleep with the marker, and rises at night healing with blood", async () => {
  reset();
  const v = vampire("Agnes", {damage: {lethal: 2}});
  const t = vampire("Torpid"); await t.setFlag("wodx-actions", "torpor", {since: 0});
  actors.push(v, t);
  await game.time.set(findTime(false));
  const rows = await E.tick({edge: "dawn"});
  assert.deepEqual(rows.map(r => r.actor.name), ["Agnes"], "torpor is left alone");
  assert.ok(v.getFlag("wodx-actions", "daySleep"));
  assert.ok(v.statuses.has("sleep"), "the sleep marker on the token");
  assert.match(mock.log.chat.at(-1).content, /Dawn[\s\S]*Agnes<\/b> falls into the day's sleep/);
  // a second tick by day changes nothing
  mock.log.chat.length = 0;
  assert.equal((await E.tick()).length, 0);
  assert.equal(mock.log.chat.length, 0);
  // the rising hour passes
  const wake = v.getFlag("wodx-actions", "daySleep").wakeAt;
  await game.time.set(wake + 60);
  const r2 = await E.tick({edge: "dusk"});
  assert.equal(v.getFlag("wodx-actions", "daySleep"), undefined);
  assert.equal(v.statuses.has("sleep"), false);
  assert.match(r2[0].text, /rises; heals 2 lethal/);
  assert.equal(v.system.health.damage.lethal, 0);
});

test("a Storyteller's Cainite gets the Storyteller's card only", async () => {
  reset();
  const npc = vampire("Count", {player: false});
  actors.push(npc);
  await game.time.set(findTime(false));
  await E.tick();
  const m = mock.log.chat.at(-1);
  assert.deepEqual(m.whisper, game.users.filter(u => u.isGM).map(u => u.id));
});

test("the dawn vigil rolls the Road by itself, the turns run down in a fight, then sleep", async () => {
  reset();
  const v = vampire("Watcher", {road: 6});
  await v.setFlag("wodx-actions", "dawnVigil", true);
  actors.push(v);
  await game.time.set(findTime(false));
  rolls.push(2);
  const rows = await E.tick({edge: "dawn"});
  assert.match(rows[0].text, /stays awake: awake for 2 turns/);
  assert.equal(v.getFlag("wodx-actions", "daytime").turns, 2);
  assert.ok(!v.getFlag("wodx-actions", "daySleep"));
  assert.match(posts.at(-1).body, /Road 6: 2 at 8/);
  await E.onRound({combatants: [{actor: v}]});
  assert.equal(v.getFlag("wodx-actions", "daytime").turns, 1);
  const out = await E.onRound({combatants: [{actor: v}]});
  assert.equal(out.length, 1);
  assert.ok(v.getFlag("wodx-actions", "daySleep"), "sleep takes them when the turns run out");
  // the vigil is rolled once a day
  await v.unsetFlag("wodx-actions", "daySleep");
  rolls.push(3);
  await E.tick();
  assert.equal(rolls.length, 1, "no second vigil roll that day");
  assert.ok(v.getFlag("wodx-actions", "daySleep"));
});

test("hurt in the day's sleep: the Awakening roll by itself; a botch sleeps until sundown", async () => {
  reset();
  const v = vampire("Light", {road: 5});
  actors.push(v);
  await game.time.set(findTime(false));
  await E.tick();
  rolls.push(1);
  await E.onHurt(v);
  assert.ok(!v.getFlag("wodx-actions", "daySleep"), "awake");
  assert.equal(v.getFlag("wodx-actions", "daytime").turns, 1);
  // sleep again, then a botch
  await E.fallAsleep(v, await E.sunClock());
  rolls.push({successes: 0, botch: true});
  await E.onHurt(v);
  assert.equal(v.getFlag("wodx-actions", "daySleep").deep, true);
  rolls.push(5);
  await E.onHurt(v);
  assert.equal(rolls.length, 1, "no roll for a deep sleeper");
});

test("a long jump of the clock lands right, and the setting turns it all off", async () => {
  reset();
  const v = vampire("Jumper");
  actors.push(v);
  await game.time.set(findTime(true));
  assert.equal((await E.tick()).length, 0, "nobody sleeps at night");
  await game.time.set(findTime(false) + 86400);
  await E.tick();
  assert.ok(v.getFlag("wodx-actions", "daySleep"));
  await game.time.set(game.time.worldTime + 86400 * 2);
  await E.tick();
  const s = v.getFlag("wodx-actions", "daySleep");
  assert.ok(s && s.wakeAt > game.time.worldTime, "woke for the nights between and sleeps this day, rising tonight");
  S.daySleep = false;
  const w = vampire("Off"); actors.push(w);
  assert.equal((await E.tick()).length, 0);
  assert.ok(!w.getFlag("wodx-actions", "daySleep"));
  S.daySleep = true;
});

test("the settings: New Night and the sun's burns by themselves are the defaults", async () => {
  const {readFileSync} = await import("node:fs");
  const k = readFileSync(join(root, "modules/wodx-actions/scripts/kindred.js"), "utf8");
  const s = readFileSync(join(root, "modules/wodx-actions/scripts/sunlight.js"), "utf8");
  assert.match(k, /"dawnDusk"[\s\S]{0,400}default: "auto"/);
  assert.match(s, /"sunDamage"[\s\S]{0,600}default: "apply"/);
  assert.match(k, /register\("daySleep"/);
  assert.match(k, /register\("riseHeal"/);
});
