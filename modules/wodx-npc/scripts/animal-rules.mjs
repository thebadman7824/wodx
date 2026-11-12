/**
 * WoDX NPC 0.21.0 (B1000 to B1004): animal archetypes. Each is a temperament (a template beside the line templates in
 * npc-rules), a routine (a preset beside the town's in routine-rules), the kinds of place it belongs in and the years
 * it is found there. No Foundry calls, so the harness can test it.
 *
 *   Years follow Moravia: wolves and bears thin out of the lowlands in the 1800s, wolves come back to the Beskydy hills
 *   in the 1990s, horses leave the town streets between the 1920s and the 1950s, and pigs and poultry leave town yards
 *   with the sanitation rules of the 1800s. House readings, not book rules (PENDING-REVIEW).
 *   Blood is the vessel's pool in points (V20 feeding on animals; the passers-by crowd uses the same numbers).
 *   Animals keep no unease before Kindred (Ben, 2026-11-12) but shy from wraiths: every one fears "wraith".
 *   crowd names the passers-by animal kind (passerby-rules ANIMALS) this archetype stands behind.
 */

const B = (from, to, place, activity, more = {}) => ({from, to, place, activity, when: "any", days: null, feast: "any", label: "", ...more});
const weekdays = [0, 1, 2, 3, 4, 5];
const warm = [4, 5, 6, 7, 8, 9, 10];
const night = {when: "night"}, day = {when: "day"};

/** Temperaments. herd, territory and hunger are the 0.21.0 traits (0 to 2); the rest are the 7b traits. */
const T = (label, v) => ({label, line: "beast", animal: true, aggression: 0, caution: 1, cunning: 0.3, loyalty: 0.3, cowardice: 1, berserk: 0, power: 0,
  fleeAt: 2, frenzyProne: false, herd: 0, territory: 0, hunger: 0, fears: ["fire", "wraith"], tactics: ["melee"], ...v});

