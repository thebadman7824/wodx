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
  assert.ok(hh >= (size === "city" ? 90 : 25), `${base}: ${hh} households`);   // even parts keep houses off the lines, at some cost (B653)
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
  for ( const [size, seeds, least] of [["village", [1, 3, 4], 8], ["town", [1, 2, 4, 6], 30], ["city", [9], 120]] ) {
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
  run([join(gen, "ddtown.py"), "--size", "town", "--seed", "2", "--part", "0", "--river", "yes", "--walls", "yes", "--assets", ASSETS, "--out", dir], dir);
  const s = JSON.parse(readFileSync(join(dir, "schondorf.wodx.json"), "utf8"));   // seed 1's river crosses no way, so it needs no bridge
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

test("mapgen: a town grown to a later year has that era's layers and era id", {skip}, () => {
  const dir = mkdtempSync(join(tmpdir(), "wodx-y-"));
  const out = run([join(gen, "ddtown.py"), "--size", "town", "--seed", "1", "--part", "0", "--walls", "yes", "--river", "yes", "--year", "1950", "--assets", ASSETS, "--out", dir], dir);
  assert.match(out, /Railway station/);
  const s = JSON.parse(readFileSync(join(dir, "haselberg.wodx.json"), "utf8"));
  assert.deepEqual(A.parseSidecar(s).errors, []);
  assert.equal(s.era, "mid-century");
  const areas = new Set(s.regions.map(r => r.area).filter(Boolean));
  for ( const a of ["railway", "station", "ring-road", "quay", "suburb"] ) assert.ok(areas.has(a), `no ${a}`);
  assert.ok(!s.regions.some(r => r.id.startsWith("water-gate-")), "the wall came down, so no water gate");
  // the medieval town keeps its own era and none of the later layers
  const d2 = mkdtempSync(join(tmpdir(), "wodx-y-"));
  run([join(gen, "ddtown.py"), "--size", "town", "--seed", "1", "--part", "0", "--walls", "yes", "--river", "yes", "--assets", ASSETS, "--out", d2], d2);
  const m = JSON.parse(readFileSync(join(d2, "haselberg.wodx.json"), "utf8"));
  assert.equal(m.era, "dark-ages");
  assert.ok(!m.regions.some(r => r.area && !["brook", "sinkhole", "oxbow", "old-loop"].includes(r.area)));   // the land's own areas are not era layers
});

test("mapgen: an organic town splits into parts that fit together, and its sample matches", {skip}, () => {
  const dir = mkdtempSync(join(tmpdir(), "wodx-op-"));
  const out = run([join(gen, "ddtown.py"), "--size", "town", "--seed", "3", "--assets", ASSETS, "--out", dir], dir);
  assert.match(out, /^ok: Linberg, walled small town/m);
  const idx = checkParts(dir, "linberg", "town");
  assert.deepEqual(idx, JSON.parse(readFileSync(join(gen, "samples/linberg-parts.json"), "utf8")), "linberg changed: run ddtown.py again into samples");
  const gates = idx.parts.flatMap(p => JSON.parse(readFileSync(join(dir, p.sidecar), "utf8")).regions.filter(r => r.id.startsWith("gate-")));
  assert.ok(gates.length >= 2, "a walled town has gates");
  // even parts: widths and heights differ by at most one square, and every house stands wholly inside its own part
  const ws = new Set(idx.parts.map(p => p.cut[2])), hs = new Set(idx.parts.map(p => p.cut[3]));
  assert.ok(Math.max(...ws) - Math.min(...ws) <= 1 && Math.max(...hs) - Math.min(...hs) <= 1, `uneven parts ${[...ws]} ${[...hs]}`);
  for ( const p of idx.parts ) {
    const sc = JSON.parse(readFileSync(join(dir, p.sidecar), "utf8"));
    const [cx, cy, cw, ch] = p.cut;
    for ( const h of sc.households ) {
      const r = sc.regions.find(q => q.id === h.building);
      const [x, y, w, hh] = r.rect, X = x + p.origin[0], Y = y + p.origin[1];
      assert.ok(X >= cx - 1e-6 && Y >= cy - 1e-6 && X + w <= cx + cw + 1e-6 && Y + hh <= cy + ch + 1e-6, `${p.id} ${h.building} crosses a part line`);
    }
  }
});

test("mapgen: castle, mine and arcology deck sites come out whole, and their sidecars adopt", {skip}, () => {
  const dir = mkdtempSync(join(tmpdir(), "wodx-s-"));
  for ( const kind of ["castle", "mine", "arcology"] ) for ( const seed of [1, 3, 1197] ) {
    const out = run([join(gen, "ddsite.py"), "--kind", kind, "--seed", String(seed), "--assets", ASSETS, "--out", dir], dir);
    const base = out.match(/^ok: ([^,]+),/m)?.[1];
    assert.ok(base, out);
    const f = readdirSync(dir).find(n => n.endsWith(".wodx.json") && n.startsWith(slug(base).replace(/-+$/, "")));
    const sc = JSON.parse(readFileSync(join(dir, f), "utf8"));
    assert.equal(sc.kind, kind);
    assert.deepEqual(A.parseSidecar(sc).errors, [], `${kind} ${seed}`);
    assert.ok(sc.households.length >= (kind === "arcology" ? 20 : 3), `${kind} ${seed} households`);
    if ( kind === "castle" ) for ( const id of ["keep-1", "hall-1", "gatehouse-1", "bailey", "moat", "drawbridge"] ) assert.ok(sc.regions.some(r => r.id === id), id);
    if ( kind === "mine" ) for ( const a of ["gallery", "stope", "shaft", "sump"] ) assert.ok(sc.regions.some(r => r.area === a), a);
    if ( kind === "arcology" ) { assert.equal(sc.era, "future-darkness"); for ( const a of ["park", "corridor", "transit"] ) assert.ok(sc.regions.some(r => r.area === a), a); }
  }
});

test("mapgen: a metropolis is organic only", {skip}, () => {
  assert.throws(() => run([join(gen, "ddtown.py"), "--layout", "grid", "--size", "metropolis", "--assets", ASSETS], mkdtempSync(join(tmpdir(), "wodx-m-"))), /organic layout/);
});

test("mapgen: a river bends like a real one: bends about 11 widths apart, never touching itself", {skip}, () => {
  const code = `
import math, random, sys
sys.path.insert(0, ${JSON.stringify(gen)})
from organic import meander
for seed in range(12):
    R = random.Random(seed); B = 6.0
    pts, ox = meander(R, R.uniform(0, math.pi), 400, B, 1.6)
    L = sum(math.dist(a, b) for a, b in zip(pts, pts[1:])); K = L / math.dist(pts[0], pts[-1])
    assert 1.15 < K < 2.6, (seed, K)
    gap = int(4 * B / 2)
    for i in range(len(pts)):
        for j in range(i + gap, len(pts)):
            assert math.dist(pts[i], pts[j]) >= 2 * B - 1e-6, (seed, i, j)
print("ok")`;
  assert.match(execFileSync(py, ["-c", code], {encoding: "utf8"}), /ok/);
});

test("mapgen: towns stand in real landforms: worn by water, brooks run downhill, the town's ground is buildable, bridges are few", {skip}, () => {
  const code = `
import math, sys
sys.path.insert(0, ${JSON.stringify(gen)})
import ddcore as C, organic as O, land as LAND
for kind, seed, river in (("hills", 3, True), ("upland", 3, True), ("mountain", 3, True), ("karst", 4, False), ("plain", 2, True)):
    C.R.seed(seed)
    t = O.OrganicTown(seed, "town", river=river, land=kind)
    L = t.land
    assert L.kind == kind and L.z, kind
    assert 0 <= min(L.z) and L.zmax <= LAND.KINDS[kind]["relief"] * 1.05, (kind, L.zmax)
    for st in t.streams:                                  # water never runs uphill
        a, b = st["line"][0], st["line"][-1]
        assert L.z_at(*a) >= L.z_at(*b) - 1.0, (kind, a, b)
        assert not any(t.in_town(q) for q in st["line"]), kind
    xs = [L.slope(i, j) for j in range(0, t.rows, 3) for i in range(0, t.cols, 3) if t.in_town((i, j))]
    assert sum(x > O.SLOPE_MAX + .08 for x in xs) / len(xs) < .2, (kind, "too steep in town")
    if kind == "karst": assert t.sinks, "karst without sinkholes"
    if river and t.bridges:
        ps = [b["at"] for b in t.bridges]                 # no two bridges close together: each one is needed
        assert all(math.dist(p, q) > 60 * .5 for i, p in enumerate(ps) for q in ps[i + 1:]), (kind, ps)
print("ok")`;
  assert.match(execFileSync(py, ["-c", code], {encoding: "utf8"}), /ok/);
});
