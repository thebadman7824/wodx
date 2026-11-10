/**
 * Everyday goods by era: the ordinary things a container holds besides weapons and armour. Food, drink, tools,
 * cloth, coin, papers, light, things of faith, medicine and keepsakes, each with the eras it belongs to.
 *
 * Plain names only, no prices or rules: they go into a container's list as lines of text, which the Storyteller can
 * change. A house rule list written for WoDX (no book gives such a table); eras follow Chronicle's profiles.
 *
 * Each row: [name, kind, first era, last era, small]. small: fits a box, drawers, a strongbox or a safe.
 */

/** Chronicle's eras in the order goods pass through them. The Wild West runs beside the Victorian era. */
export const ERAS = ["living-gods", "classical", "dark-ages", "long-night", "renaissance", "victorian", "wild-west",
  "great-war", "modern", "time-of-judgment", "future-darkness", "time-of-future-judgement"];

/** What kind of thing each good is, with a plain label for the draw window. */
export const KINDS = {
  food: "Food", drink: "Drink", kitchen: "Pots and kitchen things", cloth: "Cloth and clothes", tools: "Tools",
  light: "Light and fire", coin: "Money", papers: "Papers and writing", faith: "Things of faith",
  medicine: "Medicine", keepsake: "Keepsakes and odds and ends", valuables: "Valuables", vice: "Vices",
  tech: "Machines and gadgets"
};

/** How likely each kind of good is in each kind of place (0: never). The places are those of fill by place and era. */
export const PLACE_WEIGHTS = {
  home: {food: 3, drink: 2, kitchen: 3, cloth: 3, tools: 2, light: 2, coin: 2, papers: 1, faith: 1, medicine: 1, keepsake: 3, valuables: 1, vice: 1, tech: 1},
  armory: {food: 1, drink: 2, kitchen: 0, cloth: 2, tools: 3, light: 2, coin: 1, papers: 1, faith: 1, medicine: 2, keepsake: 1, valuables: 0, vice: 1, tech: 1},
  church: {food: 1, drink: 1, kitchen: 0, cloth: 2, tools: 0, light: 3, coin: 2, papers: 3, faith: 4, medicine: 1, keepsake: 1, valuables: 1, vice: 0, tech: 0},
  workshop: {food: 1, drink: 1, kitchen: 0, cloth: 1, tools: 4, light: 2, coin: 1, papers: 1, faith: 0, medicine: 0, keepsake: 1, valuables: 0, vice: 1, tech: 2},
  den: {food: 1, drink: 3, kitchen: 0, cloth: 1, tools: 2, light: 1, coin: 3, papers: 1, faith: 0, medicine: 1, keepsake: 2, valuables: 3, vice: 3, tech: 2},
  camp: {food: 3, drink: 2, kitchen: 2, cloth: 2, tools: 2, light: 2, coin: 1, papers: 0, faith: 1, medicine: 2, keepsake: 1, valuables: 0, vice: 1, tech: 1},
  clinic: {food: 0, drink: 1, kitchen: 0, cloth: 2, tools: 1, light: 1, coin: 1, papers: 2, faith: 0, medicine: 4, keepsake: 0, valuables: 0, vice: 1, tech: 3}
};