export const ANIMALS = {
  "stray-dog": {crowd: "dog", group: "stray", blood: 2, places: ["street", "alley", "market", "docks", "yard"], thinFrom: 1900,
    template: T("Stray dog", {aggression: 0.6, cowardice: 1.2, berserk: 0.2, herd: 1, territory: 0.5, hunger: 0.5, tactics: ["melee", "pack", "scavenge", "scatter"]}),
    preset: {label: "Stray dog, roams the streets", blocks: [B(0, 24, "street", "wander", {...day, label: "Roaming for scraps"}), B(22, 5, "alley", "sleep", {label: "Bedded down in a yard"}),
      B(0, 24, "alley", "wander", night)]}},
  "guard-dog": {crowd: "dog", group: "stray", blood: 2, places: ["home", "workplace", "yard", "gate", "castle"],
    template: T("Guard dog", {aggression: 1.4, caution: 0.5, loyalty: 1.8, cowardice: 0.3, berserk: 0.4, fleeAt: 5, territory: 2, tactics: ["melee", "guard", "call", "ground"]}),
    preset: {label: "Guard dog, loosed at dusk", blocks: [B(0, 24, "home", "patrol", {...night, label: "Loosed in the yard"}), B(0, 24, "home", "rest", {label: "On the chain"})]}},
  hound: {crowd: "dog", group: "stray", blood: 2, places: ["castle", "wilds", "yard"], to: 1914,
    template: T("Hunting hound", {aggression: 1.2, caution: 0.6, cunning: 0.5, loyalty: 1.5, cowardice: 0.4, berserk: 0.3, fleeAt: 4, herd: 1, fears: ["wraith"], tactics: ["melee", "pack", "stalk"]}),
    preset: {label: "Hunting hound, out with the hunt", blocks: [B(7, 15, "wilds", "hunt", {...day, days: [1, 3, 5], label: "Out with the hunt"}), B(0, 24, "home", "rest", {label: "In the kennel"})]}},
  cat: {crowd: "cat", group: "cat", blood: 1, places: ["home", "alley", "tavern", "yard", "workplace", "docks"],
    template: T("Cat", {aggression: 0.2, caution: 1.6, cunning: 0.8, loyalty: 0.2, cowardice: 1.6, fleeAt: 1, fears: ["fire", "wraith", "violence"], tactics: ["flee"]}),
    preset: {label: "Cat, out at night", blocks: [B(0, 24, "alley", "hunt", {...night, label: "Mousing"}), B(0, 24, "home", "sleep", day)]}},
  rats: {crowd: "rat", group: "rat", blood: 0.25, places: ["alley", "sewer", "docks", "yard", "tavern"],
    template: T("Rats", {aggression: 0.4, caution: 1.2, cowardice: 1.5, fleeAt: 1, herd: 2, hunger: 1, tactics: ["swarm", "scatter", "scavenge"]}),
    preset: {label: "Rats, out foraging at night", blocks: [B(0, 24, "alley", "wander", {...night, label: "Out foraging"}), B(0, 24, "sewer", "hide", {label: "In the burrows"})]}},
  pigeons: {crowd: "bird", group: "bird", blood: 0.25, places: ["street", "market", "church", "park", "docks"],
    template: T("Pigeons and town birds", {caution: 2, cowardice: 2, fleeAt: 1, herd: 2, fears: ["fire", "wraith", "violence"], tactics: ["flee", "scatter"]}),
    preset: {label: "Town birds, about by day", blocks: [B(0, 24, "market", "wander", day), B(0, 24, "church", "roost", {label: "Roosting on the roofs"})]}},
  crows: {crowd: "bird", group: "bird", blood: 0.25, places: ["wilds", "park", "yard", "market"],
    template: T("Crows and ravens", {aggression: 0.1, caution: 1.6, cunning: 1, cowardice: 1.6, fleeAt: 1, herd: 1.5, fears: ["wraith", "violence"], tactics: ["scatter", "scavenge"]}),
    preset: {label: "Crows, about by day", blocks: [B(0, 24, "wilds", "wander", day), B(0, 24, "wilds", "roost", {label: "In the rookery"})]}},
  horse: {crowd: "horse", group: "livestock", blood: 5, places: ["yard", "wilds"], town: ["street", "gate", "tavern", "market"], townUntil: 1950,
    template: T("Horse", {aggression: 0.4, caution: 1.2, loyalty: 0.8, cowardice: 1.4, fleeAt: 3, herd: 1.5, fears: ["fire", "crinos", "wraith"], tactics: ["melee", "flee"]}),
    preset: {label: "Horse, in harness by day", blocks: [B(6, 18, "work", "work", {days: weekdays, feast: "not", label: "In harness"}), B(0, 24, "home", "rest", {label: "In the stable"})]}},
  cattle: {crowd: "cattle", group: "livestock", blood: 5, places: ["yard", "wilds"], town: ["market"], townUntil: 1900,
    template: T("Cattle", {aggression: 0.3, fleeAt: 3, cowardice: 1.2, herd: 2, fears: ["fire", "crinos", "wraith"], tactics: ["melee", "scatter"]}),
    preset: {label: "Cattle, out to pasture", blocks: [B(6, 19, "wilds", "graze", {months: warm, label: "Out to pasture"}), B(0, 24, "home", "rest", {label: "In the byre"})]}},
  pigs: {crowd: "pig", group: "livestock", blood: 5, places: ["yard"], town: ["street", "alley", "market"], townUntil: 1850,
    template: T("Pigs", {aggression: 0.6, caution: 0.8, cowardice: 0.8, fleeAt: 3, herd: 1, hunger: 1, tactics: ["melee", "scavenge"]}),
    preset: {label: "Pigs, rooting by day", blocks: [B(6, 18, "yard", "wander", {label: "Rooting"}), B(0, 24, "home", "sleep", {label: "In the sty"})],
      ages: {medieval: [B(6, 18, "street", "wander", {label: "Rooting in the lanes"}), B(0, 24, "home", "sleep", {label: "In the sty"})],
        early: [B(6, 18, "street", "wander", {label: "Rooting in the lanes"}), B(0, 24, "home", "sleep", {label: "In the sty"})],
        industrial: [B(6, 18, "yard", "wander", {label: "Rooting"}), B(0, 24, "home", "sleep", {label: "In the sty"})]}}},
  "sheep-goats": {crowd: "goat", group: "livestock", blood: 5, places: ["yard", "wilds"],
    template: T("Sheep and goats", {aggression: 0.2, caution: 1.4, cowardice: 1.6, fleeAt: 2, herd: 2, fears: ["fire", "crinos", "wraith"], tactics: ["scatter"]}),
    preset: {label: "Sheep or goats, with the shepherd", blocks: [B(6, 19, "wilds", "graze", {months: warm, label: "With the shepherd"}), B(0, 24, "home", "rest", {label: "In the fold"})]}},
  poultry: {crowd: "geese", group: "poultry", blood: 0.25, places: ["yard"], town: ["home", "alley"], townUntil: 1900,
    template: T("Poultry", {aggression: 0.1, caution: 1.8, cowardice: 2, fleeAt: 1, herd: 2, fears: ["wraith", "violence"], tactics: ["scatter", "call"]}),
    preset: {label: "Poultry, about the yard by day", blocks: [B(0, 24, "yard", "wander", day), B(0, 24, "home", "sleep", {label: "Cooped"})]}},
  wolf: {crowd: null, group: "wild", blood: 2, places: ["wilds"], years: [[null, 1850], [1995, null]],
    template: T("Wolf", {aggression: 1.2, cunning: 0.8, loyalty: 1.2, cowardice: 0.5, berserk: 0.3, fleeAt: 4, herd: 1, territory: 1.5, hunger: 1.5, tactics: ["melee", "pack", "stalk", "ground"]}),
    preset: {label: "Wolf, hunts at night", blocks: [B(0, 24, "wilds", "hunt", night), B(0, 24, "wilds", "hide", {label: "Lying up in the den"})]}},
  bear: {crowd: null, group: "wild", blood: 5, places: ["wilds"], to: 1800,
    template: T("Bear", {aggression: 1.3, caution: 0.8, loyalty: 0, cowardice: 0.3, berserk: 0.6, fleeAt: 5, territory: 1.5, hunger: 1, tactics: ["melee", "ground"]}),
    preset: {label: "Bear, sleeps through the winter", blocks: [B(0, 24, "wilds", "hide", {months: [12, 1, 2, 3], label: "Asleep for the winter"}),
      B(0, 24, "wilds", "wander", day), B(0, 24, "wilds", "sleep")]}},
  boar: {crowd: null, group: "wild", blood: 3, places: ["wilds"],
    template: T("Boar", {aggression: 1.4, caution: 0.5, cowardice: 0.4, berserk: 0.8, fleeAt: 5, territory: 1.5, fears: ["wraith"], tactics: ["melee", "ground"]}),
    preset: {label: "Boar, feeds at dusk", blocks: [B(16, 24, "wilds", "wander", {label: "Feeding"}), B(0, 5, "wilds", "wander", {label: "Feeding"}), B(0, 24, "wilds", "hide", {label: "In the thicket"})]}},
  bats: {crowd: null, group: "wild", blood: 0.25, places: ["church", "wilds", "castle"],
    template: T("Bats", {caution: 1.5, cowardice: 2, fleeAt: 1, herd: 2, tactics: ["scatter"]}),
    preset: {label: "Bats, out from dusk", blocks: [B(0, 24, "wilds", "hunt", {...night, months: warm, label: "Out hunting"}), B(0, 24, "church", "sleep", {label: "In the tower"})]}}
};

