/**
 * WoDX Storyteller 0.22.0: travel by era. Pure rules, no Foundry, so the harness can test them.
 *
 * A place may carry a distance (km) and the kind of road that reaches it. The trip's time then comes from the way of
 * travelling the year allows on that road, slowed by the day's weather and, before roads were lit, by the dark. A
 * route's or a place's hand-typed minutes still win over all of this, so places set up before keep their times.
 *
 * The books give no travel speeds for play. Every figure here is a house figure (B700 to B703), rounded and kept
 * plain. The years in ROADS and MODES are Moravia's: the railway reaches Brno in 1839, the horse tram runs there from
 * 1869, and the first motorway in the Czech lands opens in 1971. From Storyteller 0.57.0 (B2571) every world region
 * keeps its own years (REGION_ROADS below), and each rule takes the region a trip starts in.
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

/**
 * The years the roads and ways changed in each world region (Chronicle's world-rules.mjs). A house reading of
 * history, rounded to when a thing was common enough to take, not its first trial. null: not in WoDX's years there.
 *
 *   rail      the first railway a traveller could ride (Cuba's in 1837, before Spain's; Lhasa's only in 2006)
 *   tram      the horse tram or streetcar, later the town bus
 *   motorway  the first motorway or expressway (Italy's autostrada of 1924, Germany's of 1932)
 *   car       motor cars on the roads for anyone who can pay
 *   lit       the open road lit at night: lamps on the main roads, then headlights and lit highways
 *   street    town streets lit at night (oil lamps in London from the 1740s, in Mexico City from 1790)
 *   paved     country roads paved enough to stay dry in the wet
 *   highway   main roads kept as post roads, metalled and fast for coaches
 */
