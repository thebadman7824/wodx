/**
 * Trying again (B7121, weekly review pick ac1). A failed task tried again is harder: each new attempt adds 1 to the
 * difficulty, and once that brings it to 10 the character cannot try (V20 Dark Ages pdf 324; Demon: The Fallen pdf 223;
 * Hunter: The Reckoning pdf 172). The Action window always had a Retries box; this remembers the failures, so the box
 * no longer has to be filled in by hand.
 *
 * Only a simple roll (or teamwork) counts. An extended roll already allows repeated attempts and a resisted roll is
 * won or lost outright, as the books say. The memory is kept per character, per task (the preset, or the Attribute and
 * Ability) and per target, for one scene: a new scene, or the Storyteller's Clear, starts it again. A success on the
 * task clears it too. Pure functions; main.js keeps the store on the actor (flags.wodx-actions.retry).
 *
 * store: {scene, n: {key: failures}}
 */

/** The modes the rule covers. */
export const COUNTED_MODES = ["simple", "teamwork"];
/** The most remembered per character, oldest dropped first. */
export const KEEP = 40;

export const counts = mode => COUNTED_MODES.includes(String(mode || "simple"));

/** The task's key: the preset if one was picked, else the Attribute and Ability, and the target. */
export function retryKey({ preset = "", attr = "", ability = "", targetId = "" } = {}) {
    const task = preset ? `p:${preset}` : `t:${attr || ""}+${ability || ""}`;
    return `${task}@${targetId || "-"}`;
}

/** Failures remembered for this task in this scene (0 when the store is from another scene). */
export function retriesNow(store, key, scene) {
    if (!store || store.scene !== scene) return 0;
    return Math.max(0, Math.floor(Number(store.n?.[key]) || 0));
}

/** The store after a roll: a failure (no successes, or a botch) adds one; a success clears the task. */
export function afterRoll(store, key, scene, { failed = false } = {}) {
    const n = store && store.scene === scene ? { ...(store.n ?? {}) } : {};
    if (failed) {
        const was = Math.max(0, Math.floor(Number(n[key]) || 0));
        delete n[key];
        n[key] = was + 1;
        const keys = Object.keys(n);
        while (keys.length > KEEP) delete n[keys.shift()];
    } else delete n[key];
    return { scene, n };
}

const NTH = ["second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];
/** The card's words for an attempt after so many failures: "second try", "third try", or "" before any. */
export function tryLabel(failures) {
    const k = Math.max(0, Math.floor(Number(failures) || 0));
    if (!k) return "";
    return `${NTH[k - 1] ?? `attempt ${k + 1}:`} try`.replace(": try", "");
}
