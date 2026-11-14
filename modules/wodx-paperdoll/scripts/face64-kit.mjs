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
export const tint = (F, x, y, col, a) => { const k = F.kindAt(x, y); if ( k === "skin" || k === "neck" ) F.put(x, y, mix(F.get(x, y), col, a)); };
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
  rune4: [".#", "##", ".#", "##"], hand: ["#.#.#", "#####", ".###."], arrow: [".#.", "###", "#.#", ".#.", ".#."], web: ["#.#.#", ".###.", "##.##", ".###.", "#.#.#"],
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

/* ---------------- Recipes: a feature written as a short list of steps ---------------- */
const at = (c, s, dx = 0, dy = 0) => { const [x, y] = Array.isArray(s) ? s : spot(c, s); return [x + dx, y + dy]; };
const seeded = (c, tag) => H.rng(H.seedOf(`${c.S.seed}|${tag}`));
/**
 * Each step is [op, ...args]. Spots are names (see spot) or [x, y]. Colours are [r, g, b].
 * tone stage: skin col a | hair col a | bg col a | iris col
 * skin stage: t spot rx ry col a | sp n col a [x0 y0 x1 y1] | vein spot col n dir | crack spot col n | tex kind spot rx ry col | sunk col
 * top stage:  g glyph spot col [dx dy] | eyec col | gx (the same, over hair and cloth too) | shades col | l [[x y]...] col | dot spot col | glow col | whites col | pupil kind | lips col a | aura col a |
 *             motes col n | pend glyph col | neck [cols] | ear col style | circ col gem | collar col style | brow col style | fangs n | hairg glyph col x y |
 *             streak col side | halo col | tears col
 */
