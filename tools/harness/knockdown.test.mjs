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

/* B6151: a failed stand-up loses the action; the knockdown lasts until they stand; the -2 without a re-roll */

test("knockdown: a failed stand-up spends this turn's action only", () => {
  const c = {id: "c1", round: 3};
  assert.equal(R.lostActionNow({combat: "c1", round: 3}, c), true);
  assert.equal(R.lostActionNow({combat: "c1", round: 2}, c), false);
  assert.equal(R.lostActionNow({combat: "c2", round: 3}, c), false);
  assert.equal(R.lostActionNow(null, c), false);
});

test("knockdown: in a fight it lasts until they stand, with the roll off one turn, outside a fight the scene", () => {
  assert.deepEqual(R.knockdownDuration({inFight: true, standRoll: true}), {kind: "scene"});
  assert.deepEqual(R.knockdownDuration({inFight: true, standRoll: false}), {kind: "rounds", rounds: 1});
  assert.deepEqual(R.knockdownDuration({inFight: false}), {kind: "scene"});
});

test("knockdown: without a re-roll the Initiative drops 2 for the next turn and comes back after", () => {
  const stood = {combat: "c1", round: 2};
  assert.deepEqual(R.stoodInitiativeStep({stood, combat: {id: "c1", round: 3}}), {lower: 2});
  assert.deepEqual(R.stoodInitiativeStep({stood, combat: {id: "c1", round: 3}, reroll: true}), {});
  assert.deepEqual(R.stoodInitiativeStep({restore: {combat: "c1", round: 3, by: 2}, combat: {id: "c1", round: 4}}), {restore: 2});
  assert.deepEqual(R.stoodInitiativeStep({restore: {combat: "c1", round: 3, by: 2}, combat: {id: "c1", round: 3}}), {});
});

test("knockdown: attacks, the turn conductor and the stand-up read the lost action", () => {
  const cd = readFileSync(join(root, "modules/wodx-combat/scripts/conductor.js"), "utf8");
  assert.match(m, /setFlag\(MOD, "lostAction"/);
  assert.match(m, /function noAttackWhy[\s\S]*R\.lostActionNow/);
  assert.match(m, /async function resolveAttack\([^)]*\) \{\s*\/\/[^\n]*\n\s*const barred = noAttackWhy/);
  assert.match(m, /R\.knockdownDuration\(/);
  assert.match(m, /R\.stoodInitiativeStep\(/);
  assert.match(cd, /getFlag\?\.\(MOD, "lostAction"\)/);
});

test("B6152: full defence is the NPC's flag for this turn; B6153: a gun shoots with Firearms", () => {
  assert.equal(R.fullDefenseNow("c1:3", {id: "c1", round: 3}), true);
  assert.equal(R.fullDefenseNow("c1:2", {id: "c1", round: 3}), false);
  assert.equal(R.fullDefenseNow(null, {id: "c1", round: 3}), false);
  assert.equal(R.rangedAbilityDefault("Heavy Pistol"), "firearms");
  assert.equal(R.rangedAbilityDefault("Musket"), "firearms");
  assert.equal(R.rangedAbilityDefault("Longbow"), "archery");
  assert.equal(R.rangedAbilityDefault("Light Crossbow"), "archery");
  assert.match(m, /R\.rangedAbilityDefault\(i\.name\)/);
  assert.match(m, /getFlag\?\.\("wodx-npc", "fullDefense"\)/);
});

test("B6150: the attack and damage hooks are sent on to the active Storyteller, and fired there once", () => {
  assert.match(m, /Hooks\.callAll\("wodxAttackRolled", attacker, rolled\);\s*relayHook\("wodxAttackRolled"/);
  assert.match(m, /Hooks\.callAll\("wodxDamageApplied", actor, applied\);\s*relayHook\("wodxDamageApplied"/);
  assert.match(m, /isResponsibleGM\(\) \|\| !game\.users\.activeGM\) return false/);
  assert.match(m, /p\.action === "relayHook"\) return onRelayedHook/);
  assert.match(m, /relayed: true/);
});

test("B6154: Foundry's own Next runs the extra-action pass when the conductor is off", () => {
  const cd = readFileSync(join(root, "modules/wodx-combat/scripts/conductor.js"), "utf8");
  assert.match(cd, /export function wrapFoundryNext/);
  assert.match(cd, /proto\.nextRound = async function/);
  assert.match(cd, /level\(\) === "off" && !!combat\?\.started/);
  assert.match(cd, /case "next": if \(level\(\) === "off"/);
});
