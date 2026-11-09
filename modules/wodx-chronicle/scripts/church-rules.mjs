/**
 * WoDX Chronicle: feast and fast days (pure, harness-tested).
 *
 * The Western church year on the Chronicle's own calendar (Julian, then Gregorian from the reform year):
 *   - the great feasts, fixed by date or counted from Easter (the same list WoDX NPC's routines use for days off);
 *   - the fasts: Lent, the Ember days, the vigils of the great feasts, Good Friday, and Fridays as days without meat;
 *   - the seasons: Advent, Christmastide, Shrovetide, Lent, Holy Week, Eastertide and the rest of the year;
 *   - the nights of revel (Christmas Eve, Twelfth Night, Shrove Tuesday, the Easter Vigil, St John's Eve, Martinmas).
 *
 * What the day does at the table (house rules, logged in docs/PENDING-REVIEW.md):
 *   - a night of revel: the town is busy late, the curfew starts at midnight, and hunting in town is 1 easier;
 *   - a fast day or Lent while the church year is kept strictly: the town is quiet after dark and hunting in town
 *     is 1 harder. Fridays alone change nothing but the food.
 *   - how strictly it is kept follows the year: strictly before 1600, by custom until 1850, lightly after, when only
 *     Christmas Eve, New Year's Eve and Shrove Tuesday still fill the streets at night.
 * The dates are the calendar's own; the effects are the house rule "Feast and fast days".
 */
import {julianToJDN, gregorianToJDN} from "./calendar-math.mjs";

/** Easter Sunday's JDN for a year, by the Julian or the Gregorian reckoning. */
export function easterJDN(year, calendar = "julian") {
  if ( calendar === "julian" ) {
    const a = year % 4, b = year % 7, c = year % 19, d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7;
    const m = Math.floor((d + e + 114) / 31), day = ((d + e + 114) % 31) + 1;
    return julianToJDN(year, m, day);
  }
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return gregorianToJDN(year, month, day);
}

/** The great feasts, days off work: fixed by date (month, day) and movable by days from Easter (with a first year). */
export const FIXED_FEASTS = [[1, 1, "The Circumcision"], [1, 6, "Epiphany"], [2, 2, "Candlemas"], [3, 25, "The Annunciation"],
  [6, 24, "St John the Baptist"], [6, 29, "Sts Peter and Paul"], [8, 15, "The Assumption"], [9, 8, "The Nativity of Mary"],
  [9, 29, "Michaelmas"], [11, 1, "All Saints"], [11, 11, "Martinmas"], [12, 25, "Christmas"], [12, 26, "St Stephen"]];
export const MOVABLE_FEASTS = [[-2, "Good Friday"], [0, "Easter"], [1, "Easter Monday"], [39, "Ascension"], [49, "Pentecost"],
  [50, "Whit Monday"], [60, "Corpus Christi", 1264]];

/** Other marked days counted from Easter (not days off): [offset, name]. */
export const MOVABLE_DAYS = [[-63, "Septuagesima"], [-49, "Shrove Sunday"], [-48, "Shrove Monday"], [-47, "Shrove Tuesday"],
  [-46, "Ash Wednesday"], [-7, "Palm Sunday"], [-3, "Maundy Thursday"], [-1, "Holy Saturday"],
  [36, "Rogation Monday"], [37, "Rogation Tuesday"], [38, "Rogation Wednesday"], [56, "Trinity Sunday"]];

/** The vigils of the great feasts, fast days: fixed [month, day, name], and Whitsun Eve counted from Easter. */
export const FIXED_VIGILS = [[6, 23, "St John's Eve"], [6, 28, "The vigil of Sts Peter and Paul"], [8, 14, "The vigil of the Assumption"],
  [10, 31, "All Hallows' Eve"], [12, 24, "Christmas Eve"]];
export const MOVABLE_VIGILS = [[48, "Whitsun Eve"]];

