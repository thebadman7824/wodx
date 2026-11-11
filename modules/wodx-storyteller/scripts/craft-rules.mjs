/**
 * WoDX Storyteller 0.26.0: making things from the goods list. No Foundry calls here.
 *
 * A recipe is worked out from a good (WoDX Library's goods by era): its category says the craft, the workshop and
 * the materials; its value tier in the year says how long the work takes. The work is a long task (an extended
 * action, V20 pp. 251-252; V20 Dark Ages p. 324) on Dexterity + Crafts, the Storyteller's to change. What the books
 * leave open (goals, intervals, materials, quality) is house rule (B852).
 *
 * The year decides what can be made: nothing before the good is known; after it has gone out of use, only hand
 * crafts can still make it ("the old way", one more difficulty). Extra successes past the goal make it better.
 */

/** Workshops by category, the latest one the year allows winning. Keys are tasks-rules WORKSHOPS. */
const W = (...pairs) => pairs;
export const CRAFTS = {
  food: {label: "Cooking", shop: W(["", -10000]), materials: []},
  drink: {label: "Brewing and distilling", shop: W(["still", -10000]), materials: []},
  drugs: {label: "Herb lore and chemistry", shop: W(["still", -10000], ["laboratory", 1660]), materials: []},
  vice: {label: "Carving and gaming goods", shop: W(["bench", -10000]), materials: []},
  kitchen: {label: "Smithing", shop: W(["forge", -10000]), materials: ["a bar of iron"]},
  house: {label: "Carpentry", shop: W(["bench", -10000]), materials: ["a seasoned timber plank"]},
  cloth: {label: "Tailoring and leatherwork", shop: W(["bench", -10000]), materials: []},
  hygiene: {label: "Soap and salve making", shop: W(["still", -10000]), materials: ["a pot of lye", "a lump of beeswax"]},
  tools: {label: "Smithing", shop: W(["forge", -10000], ["machine", 1800]), materials: ["a bar of iron", "a seasoned timber plank"]},
  light: {label: "Candle and lamp making", shop: W(["bench", -10000], ["machine", 1880]), materials: ["a lump of beeswax"]},
  fuel: {label: "Charcoal burning", shop: W(["", -10000]), materials: []},
  power: {label: "Electrics", shop: W(["machine", 1800], ["electronics", 1920]), materials: ["a coil of copper wire", "a stick of solder"]},
  papers: {label: "Writing and printing", shop: W(["scriptorium", -10000], ["press", 1450]), materials: []},
  manuals: {label: "Printing and binding", shop: W(["scriptorium", -10000], ["press", 1450]), materials: []},
  maps: {label: "Mapmaking", shop: W(["scriptorium", -10000], ["press", 1450], ["computer", 1975]), materials: []},
  faith: {label: "Carving and casting", shop: W(["bench", -10000]), materials: ["a lump of beeswax"]},
  occult: {label: "Carving and casting", shop: W(["bench", -10000]), materials: []},
  medicine: {label: "Apothecary's work", shop: W(["still", -10000], ["laboratory", 1660]), materials: []},
  keepsake: {label: "Carving", shop: W(["bench", -10000]), materials: []},
  toys: {label: "Toymaking", shop: W(["bench", -10000]), materials: ["a seasoned timber plank"]},
  valuables: {label: "Goldsmith's work", shop: W(["forge", -10000]), materials: [], delicate: true},
  arms: {label: "Weapon and gunsmithing", shop: W(["forge", -10000], ["machine", 1800]), materials: ["a bar of iron"]},
  accessories: {label: "Gunsmithing", shop: W(["forge", -10000], ["machine", 1800]), materials: ["a bar of iron"]},
  traps: {label: "Trapping", shop: W(["", -10000]), materials: []},
  travel: {label: "Saddlery and wheelwrighting", shop: W(["bench", -10000]), materials: ["a tanned hide"]},
  containers: {label: "Cooperage and basketry", shop: W(["bench", -10000]), materials: ["a seasoned timber plank"]},
  keys: {label: "Locksmithing", shop: W(["forge", -10000], ["machine", 1800]), materials: ["a bar of iron"]},
  materials: {label: "Tanning and chemistry", shop: W(["still", -10000], ["laboratory", 1660]), materials: []},
  tech: {label: "Electronics", shop: W(["electronics", 1920], ["computer", 1975], ["fabricator", 2010]),
    materials: ["a coil of copper wire", "a stick of solder", "a piece of scrap electronics", "a salvaged chip", "a spool of printer filament"]}
};
/** Not made at a bench: struck at a mint, grown in a field. */
export const NOT_MADE = {coin: "Coin is struck at a mint; making it is forgery, which the Storyteller runs as its own task.",
  seeds: "Seeds and cuttings are grown, not made."};
