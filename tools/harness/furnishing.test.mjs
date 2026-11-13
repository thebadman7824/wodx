import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {existsSync, mkdtempSync, readdirSync, readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {tmpdir} from "node:os";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* Furnishing by purpose, era palette and room value (tools/mapgen: catalogue, palettes, purposes, setpieces,
   furnishing). Needs Python 3 and the asset lists (WODX_FA_ASSETS, WODX_NEW_ASSETS, WODX_OLD_ASSETS), else skipped. */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const gen = join(root, "tools/mapgen");
const FA = process.env.WODX_FA_ASSETS ?? "/mnt/project-files/maps/farmstead-dd/fa-asset-paths.txt";
const NEW = process.env.WODX_NEW_ASSETS ?? "/mnt/project-files/dd-assets-new-paths.txt";
const OLD = process.env.WODX_OLD_ASSETS ?? "/mnt/project-files/dd-assets-old-paths.txt";
const py = (() => { for ( const p of ["python3", "python"] ) { try { execFileSync(p, ["--version"]); return p; } catch (e) { /* next */ } } return null; })();
const skip = !py || ![FA, NEW, OLD].every(existsSync) ? "needs Python 3 and the three asset lists" : false;
const run = (args, cwd) => execFileSync(py, ["-W", "ignore", ...args], {cwd, encoding: "utf8", timeout: 600000});

test("furnishing: the Python unit tests pass", {skip: !py && "needs Python 3"}, () => {
  run(["-m", "unittest", "test_furnishing"], gen);
});

test("map preview: the renderer draws floors, walls, doors and pieces with stand-in pictures", {skip: !py && "needs Python 3"}, () => {
  run(["-m", "unittest", "test_render_preview"], gen);       // skips itself without Pillow and numpy
});

const site = (year, extra = []) => {
  const dir = mkdtempSync(join(tmpdir(), "wodx-furnish-"));
  run([join(gen, "ddsite.py"), "--kind", "floors", "--type", "burgher-palace", "--year", String(year), "--assets", `${FA},${NEW},${OLD}`, "--out", dir, ...extra], dir);
  const map = JSON.parse(readFileSync(join(dir, "burgher-palace.dungeondraft_map"), "utf8"));
  return {dir, map, objects: map.world.levels["0"].objects.map(o => o.texture)};
};

test("furnishing: a palace furnishes by its year, and the same seed gives the same map", {skip}, () => {
  const a = site(1890, ["--wealth", "rich"]);
  assert.ok(!a.objects.some(t => /Ashen/.test(t) && !/Stairs/.test(t)), "an 1890 palace has no Ashen-wood pieces");
  assert.ok(a.objects.length > 60, `an 1890 palace is full (${a.objects.length} objects)`);
  const portals = a.map.world.levels["0"].walls.flatMap(w => w.portals ?? []).map(p => p.texture);
  assert.ok(portals.length > 0 && !portals.some(t => /Ashen/.test(t)), "an 1890 palace has no Ashen doors or windows");
  const b = site(1890, ["--wealth", "rich"]);
  assert.deepEqual(a.map.world.levels["0"].objects.map(o => [o.texture, o.position]), b.map.world.levels["0"].objects.map(o => [o.texture, o.position]));
  const old = site(1197);
  assert.ok(!old.objects.some(t => /ModernFurnature|Tyger|\[ADA\]/.test(t)), "a 1197 palace has no modern pieces");
  for ( const s of [a, old] ) {
    const walls = s.map.world.levels["0"].walls.map(w => w.texture);
    assert.ok(walls.every(Boolean));
    assert.ok(readdirSync(s.dir).some(f => f.endsWith(".wodx.json")));
  }
});
