/**
 * A layout of its own for each realm (WoDX Otherworlds 0.12.0). Each one is drawn from what the realm is, not only how
 * it looks: Phoebe's islands strung round the moon, the Atrocity Realm's fenced yards, the Dream Zone stitched from
 * unrelated dreams, Erebus' terraces down to the Crucible, Duat's river journey past the gates to judgement.
 * The seven older layouts (realm-maps-rules.mjs LAYOUT) stay for the realms they already fit.
 *
 * Each layout: (rand, cols, rows, mods, spec) => {m, sites, roads, named?, on?, back?, sealed?}
 *   sites[0] is the arrival; named {landmark label: {x, y}} puts those landmarks in their own places;
 *   on / back put the two ways out; sealed: ground the arrival cannot reach turns to rock.
 */
import {between, shuffled} from "../../wodx-chronicle/scripts/gen-core.mjs";
import {T, walkable, inB, grid, noise, spread, compound, hamlet, LAYOUT} from "./realm-maps-rules.mjs";

/* ------------------------------------------------------------------ small drawing helpers */
const clampP = (cols, rows, p, e = 2) => ({x: Math.max(e, Math.min(cols - 1 - e, Math.round(p.x))), y: Math.max(e, Math.min(rows - 1 - e, Math.round(p.y)))});
function rect(m, x, y, w, h, t) { for ( let j = 0; j < h; j++ ) for ( let i = 0; i < w; i++ ) if ( inB(m, x + i, y + j) ) m[y + j][x + i] = t; }
function frame(m, x, y, w, h, t) { for ( let j = 0; j < h; j++ ) for ( let i = 0; i < w; i++ ) if ( (i === 0 || j === 0 || i === w - 1 || j === h - 1) && inB(m, x + i, y + j) ) m[y + j][x + i] = t; }
function disc(m, cx, cy, r, t, test = null) {
  for ( let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++ ) for ( let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++ )
    if ( inB(m, x, y) && Math.hypot(x - cx, y - cy) <= r && (!test || test(m[y][x], x, y)) ) m[y][x] = t;
}
/** A straight line of cells (Bresenham), w wide. keep: kinds it does not overwrite. */
function line(m, a, b, t, w = 1, keep = null) {
  let x = Math.round(a.x), y = Math.round(a.y);
  const x1 = Math.round(b.x), y1 = Math.round(b.y), dx = Math.abs(x1 - x), dy = -Math.abs(y1 - y), sx = x < x1 ? 1 : -1, sy = y < y1 ? 1 : -1;
  let err = dx + dy;
  for ( ;; ) {
    for ( let j = 0; j < w; j++ ) for ( let i = 0; i < w; i++ ) if ( inB(m, x + i, y + j) && !(keep && keep.includes(m[y + j][x + i])) ) m[y + j][x + i] = t;
    if ( x === x1 && y === y1 ) break;
    const e2 = 2 * err;
    if ( e2 >= dy ) { err += dy; x += sx; }
    if ( e2 <= dx ) { err += dx; y += sy; }
  }
}
/** A wandering walk of cells from a point. */
function walk(m, rand, p, len, t, turn = 0.3, w = 1, keep = null) {
  let {x, y} = p, d = [[1, 0], [-1, 0], [0, 1], [0, -1]][between(rand, 0, 3)];
  const out = [];
  for ( let i = 0; i < len; i++ ) {
    if ( rand() < turn ) d = [[1, 0], [-1, 0], [0, 1], [0, -1]][between(rand, 0, 3)];
    const nx = x + d[0], ny = y + d[1];
    if ( !inB(m, nx, ny) || nx < 1 || ny < 1 || nx > m[0].length - 2 || ny > m.length - 2 ) { d = [-d[0], -d[1]]; continue; }
    x = nx; y = ny;
    for ( let j = 0; j < w; j++ ) for ( let k = 0; k < w; k++ ) if ( inB(m, x + k, y + j) && !(keep && keep.includes(m[y + j][x + k])) ) m[y + j][x + k] = t;
    out.push({x, y});
  }
  return out;
}
const centreOf = (cols, rows) => ({x: Math.floor(cols / 2), y: Math.floor(rows / 2)});

