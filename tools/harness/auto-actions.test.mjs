import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";

/* WoDX Actions, B4980-B4999: the Automation Desk's picks for the other lines (Ben, 14 November 2026) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
const MOD = "wodx-actions";
globalThis.canvas = {scene: {id: "sc1", tokens: []}, tokens: {controlled: [], placeables: []}};
game.time = {worldTime: 10 * 86400};
game.combat = null;
game.scenes = {viewed: null, find: () => null};

const S = p => import(join(root, "modules/wodx-actions/scripts", p));
const C = await S("c20-rules.js");

/* ---------------- Pure rules ---------------- */

test("chimerical healing follows C20's times, halved in a freehold, fast in the Dreaming (pp. 290-291)", () => {
  // two bashing: Hurt (30 min) then Bruised (30 min)
  assert.deepEqual(C.chimericalHealing({bashing: 2}, 3600).damage, {bashing: 0, lethal: 0, aggravated: 0});
  assert.equal(C.chimericalHealing({bashing: 2}, 1700).healed.bashing, 0);
  // one lethal at Bruised: six hours, three in a freehold
  assert.equal(C.chimericalHealing({lethal: 1}, 3 * 3600).healed.lethal, 0);
  assert.equal(C.chimericalHealing({lethal: 1}, 3 * 3600, {freehold: true}).healed.lethal, 1);
  // aggravated: at least a day, even in a freehold; the Dreaming twelve hours
  assert.equal(C.chimericalHealing({aggravated: 1}, 20 * 3600, {freehold: true}).healed.aggravated, 0);
  assert.equal(C.chimericalHealing({aggravated: 1}, 12 * 3600, {dreaming: true}).healed.aggravated, 1);
  assert.equal(C.chimericalHealing({lethal: 3}, 45 * 60, {dreaming: true}).healed.lethal, 3);
  // Incapacitated outside the Dreaming needs a freehold
  assert.equal(C.chimericalHealing({bashing: 7}, 99 * 3600).stuck, true);
  assert.equal(C.chimericalHealing({bashing: 7}, 99 * 3600, {freehold: true}).damage.bashing, 0);
  // the carry keeps part-healed time
  const p = C.chimericalHealing({lethal: 1}, 4 * 3600);
  assert.equal(p.carry, 4 * 3600);
  assert.equal(C.chimericalHealing({lethal: 1}, 2 * 3600, {carry: p.carry}).healed.lethal, 1);
});

/* ---------------- The engines ---------------- */

const setPath = (o, path, v) => { const p = path.split("."); for ( const k of p.slice(0, -1) ) o = (o[k] ??= {}); o[p.at(-1)] = v; };
let ids = 0;
function actor(name, type, system = {}, {items = [], flags = {}} = {}) {
  const a = {
    id: `a${++ids}`, uuid: `Actor.a${ids}`, name, type, flags: {[MOD]: structuredClone(flags)}, hasPlayerOwner: true, isOwner: true, system: structuredClone(system),
    items: Object.assign(items.map(i => ({...i, async update(u) { for ( const [k, v] of Object.entries(u) ) setPath(this, k, v); }})), {get(id) { return this.find(i => i.id === id); }}),
    getFlag(s, k) { return this.flags?.[s]?.[k]; },
    async setFlag(s, k, v) { setPath(this.flags, `${s}.${k}`, structuredClone(v)); return this; },
    async unsetFlag(s, k) { delete this.flags?.[s]?.[k]; return this; },
    async update(u) { for ( const [k, v] of Object.entries(u) ) setPath(this, k, v); return this; },
    getActiveTokens: () => [], testUserPermission: () => true
  };
  game.actors.set(a.id, a);
  return a;
}
let successes = 2;
const posts = [];
const settings = {};
const ctx = {
  post: async (a, title, body) => { posts.push({actor: a?.name, title, body}); return {title}; },
  rollPool: async () => ({successes, botch: false, roll: null, faces: []}),
  rollBlock: () => "",
  dialog: async () => null,
  updateActor: async (a, u) => a.update(u),
  setFlag: async (a, k, v) => a.setFlag(MOD, k, v),
  setting: k => settings[k],
  attr: () => 3,
  findAbility: () => ({value: 2}),
  abilityList: () => [],
  notify: m => posts.push({notify: m}),
  spendWillpower: async () => true,
  setDamage: async (a, d) => a.update({"system.health.damage.bashing": d.bashing, "system.health.damage.lethal": d.lethal, "system.health.damage.aggravated": d.aggravated}),
  applyDamage: async () => null,
  background: () => 0,
  api: () => ({})
};
const last = () => posts.at(-1);
const reset = () => { posts.length = 0; mock.log.chat.length = 0; };

