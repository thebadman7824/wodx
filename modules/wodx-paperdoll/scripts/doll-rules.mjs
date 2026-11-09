/**
 * WoDX Paperdoll: the rules. A look (face parts, colours, clothes, mood) becomes one picture of the head, shoulders
 * and chest inside the era's ring. Every garment edge comes from the anchors measured on that head (fit-rules.mjs),
 * so clothes always sit on the character. Carried things are never drawn. Pure functions: no Foundry here.
 */

export const MOD = "wodx-paperdoll";
export const LOOK_VERSION = 1;

/* ---- The face parts Lorelei offers ---- */
const run = (prefix, n) => Array.from({length: n}, (_, i) => `${prefix}${String(i + 1).padStart(2, "0")}`);
export const PARTS = {
  head: run("variant", 4), eyes: run("variant", 24), eyebrows: run("variant", 13), nose: run("variant", 6),
  mouth: [...run("happy", 18), ...run("sad", 9)], hair: run("variant", 48), beard: ["", ...run("variant", 2)],
  glasses: ["", ...run("variant", 5)], earrings: ["", ...run("variant", 3)]
};
export const PART_LABELS = {head: "Face shape", eyes: "Eyes", eyebrows: "Brows", nose: "Nose", mouth: "Mouth", hair: "Hair", beard: "Beard", glasses: "Spectacles", earrings: "Earrings"};

export const SKIN = {"f0d6bf": "Fair", "f2d3b1": "Light", "e0b590": "Warm", "c99a6e": "Olive", "a8754f": "Tan", "8d5a3b": "Brown", "6b4129": "Deep brown", "4a2c1d": "Dark", "d7d2c8": "Deathly pale"};
export const HAIR = {"1f1a17": "Black", "3b2a20": "Dark brown", "5a3a28": "Brown", "8a5a34": "Chestnut", "b5762f": "Auburn", "c9a15b": "Fair", "e2cf9a": "Flaxen", "9c9a96": "Grey", "efece6": "White"};
export const DYES = {"3f6b4c": "Green", "34558c": "Woad blue", "9c3b30": "Madder red", "b8463c": "Red", "c9a640": "Weld yellow", "cbbd9b": "Undyed wool", "6b4a32": "Brown", "2a2a2e": "Black", "5b3f6b": "Violet", "f3efe4": "White linen"};
export const METALS = {"d9b04c": "Gilt", "b8bcc2": "Silver", "8a6a3a": "Bronze", "4f4943": "Iron"};
export const HEADWEAR = {none: "Nothing", veil: "Veil and wimple", fillet: "Veil, wimple and fillet"};

/** Moods: brows and a mouth from Lorelei's own set. "own" keeps the character's chosen ones. */
export const MOODS = {
  own: {label: "The character's own"},
  disgruntled: {label: "Disgruntled", eyebrows: "variant13", mouth: "sad04"},
  upset: {label: "Upset", eyebrows: "variant01", mouth: "sad01"},
  grim: {label: "Grim", eyebrows: "variant12", mouth: "sad05"},
  snarling: {label: "Snarling", eyebrows: "variant13", mouth: "sad06"},
  unconscious: {label: "Eyes closed", eyes: "variant19", eyebrows: "variant12", mouth: "sad09"}
};

/* ---- The health track ---- */
export const LEVELS = ["bruised", "hurt", "injured", "wounded", "mauled", "crippled", "incapacitated"];
export const LEVEL_LABELS = ["Unhurt", "Bruised", "Hurt", "Injured", "Wounded", "Mauled", "Crippled", "Incapacitated"];
/** How far down the health track the character is: 0 unhurt, 1 Bruised ... 7 Incapacitated. */
export function healthLevel(health) {
  const d = health?.damage ?? {};
  let boxes = ["bashing", "lethal", "aggravated"].reduce((s, k) => s + (Number(d[k]) || 0), 0);
  if ( boxes <= 0 ) return 0;
  let lvl = 0;
  for ( let i = 0; i < LEVELS.length; i++ ) {
    const n = Math.max(0, Number(health?.[LEVELS[i]]?.total ?? health?.[LEVELS[i]]?.value ?? 1) || 0);
    if ( !n ) continue;
    lvl = i + 1; boxes -= n;
    if ( boxes <= 0 ) break;
  }
  return lvl;
}
/** The mood the face shows: Incapacitated closes the eyes; frenzy snarls; then the health track, when the face follows it. */
export function moodFor(look, {level = 0, frenzy = false, follow = true} = {}) {
  if ( follow && look?.followHealth !== false && level >= 7 ) return "unconscious";
  if ( frenzy && follow ) return "snarling";
  if ( follow && look?.followHealth !== false ) {
    if ( level >= 6 ) return "grim";
    if ( level >= 3 ) return "upset";
    if ( level >= 1 ) return look?.mood && look.mood !== "own" ? look.mood : "disgruntled";
  }
  return MOODS[look?.mood] ? look.mood : "own";
}

