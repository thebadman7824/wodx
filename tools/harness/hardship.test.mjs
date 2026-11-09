import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Hardship on the road (Storyteller 0.17.0) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const H = await imp("modules/wodx-storyteller/scripts/hardship-rules.mjs");
const {DAY, HOUR} = H;

test("hardship: only the living", () => {
  assert.ok(H.isLiving("Mortal"));
  assert.ok(H.isLiving("Werewolf"));
  assert.ok(!H.isLiving("Vampire"));
  assert.ok(!H.isLiving("Wraith"));
  assert.ok(!H.isLiving("PC", "Brujah"));
  assert.ok(H.isLiving("PC", ""));
});

test("hardship: a new character starts fed and rested", () => {
  const x = H.normNeeds(undefined, 1000);
  assert.equal(x.water, 1000); assert.equal(x.food, 1000); assert.equal(x.sleep, 1000); assert.equal(x.tired, 0);
});

test("hardship: thirst rolls each day, from difficulty 6, and hurts without a roll past a day a Stamina dot", () => {
  const c = H.needChecks(0, 0, 4 * DAY, 2, 1);
  assert.deepEqual(c.map(x => x.diff), [6, 7, 8, 9]);
  assert.deepEqual(c.map(x => x.auto), [false, false, true, true]);
  assert.equal(H.needChecks(0, 4, 4 * DAY, 2, 1).length, 0);
  const food = H.needChecks(0, 0, 4 * DAY, 1, 3);
  assert.deepEqual(food.map(x => x.auto), [false, false, false, true]);
});

test("hardship: sleep checks start on the second day; weather rolls by severity", () => {
  assert.equal(H.sleepChecks(0, 0, DAY + 10).length, 0);
  assert.deepEqual(H.sleepChecks(0, 0, 3 * DAY).map(x => x.day), [2, 3]);
  assert.equal(H.weatherRolls(0, 2 * HOUR, "harsh"), 2);
  assert.equal(H.weatherRolls(0, 2 * HOUR, "deadly"), 8);
  assert.equal(H.weatherRolls(0, 2 * HOUR, "none"), 0);
  assert.equal(H.weatherRolls(0, 100 * HOUR, "deadly"), H.MAX_ROLLS);
  assert.equal(H.tiredPenalty(9), -3);
});

test("hardship: off by default, runs on the active Storyteller, with Undo and the window", () => {
  const s = src("modules/wodx-storyteller/scripts/hardship.mjs");
  assert.match(s, /default: false/);
  assert.match(s, /if \( !isActiveGM\(\) \|\| busy/);
  assert.match(s, /wst-hardship-undo/);
  assert.match(s, /healDamage/);
  assert.match(s, /searchBox\("table\.wst-hardship-t"/);
  const m = src("modules/wodx-storyteller/scripts/main.mjs");
  assert.match(m, /Hard\.registerHardshipHooks\(\)/);
  assert.match(m, /hardship: \{open: Hard\.hardshipDialog/);
});
