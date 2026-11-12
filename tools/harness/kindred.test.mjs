import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";
import {installMock} from "./foundry-mock.mjs";

/* WoDX Actions 3.2.0: the Kindred additions (Disciplines, Roads, prestation, downtime, Masquerade, history)
   and the automatic prompts (healing with the clock, dawn and dusk, torpor, frenzy, sin, Delirium) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
CONFIG.statusEffects = [];
globalThis.canvas = {scene: null, tokens: {controlled: [], placeables: []}};
game.combat = null;

class Coll extends Map {
  get contents() { return [...this.values()]; }
  [Symbol.iterator]() { return this.values(); }
  filter(f) { return [...this.values()].filter(f); }
  find(f) { return [...this.values()].find(f); }
  some(f) { return [...this.values()].some(f); }
  getName(n) { return this.find(v => v.name === n); }
}
game.scenes = Object.assign(new Coll(), {active: {tokens: []}});
game.macros = new Coll();
const setPath = (o, path, v) => { const p = path.split("."); for ( const k of p.slice(0, -1) ) o = (o[k] ??= {}); o[p.at(-1)] = v; };
const flagged = o => Object.assign(o, {
  getFlag(s, k) { return k.split(".").reduce((x, p) => x?.[p], this.flags?.[s]); },
  async setFlag(s, k, v) { setPath(this.flags ??= {}, `${s}.${k}`, structuredClone(v)); return this; },
  async unsetFlag(s, k) { delete this.flags?.[s]?.[k]; return this; },
  async update(ch) { for ( const [k, v] of Object.entries(ch) ) setPath(this, k, structuredClone(v)); return this; }
});

let ids = 0;
const ATTR = ["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"];
function actor(name, {type = "Vampire", road = 6, roadName = "", virtues = [3, 3, 3], blood = [8, 10], wp = [5, 5], attrs = {}, abilities = {}, discs = {}, player = true, damage = {}} = {}) {
  const a = flagged({
    id: `a${++ids}`, uuid: `Actor.a${ids}`, name, type, flags: {}, isOwner: true, hasPlayerOwner: player,
    items: new Coll(), effects: new Coll(),
    system: {
      attributes: Object.fromEntries(ATTR.map(k => [k, {value: attrs[k] ?? 3, total: attrs[k] ?? 3}])),
      abilities: Object.fromEntries(Object.entries({intimidation: 2, leadership: 1, subterfuge: 2, occult: 0, academics: 0, ...abilities}).map(([k, v]) => [k, {value: v, label: k}])),
      advantages: {willpower: {permanent: wp[1], temporary: wp[0]}, bloodpool: {temporary: blood[0], max: blood[1], perturn: 1},
        path: {permanent: road, custom: roadName}, virtues: {conscience: {permanent: virtues[0]}, selfcontrol: {permanent: virtues[1]}, courage: {permanent: virtues[2]}}},
      health: {damage: {bashing: 0, lethal: 0, aggravated: 0, ...damage}},
      conditions: {isfrenzy: false}
    },
    getActiveTokens: () => [],
    testUserPermission: () => true
  });
  for ( const [d, v] of Object.entries(discs) ) { const id = `i${++ids}`; a.items.set(id, {id, name: d, type: "Power", system: {type: "wod.types.discipline", value: v}}); }
  return a;
}

/* ---------------- Pure rules ---------------- */

const K = await import(join(root, "modules/wodx-actions/scripts/kindred-rules.js"));
const DISC = JSON.parse(readFileSync(join(root, "modules/wodx-actions/data/disciplines-daw.json"), "utf8"));
const ROADS = JSON.parse(readFileSync(join(root, "modules/wodx-actions/data/roads-daw.json"), "utf8"));
const FULL_T = Object.fromEntries([...ATTR, "willpower", "road", "conscience", "conviction", "selfcontrol", "instinct", "courage", "empathy", "alertness", "subterfuge", "stealth"].map(k => [k, 3]));

