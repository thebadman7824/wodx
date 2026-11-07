import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
const M = "wodx-otherworlds";

/* ---- extra stand-ins this module needs ---- */
class Field { constructor(options = {}) { this.options = options; } }
foundry.data.fields = {StringField: Field, NumberField: Field, BooleanField: Field};
foundry.data.regionBehaviors = {RegionBehaviorType: class {}};
CONFIG.RegionBehavior = {dataModels: {}, typeLabels: {}, typeHints: {}, typeIcons: {}};
CONFIG.statusEffects = [];
CONFIG.worldofdarkness.sheettype.changingbreed = "Changing Breed";

// Dice: tests queue the faces each roll should show
const diceQueue = [];
globalThis.Roll = class {
  constructor(formula) { this.formula = formula; }
  async evaluate() {
    const n = Number(this.formula.split("d")[0]);
    const faces = diceQueue.shift() ?? Array(n).fill(5);
    assert.equal(faces.length, n, `roll ${this.formula} got ${faces.length} faces`);
    this.dice = [{results: faces.map(result => ({result}))}];
    return this;
  }
};
ChatMessage.getSpeaker = ({token}) => ({alias: token?.name});

class EmbeddedCollection extends Map {
  constructor(docs) { super(docs.map(d => [d.id, d])); this.contents = docs; }
  [Symbol.iterator]() { return this.values(); }
}
function makeScene(id, name, ratings, levels = []) {
  const flags = ratings ? {[M]: {ratings}} : {};
  return {
    id, name, flags, regions: [],
    levels: new EmbeddedCollection(levels),
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; }
  };
}
function makeLevel(id, layer, bottom = 0) {
  return {id, elevation: {base: bottom, bottom}, flags: {[M]: {layer}}, getFlag(s, k) { return this.flags?.[s]?.[k]; }};
}
function makeActor(name, type, gnosis, {owner = true, items = []} = {}) {
  return {
    name, type, isOwner: owner, items, flags: {}, statuses: new Set(),
    system: {advantages: {gnosis: {roll: gnosis, permanent: gnosis}}},
    getFlag(s, k) { return this.flags?.[s]?.[k]; },
    async setFlag(s, k, v) { (this.flags[s] ??= {})[k] = structuredClone(v); },
    async unsetFlag(s, k) { delete this.flags?.[s]?.[k]; },
    async toggleStatusEffect(id, {active}) { if ( active ) this.statuses.add(id); else this.statuses.delete(id); }
  };
}
const tokensByUuid = new Map();
function makeToken(id, actor, scene, {regions = [], owner = true} = {}) {
  const t = {
    id, uuid: `Scene.${scene.id}.Token.${id}`, name: actor.name, actor, parent: scene, regions: new Set(regions),
    isOwner: owner, _source: {level: scene.levels.contents[0]?.id ?? "defaultLevel0000"},
    async move({level}) { this._source.level = level; }
  };
  tokensByUuid.set(t.uuid, t);
  return t;
}
globalThis.fromUuid = async uuid => tokensByUuid.get(uuid) ?? null;
globalThis.canvas = {tokens: {controlled: []}, scene: null};
const select = (...tokens) => { canvas.tokens.controlled = tokens.map(document => ({document})); };
const fill = values => form => {
  for ( const [k, v] of Object.entries(values) ) {
    const el = form.elements[k];
    if ( !el ) throw new Error(`No form field ${k}`);
    if ( el.type === "checkbox" ) el.checked = !!v; else el.value = String(v);
  }
  return "ok";
};
const lastCard = () => mock.log.chat.at(-1)?.content ?? "";

/* ---- load the module, with WoDX Chronicle for the era ---- */
await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
await import(join(root, "modules/wodx-otherworlds/scripts/main.mjs"));
game.modules.set(M, {});

test("init registers the ratings behavior and the four statuses", async () => {
  await Hooks.callAll("init");
  assert.ok(CONFIG.RegionBehavior.dataModels[`${M}.ratings`]);
  assert.equal(CONFIG.RegionBehavior.typeLabels[`${M}.ratings`], "WoDX: Otherworld ratings");
  const ours = ["wodx-caught", "wodx-lost", "wodx-shadowlands", "wodx-umbra"];
  assert.deepEqual(CONFIG.statusEffects.map(s => s.id).filter(id => ours.includes(id)).sort(), ours, "WoDX Chronicle adds its conditions beside these");
});

