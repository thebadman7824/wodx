import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {existsSync, mkdtempSync, readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {tmpdir} from "node:os";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* The map generators (tools/mapgen): building types, the farmstead, villages and towns. They need Python 3 and the
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

test("mapgen: villages and towns come out whole, and the samples match their seeds", {skip}, () => {
  const dir = mkdtempSync(join(tmpdir(), "wodx-t-"));
  for ( const [size, seed, name] of [["village", 1197, "hohenhausen"], ["town", 1199, "birbach"], ["village", 3, null], ["town", 8, null]] ) {
    const out = run([join(gen, "ddtown.py"), "--size", size, "--seed", String(seed), "--assets", ASSETS, "--out", dir], dir);
    const base = out.match(/^ok: ([^,]+),/m)?.[1];
    assert.ok(base, out);
    const file = join(dir, `${base.toLowerCase().replace(/ü/g, "u").replace(/ö/g, "o").replace(/ä/g, "a").replace(/[^a-z0-9]+/g, "-")}.wodx.json`);
    const sc = JSON.parse(readFileSync(file, "utf8"));
    const got = A.parseSidecar(sc);
    assert.deepEqual(got.errors, [], `${size} ${seed}`);
    assert.ok(sc.households.length >= (size === "town" ? 30 : 12), `${size} ${seed}: ${sc.households.length} households`);
    if ( name ) assert.deepEqual(sc, JSON.parse(readFileSync(join(gen, `samples/${name}.wodx.json`), "utf8")), `${name} changed: run ddtown.py again into samples`);
  }
});
