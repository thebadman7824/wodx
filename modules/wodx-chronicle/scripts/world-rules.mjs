/**
 * WoDX Chronicle 0.47.0: the world's regions (B2510 to B2514). Pure data and rules, no Foundry.
 *
 * WoDX runs anywhere on earth; Rothenstein in Moravia is only where the first chronicle starts. A region is a
 * homeland a chronicle can be set in, or a place a scene far from home can stand in. Each one names what the other
 * modules need to know about it:
 *
 *   part     which of the era profiles' three parts of the world it lies in (europe, americas, other)
 *   lat/lon  a typical city, for the sun and for the hours between two regions
 *   climate  WoDX Atmosphere's climate
 *   money    WoDX Storyteller's money region
 *   culture  the people generator's culture (the region's own id unless said otherwise)
 *   borrow   cultures whose name tables this one may also draw from
 *   mix      who lives there, by era group: origin and weight (WoDX Creation builds the origin tables from it)
 *   from     the first year WoDX has names for its people; before it the Storyteller names them (see docs/GLOBAL.md)
 *
 * All of it is a house reading of history, rounded for play. The books give no such table.
 */

const R = (label, part, lat, lon, climate, money, mix = null, extra = {}) => ({label, part, lat, lon, climate, money, mix, ...extra});
const EU = {borrow: ["bohemia"]}, AM = {borrow: ["american"]};

