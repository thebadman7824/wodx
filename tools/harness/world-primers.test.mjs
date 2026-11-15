import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Era primers by region (B5880 to B5882) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const P = await imp("modules/wodx-storyteller/data/primers-world.mjs");
const S = await imp("modules/wodx-storyteller/scripts/setup-rules.mjs");
const W = await imp("modules/wodx-chronicle/scripts/world-rules.mjs");

test("world primers: every way of life but Western Christendom has lines from 1197", () => {
  for ( const sphere of Object.keys(W.SPHERES) ) {
    if ( sphere === "latin" ) { assert.equal(P.worldPrimer(sphere, 1300), null); continue; }
    assert.ok(P.WORLD_PRIMERS[sphere]?.["1197"]?.length, sphere);
    for ( const y of [1197, 1500, 1850, 1950, 2010] ) assert.ok(P.worldPrimer(sphere, y)?.length >= 1, `${sphere} ${y}`);
  }
  assert.equal(P.periodFor(1449), "1197");
  assert.equal(P.periodFor(1450), "1450");
  assert.equal(P.periodFor(2050), "2000");
  // the Andes after the conquest fall back to the last period they have
  assert.deepEqual(P.worldPrimer("andean", 1900), P.WORLD_PRIMERS.andean["1450"]);
});

test("world primers: every region and year a chronicle can start in has a page that fits", () => {
  for ( const r of Object.keys(W.WORLD_REGIONS).map(id => ({id})) ) for ( const y of [1197, 1600, 1890, 1990, 2030] ) {
    const sphere = W.sphereFor(r.id, y);
    const html = S.playerPrimer({id: "dark-ages", name: "The era", start: 1197}, {sphere, sphereLabel: W.SPHERES[sphere], year: y});
    if ( sphere === "latin" ) assert.match(html, /feudal order/);
    else { assert.doesNotMatch(html, /feudal order/, `${r.id} ${y}`); assert.ok(html.includes(W.SPHERES[sphere]), `${r.id} ${y}`); }
  }
  const cairo = S.playerPrimer({id: "dark-ages", name: "The Dark Ages"}, {sphere: W.sphereFor("egypt", 1197), sphereLabel: "The lands of Islam", year: 1197});
  assert.match(cairo, /call to prayer/);
  // a prologue year before 1197 keeps the era's own lines
  assert.match(S.playerPrimer({id: "roman-empire", name: "Rome", start: 0}, {sphere: "sinic", year: 100}), new RegExp(S.PRIMERS["roman-empire"].players[0].slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("world primers: the setup and an era change write the page", () => {
  const setup = src("modules/wodx-storyteller/scripts/setup.mjs");
  assert.ok(setup.includes("S.playerPrimer(active, {sphere, sphereLabel, year})"));
  assert.ok(setup.includes('Hooks.on("wodxEraApplied"') && setup.includes("export async function refreshPrimer"));
  assert.ok(src("modules/wodx-storyteller/scripts/main.mjs").includes("refreshPrimer: Setup.refreshPrimer"));
});
