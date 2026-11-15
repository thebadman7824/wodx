/**
 * Ghouled animals, step four (B5133 to B5137): the Tzimisce's war ghouls, kennels, and the beasts a vampire household
 * keeps. No Foundry calls, so the harness can test it.
 *
 *   B5133 the szlachta (V20 p. 502): a ghoul remade by Vicissitude as a long task. A person takes the book's traits
 *         (raised to them, never lowered) and the Monstrous flaw; a beast keeps its own and gains a dot of Strength,
 *         Stamina and Perception and Brawl (house), and both gain Fortitude 1. Neither can go back among people.
 *   B5134 the vozhd (V20 pp. 502 to 503): fifteen or more ghouls grafted into one, by an elder's long task. It takes
 *         the book's traits, is immune to Animalism, Dominate and Presence, and eats anything.
 *   B5135 kennels: a vampire who keeps a kennel of one kind, with two or more of its ghouls of that kind, gets one
 *         young a year in that kind's breeding months; the young is born trained, and its first drink fills it.
 *   B5136 the beasts a household keeps: Gangrel, Tzimisce, Nosferatu and any vampire with Animalism keep one to three
 *         animal ghouls, more in the Dark Ages and the countryside, of the kinds the age and the clan fit.
 */

/** V20 p. 502: the szlachta. */
export const SZLACHTA = {
  attributes: {strength: 5, dexterity: 4, stamina: 5, charisma: 1, manipulation: 1, appearance: 0, perception: 5, intelligence: 2, wits: 3},
  abilities: {alertness: 3, athletics: 2, brawl: 4, melee: 1, stealth: 3, survival: 2},
  disciplines: {Fortitude: 1, Potence: 1}, humanity: 2, willpower: 4, ref: "V20 p. 502"
};
/** V20 pp. 502 to 503: the vozhd. */
export const VOZHD = {
  attributes: {strength: 8, dexterity: 2, stamina: 6, charisma: 0, manipulation: 0, appearance: 0, perception: 1, intelligence: 1, wits: 2},
  abilities: {brawl: 4, alertness: 1},
  disciplines: {Fortitude: 4, Potence: 6}, willpower: 6, ref: "V20 pp. 502 to 503", ghouls: 15, blood: 20
};
/** The long tasks. need: the crafter's Vicissitude. */
export const CRAFT = {
  szlachta: {label: "Remake as a szlachta", need: 3, attr: "dexterity", ability: "medicine", diff: 7, goal: 10, interval: "week"},
  vozhd: {label: "Graft a vozhd", need: 5, attr: "dexterity", ability: "medicine", diff: 8, goal: 25, interval: "week"}
};
export const canCraft = (what, vicissitude = 0) => !!CRAFT[what] && (Number(vicissitude) || 0) >= CRAFT[what].need;

/**
 * The sheet changes that make a ghoul a szlachta. system: the sheet now; animal: true for a beast.
 * -> {patch (system paths), disciplines ({name: at least}), flaw (true for a person)}
 */
export function szlachtaPatch(system = {}, {animal = false} = {}) {
  const at = (path) => Number(path?.value) || 0;
  const patch = {};
  if ( animal ) {
    for ( const k of ["strength", "stamina", "perception"] ) patch[`system.attributes.${k}.value`] = Math.min(10, at(system.attributes?.[k]) + 1);
    patch["system.abilities.brawl.value"] = Math.min(5, at(system.abilities?.brawl) + 1);
    patch["system.abilities.brawl.isvisible"] = true;
    return {patch, disciplines: {Fortitude: 1}, flaw: false};
  }
  for ( const [k, v] of Object.entries(SZLACHTA.attributes) ) {
    const now = at(system.attributes?.[k]);
    // Social traits fall to the book's; the rest rise to it
    const social = ["charisma", "manipulation", "appearance"].includes(k);
    if ( social ? now !== v : now < v ) patch[`system.attributes.${k}.value`] = v;
  }
  for ( const [k, v] of Object.entries(SZLACHTA.abilities) ) if ( at(system.abilities?.[k]) < v ) { patch[`system.abilities.${k}.value`] = v; patch[`system.abilities.${k}.isvisible`] = true; }
  if ( system.advantages?.path ) { patch["system.advantages.path.permanent"] = SZLACHTA.humanity; patch["system.advantages.path.value"] = SZLACHTA.humanity; }
  return {patch, disciplines: {...SZLACHTA.disciplines}, flaw: true};
}

/** Breeding months by kind (house: spring for most; dogs and cats twice a year). */
export const BREEDING = {
  "stray-dog": [3, 9], "guard-dog": [3, 9], hound: [3, 9], wolf: [2], cat: [3, 7], horse: [5], cattle: [6], pigs: [3, 9], "sheep-goats": [10],
  poultry: [4], camel: [1], crows: [4], raptor: [4], rats: [3, 6, 9]
};
export const breedsIn = (kind, month) => (BREEDING[kind] ?? []).includes(Number(month));
/** Is a litter due? kennel: {kind, last (year of the last young)}; count: its ghouls of that kind. */
export function litterDue(kennel, {count = 0, year = 0, month = 0} = {}) {
  if ( !kennel?.kind || count < 2 ) return false;
  if ( Number(kennel.last) >= Number(year) ) return false;
  return breedsIn(kennel.kind, month);
}

/** The clans whose households keep beasts. */
export const KEEPERS = new Set(["gangrel", "tzimisce", "nosferatu"]);
const LEAN = {nosferatu: ["rats", "cat", "crows"], tzimisce: ["hound", "wolf", "horse", "guard-dog"], gangrel: ["wolf", "raptor", "horse", "big-cat"]};
function ageKinds(year) {
  const y = Number(year) || 1197;
  if ( y < 1500 ) return ["guard-dog", "hound", "horse", "crows", "rats", "wolf", "raptor"];
  if ( y < 1800 ) return ["guard-dog", "hound", "horse", "crows", "rats", "cat"];
  if ( y < 1920 ) return ["guard-dog", "horse", "rats", "cat", "crows", "stray-dog"];
  return ["guard-dog", "rats", "cat", "crows", "stray-dog"];
}

/**
 * The beasts a vampire's household keeps (B5136). seed: a whole number so the same household draws the same.
 * -> [kind keys], empty when this vampire keeps none
 */
export function householdBeasts({clanId = null, animalism = 0, year = null, rural = false, seed = 0} = {}) {
  if ( !KEEPERS.has(clanId) && !(Number(animalism) > 0) ) return [];
  const y = Number(year) || 1197;
  const count = Math.min(3, 1 + (y < 1500 ? 1 : 0) + (rural ? 1 : 0));
  const pool = ageKinds(y);
  const lean = (LEAN[clanId] ?? []).filter(k => pool.includes(k));
  const order = [...lean, ...pool.filter(k => !lean.includes(k))];
  const out = [];
  let s = Math.abs(Math.round(Number(seed) || 0));
  for ( let i = 0; i < count; i++ ) {
    // the first pick leans on the clan; later ones wander the age's list
    const list = i === 0 && lean.length ? lean : order;
    s = (s * 1103515245 + 12345) % 2147483648;
    out.push(list[s % list.length]);
  }
  return out;
}
