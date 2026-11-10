import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/*
 * The pure Kindred and dice helpers in WoDX Actions' rules.js (VtDA20), which Live uses and the harness had left at
 * 76% (Phase 10 test gaps). Each test pins the book behaviour the function is meant to give.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const R = await import(pathToFileURL(join(root, "modules/wodx-actions/scripts/rules.js")).href);
const roll = (successes, botch = false) => ({successes, botch});

test("resisted rolls: margins, ties and botches", () => {
  assert.deepEqual(R.resisted(roll(3), roll(1)), {winner: "a", margin: 2, tie: false});
  assert.deepEqual(R.resisted(roll(1), roll(4)), {winner: "b", margin: 3, tie: false});
  assert.equal(R.resisted(roll(2), roll(2)).tie, true);
  assert.deepEqual(R.resisted(roll(0, true), roll(2)), {winner: "b", margin: 2, tie: false, botch: "a"});
});

test("extended and teamwork rolls", () => {
  let s = R.extendedStep({target: 5}, roll(3));
  assert.equal(s.total, 3); assert.equal(s.done, false);
  s = R.extendedStep(s, roll(2)); assert.equal(s.done, true); assert.equal(s.rolls, 2);
  const b = R.extendedStep(s, roll(0, true)); assert.equal(b.total, 0); assert.equal(b.failed, true);
  assert.deepEqual(R.teamwork([2, 0, -1, 3], 2), {dice: 5, overflow: 2});
});

test("Roads: aura, sin, Virtue pools and Instinct", () => {
  assert.deepEqual([10, 8, 5, 2, 1].map(R.auraModifier), [-2, -1, 0, 1, 2]);
  assert.equal(R.sinCheck(5, 7).roll, false);
  assert.deepEqual(R.sinCheck(7, 3), {roll: true, difficulty: 10, rawDifficulty: 10, momentOfTruth: true});
  assert.equal(R.sinCheck(6, 5).difficulty, 7);
  assert.deepEqual(R.virtuePool(4, {road: 3}), {dice: 3, caps: ["Road 3"]});
  assert.equal(R.virtuePool(4, {road: 8, blood: 2, bloodLimited: true}).dice, 2);
  assert.equal(R.instinctResult(roll(1)), "ride"); assert.equal(R.instinctResult(roll(0)), "fail");
  assert.equal(R.instinctResult(roll(0, true)), "botch");
});

test("the Beast held back over turns", () => {
  assert.deepEqual(R.beastStep({}, roll(2)), {total: 2, outcome: "holding", turns: 2});
  assert.equal(R.beastStep({total: 3}, roll(2)).outcome, "resisted");
  assert.equal(R.beastStep({total: 3}, roll(0)).outcome, "fail");
  assert.equal(R.beastStep({total: 3}, roll(0, true)).outcome, "botch");
});

test("hunting, hunger and vessels", () => {
  const h = R.huntingPool({area: "market", fame: 5, domain: 5, inhuman: 1, herd: 2});
  assert.equal(h.difficulty, 4); assert.equal(h.bonusDice, 2);
  assert.equal(R.isHungry(3, 3), true); assert.equal(R.isHungry(4, 3), false);
  assert.equal(R.vesselRisk(3, 2), null);
  assert.deepEqual(R.vesselRisk(3, 4), {dice: 1, difficulty: 6});
  assert.equal(R.bloodGained(8, {minutesDead: 25}), 2);
  assert.equal(R.imitateLifeCost(5), 3); assert.equal(R.imitateLifeCost(9), 0);
});

test("healing with blood: lethal first, then bashing, aggravated at five", () => {
  const p = R.planHealing({bashing: 2, lethal: 1, aggravated: 1}, 2);
  assert.deepEqual(p.healed, {bashing: 1, lethal: 1, aggravated: 0});
  const q = R.planHealing({aggravated: 2}, 11, {includeAggravated: true});
  assert.equal(q.healed.aggravated, 2); assert.equal(q.spent, 10);
  assert.equal(R.planHealing({bashing: 3}, 5, {maxSpend: 1}).spent, 1);
});

test("falling, waking by day, lifting, the blood oath and diablerie", () => {
  assert.deepEqual(R.fallingDamage(30), {dice: 3, type: "bashing", halfArmor: false});
  assert.deepEqual(R.fallingDamage(150), {dice: 10, type: "lethal", halfArmor: true});
  assert.equal(R.awakeningResult(roll(0, true)).awake, false);
  assert.equal(R.awakeningResult(roll(2)).turns, 2);
  assert.equal(R.awakeningResult(roll(5)).turns, Infinity);
  assert.equal(R.liftingFeat(0), null); assert.equal(R.liftingFeat(20).level, 15);
  assert.equal(R.liftingFeat(3).feat, "Break down a wooden door");
  assert.equal(R.oathResistDifficulty({timesFed: 4}).difficulty, 10);
  assert.equal(R.oathResistDifficulty({natureMod: -8}).difficulty, 2);
  assert.equal(R.oathDecayMonths(5), 7); assert.equal(R.oathDecayMonths(14), 1);
  assert.equal(R.diablerieControlDifficulty(7), 3); assert.equal(R.diablerieControlDifficulty(9), 2);
});
