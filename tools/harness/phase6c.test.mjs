import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";
import {installMock} from "./foundry-mock.mjs";

/* Phase 6c: WoDX Actions 3.4.0 (wraiths, hunters, True Faith, Numina) and WoDX Combat 3.6.0 (the Corpus track) */

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
  map(f) { return [...this.values()].map(f); }
  getName(n) { return this.find(v => v.name === n); }
}
game.scenes = Object.assign(new Coll(), {active: {tokens: []}});
const setPath = (o, path, v) => { const p = path.split("."); for ( const k of p.slice(0, -1) ) o = (o[k] ??= {}); o[p.at(-1)] = v; };
const flagged = o => Object.assign(o, {
  getFlag(s, k) { return k.split(".").reduce((x, p) => x?.[p], this.flags?.[s]); },
  async setFlag(s, k, v) { setPath(this.flags ??= {}, `${s}.${k}`, structuredClone(v)); return this; },
  async unsetFlag(s, k) { delete this.flags?.[s]?.[k]; return this; },
  async update(ch) { for ( const [k, v] of Object.entries(ch) ) setPath(this, k, structuredClone(v)); return this; }
});
let ids = 0;
const ATTR = ["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"];
function actor(name, {type = "Mortal", wp = [5, 5], attrs = {}, abilities = {}, virtues = [3, 3, 3], adv = {}, items = [], corpus = null} = {}) {
  const a = flagged({
    id: `a${++ids}`, uuid: `Actor.a${ids}`, name, type, flags: {}, isOwner: true, hasPlayerOwner: true,
    items: new Coll(), effects: new Coll(),
    system: {
      attributes: Object.fromEntries(ATTR.map(k => [k, {value: attrs[k] ?? 3, total: attrs[k] ?? 3}])),
      abilities: Object.fromEntries(Object.entries({empathy: 2, occult: 2, awareness: 1, medicine: 1, ...abilities}).map(([k, v]) => [k, {value: v, label: k}])),
      advantages: {willpower: {permanent: wp[1], temporary: wp[0]}, virtues: {conscience: {permanent: virtues[0]}, selfcontrol: {permanent: virtues[1]}, courage: {permanent: virtues[2]}}, ...adv},
      health: {damage: {bashing: 0, lethal: 0, aggravated: 0, ...(corpus ? {corpus} : {})}},
      settings: {}
    },
    getActiveTokens: () => [],
    testUserPermission: () => true
  });
  for ( const it of items ) { const id = `i${++ids}`; a.items.set(id, flagged({id, ...it, system: {...it.system}})); }
  return a;
}

const WR = await import(join(root, "modules/wodx-actions/scripts/wraith-rules.js"));
const HR = await import(join(root, "modules/wodx-actions/scripts/hunter-rules.js"));
const ARC = JSON.parse(readFileSync(join(root, "modules/wodx-actions/data/arcanoi-w20.json"), "utf8"));
const WD = JSON.parse(readFileSync(join(root, "modules/wodx-actions/data/wraith-w20.json"), "utf8"));

/* ---------------- Pure rules: wraiths ---------------- */

test("the Shroud: 4 to 10, lowered near the supernatural, by Hysteria (at most 3) and by a Haunt", () => {
  assert.equal(WR.shroudRating({}), 7);
  assert.equal(WR.shroudRating({base: 8, supernatural: true, hysteria: 5}), 4);
  assert.equal(WR.shroudRating({base: 10, haunt: 2}), 8);
  assert.equal(WR.shroudRating({base: 2}), 4);
});

