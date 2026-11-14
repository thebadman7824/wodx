/**
 * WoDX Library: what the Kuei-jin make (B3770-B3779). Data only; the kit is scripts/wonders-kuei-jin.mjs. WoDX's own
 * words with page references, never book text.
 *
 * The Item Crafting Desk (2026-11-14, kj2): full. Kindred of the East has jade talismans only as a Background
 * (pp. 86-87), but the Companion gives the wangyu, the masters of Jade Shintai, two powers that make things: Blade of
 * Stone (a weapon shaped from stone) and Taste of Jade (ordinary jade made true for some nights). Both are here.
 */

export const KOTE = "Kindred of the East", KOTEC = "Kindred of the East Companion", V20 = "Vampire: The Masquerade 20th Anniversary";

/** The shapes a stone weapon takes, with the V20 Melee Weapons Chart damage (p. 281); the power adds two and makes it aggravated. */
export const SHAPES = {
  knife: {label: "Knife or dagger", bonus: 1, conceal: "J"},
  sword: {label: "Sword or katana", bonus: 2, conceal: "T"},
  club: {label: "Club, staff or tetsubo", bonus: 2, conceal: "T"},
  axe: {label: "Axe", bonus: 3, conceal: "N"},
  stake: {label: "Stake or spike", bonus: 1, conceal: "T"}
};

export const ROWS = [
  {key: "blade-of-stone", kind: "blade", name: "Blade of Stone", power: "blade of stone", book: KOTEC, page: 67, pdf: 67, art: "Jade Shintai",
    does: "The wangyu lays a hand on a cubic foot or more of stone (a wall, a boulder, a grave marker) and draws a melee weapon of any shape out of it. The stone weapon strikes for aggravated damage: the dice its shape would normally do, plus two. Pulling stone out of a wall may weaken it; the Storyteller judges what follows."},
  {key: "taste-of-jade", kind: "jade", name: "Taste of Jade", power: "taste of jade", book: KOTEC, page: 67, pdf: 67, art: "Jade Shintai", talisman: {book: KOTE, page: 86},
    does: "An hour of stillness over a piece of ordinary jade attunes it to Yin or to Yang and makes it true jade for a night a success. While it lasts it works as a two-dot Jade Talisman: where the Wall is 6 or lower it can drink in ambient Chi once a night (two dice, difficulty the Wall plus three, a point a success, two at most), and whoever holds it can draw that Chi out in a turn of concentration. Anyone may carry it, give it away or lose it. If a roll that spends its Chi botches, the jade bursts for two dice of lethal damage to the one using it."}
];

export const byKey = Object.fromEntries(ROWS.map(r => [r.key, r]));
