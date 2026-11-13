/**
 * WoDX Chronicle 0.49.0: the holy days of the world's great faiths (B2535 to B2537). Pure, harness-tested.
 *
 * church-rules.mjs knows the Western church year. A chronicle or a scene that stands elsewhere keeps another year:
 *
 *   orthodox   the Eastern church: the Julian count for good, its own Easter, four long fasts
 *   islamic    the lunar year of twelve months that walks through the seasons; Ramadan and the two feasts
 *   jewish     the Hebrew year; the Sabbath, the Days of Awe, the pilgrim feasts
 *   hindu      the lunar months of the north Indian count; Holi, the Nine Nights, Diwali
 *   theravada  the full-moon days of the southern Buddhists, the Rains retreat, the April new year
 *   tibetan    Losar, the Great Prayer, Saga Dawa
 *   chinese    the lunar year of China, kept under other names in Korea and in Japan until 1873
 *   own        the people keep a count of their own; the Storyteller names the days
 *
 * Every faith answers in the same shape as churchDay(), so curfews, crowds and hunting read any of them.
 *
 * How exact: the Orthodox and Jewish years are reckoned by rule and are right to the day. The Islamic year is the
 * counted (tabular) one; a month that waits on the sighted moon can start a day either side. The Hindu, Buddhist
 * and Chinese years are worked from the true new moon and the sun's place (short series, good to minutes), with the
 * modern rules used for every age, so an old date can stand a day off, or a month where the old calendars put a leap
 * month elsewhere. All of that is a house reading, rounded for play; the books give no such tables.
 */
import {jdnToJulian, jdnToGregorian, julianToJDN, gregorianToJDN} from "./calendar-math.mjs";
import {easterJDN, churchDay, churchLabel, OBSERVANCE} from "./church-rules.mjs";

/* ------------------------------------------------------------------ the sky ---- */

const RAD = Math.PI / 180;
const sin = d => Math.sin(d * RAD);
const norm = d => ((d % 360) + 360) % 360;

/** The moment (Julian Date) of the new moon number k (k = 0 is 6 January 2000); k + 0.5 gives the full moon. */
export function moonJD(k) {
  const T = k / 1236.85, full = Math.abs((k % 1 + 1) % 1 - 0.5) < 0.01;
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  const M = 2.5534 + 29.1053567 * k - 0.0000014 * T * T;
  const Mp = 201.5643 + 385.81693528 * k + 0.0107582 * T * T;
  const F = 160.7108 + 390.67050284 * k - 0.0016118 * T * T;
  let jd = 2451550.09766 + 29.530588861 * k + 0.00015437 * T * T;
  const c = full
    ? [-0.40614, 0.17302, 0.01614, 0.01043, 0.00734, -0.00515, 0.00209, -0.00111]
    : [-0.4072, 0.17241, 0.01608, 0.01039, 0.00739, -0.00514, 0.00208, -0.00111];
  jd += c[0] * sin(Mp) + c[1] * E * sin(M) + c[2] * sin(2 * Mp) + c[3] * sin(2 * F) + c[4] * E * sin(Mp - M)
    + c[5] * E * sin(Mp + M) + c[6] * E * E * sin(2 * M) + c[7] * sin(Mp - 2 * F)
    - 0.00057 * sin(Mp + 2 * F) + 0.00056 * E * sin(2 * Mp + M) - 0.00042 * sin(3 * Mp) + 0.00042 * E * sin(M + 2 * F)
    + 0.00038 * E * sin(M - 2 * F) - 0.00024 * E * sin(2 * Mp - M);
  return jd;
}
/** The number of the last new moon at or before a Julian Date. */
export function moonBefore(jd) {
  let k = Math.floor((jd - 2451550.09766) / 29.530588861) + 1;
  while ( moonJD(k) > jd ) k--;
  return k;
}
/** The sun's place along its yearly road, in degrees from the spring equinox. */
export function sunLongitude(jd) {
  const T = (jd - 2451545) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M) + (0.019993 - 0.000101 * T) * sin(2 * M) + 0.000289 * sin(3 * M);
  return norm(L0 + C - 0.00569 - 0.00478 * sin(125.04 - 1934.136 * T));
}
/** The sun's place against the fixed stars, as the Indian calendars count it. */
export const siderealSun = jd => norm(sunLongitude(jd) - (23.853 + 1.3969 * (jd - 2451545) / 36525));
/** The moment the sun (by fn) reaches a longitude, searched from a first guess. */
function sunAt(target, guess, fn = sunLongitude) {
  let jd = guess;
  for ( let i = 0; i < 8; i++ ) {
    let d = norm(target - fn(jd)); if ( d > 180 ) d -= 360;
    jd += d * 365.2422 / 360;
    if ( Math.abs(d) < 1e-5 ) break;
  }
  return jd;
}
/** The local calendar day (a JDN) of a moment, at a number of hours east of Greenwich. */
const dayOf = (jd, hours = 0) => Math.floor(jd + 0.5 + hours / 24);
const weekday = jdn => ((jdn % 7) + 7) % 7; // 0 = Monday