test("an art's difficulty: the Shroud across, the target's traits, the realm for Outrage and Pandemonium", () => {
  assert.equal(WR.arcanosDifficulty("shroud", {shroud: 8}), 8);
  assert.equal(WR.arcanosDifficulty("t:willpower", {t: {willpower: 7}}), 7);
  assert.equal(WR.arcanosDifficulty("t:willpower", {}), null, "needs a target");
  assert.equal(WR.arcanosDifficulty("side:6", {realm: "across", shroud: 9}), 9);
  assert.equal(WR.arcanosDifficulty("side:6", {realm: "shadowlands"}), 6);
  assert.equal(WR.arcanosDifficulty("self:6", {onSelf: true}), 6);
  assert.equal(WR.arcanosDifficulty("self:6", {t: {willpower: 5}, realm: "across", shroud: 8}), 8);
  assert.equal(WR.arcanosDifficulty("realm:7", {realm: "labyrinth"}), 5);
  assert.equal(WR.arcanosDifficulty("realm:7", {realm: "tempest"}), 6);
  assert.equal(WR.arcanosDifficulty("own:stamina+3", {own: {stamina: 3}}), 6);
  assert.equal(WR.realmAngst("Outrage", "labyrinth"), 1);
  assert.equal(WR.realmAngst("Pandemonium", "tempest", [1, 1, 7]), 2);
  assert.equal(WR.realmAngst("Pandemonium", "shadowlands", [1]), 0);
});

test("the Arcanoi library: every art has a known Arcanos, a page, a pool and cost the rules can read", () => {
  assert.ok(ARC.arts.length >= 150, `${ARC.arts.length}`);
  for ( const a of ARC.arts ) {
    assert.ok(a.id && a.d && a.n && a.p, JSON.stringify(a));
    assert.ok(a.l >= 1 && a.l <= 5, a.n);
    const c = WR.artCost(a.c);
    assert.ok(c.pathos >= 0 && c.corpus >= 0 && c.willpower >= 0, a.n);
    if ( a.r ) assert.ok(ATTR.includes(a.r.split("+")[0]), `${a.n}: ${a.r}`);
    const d = WR.arcanosDifficulty(a.diff, {t: {willpower: 6, angst: 4, pathos: 5, corpus: 8, stamina: 3}, own: {angst: 3, stamina: 3}, shroud: 7});
    assert.ok(d === null || (d >= 2 && d <= 10), `${a.n}: ${a.diff} → ${d}`);
  }
  const list = WR.artsFor(ARC.arts, [{name: "Argos", value: 2}]);
  assert.ok(list.length > 0 && list.every(a => a.d === "Argos" && a.l <= 2));
  assert.deepEqual(WR.artCost("p1c1w1"), {pathos: 1, corpus: 1, willpower: 1, variable: false});
  assert.equal(WR.artCost("pX").variable, true);
});

test("Passions, Fetters, neglect and Resolution", () => {
  assert.equal(WR.gainUpTo(8, 4, 10), 10);
  assert.equal(WR.gainUpTo(12, 2, 10), 12, "Pathos above 10 (after the Caul) isn't cut down");
  assert.deepEqual(WR.neglectResult(1, {successes: 0, botch: false}), {after: 0, drop: 1, harrowing: true});
  assert.deepEqual(WR.neglectResult(3, {successes: 0, botch: true}), {after: 1, drop: 2, harrowing: false});
  assert.equal(WR.neglectResult(3, {successes: 1, botch: false}).drop, 0);
  assert.deepEqual(WR.resolution(4, 4), {difficulty: 8, need: 4, resolved: true});
  assert.equal(WR.fetterDifficulty("slumber"), 4);
});

test("Corpus: Pathos heals lethal first, then two bashing a point; aggravated takes 3 Pathos and 8 hours; the states", () => {
  const p = WR.pathosHealing({bashing: 3, lethal: 2, aggravated: 1}, 3);
  assert.deepEqual(p.after, {bashing: 1, lethal: 0, aggravated: 1});
  assert.equal(p.spent, 3);
  const g = WR.pathosHealing({bashing: 0, lethal: 0, aggravated: 2}, 4, {aggravated: true});
  assert.deepEqual(g.after.aggravated, 1); assert.equal(g.spent, 3); assert.equal(g.hours, 8);
  assert.equal(WR.corpusRest({bashing: 3, lethal: 1, aggravated: 0}, 2).bashing, 1);
  assert.equal(WR.corpusState({bashing: 10, lethal: 0, aggravated: 0}, 10), "wavering");
  assert.equal(WR.corpusState({bashing: 2, lethal: 7, aggravated: 1}, 10), "harrowed");
  assert.equal(WR.corpusState({bashing: 2, lethal: 0, aggravated: 0}, 10), "corporeal");
});

