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
  happy01: {label: "Half smile", smile: 12, tilt: 8},
  happy02: {label: "Soft smile", smile: 14},
  happy03: {label: "Smile, lips parted", smile: 16, open: 9},
  happy04: {label: "Content", smile: 7, w: 1.05},
  happy06: {label: "Broad smile", smile: 20, open: 20, teeth: "up", w: 1.2},
  happy10: {label: "Wry", smile: 2, tilt: -10, w: 1.05},
  happy13: {label: "Small and round", smile: 4, open: 14, w: 0.6, full: 1.1},
  happy14: {label: "Small smirk", smile: 8, tilt: 7, w: 0.82},
  happy18: {label: "Full and parted", smile: 3, open: 10, w: 0.9, full: 1.3, thin: 1.15},
  sad03: {label: "Small frown", smile: -11, w: 0.68},
  sad04: {label: "Frown", smile: -16, w: 0.95},
  sad05: {label: "Set and grim", smile: -5, w: 1.12, full: 0.75, thin: 0.7},
  sad09: {label: "Slack", smile: -3, open: 5, w: 0.84},
  snarl: {label: "Snarl", smile: -4, open: 20, teeth: "both", w: 1.1, lift: 10, thin: 0.85},
  slack: {label: "Slack", smile: -3, open: 6, w: 0.82}
};
const BASE = {smile: 0, tilt: 0, open: 0, teeth: "", w: 1, full: 1, thin: 1, lift: 0};
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
 * Where the mouth goes, in the picture's own space with the build taken out (as findEyes gives it): under the nose,
 * a little toward the near side, and as wide as the eyes allow. Falls back on Lorelei's mouth box.
 */
export function mouthPlace(eyes) {
  const P = eyes?.pupils ?? [], N = eyes?.nose, M = eyes?.mouth;
  const ipd = P.length === 2 ? Math.abs(P[1].x - P[0].x) : M ? (M.x1 - M.x0) * 1.4 : 190;
  const mid = P.length === 2 ? (P[0].x + P[1].x) / 2 : M ? (M.x0 + M.x1) / 2 : 565;
  const py = P.length ? P.reduce((s, p) => s + p.y, 0) / P.length : 458;
  const cy = N ? N.y1 + 0.24 * ipd : M ? (M.y0 + M.y1) / 2 : py + 160;
  return {cx: mid - 0.03 * ipd, cy, hw: 0.36 * ipd};
}

/** The outlines of a mouth, in the picture's space (build out), from an expression and a place. */
export function mouthShape(expr, place) {
  const e = typeof expr === "string" ? expression(expr) : {...BASE, ...expr}, {cx, cy} = place, hw = place.hw * e.w;
  const n = 14, T = Array.from({length: 2 * n + 1}, (_, i) => -1 + i / n);
  const L = e.smile - e.tilt, R = e.smile + e.tilt;
  // The parting: corners lifted by the smile, the middle sagging under it
  const part = t => cy - ((1 - t) / 2 * L + (1 + t) / 2 * R) + e.smile * 0.92 * (1 - Math.pow(Math.abs(t), 2.6));
  const gap = t => e.open * Math.pow(1 - t * t, 0.9);
  const tU = 14 * e.thin, tL = 21 * e.full;
  const bow = t => Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t), 2.2)), 0.7) * (1 - 0.3 * Math.exp(-((t / 0.13) ** 2)));
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
    X, upInF: upIn, loInF: loIn, mid: {up: upIn(0), lo: loIn(0)}};
}

/**
 * The mouth as SVG for Lorelei's inner drawing (its paths sit in translate(10 -60), so the place is moved into it).
 * lips: the lip colour (as inksOf chose it), skin: the skin. id: a prefix for the gradients.
 */
