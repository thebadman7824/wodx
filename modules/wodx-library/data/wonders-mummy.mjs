/**
 * WoDX Library: what the Reborn make (B3706-B3711). Data only; the kit is scripts/wonders-mummy.mjs. Every row is WoDX's
 * own short summary with a page reference, never book text.
 *
 * Ben's Item Crafting Desk (2026-11-13): mu1 full. The finished Hekau ritual makes the item: an amulet's Attribute bonus
 * while worn, a Sekhem Vessel's store, an ushabti (a Servitor effigy) as an NPC servant, and each counts against the
 * limit on active amulets and effigies.
 *
 * Mummy: The Resurrection is the book for every era (Revised; no V20 for the line). Page numbers are the PDF's (book page
 * less five). Crafting an amulet (pdf 85 to 86) or an effigy (pdf 102): the thing is made or bought, then the maker
 * inscribes it with an extended roll of the ritual's pool, gathering successes equal to its Sekhem. An amulet lasts
 * Amulets + Balance months and is renewed with one success and its full Sekhem; an effigy does not lapse but most cost
 * Sekhem to keep. Active amulets and effigies: at most Balance + the higher of Amulets and Effigy (pdf 73).
 */

export const MTR = "Mummy: The Resurrection";
export const PATHS = {amulets: "Amulets", effigy: "Effigy"};

/** The traits a ritual's pool can use: where the sheet keeps them. */
export const TRAITS = {craft: {label: "Crafts", path: "system.abilities.craft"}, occult: {label: "Occult", path: "system.abilities.occult"},
  survival: {label: "Survival", path: "system.abilities.survival"}, perception: {label: "Perception", path: "system.attributes.perception"},
  thanatology: {label: "Thanatology", path: "system.abilities.thanatology"}};

const A = (key, name, level, trait, diff, sekhem, pdf, does, item = {}) => ({key, name, path: "amulets", level, trait, diff, sekhem, book: MTR, pdf, does, item});
const E = (key, name, level, trait, diff, sekhem, pdf, does, item = {}) => ({key, name, path: "effigy", level, trait, diff, sekhem, book: MTR, pdf, does, item});

export const ROWS = [
  A("simple-ward", "Simple Ward", 1, "craft", 6, 5, 87, "A ward at rating 1 against one named harm: a part of the body, or one kind of magic.", {ward: 1}),
  A("wood-ward", "Wood Ward", 1, "craft", 7, 10, 87, "Its maker's Amulets rating is added to Stamina to soak harm from wood.", {soakVs: "wood"}),
  A("lesser-talisman", "Lesser Talisman", 2, "craft", 7, 8, 88, "+1 to one Attribute while worn; other Hekau on the same Attribute do not add to it.", {worn: 1}),
  A("lesser-ward", "Lesser Ward", 2, "craft", 7, 10, 88, "A Simple Ward at rating 2.", {ward: 2}),
  A("cloud-walking", "Amulet of Cloud Walking", 2, "occult", 7, 12, 88, "The wearer rises as high as the clouds and walks on the air."),
  A("scarab-life", "Scarab of Life", 2, "thanatology", 7, 10, 89, "Protection for a living wearer (see the page)."),
  A("metal-ward", "Metal Ward", 3, "craft", 7, 18, 89, "As the Wood Ward, against metal; metal grows soft near the wearer.", {soakVs: "metal"}),
  A("major-ward", "Major Ward", 3, "craft", 7, 18, 89, "A Simple Ward at rating 3.", {ward: 3}),
  A("veil-amaunet", "Veil of Amaunet", 3, "perception", 8, 20, 89, "Beasts cannot sense the wearer, shapeshifters in animal shape included."),
  A("gebs-blessing", "Geb's Blessing", 4, "survival", 8, 50, 90, "Weather and natural extremes leave the wearer alone; it adds to soak (see the page)."),
  A("greater-talisman", "Greater Talisman", 4, "craft", 7, 30, 91, "+2 to one Attribute while worn.", {worn: 2}),
  A("greater-ward", "Greater Ward", 4, "craft", 7, 40, 91, "A Simple Ward at rating 4.", {ward: 4}),
  A("buckle-isis", "Buckle of Isis", 5, "occult", 8, 80, 91, "The goddess's own protection (see the page)."),
  A("princely-talisman", "Princely Talisman", 5, "craft", 8, 75, 91, "+3 to one Attribute while worn.", {worn: 3}),
  A("princely-ward", "Princely Ward", 5, "craft", 8, 80, 91, "A Simple Ward at rating 5.", {ward: 5}),
  A("scarab-death", "Scarab of Death", 5, "craft", 7, 50, 91, "Harm done to the wearer's spirit in the Underworld falls on the body instead."),
  E("simple-servitor", "Ushabti (Simple Servitor)", 1, "craft", 6, 1, 104,
    "A small figure of clay, wood or stone that works as a servant. It follows plain orders (dig, sweep, carry, follow, stop) and freezes at anything harder. It cannot fight or heal, takes no wound penalties and breaks after three health levels of harm.",
    {servant: {health: 3, fights: false, upkeep: 1, every: "month", attrs: {strength: 2, dexterity: 1, stamina: 2}}}),
  E("simple-creature", "Simple Creature", 1, "craft", 6, 3, 103, "A tiny animal figure that wakes to do simple tasks.",
    {servant: {health: 3, fights: false, upkeep: 1, every: "week", beast: "tiny", attrs: {strength: 1, dexterity: 3, stamina: 1}}}),
  E("lesser-creature", "Lesser Creature", 2, "craft", 7, 4, 105, "An animal from cat to vulture size that follows plain commands.",
    {servant: {health: 5, fights: true, upkeep: 1, every: "week", beast: "small", attrs: {strength: 2, dexterity: 3, stamina: 2}}}),
  E("major-creature", "Major Creature", 3, "craft", 8, 8, 106, "A medium animal, venom and all.",
    {servant: {health: 7, fights: true, upkeep: 2, every: "week", beast: "medium", attrs: {strength: 3, dexterity: 3, stamina: 3}}}),
  E("overseer", "Overseer", 3, "craft", 7, 2, 107, "A statue servant that directs other servitors.",
    {servant: {health: 3, fights: false, upkeep: 1, every: "week", attrs: {strength: 2, dexterity: 2, stamina: 2}, leads: true}}),
  E("sekhem-vessel", "Sekhem Vessel", 3, "craft", 6, 8, 107,
    "Any container inscribed to hold Sekhem. Only an Effigy artisan fills it, choosing how much at the making; any mummy draws on it with a Balance roll at difficulty 4, a point a success, never past their own maximum. One vessel at a time helps a mummy.",
    {vessel: true}),
  E("superior-creature", "Superior Creature", 4, "craft", 8, 15, 108, "A large beast with nearly human wits.",
    {servant: {health: 7, fights: true, upkeep: 1, every: "day", beast: "large", attrs: {strength: 4, dexterity: 3, stamina: 4, perception: 3, wits: 3}}})
];

export const byKey = Object.fromEntries(ROWS.map(r => [r.key, r]));
