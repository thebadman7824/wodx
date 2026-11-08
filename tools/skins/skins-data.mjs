/**
 * The line skins (B91 to B95): one entry per line, read by build-skins.mjs, which writes
 * modules/wodx-sheets/styles/wodx-skins.css, and by the harness's skins preview.
 *
 * Everything here is drawn by WoDX: the rules are SVG paths, the papers are CSS gradients and SVG noise.
 * Fonts are SIL OFL faces bundled in wodx-sheets/fonts (or the ones wodx-chronicle already bundles).
 */

/* ---- Small SVG helpers ---- */
const svg = (w, h, body) => `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' width='${w}' height='${h}'>${body}</svg>`;
export const dataUri = s => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
// A noise tile: feTurbulence (frequency times size a whole number, so the tiles meet without a seam), then a colour matrix that turns it into one tinted colour at a given strength
export const noise = ({size = 200, freq = ".8", oct = 3, type = "fractalNoise", rgb = [0, 0, 0], alpha = 0.5, bias = -0.2, seed = 2}) =>
  dataUri(svg(size, size, `<filter id='n' x='0' y='0' width='100%' height='100%' filterUnits='userSpaceOnUse'><feTurbulence type='${type}' baseFrequency='${freq}' numOctaves='${oct}' seed='${seed}' stitchTiles='stitch'/>` +
    `<feColorMatrix values='0 0 0 0 ${rgb[0] / 255} 0 0 0 0 ${rgb[1] / 255} 0 0 0 0 ${rgb[2] / 255} ${alpha} 0 0 0 ${bias}'/></filter>` +
    `<rect width='100%' height='100%' filter='url(%23n)'/>`).replace("%23", "#"));

/* ---- The rules drawn behind section headings (the system's .sheet-banner), 15:1, and the small ones, 6.5:1 ---- */
// Each drawer gets the ink and accent colours and the box (w, h, centre y) and returns SVG markup
const line = (x1, x2, y, c, sw = 1.4, extra = "") => `<path d='M${x1} ${y}H${x2}' stroke='${c}' stroke-width='${sw}' fill='none' stroke-linecap='round'${extra}/>`;
const drop = (cx, cy, s, c) => `<path d='M${cx} ${cy - 9 * s}C${cx - 3 * s} ${cy - 3 * s} ${cx - 6 * s} ${cy} ${cx - 6 * s} ${cy + 3 * s}a${6 * s} ${6 * s} 0 0 0 ${12 * s} 0C${cx + 6 * s} ${cy} ${cx + 3 * s} ${cy - 3 * s} ${cx} ${cy - 9 * s}Z' fill='${c}'/>`;
const diamond = (cx, cy, r, c) => `<path d='M${cx - r} ${cy}L${cx} ${cy - r}L${cx + r} ${cy}L${cx} ${cy + r}Z' fill='${c}'/>`;

