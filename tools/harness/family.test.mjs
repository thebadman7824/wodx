import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

// Family systems: pregnancy and birth, with supernatural story hooks (B3220-B3222).
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const imp = p => import(pathToFileURL(join(root, p)));
const F = await imp("modules/wodx-npc/scripts/family-rules.mjs");
const H = await imp("modules/wodx-npc/scripts/hearts-rules.mjs");
const XH = await imp("modules/wodx-sheets/scripts/extras-html.mjs");

test("a pregnancy is due about nine months on the clock", () => {
  assert.equal(F.dueAt(0), Math.round(9 * F.MONTH_SECONDS));
  const days = F.dueAt(1000) / 86400;
  assert.ok(days > 273 && days < 275);
});

test("the birth roll gets easier with the centuries and with who attends", () => {
  assert.equal(F.birthDifficulty(1300, "midwife"), 8);
  assert.equal(F.birthDifficulty(1300, "none"), 9);
  assert.equal(F.birthDifficulty(1300, "physician"), 8, "no physician's help before 1700");
  assert.equal(F.birthDifficulty(1800, "physician"), 6);
  assert.equal(F.birthDifficulty(1900), 5, "a physician by default");
  assert.equal(F.birthDifficulty(1960), 4, "a hospital");
  assert.equal(F.birthDifficulty(1890, "hospital"), 6, "no hospital before 1930");
  assert.equal(F.birthDifficulty(2000), 4);
  assert.equal(F.careFor(1400), "midwife"); assert.equal(F.careFor(1900), "physician"); assert.equal(F.careFor(1990), "hospital");
  assert.equal(F.birthPool(2, "midwife"), 5);
});

test("the dice count the V20 way, and the outcome follows", () => {
  assert.deepEqual(F.countDice([8, 9, 1, 3], 6), {successes: 1, botch: false});
  assert.deepEqual(F.countDice([1, 3, 2], 6), {successes: 0, botch: true});
  assert.deepEqual(F.countDice([3, 2], 6), {successes: 0, botch: false});
  assert.equal(F.birthOutcome({successes: 2}), "well");
  assert.equal(F.birthOutcome({successes: 0}), "hard");
  assert.equal(F.birthOutcome({botch: true}), "loss");
});

test("rest after a birth follows the custom of the time and the way of life", () => {
  assert.match(F.lyingIn(1400, "latin").label, /churching/);
  assert.equal(F.lyingIn(1400, "islamic").weeks, 6);
  assert.match(F.lyingIn(1700, "sinic").label, /sitting the month/);
  assert.equal(F.lyingIn(1990, "sinic").label, "parental leave");
  for ( const s of Object.keys(H.SPHERE_ADOPTION) ) assert.ok(F.lyingIn(1500, s).weeks > 0, s);
});

test("seasons, the one who carries, and the sheet's plain line", () => {
  assert.equal(F.seasonOf(4), "spring"); assert.equal(F.seasonOf(12), "winter"); assert.equal(F.seasonOf(4, true), "autumn");
  assert.equal(F.carrierIndex(["m", "f"]), 1); assert.equal(F.carrierIndex(["f", "m"]), 0);
  assert.equal(F.carrierIndex(["f", "f"]), -1); assert.equal(F.carrierIndex(["", ""]), -1);
  assert.equal(F.expectingLine("spring", 1350), "Expecting, due in spring 1350.");
});

test("supernatural pregnancies are story hooks only, never rules", () => {
  assert.equal(F.storyHooks(["mortal", "mortal"], {kind: "mortal"}).length, 0);
  assert.deepEqual(F.storyHooks(["werewolf", "werewolf"], H.childOf(["werewolf", "werewolf"])), [F.STORY_HOOKS.metis]);
  assert.ok(F.storyHooks(["werewolf", "mortal"], H.childOf(["werewolf", "mortal"], 0.5)).includes(F.STORY_HOOKS.werewolf));
  assert.ok(F.storyHooks(["ghoul", "mage"], {}).length === 2);
  for ( const t of Object.values(F.STORY_HOOKS) ) assert.doesNotMatch(t, /sex|naked|body of/i);
});

