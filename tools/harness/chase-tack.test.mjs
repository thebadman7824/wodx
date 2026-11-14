import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");

/* Interactables chase: a rider's tack (B3907) */
const C = await imp("modules/wodx-interactables/scripts/chase-rules.mjs");

test("bareback is +1, spurs ease a flat-out ride, and nothing changes on foot or with the Library off", () => {
  const full = {saddle: true, bridle: true, urge: false, names: {}};
  assert.equal(C.tackMods({way: "horse"}, full).diff, 0);
  assert.equal(C.tackMods({way: "horse"}, {}).diff, 1);
  assert.deepEqual(C.tackMods({way: "mule"}, {saddle: true}).parts, ["no bridle +1"]);
  assert.equal(C.tackMods({way: "horse", flatOut: true}, {...full, urge: true, names: {urge: "a pair of spurs"}}).diff, -1);
  assert.equal(C.tackMods({way: "horse", flatOut: false}, {...full, urge: true}).diff, 0);
  assert.equal(C.tackMods({way: "foot"}, {}).diff, 0);
  assert.equal(C.tackMods({way: "cart"}, {}).diff, 0);
  assert.equal(C.tackMods({way: "horse"}, null).diff, 0);
  assert.match(src("modules/wodx-interactables/scripts/chase.mjs"), /C\.tackMods\(x, kit\)/);
});