export const DRAW = {
  // A plain rule with small end caps
  plain: (ink, acc, w, h, y) => line(w * 0.04, w * 0.96, y, ink, 1.2) + diamond(w * 0.04, y, 2.5, ink) + diamond(w * 0.96, y, 2.5, ink),
  // Kindred: a double rule broken by a drop of blood, with bracketed ends
  vampire: (ink, acc, w, h, y) => {
    const g = 16;
    return line(w * 0.05, w / 2 - g, y - 2.2, ink, 1) + line(w * 0.05, w / 2 - g, y + 2.2, ink, 1) +
      line(w / 2 + g, w * 0.95, y - 2.2, ink, 1) + line(w / 2 + g, w * 0.95, y + 2.2, ink, 1) +
      `<path d='M${w * 0.05 + 6} ${y - 7}L${w * 0.05} ${y}L${w * 0.05 + 6} ${y + 7}M${w * 0.95 - 6} ${y - 7}L${w * 0.95} ${y}L${w * 0.95 - 6} ${y + 7}' stroke='${ink}' stroke-width='1.2' fill='none'/>` +
      drop(w / 2, y, Math.min(1.2, h / 34), acc);
  },
  // A ghoul: one rule and a smaller drop
  ghoul: (ink, acc, w, h, y) => line(w * 0.08, w / 2 - 10, y, ink, 1) + line(w / 2 + 10, w * 0.92, y, ink, 1) + drop(w / 2, y, Math.min(0.75, h / 50), acc),
  // Garou: a rough rule torn by three claw marks
  werewolf: (ink, acc, w, h, y) => {
    let d = `M${w * 0.04} ${y}`;
    for ( let x = w * 0.04, k = 0; x < w * 0.96; x += 9, k++ ) d += `L${x.toFixed(1)} ${(y + [0.8, -0.6, 1.1, -1, 0.4, -0.3][k % 6]).toFixed(1)}`;
    const claw = dx => `<path d='M${w / 2 + dx - 9} ${y + h * 0.36}Q${w / 2 + dx - 1} ${y} ${w / 2 + dx + 9} ${y - h * 0.38}Q${w / 2 + dx + 1} ${y + 1} ${w / 2 + dx - 9} ${y + h * 0.36}Z' fill='${acc}'/>`;
    return `<path d='${d}' stroke='${ink}' stroke-width='1.8' fill='none' stroke-linejoin='round'/>` + claw(-14) + claw(0) + claw(14);
  },
  // Mage: a fine double rule with the nine Spheres round a centre
  mage: (ink, acc, w, h, y) => {
    const r = Math.min(13, h * 0.32);
    let dots = "";
    for ( let i = 0; i < 9; i++ ) { const a = (i / 9) * Math.PI * 2 - Math.PI / 2; dots += `<circle cx='${(w / 2 + Math.cos(a) * r).toFixed(1)}' cy='${(y + Math.sin(a) * r).toFixed(1)}' r='1.7' fill='${acc}'/>`; }
    return line(w * 0.05, w / 2 - r - 6, y - 1.6, ink, 0.8) + line(w * 0.05, w / 2 - r - 6, y + 1.6, ink, 0.8) +
      line(w / 2 + r + 6, w * 0.95, y - 1.6, ink, 0.8) + line(w / 2 + r + 6, w * 0.95, y + 1.6, ink, 0.8) +
      `<circle cx='${w / 2}' cy='${y}' r='${(r * 0.55).toFixed(1)}' stroke='${ink}' stroke-width='0.9' fill='none'/>` + dots;
  },
  // Changeling: a vine that runs the width, leaves along it
  changeling: (ink, acc, w, h, y) => {
    const a = h * 0.16, step = w / 12;
    let d = `M${w * 0.03} ${y}`, leaves = "";
    for ( let i = 0; i < 12; i++ ) {
      const x0 = w * 0.03 + i * step * 0.94, x1 = x0 + step * 0.47, x2 = x0 + step * 0.94, s = i % 2 ? 1 : -1;
      d += `Q${x1.toFixed(1)} ${(y + s * a * 2).toFixed(1)} ${x2.toFixed(1)} ${y}`;
      leaves += `<ellipse cx='${x1.toFixed(1)}' cy='${(y + s * a * 0.9).toFixed(1)}' rx='4.2' ry='1.8' transform='rotate(${s * 30} ${x1.toFixed(1)} ${(y + s * a * 0.9).toFixed(1)})' fill='${acc}'/>`;
    }
    return `<path d='${d}' stroke='${ink}' stroke-width='1.2' fill='none'/>` + leaves;
  },
  // Wraith: a frayed shroud edge, thinning to nothing at both ends
  wraith: (ink, acc, w, h, y) => {
    let out = "";
    const segs = [[0.06, 0.12, 0.5], [0.14, 0.24, 0.7], [0.26, 0.44, 0.9], [0.46, 0.54, 1], [0.56, 0.74, 0.9], [0.76, 0.86, 0.7], [0.88, 0.94, 0.5]];
    for ( const [a, b, o] of segs ) out += line(w * a, w * b, y, ink, 1.8, ` opacity='${o}'`);
    for ( const x of [0.22, 0.78] ) out += `<path d='M${w * x} ${y}q4 -${h * 0.2} 0 -${h * 0.36}' stroke='${acc}' stroke-width='1' fill='none' opacity='.7'/>`;
    return out;
  },
  // Hunter: an underline drawn by hand, held down with two strips of tape
  hunter: (ink, acc, w, h, y) => `<path d='M${w * 0.06} ${y + 1}C${w * 0.3} ${y - 2} ${w * 0.55} ${y + 3} ${w * 0.94} ${y - 1}' stroke='${ink}' stroke-width='2.6' fill='none' stroke-linecap='round'/>` +
    `<rect x='${w * 0.08}' y='${y - h * 0.22}' width='${Math.max(16, w * 0.05)}' height='${h * 0.44}' fill='${acc}' opacity='.45' transform='rotate(-8 ${w * 0.08} ${y})'/>` +
    `<rect x='${w * 0.88}' y='${y - h * 0.22}' width='${Math.max(16, w * 0.05)}' height='${h * 0.44}' fill='${acc}' opacity='.45' transform='rotate(7 ${w * 0.88} ${y})'/>`,
  // Inquisitor: a rule with a cross at its centre
  inquisitor: (ink, acc, w, h, y) => line(w * 0.05, w / 2 - 9, y, ink, 1.2) + line(w / 2 + 9, w * 0.95, y, ink, 1.2) +
    `<path d='M${w / 2} ${y - h * 0.38}V${y + h * 0.38}M${w / 2 - h * 0.18} ${y - h * 0.14}H${w / 2 + h * 0.18}' stroke='${acc}' stroke-width='2.2' stroke-linecap='square'/>`,
  // Demon: a rule broken by a cracked halo, with embers rising
  demon: (ink, acc, w, h, y) => {
    const rx = Math.min(18, w * 0.03), ry = Math.min(6, h * 0.16);
    return line(w * 0.05, w / 2 - rx - 8, y, ink, 1.2) + line(w / 2 + rx + 8, w * 0.95, y, ink, 1.2) +
      `<path d='M${w / 2 - rx} ${y}A${rx} ${ry} 0 0 1 ${w / 2 + rx * 0.2} ${y - ry}M${w / 2 + rx * 0.45} ${y - ry * 0.92}A${rx} ${ry} 0 0 1 ${w / 2 + rx} ${y}A${rx} ${ry} 0 0 1 ${w / 2 - rx} ${y}' stroke='${acc}' stroke-width='1.6' fill='none'/>` +
      [[-0.3, 0.32, 1.3], [0.12, 0.38, 1], [0.34, 0.26, 1.4], [-0.05, 0.42, 0.8]].map(([dx, dy, r]) => `<circle cx='${(w / 2 + dx * rx * 2).toFixed(1)}' cy='${(y - dy * h).toFixed(1)}' r='${r}' fill='${acc}' opacity='.8'/>`).join("");
  },
  // Mummy: lapis and gold bands, an ankh at the centre
  mummy: (ink, acc, w, h, y) => {
    const s = Math.min(1, h / 40);
    return `<rect x='${w * 0.05}' y='${y - 3.5}' width='${w / 2 - w * 0.05 - 12}' height='2.2' fill='${ink}'/><rect x='${w * 0.05}' y='${y + 1.3}' width='${w / 2 - w * 0.05 - 12}' height='2.2' fill='${ink}'/>` +
      `<rect x='${w / 2 + 12}' y='${y - 3.5}' width='${w / 2 - w * 0.05 - 12}' height='2.2' fill='${ink}'/><rect x='${w / 2 + 12}' y='${y + 1.3}' width='${w / 2 - w * 0.05 - 12}' height='2.2' fill='${ink}'/>` +
      line(w * 0.05, w / 2 - 12, y, acc, 1) + line(w / 2 + 12, w * 0.95, y, acc, 1) +
      `<g transform='translate(${w / 2} ${y}) scale(${s})' fill='none' stroke='${acc}' stroke-width='2.4'><ellipse cx='0' cy='-9' rx='4' ry='5.5'/><path d='M0 -3.5V15M-8 -2H8'/></g>`;
  },
  // Kindred of the East: a brush stroke that swells and tapers, a red seal to one side
  kote: (ink, acc, w, h, y) => `<path d='M${w * 0.05} ${y}C${w * 0.2} ${y - 3.5} ${w * 0.5} ${y - 4} ${w * 0.8} ${y - 1}C${w * 0.86} ${y} ${w * 0.9} ${y + 1} ${w * 0.95} ${y + 0.5}C${w * 0.7} ${y + 3} ${w * 0.3} ${y + 3.5} ${w * 0.05} ${y}Z' fill='${ink}'/>` +
    `<rect x='${w * (w < 400 ? 0.86 : 0.78)}' y='${y - h * 0.3}' width='${h * 0.6}' height='${h * 0.6}' rx='1.5' fill='${acc}' opacity='.85'/><rect x='${w * (w < 400 ? 0.86 : 0.78) + h * 0.12}' y='${y - h * 0.18}' width='${h * 0.36}' height='${h * 0.36}' fill='none' stroke='#f6efe4' stroke-width='1'/>`,
  // Orpheus: a case-file rule, a tab at the left and tick marks
  orpheus: (ink, acc, w, h, y) => line(w * 0.04, w * 0.96, y, ink, 1) +
    `<rect x='${w * 0.04}' y='${y - h * 0.32}' width='${Math.max(28, w * 0.08)}' height='${h * 0.32}' fill='${acc}' opacity='.75'/>` +
    Array.from({length: 9}, (_, i) => line(w * (0.6 + i * 0.04), w * (0.6 + i * 0.04), y, ink, 1).replace(`H${w * (0.6 + i * 0.04)}`, `V${y + h * 0.18}`)).join(""),
  // Creatures: a rule with a paw print at the centre
  creature: (ink, acc, w, h, y) => line(w * 0.05, w / 2 - 14, y, ink, 1.2) + line(w / 2 + 14, w * 0.95, y, ink, 1.2) +
    `<g transform='translate(${w / 2} ${y}) scale(${Math.min(1, h / 36)})' fill='${acc}'><ellipse cx='0' cy='4' rx='6' ry='5'/><circle cx='-7' cy='-3' r='2.6'/><circle cx='-2.5' cy='-7.5' r='2.6'/><circle cx='2.5' cy='-7.5' r='2.6'/><circle cx='7' cy='-3' r='2.6'/></g>`
};
// The heading's own text sits over the middle of the rule, so a rule whose ornament is drawn at the centre also
// shows it twice, at either side of the text instead: the centre window (half-width R) is copied out, and the plain
// rule is masked at the centre and where the copies go
const ORNAMENT = {vampire: 17, ghoul: 11, werewolf: 25, mage: 20, inquisitor: 10, demon: 27, mummy: 13, creature: 15};
export const rule = (kind, ink, acc, small = false) => {
  const [w, h] = small ? [300, 46] : [600, 40];
  const body = DRAW[kind](ink, acc, w, h, h / 2), R = ORNAMENT[kind];
  if ( !R ) return dataUri(svg(w, h, body));
  const at = small ? [w * 0.09, w * 0.91] : [w * 0.2, w * 0.8];
  const holes = [...at, w / 2].map(x => `<rect x='${(x - R).toFixed(1)}' y='0' width='${2 * R}' height='${h}' fill='black'/>`).join("");
  const copies = at.map(x => `<use href='%23o' transform='translate(${(x - w / 2).toFixed(1)} 0)'/>`).join("");
  return dataUri(svg(w, h, `<defs><mask id='m'><rect width='${w}' height='${h}' fill='white'/>${holes}</mask>` +
    `<clipPath id='c'><rect x='${w / 2 - R}' y='0' width='${2 * R}' height='${h}'/></clipPath><g id='o' clip-path='url(%23c)'>${body}</g></defs>` +
    `<g mask='url(%23m)'>${body}</g>${copies}`).replace(/%23/g, "#"));
};

