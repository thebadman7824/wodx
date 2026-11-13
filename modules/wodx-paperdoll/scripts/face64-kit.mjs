/**
 * WoDX Paperdoll: a small drawing kit for face features (13 November 2026). Ben asked for many more features (100 for
 * anyone, 50 per line, 15 per clan, tribe, kith and the like) so that two faces seldom look alike. Each feature is a few
 * calls to these helpers, placed by named spots on the 64 pixel face that follow the face's own head shape.
 *
 * A feature may name a slot (eyes, brow, nose, lips, chin, neck, ears, head, hair, beard, cheekL, cheekR, foreL, foreR,
 * temples, skin, aura): the roller never gives a face two features in one slot.
 */
import {FEATURES, H} from "./face64-rules.mjs";
export {H};

export const {mix, glow, stamp, horn, inTri, headHw, CX, EYE_Y, MOUTH_Y} = H;
export const EYES = [[26, -1], [38, 1]];
export const isSkin = (F, x, y) => F.kindAt(x, y) === "skin";
/** Paint only on bare skin (face or neck). */
export const paint = (F, x, y, col) => { const k = F.kindAt(x, y); if ( k === "skin" || k === "neck" ) F.put(x, y, col); };
/** Blend into skin. */
export const tint = (F, x, y, col, a) => { if ( isSkin(F, x, y) ) F.put(x, y, mix(F.get(x, y), col, a)); };
/** Paint anywhere already drawn (skin, hair, cloth). */
export const over = (F, x, y, col) => { if ( F.has(x, y) ) F.put(x, y, col); };
export const hw = (c, y) => Math.round(headHw(y, c.shape));
export const chin = c => c.S.chin;
export const pale = c => mix(c.R.hi, [240, 214, 206], 0.55);

/** A line of pixels from (x0, y0) to (x1, y1); fn(x, y, i) draws each. */
export function line(x0, y0, x1, y1, fn) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for ( let i = 0; i <= n; i++ ) fn(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), i);
}
/** An ellipse of pixels; fn(x, y, dx, dy). */
export function blob(cx, cy, rx, ry, fn) {
  for ( let dx = -rx; dx <= rx; dx++ ) for ( let dy = -ry; dy <= ry; dy++ )
    if ( (dx / (rx + 0.5)) ** 2 + (dy / (ry + 0.5)) ** 2 <= 1 ) fn(cx + dx, cy + dy, dx, dy);
}
/** Small pictures for tattoos, brands and pendants: rows of a 5 wide grid, "#" drawn. */
export const GLYPHS = {
  dot: ["#"], cross: [".#.", "###", ".#."], latin: [".#.", "###", ".#.", ".#."], ankh: [".#.", "#.#", ".#.", "###", ".#."],
  star: ["#.#", ".#.", "#.#"], ring: ["###", "#.#", "###"], crescent: [".##", "#..", "#..", ".##"], tri: [".#.", "#.#", "###"],
  diamond: [".#.", "#.#", ".#."], spiral: ["####", "#..#", "#.##", "#..."], eye: [".###.", "#.#.#", ".###."], bar: ["###"],
  chevron: ["#...#", ".#.#.", "..#.."], wave: ["#..#.", ".##.#"], heart: ["#.#", "###", ".#."], key: ["##.", "#.#", "##.", ".#.", ".##"],
  sun: ["#.#.#", ".###.", "##.##", ".###.", "#.#.#"], moon: ["##.", ".##", ".##", "##."], flame: [".#.", "##.", "###", ".#."],
  leaf: [".##", "###", "##."], rose: ["##", "##", ".#", "##"], skull: ["###", "#.#", ".#."], fang: ["#.#", "#.#", ".#."],
  paw: ["#.#", ".#.", "###"], hook: ["#.", "#.", "##"], rune1: ["#.#", "##.", "#.."], rune2: ["##", "#.", "##", ".#"], rune3: ["#.#", "###", "#.#"],
  rune4: [".#", "##", ".#", "##"], hand: ["#.#.#", "#####", ".###."], arrow: [".#.", "###", ".#.", ".#."], web: ["#.#.#", ".###.", "##.##", ".###.", "#.#.#"],
  snake: ["##.", "..#", ".#.", "#..", ".##"], tree: [".#.", "###", ".#.", "#.#"], wing: ["#..", "##.", "###"], drop: [".#.", "###", ".#."],
  bars: ["#.#.#", "#.#.#"], lines3: ["#.#.#", "#.#.#", "#.#.#"], dots3: ["#.#.#"], vbar: ["#", "#", "#"], spiral2: ["###.", "..#.", "#.#.", "###."],
  hourglass: ["###", ".#.", "###"], scales: ["#...#", "#####", "..#.."], bird: ["#.#", ".#."], lotus: ["#.#.#", "#####", ".###."], ouro: [".##.", "#..#", "#.##", ".##."],
};
/** Draw a glyph centred on (x, y). onSkin keeps it to skin. */
export function glyph(F, name, x, y, col, onSkin = true) {
  const g = GLYPHS[name], h = g.length, w = g[0].length;
  for ( let r = 0; r < h; r++ ) for ( let k = 0; k < w; k++ ) if ( g[r][k] === "#" ) {
    const px = x - Math.floor(w / 2) + k, py = y - Math.floor(h / 2) + r;
    if ( onSkin ) paint(F, px, py, col); else over(F, px, py, col);
  }
}
/** Named spots on the face, from the head's own shape. */
export function spot(c, name) {
  const S = c.S;
  switch ( name ) {
    case "brow": return [CX, 24];
    case "foreL": return [CX - 6, 22];
    case "foreR": return [CX + 6, 22];
    case "templeL": return [CX - hw(c, 28) + 2, 28];
    case "templeR": return [CX + hw(c, 28) - 2, 28];
    case "cheekL": return [CX - 9, 40];
    case "cheekR": return [CX + 9, 40];
    case "underL": return [26, 35];
    case "underR": return [38, 35];
    case "nose": return [CX, 38];
    case "chin": return [CX, S.chin - 3];
    case "jawL": return [CX - hw(c, 48) + 2, 48];
    case "jawR": return [CX + hw(c, 48) - 2, 48];
    case "neck": return [CX, S.chin + 4];
    case "neckL": return [CX - 4, S.chin + 4];
    case "neckR": return [CX + 4, S.chin + 4];
    case "lobeL": return [CX - hw(c, 37) - 1, 38];
    case "lobeR": return [CX + hw(c, 37) + 1, 38];
    default: return [CX, 30];
  }
}

