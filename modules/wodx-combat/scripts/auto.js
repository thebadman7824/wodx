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

/* ------------------------------------------------------------------ */
/*  Gridless play (3.5.0): reach by the tokens' edges, movement in yards */
/* ------------------------------------------------------------------ */

/**
 * Centre distance → the distance as if both tokens were one square wide, so reach is "edges within half a square"
 * on any scene, gridless or not. sizeA, sizeB: token widths in grid squares. unit: scene distance per square.
 */
export function reachDistance(centre, sizeA = 1, sizeB = 1, unit = 5) {
    if (centre === null || centre === undefined) return null;
    const extra = ((Math.max(1, sizeA) + Math.max(1, sizeB)) / 2 - 1) * unit;
    return Math.max(0, centre - extra);
}
export const inReach = (reachD, unit = 5) => reachD !== null && reachD <= unit * 1.5;

/** Scene distance → yards (VtDA20 counts yards or meters; feet are a third of a yard). */
export function toYards(distance, units = "ft") {
    const u = String(units ?? "").toLowerCase().trim();
    if (["ft", "feet", "foot", "'"].includes(u)) return distance / 3;
    if (["mi", "mile", "miles"].includes(u)) return distance * 1760;
    if (["km"].includes(u)) return distance * 1000;
    return distance; // yd, m, or unnamed: one to one
}

/**
 * Movement per turn (VtDA20 p. 333): walk 7, jog 12 + Dexterity, run 20 + 3 × Dexterity yards; Celerity adds its dots
 * (p. 202); an animal form that doubles running speed doubles the run (p. 241). Wounds (p. 351): Injured halves the
 * run, Wounded walks only, Mauled 3, Crippled 1, Incapacitated 0. woundIndex: levels marked (0 unhurt … 7).
 */
export function movement({ dexterity = 2, celerity = 0, woundIndex = 0, doubleRun = false } = {}) {
    let walk = 7 + celerity, jog = 12 + dexterity + celerity, run = 20 + 3 * dexterity + celerity;
    if (doubleRun) run *= 2;
    let note = "";
    if (woundIndex >= 7) { walk = jog = run = 0; note = "Incapacitated: cannot move"; }
    else if (woundIndex === 6) { walk = jog = run = 1; note = "Crippled: crawls a yard"; }
    else if (woundIndex === 5) { walk = jog = run = 3; note = "Mauled: hobbles 3 yards"; }
    else if (woundIndex === 4) { jog = run = walk; note = "Wounded: may only walk"; }
    else if (woundIndex === 3) { run = Math.floor(run / 2); jog = Math.min(jog, run); note = "Injured: half running speed"; }
    return { walk, jog, run, attackAfter: Math.floor(run / 2), note };
}
/** How far she has gone this turn: "walk" | "jog" | "run" | "over". */
export function pace(yards, m) {
    if (yards <= m.walk + 1e-6) return "walk";
    if (yards <= m.jog + 1e-6) return "jog";
    if (yards <= m.run + 1e-6) return "run";
    return "over";
}
