/**
 * WoDX Storyteller 0.22.0: travel by era. Pure rules, no Foundry, so the harness can test them.
 *
 * A place may carry a distance (km) and the kind of road that reaches it. The trip's time then comes from the way of
 * travelling the year allows on that road, slowed by the day's weather and, before roads were lit, by the dark. A
 * route's or a place's hand-typed minutes still win over all of this, so places set up before keep their times.
 *
 * The books give no travel speeds for play. Every figure here is a house figure (B700 to B703), rounded and kept
 * plain. The years follow Moravia: the railway reaches Brno in 1839, the horse tram runs there from 1869, and the
 * first motorway in the Czech lands opens in 1971.
 */

/** Kinds of road. enc: how the encounter chance an hour is scaled. from: the year it exists (before it, the trip
 *  goes as on `before`). paved: the year its surface counts as paved (dry in the wet, faster wheels). */
export const ROADS = {
  path:     {label: "Track or footpath", enc: 1.5, paved: null},
  road:     {label: "Country road", enc: 1, paved: 1950},
  highway:  {label: "Main road (post road, later a highway)", enc: 0.75, paved: 1750},
  motorway: {label: "Motorway", enc: 0.25, paved: 0, from: 1971, before: "highway"},
  street:   {label: "Town streets", enc: 1, paved: 1800, lit: 1800},
  rail:     {label: "Railway line", enc: 0.25, paved: 0, from: 1839, before: "highway"},
  water:    {label: "River or lake, by boat", enc: 0.75, paved: 0}
};

/** When the open road counts as lit at night (street lamps, then headlights and lit highways). House figure. */
export const ROADS_LIT = 1900;

/**
 * Ways of travelling. from/to: the years. future: only on the World of Future Darkness branch. speed(road, year):
 * km an hour over a whole trip, rests included, or null when this way cannot use that road.
 */
export const MODES = {
  foot: {label: "On foot", from: 0, to: 9999,
    speed: r => ({path: 3, road: 4.5, highway: 5, motorway: null, street: 4.5, rail: null, water: null})[r] ?? null},
  horse: {label: "On horseback", from: 0, to: 9999,
    speed: (r, y) => ({path: 5, road: 7, highway: y >= 1750 ? 9 : 8, motorway: null, street: 5, rail: null, water: null})[r] ?? null},
  coach: {label: "By cart, wagon or coach", from: 0, to: 1945,
    speed: (r, y) => ({path: 3, road: 4.5, highway: y >= 1750 ? 9 : 5, motorway: null, street: 4, rail: null, water: null})[r] ?? null},
  boat: {label: "By boat", from: 0, to: 9999,
    speed: (r, y) => (r === "water" ? (y < 1830 ? 5 : y < 1950 ? 12 : 20) : null)},
  tram: {label: "By tram or bus", from: 1869, to: 9999,
    speed: (r, y) => (r === "street" ? (y < 1900 ? 8 : y < 1950 ? 12 : 16) : null)},
  train: {label: "By train", from: 1839, to: 9999,
    speed: (r, y) => (r === "rail" ? (y < 1880 ? 30 : y < 1950 ? 45 : y < 2000 ? 70 : 110) : null)},
  car: {label: "By car", from: 1900, to: 9999,
    speed: (r, y) => ({path: 12, road: y < 1930 ? 25 : y < 1960 ? 40 : 55, highway: y < 1930 ? 30 : y < 1960 ? 50 : 70, motorway: 100,
      street: y < 1950 ? 15 : 20, rail: null, water: null})[r] ?? null},
  transit: {label: "By transit pod", from: 2040, to: 9999, future: true,
    speed: r => ({path: null, road: 70, highway: 110, motorway: 180, street: 30, rail: 300, water: null})[r] ?? null}
};

export const roadKind = k => (ROADS[k] ? k : "road");

/** The road as it stands in a year: a motorway or a railway not yet built goes as the road before it. */
export function roadIn(kind, year) {
  let k = roadKind(kind);
  for ( let i = 0; i < 3 && ROADS[k].from && year < ROADS[k].from; i++ ) k = ROADS[k].before ?? "road";
  return k;
}

/** The ways open in a year on a road: [{id, label, speed}], fastest first. */
export function modesFor(kind, year, {future = false} = {}) {
  const y = Number(year) || 0;
  const r = roadIn(kind, y);
  return Object.entries(MODES)
    .filter(([, m]) => y >= m.from && y <= m.to && (!m.future || future))
    .map(([id, m]) => ({id, label: m.label, speed: m.speed(r, y)}))
    .filter(m => m.speed)
    .sort((a, b) => b.speed - a.speed || a.id.localeCompare(b.id));
}

