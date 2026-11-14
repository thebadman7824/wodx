/**
 * WoDX NPC 0.54.0: the faith calendar and the hunt (B2710, B2711). Pure, harness-tested.
 *
 * The hunting grounds set the base difficulty (V20 p. 259; V20 Dark Ages p. 334). On top of that, the calendar of each
 * faith kept in the town changes who is out after dark, and every change is listed by name so the Storyteller can
 * overrule it before the roll (house rule "Feast and fast days"):
 *
 *   a fair                         -1   the town is full of strangers and nobody knows every face
 *   a night of revel or feast      -1   the streets stay busy late (Carnival, St John's Eve, Diwali, Ramadan nights...)
 *   a fast kept strictly           +1   few are out and the taverns and cookshops are shut
 *   the strictest days             +2   Good Friday, Great Friday and Yom Kippur, kept strictly (+1 kept by custom)
 *   a holy day or the day of rest  +1   by day in the market or merchant streets only: the stalls are shut
 *   the curfew                     +1   from the curfew bell to dawn, in the years a town still keeps one
 *   a wartime blackout             +1   after dark, in the lands and years of the two world wars' blackouts
 *
 * The chronicle's own faith counts in full. A faith kept by part of the town (a Jewish quarter, a Christian street in
 * Cairo) is named with no step: its day changes its own quarter, which the Storyteller can count there.
 * The total stays between -2 and +2. A house reading for play; the books give no such table.
 */
import {restDay} from "./routine-rules.mjs";

export const CALENDAR_CAP = 2;

/** The strictest fast days: [pattern, label]. */
const STRICTEST = [[/Good Friday|Great Friday/i, "the strictest fast of the year"], [/Yom Kippur/i, "the Day of Atonement, a full day's fast"]];
/** Feast names that mean a fair or a market festival. */
const FAIR = /\b(fair|kermis|kermesse|church ale|wake|market day|jahrmarkt|messe|pou[tť]|posv[ií]cen[ií]|mela|bazaar)\b/i;

/** Years a region's towns keep a night curfew: [[from, to], ...]. */
export const CURFEW_YEARS = {
  default: [[-9999, 1800]],
  "china": [[-9999, 1912]], "japan": [[-9999, 1868]], "korea": [[-9999, 1895], [1945, 1982]],
  "anatolia": [[-9999, 1850]], "levant": [[-9999, 1850]], "egypt": [[-9999, 1850]], "arabia": [[-9999, 1900]],
  "maghreb": [[-9999, 1850]], "persia": [[-9999, 1880]], "central-asia": [[-9999, 1880]], "india": [[-9999, 1820]],
  "southeast-asia": [[-9999, 1880]], "nusantara": [[-9999, 1880]], "tibet-himalaya": [[-9999, 1950]],
  "southern-africa": [[-9999, 1800], [1950, 1986]],
  // Lands settled late keep no town curfew of the old kind
  "canada": [], "north-america-east": [], "north-america-west": [], "australia": [], "aotearoa": [], "pacific-islands": [],
  "arctic": [], "antarctica": [], "siberia": []
};
/** Wartime blackouts by region: [[from, to], ...]. */
export const BLACKOUT_YEARS = {
  "british-isles": [[1915, 1918], [1939, 1945]], "german-lands": [[1916, 1918], [1939, 1945]], "moravia": [[1939, 1945]],
  "france": [[1914, 1918], [1939, 1944]], "low-countries": [[1940, 1945]], "italy": [[1940, 1945]], "scandinavia": [[1940, 1945]],
  "poland-baltic": [[1939, 1945]], "carpathians-balkans": [[1941, 1945]], "russia": [[1941, 1945]], "japan": [[1942, 1945]],
  "korea": [[1943, 1945]], "china": [[1937, 1945]], "north-america-east": [[1942, 1943]], "north-america-west": [[1941, 1943]],
  "australia": [[1942, 1945]], "aotearoa": [[1942, 1943]], "southeast-asia": [[1941, 1945]], "nusantara": [[1942, 1945]],
  "india": [[1942, 1945]], "egypt": [[1940, 1945]], "levant": [[1940, 1945]], "maghreb": [[1940, 1943]]
};
const within = (rows, y) => (rows ?? []).some(([a, b]) => y >= a && y <= b);
export const keepsCurfew = (region, year) => within(CURFEW_YEARS[region] ?? CURFEW_YEARS.default, Number(year) || 0);
export const inBlackout = (region, year) => within(BLACKOUT_YEARS[region], Number(year) || 0);

const REST_NAME = {western: "Sunday", orthodox: "Sunday", jewish: "The Sabbath", islamic: "Friday"};
const nameOf = c => c?.day || c?.feast || c?.fast || c?.season || "the day";

