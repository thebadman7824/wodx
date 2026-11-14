import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");

/* The no-effect audit, household things and tack on the road (B3905) */
const R = await imp("modules/wodx-library/scripts/house-rules.mjs");
const D = await imp("modules/wodx-library/data/goods-house.mjs");
const G = await imp("modules/wodx-library/data/goods.mjs");

test("every road-kit name is a good", () => {
  const names = new Set(G.GOODS.map(g => g.name));
  for ( const n of [...D.WARM, ...D.SHADE, ...Object.keys(D.TACK)] ) assert.ok(names.has(n), n);
});

test("what a character carries for the road", () => {
  const k = R.roadKit([{name: "a woollen blanket"}, {name: "a set of horse tack"}, {name: "a riding crop"}, {name: "a toaster"}]);
  assert.equal(k.cold, true); assert.equal(k.heat, false); assert.equal(k.saddle, true); assert.equal(k.bridle, true); assert.equal(k.urge, true);
  assert.equal(k.names.cold, "a woollen blanket");
  const s = R.roadKit([{name: "a saddle"}, {name: "An Umbrella (2)"}]);
  assert.equal(s.saddle, true); assert.equal(s.bridle, false); assert.equal(s.heat, true);
  assert.deepEqual(R.roadKit([]), {cold: false, heat: false, saddle: false, bridle: false, urge: false, names: {}});
  assert.match(src("modules/wodx-library/scripts/main.mjs"), /api\.house = \{roadKit: HR\.roadKit\}/);
});
