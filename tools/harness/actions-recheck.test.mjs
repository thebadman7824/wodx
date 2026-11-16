import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/*
 * B6662 to B6664: a ward against every line, conditions on social and feeding rolls, social condition mods on the sheet.
 * The power windows are driven through their own build(ctx) with a mock Foundry: the window's callback runs with the
 * fields given, and the roll's difficulty and the card's parts are read back.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");

// A mock Chronicle: a ward (resist channel, +1 against anyone but a mortal) and the conditions on each actor
const chronicle = {
  traits: {
    effects: (a, ctx) => (ctx.channel === "resist" && a?.warded && ctx.against && ctx.against !== "mortal"
      && (ctx.tags ?? []).includes("magic") ? [{name: "Ward (a paper charm)", diff: 1}] : []),
    kindOf: a => a?.kind ?? "mortal",
    rules: {sumEffects: list => ({dice: 0, diff: list.reduce((s, e) => s + (e.diff || 0), 0), parts: list.map(e => `${e.name} +${e.diff}`)}), rollTags: (...k) => k.flat().filter(Boolean)}
  },
  conditions: {conditionsOf: a => a?.conds ?? []}
};
globalThis.game = {
  modules: new Map([["wodx-chronicle", {active: true, api: chronicle}]]),
  settings: {get() { throw new Error("not registered"); }, set: async () => {}},
  user: {isGM: true, id: "gm", targets: new Set()},
  users: {activeGM: null, filter: () => []},
  time: {worldTime: 0}, actors: [], scenes: {}, messages: []
};
globalThis.ui = {notifications: {warn() {}, info() {}}};
globalThis.Hooks = {callAll() {}, on() {}, off() {}, once() {}};
globalThis.canvas = null;

const actor = (name, extra = {}) => ({name, id: name, uuid: `Actor.${name}`, items: [], statuses: new Set(), isOwner: true, conds: [],
  getFlag() { return undefined; }, setFlag: async () => {}, unsetFlag: async () => {}, update: async () => {}, ...extra});
const aim = t => { game.user.targets = new Set(t ? [{actor: t}] : []); };

/** The ctx a window's build() takes: the dialog answers with fd at once; each roll and card is kept. */
function ctxFor(fd, extra = {}) {
  const seen = {rolls: [], cards: []};
  const ctx = {
    seen,
    dialog: async (title, content, label, cb) => cb(fd),
    rollPool: async (dice, difficulty) => { const r = {dice, difficulty, successes: 1, botch: false, raw: 1, ones: 0, faces: [7], roll: null}; seen.rolls.push(r); return r; },
    rollBlock: (t, r, parts = []) => `<b>${t}</b>: ${r.dice} dice, diff ${r.difficulty} | ${parts.join(" · ")}`,
    post: async (a, title, body) => { seen.cards.push(body); return body; },
    notify: m => { seen.notes = [...(seen.notes ?? []), m]; },
    updateActor: async () => {}, setFlag: async () => {}, spendWillpower: async () => true,
    attr: (a, k) => Number(a.system?.attributes?.[k]?.value) || 3, findAbility: () => ({value: 2}),
    esc: s => String(s ?? ""), cap: s => String(s ?? ""),
    ...extra
  };
  return ctx;
}

const TH = await imp("modules/wodx-actions/scripts/trait-hooks.js");
const LIM = await imp("modules/wodx-actions/scripts/limits.js");

test("B6662: targetResist reads the first target's ward, never the user's own", () => {
  const caster = actor("Caster", {kind: "kindred"}), seeker = actor("Seeker", {warded: true});
  aim(seeker);
  assert.deepEqual(TH.targetResist(caster, ["magic"]), {dice: 0, diff: 1, parts: ["Seeker's Ward (a paper charm) +1"]});
  aim(caster);
  assert.equal(TH.targetResist(caster, ["magic"]).diff, 0, "the user targeting themself");
  aim(null);
  assert.equal(TH.targetResist(caster, ["magic"]).diff, 0, "no one targeted");
});

