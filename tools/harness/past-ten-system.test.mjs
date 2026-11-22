/* B7120 in the system fork: a power, attack, casting or item window roll past 10 is rolled at 10 and needs one
 * more success a point (M20 pdf 504; V20 pdf 166); the card says how many. */
import "./win-paths.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {join, dirname} from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const load = p => import(pathToFileURL(join(root, p)));
const read = p => readFileSync(join(root, p), "utf8");

test("B7120: the system's own windows keep the count past 10 and the roller takes it off", async () => {
  const M = await load("system/worldofdarkness/module/scripts/wodx-roll-mods.js");
  const dr = {actor: {id: "a"}, origin: "power", numDices: 5, difficulty: 8, targetlist: []};
  M.applyWodxRollMods(dr, {modsFor: () => ({dice: 0, diff: 4, parts: ["Drained +2 diff", "Blinded +2 diff"]})});
  assert.equal(dr.difficulty, 10);
  assert.equal(dr.wodxOver, 2);
  assert.match(dr.extraInfo.at(-1), /rolled at 10; 2 more successes needed/);
  assert.deepEqual(M.wodxOverSuccesses(dr, 3), {success: 1, over: 2});
  assert.deepEqual(M.wodxOverSuccesses(dr, 1), {success: 0, over: 2});
  assert.deepEqual(M.wodxOverSuccesses({...dr, origin: "soak"}, 3), {success: 3, over: 0});
  assert.deepEqual(M.wodxOverSuccesses({origin: "general"}, 3), {success: 3, over: 0});
  const roller = read("system/worldofdarkness/module/scripts/roll-dice.js");
  assert.match(roller, /const wodxOver = wodxOverSuccesses\(diceRoll, success\);/);
  assert.match(read("system/worldofdarkness/module/dialogs/dialog-generalroll.js"), /generalRoll\.wodxOver = Number\(this\.object\.wodxOver\)/);
});
