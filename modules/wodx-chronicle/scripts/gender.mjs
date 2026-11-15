/**
 * B3500: one gender for every module, at play (the rules are in gender-rules.mjs). api.gender.of(actor) is what is
 * recorded; api.gender.forRules(actor) is what a rule may use, "" for every player character (Ben, 2026-11-13).
 */
import * as GR from "./gender-rules.mjs";
import * as TERMS from "./terms.mjs";

const actorOf = x => (x?.documentName === "Actor" ? x : x?.actor ?? (typeof x === "string" ? game.actors.get(x) ?? null : null));
/** A character a player owns. */
// B6188: a player character as every module reads it (a party sheet is not one)
export const isPlayer = x => TERMS.isPC(actorOf(x));
/** What is recorded for this character, or "". */
export const of = x => { const a = actorOf(x); return a ? GR.recorded(a) : ""; };
/** "female", "male" or "": what a rule may use. Always "" for a player character. */
export const forRules = x => { const a = actorOf(x); return a ? GR.forRules(a, {player: isPlayer(a)}) : ""; };
/** Record a gender ("" clears it). */
export async function set(x, value) {
  const a = actorOf(x); if ( !a ) return null;
  const v = GR.normalize(value);
  return v ? a.update({"flags.wodx-chronicle.gender": v}) : a.update({"flags.wodx-chronicle.-=gender": null});
}
export const rules = GR;
