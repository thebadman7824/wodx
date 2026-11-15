// Scars on the map (B3759): what a disaster or great power changes, how it heals, and that Undo puts every piece back.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const R = await import("../../modules/wodx-chronicle/scripts/scars-rules.mjs");
const read = p => fs.readFileSync(path.join(ROOT, p), "utf8");

const house = (key, x, y) => ({ key, x, y, w: 400, h: 300, tiles: [`${key}-t1`, `${key}-t2`], lights: [`${key}-l1`],
  walls: [{ id: `${key}-d1`, door: true }, { id: `${key}-w1`, door: false }, { id: `${key}-w2`, door: false }] });
const inv = { buildings: [house("a", 0, 0), house("b", 1000, 0), house("c", 2000, 0)], loose: { tiles: [], walls: [], lights: [] }, grid: 100, rect: { x: 0, y: 0, width: 3000, height: 1000 } };

test("a fire on a spot burns the building there: tiles darkened, lights out, marks", () => {
  const p = R.plan("fire", 3, inv, { at: { x: 200, y: 150, radius: 100 }, seed: "s" });
  assert.deepEqual(p.hit, ["a"]);
  const tiles = p.changes.filter(c => c.type === "tile");
  assert.equal(tiles.length, 2);
  assert.equal(tiles[0].set.tint, R.KINDS.fire.tint);
  assert.ok(p.changes.some(c => c.type === "light" && c.set.hidden), "fire puts every light out");
  assert.ok(p.marks.length >= 1 && p.marks.every(m => m.size >= 100));
  assert.ok(!p.changes.some(c => String(c.id).startsWith("b-")), "nothing outside the spot");
});

test("a whole-town quake hits a share of buildings; breaches win over burst doors; replays the same", () => {
  const big = { ...inv, buildings: Array.from({ length: 40 }, (_, i) => house(`h${i}`, i * 500, 0)) };
  const p = R.plan("quake", 3, big, { seed: "q" });
  assert.ok(p.hit.length > 5 && p.hit.length < 35, `about half hit, got ${p.hit.length}`);
  assert.ok(p.changes.some(c => c.type === "wall" && "move" in c.set), "some walls broken through");
  const keys = p.changes.map(c => `${c.type}:${c.id}`);
  assert.equal(new Set(keys).size, keys.length, "one change per piece");
  assert.deepEqual(R.plan("quake", 3, big, { seed: "q" }), p);
  assert.ok(R.plan("quake", 1, big, { seed: "q" }).hit.length < p.hit.length, "a small quake hits fewer");
});

test("a map with no adopted buildings is hit in spots, loose pieces included", () => {
  const loose = { buildings: [], loose: { tiles: [{ id: "t", x: 500, y: 500 }], lights: [{ id: "l", x: 510, y: 500 }], walls: [{ id: "w", door: true, x: 500, y: 520 }] }, grid: 100, rect: { x: 0, y: 0, width: 2000, height: 1500 } };
  const p = R.plan("fire", 2, loose, { at: { x: 500, y: 500, radius: 200 }, seed: "x" });
  assert.ok(p.changes.some(c => c.id === "t") && p.changes.some(c => c.id === "l"));
  assert.ok(p.marks.length >= 1);
  const spread = R.plan("flood", 1, loose, { seed: "y" });
  assert.ok(spread.marks.length >= 3, "a town-wide flood marks several spots");
  assert.equal(R.plan("nonsense", 1, loose).changes.length, 0);
});

test("severity from the town event, rebuilding by prosperity", () => {
  assert.equal(R.severityOf({ kind: "sack", prosperity: -0.1 }), 3);
  assert.equal(R.severityOf({ kind: "quake", prosperity: -1.5 }), 3);
  assert.equal(R.severityOf({ kind: "fire", prosperity: -0.6 }), 2);
  assert.equal(R.severityOf({ kind: "storm", prosperity: -0.2 }), 1);
  assert.equal(R.healShare(0), 0.1);
  assert.equal(R.healShare(5), 0.4);
  assert.ok(R.healShare(3) > R.healShare(1));
  for ( const k of ["fire", "flood", "storm", "quake", "battle", "sack", "riot", "blaze", "water", "rubble"] ) assert.ok(R.KINDS[R.SCAR_OF[k]], k);
});