export const WORLD_REGIONS = {
  // Europe
  "moravia": R("Moravia and Bohemia (the Bohemian crown lands)", "europe", 50.1, 14.4, "central-europe", "moravian", null, {culture: "bohemia"}),
  "german-lands": R("The German lands (the Rhine, Saxony, Bavaria, Austria)", "europe", 50.1, 8.7, "central-europe", "german", {
    medieval: "german 92, jewish 8", industrial: "german 95, jewish 5", modern: "german 92, turkish 5, polish 3"}, EU),
  "british-isles": R("The British Isles (England, Scotland, Wales, Ireland)", "europe", 51.5, -0.1, "maritime-europe", "english", {
    medieval: "english 80, french 8, irish 8, jewish 4", "early-modern": "english 85, irish 12, dutch 3",
    industrial: "english 82, irish 15, jewish 3", modern: "english 82, irish 10, hindi 4, arabic 2, polish 2"}, EU),
  "france": R("France (Paris, Normandy, Burgundy, the Languedoc)", "europe", 48.9, 2.3, "maritime-europe", "french", {
    medieval: "french 96, jewish 4", "early-modern": "french 100", industrial: "french 97, jewish 3", modern: "french 88, arabic 8, portuguese 4"}, EU),
  "iberia": R("Iberia (Castile, Aragon, Portugal, al-Andalus)", "europe", 40.4, -3.7, "mediterranean", "spanish", {
    medieval: "spanish 62, portuguese 13, arabic 18, jewish 7", "early-modern": "spanish 80, portuguese 20", modern: "spanish 78, portuguese 18, arabic 4"}, EU),
  "italy": R("Italy (Venice, Florence, Rome, Naples, Sicily)", "europe", 43.8, 11.3, "mediterranean", "italian", {
    medieval: "italian 95, greek 2, jewish 3", "early-modern": "italian 97, jewish 3", modern: "italian 100"}, EU),
  "low-countries": R("The Low Countries (Flanders, Brabant, Holland)", "europe", 52.4, 4.9, "maritime-europe", "dutch", {
    medieval: "dutch 88, french 10, german 2", "early-modern": "dutch 85, french 10, jewish 5", modern: "dutch 90, french 6, turkish 2, arabic 2"}, EU),
  "scandinavia": R("Scandinavia (Denmark, Norway, Sweden, Iceland)", "europe", 59.3, 18.1, "northern-europe", "nordic", {medieval: "norse 100"}, EU),
  "poland-baltic": R("Poland and the Baltic (Kraków, Danzig, Vilnius, Riga)", "europe", 52.2, 21.0, "central-europe", "polish", {
    medieval: "polish 75, german 15, jewish 10", "early-modern": "polish 72, german 10, jewish 14, russian 4",
    industrial: "polish 72, jewish 14, german 8, russian 6", modern: "polish 100"}, EU),
  "carpathians-balkans": R("Hungary, Transylvania and the Balkans", "europe", 47.5, 19.0, "central-europe", "moravian", {
    medieval: "hungarian 45, romanian 20, serbian 20, german 10, jewish 5", modern: "hungarian 40, romanian 30, serbian 30"}, EU),
  "russia": R("The Rus and Russia (Novgorod, Kiev, Moscow)", "europe", 55.8, 37.6, "steppe", "russian", {
    medieval: "russian 100", industrial: "russian 90, jewish 5, turkish 5", modern: "russian 95, turkish 5"}, EU),
  "aegean": R("Greece and Constantinople (the Byzantine lands)", "europe", 41.0, 29.0, "mediterranean", "ottoman", {
    medieval: "greek 88, italian 8, jewish 4", "early-modern": "greek 56, turkish 36, jewish 5, italian 3", modern: "greek 90, turkish 10"}, EU),
  // The Middle East and inner Asia
  "anatolia": R("Anatolia (Rum, the Ottoman heartland, Turkey)", "other", 39.9, 32.9, "mediterranean", "ottoman", {
    medieval: "turkish 50, greek 45, arabic 5", "early-modern": "turkish 78, greek 22", modern: "turkish 100"}),
  "levant": R("The Levant and Mesopotamia (Damascus, Jerusalem, Baghdad)", "other", 33.5, 36.3, "mediterranean", "arab", {
    medieval: "arabic 86, french 6, greek 5, turkish 3", "early-modern": "arabic 90, turkish 10", modern: "arabic 100"}),
  "egypt": R("Egypt and the Nile (Cairo, Alexandria, Thebes)", "other", 30.0, 31.2, "hot-desert", "arab", {
    medieval: "arabic 100", "early-modern": "arabic 92, turkish 8", industrial: "arabic 90, turkish 5, greek 3, italian 2", modern: "arabic 100"}),
  "arabia": R("Arabia (Mecca, Medina, Sanaa, the Gulf)", "other", 21.4, 39.8, "hot-desert", "arab", {medieval: "arabic 100"}),
  "maghreb": R("The Maghreb (Fez, Tunis, Tripoli)", "other", 34.0, -5.0, "mediterranean", "arab", {
    medieval: "arabic 100", industrial: "arabic 90, french 10", modern: "arabic 100"}),
  "persia": R("Persia (Isfahan, Shiraz, Tabriz)", "other", 32.7, 51.7, "inner-asia", "persian", {
    medieval: "persian 80, steppe 8, turkish 8, arabic 4", "early-modern": "persian 85, turkish 15"}),
  "central-asia": R("The steppe and the Silk Road (Samarkand, Karakorum, Kashgar)", "other", 39.7, 67.0, "inner-asia", "persian", {
    medieval: "steppe 45, persian 35, turkish 20", "early-modern": "turkish 45, persian 35, steppe 20",
    industrial: "turkish 50, persian 25, russian 15, steppe 10", modern: "turkish 45, russian 30, persian 25"}),
  // South and East Asia
  "india": R("India (Delhi, Bengal, the Deccan, the Tamil south)", "other", 28.6, 77.2, "monsoon", "indian", {
    medieval: "hindi 70, tamil 12, persian 10, arabic 8", "early-modern": "hindi 62, tamil 12, persian 14, arabic 12",
    industrial: "hindi 68, tamil 12, arabic 15, english 5", modern: "hindi 72, tamil 13, arabic 15"}),
  "china": R("China (the Middle Kingdom)", "other", 32.1, 118.8, "east-asia-humid", "chinese", {
    medieval: "chinese 92, steppe 8", "early-modern": "chinese 100", industrial: "chinese 97, english 3", modern: "chinese 100"}),
  "japan": R("Japan (Kyoto, Edo, the provinces)", "other", 35.0, 135.8, "east-asia-humid", "japanese", {medieval: "japanese 100"}),
  "korea": R("Korea (Goryeo, Joseon)", "other", 37.6, 127.0, "north-east-asia", "chinese", {medieval: "korean 100"}),
  "southeast-asia": R("Mainland Southeast Asia (Angkor, Ayutthaya, Đại Việt)", "other", 13.8, 100.5, "tropical-seasonal", "chinese", {
    medieval: "vietnamese 50, thai 50", industrial: "vietnamese 45, thai 45, chinese 10"}),
  "nusantara": R("The Malay world (Java, Malacca, the Spice Islands)", "other", -6.2, 106.8, "tropical-wet", "chinese", {
    medieval: "javanese 60, malay 40", "early-modern": "javanese 57, malay 38, dutch 3, chinese 2",
    industrial: "javanese 55, malay 35, chinese 6, dutch 4", modern: "javanese 58, malay 36, chinese 6"}),
  // Africa south of the Sahara
  "west-africa": R("West Africa (Mali, Songhai, the Akan and Yoruba kingdoms)", "other", 12.6, -8.0, "savanna", "west-african", {
    medieval: "mande 60, yoruba 20, akan 15, arabic 5", "early-modern": "mande 40, yoruba 32, akan 25, arabic 3",
    industrial: "mande 35, yoruba 35, akan 25, arabic 3, english 2", modern: "mande 35, yoruba 38, akan 25, arabic 2"}),
  "east-africa": R("East Africa (the Swahili coast and Ethiopia)", "other", -6.2, 39.2, "east-african-coast", "east-african", {
    medieval: "swahili 55, amharic 30, arabic 15", industrial: "swahili 55, amharic 30, arabic 10, hindi 5"}),
  "southern-africa": R("Southern Africa (the Cape, the Highveld, Great Zimbabwe's heirs)", "other", -26.2, 28.0, "southern-africa", "southern-african", {
    medieval: "zulu 100", "early-modern": "zulu 90, dutch 10", industrial: "zulu 65, dutch 18, english 14, hindi 3"}),
  // The Americas
  "north-america-east": R("Eastern North America (New England, New York, the Ohio valley)", "americas", 40.7, -74.0, "american-east", "american", null, {culture: "american", from: 1607}),
  "north-america-west": R("The American West (the Plains, the Rockies, the Southwest)", "americas", 39.0, -105.0, "great-plains", "american", {
    "early-modern": "spanish 100", industrial: "anglo 68, hispanic 22, chinese 5, irish 5", modern: "anglo 70, hispanic 30"}, {...AM, from: 1598}),
  "mexico": R("Mexico and Central America (Tenochtitlan, New Spain)", "americas", 19.4, -99.1, "highland-tropics", "mexican", {
    medieval: "nahua 100", "early-modern": "nahua 55, spanish 45", industrial: "spanish 85, nahua 15"}),
  "caribbean": R("The Caribbean (Havana, Kingston, Santo Domingo)", "americas", 23.1, -82.4, "caribbean", "mexican", {
    "early-modern": "spanish 55, english 25, french 15, dutch 5", industrial: "spanish 50, english 30, french 20"}, {from: 1492}),
  "andes": R("The Andes (Cuzco, Lima, Potosí)", "americas", -13.5, -72.0, "andes", "mexican", {
    medieval: "quechua 100", "early-modern": "quechua 65, spanish 35", industrial: "spanish 60, quechua 40"}),
  "brazil": R("Brazil (Salvador, Rio de Janeiro, the Amazon)", "americas", -13.0, -38.5, "brazil-coast", "brazilian", {
    "early-modern": "portuguese 100", modern: "portuguese 92, italian 5, japanese 3"}, {from: 1500}),
  // Oceania
  "australia": R("Australia (Sydney, Melbourne, the outback)", "other", -33.9, 151.2, "australia-southeast", "australian", {
    industrial: "english 75, irish 25", modern: "english 78, irish 12, italian 4, greek 3, chinese 3"}, {from: 1788}),
  "aotearoa": R("Aotearoa New Zealand", "other", -41.3, 174.8, "aotearoa", "australian", {
    medieval: "maori 100", industrial: "english 55, maori 30, irish 15", modern: "english 70, maori 18, irish 12"}),
  "pacific-islands": R("The Pacific islands (Hawaiʻi, Tahiti, Samoa)", "other", 21.3, -157.9, "pacific-islands", "pacific", {
    medieval: "hawaiian 100", industrial: "hawaiian 60, english 15, japanese 15, chinese 10", modern: "hawaiian 30, english 30, japanese 25, chinese 15"})
};

