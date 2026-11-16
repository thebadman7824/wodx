// Flying cars and flight for every aircraft (B6620-B6629).
import test from "node:test";
import assert from "node:assert/strict";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";
import {readFileSync} from "node:fs";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const F = await import(join(root, "modules/wodx-interactables/scripts/flight-rules.mjs"));
const C = await import(join(root, "modules/wodx-interactables/scripts/chase-rules.mjs"));
const IR = await import(join(root, "modules/wodx-interactables/scripts/interact-rules.mjs"));
const MR = await import(join(root, "modules/wodx-paperdoll/scripts/mount-rules.mjs"));
MR.learn(JSON.parse(readFileSync(join(root, MR.FOLDER, "mounts.json"), "utf8")));

test("the flying cars exist only on the Future Darkness branch, with their book figures (B6620, B6621)", () => {
  for ( const k of ["aerodyne", "aerocab", "assaultav", "hoverbike"] ) {
    assert.equal(IR.MOUNTS[k].from, 2023, k);
    assert.ok(C.wayOpen(k, 2030) && !C.wayOpen(k, 2022), k);
    assert.ok(MR.looksOf(k).length >= 3, `${k} looks`);
    assert.equal(MR.lookFor(k, 2030, {seed: "x"}).from >= 2023, true);
  }
  // Storyteller figures: each on the Mage 20th chart row that does its job (pp. 460-462), a quarter faster from 2040
  assert.deepEqual(C.chartOf("aerodyne", 2030), {safe: 140, top: 220, maneuver: 6});
  assert.deepEqual(C.chartOf("aerodyne", 2045), {safe: 175, top: 275, maneuver: 7});
  assert.deepEqual(C.chartOf("aerocab", 2030), {safe: 150, top: 250, maneuver: 6});
  assert.deepEqual(C.chartOf("assaultav", 2030), {safe: 180, top: 280, maneuver: 7});
  assert.deepEqual(C.chartOf("hoverbike", 2030), {safe: 30, top: 70, maneuver: 5});
  assert.deepEqual(C.chartOf("hoverbike", 2030, 20), {safe: 140, top: 220, maneuver: 7});
  const dur = k => [C.bodyOf(k, 2030).durability, C.bodyOf(k, 2030).structure];
  assert.deepEqual(dur("aerodyne"), [4, 6]); assert.deepEqual(dur("aerocab"), [5, 6]);
  assert.deepEqual(dur("assaultav"), [8, 10]); assert.deepEqual(dur("hoverbike"), [2, 3]);
  assert.equal(IR.MOUNTS.assaultav.min, 3);
  assert.equal(IR.MOUNTS.assaultav.seats, 13);
  assert.equal(IR.MOUNTS.aerocab.seats, 5);
  // placed in an earlier year they fall back to what that year had
  assert.equal(IR.SWAPS.mount.aerodyne.early, "helicopter");
  assert.equal(IR.SWAPS.mount.hoverbike.early, "motorbike");
});

test("a hover bike is a motorcycle on the ground and an aerodyne in the air (B6622)", () => {
  const ground = C.rideInFight("hoverbike", 2030, "water"), air = C.rideInFight("hoverbike", 2030, "water", 30);
  assert.equal(ground.yards, 0, "no wheels on the water");
  assert.ok(air.yards > 100 && air.air && air.skill === "pilot");
  assert.equal(C.rideInFight("hoverbike", 2030, "road").skill, "drive");
  assert.equal(C.canGo("hoverbike", "indoors", 10), false);
});

