/**
 * WoDX calendar math. Pure functions, no Foundry dependencies, so they can be unit tested in Node.
 *
 * Dates run on Julian Day Numbers (JDN): one integer per day, continuous across the Julian-to-Gregorian
 * reform, so the days skipped at a reform simply never appear.
 */

export const SECONDS_PER_DAY = 86400;

/** Countries' reform dates: the first day on the Gregorian calendar. null = never reformed in-game. */
export const REFORMS = {
  "bohemia-1584": {label: "Bohemia and Moravia (6 January 1584 is followed by 17 January)", first: [1584, 1, 17]},
  "catholic-1582": {label: "Papal States, Spain, Portugal, Poland, Italy (4 October 1582 is followed by 15 October)", first: [1582, 10, 15]},
  "britain-1752": {label: "Britain and its colonies (2 September 1752 is followed by 14 September)", first: [1752, 9, 14]},
  "russia-1918": {label: "Russia (31 January 1918 is followed by 14 February)", first: [1918, 2, 14]},
  "julian": {label: "Julian calendar throughout", first: null},
  "gregorian": {label: "Gregorian calendar throughout (proleptic)", first: "always"}
};

const floorDiv = (a, b) => Math.floor(a / b);

export function gregorianToJDN(y, m, d) {
  const a = floorDiv(14 - m, 12);
  const yy = y + 4800 - a;
  const mm = m + (12 * a) - 3;
  return d + floorDiv((153 * mm) + 2, 5) + (365 * yy) + floorDiv(yy, 4) - floorDiv(yy, 100) + floorDiv(yy, 400) - 32045;
}

export function julianToJDN(y, m, d) {
  const a = floorDiv(14 - m, 12);
  const yy = y + 4800 - a;
  const mm = m + (12 * a) - 3;
  return d + floorDiv((153 * mm) + 2, 5) + (365 * yy) + floorDiv(yy, 4) - 32083;
}

export function jdnToGregorian(j) {
  const a = j + 32044;
  const b = floorDiv((4 * a) + 3, 146097);
  const c = a - floorDiv(146097 * b, 4);
  const d = floorDiv((4 * c) + 3, 1461);
  const e = c - floorDiv(1461 * d, 4);
  const m = floorDiv((5 * e) + 2, 153);
  return {
    year: (100 * b) + d - 4800 + floorDiv(m, 10),
    month: m + 3 - (12 * floorDiv(m, 10)),
    day: e - floorDiv((153 * m) + 2, 5) + 1
  };
}

export function jdnToJulian(j) {
  const c = j + 32082;
  const d = floorDiv((4 * c) + 3, 1461);
  const e = c - floorDiv(1461 * d, 4);
  const m = floorDiv((5 * e) + 2, 153);
  return {
    year: d - 4800 + floorDiv(m, 10),
    month: m + 3 - (12 * floorDiv(m, 10)),
    day: e - floorDiv((153 * m) + 2, 5) + 1
  };
}

export const isJulianLeap = y => ((y % 4) + 4) % 4 === 0;
export const isGregorianLeap = y => ((y % 4 === 0) && (y % 100 !== 0)) || (y % 400 === 0);

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * A date engine for one chronicle: an epoch (worldTime 0) and a reform rule.
 */
export class DateEngine {
  /**
   * @param {object} [options]
   * @param {number[]} [options.epoch=[1197, 1, 1]]  The date at worldTime 0, on the calendar in force then
   * @param {string} [options.reform="bohemia-1584"] A key of REFORMS
   */
  constructor({epoch = [1197, 1, 1], reform = "bohemia-1584"} = {}) {
    this.reform = REFORMS[reform] ? reform : "bohemia-1584";
    const first = REFORMS[this.reform].first;
    if ( first === "always" ) this.switchJDN = -Infinity;
    else if ( first === null ) this.switchJDN = Infinity;
    else this.switchJDN = gregorianToJDN(...first);
    this.epochJDN = this.toJDN(...epoch);
  }

  /** Which calendar is in force on a JDN. */
  calendarOn(jdn) {
    return jdn >= this.switchJDN ? "gregorian" : "julian";
  }

  /**
   * The JDN of a date, read on the calendar in force for it.
   * Returns null for a date that never existed (one of the days skipped at the reform).
   */
  toJDN(year, month, day) {
    const j = julianToJDN(year, month, day);
    if ( j < this.switchJDN ) return j;
    const g = gregorianToJDN(year, month, day);
    if ( g >= this.switchJDN ) return g;
    return null;
  }

  /** The date of a JDN on the calendar in force that day. */
  fromJDN(jdn) {
    const calendar = this.calendarOn(jdn);
    const date = calendar === "gregorian" ? jdnToGregorian(jdn) : jdnToJulian(jdn);
    return {...date, calendar};
  }

  /** The JDN of 1 January of a year. */
  jan1(year) {
    const j = julianToJDN(year, 1, 1);
    if ( j < this.switchJDN ) return j;
    return gregorianToJDN(year, 1, 1);
  }

  /** Is February of this year 29 days long on the calendar in force in that February? */
  isLeap(year) {
    const feb28 = julianToJDN(year, 2, 28);
    if ( feb28 < this.switchJDN ) return isJulianLeap(year);
    return isGregorianLeap(year);
  }

