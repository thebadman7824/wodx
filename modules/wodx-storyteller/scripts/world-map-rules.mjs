/**
 * WoDX Storyteller 0.55.0 (B2540 to B2549): the rough map of the whole Earth. Pure rules, no Foundry.
 *
 * The far view is one square for each degree (data/world.mjs, made from public-domain shapes): its ground, its world
 * region, the great rivers and the named ranges, deserts and seas. From it come
 *   - where a spot is, in words;
 *   - how long a journey between two spots takes in a given year, over land and sea, and by air once there is air;
 *   - a closer view of any one square, made the same way every time from the square and its neighbours (the way an
 *     old computer game makes a continent from a small authored map and seeded detail), for trips and town maps
 *     outside the hand-made country of Moravia;
 *   - a picture of the whole (svg), which WoDX Otherworlds also dresses as the Penumbra, the Shadowlands and the
 *     Dreaming.
 * Speeds and the years each way of travel arrives are a house reading of history, rounded for play; no book gives
 * them. The map is rough on purpose: a square is about 100 km across.
 */
import * as W from "../data/world.mjs";

export const COLS = W.COLS, ROWS = W.ROWS;
export const GROUND_WORDS = {"~": "open sea", l: "a great lake", i: "ice", M: "mountains", P: "high plateau", D: "desert", T: "tundra", p: "open plain", w: "wetland", ".": "settled and wooded land"};
const R2D = 180 / Math.PI, D2R = Math.PI / 180, EARTH = 6371;

/* ------------------------------------------------------------------ */
/*  Squares                                                            */
/* ------------------------------------------------------------------ */

const wrap = c => ((c % COLS) + COLS) % COLS;
/** The square a spot falls in. lon east (west is negative), lat north. */
export const squareOf = (lon, lat) => ({col: wrap(Math.floor(Number(lon) + 180)), row: Math.min(ROWS - 1, Math.max(0, Math.floor(90 - Number(lat))))});
/** The middle of a square: {lon, lat}. */
export const centreOf = (col, row) => ({lon: wrap(col) - 179.5, lat: 89.5 - row});
export const groundAt = (col, row) => (row < 0 || row >= ROWS ? "i" : W.GROUND[row][wrap(col)]);
export const isSea = g => g === "~";
/** The world region id of a square, or null at sea. */
export function regionAt(col, row) {
  if ( row < 0 || row >= ROWS ) return null;
  const i = W.REGION_CODE.indexOf(W.REGION[row][wrap(col)]);
  return i >= 0 ? W.REGION_IDS[i] : null;
}
export const REGION_IDS = W.REGION_IDS;

/** A port or a coast town falls in a sea square at this size: the land square beside it, when there is one. */
export function landNear({col, row}) {
  if ( !isSea(groundAt(col, row)) ) return {col, row};
  for ( const [dc, dr] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]] ) {
    const r = row + dr;
    if ( r >= 0 && r < ROWS && !isSea(groundAt(col + dc, r)) ) return {col: wrap(col + dc), row: r};
  }
  return {col, row};
}

let riverIndex = null;
/** The great rivers that run through a square. */
export function riversAt(col, row) {
  if ( !riverIndex ) {
    riverIndex = new Map();
    for ( const [name, cells] of Object.entries(W.RIVERS) ) for ( const [c, r] of cells ) {
      const k = r * COLS + c;
      if ( !riverIndex.has(k) ) riverIndex.set(k, []);
      riverIndex.get(k).push(name);
    }
  }
  return riverIndex.get(row * COLS + wrap(col)) ?? [];
}