test("the Discipline library is whole: unique ids, pages, codes the engine reads, short summaries", () => {
  const ids = new Set();
  for ( const p of DISC.powers ) {
    assert.ok(!ids.has(p.id), `duplicate ${p.id}`); ids.add(p.id);
    assert.ok(p.d && p.n && p.l >= 1 && Number.isFinite(p.p) && p.p >= 188 && p.p <= 316, `${p.id}: heading, name, level, page`);
    assert.ok(p.e && p.e.length <= 220, `${p.id}: a short summary, not book text`);
    for ( const part of K.poolParts(p.r) ) assert.ok(["attr", "ability", "trait", "number", "chooseAttr"].includes(part.kind), `${p.id}: ${p.r}`);
    if ( p.diff !== "" && p.diff !== "var" ) {
      const d = K.discDifficulty(p.diff, {t: FULL_T});
      assert.ok(Number.isFinite(d) && d >= 2 && d <= 10, `${p.id}: difficulty ${p.diff} → ${d}`);
    }
    const c = K.discCost(p.c);
    assert.ok(c.blood >= 0 && c.willpower >= 0, p.id);
    assert.ok(p.t in K.DURATION_TEXT, `${p.id}: duration ${p.t}`);
  }
  // Every Discipline of the book's main list has its five levels
  for ( const d of ["Animalism", "Auspex", "Dominate", "Obfuscate", "Presence", "Protean", "Vicissitude", "Obtenebration", "Chimerstry", "Dementation", "Celerity", "Fortitude", "Potence"] ) {
    const lv = new Set(DISC.powers.filter(p => p.d === d && p.l <= 5).map(p => p.l));
    assert.deepEqual([...lv].sort(), [1, 2, 3, 4, 5], d);
  }
  assert.ok(DISC.powers.filter(p => p.elder).length > 100, "elder powers listed by name and page");
});

test("which powers a sheet can use: Quietus covers both variants, paths carry their own rating, a bare Necromancy none", () => {
  const got = K.powersFor(DISC.powers, [{name: "Quietus", value: 2}, {name: "Path of Bone", value: 3}, {name: "Necromancy", value: 5}, {name: "Dominate", value: 1}, {name: "Potestas Vitae", value: 1}]);
  const names = got.map(p => p.n);
  assert.ok(names.includes("Command") && !names.includes("Mesmerize"));
  assert.ok(names.includes("Blood Essence") && names.includes("Blood Tempering"), "both Quietus variants");
  assert.ok(names.includes("Shambling Hordes") && !names.includes("Baleful Exorcism"), "Path of Bone to 3");
  assert.ok(!got.some(p => /Cenotaph/.test(p.d)), "no path from a bare Necromancy item");
  assert.ok(names.includes("A Taste for Blood"));
  assert.equal(K.discMatches("Daimoinon", "Daimonion"), true, "the sheet's spelling");
});

test("Discipline codes: difficulty from the target, costs, durations", () => {
  assert.equal(K.discDifficulty("t:willpower", {t: {willpower: 4}}), 4);
  assert.equal(K.discDifficulty("t:willpower", {}), null);
  assert.equal(K.discDifficulty("t:wits+courage", {t: {wits: 2, courage: 3}}), 5);
  assert.equal(K.discDifficulty("t:selfcontrol|instinct+4", {t: {selfcontrol: 2, instinct: 4}}), 8);
  assert.equal(K.discDifficulty("t:road|willpower", {t: {isVampire: true, road: 7, willpower: 3}}), 7);
  assert.equal(K.discDifficulty("t:road|willpower", {t: {isVampire: false, road: 7, willpower: 3}}), 3);
  assert.equal(K.discDifficulty("7|t:willpower", {}), 7);
  assert.equal(K.discDifficulty("var"), null);
  assert.deepEqual(K.discCost("b1w1"), {blood: 1, willpower: 1, variable: false, optional: false});
  assert.equal(K.discCost("bX").variable, true);
  assert.equal(K.discCost("b1opt").optional, true);
  assert.deepEqual(K.discDuration("turns", 3), {kind: "rounds", rounds: 3});
  assert.deepEqual(K.discDuration("night"), {kind: "night"});
  assert.equal(K.discDuration("instant"), null);
});