test("healing: lights first, walls last, marks at the end, and it finishes", () => {
  const rec = { changes: [{ type: "wall", id: "w", set: { move: 0 } }, { type: "tile", id: "t", set: { tint: "#000" } }, { type: "light", id: "l", set: { hidden: true } }], made: [{ type: "Drawing", id: "d" }] };
  const s1 = R.healStep(rec, 0.25);
  assert.deepEqual(s1.changes, [2]);
  assert.equal(s1.done, false);
  let left = 10;
  while ( left-- ) { const s = R.healStep(rec, 0.25); for ( const i of s.changes ) rec.changes[i].healed = true; for ( const i of s.made ) rec.made[i].healed = true; if ( s.done ) break; }
  assert.ok(rec.changes.every(c => c.healed) && rec.made.every(m => m.healed));
});

test("before and after: tint goes to texture.tint, and back", () => {
  const b = R.before({ texture: { tint: "#abcdef" }, hidden: false }, { tint: "#000", alpha: 0.5 });
  assert.deepEqual(b, { tint: "#abcdef", alpha: null });
  assert.deepEqual(R.updateOf({ set: { tint: "#000", alpha: 0.5 } }), { "texture.tint": "#000", alpha: 0.5 });
  assert.deepEqual(R.restoreOf({ before: { tint: "#abcdef", ds: 0 } }), { "texture.tint": "#abcdef", ds: 0 });
});

test("pictures come from the extracted packs under wodx-assets/scars, never the repo", () => {
  for ( const [k, list] of Object.entries(R.ART) ) {
    assert.ok(list.length > 0, k);
    for ( const p of list ) { assert.ok(p.startsWith("wodx-assets/scars/"), p); assert.ok(!fs.existsSync(path.join(ROOT, p)), `not in the repo: ${p}`); }
  }
});

// A small stand-in for Foundry, enough for scars.mjs
function fakeScene() {
  const coll = docs => ({ contents: docs, get: id => docs.find(d => d.id === id), [Symbol.iterator]: () => docs[Symbol.iterator]() });
  const obj = d => ({ ...d, toObject() { return JSON.parse(JSON.stringify({ ...this, toObject: undefined })); } });
  const tiles = [obj({ id: "t1", x: 100, y: 100, width: 100, height: 100, texture: { tint: "#ffffff" }, flags: { "wodx-interactables": { adoptId: "inn-hall-1" } } })];
  const walls = [obj({ id: "d1", door: 1, ds: 0, c: [0, 0, 0, 100], move: 20, sight: 20, light: 20, sound: 20, flags: { "wodx-interactables": { adoptId: "inn-door-1" } } })];
  const lights = [obj({ id: "l1", x: 150, y: 150, hidden: false, flags: { "wodx-interactables": { adoptId: "t1.light" } } })];
  const regions = [{ id: "r1", shapes: [{ type: "rectangle", x: 0, y: 0, width: 400, height: 300 }], flags: { "wodx-interactables": { adoptId: "inn" } } }];
  const drawings = [];
  const by = { Tile: tiles, Wall: walls, AmbientLight: lights, Drawing: drawings };
  const sc = { id: "S1", tiles: coll(tiles), walls: coll(walls), lights: coll(lights), regions: coll(regions), drawings: coll(drawings), grid: { size: 100 }, width: 2000, height: 1500, flags: {},
    getEmbeddedDocument: (cls, id) => by[cls].find(d => d.id === id),
    async updateEmbeddedDocuments(cls, ups) { for ( const u of ups ) { const d = by[cls].find(x => x.id === u._id); for ( const [k, v] of Object.entries(u) ) { if ( k === "_id" ) continue; if ( k === "texture.tint" ) d.texture.tint = v; else d[k] = v; } } },
    async createEmbeddedDocuments(cls, list) { const out = list.map((d, i) => ({ ...d, id: `${cls}${by[cls].length + i}` })); by[cls].push(...out); return out; },
    async deleteEmbeddedDocuments(cls, ids) { for ( const id of ids ) { const i = by[cls].findIndex(d => d.id === id); if ( i >= 0 ) by[cls].splice(i, 1); } },
    async update(u) { for ( const [k, v] of Object.entries(u) ) { const parts = k.split("."); let o = sc; for ( const p of parts.slice(0, -1) ) o = o[p] ??= {}; const last = parts.at(-1); if ( last.startsWith("-=") ) delete o[last.slice(2)]; else o[last] = JSON.parse(JSON.stringify(v)); } } };
  return { sc, by };
}

