import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* Phase 6f: Dark Ages mages (WoDX Actions 3.7.0) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const M = await import(join(root, "modules/wodx-actions/scripts/mage-da-rules.js"));
const V = await import(join(root, "modules/wodx-actions/scripts/voice-rules.js"));
const hermes = {ratings: {anima: 2, corona: 1, primus: 3, vires: 2}, foundation: 2, fellowship: "hermes"};

test("six fellowships, each with a Foundation, four Pillars and perks; every rote's Pillars belong to its fellowship", () => {
  assert.equal(Object.keys(M.FELLOWSHIPS).length, 6);
  for ( const [id, f] of Object.entries(M.FELLOWSHIPS) ) {
    assert.equal(f.pillars.length, 4, id);
    assert.ok(f.foundation && f.page && Object.keys(f.perks).length, id);
  }
  for ( const r of M.ROTES ) {
    const keys = M.pillarsOf(r.f).map(p => p.key);
    for ( const k of Object.keys(r.levels) ) assert.ok(keys.includes(k), `${r.name}: ${k}`);
    assert.ok(r.system.length > 20 && r.page, r.name);
  }
});

test("a simple spell: Foundation + the Pillar, difficulty 4 + level (p. 98)", () => {
  const p = M.castPlan({...hermes, levels: {vires: 2}});
  assert.equal(p.dice, 2 + 2); assert.equal(p.difficulty, 6); assert.equal(p.complex, false); assert.equal(p.steady, 0);
});

test("a complex spell: + a die per other Pillar; difficulty 5 + highest + 1 per other (pp. 98–99)", () => {
  const p = M.castPlan({...hermes, levels: {anima: 2, primus: 3, vires: 1}});
  assert.equal(p.dice, 2 + 3 + 2); assert.equal(p.difficulty, 9); assert.equal(p.extra, 1, "5 + 3 + 2 = 10: difficulty 9 and one extra success");
  assert.equal(M.castPlan({...hermes, levels: {anima: 2, vires: 1}}).difficulty, 5 + 2 + 1);
  assert.equal(p.steady, 1, "Primus 3 is above Modus 2: a Quintessence steadies it");
});

test("above 9: the difficulty stays 9 and successes are added; lowering takes those off first (p. 99)", () => {
  const big = {ratings: {primus: 5, vires: 5, anima: 3, corona: 1}, foundation: 5, fellowship: "hermes"};
  const p = M.castPlan({...big, levels: {primus: 5, vires: 4, anima: 1}}); // 5 + 5 + 2 = 12
  assert.equal(p.difficulty, 9); assert.equal(p.extra, 3);
  const q = M.castPlan({...big, levels: {primus: 5, vires: 4, anima: 1}}, {quintessence: 3, freeFocus: true}); // 4 points of lowering
  assert.equal(q.extra, 0); assert.equal(q.difficulty, 8);
  const low = M.castPlan({...hermes, levels: {anima: 1}}, {quintessence: 3});
  assert.equal(low.difficulty, 4, "floor 4");
  assert.equal(M.castPlan({...hermes, levels: {primus: 4}}).ok, false, "a level above the rating cannot be cast");
  assert.equal(M.castPlan({...hermes, levels: {}}).ok, false);
});

test("earlier tries this scene, the sanctum, Blot", () => {
  const p = M.castPlan({...hermes, levels: {vires: 1}}, {failures: 1, botches: 1});
  assert.equal(p.difficulty, 5 + 1 + 2);
  const s = M.castPlan({...hermes, levels: {vires: 1}}, {sanctum: 5});
  assert.equal(s.difficulty, 4, "−2 in a sanctum of 3+, floor 4"); assert.equal(s.dice, 2 + 2 + 1);
  assert.equal(M.castPlan({...hermes, levels: {vires: 1}}, {blotDice: 2}).dice, 6);
});

test("the outcome: success, plain failure, Backlash (1s and Quintessence spent); none in a sanctum (pp. 87, 100, 136)", () => {
  assert.deepEqual(M.castOutcome({raw: 3, ones: 1, successes: 2}), {result: "success", successes: 2});
  assert.equal(M.castOutcome({raw: 2, ones: 0, successes: 2}, {extra: 2}).result, "failure");
  const b = M.castOutcome({raw: 1, ones: 2, successes: 0}, {quintessenceSpent: 2});
  assert.equal(b.result, "backlash"); assert.equal(b.ones, 4);
  assert.equal(M.castOutcome({raw: 0, ones: 2, successes: 0}, {sanctum: 1}).result, "failure");
});

test("cancelling 1s: 1, 3, 7… Quintessence (p. 140)", () => {
  assert.deepEqual([1, 2, 3, 4].map(M.cancelCost), [1, 3, 7, 15]);
  assert.equal(M.canCancel(6, 5), 2); assert.equal(M.canCancel(0, 3), 0); assert.equal(M.canCancel(100, 2), 2);
});