const S = true;
/* [name, kind, first era, last era, small] */
export const ROWS = [
  // food
  ["a loaf of dark bread", "food", "living-gods", "great-war", S],
  ["a round of hard cheese", "food", "living-gods", "time-of-judgment", S],
  ["a sack of grain", "food", "living-gods", "great-war", false],
  ["a crock of salted pork", "food", "classical", "great-war", false],
  ["a string of onions", "food", "living-gods", "great-war", false],
  ["a pot of honey", "food", "living-gods", "time-of-judgment", S],
  ["dried fish wrapped in cloth", "food", "living-gods", "great-war", S],
  ["a bag of dried peas", "food", "dark-ages", "great-war", S],
  ["a twist of salt", "food", "living-gods", "victorian", S],
  ["a pouch of pepper", "food", "dark-ages", "renaissance", S],
  ["a sugarloaf in blue paper", "food", "renaissance", "victorian", S],
  ["tins of corned beef", "food", "victorian", "modern", S],
  ["hardtack biscuits", "food", "renaissance", "great-war", S],
  ["a bag of coffee beans", "food", "renaissance", "time-of-judgment", S],
  ["a packet of tea", "food", "renaissance", "future-darkness", S],
  ["tinned beans", "food", "great-war", "time-of-judgment", S],
  ["a box of breakfast cereal", "food", "modern", "time-of-judgment", false],
  ["instant noodles", "food", "modern", "future-darkness", S],
  ["ration bars in foil", "food", "great-war", "time-of-future-judgement", S],
  ["vat-grown protein blocks", "food", "future-darkness", "time-of-future-judgement", S],
  ["a tube of flavoured algae paste", "food", "future-darkness", "time-of-future-judgement", S],
  // drink
  ["a jug of ale", "drink", "living-gods", "victorian", false],
  ["a skin of wine", "drink", "living-gods", "renaissance", false],
  ["a cask of small beer", "drink", "dark-ages", "victorian", false],
  ["a flask of brandy", "drink", "renaissance", "time-of-judgment", S],
  ["a bottle of gin", "drink", "renaissance", "modern", S],
  ["a bottle of whiskey", "drink", "victorian", "future-darkness", S],
  ["a crate of beer bottles", "drink", "victorian", "time-of-judgment", false],
  ["cans of soda", "drink", "modern", "future-darkness", S],
  ["a bottle of synthetic vodka", "drink", "future-darkness", "time-of-future-judgement", S],
  // kitchen
  ["an iron cooking pot", "kitchen", "classical", "great-war", false],
  ["wooden bowls and spoons", "kitchen", "living-gods", "renaissance", false],
  ["pewter plates", "kitchen", "dark-ages", "victorian", false],
  ["a clay jug", "kitchen", "living-gods", "renaissance", false],
  ["a kettle", "kitchen", "renaissance", "time-of-judgment", false],
  ["a set of china cups", "kitchen", "renaissance", "time-of-judgment", false],
  ["a tin opener", "kitchen", "victorian", "time-of-judgment", S],
  ["a microwave dinner tray", "kitchen", "modern", "future-darkness", S],
  ["a self-heating meal pouch", "kitchen", "future-darkness", "time-of-future-judgement", S],
  // cloth
  ["a folded wool cloak", "cloth", "living-gods", "renaissance", false],
  ["a linen shift", "cloth", "living-gods", "renaissance", S],
  ["a bolt of undyed wool", "cloth", "living-gods", "victorian", false],
  ["a pair of leather shoes", "cloth", "living-gods", "time-of-judgment", false],
  ["a sheepskin", "cloth", "living-gods", "victorian", false],
  ["a needle case and thread", "cloth", "classical", "time-of-judgment", S],
  ["a lace collar", "cloth", "renaissance", "victorian", S],
  ["a waistcoat with brass buttons", "cloth", "victorian", "great-war", false],
  ["a bowler hat", "cloth", "victorian", "great-war", false],
  ["a wool army greatcoat", "cloth", "great-war", "modern", false],
  ["a pair of jeans", "cloth", "modern", "future-darkness", false],
  ["a hooded sweatshirt", "cloth", "modern", "future-darkness", false],
  ["a smart-fabric jacket that changes colour", "cloth", "future-darkness", "time-of-future-judgement", false],
  ["a filter mask for bad air days", "cloth", "future-darkness", "time-of-future-judgement", S],
  // tools
  ["a whetstone", "tools", "living-gods", "time-of-judgment", S],
  ["a sickle", "tools", "living-gods", "victorian", false],
  ["a hand axe for firewood", "tools", "living-gods", "time-of-judgment", false],
  ["an awl and leather thongs", "tools", "living-gods", "victorian", S],
  ["a coil of hemp rope", "tools", "living-gods", "time-of-judgment", false],
  ["tongs and a small hammer", "tools", "classical", "great-war", false],
  ["a wooden mallet and chisels", "tools", "classical", "modern", false],
  ["a spindle and a hank of yarn", "tools", "living-gods", "renaissance", S],
  ["a pair of shears", "tools", "classical", "time-of-judgment", S],
  ["a spade", "tools", "living-gods", "time-of-judgment", false],
  ["a box of iron nails", "tools", "classical", "time-of-judgment", S],
  ["a brace and bits", "tools", "renaissance", "great-war", false],
  ["a monkey wrench", "tools", "victorian", "time-of-judgment", false],
  ["a pocket knife", "tools", "renaissance", "future-darkness", S],
  ["a roll of duct tape", "tools", "great-war", "future-darkness", S],
  ["a cordless drill", "tools", "modern", "future-darkness", false],
  ["a multitool", "tools", "modern", "time-of-future-judgement", S],
  ["a diagnostic plug for cyberware", "tools", "future-darkness", "time-of-future-judgement", S],
  // light and fire
  ["tallow candles", "light", "classical", "victorian", S],
  ["beeswax candles", "light", "dark-ages", "time-of-judgment", S],
  ["a clay oil lamp", "light", "living-gods", "dark-ages", S],
  ["flint and steel with tinder", "light", "living-gods", "victorian", S],
  ["a horn lantern", "light", "dark-ages", "renaissance", false],
  ["a tin lantern", "light", "renaissance", "great-war", false],
  ["a box of matches", "light", "victorian", "future-darkness", S],
  ["a paraffin lamp", "light", "victorian", "great-war", false],
  ["a flashlight", "light", "great-war", "future-darkness", S],
  ["a disposable lighter", "light", "modern", "future-darkness", S],
  ["glow sticks", "light", "modern", "time-of-future-judgement", S],
  ["a palm-sized LED lantern", "light", "future-darkness", "time-of-future-judgement", S],
  // money
  ["a few bronze coins", "coin", "living-gods", "classical", S],
  ["a purse of silver pennies", "coin", "dark-ages", "long-night", S],
  ["a handful of copper coins", "coin", "classical", "great-war", S],
  ["a few gold florins", "coin", "long-night", "renaissance", S],
  ["a bag of mixed coins from three countries", "coin", "renaissance", "victorian", S],
  ["banknotes in a leather wallet", "coin", "victorian", "time-of-judgment", S],
  ["a jar of loose change", "coin", "great-war", "time-of-judgment", S],
  ["a credit card in someone else's name", "coin", "modern", "future-darkness", S],
  ["a credchip with a little money on it", "coin", "future-darkness", "time-of-future-judgement", S],
  // papers and writing
  ["a wax tablet and stylus", "papers", "classical", "dark-ages", S],
  ["a sealed letter on parchment", "papers", "dark-ages", "renaissance", S],
  ["a quill, a knife and a pot of ink", "papers", "dark-ages", "victorian", S],
  ["a tally stick of debts owed", "papers", "dark-ages", "renaissance", S],
  ["a printed broadsheet", "papers", "renaissance", "victorian", S],
  ["a bundle of letters tied with ribbon", "papers", "renaissance", "great-war", S],
  ["a ledger of accounts", "papers", "renaissance", "modern", false],
  ["a railway timetable", "papers", "victorian", "great-war", S],
  ["a newspaper", "papers", "victorian", "time-of-judgment", S],
  ["identity papers", "papers", "great-war", "time-of-judgment", S],
  ["a road map with circled places", "papers", "great-war", "time-of-judgment", S],
  ["a stack of floppy disks", "papers", "modern", "modern", S],
  ["a cheap mobile phone", "papers", "modern", "future-darkness", S],
  ["a data chip with no label", "papers", "future-darkness", "time-of-future-judgement", S],
  // faith
  ["a small carved household idol", "faith", "living-gods", "classical", S],
  ["a wooden cross on a cord", "faith", "dark-ages", "time-of-judgment", S],
  ["a string of prayer beads", "faith", "dark-ages", "future-darkness", S],
  ["a pilgrim's badge of lead", "faith", "dark-ages", "long-night", S],
  ["a psalter", "faith", "dark-ages", "victorian", S],
  ["a family Bible with names inside the cover", "faith", "renaissance", "modern", false],
  ["a vial of holy water", "faith", "dark-ages", "future-darkness", S],
  ["a saint's medal", "faith", "renaissance", "future-darkness", S],
  ["a holy picture printed on card", "faith", "victorian", "future-darkness", S],
  // medicine
  ["a pouch of dried herbs", "medicine", "living-gods", "victorian", S],
  ["clean linen for bandages", "medicine", "living-gods", "great-war", S],
  ["a jar of goose-grease salve", "medicine", "dark-ages", "victorian", S],
  ["a bottle of laudanum", "medicine", "victorian", "great-war", S],
  ["a field dressing", "medicine", "great-war", "time-of-judgment", S],
  ["a bottle of aspirin", "medicine", "great-war", "future-darkness", S],
  ["a first aid kit", "medicine", "modern", "future-darkness", false],
  ["a strip of prescription pills", "medicine", "modern", "future-darkness", S],
  ["a trauma patch", "medicine", "future-darkness", "time-of-future-judgement", S],
  // keepsakes and odds and ends
  ["a child's wooden doll", "keepsake", "living-gods", "great-war", S],
  ["a set of knucklebones", "keepsake", "living-gods", "renaissance", S],
  ["a bone comb", "keepsake", "living-gods", "renaissance", S],
  ["a lock of hair tied with thread", "keepsake", "living-gods", "time-of-judgment", S],
  ["a pair of dice", "keepsake", "classical", "time-of-future-judgement", S],
  ["a pack of playing cards", "keepsake", "renaissance", "future-darkness", S],
  ["a small mirror", "keepsake", "classical", "future-darkness", S],
  ["a faded photograph", "keepsake", "victorian", "future-darkness", S],
  ["a cigarette case with initials", "keepsake", "great-war", "modern", S],
  ["a mixtape with a handwritten label", "keepsake", "modern", "modern", S],
  ["a cracked tablet full of old photos", "keepsake", "future-darkness", "time-of-future-judgement", S],
  // valuables
  ["a silver ring", "valuables", "living-gods", "time-of-future-judgement", S],
  ["an amber necklace", "valuables", "living-gods", "victorian", S],
  ["a silver cup", "valuables", "classical", "victorian", S],
  ["a gold brooch", "valuables", "classical", "great-war", S],
  ["a pocket watch on a chain", "valuables", "victorian", "modern", S],
  ["a wristwatch", "valuables", "great-war", "future-darkness", S],
  ["a bag of loose gems", "valuables", "classical", "time-of-future-judgement", S],
  ["a stolen designer handbag", "valuables", "modern", "future-darkness", false],
  // vices
  ["a pouch of pipe tobacco", "vice", "renaissance", "modern", S],
  ["a twist of snuff", "vice", "renaissance", "victorian", S],
  ["a lump of opium", "vice", "renaissance", "great-war", S],
  ["a packet of cigarettes", "vice", "great-war", "future-darkness", S],
  ["a baggie of white powder", "vice", "modern", "future-darkness", S],
  ["a dermal patch of street stims", "vice", "future-darkness", "time-of-future-judgement", S],
  // machines and gadgets
  ["a brass spyglass", "tech", "renaissance", "great-war", S],
  ["a box camera", "tech", "victorian", "great-war", false],
  ["a wind-up gramophone", "tech", "victorian", "great-war", false],
  ["a crystal wireless set", "tech", "great-war", "great-war", false],
  ["a transistor radio", "tech", "modern", "time-of-judgment", false],
  ["a pager", "tech", "modern", "modern", S],
  ["a laptop with a cracked screen", "tech", "modern", "future-darkness", false],
  ["a pair of smart glasses with a dead battery", "tech", "future-darkness", "time-of-future-judgement", S],
  ["a cheap drone with one rotor missing", "tech", "future-darkness", "time-of-future-judgement", false]
];

/** The goods as objects: {name, kind, eras, small}. What the Victorian era has, the Wild West has too. */
export const GOODS = ROWS.map(([name, kind, from, to, small]) => {
  const a = ERAS.indexOf(from), b = ERAS.indexOf(to);
  const eras = a < 0 || b < a ? [] : ERAS.slice(a, b + 1);
  if ( eras.includes("victorian") && !eras.includes("wild-west") ) eras.push("wild-west");
  return {name, kind, eras, small: !!small};
});