/* ---- A look ---- */
export function defaultLook(seed = "") {
  return {v: LOOK_VERSION, seed: String(seed),
    face: {head: "variant01", eyes: "variant05", eyebrows: "variant07", nose: "variant01", mouth: "happy05", hair: "variant02", beard: "", glasses: "", earrings: "", freckles: false},
    colors: {skin: "f0d6bf", hair: "5a3a28"},
    clothes: {gown: "3f6b4c", mantle: true, mantleColor: "34558c", lining: "b8463c", brooch: "d9b04c", headwear: "none", veil: "f3efe4"},
    mood: "own", followHealth: true, portrait: false};
}
const pick = (v, list, d) => list.includes(v) ? v : d;
const pickKey = (v, table, d) => Object.hasOwn(table, v) ? v : d;
/** A clean look: anything unknown goes back to the default, so a bad flag never breaks the picture. */
export function normalize(raw) {
  const d = defaultLook(raw?.seed ?? "");
  const f = raw?.face ?? {}, c = raw?.colors ?? {}, cl = raw?.clothes ?? {};
  const face = {};
  for ( const k of Object.keys(PARTS) ) face[k] = pick(f[k] ?? d.face[k], PARTS[k], d.face[k]);
  face.freckles = !!f.freckles;
  const hex = (v, table, dv) => (typeof v === "string" && /^[0-9a-f]{6}$/i.test(v)) ? v.toLowerCase() : (Object.hasOwn(table, v) ? v : dv);
  return {v: LOOK_VERSION, seed: String(raw?.seed ?? ""), face,
    colors: {skin: hex(c.skin, SKIN, d.colors.skin), hair: hex(c.hair, HAIR, d.colors.hair)},
    clothes: {gown: hex(cl.gown, DYES, d.clothes.gown), mantle: cl.mantle !== false, mantleColor: hex(cl.mantleColor, DYES, d.clothes.mantleColor),
      lining: hex(cl.lining, DYES, d.clothes.lining), brooch: pickKey(cl.brooch, METALS, d.clothes.brooch),
      headwear: pickKey(cl.headwear, HEADWEAR, "none"), veil: hex(cl.veil, DYES, d.clothes.veil)},
    mood: pickKey(raw?.mood, MOODS, "own"), followHealth: raw?.followHealth !== false, portrait: !!raw?.portrait};
}
/** Step a face part to the next or previous choice. */
export function step(look, part, by) {
  const list = PARTS[part]; if ( !list ) return look;
  const i = Math.max(0, list.indexOf(look.face[part]));
  return {...look, face: {...look.face, [part]: list[(i + by + list.length * 4) % list.length]}};
}
/** A random look from a seed (the same seed gives the same look). */
export function randomLook(seed) {
  let h = hash32(String(seed), 0x9e3779b9);
  const next = n => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h % n; };
  const l = defaultLook(seed);
  for ( const k of ["head", "eyes", "eyebrows", "nose", "hair"] ) l.face[k] = PARTS[k][next(PARTS[k].length)];
  l.face.mouth = PARTS.mouth[next(18)];
  l.colors.skin = Object.keys(SKIN)[next(8)];
  l.colors.hair = Object.keys(HAIR)[next(Object.keys(HAIR).length)];
  const dyes = Object.keys(DYES).filter(k => k !== "f3efe4");
  l.clothes.gown = dyes[next(dyes.length)];
  l.clothes.mantleColor = dyes[next(dyes.length)];
  return l;
}

/** Under a veil and wimple no hair shows, so the head is drawn with close hair the veil can lie on. */
export const CLOSE_HAIR = "variant02";
export const hairFor = look => look.clothes?.headwear && look.clothes.headwear !== "none" ? CLOSE_HAIR : look.face.hair;

