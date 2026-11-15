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
    .sort((a, b) => a.key - b.key || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
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

/* ------------------------------------------------------------------ */
/*  News by part of the world (Chronicle, B5890 to B5892)             */
/* ------------------------------------------------------------------ */

/**
 * An event with a `region` (the Future Darkness branch's world history, data/future-world.mjs) happens on its date
 * wherever the chronicle is, but the card only tells it where its news is heard: in the homeland's part of the world
 * and in the part the active scene stands in. Moravia hears Europe's news as well as its own.
 */
export const NEWS_PARTS = {MO: "Moravia", EU: "Europe", ME: "the Middle East", AS: "Asia", AF: "Africa", AM: "the Americas", OC: "Oceania"};
const PART_OF = {
  moravia: "MO",
  ...Object.fromEntries(["german-lands", "british-isles", "france", "iberia", "italy", "low-countries", "scandinavia", "poland-baltic",
    "carpathians-balkans", "russia", "aegean"].map(id => [id, "EU"])),
  ...Object.fromEntries(["anatolia", "levant", "egypt", "arabia", "persia"].map(id => [id, "ME"])),
  ...Object.fromEntries(["central-asia", "siberia", "tibet-himalaya", "india", "china", "japan", "korea", "southeast-asia", "nusantara",
    "philippines"].map(id => [id, "AS"])),
  ...Object.fromEntries(["maghreb", "west-africa", "east-africa", "southern-africa", "central-africa"].map(id => [id, "AF"])),
  ...Object.fromEntries(["canada", "north-america-east", "north-america-west", "mexico", "caribbean", "andes", "brazil", "southern-cone",
    "arctic"].map(id => [id, "AM"])),
  ...Object.fromEntries(["australia", "aotearoa", "pacific-islands", "antarctica"].map(id => [id, "OC"]))
};
/** The part of the world a WoDX region (Chronicle world-rules.mjs) belongs to; an unknown one counts as Moravia's. */
export const partOf = regionId => PART_OF[regionId] ?? "MO";
/** The parts of the world whose news is heard by people in these regions. */
export function newsCodes(...regionIds) {
  const out = new Set();
  for ( const id of regionIds.filter(Boolean) ) {
    const p = partOf(id);
    out.add(p);
    if ( p === "MO" ) out.add("EU");
  }
  if ( !out.size ) { out.add("MO"); out.add("EU"); }
  return out;
}
/** Is this event's news heard here? Events with no region are heard everywhere. */
export const heardIn = (ev, codes) => !ev?.region || codes.has(ev.region);

/**
 * What a card tells of the events that just fired: the ones heard here, newest news first kept to the year before the
 * date unless a time skip is being told (older news is counted, not listed), and how many happened elsewhere.
 */
export function newsFor(events, codes, {date = null, skip = false} = {}) {
  const near = [], older = [];
  let elsewhere = 0;
  const cut = date ? dateKey({...date, year: date.year - 1}) : -Infinity;
  for ( const ev of events ) {
    if ( !heardIn(ev, codes) ) { elsewhere++; continue; }
    if ( ev.region && !skip && dateKey(ev) < cut ) older.push(ev); else near.push(ev);
  }
  return {told: near, older: older.length, elsewhere};
}

/** How many events of the world timeline one card tells; the rest are counted (B5922). */
export const TOLD_CAP = 12;
/** Is this an event of the world timeline (data/world-history.mjs, B5920)? */
export const isWorld = ev => typeof ev?.id === "string" && ev.id.startsWith("wh-");
/**
 * Keep a card short: every book event is told, and of the world timeline only the newest `cap` (B5922).
 * Returns {told (in date order), more}: more is how many world events were left out.
 */
export function capTold(told, cap = TOLD_CAP) {
  const world = told.filter(isWorld);
  if ( world.length <= cap ) return {told, more: 0};
  const keep = new Set(world.sort((a, b) => dateKey(b) - dateKey(a)).slice(0, cap).map(ev => ev.id));
  return {told: told.filter(ev => !isWorld(ev) || keep.has(ev.id)), more: world.length - cap};
}
/** The era of the world timeline a year falls in ({id, name, from, to}), or the nearest one. */
export function worldEraAt(eras = [], year = 0) {
  if ( !eras.length ) return null;
  return eras.find(e => year >= e.from && year <= e.to)
    ?? eras.reduce((best, e) => Math.min(Math.abs(year - e.from), Math.abs(year - e.to)) < Math.min(Math.abs(year - best.from), Math.abs(year - best.to)) ? e : best);
}
/**
 * The rows the Dated events window and the Chronicle Rules page show: every book event, and of the world timeline
 * only the chosen era's (B5923). eraId "" shows no world events; "all" shows them all.
 */
export const shownIn = (ev, eraId) => !isWorld(ev) || eraId === "all" || ev.era === eraId;
/** A world event the table hears of in Legends: only what happened in the homeland's own part, Moravia (B5924). */
export const inLegends = ev => !ev?.hidden && (!isWorld(ev) || ev.region === "MO");
