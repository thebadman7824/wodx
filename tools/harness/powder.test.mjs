import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* Black powder (WoDX Combat 3.24.0, B2712 to B2714): old locks misfire, wet powder will not fire, a match goes out */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PW = await import(join(root, "modules/wodx-combat/scripts/powder-rules.js"));
const gun = (name, year, desc = "") => PW.gunLock({name, ranged: true, desc}, year);
const rain = PW.wetness({tags: ["rain"]}), storm = PW.wetness({tags: ["rain", "downpour"]}), dry = PW.wetness({tags: []});

test("the lock comes from the name, or from the year when the name gives none", () => {
  assert.equal(gun("Matchlock arquebus", 1600).lock, "matchlock");
  assert.equal(gun("Hand cannon", 1420).lock, "handgonne");
  assert.equal(gun("Brown Bess", 1780).lock, "flintlock");
  assert.equal(gun("Colt Navy revolver", 1855).lock, "percussion");
  assert.equal(gun("Glock 17", 1995).lock, "cartridge");
  // A plain musket or pistol takes the lock most guns had that year
  assert.equal(gun("Musket", 1630).lock, "matchlock");
  assert.equal(gun("Musket", 1750).lock, "flintlock");
  assert.equal(gun("Pistol", 1560).lock, "wheellock");
  assert.equal(gun("Rifle", 1915).lock, "cartridge");
  assert.equal(gun("Musket", 1630).named, false);
  // The description can name the lock
  assert.equal(gun("Old family gun", 1990, "A flintlock fowling piece").lock, "flintlock");
});

test("bows, crossbows, thrown weapons and blades are not guns", () => {
  for ( const n of ["Longbow", "Crossbow", "Sling", "Throwing knife", "Javelin"] ) assert.equal(gun(n, 1600), null, n);
  assert.equal(PW.gunLock({name: "Musket", ranged: false}, 1600), null);
});

test("the wet: rain, heavy rain, water, and nothing indoors", () => {
  assert.deepEqual([rain.wet, rain.heavy], [true, false]);
  assert.deepEqual([storm.wet, storm.heavy], [true, true]);
  assert.equal(PW.wetness({tags: ["rain"], sky: "storm"}).heavy, true);
  assert.equal(PW.wetness({tags: ["rain"], intensity: "heavy"}).heavy, true);
  assert.equal(PW.wetness({tags: ["rain", "downpour"], indoor: true}).wet, false);
  assert.equal(PW.wetness({water: true}).why, "standing in water");
  assert.equal(PW.wetness({tags: ["snow", "cold"]}).wet, false);
});

test("in the rain any 1 misfires a black-powder gun; dry, only a botch does", () => {
  const fl = gun("Flintlock pistol", 1750);
  assert.equal(PW.misfire(fl, [1, 8, 9], false, rain).misfire, true);
  assert.match(PW.misfire(fl, [1, 8, 9], false, rain).why, /^rain: a 1 on the dice and the damp flintlock misfires$/);
  assert.equal(PW.misfire(fl, [1, 8, 9], false, dry).misfire, false);
  assert.equal(PW.misfire(fl, [8, 9], false, rain).misfire, false);
  assert.equal(PW.misfire(fl, [1, 2], true, dry).misfire, true);
  // Covered powder counts as dry
  assert.equal(PW.misfire(fl, [1, 8], false, rain, {covered: true}).misfire, false);
});

test("percussion caps and cartridges ignore the rain and keep the plain botch rule", () => {
  for ( const g of [gun("Colt Navy revolver", 1855), gun("Glock 17", 1995)] ) {
    assert.equal(PW.misfire(g, [1, 1, 1], false, storm).misfire, false);
    assert.equal(PW.misfire(g, [1, 2], true, storm).misfire, false);
    assert.equal(PW.canFire(g, {wet: true}, storm).ok, true);
    assert.equal(PW.powderNote(g, storm), "");
  }
});

test("heavy rain puts out a match and a misfire there wets the powder", () => {
  const ml = gun("Matchlock musket", 1620), fl = gun("Flintlock musket", 1760);
  assert.equal(PW.canFire(ml, {}, storm).ok, false);
  assert.match(PW.canFire(ml, {}, storm).why, /match of the matchlock is out in the heavy rain/);
  assert.equal(PW.canFire(ml, {}, storm, {covered: true}).ok, true);
  assert.equal(PW.canFire(fl, {}, storm).ok, true);
  const m = PW.misfire(fl, [1, 9], false, storm);
  assert.equal(m.wetPowder, true);
  assert.equal(PW.canFire(fl, {wet: true}, dry).ok, false);
  assert.match(PW.canFire(fl, {wet: true}, dry).why, /powder in the flintlock is wet: clean it and load dry powder/);
  assert.equal(PW.canFire(ml, {matchOut: true}, dry).ok, false);
});

test("the window note gives the chance of a misfire in the wet", () => {
  const fl = gun("Flintlock", 1760);
  assert.equal(Math.round(PW.misfireChance(5) * 100), 41);
  assert.match(PW.powderNote(fl, rain, {}, 5), /misfires on any 1 \(about 41% with 5 dice\)/);
  assert.match(PW.powderNote(fl, rain, {}), /misfires on any 1\. Covered powder counts as dry\.$/);
  assert.equal(PW.powderNote(fl, dry), "Black powder: the flintlock misfires on a botch.");
});

test("Combat reads the powder before the shot and after the roll, and reloading dries the powder", () => {
  const s = readFileSync(join(root, "modules/wodx-combat/scripts/main.js"), "utf8");
  assert.match(s, /PW\.canFire\(gun, powderState\(attacker, w\), wet/);
  assert.match(s, /PW\.misfire\(gun, atk\.faces, atk\.botch, wet/);
  assert.match(s, /The wet powder is drawn and dry powder loaded/);
  assert.match(s, /s\("blackPowder"/);
  assert.match(s, /name: "WoDX: Light the match"/);
});
