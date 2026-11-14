/**
 * WoDX Library: what changelings make (B3700-B3705). Data only; the kit is scripts/wonders-changeling.mjs. Every row is
 * WoDX's own short summary with a page reference, never book text.
 *
 * Ben's Item Crafting Desk (2026-11-13): c1 full (gather dreamstuff, then a craft task shapes or forges it; the item is
 * chimerical; a forged chimera gets simple traits as a companion) and c2 full (a Treasure maker using an Art, with
 * Glamour costs, making an item with its Art stored and a Glamour pool).
 *
 * C20 is the book for every era: Dark Ages: Fae was searched and has no rule for making chimerical things or Treasures
 * (B3701). Crafting chimera works as mortal crafting does, with materials from the Dreaming (C20 book p. 317, pdf 318):
 * Dexterity + Crafts, a roll a week, difficulty by scope (6 to 10, never under 3), successes by scope (pdf 319).
 */

export const C20 = "C20";

/** Scopes of work: base difficulty and the successes the Storyteller would usually ask (C20 pdf 318 to 319). */
export const SCOPES = {
  simple: {label: "Simple: plain everyday things", diff: 6, goal: 3},
  basic: {label: "Basic: plain weapons, shields, tools", diff: 7, goal: 8},
  advanced: {label: "Advanced: full armor, a unique weapon, a house", diff: 8, goal: 13},
  complex: {label: "Complex: machinery, clockwork steeds", diff: 9, goal: 20},
  masterwork: {label: "Masterwork: castles, legendary weapons, airships", diff: 10, goal: 26}
};

/** Where the work is done, and the tools: difficulty changes (C20 pdf 319). */
export const PLACES = {realm: {label: "In a dream realm", mod: -2}, freehold: {label: "In a freehold or the Near Dreaming", mod: -1},
  low: {label: "A mundane place of low Banality (1 to 4)", mod: -1}, medium: {label: "A mundane place of middling Banality (5 to 8)", mod: 1},
  extreme: {label: "A place of crushing Banality (9 to 10)", mod: 3}};
export const TOOLS = {special: {label: "Specialized tools and workspace", mod: -2}, basic: {label: "Basic tools", mod: -1}, improper: {label: "The wrong tools or workspace", mod: 1},
  broken: {label: "Broken tools, a poor workspace", mod: 2}, none: {label: "No tools, the wrong materials", mod: 3}};

/** The C20 Arts, for Treasures. */
export const ARTS = {autumn: "Autumn", chicanery: "Chicanery", chronos: "Chronos", contract: "Contract", dragonsire: "Dragon's Ire", legerdemain: "Legerdemain",
  metamorphosis: "Metamorphosis", naming: "Naming", oneiromancy: "Oneiromancy", primal: "Primal", pyretics: "Pyretics", skycraft: "Skycraft", soothsay: "Soothsay",
  sovereign: "Sovereign", spring: "Spring", summer: "Summer", wayfare: "Wayfare", winter: "Winter"};

export const ROWS = [
  {key: "dreamstuff", kind: "gather", name: "Gather dreamstuff", book: C20, pdf: 318, house: true,
    does: "Raw chimerical stuff (dream steel, enchanted wood, quarried dream stone, cloth, berries) taken in the Dreaming, bought at a freehold market, or fetched by hirelings who may bring back the wrong thing. Each success is one measure of material.",
    roll: {attr: "perception", ability: "gremayre", diff: 6}},
  {key: "voile", kind: "craft", scope: "simple", name: "Voile (faerie garb)", book: C20, pdf: 318, item: "voile", stuff: 1,
    does: "Chimerical clothing. It grants no power, though cloth spun from a fire spider or an ice drake may carry a small effect of its material."},
  {key: "chimerical-thing", kind: "craft", scope: "simple", name: "An everyday chimerical thing", book: C20, pdf: 318, item: "thing", stuff: 1,
    does: "A cup, a lamp, a chair, a book: a plain thing made of dream materials."},
  {key: "chimerical-weapon", kind: "craft", scope: "basic", name: "A chimerical weapon", book: C20, pdf: 318, item: "weapon", stuff: 2,
    does: "Wounds land on the Glamour and the faerie mien, not the flesh; a chimerical death leaves a changeling waking without memory of the fae self. Mortals see only the mundane side, if it has one."},
  {key: "chimerical-shield", kind: "craft", scope: "basic", name: "A chimerical shield or tool", book: C20, pdf: 318, item: "thing", stuff: 2,
    does: "A plain shield or tool of dream materials."},
  {key: "chimerical-armor", kind: "craft", scope: "advanced", name: "Chimerical armor", book: C20, pdf: 318, item: "armor", stuff: 3,
    does: "A full suit of armor of dream metal or scale; it turns chimerical blows."},
  {key: "unique-weapon", kind: "craft", scope: "advanced", name: "A unique chimerical weapon", book: C20, pdf: 318, item: "weapon", stuff: 3, better: true,
    does: "A signature blade or the like, made to one design. Planning first is wise."},
  {key: "forged-chimera", kind: "craft", scope: "complex", name: "A forged chimera (servant, steed or pet)", book: C20, pdf: 317, item: "chimera", stuff: 4,
    does: "A clockwork or forged body given a semblance of life. It does what its maker built it for and nothing more, though one may one day wake to itself. It is made as a companion with chimera points (C20 pdf 321 to 322)."},
  {key: "masterwork", kind: "craft", scope: "masterwork", name: "A masterwork of the Dreaming", book: C20, pdf: 318, item: "thing", stuff: 6,
    does: "A castle, a legendary weapon, an airship: work of years, and the Storyteller's to define."},
  {key: "treasure-imbued", kind: "imbue", name: "Imbue a Treasure", book: C20, pdf: 325,
    does: "A mundane thing that touched creativity (a famous guitar, a street artist's spray can, a killer's weapon) is studied and fed Glamour until it holds one of the maker's Arts. Intelligence + Gremayre each hour, five successes a level, a point of Glamour given for each level. The maker must know the Art at that level."},
  {key: "treasure-crafted", kind: "treasure", scope: "advanced", name: "Craft a Treasure", book: C20, pdf: 325,
    does: "Built from mystic components, one for each level of the Art it will hold, gathered on quests; then crafting is just crafting. The maker need not know the Art."}
];

/** Chimera points for a forged chimera: what each buys (C20 pdf 321 to 322). Average Near Dreaming chimera: 15 to 35. */
export const CHIMERA_COST = {attrs: 3, abilities: 3, glamour: 1, willpowerCost: 3, healthPer: 2};
export const CHIMERA_POINTS = {complex: 20, masterwork: 35};

export const byKey = Object.fromEntries(ROWS.map(r => [r.key, r]));