test("family is wired: the age floor, the approval, the clock, the hooks and the sheet", () => {
  const f = src("modules/wodx-npc/scripts/family.mjs");
  assert.match(f, /age\?\.romance\?\.\(a, b\)/, "both parents must be adults");
  assert.match(f, /registerApprovalHandler\?\.\(ASK_CHILD/);
  assert.match(f, /Hooks\.on\("updateWorldTime"/);
  assert.match(f, /Hooks\.callAll\("wodxExpecting"/); assert.match(f, /Hooks\.callAll\("wodxBirth"/);
  const hooks = src("docs/HOOKS.md");
  assert.match(hooks, /\| wodxExpecting \| npc \|/); assert.match(hooks, /\| wodxBirth \| npc \|/);
  assert.match(src("modules/wodx-npc/scripts/main.mjs"), /family: \{conceive: FAMILY\.conceive/);
  const html = XH.relationsHtml([{kind: "spouse", label: "Spouse", groupLabel: "Family", name: "A", uuid: "Actor.a", hand: "Actor.a"},
    {kind: "friend", label: "Friend", groupLabel: "Friends", name: "B", uuid: "Actor.b", hand: "Actor.b"}], {couples: true, family: ["Expecting, due in spring 1350."]});
  assert.equal((html.match(/data-act="tie-child"/g) ?? []).length, 1, "only the couple's tie");
  assert.match(html, /Family news/);
  assert.doesNotMatch(XH.relationsHtml([], {}), /Family news/);
});

// Child sheets, growing up, schooling and players as children (B3223-B3228).
const WR = await imp("modules/wodx-chronicle/scripts/world-rules.mjs");
const LP = await imp("modules/wodx-creation/scripts/lifepath-rules.mjs");

test("a child's sheet is held to caps by age and filled toward the age's dots", () => {
  assert.equal(F.attrCap(5), 1); assert.equal(F.attrCap(9), 2); assert.equal(F.attrCap(15), 3);
  assert.equal(F.abilityCap(9), 1); assert.equal(F.abilityCap(12), 2); assert.equal(F.abilityCap(16), 3);
  const ones = Object.fromEntries(F.ATTRIBUTES.map(k => [k, {value: 1, bonus: 0}]));
  const up = F.fitToAge(ones, {brawl: {value: 3}, alertness: {value: 1}}, 8, "s");
  const raised = Object.keys(up).filter(k => /attributes\.\w+\.value/.test(k));
  assert.equal(raised.length, 3, "three dots at 8");
  assert.ok(raised.every(k => up[k] === 2));
  assert.equal(up["system.abilities.brawl.value"], 1); assert.ok(!("system.abilities.alertness.value" in up));
  assert.deepEqual(F.fitToAge(ones, {brawl: {value: 3}, alertness: {value: 1}}, 8, "s"), up, "seeded: the same each time");
  const grown = F.fitToAge(ones, {}, 18, "s");
  assert.equal(Object.keys(grown).filter(k => /attributes\.\w+\.value/.test(k)).reduce((s, k) => s + grown[k] - 1, 0), 15);
  const big = {...ones, strength: {value: 4, bonus: 1}};
  assert.equal(F.fitToAge(big, {}, 9, "s")["system.attributes.strength.total"], 3, "held to the cap, the bonus kept");
  assert.deepEqual(F.bandsCrossed(5, 14), [7, 10, 13, 14]); assert.deepEqual(F.bandsCrossed(14, 15), []);
});

test("growing up never offers a lifepath scene about love or marriage", () => {
  const youth = LP.allEvents().filter(e => e.stage === "youth");
  assert.ok(youth.some(e => !F.childSafe(e)), "the first-love scene is left out");
  assert.ok(youth.filter(F.childSafe).length > 3);
  assert.equal(F.childSafe(youth.find(e => e.id === "youth.firstlove")), false);
  assert.deepEqual(F.grantsOf("ab Crafts|bg Mentor|flaw Enemy"), {abilities: ["Crafts"], other: ["Background: Mentor", "Flaw: Enemy"]});
  assert.equal(F.abilityKey("Animal Ken"), "animalken");
  assert.ok(F.CHILD_NATURES.includes(F.pickNature("abc")));
});

test("schooling by century, region and way of life", () => {
  for ( const r of Object.keys(F.COMPULSORY) ) assert.ok(WR.WORLD_REGIONS[r], `${r} is a world region`);
  assert.match(F.schoolingFor(1300, "moravia", "latin").label, /apprentice/);
  assert.match(F.schoolingFor(1600, "moravia", "latin").label, /parish school/);
  assert.equal(F.schoolingFor(1800, "moravia", "latin").label, "compulsory school");
  assert.equal(F.schoolingFor(1800, "france", "latin").label === "compulsory school", false, "France from 1882");
  assert.match(F.schoolingFor(1500, "arabia", "islamic").label, /kuttab/);
  assert.match(F.schoolingFor(1700, "japan", "japanese").label, /terakoya/);
  assert.equal(F.schoolingFor(2000, "moravia", "latin").ability, "computer");
  assert.match(F.schoolingFor(2050, "moravia", "latin").label, /net/);
});

test("child sheets, growing up and the players' setting are wired", () => {
  const f = src("modules/wodx-npc/scripts/family.mjs");
  assert.match(f, /"flags\.wodx-chronicle\.minor": true/, "a child sheet carries the mark");
  assert.match(f, /unsetFlag\("wodx-chronicle", "minor"\)/, "the mark comes off at 18");
  assert.match(f, /Hooks\.on\("wodxSkipEnd"/);
  assert.match(f, /registerApprovalHandler\?\.\(GROW/);
  assert.match(f, /register\(MOD, "childCharacters", \{scope: "world", config: true, type: Boolean, default: false/);
  assert.match(f, /Hooks\.on\("preCreateActor"/); assert.match(f, /Hooks\.on\("preUpdateActor"/);
  assert.match(f, /F\.childSafe\(e\)/);
  const h = src("modules/wodx-npc/scripts/hearts.mjs");
  assert.match(h, /family\?\.makeChild\?\.\(c\)/);
  assert.match(h, /"childCharacters"/);
  assert.match(src("docs/HOOKS.md"), /\| wodxGrownUp \| npc \|/);
});