/** Great-circle distance in km between two spots {lon, lat}. */
export function kmBetween(a, b) {
  const p1 = a.lat * D2R, p2 = b.lat * D2R, dl = (b.lon - a.lon) * D2R;
  const h = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * EARTH * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The nearest named feature of a kind (a GROUND letter) to a spot, within maxKm; null when none is near. */
export function nearestName(spot, kind, maxKm = 900) {
  let best = null, bd = maxKm;
  for ( const [name, k, lon, lat] of W.NAMES ) {
    if ( k !== kind ) continue;
    const d = kmBetween(spot, {lon, lat});
    if ( d < bd ) { bd = d; best = name; }
  }
  return best;
}

/**
 * Where a spot is, for the Storyteller. regionLabel: (id) => words for a region (WoDX Chronicle's world regions), else
 * the id is shown. Returns {col, row, ground, groundWords, region, rivers, name, words}.
 */
export function describe(spot, {regionLabel = null} = {}) {
  const {col, row} = landNear(squareOf(spot.lon, spot.lat));
  const ground = groundAt(col, row), region = regionAt(col, row), rivers = riversAt(col, row);
  const kind = "MPDTpw".includes(ground) ? ground : ground === "~" ? "~" : null;
  const name = kind ? nearestName(centreOf(col, row), kind, kind === "~" ? 2500 : 900) : null;
  const ns = spot.lat >= 0 ? "north" : "south", ew = spot.lon >= 0 ? "east" : "west";
  const parts = [`${cap(GROUND_WORDS[ground])}${name ? ` (${name})` : ""}`];
  if ( region ) parts.push(`in ${regionLabel?.(region) ?? region}`);
  if ( rivers.length ) parts.push(`on the ${rivers.slice(0, 2).join(" and the ")}`);
  parts.push(`${Math.abs(Math.round(spot.lat))} ${ns}, ${Math.abs(Math.round(spot.lon))} ${ew}`);
  return {col, row, ground, groundWords: GROUND_WORDS[ground], region, rivers, name, words: parts.join(", ")};
}
const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);

/* ------------------------------------------------------------------ */
/*  Travel by year                                                     */
/* ------------------------------------------------------------------ */

/** The year the railway reaches a region's settled ground (house reading; never for the ice). */
export const RAIL_FROM = {"british-isles": 1830, "low-countries": 1835, "france": 1840, "german-lands": 1838, "moravia": 1839, "north-america-east": 1835, "italy": 1850,
  "iberia": 1855, "scandinavia": 1860, "poland-baltic": 1850, "carpathians-balkans": 1860, "russia": 1855, "aegean": 1875, "anatolia": 1875, "levant": 1895,
  "egypt": 1856, "india": 1855, "canada": 1855, "north-america-west": 1869, "mexico": 1875, "caribbean": 1840, "andes": 1875, "southern-cone": 1860, "brazil": 1860,
  "australia": 1860, "aotearoa": 1865, "japan": 1872, "china": 1890, "korea": 1900, "southeast-asia": 1890, "nusantara": 1870, "southern-africa": 1865, "maghreb": 1865,
  "persia": 1930, "central-asia": 1888, "siberia": 1900, "west-africa": 1900, "east-africa": 1900, "central-africa": 1900, "arabia": 1908, "tibet-himalaya": 2006};
const NO_RAIL = new Set(["arctic", "antarctica", "pacific-islands"]);
/** Regions where the railways stay few and far between: a journey gets less from them. */
const THIN_RAIL = new Set(["west-africa", "central-africa", "east-africa", "maghreb", "arabia", "persia", "central-asia", "siberia", "tibet-himalaya", "southeast-asia", "nusantara",
  "andes", "brazil", "australia", "levant", "anatolia"]);
/** How hard each ground is to cross on foot or by beast: a share of the open-plain pace. */
export const GROUND_PACE = {p: 1, ".": 0.9, P: 0.75, D: 0.7, T: 0.5, w: 0.5, M: 0.45, i: 0.12, l: 1};

/** The ways of going that a year has: {land: km a day on open ground, landWords, sea, seaWords, air, airWords}. */
export function waysIn(year) {
  const y = Number(year) || 1197;
  const land = y >= 1960 ? [650, "by motor road"] : y >= 1925 ? [350, "by motor road"] : y >= 1650 ? [55, "by coach and post road"] : [40, "on horseback or with a caravan"];
  const sea = y >= 1900 ? [650, "by liner"] : y >= 1840 ? [380, "by steamship"] : y >= 1450 ? [150, "under sail"] : [90, "by coasting ship"];
  const air = y >= 1958 ? [16000, "by jet airliner"] : y >= 1935 ? [3200, "by airliner, in hops"] : null;
  return {year: y, land: land[0], landWords: land[1], sea: sea[0], seaWords: sea[1], air: air?.[0] ?? null, airWords: air?.[1] ?? null, rail: y >= 1830 ? (y >= 1950 ? 900 : 550) : null};
}