/* ------------------------------------------------------------------ the faiths ---- */

export const FAITHS = {
  western: {label: "The Western church", year: "Church year"},
  orthodox: {label: "The Eastern church", year: "Church year"},
  islamic: {label: "Islam", year: "The Muslim year"},
  jewish: {label: "The Jewish year", year: "The Jewish year"},
  hindu: {label: "The Hindu year", year: "The Hindu year"},
  theravada: {label: "The Buddhist year of the south", year: "The Buddhist year"},
  tibetan: {label: "The Buddhist year of Tibet", year: "The Tibetan year"},
  chinese: {label: "The lunar year of China, Korea and Japan", year: "The lunar year"},
  own: {label: "A count of their own", year: "Holy days"}
};

/** Which year a region keeps, by the first year it does: [[from, faith], ...]. A house reading of history. */
const W = [[-9999, "western"]], I = [[-9999, "islamic"]], O = [[-9999, "orthodox"]];
const late = year => [[-9999, "own"], [year, "western"]];
export const REGION_FAITH = {
  "moravia": W, "german-lands": W, "british-isles": W, "france": W, "iberia": W, "italy": W, "low-countries": W,
  "scandinavia": W, "poland-baltic": W, "carpathians-balkans": W,
  "russia": O, "aegean": O, "siberia": [[-9999, "own"], [1600, "orthodox"]],
  "anatolia": I, "levant": I, "egypt": I, "arabia": I, "maghreb": I, "persia": I, "central-asia": I,
  "west-africa": I, "east-africa": I,
  "tibet-himalaya": [[-9999, "tibetan"]], "india": [[-9999, "hindu"]], "china": [[-9999, "chinese"]],
  "japan": [[-9999, "chinese"]], "korea": [[-9999, "chinese"]], "southeast-asia": [[-9999, "theravada"]],
  "nusantara": [[-9999, "hindu"], [1500, "islamic"]],
  "southern-africa": late(1652), "central-africa": late(1885), "canada": late(1608), "north-america-east": late(1607),
  "north-america-west": late(1769), "mexico": late(1521), "caribbean": late(1492), "andes": late(1533),
  "brazil": late(1500), "southern-cone": late(1536), "australia": late(1788), "aotearoa": late(1840),
  "pacific-islands": late(1820), "arctic": late(1721), "antarctica": [[-9999, "own"]]
};
/** The year a region keeps in a given year of the chronicle. */
export function faithFor(regionId, year) {
  const rows = REGION_FAITH[regionId] ?? W;
  let out = rows[0][1];
  for ( const [from, f] of rows ) if ( Number(year) >= from ) out = f;
  return out;
}

/** How strictly a faith's year is kept: [strict until, by custom until]; after that lightly. */
const KEPT = {
  western: [1600, 1850], orthodox: [1700, 1917], islamic: [1920, 9999], jewish: [1800, 1900], hindu: [1900, 9999],
  theravada: [1900, 9999], tibetan: [1950, 9999], chinese: [1900, 1949], own: [9999, 9999]
};
export function observanceOf(faith, year) {
  const [a, b] = KEPT[faith] ?? KEPT.western, y = Number(year) || 0;
  return y < a ? "strict" : y < b ? "custom" : "light";
}

/* What a day does at the table, the same house rule as the Western year ("Feast and fast days"). */
const REVEL = "the streets stay busy late and the curfew starts at midnight. Hunting in town is 1 easier.";
const QUIET = "few are out after dark and the cookshops are shut or quiet. Hunting in town is 1 harder.";

/** Build the answer every faith gives. spec: {feast, named, fast, season, revel, quiet, lines, eve}. */
function answer(faith, date, spec, opts = {}) {
  const observance = OBSERVANCE[opts.observance] ? opts.observance : observanceOf(faith, date.year);
  const feast = spec.feast ?? null;
  const dayName = [...new Set([feast, spec.named].filter(Boolean))].join("; ") || null;
  const revel = !!spec.revel && (observance !== "light" || spec.revel === "always");
  const strictFast = observance === "strict" && !!spec.quiet && !revel;
  const lines = [];
  if ( revel ) lines.push(`${spec.revelLine ?? "A night of celebration"}: ${REVEL}`);
  else if ( strictFast ) lines.push(`${spec.quietLine ?? "A fast kept strictly"}: ${QUIET}`);
  else if ( feast && observance !== "light" ) lines.push(spec.feastLine ?? "A holy day: no work, the market shut.");
  for ( const l of spec.lines ?? [] ) if ( observance !== "light" || l.always ) lines.push(l.text ?? l);
  return {faith, calendar: FAITHS[faith].year, feast, day: dayName, vigil: null, fast: spec.fast ?? null, ember: false,
    season: spec.season ?? "Ordinary days", observance, revel, crowd: revel ? "busy" : strictFast ? "quiet" : null,
    curfewStart: revel ? 24 : null, huntStep: revel ? -1 : strictFast ? 1 : 0, lines};
}
const pick = (rows, test) => rows.find(test)?.at(-1) ?? null;

