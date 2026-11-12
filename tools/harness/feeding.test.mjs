import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";

/* WoDX Actions 3.40.0: what feeding does to the vessel, and the feeding limits of clans and bloodlines (feeding-rules.js) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const KF = await import(join(root, "modules/wodx-actions/scripts/feeding-rules.js"));

/* ---- the rules ---- */

test("a living vessel: the lower of its blood and (full - damage); a point back a day", () => {
  assert.equal(KF.available({blood: 10, full: 10, damage: 0}), 10);
  assert.equal(KF.available({blood: 10, full: 10, damage: 3}), 7, "wounded: one fewer a level (V20 p. 269)");
  assert.equal(KF.available({blood: 7, full: 10, damage: 3}), 7, "the same loss is not counted twice");
  assert.equal(KF.available({blood: 4, full: 10, damage: 1}), 4);
  assert.equal(KF.available({blood: 6, full: 10, damage: 9, living: false}), 6, "Kindred give their pool");
  assert.equal(KF.bloodNow(null, 10, 0), 10, "never drunk from: full");
  assert.equal(KF.bloodNow({value: 4, at: 0}, 10, 86400 * 2 + 5), 6);
  assert.equal(KF.bloodNow({value: 4, at: 0}, 10, 86400 * 30), 10, "never past full");
  assert.equal(KF.bloodNow({value: 4, at: 100}, 10, 50), 4, "the clock set back: no change");
});

test("the Kiss does a lethal level a point, two for the Giovanni, none to the dead", () => {
  assert.equal(KF.kissDamage(3), 3);
  assert.equal(KF.kissDamage(3, {mult: 2}), 6);
  assert.equal(KF.kissDamage(3, {living: false}), 0);
  assert.equal(KF.vesselOutcome(2, 10).key, "safe");
  assert.equal(KF.vesselOutcome(3, 10).key, "weak");
  assert.equal(KF.vesselOutcome(5, 10).key, "hospital");
  assert.equal(KF.vesselOutcome(10, 10).key, "dead");
});

test("clans and bloodlines are read from the sheet's words", () => {
  assert.equal(KF.clanKey("ventrue"), "ventrue");
  assert.equal(KF.clanKey("wod.bio.vampire.ventrue"), "ventrue");
  assert.equal(KF.clanKey("Ventrue Antitribu"), "ventrue");
  assert.equal(KF.clanKey("Salubri Antitribu"), "salubri-antitribu");
  assert.equal(KF.clanKey("Salubri Warriors"), "salubri-warrior");
  assert.equal(KF.clanKey("Salubri"), "salubri");
  assert.equal(KF.clanKey("Assamite antitribu"), "assamite-antitribu");
  assert.equal(KF.clanKey("Assamite"), null, "only the antitribu keep the addiction");
  assert.equal(KF.clanKey("Brujah antitribu"), null);
  assert.equal(KF.clanKey("Nagaraja"), "nagaraja");
  assert.equal(KF.clanKey("Toreador"), null);
  assert.equal(KF.clanKey(""), null);
});

test("each rule has its V20 and Dark Ages version, and a page", () => {
  assert.equal(KF.ruleFor("ventrue").miss, "vomit");
  assert.equal(KF.ruleFor("ventrue", {darkAges: true}).miss, "none");
  assert.equal(KF.ruleFor("salubri").unwilling, "wp");
  assert.equal(KF.ruleFor("salubri", {darkAges: true}).unwilling, "wpRoll");
  assert.equal(KF.ruleFor("tremere"), null, "modern Tremere have no feeding rule");
  assert.equal(KF.ruleFor("tremere", {darkAges: true}).bondFirstDouble, true);
  assert.equal(KF.ruleFor("nagaraja", {darkAges: true}).flesh, true, "no Dark Ages version: V20's in every era");
  assert.equal(KF.ruleFor("lamia", {darkAges: true}).lamia, "da");
  for ( const [k, r] of Object.entries(KF.CLAN_FEEDING) ) {
    for ( const v of [r.v20, r.da].filter(Boolean) ) {
      assert.match(v.page, /^V20 (Dark Ages )?(pdf|printed) p\. \d+$/, k);
      assert.ok(v.note && !/—/.test(v.note), k);
    }
  }
  assert.equal(KF.isDarkAgesFeeding({eraId: "dark-ages"}), true);
  assert.equal(KF.isDarkAgesFeeding({eraId: "victorian", year: 1890}), false);
  assert.equal(KF.isDarkAgesFeeding({year: 1300}), true);
  assert.equal(KF.isDarkAgesFeeding({}), false);
});