const RY = (rail, tram, motorway, car, lit, street, paved, highway) => ({rail, tram, motorway, car, lit, street, paved, highway});
export const REGION_ROADS = {
  "moravia": RY(1839, 1869, 1971, 1900, 1900, 1800, 1950, 1750),
  "german-lands": RY(1835, 1865, 1932, 1895, 1900, 1790, 1935, 1750),
  "british-isles": RY(1825, 1860, 1958, 1896, 1890, 1740, 1930, 1720),
  "france": RY(1832, 1855, 1946, 1895, 1900, 1770, 1935, 1740),
  "iberia": RY(1848, 1871, 1969, 1905, 1920, 1800, 1960, 1770),
  "italy": RY(1839, 1872, 1924, 1900, 1910, 1790, 1950, 1760),
  "low-countries": RY(1835, 1864, 1937, 1898, 1900, 1780, 1930, 1740),
  "scandinavia": RY(1847, 1877, 1953, 1905, 1910, 1800, 1950, 1780),
  "poland-baltic": RY(1845, 1866, 1975, 1910, 1920, 1810, 1960, 1800),
  "carpathians-balkans": RY(1846, 1866, 1964, 1905, 1920, 1810, 1960, 1800),
  "russia": RY(1837, 1863, 1970, 1910, 1930, 1820, 1965, 1800),
  "aegean": RY(1869, 1871, 1965, 1910, 1930, 1840, 1960, 1850),
  "anatolia": RY(1866, 1871, 1973, 1920, 1950, 1860, 1965, 1860),
  "levant": RY(1892, 1907, 1980, 1920, 1955, 1890, 1960, 1880),
  "egypt": RY(1854, 1863, 1980, 1905, 1940, 1870, 1950, 1860),
  "arabia": RY(1908, 1950, 1980, 1930, 1970, 1950, 1975, 1930),
  "maghreb": RY(1862, 1890, 1975, 1910, 1950, 1860, 1955, 1860),
  "persia": RY(1938, 1888, 1975, 1925, 1960, 1900, 1965, 1880),
  "central-asia": RY(1888, 1901, 1985, 1925, 1960, 1900, 1965, 1890),
  "siberia": RY(1898, 1930, 2000, 1930, 1970, 1900, 1975, 1900),
  "tibet-himalaya": RY(2006, 1990, 2011, 1955, 1990, 1960, 1990, 1960),
  "india": RY(1853, 1873, 2002, 1905, 1960, 1860, 1960, 1840),
  "china": RY(1881, 1904, 1988, 1920, 1960, 1865, 1970, 1900),
  "japan": RY(1872, 1895, 1963, 1910, 1930, 1872, 1965, 1880),
  "korea": RY(1899, 1899, 1968, 1915, 1960, 1900, 1970, 1910),
  "southeast-asia": RY(1893, 1888, 1995, 1910, 1965, 1890, 1970, 1900),
  "nusantara": RY(1867, 1869, 1978, 1910, 1960, 1870, 1970, 1810),
  "west-africa": RY(1885, 1930, 1978, 1920, 1970, 1920, 1975, 1920),
  "central-africa": RY(1898, 1940, 2015, 1930, 1985, 1930, 1990, 1930),
  "east-africa": RY(1901, 1930, 2012, 1920, 1975, 1920, 1975, 1920),
  "southern-africa": RY(1860, 1863, 1965, 1900, 1950, 1860, 1960, 1860),
  "canada": RY(1836, 1861, 1939, 1905, 1930, 1820, 1950, 1820),
  "north-america-east": RY(1830, 1832, 1940, 1900, 1920, 1817, 1925, 1800),
  "north-america-west": RY(1869, 1873, 1940, 1905, 1930, 1860, 1935, 1870),
  "mexico": RY(1873, 1857, 1952, 1910, 1950, 1790, 1960, 1800),
  "caribbean": RY(1837, 1858, 1965, 1905, 1950, 1840, 1960, 1850),
  "andes": RY(1851, 1878, 1975, 1910, 1960, 1850, 1970, 1860),
  "brazil": RY(1854, 1859, 1947, 1905, 1950, 1854, 1965, 1860),
  "southern-cone": RY(1857, 1863, 1970, 1905, 1940, 1856, 1955, 1860),
  "australia": RY(1854, 1860, 1958, 1900, 1930, 1841, 1950, 1850),
  "aotearoa": RY(1863, 1878, 1950, 1900, 1935, 1862, 1955, 1870),
  "pacific-islands": RY(1880, 1888, 1960, 1900, 1940, 1888, 1950, 1890),
  "arctic": RY(null, 1980, null, 1950, 1970, 1950, null, null),
  "antarctica": RY(null, null, null, 1957, null, null, null, null)
};

/** A region's years: its own row, else Moravia's (the first chronicle's, and the rules' old fixed years). */
export const roadYears = region => REGION_ROADS[region] ?? REGION_ROADS.moravia;
/** The year one of a region's roads or ways came; Infinity when it never does there. */
export function yearOf(what, region = null) {
  const v = roadYears(region)[what];
  return v === null || v === undefined ? Infinity : v;
}
/** The year a kind of road exists in a region (a motorway, a railway), or undefined for a road that always has. */
const roadFrom = (kind, region) => (kind === "motorway" ? yearOf("motorway", region) : kind === "rail" ? yearOf("rail", region) : ROADS[kind]?.from);
/** The year a way of travelling opens in a region. */
const modeFrom = (id, region) => (id === "train" ? yearOf("rail", region) : id === "tram" ? yearOf("tram", region) : id === "car" ? yearOf("car", region) : MODES[id]?.from ?? 0);

/** The road as it stands in a year: a motorway or a railway not yet built goes as the road before it. */
export function roadIn(kind, year, region = null) {
  let k = roadKind(kind);
  for ( let i = 0; i < 3 && roadFrom(k, region) && year < roadFrom(k, region); i++ ) k = ROADS[k].before ?? "road";
  return k;
}

