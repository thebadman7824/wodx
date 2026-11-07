import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";

/* Phase 6a: conditions, timed effects, the Group actor's sheet, and the move from VtDA20 to WoDX Actions and Combat */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
CONFIG.statusEffects = [];
CONFIG.worldofdarkness.sheettype = {...CONFIG.worldofdarkness.sheettype, changingbreed: "Changing Breed", wraith: "Wraith"};
CONFIG.worldofdarkness.groupKinds = {coterie: "Coterie (Vampire)", pack: "Pack (Werewolf and Fera)", other: "Other"};
CONFIG.Actor = {dataModels: {Group: class {}}};
// The old modules' stored settings, as Foundry keeps them (JSON strings)
game.data = {settings: [{key: "vtda20-combat.showDice", value: "false"}, {key: "vtda20-actions.nightlyBlood", value: "false"},
  // Foundry 14 hands back the parsed value, so a String setting arrives as plain text
  {key: "vtda20-actions.flavorText", value: "gm"}]};

class Coll extends Map {
  get contents() { return [...this.values()]; }
  [Symbol.iterator]() { return this.values(); }
  filter(f) { return [...this.values()].filter(f); }
  find(f) { return [...this.values()].find(f); }
  some(f) { return [...this.values()].some(f); }
  getName(n) { return this.find(v => v.name === n); }
}
const setPath = (o, path, v) => { const p = path.split("."); for ( const k of p.slice(0, -1) ) o = (o[k] ??= {}); o[p.at(-1)] = v; };

let effectIds = 0;
function makeActor(name, type = "Vampire", {system = {}, flags = {}, owner = true, player = false} = {}) {
  const a = {
    id: `act${name.replace(/\W/g, "")}`, uuid: `Actor.act${name.replace(/\W/g, "")}`, name, type, flags: structuredClone(flags), isOwner: owner,
    hasPlayerOwner: player, items: [], effects: new Coll(),
    system: {attributes: {dexterity: {value: 2, bonus: 0, total: 2}, stamina: {value: 3, total: 3}}, ...system},
    get statuses() { const s = new Set(this._statuses); for ( const e of this.effects ) for ( const x of e.statuses ?? [] ) s.add(x); return s; },
    _statuses: new Set(),
    getFlag(s, k) { return this.flags?.[s]?.[k]; },
    async setFlag(s, k, v) { setPath(this.flags, `${s}.${k}`, structuredClone(v)); return this; },
    async unsetFlag(s, k) { const parts = k.split("."); let o = this.flags?.[s]; for ( const p of parts.slice(0, -1) ) o = o?.[p]; if ( o ) delete o[parts.at(-1)]; return this; },
    async update(ch) { for ( const [k, v] of Object.entries(ch) ) setPath(this, k, structuredClone(v)); return this; },
    async toggleStatusEffect(id, {active}) { if ( active ) this._statuses.add(id); else this._statuses.delete(id); return true; },
    async createEmbeddedDocuments(type, list) {
      assert.equal(type, "ActiveEffect");
      return list.map(d => {
        const actor = this;
        const e = {...structuredClone(d), id: `eff${++effectIds}`, statuses: new Set(d.statuses ?? []),
          getFlag(s, k) { return this.flags?.[s]?.[k]; }, async delete() { actor.effects.delete(this.id); }};
        this.effects.set(e.id, e);
        return e;
      });
    },
    testUserPermission: () => true
  };
  return a;
}

await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
const chron = () => game.modules.get("wodx-chronicle").api;

test("ready: the conditions are token statuses, and the API is there", async () => {
  await Hooks.callAll("init");
  mock.setupTime();
  await Hooks.callAll("ready");
  await mock.settle();
  assert.ok(chron().conditions && chron().applyTimed);
  for ( const id of ["blinded", "dazed", "held", "immobilized", "staked", "knockdown", "incapacitated", "torpor", "frenzy", "rotschreck"] ) {
    assert.ok(CONFIG.statusEffects.some(s => s.id === `wodx-${id}`), id);
  }
  assert.match(CONFIG.statusEffects.find(s => s.id === "wodx-dazed").description, /V20 Dark Ages p\. 348/);
});

