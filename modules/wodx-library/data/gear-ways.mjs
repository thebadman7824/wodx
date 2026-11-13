/**
 * WoDX Library 0.21.0: gear by region (the global rule, Ben 2026-11-12; B3070 to B3073).
 *
 * Gear by era came from the books of Europe and North America, so a Dark Ages draw in Tenochtitlan could turn up a
 * crossbow and plate, and one in Kyoto never a katana. Here each piece of gear can say where it is at home, in the
 * same words as the everyday goods (data/goods-ways.mjs): a key is a region id of WoDX Chronicle, a way of life
 * (sphereFor: latin, orthodox, islamic, indic, sinic, japanese, theravada, tibetan, malay, sahel, swahili, bantu,
 * mesoamerican, andean, polynesian, northern), or "*" for everywhere else. The region's own key wins over its way of
 * life, which wins over "*".
 *   null          found there in the gear's own era
 *   a year        from that year
 *   [from, to]    only between those years
 *   false         never found there
 * Gear with no rule is found everywhere in its era. Gear with a rule but no "*" key is found only where it names.
 *
 * LOCAL_GEAR adds the weapons of other lands under their own names. None of the books WoDX reads gives them figures,
 * so each one fights as a book weapon of its kind and keeps that weapon's page (a house rule, B3071).
 *
 * A house reading of history, rounded for play; the books give no such lists.
 */

/* The Americas, the Pacific and the far north before the settlers: no iron, no horse, no gunpowder. */
const NEW_WORLD_NO = {mesoamerican: false, andean: false, polynesian: false, northern: false};
const OLD_WORLD = {"*": null, ...NEW_WORLD_NO};
/* The swords and armour of Christendom, later carried wherever its people settled (they take its way of life). */
const CHRISTENDOM = {latin: null, orthodox: null, "*": false};
const PLATE = {latin: null, orthodox: null, "carpathians-balkans": null, "*": false};
const MAIL = {...OLD_WORLD, bantu: false, polynesian: false};
/* Gunpowder arms, by the year each land took them up. */
const GUNS = {latin: null, orthodox: null, islamic: null, sinic: null, japanese: 1543, indic: 1526, theravada: 1511, malay: 1511, tibetan: 1640,
  sahel: 1590, swahili: 1500, bantu: 1600, ...NEW_WORLD_NO, "*": null};
const WHEELLOCK = {latin: null, orthodox: null, islamic: 1550, "*": false};
const CURVED = {islamic: null, sahel: null, swahili: null, indic: null, "central-asia": null, "east-africa": null, "carpathians-balkans": 1400, "*": false};

/** Rules for the books' own gear, by name (every source with that name). */
export const GEAR_WAYS = {
  // Steel blades and pole arms of Europe
  "Bastard Sword": CHRISTENDOM, Greatsword: CHRISTENDOM, Rapier: CHRISTENDOM, "Main-Gauche": CHRISTENDOM,
  Falchion: CHRISTENDOM, Halberd: CHRISTENDOM, Glaive: CHRISTENDOM, Pike: OLD_WORLD,
  Broadsword: OLD_WORLD, Saber: OLD_WORLD, "Short Sword": OLD_WORLD, Lance: OLD_WORLD,
  "Battle-Ax": OLD_WORLD, "Great Ax": OLD_WORLD, "Morning Star": OLD_WORLD, Morningstar: OLD_WORLD,
  Warhammer: OLD_WORLD, "War Hammer": OLD_WORLD, Flail: OLD_WORLD, "Flail, Spiked": OLD_WORLD,
  "Pick Ax": OLD_WORLD, Mattock: OLD_WORLD, Pitchfork: OLD_WORLD, "Field Fork": OLD_WORLD, "Smith's Hammer": OLD_WORLD,
  Tankard: OLD_WORLD, Candlestick: OLD_WORLD, "Cat-o'-nine-tails": OLD_WORLD, Whip: OLD_WORLD,
  "Parry with Sword": OLD_WORLD,
  // The swords of other lands the Sorcerers Crusade names
  Katana: {japanese: null, "*": false}, Kris: {malay: null, "*": false}, Katar: {indic: null, "*": false},
  "Tiger Claws": {indic: null, "*": false}, Scimitar: CURVED,
  // Bows and crossbows
  Longbow: {...OLD_WORLD}, "Compound Bow": {sinic: null, islamic: null, "central-asia": null, indic: null, tibetan: null, japanese: null, orthodox: null, "*": false},
  Crossbow: OLD_WORLD, "Heavy Crossbow": OLD_WORLD, "Crossbow, Hand": CHRISTENDOM, "Crossbow, Lt.": OLD_WORLD, "Crossbow, Hvy.": OLD_WORLD,
  // Gunpowder of the Sorcerers Crusade
  Arquebus: GUNS, Hackbutt: GUNS, "Hand Cannon": GUNS, "Matchlock Musket": GUNS, "Matchlock Pistol": GUNS,
  "Wheellock Musket": WHEELLOCK, "Wheellock Pistol": WHEELLOCK, "Grenade, thrown": GUNS,
  // Armor: hide and quilting everywhere, metal in the Old World, plate in Christendom
  "Class Three": MAIL, "Class Four": PLATE, "Class Five": PLATE,
  Mail: MAIL, "\"Crow's Mail\"": MAIL, "Full Plate": PLATE, "\"Bastard Plate\"": PLATE, "Tournament Armor": {latin: null, "*": false},
  "Titan's Armor": PLATE, "War Shield": OLD_WORLD, Buckler: OLD_WORLD
};