/** Hand crafts: a good out of use can still be made the old way at these. */
export const HAND = new Set(["", "forge", "bench", "still", "scriptorium", "chapel"]);
/** By the name, leather work needs hides whatever the category. */
const LEATHER = /\b(leather|shoe|boot|jerkin|belt|saddle|bridle|harness|sheepskin|purse|pouch|bag)\b/i;

/** Successes needed and time for one roll, by value tier (0 trifle to 5 treasure). */
export const BY_TIER = [
  {goal: 2, interval: "hour"}, {goal: 3, interval: "day"}, {goal: 5, interval: "day"},
  {goal: 8, interval: "day"}, {goal: 12, interval: "week"}, {goal: 16, interval: "week"}
];
/** Extra successes past the goal. price: what it sells for against plain work. */
export const QUALITY = [
  {key: "plain", min: 0, label: "Plain work", price: 1},
  {key: "good", min: 2, label: "Good work", price: 1.25},
  {key: "fine", min: 4, label: "Fine work", price: 1.5, diff: -1},
  {key: "master", min: 7, label: "Masterwork", price: 2, diff: -1}
];

export function qualityFor(extra) {
  const e = Math.max(0, Math.round(Number(extra) || 0));
  let q = QUALITY[0];
  for ( const x of QUALITY ) if ( e >= x.min ) q = x;
  return q;
}

/** The workshop a category uses in a year. */
export function workshopFor(category, year) {
  const c = CRAFTS[category];
  if ( !c ) return "";
  let w = c.shop[0][0];
  for ( const [k, from] of c.shop ) if ( (Number(year) || 0) >= from ) w = k;
  return w;
}

/**
 * The recipe for a good in a year. good: a goods.mjs good (name, kind, from, to, value tier helpers); valueAt: (good,
 * year) => tier; known: names of the goods in use that year (for the materials). Returns {ok, why, task}.
 */
export function recipeFor(good, year, {valueAt = g => Number(g?.value) || 0, known = null} = {}) {
  if ( !good?.name ) return {ok: false, why: "No such good."};
  const y = Number(year) || 0;
  if ( NOT_MADE[good.kind] ) return {ok: false, why: NOT_MADE[good.kind]};
  const c = CRAFTS[good.kind];
  if ( !c ) return {ok: false, why: "WoDX has no craft for that kind of thing; set it up as a long task by hand."};
  if ( y && y < good.from ) return {ok: false, why: `${cap(good.name)} is not known until about ${good.from}.`};
  const shop = workshopFor(good.kind, y);
  const old = y && good.to && y > good.to;
  if ( old && !HAND.has(shop) && !HAND.has(c.shop[0][0]) ) return {ok: false, why: `${cap(good.name)} went out of use about ${good.to}, and the means to make it went with it.`};
  const useShop = old && !HAND.has(shop) ? c.shop[0][0] : shop;
  const tier = Math.max(0, Math.min(5, Math.round(valueAt(good, y) || 0)));
  const t = BY_TIER[tier];
  let mats = [...c.materials];
  if ( LEATHER.test(good.name) ) mats = ["a tanned hide", ...mats.filter(m => m !== "a tanned hide")];
  if ( known ) mats = mats.filter(m => known.includes(m));
  mats = mats.slice(0, tier >= 3 ? 2 : 1);
  const diff = 6 + (tier >= 4 ? 1 : 0) + (old ? 1 : 0);
  return {ok: true, why: old ? `made the old way (out of use since about ${good.to})` : "",
    task: {kind: "craft", name: `Make ${good.name}`, attr: "dexterity", ability: "crafts", diff, goal: t.goal, interval: t.interval,
      delicate: !!c.delicate, workshop: useShop, makes: good.name, good: good.id ?? "", materials: mats, craft: c.label,
      note: `${c.label}${old ? ", the old way" : ""}.`}};
}

/**
 * Materials at the start: take them from what the character carries (names), or buy what is missing.
 * Returns {take: [carried names to use up], buy: [names to pay for], missing: [names neither carried nor bought]}.
 */
export function gatherMaterials(materials = [], carried = [], {buy = false} = {}) {
  const left = [...carried];
  const take = [], toBuy = [], missing = [];
  for ( const m of materials ) {
    const want = String(m).toLowerCase();
    const i = left.findIndex(c => String(c).toLowerCase().includes(want.replace(/^(a|an|some) /, "")));
    if ( i >= 0 ) { take.push(left[i]); left.splice(i, 1); }
    else if ( buy ) toBuy.push(m);
    else missing.push(m);
  }
  return {take, buy: toBuy, missing};
}

const cap = s => String(s ?? "").replace(/^./, c => c.toUpperCase());
