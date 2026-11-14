/**
 * Spreading Wyrm corruption, the pure part. No Foundry in here. Decisions B3270-B3276.
 *
 * The book picture (W20, chapter seven): in the Penumbra, pollution and places of misery leave stains on the spirit
 * landscape, and Wyrm-spirits gather there to feed and breed until werewolves thin them out (pdf p. 314, printed 312).
 * The worst become Blights and Hellholes, and a Hellhole can outlast the clean-up of the place it mirrors (pdf
 * p. 316-317, printed 314-315). The Rite of Cleansing lifts taint from a person, place or thing with one success, its
 * difficulty set by how deep the taint runs, one easier at dawn, and it only hurts those whose taint is innate
 * (pdf p. 205-206, printed 203-204).
 *
 * WoDX turns that picture into a slow clock, like heat for Kindred. Everything below is a house reading:
 * - A place has a corruption level 0 to 10, in bands: clean, tainted (1-3), blighted (4-6), foul (7-9), hellhole (10).
 * - Sources push it up each week: a Bane nest, a cult, a Black Spiral hive, a tainted works, a place of suffering,
 *   and from 1913 a Pentex concern. Banes breed in a blighted place until culled.
 * - A blighted place with Banes in it can spread a step to the places linked to it. A warded place (a fresh Rite of
 *   Cleansing) or a tended caern holds it off.
 * - The Wyrm grows stronger as the centuries pass, so every chance scales with the year.
 * - People who live in a blighted place take on taint, three steps, and at the last a Bane may ride them: that is
 *   only ever proposed to the Storyteller.
 */

export const WEEK = 7 * 86400;
export const MAX = 10;
export const HELLHOLE_FLOOR = 7;

export const BANDS = [
  {id: "clean", label: "Clean", min: 0, max: 0, cleanse: null},
  {id: "tainted", label: "Tainted", min: 1, max: 3, cleanse: 6},
  {id: "blighted", label: "Blighted", min: 4, max: 6, cleanse: 7},
  {id: "foul", label: "Foul", min: 7, max: 9, cleanse: 8},
  {id: "hellhole", label: "Hellhole", min: 10, max: 10, cleanse: 9}
];
const BAND_INDEX = Object.fromEntries(BANDS.map((b, i) => [b.id, i]));

/** What feeds the corruption of a place. `from` is the first year it can exist; `lasts` weeks for those that pass. */
export const SOURCES = {
  nest: {label: "A Bane nest", weight: 2},
  cult: {label: "A Wyrm cult that meets here", weight: 1},
  hive: {label: "A Black Spiral hive", weight: 3},
  works: {label: "A tainted works (a tannery, a mine, a mill, a plant)", weight: 1},
  suffering: {label: "A place of suffering (a massacre, a plague pit, a prison)", weight: 1, lasts: 53},
  pentex: {label: "A Pentex concern", weight: 2, from: 1913}
};

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const str = (v, n = 120) => String(v ?? "").slice(0, n);

export function bandOf(level) {
  const l = clamp(Math.round(num(level)), 0, MAX);
  return BANDS.find(b => l >= b.min && l <= b.max) ?? BANDS[0];
}
export const bandIndex = level => BAND_INDEX[bandOf(level).id];

/**
 * How strong the Wyrm is in a year. House reading of the W20 premise that the Apocalypse draws nearer: slow before
 * the factories, faster with industry, faster again in the 20th century, fastest in the last days.
 */
export function eraFactor(year) {
  const y = num(year) || 1197;
  if ( y < 1750 ) return 0.5;
  if ( y < 1900 ) return 1;
  if ( y < 2000 ) return 1.5;
  if ( y < 2023 ) return 2;
  return 2.5;
}

export const sourceAllowed = (kind, year) => !!SOURCES[kind] && (SOURCES[kind].from === undefined || num(year) >= SOURCES[kind].from);

export function normSource(s = {}) {
  const kind = SOURCES[s.kind] ? s.kind : "nest";
  const out = {kind, name: str(s.name, 80), since: num(s.since)};
  if ( SOURCES[kind].lasts ) out.until = num(s.until) || (out.since + SOURCES[kind].lasts * WEEK);
  return out;
}