test("what nourishes: palates, animals, force, offerings", () => {
  const ven = KF.ruleFor("ventrue");
  assert.equal(KF.nourishment(ven, {fits: false}).factor, 0);
  assert.match(KF.nourishment(ven, {fits: false}).why, /comes back up/);
  assert.equal(KF.nourishment(ven, {fits: false, vampireVessel: true}).factor, 1, "vampire blood is exempt");
  assert.equal(KF.nourishment(ven, {fits: null}).factor, 1, "no tags: the Storyteller's box decides");
  assert.equal(KF.nourishment(KF.ruleFor("noiad"), {vesselKind: "cow"}).factor, 0);
  assert.equal(KF.nourishment(KF.ruleFor("noiad"), {vesselKind: "human"}).factor, 1);
  assert.equal(KF.nourishment(KF.ruleFor("danava"), {offering: false}).factor, 0.5);
  assert.equal(KF.nourished(5, 0.5), 2);
  assert.equal(KF.nourishment(KF.ruleFor("salubri-antitribu"), {fought: false}).factor, 0);
  assert.equal(KF.nourishment(KF.ruleFor("salubri-antitribu"), {fought: true}).factor, 1);
  assert.equal(KF.nourishment(null, {}).factor, 1);
});

test("tags: palates, Prey Exclusion and passers-by", () => {
  assert.deepEqual(KF.parseTags("Merchant,  woman; Catholic"), ["merchant", "woman", "catholic"]);
  assert.deepEqual(KF.parseTags(["a  younger sister", "A younger sister"]), ["a younger sister"]);
  assert.equal(KF.matchTags(["merchant"], ["burgher", "merchant", "man"]), true);
  assert.equal(KF.matchTags(["merchant"], ["carter"]), false);
  assert.equal(KF.matchTags([], ["carter"]), null);
  assert.equal(KF.matchTags(["merchant"], []), null);
  assert.deepEqual(KF.preyExclusionTags("Prey Exclusion (children, clergy)"), ["children", "clergy"]);
  assert.deepEqual(KF.preyExclusionTags("Prey Exclusion"), []);
  assert.equal(KF.lamiaDifficulty(["woman"]), 6);
  assert.equal(KF.lamiaDifficulty(["man"]), 8);
  assert.equal(KF.lamiaDifficulty([]), 7);
  assert.equal(KF.addictionDifficulty(2), 5);
  assert.equal(KF.addictionDifficulty(20), 10);
});

test("Nagaraja: a night without flesh adds to the debt; flesh pays it back", () => {
  let s = KF.nightPassed({});
  assert.deepEqual(s, {debt: 1, ateTonight: false});
  s = KF.nightPassed(s);
  assert.equal(s.debt, 2);
  s = KF.fleshEaten(s, 1);
  assert.deepEqual(s, {debt: 1, ateTonight: true});
  s = KF.nightPassed(s);
  assert.equal(s.debt, 1, "a night with flesh adds nothing");
  assert.equal(KF.fleshEaten({debt: 1}, 5).debt, 0);
  assert.equal(KF.fleshPoints("human", 10), 10);
  assert.equal(KF.fleshPoints("child", 5), 5);
  assert.equal(KF.fleshPoints("rat", 0.25), 0);
});

test("habits: the year and the clan", () => {
  assert.equal(KF.styleAllowed("banker", 1890), false, "no blood banks yet");
  assert.equal(KF.styleAllowed("banker", 1950), true);
  assert.equal(KF.styleAllowed("banker", null), true);
  assert.equal(KF.styleAllowed("nope", 1950), false);
  assert.match(KF.styleClash("farmer", KF.ruleFor("ventrue")), /no nourishment/);
  assert.match(KF.styleClash("farmer", KF.ruleFor("noiad")), /gives nothing/);
  assert.match(KF.styleClash("sandman", KF.ruleFor("salubri")), /unwilling/);
  assert.equal(KF.styleClash("headhunter", KF.ruleFor("salubri-antitribu")), "");
  assert.equal(KF.styleClash("rake", null), "");
  assert.equal(KF.palateHuntDifficulty("narrow"), 2);
  assert.equal(KF.palateHuntDifficulty(""), 0);
  const R = await_rules();
  for ( const [k, s] of Object.entries(KF.HUNT_STYLES) ) {
    assert.ok(R.HUNTING_GROUNDS[s.area], `${k} ground`);
    assert.ok(R.VESSELS[s.prey], `${k} prey`);
    assert.ok(!s.state || R.VESSEL_STATES[s.state], `${k} state`);
  }
});
const R0 = await import(join(root, "modules/wodx-actions/scripts/rules.js"));
function await_rules() { return R0; }

