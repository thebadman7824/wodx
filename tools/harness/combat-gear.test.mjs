import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* The no-effect audit, gear in the fight (B3800-B3803) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const R = await import(pathToFileURL(join(root, "modules/wodx-combat/scripts/rules.js")));
const src = readFileSync(join(root, "modules/wodx-combat/scripts/main.js"), "utf8");
const row = (type, settingtype, value, isactive = true) => ({type: "Item", system: {bonuslist: [{type, settingtype, value, isactive}]}});

test("the sheet's own bonus rows count in the fight, only when on", () => {
  const items = [row("attack_diff", "TYPES.Item.Ranged Weapon", -2), row("attack_diff", "TYPES.Item.Ranged Weapon", -1, false), row("initiative_buff", "", 2),
    row("soak_buff", "lethal", 3), row("soak_buff", "all", 1), {type: "Bonus", system: {isactive: true, type: "initiative_buff", value: 1}}];
  assert.equal(R.sheetBonus(items, "attack_diff", "TYPES.Item.Ranged Weapon"), -2);
  assert.equal(R.sheetBonus(items, "attack_diff", "TYPES.Item.Melee Weapon"), 0);
  assert.equal(R.sheetBonus(items, "initiative_buff"), 3);
  assert.equal(R.sheetBonus(items, "soak_buff", "lethal"), 4);
  assert.equal(R.sheetBonus(items, "soak_buff", "bashing"), 1);
  const p = R.attackPool({attribute: 3, ability: 2, baseDifficulty: 6, sheetDice: 1, sheetDiff: -2, shieldDiff: 1});
  assert.equal(p.dice, 6);
  assert.equal(p.difficulty, 5);
  assert.ok(p.parts.some(x => x.startsWith("Shield")));
});

test("shields and parrying weapons (V20 Dark Ages p. 350)", () => {
  assert.deepEqual(R.shieldFor({shields: [{name: "Small Shield", parry: 4, attack: 0}]}), {parryDiff: 4, attackDiff: 0, names: ["Small Shield"]});
  assert.equal(R.shieldFor({shields: [{name: "War Shield", parry: null, attack: 2}]}).attackDiff, 2);
  assert.equal(R.shieldFor({weapon: "Dagger"}).parryDiff, 5);
  assert.equal(R.shieldFor({weapon: "Broadsword", close: true}).attackDiff, 1);
  assert.equal(R.shieldFor({weapon: "Broadsword", close: false}).attackDiff, 0, "the sword's penalty is for close attacks only");
  assert.equal(R.shieldFor({weapon: "Club"}).parryDiff, null);
  assert.match(src, /R\.shieldFor\(\{ \.\.\.shieldsOf\(target\), close \}\)/);
});

test("cyber limbs and plates soak blows aimed at them", () => {
  const limbs = [{name: "Cyberarm", soak: 4, part: "limb"}, {name: "Hydraulic Rams", soak: 6, part: "limb"}, {name: "Armor", soak: 4, part: "limb"}, {name: "Cowl", soak: 3, part: "head"}];
  assert.deepEqual(R.limbSoak(limbs, "arm"), {dice: 10, names: ["Hydraulic Rams", "Armor"]});
  assert.equal(R.limbSoak(limbs, "medium").dice, 10);
  assert.equal(R.limbSoak(limbs, "head").dice, 3);
  assert.equal(R.limbSoak(limbs, "none").dice, 0);
  assert.equal(R.limbSoak(limbs, "body").dice, 0);
  assert.equal(R.limbSoak([{name: "Armor", soak: 4}], "arm").dice, 0, "an option needs a limb to sit on");
});

test("heavy fire against armour and ships (Great War pp. 73 to 77)", () => {
  assert.deepEqual(R.heavyPlan({heavy: {pen: 3}, armour: {pen: 7}, still: true}).diff, 5);
  assert.equal(R.heavyPlan({heavy: {pen: 5}, armour: {pen: 9}, moving: true}).diff, 10);
  const n = R.heavyPlan({heavy: {naval: 7}, armour: {ship: 8}, crew: 2});
  assert.equal(n.dice, 9); assert.equal(n.diff, 8);
  assert.equal(R.heavyPlan({heavy: {blast: 6}, crew: 1}).dice, 7);
  assert.deepEqual([0, 1, 3, 5].map(R.penetrationResult), ["no effect", "crew or kit harmed", "disabled", "destroyed"]);
  assert.match(src, /WoDX: Heavy Fire/);
});

test("Combat reads the installed cyberware: Pain Editor, cyberarm Potence, limb soak, initiative", () => {
  assert.match(src, /api\?\.cyber\?\.installedFx\?\.\(actor\)/);
  assert.match(src, /add\("Cyber arm"/);
  assert.match(src, /R\.limbSoak\(cyber\(target\)/);
  assert.match(src, /sheetBonus\(a\.items, "initiative_buff"\)/);
  assert.match(src, /cyber\(actor\)\?\.body\?\.ease/);
});

test("body traits and a Pain Editor survive the system's recompute (B3804)", () => {
  const level = (total, penalty) => ({value: total, total, penalty, label: "x"});
  const fresh = (dmg) => ({system: {health: {bruised: level(1, 0), hurt: level(1, -1), injured: level(1, -1), wounded: level(1, -2), mauled: level(1, -2), crippled: level(1, -5), incapacitated: level(1, 0),
    damage: {bashing: dmg, lethal: 0, aggravated: 0, woundpenalty: -9}}, traits: {health: {totalhealthlevels: {max: 7, value: 7}}}}});
  const numb = R.applyBodyTotals(fresh(3), {ease: 5});
  assert.equal(numb.system.health.damage.woundpenalty, 0);
  const big = R.applyBodyTotals(fresh(2), {bruised: 1});
  assert.equal(big.system.health.bruised.total, 2);
  assert.equal(big.system.health.damage.woundpenalty, 0, "two bruised levels: still no penalty");
  assert.equal(big.system.traits.health.totalhealthlevels.max, 8);
  const plain = R.applyBodyTotals(fresh(2), null);
  assert.equal(plain.system.health.damage.woundpenalty, -9, "no body traits: the system's own figure stands");
  assert.match(readFileSync(join(root, "system/worldofdarkness/module/actor/data/wod-actor-base.js"), "utf8"), /Hooks\.callAll\("wodxActorTotals"/);
  assert.match(src, /Hooks\.on\("wodxActorTotals"/);
});
