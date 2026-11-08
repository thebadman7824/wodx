/**
 * UI-fit check (rule B17). Renders every WoDX window with Foundry's real stylesheet in Chromium, at common screen
 * sizes, and checks that every control can be reached and that footer buttons are visible without scrolling.
 *
 * Usage: node ui-fit.mjs <path to Foundry's foundry2.css> [outDir for screenshots]
 */
import {createRequire} from "node:module";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
import {writeFileSync, mkdirSync, existsSync} from "node:fs";
import {installMock} from "./foundry-mock.mjs";

const require = createRequire(import.meta.url);
const {chromium} = require("playwright");
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const foundryCss = process.argv[2];
const outDir = process.argv[3] ?? null;
if ( !foundryCss || !existsSync(foundryCss) ) {
  console.error("Give the path to Foundry's public/css/foundry2.css");
  process.exit(2);
}

/* ---- Render each window's markup with the stand-in for Foundry ---- */
const mock = installMock({dataRoot: root});
class Field { constructor(options = {}) { this.options = options; } }
foundry.data.fields = {StringField: Field, NumberField: Field, BooleanField: Field};
foundry.data.regionBehaviors = {RegionBehaviorType: class {}};
CONFIG.RegionBehavior = {dataModels: {}, typeLabels: {}, typeHints: {}, typeIcons: {}};
CONFIG.statusEffects = [];
// A world the size of Rothenstein: 211 scenes
class Coll extends Map { find(f) { for ( const v of this.values() ) if ( f(v) ) return v; } [Symbol.iterator]() { return this.values(); } }
game.scenes = new Coll();
for ( let i = 0; i < 211; i++ ) {
  const id = `scene${String(i).padStart(11, "0")}`;
  game.scenes.set(id, {id, name: i % 3 ? `⚔ BATTLEMAP · Locus · A Very Long Scene Name Number ${i}` : `Lower Town · Place ${i}`,
    flags: {}, regions: [], getFlag(s, k) { return this.flags?.[s]?.[k]; }});
  // Thirty world maps with twin art, for the twin levels window
  if ( i < 30 ) {
    const lv = {id: `${id}L`, name: "Ground", elevation: {bottom: 0, top: 20, base: 0}, background: {src: `maps/m${i}.webp`}, flags: {}, getFlag() { return undefined; }};
    const s = game.scenes.get(id);
    s.levels = new Coll([[lv.id, lv]]);
    s.tiles = Array.from({length: 6}, (_, k) => ({id: `${id}t${k}`, texture: {src: `maps/roofs/m${i}--0${k}.webp`}, levels: new Set(), getFlag() {}}));
    s.lights = [];
  }
}
const twinManifest = {files: Object.fromEntries(Array.from({length: 30}, (_, i) => [`maps/m${i}.webp`, {penumbra: `t/m${i}--penumbra.webp`, shadowlands: `t/m${i}--shadowlands.webp`}]))};
await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
await import(join(root, "modules/wodx-otherworlds/scripts/main.mjs"));
await import(join(root, "modules/wodx-creation/scripts/main.mjs"));
game.modules.set("wodx-otherworlds", {});
game.modules.set("wodx-creation", {});
// WoDX Actions and WoDX Combat (Phase 6a), with the VtDA20 modules off
class MacroColl extends Map { find(f) { for ( const v of this.values() ) if ( f(v) ) return v; } [Symbol.iterator]() { return this.values(); } }
game.macros = new MacroColl();
globalThis.Macro = {create: async d => { game.macros.set(d.name, d); return d; }};
CONST.DOCUMENT_OWNERSHIP_LEVELS ??= {NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3};
game.release = {generation: 14};
game.system.id = "worldofdarkness";
game.data = {settings: []};
for ( const id of ["vtda20-actions", "vtda20-combat"] ) game.modules.set(id, {active: false});
game.modules.set("wodx-actions", {});
game.modules.set("wodx-combat", {});
await import(join(root, "modules/wodx-combat/scripts/main.js"));
await import(join(root, "modules/wodx-actions/scripts/main.js"));
CONFIG.worldofdarkness.groupKinds = {coterie: "Coterie (Vampire)", pack: "Pack (Werewolf and Fera)", cabal: "Cabal (Mage)", motley: "Motley (Changeling)",
  circle: "Circle (Wraith)", cell: "Cell (Hunter)", court: "Court (Demon)", amenti: "Amenti (Mummy)", wu: "Wu (Kindred of the East)",
  crucible: "Crucible (Orpheus)", household: "Household or retinue (mortals)", other: "Other"};
