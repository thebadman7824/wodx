import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Ways of moving (WoDX Combat 3.12.0, Actions 3.40.0): flying, swimming and drowning, climbing, crawling, jumping,
   through walls, Earth Meld, falls when flight ends, height in range and reach */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const MV = await import(pathToFileURL(join(root, "modules/wodx-combat/scripts/movement-rules.js")));
const CK = await import(pathToFileURL(join(root, "modules/wodx-actions/scripts/checks-rules.js")));
const AR = await import(pathToFileURL(join(root, "modules/wodx-actions/scripts/rules.js")));

test("Rise and wing and bat forms give flight; leaps, wall walks and the Coward's Flight do not", () => {
  assert.equal(MV.abilities([{name: "Risen", key: "wodx-effect-rise"}]).fly, true);
  assert.equal(MV.abilities([{name: "Shaped", description: "takes the shape of a bat for a scene"}]).fly, true);
  assert.equal(MV.abilities([{name: "Phantom Wings"}]).fly, true);
  assert.equal(MV.abilities([{name: "Chiropteran Marauder"}]).fly, true);
  assert.equal(MV.abilities([{name: "Halt the Coward's Flight: Hasten"}]).fly, false);
  assert.equal(MV.abilities([{name: "Soul's Flight"}]).fly, false);
  const leap = MV.abilities([{name: "Hare's Leap", key: "wodx-effect-rise"}]);
  assert.equal(leap.fly, false); assert.equal(leap.leap, true);
  const wall = MV.abilities([{name: "Surface Attunement", key: "wodx-effect-rise"}]);
  assert.equal(wall.fly, false); assert.equal(wall.wallwalk, true); assert.equal(wall.waterwalk, true);
  assert.equal(MV.abilities([], {fly: true}).fly, true, "the Storyteller's flag for a creature that always flies");
  assert.equal(MV.abilities([{name: "Tenebrous Form"}]).phase, true);
  assert.equal(MV.abilities([{name: "Earth Meld"}]).meld, true);
  assert.equal(MV.abilities([{name: "Salmon Swim"}]).swimfast, true);
});

test("who may choose each way of moving", () => {
  assert.equal(MV.canUse("fly", {}).ok, false);
  assert.equal(MV.canUse("fly", {fly: true}).ok, true);
  assert.equal(MV.canUse("fly", {}, {gm: true}).ok, true);
  assert.equal(MV.canUse("phase", {}).ok, false);
  assert.equal(MV.canUse("burrow", {meld: true}).ok, true);
  assert.equal(MV.canUse("swim", {}, {athletics: 0}).ok, true);
  assert.match(MV.canUse("swim", {}, {athletics: 0}).why, /sinks/);
  assert.equal(MV.canUse("climb", {}).ok, true);
  assert.equal(MV.modeOf("nonsense"), "walk");
});

test("speeds for each way of moving", () => {
  const base = {walk: 7, jog: 15, run: 29};
  assert.equal(MV.speedFor("fly", base, {fly: true}), 15, "M20 pdf 402: 10 to 20 yards");
  assert.equal(MV.speedFor("fly", base, {fly: true, flySpeed: 50}), 50);
  const bat = MV.abilities([{name: "Shape of the Beast", description: "takes the shape of a bat"}]);
  assert.equal(MV.speedFor("fly", base, bat), 29, "20 mph (V20 pdf 208)");
  assert.equal(MV.speedFor("fly", base, MV.abilities([{name: "Wings of Pegasus"}])), 73, "50 mph (W20 pdf 176)");
  assert.equal(MV.speedFor("fly", base, MV.abilities([{name: "Chiropteran Marauder"}])), 37, "25 mph (V20 pdf 250)");
  assert.equal(MV.speedFor("fly", base, MV.abilities([{name: "Phantom Wings"}])), 15, "up to the jog (Wraith 20th pdf 217)");
  assert.equal(MV.abilities([{name: "Wings of Rage"}]).fly, false, "Athletics and running, not flight (Wraith 20th pdf 266)");
  assert.equal(MV.speedFor("swim", base, {}, {athletics: 2}), 15, "12 + Dexterity (M20 pdf 402)");
  assert.equal(MV.speedFor("swim", base, {}, {athletics: 0}), 1);
  assert.equal(MV.speedFor("swim", base, {swimfast: true}), 29);
  assert.equal(MV.speedFor("climb", base, {}), 3);
  assert.equal(MV.speedFor("climb", base, {wallwalk: true}), 7);
  assert.equal(MV.speedFor("crawl", base, {}), 3);
  assert.equal(MV.speedFor("jump", base, {}, {jumpYards: 4}), 4);
  assert.equal(MV.speedFor("jump", base, {leap: true}, {jumpYards: 4}), 8);
  assert.equal(MV.speedFor("burrow", base, {meld: true}), 0, "Earth Meld does not travel");
  assert.equal(MV.speedFor("phase", base, {phase: true}), 7);
  assert.equal(MV.speedFor("fly", {walk: 0, jog: 0, run: 0}, {fly: true}), 0, "the incapacitated do not fly");
});

