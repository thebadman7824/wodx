/**
 * WoDX Creation 0.23.0 (B2673): the People generator's trades by the world's ways of life. WoDX's own data.
 *
 * people.mjs holds one list of trades for each era group, written with Europe in mind. A region that follows another
 * way of life in that era group (WoDX Chronicle sphereFor: the lands of Islam, India, China, the Sahel, Tenochtitlan
 * before 1521 and the rest) gets its own table: the same list with its words swapped (the village priest becomes the
 * village imam, the knight a mamluk), the trades it never had taken out, and trades of its own added. Tables are
 * keyed by the people generator's culture, so every region of a culture shares them. House readings (B2673).
 */
import {WORLD_REGIONS, cultureOf, sphereFor} from "../../wodx-chronicle/scripts/world-rules.mjs";

const tr = (text, weight, a, k) => ({text, weight, a, k});
/** The year that stands for each era group when a region's way of life is read. */
const AT = {medieval: 1350, "early-modern": 1650, industrial: 1870, "mid-century": 1950, modern: 2000, future: 2060};
const MED_EARLY = ["medieval", "early-modern"];

/* Swaps: a base trade's text to the local one (the sheet stays), or null where the land had none. */
const CLERIC = (priest, house) => ({"village priest": priest, "priest": priest, "member of a religious house": house});
const NO_TAVERN = {"innkeeper": "keeper of a caravanserai", "brewer": "sherbet maker", "publican": "coffee house keeper", "bartender": "café owner"};
const SWAP = {
  orthodox: {...CLERIC("priest of the Eastern church", "monk of a monastery"), "knight": "boyar's retainer", "reeve": "village elder"},
  islamic: {...CLERIC("imam", "dervish of a Sufi lodge"), ...NO_TAVERN, "knight": "mamluk", "man-at-arms": "soldier of the emir", "reeve": "village headman",
    "steward": "steward of a great house", "pilgrim": "pilgrim bound for Mecca", "minstrel": "storyteller of the market",
    "university student": "student of a madrasa", "alchemist's assistant": "astrologer's assistant", "toll-keeper": "customs clerk", "cowhand": null, "prospector": null},
  indic: {...CLERIC("temple priest", "holy ascetic"), "knight": "Rajput warrior", "man-at-arms": "foot soldier of the raja", "reeve": "village headman",
    "brewer": "toddy tapper", "pilgrim": "pilgrim to the holy river", "minstrel": "temple musician", "university student": "student of a learned teacher",
    "alchemist's assistant": "astrologer's assistant", "charcoal burner": null, "cowhand": null, "prospector": null},
  sinic: {...CLERIC("temple keeper", "Buddhist monk"), "knight": "officer of the garrison", "man-at-arms": "soldier of the garrison", "reeve": "village headman",
    "steward": "magistrate's clerk", "scribe": "copyist of documents", "brewer": "rice-wine brewer", "pilgrim": "pilgrim to a holy mountain",
    "minstrel": "opera player", "university student": "examination candidate", "alchemist's assistant": "Taoist alchemist's assistant", "cowhand": null, "prospector": null},
  japanese: {...CLERIC("temple priest", "Buddhist monk"), "knight": "samurai retainer", "man-at-arms": "foot soldier", "reeve": "village headman",
    "brewer": "sake brewer", "pilgrim": "pilgrim to the shrines", "minstrel": "biwa player", "university student": "student of a domain school",
    "alchemist's assistant": "diviner's assistant", "cowhand": null, "prospector": null},
  theravada: {...CLERIC("monk", "novice monk"), "knight": "war elephant rider", "man-at-arms": "soldier of the king", "reeve": "village headman",
    "brewer": "palm-wine maker", "pilgrim": "pilgrim to the stupa", "minstrel": "court dancer", "university student": "temple school pupil", "cowhand": null, "prospector": null},
  tibetan: {...CLERIC("lama", "monk"), "knight": "noble's horseman", "man-at-arms": "soldier of the fort", "reeve": "village headman",
    "brewer": "barley-beer brewer", "pilgrim": "pilgrim on the circuit", "minstrel": "wandering bard", "university student": "student monk", "fisher": null, "cowhand": null, "prospector": null},
  malay: {"village priest": "temple attendant", "priest": "imam", "member of a religious house": "teacher of a pondok school", "knight": "noble's war leader",
    "man-at-arms": "soldier of the raja", "reeve": "village headman", "brewer": "palm-wine maker", "pilgrim": "pilgrim bound for Mecca", "minstrel": "gamelan player",
    "university student": "student of a pondok school", "charcoal burner": null, "cowhand": null, "prospector": null},
  sahel: {...CLERIC("imam", "scholar of the mosque"), "knight": "cavalry warrior", "man-at-arms": "soldier of the king", "reeve": "village chief",
    "brewer": "millet-beer brewer", "pilgrim": "pilgrim bound for Mecca", "minstrel": "griot", "scribe": "scholar's copyist", "university student": "student of a Qur'an school",
    "charcoal burner": null, "toll-keeper": "tax collector of the market", "cowhand": null, "prospector": null},
  swahili: {...CLERIC("imam", "teacher of the mosque"), ...NO_TAVERN, "knight": "captain of the town guard", "reeve": "elder of the ward",
    "pilgrim": "pilgrim bound for Mecca", "minstrel": "poet of the coast", "charcoal burner": null, "cowhand": null, "prospector": null},
  bantu: {"village priest": "diviner", "priest": "diviner", "member of a religious house": "rainmaker", "knight": "war leader", "man-at-arms": "warrior of the chief",
    "reeve": "headman", "steward": "counsellor of the king", "scribe": null, "brewer": "sorghum-beer brewer", "innkeeper": null, "pilgrim": null,
    "minstrel": "praise singer", "toll-keeper": null, "charcoal burner": "iron smelter", "cowhand": null, "prospector": null},
  mesoamerican: {"village priest": "temple priest", "priest": "temple priest", "member of a religious house": "temple novice", "knight": "eagle warrior",
    "man-at-arms": "warrior of the city", "reeve": "ward elder", "steward": "tribute collector", "merchant": "long-distance trader", "innkeeper": null,
    "brewer": "pulque maker", "pilgrim": null, "minstrel": "temple musician", "scribe": "painter of books", "tanner": null, "miller": "maize grinder",
    "toll-keeper": null, "carter": "porter", "smith": "obsidian knapper", "charcoal burner": null, "shepherd": null},
  andean: {"village priest": "priest of the huacas", "priest": "priest of the huacas", "member of a religious house": "weaver of the temple cloth",
    "knight": "captain of the Inca", "man-at-arms": "warrior of the Inca", "reeve": "village headman", "steward": "keeper of the knotted cords",
    "merchant": "trader of the valleys", "innkeeper": "keeper of a road house", "brewer": "chicha brewer", "pilgrim": null, "minstrel": "flute player",
    "scribe": "keeper of the knotted cords", "tanner": null, "miller": null, "toll-keeper": "road runner", "carter": "llama driver", "smith": "metal worker",
    "charcoal burner": null},
  polynesian: {"village priest": "priest", "priest": "priest", "member of a religious house": "keeper of the sacred lore", "knight": "chief's warrior",
    "man-at-arms": "warrior", "reeve": "headman", "steward": "chief's attendant", "merchant": null, "innkeeper": null, "brewer": "kava maker", "pilgrim": null,
    "minstrel": "chanter", "scribe": null, "tanner": null, "miller": null, "toll-keeper": null, "carter": null, "smith": "carver", "charcoal burner": null,
    "woodcutter": "canoe builder", "shepherd": null, "huntsman": "bird catcher", "ferryman": "navigator", "weaver": "weaver of mats", "beggar": null},
  northern: {"village priest": "shaman", "priest": "shaman", "member of a religious house": "keeper of the old stories", "knight": null, "man-at-arms": "hunter of the band",
    "reeve": "elder", "steward": null, "merchant": "trader in furs", "innkeeper": null, "brewer": null, "pilgrim": null, "minstrel": "drum singer", "scribe": null,
    "tanner": "skin dresser", "miller": null, "toll-keeper": null, "carter": "dog driver", "smith": null, "charcoal burner": null, "woodcutter": null,
    "shepherd": "reindeer herder", "weaver": "sewer of skins", "ferryman": "kayak maker", "beggar": null, "servant in the lord's house": null, "cook": null}
};