// Characters for the Creation windows: a long sheet, so the spend window must scroll
class Items extends Map { filter(f) { return [...this.values()].filter(f); } some(f) { return [...this.values()].some(f); } find(f) { return [...this.values()].find(f); } [Symbol.iterator]() { return this.values(); } }
const attr = v => ({value: v, max: 5, label: "", isvisible: true});
function uiActor(i, type, variant = "general") {
  const items = new Items();
  for ( const [n, v] of [["Dominate", 2], ["Obtenebration", 1], ["Potence", 3], ["Auspex", 0]] ) items.set(`p${i}${n}`, {id: `p${i}${n}`, name: n, type: "Power", system: {type: "wod.types.discipline", value: v}});
  for ( let k = 0; k < 6; k++ ) items.set(`t${i}${k}`, {id: `t${i}${k}`, name: `Secondary Knowledge ${k}`, type: "Trait", system: {type: "wod.types.knowledgesecondability", value: 1}});
  items.set(`x${i}`, {id: `x${i}`, name: "Award", type: "Experience", system: {amount: 40, isspent: false}});
  const attributes = Object.fromEntries(["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"].map(k => [k, {...attr(2), label: k}]));
  const abilities = Object.fromEntries(Array.from({length: 30}, (_, k) => [`ab${k}`, {value: 1, max: 5, label: `Ability number ${k}`, isvisible: true}]));
  return {id: `actor${String(i).padStart(11, "0")}`, name: `${type} character with a fairly long name ${i}`, type,
    hasPlayerOwner: i % 2 === 0, isOwner: true, items, flags: {}, ownership: {default: 3},
    system: {settings: {variant}, clan: "custom", custom: {clan: "Lasombra"}, generation: 10, generationmod: 0, attributes, abilities,
      advantages: {willpower: {permanent: 5}, path: {permanent: 6, label: "custom", custom: "Road of Humanity"},
        virtues: {conscience: {permanent: 3, label: "Conscience"}, selfcontrol: {permanent: 3, label: "Self-Control"}, courage: {permanent: 3, label: "Courage"}}}},
    getFlag(s, k) { return this.flags?.[s]?.[k]; }, testUserPermission: () => true};
}
for ( let i = 0; i < 24; i++ ) { const a = uiActor(i, i % 3 === 0 ? "Vampire" : "Mortal", i % 3 === 1 ? "ghoul" : "general"); game.actors.set(a.id, a); }
await Hooks.callAll("init");
mock.setupTime();
await Hooks.callAll("ready");
await mock.settle();
// Some approvals waiting, so the queue window has content
const chronicle = game.modules.get("wodx-chronicle").api;
for ( let i = 0; i < 8; i++ ) await chronicle.propose({type: "request", title: `Request ${i}: a long request title to see wrapping`, detail: "Details ".repeat(30)});

const {ClockApp} = await import(join(root, "modules/wodx-chronicle/scripts/clock-app.mjs"));
const {ApprovalsApp} = await import(join(root, "modules/wodx-chronicle/scripts/approvals.mjs"));
const {HouseRulesApp} = await import(join(root, "modules/wodx-chronicle/scripts/house-rules-app.mjs"));
const {TaggingApp} = await import(join(root, "modules/wodx-otherworlds/scripts/tagging-app.mjs"));
const {CreationApp, SpendApp, awardDialog} = await import(join(root, "modules/wodx-creation/scripts/apps.mjs"));
const spendActor = [...game.actors.values()].find(a => a.type === "Vampire");
const {PassYearsApp} = await import(join(root, "modules/wodx-creation/scripts/pass-years.mjs"));
const timeMod = await import(join(root, "modules/wodx-creation/scripts/time.mjs"));
// The window with a plan on show: every character has changes to tick
const {TwinsApp} = await import(join(root, "modules/wodx-otherworlds/scripts/twins-app.mjs"));
class LoadedTwinsApp extends TwinsApp { constructor(o) { super(o); this.manifest = twinManifest; } }
class PlannedPassYears extends PassYearsApp {
  constructor(o) { super(o); this.plan = timeMod.planSkip({from: game.time.worldTime, to: timeMod.addYears(game.time.worldTime, 150)}); }
}

const windows = [];
for ( const [name, App, opts] of [["Chronicle Clock", ClockApp, {}], ["Approval queue", ApprovalsApp, {}],
  ["House rules", HouseRulesApp, {}], ["Otherworld ratings by scene", TaggingApp, {}],
  ["Creation and experience", CreationApp, {}], ["Spend experience", SpendApp, {id: "wodx-spend-test", actor: spendActor}],
  ["Pass the years", PlannedPassYears, {}], ["Penumbra and Shadowlands levels", LoadedTwinsApp, {}]] ) {
  const app = new App(opts);
  await app.render({force: true});
  const content = app.element.querySelector("section.window-content").innerHTML;
  const o = App.DEFAULT_OPTIONS;
  const pos = {...o.position, ...(opts.position ?? {})};
  windows.push({name, tag: o.tag ?? "div", classes: ["application", ...(o.classes ?? [])].join(" "), width: pos.width, height: pos.height, content});
}