test("the Shadow: starting Angst, Catharsis, Shadow Dice, Dark Passions; Harrowings and the Caul", () => {
  assert.equal(WR.startingAngst([1, 1, 2, 3]), 1);
  assert.equal(WR.startingAngst([6, 7, 1, 1, 10]), 3, "ones don't cancel");
  assert.equal(WR.catharsisReady(6, 5), true);
  assert.equal(WR.catharsis(3, 3), "psyche", "a tie keeps the Psyche");
  assert.deepEqual(WR.shadowDice(7, [1, 4, 1, 9, 1, 1]), {dice: 5, angst: 3});
  assert.equal(WR.darkPassionDifficulty(true), 9);
  assert.equal(WR.escapeDifficulty(5), 7);
  assert.match(WR.harrowingLoss("destruction"), /Spectre|Oblivion/);
  assert.equal(WR.reaperDifficulty(8), 2);
  assert.equal(WR.reaperPathos(3), 5);
  assert.ok(WD.thorns.length >= 20 && WD.thorns.every(t => t.id && t.n && t.p));
});

/* ---------------- Pure rules: hunters ---------------- */

test("which hunter rules an era uses (B42)", () => {
  assert.equal(HR.hunterLine("dark-ages"), "inquisitor");
  assert.equal(HR.hunterLine("victorian"), "hh2");
  assert.equal(HR.hunterLine("great-war"), "hh2");
  assert.equal(HR.hunterLine("modern", 1995), "hh2");
  assert.equal(HR.hunterLine("modern", 1999), "reckoning");
  assert.equal(HR.hunterLine("time-of-judgment"), "reckoning");
  assert.equal(HR.faithRules("dark-ages"), "da20");
  assert.equal(HR.faithRules("modern"), "hh2");
});

test("the inquisitor: starting traits, stage, Callousness, the Hierarchy of Sins against God", () => {
  const s = HR.inquisitorStart({conscience: 3, selfcontrol: 2, courage: 4}, {faith: 1, wisdom: 0, zeal: 1}, "faith");
  assert.deepEqual(s, {conviction: 4, piety: 5, willpower: 5});
  assert.equal(HR.stageOf({faith: 0, wisdom: 0, zeal: 0}), "servant");
  assert.equal(HR.stageOf({faith: 2, wisdom: 2, zeal: 1}), "advocate");
  assert.equal(HR.stageOf({faith: 5, wisdom: 3, zeal: 2}), "judge");
  assert.equal(HR.callous(6, 5), true);
  assert.equal(HR.callous(5, 5), false);
  assert.equal(HR.PIETY_SINS.length, 10);
  assert.equal(HR.pietyAt(5, 6), false);
  assert.equal(HR.pietyAt(5, 3), true);
  assert.equal(HR.pietyRoll({callous: true}).difficulty, 7);
  assert.deepEqual(HR.pietyResult({successes: 1, botch: false}), {conviction: -1, piety: 0, curse: false});
  assert.deepEqual(HR.pietyResult({successes: 0, botch: false}), {conviction: 0, piety: -1, curse: false});
  assert.equal(HR.pietyResult({successes: 0, botch: true}).curse, true);
});

test("Conviction: risked, won by victory and prayer (never above Piety), a new story, terror", () => {
  assert.deepEqual(HR.riskConviction(3, {successes: 2, botch: false}, 3), {dice: 3, after: 4});
  assert.equal(HR.riskConviction(2, {successes: 0, botch: false}, 4).after, 2);
  assert.equal(HR.riskConviction(2, {successes: 0, botch: true}, 4).after, 0);
  assert.equal(HR.riskConviction(5, {successes: 1, botch: false}, 4).dice, 3, "at most 3");
  assert.equal(HR.victoryDelta({successes: 0, botch: true}), -1);
  assert.equal(HR.prayerDifficulty(1, 0), 7);
  assert.equal(HR.prayerDifficulty(6, 0), 3);
  assert.equal(HR.prayerDifficulty(1, 5), 10);
  assert.equal(HR.convictionGain(4, 5, 6), 6, "prayer stops at Piety");
  assert.equal(HR.convictionGain(7, 2, 6), 7, "it never pushes her down either");
  assert.equal(HR.newStoryConviction(2, 3, 1), 4);
  assert.equal(HR.terrorDifficulty("supernatural", 3), 5);
  assert.deepEqual(HR.terrorResult("supernatural", {successes: 0, botch: false}), {flee: false, penalty: 2});
  assert.equal(HR.terrorResult("danger", {successes: 0, botch: true}).flee, true);
  assert.equal(HR.CASH_IN.advocate, 25);
});

