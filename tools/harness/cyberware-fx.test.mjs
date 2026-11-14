import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* The no-effect audit, gear (B3795-B3797): cyberware, bioware and exoskeletons do something in the body */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const G = await import(pathToFileURL(join(root, "modules/wodx-library/scripts/gear-rules.mjs")));
const {GEAR_FX} = await import(pathToFileURL(join(root, "modules/wodx-library/data/gear-effects.mjs")));
const data = JSON.parse(readFileSync(join(root, "modules/wodx-library/data/gear.json"), "utf8"));
const by = n => data.items.find(i => i.name === n);
const cyber = data.items.filter(i => i.flags["wodx-library"].cyber);

test("every name in the table is a cyber piece in the data", () => {
  const names = new Set(cyber.map(i => i.name));
  for ( const k of Object.keys(GEAR_FX) ) assert.ok(names.has(k), k);
});

test("a piece's bonus rows are the system's own, off until it goes in", () => {
  const link = by("Smartgun Link");
  assert.deepEqual(link.system.bonuslist, [{name: "Smartgun Link: Ranged Weapon", settingtype: "TYPES.Item.Ranged Weapon", type: "attack_diff", value: -2, isactive: false, wodxGear: true}]);
  assert.equal(by("Linear Frame Omega").system.bonuslist[0].type, "attribute_fixed_value");
  assert.equal(by("Kerenzikov").system.bonuslist.find(b => b.type === "initiative_buff").value, 2);
  const on = G.gearBonusList([...link.system.bonuslist, {name: "mine", isactive: false}], true);
  assert.equal(on[0].isactive, true);
  assert.equal(on[1].isactive, false, "a row the player added stays as it was");
  assert.match(link.system.description, /Installed:<\/b> −2 attack difficulty with ranged weapons/);
});

test("cyber weapons that were plain items now fight", () => {
  for ( const n of ["Popup Gun", "Grenade Launcher", "Flame Thrower", "MM Launcher", "Dartgun"] ) assert.equal(by(n).type, "Ranged Weapon", n);
  for ( const n of ["Slice N' Dice", "Cybersnake", "Cutting Torch", "Gang Jazzler", "Ripper Hand"] ) assert.equal(by(n).type, "Melee Weapon", n);
  assert.deepEqual(by("Flame Thrower").system.damage, {attribute: "", bonus: 6, type: "aggravated", isrollable: true});
  assert.equal(by("Ripper Hand").system.damage.attribute, "strength");
});

test("Humanity cost: printed forms, ten points to a dot", () => {
  const six = () => 0.99, one = () => 0;
  assert.equal(G.humanityCost("2D6", six).points, 12);
  assert.equal(G.humanityCost("1D6/2", six).points, 3);
  assert.equal(G.humanityCost("1D6/2", one).points, 1);
  assert.equal(G.humanityCost("3D6+1", one).points, 4);
  assert.equal(G.humanityCost("0.5").points, 0.5);
  assert.equal(G.humanityCost("2pts").points, 2);
  assert.equal(G.humanityCost("1D6/pair", six).points, 6);
  assert.equal(G.humanityCost("—").points, 0);
  assert.deepEqual(G.dotsLost(8, 3, 7), {lost: 11, dots: 1, left: 6});
  assert.deepEqual(G.dotsLost(0, 25, 7), {lost: 25, dots: 2, left: 5});
  assert.deepEqual(G.dotsLost(4, 2, 7), {lost: 6, dots: 0, left: 7});
  assert.deepEqual(G.dotsLost(0, 99, 1), {lost: 99, dots: 1, left: 0});
});

test("installing turns rows on and takes Humanity; the hooks are wired", () => {
  const src = readFileSync(join(root, "modules/wodx-library/scripts/gear-install.mjs"), "utf8");
  assert.match(src, /preUpdateItem/);
  assert.match(src, /createItem/);
  assert.match(src, /humanityLoss/);
  assert.match(readFileSync(join(root, "modules/wodx-library/scripts/main.mjs"), "utf8"), /setupGearInstall\(\)/);
});

test("no cyber piece is left saying nothing: each has an effect line or its Humanity price", () => {
  for ( const i of cyber.filter(x => x.type === "Item") ) assert.match(i.system.description, /Installed:|Storyteller:/, i.name);
  const plain = cyber.filter(i => i.type === "Item" && !Object.keys(i.flags["wodx-library"].fx).length);
  assert.ok(plain.length <= 41, `${plain.length} pieces with only a Humanity cost`);
});

test("shields, parrying weapons, heavy guns and their armour carry their figures (B3798)", () => {
  const f = n => by(n).flags["wodx-library"];
  assert.deepEqual(f("Small Shield").shield, {parry: 4, attack: 0, closeOnly: false});
  assert.deepEqual(f("War Shield").shield, {parry: null, attack: 2, closeOnly: false});
  assert.deepEqual(f("Parry with Sword").parryWith, {weapon: "sword", parry: 6, attack: 1, closeOnly: true});
  assert.equal(f("5-inch gun firing high explosive").heavy.pen, 5);
  assert.equal(f("Trench mortar").heavy.pen, 3);
  assert.equal(f("Light artillery, airburst shrapnel").heavy.blast, 6);
  assert.equal(f("Naval rifle, huge").heavy.naval, 13);
  assert.deepEqual(f("Heavy tank armor").hardArmor, {pen: 8});
  assert.deepEqual(f("Ship armor: dreadnought battleship").hardArmor, {ship: 10});
  const kinds = data.items.filter(i => /shield|parry|heavy/.test(i.flags["wodx-library"].kind));
  for ( const i of kinds ) { const x = i.flags["wodx-library"]; assert.ok(x.shield || x.parryWith || x.heavy || x.hardArmor, i.name); }
});