{
  // The Group sheet, with 8 members and 7 pooled Backgrounds
  foundry.applications.sheets = {ActorSheetV2: class extends foundry.applications.api.ApplicationV2 { constructor(o = {}) { super(o); this.document = o.document; } }};
  const G = await import(join(root, "modules/wodx-creation/scripts/group-sheet.mjs"));
  const Sheet = G.makeGroupSheet();
  const members = [...game.actors.values()].slice(0, 8);
  const g = {id: "group0000000001", name: "The Coterie of the Silver Adit, with a fairly long name", type: "Group", isOwner: true, flags: {},
    system: {kind: "coterie", anchorId: "b0", notes: "Notes ".repeat(40),
      roster: members.map((a, i) => ({actorId: a.id, role: i ? "Member" : "Leader", joined: 0, left: null})),
      backgrounds: ["Allies", "Contacts", "Domain", "Herd", "Influence", "Resources", "Retainers"].map((n, i) => ({id: `b${i}`, name: n, note: "",
        contributions: Object.fromEntries(members.map(a => [a.id, 1]))}))},
    async update() { return this; }};
  const sheet = new Sheet({document: g});
  await sheet.render({force: true});
  const o = Sheet.DEFAULT_OPTIONS;
  windows.push({name: "Group sheet", tag: "div", classes: ["application", "sheet", ...(o.classes ?? [])].join(" "), width: o.position.width, height: o.position.height,
    content: sheet.element.querySelector("section.window-content").innerHTML});
}

