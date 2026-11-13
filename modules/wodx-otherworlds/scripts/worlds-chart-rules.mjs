/**
 * WoDX Otherworlds 0.20.0 (B2545 to B2549): the rough map of the otherworlds. Pure rules, no Foundry.
 *
 * Two kinds of place lie beyond the living world. Some lie over it, square for square: the Penumbra, the Shadowlands
 * and the Near Dreaming are the Earth seen from the other side, so they are drawn as the world map in another dress
 * (MIRRORS; WoDX Storyteller's world map draws the picture). The rest have no place on the globe: they are reached
 * by going further out, and they are drawn on one chart of the worlds, in rings round the living world (CHART).
 * Every realm in the realm maps catalogue has its spot, so the chart is also the way in to the 34 realm maps.
 *
 * Which ring and which side a realm sits on is our own arrangement for one readable chart. The books describe these
 * places from inside each game line and do not agree on one geography; where they clash the order is Wraith, then
 * Werewolf, then Mage, as elsewhere in WoDX. Nothing here is a rule: it is a map to point at.
 */

/** The otherworlds that lie over the Earth. palette: a ground letter to a colour, as the world map's own. */
export const MIRRORS = {
  penumbra: {label: "The Penumbra", lines: ["werewolf", "mage"], barrier: "the Gauntlet",
    note: "The spirit side of the world. Wild ground is bright and awake; ploughed and built-over ground is dim, and the Gauntlet is thickest there.",
    palette: {"~": "#0a1030", l: "#16306a", i: "#b9d6ff", M: "#7f6fd6", P: "#5a55a0", D: "#8a6fb0", T: "#5fc9c0", p: "#1d2a4a", w: "#39b89a", ".": "#2b3f7a", river: "#8fe0ff",
      ink: "#e8e2ff", line: "#ffe08a", frame: "#04051a"},
    legend: [["#7f6fd6", "the high wild places"], ["#5fc9c0", "tundra and marsh, awake"], ["#2b3f7a", "woods and old land"], ["#1d2a4a", "ploughed and settled, dim"], ["#8fe0ff", "river spirits"]]},
  shadowlands: {label: "The Shadowlands", lines: ["wraith"], barrier: "the Shroud",
    note: "The world as the dead see it: grey, cold and falling apart. Old battlefields, burial grounds and ruins hold their shape longest.",
    palette: {"~": "#07080a", l: "#101216", i: "#8d9196", M: "#4b4d52", P: "#44433f", D: "#55504a", T: "#3d4043", p: "#2a2c2e", w: "#232a2b", ".": "#303234", river: "#0d0e10",
      ink: "#d9d6cf", line: "#b33a3a", frame: "#020203"},
    legend: [["#303234", "the grey land"], ["#4b4d52", "the heights"], ["#55504a", "the wastes"], ["#0d0e10", "black rivers"], ["#07080a", "the sunless sea"]]},
  dreaming: {label: "The Near Dreaming", lines: ["changeling"], barrier: "the Mists",
    note: "The world as it is dreamed: brighter and stranger wherever people still tell stories about the land.",
    palette: {"~": "#1a1140", l: "#3a2a8a", i: "#f1e9ff", M: "#b05fc0", P: "#c98a4a", D: "#e0b050", T: "#7fd0d8", p: "#3f9a5a", w: "#2fa08a", ".": "#2f7a4a", river: "#7fb8ff",
      ink: "#fff6dc", line: "#ff9ad0", frame: "#0c0720"},
    legend: [["#2f7a4a", "the deep woods of story"], ["#3f9a5a", "summer fields"], ["#b05fc0", "mountains of glass and cloud"], ["#e0b050", "golden wastes"], ["#7fb8ff", "singing rivers"]]}
};

/** The sides of the chart, clockwise from the top: where a line's otherworlds lie. */
export const SIDES = {
  spirit: {label: "The spirit wilds", from: -152, to: -28, colour: "#3f9a7a", barrier: "the Gauntlet", mirror: "penumbra"},
  high: {label: "The high and far reaches", from: -28, to: 50, colour: "#6f7fd6", barrier: "the Gauntlet", mirror: "penumbra"},
  dream: {label: "The Dreaming", from: 50, to: 110, colour: "#c07fd0", barrier: "the Mists", mirror: "dreaming"},
  dead: {label: "The lands of the dead", from: 110, to: 208, colour: "#8a8f96", barrier: "the Shroud", mirror: "shadowlands"}
};
/** The rings, from the living world outward. */
export const RINGS = ["the living world", "lying over the world", "the near realms", "the far realms", "the deep"];

/**
 * Every place on the chart: id, side, ring (1 to 4), realm (its id in the realm maps catalogue, when it has a map),
 * mirror (a MIRRORS id), label (only for places with no realm map). Order within a side and ring is the order here.
 */
