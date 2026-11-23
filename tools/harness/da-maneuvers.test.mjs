import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as R from "../../modules/wodx-combat/scripts/rules.js";

const src = p => fs.readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

/* B7694: the Dark Ages Companion (2002) maneuvers, pp. 34-36 */
test("the 2002 maneuvers: difficulties and damage over a punch, prerequisites", () => {
  const base = 6;
  assert.deepEqual(["choke", "gobbet", "jointbreak", "necksnap"].map(k => base + R.DA2002[k].diff), [7, 8, 8, 9]);
  assert.deepEqual([R.DA2002.jointbreak.dmg, R.DA2002.necksnap.dmg], [2, 3]);
  assert.equal(R.DA2002.choke.noDamage, true);
  const fist = {id: "unarmed:punch", unarmed: true, name: "Punch"}, sword = {name: "Sword", ability: "melee"};
  assert.match(R.da2002Why("jointbreak", {brawl: 3, strength: 3}, fist), /Brawl 4/);
  assert.equal(R.da2002Why("jointbreak", {brawl: 4, strength: 2}, fist), "");
  assert.match(R.da2002Why("necksnap", {brawl: 2, strength: 2}, sword), /Brawl maneuver/);
  assert.match(R.da2002Why("gobbet", {potence: 1}, fist), /Potence 2/);
  assert.equal(R.da2002Why("gobbet", {potence: 2}, fist), "");
  assert.equal(R.da2002Why("gobbet", {protean: 2}, {unarmed: true, name: "Claws (grow them)"}), "");
  assert.equal(R.da2002Why("tendon", {melee: 4, dexterity: 2}, sword), "");
  assert.match(R.da2002Why("tendon", {melee: 4, dexterity: 2}, {name: "Club", ability: "melee"}), /blade/);
  assert.equal(R.da2002Why("tendon", {brawl: 4}, {unarmed: true, name: "Claw"}), "");
  assert.equal(R.maneuverKey(R.DA2002.necksnap), "necksnap");
  assert.ok(R.GRIP_HOLDS.includes("choke"));
});

test("what the 2002 maneuvers leave, and the choke's turns", () => {
  assert.deepEqual(R.da2002After("gobbet", {hit: true, levels: 1}), [{kind: "blood", points: 1}]);
  assert.deepEqual(R.da2002After("gobbet", {hit: true, levels: 0}), []);
  assert.equal(R.da2002After("jointbreak", {hit: true, levels: 1})[0].kind, "cripple");
  assert.deepEqual(["mortal", "vampire", "lupine"].map(p => R.da2002After("necksnap", {hit: true, levels: 1, profile: p})[0].how), ["dies", "paralysed", "incapacitated"]);
  assert.deepEqual(R.da2002After("tendon", {hit: true, levels: 1}), []);
  assert.equal(R.da2002After("tendon", {hit: true, levels: 2, aimed: "ankle"})[0].part, "leg-r");
  assert.equal(R.chokeTurn({round: 3, startRound: 3}).levels, 0);
  assert.equal(R.chokeTurn({round: 4, startRound: 3}).levels, 1);
  assert.equal(R.chokeTurn({round: 4, startRound: 3, vampire: true}).levels, 0);
  assert.deepEqual(R.chokeTurn({round: 6, startRound: 3, incapacitated: true, incapTurns: 1, stamina: 2}), {levels: 0, dies: true, incapTurns: 2});
  const main = src("modules/wodx-combat/scripts/main.js");
  assert.match(main, /s\("companion2002Maneuvers"/);
  assert.match(main, /mkey === "choke" \? "choke"/);
  assert.match(main, /fd\.maneuver === "necksnap" \? attr\(target, "strength"\)/);
});
