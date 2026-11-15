/**
 * Dates as each land tells them (B5870 to B5876). Pure rules, harness-tested.
 *
 * reckoning-rules.mjs tells the date the way a Western Christian would hear it ("in the year of Our Lord"). A scene
 * that keeps another year (faith-rules.mjs, REGION_FAITH or the scene's own pick) now hears the date in that year's
 * own count, until the land took up the civil calendar; after that the civil date leads and the old count follows in
 * brackets, as almanacs and newspapers printed it.
 *
 *   orthodox   the year from the Creation of the World, starting on 1 September, on the Julian count (Old Style)
 *   islamic    the day and month of the Hijra year
 *   jewish     the day and month of the Hebrew year from the Creation
 *   chinese    the day and month of the lunar year, the year by its stem and branch and its animal; Korea in its own
 *              words; Japan by animal, and by the era of the emperor from 1868
 *   tibetan    the day and month from Losar, the year by element and animal
 *   hindu      the day of the bright or dark half of the lunar month, the Vikram year (the Saka year in the islands)
 *   theravada  the day of the waxing or waning moon of the numbered month, the year of the Buddha
 *   own        the night of the moon and the season, with no count of years
 *
 * The hour before clocks follows the land too: the prayers in the lands of Islam, the twelve double hours in the
 * lands of the Chinese year, the watches of the day and night in India and the Buddhist south, and the sun's plain
 * course elsewhere. Clocks that strike come to the lands outside Christendom in 1700 (a house reading).
 *
 * All the years of adoption and the counts are house readings of history (docs/PENDING-REVIEW.md). The books leave
 * calendars to the Storyteller. No Foundry here.
 */
import {jdnToJulian, jdnToGregorian, julianToJDN, gregorianToJDN} from "./calendar-math.mjs";
import {islamicDate, ISLAMIC_MONTHS, hebrewNewYear, hebrewYear, chineseDate, indianMonths, losar, moonBefore, moonJD} from "./faith-rules.mjs";

const ORD = n => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** The faiths whose hours were the church's (B5873). */
export const CHURCH_HOURS = new Set(["western", "orthodox"]);
/** The year striking clocks reach the lands outside Christendom (B5873, a house reading). */
export const CLOCKS_ABROAD = 1700;

/**
 * The year each land took up the civil (Gregorian) date for everyday use, by faith and then region (B5872). Before
 * it the land's own count leads; from it the civil date leads and the old count follows in brackets.
 */
export const CIVIL_FROM = {
  orthodox: {russia: 1918, siberia: 1918, aegean: 1923, "carpathians-balkans": 1919, default: 1918},
  islamic: {anatolia: 1926, egypt: 1875, levant: 1918, maghreb: 1912, persia: 1925, "central-asia": 1920, "west-africa": 1900,
    "east-africa": 1900, arabia: 9999, nusantara: 1900, philippines: 1900, default: 1900},
  jewish: {default: 1800},
  chinese: {china: 1912, korea: 1896, japan: 1873, default: 1912},
  tibetan: {default: 1951},
  hindu: {india: 1858, nusantara: 1800, default: 1858},
  theravada: {"southeast-asia": 1889, default: 1889},
  own: {default: 9999}
};
export function civilFrom(faith, region) {
  const t = CIVIL_FROM[faith];
  if ( !t ) return -9999;
  return t[region] ?? t.default;
}

/** Orthodox lands count the years from the Creation until these years (B5871). */
export const CREATION_UNTIL = {russia: 1700, siberia: 1700, aegean: 1821, default: 1700};

/** The day number of a described date. describeTime() gives jdn; a bare date falls back to its own calendar. */
export function jdnOf(d = {}) {
  if ( Number.isFinite(d.jdn) ) return d.jdn;
  const y = Number(d.year) || 1, m = Number(d.month) || 1, day = Number(d.day) || 1;
  const julian = d.calendar ? d.calendar === "julian" : y < 1582;
  return julian ? julianToJDN(y, m, day) : gregorianToJDN(y, m, day);
}

