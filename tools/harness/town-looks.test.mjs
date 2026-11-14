import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import * as L from "../../modules/wodx-storyteller/scripts/town-look-rules.mjs";

/* Town events shown on the town's scenes (B4620) */

const rect = {x: 200, y: 100, width: 3000, height: 2000};

test("town looks: each event leaves seeded marks inside the scene, timed", () => {
  const a = L.looksFor("fire", {rect, grid: 100, now: 1000, seed: "t1"}), b = L.looksFor("fire", {rect, grid: 100, now: 1000, seed: "t1"});
  assert.deepEqual(a, b, "same seed, same marks");
  assert.deepEqual(a.map(x => x.kind), ["fire", "fire", "fire", "smoke", "rubble", "rubble", "rubble"]);
  for ( const x of a.filter(l => l.at) ) {
    assert.ok(x.at.x >= rect.x && x.at.x <= rect.x + rect.width && x.at.y >= rect.y && x.at.y <= rect.y + rect.height, JSON.stringify(x.at));
  }
  assert.equal(a.find(x => x.kind === "smoke").at, null);
  assert.equal(a[0].until.worldTime, 1000 + 86400);
  const flood = L.looksFor("flood", {rect, grid: 100, now: 0, seed: "t2"}).filter(x => x.kind === "flood");
  for ( const x of flood ) assert.ok(x.at.y >= rect.y + rect.height * 2 / 3, "water lies in the low third");
  assert.deepEqual(L.looksFor("boom", {rect}), []);
  assert.ok(L.isOver({until: {worldTime: 10}}, 10) && !L.isOver({until: {worldTime: 10}}, 9));
  for ( const k of Object.values(L.TOWN_LOOKS).flat().map(p => p.kind) ) assert.ok(L.FALLBACK[k], `${k} has a fallback colour`);
});

test("town looks: every disaster the town turn can raise has a look", () => {
  for ( const k of ["fire", "flood", "storm", "quake", "riot", "rising", "sack"] ) assert.ok(L.TOWN_LOOKS[k], k);
});
