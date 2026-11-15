/**
 * WoDX Storyteller: war beyond Europe, the pure part (B5900 to B5910, the Armies and Ships Desk). No Foundry calls.
 *
 * A battle, siege or sea fight belongs to a land: the region of the scene it starts on (WoDX Chronicle's Where this
 * scene stands), else the homeland, and the Storyteller can pick another on its form (B5900). The land changes
 * what the fight offers: the age of war where it differs from Europe's (B5902), troops (B5903), the supernatural
 * in the ranks (B5904), the realms of the East (B5905), siege engines (B5906), walls (B5907), supply (B5908),
 * ships (B5909) and the navigators of the Pacific and the Indian Ocean (B5910). A land's own things are offered first
 * and everything else stays, under Others, since armies and fleets travel. Every figure here is WoDX's own, set on
 * the scale of the book's (Spoils of War pp. 33, 34, 40 and 44 for engines, walls, ships and units): no book gives
 * troops, engines or ships outside Europe and the Mediterranean.
 */

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Groups of WoDX Chronicle regions (world-rules.mjs WORLD_REGIONS). */
export const LANDS = {
  mesoamerica: ["mexico"], caribbean: ["caribbean"], andes: ["andes"], amazon: ["brazil"],
  northAmerica: ["north-america-east", "north-america-west", "canada"], southernCone: ["southern-cone"],
  japan: ["japan"], china: ["china"], korea: ["korea"], india: ["india"], steppe: ["central-asia", "siberia"],
  sea: ["southeast-asia", "nusantara", "philippines"], tibet: ["tibet-himalaya"],
  islam: ["anatolia", "levant", "egypt", "arabia", "persia", "maghreb"],
  sahel: ["west-africa"], africa: ["east-africa", "southern-africa", "central-africa"], southAfrica: ["southern-africa"],
  aotearoa: ["aotearoa"], pacific: ["pacific-islands"], australia: ["australia"]
};
const L = (...groups) => [...new Set(groups.flatMap(g => LANDS[g] ?? [g]))];
/** Is this thing of this land? A thing with no lands is of every land. */
export const ofLand = (thing, land) => !thing?.lands || (!!land && thing.lands.includes(land));
/** A thing's years allow the year. */
const inYears = (t, year) => (!t.from || year >= t.from) && (!t.to || year <= t.to);

/**
 * How war is fought where a land's ways differ from Europe's (B5902). `base` is the European age whose numbers it
 * borrows (phase, losses, danger to a character); `guns` overrides whether guns can breach walls there.
 */