/* ------------------------------------------------------------------ the counts ---- */

/** The Byzantine year from the Creation of the World, which begins on 1 September (Julian). */
export function creationYear(jdn) {
  const j = jdnToJulian(jdn);
  return j.year + (j.month >= 9 ? 5509 : 5508);
}

/** The Hebrew months of a year, Tishri first, with their lengths. */
export function hebrewMonths(y) {
  const len = hebrewNewYear(y + 1) - hebrewNewYear(y);
  const leap = ((7 * y + 1) % 19) < 7;
  const heshvan = len % 10 === 5 ? 30 : 29, kislev = len % 10 === 3 ? 29 : 30;
  const rows = [["Tishri", 30], ["Heshvan", heshvan], ["Kislev", kislev], ["Tevet", 29], ["Shevat", 30]];
  if ( leap ) rows.push(["Adar I", 30], ["Adar II", 29]); else rows.push(["Adar", 29]);
  rows.push(["Nisan", 30], ["Iyar", 29], ["Sivan", 30], ["Tammuz", 29], ["Av", 30], ["Elul", 29]);
  return rows;
}
/** The Hebrew date of a JDN: {year, month (name), day}. */
export function hebrewDate(jdn) {
  const year = hebrewYear(jdn);
  let left = jdn - hebrewNewYear(year);
  for ( const [month, days] of hebrewMonths(year) ) {
    if ( left < days ) return {year, month, day: left + 1};
    left -= days;
  }
  return {year, month: "Elul", day: 29};
}

const STEMS = ["Jia", "Yi", "Bing", "Ding", "Wu", "Ji", "Geng", "Xin", "Ren", "Gui"];
const BRANCHES = ["Zi", "Chou", "Yin", "Mao", "Chen", "Si", "Wu", "Wei", "Shen", "You", "Xu", "Hai"];
const STEMS_KO = ["Gap", "Eul", "Byeong", "Jeong", "Mu", "Gi", "Gyeong", "Sin", "Im", "Gye"];
const BRANCHES_KO = ["ja", "chuk", "in", "myo", "jin", "sa", "o", "mi", "sin", "yu", "sul", "hae"];
export const ANIMALS = ["Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"];
const ELEMENTS = ["Wood", "Fire", "Earth", "Iron", "Water"];
/** The year of the sixty-year cycle for a lunar year that began in Gregorian year gy (1984 is Jia-Zi, the Rat). */
export function cycleYear(gy) {
  const i = (((gy - 4) % 60) + 60) % 60;
  return {index: i, stem: i % 10, branch: i % 12, animal: ANIMALS[i % 12], element: ELEMENTS[Math.floor((i % 10) / 2)]};
}
/** The emperor's era in Japan from 1868 (B5874): [first year, name]. */
export const JAPAN_ERAS = [[1868, "Meiji"], [1912, "Taisho"], [1926, "Showa"], [1989, "Heisei"], [2019, "Reiwa"]];
export function japanEra(gy) {
  let out = null;
  for ( const [from, name] of JAPAN_ERAS ) if ( gy >= from ) out = {name, year: gy - from + 1};
  return out;
}

/** The Tibetan date: months counted by new moons from Losar, the year by element and animal. */
export function tibetanDate(jdn) {
  let gy = jdnToGregorian(jdn).year;
  if ( losar(gy) > jdn ) gy--;
  const start = losar(gy);
  const nm = jd => Math.floor(moonJD(moonBefore(jd)) + 0.5 + 6 / 24);
  let month = 1, at = start;
  for ( let i = 0; i < 13; i++ ) {
    const next = nm(at + 31);
    if ( next > jdn || next <= at ) break;
    at = next; month++;
  }
  return {year: gy, month: Math.min(12, month), day: jdn - at + 1};
}

