import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {existsSync, mkdtempSync, readFileSync, writeFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {tmpdir} from "node:os";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* The underground generator (tools/mapgen/ddwarren.py): the piece kit, a warren on its own and under a town, sewers
   laid from a street plan, and what stood there before the sewers. Needs Python 3 and the asset list, like mapgen. */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const gen = join(root, "tools/mapgen");
const ASSETS = process.env.WODX_FA_ASSETS ?? "/mnt/project-files/maps/farmstead-dd/fa-asset-paths.txt";
const py = (() => { for ( const p of ["python3", "python"] ) { try { execFileSync(p, ["--version"]); return p; } catch (e) { /* next */ } } return null; })();
const skip = !py || !existsSync(ASSETS) ? "needs Python 3 and the asset list" : false;
const A = await import(join(root, "modules/wodx-interactables/scripts/adopt-rules.mjs"));
const RF = await import(join(root, "modules/wodx-otherworlds/scripts/reflect-rules.mjs"));
const run = args => execFileSync(py, [join(gen, "ddwarren.py"), "--assets", ASSETS, ...args], {cwd: gen, encoding: "utf8", timeout: 120000});
const read = (dir, name) => JSON.parse(readFileSync(join(dir, `${name}.wodx.json`), "utf8"));
const box = (x, y, w, h) => [x, y, x + w, y, x + w, y + h, x, y + h];

/* A small town to lie under: two big houses, a yard, a river along the south, three main streets and two side streets. */
const town = year => ({
  format: "wodx-map", version: 1, name: "Probestadt", map: "probestadt.dungeondraft_map", cells: [80, 60], seed: 1, kind: "city", layout: "organic",
  place: {kind: "street"}, openings: [], features: [], households: [], umbral: {year, places: {}, gone: []},
  regions: [
    {id: "inn-1", label: "Tavern", rect: [12, 4, 16, 14], points: box(12, 4, 16, 14), place: {kind: "tavern"}},
    {id: "house-1", label: "Townhouse", rect: [44, 24, 14, 16], points: box(44, 24, 14, 16), place: {kind: "home"}},
    {id: "house-1-plot", label: "Yard of the townhouse", rect: [66, 30, 8, 8], points: box(66, 30, 8, 8), place: {kind: "home", owner: "house-1", private: true}},
    {id: "river-1", label: "The river", rect: [0, 48, 80, 4], points: box(0, 48, 80, 4), place: {kind: "other"}}
  ],
  plan: {
    streets: [
      {kind: "main", half: 1.3, line: [8, 20, 40, 20]}, {kind: "main", half: 1.3, line: [40, 20, 72, 22]}, {kind: "main", half: 1.3, line: [40, 20, 40, 46]},
      {kind: "street", half: 0.85, line: [20, 20, 20, 40]}, {kind: "street", half: 0.85, line: [20, 40, 40, 38]}, {kind: "alley", half: 0.6, line: [60, 22, 60, 40]}
    ],
    river: [[[0, 50], [80, 50]]], riverHalf: 2, brooks: [[[70, 2], [66, 20], [62, 30], [62, 46]]]
  }
});

test("warren kit: 24 pieces, each opening only where it says, four flooded and two caps", {skip}, () => {
  const out = execFileSync(py, ["-c", "import ddwarren as W, json; print(json.dumps({'errs': W.check_kit(), 'kinds': [p['kind'] for p in W.PIECES.values()], 'dress': sorted(W.DRESS)}))"], {cwd: gen, encoding: "utf8"});
  const k = JSON.parse(out);
  assert.deepEqual(k.errs, []);
  assert.equal(k.kinds.length, 24);
  assert.equal(k.kinds.filter(x => x === "flooded").length, 4);
  assert.equal(k.kinds.filter(x => x === "cap").length, 2);
  for ( const kind of ["passage", "chamber", "vault", "den", "collapse", "way-up"] ) assert.ok(k.kinds.includes(kind), kind);
  assert.deepEqual(k.dress, ["cellars", "labyrinth", "service", "spiral", "underlevels", "vaults"]);
});

test("a warren on its own: whole, connected to its ways up, the same from its seed, dressed by the year", {skip}, () => {
  const d1 = mkdtempSync(join(tmpdir(), "wodx-w-")), d2 = mkdtempSync(join(tmpdir(), "wodx-w-"));
  run(["--kind", "warren", "--seed", "3", "--name", "Probe", "--out", d1]);
  run(["--kind", "warren", "--seed", "3", "--name", "Probe", "--out", d2]);
  const sc = read(d1, "probe");
  assert.deepEqual(sc, read(d2, "probe"));
  assert.equal(readFileSync(join(d1, "probe.dungeondraft_map"), "utf8"), readFileSync(join(d2, "probe.dungeondraft_map"), "utf8"));
  const got = A.parseSidecar(sc);
  assert.deepEqual(got.errors, []);
  assert.equal(got.data.place.kind, "sewer");
  assert.equal(sc.underground, true); assert.equal(sc.dress, "cellars");
  assert.ok(sc.waysUp.length >= 2 && sc.pieces.length >= 10);
  // every piece joins the rest: walk the pieces through the sides each one opens on
  const at = new Map(sc.pieces.map(p => [p.cell.join(","), p]));
  const seen = new Set(), todo = [sc.pieces[0].cell];
  while ( todo.length ) {
    const c = todo.pop(), k = c.join(",");
    if ( seen.has(k) || !at.has(k) ) continue;
    seen.add(k);
    for ( const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] ) todo.push([c[0] + dx, c[1] + dy]);
  }
  assert.equal(seen.size, sc.pieces.length, "the pieces are one run");
  for ( const w of sc.waysUp ) assert.ok(sc.features.some(f => f.id === w.id && f.flags.climb === true));
  for ( const r of sc.regions.filter(r => r.area === "den") ) assert.deepEqual(r.place, {kind: "home", private: true});
  // a later year and a dress of no year
  const d3 = mkdtempSync(join(tmpdir(), "wodx-w-"));
  run(["--kind", "warren", "--seed", "4", "--year", "1960", "--name", "Later", "--out", d3]);
  assert.equal(read(d3, "later").dress, "service");
  run(["--kind", "warren", "--seed", "4", "--dress", "labyrinth", "--name", "Deep", "--out", d3]);
  const deep = read(d3, "deep");
  assert.deepEqual(A.parseSidecar(deep).errors, []);
  assert.ok(deep.regions.some(r => /Labyrinth tunnel|Hollow/.test(r.label)));
  assert.ok(RF.reflect(deep, "shadowlands").some(m => m.kind === "rot"));
  assert.deepEqual(RF.reflect(deep, "penumbra"), []);
});

