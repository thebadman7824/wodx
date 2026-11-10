import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* Adopt a generated map (Interactables 0.19.0): the sidecar the farmstead generator writes, read and applied */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const A = await import(join(root, "modules/wodx-interactables/scripts/adopt-rules.mjs"));
const R = await import(join(root, "modules/wodx-interactables/scripts/interact-rules.mjs"));
const SAMPLE = readFileSync(join(root, "tools/mapgen/samples/kessler-steading.wodx.json"), "utf8");
const MOD = "wodx-interactables";
const FRAME = {sceneX: 280, sceneY: 210, size: 140, distance: 5, sceneWidth: 0, sceneHeight: 0};
const sample = () => A.parseSidecar(SAMPLE).data;

/** The door walls an import would make: one at each opening, nudged a little, plus the plain building walls. */
function importedWalls(sc, fr, {skip = []} = {}) {
  const walls = [];
  sc.openings.forEach((o, i) => {
    if ( skip.includes(o.id) ) return;
    const c = [...A.px(fr, o.c[0], o.c[1]), ...A.px(fr, o.c[2], o.c[3])].map(v => v + 6);
    walls.push({id: `door${i}`, c, door: 1, flags: {}});
  });
  walls.push({id: "plain", c: [...A.px(fr, 13, 15), ...A.px(fr, 25, 15)], door: 0, flags: {}});
  return walls;
}

test("adopt: the farmstead's sidecar reads cleanly", () => {
  const got = A.parseSidecar(SAMPLE);
  assert.equal(got.ok, true);
  assert.deepEqual(got.errors, []);
  assert.equal(got.data.openings.length, 10);
  assert.equal(got.data.features.length, 8);
  assert.equal(got.data.regions.length, 4);
  assert.deepEqual(got.data.cells, [50, 36]);
});

test("adopt: every feature and opening is something Interactables knows", () => {
  const sc = sample();
  for ( const o of sc.openings ) {
    assert.ok(R.KINDS[o.flags.kind], o.id);
    assert.ok(R.MATERIALS[o.flags.material], o.id);
    assert.ok(R.LOCKS[o.flags.lock], o.id);
  }
  for ( const f of sc.features ) {
    const k = A.TILE_KINDS.filter(x => f.flags[x] === true);
    assert.equal(k.length, 1, f.id);
    if ( f.flags.container ) { assert.equal(f.flags.fillPlace, "home"); assert.ok(R.CONTAINERS[f.flags.kind]); assert.ok(R.LOCKS[f.flags.lock]); assert.equal(R.describeContainer(f.flags).ds, "locked"); }
    if ( f.flags.hide ) assert.equal(R.describeHide(f.flags).kind, f.flags.hideKind, f.id);
    if ( f.flags.climb ) { const o = R.describeClimb(f.flags); assert.equal(o.kind, "rope"); assert.equal(o.height, 25); }
    if ( f.flags.light ) { assert.ok(R.LIGHTS[f.flags.lightKind]); assert.ok(f.light); }
  }
});

test("adopt: a bad file is refused in plain words, and bad parts are left out", () => {
  assert.equal(A.parseSidecar("{nope").ok, false);
  assert.match(A.parseSidecar({format: "other"}).errors[0], /not a WoDX map file/);
  assert.match(A.parseSidecar({format: "wodx-map", version: 9, cells: [10, 10]}).errors[0], /version 9/);
  assert.match(A.parseSidecar({format: "wodx-map", version: 1}).errors[0], /size in squares/);
  const got = A.parseSidecar({format: "wodx-map", version: 1, cells: [10, 10],
    openings: [{id: "a", c: [1, 1, 2, 1], flags: {kind: "door", evil: "x"}}, {id: "a", c: [3, 3, 4, 3]}, {id: "far", c: [50, 1, 51, 1]}],
    features: [{id: "two", rect: [1, 1, 1, 1], flags: {hide: true, container: true}}, {id: "ok", rect: [1, 1, 1, 1], flags: {hide: true, hideKind: "bed", bad: {x: 1}}}],
    regions: [{id: "r", rect: [0, 0, 2, 2], behaviors: [{type: "explode"}]}]});
  assert.equal(got.ok, true);
  assert.deepEqual(got.data.openings.map(o => o.id), ["a"]);
  assert.deepEqual(got.data.openings[0].flags, {kind: "door"});
  assert.deepEqual(got.data.features.map(f => f.id), ["ok"]);
  assert.equal("bad" in got.data.features[0].flags, false);
  assert.equal(got.data.regions.length, 0);
  assert.ok(got.errors.some(e => /share the id a/.test(e)));
  assert.ok(got.errors.some(e => /far: its position/.test(e)));
  assert.ok(got.errors.some(e => /exactly one kind/.test(e)));
  assert.ok(got.errors.some(e => /unknown type/.test(e)));
});

