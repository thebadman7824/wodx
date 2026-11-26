/**
 * The WoDX calendar, pure half (B8060): the date engine in use, its reform, and reading the clock. No Foundry calls,
 * so every rules file and the harness can load it. The Foundry calendar class and config built on this engine stay in
 * WoDX Chronicle (wodx-chronicle/scripts/calendar.mjs), which re-exports everything here, so there is one engine.
 */
import {DateEngine, REFORMS, moonPhase, sunTimes, formatHours, sunAltitude, isNightAt} from "./calendar-math.mjs";

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
  const nowHours = d.hour + (d.minute / 60) + ((d.second ?? 0) / 3600);
  const moon = moonPhase(d.jdn - 0.5 + (nowHours / 24));
  // B6381: night and day from the sun's altitude now, the same test WoDX Actions' sunlight makes (SUN_UP), to the second
  const sunAlt = sunAltitude(d.jdn, latitude, nowHours);
  const isNight = isNightAt(sunAlt);
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
    sunAltitude: sunAlt,
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
    // B6381: at or past the moment itself, so the clock moved to dusk or dawn reads night or day there
    const dusk = dayStart + Math.ceil(sun.sunset * 3600);
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
    const dawn = dayStart + Math.ceil(sun.sunrise * 3600);
    if ( dawn - time >= 60 ) return dawn - time;
  }
  return 86400;
}

export {MONTHS, WEEKDAYS, REFORMS};