test("Branding bands and merging; Manifestation; Scourging; Twilight (pp. 137–140)", () => {
  assert.deepEqual([[1, 1], [2, 3], [3, 5], [6, 4], [8, 4]].map(([o, h]) => M.branding(o, h).level), [1, 2, 3, 4, 5]);
  const m = M.addBranding([{level: 1, text: "a"}, {level: 1, text: "b"}], {level: 1, text: "c"});
  assert.deepEqual(m.map(x => x.level), [2]);
  assert.equal(M.manifestation(3, 4, 2).points, 15);
  assert.deepEqual(M.scourging(2, 2), {type: "lethal", levels: 2, soak: M.scourging(2, 2).soak});
  assert.equal(M.scourging(2, 3).levels, 4); assert.equal(M.scourging(1, 4).type, "aggravated"); assert.equal(M.scourging(3, 5).levels, 6);
  assert.deepEqual([1, 3, 5].map(h => M.twilightPoints(2, h)), [2, 4, 6]);
  assert.deepEqual(M.addTwilight({temp: 8, perm: 1}, 5), {temp: 3, perm: 2});
  assert.equal(M.twilightStage(4), "Median Twilight");
});

test("fading by abstinence: the book's own examples (pp. 140–141)", () => {
  // Seven temporary and no permanent: a single week
  assert.deepEqual({...M.fadeTwilight({temp: 7, perm: 0}, 7), carry: 0}, {temp: 0, perm: 0, carry: 0});
  assert.equal(M.fadeTwilight({temp: 7, perm: 0}, 6).temp, 1);
  // Eight permanent and two temporary: a little over two years to clear those two (a year each in the ninth point)
  assert.deepEqual(M.fadeTwilight({temp: 2, perm: 8}, 729), {temp: 1, perm: 8, carry: 364});
  assert.deepEqual(M.fadeTwilight({temp: 2, perm: 8}, 730), {temp: 0, perm: 8, carry: 0});
  // Brandings break down from the top: a 2 is two weeks into two 1s, each a week
  const b = M.fadeBrandings([{level: 2, text: "x"}], 14);
  assert.deepEqual(b.marks.map(m => m.level), [1, 1]);
  assert.equal(M.fadeBrandings([{level: 2}], 28).marks.length, 0);
  assert.equal(M.fadeBrandings([{level: 5}], 9999).marks.length, 1, "a fifth-level Branding is permanent");
});

test("duration and distance by successes, normal and hurried (pp. 103, 105); Fount; aura", () => {
  assert.equal(M.reach(2).duration, "a scene"); assert.equal(M.reach(2, true).duration, "three turns");
  assert.equal(M.reach(5).distance, "across Christendom"); assert.equal(M.reach(7, true).duration, "60 turns");
  assert.deepEqual(M.fountLimits(0), {hold: 10, perTurn: 2}); assert.deepEqual(M.fountLimits(3), {hold: 16, perTurn: 4});
  assert.equal(M.auraOf(5), 3); assert.equal(M.crayHolds(3), 15); assert.equal(M.crayAbsorbDifficulty(3), 7);
});

test("the Gift: the mage's inner voice (Dark Ages Twilight; later the Avatar and Paradox)", () => {
  assert.equal(V.kindFor("mage"), "gift");
  assert.equal(V.pressure("gift", {era: "da", temp: 0, perm: 0}).level, "calm");
  assert.equal(V.pressure("gift", {era: "da", temp: 5, perm: 0}).level, "stirring");
  assert.equal(V.pressure("gift", {era: "da", temp: 0, perm: 4}).level, "rising");
  assert.equal(V.pressure("gift", {era: "da", temp: 0, perm: 7}).level, "breaking");
  assert.equal(V.pressure("gift", {era: "m20", avatar: 4, paradox: 0}).level, "stirring");
  assert.equal(V.pressure("gift", {era: "m20", avatar: 2, paradox: 10}).level, "breaking");
  assert.ok(V.PROPOSALS.gift.length >= 3);
});

test("wiring: the Dark Ages mage menu, the cast button routed by era, gender-neutral text (B48)", () => {
  const pm = readFileSync(join(root, "modules/wodx-actions/scripts/profile-menus.js"), "utf8");
  assert.match(pm, /mageDA:/); assert.match(pm, /ctx\.isDA\?\.\(actor\)/);
  const main = readFileSync(join(root, "modules/wodx-actions/scripts/main.js"), "utf8");
  assert.match(main, /MXD\.isDA\(a\) \? mx\(\)\.cast\(a\) : /);
  const words = /\b(he|she|him|her|his|hers|himself|herself)\b/i;
  const src = readFileSync(join(root, "modules/wodx-actions/scripts/mage-da.js"), "utf8") + readFileSync(join(root, "modules/wodx-actions/scripts/mage-da-rules.js"), "utf8");
  const strings = src.match(/`[^`]*`|"[^"\n]{12,}"/g).join(" ").replace(/<[^>]+>/g, " ");
  assert.ok(!words.test(strings), strings.match(words)?.[0]);
});