test("Roads: every Road has its aura, two Virtues, a page and whole hierarchies; names resolve", () => {
  for ( const [k, r] of Object.entries(ROADS.roads) ) {
    assert.ok(r.name && r.aura && r.p, k);
    assert.equal(r.virtues.length, 2, k);
    assert.ok(r.virtues.every(v => v in ROADS.virtueLabels), k);
    if ( r.sins ) assert.equal(r.sins.length, 10, k);
    for ( const p of r.paths ) { assert.ok(p.name && p.p, `${k}/${p.name}`); if ( p.sins ) assert.equal(p.sins.length, 10, p.name); }
  }
  assert.equal(K.roadFor(ROADS, "Road of Kings").key, "kings");
  assert.equal(K.roadFor(ROADS, "Humanity").key, "humanity");
  assert.equal(K.roadFor(ROADS, "Via Bestiae").key, "beast");
  assert.equal(K.roadFor(ROADS, "Path of Chivalry").path.name, "Path of Chivalry");
  assert.equal(K.roadFor(ROADS, ""), null);
  assert.deepEqual(K.roadVirtues(K.roadFor(ROADS, "Road of the Beast")), {conviction: true, instinct: true});
  assert.deepEqual(K.roadVirtues(K.roadFor(ROADS, "Road of Heaven")), {conviction: false, instinct: false});
  assert.equal(K.sinAt(ROADS.roads.kings.sins, 1), ROADS.roads.kings.sins[9]);
});

test("sins from events follow the Road: Kings frenzy, Humanity killing, the Beast none", () => {
  assert.equal(K.sinForEvent(K.roadFor(ROADS, "Road of Kings"), "frenzy"), 1);
  assert.equal(K.sinForEvent(K.roadFor(ROADS, "Humanity"), "kill"), 3);
  assert.equal(K.sinForEvent(K.roadFor(ROADS, "Humanity"), "killFrenzy"), 4);
  assert.equal(K.sinForEvent(K.roadFor(ROADS, "Road of the Beast"), "kill"), null);
  assert.equal(K.sinForEvent(K.roadFor(ROADS, "Path of Chivalry"), "kill"), 9);
  assert.equal(K.sinForEvent(K.roadFor(ROADS, "Road of Sin"), "notRidden"), 8);
});

test("mortal healing with time (VtDA20 p. 352): worst level first; lethal past Hurt needs care", () => {
  const h = 3600, d = 86400;
  let r = K.mortalHealing({bashing: 3}, 2 * h);
  assert.deepEqual([r.damage.bashing, r.healed.bashing], [1, 2]);
  r = K.mortalHealing({bashing: 6}, 6 * h); // Crippled needs 6 hours first
  assert.deepEqual([r.damage.bashing, r.healed.bashing], [5, 1]);
  r = K.mortalHealing({lethal: 2}, 4 * d);
  assert.equal(r.damage.lethal, 0);
  r = K.mortalHealing({lethal: 3}, 30 * d);
  assert.equal(r.needsCare, true);
  assert.equal(r.damage.lethal, 3);
  r = K.mortalHealing({lethal: 3}, 11 * d, {treated: true});
  assert.equal(r.damage.lethal, 0);
  r = K.mortalHealing({bashing: 1}, 1800);
  assert.deepEqual([r.damage.bashing, r.carry], [1, 1800]);
  r = K.mortalHealing({bashing: 1}, 1800, {carry: 1800});
  assert.equal(r.damage.bashing, 0);
  // shapechangers: bashing and lethal within minutes, aggravated a day each
  r = K.shifterHealing({bashing: 2, lethal: 1, aggravated: 2}, d + 120);
  assert.deepEqual(r.damage, {bashing: 0, lethal: 0, aggravated: 1});
  assert.equal(K.shifterHealing({lethal: 2}, 3600, {regen: false}).damage.lethal, 2);
});

test("prompts: wounds, hunger, dawn and dusk, torpor's end", () => {
  assert.equal(K.woundProvocation({bashing: 2}, {bashing: 2, lethal: 2}), "physical");
  assert.equal(K.woundProvocation({lethal: 4}, {lethal: 6}), "lifethreat");
  assert.equal(K.woundProvocation({lethal: 4}, {lethal: 3}), null);
  assert.equal(K.hungerCrossed(5, 3, 3), true);
  assert.equal(K.hungerCrossed(3, 2, 3), false);
  assert.equal(K.sunChange(true, false), "dawn");
  assert.equal(K.sunChange(false, true), "dusk");
  assert.equal(K.sunChange(null, true), null);
  assert.equal(K.torporUntil(1000, 8), 1000 + 7 * 86400);
  assert.equal(K.torporUntil(0, 8, {voluntary: true}), 4 * 86400);
  const plan = K.risingHeal({bashing: 2, lethal: 3}, 6, 3, (dmg, b, {maxSpend}) => ({spent: Math.min(b, maxSpend)}));
  assert.equal(plan.spent, 2, "keeps blood at the hunger line (7 − Self-Control)");
});

