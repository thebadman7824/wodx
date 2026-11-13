/**
 * WoDX Paperdoll: talking faces, drawn pixel by pixel on a 64 by 64 grid (Paperdoll 0.16.0, B2790-B2796).
 *
 * Pure rules, no Foundry: a face is rolled from a seed and a line (Kindred, Garou, Mage and the rest), then drawn
 * with an expression, an eye state, a mouth shape and a level on the health track. Only the eyes, brows and mouth
 * change between frames, so blinking, speaking and reacting cost nothing but a redraw of the same face.
 *
 * Every face is built in the same order: background, clothes, hair behind the head, ears and head, features,
 * beard, hair in front, outlines, then the line's own marks, then wounds. Marks that only some can see (a
 * changeling's fae mien, a hunter's sigil) are left out unless the viewer may see them.
 */

export const N = 64;
const CX = 32, EYE_Y = 32, MOUTH_Y = 45;
const TOP = 11, EYE = 31, JAW = 43;

/* ---------------- colour ---------------- */
const mix = (a, b, t) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t));
const same = (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
function ramp(base, cool = false) {
  return {hi: mix(base, cool ? [232, 240, 240] : [255, 238, 205], 0.34), b: base,
    s1: mix(base, cool ? [62, 70, 96] : [120, 50, 62], 0.30), s2: mix(base, cool ? [40, 44, 72] : [70, 26, 52], 0.52),
    ol: mix(base, cool ? [22, 24, 44] : [38, 14, 30], 0.76)};
}
const hramp = b => ({hi: mix(b, [255, 230, 180], 0.32), b, s1: mix(b, [30, 14, 24], 0.38), s2: mix(b, [18, 8, 18], 0.62), ol: mix(b, [10, 4, 12], 0.8)});
const mod = (a, n) => ((a % n) + n) % n;

/* ---------------- seeded rolls ---------------- */
/** A number from any text, for seeding: the same actor id always gives the same face. */
export function seedOf(text) {
  let h = 2166136261;
  for ( const ch of String(text ?? "") ) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function rng(seed) {
  let a = (Number(seed) >>> 0) || 1;
  const next = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return {next, pick: arr => arr[Math.floor(next() * arr.length)], chance: p => next() < p};
}

/* ---------------- what there is to choose ---------------- */
export const LINES = {
  mortal: "A mortal", kindred: "Kindred", nosferatu: "Kindred, Nosferatu", werewolf: "Garou", mage: "Mage", wraith: "Wraith",
  changeling: "Changeling", hunter: "Hunter", mummy: "Mummy", demon: "Demon", "kuei-jin": "Kuei-jin"
};
export const EXPRESSIONS = ["neutral", "smile", "smirk", "anger", "sorrow", "fear", "slack"];
export const EYES_STATES = ["open", "half", "shut"];
export const TALK_MOUTHS = ["talk1", "talk2", "talk3"];
const OPEN_MOUTHS = new Set(["anger", "fear", "slack", ...TALK_MOUTHS]);

const SKINS = [[236, 200, 170], [222, 178, 142], [198, 150, 112], [170, 118, 84], [150, 96, 70], [118, 74, 52], [88, 56, 42], [206, 160, 120]];
const HAIRS = [[34, 26, 26], [70, 44, 28], [104, 62, 36], [150, 104, 52], [196, 160, 92], [120, 48, 30], [150, 150, 150], [60, 56, 64]];
const IRISES = [[90, 120, 160], [96, 140, 84], [110, 76, 44], [70, 52, 40], [120, 130, 140]];
const CLOTHS = [[70, 84, 66], [86, 64, 54], [60, 66, 90], [92, 84, 70], [54, 50, 58]];

/**
 * Which line's face an actor gets, from what the sheet says: its type, the variant sheet, the clan and the kind
 * other modules give it. Unknown types are mortal.
 */
export function lineOf({type = "", variant = "", clan = "", kind = ""} = {}) {
  const all = `${type} ${variant} ${clan} ${kind}`.toLowerCase();
  if ( /kuei|hsien.?gui/.test(all) ) return "kuei-jin";
  if ( type === "Vampire" || /\b(vampire|kindred|cainite)\b/.test(all) ) return /nosferatu/.test(all) ? "nosferatu" : "kindred";
  if ( type === "Werewolf" || /\b(garou|werewolf)\b/.test(all) ) return "werewolf";
  if ( type === "Mage" || /\bmage\b/.test(all) ) return "mage";
  if ( type === "Wraith" || /\bwraith\b/.test(all) ) return "wraith";
  if ( type === "Changeling" || /changeling|kithain/.test(all) ) return "changeling";
  if ( type === "Hunter" || /\b(hunter|imbued)\b/.test(all) ) return "hunter";
  if ( type === "Mummy" || /mummy|amenti/.test(all) ) return "mummy";
  if ( type === "Demon" || /\b(demon|fallen)\b/.test(all) ) return "demon";
  return "mortal";
}

/**
 * The lasting look of one person: skin, hair, build, eyes, clothes, and what the line changes. The same seed and line
 * always give the same person. sex "woman" or "man" when known; otherwise the seed decides lashes and beards.
 */
export function roll(seed, line = "mortal", {sex = "", fangs = false, kith = ""} = {}) {
  const r = rng(seedOf(`${seed}|face64`));
  const S = {line: LINES[line] ? line : "mortal", seed: String(seed), skin: r.pick(SKINS), hair: r.pick(HAIRS), style: r.pick(["long", "short", "short", "back", "bald"]),
    beard: r.pick(["", "", "stubble", "full", "goatee"]), w: r.pick([13, 14, 14, 15]), jw: r.pick([10, 11, 12, 12, 13]), chin: r.pick([53, 54, 54, 55]), cw: r.pick([4, 5, 5, 6]),
    iris: r.pick(IRISES), cloth: r.pick(CLOTHS), brow: r.pick([27, 28, 28]), lash: r.chance(0.5), bg: [46, 44, 58], cool: false, sunk: false,
    white: [236, 230, 220], ears: "plain", thin: false, fangs: !!fangs, kith: String(kith ?? "").toLowerCase()};
  if ( sex === "woman" ) S.lash = true;
  else if ( sex === "man" ) S.lash = false;
  (PRE[S.line] ?? (() => {}))(S, r);
  if ( S.lash ) S.beard = "";
  S.marks = r.next();      // one more roll kept for the marks, so marks never shift the look above
  return S;
}

/* ---------------- the canvas ---------------- */
class Grid {
  constructor(bg) { this.px = new Array(N * N).fill(null); this.kind = new Array(N * N).fill(null); this.bg = bg; }
  in(x, y) { return x >= 0 && x < N && y >= 0 && y < N; }
  put(x, y, c, k = null) { if ( !this.in(x, y) ) return; const i = y * N + x; this.px[i] = c; if ( k ) this.kind[i] = k; }
  get(x, y) { return this.in(x, y) ? this.px[y * N + x] : null; }
  kindAt(x, y) { return this.in(x, y) ? this.kind[y * N + x] : null; }
  has(x, y) { return this.get(x, y) !== null; }
  /** Selective outline: each pixel of these kinds that touches empty space or another kind takes the outline tone. */
  outline(kinds, col) {
    const ks = new Set(kinds), edge = [];
    for ( let y = 0; y < N; y++ ) for ( let x = 0; x < N; x++ ) {
      const k = this.kind[y * N + x];
      if ( !ks.has(k) ) continue;
      for ( const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] ) {
        const q = this.kindAt(x + dx, y + dy);
        if ( q !== k && !ks.has(q) ) { edge.push([x, y]); break; }
      }
    }
    for ( const [x, y] of edge ) this.px[y * N + x] = col;
  }
  /** RGBA bytes, the background darkening toward the corners. */
  rgba() {
    const out = new Uint8ClampedArray(N * N * 4);
    for ( let y = 0; y < N; y++ ) for ( let x = 0; x < N; x++ ) {
      const i = y * N + x, d = Math.hypot(x - CX, y - 30) / 47;
      const c = this.px[i] ?? mix(this.bg, [14, 14, 20], Math.min(1, Math.max(0, d - 0.35)) * 1.1);
      out[i * 4] = c[0]; out[i * 4 + 1] = c[1]; out[i * 4 + 2] = c[2]; out[i * 4 + 3] = 255;
    }
    return out;
  }
}

/* ---------------- shapes ---------------- */
function headHw(y, [top, eye, jaw, chin, w, jw, cw]) {
  if ( y < top || y > chin ) return -1;
  if ( y <= eye ) return w * Math.sqrt(Math.max(0, 1 - ((eye - y) / (eye - top + 0.5)) ** 2));
  if ( y <= jaw ) return w - (w - jw) * ((y - eye) / (jaw - eye));
  // the jaw holds its width and turns late into a chin that stands out (squarer since 13 November 2026: Ben found the chins weak)
  const f = (y - jaw) / (chin - jaw); return jw - (jw - Math.max(cw, 5)) * f ** 2.6;
}
function skin(F, R, shape, neck) {
  const [top, eye, , chin] = shape, L = [-0.30, -0.42, 0.86];
  for ( let y = chin - 4; y < N; y++ ) for ( let x = CX - neck; x <= CX + neck; x++ ) {
    const c = y < chin + 3 + (x > CX - 3 ? 1 : 0) ? R.s2 : x < CX - 3 ? R.b : R.s1;
    F.put(x, y, c, "neck");
  }
  for ( let y = top; y <= chin; y++ ) {
    const hw = headHw(y, shape);
    for ( let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++ ) {
      const nx = (x - CX) / (hw + 1.2), ny = (y - (eye + 3)) / ((chin - top) / 2 + 2), nz = Math.sqrt(Math.max(0, 1 - 0.9 * nx * nx - 0.6 * ny * ny));
      const v = nx * L[0] + ny * L[1] + nz * L[2];
      const c = (v > 0.985 && nx > -0.62 && nx < -0.18 && ny > -0.72 && ny < -0.3) ? R.hi : v > 0.60 ? R.b : v > 0.36 ? R.s1 : R.s2;
      F.put(x, y, c, "skin");
    }
  }
}
function cheeks(F, R, shape) {
  const [, eye, jaw] = shape;
  for ( let y = eye + 3; y < jaw + 4; y++ ) {
    const hw = headHw(y, shape);
    for ( let k = 1; k < 3 + Math.floor((y - eye) / 5); k++ ) {
      const x = Math.round(CX + hw) - k;
      if ( F.kindAt(x, y) === "skin" ) F.put(x, y, k < 2 ? R.s2 : R.s1);
    }
  }
  for ( const [x, y] of [[CX - 9, eye + 4], [CX - 8, eye + 4], [CX - 9, eye + 5], [CX - 10, eye + 4]] ) if ( F.kindAt(x, y) === "skin" ) F.put(x, y, R.hi);
  // the chin: a shadow in the fold under the lower lip, a lit ball of chin, and its right side in shade
  const chin = shape[3], put = (x, y, c) => { if ( F.kindAt(x, y) === "skin" ) F.put(x, y, c); };
  for ( let x = CX - 2; x <= CX + 2; x++ ) put(x, MOUTH_Y + 3, R.s1);
  for ( const [x, y] of [[CX - 2, chin - 4], [CX - 1, chin - 4], [CX - 2, chin - 3], [CX - 1, chin - 3], [CX, chin - 4]] ) put(x, y, R.hi);
  for ( let y = chin - 4; y <= chin - 1; y++ ) { put(CX + 3, y, R.s1); put(CX + 4, y, R.s2); }
}
function socket(F, R, ex, ey, sunk) {
  for ( let dx = -4; dx <= 4; dx++ ) for ( let dy = -2; dy <= 2; dy++ )
    if ( Math.abs(dx) / 4.5 + Math.abs(dy) / 2.6 <= 1 && F.kindAt(ex + dx, ey + dy) === "skin" ) F.put(ex + dx, ey + dy, sunk ? R.s2 : R.s1);
}
function eyeOpen(F, R, ex, ey, iris, side, lid, white, sunk) {
  socket(F, R, ex, ey, sunk);
  for ( let dx = -2; dx <= 2; dx++ ) { F.put(ex + dx, ey, white); F.put(ex + dx, ey - 1, lid); }
  F.put(ex + 3 * side, ey - 1, lid); F.put(ex + 3 * side, ey, mix(lid, R.s2, 0.4)); F.put(ex - 3 * side, ey, mix(white, R.s1, 0.6));
  F.put(ex - 1, ey, mix(iris, [255, 255, 240], 0.35)); F.put(ex, ey, [12, 10, 16]); F.put(ex + 1, ey, mix(iris, [10, 10, 20], 0.3));
  for ( let dx = -2; dx <= 1; dx++ ) F.put(ex + dx, ey + 1, mix(R.s2, lid, 0.2));
}
function eye(F, R, ex, ey, iris, side, expr, state, {lid = [30, 16, 22], white = [236, 230, 220], sunk = false} = {}) {
  if ( state === "half" ) {
    eyeOpen(F, R, ex, ey, iris, side, lid, white, sunk);
    for ( let dx = -3; dx <= 3; dx++ ) F.put(ex + dx, ey - 1, R.s1);
    for ( let dx = -2; dx <= 2; dx++ ) F.put(ex + dx, ey, dx ? lid : mix(iris, [10, 10, 20], 0.5));
    F.put(ex + 3 * side, ey, lid); return;
  }
  if ( state === "shut" ) {
    socket(F, R, ex, ey, sunk);
    for ( let dx = -2; dx <= 2; dx++ ) F.put(ex + dx, ey, lid);
    F.put(ex + 3 * side, ey, lid); F.put(ex - 3 * side, ey - 1, mix(lid, R.s2, 0.5)); return;
  }
  eyeOpen(F, R, ex, ey, iris, side, lid, white, sunk);
  if ( expr === "fear" ) {        // wide: the lid lifts clear of the iris
    for ( let dx = -2; dx <= 2; dx++ ) { F.put(ex + dx, ey - 1, white); F.put(ex + dx, ey - 2, lid); }
    F.put(ex - 1, ey - 1, mix(iris, [255, 255, 240], 0.2)); F.put(ex, ey - 1, [12, 10, 16]); F.put(ex + 1, ey - 1, mix(iris, [10, 10, 20], 0.3)); F.put(ex + 3 * side, ey - 1, lid);
  }
  if ( expr === "anger" ) { F.put(ex - 2 * side, ey, mix(white, lid, 0.55)); F.put(ex - 3 * side, ey, lid); }   // the brow presses on the inner corner
  if ( expr === "smile" ) for ( let dx = -2; dx <= 2; dx++ ) F.put(ex + dx, ey + 1, mix(R.b, R.s1, 0.5));
  if ( expr === "sorrow" ) F.put(ex + 2 * side, ey, mix(white, lid, 0.5));
}
const BROWS = {neutral: [0, 0, -1, -1, -1, -1, 0], smile: [0, -1, -1, -1, -1, -1, 0], smirk: [0, 0, -1, -1, -1, -1, 0], anger: [2, 1, 0, 0, -1, -1, -1],
  sorrow: [-2, -1, -1, -1, 0, 0, 1], fear: [-2, -2, -2, -2, -2, -1, -1], slack: [0, 0, 0, -1, -1, 0, 0]};
function brow(F, ex, by, side, col, expr) {
  (BROWS[expr] ?? BROWS.neutral).forEach((o, i) => {
    const x = ex + side * (i - 3); F.put(x, by + o, col);
    if ( i < 3 && expr !== "fear" ) F.put(x, by + o + 1, mix(col, [0, 0, 0], 0.2));
  });
}
function nose(F, R, y0, y1, slits = false) {
  if ( slits ) {
    for ( let y = y1 - 3; y < y1; y++ ) { F.put(CX - 1, y, R.ol); F.put(CX + 1, y, R.ol); }
    for ( let x = CX - 2; x <= CX + 2; x++ ) F.put(x, y1 + 1, R.s1);
    return;
  }
  for ( let y = y0; y < y1 - 1; y++ ) { F.put(CX - 1, y, R.hi); F.put(CX + 1, y, R.s1); }
  F.put(CX, y1 - 2, R.hi); F.put(CX - 1, y1 - 1, R.hi); F.put(CX - 3, y1 - 1, R.s1); F.put(CX + 3, y1 - 1, R.s2);
  F.put(CX - 2, y1, R.ol); F.put(CX + 2, y1, R.ol);
  for ( const x of [CX - 1, CX, CX + 1] ) F.put(x, y1, R.s2);
}
function lipsClosed(F, R, my, lip, thin) {
  const dark = mix(lip, [30, 8, 18], 0.7), w = 4;
  if ( !thin ) {
    for ( let x = CX - w + 1; x < CX + w; x++ ) { F.put(x, my - 1, mix(lip, R.s2, 0.35)); F.put(x, my + 1, lip); }
    F.put(CX - 1, my + 1, mix(lip, [255, 235, 225], 0.5)); F.put(CX - 2, my + 1, mix(lip, [255, 235, 225], 0.3));
    for ( let x = CX - 2; x <= CX + 2; x++ ) F.put(x, my + 3, R.s1);
  } else for ( let x = CX - 3; x <= CX + 3; x++ ) F.put(x, my + 2, R.s1);
  for ( let x = CX - w; x <= CX + w; x++ ) F.put(x, my, dark);
  return dark;
}
const TOOTH = [244, 240, 228], FANG = [224, 216, 200];
function drawMouth(F, R, my, lip, kind, {fangs = false, thin = false} = {}) {
  const w = 4, cav = [44, 14, 22];
  if ( !OPEN_MOUTHS.has(kind) ) {
    const dark = lipsClosed(F, R, my, lip, thin);
    if ( kind === "smirk" ) { F.put(CX + w + 1, my - 1, dark); F.put(CX + w + 1, my - 2, R.s1); F.put(CX + w, my, dark); F.put(CX - w, my, R.b); }
    if ( kind === "smile" ) for ( const sx of [-1, 1] ) { F.put(CX + sx * w, my, dark); F.put(CX + sx * (w + 1), my - 1, dark); F.put(CX + sx * (w + 1), my - 2, R.s1); }
    if ( kind === "sorrow" ) for ( const sx of [-1, 1] ) { F.put(CX + sx * w, my, R.b); F.put(CX + sx * w, my + 1, dark); }
    return;
  }
  const dark = mix(lip, [30, 8, 18], 0.7);
  const top = kind === "anger" ? my - 1 : my;
  const h = {anger: 3, fear: 3, slack: 3, talk1: 1, talk2: 2, talk3: 2}[kind], hw = {anger: 4, fear: 2, slack: 3, talk1: 1, talk2: 2, talk3: 3}[kind];
  for ( let x = CX - hw; x <= CX + hw; x++ ) {
    F.put(x, top - 1, mix(lip, R.s2, 0.35));
    for ( let k = 0; k < h; k++ ) F.put(x, top + k, cav);
    F.put(x, top + h, lip);
  }
  for ( let k = 0; k < h; k++ ) { F.put(CX - hw - 1, top + k, dark); F.put(CX + hw + 1, top + k, dark); }
  if ( kind === "anger" ) {
    for ( let x = CX - 3; x <= CX + 3; x++ ) { F.put(x, top, TOOTH); F.put(x, top + 2, mix(TOOTH, [120, 110, 110], 0.35)); }
    if ( fangs ) for ( const x of [CX - 2, CX + 2] ) { F.put(x, top + 1, TOOTH); F.put(x, top + 2, FANG); }
  }
  if ( kind === "talk3" ) for ( let x = CX - 2; x <= CX + 2; x++ ) F.put(x, top, TOOTH);
  if ( fangs && (kind === "talk2" || kind === "talk3") ) for ( const x of [CX - 2, CX + 2] ) { F.put(x, top, TOOTH); F.put(x, top + 1, FANG); }
  if ( kind === "slack" ) for ( let x = CX - 2; x <= CX + 2; x++ ) F.put(x, top, mix(TOOTH, [120, 110, 110], 0.25));
  for ( let x = CX - 2; x <= CX + 2; x++ ) F.put(x, top + h + 2, R.s1);
}
function beard(F, H, shape, my, kind, open) {
  const chin = shape[3];
  for ( let y = my - 3; y <= chin; y++ ) {
    const hw = headHw(y, shape);
    for ( let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++ ) {
      const d = Math.abs(x - CX);
      if ( F.kindAt(x, y) !== "skin" ) continue;
      // A beard never covers the lips, nor an open mouth
      const lips = (Math.abs(y - my) <= 1 && d <= 4) || (open && y >= my - 1 && y <= my + 3 && d <= 4);
      if ( lips ) continue;
      if ( kind === "stubble" ) { if ( (y > my + 1 || d > 5 || y === my - 2) && (x * 3 + y * 5) % 4 === 0 && y < chin - 1 ) F.put(x, y, mix(F.get(x, y), H.s1, 0.3)); }   // sparse, so it reads as shadow, not a chequered patch
      // Solid hair with a few scattered lighter strands (a hash, not a lattice), so a beard never reads as a chequer
      else if ( kind === "full" ) { if ( y > my + 2 || d > 5 || (y === my - 2 && d < 5) ) F.put(x, y, (x * 7 + y * 13) % 11 === 0 ? H.hi : (d > hw - 2 ? H.s1 : H.b)); }
      else if ( kind === "goatee" ) { if ( d < 4 && (y > my + 3 || y === my - 2) ) F.put(x, y, (x * 7 + y * 13) % 11 === 0 ? H.hi : (d === 3 ? H.s1 : H.b)); }
    }
  }
}
function hairLong(F, H, shape) {
  const [top, eye, jaw, chin, w] = shape;
  const tone = (x, y) => {
    const d = Math.abs(x - CX);
    let u = d + 1.5 * Math.sin(y / 5 + d * 0.5) + (y - top) * 0.10, t = ["b", "s1", "b", "hi"][mod(Math.floor(u / 2), 4)];
    if ( y < eye ) {
      u = d * 1.15 - (y - top) * 0.55; t = ["b", "s1", "b", "b"][mod(Math.floor(u / 2), 4)];
      const k = y - (top + 1 + 0.03 * d * d);
      if ( k >= 0 && k < 3 && t === "b" ) t = "hi";
    }
    if ( d < 1 && y < top + 8 ) t = "s2";
    const darker = {hi: "b", b: "s1", s1: "s2"};
    if ( x > CX && d > w - 2 ) t = darker[t] ?? t;
    if ( y > jaw + 3 ) t = darker[t] ?? t;
    return H[t];
  };
  for ( let y = top - 3; y < N; y++ ) {
    let out = w + 3.5 + (y < eye ? 0 : Math.min(4, (y - eye) * 0.22)) + Math.sin(y / 4);
    if ( y < eye ) out = (w + 3.5) * Math.sqrt(Math.max(0, 1 - ((eye - y) / (eye - top + 3.5)) ** 2));
    for ( let x = Math.round(CX - out); x <= Math.round(CX + out); x++ ) {
      const d = Math.abs(x - CX), hairline = top + 5 + 0.06 * d * d - (d <= 1 ? 2 : 0);
      const inner = w - 2.5 - Math.max(0, y - eye) * 0.07 + 0.8 * Math.sin(y / 3.5 + (x < CX ? 0 : 2));
      if ( (y >= hairline && d < inner && y <= chin + 1) || (y > chin + 1 && d < 8) ) continue;
      F.put(x, y, tone(x, y), "hair");
    }
  }
}
function hairShort(F, H, shape, high = 0, side = 3) {
  const [top, eye, , , w] = shape;
  for ( let y = top - 3; y <= eye; y++ ) {
    const hw = y >= top ? headHw(Math.max(y, top), shape) : 0;
    const out = (w + 2.2) * Math.sqrt(Math.max(0, 1 - ((eye - y) / (eye - top + 3.6)) ** 2));
    for ( let x = Math.round(CX - out); x <= Math.round(CX + out); x++ ) {
      const d = Math.abs(x - CX), hl = top + 5 - high + 0.028 * d * d, temple = d > hw - 2.4 && y < eye - 5 + side;
      if ( !(y < hl || temple || d > hw) ) continue;
      if ( d > hw && y > eye - 6 + side ) continue;
      let t = ["b", "s1", "b", "b"][mod(Math.floor((d * 0.9 - (y - top) * 0.6) / 2), 4)];
      const k = y - (top - 1 + 0.03 * d * d);
      if ( k >= 0 && k < 2 && t === "b" ) t = "hi";
      if ( x > CX && d > w - 4 ) t = {hi: "b", b: "s1", s1: "s2"}[t];
      F.put(x, y, H[t], "hair");
    }
  }
}
function glow(F, ex, ey, col, r = 3, a = 0.34) {
  for ( let dx = -r - 1; dx <= r + 1; dx++ ) for ( let dy = -r; dy <= r; dy++ ) {
    const dd = Math.hypot(dx * 0.8, dy * 1.2), c = F.get(ex + dx, ey + dy);
    if ( dd <= r && c && !(Math.abs(dx) <= 2 && dy === 0) ) F.put(ex + dx, ey + dy, mix(c, col, a * (1 - dd / (r + 1))));
  }
}
function stamp(F, cells, ol, kind = null) {
  const has = new Set(cells.map(([x, y]) => `${x},${y}`));
  for ( const [x, y] of cells ) for ( const [dx, dy] of [[1, 0], [-1, 0], [0, -1]] ) if ( !has.has(`${x + dx},${y + dy}`) ) F.put(x + dx, y + dy, ol, kind);
  for ( const [x, y, c] of cells ) F.put(x, y, c, kind);
}
function horn(F, M, rx, ry, sd, L = 12, w = 4, lean = 2.8) {
  const cells = [];
  for ( let t = 0; t < L; t++ ) {
    const f = t / (L - 1), off = sd * lean * (1.75 * f - 0.85 * f * f), wd = Math.max(1, Math.round(w * (1 - f) ** 0.72)), x0 = Math.round(rx + off - wd / 2);
    for ( let i = 0; i < wd; i++ ) {
      let c = (i === 0 && wd > 1) ? M.hi : (i === wd - 1 && wd > 2) ? M.s1 : M.b;
      if ( t % 3 === 2 && wd > 2 && i > 0 ) c = mix(c, M.s2, 0.4);
      cells.push([x0 + i, ry - t, c]);
    }
  }
  stamp(F, cells, M.ol, "horn");
}
function inTri([a, b, c], x, y) {
  const cr = (p, q) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]);
  const d = [cr(a, b), cr(b, c), cr(c, a)];
  return d.every(v => v >= 0) || d.every(v => v <= 0);
}