/** Template key = archetype key. */
export const ANIMAL_TEMPLATES = Object.fromEntries(Object.entries(ANIMALS).map(([k, a]) => [k, a.template]));
export const ANIMAL_PRESETS = Object.fromEntries(Object.entries(ANIMALS).map(([k, a]) => [k, {...a.preset, animal: true}]));
export const ANIMAL_DEFAULT_PRESET = Object.fromEntries(Object.keys(ANIMALS).map(k => [k, k]));
export const isAnimal = template => !!ANIMALS[template] || template === "beast";

/** Is the archetype found at all in a year? No year known: yes. */
export function inYear(key, year) {
  const a = ANIMALS[key], y = Number(year);
  if ( !a ) return false;
  if ( !Number.isFinite(y) || !y ) return true;
  const spans = a.years ?? [[a.from ?? null, a.to ?? null]];
  return spans.some(([f, t]) => (f === null || y >= f) && (t === null || y <= t));
}
/** The kinds of place it belongs in, in a year (town places only up to townUntil). */
export function placesFor(key, year) {
  const a = ANIMALS[key];
  if ( !a ) return [];
  const y = Number(year);
  const town = a.town && (!Number.isFinite(y) || !y || y <= a.townUntil) ? a.town : [];
  return [...new Set([...a.places, ...town])];
}
/** Does it belong in this kind of place in this year? */
export const fits = (key, {year = null, kind = null} = {}) => inYear(key, year) && (!kind || placesFor(key, year).includes(kind));
/** How common it is (1 usual, less when thinned out): strays are fewer once dogs are licensed. */
export const commonness = (key, year) => (ANIMALS[key]?.thinFrom && Number(year) >= ANIMALS[key].thinFrom ? 0.4 : 1);
/** Every archetype that belongs in a kind of place in a year. */
export const animalsFor = ({year = null, kind = null} = {}) => Object.keys(ANIMALS).filter(k => fits(k, {year, kind}));

