/**
 * Vampire and ghoul mechanics used by WoDX Creation. Numbers and names only, with the book and page they come
 * from; no book text. "WoDX choice" marks a value the books leave open.
 *
 * Books: V20 Dark Ages (V20DA), V20 core (V20), V20 Ghouls and Revenants (G&R).
 */

/** Generation chart: the same in V20DA p. 340 and V20 p. 270. Thirteenth and higher share one row. */
export const GENERATIONS = {
  source: "V20 Dark Ages p. 340; V20 p. 270",
  rows: {
    3: {maxTrait: 10, bloodMax: null, perTurn: null},
    4: {maxTrait: 9, bloodMax: 50, perTurn: 10},
    5: {maxTrait: 8, bloodMax: 40, perTurn: 8},
    6: {maxTrait: 7, bloodMax: 30, perTurn: 6},
    7: {maxTrait: 6, bloodMax: 20, perTurn: 4},
    8: {maxTrait: 5, bloodMax: 15, perTurn: 3},
    9: {maxTrait: 5, bloodMax: 14, perTurn: 2},
    10: {maxTrait: 5, bloodMax: 13, perTurn: 1},
    11: {maxTrait: 5, bloodMax: 12, perTurn: 1},
    12: {maxTrait: 5, bloodMax: 11, perTurn: 1},
    13: {maxTrait: 5, bloodMax: 10, perTurn: 1}
  }
};

/**
 * Clans and their Disciplines. Dark Ages Disciplines from V20DA chapter 2 (pages per clan). `modern` lists a clan whose
 * main Disciplines differ after the Dark Ages (V20 chapter 2).
 * `aliases` match the names Rothenstein and upstream use.
 */
export const CLANS = [
  {id: "assamite", name: "Assamite", disciplines: ["Auspex", "Presence", "Quietus"], darkAges: "V20DA p. 42 (viziers)",
    modern: ["Celerity", "Obfuscate", "Quietus"], modernSource: "V20 p. 49", aliases: ["banu haqim", "saracen"]},
  {id: "brujah", name: "Brujah", disciplines: ["Celerity", "Potence", "Presence"], darkAges: "V20DA p. 44"},
  {id: "cappadocian", name: "Cappadocian", disciplines: ["Auspex", "Fortitude", "Necromancy"], darkAges: "V20DA p. 46"},
  {id: "gangrel", name: "Gangrel", disciplines: ["Animalism", "Fortitude", "Protean"], darkAges: "V20DA p. 48"},
  {id: "lasombra", name: "Lasombra", disciplines: ["Dominate", "Obtenebration", "Potence"], darkAges: "V20DA p. 50"},
  {id: "malkavian", name: "Malkavian", disciplines: ["Auspex", "Dementation", "Obfuscate"], darkAges: "V20DA p. 52"},
  {id: "nosferatu", name: "Nosferatu", disciplines: ["Animalism", "Obfuscate", "Potence"], darkAges: "V20DA p. 54"},
  {id: "ravnos", name: "Ravnos", disciplines: ["Animalism", "Chimerstry", "Fortitude"], darkAges: "V20DA p. 56"},
  {id: "setite", name: "Followers of Set", disciplines: ["Obfuscate", "Presence", "Serpentis"], darkAges: "V20DA p. 58",
    aliases: ["setite", "set"]},
  {id: "toreador", name: "Toreador", disciplines: ["Auspex", "Celerity", "Presence"], darkAges: "V20DA p. 60"},
  {id: "tremere", name: "Tremere", disciplines: ["Auspex", "Dominate", "Thaumaturgy"], darkAges: "V20DA p. 62"},
  {id: "tzimisce", name: "Tzimisce", disciplines: ["Animalism", "Auspex", "Vicissitude"], darkAges: "V20DA p. 64",
    aliases: ["old clan tzimisce"]},
  {id: "ventrue", name: "Ventrue", disciplines: ["Dominate", "Fortitude", "Presence"], darkAges: "V20DA p. 66"},
  {id: "salubri-healer", name: "Salubri (Healer)", disciplines: ["Auspex", "Presence", "Valeren"], darkAges: "V20DA p. 100",
    aliases: ["salubri healer"]},
  {id: "salubri-warrior", name: "Salubri (Warrior)", disciplines: ["Auspex", "Fortitude", "Valeren"], darkAges: "V20DA p. 102",
    aliases: ["salubri warrior", "salubri"]},
  {id: "baali", name: "Baali", disciplines: ["Daimonion", "Obfuscate", "Presence"], darkAges: "V20DA p. 74"},
  {id: "caitiff", name: "Caitiff", disciplines: [], darkAges: "V20 p. 124 (no clan Disciplines)", aliases: ["clanless"]}
];

/**
 * Experience costs. "cur" is the current rating. Vampires: V20DA p. 183 and V20 p. 124 (Caitiff: V20 p. 124).
 * Ghouls: V20DA p. 399 for Disciplines in every era (Ben's choice); G&R p. 139 for the rest, since V20DA is silent.
 * Mortals: WoDX choice, the ghoul table without Disciplines.
 */
export const XP = {
  vampire: {
    source: "V20 Dark Ages p. 183; V20 p. 124",
    newAbility: 3, newDiscipline: 10,
    attribute: 4, ability: 2, clanDiscipline: 5, otherDiscipline: 7, caitiffDiscipline: 6,
    virtue: 2, road: 2, willpower: 1
  },
  ghoul: {
    source: "V20 Dark Ages p. 399 (Disciplines); V20 Ghouls and Revenants p. 139 (the rest)",
    newAbility: 3, newDiscipline: 20,
    attribute: 5, ability: 2, clanDiscipline: 15, otherDiscipline: 25,
    virtue: 2, road: 2, willpower: 1
  },
  mortal: {
    source: "WoDX choice: the ghoul table (V20 Ghouls and Revenants p. 139) without Disciplines",
    newAbility: 3, newDiscipline: null,
    attribute: 5, ability: 2, clanDiscipline: null, otherDiscipline: null,
    virtue: 2, road: 2, willpower: 1
  }
};

/** Ghouls (V20DA p. 399). */
export const GHOUL = {
  source: "V20 Dark Ages p. 399",
  bloodMax: 10,
  bloodMaxPerCentury: 1,
  perTurn: 1,
  firstDrinkPotence: 1,
  alwaysAvailable: ["Celerity", "Fortitude", "Potence"],
  /** Highest Discipline level by the domitor's Generation; 8th and higher give 1. */
  disciplineCap: {3: null, 4: 5, 5: 4, 6: 3, 7: 2},
  weaknessAtBlood: 5
};

/** The blood oath (V20DA pp. 341–342): three drinks on three separate nights. */
export const BOND = {source: "V20 Dark Ages pp. 341–342", drinksToBind: 3};

/** The Embrace (V20DA p. 13, p. 111, p. 144). */
export const EMBRACE = {
  source: "V20 Dark Ages p. 13 (the Embrace), p. 111 (Road of Humanity on the Embrace)",
  road: "Road of Humanity",
  // WoDX choice: the childe rises hungry with one blood point, and with no Discipline dots until learned
  startBlood: 1,
  // V20DA p. 144: every character starts at the Twelfth Generation unless the Generation Background says otherwise
  unknownSireGeneration: 12
};
