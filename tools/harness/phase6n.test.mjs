import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* Phase 6n: the Dark Ages: Mage Grimoire (WoDX Actions 3.14.0) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const M = await import(join(root, "modules/wodx-actions/scripts/mage-da-rules.js"));
const G = await import(join(root, "modules/wodx-actions/scripts/mage-da-grimoire.js"));

test("the Grimoire's rotes join the core book's: every fellowship, every Pillar its own, unique ids, Grimoire pages", () => {
  assert.ok(G.GRIMOIRE_ROTES.length >= 70);
  const ids = new Set(M.ROTES.map(r => r.id));
  assert.equal(ids.size, M.ROTES.length, "rote ids are unique");
  for ( const f of Object.keys(M.FELLOWSHIPS) ) assert.ok(G.GRIMOIRE_ROTES.some(r => r.f === f), f);
  for ( const r of G.GRIMOIRE_ROTES ) {
    assert.equal(r.book, "G", r.name);
    assert.ok(r.page >= 20 && r.page <= 101, `${r.name}: page ${r.page}`);
    const keys = M.pillarsOf(r.f).map(p => p.key);
    for ( const [k, v] of Object.entries(r.levels) ) { assert.ok(keys.includes(k), `${r.name}: ${k}`); assert.ok(v >= 1 && v <= 5, r.name); }
    assert.ok(r.system.length > 40, r.name);
  }
  assert.ok(M.ROTES.find(r => r.id === "swiftroad"), "the core book's rotes stay");
});

test("a Grimoire rote casts through the core rules: Closet Dance is complex, Dhikr simple", () => {
  const batini = {ratings: {anbiya: 2, fatihah: 2, hajj: 3, layl: 3}, foundation: 3, fellowship: "batini"};
  const cd = G.GRIMOIRE_ROTES.find(r => r.id === "g-closetdance");
  const p = M.castPlan({...batini, levels: cd.levels});
  assert.equal(p.complex, true); assert.equal(p.dice, 3 + 3 + 1); assert.equal(p.difficulty, 5 + 3 + 1);
  const dh = M.castPlan({...batini, levels: G.GRIMOIRE_ROTES.find(r => r.id === "g-dhikr").levels});
  assert.equal(dh.difficulty, 5); assert.equal(dh.dice, 3 + 2);
  assert.equal(M.castPlan({...batini, levels: G.GRIMOIRE_ROTES.find(r => r.id === "g-tearsallah").levels}).ok, false, "Al-Hajj 4 is beyond the mage");
});

test("the first day of a season: −3 for suited magic, +3 for the rest; the dates (pp. 110–111)", () => {
  assert.equal(G.seasonDay(3, 21).id, "spring"); assert.equal(G.seasonDay(12, 21).id, "winter"); assert.equal(G.seasonDay(3, 22), null);
  const oldfaith = {ratings: {autumn: 2, spring: 3, summer: 1, winter: 1}, foundation: 3, fellowship: "oldfaith"};
  const base = M.castPlan({...oldfaith, levels: {spring: 3}}).difficulty;
  assert.equal(base, 7);
  assert.equal(M.castPlan({...oldfaith, levels: {spring: 3}}, {season: "suits"}).difficulty, 4);
  const against = M.castPlan({...oldfaith, levels: {spring: 3}}, {season: "against"});
  assert.equal(against.difficulty, 9); assert.equal(against.extra, 1, "7 + 3 = 10: difficulty 9 and one extra success");
});

test("Sunday lowers a Messianic instantaneous spell by 1, and no one else's (p. 111)", () => {
  const voice = {ratings: {gavriel: 2, mikhael: 2, raphael: 1, uriel: 1}, foundation: 2, fellowship: "messianic"};
  assert.equal(M.castPlan({...voice, levels: {mikhael: 2}}, {sunday: true}).difficulty, 5);
  const hermes = {ratings: {anima: 2, corona: 1, primus: 3, vires: 2}, foundation: 2, fellowship: "hermes"};
  assert.equal(M.castPlan({...hermes, levels: {vires: 2}}, {sunday: true}).difficulty, 6);
});