/** Sea that is frozen for most of the year: no ship's road in any age (north of 72, south of 62). */
export const packIce = row => 89.5 - row >= 72 || 89.5 - row <= -62;

/**
 * The middle of a region: the land square of it nearest the mean of all its squares. Returns {lon, lat} or null.
 */
export function regionCentre(id) {
  const i = W.REGION_IDS.indexOf(id);
  if ( i < 0 ) return null;
  const ch = W.REGION_CODE[i], cells = [];
  let sx = 0, sy = 0, sz = 0;
  for ( let r = 0; r < ROWS; r++ ) for ( let c = 0; c < COLS; c++ ) if ( W.REGION[r][c] === ch ) {
    cells.push([c, r]);
    const lon = (c - 179.5) * D2R, lat = (89.5 - r) * D2R;
    sx += Math.cos(lat) * Math.cos(lon); sy += Math.cos(lat) * Math.sin(lon); sz += Math.sin(lat);
  }
  if ( !cells.length ) return null;
  const mean = {lon: Math.atan2(sy, sx) * R2D, lat: Math.atan2(sz, Math.hypot(sx, sy)) * R2D};
  let best = cells[0], bd = Infinity;
  for ( const [c, r] of cells ) { const d = kmBetween(mean, centreOf(c, r)); if ( d < bd ) { bd = d; best = [c, r]; } }
  return centreOf(best[0], best[1]);
}

/**
 * The cut canals between the seas, each with the year it opened and the years it lay shut. Before its year (and
 * while shut) the neck of land is land: a traveller lands, crosses and takes ship again, or sails the long way round.
 * at: the squares the canal turns into a ship's road, as [lon, lat].
 */
export const CANALS = [
  {id: "suez", name: "the Suez Canal", from: 1869, shut: [[1967, 1974]], at: [[32.5, 30.5]]},
  {id: "panama", name: "the Panama Canal", from: 1914, shut: [], at: [[-79.5, 8.5]]}
];
/** Narrow straits the one-degree grid closes by accident: a ship's road in every age (Gibraltar, the Dardanelles, the mouth of the Gulf of Suez). */
export const STRAITS = [[-5.5, 35.5], [26.5, 40.5], [33.5, 28.5]];
/** Necks of land the grid opens by accident: land in every age unless a canal crosses them (Panama). */
export const ISTHMUS = [[-79.5, 8.5], [-78.5, 8.5]];
const keyOf = ([lon, lat]) => { const q = squareOf(lon, lat); return q.row * COLS + q.col; };
const STRAIT_KEYS = new Set(STRAITS.map(keyOf)), ISTHMUS_KEYS = new Set(ISTHMUS.map(keyOf));
const CANAL_AT = new Map(CANALS.flatMap(c => c.at.map(a => [keyOf(a), c])));
/** Is a canal open to ships in a year? */
export const canalOpen = (canal, year) => !!canal && Number(year) >= canal.from && !canal.shut.some(([a, b]) => Number(year) >= a && Number(year) <= b);
/** The canal that crosses a square, open or not, or null. */
export const canalAt = (col, row) => CANAL_AT.get(row * COLS + wrap(col)) ?? null;
/** The ground of a square as a traveller of a year meets it: the map's ground, with straits open, necks of land closed and canals cut from their year on. */
export function travelGround(col, row, year) {
  const k = row * COLS + wrap(col), canal = CANAL_AT.get(k);
  if ( canal ) return canalOpen(canal, year) ? "~" : isSea(groundAt(col, row)) ? "." : groundAt(col, row);
  if ( STRAIT_KEYS.has(k) ) return "~";
  if ( ISTHMUS_KEYS.has(k) ) return ".";
  return groundAt(col, row);
}

/** Km a day across one square for a year: {speed, way}. Sea and lakes go by ship. */
export function paceAt(col, row, year, ways = waysIn(year)) {
  const g = travelGround(col, row, ways.year);
  if ( g === "~" || g === "l" ) return {speed: ways.sea * (packIce(row) ? 0.04 : 1), way: "sea"};
  const region = regionAt(col, row);
  const railYear = region && !NO_RAIL.has(region) ? RAIL_FROM[region] ?? 1900 : Infinity;
  if ( ways.rail && ways.year >= railYear && !"iTwD".includes(g) ) return {speed: ways.rail * (g === "M" ? 0.5 : g === "P" ? 0.8 : 1) * (THIN_RAIL.has(region) ? 0.35 : 1), way: "rail"};
  return {speed: ways.land * (GROUND_PACE[g] ?? 0.8) * (ways.year >= 1925 && "iTw".includes(g) ? 0.3 : 1), way: "land"};
}