/* ---- the Feed window on a stand-in for Foundry ---- */

const mock = installMock({dataRoot: root});
CONFIG.statusEffects = [];
CONFIG.sounds ??= {dice: ""};
CONFIG.Actor = {dataModels: {Group: class {}}};
class Coll extends Map {
  get contents() { return [...this.values()]; }
  [Symbol.iterator]() { return this.values(); }
  filter(f) { return [...this.values()].filter(f); }
  find(f) { return [...this.values()].find(f); }
  some(f) { return [...this.values()].some(f); }
  getName(n) { return this.find(v => v.name === n); }
}
const setPath = (o, path, v) => {
  const p = path.split(".");
  for ( const k of p.slice(0, -1) ) o = (o[k] ??= {});
  const last = p.at(-1);
  if ( last.startsWith("-=") ) delete o[last.slice(2)]; else o[last] = v;
};
const health = () => Object.fromEntries(["bruised", "hurt", "injured", "wounded", "mauled", "crippled", "incapacitated"].map(k => [k, {value: 1, total: 1, penalty: 0}]));
function makeActor(name, type, {system = {}, flags = {}} = {}) {
  const id = `act${name.replace(/\W/g, "")}`;
  return Object.assign(Object.create(Actor.prototype), {
    id, uuid: `Actor.${id}`, name, type, flags: structuredClone(flags), isOwner: true, hasPlayerOwner: false, items: [], effects: new Coll(),
    system: {attributes: {strength: {value: 2, bonus: 0, total: 2}, dexterity: {value: 2, bonus: 0, total: 2}, stamina: {value: 3, bonus: 0, total: 3}},
      health: {...health(), damage: {bashing: 0, lethal: 0, aggravated: 0}}, ...system},
    _statuses: new Set(),
    getFlag(s, k) { return this.flags?.[s]?.[k]; },
    async setFlag(s, k, v) { setPath(this.flags, `${s}.${k}`, structuredClone(v)); return this; },
    async unsetFlag(s, k) { delete this.flags?.[s]?.[k]; return this; },
    async update(ch) { for ( const [k, v] of Object.entries(ch) ) setPath(this, k, structuredClone(v)); return this; },
    async toggleStatusEffect(id, {active}) { if ( active ) this._statuses.add(id); else this._statuses.delete(id); return true; },
    getActiveTokens: () => [],
    testUserPermission: () => true
  });
}
const vampire = (name, clan, {blood = 5, custom = ""} = {}) => makeActor(name, "Vampire", {system: {clan, custom: {clan: custom}, generation: 12,
  advantages: {bloodpool: {temporary: blood, max: 11, perturn: 1}, willpower: {permanent: 5, temporary: 5}, virtues: {selfcontrol: {permanent: 3}, conscience: {permanent: 3}, courage: {permanent: 3}}}}});

game.macros = new Coll();
globalThis.Macro = {create: async d => ({...d})};
game.modules.set("wodx-actions", {});
game.modules.set("wodx-combat", {});
globalThis.CONST.DOCUMENT_OWNERSHIP_LEVELS = {NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3};
game.release = {generation: 14};
game.system.id = "worldofdarkness";
game.socket.on ??= () => {};
game.actors = new Coll();
game.scenes = new Coll();
globalThis.canvas = {scene: null, tokens: {controlled: [], placeables: []}};
await import(join(root, "modules/wodx-combat/scripts/main.js"));
await import(join(root, "modules/wodx-actions/scripts/main.js"));

// The Actions windows (DialogV2 made with `new`): each test hands in what to fill and whether to press OK
const answers = [];
class Dlg {
  constructor(cfg) { this.cfg = cfg; this.element = document.createElement("div"); this.element.innerHTML = cfg.content; }
  async render() {
    const fn = answers.shift();
    if ( !fn ) throw new Error(`Unexpected window: ${this.cfg.window?.title}`);
    const ok = await fn(this.element);
    const b = this.cfg.buttons.find(x => x.action === (ok ? "ok" : "cancel")) ?? this.cfg.buttons.at(-1);
    b.callback?.(null, null, {element: this.element});
  }
  close() {} setPosition() {} addEventListener() {}
}
const fill = (vals = {}) => el => {
  for ( const [k, v] of Object.entries(vals) ) {
    const f = el.querySelector(`[name=${k}]`);
    assert.ok(f, `field ${k}`);
    if ( f.type === "checkbox" ) f.checked = !!v; else f.value = String(v);
  }
  return true;
};
let faces = [];
const fixedRoll = class { constructor(f) { this.n = Number(String(f).split("d")[0]); } async evaluate() { this.dice = [{results: Array.from({length: this.n}, () => ({result: faces.length ? faces.shift() : 7}))}]; return this; } };

