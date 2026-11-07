import assert from "node:assert/strict";
import {test} from "node:test";
import * as M from "../scripts/calendar-math.mjs";

test("known JDNs", () => {
  assert.equal(M.gregorianToJDN(2000, 1, 1), 2451545);
  assert.equal(M.julianToJDN(1582, 10, 4), 2299160);
  assert.equal(M.gregorianToJDN(1582, 10, 15), 2299161);
  assert.deepEqual(M.jdnToGregorian(2451545), {year: 2000, month: 1, day: 1});
  assert.deepEqual(M.jdnToJulian(2299160), {year: 1582, month: 10, day: 4});
});

test("round trips over 1100 to 2100", () => {
  for ( let j = M.julianToJDN(1100, 1, 1); j < M.gregorianToJDN(2100, 1, 1); j += 97 ) {
    const g = M.jdnToGregorian(j); assert.equal(M.gregorianToJDN(g.year, g.month, g.day), j);
    const u = M.jdnToJulian(j); assert.equal(M.julianToJDN(u.year, u.month, u.day), j);
  }
});

test("Bohemia skips 7 to 16 January 1584", () => {
  const e = new M.DateEngine({reform: "bohemia-1584"});
  const jan6 = e.toJDN(1584, 1, 6);
  assert.equal(e.toJDN(1584, 1, 17), jan6 + 1);
  for ( let d = 7; d <= 16; d++ ) assert.equal(e.toJDN(1584, 1, d), null);
  assert.equal(e.daysInMonth(1584, 1), 21);
  assert.equal(e.daysInYear(1584), 366 - 10);
  assert.equal(e.fromJDN(jan6).calendar, "julian");
  assert.equal(e.fromJDN(jan6 + 1).calendar, "gregorian");
  assert.throws(() => e.dateToTime({year: 1584, month: 1, day: 10}), RangeError);
});

test("Britain skips 3 to 13 September 1752", () => {
  const e = new M.DateEngine({reform: "britain-1752"});
  assert.equal(e.toJDN(1752, 9, 14), e.toJDN(1752, 9, 2) + 1);
  assert.equal(e.daysInYear(1752), 355);
});

test("leap rules switch with the calendar", () => {
  const e = new M.DateEngine({reform: "bohemia-1584"});
  assert.equal(e.isLeap(1500), true);   // Julian
  assert.equal(e.isLeap(1700), false);  // Gregorian
  assert.equal(e.isLeap(1600), true);
  assert.equal(e.isLeap(2000), true);
  assert.equal(new M.DateEngine({reform: "julian"}).isLeap(1700), true);
});

test("epoch is 1 January 1197, a Wednesday (Julian)", () => {
  const e = new M.DateEngine();
  const d = e.timeToDate(0);
  assert.deepEqual([d.year, d.month, d.day, d.calendar], [1197, 1, 1, "julian"]);
  // 1 January 2000 was a Saturday: index 5 with Monday = 0
  assert.equal(e.timeToDate(e.dateToTime({year: 2000, month: 1, day: 1})).dayOfWeek, 5);
  // 1 January 1197 (Julian) is JDN 2158263, a Wednesday (index 2); 4 October 1582 was a Thursday
  assert.equal(d.jdn, 2158263);
  assert.equal(new M.DateEngine({reform: "catholic-1582"}).fromJDN(2299160).day, 4);
  assert.equal(2299160 % 7, 3);
  assert.equal(d.dayOfWeek, 2);
});

test("date and time round trip, including after the reform", () => {
  const e = new M.DateEngine();
  for ( const [y, m, d, h, mi] of [[1200, 3, 14, 21, 30], [1584, 1, 6, 23, 59], [1584, 1, 17, 0, 0], [1897, 10, 31, 18, 5], [2025, 12, 31, 23, 0]] ) {
    const t = e.dateToTime({year: y, month: m, day: d, hour: h, minute: mi});
    const r = e.timeToDate(t);
    assert.deepEqual([r.year, r.month, r.day, r.hour, r.minute], [y, m, d, h, mi]);
  }
});

test("moon: 13 January 2025 was a full moon, 29 January 2025 a new moon", () => {
  assert.equal(M.moonPhase(M.gregorianToJDN(2025, 1, 13) + 0.5).name, "Full moon");
  assert.equal(M.moonPhase(M.gregorianToJDN(2025, 1, 29) + 0.5).name, "New moon");
});

test("sun at Prague latitude: long winter nights, short summer nights", () => {
  const winter = M.sunTimes(M.gregorianToJDN(2025, 12, 21), 50.08);
  const summer = M.sunTimes(M.gregorianToJDN(2025, 6, 21), 50.08);
  assert.ok(winter.darkHours > 15.5 && winter.darkHours < 16.5, `winter ${winter.darkHours}`);
  assert.ok(summer.darkHours > 7.5 && summer.darkHours < 8.5, `summer ${summer.darkHours}`);
  assert.equal(M.formatHours(16.0), "16:00");
});
