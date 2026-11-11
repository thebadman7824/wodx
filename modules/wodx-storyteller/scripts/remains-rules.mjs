/**
 * WoDX Storyteller 0.25.0: bodies left behind. No Foundry calls here. All figures are house rules (B844); the books
 * leave a corpse to the Storyteller.
 *
 *   Stages     A body goes fresh, bloated, rotting, decayed, then to bones, by "warm days": a day at about 15°C counts
 *              one, a cold day much less, a hot day more. Buried bodies and bodies in water go slower, bodies indoors a
 *              little slower. Rough figures for play, not for a coroner.
 *   Finding    What the people of the era learn when a body is found: who looks into it, whether they can tell who it
 *              was, how and when they died, and what they make of a body drained of blood. It grows with the centuries,
 *              from the priest and the neighbours to DNA and the scanners of the Future Darkness.
 */

export const DAY = 86400;
export const MAX_DAYS = 400;

export const STAGES = [
  {id: "fresh", from: 0, label: "Fresh", note: "Not long dead: pale, cooling, stiffening.", tint: null},
  {id: "bloated", from: 2, label: "Bloated", note: "Swollen and discoloured; the smell carries.", tint: "#c9d1ae"},
  {id: "rotting", from: 6, label: "Rotting", note: "Flesh giving way; flies and a stench no one misses.", tint: "#9fa47c"},
  {id: "decayed", from: 20, label: "Decayed", note: "Little soft tissue left; the face is gone.", tint: "#7c735c"},
  {id: "bones", from: 60, label: "Bones", note: "Bones and what clothes and hair survive.", tint: "#ddd5c4"}
];

export const PLACES = {
  open: {label: "In the open", speed: 1},
  indoors: {label: "Indoors", speed: 0.8},
  water: {label: "In water", speed: 0.5},
  buried: {label: "Buried", speed: 0.25}
};

export const CAUSES = {
  unknown: {label: "Not plain to see"},
  violence: {label: "Violence (wounds, a beating)"},
  drained: {label: "Drained of blood"},
  savaged: {label: "Savaged, as if by beasts"},
  sickness: {label: "Sickness"}
};

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** How much one day counts, by its mean temperature (°C): 1 at 15°C, 0.1 at or below 0, 2 at 35 or above. */
export function tempFactor(mean) {
  if ( mean === null || mean === undefined || !Number.isFinite(Number(mean)) ) return 1;
  return Math.max(0.1, Math.min(2, (Number(mean) + 5) / 20));
}

/**
 * Warm days since death. since, now: world seconds; place: a PLACES key; meanOn(dayIndex): the mean temperature of a
 * day counted from 0 (or null for none known). Capped at MAX_DAYS.
 */
export function warmDays(since, now, place = "open", meanOn = null) {
  const span = Math.min(MAX_DAYS, Math.max(0, num(now) - num(since)) / DAY);
  const speed = (PLACES[place] ?? PLACES.open).speed;
  const whole = Math.floor(span);
  let sum = 0;
  for ( let d = 0; d < whole; d++ ) sum += tempFactor(meanOn ? meanOn(d) : null);
  sum += (span - whole) * tempFactor(meanOn ? meanOn(whole) : null);
  return sum * speed;
}

/** The stage for a number of warm days. */
export function stageFor(days) {
  let out = STAGES[0];
  for ( const s of STAGES ) if ( num(days) >= s.from ) out = s;
  return out;
}

/** A body as saved on a token, cleaned. */
export function normRemains(r = {}, now = 0) {
  const o = r && typeof r === "object" ? r : {};
  return {since: Number.isFinite(Number(o.since)) && o.since !== null ? Number(o.since) : now, place: PLACES[o.place] ? o.place : "open",
    cause: CAUSES[o.cause] ? o.cause : "unknown", found: Array.isArray(o.found) ? o.found.filter(x => typeof x === "string").slice(0, 50) : [],
    heated: !!o.heated, shown: STAGES.some(s => s.id === o.shown) ? o.shown : null, note: String(o.note ?? "").slice(0, 400)};
}