test("boot", async () => {
  await Hooks.callAll("init");
  await Hooks.callAll("ready");
  await mock.settle();
  foundry.applications.api.DialogV2 = Dlg;
  globalThis.Roll = fixedRoll;
  ChatMessage.getSpeaker ??= () => ({alias: "x"});
  game.time ??= {worldTime: 0};
  game.time.worldTime ??= 0;
  globalThis.fromUuid = async u => game.actors.find(a => a.uuid === u) ?? null;
  if ( process.env.FEED_DEBUG ) { ui.notifications.error = m => console.log("ERR", m); ui.notifications.warn = m => console.log("WARN", m); }
  assert.equal(game.wodxActions.version, "3.40.0");
});

const lastCard = () => mock.log.chat.at(-1)?.content ?? "";

test("feeding on a mortal: the blood goes, a lethal level a point, and it can be undone", async () => {
  const k = vampire("Radu", "toreador");
  const m = makeActor("Jana", "Mortal");
  game.actors = new Coll([[k.id, k], [m.id, m]]);
  answers.push(fill({take: 2}));
  await game.wodxActions.feed({actor: k, vessel: m});
  await mock.settle();
  assert.equal(k.system.advantages.bloodpool.temporary, 7);
  assert.equal(m.system.health.damage.lethal, 2, "two levels for two points");
  assert.equal(m.flags["wodx-actions"].vesselBlood.value, 8);
  assert.match(lastCard(), /takes 2 lethal levels/);
  assert.match(lastCard(), /data-action="feedUndo"/);
  // A second drink the same night: 8 blood, 2 damage -> 8 to give (no double count)
  answers.push(fill({take: 3}));
  faces = [8, 8, 8];
  await game.wodxActions.feed({actor: k, vessel: m});
  await mock.settle();
  assert.equal(m.system.health.damage.lethal, 5);
  assert.equal(m.flags["wodx-actions"].vesselBlood.value, 5);
  assert.match(lastCard(), /needs a hospital/);
  // Undo the second card: health and blood as they were after the first
  const msg = mock.log.chat.at(-1);
  Object.assign(msg, {isOwner: true, getFlag(sc, k) { return this.flags?.[sc]?.[k]; }, async update(u) { for ( const [k, v] of Object.entries(u) ) setPath(this, k, v); return this; }});
  await game.wodxActions.feedUndo(msg);
  await mock.settle();
  assert.equal(m.system.health.damage.lethal, 2);
  assert.equal(m.flags["wodx-actions"].vesselBlood.value, 8);
});

test("drained dry: dead, and the taste goes with the blood", async () => {
  const k = vampire("Gorge", "brujah", {blood: 1});
  const m = makeActor("Petr", "Mortal", {flags: {"wodx-actions": {vesselState: "drunk"}}});
  game.actors = new Coll([[k.id, k], [m.id, m]]);
  answers.push(fill({take: 10}));
  faces = [8, 8, 8, 8, 8, 8, 8, 8, 8, 8];
  await game.wodxActions.feed({actor: k, vessel: m});
  await mock.settle();
  assert.equal(m.flags["wodx-actions"].vesselBlood.value, 0);
  assert.ok(m._statuses.has("dead"));
  assert.equal(m.flags["wodx-actions"].vesselState, undefined, "no blood, no drink in it");
  assert.match(lastCard(), /drained dry and dies/);
});

