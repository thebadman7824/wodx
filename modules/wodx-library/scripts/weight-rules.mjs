/**
 * WoDX Library: what things weigh (B6080 to B6089). Pure rules, no Foundry calls.
 *
 *   Every thing    An item, a good from Everyday goods or a line in a container weighs something in kilograms. The
 *                  Storyteller's own figure on an item (flag wodx-library.kg) wins; then the named figures below;
 *                  then a figure for the kind of thing and how well it hides (V20's concealment steps), B6080.
 *   By the year    A thing whose make changed over the centuries weighs what it weighed that year: "2.3>1960:0.6"
 *                  is 2.3 kg, from 1960 0.6. Armor is iron and leather before 1900, aramid and ceramic after, and
 *                  Future Darkness composites from 2050; guns and gadgets lose a fifth from 2050 (B6081).
 *   Counts         "silver pennies (7)" and "7 silver pennies" weigh seven pennies (B6082).
 *   In the body    Cyberware, implants and bioware that are installed weigh nothing extra; loose, they do (B6080).
 * The books give no weights for gear, so every figure here is a house figure (docs/PENDING-REVIEW.md).
 */

const num = v => Number(v) || 0;

/** Concealment steps, both spellings: the goods' P J T N and the gear's P C J L T V N. */
export const SIZE = {P: "P", V: "P", C: "J", J: "J", L: "T", T: "T", N: "N"};

/** kg for a good of a kind, by how well it hides: [pocket, jacket, trench coat, cannot hide]. */
export const KIND_KG = {
  coin: [0.005, 0.3, 1, 5], food: [0.2, 0.5, 2, 10], drink: [0.3, 0.8, 2, 5], drugs: [0.05, 0.3, 1, 5],
  vice: [0.1, 0.4, 2, 8], kitchen: [0.1, 0.5, 2, 6], house: [0.1, 0.6, 3, 6], cloth: [0.2, 0.8, 2, 5],
  hygiene: [0.1, 0.3, 1.5, 8], tools: [0.2, 0.6, 2.5, 8], light: [0.1, 0.5, 1.5, 6], fuel: [0.3, 1, 4, 10],
  power: [0.05, 0.4, 2, 15], papers: [0.02, 0.3, 1.5, 6], manuals: [0.2, 0.6, 1.5, 4], maps: [0.05, 0.2, 0.5, 2],
  faith: [0.05, 0.4, 2, 15], occult: [0.05, 0.4, 2, 3], medicine: [0.05, 0.3, 1.5, 6], keepsake: [0.05, 0.3, 1, 5],
  toys: [0.05, 0.4, 2, 3], valuables: [0.05, 0.4, 2, 10], arms: [0.05, 0.8, 3, 8], accessories: [0.1, 0.4, 1.5, 5],
  traps: [0.2, 1, 3, 10], travel: [0.01, 0.5, 2, 10], containers: [0.1, 0.4, 1.5, 5], keys: [0.02, 0.2, 1, 3],
  materials: [0.5, 1, 5, 20], seeds: [0.02, 0.2, 1, 10], tech: [0.1, 0.4, 2, 10],
  melee: [0.3, 0.8, 1.5, 3], ranged: [0.5, 1, 3, 4.5], thrown: [0.2, 0.5, 1, 2], other: [0.1, 0.5, 2, 6]
};
const SLOT = {P: 0, J: 1, T: 2, N: 3};

/**
 * Named figures: [pattern, kg]. kg is a number or a staged string ("2.3>1960:0.6>1995:0.25"). The first match wins,
 * so the narrow names come before the wide ones.
 */
