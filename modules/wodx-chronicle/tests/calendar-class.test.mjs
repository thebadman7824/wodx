import assert from "node:assert/strict";
import {test} from "node:test";

class FakeBase {
  constructor(config) { Object.assign(this, structuredClone(config)); }
}
globalThis.foundry = {
  data: {CalendarData: FakeBase, SIMPLIFIED_GREGORIAN_CALENDAR_CONFIG: {
    name: "x", years: {yearZero: 0, firstWeekday: 0, leapYear: {leapStart: 8, leapInterval: 4}},
    months: {values: []}, days: {values: []},
    seasons: {values: [{name: "Spring", monthStart: 3, monthEnd: 5}, {name: "Summer", monthStart: 6, monthEnd: 8},
      {name: "Fall", monthStart: 9, monthEnd: 11}, {name: "Winter", monthStart: 12, monthEnd: 2}]}}},
  utils: {deepClone: o => structuredClone(o)}
};
const C = await import("../scripts/calendar.mjs");
const Cls = C.makeCalendarClass();
const cal = new Cls(C.makeCalendarConfig());

test("world time 0 is 1 January 1197", () => {
  const c = cal.timeToComponents(0);
  assert.equal(c.year + cal.years.yearZero, 1197);
  assert.deepEqual([c.month, c.dayOfMonth, c.day, c.season], [0, 0, 0, 3]);
});

test("durations keep Foundry's meaning", () => {
  assert.equal(cal.componentsToTime({day: 3}), 3 * 86400);
  assert.equal(cal.componentsToTime({hour: 5, minute: 30}), (5 * 3600) + 1800);
  assert.equal(cal.componentsToTime({year: 1}), 365 * 86400);
  assert.equal(cal.componentsToTime({day: -1}), -86400);
});

test("components round trip for real dates", () => {
  const e = C.getEngine();
  for ( const t of [e.dateToTime({year: 1200, month: 10, day: 31, hour: 22}), e.dateToTime({year: 1584, month: 1, day: 17, hour: 1}), e.dateToTime({year: 2025, month: 6, day: 21, hour: 23, minute: 15})] ) {
    assert.equal(cal.componentsToTime(cal.timeToComponents(t)), t);
  }
});

test("timestamp shows the real year", () => {
  const t = C.getEngine().dateToTime({year: 1200, month: 3, day: 4, hour: 21, minute: 5});
  assert.equal(Cls.formatTimestamp(cal, cal.timeToComponents(t)), "1200-03-04 21:05:00");
});

test("next dusk is ahead and at a plausible hour", () => {
  const e = C.getEngine();
  const t = e.dateToTime({year: 1200, month: 12, day: 1, hour: 10});
  const dusk = t + C.secondsToNextDusk(t, 50.08);
  const d = C.describeTime(dusk, 50.08);
  assert.ok(d.hour >= 15 && d.hour <= 17, `dusk at ${d.timeLabel}`);
  assert.equal(C.describeTime(dusk + 600, 50.08).isNight, true);
});

// B6381: the clock's Day and WoDX Actions' sun agree to the second, and the clock moved to dawn reads Day
test("night and day: one line, the sun's altitude against -0.833 degrees", async () => {
  const M = await import("../scripts/calendar-math.mjs");
  const S = await import("../../wodx-actions/scripts/sunlight-rules.js");
  const lat = 49.2;
  for ( const start of [0, 86400 * 100 + 3600 * 2, 86400 * 200 + 3600 * 20, 86400 * 300] ) {
    const toDawn = C.secondsToNextDawn(start, lat), dawn = start + toDawn;
    const before = C.describeTime(dawn - 1, lat), at = C.describeTime(dawn, lat);
    assert.equal(at.isNight, false, `day at dawn ${dawn}`);
    assert.equal(before.isNight, true, `night a second before dawn ${dawn}`);
    const dusk = dawn + C.secondsToNextDusk(dawn, lat);
    assert.equal(C.describeTime(dusk, lat).isNight, true, "night at dusk");
    assert.equal(C.describeTime(dusk - 1, lat).isNight, false, "day a second before dusk");
    for ( const t of [dawn - 1, dawn, dusk - 1, dusk, dawn + 7200] ) {
      const d = C.describeTime(t, lat);
      const g = M.jdnToGregorian(d.jdn), doy = d.jdn - M.gregorianToJDN(g.year, 1, 1) + 1;
      const pos = S.sunPosition(lat, S.declination(doy), d.hour + d.minute / 60 + d.second / 3600);
      assert.equal(S.phaseOfSun(pos.altitude) === "night", d.isNight, `Actions and the clock agree at ${t}`);
    }
  }
});