test("adopt: cells become pixels from the scene's corner, inside the padding", () => {
  const fr = A.frameOf({dimensions: FRAME});
  assert.deepEqual(A.px(fr, 0, 0), [280, 210]);
  assert.deepEqual(A.px(fr, 2, 1.5), [560, 420]);
  const t = A.tileData(sample().features.find(f => f.id === "well"), fr);
  assert.deepEqual([t.x, t.y, t.width, t.height], [280 + 24 * 140, 210 + 17 * 140, 140, 140]);
  assert.equal(t.flags[MOD].climb, true);
  assert.equal(t.flags[MOD].adoptId, "well");
  assert.equal(t.texture.src, null);
  assert.equal(t.hidden, false);
});

test("adopt: a scene of the wrong size gets a warning", () => {
  const sc = sample();
  assert.equal(A.sizeWarning(sc, A.frameOf({...FRAME, sceneWidth: 50 * 140, sceneHeight: 36 * 140})), null);
  assert.match(A.sizeWarning(sc, A.frameOf({...FRAME, sceneWidth: 30 * 140, sceneHeight: 36 * 140})), /50 by 36 squares.*30 by 36/);
});

test("adopt: each opening finds the door wall the import made there; a missing one is drawn new", () => {
  const sc = sample(), fr = A.frameOf(FRAME);
  const walls = importedWalls(sc, fr, {skip: ["house-window-5"]});
  const {pairs, missing} = A.matchOpenings(sc.openings, walls, fr);
  assert.equal(pairs.length, 9);
  assert.deepEqual(missing.map(m => m.opening.id), ["house-window-5"]);
  assert.ok(pairs.every(p => p.wall.id !== "plain"), "a plain wall is never taken when a door wall is there");
  assert.equal(new Set(pairs.map(p => p.wall.id)).size, 9, "a wall serves one opening");
  // A wall that runs the other way is not the opening
  const turned = [{id: "x", door: 1, flags: {}, c: [...A.px(fr, 14.5, 14.5), ...A.px(fr, 14.5, 15.5)]}];
  assert.equal(A.matchOpenings([sc.openings.find(o => o.id === "house-window-5")], turned, fr).pairs.length, 0);
});

test("adopt: the bar goes on the inside of the building", () => {
  const sc = sample(), fr = A.frameOf(FRAME);
  for ( const o of sc.openings.filter(x => x.barInside) ) {
    const c = [...A.px(fr, o.c[0], o.c[1]), ...A.px(fr, o.c[2], o.c[3])];
    const f = A.openingFlags(o, c, fr);
    const [ix, iy] = A.px(fr, ...o.inside);
    assert.equal(f.barSide, R.sideOf(c, {x: ix, y: iy}), o.id);
    assert.equal(f.barred, undefined, "barred only when the Storyteller says so");
  }
});

test("adopt: the plan sets up every opening, thing, light and region, and adopting again does nothing", () => {
  const sc = sample(), fr = A.frameOf(FRAME);
  const types = new Set(Object.values(A.BEHAVIORS));
  const scene = {walls: importedWalls(sc, fr), tiles: [], lights: [], regions: []};
  const p = A.plan(sc, scene, fr, types);
  assert.equal(p.wallUpdates.length, 10);
  assert.equal(p.wallCreates.length, 0);
  assert.equal(p.tiles.length, 8);
  assert.equal(p.lights.length, 1);
  assert.equal(p.regions.length, 4);
  const home = p.regions.find(r => r.name === "Longhouse");
  assert.deepEqual(home.flags["wodx-npc"].place, {kind: "home", owner: "", private: false});
  const trig = p.regions.find(r => r.name === "Track into the steading");
  assert.equal(trig.behaviors[0].type, "wodx-npc.trigger");
  assert.equal(trig.behaviors[0].system.does, "note");
  assert.equal(p.lights[0].data.config.dim, 15, "3 squares of 5 feet");
  const lines = A.summary(p);
  assert.ok(lines.some(l => /10 doors and windows/.test(l)));
  assert.ok(lines.some(l => /8 things made interactable \(containers, lights, hiding places, climbs\)/.test(l)), lines.join(" | "));
  // Once adopted, every piece carries its id and nothing is made twice
  const after = {walls: scene.walls.map(w => { const u = p.wallUpdates.find(x => x._id === w.id); return u ? {...w, flags: u.flags} : w; }),
    tiles: p.tiles.map((t, i) => ({id: `t${i}`, flags: t.flags})), lights: p.lights.map((l, i) => ({id: `l${i}`, flags: l.data.flags})), regions: p.regions.map((r, i) => ({id: `r${i}`, flags: r.flags}))};
  const again = A.plan(sc, after, fr, types);
  assert.deepEqual(A.summary(again), []);
  assert.ok(again.notes.some(n => /adopted before/.test(n)));
});

test("adopt: without WoDX NPC, places are still drawn and trigger regions are left out with a note", () => {
  const sc = sample(), fr = A.frameOf(FRAME);
  const p = A.plan(sc, {walls: [], tiles: [], lights: [], regions: []}, fr, new Set());
  assert.deepEqual(p.regions.map(r => r.name), ["Longhouse", "Barn"]);
  assert.ok(p.notes.some(n => /Footbridge: left out/.test(n)));
  assert.equal(p.wallCreates.length, 10, "no walls on the scene: every door is drawn new");
  assert.ok(p.notes.some(n => /No wall was found at 10 doors or windows/.test(n)));
});