test("True Faith by era: the powers, repelling, resisting (Dark Ages: Faith off the successes, doubled against Daimoinon)", () => {
  assert.equal(HR.faithPowers("da20", 3).length, 4);
  assert.equal(HR.faithResist("da20", 2, 5), 3);
  assert.equal(HR.faithResist("da20", 2, 5, {daimoinon: true}), 1);
  assert.equal(HR.faithResist("hh2", 2, 5, {faithSuccesses: 4}), 1);
  assert.equal(HR.repelResult("da20", {successes: 2, botch: false}).flee, 2);
  assert.equal(HR.repelResult("hh2", {successes: 0, botch: false}).held, true);
  assert.equal(HR.numinaFor("Psychic Healing"), null);
  assert.equal(HR.numinaFor("Telekinesis"), "telekinesis");
  assert.equal(HR.numinaFor("Hedge Magic: Healing"), null, "named by its path");
  assert.equal(HR.numinaFor("Healing"), "healing");
  for ( const [k, v] of Object.entries(HR.NUMINA) ) { assert.equal(v.levels.length, 5, k); assert.equal(v.pool.length, 2, k); }
});

/* ---------------- The engines ---------------- */

await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
await Hooks.callAll("init");
mock.setupTime();
await Hooks.callAll("ready");
await mock.settle();
const chron = game.modules.get("wodx-chronicle").api;
let era = {id: "dark-ages"}, year = 1230;
chron.eras = {activeEra: () => ({profile: era}), currentYear: () => year};

const WX = await import(join(root, "modules/wodx-actions/scripts/wraith.js"));
const HX = await import(join(root, "modules/wodx-actions/scripts/hunter.js"));
const P = await import(join(root, "modules/wodx-actions/scripts/profiles.js"));
WX.registerSettings();
HX.registerSettings();
await WX.loadData();

const n = v => Number(v) || 0;
const rolls = [], forms = [], posts = [], notes = [];
const S = {eventPrompts: true};
const ctx = {
  post: async (a, title, body, r = []) => { const m = {actor: a?.name, title, body}; posts.push(m); return m; },
  rollPool: async (dice, diff, o = {}) => { const q = rolls.shift() ?? 0; const r = typeof q === "number" ? {successes: q + (o.willpower ? 1 : 0), botch: false, faces: []} : {faces: [], ...q}; return {...r, dice, difficulty: diff, roll: null}; },
  rollBlock: (label, r) => `<div class="roll">${label}: ${r.successes} (${r.dice} at ${r.difficulty})</div>`,
  dialog: async (title, content, label, cb, {render} = {}) => {
    const el = document.createElement("div"); el.innerHTML = content;
    render?.(el);
    const a = forms.shift();
    if ( a === undefined ) throw new Error(`Unexpected dialog: ${title}`);
    const fd = {};
    for ( const f of el.querySelectorAll("input, select, textarea") ) if ( f.name ) fd[f.name] = f.type === "checkbox" ? f.checked : f.type === "number" ? Number(f.value) : f.value;
    return cb(typeof a === "function" ? a(el, fd) : {...fd, ...a});
  },
  updateActor: (a, d) => a.update(d),
  setFlag: (a, k, v) => (v === null ? a.unsetFlag("wodx-actions", k) : a.setFlag("wodx-actions", k, v)),
  attr: (a, k) => a.system?.attributes?.[k]?.total ?? 0,
  findAbility: (a, k) => { const x = a.system?.abilities?.[k]; return x ? {key: k, name: k, value: x.value} : null; },
  abilityList: a => Object.entries(a.system?.abilities ?? {}).map(([k, x]) => ({key: k, name: k, value: x.value})),
  setting: k => S[k],
  spendWillpower: async (a, k = 1) => { const w = a.system.advantages.willpower; if ( w.temporary < k ) return false; w.temporary -= k; return true; },
  applyDamage: async (a, type, k) => { a.system.health.damage[type] += k; return {}; },
  setDamage: async (a, d) => { Object.assign(a.system.health.damage, d); },
  background: (a, name) => n([...a.items].find(i => i.type === "Feature" && i.name.toLowerCase().startsWith(name.toLowerCase()))?.system?.value),
  virtues: a => { const v = a.system.advantages.virtues; return {conscience: {value: v.conscience.permanent}, selfcontrol: {value: v.selfcontrol.permanent}, courage: {value: v.courage.permanent}}; },
  logEvent: async () => {},
  notify: m => notes.push(m)
};
const W = WX.build(ctx);
const Hn = HX.build(ctx);
const reset = () => { rolls.length = 0; forms.length = 0; posts.length = 0; notes.length = 0; mock.log.chat.length = 0; };

