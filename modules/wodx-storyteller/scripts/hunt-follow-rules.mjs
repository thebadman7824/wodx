/**
 * WoDX Storyteller (NPC Motives Desk part four, B5699-B5703): what the hunters do after they act. The pure part;
 * hunt-follow.mjs acts on the world.
 *
 *   h1  the body of a supernatural is taken as proof, by who hunts in that age, or burned where it lies by the imbued
 *   h2  after a raid: won, beaten or missed, the hunters follow through and leave
 *   h3  an investigator walks the town for up to three days, rolling Perception + Investigation
 *   h4  someone a hunters' faction finds goes into the region's file
 *   h5  a body found drained or savaged feeds the hunters, and from the age of the coroner goes to the morgue
 *
 * Book basis (in WoDX's own words): the Society of Leopold keeps relics and proof (The Hunters Hunted II pp. 122-123);
 * the Arcanum studies what it finds (The Hunters Hunted II pp. 133-141); the imbued burn what they kill (Hunter: The
 * Reckoning). The rest, and every figure, is a WoDX house reading.
 */

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
export const DAY = 86400;

/* ---- h1: the body as proof ---- */

/** Kinds of actor that leave a body worth taking. */
export const SUPERNATURAL = new Set(["vampire", "werewolf", "changing breed", "mage", "changeling", "wraith", "mummy", "demon", "kuei-jin", "spirit", "pc"]);
export const isSupernatural = type => SUPERNATURAL.has(String(type ?? "").toLowerCase());

/** Where each body of hunters takes its proof. burn: destroyed where it lies. */
export const PROOF = {
  "church-courts": {to: "the bishop's court, to be judged and burned", short: "the bishop's court"},
  inquisition: {to: "the Inquisition, as proof for a trial", short: "the Inquisition"},
  leopold: {to: "the Society of Leopold's reliquary", short: "the reliquary", ref: "The Hunters Hunted II pp. 122-123"},
  arcanum: {to: "the Arcanum's scholars", short: "the Arcanum's chapter house", ref: "The Hunters Hunted II pp. 133-141"},
  agency: {to: "a government morgue, for an autopsy", short: "the morgue"},
  imbued: {to: null, burn: true, short: "the fire"},
  sayyadin: {to: "the tribe's elders, to be burned at dawn", short: "the elders"},
  ikhwan: {to: "the brotherhood's house, to be studied and burned", short: "the brotherhood's house"},
  judges: {to: "the Judges, to be burned with prayers", short: "the Judges"},
  local: {to: "the churchyard, to be staked and burned", short: "the churchyard"}
};
/** By the year alone, when the body that hunts is not known. */
const PROOF_YEARS = [[1230, "church-courts"], [1833, "inquisition"], [1884, "leopold"], [1946, "arcanum"], [1998, "agency"], [99999, "imbued"]];

/**
 * Where a body goes as proof. lead: the key of the body that leads the hunt in the region (hunters-rules BODIES), or
 * null. line: the year's hunter rules ("reckoning" from 1999): the imbued burn what they kill. Returns {key, to, burn, short}.
 */
export function proofFor(year, lead = null, line = null) {
  const key = line === "reckoning" ? "imbued" : PROOF[lead] ? lead : PROOF_YEARS.find(([to]) => num(year) <= to)?.[1] ?? "imbued";
  const p = PROOF[key];
  return {key, to: p.to, burn: !!p.burn, short: p.short};
}
/** What proof does to the region's hunters: the file on that kind rises a level, pressure falls by two for a while. */
export const PROOF_LEVEL = 1, PROOF_EASE = -2;

/* ---- h2: after a raid ---- */

/**
 * How a raid ended. hunters: [{down}] the hunters who were in it; quarry: {present, down} the one they came for.
 * Returns "won" (the quarry is down), "beaten" (every hunter is down, or the quarry stands and they are mostly down)
 * or "missed" (the quarry was not there), else "held" (nothing settled: they withdraw).
 */
export function raidEnd({hunters = [], quarry = null} = {}) {
  if ( !quarry?.present ) return "missed";
  if ( quarry.down ) return "won";
  const down = hunters.filter(h => h.down).length;
  if ( !hunters.length || down * 2 >= hunters.length ) return "beaten";
  return "held";
}
/** What each end does: the file (levels), pressure, and whether one stays to watch. */
export const RAID_AFTER = {
  won: {file: 0, pressure: 0, watch: false, text: "take what they came for and leave"},
  beaten: {file: 1, pressure: 1, watch: false, text: "run, and now know what they face"},
  missed: {file: 0, pressure: 0, watch: true, text: "find nobody; one stays to watch the place"},
  held: {file: 0, pressure: 0, watch: false, text: "draw back to try another night"}
};
export const WATCH_NIGHTS = 3;
export const watchUntil = now => num(now) + WATCH_NIGHTS * DAY;

/* ---- h3: the investigator ---- */

export const INVESTIGATOR_DAYS = 3, INVESTIGATE_DIFF = 7;
/** The kinds of place the investigator goes between, in the order of the day. */
export const ROUNDS = [{from: 8, to: 12, kind: "market"}, {from: 12, to: 16, kind: "tavern"}, {from: 16, to: 19, kind: "church"}];
/** The investigator's day as routine blocks, given the places on the town map: {kind: regionUuid}. Nights: the tavern. */
export function investigatorBlocks(places = {}) {
  const at = k => places[k] ?? places.tavern ?? places.market ?? places.church ?? null;
  const B = (from, to, place, activity, label) => ({from, to, place, activity, when: "any", days: null, feast: "any", label});
  const out = ROUNDS.map(r => at(r.kind) && B(r.from, r.to, at(r.kind), "ask", `Asking questions at the ${r.kind}`)).filter(Boolean);
  const night = at("tavern");
  if ( night ) out.push(B(19, 24, night, "rest", "Lodging"), B(0, 8, night, "rest", "Lodging"));
  return out;
}
/** Progress each success gives on a file whose culprit's description is going round. */
export const PER_SUCCESS = 1;
/** Harm the investigator and the hunters come down harder; win them over and they leave early. */
export const HARMED_PRESSURE = 2;
export function investigatorStays({harmed = false, step = 0, days = 0} = {}) {
  if ( harmed ) return "harmed";
  if ( num(step) >= 2 ) return "won";
  return num(days) >= INVESTIGATOR_DAYS ? "done" : "stays";
}

/* ---- h4: a faction finds someone ---- */

export const FOUND_PRESSURE = 1, FOUND_GAIN = 2;

/* ---- h5: a body found ---- */

/** Years in which the finding itself names something unnatural (a curse, witchcraft, a file that reaches the wrong people). */
export const unnaturalYears = year => num(year) < 1700 || num(year) >= 1986;
/** Pressure a found body adds: drained or savaged only. */
export function bodyPressure(cause, year) {
  if ( cause !== "drained" && cause !== "savaged" ) return 0;
  return unnaturalYears(year) ? 2 : 1;
}
/** From the age of the coroner a found body is taken to the morgue (remains-rules INQUESTS, the police surgeon from 1840). */
export const MORGUE_FROM = 1840;
export const toMorgue = (year, cause) => num(year) >= MORGUE_FROM && bodyPressure(cause, year) > 0;
/** A morgue claim the hunters of the age can make on their next turn, and what it gives them. */
export const MORGUE_GAIN = 1, MORGUE_KEEP_DAYS = 30;