test("conditions change an attack as the book says (V20 Dark Ages p. 348)", async () => {
  const C = chron().conditions;
  const a = makeActor("Attacker");
  const d = makeActor("Defender");
  await C.setCondition(a, "blinded", true);
  await C.setCondition(d, "held", true);
  let m = C.attackModifiers(a, d);
  assert.equal(m.attackerDiff, 2, "a blinded attacker: +2 difficulty");
  assert.equal(m.attackerDice, 2, "a held target: +2 dice");
  await C.setCondition(d, "blinded", true);
  m = C.attackModifiers(a, d);
  assert.equal(m.attackerDice, 4, "held and blinded: +2 and +2");
  assert.equal(C.defenseDifficulty(d), 2, "a blinded defender defends at +2");
  await C.setCondition(d, "staked", true);
  m = C.attackModifiers(a, d);
  assert.equal(m.autoHit, true);
  assert.equal(m.defenderCannotDefend, true);
  assert.match(m.notes.join(" "), /hit automatically/);
  await assert.rejects(C.setCondition(a, "nonsense", true), /Unknown condition/);
});

test("timed effects end by round, with their reverter", async () => {
  const T = chron().timed;
  const a = makeActor("Fighter");
  const reverted = [];
  T.registerReverter("test.revert", (actor, data) => reverted.push([actor.name, data.n]));
  game.combat = {id: "c1", round: 2, turn: 0};
  const e = await chron().applyTimed(a, {name: "Dazed", condition: "dazed", duration: {kind: "rounds", rounds: 1}, revert: {key: "test.revert", data: {n: 1}}, source: "V20 Dark Ages p. 348"});
  assert.ok(a.statuses.has("wodx-dazed"));
  assert.equal(T.timedOf(e).endsRound, 3);
  game.actors = new Coll([[a.id, a]]);
  game.scenes = new Coll();
  await T.sweepRounds({id: "c1", round: 3});
  assert.equal(a.effects.size, 1, "still the round it was meant to last");
  await T.sweepRounds({id: "c1", round: 4});
  assert.equal(a.effects.size, 0);
  assert.deepEqual(reverted, [["Fighter", 1]]);
  assert.ok(!a.statuses.has("wodx-dazed"));
  assert.match(mock.log.chat.at(-1).content, /Dazed ends/);
});

test("timed effects end with the scene, at dawn, and when a fight is over", async () => {
  const T = chron().timed;
  const a = makeActor("Kindred");
  game.actors = new Coll([[a.id, a]]);
  globalThis.canvas = {scene: {id: "sceneA"}};
  await chron().applyTimed(a, {name: "Scene thing", duration: {kind: "scene"}});
  await chron().applyTimed(a, {name: "Night thing", duration: {kind: "night"}});
  await chron().applyTimed(a, {name: "Fight thing", duration: {kind: "rounds", rounds: 5}});
  assert.equal(a.effects.size, 3);
  const seen = [];
  Hooks.on("wodxEndScene", i => seen.push(i));
  await T.onSceneChange("sceneA");
  assert.equal(a.effects.size, 3, "the same scene: nothing ends");
  await chron().endScene();
  assert.deepEqual(a.effects.contents.map(e => e.name).sort(), ["Fight thing", "Night thing"]);
  assert.equal(seen.length, 1, "other modules hear that the scene ended");
  await T.sweepRounds(game.combat, {ended: true});
  assert.deepEqual(a.effects.contents.map(e => e.name), ["Night thing"]);
  const until = T.timedOf(a.effects.contents[0]).until;
  await game.time.set(until - 60);
  assert.equal(a.effects.size, 1);
  await game.time.set(until + 1);
  await mock.settle();
  assert.equal(a.effects.size, 0, "dawn ends a night effect");
});