/* ------------------------------------------------------------------ the Eastern church ---- */

const ORTHODOX_FIXED = [[1, 1, "St Basil's Day"], [1, 6, "Theophany"], [2, 2, "The Meeting of the Lord"], [3, 25, "The Annunciation"],
  [6, 24, "The Nativity of St John"], [6, 29, "Sts Peter and Paul"], [8, 6, "The Transfiguration"], [8, 15, "The Dormition"],
  [9, 8, "The Nativity of the Mother of God"], [9, 14, "The Exaltation of the Cross"], [11, 21, "The Entry into the Temple"],
  [12, 25, "The Nativity"], [12, 26, "The second day of the Nativity"]];
const ORTHODOX_MOVABLE = [[-7, "Palm Sunday"], [0, "Pascha"], [1, "Bright Monday"], [39, "The Ascension"], [49, "Pentecost"], [50, "The Day of the Holy Spirit"]];
const ORTHODOX_DAYS = [[-48, "Clean Monday"], [-49, "Forgiveness Sunday"], [-8, "Lazarus Saturday"], [-3, "Great Thursday"], [-2, "Great Friday"], [-1, "Great Saturday"]];

/** The Eastern church's day. The fixed feasts follow the Julian count whatever the civil calendar says. */
export function orthodoxDay(date, opts = {}) {
  const j = jdnToJulian(date.jdn), dow = weekday(date.jdn);
  const off = date.jdn - easterJDN(j.year, "julian");
  const fixed = pick(ORTHODOX_FIXED, ([m, d]) => m === j.month && d === j.day);
  const feast = pick(ORTHODOX_MOVABLE, ([o]) => o === off) ?? fixed;
  const named = pick(ORTHODOX_DAYS, ([o]) => o === off)
    ?? (j.month === 12 && j.day === 24 ? "The eve of the Nativity" : j.month === 1 && j.day === 5 ? "The eve of Theophany" : j.month === 6 && j.day === 23 ? "St John's Eve" : null);
  let season = "Ordinary days", fast = null;
  const md = j.month * 100 + j.day;
  if ( off >= -55 && off <= -49 ) season = "Butter Week";
  else if ( off >= -48 && off <= -8 ) season = "Great Lent";
  else if ( off >= -7 && off <= -1 ) season = "Holy Week";
  else if ( off >= 0 && off <= 6 ) season = "Bright Week";
  else if ( off >= 7 && off <= 49 ) season = "Paschaltide";
  else if ( off >= 57 && md <= 628 ) season = "The Apostles' fast";
  else if ( md >= 801 && md <= 814 ) season = "The Dormition fast";
  else if ( md >= 1115 && md <= 1224 ) season = "The Nativity fast";
  else if ( md >= 1225 || md <= 105 ) season = "The holy days of Yule";
  if ( off === -2 ) fast = "Great Friday, the strictest fast";
  else if ( season === "Great Lent" || season === "Holy Week" ) fast = "The Great Fast";
  else if ( /fast$/.test(season) ) fast = season;
  else if ( (md === 105 || md === 829 || md === 914) ) fast = "A fast day";
  else if ( (dow === 2 || dow === 4) && !feast && season !== "Bright Week" && season !== "The holy days of Yule" && season !== "Butter Week" ) fast = `${dow === 2 ? "Wednesday" : "Friday"}: no meat`;
  const revelNames = ["Great Saturday", "Forgiveness Sunday", "St John's Eve", "The eve of Theophany"];
  const revel = revelNames.includes(named) || (season === "Butter Week" && off >= -51) || (md === 1225);
  return answer("orthodox", date, {feast, named, fast, season, revel: revel ? (off === -1 ? "always" : true) : false,
    revelLine: off === -1 ? "The Paschal vigil; the whole town is in the streets at midnight" : season === "Butter Week" ? "The last nights of Butter Week" : "A night of celebration",
    quiet: !!fast && !/no meat$/.test(fast), quietLine: "A fast kept strictly",
    feastLine: "A holy day: no work, the church full from the dawn liturgy, the market shut.",
    lines: [season === "Great Lent" ? "The Great Fast: no weddings, no meat, eggs or milk." : null,
      fast && /no meat$/.test(fast) ? "A Wednesday or Friday: no meat at any table." : null].filter(Boolean)}, opts);
}

/* ------------------------------------------------------------------ Islam ---- */

