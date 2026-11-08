import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join, relative} from "node:path";
import {mkdtempSync, mkdirSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {installMock} from "./foundry-mock.mjs";

/* Phase 5: twin levels, the Shroud, Disconnection, Umbral paths and Read the Soul */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
const M = "wodx-otherworlds";

class Field { constructor(options = {}) { this.options = options; } }
foundry.data.fields = {StringField: Field, NumberField: Field, BooleanField: Field};
foundry.data.regionBehaviors = {RegionBehaviorType: class {}};
class ForcedDeletion {}
foundry.data.operators = {ForcedDeletion};
CONFIG.RegionBehavior = {dataModels: {}, typeLabels: {}, typeHints: {}, typeIcons: {}};
CONFIG.statusEffects = [];
CONFIG.worldofdarkness.sheettype = {...CONFIG.worldofdarkness.sheettype, changingbreed: "Changing Breed", wraith: "Wraith", changeling: "Changeling"};

const uploads = [];
foundry.applications.apps = {FilePicker: {implementation: {
  async createDirectory(source, dir) { if ( uploads.some(u => u.dir === dir) ) throw new Error("EEXIST: The directory already exists"); uploads.push({dir}); },
  async upload(source, dir, file) { uploads.push({dir, name: file.name, text: await file.text()}); return {status: "success", path: `${dir}/${file.name}`}; }
}}};

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

/* ---- a small scene with embedded documents, shaped like Foundry 14's ---- */
const setPath = (o, path, v) => { const p = path.split("."); for ( const k of p.slice(0, -1) ) o = (o[k] ??= {}); if ( v instanceof ForcedDeletion ) delete o[p.at(-1)]; else o[p.at(-1)] = v; };
class EDoc {
  constructor(data, parent, kind) {
    Object.assign(this, structuredClone({...data, levels: undefined}));
    this.id = data._id ?? foundry.utils.randomID();
    this.parent = parent; this.kind = kind; this.flags ??= {};
    if ( "levels" in data || kind !== "Level" ) this.levels = new Set(data.levels ?? []);
    if ( kind === "Level" ) this.#base();
    if ( kind === "Region" ) this.behaviors = new Coll();
  }
  #base() { this.elevation.base = Number.isFinite(this.elevation.bottom) ? this.elevation.bottom : Math.min(this.elevation.top ?? 0, 0); }
  get uuid() { return `${this.parent.uuid}.${this.kind}.${this.id}`; }
  get _source() { return this; }
  getFlag(s, k) { return this.flags?.[s]?.[k]; }
  async setFlag(s, k, v) { (this.flags[s] ??= {})[k] = structuredClone(v); }
  async unsetFlag(s, k) { delete this.flags?.[s]?.[k]; }
  async update(ch) { applyChanges(this, ch); if ( this.kind === "Level" ) this.#base(); return this; }
  toObject() { const {parent, kind, behaviors, ...rest} = this; const o = structuredClone({...rest, levels: rest.levels ? [...rest.levels] : undefined}); o._id = this.id; delete o.id; if ( behaviors ) o.behaviors = behaviors.contents.map(b => b.toObject()); return o; }
  async createEmbeddedDocuments(type, list) { assert.equal(type, "RegionBehavior"); return list.map(d => { const b = new EDoc(d, this, "RegionBehavior"); this.behaviors.set(b.id, b); return b; }); }
}
function applyChanges(doc, ch) {
  for ( const [k, v] of Object.entries(ch) ) {
    if ( k === "_id" ) continue;
    if ( k === "levels" ) { doc.levels = new Set(v); continue; }
    const del = k.match(/^(.*)\.-=(.+)$/);
    if ( del ) { let o = doc; for ( const p of del[1].split(".") ) o = o?.[p]; if ( o ) delete o[del[2]]; continue; }
    setPath(doc, k, v);
  }
}
class Coll extends Map {
  get contents() { return [...this.values()]; }
  get size() { return super.size; }
  [Symbol.iterator]() { return this.values(); }
  filter(f) { return [...this.values()].filter(f); }
  some(f) { return [...this.values()].some(f); }
  find(f) { return [...this.values()].find(f); }
}
const KEY = {Level: "levels", Tile: "tiles", AmbientLight: "lights", Region: "regions", Token: "tokens"};
function makeScene(id, name, {bg = "rothenstein-world/maps/test-map.webp", tiles = [], lights = [], top = null, travel = []} = {}) {
  const scene = {
    id, name, uuid: `Scene.${id}`, flags: {}, grid: {size: 100, distance: 5}, width: 2000, height: 1600,
    dimensions: {sceneX: 0, sceneY: 0, sceneWidth: 2000, sceneHeight: 1600},
    levels: new Coll(), tiles: new Coll(), lights: new Coll(), regions: new Coll(), tokens: new Coll(), ops: [],
    getFlag(s, k) { return this.flags?.[s]?.[k]; },
    async setFlag(s, k, v) { (this.flags[s] ??= {})[k] = structuredClone(v); },
    async unsetFlag(s, k) { delete this.flags?.[s]?.[k]; },
    toObject() { return {id, name, levels: this.levels.contents.map(l => l.toObject()), tiles: this.tiles.contents.map(t => t.toObject())}; },
    async createEmbeddedDocuments(type, list) { this.ops.push(["create", type, list.length]); return list.map(d => { const doc = new EDoc(d, this, type); this[KEY[type]].set(doc.id, doc); return doc; }); },
    async updateEmbeddedDocuments(type, list) { this.ops.push(["update", type, list.length]); for ( const u of list ) applyChanges(this[KEY[type]].get(u._id), u); },
    async deleteEmbeddedDocuments(type, ids) { this.ops.push(["delete", type, ids.length]); for ( const i of ids ) this[KEY[type]].delete(i); }
  };
  const lv = new EDoc({_id: `${id}Level0`, name: "Ground", elevation: {bottom: 0, top}, background: {src: bg, color: "#000000"}, foreground: {src: null}, textures: {}, visibility: {levels: new Set()}}, scene, "Level");
  scene.levels.set(lv.id, lv);
  for ( const t of tiles ) { const d = new EDoc(t, scene, "Tile"); scene.tiles.set(d.id, d); }
  for ( const l of lights ) { const d = new EDoc(l, scene, "AmbientLight"); scene.lights.set(d.id, d); }
  for ( const [rid, dest] of travel ) {
    const r = new EDoc({_id: rid, name: `Travel ${rid}`, shapes: [], elevation: {bottom: null, top: null}, levels: [], flags: {}}, scene, "Region");
    const b = new EDoc({_id: `${rid}B`, type: "teleportToken", disabled: false, system: {destinations: [dest], choice: true}, flags: {}}, r, "RegionBehavior");
    r.behaviors.set(b.id, b);
    const text = new EDoc({_id: `${rid}T`, type: "displayScrollingText", system: {text: "The road"}, flags: {}}, r, "RegionBehavior");
    r.behaviors.set(text.id, text);
    scene.regions.set(rid, r);
  }
  game.scenes ??= new Coll();
  if ( !(game.scenes instanceof Coll) ) game.scenes = new Coll();
  game.scenes.set(id, scene);
  return scene;
}
function makeActor(name, type, {items = [], system = {}, owner = true} = {}) {
  return {id: foundry.utils.randomID(), name, type, items, isOwner: owner, flags: {}, statuses: new Set(), system,
    getFlag(s, k) { return this.flags?.[s]?.[k]; },
    async setFlag(s, k, v) { (this.flags[s] ??= {})[k] = structuredClone(v); },
    async unsetFlag(s, k) { delete this.flags?.[s]?.[k]; },
    async toggleStatusEffect(id, {active}) { if ( active ) this.statuses.add(id); else this.statuses.delete(id); }};
}
function makeToken(id, actor, scene, {elevation = 0, level} = {}) {
  const t = {id, name: actor.name, actor, parent: scene, isOwner: true, elevation, regions: new Set(), x: 400, y: 400, w: 100, h: 100,
    _source: {level: level ?? scene.levels.contents[0].id, elevation},
    async move({level, elevation}) { this._source.level = level; this.elevation = this._source.elevation = elevation; this.moved = {level, elevation}; }};
  scene.tokens.set(id, t);
  return t;
}
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

/* ---- the twin art list, as written with the art ---- */
const dir = mkdtempSync(join(tmpdir(), "wodx-twins-"));
const tw = (p, k) => `wodx-assets/twins/${p.replace(/\.webp$/, "")}--${k}.webp`;
const art = ["rothenstein-world/maps/test-map.webp", "rothenstein-world/maps/roofs/test-map--00.webp"];
const manifest = {version: 1, files: Object.fromEntries(art.map(p => [p, {penumbra: tw(p, "penumbra"), shadowlands: tw(p, "shadowlands")}]))};
mkdirSync(join(dir, "wodx-assets/twins"), {recursive: true});
writeFileSync(join(dir, "wodx-assets/twins/manifest.json"), JSON.stringify(manifest));
const manifestUrl = relative(root, join(dir, "wodx-assets/twins/manifest.json"));

await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
await import(join(root, "modules/wodx-otherworlds/scripts/main.mjs"));
game.modules.set(M, {});
const api = () => game.modules.get(M).api;
const T = await import(join(root, "modules/wodx-otherworlds/scripts/twins.mjs"));

test("ready", async () => {
  await Hooks.callAll("init");
  mock.setupTime();
  await Hooks.callAll("ready");
  await mock.settle();
  assert.ok(api().crossShroud);
  assert.ok(CONFIG.statusEffects.some(s => s.id === "wodx-shadowlands"));
});

let scene;
test("planning: what a world map needs, and what it lacks", () => {
  scene = makeScene("sc1", "Lower Town · Test", {
    tiles: [
      {_id: "roof0", texture: {src: "rothenstein-world/maps/roofs/test-map--00.webp"}, elevation: 8, levels: [], x: 500, y: 500, flags: {}},
      {_id: "prop1", texture: {src: "rothenstein-world/props/cart.webp"}, elevation: 0, levels: [], x: 900, y: 600, flags: {}}
    ],
    lights: [{_id: "lamp0", x: 300, y: 300, elevation: 0, levels: [], config: {color: "#ffaa55", bright: 10, dim: 20}, flags: {}}],
    travel: [["toRoad", "Scene.sc5.Region.toTown"]]
  });
  makeScene("sc5", "The Grove Road", {travel: [["toTown", "Scene.sc1.Region.toRoad"]]});
  const p = T.planTwins(scene, manifest);
  assert.equal(p.ok, true, p.problems.join(" "));
  assert.equal(p.layers.penumbra.src, "wodx-assets/twins/rothenstein-world/maps/test-map--penumbra.webp");
  assert.equal(p.tiles.length, 2);
  assert.equal(p.untwinnedTiles, 1, "the cart has no twin art; it will be tinted");
  assert.equal(p.built, false);
  const bare = makeScene("sc0", "No art", {bg: "elsewhere/map.webp"});
  assert.equal(T.planTwins(bare, manifest).ok, false);
  assert.match(T.planTwins(bare, manifest).problems.join(" "), /No Penumbra art/);
});

test("building: a backup first, two twin levels, roofs and lights copied, nothing deleted", async () => {
  const before = uploads.length;
  const r = await T.buildTwins(scene, {manifest});
  assert.deepEqual(r.made, {levels: 2, tiles: 4, lights: 2, regions: 2});
  assert.ok(uploads.slice(before).some(u => u.dir === "wodx-backups/scenes" && /^sc1-.*\.json$/.test(u.name)), "backup written");
  assert.ok(!scene.ops.some(([op]) => op === "delete"), "nothing deleted");
  const L = T.layersOf(scene);
  assert.equal(L.physical.getFlag(M, "layer"), "physical");
  assert.equal(L.physical.elevation.top, 20, "an open-topped level gets a ceiling of 4 squares");
  assert.equal(L.penumbra.elevation.bottom, 1000);
  assert.equal(L.shadowlands.elevation.top, 2020);
  assert.equal(L.shadowlands.background.src, "wodx-assets/twins/rothenstein-world/maps/test-map--shadowlands.webp");
  assert.equal(L.penumbra.visibility.levels.length, 0, "a twin level shows only itself");
  // The physical roof stays on the physical level; its twin copies sit on the twin levels at the same height
  const roof = scene.tiles.get("roof0");
  assert.deepEqual([...roof.levels], [L.physical.id]);
  const copies = scene.tiles.filter(t => t.getFlag(M, "twinOf") === "roof0");
  assert.equal(copies.length, 2);
  const pen = copies.find(c => c.getFlag(M, "layer") === "penumbra");
  assert.deepEqual([...pen.levels], [L.penumbra.id]);
  assert.equal(pen.elevation, 1008);
  assert.equal(pen.texture.src, "wodx-assets/twins/rothenstein-world/maps/roofs/test-map--00--penumbra.webp");
  assert.equal(pen.x, 500, "same place");
  const cart = scene.tiles.find(t => t.getFlag(M, "twinOf") === "prop1" && t.getFlag(M, "layer") === "shadowlands");
  assert.equal(cart.texture.src, "rothenstein-world/props/cart.webp");
  assert.equal(cart.texture.tint, T.LAYERS.shadowlands.tint);
  const lamp = scene.lights.find(l => l.getFlag(M, "twinOf") === "lamp0" && l.getFlag(M, "layer") === "shadowlands");
  assert.equal(lamp.config.color, T.LAYERS.shadowlands.light);
  assert.equal(lamp.config.dim, 15);
  assert.equal(T.planTwins(scene, manifest).built, true);
});

test("building again changes nothing and writes no second backup", async () => {
  const before = uploads.length;
  const n = scene.tiles.size;
  const r = await T.buildTwins(scene, {manifest});
  assert.deepEqual(r.made, {levels: 0, tiles: 0, lights: 0});
  assert.equal(scene.tiles.size, n);
  assert.equal(uploads.length, before);
});

test("travel: a road out of one map's Penumbra leads to the next map's Penumbra, once both are built", async () => {
  const L = T.layersOf(scene);
  const road = game.scenes.get("sc5");
  const out = scene.regions.get("toRoad");
  assert.deepEqual([...out.levels], [L.physical.id], "the physical road keeps to the physical level (Foundry needs one level)");
  const pen = scene.regions.find(r => r.getFlag(M, "twinOf") === "toRoad" && r.getFlag(M, "layer") === "penumbra");
  assert.deepEqual([...pen.levels], [L.penumbra.id]);
  const tp = () => pen.behaviors.find(b => b.type === "teleportToken");
  assert.equal(tp().disabled, true, "the far side has no twin yet: switched off, nobody lands in the wrong world");
  assert.equal(pen.behaviors.find(b => b.type === "displayScrollingText").disabled, undefined, "other behaviors come along as they were");
  await T.buildTwins(road, {manifest, backup: false});
  const back = road.regions.find(r => r.getFlag(M, "twinOf") === "toTown" && r.getFlag(M, "layer") === "penumbra");
  assert.equal(tp().disabled, false);
  assert.deepEqual(tp().system.destinations, [back.uuid]);
  assert.deepEqual(back.behaviors.find(b => b.type === "teleportToken").system.destinations, [pen.uuid]);
  const shadowOut = scene.regions.find(r => r.getFlag(M, "twinOf") === "toRoad" && r.getFlag(M, "layer") === "shadowlands");
  const shadowBack = road.regions.find(r => r.getFlag(M, "twinOf") === "toTown" && r.getFlag(M, "layer") === "shadowlands");
  assert.deepEqual(shadowOut.behaviors.find(b => b.type === "teleportToken").system.destinations, [shadowBack.uuid], "each world keeps to itself");
  assert.deepEqual(await T.relinkTravel(), {linked: 4, waiting: 0});
});

test("a Garou steps sideways onto the Penumbra level, keeping its height; the crossing is recorded", async () => {
  scene.flags[M] = {ratings: {settlement: "town"}};
  const L = T.layersOf(scene);
  const g = makeActor("Radek", "Werewolf", {system: {advantages: {gnosis: {roll: 4, permanent: 4}}}});
  const tok = makeToken("tk1", g, scene, {elevation: 8});
  select(tok);
  await game.time.set(1000000);
  diceQueue.push([8, 9, 2, 3]);
  mock.DialogV2.queue(fill({reflective: true}));
  await api().stepSideways();
  assert.equal(tok._source.level, L.penumbra.id);
  assert.equal(tok.elevation, 1008, "on the roof in the physical world, on the twin roof in the Penumbra");
  assert.deepEqual(g.getFlag(M, "world"), {in: "umbra", since: 1000000});
  // Two lunar cycles later, going back is 2 harder (W20 p. 319)
  await game.time.set(1000000 + 60 * 86400);
  diceQueue.push([8, 9, 2, 3]);
  mock.DialogV2.queue(fill({reflective: true}));
  await api().stepSideways();
  const card = mock.log.chat.at(-1).content;
  assert.match(card, /Disconnection: 2 lunar cycles in this world \+2/);
  assert.equal(tok._source.level, L.physical.id);
  assert.equal(tok.elevation, 8);
  assert.equal(g.getFlag(M, "world").in, "physical");
});

test("a year and a day in the Umbra goes to the approval queue, once", async () => {
  const g = makeActor("Lost Theurge", "Werewolf");
  game.actors = new Coll([[g.id, g]]);
  await g.setFlag(M, "world", {in: "umbra", since: 0});
  await game.time.set(365 * 86400);
  assert.equal(await api().checkYearAndDay(), 0);
  await game.time.set(367 * 86400);
  await mock.settle();
  const q = () => game.settings.get("wodx-chronicle", "approvals").pending.filter(p => p.type === "wodx-umbra-year");
  assert.equal(q().length, 1, "proposed by the clock hook");
  assert.match(q()[0].detail, /W20 p\. 319/);
  assert.equal(await api().checkYearAndDay(), 0, "not proposed twice");
  await game.modules.get("wodx-chronicle").api.approvals.decide(q()[0].id, "approve");
  assert.ok(g.getFlag(M, "spiritChange"));
});

test("Cross the Shroud: the Storyteller moves tokens to the Shadowlands level and back", async () => {
  const L = T.layersOf(scene);
  const m = makeActor("Dying Monk", "Mortal");
  const tok = makeToken("tk2", m, scene);
  select(tok);
  mock.DialogV2.queue(fill({means: "neardeath"}));
  await api().crossShroud();
  assert.equal(tok._source.level, L.shadowlands.id);
  assert.equal(tok.elevation, 2000);
  assert.ok(m.statuses.has("wodx-shadowlands"));
  const card = mock.log.chat.at(-1);
  assert.match(card.content, /Across the Shroud/);
  assert.ok(card.whisper?.length, "whispered to the Storyteller");
  // A Garou cannot step sideways from the Shadowlands
  const g = makeActor("Wanderer", "Werewolf", {system: {advantages: {gnosis: {roll: 3}}}});
  const gt = makeToken("tk3", g, scene, {level: L.shadowlands.id});
  select(gt);
  await api().stepSideways();
  assert.match(mock.log.notifications.at(-1)[1], /beyond the Shroud/);
  select(tok);
  mock.DialogV2.queue(fill({means: "storyteller"}));
  await api().crossShroud();
  assert.equal(tok._source.level, L.physical.id);
  assert.ok(!m.statuses.has("wodx-shadowlands"));
  mock.asPlayer();
  await api().crossShroud();
  assert.match(mock.log.notifications.at(-1)[1], /Storyteller's call/);
  mock.asGM();
});

test("an Umbral path is a teleport region on the two Penumbra levels only", async () => {
  const other = makeScene("sc2", "The Old Grove", {bg: "rothenstein-world/maps/test-map.webp"});
  await T.buildTwins(other, {manifest, backup: false});
  const {from, to} = await T.makeUmbralPath(scene, other);
  assert.deepEqual([...from.levels], [T.layersOf(scene).penumbra.id]);
  assert.deepEqual([...to.levels], [T.layersOf(other).penumbra.id]);
  const b = from.behaviors.contents[0];
  assert.equal(b.type, "teleportToken");
  assert.deepEqual(b.system.destinations, [to.uuid]);
  assert.equal(to.behaviors.contents[0].system.destinations[0], from.uuid);
  assert.equal(from.shapes[0].x, 1000, "the middle of the map");
  const bare = makeScene("sc3", "No twins");
  await assert.rejects(T.makeUmbralPath(scene, bare), /Penumbra level first: No twins/);
});

test("removing twins asks first, keeps the physical map and puts roofs back on every level", async () => {
  const L = T.layersOf(scene);
  const m = makeActor("Ghost-touched", "Mortal");
  const tok = makeToken("tk4", m, scene, {level: L.penumbra.id, elevation: 1000});
  mock.DialogV2.queue(() => false);
  assert.equal(await T.removeTwins(scene), null);
  assert.equal(T.layersOf(scene).penumbra?.id, L.penumbra.id, "declined: nothing changed");
  mock.DialogV2.queue(() => true);
  const r = await T.removeTwins(scene);
  assert.ok(r.removed >= 8);
  assert.ok(r.backup.startsWith("wodx-backups/scenes/"));
  assert.equal(tok._source.level, L.physical.id, "the token was moved home first");
  assert.equal(scene.levels.size, 1);
  assert.equal(scene.tiles.size, 2);
  assert.equal(scene.tiles.get("roof0").levels.size, 0);
  assert.equal(scene.tiles.get("roof0").getFlag(M, "wasOnAllLevels"), undefined);
  assert.equal(scene.lights.size, 1);
  assert.equal(scene.regions.get("toRoad").levels.size, 0, "the road is on every level again");
  const road = game.scenes.get("sc5");
  const back = road.regions.find(r => r.getFlag(M, "twinOf") === "toTown" && r.getFlag(M, "layer") === "penumbra");
  assert.equal(back.behaviors.find(b => b.type === "teleportToken").disabled, true, "the far side's twin road is switched off again");
});

test("the manifest loads from Data, and a missing one says what to do", async () => {
  const m = await T.loadManifest(manifestUrl, {fresh: true});
  assert.equal(Object.keys(m.files).length, 2);
  await assert.rejects(T.loadManifest("nowhere/manifest.json", {fresh: true}), /Copy the twin art into Data\/wodx-assets\/twins/);
});

test("the twin levels window: a search box, the scenes with art, a build", async () => {
  const {TwinsApp} = await import(join(root, "modules/wodx-otherworlds/scripts/twins-app.mjs"));
  const s = makeScene("sc4", "Dolany Village");
  const app = new TwinsApp();
  app.manifest = manifest;
  await app.render({force: true});
  assert.ok(app.element.querySelector("input.wodx-search"), "rule B24");
  assert.equal(app.element.querySelectorAll("input[name=pick]").length, game.scenes.size - 1, "every scene with twin art, not the one without");
  app.element.querySelector(`input[name=pick][value=${s.id}]`).checked = true;
  mock.DialogV2.queue(() => true);
  await app.click("[data-action=build]");
  assert.equal(T.planTwins(s, manifest).built, true);
  const j = game.journal.find(x => x.getFlag(M, "kind") === "twins-report");
  assert.match(j.pages.getName("Twin levels").text.content, /Dolany Village: 2 level/);
});

/* ---- Read the Soul ---- */
const S = await import(join(root, "modules/wodx-otherworlds/scripts/senses.mjs"));
const auspex = n => [{type: "Power", name: "Auspex", system: {type: "wod.types.discipline", value: n}}];
const seer = (n = 2) => makeActor("Seer", "Vampire", {items: auspex(n), system: {attributes: {perception: {value: 3, total: 3}}, abilities: {empathy: {value: 2}}}});

test("Read the Soul: what each number of successes shows (V20 Dark Ages p. 195)", async () => {
  const v = makeActor("Elder", "Vampire");
  await v.setFlag(M, "aura", {mood: "suspicious", shift: "afraid", diablerist: true, mixture: "Guilt under the suspicion."});
  assert.deepEqual(S.reading(v, 1).lines, ["The soul is pale."]);
  assert.match(S.reading(v, 2).lines[1], /Dark Blue: suspicious/);
  assert.match(S.reading(v, 3).lines.join(" "), /Black veins/);
  assert.match(S.reading(v, 4).lines.join(" "), /shift toward orange: afraid/);
  assert.match(S.reading(v, 5).lines.join(" "), /Guilt under the suspicion/);
  assert.deepEqual(S.reading(v, 0).lines, ["The soul will not come clear."]);
  const ghoul = makeActor("Thrall", "Mortal", {system: {settings: {variant: "ghoul"}}});
  assert.equal(S.natureOf(ghoul), "ghoul");
  assert.match(S.reading(ghoul, 3).lines.join(" "), /Pale blotches/);
  assert.doesNotMatch(S.reading(ghoul, 2).lines.join(" "), /blotches/, "blotches are a pattern: 3 successes");
  assert.match(S.reading(makeActor("Wolf", "Werewolf"), 1).lines[0], /bright, vibrant/);
  assert.equal(S.natureOf(makeActor("Shade", "Wraith")), "ghost");
  const frenzied = makeActor("Brute", "Vampire", {system: {conditions: {isfrenzy: true}}});
  assert.match(S.reading(frenzied, 3).lines.join(" "), /Rapidly rippling/);
  // A botch is misinformation, told as if true
  const lie = S.reading(v, 0, {botch: true, random: () => 0});
  assert.equal(lie.lines[0], "The soul is bright.");
  assert.doesNotMatch(lie.lines.join(" "), /suspicious|veins/i);
});

test("Read the Soul: the roll goes to the Storyteller; the player sees only the reading", async () => {
  const reader = seer(2);
  const target = makeActor("Merchant", "Mortal");
  await target.setFlag(M, "aura", {mood: "afraid"});
  const rt = makeToken("r1", reader, scene);
  const tt = makeToken("r2", target, scene);
  mock.asPlayer();
  diceQueue.push([8, 9, 3, 4, 2]);
  mock.DialogV2.queue(fill({mod: 0}));
  const before = mock.log.chat.length;
  const r = await S.readTheSoul({reader: rt, target: tt});
  assert.equal(r.n, 2);
  const [gmCard, playerCard] = mock.log.chat.slice(before);
  assert.ok(gmCard.blind && gmCard.whisper.every(id => game.users.get(id)?.isGM), "the roll is blind, to the Storyteller");
  assert.match(gmCard.content, /5 dice at 8/);
  assert.deepEqual(playerCard.whisper, [game.user.id]);
  assert.match(playerCard.content, /Orange: afraid/);
  assert.doesNotMatch(playerCard.content, /dice|8, 9/);
  // A botch looks like a reading to the player
  diceQueue.push([1, 3, 4, 2, 5]);
  mock.DialogV2.queue(fill({mod: 0}));
  const b = await S.readTheSoul({reader: rt, target: tt});
  assert.equal(b.result.botch, true);
  assert.match(mock.log.chat.at(-1).content, /soul/);
  assert.doesNotMatch(mock.log.chat.at(-1).content, /[Bb]otch/);
  assert.match(mock.log.chat.at(-2).content, /Botch: the player was shown a false reading/);
  // Auspex 1 is not enough
  const novice = makeToken("r3", seer(1), scene);
  mock.DialogV2.queue(fill({mod: 0}));
  assert.equal(await S.readTheSoul({reader: novice, target: tt}), null);
  assert.match(mock.log.notifications.at(-1)[1], /needs Auspex 2/);
  mock.asGM();
});

test("the aura overlay draws for the reader in well under a frame", () => {
  const drawn = [];
  globalThis.PIXI = {Graphics: class { constructor() { this.calls = 0; } lineStyle() { this.calls++; } drawCircle() { this.calls++; } beginFill() {} endFill() {} moveTo() {} lineTo() {} destroy() { drawn.push("gone"); } }};
  canvas.interface = {addChild: g => drawn.push(g)};
  const draw = S.reading(makeActor("Elder", "Vampire", {system: {conditions: {isfrenzy: true}}}), 5).draw;
  const ms = S.drawAura({id: "x1", x: 0, y: 0, w: 100, h: 100}, draw, {seconds: 0.01});
  assert.ok(ms !== null && ms < 16, `drawn in ${ms} ms`);
  assert.ok(drawn[0].calls > 6);
  S.clearAura("x1");
  assert.equal(drawn.at(-1), "gone");
});

test("the Storyteller sets an aura", async () => {
  const a = makeActor("Sister Agnes", "Mortal");
  mock.DialogV2.queue(form => { assert.ok(form.querySelector("input.wodx-search"), "rule B24: the colour lists have search boxes"); return fill({mood: "idealistic", shift: "sad", diablerist: false, confused: true, mixture: "Faith over grief."})(form); });
  await S.editAura(a);
  assert.deepEqual(a.getFlag(M, "aura"), {mood: "idealistic", shift: "sad", nature: null, diablerist: false, confused: true, mixture: "Faith over grief."});
});

test("no error notifications", () => {
  assert.deepEqual(mock.log.notifications.filter(([l]) => l === "error"), []);
});
