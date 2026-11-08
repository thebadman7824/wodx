/**
 * UI-fit check (rule B17). Renders every WoDX window with Foundry's real stylesheet in Chromium, at common screen
 * sizes, and checks that every control can be reached and that footer buttons are visible without scrolling.
 *
 * Usage: node ui-fit.mjs <path to Foundry's foundry2.css> [outDir for screenshots]
 */
import "./win-paths.mjs";
import {createRequire} from "node:module";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
import {writeFileSync, mkdirSync, existsSync} from "node:fs";
import {tmpdir} from "node:os";
import {installMock} from "./foundry-mock.mjs";

const require = createRequire(import.meta.url);
let chromium;
try { ({chromium} = require("playwright")); } catch {
  console.error("Playwright is not installed. On this machine run: npm install --no-save playwright (no browser download is needed; Edge or Chrome is used).");
  process.exit(2);
}
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
game.modules.set("wodx-npc", {});
await import(join(root, "modules/wodx-npc/scripts/main.mjs"));
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
// 7a: the People window with a batch rolled (twelve rows)
const {PeopleApp} = await import(join(root, "modules/wodx-creation/scripts/people.mjs"));
class RolledPeople extends PeopleApp {
  constructor(o) { super(o); this.batch = 1; this.opts.count = 12; this.opts.kind = "ghoul";
    const P = game.modules.get("wodx-creation")?.api?.people;
    this.people = Array.from({length: 12}, (_, row) => P.generate({batch: 1, row, kind: "ghoul"})); }
}
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
  ["Pass the years", PlannedPassYears, {}], ["People", RolledPeople, {}], ["Penumbra and Shadowlands levels", LoadedTwinsApp, {}]] ) {
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
    // B60: the players' toolbar buttons, with seven players
    for ( let k = 0; k < 6; k++ ) { const u = {id: `player${k}xxxxxxxxx`, name: `Player with a long name ${k}`, isGM: false}; game.users.set(u.id, u); }
    // Phase 6f: a Dark Ages Hermetic with every Pillar, Fount and a cray, Twilight and Brandings
    {
      const magus = mk("magus0000000001", "Magistra Ottilie of the Ninefold Key, Order of Hermes", "Mage", {quintessence: {temporary: 9, max: 20}}, [
        ["b1", {name: "Fount", type: "Feature", system: {type: "wod.types.background", value: 2}}], ["b2", {name: "Cray", type: "Feature", system: {type: "wod.types.background", value: 3}}],
        ["b3", {name: "Sanctum", type: "Feature", system: {type: "wod.types.background", value: 3}}]]);
      const flags = {daMage: {fellowship: "hermes", foundation: 3, pillars: {anima: 2, corona: 1, primus: 3, vires: 3}, twilight: {temp: 4, perm: 2},
        brandings: [{level: 1, text: "a faint smell of brimstone"}, {level: 2, text: "eyes like polished brass"}]}};
      magus.getFlag = (sc, k) => sc === "wodx-actions" ? flags[k] : undefined;
      tries.push(["Fellowship and Pillars", () => ga.daMage({actor: A(magus)})], ["Cast a spell (Dark Ages)", () => ga.daCast({actor: A(magus)})],
        ["Gather Quintessence", () => ga.daQuintessence({actor: A(magus)})]);
    }
    // Phase 6g: a Dark Ages firstborn of the Winter Court with every Dominion, many cantrips, oaths and Echoes
    {
      const fae = mk("faefirstborn001", "Lord Taalandryn of the Frozen Lake, firstborn of Winter", "Changeling", {}, [
        ["f1", {name: "Holdings", type: "Feature", system: {type: "wod.types.background", value: 3}}], ["f2", {name: "Sprites", type: "Feature", system: {type: "wod.types.background", value: 2}}]]);
      const dom = ["night", "dusk", "day", "dawn"], names = ["Gloom", "Hush", "Mindveil", "Still of the Night", "Sword of Ice", "Speed of the Wind", "Evening Mantle", "Candor's Light"];
      const flags = {daFae: {origin: "firstborn", court: "winter", mists: {perm: 5, temp: 4}, weaving: {perm: 3, temp: 2}, dominions: {night: 3, dusk: 2, day: 1, dawn: 1},
        cantrips: names.map((nm, k) => ({dominion: dom[k % 4], level: 1, name: nm, trait: "manipulation"})),
        lesser: ["eyes of black ice", "frost in the hair", "a voice like wind over snow"], greater: ["Monster's Mien: claws of ice"],
        echoes: [{trigger: "the sound of church bells"}, {trigger: "cold iron horseshoes over a door"}],
        oaths: [{kind: "iron", rating: 2, terms: "keeps the miller's family from the wolves through every winter", active: true}, {kind: "stone", rating: 3, terms: "the reeve's household and heirs", active: true}],
        mien: true, hiddenSince: null}};
      fae.getFlag = (sc, k) => sc === "wodx-actions" ? flags[k] : undefined;
      tries.push(["Origin and Court", () => ga.daFae({actor: A(fae)})], ["Cast a cantrip (Dark Ages)", () => ga.daCantrip({actor: A(fae)})],
        ["Unleash", () => ga.daUnleash({actor: A(fae)})], ["Counter", () => ga.daCounter({actor: A(fae)})], ["Face an Echo", () => ga.daEcho({actor: A(fae)})],
        ["The Mists", () => ga.daMists({actor: A(fae)})], ["Keep an oath", () => ga.daOath({actor: A(fae)})], ["Rest in a faerie realm", () => ga.daRest({actor: A(fae)})],
        ["Fae menu (Dark Ages)", () => ga.menu({actor: A(fae)})]);
    }
    // Phase 6h: a Changeling 20th pooka wilder with many Arts and every Realm
    {
      const arts = ["Chicanery", "Wayfare", "Primal", "Soothsay", "Metamorphosis"], realms = ["Actor", "Fae", "Nature", "Prop", "Scene", "Time"];
      const pk = mk("pooka0000000001", "Jamilah al-Taberynn, a pooka wilder of the Seelie Court", "Changeling",
        {glamour: {permanent: 5, temporary: 4}, banality: {permanent: 3, temporary: 6}, nightmare: {temporary: 4}, willpower: {permanent: 4, temporary: 4, imbalance: 1}},
        [...arts.map((a, k) => [`a${k}`, {name: a, type: "Power", system: {type: "wod.types.art", value: (k % 3) + 1}}]),
         ...realms.map((r, k) => [`r${k}`, {name: r, type: "Power", system: {type: "wod.types.realms", value: (k % 4) + 1}}])]);
      Object.assign(pk.system, {seeming: "Wilder", kith: "Pooka", antithesis: "telling the plain truth when a lie would be kinder"});
      tries.push(["Cantrip (Changeling 20th)", () => ga.c20Cantrip({actor: A(pk)})], ["Unleash an Art", () => ga.c20Unleash({actor: A(pk)})],
        ["Invoke the Wyrd", () => ga.c20Invoke({actor: A(pk)})], ["Banality trigger", () => ga.c20Trigger({actor: A(pk)})], ["Epiphany", () => ga.c20Epiphany({actor: A(pk)})],
        ["Nightmare and Bedlam", () => ga.c20Bedlam({actor: A(pk)})], ["Cold iron (Changeling 20th)", () => ga.c20ColdIron({actor: A(pk)})], ["The Mists (Changeling 20th)", () => ga.c20Mists({actor: A(pk)})]);
    }
    // Phase 6i: a Devil of long name with every lore, thralls and a full apocalyptic form
    {
      const lores = ["Lore of the Celestials", "Lore of Flame", "Lore of Radiance", "Lore of the Fundament", "Lore of Humanity", "Lore of Longing"];
      const dm = mk("demon0000000001", "Zaphriel, Messenger of the Dawn, of the House of the Heralds", "Demon",
        {faith: {permanent: 6, temporary: 5, max: 10}, torment: {permanent: 8, temporary: 3, max: 10}, willpower: {permanent: 6, temporary: 5},
         virtues: {...(actor.system?.advantages?.virtues ?? {}), conscience: {permanent: 3}, selfcontrol: {permanent: 2}, courage: {permanent: 4}}},
        lores.map((l, k) => [`l${k}`, {name: l, type: "Power", system: {type: "wod.types.lore", value: 5 - (k % 3)}}]));
      Object.assign(dm.system, {house: "wod.bio.demon.devil", faction: "wod.bio.demon.luciferan"});
      const flags = {demon: {thralls: [{name: "Detective James Wong of the Hollenbeck Division", potential: 3, offered: 1, willpower: 5},
        {name: "Sister Mary-Catherine of the Mission", potential: 4, offered: 2, willpower: 6}, {name: "Ray", potential: 2, offered: 1, willpower: 3}]}};
      dm.getFlag = (sc, k) => sc === "wodx-actions" ? flags[k] : undefined;
      tries.push(["Evoke", () => ga.demonEvoke({actor: A(dm)})], ["The apocalyptic form", () => ga.demonForm({actor: A(dm)})],
        ["Revelation", () => ga.demonRevelation({actor: A(dm)})], ["Reap Faith", () => ga.demonReap({actor: A(dm)})], ["Thralls", () => ga.demonThralls({actor: A(dm)})],
        ["A sin (Demon)", () => ga.demonSin({actor: A(dm)})], ["An act of kindness", () => ga.demonKindness({actor: A(dm)})], ["Heal with Faith", () => ga.demonHeal({actor: A(dm)})],
        ["The holy", () => ga.demonHoly({actor: A(dm)})], ["A name is spoken", () => ga.demonName({actor: A(dm)})], ["See through illusion", () => ga.demonIllusion({actor: A(dm)})],
        ["Demon menu", () => ga.menu({actor: A(dm)})]);
    }
    // Phase 6j: a Kuei-jin of the Devil-Tiger with many Disciplines
    {
      const arts = ["Black Wind", "Yin Prana", "Yang Prana", "Equilibrium", "Bone Shintai", "Flesh Shintai", "Tapestry"];
      const kj = mk("kueijin00000001", "Tanaka Hiroko, a Devil-Tiger disciple of the Quincunx of Kyoto", "Vampire",
        {yin: {permanent: 4}, yang: {permanent: 3}, yinchi: {temporary: 5}, yangchi: {temporary: 2}, hun: {permanent: 3}, po: {permanent: 4}, demonchi: {temporary: 4},
         dharma: {permanent: 3, label: "Howl of the Devil-Tiger"}, willpower: {permanent: 5, temporary: 5}},
        arts.map((a, k) => [`d${k}`, {name: a, type: "Power", system: {type: "wod.types.discipline", value: (k % 3) + 1}}]));
      kj.system.settings = {...(kj.system.settings ?? {}), variant: "kindredeast"};
      tries.push(["Feed (Kuei-jin)", () => ga.kotFeed({actor: A(kj)})], ["Spend Chi", () => ga.kotSpend({actor: A(kj)})], ["The soul", () => ga.kotNature({actor: A(kj)})],
        ["Dharma roll", () => ga.kotDharma({actor: A(kj)})], ["The Demon (Kuei-jin)", () => ga.kotDemon({actor: A(kj)})], ["Rise", () => ga.kotRise({actor: A(kj)})],
        ["Sunlight (Kuei-jin)", () => ga.kotSun({actor: A(kj)})], ["Heal (Kuei-jin)", () => ga.kotHeal({actor: A(kj)})], ["Sight and spirit", () => ga.kotSight({actor: A(kj)})],
        ["Kuei-jin setup", () => ga.kotSetup({actor: A(kj)})], ["Kuei-jin menu", () => ga.menu({actor: A(kj)})]);
    }
    // Phase 6k: a Reborn Kher-minu with every path and many spells
    {
      const paths = ["Alchemy", "Amulets", "Celestial", "Effigy", "Necromancy", "Nomenclature"];
      const sp = ["Ward of the Desert Wind", "Eye of Horus", "Breath of Shu", "Name of the Unseen", "The Scarab's Patience", "Ushabti Servant", "Elixir of the Black Land"];
      const mu = mk("mummy0000000001", "Neferet-Ankh-Hathor, a Kher-minu Tomb Watcher of the Fayum", "Mummy",
        {balance: {permanent: 4}, sekhem: {permanent: 4, temporary: 3}, willpower: {permanent: 6, temporary: 5}},
        [...paths.map((x, k) => [`p${k}`, {name: x, type: "Power", system: {type: "wod.types.hekau", value: (k % 4) + 1}}]),
         ...sp.map((x, k) => [`s${k}`, {name: x, type: "Power", system: {type: "wod.types.hekaupower", level: (k % 3) + 1}}]),
         ["b1", {name: "Ba", type: "Feature", system: {type: "wod.types.background", value: 2}}]]);
      mu.system.amenti = "Kher-minu";
      tries.push(["Hekau", () => ga.mummyCast({actor: A(mu)})], ["Regain Sekhem", () => ga.mummySekhem({actor: A(mu)})], ["Balance (Mummy)", () => ga.mummyBalance({actor: A(mu)})],
        ["An offense against Ma'at", () => ga.mummyOffense({actor: A(mu)})], ["The resurrection", () => ga.mummyResurrect({actor: A(mu)})], ["The Veil", () => ga.mummyVeil({actor: A(mu)})],
        ["The Reborn", () => ga.mummySetup({actor: A(mu)})], ["Mummy menu", () => ga.menu({actor: A(mu)})]);
    }
    // Phase 6l: an Orpheus poltergeist skimmer with many Horrors and a crucible
    {
      const hs = ["Helter Skelter", "Congeal", "Wail", "Inhabit", "Witch's Nimbus", "Puppetry"];
      const mkO = (id, nm) => { const o = mk(id, nm, "Mortal", {vitality: {permanent: 6, temporary: 5}, spite: {permanent: 4, temporary: 3}, willpower: {permanent: 7, temporary: 6}},
        hs.map((x, k) => [`h${k}`, {name: x, type: "Power", system: {type: "wod.types.horror", value: (k % 3) + 1}}]));
        o.system.settings = {...(o.system.settings ?? {}), variant: "orpheus", hasvitality: true, hasspite: true}; o.system.variant = {shade: "Poltergeist", lament: "Skimmer", role: "Bicycle messenger"}; o.system.nature = "Critic"; return o; };
      const op = mkO("orpheus00000001", "Craig Whitmore-Delacroix, a Poltergeist skimmer of the Orpheus Group");
      for ( let k = 0; k < 6; k++ ) mkO(`orpheus0000001${k}`, `Crucible-mate with a long name number ${k}`);
      tries.push(["A Horror", () => ga.orphHorror({actor: A(op)})], ["Vitality", () => ga.orphVitality({actor: A(op)})], ["Harm to the spook", () => ga.orphHarm({actor: A(op)})],
        ["Spite", () => ga.orphSpite({actor: A(op)})], ["Projection", () => ga.orphProject({actor: A(op)})], ["Orpheus menu", () => ga.menu({actor: A(op)})]);
    }
    // Phase 6m: a Mage 20th Hermetic with every Sphere
    {
      const zm = mk("m20mage00000001", "Dr. Eleanor Vasquez-Albright, adept of House Tytalus", "Mage", {arete: {permanent: 4}, willpower: {permanent: 6, temporary: 6}}, [["av", {name: "Avatar", type: "Feature", system: {type: "wod.types.background", value: 3}}]]);
      zm.system.spheres = Object.fromEntries(["correspondence", "entropy", "forces", "life", "matter", "mind", "prime", "spirit", "time"].map((k, x) => [k, {value: (x % 4) + 1}]));
      zm.system.quintessence = {temporary: 5}; zm.system.paradox = {temporary: 3, permanent: 0};
      tries.push(["Cast an Effect (Mage 20th)", () => ga.m20Cast({actor: A(zm)})], ["Paradox backlash", () => ga.m20Backlash({actor: A(zm)})], ["Countermagick", () => ga.m20Counter({actor: A(zm)})]);
    }
    tries.push(["Player toolbar buttons", () => game.modules.get("wodx-chronicle").api.openPlayerTools()]);
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
// Phase 7b: an NPC's behaviour window and the scene's NPC panel (nine NPCs of long names)
{
  const npcApi = game.modules.get("wodx-npc").api;
  const wait = api.DialogV2.wait;
  api.DialogV2.wait = async cfg => { captured.push(cfg); return null; };
  const npc = [...game.actors.values()].find(a => a.type === "Vampire" && !a.hasPlayerOwner) ?? [...game.actors.values()][1];
  Object.assign(npc, {hasPlayerOwner: false, setFlag: async () => npc, unsetFlag: async () => npc, getFlag: () => undefined});
  const toks = Array.from({length: 9}, (_, k) => ({id: `npctok${k}`, name: `${npc.name} ${k}`, actor: npc, document: {hidden: false, disposition: -1}}));
  const sceneMock = {getFlag: () => undefined, setFlag: async () => null, unsetFlag: async () => null};
  const oldCanvas = globalThis.canvas;
  globalThis.canvas = {...(oldCanvas ?? {}), scene: sceneMock, tokens: {placeables: toks, get: id => toks.find(t => t.id === id), controlled: []}};
  for ( const [label, fn] of [["NPC behaviour", () => npcApi.editBehavior(npc)], ["NPC panel", () => npcApi.openNpcPanel()]] ) {
    const n = captured.length;
    try { await fn(); } catch (err) { console.error(`FAIL could not build the ${label} window: ${err.message}`); process.exitCode = 1; }
    if ( captured.length === n ) { console.error(`FAIL the ${label} window was not captured`); process.exitCode = 1; }
  }
  globalThis.canvas = oldCanvas;
  api.DialogV2.wait = wait;
}
// Phase 7c: the Places window (211 scenes, 40 of them tagged, 9 regions in view), an NPC's routine and matching owners
{
  const npcApi = game.modules.get("wodx-npc").api;
  const wait = api.DialogV2.wait;
  api.DialogV2.wait = async cfg => { captured.push(cfg); return null; };
  let k = 0;
  for ( const s of game.scenes ) { s.uuid = `Scene.${s.id}`; if ( k++ % 5 === 0 ) s.flags["wodx-npc"] = {place: {kind: "home", owner: `Owner ${k}`}}; }
  const regions = new Coll(Array.from({length: 9}, (_, i) => [`reg${i}`, {id: `reg${i}`, uuid: `Scene.x.Region.reg${i}`, name: `A region with a long name ${i}`, flags: i % 2 ? {"wodx-npc": {place: {kind: "gate"}}} : {}}]));
  const viewed = {id: "viewed", uuid: "Scene.viewed", name: "Lower Town · Market Square", regions, flags: {}, getFlag: () => undefined};
  const oldCanvas = globalThis.canvas;
  globalThis.canvas = {...(oldCanvas ?? {}), scene: viewed};
  const Places = npcApi.routines.PlacesAppClass();
  const app = new Places({});
  await app.render({force: true});
  const o = Places.DEFAULT_OPTIONS;
  windows.push({name: "WoDX places", tag: o.tag ?? "div", classes: ["application", ...(o.classes ?? [])].join(" "), width: o.position.width, height: o.position.height,
    content: app.element.querySelector("section.window-content").innerHTML});
  const npc = [...game.actors.values()].find(a => !a.hasPlayerOwner) ?? [...game.actors.values()][1];
  const saved = npc.flags;
  npc.flags = {...(npc.flags ?? {}), "wodx-npc": {routine: {on: true, preset: "priest", roles: {}}}};
  npc.name = "Father Ludovic of the Church of St. Aegidius";
  for ( const [label, fn] of [["NPC routine", () => npcApi.editRoutine(npc)]] ) {
    const n = captured.length;
    try { await fn(); } catch (err) { console.error(`FAIL could not build the ${label} window: ${err.message}`); process.exitCode = 1; }
    if ( captured.length === n ) { console.error(`FAIL the ${label} window was not captured`); process.exitCode = 1; }
  }
  // Match owners: twelve NPCs named after tagged places' owners
  for ( let i = 1; i <= 12; i++ ) game.actors.set(`own${i}`, {id: `own${i}`, name: `Owner ${i * 5 - 4}`, hasPlayerOwner: false, flags: {}});
  {
    const n = captured.length;
    try { await npcApi.routines.matchOwners(); } catch (err) { console.error(`FAIL could not build the Match owners window: ${err.message}`); process.exitCode = 1; }
    if ( captured.length === n ) { console.error("FAIL the Match owners window was not captured"); process.exitCode = 1; }
  }
  npc.flags = saved;
  globalThis.canvas = oldCanvas;
  api.DialogV2.wait = wait;
}
// Phase 7d: the Factions window (ten factions of long names, five rumours), a faction's editor, hunting, a report, settings
{
  const npcApi = game.modules.get("wodx-npc").api;
  const Fx = npcApi.factions;
  const wait = api.DialogV2.wait;
  api.DialogV2.wait = async cfg => { captured.push(cfg); return null; };
  const ids = Array.from({length: 10}, (_, i) => `fac${i}`);
  const people = [...game.actors.values()];
  await Fx.mutate(st => {
    st.factions = ids.map((id, i) => ({id, name: `A faction with a rather long name, number ${i}`, kind: Object.keys(Fx.rules.KINDS)[i % 12], ruler: i === 0, leader: people[i]?.id ?? null,
      members: people.slice(i, i + 3).map(a => a.id), places: [`Scene.scene${String(i * 5).padStart(11, "0")}`],
      assets: {herd: i % 5, resources: 2, status: (i + 1) % 6, retainers: 1, contacts: 2, domain: 2, security: 1, influence: {church: 2, crown: 1, guild: i % 4}},
      standing: Object.fromEntries(ids.filter(x => x !== id).slice(0, 4).map((x, k) => [x, k - 2])), goals: [{move: "expand", sphere: "guild"}, {move: "scheme", target: ids[(i + 1) % 10]}]}));
    st.breaches = Array.from({length: 5}, (_, i) => ({id: `br${i}`, severity: 1 + (i % 5), event: `Something no mortal should see, a long description number ${i}`, faction: ids[i], place: null, state: ["live", "contained", "stopped", "over", "live"][i], stage: i % 3, heard: []}));
    st.lastTurn = 0;
    return {state: st};
  });
  const oldCanvas = globalThis.canvas;
  globalThis.canvas = {...(oldCanvas ?? {}), scene: null, tokens: {placeables: [], controlled: []}};
  const App = Fx.FactionsAppClass();
  const app = new App({});
  await app.render({force: true});
  const o = App.DEFAULT_OPTIONS;
  windows.push({name: "WoDX factions", tag: o.tag ?? "div", classes: ["application", ...(o.classes ?? [])].join(" "), width: o.position.width, height: o.position.height,
    content: app.element.querySelector("section.window-content").innerHTML});
  for ( const [label, fn] of [["Faction editor", () => Fx.editFaction("fac0")], ["New faction", () => Fx.editFaction()], ["Hunting", () => Fx.huntDialog(people.find(a => a.type === "Vampire"))],
    ["Report a breach", () => Fx.reportDialog()]] ) {
    const n = captured.length;
    try { await fn(); } catch (err) { console.error(`FAIL could not build the ${label} window: ${err.message}`); process.exitCode = 1; }
    if ( captured.length === n ) { console.error(`FAIL the ${label} window was not captured`); process.exitCode = 1; }
  }
  globalThis.canvas = oldCanvas;
  api.DialogV2.wait = wait;
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
  pathToFileURL(join(root, "modules/wodx-creation/styles/wodx-creation.css")).href,
  pathToFileURL(join(root, "modules/wodx-npc/styles/wodx-npc.css")).href];
const sizes = [[1280, 720], [1366, 768], [1920, 1080]];
// 6e: the WoDX look is on. WODX_KIT picks the era kit (default the Dark Ages), WODX_SCALE the text size, WODX_LOOK the look.
const {toneFor} = await import(join(root, "modules/wodx-chronicle/scripts/theme.mjs"));
const KIT = process.env.WODX_KIT ?? "dark-ages", SCALE = process.env.WODX_SCALE ?? "1", LOOK = process.env.WODX_LOOK ?? "era";
const bodyAttrs = `class="vtt game system-worldofdarkness theme-dark${LOOK === "plain" ? "" : " wodx-look"}" data-wodx-kit="${KIT}" data-wodx-look="${LOOK}" data-wodx-tone="${toneFor(KIT, LOOK)}" style="--wx-scale:${SCALE}"`;
console.log(`Look: ${LOOK}, kit ${KIT}, text ${SCALE}`);
if ( outDir ) { mkdirSync(outDir, {recursive: true}); writeFileSync(join(outDir, "windows.json"), JSON.stringify(windows)); }
// Playwright's own Chromium where it is installed; otherwise the Edge or Chrome on the machine (Windows has Edge)
async function launchBrowser() {
  const tries = [{}, {channel: "msedge"}, {channel: "chrome"}];
  if ( process.env.WODX_BROWSER ) tries.unshift({executablePath: process.env.WODX_BROWSER});
  let last;
  for ( const t of tries ) {
    try { return await chromium.launch(t); } catch ( err ) { last = err; }
  }
  throw last;
}
// The frame ApplicationV2 draws (Foundry 13 and 14): the window icon, the title, the controls menu and the close button.
// Windows are minimized by double-clicking the title, so the title has to stay on show beside the buttons.
const HEADER = title => `<i class="window-icon fa-fw fa-solid fa-moon" inert></i><h1 class="window-title">${title}</h1>
  <button type="button" class="header-control icon fa-solid fa-ellipsis-vertical" data-action="toggleControls" data-tooltip="Toggle Controls" aria-label="Toggle Controls"></button>
  <button type="button" class="header-control icon fa-solid fa-xmark" data-action="close" data-tooltip="Close Window" aria-label="Close Window"></button>`;
const iconCss = extras.some(h => h.includes("fontawesome"));
if ( !iconCss ) console.log("Note: Font Awesome was not found beside foundry2.css, so the header icon font is not checked");
const browser = await launchBrowser();
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
    // ...and the Places window (PlacesApp.open)
    if ( w.name === "WoDX places" ) {
      w.height = Math.max(360, Math.min(720, vh - 120));
      w.width = Math.max(480, Math.min(900, vw - 40));
    }
    // ...and Pass the Years (PassYearsApp.open)
    if ( w.name === "Pass the years" ) {
      w.height = Math.max(360, Math.min(720, vh - 100));
      w.width = Math.max(480, Math.min(820, vw - 40));
    }
    const html = `<!doctype html><html><head><meta charset="utf-8">${css.map(h => `<link rel="stylesheet" href="${h}">`).join("")}</head>
      <body ${bodyAttrs}>
      <${w.tag} id="app" class="${w.classes}" style="width:${w.width}px;${w.height === "auto" ? "" : `height:${w.height}px;`}left:20px;top:0">
        <header class="window-header">${HEADER(w.name)}</header>
        <section class="window-content">${w.content}</section>
      </${w.tag}></body></html>`;
    const file = join(outDir ?? tmpdir(), `ui-fit-${vw}x${vh}-${w.name.replace(/[\s\/]+/g, "-")}.html`);
    writeFileSync(file, html);
    await page.goto(pathToFileURL(file).href);
    // Foundry centers the window and clamps it to the screen (ApplicationV2#setPosition)
    await page.evaluate(() => {
      const el = document.getElementById("app");
      const h = el.offsetHeight;
      el.style.top = `${Math.max(0, (window.innerHeight - h) / 2)}px`;
    });
    await page.evaluate(() => document.fonts.ready);
    const result = await page.evaluate(iconCss => {
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
      // The header: close and the controls menu must show, in the icon font, with enough contrast against the bar
      // (3:1, the WCAG figure for icons). Checked with the window's own title, a long title, and minimized.
      const parse = c => {
        let m = c.match(/^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/);
        if ( m ) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
        m = c.match(/^color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.]+))?\)$/);
        if ( m ) return [m[1] * 255, m[2] * 255, m[3] * 255, m[4] === undefined ? 1 : +m[4]];
        return null;
      };
      const over = (top, under) => [0, 1, 2].map(i => (top[i] * top[3]) + (under[i] * (1 - top[3]))).concat(1);
      const lum = ([r, g, b]) => {
        const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
        return (0.2126 * f(r)) + (0.7152 * f(g)) + (0.0722 * f(b));
      };
      const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
      // Every colour the bar can show behind an element: its own and its ancestors' fills, gradient stops included
      const backdrops = el => {
        const layers = [];
        for ( let e = el; e; e = e.parentElement ) {
          const s = getComputedStyle(e);
          const stops = (s.backgroundImage.match(/(rgba?\([^)]*\)|color\(srgb[^)]*\))/g) ?? []).map(parse).filter(Boolean);
          const fill = parse(s.backgroundColor);
          if ( stops.length ) layers.push(stops);
          else if ( fill && fill[3] > 0 ) layers.push([fill]);
          if ( (stops.length && stops.every(c => c[3] >= 1)) || (fill && fill[3] >= 1 && !stops.length) ) break;
        }
        let out = [[255, 255, 255, 1]];
        for ( const layer of layers.reverse() ) out = layer.flatMap(c => out.map(u => over(c, u)));
        return out;
      };
      const header = app.querySelector(".window-header");
      const checkHeader = when => {
        const found = [];
        const ctrls = [...(header?.querySelectorAll(".header-control") ?? [])];
        if ( !ctrls.some(c => c.dataset.action === "close") ) found.push(`no close button${when}`);
        for ( const c of ctrls ) {
          const name = c.dataset.action === "close" ? "close" : "controls menu";
          const r = c.getBoundingClientRect(), h = header.getBoundingClientRect();
          if ( r.width < 8 || r.height < 8 ) { found.push(`the ${name} button is too small to see${when}`); continue; }
          if ( r.left < h.left - 1 || r.right > h.right + 1 || r.top < h.top - 1 || r.bottom > h.bottom + 1 ) found.push(`the ${name} button sits outside the title bar${when}`);
          if ( !reachable(c) ) found.push(`the ${name} button cannot be clicked${when}`);
          const s = getComputedStyle(c), glyph = getComputedStyle(c, "::before");
          if ( s.visibility === "hidden" || +s.opacity < 0.5 ) found.push(`the ${name} button is hidden${when}`);
          if ( iconCss && (glyph.content === "none" || !/Font Awesome/i.test(glyph.fontFamily)) ) found.push(`the ${name} icon is drawn in ${glyph.fontFamily.split(",")[0]}, not the icon font, so it shows blank${when}`);
          const ink = parse(s.color);
          if ( ink ) {
            const worst = Math.min(...backdrops(c).map(b => ratio(over(ink, b), b)));
            if ( worst < 3 ) found.push(`the ${name} icon is hard to see against the bar (contrast ${worst.toFixed(2)}:1, needs 3:1)${when}`);
          }
        }
        const t = header?.querySelector(".window-title");
        if ( t && t.getBoundingClientRect().width < 24 ) found.push(`the title has no room left to double-click (to minimize)${when}`);
        return found;
      };
      problems.push(...checkHeader(""));
      const title = header?.querySelector(".window-title");
      if ( title ) {
        const was = title.textContent;
        title.textContent = `${was}: ${"a very long name for this window ".repeat(4)}`;
        problems.push(...checkHeader(" with a long title"));
        title.textContent = was;
        // Foundry's minimized window: the frame shrinks to its title bar
        const style = app.getAttribute("style");
        app.classList.add("minimized");
        app.style.width = "200px"; app.style.height = "auto";
        problems.push(...checkHeader(" when minimized"));
        app.classList.remove("minimized");
        app.setAttribute("style", style);
      }
      return {problems, controls: controls.length, height: Math.round(ar.height)};
    }, iconCss);
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