/* ---------------- the runtime, on a stand-in scene ---------------- */

function collection(name, docs) {
  const m = new Map(docs.map(d => [d.id, d]));
  return {name, get: id => m.get(id), get contents() { return [...m.values()]; }, values: () => m.values(), _m: m};
}
function setPath(obj, path, v) {
  const keys = path.split("."); let o = obj;
  for ( const k of keys.slice(0, -1) ) o = o[k] ??= {};
  const last = keys.at(-1);
  if ( last.startsWith("-=") ) delete o[last.slice(2)]; else o[last] = v;
}
function applyChanges(doc, ch) {
  for ( const [k, v] of Object.entries(ch) ) {
    if ( k === "_id" ) continue;
    if ( k.includes(".") ) setPath(doc, k, v);
    else if ( k === "flags" ) { doc.flags ??= {}; for ( const [s, f] of Object.entries(v) ) doc.flags[s] = {...(doc.flags[s] ?? {}), ...f}; }
    else doc[k] = v;
  }
}
function mockScene(walls) {
  let n = 0;
  const mk = d => { const doc = {id: `new${++n}`, flags: {}, ...structuredClone(d)}; doc.update = async ch => applyChanges(doc, ch); return doc; };
  const wallDocs = walls.map(w => { const d = {...structuredClone(w)}; d.update = async ch => applyChanges(d, ch); return d; });
  const scene = {name: "Steading", flags: {}, dimensions: FRAME, background: {src: "maps/kessler-steading.webp"},
    walls: collection("Wall", wallDocs), tiles: collection("Tile", []), lights: collection("AmbientLight", []), regions: collection("Region", [])};
  const coll = t => ({Wall: scene.walls, Tile: scene.tiles, AmbientLight: scene.lights, Region: scene.regions})[t];
  scene.createEmbeddedDocuments = async (t, data) => data.map(d => { const doc = mk(d); coll(t)._m.set(doc.id, doc); return doc; });
  scene.updateEmbeddedDocuments = async (t, ups) => ups.map(u => { const d = coll(t).get(u._id); applyChanges(d, u); return d; });
  scene.deleteEmbeddedDocuments = async (t, ids) => ids.forEach(id => coll(t)._m.delete(id));
  scene.update = async ch => applyChanges(scene, ch);
  return scene;
}

test("adopt: the runtime applies the plan, links the oven's light, and Undo puts it all back", async () => {
  globalThis.foundry = {data: {operators: {}}};
  globalThis.CONFIG = {RegionBehavior: {dataModels: Object.fromEntries(Object.values(A.BEHAVIORS).map(t => [t, {}]))}};
  globalThis.Hooks = {on() {}};
  const Ad = await import(join(root, "modules/wodx-interactables/scripts/adopt.mjs"));
  const sc = sample(), fr = A.frameOf(FRAME);
  const walls = importedWalls(sc, fr, {skip: ["barn-window-1"]});
  walls[0].flags = {[MOD]: {material: "glass"}};
  walls.find(w => w.id === "plain").door = 0;
  const scene = mockScene(walls);
  const got = await Ad.planFor(scene, SAMPLE);
  const rec = await Ad.applyPlan(scene, got.p);
  assert.equal(rec.made.Wall.length, 1, "the barn window had no wall: one drawn");
  assert.equal(scene.tiles.contents.length, 8);
  const oven = scene.tiles.contents.find(t => t.flags[MOD].light);
  assert.equal(oven.flags[MOD].lightIds, scene.lights.contents[0].id);
  assert.equal(scene.regions.contents.length, 4);
  assert.equal(scene.walls.get("door0").flags[MOD].kind, "door");
  assert.equal(scene.walls.get("door0").flags[MOD].adoptId, "house-door-0");
  assert.ok(scene.flags[MOD].adopted);
  // A second adoption finds nothing new
  const again = await Ad.planFor(scene, SAMPLE);
  assert.deepEqual(A.summary(again.p), []);
  // Undo
  assert.equal(await Ad.undoAdoption(scene), true);
  assert.equal(scene.tiles.contents.length, 0);
  assert.equal(scene.lights.contents.length, 0);
  assert.equal(scene.regions.contents.length, 0);
  assert.equal(scene.walls.contents.length, walls.length);
  assert.deepEqual(scene.walls.get("door0").flags[MOD], {material: "glass"}, "the wall's own settings come back");
  assert.equal(scene.walls.get("door1").flags[MOD], undefined);
  assert.equal(scene.flags[MOD].adopted, undefined);
  assert.equal(await Ad.undoAdoption(scene), false);
});

test("adopt: wired into Interactables, Storyteller only, short lists marked", () => {
  const m = readFileSync(join(root, "modules/wodx-interactables/scripts/main.mjs"), "utf8");
  const a = readFileSync(join(root, "modules/wodx-interactables/scripts/adopt.mjs"), "utf8");
  assert.ok(m.includes("setupAdopt()"));
  assert.ok(a.includes("game.user.isGM"));
  assert.equal((a.match(/<ul(?![^>]*data-fixed)/g) ?? []).length, 0);
});
