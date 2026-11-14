/**
 * Taxes on the month's upkeep (B3616-B3617): the pure part. No Foundry here, so the harness can test it.
 *
 * A character's monthly allowance (WoDX Storyteller's money) is already what is left after the usual taxes of the
 * land: the tithe, the lord's dues, the poll tax, the income tax. This says how big that usual share is where and when
 * the character lives, so a character who hides the harvest, keeps two sets of books or never files can keep it, at
 * the risk of the law noticing (the law's heat, B3606). In some years a levy takes more on top: war contributions,
 * poll taxes, requisitions.
 * A character who holds a seat in a tax office is the collector: their own dodging is hard to catch, and they decide
 * how hard to squeeze. A levy also weighs on every town of the land (WoDX Storyteller's towns), so a crushing one
 * brings riots and risings. The years are rounded history; the shares and chances are house figures
 * (docs/PENDING-REVIEW.md).
 */
import {paperWeight} from "./law-papers-rules.mjs";

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** The usual share of income the taxes of the land take, by year (house figures). "*" for any family not named. */
export const SHARE = {
  "*": [[0, 0.15], [1700, 0.12], [1800, 0.1], [1914, 0.2], [1945, 0.3], [1980, 0.35]],
  japanese: [[0, 0.3], [1600, 0.4], [1873, 0.25], [1945, 0.3], [1980, 0.35]],
  islamic: [[0, 0.12], [1914, 0.15], [1950, 0.2], [1980, 0.25]],
  chinese: [[0, 0.1], [1912, 0.15], [1950, 0.25], [1980, 0.3]],
  african: [[0, 0.1], [1890, 0.15], [1960, 0.2], [1980, 0.25]],
  americas: [[0, 0.1], [1913, 0.15], [1945, 0.25], [1980, 0.3]],
  steppe: [[0, 0.08], [1930, 0.25], [1992, 0.2]],
  pacific: [[0, 0.05], [1800, 0.1], [1945, 0.3], [1980, 0.35]],
  north: [[0, 0.03], [1900, 0.1], [1960, 0.3]]
};
const step = (rows, y) => rows.reduce((v, [from, s]) => (y >= from ? s : v), rows[0][1]);
export const shareFor = (family, year) => step(SHARE[family] ?? SHARE["*"], n(year));

/**
 * Levies on top of the usual taxes. families or regions say where ("*" for everywhere); extra is the share of the
 * allowance taken each month; crushing means the towns of the land grow angry under it.
 */
export const LEVIES = [
  {id: "poll-1377", from: 1377, to: 1381, families: ["common"], extra: 0.1, crushing: true, words: "The poll taxes that end in the great rising of 1381"},
  {id: "hussite", from: 1419, to: 1436, regions: ["moravia"], extra: 0.15, crushing: false, words: "War levies of the Hussite wars, raised by every side"},
  {id: "thirty-years", from: 1618, to: 1648, regions: ["moravia", "german-lands", "low-countries", "poland-baltic"], extra: 0.25, crushing: true, words: "Contributions for the armies of the Thirty Years' War, taken town by town"},
  {id: "taille", from: 1780, to: 1789, regions: ["france"], extra: 0.1, crushing: true, words: "The crown's debts fall on the common people while the privileged pay little"},
  {id: "napoleon", from: 1799, to: 1815, families: ["latin"], extra: 0.1, crushing: false, words: "Levies and requisitions for the wars of the Empire"},
  {id: "stamp", from: 1765, to: 1775, regions: ["north-america-east"], extra: 0.03, crushing: true, words: "Taxes laid by a parliament the colonists never chose"},
  {id: "taiping", from: 1853, to: 1864, families: ["chinese"], extra: 0.2, crushing: true, words: "Levies for the war against the Taiping rebels"},
  {id: "hut-tax", from: 1896, to: 1920, families: ["african"], extra: 0.1, crushing: true, words: "The hut tax, paid in coin that can only be earned working for the colonists"},
  {id: "war-1914", from: 1914, to: 1918, families: ["*"], extra: 0.1, crushing: false, words: "War taxes and war loans"},
  {id: "requisition", from: 1918, to: 1921, families: ["orthodox"], extra: 0.3, crushing: true, words: "Grain taken at gunpoint for the cities and the army"},
  {id: "collectives", from: 1929, to: 1933, families: ["orthodox", "steppe"], extra: 0.3, crushing: true, words: "The land and the herds forced into collectives, and the harvest taken"},
  {id: "war-1939", from: 1939, to: 1945, families: ["*"], extra: 0.15, crushing: false, words: "Wartime levies, rationing and requisitions"}
];
const leviesFor = (family, region, year) => LEVIES.filter(l => n(year) >= l.from && n(year) <= l.to
  && (l.regions ? l.regions.includes(region) : (l.families ?? ["*"]).some(f => f === "*" || f === family)));