test("a Ventrue: the palate decides, the tags tick the box, vampire blood is exempt", async () => {
  const v = vampire("Albrecht", "ventrue");
  await v.setFlag("wodx-actions", "palate", {text: "merchants", tags: ["merchant"], breadth: "broad"});
  const fit = makeActor("Hanus", "Mortal", {flags: {"wodx-actions": {vesselTags: ["merchant", "man"]}}});
  const miss = makeActor("Ota", "Mortal", {flags: {"wodx-actions": {vesselTags: ["carter"]}}});
  game.actors = new Coll([[v.id, v], [fit.id, fit], [miss.id, miss]]);
  let boxed = null;
  answers.push(el => { boxed = el.querySelector("[name=fits]").checked; return fill({take: 2})(el); });
  await game.wodxActions.feed({actor: v, vessel: fit});
  await mock.settle();
  assert.equal(boxed, true, "the tags match");
  assert.equal(v.system.advantages.bloodpool.temporary, 7);
  answers.push(el => { boxed = el.querySelector("[name=fits]").checked; return fill({take: 2})(el); });
  await game.wodxActions.feed({actor: v, vessel: miss});
  await mock.settle();
  assert.equal(boxed, false, "the tags don't match");
  assert.equal(v.system.advantages.bloodpool.temporary, 7, "no nourishment");
  assert.match(lastCard(), /comes back up/);
  assert.equal(miss.system.health.damage.lethal, 2, "the vessel still bleeds");
});

test("a Giovanni Kiss: two levels a point", async () => {
  const g = vampire("Ambrogio", "giovanni");
  const m = makeActor("Klara", "Mortal");
  game.actors = new Coll([[g.id, g], [m.id, m]]);
  answers.push(fill({take: 2}));
  await game.wodxActions.feed({actor: g, vessel: m});
  await mock.settle();
  assert.equal(m.system.health.damage.lethal, 4);
  assert.match(lastCard(), /Giovanni: two a point/);
});

test("a Nagaraja eats flesh: blood, unsoakable lethal, the debt paid", async () => {
  const n = vampire("Anand", "custom", {custom: "Nagaraja", blood: 3});
  await n.setFlag("wodx-actions", "nagaraja", {debt: 2});
  const body = makeActor("Corpse", "Mortal");
  game.actors = new Coll([[n.id, n], [body.id, body]]);
  answers.push(fill({take: 1, flesh: 2}));
  await game.wodxActions.feed({actor: n, vessel: body});
  await mock.settle();
  assert.equal(n.system.advantages.bloodpool.temporary, 6, "1 blood + 2 flesh");
  assert.equal(body.system.health.damage.lethal, 3);
  assert.equal(n.flags["wodx-actions"].nagaraja.debt, 0);
  assert.equal(body.flags["wodx-actions"].fleshTaken, 2);
});

test("a modern Salubri: an unwilling vessel costs a Willpower point; a willing one doesn't", async () => {
  const s = vampire("Ilona", "custom", {custom: "Salubri"});
  const m = makeActor("Vera", "Mortal");
  game.actors = new Coll([[s.id, s], [m.id, m]]);
  answers.push(fill({take: 1, willing: false}));
  await game.wodxActions.feed({actor: s, vessel: m});
  await mock.settle();
  assert.equal(s.system.advantages.willpower.temporary, 4);
  answers.push(fill({take: 1}));
  await game.wodxActions.feed({actor: s, vessel: m, willing: true});
  await mock.settle();
  assert.equal(s.system.advantages.willpower.temporary, 4, "willing (as after Seduction): no cost");
});

test("Salubri antitribu: no nourishment unless fought; a vampire's blow is on record", async () => {
  const s = vampire("Fury", "custom", {custom: "Salubri antitribu"});
  const m = makeActor("Thug", "Mortal");
  game.actors = new Coll([[s.id, s], [m.id, m]]);
  let boxed = null;
  answers.push(el => { boxed = el.querySelector("[name=fought]").checked; return fill({take: 2})(el); });
  await game.wodxActions.feed({actor: s, vessel: m});
  await mock.settle();
  assert.equal(boxed, false);
  assert.equal(s.system.advantages.bloodpool.temporary, 5, "not taken by force: nothing");
  Hooks.callAll("wodxDamageApplied", m, {type: "bashing", levels: 1, attacker: s.uuid});
  await mock.settle();
  assert.ok(m.flags["wodx-actions"].fought[s.id] !== undefined);
  answers.push(el => { boxed = el.querySelector("[name=fought]").checked; return fill({take: 2})(el); });
  await game.wodxActions.feed({actor: s, vessel: m});
  await mock.settle();
  assert.equal(boxed, true, "the fight ticks the box");
  assert.equal(s.system.advantages.bloodpool.temporary, 7);
});