test("height: feet, ground, falls when flight ends, range with height", () => {
  assert.equal(MV.toFeet(10, "ft"), 10);
  assert.equal(MV.toFeet(10, "m"), 30);
  assert.equal(MV.groundOf([]), 0);
  assert.equal(MV.groundOf([20, 5, -Infinity]), 20);
  assert.deepEqual(MV.fallOnLanding(30, 0, {}), {falls: true, feet: 30});
  assert.deepEqual(MV.fallOnLanding(30, 0, {fly: true}), {falls: false, feet: 0}, "still flying by another power");
  assert.deepEqual(MV.fallOnLanding(0, 0, {}), {falls: false, feet: 0});
  assert.equal(MV.withHeight(30, 40), 50);
  assert.equal(MV.withHeight(null, 5), null);
  // the same falling chart as WoDX Actions
  for ( const ft of [5, 10, 40, 99, 100, 250] ) assert.deepEqual(MV.fallingDamage(ft), AR.fallingDamage(ft));
});

test("water: region names, breath and drowning", () => {
  assert.equal(MV.waterOf("WoDX: Deep water"), "deep");
  assert.equal(MV.waterOf("The river Svratka"), "deep");
  assert.equal(MV.waterOf("Shallow ford"), "shallow");
  assert.equal(MV.waterOf("Market square"), null);
  assert.equal(MV.waterOf("Market square", "deep"), "deep");
  assert.equal(MV.waterOf("Old well", "none"), null);
  assert.equal(MV.breathes("kindred"), false);
  assert.equal(MV.breathes("wraith"), false);
  assert.equal(MV.breathes("mortal"), true);
  assert.equal(MV.breathes("lupine"), true);
  assert.equal(MV.breathes("mortal", "Kuei-jin"), false);
  assert.equal(MV.breathTurns(1), 10, "30 seconds (W20 pdf 261)");
  assert.equal(MV.breathTurns(2), 20, "a minute");
  assert.equal(MV.breathTurns(5), 160, "8 minutes");
  assert.equal(MV.breathTurns(10), 1200, "an hour (M20 pdf 442)");
  assert.equal(MV.breathTurns(2, {exerting: true}), 4, "2 x Stamina turns in a fight");
  assert.equal(MV.breathTurns(2, {exerting: true, willpower: 1}), 5);
  assert.equal(MV.drownType("mortal"), "lethal");
  assert.equal(MV.drownType("fae"), "bashing", "C20 pdf 294");
  assert.equal(MV.underWater({athletics: 2}), false);
  assert.equal(MV.underWater({athletics: 0}), true);
  assert.equal(MV.underWater({athletics: 2, dived: true}), true);
  assert.equal(MV.underWater({athletics: 0, ab: {waterwalk: true}}), false);
  let st = {breath: 2, max: 10};
  st = MV.waterTurn(st, {under: true}); assert.equal(st.breath, 1); assert.equal(st.damage, 0);
  st = MV.waterTurn(st, {under: true}); assert.equal(st.breath, 0); assert.equal(st.damage, 1); assert.equal(st.drowning, true);
  st = MV.waterTurn(st, {under: true}); assert.equal(st.damage, 1, "one lethal level every turn after");
  st = MV.waterTurn(st, {under: false}); assert.equal(st.breath, 10, "air fills the breath again");
  assert.equal(MV.waterTurn({breath: 0, max: 10}, {under: true, breathes: false}).damage, 0, "the dead do not drown");
  assert.equal(MV.waterTurn({breath: 0, max: 10}, {under: true, waterbreath: true}).damage, 0);
});

test("Jumping reach: 3 feet across or 2 feet up a success (V20 pdf 268)", () => {
  assert.deepEqual(CK.jumpReach(0), {yards: 0, upFeet: 0});
  assert.deepEqual(CK.jumpReach(3), {yards: 3, upFeet: 6});
  assert.deepEqual(CK.jumpReach(6), {yards: 6, upFeet: 12});
});

