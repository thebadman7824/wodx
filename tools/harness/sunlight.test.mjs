import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";

/* WoDX Actions 3.3.0 (the sunlight system) and WoDX Combat 3.5.0 (gridless reach and movement in yards) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
CONFIG.statusEffects = [];
globalThis.canvas = {scene: null, tokens: {controlled: [], placeables: []}};
game.combat = null;

const S = await import(join(root, "modules/wodx-actions/scripts/sunlight-rules.js"));
const AU = await import(join(root, "modules/wodx-combat/scripts/auto.js"));

test("the sun's place: equinox noon at 50° N is 40° up in the south; morning in the east; night below the horizon", () => {
  const noon = S.sunPosition(50, 0, 12);
  assert.ok(Math.abs(noon.altitude - 40) < 0.01);
  assert.ok(Math.abs(noon.azimuth - 180) < 0.01);
  const morning = S.sunPosition(50, 0, 8);
  assert.ok(morning.azimuth > 90 && morning.azimuth < 135, `${morning.azimuth}`);
  assert.equal(S.phaseOfSun(S.sunPosition(50, 0, 0).altitude), "night");
  assert.equal(S.phaseOfSun(3), "twilight");
  assert.ok(Math.abs(S.declination(172) - 23.44) < 0.5, "midsummer");
  assert.ok(S.sunPosition(50, S.declination(172), 12).altitude > S.sunPosition(50, S.declination(355), 12).altitude + 40, "summer sun higher than winter");
});

test("shadows: a wall's shadow lengthens as the sun sinks; the shadow points away from the sun on the map", () => {
  assert.ok(Math.abs(S.shadowLength(10, 45) - 10) < 1e-9);
  assert.ok(S.shadowLength(10, 10) > 50);
  assert.equal(S.shadowLength(10, 0), Infinity);
  const south = S.sunVector(180, 0);
  assert.ok(Math.abs(south.x) < 1e-9 && Math.abs(south.y - 1) < 1e-9, "north up: the southern sun is toward the bottom");
  const east = S.sunVector(90, 90);
  assert.ok(Math.abs(east.y + 1) < 1e-9, "a map with north to the right: the eastern sun is at the top");
});

test("the light on her: the place, capped by the sky, twilight and heavy clothing (VtDA20 p. 359)", () => {
  assert.equal(S.effectiveLight({place: "direct"}), "direct");
  assert.equal(S.effectiveLight({place: "direct", sky: "cloudy"}), "cloudy");
  assert.equal(S.effectiveLight({place: "direct", sky: "overcast"}), "faint");
  assert.equal(S.effectiveLight({place: "direct", phase: "twilight"}), "faint");
  assert.equal(S.effectiveLight({place: "direct", covered: true}), "covered");
  assert.equal(S.effectiveLight({place: "indirect", covered: true}), "covered");
  assert.equal(S.effectiveLight({place: "faint", covered: true}), "faint");
  assert.equal(S.effectiveLight({place: "shade"}), null);
  assert.equal(S.effectiveLight({place: "direct", phase: "night"}), null);
  assert.deepEqual([S.SOAK_DIFF.direct, S.SOAK_DIFF.cloudy, S.SOAK_DIFF.indirect, S.SOAK_DIFF.covered, S.SOAK_DIFF.faint], [10, 9, 7, 5, 3]);
  assert.equal(S.sunTurn({exposure: 3, soakSuccesses: 1}), 2);
  assert.equal(S.sunTurn({exposure: 1, soakSuccesses: 3}), 0);
});

test("protection: Earth Meld, Unseen Hibernation and the earth shelter her; Woad of Taranis makes the sun lethal", () => {
  assert.equal(S.protection({effects: ["Earth Meld"]}).immune, true);
  assert.equal(S.protection({effects: ["Unseen Hibernation"]}).immune, true);
  assert.equal(S.protection({torpor: true, buried: true}).immune, true);
  assert.equal(S.protection({torpor: true}).immune, false, "torpor alone doesn't hide her from the sun");
  const w = S.protection({effects: ["Woad of Taranis"]});
  assert.deepEqual([w.immune, w.lethal, w.noRotschreck], [false, true, true]);
});

test("dawn warnings at 30 and 10 minutes, once each", () => {
  assert.equal(S.dawnWarning(45 * 60, []), null);
  assert.equal(S.dawnWarning(29 * 60, []), 30);
  assert.equal(S.dawnWarning(25 * 60, [30]), null);
  assert.equal(S.dawnWarning(9 * 60, [30]), 10);
  assert.equal(S.dawnWarning(9 * 60, []), 10, "the most urgent first when the clock jumps");
});

test("gridless reach: big tokens reach from their edges; movement in yards by the book (VtDA20 pp. 333, 351)", () => {
  assert.equal(AU.reachDistance(5, 1, 1, 5), 5);
  assert.equal(AU.reachDistance(10, 2, 2, 5), 5, "two 2×2 tokens side by side");
  assert.equal(AU.inReach(AU.reachDistance(7.07, 1, 1, 5), 5), true, "diagonal on a gridless scene");
  assert.equal(AU.inReach(AU.reachDistance(8, 1, 1, 5), 5), false);
  assert.equal(AU.inReach(AU.reachDistance(7.5, 2, 1, 5), 5), true, "a 2×2 beside a 1×1");
  assert.equal(AU.inReach(AU.reachDistance(12, 2, 1, 5), 5), false);
  assert.equal(AU.toYards(30, "ft"), 10);
  assert.equal(AU.toYards(10, "m"), 10);
  const m = AU.movement({dexterity: 3});
  assert.deepEqual([m.walk, m.jog, m.run, m.attackAfter], [7, 15, 29, 14]);
  assert.equal(AU.movement({dexterity: 3, celerity: 2}).run, 31);
  assert.equal(AU.movement({dexterity: 3, doubleRun: true}).run, 58);
  assert.equal(AU.movement({dexterity: 3, woundIndex: 3}).run, 14, "Injured: half running speed");
  assert.equal(AU.movement({dexterity: 3, woundIndex: 4}).run, 7, "Wounded: walks");
  assert.equal(AU.movement({dexterity: 3, woundIndex: 5}).run, 3);
  assert.equal(AU.movement({dexterity: 3, woundIndex: 7}).run, 0);
  assert.deepEqual([AU.pace(6, m), AU.pace(14, m), AU.pace(29, m), AU.pace(30, m)], ["walk", "jog", "run", "over"]);
});

/* ---------------- The engine ---------------- */

