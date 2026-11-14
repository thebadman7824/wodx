/**
 * WoDX Storyteller 0.46.0: the country map behind a trip. Pure rules, no Foundry, so the harness can test them.
 *
 * The country (data/country.mjs) is laid on a grid of 5 km squares: each square has its kind of ground, whether a
 * river runs through it, and the best road in it in a given year. A trip between two places that sit on the map finds
 * the cheapest way across the squares for those who walk, ride or drive, and the cheapest ride for those who pay
 * their way: a hired cart or coach, a river boat, a train, a bus, a flight, each running only between its own stops
 * in the years it runs. The trip comes back as legs, split at the towns it passes, so it can stop part-way, and a
 * schedule lays the legs over the nights and days: rest for the living, shelter by day for those the sun burns.
 *
 * Every figure here is a house figure (B2330 to B2339). The books give no travel speeds, fares or day's marches.
 */
import * as Road from "./road-rules.mjs";
import * as D from "../data/country.mjs";

const {west, east, south, north, cell: CELL} = D.BOUNDS;
const KY = 111.2, KX = 111.2 * Math.cos(((south + north) / 2) * Math.PI / 180);
export const COLS = Math.ceil(((east - west) * KX) / CELL);
export const ROWS = Math.ceil(((north - south) * KY) / CELL);
export const LANDS = ["plain", "vale", "hills", "upland", "mountain"];
export const LAND_WORDS = {plain: "open plain", vale: "river meadows", hills: "rolling hills", upland: "wooded uplands", mountain: "mountains"};
const ROAD_CODES = [null, "road", "highway", "motorway"];
export const DIRS = {N: [0, 1], NE: [0.707, 0.707], E: [1, 0], SE: [0.707, -0.707], S: [0, -1], SW: [-0.707, -0.707], W: [-1, 0], NW: [-0.707, 0.707]};

