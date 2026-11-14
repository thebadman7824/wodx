import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Fighting from the saddle after the books (WoDX Combat, B4770-B4776): the mount's Attributes and dodge, keeping the
   saddle, the lance, the bow from a moving horse. Pure rules, plus the wiring read from the source. */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const MT = await import(pathToFileURL(join(root, "modules/wodx-combat/scripts/mounted-rules.js")));
const C = await import(pathToFileURL(join(root, "modules/wodx-interactables/scripts/chase-rules.mjs")));

const horse = (role = "reins", ground = "road") => ({...C.rideInFight("horse", 1197, ground), kind: "horse", role});
const mule = {...C.rideInFight("mule", 1197, "road"), kind: "mule", role: "reins"};
const bike = {...C.rideInFight("motorbike", 1990, "road"), kind: "motorbike", role: "reins"};

test("the mounts that fight: a horse and a mule in the saddle, never a cart or a motorcycle's Attributes", () => {
  assert.ok(MT.inSaddle(horse()) && MT.inSaddle(mule));
  assert.equal(MT.inSaddle(horse("passenger")), false, "behind the rider is not at the reins");
  assert.ok(MT.onBeast(horse("passenger")));
  assert.equal(MT.inSaddle(bike), false);
  assert.ok(MT.astride(bike), "a motorcycle can still throw its rider");
  assert.equal(MT.astride({...C.rideInFight("cart", 1197, "road"), kind: "cart", role: "reins"}), false);
  assert.equal(MT.traitsOf(horse()).strength, 6, "a riding horse is the book's large horse");
  assert.equal(MT.traitsOf(mule).strength, 4, "a mule takes the small horse");
});

test("a blow from the saddle uses the mount's Strength or Dexterity when higher, never its Stamina or on a shot", () => {
  const s = MT.strikeAttr(horse(), "strength", 2);
  assert.deepEqual([s.value, s.mount], [6, true]);
  assert.match(s.note, /V20 Dark Ages p\. 399/);
  assert.equal(MT.strikeAttr(horse(), "strength", 7).value, 7, "a stronger rider keeps their own");
  assert.equal(MT.strikeAttr(horse(), "dexterity", 3).value, 3, "the horse's Dexterity 2 is lower");
  assert.equal(MT.strikeAttr(horse(), "stamina", 1).value, 1);
  assert.equal(MT.strikeAttr(horse(), "strength", 2, {close: false}).value, 2);
  assert.equal(MT.strikeAttr(horse("passenger"), "strength", 2).value, 2);
  assert.equal(MT.strikeAttr(null, "strength", 2).value, 2);
});

test("the mount dodges once a turn for free, with Athletics held to the rider's Ride", () => {
  const d = MT.mountDodge(horse(), {rideDots: 3});
  assert.deepEqual([d.valid, d.dice, d.diff], [true, 5, 6], "Dexterity 2 + Athletics 3");
  assert.equal(MT.mountDodge(horse(), {rideDots: 1}).dice, 3, "held to Ride 1");
  assert.equal(MT.mountDodge(horse(), {rideDots: 3, ranged: true}).diff, 8, "shots +2");
  assert.equal(MT.mountDodge(horse(), {rideDots: 3, used: true}).valid, false);
  assert.equal(MT.mountDodge(bike, {rideDots: 3}).valid, false);
  assert.ok(MT.preferMount(2, 2.5), "free, so it goes first when nearly as good");
  assert.equal(MT.preferMount(1, 2.2), false, "the rider's own is clearly better");
  assert.equal(MT.preferMount(0, 0), false);
});

test("keeping the saddle: difficulty from the damage successes, a fall by the ground, lethal on a botch", () => {
  assert.equal(MT.saddleDiff(1), 3);
  assert.equal(MT.saddleDiff(5), 5);
  assert.equal(MT.saddleDiff(14), 10);
  assert.deepEqual(MT.saddleResult({successes: 1}), {kept: true, thrown: false, lethal: false, note: "stays in the saddle"});
  assert.equal(MT.saddleResult({successes: 0}).thrown, true);
  assert.equal(MT.saddleResult({successes: 0, botch: true}).lethal, true);
  assert.equal(MT.fallDice("open"), 2);
  assert.equal(MT.fallDice("streets"), 3);
  assert.equal(MT.fallDice("rough"), 4);
  assert.equal(MT.fallDice("water"), 0);
  for ( const g of Object.keys(C.GROUNDS) ) assert.ok(Number.isInteger(MT.FALL_DICE[g]), `every chase ground has a fall: ${g}`);
});

