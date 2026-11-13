/**
 * WoDX Library 0.19.0: everyday goods by way of life and region (the global rule, Ben 2026-11-12; B2680).
 *
 * The goods list began with Europe in mind, so a draw in Cairo or Kyoto could turn up a rosary, a groat or a crock of
 * salted pork. Here each good can say where it is at home. WoDX Chronicle gives every region a way of life in each
 * year (sphereFor: latin, orthodox, islamic, indic, sinic, japanese, theravada, tibetan, malay, sahel, swahili, bantu,
 * mesoamerican, andean, polynesian, northern), and a region id (WoDX Chronicle's world regions) can be named too.
 *
 * WAYS[name] = {key: rule}. A key is a region id, a way of life, or "*" for everywhere else. The region's own key
 * wins over its way of life, which wins over "*". A good with no entry is at home everywhere, from its first year.
 *   null          from the good's own first year
 *   a year        from that year (earlier than the row's year where a land had it first: tea in China)
 *   [from, to]    only between those years
 *   false         never found there
 * A good with an entry but no "*" key is found only in the places it names.
 *
 * A house reading of history, rounded for play; the books give no such lists. The Storyteller still sees every draw
 * before anything goes in a container.
 */

const END = 2099;

/* Groups used below. */
const XN = {latin: null, orthodox: null, "east-africa": null};
const WEST_DRESS = {latin: null, orthodox: null, "*": 1900};
const JEW = {latin: null, orthodox: null, islamic: null, india: 1000, "*": 1900};
const MUSLIM = {islamic: null, sahel: 1050, swahili: 1000, malay: 1400, india: 1200, "central-asia": null, iberia: [700, 1500], "carpathians-balkans": 1400, china: 1300, "*": 1950};
const BUDDHIST = {tibetan: null, theravada: null, sinic: null, japanese: null, india: [-500, 1250], malay: [-9999, 1500], "central-asia": [-200, 900], "*": 1960};
const HINDU = {indic: null, malay: [-9999, 1500], "southeast-asia": [-9999, 1400], "*": 1960};
const NO_PORK = {"*": null, islamic: false, sahel: false, swahili: false, malay: [-9999, 1450], mesoamerican: false, andean: false, northern: false};
/* The Americas, the Pacific and the far north before the settlers had no coin, sheep or cattle from the Old World. */
const OLD_WORLD = {"*": null, mesoamerican: false, andean: false, polynesian: false, northern: false};
const EURO_DRINK = {"*": null, islamic: false, sahel: false, swahili: false, mesoamerican: false, andean: false, polynesian: false, northern: false,
  bantu: 1900, sinic: 1870, japanese: 1870, indic: 1800, theravada: 1880, malay: 1880, tibetan: 1950};
const BRITISH = {"british-isles": null, canada: null, australia: null, aotearoa: null};
const US = {"north-america-east": null, "north-america-west": null};
const COWBOY = {"north-america-west": null, "north-america-east": null, mexico: null, "southern-cone": null, australia: null, "*": 1950};
const COFFEE = {"*": null, islamic: 1450, arabia: 1400, "east-africa": 1100, swahili: 1500, sahel: 1700};