export const LAND_AGES = [
  {id: "mesoamerica", lands: L("mesoamerica"), from: 1197, to: 1520, base: "feudal", guns: false, label: "Obsidian clubs, cotton armour and the flower wars",
    note: "Armies fight to take captives as much as ground; no horses, no iron, no guns. Cities fall when their temple burns."},
  {id: "caribbean", lands: L("caribbean"), from: 1197, to: 1492, base: "feudal", guns: false, label: "War canoes and island raids",
    note: "Raids by sea between the islands, fought with clubs and bows; the villages have no walls to speak of."},
  {id: "andes", lands: L("andes"), from: 1197, to: 1531, base: "feudal", guns: false, label: "Slings, maces and the Inca roads",
    note: "Armies march fast on the stone roads and are fed from storehouses; hill forts with fitted stone hold the passes."},
  {id: "woodlands", lands: L("northAmerica", "amazon", "southernCone"), from: 1197, to: 1599, base: "feudal", guns: false, label: "War parties, bows and palisaded towns",
    note: "Small parties strike and are gone; a town behind its palisade is starved or burned, rarely stormed."},
  {id: "japan-bow", lands: L("japan"), from: 1197, to: 1542, base: "feudal", guns: false, label: "Mounted archers and the warrior houses",
    note: "Mounted archers of the warrior houses, single challenges, then the great clashes of the warring states."},
  {id: "japan-guns", lands: L("japan"), from: 1543, to: 1615, base: "pike", label: "Ashigaru with matchlocks and the great castles",
    note: "Massed foot with spears and matchlocks decide battles; castles on high stone bases answer them."},
  {id: "japan-peace", lands: L("japan"), from: 1616, to: 1863, base: "musket", label: "The long peace: swords at the hip, guns in store",
    note: "Two centuries without war; a fight is a feud, a riot or a rising, put down by the domain's men."},
  {id: "china-powder", lands: L("china", "korea"), from: 1197, to: 1449, base: "hussite", label: "Crossbows, fire lances and the first guns",
    note: "Huge armies of crossbowmen and cavalry; gunpowder bombs and fire lances at the walls, and the first true guns."},
  {id: "india-elephants", lands: L("india"), from: 1197, to: 1525, base: "feudal", guns: false, label: "War elephants, horse and the fortress hills",
    note: "Heavy horse and elephants decide the field; forts on sheer hills hold out for years."},
  {id: "steppe", lands: L("steppe"), from: 1197, to: 1500, base: "feudal", guns: false, label: "The horse archers of the steppe",
    note: "Horse archers who feign flight and turn; a whole people moves with its herds behind the army."},
  {id: "sahel", lands: L("sahel"), from: 1197, to: 1590, base: "feudal", guns: false, label: "Cavalry empires and walls of mud brick",
    note: "Armoured lancers of the great empires and archers on foot; cities stand behind mud-brick walls."},
  {id: "africa", lands: L("africa"), from: 1197, to: 1815, base: "feudal", guns: false, label: "Spears, shields and stockaded towns",
    note: "Regiments with spear and hide shield, towns behind thorn and timber; guns come only by trade and late."},
  {id: "impi", lands: L("southAfrica"), from: 1816, to: 1879, base: "columns", label: "The impi and the short stabbing spear",
    note: "Regiments in the horns of the buffalo close fast with the stabbing spear; against guns they pay dearly to close."},
  {id: "aotearoa-pa", lands: L("aotearoa"), from: 1197, to: 1806, base: "feudal", guns: false, label: "The taua and the pā",
    note: "War parties against terraced hill forts with ditches and palisades; a pā falls to surprise or hunger."},
  {id: "aotearoa-muskets", lands: L("aotearoa"), from: 1807, to: 1845, base: "musket", label: "The musket wars",
    note: "Iwi that have muskets fall on those that have not, and the pā are rebuilt for gunfire."},
  {id: "pacific", lands: L("pacific"), from: 1197, to: 1820, base: "feudal", guns: false, label: "War canoes and clubs",
    note: "Fleets of canoes carry warriors between islands; the fighting is hand to hand with clubs and spears."},
  {id: "australia", lands: L("australia"), from: 1197, to: 1787, base: "feudal", guns: false, label: "Spear and shield among the nations",
    note: "Fights are small and short, often settled by single combat or ended at the first death."}
];
/** The land's own age for a year, with its base age's numbers, or null (B5902). `ageById` maps the European ages. */
export function landAge(land, year, ageById) {
  const y = n(year) || 1197;
  const a = LAND_AGES.find(x => x.lands.includes(land) && y >= x.from && y <= x.to);
  if ( !a ) return null;
  const base = ageById[a.base] ?? {};
  return {...base, id: a.id, label: a.label, note: a.note, land: true, ...(a.guns === false ? {guns: false} : {})};
}

