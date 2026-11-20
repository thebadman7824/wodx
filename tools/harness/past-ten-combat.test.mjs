/* B7120: a difficulty past 10 is rolled at 10, and each point past it needs one more success (M20 pdf 504; V20 pdf
 * 166 for Dominate). WoDX Combat's count passes the shared one through, its roller keeps the count when it holds the
 * difficulty at 10, and the attack log no longer cites VtDA20 p. 323 (the trying-again rule) as a ceiling. */
import "./win-paths.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {join, dirname} from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const R = await import(pathToFileURL(join(root, "modules/wodx-combat/scripts/rules.js")));
const main = readFileSync(join(root, "modules/wodx-combat/scripts/main.js"), "utf8");

test("B7120: Combat's count takes a success a point past 10, and keeps a count held at 10", () => {
  assert.equal(R.countSuccesses([10, 10], 12).successes, 0);
  assert.equal(R.countSuccesses([10, 10, 10], 12).successes, 1);
  assert.equal(R.countSuccesses([10, 10, 10], 12).over, 2);
  assert.equal(R.countSuccesses([10, 10, 10], 12).rolled, 3);
  assert.equal(R.countSuccesses([10, 10], 10, {over: 1}).successes, 1);
  assert.equal(R.countSuccesses([10, 1], 12).botch, false, "short past 10 is a failure");
  assert.equal(R.countSuccesses([7, 7], 7).successes, 2, "nothing changes at 10 or under");
  assert.equal(R.overTen(11), 1);
  assert.equal(R.overTenText(1, 11), "1 more success needed (difficulty 11, past 10)");
});

test("B7120: Combat's roller and defences keep the count; the attack log cites the right books", () => {
  assert.match(main, /const over = opts\.over \?\? R\.overTen\(difficulty\);/);
  assert.match(main, /rollPool\(p\.dice, p\.diff, \{ over: p\.over \|\| 0 \}\)/);
  assert.match(main, /over: R\.overTen\(diff\), abKey, notes, weapon/);
  assert.doesNotMatch(main, /the action is impossible \(VtDA20 p\. 323\)/);
  assert.match(main, /M20 pdf 504, V20 pdf 166/);
});
