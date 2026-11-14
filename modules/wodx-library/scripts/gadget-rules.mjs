/**
 * WoDX Library: seeds, fire-lighters and timepieces (B3911). No Foundry calls here; gadget-use.mjs does the rest.
 *
 *   Plant it: the seed goes in the ground and is ready after its days (data/goods-crops.mjs); Use it then to
 *     harvest, and the crop comes into Possessions.
 *   Strike a light: flint and steel, a match or a lighter lights the first unlit lamp, candle or torch the
 *     character carries (WoDX Interactables' carried light on the token).
 *   Tell the time: a clock or a watch gives the hour; a sundial only while the sun is up; an hourglass the time
 *     since it was last turned.
 */
import {CROPS} from "../data/goods-crops.mjs";

const DAY = 86400;
const bare = s => String(s ?? "").toLowerCase().replace(/\s*\(\d+\)\s*$/, "").trim();
export const cropOf = name => CROPS[bare(name)] ?? null;

/** Where a planting stands: {state: "seed" | "growing" | "ready", daysLeft}. planted: {at} or null. */
export function plantState(planted, crop, now) {
  if ( !planted || !crop ) return {state: "seed", daysLeft: crop?.days ?? 0};
  const left = Math.ceil(((Number(planted.at) || 0) + crop.days * DAY - (Number(now) || 0)) / DAY);
  return left > 0 ? {state: "growing", daysLeft: left} : {state: "ready", daysLeft: 0};
}

export const TIMEPIECES = {
  "a mantel clock": "clock", "a pocket watch on a chain": "clock", "a wristwatch": "clock", "a luxury watch": "clock",
  "an hourglass": "glass", "a pocket sundial": "sun"
};
export const timepieceOf = name => TIMEPIECES[bare(name)] ?? null;

/** What a timepiece says. kind: clock | sun | glass; hour 0 to 23; sunUp; turnedAt (for a glass), now; stamp: the date. */
export function timeLine(kind, {hour = 0, minute = 0, sunUp = true, turnedAt = null, now = 0, stamp = ""} = {}) {
  const hh = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  if ( kind === "clock" ) return `It is ${hh}${stamp ? ` (${stamp})` : ""}.`;
  if ( kind === "sun" ) return sunUp ? `By the shadow, about ${hour}:00.` : "No sun, no shadow: the dial tells nothing at night.";
  if ( kind === "glass" ) {
    if ( turnedAt === null || turnedAt === undefined ) return "Turned: the sand runs for an hour.";
    const mins = Math.floor(((Number(now) || 0) - Number(turnedAt)) / 60);
    return mins < 60 ? `Turned again. The sand had run ${mins} minute${mins === 1 ? "" : "s"} of its hour.` : "Turned again. The sand had long run out: more than an hour since it was last turned.";
  }
  return "";
}