test("height: the ceiling, Pilot to fly at all, take-off and landing (B6622)", () => {
  const hb = F.climb("hoverbike", {ground: 0, from: 0, want: 200, pilotDots: 2});
  assert.equal(hb.to, F.HOVERBIKE_CEILING); assert.equal(hb.held, "ceiling"); assert.ok(hb.takeoff);
  assert.equal(F.climb("hoverbike", {want: 30, pilotDots: 0}).held, "untrained");
  assert.equal(F.climb("car", {want: 30}).held, "cannot");
  // B6629: a hover bike lifts no load (Concrete Jungle pdf p. 40)
  const loaded = F.climb("hoverbike", {want: 30, pilotDots: 2, cargo: 1});
  assert.equal(loaded.held, "cargo"); assert.equal(loaded.to, 0);
  assert.equal(F.climb("aerodyne", {want: 30, pilotDots: 1, cargo: 3}).held, null);
  assert.equal(F.climb("aerodyne", {ground: 10, from: 200, want: 10, pilotDots: 1}).landing, true);
  assert.equal(F.climb("aerodyne", {ground: 0, from: 0, want: 500, pilotDots: 1}).to, 500);
});

test("bands of height and flying low in a chase (B6623, B6626)", () => {
  assert.equal(F.bandOf(0).id, "ground"); assert.equal(F.bandOf(30).id, "low"); assert.equal(F.bandOf(120).id, "over"); assert.equal(F.bandOf(900).id, "high");
  const low = C.rollFor({way: "aerodyne", alt: 20, flatOut: true}, "crowd", {year: 2030});
  const high = C.rollFor({way: "aerodyne", alt: 200, flatOut: true}, "crowd", {year: 2030});
  assert.equal(high.diff, 9); assert.equal(low.diff, 10);
  assert.ok(low.parts.some(p => /fast and low/.test(p)));
  // terrain-following radar takes the fast-and-low +1 off
  assert.ok(!C.rollFor({way: "assaultav", alt: 20, flatOut: true}, "streets", {year: 2030}).parts.some(p => /fast and low/.test(p)));
  // unknown height: as before
  assert.equal(C.rollFor({way: "helicopter"}, "crowd", {year: 2000}).diff, 6);
  // a quarry high above the streets has nowhere to hide
  const st = C.newChase({quarry: {id: "q", name: "Q", way: "aerodyne", lead: 0, alt: 200}, pursuers: [{id: "p", name: "P", way: "car"}], ground: "streets", year: 2030});
  const st2 = C.newChase({quarry: {id: "q", name: "Q", way: "aerodyne", lead: 0, alt: 20}, pursuers: [{id: "p", name: "P", way: "car"}], ground: "streets", year: 2030});
  assert.equal(C.sightDiff(st, st.pursuers[0]) + 1, C.sightDiff(st2, st2.pursuers[0]));
});

test("falls and crashes from the air (B6624, B6625)", () => {
  assert.deepEqual(F.fallDice(45), {dice: 4, type: "bashing"});
  assert.deepEqual(F.fallDice(150), {dice: 10, type: "lethal"});
  const av = F.crashFall("aerodyne", C.bodyOf("aerodyne", 2030), {feet: 150});
  assert.equal(av.dice, 3); assert.equal(av.type, "lethal");
  // nothing covers a hover bike's rider, nor straps them in
  assert.equal(F.crashFall("hoverbike", C.bodyOf("hoverbike", 2030), {feet: 60}).dice, 6);
  assert.equal(F.unpiloted("aerocab", 100).falls, true);
  assert.equal(F.unpiloted("aerodyne", 100).falls, true);
  assert.equal(F.unpiloted("plane", 100).kind, "glides");
  assert.equal(F.unpiloted("aerodyne", 0).falls, false);
});

test("the map's picture of height (B6627)", () => {
  assert.deepEqual(F.liftOf(0), {lift: 0, shadow: null});
  const a = F.liftOf(20, 100, 5), b = F.liftOf(200, 100, 5);
  assert.ok(a.lift > 0 && b.lift >= a.lift && b.lift <= 150);
  assert.ok(b.shadow.alpha < a.shadow.alpha && b.shadow.scale < a.shadow.scale);
  assert.ok(MR.spins("aerodyne") && MR.spins("aerocab"));
});
