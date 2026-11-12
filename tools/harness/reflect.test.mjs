/* WoDX Otherworlds 0.9.0: generated town maps reflected in the Penumbra and Shadowlands. The pure rules on real
 * generator output, then the Foundry part on a stand-in scene. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as RF from "../../modules/wodx-otherworlds/scripts/reflect-rules.mjs";

const load = n => JSON.parse(readFileSync(new URL(`../mapgen/samples/${n}.wodx.json`, import.meta.url), "utf8"));
const grown = load("reflecttown");   // grown from the medieval town to 1960
const old = load("schondorf");       // a medieval village

test("the generator writes what each place means, and what later ages pulled down", () => {
  for ( const sc of [grown, old] ) {
    assert.ok(sc.umbral && typeof sc.umbral.places === "object" && Array.isArray(sc.umbral.gone));
    for ( const [k, p] of Object.entries(sc.umbral.places) ) assert.ok(typeof p.type === "string" && "wealth" in p, k);
  }
  assert.equal(grown.umbral.year, 1960);
  assert.ok(grown.umbral.gone.length > 0);
  for ( const g of grown.umbral.gone ) {
    assert.match(g.id, /^gone-/); assert.equal(g.rect.length, 4);
    assert.ok(g.year > 1197 && g.year <= 1960, `${g.id} ${g.year}`);
    assert.ok(typeof g.why === "string" && g.why.length, `${g.id} has no reason`);
  }
});

test("the Penumbra: churches loom, a later town is webbed, dirty trades sour, water grows wild", () => {
  for ( const sc of [grown, old] ) {
    const m = RF.reflect(sc, "penumbra");
    assert.ok(m.length && m.every(x => RF.MARKS[x.kind].layer === "penumbra"));
    assert.ok(m.some(x => x.kind === "loom"), "a church or chapel looms");
    for ( const x of m ) { assert.ok(x.strength >= 0 && x.strength <= 1); assert.equal(x.rect.length, 4); assert.ok(x.rect.every(Number.isFinite)); }
  }
  const web = (y, future = false) => RF.reflect(grown, "penumbra", {year: y, future}).filter(x => x.kind === "web").reduce((s, x) => s + x.strength, 0);
  assert.ok(web(2050, true) > web(1960), "the webbing thickens with the years");
  assert.equal(RF.webbing(1300), 0.2); assert.equal(RF.webbing(2050, {future: true}), 1); assert.ok(RF.webbing(2050) < 1);
  const gm = RF.reflect(grown, "penumbra");
  assert.ok(gm.some(x => x.kind === "web" && /station|railway/i.test(x.id)), "the railway is webbed");
  assert.ok(gm.some(x => x.kind === "blight"), "something sours toward the Wyrm");
  const cem = gm.find(x => x.id === "blight:" + grown.regions.find(r => r.area === "cemetery")?.id);
  assert.ok(cem && /neglected/.test(cem.note), "a graveyard sours when neglected");
});

test("the Shadowlands: what was pulled down stands again, but only once it is gone", () => {
  const relics = y => RF.reflect(grown, "shadowlands", {year: y}).filter(x => x.kind === "relic" && x.id.startsWith("relic:gone-"));
  const all = relics(1960);
  assert.ok(all.length > 0 && all.length < grown.umbral.gone.length, "one relic a spot, the most recent");
  for ( const a of all ) for ( const b of all ) if ( a !== b ) {
    const ix = Math.max(0, Math.min(a.rect[0] + a.rect[2], b.rect[0] + b.rect[2]) - Math.max(a.rect[0], b.rect[0])), iy = Math.max(0, Math.min(a.rect[1] + a.rect[3], b.rect[1] + b.rect[3]) - Math.max(a.rect[1], b.rect[1]));
    assert.ok(ix * iy <= 0.3 * Math.min(a.rect[2] * a.rect[3], b.rect[2] * b.rect[3]) + 1e-9, `${a.id} and ${b.id} stack`);
  }
  for ( const r of all ) assert.match(r.note, /(Pulled down|Rebuilt) in \d{4}/);
  assert.ok(all.some(r => /Pulled down/.test(r.note)) && all.some(r => /Rebuilt/.test(r.note)), "both kinds of relic");
  assert.ok(RF.regionsFor(all).length < all.length, "rebuilt houses are drawn but get no region");
  const sl = RF.reflect(grown, "shadowlands");
  assert.ok(sl.some(x => x.kind === "thin"), "the church and cemetery thin the Shroud");
  assert.ok(sl.every(x => RF.MARKS[x.kind].layer === "shadowlands"));
  // A map grown to 1960 is never read as an earlier year.
  assert.deepEqual(RF.reflect(grown, "shadowlands", {year: 1300}), sl);
  // The medieval village has nothing pulled down yet.
  assert.equal(RF.reflect(old, "shadowlands").filter(x => x.id.startsWith("relic:gone-")).length, 0);
});

test("the overlay and regions: a clear SVG with sound numbers, regions in pixels for the marks that matter", () => {
  for ( const layer of RF.LAYERS ) {
    const m = RF.reflect(grown, layer);
    const svg = RF.overlaySvg(m, grown.cells, {cell: 50});
    assert.ok(svg.startsWith(`<svg xmlns="http://www.w3.org/2000/svg" width="${grown.cells[0] * 50}" height="${grown.cells[1] * 50}"`));
    assert.ok(svg.endsWith("</svg>")); assert.ok(!/NaN|undefined|Infinity/.test(svg));
    const regs = RF.regionsFor(m, 100);
    assert.ok(regs.length > 0);
    for ( const r of regs ) {
      assert.ok(["loom", "relic", "thin", "nihil", "blight"].includes(r.flags["wodx-otherworlds"].reflection));
      const s = r.shapes[0];
      if ( s.type === "polygon" ) assert.ok(s.points.length >= 6 && s.points.every(Number.isInteger));
      else assert.ok(s.width > 0 && s.height > 0);
      assert.ok(r.name.length <= 120);
    }
  }
  assert.match(RF.summary(RF.reflect(grown, "penumbra")), /^\d+ looming/);
  assert.equal(RF.summary([]), "nothing to show");
});

test("in-game text: no em dashes, no gendered pronouns, no project words", () => {
  const texts = [...Object.values(RF.MARKS).flatMap(m => [m.label, m.note]),
    ...RF.LAYERS.flatMap(l => RF.reflect(grown, l).flatMap(m => [m.label, m.note])), RF.summary(RF.reflect(grown, "penumbra"))];
  for ( const t of texts ) {
    assert.ok(!t.includes("—"), t);
    assert.ok(!/\b(he|she|him|her|his|hers)\b/i.test(t), t);
    assert.ok(!/\bWoDX\b|\bB\d{2,3}\b|Phase \d|Ben/.test(t), t);
  }
});

/* ------------------------------------------------------------------ Foundry stand-in */
let nid = 0;
const coll = () => { const m = new Map(); m.filter = f => [...m.values()].filter(f); m[Symbol.iterator] = function* () { yield* m.values(); }; return m; };
const level = (scene, d) => ({...structuredClone(d), id: d.id ?? `L${++nid}`, parent: scene,
  getFlag(s, k) { return this.flags?.[s]?.[k]; },
  async update(u) { for ( const [k, v] of Object.entries(u) ) { const p = k.split("."); let o = this; while ( p.length > 1 ) { const q = p.shift(); o = o[q] ??= {}; } o[p[0]] = v; } },
  toObject() { const {parent, getFlag, update, toObject, ...rest} = this; return structuredClone(rest); }});