/** The way a trip goes: the one asked for when the year and road allow it, else the fastest open. */
export function pickMode(kind, year, want = null, opts = {}) {
  const list = modesFor(kind, year, opts);
  return list.find(m => m.id === want) ?? list[0] ?? null;
}

const isPaved = (kind, year) => { const p = ROADS[kind]?.paved; return p !== null && p !== undefined && year >= p; };

/**
 * How the weather slows a trip: a factor of 1 or more, and the words for it. weather: WoDX Atmosphere's day
 * ({precip, intensity, snowLying, deepSnow, fog, wind}), or null.
 */
export function weatherFactor(weather, kind, mode, year) {
  if ( !weather ) return {factor: 1, why: []};
  const w = weather, paved = isPaved(kind, year), why = [];
  let f = 1;
  const add = (x, word) => { if ( x > 1 ) { f *= x; why.push(word); } };
  const wheels = ["coach", "car"].includes(mode);
  if ( kind === "water" ) {
    if ( w.wind === "gale" ) add(1.5, "a gale on the water");
    else if ( w.fog === "thick" ) add(1.3, "fog on the water");
  } else if ( ["rail"].includes(kind) && mode === "train" ) {
    if ( w.deepSnow ) add(1.25, "deep snow on the line");
  } else {
    if ( w.deepSnow ) add(paved ? 1.5 : 2, "deep snow");
    else if ( w.snowLying ) add(paved ? 1.2 : 1.4, "snow on the ground");
    else if ( w.precip === "snow" ) add(1.2, "falling snow");
    if ( !paved && ["rain", "sleet", "hail"].includes(w.precip) ) add(w.intensity === "heavy" ? 1.3 : 1.15, wheels ? "mud to the axles" : "mud");
    if ( w.fog === "thick" && mode !== "foot" ) add(1.2, "thick fog");
    if ( w.wind === "gale" && ["foot", "horse"].includes(mode) ) add(1.15, "a gale");
  }
  return {factor: Math.min(2.5, Math.round(f * 100) / 100), why};
}

/** Is the way dark at night in this year? Unlit roads before ROADS_LIT; town streets before their lamps. */
export function darkRoad(kind, year) {
  const k = roadKind(kind);
  if ( ["rail", "water"].includes(k) ) return false;
  if ( k === "street" ) return year < (ROADS.street.lit ?? 1800);
  return year < ROADS_LIT;
}

/** The dark slows those who walk, ride or drive a team on an unlit way. House figure. */
export function nightFactor(kind, mode, year, night) {
  if ( !night || !darkRoad(kind, year) || !["foot", "horse", "coach"].includes(mode) ) return 1;
  return roadKind(kind) === "street" ? 1.25 : 1.5;
}

/**
 * A trip by distance. Returns {minutes, mode, modeLabel, road, why} or null when no way is open (a lake with no boat
 * cannot happen: boats are always open). minutes is at least 1.
 *   km, road: the place's; year; want: the way asked for; weather; night: the trip starts at night; future: the branch.
 */
export function tripByDistance({km, road, year, want = null, weather = null, night = false, future = false} = {}) {
  const d = Number(km);
  if ( !(d > 0) ) return null;
  const y = Number(year) || 0;
  const r = roadIn(road, y);
  const m = pickMode(r, y, want, {future});
  if ( !m ) return null;
  const wf = weatherFactor(weather, r, m.id, y);
  const nf = nightFactor(r, m.id, y, night);
  const why = [...wf.why, ...(nf > 1 ? ["the dark"] : [])];
  const minutes = Math.max(1, Math.min(24 * 60 * 7, Math.round((d / m.speed) * 60 * wf.factor * nf)));
  return {minutes, mode: m.id, modeLabel: m.label, road: r, why};
}

/** The encounter chance for each hour on this road: the base scaled by the road, and by a quarter more in the dark. */
export function encounterChance(base, kind, year, night = false) {
  const b = Math.max(0, Math.min(100, Number(base) || 0));
  const r = roadIn(kind, Number(year) || 0);
  const dark = night && darkRoad(r, Number(year) || 0) ? 1.25 : 1;
  return Math.max(0, Math.min(100, Math.round(b * (ROADS[r]?.enc ?? 1) * dark * 10) / 10));
}
