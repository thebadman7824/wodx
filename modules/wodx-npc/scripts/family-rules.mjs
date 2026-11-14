/**
 * Family systems (B3440-B3239): pregnancy and birth by century and place, with the supernatural kinds of pregnancy
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
 * Story hooks for the Storyteller when one or both parents are not plain mortals (B3441). These are never rules and
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

/* ------------------------------------------------------------------ */
/*  Child sheets and growing up (B3443-B3226)                          */
/* ------------------------------------------------------------------ */

export const ATTRIBUTES = ["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"];
/** The highest an Attribute may be at an age: 1 to 6, 2 to 12, 3 to 17, and the adult limit after. */
export const attrCap = age => (age < 7 ? 1 : age < 13 ? 2 : age < 18 ? 3 : 5);
/** The highest an Ability may be: none above 1 before 10, none above 2 before 14, 3 to 17. */
export const abilityCap = age => (age < 10 ? 1 : age < 14 ? 2 : age < 18 ? 3 : 5);
/** Willpower rises with the years. */
export const willpowerFor = age => (age < 7 ? 1 : age < 13 ? 2 : age < 18 ? 3 : 4);
/** Dots above 1 the nine Attributes hold in all, by age: none, then 3, then 6, then the 15 of a grown mortal (7, 5 and 3). */
export const attrDots = age => (age < 7 ? 0 : age < 13 ? 3 : age < 18 ? 6 : 15);
/** The age bands a child passes through: each crossing brings an approval card. */
export const BANDS = [7, 10, 13, 14, 18];
export const bandsCrossed = (from, to) => BANDS.filter(b => from < b && to >= b);

