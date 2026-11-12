/**
 * WoDX Library 0.11.0: how things work together (Ben approved 2026-11-12, after Cataclysm DDA's items). No Foundry
 * calls here; use.mjs does the Foundry side.
 *
 *   Qualities: what a thing can do (cuts, sews, boils, lights a fire, writes...), read from its name, so a Gear
 *     knife cuts as well as a pocket knife does. Other things ask for a quality, not a named tool.
 *   Needs: a few uses need another thing in Possessions: a pipe of tobacco needs a pipe and a light, heroin a
 *     syringe, a candle a flame, a quill ink. A liquid needs something to carry it in. When nothing fits, the Use
 *     window warns and the user can go ahead; the Storyteller hears of it and has the last word.
 *   Supplies: a lamp, lighter, pen, sewing kit, flashlight or phone is full or empty, never an amount. Empty, it
 *     does not work until refilled from the matching good (or charged).
 */

const R = (...parts) => new RegExp(`\\b(?:${parts.join("|")})(?:e?s)?\\b`, "i");

/** What a thing can do, the words the Use window shows, and how it is spotted in a name. */
export const QUALITIES = {
  cuts: {label: "cuts", need: "something that cuts", re: R("knife", "knives", "penknife", "razor", "razor blade", "scissors", "shears", "axe", "hatchet",
    "saw", "hacksaw", "dagger", "scalpel", "sickle", "scythe", "machete", "cleaver", "switchblade", "drawknife", "bolt cutter", "tin snips", "glass cutter",
    "sword", "sabre", "bayonet", "kukri", "dirk", "seax", "chainsaw")},
  hammers: {label: "hammers", need: "a hammer", re: R("hammer", "mallet", "maul", "sledgehammer", "jackhammer")},
  pries: {label: "pries open", need: "something to pry with", re: R("crowbar", "pry ?bar", "prybar", "tyre iron", "jimmy")},
  sews: {label: "sews", need: "a needle", re: R("needle", "needle case", "sewing kit", "sewing machine", "sewing awl", "awl", "bodkin")},
  thread: {label: "is thread", need: "thread", re: R("thread", "hank of thread", "yarn", "twine", "sinew")},
  boils: {label: "boils", need: "a pot", re: R("cooking pot", "copper pot", "casserole pot", "stock pot", "canning pot", "clay canning pot", "aluminum pot", "kettle",
    "cauldron", "saucepan", "billy can", "mess kit", "dutch oven")},
  cooks: {label: "cooks", need: "something to cook on", re: R("pan", "skillet", "griddle", "stove", "oven", "spit", "grill", "brazier", "hotplate", "wok")},
  fire: {label: "lights a fire", need: "a light (matches, a lighter, flint and steel)", re: R("flint and steel", "match", "matchbook", "matchbox", "lighter",
    "fire piston", "ember carrier", "tinderbox", "fire steel")},
  writes: {label: "writes", need: "something to write with", re: R("quill pen", "pen", "fountain pen", "pencil", "chalk", "crayon", "marker", "stylus", "typewriter",
    "charcoal stick", "biro", "ballpoint")},
  ink: {label: "is ink", need: "ink", re: R("ink", "inkwell", "inkpot")},
  vessel: {label: "holds a liquid", need: "something to carry a liquid in (a bottle, flask, skin or canteen)", re: R("bottle", "flask", "vacuum flask", "waterskin",
    "skin", "canteen", "jug", "cup", "mug", "tankard", "bucket", "cask", "barrel", "gourd", "bottle gourd", "thermos", "pitcher", "jar", "vial", "goblet", "chalice",
    "beaker", "jerry can", "hip flask", "wineskin")},
  locks: {label: "picks locks", need: "lockpicks", re: R("lockpick", "set of lockpicks", "lockpick gun", "skeleton key", "bump key")},
  digs: {label: "digs", need: "a spade", re: R("spade", "shovel", "snow shovel", "mattock", "trowel", "pickaxe", "entrenching tool")},
  injects: {label: "injects", need: "a syringe", re: R("syringe", "glass syringe", "hypodermic", "hypospray")},
  pipe: {label: "is a pipe to smoke", need: "a pipe", re: R("clay pipe", "pipe", "long opium pipe", "opium pipe", "hookah", "bong", "chillum", "rolling paper")}
};
/** Names that look like a quality but are not one. */
const NOT = {
  pipe: /bagpipe|pipe tobacco|pipe-?wrench|pipe bomb|drain ?pipe|lead pipe/i,
  writes: /insulin pen|3d printer pen|pencil sharpener|pen ?knife|pen ?light|pentagram|pendant|pennant/i,
  cuts: /rollerblade|sharpener|jigsaw|pickaxe|scythe blade|sword belt/i,
  vessel: /battery jar|full of pins|cupping|urine flask|cupboard|cup holder|cupcake|buttercup/i,
  fire: /match ?lock|matchlock|matches? the/i,
  sews: /knitting needle|pine needle/i,
  thread: /saffron|tied with|threadbare/i,
  ink: /pink|inkle|blink|think|drink|wrinkl|link/i,
  cooks: /gold pan|camp-stove gas|pancake|panel|pane\b|panther|span|japan|pantry|hairpan/i,
  boils: /kettle drum|teakettle bell/i
};