test("scar, then Undo: the inn burns, its door bursts, and every piece is put back", async () => {
  const { sc, by } = fakeScene();
  let n = 0;
  globalThis.game = { user: { isGM: true }, time: { worldTime: 500 }, scenes: { get: id => (id === "S1" ? sc : null), contents: [sc], [Symbol.iterator]: () => [sc][Symbol.iterator]() } };
  globalThis.foundry = { utils: { randomID: () => `id${n++}`, deepClone: o => JSON.parse(JSON.stringify(o)) } };
  globalThis.Hooks = { callAll() {} };
  globalThis.fetch = async () => ({ ok: false });
  const S = await import("../../modules/wodx-chronicle/scripts/scars.mjs");
  const inv = S.inventory(sc);
  assert.equal(inv.buildings.length, 1);
  assert.deepEqual(inv.buildings[0].lights, ["l1"], "a light tile's light belongs to its building");
  const id = await S.scar({ scene: sc, kind: "sack", severity: 3, source: "town:x" });
  assert.ok(id);
  assert.equal(by.Tile[0].texture.tint, R.KINDS.sack.tint);
  assert.equal(by.AmbientLight[0].hidden, true);
  assert.ok(by.Drawing.length >= 1, "with no pictures on this Foundry, plain blots stand in");
  assert.equal(S.list(sc).length, 1);
  assert.equal(await S.undoFor({ source: "town:x", since: 400 }), 1);
  assert.equal(by.Tile[0].texture.tint, "#ffffff");
  assert.equal(by.AmbientLight[0].hidden, false);
  assert.equal(by.Wall[0].ds, 0);
  assert.equal(by.Wall[0].move, 20);
  assert.equal(by.Drawing.length, 0);
  assert.equal(S.list(sc).length, 0);
  // Healing mends it all in time
  await S.scar({ scene: sc, kind: "fire", severity: 2, source: "town:x" });
  let rounds = 0;
  while ( S.list(sc).length && rounds++ < 20 ) await S.heal({ scene: sc, share: 0.2 });
  assert.equal(S.list(sc).length, 0);
  assert.equal(by.Tile[0].texture.tint, "#ffffff");
  assert.equal(by.Drawing.length, 0);
});

test("wiring: the town turn, its Undo, and power areas", () => {
  const towns = read("modules/wodx-storyteller/scripts/towns.mjs");
  assert.match(towns, /prosperity: e\.effect\?\.prosperity/);
  assert.match(towns, /TownScars\.healTowns/);
  assert.match(towns, /TownScars\.undoFor/);
  assert.match(read("modules/wodx-storyteller/scripts/main.mjs"), /TownScars\.setupTownScars\(\)/);
  assert.match(read("modules/wodx-chronicle/scripts/main.mjs"), /scars: scars\.api\(\)/);
  const fx = read("modules/wodx-actions/scripts/effects.js");
  assert.match(fx, /scars\?\.scar\?\.\(/);
  assert.match(fx, /scars\?\.undo\?\.\(r\.scar/);
});