/* ---------------- the lines: what each sets before drawing, what each adds after ---------------- */
const PRE = {
  kindred(S, r) { S.skin = mix(S.skin, [226, 222, 226], 0.62); S.iris = r.pick([[150, 40, 40], [120, 60, 50], [90, 100, 130]]); S.bg = [52, 34, 44]; },
  nosferatu(S, r) {
    S.skin = r.pick([[142, 156, 160], [154, 162, 148], [150, 140, 156], [138, 150, 140]]); S.cool = true; S.style = "bald"; S.beard = ""; S.sunk = true;
    S.iris = r.pick([[214, 200, 110], [200, 192, 112], [176, 184, 160], [160, 64, 48]]); S.white = [214, 212, 196]; S.bg = [40, 44, 50];
    S.cloth = r.pick([[58, 50, 46], [52, 52, 46], [64, 52, 40]]); S.ears = r.pick(["bat", "bat", "long"]); S.thin = true; S.w = 15; S.jw = 11; S.cw = 4; S.chin = 55;
    S.tusks = r.pick([true, true, false]); S.ridge = r.chance(0.7); S.lines = r.pick([1, 2, 3]);
  },
  werewolf(S, r) { S.iris = r.pick([[200, 144, 26], [208, 160, 48]]); S.style = r.pick(["long", "short"]); S.bg = [44, 50, 44]; },
  mage(S, r) { S.glowc = r.pick([[154, 208, 255], [200, 184, 255], [255, 224, 138]]); S.iris = S.glowc; S.bg = [40, 40, 66]; },
  wraith(S) {
    const g = Math.round((S.skin[0] + S.skin[1] + S.skin[2]) / 3);
    S.skin = mix([g, g, g], [154, 168, 184], 0.45); S.cool = true; S.iris = [216, 226, 234]; S.sunk = true; S.white = [190, 196, 204];
    S.hair = mix(S.hair, [120, 124, 136], 0.5); S.cloth = [66, 70, 82]; S.bg = [30, 34, 44]; S.beard = "";
  },
  changeling(S, r) {
    S.iris = r.pick([[138, 176, 48], [200, 160, 32], [58, 154, 106]]); S.bg = [52, 44, 60]; S.style = r.pick(["long", "short"]);
    // Satyrs and trolls bear horns in their fae mien; another kith only when the seed says so and no kith is known
    S.horns = /satyr|troll/.test(S.kith) || (!S.kith && r.chance(0.5)); S.hornDark = r.chance(0.5); S.hornLen = r.pick([10, 12, 13]);
  },
  hunter(S, r) { S.style = r.pick(["short", "back", "bald"]); S.beard = r.pick(["stubble", "stubble", ""]); S.bg = [48, 46, 40]; },
  mummy(S, r) { S.skin = r.pick([[168, 117, 79], [152, 103, 74], [181, 130, 90], [141, 90, 62]]); S.hair = [24, 20, 24]; S.style = r.pick(["short", "long", "bald"]); S.beard = ""; S.cloth = [226, 216, 196]; S.bg = [58, 48, 36]; },
  demon(S, r) { S.style = r.pick(["short", "back", "bald"]); S.iris = [240, 130, 40]; S.bg = [54, 34, 34]; },
  "kuei-jin"(S, r) { S.skin = mix(S.skin, [138, 168, 154], 0.42); S.cool = true; S.iris = [60, 220, 150]; S.hair = [22, 22, 28]; S.style = r.pick(["long", "back"]); S.bg = [34, 48, 46]; }
};
/** Drawn behind the head (after the clothes): nothing yet; the Nosferatu's ears grow from the side of the head (nosEars). */
const BACK = {};
/**
 * The Nosferatu's great ears (redrawn 13 November 2026 at Ben's word: they must not seem to grow from the back of the
 * head). Each is rooted on the side of the head at eye-to-nose height, laid over the head's edge, with its hollow and the
 * opening of the ear at the root facing forward, and rises outward to a point: a bat's ear high, a long ear to the side.
 */
