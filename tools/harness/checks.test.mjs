import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";

/*
 * Common checks (WoDX Actions 3.13.0): the everyday rolls players asked for after the 8 November playtest (a plain
 * Perception check, Stamina to resist, an Attribute alone...). The pure list and pool choice, then the roller itself on
 * the stand-in for Foundry, with dice that always come up the same.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CK = await import(join(root, "modules/wodx-actions/scripts/checks-rules.js"));
const ATTRS = ["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"];

test("every common check is complete: group, label, pools, difficulty, note and a page", () => {
  const keys = new Set();
  const groups = CK.GROUPS.map(g => g[0]);
  for ( const c of CK.CHECKS ) {
    assert.ok(!keys.has(c.key), `${c.key} is listed once`);
    keys.add(c.key);
    assert.ok(groups.includes(c.group), `${c.key}: a known group`);
    assert.ok(c.label && c.note, `${c.key}: label and note`);
    assert.match(c.ref, /^V20 p\. \d+/, `${c.key}: a V20 page`);
    assert.ok(c.diff >= 2 && c.diff <= 10, `${c.key}: difficulty in range`);
    assert.ok(c.pools.length >= 1);
    for ( const [a] of c.pools ) assert.ok(ATTRS.includes(a) || a.startsWith("special:"), `${c.key}: ${a} is an Attribute or Trait`);
  }
  for ( const g of groups ) assert.ok(CK.CHECKS.some(c => c.group === g), `${g} has checks`);
});

test("the rolls players missed are there", () => {
  for ( const k of ["notice", "react", "uncanny", "search", "readperson", "agility", "endurance", "strength", "willpower", "stamina", "courage", "recall", "firstaid", "persuade"] )
    assert.ok(CK.byKey(k), `${k} is a common check`);
  for ( const a of ATTRS ) assert.deepEqual(CK.byKey(`attr-${a}`).pools, [[a, ""]], `${a} can be rolled alone`);
  assert.deepEqual(CK.byKey("notice").pools[0], ["perception", "alertness"]);
});

test("the kind of an Ability decides the untrained rules", () => {
  assert.equal(CK.abilityKind("alertness"), "talent");
  assert.equal(CK.abilityKind("Primal-Urge"), "talent");
  assert.equal(CK.abilityKind("drive"), "skill");
  assert.equal(CK.abilityKind("animalken"), "skill");
  assert.equal(CK.abilityKind("medicine"), "knowledge");
  assert.equal(CK.abilityKind("Hearth Wisdom"), "knowledge");
  assert.equal(CK.abilityKind(""), "");
});

test("the pool: dots first, then what the sheet shows, then the first pool untrained", () => {
  const pools = [["wits", "drive"], ["wits", "ride"], ["dexterity", "ride"]];
  const sheet = s => k => s[k] ?? null;
  assert.deepEqual(CK.choosePool(pools, sheet({ride: {value: 2, shown: true}})), {attr: "wits", ability: "ride", value: 2, how: "trained"});
  assert.deepEqual(CK.choosePool(pools, sheet({drive: {value: 0, shown: false}, ride: {value: 0, shown: true}})), {attr: "wits", ability: "ride", value: 0, how: "shown"});
  assert.deepEqual(CK.choosePool(pools, sheet({})), {attr: "wits", ability: "drive", value: 0, how: "untrained"});
  assert.deepEqual(CK.choosePool([["strength", ""]], sheet({})), {attr: "strength", ability: "", value: 0, how: "trait"});
  assert.deepEqual(CK.choosePool([["special:willpower", ""]], sheet({})).attr, "special:willpower");
  assert.equal(CK.choosePool([], sheet({})), null);
});

test("each check is also a preset in the Action dialog", () => {
  const p = CK.asPresets();
  assert.equal(Object.keys(p).length, CK.CHECKS.length);
  assert.equal(p["check-notice"].attr, "perception");
  assert.equal(p["check-notice"].ability, "alertness");
  assert.match(p["check-notice"].label, /^Common: Notice/);
  assert.match(p["check-notice"].note, /\(V20 p\. 100, 274\)$/);
});

/* ---- The roller, on the stand-in ---- */
const mock = installMock({dataRoot: root});
CONFIG.statusEffects = [];
game.release = {generation: 14};
game.system.id = "worldofdarkness";
game.data = {settings: []};
for ( const id of ["vtda20-actions", "vtda20-combat"] ) game.modules.set(id, {active: false});
game.modules.set("wodx-actions", {});
game.modules.set("wodx-combat", {});
class MacroColl extends Map { find(f) { for ( const v of this.values() ) if ( f(v) ) return v; } [Symbol.iterator]() { return this.values(); } }
game.macros = new MacroColl();
globalThis.Macro = {create: async d => { game.macros.set(d.name, d); return d; }};
CONST.DOCUMENT_OWNERSHIP_LEVELS ??= {NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3};
// Dice that always roll the same faces
let FACES = [8, 7, 6, 3, 1, 9, 10, 2, 5, 4];
globalThis.Roll = class { constructor(f) { this.n = parseInt(f); } async evaluate() { this.dice = [{results: Array.from({length: this.n}, (_, i) => ({result: FACES[i % FACES.length]}))}]; return this; } };
// Dialogs: the next test answer fills the form, then the Roll button is pressed
const answers = [];
const api = foundry.applications.api;
api.DialogV2 = class {
  constructor(cfg) { this.cfg = cfg; this.element = document.createElement("div"); this.element.innerHTML = `<form>${cfg.content}</form>`; }
  async render() {
    // Only the roller's dialogs take an answer (another module may open its own at start-up)
    if ( !this.cfg.buttons?.some(x => x.action === "ok") || !answers.length ) return this;
    const fill = answers.shift();
    setTimeout(async () => {
      const go = await fill(this.element);
      const b = this.cfg.buttons.find(x => x.action === (go ? "ok" : "cancel"));
      b.callback(null, null, this);
    }, 0);
    return this;
  }
  addEventListener() {}
  close() {}
};
await import(join(root, "modules/wodx-combat/scripts/main.js"));
await import(join(root, "modules/wodx-actions/scripts/main.js"));
await Hooks.callAll("init");
mock.setupTime();
await Hooks.callAll("ready");
globalThis.canvas = {tokens: {controlled: []}, scene: null};
ChatMessage.getSpeaker = ({actor} = {}) => ({alias: actor?.name});
CONFIG.sounds = {dice: "dice.wav"};
game.user.targets = new Set();

