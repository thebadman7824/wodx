import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import * as RF from "../../modules/wodx-actions/scripts/road-faith-rules.js";

// Dark Ages depth desk item 3 (B7644-B7648): walking a Road as a faith with people in it (V20 Dark Ages pp. 111-115).

test("ranks follow the dots: Initiate 1-3, Adherent 4-7, Paragon 8 and up", () => {
  assert.deepEqual([0, 1, 3, 4, 7, 8, 10].map(r => RF.rankOf(r).key), ["fallen", "initiate", "initiate", "adherent", "adherent", "paragon", "paragon"]);
  assert.equal(RF.paragonsToExcommunicate(2), 1);
  assert.equal(RF.paragonsToExcommunicate(5), 3);
  assert.equal(RF.paragonsToExcommunicate(9), null);
});

test("a Mentor takes a point off per dot between them, to half; a Moment of Truth halves what is left, to no less than 1", () => {
  const m = {name: "Teacher", rating: 8, road: "beast"};
  assert.equal(RF.roadDotCost(10, {rating: 5, mentor: m, road: "beast"}).cost, 7);
  assert.equal(RF.roadDotCost(4, {rating: 2, mentor: {...m, rating: 9}, road: "beast"}).cost, 2);
  assert.equal(RF.roadDotCost(10, {rating: 5, mentor: m, road: "beast", truth: true}).cost, 3);
  assert.equal(RF.roadDotCost(2, {rating: 1, truth: true}).cost, 1);
  // another Road, or no more dots: no help
  assert.equal(RF.roadDotCost(10, {rating: 5, mentor: m, road: "kings"}).cost, 10);
  assert.equal(RF.roadDotCost(10, {rating: 5, mentor: {...m, rating: 5}, road: "beast"}).cost, 10);
});

test("a Moment of Truth is open for its story only, once per catalyst, and spent by one dot", () => {
  let f = RF.faithOf({});
  f = RF.withTruth(f, {key: "sin", story: "s1"});
  f = RF.withTruth(f, {key: "sin", story: "s1"});
  assert.equal(f.truths.length, 1);
  assert.ok(RF.openTruth(f, "s1"));
  assert.equal(RF.openTruth(f, "s2"), null);
  f = RF.useTruth(f, "s1");
  assert.equal(RF.openTruth(f, "s1"), null);
  assert.equal(RF.withTruth(f, {key: "nonsense", story: "s1"}).truths.length, 1);
  // the change of Road keeps its own Moment of Truth
  f = RF.withTruth(f, {key: "event", story: "s1", forChange: true});
  assert.equal(RF.openTruth(f, "s1"), null);
});

test("study with a Mentor takes as many months as the Road's dots", () => {
  const M = 30 * 24 * 3600;
  assert.equal(RF.studyReady({since: 0}, 4, 3 * M).ready, false);
  assert.equal(RF.studyReady({since: 0}, 4, 4 * M).ready, true);
});

test("an Excommunicate rolls Conscience or Conviction at +2 and has its aura penalties doubled", () => {
  assert.equal(RF.conscienceDiff("excommunicate"), 2);
  assert.equal(RF.conscienceDiff("apostate"), 0);
  assert.equal(RF.auraFor(2, "excommunicate"), 4);
  assert.equal(RF.auraFor(-1, "excommunicate"), -1);
  assert.equal(RF.auraFor(1, null), 1);
});

test("a change of Road: Mentor, the Virtues not shared down to one, the Road to one, a Moment of Truth", () => {
  assert.deepEqual(RF.virtuesToShed(["conscience", "selfcontrol"], ["conviction", "instinct"]), ["conscience", "selfcontrol"]);
  assert.deepEqual(RF.virtuesToShed(["conscience", "selfcontrol"], ["conviction", "selfcontrol"]), ["conscience"]);
  const s = RF.changeSteps({shed: ["conscience"], rating: 3, virtues: {conscience: 1}, mentorOnNew: true, truth: false});
  assert.equal(s.next.key, "astray");
  assert.ok(RF.changeSteps({shed: ["conscience"], rating: 1, virtues: {conscience: 1}, mentorOnNew: true, truth: true}).ready);
  // a Path of the same Road needs only the Moment of Truth
  assert.deepEqual(RF.changeSteps({path: true, truth: false}).steps.map(x => x.key), ["truth"]);
});

test("the Willpower roll: 10 less the Virtues, ten successes for a Road and five for a Path; out of Willpower is the Beast", () => {
  assert.equal(RF.changeDifficulty(5), 5);
  assert.equal(RF.changeDifficulty(15), 2);
  assert.equal(RF.changeRoll({successes: 8}, {successes: 2}, {willpower: 3}).outcome, "done");
  assert.equal(RF.changeRoll({successes: 2}, {successes: 0}, {willpower: 3}).outcome, "going");
  assert.equal(RF.changeRoll({successes: 2}, {successes: 1}, {willpower: 0}).outcome, "lost");
  const b = RF.changeRoll({successes: 2}, {successes: 0, botch: true}, {willpower: 1});
  assert.equal(b.spendMore, 1); assert.equal(b.outcome, "lost");
  const p = RF.changeRoll({successes: 1}, {successes: 0}, {path: true, willpower: 4});
  assert.equal(p.roadLoss, 1); assert.equal(p.outcome, "going");
  assert.equal(RF.changeRoll({successes: 1}, {successes: 0, botch: true}, {path: true, willpower: 4}).roadLoss, 2);
  assert.equal(RF.changeRoll({successes: 3}, {successes: 2}, {path: true, willpower: 2}).outcome, "done");
});