function nosEars(c) {
  const {F, R, S, shape} = c;
  if ( S.ears === "plain" ) return;
  const bat = S.ears === "bat";
  for ( const sd of [-1, 1] ) {
    const top = 25, bot = 41, eTop = Math.round(headHw(top, shape)), eBot = Math.round(headHw(bot, shape));
    const tip = bat ? [CX + sd * 29, 10] : [CX + sd * 30, 20], low = bat ? [CX + sd * 24, 32] : [CX + sd * 25, 33];
    const a = [CX + sd * (eTop - 2), top], b = [CX + sd * (eBot - 2), bot];
    const ear = (x, y) => inTri([a, tip, low], x, y) || inTri([a, low, b], x, y);
    const mid = [(a[0] + low[0]) / 2, (a[1] + b[1]) / 2];
    const hollow = (x, y) => inTri([[mid[0] + sd, a[1] + 4], [tip[0] - sd * 4, tip[1] + (bat ? 6 : 3)], [low[0] - sd * 2, low[1] - 1]], x, y)
      || inTri([[mid[0] + sd, a[1] + 4], [low[0] - sd * 2, low[1] - 1], [mid[0] + sd, b[1] - 4]], x, y);
    for ( let y = 4; y < 44; y++ ) for ( let x = 0; x < N; x++ ) {
      if ( !ear(x, y) || F.kindAt(x, y) === "skin" ) continue;          // the head stays as it is; the ear joins it at the edge
      F.put(x, y, hollow(x, y) ? R.s2 : (sd < 0 ? R.b : R.s1), "skin");   // drawn as skin, so one outline runs round head and ear together
    }
    for ( let y = 31; y <= 34; y++ ) { const x = CX + sd * (Math.round(headHw(y, shape)) + 1); if ( F.kindAt(x, y) === "skin" ) F.put(x, y, mix(R.s2, [20, 14, 18], 0.5)); }   // the opening at the root
  }
}
const POST = {
  kindred(c) {
    const {F, S, mouthKind} = c;
    if ( !S.fangs || mouthKind !== "neutral" ) return;
    for ( const x of [CX - 2, CX + 2] ) { F.put(x, MOUTH_Y + 1, [248, 244, 232]); F.put(x, MOUTH_Y + 2, [206, 198, 190]); }   // fang tips on the lower lip
  },
  nosferatu(c) {
    const {F, R, S, r, mouthKind} = c;
    if ( S.ridge ) for ( const ex of [26, 38] ) {      // a bare brow ridge, lit from the left
      for ( let i = -4; i <= 4; i++ ) F.put(ex + i, 28 - (Math.abs(i) < 3 ? 1 : 0), R.s2);
      for ( let i = -3; i <= 3; i++ ) F.put(ex + i, 27 - (Math.abs(i) < 3 ? 1 : 0), ex < CX ? R.hi : R.b);
    }
    for ( let k = 0; k < S.lines; k++ ) for ( let x = 25 + k * 2; x < 40 - k * 2; x++ ) F.put(x, 20 - k * 4 + (Math.abs(x - CX) > 5 ? 1 : 0), R.s1);
    for ( const sd of [-1, 1] ) for ( let y = 38; y < 46; y++ ) for ( let k = 0; k < 3; k++ ) {     // hollow cheeks
      const x = CX + sd * (9 + k - Math.floor((y - 38) / 4));
      if ( F.kindAt(x, y) === "skin" ) F.put(x, y, (sd > 0 || k === 1) ? R.s2 : R.s1);
    }
    if ( !S.tusks || OPEN_MOUTHS.has(mouthKind) ) return;
    // Tusks grow out of the lower lip and rise over the upper one; with the mouth open they are behind the lip
    const T = {hi: [250, 246, 232], b: [224, 216, 196], s1: [170, 160, 150]}, ol = mix(R.ol, [20, 20, 30], 0.3), base = MOUTH_Y + 1;
    for ( const sd of [-1, 1] ) {
      const bx = CX + sd * 4 - (sd < 0 ? 1 : 0), cells = [];
      [2, 2, 2, 1, 1].forEach((wd, t) => {
        const x0 = bx + (wd === 2 ? 0 : sd < 0 ? 0 : 1);
        for ( let i = 0; i < wd; i++ ) cells.push([x0 + i, base - t, i === 0 ? T.hi : t > 2 ? T.b : T.s1]);
      });
      stamp(F, cells, ol);
      for ( const i of [-1, 0, 1, 2] ) F.put(bx + i, base + 1, mix(R.s2, [20, 20, 30], 0.35));
    }
    void r;
  },
  werewolf(c) {
    const {F, R, S, r} = c, sd = r.pick([-1, 1]), chin = S.chin;
    const light = R.b[0] + R.b[1] + R.b[2] > 480, scar = light ? mix(R.b, [176, 84, 84], 0.5) : mix(R.hi, [236, 180, 170], 0.6);
    for ( let k = 0; k < 3; k++ ) for ( let t = 0; t < 20; t++ ) {    // three healed claw lines, brow to cheek, broken by the eye
      const x = CX + sd * (4 + 3 * k + Math.floor(t / 5)), y = 24 + t;
      if ( F.kindAt(x, y) === "skin" && !(y >= 29 && y <= 34) ) F.put(x, y, scar);
    }
    const cord = [48, 34, 26];
    for ( let dx = -7; dx <= 7; dx++ ) {
      const y = chin + 1 + Math.round(4.4 * (1 - (dx / 7) ** 2));
      if ( F.has(CX + dx, y) ) F.put(CX + dx, y, cord);
      if ( dx === -4 || dx === 0 || dx === 4 ) { F.put(CX + dx, y + 1, [244, 238, 220]); F.put(CX + dx, y + 2, [214, 204, 180]); if ( dx === 0 ) F.put(CX, y + 3, [150, 140, 124]); }
    }
  },
  mage(c) {
    const {F, S} = c, g = S.glowc, chin = S.chin;
    for ( const ex of [26, 38] ) {
      glow(F, ex, EYE_Y, g, 3, 0.26); F.put(ex - 1, EYE_Y, mix(g, [255, 255, 255], 0.6)); F.put(ex + 1, EYE_Y, g);
      const sd = ex < CX ? -1 : 1;
      [[4, -2], [5, -3], [6, -5]].forEach(([dx, dy], i) => { const x = ex + sd * dx, y = EYE_Y + dy; F.put(x, y, mix(F.get(x, y) ?? S.bg, g, 0.75 - 0.2 * i)); });   // light curling off the eye
    }
    for ( let dx = -5; dx <= 5; dx++ ) { const y = chin + 1 + Math.round(6 * (1 - Math.abs(dx) / 5)); if ( F.has(CX + dx, y) ) F.put(CX + dx, y, [196, 170, 90]); }
    for ( const [dx, dy, col] of [[0, 7, g], [-1, 7, mix(g, [255, 255, 255], 0.6)], [0, 8, mix(g, [20, 20, 60], 0.35)], [-1, 8, g], [0, 9, mix(g, [20, 20, 60], 0.5)]] ) F.put(CX + dx, chin + dy, col);
  },
  wraith(c) {
    const {F, R, S} = c, chin = S.chin;
    for ( const ex of [26, 38] ) for ( let dx = -3; dx <= 3; dx++ ) for ( const dy of [-2, 2] ) if ( F.kindAt(ex + dx, EYE_Y + dy) === "skin" ) F.put(ex + dx, EYE_Y + dy, mix(R.s2, [20, 24, 40], 0.45));
    for ( let dx = -7; dx <= 7; dx++ ) {      // the Deathmark: a rope burn round the neck
      const y = chin + 1 + (Math.abs(dx) < 3 ? 1 : 0), k = F.kindAt(CX + dx, y);
      if ( k === "neck" || k === "skin" ) F.put(CX + dx, y, mod(dx, 3) ? [74, 50, 70] : [104, 66, 84]);
    }
    for ( let i = 0; i < N * N; i++ ) if ( F.px[i] ) { const y = Math.floor(i / N), f = Math.max(0, (y - 44) / 20); F.px[i] = mix(F.px[i], S.bg, 0.12 + 0.5 * f); }   // the corpus thins below
  },
  changeling(c) {
    const {F, R, S, sees} = c;
    if ( !sees.fae ) return;
    if ( S.horns ) {
      const M = S.hornDark ? {hi: [170, 150, 130], b: [120, 100, 88], s1: [84, 66, 60], s2: [60, 44, 44], ol: [30, 20, 24]} : {hi: [246, 236, 206], b: [214, 196, 158], s1: [160, 134, 104], s2: [110, 84, 70], ol: [52, 34, 34]};
      for ( const sd of [-1, 1] ) {
        const rx = CX + sd * 6, ry = 21;
        for ( let i = -2; i <= 2; i++ ) F.put(rx + i, ry + 1, R.s2);     // the seat: skin shaded where the horn breaks through
        horn(F, M, rx, ry, sd, S.hornLen);
        for ( let i = -1; i <= 1; i++ ) F.put(rx + i, ry, mix(M.s2, R.s2, 0.5));
      }
    }
    for ( const [x, y] of [[10, 14], [53, 20], [8, 40], [56, 46], [50, 9]] ) {     // glamour on the air
      F.put(x, y, [255, 240, 190]);
      if ( (x + y) % 2 === 0 ) for ( const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] ) F.put(x + dx, y + dy, [214, 180, 110]);
    }
  },
  hunter(c) {
    const {F, R, sees} = c, g = [255, 232, 150], b = 22;
    if ( sees.sigil ) {
      for ( const [dx, dy] of [[0, -3], [0, -2], [0, -1], [0, 0], [0, 1], [-2, -1], [-1, 0], [1, 0], [2, -1], [-1, 3], [0, 3], [1, 3]] ) if ( F.has(CX + dx, b + dy) ) F.put(CX + dx, b + dy, g);
      for ( let dx = -4; dx <= 4; dx++ ) for ( let dy = -5; dy <= 5; dy++ ) { const x = CX + dx, y = b + dy; if ( F.kindAt(x, y) === "skin" && !same(F.get(x, y), g) ) F.put(x, y, mix(F.get(x, y), g, 0.16)); }
    }
    for ( const ex of [26, 38] ) for ( const dx of [-2, -1, 0, 1] ) F.put(ex + dx, 34, R.s2);    // the wear of the vigil
  },
  mummy(c) {
    const {F, S} = c, k = [18, 14, 20], chin = S.chin;
    if ( c.eyes !== "shut" ) for ( const [ex, sd] of [[26, -1], [38, 1]] ) {
      for ( const i of [3, 4, 5] ) F.put(ex + sd * i, i < 5 ? EYE_Y : EYE_Y + 1, k);     // kohl drawn out to the temple
      F.put(ex - sd * 3, EYE_Y + 1, k); if ( c.eyes === "open" ) F.put(ex + 1, EYE_Y, [236, 190, 70]);     // a sun-gold fleck
    }
    const bands = [[214, 170, 60], [40, 150, 160], [214, 170, 60], [170, 50, 40], [236, 200, 90]];
    for ( let y = chin + 1; y < N; y++ ) for ( let x = 0; x < N; x++ ) {    // the broad collar
      const dx = x - CX, rr = (y - chin - 1) - 4.2 * (1 - Math.min(1, (dx / 15) ** 2)) + dx * dx / 90, kd = F.kindAt(x, y);
      if ( rr >= 0 && rr < 7.5 && Math.abs(dx) < 17 + (y - chin) && (kd === "cloth" || kd === "neck") && !(Math.abs(dx) < 6 && y < chin + 2) ) {
        const band = bands[Math.floor(rr / 1.5) % 5];
        F.put(x, y, (x + Math.floor(rr / 1.5)) % 3 ? band : mix(band, [40, 20, 20], 0.3));
      }
    }
  },
  demon(c) {
    const {F} = c, hot = [255, 214, 110], mid = [240, 120, 40], rim = [130, 30, 24], b = 21;
    const ring = [[-3, -1], [-3, 0], [-3, 1], [3, -1], [3, 0], [3, 1], [-1, -3], [0, -3], [1, -3], [-1, 3], [0, 3], [1, 3], [-2, -2], [2, -2], [-2, 2], [2, 2]];
    for ( const [dx, dy] of ring ) F.put(CX + dx, b + dy, mid);
    for ( const [dx, dy] of [[0, -1], [0, 0], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, 1]] ) F.put(CX + dx, b + dy, hot);    // the true name, still molten
    for ( let dx = -5; dx <= 5; dx++ ) for ( let dy = -5; dy <= 5; dy++ ) {
      const x = CX + dx, y = b + dy, c0 = F.get(x, y), dd = Math.hypot(dx, dy);
      if ( F.kindAt(x, y) === "skin" && !same(c0, mid) && !same(c0, hot) && dd < 5.2 ) F.put(x, y, mix(c0, rim, dd < 4.2 ? 0.42 : 0.2));
    }
    if ( c.eyes !== "shut" ) for ( const ex of [26, 38] ) glow(F, ex, EYE_Y, [255, 120, 40], 3, 0.3);
  },
  "kuei-jin"(c) {
    const {F} = c;
    if ( c.eyes !== "shut" ) for ( const ex of [26, 38] ) { glow(F, ex, EYE_Y, [90, 240, 168], 4, 0.4); if ( c.eyes === "open" ) F.put(ex - 1, EYE_Y, [190, 255, 220]); }
  }
};

