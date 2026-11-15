import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* B6020-B6025: marks that used to sit on a sheet now change movement and rolls. */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const AU = await import(join(root, "modules/wodx-combat/scripts/auto.js"));
const B = await import(join(root, "modules/wodx-actions/scripts/beast-marks-rules.js"));

test("a body held by a condition does not move", () => {
  for ( const id of ["held", "immobilized", "staked", "torpor", "incapacitated", "asleep"] ) {
    const h = AU.holdOf([id], {[id]: `Name ${id}`});
    assert.equal(h.still, `Name ${id}`);
    const m = AU.movement({dexterity: 3, still: h.still, pace: h.pace});
    assert.deepEqual([m.walk, m.jog, m.run, m.attackAfter], [0, 0, 0, 0]);
  }
  assert.equal(AU.holdOf(["blinded", "knockdown"]).still, "");
});

test("Numbed moves at three-quarter pace", () => {
  const h = AU.holdOf(["numbed"]);
  assert.equal(h.pace, 0.75);
  const full = AU.movement({dexterity: 2}), slow = AU.movement({dexterity: 2, pace: h.pace});
  assert.equal(slow.run, Math.floor(full.run * 0.75));
  assert.ok(slow.walk < full.walk);
});

test("waking behind the age makes the old Abilities harder", () => {
  const sleep = {behind: [{key: "academics", xp: 3}, {key: "medicine", xp: 2}]};
  assert.deepEqual(B.behindEffects(sleep, ["academics"]).map(e => e.diff), [B.BEHIND_DIFFICULTY]);
  assert.equal(B.behindEffects(sleep, ["brawl"]).length, 0);
  assert.equal(B.behindEffects(null, ["academics"]).length, 0);
});
