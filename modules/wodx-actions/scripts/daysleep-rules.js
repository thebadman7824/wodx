/**
 * WoDX Actions: day sleep, the pure rules (B4890-B4899).
 *
 *   wantsSleep({isNight, toDusk, rating})   should a Cainite who is not held awake be asleep now?
 *   wakeAt(now, toDusk, rating)             the clock time they rise: sunset moved by Humanity or Path (V20 p. 311,
 *                                           V20 Dark Ages p. 113; riseOffset in beast-marks-rules.js)
 *   awakeUntil(now, turns)                  how long a Road roll keeps them up: a turn is three seconds, five
 *                                           successes the scene (taken as an hour of the clock)
 *   dayKey(now, toDusk)                     one key per day, so the dawn vigil is rolled once a day
 *   awakening(roll, {light, deep})          the Awakening roll by day (V20 pp. 262-263): each success a turn, five the
 *                                           scene, a failure sleeps on, a botch sleeps until sundown
 *
 * No Foundry here: tools/harness/daysleep.test.mjs runs these.
 */
import { riseOffset } from "./beast-marks-rules.js";
import {SCENE_SECONDS, TURN_SECONDS} from "../../wodx-chronicle/scripts/terms.mjs";
export {SCENE_SECONDS, TURN_SECONDS};

const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

/** Seconds of the clock one turn takes by day (the sunlight system counts the same). */
/** Five successes keep a Cainite up for the scene; the clock takes a scene as this long. */

/** Seconds before sunset that a Cainite of this rating stirs (Road or Humanity 7+ rise just before it). */
export const earlySeconds = rating => Math.max(0, -riseOffset(rating) * 60);

/**
 * Should this Cainite be asleep now? By night, no. By day, yes, unless sunset is close enough that they already rise
 * (a high Humanity or Road wakes ten minutes before it). toDusk null or absent: the sun does not set (polar day).
 */
export function wantsSleep({ isNight, toDusk = null, rating = 0 } = {}) {
    if (isNight === null || isNight === undefined) return false;
    if (isNight) return false;
    if (toDusk === null || toDusk === undefined || !Number.isFinite(Number(toDusk))) return true;
    return n(toDusk) > earlySeconds(rating);
}

/** The world time a sleeper rises: the coming sunset, earlier or later by their rating. */
export function wakeAt(now, toDusk, rating) {
    if (toDusk === null || toDusk === undefined || !Number.isFinite(Number(toDusk))) return null;
    return n(now) + n(toDusk) + riseOffset(rating) * 60;
}

/** A Road roll that keeps them up: until when. turns: a number, or "scene" / Infinity. */
export function awakeUntil(now, turns, perTurn = TURN_SECONDS) {
    if (turns === "scene" || turns === Infinity) return n(now) + SCENE_SECONDS;
    return n(now) + Math.max(1, n(turns)) * (n(perTurn) > 0 ? n(perTurn) : TURN_SECONDS);
}

/** One key per day (the hour of its sunset), for the vigil rolled once at dawn. */
export const dayKey = (now, toDusk) => Math.round((n(now) + n(toDusk ?? 0)) / 3600);

/**
 * The Awakening roll's result. roll: {successes, botch} or null when a Light Sleeper wakes at once.
 * {awake, turns, deep, text}. deep: sleeps until sundown and cannot be roused (a botch).
 */
export function awakening(roll, { light = false } = {}) {
    if (light) return { awake: true, turns: Infinity, deep: false, text: "Light Sleeper: wide awake at once." };
    if (!roll) return { awake: false, turns: 0, deep: false, text: "Sleeps on." };
    if (roll.botch) return { awake: false, turns: 0, deep: true, text: "Botch: deep sleep until sundown." };
    if (n(roll.successes) <= 0) return { awake: false, turns: 0, deep: false, text: "Slips back into slumber." };
    if (n(roll.successes) >= 5) return { awake: true, turns: Infinity, deep: false, text: "Fully awake for the scene." };
    const s = n(roll.successes);
    return { awake: true, turns: s, deep: false, text: `Awake for ${s} turn${s === 1 ? "" : "s"}.` };
}

/** The daytime flag as stored: {turns, until, uncapped?}. Old flags without `until` last the scene from now. */
export function daytimeFlag(now, turns, extra = {}) {
    return { turns: turns === Infinity ? "scene" : turns, until: awakeUntil(now, turns), ...extra };
}

/** Is a daytime flag spent at this time? A flag counts down in turns in a fight and by the clock outside one. */
export function daytimeSpent(flag, now) {
    if (!flag) return true;
    if (typeof flag.turns === "number" && flag.turns <= 0) return true;
    if (flag.until === undefined || flag.until === null) return false;
    return n(now) >= n(flag.until);
}