test("putting a keyed effect on again restarts it, and endFor ends an actor's own", async () => {
  const a = makeActor("Repeat");
  game.actors = new Coll([[a.id, a]]);
  await chron().applyTimed(a, {name: "Q1", key: "k", duration: {kind: "scene"}});
  await chron().applyTimed(a, {name: "Q2", key: "k", duration: {kind: "scene"}});
  assert.deepEqual(a.effects.contents.map(e => e.name), ["Q2"]);
  assert.equal(await chron().timed.endFor(a, {kind: "scene"}), 1);
  assert.equal(a.effects.size, 0);
});

/* ---- WoDX Actions and WoDX Combat ---- */
game.macros = new Coll();
let macroIds = 0;
globalThis.Macro = {create: async d => { const m = {...d, id: `mac${++macroIds}`, async update(ch) { Object.assign(this, ch); return this; }}; game.macros.set(m.id, m); return m; }};
for ( const [name, command] of [["VtDA20: Actions Menu", "game.vtda20actions.menu();"], ["VtDA20: Attack", "game.vtda20combat.attack();"],
  // Each old module made one of these
  ["VtDA20: Actor Type", "game.vtda20actions.pickKind(a);"], ["VtDA20: Actor Type", "game.vtda20combat.pickKind(a);"],
  ["My own macro", "game.vtda20actions.frenzy();"]] ) await Macro.create({name, command, type: "script"});
game.modules.set("vtda20-actions", {active: false});
game.modules.set("vtda20-combat", {active: false});
game.modules.set("wodx-actions", {});
game.modules.set("wodx-combat", {});
globalThis.CONST.DOCUMENT_OWNERSHIP_LEVELS = {NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3};
game.release = {generation: 14};
game.system.id = "worldofdarkness";
game.socket.on ??= () => {};

await import(join(root, "modules/wodx-combat/scripts/main.js"));
await import(join(root, "modules/wodx-actions/scripts/main.js"));

test("the WoDX modules start, keep the old API names, and take their settings from VtDA20", async () => {
  await Hooks.callAll("init");
  await Hooks.callAll("ready");
  await mock.settle();
  assert.ok(game.wodxActions?.menu && game.wodxCombat?.attack);
  assert.equal(game.vtda20actions, game.wodxActions, "old macros keep working");
  assert.equal(game.wodx.combat, game.wodxCombat);
  assert.equal(game.settings.get("wodx-combat", "showDice"), false, "vtda20-combat's stored choice");
  assert.equal(game.settings.get("wodx-actions", "nightlyBlood"), false, "vtda20-actions' stored choice");
  assert.equal(game.settings.get("wodx-combat", "autoApply"), true, "no old value: the default");
  assert.equal(game.settings.get("wodx-actions", "flavorText"), "gm", "a String setting stored as plain text");
  assert.ok(!game.macros.find(m => m.name === "WoDX: Actions Menu"), "no duplicate beside the VtDA20 macro the migration will rename");
  assert.ok(game.macros.find(m => m.name === "WoDX: Hunt"), "macros the old module never made are made");
});

test("profiles read the WoDX flag first, then VtDA20's; 'Automatic' is stored, not deleted", async () => {
  const P = game.wodx.profiles;
  const a = makeActor("Thrall", "Mortal", {flags: {world: {vtda20: {profile: "ghoul", form: "crinos"}}}});
  assert.equal(P.detectProfile(a), "ghoul", "VtDA20's flag still counts before the migration");
  await P.setProfile(a, "mortal");
  assert.equal(a.flags.world.wodx.profile, "mortal");
  assert.equal(P.detectProfile(a), "mortal", "the WoDX flag wins");
  await P.setProfile(a, "auto");
  assert.equal(a.flags.world.wodx.profile, "auto");
  assert.equal(P.detectProfile(a), "mortal", "automatic detection, not the old ghoul flag");
  assert.equal(a.flags.world.vtda20.profile, "ghoul", "nothing deleted");
  assert.equal(P.worldFlag(a, "form"), "crinos");
});

