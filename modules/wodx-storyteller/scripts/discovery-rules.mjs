/**
 * WoDX Storyteller 0.55.0 (B2550 to B2553): the known world. Each part of the world knows of the others from a year
 * on, and a journey keeps to what the chronicle's homeland knows in its year: a land nobody at home has heard of
 * cannot be the end of a journey, and its ground and its waters cannot be crossed on the way. The years are a house
 * reading of when word and a way first reached one part of the world from another; they are coarse on purpose.
 * A chronicle can find a land for itself before its time (the Storyteller marks it found). Pure rules, no Foundry.
 */

/** Known from of old: before any year the chronicle is likely to visit. */
export const OLD = -Infinity;
/** From this year on, every part of the world knows of every other. */
export const ALL_KNOWN = 1900;

const EUROPE = ["moravia", "german-lands", "british-isles", "france", "iberia", "italy", "low-countries", "scandinavia", "poland-baltic", "carpathians-balkans", "russia", "aegean"];
const NEAR = ["anatolia", "levant", "egypt", "arabia", "maghreb", "persia", "central-asia"];
const each = (ids, year) => Object.fromEntries(ids.map(id => [id, year]));

/**
 * The circles of knowledge. members: the regions that share one picture of the world and know each other from of
 * old. knows: {region: first year}. relay: once a circle knows Europe's seafarers, it learns what they have found
 * this many years after them (null: this circle is the one the others learn from).
 */
export const CIRCLES = {
  europe: {label: "Europe", members: EUROPE, relay: null, knows: {
    ...each(NEAR, OLD), arctic: OLD, china: 1245, "tibet-himalaya": 1330,
    "west-africa": 1444, "central-africa": 1482, "southern-africa": 1488, caribbean: 1492, "north-america-east": 1497, canada: 1497, "east-africa": 1498, india: 1498,
    brazil: 1500, "southeast-asia": 1509, nusantara: 1511, "southern-cone": 1516, mexico: 1517, "pacific-islands": 1521, andes: 1526, "north-america-west": 1540, japan: 1543, siberia: 1582,
    korea: 1593, australia: 1606, aotearoa: 1642, antarctica: 1820}},
  "near-east": {label: "North Africa, the Near East and Central Asia", members: NEAR, relay: 20, knows: {
    ...each(EUROPE, OLD), india: OLD, "east-africa": OLD, "west-africa": OLD, "southern-africa": OLD, china: OLD, "southeast-asia": OLD, nusantara: OLD, "tibet-himalaya": OLD,
    korea: OLD, siberia: 1400, "central-africa": 1500, japan: 1550}},
  india: {label: "India", members: ["india"], relay: 30, knows: {
    ...each(NEAR, OLD), ...each(EUROPE, 1498), "tibet-himalaya": OLD, china: OLD, "southeast-asia": OLD, nusantara: OLD, "east-africa": OLD}},
  east: {label: "East Asia and the islands", members: ["china", "japan", "korea", "southeast-asia", "nusantara", "tibet-himalaya", "siberia"], relay: 70, knows: {
    india: OLD, "central-asia": OLD, persia: OLD, arabia: OLD, levant: 1250, egypt: 1250, anatolia: 1250, maghreb: 1350, ...each(EUROPE, 1290), "east-africa": 1418,
    "pacific-islands": 1600, australia: 1700}},
  africa: {label: "Africa south of the desert", members: ["west-africa", "central-africa", "east-africa", "southern-africa"], relay: 30, knows: {
    maghreb: OLD, egypt: OLD, arabia: OLD, levant: OLD, persia: OLD, india: OLD, china: 1418, ...each(EUROPE, 1444)}},
  "north-america": {label: "North America and the far north", members: ["north-america-east", "north-america-west", "canada", "arctic"], relay: 30, knows: {
    mexico: OLD, caribbean: OLD, siberia: OLD, ...each(EUROPE, 1497)}},
  "middle-america": {label: "Mexico and the Caribbean", members: ["mexico", "caribbean"], relay: 30, knows: {
    "north-america-east": OLD, "north-america-west": OLD, brazil: OLD, andes: 1520, ...each(EUROPE, 1492)}},
  "south-america": {label: "South America", members: ["andes", "brazil", "southern-cone"], relay: 30, knows: {
    caribbean: OLD, mexico: 1530, ...each(EUROPE, 1500)}},
  polynesia: {label: "The Pacific islands", members: ["pacific-islands", "aotearoa"], relay: 30, knows: {...each(EUROPE, 1767), australia: 1790}},
  australia: {label: "Australia", members: ["australia"], relay: 30, knows: {"pacific-islands": OLD, nusantara: 1700, ...each(EUROPE, 1788)}}
};

const CIRCLE_OF = Object.fromEntries(Object.entries(CIRCLES).flatMap(([key, c]) => c.members.map(id => [id, key])));
/** The circle of knowledge a region belongs to (a homeland on the southern ice reads Europe's charts). */
export const circleOf = region => CIRCLE_OF[region] ?? "europe";

/** The first year a homeland knows of a region and of a way to it. */
export function knownYear(home, region) {
  const key = circleOf(home), c = CIRCLES[key];
  if ( region === home || c.members.includes(region) ) return OLD;
  const direct = c.knows[region] ?? Infinity;
  let relayed = Infinity;
  if ( c.relay !== null ) {
    const contact = Math.min(...EUROPE.map(id => c.knows[id] ?? Infinity));
    // Europe's own lands are known by meeting them (the direct year), never by hearsay through one of them
    if ( !EUROPE.includes(region) ) relayed = Math.max(contact, CIRCLES.europe.knows[region] ?? Infinity) + c.relay;
  }
  return Math.min(direct, relayed, ALL_KNOWN);
}

/** Does the homeland know of the region in the year? found: regions the chronicle has discovered for itself. */
export const isKnown = (home, region, year, found = []) => !region || found.includes(region) || Number(year) >= knownYear(home, region);

/** Every region the homeland knows in the year, as a Set of ids, out of the list given. */
export const knownRegions = (home, year, regions, found = []) => new Set(regions.filter(id => isKnown(home, id, year, found)));

/** The regions still beyond the known world in the year, soonest first: [{id, year}]. */
export const unknownRegions = (home, year, regions, found = []) => regions.filter(id => !isKnown(home, id, year, found))
  .map(id => ({id, year: knownYear(home, id)})).sort((a, b) => a.year - b.year || a.id.localeCompare(b.id));

/** A clean list of found regions: known ids only, no repeats. */
export const normFound = (list, regions) => [...new Set((Array.isArray(list) ? list : []).filter(id => regions.includes(id)))];
