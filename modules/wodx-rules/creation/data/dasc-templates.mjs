/**
 * WoDX Creation: the supporting-character templates of the Dark Ages Storytellers Companion (2002), chapter 4
 * (pdf pp. 58-61, printed pp. 57-60), with the book's table of experienced and exceptional versions (B7695). Numbers
 * from the book's stat blocks; the one-line descriptions are WoDX's own words. supporting-cast.mjs makes them as
 * sheets. In-game names are gender-neutral; `book` keeps the book's own name where it differs.
 *
 * The 2002 book uses a few Abilities V20 Dark Ages renamed or folded in. ABILITY_2002 maps them (house reading, logged
 * in docs/PENDING-REVIEW.md): Dodge goes into Athletics (V20 has no Dodge), Larceny is Legerdemain, Herbalism is
 * Medicine (as WoDX Creation data/advance.mjs already reads it). Linguistics stays as a Secondary Knowledge.
 */
export const BOOK = "Dark Ages Storytellers Companion (2002)";
export const SHORT = "DASC 2002";

/** The 2002 Ability names WoDX reads as V20 Dark Ages ones. */
export const ABILITY_2002 = {Dodge: "Athletics", Larceny: "Legerdemain", Herbalism: "Medicine"};

/** Base rules for every template (pdf p. 58): Willpower 3 for mortals and ghouls, 4 for Cainites; 12th Generation; one die of blood. */
export const BASE = {willpower: {mortal: 3, ghoul: 3, vampire: 4}, generation: 12, bloodDice: 1, disciplineMax: 3,
  ghoulDisciplines: ["Potence"], ref: "pdf p. 58 / printed p. 57"};

/**
 * The book's table (pdf p. 58): dots added to the base template. Disciplines: at least half in Potence for a ghoul,
 * at least half in clan Disciplines for a Cainite. generation: the Cainite's Generation at that tier.
 */
export const TIERS = {
  base: {label: "Base", mortal: {}, ghoul: {}, vampire: {}},
  experienced: {label: "Experienced",
    mortal: {attributes: 2, abilities: 2, backgrounds: 1},
    ghoul: {attributes: 2, abilities: 3, backgrounds: 1, disciplines: 1},
    vampire: {attributes: 3, abilities: 4, backgrounds: 2, disciplines: 3, generation: 10}},
  exceptional: {label: "Exceptional",
    mortal: {attributes: 3, abilities: 4, backgrounds: 2},
    ghoul: {attributes: 3, abilities: 5, backgrounds: 2, disciplines: 2},
    vampire: {attributes: 5, abilities: 7, backgrounds: 3, disciplines: 5, generation: 8}}
};

const A = (s, d, st, ch, m, ap, pe, i, w) => ({strength: s, dexterity: d, stamina: st, charisma: ch, manipulation: m, appearance: ap, perception: pe, intelligence: i, wits: w});
/** Virtues: [first, second, courage] with the keys the book uses (Conscience or Conviction, Self-Control or Instinct). */
const V = (a, av, b, bv, c) => ({[a]: av, [b]: bv, courage: c});

