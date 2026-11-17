import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/*
 * B7066: V20 merits and flaws that were only a card now change healing, waking and Aura Perception (V20 pp. 480-493).
 * The pure parts: what one level of healing costs, the rising heal under it, and the waking hour of Early Riser.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const R = await import(pathToFileURL(join(root, "modules/wodx-actions/scripts/rules.js")).href);
const K = await import(pathToFileURL(join(root, "modules/wodx-actions/scripts/kindred-rules.js")).href);
const DS = await import(pathToFileURL(join(root, "modules/wodx-actions/scripts/daysleep-rules.js")).href);
const TH = await import(pathToFileURL(join(root, "modules/wodx-actions/scripts/trait-hooks.js")).href);

test("Slow Healing: two blood a level of bashing or lethal (V20 p. 483)", () => {
  const plain = R.planHealing({bashing: 1, lethal: 2, aggravated: 0}, 6);
  assert.deepEqual([plain.spent, plain.healed.lethal, plain.healed.bashing], [3, 2, 1]);
  const slow = R.planHealing({bashing: 1, lethal: 2, aggravated: 0}, 6, {perLevel: 2});
  assert.deepEqual([slow.spent, slow.healed.lethal, slow.healed.bashing], [6, 2, 1]);
  // an odd point left over buys nothing
  const odd = R.planHealing({bashing: 0, lethal: 3, aggravated: 0}, 5, {perLevel: 2});
  assert.deepEqual([odd.spent, odd.healed.lethal, odd.after.lethal], [4, 2, 1]);
});

test("the rising heal keeps the hunger line and pays the Slow Healing price", () => {
  // Self-Control 3 keeps 4 blood: 10 blood leaves 6 to spend, three levels at two a level
  const r = K.risingHeal({bashing: 0, lethal: 5, aggravated: 0}, 10, 3, R.planHealing, {perLevel: 2});
  assert.deepEqual([r.spent, r.healed.lethal], [6, 3]);
  const plain = K.risingHeal({bashing: 0, lethal: 5, aggravated: 0}, 10, 3, R.planHealing);
  assert.deepEqual([plain.spent, plain.healed.lethal], [5, 5]);
});

test("Early Riser wakes at the hour of Humanity 10 (V20 p. 480)", () => {
  const hour = 3600;
  assert.ok(DS.wakeAt(0, hour, 10) < DS.wakeAt(0, hour, 3), "Humanity 10 rises before Humanity 3");
  assert.equal(TH.SLOW_AGG_SECONDS, 5 * 86400);
  assert.equal(TH.RISE_WOUNDED, 4);
});
