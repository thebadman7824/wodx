import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {existsSync, mkdtempSync, readdirSync, readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {tmpdir} from "node:os";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* The map generators (tools/mapgen): building types, the farmstead, villages, towns and cities, whole or in parts. They need Python 3 and the
   Forgotten Adventures asset list; set WODX_FA_ASSETS to its path, else these tests are skipped. */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const gen = join(root, "tools/mapgen");
const ASSETS = process.env.WODX_FA_ASSETS ?? "/mnt/project-files/maps/farmstead-dd/fa-asset-paths.txt";
const SAMPLE_MAP = "/mnt/project-files/maps-ref/scripts/sample-walls-cottage inside.dungeondraft_map";
const py = (() => { for ( const p of ["python3", "python"] ) { try { execFileSync(p, ["--version"]); return p; } catch (e) { /* next */ } } return null; })();
const skip = !py || !existsSync(ASSETS) || !existsSync(SAMPLE_MAP) ? "needs Python 3, the asset list and the sample map" : false;
const A = await import(join(root, "modules/wodx-interactables/scripts/adopt-rules.mjs"));
const run = (args, cwd) => execFileSync(py, args, {cwd, encoding: "utf8", timeout: 300000});

test("mapgen: every building type furnishes facing every way, under many seeds", {skip}, () => {
  const out = run([join(gen, "check_buildings.py"), ASSETS, "12"], mkdtempSync(join(tmpdir(), "wodx-b-")));
  assert.match(out, /ok: \d+ types/);
});

test("mapgen: the farmstead still comes out the same from its seed", {skip}, () => {
  const dir = mkdtempSync(join(tmpdir(), "wodx-f-"));
  run([join(gen, "ddfarm.py"), "1197", ASSETS], dir);
  assert.deepEqual(JSON.parse(readFileSync(join(dir, "kessler-steading.wodx.json"), "utf8")), JSON.parse(readFileSync(join(gen, "samples/kessler-steading.wodx.json"), "utf8")));
});

const slug = s => s.toLowerCase().replace(/ü/g, "u").replace(/ö/g, "o").replace(/ä/g, "a").replace(/[^a-z0-9]+/g, "-");

test("mapgen: villages and towns come out whole, and the samples match their seeds", {skip}, () => {
  const dir = mkdtempSync(join(tmpdir(), "wodx-t-"));
  for ( const [size, seed, name] of [["village", 1197, "hohenhausen"], ["town", 1199, "birbach"], ["village", 3, null], ["town", 8, null]] ) {
    const out = run([join(gen, "ddtown.py"), "--layout", "grid", "--size", size, "--seed", String(seed), "--part", "0", "--assets", ASSETS, "--out", dir], dir);
    const base = out.match(/^ok: ([^,]+),/m)?.[1];
    assert.ok(base, out);
    const sc = JSON.parse(readFileSync(join(dir, `${slug(base)}.wodx.json`), "utf8"));
    const got = A.parseSidecar(sc);
    assert.deepEqual(got.errors, [], `${size} ${seed}`);
    assert.equal(sc.part, undefined);
    assert.ok(sc.households.length >= (size === "town" ? 30 : 12), `${size} ${seed}: ${sc.households.length} households`);
    if ( name ) assert.deepEqual(sc, JSON.parse(readFileSync(join(gen, `samples/${name}.wodx.json`), "utf8")), `${name} changed: run ddtown.py again into samples`);
  }
});

/* A split place: every building and household in exactly one part, parts that tile the whole, neighbours that agree. */
function checkParts(dir, base, size) {
  const idx = JSON.parse(readFileSync(join(dir, `${base}-parts.json`), "utf8"));
  assert.equal(idx.format, "wodx-map-parts");
  assert.ok(idx.parts.length > 1, `${base}: one part`);
  const [W, H] = idx.whole;
  let cutArea = 0, hh = 0, pop = 0;
  const seen = new Set();
  for ( const p of idx.parts ) {
    const sc = JSON.parse(readFileSync(join(dir, p.sidecar), "utf8"));
    assert.ok(existsSync(join(dir, p.map)), p.map);
    assert.deepEqual(A.parseSidecar(sc).errors, [], p.id);
    assert.equal(sc.part.id, p.id);
    assert.deepEqual(sc.cells, p.cells);
    assert.ok(p.cells[0] <= 72 && p.cells[1] <= 72, `${p.id} is ${p.cells}`);
    const [cx, cy, cw, ch] = p.cut;
    assert.ok(cx >= p.origin[0] && cy >= p.origin[1] && cx + cw <= p.origin[0] + p.cells[0] && cy + ch <= p.origin[1] + p.cells[1], `${p.id}: cut outside its map`);
    cutArea += cw * ch;
    for ( const h of sc.households ) { assert.ok(!seen.has(h.building), `${h.building} twice`); seen.add(h.building); }
    for ( const r of sc.regions ) {
      const [x, y, w, h] = r.rect;
      assert.ok(x >= 0 && y >= 0 && x + w <= p.cells[0] + 1e-6 && y + h <= p.cells[1] + 1e-6, `${p.id} ${r.id} off the map`);
    }
    for ( const [side, other] of Object.entries(p.neighbours) ) {
      const back = {north: "south", south: "north", east: "west", west: "east"}[side];
      assert.equal(idx.parts.find(q => q.id === other)?.neighbours[back], p.id, `${p.id} ${side}`);
      assert.ok(sc.regions.some(r => r.id === `edge-${side}` && r.behaviors?.[0]?.type === "trigger"), `${p.id}: no way ${side}`);
    }
    hh += sc.households.length; pop += sc.population;
  }
  assert.equal(cutArea, W * H, `${base}: the cuts do not tile the whole`);
  assert.equal(pop, idx.population);
  assert.ok(hh >= (size === "city" ? 90 : 30), `${base}: ${hh} households`);
  return idx;
}

test("mapgen: a town and a city split into parts that fit together", {skip}, () => {
  const dir = mkdtempSync(join(tmpdir(), "wodx-p-"));
  for ( const [size, seed, name] of [["town", 8, null], ["city", 5, "rotheim"], ["city", 9, null]] ) {
    const out = run([join(gen, "ddtown.py"), "--layout", "grid", "--size", size, "--seed", String(seed), "--assets", ASSETS, "--out", dir], dir);
    const base = slug(out.match(/^ok: ([^,]+),/m)?.[1] ?? "");
    assert.match(out, /in \d+ parts/, out);
    const idx = checkParts(dir, base, size);
    if ( name ) {
      assert.deepEqual(idx, JSON.parse(readFileSync(join(gen, `samples/${name}-parts.json`), "utf8")), `${name} changed: run ddtown.py again into samples`);
      assert.deepEqual(JSON.parse(readFileSync(join(dir, `${name}-b2.wodx.json`), "utf8")), JSON.parse(readFileSync(join(gen, `samples/${name}-b2.wodx.json`), "utf8")));
    }
  }
  // a smaller --part makes more, smaller maps
  const d2 = mkdtempSync(join(tmpdir(), "wodx-q-"));
  run([join(gen, "ddtown.py"), "--layout", "grid", "--size", "town", "--seed", "8", "--part", "32", "--assets", ASSETS, "--out", d2], d2);
  const base = readdirSync(d2).find(f => f.endsWith("-parts.json")).replace("-parts.json", "");
  assert.ok(checkParts(d2, base, "town").parts.length >= 6);
});

/* The organic layout (organic.py, on layout.py's port of the Medieval Fantasy City Generator's steps): winding
   streets, wards, a wall with gates, buildings turned to face their streets. */
test("mapgen: organic villages, towns and cities come out whole, and the samples match their seeds", {skip}, () => {
  const dir = mkdtempSync(join(tmpdir(), "wodx-o-"));
  const out = run([join(gen, "ddtown.py"), "--size", "village", "--seed", "2", "--part", "0", "--name", "Schöndorf", "--assets", ASSETS, "--out", dir], dir);
  assert.match(out, /^ok: Schöndorf, village/m);
  const sc = JSON.parse(readFileSync(join(dir, "schondorf.wodx.json"), "utf8"));
  assert.deepEqual(sc, JSON.parse(readFileSync(join(gen, "samples/schondorf.wodx.json"), "utf8")), "schondorf changed: run ddtown.py again into samples");
  for ( const [size, seeds, least] of [["village", [1, 3, 4], 10], ["town", [1, 2, 4, 6], 30], ["city", [9], 120]] ) {
    for ( const seed of seeds ) {
      const d = mkdtempSync(join(tmpdir(), "wodx-o-"));
      const o = run([join(gen, "ddtown.py"), "--size", size, "--seed", String(seed), "--part", "0", "--assets", ASSETS, "--out", d], d);
      const base = slug(o.match(/^ok: ([^,]+),/m)?.[1] ?? "");
      const s = JSON.parse(readFileSync(join(d, `${base}.wodx.json`), "utf8"));
      const got = A.parseSidecar(s);
      assert.deepEqual(got.errors, [], `${size} ${seed}`);
      assert.equal(s.layout, "organic");
      assert.ok(s.households.length >= least, `${size} ${seed}: ${s.households.length} households`);
      const kinds = new Set(got.data.regions.map(r => r.place?.kind).filter(Boolean));
      for ( const k of ["home", "church", "tavern", "market", "street"] ) assert.ok(kinds.has(k), `${size} ${seed}: no ${k}`);
      // turned buildings: their outlines are kept, and some things are turned with them
      assert.ok(got.data.regions.some(r => r.points && r.place?.kind === "home"), `${size} ${seed}: no outlines`);
      // varied shapes: some homes have wings or lean-tos, so their outlines have more than four corners
      assert.ok(got.data.regions.some(r => r.points?.length > 4 && r.place?.kind === "home"), `${size} ${seed}: every home a plain box`);
      assert.ok(got.data.features.some(f => f.rotation % 90 !== 0), `${size} ${seed}: nothing turned off the square`);
    }
  }
});

test("mapgen: a town on a river has its banks clear, bridges, water gates, a mill and a washing place", {skip}, () => {
  const dir = mkdtempSync(join(tmpdir(), "wodx-r-"));
  run([join(gen, "ddtown.py"), "--size", "town", "--seed", "1", "--part", "0", "--river", "yes", "--walls", "yes", "--assets", ASSETS, "--out", dir], dir);
  const s = JSON.parse(readFileSync(join(dir, "haselberg.wodx.json"), "utf8"));
  assert.deepEqual(A.parseSidecar(s).errors, []);
  const ids = s.regions.map(r => r.id);
  assert.ok(ids.includes("river-1"), "no river");
  assert.ok(ids.some(i => i.startsWith("bridge-")), "no bridge");
  assert.ok(ids.includes("washing-place"), "no washing place");
  assert.ok(ids.filter(i => i.startsWith("water-gate-")).length >= 2, "the river passes the wall with no water gate");
  assert.ok(JSON.stringify(s.households).includes("miller"), "no miller");
  // and a town told to have none has none
  const d2 = mkdtempSync(join(tmpdir(), "wodx-r-"));
  run([join(gen, "ddtown.py"), "--size", "town", "--seed", "1", "--part", "0", "--river", "no", "--assets", ASSETS, "--out", d2], d2);
  assert.ok(!JSON.parse(readFileSync(join(d2, "haselberg.wodx.json"), "utf8")).regions.some(r => r.id.startsWith("river")));
});

test("mapgen: an organic town splits into parts that fit together, and its sample matches", {skip}, () => {
  const dir = mkdtempSync(join(tmpdir(), "wodx-op-"));
  const out = run([join(gen, "ddtown.py"), "--size", "town", "--seed", "3", "--assets", ASSETS, "--out", dir], dir);
  assert.match(out, /^ok: Linberg, walled small town/m);
  const idx = checkParts(dir, "linberg", "town");
  assert.deepEqual(idx, JSON.parse(readFileSync(join(gen, "samples/linberg-parts.json"), "utf8")), "linberg changed: run ddtown.py again into samples");
  const gates = idx.parts.flatMap(p => JSON.parse(readFileSync(join(dir, p.sidecar), "utf8")).regions.filter(r => r.id.startsWith("gate-")));
  assert.ok(gates.length >= 2, "a walled town has gates");
});
