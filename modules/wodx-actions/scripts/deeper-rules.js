/**
 * Display-only desk, batch B (B3130 to B3133): what other WoDX modules now leave on a character that the rolls read.
 * Pure rules, no Foundry.
 *   - B3130: a "Nightmares" effect from WoDX Storyteller (flags.wodx-storyteller.diceLess) takes its dice from every roll.
 *   - B3131: dressed as a stranger where they stand (WoDX NPC), blending into a crowd is harder.
 *   - B3132: a mood region's fear-of-fire step (WoDX Atmosphere) adds to Rotschreck and frenzy.
 *   - B3133: an entry in the character's codex counts as research: one off the difficulty of a related Occult or
 *     lore roll, once for each entry (V20 has research take time; the one point is WoDX's figure).
 * Batch D (3.65.0):
 *   - B3441: dressed above or below the station of the one they deal with (WoDX Library's look, which now reads the
 *     clothes of WoDX Paperdoll's figure too), an Etiquette or Subterfuge roll gains or loses a die. V20's Etiquette
 *     leaves dress to the Storyteller; the one die is WoDX's figure.
 *   - B3444: reading a face. Perception + Empathy against the speaker's Manipulation + Subterfuge (V20's resisted
 *     rolls; difficulty 6 each). Won: the true feeling under the words, and a flicker when the line is a lie (the
 *     Storyteller marks a talk line "lie"). Lost: the face gives nothing away. Botched: they seem to mean every word.
 */

/** Abilities a codex entry can help: Occult, Academics and the lores. */
export const RESEARCH_RE = /occult|academics|lore|cosmology|enigmas|theology/i;
export const RESEARCH_DIFF = -1;
export const researchHelps = (abilityKey, abilityLabel = "") => RESEARCH_RE.test(String(abilityKey ?? "")) || RESEARCH_RE.test(String(abilityLabel ?? ""));

/** Abilities that dress helps or hurts. */
export const DRESS_RE = /etiquette|subterfuge/i;
export const dressCounts = (abilityKey, abilityLabel = "") => DRESS_RE.test(String(abilityKey ?? "")) || DRESS_RE.test(String(abilityLabel ?? ""));
/** WoDX Library's dressedVs reading to dice: "fine" +1, "poor" -1, anything else 0. */
export const DRESS_DICE = { fine: 1, poor: -1 };
export const dressDice = dressed => DRESS_DICE[dressed] ?? 0;

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
export function deeperMods({ nightmares = 0, crowd = 0, research = false, dressed = null } = {}) {
    const out = { dice: 0, diff: 0, parts: [] };
    const dd = dressDice(dressed);
    if (dd) { out.dice += dd; out.parts.push(dd > 0 ? `Dressed above their station +${dd} die` : `Dressed below their station ${dd} die`); }
    if (nightmares > 0) { out.dice -= nightmares; out.parts.push(`Nightmares -${nightmares} ${nightmares === 1 ? "die" : "dice"}`); }
    if (crowd > 0) { out.diff += crowd; out.parts.push(`Dressed as a stranger here +${crowd} diff`); }
    if (research) { out.diff += RESEARCH_DIFF; out.parts.push(`Research from the codex ${RESEARCH_DIFF} diff`); }
    return out;
}

/** What an NPC truly feels toward the one reading them, from the attitude step (WoDX NPC) or a mood set by hand. */
export function feelingOf({ step = 0, mood = "" } = {}) {
    const m = String(mood ?? "").trim();
    if (m) return `they are ${m.toLowerCase()}`;
    const st = Number(step) || 0;
    return st <= -2 ? "they mean you ill" : st === -1 ? "they are cold to you" : st === 0 ? "they care little either way" : st === 1 ? "they are warm to you" : "they like you well";
}
/** The face expression that shows the true feeling (WoDX Paperdoll's faces). */
export function feelingFace({ step = 0, mood = "" } = {}) {
    const m = String(mood ?? "").toLowerCase();
    if (/angry|furious|hostile/.test(m)) return "anger";
    if (/afraid|scared|fear/.test(m)) return "fear";
    if (/sad|grie|hurt/.test(m)) return "sorrow";
    if (/happy|glad|merry|warm/.test(m)) return "smile";
    if (/wary|sly|mock|scorn/.test(m)) return "smirk";
    const st = Number(step) || 0;
    return st <= -2 ? "anger" : st === -1 ? "smirk" : st >= 1 ? "smile" : "neutral";
}
/**
 * Reading a face: me and them are rolls ({successes, botch}). Returns {won, lines, face}: what the reader learns, and
 * the expression to flicker on the face (null when nothing shows).
 */
export function faceRead(me, them, { lie = false, step = 0, mood = "" } = {}) {
    if (me?.botch) return { won: false, lines: ["You misread them: they seem to mean every word."], face: null };
    const mine = Number(me?.successes) || 0, theirs = them?.botch ? 0 : Number(them?.successes) || 0;
    if (mine <= theirs) return { won: false, lines: ["The face gives nothing away."], face: null };
    const lines = [`Under the words, ${feelingOf({ step, mood })}.`];
    lines.push(lie ? "A flicker crosses the face: what they just said is not the truth." : "Nothing in the face says they lie.");
    return { won: true, lines, face: lie ? "smirk" : feelingFace({ step, mood }) };
}