function wraith(name, o = {}) {
  return actor(name, {type: "Wraith", adv: {pathos: {temporary: 4, max: 10}, angst: {temporary: 3, permanent: 4, max: 10}, corpus: {temporary: 10, permanent: 10, max: 10}}, corpus: {bashing: 0, lethal: 0, aggravated: 0},
    items: [{name: "Argos", type: "Power", system: {type: "wod.types.arcanoi", value: 3}}, {name: "Protect my daughter", type: "Trait", system: {type: "wod.types.passion", value: 4}},
      {name: "My wedding ring", type: "Trait", system: {type: "wod.types.fetter", value: 3}}, {name: "Memoriam", type: "Feature", system: {type: "wod.types.background", value: 2}},
      {name: "Eidolon", type: "Feature", system: {type: "wod.types.background", value: 2}}], ...o});
}

test("a wraith's sheet is read: Corpus track, Pathos, Angst, Passions, Fetters, Arcanoi, Backgrounds", () => {
  const w = wraith("Ada");
  assert.equal(P.detectProfile(w), "wraith");
  const i = WX.info(w);
  assert.equal(i.corpus.max, 10); assert.equal(i.pathos.temp, 4); assert.equal(i.angst.perm, 4);
  assert.equal(i.passions[0].value, 4); assert.equal(i.fetters[0].value, 3); assert.equal(i.arcanoi[0].value, 3);
  assert.equal(i.memoriam, 2); assert.equal(i.eidolon, 2); assert.equal(i.hasCorpusTrack, true);
});

test("Use an Arcanos: the arts follow the rating, Pathos is paid, Corpus costs go on the Corpus track", async () => {
  reset();
  const w = wraith("Ada");
  const arts = WR.artsFor(ARC.arts, [{name: "Argos", value: 3}]);
  const withCorpus = arts.find(a => WR.artCost(a.c).pathos >= 1) ?? arts[0];
  forms.push({art: withCorpus.id, pathos: 1, corpus: 1, wp: 0});
  rolls.push(2);
  await W.useArcanos(w);
  assert.equal(w.system.advantages.pathos.temporary, 3);
  assert.equal(w.system.health.damage.corpus.lethal, 1, "Corpus spent as lethal on the Corpus track");
  assert.equal(w.system.health.damage.lethal, 0, "not on Health");
  assert.match(posts.at(-1).title, new RegExp(withCorpus.n.replace(/[()]/g, ".")));
});

test("a Passion gives Pathos once a scene; a neglected Fetter at 0 calls a Harrowing", async () => {
  reset();
  const w = wraith("Ada");
  const p = WX.info(w).passions[0];
  forms.push({p: p.id, how: "live"}); rolls.push(3);
  await W.passion(w);
  assert.equal(w.system.advantages.pathos.temporary, 7);
  forms.push({p: p.id, how: "live"});
  await W.passion(w);
  assert.match(notes.at(-1), /already tapped/);
  game.settings.set("wodx-actions", "wraithScene", 5);
  forms.push({p: p.id, how: "second"}); rolls.push(1);
  await W.passion(w);
  assert.equal(w.system.advantages.pathos.temporary, 8, "a new scene: tapped again");
  const f = WX.info(w).fetters[0];
  w.items.get(f.id).system.value = 1;
  forms.push({f: f.id, how: "neglect"}); rolls.push(0);
  await W.fetter(w);
  assert.equal(w.items.get(f.id).system.value, 0);
  assert.match(posts.at(-1).body, /data-wx="harrowing"/);
});

