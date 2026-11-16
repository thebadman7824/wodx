import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";
import {installActors} from "./actors-mock.mjs";

/*
 * Final audit (B6755): the haven upgrades with no security do something in play, not only their words.
 *   a sealed cellar: a shade region on the haven's map, and the owner's day haven where none was set
 *   shutters: the haven's rooms count as indoors for the sun, and a scouting rival has half the chance
 *   a show room: a region marks it, and the owner's standing in the town rises by one
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
await installActors(root);
globalThis.canvas = {tokens: {controlled: []}, scene: null};
await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
await import(join(root, "modules/wodx-storyteller/scripts/main.mjs"));
game.modules.set("wodx-chronicle", {active: true});
game.modules.set("wodx-storyteller", {active: true});
const ST = () => game.modules.get("wodx-storyteller").api;
const W = await import(join(root, "modules/wodx-storyteller/scripts/haven-works-rules.mjs"));
const deeds = [];
let anna, scene;

function makeScene(id, haven, flags = {}) {
  const regions = [];
  const s = {id, name: "Anna's house", width: 2000, height: 1500, grid: {size: 100}, regions, flags: {"wodx-storyteller": {haven}, ...flags},
    getFlag(m, k) { return this.flags?.[m]?.[k]; },
    async update(d) { for ( const [k, v] of Object.entries(d) ) { const p = k.split("."); let o = this; while ( p.length > 1 ) { const x = p.shift(); o = (o[x] ??= {}); } o[p[0]] = structuredClone(v); } return this; },
    async createEmbeddedDocuments(type, list) { assert.equal(type, "Region"); const made = list.map(r => ({id: `r${regions.length + 1}`, ...structuredClone(r)})); regions.push(...made); return made; }};
  game.scenes.set(id, s);
  return s;
}

test("set up", async () => {
  await Hooks.callAll("init"); mock.setupTime(); await Hooks.callAll("ready"); await mock.settle();
  anna = await Actor.create({name: "Anna", type: "Vampire", ownership: {default: 0, p1: 3}});
  game.modules.set("wodx-npc", {active: true, api: {standing: {deed: async (a, d) => { deeds.push({id: a.id, ...d}); return d; }}}});
  CONFIG.RegionBehavior ??= {}; CONFIG.RegionBehavior.dataModels ??= {}; CONFIG.RegionBehavior.dataModels["wodx-actions.sunlight"] = class {};
  scene = makeScene("hv1", {name: "Anna's house", owners: [anna.id], security: 0});
});

test("a sealed cellar: a shade region the sun never reaches, and the owner's day haven", async () => {
  await ST().havenWorks.install(scene, "cellar");
  const r = scene.regions.find(x => x.flags?.["wodx-storyteller"]?.havenWork === "cellar");
  assert.ok(r, "a cellar region on the map");
  assert.match(r.name, /shade/i, "WoDX Actions' sunlight reads a shade name");
  assert.equal(r.behaviors[0]?.system?.light, "shade");
  assert.deepEqual(anna.flags["wodx-actions"]?.haven, {sceneId: "hv1", sceneName: scene.name, regionId: r.id, regionName: r.name});
});

test("shutters: indoors for the sun, half the chance for a scout", async () => {
  await ST().havenWorks.install(scene, "shutters");
  assert.equal(scene.flags["wodx-actions"]?.light, "indoors");
  const works = {upgrades: [{key: "wall", at: 0}], traces: [{key: "builders", at: 0, w: 5}]};
  const shut = {upgrades: [{key: "wall", at: 0}, {key: "shutters", at: 0}], traces: [{key: "builders", at: 0, w: 5}]};
  const at = rand => W.probeMonth({works: shut, security: 0, rival: {id: "x"}, now: 0, year: 1400, rand});
  assert.ok(W.probeMonth({works, security: 0, rival: {id: "x"}, now: 0, year: 1400, rand: () => 0.15}), "open windows: probed");
  assert.equal(at(() => 0.15), null, "shuttered: missed");
  assert.ok(at(() => 0.05));
  const yard = makeScene("hv2", {name: "Yard", owners: [anna.id]}, {"wodx-actions": {light: "outdoors"}});
  await ST().havenWorks.install(yard, "shutters");
  assert.equal(yard.flags["wodx-actions"].light, "outdoors", "an open yard stays open to the sky");
});

test("a show room: marked on the map, and the owner's standing rises by one", async () => {
  await ST().havenWorks.install(scene, "show-hall");
  assert.ok(scene.regions.some(x => x.flags?.["wodx-storyteller"]?.havenWork === "show-hall" && /guests/i.test(x.name)));
  assert.equal(deeds.length, 1);
  assert.equal(deeds[0].id, anna.id); assert.equal(deeds[0].delta, 1); assert.equal(deeds[0].community, "town");
  assert.match(ST().havenWorks.rules.effectOf("show-salon").does, /standing/);
});
