/**
 * Fights that end by themselves, the pure rules (WoDX Combat 3.21.0, B2455). A fight is over when one side has
 * nobody left standing: down (defeated) or off the scene (fled). A hidden token still counts as there, since an
 * ambusher waits hidden. It ends once that has held for
 * a full turn, so a fighter who comes back in time keeps it going. No Foundry here: the harness tests these.
 *
 * Sides: a player's character or a friendly token is on the characters' side; a hostile token, or a neutral one that
 * nobody plays, is a foe. A fight with nobody on one side from the start (a test, a lone frenzy) never counts as over.
 */

export const MODES = {
    off: "Off (the Storyteller ends every fight)",
    suggest: "Suggest (a card with End the fight)",
    auto: "Auto (the fight ends by itself)"
};

/** f: {pc, friendly, hostile, neutral, defeated, present}. Returns "pcs", "foes" or null (not in the fight). */
export function sideOf(f = {}) {
    if (f.pc || f.friendly) return "pcs";
    if (f.hostile || f.neutral) return "foes";
    return null;
}
export const standing = f => !f.defeated && f.present !== false;

/**
 * Is the fight over? fighters: [{pc, friendly, hostile, neutral, defeated, present, name}].
 * @returns {{over: boolean, winner: "pcs"|"foes"|null, why: string}}
 */
export function fightOver(fighters = []) {
    const sides = {pcs: [], foes: []};
    for (const f of fighters ?? []) { const s = sideOf(f); if (s) sides[s].push(f); }
    if (!sides.pcs.length || !sides.foes.length) return {over: false, winner: null, why: "only one side was ever in it"};
    const up = s => sides[s].filter(standing).length;
    if (!up("foes")) return {over: true, winner: "pcs", why: "no foe is left standing"};
    if (!up("pcs")) return {over: true, winner: "foes", why: "none of the characters is left standing"};
    return {over: false, winner: null, why: ""};
}

/**
 * The watch: when the fight first looks over, remember the round and turn; once a full turn has passed with it still
 * over, it ends. watch: {round, turn} or null. now: {round, turn}. Returns {watch, end}.
 */
export function step(watch, over, now = {}) {
    if (!over) return {watch: null, end: false};
    const r = Number(now.round) || 0, t = Number(now.turn) || 0;
    if (!watch) return {watch: {round: r, turn: t}, end: false};
    const end = r > watch.round && t >= watch.turn || r > watch.round + 1;
    return {watch, end};
}
