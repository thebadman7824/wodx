/**
 * Ghouled animals, step three (B5058 to B5064): an animal's own traits, its training and its breed. No Foundry calls,
 * so the harness can test it.
 *
 *   B5058 traits by kind from the animals list (V20 Dark Ages pp. 396 to 399). Kinds the list leaves out (pigeon,
 *         poultry, sheep or goat, deer, cattle, elephant) are house figures next to their nearest listed kin.
 *   B5059 three steps of training: untrained, trained, war-trained. Trained gives the traits the list puts in brackets
 *         and lets the animal keep and win back Willpower (V20 Dark Ages p. 396). War-trained is for horses, camels,
 *         elephants and the larger dogs: it stops a mount shying in a fight and adds a dot of Brawl (house reading).
 *   B5060 training as a long task on the trainer's Manipulation + Animal Ken (difficulty 7, a week a roll, 5 successes
 *         to train, 10 more for war), or bought with experience: 5 for trained, 10 for war-trained (house costs).
 *   B5061 breeds by era and land: a breed moves a trait by one dot at most, and gives the name and coat.
 *   B5062 a Retainers dot can be an animal ghoul; more dots put together make one tougher beast, with the
 *         Storyteller's leave: each dot past the first adds a dot of Fortitude, Celerity or Potence in turn (house).
 */

const P = page => `V20 Dark Ages p. ${page}`;
const S = (str, dex, sta, per, int, wit, abilities, willpower, ref, trained = {}) =>
  ({attributes: {strength: str, dexterity: dex, stamina: sta, perception: per, intelligence: int, wits: wit}, abilities, willpower, ref, trained});

/** Traits for each kind (keys as in animal-ghoul-rules KINDS). trained: the bracket traits a trained one has. */
export const STATS = {
  rats: S(1, 2, 3, 2, 1, 1, {alertness: 2, athletics: 3, brawl: 1, stealth: 3}, 4, P(398)),
  bats: S(1, 3, 2, 3, 1, 2, {alertness: 3, athletics: 3, stealth: 2}, 2, P(396)),
  songbird: S(1, 3, 2, 3, 2, 3, {alertness: 3}, 1, P(397), {performance: 3}),
  pigeons: S(1, 3, 2, 3, 1, 2, {alertness: 3, athletics: 2}, 1, `house, after the small bird of ${P(397)}`),
  crows: S(2, 3, 3, 3, 2, 3, {alertness: 3, athletics: 2, brawl: 1, intimidation: 2}, 3, P(397), {brawl: 3, empathy: 4, intimidation: 4}),
  raptor: S(2, 3, 3, 3, 2, 3, {alertness: 3, athletics: 2, brawl: 1, intimidation: 2}, 3, P(397), {brawl: 3, empathy: 4, intimidation: 4}),
  cat: S(1, 3, 3, 3, 2, 3, {alertness: 3, athletics: 3, brawl: 2, intimidation: 2, stealth: 4}, 3, P(397), {empathy: 2, subterfuge: 2}),
  poultry: S(1, 2, 2, 2, 1, 2, {alertness: 2}, 1, `house, below the small bird of ${P(397)}`),
  snake: S(1, 3, 3, 3, 1, 2, {alertness: 3, athletics: 3, brawl: 3}, 4, P(398)),
  "stray-dog": S(2, 3, 2, 3, 1, 3, {alertness: 3, athletics: 3, brawl: 1}, 3, P(397), {empathy: 2, performance: 1, stealth: 3}),
  "guard-dog": S(3, 3, 3, 3, 2, 3, {alertness: 3, athletics: 3, brawl: 2, survival: 3}, 3, P(398), {empathy: 2, intimidation: 1, stealth: 2}),
  hound: S(3, 3, 3, 3, 2, 3, {alertness: 3, athletics: 3, brawl: 2, survival: 3}, 3, P(398), {empathy: 2, intimidation: 1, stealth: 2}),
  wolf: S(3, 3, 3, 3, 2, 3, {alertness: 2, athletics: 1, brawl: 3, stealth: 2}, 3, P(399)),
  "sheep-goats": S(2, 2, 3, 3, 1, 2, {alertness: 2, athletics: 2}, 2, `house, after the small pig of ${P(398)}`),
  pigs: S(2, 2, 4, 3, 2, 2, {alertness: 2, athletics: 2, brawl: 2}, 3, P(398)),
  deer: S(2, 3, 3, 3, 1, 3, {alertness: 3, athletics: 3}, 2, "house"),
  "big-cat": S(4, 3, 3, 3, 2, 3, {alertness: 3, athletics: 3, brawl: 3}, 4, P(397), {intimidation: 4, stealth: 3}),
  ape: S(4, 4, 3, 3, 3, 4, {alertness: 3, athletics: 3, brawl: 2}, 5, P(398), {empathy: 2}),
  boar: S(4, 2, 5, 3, 2, 2, {alertness: 2, athletics: 2, brawl: 2}, 3, P(398), {intimidation: 2}),
  alligator: S(4, 2, 4, 3, 2, 3, {alertness: 2, athletics: 2, brawl: 2, stealth: 3}, 3, P(396)),
  horse: S(6, 2, 5, 3, 2, 2, {alertness: 3, athletics: 3, brawl: 1}, 4, P(398), {brawl: 3, empathy: 2, intimidation: 2}),
  cattle: S(5, 1, 5, 2, 1, 2, {alertness: 2, brawl: 1}, 3, `house, after the large horse of ${P(398)}`),
  camel: S(6, 3, 3, 3, 3, 2, {alertness: 3, athletics: 3, brawl: 4}, 3, P(397)),
  bear: S(5, 2, 5, 3, 3, 2, {alertness: 3, brawl: 3, intimidation: 2, stealth: 1}, 4, P(397)),
  elephant: S(8, 2, 6, 3, 3, 2, {alertness: 2, brawl: 3, intimidation: 3}, 5, "house")
};

