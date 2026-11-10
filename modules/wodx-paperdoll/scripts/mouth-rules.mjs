/**
 * The mouth, drawn by WoDX itself and fitted to each face, as the eyes are: Lorelei's own mouth stays in the
 * drawing that is measured, but the picture shows this one.
 *
 * The mouth sits under the nose and between the pupils that were found on the face. Its shape is a parting line
 * from corner to corner; the upper lip rises from it to two peaks with a dip between them (the bow), and the lower
 * lip, fuller, swells below it. Each edge is sampled and joined by smooth curves, so no corner is ragged. An open
 * mouth has a dark inside and may show teeth. Shading: a darker upper lip, light on the lower one, a soft shadow
 * under it on the skin, and a fine crease at each corner, so the mouth lies in the face and not on top of it.
 */
import * as FR from "./face-rules.mjs";

/**
 * Expressions: smile lifts the corners (px; below 0 they fall), tilt lifts the right corner and drops the left,
 * open parts the lips at the middle, teeth shows the upper row ("up") or both ("both"), w is the width, full the
 * lower lip, thin the upper lip, lift raises the middle of the upper lip (a snarl).
 * The keys are Lorelei's mouth names, so a saved look keeps its mouth; snarl and slack belong to moods.
 */
export const EXPRESSIONS = {
  happy01: {label: "Half smile", smile: 4, tilt: 4},
  happy02: {label: "At rest", smile: 1},
  happy03: {label: "Lips parted", smile: 1, open: 5},
  happy04: {label: "Content", smile: 3, w: 1.04},
  happy06: {label: "Broad smile", smile: 16, open: 16, teeth: "up", w: 1.18},
  happy10: {label: "Wry", smile: 0, tilt: -5, w: 1.04},
  happy13: {label: "Small and round", smile: 0, open: 8, w: 0.66},
  happy14: {label: "Small smirk", smile: 3, tilt: 4, w: 0.84},
  happy18: {label: "Pouting", smile: -1, open: 4, w: 0.9, full: 1.15},
  sad03: {label: "Small frown", smile: -9, w: 0.7},
  sad04: {label: "Frown", smile: -13, w: 0.95},
  sad05: {label: "Set and grim", smile: -4, w: 1.1, full: 0.8, thin: 0.75},
  sad09: {label: "Slack", smile: -2, open: 4, w: 0.86},
  snarl: {label: "Snarl", smile: -4, open: 18, teeth: "both", w: 1.1, lift: 9, thin: 0.85},
  slack: {label: "Slack", smile: -3, open: 5, w: 0.84}
};
/** The mouths a random face is given: at rest, with no broad smile and no frown. */
export const RESTING = ["happy01", "happy02", "happy02", "happy03", "happy04", "happy10", "happy13", "happy14", "happy18", "sad05"];
const BASE = {smile: 0, tilt: 0, open: 0, teeth: "", w: 1, full: 1, thin: 1, lift: 0, bow: 1};
/**
 * Lip shapes, the character's own, laid over the expression: w the width, thin the upper lip, full the lower,
 * bow the depth of the dip in the upper lip, size the whole mouth.
 */
