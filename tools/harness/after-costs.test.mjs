// The books' after-costs (B4924): which powers pay when they end, and how.
import {test} from "node:test";
import assert from "node:assert/strict";
import {join, dirname} from "node:path";
import {fileURLToPath} from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const AC = await import(join(root, "modules/wodx-actions/scripts/after-cost-rules.js"));

test("each desk power has its cost and page", () => {
  const want = {"Survivor": "sleep", "Messenger's Fortitude": "sleep", "Blood of Potency": "bloodCap", "Strengthening the Demon": "hunRoll",
    "Subsume the Spirit": "habits", "Inspire": "willpowerDot", "Blinding Spittle": "blurred", "Pietrosu's Hospitality": "numbed", "Numbing": "fomorEnd"};
  for ( const [name, kind] of Object.entries(want) ) {
    const c = AC.costOf({name});
    assert.equal(c?.cost.kind, kind, name);
    assert.match(c.page, /p\. \d+/, name);
  }
  assert.equal(AC.costOf({name: "Claws of the Wild"}), null);
});

test("Survivor sleeps eight hours then wakes ravenous; Messenger's Fortitude a week", () => {
  assert.deepEqual(AC.costOf({name: "Survivor"}).cost, {kind: "sleep", seconds: 8 * 3600, then: "ravenous"});
  assert.equal(AC.costOf({name: "Messenger's Fortitude"}).cost.seconds, 7 * 86400);
});

test("a blinding's lasting effect is found by its own name or what it does", () => {
  const e = AC.costOf({name: "Blinding Spittle"});
  assert.equal(AC.effectMatches(e, "Blinded", "Blinding Spittle"), true);
  assert.equal(AC.effectMatches(e, "Blinding Spittle", "Blinding Spittle"), true);
  assert.equal(AC.effectMatches(e, "Drained", "Blinding Spittle"), false);
});

test("blood over the pool thins away; Animal habits last a night a success", () => {
  assert.equal(AC.bloodOver(14, 10), 4);
  assert.equal(AC.bloodOver(8, 10), 0);
  assert.equal(AC.habitNights(3), 3);
  assert.equal(AC.habitNights(0), 1);
});

test("a fomor past Incapacitated when Numbing ends dies", () => {
  assert.equal(AC.fomorEnd(9, 3, 7).dies, true);
  assert.equal(AC.fomorEnd(6, 3, 7).dies, false);
});

test("the conditions carry what the rolls read", () => {
  assert.equal(AC.CONDITIONS.habits.mods.socialDiff, 1);
  assert.equal(AC.CONDITIONS.blurred.mods.ownDiffVision, 2);
  assert.equal(AC.CONDITIONS.asleep.mods.noAction, true);
});
