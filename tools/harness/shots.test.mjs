import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Shots and reloading (WoDX Combat 3.8.0, a house rule that starts off) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const R = await import(pathToFileURL(join(root, "modules/wodx-combat/scripts/rules.js")));

test("shots: only a weapon with a capacity is counted", () => {
  assert.deepEqual(R.shotsOf({value: 3, max: 6}), {counted: true, value: 3, max: 6, empty: false});
  assert.deepEqual(R.shotsOf({value: 0, max: 1}), {counted: true, value: 0, max: 1, empty: true});
  assert.equal(R.shotsOf({value: 0, max: 0}).counted, false);
  assert.equal(R.shotsOf(undefined).empty, false);
  assert.equal(R.shotsOf({value: 9, max: 6}).value, 6);
});

test("reloading: a firearm takes a turn, a crossbow five, fewer with Archery in the Dark Ages", () => {
  assert.deepEqual(R.reloadTurns({}), {turns: 1, ref: "V20 p. 278", multi: true});
  assert.equal(R.reloadTurns({crossbow: true}).turns, 5);
  assert.equal(R.reloadTurns({crossbow: true, darkAges: true, archery: 3}).turns, 2);
  assert.equal(R.reloadTurns({crossbow: true, darkAges: true, archery: 5}).turns, 1);
  assert.equal(R.reloadTurns({crossbow: true, darkAges: true}).ref, "V20 Dark Ages p. 348");
  assert.ok(R.isCrossbow("Heavy Crossbow"));
  assert.ok(!R.isCrossbow("Longbow"));
});

test("shots: the setting starts off, an empty weapon is refused and a shot is spent after the roll", () => {
  const s = src("modules/wodx-combat/scripts/main.js");
  assert.match(s, /"countShots", \{[^}]*default: false/);
  assert.match(s, /empty: reload first/);
  assert.match(s, /is empty\. Reload it first/);
  assert.match(s, /spendShot\(attacker, w\)/);
  assert.ok(s.indexOf("const atk = await rollPool(pool.dice") < s.indexOf("spendShot(attacker, w)"), "the round is spent after the attack roll");
  assert.match(s, /export async function reload/);
  assert.match(s, /name: "WoDX: Reload"/);
  assert.equal(JSON.parse(src("modules/wodx-combat/module.json")).version, "3.8.5");
});
