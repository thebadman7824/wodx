import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as M from "../../modules/wodx-creation/scripts/maturation-rules.mjs";
import {propose} from "../../modules/wodx-creation/scripts/advance-rules.mjs";
import {SWITCHES} from "../../modules/wodx-creation/data/advance.mjs";
import * as PM from "../../modules/wodx-actions/scripts/profile-menus.js";
import * as TR from "../../modules/wodx-actions/scripts/theme-rules.js";

const src = p => fs.readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const fixed = (successes, botch = false) => () => ({successes, botch});

/* B7685: points for the years, Dark Ages: Vampire (2002) p. 166 and the Storytellers Companion p. 71 */
test("maturation points follow the years and how they were spent", () => {
  assert.deepEqual([5, 30, 130, 500, 750].map(M.pointsFor), [5, 10, 20, 38, 48]);
  assert.equal(M.earned(100, "active").points, 17);
  assert.equal(M.earned(100, "danger").points, 25);
  assert.equal(M.earned(100, "seclusion").points, 8);
  const r = M.earned(100, "research");
  assert.equal(r.only, "knowledges"); assert.ok(r.extra > 0);
  assert.equal(M.earned(100, "torpor", {willpower: 3, perception: 2, age: 100}).points, 0);
  assert.ok(M.earned(600, "torpor", {willpower: 7, perception: 4, age: 600}).points > 0);
  assert.equal(M.periodsOf(250), 3); assert.equal(M.periodsOf(10), 1);
});

/* B7686: the Willpower roll each century, p. 72 */
test("risks and rewards: successes add, a botch costs a die of points, seclusion cannot botch", () => {
  assert.equal(M.risksAndRewards("active", 5, fixed(2), () => 4).bonus, 2);
  assert.equal(M.risksAndRewards("active", 5, fixed(0, true), () => 4).lost, 4);
  assert.equal(M.risksAndRewards("danger", 5, fixed(0), () => 3).lost, 3);
  assert.equal(M.risksAndRewards("seclusion", 5, fixed(0, true), () => 3).lost, 0);
  assert.equal(M.risksAndRewards("torpor", 5, fixed(3), () => 3).bonus, 0);
});

/* B7687: upkeep and Tempting Fate, p. 73 */
test("upkeep pays the highest Backgrounds first and Generation needs none", () => {
  const bgs = [{name: "Domain", value: 4}, {name: "Generation", value: 3}, {name: "Allies", value: 2}];
  const p = M.payUpkeep(1, bgs, "active", 100);
  assert.deepEqual(p.kept, ["Domain"]); assert.deepEqual(p.lost, ["Allies"]); assert.equal(p.left, 0);
  assert.equal(M.payUpkeep(10, [{name: "Herd", value: 6, pooledAnchor: true}], "research", 100).left, 6);
  assert.equal(M.temptingFate(4, fixed(0, true)).lose, true);
  assert.equal(M.temptingFate(4, fixed(0)).mayRaise, false);
  assert.deepEqual([M.temptingFate(4, fixed(1)).mayRaise, M.temptingFate(4, fixed(1)).raiseDiff], [true, 1]);
});

/* B7688: costs and limits, DAV p. 166, DASC p. 73 */
test("spending: costs by age, out of clan and torpor, one dot a trait a period", () => {
  assert.equal(M.costOf("ability", {}).cost, 2);
  assert.equal(M.costOf("attribute", {age: 100, willpower: 5}).cost, 5);
  assert.equal(M.costOf("attribute", {age: 600, willpower: 5}).cost, 10);
  const inClan = M.costOf("discipline", {age: 100}).cost, outClan = M.costOf("discipline", {age: 100, outOfClan: true}).cost;
  assert.equal(outClan, inClan + 1);
  assert.equal(M.costOf("discipline", {age: 100, path: true}).dots, 2);
  assert.ok(M.costOf("discipline", {age: 100, torpor: true}).cost < inClan + 1);
  assert.equal(M.costOf("road", {road: 3, willpower: 5}).cost, 1);
  assert.equal(M.costOf("road", {road: 5, willpower: 5}).cost, 2);
  assert.equal(M.mayBuy("knowledges", {kind: "ability", group: "knowledge"}), true);
  assert.equal(M.mayBuy("knowledges", {kind: "ability", group: "skill"}), false);
  assert.equal(M.maxDotsFor(250), 3);
});

/* B7689: raising Backgrounds with a roll, DASC p. 74 */
test("raising Backgrounds: a roll at the Background's difficulty, Generation refused", () => {
  assert.equal(M.raiseBackground("Generation", {value: 2, attempt: 1}, fixed(3)).ok, false);
  const r = M.raiseBackground("Allies", {value: 2, attempt: 1}, fixed(3));
  assert.equal(r.ok, true); assert.equal(r.diff, 7);
  assert.ok(M.raiseBackground("Allies", {value: 2, attempt: 1, tempted: true}, fixed(3)).diff > r.diff);
});

