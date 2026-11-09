import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* Feast and fast days (WoDX Chronicle 0.6.0): the church year, and what it does to the curfew and the hunt */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const C = await import(join(root, "modules/wodx-chronicle/scripts/church-rules.mjs"));
const RR = await import(join(root, "modules/wodx-npc/scripts/routine-rules.mjs"));
const F = await import(join(root, "modules/wodx-npc/scripts/faction-rules.mjs"));
const {DateEngine} = await import(join(root, "modules/wodx-chronicle/scripts/calendar-math.mjs"));

const engine = new DateEngine({epoch: [1197, 1, 1], reform: "bohemia-1584"});
const date = (y, m, d) => engine.timeToDate(engine.dateToTime({year: y, month: m, day: d, hour: 22, minute: 0}));
const day = (y, m, d, opts) => C.churchDay(date(y, m, d), opts);

test("WoDX NPC reads the same feasts from the Chronicle", () => {
  assert.equal(RR.feastOn, C.feastOn);
  assert.equal(RR.easterJDN(2025, "gregorian"), engine.toJDN(2025, 4, 20));
  assert.equal(C.feastOn(date(2025, 4, 18)), "Good Friday");
  assert.equal(C.feastOn(date(1300, 12, 25)), "Christmas");
});

test("the seasons: Advent, Christmastide, Shrovetide, Lent, Holy Week, Eastertide", () => {
  assert.equal(day(2025, 11, 29).season, "Ordinary time");
  assert.equal(day(2025, 11, 30).season, "Advent");
  assert.equal(day(2025, 12, 24).season, "Advent");
  assert.equal(day(2025, 12, 25).season, "Christmastide");
  assert.equal(day(2026, 1, 5).season, "Christmastide");
  assert.equal(day(2025, 3, 3).season, "Shrovetide");
  assert.equal(day(2025, 3, 5).season, "Lent");
  assert.equal(day(2025, 4, 14).season, "Holy Week");
  assert.equal(day(2025, 4, 20).season, "Eastertide");
  assert.equal(day(2025, 6, 9).season, "Ordinary time");
});

test("the Ember days fall on the Wednesday, Friday and Saturday after their four days", () => {
  const e = C.emberDays(2025, "gregorian");
  for ( const [m, d] of [[3, 12], [3, 14], [3, 15], [6, 11], [6, 13], [6, 14], [9, 17], [9, 19], [9, 20], [12, 17], [12, 19], [12, 20]] )
    assert.ok(e.includes(engine.toJDN(2025, m, d)), `${m}-${d}`);
  assert.equal(e.length, 12);
  assert.ok(day(2025, 9, 17).ember);
});

test("fasts: Ash Wednesday, the Lenten fast (not on Sundays), vigils, Good Friday, Fridays without meat", () => {
  assert.match(day(2025, 3, 5).fast, /Ash Wednesday/);
  assert.match(day(2025, 3, 6).fast, /Lenten/);
  assert.equal(day(2025, 3, 9).fast, null); // the first Sunday of Lent
  assert.match(day(2025, 4, 18).fast, /Good Friday/);
  assert.match(day(2025, 8, 14).fast, /vigil of the Assumption/);
  assert.match(day(2025, 7, 4).fast, /Friday/); // an ordinary Friday
  assert.equal(day(2025, 4, 25).fast, null); // a Friday in Eastertide
});

test("a night of revel: busy, the curfew at midnight, hunting in town 1 easier; strict fasts quiet and 1 harder", () => {
  const xmas = day(1300, 12, 24);
  assert.equal(xmas.revel, true);
  assert.equal(xmas.crowd, "busy");
  assert.equal(xmas.curfewStart, 24);
  assert.equal(xmas.huntStep, -1);
  assert.equal(day(1300, 6, 23).revel, true); // St John's Eve, though a vigil
  const lent = day(1300, 3, 15);
  assert.equal(lent.season, "Lent");
  assert.equal(lent.crowd, "quiet");
  assert.equal(lent.huntStep, 1);
  // A plain Friday changes only the food
  for ( let d = 1; d <= 7; d++ ) {
    const c = day(1300, 7, d);
    if ( c.fast?.startsWith("Friday") ) { assert.equal(c.huntStep, 0); assert.equal(c.crowd, null); }
  }
});

test("observance follows the year: strict before 1600, by custom until 1850, lightly after", () => {
  assert.equal(C.observanceFor(1450), "strict");
  assert.equal(C.observanceFor(1700), "custom");
  assert.equal(C.observanceFor(1950), "light");
  // Lent in 1700 and 1950: no step
  const lent1700 = C.churchDay(date(1700, 3, 15));
  assert.equal(lent1700.season, "Lent");
  assert.equal(lent1700.huntStep, 0);
  // Martinmas revels in 1400, not in 1950; Christmas Eve still does
  assert.equal(day(1400, 11, 11).revel, true);
  assert.equal(day(1950, 11, 11).revel, false);
  assert.equal(day(1950, 12, 24).revel, true);
  assert.equal(day(1950, 12, 31).revel, true);
  assert.equal(day(1400, 12, 31).revel, false);
  assert.equal(C.churchDay(date(1950, 3, 15), {observance: "strict"}).observance, "strict");
});

test("the clock label and the Storyteller's own feasts", () => {
  const extra = C.parseFeasts("09-01 St Giles\nnot a line");
  assert.deepEqual(extra, [[9, 1, "St Giles"]]);
  const c = C.churchDay(date(1300, 9, 1), {extra});
  assert.equal(c.feast, "St Giles");
  assert.match(C.churchLabel(c), /^St Giles · /);
  assert.equal(C.churchLabel(day(2025, 6, 10)), "Ordinary time");
});

test("hunting: the church step applies in town, not in the wilds, and stays within 3 to 10", () => {
  const s = F.blankState();
  const market = {id: "m", kind: "market"}, wood = {id: "w", kind: "wilds"}, slum = {id: "s", kind: "street", area: "slums"};
  const base = F.huntingAt(s, market, {}, "roads").difficulty;
  assert.equal(F.huntingAt(s, market, {}, "roads", {churchStep: -1}).difficulty, base - 1);
  assert.equal(F.huntingAt(s, market, {}, "roads", {churchStep: 1}).difficulty, base + 1);
  assert.equal(F.huntingAt(s, wood, {}, "roads", {churchStep: 1}).difficulty, F.huntingAt(s, wood, {}, "roads").difficulty);
  assert.equal(F.huntingAt(s, wood, {}, "roads", {churchStep: 1}).church, 0);
  assert.ok(F.huntingAt(s, slum, {fame: 5}, "roads", {churchStep: -1}).difficulty >= 3);
});

test("the curfew rule takes the later start on a night of revel", () => {
  assert.equal(RR.isCurfew({hour: 22, minute: 0, isNight: true}, 21), true);
  assert.equal(RR.isCurfew({hour: 22, minute: 0, isNight: true}, 24), false);
  assert.equal(RR.isCurfew({hour: 1, minute: 0, isNight: true}, 24), true);
});
