import {MODULE_ID, isActiveGM, setting, setSetting, log} from "./util.mjs";

/**
 * Skip mode (Phase 4). A time skip moves the clock in one step. While it runs, per-tick automation waits
 * (WoDX modules check isSkipping()); other modules settle their effects on the hooks:
 *   wodxSkipStart {from, to, label}   before the clock moves
 *   wodxSkipEnd   {from, to, label}   after it has moved
 */

export function isSkipping() {
  try {
    return !!setting("skipping");
  } catch {
    return false;
  }
}

/** GM: move the clock to `to` (world time, seconds) as a time skip. */
/** `eraHandled`: the caller settles the era itself (Pass the Years does), so no era proposal is made. */
export async function timeSkip(to, {label = "", eraHandled = false} = {}) {
  if ( !game.user.isGM ) return null;
  const from = game.time.worldTime;
  if ( !Number.isFinite(to) || to <= from ) throw new Error("A time skip moves the clock forward");
  const info = {from, to, label, eraHandled};
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
