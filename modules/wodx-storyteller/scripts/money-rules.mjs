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
  moravian: {label: "Moravia (Bohemian crown)", rows: [
    {from: 0, coin: "silver denar", account: "the hřivna (mark) of silver, by weight"},
    {from: 1300, coin: "the Prague groschen and heller", account: "the kopa (threescore groschen)"},
    {from: 1527, coin: "gulden, kreuzer and thaler", account: "the gulden"},
    {from: 1858, coin: "the Austrian gulden and kreuzer", account: "the gulden"},
    {from: 1892, coin: "the krone and heller", account: "the krone"},
    {from: 1919, coin: "the Czechoslovak koruna and haléř", account: "the koruna"},
    {from: 1993, coin: "the Czech koruna", account: "the koruna"},
    {from: 2020, coin: "eurobucks and credchips", account: "the eurobuck"}]},
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
  american: {label: "United States", rows: [
    {from: 0, coin: "English and Spanish silver", account: "pounds, shillings and pence"},
    {from: 1792, coin: "the dollar and cent", account: "the dollar"},
    {from: 2020, coin: "eurobucks and credchips", account: "the eurobuck"}]},
  french: {label: "France", rows: [
    {from: 0, coin: "silver denier", account: "livres, sous and deniers (of account)"},
    {from: 1266, coin: "denier, gros tournois and the gold écu", account: "the livre tournois"},
    {from: 1640, coin: "louis d'or, écu and sou", account: "the livre tournois"},
    {from: 1795, coin: "the franc and centime", account: "the franc"},
    {from: 2002, coin: "the euro", account: "the euro"}]}
};

export function coinsFor(year, region = "moravian") {
  const r = COINS[region] ?? COINS.moravian, y = Number(year) || 0;
  let row = r.rows[0];
  for ( const x of r.rows ) if ( y >= x.from ) row = x;
  return {region: COINS[region] ? region : "moravian", label: r.label, ...row};
}

/** Whole months between two times, counted as thirty days (the allowance is monthly). */
export const monthsBetween = (from, to) => Math.max(0, Math.floor(((Number(to) || 0) - (Number(from) || 0)) / (30 * DAY)));

/* ------------------------------------------------------------------------------------------------------------ */
/*
 * Storyteller 0.23.0: real money (Ben, 2026-11-11). Resources pays a monthly allowance in the money of the place
 * and year, and goods have prices worked out from their value tiers.
 *
 * Books (pdf pages): V20 Dark Ages pdf 182 makes Resources a monthly allowance; V20 The Wild West pdf 86 gives
 * monthly pay by dot in the 1880s ($40-50, $100-200, $300-400, $800-1,000, $2,000); Sorcerers Crusade Companion
 * pdf 36 gives English incomes and prices for 1630; the World of Future Darkness article (pdf 9, printed p. 22)
 * gives starting cash in eurobucks by dot, and Ben set income at a tenth of that (2026-11-10). Ben raised every
 * allowance by half (2026-11-11). Every other wage and money below is history, approximate, and a house rule.
 */

/** Allowance per Resources dot, as a multiple of the era's monthly wage (the Wild West table's shape). */
export const LADDER = [0.4, 1, 2.5, 7, 20, 50];
/** Ben's raise: every allowance is half again what the ladder gives (2026-11-11). */
export const ALLOWANCE_BOOST = 1.5;
/** World of Future Darkness: a tenth of the article's starting cash by dot, eurobucks; 0 dots a house rule. */
export const EB_LADDER = [80, 200, 500, 1000, 2000, 5000];
/** Price of each value tier as a share of the monthly wage (the tiers' own meaning: hours, a day, a week, a month...). */
export const TIER_FACTOR = [1 / 400, 1 / 25, 1 / 5, 1, 6, 20];
export const SELL_SHARE = 0.5, FENCE_SHARE = 0.25;

/**
 * Money by region. Each money: from-to years, its units (name, plural, worth in the smallest unit), whether people
 * bank with it (else "bank" is the strongbox at home), and the monthly wage of a one-dot worker at points in time,
 * in the smallest unit. A region falls back to the next one listed in `else` before its own first money.
 */
