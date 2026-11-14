/**
 * WoDX Library: what inquisitors make (B3717-B3719). Data only; the kit is scripts/wonders-hunter.mjs. WoDX's own words
 * with page references, never book text.
 *
 * Ben's Item Crafting Desk (2026-11-13): h1 full. Inquisitors bless water, salt or a weapon for the scene through item
 * uses, and the orders can enshrine a relic (a saint's remains, the proper rites).
 *
 * The books: V20 Dark Ages says Holy Artifacts arise on their own and cannot be made (pdf 396); Dark Ages: Inquisitor
 * has relics only as a Background (p. 156) and gives each stage a True Faith equivalent (p. 158). So blessing and
 * enshrining are house rules from Ben's pick, always approved by the Storyteller (B3717). Only inquisitors (the Dark
 * Ages and before, WoDX years before 1500) make them; mortal hunters later and the imbued make nothing (B3718).
 */

export const DA = "V20 Dark Ages", DAI = "Dark Ages: Inquisitor";

export const ROWS = [
  {key: "holy-water", kind: "bless", name: "Bless water", book: DAI, page: 158, pdf: 394, item: "water",
    does: "A prayer over clean water, a vial a success. For the rest of the scene each vial carries the blesser's True Faith equivalent: it can be presented against the Damned and the dead as a holy symbol is, or splashed on one."},
  {key: "holy-salt", kind: "bless", name: "Bless salt", book: DAI, page: 158, pdf: 394, item: "salt",
    does: "Salt blessed and poured as a line across a door or around a bed. For the rest of the scene the line stands with the blesser's True Faith equivalent against the Damned, the dead and the demonic who would cross it."},
  {key: "holy-weapon", kind: "bless", name: "Bless a weapon", book: DAI, page: 158, pdf: 394, item: "weapon",
    does: "A blade or staff signed and prayed over. For the rest of the scene it can be raised as a holy symbol with the blesser's True Faith equivalent; a blow that lands while it is so raised is the Storyteller's to judge."},
  {key: "enshrine-relic", kind: "relic", name: "Enshrine a relic", book: DAI, page: 156, pdf: 396, item: "relic",
    does: "The order takes a saint's remains, or a thing a saint carried, and keeps the proper rites over weeks: vigil, procession, a reliquary made for it. If the Storyteller judges it truly holy, it becomes a relic with a True Faith rating of its own. Holding it adds that rating to the faithful's own; once a story an inquisitor praying over it draws back Conviction."}
];

export const byKey = Object.fromEntries(ROWS.map(r => [r.key, r]));
