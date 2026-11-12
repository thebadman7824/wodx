/**
 * Endless wild land (WoDX Otherworlds 0.17.0), the pure part. Two stretches of the otherworlds have no edge: the open
 * Umbra between the realms, and the storm sea of the Tempest. Each is drawn here a piece at a time. A piece is a map
 * of the usual size at a place (x, y) in the wild; the ground comes from the seed and the place alone, read off one
 * unbroken field, so two pieces side by side meet square for square and the same piece is the same every time it is
 * drawn. A trail (a moon path in the Umbra, a Byway in the Tempest) winds across the whole wild from west to east
 * and another from north to south; away from them the Tempest is open storm water nobody walks.
 *
 * The idea of land made from a seed and a position as the travellers reach it is the common one in open-world games;
 * nothing here is taken from any of them. What lies in each wild is a house rule over the same pages the realm maps
 * use (the Tempest: The Sea of Shadows pdf 20-21 / p. 19-20). wildTile() gives the same model generate() does in
 * realm-maps-rules.mjs, so its svg(), sceneParts() and notes draw it. No Foundry here.
 */
import {stream, pick} from "../../wodx-chronicle/scripts/gen-core.mjs";
import {T, SIZES, VERSION, REALMS, walkable, wallsOf, reach, inB} from "./realm-maps-rules.mjs";

const P = (ground, path, solid, water, hazard, growth, glow, voidC, ink = "#e8e2d0") => ({ground, path, solid, water, hazard, growth, glow, void: voidC, ink});

/** The wilds. things: what a piece may hold, [kind, label, note]; hazards are dangers, landmarks are places. */
export const WILDS = {
  umbra: {label: "The open Umbra", line: "werewolf", world: "umbra", trail: "The moon path", land: "The land", palette: P("#22301e", "#e6e2c8", "#101810", "#16283a", "#5a6a1e", "#2e4a26", "#d8ecff", "#060a08"),
    notes: ["Spirit country between the realms, with no edge: it goes on whichever way the travellers walk.", "A moon path crosses it; off the path the going is whatever the land gives."],
    things: [["landmark", "A glen", "A hollow thick with Wyld growth where spirits of the wood gather."], ["landmark", "Standing stones", "Old stones somebody raised; a pack could rest here."],
      ["landmark", "A spirit's haunt", "Something lives here and knows the travellers have come."], ["hazard", "A soured hollow", "The ground has turned toward the Wyrm; Banes keep it."],
      ["landmark", "A crossing of trails", "Tracks of many spirits meet here."], ["hazard", "A stretch of webbing", "Pattern webs strung over the land; the spiders are not far."]]},
  tempest: {label: "The Tempest", line: "wraith", world: "underworld", trail: "The Byway", land: "The rock", palette: REALMS.tempest.palette,
    notes: ["The storm sea between the realms of the dead, with no edge: a Byway is the only sure footing, and it goes on.", "Off the Byway there is open storm; only islets of relic stone stand in it."],
    things: [["landmark", "An islet of relic stone", "Solid enough to stand on while the storm passes."], ["landmark", "A wreck adrift", "A relic hull turning slowly in the swell."],
      ["hazard", "A maelstrom", "The storm turns in on itself here and pulls."], ["hazard", "A Nihil's mouth", "The sea drains away into nothing."],
      ["landmark", "A Byway marker", "A lantern post somebody keeps lit."], ["landmark", "A Renegade's mooring", "Rope, a ring in the stone, and signs of recent use."]]}
};
export const WILD_ORDER = Object.keys(WILDS);
export const SIDES = {n: [0, -1, "north"], e: [1, 0, "east"], s: [0, 1, "south"], w: [-1, 0, "west"]};
export const OPPOSITE = {n: "s", s: "n", e: "w", w: "e"};

/** A number in [0,1) from the seed, a channel and a lattice point. */
export function hash(seed, k, ix, iy) {
  let h = (Math.trunc(Number(seed) || 0) | 0) ^ Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263) ^ Math.imul((k | 0) + 1, 0x9E3779B1);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h = Math.imul(h ^ (h >>> 15), 0x85EBCA6B); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Smooth value noise over the whole wild, in [0,1]: the same at a spot whichever piece it is read from. */
export function field(seed, k, scale) {
  const s = t => t * t * (3 - 2 * t);
  return (wx, wy) => {
    const fx = wx / scale, fy = wy / scale, ix = Math.floor(fx), iy = Math.floor(fy), tx = s(fx - ix), ty = s(fy - iy);
    const a = hash(seed, k, ix, iy), b = hash(seed, k, ix + 1, iy), c = hash(seed, k, ix, iy + 1), d = hash(seed, k, ix + 1, iy + 1);
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  };
}

/** How far the Wyrm has soured the open Umbra by the year (house rule), as a share added to the soured ground. */
export function souring(year, {future = false} = {}) {
  const y = Number(year) || 1197;
  return (y < 1500 ? 0 : y < 1850 ? 0.03 : y < 1950 ? 0.06 : 0.09) + (future && y > 2025 ? 0.05 : 0);
}

