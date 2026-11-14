import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Notes gaps g21-g23 (B3550-B3556): the Quiet as a state, soulforging and oboli, Banality from everyday life */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const Q = await imp("modules/wodx-actions/scripts/quiet-rules.js");
const S = await imp("modules/wodx-actions/scripts/soulforge-rules.js");
const B = await imp("modules/wodx-actions/scripts/banal-life-rules.js");
const MR = await imp("modules/wodx-storyteller/scripts/money-rules.mjs");
const TR = await imp("modules/wodx-storyteller/scripts/tasks-rules.mjs");
const PR = await imp("modules/wodx-chronicle/scripts/place-rules.mjs");
const RR = await imp("modules/wodx-npc/scripts/routine-rules.mjs");
const PB = await imp("modules/wodx-npc/scripts/passerby-rules.mjs");

test("Quiet: from 1450; the level follows the Paradox pool; the three M20 forms (pp. 555-559)", () => {
  assert.ok(!Q.applies(1300) && Q.applies(1450) && Q.applies(2005) && Q.applies(null));
  assert.equal(Q.levelOf(0).level, 0);
  assert.deepEqual([2, 5, 9, 12, 18, 25].map(p => Q.levelOf(p).level), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(Q.TYPE_KEYS, ["denial", "madness", "morbidity"]);
  for ( const k of Q.TYPE_KEYS ) for ( const l of [1, 3, 5] ) assert.ok(Q.effectOf(k, l).length > 10, `${k} ${l}`);
  assert.match(Q.effectOf("madness", 6), /Marauder/);
  assert.ok(!Q.othersSee("madness", 3) && Q.othersSee("madness", 4) && !Q.othersSee("denial", 5));
  assert.deepEqual(Q.traumaRoll(6), {pool: "willpower", difficulty: 6});
  assert.equal(Q.traumaRoll(1, {physical: true}).pool, "stamina");
});

test("Quiet ends by the book: three successes in one roll, a mindscape, a cure, an empty pool", () => {
  assert.equal(Q.riseDifficulty(3), 7);
  assert.equal(Q.riseDifficulty(3, {optional: true}), 8);
  assert.ok(Q.rise({successes: 3}).cleared);
  assert.ok(Q.rise({successes: 2}).worse && !Q.rise({successes: 2}).cleared);
  assert.ok(Q.rise({botch: true}).hobgoblin);
  assert.deepEqual(Q.mindscapeTime(6), {count: 6, unit: "day", days: 6});
  assert.deepEqual(Q.mindscapeTime(12), {count: 12, unit: "week", days: 84});
  assert.equal(Q.mindscapeDifficulty(3), 6);
  assert.deepEqual([Q.cureCost(4).min, Q.cureCost(4).max], [8, 12]);
  assert.ok(Q.canCure({mind: 4, prime: 4}) && !Q.canCure({mind: 3, prime: 5}));
  assert.ok(Q.over(0) && !Q.over(1));
  assert.equal(Q.hobgoblinDays(3), 3);
  assert.equal(Q.cleanQuiet({type: "nonsense"}), null);
  assert.deepEqual(Q.cleanQuiet({type: "denial", seen: ["a", 2]}).seen, ["a", "2"]);
  assert.ok(Q.hiddenFrom(["u1"], "u2", false) && !Q.hiddenFrom(["u1"], "u1", false) && !Q.hiddenFrom(["u1"], "u2", true) && !Q.hiddenFrom([], "u2", false));
});

test("Quiet is wired: the menu, the Storyteller's tools and the token hook", () => {
  const main = src("modules/wodx-actions/scripts/main.js"), menus = src("modules/wodx-actions/scripts/profile-menus.js"), theme = src("modules/wodx-actions/scripts/theme-rules.js");
  assert.match(menus, /api:m20Quiet/);
  assert.match(theme, /"api:m20Quiet":/);
  assert.match(main, /Hooks\.on\("refreshToken", t => QX\.onRefreshToken\(t\)\)/);
  const qj = src("modules/wodx-actions/scripts/quiet.js");
  for ( const mode of ["fall", "vision", "token", "line", "rise", "mindscape", "out", "cure", "end"] ) assert.match(qj, new RegExp(`case "${mode}"`), mode);
  assert.match(src("modules/wodx-actions/scripts/m20.js"), /ctx\.quiet\(\)\.act\(actor, \{ mode: "rise" \}\)/);
});

test("soulforging: products, sources and Stygia's fall in 1999 (Wraith 20th pp. 42-45)", () => {
  assert.equal(S.forgesIn(1500).key, "stygia");
  assert.equal(S.forgesIn(1999).key, "after");
  const p = S.plan({product: "sword", source: "soul", year: 1700, dexterity: 3, crafts: 2});
  assert.ok(p.ok && p.illicit);
  assert.deepEqual([p.goal, p.diff, p.dice, p.pathos], [6, 8, 5, 3]);
  const a = S.plan({product: "sword", source: "soul", artificer: true, year: 1700});
  assert.deepEqual([a.diff, a.illicit], [6, false]);
  const after = S.plan({product: "sword", source: "soul", year: 2005});
  assert.deepEqual([after.diff, after.pathos, after.illicit], [7, 4, false]);
  assert.ok(!S.plan({product: "sword", source: "self"}).ok, "only Artificers pledge their own plasm");
  assert.equal(S.plan({product: "sword", source: "self", artificer: true}).selfCost, 1);
  assert.ok(!S.plan({product: "obolus", source: "obolus"}).ok);
  assert.equal(S.plan({product: "knife", source: "obolus"}).lostShare, 0.5);
  assert.equal(S.plan({product: "knife", source: "obolus", artificer: true}).lostShare, 0.25);
  assert.ok(!S.plan({product: "relic", source: "soul"}).ok && S.plan({product: "relic", source: "relic"}).ok);
  const sw = S.itemData("sword", {maker: "Ilse"});
  assert.equal(sw.type, "Melee Weapon");
  assert.deepEqual([sw.name, sw.system.damage.bonus, sw.system.damage.type], ["Soulsteel sword", 2, "lethal"]);
  const pl = S.itemData("plate");
  assert.deepEqual([pl.type, pl.system.soak.lethal, pl.system.dexpenalty], ["Armor", 4, 2]);
  assert.equal(S.itemData("obolus"), null);
  assert.equal(S.oboliOf("obolus"), 1);
  const t = TR.normTask(S.taskOf(p));
  assert.deepEqual([t.kind, t.goal, t.diff, t.interval, t.delicate, t.workshop], ["soulforge", 6, 8, "week", true, "soulforge"]);
});

test("oboli are the Underworld's money in every era; a scene there pays in them", () => {
  for ( const y of [1197, 1600, 1998, 1999, 2022, 2100] ) assert.equal(MR.moneyFor(y, "underworld").id, "oboli", String(y));
  assert.equal(MR.formatMoney(70, MR.moneyFor(1500, "underworld")), "2 oboli 6 slivers of an obolus");
  assert.match(MR.coinsFor(2005, "underworld").coin, /Stygia's fall/);
  assert.ok(MR.wageAt(1500, "underworld") > 0);
  assert.equal(PR.cleanPlace({money: "underworld"}).money, "underworld");
  assert.match(src("modules/wodx-chronicle/scripts/place.mjs"), /p\.money === "underworld"/);
  assert.match(src("modules/wodx-storyteller/scripts/money.mjs"), /export async function receiveForeign/);
  assert.match(src("modules/wodx-storyteller/scripts/main.mjs"), /receiveForeign: Money\.receiveForeign/);
});

test("everyday Banality: banal places, Autumn People, long tasks; heavier with the era (C20 p. 269)", () => {
  for ( const k of Object.keys(B.BANAL_KINDS) ) {
    assert.ok(RR.PLACE_KINDS[k], `WoDX NPC tags ${k}`);
    assert.ok(PB.CROWD_OF_KIND[k], `a crowd for ${k}`);
  }
  assert.deepEqual([1300, 1500, 1800, null].map(B.weightOf), [1, 2, 3, 3]);
  assert.deepEqual([1300, 1500, 1800].map(B.needFor), [3, 2, 1]);
  assert.equal(B.sceneExposure({kind: "office"}).count, 1);
  assert.equal(B.sceneExposure({kind: "office", autumn: ["the clerk"]}).count, 2);
  assert.equal(B.sceneExposure({kind: "tavern"}).count, 0);
  assert.equal(B.taskExposure({kind: "courthouse", days: 15}), 2);
  assert.equal(B.taskExposure({kind: "home", days: 30}), 0);
  assert.ok(B.spared("Grump") && !B.spared("wilder"));
  assert.deepEqual(B.add(0, 1, 1300), {tally: 1, points: 0, need: 3, close: false});
  assert.deepEqual(B.add(1, 1, 1300), {tally: 2, points: 0, need: 3, close: true});
  assert.deepEqual(B.add(2, 1, 1300), {tally: 0, points: 1, need: 3, close: false});
  assert.deepEqual(B.add(0, 2, 1900), {tally: 0, points: 2, need: 1, close: false});
  const main = src("modules/wodx-actions/scripts/main.js");
  assert.match(main, /blx\(\)\.endScene\(canvas\?\.scene\)/);
  assert.match(main, /Hooks\.on\("wodxTaskDone"/);
  assert.match(src("modules/wodx-actions/scripts/theme-rules.js"), /"api:c20Everyday":/);
  assert.match(src("modules/wodx-actions/scripts/theme-rules.js"), /"api:soulforge":/);
});

test("the new text keeps to the house style: no gendered pronouns or em-dashes in prose", () => {
  for ( const f of ["quiet-rules.js", "quiet.js", "soulforge-rules.js", "soulforge.js", "banal-life-rules.js", "banal-life.js"] ) {
    const t = src(`modules/wodx-actions/scripts/${f}`);
    assert.doesNotMatch(t, /\b(he|she|him|her|his|hers|himself|herself)\b/i, f);
    assert.doesNotMatch(t, /—/, f);
  }
});
