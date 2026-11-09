import {MODULE_ID, isActiveGM, setting, setSetting, log} from "./util.mjs";

/**
 * Skip mode (Phase 4). A time skip moves the clock in one step. While it runs, per-tick automation waits
 * (WoDX modules check isSkipping()); other modules settle their effects on the hooks:
 *   wodxSkipStart {from, to, label}   before the clock moves
 *   wodxSkipEnd   {from, to, label}   after it has moved
 */

export function isSkipping() {
  try {
    return !!setting("skipping") || !!setting("hold");
  } catch {
    return false;
  }
}

/**
 * Hold the world: the clock can move (a flashback, a scene set years ago, a test) while nothing reacts to it.
 * Per-tick work in every WoDX module waits (they all ask isSkipping()), a time skip runs no skip hooks, and no
 * dated event or era change is made. Releasing the hold lets the world catch up from wherever the clock stands.
 */
export function isHeld() {
  try {
    return !!setting("hold");
  } catch {
    return false;
  }
}

export async function setHold(on) {
  if ( !game.user.isGM ) return false;
  await setSetting("hold", !!on);
  return !!on;
}

/** GM: move the clock to `to` (world time, seconds) as a time skip. */
/** `eraHandled`: the caller settles the era itself (Pass the Years does), so no era proposal is made. */
export async function timeSkip(to, {label = "", eraHandled = false} = {}) {
  if ( !game.user.isGM ) return null;
  const from = game.time.worldTime;
  if ( !Number.isFinite(to) || to <= from ) throw new Error("A time skip moves the clock forward");
  const info = {from, to, label, eraHandled};
  if ( isHeld() ) {
    await game.time.set(to);
    log(`Time skip ${label} while the world is held: ${from} to ${to}, no skip hooks`);
    return {...info, held: true};
  }
  await setSetting("skipping", info);
  try {
    await Hooks.callAll("wodxSkipStart", info);
    await game.time.set(to);
    await Hooks.callAll("wodxSkipEnd", info);
  } finally {
    await setSetting("skipping", null);
  }
  log(`Time skip ${label}: ${from} to ${to}`);
  return info;
}

export {isActiveGM, MODULE_ID};
