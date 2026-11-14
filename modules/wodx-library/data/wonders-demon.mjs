/**
 * WoDX Library: what the Fallen make (B3712-B3716). Data only; the kit is scripts/wonders-demon.mjs. WoDX's own short
 * summaries with page references, never book text.
 *
 * Ben's Item Crafting Desk (2026-11-13): d1 full. Enchant Object and Imbue Object (the Lore of the Forge) make an item
 * that holds an evocation, with its Faith, its uses and its high-Torment version.
 *
 * Demon: The Fallen is the only book for the line, every era (Revised). Page numbers are the PDF's (pdf 192, book p. 191).
 */

export const DTF = "Demon: The Fallen";

/** How much an enchantment does, and the successes it asks (pdf 192). */
export const SCOPES = {
  simple: {label: "Simple: a blade that never dulls", goal: 1},
  notable: {label: "Notable: a key that opens any lock", goal: 5},
  great: {label: "Great: a mirror that shows a mortal's dearest wish", goal: 10},
  greater: {label: "Greater still, at the Storyteller's word", goal: 15}
};

export const ROWS = [
  {key: "enchant-object", kind: "enchant", name: "Enchant Object", lore: "forge", level: 4, book: DTF, pdf: 192,
    does: "Puts an evocation into a thing. The maker needs the lore that does what the object will do (a mirror of false beauty needs Light). Extended Dexterity + Crafts and a point of Faith; difficulty 6 for a thing the maker made, 8 for one made by others. A botch destroys the thing. Nothing electronic can hold it. Mortals and thralls call on it with Willpower (difficulty 8), the Fallen with Faith (difficulty 6), each time; a botch costs a point. Attuning it for a permanent point of Willpower or Faith makes the roll unneeded. It lasts until broken.",
    cursed: "Made by a monstrous demon it is cursed: it botches on a 1 or 2, always against the user or someone close; mortals lose a Willpower each use and demons gain a temporary Torment, with no roll."},
  {key: "imbue-object", kind: "imbue", name: "Imbue Object", lore: "forge", level: 5, book: DTF, pdf: 192,
    does: "Binds a soul with no body (a demon out of its host, a ghost) into a vessel of natural stuff shaped by hand, within the maker's Faith in yards. A point of Faith and Stamina + Crafts against the soul's Willpower; difficulty 6 if the maker shaped the vessel, else 8. A bound mortal soul cannot touch the world; a bound demon keeps its lores and pacts while it has Faith. Only breaking the vessel frees it.",
    cursed: "A monstrous binder twists the soul: a mortal gains a permanent derangement, a demon gains permanent Torment equal to the binding's successes."}
];

export const byKey = Object.fromEntries(ROWS.map(r => [r.key, r]));
