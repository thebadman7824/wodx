import test from "node:test";
import assert from "node:assert/strict";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const C = await import(join(root, "modules/wodx-interactables/scripts/chase-rules.mjs"));
const IR = await import(join(root, "modules/wodx-interactables/scripts/interact-rules.mjs"));
const VR = await import(join(root, "modules/wodx-interactables/scripts/vehicle-sheet-rules.mjs"));
const MT = await import(join(root, "modules/wodx-combat/scripts/mounted-rules.js"));

test("the new kinds are mounts, ways to run and vehicle sheets (B6070 to B6072)", () => {
  for ( const k of ["sled", "snowmobile", "train", "tram"] ) {
    assert.ok(IR.MOUNTS[k], k);
    assert.equal(C.wayFromMount(k, 2000), k);
    assert.ok(VR.VEHICLE_KINDS.includes(k), k);
    assert.ok(C.bodyOf(k, 2000), k);
  }
  assert.equal(C.wayOpen("train", 1800), false);
  assert.equal(C.wayOpen("train", 1830), true);
  assert.equal(C.wayOpen("snowmobile", 1905), false);
  assert.equal(C.wayOpen("sled", 1197), true);
  // a train or a tram cannot be worked at all without two dots of Drive
  assert.equal(IR.minSkill("train"), 2);
  assert.equal(IR.minSkill("tram"), 2);
});

test("runners go on snow, trains on their rails, trams on rails or streets (B6071, B6072)", () => {
  assert.equal(C.canGo("sled", "snow"), true);
  assert.equal(C.canGo("sled", "road"), false);
  assert.equal(C.canGo("snowmobile", "streets"), false);
  assert.equal(C.canGo("train", "rails"), true);
  assert.equal(C.canGo("train", "streets"), false);
  assert.equal(C.canGo("tram", "streets"), true);
  assert.equal(C.canGo("tram", "open"), false);
  assert.equal(C.canGo("bicycle", "snow"), false);
  assert.equal(C.canGo("horse", "snow"), true);
  // the ground they are made for adds nothing; a car in deep snow labours
  assert.equal(C.rollFor({way: "snowmobile"}, "snow", {year: 1995}).diff, 6);
  assert.equal(C.rollFor({way: "car"}, "snow", {year: 1995}).diff, 8);
  assert.equal(C.rollFor({way: "train"}, "rails", {year: 1995}).diff, 6);
  // wheels and hooves are held down in deep snow, runners are not
  assert.ok(C.speedOf({way: "car"}, "snow", 1995).capped);
  assert.ok(!C.speedOf({way: "snowmobile"}, "snow", 1995).capped);
  assert.ok(C.speedOf({way: "sled"}, "snow", 1500).yards > C.speedOf({way: "horse"}, "snow", 1500).yards - 1);
});

test("in a fight a sled stands on snow and a train on its line, whatever the scene's ground (B6071, B6072)", () => {
  const s = C.rideInFight("sled", 1600, "streets"), t = C.rideInFight("train", 1900, "streets"), tr = C.rideInFight("tram", 1950, "streets");
  assert.equal(s.ground, "snow"); assert.ok(s.yards > 0);
  assert.equal(t.ground, "rails"); assert.ok(t.yards > 0); assert.equal(t.maneuver, 1);
  assert.equal(tr.ground, "streets");
  for ( const g of Object.keys(C.GROUNDS) ) assert.ok(Number.isInteger(MT.FALL_DICE[g]), g);
});

test("trains and trams light the line ahead from 1900 (B6072)", () => {
  assert.ok(VR.headlights("train", 1950, true).dim >= 24);
  assert.equal(VR.headlights("train", 1850, true), null);
  assert.equal(VR.headlights("sled", 1950, true), null);
});