class FakeScene {
  constructor(name) { this.name = name; this.id = `S${++nid}`; this.flags = {}; this.grid = {size: 100}; this.dimensions = {sceneX: 300, sceneY: 200};
    this.tiles = coll(); this.regions = coll(); this.levels = coll();
    const l = level(this, {name: "Ground", elevation: {bottom: 0, top: 20}, background: {src: "maps/reflecttown.webp"}, flags: {}}); this.levels.set(l.id, l); }
  async createEmbeddedDocuments(type, list) {
    const key = {Tile: "tiles", Region: "regions", Level: "levels"}[type];
    return list.map(d => { const doc = type === "Level" ? level(this, d) : {...structuredClone(d), id: `${type}${++nid}`}; this[key].set(doc.id, doc); return doc; });
  }
  async deleteEmbeddedDocuments(type, ids) { const key = {Tile: "tiles", Region: "regions"}[type]; for ( const id of ids ) this[key].delete(id); }
  async update(u) { for ( const [k, v] of Object.entries(u) ) { const p = k.split("."); let o = this; while ( p.length > 1 ) { const q = p.shift(); o = o[q] ??= {}; } o[p[0]] = v; } }
}

test("Foundry: reflect a scene, make the missing twin levels, replace on a second run, take it off again", async () => {
  const uploads = [], chat = [];
  globalThis.foundry = {utils: {}, applications: {apps: {FilePicker: {implementation: {
    createDirectory: async () => { throw new Error("EEXIST: exists"); }, upload: async (src, dir, file) => { uploads.push({dir, file}); return {status: "success"}; }}}}}};
  globalThis.File = class { constructor(parts, name, o) { this.name = name; this.type = o.type; this.text = parts.join(""); } };
  globalThis.game = {user: {isGM: true}, users: [{id: "gm", isGM: true}], modules: new Map()};
  globalThis.ChatMessage = {create: async m => chat.push(m)};
  globalThis.ui = {notifications: {warn: () => {}, info: () => {}}};
  globalThis.fetch = async p => ({ok: p.endsWith("maps/reflecttown.wodx.json"), status: 404, json: async () => structuredClone(grown)});
  const RX = await import("../../modules/wodx-otherworlds/scripts/reflect.mjs");
  const scene = new FakeScene("Reflecttown");
  assert.equal(RX.guessPath(scene), "maps/reflecttown.wodx.json");
  const out = await RX.reflectScene(scene, {year: 1960});
  assert.ok(out.penumbra.length && out.shadowlands.length);
  const lv = [...scene.levels.values()];
  assert.equal(lv.length, 3, "plain twin levels were made");
  assert.equal(lv[0].flags["wodx-otherworlds"].layer, "physical");
  const pen = lv.find(l => l.flags["wodx-otherworlds"]?.layer === "penumbra"), sha = lv.find(l => l.flags["wodx-otherworlds"]?.layer === "shadowlands");
  assert.ok(pen.flags["wodx-otherworlds"].plainTwin && pen.elevation.bottom === 1000 && sha.elevation.bottom === 2000);
  assert.equal(scene.tiles.size, 2); assert.equal(uploads.length, 2);
  for ( const t of scene.tiles.values() ) {
    const L = t.flags["wodx-otherworlds"].reflection === "penumbra" ? pen : sha;
    assert.deepEqual(t.levels, [L.id]); assert.equal(t.elevation, L.elevation.bottom + 0.5);
    assert.equal(t.x, 300); assert.equal(t.y, 200); assert.equal(t.width, grown.cells[0] * 100); assert.equal(t.height, grown.cells[1] * 100);
  }
  const nRegions = scene.regions.size;
  assert.ok(nRegions > 0);
  for ( const r of scene.regions.values() ) {
    assert.equal(r.levels.length, 1);
    const s = r.shapes[0];
    if ( s.type === "rectangle" ) assert.ok(s.x >= 300 && s.y >= 200);
  }
  assert.equal(scene.flags["wodx-otherworlds"].reflection.year, 1960);
  assert.match(chat.at(-1).content, /Penumbra:.*looming/);
  // Again: replaced, not doubled; the twin levels are reused.
  await RX.reflectScene(scene, {year: 1960});
  assert.equal(scene.tiles.size, 2); assert.equal(scene.regions.size, nRegions); assert.equal(scene.levels.size, 3);
  // A file that is not a WoDX map is refused.
  await assert.rejects(() => RX.reflectScene(scene, {sidecar: {format: "other"}}), /not a WoDX map/);
  // Wrong path: a clear message.
  await assert.rejects(() => RX.reflectScene(scene, {path: "maps/nothing.wodx.json"}), /could not be read/);
  // Take it off.
  const n = await RX.undoReflection(scene);
  assert.equal(n, 2 + nRegions);
  assert.equal(scene.tiles.size, 0); assert.equal(scene.regions.size, 0); assert.equal(scene.flags["wodx-otherworlds"].reflection, null);
  // Players cannot.
  game.user.isGM = false;
  await assert.rejects(() => RX.reflectScene(scene, {year: 1960}), /Only the Storyteller/);
  assert.equal(await RX.undoReflection(scene), 0);
});