  /** Days actually lived in a year, counting any days skipped at the reform. */
  daysInYear(year) {
    return this.jan1(year + 1) - this.jan1(year);
  }

  /** Days in a month as they were lived (the reform month is shorter). */
  daysInMonth(year, month) {
    const start = this.firstValidJDN(year, month);
    const next = month === 12 ? this.jan1(year + 1) : this.firstValidJDN(year, month + 1);
    return next - start;
  }

  firstValidJDN(year, month) {
    for ( let d = 1; d <= 31; d++ ) {
      const j = this.toJDN(year, month, d);
      if ( j !== null ) return j;
    }
    throw new Error(`No valid day in ${year}-${month}`);
  }

  /** Nominal month length, ignoring the reform: used to validate input. */
  nominalDays(year, month) {
    if ( month === 2 ) return this.isLeap(year) ? 29 : 28;
    return MONTH_DAYS[month - 1];
  }

  /** Expand a world time in seconds. */
  timeToDate(seconds = 0) {
    const dayIndex = Math.floor(seconds / SECONDS_PER_DAY);
    let rest = seconds - (dayIndex * SECONDS_PER_DAY);
    const jdn = this.epochJDN + dayIndex;
    const date = this.fromJDN(jdn);
    const hour = Math.floor(rest / 3600);
    rest -= hour * 3600;
    const minute = Math.floor(rest / 60);
    const second = rest - (minute * 60);
    return {
      ...date,
      jdn,
      dayOfYear: jdn - this.jan1(date.year),
      dayOfWeek: ((jdn % 7) + 7) % 7, // 0 = Monday
      hour, minute, second,
      leapYear: this.isLeap(date.year)
    };
  }

  /** World time in seconds for a date and time. Throws for a day skipped at the reform. */
  dateToTime({year, month = 1, day = 1, hour = 0, minute = 0, second = 0}) {
    const jdn = this.toJDN(year, month, day);
    if ( jdn === null ) throw new RangeError(`${year}-${month}-${day} was skipped at the calendar reform`);
    return ((jdn - this.epochJDN) * SECONDS_PER_DAY) + (hour * 3600) + (minute * 60) + second;
  }
}

/* -------------------------------------------- */
/*  Moon and sun                                */
/* -------------------------------------------- */

const SYNODIC_MONTH = 29.530588853;
const NEW_MOON_JD = 2451550.1; // 6 January 2000, 14:24 UT

export const MOON_PHASES = [
  "New moon", "Waxing crescent", "First quarter", "Waxing gibbous",
  "Full moon", "Waning gibbous", "Last quarter", "Waning crescent"
];

/** Garou auspice moons, in the same order as MOON_PHASES. */
export const AUSPICE_MOONS = [
  "Ragabash (new)", "Theurge (crescent)", "Philodox (half)", "Galliard (gibbous)",
  "Ahroun (full)", "Galliard (gibbous)", "Philodox (half)", "Theurge (crescent)"
];

/**
 * Mean moon phase for a moment. Accurate to well under a day across the project's range.
 * @param {number} jd  A Julian Date (JDN plus fraction of day; JDN alone is noon)
 */
export function moonPhase(jd) {
  const age = ((((jd - NEW_MOON_JD) % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH);
  const index = Math.floor(((age / SYNODIC_MONTH) * 8) + 0.5) % 8;
  const illumination = (1 - Math.cos((2 * Math.PI * age) / SYNODIC_MONTH)) / 2;
  return {age, index, name: MOON_PHASES[index], auspice: AUSPICE_MOONS[index], illumination};
}

/**
 * Sunrise and sunset in local solar time (hours after midnight) for a JDN and latitude.
 * Uses the solar declination for the astronomical (proleptic Gregorian) day of year, so seasons
 * stay true even while the Julian calendar drifts. Polar day or night returns null times.
 */
export function sunTimes(jdn, latitude) {
  const g = jdnToGregorian(jdn);
  const n = jdn - gregorianToJDN(g.year, 1, 1) + 1;
  const rad = Math.PI / 180;
  const decl = -23.44 * Math.cos(rad * (360 / 365) * (n + 10));
  const phi = latitude * rad;
  const d = decl * rad;
  const cosH = (Math.sin(-0.833 * rad) - (Math.sin(phi) * Math.sin(d))) / (Math.cos(phi) * Math.cos(d));
  if ( cosH > 1 ) return {sunrise: null, sunset: null, darkHours: 24, polar: "night"};
  if ( cosH < -1 ) return {sunrise: null, sunset: null, darkHours: 0, polar: "day"};
  const h = Math.acos(cosH) / rad / 15;
  return {sunrise: 12 - h, sunset: 12 + h, darkHours: 24 - (2 * h), polar: null};
}

/** Format decimal hours as HH:MM. */
export function formatHours(hours) {
  if ( hours === null || hours === undefined ) return "none";
  let h = Math.floor(hours);
  let m = Math.round((hours - h) * 60);
  if ( m === 60 ) { h += 1; m = 0; }
  return `${String(h % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