/* ---------------- wounds ---------------- */
export const LEVEL_NAMES = ["Unhurt", "Bruised", "Hurt", "Injured", "Wounded", "Mauled", "Crippled", "Incapacitated"];
const BLOOD = [150, 22, 26], BLOOD2 = [104, 14, 22], BRUISE = [92, 52, 110];
/** The injury ladder: each level keeps the wounds of the one before and adds its own. No bandages. */
function wounds(c, level) {
  const {F, S} = c, sd = rng(seedOf(`${S.seed}|wounds`)).pick([-1, 1]), my = MOUTH_Y;
  const bruise = (cx, cy, rx, ry, a) => {
    for ( let dx = -rx; dx <= rx; dx++ ) for ( let dy = -ry; dy <= ry; dy++ ) {
      const x = cx + dx, y = cy + dy, col = F.get(x, y);
      if ( F.kindAt(x, y) === "skin" && (dx / (rx + 0.5)) ** 2 + (dy / (ry + 0.5)) ** 2 <= 1 && !same(col, BLOOD) && !same(col, BLOOD2) ) F.put(x, y, mix(col, BRUISE, a));
    }
  };
  const cut = (x, y, n, dx) => { for ( let i = 0; i < n; i++ ) if ( F.kindAt(x + dx * i, y + i) === "skin" ) F.put(x + dx * i, y + i, i === 0 || i === n - 1 ? BLOOD2 : BLOOD); };
  const run = (x, y, n) => { for ( let i = 0; i < n; i++ ) { const k = F.kindAt(x, y + i); if ( F.has(x, y + i) && (k === "skin" || k === "neck") ) F.put(x, y + i, i < n - 1 ? BLOOD : BLOOD2); } };
  if ( level >= 1 ) bruise(CX + sd * 8, 38, 2, 2, 0.34);                                          // Bruised
  if ( level >= 2 ) cut(CX - sd * 7, 25, 3, -sd);                                                  // Hurt: a nick over the brow
  if ( level >= 3 ) { bruise(sd < 0 ? 26 : 38, 33, 4, 2, 0.42); run(CX + sd * 3, my + 1, 2); }   // Injured: a black eye, a split lip
  if ( level >= 4 ) { cut(CX - sd * 10, 36, 4, sd); run(CX - sd * 7, 40, 3); }                   // Wounded: an open cheek
  if ( level >= 5 ) { run(CX - 1, 41, 3); cut(CX + sd * 2, 18, 4, sd); run(CX + sd * 5, 22, 4); } // Mauled: nose and scalp bleed
  if ( level >= 6 ) { bruise(CX - sd * 7, 46, 3, 2, 0.4); run(CX + sd * 3, my + 2, 5); cut(CX + sd * 9, 42, 3, -sd); }   // Crippled
  if ( level >= 7 ) { run(CX - 1, 43, 2); bruise(CX + sd * 5, 24, 3, 2, 0.35); }                // Incapacitated
  return sd;
}