/** Training steps, in order. */
export const TRAINING = {
  untrained: {label: "Untrained", rank: 0},
  trained: {label: "Trained", rank: 1, xp: 5, goal: 5},
  war: {label: "War-trained", rank: 2, xp: 10, goal: 10}
};
export const TRAIN_STEPS = ["untrained", "trained", "war"];
/** Kinds that can be trained for war (B5059). */
export const WAR_KINDS = new Set(["horse", "camel", "elephant", "guard-dog", "hound"]);
/** The long task's roll (B5060). */
export const TRAIN_TASK = {attr: "manipulation", ability: "animalken", diff: 7, interval: "week"};

const norm = v => TRAINING[v] ? v : "untrained";
export const trainingOf = flag => norm(flag?.training);
export const canRecoverWillpower = flag => trainingOf(flag) !== "untrained";

/** The next step of training for this kind, or null when it has all it can take. */
export function nextTraining(kind, now = "untrained") {
  const i = TRAIN_STEPS.indexOf(norm(now));
  const next = TRAIN_STEPS[i + 1];
  if ( !next ) return null;
  if ( next === "war" && !WAR_KINDS.has(kind) ) return null;
  return next;
}

/**
 * The sheet changes for a step of training, read against the sheet as it stands: abilities raised to the bracket
 * traits (never lowered), and for war a dot of Brawl. -> {"system.abilities.x.value": n, ...}
 */
export function trainingPatch(system = {}, kind, level) {
  const st = STATS[kind];
  const out = {};
  const raise = (k, to) => {
    const now = Number(system?.abilities?.[k]?.value) || 0;
    if ( to > now ) { out[`system.abilities.${k}.value`] = Math.min(5, to); out[`system.abilities.${k}.isvisible`] = true; }
  };
  if ( !st ) return out;
  if ( TRAINING[level]?.rank >= 1 ) for ( const [k, v] of Object.entries(st.trained) ) raise(k, v);
  if ( level === "war" ) {
    const base = Math.max(Number(system?.abilities?.brawl?.value) || 0, st.trained.brawl ?? 0, st.abilities.brawl ?? 0);
    out["system.abilities.brawl.value"] = Math.min(5, base + 1);
    out["system.abilities.brawl.isvisible"] = true;
  }
  return out;
}