export const NAMED = [
  // furniture, fittings and heavy household things
  [/\banvil\b/i, 100], [/dishwasher/i, 45], [/water heater/i, 40], [/stone sculpture/i, 40], [/electric kiln/i, 50],
  [/cash register/i, 20], [/lawnmower/i, "30>1960:25"], [/sewing machine/i, 15], [/feather bed/i, 15], [/straw mattress/i, 10],
  [/tapestry/i, 12], [/\bcradle\b/i, 10], [/tin bath/i, 10], [/glass mirror/i, 8], [/mannequin/i, 8], [/vacuum cleaner/i, "9>1960:7>2000:5"],
  [/robot vacuum/i, 3.5], [/mantel clock/i, 4], [/three-legged stool|\bstool\b/i, 3], [/training dummy/i, 25], [/wooden pallet/i, 20],
  [/military parachute/i, 14], [/adobe brick/i, 12], [/fire brick|\bbrick\b(?!-sized)/i, 3], [/\burn\b/i, 4], [/fishbowl/i, 3],
  [/patchwork quilt|\bquilt\b/i, 2], [/woollen blanket|\bblanket\b/i, 2], [/air purifier/i, 6], [/electric fan/i, "5>1960:3"],
  [/stone quern/i, 25], [/forge|charcoal kiln/i, 40], [/car battery/i, 18], [/oxygen tank|diving cylinder|butane tank/i, 15],
  [/mantrap|bear trap/i, 12], [/tuba|hurdy-gurdy|bagpipes/i, 6], [/stepladder/i, 6], [/chamber pot/i, 1.5], [/feather pillow|\bpillow\b/i, 0.5],
  [/twig broom|\bbroom\b/i, 1], [/\btoaster\b/i, 1.5], [/\bcot\b/i, 7], [/hammock/i, 1.5], [/clay flower pot/i, 2], [/flat iron/i, 3], [/washboard/i, 2],
  // tools and building stuff
  [/jackhammer/i, 30], [/welding torch/i, 15], [/car jack/i, 10], [/large fire extinguisher/i, 9], [/glass terrarium/i, 15],
  [/chainsaw/i, 6], [/scythe blade/i, 1.5], [/\bscythe\b/i, 3], [/pickaxe|pick ax|mattock/i, 3.5], [/fishing net/i, 5],
  [/bolt cutter/i, 3], [/\bspade\b/i, 2], [/\bsickle\b/i, 0.5], [/crowbar/i, 2], [/cordless drill/i, 1.8], [/monkey wrench/i, 1.5],
  [/structural steel/i, 80], [/heavy wooden beam/i, 60], [/pig of lead/i, 30], [/long wooden post/i, 25], [/lime mortar/i, 25],
  [/short wooden post/i, 8], [/wooden post/i, 15], [/\bsoil\b/i, 20], [/timber plank/i, 10], [/wooden panel/i, 10],
  [/bar of iron|iron bar stock|steel bar stock/i, 8], [/tanned hide/i, 6], [/salt lick/i, 5], [/cannonball/i, 5], [/\bmercury\b/i, 1],
  // containers, empty
  [/steamer trunk/i, 25], [/iron-bound chest/i, 30], [/wooden barrel/i, 15], [/steel drum/i, 18], [/large propane tank/i, 18],
  [/\bkeg\b/i, 13], [/wooden crate/i, 10], [/wooden coffer/i, 8], [/clay hydria/i, 6], [/hard-shell case|smart case/i, 4],
  [/pair of saddlebags/i, 3], [/military rucksack|military seabag|high-volume rucksack/i, 2.5], [/suitcase/i, "4>1960:3>2000:2.5"],
  [/carpet bag|briefcase/i, 2], [/backpack|rucksack|travelpack|duffel|daypack/i, 1.5], [/collapsible drum/i, 3],
  [/pet carrier/i, 2], [/bucket/i, 1.5], [/wicker basket/i, 1], [/cardboard box|plastic tub/i, 0.6],
  // kitchen
  [/grinding slab/i, 20], [/clay pot oven/i, 15], [/churn/i, 8], [/iron cooking pot|dutch oven/i, 6], [/samovar/i, 6],
  [/food dehydrator/i, 5], [/pressure cooker/i, 4], [/mortar and pestle/i, 3], [/stock pot|canning pot/i, 3], [/coffeemaker/i, 2.5],
  [/\bkettle\b/i, 1.5],
  // machines and gadgets, by the year they were made
  [/valve radio/i, 10], [/phonograph|gramophone/i, 9], [/magic lantern/i, 8], [/typewriter/i, 7], [/portable television/i, 6],
  [/microscope/i, "6>1950:4>2000:2"], [/video cassette recorder/i, 5], [/candlestick telephone/i, 2], [/sextant/i, 2],
  [/walkie-talkie/i, "2.3>1960:0.6>1995:0.25"], [/laptop/i, "3>2005:2>2015:1.4"], [/hacking deck/i, 1.5], [/camcorder/i, "2>1995:0.8"],
  [/box camera/i, 1], [/drone/i, 1], [/transistor radio/i, 0.8], [/brick-sized mobile phone/i, 0.8], [/headphones/i, "0.4>1980:0.2"],
  [/smartphone|cellphone|mobile phone/i, 0.2], [/tablet computer/i, 0.5], [/binoculars/i, "1.2>1970:0.7"], [/night-vision|infrared goggles/i, "2.5>1990:0.8"],
  // travel and riding
  [/set of horse tack/i, 18], [/\bsaddle\b(?!bag)/i, 12], [/wheelchair/i, "25>1950:18>2000:13"], [/inflatable boat/i, 30],
  [/snowshoes/i, 2], [/bedroll/i, 3], [/bridle/i, 1.5],
  // food and drink in bulk
  [/^(grain|barley|oats|potatoes|rice)$/i, 10], [/breakfast cereal/i, 0.5], [/smoked ham/i, 6], [/salted pork/i, 5],
  [/round of hard cheese/i, 3], [/^(ale|small beer|wine|mead|cider|lager)$/i, 5], [/^milk$/i, 2],
  // fuel
  [/^(petrol|kerosene)$/i, 10], [/^coal$/i, 10], [/^charcoal$/i, 5], [/compressed biomass/i, 10], [/split log/i, 3],
  // papers and books
  [/telephone directory/i, 2], [/volume of an encyclopaedia|ledger of accounts/i, 2.5], [/book of hours|psalter/i, 0.8],
  // arms from Everyday goods
  [/bayonet/i, 0.5], [/gas mask/i, 1], [/sword belt and scabbard/i, 1], [/hand grenade/i, 0.4], [/stick of dynamite/i, 0.3],
  [/kitchen cleaver/i, 0.6], [/powder horn/i, 0.5], [/\barrow\b|crossbow bolt/i, 0.05], [/grenade|flashbang/i, 0.4], [/^an? iron nail$|fishhook|clothes peg|^a match$|^pins$/i, 0.01], [/cartridge|shotgun shell|musket ball|sling stone/i, 0.03],
  // weapons from Gear by era (by their book names)
  [/\btable\b/i, 30], [/\bchair\b/i, 6], [/gatling gun/i, 40], [/heavy crossbow|crossbow, hvy/i, 7], [/hackbutt/i, 7], [/\blance\b/i, 6],
  [/arquebus|musket/i, 5], [/\bpike$/i, 5], [/longrifle|buffalo rifle/i, 5], [/hand cannon/i, 4], [/naginata|halberd|glaive/i, 3],
  [/greatsword|great ax|battle-ax|great spiked club/i, 3], [/morning ?star|flail/i, 2.5], [/war ?hammer/i, 2.5], [/\bmace\b/i, 2.5],
  [/harpoon/i, 2.5], [/assault rifle/i, 3.5], [/smg, large/i, 3.5], [/shotgun|winchester lever-action, 12/i, 3.5], [/coach gun/i, 3],
  [/\brifle\b|repeater|bolt-action|winchester 1873|henry/i, 4], [/repeating crossbow/i, 2.5], [/crossbow, hand/i, 1.5], [/crossbow/i, 3],
  [/compound bow/i, 1.8], [/smg, small/i, 2], [/bastard sword|macuahuitl|quarterstaff|taiaha/i, 2], [/branch/i, 2],
  [/\b(axe?|hand ax)\b/i, 1.5], [/broadsword|\bsword\b|takouba|jian|tachi/i, 1.5], [/spear|yari|qiang|assegai|tepoztopilli|javelin/i, 1.8],
  [/pitchfork|field fork/i, 2], [/candlestick/i, 1.5], [/smith's hammer/i, 1.5], [/saber|sabre|scimitar|shamshir|kilij|talwar|katana|dao|dha|falchion|shotel|rapier/i, 1.2],
  [/short sword|champi|war club|\bclub\b/i, 1], [/longbow|yumi/i, 1], [/short ?bow|\bbow\b/i, 0.8], [/hatchet|tomahawk|khukuri/i, 0.8],
  [/revolver, hvy|army|navy|peacemaker|\.45|\.44/i, 1.2], [/flintlock|dueling pistol|matchlock pistol|wheellock pistol|flare pistol/i, 1.2],
  [/pistol, hvy/i, 1.1], [/revolver|pistol/i, 0.8], [/derringer/i, 0.3], [/single-action/i, 1], [/whip|cat-o'-nine-tails/i, 0.8], [/rock, thrown|\brock\b/i, 0.5],
  [/throwing iron|patu|shark-tooth/i, 0.8], [/tankard/i, 0.5], [/main-gauche|kris|katar|stiletto|dagger/i, 0.4],
  [/knife|stake|sap\b|blackjack|brass knuckles|switchblade/i, 0.3], [/atlatl dart/i, 0.3], [/huaraca|\bsling\b/i, 0.1]
];

/** Armor by its lethal soak: iron, leather and mail before 1900 (a mail shirt about 14 kg, full plate about 25). */
export const ARMOR_OLD = [0, 3, 8, 14, 18, 25, 30, 35, 40];
/** Armor from 1900: aramid, ceramic plates, riot gear. Future Darkness composites (2050) take a third off that. */
export const ARMOR_NEW = [0, 1.5, 3, 5, 8, 12, 16, 20, 25];
export const MODERN_FROM = 1900, FUTURE_FROM = 2050, FUTURE_LIGHTER = 0.8, FUTURE_ARMOR = 2 / 3;
/** Shields: wood and iron before 1900, polycarbonate after. */
export const SHIELD = {old: 5, new: 3.5};
/** Cyberware and the like out of the body: a limb, a hand or foot, the rest. */
export const CYBER_LOOSE = {limb: 4, hand: 1, foot: 1.5, other: 0.3};
const CYBER = /cyber|implant|bioware|exoskeleton/;

/** A staged figure for a year: "2.3>1960:0.6>1995:0.25" -> 0.6 in 1970. Plain numbers pass through. */
export function stagedKg(v, year) {
  if ( typeof v === "number" ) return v;
  const parts = String(v ?? "").split(">");
  let kg = num(parts[0]);
  const y = num(year);
  for ( const p of parts.slice(1) ) {
    const [from, w] = p.split(":");
    if ( y && y >= num(from) ) kg = num(w);
  }
  return kg;
}

/** The named figure for a name, or null. */
export function namedKg(name, year) {
  const s = String(name ?? "").trim();
  if ( !s ) return null;
  for ( const [re, kg] of NAMED ) if ( re.test(s) ) return stagedKg(kg, year);
  return null;
}

/** What armor weighs in a year by its soak. shield: it is a shield. */
export function armorKg({soak = 0, year = 0, shield = false, heavy = false} = {}) {
  const y = num(year), modern = y >= MODERN_FROM;
  let kg;
  if ( shield ) kg = modern ? SHIELD.new : SHIELD.old;
  else {
    const s = Math.max(0, Math.min(ARMOR_OLD.length - 1, Math.round(num(soak))));
    kg = (modern ? ARMOR_NEW : ARMOR_OLD)[s] + (s >= ARMOR_OLD.length - 1 ? (Math.round(num(soak)) - s) * 5 : 0);
    if ( heavy ) kg *= 1.5;
  }
  if ( y >= FUTURE_FROM ) kg *= FUTURE_ARMOR;
  return round(kg);
}

const round = kg => (kg >= 10 ? Math.round(kg) : kg >= 1 ? Math.round(kg * 10) / 10 : Math.round(kg * 1000) / 1000);

/**
 * What one thing weighs. t: {name, kind (a goods category, or gear's kind: melee, ranged, thrown, armor, cyber...),
 * type (the sheet type), conceal, soak, own (the Storyteller's figure), installed (cyberware in the body)}.
 * -> {kg, why} where why says where the figure came from: "own", "named", "armor", "kind".
 */
export function kgOf(t = {}, year = 0) {
  if ( num(t.own) > 0 ) return {kg: num(t.own), why: "own"};
  const kind = String(t.kind ?? "").toLowerCase(), type = String(t.type ?? "");
  if ( CYBER.test(kind) ) {
    if ( t.installed ) return {kg: 0, why: "installed"};
    return {kg: /limb/.test(kind) ? CYBER_LOOSE.limb : /hand/.test(kind) ? CYBER_LOOSE.hand : /foot/.test(kind) ? CYBER_LOOSE.foot : CYBER_LOOSE.other, why: "kind"};
  }
  if ( type === "Armor" || /^armor/.test(kind) ) {
    return {kg: armorKg({soak: t.soak, year, shield: /shield/.test(kind) || /shield/i.test(t.name ?? ""), heavy: /heavy/.test(kind)}), why: "armor"};
  }
  let kg = namedKg(t.name, year), why = "named";
  if ( kg === null ) {
    const k = KIND_KG[kind] ? kind : /thrown/.test(kind) ? "thrown" : type === "Ranged Weapon" || /^ranged/.test(kind) ? "ranged" : type === "Melee Weapon" || /^melee/.test(kind) ? "melee" : "other";
    kg = KIND_KG[k][SLOT[SIZE[String(t.conceal ?? "").toUpperCase()] ?? "J"] ?? 1];
    why = "kind";
  }
  if ( num(year) >= FUTURE_FROM && (type === "Ranged Weapon" || /^ranged|tech/.test(kind)) ) kg *= FUTURE_LIGHTER;
  return {kg: round(kg), why};
}

/**
 * A container line read for its count: "claret (3)", "7 silver pennies", "a knife". plurals: {plural: singular}.
 * -> {name, count}
 */
export function readCount(line, plurals = {}) {
  const s = String(line ?? "").trim();
  const c = /^(.+?)\s*\((\d+)\)$/.exec(s);
  if ( c ) return {name: c[1].trim(), count: Math.max(1, num(c[2]))};
  const n = /^(\d+)\s+(.+)$/.exec(s);
  if ( n && plurals[n[2]] ) return {name: plurals[n[2]], count: Math.max(1, num(n[1]))};
  if ( n ) return {name: n[2], count: Math.max(1, num(n[1]))};
  return {name: s, count: 1};
}

/**
 * What a list of lines weighs. lookup(name) -> the thing (as kgOf takes it) or null; a name with nothing behind it
 * weighs a plain small thing (half a kilo). -> {kg, rows: [{line, name, count, kg}]}
 */
export function linesKg(lines = [], {lookup = () => null, plurals = {}, year = 0} = {}) {
  const rows = [];
  let total = 0;
  for ( const line of lines ) {
    if ( !String(line ?? "").trim() ) continue;
    const {name, count} = readCount(line, plurals);
    const t = lookup(name) ?? lookup(String(line).trim());
    const each = t ? kgOf(t, year).kg : PLAIN_KG;
    const kg = each * count;
    total += kg;
    rows.push({line: String(line).trim(), name, count, kg: round(kg)});
  }
  return {kg: round(total), rows};
}
/** A thing named in a list that WoDX does not know: about half a kilo. */
export const PLAIN_KG = 0.5;

/** Sheet types that are things a character carries. The rest (traits, powers, notes) weigh nothing. */
export const CARRIED_TYPES = new Set(["Item", "Armor", "Melee Weapon", "Ranged Weapon", "Fetish"]);

/**
 * What a list of items weighs. items: [{name, type, kind, conceal, soak, own, installed, natural, worn, count}].
 * -> {kg (all), worn (on the body: armor worn), carried (the rest), rows}
 */
export function itemsKg(items = [], year = 0) {
  let all = 0, worn = 0;
  const rows = [];
  for ( const t of items ) {
    if ( !t || !CARRIED_TYPES.has(t.type) || t.natural ) continue;
    const each = kgOf(t, year).kg, kg = each * Math.max(1, num(t.count) || 1);
    all += kg;
    if ( t.worn ) worn += kg;
    rows.push({name: t.name, kg: round(kg), worn: !!t.worn});
  }
  return {kg: round(all), worn: round(worn), carried: round(all - worn), rows};
}

/** A weight in words: "about 12 kg", "under a kilo". */
export function kgWords(kg) {
  const w = num(kg);
  if ( w <= 0 ) return "nothing to speak of";
  if ( w < 1 ) return "under a kilo";
  return `about ${w >= 10 ? Math.round(w) : Math.round(w * 10) / 10} kg`;
}