export const WAYS = {
  // Things of faith
  "a small hammer amulet": {scandinavia: null, "british-isles": null},
  "a corn dolly from the last sheaf": {latin: null},
  "a sprig of mistletoe tied with red wool": {latin: null},
  "a wooden cross on a cord": {...XN, "central-africa": 1491, nusantara: 1570, "*": 1850},
  "a rosary": {latin: null, orthodox: false, nusantara: 1570, india: 1510, japan: [1550, 1640]},
  "a pilgrim's badge of lead": {latin: null},
  "a vial of holy water": XN,
  "a scapular": {latin: null, nusantara: 1600},
  "a saint's medal": {latin: null, nusantara: 1600},
  "a reliquary holding a bone": XN,
  "a painted icon on wood": {orthodox: null, "east-africa": null, italy: null},
  "a consecrated host": {latin: null, nusantara: 1570},
  "a brass censer": {...XN, "*": false},
  "an embroidered altar cloth": XN,
  "a monk's habit": XN,
  "a votive candle": XN,
  "a family Bible with names inside the cover": {latin: null, orthodox: null, "*": 1850},
  "a hymnal": {latin: null, "*": 1850},
  "a pocket New Testament": {latin: null, orthodox: null, "*": 1850},
  "a holy picture printed on card": {latin: null, orthodox: null, "*": 1900},
  "a tract pressed into someone's hand": {latin: null, orthodox: null, "*": 1850},
  "a mezuzah case": JEW, "a set of tefillin": JEW, "a prayer shawl": JEW, "a brass menorah": JEW, "a Seder plate": JEW,
  "a handwritten Quran": MUSLIM, "a printed Quran": MUSLIM, "a prayer rug": MUSLIM, "a string of misbaha beads": MUSLIM,
  "a Buddhist mala of wooden beads": BUDDHIST, "a small brass Buddha": BUDDHIST,
  "a brass image of Ganesha": HINDU,
  "an incense stick": {indic: null, sinic: null, japanese: null, theravada: null, tibetan: null, malay: null, "*": 1960},
  "a sheet of printed paper money": {sinic: null, "southeast-asia": null, malay: 1600},

  // Clothes
  "a kippah": JEW, "a tallit gadol": JEW, "a tallit katan": JEW, "a kittel": JEW,
  "a hijab": MUSLIM, "a niqab": MUSLIM, "an abaya": MUSLIM, "a thawb": MUSLIM,
  "a keffiyeh": {islamic: null},
  "a turban": {islamic: null, indic: null, sahel: null, swahili: null},
  "an antarvasa": BUDDHIST, "an uttarasanga": BUDDHIST, "a samghati": BUDDHIST, "a kasaya": BUDDHIST,
  "a pair of geta": {japanese: null}, "a pair of tabi": {japanese: null}, "a pair of gi tabi": {japanese: null},
  "a pair of jika-tabi": {japanese: null}, "an eboshi": {japanese: null}, "a hakama": {japanese: null},
  "a kariginu": {japanese: null}, "a kimono": {japanese: null}, "a yukata": {japanese: null}, "a haori": {japanese: null},
  "a zubon": {japanese: 1870}, "a keikogi": {japanese: null},
  "a straw cape": {japanese: null, sinic: null},
  "a cheongsam": {china: 1920, nusantara: 1930},
  "a sombrero": {mexico: null, "north-america-west": 1800},
  "a kilt": {"british-isles": null},
  "a grass skirt": {polynesian: null, "pacific-islands": null},
  "a wimple": {latin: null, orthodox: null},
  "a cassock": {...XN, "*": 1850},
  "a pair of moccasins": {northern: null, canada: null, "north-america-east": null, "north-america-west": null, "*": 1950},
  "a wool poncho": {andean: null, andes: null, "southern-cone": null, mexico: null, "*": 1960},
  "a hood with a long tail": WEST_DRESS, "a pair of woollen hose": WEST_DRESS, "a leather jerkin": WEST_DRESS,
  "a silk surcoat": WEST_DRESS, "a velvet doublet": WEST_DRESS, "a lace collar": WEST_DRESS, "a starched ruff": WEST_DRESS,
  "a whalebone corset": WEST_DRESS, "a silk cravat": WEST_DRESS, "a tricorne hat": WEST_DRESS, "a top hat": {latin: null, orthodox: null, "*": 1870},
  "a frock coat": {latin: null, orthodox: null, "*": 1870}, "a crinoline frame": WEST_DRESS,
  "a waistcoat with brass buttons": WEST_DRESS, "a bowler hat": {latin: null, orthodox: null, andes: 1920, "*": 1880},
  "a flat cap": WEST_DRESS,
  "a wide-brimmed cowboy hat": COWBOY, "a pair of cowboy boots": COWBOY,

  // Food and drink
  "a crock of salted pork": NO_PORK, "a smoked ham": NO_PORK, "a blood sausage": NO_PORK, "bacon": NO_PORK,
  "a bowl of sausage gravy": NO_PORK, "a crock of lard": NO_PORK,
  "a jug of ale": EURO_DRINK, "a cask of small beer": EURO_DRINK, "a jug of cider": EURO_DRINK, "a jug of mead": EURO_DRINK,
  "a bottle of claret": EURO_DRINK, "a bottle of port": EURO_DRINK, "a bottle of champagne": EURO_DRINK,
  "a flask of brandy": EURO_DRINK, "a bottle of vodka": EURO_DRINK, "a bottle of gin": EURO_DRINK, "a bottle of whiskey": EURO_DRINK,
  "a bottle of absinthe": EURO_DRINK, "a bottle of riesling": EURO_DRINK, "a bottle of chardonnay": EURO_DRINK,
  "a bottle of pinot noir": EURO_DRINK, "a bottle of marsala": EURO_DRINK, "a bottle of vermouth": EURO_DRINK,
  "a bottle of european pilsner": EURO_DRINK, "a bottle of stout": EURO_DRINK, "a bottle of imperial stout": EURO_DRINK,
  "a bottle of sherry": EURO_DRINK, "a bottle of grog": EURO_DRINK, "a skin of wine": {...EURO_DRINK, islamic: [-9999, 700]},
  "a bottle of kvass": {orthodox: null, "poland-baltic": null}, "a bottle of kompot": {orthodox: null, "poland-baltic": null, moravia: null, "carpathians-balkans": null},
  "a bottle of ayran": {anatolia: null, persia: null, "central-asia": null, "carpathians-balkans": 1400},
  "a bottle of horchata": {iberia: null, mexico: null},
  "a bottle of tequila": {mexico: null, "*": 1950},
  "a bottle of sake": {japanese: null, "*": 1950}, "a bottle of nigori sake": {japanese: null},
  "a flask of rice wine": {sinic: null, japanese: null, theravada: null, malay: null, tibetan: null},
  "a packet of tea": {"*": null, sinic: -200, japanese: 800, tibetan: 650, theravada: 1300, malay: 1600, "central-asia": 1500, persia: 1600, russia: 1640, indic: 1830},
  "a bag of coffee beans": COFFEE, "a cup of black coffee": COFFEE, "a cup of sweetened coffee": COFFEE,
  "a coffee pot": COFFEE, "a coffee grinder": COFFEE,
  "a cake of drinking chocolate": {"*": null, mesoamerican: -1500},
  "a bag of maize meal": {"*": null, mesoamerican: -3000, andean: -2000, "north-america-east": 1000, "north-america-west": 1000},
  "a sack of potatoes": {"*": null, andean: -3000},
  "a sack of seed potatoes": {"*": null, andean: -3000},
  "a corn tortilla": {mesoamerican: -1500, mexico: 1521, "north-america-west": 1800, "*": 1960},
  "a flour tortilla": {mexico: null, "north-america-west": 1800, "*": 1960},
  "a bag of rice": {"*": null, sinic: -5000, japanese: -300, indic: -3000, theravada: -2000, malay: -2000, islamic: 900, swahili: 1000, sahel: 1200},
  "a jar of ghee": {indic: null, tibetan: null, islamic: null, "east-africa": null, "*": 1960},
  "a jar of soy sauce": {sinic: null, japanese: null, theravada: null, malay: null, "*": 1950},
  "a bag of raw soybeans": {sinic: null, japanese: null, "*": 1900},
  "a pair of chopsticks": {sinic: null, japanese: null, "southeast-asia": null, tibetan: null, "*": 1970},

  // Drugs
  "a pouch of coca leaves": {andean: null, andes: null},
  "a betel nut wrapped in leaf with lime": {indic: null, theravada: null, malay: null, swahili: 1000},
  "a hookah": {islamic: null, indic: null, sahel: 1700, swahili: null, "*": 1950},
  "a long opium pipe": {sinic: null, theravada: null, malay: null, indic: null, "*": 1840},

  // Coin: the old coins of Europe stay at home. The coin of the place (below) stands in everywhere.
  "a cowrie shell": {sahel: null, swahili: null, bantu: null, indic: null, theravada: null, malay: null, sinic: [-2000, -200]},
  "a square-holed copper coin": {sinic: null, japanese: null, "southeast-asia": null, malay: null},
  "a gold dinar": {islamic: null, sahel: null, swahili: null, iberia: null, italy: null},
  "a silver penny": {latin: null},
  "a clipped half-penny": {"british-isles": null},
  "a thin bracteate pfennig": {"german-lands": null, moravia: null, "poland-baltic": null, scandinavia: null},
  "a gold hyperpyron": {orthodox: null, italy: null, "carpathians-balkans": null},
  "a silver groat": {latin: null}, "a gold florin": {latin: null},
  "a gold ducat": {latin: null, orthodox: null, levant: null, egypt: null},
  "a brass counting jeton": {latin: null},
  "a foreign coin": OLD_WORLD, "a copper coin": OLD_WORLD, "a bronze coin": OLD_WORLD,
  "a stamped silver bar": {latin: null, orthodox: null, islamic: null, sinic: null, tibetan: null},
  "a bolt of undyed wool": {...OLD_WORLD, andean: null},
  "a silver thaler": {latin: null, orthodox: null, arabia: 1750, "east-africa": 1750},
  "a goldsmith's note promising payment": {"british-isles": null},
  "a copper farthing": BRITISH, "a gold sovereign": {...BRITISH, india: null, "southern-africa": null},
  "a silver dollar": US, "a twenty-dollar gold piece": US, "a dollar bill": {...US, caribbean: 1950},
  "a company-store scrip token": US,
  "a Deutsche Mark note": {"german-lands": null},
  "a town banknote": {"german-lands": null, moravia: null},
  "a euro note": {"german-lands": null, france: null, italy: null, iberia: null, "low-countries": null, aegean: null, "carpathians-balkans": 2007, "poland-baltic": 2011},

  // Games and music
  "a go set": {sinic: null, japanese: null, "*": 1960}, "a shogi set": {japanese: null},
  "a mahjong set": {sinic: null, japanese: null, malay: null, theravada: null, "*": 1960},
  "a mancala set": {sahel: null, swahili: null, bantu: null, islamic: null, "*": 1960},
  "a hnefatafl set": {scandinavia: [-9999, 1500], "british-isles": [-9999, 1400]},
  "a latrunculi set": {italy: [-9999, 1300]},
  "a senet set": {egypt: [-9999, 1300]},
  "a board for nine men's morris": {latin: null},
  "a krar": {"east-africa": null}, "a kantele": {scandinavia: null, russia: null}
};