/** Lands a breed belongs to. */
export const ZONES = {
  europe: "Europe", mideast: "The Middle East and North Africa", africa: "Africa south of the Sahara", asia: "Asia",
  americas: "The Americas", oceania: "Australia and the Pacific"
};
const ALL = Object.keys(ZONES);
const B = (key, label, from, to, zones, nudge = {}, coats = []) => ({key, label, from, to, zones, nudge, coats});

/** Breeds by kind (B5061). from/to: years (null for no bound). nudge: trait moves of one dot. coats: looks. */
export const BREEDS = {
  horse: [
    B("destrier", "Destrier", 1100, 1600, ["europe"], {strength: 1}, ["bay", "black", "grey"]),
    B("courser", "Courser", 1100, 1700, ["europe"], {dexterity: 1}, ["bay", "chestnut"]),
    B("palfrey", "Palfrey", 1100, 1600, ["europe"], {strength: -1, dexterity: 1}, ["grey", "chestnut", "dun"]),
    B("rouncey", "Rouncey", 1100, 1500, ["europe"], {}, ["bay", "dun", "brown"]),
    B("andalusian", "Andalusian", 1400, null, ["europe", "americas"], {wits: 1}, ["grey", "white", "bay"]),
    B("friesian", "Friesian", 1500, null, ["europe"], {strength: 1, dexterity: -1}, ["black"]),
    B("draught", "Draught horse", 1700, null, ["europe", "americas"], {strength: 1, dexterity: -1}, ["bay", "black", "roan"]),
    B("thoroughbred", "Thoroughbred", 1750, null, ["europe", "americas", "oceania"], {dexterity: 1, stamina: -1}, ["bay", "chestnut", "black"]),
    B("arabian", "Arabian", null, null, ["mideast", "africa", "europe"], {dexterity: 1, strength: -1}, ["grey", "chestnut", "bay"]),
    B("barb", "Barb", null, null, ["mideast", "africa"], {stamina: 1}, ["grey", "bay", "black"]),
    B("akhal-teke", "Akhal-Teke", null, null, ["asia", "mideast"], {stamina: 1, strength: -1}, ["golden dun", "bay"]),
    B("steppe", "Steppe horse", null, null, ["asia"], {stamina: 1, strength: -1}, ["dun", "bay", "grey"]),
    B("mustang", "Mustang", 1600, null, ["americas"], {stamina: 1}, ["paint", "dun", "bay"]),
    B("pony", "Pony", null, null, ALL, {strength: -1}, ["bay", "skewbald", "grey"]),
    B("mule", "Mule", null, null, ALL, {strength: -1, stamina: 1}, ["brown", "black"])
  ],
  "guard-dog": [
    B("alaunt", "Alaunt", 1100, 1700, ["europe"], {strength: 1}, ["white", "fawn"]),
    B("mastiff", "Mastiff", null, null, ["europe"], {strength: 1, dexterity: -1}, ["fawn", "brindle"]),
    B("molossus", "Shepherd's mastiff", null, null, ["mideast", "asia", "europe"], {stamina: 1}, ["white", "cream"]),
    B("doberman", "Dobermann", 1890, null, ["europe", "americas"], {dexterity: 1}, ["black and tan"]),
    B("shepherd", "German shepherd", 1899, null, ["europe", "americas", "oceania"], {intelligence: 1}, ["black and tan", "sable"]),
    B("rottweiler", "Rottweiler", 1900, null, ["europe", "americas"], {strength: 1}, ["black and tan"]),
    B("yard", "Yard dog", null, null, ALL, {}, ["brown", "black", "brindle"])
  ],
  hound: [
    B("greyhound", "Greyhound", null, null, ["europe"], {dexterity: 1, strength: -1}, ["grey", "fawn", "white"]),
    B("lymer", "Lymer", 1100, 1700, ["europe"], {perception: 1}, ["black and tan", "red"]),
    B("bloodhound", "Bloodhound", 1600, null, ["europe", "americas"], {perception: 1, dexterity: -1}, ["black and tan", "liver"]),
    B("wolfhound", "Wolfhound", null, null, ["europe"], {strength: 1}, ["grey", "brindle"]),
    B("saluki", "Saluki", null, null, ["mideast", "africa", "asia"], {dexterity: 1, strength: -1}, ["cream", "red", "grizzle"]),
    B("foxhound", "Foxhound", 1700, null, ["europe", "americas"], {stamina: 1}, ["tricolour", "lemon and white"])
  ],
  "stray-dog": [
    B("mongrel", "Mongrel", null, null, ALL, {}, ["brown", "black", "patched", "yellow"]),
    B("terrier", "Terrier", 1700, null, ["europe", "americas", "oceania"], {wits: 1, strength: -1}, ["white", "tan", "wire-haired"]),
    B("pariah", "Pariah dog", null, null, ["mideast", "africa", "asia"], {stamina: 1}, ["tawny", "red", "black"]),
    B("dingo", "Dingo", null, null, ["oceania"], {stamina: 1}, ["ginger", "sandy"])
  ],
  cat: [
    B("house", "House cat", null, null, ALL, {}, ["tabby", "black", "ginger", "tortoiseshell", "grey"]),
    B("siamese", "Siamese", 1880, null, ["asia", "europe", "americas"], {wits: 1, stamina: -1}, ["seal point"]),
    B("persian", "Persian", 1600, null, ["mideast", "europe", "americas"], {dexterity: -1, stamina: 1}, ["white", "blue"]),
    B("mau", "Egyptian mau", null, null, ["mideast", "africa"], {dexterity: 1, stamina: -1}, ["spotted silver", "spotted bronze"])
  ],
  wolf: [
    B("grey", "Grey wolf", null, null, ["europe", "asia", "americas"], {}, ["grey", "black", "pale"]),
    B("arabian", "Desert wolf", null, null, ["mideast"], {strength: -1, dexterity: 1}, ["sandy"])
  ],
  cattle: [
    B("ox", "Plough ox", null, null, ALL, {}, ["brown", "red", "dun"]),
    B("zebu", "Zebu", null, null, ["asia", "africa"], {stamina: 1, strength: -1}, ["grey", "white"]),
    B("longhorn", "Longhorn", 1600, null, ["americas"], {dexterity: 1, strength: -1}, ["red and white", "brindle"]),
    B("highland", "Highland", 1700, null, ["europe"], {stamina: 1}, ["red", "dun"])
  ],
  camel: [
    B("dromedary", "Dromedary", null, null, ["mideast", "africa", "asia", "oceania"], {}, ["tawny", "white"]),
    B("bactrian", "Bactrian", null, null, ["asia"], {stamina: 1, dexterity: -1}, ["brown", "sand"])
  ],
  elephant: [
    B("asian", "Asian elephant", null, null, ["asia"], {intelligence: 1, strength: -1}, ["grey"]),
    B("african", "African elephant", null, null, ["africa"], {strength: 1}, ["grey"])
  ],
  "big-cat": [
    B("lion", "Lion", null, null, ["africa", "mideast"], {strength: 1}, ["tawny"]),
    B("tiger", "Tiger", null, null, ["asia"], {strength: 1, stamina: -1}, ["striped orange", "white"]),
    B("leopard", "Leopard", null, null, ["africa", "asia", "mideast"], {}, ["spotted gold", "black"]),
    B("jaguar", "Jaguar", null, null, ["americas"], {stamina: 1}, ["spotted gold", "black"]),
    B("lynx", "Lynx", null, null, ["europe", "asia", "americas"], {strength: -1, perception: 1}, ["grey", "tawny"])
  ],
  crows: [
    B("raven", "Raven", null, null, ["europe", "asia", "americas", "mideast"], {intelligence: 1}, ["black"]),
    B("crow", "Crow", null, null, ALL, {}, ["black", "hooded grey"]),
    B("magpie", "Magpie", null, null, ["europe", "asia"], {wits: 1, strength: -1}, ["pied"])
  ],
  raptor: [
    B("goshawk", "Goshawk", null, null, ["europe", "asia", "americas"], {}, ["slate grey"]),
    B("falcon", "Falcon", null, null, ALL, {dexterity: 1, strength: -1}, ["blue-grey", "brown"]),
    B("owl", "Owl", null, null, ALL, {perception: 1, dexterity: -1}, ["tawny", "barn white", "grey"]),
    B("eagle", "Eagle", null, null, ALL, {strength: 1, dexterity: -1}, ["golden brown", "dark brown"])
  ],
  ape: [
    B("chimpanzee", "Chimpanzee", null, null, ["africa"], {intelligence: 1, strength: -1}, ["black"]),
    B("gorilla", "Gorilla", null, null, ["africa"], {strength: 1, dexterity: -1}, ["black", "silverback"]),
    B("orangutan", "Orangutan", null, null, ["asia"], {}, ["red-brown"]),
    B("baboon", "Baboon", null, null, ["africa", "mideast"], {strength: -1, wits: 1}, ["olive", "grey"])
  ]
};