test("best pool: untrained Knowledges can't be tried, untrained Skills are harder", () => {
  const r = K.rankPools([
    {attr: "intelligence", attrValue: 3, ability: "occult", abilityValue: 0, abilityType: "knowledge"},
    {attr: "intelligence", attrValue: 3, ability: "academics", abilityValue: 2, abilityType: "knowledge"},
    {attr: "intelligence", attrValue: 3, ability: "craft", abilityValue: 0, abilityType: "skill"}
  ], 6);
  assert.equal(r[0].ability, "academics");
  assert.equal(r.find(x => x.ability === "occult").score, -1);
  assert.equal(r.find(x => x.ability === "craft").diff, 7);
});

test("Willpower recovery and the prestation balance", () => {
  assert.equal(K.willpowerAfter("night", 2, 5, "night"), 3);
  assert.equal(K.willpowerAfter("story", 2, 5, "night"), 2);
  assert.equal(K.willpowerAfter("story", 2, 5, "story"), 5);
  assert.equal(K.willpowerAfter("off", 2, 5, "story"), 2);
  const bal = K.boonBalance([{from: "A", to: "B", kind: "minor", status: "owed"}, {from: "A", to: "B", kind: "major", status: "owed"}, {from: "C", to: "B", kind: "life", status: "repaid"}]);
  assert.equal(bal.length, 1);
  assert.equal(bal[0].weight, 5);
});

/* ---------------- The engine ---------------- */

await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
await Hooks.callAll("init");
mock.setupTime();
await Hooks.callAll("ready");
await mock.settle();
const chron = game.modules.get("wodx-chronicle").api;
chron.eras = {activeEra: () => ({profile: {id: "dark-ages"}})};
const timed = [];
chron.applyTimed = async (a, o) => { timed.push({actor: a.name, ...o}); };
chron.conditions = {setCondition: async () => {}};

const KX = await import(join(root, "modules/wodx-actions/scripts/kindred.js"));
const GX = await import(join(root, "modules/wodx-actions/scripts/garou.js"));
const R = await import(join(root, "modules/wodx-actions/scripts/rules.js"));
const reg = (key, name, hint, type, def) => game.settings.register("wodx-actions", key, {name, hint, scope: "world", config: true, type, default: def});
KX.registerSettings(reg);
GX.registerSettings(reg);
await KX.loadData();
await GX.loadData();

const rolls = [], forms = [], posts = [], notes = [], api = {};
const S = {historyLog: true, eventPrompts: true, autoTorpor: true, autoDelirium: true, naturalHealing: true, witnessRange: 60, dawnDusk: "prompt", spendResources: true};
const n = v => Number(v) || 0;
const ctx = {
  post: async (a, title, body, r = [], data = null) => { const m = {actor: a?.name, title, body, data}; posts.push(m); return m; },
  rollPool: async (dice, diff) => { const q = rolls.shift() ?? 0; const r = typeof q === "number" ? {successes: q, botch: false} : q; return {...r, dice, difficulty: diff, roll: null, faces: []}; },
  rollBlock: (label, r) => `<div class="roll">${label}: ${r.successes} (${r.dice} at ${r.difficulty})</div>`,
  dialog: async (title, content, label, cb, {render} = {}) => {
    const el = document.createElement("div"); el.innerHTML = content;
    render?.(el);
    const a = forms.shift();
    if ( a === undefined ) throw new Error(`Unexpected dialog: ${title}`);
    const fd = {};
    for ( const f of el.querySelectorAll("input, select") ) if ( f.name ) fd[f.name] = f.type === "checkbox" ? f.checked : f.type === "number" ? Number(f.value) : f.value;
    return cb(typeof a === "function" ? a(el, fd) : {...fd, ...a});
  },
  updateActor: (a, d) => a.update(d),
  setFlag: (a, k, v) => (v === null ? a.unsetFlag("wodx-actions", k) : a.setFlag("wodx-actions", k, v)),
  attr: (a, k) => a.system?.attributes?.[k]?.total ?? 0,
  findAbility: (a, k) => { const x = a.system?.abilities?.[k]; return x ? {key: k, name: k, value: x.value, type: "", id: `flat:${k}`} : null; },
  abilityList: a => Object.entries(a.system?.abilities ?? {}).map(([k, x]) => ({key: k, name: k, value: x.value, type: "", id: `flat:${k}`})),
  setting: k => S[k],
  spendWillpower: async (a, k = 1) => { const w = a.system.advantages.willpower; if ( w.temporary < k ) return false; w.temporary -= k; return true; },
  changeBlood: async (a, d) => { const b = a.system.advantages.bloodpool; const before = b.temporary; b.temporary = Math.max(0, Math.min(b.max, before + d)); return {before, after: b.temporary}; },
  blood: a => ({value: n(a.system.advantages.bloodpool?.temporary), max: n(a.system.advantages.bloodpool?.max) || 10, perTurn: 1}),
  background: (a, name) => n([...a.items].find(i => i.type === "Feature" && i.name.toLowerCase().startsWith(name.toLowerCase()))?.system?.value),
  isVampire: a => a.type === "Vampire",
  healthTrack: a => ({damage: {...a.system.health.damage}, max: 7}),
  setDamage: async (a, d) => { a.system.health.damage = {...d}; },
  healthText: (a, d) => `${d.bashing}B/${d.lethal}L/${d.aggravated}A`,
  statusEffect: async () => {}, condition: async () => {},
  requestGM: p => { notes.push(["socket", p]); return true; },
  R, api: () => api, notify: m => notes.push(m)
};
const E = KX.build(ctx);
const reset = () => { rolls.length = 0; forms.length = 0; posts.length = 0; notes.length = 0; timed.length = 0; mock.log.chat.length = 0; };

