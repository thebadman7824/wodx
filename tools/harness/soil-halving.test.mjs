/* B6925: a Tzimisce away from native soil has every dice pool halved, once more each night, down to one die
 * (V20 p. 71, pdf 79). The signature effect carries the count of halvings, and the roll pipeline halves the pool. */
import "./win-paths.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {join, dirname} from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const load = p => import(pathToFileURL(join(root, p)));
const S = await load("modules/wodx-chronicle/scripts/signature-rules.mjs");
const T = await load("modules/wodx-chronicle/scripts/trait-rules.mjs");
const M = await load("system/worldofdarkness/module/scripts/wodx-roll-mods.js");
const read = p => readFileSync(join(root, p), "utf8");

test("B6925: halvePool halves once a night, rounded down, never under one die", () => {
  assert.equal(T.halvePool(8, 1), 4);
  assert.equal(T.halvePool(7, 1), 3);
  assert.equal(T.halvePool(8, 2), 2);
  assert.equal(T.halvePool(8, 5), 1, "one die at the least");
  assert.equal(T.halvePool(0, 2), 0, "no dice stays no dice");
  assert.equal(T.halvePool(6, 0), 6);
  assert.equal(S.soilHalvings(3, 0), 3);
  assert.equal(S.soilHalvings(3, 1), 2, "an Old Clan Tzimisce's night of grace");
  assert.equal(S.soilHalvings(0, 0), 0);
});

test("B6925: the soil effect reaches every roll's sum as a halving count", () => {
  const list = [{tags: ["all"], halve: 2, why: "Rested without native soil"}];
  const fx = S.sigRollEffects(list, {tags: T.rollTags("dexterity", "melee")});
  assert.equal(fx.length, 1);
  assert.equal(fx[0].halve, 2);
  const s = T.sumEffects(fx);
  assert.equal(s.halve, 2);
  assert.ok(s.parts.some(p => /pool halved twice/.test(p)), s.parts.join("; "));
  assert.equal(T.sumEffects([{name: "x", dice: 1, diff: 0}]).halve, undefined);
});

test("B6925: the system's roller and WoDX Actions halve the pool", () => {
  const dr = {actor: {id: "a"}, origin: "power", numDices: 8, difficulty: 6, targetlist: []};
  M.applyWodxRollMods(dr, {modsFor: () => ({dice: 0, diff: 0, parts: ["Rested without native soil: pool halved"], halve: 1})});
  assert.equal(dr.wodxHalve, 1);
  const general = {actor: {id: "a"}, origin: "general", numDices: 9, difficulty: 6, targetlist: [{numDices: 9}]};
  const h = M.wodxHalveRoll(general, {modsFor: () => ({halve: 1}), on: true});
  assert.equal(h, 1);
  assert.equal(general.numDices, 4);
  assert.equal(general.targetlist[0].numDices, 4);
  assert.equal(M.wodxHalveRoll({...general, origin: "damage", numDices: 6}, {modsFor: () => ({halve: 1}), on: true}), 0);
  assert.match(read("system/worldofdarkness/module/scripts/roll-dice.js"), /wodxHalveRoll\(diceRoll, wodxSrc\)/);
  assert.match(read("modules/wodx-actions/scripts/main.js"), /halvePool\(built\.dice, tm\.halve\)/);
  assert.match(read("modules/wodx-chronicle/scripts/signatures.mjs"), /halve: S\.soilHalvings\(/);
});
