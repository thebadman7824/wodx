/**
 * WoDX Sheets (B6175): what WoDX adds to a roll made from the system's own sheet (an Attribute or Ability clicked,
 * rolled through the system's general roll window). Pure rules, no Foundry: the Foundry side is sheet-rolls.mjs.
 *
 * The parts are the same ones WoDX Actions' roll window reads: the character's merits and flaws and every other
 * Chronicle roll effect (derangement bouts, drink and drugs, wards and the like, already summed by Chronicle's
 * sumEffects), the powers on them (a Boost, a Blessing or Curse), and the registered conditions that make the
 * bearer's own actions harder.
 */

const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

/** The difficulty the dice can reach: a face shows 10 at most. */
export const MAX_DIFF = 10;

/**
 * The modifiers for one sheet roll.
 *   traits: {dice, diff, parts} from Chronicle's traits.rules.sumEffects, or null
 *   powers: {dice, diff, parts} from WoDX Actions' powerMods, or null
 *   conditions: [{name, mods: {ownDiff, ownDiffVision}}]
 *   sight: true when the roll needs sight (a Perception roll), so a Blinded condition counts
 * Returns {dice, diff, parts}.
 */
export function combine({traits = null, powers = null, conditions = [], sight = false} = {}) {
  let dice = 0, diff = 0;
  const parts = [];
  for ( const src of [traits, powers] ) {
    if ( !src ) continue;
    dice += n(src.dice); diff += n(src.diff);
    parts.push(...(src.parts ?? []));
  }
  for ( const c of conditions ?? [] ) {
    const d = n(c?.mods?.ownDiff) + (sight ? n(c?.mods?.ownDiffVision) : 0);
    if ( !d ) continue;
    diff += d;
    parts.push(`${c.name} ${d > 0 ? "+" : ""}${d} diff`);
  }
  return {dice, diff, parts};
}

/**
 * The system window's bonus dice and difficulty with the modifiers on. The difficulty stays between the system's
 * lowest (lowest, 2 by default) and 10.
 */
export function applyTo({bonus = 0, difficulty = 6} = {}, mods = {}, lowest = 2) {
  const want = n(difficulty) + n(mods.diff);
  return {bonus: n(bonus) + n(mods.dice), difficulty: Math.max(lowest, Math.min(MAX_DIFF, want)), capped: want > MAX_DIFF};
}

/** The line the roll card gets, naming each part. */
export function cardLine(mods = {}) {
  const parts = mods.parts ?? [];
  if ( !parts.length ) return "";
  const sum = [mods.dice ? `${mods.dice > 0 ? "+" : ""}${mods.dice} dice` : "", mods.diff ? `${mods.diff > 0 ? "+" : ""}${mods.diff} difficulty` : ""].filter(Boolean).join(", ");
  return `WoDX: ${parts.join("; ")}${sum ? ` (${sum})` : ""}`;
}