const EB = {id: "eb", from: 2020, to: 99999, label: "eurobucks", units: [["eb", "eb", 1]], bank: true, wage: [[2020, 200]], ladder: "eb"};
const SHEKEL = {id: "shekel", from: -99999, to: -801, label: "weighed silver", units: [["shekel", "shekels", 20], ["gerah", "gerahs", 1]], bank: false, wage: [[-3000, 20]]};
const ROMAN = {id: "roman", from: -800, to: 899, label: "Roman money", units: [["aureus", "aurei", 400], ["denarius", "denarii", 16], ["as", "asses", 1]], bank: false, wage: [[-800, 400]]};

export const MONIES = {
  moravian: {label: "Moravia (Bohemian crown)", list: [SHEKEL, ROMAN,
    {id: "denar", from: 900, to: 1299, label: "Bohemian denars", units: [["hřivna of silver", "hřivny of silver", 480], ["denar", "denars", 2], ["half-denar", "half-denars", 1]], bank: false, wage: [[900, 60], [1197, 120], [1299, 140]]},
    {id: "grosch", from: 1300, to: 1526, label: "Prague groschen", units: [["kopa", "kopy", 720], ["groschen", "groschen", 12], ["heller", "heller", 1]], bank: false, wage: [[1300, 300], [1449, 360], [1526, 480]]},
    {id: "zlaty-cm", from: 1527, to: 1857, label: "gulden and kreuzer", units: [["gulden", "gulden", 60], ["kreuzer", "kreuzer", 1]], bank: true, wage: [[1527, 60], [1600, 120], [1700, 180], [1800, 360], [1857, 600]]},
    {id: "zlaty-oe", from: 1858, to: 1891, label: "Austrian gulden", units: [["gulden", "gulden", 100], ["kreuzer", "kreuzer", 1]], bank: true, wage: [[1858, 1200], [1891, 1800]]},
    {id: "krone", from: 1892, to: 1918, label: "Austro-Hungarian krone", units: [["krone", "kronen", 100], ["heller", "heller", 1]], bank: true, wage: [[1892, 4000], [1914, 7000], [1918, 15000]]},
    {id: "kc-1", from: 1919, to: 1938, label: "Czechoslovak koruna", units: [["koruna", "korun", 100], ["haléř", "haléřů", 1]], bank: true, wage: [[1919, 40000], [1925, 70000], [1938, 80000]]},
    {id: "kc-prot", from: 1939, to: 1944, label: "Protectorate koruna", units: [["koruna", "korun", 100], ["haléř", "haléřů", 1]], bank: true, wage: [[1939, 80000], [1944, 90000]]},
    {id: "kc-2", from: 1945, to: 1952, label: "Czechoslovak koruna", units: [["koruna", "korun", 100], ["haléř", "haléřů", 1]], bank: true, wage: [[1945, 250000], [1952, 300000]]},
    {id: "kcs", from: 1953, to: 1992, label: "Czechoslovak koruna", units: [["koruna", "korun", 100], ["haléř", "haléřů", 1]], bank: true, wage: [[1953, 95000], [1970, 190000], [1989, 320000], [1992, 450000]]},
    {id: "czk", from: 1993, to: 2019, label: "Czech koruna", units: [["koruna", "korun", 100], ["haléř", "haléřů", 1]], bank: true, wage: [[1993, 590000], [2004, 1750000], [2019, 3200000]]},
    EB]},
  german: {label: "German lands", list: [SHEKEL, ROMAN,
    {id: "pfennig", from: 900, to: 1349, label: "silver pfennig", units: [["pfund", "pfund", 480], ["schilling", "schilling", 24], ["pfennig", "pfennig", 2], ["hälbling", "hälblinge", 1]], bank: false, wage: [[900, 60], [1197, 120], [1347, 150]]},
    {id: "gulden-rh", from: 1350, to: 1519, label: "pfennig and Rhenish gulden", units: [["gulden", "gulden", 504], ["pfennig", "pfennig", 2], ["heller", "heller", 1]], bank: false, wage: [[1350, 180], [1449, 300], [1519, 504]]},
    {id: "gulden", from: 1520, to: 1872, label: "gulden and kreuzer", units: [["gulden", "gulden", 240], ["kreuzer", "kreuzer", 4], ["pfennig", "pfennig", 1]], bank: true, wage: [[1520, 240], [1600, 480], [1700, 720], [1800, 960], [1872, 2400]]},
    {id: "mark", from: 1873, to: 1923, label: "Mark", units: [["Mark", "Mark", 100], ["pfennig", "pfennig", 1]], bank: true, wage: [[1873, 5000], [1913, 10000], [1918, 16000], [1921, 100000], [1922, 1000000], [1923, 1e12]]},
    {id: "rm", from: 1924, to: 1947, label: "Reichsmark", units: [["Reichsmark", "Reichsmark", 100], ["Reichspfennig", "Reichspfennig", 1]], bank: true, wage: [[1924, 15000], [1939, 18000], [1947, 18000]]},
    {id: "dm", from: 1948, to: 2001, label: "Deutsche Mark", units: [["DM", "DM", 100], ["pfennig", "pfennig", 1]], bank: true, wage: [[1948, 25000], [1950, 30000], [1960, 55000], [1970, 110000], [1980, 200000], [1989, 250000], [2001, 290000]]},
    {id: "euro", from: 2002, to: 2019, label: "euro", units: [["euro", "euro", 100], ["cent", "cent", 1]], bank: true, wage: [[2002, 145000], [2019, 200000]]},
    EB]},
  english: {label: "England", list: [SHEKEL, ROMAN,
    {id: "lsd", from: 900, to: 1970, label: "pounds, shillings and pence", units: [["pound", "pounds", 960], ["shilling", "shillings", 48], ["penny", "pence", 4], ["farthing", "farthings", 1]], bank: false, bankFrom: 1640,
      wage: [[900, 160], [1197, 240], [1347, 288], [1450, 384], [1630, 480], [1700, 720], [1800, 1440], [1837, 2880], [1900, 4800], [1918, 7680], [1950, 24000], [1970, 96000]]},
    {id: "gbp", from: 1971, to: 2019, label: "pounds and pence", units: [["pound", "pounds", 100], ["penny", "pence", 1]], bank: true, wage: [[1971, 12000], [1990, 80000], [2004, 120000], [2019, 180000]]},
    EB]},
  american: {label: "United States", else: "english", list: [
    {id: "usd", from: 1792, to: 2019, label: "dollars", units: [["dollar", "dollars", 100], ["cent", "cents", 1]], bank: true,
      wage: [[1792, 1000], [1860, 3000], [1880, 4500], [1900, 5000], [1918, 9000], [1950, 25000], [1970, 55000], [1990, 150000], [2004, 200000], [2019, 300000]]},
    EB]},
  french: {label: "France (wages and money of the German lands until France has its own)", else: "german", list: []}
};

