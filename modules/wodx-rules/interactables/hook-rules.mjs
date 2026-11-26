/**
 * B6923: what the listeners of this module's own trap, hazard and stock hooks do, the pure part (hook-listeners.mjs
 * is the Foundry side). No Foundry here, so the harness can test it.
 *
 * A snare that catches someone, or a live wire that holds them, puts WoDX Chronicle's Held mark on the token (attacks
 * on them gain two dice, V20 Dark Ages p. 348) until the tile lets them go. Every trap and hazard floats a word over
 * the token. A run of stock draws makes one card for the Storyteller naming each container and what came in.
 */
import {TRAPS, HAZARDS} from "./interact-rules.mjs";

/** Does the tile (its flags) still hold this actor? A snare's holding, or a live wire's caught list. */
export function holdsNow(flags = {}, actorId = "") {
  if ( !actorId ) return false;
  if ( String(flags?.holding ?? "") === actorId ) return true;
  return flags?.live !== false && flags?.caught?.[actorId] === true;
}

/** The word floated over the token when a trap goes off. */
export function trapWord({kind = "", caught = false, dice = 0} = {}) {
  if ( caught ) return "Snared!";
  const label = TRAPS[kind]?.label ?? "Trap";
  return Number(dice) > 0 ? `${label}!` : `${label} sprung`;
}
/** The word floated over the token when a hazard hurts it. */
export function hazardWord({kind = ""} = {}) {
  return {fire: "Burning!", brazier: "Burned!", sharp: "Cut!", shock: "Shocked!"}[kind] ?? `${HAZARDS[kind]?.label ?? "Hazard"}!`;
}
/** Should a hazard hold the actor (a live wire that caught them)? */
export const hazardHolds = (kind, flags = {}, actorId = "") => kind === "shock" && holdsNow(flags, actorId);

/** One card for a run of stock draws: [{title, scene, lines}] -> {title, rows: [{where, what}]} or null. */
export function stockCard(draws = []) {
  const rows = draws.filter(d => d && Array.isArray(d.lines)).map(d => ({
    where: [d.title || "A container", d.scene].filter(Boolean).join(", "),
    what: d.lines.length ? d.lines.join("; ") : "nothing this time"
  }));
  if ( !rows.length ) return null;
  return {title: rows.length === 1 ? "Fresh stock came in" : `Fresh stock came in at ${rows.length} places`, rows};
}