test("healing the Corpus with Pathos; the Harrowing escape roll; Catharsis needs Angst above Willpower", async () => {
  reset();
  const w = wraith("Ada", {wp: [2, 5]});
  w.system.health.damage.corpus = {bashing: 2, lethal: 1, aggravated: 0};
  forms.push({how: "pathos", max: 2});
  await W.healCorpus(w);
  assert.deepEqual({...w.system.health.damage.corpus}, {bashing: 0, lethal: 0, aggravated: 0});
  assert.equal(w.system.advantages.pathos.temporary, 2);
  forms.push({kind: "fetter", good: "2", eidolon: true, wp: false}); rolls.push(1, 0);
  await W.harrowing(w);
  assert.match(posts.at(-1).body, /takes its price/);
  assert.match(posts.at(-1).body, /diff 7|at 7/);
  forms.push({act: "catharsis"});
  await W.shadow(w);
  assert.equal(notes.length, 0, "Angst 3 > Willpower 2: allowed");
});

test("the Shadowguide whisper reaches only the Storyteller, the guide and (from the Shadow) her owners", async () => {
  reset();
  const w = wraith("Ada");
  forms.push({text: "Let her go."});
  await W.whisper(w);
  const m = mock.log.chat.at(-1);
  assert.ok(m, "a whisper was posted");
  assert.ok(Array.isArray(m.whisper) && m.whisper.length >= 1);
});

test("the inquisitor: traits saved, a Blessing with Conviction risked, a sin, prayer capped by Piety", async () => {
  reset();
  const q = actor("Brother Anselm", {type: "Hunter", virtues: [3, 3, 3], adv: {conviction: {permanent: 4, temporary: 4, max: 10}}});
  forms.push({order: "oculi", faith: 1, wisdom: 2, zeal: 0, piety: 6, conviction: 4, start: false});
  await Hn.inquisitorSheet(q);
  const i = Hn.inq(q);
  assert.equal(i.wisdom, 2); assert.equal(i.piety, 6); assert.equal(i.conviction, 4);
  forms.push({b: "", other: "Second Sight", kind: "Benediction", sv: "wisdom", attr: "perception", diff: 6, cost: 0, risk: 3});
  rolls.push(2);
  await Hn.blessing(q);
  assert.equal(Hn.inq(q).conviction, 5, "risked 3, won: back with one more");
  assert.equal(q.system.advantages.conviction.temporary, 5, "kept on the sheet's Conviction");
  forms.push({b: "", other: "Second Sight", kind: "Benediction", sv: "wisdom", attr: "perception", diff: 6, cost: 0, risk: 2});
  rolls.push(1);
  await Hn.blessing(q);
  assert.equal(Hn.inq(q).conviction, 5, "once a scene: the second risk is refused");
  forms.push({lvl: "6"}); rolls.push(0);
  await Hn.sin(q);
  assert.equal(Hn.inq(q).piety, 5);
  forms.push({src: "ground", rating: 3, hours: 1}); rolls.push(3);
  await Hn.prayer(q);
  assert.equal(Hn.inq(q).conviction, 5, "Piety 5: prayer can't raise her higher");
  forms.push({src: "ground", rating: 3, hours: 1});
  await Hn.prayer(q);
  assert.match(notes.at(-1), /once a day/);
});

test("True Faith: the Dark Ages rules repel and resist; The Hunters Hunted II rules later", async () => {
  reset();
  const m = actor("Sister Agnes", {adv: {faith: {permanent: 3}}, wp: [4, 4]});
  forms.push({k: "resist", ps: 4, daim: false});
  await Hn.trueFaith(m);
  assert.match(posts.at(-1).body, /keeps 1 success/);
  assert.equal(m.system.advantages.willpower.temporary, 3);
  era = {id: "victorian"}; year = 1888;
  forms.push({k: "resist", ps: 4}); rolls.push(4);
  await Hn.trueFaith(m);
  assert.match(posts.at(-1).body, /keeps 0 successes/);
  era = {id: "dark-ages"}; year = 1230;
});