/* ------------------------------------------------------------------ the layouts */
export const REALM_LAYOUTS = {
  // Phoebe fills half the sky (Rage Across the Heavens pdf 25 / p. 24): islands of starlight strung round the moon's
  // rim, Moon Paths running from each straight to the moon, the Wyrm Reaches crumbling along the top.
  "moon-rim"(rand, cols, rows) {
    const m = grid(cols, rows, T.void), moon = {x: cols * 0.8, y: rows * 0.78}, R = Math.min(cols, rows) * 0.52;
    const isles = [];
    const n = 7 + between(rand, 0, 2);
    for ( let i = 0; i < n; i++ ) {
      const a = Math.PI * (0.98 + 0.56 * i / (n - 1)) + (rand() - 0.5) * 0.08, rr = R + 3 + (i % 2) * 6 + rand() * 2;
      const p = clampP(cols, rows, {x: moon.x + Math.cos(a) * rr, y: moon.y + Math.sin(a) * rr}, 3);
      disc(m, p.x, p.y, 1.4 + rand() * 0.9, T.ground);
      isles.push({...p, a});
    }
    // The Moon Paths: silver straight to the moon's edge
    for ( const s of isles ) line(m, s, {x: moon.x + Math.cos(s.a) * (R - 1), y: moon.y + Math.sin(s.a) * (R - 1)}, T.path);
    // The moon's rim, walkable silver where the paths meet it
    for ( let y = 0; y < rows; y++ ) for ( let x = 0; x < cols; x++ ) { const d = Math.hypot(x - moon.x, y - moon.y); if ( Math.abs(d - R) < 0.7 ) m[y][x] = T.shallow; }
    // The Wyrm Reaches: broken scraps along the top
    for ( const p of spread(rand, cols, Math.floor(rows * 0.22), 6, 2) ) disc(m, p.x, p.y + 1, 1.5, T.ground);
    const reach = isles.reduce((a, b) => (b.y < a.y ? b : a));
    return {m, sites: isles, roads: "bridge", named: {"the Wyrm Reaches' edge": {x: reach.x, y: Math.max(1, reach.y - 1)}, "Phoebe's light": clampP(cols, rows, {x: moon.x + Math.cos(Math.PI * 1.25) * (R - 1), y: moon.y + Math.sin(Math.PI * 1.25) * (R - 1)}, 1)}};
  },

  // A threshold to the fae homeland (Umbra: The Velvet Shadow pdf 50 / p. 49): deep enchanted wood, round glades, a
  // ring of standing stones at the heart, the silver road winding through it from edge to edge.
  "fae-threshold"(rand, cols, rows) {
    const m = grid(cols, rows, T.growth), f = noise(rand, cols, rows, 3), c = centreOf(cols, rows);
    for ( let y = 0; y < rows; y++ ) for ( let x = 0; x < cols; x++ ) if ( f(x, y) > 0.62 && rand() < 0.5 ) m[y][x] = T.solid; // old trunks
    const glades = spread(rand, cols, rows, 6, 5);
    for ( const g of glades ) disc(m, g.x, g.y, 2.6 + rand(), T.ground);
    disc(m, c.x, c.y, 5, T.ground);
    for ( let k = 0; k < 12; k++ ) { const a = k / 12 * Math.PI * 2; m[Math.round(c.y + Math.sin(a) * 4)][Math.round(c.x + Math.cos(a) * 4)] = T.solid; } // the stones
    // The silver road: one long wave across, through the ring
    const A = rows * 0.25, ph = rand() * Math.PI * 2, per = cols / (1.3 + rand() * 0.6);
    let prev = null;
    for ( let x = 0; x < cols; x++ ) {
      const y = Math.round(c.y + A * Math.sin((x - c.x) / per * Math.PI * 2 + ph) * Math.min(1, Math.abs(x - c.x) / 6));
      const p = {x, y: Math.max(1, Math.min(rows - 2, y))};
      if ( prev ) line(m, prev, p, T.path); prev = p;
    }
    // A door with no house: a lone frame in a glade
    const d = glades[1];
    m[d.y - 1][d.x - 1] = T.solid; m[d.y - 1][d.x + 1] = T.solid; m[d.y - 1][d.x] = T.solid;
    const road = {x: 1, y: Math.round(c.y + A * Math.sin((1 - c.x) / per * Math.PI * 2 + ph))};
    return {m, sites: [clampP(cols, rows, road, 1), ...glades], roads: "path", named: {"a ring of standing stones": c, "a door with no house": {x: d.x, y: d.y + 1}, "a fae palace, empty": glades[2], "the silver road": clampP(cols, rows, {x: cols - 2, y: Math.round(c.y + A * Math.sin((cols - 2 - c.x) / per * Math.PI * 2 + ph))}, 1)}};
  },

  // Cruelty's leavings (Umbra: The Velvet Shadow pdf 53 / p. 52): fenced yards in rows with narrow ways between, cages
  // along the fences, a gallows yard, and the grove of gibbet trees at the edge where the gateway stands.
  "cruel-yards"(rand, cols, rows) {
    const m = grid(cols, rows, T.solid), yw = 7, yh = 6, yards = [];
    for ( let y = 1; y + yh < rows - 1; y += yh + 1 ) for ( let x = 1; x + yw < cols - 9; x += yw + 1 ) {
      rect(m, x - 1, y - 1, yw + 2, yh + 2, T.path); // the ways between
      rect(m, x, y, yw, yh, T.ground); frame(m, x, y, yw, yh, T.solid);
      const side = between(rand, 0, 3), gx = x + between(rand, 2, yw - 3), gy = y + between(rand, 2, yh - 3);
      if ( side === 0 ) m[y][gx] = T.ground; else if ( side === 1 ) m[y + yh - 1][gx] = T.ground; else if ( side === 2 ) m[gy][x] = T.ground; else m[gy][x + yw - 1] = T.ground;
      for ( let i = 2; i < yw - 2; i += 2 ) if ( rand() < 0.7 ) m[y + 1][x + i] = T.solid; // cages along the fence
      yards.push({x: x + Math.floor(yw / 2), y: y + Math.floor(yh / 2) + 1});
    }
    // The gibbet grove: open ground at the east edge, dead trees standing in it
    rect(m, cols - 9, 1, 8, rows - 2, T.ground);
    for ( let i = 0; i < 18; i++ ) m[between(rand, 2, rows - 3)][between(rand, cols - 8, cols - 2)] = T.solid;
    const gallows = yards[Math.floor(yards.length / 2)];
    m[gallows.y - 1][gallows.x - 1] = T.solid; m[gallows.y - 1][gallows.x] = T.solid; m[gallows.y - 1][gallows.x + 1] = T.solid;
    const sy = shuffled(rand, yards);
    return {m, sites: [{x: 1, y: rows - 2}, ...sy.slice(0, 4)], roads: "path", named: {"the gibbet trees": {x: cols - 5, y: Math.floor(rows / 2)}, "a prison yard": gallows, "a replayed massacre": sy[4] ?? sy[0]}, on: {x: cols - 3, y: 3}};
  },

  // Shared dreams stitched together (Umbra: The Velvet Shadow pdf 43 / p. 42): scenes that have nothing to do with each
  // other, a classroom, a house, a sea, a staircase that falls away, set side by side at odd angles in the dark.
  "dream-patchwork"(rand, cols, rows) {
    const m = grid(cols, rows, T.void), pts = spread(rand, cols, rows, 8, 5), kinds = shuffled(rand, ["house", "class", "sea", "stair", "garden", "class-sea", "hall", "house"]);
    const named = {};
    pts.forEach((p, i) => {
      const w = between(rand, 6, 9), h = between(rand, 5, 7), x = Math.max(1, Math.min(cols - w - 1, p.x - Math.floor(w / 2))), y = Math.max(1, Math.min(rows - h - 1, p.y - Math.floor(h / 2)));
      const k = kinds[i];
      if ( k === "house" ) { rect(m, x, y, w, h, T.ground); frame(m, x, y, w, h, T.solid); for ( let j = y + 1; j < y + h - 1; j++ ) m[j][x + Math.floor(w / 2)] = j === y + 2 ? T.ground : T.solid; m[y + h - 1][x + 1] = T.ground; }
      else if ( k === "class" ) { rect(m, x, y, w, h, T.ground); for ( let j = y + 1; j < y + h - 1; j += 2 ) for ( let i2 = x + 1; i2 < x + w - 1; i2 += 2 ) m[j][i2] = T.solid; }
      else if ( k === "sea" ) { rect(m, x, y, w, h, T.water); frame(m, x, y, w, h, T.shallow); }
      else if ( k === "class-sea" ) { rect(m, x, y, w, h, T.ground); for ( let j = y; j < y + h; j++ ) for ( let i2 = x + Math.floor(w / 2); i2 < x + w; i2++ ) m[j][i2] = T.shallow; for ( let j = y + 1; j < y + h - 1; j += 2 ) m[j][x + 1] = T.solid; }
      else if ( k === "stair" ) { for ( let s = 0; s < w; s++ ) for ( let j = 0; j < 2; j++ ) if ( inB(m, x + s, y + s % h + j) && rand() < 0.9 ) m[y + Math.min(h - 1, Math.floor(s * h / w)) + j][x + s] = T.ground; }
      else if ( k === "garden" ) { rect(m, x, y, w, h, T.growth); }
      else { rect(m, x, y, w, h, T.path); for ( let i2 = x + 1; i2 < x + w - 1; i2 += 3 ) { m[y + 1][i2] = T.solid; m[y + h - 2][i2] = T.solid; } }
      const c = {x: x + Math.floor(w / 2) + (k === "house" ? -1 : 0), y: y + Math.floor(h / 2)};
      if ( k === "house" && !named["a childhood house"] ) named["a childhood house"] = {x: x + 1, y: y + h - 2};
      else if ( k === "stair" ) named["a falling staircase"] = {x, y};
      else if ( k === "class-sea" ) named["a school that is also a sea"] = c;
      p.c = c;
    });
    // A door from a dream: a frame standing alone in the dark
    const d = clampP(cols, rows, {x: rand() * cols, y: rand() * rows}, 3);
    rect(m, d.x - 1, d.y - 1, 3, 3, T.solid); m[d.y][d.x] = T.ground; m[d.y + 1][d.x] = T.ground;
    named["a door from a dream"] = {x: d.x, y: d.y};
    return {m, sites: pts.map(p => p.c), roads: "bridge", named};
  },

  // Gaia's wrath and purgatory (Umbra: The Velvet Shadow pdf 62 / p. 61): a vast cave bowl stepping down in terraces to
  // the Crucible's pool, cells of atonement cut into the outer rock, the silver river feeding it all.
  "crucible-bowl"(rand, cols, rows) {
    const m = grid(cols, rows, T.solid), c = centreOf(cols, rows), R = Math.min(cols, rows) * 0.44, f = noise(rand, cols, rows, 4);
    for ( let y = 0; y < rows; y++ ) for ( let x = 0; x < cols; x++ ) { const d = Math.hypot((x - c.x) * 0.85, y - c.y); if ( d < R + (f(x, y) - 0.5) * 3 ) m[y][x] = T.ground; }
    // Terraces: rock ledges round the bowl, each broken by two ramps at its own angles
    for ( const r of [R * 0.72, R * 0.46] ) {
      const g1 = rand() * Math.PI * 2, g2 = g1 + Math.PI * (0.7 + rand() * 0.6);
      for ( let y = 0; y < rows; y++ ) for ( let x = 0; x < cols; x++ ) {
        const d = Math.hypot((x - c.x) * 0.85, y - c.y), a = Math.atan2(y - c.y, x - c.x);
        const gap = [g1, g2].some(g => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) * d < 1.4);
        if ( Math.abs(d - r) < 0.6 && !gap ) m[y][x] = T.solid;
      }
    }
    disc(m, c.x, c.y, 2.5, T.hazard); // the Crucible's pool
    // Cells of atonement in the outer rock, a tunnel to each
    const cells = [];
    for ( let k = 0; k < 5; k++ ) {
      const a = rand() * Math.PI * 2, p = clampP(cols, rows, {x: c.x + Math.cos(a) * (R + 3) / 0.85, y: c.y + Math.sin(a) * (R + 3)}, 2);
      rect(m, p.x - 1, p.y - 1, 3, 3, T.ground);
      line(m, p, {x: c.x + Math.cos(a) * (R - 2) / 0.85, y: c.y + Math.sin(a) * (R - 2)}, T.path);
      cells.push(p);
    }
    return {m, sites: [cells[0], ...cells.slice(1)], roads: "path", named: {"the Crucible": {x: c.x, y: c.y + 3}, "a chamber of atonement": cells[1]}};
  },

  // Endless change in a thin Weaver shell (Umbra: The Velvet Shadow pdf 65 / p. 64): a patchwork of lands that meet at
  // ragged seams, each patch a different ground, drawn new every visit.
  "flux-shards"(rand, cols, rows) {
    const m = grid(cols, rows, T.void), seeds = spread(rand, cols, rows, 16, 1).map(p => ({...p, k: [T.ground, T.growth, T.shallow, T.water, T.void, T.ground, T.hazard][between(rand, 0, 6)]}));
    const f = noise(rand, cols, rows, 2);
    for ( let y = 0; y < rows; y++ ) for ( let x = 0; x < cols; x++ ) {
      let best = null, bd = 1e9;
      for ( const s of seeds ) { const d = Math.hypot(x - s.x, y - s.y) + f(x, y) * (1 + (s.x * 7 + s.y * 3) % 4); if ( d < bd ) { bd = d; best = s; } }
      m[y][x] = best.k === T.hazard && rand() < 0.6 ? T.ground : best.k;
    }
    // The thin Weaver shell round it all
    for ( let x = 0; x < cols; x++ ) { m[0][x] = T.solid; m[rows - 1][x] = T.solid; }
    for ( let y = 0; y < rows; y++ ) { m[y][0] = T.solid; m[y][cols - 1] = T.solid; }
    const land = seeds.filter(s => s.k !== T.void && s.k !== T.water);
    return {m, sites: land.length > 3 ? land : seeds, roads: "bridge"};
  },

  // Tales of the Garou past (Umbra: The Velvet Shadow pdf 68 / p. 67): a great hill with terraces, the hall of past
  // glories on its crown, a row of heroes' barrows down its flank, a legendary battlefield on the plain below.
  "saga-hill"(rand, cols, rows) {
    const m = grid(cols, rows, T.ground), c = {x: Math.floor(cols * 0.45), y: Math.floor(rows * 0.42)}, f = noise(rand, cols, rows, 5), R = Math.min(cols, rows) * 0.42;
    for ( let y = 0; y < rows; y++ ) for ( let x = 0; x < cols; x++ ) {
      const e = 1 - Math.hypot(x - c.x, (y - c.y) * 1.2) / R + (f(x, y) - 0.5) * 0.25;
      if ( e < 0 && f(x, y) > 0.55 ) m[y][x] = T.growth;
      if ( [0.33, 0.62].some(l => Math.abs(e - l) < 0.025) && rand() < 0.88 ) m[y][x] = T.solid; // the hill's terraces
      if ( e < -0.25 && f(x * 2, y) < 0.3 ) m[y][x] = T.water;
    }
    compound(m, c, 9, "s");
    // The barrows: a row of mounds down the west flank, each with its mouth
    const barrows = [];
    for ( let k = 0; k < 4; k++ ) { const b = {x: c.x - 8 - k * 4, y: c.y + 2 + k * 3}; if ( !inB(m, b.x, b.y) || b.x < 2 ) continue; disc(m, b.x, b.y, 1.4, T.solid); m[b.y + 1][b.x] = T.ground; barrows.push({x: b.x, y: b.y + 2}); }
    // The battlefield of legend: an open plain, banners standing in it
    const plain = {x: Math.floor(cols * 0.7), y: Math.floor(rows * 0.8)};
    rect(m, plain.x - 6, plain.y - 3, 12, 6, T.ground);
    for ( let i = 0; i < 6; i++ ) m[plain.y - 2 + between(rand, 0, 4)][plain.x - 5 + between(rand, 0, 10)] = T.solid;
    // A crack where Malfeas leaks: a rift at the far edge
    const crack = {x: cols - 4, y: between(rand, 3, Math.floor(rows / 3))};
    line(m, {x: crack.x - 3, y: crack.y - 2}, {x: crack.x + 2, y: crack.y + 2}, T.void);
    return {m, sites: [{x: 2, y: rows - 3}, plain, ...spread(rand, cols, rows, 3, 4)], roads: "path",
      named: {"the hall of past glories": c, "a hero's barrow": barrows[0] ?? {x: 3, y: c.y}, "a battlefield of legend": plain, "a crack where Malfeas leaks": {x: crack.x - 4, y: crack.y}}};
  },

  // The primordial world (Umbra: The Velvet Shadow pdf 71 / p. 70): the wilds, with a broad sauropod trail beaten across
  // them, a healing spring in a hollow, and the troglodyte caves in a cliff.
  "primordial"(rand, cols, rows, mods, spec) {
    const base = LAYOUT.wilds(rand, cols, rows, mods, spec), m = base.m;
    const ys = between(rand, 4, rows - 5);
    let prev = {x: 0, y: ys};
    for ( let x = 2; x < cols; x += 2 ) { const p = {x, y: Math.max(2, Math.min(rows - 4, prev.y + between(rand, -1, 1)))}; line(m, prev, p, T.path, 2, [T.water]); prev = p; }
    const spring = spread(rand, cols, rows, 1, 6)[0];
    disc(m, spring.x, spring.y, 3, T.ground); disc(m, spring.x, spring.y, 1.2, T.shallow);
    const cave = {x: between(rand, 4, cols - 8), y: 2};
    rect(m, cave.x - 3, 0, 9, 4, T.solid); rect(m, cave.x, 1, 2, 3, T.ground);
    return {m, sites: base.sites, roads: "path", named: {"a sauropod's trail": {x: Math.floor(cols / 2), y: m.findIndex(r => r[Math.floor(cols / 2)] === T.path) + 0 || ys}, "a healing spring": {x: spring.x, y: spring.y + 2}, "the troglodyte caves": {x: cave.x, y: 3}}};
  },

  // Industrial ruin (Umbra: The Velvet Shadow pdf 59 / p. 58; Book of the Wyrm pdf 23 / p. 22): rail lines fanning out from
  // the Last Junction across an ash plain, factory blocks between the tracks, a slag mountain smoking over it.
  "rail-yards"(rand, cols, rows) {
    const m = grid(cols, rows, T.ground), j = {x: 3, y: Math.floor(rows / 2)};
    const ends = Array.from({length: 5}, (_, i) => ({x: cols - 1, y: Math.round(2 + (rows - 5) * i / 4)}));
    for ( const e of ends ) line(m, j, e, T.path);
    // Factories in the wedges between the lines, with their chimneys
    const fac = [];
    for ( let i = 0; i < 9; i++ ) {
      const w = between(rand, 4, 7), h = between(rand, 3, 4), x = between(rand, 8, cols - w - 2), y = between(rand, 1, rows - h - 2);
      let free = true;
      for ( let yy = y - 1; yy <= y + h && free; yy++ ) for ( let xx = x - 1; xx <= x + w && free; xx++ ) if ( !inB(m, xx, yy) || m[yy][xx] === T.path ) free = false;
      if ( !free ) continue;
      rect(m, x, y, w, h, T.solid); m[y + h - 1][x + 1] = T.ground; fac.push({x: x + 1, y: y + h});
      if ( inB(m, x + w - 1, y - 1) ) m[y - 1][x + w - 1] = T.solid;
    }
    const slag = {x: Math.floor(cols * 0.62), y: Math.floor(rows * 0.5)};
    disc(m, slag.x, slag.y, 4.5, T.hazard, t => t !== T.path); disc(m, slag.x, slag.y, 3, T.solid, t => t !== T.path);
    return {m, sites: [{x: cols - 2, y: ends[2].y}, ...fac.slice(0, 3)], roads: "path", named: {"the Last Junction": j, "a slag mountain": {x: slag.x, y: slag.y + 5}, "a sweatshop of spirits": fac[0] ?? {x: 10, y: 3}}};
  },

  // Where life arises unbidden (Umbra: The Velvet Shadow pdf 77 / p. 76): a lush basin round a lake, the Garden of
  // Delight in tended beds on one shore, a swamp nursery at the lake's edge, wild meadow everywhere else.
  "garden-basin"(rand, cols, rows) {
    const m = grid(cols, rows, T.growth), f = noise(rand, cols, rows, 4), lake = {x: Math.floor(cols * 0.55), y: Math.floor(rows * 0.55)};
    for ( let y = 0; y < rows; y++ ) for ( let x = 0; x < cols; x++ ) {
      const d = Math.hypot((x - lake.x) / 1.5, y - lake.y) + (f(x, y) - 0.5) * 3;
      if ( d < 5 ) m[y][x] = T.water; else if ( d < 6.2 ) m[y][x] = T.shallow; else if ( f(x, y) < 0.35 ) m[y][x] = T.ground;
    }
    // The Garden of Delight: beds in rows round a fountain
    const g = {x: Math.floor(cols * 0.2), y: Math.floor(rows * 0.3)};
    for ( let dy = -4; dy <= 4; dy++ ) for ( let dx = -4; dx <= 4; dx++ ) if ( inB(m, g.x + dx, g.y + dy) ) m[g.y + dy][g.x + dx] = (dx === 0 || dy === 0) ? T.path : (Math.abs(dx) % 2 ? T.growth : T.ground);
    disc(m, g.x, g.y, 1, T.shallow);
    // The swamp nursery, at the lake's south-east edge
    const sw = {x: lake.x + 8, y: lake.y + 4};
    for ( let i = 0; i < 30; i++ ) { const x = sw.x + between(rand, -4, 4), y = sw.y + between(rand, -3, 3); if ( inB(m, x, y) ) m[y][x] = T.shallow; }
    // A new creature's first den: a rock outcrop with a mouth
    const den = {x: Math.floor(cols * 0.8), y: Math.floor(rows * 0.2)};
    disc(m, den.x, den.y, 2.2, T.solid); m[den.y + 1][den.x] = T.ground; m[den.y + 2][den.x] = T.ground;
    return {m, sites: [{x: 2, y: rows - 3}, ...spread(rand, cols, rows, 3, 4)], roads: "path", named: {"the Garden of Delight": {x: g.x + 1, y: g.y + 1}, "a swamp nursery": clampP(cols, rows, sw), "a new creature's first den": {x: den.x, y: den.y + 3}}};
  },

  // Rustic countryside and generic suburbia (Umbra: The Velvet Shadow pdf 80 / p. 79): fields walled by hedgerows, two roads
  // crossing at the Town, a farm on the road, a wood on one side with a laboratory hidden in it.
  "hedgerow-country"(rand, cols, rows) {
    const m = grid(cols, rows, T.ground);
    // Fields: split the land again and again, a hedge along each cut with a gap in it
    const cut = (x, y, w, h, d) => {
      if ( d > 3 || w < 8 || h < 6 ) { if ( rand() < 0.5 ) rect(m, x + 1, y + 1, w - 1, h - 1, T.growth); return; }
      if ( w > h ) { const cx = x + between(rand, 3, w - 4); for ( let yy = y; yy < y + h; yy++ ) if ( rand() < 0.88 ) m[yy][cx] = T.solid; cut(x, y, cx - x, h, d + 1); cut(cx, y, x + w - cx, h, d + 1); }
      else { const cy = y + between(rand, 3, h - 4); for ( let xx = x; xx < x + w; xx++ ) if ( rand() < 0.88 ) m[cy][xx] = T.solid; cut(x, y, w, cy - y, d + 1); cut(x, cy, w, y + h - cy, d + 1); }
    };
    cut(0, 0, cols, rows, 0);
    // The wood along the west
    const f = noise(rand, cols, rows, 3);
    for ( let y = 0; y < rows; y++ ) for ( let x = 0; x < Math.floor(cols * 0.25); x++ ) if ( f(x, y) > 0.35 ) m[y][x] = rand() < 0.12 ? T.solid : T.growth;
    const town = {x: Math.floor(cols * 0.58), y: Math.floor(rows * 0.5)};
    for ( let x = 0; x < cols; x++ ) m[town.y][x] = T.path;
    for ( let y = 0; y < rows; y++ ) m[y][town.x] = T.path;
    const farm = {x: Math.floor(cols * 0.82), y: Math.floor(rows * 0.25)};
    compound(m, farm, 5, "s");
    const lab = {x: Math.floor(cols * 0.12), y: Math.floor(rows * 0.7)};
    compound(m, lab, 5, "n");
    return {m, sites: [{x: cols - 2, y: town.y}, ...spread(rand, cols, rows, 3, 4)], roads: "path", named: {"the Town": town, "a farm": farm, "a hidden laboratory": lab, "the Countryside's wood": {x: Math.floor(cols * 0.1), y: Math.floor(rows * 0.25)}}};
  },

  // The edge of nothing (Umbra: The Velvet Shadow pdf 47 / p. 46): a shelf of land along the top breaking off into the
  // void in ledges that step down and away, the last perches no more than a stone or two.
  "abyss-edge"(rand, cols, rows) {
    const m = grid(cols, rows, T.void), f = noise(rand, cols, rows, 4), shelf = Math.floor(rows * 0.3);
    for ( let x = 0; x < cols; x++ ) { const h = shelf + Math.round((f(x, 0) - 0.5) * 6); for ( let y = 0; y < h; y++ ) m[y][x] = f(x, y) > 0.72 ? T.solid : T.ground; }
    // Ledges stepping down, each a little further out
    const ledges = [];
    let x = between(rand, 4, cols - 12), y = shelf + 3;
    while ( y < rows - 3 ) {
      const w = between(rand, 3, 7);
      rect(m, Math.max(1, x), y, w, between(rand, 1, 2), T.ground);
      ledges.push({x: Math.max(1, x) + Math.floor(w / 2), y});
      x += between(rand, -8, 8); x = Math.max(2, Math.min(cols - 9, x)); y += between(rand, 3, 4);
    }
    // Perches: single stones further off
    for ( const p of spread(rand, cols, rows, 6, 2).filter(p => p.y > shelf + 2) ) m[p.y][p.x] = T.ground;
    const last = ledges[ledges.length - 1];
    return {m, sites: [{x: 3, y: 2}, ...ledges], roads: "bridge", named: {"a lost human's camp": {x: Math.floor(cols * 0.7), y: 3}, "a ledge over nothing": ledges[Math.floor(ledges.length / 2)] ?? ledges[0], "a spirit's last perch": last}, on: {x: Math.floor(cols * 0.5), y: Math.max(2, shelf - 4)}};
  },

  // A made refuge (Horizon: Stronghold of Hope pdf 55 / p. 54): a perfect disc of ground in the void, laid out by its
  // makers in mirrored gardens on two axes, the Chantry house at the crossing, the portal at one end, the tower at the other.
  "horizon-estate"(rand, cols, rows) {
    const m = grid(cols, rows, T.void), c = centreOf(cols, rows), R = Math.min(cols, rows) / 2 - 1.5;
    disc(m, c.x, c.y, R, T.ground);
    for ( let y = 0; y < rows; y++ ) for ( let x = 0; x < cols; x++ ) {
      const dx = Math.abs(x - c.x), dy = Math.abs(y - c.y), d = Math.hypot(x - c.x, y - c.y);
      if ( d > R ) continue;
      if ( dx === 0 || dy === 0 ) m[y][x] = T.path;
      else if ( d > R - 1 ) m[y][x] = T.shallow; // the shimmering edge of the made world
      else if ( (dx + dy) % 4 === 0 && dx > 3 && dy > 2 ) m[y][x] = T.growth; // beds, the same in every quarter
      else if ( dx % 5 === 0 && dy % 3 === 1 ) m[y][x] = T.solid; // clipped hedges
    }
    const tower = {x: c.x, y: c.y - Math.floor(R) + 3};
    frame(m, tower.x - 1, tower.y - 1, 3, 3, T.solid); m[tower.y + 1][tower.x] = T.path;
    return {m, sites: [{x: c.x, y: c.y + Math.floor(R) - 1}, {x: c.x - Math.floor(R) + 2, y: c.y}, {x: c.x + Math.floor(R) - 2, y: c.y}], roads: "path",
      named: {"the Chantry house": c, "a library tower": tower, "a garden of the Spheres": {x: c.x + 5, y: c.y + 4}}};
  },

  // A planet's shadow on the Horizon (Beyond the Barriers pdf 21 / p. 20): the land seems to mirror itself across a seam,
  // but the mirror lies; where the halves meet lies the overlap zone.
  "mirror-shade"(rand, cols, rows) {
    const m = grid(cols, rows, T.void), f = noise(rand, cols, rows, 4), g = noise(rand, cols, rows, 3), half = Math.floor(cols / 2);
    for ( let y = 1; y < rows - 1; y++ ) for ( let x = 1; x < half; x++ ) { const v = f(x, y); m[y][x] = v < 0.3 ? T.void : v < 0.38 ? T.shallow : v > 0.78 ? T.solid : v > 0.62 ? T.growth : T.ground; }
    for ( let y = 1; y < rows - 1; y++ ) for ( let x = half; x < cols - 1; x++ ) {
      const sx = cols - 1 - x, sy = Math.max(1, Math.min(rows - 2, y + Math.round((g(x, y) - 0.5) * 4)));
      let t = m[sy][sx];
      if ( g(x, y) > 0.72 ) t = t === T.void ? T.ground : t === T.ground ? T.void : t; // where the mirror lies
      m[y][x] = t;
    }
    for ( let y = 1; y < rows - 1; y++ ) for ( let x = half - 1; x <= half; x++ ) m[y][x] = T.shallow; // the seam
    return {m, sites: [{x: 3, y: Math.floor(rows / 2)}, ...spread(rand, cols, rows, 4, 3)], roads: "bridge",
      named: {"an overlap zone": {x: half, y: Math.floor(rows / 2)}, "the planet's shadow": {x: Math.floor(cols * 0.2), y: Math.floor(rows * 0.3)}}, on: {x: cols - 3, y: Math.floor(rows / 2)}};
  },

  // A body of the solar system ruled by one Sphere (The Infinite Tapestry pdf 118 / p. 117): a cratered plain, canals
  // running in from the edges to meet where seven canals meet, a Chantry behind black walls beside the meeting.
  "canal-plain"(rand, cols, rows) {
    const m = grid(cols, rows, T.ground), meet = {x: Math.floor(cols * 0.55), y: Math.floor(rows * 0.5)};
    for ( const p of spread(rand, cols, rows, 7, 3) ) {
      const r = between(rand, 2, 5);
      for ( let y = 0; y < rows; y++ ) for ( let x = 0; x < cols; x++ ) { const d = Math.hypot(x - p.x, y - p.y); if ( Math.abs(d - r) < 0.6 && rand() < 0.85 ) m[y][x] = T.solid; }
    }
    // Seven canals to the meeting, from points round the edge
    for ( let k = 0; k < 7; k++ ) {
      const a = k / 7 * Math.PI * 2 + rand() * 0.3, e = {x: meet.x + Math.cos(a) * cols, y: meet.y + Math.sin(a) * cols};
      const edge = {x: Math.max(0, Math.min(cols - 1, e.x)), y: Math.max(0, Math.min(rows - 1, e.y))};
      line(m, meet, edge, T.shallow);
    }
    // A glassy scar
    const sc = spread(rand, cols, rows, 1, 5)[0];
    for ( let i = -5; i <= 5; i++ ) for ( let j = -1; j <= 1; j++ ) if ( inB(m, sc.x + i, sc.y + j + Math.round(i / 3)) && m[sc.y + j + Math.round(i / 3)][sc.x + i] === T.ground ) m[sc.y + j + Math.round(i / 3)][sc.x + i] = T.hazard;
    return {m, sites: [{x: 2, y: rows - 3}, ...spread(rand, cols, rows, 3, 4)], roads: "path",
      named: {"the Sphere's heart": meet, "a Chantry behind black walls": {x: meet.x - 7, y: meet.y - 5}, "a glassy scar": {x: sc.x, y: sc.y + 3}}};
  },

  // A prison cut off from the world (M20 pdf 27 / p. 26): rooms nested inside rooms, each door in a different wall,
  // dead ends that look like doors, and the riddle and the way out together at the very centre.
  "nested-riddle"(rand, cols, rows) {
    const m = grid(cols, rows, T.ground), c = centreOf(cols, rows), max = Math.min(c.x, c.y) - 1;
    for ( let r = 3; r <= max; r += 3 ) {
      for ( let y = c.y - r; y <= c.y + r; y++ ) for ( let x = c.x - r; x <= c.x + r; x++ ) if ( inB(m, x, y) && Math.max(Math.abs(x - c.x), Math.abs(y - c.y)) === r ) m[y][x] = T.solid;
      // One true door, and one false one that opens on a closet
      const side = between(rand, 0, 3), o = between(rand, -r + 1, r - 1);
      const door = [{x: c.x + o, y: c.y - r}, {x: c.x + r, y: c.y + o}, {x: c.x + o, y: c.y + r}, {x: c.x - r, y: c.y + o}][side];
      m[door.y][door.x] = T.ground;
      if ( r > 3 ) { const fs = (side + 2) % 4, fo = between(rand, -r + 2, r - 2), fd = [{x: c.x + fo, y: c.y - r}, {x: c.x + r, y: c.y + fo}, {x: c.x + fo, y: c.y + r}, {x: c.x - r, y: c.y + fo}][fs]; m[fd.y][fd.x] = T.ground;
        const inw = [{x: 0, y: 1}, {x: -1, y: 0}, {x: 0, y: -1}, {x: 1, y: 0}][fs]; if ( inB(m, fd.x + inw.x * 2, fd.y + inw.y * 2) ) { m[fd.y + inw.y + inw.x][fd.x + inw.x + inw.y] = T.solid; m[fd.y + inw.y - inw.x][fd.x + inw.x - inw.y] = T.solid; m[fd.y + inw.y * 2][fd.x + inw.x * 2] = T.solid; } }
    }
    // Outside the last wall the dark closes in
    for ( let y = 0; y < rows; y++ ) for ( let x = 0; x < cols; x++ ) if ( Math.max(Math.abs(x - c.x), Math.abs(y - c.y)) > max + 1 ) m[y][x] = T.void;
    return {m, sites: [{x: c.x - max, y: c.y + max}, {x: c.x + max, y: c.y - max}], roads: null,
      named: {"the riddle's heart": c, "the way out, if solved": {x: c.x + 1, y: c.y + 1}}, on: {x: c.x + 1, y: c.y - 1}, back: {x: c.x - max, y: c.y - max}};
  },

  // Space past the Horizon (The Book of Worlds; Ethernaut accounts): a vast dark with a scatter of drifting rocks, one
  // Nephandi Labyrinth like a knot of black stone, the long hull of a wrecked ethership, a star with a body.
  "etherspace"(rand, cols, rows) {
    const m = grid(cols, rows, T.void), rocks = spread(rand, cols, rows, 14, 2);
    for ( const p of rocks ) disc(m, p.x, p.y, rand() * 1.4 + 0.5, T.ground);
    const lab = {x: Math.floor(cols * 0.75), y: Math.floor(rows * 0.3)}, L = 5;
    rect(m, lab.x - L, lab.y - L, L * 2 + 1, L * 2 + 1, T.solid);
    for ( let y = lab.y - L + 1; y < lab.y + L; y++ ) for ( let x = lab.x - L + 1; x < lab.x + L; x++ ) if ( (x - lab.x) % 2 === 0 || (y - lab.y) % 2 === 0 ? rand() < 0.62 : false ) m[y][x] = T.ground;
    m[lab.y + L][lab.x] = T.ground;
    const ship = {x: Math.floor(cols * 0.3), y: Math.floor(rows * 0.7)};
    for ( let i = -7; i <= 7; i++ ) for ( let j = -1; j <= 1; j++ ) if ( Math.abs(j) < 1.6 - Math.abs(i) / 7 ) m[ship.y + j][ship.x + i] = (i % 3 === 0 && j !== 0) ? T.solid : T.ground;
    const star = {x: Math.floor(cols * 0.55), y: Math.floor(rows * 0.6)};
    disc(m, star.x, star.y, 3.2, T.ground); disc(m, star.x, star.y, 1.6, T.hazard);
    return {m, sites: rocks, roads: "bridge", named: {"a Nephandi Labyrinth": {x: lab.x, y: lab.y + L}, "an ethership's wreck": ship, "a star in its body": {x: star.x, y: star.y + 2}}};
  },

  // The ordered machine world (Iteration X pdf 69 / p. 67): a circuit laid out at a giant scale, great blocks joined by
  // traces that only run straight and turn square, the great computer at the centre.
  "circuit"(rand, cols, rows) {
    const m = grid(cols, rows, T.void), c = centreOf(cols, rows), chips = [];
    const place = (x, y, w, h) => { rect(m, x, y, w, h, T.solid); rect(m, x + 1, y + 1, w - 2, h - 2, T.ground); const p = {x: x + Math.floor(w / 2), y: y + h - 1}; m[p.y][p.x] = T.ground; chips.push({x: p.x, y: p.y, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2)}); };
    place(c.x - 5, c.y - 3, 11, 7);
    for ( let tries = 0; chips.length < 8 && tries < 200; tries++ ) {
      const w = between(rand, 5, 7), h = between(rand, 4, 5), x = between(rand, 1, cols - w - 2), y = between(rand, 1, rows - h - 2);
      let free = true;
      for ( let yy = y - 2; yy < y + h + 2 && free; yy++ ) for ( let xx = x - 2; xx < x + w + 2 && free; xx++ ) if ( inB(m, xx, yy) && m[yy][xx] !== T.void ) free = false;
      if ( free ) place(x, y, w, h);
    }
    // Traces: from each block's pin, square turns only, to the next
    for ( let i = 1; i < chips.length; i++ ) {
      const a = {x: chips[i].x, y: chips[i].y + 1}, b = {x: chips[i - 1].x, y: chips[i - 1].y + 1};
      line(m, a, {x: a.x, y: b.y}, T.path, 1, [T.solid, T.ground]); line(m, {x: a.x, y: b.y}, b, T.path, 1, [T.solid, T.ground]);
      if ( inB(m, a.x, a.y) && m[a.y][a.x] === T.void ) m[a.y][a.x] = T.path;
      if ( inB(m, b.x, b.y) && m[b.y][b.x] === T.void ) m[b.y][b.x] = T.path;
    }
    const door = {x: 1, y: c.y};
    line(m, door, {x: c.x - 6, y: c.y}, T.path, 1, [T.solid, T.ground]); m[door.y][0] = T.solid;
    return {m, sites: [{x: chips[1]?.x ?? 3, y: (chips[1]?.y ?? 3)}, ...chips.slice(2).map(k => ({x: k.cx, y: k.cy}))], roads: "line", sealed: true,
      named: {"the great computer": {x: c.x, y: c.y}, "a machine-spirit's hall": chips[2] ? {x: chips[2].cx, y: chips[2].cy} : {x: 3, y: 3}, "the sealed way to Earth": {x: 1, y: c.y}}};
  },

  // The storm sea between the lands of the dead (The Sea of Shadows pdf 20 / p. 19): open black water, a few rocks and
  // wrecks, the River of Death cutting across it as a current, and the Byways marked by lanterns over the water.
  "storm-sea"(rand, cols, rows) {
    const m = grid(cols, rows, T.water);
    // The River of Death: a broad current from corner to corner
    const a = {x: 0, y: between(rand, 2, Math.floor(rows * 0.35))}, b = {x: cols - 1, y: between(rand, Math.floor(rows * 0.6), rows - 3)};
    line(m, a, b, T.shallow, 3);
    const rocks = spread(rand, cols, rows, 9, 3);
    for ( const p of rocks ) { disc(m, p.x, p.y, 1 + rand() * 1.5, T.ground); }
    // A relic wreck: a long hull with ribs
    const w = rocks[1]; for ( let i = -4; i <= 4; i++ ) if ( inB(m, w.x + i, w.y) ) m[w.y][w.x + i] = i % 2 ? T.solid : T.ground;
    // A Renegade cove: a horseshoe of rock
    const cv = rocks[2]; disc(m, cv.x, cv.y, 3, T.ground); disc(m, cv.x, cv.y + 1, 1.8, T.water);
    // The Byways: lantern-lit lines between the marker rocks
    const mark = rocks[0];
    for ( const p of rocks.slice(3, 6) ) line(m, mark, p, T.path, 1);
    const ferry = {x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2) + 1};
    return {m, sites: rocks.slice(3), roads: "bridge", named: {"a Byway's marker": mark, "the River of Death": {x: Math.round(cols * 0.25), y: Math.round(a.y + (b.y - a.y) * 0.25) + 1}, "a Ferryman's reed boat": ferry, "a relic wreck": {x: w.x, y: w.y}, "a Renegade cove": {x: cv.x, y: cv.y - 2}}};
  },

  // Oblivion's maze (Wraith 20th; the Book of Oblivion): tunnels that worm out from the Void's pit at the centre, branch
  // and dead-end, hives in pockets off them, and one perfect square Zone where time does not run.
  "worm-tunnels"(rand, cols, rows) {
    const m = grid(cols, rows, T.solid), c = centreOf(cols, rows), ends = [];
    disc(m, c.x, c.y, 3.5, T.ground); disc(m, c.x, c.y, 1.8, T.void);
    for ( let k = 0; k < 7; k++ ) {
      const a = k / 7 * Math.PI * 2, start = {x: Math.round(c.x + Math.cos(a) * 3), y: Math.round(c.y + Math.sin(a) * 3)};
      const cells = walk(m, rand, start, 40 + between(rand, 0, 30), T.ground, 0.22);
      const end = cells[cells.length - 1] ?? start;
      if ( rand() < 0.6 ) disc(m, end.x, end.y, 1.8, T.ground);
      ends.push(end);
      const br = cells[Math.floor(cells.length / 2)];
      if ( br ) ends.push(walk(m, rand, br, 15, T.ground, 0.3).pop() ?? br);
    }
    // The Zone: a perfect square room, edges sharp
    const z = clampP(cols, rows, ends[0], 4);
    rect(m, z.x - 2, z.y - 2, 5, 5, T.path);
    const hive = clampP(cols, rows, ends[3] ?? ends[1], 3); disc(m, hive.x, hive.y, 2.4, T.ground);
    return {m, sites: [clampP(cols, rows, ends[1], 2), ...ends.slice(4).map(e => clampP(cols, rows, e, 2))], roads: "path",
      named: {"a Zone, untouched by time": z, "a Spectre hive": hive, "Industrion's waste shaft": clampP(cols, rows, ends[5] ?? ends[2], 2)}, on: {x: c.x, y: c.y + 3}};
  },

  // An endless archipelago, rumoured to hold paradise or Hell (Wraith 20th pdf 84 / p. 91): every island a different
  // afterlife: a green paradise, a burning Hell, a would-be god's fortress, a pier where boats land, and stranger ones.
  "afterlife-isles"(rand, cols, rows) {
    const m = grid(cols, rows, T.water), isles = spread(rand, cols, rows, 10, 4), named = {};
    const kinds = ["landing", "paradise", "hell", "throne", ...shuffled(rand, ["frozen", "ruin", "garden", "bare", "frozen", "ruin"])];
    isles.forEach((p, i) => {
      const k = kinds[i] ?? "bare", r = k === "throne" ? 4 : between(rand, 2, 4);
      disc(m, p.x, p.y, r + rand() * 0.5, k === "frozen" ? T.shallow : T.ground);
      if ( k === "paradise" ) disc(m, p.x, p.y, r - 0.5, T.growth);
      if ( k === "hell" ) for ( let n = 0; n < 10; n++ ) { const x = p.x + between(rand, -r + 1, r - 1), y = p.y + between(rand, -r + 1, r - 1); if ( inB(m, x, y) && Math.hypot(x - p.x, y - p.y) < r - 0.5 ) m[y][x] = T.hazard; }
      if ( k === "throne" ) compound(m, p, 7, "s");
      if ( k === "ruin" ) for ( let n = 0; n < 5; n++ ) { const x = p.x + between(rand, -r + 1, r - 1), y = p.y + between(rand, -r + 1, r - 1); if ( inB(m, x, y) ) m[y][x] = T.solid; }
      if ( k === "garden" ) for ( let dy = -r + 1; dy < r; dy++ ) if ( dy % 2 === 0 ) for ( let dx = -r + 1; dx < r; dx++ ) if ( inB(m, p.x + dx, p.y + dy) && m[p.y + dy][p.x + dx] === T.ground ) m[p.y + dy][p.x + dx] = T.growth;
      if ( k === "landing" ) for ( let j = 1; j <= 3; j++ ) if ( inB(m, p.x, p.y + r + j) ) m[p.y + r + j][p.x] = T.path; // the pier
      p.k = k;
    });
    named["the landing"] = isles[0]; named["an island paradise"] = isles[1]; named["an island Hell"] = {x: isles[2].x, y: isles[2].y}; named["a would-be god's throne"] = isles[3];
    return {m, sites: [{x: isles[0].x, y: Math.min(rows - 2, isles[0].y + 3)}, ...isles.slice(4)], roads: "bridge", named};
  },

  // The CyberRealm (Umbra: The Velvet Shadow pdf 59 / p. 58; Book of the Weaver pdf 33 / p. 32): the Weaver's city laid
  // out on a perfect lattice. Avenues and cross streets at fixed intervals, every block filled by a tall tower, a few
  // blocks left open as plazas, skybridges of web strung between towers, and the Technocracy's ordered core at the hub.
  // Before the machine age the lattice is only a small walled town at the centre (house rule).
  "neon-grid"(rand, cols, rows, mods = {}) {
    const m = grid(cols, rows, T.void), c = centreOf(cols, rows);
    const small = (mods.small ?? 0) > 0, step = (mods.dense ?? 0) > 0 ? 4 : 5;
    const hw = small ? Math.floor(cols * 0.28) : Math.floor(cols / 2) - 1, hh = small ? Math.floor(rows * 0.3) : Math.floor(rows / 2) - 1;
    const x0 = c.x - hw, x1 = c.x + hw, y0 = c.y - hh, y1 = c.y + hh;
    rect(m, x0, y0, x1 - x0 + 1, y1 - y0 + 1, T.solid);
    // The lattice: every step-th row and column is a street, every second one a wide avenue
    const xs = [], ys = [];
    for ( let x = x0 + 1; x < x1; x += step ) xs.push(x);
    for ( let y = y0 + 1; y < y1; y += step ) ys.push(y);
    xs.forEach((x, i) => { for ( let y = y0 + 1; y < y1; y++ ) { m[y][x] = T.path; if ( i % 2 === 0 && inB(m, x + 1, y) && x + 1 < x1 ) m[y][x + 1] = T.path; } });
    ys.forEach((y, i) => { for ( let x = x0 + 1; x < x1; x++ ) { m[y][x] = T.path; if ( i % 2 === 0 && y + 1 < y1 ) m[y + 1][x] = T.path; } });
    // Blocks: each a tower (solid) with a lit lobby cell on the street; some left open as plazas
    const blocks = [];
    for ( let j = 0; j < ys.length; j++ ) for ( let i = 0; i < xs.length; i++ ) {
      const bx = xs[i] + (i % 2 === 0 ? 2 : 1), by = ys[j] + (j % 2 === 0 ? 2 : 1), bw = (xs[i + 1] ?? x1) - bx, bh = (ys[j + 1] ?? y1) - by;
      if ( bw < 1 || bh < 1 ) continue;
      blocks.push({x: bx, y: by, w: bw, h: bh});
      if ( rand() < 0.14 ) rect(m, bx, by, bw, bh, T.ground);
    }
    // The core: the central blocks merged into one ordered compound
    const core = {x: c.x, y: c.y};
    rect(m, c.x - 3, c.y - 3, 7, 7, T.path); frame(m, c.x - 2, c.y - 2, 5, 5, T.solid); rect(m, c.x - 1, c.y - 1, 3, 3, T.ground); m[c.y + 2][c.x] = T.ground;
    // Skybridges: web strung across a block between two towers (shallow, walkable)
    for ( const bl of shuffled(rand, blocks).slice(0, Math.max(3, Math.floor(blocks.length / 6))) ) {
      if ( bl.w >= 3 && bl.h >= 2 ) { const yy = bl.y + Math.floor(bl.h / 2); for ( let x = bl.x - 1; x <= bl.x + bl.w; x++ ) if ( inB(m, x, yy) ) m[yy][x] = T.shallow; }
    }
    if ( small ) { frame(m, x0 - 1, y0 - 1, x1 - x0 + 3, y1 - y0 + 3, T.solid); rect(m, x0 - 1, c.y, 1, 1, T.path); for ( let x = 1; x < x0 - 1; x++ ) m[c.y][x] = T.path; }
    // A glass tower: the tallest block, and a Pattern Spider nest in a dark plaza at a far corner
    const tall = blocks.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a), blocks[0]);
    const nest = blocks[blocks.length - 1], refuge = blocks.find(b => b !== tall && b !== nest && Math.abs(b.x - tall.x) + Math.abs(b.y - tall.y) > 6) ?? blocks[1];
    rect(m, nest.x, nest.y, nest.w, nest.h, T.hazard);
    rect(m, refuge.x, refuge.y, refuge.w, refuge.h, T.ground);
    const arrive = small ? {x: 1, y: c.y} : {x: xs[0], y: y1 - 1};
    const scar = {x: xs[xs.length - 1], y: y0 + 1};
    return {m, sites: [arrive, core, ...blocks.filter(b => m[b.y][b.x] === T.ground).slice(0, 3).map(b => ({x: b.x, y: b.y}))], roads: "line",
      named: {"a tower of glass": {x: tall.x + Math.floor(tall.w / 2), y: tall.y + tall.h}, "a Pattern Spider nest": {x: nest.x, y: nest.y}, "the road to the Scar": scar, "a Glass Walker refuge": {x: refuge.x, y: refuge.y}}};
  },

  // The Isle of Sorrows (Wraith 20th; the Sea of Shadows pdf 20 / p. 19): an island packed with city to its shores in the
  // storm sea. A great wall rings the coast against the Maelstroms, quays and piers jut into the sea all round, houses
  // crowd every quarter with lanes between, avenues run from the Onyx Tower at the centre out to the harbour gates,
  // Nhudri's forges burn by the eastern shore, and small walled islets stand offshore.
  "sorrow-isle"(rand, cols, rows) {
    const m = grid(cols, rows, T.water), c = centreOf(cols, rows), f = noise(rand, cols, rows, 5), g = noise(rand, cols, rows, 2);
    const RX = c.x - 5, RY = c.y - 4, er = (x, y) => Math.hypot((x - c.x) / RX, (y - c.y) / RY) - (f(x, y) - 0.5) * 0.12;
    // The island and its wall: everything inside the wall is city
    for ( let y = 0; y < rows; y++ ) for ( let x = 0; x < cols; x++ ) {
      const d = er(x, y);
      if ( d < 0.9 ) m[y][x] = g(x, y) > 0.35 && (x % 3) && (y % 2) ? T.solid : T.ground; // houses packed close, lanes where they gap
      else if ( d < 0.98 ) m[y][x] = T.solid; // the great wall
      else if ( d < 1.06 ) m[y][x] = T.shallow; // the strand below it
    }
    // Avenues from the Tower out to the gates, and two ring streets
    const gates = [];
    for ( let k = 0; k < 6; k++ ) {
      const a = k / 6 * Math.PI * 2 + Math.PI / 2;
      let p = {x: c.x, y: c.y};
      for ( let t = 0; t < 60; t++ ) { const q = {x: Math.round(c.x + Math.cos(a) * RX * t / 40), y: Math.round(c.y + Math.sin(a) * RY * t / 40)}; if ( !inB(m, q.x, q.y) || m[q.y][q.x] === T.water ) break; if ( m[q.y][q.x] !== T.shallow ) m[q.y][q.x] = T.path; p = q; }
      gates.push(p);
      // A pier out into the sea from each gate
      for ( let t = 1; t <= 3; t++ ) { const x = Math.round(p.x + Math.cos(a) * t), y = Math.round(p.y + Math.sin(a) * t); if ( inB(m, x, y) && m[y][x] === T.water ) m[y][x] = T.shallow; }
    }
    for ( let y = 0; y < rows; y++ ) for ( let x = 0; x < cols; x++ ) {
      const d = er(x, y);
      if ( (Math.abs(d - 0.32) < 0.035 || Math.abs(d - 0.62) < 0.035) ) m[y][x] = T.path;
    }
    // The Onyx Tower alone in its square
    disc(m, c.x, c.y, 3.4, T.path); disc(m, c.x, c.y, 2.2, T.solid);
    // Nhudri's forges by the eastern shore, a Legion's citadel in the north-west, the Senate's open hall in the south-west
    const fg = {x: Math.round(c.x + RX * 0.7), y: c.y + 1};
    rect(m, fg.x - 2, fg.y - 2, 4, 4, T.ground); for ( let i = 0; i < 6; i++ ) { const x = fg.x + between(rand, -2, 1), y = fg.y + between(rand, -2, 1); m[y][x] = T.hazard; }
    const cit = {x: Math.round(c.x - RX * 0.5), y: Math.round(c.y - RY * 0.5)}; compound(m, cit, 5, "s");
    const senate = {x: Math.round(c.x - RX * 0.5), y: Math.round(c.y + RY * 0.45)}; rect(m, senate.x - 2, senate.y - 1, 5, 3, T.ground);
    // Walled islets offshore in the corners
    for ( const q of [{x: 3, y: 3}, {x: cols - 4, y: rows - 4}, {x: cols - 4, y: 3}] ) if ( m[q.y][q.x] === T.water ) { disc(m, q.x, q.y, 1.6, T.ground); m[q.y][q.x] = T.solid; }
    const harbour = gates[0]; // the south gate
    const sites = [{x: harbour.x, y: Math.min(rows - 2, harbour.y + 1)}, ...gates.slice(1, 4)];
    return {m, sites, roads: "path", named: {"the Onyx Tower": c, "Nhudri's forges": fg, "a Legion's citadel": cit, "the Senate": senate}};
  },

  // Another Dark Kingdom (Wraith 20th; the Sea of Shadows): a sprawling necropolis along a coast, alleys growing as they
  // please round a walled inner citadel with the throne at its heart, a market square, the Necropolis gate inland.
  "coast-necropolis"(rand, cols, rows) {
    const m = grid(cols, rows, T.ground), f = noise(rand, cols, rows, 3), shore = noise(rand, cols, rows, 6);
    for ( let y = 0; y < rows; y++ ) for ( let x = 0; x < cols; x++ ) {
      const coast = rows * 0.72 + (shore(x, 0) - 0.5) * 6;
      if ( y > coast + 1 ) m[y][x] = T.water; else if ( y > coast ) m[y][x] = T.shallow;
      else if ( f(x, y) > 0.42 && (x + y) % 5 && x % 4 && y % 3 ) m[y][x] = T.solid; // houses packed close, lanes where they gap
    }
    const cit = {x: Math.floor(cols * 0.42), y: Math.floor(rows * 0.38)};
    rect(m, cit.x - 6, cit.y - 5, 13, 11, T.path); frame(m, cit.x - 5, cit.y - 4, 11, 9, T.solid);
    m[cit.y + 4][cit.x] = T.path; compound(m, cit, 5, "s");
    const market = {x: Math.floor(cols * 0.72), y: Math.floor(rows * 0.55)};
    rect(m, market.x - 3, market.y - 2, 7, 5, T.ground);
    for ( let i = -2; i <= 2; i += 2 ) m[market.y][market.x + i] = T.solid; // stalls
    // The landing at the shore, the Necropolis gate in the inland wall
    for ( let x = 0; x < cols; x++ ) if ( rand() < 0.85 ) m[0][x] = T.solid;
    const gate = {x: Math.floor(cols * 0.2), y: 1};
    m[0][gate.x] = T.path;
    const land = {x: Math.floor(cols * 0.55), y: m.findIndex((r, y) => y > rows / 2 && r[Math.floor(cols * 0.55)] === T.shallow)};
    return {m, sites: [{x: land.x, y: Math.max(2, land.y - 1)}, ...spread(rand, cols, Math.floor(rows * 0.6), 3, 3)], roads: "path",
      named: {"the throne of the Kingdom": cit, "a market of the dead": market, "a Necropolis gate": {x: gate.x, y: 2}}};
  },

  // The First City remade (Dirty Secrets of the Black Hand pdf 92 / p. 93): a walled city of the first age, square to the four
  // quarters, a stepped tower-temple at its heart, a processional way from the bronze gate, sealed tombs in its corners.
  "first-city"(rand, cols, rows) {
    const m = grid(cols, rows, T.ground), c = centreOf(cols, rows);
    frame(m, 2, 1, cols - 4, rows - 2, T.solid);
    // Blocks of building on a grid, the streets between
    for ( let y = 3; y < rows - 3; y += 4 ) for ( let x = 4; x < cols - 4; x += 5 ) if ( rand() < 0.75 ) rect(m, x, y, 3, 2, T.solid);
    // The stepped temple: squares one inside the next, a stair up the south face
    for ( let r = 6; r >= 1; r-- ) for ( let y = c.y - r; y <= c.y + r; y++ ) for ( let x = c.x - r; x <= c.x + r; x++ ) if ( Math.max(Math.abs(x - c.x), Math.abs(y - c.y)) === r ) m[y][x] = r % 2 ? T.solid : T.ground;
    for ( let y = c.y; y <= rows - 2; y++ ) { m[y][c.x] = T.path; m[y][c.x + 1] = T.path; } // the processional way and stair
    m[rows - 2][c.x] = T.path; m[rows - 1][c.x] = T.solid;
    // The Aralu tombs: four sealed chambers in the corners of the walls
    const tombs = [{x: 5, y: 3}, {x: cols - 7, y: 3}, {x: 5, y: rows - 5}, {x: cols - 7, y: rows - 5}];
    for ( const t of tombs ) { rect(m, t.x - 1, t.y - 1, 4, 3, T.solid); m[t.y][t.x] = T.ground; m[t.y][t.x + 1] = T.ground; }
    m[tombs[0].y + 1][tombs[0].x] = T.ground;
    return {m, sites: [{x: c.x, y: rows - 3}, {x: 4, y: c.y}, {x: cols - 5, y: c.y}], roads: "path",
      named: {"the re-made First City": c, "the bronze gate": {x: c.x + 1, y: rows - 4}, "the Aralu tombs": {x: tombs[0].x, y: tombs[0].y + 2}}};
  },

  // Between the Near and the Deep Dreaming (Changeling 20th pdf 307 / p. 306): a land out of story, rolling and bright, a
  // road of moonlight in one great curve to the shore of the sea of dreams, a castle with four towers on a rise.
  "storyland"(rand, cols, rows) {
    const m = grid(cols, rows, T.ground), f = noise(rand, cols, rows, 5), g = noise(rand, cols, rows, 3);
    for ( let y = 0; y < rows; y++ ) for ( let x = 0; x < cols; x++ ) {
      const shore = cols * 0.78 + (f(0, y) - 0.5) * 8;
      if ( x > shore + 1 ) m[y][x] = T.water; else if ( x > shore ) m[y][x] = T.shallow;
      else if ( g(x, y) > 0.62 ) m[y][x] = T.growth; else if ( g(x, y) < 0.12 ) m[y][x] = T.void; // holes in the dream
    }
    // The road of moonlight: a great arc from the west to the sea
    const ac = {x: cols * 0.45, y: rows * 1.25}, R = rows * 1.05;
    let prev = null;
    for ( let a = Math.PI * 1.18; a <= Math.PI * 1.78; a += 0.02 ) { const p = {x: Math.round(ac.x + Math.cos(a) * R), y: Math.round(ac.y + Math.sin(a) * R)}; if ( inB(m, p.x, p.y) ) { if ( prev ) line(m, prev, p, T.path); prev = p; } }
    const castle = {x: Math.floor(cols * 0.35), y: Math.floor(rows * 0.68)};
    compound(m, castle, 9, "n");
    for ( const [dx, dy] of [[-4, -4], [3, -4], [-4, 3], [3, 3]] ) rect(m, castle.x + dx, castle.y + dy, 2, 2, T.solid);
    const free = {x: Math.floor(cols * 0.62), y: Math.floor(rows * 0.75)};
    compound(m, free, 5, "n"); disc(m, free.x, free.y, 1.5, T.growth);
    const shoreAt = {x: Math.floor(cols * 0.76), y: Math.floor(rows * 0.5)};
    return {m, sites: [{x: 2, y: Math.floor(rows * 0.55)}, ...spread(rand, Math.floor(cols * 0.7), rows, 3, 3)], roads: "path",
      named: {"a chimerical castle": castle, "a road of moonlight": prev ?? {x: cols / 2, y: 3}, "a sea of dreams' shore": shoreAt, "a lost freehold": free}};
  },

  // The farthest Dreaming (Changeling 20th pdf 308 / p. 307): dream-stuff thinning to nothing, a chain of islands winding
  // inward and shrinking as it goes, to the last gate at the heart of it.
  "inward-spiral"(rand, cols, rows) {
    const m = grid(cols, rows, T.void), c = centreOf(cols, rows), isles = [];
    const turns = 1.6, n = 11;
    for ( let i = 0; i < n; i++ ) {
      const t = i / (n - 1), a = t * turns * Math.PI * 2 + rand() * 0.2, r = (1 - t) * (Math.min(c.x, c.y) - 3) + 1.5;
      const p = clampP(cols, rows, {x: c.x + Math.cos(a) * r * 1.3, y: c.y + Math.sin(a) * r}, 3);
      disc(m, p.x, p.y, 3.4 - t * 2.4 + rand() * 0.4, T.ground);
      if ( isles.length ) line(m, isles[isles.length - 1], p, T.path);
      isles.push(p);
    }
    rect(m, c.x - 1, c.y - 1, 3, 1, T.solid); m[c.y][c.x - 1] = T.solid; m[c.y][c.x + 1] = T.solid; m[c.y][c.x] = T.ground; // the last gate
    return {m, sites: isles.slice(0, -1), roads: "bridge", named: {"the last gate": {x: c.x, y: c.y + 1}, "a dream older than people": isles[2], "a road toward Arcadia": isles[6]}};
  },

  // The Thousand Hells round the Earth Prison (Dark Kingdom of Jade pdf 90 / p. 89): Ti Yu walled at the centre with its
  // broad streets and Hall of Justice, the courts of the Yama Kings in a ring round it, each a walled hell of its own.
  "hell-courts"(rand, cols, rows) {
    const m = grid(cols, rows, T.solid), c = centreOf(cols, rows), R = Math.min(c.x, c.y) - 4;
    // The road round the courts and the spokes into Ti Yu
    for ( let y = 0; y < rows; y++ ) for ( let x = 0; x < cols; x++ ) { const d = Math.hypot((x - c.x) * 0.75, y - c.y); if ( Math.abs(d - R * 0.62) < 0.7 ) m[y][x] = T.path; }
    // Ti Yu: walled, broad streets every third cell, the Hall of Justice at its heart
    rect(m, c.x - 5, c.y - 4, 11, 9, T.solid);
    for ( let y = c.y - 3; y <= c.y + 3; y++ ) for ( let x = c.x - 4; x <= c.x + 4; x++ ) m[y][x] = ((x - c.x) % 3 === 0 || (y - c.y) % 3 === 0) ? T.path : T.solid;
    m[c.y + 4][c.x] = T.path; m[c.y - 4][c.x] = T.path;
    for ( const [dx, dy] of [[0, 5], [0, -5]] ) line(m, {x: c.x + dx, y: c.y + dy}, {x: c.x + dx, y: c.y + dy * 1.6}, T.path);
    const courts = [], n = 8;
    for ( let k = 0; k < n; k++ ) {
      const a = k / n * Math.PI * 2 + 0.2, p = clampP(cols, rows, {x: c.x + Math.cos(a) * R * 0.62 / 0.75 * 1.02, y: c.y + Math.sin(a) * R * 0.62 * 1.02}, 4);
      const q = clampP(cols, rows, {x: c.x + Math.cos(a) * (R * 0.95) / 0.75, y: c.y + Math.sin(a) * R * 0.98}, 4);
      compound(m, q, 7, q.y > c.y ? "n" : "s");
      for ( let i = 0; i < 4; i++ ) { const x = q.x + between(rand, -2, 2), y = q.y + between(rand, -2, 2); if ( m[y][x] === T.ground ) m[y][x] = T.hazard; } // its torment
      line(m, p, {x: q.x, y: q.y + (q.y > c.y ? -4 : 4)}, T.path);
      courts.push({x: q.x, y: q.y});
    }
    const gate = {x: c.x, y: 1};
    line(m, gate, {x: c.x, y: c.y - R * 0.62}, T.path);
    return {m, sites: [{x: c.x, y: rows - 2}, ...courts.slice(2)], roads: "path",
      named: {"Ti Yu, the Earth Prison": c, "a Yama King's court": courts[0], "a hell of the wicked": courts[1], "the gate the Second Breath returns by": gate}};
  },

  // China's Deadlands (Dark Kingdom of Jade pdf 45 / p. 44): a square city of the Empire on a grid of streets, the
  // Imperial Highway running straight north to the Jade Palace, the railway in from Kowloon on the east.
  "imperial-grid"(rand, cols, rows, mods, spec) {
    const base = LAYOUT.city(rand, cols, rows, mods, {...spec, city: "square"}), m = base.m, c = centreOf(cols, rows);
    for ( let y = 0; y <= c.y; y++ ) { m[y][c.x] = T.path; if ( inB(m, c.x + 1, y) ) m[y][c.x + 1] = T.path; }
    for ( let x = c.x; x < cols; x++ ) m[c.y + 4][x] = T.path;
    return {m, sites: [{x: c.x, y: rows - 2}, ...base.sites], roads: "path", heart: 1, on: {x: c.x, y: 1}, named: {"the Kowloon station's twin": {x: cols - 3, y: c.y + 4}}};
  },

  // The Egyptian Underworld (Mummy pdf 14 / p. 13): the river of the dead runs the length of it with green banks and
  // desert beyond, pylon gates one after another along the bank road, the hall of judgement at the road's end.
  "river-journey"(rand, cols, rows) {
    const m = grid(cols, rows, T.ground), f = noise(rand, cols, rows, 7);
    const ry = x => Math.round(rows * 0.5 + (f(x, 0) - 0.5) * 8);
    for ( let x = 0; x < cols; x++ ) {
      const y = ry(x);
      for ( let d = -5; d <= 5; d++ ) { const Y = y + d; if ( !inB(m, x, Y) ) continue; m[Y][x] = Math.abs(d) <= 1 ? T.water : Math.abs(d) <= 3 ? T.growth : m[Y][x]; }
      if ( inB(m, x, y - 4) ) m[y - 4][x] = T.path; // the bank road
    }
    // Pylon gates along the road, a pair of towers each
    const gates = [];
    for ( let x = 6; x < cols - 8; x += 6 ) { const y = ry(x) - 4; for ( const dx of [-1, 1] ) for ( const dy of [-1, 0, 1] ) if ( inB(m, x + dx, y + dy) && dy !== 0 ) m[y + dy][x + dx] = T.solid; gates.push({x, y}); }
    const hall = {x: cols - 5, y: ry(cols - 5) - 6};
    compound(m, hall, 7, "s");
    const ford = {x: Math.floor(cols * 0.45), y: ry(Math.floor(cols * 0.45))};
    for ( let d = -1; d <= 1; d++ ) m[ford.y + d][ford.x] = T.shallow;
    const fort = {x: Math.floor(cols * 0.3), y: rows - 5};
    return {m, sites: [{x: 1, y: ry(1) - 4}, ...gates.slice(1, 4)], roads: "path",
      named: {"the hall of judgement": hall, "a ferry over the river of the dead": {x: ford.x, y: ford.y - 2}, "Amenti's hidden fortress": fort}};
  },

  // The Pit (Demon: The Fallen): a rim of rock round nothing, a plinth at the centre where a House's elders hang chained,
  // chains slung from the rim to the plinth (some broken), the Creator's wall closing one side, the broken gate above.
  "chained-pit"(rand, cols, rows) {
    const m = grid(cols, rows, T.void), c = centreOf(cols, rows), R = Math.min(c.x, c.y) - 1;
    for ( let y = 0; y < rows; y++ ) for ( let x = 0; x < cols; x++ ) { const d = Math.hypot((x - c.x) * 0.8, y - c.y); if ( d > R - 3 ) m[y][x] = d > R ? T.solid : T.ground; }
    disc(m, c.x, c.y, 3, T.ground);
    const n = 6, chains = [];
    for ( let k = 0; k < n; k++ ) {
      const a = k / n * Math.PI * 2 + rand() * 0.3, e = {x: c.x + Math.cos(a) * (R - 2) / 0.8, y: c.y + Math.sin(a) * (R - 2)};
      line(m, {x: c.x + Math.cos(a) * 2.5, y: c.y + Math.sin(a) * 2.5}, e, T.path);
      if ( k % 3 === 2 ) { const mid = {x: Math.round(c.x + Math.cos(a) * R * 0.45 / 0.8), y: Math.round(c.y + Math.sin(a) * R * 0.45)}; if ( inB(m, mid.x, mid.y) ) m[mid.y][mid.x] = T.void; } // a broken chain
      chains.push(clampP(cols, rows, e, 1));
    }
    // The Creator's wall: one side of the rim thickened to sheer rock
    for ( let y = 0; y < rows; y++ ) for ( let x = Math.floor(cols * 0.82); x < cols; x++ ) if ( m[y][x] === T.ground && rand() < 0.8 ) m[y][x] = T.solid;
    const gate = {x: c.x, y: Math.max(1, Math.round(c.y - R + 1.5))};
    rect(m, gate.x - 2, gate.y - 1, 5, 1, T.solid); m[gate.y - 1][gate.x + 1] = T.ground;
    return {m, sites: [{x: c.x, y: rows - 2}, ...chains], roads: null,
      named: {"a House's chained elders": c, "a broken gate": {x: gate.x, y: gate.y}, "the Creator's wall": {x: Math.floor(cols * 0.8) - 1, y: c.y}}};
  }
};