await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
await Hooks.callAll("init");
mock.setupTime();
await Hooks.callAll("ready");
await mock.settle();

const SX = await import(join(root, "modules/wodx-actions/scripts/sunlight.js"));
const reg = (key, name, hint, type, def) => game.settings.register("wodx-actions", key, {name, hint, scope: "world", config: true, type, default: def});
SX.registerSettings(reg);
reg("wallHeight", "", "", Number, 10);

const setPath = (o, path, v) => { const p = path.split("."); for ( const k of p.slice(0, -1) ) o = (o[k] ??= {}); o[p.at(-1)] = v; };
const flagged = o => Object.assign(o, {
  getFlag(s, k) { return this.flags?.[s]?.[k]; },
  async setFlag(s, k, v) { setPath(this.flags ??= {}, `${s}.${k}`, structuredClone(v)); return this; },
  async unsetFlag(s, k) { delete this.flags?.[s]?.[k]; return this; }
});
class Coll extends Map {
  [Symbol.iterator]() { return this.values(); }
  filter(f) { return [...this.values()].filter(f); }
  find(f) { return [...this.values()].find(f); }
  some(f) { return [...this.values()].some(f); }
}
game.scenes = new Coll();
let ids = 0;
function vampire(name, {fort = 2, effects = [], type = "Vampire"} = {}) {
  return flagged({id: `v${++ids}`, uuid: `Actor.v${ids}`, name, type, flags: {}, isOwner: true, hasPlayerOwner: true,
    items: new Coll([["f", {name: "Fortitude", type: "Power", system: {type: "wod.types.discipline", value: fort}}]]),
    effects: effects.map(n => ({name: n})), system: {attributes: {stamina: {total: 3}}, health: {damage: {bashing: 0, lethal: 0, aggravated: 0}}, conditions: {isfrenzy: false}},
    getActiveTokens: () => [], testUserPermission: () => true});
}
const scene = flagged({id: "sc1", name: "Courtyard", flags: {}, grid: {size: 100, distance: 5, units: "ft"}, regions: new Map(), tokens: []});
const region = (name, light = null, exposure = 3) => ({id: `r${++ids}`, name, behaviors: light ? [{type: SX.TYPE, disabled: false, system: {light, exposure, ignoreSky: false}}] : []});
const token = (actor, regions = []) => flagged({id: `t${++ids}`, name: actor.name, actor, actorId: actor.id, parent: scene, regions: new Set(regions), flags: {}});

