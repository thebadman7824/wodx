import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* Phase 6g: Dark Ages fae (WoDX Actions 3.8.0) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const F = await import(join(root, "modules/wodx-actions/scripts/fae-da-rules.js"));
const V = await import(join(root, "modules/wodx-actions/scripts/voice-rules.js"));
// fae-da.js imports search.mjs (no Foundry at load), so its parsers can be tested too
const FX = await import(join(root, "modules/wodx-actions/scripts/fae-da.js"));

test("three Origins with their Mists, Weaving, Dominions, Unleashing dice and Echo shift; five Courts (pp. 59–63, 86–87)", () => {
  assert.deepEqual([F.ORIGINS.changeling.mists, F.ORIGINS.changeling.weaving, F.ORIGINS.changeling.dominions], [2, 4, 2]);
  assert.deepEqual([F.ORIGINS.inanimae.mists, F.ORIGINS.inanimae.weaving, F.ORIGINS.inanimae.dominions], [3, 3, 3]);
  assert.deepEqual([F.ORIGINS.firstborn.mists, F.ORIGINS.firstborn.weaving, F.ORIGINS.firstborn.dominions], [4, 2, 3]);
  assert.equal(F.ORIGINS.firstborn.unleashDice, 3); assert.equal(F.ORIGINS.changeling.unleashDice, 5);
  assert.equal(F.COURTS.winter.favored, "night"); assert.equal(F.COURTS.spring.favored, "dawn"); assert.equal(F.COURTS.solstice.favored, null);
  for ( const d of F.DOMINION_IDS ) assert.equal(F.COURTS[F.DOMINIONS[d].court].favored, d);
  const st = F.startingTraits("inanimae");
  assert.equal(st.echoes, 2); assert.equal(st.greaterFeatures, 1); assert.equal(st.lesserFeatures, 3); assert.equal(st.willpower, 4);
});

test("a cantrip: Dominion + trait, difficulty 6, −1 each for Court, hour and season, floor 4 (pp. 120–121; the book's own example)", () => {
  // Winter inanimae, Night 2 + Manipulation 3: five dice at 5
  const p = F.castPlan({dominion: "night", rating: 2, trait: 3, level: 1, court: "winter", mists: 3, weaving: 3});
  assert.equal(p.dice, 5); assert.equal(p.difficulty, 5);
  const all = F.castPlan({dominion: "day", rating: 3, trait: 2, level: 1, court: "summer", mists: 2, weaving: 4}, {time: {hour: true, season: true}, holding: 1});
  assert.equal(all.difficulty, 4, "never below 4");
  assert.equal(F.castPlan({dominion: "dusk", rating: 1, level: 2}).ok, false, "level above the Dominion");
  assert.equal(F.castPlan({dominion: "dusk", rating: 0}).ok, false);
  assert.equal(F.castPlan({dominion: "dawn", rating: 1, trait: 1, mists: 6, weaving: 2}).difficulty, 7, "+1 in Mists imbalance");
});

test("the hours and seasons of the Dominions (p. 120)", () => {
  assert.deepEqual(F.timeBonus("day", {hour: 12.4, doy: 10}), {hour: true, season: false});
  assert.equal(F.timeBonus("night", {hour: 23.6}).hour, true);
  assert.equal(F.timeBonus("night", {hour: 1}).hour, false);
  assert.equal(F.timeBonus("dawn", {hour: 6.2, sunrise: 6.0}).hour, true);
  assert.equal(F.timeBonus("dusk", {hour: 19, sunset: 18}).hour, false);
  assert.equal(F.timeBonus("night", {hour: 2, doy: 355}).season, true);
  assert.equal(F.timeBonus("day", {hour: 2, doy: 172}).season, true);
});

test("Unleashing: Mists + Dominion against 5 (or 3) dice; Weaving removes them; the four outcomes; Mists regained (pp. 102, 121–122)", () => {
  // The book's example: a Summer changeling, Mists 2 + Day 1, difficulty 5; five Unleashing dice at 6
  const p = F.unleashPlan({dominion: "day", rating: 1, origin: "changeling", court: "summer", mists: 2, weaving: 4, mien: true});
  assert.deepEqual([p.dice, p.difficulty, p.wildDice, p.wildDifficulty], [3, 5, 5, 6]);
  assert.equal(F.unleashPlan({dominion: "day", rating: 1, origin: "changeling", mists: 2, mien: false}).ok, false, "changelings Unleash only in mien");
  assert.equal(F.unleashPlan({dominion: "day", rating: 1, origin: "firstborn", mists: 4, mien: false}).wildDice, 3);
  assert.equal(F.unleashPlan({dominion: "day", rating: 1, origin: "changeling", mists: 2, mien: true}, {weavingSpent: 7}).wildDice, 0, "5 Weaving removes the danger");
  assert.equal(F.unleashPlan({dominion: "day", rating: 1, origin: "firstborn", mists: 4}, {holdingCalm: true}).wildDice, 2);
  assert.equal(F.unleashPlan({dominion: "dawn", rating: 1, origin: "changeling", mists: 1, weaving: 4, mien: true}).difficulty, 7, "+1 in Weaving imbalance");
  assert.equal(F.unleashOutcome({successes: 3}, {successes: 3}).result, "controlled");
  assert.equal(F.unleashOutcome({successes: 1}, {successes: 2}).result, "wild");
  assert.equal(F.unleashOutcome({successes: 0}, {successes: 2}).result, "signs");
  assert.equal(F.unleashOutcome({successes: 2}, {successes: 0, botch: true}).result, "havoc");
  assert.equal(F.unleashOutcome({successes: 5}, {successes: 0}).mistsBack, 2);
  assert.deepEqual(F.havocStep(5, 4), {step: 3, cost: 4}); assert.equal(F.havocStep(2, 10).step, 1);
});