export function normPlace(p = {}) {
  const level = clamp(Math.round(num(p.level)), 0, MAX);
  return {
    level,
    banes: clamp(Math.round(num(p.banes)), 0, 30),
    sources: (Array.isArray(p.sources) ? p.sources : []).slice(0, 12).map(normSource),
    links: [...new Set((Array.isArray(p.links) ? p.links : []).map(String).filter(Boolean))].slice(0, 12),
    ward: num(p.ward),
    caern: !!p.caern,
    quiet: clamp(Math.round(num(p.quiet)), 0, 520),
    floor: level >= MAX || p.floor ? HELLHOLE_FLOOR : 0,
    log: (Array.isArray(p.log) ? p.log : []).slice(-20).map(e => ({at: num(e.at), what: str(e.what, 200)}))
  };
}

/** The weekly push of a place's live sources, in the given year. */
export function pressure(place, {now = 0, year = 1197} = {}) {
  const p = normPlace(place);
  let w = 0;
  for ( const s of p.sources ) {
    if ( !sourceAllowed(s.kind, year) ) continue;
    if ( s.until && now >= s.until ) continue;
    w += SOURCES[s.kind].weight;
  }
  if ( p.banes >= 3 ) w += 1;
  return w;
}

/** The chance a place rises one step this week. */
export const riseChance = (w, year, rate = 1) => (w > 0 ? Math.min(0.9, 0.1 * w * eraFactor(year) * normRate(rate)) : 0);

/**
 * B3525: the Storyteller's lever for a region's Wyrm spread, 0 (held) to 3 (three times as fast); 1 is the house
 * rule as written. It multiplies the chance to deepen and to spread, nothing else.
 */
export const RATE = {min: 0, max: 3};
export function normRate(r) { const x = Number(r); return Number.isFinite(x) ? Math.max(RATE.min, Math.min(RATE.max, x)) : 1; }

/** The chance a blighted place with Banes spreads a step down one link this week. */
export function spreadChance(level, banes, year, rate = 1) {
  const b = bandIndex(level);
  if ( b < BAND_INDEX.blighted || num(banes) <= 0 ) return 0;
  return Math.min(0.6, 0.05 * (b - 1) * eraFactor(year) * normRate(rate));
}

const log = (p, at, what) => [...p.log, {at, what: str(what, 200)}].slice(-20);

/**
 * One week for every place. `places` is {id: {name, place}}; `rng` returns 0 to 1. Returns the new records, the
 * band changes (for the Gauntlet), and the spread steps.
 */
export function weekTurn(places, {now = 0, year = 1197, rng = Math.random} = {}) {
  const ids = Object.keys(places);
  const out = Object.fromEntries(ids.map(id => [id, normPlace(places[id].place)]));
  const before = Object.fromEntries(ids.map(id => [id, out[id].level]));
  const events = [];
  for ( const id of ids ) {
    let p = out[id];
    // Passing sources end
    const live = p.sources.filter(s => !(s.until && now >= s.until));
    if ( live.length !== p.sources.length ) p = {...p, sources: live, log: log(p, now, "A place of suffering is no longer fresh")};
    const w = pressure(p, {now, year});
    const rate = places[id].rate ?? 1;
    if ( w > 0 && p.level < MAX && rng() < riseChance(w, year, rate) ) {
      p = {...p, level: p.level + 1, quiet: 0, log: log(p, now, "The corruption deepens")};
      events.push({id, kind: "rise"});
    } else if ( w === 0 && p.banes === 0 && p.level > p.floor ) {
      // Gaia heals slowly where nothing feeds the taint: a step a season, only out of the tainted band
      const quiet = p.quiet + 1;
      if ( quiet >= 13 && bandIndex(p.level) <= BAND_INDEX.tainted ) {
        p = {...p, level: p.level - 1, quiet: 0, log: log(p, now, "The taint fades a little")};
        events.push({id, kind: "fade"});
      } else p = {...p, quiet};
    }
    // Banes breed in a blighted place: one every four weeks for each band past tainted
    const b = bandIndex(p.level);
    if ( b >= BAND_INDEX.blighted ) {
      const cap = 3 * b;
      const breed = (b - BAND_INDEX.tainted) / 4;
      if ( p.banes < cap && rng() < breed ) { p = {...p, banes: p.banes + 1}; events.push({id, kind: "breed"}); }
    }
    if ( p.level >= MAX ) p = {...p, floor: HELLHOLE_FLOOR};
    out[id] = p;
  }
  // Spread along links, from the state at the start of the week's spreading
  const snapshot = Object.fromEntries(ids.map(id => [id, out[id]]));
  for ( const id of ids ) {
    const src = snapshot[id];
    const chance = spreadChance(src.level, src.banes, year, places[id].rate ?? 1);
    if ( !chance ) continue;
    for ( const to of src.links ) {
      const t = out[to];
      if ( !t || to === id ) continue;
      if ( t.caern || (t.ward && now < t.ward) ) continue;
      if ( t.level >= src.level - 2 ) continue;
      if ( rng() >= chance ) continue;
      out[to] = {...t, level: t.level + 1, quiet: 0, log: log(t, now, `Taint creeps in from ${str(places[id]?.name ?? "a place nearby", 60)}`)};
      events.push({id: to, kind: "spread", from: id});
    }
  }
  const bands = ids.filter(id => bandOf(before[id]).id !== bandOf(out[id].level).id)
    .map(id => ({id, from: bandOf(before[id]).id, to: bandOf(out[id].level).id, up: out[id].level > before[id]}));
  return {places: out, events, bands};
}

