import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* B5160: conditions that change the body in a fight (a fomor's Numbing) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));

test("a numbing condition adds Bruised levels and clears wound penalties", async () => {
  const R = await imp("modules/wodx-combat/scripts/rules.js");
  const b = R.conditionBody([{id: "numbing", name: "Numbing", mods: {bodyBruised: 3, bodyEase: 99}}, {id: "asleep", mods: {noAction: true}}]);
  assert.deepEqual({bruised: b.bruised, ease: b.ease, names: b.names}, {bruised: 3, ease: 99, names: ["Numbing"]});
  assert.equal(R.conditionBody([{id: "asleep", mods: {noAction: true}}]), null);
  assert.equal(R.bodyPenalty({key: "wounded", penalty: -2}, {}, b), 0);
});

test("merging a condition with the traits' body adds the levels and keeps the stronger easing", async () => {
  const R = await imp("modules/wodx-combat/scripts/rules.js");
  const m = R.mergeBody({bruised: 1, shift: 1, ease: 1, silver: true, names: ["Huge Size"]}, {bruised: 3, shift: 0, ease: 99, silver: false, names: ["Numbing"]});
  assert.deepEqual(m, {bruised: 4, shift: 1, ease: 99, silver: true, names: ["Huge Size", "Numbing"]});
  assert.equal(R.mergeBody(null, m), m);
});