/** The coin of the place: drawn as the local money's coins when the money is known (WoDX Storyteller). */
export const LOCAL_COIN = "a coin of the place";

/**
 * Goods of their own for each way of life: [name, category, first year, last year, conceal, value, source, where].
 * Each is found only where its where says, unless it has a "*" key.
 */
export const WAY_ROWS = [
  [LOCAL_COIN, "coin", -600, END, "P", 0, "hist", {"*": null}],
  // The lands of Islam
  ["a brass coffee pot with a long spout", "kitchen", 1450, END, "T", 1, "hist", {islamic: null, swahili: 1500, sahel: 1700}],
  ["a twig for cleaning the teeth", "hygiene", 600, END, "P", 0, "hist", {...MUSLIM, "*": false}],
  ["a pot of kohl", "hygiene", -2000, END, "P", 0, "hist", {islamic: null, indic: null, sahel: null, swahili: null}],
  ["a string of dried dates", "food", -3000, END, "J", 0, "hist", {islamic: null, sahel: null}],
  ["a copper water jug for washing before prayer", "faith", 700, END, "T", 1, "hist", {...MUSLIM, "*": false}],
  ["a paper amulet with verses inside a leather case", "faith", 900, END, "P", 0, "hist", {islamic: null, sahel: null, swahili: null}],
  ["a block of indigo", "materials", 800, END, "J", 1, "hist", {islamic: null, indic: null, sahel: null}],
  // The Eastern church
  ["a knotted prayer rope", "faith", 400, END, "P", 0, "hist", {orthodox: null, "east-africa": null}],
  ["a painted Easter egg", "faith", 1000, END, "J", 0, "hist", {orthodox: null, "poland-baltic": null, moravia: null}],
  ["a brass samovar", "kitchen", 1740, END, "N", 2, "hist", {russia: null, siberia: null, persia: 1820, "central-asia": 1850}],
  // India
  ["a brass oil lamp for the shrine", "light", -500, END, "J", 1, "hist", {...HINDU, "*": false}],
  ["a length of cotton for a sari", "cloth", -500, END, "J", 1, "hist", {indic: null}],
  ["a twist of turmeric", "food", -1500, END, "P", 0, "hist", {indic: null, malay: null, theravada: null, "*": 1960}],
  ["a bundle of palm-leaf pages", "papers", -500, 1900, "J", 1, "hist", {indic: null, theravada: null, malay: null}],
  ["a pair of bells for a dancer's ankles", "toys", -500, END, "P", 1, "hist", {indic: null}],
  // China and Korea
  ["a brick of pressed tea", "drink", 800, END, "J", 1, "hist", {sinic: null, tibetan: null, "central-asia": 1500, russia: 1700, siberia: 1700}],
  ["an ink stick and grinding stone", "papers", -200, END, "J", 1, "hist", {sinic: null, japanese: null}],
  ["a folding paper fan", "house", 900, END, "J", 0, "hist", {sinic: null, japanese: null, "*": 1700}],
  ["a string of cash coins", "coin", -200, 1912, "J", 0, "hist", {sinic: null, "southeast-asia": null, japanese: [700, 1870]}],
  ["a jade bangle", "valuables", -2000, END, "P", 3, "hist", {sinic: null, "southeast-asia": null}],
  ["a padded cotton jacket", "cloth", 1300, END, "T", 1, "hist", {sinic: null, tibetan: null}],
  ["a jar of fermented cabbage", "food", 1200, END, "J", 0, "hist", {korea: null, china: null}],
  // Japan
  ["a lacquered lunch box", "kitchen", 1500, END, "J", 1, "hist", {japanese: null}],
  ["a paper lantern on a stick", "light", 1200, END, "T", 0, "hist", {japanese: null, sinic: null}],
  ["a bag of rice crackers", "food", 1600, END, "J", 0, "hist", {japanese: null}],
  ["a wooden prayer tablet from a shrine", "faith", 800, END, "J", 0, "hist", {japanese: null}],
  ["an oiled paper umbrella", "travel", 1000, END, "T", 1, "hist", {japanese: null, sinic: null, theravada: null, "*": 1960}],
  // Mainland Southeast Asia
  ["a jar of fish sauce", "food", 800, END, "J", 0, "hist", {theravada: null, malay: null, china: [-200, 1300], "*": 1970}],
  ["a monk's alms bowl", "faith", -300, END, "T", 1, "hist", {theravada: null, tibetan: null, sinic: null, japanese: null}],
  ["a woven rice basket", "containers", -500, END, "T", 0, "hist", {theravada: null, malay: null}],
  ["a small spirit house of carved wood", "faith", -500, END, "N", 1, "hist", {theravada: null}],
  // Tibet and the Himalaya
  ["a hand prayer wheel", "faith", 800, END, "J", 1, "hist", {tibetan: null}],
  ["a string of prayer flags", "faith", 1000, END, "J", 0, "hist", {tibetan: null}],
  ["a churn for butter tea", "kitchen", 800, END, "N", 1, "hist", {tibetan: null}],
  ["a bag of roasted barley flour", "food", 600, END, "J", 0, "hist", {tibetan: null}],
  ["a block of yak butter", "food", -500, END, "J", 0, "hist", {tibetan: null, "central-asia": null}],
  // The Malay world
  ["a kris with a wavy blade", "arms", 1300, END, "J", 2, "hist", {malay: null}],
  ["a length of batik cloth", "cloth", 1000, END, "J", 1, "hist", {malay: null, "*": 1960}],
  ["a twist of cloves", "food", -200, END, "P", "3>1700:1", "hist", {malay: null, indic: null, islamic: 800, swahili: 1800, "*": 1500}],
  ["a betel box of brass", "drugs", 1000, END, "J", 1, "hist", {malay: null, theravada: null, indic: null}],
  ["a shadow puppet of painted hide", "toys", 1000, END, "T", 1, "hist", {malay: null}],
  // The Sahel and West Africa
  ["a kola nut", "drugs", -500, END, "P", 0, "hist", {sahel: null, "*": 1950}],
  ["a slab of rock salt", "food", 800, END, "T", 1, "hist", {sahel: null, "central-africa": null}],
  ["a gourd bowl", "kitchen", -3000, END, "J", 0, "hist", {sahel: null, bantu: null, swahili: null, polynesian: null}],
  ["a strip of woven cotton cloth", "cloth", 1000, END, "J", 1, "hist", {sahel: null}],
  ["a pouch of gold dust", "coin", 700, 1900, "P", 3, "hist", {sahel: null, "southern-africa": [1000, 1600]}],
  ["a carved wooden mask", "faith", -500, END, "T", 2, "hist", {sahel: null, bantu: null, "*": 1950}],
  // The Swahili coast and Ethiopia
  ["a printed cotton wrap", "cloth", 1850, END, "J", 1, "hist", {swahili: null, "east-africa": null}],
  ["a carved wooden door bolt", "keys", 1000, END, "J", 0, "hist", {swahili: null}],
  ["a hand cross of brass", "faith", 400, END, "J", 1, "hist", {"east-africa": null}],
  ["a clay coffee pot", "kitchen", 1100, END, "T", 0, "hist", {"east-africa": null}],
  ["a sheet of flat sour bread", "food", -500, END, "J", 0, "hist", {"east-africa": null}],
  // Southern and central Africa
  ["a string of glass trade beads", "valuables", 800, END, "P", 1, "hist", {bantu: null, swahili: null, sahel: 1450, northern: 1550, "*": false}],
  ["a copper cross ingot", "coin", 900, 1900, "J", 2, "hist", {"central-africa": null, "southern-africa": null}],
  ["a thumb piano", "toys", 1000, END, "J", 1, "hist", {bantu: null, "*": 1970}],
  ["a pot of sorghum beer", "drink", -500, END, "T", 0, "hist", {bantu: null, sahel: null, swahili: null}],
  ["a sleeping mat of woven reed", "house", -3000, END, "T", 0, "hist", {bantu: null, sahel: null, swahili: null, malay: null, polynesian: null}],
  // Mesoamerica
  ["a bag of cacao beans", "coin", -1000, 1700, "J", 1, "hist", {mesoamerican: null, mexico: null}],
  ["a gourd of foaming cacao", "drink", -1500, END, "J", 1, "hist", {mesoamerican: null, mexico: null}],
  ["a blade of obsidian", "tools", -3000, END, "P", 0, "hist", {mesoamerican: null, mexico: null}],
  ["a stone grinding slab for maize", "kitchen", -3000, END, "N", 0, "hist", {mesoamerican: null, mexico: null}],
  ["a sheet of bark paper", "papers", -500, END, "J", 1, "hist", {mesoamerican: null, mexico: null}],
  ["a jar of pulque", "drink", -200, END, "T", 0, "hist", {mesoamerican: null, mexico: null}],
  ["a cotton quilted tunic", "cloth", 1000, 1600, "T", 1, "hist", {mesoamerican: null}],
  // The Andes
  ["a knotted cord record", "papers", 1000, 1600, "J", 1, "hist", {andean: null, andes: [1000, 1600]}],
  ["a bag of freeze-dried potatoes", "food", -500, END, "J", 0, "hist", {andean: null, andes: null}],
  ["a jar of maize beer", "drink", -500, END, "T", 0, "hist", {andean: null, andes: null}],
  ["a woven bag for coca", "containers", -500, END, "J", 1, "hist", {andean: null, andes: null}],
  ["a shawl of alpaca wool", "cloth", -500, END, "J", 1, "hist", {andean: null, andes: null, "southern-cone": null, "*": 1980}],
  ["a pouch of quinoa", "food", -2000, END, "J", 0, "hist", {andean: null, andes: null, "*": 2000}],
  // Polynesia
  ["a length of bark cloth", "cloth", -500, END, "J", 1, "hist", {polynesian: null, "pacific-islands": null, aotearoa: null}],
  ["a bowl of kava", "drink", -500, END, "T", 0, "hist", {polynesian: null, "pacific-islands": null}],
  ["a pendant of carved greenstone", "valuables", 1300, END, "P", 3, "hist", {aotearoa: null}],
  ["a shell fishhook", "tools", -1000, END, "P", 0, "hist", {polynesian: null, "pacific-islands": null, aotearoa: null}],
  ["a fan of woven pandanus", "house", -500, END, "J", 0, "hist", {polynesian: null, "pacific-islands": null}],
  // The far north and the first nations of the north
  ["a stone seal-oil lamp", "light", -3000, END, "T", 0, "hist", {arctic: null, siberia: null, canada: [-3000, 1950]}],
  ["a curved knife with a bone handle", "tools", -2500, END, "J", 0, "hist", {arctic: null, canada: null}],
  ["a shell-bead belt", "valuables", 1000, 1800, "J", 2, "hist", {"north-america-east": null, canada: null}],
  ["a bundle of dried fish", "food", -5000, END, "T", 0, "hist", {northern: null, arctic: null, siberia: null, scandinavia: null}],
  ["a pair of snowshoes", "travel", -2000, END, "N", 1, "hist", {northern: null, canada: null, arctic: null, siberia: null, scandinavia: null, "*": false}],
  ["a pouch of pemmican", "food", -1000, END, "J", 0, "hist", {northern: null, canada: null, "north-america-west": null}],
  ["a pipe of red stone", "drugs", -500, END, "J", 2, "hist", {northern: null, "north-america-west": null, "north-america-east": null}]
];