/**
 * Register a feature. stages: tone(S), back(c), skin(c), face(c), ears(c), top(c); opts: slot, tick (never rolled by
 * seed: an object of one era only), covers (hides the ears and throat, as a hood does), state, core (a kith's or a
 * breed's whole look: always shown when the sheet names the group).
 */
export function def(id, line, group, label, stages = {}, opts = {}) {
  if ( FEATURES[id] ) throw new Error(`face feature ${id} defined twice`);
  const s = {...stages};
  if ( opts.covers ) { const t = s.tone; s.tone = S => { S.covered = true; t?.(S); }; }
  FEATURES[id] = {id, line, group, label, ...s, core: false, ...opts};
}
/** Every pixel of a kind gets a colour (fn may return null to leave it). */
export function eachKind(F, kind, fn) {
  for ( let i = 0; i < 64 * 64; i++ ) if ( F.kind[i] === kind ) { const c = fn(i % 64, Math.floor(i / 64), F.px[i]); if ( c ) F.px[i] = c; }
}
/** Colour the open eyes' irises. */
export function iris(c, col, {whites = null, pupil = null} = {}) {
  if ( c.eyes !== "open" ) return;
  for ( const [ex] of EYES ) {
    if ( whites ) for ( let dx = -2; dx <= 2; dx++ ) c.F.put(ex + dx, EYE_Y, whites);
    c.F.put(ex - 1, EYE_Y, mix(col, [255, 255, 255], 0.3)); c.F.put(ex, EYE_Y, pupil ?? mix(col, [0, 0, 0], 0.55)); c.F.put(ex + 1, EYE_Y, col);
  }
}
/** Specks scattered round the head, seeded: motes, sparks, petals, snow. */
export function motes(c, col, n = 10, {yMin = 4, yMax = 60, near = 18} = {}) {
  const r = H.rng(H.seedOf(`${c.S.seed}|motes|${col.join()}`));
  for ( let i = 0; i < n; i++ ) {
    const sd = r.next() < 0.5 ? -1 : 1, x = CX + sd * (near + Math.floor(r.next() * (31 - near))), y = yMin + Math.floor(r.next() * (yMax - yMin));
    if ( !c.F.kindAt(x, y) ) c.F.put(x, y, col);
  }
}