test("Numina: a Hunters Hunted II path from the sheet rolls its pool at its difficulty and costs its Willpower", async () => {
  reset();
  const m = actor("Mme Blavatsky", {wp: [5, 5], items: [{name: "Psychometry", type: "Power", system: {type: "wod.types.numina", value: 3}}]});
  forms.push({nm: "s0", lvl: 2});
  rolls.push(2);
  await Hn.numina(m);
  assert.equal(m.system.advantages.willpower.temporary, 4);
  assert.match(posts.at(-1).body, /Perception \+ Empathy: 2 \(5 at 7\)/);
  forms.push({nm: "s0", lvl: 4});
  await Hn.numina(m);
  assert.match(notes.at(-1), /out of reach/);
});

/* ---------------- WoDX Combat 3.6.0: the Corpus track ---------------- */

test("Combat sends a wraith's damage to her Corpus track", async () => {
  const C = await import(join(root, "modules/wodx-combat/scripts/main.js"));
  const w = wraith("Ada");
  assert.ok(C.corpusTrack(w));
  assert.equal(C.corpusTrack(actor("Hans")), null);
  const r = await C.applyDamage(w, "lethal", 3);
  assert.equal(r.corpus, true);
  assert.equal(w.system.health.damage.corpus.lethal, 3);
  assert.equal(w.system.health.damage.lethal, 0);
  assert.equal(C.corpusCondition({bashing: 0, lethal: 10, aggravated: 0}, 10).key, "harrowed");
});

test("hedge magic by Sorcerer (Revised): difficulty 4 + the highest aspect, successes per aspect level, fast casting, trading skill", () => {
  assert.deepEqual(HR.spell({rating: 3, aspects: [1]}), {difficulty: 5, need: 1, turns: 1, willpower: 0, overLimit: false, traded: false});
  const s = HR.spell({rating: 3, aspects: [3, 2], wpBase: 1});
  assert.equal(s.difficulty, 7); assert.equal(s.need, 4); assert.equal(s.turns, 3); assert.equal(s.willpower, 1);
  const f = HR.spell({rating: 3, aspects: [3], fast: 2, wpBase: 1});
  assert.equal(f.difficulty, 9); assert.equal(f.turns, 1); assert.equal(f.willpower, 2);
  const t = HR.spell({rating: 5, aspects: [2], trade: true, wpBase: 1});
  assert.equal(t.difficulty, 9); assert.equal(t.willpower, 0); assert.equal(t.traded, true);
  assert.equal(HR.spell({rating: 2, aspects: [1], trade: true}).traded, false, "needs two dots over the aspect");
  assert.equal(HR.pushAspect(4, 2), true);
  assert.equal(HR.sorceryFor("Path of Hellfire"), "hellfire");
  assert.equal(HR.sorceryFor("Weather Control"), "weather");
  assert.equal(Object.keys(HR.SORCERY).length, 15);
});

