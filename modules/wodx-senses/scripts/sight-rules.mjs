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
/**
 * 0.7.0: the same rings in colours that stay apart for colour-blind eyes (the Okabe and Ito palette), with a stronger
 * line; and every ring carries its words on the map, so colour never carries the meaning alone.
 */
export const SAFE = {
  kindred: 0xffffff, ghoul: 0x999999, lupine: 0xd55e00, mage: 0x56b4e9, fae: 0xf0e442,
  wraith: 0x0072b2, spirit: 0x0072b2, mortal: 0xe69f00, hunter: 0xe69f00, life: 0x009e73
};
export const LIFE = {colour: 0xffb347, alpha: 0.6, words: "alive"};
/**
 * 0.10.0 (B2900): Aura Perception needs a reading. A ring shows round a creature only after the character has Read
 * the Soul of that token (WoDX Otherworlds, Perception + Empathy at difficulty 8; the steps are V20 Dark Ages p. 195), and only as much as the successes showed: one success the shade alone, two or more the colour. A botched
 * reading shows a false colour. A reading holds for an hour of game time, then the character must look again.
 */
export const AURA_READ_SECONDS = 3600;
const PALE = new Set(["kindred", "ghoul", "wraith", "spirit"]);
/** The last reading of this token that still holds: {n, botch, at} or null. reads: {[tokenId]: {n, botch, at}}. */
export function readFor(reads, tokenId, now) {
  const r = reads?.[tokenId];
  if ( !r || typeof r !== "object" ) return null;
  const at = Number(r.at), t = Number(now);
  if ( Number.isFinite(at) && Number.isFinite(t) && (t < at || t - at > AURA_READ_SECONDS) ) return null;
  if ( r.botch ) return {n: 0, botch: true, at};
  const n = Math.max(0, Math.min(5, Math.round(Number(r.n) || 0)));
  return n ? {n, botch: false, at} : null;
}
/** What a botched reading shows instead: the living look like the dead and the dead like the living. */
export const falseProfile = p => PALE.has(p) ? "mortal" : "kindred";
/** Keep at most `max` readings, the newest. */
export function pruneReads(reads = {}, now, max = 40) {
  const live = Object.entries(reads ?? {}).filter(([k]) => readFor(reads, k, now));
  live.sort((a, b) => (Number(b[1].at) || 0) - (Number(a[1].at) || 0));
  return Object.fromEntries(live.slice(0, max));
}

/**
 * The ring a token gets under a sight: {colour, alpha, words} or null. safe: the colour-blind palette.
 * needsRead (0.10.0): Aura Perception shows only what `read` (from readFor) showed; false gives every ring as before.
 */
export function ringFor(sight, profile, {safe = false, needsRead = false, read = null} = {}) {
  const kind = SIGHTS[sight]?.rings;
  let r = null;
  if ( kind === "aura" && needsRead ) {
    if ( !read ) return null;
    if ( read.botch ) profile = falseProfile(profile);
    else if ( read.n === 1 ) {
      const pale = PALE.has(profile);
      r = {colour: pale ? 0xdcdce6 : 0xfff1c9, alpha: 0.4, words: pale ? "pale" : "bright", key: pale ? "kindred" : "mortal"};
      if ( safe ) r = {...r, colour: SAFE[r.key], alpha: 0.6};
      return r;
    }
  }
  if ( kind === "aura" ) r = AURAS[profile] ? {...AURAS[profile], key: profile} : {...AURAS.mortal, key: "mortal"};
  else if ( kind === "life" ) r = ["kindred", "wraith", "spirit"].includes(profile) ? null : {...LIFE, key: "life"};
  if ( r && safe ) r = {...r, colour: SAFE[r.key] ?? r.colour, alpha: Math.max(0.6, r.alpha)};
  return r;
}

/** Hex colour as CSS ("#rrggbb"). */
export const css = n => `#${(Number(n) >>> 0).toString(16).padStart(6, "0").slice(-6)}`;

/**
 * 0.10.0 (B2901): Heightened Senses can be overwhelmed. V20 warns that a sudden loud noise or bright flash can stun a
 * character whose senses are heightened (page to pin in the book check). House reading: a loud noise heard, or a gun
 * fired near them, calls for Willpower at difficulty 6; a failure leaves them stunned and deafened for one turn.
 */
/** near: how far a gunshot overwhelms, in the scene's own units (yards or metres on most maps). */
export const OVERLOAD = {difficulty: 6, turns: 1, near: 30};
export const GUN = /\b(gun|handgun|pistol|musket|rifle|arquebus|harquebus|caliver|carbine|petronel|revolver|shotgun|blunderbuss|hand ?cannon|cannon|culverin|matchlock|wheellock|flintlock|derringer|smg|submachine|machine ?gun|assault rifle|firearm)\b/i;
/** Does this event overwhelm heightened senses? ev {noise} or {weapon, ranged}. */
export function overwhelms(ev = {}) {
  if ( ev.noise === "loud" ) return true;
  return !!(ev.ranged && GUN.test(String(ev.weapon ?? "")));
}
export const overloadText = name => `${name}'s heightened senses are hit by the noise. Willpower at difficulty ${OVERLOAD.difficulty}: on a failure ${name} is stunned and deafened for ${OVERLOAD.turns} turn (the senses stay heightened).`;
