/**
 * WoDX Otherworlds 0.21.0 (B2556 to B2559), 0.22.0 (B2630: the catalogue's ways in and out and its located dangers are places too): a coarse map of each realm past the near worlds, the way the world map
 * shows the Earth. Each of the 34 realms in realm-maps-rules.mjs gets one map of 200 by 110 squares, made from a
 * skeleton written for it (one of eleven plans, with the realm's own landmarks from the books placed on it) and
 * filled in from a seed. A realm's redraw rule says when the seed changes: never, after each Great Maelstrom, each
 * season, on every visit, or once for each realm of its kind. On the map a journey between two places has a time,
 * any square can be looked at closer, and places stay hidden until the chronicle has found them.
 * The landmarks and what each realm is come from the books (the refs in realm-maps-rules.mjs). Where the places lie,
 * how the land runs between them and every travel time are WoDX's own: the books give no maps and no distances.
 * Pure rules, no Foundry.
 */
import {REALMS, realmEra} from "./realm-maps-rules.mjs";
import {PLACES, LAYOUT, CHANGE} from "./realm-places.mjs";

export const W = 200, H = 110;
const cx = W / 2, cy = H / 2;
export const hash = (x, y, s) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const sm = t => t * t * (3 - 2 * t);
const vn = (x, y, s) => { const x0 = Math.floor(x), y0 = Math.floor(y), fx = sm(x - x0), fy = sm(y - y0); const a = hash(x0, y0, s), b = hash(x0 + 1, y0, s), c = hash(x0, y0 + 1, s), d = hash(x0 + 1, y0 + 1, s); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; };
const fbm = (x, y, s, o = 4) => { let v = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { v += a * vn(x * f, y * f, s + i * 17); n += a; a *= 0.5; f *= 2; } return v / n; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"})[c]);
const R = (x, y) => Math.hypot((x - cx) / 1.7, y - cy), A = (x, y) => Math.atan2(y - cy, (x - cx) / 1.7);
const ringPts = (n, r, a0 = 0, s = 0) => Array.from({length: n}, (_, i) => { const a = a0 + i * 2 * Math.PI / n + (hash(i, 5, s) - .5) * 0.5, rr = r * (0.85 + hash(i, 6, s) * 0.3); return [cx + Math.cos(a) * rr * 1.7, cy + Math.sin(a) * rr]; });
const scatter = (n, s, pad = 14) => Array.from({length: n}, (_, i) => [pad + hash(i, 1, s) * (W - 2 * pad), pad * 0.7 + hash(i, 2, s) * (H - 1.4 * pad)]);
const blob = (x, y, p, r, s, wob = 0.9) => Math.hypot((x - p[0]) / 1.4, y - p[1]) < r * (1 + (fbm(x / 5, y / 5, s) - .5) * wob);
const wavy = (a, b, s, wob = 4, n = 30) => Array.from({length: n + 1}, (_, i) => { const t = i / n, k = Math.sin(t * Math.PI); return [a[0] + (b[0] - a[0]) * t + (fbm(t * 3, s, s) - .5) * wob * 2 * k, a[1] + (b[1] - a[1]) * t + (fbm(t * 3, s + 9, s) - .5) * wob * 2 * k]; });

/* The eleven plans: each returns {ground(x, y) (one letter), spots (where places can stand), paths (roads drawn over the ground)} */
const ARCH = {
  // open void or sea with islands; centre: a larger isle at the heart
  isles({s, n = 9, centre = false, big = 5, bands = true}) {
    const pts = [...ringPts(Math.ceil(n * 0.6), 40, 0.3, s), ...ringPts(Math.floor(n * 0.4), 22, 1.2, s + 1)];
    const ground = (x, y) => { if (centre && blob(x, y, [cx, cy], 8, s + 2)) return R(x, y) < 3 ? "c" : "a";
      for (let i = 0; i < pts.length; i++) if (blob(x, y, pts[i], big * (0.7 + hash(i, 9, s) * 0.7), s + 3 + i)) return i % 3 === 2 ? "b" : "a";
      const f = fbm(x / 20, y / 20, s); if (bands && Math.sin(A(x, y) * 3 + R(x, y) / 5 + f * 6) > 0.74) return "w"; return f > 0.56 ? "u" : "v"; };
    return {ground, spots: [[cx, cy], ...pts], paths: centre ? pts.slice(0, 5).map((p, i) => ({pts: wavy([cx, cy], p, s + i, 4)})) : []};
  },
  // one land with biomes; sea or mist around it; optional river and a town
  land({s, sea = true, size = 56, river = false}) {
    const h = (x, y) => fbm(x / 26, y / 26, s, 5) - (sea ? R(x, y) / size : 0) + (sea ? 0.42 : 0.1);
    const rv = river ? wavy([10, cy + 20], [W - 10, cy - 20], s + 4, 14, 60) : null;
    const ground = (x, y) => { const e = h(x, y); if (sea && e < 0.34) return e < 0.27 ? "v" : "u";
      if (rv) for (const p of rv) if (Math.abs(x - p[0]) < 2 && Math.abs(y - p[1]) < 1.4) return "r";
      if (e > (sea ? 0.74 : 0.8)) return "m"; const wet = fbm(x / 16, y / 16, s + 50), k = fbm(x / 30, y / 30, s + 90);
      return wet > 0.6 ? "c" : wet < 0.38 ? "d" : k > 0.52 ? "a" : "b"; };
    const spots = []; for (let i = 0; spots.length < 8 && i < 400; i++) { const p = [20 + hash(i, 1, s + 7) * (W - 40), 14 + hash(i, 2, s + 7) * (H - 28)]; const g = ground(Math.round(p[0]), Math.round(p[1])); if (!"vum".includes(g) && spots.every(q => Math.hypot(q[0] - p[0], q[1] - p[1]) > 26)) spots.push(p); }
    return {ground, spots, paths: rv ? [] : []};
  },
  // a spiral of coils with a heart
  spiral({s, coils = 6, wall = true}) {
    const step = 54 / coils;
    const ground = (x, y) => { const r = R(x, y), n = fbm(x / 9, y / 9, s); if (r < 3) return "c"; if (r > 56 + n * 6) return "v";
      const t = r / step + A(x, y) / (2 * Math.PI) + n * 0.25, turn = ((t % 1) + 1) % 1; if (wall && turn < 0.13) return "w"; if (fbm(x / 3, y / 3, s + 9) > 0.84) return "b";
      return r < 19 ? "a" : r < 38 ? "d" : "m"; };
    const spots = [[cx, cy], ...Array.from({length: 6}, (_, i) => { const r = 12 + i * 8, a = i * 2.1 + 0.6; return [cx + Math.cos(a) * r * 1.7, cy + Math.sin(a) * r]; })];
    return {ground, spots, paths: []};
  },
  // rings round a centre
  rings({s, n = 5, gaps = true}) {
    const ground = (x, y) => { const r = R(x, y) + (fbm(x / 10, y / 10, s) - .5) * 5; if (r < 6) return r < 2.5 ? "c" : "a"; if (r > 54) return "v";
      const k = Math.floor((r - 6) / (48 / n)), f = ((r - 6) % (48 / n)) / (48 / n); if (f < 0.14) return gaps && Math.abs(Math.sin(A(x, y) * (2 + k) + k)) < 0.1 ? "u" : "w";
      if (fbm(x / 3, y / 3, s + 9) > 0.85) return "b"; return "adm"[k % 3]; };
    const spots = [[cx, cy], ...Array.from({length: 6}, (_, i) => { const r = 14 + i * 7, a = i * 1.9 + 0.3; return [cx + Math.cos(a) * r * 1.7, cy + Math.sin(a) * r]; })];
    return {ground, spots, paths: []};
  },
  // a great city: streets and districts; web: radial; isle: on an island in a sea
  city({s, web = false, isle = false, rails = false, wallr = 44}) {
    const ground = (x, y) => { const r = R(x, y) + (fbm(x / 8, y / 8, s) - .5) * 8; if (r > wallr + 2) return isle ? (fbm(x / 18, y / 18, s + 5) > 0.55 ? "u" : "v") : (fbm(x / 6, y / 6, s + 5) > 0.7 && r < wallr + 16 ? "d" : "v");
      if (r > wallr) return "w"; if (r < 3) return "c";
      if (web) { if (Math.abs(((A(x, y) / (2 * Math.PI) * 12) % 1 + 1) % 1 - .5) > 0.46 || Math.abs((r / 7) % 1 - .5) > 0.44) return "r"; }
      else if (x % 9 === 0 || y % 7 === 0) return "r";
      if (rails && (Math.abs(y - cy - Math.sin(x / 14) * 9) < 0.8 || Math.abs(x - cx - Math.sin(y / 10) * 14) < 0.8)) return "u";
      const d = fbm(x / 14, y / 14, s + 20); return fbm(x / 2.5, y / 2.5, s + 9) > 0.8 ? "b" : d > 0.6 ? "m" : d < 0.4 ? "d" : "a"; };
    const spots = [[cx, cy], ...ringPts(6, wallr * 0.55, 0.5, s)];
    return {ground, spots, paths: []};
  },
  // tunnels through the solid dark
  maze({s, wide = 0.035, rooms = 7}) {
    const pts = scatter(rooms, s);
    const ground = (x, y) => { for (let i = 0; i < pts.length; i++) if (blob(x, y, pts[i], 4, s + i)) return i % 3 ? "a" : "b";
      const a = Math.abs(fbm(x / 13, y / 13, s, 3) - .5), b = Math.abs(fbm(x / 9, y / 9, s + 31, 3) - .5); if (a < wide) return "r"; if (b < wide * 0.7) return "u";
      return fbm(x / 20, y / 20, s + 60) > 0.6 ? "w" : "v"; };
    return {ground, spots: pts, paths: []};
  },
  // a patchwork of lands with mist between; path: one road across
  patch({s, n = 40, path = true, kinds = "abcdm"}) {
    const sites = Array.from({length: n}, (_, i) => [hash(i, 1, s) * W, hash(i, 2, s) * H, kinds[Math.floor(hash(i, 3, s) * kinds.length)]]);
    const road = path ? Array.from({length: 61}, (_, i) => { const t = i / 60; return [6 + t * (W - 22), cy + Math.sin(t * 5.2) * 22 + (fbm(t * 4, 3, s) - .5) * 12]; }) : null;
    const ground = (x, y) => { const wx = x + (fbm(x / 9, y / 9, s) - .5) * 14, wy = y + (fbm(x / 9, y / 9, s + 4) - .5) * 14; let b = null, bd = 1e9, b2 = 1e9;
      for (const q of sites) { const d = Math.hypot(wx - q[0], wy - q[1]); if (d < bd) { b2 = bd; bd = d; b = q; } else if (d < b2) b2 = d; }
      if (road) { let m = 1e9; for (const p of road) m = Math.min(m, Math.hypot(x - p[0], y - p[1])); if (m > 40 + fbm(x / 10, y / 10, s + 30) * 20 || x / W > 0.88 + (fbm(x / 12, y / 12, s + 20) - .5) * 0.16) return fbm(x / 5, y / 5, s + 40) > 0.62 ? "u" : "v"; }
      return b2 - bd < 1.3 ? "w" : b[2]; };
    const spots = road ? [road[0], road[60], road[30], ...sites.filter(q => q[0] > 30 && q[0] < W - 50 && q[1] > 14 && q[1] < H - 14).slice(0, 5)] : sites.filter(q => q[0] > 24 && q[0] < W - 40 && q[1] > 12 && q[1] < H - 12).filter((q, i, a) => a.slice(0, i).every(o => Math.hypot(o[0] - q[0], o[1] - q[1]) > 28)).slice(0, 7);
    return {ground, spots, paths: road ? [{pts: road, w: 4, dash: "0"}] : []};
  },
  // lines of works across a broken land
  lines({s}) {
    const ground = (x, y) => { const off = (fbm(x / 30, y / 30, s) - .5) * 30, t = ((y + off) / 11) % 1; if (Math.abs(t - .5) < 0.07 && fbm(x / 7, y / 7, s + 3) > 0.35) return "r";
      if (fbm(x / 3, y / 3, s + 9) > 0.8) return "b"; const d = fbm(x / 16, y / 16, s + 20); return d > 0.62 ? "m" : d < 0.36 ? "c" : fbm(x / 8, y / 8, s + 40) > 0.55 ? "a" : "d"; };
    return {ground, spots: scatter(7, s + 3, 22).filter((q, i, a) => a.slice(0, i).every(o => Math.hypot(o[0] - q[0], o[1] - q[1]) > 28)), paths: []};
  },
  // a grid of sectors joined by straight ways
  grid({s, cell = 18}) {
    const ground = (x, y) => { const gx = Math.floor(x / cell), gy = Math.floor(y / cell), fx = x % cell, fy = y % cell, on = hash(gx, gy, s) > 0.3;
      if ((fy === Math.floor(cell / 2) || fx === Math.floor(cell / 2)) ) return "r"; if (!on || fx < 3 || fy < 3 || fx > cell - 4 || fy > cell - 4) return fbm(x / 12, y / 12, s) > 0.6 ? "u" : "v";
      const k = hash(gx, gy, s + 5); return fbm(x / 2, y / 2, s + 9) > 0.82 ? "b" : k > 0.75 ? "m" : k > 0.5 ? "d" : k > 0.2 ? "a" : "c"; };
    const spots = []; for (let gy = 0; gy < Math.floor(H / cell); gy++) for (let gx = 1; gx < Math.floor(W / cell) - 2; gx++) { const p = [gx * cell + cell / 2 + 2, gy * cell + cell / 2 + 2]; if (hash(gx, gy, s) > 0.3 && spots.length < 7 && spots.every(q => Math.hypot(q[0] - p[0], (q[1] - p[1]) * 2) > 46)) spots.push(p); }
    return {ground, spots, paths: []};
  },
  // a dry land with one river through it, east to west
  river({s}) { const base = ARCH.land({s, sea: false, river: true}); return base; },
  // a ledge country above a fall
  edge({s}) {
    const line = x => cy + Math.sin(x / 26 + s) * 14 + (fbm(x / 12, 3, s) - .5) * 18;
    const ground = (x, y) => { const d = y - line(x); if (d > 0) { if (d < 2.5) return "w"; if (fbm(x / 5, y / 5, s + 3) > 0.74 && d < 30) return "b"; return fbm(x / 22, y / 22, s + 8) > 0.55 ? "u" : "v"; }
      if (Math.abs(fbm(x / 10, y / 10, s + 31, 3) - .5) < 0.03) return "r"; const k = fbm(x / 18, y / 18, s + 20); return k > 0.62 ? "m" : k < 0.4 ? "d" : "a"; };
    const spots = Array.from({length: 6}, (_, i) => { const x = 22 + i * 30; return [x, line(x) + (i % 2 ? 9 : -9)]; });
    return {ground, spots, paths: []};
  }
};

/* One entry for each realm: its plan, the plan's options, its colours (letter: [colour, what it is]), its redraw rule in words and what is WoDX's own. */
export const SPEC = {
  aetherial: {arch: "isles", o: {n: 10, centre: true, bands: false}, pal: {v: ["#05060f", "the night sky"], u: ["#0b0e22", "star fields"], a: ["#8f98b8", "a star spirit's perch"], b: ["#3a2a3a", "the Wyrm Reaches"], c: ["#e6e2c8", "Phoebe's light"]}, reseed: "Fixed: the sky turns, but the map does not change.", ours: "Where each perch hangs."},
  "arcadia-gateway": {arch: "land", o: {sea: false}, pal: {a: ["#23452c", "deep wood"], b: ["#2f5636", "glades"], c: ["#3d5f58", "gardens gone wild"], d: ["#5a5a3a", "meadow"], m: ["#6a6470", "ruins and standing stones"]}, reseed: "Fixed land; palaces empty or lived in by the age.", ours: "The lie of the land."},
  atrocity: {arch: "maze", o: {rooms: 8}, pal: {v: ["#120a0a", "barren ground"], w: ["#1e1010", "ash"], r: ["#5a3a34", "the ways between"], u: ["#3a2020", "ditches"], a: ["#7a6a5a", "a yard or camp"], b: ["#8a2a20", "a replayed horror"]}, reseed: "New yards are added as each age adds its horrors; old ones stay.", ours: "The plan of the yards."},
  battleground: {arch: "lines", o: {}, pal: {r: ["#6a5a48", "lines and earthworks"], b: ["#8a3a22", "a battle in full cry"], m: ["#4a4640", "broken hills"], c: ["#2a2e2a", "mud and craters"], a: ["#3c3a2c", "trampled field"], d: ["#4c4430", "burnt ground"]}, reseed: "The lines move with each visit; the works change with the age (camps, earthworks, trenches).", ours: "Where the lines run."},
  cyberrealm: {arch: "city", o: {web: true, wallr: 48}, pal: {v: ["#04060a", "the dark beyond"], d: ["#10202a", "outlying webs"], w: ["#1a3a4a", "the city's edge"], r: ["#39c0d0", "web strands"], a: ["#16242e", "towers"], m: ["#22384a", "glass towers"], b: ["#d0f0ff", "a Pattern Spider nest"], c: ["#ffffff", "the hub"]}, reseed: "Fixed; it grows from a small walled city to one huge web by the age.", ours: "The number of strands."},
  "dream-zone": {arch: "patch", o: {n: 34, path: false}, pal: {a: ["#3a3566", "a dream of houses"], b: ["#24506a", "a dream of water"], c: ["#5a3a5a", "a dream of falling"], d: ["#6a5a34", "a dream of school and work"], m: ["#2a5a44", "a dream of wild places"], w: ["#0c0a16", "between dreams"]}, reseed: "A new map every night: it is built from the dreams of the age.", ours: "The kinds of dream."},
  erebus: {arch: "rings", o: {n: 4, gaps: true}, pal: {v: ["#0a0606", "the dark rock"], w: ["#c9c9d2", "molten silver"], u: ["#7a6a5a", "a ford"], a: ["#4a2a1c", "chambers of atonement"], d: ["#5a3020", "burning ground"], m: ["#3a2420", "caverns"], b: ["#e08a2a", "a purifying fire"], c: ["#fff0c0", "the Crucible"]}, reseed: "Fixed in every age.", ours: "The rings; the books give the Crucible and the silver."},
  flux: {arch: "isles", o: {n: 14, bands: true, big: 6}, pal: {v: ["#101826", "unformed"], u: ["#1a2a3a", "half formed"], w: ["#6a3a7a", "a tide of change"], a: ["#3a6a5a", "ground, for now"], b: ["#7a6a3a", "a Wyld well"]}, reseed: "A new map on every visit: nothing here stays.", ours: "Everything but the rule that it changes."},
  legendary: {arch: "land", o: {sea: false}, pal: {a: ["#2a4a2e", "the old forest"], b: ["#3a5a34", "heroes' country"], c: ["#2a4444", "fens"], d: ["#5a5234", "fields of legend"], m: ["#5a5660", "barrows and high places"]}, reseed: "Fixed land; it darkens by the age, and a shard of Malfeas leaks in near the end.", ours: "The lie of the land."},
  malfeas: {arch: "spiral", o: {coils: 6}, pal: {v: ["#020203", "nothing"], w: ["#0b0b0d", "wall of the spiral"], a: ["#641a1a", "inner coils"], d: ["#47291a", "middle coils"], m: ["#2a2f1c", "outer coils"], b: ["#9aa62a", "pits and towers"], c: ["#d8301a", "the castle over the pit"]}, reseed: "Fixed; factories and pipelines join the pits as industry grows.", ours: "The number of coils."},
  pangaea: {arch: "land", o: {sea: true}, pal: {v: ["#0a1624", "the world sea"], u: ["#11283a", "shallows"], a: ["#1c4028", "deep forest"], b: ["#2b4a2e", "wooded land"], c: ["#1f3a3a", "marsh"], d: ["#4c5630", "open plain"], m: ["#4a4658", "peaks"]}, reseed: "Fixed: the same in every age.", ours: "That it is one land in a sea."},
  scar: {arch: "city", o: {rails: true, wallr: 50}, pal: {v: ["#0a0a0a", "wasteland"], d: ["#2a2420", "slag"], w: ["#3a3028", "the yards' edge"], r: ["#1a1614", "alleys"], u: ["#b05a2a", "the black train's rails"], a: ["#3a3230", "factories"], m: ["#4a3a30", "sweatshops"], b: ["#8a8a80", "smokestacks"], c: ["#5a4a40", "a slag mountain"]}, reseed: "Fixed; from a few forges to the horizon by the age.", ours: "The street plan."},
  "summer-country": {arch: "land", o: {sea: false}, pal: {a: ["#2a5a30", "green wood"], b: ["#3a6a38", "orchard country"], c: ["#2a5450", "swamp nurseries"], d: ["#6a7a3a", "flowering meadow"], m: ["#6a7a6a", "gentle hills"]}, reseed: "Fixed in every age.", ours: "The lie of the land."},
  wolfhome: {arch: "land", o: {sea: false}, pal: {a: ["#2a4a2a", "the Countryside's wood"], b: ["#4a5a30", "farmland"], c: ["#3a5a4a", "hedgerow country"], d: ["#6a6a4a", "the Town's edge"], m: ["#6a6a70", "the Town"]}, reseed: "Fixed land; the Town grows from a market town to suburbs by the age.", ours: "The lie of the land."},
  "umbral-abyss": {arch: "edge", o: {}, pal: {v: ["#000000", "the fall"], u: ["#07070c", "deeper dark"], w: ["#6a6a78", "the lip"], b: ["#3a3a4a", "a ledge"], r: ["#5a5a50", "cavern ways"], a: ["#2a2a30", "bare rock"], d: ["#22222a", "scree"], m: ["#3a3640", "crags"]}, reseed: "Fixed.", ours: "The line of the lip."},
  "horizon-realm": {arch: "isles", o: {n: 5, centre: true, bands: false, big: 6}, pal: {v: ["#080a18", "the Horizon"], u: ["#10142a", "starry void"], a: ["#3a5a3a", "the realm's grounds"], b: ["#5a5a7a", "an outlying holding"], c: ["#e0d8a0", "the Chantry house"]}, reseed: "One map for each realm: every Horizon Realm is its own small world.", ours: "The shape of the grounds."},
  "shade-realm": {arch: "isles", o: {n: 8, centre: true, bands: true}, pal: {v: ["#06060c", "the Horizon"], u: ["#0e0e1a", "shadow"], w: ["#2a2a4a", "an overlap zone"], a: ["#3a3a56", "the planet's shadow"], b: ["#5a4a6a", "a portal's island"], c: ["#b0b0d0", "the way to the Shard"]}, reseed: "One map for each of the nine.", ours: "The islands' places."},
  "shard-realm": {arch: "land", o: {sea: true, size: 60}, pal: {v: ["#05050a", "the void"], u: ["#15152a", "the edge of the Shard"], a: ["#5a4a6a", "crystal plain"], b: ["#4a5a7a", "canal country"], c: ["#3a6a7a", "glassy scar"], d: ["#7a6a5a", "dry plain"], m: ["#8a8aa0", "peaks"]}, reseed: "One map for each Shard.", ours: "The lie of the land."},
  "paradox-realm": {arch: "rings", o: {n: 6, gaps: true}, pal: {v: ["#08040c", "outside the bubble"], w: ["#c0a0e0", "a wall of the riddle"], u: ["#ffe9a0", "a door"], a: ["#3a2a4a", "inner rooms"], d: ["#2a3a4a", "middle rooms"], m: ["#4a2a3a", "outer rooms"], b: ["#e06a8a", "the Effect turned back"], c: ["#ffffff", "the riddle's heart"]}, reseed: "A new map for every bubble.", ours: "The nesting."},
  "deep-umbra": {arch: "isles", o: {n: 12, bands: false, big: 3.5}, pal: {v: ["#010103", "the Void"], u: ["#07070f", "etherspace"], a: ["#5a5a66", "a drifting rock"], b: ["#6a2a3a", "a Nephandi Labyrinth"]}, reseed: "Endless: a new map for each stretch crossed.", ours: "Everything but what drifts there."},
  "digital-web": {arch: "grid", o: {cell: 18}, pal: {v: ["#02060a", "unformed Pattern"], u: ["#061018", "static"], r: ["#2ad0a0", "a data highway"], a: ["#103a4a", "an open sector"], c: ["#0a2a2a", "a private sector"], d: ["#3a1a4a", "a Virtual Adept chantry"], m: ["#5a1a1a", "a restricted Technocracy zone"], b: ["#e0ffe0", "an icon"]}, reseed: "Sectors are added as the Net grows; closed before 1990.", ours: "The grid of sectors."},
  autochthonia: {arch: "grid", o: {cell: 14}, pal: {v: ["#0a0a0c", "the machine's body"], u: ["#141418", "conduits"], r: ["#b08a3a", "ways of brass"], a: ["#3a3a40", "machine halls"], c: ["#2a3038", "forges"], d: ["#4a4030", "engine decks"], m: ["#5a5a66", "the great computer's banks"], b: ["#e0c060", "a guardian engine"]}, reseed: "Fixed; no way in before the Convention finds it.", ours: "The plan of the decks."},
  tempest: {arch: "isles", o: {n: 9, centre: true}, pal: {v: ["#141a26", "the Tempest"], u: ["#1d2738", "calmer water"], w: ["#3a2a4a", "the Maelstrom"], a: ["#4b4f5c", "an island in the storm"], b: ["#000000", "a Nihil"], c: ["#c9b37a", "Stygia"]}, reseed: "A new map after each Great Maelstrom; the byways hold where the dead agree on them.", ours: "The ring of islands."},
  stygia: {arch: "city", o: {isle: true, wallr: 40}, pal: {v: ["#101622", "the Sea of Shadows"], u: ["#182234", "harbour water"], w: ["#8a8a92", "the walls"], r: ["#1a1a20", "streets"], a: ["#4a4a54", "the city"], m: ["#5a5a68", "a Legion's citadel"], d: ["#6a4a3a", "Nhudri's forges"], b: ["#9a9aa8", "towers"], c: ["#e0d8c0", "the Onyx Tower"]}, reseed: "Fixed; who rules it changes with the age.", ours: "The street plan."},
  labyrinth: {arch: "maze", o: {rooms: 9, wide: 0.04}, pal: {v: ["#030303", "solid dark"], w: ["#0c0a10", "old stone"], r: ["#4a3a4a", "tunnels"], u: ["#3a4a3a", "deeper tunnels"], a: ["#6a2a4a", "a Spectre hive"], b: ["#8a8a6a", "a Zone, untouched by time"]}, reseed: "A new map in the years of a Great Maelstrom.", ours: "Every tunnel."},
  "far-shores": {arch: "isles", o: {n: 13, bands: true, big: 4.5}, pal: {v: ["#141a26", "the Tempest"], u: ["#1d2738", "calmer water"], w: ["#3a2a4a", "storm bands"], a: ["#3a6a5a", "an island paradise"], b: ["#7a3a2a", "an island Hell"]}, reseed: "A new map after each Great Maelstrom; islands are lost after the Sixth.", ours: "Which island is which."},
  "dark-kingdom": {arch: "city", o: {isle: true, wallr: 34}, pal: {v: ["#141a26", "the Tempest"], u: ["#1d2738", "coastal water"], w: ["#7a6a4a", "the walls"], r: ["#1a1814", "streets"], a: ["#4a4034", "the city of the dead"], m: ["#5a4a3a", "tomb quarters"], d: ["#3a4a3a", "a market of the dead"], b: ["#9a8a6a", "towers"], c: ["#e0c070", "the throne of the Kingdom"]}, reseed: "One map for each Dark Kingdom (Jade, Ivory, Obsidian and others).", ours: "The street plan."},
  enoch: {arch: "city", o: {isle: true, wallr: 30}, pal: {v: ["#0c0a12", "the Tempest"], u: ["#16121e", "dark water"], w: ["#b08a4a", "the bronze gate's wall"], r: ["#141018", "streets"], a: ["#3a3040", "the re-made First City"], m: ["#4a3a4a", "the Aralu tombs"], d: ["#2a2a3a", "ruins"], b: ["#c0b0d0", "a spire"], c: ["#e8e0f0", "the heart of the city"]}, reseed: "Fixed.", ours: "The street plan."},
  "far-dreaming": {arch: "patch", o: {n: 40, path: true, kinds: "abcd"}, pal: {a: ["#3a2f5a", "a land of story"], b: ["#24506a", "a sea of dreams"], c: ["#2e5a3c", "a wood of story"], d: ["#6a4a2a", "a land of old tales"], w: ["#0e0a18", "between the lands"], u: ["#1c1030", "the Deep Dreaming"], v: ["#05030a", "beyond"]}, reseed: "A new map each season; the trod holds.", ours: "The kinds of land; that they grow stranger away from the trod."},
  "deep-dreaming": {arch: "spiral", o: {coils: 5, wall: false}, pal: {v: ["#030208", "the unknown"], a: ["#5a3a7a", "nearest Arcadia"], d: ["#3a2a5a", "dreams older than people"], m: ["#221a3a", "the outer deep"], b: ["#c0b0ff", "a dream given shape"], c: ["#ffffff", "the last gate"]}, reseed: "A new map on every visit.", ours: "The inward turn."},
  yomi: {arch: "rings", o: {n: 6, gaps: true}, pal: {v: ["#060202", "outer dark"], w: ["#1a0808", "walls between hells"], u: ["#c08a3a", "a gate"], a: ["#7a2a1a", "hells of fire"], d: ["#5a3a2a", "hells of labour"], m: ["#3a2a3a", "hells of cold"], b: ["#e0b040", "a Yama King's court"], c: ["#e0e0d0", "Ti Yu, the Earth Prison"]}, reseed: "Fixed in every age.", ours: "The number of rings."},
  "yellow-springs": {arch: "city", o: {wallr: 46}, pal: {v: ["#12100a", "the land of the dead"], d: ["#2a2414", "outlying fields"], w: ["#8a6a2a", "the walls"], r: ["#1a160e", "avenues"], a: ["#4a3a22", "wards"], m: ["#5a4426", "magistrates' halls"], b: ["#c0a050", "towers and gardens"], c: ["#f0d880", "the Jade Emperor's court"]}, reseed: "Fixed.", ours: "The street plan."},
  duat: {arch: "river", o: {}, pal: {r: ["#3a6a8a", "the river of the dead"], a: ["#5a4a34", "ash plain"], b: ["#6a5a3a", "dry land"], c: ["#4a4a3a", "reed banks"], d: ["#7a6a44", "dunes"], m: ["#5a4a4a", "tomb hills"]}, reseed: "Fixed.", ours: "The river's course."},
  "demon-abyss": {arch: "spiral", o: {coils: 5}, pal: {v: ["#000000", "the Creator's wall"], w: ["#101014", "chains and walls"], a: ["#3a1a2a", "the deepest prison"], d: ["#2a1a22", "the middle dark"], m: ["#1a141c", "the outer dark"], b: ["#7a6a8a", "a broken gate"], c: ["#b02a4a", "a House's chained elders"]}, reseed: "Fixed; sealed before 1999, broken after.", ours: "The turns of the pit."}
};
/* The realm's landmarks (by their place in the catalogue's list, or in words) for the plan's spots, in order; -1 leaves a spot empty. */
export const MARKS = {
  aetherial: [0, 1, 2, 3], "arcadia-gateway": [0, 1, 2, 3], atrocity: [0, 1, 2], battleground: [0, 1, 2], cyberrealm: [-1, 0, 1, 2, 3], "dream-zone": [0, 1, 2, 3], erebus: [0, 1, 2], flux: [-1, 0, 1, 2],
  legendary: [0, 1, 2, 3], malfeas: [0, 1, 2, 3], pangaea: [0, 1, 2, 3], scar: [1, 0, 2], "summer-country": [0, 1, 2], wolfhome: [0, 1, 2, 3], "umbral-abyss": [0, 1, 2], "horizon-realm": [0, 1, 2],
  "shade-realm": [2, 0, 1], "shard-realm": [0, 1, 2, 3], "paradox-realm": [0, 1], "deep-umbra": [-1, 0, 1, 2, 3], "digital-web": [0, 1, 2, 3], autochthonia: [0, 1, 2], tempest: ["Stygia", 0, 1, 2, 3, 4], stygia: [0, 1, 2, 3],
  labyrinth: [0, 1, 2], "far-shores": [-1, 0, 1, 2, 3], "dark-kingdom": [0, 1, 2], enoch: [6, 0, 1, 2, 3, 4, 5, 7], "far-dreaming": ["a trod from the Near Dreaming", "on to the Deep Dreaming", 1, 0, 2, 3], "deep-dreaming": [0, 1, 2], yomi: [0, 1, 2, 3], "yellow-springs": [0, 1, 2, 3], duat: [0, 1, 2], "demon-abyss": [1, 0, 2]
};

/* ------------------------------------------------------------------ */
/*  When a realm's map is made anew                                    */
/* ------------------------------------------------------------------ */

/** The redraw rules. fixed: one map for ever. maelstrom: a new one after each Great Maelstrom. season: a new one each season. visit: a new one on every visit. each: one for each realm of the kind, by its name. */
export const KINDS = {fixed: "The same in every age", maelstrom: "Made anew by each Great Maelstrom", season: "Made anew each season", visit: "Made anew on every visit", each: "One map for each realm of this kind"};
const KIND_OF = {battleground: "visit", flux: "visit", "deep-dreaming": "visit", "dream-zone": "visit", "paradox-realm": "visit", "deep-umbra": "visit",
  tempest: "maelstrom", labyrinth: "maelstrom", "far-shores": "maelstrom", "far-dreaming": "season",
  "horizon-realm": "each", "shade-realm": "each", "shard-realm": "each", "dark-kingdom": "each"};
export const kindOf = id => KIND_OF[id] ?? "fixed";
/** The first year of each Great Maelstrom after the First (the years realm-maps-rules.mjs uses). */
export const MAELSTROMS = [1347, 1600, 1916, 1945, 1999];
export const SEASONS = ["spring", "summer", "autumn", "winter"];
export const REALM_IDS = Object.keys(SPEC);
const textHash = t => { let h = 0; for ( const ch of String(t).trim().toLowerCase() ) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0; return (Math.abs(h) % 9000) + 1; };

/** Which making of the realm's map holds: 0 is the first. opts: {year, season (0 to 3), visit (a count), which (a name)}. */
export function turnOf(id, {year = 1197, season = 0, visit = 0, which = ""} = {}) {
  const kind = kindOf(id), y = Math.round(Number(year)) || 1197;
  if ( kind === "maelstrom" ) return MAELSTROMS.filter(m => y >= m).length;
  if ( kind === "season" ) return (y - 1197) * 4 + (Math.min(3, Math.max(0, Math.round(Number(season)) || 0)));
  if ( kind === "visit" ) return Math.max(0, Math.round(Number(visit)) || 0);
  if ( kind === "each" ) return String(which ?? "").trim() ? textHash(which) : 0;
  return 0;
}
/** The seed of a realm's map for the making that holds. */
export const seedOf = (id, opts = {}) => ((1197 + REALM_IDS.indexOf(id)) * 7 + 3 + turnOf(id, opts) * 1009) | 0;

/* ------------------------------------------------------------------ */
/*  Ground and how fast it is crossed                                  */
/* ------------------------------------------------------------------ */

/** For each plan: how fast each ground is crossed (1 is a steady pace, 0 cannot be crossed), the ground a forced way is cut as, and the days across the whole map at a steady pace. */
export const PLANS = {
  isles: {pace: {a: 1, b: 1, c: 1, u: 0.6, v: 0.5, w: 0.25}, days: 30},
  land: {pace: {a: 0.8, b: 1, c: 0.5, d: 1, m: 0.4, u: 0.6, v: 0.5, r: 0.6}, days: 24},
  river: {pace: {a: 0.8, b: 1, c: 0.5, d: 0.7, m: 0.4, r: 1.3}, days: 24},
  spiral: {pace: {a: 0.8, d: 0.8, m: 0.8, b: 0.5, c: 1, w: 0.1, v: 0}, cut: "b", days: 9},
  rings: {pace: {a: 0.8, d: 0.8, m: 0.8, b: 0.5, c: 1, u: 0.6, w: 0, v: 0}, cut: "u", days: 7},
  city: {pace: {r: 1, a: 0.6, m: 0.6, d: 0.6, b: 0.5, c: 1, u: 0.5, w: 0.2, v: 0.4}, days: 2},
  maze: {pace: {r: 1, u: 0.7, a: 0.8, b: 0.8, w: 0, v: 0}, cut: "r", days: 6},
  patch: {pace: {a: 0.8, b: 0.5, c: 0.7, d: 0.8, m: 0.5, w: 0.3, u: 0.25, v: 0}, cut: "w", days: 14},
  lines: {pace: {r: 1, a: 0.8, d: 0.7, c: 0.4, m: 0.5, b: 0.3}, days: 5},
  grid: {pace: {r: 1.5, a: 0.7, c: 0.7, d: 0.7, m: 0.7, b: 0.5, u: 0.2, v: 0.15}, days: 1},
  edge: {pace: {r: 1, a: 0.8, d: 0.6, m: 0.4, w: 0.5, b: 0.5, u: 0, v: 0}, cut: "b", days: 8}
};
/** Ground a named place of the books does not stand on while there is room elsewhere: open water, void and walls. */
const WET = "uvw";
/** A road drawn over the ground (a trod, a byway) is this much quicker than a steady pace. */
export const ROAD_PACE = 1.5;
/** Days across the whole map at a steady pace, where a realm differs from its plan. */
const DAYS = {stygia: 3, "digital-web": 0.5, cyberrealm: 1, pangaea: 40, "deep-umbra": 60, tempest: 40, "far-shores": 50, "horizon-realm": 3, "paradox-realm": 1, "dream-zone": 1, autochthonia: 6};
/** How far from a found place the map is known, in squares. */
export const SIGHT = 18;
export const SHROUD = "#04060a";

class Heap { constructor() { this.a = []; } get size() { return this.a.length; }
  push(k, v) { const a = this.a; let i = a.length; a.push([k, v]); while ( i > 0 ) { const p = (i - 1) >> 1; if ( a[p][0] <= a[i][0] ) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a, top = a[0], last = a.pop(); if ( a.length ) { a[0] = last; let i = 0; for ( ;; ) { const l = 2 * i + 1, r = l + 1; let m = i; if ( l < a.length && a[l][0] < a[m][0] ) m = l; if ( r < a.length && a[r][0] < a[m][0] ) m = r; if ( m === i ) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; } }

const STEPS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
/** Cheapest ways from one square over the whole map. cut: blocked ground may be crossed at this cost a square (to find where a way must be cut). Returns {dist, prev}. */
function spread(pace, from, {to = -1, cut = 0} = {}) {
  const dist = new Float64Array(W * H).fill(Infinity), prev = new Int32Array(W * H).fill(-1), heap = new Heap();
  dist[from] = 0; heap.push(0, from);
  while ( heap.size ) {
    const [d, i] = heap.pop();
    if ( d > dist[i] ) continue;
    if ( i === to ) break;
    const x = i % W, y = (i - x) / W;
    for ( let k = 0; k < (cut ? 4 : 8); k++ ) {
      const [dx, dy, len] = STEPS[k], nx = x + dx, ny = y + dy;
      if ( nx < 0 || ny < 0 || nx >= W || ny >= H ) continue;
      const j = ny * W + nx;
      let cost;
      if ( pace[j] > 0 && pace[i] > 0 ) {
        if ( k >= 4 && !(pace[y * W + nx] > 0 && pace[ny * W + x] > 0) ) continue;   // no squeezing between two blocked corners
        cost = len * 2 / (pace[i] + pace[j]);
      }
      else if ( cut ) cost = cut;
      else continue;
      if ( d + cost < dist[j] ) { dist[j] = d + cost; prev[j] = i; heap.push(d + cost, j); }
    }
  }
  return {dist, prev};
}

/* ------------------------------------------------------------------ */
/*  One realm's map                                                    */
/* ------------------------------------------------------------------ */

/** Dangers of the catalogue that are a state of the whole realm or of a person, not a spot on a map. */
const NOT_A_SPOT = ["a falling star", "a foreign wraith's suspicion", "a Castigator's notice", "a Nihil's pull", "a paradise that will not let go"];
/** The further places of a realm, from its catalogue entry: landmarks the plan has no spot for (["place", name]), the ways in and out it names (["way", name]) and the dangers that sit in one spot (["danger", name]). */
export function extrasOf(id) {
  const realm = REALMS[id], out = [];
  if ( !realm ) return out;
  for ( const l of realm.landmarks ) out.push(["place", l]);   // build() leaves out those the plan has already placed
  for ( const k of ["arrival", "back", "on"] ) if ( typeof realm.map?.[k] === "string" ) out.push(["way", realm.map[k]]);
  for ( const h of realm.hazards ?? [] ) if ( /^an? /.test(h) && !NOT_A_SPOT.includes(h) ) out.push(["danger", h]);
  // 0.23.0 (B2631): the named places of the book lookup, each with what it is and its page
  for ( const [name, what, ref] of PLACES[id] ?? [] ) out.push(["place", name.replace(/^The /, "the "), what, ref]);
  return out;
}

const made = new Map();
/**
 * The map of a realm for a year (and season, visit or name, by its redraw rule). Returns {id, label, line, world,
 * plan, kind, seed, turn, cells (H strings of W letters), pal {letter: colour}, legend [[colour, words]], places
 * [{i, x, y, kind (place, way or danger), name, label, what and ref for a place of the book lookup}], gate (the place a traveller is taken to know on arrival), paths, days, redraw, ours}, or null.
 */
export function build(id, opts = {}) {
  const spec = SPEC[id], realm = REALMS[id];
  if ( !spec || !realm ) return null;
  const year = Math.round(Number(opts.year)) || 1197, seed = seedOf(id, opts);
  const grow = id === "atrocity" ? {rooms: 5 + [1300, 1600, 1900, 1950].filter(y => year >= y).length} : {};
  const key = `${id}|${seed}|${JSON.stringify(grow)}`;
  if ( made.has(key) ) return made.get(key);
  const plan = PLANS[spec.arch], model = ARCH[spec.arch]({s: seed, ...spec.o, ...grow});
  const rows = [];
  for ( let y = 0; y < H; y++ ) { const line = new Array(W); for ( let x = 0; x < W; x++ ) line[x] = model.ground(x, y); rows.push(line); }
  const road = new Uint8Array(W * H);
  for ( const p of model.paths ) for ( const [px, py] of p.pts ) { const x = Math.round(px), y = Math.round(py); if ( x >= 0 && y >= 0 && x < W && y < H ) road[y * W + x] = 1; }
  const paceOf = () => { const pace = new Float32Array(W * H); for ( let y = 0; y < H; y++ ) for ( let x = 0; x < W; x++ ) { const i = y * W + x; pace[i] = Math.max(plan.pace[rows[y][x]] ?? 0, road[i] ? ROAD_PACE : 0); } return pace; };
  let pace = paceOf();
  // the places: the realm's landmarks on the plan's spots, each moved to the nearest ground that can be stood on
  const labels = (MARKS[id] ?? []).map(m => (typeof m === "string" ? m : m < 0 ? null : realm.landmarks[m] ?? null));
  const places = [];
  labels.forEach((label, n) => {
    const p = model.spots[n];
    if ( !label || !p ) return;
    let x = Math.min(W - 1, Math.max(0, Math.round(p[0]))), y = Math.min(H - 1, Math.max(0, Math.round(p[1])));
    if ( !(pace[y * W + x] > 0) ) {
      let best = null;
      for ( let r = 1; r < 40 && !best; r++ ) for ( let dy = -r; dy <= r; dy++ ) for ( let dx = -r; dx <= r; dx++ ) {
        const nx = x + dx, ny = y + dy;
        if ( Math.max(Math.abs(dx), Math.abs(dy)) !== r || nx < 0 || ny < 0 || nx >= W || ny >= H || !(pace[ny * W + nx] > 0) ) continue;
        const d = Math.hypot(dx, dy); if ( !best || d < best[2] ) best = [nx, ny, d];
      }
      if ( best ) [x, y] = best;
    }
    places.push({i: places.length, x, y, kind: "place", name: label, label: label[0].toUpperCase() + label.slice(1)});
  });
  // 0.22.0 (B2630): the ways in and out and the located dangers of the catalogue stand on the map too, on free ground away from the other places
  let tries = 0;
  for ( const [kind, name, what, ref] of extrasOf(id) ) {
    if ( places.some(p => p.name.toLowerCase() === name.toLowerCase()) ) continue;
    // a place of the books stands on firm ground (not open water, void or a wall) while the map has room; the room asked between places shrinks as tries pass
    for ( ; tries < 4000; tries++ ) {
      const x = Math.round(8 + hash(tries, 11, seed) * (W - 16)), y = Math.round(6 + hash(tries, 12, seed) * (H - 12)), apart = tries < 900 ? 15 : tries < 2200 ? 11 : 8;
      if ( !(pace[y * W + x] > 0) || (tries < 3200 && kind === "place" && what && WET.includes(rows[y][x])) || places.some(p => Math.hypot((p.x - x) / 1.4, p.y - y) < apart) ) continue;
      places.push({i: places.length, x, y, kind, name, label: name[0].toUpperCase() + name.slice(1), ...(what ? {what, ref} : {})});
      tries++;
      break;
    }
  }
  // every place can be reached from the first: where the ground shuts one off, a way is cut to it
  if ( plan.cut && places.length > 1 ) {
    const {dist, prev} = spread(pace, places[0].y * W + places[0].x, {cut: 40});
    let changed = false;
    for ( const p of places.slice(1) ) for ( let i = p.y * W + p.x; i >= 0 && Number.isFinite(dist[i]); i = prev[i] ) if ( !(pace[i] > 0) ) { rows[(i - i % W) / W][i % W] = plan.cut; changed = true; }
    if ( changed ) pace = paceOf();
  }
  const centred = ["spiral", "rings", "city"].includes(spec.arch) || (spec.arch === "isles" && spec.o.centre);
  const arrive = realm.map?.arrival ?? realm.map?.back ?? null, door = arrive ? places.findIndex(p => p.name === arrive) : -1;
  const gate = door >= 0 ? door : Math.min(places.length - 1, centred && places.length > 1 && typeof (MARKS[id] ?? [])[0] !== "undefined" && labels[0] ? 1 : 0);
  const seen = new Set(rows.flatMap(r => r));
  const out = {id, label: realm.label, line: realm.line, world: realm.world, plan: spec.arch, kind: kindOf(id), seed, turn: turnOf(id, opts),
    cells: rows.map(r => r.join("")), pal: Object.fromEntries(Object.entries(spec.pal).map(([k, v]) => [k, v[0]])), words: Object.fromEntries(Object.entries(spec.pal).map(([k, v]) => [k, v[1]])),
    legend: Object.entries(spec.pal).filter(([k]) => seen.has(k)).map(([, v]) => v), places, gate: Math.max(0, gate), paths: model.paths.map(p => ({pts: p.pts.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]), wide: !!p.w})),
    days: DAYS[id] ?? plan.days, redraw: spec.reseed, ours: spec.ours, layout: LAYOUT[id] ?? [], change: CHANGE[id] ?? []};
  Object.defineProperty(out, "pace", {value: pace, enumerable: false});
  if ( made.size > 24 ) made.delete(made.keys().next().value);
  made.set(key, out);
  return out;
}

/** The places the chronicle knows on a map: the arrival place and those it has found (a list of place numbers). */
export const knownPlaces = (map, found = []) => new Set([map.gate, ...(Array.isArray(found) ? found : []).filter(i => Number.isInteger(i) && i >= 0 && i < map.places.length)]);
/** A clean list of found places for a map. */
export const normFound = (map, list) => [...new Set((Array.isArray(list) ? list : []).map(Number).filter(i => Number.isInteger(i) && i >= 0 && i < map.places.length && i !== map.gate))].sort((a, b) => a - b);
/** Is the square within sight of a known place? */
export const inSight = (map, known, x, y) => [...known].some(i => { const p = map.places[i]; return Math.hypot((x - p.x) / 1.4, y - p.y) <= SIGHT; });

/** A time in plain words. */
export function timeWords(days) {
  if ( days < 1 ) { const h = Math.max(1, Math.round(days * 24)); return `about ${h} hour${h === 1 ? "" : "s"}`; }
  const d = days < 10 ? Math.round(days * 2) / 2 : Math.round(days);
  return `about ${d} day${d === 1 ? "" : "s"}`;
}

/**
 * A journey between two places of a map (by place number). known: a Set of place numbers, or null for the whole
 * map. Returns {from, to, hidden} when the far end is not yet found, {noWay} when no ground joins them, else
 * {from, to, days, squares, path [[x, y]], across [words of the ground most crossed]}.
 */
export function journey(map, from, to, {known = null} = {}) {
  const a = map.places[from], b = map.places[to];
  if ( !a || !b ) return null;
  if ( known && !known.has(to) ) return {from, to, hidden: true};
  if ( known && !known.has(from) ) return {from, to, hidden: true, start: true};
  if ( from === to ) return {from, to, days: 0, squares: 0, path: [[a.x, a.y]], across: []};
  const start = a.y * W + a.x, end = b.y * W + b.x, {dist, prev} = spread(map.pace, start, {to: end});
  if ( !Number.isFinite(dist[end]) ) return {from, to, noWay: true};
  const path = [], count = {};
  for ( let i = end; i >= 0; i = prev[i] ) { const x = i % W, y = (i - x) / W; path.push([x, y]); const g = map.cells[y][x]; count[g] = (count[g] ?? 0) + 1; }
  path.reverse();
  const across = Object.entries(count).sort((p, q) => q[1] - p[1]).slice(0, 2).filter(([, n]) => n >= path.length * 0.2).map(([g]) => map.words[g]);
  return {from, to, days: Math.round(dist[end] * map.days / W * 100) / 100, squares: path.length, path, across};
}

/** The lines the window shows under a map for a state {from, to, year} and a journey. */
export function lines(map, j, {year = 1197, future = false} = {}) {
  const out = [], era = realmEra(map.id, year, {future});
  if ( j && j.hidden ) out.push(j.start ? `${map.places[j.from].label} is not yet found.` : `${map.places[j.to].label} is not yet found: no journey can end there. Mark it under Found places when the chronicle finds it.`);
  else if ( j && j.noWay ) out.push(`No ground joins ${map.places[j.from].name} and ${map.places[j.to].name}.`);
  else if ( j && j.squares ) out.push(`From ${map.places[j.from].name} to ${map.places[j.to].name}: ${timeWords(j.days)}${j.across.length ? `, mostly across ${j.across.join(" and ")}` : ""}.`);
  for ( const p of j ? [map.places[j.from], map.places[j.to]] : [] ) if ( p?.what && !(j.hidden && p === map.places[j.start ? j.from : j.to]) ) out.push(`${p.label}: ${p.what} (${p.ref}).`);
  for ( const n of era?.notes ?? [] ) out.push(n);
  if ( era?.closed ) out.push("No way leads in this year.");
  out.push(map.redraw);
  return out;
}

/* ------------------------------------------------------------------ */
/*  A closer look at one square                                        */
/* ------------------------------------------------------------------ */

export const ZOOM = 16;
/** One square and its edges, ZOOM by ZOOM small squares, made from the square and its neighbours: the same every time. Returns {x, y, size, cells (strings), lands [[words, share]]}. */
export function closer(map, x, y) {
  const cells = [], count = {};
  for ( let j = 0; j < ZOOM; j++ ) {
    let line = "";
    for ( let i = 0; i < ZOOM; i++ ) {
      const u = x - 1 + (i + 0.5) * 3 / ZOOM, v = y - 1 + (j + 0.5) * 3 / ZOOM;
      const wx = Math.round(u + (vn(u * 3, v * 3, map.seed + 71) - 0.5) * 0.9), wy = Math.round(v + (vn(u * 3, v * 3, map.seed + 72) - 0.5) * 0.9);
      const g = map.cells[Math.min(H - 1, Math.max(0, wy))][Math.min(W - 1, Math.max(0, wx))];
      line += g; count[g] = (count[g] ?? 0) + 1;
    }
    cells.push(line);
  }
  const lands = Object.entries(count).sort((a, b) => b[1] - a[1]).map(([g, n]) => [map.words[g], Math.round(n * 100 / (ZOOM * ZOOM))]);
  return {x, y, size: ZOOM, cells, lands};
}

/* ------------------------------------------------------------------ */
/*  Pictures                                                           */
/* ------------------------------------------------------------------ */

const INK = "#dcd6c6";
/** The map as an SVG. known: a Set of place numbers (the rest is shrouded and its places are not shown), or null. path: a journey's path. */
export function svg(map, {cell = 4, known = null, path = null, title = null} = {}) {
  const top = 26, w = W * cell, out = [];
  const colour = (x, y) => (known && !inSight(map, known, x, y) ? SHROUD : map.pal[map.cells[y][x]]);
  for ( let y = 0; y < H; y++ ) { let x = 0; while ( x < W ) { const c = colour(x, y); let e = x + 1; while ( e < W && colour(e, y) === c ) e++; out.push(`<rect x="${x * cell}" y="${top + y * cell}" width="${(e - x) * cell}" height="${cell}" fill="${c}"/>`); x = e; } }
  const at = ([x, y], i) => `${i ? "L" : "M"}${(x + 0.5) * cell} ${top + (y + 0.5) * cell}`;
  if ( !known ) for ( const p of map.paths ) out.push(`<path d="${p.pts.map(at).join("")}" fill="none" stroke="#e6dcb0" stroke-width="${p.wide ? cell * 0.7 : cell * 0.45}" ${p.wide ? "" : 'stroke-dasharray="5 4" '}opacity="0.8"/>`);
  if ( path?.length > 1 ) out.push(`<path d="${path.map(at).join("")}" fill="none" stroke="#ffd060" stroke-width="${cell * 0.6}" stroke-linejoin="round" opacity="0.95"/>`);
  // each name goes beside its dot where it covers no other name: right or left first, then above or below
  const boxes = [], dots = [], names = [];
  for ( const p of map.places ) {
    if ( known && !known.has(p.i) ) continue;
    const x = (p.x + 0.5) * cell, y = top + (p.y + 0.5) * cell, left = p.x > W * 0.62, tw = p.label.length * 6.1, g = cell * 1.8;
    const spots = [[left ? -g - tw : g, -8], [left ? g : -g - tw, -8], [-tw / 2, -g - 13], [-tw / 2, g - 1], [left ? -g - tw : g, -20], [left ? -g - tw : g, 5]];
    const hits = ([dx, dy]) => { const bx = x + dx, by = y + dy; return bx < 2 || bx + tw > w - 2 || by < top || boxes.some(b => bx < b[0] + b[2] && b[0] < bx + tw && by < b[1] + 13 && b[1] < by + 13); };
    const [dx, dy] = spots.find(s => !hits(s)) ?? spots[0];
    boxes.push([x + dx, y + dy, tw]);
    dots.push(`<circle cx="${x}" cy="${y}" r="${cell}" fill="${p.kind === "danger" ? "#d8603a" : p.kind === "way" ? "#9ad0e8" : "#f0e6b8"}" stroke="#000" stroke-width="1"/>`);
    names.push(`<text x="${Math.round((x + dx) * 10) / 10}" y="${y + dy + 11}" font-size="12" fill="${INK}" stroke="#000" stroke-width="3" paint-order="stroke">${esc(p.label)}</text>`);
  }
  out.push(...dots, ...names);
  const shown = map.places.filter(p => !known || known.has(p.i));
  const legend = [...map.legend, ...(shown.some(p => p.kind === "way") ? [["#9ad0e8", "a way in or out"]] : []), ...(shown.some(p => p.kind === "danger") ? [["#d8603a", "a danger"]] : []), ...(known ? [[SHROUD, "not yet found"]] : [])];
  let lx = 8, ly = top + H * cell + 8;
  const key = [];
  for ( const [c, words] of legend ) { const need = 22 + words.length * 6.2; if ( lx + need > w - 4 && lx > 8 ) { lx = 8; ly += 17; } key.push(`<rect x="${lx}" y="${ly}" width="10" height="10" fill="${c}" stroke="${INK}" stroke-width="0.5"/><text x="${lx + 14}" y="${ly + 9}" font-size="11" fill="${INK}">${esc(words)}</text>`); lx += need; }
  const h = ly + 20;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="Georgia, serif"><rect width="${w}" height="${h}" fill="#000"/><text x="8" y="18" font-size="15" fill="${INK}">${esc(title ?? map.label)}</text>${out.join("")}${key.join("")}</svg>`;
}

/** The closer look as an SVG. */
export function closerSvg(map, view, {cell = 22} = {}) {
  const s = view.size * cell, out = [];
  for ( let j = 0; j < view.size; j++ ) for ( let i = 0; i < view.size; i++ ) out.push(`<rect x="${i * cell}" y="${j * cell}" width="${cell}" height="${cell}" fill="${map.pal[view.cells[j][i]]}"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" width="${s}" height="${s}"><rect width="${s}" height="${s}" fill="#000"/>${out.join("")}<rect x="${s / 3}" y="${s / 3}" width="${s / 3}" height="${s / 3}" fill="none" stroke="${INK}" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/></svg>`;
}