/** What each new good looks like (Library's Examine), in the format of goods-text.mjs. */
export const WAY_DESC_RAW = `
a coin of the place | One of the small coins people here pay with day to day, warm from someone's pocket.
a brass coffee pot with a long spout | A tall brass pot with a beak of a spout and a hinged lid, blackened at the base from the coals.
a twig for cleaning the teeth | A finger-length twig of the arak tree, its end chewed into soft bristles.
a pot of kohl | Fine black eye powder, drawn along the lids with a thin stick.
a string of dried dates | Brown, wrinkled dates threaded on a cord, sticky and sweet.
a copper water jug for washing before prayer | A copper jug with a curved spout, kept full for the washing before prayer.
a paper amulet with verses inside a leather case | A tiny square of folded paper written over with verses, sewn into a leather case on a cord.
a block of indigo | A crumbly blue-black cake of dye that stains the fingers on touch.
a knotted prayer rope | A loop of black wool tied in tight knots, each knot a prayer.
a painted Easter egg | An egg dyed deep red or painted in fine wax patterns, kept from the feast.
a brass samovar | A tall brass urn with a chimney up the middle and a tap at the bottom, for keeping water hot for tea.
a brass oil lamp for the shrine | A small brass lamp shaped like a leaf, with a cotton wick lying in ghee.
a length of cotton for a sari | Several yards of fine dyed cotton with a woven border, folded flat.
a twist of turmeric | Bright yellow powder ground from a dried root. It marks everything it touches.
a bundle of palm-leaf pages | Long strips of dried palm leaf scratched with script and strung between two boards.
a pair of bells for a dancer's ankles | Two leather straps sewn with rows of small brass bells.
a brick of pressed tea | A dark brick of tea leaves pressed hard enough to use as money on the long roads.
an ink stick and grinding stone | A black stick of pressed soot and glue with a flat stone for grinding it in water.
a folding paper fan | A fan of paper pleats on bamboo ribs that snaps open with a flick.
a string of cash coins | A long string of round copper coins threaded through their square holes, counted by the hundred.
a jade bangle | A smooth green stone bangle, cold to the touch and heavier than it looks.
a padded cotton jacket | A thick jacket quilted with cotton batting, fastened with cloth knots.
a jar of fermented cabbage | Salted, spiced cabbage, sour and strong to smell.
a lacquered lunch box | A small box of glossy black and red lacquer with nested trays inside.
a paper lantern on a stick | A folding lantern of oiled paper around a candle, hung from a bamboo pole.
a bag of rice crackers | Crisp rice crackers brushed with soy and dried.
a wooden prayer tablet from a shrine | A small wooden plaque with a picture on one side and a written wish on the other.
an oiled paper umbrella | An umbrella of oiled paper on many bamboo ribs that smells faintly of oil.
a jar of fish sauce | A thin brown sauce made from salted fish. The smell is strong.
a monk's alms bowl | A round black bowl with a lid, carried in a cloth sling.
a woven rice basket | A lidded basket of woven bamboo for keeping sticky rice warm.
a small spirit house of carved wood | A little house on a post, carved and painted, with room for an offering on its porch.
a hand prayer wheel | A metal drum on a handle with a weight on a chain. Spinning it turns the prayers rolled up inside.
a string of prayer flags | A cord of small cloth squares in five colours, printed with prayers and faded by wind.
a churn for butter tea | A tall wooden tube bound with brass and a plunger for mixing tea, salt and butter.
a bag of roasted barley flour | Roasted barley flour, eaten mixed with tea into a dough.
a block of yak butter | A block of rich pale butter sewn into a skin.
a kris with a wavy blade | A dagger with a wavy, patterned blade and a carved hilt, often an heirloom.
a length of batik cloth | Cotton cloth patterned in wax and dye, with fine crackle lines where the wax broke.
a twist of cloves | Dried clove buds that smell sharp and warm.
a betel box of brass | A small brass box with compartments for nut, leaf and lime.
a shadow puppet of painted hide | A flat figure of pierced and painted hide on horn rods, made to cast a shadow on a screen.
a kola nut | A pink or white nut, bitter to chew and good for staying awake.
a slab of rock salt | A grey slab of salt cut from a desert mine and carried south by camel.
a gourd bowl | A bowl cut from a dried gourd, smooth inside and sometimes carved outside.
a strip of woven cotton cloth | A long narrow strip of handwoven cotton, made to be sewn together with others.
a pouch of gold dust | Fine gold dust, weighed out on a balance to pay.
a carved wooden mask | A face carved in dark wood with narrow eyes and a high brow, worn in rites.
a printed cotton wrap | A rectangle of printed cotton with a border and a saying along one edge.
a carved wooden door bolt | A heavy bolt of hardwood carved with patterns, from a coastal house door.
a hand cross of brass | A flat brass cross of open lacework, held by a priest for blessing.
a clay coffee pot | A round-bellied clay pot with a long neck and a straw stopper.
a sheet of flat sour bread | A broad spongy flatbread with a sour taste, folded in a cloth.
a string of glass trade beads | Coloured glass beads on a cord, the kind traders bring from far away.
a copper cross ingot | A cast copper ingot shaped like a cross, worth its weight.
a thumb piano | A wooden board with metal tongues of different lengths, plucked with the thumbs.
a pot of sorghum beer | Thick, sour beer brewed from sorghum.
a sleeping mat of woven reed | A mat of woven reeds that rolls up tight for carrying.
a bag of cacao beans | Dried cacao beans, counted out to pay at market.
a gourd of foaming cacao | A gourd of bitter cacao drink, poured from a height to raise the foam.
a blade of obsidian | A thin flake of black volcanic glass, sharper than any steel.
a stone grinding slab for maize | A sloped slab of stone with a hand stone for grinding soaked maize.
a sheet of bark paper | A sheet of beaten fig bark, folded or painted with signs.
a jar of pulque | A milky, sour drink made from the sap of the maguey.
a cotton quilted tunic | A thick tunic of quilted cotton, soaked in brine to stiffen it against blows.
a knotted cord record | A main cord hung with many coloured strings, each knotted to record counts.
a bag of freeze-dried potatoes | Small black potatoes dried in the frost and sun, light as cork.
a jar of maize beer | Cloudy, sour beer brewed from maize.
a woven bag for coca | A small bag woven in bright stripes for carrying coca leaves.
a shawl of alpaca wool | A soft, warm shawl of alpaca wool in natural browns and greys.
a pouch of quinoa | Small round seeds that cook up like grain.
a length of bark cloth | A sheet of beaten bark cloth stamped with dark patterns.
a bowl of kava | A muddy drink of pounded root that numbs the tongue.
a pendant of carved greenstone | A pendant of polished green stone, carved in a curling shape and worn smooth.
a shell fishhook | A fishhook cut from shell and lashed to a fine cord.
a fan of woven pandanus | A stiff fan woven from pandanus leaves.
a stone seal-oil lamp | A shallow stone dish that burns seal oil along a wick of moss.
a curved knife with a bone handle | A knife with a broad curved blade and a bone handle, for skinning and cutting.
a shell-bead belt | A belt of white and purple shell beads woven in patterns that record an agreement.
a bundle of dried fish | A bundle of split, dried fish, hard as wood and salty.
a pair of snowshoes | A pair of wooden frames strung with rawhide for walking on deep snow.
a pouch of pemmican | Pounded dried meat mixed with fat and berries.
a pipe of red stone | A pipe with a bowl of red stone and a long wooden stem, used in council and rite.
`;