const MOD = "wodx-actions";
function makeActor(name, {attrs = {}, abilities = {}, willpower = 5, type = "Mortal"} = {}) {
  const attributes = Object.fromEntries(ATTRS.map(k => [k, {value: attrs[k] ?? 2, total: attrs[k] ?? 2, bonus: 0, label: `wod.attributes.${k}`}]));
  const abil = {};
  for ( const [k, v] of Object.entries(abilities) ) abil[k] = {value: v, label: `wod.abilities.${k}`, type: CK.abilityKind(k), isvisible: v > 0};
  for ( const k of ["medicine", "awareness", "drive"] ) abil[k] ??= {value: 0, label: `wod.abilities.${k}`, type: CK.abilityKind(k), isvisible: false};
  const a = {id: `act${name}`, uuid: `Actor.act${name}`, name, type, flags: {}, isOwner: true, hasPlayerOwner: true, items: [], effects: [], statuses: new Set(),
    system: {attributes, abilities: abil, health: {damage: {bashing: 0, lethal: 0, aggravated: 0}},
      advantages: {willpower: {permanent: willpower, temporary: willpower}, virtues: {conscience: {permanent: 3}, selfcontrol: {permanent: 3}, courage: {permanent: 4}}}},
    getFlag(s, k) { return this.flags?.[s]?.[k]; }, async setFlag(s, k, v) { (this.flags[s] ??= {})[k] = v; return this; },
    async update() { return this; }, getActiveTokens: () => [], testUserPermission: () => true};
  game.actors.set(a.id, a);
  // A plain object is not an Actor here: the roller finds it as the user's character, as a player's would be
  game.user.character = a;
  return a;
}
const lastCard = () => JSON.stringify(mock.log.chat.at(-1) ?? {});
const pick = (key, more = {}) => root => {
  const f = root.querySelector("form");
  f.querySelector("[name=check]").value = key;
  for ( const [n, v] of Object.entries({diff: CK.byKey(key).diff, ...more}) ) {
    const el = f.querySelector(`[name=${n}]`);
    if ( el.type === "checkbox" ) el.checked = !!v; else el.value = String(v);
  }
  return true;
};

