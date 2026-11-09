/**
 * Money by era (Storyteller 0.14.0). Pure rules, no Foundry.
 *
 * Neither V20 (pp. 115-116) nor V20 Dark Ages (pp. 181-182) gives cash figures for Resources: the allowance is
 * monthly and the Storyteller sets it for the place and period. So WoDX tracks the way a character lives, not a
 * purse. The dots below are the books' lifestyle steps in our own words. How long portable wealth lasts away from
 * home and when a fortune is neglected comes from the same pages. Coins of the day are a house rule (history,
 * not the books), so the Storyteller can name a price in the right money.
 */
export const DAY = 86400;

/** The way each rating lives (V20 p. 116, V20 Dark Ages pp. 181-182). */
export const LIFESTYLE = [
  {dots: 0, name: "Getting by", text: "Just getting by, or destitute."},
  {dots: 1, name: "Sufficient", text: "A steady, plain home and a spree now and then."},
  {dots: 2, name: "Moderate", text: "Middle class or merchant class; can keep a servant or hire help."},
  {dots: 3, name: "Comfortable", text: "Prominent; owns land and a home, more in property than in coin."},
  {dots: 4, name: "Wealthy", text: "Rarely handles money; holdings are worth more than coin."},
  {dots: 5, name: "Extremely wealthy", text: "Famous wealth, many homes, interests across a region."}
];

export const lifestyle = dots => LIFESTYLE[Math.max(0, Math.min(5, Math.round(Number(dots) || 0)))];

/**
 * How a character with this rating lives now.
 *   away:      days spent away from home, or null when at home
 *   neglected: days the fortune has gone untended, or null when it is kept up
 * Books: 2 dots live at 1-dot level away for up to six months; 3 dots live at 1-dot level away indefinitely;
 * 4 dots neglected live at 3-dot level for up to a year, then 2-dot level; 5 dots travel with at least 3-dot comfort.
 * House rules where the books are silent: 1 dot away lives at 0; 4 dots away is treated like 4 dots neglected;
 * 5 dots neglected is treated like 4 dots neglected.
 */
export function livingAs({dots = 0, away = null, neglected = null} = {}) {
  const d = Math.max(0, Math.min(5, Math.round(Number(dots) || 0)));
  const res = (level, why, house = false) => ({dots: d, level, ...lifestyle(level), why, house});
  const isAway = away !== null && away !== undefined, isNeglected = neglected !== null && neglected !== undefined && d >= 4;
  if ( !isAway && !isNeglected ) return res(d, "At home, kept up.");
  if ( isNeglected && !(isAway && d === 5) ) {
    const days = Number(neglected) || 0;
    return days <= 365 ? res(Math.min(d, 3), "Neglected, up to a year.", d === 5) : res(Math.min(d, 2), "Neglected for more than a year.", d === 5);
  }
  const days = Number(away) || 0;
  if ( d <= 1 ) return res(0, "Away from home with nothing portable.", d === 1);
  if ( d === 2 ) return days <= 180 ? res(1, "Away from home, living on what can be carried (six months at most).") : res(0, "Away from home for more than six months; the portable wealth is gone.");
  if ( d === 3 ) return res(1, "Away from home; enough to live plainly anywhere.");
  if ( d === 4 ) return days <= 365 ? res(3, "Away from home, up to a year.", true) : res(2, "Away from home for more than a year.", true);
  return res(3, "Travelling; never with less than comfort.");
}

/** When the way a character lives drops, the day it happens (for the monthly card). */
export function nextDrop({dots = 0, away = null, neglected = null} = {}) {
  const d = Math.round(Number(dots) || 0);
  if ( d === 2 && away !== null && away !== undefined && away <= 180 ) return 180 - away;
  if ( d >= 4 && neglected !== null && neglected !== undefined && neglected <= 365 ) return 365 - neglected;
  if ( d === 4 && away !== null && away !== undefined && away <= 365 ) return 365 - away;
  return null;
}

/** Raising money in a hurry (the V20 example, p. 252): an extended Wits + Finance roll, a roll a night, difficulty 7 for a risky scheme. */
export const RAISE = {pool: "Wits + Finance", difficulty: 7, interval: "one roll a night",
  botch: "money is lost and the budget is tighter for a while",
  sell: "Selling land, stock or goods for cash takes weeks or months, by what is sold (V20 p. 115)."};

/**
 * Coins of the day by region. House rule from history, not the books (the books name no coins or prices).
 * Each row: from (first year), the coin people pay with, and the money of account.
 */
export const COINS = {
  german: {label: "German lands", rows: [
    {from: 0, coin: "silver pfennig (denier)", account: "the mark of silver, by weight"},
    {from: 1350, coin: "pfennig and groschen; gold gulden for large sums", account: "the gulden"},
    {from: 1520, coin: "thaler, gulden and kreuzer", account: "the thaler or the gulden, by state"},
    {from: 1873, coin: "the gold mark and pfennig", account: "the mark"},
    {from: 1924, coin: "the Reichsmark", account: "the Reichsmark"},
    {from: 1948, coin: "the Deutsche Mark", account: "the Deutsche Mark"},
    {from: 2002, coin: "the euro", account: "the euro"}]},
  english: {label: "England", rows: [
    {from: 0, coin: "silver penny", account: "pounds, shillings and pence (of account)"},
    {from: 1344, coin: "penny, groat and the gold noble", account: "pounds, shillings and pence"},
    {from: 1663, coin: "shilling, crown and the gold guinea", account: "pounds, shillings and pence"},
    {from: 1817, coin: "the gold sovereign, shilling and penny", account: "pounds, shillings and pence"},
    {from: 1971, coin: "decimal pounds and pence", account: "the pound"}]},
  french: {label: "France", rows: [
    {from: 0, coin: "silver denier", account: "livres, sous and deniers (of account)"},
    {from: 1266, coin: "denier, gros tournois and the gold écu", account: "the livre tournois"},
    {from: 1640, coin: "louis d'or, écu and sou", account: "the livre tournois"},
    {from: 1795, coin: "the franc and centime", account: "the franc"},
    {from: 2002, coin: "the euro", account: "the euro"}]}
};

export function coinsFor(year, region = "german") {
  const r = COINS[region] ?? COINS.german, y = Number(year) || 0;
  let row = r.rows[0];
  for ( const x of r.rows ) if ( y >= x.from ) row = x;
  return {region: COINS[region] ? region : "german", label: r.label, ...row};
}

/** Whole months between two times, counted as thirty days (the allowance is monthly). */
export const monthsBetween = (from, to) => Math.max(0, Math.floor(((Number(to) || 0) - (Number(from) || 0)) / (30 * DAY)));