const posts = [], rolls = [], applied = [];
const ctx = {
  post: async (a, title, body) => { posts.push({actor: a?.name, title, body}); return {title}; },
  rollPool: async (dice, diff) => { const q = rolls.shift() ?? 0; return {successes: q, botch: false, dice, difficulty: diff, roll: null, faces: []}; },
  rollBlock: (label, r) => `<div>${label}: ${r.successes} (${r.dice} at ${r.difficulty})</div>`,
  dialog: async () => null, setting: k => game.settings.get("wodx-actions", k),
  setFlag: (a, k, v) => (v === null ? a.unsetFlag("wodx-actions", k) : a.setFlag("wodx-actions", k, v)),
  attr: (a, k) => a.system.attributes?.[k]?.total ?? 0,
  discipline: (a, d) => [...a.items.values()].find(i => i.name === d)?.system?.value ?? 0,
  applyDamage: async (a, type, levels) => { applied.push([a.name, type, levels]); a.system.health.damage[type] += levels; return {after: a.system.health.damage}; },
  healthText: (a, d) => `${d.aggravated}A`, logEvent: async () => {}, notify: () => {},
  clockActors: () => [...game.actors]
};
const E = SX.build(ctx);
const DAY = {phase: "day", altitude: 40, azimuth: 180}, NIGHT = {phase: "night", altitude: -20, azimuth: 0};

test("exposure: Sunlight regions, shade regions, a scene marked outdoors, night, ghouls and the protected", async () => {
  const v = vampire("Ilse");
  assert.equal(E.exposureOf(token(v), DAY).exposed, false, "an unmarked scene: only regions count");
  const ex = E.exposureOf(token(v, [region("Courtyard", "direct", 2)]), DAY);
  assert.deepEqual([ex.exposed, ex.light, ex.exposure, ex.diff], [true, "direct", 2, 10]);
  assert.equal(E.exposureOf(token(v, [region("Courtyard", "direct"), region("Under the arcade", "shade")]), DAY).exposed, false);
  assert.equal(E.exposureOf(token(v, [region("Sunlit square")]), DAY).light, "direct", "a region named sunlit");
  await scene.setFlag("wodx-actions", "light", "outdoors");
  assert.equal(E.exposureOf(token(v), DAY).exposed, true, "the open on an outdoor scene");
  assert.equal(E.exposureOf(token(v), NIGHT).exposed, false);
  assert.equal(E.exposureOf(token(v), {...DAY, phase: "twilight"}).light, "faint");
  await v.setFlag("wodx-actions", "sunCover", true);
  assert.equal(E.exposureOf(token(v), DAY).light, "covered");
  await v.unsetFlag("wodx-actions", "sunCover");
  await game.settings.set("wodx-actions", "sky", "cloudy");
  assert.equal(E.exposureOf(token(v), DAY).light, "cloudy");
  await game.settings.set("wodx-actions", "sky", "clear");
  assert.equal(E.exposureOf(token(vampire("Gangrel", {effects: ["Earth Meld"]})), DAY).exposed, false);
  assert.equal(E.exposureOf(token(vampire("Ghoul", {type: "Mortal"})), DAY).exposed, false, "the living don't burn");
  await scene.unsetFlag("wodx-actions", "light");
});

test("burning: Fortitude soaks each turn at the light's difficulty, the rest aggravated, then a Rötschreck button", async () => {
  posts.length = 0; applied.length = 0;
  const v = vampire("Burnt", {fort: 2});
  rolls.push(1, 0);
  await E.applySun(v, {light: "direct", exposure: 3, turns: 2});
  assert.deepEqual(applied.at(-1), ["Burnt", "aggravated", 5]);
  assert.match(posts.at(-1).body, /Fortitude soak.*\(2 at 10\)/s);
  assert.match(posts.at(-1).body, /data-kx="rotschreck"[^>]*data-arg="directsun"/);
  rolls.push(2);
  await E.applySun(vampire("Woad"), {light: "direct", exposure: 3, lethal: true, noRotschreck: true});
  assert.deepEqual(applied.at(-1), ["Woad", "lethal", 1]);
  assert.match(posts.at(-1).body, /Stamina \+ Fortitude soak.*\(5 at 6\)/s);
  assert.doesNotMatch(posts.at(-1).body, /rotschreck/);
});