/* Trades of their own, by era group (the medieval ones stand for early modern too unless that group gives its own). */
const T = (k, list) => ({[k]: list});
const own = {
  islamic: {medieval: [
    tr("water carrier", 2, "pms", {athletics: 2, streetwise: 1, alertness: 1}),
    tr("camel driver", 2, "pms", {animalken: 3, survival: 2, athletics: 1, "+ride": 1}),
    tr("bath attendant", 1, "spm", {empathy: 1, alertness: 1, streetwise: 1, medicine: 1}),
    tr("scholar of the law", 1, "msp", {law: 3, academics: 2, linguistics: 1, "+theology": 2}),
    tr("calligrapher", 1, "msp", {craft: 3, academics: 1, expression: 1})],
    industrial: [tr("coffee house keeper", 1, "smp", {empathy: 2, streetwise: 2, finance: 1})]},
  indic: {medieval: [
    tr("weaver of cotton", 3, "pms", {craft: 3, "+commerce": 1}), tr("elephant keeper", 1, "pms", {animalken: 3, athletics: 1, "+ride": 1}),
    tr("spice trader", 1, "smp", {persuasion: 2, linguistics: 1, "+commerce": 3}), tr("palanquin bearer", 1, "pms", {athletics: 3, alertness: 1})],
    industrial: [tr("rickshaw puller", 2, "pms", {athletics: 3, streetwise: 2}), tr("clerk of the railway", 1, "msp", {bureaucracy: 2, technology: 1, academics: 1})]},
  sinic: {medieval: [
    tr("silk weaver", 2, "pms", {craft: 3, "+commerce": 1}), tr("tea merchant", 1, "smp", {persuasion: 2, etiquette: 1, "+commerce": 3}),
    tr("porcelain maker", 1, "pms", {craft: 3, academics: 1}), tr("physician of herbs", 1, "msp", {medicine: 3, occult: 1, academics: 1}),
    tr("boatman of the canals", 2, "pms", {athletics: 2, survival: 1, streetwise: 1})],
    industrial: [tr("rickshaw puller", 2, "pms", {athletics: 3, streetwise: 2}), tr("comprador", 1, "smp", {finance: 2, linguistics: 2, persuasion: 1})]},
  japanese: {medieval: [
    tr("rice farmer", 4, "pms", {athletics: 1, craft: 1, survival: 1, animalken: 1}), tr("swordsmith", 1, "pms", {craft: 4, melee: 1}),
    tr("tea house keeper", 1, "smp", {etiquette: 2, empathy: 2, "+commerce": 1}), tr("fisher of the coast", 2, "pms", {survival: 2, athletics: 2, craft: 1})],
    industrial: [tr("rickshaw puller", 2, "pms", {athletics: 3, streetwise: 2}), tr("silk mill hand", 3, "pms", {craft: 2, athletics: 1})]},
  theravada: {medieval: [tr("rice farmer", 4, "pms", {athletics: 1, craft: 1, survival: 1, animalken: 1}),
    tr("elephant keeper", 1, "pms", {animalken: 3, athletics: 1, "+ride": 1}), tr("boatman of the river", 2, "pms", {athletics: 2, survival: 1, streetwise: 1})]},
  tibetan: {medieval: [tr("yak herder", 3, "pms", {animalken: 3, survival: 2, athletics: 1}), tr("salt trader", 1, "smp", {survival: 2, persuasion: 1, "+commerce": 2}),
    tr("thangka painter", 1, "msp", {craft: 3, academics: 1, "+theology": 1})]},
  malay: {medieval: [tr("spice trader", 2, "smp", {persuasion: 2, linguistics: 1, "+commerce": 3}), tr("sailor of the trade ships", 2, "pms", {athletics: 2, survival: 1, craft: 1}),
    tr("rice farmer", 3, "pms", {athletics: 1, craft: 1, survival: 1}), tr("kris smith", 1, "pms", {craft: 3, occult: 1, melee: 1})]},
  sahel: {medieval: [tr("salt trader", 2, "smp", {survival: 2, persuasion: 1, "+commerce": 3}), tr("gold washer", 1, "pms", {athletics: 2, craft: 1, survival: 1}),
    tr("herder of the Fulani", 2, "pms", {animalken: 3, survival: 2, athletics: 1}), tr("caravan guide", 1, "pms", {survival: 3, linguistics: 1, "+ride": 1})]},
  swahili: {medieval: [tr("dhow sailor", 3, "pms", {athletics: 2, survival: 1, craft: 1}), tr("ivory and gold trader", 1, "smp", {persuasion: 2, linguistics: 2, "+commerce": 3}),
    tr("coral-stone mason", 1, "pms", {craft: 3, athletics: 1})]},
  bantu: {medieval: [tr("cattle herder", 4, "pms", {animalken: 3, survival: 2, melee: 1}), tr("iron smith", 1, "pms", {craft: 3, occult: 1}),
    tr("herbalist", 1, "msp", {medicine: 3, occult: 1, survival: 1})]},
  mesoamerican: {medieval: [tr("farmer of the chinampas", 4, "pms", {craft: 1, survival: 1, athletics: 1}), tr("feather worker", 1, "pms", {craft: 3, "+commerce": 1}),
    tr("ball player", 1, "psm", {athletics: 3, brawl: 1, performance: 1})]},
  andean: {medieval: [tr("terrace farmer", 4, "pms", {craft: 1, survival: 2, athletics: 1}), tr("llama herder", 2, "pms", {animalken: 3, survival: 2}),
    tr("weaver of fine cloth", 1, "pms", {craft: 3})]},
  polynesian: {medieval: [tr("taro farmer", 4, "pms", {survival: 2, craft: 1, athletics: 1}), tr("tattoo artist", 1, "msp", {craft: 3, occult: 1})]},
  northern: {medieval: [tr("seal hunter", 4, "pms", {survival: 3, athletics: 2, stealth: 1, melee: 1}), tr("fisher of the ice", 2, "pms", {survival: 2, athletics: 2, craft: 1})]}
};
/* From the industrial age on, the modern trades serve the world over; only clergy and a few words change. */
const LATE = ["industrial", "mid-century", "modern", "future"];
const LATE_SWAP = {
  orthodox: {"priest": "priest of the Eastern church"}, islamic: {"priest": "imam", "publican": "coffee house keeper", "bartender": "café owner", "cowhand": null, "prospector": null, "gambler": null},
  indic: {"priest": "temple priest", "cowhand": null, "prospector": null}, sinic: {"priest": "temple keeper", "cowhand": null, "prospector": null},
  japanese: {"priest": "temple priest", "cowhand": null, "prospector": null}, theravada: {"priest": "monk", "cowhand": null, "prospector": null},
  tibetan: {"priest": "lama", "cowhand": null, "prospector": null}, malay: {"priest": "imam", "cowhand": null, "prospector": null},
  sahel: {"priest": "imam", "cowhand": null, "prospector": null}, swahili: {"priest": "imam", "publican": "coffee house keeper", "cowhand": null, "prospector": null},
  bantu: {"priest": "pastor", "cowhand": null, "prospector": null}, mesoamerican: {}, andean: {}, polynesian: {"cowhand": null, "prospector": null}, northern: {}
};

