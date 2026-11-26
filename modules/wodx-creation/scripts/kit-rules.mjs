/**
 * What a character carries (the owner's desk picks of 26 Nov, inv1 and inv2). Pure: no Foundry.
 *
 * A starting kit is a suggestion the player can change: the clothes for the character's station and land, the tools
 * of the trade the Abilities point to, a weapon for a fighter, and the small things anyone carries. The clothes they
 * stand up in come free, as the book says a character with no Resources still has enough clothing to get by (V20 Dark
 * Ages p. 181). The rest is bought out of a budget: one month of the Resources allowance (WoDX Storyteller's
 * money-rules), a house rule. What is left of the budget becomes coin in the purse.
 *
 * The same kit, with no shopping, fills an NPC's pockets the first time someone deals with them (inv2): their station
 * comes from their Resources or their purse, and a thin purse means fewer things.
 *
 * Goods come from WoDX Library's goods.mjs with the tags of goods-tags.mjs (station, style, trade). Gear (the book
 * weapons of gear.json) carries its station in GEAR_TAGS. Everything is passed in, so this file reads no data itself.
 */

/** Station letters, poorest first, as goods-tags.mjs writes them. */
export const STATION_ORDER = ["p", "c", "w", "n"];
export const STATION_WORD = {p: "poor", c: "common", w: "well-off", n: "noble"};

/** The station Resources dots stand for: none or one is common folk at best, five is the nobility. A house reading. */
export function stationFor(dots = 0) {
  const d = Math.max(0, Math.min(5, Math.round(Number(dots) || 0)));
  return d === 0 ? "p" : d <= 2 ? "c" : d <= 3 ? "w" : "n";
}

/** Does a good or gear row suit a station? Rows with no station tag suit anyone. */
export function suits(stations, letter) {
  if ( !stations || !stations.length ) return true;
  const has = l => stations.includes(l) || stations.includes(STATION_WORD[l]);
  // The nobility also wear and use the better things of the well-off, where nothing is made for them alone
  return has(letter) || (letter === "n" && has("w"));
}

/**
 * The part of the body a piece of clothing covers, from its name. One piece a part makes an outfit. null: not
 * clothing anyone dresses in (a bolt of cloth, a needle case) or nothing the outfit needs.
 */
const SLOT_WORDS = [
  ["feet", /\b(shoes|boots|sandals|clogs|slippers|moccasins|sneakers|foot (?:rags|wraps)|geta)\b/],
  ["legs", /\b(hose|breeches|pants|trousers|leggings|jeans|skirt|loincloth)\b/],
  ["body", /\b(shift|tunic|shirt|doublet|dress|gown|robe|kirtle|bliaut|jerkin|cassock|surcoat|t-shirt|sweatshirt|blouse|thawb|abaya)\b/],
  ["outer", /\b(cloak|coat|jacket|mantle|poncho|cape|sheepskin)\b/],
  ["waist", /\b(belt)\b/],
  ["head", /\b(hood|cap|hat|coif|headscarf|wimple|beret|turban)\b/]
];
/** The parts an outfit needs, in the order they are dressed. A dress or robe covers the legs too. */
export const OUTFIT = ["body", "legs", "feet", "waist", "outer"];
export function slotOf(name = "") {
  const n = String(name).toLowerCase();
  if ( /\b(bolt|hank|needle|length of|strip of|crown|wedding|veil|eyepatch|cuffs|arm warmers|apron|garters)\b/.test(n) ) return null;
  for ( const [slot, re] of SLOT_WORDS ) if ( re.test(n) ) return slot;
  return null;
}
const COVERS_LEGS = /\b(dress|gown|bliaut|robe|cassock|thawb|abaya)\b/;

/** Abilities that point to a trade (goods-tags.mjs trade words). The highest rated wins; ties go by this order. */
export const ABILITY_TRADES = [
  ["crafts", ["smith", "carpenter", "leatherworker", "weaver", "mason"]],
  ["animalken", ["herder", "farrier"]],
  ["survival", ["hunter", "fisher", "forester"]],
  ["larceny", ["thief"]],
  ["academics", ["scholar"]],
  ["scholarship", ["scholar"]],
  ["occult", ["scholar"]],
  ["medicine", ["scholar"]]
];
/** Ability keys a fighter has, by the gear kind they want. */
export const FIGHTER = [["melee", "Melee Weapon"], ["archery", "Ranged Weapon"], ["firearms", "Ranged Weapon"]];

