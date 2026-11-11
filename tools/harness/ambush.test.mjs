import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import * as AM from "../../modules/wodx-combat/scripts/ambush-rules.js";

/* The ambush (WoDX Combat 3.11.0): V20 p. 274, V20 Dark Ages p. 345 */

test("only someone lying in wait, against someone not already fighting", () => {
  assert.ok(AM.isAmbush({sneaking: true}));
  assert.ok(AM.isAmbush({obfuscated: true}));
  assert.ok(AM.isAmbush({hidden: true}));
  assert.ok(!AM.isAmbush({}), "an attack in plain sight is no ambush");
  assert.ok(!AM.isAmbush({sneaking: true, targetFighting: true}));
  assert.ok(!AM.isAmbush({sneaking: true, attackerFighting: true}));
});

test("V20: a win is a free attack with no defence and the extra successes as dice", () => {
  const w = AM.ambushOutcome(4, 1, "v20");
  assert.deepEqual([w.result, w.attack, w.defend, w.bonusDice], ["free", true, false, 3]);
  const t = AM.ambushOutcome(2, 2, "v20");
  assert.deepEqual([t.result, t.attack, t.defend, t.bonusDice], ["first", true, true, 0]);
  const l = AM.ambushOutcome(1, 3, "v20");
  assert.deepEqual([l.result, l.attack], ["spotted", false]);
});

test("Dark Ages: a win is a free action the target cannot oppose, with no extra dice", () => {
  const w = AM.ambushOutcome(4, 1, "v20da");
  assert.deepEqual([w.result, w.defend, w.bonusDice], ["free", false, 0]);
  assert.match(w.why, /Dark Ages p\. 345/);
  assert.equal(AM.bookFor(1197), "v20da");
  assert.equal(AM.bookFor(1450), "v20");
  assert.equal(AM.bookFor(2023), "v20");
});

test("wired into both attacks, before the roll", () => {
  const main = readFileSync(new URL("../../modules/wodx-combat/scripts/main.js", import.meta.url), "utf8");
  assert.equal((main.match(/await ambushFirst\(\{ attacker, attackerTok, target, targetTok, fd \}\)/g) ?? []).length, 2);
  assert.match(main, /if \(!out\.defend\) fd\.defense = "none"/);
});