const xy = (lon, lat) => ({x: (lon - west) * KX, y: (north - lat) * KY});
const idxOf = (c, r) => (r * COLS) + c;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function cellAt(lon, lat) {
  const p = xy(lon, lat);
  return {c: clamp(Math.floor(p.x / CELL), 0, COLS - 1), r: clamp(Math.floor(p.y / CELL), 0, ROWS - 1)};
}
const kmBetween = (a, b) => { const p = xy(a[0], a[1]), q = xy(b[0], b[1]); return Math.hypot(p.x - q.x, p.y - q.y); };
/** A steady number in [0, 1) from two whole numbers and a seed. */
export function hash(a, b, seed = 1197) {
  let h = (Math.imul(a + 374761393, 668265263) ^ Math.imul(b + 1274126177, 2246822519) ^ Math.imul(seed, 3266489917)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489917) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/* ------------------------------------------------------------------ */
/*  The grid                                                           */
/* ------------------------------------------------------------------ */

let GRID = null;
/** Every square between two points, in order. */
function line(a, b) {
  const p = cellAt(a[0], a[1]), q = cellAt(b[0], b[1]);
  const n = Math.max(Math.abs(q.c - p.c), Math.abs(q.r - p.r)), out = [];
  for ( let i = 0; i <= n; i++ ) {
    const t = n ? i / n : 0;
    const i2 = idxOf(Math.round(p.c + ((q.c - p.c) * t)), Math.round(p.r + ((q.r - p.r) * t)));
    if ( out[out.length - 1] !== i2 ) out.push(i2);
  }
  return out;
}

/** The grid: land (an index into LANDS), landName, river (0 none, 1 small, 2 big), riverName, town (an id). */
export function grid() {
  if ( GRID ) return GRID;
  const n = COLS * ROWS;
  const land = new Uint8Array(n).fill(2), landName = new Array(n).fill(null), river = new Uint8Array(n), riverName = new Array(n).fill(null), town = new Array(n).fill(null);
  for ( let r = 0; r < ROWS; r++ ) for ( let c = 0; c < COLS; c++ ) {
    const x = (c + 0.5) * CELL, y = (r + 0.5) * CELL, i = idxOf(c, r), wob = 1 + ((hash(c, r, 7) - 0.5) * 0.3);
    for ( const [name, kind, lon, lat, len, wid, turn] of D.LAND ) {
      const o = xy(lon, lat), a = turn * Math.PI / 180, ux = Math.cos(a), uy = -Math.sin(a);
      const dx = x - o.x, dy = y - o.y, along = (dx * ux) + (dy * uy), across = (-dx * uy) + (dy * ux);
      if ( ((along / len) ** 2) + ((across / wid) ** 2) < wob ) { land[i] = LANDS.indexOf(kind); landName[i] = name; }
    }
  }
  for ( const [name, big, pts] of D.RIVERS ) for ( let k = 1; k < pts.length; k++ ) for ( const i of line(pts[k - 1], pts[k]) ) {
    if ( river[i] < (big ? 2 : 1) ) { river[i] = big ? 2 : 1; riverName[i] = name; }
  }
  for ( let i = 0; i < n; i++ ) if ( land[i] === 0 && river[i] === 2 ) land[i] = 1;
  for ( const [id, [, lon, lat]] of Object.entries(D.TOWNS) ) { const p = cellAt(lon, lat), i = idxOf(p.c, p.r); if ( !town[i] ) town[i] = id; }
  GRID = {cols: COLS, rows: ROWS, cell: CELL, land, landName, river, riverName, town};
  return GRID;
}

export const townName = id => D.TOWNS[id]?.[0] ?? null;
export const townStands = (id, year) => !!D.TOWNS[id] && (Number(year) || 0) >= D.TOWNS[id][3];
/** The towns, for a list: [{id, name}], by name. */
export const towns = () => Object.entries(D.TOWNS).map(([id, t]) => ({id, name: t[0]})).sort((a, b) => a.name.localeCompare(b.name));

const ROADS_BY_KEY = new Map();
/** The best road in each square in a year: 0 none, 1 road, 2 highway, 3 motorway. */
export function roadsIn(year) {
  const y = Number(year) || 0, open = D.MOTORWAYS.filter(m => y >= m[2]);
  if ( ROADS_BY_KEY.has(open.length) ) return ROADS_BY_KEY.get(open.length);
  const layer = new Uint8Array(COLS * ROWS);
  const lay = (a, b, code) => { for ( const i of line(D.TOWNS[a].slice(1, 3), D.TOWNS[b].slice(1, 3)) ) if ( layer[i] < code ) layer[i] = code; };
  for ( const [a, b, kind] of D.WAYS ) lay(a, b, kind === "highway" ? 2 : 1);
  for ( const [a, b] of open ) lay(a, b, 3);
  ROADS_BY_KEY.set(open.length, layer);
  return layer;
}

/* ------------------------------------------------------------------ */
/*  Where a place sits                                                 */
/* ------------------------------------------------------------------ */

/** A place's spot on the map, cleaned: {town, km, dir} (so many km in a direction from a town) or null. */
export function normAt(at) {
  if ( !at || !D.TOWNS[at.town] ) return null;
  const km = Math.round((Number(at.km) || 0) * 10) / 10;
  return {town: at.town, km: clamp(km, 0, 300), dir: DIRS[at.dir] ? at.dir : "N"};
}
/** "12 NE" or "12 km north-east" to {km, dir}; blank is the town itself. */
export function parseOffset(text) {
  const s = String(text ?? "").trim().toUpperCase();
  if ( !s ) return {km: 0, dir: "N"};
  const m = s.match(/^(\d+(?:[.,]\d+)?)\s*(?:KM)?\s*(NORTH|SOUTH|EAST|WEST|N|S|E|W)?[\s-]*(EAST|WEST|E|W)?$/);
  if ( !m ) return null;
  const a = (m[2] ?? "N")[0], b = m[3] ? m[3][0] : "";
  const dir = DIRS[a + b] ? a + b : (DIRS[a] ? a : "N");
  return {km: Number(m[1].replace(",", ".")), dir};
}
export const offsetWords = at => (at?.km ? `${at.km} ${at.dir}` : "");
/** A spot's place on the grid: {lon, lat, c, r, i} or null. */
export function locate(at) {
  const a = normAt(at);
  if ( !a ) return null;
  const [, lon0, lat0] = D.TOWNS[a.town], d = DIRS[a.dir];
  const lon = clamp(lon0 + ((a.km * d[0]) / KX), west, east - 0.001), lat = clamp(lat0 + ((a.km * d[1]) / KY), south + 0.001, north);
  const p = cellAt(lon, lat);
  return {lon, lat, c: p.c, r: p.r, i: idxOf(p.c, p.r)};
}

/** The ground at a spot, for a map drawn there: its kind and name, the nearest river and town, and how wooded it is. */
export function landAt(at, year = 1197) {
  const p = locate(at);
  if ( !p ) return null;
  const g = grid(), y = Number(year) || 0;
  let riv = null;
  for ( let rad = 0; rad <= 4 && !riv; rad++ ) for ( let dr = -rad; dr <= rad && !riv; dr++ ) for ( let dc = -rad; dc <= rad; dc++ ) {
    if ( Math.max(Math.abs(dr), Math.abs(dc)) !== rad ) continue;
    const c = p.c + dc, r = p.r + dr;
    if ( c < 0 || r < 0 || c >= COLS || r >= ROWS || !g.river[idxOf(c, r)] ) continue;
    const i = idxOf(c, r);
    riv = {name: g.riverName[i], big: g.river[i] === 2, km: Math.round(Math.hypot(dc, dr) * CELL), side: dirOf(dc, -dr)};
    break;
  }
  const kind = LANDS[g.land[p.i]];
  const base = {plain: 0.1, vale: 0.15, hills: 0.35, upland: 0.6, mountain: 0.75}[kind];
  const woods = Math.round(clamp(base * (y < 1250 ? 1.3 : y < 1800 ? 1 : 0.9), 0, 0.9) * 100) / 100;
  const a = normAt(at);
  return {land: kind, landName: g.landName[p.i], words: LAND_WORDS[kind], river: riv, woods, town: {id: a.town, name: townName(a.town), km: a.km, dir: a.dir},
    road: ROAD_CODES[roadsIn(y)[p.i]]};
}
function dirOf(dx, dy) {
  if ( !dx && !dy ) return "here";
  const a = Math.atan2(dy, dx) * 180 / Math.PI, names = ["E", "NE", "N", "NW", "W", "SW", "S", "SE"];
  return names[((Math.round(a / 45) % 8) + 8) % 8];
}

/* ------------------------------------------------------------------ */
/*  Going by one's own means                                           */
/* ------------------------------------------------------------------ */

export const OWN = ["foot", "horse", "coach", "car"];
/** The ways of one's own open in a year: [{id, label}], fastest first on a country road. */
export function ownModes(year) {
  const y = Number(year) || 0;
  return OWN.filter(id => y >= Road.MODES[id].from && y <= Road.MODES[id].to)
    .map(id => ({id, label: Road.MODES[id].label, speed: Road.MODES[id].speed("road", y)}))
    .sort((a, b) => b.speed - a.speed);
}
const ON_ROAD_SLOW = [1, 1, 1.1, 1.25, 1.5], MOTORWAY_SLOW = [1, 1, 1, 1.1, 1.2], OFF_ROAD_SLOW = [1, 1.3, 1.3, 1.7, 2.6];
/** Minutes to cross into a square, and what was underfoot. Infinity when this way cannot go there. */
function step(g, roads, i, j, diag, mode, year) {
  const ri = roads[i], rj = roads[j], on = ri && rj, code = on ? Math.min(ri, rj) : 0;
  let kind = on ? ROAD_CODES[code] : "path";
  const m = Road.MODES[mode];
  let speed = m.speed(kind, year);
  if ( !speed && kind === "motorway" ) { kind = "highway"; speed = m.speed(kind, year); }
  if ( !speed ) return {min: Infinity, kind};
  const land = g.land[j];
  if ( !on && land === 4 && (mode === "coach" || mode === "car") ) return {min: Infinity, kind};
  let slow = on ? (kind === "motorway" ? MOTORWAY_SLOW : ON_ROAD_SLOW)[land] : OFF_ROAD_SLOW[land];
  if ( !on && land === 1 && year >= 1850 ) slow = 1.1;
  if ( !on && land === 3 && (mode === "coach" || mode === "car") ) slow *= 1.5;
  const km = CELL * (diag ? 1.414 : 1) * (on ? 1.15 : 1.3);
  let min = (km / speed) * 60 * slow;
  if ( !on && g.river[j] === 2 ) min += year < 1850 ? 40 : 15;
  else if ( !on && g.river[j] === 1 && year < 1850 ) min += 5;
  return {min, kind, km};
}

const FIELDS = new Map();
/** The cheapest minutes from one square to every other for a way of going: {dist, prev}. Kept for a while. */
export function field(start, mode, year) {
  const y = Number(year) || 0, key = `${start}:${mode}:${y}`;
  if ( FIELDS.has(key) ) return FIELDS.get(key);
  const g = grid(), roads = roadsIn(y), n = COLS * ROWS;
  const dist = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), done = new Uint8Array(n);
  const heap = [[0, start]];
  dist[start] = 0;
  const push = e => { heap.push(e); let k = heap.length - 1; while ( k > 0 ) { const p = (k - 1) >> 1; if ( heap[p][0] <= heap[k][0] ) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => {
    const top = heap[0], last = heap.pop();
    if ( heap.length ) { heap[0] = last; let k = 0; for ( ;; ) { const l = (2 * k) + 1, r = l + 1; let s = k; if ( l < heap.length && heap[l][0] < heap[s][0] ) s = l; if ( r < heap.length && heap[r][0] < heap[s][0] ) s = r; if ( s === k ) break; [heap[s], heap[k]] = [heap[k], heap[s]]; k = s; } }
    return top;
  };
  while ( heap.length ) {
    const [d, i] = pop();
    if ( done[i] ) continue;
    done[i] = 1;
    const c = i % COLS, r = (i - c) / COLS;
    for ( let dr = -1; dr <= 1; dr++ ) for ( let dc = -1; dc <= 1; dc++ ) {
      if ( !dr && !dc ) continue;
      const c2 = c + dc, r2 = r + dr;
      if ( c2 < 0 || r2 < 0 || c2 >= COLS || r2 >= ROWS ) continue;
      const j = idxOf(c2, r2);
      if ( done[j] ) continue;
      const s = step(g, roads, i, j, dr && dc, mode, y);
      if ( d + s.min < dist[j] ) { dist[j] = d + s.min; prev[j] = i; push([dist[j], j]); }
    }
  }
  if ( FIELDS.size > 40 ) FIELDS.clear();
  const out = {dist, prev};
  FIELDS.set(key, out);
  return out;
}

const spotName = (g, i, year, fallback) => (g.town[i] && townStands(g.town[i], year) ? townName(g.town[i]) : fallback);
/** One's own way from a square to another, as legs split at the towns passed and where the road ends or begins. */
export function ownLegs(a, b, mode, year, {fromName = "the start", toName = "the end"} = {}) {
  const y = Number(year) || 0, g = grid(), roads = roadsIn(y), f = field(a, mode, y);
  if ( !Number.isFinite(f.dist[b]) ) return null;
  const path = [];
  for ( let i = b; i !== -1; i = f.prev[i] ) path.push(i);
  path.reverse();
  const legs = [];
  let cur = null;
  const top = o => Object.entries(o).sort((p, q) => q[1] - p[1])[0]?.[0];
  const close = (endIdx, last) => {
    if ( !cur ) return;
    const kind = top(cur.kinds) ?? "path";
    legs.push({from: cur.from, to: last ? toName : spotName(g, endIdx, y, kind === "path" ? "the road" : "where the road ends"), km: Math.round(cur.km * 10) / 10, minutes: cur.min,
      road: kind, land: top(cur.lands) ?? "hills", mode, hired: false, shelter: last || !!(g.town[endIdx] && townStands(g.town[endIdx], y)), cells: cur.cells});
    cur = null;
  };
  for ( let k = 1; k < path.length; k++ ) {
    const i = path[k - 1], j = path[k], c1 = i % COLS, c2 = j % COLS, diag = c1 !== c2 && Math.floor(i / COLS) !== Math.floor(j / COLS);
    const s = step(g, roads, i, j, diag, mode, y), on = s.kind !== "path";
    if ( cur && cur.on !== on && cur.cells.length >= 3 ) close(i, false);
    if ( !cur ) cur = {from: legs.length ? legs[legs.length - 1].to : fromName, km: 0, min: 0, on, kinds: {}, lands: {}, cells: []};
    cur.on = on; cur.km += s.km; cur.min += s.min; cur.cells.push(j);
    cur.kinds[s.kind] = (cur.kinds[s.kind] ?? 0) + s.min;
    const ln = LANDS[g.land[j]]; cur.lands[ln] = (cur.lands[ln] ?? 0) + s.min;
    if ( k < path.length - 1 && g.town[j] && townStands(g.town[j], y) ) close(j, false);
  }
  close(b, true);
  return legs;
}

/* ------------------------------------------------------------------ */
/*  Paying one's way                                                   */
/* ------------------------------------------------------------------ */

const airSpeed = y => (y < 1950 ? 200 : y < 1970 ? 450 : 750);
/** Hired ways: when they run, the stops they join in a year, their speed, the wait at the stop, and the fare a km as a share of a month's plain wage. */
export const HIRED = {
  "hire:coach": {label: "By hired cart or coach", stop: "the coach stand", from: 0, to: 1945, wait: 30, bend: 1.2,
    edges: () => D.WAYS.map(([a, b, kind]) => [a, b, kind]), speed: (kind, y) => Road.MODES.coach.speed(kind, y), fare: () => 1 / 500, road: "highway"},
  "hire:boat": {label: "By river boat", stop: "the landing", from: 0, to: 9999, wait: 60, bend: 1.3,
    edges: () => D.WATERWAYS.map(([a, b]) => [a, b, "water"]), speed: (kind, y) => Road.MODES.boat.speed("water", y), fare: () => 1 / 1500, road: "water"},
  "hire:train": {label: "By train", stop: "the station", from: 1839, to: 9999, wait: 30, bend: 1.15,
    edges: y => D.RAILS.filter(e => y >= e[2]).map(([a, b]) => [a, b, "rail"]), speed: (kind, y) => Road.MODES.train.speed("rail", y), fare: y => (y < 1900 ? 1 / 1500 : 1 / 3000), road: "rail"},
  "hire:bus": {label: "By coach or bus", stop: "the bus station", from: 1925, to: 9999, wait: 20, bend: 1.2,
    edges: y => [...D.WAYS.map(([a, b, kind]) => [a, b, kind]), ...D.MOTORWAYS.filter(e => y >= e[2]).map(([a, b]) => [a, b, "motorway"])],
    speed: (kind, y) => (Road.MODES.car.speed(kind, y) ?? 0) * 0.75, fare: () => 1 / 3000, road: "highway"},
  "hire:air": {label: "By air", stop: "the airfield", from: 1920, to: 9999, wait: 60, bend: 1,
    edges: y => { const open = Object.keys(D.AIRFIELDS).filter(t => y >= D.AIRFIELDS[t]), out = []; for ( let i = 0; i < open.length; i++ ) for ( let j = i + 1; j < open.length; j++ ) out.push([open[i], open[j], "air"]); return out; },
    speed: (kind, y) => airSpeed(y), fare: y => (y < 1950 ? 1 / 150 : y < 1980 ? 1 / 600 : 1 / 2500), road: "rail", waitAt: y => (y < 1970 ? 60 : 120)},
  "hire:pod": {label: "By transit pod", stop: "the pod station", from: 2040, to: 9999, future: true, wait: 10, bend: 1.15,
    edges: () => D.RAILS.map(([a, b]) => [a, b, "rail"]), speed: () => 300, fare: () => 1 / 2000, road: "rail"}
};
/** Older names for a way, as trips were asked for before the map. */
const WANT = {train: "hire:train", boat: "hire:boat", transit: "hire:pod"};

export function hiredModes(year, {future = false} = {}) {
  const y = Number(year) || 0;
  return Object.entries(HIRED).filter(([, h]) => y >= h.from && y <= h.to && (!h.future || future)).map(([id, h]) => ({id, label: h.label}));
}
/** The fare for a ride: a whole number in the units the wage is given in, at least 1. */
export function fareOf(mode, km, year, wage) {
  const h = HIRED[mode];
  if ( !h || !(km > 0) ) return 0;
  return Math.max(1, Math.round((Number(wage) || 0) * km * h.fare(Number(year) || 0)));
}

/** The cheapest ride by one hired way between two squares: legs to the stop, the ride, and on from the last stop. */
function hiredLegs(a, b, mode, year, names) {
  const y = Number(year) || 0, h = HIRED[mode];
  const edges = h.edges(y).filter(([s, t]) => townStands(s, y) && townStands(t, y));
  if ( !edges.length ) return null;
  const adj = {};
  for ( const [s, t, kind] of edges ) {
    const sp = h.speed(kind, y);
    if ( !(sp > 0) ) continue;
    const km = kmBetween(D.TOWNS[s].slice(1, 3), D.TOWNS[t].slice(1, 3)) * h.bend, min = (km / sp) * 60;
    (adj[s] ??= []).push({to: t, km, min, kind}); (adj[t] ??= []).push({to: s, km, min, kind});
  }
  const last = y >= 1920 ? "car" : "foot";
  const fa = field(a, last, y), fb = field(b, last, y);
  const cellOfTown = t => { const p = cellAt(D.TOWNS[t][1], D.TOWNS[t][2]); return idxOf(p.c, p.r); };
  const wait = h.waitAt ? h.waitAt(y) : h.wait;
  const dist = {}, from = {}, first = {};
  const open = Object.keys(adj);
  for ( const t of open ) { const d = fa.dist[cellOfTown(t)]; dist[t] = Number.isFinite(d) ? d + wait : Infinity; first[t] = t; from[t] = null; }
  const seen = new Set();
  for ( ;; ) {
    let u = null;
    for ( const t of open ) if ( !seen.has(t) && (u === null || dist[t] < dist[u]) ) u = t;
    if ( u === null || !Number.isFinite(dist[u]) ) break;
    seen.add(u);
    for ( const e of adj[u] ) if ( dist[u] + e.min < dist[e.to] ) { dist[e.to] = dist[u] + e.min; from[e.to] = u; first[e.to] = first[u]; }
  }
  let best = null, bestMin = Infinity;
  for ( const t of open ) {
    if ( first[t] === t ) continue;
    const tail = fb.dist[cellOfTown(t)], total = dist[t] + tail;
    if ( total < bestMin ) { bestMin = total; best = t; }
  }
  if ( !best ) return null;
  const chain = [];
  for ( let t = best; t; t = from[t] ) chain.push(t);
  chain.reverse();
  let km = 0, min = 0;
  for ( let k = 1; k < chain.length; k++ ) { const e = adj[chain[k - 1]].find(x => x.to === chain[k]); km += e.km; min += e.min; }
  const s1 = chain[0], s2 = best, legs = [];
  const c1 = cellOfTown(s1), c2 = cellOfTown(s2);
  if ( c1 !== a ) legs.push(...(ownLegs(a, c1, last, y, {fromName: names.fromName, toName: `${h.stop} at ${townName(s1)}`}) ?? []));
  legs.push({from: `${h.stop} at ${townName(s1)}`, to: townName(s2), km: Math.round(km * 10) / 10, minutes: min + wait, wait, road: h.road, land: null, mode, hired: true, shelter: true,
    via: chain.slice(1, -1).map(townName), stops: [s1, s2]});
  if ( c2 !== b ) legs.push(...(ownLegs(c2, b, last, y, {fromName: townName(s2), toName: names.toName}) ?? []));
  return legs;
}

/* ------------------------------------------------------------------ */
/*  A trip                                                             */
/* ------------------------------------------------------------------ */

const sum = (list, f) => list.reduce((n, x) => n + f(x), 0);
/** A trip's legs slowed by the day's weather and the dark; returns the reasons. */
function slowed(legs, {weather, night, year}) {
  const why = new Set();
  for ( const l of legs ) {
    const kind = l.road === "path" ? "path" : l.road, mode = l.hired ? ({"hire:train": "train", "hire:coach": "coach", "hire:bus": "car", "hire:boat": "boat"}[l.mode] ?? null) : l.mode;
    if ( l.mode === "hire:air" || l.mode === "hire:pod" ) continue;
    const wf = Road.weatherFactor(weather, kind, mode, year), nf = l.hired && l.mode !== "hire:coach" ? 1 : Road.nightFactor(kind, mode, year, night);
    const ride = l.minutes - (l.wait ?? 0);
    l.minutes = (ride * wf.factor * nf) + (l.wait ?? 0);
    for ( const w of wf.why ) why.add(w);
    if ( nf > 1 ) why.add("the dark");
  }
  return [...why];
}

/**
 * A trip across the country map. from, to: {at} spots. ctx: {year, want, weather, night, future, wage}.
 * Returns null when either place is off the map or both sit in one square (a local trip: the older sums apply).
 * Else {minutes, km, mode, modeLabel, road, why, by: "map", legs, hired, fare, options}.
 */
export function countryTrip(from, to, ctx = {}) {
  const a = locate(from?.at), b = locate(to?.at);
  if ( !a || !b || a.i === b.i ) return null;
  const y = Number(ctx.year) || 0, names = {fromName: from?.name ?? "the start", toName: to?.name ?? "the end"};
  const build = id => {
    const legs = id.startsWith("hire:") ? hiredLegs(a.i, b.i, id, y, names) : ownLegs(a.i, b.i, id, y, names);
    if ( !legs?.length ) return null;
    const why = slowed(legs, {weather: ctx.weather ?? null, night: !!ctx.night, year: y});
    for ( const l of legs ) l.minutes = Math.max(1, Math.round(l.minutes));
    const ride = legs.find(l => l.hired) ?? null;
    const byRoad = {};
    for ( const l of legs ) byRoad[l.road] = (byRoad[l.road] ?? 0) + l.minutes;
    return {minutes: sum(legs, l => l.minutes), km: Math.round(sum(legs, l => l.km) * 10) / 10, mode: id,
      modeLabel: id.startsWith("hire:") ? HIRED[id].label : Road.MODES[id].label, road: Object.entries(byRoad).sort((p, q) => q[1] - p[1])[0][0], why, by: "map", legs,
      hired: !!ride, fare: ride ? fareOf(id, ride.km, y, ctx.wage) : 0, stop: ride ? ride.from : null};
  };
  const ids = [...ownModes(y).map(m => m.id), ...hiredModes(y, {future: !!ctx.future}).map(m => m.id)];
  const want = WANT[ctx.want] ?? ctx.want;
  if ( want && ids.includes(want) ) { const t = build(want); if ( t ) return t; }
  let best = null;
  const options = [];
  for ( const id of ids ) {
    const t = build(id);
    if ( !t ) continue;
    options.push({id, label: t.modeLabel, minutes: t.minutes, fare: t.fare});
    if ( id === "hire:air" && t.km < 300 ) continue;   // nobody flies a short hop unless they ask to
    if ( !best || t.minutes < best.minutes ) best = t;
  }
  return best ? {...best, options: options.sort((p, q) => p.minutes - q.minutes)} : null;
}

/* ------------------------------------------------------------------ */
/*  Pace, lodging and the schedule                                     */
/* ------------------------------------------------------------------ */

/** How hard the travellers push. time: on the going; hours: on the move in a day; enc: on the encounter chance. */
export const PACES = {
  careful: {label: "Careful", time: 1.25, hours: 8, enc: 0.5, hint: "A quarter slower, and half as likely to run into trouble."},
  steady: {label: "Steady", time: 1, hours: 10, enc: 1, hint: "A plain day's going."},
  forced: {label: "Forced", time: 0.85, hours: 14, enc: 1.25, toll: true, hint: "Faster and longer each day. Each day costs a Stamina roll or a level of bashing harm, for mounts too."}
};
/** Where the travellers sleep. cost: a night for each traveller, as a share of a month's plain wage. */
export const LODGINGS = {
  inn: {label: "Inns and lodgings", enc: 1, cost: 1 / 30, hint: "A bed each night where the road has one."},
  camp: {label: "Camp by the road", enc: 1.25, cost: 0, hint: "Free, and a quarter more likely to be found by trouble."}
};
const HOUR = 3600;

/**
 * Lay a trip over the clock. trip: from countryTrip. opts: start (seconds), nextDawn(t), nextDusk(t) (seconds),
 * sunBurns, pace, lodging, wage, heads (how many pay).
 * The living travel their day's hours and then rest; where the road has no bed they camp. Those the sun burns move
 * only in the dark. Along a road they stop for the day at a village wherever dawn finds them near; a stretch off the
 * roads or a paid ride must be finished in one night, and one longer than a whole night leaves them exposed: that
 * trip is the Storyteller's call.
 * Returns {arrive, minutes, travel, nights, stops: [{at, why, from, to}], cost, fare, exposed, toll, enc}.
 */
export function schedule(trip, {start = 0, nextDawn = null, nextDusk = null, sunBurns = false, pace = "steady", lodging = "inn", wage = 0, heads = 1} = {}) {
  const P = PACES[pace] ?? PACES.steady, L = LODGINGS[lodging] ?? LODGINGS.inn;
  const legs = (trip?.legs ?? []).map(l => ({...l, secs: Math.round(l.minutes * 60 * (l.hired ? 1 : P.time))}));
  const stops = [];
  let t = start, nights = 0, cost = 0, exposed = false, travel = 0, days = 0;
  if ( sunBurns && nextDawn && nextDusk ) {
    // On a road there is always a village within reach, so a ride along one can break anywhere for the day. A stretch
    // off the roads, or a paid ride, has to be finished before dawn with half an hour in hand (0.47.1).
    const wait = (at, until) => { stops.push({at, why: "day shelter", from: t, to: until}); if ( L.cost ) cost += Math.round(wage * L.cost) * heads; t = until; nights++; };
    const open = l => !l.hired && l.road !== "path";
    const room = () => nextDawn(t) - 1800 - t;
    let here = legs[0]?.from ?? "the road";
    for ( let k = 0; k < legs.length; k++ ) {
      const l = legs[k];
      if ( nextDusk(t) < nextDawn(t) ) wait(here, nextDusk(t));
      if ( open(l) ) {
        let left = l.secs;
        while ( left > 0 ) {
          const can = Math.max(0, room());
          if ( left <= can ) { t += left; travel += left; left = 0; break; }
          t += can; travel += can; left -= can;
          wait(`a village on the way to ${l.to}`, nextDusk(t));
        }
      } else {
        // The whole stretch to the next shelter or road, taken in one night
        const sheltered = k === 0 || open(legs[k - 1]) || legs[k - 1].shelter;
        if ( sheltered ) {
          let run = 0;
          for ( let e = k; e < legs.length && !open(legs[e]); e++ ) { run += legs[e].secs; if ( legs[e].shelter ) break; }
          if ( run > room() ) {
            const dusk = nextDusk(t);
            if ( run > (nextDawn(dusk + 1) - dusk) - 1800 ) exposed = true;
            else wait(here, dusk);
          }
        }
        t += l.secs; travel += l.secs;
      }
      here = l.to;
    }
  } else {
    const budget = P.hours * HOUR;
    let used = 0;
    for ( const l of legs ) {
      let left = l.secs;
      if ( l.hired && l.mode !== "hire:coach" ) { t += left; travel += left; continue; }
      while ( left > 0 ) {
        const room = budget - used;
        if ( left <= room || (left - room) < HOUR ) { t += left; travel += left; used += left; left = 0; break; }
        t += room; travel += room; left -= room;
        const bed = lodging === "inn" && l.road !== "path";
        const rest = (24 * HOUR) - budget;
        stops.push({at: bed ? `an inn on the way to ${l.to}` : `a camp on the way to ${l.to}`, why: bed ? "night at an inn" : "night in camp", from: t, to: t + rest, camp: !bed});
        if ( bed ) cost += Math.round(wage * L.cost) * heads;
        t += rest; nights++; used = 0; days++;
      }
    }
  }
  const fare = (trip?.fare ?? 0) * heads;
  const camped = stops.some(s => s.camp);
  return {arrive: t, minutes: Math.round((t - start) / 60), travel: Math.round(travel / 60), nights, stops, cost, fare, exposed,
    toll: P.toll ? Math.max(1, days + 1) : 0, enc: P.enc * (camped || (lodging === "camp" && nights) ? LODGINGS.camp.enc : 1), pace: P.label, lodging: L.label};
}

/** Where on the way a given hour of the going falls: the leg and words for the ground there. */
export function spotAt(trip, hour) {
  let left = Math.max(0, Number(hour) || 0) * 60;
  for ( const l of trip?.legs ?? [] ) {
    if ( left < l.minutes ) return {leg: l, words: l.hired ? `${HIRED[l.mode].label.toLowerCase()} between ${l.from} and ${l.to}` : `in the ${LAND_WORDS[l.land] ?? "country"} between ${l.from} and ${l.to}`};
    left -= l.minutes;
  }
  const l = trip?.legs?.[trip.legs.length - 1];
  return l ? {leg: l, words: `near ${l.to}`} : null;
}

/** A trip's legs in words, one line each. span: a function turning seconds into "2 h 10 min". */
export function legLines(trip, span = s => `${Math.round(s / 60)} min`) {
  return (trip?.legs ?? []).map(l => {
    const how = l.hired ? HIRED[l.mode].label : Road.MODES[l.mode].label;
    const via = l.via?.length ? ` by way of ${l.via.join(", ")}` : "";
    const ground = l.hired ? "" : l.road === "path" ? `, across ${LAND_WORDS[l.land]}` : `, on the ${Road.ROADS[l.road]?.label?.toLowerCase().split(" (")[0] ?? "road"}`;
    return `${l.from} to ${l.to}${via}: ${how.toLowerCase()}${ground}, ${Math.round(l.km)} km, ${span(l.minutes * 60)}`;
  });
}