export function mouthSvg(expr, place, {lips, skin, id = "wpd-m"}) {
  const S = mouthShape(expr, {...place, cx: place.cx - 10, cy: place.cy + 60}), e = S.e;
  const dark = FR.mix(lips, "1a0608", 0.22), deep = FR.mix(lips, "1a0608", 0.55), lite = FR.mix(lips, "ffffff", 0.28);
  const shadow = FR.mix(skin, "1a0c06", 0.4), crease = FR.mix(skin, "1a0c06", 0.55);
  const top = S.mid.up - 12, bot = S.lowY;
  let s = `<defs><linearGradient id="${id}-lo" gradientUnits="userSpaceOnUse" x1="0" y1="${f1(S.mid.lo)}" x2="0" y2="${f1(bot)}">`
    + `<stop offset="0" stop-color="#${dark}"/><stop offset=".45" stop-color="#${lips}"/><stop offset="1" stop-color="#${FR.mix(lips, "1a0608", 0.12)}"/></linearGradient>`
    + `<linearGradient id="${id}-up" gradientUnits="userSpaceOnUse" x1="0" y1="${f1(top)}" x2="0" y2="${f1(S.mid.up)}">`
    + `<stop offset="0" stop-color="#${FR.mix(lips, "1a0608", 0.08)}"/><stop offset="1" stop-color="#${FR.mix(lips, "1a0608", 0.32)}"/></linearGradient>`
    + `<radialGradient id="${id}-hi" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#${lite}" stop-opacity=".75"/><stop offset="1" stop-color="#${lite}" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="${id}-sh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#${shadow}" stop-opacity=".38"/><stop offset="1" stop-color="#${shadow}" stop-opacity="0"/></radialGradient>`
    + (S.inside ? `<clipPath id="${id}-in"><path d="${S.inside}"/></clipPath>` : "") + `</defs>`;
  // Shadow under the lower lip, and a faint one above the bow
  s += `<ellipse cx="${f1(S.cx)}" cy="${f1(bot + 7)}" rx="${f1(S.hw * 0.55)}" ry="9" fill="url(#${id}-sh)"/>`;
  s += `<ellipse cx="${f1(S.cx)}" cy="${f1(top - 4)}" rx="${f1(S.hw * 0.16)}" ry="9" fill="url(#${id}-sh)" opacity=".5"/>`;
  if ( S.inside ) {
    s += `<path d="${S.inside}" fill="#${FR.mix(lips, "12040a", 0.72)}"/>`;
    if ( e.teeth ) {
      // Teeth hang from the upper lip and follow its curve; a lower row shows in a snarl. Faint lines part them.
      const h = Math.min(14, e.open * 0.62), tooth = FR.mix("efe6d6", lips, 0.1), ts = [];
      const row = (edge, sign, span, hh) => { const top = [], bot = [];
        for ( let i = 0; i <= 12; i++ ) { const t = -span + 2 * span * i / 12, y = edge(t), k = Math.sqrt(Math.max(0, 1 - (t / span) ** 2));
          top.push([S.X(t), y - sign * 4]); bot.push([S.X(t), y + sign * hh * (0.55 + 0.45 * k)]); }
        return {d: smooth([...top, ...bot.reverse()], true), at: t => [S.X(t), edge(t)]}; };
      const up = row(S.upInF, 1, 0.78, h);
      ts.push(`<path d="${up.d}" fill="#${tooth}"/>`);
      if ( e.teeth === "both" ) ts.push(`<path d="${row(S.loInF, -1, 0.7, h * 0.75).d}" fill="#${FR.mix(tooth, "1a0608", 0.08)}"/>`);
      for ( const t of [-0.5, -0.24, 0, 0.24, 0.5] ) { const [x, y] = up.at(t); ts.push(`<path d="M${f1(x)} ${f1(y)} L${f1(x)} ${f1(y + h * 0.8)}" stroke="#${FR.mix(tooth, "5a3a30", 0.5)}" stroke-width="1.2" stroke-opacity=".35"/>`); }
      // the shade the upper lip casts on the teeth
      ts.push(`<path d="${S.upIn}" fill="none" stroke="#${FR.mix(lips, "12040a", 0.72)}" stroke-width="6" stroke-opacity=".4"/>`);
      s += `<g clip-path="url(#${id}-in)">${ts.join("")}</g>`;
    }
  }
  const rim = ` stroke="#${deep}" stroke-width="1.6" stroke-opacity=".45" stroke-linejoin="round"`;
  s += `<path d="${S.lower}" fill="url(#${id}-lo)"${rim}/>`;
  s += `<ellipse cx="${f1(S.cx + S.hw * 0.08)}" cy="${f1((S.mid.lo + bot) / 2 + 1)}" rx="${f1(S.hw * 0.32)}" ry="${f1(Math.max(2.5, (bot - S.mid.lo) * 0.22))}" fill="url(#${id}-hi)"/>`;
  s += `<path d="${S.upper}" fill="url(#${id}-up)"${rim}/>`;
  // The lines that hold the shape: the parting (or the inner edges), darkest at the middle, and the corners
  if ( S.inside ) s += `<path d="${S.upIn}" fill="none" stroke="#${deep}" stroke-width="2.6" stroke-linecap="round"/><path d="${S.loIn}" fill="none" stroke="#${deep}" stroke-width="1.6" stroke-opacity=".7" stroke-linecap="round"/>`;
  else s += `<path d="${S.part}" fill="none" stroke="#${deep}" stroke-width="3" stroke-linecap="round"/>`;
  // A small soft crease at each corner, curling up in a smile and down in a frown
  for ( const [i, [x, y]] of S.corners.entries() ) {
    const dx = i ? 1 : -1, c = i ? e.smile + e.tilt : e.smile - e.tilt, lift = c > 3 ? -1 : c < -3 ? 1 : 0;
    s += `<path d="M${f1(x - dx * 1)} ${f1(y)} Q${f1(x + dx * 3.5)} ${f1(y)} ${f1(x + dx * 4.5)} ${f1(y + lift * 4 - (lift ? 0 : 1.5))}" fill="none" stroke="#${crease}" stroke-width="2" stroke-opacity=".35" stroke-linecap="round"/>`;
  }
  return `<g class="wpd-mouth">${s}</g>`;
}

/** The mouth's outline alone, for the mask of visible skin (inner drawing, like mouthSvg). */
export function mouthSilhouette(expr, place, fill = "#010101") {
  const S = mouthShape(expr, {...place, cx: place.cx - 10, cy: place.cy + 60});
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
