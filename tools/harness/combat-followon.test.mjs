/* Powers pass p13 (B3754): a maneuver that hits leaves its state on the target's token. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const R = await import("../../modules/wodx-combat/scripts/rules.js");
const C = await import("../../modules/wodx-chronicle/scripts/conditions.mjs");

test("Sweep and Tackle knock down, Hold and Grapple hold, a stake with three successes stakes a vampire (B3754)", () => {
  assert.deepEqual(R.followOn("sweep", {hit: true}).map(f => f.condition), ["knockdown"]);
  assert.deepEqual(R.followOn("tackle", {hit: true}).map(f => f.condition), ["knockdown"]);
  assert.deepEqual(R.followOn("hold", {hit: true}).map(f => f.condition), ["held"]);
  assert.deepEqual(R.followOn("c_grapple", {hit: true}).map(f => f.condition), ["held"]);
  assert.deepEqual(R.followOn("stake", {hit: true, damageSuccesses: 3, profile: "vampire"}).map(f => f.condition), ["staked"]);
  assert.deepEqual(R.followOn("stake", {hit: true, damageSuccesses: 2, profile: "vampire"}), []);
  assert.deepEqual(R.followOn("impale", {hit: true, damageSuccesses: 4, profile: "mortal"}), []);
  assert.deepEqual(R.followOn("sweep", {hit: false}), []);
  assert.deepEqual(R.followOn("normal", {hit: true}), []);
  assert.equal(R.maneuverKey(R.MANEUVERS.sweep), "sweep");
  assert.equal(R.maneuverKey(R.CLASSIC.c_grapple), "c_grapple");
});

test("the states are WoDX conditions, and the attack marks them (B3754)", () => {
  const ids = new Set(C.CORE_CONDITIONS.map(c => c.id));
  for ( const id of ["knockdown", "held", "staked"] ) assert.ok(ids.has(id), id);
  const src = fs.readFileSync(path.join(root, "modules/wodx-combat/scripts/main.js"), "utf8");
  assert.match(src, /R\.followOn\(R\.maneuverKey\(maneuver\)/);
  assert.match(src, /for \(const f of follow\) await markFollow\(target, f\)/);
  assert.match(src, /p\.action === "follow"/);
});
