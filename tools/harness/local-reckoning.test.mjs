import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Dates as each land tells them (B5870 to B5876) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const L = await imp("modules/wodx-chronicle/scripts/local-reckoning-rules.mjs");
const R = await imp("modules/wodx-chronicle/scripts/reckoning-rules.mjs");
const C = await imp("modules/wodx-chronicle/scripts/calendar-math.mjs");

const W = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const M = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const at = (y, m, day, hour = 12, minute = 0) => {
  const julian = y < 1582, jdn = julian ? C.julianToJDN(y, m, day) : C.gregorianToJDN(y, m, day);
  return {year: y, month: m, day, hour, minute, jdn, weekday: W[((jdn % 7) + 7) % 7], monthName: M[m - 1],
    sunrise: "06:10", sunset: "17:55", calendar: julian ? "julian" : "gregorian"};
};

test("local reckoning: the counts land on known days", () => {
  assert.deepEqual(C.jdnToGregorian(L.jdnOf({year: 2023, month: 9, day: 16})), {year: 2023, month: 9, day: 16});
  assert.deepEqual(L.hebrewDate(C.gregorianToJDN(2023, 9, 16)), {year: 5784, month: "Tishri", day: 1});
  assert.deepEqual(L.hebrewDate(C.gregorianToJDN(2024, 3, 11)), {year: 5784, month: "Adar II", day: 1});
  assert.equal(L.hebrewMonths(5784).reduce((s, [, n]) => s + n, 0), 383);
  assert.equal(L.creationYear(C.julianToJDN(1197, 3, 12)), 6705);
  assert.equal(L.creationYear(C.julianToJDN(1197, 9, 1)), 6706);
  assert.equal(L.cycleYear(1984).animal, "Rat");
  assert.equal(L.cycleYear(1197).element, "Fire");
  assert.deepEqual(L.japanEra(1950), {name: "Showa", year: 25});
  assert.equal(L.japanEra(1850), null);
  assert.equal(L.civilFrom("islamic", "egypt"), 1875);
  assert.equal(L.civilFrom("islamic", "arabia"), 9999);
  assert.equal(L.civilFrom("western", "moravia"), -9999);
});

test("local reckoning: the date as each land tells it", () => {
  const r = (y, m, d, faith, region, h = 12) => R.reckon(at(y, m, d, h), {faith, region});
  assert.equal(r(1197, 3, 12, "western", "moravia").date, "Wednesday, the 12th day of March, in the year of Our Lord 1197");
  assert.equal(r(1197, 3, 12, "islamic", "egypt").date, "Wednesday, the 20th of Rabi al-Thani, in the year 593 of the Hijra");
  assert.equal(r(2023, 3, 23, "islamic", "arabia").date, "Thursday, the 1st of Ramadan, in the year 1444 of the Hijra");
  assert.equal(r(1950, 3, 12, "islamic", "egypt").date, "Sunday, 12 March 1950 (the 22nd of Jumada al-Ula, in the year 1369 of the Hijra)");
  assert.equal(r(1197, 3, 12, "orthodox", "russia").date, "Wednesday, the 12th day of March, in the year 6705 from the Creation of the World");
  assert.equal(r(1850, 3, 12, "orthodox", "russia").date, "Tuesday, 28 February 1850 (Old Style)");
  assert.equal(r(1950, 3, 12, "orthodox", "russia").date, "Sunday, 12 March 1950");
  assert.equal(r(1197, 3, 12, "jewish", "").date, "Wednesday, the 20th of Adar II, in the year 4957 from the Creation");
  assert.equal(r(1197, 3, 12, "chinese", "china").date, "Wednesday, the 22nd day of the 2nd month, in the Ding-Si year, the year of the Snake");
  assert.equal(r(1930, 3, 12, "chinese", "china").date, "Wednesday, 12 March, in the 19th year of the Republic");
  assert.match(r(1984, 2, 2, "chinese", "china").date, /\(the 1st day of the 1st month, in the Jia-Zi year, the year of the Rat\)$/);
  assert.match(r(1600, 3, 12, "chinese", "korea").date, /in the Gyeongja year, the year of the Rat$/);
  assert.equal(r(1950, 3, 12, "chinese", "japan").date, "Sunday, 12 March, in the 25th year of Showa");
  assert.match(r(1197, 3, 12, "tibetan", "tibet-himalaya").date, /in the year of the Fire Snake$/);
  assert.equal(r(1197, 3, 12, "hindu", "india").date, "Wednesday, the 7th day of the dark half of Phalguna, in the year 1253 of Vikrama");
  assert.match(r(1300, 3, 12, "hindu", "nusantara").date, /of the Saka$/);
  assert.match(r(1197, 3, 12, "theravada", "southeast-asia").date, /moon of the 4th month, in the year 1740 of the Buddha$/);
  assert.equal(r(1940, 3, 12, "theravada", "southeast-asia").date, "Tuesday, 12 March, in the year 2483 of the Buddha");
  assert.match(r(1500, 3, 12, "own", "australia").date, /^The \d+(st|nd|rd|th) night of the moon, in the spring$/);
  assert.match(R.reckon(at(1500, 3, 12), {faith: "own", region: "australia", latitude: -30}).date, /in the autumn$/);
  assert.equal(R.reckon({...at(2040, 3, 12)}, {faith: "islamic", region: "egypt", eraId: "future-darkness"}).date, "2040-03-12");
  // the faith comes from the church answer when not passed
  assert.match(R.reckon(at(1197, 3, 12), {church: {faith: "islamic", region: "egypt", day: null}}).date, /of the Hijra$/);
  assert.match(R.reckon(at(1197, 3, 12), {church: {faith: "islamic", region: "egypt", day: "Ashura"}}).date, /^Wednesday, Ashura, the 20th/);
});

