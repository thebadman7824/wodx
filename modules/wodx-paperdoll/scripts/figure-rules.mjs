/**
 * The figure menu's rules (B2587): a player puts a whole figure together from the wardrobe pieces the sprite rig can
 * draw. What they pick is kept on the character; the walking sprite is drawn from it with the next batch (B2586).
 * The menu shows a quick picture made of one ready layer per piece (sprites/figure/atlas.png, catalogue.json).
 * No Foundry in this file.
 */
export const FOLDER = "modules/wodx-paperdoll/sprites/figure";
/** The places a piece can go, in the order the menu lists them. */
export const SLOTS = {body: "Body", legs: "Legs", feet: "Feet", over: "Cloak or coat over all", head: "Head", face: "Face", neck: "Neck", hands: "Hands", belt: "Belt",
  extra: "Pinned on", hand: "In the hand", offhand: "On the other arm"};
/** The order the layers are laid down in the quick picture, undermost first. */
export const DRAW = ["legs", "feet", "body", "belt", "neck", "over", "hands", "face", "head", "extra", "offhand", "hand"];
export const HAIR_STYLES = {short: "Short", long: "Long", bun: "Pinned up", bald: "None"};
const hex = v => /^[0-9a-f]{6}$/i.test(v ?? "") ? v.toLowerCase() : null;

/** The pieces for one place, by name; with a year, only those in use in that year (pieces with no years always show). */
export function piecesFor(cat, slot, year = null) {
  return (cat?.items ?? []).filter(e => e.s === slot && (year === null || e.fr === undefined || ((e.fr ?? -Infinity) <= year && year <= (e.to ?? Infinity))))
    .sort((a, b) => a.n.localeCompare(b.n));
}
export const pieceOf = (cat, name) => (cat?.items ?? []).find(e => e.n === name) ?? null;

/** A saved figure made safe: known hair style, six-digit colours, and only pieces the catalogue has, each in its own place. */
export function normalize(raw, cat, dflt = {}) {
  const out = {skin: hex(raw?.skin) ?? hex(dflt.skin) ?? "d8aa84", hair: hex(raw?.hair) ?? hex(dflt.hair) ?? "3b2a20",
    hairStyle: Object.hasOwn(HAIR_STYLES, raw?.hairStyle) ? raw.hairStyle : "short", slots: {}};
  for ( const slot of Object.keys(SLOTS) ) {
    const p = raw?.slots?.[slot], e = p?.n ? pieceOf(cat, p.n) : null;
    if ( e && e.s === slot ) out.slots[slot] = {n: e.n, ...(hex(p.c) ? {c: hex(p.c)} : {})};
  }
  return out;
}
/** Put a piece in its place (or empty the place with null), and say the figure anew. */
export function wear(fig, slot, name, cat) {
  const slots = {...fig.slots};
  const e = name ? pieceOf(cat, name) : null;
  if ( e && e.s === slot ) slots[slot] = {n: e.n}; else delete slots[slot];
  return {...fig, slots};
}
export function dye(fig, slot, colour) {
  if ( !fig.slots[slot] ) return fig;
  const p = {n: fig.slots[slot].n, ...(hex(colour) ? {c: hex(colour)} : {})};
  return {...fig, slots: {...fig.slots, [slot]: p}};
}

/**
 * The quick picture as layers of the atlas, undermost first: {i, tint, mode}. The body and the hair are drawn pale
 * in the atlas and take their colour by multiplying; a piece given its own dye keeps its light and dark and takes
 * the dye's colour.
 */
export function layersOf(fig, cat) {
  const out = [{i: cat.body ?? 0, tint: fig.skin, mode: "multiply"}];
  const hairAt = cat.hair?.[fig.hairStyle];
  const head = fig.slots.head ? pieceOf(cat, fig.slots.head.n) : null;
  for ( const slot of DRAW ) {
    if ( slot === "head" && hairAt !== undefined ) out.push({i: hairAt, tint: fig.hair, mode: "multiply"});
    const p = fig.slots[slot], e = p ? pieceOf(cat, p.n) : null;
    if ( e ) out.push({i: e.i, tint: p.c ?? null, mode: p.c ? "color" : null});
  }
  return out;
}
/** Where a layer sits in the atlas. */
export const cellOf = (cat, i) => ({x: (i % cat.cols) * cat.w, y: Math.floor(i / cat.cols) * cat.h, width: cat.w, height: cat.h});

/** The figure as the batch reads it: worn things undermost first (with a dye where one was chosen), and what is held. */
export function rosterPart(fig) {
  const pair = p => p.c ? [p.n, p.c] : p.n;
  return {look: {skin: fig.skin, hair: fig.hair, hairStyle: fig.hairStyle},
    worn: DRAW.filter(s => s !== "hand" && s !== "offhand" && fig.slots[s]).map(s => pair(fig.slots[s])),
    held: ["hand", "offhand"].filter(s => fig.slots[s]).map(s => fig.slots[s].n)};
}
