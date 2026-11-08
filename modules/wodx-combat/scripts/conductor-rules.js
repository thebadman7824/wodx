/**
 * WoDX Combat 3.7 (B68, B69): the turn conductor's rules, pure so the harness can test them.
 *
 * The round (VtDA20 pdf p. 344): Initiative each turn; actions resolve from the highest down; anyone may delay to a later
 * point in the order; actions bought as multiple actions (Celerity, VtDA20 pdf p. 203) come at the end of the turn in
 * Initiative order. Rage actions likewise come after everyone's normal turn, in Initiative order (W20 pdf p. 268).
 */

export const LEVELS = { off: "Off (the Storyteller advances every turn)", npc: "NPC turns", everyone: "Everyone (NPCs and player characters)" };

/**
 * What the conductor does now with the current combatant. state:
 *   level, paused, phase ("main"|"extra"),
 *   c: {isNPC, npcMode ("suggest"|"auto"|"off"), cannotAct, held},
 *   npcDone, npcWaiting, actionSpent, graceOver, timerOver,
 *   blocks: {pendingDamage, moving, pendingApproval}
 * Returns {act: "wait"|"advance"|"hold"|"skip", why}.
 */
export function decide(s) {
    const c = s.c ?? {};
    if (s.level === "off" || !s.level) return { act: "wait", why: "the conductor is off" };
    if (s.paused) return { act: "wait", why: "the game is paused" };
    const b = s.blocks ?? {};
    const blocked = b.pendingDamage ? "damage waits to be applied" : b.moving ? "a token is still moving" : b.pendingApproval ? "an approval from this turn waits for the Storyteller" : "";
    if (c.held && !c.isNPC && s.level !== "everyone") return { act: "wait", why: "player turns are the players' to end" };
    if (c.held) return blocked ? { act: "wait", why: blocked } : { act: "advance", why: "holding the action for later in the round" };
    if (c.cannotAct && (c.isNPC || s.level === "everyone")) return blocked ? { act: "wait", why: blocked } : { act: "skip", why: "cannot act" };
    if (c.isNPC) {
        if (c.npcMode === "off") return { act: "wait", why: "this NPC's mode is Off: the Storyteller ends the turn" };
        if (s.npcWaiting) return { act: "wait", why: "the NPC's best option needs the Storyteller" };
        if (!s.npcDone) return { act: "wait", why: c.npcMode === "auto" ? "the NPC is acting" : "waiting for the Storyteller to accept a plan" };
        return blocked ? { act: "wait", why: blocked } : { act: "advance", why: "the NPC has acted" };
    }
    if (s.level !== "everyone") return { act: "wait", why: "player turns are the players' to end" };
    if (s.timerOver && !s.actionSpent) return { act: "hold", why: "the turn's time ran out: the action is held" };
    if (s.actionSpent && s.graceOver) return blocked ? { act: "wait", why: blocked } : { act: "advance", why: "the action is spent" };
    if (s.timerOver) return blocked ? { act: "wait", why: blocked } : { act: "advance", why: "the turn's time ran out" };
    return { act: "wait", why: s.actionSpent ? "the countdown runs (Hold to keep the turn)" : "waiting for the character to act" };
}

/** The second pass: everyone with extra actions this turn, highest Initiative first (ties by id, stable). */
export function extraPass(combatants) {
    return combatants.filter(c => (Number(c.extra) || 0) > 0 && !c.defeated)
        .sort((a, b) => (Number(b.initiative) || 0) - (Number(a.initiative) || 0) || String(a.id).localeCompare(String(b.id)))
        .map(c => ({ id: c.id, n: Number(c.extra) }));
}

/**
 * The Initiative that puts a held character straight after the current one: between the current combatant and the next
 * in the order (turns sorted highest first), or just below the current one when it is last.
 */
export function stepInInitiative(current, next) {
    const cur = Number(current) || 0;
    if (next === null || next === undefined || Number.isNaN(Number(next))) return Math.round((cur - 0.001) * 10000) / 10000;
    const n = Number(next);
    return Math.round(((cur + n) / 2) * 10000) / 10000;
}

/** Whole seconds left of a countdown (never below zero), or null when there is none. */
export function secondsLeft(endsAt, now = Date.now()) {
    if (!endsAt) return null;
    return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

/** How many actions a character has this turn: one, plus extra actions bought (Rage) or declared (Celerity). */
export const actionsAllowed = ({ extra = 0 } = {}) => 1 + Math.max(0, Number(extra) || 0);