test("countering: absorb, scatter, unravel (pp. 130–131; the book's examples)", () => {
  assert.deepEqual(F.counterPlan("absorb", {weaving: 3, rating: 1}).dice, 4);
  assert.equal(F.counterPlan("absorb", {weaving: 3, rating: 0}).ok, false);
  assert.equal(F.counterOutcome("absorb", 4, 1).mistsGain, 1, "won by 3: a Mists point");
  assert.equal(F.counterPlan("scatter", {mists: 4, level: 3}).difficulty, 8);
  assert.equal(F.counterOutcome("scatter", 4, 2).result, "countered");
  assert.equal(F.counterOutcome("unravel", 4, 1).result, "botched");
  assert.equal(F.counterOutcome("unravel", 1, 3).left, 2);
});

test("Echoes: Origin shift, oaths, Weaving, true names; the levels; new Echoes (pp. 102, 110–114)", () => {
  assert.equal(F.echoLevel({successes: 3, origin: "firstborn"}), 4);
  assert.equal(F.echoLevel({successes: 3, origin: "changeling"}), 2);
  assert.equal(F.echoLevel({successes: 3, origin: "inanimae", oathSuccesses: 1, weavingSpent: 2}), 1);
  assert.equal(F.echoLevel({successes: 0, origin: "firstborn"}), 0, "no successes, no shift");
  assert.equal(F.echoLevel({trueName: true, origin: "changeling", oathSuccesses: 2}), 3, "a true name is 5 before oaths");
  assert.equal(F.echoLevel({successes: 9, origin: "firstborn"}), 5);
  for ( let k = 0; k <= 5; k++ ) assert.ok(F.ECHO_LEVELS[k]);
  assert.equal(F.echoFive("changeling").newEchoes, 2); assert.equal(F.echoFive("inanimae").aggravated, 0);
  // The book's example: six Lesser Features, six mortals, an Unleashing: five dice
  assert.deepEqual(F.newEchoPool({lesser: 6, mortals: 6, unleash: true}), {atRisk: true, dice: 5, difficulty: 7});
  assert.equal(F.newEchoPool({lesser: 4}).atRisk, false);
  assert.equal(F.newEchoOutcome({successes: 1}, 5), 0); assert.equal(F.newEchoOutcome({successes: 0}, 5), 1); assert.equal(F.newEchoOutcome({botch: true}, 5), 2);
});

test("Mists and Weaving: imbalance, suppression, hiding, Kenning, rest (pp. 101–103)", () => {
  assert.equal(F.imbalance(6, 2), "mists"); assert.equal(F.imbalance(2, 5), "weaving"); assert.equal(F.imbalance(4, 2), null);
  assert.equal(F.suppression({spendsToday: 3, mists: 2}).mistsPenalty, 2);
  assert.equal(F.suppression({spendsToday: 3, mists: 2, streak: 5, willpower: 4}).lockedRisk, true);
  assert.equal(F.hiddenRisk(5, 4), true); assert.equal(F.hiddenRisk(4, 4), false);
  assert.equal(F.kenningCost("mortal"), 1); assert.equal(F.kenningCost("homid"), 1); assert.equal(F.kenningCost("supernatural"), 2);
  const r = F.realmRest({days: 2}, {mists: {perm: 4, temp: 1}, weaving: {perm: 2, temp: 2}});
  assert.deepEqual([r.mists.temp, r.weaving.temp], [3, 2]);
  assert.equal(F.driftSigns({mists: 6, weaving: 2}).toward, "Lost");
});

