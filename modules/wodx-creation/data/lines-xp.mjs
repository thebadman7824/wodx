/**
 * Experience charts for every line beyond the three in vampire.mjs (B6271). "cur" is the current rating, "next" the
 * new one. Each line follows its V20-era book first, then Revised or 2nd edition (never the 5th). Page numbers are pdf
 * pages in the book texts. House figures are marked and logged in docs/PENDING-REVIEW.md.
 *
 * Fields, as in vampire.mjs: newAbility, attribute, ability, virtue, road, willpower (per current dot; null: not
 * bought with experience), newDiscipline/clanDiscipline/otherDiscipline (Kuei-jin only).
 * stats:  {key: {label, per, max}}  a single rating at system.advantages.<key>.permanent, cost per current dot.
 * powers: {cat: {label, per, perOwn, newCost, newOther, max, byNext}}  rated powers (items, or Mage Spheres); per is
 *         the cost per current dot, perOwn the cost when it is the character's own (affinity, favoured); newCost the
 *         first dot, newOther the first dot when it is not their own (another House's Lore); byNext: the book prices
 *         by the new rating instead of the current one. Gifts: newByLevel / newByLevelOther, or newFlat / newFlatOther.
 */
export const LINE_XP = {
  "kuei-jin": {
    source: "Kindred of the East pdf 130",
    // New Ability and new Discipline are unreadable in the scan: V20's 3 and 10 (B6272, house)
    newAbility: 3, newDiscipline: 10, attribute: 4, ability: 2, clanDiscipline: 8, otherDiscipline: 8,
    // Dharma rises by the Storyteller's word, not by experience (B6272)
    virtue: null, road: null, willpower: 1,
    stats: {yin: {label: "Yin", per: 3, max: 10}, yang: {label: "Yang", per: 3, max: 10}, hun: {label: "Hun", per: 3, max: 10}, po: {label: "P'o", per: 1, max: 10}}
  },
  "werewolf": {
    source: "W20 pdf 246",
    newAbility: 3, attribute: 4, ability: 2, virtue: null, road: null, willpower: 1,
    stats: {rage: {label: "Rage", per: 1, max: 10}, gnosis: {label: "Gnosis", per: 2, max: 10}},
    powers: {gift: {label: "Gift", newByLevel: 3, newByLevelOther: 5, max: 1}}
  },
  "fera": {
    source: "W20 pdf 246 (the Changing Breeds spend as the Garou do)",
    newAbility: 3, attribute: 4, ability: 2, virtue: null, road: null, willpower: 1,
    stats: {rage: {label: "Rage", per: 1, max: 10}, gnosis: {label: "Gnosis", per: 2, max: 10}},
    powers: {gift: {label: "Gift", newByLevel: 3, newByLevelOther: 5, max: 1}}
  },
  "kinfolk": {
    source: "W20 Kinfolk: A Breed Apart pdf 66; the rest as mortals",
    newAbility: 3, attribute: 5, ability: 2, virtue: 2, road: 2, willpower: 1,
    // 15 for a Gift of the Kin's breed or tribe, +5 outside it; +5 more when a Garou teaches rather than a spirit
    powers: {gift: {label: "Gift", newFlat: 15, newFlatOther: 20, garouTeacher: 5, max: 1}}
  },
  "mage": {
    source: "M20 pdf 337",
    newAbility: 3, attribute: 4, ability: 2, virtue: null, road: null, willpower: 1,
    stats: {arete: {label: "Arete", per: 8, max: 10}},
    powers: {sphere: {label: "Sphere", per: 8, perOwn: 7, newCost: 10, max: 5, capBy: "arete"}}
  },
  "sorcerer": {
    source: "Sorcerer Revised pdf 46 (priced by the new rating)",
    newAbility: 3, attribute: 4, ability: 2, virtue: 2, road: 2, willpower: 1, byNext: true,
    powers: {numina: {label: "Path", per: 7, newCost: 7, max: 5, byNext: true}}
  },
  "changeling": {
    source: "C20 pdf 177",
    newAbility: 3, attribute: 4, ability: 2, virtue: null, road: null, willpower: 2,
    stats: {glamour: {label: "Glamour", per: 3, max: 10}},
    powers: {art: {label: "Art", per: 4, newCost: 7, max: 5}, realm: {label: "Realm", per: 3, newCost: 5, max: 5}}
  },
  "kinain": {
    source: "C20 pdf 177 for Arts and Realms; the rest as mortals (house, B6272)",
    newAbility: 3, attribute: 5, ability: 2, virtue: 2, road: 2, willpower: 1,
    powers: {art: {label: "Art", per: 4, newCost: 7, max: 3}, realm: {label: "Realm", per: 3, newCost: 5, max: 3}}
  },
  "wraith": {
    source: "Wraith 20th pdf 367",
    newAbility: 3, attribute: 4, ability: 2, virtue: null, road: null, willpower: 1,
    powers: {arcanos: {label: "Arcanos", per: 3, newCost: 7, max: 5}}
  },
  "hunter": {
    // Edges come from Virtue points the Storyteller awards, not from experience (HtR pdf 130)
    source: "Hunter: The Reckoning pdf 141",
    newAbility: 3, attribute: 4, ability: 2, virtue: null, road: null, willpower: 1
  },
  "mummy": {
    source: "Mummy: The Resurrection pdf 140",
    newAbility: 3, attribute: 4, ability: 2, virtue: null, road: null, willpower: 1,
    stats: {balance: {label: "Balance", per: 7, max: 10}},
    powers: {hekau: {label: "Hekau path", per: 6, perOwn: 4, newCost: 7, max: 5}}
  },
  "demon": {
    source: "Demon: The Fallen pdf 165",
    newAbility: 3, attribute: 4, ability: 2, virtue: 2, road: null, willpower: 1,
    stats: {faith: {label: "Faith", per: 7, max: 10}},
    powers: {lore: {label: "Lore", per: 5, newCost: 7, newOther: 10, max: 5}}
  },
  "creature": {
    source: "House: the mortal chart (B6272)",
    newAbility: 3, attribute: 5, ability: 2, virtue: null, road: null, willpower: 1
  },
  "exalted": {
    source: "House: the Kindred chart without Disciplines (B6272)",
    newAbility: 3, attribute: 4, ability: 2, virtue: null, road: null, willpower: 1
  }
};

/** Item shapes for the rated powers: how to find them on a sheet and how to make a new one. */
export const POWER_ITEMS = {
  gift:    {itemType: "Power", sysType: "wod.types.gift"},
  art:     {itemType: "Power", sysType: "wod.types.art"},
  arcanos: {itemType: "Power", sysType: "wod.types.arcanoi"},
  lore:    {itemType: "Power", sysType: "wod.types.lore"},
  hekau:   {itemType: "Power", sysType: "wod.types.hekau"},
  numina:  {itemType: "Power", sysType: "wod.types.numina"},
  realm:   {itemType: "Trait", sysType: "wod.types.realms", alsoItemType: "Realm"}
};

export const SPHERES = ["correspondence", "entropy", "forces", "life", "matter", "mind", "prime", "spirit", "time"];