test("a plain Perception check: Perception + Alertness from the sheet", async () => {
  const a = makeActor("Watcher", {attrs: {perception: 3}, abilities: {alertness: 2}});
  answers.push(pick("notice"));
  await game.wodxActions.quickCheck({actor: a});
  const card = lastCard();
  assert.match(card, /Notice something/);
  assert.match(card, /Perception \+ [^<]*alertness/i);
  assert.match(card, /5 dice, diff 6/, "five dice at 6");
  assert.equal(mock.log.notifications.filter(n => n.type === "error").length, 0);
});

test("an untrained Talent rolls the Attribute alone; an untrained Knowledge is refused", async () => {
  const a = makeActor("Novice", {attrs: {perception: 3, intelligence: 2}});
  answers.push(pick("uncanny"));
  await game.wodxActions.quickCheck({actor: a});
  assert.match(lastCard(), /Sense the uncanny/);
  const before = mock.log.chat.length;
  answers.push(pick("firstaid"));
  await game.wodxActions.quickCheck({actor: a});
  assert.match(JSON.stringify(mock.log.chat.slice(before)), /untrained Knowledge cannot be attempted/);
});

test("Willpower, Courage and an Attribute alone roll their own Trait", async () => {
  const a = makeActor("Steady", {attrs: {stamina: 4}, willpower: 7});
  answers.push(pick("willpower"));
  await game.wodxActions.quickCheck({actor: a});
  assert.match(lastCard(), /Willpower/);
  answers.push(pick("attr-stamina", {diff: 8}));
  await game.wodxActions.quickCheck({actor: a});
  assert.match(lastCard(), /Stamina/);
  assert.match(lastCard(), /4 dice, diff 8/);
  answers.push(pick("courage"));
  await game.wodxActions.quickCheck({actor: a});
  assert.match(lastCard(), /Courage/);
});

test("the dialog shows the pool before rolling, and a cancel rolls nothing", async () => {
  const a = makeActor("Driver", {attrs: {wits: 3}, abilities: {drive: 2}});
  let pool = "";
  answers.push(root => { const f = root.querySelector("form"); f.querySelector("[name=check]").value = "swerve"; return false; });
  const before = mock.log.chat.length;
  await game.wodxActions.quickCheck({actor: a, check: "swerve"});
  assert.equal(mock.log.chat.length, before, "nothing rolled");
  answers.push(root => { pool = root.querySelector(".vta-check-pool")?.textContent ?? ""; return false; });
  await game.wodxActions.quickCheck({actor: a, check: "swerve"});
  // The note fills on render, which the stand-in does not run: the markup must at least carry the place for it
  assert.equal(typeof pool, "string");
});

test("the Action dialog offers the checks and the new V20 systems among its presets", () => {
  const P = game.wodxActions.presets;
  for ( const k of ["check-notice", "check-willpower", "check-attr-perception", "drive", "computer", "carrying"] ) assert.ok(P[k], `${k} is a preset`);
  assert.ok(P.research.alts.some(([, ab]) => ab === "science"), "Research takes Science too (V20 p. 265)");
});

test("every line's menu has the common checks next to the free roll", async () => {
  const PM = await import(join(root, "modules/wodx-actions/scripts/profile-menus.js"));
  const TR = await import(join(root, "modules/wodx-actions/scripts/theme-rules.js"));
  for ( const [kind, m] of Object.entries(PM.MENUS) ) {
    const roll = m.sections.find(([t]) => t === "Roll")[1].map(b => b[0]);
    assert.deepEqual(roll.slice(0, 2), ["action", "api:quickCheck"], `${kind}: free roll, then common checks`);
  }
  for ( const [kind, plan] of Object.entries(TR.MENU_PLAN) ) assert.deepEqual(plan.act.slice(0, 2), ["action", "api:quickCheck"], `${kind}: placed second in Act`);
  assert.ok(TR.DESC["api:quickCheck"]);
});