/** The money in use in a region and year (falls back to another region's list where this one has nothing yet). */
export function moneyFor(year, region = "moravian") {
  const y = Math.round(Number(year) || 0);
  let r = MONIES[region] ? region : "moravian";
  for ( let guard = 0; guard < 4; guard++ ) {
    const m = MONIES[r].list.find(x => y >= x.from && y <= x.to);
    if ( m ) return {...m, region: r, banks: m.bank || (m.bankFrom !== undefined && y >= m.bankFrom)};
    r = MONIES[r].else ?? "moravian";
  }
  return {...EB, region: "moravian", banks: true};
}

/** Monthly wage of a one-dot worker, in the smallest unit, straight-line between the dated points. */
export function wageAt(year, region = "moravian") {
  const m = moneyFor(year, region), y = Number(year) || 0, pts = m.wage;
  if ( y <= pts[0][0] ) return pts[0][1];
  for ( let i = 1; i < pts.length; i++ ) {
    const [y1, w1] = pts[i - 1], [y2, w2] = pts[i];
    if ( y <= y2 ) return Math.round(w1 + (w2 - w1) * (y - y1) / (y2 - y1));
  }
  return pts[pts.length - 1][1];
}

/** The monthly allowance for a Resources level (how the character lives now), in the smallest unit. */
export function allowance(level, year, region = "moravian") {
  const d = Math.max(0, Math.min(5, Math.round(Number(level) || 0)));
  const m = moneyFor(year, region);
  const base = m.ladder === "eb" ? EB_LADDER[d] : wageAt(year, region) * LADDER[d];
  return Math.round(base * ALLOWANCE_BOOST);
}