test("the migration: copies flags, renames the old macros, deletes nothing", async () => {
  const garou = makeActor("Radek", "Werewolf", {flags: {world: {vtda20: {profile: "lupine", form: "hispo"}}, "vtda20-actions": {frenzyType: "rage"}}});
  const done = makeActor("Already", "Mortal", {flags: {world: {vtda20: {profile: "mortal"}, wodx: {profile: "hunter"}}}});
  const plain = makeActor("Nobody", "Mortal");
  game.actors = new Coll([[garou.id, garou], [done.id, done], [plain.id, plain]]);
  game.scenes = new Coll();
  const plan = game.wodxActions.planMigration();
  assert.equal(plan.actors.length, 1, "the actor already on WoDX names keeps its own value");
  assert.deepEqual(plan.actors[0].keys.sort(), ["vtda20-actions.frenzyType", "world.form", "world.profile"]);
  assert.equal(plan.macros.length, 4);
  assert.deepEqual(plan.macros.filter(m => m.clash).map(m => m.command), ["game.wodxCombat.pickKind(a);"], "only the first Actor Type is renamed");
  assert.equal(plan.settings.length, 3, "the old settings are listed in the report");
  assert.equal(plan.others.length, 1);
  mock.DialogV2.queue(() => true);
  const r = await game.wodxActions.migrate();
  assert.equal(garou.flags.world.wodx.form, "hispo");
  assert.equal(garou.flags["wodx-actions"].frenzyType, "rage");
  assert.equal(garou.flags.world.vtda20.form, "hispo", "the old flag stays");
  assert.equal(done.flags.world.wodx.profile, "hunter", "never overwritten");
  assert.ok(game.macros.find(m => m.name === "WoDX: Actions Menu" && m.command === "game.wodxActions.menu();"));
  assert.ok(game.macros.find(m => m.name === "WoDX: Attack" && m.command === "game.wodxCombat.attack();"));
  assert.equal(game.macros.find(m => m.name === "My own macro").command, "game.vtda20actions.frenzy();", "Ben's own macro is not touched");
  assert.equal(game.macros.size, macroIds, "no macro deleted");
  const report = r.report.pages.getName("Report").text.content;
  assert.match(report, /Nothing was deleted/);
  assert.match(report, /&quot;VtDA20: Attack&quot; → &quot;WoDX: Attack&quot;|"VtDA20: Attack" → "WoDX: Attack"/, "the old name, then the new");
  assert.match(report, /VtDA20: Actor Type.*already exists; left as it is/);
  assert.match(report, /vtda20-actions\.flavorText: &quot;gm&quot;|vtda20-actions\.flavorText: "gm"/);
  assert.equal(game.macros.filter(m => m.name === "WoDX: Actor Type").length, 1, "one WoDX: Actor Type");
  assert.equal(game.settings.get("wodx-actions", "migration").done, true);
  assert.equal(game.wodxActions.planMigration().work, 0, "a second run has nothing to do");
});

test("WoDX Combat reads the conditions, and a heavy hit dazes (V20 Dark Ages p. 348)", async () => {
  const C = game.wodxCombat;
  const a = makeActor("Blind Swordsman");
  const d = makeActor("Staked Elder");
  await chron().conditions.setCondition(a, "blinded", true);
  await chron().conditions.setCondition(d, "staked", true);
  const m = C.conditionMods(a, d);
  assert.equal(m.attackerDiff, 2);
  assert.ok(m.autoHit);
  assert.deepEqual(C.dazedThreshold(makeActor("Peasant", "Mortal"), "mortal"), {threshold: 3, label: "Stamina"});
  assert.deepEqual(C.dazedThreshold(d, "kindred"), {threshold: 5, label: "Stamina + 2"});
  assert.deepEqual(C.dazedThreshold(makeActor("Magus", "Mage"), "mage"), {threshold: 3, label: "Stamina"}, "WoDX reading: a mage's body is mortal");
});