export const CHART = [
  {id: "penumbra", side: "spirit", ring: 1, mirror: "penumbra"},
  ...["wolfhome", "pangaea", "summer-country", "legendary", "erebus", "arcadia-gateway", "aetherial", "flux", "dream-zone", "cyberrealm", "battleground", "atrocity", "scar"]
    .map(id => ({id, side: "spirit", ring: 2, realm: id})),
  {id: "malfeas", side: "spirit", ring: 3, realm: "malfeas"}, {id: "umbral-abyss", side: "spirit", ring: 3, realm: "umbral-abyss"},
  {id: "digital-web", side: "high", ring: 1, realm: "digital-web"},
  {id: "paradox-realm", side: "high", ring: 2, realm: "paradox-realm"},
  {id: "horizon-realm", side: "high", ring: 3, realm: "horizon-realm"}, {id: "shade-realm", side: "high", ring: 3, realm: "shade-realm"},
  {id: "shard-realm", side: "high", ring: 3, realm: "shard-realm"},
  {id: "deep-umbra", side: "high", ring: 4, realm: "deep-umbra"}, {id: "autochthonia", side: "high", ring: 4, realm: "autochthonia"},
  {id: "dreaming", side: "dream", ring: 1, mirror: "dreaming"},
  {id: "far-dreaming", side: "dream", ring: 3, realm: "far-dreaming"},
  {id: "deep-dreaming", side: "dream", ring: 4, realm: "deep-dreaming"},
  {id: "shadowlands", side: "dead", ring: 1, mirror: "shadowlands"},
  {id: "tempest", side: "dead", ring: 2, realm: "tempest"}, {id: "stygia", side: "dead", ring: 2, realm: "stygia"}, {id: "dark-kingdom", side: "dead", ring: 2, realm: "dark-kingdom"},
  {id: "enoch", side: "dead", ring: 2, realm: "enoch"}, {id: "yellow-springs", side: "dead", ring: 2, realm: "yellow-springs"}, {id: "duat", side: "dead", ring: 2, realm: "duat"},
  {id: "far-shores", side: "dead", ring: 3, realm: "far-shores"}, {id: "yomi", side: "dead", ring: 3, realm: "yomi"},
  {id: "labyrinth", side: "dead", ring: 4, realm: "labyrinth"}, {id: "demon-abyss", side: "dead", ring: 4, realm: "demon-abyss"}
];

const D2R = Math.PI / 180;
const RADIUS = [0, 140, 225, 315, 395];

/**
 * The chart laid out. realms: the realm maps catalogue ({id: {label, line}}), for the labels. Returns {size, centre,
 * places: [{id, label, line, side, ring, realm, mirror, x, y, angle}], sides, rings: [radius...]}.
 */
export function layout(realms = {}) {
  const size = 1000, centre = size / 2, places = [];
  for ( const [sideId, side] of Object.entries(SIDES) ) for ( let ring = 1; ring <= 4; ring++ ) {
    const here = CHART.filter(p => p.side === sideId && p.ring === ring);
    here.forEach((p, i) => {
      const pad = (side.to - side.from) * 0.07;
      const angle = side.from + pad + (side.to - side.from - 2 * pad) * (i + 0.5) / here.length + (here.length === 1 && ring > 1 ? (ring % 2 ? -9 : 9) : 0);
      const r = RADIUS[ring] + (here.length > 5 && i % 2 ? 42 : 0);
      const cat = p.realm ? realms[p.realm] : null;
      places.push({...p, label: p.label ?? cat?.label ?? MIRRORS[p.mirror]?.label ?? p.id, line: cat?.line ?? MIRRORS[p.mirror]?.lines?.[0] ?? null,
        angle, order: i, x: Math.round(centre + r * Math.sin(angle * D2R)), y: Math.round(centre - r * Math.cos(angle * D2R))});
    });
  }
  return {size, centre, places, sides: SIDES, rings: RADIUS};
}

/** Every realm of the catalogue that the chart leaves out (a test keeps this empty). */
export const missing = realms => Object.keys(realms).filter(id => !CHART.some(p => p.realm === id));

/**
 * How far apart two places on the chart are, in words. "world" is the living world. Returns {steps, words}: one
 * step for each ring crossed, going in to the living world and out again when the two lie on different sides.
 */
export function between(a, b) {
  const find = id => (id === "world" ? {id, ring: 0, side: null} : CHART.find(p => p.id === id));
  const A = find(a), B = find(b);
  if ( !A || !B ) return null;
  if ( A.id === B.id ) return {steps: 0, words: "The same place."};
  const same = A.side && A.side === B.side;
  const steps = same ? Math.max(1, Math.abs(A.ring - B.ring)) : A.ring + B.ring;
  const cross = [...new Set([A, B].filter(p => p.side && (!same || Math.min(A.ring, B.ring) === 0)).map(p => SIDES[p.side].barrier))];
  const how = same ? `Both lie in ${SIDES[A.side].label.toLowerCase()}` : !A.side || !B.side ? `Out from the living world across ${cross.join(" and ")}`
    : `Back through the living world, across ${cross.join(" and ")}`;
  return {steps, words: `${how}: ${steps === 1 ? "one step" : `${steps} steps`} on the chart.`};
}