/** Troops of other lands (B5903), on the scale of the book's units: {troops, maneuver, melee, ranged, defense}. */
export const LAND_UNITS = {
  warElephants: {label: "War elephants", troops: 20, maneuver: 1, melee: 4, ranged: 0, defense: 3, lands: L("india", "sea"), from: 1197, to: 1857},
  samurai: {label: "Samurai on horse", troops: 100, maneuver: 2, melee: 3, ranged: 2, defense: 3, lands: L("japan"), from: 1197, to: 1876},
  ashigaru: {label: "Ashigaru with spears and matchlocks", troops: 500, maneuver: 1, melee: 2, ranged: 2, defense: 2, lands: L("japan"), from: 1543, to: 1867},
  mamluks: {label: "Mamluk horse", troops: 100, maneuver: 2, melee: 3, ranged: 2, defense: 3, lands: L("islam"), from: 1250, to: 1811},
  janissaries: {label: "Janissaries", troops: 500, maneuver: 1, melee: 2, ranged: 2, defense: 2, lands: [...L("islam"), "aegean", "carpathians-balkans"], from: 1380, to: 1826},
  camelRiders: {label: "Camel riders", troops: 100, maneuver: 3, melee: 2, ranged: 1, defense: 2, lands: L("islam", "sahel", "steppe"), from: 1197, to: 1945},
  jaguarWarriors: {label: "Eagle and jaguar warriors", troops: 200, maneuver: 2, melee: 3, ranged: 0, defense: 2, lands: L("mesoamerica"), from: 1197, to: 1521},
  slingers: {label: "Slingers of the Andes", troops: 500, maneuver: 1, melee: 1, ranged: 2, defense: 1, lands: L("andes"), from: 1197, to: 1572},
  sahelLancers: {label: "Lancers of the Sahel", troops: 100, maneuver: 2, melee: 3, ranged: 0, defense: 2, lands: L("sahel"), from: 1197, to: 1900},
  impi: {label: "Impi regiments", troops: 1000, maneuver: 2, melee: 3, ranged: 1, defense: 2, lands: L("southAfrica"), from: 1816, to: 1900},
  taua: {label: "A Māori war party (taua)", troops: 100, maneuver: 2, melee: 3, ranged: 0, defense: 2, lands: L("aotearoa"), from: 1197, to: 1872},
  crossbowRegiments: {label: "Crossbow regiments", troops: 500, maneuver: 1, melee: 1, ranged: 3, defense: 1, lands: L("china", "korea"), from: 1197, to: 1644},
  rocketTroops: {label: "Rocket troops", troops: 100, maneuver: 0, melee: 0, ranged: 4, defense: 1, lands: L("china", "korea", "india"), from: 1300, to: 1850}
};

/** The supernatural in an army's ranks, named by land (B5904); the weight of each step does not change. */
const SUP = {
  east: {1: "A ghoul or a jade-touched servant, a village shaman", 2: "A few Kuei-jin, a shen, a Hengeyokai", 3: "A wu of Kuei-jin, a court of shen", 4: "Many: a court's army of the Cathayans", 5: "A host of them"},
  africa: {1: "A ghoul or two, a healer who knows the spirits", 2: "A few Laibon, a Bastet, a mage", 3: "A Laibon court's retinue, a pride", 4: "Many: a Laibon court at war, the Mokolé", 5: "A host of them"},
  islam: {1: "A ghoul or two, a reader of the stars", 2: "A few of the Ashirra, a mage, an Ajaba", 3: "A brotherhood of the Ashirra, a cabal", 4: "Many: the Ashirra in arms", 5: "A host of them"},
  firstPeoples: {1: "A medicine person, a ghoul", 2: "A few of the land's changing breeds, a spirit", 3: "A pack or a gathering of the land's own", 4: "Many: the land's spirits and shifters rise", 5: "A host of them"}
};
const EAST = L("china", "korea", "japan", "sea", "tibet"), AFRICA = L("sahel", "africa"), ISLAM = L("islam"),
  FIRST = L("mesoamerica", "caribbean", "andes", "amazon", "northAmerica", "southernCone", "aotearoa", "pacific", "australia");
/** The labels for the supernatural in a land's ranks in a year, or null for the usual ones. The first peoples' only before the settlers. */
export function supernaturalFor(land, year = 0) {
  if ( EAST.includes(land) ) return SUP.east;
  if ( AFRICA.includes(land) ) return SUP.africa;
  if ( ISLAM.includes(land) ) return SUP.islam;
  const before = LAND_AGES.find(a => a.lands.includes(land) && a.guns === false);
  if ( FIRST.includes(land) && before && (n(year) || 1197) <= before.to ) return SUP.firstPeoples;
  return null;
}