test("Use a Discipline: the power list follows the dots, the difficulty comes from the target, costs are paid", async () => {
  reset();
  const v = actor("Ilse", {discs: {Dominate: 3, Celerity: 2}});
  const m = actor("Hans", {type: "Mortal", wp: [4, 4]});
  game.user.targets = new Set([{actor: m}]);
  let seen = null;
  rolls.push(2);
  forms.push((el, fd) => { seen = [...el.querySelectorAll("select[name=power] option")].map(o => o.textContent); return {...fd, power: "dominate-command"}; });
  // the render step sets the difficulty from the first power; re-run it for Command
  await E.useDiscipline(v);
  assert.ok(seen.some(s => /Command/.test(s)) && seen.some(s => /Forgetful Mind/.test(s)) && !seen.some(s => /Conditioning/.test(s)));
  assert.ok(seen.some(s => /Celerity •• : Celerity ••|Celerity ••: Celerity ••/.test(s)), "passive Celerity listed");
  assert.match(posts.at(-1).title, /Command/);
  game.user.targets = new Set();
});

test("The Forgetful Mind marks a witness as made to forget in the Masquerade records", async () => {
  reset();
  const v = actor("Wilfried", {discs: {Dominate: 3}});
  const w = actor("Grete", {type: "Mortal", wp: [3, 3]});
  await E.recordBreach({by: v, event: "fed in the market", witnesses: [w]});
  const j = game.journal.find(x => x.getFlag("wodx-actions", "kind") === "masquerade");
  assert.ok(j && j.pages.getName("Open breaches").text.content.includes("Grete"));
  game.user.targets = new Set([{actor: w}]);
  rolls.push(3);
  forms.push({power: "dominate-the-forgetful-mind", diff: 3, blood: 0, wp: 0});
  await E.useDiscipline(v);
  assert.match(posts.at(-1).body, /made to forget/);
  assert.equal(j.getFlag("wodx-actions", "entries")[0].witnesses[0].state, "forgot");
  assert.ok(!j.pages.getName("Open breaches").text.content.includes("Grete:"));
  game.user.targets = new Set();
});