test("a fight's new round burns every Cainite in the sun (a card with a button by default); stepping into it too", async () => {
  mock.log.chat.length = 0;
  const E2 = SX.build({...ctx, sunNow: async () => DAY});
  const t = token(vampire("Caught"), [region("Yard", "direct")]);
  const shaded = token(vampire("Safe"), [region("Barn", "shade")]);
  const burnt = await E2.onRound({round: 2, combatants: [{token: t}, {token: shaded}]});
  assert.deepEqual(burnt, ["Caught"]);
  assert.match(mock.log.chat.at(-1).content, /Turn 2 in the sun: Caught/);
  assert.match(mock.log.chat.at(-1).content, /data-sx="burn"[^>]*data-arg="1\|direct\|3\|0\|0"/);
  mock.log.chat.length = 0;
  const m = token(vampire("Stepper"), [region("Yard", "direct", 1)]);
  await E2.onMove(m);
  assert.equal(m.getFlag("wodx-actions", "inSun"), true);
  assert.match(mock.log.chat.at(-1).content, /Into the sun: Stepper/);
  await E2.onMove(m);
  assert.equal(mock.log.chat.length, 1, "no second card while she stays in the sun");
  const E3 = SX.build({...ctx, sunNow: async () => NIGHT});
  assert.deepEqual(await E3.onRound({round: 3, combatants: [{token: t}]}), []);
});

test("havens: set by scene or region; dawn warns who is away", async () => {
  mock.log.chat.length = 0;
  const v = vampire("Homebody"); const w = vampire("Wanderer"); const x = vampire("Homeless");
  const haven = region("Crypt");
  const sc = {id: "sc2", name: "Abbey", regions: new Map([[haven.id, haven]]), tokens: [{actorId: v.id, regions: new Set([haven])}, {actorId: w.id, regions: new Set()}]};
  game.scenes.set(sc.id, sc);
  await v.setFlag("wodx-actions", "haven", {sceneId: "sc2", sceneName: "Abbey", regionId: haven.id, regionName: "Crypt"});
  await w.setFlag("wodx-actions", "haven", {sceneId: "sc2", sceneName: "Abbey", regionId: haven.id, regionName: "Crypt"});
  assert.equal(E.havenStatus(v).inside, true);
  assert.equal(E.havenStatus(w).inside, false);
  assert.equal(E.havenStatus(x).set, false);
  for ( const a of [v, w, x] ) game.actors.set(a.id, a);
  await E.dawnWarning(10);
  const c = mock.log.chat.at(-1).content;
  assert.match(c, /Dawn in 10 minutes/);
  assert.match(c, /Homebody<\/b>: in her haven/);
  assert.match(c, /Wanderer<\/b>: <b>away from her haven/);
  assert.match(c, /Homeless<\/b>: <b>no haven set/);
  for ( const a of [v, w, x] ) game.actors.delete(a.id);
});

test("the Sunlight region behavior registers as a Foundry sub-type", () => {
  class Base { static defineSchema() { return {}; } }
  const F = {StringField: class { constructor(o) { this.o = o; } }, NumberField: class { constructor(o) { this.o = o; } }, BooleanField: class { constructor(o) { this.o = o; } }};
  foundry.data = {...(foundry.data ?? {}), regionBehaviors: {RegionBehaviorType: Base}, fields: F};
  CONFIG.RegionBehavior = {dataModels: {}, typeLabels: {}, typeIcons: {}};
  assert.equal(SX.registerBehavior(), true);
  const M = CONFIG.RegionBehavior.dataModels["wodx-actions.sunlight"];
  assert.ok(M);
  const schema = M.defineSchema();
  assert.deepEqual(Object.keys(schema), ["light", "exposure", "ignoreSky"]);
  assert.ok("shade" in schema.light.o.choices && "direct" in schema.light.o.choices);
  assert.equal(CONFIG.RegionBehavior.typeLabels["wodx-actions.sunlight"], "WoDX: Sunlight");
});