/* ---------------- drawing a frame ---------------- */
/**
 * One frame of a person: {expr, eyes, mouth, level, sees}. mouth is null for the expression's own mouth, else one of
 * TALK_MOUTHS. sees = {fae, sigil}: whether the viewer may see a changeling's mien and a hunter's sigil.
 * Returns {rgba, expr, eyes, mouth, shut} where rgba is 64 by 64 RGBA bytes.
 */
/**
 * Extra features (face64-features.mjs registers them): {id: {tone(S), back(c), skin(c), face(c), ears(c), top(c), state}}. A
 * feature with a state shows only while opts.state[state] is on (a form, frenzy, a visage); "tears" is on while the face
 * grieves or fears.
 */
export const FEATURES = {};

/**
 * The Net (B2992): a character jacked in shows its own face redrawn as a persona on a screen, the heir of the ASCII
 * portraits in the pixel style: the same features in a few tones of one phosphor colour, scanlines, a faint rain of data
 * behind, one row slipped sideways. The colour is the persona's, rolled by seed unless set by hand.
 */
export const NET_PALETTES = {
  green: {name: "Green phosphor", ramp: [[4, 20, 10], [18, 70, 34], [40, 140, 70], [90, 210, 120], [190, 255, 200]]},
  amber: {name: "Amber phosphor", ramp: [[22, 12, 2], [80, 44, 8], [160, 96, 20], [230, 160, 50], [255, 226, 160]]},
  cyan: {name: "Cyan", ramp: [[2, 16, 24], [10, 60, 90], [24, 130, 170], [80, 210, 240], [200, 250, 255]]},
  violet: {name: "Violet", ramp: [[16, 4, 24], [60, 20, 90], [120, 50, 170], [190, 110, 240], [240, 210, 255]]},
  white: {name: "Ice white", ramp: [[10, 12, 18], [50, 56, 70], [110, 118, 140], [180, 190, 210], [245, 248, 255]]},
  red: {name: "Red", ramp: [[24, 4, 6], [90, 14, 20], [170, 30, 40], [240, 80, 80], [255, 200, 190]]}
};
export function netPaletteOf(S) {
  if ( S.net && NET_PALETTES[S.net] ) return S.net;
  return rng(seedOf(`${S.seed}|net`)).pick(["green", "green", "amber", "cyan", "violet", "white", "red"]);
}
function netRgba(F, S) {
  const ramp = NET_PALETTES[netPaletteOf(S)].ramp, r = rng(seedOf(`${S.seed}|net-rows`));
  const slip = 16 + Math.floor(r.next() * 36), rain = Array.from({length: N}, () => r.next() < 0.22 ? Math.floor(r.next() * N) : -1);
  const out = new Uint8ClampedArray(N * N * 4);
  for ( let y = 0; y < N; y++ ) for ( let x = 0; x < N; x++ ) {
    const sx = y === slip ? Math.min(N - 1, x + 1) : x, c = F.px[y * N + sx];
    let col;
    if ( c ) {
      const lum = (0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]) / 255;
      col = ramp[Math.max(1, Math.min(4, Math.round(Math.pow(lum, 0.8) * 4.4)))];
    } else {
      const k = rain[x];
      col = k >= 0 && (y - k + N) % N < 7 && y % 2 === 0 ? mix(ramp[0], ramp[1], 0.9 - ((y - k + N) % N) / 9) : (x % 4 === 0 && y % 4 === 0 ? mix(ramp[0], ramp[1], 0.35) : ramp[0]);
    }
    if ( y % 2 ) col = mix(col, [0, 0, 0], 0.28);
    const i = (y * N + x) * 4; out[i] = col[0]; out[i + 1] = col[1]; out[i + 2] = col[2]; out[i + 3] = 255;
  }
  return out;
}

