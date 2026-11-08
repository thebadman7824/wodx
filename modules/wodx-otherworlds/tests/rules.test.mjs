import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import * as R from "../scripts/rules.mjs";

test("Dark Ages chart matches the book", () => {
  const v = R.CHARTS["dark-ages"].values;
  assert.deepEqual([v.metropolis, v.town, v.village, v.wilderness, v["caern-active"], v["caern-powerful"], v["caern-legendary"]], [8, 6, 5, 4, 3, 2, 0]);
});

test("W20 chart matches the book", () => {
  const v = R.CHARTS.w20.values;
  assert.deepEqual([v.laboratory, v.metropolis, v.town, v.village, v.wilderness, v["caern-urban"], v["caern-active"], v["caern-powerful"], v["caern-legendary"]], [9, 8, 7, 6, 5, 5, 4, 3, 2]);
});

test("Wyld West: 5 or 6, up to 7 in the largest towns, Broken Lands 1", () => {
  const v = R.CHARTS["wild-west"].values;
  assert.deepEqual([v.metropolis, v.town, v.village, v.wilderness, v["broken-land"]], [7, 6, 5, 5, 1]);
});

test("every value not from a book is marked", () => {
  for ( const [id, c] of Object.entries(R.CHARTS) ) for ( const k of Object.keys(c.ourCall) ) assert.ok(k in c.values, `${id}.${k}`);
  assert.ok(R.CHARTS["dark-ages"].ourCall["caern-urban"]);
});

test("gauntletFor: chart, override, modifier, missing", () => {
  assert.equal(R.gauntletFor("dark-ages", {settlement: "town"}).gauntlet, 6);
  assert.equal(R.gauntletFor("w20", {settlement: "town"}).gauntlet, 7);
  assert.equal(R.gauntletFor("w20", {settlement: "town", gauntlet: 3}).gauntlet, 3);
  assert.equal(R.gauntletFor("w20", {settlement: "town", modifier: 1}).gauntlet, 8);
  assert.equal(R.gauntletFor("w20", {settlement: "laboratory", modifier: 3}).gauntlet, 10);
  assert.equal(R.gauntletFor("dark-ages", {settlement: "broken-land"}).gauntlet, null);
  assert.equal(R.gauntletFor("dark-ages", {}).gauntlet, null);
  assert.equal(R.gauntletFor("dark-ages", {settlement: "caern-legendary"}).gauntlet, 0);
  assert.equal(R.gauntletFor("nonsense", {settlement: "town"}).gauntlet, 7, "unknown chart falls back to W20");
});

test("counting: 1s cancel successes; botch only with no successes", () => {
  assert.deepEqual(R.countRoll([7, 8, 1, 3], 6), {successes: 2, ones: 1, net: 1, botch: false, success: true});
  assert.deepEqual(R.countRoll([7, 1, 1], 6), {successes: 1, ones: 2, net: 0, botch: false, success: false});
  assert.deepEqual(R.countRoll([2, 1, 4], 6), {successes: 0, ones: 1, net: 0, botch: true, success: false});
  assert.deepEqual(R.countRoll([2, 4], 6), {successes: 0, ones: 0, net: 0, botch: false, success: false});
  assert.equal(R.countRoll([7, 8, 1], 6, {doubleOnes: true}).success, false, "storm: a 1 cancels two");
});

test("shift time", () => {
  assert.equal(R.shiftTime(1).label, "5 minutes");
  assert.equal(R.shiftTime(2).label, "30 seconds");
  assert.equal(R.shiftTime(4).label, "Instantly");
  assert.equal(R.shiftTime(0), null);
});

const base = {procedure: "dark-ages", gauntlet: 6, mode: "cross", inUmbra: false, reflective: false, ownMirror: false,
  pulse: false, priorFailures: 0, secondsSinceFailure: null, caught: false, secondsSinceCaught: null, override: false};

test("Dark Ages plan: mirror −1, earlier failures +1 each, max 10", () => {
  assert.equal(R.planAttempt({...base, reflective: true}).difficulty, 5);
  assert.equal(R.planAttempt({...base, priorFailures: 2}).difficulty, 8);
  assert.equal(R.planAttempt({...base, gauntlet: 8, priorFailures: 5}).difficulty, 10);
  assert.equal(R.planAttempt({...base}).allowed, true, "no mirror needed in the Dark Ages");
  const legendary = R.planAttempt({...base, gauntlet: 0});
  assert.equal(legendary.automatic, true);
  assert.equal(R.planAttempt({...base, gauntlet: null}).allowed, false);
});

const w = {...base, procedure: "w20", gauntlet: 7};