class Heap {
  constructor() { this.a = []; }
  push(k, v) { const a = this.a; a.push([k, v]); let i = a.length - 1; while ( i > 0 ) { const p = (i - 1) >> 1; if ( a[p][0] <= a[i][0] ) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if ( a.length ) { a[0] = last; let i = 0; for ( ;; ) { const l = 2 * i + 1, r = l + 1; let m = i; if ( l < a.length && a[l][0] < a[m][0] ) m = l; if ( r < a.length && a[r][0] < a[m][0] ) m = r; if ( m === i ) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } }
    return top;
  }
  get size() { return this.a.length; }
}

/** A day lost each time a journey takes ship or lands. */
export const PORT_DAYS = 1;

/**
 * The journey between two spots in a year. from, to: {lon, lat}. Returns {km (great circle), surface: {days, km,
 * legs: [{way, km, days}], path: [[col, row]...], canals: [{id, name, from}]}, air: {days, km, words} | null, best: "surface" | "air", year}.
 * The surface way is the quickest over the squares; air (from 1935) flies the great circle with a day at each end.
 */
export function journey(from, to, {year = 1197} = {}) {
  const ways = waysIn(year);
  const a = landNear(squareOf(from.lon, from.lat)), b = landNear(squareOf(to.lon, to.lat));
  const start = a.row * COLS + a.col, goal = b.row * COLS + b.col;
  const dist = new Float64Array(COLS * ROWS).fill(Infinity), prev = new Int32Array(COLS * ROWS).fill(-1);
  const heap = new Heap();
  dist[start] = 0; heap.push(0, start);
  const pace = new Map();
  const paceOf = k => { let p = pace.get(k); if ( !p ) { p = paceAt(k % COLS, Math.floor(k / COLS), year, ways); pace.set(k, p); } return p; };
  while ( heap.size ) {
    const [d, k] = heap.pop();
    if ( d > dist[k] ) continue;
    if ( k === goal ) break;
    const col = k % COLS, row = Math.floor(k / COLS), here = paceOf(k), lat = 89.5 - row;
    for ( let dr = -1; dr <= 1; dr++ ) for ( let dc = -1; dc <= 1; dc++ ) {
      if ( !dr && !dc ) continue;
      const r2 = row + dr;
      if ( r2 < 0 || r2 >= ROWS ) continue;
      const c2 = wrap(col + dc), k2 = r2 * COLS + c2, there = paceOf(k2);
      const km = Math.hypot(dr * 111.2, dc * 111.2 * Math.cos((lat - dr / 2) * D2R));
      const step = km / 2 / here.speed + km / 2 / there.speed + ((here.way === "sea") !== (there.way === "sea") ? PORT_DAYS : 0);
      if ( d + step < dist[k2] ) { dist[k2] = d + step; prev[k2] = k; heap.push(d + step, k2); }
    }
  }
  const path = [];
  for ( let k = goal; k >= 0; k = prev[k] ) { path.push([k % COLS, Math.floor(k / COLS)]); if ( k === start ) break; }
  path.reverse();
  const legs = [];
  let total = 0;
  for ( let i = 1; i < path.length; i++ ) {
    const [c1, r1] = path[i - 1], [c2, r2] = path[i];
    const km = kmBetween(centreOf(c1, r1), centreOf(c2, r2)), way = paceOf(r2 * COLS + c2).way;
    const days = dist[r2 * COLS + c2] - dist[r1 * COLS + c1];
    total += km;
    const last = legs[legs.length - 1];
    if ( last && last.way === way ) { last.km += km; last.days += days; } else legs.push({way, km, days});
  }
  for ( const l of legs ) { l.km = Math.round(l.km); l.days = Math.round(l.days * 10) / 10; }
  const km = kmBetween(from, to);
  const canals = [...new Set(path.map(([c, r]) => canalAt(c, r)).filter(c => canalOpen(c, ways.year)))].map(c => ({id: c.id, name: c.name, from: c.from}));
  const surface = {days: Math.max(start === goal ? 0.5 : 1, Math.round(dist[goal] * 10) / 10), km: Math.round(total), legs, path, canals};
  const air = ways.air && km > 400 ? {days: Math.round((2 + km / ways.air) * 10) / 10, km: Math.round(km), words: ways.airWords} : null;
  return {km: Math.round(km), year: ways.year, surface, air, best: air && air.days < surface.days ? "air" : "surface"};
}

const WAY_WORDS = (way, ways) => (way === "sea" ? ways.seaWords : way === "rail" ? "by rail" : ways.landWords);
/** A journey in plain lines for the Storyteller. */
export function journeyLines(j) {
  const ways = waysIn(j.year), n = d => (d === 1 ? "1 day" : `${d} days`);
  const out = [`${j.km} km as the crow flies. In ${j.year}: about ${n(j.surface.days)} by land and sea${j.air ? `, or about ${n(j.air.days)} ${j.air.words}` : ""}.`];
  for ( const l of j.surface.legs ) if ( l.km >= 50 ) out.push(`${l.km} km ${WAY_WORDS(l.way, ways)}, ${n(l.days)}`);
  for ( const c of j.surface.canals ?? [] ) out.push(`Through ${c.name}, open since ${c.from}`);
  return out;
}

/* ------------------------------------------------------------------ */
/*  The closer view of one square                                      */
/* ------------------------------------------------------------------ */

/** A small steady random number from whole numbers: the same in, the same out. */
export function hash(a, b, seed = 1197) {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(seed | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const smooth = t => t * t * (3 - 2 * t);
function valueNoise(x, y, seed) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = smooth(x - x0), fy = smooth(y - y0);
  const v = (i, j) => hash(x0 + i, y0 + j, seed);
  return (v(0, 0) * (1 - fx) + v(1, 0) * fx) * (1 - fy) + (v(0, 1) * (1 - fx) + v(1, 1) * fx) * fy;
}

/** Squares to a side in the closer view: about 5 km each at the equator. */
export const ZOOM = 22;
const HIGH = {M: 1, P: 0.7, ".": 0.4, T: 0.35, D: 0.35, p: 0.2, w: 0.1, l: 0, i: 0.5, "~": 0};

/**
 * The closer view of one square: ZOOM by ZOOM small squares, north at the top. Each is one of the country map's
 * lands (plain, vale, hills, upland, mountain), or sea, lake, ice, desert, tundra, marsh; `river` marks a great
 * river's course. It is made from the square and its eight neighbours plus steady noise, so coasts and ranges run
 * on across squares and the same square is the same every time. Returns {col, row, size, km (a small square's
 * side), ground, region, cells: [rows of {land, river}], rivers}.
 */
export function closer(col, row, {seed = 1197} = {}) {
  const n = ZOOM, cells = [];
  const g = (dc, dr) => groundAt(col + dc, Math.min(ROWS - 1, Math.max(0, row + dr)));
  const landness = (dc, dr) => (isSea(g(dc, dr)) ? 0 : 1);
  const blend = (f, u, v) => {            // u, v in 0..1 across this square; weights reach half a square into the neighbours
    const x = u - 0.5, y = v - 0.5, dc = x < 0 ? -1 : 1, dr = y < 0 ? -1 : 1, ax = Math.abs(x), ay = Math.abs(y);
    return f(0, 0) * (1 - ax) * (1 - ay) + f(dc, 0) * ax * (1 - ay) + f(0, dr) * (1 - ax) * ay + f(dc, dr) * ax * ay;
  };
  const here = g(0, 0), names = riversAt(col, row);
  // a river crosses from the neighbour square that carries it to the one opposite, wandering a little
  let line = null;
  if ( names.length && !isSea(here) ) {
    const sides = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]].filter(([dc, dr]) => riversAt(col + dc, row + dr).some(x => names.includes(x)) || isSea(g(dc, dr)));
    const a = sides[0] ?? [-1, 0], b = sides.find(s => s[0] !== a[0] || s[1] !== a[1]) ?? [-a[0], -a[1]];
    line = [[(a[0] + 1) / 2, (a[1] + 1) / 2], [0.5 + (hash(col, row, seed + 5) - 0.5) * 0.4, 0.5 + (hash(row, col, seed + 6) - 0.5) * 0.4], [(b[0] + 1) / 2, (b[1] + 1) / 2]];
  }
  const nearLine = (u, v) => {
    if ( !line ) return false;
    for ( let s = 0; s < 2; s++ ) {
      const [x1, y1] = line[s], [x2, y2] = line[s + 1], dx = x2 - x1, dy = y2 - y1;
      const t = Math.max(0, Math.min(1, ((u - x1) * dx + (v - y1) * dy) / (dx * dx + dy * dy || 1)));
      if ( Math.hypot(u - x1 - t * dx, v - y1 - t * dy) < 0.6 / n ) return true;
    }
    return false;
  };
  for ( let j = 0; j < n; j++ ) {
    const line2 = [];
    for ( let i = 0; i < n; i++ ) {
      const u = (i + 0.5) / n, v = (j + 0.5) / n;
      const gx = col * n + i, gy = row * n + j;
      const rough = valueNoise(gx / 5, gy / 5, seed) * 0.6 + valueNoise(gx / 2, gy / 2, seed + 1) * 0.4;
      const coast = blend(landness, u, v) + (rough - 0.5) * 0.5;
      let land;
      if ( coast < 0.5 ) land = "sea";
      else if ( here === "l" && rough < 0.62 ) land = "lake";
      else {
        const high = blend((dc, dr) => HIGH[g(dc, dr)] ?? 0.4, u, v) + (rough - 0.5) * 0.7;
        const base = isSea(here) || here === "l" ? "." : here;
        land = base === "i" ? "ice" : base === "D" && high < 0.75 ? "desert" : base === "T" && high < 0.7 ? "tundra" : base === "w" && high < 0.45 ? "marsh"
          : high > 0.85 ? "mountain" : high > 0.6 ? "upland" : high > 0.38 ? "hills" : "plain";
      }
      const river = land !== "sea" && land !== "lake" && nearLine(u, v);
      line2.push({land: river && (land === "plain" || land === "hills") ? "vale" : land, river});
    }
    cells.push(line2);
  }
  const mid = centreOf(col, row);
  return {col: wrap(col), row, size: n, km: Math.round((111.2 * Math.cos(mid.lat * D2R) / n) * 10) / 10, kmNorth: Math.round((111.2 / n) * 10) / 10, ground: here, region: regionAt(col, row), cells, rivers: names};
}