/** The qualities of a thing, from its name (a good's name, or any item's). */
export function qualitiesOf(nameOrGood) {
  const n = String(typeof nameOrGood === "object" ? nameOrGood?.name ?? "" : nameOrGood ?? "");
  if ( !n ) return [];
  return Object.entries(QUALITIES).filter(([k, q]) => q.re.test(n) && !(NOT[k]?.test(n))).map(([k]) => k);
}

/* ---------------------------------------------------------------- what a use needs */

/** Loose things that are smoked in a pipe; rolled ones (a cigarette, a cigar, a joint) need only a light. */
const LOOSE_SMOKE = R("pipe tobacco", "opium", "lump of opium", "hashish", "marijuana", "crack cocaine", "rock of crack cocaine", "tobacco leaves", "cannabis distillate");
const NO_FLAME = R("electronic cigarette", "e-cig", "vape");
const INJECTED = R("heroin", "morphine");
/** Lights that need a flame to start; electric ones do not. */
const FLAMES = new Set(["candle", "lantern", "lamp", "torch", "rushlight", "oil"]);

/**
 * What a use of a good needs from elsewhere in Possessions: a list of quality keys, each to be met by some other
 * thing (or the thing itself). lightKind is lightOf(good) from use-rules, passed in to keep these files apart.
 */
export function needsOf(good, ability, lightKind = null) {
  const n = String(good?.name ?? ""), own = new Set(qualitiesOf(good));
  const need = [];
  if ( ability === "smoke" && !NO_FLAME.test(n) ) {
    need.push("fire");
    if ( LOOSE_SMOKE.test(n) && !own.has("pipe") ) need.push("pipe");
  }
  if ( ability === "take" && INJECTED.test(n) ) need.push("injects");
  if ( ability === "light" && lightKind && FLAMES.has(lightKind) ) need.push("fire");
  if ( ["write", "draw", "mark"].includes(ability) && !own.has("writes") ) need.push("writes");
  if ( ability === "letter" && /quill pen/i.test(n) ) need.push("ink");
  return need.filter(k => !own.has(k));
}

/** The needs not met by the things held (items or names). */
export function missingOf(needs, held = []) {
  const have = new Set(held.flatMap(h => qualitiesOf(h)));
  return needs.filter(k => !have.has(k));
}
/** One line for what is missing: "Nothing in Possessions is a light (matches, a lighter, flint and steel) or a pipe." */
export function missingLine(missing) {
  const words = missing.map(k => QUALITIES[k]?.need ?? k);
  if ( !words.length ) return "";
  const list = words.length === 1 ? words[0] : `${words.slice(0, -1).join(", ")} or ${words.at(-1)}`;
  return `Nothing in Possessions is ${list}.`;
}

/* ---------------------------------------------------------------- liquids */

