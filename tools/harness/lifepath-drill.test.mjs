import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import * as D from "../../modules/wodx-creation/scripts/lifepath-drill-rules.mjs";
import {WORLD_REGIONS} from "../../modules/wodx-chronicle/scripts/world-rules.mjs";

/* WoDX Creation: the drill-down lifepath (Ben, 13 November 2026): continent, region, origin, childhood, teens, adult chapters. */

const YEARS = [1150, 1197, 1348, 1499, 1500, 1620, 1788, 1789, 1850, 1945, 1946, 1990, 2022, 2023, 2100, 2300];
/** Walk a drill to its end, always taking option n (wrapped) of each step. */
const walk = (d, n = 0, guard = 40) => {
  for ( let i = 0; i < guard; i++ ) { const s = D.current(d); if ( !s ) break; d = D.pick(d, s.id, s.options[n % s.options.length].id); }
  return d;
};
const start = (rid, birthYear, age) => {
  let d = D.newDrill({birthYear, age});
  d = D.pick(d, "continent", D.continentOf(rid).id);
  return D.pick(d, "region", rid);
};

test("the lists are whole and every world region sits on one continent", () => {
  assert.deepEqual(D.lint(), []);
  const all = D.continents().flatMap(c => c.regions.map(r => r.id));
  assert.equal(all.length, Object.keys(WORLD_REGIONS).length);
  assert.equal(D.continents().length, 7);
});

test("every region in every year can be walked to the end at every age band", () => {
  for ( const rid of Object.keys(WORLD_REGIONS) ) for ( const y of YEARS ) for ( const age of [8, 15, 22, 40, 70] ) {
    const d = walk(start(rid, y, age), (y + age) % 5);
    assert.ok(D.done(d), `${rid} ${y} age ${age}`);
    for ( const s of D.stepsOf(d).steps ) assert.ok(s.options.length >= 2, `${rid} ${y} ${s.id} has choices`);
  }
});

test("age closes the later stages: no teens before 12, no adult life before 18", () => {
  const ids = age => D.stagesFor(age).map(s => s.id);
  assert.deepEqual(ids(8), ["c"]);
  assert.deepEqual(ids(11), ["c"]);
  assert.deepEqual(ids(12), ["c", "t"]);
  assert.deepEqual(ids(17), ["c", "t"]);
  assert.deepEqual(ids(18), ["c", "t", "a0"]);
  assert.deepEqual(ids(29), ["c", "t", "a0"]);
  assert.deepEqual(ids(30), ["c", "t", "a0", "a1"]);
  assert.deepEqual(ids(59), ["c", "t", "a0", "a1", "a2"]);
  assert.deepEqual(ids(90), ["c", "t", "a0", "a1", "a2", "a3"]);
  const young = walk(start("france", 1700, 16));
  assert.ok(D.done(young));
  assert.ok(!Object.keys(young.picks).some(k => k.startsWith("a")), "a character of 16 has no adult picks");
  assert.match(D.closedNote(16), /18/);
  assert.match(D.closedNote(9), /12/);
  assert.equal(D.closedNote(18), "");
  assert.equal(D.stagesFor(16).find(s => s.id === "t").to, 16);
});

test("Ben's example: Europe, France, orphan, then childhood, teens and adult life", () => {
  let d = D.newDrill({birthYear: 1700, age: 34});
  assert.equal(D.current(d).id, "continent");
  d = D.pick(d, "continent", "europe");
  assert.ok(D.current(d).options.some(o => o.id === "france"));
  d = D.pick(d, "region", "france");
  const origin = D.current(d);
  assert.equal(origin.id, "origin");
  assert.ok(origin.options.some(o => o.local), "France has origins of its own in 1700");
  d = D.pick(d, "origin", "orphan-or-foundling");
  assert.equal(d.picks.origin.base, "orphan");
  const home = D.current(d);
  assert.ok(home.options.some(o => o.label.startsWith("A house of faith")), "an orphan's homes");
  assert.ok(!home.options.some(o => o.label.startsWith("Both parents")), "no parents for an orphan");
  d = walk(d);
  assert.ok(D.done(d));
  assert.deepEqual(Object.keys(d.picks), ["continent", "region", "origin", "c-path", "c-mark", "t-path", "t-mark", "a0-path", "a0-mark", "a1-path", "a1-mark"]);
  assert.ok(D.pool(d).some(g => g.kind === "bg"), "the life offers a Background");
  assert.equal(D.story(d).length, 10);
});

