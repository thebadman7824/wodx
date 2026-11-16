/**
 * B3500: one gender for every module. Pure: no Foundry.
 *
 * A character's gender was kept in several places (the People generator, babies born in play, wills, the portrait's
 * look), and the modules that care each read only one of them. This reads them all in one order, the newest record
 * first. The value is "female", "male", "nonbinary", text of the player's own, or "" when nothing is known.
 *
 * The owner's ruling (2026-11-13): for player characters gender is a description only and has no bearing on play; any of
 * them may do anything. So forRules gives "" for a player character, which every rule reads as "not known". Characters
 * the Storyteller runs keep the rules that follow their sex (marriage law, who carries a child, inheritance, the Seed of
 * Lilith), and gender stays out of in-game text unless it is known.
 */
export const GENDERS = {female: "Female", male: "Male", nonbinary: "Nonbinary"};
/** How often the People generator makes someone nonbinary (the owner, 2026-11-13: 1 in 100). */
export const NONBINARY_SHARE = 0.01;
/**
 * The People generator's rule for "anyone" (B3503), for every module that draws an NPC: one draw r in [0, 1) gives the
 * side whose names the person takes (female under 0.5, else male) and, one time in a hundred, nonbinary, read from the
 * same draw so that everyone drawn before keeps their sex. Returns {sex, nameSex} (B6768).
 */
export function sexFromDraw(r, share = NONBINARY_SHARE) {
  const nameSex = r < 0.5 ? "female" : "male";
  return {nameSex, sex: Math.abs(r - 0.5) < share / 2 ? "nonbinary" : nameSex};
}

/** A written gender made plain: one of the GENDERS keys, the writer's own words (trimmed, at most 40 letters), or "". */
export function normalize(v) {
  const s = String(v ?? "").trim();
  if ( !s ) return "";
  const l = s.toLowerCase();
  if ( /^(f|female|woman|girl)$/.test(l) ) return "female";
  if ( /^(m|male|man|boy)$/.test(l) ) return "male";
  if ( /^(nb|enby|non-?binary)$/.test(l) ) return "nonbinary";
  return s.slice(0, 40);
}

/** Where a gender may be recorded, newest first. a: an actor-like {flags, system}. */
export function recorded(a) {
  const f = a?.flags ?? {}, c = f["wodx-creation"] ?? {};
  const all = [f["wodx-chronicle"]?.gender, c.people?.sex, c.sex, c.chronology?.sex, a?.system?.sex, f["wodx-paperdoll"]?.look?.face?.gender];
  for ( const v of all ) { const n = normalize(v); if ( n ) return n; }
  return "";
}

/**
 * The sex a rule may use: "female", "male" or "" (not known). "" for a player character, for anyone nonbinary or
 * describing themselves in their own words, and for anyone with nothing recorded.
 */
export function forRules(a, {player = false} = {}) {
  if ( player ) return "";
  const g = recorded(a);
  return g === "female" || g === "male" ? g : "";
}
/** The short form some rules take: "f", "m" or "". */
export const letter = g => g === "female" ? "f" : g === "male" ? "m" : "";
