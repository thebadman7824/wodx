import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {stakedNight, witheredMayRise, WITHER_TORPOR_AT} from "../../modules/wodx-actions/scripts/kindred-rules.js";
import {mortalAgain, MORTAL_CATALYSTS} from "../../modules/wodx-creation/scripts/states-rules.mjs";

// B7666: a staked vampire still pays a blood point a night; with none left, the body withers (V20 Dark Ages).
test("staked: a blood point a night, then withering, then torpor", () => {
  assert.deepEqual(stakedNight({blood: 3, filled: 0}), {spend: 1, wither: false, torpor: false});
  assert.deepEqual(stakedNight({blood: 0, filled: 0}), {spend: 0, wither: true, torpor: false});
  assert.equal(stakedNight({blood: 0, filled: WITHER_TORPOR_AT - 2}).torpor, false);
  assert.equal(stakedNight({blood: 0, filled: WITHER_TORPOR_AT - 1}).torpor, true);
  assert.equal(witheredMayRise(3), true);
  assert.equal(witheredMayRise(4), false);
});

// B7667: Becoming Mortal (pp. 359-360): the Road's rating becomes Humanity.
test("becoming mortal keeps the person, names the catalyst", () => {
  assert.equal(Object.keys(MORTAL_CATALYSTS).length, 4);
  assert.deepEqual(mortalAgain({road: 6, willpower: 5, catalyst: "love"}), {humanity: 6, willpower: 5, catalyst: "love", dying: false});
  assert.equal(mortalAgain({road: 0}).humanity, 1);
  assert.equal(mortalAgain({catalyst: "nonsense"}).catalyst, "other");
  assert.equal(mortalAgain({catalyst: "sacrifice"}).dying, true);
});

// B7668: the high wind and Levitation each act each turn (V20 Dark Ages pp. 297-298)
test("high winds roll for all inside; a lifted unwilling one fights free", async () => {
  const TR = await import("../../modules/wodx-actions/scripts/turn-rules.js");
  const hw = TR.everyTurnOf("High Winds", "Vampire (Dark Ages)");
  assert.equal(hw.areaRoll.pool, "dexterity"); assert.equal(hw.areaRoll.diff, 6); assert.equal(hw.areaRoll.onFail.condition, "knockdown");
  const lv = TR.everyTurnOf("Levitation", "Vampire (Dark Ages)");
  assert.deepEqual(TR.stepOf(lv, {successes: 1}), [{kind: "end"}]);
  assert.equal(TR.everyTurnOf("Levitation", "Mage (M20)"), null);
});