test("the Foundry side is wired in", () => {
  const main = src("modules/wodx-combat/scripts/main.js"), mv = src("modules/wodx-combat/scripts/movement.js");
  assert.match(main, /import \* as MVJ from "\.\/movement\.js"/);
  assert.match(main, /MVJ\.setupMovement\(/);
  assert.match(main, /MVJ\.moveCheck\(doc, changes, lim\)/);
  assert.match(main, /withHeightOf\(canvas\.grid\.measurePath/);
  assert.match(mv, /"movementModes"/);
  assert.match(mv, /Hooks\.on\("deleteActiveEffect"/);
  assert.match(mv, /options\?\.wodxUndo/, "an Undo of Rise is not a fall");
  assert.match(src("modules/wodx-actions/scripts/effects.js"), /delete\?\.\(\{wodxUndo: true\}\)/);
  assert.match(src("modules/wodx-actions/scripts/main.js"), /hazard\(\{ actor: a, kind = "sun", feet = 30 \}/);
  assert.match(src("modules/wodx-actions/scripts/main.js"), /setFlag\("wodx-combat", "jump"/);
  assert.match(src("modules/wodx-combat/scripts/profiles.js"), /export function variantText/);
});

test("stances from how a character moves", () => {
  assert.equal(MV.stanceOf({mode: "crawl"}), "prone");
  assert.equal(MV.stanceOf({knockedDown: true}), "prone");
  assert.equal(MV.stanceOf({mode: "fly", aloft: true, ab: {fly: true}}), "flying");
  assert.equal(MV.stanceOf({mode: "walk", aloft: true, ab: {}}), "climbing", "up off the ground with no flight");
  assert.equal(MV.stanceOf({water: "deep"}), "swimming");
  assert.equal(MV.stanceOf({water: "deep", under: true}), "under");
  assert.equal(MV.stanceOf({water: "deep", ab: {waterwalk: true}}), "standing");
  assert.equal(MV.stanceOf({water: "shallow"}), "wading");
  assert.equal(MV.stanceOf({ab: {meld: true}}), "melded");
  assert.equal(MV.stanceOf({mode: "phase"}), "phasing");
  assert.equal(MV.stanceOf({jumped: true}), "jumped");
  assert.equal(MV.stanceOf({}), "standing");
});

test("each stance changes rolls, not only speed", () => {
  const bat = MV.abilities([{name: "Shape of the Beast", description: "takes the shape of a bat"}]);
  for ( const [k, s] of Object.entries(MV.STANCES) ) if ( k !== "standing" ) {
    assert.ok(Object.keys(s.own).length || Object.keys(s.vs).length || s.cannot, `${k} changes something`);
    assert.ok(s.note, `${k} says why`);
  }
  // Ben's example: prone helps Stealth, and makes the prone one harder to notice
  assert.equal(MV.rollStance("prone", ["stealth"]).diff, -2);
  assert.equal(MV.spotStance("prone"), 1);
  assert.equal(MV.rollStance("flying", ["perception"]).diff, -1);
  assert.equal(MV.rollStance("under", ["perception", "stealth"]).diff, 0, "+2 sight, -2 Stealth");
  assert.equal(MV.rollStance("standing", ["stealth"]).diff, 0);
  // Attacks
  assert.equal(MV.attackStance("standing", "prone", {close: true}).diff, -2);
  assert.equal(MV.attackStance("standing", "prone", {close: false}).diff, 1, "light cover (V20 pdf 286)");
  assert.equal(MV.attackStance("prone", "standing", {close: false}).diff, 0, "no change to fire from prone");
  assert.equal(MV.attackStance("standing", "flying", {close: false, targetFly: bat.flyBook}).diff, 2, "a bat is +2 to hit (V20 pdf 208)");
  assert.equal(MV.attackStance("flying", "standing", {close: true, attackerFly: MV.abilities([{name: "Spirit of the Bird"}]).flyBook}).diff, 1, "W20 pdf 200");
  assert.equal(MV.attackStance("standing", "flying", {close: false}).diff, 1);
  assert.equal(MV.attackStance("flying", "flying", {close: true, sameStance: true}).diff, 0, "two fliers meet on even terms");
  assert.equal(MV.attackStance("swimming", "standing", {close: true}).diff, 2);
  assert.equal(MV.attackStance("climbing", "standing", {close: true}).diff, 2);
  assert.equal(MV.attackStance("standing", "climbing", {close: true}).diff, -1);
  assert.equal(MV.attackStance("standing", "standing", {close: true, higher: true}).diff, -1, "higher ground");
  assert.match(MV.attackStance("standing", "melded").blocked, /earth/);
  assert.ok(MV.attackStance("phasing", "standing").blocked);
  assert.ok(MV.attackStance("under", "standing", {close: false}).notes.some(n => /firearms/.test(n)));
  assert.equal(MV.attackStance("jumped", "standing", {close: true}).diff, -1);
});

test("stance changes reach combat, dodges and plain checks", () => {
  const main = src("modules/wodx-combat/scripts/main.js"), act = src("modules/wodx-actions/scripts/main.js");
  assert.match(main, /MVJ\.attackMods\(attacker, target/);
  assert.match(main, /function defenseDiffOf\(target\)/);
  assert.equal((main.match(/defenseDiffOf\(target\)/g) ?? []).length, 3);
  assert.match(act, /movement\?\.rollMods\?\.\(actor, kinds\)/);
  assert.match(act, /movement\?\.spotMod\?\.\(actor\)/);
  assert.doesNotMatch(act, /tm\.diff = /, "the shared empty trait result is never changed in place");
});