test("a warren under a town: the same squares, every stair inside a building above, flooded under the river", {skip}, () => {
  const dir = mkdtempSync(join(tmpdir(), "wodx-w-"));
  writeFileSync(join(dir, "probestadt.wodx.json"), JSON.stringify(town(1700)));
  run(["--kind", "warren", "--under", join(dir, "probestadt.wodx.json"), "--seed", "5", "--pieces", "20", "--out", dir]);
  const sc = read(dir, "probestadt-underground");
  assert.deepEqual(A.parseSidecar(sc).errors, []);
  assert.deepEqual(sc.cells, [80, 60]);
  assert.equal(sc.dress, "vaults"); assert.equal(sc.under.map, "probestadt.dungeondraft_map");
  const up = sc.waysUp.filter(w => w.building);
  assert.ok(up.length >= 1, "a stair comes up in a building");
  const rects = {"inn-1": [12, 4, 16, 14], "house-1": [44, 24, 14, 16]};
  for ( const w of up ) {
    const r = rects[w.building];
    assert.ok(w.at[0] >= r[0] && w.at[0] + 1 <= r[0] + r[2] && w.at[1] >= r[1] && w.at[1] + 1 <= r[1] + r[3], `${w.id} stands in ${w.building}`);
  }
  for ( const p of sc.pieces.filter(p => p.wet) ) assert.ok(p.rect[1] + p.rect[3] > 40, "wet pieces lie by the river");
});

