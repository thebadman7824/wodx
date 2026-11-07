import {DateEngine, REFORMS, moonPhase, sunTimes, formatHours} from "./calendar-math.mjs";

/** Year shown for worldTime 0. The Dark Ages profile starts here (decision: 1197). */
export const EPOCH_YEAR = 1197;

let engine = new DateEngine({epoch: [EPOCH_YEAR, 1, 1], reform: "bohemia-1584"});

/** The date engine in use. */
export function getEngine() {
  return engine;
}

/** Rebuild the engine for a reform key. */
export function setReform(reform) {
  engine = new DateEngine({epoch: [EPOCH_YEAR, 1, 1], reform: REFORMS[reform] ? reform : "bohemia-1584"});
  return engine;
}

/**
 * Build the calendar class. Called inside init, when foundry.data.CalendarData is available.
 * Components keep Foundry's meaning: `year` counts whole years since worldTime 0 and `day` is the day of that
 * year, so durations ({day: 3}, {hour: 5}) still work. The real calendar year is `year + yearZero`.
 */
export function makeCalendarClass() {
  const Base = foundry.data.CalendarData;

  return class WoDXCalendar extends Base {

    timeToComponents(time = 0) {
      const d = engine.timeToDate(time);
      const components = {
        year: d.year - this.years.yearZero,
        day: d.dayOfYear,
        month: d.month - 1,
        dayOfMonth: d.day - 1,
        dayOfWeek: d.dayOfWeek,
        hour: d.hour,
        minute: d.minute,
        second: d.second,
        leapYear: d.leapYear,
        season: undefined
      };
      const ordinal = d.month;
      const seasons = this.seasons?.values ?? [];
      for ( let i = 0; i < seasons.length; i++ ) {
        let {monthStart, monthEnd} = seasons[i];
        if ( typeof monthStart !== "number" || typeof monthEnd !== "number" ) continue;
        const wraps = monthEnd < monthStart;
        if ( (!wraps && ordinal >= monthStart && ordinal <= monthEnd)
          || (wraps && (ordinal >= monthStart || ordinal <= monthEnd)) ) {
          components.season = i;
          break;
        }
      }
      return components;
    }

    componentsToTime(components) {
      const year = components.year ?? 0;
      const jan1 = engine.jan1(year + this.years.yearZero);
      const days = (jan1 - engine.epochJDN) + (components.day ?? 0);
      return (days * 86400) + ((components.hour ?? 0) * 3600) + ((components.minute ?? 0) * 60) + (components.second ?? 0);
    }

    isLeapYear(year) {
      return engine.isLeap(year + this.years.yearZero);
    }

    countLeapYears(year) {
      let n = 0;
      for ( let y = this.years.yearZero; y < year + this.years.yearZero; y++ ) if ( engine.isLeap(y) ) n++;
      return n;
    }

    static formatTimestamp(calendar, components) {
      const year = components.year + (calendar.years?.yearZero ?? 0);
      const p = (n, w = 2) => String(n).padStart(w, "0");
      return `${year}-${p(components.month + 1)}-${p(components.dayOfMonth + 1)} ${p(components.hour)}:${p(components.minute)}:${p(components.second)}`;
    }
  };
}

/** The calendar configuration: Foundry's Gregorian month and weekday names, our epoch. */
export function makeCalendarConfig() {
  const config = foundry.utils.deepClone(foundry.data.SIMPLIFIED_GREGORIAN_CALENDAR_CONFIG);
  config.name = "WoDX Julian and Gregorian";
  config.description = "Julian until the chosen country's reform, Gregorian after it. Year 0 of world time is 1197.";
  config.years.yearZero = EPOCH_YEAR;
  config.years.firstWeekday = 2; // 1 January 1197 (Julian) was a Wednesday
  return config;
}

/* -------------------------------------------- */
/*  Reading the clock                           */
/* -------------------------------------------- */

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September",
  "October", "November", "December"];
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * Everything the clock shows for a world time.
 * @param {number} time      World time in seconds
 * @param {number} latitude  Degrees north
 */
export function describeTime(time, latitude) {
  const d = engine.timeToDate(time);
  const sun = sunTimes(d.jdn, latitude);
  const nowHours = d.hour + (d.minute / 60);
  const moon = moonPhase(d.jdn - 0.5 + (nowHours / 24));
  let isNight = true;
  if ( sun.polar === "day" ) isNight = false;
  else if ( sun.polar === null ) isNight = (nowHours < sun.sunrise) || (nowHours >= sun.sunset);
  return {
    ...d,
    monthName: MONTHS[d.month - 1],
    weekday: WEEKDAYS[d.dayOfWeek],
    dateLabel: `${WEEKDAYS[d.dayOfWeek]}, ${d.day} ${MONTHS[d.month - 1]} ${d.year}`,
    timeLabel: `${String(d.hour).padStart(2, "0")}:${String(d.minute).padStart(2, "0")}`,
    calendarLabel: d.calendar === "gregorian" ? "Gregorian" : "Julian",
    sunrise: formatHours(sun.sunrise),
    sunset: formatHours(sun.sunset),
    darkHours: sun.darkHours,
    isNight,
    moon
  };
}

/**
 * Seconds from a world time to the next sunset (dusk), at least a minute ahead.
 */
export function secondsToNextDusk(time, latitude) {
  for ( let dayOffset = 0; dayOffset < 3; dayOffset++ ) {
    const d = engine.timeToDate(time + (dayOffset * 86400));
    const sun = sunTimes(d.jdn, latitude);
    if ( sun.sunset === null ) continue;
    const dayStart = time + (dayOffset * 86400) - ((d.hour * 3600) + (d.minute * 60) + d.second);
    const dusk = dayStart + Math.round(sun.sunset * 3600);
    if ( dusk - time >= 60 ) return dusk - time;
  }
  return 86400;
}

/** Seconds from a world time to the next sunrise (dawn). */
export function secondsToNextDawn(time, latitude) {
  for ( let dayOffset = 0; dayOffset < 3; dayOffset++ ) {
    const d = engine.timeToDate(time + (dayOffset * 86400));
    const sun = sunTimes(d.jdn, latitude);
    if ( sun.sunrise === null ) continue;
    const dayStart = time + (dayOffset * 86400) - ((d.hour * 3600) + (d.minute * 60) + d.second);
    const dawn = dayStart + Math.round(sun.sunrise * 3600);
    if ( dawn - time >= 60 ) return dawn - time;
  }
  return 86400;
}

export {MONTHS, WEEKDAYS, REFORMS};
