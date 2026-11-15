/**
 * WoDX Actions 3.33.0: a power's keywords on the effects card (Traits With Teeth step 4). Pure, no Foundry calls.
 *
 * Every power in WoDX's data files and line lists names its effect keywords (power-keywords.js, B781 and B783). A
 * Discipline or Gift roll with successes now puts those keywords on the effects card, worked out the way the
 * Storyteller's effect window does: the successes are the strength, the effect lasts a scene. The card's own rules
 * decide where each goes: plain keywords on an NPC apply with Undo, mind keywords and anything on a player character
 * wait in the approval queue, the Storyteller's keywords stay the Storyteller's call (route in effects-rules.js).
 * Passive powers, and powers with an effects spec of their own (path magic, Numina), are left out.
 */
import { KEYWORDS, stOutcomes } from "./effects-rules.js";
import { keywordsOf, slugOf } from "./power-keywords.js";

/** Keywords that only make sense on someone else: with no target they are dropped, never turned on the user. */
export const NEEDS_TARGET = ["harm", "hold", "fear", "trip", "sway", "possess", "bind", "banish", "charge"];
/** Keywords that work on the user when nothing is targeted. */
export const ON_SELF = ["sight", "rise", "light", "ward", "boost", "hasten", "veil", "sense", "speak", "know", "mend", "move", "fortune", "sideways"];

/** The keywords of one power: the data set first, then the line list by name. {keywords, passive} or null. */
export function powerKeywords(set, id, name = "", line = null) {
  return keywordsOf(set, id) ?? (line ? keywordsOf(line, slugOf(name)) : null);
}

/**
 * Results in planOf's shape: [{key, who, out}]. hasTarget: the user aims at someone. A keyword the user cannot aim
 * (needs a target, none given) is listed in skipped. noRoll: the power is used with no roll and counts one success;
 * its Harm is left out.
 */
export function powerOutcomes(kw, successes, {label = "", source = "", hasTarget = false, noRoll = false} = {}) {
  const s = Number(successes) || 0;
  if ( !kw || kw.passive || s < 1 ) return {results: [], skipped: []};
  const results = [], skipped = [];
  for ( const raw of kw.keywords ?? [] ) {
    // B5787: "boost:sap", "fortune:curse", "fear:calm": a keyword with its flavour, for a chain of keywords
    const [key, flavour] = String(raw).split(":");
    if ( !KEYWORDS[key] ) continue;
    // A power with no roll (claws grown, a weapon readied) gives no damage of its own: it readies the user for the
    // scene and the attack roll deals the damage (B3751)
    if ( noRoll && key === "harm" ) {
      if ( !(kw.keywords ?? []).includes("boost") ) results.push({ key: "boost", who: "self", out: { key: "boost", label: label ? `${label}: ready` : "Ready", kind: "timed", name: label || "Ready",
        timed: { kind: "scene" }, duration: "the scene", source, text: "ready to strike for the scene: the attack roll deals the power's damage (see the page)" } });
      continue;
    }
    // B6010: a Calm on oneself (Blood Rush) is not a Fear on someone else
    if ( !hasTarget && NEEDS_TARGET.includes(key) && !(key === "fear" && String(flavour).split("+").includes("calm")) ) { skipped.push(KEYWORDS[key].label); continue; }
    // B6010: several flavours join with "+" ("boost:sap+social")
    const [r] = stOutcomes([key], { strength: s, step: 2, ctx: flavour ? Object.fromEntries(flavour.split("+").filter(Boolean).map(f => [f, true])) : {} });
    if ( !r?.out ) continue;
    const who = !hasTarget && (ON_SELF.includes(key) || String(flavour).split("+").includes("calm")) ? "self" : "one";
    results.push({ key, who, out: { ...r.out, label: label ? `${label}: ${r.out.label}` : r.out.label, source } });
  }
  return { results, skipped };
}

/** How a keyword result moves an NPC's regard for the caster: Sway +1 (Awe has its own rule), Fear's Afraid -1. */
export function moodDelta(key, out = {}) {
  if ( key === "sway" && !out.awe ) return 1;
  // B6005: a binding (an oath, a bond, a command) on an NPC turns it two steps toward the one who bound it
  if ( key === "bind" ) return 2;
  if ( key === "fear" && out.name === "Afraid" ) return -1;
  return 0;
}