/* ------------------------------------------------------------------ */
/*  Reading a good's where                                             */
/* ------------------------------------------------------------------ */

/**
 * The rule for a good in a place: {where} is the good's WAYS entry (or the row's own), way the way of life, region the
 * region id. Returns null (its own first year), a year, [from, to], or false. No entry: null (everywhere).
 */
export function ruleFor(where, {way = null, region = null} = {}) {
  if ( !where ) return null;
  if ( region && region in where ) return where[region];
  if ( way && way in where ) return where[way];
  if ( "*" in where ) return where["*"];
  return false;
}

/**
 * Is a good found in a year and place? good: {from, to, ways}. With no way or region given, the good's own years.
 */
export function inUseAt(good, year, {way = null, region = null} = {}) {
  const y = Number(year);
  if ( !Number.isFinite(y) || !good ) return false;
  const to = Number(good.to ?? END);
  if ( !way && !region ) return y >= good.from && y <= to;
  const r = ruleFor(good.ways, {way, region});
  if ( r === false ) return false;
  if ( Array.isArray(r) ) return y >= Math.max(r[0], -99999) && y <= Math.min(r[1], to);
  const from = r === null || r === undefined ? good.from : Number(r);
  return y >= from && y <= to;
}

/** The first year a good is found in a place, or null where it is never found. */
export function firstYearAt(good, {way = null, region = null} = {}) {
  const r = ruleFor(good?.ways, {way, region});
  if ( r === false ) return null;
  if ( Array.isArray(r) ) return r[0];
  return r === null || r === undefined ? good.from : Number(r);
}

/**
 * A coin line in the local money: units are a money's [singular, plural, value] list from WoDX Storyteller, largest
 * first. The coin is the second unit where there are several (groschen, shillings, dirhams), else the only one.
 */
export function localCoinLine(units, n = 1) {
  const list = Array.isArray(units) ? units.filter(u => Array.isArray(u) && u[0]) : [];
  if ( !list.length ) return null;
  const u = list.length > 1 ? list[1] : list[0];
  const k = Math.max(1, Math.round(Number(n) || 1));
  return k > 1 ? `${k} ${u[1] ?? u[0]}` : `one ${u[0]}`;
}