const ISLAMIC_EPOCH = 1948440;
export const ISLAMIC_MONTHS = ["Muharram", "Safar", "Rabi al-Awwal", "Rabi al-Thani", "Jumada al-Ula", "Jumada al-Akhira", "Rajab", "Shaban", "Ramadan", "Shawwal", "Dhu al-Qada", "Dhu al-Hijja"];
/** The JDN of a day of the counted Muslim year. */
export const islamicToJDN = (y, m, d) => ISLAMIC_EPOCH + (y - 1) * 354 + Math.floor((3 + 11 * y) / 30) + Math.ceil(29.5 * (m - 1)) + d - 1;
/** The counted Muslim date of a JDN: {year, month, day}. */
export function islamicDate(jdn) {
  let year = Math.floor((30 * (jdn - ISLAMIC_EPOCH) + 10646) / 10631);
  while ( islamicToJDN(year + 1, 1, 1) <= jdn ) year++;
  while ( islamicToJDN(year, 1, 1) > jdn ) year--;
  let month = 12;
  while ( month > 1 && islamicToJDN(year, month, 1) > jdn ) month--;
  return {year, month, day: jdn - islamicToJDN(year, month, 1) + 1};
}
const ISLAMIC_FEASTS = [[10, 1, "Eid al-Fitr, the feast that ends the fast"], [10, 2, "The second day of Eid al-Fitr"], [10, 3, "The third day of Eid al-Fitr"],
  [12, 10, "Eid al-Adha, the feast of the sacrifice"], [12, 11, "The second day of Eid al-Adha"], [12, 12, "The third day of Eid al-Adha"]];
const ISLAMIC_DAYS = [[1, 1, "The first day of the year"], [1, 10, "Ashura"], [3, 12, "The Prophet's birthday"], [7, 27, "The Night Journey"],
  [8, 15, "The middle night of Shaban"], [9, 27, "The Night of Power"], [12, 9, "The Day of Arafat"]];

export function islamicDay(date, opts = {}) {
  const h = islamicDate(date.jdn), dow = weekday(date.jdn);
  const feast = pick(ISLAMIC_FEASTS, ([m, d]) => m === h.month && d === h.day);
  const named = pick(ISLAMIC_DAYS, ([m, d]) => m === h.month && d === h.day);
  const ramadan = h.month === 9;
  const mourning = named === "Ashura" && opts.region === "persia";
  const season = ramadan ? "Ramadan" : h.month === 12 && h.day <= 13 ? "The days of the pilgrimage" : ISLAMIC_MONTHS[h.month - 1];
  const fast = ramadan ? "The fast of Ramadan, from first light to sunset" : named === "Ashura" ? "Ashura, a fast for the devout" : null;
  const revel = ramadan || !!feast || named === "The Prophet's birthday" || named === "The middle night of Shaban";
  const lines = [];
  if ( ramadan ) lines.push("By day the streets are slow and no one eats or drinks in the open; at sunset the fast breaks and the town wakes.");
  if ( dow === 4 ) lines.push("A Friday: the shops shut at noon for the prayer at the great mosque.");
  if ( mourning ) lines.push("The mourning for Husayn: processions by day, no music, no weddings.");
  return answer("islamic", date, {feast, named: named && named !== "Ashura" ? named : (named ? "Ashura" : null), fast, season,
    revel: mourning ? false : revel, quiet: mourning,
    revelLine: ramadan ? "A night of Ramadan" : "A night of celebration", quietLine: "A day of mourning",
    feastLine: "A feast day: prayers at dawn, visits and gifts, no work.", lines}, opts);
}

/* ------------------------------------------------------------------ the Jewish year ---- */

function hebrewElapsed(y) {
  const months = Math.floor((235 * y - 234) / 19), parts = 12084 + 13753 * months;
  const days = 29 * months + Math.floor(parts / 25920);
  return (3 * (days + 1)) % 7 < 3 ? days + 1 : days;
}
/** The JDN of the first day of a Hebrew year (Rosh Hashanah). */
export function hebrewNewYear(y) {
  const a = hebrewElapsed(y - 1), b = hebrewElapsed(y), c = hebrewElapsed(y + 1);
  const delay = (c - b === 356) ? 2 : (b - a === 382) ? 1 : 0;
  return 347998 + b + delay;
}
/** The Hebrew year a JDN falls in. */
export function hebrewYear(jdn) {
  let y = jdnToGregorian(jdn).year + 3761;
  while ( hebrewNewYear(y) > jdn ) y--;
  while ( hebrewNewYear(y + 1) <= jdn ) y++;
  return y;
}
export function jewishDay(date, opts = {}) {
  const y = hebrewYear(date.jdn), ny = hebrewNewYear(y), next = hebrewNewYear(y + 1), len = next - ny;
  const d = date.jdn - ny, dow = weekday(date.jdn);
  const pesach = next - 163, kislev25 = 30 + (len % 10 === 5 ? 30 : 29) + 24;
  let av9 = pesach + 112; if ( weekday(av9) === 5 ) av9 += 1;
  const p = date.jdn - pesach;
  let feast = null, named = null, fast = null, season = "Ordinary days", revel = false;
  if ( d === 0 || d === 1 ) feast = "Rosh Hashanah, the new year";
  else if ( d === 9 ) { feast = "Yom Kippur, the Day of Atonement"; fast = "Yom Kippur, a full day's fast"; }
  else if ( d === 14 || d === 15 ) feast = "Sukkot, the feast of booths";
  else if ( d >= 16 && d <= 20 ) named = "The days of Sukkot";
  else if ( d === 21 ) feast = "Shemini Atzeret";
  else if ( d === 22 ) { feast = "Simchat Torah"; revel = true; }
  else if ( d >= kislev25 && d < kislev25 + 8 ) named = `Hanukkah, the ${["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth"][d - kislev25]} light`;
  else if ( p === -30 ) { named = "Purim"; revel = true; }
  else if ( p === 0 || p === 1 || p === 6 || p === 7 ) feast = "Passover";
  else if ( p >= 2 && p <= 5 ) named = "The days of Passover";
  else if ( p === 50 || p === 51 ) feast = "Shavuot, the feast of weeks";
  else if ( date.jdn === av9 ) { named = "The Ninth of Av"; fast = "The Ninth of Av, a fast of mourning"; }
  if ( d >= 0 && d <= 9 ) season = "The Days of Awe";
  else if ( p >= 1 && p < 50 ) season = "The counting of the Omer";
  else if ( date.jdn > av9 - 22 && date.jdn < av9 ) season = "The three weeks of mourning";
  if ( dow === 5 && !feast ) named = named ? `The Sabbath; ${named}` : "The Sabbath";
  const lines = [];
  if ( dow === 5 || feast ) lines.push({text: "No work, no fire lit, no business done from the sunset before to nightfall; the quarter's shops are shut.", always: true});
  else if ( dow === 4 ) lines.push("A Friday: the quarter shuts early and the Sabbath begins at sunset.");
  return answer("jewish", date, {feast, named, fast, season, revel, quiet: !!fast,
    revelLine: "A night of rejoicing in the quarter", quietLine: "A fast kept strictly",
    feastLine: "A holy day, kept from the sunset before: the synagogue full, no work.", lines}, opts);
}