/** The ways open in a year on a road: [{id, label, speed}], fastest first. region: where the trip starts. */
export function modesFor(kind, year, {future = false, region = null} = {}) {
  const y = Number(year) || 0;
  const r = roadIn(kind, y, region);
  // A main road counts as a post road from the region's own year (the speed rules read 1750)
  const sy = r === "highway" ? (y >= yearOf("highway", region) ? Math.max(y, 1750) : Math.min(y, 1749)) : y;
  return Object.entries(MODES)
    .filter(([id, m]) => y >= modeFrom(id, region) && y <= m.to && (!m.future || future))
    .map(([id, m]) => ({id, label: m.label, speed: m.speed(r, sy)}))
    .filter(m => m.speed)
    .sort((a, b) => b.speed - a.speed || a.id.localeCompare(b.id));
}

/** The way a trip goes: the one asked for when the year and road allow it, else the fastest open. */
export function pickMode(kind, year, want = null, opts = {}) {
  const list = modesFor(kind, year, opts);
  return list.find(m => m.id === want) ?? list[0] ?? null;
}

/** Is this road paved in this year? Country roads and main roads by the region's years; streets from 1800. */
const isPaved = (kind, year, region = null) => {
  const p = kind === "road" ? yearOf("paved", region) : kind === "highway" ? yearOf("highway", region) : ROADS[kind]?.paved;
  return p !== null && p !== undefined && year >= p;
};

/**
 * How the weather slows a trip: a factor of 1 or more, and the words for it. weather: WoDX Atmosphere's day
 * ({precip, intensity, snowLying, deepSnow, fog, wind}), or null.
 */
export function weatherFactor(weather, kind, mode, year, region = null) {
  if ( !weather ) return {factor: 1, why: []};
  const w = weather, paved = isPaved(kind, year, region), why = [];
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

/** Is the way dark at night in this year? Unlit roads before the region's year (ROADS_LIT in Moravia); town streets before their lamps. */
export function darkRoad(kind, year, region = null) {
  const k = roadKind(kind);
  if ( ["rail", "water"].includes(k) ) return false;
  if ( k === "street" ) return year < yearOf("street", region);
  return year < yearOf("lit", region);
}

/** The dark slows those who walk, ride or drive a team on an unlit way. House figure. */
export function nightFactor(kind, mode, year, night, region = null) {
  if ( !night || !darkRoad(kind, year, region) || !["foot", "horse", "coach"].includes(mode) ) return 1;
  return roadKind(kind) === "street" ? 1.25 : 1.5;
}

/**
 * A trip by distance. Returns {minutes, mode, modeLabel, road, why} or null when no way is open (a lake with no boat
 * cannot happen: boats are always open). minutes is at least 1.
 *   km, road: the place's; year; want: the way asked for; weather; night: the trip starts at night; future: the branch;
 *   region: the world region the trip starts in (Moravia's years when left out).
 */
export function tripByDistance({km, road, year, want = null, weather = null, night = false, future = false, region = null} = {}) {
  const d = Number(km);
  if ( !(d > 0) ) return null;
  const y = Number(year) || 0;
  const r = roadIn(road, y, region);
  const m = pickMode(r, y, want, {future, region});
  if ( !m ) return null;
  const wf = weatherFactor(weather, r, m.id, y, region);
  const nf = nightFactor(r, m.id, y, night, region);
  const why = [...wf.why, ...(nf > 1 ? ["the dark"] : [])];
  const minutes = Math.max(1, Math.min(24 * 60 * 7, Math.round((d / m.speed) * 60 * wf.factor * nf)));
  return {minutes, mode: m.id, modeLabel: m.label, road: r, why};
}

/** The encounter chance for each hour on this road: the base scaled by the road, and by a quarter more in the dark. */
export function encounterChance(base, kind, year, night = false, region = null) {
  const b = Math.max(0, Math.min(100, Number(base) || 0));
  const r = roadIn(kind, Number(year) || 0, region);
  const dark = night && darkRoad(r, Number(year) || 0, region) ? 1.25 : 1;
  return Math.max(0, Math.min(100, Math.round(b * (ROADS[r]?.enc ?? 1) * dark * 10) / 10));
}