/** What one faith's day does to a hunt: [{n, why}]. c: a faithDay() answer; at: {evening, byDay, area, hour}. */
function stepsFor(c, at, {region = null, year = 0, dow = null} = {}) {
  const out = [];
  if ( !c ) return out;
  const named = [c.day, c.feast].filter(Boolean).join("; ");
  const fair = FAIR.test(named);
  if ( fair && c.observance !== "light" ) out.push({n: -1, key: "fair", why: `${nameOf(c)}: a fair, the town full of strangers`});
  const strict = STRICTEST.find(([re]) => re.test(`${c.fast ?? ""} ${c.day ?? ""}`));
  if ( strict && c.observance !== "light" ) {
    out.push({n: c.observance === "strict" ? 2 : 1, key: "strictest", why: `${String(c.fast ?? c.day).replace(/,.*$/, "")}: ${strict[1]}${c.observance === "strict" ? "" : ", kept by custom"}`});
  } else if ( c.season === "Ramadan" && c.revel ) {
    if ( at.evening ) out.push({n: -1, key: "ramadan", why: "A night of Ramadan: the town is out late once the fast is broken"});
  } else if ( c.revel && !fair ) {
    if ( at.evening ) out.push({n: -1, key: "revel", why: `${nameOf(c)}: a night of revel, the streets busy late`});
  } else if ( c.crowd === "quiet" ) {
    out.push({n: 1, key: "fast", why: `${nameOf(c)}: kept strictly, few out and the taverns shut`});
  }
  // By day the stalls are shut on a holy day or the day of rest (the Muslim Friday shuts them only at noon)
  if ( at.byDay && ["market", "merchant"].includes(at.area) && c.observance !== "light" && !fair ) {
    const rest = restDay(c.faith, region, year);
    if ( c.feast && !c.revel ) out.push({n: 1, key: "holy", why: `${c.feast}: a holy day, the market shut`});
    else if ( rest !== null && rest === dow && REST_NAME[c.faith] && !(c.faith === "islamic" && (at.hour < 12 || at.hour >= 14)) )
      out.push({n: 1, key: "rest", why: `${REST_NAME[c.faith]}: the day of rest, the stalls shut`});
  }
  return out;
}

/**
 * The calendar's changes to one hunt.
 *   main: the faithDay() answer of the town's own faith (WoDX Chronicle church.on), with faith set
 *   minor: [{faith, label, c}] other faiths kept in part of the town
 *   hour (0-23), year, region, dow (0 Monday ... 6 Sunday), area (a hunting ground key or a place kind)
 *   crowd: the night's own nudge already given for empty streets (hunt-night-rules huntNudge n), so a curfew in an
 *     age whose nights are empty anyway is not counted twice
 *   outdoors: false for a hunt that never leaves a building (no curfew, no blackout)
 * Returns {n, changes: [{n, why, faith?, minor?}], text}.
 */
export function huntCalendar({main = null, minor = [], hour = 22, year = 0, region = null, dow = null, area = "market", crowd = 0, outdoors = true} = {}) {
  const h = Number(hour) || 0;
  const at = {hour: h, area, evening: h >= 18 || h < 5, byDay: h >= 7 && h < 18};
  const changes = [];
  for ( const s of stepsFor(main, at, {region, year, dow}) ) changes.push({...s, faith: main?.faith ?? null});
  for ( const m of minor ?? [] ) {
    if ( !m?.c || m.faith === main?.faith ) continue;
    for ( const s of stepsFor({...m.c, faith: m.faith}, at, {region, year, dow}) )
      changes.push({n: 0, key: s.key, faith: m.faith, minor: true, why: `${m.label ?? m.faith}, in its own quarter: ${s.why} (${s.n > 0 ? "+" : "−"}${Math.abs(s.n)} there, the Storyteller's call)`});
  }
  if ( outdoors ) {
    const curfewFrom = main?.curfewStart ?? 21;
    const curfew = keepsCurfew(region, year) && (h >= curfewFrom || h < 5);
    if ( curfew ) changes.push(crowd >= 2
      ? {n: 0, key: "curfew", why: "The curfew: the watch is out, already counted in the empty streets"}
      : {n: 1, key: "curfew", why: `The curfew: from ${curfewFrom === 24 ? "midnight" : `${curfewFrom}:00`} the watch stops anyone abroad`});
    if ( inBlackout(region, year) && at.evening ) changes.push({n: 1, key: "blackout", why: "The blackout: dark streets, few out, wardens on the corners"});
  }
  const sum = changes.reduce((t, c) => t + c.n, 0);
  const n = Math.max(-CALENDAR_CAP, Math.min(CALENDAR_CAP, sum));
  return {n, changes, text: calendarText({n, changes})};
}

/** One line: "−1: Corpus Christi: a night of revel; +1 the curfew ..." with each change named. */
export function calendarText(cal) {
  if ( !cal?.changes?.length ) return "";
  const sign = x => (x > 0 ? `+${x}` : x < 0 ? `−${-x}` : "±0");
  const parts = cal.changes.map(c => `${sign(c.n)} ${c.why}`);
  const sum = cal.changes.reduce((t, c) => t + c.n, 0);
  return `${sign(cal.n)} in all${sum !== cal.n ? ` (held to ${CALENDAR_CAP} either way)` : ""}: ${parts.join("; ")}`;
}