export const OPS = {
  skin: {stage: "tone", slot: "skinTone", fn: (S, col, a = 0.4) => { S.skin = mix(S.skin, col, a); }},
  hair: {stage: "tone", slot: "hairColour", fn: (S, col, a = 0.6) => { S.hair = mix(S.hair, col, a); }},
  bg: {stage: "tone", slot: "bg", fn: (S, col, a = 0.5) => { S.bg = mix(S.bg, col, a); }},
  iris: {stage: "tone", slot: "eyes2", fn: (S, col) => { S.iris = col; }},
  /** Eye colour drawn over the line's own (a mage's eyes take the Avatar's light in the tone stage). */
  eyec: {stage: "top", slot: "eyes2", fn: (c, col) => iris(c, col)},
  t: {stage: "skin", fn: (c, s, rx, ry, col, a = 0.4, dx = 0, dy = 0) => { const [x, y] = at(c, s, dx, dy); blob(x, y, rx, ry, (px, py) => tint(c.F, px, py, col, a)); }},
  sp: {stage: "skin", slot: "skin", fn: (c, n, col, a = 0.6, box = [20, 20, 44, 52]) => { const r = seeded(c, `sp${col}`); for ( let i = 0; i < n; i++ ) tint(c.F, box[0] + Math.floor(r.next() * (box[2] - box[0])), box[1] + Math.floor(r.next() * (box[3] - box[1])), col, a); }},
  vein: {stage: "skin", fn: (c, s, col, n = 6, dir = 1) => { const [x, y] = at(c, s); for ( let i = 0; i < n; i++ ) paint(c.F, x + dir * Math.round(Math.sin(i * 1.3) * 1.2), y + i, col); }},
  crack: {stage: "skin", fn: (c, s, col, n = 7, sd = 1) => { const [x, y] = at(c, s); for ( let i = 0; i < n; i++ ) paint(c.F, x + sd * Math.floor(i / 2) * (i % 4 === 3 ? -1 : 1), y + i, col); }},
  tex: {stage: "skin", fn: (c, kind, s, rx, ry, col) => { const [x0, y0] = at(c, s); blob(x0, y0, rx, ry, (x, y) => {
    const on = kind === "scales" ? (x + y * 2) % 3 === 0 : kind === "fur" ? (x * 3 + y) % 4 === 0 : kind === "stone" ? (x * 7 + y * 3) % 5 === 0 : kind === "bark" ? x % 3 === 0 : kind === "frost" ? (x + y) % 4 === 0 && (x * y) % 3 === 0 : kind === "feather" ? (y % 3 === 0 && x % 2 === 0) : kind === "rot" ? (x * 5 + y * 11) % 7 < 2 : (x + y) % 2 === 0;
    if ( on ) tint(c.F, x, y, col, 0.6); }); }},
  sunk: {stage: "skin", slot: "under", fn: (c, col) => { for ( const [ex] of EYES ) for ( let dx = -3; dx <= 3; dx++ ) { tint(c.F, ex + dx, EYE_Y + 2, col, 0.5); tint(c.F, ex + dx, EYE_Y - 2, col, 0.25); } }},
  g: {stage: "top", fn: (c, name, s, col, dx = 0, dy = 0) => { const [x, y] = at(c, s, dx, dy); glyph(c.F, name, x, y, col); }},
  gx: {stage: "top", fn: (c, name, s, col, dx = 0, dy = 0) => { const [x, y] = at(c, s, dx, dy); glyph(c.F, name, x, y, col, false); }},
  shades: {stage: "top", slot: "eyes", fn: (c, col) => { for ( const [ex] of EYES ) for ( let dx = -3; dx <= 3; dx++ ) for ( let dy = -1; dy <= 1; dy++ ) c.F.put(ex + dx, EYE_Y + dy, dy === -1 && dx === -2 ? mix(col, [255, 255, 255], 0.4) : col); for ( let x = CX - 2; x <= CX + 2; x++ ) c.F.put(x, EYE_Y - 1, mix(col, [0, 0, 0], 0.3)); }},
  l: {stage: "top", fn: (c, pts, col) => { for ( let i = 0; i + 1 < pts.length; i++ ) line(...pts[i], ...pts[i + 1], (x, y) => { if ( !(y === EYE_Y && c.eyes === "open" && EYES.some(([ex]) => Math.abs(x - ex) <= 2)) ) paint(c.F, x, y, col); }); }},
  dot: {stage: "top", fn: (c, s, col) => { const [x, y] = at(c, s), k = c.F.kindAt(x, y); c.F.put(x, y, col); if ( k === "skin" || k === "neck" ) paint(c.F, x + 1, y, mix(col, c.R.b, 0.4)); else c.F.put(x, y + 1, mix(col, [0, 0, 0], 0.3)); }},
  glow: {stage: "top", slot: "eyeGlow", fn: (c, col) => { if ( c.eyes === "shut" ) return; for ( const [ex] of EYES ) glow(c.F, ex, EYE_Y, col, 3, 0.5); }},
  whites: {stage: "top", slot: "eyeWhites", fn: (c, col) => { if ( c.eyes !== "open" ) return; for ( const [ex] of EYES ) for ( const dx of [-2, 2] ) c.F.put(ex + dx, EYE_Y, col); }},
  pupil: {stage: "top", slot: "pupil", fn: (c, kind) => { if ( c.eyes !== "open" ) return; for ( const [ex] of EYES ) {
    if ( kind === "slit" ) { c.F.put(ex, EYE_Y, [10, 8, 10]); c.F.put(ex, EYE_Y - 1, [10, 8, 10]); }
    else if ( kind === "none" ) c.F.put(ex, EYE_Y, c.F.get(ex + 1, EYE_Y));
    else if ( kind === "white" ) c.F.put(ex, EYE_Y, [236, 236, 240]);
    else if ( kind === "pin" ) { c.F.put(ex, EYE_Y, c.F.get(ex - 1, EYE_Y)); c.F.put(ex - 1, EYE_Y, [10, 8, 10]); }
    else if ( kind === "black" ) for ( let dx = -2; dx <= 2; dx++ ) c.F.put(ex + dx, EYE_Y, dx === -1 ? [60, 60, 70] : [8, 6, 10]);
    else if ( kind === "red" ) c.F.put(ex, EYE_Y, [200, 20, 30]); } }},
  lips: {stage: "top", slot: "lips", fn: (c, col, a = 0.6) => { for ( let x = CX - 3; x <= CX + 3; x++ ) for ( const y of [MOUTH_Y, MOUTH_Y + 1] ) tint(c.F, x, y, col, a); }},
  aura: {stage: "top", slot: "aura", fn: (c, col, a = 0.35) => { for ( let y = 0; y < 64; y++ ) for ( let x = 0; x < 64; x++ ) if ( !c.F.kindAt(x, y) ) { const d = Math.hypot((x - CX) / 20, (y - 32) / 26); if ( d > 0.8 && d < 1.25 ) c.F.put(x, y, mix(c.F.get(x, y) ?? c.S.bg, col, a * (1 - Math.abs(d - 1.02) * 4))); } }},
  motes: {stage: "top", slot: "aura", fn: (c, col, n = 10) => motes(c, col, n)},
  halo: {stage: "top", slot: "aura", fn: (c, col) => { for ( let x = CX - 12; x <= CX + 12; x++ ) { const y = 6 + Math.round(((x - CX) / 12) ** 2 * 3); if ( !c.F.kindAt(x, y) ) c.F.put(x, y, col); } }},
  pend: {stage: "top", slot: "neck", fn: (c, name, col) => { const y = c.S.chin + 3; line(CX - 6, y, CX, y + 4, (x, yy) => over(c.F, x, yy, [40, 34, 30])); line(CX + 6, y, CX, y + 4, (x, yy) => over(c.F, x, yy, [40, 34, 30])); glyph(c.F, name, CX, y + 6, col, false); }},
  neck: {stage: "top", slot: "neck", fn: (c, cols, drop = 3) => { const y = c.S.chin + 5; let i = 0; for ( let x = CX - 9; x <= CX + 9; x++ ) over(c.F, x, y + Math.round(((x - CX) / 9) ** 2 * drop), cols[i++ % cols.length]); }},
  ear: {stage: "top", slot: "ears", fn: (c, col, style = "stud") => { for ( const sd of [-1, 1] ) { const [x, y] = spot(c, sd < 0 ? "lobeL" : "lobeR"); over(c.F, x, y, col);
    if ( style === "drop" ) for ( let k = 1; k < 4; k++ ) c.F.put(x, y + k, col); if ( style === "hoop" ) for ( const [dx, dy] of [[sd, 1], [sd, 2], [0, 3], [-sd, 2]] ) c.F.put(x + dx, y + dy, col); if ( style === "bone" ) for ( let k = -2; k <= 2; k++ ) c.F.put(x + sd * k, y + 1, [230, 222, 200]); } }},
  circ: {stage: "top", slot: "head", fn: (c, col, gem = null, y0 = 17) => { for ( let x = CX - 13; x <= CX + 13; x++ ) over(c.F, x, y0 + Math.round(Math.abs(x - CX) / 8), (x % 3) ? col : mix(col, [0, 0, 0], 0.3)); if ( gem ) c.F.put(CX, y0 - 1, gem); }},
  collar: {stage: "top", slot: "collar", fn: (c, col, style = "plain") => { const y0 = c.S.chin + 2; for ( let y = y0; y < 64; y++ ) for ( let x = 0; x < 64; x++ ) if ( c.F.kindAt(x, y) === "cloth" ) {
    const on = style === "plain" ? y < y0 + 3 : style === "stripe" ? (x + y) % 4 === 0 : style === "check" ? ((x >> 1) + (y >> 1)) % 2 === 0 : style === "trim" ? y === y0 + 1 || y === y0 + 2 : style === "dots" ? y < y0 + 4 && (x * 3 + y * 5) % 5 === 0 : style === "whole";
    if ( style === "check" ) { const k = ((x >> 2) * 7 + Math.floor((y - y0) / 3) * 5) % 3; if ( k < 2 ) c.F.put(x, y, k ? mix(col, [20, 16, 24], 0.45) : col); }   // patches 4 by 3, never a 1-pixel chequer
    else if ( on ) c.F.put(x, y, col); } }},
  brow: {stage: "top", slot: "brows", fn: (c, col, style = "heavy") => { for ( const [ex, sd] of EYES ) for ( let dx = -3; dx <= 3; dx++ ) {
    const y = style === "arched" ? EYE_Y - 4 - (Math.abs(dx) < 2 ? 1 : 0) : style === "slant" ? EYE_Y - 4 + Math.round(dx * sd * 0.5) : EYE_Y - 4;
    over(c.F, ex + dx, y, col); if ( style === "heavy" ) over(c.F, ex + dx, y - 1, col); } }},
  fangs: {stage: "top", slot: "teeth", fn: (c, n = 2) => { for ( const x of [CX - 2, CX + 2] ) for ( let k = 1; k <= n; k++ ) c.F.put(x, MOUTH_Y + k, k === n ? [206, 198, 190] : [248, 244, 232]); }},
  hairg: {stage: "top", slot: "hair", fn: (c, name, col, x = CX + 9, y = 14) => glyph(c.F, name, x, y, col, false)},
  streak: {stage: "top", slot: "hair", fn: (c, col, sd = -1) => eachKind(c.F, "hair", (x, y, p) => (Math.abs(x - (CX + sd * 6)) <= 1 ? mix(p, col, 0.75) : null))},
  tears: {stage: "top", slot: "under", fn: (c, col) => { for ( const [ex] of EYES ) for ( let i = 0; i < 5; i++ ) paint(c.F, ex - 1, EYE_Y + 2 + i, col); }},
};
/** Turn a list of steps into stage functions and a slot. */
export function rec(steps) {
  const st = {};
  for ( const [op, ...args] of steps ) {
    const o = OPS[op];
    if ( !o ) throw new Error(`face recipe: no step ${op}`);
    (st[o.stage] ??= []).push(c => o.fn(c, ...args));
  }
  const stages = {};
  for ( const [k, fns] of Object.entries(st) ) stages[k] = c => { for ( const fn of fns ) fn(c); };
  const [op, ...args] = steps[0], o = OPS[op];
  const slot = o.slot ?? (typeof args[0] === "string" && !["scales", "fur", "stone", "bark", "frost", "feather", "rot", "grid"].includes(args[0]) && !GLYPHS[args[0]] ? args[0] : op === "g" || op === "tex" ? (typeof args[1] === "string" ? args[1] : null) : null);
  return {stages, slot};
}
/** Define many features from rows [id, group, label, steps, opts?]. */
export function table(line, prefix, rows) {
  for ( const [id, group, label, steps, opts = {}] of rows ) { const {stages, slot} = rec(steps); def(`${prefix}-${id}`, line, group, label, stages, {slot, ...opts}); }
}