/** Containers a liquid is written in ("a bottle of claret"); most goods kept in one of these are liquids. */
const LIQUID_IN = new Set(["a bottle", "a flask", "a jug", "a skin", "a cask", "a vial", "a jerry can", "a can", "a six-pack", "a glass", "a cup"]);
/** Kept in a bottle or a tin, but not poured: pills, powders, tinned food, gases. */
const DRY = R("beans", "coffee beans", "leaves", "pills", "tablets", "powder", "dirt", "graveyard dirt", "seed", "aspirin", "vitamins", "multivitamins", "gummy vitamins",
  "cat food", "wet cat food", "fish", "tuna fish", "lobster", "vegetables", "fruit(?! juice)", "salmon", "clams", "black beans in sauce", "cocaine", "propane", "biogas",
  "acetylene", "butane", "caulk", "silicone caulk", "glue", "weak glue", "strong glue", "smelling salts", "antibiotics", "ibuprofen", "naproxen", "acetaminophen",
  "metoprolol", "codeine", "oxycodone", "antidepressants", "antipsychotics", "tramadol", "deworming pills", "prescription stimulants", "prescription sedatives",
  "fast-acting sedatives", "sunscreen", "mercury", "coffee substitute", "penicillin", "designer neurostim", "ketamine", "latex", "napalm");
/** True when a good is a liquid that needs something to carry it in. */
export function isLiquid(good) {
  if ( !good || DRY.test(good.name) || good.name === "tea" ) return false;
  if ( good.kind === "drink" ) return !qualitiesOf(good).includes("vessel");
  return !!good.container && LIQUID_IN.has(good.container);
}

/* ---------------------------------------------------------------- full or empty */

/**
 * Things that are full or empty: what refills them (good names, any one) or charges them. A charge is not spent; a
 * refill is.
 */
export const SUPPLIES = [
  {key: "lamp", re: R("oil lamp", "clay oil lamp", "whale-oil lamp", "argand lamp", "paraffin lamp", "storm lantern", "carbide lamp"),
    refill: ["lamp oil", "kerosene", "camphine"], label: "oil"},
  {key: "lighter", re: R("petrol lighter", "zippo"), refill: ["petrol", "gasoline", "butane"], label: "fuel"},
  {key: "gaslighter", re: R("disposable lighter"), refill: [], label: "gas", spentWhenEmpty: true},
  {key: "pen", re: R("fountain pen"), refill: ["ink"], label: "ink"},
  {key: "sewing", re: R("needle case", "sewing kit"), refill: ["a hank of thread"], label: "thread"},
  {key: "torch", re: R("flashlight", "headlamp", "LED lantern", "reading light", "electric torch"), refill: ["a torch battery", "a 9-volt battery", "a rechargeable battery pack", "a charged power cell"], label: "battery"},
  {key: "phone", re: R("phone", "smartphone", "mobile phone", "cell phone", "commlink", "tablet computer", "laptop", "camera", "smart glasses"),
    charge: ["a phone power bank", "a folding solar charger", "a charged power cell", "a car battery", "a wet-cell battery jar"], label: "charge"}
];
const NOT_SUPPLY = /power bank|solar charger|telephone|phone box|field telephone|tablet of|stone tablet|cracked tablet|wax tablet|box camera|camera obscura|ration|payphone/i;
/** The supply a thing keeps, or null. */
export function supplyOf(nameOrGood) {
  const n = String(typeof nameOrGood === "object" ? nameOrGood?.name ?? "" : nameOrGood ?? "");
  if ( !n || NOT_SUPPLY.test(n) ) return null;
  return SUPPLIES.find(s => s.re.test(n)) ?? null;
}
/** The uses that spend a supply: an empty thing cannot do them. */
export const SPENDS_SUPPLY = new Set(["light", "strike", "write", "draw", "letter", "fix", "call", "photograph", "record", "switchon", "search"]);
/** True when a refill or charge good fits a supply (by name: "lamp oil" fits a lamp, "a torch battery" a flashlight). */
export function fills(supply, name) {
  const n = String(name ?? "").toLowerCase();
  return [...(supply?.refill ?? []), ...(supply?.charge ?? [])].some(r => n === r.toLowerCase() || n.replace(/^(a|an) /, "") === r.toLowerCase().replace(/^(a|an) /, ""));
}
