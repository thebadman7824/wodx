/**
 * WoDX Senses 0.5.0: supernatural sight on the map, the pure part. A player turns a sight on for their character
 * and their own map changes; nobody else's does. No Foundry in here.
 *
 *   heightened  Heightened Senses (Auspex 1, V20; the Garou Gift of the same name, W20): the map sharper and brighter.
 *   aura        Aura Perception (Auspex 2, V20): a ring round each creature in view, tinted by what it is. The tints follow
 *               V20's notes on what an aura shows of a creature's nature (pages still to pin); the exact colours are a
 *               house choice.
 *   lifesight   A wraith's Lifesight (Wraith 20): the map drained of colour, the living warm in it.
 * Profiles are WoDX Actions' (kindred, ghoul, lupine, mage, fae, wraith, spirit, demon, mummy, hunter, mortal ...).
 */
export const SIGHTS = {
  heightened: {label: "Heightened Senses", filter: "brightness(1.12) contrast(1.12) saturate(1.1)", rings: null},
  aura: {label: "Aura Perception", filter: "saturate(0.65) brightness(0.95)", rings: "aura"},
  lifesight: {label: "Lifesight", filter: "grayscale(0.85) brightness(0.9)", rings: "life"}
};
export const SIGHT_ORDER = ["heightened", "aura", "lifesight"];

/** The sights a character has: t {auspex (dots), heightenedGift, profile}. */
export function sightsFor(t = {}) {
  const out = [], a = Number(t.auspex) || 0;
  if ( a >= 1 || t.heightenedGift ) out.push("heightened");
  if ( a >= 2 ) out.push("aura");
  if ( t.profile === "wraith" ) out.push("lifesight");
  return out;
}

/** The next sight when the player presses the button: through the ones they have, then off. */
export function nextSight(current, have = []) {
  if ( !have.length ) return null;
  const i = have.indexOf(current);
  return i < 0 ? have[0] : (i + 1 < have.length ? have[i + 1] : null);
}

/** What an aura shows of a creature, as a tint and its strength. null: nothing to show. */
export const AURAS = {
  kindred: {colour: 0xdcdce6, alpha: 0.35, words: "pale"},
  ghoul: {colour: 0xd9b8b8, alpha: 0.45, words: "pale blotches"},
  lupine: {colour: 0xff8a3d, alpha: 0.7, words: "bright and wild"},
  mage: {colour: 0x9fd3ff, alpha: 0.65, words: "sparkling"},
  fae: {colour: 0xd08cff, alpha: 0.65, words: "shot with rainbow"},
  wraith: {colour: 0x8899aa, alpha: 0.2, words: "faint and broken"},
  spirit: {colour: 0x8899aa, alpha: 0.2, words: "faint and broken"},
  mortal: {colour: 0xffd27a, alpha: 0.5, words: "living colours"},
  hunter: {colour: 0xffd27a, alpha: 0.5, words: "living colours"}
};
/** The ring a token gets under a sight: {colour, alpha} or null. */
export function ringFor(sight, profile) {
  const kind = SIGHTS[sight]?.rings;
  if ( kind === "aura" ) return AURAS[profile] ?? AURAS.mortal;
  if ( kind === "life" ) return ["kindred", "wraith", "spirit"].includes(profile) ? null : {colour: 0xffb347, alpha: 0.6};
  return null;
}