/** Who looks into a death found, by the year, and what they can do. Bands end before the next one's year. */
/** The book roll for examining a body: HH2 p. 94 (pdf p. 95) gives an autopsy as Intelligence + Medicine. */
export const EXAMINE = "Whoever examines the body rolls Intelligence + Medicine (HH2 p. 94); more successes, more of the above.";

export const INQUESTS = [
  {from: 0, who: "the parish priest and the neighbours", id: "face", when: "days", poison: false, drained: "taken for a wasting sickness, a curse or a wolf"},
  {from: 1500, who: "a physician called by the town council", id: "face", when: "days", poison: false, drained: "taken for a sickness or witchcraft, and talked of"},
  {from: 1840, who: "the police and a police surgeon, with an inquest", id: "face", when: "a day or so", poison: true, drained: "written up as a mystery; the newspapers may take it up"},
  {from: 1901, who: "detectives and a medical examiner", id: "prints", when: "hours", poison: true, drained: "a puzzle for the examiner, with blood types and an autopsy"},
  {from: 1986, who: "a murder squad with a forensic laboratory", id: "dna", when: "hours", poison: true, drained: "a file that may reach people who know what it means"},
  {from: 2023, who: "corporate or city security with field scanners", id: "dna", when: "minutes", poison: true, drained: "flagged at once in the net, and sold on"}
];

export function inquestFor(year) {
  const y = num(year);
  let out = INQUESTS[0];
  for ( const b of INQUESTS ) if ( !y || y >= b.from ) out = b;
  return y ? out : INQUESTS[0];
}

/**
 * What the finders and the era's authorities can learn from a body at this stage. Returns {who, identity, cause,
 * when, drained} as plain sentences. year: the chronicle's year; stage: a STAGES id; cause: a CAUSES key.
 */
export function findings(year, stage, cause = "unknown") {
  const q = inquestFor(year);
  const i = Math.max(0, STAGES.findIndex(s => s.id === stage));
  const late = i >= 3, bones = i >= 4;
  let identity;
  if ( q.id === "dna" ) identity = "They can name the dead, whatever is left.";
  else if ( q.id === "prints" ) identity = i <= 1 ? "Fingerprints or the face will name the dead." : late ? "Only clothes, teeth or what was carried can name the dead." : "The face is hard to know; fingerprints may still serve.";
  else identity = i === 0 ? "Anyone who knew them knows the face." : i === 1 ? "The face is hard to know; clothes and rings tell more." : "Only clothes and what was carried can name the dead.";
  let how;
  if ( bones ) how = cause === "violence" ? "Broken bones may show the violence." : "How they died is mostly lost.";
  else if ( cause === "violence" || cause === "savaged" ) how = `The ${cause === "savaged" ? "savaging" : "wounds"} are plain to see${late ? ", though rot hides much" : ""}.`;
  else if ( cause === "sickness" ) how = late ? "Rot hides any sign of sickness." : "Signs of sickness are there for a physician to read.";
  else if ( cause === "drained" ) how = i <= 1 ? "The body is strangely pale and light, with small wounds that bled little." : "The rot hides how pale it was.";
  else how = q.poison && !late ? "An examination may find poison or a hidden wound." : "Nothing shows how they died.";
  const when = bones ? "They can say only that it was long ago." : i === 0 ? `They can tell the time of death to within ${q.when}.` : "They can tell roughly how many days or weeks ago.";
  const drained = cause === "drained" && i <= 1 ? `A body without its blood: ${q.drained}.` : "";
  return {who: q.who, identity, cause: how, when, drained};
}

/** Does finding this body add heat to the hunting ground? Once a body; only while it still shows how it died. */
export function heatDue(r, stage) {
  const R = normRemains(r);
  if ( R.heated ) return false;
  const i = STAGES.findIndex(s => s.id === stage);
  return i >= 0 && i <= 2 && R.cause !== "sickness";
}
