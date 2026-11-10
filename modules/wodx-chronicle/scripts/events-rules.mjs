/**
 * Dated events: the pure rules (no Foundry calls), so the harness can test them.
 *
 * An event is {id, year, month?, day?, branch, metaplot?, ...}. The Storyteller's choices are kept as
 * overrides: {[id]: {on?: boolean, year?: number, month?: number, day?: number}}.
 */

/** A sortable number for a date: 13470101 for 1 January 1347. */
export function dateKey({year, month = 1, day = 1}) {
  return year * 10000 + month * 100 + day;
}

/** The event with the Storyteller's overrides applied. */
export function effective(ev, overrides = {}) {
  const o = overrides?.[ev.id] ?? {};
  const out = {...ev};
  for ( const k of ["year", "month", "day"] ) if ( Number.isFinite(o[k]) ) out[k] = o[k];
  if ( typeof o.journal === "string" && o.journal ) out.journal = o.journal;
  out.on = typeof o.on === "boolean" ? o.on : !ev.metaplot;
  out.moved = ["year", "month", "day"].some(k => Number.isFinite(o[k]) && o[k] !== ev[k]);
  return out;
}

/**
 * Does the event belong to this timeline? An event with `cascade` belongs only to that Cascade of the Time of
 * Future Judgement, and fires only when the Storyteller has chosen it.
 */
export function inBranch(ev, futureBranch, cascade = "") {
  if ( ev.cascade && ev.cascade !== cascade ) return false;
  if ( ev.branch === "future" ) return !!futureBranch;
  if ( ev.branch === "classic" ) return !futureBranch;
  return true;
}

/** Every event with overrides applied, oldest first, each marked `live` when it is on and in the branch. */
export function eventTable(events, {overrides = {}, futureBranch = false, cascade = ""} = {}) {
  return events.map(ev => effective(ev, overrides))
    .map(ev => ({...ev, live: ev.on && inBranch(ev, futureBranch, cascade), key: dateKey(ev)}))
    .sort((a, b) => a.key - b.key || a.id.localeCompare(b.id));
}

/** The ids of the live events whose date is on or before `date` ({year, month, day}). */
export function firedAt(events, date, opts = {}) {
  const now = dateKey(date);
  return eventTable(events, opts).filter(ev => ev.live && ev.key <= now).map(ev => ev.id);
}

/**
 * What changed between the fired list saved last time and the one the date calls for now.
 * `fired` comes back oldest first; `undone` (the clock went back, or a switch went off) newest first.
 */
export function diffFired(events, before, now, opts = {}) {
  const order = eventTable(events, opts).map(ev => ev.id);
  const was = new Set(before ?? []);
  const is = new Set(now);
  const fired = order.filter(id => is.has(id) && !was.has(id));
  const undone = order.filter(id => was.has(id) && !is.has(id)).reverse();
  return {fired, undone};
}

/** A short date label: "1 July 1916", or the year alone when only the year is known. */
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function dateLabel(ev) {
  if ( !ev.month ) return String(ev.year);
  if ( !ev.day ) return `${MONTHS[ev.month - 1]} ${ev.year}`;
  return `${ev.day} ${MONTHS[ev.month - 1]} ${ev.year}`;
}

/** Check a saved override from the window: a year in range, a real month and day, or nothing. */
export function cleanOverride(raw) {
  const out = {};
  if ( typeof raw?.on === "boolean" ) out.on = raw.on;
  const y = Number(raw?.year), m = Number(raw?.month), d = Number(raw?.day);
  if ( raw?.year !== "" && raw?.year != null && Number.isInteger(y) && y >= 1 && y <= 3000 ) out.year = y;
  if ( raw?.month !== "" && raw?.month != null && Number.isInteger(m) && m >= 1 && m <= 12 ) out.month = m;
  if ( raw?.day !== "" && raw?.day != null && Number.isInteger(d) && d >= 1 && d <= 31 ) out.day = d;
  return out;
}
