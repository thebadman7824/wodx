/**
 * WoDX Combat — the pure parts of the automatic options (3.4.0): facing, counting this round's actions and defenses,
 * the Fortitude soak policy, and when a resource is worth spending. No Foundry calls here, so the harness can test it.
 */

/**
 * Which side of the target the attacker stands on, from the target token's rotation (Foundry: 0 = the art upright,
 * facing down the screen; rotation turns it clockwise). null when the facing isn't known (rotation never set).
 * Front within 67.5° of the facing, rear within 45° of directly behind, flank between.
 */
export function facingSide(targetCenter, rotation, attackerCenter) {
    if (!targetCenter || !attackerCenter) return null;
    const r = Number(rotation);
    if (!Number.isFinite(r) || r === 0) return null;
    const rad = r * Math.PI / 180;
    const fx = -Math.sin(rad), fy = Math.cos(rad); // (0, 1) turned clockwise on a y-down screen
    const vx = attackerCenter.x - targetCenter.x, vy = attackerCenter.y - targetCenter.y;
    const len = Math.hypot(vx, vy);
    if (!len) return null;
    const deg = Math.acos(Math.max(-1, Math.min(1, (fx * vx + fy * vy) / len))) * 180 / Math.PI;
    return deg <= 67.5 ? "front" : deg >= 135 ? "rear" : "flank";
}

/** Count earlier attack cards this round that match: data = [{combatId, round, ...}], key = {combatId, round}. */
export function countThisRound(dataList, key, pred) {
    if (!key) return 0;
    return dataList.filter(d => d && d.combatId === key.combatId && d.round === key.round && pred(d)).length;
}

/** When the defender spends a blood point for automatic Fortitude soak (VtDA20 p. 218). */
export const SOAK_POLICIES = {
    aggravated: "Only against aggravated damage (not fire or sunlight)",
    always: "Every hit that Fortitude can soak",
    never: "Never (choose in the dialog)"
};
export function fortitudeDecision(policy, { dmgType, fireOrSun = false, fortitude = 0, blood = 0 }) {
    if (!(fortitude > 0) || !(blood > 0) || fireOrSun) return false;
    if (policy === "always") return true;
    if (policy === "never") return false;
    return dmgType === "aggravated";
}

/** Is spending worth it? before/after = {hitChance, expectedLevels}. */
export function worthIt(before, after) {
    const dHit = (after.hitChance ?? 0) - (before.hitChance ?? 0);
    const dLev = (after.expectedLevels ?? 0) - (before.expectedLevels ?? 0);
    return dHit >= 0.15 || dLev >= Math.max(0.3, 0.3 * (before.expectedLevels ?? 0));
}

/** Maneuvers the suggestion leaves out: no damage, or a special purpose (staking, impaling, covering fire). */
export const SUGGEST_SKIP = new Set(["stake", "impale", "suppress", "disarm", "hold"]);

export const pct = x => `${Math.round((x ?? 0) * 100)}%`;