/** Wars of the dead and of the Umbra in the East (B5905). */
export const EAST_REALMS = {
  underworld: {label: "Legions of the Dark Kingdom of Jade", note: "The dead of the East war in the Dark Kingdom of Jade, against the hungry dead and the hells' armies; those who fall go to the hells or are lost."},
  umbra: {label: "A war in the spirit courts of the East", note: "Hengeyokai and Kuei-jin with the spirits of the land against the Wyrm's and Yomi's servants; spirits that lose discorporate."}
};
export const realmFor = (realm, land, base) => (EAST.includes(land) && EAST_REALMS[realm]) ? {...base, ...EAST_REALMS[realm], land: true} : base;

/** Siege engines of other lands (B5906), in the shape of siege-works-rules.mjs ENGINES. */
export const LAND_ENGINES = {
  fireLance: {label: "Fire lances", damage: 8, diff: 1, contact: true, from: 1197, to: 1400, lands: L("china", "korea"), house: true},
  thunderBomb: {label: "Thunderclap bombs, thrown by trebuchet", damage: 14, diff: 2, from: 1197, to: 1450, lands: L("china", "korea"), house: true},
  rocketCart: {label: "Rocket carts (fire-arrow racks)", damage: 12, diff: 2, from: 1409, to: 1700, lands: L("korea", "china"), house: true},
  warRockets: {label: "Iron-cased war rockets", damage: 12, diff: 3, from: 1760, to: 1800, lands: L("india"), house: true}
};
/** Walls of other lands (B5907), in the shape of WALLS. */
export const LAND_WALLS = {
  rammedEarth: {label: "Rammed-earth city wall faced with brick", soak: 11, health: 32, cover: true, lands: L("china", "korea"), house: true},
  mudBrick: {label: "Mud-brick city wall", soak: 8, health: 18, cover: true, lands: [...L("sahel"), "maghreb", "arabia"], house: true},
  fittedStone: {label: "Fitted stone walls of the Andes", soak: 13, health: 36, cover: true, lands: L("andes"), house: true},
  pa: {label: "Pā: terraces, ditches and palisades", soak: 7, health: 20, cover: true, wood: true, lands: L("aotearoa"), house: true},
  boma: {label: "Thorn and timber stockade", soak: 3, health: 6, wood: true, lands: L("africa"), house: true},
  stoneBase: {label: "Castle on a high stone base", soak: 13, health: 40, cover: true, from: 1576, lands: L("japan"), house: true}
};
/** The wall a siege starts with in a land, by where the garrison stands, over WALL_OF_POSITION (B5907). */
export const LAND_WALL_OF_POSITION = [
  {lands: L("china", "korea"), town: "rammedEarth", to: 1911},
  {lands: [...L("sahel"), "maghreb", "arabia"], town: "mudBrick", to: 1900},
  {lands: L("andes"), town: "fittedStone", castle: "fittedStone", to: 1600},
  {lands: L("aotearoa"), works: "pa", town: "pa", castle: "pa", to: 1872},
  {lands: L("africa"), works: "boma", town: "boma", to: 1900},
  {lands: L("japan"), castle: "stoneBase", from: 1576, to: 1873}
];
export function landWall(land, position, year) {
  const y = n(year) || 1197;
  const r = LAND_WALL_OF_POSITION.find(x => x.lands.includes(land) && inYears(x, y) && x[position]);
  return r ? r[position] : null;
}
/** Supply of other lands (B5908), in the shape of SUPPLY_LINES. */
export const LAND_SUPPLY = {
  camels: {label: "Camel caravans", share: 0.6, lands: [...L("islam", "sahel", "steppe"), "india"]},
  llamas: {label: "Llama trains on the Inca roads", share: 0.5, to: 1600, lands: L("andes")},
  porters: {label: "Porters on foot", share: 0.33, lands: [...L("africa", "sahel", "mesoamerica", "andes", "sea"), "brazil", "pacific-islands", "aotearoa"]}
};

