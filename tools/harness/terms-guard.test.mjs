/* Shared terms (B6180-B6199): one meaning for time, dice, health, distance, eras and who is who, in every module. */
import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import path from "node:path";
import {RULES, check, compare, loadBaseline, ROOT} from "./terms-guard.mjs";
import * as T from "../../modules/wodx-chronicle/scripts/terms.mjs";

test("no module writes its own copy of a shared term (use modules/wodx-chronicle/scripts/terms.mjs)", () => {
  const {fresh} = compare(check(), loadBaseline());
  assert.deepEqual(fresh, [], `Import these from terms.mjs (or api.terms in play) instead:\n  ${fresh.join("\n  ")}`);
});

test("the baseline lists only older copies still there (run terms-guard.mjs --baseline after moving one)", () => {
  const {cleared} = compare(check(), loadBaseline());
  assert.deepEqual(cleared, [], `Cleared, take out of tools/harness/terms-guard-baseline.json:\n  ${cleared.join("\n  ")}`);
});

test("each guard rule catches its copy and lets the shared one through", () => {
  assert.equal(RULES.timeUnit("const DAY = 86400;"), 1);
  assert.equal(RULES.timeUnit("export const HOUR = 3600, DAY = 86400;"), 2);
  assert.equal(RULES.timeUnit("const WEEK = 7 * DAY;"), 1);
  assert.equal(RULES.timeUnit('import {DAY} from "./terms.mjs"; const NIGHT = {a: "#000"};'), 0);
  assert.equal(RULES.timeLiteral("t + 86400"), 1);
  assert.equal(RULES.timeLiteral("t + DAY"), 0);
  assert.equal(RULES.diceCount("const ones = faces.filter(f => f === 1).length;"), 1);
  assert.equal(RULES.diceCount("for (const f of faces) { if (f === 1) ones++; }"), 1);
  assert.equal(RULES.diceCount("const {raw, ones} = TERMS.successes(faces, 6);"), 0);
  assert.equal(RULES.healthLevels('["bruised", "hurt", "injured"]'), 1);
  assert.equal(RULES.distance("/m|meter|metre|yd|yard/i.test(units)"), 1);
  assert.equal(RULES.distance("TERMS.toYards(d, units)"), 0);
  assert.equal(RULES.nightHours("export const isNightHour = h => h >= 19;"), 1);
  assert.equal(RULES.pcTest("const isPC = a => !!a && a.hasPlayerOwner;"), 1);
  assert.equal(RULES.pcTest("const isPC = TERMS.isPC;"), 0);
  assert.equal(RULES.eraTable('export const ERA_LIKE = {"a": "b"};'), 1);
  assert.equal(RULES.eraTable("export const ERA_LIKE = TERMS.ERA_LIKE;"), 0);
});

test("time: a turn is three seconds, a night turns over at noon, a month 30 days, a year 365.25", () => {
  assert.equal(T.TURN_SECONDS, 3);
  assert.equal(T.DAY, 86400);
  assert.equal(T.MONTH, 30 * 86400);
  assert.equal(T.YEAR, 365.25 * 86400);
  assert.ok(Math.abs(T.CALENDAR_MONTH * 9 / 86400 - 273.9) < 0.1);
  assert.equal(T.nightIndex(23 * 3600), T.nightIndex(26 * 3600), "the small hours belong to the night before");
  assert.notEqual(T.nightIndex(11 * 3600), T.nightIndex(13 * 3600));
  assert.equal(T.periodKey("turn", {worldTime: 7, scene: 2}), "t2:2");
  assert.equal(T.periodKey("turn", {worldTime: 7, scene: 2, turnSeconds: 6}), "t2:1");
  assert.equal(T.periodKey("round", {combat: {id: "c", round: 4}}), "c:4");
  assert.equal(T.seconds(2, "weeks"), 14 * 86400);
  assert.equal(T.seconds(5, "turns", {turnSeconds: 6}), 30);
});

test("night is sunset to sunrise for the date and place, not set hours", () => {
  // Early July 1500 at 19:30 sun time in Moravia (50.1 N): the sun is still up (a set "night from 19:00" says
  // otherwise); at 22:30 it is night
  const day = d => d * 86400;
  const summer = day(Math.round((1500 - 1197) * 365.25 + 181));
  assert.equal(T.isNightAt(summer + 19.5 * 3600, 50.1), false);
  assert.equal(T.isNightAt(summer + 22.5 * 3600, 50.1), true);
  const winter = day(Math.round((1500 - 1197) * 365.25 + 5));
  assert.equal(T.isNightAt(winter + 17.5 * 3600, 50.1), true, "a January evening at 17:30 is dark");
  assert.ok(T.toDawn(summer, 50.1) > 0 && T.toDusk(summer, 50.1) > 0);
});

test("dice: V20 difficulty 2 to 10, a 10 always hits, 1s cancel, botch with no hit and a 1", () => {
  assert.deepEqual(T.successes([10, 1, 6], 6), {raw: 2, ones: 1, net: 1, successes: 1, botch: false, difficulty: 6});
  assert.equal(T.successes([1, 3], 6).botch, true);
  assert.equal(T.successes([1, 6], 6).botch, false, "a hit cancelled by a 1 is a failure, not a botch");
  assert.equal(T.successes([10], 12).successes, 1, "a difficulty past 10 is 10");
  assert.equal(T.successes([2], 1).successes, 1, "a difficulty below 2 is 2");
  assert.equal(T.successes([1], 1).botch, true, "a 1 never hits");
  assert.equal(T.successes([10], 6, {specialty: true}).successes, 2);
  assert.equal(T.successes([1, 3], 6, {willpower: true}).botch, false);
  assert.equal(T.successes([1, 3], 6, {willpower: true}).successes, 1);
  assert.equal(T.successes([6, 1], 6, {doubleOnes: true}).net, 0);
  assert.equal(T.margin([6, 1, 1], 6), -1);
  assert.equal(T.clampDifficulty("x"), 6);
});