test("the lance: Ride 3 and Melee 3, the jolt, the botch and the charge that unhorses", () => {
  assert.ok(MT.isLance({name: "Lance"}) && MT.isLance({name: "Jousting lance"}));
  assert.equal(MT.isLance({name: "Fire lance", ranged: true}), false);
  assert.equal(MT.isLance({name: "Fire-lance"}), false);
  assert.equal(MT.isLance({name: "Freelance knife"}), false);
  const good = MT.lanceBlow({rideDots: 3, meleeDots: 3, hit: true, damageSuccesses: 4});
  assert.deepEqual([good.skilled, good.backfire, good.knock], [true, 0, false]);
  const raw = MT.lanceBlow({rideDots: 2, meleeDots: 4, hit: true, damageSuccesses: 4});
  assert.deepEqual([raw.skilled, raw.backfire], [false, 4]);
  const charge = MT.lanceBlow({rideDots: 3, meleeDots: 3, hit: true, charge: 3, damageSuccesses: 2});
  assert.equal(charge.knock, true);
  const miss = MT.lanceBlow({rideDots: 0, meleeDots: 0, hit: false, charge: 3});
  assert.deepEqual([miss.backfire, miss.knock], [0, false]);
  const botch = MT.lanceBlow({botch: true});
  assert.deepEqual([botch.botchDice, botch.botchSaddleDiff], [4, 6]);
});

test("a bow from a moving horse: +2, +4 at a trot, none with the specialty, the saddle's +1 replaced", () => {
  const h = horse("reins", "road"); // 50 yards a turn
  assert.equal(MT.mountedShot(h, {bow: true, yards: 0}).diff, 0, "a still horse keeps the saddle's +1 alone");
  assert.equal(MT.mountedShot(h, {bow: true, yards: 10}).diff, 1, "+2 in place of +1");
  assert.equal(MT.mountedShot(h, {bow: true, yards: 25}).diff, 3, "+4 in place of +1");
  assert.equal(MT.mountedShot(h, {bow: true, yards: 25, close: true}).diff, 4, "point blank: the saddle's +1 was not counted");
  assert.equal(MT.mountedShot(h, {bow: true, yards: 25, specialty: true}).diff, -1, "the specialty takes the saddle's +1 too");
  assert.match(MT.mountedShot(h, {bow: true, yards: 25}).note, /Dark Ages: Vampire p\. 244/);
  assert.equal(MT.mountedShot(h, {bow: false, yards: 25}).diff, 0, "guns keep the saddle's +1");
  assert.equal(MT.mountedShot(bike, {bow: true, yards: 25}).diff, 0);
  assert.ok(MT.mountedSpecialty("Mounted") && MT.mountedSpecialty("From horseback") && !MT.mountedSpecialty("Longbow"));
});

test("the wiring: the attack pool, damage, defense, the saddle after the blow, the setting and the api", () => {
  const main = src("modules/wodx-combat/scripts/main.js"), glue = src("modules/wodx-combat/scripts/mounted.js");
  assert.match(main, /import \* as MTD from "\.\/mounted\.js"/);
  assert.match(main, /MTD\.strikeAttrOf\(attacker, attrKey/, "the attack's Attribute");
  assert.match(main, /MTD\.strikeAttrOf\(attacker, w\.dmgAttr/, "the damage's Strength");
  assert.match(main, /MTD\.mountedShotOf\(attacker/);
  assert.match(main, /num\(fd\.mountShotDiff\)/);
  assert.match(main, /planDefense\(target, "mount"/);
  assert.match(main, /option value="mount"/);
  assert.match(main, /mountDodge: !!\(def && !def\.invalid && def\.type === "mount"\)/);
  assert.match(main, /defended: !!\(def && !def\.invalid && def\.type !== "mount"\)/, "the mount's dodge is not the rider's defense");
  assert.match(main, /await MTD\.afterBlow\(/);
  assert.match(main, /await saddle\.apply\(\)/);
  assert.match(main, /MTD\.setupMounted\(/);
  assert.match(main, /mounted, aftermath/);
  assert.match(glue, /"mountedCombat"/);
  assert.match(glue, /createScrollingText/, "a thrown rider shows on the map");
  assert.match(glue, /condition: "knockdown"/, "and lies knocked down");
  assert.match(glue, /\[`flags\.\$\{IX\}\.riders`\]/, "off the mount's seats");
  assert.match(glue, /wodxMove: false/, "the fall is not counted as the rider's own move");
});