export const TEMPLATES = [
  // Everyday mortals (pdf pp. 58-59)
  {key: "craftsman", name: "Craftsperson", book: "Craftsman", line: "mortal", group: "Everyday mortals", pdf: 58,
    attributes: A(2, 3, 1, 2, 2, 2, 2, 2, 2), abilities: {Alertness: 2, Crafts: 3, Etiquette: 1}, backgrounds: {Resources: 1},
    virtues: V("conscience", 2, "selfcontrol", 2, 2), about: "A town maker of one trade or another, from carpentry to brewing."},
  {key: "farmer", name: "Farmer", line: "mortal", group: "Everyday mortals", pdf: 58,
    attributes: A(3, 2, 2, 2, 1, 2, 2, 2, 2), abilities: {"Animal Ken": 2, Ride: 2, "Hearth Wisdom": 2}, backgrounds: {Allies: 1},
    virtues: V("conscience", 2, "selfcontrol", 2, 2), about: "One of the many who work the land; the Allies are family."},
  {key: "tavern-server", name: "Tavern Server", line: "mortal", group: "Everyday mortals", pdf: 59,
    attributes: A(1, 2, 2, 3, 2, 3, 2, 2, 1), abilities: {Alertness: 2, Empathy: 2, Subterfuge: 2}, backgrounds: {Contacts: 1},
    virtues: V("conscience", 2, "selfcontrol", 2, 2), about: "Pours, listens and remembers; a fine source of gossip."},
  {key: "cutthroat", name: "Cutthroat", line: "mortal", group: "Everyday mortals", pdf: 59,
    attributes: A(2, 2, 2, 2, 2, 2, 2, 2, 2), abilities: {Larceny: 2, Melee: 2, Stealth: 2}, backgrounds: {Contacts: 1},
    virtues: V("conscience", 1, "instinct", 3, 2), about: "Lives off what others earn, with a knife when needed."},
  {key: "entertainer", name: "Entertainer", line: "mortal", group: "Everyday mortals", pdf: 59,
    attributes: A(1, 3, 1, 2, 2, 2, 2, 2, 3), abilities: {Etiquette: 2, Expression: 2, Performance: 2}, backgrounds: {Allies: 1},
    virtues: V("conscience", 2, "instinct", 2, 2), about: "A player of taverns or courts, from fiddler to jester."},
  {key: "city-guard", name: "City Guard", line: "mortal", group: "Everyday mortals", pdf: 59,
    attributes: A(3, 2, 3, 1, 2, 2, 2, 1, 2), abilities: {Dodge: 2, Intimidation: 2, Melee: 2}, backgrounds: {Allies: 1},
    virtues: V("conscience", 2, "selfcontrol", 2, 2), about: "Keeps a town's order with some training and little war behind it."},
  {key: "levy-bowman", name: "Levy Archer", book: "Levy Bowman", line: "mortal", group: "Everyday mortals", pdf: 59,
    attributes: A(2, 3, 2, 2, 1, 1, 3, 2, 2), abilities: {Dodge: 2, Archery: 2, Crafts: 2}, backgrounds: {Allies: 1},
    virtues: V("conscience", 2, "selfcontrol", 2, 2), about: "A called-up peasant made dangerous by a bow."},
  // Notable mortals (pdf pp. 59-60)
  {key: "scholar", name: "Scholar", line: "mortal", group: "Notable mortals", pdf: 59,
    attributes: A(1, 2, 2, 2, 2, 2, 2, 3, 2), abilities: {Academics: 3, Law: 2, Occult: 1, Theology: 2}, backgrounds: {Contacts: 1, Mentor: 1},
    virtues: V("conviction", 2, "selfcontrol", 2, 2), about: "Reads the ancients, the stars and the scriptures alike."},
  {key: "wise-woman", name: "Wise One", book: "Wise Woman", line: "mortal", group: "Notable mortals", pdf: 59,
    attributes: A(1, 1, 1, 2, 2, 2, 3, 3, 3), abilities: {Empathy: 2, "Hearth Wisdom": 3, Intimidation: 1, Medicine: 2}, backgrounds: {Contacts: 1, Influence: 1},
    virtues: V("conscience", 2, "selfcontrol", 2, 2), about: "Called witch by some; most come for remedies and counsel all the same."},
  {key: "noble", name: "Noble", line: "mortal", group: "Notable mortals", pdf: 60,
    attributes: A(2, 2, 2, 2, 2, 2, 2, 2, 2), abilities: {Etiquette: 3, Expression: 1, Leadership: 2, Linguistics: 2}, backgrounds: {Influence: 1, Retainers: 1},
    virtues: V("conscience", 2, "selfcontrol", 2, 2), about: "Of some tier of the nobility, born to lead, or so it is said."},
  {key: "mercenary-footman", name: "Mercenary Foot Soldier", book: "Mercenary Footman", line: "mortal", group: "Notable mortals", pdf: 60,
    attributes: A(3, 3, 2, 2, 1, 1, 2, 2, 2), abilities: {Brawl: 2, Dodge: 2, Melee: 3, Survival: 1}, backgrounds: {Allies: 1, Contacts: 1},
    virtues: V("conscience", 2, "selfcontrol", 2, 2), about: "Hardened by paid wars; fights fair until fair stops working."},
  {key: "knight", name: "Knight", line: "mortal", group: "Notable mortals", pdf: 60,
    attributes: A(2, 2, 2, 2, 2, 2, 2, 2, 2), abilities: {Etiquette: 2, Leadership: 2, Melee: 2, Ride: 2}, backgrounds: {Allies: 2},
    virtues: V("conscience", 2, "selfcontrol", 2, 2), about: "A mounted warrior of noble standing, the edge of any battle."},
  {key: "trader", name: "Trader", line: "mortal", group: "Notable mortals", pdf: 60,
    attributes: A(2, 1, 2, 2, 2, 2, 2, 2, 3), abilities: {Commerce: 2, Etiquette: 2, Linguistics: 2, Ride: 2}, backgrounds: {Contacts: 1, Resources: 1},
    virtues: V("conscience", 2, "selfcontrol", 2, 2), about: "Carries goods and news between towns, half merchant and half envoy."},
  // Ghouls (pdf p. 60)
  {key: "aged-castellan", name: "Aged Castellan", line: "ghoul", group: "Ghouls", pdf: 60,
    attributes: A(1, 2, 2, 2, 4, 2, 3, 3, 2), abilities: {Alertness: 2, Dodge: 1, Etiquette: 2, Intimidation: 2, Law: 2, Seneschal: 3},
    backgrounds: {Allies: 1, Contacts: 2, Influence: 1}, disciplines: {Potence: 1},
    virtues: V("conviction", 2, "selfcontrol", 2, 2), about: "Runs the domain by day, as skilled as loyal."},
  {key: "cats-paw", name: "Cat's Paw", line: "ghoul", group: "Ghouls", pdf: 60,
    attributes: A(3, 2, 2, 2, 2, 2, 3, 2, 3), abilities: {Alertness: 3, Dodge: 3, Etiquette: 3, Melee: 3, Stealth: 3, Subterfuge: 3},
    backgrounds: {Allies: 2, Contacts: 2}, disciplines: {Potence: 1},
    virtues: V("conscience", 2, "selfcontrol", 2, 2), about: "The trusted hand a master acts through without being seen."},
  // Cainites (pdf p. 61, printed p. 60)
  {key: "information-broker", name: "Information Broker", line: "vampire", group: "Cainites", pdf: 61, clan: "Nosferatu", generation: 12,
    road: "Road of Humanity", path: "Path of Vigor",
    attributes: A(2, 3, 2, 2, 4, 2, 4, 3, 3), abilities: {Academics: 2, Alertness: 2, Dodge: 2, Empathy: 1, Law: 2, Linguistics: 2, Stealth: 3, Subterfuge: 2},
    backgrounds: {Allies: 1, Contacts: 3, Herd: 1, Resources: 2, Status: 1}, disciplines: {Animalism: 1, Obfuscate: 2, Potence: 1},
    virtues: V("conscience", 2, "selfcontrol", 2, 2), willpower: 4, about: "Knows mortal and Cainite secrets alike, and gives nothing for free."},
  {key: "ashen-crusader", name: "Ashen Crusader", line: "vampire", group: "Cainites", pdf: 61, clan: "Brujah", generation: 10,
    road: "Road of Kings",
    attributes: A(4, 3, 4, 3, 2, 2, 2, 2, 3), abilities: {Brawl: 2, Dodge: 2, Intimidation: 2, Leadership: 2, Linguistics: 2, Melee: 2, Politics: 2, Ride: 2},
    backgrounds: {Allies: 2, Contacts: 1, Generation: 2, Herd: 1, Retainers: 1, Status: 1}, disciplines: {Celerity: 1, Potence: 1, Presence: 2},
    virtues: V("conviction", 2, "selfcontrol", 1, 3), willpower: 4, about: "Took the Cross for faith or for politics, and kept the sword after death."},
  {key: "heretic-priest", name: "Heretic Priest", line: "vampire", group: "Cainites", pdf: 61, clan: "Lasombra", generation: 12,
    road: "Road of Night",
    attributes: A(2, 2, 2, 4, 4, 3, 3, 3, 2), abilities: {Dodge: 1, Empathy: 2, Expression: 2, Leadership: 2, Linguistics: 2, Occult: 2, Politics: 2, Theology: 3},
    backgrounds: {Contacts: 2, Domain: 2, Herd: 2, Influence: 1, Retainers: 1}, disciplines: {Dominate: 2, Obtenebration: 1, Potence: 1},
    virtues: V("conviction", 3, "selfcontrol", 2, 1), willpower: 4, about: "Works inside the Church, the widest power of the age."},
  {key: "magus", name: "Magus", line: "vampire", group: "Cainites", pdf: 61, clan: "Tremere", generation: 12,
    road: "Road of Kings", path: "Path of the Vizier",
    attributes: A(2, 2, 2, 2, 3, 2, 4, 4, 4), abilities: {Academics: 3, Alertness: 2, Crafts: 1, Herbalism: 2, Intimidation: 1, Linguistics: 2, Medicine: 2, Occult: 3},
    backgrounds: {Allies: 1, Contacts: 2, Herd: 1, Mentor: 3, Resources: 1}, disciplines: {Auspex: 1, Dominate: 1, Thaumaturgy: 2},
    virtues: V("conscience", 1, "selfcontrol", 3, 2), willpower: 4, about: "A seeker of lore and power, a sorcerer before or after the Embrace."},
  {key: "power-behind-the-throne", name: "Power Behind the Throne", line: "vampire", group: "Cainites", pdf: 61, clan: "Ventrue", generation: 11,
    road: "Road of Kings",
    attributes: A(2, 2, 2, 3, 4, 2, 3, 4, 3), abilities: {Alertness: 2, Dodge: 1, Empathy: 2, Etiquette: 3, Law: 2, Leadership: 2, Politics: 2, Seneschal: 2},
    backgrounds: {Allies: 1, Contacts: 2, Domain: 2, Generation: 1, Influence: 2}, disciplines: {Dominate: 2, Fortitude: 1, Presence: 1},
    virtues: V("conviction", 2, "selfcontrol", 2, 2), willpower: 4, about: "Rules a mortal lord's lands from the shadow of the throne."}
];

export const GROUPS = ["Everyday mortals", "Notable mortals", "Ghouls", "Cainites"];
