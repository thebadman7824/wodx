/**
 * WoDX Storyteller: how strong a place of power is, for those who could see it (B4635, show-don't-tell desk v13, the
 * smaller fix). Pure rules, no Foundry; the Foundry side is power-looks.mjs.
 *
 * A Node shows a soft glow at its scene's heart to mages; a caern to werebeasts and mages; both dim as the place weakens
 * (a drained Node, a low caern). A freehold's balefire shows to changelings as a flame whose size follows its ranks,
 * and goes out with it. The Storyteller sees them all. Sizes and strengths are house rules.
 */
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Who sees each kind, by the viewer's nature (WoDX Otherworlds senses). */
export const SEEN_BY = {node: new Set(["witch"]), caern: new Set(["werebeast", "witch"]), freehold: new Set(["fae"])};
export const COLOURS = {node: 0x9fd8ff, caern: 0x9fe8a8, freehold: 0xffb347};

/** The glow of one place: {kind, color, strength 0 to 1, radius in grid squares}, or null when there is none. */
export function glowOf(place = {}) {
  if ( place.kind === "node" ) {
    const stored = num(place.store?.quint) + num(place.store?.tass);
    const strength = clamp(num(place.rating) / 5, 0.2, 1) * (stored > 0 ? 1 : 0.4);
    return {kind: "node", color: COLOURS.node, strength: Math.round(strength * 100) / 100, radius: 1 + num(place.rating) * 0.6};
  }
  if ( place.kind === "caern" ) {
    if ( num(place.level) < 1 || place.dead ) return null;
    return {kind: "caern", color: COLOURS.caern, strength: Math.round(clamp(num(place.level) / 5, 0.2, 1) * 100) / 100, radius: 1.5 + num(place.level) * 0.8};
  }
  if ( place.kind === "freehold" ) {
    if ( place.destroyed || num(place.rating) < 1 ) return null;
    return {kind: "freehold", color: COLOURS.freehold, strength: Math.round(clamp(num(place.rating) / Math.max(1, num(place.base)), 0.2, 1) * 100) / 100, radius: 0.5 + num(place.rating) * 0.4, flame: true};
  }
  return null;
}

/** Can this viewer see the glow? */
export const sees = (glow, {nature = "human", gm = false} = {}) => !!glow && (gm || !!SEEN_BY[glow.kind]?.has(nature));