export const INDIAN_MONTHS = ["Chaitra", "Vaishakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadrapada", "Ashvin", "Kartika",
  "Margashirsha", "Pausha", "Magha", "Phalguna"];
/** The Indian lunar date: {month 1 to 12, extra, day 1 to 30, start, gy of the year's Chaitra}. */
export function indianDate(jdn) {
  const g = jdnToGregorian(jdn).year;
  const rows = [...indianMonths(g - 1), ...indianMonths(g)].filter((m, i, a) => a.findIndex(x => x.k === m.k) === i);
  const day0 = m => Math.floor(m.start + 0.5 + 5.5 / 24);
  let cur = rows[0];
  for ( const m of rows ) if ( day0(m) <= jdn ) cur = m;
  const chaitra = y => rows.find(m => m.month === 1 && !m.extra && jdnToGregorian(day0(m)).year === y);
  const ny = chaitra(g);
  const yearOf = ny && day0(ny) <= jdn ? g : g - 1;
  return {month: cur.month, extra: cur.extra, day: Math.min(30, jdn - day0(cur) + 1), gy: yearOf};
}
/** The Thai and Lao month number of an Indian month (the fifth month is Chaitra). */
const thaiMonth = indianMonth => ((indianMonth + 3) % 12) + 1;

/* ------------------------------------------------------------------ the hours ---- */

const hm = s => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s ?? "")); return m ? Number(m[1]) + Number(m[2]) / 60 : null; };

/** The hour by the five prayers (B5873). */
export function prayerHour(h, rise = 6, set = 18) {
  const noon = (rise + set) / 2, asr = noon + (set - noon) / 2;
  if ( h >= rise - 1.25 && h < rise ) return "the dawn prayer, at first light";
  if ( h >= rise && h < noon - 0.5 ) return "the morning, before the noon prayer";
  if ( h >= noon - 0.5 && h < noon + 1 ) return "the noon prayer";
  if ( h >= noon + 1 && h < asr ) return "the early afternoon";
  if ( h >= asr && h < set - 0.25 ) return "the afternoon prayer";
  if ( h >= set - 0.25 && h < set + 1 ) return "the sunset prayer";
  if ( h >= set + 1 && h < set + 2.5 ) return "the night prayer";
  if ( h >= set + 2.5 || h < 2 ) return "the dead of night";
  return "the last of the night, before the dawn prayer";
}
/** The twelve double hours: the hour of the Rat runs 23:00 to 01:00 (B5873). */
export function doubleHour(h) {
  const i = Math.floor((((Math.floor(h) + 1) % 24) + 24) % 24 / 2);
  return `the hour of the ${ANIMALS[i]}`;
}
/** The watches (prahar): four of the day from sunrise to sunset, four of the night (B5873). */
export function watchHour(h, rise = 6, set = 18) {
  const day = set - rise, night = 24 - day;
  if ( h >= rise && h < set ) return `the ${["first", "second", "third", "fourth"][Math.min(3, Math.floor((h - rise) / (day / 4)))]} watch of the day`;
  const since = ((h - set) + 24) % 24;
  return `the ${["first", "second", "third", "fourth"][Math.min(3, Math.floor(since / (night / 4)))]} watch of the night`;
}
/** The sun's own course, for peoples who keep no hours. */
export function sunHour(h, rise = 6, set = 18) {
  const noon = (rise + set) / 2;
  if ( h >= rise - 1 && h < rise + 0.75 ) return "first light";
  if ( h >= rise + 0.75 && h < noon - 1 ) return "the morning";
  if ( h >= noon - 1 && h < noon + 1 ) return "about midday";
  if ( h >= noon + 1 && h < set - 1 ) return "the afternoon";
  if ( h >= set - 1 && h < set + 1 ) return "dusk";
  if ( h >= set + 1 && h < set + 3 ) return "the evening";
  return "the dead of night";
}
/** The hour before clocks, as the faith's people name it. */
export function landHour(faith, hour, sunrise, sunset) {
  const rise = Number.isFinite(sunrise) ? sunrise : 6, set = Number.isFinite(sunset) ? sunset : 18;
  if ( faith === "islamic" ) return prayerHour(hour, rise, set);
  if ( faith === "chinese" ) return doubleHour(hour);
  if ( faith === "hindu" || faith === "theravada" ) return watchHour(hour, rise, set);
  return sunHour(hour, rise, set);
}