/* ------------------------------------------------------------------ */
/*  The picture                                                        */
/* ------------------------------------------------------------------ */

/** The map by night, as every WoDX top-down map is drawn. */
export const NIGHT = {"~": "#0b1626", l: "#12243a", i: "#7d8a99", M: "#4a4658", P: "#4f4a3e", D: "#5d4f33", T: "#3e4a4c", p: "#27402f", w: "#1f3a3a", ".": "#1f3327",
  river: "#2c4d73", ink: "#d8d2c0", line: "#c9a86a", frame: "#05080f"};

/**
 * The whole map as an SVG string. opts: cell (px a square), palette (a GROUND letter to colour, plus river, ink,
 * line, frame), tint: (col, row, ground) => colour or null to override a square, marks: [{lon, lat, label}],
 * path: [[col, row]...] (a journey), title, legend: [[colour, words]...], rivers (default true).
 */
export function svg({cell = 4, palette = NIGHT, tint = null, marks = [], path = null, title = "", legend = [], rivers = true} = {}) {
  const w = COLS * cell, top = title ? 28 : 0, foot = legend.length ? 26 : 0, h = ROWS * cell + top + foot;
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="Georgia, serif">`,
    `<rect width="${w}" height="${h}" fill="${palette.frame ?? "#000"}"/>`, `<rect y="${top}" width="${w}" height="${ROWS * cell}" fill="${palette["~"]}"/>`];
  for ( let r = 0; r < ROWS; r++ ) {
    let c = 0;
    while ( c < COLS ) {
      const g = W.GROUND[r][c], col = tint?.(c, r, g) ?? (g === "~" ? null : palette[g]);
      let e = c + 1;
      while ( e < COLS && (tint ? (tint(e, r, W.GROUND[r][e]) ?? (W.GROUND[r][e] === "~" ? null : palette[W.GROUND[r][e]])) === col : W.GROUND[r][e] === g) ) e++;
      if ( col ) out.push(`<rect x="${c * cell}" y="${top + r * cell}" width="${(e - c) * cell}" height="${cell}" fill="${col}"/>`);
      c = e;
    }
  }
  if ( rivers && palette.river ) for ( const cells of Object.values(W.RIVERS) )
    for ( const [c, r] of cells ) if ( W.GROUND[r][c] !== "~" ) out.push(`<rect x="${c * cell + cell * 0.25}" y="${top + r * cell + cell * 0.25}" width="${cell * 0.5}" height="${cell * 0.5}" fill="${palette.river}"/>`);
  if ( path?.length > 1 ) {
    let d = "", last = null;
    for ( const [c, r] of path ) { const x = (c + 0.5) * cell, y = top + (r + 0.5) * cell; d += `${last !== null && Math.abs(c - last) < COLS / 2 ? "L" : "M"}${x} ${y}`; last = c; }
    out.push(`<path d="${d}" fill="none" stroke="${palette.line}" stroke-width="${Math.max(1.5, cell * 0.45)}" stroke-linejoin="round" stroke-dasharray="${cell} ${cell * 0.6}"/>`);
  }
  for ( const m of marks ) {
    const {col, row} = squareOf(m.lon, m.lat), x = (col + 0.5) * cell, y = top + (row + 0.5) * cell;
    out.push(`<circle cx="${x}" cy="${y}" r="${Math.max(2.5, cell * 0.8)}" fill="${palette.line}" stroke="${palette.frame ?? "#000"}" stroke-width="1"/>`);
    if ( m.label ) out.push(`<text x="${x + cell * 1.4}" y="${y + 4}" font-size="${Math.max(10, cell * 2.6)}" fill="${palette.ink}" stroke="${palette.frame ?? "#000"}" stroke-width="2.5" paint-order="stroke">${escXml(m.label)}</text>`);
  }
  if ( title ) out.push(`<text x="10" y="20" font-size="17" fill="${palette.ink}">${escXml(title)}</text>`);
  let lx = 10;
  for ( const [colour, words] of legend ) {
    out.push(`<rect x="${lx}" y="${top + ROWS * cell + 8}" width="12" height="12" fill="${colour}" stroke="${palette.ink}" stroke-width="0.5"/>`,
      `<text x="${lx + 17}" y="${top + ROWS * cell + 19}" font-size="12" fill="${palette.ink}">${escXml(words)}</text>`);
    lx += 30 + words.length * 6.6;
  }
  out.push("</svg>");
  return out.join("");
}
const escXml = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"})[c]);

