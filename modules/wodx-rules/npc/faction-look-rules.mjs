/**
 * WoDX NPC: who holds a place, shown on its scene (B4631, show-don't-tell desk v5). Pure rules, no Foundry; the
 * Foundry side is faction-looks.mjs.
 *
 * A place a faction holds shows its holder: a banner in the faction's colour, with its name, at the place. A scene
 * held as a whole gets two banners at its edges (its gates); a tagged place inside a scene one, at the place. A faction
 * that keeps itself secret shows nothing. When a place changes hands, the banner changes with it. The colour comes from
 * the faction itself, so it stays the same everywhere.
 */

/** A seeded number stream (mulberry32 over a string hash). */
export function seeded(seed) {
  let h = 2166136261;
  for ( const c of String(seed) ) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); }
  let a = (h >>> 0) || 1;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** A faction's colour, from its id: a strong hue, bright enough to read on a night map. */
export function colourOf(id) {
  const hue = Math.floor(seeded(`colour:${id}`)() * 360);
  const s = 0.65, l = 0.55;
  const f = n => { const k = (n + hue / 30) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return `#${[f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, "0")).join("")}`;
}

/** The banner text: the flag and the faction's name. */
export const bannerText = name => `⚑ ${String(name ?? "").slice(0, 40)}`.trim();

/**
 * The banners a holder puts on one scene. holder: {id, name, secret}; where: {rect} for a whole scene, or {at: {x, y}}
 * for a place inside it; grid: pixels a square; seed: the place id. Returns looks (none for a secret holder).
 */
export function bannersFor(holder, {rect = null, at = null, grid = 100, seed = ""} = {}) {
  if ( !holder || holder.secret ) return [];
  const colour = colourOf(holder.id), text = bannerText(holder.name), note = `the banner of ${holder.name}`;
  const radius = Math.round(grid * 0.6);
  if ( at ) return [{kind: "calm", at: {x: Math.round(at.x), y: Math.round(at.y - grid / 2), radius}, until: null, note, text, color: colour}];
  if ( !rect ) return [];
  const rand = seeded(`${seed}:banner`);
  // the two gates: on the top and the bottom edge, or the left and the right
  const across = rand() < 0.5;
  const t1 = 0.25 + rand() * 0.5, t2 = 0.25 + rand() * 0.5, pad = radius;
  const spots = across
    ? [{x: rect.x + rect.width * t1, y: rect.y + pad}, {x: rect.x + rect.width * t2, y: rect.y + rect.height - pad}]
    : [{x: rect.x + pad * 2, y: rect.y + rect.height * t1}, {x: rect.x + rect.width - pad * 2, y: rect.y + rect.height * t2}];
  return spots.map(p => ({kind: "calm", at: {x: Math.round(p.x), y: Math.round(p.y), radius}, until: null, note, text, color: colour}));
}

/** A region's middle, from its first shape (rectangle, ellipse or polygon). */
export function middleOf(shape = {}) {
  if ( shape.type === "rectangle" ) return {x: shape.x + shape.width / 2, y: shape.y + shape.height / 2};
  if ( shape.type === "ellipse" || shape.type === "circle" ) return {x: shape.x, y: shape.y};
  if ( Array.isArray(shape.points) && shape.points.length >= 2 ) {
    let x = 0, y = 0, n = 0;
    for ( let i = 0; i + 1 < shape.points.length; i += 2 ) { x += shape.points[i]; y += shape.points[i + 1]; n++; }
    return {x: x / n, y: y / n};
  }
  return null;
}