test("ready exposes the API and the Dark Ages chart is in force", async () => {
  mock.setupTime();
  await Hooks.callAll("ready");
  await mock.settle();
  const api = game.modules.get(M).api;
  assert.ok(api.stepSideways);
  assert.equal(game.modules.get("wodx-chronicle").api.eras.activeEra().profile.rules.gauntletChart, "dark-ages");
});

const town = makeScene("s1", "Lower Town · Market Square", {settlement: "town"});
const grove = makeScene("s2", "Locus · The Old Grove", {settlement: "wilderness"});

test("Dark Ages: a Garou in the Lower Town rolls Gnosis against 6", async () => {
  const garou = makeActor("Radek", "Werewolf", 5);
  const tok = makeToken("t1", garou, town);
  select(tok);
  diceQueue.push([6, 8, 2, 3, 4]);
  mock.DialogV2.queue(fill({reflective: false}));
  await game.modules.get(M).api.stepSideways();
  assert.match(lastCard(), /Local Gauntlet 6/);
  assert.match(lastCard(), /against difficulty 6/);
  assert.match(lastCard(), /Shift time: 30 seconds/);
  assert.ok(garou.statuses.has("wodx-umbra"));
});

test("stepping back from the Umbra removes the status", async () => {
  const garou = canvas.tokens.controlled[0].document.actor;
  diceQueue.push([9, 2, 2, 3, 4]);
  mock.DialogV2.queue(fill({reflective: true}));
  await game.modules.get(M).api.stepSideways();
  assert.match(lastCard(), /Stepping back/);
  assert.match(lastCard(), /Reflective surface −1/);
  assert.ok(!garou.statuses.has("wodx-umbra"));
});

test("Dark Ages failure makes the next try here 1 harder; success clears it", async () => {
  const garou = makeActor("Milena", "Werewolf", 3);
  const tok = makeToken("t2", garou, grove);
  select(tok);
  diceQueue.push([2, 3, 2]);
  mock.DialogV2.queue(fill({reflective: false}));
  await game.modules.get(M).api.stepSideways();
  assert.match(lastCard(), /1 harder/);
  assert.equal(garou.getFlag(M, "attempts").failures, 1);
  diceQueue.push([5, 5, 9]);
  mock.DialogV2.queue(fill({reflective: false}));
  await game.modules.get(M).api.stepSideways();
  assert.match(lastCard(), /Earlier failed attempts here \+1/);
  assert.match(lastCard(), /against difficulty 5/);
  assert.equal(garou.getFlag(M, "attempts"), undefined);
});

test("Dark Ages botch without a mirror: Lost; with a mirror: the surface is ruined", async () => {
  const a = makeActor("Bořek", "Werewolf", 2);
  select(makeToken("t3", a, grove));
  diceQueue.push([1, 3]);
  mock.DialogV2.queue(fill({reflective: false}));
  await game.modules.get(M).api.stepSideways();
  assert.ok(a.statuses.has("wodx-lost"));
  const b = makeActor("Vlasta", "Werewolf", 2);
  select(makeToken("t4", b, grove));
  diceQueue.push([1, 2]);
  mock.DialogV2.queue(fill({reflective: true}));
  await game.modules.get(M).api.stepSideways();
  assert.match(lastCard(), /reflective surface is ruined/);
  assert.equal(b.statuses.size, 0);
});

test("vampires cannot step sideways", async () => {
  select(makeToken("t5", makeActor("Ilse", "Vampire", 0), town));
  await game.modules.get(M).api.stepSideways();
  assert.ok(mock.log.notifications.some(([, m]) => /Only Garou/.test(m)));
});

test("a pack: one roll by the highest Gnosis; a packmate the roller does not own is changed by the GM", async () => {
  mock.asPlayer();
  const alpha = makeActor("Alpha", "Werewolf", 6);
  const beta = makeActor("Beta", "Werewolf", 3, {owner: false});
  const ta = makeToken("t6", alpha, grove);
  const tb = makeToken("t7", beta, grove, {owner: false});
  select(tb, ta);
  diceQueue.push([7, 7, 7, 2, 3, 4]);
  mock.DialogV2.queue(fill({pack: true, reflective: false}));
  await game.modules.get(M).api.stepSideways();
  assert.match(lastCard(), /led by Alpha/);
  assert.match(lastCard(), /Shift time: instantly/);
  assert.ok(alpha.statuses.has("wodx-umbra"));
  assert.ok(!beta.statuses.has("wodx-umbra"), "not yet: the player cannot change Beta");
  assert.equal(mock.log.socket.at(-1).name, `module.${M}`);
  await mock.deliver("gm");
  mock.asGM();
  assert.ok(beta.statuses.has("wodx-umbra"), "the GM applied it");
});