test("B6662: a Kuei-jin's roll at a warded target is one harder, the ward named", async () => {
  const K = await imp("modules/wodx-actions/scripts/kote.js");
  const kj = actor("Kuei-jin", {kind: "kuei-jin", type: "Vampire", system: {settings: {variant: "kindredeast"}, advantages: {dharma: {permanent: 3}, yangchi: {temporary: 6}}}});
  const seeker = actor("Seeker", {warded: true});
  const run = async () => { const c = ctxFor({art: "", pw: "", kind: "yang", k: "1", dice: "4", diff: "6", wall: "6"}); await K.build(c).spend(kj); return c.seen; };
  aim(null);
  const off = await run();
  aim(seeker);
  const on = await run();
  assert.equal(off.rolls.at(-1).difficulty, 6);
  assert.equal(on.rolls.at(-1).difficulty, 7);
  assert.match(on.cards.at(-1), /Seeker's Ward/);
  assert.doesNotMatch(off.cards.at(-1), /Ward/);
});

test("B6662: a Hunter edge (HtR) at a warded target is one harder, the ward named", async () => {
  const RK = await imp("modules/wodx-actions/scripts/reckoning.js");
  const h = actor("Imbued", {kind: "hunter", type: "Hunter", system: {attributes: {manipulation: {value: 3}}, advantages: {virtues: {mercy: {permanent: 3}}}}});
  const seeker = actor("Seeker", {warded: true});
  const run = async () => {
    const c = ctxFor({edge: "insinuate", diff: "6", bonus: "0", risk: "0", award: "1"}, {sceneKey: () => "s"});
    await RK.build(c).useEdge(h);
    return c.seen;
  };
  aim(null);
  const off = await run();
  aim(seeker);
  const on = await run();
  assert.equal(off.rolls.at(-1)?.difficulty, 6, JSON.stringify(off.notes ?? []));
  assert.equal(on.rolls.at(-1)?.difficulty, 7);
  assert.match(on.cards.at(-1), /Seeker's Ward/);
});

test("B6662: a fomor power counts the ward only when it is aimed at someone", async () => {
  const FP = await imp("modules/wodx-actions/scripts/fomor-powers.js");
  const by = k => FP.BY_KEY[k];
  for ( const k of Object.keys(FP.BY_KEY) ) {
    const p = by(k);
    if ( p.self || p.sense || p.numbing ) assert.equal(FP.aimedAtOther(p), false, `${p.name} works on the fomor or around it`);
  }
  assert.ok(Object.values(FP.BY_KEY).some(p => FP.aimedAtOther(p) && p.drain), "a drain is aimed");
  assert.ok(Object.values(FP.BY_KEY).some(p => FP.aimedAtOther(p) && p.keywords.includes("sway")), "a sway is aimed");
  assert.equal(FP.aimedAtOther(null), false);
});

test("B6662: every line's targeted power roll reads targetResist, as the B6411 lines do", () => {
  const S = "modules/wodx-actions/scripts/";
  const wired = {"kote.js": 1, "mage-da.js": 1, "fae-da.js": 1, "mummy.js": 1, "orpheus.js": 1, "hunter.js": 3, "reckoning.js": 1, "fomor.js": 1};
  for ( const [f, k] of Object.entries(wired) ) {
    const s = src(S + f);
    assert.match(s, /import \* as TH from "\.\/trait-hooks\.js";/, f);
    assert.equal((s.match(/TH\.targetResist\(actor, \["magic"\]\)/g) ?? []).length, k, f);
    assert.equal((s.match(/\/\/ B6662: /g) ?? []).length, k, f);
    assert.match(s, /rm\.parts/, `${f}: the ward is named on the card`);
  }
  assert.match(src(S + "fomor.js"), /FP\.aimedAtOther\(p\) \? TH\.targetResist/);
});

test("B6663: conditionMods sums Drained and the rest, sight-only ones only on sight", () => {
  const a = actor("Roller", {conds: [{id: "drained", name: "Drained", mods: {ownDiff: 1}}, {id: "blurred-sight", name: "Blurred sight", mods: {ownDiffVision: 2}}]});
  assert.deepEqual(LIM.conditionMods(a), {diff: 1, parts: ["Drained +1 difficulty"]});
  assert.deepEqual(LIM.conditionMods(a, {sight: true}), {diff: 3, parts: ["Drained +1 difficulty", "Blurred sight +2 difficulty on sight"]});
});

test("B6663: Drained makes a Persuade from \"With this person\" one harder, named on the card", async () => {
  const SO = await imp("modules/wodx-actions/scripts/social.js");
  const R = await imp("modules/wodx-actions/scripts/rules.js");
  const SR = await imp("modules/wodx-actions/scripts/social-rules.js");
  globalThis.ChatMessage = {create: async () => null};
  const pc = actor("Talker", {kind: "mortal"}), npc = actor("Mark", {kind: "mortal"});
  const run = async () => {
    const c = ctxFor(null, {R, PRESETS: SR.PRESETS ?? {persuadeNpc: {diff: 6}}, setting: () => false, road: () => ({value: 7}), woundPenalty: () => 0,
      willpower: () => ({temp: 3, perm: 3}), opts: () => "", kindOf: () => "mortal",
      pickPool: () => ({attr: "manipulation", abilityId: "expression", abilityName: "Expression"}),
      readPool: () => ({attribute: 3, attributeLabel: "Manipulation", ability: 2, abilityLabel: "Expression", abilityType: "talent", abilityKey: "expression"}),
      opponentPool: () => ({dice: 3, diff: 6, label: "Willpower"})});
    await SO.build(c).social(pc, {actor: npc, name: "Mark"}, "persuade", {bonus: 0, extraDiff: 0, specialty: false, wp: false, aura: false, offer: "fair", offerText: ""});
    return {diff: c.seen.rolls[0]?.difficulty, card: c.seen.cards.at(-1) ?? ""};
  };
  const off = await run();
  pc.conds = [{id: "drained", name: "Drained", mods: {ownDiff: 1}}];
  const on = await run();
  pc.conds = [];
  assert.equal(on.diff, off.diff + 1);
  assert.match(on.card, /Drained \+1 difficulty/);
  assert.doesNotMatch(off.card, /Drained/);
});

test("B6663: the social rolls and the feeding rolls take the conditions", () => {
  const so = src("modules/wodx-actions/scripts/social.js");
  assert.match(so, /conditionMods\(actor, \{ sight: needsSight\(\{ attr \}\) \}\)/);
  assert.equal((so.match(/const cm = condMods\(actor, pick\.attr\);/g) ?? []).length, 3, "persuade and the like, look over, lift and plant");
  assert.match(so, /traitDiff: \(tm\.diff \?\? 0\) \+ cm\.diff, traitParts: \[\.\.\.\(tm\.parts \?\? \[\]\), \.\.\.\(curse \? \[`The Curse −\$\{curse\}`\] : \[\]\), \.\.\.cm\.parts\]/);
  assert.equal((so.match(/traitDiff: cm\.diff, traitParts: cm\.parts/g) ?? []).length, 2);
  const m = src("modules/wodx-actions/scripts/main.js");
  const feed = m.slice(m.indexOf("async function feedResolve"), m.indexOf("async function nagarajaPenalty"));
  assert.match(feed, /cm = LIM\.conditionMods\(actor, \{ sight: false \}\)/);
  assert.equal((feed.match(/await ownRoll\(/g) ?? []).length, 6, "spotting, resisting, the two laws, Hunger, addiction");
  // the vessel's own rolls are the vessel's, not the feeder's
  assert.match(feed, /await rollPool\(risk\.dice, risk\.difficulty\)/);
});

test("B6664: a social sheet roll counts socialDice and socialDiff, named; another roll does not", async () => {
  const RR = await imp("modules/wodx-sheets/scripts/sheet-roll-rules.mjs");
  const grieving = {id: "grieving", name: "Grieving", mods: {socialDice: -1}};
  const ravenous = {id: "ravenous", name: "Ravenous", mods: {ownDiff: 1, socialDiff: 1}};
  assert.deepEqual(RR.combine({conditions: [grieving], social: true}), {dice: -1, diff: 0, parts: ["Grieving -1 dice"]});
  assert.deepEqual(RR.combine({conditions: [grieving]}), {dice: 0, diff: 0, parts: []});
  assert.deepEqual(RR.combine({conditions: [ravenous], social: true}), {dice: 0, diff: 2, parts: ["Ravenous +2 diff"]});
  assert.deepEqual(RR.combine({conditions: [{name: "Both", mods: {socialDice: -1, socialDiff: 1}}], social: true}).parts, ["Both -1 dice, +1 diff"]);
  // the trait table's own tags decide, as WoDX Actions' social rolls read them
  const T = await imp("modules/wodx-chronicle/scripts/trait-rules.mjs");
  assert.equal(RR.isSocial(T.rollTags("charisma", null)), true);
  assert.equal(RR.isSocial(T.rollTags("wits", "subterfuge")), true);
  assert.equal(RR.isSocial(T.rollTags("dexterity", "athletics")), false);
  assert.match(src("modules/wodx-sheets/scripts/sheet-rolls.mjs"), /social: RR\.isSocial\(tags\)/);
  const H = src("modules/wodx-npc/scripts/hearts.mjs");
  assert.match(H, /mods: \{socialDice: -1\}/, "Grieving is still a social die");
});