const num = v => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v))) ? null : Number(v);
const fitsYear = (b, year) => { const y = num(year); return y === null || ((b.from === null || y >= b.from) && (b.to === null || y <= b.to)); };

/** Breeds of a kind that fit the year and land; with no land given, every land. Sorted by name. */
export function breedsFor(kind, {year = null, zone = null} = {}) {
  return (BREEDS[kind] ?? []).filter(b => fitsYear(b, year) && (!zone || b.zones.includes(zone))).sort((a, b) => a.label.localeCompare(b.label));
}
export const breed = (kind, key) => (BREEDS[kind] ?? []).find(b => b.key === key) ?? null;

/**
 * An animal's sheet values: the kind's traits, the breed's nudges (one dot at most, never below 1), the training's
 * bracket traits. -> {attributes, abilities, willpower, ref}
 */
export function statsFor(kind, {breedKey = null, training = "untrained"} = {}) {
  const st = STATS[kind];
  if ( !st ) return null;
  const attributes = {...st.attributes};
  const b = breed(kind, breedKey);
  for ( const [k, d] of Object.entries(b?.nudge ?? {}) ) if ( k in attributes ) attributes[k] = Math.max(1, attributes[k] + Math.sign(d));
  const abilities = {...st.abilities};
  const patch = trainingPatch({abilities: Object.fromEntries(Object.entries(abilities).map(([k, v]) => [k, {value: v}]))}, kind, norm(training));
  for ( const [p, v] of Object.entries(patch) ) { const m = /^system\.abilities\.(\w+)\.value$/.exec(p); if ( m ) abilities[m[1]] = v; }
  return {attributes, abilities, willpower: st.willpower, ref: st.ref};
}

/** Extra Disciplines for a beast made from more than one Retainers dot (B5062). */
export const EXTRA_ORDER = ["Fortitude", "Celerity", "Potence"];
export const MAX_RETAINER_DOTS = 5;
export function extraDisciplines(dots = 1) {
  const out = {Potence: 1};
  for ( let i = 0; i < Math.max(0, Math.min(MAX_RETAINER_DOTS, Math.round(Number(dots) || 1)) - 1); i++ ) {
    const d = EXTRA_ORDER[i % EXTRA_ORDER.length];
    out[d] = (out[d] ?? 0) + 1;
  }
  return out;
}

/** Retainers dots left for animals: the Background's dots less the dots already made into beasts. */
export function retainerDotsLeft(retainers = 0, made = []) {
  const used = (Array.isArray(made) ? made : []).reduce((t, m) => t + Math.max(1, Math.round(Number(m?.dots) || 1)), 0);
  return Math.max(0, (Math.round(Number(retainers) || 0)) - used);
}

/** The name a new beast gets from its breed and the land. */
export function beastName(kindLabel, breedLabel = null, given = "") {
  const g = String(given ?? "").trim();
  if ( g ) return g.slice(0, 60);
  return breedLabel || kindLabel || "Animal";
}