test("lists follow the year: no factory before 1760, no net before 1990", () => {
  const labels = (y, age, step) => { let d = walk(start("british-isles", y, age)); return D.stepsOf(d).steps.find(s => s.id === step).options.map(o => o.label); };
  assert.ok(!labels(1300, 30, "a0-path").some(l => /Factory|Net and data|Office/.test(l)));
  assert.ok(labels(1850, 30, "a0-path").some(l => /Factory/.test(l)));
  assert.ok(labels(1990, 30, "a0-path").some(l => /Net and data/.test(l)));
  assert.ok(!D.originsFor("france", 1300).some(o => o.base === "corp" || o.base === "labour"));
  assert.ok(D.originsFor("france", 2050).some(o => o.base === "corp"));
});

test("a stage can happen in another region, and a change drops the later picks", () => {
  let d = walk(start("west-africa", 1650, 40));
  assert.ok(D.done(d));
  const before = Object.keys(d.picks).length;
  d = D.moveTo(d, "a0", "brazil");
  assert.ok(!d.picks["a0-path"] && d.picks["t-mark"], "teens stay, adult picks go");
  assert.equal(D.current(d).region, "brazil");
  d = walk(d);
  assert.equal(Object.keys(d.picks).length, before);
  assert.equal(D.lastHome(d), "brazil");
  assert.ok(D.fromAbroad(d, "moravia"));
  assert.ok(!D.fromAbroad(d, "brazil"));
  assert.equal(D.moveTo(d, "c", "japan"), d, "childhood stays where the character was born");
  assert.equal(D.moveTo(d, "a0", "atlantis"), d);
  const back = D.unpick(d, "origin");
  assert.deepEqual(Object.keys(back.picks), ["continent", "region"]);
  const other = D.pick(d, "region", "west-africa");
  assert.deepEqual(other.place, {}, "a new birthplace forgets the moves");
});

test("a player's own answer is kept, flagged for the Storyteller, and never for continent or region", () => {
  let d = start("japan", 1600, 20);
  d = D.pickOwn(d, "origin", "Raised by a travelling puppet troupe", {gives: "ab Performance|bg Allies", base: "wander"});
  assert.equal(d.picks.origin.own, true);
  assert.equal(d.picks.origin.base, "wander");
  assert.ok(D.hasOwn(d));
  d = walk(d);
  assert.ok(D.done(d));
  assert.ok(D.pool(d).some(g => g.name === "Performance"));
  const e = D.newDrill({birthYear: 1600, age: 20});
  assert.equal(D.pickOwn(e, "continent", "Atlantis"), e);
  assert.equal(D.pick(e, "continent", "nowhere"), e);
  const blank = start("japan", 1600, 20);
  assert.equal(D.pickOwn(blank, "origin", "   "), blank, "an empty answer changes nothing");
});

test("a region with no name lists yet can still be picked", () => {
  const na = D.continents(1300).find(c => c.id === "north-america").regions.find(r => r.id === "north-america-east");
  assert.equal(na.named, false);
  assert.ok(D.done(walk(start("north-america-east", 1300, 25))));
});

test("no gendered words and no option id twice in a step", () => {
  const words = /\b(he|she|him|her|his|hers|himself|herself|son|daughter|mother|father|wife|husband|boy|girl|man|woman)\b/i;
  for ( const rid of ["france", "japan", "west-africa", "andes", "levant", "north-america-west", "moravia", "india"] ) for ( const y of YEARS ) {
    const d = walk(start(rid, y, 65));
    for ( const s of D.stepsOf(d).steps ) {
      const ids = s.options.map(o => o.id);
      assert.equal(new Set(ids).size, ids.length, `${rid} ${y} ${s.id}: an option id twice`);
      for ( const o of s.options ) assert.ok(!words.test(`${o.label} ${o.text}`), `${rid} ${y}: "${o.label}"`);
    }
  }
});