/** Several weeks at once (a time skip), capped at ten years. */
export function runWeeks(places, weeks, {start = 0, yearAt = () => 1197, rng = Math.random} = {}) {
  const n = clamp(Math.floor(num(weeks)), 0, 520);
  let cur = places;
  const events = [], first = Object.fromEntries(Object.entries(places).map(([id, v]) => [id, normPlace(v.place).level]));
  for ( let i = 1; i <= n; i++ ) {
    const now = start + i * WEEK;
    const r = weekTurn(cur, {now, year: yearAt(now), rng});
    events.push(...r.events);
    cur = Object.fromEntries(Object.entries(cur).map(([id, v]) => [id, {...v, place: r.places[id]}]));
  }
  const out = Object.fromEntries(Object.entries(cur).map(([id, v]) => [id, v.place]));
  const bands = Object.keys(out).filter(id => bandOf(first[id]).id !== bandOf(out[id].level).id)
    .map(id => ({id, from: bandOf(first[id]).id, to: bandOf(out[id].level).id, up: out[id].level > first[id]}));
  return {places: out, events, bands, weeks: n, settled: Math.max(0, Math.floor(num(weeks)) - n)};
}

/* ---------------- Cleansing and culling ---------------- */

/** The Rite of Cleansing on a place: difficulty from the band, one less at dawn. */
export function cleanseDifficulty(level, {dawn = false} = {}) {
  const d = bandOf(level).cleanse;
  return d === null ? null : Math.max(3, d - (dawn ? 1 : 0));
}

/** A successful rite lifts one step and wards the place for four weeks; a Hellhole never drops below its floor. */
export function cleanse(place, {successes = 0, now = 0} = {}) {
  const p = normPlace(place);
  if ( num(successes) < 1 || p.level === 0 ) return {...p, changed: false};
  const level = Math.max(p.floor, p.level - 1);
  return {...p, level, ward: now + 4 * WEEK, quiet: 0, changed: level !== p.level,
    log: log(p, now, level !== p.level ? "A Rite of Cleansing lifts the taint a step" : "A Rite of Cleansing holds, but the Hellhole remains")};
}

/** A pack culls the Banes. */
export function cull(place, killed, {now = 0} = {}) {
  const p = normPlace(place), k = clamp(Math.round(num(killed)), 0, p.banes);
  return {...p, banes: p.banes - k, log: k ? log(p, now, `${k} Bane${k === 1 ? "" : "s"} culled`) : p.log};
}

/* ---------------- People ---------------- */