/* ------------------------------------------------------------------ the date ---- */

const SEASONS_N = ["winter", "winter", "spring", "spring", "spring", "summer", "summer", "summer", "autumn", "autumn", "autumn", "winter"];
const SEASONS_S = ["summer", "summer", "autumn", "autumn", "autumn", "winter", "winter", "winter", "spring", "spring", "spring", "summer"];

/** The year in the land's own count, as words: "in the year 593 of the Hijra". */
export function ownYear(faith, jdn, {region = ""} = {}) {
  const g = jdnToGregorian(jdn);
  switch ( faith ) {
    case "orthodox": return `in the year ${creationYear(jdn)} from the Creation of the World`;
    case "islamic": return `in the year ${islamicDate(jdn).year} of the Hijra`;
    case "jewish": return `in the year ${hebrewDate(jdn).year} from the Creation`;
    case "chinese": {
      const c = chineseDate(jdn), y = cycleYear(c.year);
      if ( region === "korea" ) return `in the ${STEMS_KO[y.stem]}${BRANCHES_KO[y.branch]} year, the year of the ${y.animal}`;
      if ( region === "japan" ) {
        const era = japanEra(c.year);
        return era ? `in the ${ORD(era.year)} year of ${era.name}` : `in the year of the ${y.animal}`;
      }
      return `in the ${STEMS[y.stem]}-${BRANCHES[y.branch]} year, the year of the ${y.animal}`;
    }
    case "tibetan": { const y = cycleYear(tibetanDate(jdn).year); return `in the year of the ${y.element} ${y.animal}`; }
    case "hindu": {
      const i = indianDate(jdn);
      return region === "nusantara" ? `in the year ${i.gy - 78} of the Saka` : `in the year ${i.gy + 57} of Vikrama`;
    }
    case "theravada": return `in the year ${g.year + 543} of the Buddha`;
    default: return "";
  }
}

/** The day and month in the land's own count, without the year: "the 12th of Ramadan". */
export function ownDay(faith, jdn, {region = "", latitude = 50} = {}) {
  switch ( faith ) {
    case "orthodox": { const j = jdnToJulian(jdn); return `the ${ORD(j.day)} day of ${MONTHS[j.month - 1]}`; }
    case "islamic": { const h = islamicDate(jdn); return `the ${ORD(h.day)} of ${ISLAMIC_MONTHS[h.month - 1]}`; }
    case "jewish": { const h = hebrewDate(jdn); return `the ${ORD(h.day)} of ${h.month}`; }
    case "chinese": { const c = chineseDate(jdn); return `the ${ORD(c.day)} day of the ${c.leap ? "leap " : ""}${ORD(c.month)} month`; }
    case "tibetan": { const t = tibetanDate(jdn); return `the ${ORD(t.day)} day of the ${ORD(t.month)} month`; }
    case "hindu": {
      const i = indianDate(jdn), half = i.day <= 15 ? "bright" : "dark", n = i.day <= 15 ? i.day : i.day - 15;
      return `the ${ORD(n)} day of the ${half} half of ${i.extra ? "the extra " : ""}${INDIAN_MONTHS[i.month - 1]}`;
    }
    case "theravada": {
      const i = indianDate(jdn), wax = i.day <= 15, n = wax ? i.day : i.day - 15;
      return `the ${ORD(n)} day of the ${wax ? "waxing" : "waning"} moon of the ${ORD(thaiMonth(i.month))} month`;
    }
    case "own": {
      const g = jdnToGregorian(jdn);
      const night = Math.max(1, Math.floor(jdn - Math.floor(moonJD(moonBefore(jdn + 0.5)) + 0.5)) + 1);
      const season = (Number(latitude) < 0 ? SEASONS_S : SEASONS_N)[g.month - 1];
      return `the ${ORD(Math.min(30, night))} night of the moon, in the ${season}`;
    }
    default: return "";
  }
}

