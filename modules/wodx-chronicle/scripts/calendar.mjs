/**
 * The WoDX calendar for Foundry (B8060). The date engine and the clock reading live in the rules core
 * (wodx-rules/core/calendar.mjs) and are re-exported here; this file adds only the two pieces that need Foundry: the
 * calendar class and its config, both built inside init.
 */
import {getEngine, EPOCH_YEAR} from "../../wodx-rules/core/calendar.mjs";

export * from "../../wodx-rules/core/calendar.mjs";

/**
 * Build the calendar class. Called inside init, when foundry.data.CalendarData is available.
 * Components keep Foundry's meaning: `year` counts whole years since worldTime 0 and `day` is the day of that
 * year, so durations ({day: 3}, {hour: 5}) still work. The real calendar year is `year + yearZero`.
 */
export function makeCalendarClass() {
  const Base = foundry.data.CalendarData;

  return class WoDXCalendar extends Base {

    timeToComponents(time = 0) {
      const d = getEngine().timeToDate(time);
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
      const jan1 = getEngine().jan1(year + this.years.yearZero);
      const days = (jan1 - getEngine().epochJDN) + (components.day ?? 0);
      return (days * 86400) + ((components.hour ?? 0) * 3600) + ((components.minute ?? 0) * 60) + (components.second ?? 0);
    }

    isLeapYear(year) {
      return getEngine().isLeap(year + this.years.yearZero);
    }

    countLeapYears(year) {
      let n = 0;
      for ( let y = this.years.yearZero; y < year + this.years.yearZero; y++ ) if ( getEngine().isLeap(y) ) n++;
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