test("damage entered by hand dazes too; outside a fight Dazed lasts the scene", async () => {
  const C = game.wodxCombat;
  ChatMessage.getSpeaker ??= () => ({alias: "test"});
  CONFIG.sounds ??= {dice: ""};
  await game.settings.set("wodx-combat", "autoApply", false);
  const peasant = makeActor("Peasant", "Mortal");
  const r = await C.soakAndApply(peasant, {mode: "levels", amount: 4, type: "bashing", soak: false});
  assert.equal(r.dazed, true, "4 levels is more than Stamina 3");
  const e = peasant.effects.find(x => x.name === "Dazed");
  assert.ok(e, "the Dazed effect is on");
  assert.equal(chron().timed.timedOf(e).kind, game.combat?.started ? "rounds" : "scene");
  const r2 = await C.soakAndApply(makeActor("Sturdy", "Mortal"), {mode: "levels", amount: 3, type: "bashing", soak: false});
  assert.equal(r2.dazed, false, "3 is not more than 3");
});

test("WoDX Actions refuses to run beside vtda20-actions", async () => {
  // A fresh copy of the module, loaded as if vtda20-actions were still enabled
  game.modules.set("vtda20-actions", {active: true});
  const before = mock.log.notifications.length;
  const mod = await import(join(root, "modules/wodx-actions/scripts/legacy.js") + "?again");
  assert.equal(mod.oldActive("vtda20-actions"), true);
  mod.warnOld("WoDX Actions", "vtda20-actions");
  assert.match(mock.log.notifications.slice(before).map(n => n[1]).join(" "), /disable vtda20-actions/);
  mock.log.notifications.splice(before);
  game.modules.set("vtda20-actions", {active: false});
});

/* ---- The Group actor's sheet ---- */
const G = await import(join(root, "modules/wodx-creation/scripts/group-sheet.mjs"));
function makeGroup(kind = "coterie") {
  return {id: "grp1", name: "The Coterie of the Silver Adit", type: "Group", isOwner: true, flags: {},
    system: {kind, roster: [], backgrounds: [], anchorId: "", notes: ""},
    async update(ch) { for ( const [k, v] of Object.entries(ch) ) setPath(this, k, structuredClone(v)); this.sheet?.render?.(); return this; }};
}

test("a group's roster and pooled Backgrounds follow the book (V20 Dark Ages p. 182)", async () => {
  const g = makeGroup();
  const radu = makeActor("Radu");
  const ilse = makeActor("Ilse");
  game.actors = new Coll([[radu.id, radu], [ilse.id, ilse]]);
  assert.ok(await G.addMember(g, radu, "Leader"));
  assert.ok(await G.addMember(g, ilse));
  assert.equal(await G.addMember(g, radu), false, "no duplicates");
  assert.equal(await G.addMember(g, g), false, "a group is not its own member");
  g.system.backgrounds = [{id: "b1", name: "Domain", contributions: {[radu.id]: 2, [ilse.id]: 1}}, {id: "b2", name: "Herd", contributions: {[radu.id]: 3, [ilse.id]: 2}}];
  g.system.anchorId = "b1";
  assert.equal(G.poolTotal(g.system.backgrounds[1]), 5);
  assert.match(G.poolWarnings(g).join(" "), /Herd \(5\) is above the Anchor, Domain \(3\)/);
  const r = await G.removeMember(g, ilse.id);
  assert.deepEqual(r.back, ["Domain: 1 in, 0 back", "Herd: 2 in, 1 back"], "one dot short each");
  assert.ok(g.system.roster.find(x => x.actorId === ilse.id).left !== null, "kept in the history");
  assert.match(G.poolWarnings(g).join(" "), /Herd \(3\) is above the Anchor, Domain \(2\)/, "still above the Anchor after she left");
  assert.deepEqual(G.POOLABLE.pack.list, ["Allies", "Contacts", "Fate", "Kinfolk", "Resources"], "W20 pp. 140-141");
});