/* ---- Dialogs: capture what each WoDX dialog would show ---- */
const captured = [];
const api = foundry.applications.api;
api.DialogV2.prompt = async config => { captured.push(config); return null; };
api.DialogV2.confirm = async config => { captured.push(config); return null; };
const {recordLineOrVeil} = await import(join(root, "modules/wodx-chronicle/scripts/journals.mjs"));
for ( let i = 0; i < 60; i++ ) await recordLineOrVeil({kind: i % 2 ? "veil" : "line", text: `Entry ${i}: ${"a long line of text ".repeat(4)}`, by: null});
const safety = await import(join(root, "modules/wodx-chronicle/scripts/safety.mjs"));
const {setDateDialog} = await import(join(root, "modules/wodx-chronicle/scripts/clock-app.mjs"));
await safety.manageLinesVeils();
await safety.submitLineOrVeil();
await chronicle.approvals.askStoryteller();
await setDateDialog();
await chronicle.runEraTest();
// Step sideways needs a selected Garou on a scene
const scene = [...game.scenes][0];
const actor = {name: "Test Garou", type: "Werewolf", items: [], statuses: new Set(), system: {advantages: {gnosis: {roll: 4}}}, getFlag() {}};
globalThis.canvas = {tokens: {controlled: [{document: {name: "Test Garou", actor, parent: scene, regions: new Set()}}]}, scene};
CONFIG.worldofdarkness.sheettype.changingbreed = "Changing Breed";
const ow = await import(join(root, "modules/wodx-otherworlds/scripts/crossing.mjs"));
await ow.stepSideways({mode: "cross"});
globalThis.game.user.targets = new Set([{document: {name: "Target", actor: {name: "Target", type: "Mortal", getFlag() {}}}}]);
const senses = await import(join(root, "modules/wodx-otherworlds/scripts/senses.mjs"));
await senses.readTheSoul({reader: canvas.tokens.controlled[0].document, target: {name: "Target", actor: {name: "Target", type: "Mortal", getFlag() {}}}});
await senses.editAura({name: "Sister Agnes", type: "Mortal", system: {}, getFlag() {}});
await ow.crossShroud();
const tw = await import(join(root, "modules/wodx-otherworlds/scripts/twins.mjs"));
const twinned = {...scene, levels: new Coll([["a", {id: "a", getFlag: () => "penumbra", flags: {}}]]), tiles: [], lights: [], tokens: [], unsetFlag() {}};
await tw.removeTwins(twinned);
const {buildPenumbraPrototype} = await import(join(root, "modules/wodx-otherworlds/scripts/prototype.mjs"));
await buildPenumbraPrototype(scene);
const change = await import(join(root, "modules/wodx-creation/scripts/change-of-state.mjs"));
await change.embraceDialog();
await change.vitaeDialog();
// The First Change needs WoDX Actions' rules: load them on their own here (game.wodxActions comes later)
{
  const GX = await import(join(root, "modules/wodx-actions/scripts/garou.js"));
  await GX.loadData();
  const keep = game.wodxActions;
  game.wodxActions = {garouRules: GX, gifts: () => GX.gifts(), giftItem: g => GX.giftItem(g)};
  const fc = await import(join(root, "modules/wodx-creation/scripts/first-change.mjs"));
  await fc.firstChangeDialog();
  game.wodxActions = keep;
}
await awardDialog();
const {runSkipTest} = await import(join(root, "modules/wodx-creation/scripts/skip-test.mjs"));
// The test only runs in the template world
const worldId = game.world.id;
game.world.id = "wodx-template";
await runSkipTest();
game.world.id = worldId;
// WoDX Actions and Combat build their dialogs with new DialogV2(...): capture those too
{
  const Orig = api.DialogV2;
  class CaptureDialog extends Orig {
    constructor(cfg) { super(); captured.push(cfg); this.cfg = cfg; }
    render() { return Promise.resolve(this); }
    addEventListener() {}
    close() {}
  }
  api.DialogV2 = CaptureDialog;
  const actor = [...game.actors.values()].find(a => a.type === "Vampire");
  const target = [...game.actors.values()].find(a => a.type === "Mortal");
  Object.assign(actor, {getActiveTokens: () => [], uuid: `Actor.${actor.id}`, effects: [], statuses: new Set(), update: async () => actor, setFlag: async () => actor});
  Object.assign(target, {getActiveTokens: () => [], uuid: `Actor.${target.id}`, effects: [], statuses: new Set()});
  for ( let i = 0; i < 8; i++ ) actor.items.set(`w${i}`, {id: `w${i}`, name: `Sword of a long name ${i}`, type: "Melee Weapon", system: {isequipped: i === 0, damage: {attribute: "strength", bonus: 2, type: "lethal"}, difficulty: 6, attack: {attribute: "dexterity", ability: "melee"}}});
  globalThis.canvas = {tokens: {controlled: [{actor, document: {actor}}]}, scene};
  game.user.targets = new Set([{actor: target, document: {actor: target}}]);
  game.user.character = actor;
  const tries = [["Attack", () => game.wodxCombat.attack({attacker: actor, target})], ["Soak & Apply", () => game.wodxCombat.soakDialog()],
    ["Actor type", () => game.wodxCombat.pickKind(actor)], ["Actions menu", () => game.wodxActions.menu({actor})],
    ["Action", () => game.wodxActions.action({actor})], ["Hunt", () => game.wodxActions.hunt({actor})], ["Spend blood", () => game.wodxActions.spendBlood({actor})],
    ["Frenzy", () => game.wodxActions.frenzy({actor})], ["Rötschreck", () => game.wodxActions.rotschreck({actor})],
    ["Blood Oath", () => game.wodxActions.bloodOath({actor})], ["Torpor", () => game.wodxActions.torpor({actor})], ["Hazard", () => game.wodxActions.hazard({actor})],
    ["Sin", () => game.wodxActions.sin({actor})], ["Willpower uses", () => game.wodxActions.uses({actor, resource: "willpower"})],
    ["Migration", () => game.wodxActions.migrate()]];
  // 3.2.0: a Cainite with many Disciplines and a path; the Road, downtime, healing, prestation and Masquerade dialogs
  for ( const [d, v] of [["Dominate", 5], ["Auspex", 5], ["Obfuscate", 5], ["Presence", 5], ["Animalism", 5], ["Celerity", 3], ["Fortitude", 3], ["Potence", 2], ["Path of Bone", 5], ["Potestas Vitae", 3]] )
    actor.items.set(`d${d}`, {id: `d${d}`, name: d, type: "Power", system: {type: d.startsWith("Path") || d.startsWith("Potestas") ? "wod.types.disciplinepath" : "wod.types.discipline", value: v}, getFlag: () => undefined});
  actor.getFlag ??= () => undefined;
  tries.push(["Use a Discipline", () => game.wodxActions.useDiscipline({actor})], ["Road", () => game.wodxActions.setRoad({actor})],
    ["Downtime", () => game.wodxActions.downtime({actor})], ["Healing", () => game.wodxActions.healing({actor: target})],
    ["Prestation", () => game.wodxActions.boons({actor})], ["Masquerade", () => game.wodxActions.masquerade({actor})],
    ["Sun and haven", () => game.wodxActions.sunAndHaven({actor})], ["Sky and sun", () => game.wodxActions.skyAndSun()]);
  // Phase 6b: a Dark Ages Garou with a full hand of Gifts, a fetish, a talen and a rite; Kinfolk and the First Change
  {
    const GX = await import(join(root, "modules/wodx-actions/scripts/garou.js"));
    await GX.loadData();
    const wolf = {system: JSON.parse(JSON.stringify(actor.system ?? {})), flags: {}};
    Object.assign(wolf, {id: "wolf00000000001", uuid: "Actor.wolf00000000001", name: "Wilhelm Eisenfang, a Garou with a fairly long name", type: "Werewolf",
      getActiveTokens: () => [], effects: [], statuses: new Set(), update: async () => wolf, setFlag: async () => wolf, getFlag: () => undefined, isOwner: true,
      items: new Map()});
    wolf.items.find = f => [...wolf.items.values()].find(f);
    wolf.items.filter = f => [...wolf.items.values()].filter(f);
    wolf.items.some = f => [...wolf.items.values()].some(f);
    wolf.system = {...wolf.system, breed: "wod.bio.breedname.homid", auspice: "wod.bio.auspicename.ahroun", tribe: "custom", custom: {tribe: "Fenrir"},
      shapes: Object.fromEntries(["homid", "glabro", "crinos", "hispo", "lupus"].map(k => [k, {isactive: k === "homid", label: k}])),
      advantages: {...wolf.system.advantages, rage: {permanent: 5, temporary: 4}, gnosis: {permanent: 3, temporary: 3}, willpower: {permanent: 4, temporary: 4}},
      renown: {rank: 2, glory: {permanent: 4, temporary: 10}, honor: {permanent: 1, temporary: 0}, wisdom: {permanent: 0, temporary: 0}},
      health: {damage: {bashing: 1, lethal: 1, aggravated: 0}}, conditions: {isfrenzy: true}};
    for ( const g of GX.gifts().slice(0, 12) ) { const it = GX.giftItem(g); it.id = `g${g.id}`.slice(0, 16); it.getFlag = (s, k) => it.flags?.[s]?.[k]; wolf.items.set(it.id, it); }
    for ( const [k, d] of [["f1", {name: "Fang Dagger", type: "Fetish", system: {gnosis: 5}}], ["f2", {name: "Moon Bridge Pebble", type: "Fetish", system: {type: "wod.types.talen", gnosis: 4}}],
      ["r1", {name: "Rite of Cleansing", type: "Power", system: {type: "wod.types.rite", level: 1}}]] ) wolf.items.set(k, {id: k, ...d, getFlag: () => undefined});
    game.actors.set(wolf.id, wolf);
    game.time ??= {worldTime: 0};
    const ga = game.wodxActions;
    tries.push(["Garou menu", () => ga.menu({actor: {actor: wolf}})], ["Change form", () => ga.shiftForm({actor: {actor: wolf}})], ["Rage roll", () => ga.rageRoll({actor: {actor: wolf}})],
      ["Spend Rage", () => ga.spendRage({actor: {actor: wolf}})], ["End frenzy (Garou)", () => ga.garouEndFrenzy({actor: {actor: wolf}})], ["Rise on Rage", () => ga.remainActive({actor: {actor: wolf}})],
      ["Meditate", () => ga.meditate({actor: {actor: wolf}})], ["Use a Gift", () => ga.useGift({actor: {actor: wolf}})], ["Learn a Gift", () => ga.learnGift({actor: {actor: wolf}})],
      ["Perform a rite", () => ga.performRite({actor: {actor: wolf}})], ["Summon a spirit", () => ga.summonSpirit({actor: {actor: wolf}})], ["Fetish", () => ga.useFetish({actor: {actor: wolf}})],
      ["Accomplishment", () => ga.accomplishment({actor: {actor: wolf}})], ["Battle Scar", () => ga.battleScar({actor: {actor: wolf}})], ["Award Renown", () => ga.awardRenown()],
      ["Delirium", () => ga.delirium()], ["Kinfolk", () => ga.kinfolk({actor: {actor: target}})], ["Chiminage", () => ga.chiminage({actor: {actor: wolf}})],
      ["Regenerate", () => ga.regen({actor: {actor: wolf}})], ["Attack (Garou)", () => game.wodxCombat.attack({attacker: wolf, target})]);
  }
  // Phase 6c: a wraith with Arcanoi, Passions and Fetters; an inquisitor; a mortal with True Faith and Numina
  {
    const WX = await import(join(root, "modules/wodx-actions/scripts/wraith.js"));
    await WX.loadData();
    const mk = (id, name, type, extra, items) => {
      const a = {system: JSON.parse(JSON.stringify(actor.system ?? {})), flags: {}};
      Object.assign(a, {id, uuid: `Actor.${id}`, name, type, getActiveTokens: () => [], effects: [], statuses: new Set(), update: async () => a, setFlag: async () => a,
        getFlag: () => undefined, unsetFlag: async () => a, isOwner: true, hasPlayerOwner: true, testUserPermission: () => true, items: new Map()});
      for ( const k of ["find", "filter", "some", "map"] ) a.items[k] = f => [...a.items.values()][k](f);
      a.items[Symbol.iterator] = function () { return this.values(); };
      a.system.advantages = {...a.system.advantages, ...extra};
      for ( const [k, d] of items ) a.items.set(k, {id: k, ...d, getFlag: () => undefined, update: async () => null});
      game.actors.set(a.id, a);
      return a;
    };
    const ghost = mk("ghost0000000001", "Ada Lovelace-Byron, a wraith with a long name", "Wraith",
      {pathos: {temporary: 5, max: 10}, angst: {temporary: 6, permanent: 4, max: 10}, corpus: {temporary: 10, permanent: 10, max: 10}, willpower: {permanent: 5, temporary: 5}},
      [["w1", {name: "Argos", type: "Power", system: {type: "wod.types.arcanoi", value: 3}}], ["w2", {name: "Outrage", type: "Power", system: {type: "wod.types.arcanoi", value: 2}}],
       ["w3", {name: "Keep my daughter safe from her father", type: "Trait", system: {type: "wod.types.passion", value: 4}}],
       ["w4", {name: "The house on Rue Morgue", type: "Trait", system: {type: "wod.types.fetter", value: 3}}],
       ["w5", {name: "Hate the living (Rage)", type: "Trait", system: {type: "wod.types.darkpassion", value: 3}}]]);
    ghost.system.health = {...(ghost.system.health ?? {}), damage: {bashing: 0, lethal: 0, aggravated: 0, corpus: {bashing: 1, lethal: 1, aggravated: 0}}};
    const monk = mk("monk00000000001", "Brother Anselm of the Oculi Dei", "Hunter", {conviction: {permanent: 4, temporary: 4, max: 10}, faith: {permanent: 2},
      virtues: {...(actor.system?.advantages?.virtues ?? {}), mercy: {permanent: 1}, vision: {permanent: 1}, zeal: {permanent: 2}}},
      [["h1", {name: "Cleave", type: "Power", system: {type: "wod.types.edge", value: 1}}], ["h3", {name: "Discern", type: "Power", system: {type: "wod.types.edge", value: 1}}], ["h2", {name: "Psychometry", type: "Power", system: {type: "wod.types.numina", value: 2}}]]);
    const ga = game.wodxActions, A = o => ({actor: o});
    tries.push(["Wraith menu", () => ga.menu({actor: A(ghost)})], ["Use an Arcanos", () => ga.useArcanos({actor: A(ghost)})], ["Passion", () => ga.passion({actor: A(ghost)})],
      ["Fetter", () => ga.fetter({actor: A(ghost)})], ["Heal Corpus", () => ga.healCorpus({actor: A(ghost)})], ["The Caul", () => ga.caul({actor: A(ghost)})],
      ["The Shadow", () => ga.shadow({actor: A(ghost)})], ["Whisper", () => ga.shadowWhisper({actor: A(ghost)})], ["Shadowguide", () => ga.shadowguide({actor: A(ghost)})],
      ["Harrowing", () => ga.harrowing({actor: A(ghost)})], ["The Maelstrom", () => ga.maelstrom()], ["The inner voice", () => ga.innerVoice({actor: A(ghost)})],
      ["Hunter menu", () => ga.menu({actor: A(monk)})], ["Hunter traits", () => ga.hunterSheet({actor: A(monk)})], ["Blessing", () => ga.hunterPower({actor: A(monk)})],
      ["Virtue roll", () => ga.hunterVirtue({actor: A(monk)})], ["A sin (Piety)", () => ga.sinGod({actor: A(monk)})], ["Prayer", () => ga.prayer({actor: A(monk)})],
      ["Bank Conviction", () => ga.bankConviction({actor: A(monk)})], ["True Faith", () => ga.trueFaith({actor: A(monk)})], ["Numina", () => ga.numina({actor: A(monk)})], ["Hedge magic", () => ga.hedgeMagic({actor: A(monk)})],
      ["Ghoul blood", () => { const g = mk("ghoul0000000001", "Gretchen, a ghoul", "Mortal", {bloodpool: {temporary: 3, max: 10}}, []); return ga.ghoulBlood({actor: A(g)}); }], ["Use an edge", () => ga.useEdge({actor: A(monk)})], ["Second sight", () => ga.secondSight({actor: A(monk)})],
      ["The Imbuing", () => { const api = game.modules.get("wodx-chronicle")?.api; const old = api?.eras; if ( api ) api.eras = {...old, activeEra: () => ({profile: {id: "modern"}}), currentYear: () => 2003}; const r = ga.imbue({actor: A(monk)}); if ( api ) setTimeout(() => { api.eras = old; }, 30); return r; }]);
  }
  for ( const [label, fn] of tries ) {
    const n = captured.length;
    try { fn(); await new Promise(r => setTimeout(r, 20)); }
    catch (err) { console.error(`FAIL could not build the ${label} dialog: ${err.message}`); process.exitCode = 1; }
    if ( captured.length === n ) { console.error(`FAIL the ${label} dialog was not captured`); process.exitCode = 1; }
  }
  api.DialogV2 = Orig;
}
for ( const c of captured ) {
  windows.push({name: `Dialog · ${c.window?.title ?? "untitled"}`, tag: "div",
    classes: ["application", "dialog", ...(c.classes ?? [])].join(" "), width: c.position?.width ?? 400, height: "auto",
    content: `<form class="dialog-form standard-form">${c.content ? `<div class="dialog-content standard-form">${c.content}</div>` : ""}
      <footer class="form-footer"><button type="submit">OK</button><button type="button">Cancel</button></footer></form>`});
}
if ( captured.length < 11 ) { console.error(`Only ${captured.length} dialogs captured`); process.exit(1); }
const unclassed = captured.filter(c => !(c.classes ?? []).includes("wodx-dialog"));
if ( unclassed.length ) { console.error(`Dialogs without the wodx-dialog class: ${unclassed.map(c => c.window?.title).join(", ")}`); process.exit(1); }