/** Ships of other seas (B5909), in the shape of naval-rules.mjs SHIPS. */
export const LAND_SHIPS = {
  warJunk: {label: "War junk", speed: 4, maneuver: 1, crew: 120, soldiers: 60, arms: [["espringal", 2]], soak: 10, health: 14, from: 1197, to: 1349, lands: L("china", "korea"), house: true},
  gunJunk: {label: "War junk with guns", speed: 4, maneuver: 1, crew: 140, soldiers: 60, arms: [["culverin", 2]], soak: 10, health: 16, from: 1350, to: 1880, lands: L("china", "korea", "sea"), house: true},
  treasureShip: {label: "Treasure ship", speed: 3, maneuver: 0, crew: 500, soldiers: 200, arms: [["culverin", 4]], soak: 12, health: 28, from: 1405, to: 1433, lands: L("china"), house: true},
  turtleShip: {label: "Turtle ship (geobukseon)", speed: 3, oars: 4, maneuver: 2, crew: 125, arms: [["culverin", 3]], soak: 14, health: 14, ram: true, from: 1592, to: 1800, lands: L("korea"), house: true},
  atakebune: {label: "Castle ship (atakebune)", speed: 2, oars: 3, maneuver: 0, crew: 200, soldiers: 100, arms: [["culverin", 2]], soak: 11, health: 18, from: 1570, to: 1640, lands: L("japan"), house: true},
  dhow: {label: "Dhow", speed: 4, maneuver: 2, crew: 30, soldiers: 20, arms: [], soak: 6, health: 8, from: 1197, to: 9999, lands: ["arabia", "persia", "egypt", "india", "east-africa"], house: true},
  lancaran: {label: "Lancaran (a Malay war galley)", speed: 4, oars: 4, maneuver: 2, crew: 100, soldiers: 50, arms: [["espringal", 1]], soak: 7, health: 8, from: 1197, to: 1700, lands: L("sea"), house: true},
  jong: {label: "Jong (a great Javanese ship)", speed: 3, maneuver: 0, crew: 200, soldiers: 100, arms: [], soak: 12, health: 22, from: 1197, to: 1650, lands: L("sea"), house: true},
  doubleCanoe: {label: "Double-hulled war canoe", speed: 4, oars: 3, maneuver: 3, crew: 80, arms: [], soak: 4, health: 6, shallow: true, from: 1197, to: 1900, lands: L("pacific", "aotearoa"), house: true},
  waka: {label: "Waka taua (a Māori war canoe)", speed: 3, oars: 4, maneuver: 2, crew: 80, arms: [], soak: 4, health: 6, shallow: true, from: 1197, to: 1900, lands: L("aotearoa"), house: true},
  lakeCanoe: {label: "War canoe of the lake of Mexico", speed: 2, oars: 3, maneuver: 3, crew: 20, arms: [], soak: 2, health: 3, shallow: true, from: 1197, to: 1521, lands: L("mesoamerica"), house: true},
  piragua: {label: "Piragua (a Caribbean war canoe)", speed: 3, oars: 3, maneuver: 3, crew: 50, arms: [], soak: 3, health: 4, shallow: true, from: 1197, to: 1700, lands: [...L("caribbean"), "brazil"], house: true}
};
/** The seaways whose own navigators count (B5910): the islands' wayfinders 2 easier, the Indian Ocean's pilots as a pilot's book. */
export const WAYFINDERS = L("pacific", "aotearoa");
export const KAMAL_SEAS = ["arabia", "persia", "india", "east-africa", "egypt", ...L("sea")];
export const navAid = (land, {wayfinder = false} = {}) => !wayfinder ? 0 : WAYFINDERS.includes(land) ? 2 : KAMAL_SEAS.includes(land) ? 1 : 0;

/**
 * A list of things (with `lands`) for a land, its own first, then the common ones, then other lands' under Others.
 * Returns [{...thing, own, other}] so a form can group them.
 */
export function forLand(list, land) {
  const own = [], common = [], other = [];
  for ( const t of list ) (t.lands ? (t.lands.includes(land) ? own : other) : common).push(t);
  return [...own.map(t => ({...t, own: true})), ...common, ...other.map(t => ({...t, other: true}))];
}