/** Where the west-east trail runs at a column of the wild, and the north-south trail at a row (in cells of the wild). */
export function trails(seed, cols, rows) {
  const ew = field(seed, 11, 1), ns = field(seed, 12, 1);
  return {
    rowAt: wx => Math.round(rows / 2 + (ew(wx / 34, 0.5) - 0.5) * rows * 5 + (ew(wx / 9, 7.5) - 0.5) * 6),
    colAt: wy => Math.round(cols / 2 + (ns(0.5, wy / 34) - 0.5) * cols * 5 + (ns(7.5, wy / 9) - 0.5) * 6)
  };
}

/** The kind of ground at one cell of the wild, before the trails. */
export function groundAt(wild, seed, year, future = false) {
  const h1 = field(seed, 1, 14), h2 = field(seed, 2, 5), g = field(seed, 3, 7), b = field(seed, 4, 18), st = field(seed, 5, 9);
  const sour = souring(year, {future});
  if ( wild === "tempest" ) {
    return (wx, wy) => {
      const h = h1(wx, wy) * 0.7 + h2(wx, wy) * 0.3;
      if ( h > 0.76 ) return st(wx, wy) > 0.8 ? T.hazard : T.ground;
      if ( h > 0.72 ) return T.shallow;
      return T.water;
    };
  }
  return (wx, wy) => {
    const h = h1(wx, wy) * 0.7 + h2(wx, wy) * 0.3;
    if ( h < 0.3 ) return T.water;
    if ( h < 0.35 ) return T.shallow;
    if ( h > 0.76 ) return T.solid;
    if ( b(wx, wy) > 0.9 - sour ) return T.hazard;
    return g(wx, wy) > 0.56 ? T.growth : T.ground;
  };
}

/**
 * One piece of a wild. Returns the model generate() gives for a realm (cells, walls, regions, palette ...), with
 * wild: {id, x, y}. regions: the arrival, a way on at each side the travellers can walk off (exit-n, exit-e, exit-s,
 * exit-w), and what the piece holds.
 */
