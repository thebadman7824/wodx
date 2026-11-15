/**
 * Ghouled animals (B5040 to B5049): which kind of animal an actor is, how much vitae it holds, what it may learn and
 * how long it lives. No Foundry calls, so the harness can test it.
 *
 *   B5041 blood pool by size, from the ghoul rules (V20 Dark Ages p. 401: a large dog 6, a sloth 4, a human-sized
 *         animal 10, a horse 14). The five bands and the very large band (20) fill in between: house reading.
 *   B5042 only Celerity, Fortitude and Potence, ever (V20 Dark Ages p. 396 and p. 401). Any trained animal may learn
 *         Celerity (V20 Dark Ages over Kindred of the Ebony Kingdom p. 185).
 *   B5043 the cap grows one a century, as for human ghouls (V20 Dark Ages p. 400).
 *   B5044 one point of vitae a month; the very large band needs two (Kindred of the Ebony Kingdom p. 186).
 *   B5045 natural life spans for ageing and dust (house figures).
 */

/** Size bands: the most vitae a ghoul of that size holds, and the vitae it needs each month. */
export const SIZES = {
  tiny: {label: "Tiny", blood: 1, monthly: 1, examples: "rat, bat, songbird"},
  small: {label: "Small", blood: 3, monthly: 1, examples: "cat, crow, hen"},
  dog: {label: "Dog-sized", blood: 6, monthly: 1, examples: "dog, wolf, goat"},
  human: {label: "Human-sized", blood: 10, monthly: 1, examples: "big cat, pig, deer, sheep"},
  large: {label: "Large", blood: 14, monthly: 1, examples: "horse, cattle, bear, camel"},
  huge: {label: "Very large", blood: 20, monthly: 2, examples: "elephant"}
};

/**
 * Animal kinds. size: a SIZES key; span: natural life in years; words: name words that mark the kind.
 * The keys match the WoDX NPC animal archetypes (animal-rules ANIMALS) where there is one, so a Mortal-sheet animal
 * from the passers-by or a household is read from its NPC template.
 */
export const KINDS = {
  rats: {label: "Rat", size: "tiny", span: 3, words: ["rat", "rats", "mouse", "mice"]},
  bats: {label: "Bat", size: "tiny", span: 15, words: ["bat", "bats"]},
  songbird: {label: "Small bird", size: "tiny", span: 8, words: ["finch", "sparrow", "songbird", "parrot", "canary", "starling"]},
  pigeons: {label: "Pigeon", size: "tiny", span: 10, words: ["pigeon", "pigeons", "dove"]},
  crows: {label: "Crow or raven", size: "small", span: 15, words: ["crow", "crows", "raven", "ravens", "rook", "magpie", "jackdaw"]},
  raptor: {label: "Hawk or owl", size: "small", span: 20, words: ["hawk", "falcon", "owl", "eagle", "kestrel", "goshawk"]},
  cat: {label: "Cat", size: "small", span: 15, words: ["cat", "cats", "kitten", "mouser"]},
  poultry: {label: "Poultry", size: "small", span: 8, words: ["hen", "hens", "chicken", "rooster", "cockerel", "goose", "geese", "duck"]},
  snake: {label: "Snake", size: "small", span: 20, words: ["snake", "viper", "adder", "serpent", "cobra", "asp"]},
  "stray-dog": {label: "Dog", size: "dog", span: 13, words: ["dog", "cur", "mutt", "stray", "terrier", "ratter"]},
  "guard-dog": {label: "Guard dog", size: "dog", span: 12, words: ["guard dog", "watchdog", "mastiff", "alaunt", "rottweiler", "doberman", "shepherd dog", "german shepherd"]},
  hound: {label: "Hound", size: "dog", span: 12, words: ["hound", "hounds", "greyhound", "wolfhound", "saluki", "bloodhound", "lymer", "brachet"]},
  wolf: {label: "Wolf", size: "dog", span: 12, words: ["wolf", "wolves", "jackal", "hyena", "coyote"]},
  "sheep-goats": {label: "Sheep or goat", size: "human", span: 12, words: ["sheep", "goat", "goats", "ram", "ewe", "lamb"]},
  pigs: {label: "Pig", size: "human", span: 15, words: ["pig", "pigs", "swine", "hog", "sow"]},
  deer: {label: "Deer", size: "human", span: 15, words: ["deer", "stag", "hind", "doe", "antelope"]},
  "big-cat": {label: "Big cat", size: "human", span: 15, words: ["lion", "leopard", "panther", "tiger", "lynx", "cheetah", "jaguar"]},
  ape: {label: "Ape", size: "human", span: 35, words: ["ape", "chimpanzee", "gorilla", "baboon", "monkey"]},
  boar: {label: "Boar", size: "large", span: 12, words: ["boar"]},
  alligator: {label: "Crocodile", size: "large", span: 50, words: ["crocodile", "alligator", "caiman"]},
  horse: {label: "Horse", size: "large", span: 28, words: ["horse", "warhorse", "destrier", "courser", "palfrey", "rouncey", "mare", "stallion", "pony", "mule", "donkey", "steed", "ghoulhorse"]},
  cattle: {label: "Cattle", size: "large", span: 20, words: ["cow", "cattle", "ox", "oxen", "bull", "bullock"]},
  camel: {label: "Camel", size: "large", span: 40, words: ["camel", "dromedary"]},
  bear: {label: "Bear", size: "large", span: 25, words: ["bear", "bears"]},
  elephant: {label: "Elephant", size: "huge", span: 60, words: ["elephant"]}
};