test("hedge magic: a rituals-only Path refuses a spell; a Hellfire spell pays its Willpower and rolls at its difficulty", async () => {
  reset();
  const m = actor("Agnes Sampson", {wp: [5, 5], items: [{name: "Enchantment", type: "Power", system: {type: "wod.types.numina", value: 2}}, {name: "Hellfire", type: "Power", system: {type: "wod.types.numina", value: 3}}]});
  forms.push({path: "s0", mode: "spell"});
  await Hn.hedgeMagic(m);
  assert.match(notes.at(-1), /only as rituals/);
  forms.push({path: "s1", mode: "spell", a1: 2, a2: 1, a3: 0, a4: 0, fast: 0, mod: 0});
  rolls.push(2);
  await Hn.hedgeMagic(m);
  assert.equal(m.system.advantages.willpower.temporary, 4);
  assert.match(posts.at(-1).body, /\(5 at 6\)/);
  assert.match(posts.at(-1).body, /It works \(2 of 2/);
});

test("ghouls outside the Dark Ages: overfeeding past the pool plus Stamina calls the Stamina roll", () => {
  assert.deepEqual(HR.overfeed(8, 10, 3, 1), {after: 9, excess: 0, crammed: 0, check: false});
  assert.deepEqual(HR.overfeed(9, 10, 3, 3), {after: 12, excess: 0, crammed: 2, check: false});
  const o = HR.overfeed(10, 10, 2, 5);
  assert.equal(o.check, true); assert.equal(o.excess, 3); assert.equal(o.difficulty, 8);
  assert.equal(HR.WITHDRAWAL.weeks(2), 4);
});

/* ---------------- Hunter: The Reckoning ---------------- */

const KR2 = await import(join(root, "modules/wodx-actions/scripts/reckoning-rules.js"));
const RX = await import(join(root, "modules/wodx-actions/scripts/reckoning.js"));

test("the imbued: creeds, 35 edges in seven paths, edge levels follow the Virtue, risking, cashing in, derangements", () => {
  assert.equal(Object.keys(KR2.CREEDS).length, 7);
  assert.equal(KR2.EDGES.length, 35);
  for ( const p of Object.keys(KR2.PATHS) ) assert.deepEqual(KR2.EDGES.filter(e => e.path === p).map(e => e.level), [1, 2, 3, 4, 5], p);
  assert.equal(KR2.edgeAllowed(KR2.edgeFor("Cleave"), {zeal: 1}), true);
  assert.equal(KR2.edgeAllowed(KR2.edgeFor("Smite"), {zeal: 3}), false);
  assert.equal(KR2.edgeDifficulty(KR2.edgeFor("Burden"), {t: {stamina: 4}}), 7);
  assert.equal(KR2.edgeDifficulty(KR2.edgeFor("Restore"), {lethal: 6}), 10);
  assert.deepEqual(KR2.risk(5, 3, {successes: 2, botch: false}), {dice: 3, after: 6});
  assert.equal(KR2.risk(5, 3, {successes: 2, botch: false}, {bonus: 3}).after, 8);
  assert.equal(KR2.risk(5, 3, {successes: 0, botch: false}).after, 2);
  assert.equal(KR2.risk(5, 3, {successes: 0, botch: true}).after, 0);
  assert.equal(KR2.maxOut({mercy: 1, vision: 1, zeal: 3}, "zeal", "mercy").mercy, 2);
  assert.equal(KR2.maxOut({mercy: 3, vision: 1, zeal: 3}, "zeal", "mercy"), null);
  assert.equal(KR2.derangementsDue(6, 7), 1);
  assert.equal(KR2.derangementsDue(4, 5), 0);
  assert.equal(KR2.imbueCheck("avenger", {mercy: 0, vision: 1, zeal: 2}), null);
  assert.match(KR2.imbueCheck("avenger", {mercy: 2, vision: 0, zeal: 1}), /primary/);
});

test("an imbued hunter: second sight costs a Conviction once a scene; a risked edge roll wins Conviction back", async () => {
  reset();
  era = {id: "modern"}; year = 2003;
  const Rk = RX.build(ctx);
  const h = actor("Mara", {type: "Hunter", adv: {conviction: {permanent: 4, temporary: 4, max: 10}, virtues: {conscience: {permanent: 3}, selfcontrol: {permanent: 3}, courage: {permanent: 3}, mercy: {permanent: 0}, vision: {permanent: 1}, zeal: {permanent: 2}}},
    abilities: {melee: 2}, items: [{name: "Cleave", type: "Power", system: {type: "wod.types.edge", value: 1}}]});
  h.system.creed = "Avenger";
  forms.push({k: "spend"});
  await Rk.secondSight(h);
  assert.equal(h.system.advantages.conviction.temporary, 3);
  forms.push({k: "spend"});
  await Rk.secondSight(h);
  assert.match(notes.at(-1), /Already active/);
  forms.push({edge: "cleave", diff: 6, bonus: 0, risk: 2, award: "1"});
  rolls.push(2);
  await Rk.useEdge(h);
  assert.equal(h.system.advantages.conviction.temporary, 4, "3 − 2 risked, won: 3 + 1");
  assert.match(posts.at(-1).body, /Dexterity \+ Melee \+ 2 risked: 2 \(7 at 6\)/);
  era = {id: "dark-ages"}; year = 1230;
});
