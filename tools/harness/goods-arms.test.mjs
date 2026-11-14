import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* The no-effect audit, everyday arms, weapon fittings and traps (B3805 to B3807) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const A = await imp("modules/wodx-library/scripts/arms-rules.mjs");
const D = await imp("modules/wodx-library/data/goods-arms.mjs");
const G = await imp("modules/wodx-library/data/goods.mjs");
const U = await imp("modules/wodx-library/scripts/use-rules.mjs");
const on = name => ({name, type: "Item", system: {isequipped: true}});

test("every everyday arms, accessories and traps good does something (or is ammunition, left to its own pass)", () => {
  const all = {...D.ARMS, ...D.FITTINGS, ...D.CARRIERS, ...D.WARDS, ...D.TRAPS, ...D.KIT};
  const goods = G.GOODS.filter(g => ["arms", "accessories", "traps"].includes(g.kind));
  assert.ok(goods.length >= 50);
  for ( const g of goods ) assert.ok(all[g.name] || D.AMMUNITION.includes(g.name), `${g.name} has no effect`);
  for ( const n of Object.keys(all) ) assert.ok(G.GOODS.some(g => g.name === n), `${n} is not a good`);
  for ( const g of goods.filter(g => !D.AMMUNITION.includes(g.name)) ) assert.ok(U.abilitiesOf(g).length > 0, `${g.name} has no Use`);
});

test("an everyday weapon becomes an entry in WoDX Combat's attack list", () => {
  const e = A.weaponEntry({id: "x", ...on("a kitchen cleaver (2)")});
  assert.equal(e.dmgAttr, "strength"); assert.equal(e.dmgBonus, 2); assert.equal(e.type, "lethal"); assert.equal(e.ranged, false); assert.equal(e.equipped, true);
  const s = A.weaponEntry({id: "y", name: "a can of pepper spray", type: "Item", system: {}});
  assert.equal(s.special, "blind"); assert.equal(s.ranged, true);
  assert.equal(A.weaponEntry({id: "z", name: "a kitchen cleaver", type: "Melee Weapon", system: {}}), null);
  assert.equal(A.weaponEntry({id: "z", name: "a loaf of bread", type: "Item", system: {}}), null);
  assert.ok(A.weaponEntry({id: "g", ...on("a hand grenade")}).spent);
});

test("fittings fit only their own kind of weapon, and only when on", () => {
  const items = [on("a laser sight"), on("a silencer"), on("a rifle scope"), {name: "a weapon-mounted flashlight", system: {isequipped: false}}, on("bowstring wax")];
  const pistol = A.fitFor(items, {name: "Colt revolver", ranged: true, ability: "firearms"});
  assert.equal(pistol.diff, -1); assert.equal(pistol.silenced, true); assert.equal(pistol.far, 0); assert.equal(pistol.light, false); assert.equal(pistol.wax, false);
  const rifle = A.fitFor(items, {name: "Hunting rifle", ranged: true, ability: "firearms"});
  assert.equal(rifle.far, 2);
  const bow = A.fitFor(items, {name: "Longbow", ranged: true, ability: "archery"});
  assert.equal(bow.diff, 0); assert.equal(bow.wax, true);
  assert.equal(A.fitFor(items, {name: "Sword", ranged: false, ability: "melee"}).names.length, 0);
  assert.ok(A.fitFor([on("a crossbow cranequin")], {name: "Heavy crossbow", ranged: true, ability: "archery"}).noMinStr);
});

test("a worn holster or scabbard gives initiative only with its weapon carried; a mask keeps out spray", () => {
  const items = [on("a shoulder holster"), on("a sword belt and scabbard")];
  assert.equal(A.atHand(items, [{name: "Colt revolver", ranged: true, ability: "firearms", equipped: true}]).init, 1);
  assert.equal(A.atHand(items, [{name: "Hunting rifle", ranged: true, ability: "firearms", equipped: true}]).init, 0);
  assert.equal(A.atHand(items, [{name: "Broadsword", ranged: false, ability: "melee", equipped: true}]).init, 1);
  assert.equal(A.coveredBy([on("a gas mask")], "eyes"), "a gas mask");
  assert.equal(A.coveredBy([{name: "a gas mask", system: {isequipped: false}}], "eyes"), null);
});

test("traps are set, seen, sprung and disarmed", () => {
  const bear = A.trapOf("a bear trap");
  assert.deepEqual(A.setResult(bear, {successes: 0}).set, false);
  assert.ok(A.setResult(bear, {botch: true}).springs);
  assert.equal(A.setResult(bear, {successes: 3}).diff, 9);
  assert.equal(A.findDiff(A.trapOf("a caltrop"), 1), 6);
  const sprung = A.springResult(bear, {noticed: false});
  assert.equal(sprung.dice, 5); assert.equal(sprung.hold, "immobilized"); assert.ok(sprung.caught);
  assert.equal(A.springResult(bear, {noticed: true}).caught, false);
  assert.ok(A.springResult(A.trapOf("a motion alarm")).alarm);
  assert.ok(A.disarmResult({successes: 1}).safe); assert.ok(A.disarmResult({botch: true}).springs);
  assert.deepEqual(A.countSuccesses([10, 7, 1, 3], 6), {successes: 1, botch: false});
  assert.deepEqual(A.countSuccesses([1, 3], 6), {successes: 0, botch: true});
  const g = G.GOODS.find(x => x.name === "a bear trap");
  assert.deepEqual(U.abilitiesOf(g).sort(), ["disarm", "settrap", "springtrap"]);
});
