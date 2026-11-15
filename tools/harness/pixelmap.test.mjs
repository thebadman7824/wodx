import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync, existsSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* The pixel map drawer (B5730-B5735): its farmhouse, as mapimport.mjs reads it and as adopting its sidecar lays it out,
   with a picture for each state of every door, window and container (B5733). */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dir = join(root, "tools/gate/fixtures/pixel-farmhouse");
const A = await import(join(root, "modules/wodx-interactables/scripts/adopt-rules.mjs"));
const S = await import(join(root, "modules/wodx-interactables/scripts/state-rules.mjs"));
const I = await import(join(root, "tools/gate/mapimport.mjs"));
const MOD = "wodx-interactables";

const vtt = JSON.parse(readFileSync(join(dir, "pixel-farmhouse.dd2vtt"), "utf8"));
const text = readFileSync(join(dir, "pixel-farmhouse.wodx.json"), "utf8");
const parsed = A.parseSidecar(text);
const sz = I.sizeOf(vtt);
const fr = {x0: 470, y0: 329, size: sz.ppg, distance: 5};
const base = "wodx-gate/fixtures/pixel-farmhouse/";
const walls = I.wallsOf(vtt, fr).map((w, i) => ({id: `w${i}`, ...w}));
const p = A.plan(parsed.data, {walls, tiles: [], lights: [], regions: [], artBase: base}, fr, new Set());

test("the sidecar reads clean and the map is 20 by 14 squares at 94 pixels a square", () => {
  assert.equal(parsed.ok, true, parsed.errors.join(" "));
  assert.deepEqual(parsed.errors, []);
  assert.deepEqual(parsed.data.cells, [20, 14]);
  assert.deepEqual([sz.cols, sz.rows, sz.ppg], [20, 14, 94]);
});

test("every door and window is a portal in the import and finds its own door wall in the adoption", () => {
  const doors = walls.filter(w => w.door);
  assert.equal(doors.length, parsed.data.openings.length);
  assert.equal(p.wallCreates.length, 0, "no opening should need a new wall");
  assert.equal(p.wallUpdates.length, 12);
  const kinds = parsed.data.openings.map(o => o.flags.kind);
  assert.equal(kinds.filter(k => k === "door").length, 5);
  assert.equal(kinds.filter(k => k === "shutter").length, 7);
});

test("walls stop at doorways: no plain wall runs across a door", () => {
  const plainW = walls.filter(w => !w.door), doorW = walls.filter(w => w.door);
  const mid = c => [(c[0] + c[2]) / 2, (c[1] + c[3]) / 2];
  const on = (c, [x, y]) => Math.abs((c[2] - c[0]) * (y - c[1]) - (c[3] - c[1]) * (x - c[0])) < 1
    && x > Math.min(c[0], c[2]) - 0.5 && x < Math.max(c[0], c[2]) + 0.5 && y > Math.min(c[1], c[3]) - 0.5 && y < Math.max(c[1], c[3]) + 0.5;
  for ( const d of doorW ) assert.ok(!plainW.some(w => on(w.c, mid(d.c))), `a plain wall crosses the opening at ${mid(d.c)}`);
});

test("each door and window gets a picture tile that follows it, showing shut doors and open shutters", () => {
  assert.equal(p.followers.length, 12);
  for ( const f of p.followers ) {
    const fl = f.data.flags[MOD], o = parsed.data.openings.find(x => x.id === f.openingId);
    assert.ok(fl.art.closed.startsWith(base) && fl.art.open.startsWith(base));
    assert.equal(f.data.texture.src, o.flags.kind === "shutter" ? fl.art.open : fl.art.closed);
    assert.ok(f.data.width > 20 && f.data.height > 20);
  }
});

test("chests, casks, crates and sacks are containers whose tile shows the shut picture first and the open one when opened", () => {
  const pics = p.tiles.filter(t => t.flags[MOD].art);
  assert.equal(pics.length, 14);
  for ( const t of pics ) {
    const f = t.flags[MOD];
    assert.equal(f.container, true);
    assert.equal(t.texture.src, f.art.closed);
    assert.deepEqual(S.lookFor("container", "open", {art: f.art, current: f.art.closed}), {src: f.art.open, marker: ""});
    assert.deepEqual(S.lookFor("container", "closed", {art: f.art, current: f.art.open}), {src: f.art.closed, marker: ""});
  }
  assert.ok(A.summary(p).some(l => /pictures that show them open or shut/.test(l)));
});

test("every picture the sidecar names is in the fixture, and the oven lights its corner", () => {
  const all = [...parsed.data.openings, ...parsed.data.features].flatMap(x => Object.values(x.art ?? {}));
  assert.equal(all.length, 52);
  for ( const f of all ) assert.ok(existsSync(join(dir, f)), f);
  assert.equal(p.lights.length, 1);
  assert.ok(existsSync(join(dir, "pixel-farmhouse.png")));
});

test("pictures must be files beside the map: climbing out or odd files are left out with a plain note", () => {
  const bad = JSON.parse(text);
  bad.features[0].art = {closed: "../../secret.png", open: "art/x.exe", "bad state": "art/y.png"};
  const r = A.parseSidecar(bad);
  assert.equal(r.data.features[0].art, undefined);
  assert.equal(r.errors.length, 3);
  delete bad.openings[0].artRect;
  const r2 = A.parseSidecar(bad);
  assert.equal(r2.data.openings[0].art, undefined);
  assert.ok(r2.errors.some(e => /artRect/.test(e)));
});

test("the key names what a player would call each thing", () => {
  const side = JSON.parse(text);
  assert.ok(side.key.length >= 50);
  for ( const n of ["Front door", "Iron-bound chest", "Grain sack", "bake oven", "well"] ) assert.ok(side.key.some(k => k.name === n), n);
});