test("oaths, cold iron, experience, fae blood, mind shields (pp. 88, 107–110, 115, 181)", () => {
  assert.equal(F.forgeCheck({kind: "iron", rating: 2, gramarye: 1, weaving: 3}).cost, 2);
  assert.equal(F.forgeCheck({kind: "stone", rating: 3, gramarye: 2, weaving: 5}).ok, false);
  assert.equal(F.forgeCheck({kind: "iron", rating: 4, gramarye: 5, weaving: 5}).ok, false);
  assert.deepEqual(F.baptismClears([{kind: "iron"}, {kind: "gold"}, {kind: "stone"}]).map(o => o.kind), ["gold"]);
  assert.equal(F.COLD_IRON.type, "aggravated"); assert.equal(F.COLD_IRON.mistsPerWound, 1);
  assert.equal(F.soaksLethal({origin: "changeling", mien: false}), false); assert.equal(F.soaksLethal({origin: "firstborn"}), true);
  assert.equal(F.xpCost("dominion", 2, {favored: true}), 10); assert.equal(F.xpCost("dominion", 2), 12); assert.equal(F.xpCost("dominion", 0), 10);
  assert.equal(F.xpCost("mists", 3), 9); assert.equal(F.xpCost("ability", 0), 3); assert.equal(F.xpCost("greater"), 5);
  assert.equal(F.faeBlood("inanimae", "summer").none, true); assert.equal(F.faeBlood("firstborn", "winter").double, true);
  assert.equal(F.mindShield({day: 3}, 3), true); assert.equal(F.mindShield({night: 1}, 2), false);
});

test("cantrip lists: the sheet's lines, and the caps by Weaving and Dominion (pp. 89, 120)", () => {
  const c = FX.parseCantrips("Night 1: Hush (manipulation)\nDusk 2 - Evening Mantle\nnonsense");
  assert.equal(c.length, 2); assert.deepEqual(c[0], {dominion: "night", level: 1, name: "Hush", trait: "manipulation"});
  assert.equal(FX.cantripLine(c[0]), "Night 1: Hush (manipulation)");
  const o = FX.parseOaths("Iron 2: keeps the miller's roof (inactive)\nStone 3: the reeve's household");
  assert.equal(o[0].active, false); assert.equal(o[1].kind, "stone");
  assert.equal(FX.oathLine(o[0]), "Iron 2: keeps the miller's roof (inactive)");
  assert.equal(F.cantripProblems(c, {weaving: 1, dominions: {night: 1, dusk: 1}}).length, 1, "Dusk 2 needs Dusk 2");
  assert.equal(F.cantripProblems(c, {weaving: 0, dominions: {night: 1, dusk: 2}}).length, 2, "Weaving 0 allows none");
});

test("the inner voice: the Mists and the Weave (Dark Ages), Banality (later)", () => {
  assert.equal(V.kindFor("fae"), "mists");
  assert.equal(V.pressure("mists", {era: "da", mists: 3, weaving: 3, willpower: 4}).level, "calm");
  assert.equal(V.pressure("mists", {era: "da", mists: 4, weaving: 2, willpower: 4}).level, "stirring");
  assert.equal(V.pressure("mists", {era: "da", mists: 6, weaving: 2, willpower: 4}).level, "rising");
  assert.equal(V.pressure("mists", {era: "da", mists: 3, weaving: 3, willpower: 4, hiddenDays: 5}).level, "breaking");
  assert.equal(V.pressure("mists", {era: "c20", banality: 7, glamour: 3}).level, "rising");
  assert.ok(V.PROPOSALS.mists.length >= 3);
});

test("wiring: Actions 3.8.0, the Dark Ages fae menu, the cantrip button routed by era, gender-neutral text (B48)", () => {
  const m = JSON.parse(readFileSync(join(root, "modules/wodx-actions/module.json"), "utf8"));
  assert.match(m.version, /^3\.(8|9|1\d)\./);
  const pm = readFileSync(join(root, "modules/wodx-actions/scripts/profile-menus.js"), "utf8");
  assert.match(pm, /faeDA:/); assert.match(pm, /ctx\.isDAFae\?\.\(actor\)/);
  const main = readFileSync(join(root, "modules/wodx-actions/scripts/main.js"), "utf8");
  assert.match(main, /FXD\.isDA\(a\) \? fx\(\)\.cast\(a\) : (pm|cx)\(\)\.cantrip\(a\)/);
  assert.match(main, /button\.vta-btn\[data-fx\]/);
  const words = /\b(he|she|him|her|his|hers|himself|herself)\b/i;
  const src = readFileSync(join(root, "modules/wodx-actions/scripts/fae-da.js"), "utf8") + readFileSync(join(root, "modules/wodx-actions/scripts/fae-da-rules.js"), "utf8");
  const strings = src.match(/`[^`]*`|"[^"\n]{12,}"/g).join(" ").replace(/<[^>]+>/g, " ");
  assert.ok(!words.test(strings), strings.match(words)?.[0]);
});