/* ---- The lines ---- */
// sel: the sheet classes the skin applies to (inside .wod20.wod-sheet). title: the face for headings (.splatFont).
// light/dark: the page (paper base colours, texture layers), the ink for text, the rule's ink and accent.
const G = {
  marble: rgb => noise({freq: ".012 .044", oct: 4, type: "turbulence", rgb, alpha: 0.55, bias: -0.18, size: 250}),
  fine: rgb => noise({freq: ".9", oct: 3, rgb, alpha: 0.45, bias: -0.2}),
  fibreV: rgb => noise({freq: ".6 .02", oct: 2, rgb, alpha: 0.5, bias: -0.2, size: 250}),
  fibreH: rgb => noise({freq: ".02 .6", oct: 2, rgb, alpha: 0.5, bias: -0.2, size: 250}),
  blots: rgb => noise({freq: ".006", oct: 3, rgb, alpha: 0.6, bias: -0.25, size: 500}),
  specks: rgb => noise({freq: ".7", oct: 1, rgb, alpha: 6, bias: -4.6, size: 240}),
  cracks: rgb => noise({freq: ".035", oct: 3, type: "turbulence", rgb, alpha: -2.2, bias: 0.42, size: 200}),
  grunge: rgb => noise({freq: ".55", oct: 2, type: "turbulence", rgb, alpha: 0.9, bias: -0.6})
};
export const LINES = [
  {id: "vampire", label: "Vampire (Kindred)", sel: [".vampire:not(.wodx-kote)"], title: "WXS Fell English SC", rule: "vampire",
    light: {base: "#f0e8e4", ink: "#1e1214", rule: "#3a2326", acc: "#8a1414", layers: [G.marble([110, 70, 76]), G.fine([80, 40, 40]), "radial-gradient(ellipse at center, transparent 55%, rgba(110, 10, 20, .14) 100%)"]},
    dark: {base: "#170d10", ink: "#eee2df", rule: "#b9a3a5", acc: "#e5484d", layers: [G.marble([150, 110, 116]), G.fine([0, 0, 0]), "radial-gradient(ellipse at center, transparent 50%, rgba(120, 0, 12, .28) 100%)"]}},
  {id: "ghoul", label: "Ghoul", sel: [".mortal.ghoul", ".wodx-ghoul20", ".wodx-ghoulDA"], title: "WXS Cormorant SC", rule: "ghoul",
    light: {base: "#f3eeea", ink: "#221a1a", rule: "#5a4648", acc: "#7a1d3a", layers: [G.fine([90, 60, 60])]},
    dark: {base: "#1a1416", ink: "#ece4e2", rule: "#a99597", acc: "#e8789a", layers: [G.fine([0, 0, 0])]}},
  {id: "mortal", label: "Mortal and Kinfolk", sel: [".mortal:not(.ghoul):not(.wodx-orpheus):not(.wodx-inqDA):not(.wodx-ghoul20):not(.wodx-ghoulDA)"], title: "WX Baskerville", rule: "plain",
    light: {base: "#f4f1ea", ink: "#1c1915", rule: "#4a4238", acc: "#184e77", layers: [G.fine([60, 50, 40])]},
    dark: {base: "#16171a", ink: "#e8e6e1", rule: "#9b978e", acc: "#7fb2dd", layers: [G.fine([0, 0, 0])]}},
  {id: "werewolf", label: "Werewolf and the Changing Breeds", sel: [".werewolf"], title: "WXS Metamorphous", rule: "werewolf",
    light: {base: "#ece2d0", ink: "#22180c", rule: "#4a3519", acc: "#7a2e0e", layers: [G.fibreV([90, 60, 25]), G.fine([70, 45, 15]), "radial-gradient(ellipse at center, transparent 60%, rgba(60, 35, 10, .18) 100%)"]},
    dark: {base: "#17120c", ink: "#efe6d6", rule: "#a08a68", acc: "#d9813f", layers: [G.fibreV([0, 0, 0]), G.fine([120, 90, 50]), "radial-gradient(ellipse at center, transparent 55%, rgba(0, 0, 0, .35) 100%)"]}},
  {id: "mage", label: "Mage", sel: [".mage"], title: "WXS Cinzel Decorative", rule: "mage",
    light: {base: "#eeebf3", ink: "#1b1526", rule: "#3d3354", acc: "#8a6a12", layers: [G.specks([90, 70, 140]), "repeating-radial-gradient(circle at 78% 18%, transparent 0 46px, rgba(90, 60, 140, .07) 46px 47px)", G.fine([60, 50, 90])]},
    dark: {base: "#120e1d", ink: "#ece8f5", rule: "#a99bc9", acc: "#e0be5c", layers: [G.specks([235, 220, 255]), "repeating-radial-gradient(circle at 78% 18%, transparent 0 46px, rgba(224, 190, 92, .07) 46px 47px)", G.fine([0, 0, 0])]}},
  {id: "changeling", label: "Changeling", sel: [".changeling"], title: "WXS Almendra", rule: "changeling",
    light: {base: "#eef1e8", ink: "#18201a", rule: "#2f4a35", acc: "#7a4c8c", layers: [G.blots([90, 150, 110]), G.blots([150, 110, 170]), "radial-gradient(ellipse at center, transparent 50%, rgba(120, 120, 120, .22) 100%)"]},
    dark: {base: "#111812", ink: "#e9efe6", rule: "#93ad98", acc: "#c79be0", layers: [G.blots([60, 120, 80]), G.blots([110, 70, 130]), "radial-gradient(ellipse at center, transparent 45%, rgba(90, 90, 90, .3) 100%)"]}},
  {id: "wraith", label: "Wraith", sel: [".wraith"], title: "WXS Fell DW Pica", rule: "wraith",
    light: {base: "#e9e9e6", ink: "#1a1c1c", rule: "#3e4342", acc: "#135a5b", layers: [G.cracks([70, 75, 75]), G.fine([60, 60, 60])]},
    dark: {base: "#141617", ink: "#e6e8e7", rule: "#9aa3a1", acc: "#4cc9be", layers: [G.cracks([150, 158, 156]), G.fine([0, 0, 0])]}},
  {id: "hunter", label: "Hunter: The Reckoning", sel: [".hunter:not(.wodx-inqDA)"], title: "WX Typewriter", rule: "hunter",
    light: {base: "#f6f3e6", ink: "#1a1a1a", rule: "#2c2c2c", acc: "#9a6d00", layers: ["linear-gradient(90deg, transparent 38px, rgba(200, 60, 60, .35) 38px 39px, transparent 39px)", "repeating-linear-gradient(180deg, transparent 0 23px, rgba(60, 110, 170, .18) 23px 24px)", G.fine([60, 60, 40])]},
    dark: {base: "#17181b", ink: "#ebebe6", rule: "#b7b7b0", acc: "#d4a72c", layers: ["linear-gradient(90deg, transparent 38px, rgba(220, 80, 80, .3) 38px 39px, transparent 39px)", "repeating-linear-gradient(180deg, transparent 0 23px, rgba(140, 170, 210, .1) 23px 24px)", G.fine([0, 0, 0])]}},
  {id: "inquisitor", label: "Inquisitor (Dark Ages)", sel: [".wodx-inqDA"], title: "WX Blackletter", rule: "inquisitor",
    light: {base: "#eadcbc", ink: "#2b1d12", rule: "#5d4831", acc: "#8b1a12", layers: [G.fine([82, 51, 20]), "radial-gradient(ellipse at center, transparent 55%, rgba(70, 40, 10, .2) 100%)"]},
    dark: {base: "#1b140d", ink: "#efe3cc", rule: "#a8916c", acc: "#e0644f", layers: [G.fine([0, 0, 0]), "radial-gradient(ellipse at center, transparent 50%, rgba(0, 0, 0, .35) 100%)"]}},
  {id: "demon", label: "Demon: The Fallen", sel: [".demon"], title: "WXS Cinzel", rule: "demon",
    light: {base: "#f1ebe6", ink: "#1e1410", rule: "#3d2a22", acc: "#c2410c", layers: ["linear-gradient(180deg, transparent 55%, rgba(194, 65, 12, .16) 100%)", G.grunge([60, 30, 20]), G.fine([70, 40, 30])]},
    dark: {base: "#120c0b", ink: "#f0e6e0", rule: "#b39a90", acc: "#ff7a3d", layers: ["linear-gradient(180deg, transparent 45%, rgba(255, 90, 20, .2) 100%)", G.grunge([0, 0, 0]), G.fine([90, 40, 20])]}},
  {id: "mummy", label: "Mummy: The Resurrection", sel: [".mummy"], title: "WXS Marcellus SC", rule: "mummy",
    light: {base: "#efe3c6", ink: "#231a0c", rule: "#1f3f8a", acc: "#8a6510", layers: [G.fibreH([120, 90, 40]), G.fibreV([120, 90, 40]), G.fine([90, 70, 30])]},
    dark: {base: "#15130d", ink: "#f1e8d2", rule: "#6f8fd6", acc: "#e1b84a", layers: [G.fibreH([0, 0, 0]), G.fibreV([0, 0, 0]), G.fine([110, 90, 40])]}},
  {id: "kote", label: "Kindred of the East", sel: [".wodx-kote"], title: "WXS Shippori Mincho", rule: "kote",
    light: {base: "#f5f1e8", ink: "#16130f", rule: "#1b1712", acc: "#b3261e", layers: [G.blots([70, 70, 70]), G.fibreH([110, 100, 80])]},
    dark: {base: "#131211", ink: "#efebe3", rule: "#cfc8bb", acc: "#e0483f", layers: [G.blots([0, 0, 0]), G.fibreH([90, 85, 75])]}},
  {id: "orpheus", label: "Orpheus", sel: [".wodx-orpheus"], title: "WX Plex", rule: "orpheus",
    light: {base: "#f2f5f7", ink: "#141a1f", rule: "#33414d", acc: "#3c7bb0", layers: ["repeating-linear-gradient(0deg, transparent 0 19px, rgba(60, 123, 176, .12) 19px 20px)", "repeating-linear-gradient(90deg, transparent 0 19px, rgba(60, 123, 176, .12) 19px 20px)"]},
    dark: {base: "#0f1418", ink: "#e5edf2", rule: "#93a6b5", acc: "#6fb1e6", layers: ["repeating-linear-gradient(0deg, transparent 0 19px, rgba(111, 177, 230, .08) 19px 20px)", "repeating-linear-gradient(90deg, transparent 0 19px, rgba(111, 177, 230, .08) 19px 20px)"]}},
  {id: "creature", label: "Creatures", sel: [".creature"], title: "WXS Alegreya SC", rule: "creature",
    light: {base: "#ede4d6", ink: "#211a10", rule: "#4d3d26", acc: "#3b571c", layers: [noise({freq: ".06", oct: 4, rgb: [90, 65, 35], alpha: 0.55, bias: -0.22, size: 250}), G.fine([70, 50, 30])]},
    dark: {base: "#16120c", ink: "#ede4d6", rule: "#a8977b", acc: "#a6d36a", layers: [noise({freq: ".06", oct: 4, rgb: [0, 0, 0], alpha: 0.55, bias: -0.22, size: 250}), G.fine([100, 80, 50])]}}
];

// The bundled faces (wodx-sheets/fonts); the WX ones come from wodx-chronicle
export const FONTS = [
  ["WXS Fell English SC", "IMFellEnglishSC.woff2"], ["WXS Cormorant SC", "CormorantSC.woff2"], ["WXS Metamorphous", "Metamorphous.woff2"],
  ["WXS Cinzel Decorative", "CinzelDecorative.woff2"], ["WXS Almendra", "Almendra.woff2"], ["WXS Fell DW Pica", "IMFellDWPica.woff2"],
  ["WXS Cinzel", "Cinzel.woff2", "400 900"], ["WXS Marcellus SC", "MarcellusSC.woff2"], ["WXS Shippori Mincho", "ShipporiMincho.woff2"], ["WXS Alegreya SC", "AlegreyaSC.woff2"]
];
