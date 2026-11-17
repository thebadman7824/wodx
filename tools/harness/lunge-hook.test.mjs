/* B6921: the house maneuvers Lunge and Hook and Pull leave real marks that WoDX Combat reads on the turn after:
 * a lunger defends at +1 difficulty through the next turn, and a hooked target that took damage loses its next move. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as R from "../../modules/wodx-combat/scripts/rules.js";

const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const fight = round => ({id: "c1", round});

test("B6921: houseAfter marks the lunger always, the hooked target only when damage got through", () => {
  const now = {combat: "c1", round: 3};
  assert.deepEqual(R.houseAfter("lunge", {hit: false, levels: 0, now}), [["attacker", "overextended", now]]);
  assert.deepEqual(R.houseAfter("hook", {hit: true, levels: 2, now}), [["target", "hooked", now]]);
  assert.deepEqual(R.houseAfter("hook", {hit: true, levels: 0, now}), [], "a hook soaked to nothing drags no one");
  assert.deepEqual(R.houseAfter("lunge", {hit: true, levels: 1, now: {combat: null, round: null}}), [], "outside a fight there is no next turn");
  assert.deepEqual(R.houseAfter("normal", {hit: true, levels: 1, now}), []);
});

test("B6921: overextended counts this turn and the next; hooked counts the next turn only", () => {
  const f = {combat: "c1", round: 3};
  assert.equal(R.overextendedNow(f, fight(3)), 1);
  assert.equal(R.overextendedNow(f, fight(4)), 1);
  assert.equal(R.overextendedNow(f, fight(5)), 0);
  assert.equal(R.overextendedNow(f, {id: "c2", round: 4}), 0);
  assert.equal(R.hookedNow(f, fight(3)), 0);
  assert.equal(R.hookedNow(f, fight(4)), 1);
  assert.equal(R.hookedNow(f, fight(5)), 0);
  assert.match(R.hookedMoveWhy(f, fight(4), "Anna"), /Anna was dragged off balance by a Hook and Pull and loses this turn's move/);
  assert.equal(R.hookedMoveWhy(f, fight(5), "Anna"), "");
});

test("B6921: Combat reads both marks: the defence roll, the move block, and the cards no longer leave it to the table", () => {
  const main = read("modules/wodx-combat/scripts/main.js");
  assert.match(main, /R\.overextendedNow\(target\.getFlag\?\.\(MOD, "overextended"\)/, "the defence difficulty reads the lunge");
  assert.match(main, /R\.hookedMoveWhy\(/, "the move block reads the hook");
  assert.match(main, /R\.houseAfter\(/, "the attack sets the marks");
  assert.doesNotMatch(R.MANEUVERS.hook.note, /Storyteller's choice/);
});