export function drawFace(S, {expr = "neutral", eyes = "open", mouth = null, level = 0, sees = {fae: true, sigil: true}, state = {}, net = false} = {}) {
  level = Math.max(0, Math.min(7, Math.round(Number(level) || 0)));
  const on = {...state, tears: expr === "sorrow" || expr === "fear"};
  const feats = (S.features ?? []).map(id => FEATURES[id]).filter(f => f && (!f.state || on[f.state]));
  if ( feats.some(f => f.tone) ) { S = {...S}; for ( const f of feats ) f.tone?.(S); }
  const stage = (k, c) => { for ( const f of feats ) f[k]?.(c); };
  if ( !EXPRESSIONS.includes(expr) ) expr = "neutral";
  if ( level >= 7 ) { expr = "slack"; eyes = "shut"; mouth = null; }      // Incapacitated: eyes shut, jaw slack, no speech
  const mouthKind = TALK_MOUTHS.includes(mouth) ? mouth : expr;
  const skinCol = level ? mix(S.skin, [176, 180, 170], Math.min(0.5, level * 0.07)) : S.skin;    // pallor takes all the skin
  const F = new Grid(S.bg), shape = [TOP, EYE, JAW, S.chin, S.w, S.jw, S.cw];
  const R = ramp(skinCol, S.cool), H = hramp(S.hair), C = ramp(S.cloth, true);
  const r = rng(seedOf(`${S.seed}|marks`));
  const ctx = {F, R, H, C, S, r, shape, sees: {fae: true, sigil: true, ...sees}, eyes, mouthKind, expr, level};
  for ( let y = S.chin; y < N; y++ ) for ( let x = 0; x < N; x++ )
    if ( Math.abs(x - CX) <= 16 + (y - S.chin) * 2.6 && !(Math.abs(x - CX) < 7 - (y - S.chin - 2) * 0.9 && y < S.chin + 7) ) F.put(x, y, x < CX + 4 ? C.b : C.s1, "cloth");
  if ( S.style === "long" ) for ( let y = 40; y < N; y++ ) for ( let x = CX - S.w - 5; x <= CX + S.w + 5; x++ ) if ( !F.has(x, y) ) F.put(x, y, H.s2, "hair");   // hair behind the neck
  BACK[S.line]?.(ctx); stage("back", ctx);
  skin(F, R, shape, S.jw < 12 ? 6 : 7); cheeks(F, R, shape);
  if ( S.covered ) {}                   // a hood or veil hides the ears
  else if ( S.line === "nosferatu" ) nosEars(ctx);
  else if ( S.ears === "plain" ) {      // ears, tucked into the head
    const hw = Math.round(headHw(34, shape));
    for ( const sd of [-1, 1] ) for ( let dy = 0; dy < 6; dy++ ) for ( const k of [1, 2] ) {
      if ( k === 2 && (dy === 0 || dy === 5) ) continue;
      F.put(CX + sd * (hw + k), 32 + dy, (k === 1 && dy > 0 && dy < 5) ? R.s2 : sd < 0 ? R.b : R.s1, "skin");
    }
  }
  stage("skin", ctx);
  const lid = S.cool ? [26, 28, 40] : [30, 16, 22];
  for ( const [ex, sd] of [[26, -1], [38, 1]] ) {
    const state = (level >= 6 && sd > 0) ? "shut" : eyes;       // Crippled: one eye swollen shut
    eye(F, R, ex, EYE_Y, S.iris, sd, expr, state, {lid, white: S.white, sunk: S.sunk});
    if ( S.lash && state !== "shut" ) F.put(ex + 4 * sd, EYE_Y - 1, [30, 16, 22]);
    if ( S.line !== "nosferatu" || !S.ridge ) brow(F, ex, S.brow, sd, S.style === "bald" && S.line === "nosferatu" ? R.s2 : H.s2, expr);
  }
  nose(F, R, 31, 40, S.line === "nosferatu");
  const lip = S.thin ? R.s2 : mix(R.b, [150, 44, 60], S.lash ? 0.5 : 0.3);
  drawMouth(F, R, MOUTH_Y, lip, mouthKind, {fangs: S.fangs && S.line === "kindred", thin: S.thin});
  if ( S.beard ) beard(F, H, shape, MOUTH_Y, S.beard, OPEN_MOUTHS.has(mouthKind));
  stage("face", ctx);
  if ( S.style === "long" ) hairLong(F, H, shape);
  else if ( S.style === "short" ) hairShort(F, H, shape);
  else if ( S.style === "back" ) hairShort(F, H, shape, 2, 1);
  if ( !S.covered ) stage("ears", ctx);    // ears worn over the hair; kind "ear" shares the skin's outline, so no seam at the root
  F.outline(["skin", "neck", "ear"], R.ol); F.outline(["hair"], H.ol); F.outline(["cloth"], C.ol);
  for ( let x = CX - 13; x <= CX + 13; x++ ) for ( let y = 12; y < 29; y++ ) if ( F.kindAt(x, y) === "skin" && F.kindAt(x, y - 1) === "hair" ) F.put(x, y, R.s1);   // shade under the fringe
  POST[S.line]?.(ctx); stage("top", ctx);
  if ( level ) wounds(ctx, level);
  return {rgba: net ? netRgba(F, S) : F.rgba(), expr, eyes, mouth: TALK_MOUTHS.includes(mouth) ? mouth : null, shut: level >= 7};
}

