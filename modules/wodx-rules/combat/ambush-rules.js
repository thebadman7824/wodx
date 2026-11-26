/**
 * WoDX Combat 3.11.0 (B836): the ambush. The pure parts, so the harness can test them.
 *
 * An attacker who lies in wait (sneaking, Obfuscated, or a token the Storyteller has hidden) and strikes someone not
 * already fighting rolls Dexterity + Stealth against the target's Perception + Alertness, both at 6.
 *   V20 (printed p. 274, pdf 282): more successes give one free attack the target cannot answer, with the extra
 *     successes added to its dice; a tie lets the ambusher go first, but the target may defend; fewer, and the fight
 *     starts on plain initiative. Someone already in a fight cannot be ambushed.
 *   V20 Dark Ages (printed p. 345): the same roll; a win gives one free action the target cannot oppose, with no
 *     extra dice. The book names no tie, so a tie goes first with a defence, as V20 has it (house rule).
 * The book's rule follows the chronicle: Dark Ages before 1450, V20 after.
 */

export const DIFFICULTY = 6;

/** Is this an ambush at all? s: {hidden, sneaking, obfuscated, attackerFighting, targetFighting}. */
export function isAmbush(s = {}) {
    if (s.attackerFighting || s.targetFighting) return false;
    return !!(s.hidden || s.sneaking || s.obfuscated);
}

/**
 * The outcome. ambusher, target: successes (a botch counts as none). book: "v20" or "v20da".
 * Returns {result: "free"|"first"|"spotted", attack: bool, defend: bool, bonusDice, why}.
 */
export function ambushOutcome(ambusher, target, book = "v20") {
    const a = Math.max(0, Number(ambusher) || 0), t = Math.max(0, Number(target) || 0);
    const da = book === "v20da";
    const ref = da ? "V20 Dark Ages p. 345" : "V20 p. 274";
    if (a > t) return { result: "free", attack: true, defend: false, bonusDice: da ? 0 : a - t,
        why: da ? `the ambush succeeds: a free action the target cannot oppose (${ref})` : `the ambush succeeds: a free attack, no defence, ${a - t} extra ${a - t === 1 ? "die" : "dice"} (${ref})` };
    if (a === t) return { result: "first", attack: true, defend: true, bonusDice: 0, why: `a tie: the ambusher strikes first, but the target may defend (${ref}${da ? "; a tie as V20 has it, house rule" : ""})` };
    return { result: "spotted", attack: false, defend: true, bonusDice: 0, why: `the target sees it coming: no free blow, the fight starts on initiative (${ref})` };
}

/** The book for a year: Dark Ages before 1450, else V20. */
export const bookFor = year => (Number(year) > 0 && Number(year) < 1450 ? "v20da" : "v20");