test("reflection is wired: a Storyteller toolbar button and the api", () => {
  const main = readFileSync(new URL("../../modules/wodx-otherworlds/scripts/main.mjs", import.meta.url), "utf8");
  assert.match(main, /import \* as reflect from "\.\/reflect\.mjs"/);
  assert.match(main, /reflect: \{scene: reflect\.reflectScene, undo: reflect\.undoReflection, dialog: reflect\.reflectDialog/);
  assert.match(main, /tokens\.tools\.wodxReflect = \{[^}]*visible: game\.user\.isGM/s);
  const dlg = readFileSync(new URL("../../modules/wodx-otherworlds/scripts/reflect.mjs", import.meta.url), "utf8");
  assert.ok(!dlg.includes("—"));
});

test("under the ground (0.17.0): a warren and sewers are read piece by piece, and the two dresses of no year their own way", () => {
  const reg = (id, area) => ({id, label: id, rect: [0, 0, 4, 4], place: {kind: "sewer"}, area});
  const under = (dress, year, areas) => ({format: "wodx-map", version: 1, cells: [40, 30], underground: true, dress, umbral: {year, places: {}, gone: []}, regions: areas.map((a, i) => reg(`${a}-${i}`, a))});
  const kinds = (sc, layer) => RF.reflect(sc, layer).map(m => `${m.kind}:${m.id.split(":")[1].replace(/-\d+$/, "")}`);
  const sew = under("sewers", 1930, ["main-sewer", "side-sewer", "outfall", "culvert", "cesspit", "junction"]);
  const pen = kinds(sew, "penumbra");
  for ( const k of ["web:main-sewer", "blight:main-sewer", "blight:outfall", "wyld:culvert", "blight:cesspit", "web:junction"] ) assert.ok(pen.includes(k), k);
  assert.ok(kinds(sew, "shadowlands").includes("rot:cesspit"));
  // the webbing over a sewer thickens with the age, like the town above
  const webAt = y => RF.reflect(under("sewers", y, ["main-sewer"]), "penumbra").find(m => m.kind === "web").strength;
  assert.ok(webAt(1900) < webAt(1990));
  const war = under("cellars", 1300, ["passage", "chamber", "den", "flooded", "collapse", "cap", "way-up", "vault"]);
  assert.ok(kinds(war, "penumbra").includes("blight:den") && kinds(war, "penumbra").includes("wyld:flooded") && kinds(war, "penumbra").includes("faint:passage"));
  const dead = RF.reflect(war, "shadowlands");
  assert.ok(dead.some(m => m.kind === "relic" && /before the fall/.test(m.label)) && dead.some(m => m.kind === "nihil") && dead.some(m => m.kind === "relic" && /closed/.test(m.label)));
  assert.ok(!RF.reflect(war, "penumbra").some(m => /way-up/.test(m.id)), "a stair means nothing by itself");
  // the Labyrinth has no Penumbra; a Black Spiral cavern is a Blight all through
  const lab = under("labyrinth", 1300, ["passage", "den", "collapse"]);
  assert.deepEqual(RF.reflect(lab, "penumbra"), []);
  assert.ok(RF.reflect(lab, "shadowlands").every(m => m.kind === "rot" || m.kind === "nihil"));
  const hive = under("spiral", 1300, ["passage", "den", "flooded"]);
  assert.ok(RF.reflect(hive, "penumbra").every(m => m.kind === "blight") && RF.reflect(hive, "penumbra").length === 3);
  assert.match(RF.reflect(hive, "penumbra").find(m => /flooded/.test(m.id)).note, /Balefire/);
  // a town map is read as before
  assert.ok(RF.reflect(grown, "penumbra").some(m => m.kind === "loom"));
  assert.deepEqual(RF.underMarks("nothing", "cellars"), []);
});
