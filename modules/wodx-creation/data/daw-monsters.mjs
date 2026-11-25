/**
 * WoDX Creation: the fomori and monsters of Dark Ages: Werewolf (pp. 186-189), B7939. Numbers from the book's stat
 * blocks (book-text OCR, printed page = marker - 1); the descriptions and rules are WoDX's own words. Each is made as a
 * Creature (dac-demons.mjs), with its fomor powers as Power items that WoDX Actions' fomor rules read (Armored Hide,
 * Regeneration, Immunity to the Delirium, Poison Tumors, Footpads), its natural weapons and, for the Fir Bolgs, a hide
 * of four soak dice. Where the book gives a range (a Skull Pig's Perception 2-4) the middle is taken.
 */
export const BOOK = "Dark Ages: Werewolf";
export const GROUP = "Fomori and monsters of Dark Ages: Werewolf";
export const MONSTERS = [
  {key: "aughisky", name: "Aughisky", group: GROUP, p: 186, kind: "monster",
    attributes: {strength: 7, dexterity: 4, stamina: 4, charisma: 0, manipulation: 0, appearance: 0, perception: 3, intelligence: 2, wits: 3},
    abilities: {Alertness: 3, "Animal Ken": 3, Brawl: 4, Dodge: 3, Intimidation: 4, Occult: 2, Stealth: 3, Survival: 3},
    disciplines: {}, paths: {}, blood: 0, willpower: 5, health: {0: 2, "-1": 2, "-2": 1, "-3": 2, "-5": 1}, end: "Incapacitated",
    powers: ["Armored Hide", "Footpads", "Immunity to the Delirium", "Regeneration"],
    weapons: [{name: "Hoof strike", bonus: 1, type: "aggravated"}, {name: "Bite", bonus: 1, type: "aggravated"}],
    attack: "a hoof strike or a bite, Strength + 1 aggravated",
    about: "A Bane bound into a horse: a black, heavy-muscled mount with hellfire-orange eyes and hooves filed to points, haunting marshes, orchards and lonely crossroads to feast on travellers' bones; now and then a war stallion for a Black Spiral pack.",
    rules: ["The book gives no Willpower: 5 is WoDX's reading.", "Footpads: the book's fomor power is one easier on Stealth (p. 187); WoDX Actions' fomor rules count two, as Werewolf 20th."]},
  {key: "lazarite", name: "Lazarite", group: GROUP, p: 186, kind: "monster",
    attributes: {strength: 2, dexterity: 2, stamina: 2, charisma: 1, manipulation: 2, appearance: 1, perception: 2, intelligence: 2, wits: 2},
    abilities: {Alertness: 1, Brawl: 1, "Hearth Wisdom": 1, Stealth: 1, Survival: 2},
    disciplines: {}, paths: {}, blood: 0, willpower: 3,
    powers: ["Immunity to the Delirium", "Poison Tumors"],
    about: "A leper ridden by a Breeder Bane for one end: to bear the children of Black Spiral Dancers. The sickness eases through the carrying, the unborn kept clean by the Umbra's dark; at last the body fails and the Bane seeks another. A stronger leper may be ridden as a guard for the mothers.",
    rules: ["The book gives \"as a human\": WoDX gives an ordinary peasant's numbers.", "Struck, the tumors burst (Poison Tumors): the book has three aggravated levels on the attacker, four on a bite (p. 187); WoDX Actions' fomor rules burst three lethal dice on all within a yard, as Werewolf 20th."]},
  {key: "skull-pig", name: "Skull Pig", group: GROUP, p: 187, kind: "monster",
    attributes: {strength: 5, dexterity: 4, stamina: 8, charisma: 0, manipulation: 0, appearance: 0, perception: 3, intelligence: 2, wits: 3},
    abilities: {Alertness: 2, Athletics: 5, Brawl: 5, Dodge: 3, Intimidation: 4, "Primal-Urge": 3, Stealth: 2, Survival: 4},
    disciplines: {}, paths: {}, blood: 0, willpower: 4, rage: 5, gnosis: 3, health: {0: 2, "-1": 3, "-2": 3, "-5": 1}, end: "Incapacitated",
    powers: ["Regeneration"],
    weapons: [{name: "Tusks", bonus: 1, type: "lethal"}],
    attack: "tusks, Strength + 1",
    about: "A huge, pallid boar whose skin is stretched so thin on the skull it seems to have none: the maddened remnant of the Grondr, the cleansing Fera the Garou all but destroyed. They root through graveyards in packs of six or seven and prize the flesh of the plague dead; a cleverer one may lead and use Black Spiral Gifts.",
    rules: ["Poison Flesh: anything that bites a Skull Pig rolls Stamina at 6 or takes an aggravated level; Resist Toxin defends (p. 188).",
      "It regains Gnosis by eating the dead, more from the Wyrm-tainted.", "The book gives no damage type for the tusks: lethal is WoDX's reading."]},
  {key: "fir-bolg", name: "Fir Bolg", group: GROUP, p: 188, kind: "monster",
    attributes: {strength: 8, dexterity: 4, stamina: 5, charisma: 2, manipulation: 4, appearance: 1, perception: 4, intelligence: 3, wits: 3},
    abilities: {Alertness: 4, Archery: 3, Athletics: 5, Brawl: 5, Dodge: 4, "Hearth Wisdom": 5, Intimidation: 5, Melee: 3, Occult: 3, Survival: 4},
    disciplines: {}, paths: {}, blood: 0, willpower: 7, health: {0: 3, "-1": 2, "-2": 3, "-5": 1}, end: "Incapacitated",
    powers: ["Immunity to the Delirium", "Regeneration"],
    armor: {name: "Fir Bolg's hide", soak: 4},
    about: "One of a warrior race once allied to the Fianna, who sided with iron-wielding tribes against the Tuatha de Danaan and were driven from Ireland, cursed never to return; the remnant waits in England and Scotland. Swarthy and two heads taller than a Garou in Crinos, yet as quick in a fight as a werewolf without Rage.",
    rules: ["Willpower 5 to 9 in the book: 7 here.", "Often taken for a werebear by Garou who know of the Gurahl.", "Hearth Wisdom is of Ireland."]}
];