test("specialties: +1 die within the Foundation's, only at 4 or more; 10s counted for re-rolls (p. 112)", () => {
  const hermes = {ratings: {anima: 2, corona: 1, primus: 4, vires: 2}, foundation: 4, fellowship: "hermes"};
  assert.equal(M.castPlan({...hermes, levels: {primus: 2}}, {specialty: true}).dice, 4 + 4 + 1);
  assert.equal(G.specialtyAllowed(3), false); assert.equal(G.specialtyAllowed(4), true);
  assert.equal(G.tensIn([10, 3, 10, 7]), 2);
  assert.deepEqual(G.SPECIALTY.xp, {foundation: 5, pillar: 3});
  assert.equal(G.XP_FOREIGN.pillar(3), 24); assert.equal(G.XP_FOREIGN.foundation(2), 20);
});

test("the Moon's offering: 1, 3 or the Storyteller's points, +1 at the full moon; what each phase serves (p. 111)", () => {
  assert.equal(G.moonOffering("prayer", 1).gain, 1);
  assert.equal(G.moonOffering("calf", 4).gain, 4);
  assert.equal(G.moonOffering("greater", 6, 5).gain, 5);
  assert.equal(G.moonOffering("prayer", 0).phase, "new"); assert.equal(G.moonOffering("prayer", 6).fits, "banishing");
});

test("countermagic: each fellowship's way, by rating; successes cancel one for one (pp. 122–123)", () => {
  for ( const f of Object.keys(M.FELLOWSHIPS) ) assert.ok(G.COUNTERMAGIC[f]?.length, f);
  const o = G.counterOptions("hermes", {primus: 3});
  assert.deepEqual(o.map(x => x.ok), [true, false]);
  assert.equal(G.countered(4, 3), 1); assert.equal(G.countered(2, 5), 0);
});

test("the Pillar guide covers every fellowship and filters to one", () => {
  for ( const [effect, by] of G.ART_GUIDE ) assert.ok(Object.keys(by).every(k => M.FELLOWSHIPS[k]), effect);
  assert.ok(G.artFor("spirit").length >= 10);
  assert.equal(G.PILLAR_LEVELS.length, 6);
  assert.ok(G.WONDERS.length >= 5);
});

test("Certámen: stances, the same-Pillar penalty, wills, the locus, strikes and the spoils (pp. 119–122)", () => {
  assert.deepEqual(G.STANCES.offensive, {label: "Offensive", attack: 6, deflect: 8});
  assert.equal(G.samePillarPenalty("primus", "primus", "primus"), 2);
  assert.equal(G.samePillarPenalty("primus", "vires", "primus"), 1);
  assert.equal(G.samePillarPenalty("primus", "vires", "anima"), 0);
  assert.deepEqual(G.willsBonus({successes: 3}, {successes: 1}), {a: 1, b: 0});
  assert.deepEqual(G.willsBonus({successes: 0, botch: true}, {successes: 1}), {a: -1, b: 1});
  assert.deepEqual(G.willsBonus({botch: true}, {botch: true}), {a: 0, b: 0});
  assert.deepEqual(G.locusOutcome({successes: 0}, {successes: 0}, 1), {result: "again", difficulty: 7});
  assert.deepEqual(G.locusOutcome({successes: 0}, {successes: 0}, 3), {result: "off"});
  assert.equal(G.locusOutcome({successes: 0}, {successes: 2}).result, "b-wins");
  assert.deepEqual(G.locusOutcome({successes: 3}, {successes: 2}), {result: "duel", a: 3, b: 2});
  assert.deepEqual(G.strikeDamage(2, 2, 3), {hits: false, dice: 0});
  assert.deepEqual(G.strikeDamage(4, 1, 3), {hits: true, dice: 5});
  assert.deepEqual(G.knock(3, 4, 1), {lost: 3, left: 0, out: true});
  assert.deepEqual(G.knock(5, 2, 1), {lost: 1, left: 4, out: false});
  assert.deepEqual(G.certamenSpoils(4, 5), {winner: 6, loser: 3, rematch: "a year and a day"});
});
