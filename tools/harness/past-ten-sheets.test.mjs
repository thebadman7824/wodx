/* B7120 in WoDX Sheets: a roll from the sheet (the general window) past 10 is rolled at 10 and needs one
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

test("B7120: WoDX Sheets passes the count from the general window and names it", async () => {
  const RR = await load("modules/wodx-rules/sheets/sheet-roll-rules.mjs");
  const a = RR.applyTo({bonus: 0, difficulty: 8}, {dice: 0, diff: 3});
  assert.equal(a.difficulty, 10);
  assert.equal(a.over, 1);
  assert.equal(RR.overNote(a), " (rolled at 10; 1 more success needed)");
  assert.equal(RR.applyTo({difficulty: 6}, {diff: 1}).over, 0);
  assert.equal(RR.overNote({over: 0}), "");
  const rolls = read("modules/wodx-sheets/scripts/sheet-rolls.mjs");
  assert.match(rolls, /o\.wodxOver = applied\.over \|\| 0;/);
  assert.match(rolls, /o\.wodxOver = 0;/);
});
