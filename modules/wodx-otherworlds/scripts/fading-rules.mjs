/**
 * WoDX Otherworlds: turning to spirit, a step at a time (B5017, desk pick o1). Pure rules.
 *
 * A shapechanger past a year and a day in the Umbra starts to become a creature of spirit (W20 p. 319), and a living
 * mage beyond the Penumbra past three phases of the moon starts to lose the body (M20 pdf 89-90). Once the change is
 * approved it goes on by itself: a step for every lunar month spent in the spirit world after it began, up to five,
 * and it holds while the traveller is back in the flesh. The pace and what each step does are house readings.
 */
import {LUNAR_MONTH} from "../../wodx-chronicle/scripts/terms.mjs";
/** A lunar month (the shared figure, B6181). */
export const MONTH = LUNAR_MONTH;
export const MAX_STEP = 5;
const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** The step reached: 1 when it begins, +1 a lunar month spent away after that, at most 5. */
export function stepOf(away = 0) { return Math.max(1, Math.min(MAX_STEP, 1 + Math.floor(Math.max(0, n(away)) / MONTH))); }

/**
 * What a step does. kind "spirit" (the shapechanger): in the physical world, +1 difficulty to every roll for each
 * two steps, as the flesh slips; at 5 the character is a spirit. kind "disembodied" (the mage): a die off Strength,
 * Dexterity and Stamina rolls a step; at 5 the body is gone.
 * Returns [{key, name, dice, diff, tags}] for WoDX Chronicle's roll sources.
 */
export function stepEffects(kind, step, {inFlesh = true} = {}) {
  const s = Math.max(0, Math.min(MAX_STEP, Math.round(n(step))));
  if ( !s ) return [];
  if ( kind === "spirit" ) return inFlesh && s >= 2 ? [{key: "spirit-change", name: "Turning to spirit", dice: 0, diff: Math.floor(s / 2), tags: ["all"]}] : [];
  if ( kind === "disembodied" ) return [{key: "disembodied", name: "The body fading", dice: -s, diff: 0, tags: ["strength", "dexterity", "stamina", "brawl", "melee", "athletics"]}];
  return [];
}
export function stepText(kind, step) {
  const s = Math.max(1, Math.min(MAX_STEP, Math.round(n(step))));
  if ( kind === "spirit" ) return s >= MAX_STEP ? "is a creature of spirit now: the flesh no longer holds them (W20 p. 319)."
    : `turns further to spirit (step ${s} of ${MAX_STEP})${s >= 2 ? `: +${Math.floor(s / 2)} difficulty to every roll in the physical world` : ""}.`;
  return s >= MAX_STEP ? "has lost the body: only the Pattern remains (M20 pdf 89-90)."
    : `fades further from the body (step ${s} of ${MAX_STEP}): ${s} dice off Strength, Dexterity and Stamina rolls.`;
}
/** The look: a cold pale aura that grows with the step, flickering near the end. */
export function lookOf(step) {
  const s = Math.max(0, Math.min(MAX_STEP, Math.round(n(step))));
  if ( !s ) return null;
  return {aura: {color: 0x9fc8ff, radius: 0.5 + s * 0.05, alpha: 0.12 + s * 0.06}, flicker: s >= 4, tint: s >= 3 ? 0xd8e4ff : null};
}