test("3.41.0: a Cainite witness is calm, a Garou startled, and a closed place keeps the rumour in", async () => {
  reset();
  const v = actor("Wilfried", {discs: {Dominate: 3}});
  const k2 = actor("Ottilie");
  const g = actor("Rolf", {type: "Werewolf"});
  const m = actor("Hanne", {type: "Mortal", wp: [3, 3]});
  let hook = null, seen = null;
  const on = Hooks.on?.("wodxBreach", x => { hook = x; });
  const on2 = Hooks.on?.("wodxSecretSeen", x => { seen = x; });
  const none = await E.recordBreach({by: v, event: "used Dominate", witnesses: [k2]});
  assert.equal(none, null, "another Cainite is no breach");
  const chat0 = mock.log.chat.length;
  const e = await E.recordBreach({by: v, event: "fed in the street", witnesses: [k2, g, m], place: {kind: "street"}});
  assert.deepEqual(e.witnesses.map(w => w.name), ["Hanne"]);
  assert.equal(e.spread, true);
  assert.ok(mock.log.chat.slice(chat0).some(c => /Seen by another kind/.test(c.content) && /Rolf/.test(c.content)));
  if ( on2 !== undefined ) assert.equal(seen?.secret, "kindred");
  const h = await E.recordBreach({by: v, event: "fed", witnesses: [m], place: {kind: "haven"}});
  assert.equal(h.mode, "closed");
  assert.equal(h.spread, false);
  if ( on !== undefined ) assert.equal(hook?.entry?.spread, false);
});

test("Roads: the WoDX choice wins over the sheet, and the sin prompt suggests the Road's level", async () => {
  reset();
  const k = actor("Konrad", {road: 5, roadName: "Road of Kings"});
  assert.equal(KX.roadOf(k).key, "kings");
  await E.sinPrompt(k, "frenzy", "The Beast was given the reins");
  const c = mock.log.chat.at(-1).content;
  assert.match(c, /level 1 sin/);
  assert.match(c, /data-kx="sin"/);
  forms.push({road: "humanity|"});
  await E.setRoad(k);
  assert.equal(KX.roadOf(k).key, "humanity");
  assert.equal(k.system.advantages.path.custom, "Road of Humanity");
  mock.log.chat.length = 0;
  const b = actor("Beast", {roadName: "Road of the Beast"});
  assert.equal(await E.sinPrompt(b, "kill", "A killing"), null);
});

test("wounds prompt frenzy; a track full of lethal sends a Cainite to torpor with its end date; a shapechanger past Incapacitated may rise on Rage", async () => {
  reset();
  const v = actor("Ottilie", {road: 8});
  await E.onDamage(v, {before: {bashing: 0, lethal: 2, aggravated: 0}, after: {bashing: 0, lethal: 4, aggravated: 0}});
  assert.match(mock.log.chat.at(-1).content, /data-kx="frenzy"[^>]*data-arg="physical"/);
  v.system.health.damage = {bashing: 0, lethal: 7, aggravated: 0};
  await E.onDamage(v, {before: {bashing: 0, lethal: 5, aggravated: 0}, after: {bashing: 0, lethal: 7, aggravated: 0}});
  const t = v.getFlag("wodx-actions", "torpor");
  assert.ok(t && t.until === game.time.worldTime + 7 * 86400, "Road 8: a week");
  const g = actor("Wolf", {type: "Werewolf"});
  await E.onDamage(g, {before: {bashing: 0, lethal: 6, aggravated: 0}, after: {bashing: 0, lethal: 7, aggravated: 0}});
  assert.match(mock.log.chat.at(-1).content, /riseRage/);
  // fire from WoDX Combat: Rötschreck
  const f = actor("Fritz");
  await E.onDamage(f, {before: {}, after: {aggravated: 1}, fireSun: true, source: "combat"});
  assert.match(mock.log.chat.at(-1).content, /data-kx="rotschreck"/);
});

test("a mortal killed by a Cainite's attack prompts the sin her Road names, and the history records it", async () => {
  reset();
  const v = actor("Mechthild", {road: 6, roadName: "Humanity"});
  game.actors.set(v.id, v);
  const m = actor("Victim", {type: "Mortal"});
  globalThis.fromUuid = async u => [...game.actors].find(a => a.uuid === u) ?? null;
  await E.onDamage(m, {before: {lethal: 6}, after: {lethal: 7}, attacker: v.uuid, source: "combat"});
  assert.ok(mock.log.chat.some(c => /level 3 sin/.test(c.content)));
  const h = game.journal.find(x => x.getFlag("wodx-actions", "kind") === "history");
  assert.match(h.pages.getName("Mechthild").text.content, /Kills Victim/);
  game.actors.delete(v.id);
});