test("sewers follow the street plan, fall to the river and leave by an outfall; the year decides what is there", {skip}, () => {
  const dir = mkdtempSync(join(tmpdir(), "wodx-w-"));
  const p = join(dir, "probestadt.wodx.json");
  writeFileSync(p, JSON.stringify(town(1900)));
  const out = run(["--kind", "sewer", "--under", p, "--seed", "5", "--out", dir]);
  assert.match(out, /sewers since 1850/);
  const sc = read(dir, "probestadt-sewers");
  assert.deepEqual(A.parseSidecar(sc).errors, []);
  const areas = a => sc.regions.filter(r => r.area === a);
  assert.equal(areas("main-sewer").length, 3);
  assert.equal(areas("side-sewer").length, 2);                    // fifty years on: the side streets too; never an alley
  assert.ok(areas("outfall").length >= 1 && areas("junction").length >= 1);
  assert.ok(areas("culvert").length >= 1, "the brook through the town is covered");
  assert.ok(sc.regions.some(r => /^outfall-mouth-/.test(r.id) && r.behaviors?.length));
  // nothing runs under the river (its bed lies between rows 48 and 52)
  for ( const r of sc.regions.filter(r => r.area && r.area !== "outfall") ) assert.ok(r.rect[1] + r.rect[3] <= 48.5, `${r.id} keeps out from under the river`);
  // every run falls somewhere, and the manholes are the ways up
  assert.equal(sc.flow.length, sc.regions.filter(r => /sewer|culvert|outfall$/.test(r.area ?? "")).length);
  assert.ok(sc.waysUp.length >= 4 && sc.waysUp.every(w => sc.features.some(f => f.id === w.id && f.flags.climbKind === "ladder")));
  assert.ok(RF.reflect(sc, "penumbra").some(m => m.kind === "blight") && RF.reflect(sc, "shadowlands").some(m => m.kind === "rot"));
  // the first thirty years: mains only
  writeFileSync(p, JSON.stringify(town(1860)));
  run(["--kind", "sewer", "--under", p, "--seed", "5", "--name", "Early", "--out", dir]);
  const early = read(dir, "early");
  assert.equal(early.regions.filter(r => r.area === "side-sewer").length, 0);
  assert.equal(early.regions.filter(r => r.area === "main-sewer").length, 3);
  // before the sewers: the covered brook and the cesspits, no sewer
  writeFileSync(p, JSON.stringify(town(1700)));
  const before = run(["--kind", "sewer", "--under", p, "--seed", "5", "--out", dir]);
  assert.match(before, /no sewers before 1850/);
  const old = read(dir, "under-probestadt");
  assert.deepEqual(A.parseSidecar(old).errors, []);
  assert.equal(old.regions.filter(r => /sewer|junction/.test(r.area ?? "")).length, 0);
  assert.ok(old.regions.some(r => r.area === "culvert") && old.regions.some(r => r.area === "cesspit"));
  // in the Middle Ages the brook runs open
  writeFileSync(p, JSON.stringify(town(1300)));
  run(["--kind", "sewer", "--under", p, "--seed", "5", "--name", "Oldest", "--out", dir]);
  assert.equal(read(dir, "oldest").regions.filter(r => r.area === "culvert").length, 0);
  // a town made without --plan cannot be sewered, and says how
  const bare = town(1900); delete bare.plan;
  writeFileSync(p, JSON.stringify(bare));
  assert.throws(() => run(["--kind", "sewer", "--under", p, "--out", dir]), /ddtown\.py --plan/);
});
