/**
 * Which power an NPC uses by itself (B4926, B4927). Pure: no Foundry calls.
 *
 * powers: from WoDX Actions' npcPowers ({name, level, uses, obvious, free}). st: the fight as the NPC reads it:
 * wounds (levels taken), nearDeath, losing, outnumbered, frenzied, cornered, mortalsSee, hasTarget, boosted, called.
 */

/** The use the moment calls for first, in order. */
export function wants(st = {}) {
  const out = [];
  if ( st.nearDeath || (st.wounds ?? 0) >= 4 ) out.push("heal");
  if ( st.losing || st.nearDeath ) out.push("escape");
  if ( st.outnumbered && !st.called ) out.push("call");
  if ( st.hasTarget ) out.push("attack", "hold");
  if ( !st.boosted ) out.push("boost");
  if ( (st.wounds ?? 0) >= 2 ) out.push("guard");
  return out;
}

/** May an obvious power be used with mortals watching? Only by the frenzied, the cornered and the near-dead (B4927). */
export const mayShow = (st = {}) => !st.mortalsSee || !!(st.frenzied || st.cornered || st.nearDeath);

/** The power to use, and why; null when none fits (the NPC then fights another way). */
export function pick(powers = [], st = {}) {
  const usable = powers.filter(p => p.free !== false && (!p.obvious || mayShow(st)));
  for ( const use of wants(st) ) {
    const fit = usable.filter(p => (p.uses ?? []).includes(use));
    if ( !fit.length ) continue;
    // The strongest of its kind; a power with one use only beats a mixed one of the same level
    fit.sort((a, b) => (Number(b.level) || 0) - (Number(a.level) || 0) || (a.uses.length - b.uses.length));
    return {power: fit[0], use, why: WHY[use]};
  }
  return null;
}

/**
 * B6400: the NPC has a power that fits, but every fitting one is obvious and mortals are watching (B4927), so it holds
 * the power back. True only then: no pick now, and a pick were no mortal looking on.
 */
export const heldBack = (powers = [], st = {}) => !!st.mortalsSee && !pick(powers, st) && !!pick(powers, {...st, mortalsSee: false});

const WHY = {
  heal: "badly hurt: it mends itself",
  escape: "losing: it gets away",
  call: "outnumbered: it calls help",
  attack: "it strikes with its strongest power",
  hold: "it holds its foe",
  boost: "it strengthens itself first",
  guard: "hurt: it guards itself"
};