test("c1: chimerical wounds heal with the clock on the track", async () => {
  const CX = (await S("c20.js")).build(ctx);
  const c = actor("Pip", "Changeling", {health: {damage: {bashing: 0, lethal: 0, aggravated: 0, chimerical: {bashing: 2, lethal: 0, aggravated: 0}}}});
  await CX.healChimerical([c]);
  assert.ok(c.flags[MOD].c20.chimClock, "the clock starts");
  game.time.worldTime += 3600;
  const lines = await CX.healChimerical([c]);
  assert.equal(c.system.health.damage.chimerical.bashing, 0);
  assert.equal(lines.length, 1);
  assert.match(mock.log.chat.at(-1).content, /Chimerical wounds heal/);
  settings.autoChimerical = false;
  c.system.health.damage.chimerical.bashing = 1; game.time.worldTime += 7200;
  await CX.healChimerical([c]);
  assert.equal(c.system.health.damage.chimerical.bashing, 1, "off: no healing");
  delete settings.autoChimerical;
});

test("w1, w2: Corpus mends an hour a level; a marked Fetter gives Willpower at the scene's end", async () => {
  const W = await S("wraith.js");
  const WX = W.build(ctx);
  const w = actor("Mara", "Wraith", {advantages: {corpus: {permanent: 10}, willpower: {permanent: 6, temporary: 2}}, health: {damage: {corpus: {bashing: 3, lethal: 1, aggravated: 0}}}},
    {items: [{id: "f1", name: "The music box", type: "Trait", system: {type: "wod.types.fetter", value: 3}}]});
  await WX.restAll([w]);
  game.time.worldTime += 2 * 3600 + 100;
  await WX.restAll([w]);
  assert.deepEqual(w.system.health.damage.corpus, {bashing: 1, lethal: 1, aggravated: 0}, "two bashing in two hours; lethal waits");
  // a Fetter token on the scene with the wraith
  reset(); successes = 3;
  const tok = {name: "Music box", actorId: null, flags: {[MOD]: {fetter: {actor: w.id, item: "f1"}}}, getFlag(s, k) { return this.flags[s]?.[k]; }};
  const scene = {tokens: [tok, {actorId: w.id, getFlag: () => null}]};
  const got = await WX.fetterScene(scene);
  assert.deepEqual(got, ["Mara"]);
  assert.equal(w.system.advantages.willpower.temporary, 5);
  assert.match(last().body, /rolled by itself/);
  // no wraith on the scene, no roll
  assert.deepEqual(await WX.fetterScene({tokens: [tok]}), []);
});

test("o1: Orpheus Vitality returns a point each eight hours, an hour for a skimmer", async () => {
  const OX = (await S("orpheus.js")).build(ctx);
  const o = actor("Ike", "Mortal", {settings: {variant: "orpheus", hasvitality: true, hasspite: true}, variant: {shade: "haunter", lament: "sleeper"}, advantages: {vitality: {permanent: 6, temporary: 2}, spite: {permanent: 1, temporary: 0}, willpower: {permanent: 5, temporary: 5}}});
  await OX.restAll([o]);
  game.time.worldTime += 17 * 3600;
  await OX.restAll([o]);
  assert.equal(o.system.advantages.vitality.temporary, 4);
  game.time.worldTime += 7 * 3600;
  await OX.restAll([o]);
  assert.equal(o.system.advantages.vitality.temporary, 5, "the hour left over counts toward the next point");
  // a loss starts the count again
  o.system.advantages.vitality.temporary = 3;
  game.time.worldTime += 8 * 3600;
  await OX.restAll([o]);
  assert.equal(o.system.advantages.vitality.temporary, 3);
});

