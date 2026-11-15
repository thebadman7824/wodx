// Lasting servants against Retainers or Familiar (B4929) and the resist roll breakdown (B4928).
import {test} from "node:test";
import assert from "node:assert/strict";
import {join, dirname} from "node:path";
import {fileURLToPath} from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SR = await import(join(root, "modules/wodx-actions/scripts/summon-rules.js"));

test("servants beyond Retainers are over; a second familiar is over; NPC masters have no cap", () => {
  assert.equal(SR.servantCap({rating: 2, have: 1, adding: 1}).over, false);
  assert.equal(SR.servantCap({rating: 2, have: 2, adding: 1}).over, true);
  assert.equal(SR.servantCap({rating: 3, have: 1, adding: 1, familiar: true}).over, true);
  assert.equal(SR.servantCap({rating: 0, have: 5, adding: 3, npc: true}).over, false);
  assert.equal(SR.servantCap({rating: 1, have: 0, familiar: true}).bg, "Familiar");
});

test("a Background dot costs the current rating times three, at least three", () => {
  assert.equal(SR.backgroundCost(0), 3);
  assert.equal(SR.backgroundCost(2), 6);
});

test("the breakdown names the pool, marks each die and the ones, and the power's own successes", () => {
  const b = SR.breakdown({parts: [{name: "Strength", value: 3}], dice: 3, diff: 6, faces: [1, 6, 9], successes: 1, against: 3});
  assert.equal(b.pool, "Strength 3 = 3 dice, difficulty 6");
  assert.deepEqual(b.faces.map(f => f.mark), ["one", "hit", "hit"]);
  assert.match(b.result, /1 success; the power had 3/);
  assert.match(SR.breakdown({dice: 2, faces: [1, 1], botch: true}).result, /a botch/);
});
