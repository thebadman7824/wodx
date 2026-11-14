/**
 * WoDX Library: what a mage can make (B3684-B3688), in WoDX's own words with page refs. Data only; the rules are in
 * scripts/wonders-mage.mjs. M20 core gives the short rules (Crafting Wonders chart, pdf 509; Appendix II, pdf
 * 652-654); M20 Book of Secrets gives the fuller ones WoDX follows (Crafting Wonders, pdf 152-162).
 *
 * Row: {key, name, tech (the Technocracy's name), kind, needs (Sphere minimums to seal it, beside the Effects' own),
 *   alt (another way to meet needs), effects (how many Effects it holds: "dots", 1 or 0), goal (successes: per dot,
 *   per item or per Effect level), tass, quintPerDot, willpower, does, book, pdf}
 */
const M20 = "M20 core", BOS = "M20 Book of Secrets";

export const MAGE_WONDERS = [
  {key: "talisman", name: "Talisman", tech: "Device", kind: "talisman", needs: {prime: 4}, effects: "dots", goalPerDot: 6, quintPerDot: 5, willpower: 1,
    does: "A self-contained magickal item with its own Arete, holding up to one Effect for each dot. It works for anyone whose beliefs let it, and its vulgar uses bring Paradox to whoever uses it.",
    book: BOS, pdf: 161, also: `${M20}, pdf 509, 653-654`},
  {key: "charm", name: "Charm", tech: "Gadget", kind: "charm", needs: {prime: 3}, alt: {prime: 2, fits: true}, effects: 1, goalPerItem: 2,
    does: "A small one-use Wonder holding a single Effect; it is spent the moment it is used. A mage can make up to twice their Arete in charms at one sitting.",
    book: BOS, pdf: 161},
  {key: "periapt", name: "Periapt", tech: "Matrix", kind: "periapt", needs: {matter: 5, prime: 3}, alt: {life: 5, prime: 3, living: true}, effects: 0, goalPerDot: 3, tass: 10,
    does: "A lasting vessel for Quintessence: it holds five points for each dot. A mage with Prime 2 draws from it, or pours Quintessence back in, with a turn of focus.",
    book: BOS, pdf: 161, also: `${M20}, pdf 653`},
  {key: "trinket", name: "Trinket", tech: "Trinket", kind: "trinket", needs: {prime: 2}, effects: 1, goalPerFeat: 2,
    does: "A simple, single-purpose thing made better by magick, such as an unbreakable glass or a blade that never dulls. It needs no Arete to use and keeps working until something unravels it.",
    book: BOS, pdf: 162, also: `${M20}, pdf 653`}
];

/**
 * How a mage binds a spirit into a Fetish (M20 Crafting Wonders, pdf 509; Book of Secrets, pdf 161): Spirit 4 to force
 * an unwilling spirit (an unreliable fetish), or Prime 4 and a bargain with a willing one. The fetishes themselves are
 * the Garou list (Ben's Item Crafting Desk, m3).
 */
export const MAGE_FETISH = {needsForced: {spirit: 4}, needsWilling: {prime: 4}, goalPerLevel: 3, book: BOS, pdf: 161,
  use: "A mage asks the spirit for its power: Willpower at difficulty 7, and on a success the fetish's Gnosis is the pool (M20 pdf 653)."};

/** Difficulty of the Arete rolls (Book of Secrets pdf 157): the highest Sphere + 4, or + 3 in the mage's Sanctum; purification takes off up to 3. */
export const DIFF = {vulgar: 4, sanctum: 3, purifyMax: 3, floor: 3};

export const byKey = Object.fromEntries(MAGE_WONDERS.map(w => [w.key, w]));