/* ------------------------------------------------------------------ the lunar years of Asia ---- */

const cache = new Map();
function memo(key, make) { if ( !cache.has(key) ) { if ( cache.size > 400 ) cache.clear(); cache.set(key, make()); } return cache.get(key); }

/** The Chinese year that starts in a Gregorian year: {newYear, months: [{start, month, leap}]}, days as JDN at Beijing. */
export function chineseYear(gy) {
  return memo(`cn${gy}`, () => {
    const TZ = 8;
    const solstice = y => sunAt(270, gregorianToJDN(y, 12, 21));
    const run = y => { // the months from the one holding the winter solstice of y to the next such
      const s0 = solstice(y), s1 = solstice(y + 1);
      let k0 = moonBefore(s0 + 1); while ( dayOf(moonJD(k0), TZ) > dayOf(s0, TZ) ) k0--;
      let k1 = moonBefore(s1 + 1); while ( dayOf(moonJD(k1), TZ) > dayOf(s1, TZ) ) k1--;
      const starts = []; for ( let k = k0; k <= k1; k++ ) starts.push(dayOf(moonJD(k), TZ));
      const leapYear = (k1 - k0) === 13;
      const term = jdn => Math.floor(norm(sunLongitude(jdn - 0.5 - TZ / 24) + 0.0001) / 30); // the sun's sign at the day's start
      const out = []; let num = 11, leapt = false;
      for ( let i = 0; i < starts.length - 1; i++ ) {
        let leap = false;
        if ( i > 0 ) {
          if ( leapYear && !leapt && term(starts[i]) === term(starts[i + 1]) ) { leap = true; leapt = true; }
          else num = (num % 12) + 1;
        }
        out.push({start: starts[i], end: starts[i + 1], month: num, leap});
      }
      return out;
    };
    const months = [...run(gy - 1), ...run(gy)].filter((m, i, a) => a.findIndex(x => x.start === m.start) === i);
    const first = months.findIndex(m => m.month === 1 && !m.leap && jdnToGregorian(m.start).year === gy);
    const end = months.findIndex((m, i) => i > first && m.month === 1 && !m.leap);
    const year = months.slice(first, end < 0 ? undefined : end);
    return {newYear: year[0].start, months: year};
  });
}
/** The Chinese date of a JDN: {year (the Gregorian year its new year fell in), month, leap, day, newYear, eve}. */
export function chineseDate(jdn) {
  let gy = jdnToGregorian(jdn).year;
  if ( chineseYear(gy).newYear > jdn ) gy--;
  const y = chineseYear(gy), m = y.months.find(x => jdn >= x.start && jdn < x.end) ?? y.months.at(-1);
  return {year: gy, month: m.month, leap: m.leap, day: jdn - m.start + 1, newYear: y.newYear, eve: chineseYear(gy + 1).newYear - 1};
}
const CHINESE_NAMES = {
  china: {ny: "The Spring Festival, the new year", eve: "New Year's Eve", lantern: "The Lantern Festival", tomb: "Qingming, the sweeping of the tombs",
    boat: "The Dragon Boat Festival", seven: "The Night of Sevens", ghost: "The Ghost Festival", moon: "The Mid-Autumn Festival", nine: "The Double Ninth", winter: "The winter solstice feast"},
  korea: {ny: "Seollal, the new year", eve: "New Year's Eve", lantern: "Daeboreum, the first full moon", tomb: "Hansik, the day of cold food",
    boat: "Dano", seven: "Chilseok", ghost: "Baekjung", moon: "Chuseok, the harvest moon", nine: "The Double Ninth", winter: "Dongji, the winter solstice"},
  japan: {ny: "Shogatsu, the new year", eve: "Omisoka, the last night of the year", lantern: "The Little New Year", tomb: "The spring rites for the dead",
    boat: "Tango, the fifth day of the fifth month", seven: "Tanabata", ghost: "Obon, the return of the dead", moon: "Tsukimi, moon viewing", nine: "The chrysanthemum feast", winter: "Toji, the winter solstice"}
};
/** Japan after 1873 keeps its feasts on the civil calendar. */
const JAPAN_CIVIL = [[1, 1, "ny"], [1, 2, "ny"], [1, 3, "ny"], [1, 15, "lantern"], [5, 5, "boat"], [7, 7, "seven"], [8, 13, "ghost"], [8, 14, "ghost"], [8, 15, "ghost"], [8, 16, "ghost"], [12, 31, "eve"]];