/** A fixed spread for a good within its tier, from its name: 0.7 to 1.4. */
export function spread(name = "") {
  let h = 2166136261;
  for ( const c of String(name) ) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return 0.7 + (h % 71) / 100;
}

/**
 * Price of a good, in the smallest unit. good: {name, value tier (this era), stack?}. A Trifle that comes in stacks
 * is priced per usual stack, so one unit costs a share of it. place: {scarce, forbidden, glut} multipliers.
 * A book price ({book: amount in the smallest unit}) wins.
 */
export function priceOf(good, year, region = "moravian", {place = {}, book = null, perUnit = true} = {}) {
  if ( Number.isFinite(book) ) return Math.max(0, Math.round(book));
  const tier = Math.max(0, Math.min(5, Math.round(Number(good?.value) || 0)));
  let p = wageAt(year, region) * TIER_FACTOR[tier] * spread(good?.name);
  if ( tier === 0 && perUnit && good?.stack?.max > 1 ) p /= good.stack.max;
  if ( place.scarce ) p *= 2;
  if ( place.forbidden ) p *= 3;
  if ( place.glut ) p *= 0.5;
  return Math.max(1, Math.round(p));
}

export const sellPrice = (price, {fence = false} = {}) => Math.max(0, Math.floor(price * (fence ? FENCE_SHARE : SELL_SHARE)));

/** Haggling: Manipulation + Finance at difficulty 6; 10% off per success, 30% at most; a botch costs 10% more. */
export const HAGGLE = {pool: "Manipulation + Finance", difficulty: 6, step: 0.1, most: 0.3};
export function haggled(price, successes = 0, {botch = false} = {}) {
  if ( botch ) return Math.round(price * 1.1);
  const off = Math.min(HAGGLE.most, Math.max(0, Math.round(Number(successes) || 0)) * HAGGLE.step);
  return Math.max(1, Math.round(price * (1 - off)));
}

/** Credit: a seller may let a known buyer owe up to one month's allowance per Resources dot, where the era has credit. */
export const creditLimit = (dots, year, region = "moravian") => moneyFor(year, region).banks ? Math.max(0, Math.round(Number(dots) || 0)) * allowance(dots, year, region) : 0;

/** An amount in the smallest unit as words: "1 gulden 30 kreuzer". */
export function formatMoney(amount, money) {
  const m = typeof money === "string" ? Object.values(MONIES).flatMap(r => r.list).find(x => x.id === money) : money;
  if ( !m ) return String(amount);
  let left = Math.round(Math.abs(Number(amount) || 0));
  const parts = [];
  for ( const [one, many, worth] of m.units ) {
    const n = Math.floor(left / worth);
    if ( n > 0 ) { parts.push(`${n.toLocaleString("en")} ${n === 1 ? one : many}`); left -= n * worth; }
  }
  const s = parts.join(" ") || `0 ${m.units[m.units.length - 1][1]}`;
  return (Number(amount) < 0 ? "minus " : "") + s;
}

/** The amount in the money's main unit, for the sheet's plain number (system.money). */
export const mainUnits = (amount, money) => Math.round((Number(amount) || 0) / money.units[0][2] * 100) / 100;

/** Savings carried from one money to the next keep what they buy: converted by the ratio of the two wages. */
export function convertSavings(amount, fromYear, toYear, region = "moravian") {
  const a = wageAt(fromYear, region), b = wageAt(toYear, region);
  return a > 0 ? Math.round((Number(amount) || 0) * b / a) : 0;
}

/** Months to pay when the clock moves from one month count to another: every month, twelve at most. */
export const monthsToPay = (paidMonth, month) => (paidMonth === null || paidMonth === undefined || paidMonth < 0) ? 1 : Math.max(0, Math.min(12, month - paidMonth));