/* ---------------- speaking and reacting ---------------- */
/** The mouth shape for one letter: open vowels wide, lip sounds nearly shut. null for a pause. */
export function mouthFor(ch) {
  const c = String(ch ?? "").toLowerCase();
  if ( /[aoáàâäåóòôö]/.test(c) ) return "talk2";
  if ( /[eiyéèêëíìîï]/.test(c) ) return "talk3";
  if ( /[a-zß-ÿ]/i.test(c) ) return /[lrh]/.test(c) ? "talk2" : "talk1";
  return null;
}
/**
 * The mouth over a spoken line, as steps {mouth, ms, shown}: two letters a step, a short rest at a comma and a longer
 * one at a full stop, the mouth closed in each rest. shown is how many characters of the line are out by then.
 */
export function speechSteps(text, {perChar = 45} = {}) {
  const s = String(text ?? "").replace(/\s+/g, " ").trim(), out = [];
  for ( let i = 0; i < s.length; ) {
    const ch = s[i];
    if ( /[,;:]/.test(ch) ) { out.push({mouth: null, ms: perChar * 5, shown: i + 1}); i++; continue; }
    if ( /[.!?…]/.test(ch) ) { out.push({mouth: null, ms: perChar * 9, shown: i + 1}); i++; continue; }
    // two letters a step, but never past a comma or a stop: those get their own rest
    const n = /[,;:.!?…]/.test(s[i + 1] ?? "") ? 1 : 2;
    out.push({mouth: mouthFor(ch) ?? mouthFor(s[i + 1]), ms: perChar * n, shown: Math.min(s.length, i + n)}); i += n;
  }
  out.push({mouth: null, ms: perChar * 6, shown: s.length});
  return out;
}
/** Milliseconds to the next blink: two to six seconds, unevenly, so a face never looks wound up. */
export const nextBlink = r => 2000 + Math.floor((typeof r === "function" ? r() : Math.random()) * 4000);
export const BLINK = [{eyes: "half", ms: 50}, {eyes: "shut", ms: 90}, {eyes: "half", ms: 50}];

