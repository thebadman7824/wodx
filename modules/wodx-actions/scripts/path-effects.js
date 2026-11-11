/**
 * WoDX Actions 3.27.0: path magic on the effects card, the pure rules. Thaumaturgy, Necromancy and Koldunic path
 * powers (V20 Dark Ages pp. 275-302, by power id in data/disciplines-daw.json) and the Numina of The Hunters Hunted II
 * (pp. 70-83, by "numen:level") each map to one effect keyword and one result, in the same shapes as the Dark Ages
 * rotes (mage-da-effects.js). A power with no entry, or whose result is a summoned being, a vision, a long ritual or a
 * judgement, stays the Storyteller's call and is only listed on the card.
 */
import { H, T, C, N, S, MV, HL, outcomesOf } from "./mage-da-effects.js";

/** Dark Ages path powers, by power id. Filled from the page checks; anything missing is the Storyteller's call. */
export const PATH_EFFECTS = {};

/** Numina, by "numen:level" (The Hunters Hunted II). */
export const NUMINA_EFFECTS = {
  "divination:1": N(), "divination:2": N(), "divination:3": N(), "divination:4": N(), "divination:5": N(),
  "healing:1": N(), "healing:5": HL(1, {aggravated: true}),
  "astral:1": N("sight"), "psychometry:1": N(), "psychometry:2": N(), "psychometry:3": N(), "psychometry:4": N(), "psychometry:5": N(),
  "cyberkinesis:1": N(),
  // The flame's damage is set by the level, not the successes; the target may dodge, so it waits for the Storyteller
  "pyrokinesis:1": H("harm", 1, "aggravated", {fixed: true, ask: true}), "pyrokinesis:2": H("harm", 1, "aggravated", {fixed: true, ask: true}),
  "pyrokinesis:3": H("harm", 1, "aggravated", {fixed: true, ask: true}), "pyrokinesis:4": H("harm", 2, "aggravated", {fixed: true, ask: true}),
  "pyrokinesis:5": H("harm", 3, "aggravated", {fixed: true, ask: true})
};

/** Is this Discipline heading a path of blood sorcery? */
export function isPath(heading) {
  return /^(thaumaturgy|necromancy|koldunic)/i.test(String(heading ?? ""));
}

/** What a path power does with its successes: [{key, who, ask?, st?, out}]. Unknown powers come back as one st line. */
export function pathOutcomes(power, successes) {
  const spec = PATH_EFFECTS[power?.id] ?? S();
  return outcomesOf(spec, {key: spec.kw, label: power?.n ?? power?.name ?? "", source: `V20 Dark Ages p. ${power?.p ?? "?"}`}, successes, String(power?.e ?? ""));
}

/** What a Numen at a level does with its successes. */
export function numinaOutcomes(key, level, successes, def = null) {
  const spec = NUMINA_EFFECTS[`${key}:${level}`] ?? S();
  const label = `${def?.label ?? key} ${level}`;
  return outcomesOf(spec, {key: spec.kw, label, source: `The Hunters Hunted II p. ${def?.p ?? "?"}`}, successes, String(def?.levels?.[level - 1] ?? ""));
}