/* ---- Lay them out in Chromium with Foundry's CSS ---- */
// Foundry's icons and type, when they sit beside foundry2.css (public/fonts)
const pub = join(dirname(foundryCss), "..");
const extras = ["fonts/fontawesome/css/all.min.css", "fonts/signika/signika.css"].map(f => join(pub, f)).filter(existsSync).map(f => pathToFileURL(f).href);
const css = [...extras, pathToFileURL(foundryCss).href,
  pathToFileURL(join(root, "modules/wodx-chronicle/styles/wodx-chronicle.css")).href,
  pathToFileURL(join(root, "modules/wodx-chronicle/styles/wodx-theme.css")).href,
  pathToFileURL(join(root, "modules/wodx-actions/styles/wodx-actions.css")).href,
  pathToFileURL(join(root, "modules/wodx-combat/styles/wodx-combat.css")).href,
  pathToFileURL(join(root, "modules/wodx-otherworlds/styles/wodx-otherworlds.css")).href,
  pathToFileURL(join(root, "modules/wodx-creation/styles/wodx-creation.css")).href];
const sizes = [[1280, 720], [1366, 768], [1920, 1080]];
// 6e: the WoDX look is on. WODX_KIT picks the era kit (default the Dark Ages), WODX_SCALE the text size, WODX_LOOK the look.
const {toneFor} = await import(join(root, "modules/wodx-chronicle/scripts/theme.mjs"));
const KIT = process.env.WODX_KIT ?? "dark-ages", SCALE = process.env.WODX_SCALE ?? "1", LOOK = process.env.WODX_LOOK ?? "era";
const bodyAttrs = `class="vtt game system-worldofdarkness theme-dark${LOOK === "plain" ? "" : " wodx-look"}" data-wodx-kit="${KIT}" data-wodx-look="${LOOK}" data-wodx-tone="${toneFor(KIT, LOOK)}" style="--wx-scale:${SCALE}"`;
console.log(`Look: ${LOOK}, kit ${KIT}, text ${SCALE}`);
if ( outDir ) { mkdirSync(outDir, {recursive: true}); writeFileSync(join(outDir, "windows.json"), JSON.stringify(windows)); }
const browser = await chromium.launch();
let failures = 0;
if ( outDir ) mkdirSync(outDir, {recursive: true});

