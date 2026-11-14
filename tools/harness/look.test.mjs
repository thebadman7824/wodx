import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as L from "../../modules/wodx-library/scripts/look-rules.mjs";
import * as W from "../../modules/wodx-chronicle/scripts/when-rules.mjs";
import * as AT from "../../modules/wodx-npc/scripts/attitude-rules.mjs";
import * as SR from "../../modules/wodx-actions/scripts/social-rules.js";
import * as TK from "../../modules/wodx-npc/scripts/talk-rules.mjs";
import * as RR from "../../modules/wodx-npc/scripts/routine-rules.mjs";
import * as RV from "../../modules/wodx-npc/scripts/rivalry-rules.mjs";
import * as MORE from "../../modules/wodx-npc/data/stock-talk-more.mjs";

/* How NPCs read a character's look (Library 0.14.0, NPC 0.32.0, Chronicle 0.32.0, Actions 3.45.0) */
const src = p => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const cloth = (name, tier, o = {}) => ({name, worn: true, kind: "cloth", from: 1197, to: 2099, conceal: "T", tier, ...o});

test("station is the best worn dress, a step for fine valuables, held to 5", () => {
  assert.equal(L.stationOf([]), 0);
  assert.equal(L.stationOf([cloth("a tunic", 1), cloth("a fur cloak", 3)]), 3);
  assert.equal(L.stationOf([cloth("a fur cloak", 3, {worn: false})]), 0);
  assert.equal(L.stationOf([cloth("a gown", 5), {name: "a ring", worn: true, kind: "valuables", tier: 4}]), 5);
  assert.equal(L.stationOf([cloth("a gown", 3), {name: "a ring", worn: true, kind: "valuables", tier: 4}]), 4);
});

test("era fit: worn dress always shows, carried things only when they can't be hidden", () => {
  const watch = {name: "a wristwatch", worn: false, kind: "accessories", from: 1910, to: 2099, conceal: "P", tier: 2};
  const phone = {name: "a phone", worn: false, kind: "tech", from: 1990, to: 2099, conceal: "N", tier: 2};
  const cloak = cloth("a hood with a long tail", 1, {from: 1300, to: 1450});
  const look = L.lookOf({items: [watch, phone, cloak], year: 1350});
  assert.deepEqual(look.strange, ["a phone"]);
  assert.deepEqual(L.lookOf({items: [cloak], year: 1990}).strange, ["a hood with a long tail"]);
  assert.equal(L.outOfTime({}, 1500), false);
  assert.equal(L.outOfTime({from: 1300, to: 1450}, null), false);
});

test("condition, the person and sides worn", () => {
  const look = L.lookOf({items: [cloth("a monk's habit", 1, {kind: "faith", examine: {bloody: true}}), cloth("a coat", 2, {examine: {worn: true}})],
    year: 1400, appearance: 4, status: 3, conditions: ["filthy"], wounds: 2, weaponOut: true});
  assert.deepEqual(look.condition, ["bloody", "wounded", "filthy", "torn", "weapon"]);
  assert.deepEqual(look.sides, ["kind:church"]);
  assert.equal(look.appearance, 4);
  assert.deepEqual(L.sidesOfName("a pair of police breeches"), ["kind:watch"]);
  assert.deepEqual(L.sidesOfName("a linen shift"), []);
});