/** Nights the town stays out late, by name of the day; the "light" ones still do after 1850. */
export const REVELS = ["Christmas Eve", "Twelfth Night", "Shrove Tuesday", "Holy Saturday", "St John's Eve", "Martinmas"];
export const LIGHT_REVELS = ["Christmas Eve", "New Year's Eve", "Shrove Tuesday"];

/** How the year keeps the church calendar. */
export const OBSERVANCE = {
  strict: {label: "Kept strictly", hint: "Fasts and feasts rule the town's life."},
  custom: {label: "Kept by custom", hint: "Feasts are holidays; fasting is a private matter for most."},
  light: {label: "Kept lightly", hint: "Christmas, Easter and a few nights of celebration; the rest goes by unmarked."}
};
export function observanceFor(year) {
  const y = Number(year) || 0;
  return y < 1600 ? "strict" : y < 1850 ? "custom" : "light";
}

/** Day of the week for a JDN, 0 = Monday (as the Chronicle's engine counts). */
const weekday = jdn => ((jdn % 7) + 7) % 7;
/** The first Wednesday strictly after a JDN. */
function wednesdayAfter(jdn) {
  for ( let j = jdn + 1; j < jdn + 8; j++ ) if ( weekday(j) === 2 ) return j;
  return jdn + 1;
}
const toJDN = (year, month, day, calendar) => (calendar === "gregorian" ? gregorianToJDN(year, month, day) : julianToJDN(year, month, day));

/** The four sets of Ember days (Wednesday, Friday, Saturday) for a year: [jdn...]. */
export function emberDays(year, calendar = "julian") {
  const easter = easterJDN(year, calendar);
  const starts = [easter - 42, easter + 49, toJDN(year, 9, 14, calendar), toJDN(year, 12, 13, calendar)];
  const out = [];
  for ( const s of starts ) { const w = wednesdayAfter(s); out.push(w, w + 2, w + 3); }
  return out;
}

/** The first Sunday of Advent: the Sunday from 27 November to 3 December. */
export function adventStart(year, calendar = "julian") {
  const nov27 = toJDN(year, 11, 27, calendar);
  for ( let j = nov27; j < nov27 + 7; j++ ) if ( weekday(j) === 6 ) return j;
  return nov27;
}

/** The feast on a date, or null (days off work). date: {year, month, day, calendar, jdn}; extra: [[m, d, name]]. */
export function feastOn(date, extra = []) {
  for ( const [m, d, name] of [...extra, ...FIXED_FEASTS] ) if ( date.month === m && date.day === d ) return name;
  const off = date.jdn - easterJDN(date.year, date.calendar);
  for ( const [days, name, since] of MOVABLE_FEASTS ) if ( off === days && (!since || date.year >= since) ) return name;
  return null;
}

/** Parse the Storyteller's own feasts, one per line: "09-01 St Giles". */
export function parseFeasts(text) {
  const out = [];
  for ( const line of String(text ?? "").split(/\r?\n/) ) {
    const m = /^\s*(\d{1,2})-(\d{1,2})\s+(.+?)\s*$/.exec(line);
    if ( m && +m[1] >= 1 && +m[1] <= 12 && +m[2] >= 1 && +m[2] <= 31 ) out.push([+m[1], +m[2], m[3]]);
  }
  return out;
}

/** The season of the church year a date falls in. */
export function seasonOn(date) {
  const {year, month, day, jdn} = date, cal = date.calendar;
  const easter = easterJDN(year, cal);
  const off = jdn - easter;
  if ( (month === 12 && day >= 25) || (month === 1 && day <= 5) ) return "Christmastide";
  if ( jdn >= adventStart(year, cal) && month === 12 && day <= 24 ) return "Advent";
  if ( month === 11 && jdn >= adventStart(year, cal) ) return "Advent";
  if ( off >= -7 && off <= -1 ) return "Holy Week";
  if ( off >= -46 && off <= -8 ) return "Lent";
  if ( off >= -49 && off <= -47 ) return "Shrovetide";
  if ( off >= -63 && off <= -50 ) return "Pre-Lent";
  if ( off >= 0 && off <= 49 ) return "Eastertide";
  return "Ordinary time";
}