export function wildTile({wild = "umbra", seed = 1197, x = 0, y = 0, year = 1999, size = "medium", future = false} = {}) {
  const W = WILDS[wild];
  if ( !W ) throw new Error(`No such wild: ${wild}`);
  x = Math.trunc(Number(x) || 0); y = Math.trunc(Number(y) || 0);
  const {cols, rows} = SIZES[size] ?? SIZES.medium;
  if ( !SIZES[size] ) size = "medium";
  const at = groundAt(wild, seed, year, future), tr = trails(seed, cols, rows);
  const ox = x * cols, oy = y * rows;
  const m = Array.from({length: rows}, (_, cy) => Array.from({length: cols}, (_, cx) => at(ox + cx, oy + cy)));
  // The trails: each column of the west-east one is joined to the next, each row of the north-south one likewise
  const onTrail = new Set();
  const lay = (cx, cy) => { if ( inB(m, cx, cy) ) { m[cy][cx] = T.path; onTrail.add(`${cx},${cy}`); } };
  for ( let cx = -1; cx <= cols; cx++ ) {
    const a = tr.rowAt(ox + cx), b = tr.rowAt(ox + cx + 1);
    for ( let wy = Math.min(a, b); wy <= Math.max(a, b); wy++ ) lay(cx, wy - oy);
  }
  for ( let cy = -1; cy <= rows; cy++ ) {
    const a = tr.colAt(oy + cy), b = tr.colAt(oy + cy + 1);
    for ( let wx = Math.min(a, b); wx <= Math.max(a, b); wx++ ) lay(wx - ox, cy);
  }
  const rand = stream(seed, `wild:${wild}:${x}:${y}:${size}`);
  const cellsOf = test => { const out = []; m.forEach((row, cy) => row.forEach((t, cx) => { if ( test(t, cx, cy) ) out.push({x: cx, y: cy}); })); return out; };
  const mid = {x: Math.floor(cols / 2), y: Math.floor(rows / 2)};
  const nearest = (list, p) => list.reduce((best, c) => (!best || Math.abs(c.x - p.x) + Math.abs(c.y - p.y) < Math.abs(best.x - p.x) + Math.abs(best.y - p.y)) ? c : best, null);
  // Somewhere to stand: a piece of open storm with no islet gets a rock in its middle
  let walk = cellsOf(t => walkable(t));
  if ( !walk.length ) { for ( const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]] ) m[mid.y + dy][mid.x + dx] = T.ground; walk = cellsOf(t => walkable(t)); }
  const trail = cellsOf((t, cx, cy) => onTrail.has(`${cx},${cy}`));
  const start = nearest(trail.length ? trail : walk, mid);
  const seen = reach(m, start);
  const clampRect = (s, w = 2, h = 2) => [Math.max(0, Math.min(cols - w, s.x - Math.floor(w / 2))), Math.max(0, Math.min(rows - h, s.y - Math.floor(h / 2))), w, h];
  const regions = [{id: "arrival", kind: "arrival", label: trail.length ? `${W.trail}` : "Arrival", rect: clampRect(start), at: start, note: "Travellers sent here arrive in this spot."}];
  // A way on at each side that can be walked off from where the travellers stand
  const exits = {};
  for ( const [side, [dx, dy, word]] of Object.entries(SIDES) ) {
    const rim = cellsOf((t, cx, cy) => walkable(t) && seen.has(`${cx},${cy}`) && (side === "n" ? cy === 0 : side === "s" ? cy === rows - 1 : side === "w" ? cx === 0 : cx === cols - 1));
    if ( !rim.length ) continue;
    const onPath = rim.filter(c => onTrail.has(`${c.x},${c.y}`));
    const c = nearest(onPath.length ? onPath : rim, side === "n" || side === "s" ? {x: mid.x, y: side === "n" ? 0 : rows - 1} : {x: side === "w" ? 0 : cols - 1, y: mid.y});
    exits[side] = c;
    regions.push({id: `exit-${side}`, kind: "exit", label: `${onPath.length ? W.trail : W.land} goes on to the ${word}`, rect: clampRect(c), at: c, to: {x: x + dx, y: y + dy},
      note: `Walk on: the next piece of ${W.label} lies ${word} of here.`});
  }
  // What the piece holds: none, one or two things, apart from each other and from the ways on
  const used = [start, ...Object.values(exits)];
  const far = (c, d) => used.every(u => Math.abs(u.x - c.x) + Math.abs(u.y - c.y) >= d);
  const count = [0, 1, 1, 2][Math.floor(rand() * 4)];
  const things = W.things.filter(([, label]) => wild !== "umbra" || !/webbing/.test(label) || Number(year) >= 1850);
  const open = cellsOf((t, cx, cy) => (t === T.ground || t === T.growth || t === T.hazard) && seen.has(`${cx},${cy}`));
  for ( let i = 0; i < count; i++ ) {
    const [kind, label, note] = pick(rand, things);
    if ( regions.some(r => r.label === label) ) continue;
    const pool = kind === "hazard" ? open.filter(c => m[c.y][c.x] === T.hazard) : open.filter(c => m[c.y][c.x] !== T.hazard);
    const spots = (pool.length ? pool : open).filter(c => far(c, 5));
    if ( !spots.length ) continue;
    const c = spots[Math.floor(rand() * spots.length)];
    used.push(c);
    if ( kind === "hazard" ) for ( const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]] ) if ( inB(m, c.x + dx, c.y + dy) && walkable(m[c.y + dy][c.x + dx]) && !onTrail.has(`${c.x + dx},${c.y + dy}`) ) m[c.y + dy][c.x + dx] = T.hazard;
    const n = regions.filter(r => r.kind === kind).length;
    regions.push({id: `${kind}-${n}`, kind, label, rect: clampRect(c, kind === "hazard" ? 2 : 3, kind === "hazard" ? 2 : 3), at: c, note});
  }
  const where = `${Math.abs(y)} ${y < 0 ? "north" : "south"}, ${Math.abs(x)} ${x < 0 ? "west" : "east"}`;
  return {version: VERSION, realm: `wild-${wild}`, art: `wild-${wild}-${x}_${y}`, wild: {id: wild, x, y}, label: `${W.label} (${x === 0 && y === 0 ? "where the travellers came in" : where})`,
    line: W.line, world: W.world, shape: "wilds", seed, year: Number(year) || 1999, size, cols, rows, cells: m, walls: wallsOf(m), regions,
    notes: [...W.notes, `House rule: this piece is fixed by the seed ${seed} and its place; the pieces beside it join it square for square.`], closed: false, palette: W.palette,
    ways: [], refs: wild === "tempest" ? REALMS.tempest.refs : [], sky: null, keys: [], decor: []};
}

/** The place of the piece beside this one on a side ("n", "e", "s", "w"). */
export function beside(x, y, side) {
  const s = SIDES[side];
  if ( !s ) throw new Error(`No such side: ${side}`);
  return {x: Math.trunc(x) + s[0], y: Math.trunc(y) + s[1]};
}

/**
 * Where travellers who walked off one piece by a side stand on the next: the cells nearest the matching way in
 * (the next piece's opposite side), or its arrival where that side cannot be walked.
 */
export function entrySpots(model, fromSide, n) {
  const r = model.regions.find(r => r.id === `exit-${OPPOSITE[fromSide]}`) ?? model.regions.find(r => r.kind === "arrival");
  const {x: x0, y: y0} = r.at;
  const seen = reach(model.cells, {x: x0, y: y0});
  const cells = [...seen].map(k => k.split(",").map(Number)).sort((p, q) => (Math.abs(p[0] - x0) + Math.abs(p[1] - y0)) - (Math.abs(q[0] - x0) + Math.abs(q[1] - y0)));
  return cells.slice(0, Math.max(0, n)).map(([x, y]) => ({x, y}));
}

/** Which sides of a piece can be walked off. */
export const waysOn = model => model.regions.filter(r => /^exit-[nesw]$/.test(r.id)).map(r => r.id.slice(5));