export function chineseDay(date, opts = {}) {
  const names = CHINESE_NAMES[opts.region] ?? CHINESE_NAMES.china;
  let key = null, season = "Ordinary days", c = null;
  const g = jdnToGregorian(date.jdn);
  if ( opts.region === "japan" && date.year >= 1873 ) {
    key = pick(JAPAN_CIVIL, ([m, d]) => m === g.month && d === g.day);
    if ( g.month === 1 && g.day <= 7 ) season = "The first days of the year";
    if ( g.month === 8 && g.day >= 13 && g.day <= 16 ) season = "Obon";
  } else {
    c = chineseDate(date.jdn);
    const md = c.leap ? 0 : c.month * 100 + c.day;
    if ( date.jdn === c.eve ) key = "eve";
    else if ( md >= 101 && md <= 103 ) key = "ny";
    else if ( md === 115 ) key = "lantern";
    else if ( md === 505 ) key = "boat";
    else if ( md === 707 ) key = "seven";
    else if ( md === 715 ) key = "ghost";
    else if ( md === 815 ) key = "moon";
    else if ( md === 909 ) key = "nine";
    if ( md >= 101 && md <= 115 ) season = "The fifteen days of the new year";
    else if ( md >= 701 && md <= 730 ) season = "The ghost month";
    else if ( md >= 1223 ) season = "The last days of the year";
    else season = `${c.leap ? "The leap " : "The "}${["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth"][c.month - 1]} month`;
  }
  // Two days that follow the sun: the tomb sweeping and the winter solstice
  if ( !key ) {
    const here = dayOf(sunAt(15, gregorianToJDN(g.year, 4, 5)), 8), sol = dayOf(sunAt(270, gregorianToJDN(g.year, 12, 21)), 8);
    if ( date.jdn === here ) key = "tomb"; else if ( date.jdn === sol ) key = "winter";
  }
  const feast = ["ny", "moon", "boat", "tomb", "winter"].includes(key) ? names[key] : null;
  const named = key && !feast ? names[key] : null;
  const revel = ["eve", "ny", "lantern", "moon", "seven"].includes(key);
  const ghost = key === "ghost" || season === "The ghost month" || season === "Obon";
  const lines = [];
  if ( key === "ghost" ) lines.push({text: "The dead walk among the living tonight: offerings are burnt at every door and lanterns set on the water.", always: true});
  else if ( ghost ) lines.push("The month when the gates of the dead stand open: few travel, wed or move house, and offerings are left at the roadside.");
  if ( key === "tomb" ) lines.push("Families are out at the graves from morning, with food, paper and wine for the dead.");
  return answer("chinese", date, {feast, named, season, revel: revel ? (["eve", "ny"].includes(key) ? "always" : true) : false,
    revelLine: key === "eve" || key === "ny" ? "The new year; firecrackers and open doors all night" : key === "lantern" ? "The night of lanterns" : "A night of celebration",
    feastLine: "A feast day: no work, the family gathered, offerings to the ancestors.", lines}, opts);
}

/** The Indian lunar months (new moon to new moon) around a Gregorian year: [{k, start (jd), month 1 to 12, extra}]. */
export function indianMonths(gy) {
  return memo(`in${gy}`, () => {
    const out = [];
    let k = moonBefore(gregorianToJDN(gy, 1, 1) - 45);
    for ( let i = 0; i < 17; i++, k++ ) {
      const start = moonJD(k), sign = Math.floor(siderealSun(start) / 30), next = Math.floor(siderealSun(moonJD(k + 1)) / 30);
      out.push({k, start, month: ((sign + 1) % 12) + 1, extra: sign === next});
    }
    return out;
  });
}
const IST = 5.5;
/** The day of a lunar day (tithi 1 to 30, 15 the full moon, 30 the new) of an Indian month, at a place's hours east. */
function tithiDay(m, tithi, hours = IST) {
  const span = moonJD(m.k + 1) - m.start;
  return dayOf(m.start + (tithi - 0.5) * span / 30 - 0.25, hours);
}
function indianFeasts(gy, hours = IST) {
  return memo(`inf${gy}|${hours}`, () => {
    const ms = indianMonths(gy).filter(m => !m.extra), of = n => ms.filter(m => m.month === n);
    const days = [];
    const add = (n, tithi, key, len = 1) => { for ( const m of of(n) ) for ( let i = 0; i < len; i++ ) days.push([tithiDay(m, tithi, hours) + i, key, i]); };
    add(11, 29, "shiva"); add(12, 16, "holi"); add(2, 15, "vesak"); add(4, 15, "asalha"); add(5, 23, "krishna");
    add(7, 1, "nights", 9); add(7, 10, "dussehra"); add(7, 15, "pavarana"); add(7, 30, "diwali"); add(8, 15, "lights"); add(11, 15, "magha");
    return days;
  });
}
const feastKey = (jdn, hours) => { const y = jdnToGregorian(jdn).year; return [...indianFeasts(y, hours), ...indianFeasts(y + 1, hours)].find(([d]) => d === jdn) ?? null; };
/** The day the sun enters a sign of the fixed stars in a Gregorian year (0 the Ram in April, 9 the Sea-Goat in January). */
const signDay = (gy, sign, hours = IST) => dayOf(sunAt(sign * 30, gregorianToJDN(gy, ((sign + 3) % 12) + 1, 14), siderealSun), hours);