/** A seeded stream, the same for the same seed (mulberry32 over a string hash). */
export function seeded(seed) {
  let h = 1779033703 ^ String(seed).length;
  for ( const c of String(seed) ) { h = Math.imul(h ^ c.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * The update that fits a sheet to an age. attrs: {key: {value, bonus}}, abilities: {key: {value}}. Attributes are
 * raised toward the age's total of dots (seeded, never lowered unless over the cap) and held to the cap; Abilities are
 * held to the cap; Willpower is set for the age. Returns {"system.attributes.x.value": n, ...}.
 */
export function fitToAge(attrs = {}, abilities = {}, age = 0, seed = "child") {
  const up = {}, cap = attrCap(age), want = attrDots(age);
  const val = {};
  for ( const k of ATTRIBUTES ) val[k] = Math.max(1, Math.min(cap, Number(attrs[k]?.value) || 1));
  let have = ATTRIBUTES.reduce((s, k) => s + val[k] - 1, 0);
  const rand = seeded(`${seed}:${age}`);
  for ( let guard = 0; have < want && guard < 200; guard++ ) {
    const open = ATTRIBUTES.filter(k => val[k] < cap);
    if ( !open.length ) break;
    const k = open[Math.floor(rand() * open.length)];
    val[k]++; have++;
  }
  for ( const k of ATTRIBUTES ) {
    if ( !attrs[k] ) continue;
    if ( val[k] !== Number(attrs[k].value) ) {
      up[`system.attributes.${k}.value`] = val[k];
      up[`system.attributes.${k}.total`] = val[k] + (Number(attrs[k].bonus) || 0);
    }
  }
  const ab = abilityCap(age);
  for ( const [k, v] of Object.entries(abilities) ) if ( v && typeof v === "object" && Number(v.value) > ab ) up[`system.abilities.${k}.value`] = ab;
  up["system.advantages.willpower.permanent"] = willpowerFor(age);
  up["system.advantages.willpower.temporary"] = willpowerFor(age);
  return up;
}

/** Natures a child may grow into (from the Archetypes; the darkest are left to the Storyteller). */
export const CHILD_NATURES = ["Architect", "Autocrat", "Bon Vivant", "Bravo", "Caregiver", "Celebrant", "Child", "Competitor", "Conformist",
  "Conniver", "Curmudgeon", "Director", "Fanatic", "Gallant", "Judge", "Loner", "Martyr", "Pedagogue", "Penitent", "Perfectionist",
  "Rebel", "Rogue", "Survivor", "Thrill-Seeker", "Traditionalist", "Trickster", "Visionary"];
export const NATURE_AGE = 13;
export const pickNature = seed => CHILD_NATURES[Math.floor(seeded(`${seed}:nature`)() * CHILD_NATURES.length)];

/** Lifepath scenes never offered to a child: anything about love, courting or marriage (the age floor, B3210). */
export const ROMANTIC_SCENE = /love|court|marri|wed|betroth|suitor|romance|lover/i;
export const childSafe = e => !!e && !ROMANTIC_SCENE.test(`${e.id} ${e.title} ${e.text ?? ""} ${(e.options ?? []).map(o => `${o.label} ${o.p ?? ""} ${o.text ?? ""}`).join(" ")}`);

/** The Abilities a lifepath choice grants ("ab Crafts|bg Mentor" gives Crafts), as sheet keys. */
export const abilityKey = name => String(name ?? "").toLowerCase().replace(/[^a-z]/g, "");
export function grantsOf(g = "") {
  const out = {abilities: [], other: []};
  for ( const part of String(g).split("|").map(s => s.trim()).filter(Boolean) ) {
    const [kind, ...rest] = part.split(" ");
    if ( kind === "ab" ) out.abilities.push(rest.join(" "));
    else out.other.push(part.replace(/^bg /, "Background: ").replace(/^merit /, "Merit: ").replace(/^flaw /, "Flaw: ").replace(/^note /, ""));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Schooling and work by era (B3227)                                  */
/* ------------------------------------------------------------------ */

/** The year schooling became compulsory, by region (readings of history; the Storyteller may move a date). */
export const COMPULSORY = {
  "moravia": 1774, "german-lands": 1763, "scandinavia": 1814, "france": 1882, "british-isles": 1880, "italy": 1877, "iberia": 1857,
  "low-countries": 1900, "russia": 1930, "north-america-east": 1852, "north-america-west": 1874, "canada": 1871, "australia": 1872,
  "aotearoa": 1877, "japan": 1872, "korea": 1949, "china": 1986, "india": 2009, "mexico": 1917, "brazil": 1934, "southern-cone": 1884,
  "southern-africa": 1905
};
export const COMPULSORY_DEFAULT = 1960;
/**
 * How a child of this year, place and way of life is schooled or set to work: {label, ability, from}. ability is the
 * Ability the years most likely gave (a sheet key), from the age it starts.
 */
export function schoolingFor(year, region, sphere = "latin") {
  const y = Number(year) || 0;
  const law = COMPULSORY[region] ?? COMPULSORY_DEFAULT;
  if ( y >= 2023 ) return {label: "schooling on the net and in the arcology classrooms", ability: "computer", from: 6};
  if ( y >= 1950 && y >= law ) return {label: y >= 1990 ? "the modern school day, then computers" : "the modern school day", ability: y >= 1990 ? "computer" : "academics", from: 6};
  if ( y >= law ) return {label: "compulsory school", ability: "academics", from: 6};
  switch ( sphere ) {
    case "islamic": case "malay": case "sahel": case "swahili": return {label: "the kuttab, the Qur'an school, or the family trade", ability: "academics", from: 6};
    case "sinic": return {label: "the clan school for the classics, or the fields", ability: "academics", from: 7};
    case "japanese": return y >= 1600 ? {label: "the temple school (terakoya), or the family trade", ability: "academics", from: 7} : {label: "the household, the temple or the fields", ability: "crafts", from: 7};
    case "indic": return {label: "the teacher's house, or the family's trade", ability: "crafts", from: 7};
    case "latin": case "orthodox":
      return y < 1500 ? {label: "an apprentice, a page or a novice", ability: "crafts", from: 7} : {label: "the parish school, a guild or service in a household", ability: "crafts", from: 7};
    default: return {label: "learning at the family's side", ability: "survival", from: 6};
  }
}

/* ------------------------------------------------------------------ */
/*  Player-asked marriage (B3229-B3231)                                */
/* ------------------------------------------------------------------ */

export const PROPOSAL_DIFFICULTY = 6;
/** An NPC's answer by how warm they are to the one asking: Devoted says yes, Fond rolls Charisma + Empathy, lower says no. */
export function proposalAnswer(warmth = 0, successes = null) {
  const w = Number(warmth) || 0;
  if ( w >= 3 ) return "yes";
  if ( w === 2 ) return successes === null ? "roll" : Number(successes) > 0 ? "yes" : "no";
  return "no";
}
/** Who must agree to a match under the courting custom of the place and year (hearts-rules courtshipFor keys). */
export function familiesSay(courtKey) {
  switch ( courtKey ) {
    case "arranged": case "matchmaker": case "miai": case "consent": case "custom": return {who: "the families (the fathers, the clan or the elders)", need: true};
    case "calling": return {who: "the parents", need: true};
    case "dating": return {who: "the couple, with the families' blessing", need: false};
    default: return {who: "the couple alone", need: false};
  }
}
/** The waiting time and paperwork before the wedding, by the law and way of life. */
export function waitingFor(law = {}, sphere = "latin", year = 1500) {
  if ( law.civil ) return {label: "a civil notice of the marriage", days: 14};
  switch ( sphere ) {
    case "latin": return Number(year) >= 1215 ? {label: "three Sundays of banns", days: 21} : {label: "the betrothal", days: 7};
    case "orthodox": return {label: "the banns read in church", days: 21};
    case "islamic": case "malay": case "swahili": case "sahel": return {label: "the nikah contract written and the mahr agreed", days: 7};
    case "sinic": case "japanese": return {label: "the go-between's exchange of gifts and a lucky day chosen", days: 30};
    case "indic": return {label: "an auspicious day chosen by the priest", days: 30};
    default: return {label: "the families' preparations", days: 14};
  }
}
/** Ties a proposal can be made on: a lover, or a tie that could make an arranged match (never blood or household kin). */
export const PROPOSAL_TIES = new Set(["lover", "troth", "friend", "ally", "contact", "patron", "other"]);
export const canProposeOn = kind => PROPOSAL_TIES.has(String(kind ?? ""));
