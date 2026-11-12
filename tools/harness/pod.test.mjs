import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as P from "../../modules/wodx-chronicle/scripts/pod-rules.mjs";

/* Four ideas from the Princes of Darkness mod (Chronicle 0.37.0, B1511 to B1518) */

const DAY = 86400;

test("city exposure falls a point a quiet week and never below nothing", () => {
  assert.equal(P.exposureNow({value: 5, at: 0}, 6 * DAY), 5);
  assert.equal(P.exposureNow({value: 5, at: 0}, 7 * DAY), 4);
  assert.equal(P.exposureNow({value: 5, at: 0}, 70 * DAY), 0);
  assert.equal(P.exposureNow({}, 99), 0);
  assert.equal(P.bandOf(0).key, "quiet");
  assert.equal(P.bandOf(10).key, "watched");
  assert.equal(P.bandOf(40).key, "hunted");
});

test("a breach counts witnesses, print and cameras", () => {
  assert.equal(P.breachPoints({witnesses: 1, year: 1300}), 1);
  assert.equal(P.breachPoints({witnesses: 9, year: 1300}), 3, "witnesses add at most two");
  assert.equal(P.breachPoints({witnesses: 1, year: 1700}), 2, "printed news from 1605");
  assert.equal(P.breachPoints({witnesses: 1, year: 1990, camera: true}), 4);
});

test("the court acts at its sect's band, and hunters at Hunted", () => {
  let r = P.raise({}, 10, 0, 1600);
  assert.equal(r.band.key, "watched");
  assert.ok(r.court, "a Camarilla court acts at Watched");
  assert.ok(!r.hunters);
  r = P.raise({sect: "sabbat"}, 10, 0, 1600);
  assert.ok(!r.court, "a Sabbat court waits for Hunted");
  r = P.raise(r.rec, 6, 0, 1600);
  assert.ok(r.court && r.hunters);
  assert.ok(!P.raise(r.rec, 1, 0, 1600).court, "no second card in the same band");
  assert.equal(P.lawOf({}, 1300).key, "church", "before the Camarilla");
  assert.equal(P.lawOf({}, 1500).key, "camarilla");
});

test("great cities change with history", () => {
  assert.equal(P.stateAt("Constantinople", 1197).label, "The Queen of Cities");
  assert.match(P.stateAt("Constantinople", 1204).label, /Latins/);
  assert.match(P.stateAt("Constantinople", 1300).label, /Retaken/);
  assert.match(P.stateAt("Istanbul", 1500).label, /Ottomans/);
  assert.match(P.stateAt("Rome", 1527).label, /Sacked/);
  assert.match(P.stateAt("Brünn", 1645).label, /Swedes/);
  assert.equal(P.cityByName("Rothenstein"), null);
  for ( const c of P.CITIES ) {
    const years = c.states.map(s => s.from);
    assert.deepEqual(years, [...years].sort((a, b) => a - b), c.key);
    for ( const s of c.states ) assert.ok(s.label && s.text, c.key);
  }
  const l = P.senseLines(P.stateAt("Cairo", 1348));
  assert.ok(l.smell?.length && l.sound?.length);
});

test("Golconda: the road, its setbacks and the mentor's months", () => {
  assert.equal(P.golcondaStep({step: 9}, 3).step, P.GOLCONDA_STEPS);
  assert.equal(P.golcondaStep({step: 1}, -2).step, 0);
  assert.ok(P.killed({lethal: 6}, {lethal: 6, aggravated: 1}));
  assert.ok(!P.killed({lethal: 7}, {lethal: 8}), "already down");
  assert.ok(!P.killed({bashing: 6}, {bashing: 7}), "bashing does not kill");
  assert.ok(P.harmfulFeed({drunk: 3}));
  assert.ok(P.harmfulFeed({drunk: 1, fought: true}));
  assert.ok(!P.harmfulFeed({drunk: 2, willing: true}));
  assert.equal(P.mentorTerms(DAY, DAY + 29 * DAY), 0);
  assert.equal(P.mentorTerms(DAY, DAY + 61 * DAY), 2);
  assert.equal(P.mentorTerms(null, 99 * DAY), 0);
});

test("story chains deal their steps in order and stop at the end", () => {
  const c = P.chainByKey("black-death");
  let run = {key: c.key, at: 0, last: 0};
  const n = P.nextStep(run);
  assert.equal(n.index, 0); assert.equal(n.due, 0);
  run = {...run, at: 1, last: 10};
  assert.equal(P.nextStep(run).due, 10 + c.steps[1].days * DAY);
  assert.equal(P.nextStep({...run, at: c.steps.length}), null);
  assert.ok(P.nextStep({...run, at: c.steps.length - 1}).last);
  assert.ok(P.chainsFor(1348).some(x => x.key === "black-death"));
  assert.ok(!P.chainsFor(1500).some(x => x.key === "black-death"));
  assert.ok(P.chainsFor(1400, ["vampire"]).some(x => x.key === "anarch-revolt"));
  assert.ok(!P.chainsFor(1400, ["werewolf"]).some(x => x.key === "anarch-revolt"));
  for ( const ch of P.CHAINS ) assert.ok(ch.page && ch.steps.length >= 4 && ch.from <= ch.to, ch.key);
});

test("opening goals by line and age", () => {
  assert.equal(P.goalsFor("vampire", 1300).length, 3);
  assert.notDeepEqual(P.goalsFor("vampire", 1300), P.goalsFor("vampire", 1900));
  assert.deepEqual(P.goalsFor("nobody", 1300), P.goalsFor("mortal", 1300));
});

test("the Followers of Set keep their name and nothing comes from the mod's 5th edition material", () => {
  const src = readFileSync(new URL("../../modules/wodx-chronicle/data/pod.mjs", import.meta.url), "utf8");
  assert.ok(!/Ministry|Banu Haqim|Hecata|Thin-blood|Second Inquisition/i.test(src));
});