test("every dice count in WoDX agrees with the shared one", async () => {
  const M = p => import(path.join(ROOT, "modules", p));
  const counts = [
    [await M("wodx-combat/scripts/rules.js"), m => (f, d) => m.countSuccesses(f, d).successes],
    [await M("wodx-chronicle/scripts/referee-rules.mjs"), m => (f, d) => m.successes(f, d).successes],
    [await M("wodx-npc/scripts/faction-rules.mjs"), m => (f, d) => m.successes(f, d).net],
    [await M("wodx-library/scripts/arms-rules.mjs"), m => (f, d) => m.countSuccesses(f, d).successes],
    [await M("wodx-library/scripts/examine-rules.mjs"), m => (f, d) => m.countSuccesses(f, d).successes],
    [await M("wodx-library/scripts/wonder-powers.mjs"), m => (f, d) => m.countSuccesses(f, d).successes],
    [await M("wodx-library/scripts/recipe-rules.mjs"), m => (f, d) => m.successes(f, d).successes],
    [await M("wodx-otherworlds/scripts/rules.mjs"), m => (f, d) => m.countRoll(f, d).net]
  ].map(([m, fn]) => fn(m));
  const rolls = [[[10, 1, 6], 6], [[1, 3], 6], [[1, 6], 6], [[10], 12], [[2, 2], 1], [[7, 8, 9], 8], [[10, 10, 1], 11]];
  for ( const [f, d] of rolls ) for ( const c of counts ) assert.equal(c(f, d), T.successes(f, d).successes, `${f} at ${d}`);
});

test("health levels and damage words", () => {
  assert.equal(T.HEALTH_LEVELS.length, 7);
  assert.deepEqual(T.HEALTH_LEVELS.map(k => T.WOUND_PENALTY[k]), [0, -1, -1, -2, -2, -5, null]);
  assert.equal(T.LEVEL_INDEX.mauled, 5);
  assert.equal(T.damageType("agg"), "aggravated");
  assert.equal(T.damageType("B"), "bashing");
  assert.equal(T.damageType("chimerical"), "chimerical");
});

test("distance: a square is 5 feet; a metre counts as a yard, as the books have it", () => {
  assert.equal(T.toYards(30, "ft"), 10);
  assert.equal(T.toYards(10, "m"), 10);
  assert.equal(T.toYards(2, "km"), 2000);
  assert.equal(T.toYards(1, "mi"), 1760);
  assert.equal(T.toYards(4, ""), 4);
  assert.equal(T.fromYards(10, "ft"), 30);
  assert.equal(T.toFeet(2, "yd"), 6);
  assert.ok(Math.abs(T.kgFromLb(100) - 45.359) < 0.001);
});

test("eras: the shared table is data/eras.json's years and rule sets", () => {
  const json = JSON.parse(fs.readFileSync(path.join(ROOT, "modules/wodx-chronicle/data/eras.json"), "utf8"));
  for ( const p of json.profiles ) {
    const e = T.eraById(p.id);
    assert.ok(e, `${p.id} is in terms.ERAS`);
    assert.equal(e.start, p.start, `${p.id} start`);
    assert.equal(e.end, p.end, `${p.id} end`);
    assert.equal(e.rules, p.system?.vampire, `${p.id} rule set`);
  }
  assert.equal(T.ERAS.length, json.profiles.length);
  assert.equal(T.eraAt(1500).id, "renaissance");
  assert.equal(T.eraAt(1880).id, "victorian", "the Wild West is regional, not the year's era");
  assert.equal(T.eraAt(2006).id, "time-of-judgment", "between eras, the one before");
  assert.equal(T.darkAgesRules("age-of-reason"), true);
  assert.equal(T.darkAgesRules("victorian"), false);
  assert.equal(T.eraGroup(1950), "mid-century");
});

test("who is who: lines read the same in every module", () => {
  assert.equal(T.lineOf({type: "Mortal", system: {settings: {variant: "ghoul"}}}), "ghoul");
  assert.equal(T.lineOf({type: "Mortal", flags: {"wodx-npc": {ghoul: true}}}), "ghoul");
  assert.equal(T.lineOf({type: "Mortal", system: {settings: {variant: "kinfolk"}}}), "kinfolk");
  assert.equal(T.lineOf({type: "Creature", flags: {"wodx-creation": {animalGhoul: true}}}), "ghoul");
  assert.equal(T.lineOf({type: "Vampire", system: {settings: {variant: "kindredeast"}}}), "kueijin");
  assert.equal(T.lineOf({type: "Exalted"}), "exalted");
  assert.equal(T.lineOf({type: "Changing Breed"}), "werewolf");
  assert.equal(T.lineOf({type: "PC", system: {settings: {splat: "mage"}}}), "mage");
  assert.equal(T.kindOfLine("kueijin"), "kindred");
  assert.equal(T.isPC({type: "Mortal", hasPlayerOwner: true}), true);
  assert.equal(T.isPC({type: "Group", hasPlayerOwner: true}), false, "a party sheet is not a character");
  assert.equal(T.isNPC({type: "Group", hasPlayerOwner: false}), false);
  assert.equal(T.isNPC({type: "Vampire", hasPlayerOwner: false}), true);
});