/** The legend for the plain night map. */
export const EARTH_LEGEND = [[NIGHT["."], "land"], [NIGHT.p, "plain"], [NIGHT.M, "mountains"], [NIGHT.P, "plateau"], [NIGHT.D, "desert"], [NIGHT.T, "tundra"], [NIGHT.w, "wetland"], [NIGHT.i, "ice"], [NIGHT.river, "great river"]];

/** A picture of one square's closer view. */
export function closerSvg(view, {cell = 22} = {}) {
  const C = {sea: NIGHT["~"], lake: NIGHT.l, ice: NIGHT.i, desert: NIGHT.D, tundra: NIGHT.T, marsh: NIGHT.w, plain: NIGHT.p, vale: "#2c4a3a", hills: NIGHT["."], upland: "#3a3f3a", mountain: NIGHT.M};
  const n = view.size, out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n * cell} ${n * cell}" width="${n * cell}" height="${n * cell}">`];
  view.cells.forEach((line, j) => line.forEach((c, i) => {
    out.push(`<rect x="${i * cell}" y="${j * cell}" width="${cell}" height="${cell}" fill="${C[c.land]}" stroke="#0008" stroke-width="0.5"/>`);
    if ( c.river ) out.push(`<rect x="${i * cell + cell * 0.3}" y="${j * cell + cell * 0.3}" width="${cell * 0.4}" height="${cell * 0.4}" fill="${NIGHT.river}"/>`);
  }));
  out.push("</svg>");
  return out.join("");
}