/** The options DiceBear's Lorelei takes for this look and mood. key: draw it in key colours for measuring. */
export function loreleiOptions(look, mood = "own", {key = false} = {}) {
  const f = look.face, m = MOODS[mood] ?? MOODS.own;
  const o = {seed: look.seed || "wodx", head: [f.head], eyes: [m.eyes ?? f.eyes], eyebrows: [m.eyebrows ?? f.eyebrows], nose: [f.nose], mouth: [m.mouth ?? f.mouth], hair: [hairFor(look)],
    skinColor: [key ? "00ff00" : look.colors.skin], hairColor: [key ? "ff0000" : look.colors.hair],
    beardProbability: f.beard ? 100 : 0, glassesProbability: f.glasses ? 100 : 0, earringsProbability: f.earrings ? 100 : 0,
    frecklesProbability: f.freckles ? 100 : 0, hairAccessoriesProbability: 0};
  if ( f.beard ) o.beard = [f.beard];
  if ( f.glasses ) o.glasses = [f.glasses];
  if ( f.earrings ) o.earrings = [f.earrings];
  if ( key ) { o.mouth = ["happy05"]; o.eyebrows = ["variant07"]; o.frecklesProbability = 0; o.glassesProbability = 0; o.earringsProbability = 0; }
  return o;
}
/** What the measurement depends on: the same key means the same anchors. */
export const fitKey = look => [look.face.head, hairFor(look), look.face.beard].join("|");

