/**
 * Family systems (B3220-B3239): pregnancy and birth by century and place, with the supernatural kinds of pregnancy
 * kept as story hooks for the Storyteller. Pure: no Foundry.
 *
 * Nothing here ever describes anything sexual. A pregnancy is a state with a due date, and a birth is a roll and a card.
 * Who may have a child together is decided first by Chronicle's age floor (B3210) and by hearts-rules childOf.
 */

export const GESTATION_MONTHS = 9;
/** The average Gregorian month in seconds, for a due date on the world clock. */
export const MONTH_SECONDS = 2629746;
export const dueAt = (start, months = GESTATION_MONTHS) => Number(start || 0) + Math.round(months * MONTH_SECONDS);

/** Who attends a birth by default in a year: a midwife before 1850, a physician to 1930, a hospital after. */
export const CARE = {
  none: {label: "No one skilled", medicine: 0, shift: 1},
  midwife: {label: "A midwife", medicine: 3, shift: 0},
  physician: {label: "A physician", medicine: 3, shift: -1, from: 1700},
  hospital: {label: "A hospital", medicine: 4, from: 1930}
};
export const careFor = year => (Number(year) >= 1950 ? "hospital" : Number(year) >= 1850 ? "physician" : "midwife");

/**
 * The birth roll's difficulty: 8 before 1700, 7 to 1850, 6 to 1930, 5 to 1970 and 4 after, moved by who attends.
 * A hospital sets 4 from 1930 (house reading of the history of medicine). Kept between 3 and 9.
 */
export function birthDifficulty(year, care = careFor(year)) {
  const y = Number(year) || 0;
  let d = y < 1700 ? 8 : y < 1850 ? 7 : y < 1930 ? 6 : y < 1970 ? 5 : 4;
  const c = CARE[care] ?? CARE.midwife;
  if ( c.from && y < c.from ) return Math.min(9, Math.max(3, d));
  if ( care === "hospital" ) d = Math.min(d, 4);
  else d += c.shift ?? 0;
  return Math.min(9, Math.max(3, d));
}
/** The pool: the Stamina of the one giving birth plus the Medicine of whoever attends. */
export const birthPool = (stamina = 1, care = "midwife") => Math.max(1, (Number(stamina) || 1) + ((CARE[care] ?? CARE.midwife).medicine ?? 0));

/** Count a d10 roll the V20 way: each die at or above the difficulty is a success, each 1 takes one away. */
export function countDice(dice = [], difficulty = 6) {
  let s = 0, ones = 0;
  for ( const d of dice ) { if ( d === 1 ) ones++; else if ( d >= difficulty ) s++; }
  const net = s - ones;
  return {successes: Math.max(0, net), botch: s === 0 && ones > 0};
}
/** A birth's outcome: a botch is a loss, no success is a hard birth, any success goes well. */
export const birthOutcome = ({successes = 0, botch = false} = {}) => (botch ? "loss" : successes > 0 ? "well" : "hard");
/** A hard birth: bashing health levels and months of rest, for the Storyteller to apply. */
export const HARD_BIRTH = {levels: 2, restMonths: 2};

/** The custom of rest after a birth, by year and way of life. */
export function lyingIn(year, sphere = "latin") {
  const y = Number(year) || 0;
  if ( y >= 1970 ) return {label: "parental leave", weeks: 12};
  if ( sphere === "sinic" ) return {label: "sitting the month", weeks: 4};
  if ( ["islamic", "malay", "sahel", "swahili"].includes(sphere) ) return {label: "the forty days of rest", weeks: 6};
  if ( ["latin", "orthodox"].includes(sphere) ) return y < 1900 ? {label: "lying-in until the churching", weeks: 6} : {label: "confinement", weeks: 6};
  return {label: "lying-in", weeks: 4};
}

/** A season from a month (1-12), turned for the southern half of the world. */
export function seasonOf(month, south = false) {
  const m = ((Number(month) || 1) - 1 + (south ? 6 : 0)) % 12 + 1;
  return m >= 3 && m <= 5 ? "spring" : m >= 6 && m <= 8 ? "summer" : m >= 9 && m <= 11 ? "autumn" : "winter";
}

/** Which of two can carry the child, from their sexes ("f", "m", ""): the index, or -1 when either could or neither. */
export function carrierIndex(sexes = []) {
  const [a, b] = sexes.map(s => String(s || ""));
  if ( a === "f" && b !== "f" ) return 0;
  if ( b === "f" && a !== "f" ) return 1;
  return -1;
}

/**
 * Story hooks for the Storyteller when one or both parents are not plain mortals (B3221). These are never rules and
 * never roll anything: they are ideas on the Storyteller's card only.
 */
export const STORY_HOOKS = {
  ghoul: "A ghoul's body is fed on Vitae. The Storyteller may let the blood leave a mark on the child, or none at all.",
  mage: "A mage's child grows up near open magick. Odd luck or Resonance may cling to the house, and the child may Awaken one day.",
  werewolf: "A Garou parent brings Rage into the house. A frenzy near the birth could put everyone at risk, and the tribe will want to know.",
  metis: "Two Garou have broken the Litany. The sept will learn of the metis birth, and shame follows the parents.",
  changeling: "Fae blood: the Dreaming may notice the child, and a Chimera could come to the cradle.",
  kinfolk: "Kinfolk blood: the tribe watches the child for the signs of the First Change.",
  hunter: "A hunter's child: the things the parent hunts may learn there is someone to strike at."
};
export function storyHooks(lines = [], kid = null) {
  const set = new Set(lines.map(l => String(l || "mortal")));
  const out = [];
  if ( kid?.kind === "metis" ) out.push(STORY_HOOKS.metis);
  else if ( set.has("werewolf") ) out.push(STORY_HOOKS.werewolf);
  for ( const k of ["ghoul", "mage", "changeling", "kinfolk", "hunter"] ) if ( set.has(k) ) out.push(STORY_HOOKS[k]);
  return out;
}

/** The plain line shown on the sheet for a pregnancy (no body detail). */
export const expectingLine = (season, year) => `Expecting, due in ${season}${year ? ` ${year}` : ""}.`;