test("the GM socket only accepts WoDX statuses", async () => {
  const c = makeActor("Gamma", "Werewolf", 3);
  const tc = makeToken("t8", c, grove);
  game.socket.emit(`module.${M}`, {type: "applyChange", payload: {tokenUuid: tc.uuid, change: {add: ["dead", "wodx-umbra"]}}});
  await mock.deliver("gm");
  assert.deepEqual([...c.statuses], ["wodx-umbra"]);
});

test("W20 era: a mirror is needed, then failure means wait an hour, botch means Caught", async () => {
  await game.settings.set("wodx-chronicle", "eraLock", "modern");
  await mock.settle();
  assert.equal(game.modules.get(M).api.placeOf(makeToken("tx", makeActor("x", "Werewolf", 1), town)).gauntlet, 7);
  const g = makeActor("Lupe", "Werewolf", 4);
  select(makeToken("t9", g, town));
  mock.DialogV2.queue(fill({reflective: false, ownMirror: false, pulse: false, override: false}));
  await game.modules.get(M).api.stepSideways();
  assert.ok(mock.log.notifications.some(([, m]) => /reflective surface/.test(m)));
  diceQueue.push([2, 3, 4, 5]);
  mock.DialogV2.queue(fill({reflective: true, ownMirror: false, pulse: false, override: false}));
  await game.modules.get(M).api.stepSideways();
  assert.match(lastCard(), /Wait an hour/);
  mock.DialogV2.queue(fill({reflective: true, ownMirror: false, pulse: false, override: false}));
  await game.modules.get(M).api.stepSideways();
  assert.ok(mock.log.notifications.some(([, m]) => /wait an hour/.test(m)), "blocked within the hour");
  await game.time.advance(3700);
  diceQueue.push([1, 3, 4, 5]);
  mock.DialogV2.queue(fill({reflective: true, ownMirror: false, pulse: false, override: false}));
  await game.modules.get(M).api.stepSideways();
  assert.ok(g.statuses.has("wodx-caught"));
  await game.time.advance(3700);
  diceQueue.push([1, 2, 2, 3]);
  mock.DialogV2.queue(fill({reflective: false, ownMirror: false, pulse: false, override: false}));
  await game.modules.get(M).api.stepSideways();
  assert.match(lastCard(), /trapped until rescued/);
  assert.equal(g.getFlag(M, "attempts").trapped, true);
  const before = mock.log.chat.length;
  await game.time.advance(3700);
  mock.DialogV2.queue(fill({reflective: true, ownMirror: false, pulse: false, override: false}));
  await game.modules.get(M).api.stepSideways();
  assert.equal(mock.log.chat.length, before, "a trapped Garou cannot roll alone");
  assert.ok(mock.log.notifications.some(([, m]) => /Trapped until rescued/.test(m)));
  // A packmate rescues: the rescuer rolls, both arrive
  const rescuer = makeActor("Rescuer", "Werewolf", 2);
  select(canvas.tokens.controlled[0].document, makeToken("t9b", rescuer, town));
  diceQueue.push([8, 9]);
  mock.DialogV2.queue(fill({pack: true, reflective: true, ownMirror: false, pulse: false, override: false}));
  await game.modules.get(M).api.stepSideways();
  assert.match(lastCard(), /led by Rescuer/);
  assert.ok(!g.statuses.has("wodx-caught"));
  assert.ok(g.statuses.has("wodx-umbra"));
});

test("W20 peek from the physical world is Gauntlet +3, at most 9", async () => {
  const p = makeActor("Seer", "Werewolf", 3);
  select(makeToken("t10", p, grove));
  diceQueue.push([8, 9, 2]);
  mock.DialogV2.queue(fill({reflective: true, ownMirror: false, pulse: false, override: false}));
  await game.modules.get(M).api.peek();
  assert.match(lastCard(), /against difficulty 8/);
  assert.match(lastCard(), /sees across the Gauntlet/);
  assert.equal(p.statuses.size, 0);
});