/* ---- Hashing (file names for baked pictures) ---- */
export function hash32(s, seed = 0x811c9dc5) {
  let h = seed >>> 0;
  for ( let i = 0; i < s.length; i++ ) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
export const hashOf = s => hash32(s).toString(16).padStart(8, "0") + hash32(s, 0x1b873593).toString(16).padStart(8, "0");

/* ---- Drawing ---- */
const K = "#000", W = 14, w = 9;
const f0 = n => Math.round(n);
const ink = (d, fill = "none", sw = W) => `<path d="${d}" fill="${fill}" stroke="${K}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
const bez = (p0, p1, p2, p3, t) => { const u = 1 - t; return [0, 1].map(i => u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i]); };
const split = (c, t) => {
  const [p0, p1, p2, p3] = c, L = (a, b) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const a = L(p0, p1), b = L(p1, p2), cc = L(p2, p3), d = L(a, b), e = L(b, cc), f = L(d, e);
  return [f, e, cc, p3];
};
const xAtY = (c, y) => { let best = 0, bd = 1e9; for ( let t = 0; t <= 1; t += 0.002 ) { const q = bez(...c, t); if ( Math.abs(q[1] - y) < bd ) { bd = Math.abs(q[1] - y); best = q[0]; } } return best; };
const C = c => ` C${f0(c[1][0])} ${f0(c[1][1])} ${f0(c[2][0])} ${f0(c[2][1])} ${f0(c[3][0])} ${f0(c[3][1])}`;
const rev = c => [c[3], c[2], c[1], c[0]];
const through = pts => {
  let d = "";
  for ( let i = 0; i < pts.length - 1; i++ ) {
    const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)];
    d += ` C${f0(p1[0] + (p2[0] - p0[0]) / 6)} ${f0(p1[1] + (p2[1] - p0[1]) / 6)} ${f0(p2[0] - (p3[0] - p1[0]) / 6)} ${f0(p2[1] - (p3[1] - p1[1]) / 6)} ${f0(p2[0])} ${f0(p2[1])}`;
  }
  return d;
};
const hx = v => `#${v}`;
const BOT = 1400;

/** The shared lines every garment sits on: neckline and shoulder line, from the anchors. */
function frameOf(A) {
  const P = (x, y) => [x, y], mirror = c => c.map(([x, y]) => [2 * A.neckMid - x, y]);
  const nl = A.shoulder.l, nr = A.shoulder.r, dip = A.shoulder.dip;
  const neckL = [nl, P(nl[0] + 50, dip[1] - 6), P(dip[0] - 70, dip[1]), dip];
  const neckR = [dip, P(dip[0] + 70, dip[1]), P(nr[0] - 50, dip[1] - 6), nr];
  const shL = [nl, P(nl[0] - 90, nl[1] + 14), P(nl[0] - 160, nl[1] + 70), P(nl[0] - 182, nl[1] + 170)];
  const shR = mirror(shL);
  const armL = [shL[3], P(shL[3][0] - 26, shL[3][1] + 110), P(shL[3][0] - 40, 1250), P(shL[3][0] - 46, BOT)];
  return {P, mirror, nl, nr, dip, neckL, neckR, shL, shR, armL, armR: mirror(armL)};
}

/** Dark Ages, about 1200: a wool gown with a round neck; a mantle over the shoulders held by a ring brooch. */
export function gown(A, cl) {
  const {P, mirror, nl, dip, neckL, neckR, shL, shR, armL, armR} = frameOf(A);
  const out = [ink(`M${f0(armL[3][0])} ${BOT}` + C(rev(armL)) + C(rev(shL)) + C(neckL) + C(neckR) + C(shR) + C(armR) + " Z", hx(cl.gown)),
    ink(`M${f0(nl[0])} ${f0(nl[1])}` + C(neckL) + C(neckR), "none", w)];
  if ( !cl.mantle ) {
    out.push(ink(`M${f0(A.neckMid)} ${f0(dip[1] + 40)} C${f0(A.neckMid - 2)} 1150 ${f0(A.neckMid - 6)} 1300 ${f0(A.neckMid - 8)} ${BOT}`, "none", w));
    return out.join("");
  }
  const mL = split(shL, 0.33), mR = mirror(mL);
  const frontL = [mL[0], P(mL[0][0] + 26, mL[0][1] + 90), P(mL[0][0] + 50, 1200), P(mL[0][0] + 58, BOT)], frontR = mirror(frontL);
  const lin = 14, shift = (c, dx) => c.map(([x, y], i) => [x + (i ? dx : dx * 0.4), y]);
  const cy = dip[1] + 225, xl = xAtY(frontL, cy), xr = xAtY(frontR, cy);
  out.push(
    ink(`M${f0(mL[0][0])} ${f0(mL[0][1])}` + C(mL) + C(armL) + ` L${f0(frontL[3][0])} ${BOT}` + C(rev(frontL)) + " Z", hx(cl.mantleColor)),
    ink(`M${f0(mR[0][0])} ${f0(mR[0][1])}` + C(mR) + C(armR) + ` L${f0(frontR[3][0])} ${BOT}` + C(rev(frontR)) + " Z", hx(cl.mantleColor)),
    ink(`M${f0(frontL[0][0])} ${f0(frontL[0][1])}` + C(frontL) + ` L${f0(frontL[3][0] - lin)} ${BOT}` + C(rev(shift(frontL, -lin))) + " Z", hx(cl.lining), w),
    ink(`M${f0(frontR[0][0])} ${f0(frontR[0][1])}` + C(frontR) + ` L${f0(frontR[3][0] + lin)} ${BOT}` + C(rev(shift(frontR, lin))) + " Z", hx(cl.lining), w),
    ink(`M${f0(armL[0][0] + 40)} ${f0(armL[0][1] + 140)} C${f0(armL[0][0] + 50)} 1250 ${f0(armL[0][0] + 60)} 1330 ${f0(armL[0][0] + 64)} ${BOT}`, "none", w),
    ink(`M${f0(armR[0][0] - 40)} ${f0(armR[0][1] + 140)} C${f0(armR[0][0] - 50)} 1250 ${f0(armR[0][0] - 60)} 1330 ${f0(armR[0][0] - 64)} ${BOT}`, "none", w),
    ink(`M${f0(A.neckMid)} ${f0(cy + 50)} C${f0(A.neckMid - 2)} 1200 ${f0(A.neckMid - 6)} 1320 ${f0(A.neckMid - 8)} ${BOT}`, "none", w),
    ink(`M${f0(xl)} ${f0(cy)} C${f0(xl + 60)} ${f0(cy + 22)} ${f0(xr - 60)} ${f0(cy + 22)} ${f0(xr)} ${f0(cy)}`, "none", w),
    `<circle cx="${f0(A.neckMid)}" cy="${f0(cy + 16)}" r="26" fill="${hx(cl.brooch)}" stroke="${K}" stroke-width="${W}"/>`,
    `<circle cx="${f0(A.neckMid)}" cy="${f0(cy + 16)}" r="9" fill="${K}"/>`,
    `<path d="M${f0(A.neckMid)} ${f0(cy - 20)} L${f0(A.neckMid)} ${f0(cy + 52)}" stroke="${K}" stroke-width="${w}" stroke-linecap="round"/>`);
  return out.join("");
}

/** The fillet: a stiff pleated linen band standing upright on the crown, over the veil. */
export function filletBox(A) {
  const top = A.crown + 30, bottom = top + 86;
  // as wide as the veil where the band's lower edge meets it, never wider than the head
  let x0 = A.neckMid - 236, x1 = A.neckMid + 320;
  const T = A.headTop;
  for ( let i = 0; i < T.length - 1; i++ ) {
    const [ax, ay] = T[i], [bx, by] = T[i + 1];
    if ( (ay - bottom) * (by - bottom) > 0 || ay === by ) continue;
    const x = ax + (bx - ax) * (bottom - ay) / (by - ay);
    if ( x < A.neckMid + 42 ) x0 = Math.max(x0, x + 4); else x1 = Math.min(x1, x - 4);
  }
  return {x0, x1, top, bottom};
}

/**
 * Veil and wimple as two pieces, as worn about 1200. The wimple wraps the chin and throat, pinned up at the
 * temples, and lies over the gown; the veil follows the outline of head and hair down to the shoulders, over it.
 * Returns {svg, tops}: tops are the highest points drawn, for the ring check.
 */
export function headwear(A, cl) {
  if ( !cl.headwear || cl.headwear === "none" ) return {svg: "", tops: []};
  const {mirror, nr, neckL, neckR, shL} = frameOf(A);
  const F = A.face, TEMPLE = 470;
  const lowerIdx = F.map((p, i) => i).filter(i => F[i][1] >= TEMPLE);
  const lower = lowerIdx.map(i => F[i]);
  const iL = lowerIdx[lowerIdx.length - 1], iR = lowerIdx[0];
  const upper = [];
  { const a = F[iL], b = F[iR], peak = A.faceBox.y - 38; for ( let k = 0; k <= 12; k++ ) { const t = k / 12; upper.push([a[0] + (b[0] - a[0]) * t, (a[1] + (b[1] - a[1]) * t) - ((a[1] + b[1]) / 2 - peak) * Math.sin(Math.PI * t) ** 0.4]); } }
  const TR = lower[0], TL = lower[lower.length - 1];
  const tuck = 30;
  const drop = x => 42 * Math.max(0, 1 - Math.abs(x - A.neckMid) / (nr[0] - A.neckMid + 60)) ** 0.7;
  const onL = bez(...shL, 0.45), onR = [2 * A.neckMid - onL[0], onL[1]];
  const hemL = shL.map(([x, y]) => [x, y + tuck]), hemR = mirror(hemL);
  const nRr = rev(neckR).map(([x, y]) => [x, y + tuck + drop(x)]), nLr = rev(neckL).map(([x, y]) => [x, y + tuck + drop(x)]);
  const pinR = [TR[0] + 70, TR[1] - 110], pinL = [TL[0] - 70, TL[1] - 110];
  let wd = `M${f0(pinR[0])} ${f0(pinR[1])} L${f0(TR[0] + 4)} ${f0(TR[1] - 60)} L${f0(TR[0])} ${f0(TR[1])}` + through(lower) + ` L${f0(TL[0] - 4)} ${f0(TL[1] - 60)} L${f0(pinL[0])} ${f0(pinL[1])}`;
  wd += ` C${f0(pinL[0] - 40)} ${f0(pinL[1] + 120)} ${f0(onL[0] + 40)} ${f0(onL[1] - 120)} ${f0(onL[0])} ${f0(onL[1] + tuck)}`;
  wd += C(split(rev(hemL), 0.55)) + C(rev(nLr)) + C(rev(nRr)) + C(rev(split(rev(hemR), 0.55)));
  wd += ` C${f0(onR[0] - 40)} ${f0(onR[1] - 120)} ${f0(pinR[0] + 40)} ${f0(pinR[1] + 120)} ${f0(pinR[0])} ${f0(pinR[1])} Z`;
  const chin = lower.filter(([x]) => x > TL[0] + 60 && x < TR[0] - 60);
  const pleats4 = [0.2, 0.4, 0.6, 0.8].map(t => chin[Math.round(t * (chin.length - 1))]).filter(Boolean).map(([x, y]) => {
    const dx = x - A.neckMid, dy = y - 520, m = Math.hypot(dx, dy) || 1, ux = dx / m, uy = dy / m;
    const a = [x + ux * 30, y + uy * 30], b = [x + ux * 78, y + uy * 78], bend = [(a[0] + b[0]) / 2 + uy * 8, (a[1] + b[1]) / 2 - ux * 8];
    return `<path d="M${f0(a[0])} ${f0(a[1])} Q${f0(bend[0])} ${f0(bend[1])} ${f0(b[0])} ${f0(b[1])}" stroke="${K}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
  }).join("");

  const top = A.headTop, L0 = top[0], R0 = top[top.length - 1];
  const tan = (p, q, k) => { const dx = p[0] - q[0], dy = p[1] - q[1], m = Math.hypot(dx, dy) || 1; return [p[0] + dx / m * k, p[1] + dy / m * k]; };
  const cR = tan(R0, top[top.length - 2], 140), cL = tan(L0, top[1], 140);
  const outR = [onR[0] + 20, onR[1] + 14], outL = [onL[0] - 20, onL[1] + 14];
  const inR = [onR[0] - 34, onR[1] + 22], inL = [onL[0] + 34, onL[1] + 22];
  const tR = [TR[0] + 8, TR[1] - 40], tL = [TL[0] - 8, TL[1] - 40];
  let vd = `M${f0(L0[0])} ${f0(L0[1])}` + through(top);
  vd += ` C${f0(cR[0])} ${f0(cR[1])} ${f0(outR[0] + 10)} ${f0(outR[1] - 160)} ${f0(outR[0])} ${f0(outR[1])} L${f0(inR[0])} ${f0(inR[1])}`;
  vd += ` C${f0(inR[0])} ${f0(inR[1] - 220)} ${f0(tR[0] + 70)} ${f0(tR[1] + 60)} ${f0(tR[0])} ${f0(tR[1])}`;
  vd += ` L${f0(upper[upper.length - 2][0])} ${f0(upper[upper.length - 2][1])}` + through(upper.slice(1, -1).reverse()) + ` L${f0(tL[0])} ${f0(tL[1])}`;
  vd += ` C${f0(tL[0] - 70)} ${f0(tL[1] + 60)} ${f0(inL[0])} ${f0(inL[1] - 220)} ${f0(inL[0])} ${f0(inL[1])} L${f0(outL[0])} ${f0(outL[1])}`;
  vd += ` C${f0(outL[0] - 10)} ${f0(outL[1] - 160)} ${f0(cL[0])} ${f0(cL[1])} ${f0(L0[0])} ${f0(L0[1])} Z`;
  const vfold = s => { const o = s > 0 ? outR : outL, t = s > 0 ? R0 : L0;
    return ink(`M${f0(t[0] - s * 46)} ${f0(t[1] + 40)} C${f0(t[0] - s * 40)} ${f0(t[1] + 200)} ${f0(o[0] - s * 40)} ${f0(o[1] - 160)} ${f0(o[0] - s * 52)} ${f0(o[1] - 8)}`, "none", w); };
  const parts = [ink(wd, "#fbfaf6"), pleats4, ink(vd, hx(cl.veil)), vfold(1), vfold(-1)];
  const tops = top.slice();
  if ( cl.headwear === "fillet" ) {
    const b = filletBox(A), N = 16, lo = [], hi = [];
    for ( let k = 0; k <= N; k++ ) { const t = k / N, s = Math.sin(Math.PI * t), x = b.x0 + (b.x1 - b.x0) * t; lo.push([x, b.bottom + 16 * s]); hi.push([x, b.top - 8 * s]); }
    parts.push(ink(`M${f0(lo[0][0])} ${f0(lo[0][1])}` + through(lo) + ` L${f0(hi[N][0])} ${f0(hi[N][1])}` + through(hi.slice().reverse()) + " Z", "#ffffff"));
    parts.push(lo.map((p, i) => i === 0 || i === N ? "" : `<path d="M${f0(p[0])} ${f0(p[1] - 6)} L${f0(hi[i][0])} ${f0(hi[i][1] + 6)}" stroke="${K}" stroke-width="5" stroke-linecap="round"/>`).join(""));
    tops.push(...hi);
  }
  return {svg: parts.join(""), tops};
}

/**
 * Marks of the health track, drawn on the skin under clothes and veil, kept inside the measured face outline.
 * Placed by fractions of the face's box, so they sit the same on every face shape. House rule art: one set per level.
 */
export function damageMarks(A, level) {
  if ( !level ) return "";
  const B = A.faceBox, X = fx => f0(B.x + B.w * fx), Y = fy => f0(B.y + B.h * fy), S = v => f0(v * B.w / 400);
  const out = [];
  const blood = "#9a2a22", cut = (a, b, c, d, wd = 6) => `<path d="M${X(a)} ${Y(b)} L${X(c)} ${Y(d)}" stroke="${blood}" stroke-opacity=".85" stroke-width="${wd}" stroke-linecap="round"/>`;
  // Bruised: a soft bruise on one cheekbone and a light graze over the other brow
  const deep = level >= 3 ? 0.75 : 0.55;
  out.push(`<ellipse cx="${X(0.19)}" cy="${Y(0.54)}" rx="${S(62 + 6 * Math.min(level, 5))}" ry="${S(44 + 4 * Math.min(level, 5))}" fill="url(#wpd-bruise)" transform="rotate(-12 ${X(0.19)} ${Y(0.54)})"/>`);
  out.push(`<ellipse cx="${X(0.7)}" cy="${Y(0.05)}" rx="${S(46)}" ry="${S(26)}" fill="#c96a5c" fill-opacity=".25" transform="rotate(-18 ${X(0.7)} ${Y(0.05)})"/>`);
  for ( const [a, b, c, d] of [[0.67, 0.04, 0.8, 0], [0.68, 0.07, 0.83, 0.03], [0.71, 0.1, 0.82, 0.07]] )
    out.push(`<path d="M${X(a)} ${Y(b)} L${X(c)} ${Y(d)}" stroke="#b5483e" stroke-opacity=".7" stroke-width="5" stroke-linecap="round"/>`);
  // Hurt: a split lip at the corner of the mouth
  if ( level >= 2 ) out.push(cut(0.4, 0.7, 0.42, 0.75, 7), `<circle cx="${X(0.42)}" cy="${Y(0.77)}" r="${S(5)}" fill="${blood}"/>`);
  // Injured: a black eye round the bruised side
  if ( level >= 3 ) out.push(`<ellipse cx="${X(0.27)}" cy="${Y(0.37)}" rx="${S(70)}" ry="${S(46)}" fill="url(#wpd-blackeye)"/>`);
  // Wounded: a cut over the brow, bleeding down the temple
  if ( level >= 4 ) out.push(cut(0.62, 0.12, 0.86, 0.04, 8), `<path d="M${X(0.86)} ${Y(0.05)} C${X(0.88)} ${Y(0.14)} ${X(0.86)} ${Y(0.22)} ${X(0.88)} ${Y(0.3)}" stroke="${blood}" stroke-opacity=".8" stroke-width="${S(9)}" stroke-linecap="round" fill="none"/>`);
  // Mauled: a second cut across the cheek, and the colour going from the face
  if ( level >= 5 ) out.push(cut(0.62, 0.5, 0.78, 0.62, 7), `<rect x="${B.x - 40}" y="${B.y - 40}" width="${B.w + 80}" height="${B.h + 80}" fill="#d9d7cf" fill-opacity="${level >= 7 ? 0.32 : level >= 6 ? 0.24 : 0.14}"/>`);
  // Crippled: a linen bandage across the brow
  if ( level >= 6 ) out.push(`<path d="M${X(-0.1)} ${Y(0.08)} C${X(0.3)} ${Y(-0.02)} ${X(0.7)} ${Y(-0.02)} ${X(1.1)} ${Y(0.1)} L${X(1.1)} ${Y(0.19)} C${X(0.7)} ${Y(0.07)} ${X(0.3)} ${Y(0.07)} ${X(-0.1)} ${Y(0.17)} Z" fill="#efe8d8" stroke="${K}" stroke-width="${w}" stroke-linejoin="round"/>`,
    `<ellipse cx="${X(0.78)}" cy="${Y(0.1)}" rx="${S(16)}" ry="${S(10)}" fill="${blood}" fill-opacity=".7"/>`);
  const defs = `<radialGradient id="wpd-bruise" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#6e4a86" stop-opacity="${deep}"/><stop offset=".6" stop-color="#8d5a7e" stop-opacity="${deep - 0.2}"/><stop offset="1" stop-color="#b9ad5c" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="wpd-blackeye" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#3a2440" stop-opacity="0"/><stop offset=".45" stop-color="#3a2440" stop-opacity=".55"/><stop offset=".75" stop-color="#5b3a66" stop-opacity=".35"/><stop offset="1" stop-color="#5b3a66" stop-opacity="0"/></radialGradient>`;
  return `<defs>${defs}<clipPath id="wpd-face"><path d="${A.facePath}"/></clipPath></defs><g clip-path="url(#wpd-face)">${out.join("")}</g>`;
}

/* ---- The ring ---- */
export const DEFAULT_FRAME = {kit: "dark-ages", shape: "round", color: 0x4f4943, double: true, width: 0.045};
const V = 1360;
/** Where the picture sits: centred on the face, lowered when headwear would cross the ring. */
export function cropFor(A, frame, tops = [], margin = 30) {
  const lw = V * (frame.width ?? 0.045), r = V / 2, x0 = f0(A.neckMid + 42 - r);
  const inner = r - lw * (frame.double ? 1.6 : 1) - lw / 6 - margin;
  const clearance = y0 => {
    let worst = Infinity;
    for ( const [x, y] of tops ) {
      const c = frame.shape === "round" ? inner - Math.hypot(x - (x0 + r), y - (y0 + r)) : (y - (y0 + r - inner));
      worst = Math.min(worst, c);
    }
    return worst;
  };
  let y0 = -70;
  while ( clearance(y0) < 0 && y0 > -260 ) y0 -= 10;
  return {x0, y0, lw, r, clearance: tops.length ? clearance(y0) : Infinity};
}
const hexColor = n => typeof n === "number" ? `#${n.toString(16).padStart(6, "0")}` : String(n);
const GROUND = {"dark-ages": "#2b2f36", "victorian": "#2e2a33", "modern": "#2a2e33"};

/**
 * The whole picture as SVG. head: Lorelei's drawing (the inner part of its SVG). ring: draw the ring in (when
 * the token frames of WoDX Atmosphere are not drawing it). Returns {svg, crop}.
 */
export function compose({look, head, anchors: A, frame = DEFAULT_FRAME, ring = true, level = 0}) {
  const hw = headwear(A, look.clothes);
  const crop = cropFor(A, frame, hw.tops);
  const {x0, y0, lw, r} = crop;
  const clip = frame.shape === "round" ? `<circle cx="${x0 + r}" cy="${y0 + r}" r="${r - lw}"/>`
    : `<rect x="${x0 + lw}" y="${y0 + lw}" width="${V - 2 * lw}" height="${V - 2 * lw}" rx="${V * 0.08}"/>`;
  const col = hexColor(frame.color);
  let ringSvg = "";
  if ( ring ) {
    ringSvg = frame.shape === "round" ? `<circle cx="${x0 + r}" cy="${y0 + r}" r="${r - lw / 2}" fill="none" stroke="${col}" stroke-width="${lw}"/>`
      : `<rect x="${x0 + lw / 2}" y="${y0 + lw / 2}" width="${V - lw}" height="${V - lw}" rx="${V * 0.08}" fill="none" stroke="${col}" stroke-width="${lw}"/>`;
    if ( frame.double ) ringSvg += frame.shape === "round" ? `<circle cx="${x0 + r}" cy="${y0 + r}" r="${r - lw * 1.6}" fill="none" stroke="${col}" stroke-opacity=".7" stroke-width="${lw / 4}"/>`
      : `<rect x="${x0 + lw * 1.6}" y="${y0 + lw * 1.6}" width="${V - lw * 3.2}" height="${V - lw * 3.2}" rx="${V * 0.07}" fill="none" stroke="${col}" stroke-opacity=".7" stroke-width="${lw / 4}"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${V} ${V}" width="512" height="512">`
    + `<defs><clipPath id="wpd-clip">${clip}</clipPath></defs><g clip-path="url(#wpd-clip)">`
    + `<rect x="${x0}" y="${y0}" width="${V}" height="${V}" fill="${GROUND[frame.kit] ?? GROUND["dark-ages"]}"/>`
    + `<g>${head}</g>${damageMarks(A, level)}${gown(A, look.clothes)}${hw.svg}</g>${ringSvg}</svg>`;
  return {svg, crop};
}
/** Lorelei's SVG without its outer tag and metadata, to place inside the picture. */
export const innerSvg = s => String(s).replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "").replace(/<metadata>[\s\S]*?<\/metadata>/, "");

/** The key for one baked picture: everything that changes what is drawn. */
export function bakeKey({look, mood, level, frame, ring}) {
  const l = normalize(look);
  return hashOf(JSON.stringify([LOOK_VERSION, l.seed, l.face, l.colors, l.clothes, mood, level, frame?.kit, frame?.shape, frame?.color, !!ring]));
}
