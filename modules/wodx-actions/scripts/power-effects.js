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
 * (needs a target, none given) is listed in skipped.
 */
export function powerOutcomes(kw, successes, {label = "", source = "", hasTarget = false} = {}) {
  const s = Number(successes) || 0;
  if ( !kw || kw.passive || s < 1 ) return {results: [], skipped: []};
  const results = [], skipped = [];
  for ( const key of kw.keywords ?? [] ) {
    if ( !KEYWORDS[key] ) continue;
    if ( !hasTarget && NEEDS_TARGET.includes(key) ) { skipped.push(KEYWORDS[key].label); continue; }
    const [r] = stOutcomes([key], { strength: s, step: 2 });
    if ( !r?.out ) continue;
    const who = !hasTarget && ON_SELF.includes(key) ? "self" : "one";
    results.push({ key, who, out: { ...r.out, label: label ? `${label}: ${r.out.label}` : r.out.label, source } });
  }
  return { results, skipped };
}
