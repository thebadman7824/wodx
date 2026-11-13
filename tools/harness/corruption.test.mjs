// Spreading Wyrm corruption, the pure rules (WoDX Otherworlds, B3270-B3276).
import assert from "node:assert/strict";
import {test} from "node:test";
import * as R from "../../modules/wodx-otherworlds/scripts/corruption-rules.mjs";

const always = () => 0;      // every roll succeeds
const never = () => 0.999;   // every roll fails

test("bands follow the level, and the cleansing difficulty rises with them", () => {
  assert.equal(R.bandOf(0).id, "clean");
  assert.equal(R.bandOf(3).id, "tainted");
  assert.equal(R.bandOf(4).id, "blighted");
  assert.equal(R.bandOf(9).id, "foul");
  assert.equal(R.bandOf(10).id, "hellhole");
  assert.equal(R.bandOf(99).id, "hellhole");
  assert.equal(R.cleanseDifficulty(0), null);
  assert.equal(R.cleanseDifficulty(2), 6);
  assert.equal(R.cleanseDifficulty(5, {dawn: true}), 6);
  assert.equal(R.cleanseDifficulty(10), 9);
});

test("the Wyrm grows stronger with the centuries", () => {
  assert.ok(R.eraFactor(1197) < R.eraFactor(1800));
  assert.ok(R.eraFactor(1800) < R.eraFactor(1950));
  assert.ok(R.eraFactor(1950) < R.eraFactor(2010));
  assert.ok(R.eraFactor(2010) < R.eraFactor(2040));
});

test("Pentex exists only from 1913; every other source in every era", () => {
  assert.equal(R.sourceAllowed("pentex", 1600), false);
  assert.equal(R.sourceAllowed("pentex", 1913), true);
  for ( const k of ["nest", "cult", "hive", "works", "suffering"] ) assert.equal(R.sourceAllowed(k, 1197), true, k);
  assert.equal(R.sourceAllowed("nonsense", 2000), false);
});

test("normPlace cleans bad input", () => {
  const p = R.normPlace({level: "14", banes: -2, sources: [{kind: "bogus"}], links: ["a", "a", 3], log: "x"});
  assert.equal(p.level, 10);
  assert.equal(p.banes, 0);
  assert.equal(p.sources[0].kind, "nest");
  assert.deepEqual(p.links, ["a", "3"]);
  assert.equal(p.floor, R.HELLHOLE_FLOOR);
  assert.deepEqual(p.log, []);
});

test("a fed place deepens; an unfed tainted place fades after a season", () => {
  const fed = {a: {name: "Mill", place: {level: 1, sources: [{kind: "works"}]}}};
  const r = R.weekTurn(fed, {now: R.WEEK, year: 1850, rng: always});
  assert.equal(r.places.a.level, 2);
  assert.ok(r.events.some(e => e.kind === "rise"));
  const cold = {a: {name: "Field", place: {level: 2, quiet: 12}}};
  const f = R.weekTurn(cold, {now: R.WEEK, year: 1850, rng: never});
  assert.equal(f.places.a.level, 1);
  // A blighted place does not heal on its own
  const deep = R.weekTurn({a: {name: "Pit", place: {level: 5, quiet: 40}}}, {now: R.WEEK, year: 1850, rng: never});
  assert.equal(deep.places.a.level, 5);
});

test("suffering passes after a year and a day", () => {
  const p = {a: {name: "Battlefield", place: {level: 1, sources: [{kind: "suffering", since: 0}]}}};
  assert.ok(R.pressure(p.a.place, {now: R.WEEK, year: 1400}) > 0);
  const late = R.weekTurn(p, {now: 60 * R.WEEK, year: 1400, rng: never});
  assert.equal(late.places.a.sources.length, 0);
});

test("Banes breed only once a place is blighted", () => {
  const clean = R.weekTurn({a: {name: "A", place: {level: 3}}}, {year: 1900, rng: always});
  assert.equal(clean.places.a.banes, 0);
  const bl = R.weekTurn({a: {name: "A", place: {level: 5}}}, {year: 1900, rng: always});
  assert.equal(bl.places.a.banes, 1);
});