test("u1: a mummy marked for the haven's meditation rolls it each day after the Gift of Ra", async () => {
  const UX = (await S("mummy.js")).build(ctx);
  const m = actor("Ankhet", "Mummy", {settings: {hasbalance: true, hassekhem: true}, advantages: {balance: {permanent: 5}, sekhem: {permanent: 8, temporary: 2}, willpower: {permanent: 5, temporary: 5}}},
    {flags: {mummy: {inWeb: false, dailyRegain: {k: "haven", sh: 6}}}});
  await UX.daily([m]);
  reset(); successes = 2;
  game.time.worldTime += 86400;
  await UX.daily([m]);
  assert.ok(m.system.advantages.sekhem.temporary > 3, `Ra's point and the meditation (${m.system.advantages.sekhem.temporary})`);
  assert.match(last().body, /rolled by itself/);
});

test("m1, m2: a mage draws Quintessence each day; the Crusade's Scourge clears when the days pass", async () => {
  const ZX = (await S("m20.js")).build({...ctx, observersOf: () => null, revealed: () => null, quiet: () => null});
  const g = actor("Odo", "Mage", {advantages: {arete: {permanent: 3}, willpower: {permanent: 5}}, quintessence: {temporary: 2}, paradox: {temporary: 4, permanent: 0}},
    {items: [{id: "av", type: "Feature", name: "Avatar", system: {value: 3}}], flags: {m20: {draws: {node: 0}}}});
  await ZX.shedAll([g]);
  game.time.worldTime += 86400;
  await ZX.shedAll([g]);
  assert.equal(g.system.quintessence.temporary, 5, "the Avatar's three");
  // the Crusade: the purifying days on the clock
  g.flags[MOD].m20.purifying = {since: game.time.worldTime, days: 2};
  const age = ZX.age; ZX.age = () => ({key: "crusade"});
  const P = await S("m20.js");
  ZX.age = age;
  // purifyAll runs only in the Crusade; call it through a build whose age is the Crusade
  settings.autoQuintessence = false;
  const wodxChron = game.modules.get("wodx-chronicle");
  wodxChron.api = {eras: {activeEra: () => ({profile: {id: "crusade"}}), currentYear: () => 1470}};
  const ZC = P.build({...ctx, observersOf: () => null, revealed: () => null, quiet: () => null});
  assert.equal(ZC.age().key, "crusade");
  {
    game.time.worldTime += 86400;
    await ZC.shedAll([g]);
    assert.equal(g.system.paradox.temporary, 4, "one day is not enough");
    game.time.worldTime += 86400;
    await ZC.shedAll([g]);
    assert.equal(g.system.paradox.temporary, 0);
    assert.equal(g.flags[MOD].m20.purifying, null);
  }
  delete settings.autoQuintessence;
});

test("g1, g2: rising on Rage and the day's meditation roll by themselves", async () => {
  const GX = await S("garou.js");
  const healed = [];
  game.wodxCombat = {healDamage: async (a, k, n) => { healed.push([k, n]); a.system.health.damage[k] -= n; }};
  const GA = GX.build({...ctx, rollPool: async () => ({successes: 2, botch: false, roll: null})});
  const wolf = actor("Grey Fang", "Werewolf", {advantages: {rage: {permanent: 4, temporary: 4}, gnosis: {permanent: 5, temporary: 1}, willpower: {permanent: 5, temporary: 5}}, health: {damage: {bashing: 0, lethal: 7, aggravated: 0}}, settings: {haspath: false}});
  await GA.remainActiveAuto(wolf);
  assert.ok(healed.length, "the wounds heal");
  assert.equal(wolf.getFlag(MOD, "remainedActive"), "sc1");
  healed.length = 0;
  await GA.remainActiveAuto(wolf);
  assert.equal(healed.length, 0, "once a scene");
  canvas.scene.id = "sc2";
  await wolf.setFlag(MOD, "noRiseRage", true);
  assert.equal(await GA.remainActiveAuto(wolf), null, "marked not to");
  // meditation: marked for two hours
  assert.ok(GX.isShifter(wolf));
  {
    await wolf.setFlag(MOD, "meditates", {hours: 2});
    const got = await GA.meditateDaily();
    assert.deepEqual(got, ["Grey Fang"]);
    assert.equal(await GA.meditateDaily().then(x => x.length), 0, "once a day");
  }
});