export const SWAY_FACES = {charmed: "smile", persuaded: "smile", fooled: "smile", intimidated: "fear", bribed: "smirk"};
/**
 * How an NPC looks at the character it speaks to: a social roll that swayed it lately first, then frenzy, the mood
 * the Storyteller set, the attitude toward that character, and pain. Returns {expr, rest}: expr while speaking and
 * just after, rest once it settles.
 */
export function reactionFor({sway = "", frenzy = false, mood = "", step = 0, level = 0} = {}) {
  const rest = level >= 3 ? "sorrow" : "neutral";
  if ( level >= 7 ) return {expr: "slack", rest: "slack"};
  if ( frenzy ) return {expr: "anger", rest: "anger"};
  if ( SWAY_FACES[sway] ) return {expr: SWAY_FACES[sway], rest};
  const m = String(mood ?? "").toLowerCase();
  if ( /angry|furious|hostile/.test(m) ) return {expr: "anger", rest};
  if ( /afraid|scared|fear/.test(m) ) return {expr: "fear", rest};
  if ( /sad|grie|hurt/.test(m) ) return {expr: "sorrow", rest: "sorrow"};
  if ( /happy|glad|merry|warm/.test(m) ) return {expr: "smile", rest};
  if ( /wary|sly|mock|scorn/.test(m) ) return {expr: "smirk", rest};
  const st = Number(step) || 0;
  if ( st <= -2 ) return {expr: "anger", rest};
  if ( st === -1 ) return {expr: "smirk", rest};
  if ( st >= 2 ) return {expr: "smile", rest};
  return {expr: rest, rest};
}

/** Drawing helpers for face64-features.mjs. */
export const H = {mix, same, ramp, hramp, glow, stamp, horn, inTri, headHw, rng, seedOf, CX, EYE_Y, MOUTH_Y, OPEN_MOUTHS, hairShort, hairLong, eyeOpen};
