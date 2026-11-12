import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* Game time (Game Time Desk, B1960-B1970): time apart, the table's clock, a scene's own place, fight length, realms */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SR = await import(join(root, "modules/wodx-storyteller/scripts/spend-rules.mjs"));
const PR = await import(join(root, "modules/wodx-chronicle/scripts/place-rules.mjs"));
const PA = await import(join(root, "modules/wodx-chronicle/scripts/pace-rules.mjs"));
const FT = await import(join(root, "modules/wodx-combat/scripts/fight-time-rules.js"));
const J = await import(join(root, "modules/wodx-otherworlds/scripts/journey-rules.mjs"));
const {DateEngine} = await import(join(root, "modules/wodx-chronicle/scripts/calendar-math.mjs"));

const where = (...pairs) => pairs.map(([id, scene]) => ({id, scene}));

test("the main group is the scene holding more than half of the characters", () => {
  assert.equal(SR.mainScene(where(["a", "s1"], ["b", "s1"], ["c", "s2"])), "s1");
  assert.equal(SR.mainScene(where(["a", "s1"], ["b", "s1"], ["c", "s2"], ["d", "s2"])), null);
  assert.equal(SR.mainScene(where(["a", null], ["b", "s2"])), "s2");
});

test("a character is apart only when someone else is elsewhere and they are not the main group", () => {
  const w = where(["a", "s1"], ["b", "s2"], ["c", "s2"]);
  assert.equal(SR.groupApart(["a"], w), true);
  assert.equal(SR.groupApart(["b"], w), false);
  assert.equal(SR.groupApart(["b", "c"], w), false);
  // Everyone together, or alone in the chronicle: the clock
  assert.equal(SR.groupApart(["a"], where(["a", "s1"], ["b", "s1"])), false);
  assert.equal(SR.groupApart(["a"], where(["a", "s1"])), false);
  // Split two and two: both halves are apart, and Convene squares them
  const split = where(["a", "s1"], ["b", "s1"], ["c", "s2"], ["d", "s2"]);
  assert.equal(SR.groupApart(["a", "b"], split), true);
  assert.equal(SR.groupApart(["c"], split), true);
  // A group spread over two scenes, or a character with no token, moves the clock
  assert.equal(SR.groupApart(["a", "b"], where(["a", "s1"], ["b", "s3"], ["c", "s2"], ["d", "s2"], ["e", "s2"])), false);
  assert.equal(SR.groupApart(["x"], w), false);
  assert.equal(SR.groupApart([], w), false);
});

test("time asked for is kept whole and capped", () => {
  assert.equal(SR.cleanSeconds(-5), 0);
  assert.equal(SR.cleanSeconds("90.4"), 90);
  assert.equal(SR.cleanSeconds(1e12), SR.MAX_ASK);
  assert.equal(SR.cleanSeconds("x"), 0);
});

test("spans and card lines read plainly", () => {
  assert.equal(SR.spanWords(45), "45 seconds");
  assert.equal(SR.spanWords(600), "10 minutes");
  assert.equal(SR.spanWords(3600), "1 hour");
  assert.equal(SR.spanWords(90000), "1 day 1 hour");
  assert.equal(SR.spanWords(14 * 86400), "2 weeks");
  assert.equal(SR.noteFor({how: "clock", seconds: 7200}), "The clock moves on 2 hours.");
  assert.match(SR.noteFor({how: "personal", seconds: 3600}, "Anna"), /^1 hour pass for Anna alone/);
  assert.match(SR.noteFor({how: "asked", seconds: 600}), /Storyteller/);
  assert.equal(SR.noteFor({how: "none"}), "");
});

test("a scene's own place: latitude and hours from home", () => {
  assert.deepEqual(PR.cleanPlace({latitude: "30", offset: "1"}), {latitude: 30, offset: 1});
  assert.deepEqual(PR.cleanPlace({latitude: "", offset: 99}), {latitude: null, offset: PR.OFFSET_MAX});
  assert.equal(PR.hasOwnPlace({}), false);
  assert.equal(PR.hasOwnPlace({offset: -6}), true);
  const pt = PR.placeTime({latitude: 40.7, offset: -6}, 100000, 50.1);
  assert.deepEqual([pt.latitude, pt.time, pt.own], [40.7, 100000 - 6 * 3600, true]);
  const home = PR.placeTime(undefined, 5, 50.1);
  assert.deepEqual([home.latitude, home.time, home.own], [50.1, 5, false]);
  assert.equal(PR.offsetWords(0), "same hour as home");
  assert.equal(PR.offsetWords(-1), "1 hour behind home");
});

test("a far scene's sun rises at its own hour, in every era", async () => {
  const cal = await import(join(root, "modules/wodx-chronicle/scripts/calendar-math.mjs"));
  const engine = new DateEngine({epoch: [1197, 1, 1], reform: "bohemia-1584"});
  for ( const year of [1197, 1600, 1880, 1999, 2030] ) {
    const t = engine.dateToTime({year, month: 6, day: 21, hour: 12, minute: 0});
    const cairo = PR.placeTime({latitude: 30, offset: 1}, t, 50.1);
    assert.equal(engine.timeToDate(cairo.time).hour, 13, `${year}`);
    assert.ok(cal);
  }
});

test("the clock that runs with the table is off by default and waits when it should", () => {
  assert.equal(PA.cleanPace(undefined, undefined).minutes, 0);
  assert.deepEqual(PA.cleanPace(500, 0), {minutes: 240, every: 1});
  const base = {minutes: 10, every: 10, paused: false, fight: false, held: false, players: 2, last: 0, now: 10 * 60000};
  assert.equal(PA.shouldStep(base), true);
  assert.equal(PA.shouldStep({...base, now: 9 * 60000}), false);
  for ( const k of ["paused", "fight", "held"] ) assert.equal(PA.shouldStep({...base, [k]: true}), false, k);
  assert.equal(PA.shouldStep({...base, players: 0}), false);
  assert.equal(PA.shouldStep({...base, minutes: 0}), false);
  assert.equal(PA.paceWords(0, 10), "");
  assert.match(PA.paceWords(10, 10), /10 game minutes every 10 real minutes/);
});

test("a fight's length: turns times the seconds a turn takes", () => {
  assert.equal(FT.fightSeconds(5), 15);
  assert.equal(FT.fightSeconds(5, 0), 0);
  assert.equal(FT.fightSeconds(0), 0);
  assert.equal(FT.fightSeconds(4, 1000), 240);
  assert.equal(FT.fightWords(1, 3), "1 turn, about 3 seconds");
  assert.equal(FT.fightWords(30, 90), "30 turns, about 1 min 30 s");
});

test("time outside on an Otherworld journey", () => {
  assert.equal(J.timeOutside({realm: "tempest", hours: 4}).seconds, 4 * 3600);
  assert.equal(J.timeOutside({realm: "moonbridge", hours: 5}).seconds, 18);
  assert.equal(J.timeOutside({realm: "trod-silver", hours: 3, arrival: {hours: 27, slip: "lost", days: 1}}).seconds, 27 * 3600);
  assert.equal(J.timeOutside({realm: "unknown", hours: 2}).rule, "same");
  for ( const [k, t] of Object.entries(J.REALM_TIME) ) assert.ok(["same", "thousandth", "trod", "storyteller"].includes(t.rule), k);
  // Every road a journey can take has a time rule
  for ( const k of Object.keys(J.REALMS) ) assert.ok(J.REALM_TIME[k], k);
});