test("hunting with a habit and a palate: the palate adds difficulty, the habit is saved", async () => {
  const v = vampire("Jindrich", "ventrue");
  await v.setFlag("wodx-actions", "palate", {text: "younger sisters", tags: ["younger sister"], breadth: "narrow"});
  game.actors = new Coll([[v.id, v]]);
  let diff = null;
  answers.push(el => { diff = Number(el.querySelector("[name=palateDiff]").value); return fill({style: "rake", hours: 1, take: 1})(el); });
  faces = [9, 9, 9, 9, 9, 9];
  await game.wodxActions.hunt({actor: v});
  await mock.settle();
  assert.equal(diff, 2);
  assert.equal(v.flags["wodx-actions"].huntStyle, "rake");
  assert.match(lastCard(), /palate \+2/);
});

test("Assamite antitribu drinking Kindred blood: the addiction roll, and a step of the Blood Oath", async () => {
  const a = vampire("Rashid", "custom", {custom: "Assamite antitribu"});
  const d = vampire("Donor", "toreador", {blood: 10});
  game.actors = new Coll([[a.id, a], [d.id, d]]);
  answers.push(fill({take: 2, vessel: "vampire"}));
  faces = [2, 2, 2];
  await game.wodxActions.feed({actor: a, vessel: d});
  await mock.settle();
  assert.ok(a.flags["wodx-actions"].addicted, "failed the roll at 5");
  assert.equal(d.system.advantages.bloodpool.temporary, 8, "a Kindred vessel's own pool");
  assert.equal(d.system.health.damage.lethal, 0, "no wound to a Cainite");
  assert.equal(a.flags["wodx-actions"].oaths?.[d.uuid.replace(/\./g, "_")]?.stage, 1);
});

test("Dark Ages: a Tremere's first drink counts two; a Ventrue's miss doesn't vomit; Lamia bite", async () => {
  game.modules.set("wodx-chronicle", {active: false, api: {eras: {activeEra: () => ({profile: {id: "dark-ages"}}), currentYear: () => 1230}}});
  try {
    const t = vampire("Etrius", "tremere");
    const d = vampire("Elder", "ventrue", {blood: 10});
    game.actors = new Coll([[t.id, t], [d.id, d]]);
    answers.push(fill({take: 1, vessel: "vampire"}));
    await game.wodxActions.feed({actor: t, vessel: d});
    await mock.settle();
    assert.equal(t.flags["wodx-actions"].oaths[d.uuid.replace(/\./g, "_")].stage, 2, "counts as two");
    assert.match(lastCard(), /counts as two/);
    const v = vampire("Hartwig", "ventrue");
    await v.setFlag("wodx-actions", "palate", {text: "monks", tags: ["monk"], breadth: "broad"});
    const m = makeActor("Wenzel", "Mortal", {flags: {"wodx-actions": {vesselTags: ["carter"]}}});
    game.actors = new Coll([[v.id, v], [m.id, m]]);
    answers.push(fill({take: 2}));
    await game.wodxActions.feed({actor: v, vessel: m});
    await mock.settle();
    assert.match(lastCard(), /doesn't hold off the Beast|isn't held off/);
    assert.doesNotMatch(lastCard(), /comes back up/);
    const l = vampire("Lilit", "custom", {custom: "Lamia"});
    const w = makeActor("Agnes", "Mortal");
    game.actors = new Coll([[l.id, l], [w.id, w]]);
    answers.push(fill({take: 1}));
    await game.wodxActions.feed({actor: l, vessel: w});
    await mock.settle();
    assert.equal(w.flags["wodx-actions"].seedOfLilith.rule, "da");
  } finally { game.modules.delete("wodx-chronicle"); }
});

test("a new night: a Nagaraja without flesh loses a die from Physical pools; flesh gives it back", async () => {
  const n = vampire("Hungry", "custom", {custom: "Nagaraja", blood: 8});
  n.hasPlayerOwner = true;
  game.actors = new Coll([[n.id, n]]);
  await game.wodxActions.newNight({actors: [n]});
  await mock.settle();
  assert.equal(n.flags["wodx-actions"].nagaraja.debt, 1);
  assert.equal(n.system.attributes.strength.total, 1);
  assert.equal(n.system.attributes.stamina.bonus, -1);
  const body = makeActor("Remains", "Mortal");
  game.actors = new Coll([[n.id, n], [body.id, body]]);
  answers.push(fill({take: 0, flesh: 1}));
  await game.wodxActions.feed({actor: n, vessel: body});
  await mock.settle();
  assert.equal(n.flags["wodx-actions"].nagaraja.debt, 0);
  assert.equal(n.system.attributes.strength.total, 2, "the die is back");
  assert.equal(n.system.attributes.stamina.bonus, 0);
});