/**
 * The weapons of other lands: [name, where, {source: the book weapon it fights as}, what it is]. A source left out
 * has no such piece (the Sorcerers Crusade names its own katana, kris, katar and scimitar).
 */
export const LOCAL_GEAR = [
  // Japan
  ["Tachi", {japanese: null, "*": false}, {"v20-dark-ages": "Broadsword"}, "the long curved sword of a mounted warrior, before the katana"],
  ["Katana", {japanese: null, "*": false}, {"v20-dark-ages": "Broadsword", "v20-core": "Sword"}, "the curved sword of the warrior class"],
  ["Naginata", {japanese: null, "*": false}, {"v20-dark-ages": "Halberd", "sorcerers-crusade": "Glaive"}, "a curved blade on a long shaft"],
  ["Yari", {japanese: null, "*": false}, {"v20-dark-ages": "Spear", "sorcerers-crusade": "Spear"}, "a straight-bladed spear"],
  ["Yumi", {japanese: null, "*": false}, {"v20-dark-ages": "Longbow", "sorcerers-crusade": "Longbow"}, "a tall bow drawn from below its middle"],
  // China and Korea
  ["Jian", {sinic: null, "*": false}, {"v20-dark-ages": "Broadsword", "sorcerers-crusade": "Broadsword", "v20-core": "Sword"}, "a straight two-edged sword"],
  ["Dao", {sinic: null, "*": false}, {"v20-dark-ages": "Saber", "sorcerers-crusade": "Falchion"}, "a single-edged curved sword"],
  ["Qiang", {sinic: null, "*": false}, {"v20-dark-ages": "Spear", "sorcerers-crusade": "Spear"}, "a light spear with a tassel below the head"],
  ["Repeating crossbow", {sinic: null, "*": false}, {"v20-dark-ages": "Crossbow", "sorcerers-crusade": "Crossbow, Lt."}, "a crossbow fed from a box of bolts on top"],
  // India and the Himalaya
  ["Talwar", {indic: null, "*": false}, {"v20-dark-ages": "Saber", "sorcerers-crusade": "Scimitar"}, "a curved sword with a disc pommel"],
  ["Katar", {indic: null, "*": false}, {"v20-dark-ages": "Dagger"}, "a punch dagger gripped across the blade"],
  ["Khukuri", {"tibet-himalaya": null, indic: null, "*": false}, {"v20-dark-ages": "Hatchet", "sorcerers-crusade": "Hand Ax", "v20-core": "Knife"}, "a heavy forward-curved knife of the hills"],
  // The lands of Islam and Central Asia
  ["Scimitar", CURVED, {"v20-dark-ages": "Saber"}, "a curved sword for the cut from the saddle"],
  ["Shamshir", {persia: null, "central-asia": null, india: 1500, "*": false}, {"v20-dark-ages": "Saber", "sorcerers-crusade": "Scimitar"}, "a slender sword with a deep curve"],
  ["Kilij", {anatolia: null, levant: null, egypt: null, "carpathians-balkans": 1400, "*": false}, {"v20-dark-ages": "Saber", "sorcerers-crusade": "Scimitar"}, "a curved sword that widens near the point"],
  // Africa
  ["Takouba", {sahel: null, maghreb: null, "*": false}, {"v20-dark-ages": "Broadsword", "sorcerers-crusade": "Broadsword"}, "a straight sword of the desert peoples"],
  ["Shotel", {"east-africa": null, "*": false}, {"v20-dark-ages": "Saber", "sorcerers-crusade": "Scimitar"}, "a sickle-curved sword that reaches round a shield"],
  ["Assegai", {bantu: null, swahili: null, "*": false}, {"v20-dark-ages": "Spear", "sorcerers-crusade": "Spear", "v20-core": "Knife"}, "a short stabbing spear with a long blade"],
  ["Throwing iron", {"central-africa": null, "west-africa": null, "*": false}, {"v20-dark-ages": "Hatchet, thrown", "sorcerers-crusade": "Ax, thrown"}, "a many-bladed iron thrown spinning"],
  // Southeast Asia and the Malay world
  ["Kris", {malay: null, "*": false}, {"v20-dark-ages": "Dagger"}, "a dagger with a wavy blade"],
  ["Dha", {theravada: null, "*": false}, {"v20-dark-ages": "Saber", "sorcerers-crusade": "Falchion"}, "a long single-edged sword with a long grip"],
  // Mesoamerica before the Spanish
  ["Macuahuitl", {mesoamerican: null, "*": false}, {"v20-dark-ages": "Broadsword", "sorcerers-crusade": "Broadsword"}, "a wooden sword edged with obsidian blades"],
  ["Tepoztopilli", {mesoamerican: null, "*": false}, {"v20-dark-ages": "Spear", "sorcerers-crusade": "Spear"}, "a broad wooden spear edged with obsidian"],
  ["Atlatl dart", {mesoamerican: null, andean: null, "*": false}, {"v20-dark-ages": "Javelin, thrown", "sorcerers-crusade": "Spear, thrown"}, "a dart cast with a spear-thrower"],
  ["Ichcahuipilli", {mesoamerican: null, "*": false}, {"v20-dark-ages": "Class Two", "sorcerers-crusade": "Light Armor"}, "quilted cotton armor soaked in brine"],
  // The Andes before the Spanish
  ["Champi", {andean: null, "*": false}, {"v20-dark-ages": "Mace", "sorcerers-crusade": "Mace"}, "a star-headed bronze mace"],
  ["Huaraca", {andean: null, "*": false}, {"v20-dark-ages": "Sling"}, "a braided wool sling"],
  // Polynesia and Aotearoa
  ["Patu", {polynesian: null, aotearoa: null, "*": false}, {"v20-dark-ages": "Club", "sorcerers-crusade": "Club"}, "a short flat club of stone, bone or wood"],
  ["Taiaha", {polynesian: null, aotearoa: null, "*": false}, {"v20-dark-ages": "Quarterstaff", "sorcerers-crusade": "Quarterstaff"}, "a long fighting staff with a carved head"],
  ["Shark-tooth club", {polynesian: null, "*": false}, {"v20-dark-ages": "Club", "sorcerers-crusade": "Great Spiked Club"}, "a club edged with rows of shark teeth"],
  // The far north and the first nations
  ["War club", {northern: null, "north-america-east": null, "north-america-west": null, canada: null, "*": false}, {"v20-dark-ages": "Mace", "sorcerers-crusade": "Mace"}, "a club with a heavy ball or stone head"],
  ["Stone tomahawk", {northern: null, "north-america-east": null, "north-america-west": null, canada: null, "*": false}, {"v20-dark-ages": "Hatchet", "sorcerers-crusade": "Hand Ax"}, "a stone axe head bound to a haft"],
  ["Harpoon", {northern: null, arctic: null, siberia: null, "*": false}, {"v20-dark-ages": "Spear", "sorcerers-crusade": "Spear"}, "a barbed spear on a line, for seal and whale"]
];