/** The civil date as printed: "Friday, 3 March 1950". Orthodox lands before their reform print the Julian date. */
function civilDate(d, jdn, faith, region) {
  if ( faith === "orthodox" && d.year < civilFrom("orthodox", region) ) {
    const j = jdnToJulian(jdn);
    return `${d.weekday}, ${j.day} ${MONTHS[j.month - 1]} ${j.year}`;
  }
  return `${d.weekday}, ${d.day} ${d.monthName} ${d.year}`;
}

/**
 * The date as the land tells it. d: describeTime()'s result; faith: the year kept there (faith-rules.mjs);
 * opts: {region, latitude, feast: the day's own name, style: reckon()'s style}. Returns the date line or null for
 * the Western church, which reckoning-rules.mjs tells.
 */
export function landDate(d, faith, {region = "", latitude = 50, feast = null, style = "hours"} = {}) {
  if ( !faith || faith === "western" || !d ) return null;
  const jdn = jdnOf(d);
  const named = feast ? `, ${feast}` : "";
  if ( style === "digital" ) return null;
  if ( faith === "orthodox" ) {
    const until = CREATION_UNTIL[region] ?? CREATION_UNTIL.default;
    if ( d.year < until ) return `${d.weekday}${named || `, ${ownDay(faith, jdn)}`}, ${ownYear(faith, jdn)}`;
    if ( d.year < civilFrom(faith, region) ) return `${civilDate(d, jdn, faith, region)} (Old Style)`;
    return null;
  }
  if ( faith === "own" ) {
    if ( d.year >= civilFrom(faith, region) ) return null;
    const day = ownDay(faith, jdn, {latitude});
    return `${day[0].toUpperCase()}${day.slice(1)}${named}`;
  }
  if ( faith === "theravada" && d.year >= civilFrom(faith, region) ) return `${d.weekday}, ${d.day} ${d.monthName}, ${ownYear(faith, jdn, {region})}`;
  if ( faith === "chinese" && region === "japan" && d.year >= civilFrom(faith, region) ) {
    const era = japanEra(d.year);
    return `${d.weekday}, ${d.day} ${d.monthName}${era ? `, in the ${ORD(era.year)} year of ${era.name}` : ` ${d.year}`}`;
  }
  if ( faith === "chinese" && region !== "korea" && region !== "japan" && d.year >= 1912 && d.year < 1949 )
    return `${d.weekday}, ${d.day} ${d.monthName}, in the ${ORD(d.year - 1911)} year of the Republic`;
  const own = `${ownDay(faith, jdn, {region})}, ${ownYear(faith, jdn, {region})}`;
  if ( d.year < civilFrom(faith, region) ) return `${d.weekday}${named}, ${own}`;
  return `${civilDate(d, jdn, faith, region)} (${own})`;
}

/** Which way the land tells the hour: clocks reach the lands outside Christendom in CLOCKS_ABROAD (B5873). */
export function landStyle(style, faith, year) {
  if ( style === "striking" && faith && !CHURCH_HOURS.has(faith) && Number(year) < CLOCKS_ABROAD ) return "hours";
  return style;
}

/** The hour as the land tells it before clocks, or null where reckoning-rules.mjs already does. */
export function landTime(d, faith) {
  if ( !faith || CHURCH_HOURS.has(faith) ) return null;
  const hour = (Number(d?.hour) || 0) + (Number(d?.minute) || 0) / 60;
  return landHour(faith, hour, hm(d?.sunrise), hm(d?.sunset));
}