/**
 * Everything the church year says about one date.
 * date: {year, month, day, calendar, jdn, dayOfWeek}; opts: {extra (parseFeasts), observance (to override the year's)}.
 * Returns {feast, day, vigil, fast, ember, season, observance, revel, crowd, curfewStart, huntStep, lines}.
 *   crowd: "busy" (a night of revel), "quiet" (a fast kept strictly) or null; curfewStart: 24 on a night of revel, else null;
 *   huntStep: -1 on a night of revel, +1 on a strict fast, else 0 (hunting in town only).
 */
export function churchDay(date, opts = {}) {
  const {year, month, day, jdn} = date, cal = date.calendar ?? "julian";
  const dow = date.dayOfWeek ?? weekday(jdn);
  const easter = easterJDN(year, cal), off = jdn - easter;
  const observance = OBSERVANCE[opts.observance] ? opts.observance : observanceFor(year);
  const feast = feastOn({...date, calendar: cal}, opts.extra ?? []);
  const named = MOVABLE_DAYS.find(([o]) => o === off)?.[1] ?? (month === 1 && day === 5 ? "Twelfth Night" : month === 12 && day === 31 ? "New Year's Eve" : null);
  const vigil = FIXED_VIGILS.find(([m, d]) => m === month && d === day)?.[2] ?? MOVABLE_VIGILS.find(([o]) => o === off)?.[1] ?? null;
  const ember = emberDays(year, cal).includes(jdn);
  const season = seasonOn({...date, calendar: cal});
  // The fast of the day: the strictest that applies
  let fast = null;
  if ( off === -2 ) fast = "Good Friday, the strictest fast";
  else if ( off === -46 ) fast = "Ash Wednesday, the first day of Lent";
  else if ( (season === "Lent" || season === "Holy Week") && dow !== 6 ) fast = "The Lenten fast";
  else if ( vigil && !feast ) fast = `${vigil}, a fast before the feast`;
  else if ( ember ) fast = "An Ember day, a fast";
  else if ( dow === 4 && !feast && season !== "Christmastide" && season !== "Eastertide" ) fast = "Friday: no meat";
  const label = [feast, named, vigil].filter(Boolean);
  const dayName = label.length ? [...new Set(label)].join("; ") : null;
  const revelList = observance === "light" ? LIGHT_REVELS : REVELS;
  const revel = [feast, named, vigil].some(n => n && revelList.includes(n));
  const strictFast = observance === "strict" && !!fast && !fast.startsWith("Friday") && !revel;
  const crowd = revel ? "busy" : strictFast ? "quiet" : null;
  const lines = [];
  if ( revel ) lines.push("A night of revel: the streets stay busy late and the curfew starts at midnight. Hunting in town is 1 easier.");
  else if ( strictFast ) lines.push("A fast kept strictly: taverns are shut or quiet and few are out after dark. Hunting in town is 1 harder.");
  else if ( feast && observance !== "light" ) lines.push("A holy day: no work, the church full in the morning, the market shut.");
  if ( fast?.startsWith("Friday") && observance !== "light" ) lines.push("A Friday: fish, not meat, at every table.");
  if ( season === "Lent" && observance === "strict" && !revel ) lines.push("Lent: no weddings, no feasting, no meat or dairy.");
  if ( season === "Advent" && observance === "strict" ) lines.push("Advent: a quieter season; no weddings until Christmas.");
  return {feast, day: dayName, vigil, fast, ember, season, observance, revel, crowd,
    curfewStart: revel ? 24 : null, huntStep: revel ? -1 : strictFast ? 1 : 0, lines};
}

/** A short line for the Chronicle Clock: the day's name or fast and the season. */
export function churchLabel(c) {
  const parts = [];
  if ( c.day ) parts.push(c.day);
  else if ( c.fast ) parts.push(c.fast);
  parts.push(c.season);
  return parts.join(" · ");
}