export const DEFAULT_REGION = "moravia";
export const ERA_GROUPS = ["medieval", "early-modern", "industrial", "modern"];

/** A region by id; an unknown id gives null. */
export const regionOf = id => (id && Object.hasOwn(WORLD_REGIONS, id)) ? {id, ...WORLD_REGIONS[id]} : null;
/** The people generator's culture for a region. */
export const cultureOf = id => regionOf(id)?.culture ?? (regionOf(id) ? id : null);
/** Every culture the generators know: {culture id: label}. */
export const CULTURE_LABELS = Object.fromEntries(Object.entries(WORLD_REGIONS).map(([id, r]) => [r.culture ?? id, r.label]));
/** Cultures a culture may borrow name tables from: {culture: [others]}. */
export const CULTURE_BORROW = Object.fromEntries(Object.entries(WORLD_REGIONS).filter(([, r]) => r.borrow).map(([id, r]) => [r.culture ?? id, r.borrow]));

/** "german 92, jewish 8" as [[origin, weight]...]. */
export const parseMix = s => String(s ?? "").split(",").map(x => x.trim()).filter(Boolean).map(x => { const i = x.lastIndexOf(" "); return [x.slice(0, i), Number(x.slice(i + 1))]; });

/**
 * Who lives in a region in an era group: the group's own mix, else the nearest earlier one, else the first given.
 * null for a region that keeps its own tables (Moravia, eastern North America).
 */
export function mixFor(id, group) {
  const r = regionOf(id);
  if ( !r?.mix ) return null;
  const at = Math.max(0, ERA_GROUPS.indexOf(group));
  for ( let i = at; i >= 0; i-- ) if ( r.mix[ERA_GROUPS[i]] ) return parseMix(r.mix[ERA_GROUPS[i]]);
  return null;
}

/** Hours a region's sun runs ahead of another's (behind: negative), to the nearest half hour. */
export function hoursAhead(id, homeId = DEFAULT_REGION) {
  const a = regionOf(id), b = regionOf(homeId) ?? regionOf(DEFAULT_REGION);
  if ( !a ) return 0;
  let d = (a.lon - b.lon) / 15;
  if ( d > 12 ) d -= 24;
  if ( d < -12 ) d += 24;
  return Math.round(d * 2) / 2;
}

/** Does WoDX have names for a region's people in a year? */
export const hasPeopleIn = (id, year) => { const r = regionOf(id); return !!r && (r.from === undefined || !Number.isFinite(Number(year)) || Number(year) >= r.from); };

/** The region a scene stands in: its own (the place flag's region) or the chronicle's homeland. */
export function regionHere(place, homeland = DEFAULT_REGION) {
  return regionOf(place?.region) ?? regionOf(homeland) ?? regionOf(DEFAULT_REGION);
}