/** One era group's trades for a way of life: the base list with the swaps, less what the land never had, plus its own. */
export function tradesFor(base, sphere, group) {
  const late = LATE.includes(group);
  const swap = late ? LATE_SWAP[sphere] ?? {} : SWAP[sphere] ?? {};
  const out = [];
  for ( const x of base ) {
    if ( !Object.hasOwn(swap, x.text) ) { out.push(x); continue; }
    if ( swap[x.text] !== null ) out.push({...x, text: swap[x.text]});
  }
  const mine = own[sphere] ?? {};
  const extra = mine[group] ?? (MED_EARLY.includes(group) ? mine.medieval : []) ?? [];
  const seen = new Set(out.map(x => x.text));
  for ( const x of extra ) if ( !seen.has(x.text) ) { out.push(x); seen.add(x.text); }
  return out;
}

/**
 * The trade tables for every culture that follows another way of life in an era group. TRADES: people.mjs's lists;
 * t: its table maker. Where regions of one culture follow different ways, the first listed region's stands.
 */
export function worldTradeTables(TRADES, t) {
  const out = [];
  for ( const group of Object.keys(AT) ) {
    // The American West's cowhands, prospectors and gamblers stay in the Americas' own table (people.mjs AM_ONLY)
    const base = (TRADES[group] ?? []).filter(x => !["cowhand", "prospector", "gambler"].includes(x.text));
    if ( !base.length ) continue;
    const done = new Set();
    for ( const id of Object.keys(WORLD_REGIONS) ) {
      const culture = cultureOf(id), sphere = sphereFor(id, AT[group]);
      if ( done.has(culture) ) continue;
      done.add(culture);
      if ( sphere === "latin" || !SWAP[sphere] ) continue;
      out.push(t("people.trade", `People: trades (${group}, ${WORLD_REGIONS[id].label.replace(/ \(.*$/, "")})`, tradesFor(base, sphere, group), {era: [group], culture: [culture]}));
    }
  }
  return out;
}
export const WORLD_TRADE_LISTS = {SWAP, own, LATE_SWAP};