test("local reckoning: the hour before clocks", () => {
  assert.equal(L.prayerHour(12, 6, 18), "the noon prayer");
  assert.equal(L.prayerHour(5.5, 6, 18), "the dawn prayer, at first light");
  assert.equal(L.prayerHour(18.2, 6, 18), "the sunset prayer");
  assert.equal(L.prayerHour(19.5, 6, 18), "the night prayer");
  assert.equal(L.prayerHour(4, 6, 18), "the last of the night, before the dawn prayer");
  assert.equal(L.doubleHour(23.5), "the hour of the Rat");
  assert.equal(L.doubleHour(0.5), "the hour of the Rat");
  assert.equal(L.doubleHour(12), "the hour of the Horse");
  assert.equal(L.watchHour(7, 6, 18), "the first watch of the day");
  assert.equal(L.watchHour(2, 6, 18), "the third watch of the night");
  assert.equal(L.sunHour(12, 6, 18), "about midday");
  // clocks that strike reach the lands outside Christendom in 1700
  assert.equal(L.landStyle("striking", "islamic", 1600), "hours");
  assert.equal(L.landStyle("striking", "islamic", 1750), "striking");
  assert.equal(L.landStyle("striking", "orthodox", 1600), "striking");
  assert.equal(R.reckon(at(1600, 3, 12), {faith: "islamic", region: "anatolia"}).time, "the noon prayer");
  assert.equal(R.reckon(at(1600, 3, 12), {faith: "western", region: "moravia"}).time, "noon");
  assert.equal(R.reckon(at(1197, 3, 12, 4, 30), {faith: "chinese", region: "china"}).time, "the hour of the Tiger");
});

test("local reckoning: the clock and the opening card hear it", () => {
  assert.ok(src("modules/wodx-chronicle/scripts/church.mjs").includes("faith, region, calendar:"));
  const clock = src("modules/wodx-chronicle/scripts/clock-app.mjs");
  assert.ok(clock.includes("Players hear:"));
  assert.ok(clock.includes("reckon(now, {church: ch"));
  assert.ok(src("modules/wodx-atmosphere/scripts/main.mjs").includes("{church, eraId, latitude: here.lat}"));
  assert.ok(src("modules/wodx-atmosphere/scripts/main.mjs").includes("church?.on?.(t, {scene})"));
});

test("local reckoning: Persia's solar year from 1925 (B5874)", () => {
  const ymd = j => C.jdnToGregorian(j);
  assert.deepEqual(ymd(L.nowruz(2024)), {year: 2024, month: 3, day: 20});
  assert.deepEqual(ymd(L.nowruz(2026)), {year: 2026, month: 3, day: 21});
  assert.deepEqual(L.solarHijriDate(C.gregorianToJDN(1979, 2, 11)), {year: 1357, month: 11, day: 22});
  assert.deepEqual(L.solarHijriDate(C.gregorianToJDN(2023, 12, 22)), {year: 1402, month: 10, day: 1});
  assert.equal(L.solarHijriWords(C.gregorianToJDN(1977, 1, 1)), "the 11th of Dey, in the year 2535 of the Shah's count");
  assert.equal(R.reckon(at(1950, 3, 12), {faith: "islamic", region: "persia"}).date, "Sunday, the 21st of Esfand, in the year 1328 of the solar Hijra");
  assert.match(R.reckon(at(1900, 3, 12), {faith: "islamic", region: "persia"}).date, /of the Hijra$/);
});

test("local reckoning: a character's own count (B5875)", () => {
  assert.deepEqual(L.countOf({}, {path: {picks: {people: "jewish"}}}, "western"), {faith: "jewish", why: "people"});
  assert.deepEqual(L.countOf({}, {path: {picks: {people: {id: "arabic"}}}}, "islamic"), {faith: "islamic", why: "land"});
  assert.deepEqual(L.countOf({reckonFaith: "chinese"}, {path: {picks: {people: "jewish"}}}, "western"), {faith: "chinese", why: "pick"});
  assert.deepEqual(L.countOf({reckonFaith: "land"}, null, "hindu"), {faith: "hindu", why: "land"});
  assert.deepEqual(L.countOf({}, {path: {picks: {people: "czech"}}}, "western"), {faith: "western", why: "land"});
  const clock = src("modules/wodx-chronicle/scripts/clock-app.mjs");
  assert.ok(clock.includes('select name="reckonFaith" data-fixed') && clock.includes('setFlag(MODULE_ID, "reckonFaith"'));
  assert.ok(src("modules/wodx-atmosphere/scripts/main.mjs").includes("countOf(mine.flags"));
});