for ( const [vw, vh] of sizes ) {
  for ( const w of windows ) {
    const page = await browser.newPage({viewport: {width: vw, height: vh}});
    // The ratings window sizes itself to the screen when opened (TaggingApp.open)
    if ( w.name === "Otherworld ratings by scene" ) {
      w.height = Math.max(360, Math.min(720, vh - 120));
      w.width = Math.max(480, Math.min(900, vw - 40));
    }
    // So does the spend window (SpendApp.openFor)
    if ( w.name === "Spend experience" ) w.height = Math.max(360, Math.min(640, vh - 120));
    // ...and Pass the Years (PassYearsApp.open)
    if ( w.name === "Pass the years" ) {
      w.height = Math.max(360, Math.min(720, vh - 100));
      w.width = Math.max(480, Math.min(820, vw - 40));
    }
    const html = `<!doctype html><html><head><meta charset="utf-8">${css.map(h => `<link rel="stylesheet" href="${h}">`).join("")}</head>
      <body ${bodyAttrs}>
      <${w.tag} id="app" class="${w.classes}" style="width:${w.width}px;${w.height === "auto" ? "" : `height:${w.height}px;`}left:20px;top:0">
        <header class="window-header"><h1 class="window-title">${w.name}</h1></header>
        <section class="window-content">${w.content}</section>
      </${w.tag}></body></html>`;
    const file = join(outDir ?? "/tmp", `ui-fit-${vw}x${vh}-${w.name.replace(/[\s\/]+/g, "-")}.html`);
    writeFileSync(file, html);
    await page.goto(pathToFileURL(file).href);
    // Foundry centers the window and clamps it to the screen (ApplicationV2#setPosition)
    await page.evaluate(() => {
      const el = document.getElementById("app");
      const h = el.offsetHeight;
      el.style.top = `${Math.max(0, (window.innerHeight - h) / 2)}px`;
    });
    const result = await page.evaluate(() => {
      const app = document.getElementById("app");
      const problems = [];
      const ar = app.getBoundingClientRect();
      if ( ar.bottom > window.innerHeight + 1 || ar.top < -1 ) problems.push(`window runs off screen (${Math.round(ar.top)} to ${Math.round(ar.bottom)})`);
      if ( ar.right > window.innerWidth + 1 ) problems.push(`window runs off the right edge (${Math.round(ar.right)})`);
      const reachable = el => {
        const r = el.getBoundingClientRect();
        if ( r.width === 0 || r.height === 0 ) return true; // hidden inputs
        const x = r.left + (r.width / 2);
        const y = r.top + (r.height / 2);
        const a = app.getBoundingClientRect();
        if ( x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight ) return false;
        if ( x < a.left || x > a.right || y < a.top || y > a.bottom ) return false;
        const hit = document.elementFromPoint(x, y);
        return !!hit && (hit === el || el.contains(hit) || !!el.closest("label")?.contains(hit));
      };
      // Footer buttons must be visible without scrolling
      for ( const b of app.querySelectorAll(".wodx-footer button, .form-footer button") ) {
        if ( !reachable(b) ) problems.push(`footer button "${b.textContent.trim()}" is not visible`);
      }
      // Every control must be reachable after scrolling to it
      const controls = [...app.querySelectorAll("button, input, select, textarea, summary")];
      let bad = 0;
      // scrollIntoView also scrolls overflow:hidden boxes, which a person cannot do; undo those scrolls
      const unscrollable = [app, ...app.querySelectorAll("*")].filter(e => {
        const s = getComputedStyle(e);
        return !["auto", "scroll"].includes(s.overflowY) || !["auto", "scroll"].includes(s.overflowX);
      });
      for ( const c of controls ) {
        c.scrollIntoView({block: "nearest", inline: "nearest"});
        for ( const e of unscrollable ) {
          const s = getComputedStyle(e);
          if ( !["auto", "scroll"].includes(s.overflowY) ) e.scrollTop = 0;
          if ( !["auto", "scroll"].includes(s.overflowX) ) e.scrollLeft = 0;
        }
        if ( !reachable(c) ) { bad++; if ( bad <= 3 ) problems.push(`control cannot be reached: ${c.outerHTML.slice(0, 80)}`); }
      }
      if ( bad > 3 ) problems.push(`... and ${bad - 3} more controls cannot be reached`);
      // Rule B24: a list a person picks from (more than five entries) has a search box. Fixed short choices
      // (months, Line or Veil) carry data-fixed.
      const boxes = [...app.querySelectorAll("input.wodx-search")];
      const covered = el => boxes.some(bx => { try { return el.matches(bx.dataset.search); } catch { return false; } });
      for ( const sel of app.querySelectorAll("select:not([data-fixed])") ) {
        if ( sel.options.length > 5 && !covered(sel) ) problems.push(`no search box for select[name=${sel.name}] (${sel.options.length} entries)`);
      }
      for ( const list of app.querySelectorAll("ul, ol, table") ) {
        const n = list.tagName === "TABLE" ? list.querySelectorAll(":scope > tbody > tr").length : list.querySelectorAll(":scope > li").length;
        if ( n > 5 && list.querySelector("input, select, button") && !covered(list) ) problems.push(`no search box for a ${list.tagName.toLowerCase()} of ${n} entries`);
      }
      return {problems, controls: controls.length, height: Math.round(ar.height)};
    });
    const label = `${vw}x${vh} ${w.name}`;
    if ( result.problems.length ) {
      failures++;
      console.log(`FAIL ${label}: ${result.problems.join("; ")}`);
    } else {
      console.log(`ok   ${label}: ${result.controls} controls reachable, window ${result.height}px`);
    }
    if ( outDir ) {
      await page.evaluate(() => document.querySelectorAll("*").forEach(s => { if ( s.scrollTop ) s.scrollTop = 0; }));
      await page.screenshot({path: join(outDir, `ui-fit-${vw}x${vh}-${w.name.replace(/[\s\/]+/g, "-")}.png`)});
    }
    await page.close();
  }
}
await browser.close();
console.log(failures ? `== UI fit: ${failures} window(s) FAILED` : "== UI fit: every window passed");
process.exit(failures ? 1 : 0);
