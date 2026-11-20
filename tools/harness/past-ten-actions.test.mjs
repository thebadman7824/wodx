/* B7120 and B7121 in WoDX Actions. Past 10, each point needs one more success, and the Action card says so; power
 * windows no longer hold their difficulty at 10 before the roll. Trying again: a failed simple roll at the same task
 * and target in the same scene is +1 difficulty a try, and at 10 the task cannot be tried (V20 Dark Ages pdf 324). */
import "./win-paths.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {join, dirname} from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dir = join(root, "modules/wodx-actions/scripts");
const load = p => import(pathToFileURL(join(dir, p)));
const RTY = await load("retry-rules.js");
const R = await load("rules.js");
const main = readFileSync(join(dir, "main.js"), "utf8");

test("B7121: the memory counts failures per task, target and scene, and a success clears it", () => {
  const k = RTY.retryKey({attr: "dexterity", ability: "larceny", targetId: "door"});
  assert.equal(k, "t:dexterity+larceny@door");
  assert.equal(RTY.retryKey({preset: "check-climb"}), "p:check-climb@-");
  let s = RTY.afterRoll(null, k, 4, {failed: true});
  s = RTY.afterRoll(s, k, 4, {failed: true});
  assert.equal(RTY.retriesNow(s, k, 4), 2);
  assert.equal(RTY.retriesNow(s, k, 5), 0, "a new scene starts again");
  assert.equal(RTY.retriesNow(s, "t:wits+alertness@-", 4), 0, "another task is fresh");
  s = RTY.afterRoll(s, k, 4, {failed: false});
  assert.equal(RTY.retriesNow(s, k, 4), 0, "a success clears it");
  assert.equal(RTY.retriesNow(RTY.afterRoll({scene: 3, n: {[k]: 4}}, k, 4, {failed: true}), k, 4), 1, "an old scene's count is dropped");
  let big = null;
  for (let i = 0; i < RTY.KEEP + 5; i++) big = RTY.afterRoll(big, `k${i}`, 1, {failed: true});
  assert.equal(Object.keys(big.n).length, RTY.KEEP);
});

test("B7121: only simple and teamwork rolls count; the card names the try", () => {
  assert.equal(RTY.counts("simple"), true);
  assert.equal(RTY.counts("teamwork"), true);
  assert.equal(RTY.counts("extended"), false);
  assert.equal(RTY.counts("resisted"), false);
  assert.equal(RTY.counts(undefined), true);
  assert.equal(RTY.tryLabel(0), "");
  assert.equal(RTY.tryLabel(1), "second try");
  assert.equal(RTY.tryLabel(2), "third try");
  assert.equal(RTY.tryLabel(12), "attempt 13");
});

test("B7121: the pool adds a point a try and stops at 10", () => {
  const base = {attribute: 3, attributeLabel: "Dexterity", ability: 2, abilityLabel: "Larceny", abilityKey: "larceny", abilityType: "skill", baseDifficulty: 7};
  const two = R.actionPool({...base, retries: 2, retryLabel: "third try"});
  assert.equal(two.difficulty, 9);
  assert.ok(two.parts.includes("Retry (third try) +2 diff"));
  assert.equal(two.blocked, null);
  const three = R.actionPool({...base, retries: 3, retryLabel: "fourth try"});
  assert.match(three.blocked, /cannot be attempted now/);
  assert.equal(R.actionPool({...base, extraDiff: 4}).blocked, null, "a 10 from other modifiers is rolled, with more successes needed");
});

test("B7120 and B7121: Actions wires both into its rolls and menus", () => {
  assert.match(main, /opts = \{ \.\.\.opts, over: opts\.over \?\? R\.overTen\(difficulty\) \};/);
  assert.match(main, /R\.overTenText\(r\.over, r\.wanted\)/);
  assert.match(main, /retries: Math\.max\(num\(fd\.retries\), retriesRemembered\(actor, fd, target\)\)/);
  assert.match(main, /await rememberTry\(actor, fd, target, r\);/);
  assert.match(main, /clearTries: async/);
  assert.match(main, /s\("retryMemory"/);
  const menus = readFileSync(join(dir, "profile-menus.js"), "utf8");
  assert.equal((menus.match(/"api:endScene", "End scene", "fa-flag-checkered"\]/g) ?? []).length, (menus.match(/"api:clearTries"/g) ?? []).length);
  // No power window holds its difficulty at 10 before the roll any more
  for (const f of readdirSync(dir).filter(f => /\.(m?js)$/.test(f))) {
    const t = readFileSync(join(dir, f), "utf8");
    assert.doesNotMatch(t, /rollPool\([^;]*?,\s*Math\.min\(10, [^;]*?(lim\.diff|rm\.diff|sm\.diff|cm\.diff)/, `${f} holds a roll at 10 before it is made`);
  }
});