test("the Group sheet: search boxes, members, pools (rules B17, B24)", async () => {
  const {ApplicationV2} = foundry.applications.api;
  foundry.applications.sheets = {ActorSheetV2: class extends ApplicationV2 {
    constructor(o = {}) { super(o); this.document = o.document; }
  }};
  const Sheet = G.makeGroupSheet();
  const g = makeGroup("pack");
  const a = makeActor("Wolf-Eyes", "Werewolf");
  const b = makeActor("Grey", "Werewolf");
  game.actors = new Coll([[a.id, a], [b.id, b], [g.id, g]]);
  const sheet = new Sheet({document: g});
  g.sheet = sheet;
  await sheet.render({force: true});
  assert.equal(sheet.element.querySelectorAll("input.wodx-search").length, 3, "members, characters to add, Backgrounds");
  assert.equal(sheet.element.querySelectorAll("select.wodx-new-member option").length, 2, "groups are not offered as members");
  sheet.element.querySelector("select.wodx-new-member").value = a.id;
  await sheet.click("[data-action=addMember]");
  assert.equal(g.system.roster.length, 1);
  sheet.element.querySelector("input.wodx-new-bg").value = "Totem";
  await sheet.click("[data-action=addBackground]");
  assert.ok(mock.log.notifications.some(([, m]) => /not on the book's list/.test(m)), "Totem is not pooled in W20");
  assert.match(sheet.element.textContent, /Totem already belongs to the pack/);
});

test("the automatic defense picks the best the sheet allows (VtDA20 p. 344)", async () => {
  const C = game.wodxCombat;
  const sys = ab => ({attributes: {dexterity: {value: 3, total: 3}, stamina: {value: 2, total: 2}}, abilities: Object.fromEntries(Object.entries(ab).map(([k, v]) => [k, {value: v}])),
    health: {damage: {woundpenalty: 0}}});
  const fencer = makeActor("Fencer", "Mortal", {system: sys({athletics: 2, brawl: 1, melee: 4})});
  fencer.items = [{type: "Melee Weapon", name: "Sword", system: {isequipped: true}}];
  const fd = {defIndex: 0, defDice: 0, defDiff: 0};
  const close = {ranged: false, type: "lethal"}, bow = {ranged: true, type: "lethal"};
  assert.equal(C.bestDefense(fencer, fd, close).best.type, "parry", "Dex 3 + Melee 4 with a sword");
  const arrow = C.bestDefense(fencer, fd, bow);
  assert.equal(arrow.best.type, "dodge", "only a dodge against missiles");
  assert.equal(arrow.best.diff, 8, "dodging missiles +2");
  assert.match(arrow.plans.find(p => p.type === "parry").invalid, /close-combat/);
  const brawler = makeActor("Brawler", "Mortal", {system: sys({athletics: 1, brawl: 4, melee: 3})});
  assert.equal(C.bestDefense(brawler, fd, close).best.type, "dodge", "no armor or Fortitude: no block against lethal; no weapon: no parry");
  assert.equal(C.bestDefense(brawler, fd, {ranged: false, type: "bashing"}).best.type, "block", "a fist can be blocked");
  const nobody = makeActor("Nobody", "Mortal", {system: {...sys({}), attributes: {dexterity: {value: 0, total: 0}}}});
  assert.equal(C.bestDefense(nobody, fd, close).best, null, "nothing to roll: no defense");
  assert.ok(C._dialogs.attackDialogHtml, "the dialog builder is there");
  assert.ok(C.rules.expectedSuccesses(6, 6) > C.rules.expectedSuccesses(6, 8));
});

test("no error notifications", () => {
  assert.deepEqual(mock.log.notifications.filter(([l]) => l === "error"), []);
});