export function hinduDay(date, opts = {}) {
  const g = jdnToGregorian(date.jdn), hit = feastKey(date.jdn, IST), key = hit?.[1] ?? null;
  const names = {shiva: "Maha Shivaratri, the great night of Shiva", holi: "Holi, the feast of colours", krishna: "Krishna's birthday",
    dussehra: "Dussehra, the tenth day", diwali: "Diwali, the feast of lights"};
  let feast = names[key] ?? null, named = null, season = "Ordinary days";
  if ( key === "nights" ) { named = `The Nine Nights, night ${hit[2] + 1}`; season = "The Nine Nights"; }
  if ( key === "dussehra" ) season = "The Nine Nights";
  if ( !feast && date.jdn === signDay(g.year, 9) ) feast = "Makar Sankranti, the sun's turning north";
  const eveOfHoli = feastKey(date.jdn + 1, IST)?.[1] === "holi", diwaliEve = feastKey(date.jdn + 1, IST)?.[1] === "diwali";
  if ( eveOfHoli ) named = "The bonfire night before Holi";
  if ( diwaliEve ) named = "The eve of Diwali";
  const revel = ["holi", "diwali", "dussehra", "nights", "shiva", "krishna"].includes(key) || eveOfHoli;
  const lines = [];
  if ( key === "diwali" ) lines.push({text: "Lamps in every window and on every wall; gambling and gifts until dawn.", always: true});
  if ( key === "holi" ) lines.push({text: "By day no rank is safe from thrown colour and water.", always: true});
  if ( key === "shiva" ) lines.push("The devout keep a fast and a vigil at the temples through the night.");
  return answer("hindu", date, {feast, named, season, fast: key === "shiva" ? "A fast and night vigil for the devout" : null,
    revel: revel ? (["holi", "diwali"].includes(key) ? "always" : true) : false,
    revelLine: key === "nights" || key === "dussehra" ? "The Nine Nights; processions, dancing and the goddess carried through the streets" : "A night of celebration",
    feastLine: "A feast day: the temples crowded from dawn, the markets given over to the festival.", lines}, opts);
}

export function theravadaDay(date, opts = {}) {
  const TZ = 7, g = jdnToGregorian(date.jdn), hit = feastKey(date.jdn, TZ), key = hit?.[1] ?? null;
  const names = {magha: "Magha Puja, the day of the great assembly", vesak: "Vesak, the Buddha's day", asalha: "Asalha Puja, the day of the first teaching",
    pavarana: "The end of the Rains retreat", lights: "The festival of lights on the water"};
  let feast = names[key] ?? null, named = null, season = "Ordinary days";
  const ny = signDay(g.year, 0, TZ);
  if ( date.jdn >= ny - 1 && date.jdn <= ny + 1 ) { feast = "The new year, the water festival"; season = "The new year"; }
  // The Rains retreat: from the day after the July full moon for three moons
  const feasts = [...indianFeasts(g.year, TZ), ...indianFeasts(g.year - 1, TZ)];
  const start = feasts.filter(([, k]) => k === "asalha").map(([d]) => d).filter(d => d < date.jdn).sort((a, b) => b - a)[0];
  const end = feasts.filter(([, k]) => k === "pavarana").map(([d]) => d).filter(d => d >= date.jdn).sort((a, b) => a - b)[0];
  if ( start && end && end - start < 100 && date.jdn > start ) season = "The Rains retreat";
  // The observance days at the new and the full moon
  const k = moonBefore(date.jdn + 0.5), newDay = dayOf(moonJD(k), TZ) === date.jdn, fullDay = dayOf(moonJD(k + 0.5), TZ) === date.jdn || dayOf(moonJD(k - 0.5), TZ) === date.jdn;
  if ( !feast && (newDay || fullDay) ) named = `The observance day of the ${newDay ? "new" : "full"} moon`;
  const revel = season === "The new year" || key === "lights" || key === "pavarana";
  const lines = [];
  if ( season === "The Rains retreat" ) lines.push("The monks keep to their monasteries until the rains end; no weddings, and young men take the robe for the season.");
  if ( named ) lines.push("The devout spend the day at the monastery, eat nothing after noon and hear the teaching.");
  if ( season === "The new year" ) lines.push({text: "Water is thrown on everyone in the street, high or low.", always: true});
  return answer("theravada", date, {feast, named, season, revel: revel ? (season === "The new year" ? "always" : true) : false,
    feastLine: "A holy day: candle processions round the monastery at dusk, no killing, no strong drink sold.", lines}, opts);
}