test("W20 plan: mirror needed, Pulse waives it, carried mirror +1, an hour after failure", () => {
  assert.equal(R.planAttempt({...w}).allowed, false);
  assert.equal(R.planAttempt({...w, reflective: true}).allowed, true);
  assert.equal(R.planAttempt({...w, pulse: true}).allowed, true);
  assert.equal(R.planAttempt({...w, reflective: true, ownMirror: true}).difficulty, 8);
  assert.equal(R.planAttempt({...w, reflective: true, secondsSinceFailure: 600}).allowed, false);
  assert.equal(R.planAttempt({...w, reflective: true, secondsSinceFailure: 3700}).allowed, true);
  assert.equal(R.planAttempt({...w, reflective: true, secondsSinceFailure: 600, override: true}).allowed, true);
  assert.equal(R.planAttempt({...w, caught: true, secondsSinceCaught: 100}).allowed, false);
  assert.equal(R.planAttempt({...w, caught: true, secondsSinceCaught: 4000}).allowed, true, "caught: no new mirror needed");
});

test("W20 peeking: +3 from the physical world, at most 9; plain from the Umbra", () => {
  assert.equal(R.planAttempt({...w, mode: "peek", reflective: true}).difficulty, 9);
  assert.equal(R.planAttempt({...w, gauntlet: 5, mode: "peek", reflective: true}).difficulty, 8);
  assert.equal(R.planAttempt({...w, mode: "peek", inUmbra: true}).difficulty, 7);
});

test("outcomes", () => {
  const ok = {successes: 2, ones: 0, net: 2, botch: false, success: true};
  const fail = {successes: 0, ones: 0, net: 0, botch: false, success: false};
  const botch = {successes: 0, ones: 1, net: 0, botch: true, success: false};
  assert.equal(R.outcomeOf({procedure: "w20", mode: "cross", result: ok}).shift.label, "30 seconds");
  assert.equal(R.outcomeOf({procedure: "w20", mode: "cross", result: botch}).status, "caught");
  assert.equal(R.outcomeOf({procedure: "w20", mode: "cross", result: botch, caught: true}).status, "trapped");
  assert.equal(R.outcomeOf({procedure: "dark-ages", mode: "cross", result: botch}).status, "lost");
  assert.equal(R.outcomeOf({procedure: "dark-ages", mode: "cross", result: botch, reflective: true}).status, null);
  assert.match(R.outcomeOf({procedure: "dark-ages", mode: "cross", result: fail}).text, /1 harder/);
  assert.equal(R.outcomeOf({procedure: "dark-ages", mode: "peek", result: ok}).outcome, "peek");
});

test("suggestions and battlemaps", () => {
  assert.equal(R.suggestSettlement("Lower Town · Market Square"), "town");
  assert.equal(R.suggestSettlement("Locus · The Old Grove"), "wilderness");
  assert.equal(R.suggestSettlement("Dolany Village"), "village");
  assert.equal(R.suggestSettlement("⚔ BATTLEMAP · Locus · The Silver Adit"), "wilderness");
  assert.equal(R.suggestSettlement("Title: What Sleeps Beneath Rothenstein"), "");
  assert.equal(R.battlemapParent("⚔ BATTLEMAP · Encounter 01 · The Hunt That Failed"), "Encounter 01 · The Hunt That Failed");
  assert.equal(R.battlemapParent("Dolany Village"), null);
});

test("Rothenstein preset uses the plan's three tags only", () => {
  const p = JSON.parse(readFileSync(new URL("../data/presets/rothenstein.json", import.meta.url)));
  const tags = new Set(Object.values(p.scenes));
  assert.deepEqual([...tags].sort(), ["town", "village", "wilderness"]);
  assert.equal(p.scenes["Lower Town · Market Square"], "town");
  assert.equal(p.scenes["Locus · The Silver Adit"], "wilderness");
  assert.equal(p.scenes["Dolany Village"], "village");
});

test("Disconnection: +1 per lunar cycle in one world, a year and a day at 366 days (W20 p. 319)", () => {
  const day = 86400;
  assert.deepEqual(R.disconnection(null), {known: false, days: 0, cycles: 0, yearAndDay: false});
  assert.equal(R.disconnection(29 * day).cycles, 0);
  assert.equal(R.disconnection(30 * day).cycles, 1);
  assert.equal(R.disconnection(120 * day).cycles, 4);
  assert.equal(R.disconnection(365 * day).yearAndDay, false);
  assert.equal(R.disconnection(366 * day).yearAndDay, true);
  const base = {procedure: "w20", gauntlet: 5, mode: "cross", inUmbra: false, reflective: true};
  assert.equal(R.planAttempt({...base, cycles: 2}).difficulty, 7);
  assert.match(R.planAttempt({...base, cycles: 2}).lines.join(" "), /Disconnection: 2 lunar cycles/);
  assert.equal(R.planAttempt({...base, cycles: 9}).difficulty, 10, "at most 10");
  assert.equal(R.planAttempt({...base, mode: "peek", cycles: 3}).difficulty, 8, "peeking is not crossing: only +3 for the peek");
  assert.match(R.planAttempt({...base, procedure: "dark-ages", cycles: 1}).lines.join(" "), /house rule/);
});