/** WoDX NPC animal templates with no kind of their own here. */
const TEMPLATE_ALIAS = {beast: "stray-dog"};

/** The only Disciplines an animal ghoul can ever have (B5042). */
export const ANIMAL_DISCIPLINES = ["Celerity", "Fortitude", "Potence"];

/** Attributes an animal has (V20 Dark Ages p. 396: animals have only Physical and Mental Attributes). */
export const ANIMAL_ATTRIBUTES = ["strength", "dexterity", "stamina", "perception", "intelligence", "wits"];

const norm = s => String(s ?? "").trim().toLowerCase();
const words = s => ` ${norm(s).replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ")} `;

/**
 * The kind of an animal: the saved kind first, then the WoDX NPC template, then the name. Longer name words win, so
 * "guard dog" beats "dog" and "warhorse" is a horse. Returns a KINDS key or null.
 */
export function kindOf({kind = null, template = null, name = ""} = {}) {
  if ( kind && KINDS[kind] ) return kind;
  const t = TEMPLATE_ALIAS[template] ?? template;
  if ( t && KINDS[t] ) return t;
  const w = words(name);
  let best = null, len = 0;
  for ( const [k, v] of Object.entries(KINDS) ) for ( const word of v.words ) {
    if ( w.includes(` ${word} `) && word.length > len ) { best = k; len = word.length; }
  }
  return best;
}

export const sizeOf = kind => SIZES[KINDS[kind]?.size] ? KINDS[kind].size : "dog";

/** The most vitae an animal ghoul holds: its size band, plus one a century as a ghoul (B5041, B5043). */
export function animalBloodMax(kind, yearsAsGhoul = 0) {
  return SIZES[sizeOf(kind)].blood + Math.max(0, Math.floor((Number(yearsAsGhoul) || 0) / 100));
}

/** Vitae the animal needs each month to stay a ghoul (B5044). */
export const monthlyNeed = kind => SIZES[sizeOf(kind)].monthly;

/** Natural life span in years (B5045); unknown kinds live as a dog. */
export const lifespan = kind => KINDS[kind]?.span ?? 13;

/** May an animal ghoul learn this Discipline (B5042)? The domitor's own Disciplines make no difference. */
export const animalCanLearn = discipline => ANIMAL_DISCIPLINES.some(d => norm(d) === norm(discipline));

/** A short line for cards and sheets. */
export function describe(kind) {
  const k = KINDS[kind], s = SIZES[sizeOf(kind)];
  return `${k?.label ?? "Animal"}, ${s.label.toLowerCase()}: holds ${s.blood} vitae, needs ${s.monthly} a month`;
}

/**
 * B5130: the domitor's clan weakness in an animal ghoul that holds five or more points (V20 Dark Ages p. 401). Only
 * the weaknesses that fit a beast; clans whose weakness needs a mind of its own (Tremere, Giovanni and the like) have
 * none. frenzy: added to the difficulty of the animal's frenzy roll. Each is shown as a mark on the token.
 */
export const MARK_AT = 5;
export const CLAN_MARKS = {
  nosferatu: {label: "Hideous", text: "The beast has turned hideous; people near it check for fear."},
  lasombra: {label: "No reflection", text: "The beast casts no reflection."},
  setite: {label: "Shuns the sun", text: "Sunlight burns the beast as it burns its master."},
  brujah: {label: "Quick to rage", text: "Frenzy is one harder for the beast to resist.", frenzy: 1},
  gangrel: {label: "Quick to rage", text: "Frenzy is one harder for the beast to resist.", frenzy: 1},
  malkavian: {label: "Odd ways", text: "The beast keeps an odd habit: it circles, or stares at nothing."},
  ventrue: {label: "Picky", text: "The beast will feed from only one kind of prey."},
  toreador: {label: "Entranced", text: "The beast freezes before bright or beautiful things."}
};
/** The mark an animal ghoul shows: its domitor's clan id and the points in it. -> a CLAN_MARKS entry or null. */
export function clanMark(clanId, points = 0) {
  return Number(points) >= MARK_AT ? CLAN_MARKS[clanId] ?? null : null;
}