test("a first meeting moves by dress, era fit, blood, looks, Status and fine work; held to two", () => {
  const rich = L.lookOf({items: [cloth("a silk gown", 4)], year: 1400});
  assert.deepEqual(L.lookSeed(rich, {station: 1}, 1400), {delta: 1, names: ["fine clothes"]});
  assert.equal(L.lookSeed(rich, {station: 3}, 1400).delta, 0);
  assert.equal(L.lookSeed(rich, {station: 2}, 1950).delta, 0, "a gap of 2 does not count after 1914");
  assert.equal(L.lookSeed(rich, {station: 1}, 1950).delta, 1);
  assert.equal(L.lookSeed(L.lookOf({items: [cloth("a coat", 3)]}), {station: 4}, 1850).delta, -1, "1800-1913: a gap of 1 counts with station 4 to 5");
  assert.equal(L.lookSeed(L.lookOf({items: [cloth("a coat", 2)]}), {station: 3}, 1850).delta, 0, "highGap only with station 4 to 5");
  assert.equal(L.lookSeed(L.lookOf({items: [cloth("a coat", 3)]}), {station: 4}, 1500).delta, 0);
  assert.equal(L.lookSeed(L.lookOf({items: [cloth("rags", 0)]}), {station: 4}, 1850).delta, -1);
  const rags = L.lookOf({items: [cloth("rags", 0)], year: 1400, appearance: 0, conditions: ["bloody"]});
  assert.deepEqual(L.lookSeed(rags, {station: 4}, 1400), {delta: -2, names: ["shabby clothes", "blood on them", "an ugly face"]});
  assert.equal(L.lookSeed(rags, {station: 4, mortal: false}, 1400).delta, 0, "station and blood are a mortal's business");
  const monstrous = L.lookOf({items: [], appearance: 0, monstrous: true});
  assert.equal(L.lookSeed(monstrous, {station: null}).delta, 0, "Monstrous is the trait table's");
  const elder = L.lookOf({items: [], status: 3});
  assert.equal(L.lookSeed(elder, {mortal: false, sameKind: true}).delta, 1);
  assert.equal(L.lookSeed(elder, {mortal: false, sameKind: false}).delta, 0);
  const fine = L.lookOf({items: [cloth("a doublet (fine work)", 2, {quality: "fine"})]});
  assert.equal(L.lookSeed(fine, {station: 2, abilities: {crafts: 2}}).delta, 1);
  assert.equal(L.lookSeed(fine, {station: 2, abilities: {}}).delta, 0);
  assert.equal(L.lookSeed(null, {}).delta, 0);
  assert.equal(L.combine(2, 2), 3);
  assert.equal(L.combine(-2, -2), -3);
  assert.equal(L.combine(1, -1), 0);
});

test("later meetings: blood and wounds for the scene only, and only with mortals", () => {
  const b = L.lookOf({items: [], conditions: ["bloody"]});
  assert.deepEqual(L.sceneStep(b), {delta: -1, names: ["blood on them"]});
  assert.equal(L.sceneStep(b, {mortal: false}).delta, 0);
  assert.equal(L.sceneStep(L.lookOf({items: []})).delta, 0);
  const now = AT.withScene({step: 2, word: "welcome", met: true, from: ""}, {delta: -1, names: ["blood on them"]});
  assert.equal(now.step, 1);
  assert.equal(now.scene.was, 2);
  assert.equal(AT.withScene({step: -3, met: true}, {delta: -1}).step, -3);
});

test("an NPC's station and dress against it", () => {
  assert.equal(L.npcStation({wornStation: 3, resources: 1, template: "mob"}), 3);
  assert.equal(L.npcStation({wornStation: 0, resources: 4}), 4);
  assert.equal(L.npcStation({template: "elder"}), 4);
  assert.equal(L.npcStation({template: "beast"}), null);
  assert.equal(L.npcStation({}), 1);
  const look = L.lookOf({items: [cloth("a gown", 4)]});
  assert.equal(L.dressedVs(look, 1, 1400), "fine");
  assert.equal(L.dressedVs(look, 4, 1400), "even");
  assert.equal(L.dressedVs(L.lookOf({items: []}), 3, 1400), "poor");
  assert.equal(L.dressedVs(look, null, 1400), null);
});

test("a held disguise shows its station and sides", () => {
  const look = L.lookOf({items: [cloth("a cassock", 2, {dressedAs: {station: 3, sides: ["kind:church"]}})]});
  assert.deepEqual(look.disguise, {station: 3, sides: ["kind:church"]});
  assert.equal(L.asSeen(look, false), look);
  const seen = L.asSeen(look, true);
  assert.equal(seen.station, 3);
  assert.equal(seen.disguised, true);
  assert.match(L.readLine(look), /dressed as station 3 \(kind:church\)/);
  assert.equal(SR.actByKey("disguise").preset, "disguiseNpc");
  assert.deepEqual(SR.PRESETS.disguiseNpc.opp, {attr: "perception", ability: "alertness", diff: 6, needMore: true});
  assert.deepEqual(SR.disguiseRecord("win", 5, "s1"), {held: true, at: 5, scene: "s1"});
  assert.equal(SR.disguiseRecord("tie").held, false);
  assert.equal(SR.outcomeText(SR.actByKey("disguise"), {result: "lose"}, "Anna"), "Anna sees through it.");
});