const rated = (abilities, key) => Number(abilities?.[key]?.value ?? abilities?.[key]) || 0;

/** The trade the Abilities point to, or "" for none: {trade, ability, dots}. A seed picks among an Ability's trades. */
export function tradeFor(abilities = {}, rand = () => 0) {
  let best = null;
  for ( const [key, trades] of ABILITY_TRADES ) {
    const d = rated(abilities, key);
    if ( d > 0 && (!best || d > best.dots) ) best = {ability: key, dots: d, trade: trades[Math.min(trades.length - 1, Math.floor(rand() * trades.length))]};
  }
  return best ?? {ability: "", dots: 0, trade: ""};
}

/** A seeded random in [0, 1): the same seed gives the same kit. */
export function seeded(seed = "wodx") {
  let h = 2166136261;
  for ( const ch of String(seed) ) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}
const pickOne = (list, rand) => list.length ? list[Math.min(list.length - 1, Math.floor(rand() * list.length))] : null;

/** Small things anyone carries, by kind and a name pattern, the first one in use there is taken. */
export const BASICS = [
  ["containers", /\b(purse|pouch|bindle|scrip|sack)\b/],
  ["light", /\b(flint|tinder|fire piston)\b/],
  ["light", /\b(candle|rushlight|torch|lamp)\b/]
];

/**
 * The suggested kit. goods: the Library's GOODS; gear: gear.json items; inUse(good) and gearHere(item): is it found
 * where and when the character is; price(good|item): what it costs in the purse's smallest unit; station: a letter;
 * abilities: the sheet's abilities ({key: dots or {value}}); gearStation(name): GEAR_TAGS' stations for a weapon.
 * Returns [{key, name, kind, from: "good"|"gear", good?, item?, price, free, why}] in the order a player reads them.
 */
export function suggestKit({goods = [], gear = [], inUse = () => true, gearHere = () => true, price = () => 0, station = "c",
  abilities = {}, gearStation = () => null, seed = "wodx", year = null} = {}) {
  const rand = seeded(seed);
  const out = [], have = new Set();
  const add = (row, why, free = false) => {
    const key = row.from === "gear" ? `gear:${row.item.name}` : `good:${row.good.id}`;
    if ( have.has(key) ) return;
    have.add(key);
    out.push({key, name: row.from === "gear" ? row.item.name : row.good.name, kind: row.from === "gear" ? row.item.type : row.good.kind, ...row,
      price: free ? 0 : Math.max(0, Math.round(Number(price(row.from === "gear" ? row.item : row.good)) || 0)), free, why});
  };
  const here = goods.filter(g => g && inUse(g));
  // The clothes they stand up in: one piece for each part, everyday wear at their station (free)
  const wear = here.filter(g => g.kind === "cloth" && g.use === "worn" && suits(g.station, station) && (!g.style || g.style.includes("everyday") || (station === "n" && g.style.includes("fine"))));
  let legsCovered = false;
  for ( const slot of OUTFIT ) {
    if ( slot === "legs" && legsCovered ) continue;
    // Before 1800 the clothes of the period come first: the long list borrowed from Cataclysm: DDA (source "cdda") is
    // dated loosely and is the fallback there
    const fits = wear.filter(g => slotOf(g.name) === slot), period = year != null && year < 1800 ? fits.filter(g => g.source !== "cdda") : [];
    const pick = pickOne(period.length ? period : fits, rand);
    if ( !pick ) continue;
    if ( slot === "body" && COVERS_LEGS.test(pick.name.toLowerCase()) ) legsCovered = true;
    add({from: "good", good: pick}, "what they stand up in", true);
  }
  // The tools of their trade
  const t = tradeFor(abilities, rand);
  if ( t.trade ) {
    const tools = here.filter(g => g.kind === "tools" && (g.trade ?? []).includes(t.trade) && suits(g.station, station));
    const n = t.dots >= 3 ? 2 : 1;
    for ( let i = 0; i < n; i++ ) {
      const pick = pickOne(tools.filter(g => !have.has(`good:${g.id}`)), rand);
      if ( pick ) add({from: "good", good: pick}, `the tools of a ${t.trade} (${t.ability})`);
    }
  }
  // A weapon for a fighter: the plainest book weapon of the kind found there that suits their station
  for ( const [key, type] of FIGHTER ) {
    if ( rated(abilities, key) <= 0 ) continue;
    const arms = gear.filter(i => i?.type === type && gearHere(i) && suits(gearStation(i.name), station));
    const cheap = arms.map(i => ({i, p: Number(price(i)) || 0})).sort((a, b) => a.p - b.p || a.i.name.localeCompare(b.i.name)).slice(0, 3).map(x => x.i);
    const pick = pickOne(cheap, rand);
    if ( pick ) add({from: "gear", item: pick}, `a fighter's weapon (${key})`);
  }
  // The small things anyone carries
  for ( const [kind, re] of BASICS ) {
    const pick = here.find(g => g.kind === kind && re.test(g.name) && suits(g.station, station));
    if ( pick ) add({from: "good", good: pick}, "what anyone carries");
  }
  return out;
}

