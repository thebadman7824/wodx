/**
 * Display-only desk, batch B (B3130 to B3133): what other WoDX modules now leave on a character that the rolls read.
 * Pure rules, no Foundry.
 *   - B3130: a "Nightmares" effect from WoDX Storyteller (flags.wodx-storyteller.diceLess) takes its dice from every roll.
 *   - B3131: dressed as a stranger where they stand (WoDX NPC), blending into a crowd is harder.
 *   - B3132: a mood region's fear-of-fire step (WoDX Atmosphere) adds to Rotschreck and frenzy.
 *   - B3133: an entry in the character's codex counts as research: one off the difficulty of a related Occult or
 *     lore roll, once for each entry (V20 has research take time; the one point is WoDX's figure).
 */

/** Abilities a codex entry can help: Occult, Academics and the lores. */
export const RESEARCH_RE = /occult|academics|lore|cosmology|enigmas|theology/i;
export const RESEARCH_DIFF = -1;
export const researchHelps = (abilityKey, abilityLabel = "") => RESEARCH_RE.test(String(abilityKey ?? "")) || RESEARCH_RE.test(String(abilityLabel ?? ""));

/** The dice the Nightmares effects take: the largest diceLess on an enabled effect. effects: [{disabled, flags}]. */
export function nightmareDice(effects = []) {
    let n = 0;
    for (const e of effects ?? []) if (!e?.disabled) n = Math.max(n, Math.max(0, Number(e?.flags?.["wodx-storyteller"]?.diceLess) || 0));
    return n;
}

/**
 * The modifiers for one roll: {dice, diff, parts}.
 * nightmares: dice to take; crowd: the blend step when the player ticked "blending into a crowd"; research: true when an
 * entry is spent on a roll it helps.
 */
export function deeperMods({ nightmares = 0, crowd = 0, research = false } = {}) {
    const out = { dice: 0, diff: 0, parts: [] };
    if (nightmares > 0) { out.dice -= nightmares; out.parts.push(`Nightmares -${nightmares} ${nightmares === 1 ? "die" : "dice"}`); }
    if (crowd > 0) { out.diff += crowd; out.parts.push(`Dressed as a stranger here +${crowd} diff`); }
    if (research) { out.diff += RESEARCH_DIFF; out.parts.push(`Research from the codex ${RESEARCH_DIFF} diff`); }
    return out;
}