/** What the taxes of a land are in a year: the usual share, the levies on top, and whether they crush. */
export function taxOf(family, region, year) {
  const levies = leviesFor(family, region, year);
  const levy = Math.min(0.5, levies.reduce((s, l) => s + l.extra, 0));
  return {share: shareFor(family, year), levies, levy, crushing: levies.some(l => l.crushing)};
}

/** The money a month's allowance shows for the taxes: what dodging keeps, and what a levy takes. */
export function monthSums(allowance, tax, {dodge = false} = {}) {
  const a = Math.max(0, n(allowance));
  // The allowance is after the usual share: the gross is a / (1 - share), so the share is gross - a
  const kept = dodge ? Math.round(a * tax.share / (1 - tax.share)) : 0;
  const levy = dodge ? 0 : Math.round(a * tax.levy);
  return {kept, levy};
}

/**
 * The chance a month's dodging is noticed. Rises with how well the law catches people and how many records the age
 * keeps; a collector's own seat hides it. collector: the seat's rank (0-4), or null.
 */
export function catchChance(law = {}, family = "", year = 0, {collector = null} = {}) {
  let c = 0.3 * n(law.catch ?? 0.3) + 0.012 * paperWeight(family, year);
  if ( collector != null ) c *= Math.max(0.1, 1 - 0.2 * (n(collector) + 1));
  return Math.round(clamp(c, 0.01, 0.5) * 1000) / 1000;
}

/** How a dodger is caught, in the words of the age. */
export const caughtWords = (family, year) => (paperWeight(family, year) >= 8 ? "The tax office's records do not match the bank's."
  : paperWeight(family, year) >= 4 ? "An assessor finds the books do not add up." : "The lord's reeve finds the hidden harvest.");

/**
 * What a levy adds to the tax a town feels each week (WoDX Storyteller's towns read it beside the factions' taxes, and
 * each point is a quarter point of unrest a week). A crushing levy weighs eight times, enough to hold a town at the
 * edge of a rising; a light one barely shows. A house figure.
 */
export const townTaxFrom = tax => Math.round(clamp(n(tax?.levy) * (tax?.crushing ? 8 : 1), 0, 1.6) * 100) / 100;

/** What taxes mean for each line (B3617), for the Storyteller. */
export const LINE_TAX = {
  vampire: "A Kindred's money must pass through mortal hands, and the tax rolls show whose hands they are.",
  ghoul: "A ghoul often keeps the domitor's books, and answers for them.",
  werewolf: "A caern on taxed land can be sold for the debt; the sept may need a Kinfolk owner who pays.",
  mage: "The Syndicate keeps the tax codes of the modern age; a Tradition mage's wealth is easy to follow.",
  changeling: "A changeling's freehold sits on someone's taxed land, and an unpaid bill can cost it.",
  wraith: "The dead pay no taxes, but the living sell their old homes to pay them.",
  hunter: "A hunter living off the books has no records to find, and none to hide behind.",
  mummy: "A mummy's ancient treasure is a modern tax problem.",
  demon: "The host's tax debts are the demon's now.",
  revenant: "Revenant families have kept two sets of books for centuries.",
  mortal: ""
};