export const TAINT_STEPS = [
  {level: 0, label: "Clean"},
  {level: 1, label: "Touched", note: "Sense Wyrm picks it up faintly"},
  {level: 2, label: "Tainted", note: "Bad dreams, a sickly look, small cruelties"},
  {level: 3, label: "Ripe", note: "A Bane could ride this one"}
];
/** Weeks of living in a place to take one step, by band. Werebeasts take twice as long. */
export const EXPOSURE_WEEKS = {blighted: 12, foul: 6, hellhole: 3};

export function normTaint(t = {}) {
  return {level: clamp(Math.round(num(t.level)), 0, 3), weeks: clamp(Math.round(num(t.weeks)), 0, 520), innate: !!t.innate,
    where: str(t.where, 80), proposed: !!t.proposed, ridden: !!t.ridden};
}

/**
 * One week for a person in a place. Innate taint (vampires, fomori, Black Spiral Dancers) does not move.
 * Returns the new taint and whether it reached the last step this week.
 */
export function exposeWeek(taint, placeLevel, {nature = "human", where = ""} = {}) {
  const t = normTaint(taint);
  if ( t.innate || t.ridden ) return {...t, ripened: false, changed: false};
  const per = EXPOSURE_WEEKS[bandOf(placeLevel).id];
  if ( !per || t.level >= 3 ) return {...t, ripened: false, changed: false};
  const need = nature === "werebeast" ? per * 2 : per;
  const weeks = t.weeks + 1;
  if ( weeks < need ) return {...t, weeks, where: str(where, 80) || t.where, ripened: false, changed: true};
  const level = t.level + 1;
  return {...t, level, weeks: 0, where: str(where, 80) || t.where, ripened: level === 3, changed: true};
}

/** The Rite of Cleansing on a person: one success lifts all of it (W20); deeper taint makes it harder (house). */
export function cleansePersonDifficulty(taint, {dawn = false} = {}) {
  const t = normTaint(taint);
  if ( t.innate || t.ridden || !t.level ) return null;
  return Math.max(3, 5 + t.level - (dawn ? 1 : 0));
}
export function cleansePerson(taint, successes) {
  const t = normTaint(taint);
  if ( t.innate || num(successes) < 1 ) return {...t, changed: false, pains: t.innate};
  if ( t.ridden ) return {...t, changed: false, pains: true};
  return {...t, level: 0, weeks: 0, proposed: false, changed: t.level > 0, pains: false};
}

/** Whether Sense Wyrm finds a person: innate taint, or any step of taint. */
export const registersAsWyrm = t => { const n = normTaint(t); return n.innate || n.ridden || n.level > 0; };

/* ---------------- Pentex through the 20th century ---------------- */

/** The yearly chance one Pentex concern opens another down a link. */
export function pentexGrowth(year) {
  const y = num(year);
  if ( y < SOURCES.pentex.from ) return 0;
  if ( y < 1946 ) return 0.25;
  if ( y < 2000 ) return 0.35;
  return 0.45;
}

/**
 * Once a year: each place with a Pentex concern may open one in a linked place that has none. Proposals only.
 * Returns [{from, to}].
 */
export function pentexYear(places, {year, rng = Math.random} = {}) {
  const chance = pentexGrowth(year);
  if ( !chance ) return [];
  const out = [], taken = new Set();
  const has = p => normPlace(p).sources.some(s => s.kind === "pentex");
  for ( const [id, v] of Object.entries(places) ) {
    const p = normPlace(v.place);
    if ( !has(p) ) continue;
    const open = p.links.filter(l => places[l] && !has(places[l].place) && !taken.has(l));
    if ( !open.length || rng() >= chance ) continue;
    const to = open[Math.floor(rng() * open.length) % open.length];
    taken.add(to);
    out.push({from: id, to});
  }
  return out;
}

/** The Gauntlet drift step a band change asks for (Otherworlds drift kinds), or null. */
export function driftFor(change) {
  if ( !change ) return null;
  const to = BAND_INDEX[change.to] ?? 0;
  if ( change.up && to >= BAND_INDEX.blighted ) return "taint";
  if ( !change.up && to < BAND_INDEX.blighted && (BAND_INDEX[change.from] ?? 0) >= BAND_INDEX.blighted ) return "mend";
  return null;
}