const escXml = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"})[c]);
const arc = (c, r, a0, a1) => {
  const p = a => [c + r * Math.sin(a * D2R), c - r * Math.cos(a * D2R)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
};

/** The chart as an SVG string, drawn as night. realms: the catalogue, for labels. mark: a place id to ring round. */
export function svg(realms = {}, {mark = null, title = "The chart of the worlds"} = {}) {
  const L = layout(realms), c = L.centre, out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L.size} ${L.size + 40}" width="${L.size}" height="${L.size + 40}" font-family="Georgia, serif">`,
    `<rect width="${L.size}" height="${L.size + 40}" fill="#05060f"/>`, `<text x="16" y="28" font-size="20" fill="#d8d2c0">${escXml(title)}</text>`, `<g transform="translate(0 40)">`];
  for ( const side of Object.values(SIDES) ) {
    for ( let ring = 1; ring <= 4; ring++ ) out.push(`<path d="${arc(c, L.rings[ring], side.from + 1.5, side.to - 1.5)}" fill="none" stroke="${side.colour}" stroke-opacity="${0.55 - ring * 0.08}" stroke-width="${ring === 1 ? 26 : 1.5}"/>`);
    const mid = (side.from + side.to) / 2, r = 472, x = c + r * Math.sin(mid * D2R), y = c - r * Math.cos(mid * D2R);
    const turn = mid > 90 && mid < 270 ? mid + 180 : mid;
    out.push(`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="17" fill="${side.colour}" text-anchor="middle" transform="rotate(${turn} ${x.toFixed(1)} ${y.toFixed(1)})">${escXml(side.label)}</text>`);
    const bx = c + 100 * Math.sin(mid * D2R), by = c - 100 * Math.cos(mid * D2R);
    out.push(`<text x="${bx.toFixed(1)}" y="${by.toFixed(1)}" font-size="11" fill="#9a958a" text-anchor="middle" transform="rotate(${turn} ${bx.toFixed(1)} ${by.toFixed(1)})">${escXml(side.barrier)}</text>`);
  }
  out.push(`<circle cx="${c}" cy="${c}" r="70" fill="#0b1626" stroke="#c9a86a" stroke-width="2"/>`, `<circle cx="${c - 14}" cy="${c - 8}" r="30" fill="#1f3327" opacity="0.9"/>`,
    `<circle cx="${c + 26}" cy="${c + 18}" r="18" fill="#27402f" opacity="0.9"/>`, `<text x="${c}" y="${c + 5}" font-size="14" fill="#d8d2c0" text-anchor="middle">The living world</text>`);
  for ( const p of L.places ) {
    const col = SIDES[p.side].colour, big = !!p.mirror;
    out.push(`<circle cx="${p.x}" cy="${p.y}" r="${big ? 11 : 7}" fill="${p.realm || p.mirror ? col : "#05060f"}" stroke="${p.id === mark ? "#ffe08a" : "#05060f"}" stroke-width="${p.id === mark ? 4 : 1.5}"/>`);
    if ( big ) { out.push(`<text x="${p.x}" y="${p.y - 17}" font-size="14" fill="#e8e2d0" text-anchor="middle" stroke="#05060f" stroke-width="3" paint-order="stroke">${escXml(p.label)}</text>`); continue; }
    const steep = Math.cos(p.angle * D2R);
    if ( Math.abs(steep) > 0.74 ) {       // near the top or the foot of the chart a label goes above or below its spot
      const dy = (steep > 0 ? -1 : 1) * (p.order % 2 ? 27 : 13) + (steep > 0 ? 0 : 8);
      out.push(`<text x="${p.x}" y="${p.y + dy}" font-size="12" fill="#e8e2d0" text-anchor="middle" stroke="#05060f" stroke-width="3" paint-order="stroke">${escXml(p.label)}</text>`);
      continue;
    }
    const wide = p.label.length * 6.4 + 16;
    let right = Math.sin(p.angle * D2R) >= 0;
    if ( right && p.x + wide > L.size - 4 ) right = false; else if ( !right && p.x - wide < 4 ) right = true;
    out.push(`<text x="${p.x + (right ? 12 : -12)}" y="${p.y + 4}" font-size="12" fill="#e8e2d0" text-anchor="${right ? "start" : "end"}" stroke="#05060f" stroke-width="3" paint-order="stroke">${escXml(p.label)}</text>`);
  }
  out.push(`</g></svg>`);
  return out.join("");
}

/** The words under a mirror's map, and what to hand the world map's picture: {title, palette, legend, note}. */
export function mirrorDress(id) {
  const m = MIRRORS[id];
  return m ? {title: `${m.label}: the world across ${m.barrier}`, palette: m.palette, legend: m.legend, note: m.note} : null;
}