/** Losar, the Tibetan new year: the new moon nearest 18 February (a house rounding; the Tibetan count differs by a day at times). */
export function losar(gy) {
  return memo(`ti${gy}`, () => {
    const mid = gregorianToJDN(gy, 2, 18), k = moonBefore(mid);
    const a = moonJD(k), b = moonJD(k + 1);
    return dayOf(((mid - a) <= (b - mid) ? a : b) + 0.5, 6);
  });
}
export function tibetanDay(date, opts = {}) {
  const g = jdnToGregorian(date.jdn);
  let ny = losar(g.year); if ( ny > date.jdn ) ny = losar(g.year - 1);
  const d = date.jdn - ny, k0 = moonBefore(ny + 0.5), TZ = 6;
  const full = n => dayOf(moonJD(k0 + n - 1 + 0.5), TZ) + (dayOf(moonJD(k0 + n - 1 + 0.5), TZ) < ny + (n - 1) * 29 ? 29 : 0);
  let feast = null, named = null, season = "Ordinary days";
  if ( d >= 0 && d <= 2 ) feast = "Losar, the new year";
  else if ( date.jdn === losar(g.year + (ny === losar(g.year) ? 1 : 0)) - 1 ) named = "The last night of the year, the driving out of ill luck";
  else if ( date.jdn === full(1) ) feast = "The Butter Lamp Festival";
  else if ( date.jdn === full(4) ) feast = "Saga Dawa, the Buddha's day";
  else if ( date.jdn === full(6) - 11 ) named = "The day of the first teaching";
  else if ( date.jdn === full(10) + 10 ) named = "The festival of lamps for Tsongkhapa";
  if ( d >= 3 && d <= 24 ) season = date.year >= 1409 ? "The Great Prayer" : "The first month";
  else if ( date.jdn > full(3) && date.jdn <= full(4) + 14 && date.jdn >= full(4) - 15 ) season = "Saga Dawa, the month of merit";
  const revel = !!feast && /Losar|Butter/.test(feast) || !!named && /last night/.test(named);
  const lines = [];
  if ( season === "The Great Prayer" ) lines.push("The monks hold the town for the weeks of the Great Prayer; lay rule waits on the monasteries.");
  if ( /Saga Dawa/.test(season) ) lines.push("No meat is killed or sold this month; pilgrims walk the holy circuits day and night.");
  return answer("tibetan", date, {feast, named, season, revel: revel ? (feast && /Losar/.test(feast) ? "always" : true) : false,
    feastLine: "A holy day: butter lamps at every shrine, the prayer wheels turning, no work.", lines}, opts);
}

/* ------------------------------------------------------------------ one door for all ---- */

/** A people's own count: no days known but the Storyteller's. */
function ownDay(date, opts = {}) {
  const feast = (opts.extra ?? []).find(([m, d]) => m === date.month && d === date.day)?.[2] ?? null;
  return answer("own", date, {feast, season: "Their own count of days",
    lines: [{text: "The people here keep holy days of their own; the Storyteller names them (the chronicle's own feast days).", always: true}]}, opts);
}

const DAYS = {orthodox: orthodoxDay, islamic: islamicDay, jewish: jewishDay, hindu: hinduDay, theravada: theravadaDay, tibetan: tibetanDay, chinese: chineseDay, own: ownDay};

/**
 * Everything a faith's year says about one date. faith: a FAITHS id; date: {year, month, day, calendar, jdn, dayOfWeek};
 * opts: {extra, observance, region}. The Western church answers through churchDay().
 */
export function faithDay(faith, date, opts = {}) {
  if ( !DAYS[faith] ) return {faith: "western", calendar: FAITHS.western.year, ...churchDay(date, opts)};
  return DAYS[faith](date, opts);
}
/** The Clock's short line for any faith's day. */
export const faithLabel = c => churchLabel(c);

/** The named days other faiths keep on a date: [{faith, label, day}], for a town of more than one people. */
export function otherDays(date, except = "western") {
  const out = [];
  for ( const f of ["western", "orthodox", "islamic", "jewish", "hindu", "theravada", "tibetan", "chinese"] ) {
    if ( f === except ) continue;
    let c; try { c = faithDay(f, date, {}); } catch (e) { continue; }
    const day = c.feast ?? (c.day && !/^The Sabbath$|^The observance day/.test(c.day) ? c.day : null);
    if ( day ) out.push({faith: f, label: FAITHS[f].label, day});
  }
  return out;
}
export {julianToJDN};