export const LIP_SHAPES = {
  "": {label: "Even"}, thin: {label: "Thin", thin: 0.6, full: 0.65}, full: {label: "Full", thin: 1.3, full: 1.35},
  wide: {label: "Wide", w: 1.2, thin: 0.9, full: 0.9}, small: {label: "Small", w: 0.76, size: 0.9, full: 1.1}, bowed: {label: "Bowed", bow: 1.9, thin: 1.15},
  pouting: {label: "Full lower lip", thin: 0.8, full: 1.5}, heavy: {label: "Full upper lip", thin: 1.45, full: 0.9}, straight: {label: "Straight", bow: 0.15, thin: 0.85, full: 0.85},
  broad: {label: "Wide and full", w: 1.16, thin: 1.25, full: 1.3}, narrow: {label: "Narrow and full", w: 0.82, thin: 1.2, full: 1.35}, firm: {label: "Firm", thin: 0.7, full: 0.95, bow: 0.6}
};
const h32 = str => { let h = 0x811c9dc5; for ( let i = 0; i < str.length; i++ ) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
/** The character's lips: the chosen shape, nudged a little by the seed so no two mouths are quite alike. */
export function lipsOf(look) {
  const L = {w: 1, thin: 1, full: 1, bow: 1, size: 1, ...(LIP_SHAPES[look?.face?.lips] ?? {})};
  let h = h32(`lips ${look?.seed ?? ""}`);
  const j = amt => { h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0; return 1 + ((h % 2001) / 1000 - 1) * amt; };
  // Women's lips a little fuller, men's a little thinner; a nonbinary face goes either way by its seed
  const g = look?.face?.gender, side = g === "nonbinary" ? (h32(`side ${look?.seed ?? ""}`) % 2 ? "woman" : "man") : g;
  const by = {woman: 1.16, man: 0.88}[side] ?? 1;
  return {w: L.w * j(0.09), thin: L.thin * by * j(0.14), full: L.full * by * j(0.14), bow: L.bow * j(0.3), size: L.size * j(0.05)};
}
export const expression = key => ({...BASE, ...(EXPRESSIONS[key] ?? EXPRESSIONS.happy02)});

const f1 = n => +n.toFixed(1);
/** A smooth closed or open path through points (Catmull-Rom as cubic Bezier). */
function smooth(pts, close = false) {
  const P = close ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M${f1(P[1][0])} ${f1(P[1][1])}`;
  for ( let i = 1; i < P.length - 2; i++ ) {
    const [a, b, c, e] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    d += ` C${f1(b[0] + (c[0] - a[0]) / 6)} ${f1(b[1] + (c[1] - a[1]) / 6)} ${f1(c[0] - (e[0] - b[0]) / 6)} ${f1(c[1] - (e[1] - b[1]) / 6)} ${f1(c[0])} ${f1(c[1])}`;
  }
  return d + (close ? " Z" : "");
}

/**
 * Where the mouth goes, in the picture's own space with the build taken out (as findEyes gives it). Lorelei puts
 * every mouth in the same place whatever the eyes and nose, so this mouth goes there too: the middle of where
 * Lorelei's resting mouths sit, measured on its drawings (the parting at 630, centred on 562, under the nose, 66 to each side).
 * The build then stretches it with the rest of the face. eyes is kept for callers; it does not move the mouth.
 */
export const MOUTH_AT = {cx: 562, cy: 630, hw: 66};
export function mouthPlace(eyes = null) { return {...MOUTH_AT}; }

/** The outlines of a mouth, in the picture's space (build out), from an expression and a place. */
export function mouthShape(expr, place, lips = null) {
  const e0 = typeof expr === "string" ? expression(expr) : {...BASE, ...expr}, l = lips ?? {};
  // Shape and expression together are held to what fits the narrowest face (checked by the mouth stage)
  const cap = (v, hi) => Math.min(hi, v);
  const e = {...e0, w: cap(e0.w * (l.w ?? 1) * (l.size ?? 1), 1.28), thin: cap(e0.thin * (l.thin ?? 1) * (l.size ?? 1), 1.6), full: cap(e0.full * (l.full ?? 1) * (l.size ?? 1), 1.65), bow: e0.bow * (l.bow ?? 1)};
  const {cx, cy} = place, hw = place.hw * e.w;
  const n = 14, T = Array.from({length: 2 * n + 1}, (_, i) => -1 + i / n);
  const L = e.smile - e.tilt, R = e.smile + e.tilt;
  // The parting: corners lifted by the smile, the middle sagging under it
  const part = t => cy - ((1 - t) / 2 * L + (1 + t) / 2 * R) + e.smile * 0.92 * (1 - Math.pow(Math.abs(t), 2.6));
  const gap = t => e.open * Math.pow(1 - t * t, 0.9);
  const tU = 10 * e.thin, tL = 14.5 * e.full;
  const bow = t => Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t), 2.2)), 0.7) * (1 - Math.min(0.6, 0.3 * e.bow) * Math.exp(-((t / 0.13) ** 2)));
  const swell = t => Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t), 2.4)), 0.8);
  const X = t => cx + hw * t;
  // The upper lip's inner edge lifts by a third of the opening; the lower drops by the rest
  const upIn = t => part(t) - gap(t) * 0.35 - e.lift * Math.pow(1 - t * t, 2), loIn = t => part(t) + gap(t) * 0.65;
  const upOut = t => upIn(t) - tU * bow(t) - e.lift * 0.4 * Math.pow(1 - t * t, 2), loOut = t => loIn(t) + tL * swell(t);
  const pts = f => T.map(t => [X(t), f(t)]);
  const upper = [...pts(upOut), ...pts(upIn).reverse().slice(1, -1)];
  const lower = [...pts(loIn), ...pts(loOut).reverse().slice(1, -1)];
  const inside = e.open ? [...pts(upIn), ...pts(loIn).reverse().slice(1, -1)] : null;
  const ys = [...upper, ...lower].map(p => p[1]);
  return {e, hw, cx, cy, part: smooth(pts(part)), upper: smooth(upper, true), lower: smooth(lower, true), inside: inside ? smooth(inside, true) : null,
    upIn: smooth(pts(upIn)), loIn: smooth(pts(loIn)), corners: [[X(-1), part(-1)], [X(1), part(1)]],
    lowY: cy + Math.max(...T.map(t => loOut(t) - cy)), box: {x0: cx - hw, x1: cx + hw, y0: Math.min(...ys), y1: Math.max(...ys)},
    X, T, upInF: upIn, loInF: loIn, loOutF: loOut, partF: part, mid: {up: upIn(0), lo: loIn(0)}};
}

/** A tapered ink line along points: full width in the middle, thin at the ends, as the eyes and nose are drawn. */
function taper(pts, wd, end = 0.25) {
  const n = pts.length - 1, L = [], R = [];
  for ( let i = 0; i <= n; i++ ) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const t = i / n * 2 - 1, w = wd * (end + (1 - end) * Math.pow(1 - Math.abs(t), 0.6)) / 2;
    L.push([pts[i][0] - dy / len * w, pts[i][1] + dx / len * w]); R.push([pts[i][0] + dy / len * w, pts[i][1] - dx / len * w]);
  }
  return smooth([...L, ...R.reverse()], true);
}
/**
 * The mouth as SVG for Lorelei's inner drawing (its paths sit in translate(10 -60), so the place is moved into it).
 * Drawn in the manner of the rest of the face: flat colour, a darker upper lip, one small flat light, and the
 * parting as a tapered sepia ink line like the eyes. lips: the lip colour, skin: the skin, shape: lipsOf(look).
 */
export function mouthSvg(expr, place, {lips, skin, shape = null, id = "wpd-m"}) {
  const S = mouthShape(expr, {...place, cx: place.cx - 10, cy: place.cy + 60}, shape), e = S.e;
  // The lip colour leans toward the skin, so lips read as lips and not as paint; the ink line does the defining
  const lip = FR.mix(lips, skin, 0.35), upper = FR.mix(lip, "1a0608", 0.16), ink = "2a1a10", lite = FR.mix(lip, "ffffff", 0.22), under = FR.mix(skin, "2a1408", 0.32);
  let s = S.inside ? `<defs><clipPath id="${id}-in"><path d="${S.inside}"/></clipPath></defs>` : "";
  // a short stroke of shade under the lower lip, as the nose is drawn
  const sh = [-0.32, -0.12, 0.12, 0.32].map(t => [S.X(t), S.loOutF(t) + 7 - 3 * (1 - Math.abs(t) * 2.5) * 0]);
  s += `<path d="${taper(sh, 5, 0.1)}" fill="#${under}" fill-opacity=".55"/>`;
  if ( S.inside ) {
    s += `<path d="${S.inside}" fill="#${FR.mix(lips, "12040a", 0.75)}"/>`;
    if ( e.teeth ) {
      const h = Math.min(14, e.open * 0.62), tooth = "f2ead8", ts = [];
      const row = (edge, sign, span, hh) => { const top = [], bot = [];
        for ( let i = 0; i <= 12; i++ ) { const t = -span + 2 * span * i / 12, y = edge(t), k = Math.sqrt(Math.max(0, 1 - (t / span) ** 2));
          top.push([S.X(t), y - sign * 4]); bot.push([S.X(t), y + sign * hh * (0.55 + 0.45 * k)]); }
        return smooth([...top, ...bot.reverse()], true); };
      ts.push(`<path d="${row(S.upInF, 1, 0.78, h)}" fill="#${tooth}"/>`);
      if ( e.teeth === "both" ) ts.push(`<path d="${row(S.loInF, -1, 0.7, h * 0.75)}" fill="#${FR.mix(tooth, "1a0608", 0.08)}"/>`);
      s += `<g clip-path="url(#${id}-in)">${ts.join("")}</g>`;
    }
  }
  s += `<path d="${S.lower}" fill="#${lip}"/>`;
  // one flat light on the lower lip
  const hl = [-0.3, -0.1, 0.1, 0.25].map(t => [S.X(t + 0.05), (S.loInF(t) + S.loOutF(t)) / 2 + 1]);
  s += `<path d="${taper(hl, Math.max(3, (S.lowY - S.mid.lo) * 0.28), 0.2)}" fill="#${lite}" fill-opacity=".5"/>`;
  s += `<path d="${S.upper}" fill="#${upper}"/>`;
  // the ink: the parting (or the edges of an open mouth), tapered, with the corners tucked in
  const along = f => S.T.map(t => [S.X(t), f(t)]);
  if ( S.inside ) s += `<path d="${taper(along(S.upInF), 5.5, 0.35)}" fill="#${ink}"/><path d="${taper(along(S.loInF), 3, 0.3)}" fill="#${ink}" fill-opacity=".8"/>`;
  else s += `<path d="${taper(along(S.partF), 6, 0.3)}" fill="#${ink}"/>`;
  for ( const [i, [x, y]] of S.corners.entries() ) {
    const dx = i ? 1 : -1, c = i ? e.smile + e.tilt : e.smile - e.tilt, lift = c > 3 ? -1 : c < -3 ? 1 : 0;
    s += `<path d="${taper([[x - dx * 2, y], [x + dx * 3, y + lift * 1.5], [x + dx * 6, y + lift * 5]], 3.5, 0.2)}" fill="#${ink}"/>`;
  }
  return `<g class="wpd-mouth">${s}</g>`;
}

/** The mouth's outline alone, for the mask of visible skin (inner drawing, like mouthSvg). */
export function mouthSilhouette(expr, place, fill = "#010101", shape = null) {
  const S = mouthShape(expr, {...place, cx: place.cx - 10, cy: place.cy + 60}, shape);
  return `<path d="${S.upper}" fill="${fill}"/><path d="${S.lower}" fill="${fill}"/>${S.inside ? `<path d="${S.inside}" fill="${fill}"/>` : ""}`;
}
/** Is a point inside a polygon of [x, y] points? */
const inPoly = ([x, y], poly) => { let c = false; for ( let i = 0, j = poly.length - 1; i < poly.length; j = i++ ) { const [xi, yi] = poly[i], [xj, yj] = poly[j];
  if ( (yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi ) c = !c; } return c; };
/**
 * The check for the mouth's stage: corners and the lowest point of the lower lip lie inside the face outline (in the
 * build), with room to spare. face: the measured outline; build: {sx, sy}.
 */
export function mouthFits(S, face, {sx = 1, sy = 1} = {}, margin = 14) {
  if ( !face?.length ) return false;
  const B = ([x, y]) => [490 + (x - 490) * sx, 815 + (y - 815) * sy];
  const pts = [[S.box.x0, S.cy], [S.box.x1, S.cy], [S.cx, S.box.y1], [S.cx, S.box.y0]].map(B);
  return pts.every(([x, y]) => [[0, 0], [margin, 0], [-margin, 0], [0, margin], [0, -margin]].every(([dx, dy]) => inPoly([x + dx, y + dy], face)));
}