/**
 * The archetype behind a passers-by animal kind (passerby-rules ANIMALS): the first that fits the place and year;
 * birds are crows out of town and pigeons in it; a dog at a house, gate or castle is a guard dog.
 */
export function forCrowd(crowdKind, {year = null, kind = null} = {}) {
  const pick = {dog: ["guard-dog", "stray-dog", "hound"], bird: ["pigeons", "crows"]}[crowdKind]
    ?? Object.keys(ANIMALS).filter(k => ANIMALS[k].crowd === crowdKind);
  const order = crowdKind === "dog" && !["home", "workplace", "yard", "gate", "castle"].includes(kind) ? ["stray-dog", "hound", "guard-dog"] : pick;
  return order.find(k => fits(k, {year, kind})) ?? order.find(k => inYear(k, year)) ?? null;
}

const NAMES = [[/guard.?dog|watch.?dog|mastiff|chained dog/, "guard-dog"], [/hound|lymer|brachet|alaunt/, "hound"], [/\bdog\b|cur\b|mutt|stray/, "stray-dog"],
  [/\bcats?\b|kitten|mouser/, "cat"], [/\brats?\b|mice|mouse|vermin/, "rats"], [/pigeon|sparrow|dove/, "pigeons"], [/crow|raven|rook|jackdaw|magpie/, "crows"],
  [/horse|mare|stallion|pony|nag\b|mule|donkey/, "horse"], [/\bcows?\b|cattle|\box\b|oxen|bull|heifer/, "cattle"], [/\bpigs?\b|swine|sow\b|hog/, "pigs"],
  [/sheep|goat|lamb|ram\b|ewe/, "sheep-goats"], [/chicken|hen\b|cock\b|rooster|geese|goose|duck|poultry/, "poultry"], [/\bwol(f|ves)\b/, "wolf"],
  [/\bbears?\b/, "bear"], [/\bboars?\b|wild pig/, "boar"], [/\bbats?\b/, "bats"]];
/** A guess at the archetype from a token or actor name ("Old Mastiff" is a guard dog); null when nothing fits. */
export function guessAnimal(name) {
  const n = String(name ?? "").toLowerCase();
  return NAMES.find(([re]) => re.test(n))?.[1] ?? null;
}

/** The lean months (December to March), when a hungry animal takes more risks. */
export const LEAN_MONTHS = [12, 1, 2, 3];
export const isHungry = (profile, month) => Number(profile?.hunger ?? 0) > 0 && LEAN_MONTHS.includes(Number(month));