test("a blighted place with Banes spreads along its links, held off by a caern or a ward", () => {
  const places = {
    a: {name: "Tannery", place: {level: 6, banes: 2, links: ["b", "c", "d"]}},
    b: {name: "Village", place: {level: 0, links: ["a"]}},
    c: {name: "Caern", place: {level: 0, caern: true, links: ["a"]}},
    d: {name: "Chapel", place: {level: 0, ward: 10 * R.WEEK, links: ["a"]}}
  };
  const r = R.weekTurn(places, {now: R.WEEK, year: 1990, rng: always});
  assert.equal(r.places.b.level, 1);
  assert.equal(r.places.c.level, 0);
  assert.equal(r.places.d.level, 0);
  assert.ok(r.events.some(e => e.kind === "spread" && e.id === "b" && e.from === "a"));
  // No Banes, no spread
  assert.equal(R.spreadChance(6, 0, 1990), 0);
  assert.equal(R.spreadChance(3, 5, 2000), 0);
  assert.ok(R.spreadChance(8, 1, 2000) > R.spreadChance(5, 1, 2000));
});

test("band changes are reported and ask for Gauntlet drift", () => {
  const r = R.weekTurn({a: {name: "A", place: {level: 3, sources: [{kind: "hive"}]}}}, {year: 1500, rng: always});
  assert.deepEqual(r.bands, [{id: "a", from: "tainted", to: "blighted", up: true}]);
  assert.equal(R.driftFor(r.bands[0]), "taint");
  assert.equal(R.driftFor({from: "blighted", to: "tainted", up: false}), "mend");
  assert.equal(R.driftFor({from: "clean", to: "tainted", up: true}), null);
});

test("cleansing lifts a step and wards; a Hellhole keeps its floor; culling removes Banes", () => {
  const c = R.cleanse({level: 5}, {successes: 1, now: 100});
  assert.equal(c.level, 4);
  assert.equal(c.ward, 100 + 4 * R.WEEK);
  assert.equal(R.cleanse({level: 5}, {successes: 0}).level, 5);
  let h = R.normPlace({level: 10});
  for ( let i = 0; i < 6; i++ ) h = R.cleanse(h, {successes: 1});
  assert.equal(h.level, R.HELLHOLE_FLOOR);
  assert.equal(R.cull({level: 5, banes: 4}, 3).banes, 1);
  assert.equal(R.cull({level: 5, banes: 2}, 9).banes, 0);
});

test("a time skip runs week by week and caps at ten years", () => {
  const r = R.runWeeks({a: {name: "A", place: {level: 1, sources: [{kind: "nest"}]}}}, 600, {yearAt: () => 1700, rng: always});
  assert.equal(r.weeks, 520);
  assert.equal(r.settled, 80);
  assert.equal(r.places.a.level, 10);
  assert.ok(r.bands.some(b => b.to === "hellhole"));
});

test("people take on taint by living in a blighted place; werebeasts slower; innate never moves", () => {
  let t = {};
  for ( let i = 0; i < 12; i++ ) t = R.exposeWeek(t, 5, {where: "Mill"});
  assert.equal(t.level, 1);
  let w = {};
  for ( let i = 0; i < 12; i++ ) w = R.exposeWeek(w, 5, {nature: "werebeast"});
  assert.equal(w.level, 0);
  let fast = {level: 2};
  fast = R.exposeWeek(fast, 10, {}); fast = R.exposeWeek(fast, 10, {}); fast = R.exposeWeek(fast, 10, {});
  assert.equal(fast.level, 3);
  assert.equal(fast.ripened, true);
  assert.equal(R.exposeWeek({level: 0}, 2).changed, false);
  assert.equal(R.exposeWeek({innate: true}, 10).changed, false);
});

test("the Rite of Cleansing on a person, and Sense Wyrm", () => {
  assert.equal(R.cleansePersonDifficulty({level: 2}), 7);
  assert.equal(R.cleansePersonDifficulty({level: 2}, {dawn: true}), 6);
  assert.equal(R.cleansePersonDifficulty({innate: true, level: 0}), null);
  assert.equal(R.cleansePerson({level: 3}, 1).level, 0);
  assert.equal(R.cleansePerson({innate: true}, 3).pains, true);
  assert.equal(R.cleansePerson({ridden: true, level: 3}, 3).pains, true);
  assert.equal(R.registersAsWyrm({}), false);
  assert.equal(R.registersAsWyrm({level: 1}), true);
  assert.equal(R.registersAsWyrm({innate: true}), true);
});

test("Pentex grows down its links through the 20th century, never before 1913", () => {
  const places = {a: {place: {sources: [{kind: "pentex"}], links: ["b", "c"]}}, b: {place: {}}, c: {place: {sources: [{kind: "pentex"}]}}};
  assert.deepEqual(R.pentexYear(places, {year: 1900, rng: always}), []);
  const g = R.pentexYear(places, {year: 1960, rng: always});
  assert.deepEqual(g, [{from: "a", to: "b"}]);
  assert.ok(R.pentexGrowth(2005) > R.pentexGrowth(1920));
});
