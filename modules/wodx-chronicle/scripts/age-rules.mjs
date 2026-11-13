/**
 * WoDX Chronicle 0.53.0: the age floor for anything romantic or sexual. Pure: no Foundry.
 *
 * Nothing romantic or sexual (courting, a lover, spouse or troth tie, marriage, having a child, seduction and the
 * feeding that follows it) may involve anyone under ADULT_AGE. The floor is the same in every era and region: the
 * historical coming-of-age ages in the lifepath never lower it. A character counts as a minor when any sign says so:
 *   - a birth year that makes them under 18 in the year shown;
 *   - for those whose body stopped ageing (Kindred at the Embrace, the dead at death), being under 18 when it stopped;
 *   - a child role from the town's residents, the child behaviour or routine, or a child made by WoDX NPC;
 *   - the Storyteller's own mark (flags.wodx-chronicle.minor = true).
 * A character with no sign at all counts as an adult, because most townsfolk carry no birth year. The Storyteller's
 * mark can only make someone a minor, never the other way.
 */
export const ADULT_AGE = 18;

/** Tie roles that are romantic or sexual. */
export const ROMANTIC_ROLES = new Set(["lover", "spouse", "troth"]);

const num = v => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

/**
 * The facts about an actor's age, from plain data. a: an actor-like {type, flags}; yearOf(t): the year of a world
 * time. Returns {born, frozenAt, childSign, marked}.
 */
export function ageFacts(a, yearOf = () => null) {
  const f = a?.flags ?? {};
  const c = f["wodx-creation"]?.chronology ?? {};
  const npc = f["wodx-npc"] ?? {};
  const born = num(c.bornYear);
  const type = String(a?.type ?? "").toLowerCase();
  // The body stops ageing at the Embrace for Kindred, at death for the dead who walk (wraiths, the Risen)
  let stopped = null;
  if ( type === "vampire" && num(c.embraced) !== null ) stopped = yearOf(num(c.embraced));
  else if ( /wraith|risen|orpheus/.test(type) && num(c.died) !== null ) stopped = yearOf(num(c.died));
  const frozenAt = born !== null && num(stopped) !== null ? num(stopped) - born : null;
  const childSign = npc.resident?.role === "child" || npc.behavior?.template === "child" || npc.routine?.preset === "child"
    || (!!npc.child && born === null);
  return {born, frozenAt, childSign: !!childSign, marked: f["wodx-chronicle"]?.minor === true};
}

/** True when the facts say this person is under the age floor in `year`. */
export function isMinor(facts = {}, year = null) {
  if ( facts.marked || facts.childSign ) return true;
  if ( facts.frozenAt !== null && facts.frozenAt !== undefined && facts.frozenAt < ADULT_AGE ) return true;
  if ( facts.born !== null && facts.born !== undefined && num(year) !== null && num(year) - facts.born < ADULT_AGE ) return true;
  return false;
}

/**
 * The check before anything romantic or sexual between people. people: [{name, minor}]. Returns {ok, why}; why names
 * no age, only that the game does not allow it.
 */
export function romanceAllowed(people = []) {
  const young = people.filter(p => p?.minor);
  if ( !young.length ) return {ok: true, why: ""};
  return {ok: false, why: `${young.map(p => p.name || "Someone").join(" and ")} ${young.length > 1 ? "are" : "is"} under ${ADULT_AGE}. WoDX does not allow romance, marriage, seduction or anything sexual with anyone under ${ADULT_AGE}.`};
}

/** A tie list with every romantic role toward a minor taken out. ties: [{uuid, role}]; minorUuid(uuid) -> bool. */
export function safeTies(ties = [], selfMinor = false, minorUuid = () => false) {
  return (ties ?? []).filter(t => !(ROMANTIC_ROLES.has(t?.role) && (selfMinor || minorUuid(t?.uuid))));
}