/** What the chosen rows cost and what is left of the budget: {spent, left, over}. Free rows cost nothing. */
export function tally(rows = [], budget = 0) {
  const spent = rows.reduce((s, r) => s + (r.free ? 0 : Math.max(0, Number(r.price) || 0)) * Math.max(1, Number(r.count) || 1), 0);
  const b = Math.max(0, Math.round(Number(budget) || 0));
  return {spent, left: Math.max(0, b - spent), over: spent > b};
}

/** Fit a kit to a budget: drop the dearest bought rows from the end until it fits. Free rows always stay. */
export function fitBudget(rows = [], budget = 0) {
  const keep = [...rows];
  while ( tally(keep, budget).over ) {
    let i = -1, dear = -1;
    keep.forEach((r, j) => { if ( !r.free && Number(r.price) >= dear ) { dear = Number(r.price); i = j; } });
    if ( i < 0 ) break;
    keep.splice(i, 1);
  }
  return keep;
}

/** The shopping budget: one month of the Resources allowance (a house rule), passed in from money-rules' allowance. */
export const BUDGET_MONTHS = 1;
export const budgetFrom = monthly => Math.max(0, Math.round((Number(monthly) || 0) * BUDGET_MONTHS));

/**
 * An NPC's things the first time someone deals with them (inv2): the same kit with no shopping, cut to what their purse
 * says they could have. purse: what they carry in coin; wage: a day's wage there. A purse under a week's wage keeps
 * only the free clothes and one more thing; under a month's, half the bought rows.
 */
export function npcKit(rows = [], {purse = null, wage = 0} = {}) {
  const free = rows.filter(r => r.free), bought = rows.filter(r => !r.free);
  if ( purse === null || purse === undefined || !(Number(wage) > 0) ) return rows;
  const p = Number(purse) || 0, w = Number(wage);
  if ( p < 7 * w ) return [...free, ...bought.slice(0, 1)];
  if ( p < 30 * w ) return [...free, ...bought.slice(0, Math.ceil(bought.length / 2))];
  return rows;
}

/** The Item data for a row, with the good's tags on it so later systems can read them. LIB: WoDX Library's id. */
export function itemData(row, {LIB = "wodx-library", by = ""} = {}) {
  if ( row.from === "gear" ) {
    const d = JSON.parse(JSON.stringify(row.item));
    delete d._id;
    d.flags = {...(d.flags ?? {}), "wodx-creation": {...(d.flags?.["wodx-creation"] ?? {}), kit: true, ...(by ? {kitFor: by} : {})}};
    return d;
  }
  const g = row.good;
  const tags = {station: g.station ?? null, style: g.style ?? null, material: g.material ?? null, trade: g.trade ?? null, category: g.kind};
  return {name: g.name, type: "Item",
    flags: {[LIB]: {good: g.id, tags}, "wodx-creation": {kit: true, ...(by ? {kitFor: by} : {})}}};
}