test("talk tests read the look", () => {
  const p = t => W.parseTest(t);
  for ( const t of ["dressed fine", "dressed poor", "dressed even", "wears habit", "station >= 3", "out of time", "strange", "bloody", "disguised", "seen through"] ) assert.ok(!p(t).problem, t);
  for ( const t of ["dressed nicely", "station high", "out of luck", "seen it", "bloody hands"] ) assert.ok(p(t).problem, t);
  const actor = {look: {station: 3, worn: ["a monk's habit"], strange: [], condition: ["wounded"]}};
  const ctx = {actor, npc: {id: "n1", dressed: "fine", disguise: "seen"}};
  assert.equal(W.testOne(p("dressed fine"), ctx), true);
  assert.equal(W.testOne(p("dressed poor"), ctx), false);
  assert.equal(W.testOne(p("wears habit"), ctx), true);
  assert.equal(W.testOne(p("station >= 3"), ctx), true);
  assert.equal(W.testOne(p("out of time"), ctx), false);
  assert.equal(W.testOne(p("bloody"), ctx), true);
  assert.equal(W.testOne(p("seen through"), ctx), true);
  assert.equal(W.testOne(p("disguised"), ctx), false);
  assert.equal(W.testOne(p("dressed fine"), {actor}), null, "no NPC to compare against");
  assert.equal(W.testOne(p("station >= 1"), {actor: {}}), null, "no look without WoDX Library");
  for ( const k of ["dressed", "wears", "station", "out", "bloody", "disguised", "seen"] ) assert.ok(W.TESTS[k], k);
});

test("mortals notice the look, guards mind blood, worn sides show", () => {
  const said = new Set(["bloody", "dressed fine"]);
  assert.equal(TK.noticeFor(t => said.has(t)), "bloody");
  assert.equal(TK.noticeFor(t => t === "dressed poor"), "poor");
  for ( const k of ["bloody", "strange", "fine", "poor", "seen"] ) assert.ok(MORE.NOTICE[k]?.length >= 3, k);
  const guard = {template: "guard", loyalty: 1, caution: 1, cowardice: 0, aggression: 0.5, tactics: ["guard"], fears: []};
  const calm = RR.pickReaction(guard, {}).find(r => r.action === "challenge");
  const bloody = RR.pickReaction(guard, {bloody: true}).find(r => r.action === "challenge");
  assert.ok(bloody.score > calm.score);
  assert.match(bloody.why, /blood on them/);
  const known = RV.knownSides({}, {sides: ["line:kindred"], openSides: ["kind:church"]});
  assert.ok(known.includes("kind:church"), "a borrowed habit reads as the Church");
  assert.ok(!known.includes("line:kindred"));
  assert.match(src("modules/wodx-npc/scripts/routines.mjs"), /wornPass/);
  assert.match(src("modules/wodx-npc/scripts/rivalry.mjs"), /wornSides/);
});

test("the look is wired in: Library api, NPC attitude, Chronicle view", () => {
  assert.match(src("modules/wodx-library/scripts/main.mjs"), /api\.look = Lk\.api\(\)/);
  const at = src("modules/wodx-npc/scripts/attitude.mjs");
  assert.match(at, /L\.rules\.combine\(tD, lD\)/);
  assert.match(at, /AT\.withScene\(now, sc\)/);
  assert.match(src("modules/wodx-npc/scripts/main.mjs"), /buildAttitude\(\{MOD, chron, savedProfile, factions, rivalry, profileFor\}\)/);
  const wn = src("modules/wodx-chronicle/scripts/when.mjs");
  assert.match(wn, /look: \(\(\) =>/);
  assert.match(wn, /return \{id: n\.id, name: n\.name \?\? "", attitude, station, dressed, disguise\};/);
});

// NPC 0.43.0: a disguise at a guarded place
test("a held disguise passes the keepers; one they saw through alarms", () => {
  const look = {sides: [], disguise: {station: 2, sides: ["livery"]}};
  assert.deepEqual(RR.disguiseAt({sides: []}, {g: {held: true}}, ["g"]), {pass: false, seenThrough: false});
  assert.deepEqual(RR.disguiseAt(look, {}, ["g"]), {pass: false, seenThrough: false});
  assert.deepEqual(RR.disguiseAt(look, {g: {held: true}}, ["g"]), {pass: true, seenThrough: false});
  assert.deepEqual(RR.disguiseAt(look, {g: {held: true}, h: {held: false}}, ["g"]), {pass: true, seenThrough: false});
  assert.deepEqual(RR.disguiseAt(look, {g: {held: false}}, ["g"]), {pass: false, seenThrough: true});
  assert.deepEqual(RR.disguiseAt(look, {x: {held: true}}, ["g"]), {pass: true, seenThrough: false});
  const keeper = {template: "guard", loyalty: 1, caution: 1, cowardice: 0, tactics: []};
  const r = RR.pickReaction(keeper, {seenThrough: true});
  assert.ok(r.find(x => x.action === "challenge").why.includes("dressed as one of us"));
  const calm = RR.pickReaction(keeper, {}).find(x => x.action === "challenge").score;
  assert.ok(r.find(x => x.action === "challenge").score > calm);
});