/* Pass the Years offers maturation in place of the house experience for a Dark Ages Cainite */
test("Pass the Years: maturation stands in for experience and the fade, for Dark Ages vampires only", () => {
  assert.equal(SWITCHES.maturation, "yearsMaturation");
  assert.match(src("modules/wodx-chronicle/data/house-rules.mjs"), /"id": "yearsMaturation"/);
  const v = {line: "vampire", awakeBefore: 50, backgrounds: [{id: "b1", name: "Allies", value: 3}], road: {key: "humanity", rating: 7}};
  const da = {id: "dark-ages"};
  const ctx = {fromYear: 1197, toYear: 1297, years: 100, awakeYears: 100, fromEra: da, toEra: da, switches: {maturation: true, xp: true}};
  const kinds = propose(v, ctx).changes.map(c => c.kind);
  assert.ok(kinds.includes("adv.maturation"));
  assert.ok(!kinds.includes("adv.xp")); assert.ok(!kinds.includes("adv.bgDecay"));
  const mat = propose(v, ctx).changes.find(c => c.kind === "adv.maturation");
  assert.deepEqual(mat.choices.map(c => c.value), M.ACTIVITY_KEYS);
  const off = propose(v, {...ctx, switches: {maturation: false, xp: true}}).changes.map(c => c.kind);
  assert.ok(off.includes("adv.xp")); assert.ok(!off.includes("adv.maturation"));
  const mortal = propose({...v, line: "mortal"}, ctx).changes.map(c => c.kind);
  assert.ok(!mortal.includes("adv.maturation"));
});

test("the Maturation window is on the Kindred menu and wired to WoDX Creation", () => {
  assert.match(src("modules/wodx-actions/scripts/profile-menus.js"), /"api:maturation", "Maturation"/);
  assert.match(src("modules/wodx-actions/scripts/main.js"), /maturation: withActor\(a => creationApi\(\)\?\.maturation\?\.open/);
  assert.match(src("modules/wodx-creation/scripts/main.mjs"), /maturation: \{open: actor => maturation\.MaturationApp\.open\(actor\)/);
  assert.match(src("modules/wodx-creation/scripts/advance.mjs"), /case "adv\.maturation"/);
  void PM; void TR;
});

/* B7691: elder Cainites, Dark Ages Storytellers Companion (2002) printed p. 76 */
test("elder creation: the book's totals, the Road less 2, two dice of blood", async () => {
  const {TOTALS} = await import("../../modules/wodx-creation/data/creation-totals.mjs");
  const D = await import("../../modules/wodx-creation/scripts/derived-rules.mjs");
  const e = TOTALS.daelder;
  assert.deepEqual([e.attributes, e.abilities, e.backgrounds, e.powers[0].dots, e.virtues, e.freebies], [[10, 7, 5], [20, 12, 8], 15, 10, 7, 30]);
  assert.equal(e.costs.road, 1);
  const sys = {advantages: {virtues: {conscience: {permanent: 3}, selfcontrol: {permanent: 4}, courage: {permanent: 3}}}};
  const road = D.derivedTraits("daelder", sys).rows.find(r => r.key === "road");
  assert.equal(road.want, 5);
  assert.equal(D.startingBlood("daelder").full, true, "B8035: fully fed, the owner's house rule");
  assert.equal(D.startingBlood("daelder").book, "Two dice; any past the Generation's limit are lost");
});

/* B7690: the Road of Night, Dark Ages Storytellers Companion (2002) pp. 28-30 */
test("the Road of Night: found by name, ten sins, a parish and the Path of Night after the Dark Ages", async () => {
  const K = await import("../../modules/wodx-actions/scripts/kindred-rules.js");
  const {FLOCKS} = await import("../../modules/wodx-npc/scripts/road-flock-rules.mjs");
  const {ROAD_TO_PATH} = await import("../../modules/wodx-creation/data/advance.mjs");
  const ROADS = JSON.parse(src("modules/wodx-actions/data/roads-daw.json"));
  for ( const name of ["Road of Night", "Via Noctis", "Redeemers"] ) assert.equal(K.roadFor(ROADS, name).key, "night", name);
  assert.equal(ROADS.roads.night.sins.length, 10);
  assert.equal(K.sinAt(K.hierarchyOf(K.roadFor(ROADS, "Road of Night")), 1), "Corrupting a mortal yourself");
  assert.deepEqual(K.roadVirtues(K.roadFor(ROADS, "Road of Night")), {conviction: true, instinct: false});
  assert.equal(FLOCKS.night.group, "parish");
  assert.equal(ROAD_TO_PATH.night.to, "night");
  assert.equal(K.roadFor(ROADS, "Path of Heavenly Abode").key, "night");
});

/* B7692-B7693: the Sleep of Ages and the Thirst of Caine, DASC 2002 pp. 75-77 */
test("the Sleep of Ages past 500 years and the Thirst of Caine's stages", () => {
  assert.equal(M.sleepOfAges(400, 5, fixed(3)), null);
  assert.equal(M.sleepOfAges(600, 5, fixed(3)).decades, 3);
  assert.equal(M.sleepOfAges(600, 5, fixed(0)).torpor, true);
  assert.equal(M.sleepOfAges(600, 5, fixed(0, true)).derangement, true);
  const t = M.thirstTriggers({road: 3, roadKey: "beast", age: 520, nature: "Bravo", extra: ["a diablerist"]});
  assert.equal(t.length, 5);
  assert.equal(M.thirstTriggers({road: 6, roadKey: "heaven", age: 300, nature: "Martyr"}).length, 0);
  assert.equal(M.thirstRoll("none", 5, 5, fixed(0)).stage, "wavering");
  assert.equal(M.thirstRoll("wavering", 5, 5, fixed(0)).stage, "addicted");
  assert.equal(M.thirstRoll("none", 5, 1, fixed(0, true)).stage, "addicted");
  assert.equal(M.thirstRoll("none", 5, 1, fixed(1)).diff, 2);
  assert.equal(M.thirstRoll("none", 5, 0, fixed(0)).stage, "none");
  assert.match(src("modules/wodx-chronicle/data/house-rules.mjs"), /"id": "yearsThirstOfCaine",[\s\S]*?"default": false/);
});
