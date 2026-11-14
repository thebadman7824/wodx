import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import * as R from "../../modules/wodx-combat/scripts/rules.js";

/* Knocked down: the stand-up roll at the start of the turn and the Initiative cost (B3921) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const m = readFileSync(join(root, "modules/wodx-combat/scripts/main.js"), "utf8");

test("knockdown: a success stands them up, anything else keeps them down", () => {
  assert.equal(R.STAND_DIFF, 6);
  assert.ok(R.standResult({successes: 1}).up);
  assert.ok(!R.standResult({successes: 0}).up);
  assert.ok(!R.standResult({successes: 0, botch: true}).up);
});

test("knockdown: standing costs 2 Initiative on the next turn of the same fight only", () => {
  const c = {id: "c1", round: 3};
  assert.equal(R.stoodPenalty({combat: "c1", round: 2}, c), 2);
  assert.equal(R.stoodPenalty({combat: "c1", round: 3}, c), 0);
  assert.equal(R.stoodPenalty({combat: "other", round: 2}, c), 0);
  assert.equal(R.stoodPenalty(null, c), 0);
});

test("knockdown: Combat rolls at the turn's start, behind a setting, and the Initiative roll reads the cost", () => {
  assert.match(m, /s\("standUpRoll",/);
  assert.match(m, /hasCondition\?\.\(actor, "knockdown"\)/);
  assert.match(m, /R\.stoodPenalty\(a\.getFlag\?\.\(MOD, "stoodUp"\), combat\)/);
  assert.match(m, /rollInitiative, standUp, getProfile/);
});