test("a region with ratings overrides its scene; a Penumbra level receives the traveler", async () => {
  const levels = [makeLevel("lvPhys", "physical"), makeLevel("lvPen", "penumbra", 1000)];
  const proto = makeScene("s3", "Prototype · Penumbra · Lower Town", {settlement: "town"}, levels);
  const caern = {id: "r1", name: "The Standing Stones", behaviors: [{type: `${M}.ratings`, disabled: false,
    system: {settlement: "caern-active", gauntlet: null, modifier: 0, reflective: true, umbralStorm: false, priority: 1}}]};
  const g = makeActor("Theurge", "Werewolf", 4);
  const tok = makeToken("t11", g, proto, {regions: [caern]});
  select(tok);
  diceQueue.push([5, 6, 2, 3]);
  mock.DialogV2.queue(fill({reflective: true, ownMirror: false, pulse: false, override: false}));
  await game.modules.get(M).api.stepSideways();
  assert.match(lastCard(), /The Standing Stones/);
  assert.match(lastCard(), /Local Gauntlet 4/);
  assert.equal(tok._source.level, "lvPen");
  diceQueue.push([9, 9, 9, 9]);
  mock.DialogV2.queue(fill({reflective: true, ownMirror: false, pulse: false, override: false}));
  await game.modules.get(M).api.stepSideways();
  assert.equal(tok._source.level, "lvPhys");
});

test("Wyld West Umbral storm: each 1 counts twice", async () => {
  await game.settings.set("wodx-chronicle", "eraLock", "wild-west");
  await mock.settle();
  const storm = makeScene("s4", "Prairie", {settlement: "wilderness", umbralStorm: true});
  const g = makeActor("Rider", "Werewolf", 3);
  select(makeToken("t12", g, storm));
  diceQueue.push([6, 7, 1]);
  mock.DialogV2.queue(fill({reflective: true, ownMirror: false, pulse: false, override: false}));
  await game.modules.get(M).api.stepSideways();
  assert.match(lastCard(), /storm: 1s count twice/);
  assert.match(lastCard(), /too thick/);
  await game.settings.set("wodx-chronicle", "eraLock", "");
});

test("the charts page is written into Chronicle Rules", async () => {
  await game.modules.get(M).api.writeChartsPage();
  const rules = game.journal.find(j => j.getFlag("wodx-chronicle", "kind") === "chronicle-rules");
  const html = rules.pages.getName("Gauntlet charts").text.content;
  assert.match(html, /Dark Ages: Werewolf/);
  assert.match(html, /WoDX choice/);
  assert.match(html, /W20 Gauntlet Chart \(p\. 309\)/);
});

test("saving ratings keeps an existing report up to date", async () => {
  const {TaggingApp, writeReport} = await import(join(root, "modules/wodx-otherworlds/scripts/tagging-app.mjs"));
  const saved = game.scenes;
  class Coll extends Map { find(f) { for ( const v of this.values() ) if ( f(v) ) return v; } [Symbol.iterator]() { return this.values(); } }
  const square = makeScene("sq", "Lower Town · Market Square", null);
  const grove = makeScene("gr", "Locus · The Old Grove", null);
  game.scenes = new Coll([[square.id, square], [grove.id, grove]]);
  globalThis.Scene = {updateDocuments: async list => {
    for ( const u of list ) game.scenes.get(u._id).flags[M] = {ratings: u[`flags.${M}.ratings`]};
    return list;
  }};
  await writeReport();
  const page = () => game.journal.find(j => j.getFlag(M, "kind") === "ratings-report").pages.getName("Scenes").text.content;
  assert.match(page(), /0 of 2 scenes are tagged/);
  const app = new TaggingApp();
  await app.render({force: true});
  const form = app.element.tagName === "FORM" ? app.element : app.element.querySelector("form");
  form.elements["sq.settlement"].value = "town";
  form.elements["gr.settlement"].value = "wilderness";
  await TaggingApp.DEFAULT_OPTIONS.form.handler.call(app, new Event("submit"), form, null);
  assert.match(page(), /2 of 2 scenes are tagged/, "Save rewrote the report");
  assert.ok(mock.log.notifications.some(([, m]) => /Saved ratings for 2 scene\(s\) and updated the report/.test(m)));
  game.scenes = saved;
});

test("no error notifications", () => {
  assert.deepEqual(mock.log.notifications.filter(([l]) => l === "error"), []);
});
