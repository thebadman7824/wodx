/**
 * What a power costs when it ends, from its own page (B4924, Ben's After-Cost Desk). Pure: no Foundry calls.
 *
 * on: who pays: "self" (the user), "target" (those it was used on) or "area" (whoever was caught in it).
 * cost: what happens when the power's lasting effect ends (or, with no lasting effect, when the scene ends).
 * match: other names the lasting effect may carry (a power's effect is often named for what it does).
 */
import {slug} from "./limit-rules.js";

const H = 3600, DAY = 86400;

export const AFTER = [
  {name: "survivor", page: "W20 p. 177", on: "self", cost: {kind: "sleep", seconds: 8 * H, then: "ravenous"},
    say: "the Gift wears off: eight hours of deep sleep, then waking ravenous"},
  {name: "messengers-fortitude", page: "Werewolf: The Wild West p. 160", on: "self", cost: {kind: "sleep", seconds: 7 * DAY},
    say: "the Gift wears off: a week of sleep"},
  {name: "blood-of-potency", page: "V20 p. 214", on: "self", cost: {kind: "bloodCap"},
    say: "the stronger blood fades: blood over the usual pool thins away"},
  {name: "strengthening-the-demon", page: "Kindred of the East Companion p. 74", on: "self", cost: {kind: "hunRoll"},
    say: "the stoked Demon Chi fades: Hun against the P'o, or a Derangement"},
  {name: "subsume-the-spirit", page: "VtDA p. 192", on: "self", cost: {kind: "habits"},
    say: "back from the beast, its tics and habits linger"},
  {name: "inspire", page: "Demon: The Fallen p. 199", on: "target", cost: {kind: "willpowerDot"},
    say: "the borrowed brilliance fades and takes a dot of Willpower with it"},
  {name: "blinding-spittle", page: "W20 Changing Breeds p. 241", on: "target", match: ["blinded", "blind"], cost: {kind: "blurred"},
    say: "the blindness lifts, but sight stays blurred for the scene"},
  {name: "pietrosus-hospitality", page: "VtDA p. 275", on: "area", match: ["pietrosu", "freezing wind"], cost: {kind: "numbed"},
    say: "the freezing wind drops, and those caught in it are still numb for a turn"},
  {name: "numbing", page: "W20 p. 436", on: "self", cost: {kind: "fomorEnd", levels: 3},
    say: "the numbness wears off and the three extra health levels go with it"}
];

/** The after-cost of a power, by name; null for most powers. */
export function costOf(power = {}) {
  const n = slug(power.name ?? power.n ?? "");
  return n ? AFTER.find(a => a.name === n) ?? null : null;
}

/** Whether a lasting effect's name belongs to the power (its own name, or one of its match words). */
export function effectMatches(entry, effectName = "", powerName = "") {
  const e = slug(effectName);
  if ( !e ) return false;
  if ( powerName && e.includes(slug(powerName)) ) return true;
  return (entry?.match ?? []).some(m => e.includes(slug(m)));
}

/** The conditions the costs put on (B4924). mods follow WoDX Chronicle: ownDiffVision, noAction; socialDiff is read by Actions' social rolls. */
export const CONDITIONS = {
  asleep: {id: "asleep", name: "Asleep", img: "icons/svg/sleep.svg", source: "WoDX after-cost", summary: "Deep sleep: no actions until it ends.", mods: {noAction: true, noDefense: true}},
  ravenous: {id: "ravenous", name: "Ravenous", img: "icons/svg/tankard.svg", source: "W20 p. 177", summary: "Wakes starving: must eat before anything else; until then +1 difficulty in a fight and on social rolls (WoDX house reading, B6028).", mods: {ownDiff: 1, socialDiff: 1}},
  habits: {id: "animal-habits", name: "Animal habits", img: "icons/svg/pawprint.svg", source: "VtDA p. 192", summary: "The beast's tics show: +1 difficulty on Social rolls (WoDX house reading).", mods: {socialDiff: 1}},
  blurred: {id: "blurred-sight", name: "Blurred sight", img: "icons/svg/blind.svg", source: "W20 Changing Breeds p. 241", summary: "+2 difficulty on sight-based rolls for the scene.", mods: {ownDiffVision: 2}},
  numbed: {id: "numbed", name: "Numbed", img: "icons/svg/frozen.svg", source: "VtDA p. 275", summary: "Dexterity -1 and three-quarter movement for a turn.", mods: {}}
};

/** Blood over the usual pool, to lose. */
export const bloodOver = (temp, max) => Math.max(0, (Number(temp) || 0) - (Number(max) || 0));

/** A fomor's end of Numbing: what damage stays once the extra levels go, and whether that kills. */
export function fomorEnd(damageTotal, levels = 3, track = 7) {
  const left = Math.max(0, Number(damageTotal) || 0);
  return {dies: left > track, left};
}

/** Nights of Animal habits: one per success, at least one. */
export const habitNights = successes => Math.max(1, Math.round(Number(successes) || 1));