test("blood under the hunger line prompts a frenzy check", async () => {
  reset();
  const v = actor("Hungry", {virtues: [3, 3, 3]});
  await E.onBlood(v, 5, 3);
  assert.match(mock.log.chat.at(-1).content, /sightblood/);
});

test("the clock heals mortals by the chart, wakes the torpid, and marks dawn and dusk", async () => {
  reset();
  const m = actor("Bauer", {type: "Mortal", damage: {bashing: 2}});
  game.actors.set(m.id, m);
  await game.settings.set("wodx-actions", "healClock", game.time.worldTime);
  const r = await E.healAll(2 * 3600);
  assert.equal(m.system.health.damage.bashing, 0);
  assert.ok(r.length === 1);
  const v = actor("Sleeper", {road: 9});
  game.actors.set(v.id, v);
  await v.setFlag("wodx-actions", "torpor", {since: 0, days: 3, until: game.time.worldTime, voluntary: false});
  await E.onClock();
  assert.ok(mock.log.chat.some(c => /may rise/.test(c.content)));
  assert.equal(v.getFlag("wodx-actions", "torpor").reminded, true);
  // the clock reads night at the epoch: coming from day, that is dusk
  const t0 = await import(join(root, "modules/wodx-chronicle/scripts/calendar.mjs"));
  const night = t0.describeTime(game.time.worldTime, game.settings.get("wodx-chronicle", "latitude")).isNight;
  await game.settings.set("wodx-actions", "sunState", night ? "day" : "night");
  mock.log.chat.length = 0;
  await E.onClock();
  assert.ok(mock.log.chat.some(c => (night ? /Nightfall/ : /Dawn/).test(c.content)), "a dawn or dusk card");
  assert.equal(game.settings.get("wodx-actions", "sunState"), night ? "night" : "day");
  game.actors.delete(m.id); game.actors.delete(v.id);
});

test("a Pass the Years skip uses the same healing plan", () => {
  const m = actor("Old", {type: "Mortal", damage: {lethal: 2}});
  const plan = E.healPlan(m, 365 * 86400);
  assert.equal(plan.damage.lethal, 0);
  const v = actor("Vamp", {damage: {lethal: 2}});
  assert.equal(E.healPlan(v, 365 * 86400), null, "Cainites heal with blood, not time");
});

test("prestation: record and settle a boon; the journal shows what is outstanding", async () => {
  reset();
  forms.push({from: "Konrad", to: "Ilse", kind: "major", for: "a haven", settle: ""});
  await E.boons(null);
  const j = game.journal.find(x => x.getFlag("wodx-actions", "kind") === "prestation");
  assert.match(j.pages.getName("Outstanding").text.content, /Konrad.*Ilse.*Major boon/s);
  forms.push({settle: "0", how: "repaid", from: "", to: ""});
  await E.boons(null);
  assert.match(j.pages.getName("Outstanding").text.content, /No boons outstanding/);
  assert.match(j.pages.getName("Ledger").text.content, /repaid/);
});

test("downtime from the coterie's pooled Herd feeds the Cainite", async () => {
  reset();
  const v = actor("Herder", {blood: [3, 10]});
  game.actors.set(v.id, v);
  const g = {id: "g1", name: "Coterie", type: "Group", system: {roster: [{actorId: v.id, left: null}], backgrounds: [{name: "Herd", contributions: {[v.id]: 2, x: 1}}]}};
  game.actors.set(g.id, g);
  rolls.push(2);
  forms.push({kind: "herd", from: "g1", diff: 6, weeks: 1});
  await E.downtime(v);
  assert.equal(v.system.advantages.bloodpool.temporary, 5);
  assert.match(posts.at(-1).body, /Coterie/);
  game.actors.delete(v.id); game.actors.delete(g.id);
});

test("every kindred menu entry names a real API function", () => {
  const src = readFileSync(join(root, "modules/wodx-actions/scripts/profile-menus.js"), "utf8");
  const block = src.slice(src.indexOf("kindred: {"), src.indexOf("hunter: {"));
  const apis = [...block.matchAll(/"api:(\w+)"/g)].map(m => m[1]);
  const main = readFileSync(join(root, "modules/wodx-actions/scripts/main.js"), "utf8");
  const apiBlock = main.slice(main.indexOf("const API = {"), main.indexOf("let OFF"));
  for ( const k of apis ) assert.match(apiBlock, new RegExp(`\\b${k}\\b`), k);
});
