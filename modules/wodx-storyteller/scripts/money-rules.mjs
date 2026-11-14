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
    {from: 2002, coin: "the euro", account: "the euro"}]},
  italian: {label: "Italy", rows: [
    {from: 0, coin: "silver denaro", account: "lire, soldi and denari (of account)"},
    {from: 1252, coin: "the gold florin and ducat, grossi and denari", account: "the lira, or the florin for large sums"},
    {from: 1861, coin: "the lira and centesimo", account: "the lira"},
    {from: 2002, coin: "the euro", account: "the euro"}]},
  spanish: {label: "Spain and Portugal", rows: [
    {from: 0, coin: "silver dinero; gold dinars from al-Andalus", account: "the maravedí"},
    {from: 1497, coin: "real, escudo and the piece of eight", account: "the maravedí, later the real"},
    {from: 1869, coin: "the peseta and céntimo", account: "the peseta"},
    {from: 2002, coin: "the euro", account: "the euro"}]},
  dutch: {label: "The Low Countries", rows: [
    {from: 0, coin: "silver pennies of the German lands", account: "the pound of account"},
    {from: 1434, coin: "guilder, stuiver and penning", account: "the guilder"},
    {from: 1817, coin: "the guilder and cent", account: "the guilder"},
    {from: 2002, coin: "the euro", account: "the euro"}]},
  nordic: {label: "Scandinavia", rows: [
    {from: 0, coin: "silver penning, and silver by weight", account: "the mark of eight öre"},
    {from: 1523, coin: "riksdaler and skilling", account: "the riksdaler"},
    {from: 1873, coin: "the krona and öre", account: "the krona"}]},
  polish: {label: "Poland and the Baltic", rows: [
    {from: 0, coin: "silver denar", account: "the grzywna (mark) of silver"},
    {from: 1367, coin: "grosz and denar; the gold ducat for large sums", account: "the złoty of thirty groszy"},
    {from: 1795, coin: "roubles, marks and kronen of the partitioning powers", account: "the rouble"},
    {from: 1919, coin: "the Polish marka", account: "the marka"},
    {from: 1924, coin: "the złoty and grosz", account: "the złoty"}]},
  russian: {label: "The Rus and Russia", rows: [
    {from: 0, coin: "silver grivna bars and furs; later the denga", account: "the grivna, later the rouble"},
    {from: 1535, coin: "kopek and denga; the silver rouble from 1704", account: "the rouble"},
    {from: 1918, coin: "the Soviet rouble", account: "the rouble"},
    {from: 1992, coin: "the Russian rouble", account: "the rouble"}]},
  ottoman: {label: "Constantinople and Anatolia", rows: [
    {from: 0, coin: "the gold hyperpyron, silver and copper folles", account: "the nomisma"},
    {from: 1300, coin: "the silver akçe; the gold sultani from 1477", account: "the akçe"},
    {from: 1688, coin: "kuruş and para", account: "the kuruş"},
    {from: 1844, coin: "the Ottoman lira and kuruş", account: "the lira"},
    {from: 1923, coin: "the Turkish lira", account: "the lira"}]},
  arab: {label: "Egypt, the Levant and Arabia", rows: [
    {from: 0, coin: "Roman and Persian coin", account: "the solidus"},
    {from: 696, coin: "gold dinar, silver dirham and copper fals", account: "the dinar"},
    {from: 1517, coin: "Ottoman para (medin) and kuruş", account: "the kuruş"},
    {from: 1834, coin: "the pound and piastre", account: "the pound"}]},
  persian: {label: "Persia and inner Asia", rows: [
    {from: 0, coin: "silver drachm", account: "the drachm"},
    {from: 651, coin: "gold dinar and silver dirham", account: "the dinar"},
    {from: 1501, coin: "shahi and abbasi, later the qiran", account: "the toman of ten thousand dinars"},
    {from: 1932, coin: "the rial", account: "the rial, in speech the toman"}]},
  indian: {label: "India", rows: [
    {from: 0, coin: "silver karshapana and copper", account: "the pana"},
    {from: 1200, coin: "silver tanka and copper jital", account: "the tanka"},
    {from: 1540, coin: "rupee, anna and pie; the gold mohur", account: "the rupee"},
    {from: 1957, coin: "the rupee and paisa", account: "the rupee"}]},
  chinese: {label: "China", rows: [
    {from: 0, coin: "copper cash on strings; silver by weight", account: "the string of a thousand cash, or the tael"},
    {from: 1889, coin: "the silver yuan (dollar) and copper cents", account: "the yuan"},
    {from: 1949, coin: "the renminbi yuan", account: "the yuan"}]},
  japanese: {label: "Japan", rows: [
    {from: 0, coin: "copper mon, much of it from China; rice by measure", account: "the kanmon of a thousand mon"},
    {from: 1601, coin: "gold ryō and bu, silver by weight, copper mon", account: "the ryō; a lord's income in koku of rice"},
    {from: 1871, coin: "the yen and sen", account: "the yen"}]},
  "west-african": {label: "West Africa", rows: [
    {from: 0, coin: "cowries and gold dust by the mithqal; salt and cloth", account: "the mithqal of gold"},
    {from: 1901, coin: "pounds, shillings and pence; francs in the French colonies", account: "the pound"},
    {from: 1973, coin: "the naira; the cedi and the CFA franc beyond Nigeria", account: "the naira"}]},
  "east-african": {label: "East Africa", rows: [
    {from: 0, coin: "copper coins of Kilwa, dirhams and trade cloth", account: "the mithqal of gold"},
    {from: 1821, coin: "the Maria Theresa thaler and the rupee", account: "the thaler"},
    {from: 1921, coin: "the shilling and cent; the birr in Ethiopia", account: "the shilling"}]},
  "southern-african": {label: "Southern Africa", rows: [
    {from: 0, coin: "no coin: cattle, iron hoes and beads", account: "the head of cattle"},
    {from: 1652, coin: "the Cape rixdollar and stuiver", account: "the rixdollar"},
    {from: 1825, coin: "pounds, shillings and pence", account: "the pound"},
    {from: 1961, coin: "the rand and cent", account: "the rand"}]},
  mexican: {label: "Mexico and New Spain", rows: [
    {from: 0, coin: "no coin: cacao beans and cotton cloaks in Mexico, labour and cloth in the Andes", account: "the cotton cloak (quachtli)"},
    {from: 1521, coin: "the silver real and the peso (piece of eight)", account: "the peso"},
    {from: 1863, coin: "the peso and centavo", account: "the peso"}]},
  brazilian: {label: "Brazil", rows: [
    {from: 0, coin: "no coin: barter", account: "goods in kind"},
    {from: 1500, coin: "Portuguese réis", account: "the mil-réis"},
    {from: 1942, coin: "the cruzeiro", account: "the cruzeiro"},
    {from: 1994, coin: "the real and centavo", account: "the real"}]},
  australian: {label: "Australia and Aotearoa", rows: [
    {from: 0, coin: "no coin: gifts and barter", account: "goods in kind"},
    {from: 1788, coin: "pounds, shillings and pence; Spanish dollars and rum at first", account: "the pound"},
    {from: 1966, coin: "the dollar and cent", account: "the dollar"}]},
  pacific: {label: "The Pacific islands", rows: [
    {from: 0, coin: "no coin: gifts and barter", account: "goods in kind"},
    {from: 1820, coin: "the dollar and cent", account: "the dollar"}]},
  korean: {label: "Korea", rows: [
    {from: 0, coin: "hemp cloth and rice; silver by weight, and Chinese cash in the towns", account: "the bolt of cloth"},
    {from: 1678, coin: "copper sangpyeong tongbo cash", account: "the nyang"},
    {from: 1892, coin: "the yang, then the won of the Korean Empire", account: "the yang"},
    {from: 1910, coin: "the yen of the Bank of Chōsen", account: "the yen"},
    {from: 1946, coin: "the won; the hwan from 1953", account: "the won"},
    {from: 1962, coin: "the won (the North keeps its own won)", account: "the won"}]},
  "southeast-asian": {label: "Mainland Southeast Asia", rows: [
    {from: 0, coin: "silver and gold by weight, rice and cloth; Chinese copper cash in Đại Việt", account: "the tael of silver"},
    {from: 1350, coin: "bullet ticals of Ayutthaya and cowries; copper cash in Đại Việt", account: "the tical"},
    {from: 1885, coin: "the tical; the French piastre in Indochina", account: "the tical"},
    {from: 1904, coin: "the baht and satang; the piastre, then the đồng, the riel and the kip in Indochina", account: "the baht"}]},
  malay: {label: "The Malay world", rows: [
    {from: 0, coin: "gold mas and silver by weight", account: "the tahil"},
    {from: 1300, coin: "Chinese copper picis, tin coins in Malacca, and Spanish reals in the ports", account: "the string of picis"},
    {from: 1817, coin: "the Netherlands Indies guilder; Straits dollars in Malaya, pesos in the Philippines", account: "the guilder"},
    {from: 1946, coin: "the rupiah; the ringgit and the peso beyond Indonesia", account: "the rupiah"}]},
  hungarian: {label: "Hungary, Transylvania and the Balkans", rows: [
    {from: 0, coin: "silver by weight, then Hungarian denars", account: "the mark of silver"},
    {from: 1325, coin: "gold forints and silver denars; Venetian ducats on the coast", account: "the forint"},
    {from: 1527, coin: "forints and krajcár; the Ottoman akçe in the conquered lands", account: "the forint"},
    {from: 1892, coin: "the korona and fillér; the dinar and the leu across the Balkans", account: "the korona"},
    {from: 1927, coin: "the pengő and fillér", account: "the pengő"},
    {from: 1947, coin: "the forint and fillér; the dinar, the leu and the lev beyond Hungary", account: "the forint"}]},
  greek: {label: "Greece", rows: [
    {from: 0, coin: "the gold hyperpyron and copper folles", account: "the hyperpyron"},
    {from: 1453, coin: "the silver akçe; Venetian ducats on the islands", account: "the akçe"},
    {from: 1688, coin: "the kuruş and para", account: "the kuruş"},
    {from: 1832, coin: "the drachma and lepta", account: "the drachma"},
    {from: 2002, coin: "the euro and cent", account: "the euro"}]},
  caribbean: {label: "The Caribbean", rows: [
    {from: 0, coin: "no coin: gifts and barter", account: "goods in kind"},
    {from: 1492, coin: "the Spanish real and the piece of eight; pounds and livres on the English and French islands", account: "the peso"},
    {from: 1857, coin: "the Cuban peso; the Jamaican pound, the gourde and the dollar on other islands", account: "the peso"}]},
  andean: {label: "The Andes", rows: [
    {from: 0, coin: "no coin: labour, cloth and goods in kind", account: "the bale of cloth"},
    {from: 1533, coin: "the silver real and the piece of eight from Potosí", account: "the peso"},
    {from: 1863, coin: "the sol; the boliviano in Bolivia", account: "the sol"},
    {from: 1986, coin: "the inti", account: "the inti"},
    {from: 1991, coin: "the new sol", account: "the sol"}]},
  platine: {label: "The River Plate and Chile", rows: [
    {from: 0, coin: "no coin: barter", account: "goods in kind"},
    {from: 1536, coin: "the silver real and the piece of eight", account: "the peso"},
    {from: 1881, coin: "the Argentine peso; the Chilean peso across the Andes", account: "the peso"}]},
  kongo: {label: "Kongo and central Africa", rows: [
    {from: 0, coin: "nzimbu shells from Luanda and raffia cloth", account: "the raffia cloth"},
    {from: 1885, coin: "the Congo franc", account: "the franc"},
    {from: 1961, coin: "the Congolese franc, the zaire from 1967, the franc again from 1997", account: "the franc"}]},
  tibetan: {label: "Tibet and the Himalaya", rows: [
    {from: 0, coin: "silver by weight, bricks of tea and barley", account: "the srang of silver"},
    {from: 1640, coin: "silver tangka, struck in Nepal and in Lhasa from 1791", account: "the srang"},
    {from: 1951, coin: "the renminbi; the Nepalese rupee across the mountains", account: "the yuan"}]},
  canadian: {label: "Canada", rows: [
    {from: 0, coin: "no coin: furs, wampum and barter", account: "goods in kind"},
    {from: 1608, coin: "the livre tournois and card money", account: "the livre"},
    {from: 1760, coin: "pounds, shillings and pence in Halifax currency, and Spanish dollars", account: "the pound"},
    {from: 1858, coin: "the Canadian dollar and cent", account: "the dollar"}]},
  // B3190: lands under a wider region that paid in their own coin (a scene picks them in Where this scene stands)
  philippine: {label: "The Philippines", rows: [
    {from: 0, coin: "gold by weight and small gold piloncitos; rice and cloth", account: "the tahil of gold"},
    {from: 1565, coin: "Mexican silver pesos and reales from the Manila galleons", account: "the peso"},
    {from: 1857, coin: "the Philippine peso and centavo", account: "the peso"},
    {from: 1903, coin: "the Philippine peso, two to the American dollar", account: "the peso"},
    {from: 1967, coin: "the piso and sentimo", account: "the piso"}]},
  indochinese: {label: "Indochina (Vietnam, Cambodia, Laos)", rows: [
    {from: 0, coin: "copper cash of Đại Việt on strings; silver by weight", account: "the quan (string) of cash"},
    {from: 1885, coin: "the French piastre and cent", account: "the piastre"},
    {from: 1954, coin: "the đồng; the riel in Cambodia and the kip in Laos", account: "the đồng"},
    {from: 1978, coin: "the đồng of a united Vietnam", account: "the đồng"}]},
  balkan: {label: "The Balkans (Serbia, Bulgaria, Romania, Bosnia)", rows: [
    {from: 0, coin: "Byzantine hyperpyra and copper", account: "the hyperpyron"},
    {from: 1214, coin: "Serbian silver dinars; hyperpyra in Bulgaria", account: "the perper of twelve dinars"},
    {from: 1459, coin: "the Ottoman akçe", account: "the akçe"},
    {from: 1688, coin: "the kuruş and para", account: "the kuruş"},
    {from: 1867, coin: "the Serbian dinar; the Romanian leu, and the Bulgarian lev from 1881", account: "the dinar"},
    {from: 1920, coin: "the Yugoslav dinar; the leu and the lev beyond Yugoslavia", account: "the dinar"},
    {from: 1994, coin: "the new dinar; the leu, the lev and the convertible mark beyond Serbia", account: "the dinar"}]},
  // B3552: the Shadowlands and Stygia (Wraith 20th pp. 44-45)
  underworld: {label: "The Underworld (oboli)", rows: [
    {from: 0, coin: "soulforged oboli, cut into slivers for small prices; relic coin of the living in some Necropoli", account: "the obolus, and ledgers of what would be owed"},
    {from: 1999, coin: "oboli from the forges that outlasted Stygia's fall, under whoever holds them now", account: "the obolus, and more ledgers than coin"}]}
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
 * Storyteller 0.26.0: real money (Ben, 2026-11-11). Resources pays a monthly allowance in the money of the place
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

/** Lands that used no coin: a month's keep reckoned in goods, until coin comes. */
const BARTER = {id: "barter", from: -99999, to: 1499, label: "barter (no coin)", units: [["trade good", "trade goods", 1]], bank: false, wage: [[0, 30]]};
const EURO = wage => ({id: "euro", from: 2002, to: 2019, label: "euro", units: [["euro", "euro", 100], ["cent", "cent", 1]], bank: true, wage});
const LSD = [["pound", "pounds", 240], ["shilling", "shillings", 12], ["penny", "pence", 1]];
const DINAR = {id: "dinar", from: 651, to: 1516, label: "dinars and dirhams", units: [["dinar", "dinars", 480], ["dirham", "dirhams", 24], ["fals", "fulus", 1]], bank: false, wage: [[651, 720], [1197, 960], [1400, 1200], [1516, 1200]]};
const m = (id, from, to, label, units, wage, bank = true) => ({id, from, to, label, units, wage, ...(typeof bank === "number" ? {bank: false, bankFrom: bank} : {bank})});

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
    {...BARTER, to: 1606},
    {id: "usd", from: 1792, to: 2019, label: "dollars", units: [["dollar", "dollars", 100], ["cent", "cents", 1]], bank: true,
      wage: [[1792, 1000], [1860, 3000], [1880, 4500], [1900, 5000], [1918, 9000], [1950, 25000], [1970, 55000], [1990, 150000], [2004, 200000], [2019, 300000]]},
    EB]},
  french: {label: "France", list: [SHEKEL, ROMAN,
    m("denier", 900, 1265, "deniers", [["livre", "livres", 240], ["sou", "sous", 12], ["denier", "deniers", 1]], [[900, 60], [1197, 100], [1265, 120]], false),
    m("tournois", 1266, 1794, "livres tournois", [["livre", "livres", 240], ["sou", "sous", 12], ["denier", "deniers", 1]], [[1266, 150], [1347, 240], [1450, 480], [1600, 1800], [1700, 2400], [1789, 6000]], 1550),
    m("franc", 1795, 1959, "francs", [["franc", "francs", 100], ["centime", "centimes", 1]], [[1795, 3000], [1850, 5000], [1900, 10000], [1914, 12000], [1920, 40000], [1938, 100000], [1950, 1500000], [1959, 3500000]]),
    m("nfranc", 1960, 2001, "new francs", [["franc", "francs", 100], ["centime", "centimes", 1]], [[1960, 35000], [1970, 90000], [1980, 300000], [1990, 500000], [2001, 700000]]),
    EURO([[2002, 110000], [2019, 150000]]), EB]},
  italian: {label: "Italy", list: [SHEKEL, ROMAN,
    m("denaro", 900, 1251, "denari", [["lira", "lire", 240], ["soldo", "soldi", 12], ["denaro", "denari", 1]], [[900, 60], [1197, 120], [1251, 160]], false),
    m("florin", 1252, 1860, "florins, lire and soldi", [["florin", "florins", 1488], ["lira", "lire", 240], ["soldo", "soldi", 12], ["denaro", "denari", 1]], [[1252, 360], [1347, 900], [1450, 2400], [1600, 4800], [1700, 6000], [1800, 7200], [1860, 9600]]),
    m("lira", 1861, 2001, "lire", [["lira", "lire", 100], ["centesimo", "centesimi", 1]], [[1861, 4000], [1900, 6000], [1914, 8000], [1920, 30000], [1938, 50000], [1946, 1000000], [1960, 5000000], [1980, 50000000], [2001, 180000000]]),
    EURO([[2002, 95000], [2019, 130000]]), EB]},
  spanish: {label: "Spain and Portugal", list: [SHEKEL, ROMAN,
    m("dinero", 900, 1496, "maravedís and dineros", [["maravedí", "maravedís", 10], ["dinero", "dineros", 1]], [[900, 100], [1197, 300], [1347, 900], [1450, 3000], [1496, 5000]], false),
    m("real", 1497, 1868, "reales", [["peso", "pesos", 272], ["real", "reales", 34], ["maravedí", "maravedís", 1]], [[1497, 500], [1550, 900], [1600, 1700], [1700, 2000], [1800, 3400], [1868, 5400]], 1600),
    m("peseta", 1869, 2001, "pesetas", [["peseta", "pesetas", 100], ["céntimo", "céntimos", 1]], [[1869, 4000], [1900, 6000], [1930, 15000], [1950, 60000], [1970, 600000], [1990, 6000000], [2001, 9000000]]),
    EURO([[2002, 60000], [2019, 105000]]), EB]},
  dutch: {label: "The Low Countries", else: "german", list: [
    m("stuiver", 1434, 1816, "guilders and stuivers", [["guilder", "guilders", 320], ["stuiver", "stuivers", 16], ["penning", "penningen", 1]], [[1434, 1200], [1500, 1600], [1600, 6000], [1700, 7000], [1816, 7000]], 1609),
    m("guilder", 1817, 2001, "guilders", [["guilder", "guilders", 100], ["cent", "cents", 1]], [[1817, 2000], [1900, 4000], [1920, 10000], [1950, 25000], [1970, 100000], [1990, 250000], [2001, 280000]]),
    EURO([[2002, 125000], [2019, 165000]]), EB]},
  nordic: {label: "Scandinavia", list: [SHEKEL, ROMAN,
    m("penning", 900, 1522, "marks and penningar", [["mark", "marks", 192], ["öre", "öre", 24], ["penning", "penningar", 1]], [[900, 60], [1197, 100], [1450, 200], [1522, 280]], false),
    m("riksdaler", 1523, 1872, "riksdaler and skilling", [["riksdaler", "riksdaler", 48], ["skilling", "skilling", 1]], [[1523, 24], [1600, 48], [1700, 72], [1800, 144], [1872, 720]], 1668),
    m("krona", 1873, 2019, "kronor", [["krona", "kronor", 100], ["öre", "öre", 1]], [[1873, 3000], [1900, 5000], [1920, 15000], [1950, 50000], [1970, 200000], [1990, 1000000], [2019, 2200000]]),
    EB]},
  polish: {label: "Poland and the Baltic", list: [SHEKEL, ROMAN,
    m("pl-denar", 900, 1366, "denars", [["grzywna of silver", "grzywny of silver", 480], ["denar", "denars", 2], ["obol", "obols", 1]], [[900, 60], [1197, 110], [1366, 140]], false),
    m("grosz", 1367, 1794, "złote and groszy", [["złoty", "złote", 540], ["grosz", "groszy", 18], ["denar", "denars", 1]], [[1367, 360], [1450, 450], [1600, 1620], [1700, 3600], [1794, 5400]], false),
    m("pl-rouble", 1795, 1918, "roubles", [["rouble", "roubles", 100], ["kopek", "kopeks", 1]], [[1795, 300], [1861, 600], [1900, 1500], [1918, 8000]]),
    m("marka", 1919, 1923, "Polish marks", [["marka", "marek", 100], ["fenig", "fenigów", 1]], [[1919, 20000], [1923, 5e10]]),
    m("zloty-1", 1924, 1949, "złote", [["złoty", "złote", 100], ["grosz", "groszy", 1]], [[1924, 10000], [1938, 10000], [1949, 2000000]]),
    m("zloty-2", 1950, 1994, "złote", [["złoty", "złote", 100], ["grosz", "groszy", 1]], [[1950, 50000], [1970, 250000], [1980, 600000], [1989, 20000000], [1994, 500000000]]),
    m("pln", 1995, 2019, "złote", [["złoty", "złote", 100], ["grosz", "groszy", 1]], [[1995, 50000], [2004, 90000], [2019, 225000]]),
    EB]},
  russian: {label: "The Rus and Russia", list: [SHEKEL, ROMAN,
    m("denga", 900, 1534, "grivny and dengi", [["grivna of silver", "grivny of silver", 200], ["denga", "dengi", 1]], [[900, 40], [1197, 60], [1450, 100], [1534, 120]], false),
    m("rouble", 1535, 1917, "roubles", [["rouble", "roubles", 100], ["kopek", "kopeks", 1]], [[1535, 30], [1600, 60], [1700, 100], [1800, 400], [1861, 700], [1900, 1500], [1914, 2200], [1917, 10000]], 1860),
    m("sovznak", 1918, 1923, "Soviet paper roubles", [["rouble", "roubles", 100], ["kopek", "kopeks", 1]], [[1918, 50000], [1923, 1e11]]),
    m("sur-1", 1924, 1960, "Soviet roubles", [["rouble", "roubles", 100], ["kopek", "kopeks", 1]], [[1924, 4000], [1940, 30000], [1947, 50000], [1960, 70000]]),
    m("sur-2", 1961, 1991, "Soviet roubles", [["rouble", "roubles", 100], ["kopek", "kopeks", 1]], [[1961, 7000], [1980, 15000], [1991, 40000]]),
    m("rur", 1992, 1997, "roubles", [["rouble", "roubles", 100], ["kopek", "kopeks", 1]], [[1992, 300000], [1997, 80000000]]),
    m("rub", 1998, 2019, "roubles", [["rouble", "roubles", 100], ["kopek", "kopeks", 1]], [[1998, 80000], [2008, 1200000], [2019, 3000000]]),
    EB]},
  ottoman: {label: "Constantinople and Anatolia", list: [SHEKEL, ROMAN,
    m("nomisma", 900, 1299, "Byzantine money", [["hyperpyron", "hyperpyra", 288], ["miliaresion", "miliaresia", 24], ["follis", "folles", 1]], [[900, 288], [1197, 300], [1299, 320]], false),
    m("akce", 1300, 1687, "akçe", [["sultani", "sultanis", 60], ["akçe", "akçe", 1]], [[1300, 40], [1453, 90], [1550, 150], [1600, 300], [1687, 450]], false),
    m("kurus", 1688, 1843, "kuruş and para", [["kuruş", "kuruş", 120], ["para", "para", 3], ["akçe", "akçe", 1]], [[1688, 500], [1750, 800], [1800, 2400], [1843, 12000]], false),
    m("osm-lira", 1844, 1922, "Ottoman lira", [["lira", "lira", 4000], ["kuruş", "kuruş", 40], ["para", "para", 1]], [[1844, 4000], [1900, 8000], [1914, 10000], [1922, 200000]]),
    m("try-1", 1923, 2004, "Turkish lira", [["lira", "lira", 100], ["kuruş", "kuruş", 1]], [[1923, 3000], [1950, 10000], [1970, 100000], [1980, 1000000], [1990, 40000000], [2004, 4.5e10]]),
    m("try-2", 2005, 2019, "Turkish lira", [["lira", "lira", 100], ["kuruş", "kuruş", 1]], [[2005, 49000], [2019, 202000]]),
    EB]},
  arab: {label: "Egypt, the Levant and Arabia", list: [SHEKEL, {...DINAR, from: 696}, ROMAN,
    m("medin", 1517, 1833, "kuruş and para", [["kuruş", "kuruş", 120], ["para", "para", 3], ["akçe", "akçe", 1]], [[1517, 120], [1600, 300], [1700, 500], [1800, 2000], [1833, 4000]], false),
    m("pound-eg", 1834, 2019, "pounds and piastres", [["pound", "pounds", 1000], ["piastre", "piastres", 10], ["millieme", "milliemes", 1]], [[1834, 1000], [1900, 1500], [1920, 3000], [1950, 6000], [1970, 15000], [1990, 100000], [2004, 300000], [2019, 2000000]], 1860),
    EB]},
  persian: {label: "Persia and inner Asia", list: [SHEKEL,
    m("drachm", -800, 650, "drachms", [["drachm", "drachms", 6], ["pashiz", "pashiz", 1]], [[-800, 90], [650, 120]], false),
    DINAR,
    m("toman", 1501, 1931, "tomans and shahis", [["toman", "tomans", 10000], ["shahi", "shahis", 50], ["dinar", "dinars", 1]], [[1501, 3000], [1700, 6000], [1800, 15000], [1900, 60000], [1931, 150000]], 1890),
    m("rial", 1932, 2019, "rials", [["toman", "tomans", 10], ["rial", "rials", 1]], [[1932, 150], [1950, 1500], [1970, 6000], [1980, 30000], [2000, 500000], [2019, 15000000]]),
    EB]},
  indian: {label: "India", list: [
    m("pana", -99999, 1199, "panas", [["karshapana", "karshapanas", 16], ["mashaka", "mashakas", 1]], [[-600, 80], [1199, 100]], false),
    m("tanka", 1200, 1539, "tankas and jitals", [["tanka", "tankas", 48], ["jital", "jitals", 1]], [[1200, 72], [1350, 90], [1539, 120]], false),
    m("rupee", 1540, 1956, "rupees, annas and pies", [["rupee", "rupees", 192], ["anna", "annas", 12], ["pie", "pies", 1]], [[1540, 288], [1600, 300], [1700, 576], [1800, 768], [1900, 1536], [1920, 3000], [1947, 6000], [1956, 9000]], 1770),
    m("inr", 1957, 2019, "rupees", [["rupee", "rupees", 100], ["paisa", "paise", 1]], [[1957, 5000], [1970, 10000], [1990, 60000], [2004, 200000], [2019, 900000]]),
    EB]},
  chinese: {label: "China", list: [
    m("cash", -99999, 1888, "copper cash", [["string of cash", "strings of cash", 1000], ["cash", "cash", 1]], [[-221, 300], [900, 2000], [1197, 3000], [1400, 1000], [1600, 1200], [1800, 2000], [1888, 3500]], 1000),
    m("yuan", 1889, 1948, "silver yuan", [["yuan", "yuan", 100], ["fen", "fen", 1]], [[1889, 400], [1911, 700], [1930, 1500], [1937, 1500], [1945, 5000000], [1948, 1e12]]),
    m("rmb", 1949, 2019, "renminbi", [["yuan", "yuan", 100], ["jiao", "jiao", 10], ["fen", "fen", 1]], [[1949, 3000], [1978, 4500], [1990, 15000], [2004, 60000], [2019, 220000]]),
    EB]},
  japanese: {label: "Japan", list: [
    m("mon", -99999, 1600, "mon", [["kanmon", "kanmon", 1000], ["mon", "mon", 1]], [[708, 200], [1197, 600], [1450, 900], [1600, 1200]], false),
    m("ryo", 1601, 1870, "ryō, bu and mon", [["ryō", "ryō", 4000], ["bu", "bu", 1000], ["mon", "mon", 1]], [[1601, 1500], [1700, 2500], [1800, 4000], [1860, 6000], [1870, 20000]], 1700),
    m("yen-sen", 1871, 1953, "yen and sen", [["yen", "yen", 100], ["sen", "sen", 1]], [[1871, 300], [1900, 1200], [1920, 5000], [1935, 4500], [1945, 15000], [1950, 800000], [1953, 1200000]]),
    m("yen", 1954, 2019, "yen", [["yen", "yen", 1]], [[1954, 12000], [1970, 50000], [1980, 120000], [1990, 150000], [2019, 180000]]),
    EB]},
  "west-african": {label: "West Africa", list: [
    m("cowrie", -99999, 1900, "gold dust and cowries", [["mithqal of gold dust", "mithqals of gold dust", 2000], ["string of cowries", "strings of cowries", 40], ["cowrie", "cowries", 1]], [[1000, 600], [1197, 800], [1600, 1500], [1800, 3000], [1900, 6000]], false),
    m("wa-pound", 1901, 1972, "pounds, shillings and pence", LSD, [[1901, 180], [1920, 360], [1940, 480], [1957, 1200], [1972, 4800]]),
    m("naira", 1973, 2019, "naira", [["naira", "naira", 100], ["kobo", "kobo", 1]], [[1973, 6000], [1981, 12500], [1993, 25000], [2004, 750000], [2019, 3000000]]),
    EB]},
  "east-african": {label: "East Africa", list: [
    m("kilwa", -99999, 1820, "gold, dirhams and Kilwa copper", [["mithqal of gold", "mithqals of gold", 480], ["dirham", "dirhams", 24], ["copper coin", "copper coins", 1]], [[900, 300], [1197, 400], [1820, 500]], false),
    m("thaler", 1821, 1920, "thalers and rupees", [["Maria Theresa thaler", "Maria Theresa thalers", 128], ["rupee", "rupees", 64], ["pice", "pice", 1]], [[1821, 200], [1880, 320], [1920, 640]], 1890),
    m("ea-shilling", 1921, 2019, "shillings", [["shilling", "shillings", 100], ["cent", "cents", 1]], [[1921, 1500], [1950, 4000], [1966, 15000], [1990, 100000], [2004, 400000], [2019, 1500000]]),
    EB]},
  "southern-african": {label: "Southern Africa", list: [
    m("cattle", -99999, 1651, "cattle, hoes and beads", [["head of cattle", "head of cattle", 100], ["iron hoe", "iron hoes", 10], ["string of beads", "strings of beads", 1]], [[1197, 30], [1651, 30]], false),
    m("rixdollar", 1652, 1824, "rixdollars", [["rixdollar", "rixdollars", 48], ["stuiver", "stuivers", 1]], [[1652, 300], [1750, 400], [1824, 600]], false),
    m("za-pound", 1825, 1960, "pounds, shillings and pence", LSD, [[1825, 360], [1870, 480], [1900, 720], [1930, 960], [1960, 2400]]),
    m("rand", 1961, 2019, "rand", [["rand", "rand", 100], ["cent", "cents", 1]], [[1961, 2000], [1980, 10000], [1994, 60000], [2004, 120000], [2019, 350000]]),
    EB]},
  mexican: {label: "Mexico and New Spain", list: [
    m("cacao", -99999, 1520, "cacao beans and cotton cloaks", [["cotton cloak", "cotton cloaks", 100], ["cacao bean", "cacao beans", 1]], [[1197, 600], [1520, 600]], false),
    m("mx-real", 1521, 1862, "pesos and reales", [["peso", "pesos", 96], ["real", "reales", 12], ["grano", "granos", 1]], [[1521, 200], [1600, 384], [1700, 400], [1800, 480], [1862, 600]], false),
    m("mx-peso", 1863, 1992, "pesos", [["peso", "pesos", 100], ["centavo", "centavos", 1]], [[1863, 800], [1900, 1000], [1920, 3000], [1950, 15000], [1970, 80000], [1982, 800000], [1992, 40000000]]),
    m("mxn", 1993, 2019, "new pesos", [["peso", "pesos", 100], ["centavo", "centavos", 1]], [[1993, 40000], [2004, 130000], [2019, 310000]]),
    EB]},
  brazilian: {label: "Brazil", list: [BARTER,
    m("reis", 1500, 1941, "réis", [["mil-réis", "mil-réis", 1000], ["real", "réis", 1]], [[1500, 600], [1700, 3000], [1800, 6000], [1888, 30000], [1920, 90000], [1941, 200000]], 1808),
    m("cruzeiro", 1942, 1993, "cruzeiros (recut several times; house figures)", [["cruzeiro", "cruzeiros", 100], ["centavo", "centavos", 1]], [[1942, 24000], [1960, 960000], [1993, 2000000]]),
    m("brl", 1994, 2019, "reais", [["real", "reais", 100], ["centavo", "centavos", 1]], [[1994, 7000], [2004, 26000], [2019, 99800]]),
    EB]},
  australian: {label: "Australia and Aotearoa", list: [{...BARTER, to: 1787},
    m("au-pound", 1788, 1965, "pounds, shillings and pence", LSD, [[1788, 240], [1850, 960], [1900, 1920], [1920, 3600], [1950, 9600], [1965, 19200]], 1817),
    m("aud", 1966, 2019, "dollars", [["dollar", "dollars", 100], ["cent", "cents", 1]], [[1966, 16000], [1980, 80000], [1990, 150000], [2004, 200000], [2019, 320000]]),
    EB]},
  pacific: {label: "The Pacific islands", else: "american", list: [{...BARTER, to: 1819}]}
};

/* ---------------------------------------------------------------- every land its own money (0.58.0) */

/*
 * Storyteller 0.58.0 (B2650): the lands that borrowed a neighbour's money now have their own. Korea, mainland
 * Southeast Asia, the Malay world, Hungary and the Balkans, Greece, the Caribbean, the Andes, the River Plate,
 * Kongo, Tibet and Canada. Where a land paid in a neighbour's coin in fact (pieces of eight in Havana and Potosí,
 * the akçe in Ottoman Greece, the renminbi in Lhasa, the livre in New France) the very same money is shared, so no
 * changer stands between them in those years. Every figure is history rounded for play, a house rule; the books
 * name no coins or wages for these lands.
 */
const pick = (region, id, over = {}) => ({...MONIES[region].list.find(x => x.id === id), ...over});
Object.assign(MONIES, {
  korean: {label: "Korea", list: [
    m("ko-cloth", -99999, 1677, "hemp cloth, rice and silver", [["bolt of cloth", "bolts of cloth", 40], ["mal of rice", "mal of rice", 1]], [[900, 40], [1197, 40], [1677, 60]], false),
    m("sangpyeong", 1678, 1891, "copper sangpyeong cash", [["nyang", "nyang", 100], ["jeon", "jeon", 10], ["mun", "mun", 1]], [[1678, 300], [1800, 500], [1891, 1500]], false),
    m("ko-yang", 1892, 1909, "yang and won of the Korean Empire", [["yang", "yang", 100], ["fun", "fun", 1]], [[1892, 1500], [1909, 3000]], 1897),
    m("ko-yen", 1910, 1945, "Korean yen", [["yen", "yen", 100], ["sen", "sen", 1]], [[1910, 2000], [1935, 3000], [1945, 15000]]),
    m("ko-won-1", 1946, 1952, "won (the first)", [["won", "won", 100], ["jeon", "jeon", 1]], [[1946, 100000], [1952, 5000000]]),
    m("hwan", 1953, 1961, "hwan", [["hwan", "hwan", 100], ["jeon", "jeon", 1]], [[1953, 200000], [1961, 1500000]]),
    m("krw", 1962, 2019, "won", [["won", "won", 1]], [[1962, 3000], [1970, 15000], [1980, 150000], [1990, 400000], [2004, 1200000], [2019, 2000000]]),
    EB]},
  "southeast-asian": {label: "Mainland Southeast Asia", list: [
    m("sea-silver", -99999, 1349, "silver by weight, rice and cloth", [["tael of silver", "taels of silver", 100], ["measure of rice", "measures of rice", 1]], [[900, 60], [1197, 70], [1349, 80]], false),
    m("tical", 1350, 1903, "bullet ticals and fuang", [["tical", "ticals", 8], ["fuang", "fuang", 1]], [[1350, 8], [1600, 12], [1800, 24], [1903, 80]], false),
    m("baht", 1904, 2019, "baht", [["baht", "baht", 100], ["satang", "satang", 1]], [[1904, 1000], [1950, 30000], [1970, 60000], [1990, 300000], [2004, 600000], [2019, 1000000]]),
    EB]},
  malay: {label: "The Malay world", list: [
    m("mas", -99999, 1299, "gold mas and silver by weight", [["tahil of gold", "tahils of gold", 16], ["mas", "mas", 1]], [[900, 4], [1197, 4], [1299, 4]], false),
    m("picis", 1300, 1816, "Chinese copper picis on strings", [["string of picis", "strings of picis", 200], ["picis", "picis", 1]], [[1300, 1500], [1600, 3000], [1816, 6000]], false),
    m("ni-guilder", 1817, 1945, "Netherlands Indies guilders", [["guilder", "guilders", 100], ["cent", "cents", 1]], [[1817, 300], [1900, 600], [1940, 1200], [1945, 5000]], 1828),
    m("rupiah", 1946, 2019, "rupiah (recut in 1965; house figures)", [["rupiah", "rupiah", 1]], [[1946, 30], [1960, 500], [1966, 3000], [1990, 100000], [2004, 700000], [2019, 3000000]]),
    EB]},
  hungarian: {label: "Hungary, Transylvania and the Balkans", list: [SHEKEL, ROMAN,
    m("hu-denar", 900, 1324, "silver by weight, then Hungarian denars", [["mark of silver", "marks of silver", 400], ["denar", "denars", 2], ["obol", "obols", 1]], [[900, 60], [1197, 100], [1324, 140]], false),
    m("hu-gold", 1325, 1526, "gold forints and silver denars", [["forint", "forints", 200], ["denar", "denars", 2], ["obol", "obols", 1]], [[1325, 200], [1450, 300], [1526, 400]], false),
    m("hu-forint-cm", 1527, 1857, "forints and krajcár", [["forint", "forints", 60], ["krajcár", "krajcár", 1]], [[1527, 60], [1700, 180], [1857, 600]], 1841),
    m("hu-forint-oe", 1858, 1891, "forints and krajcár (Austrian standard)", [["forint", "forints", 100], ["krajcár", "krajcár", 1]], [[1858, 1200], [1891, 1800]]),
    m("korona", 1892, 1926, "korona and fillér", [["korona", "korona", 100], ["fillér", "fillér", 1]], [[1892, 4000], [1914, 7000], [1918, 15000], [1926, 3000000]]),
    m("pengo", 1927, 1946, "pengő and fillér", [["pengő", "pengő", 100], ["fillér", "fillér", 1]], [[1927, 8000], [1938, 10000], [1944, 30000], [1946, 1e15]]),
    m("huf", 1947, 2019, "forints and fillér", [["forint", "forints", 100], ["fillér", "fillér", 1]], [[1947, 30000], [1960, 150000], [1980, 500000], [1990, 1200000], [2004, 10000000], [2019, 30000000]]),
    EB]},
  greek: {label: "Greece", list: [SHEKEL, ROMAN,
    pick("ottoman", "nomisma", {to: 1452}),
    pick("ottoman", "akce", {from: 1453}),
    pick("ottoman", "kurus", {to: 1831}),
    m("drachma-1", 1832, 1953, "drachmas and lepta", [["drachma", "drachmas", 100], ["lepton", "lepta", 1]], [[1832, 3000], [1900, 6000], [1920, 30000], [1940, 300000], [1953, 1e8]], 1841),
    m("grd", 1954, 2001, "new drachmas", [["drachma", "drachmas", 100], ["lepton", "lepta", 1]], [[1954, 60000], [1970, 300000], [1980, 1200000], [1990, 8000000], [2001, 20000000]]),
    EURO([[2002, 90000], [2019, 110000]]), EB]},
  caribbean: {label: "The Caribbean", list: [{...BARTER, to: 1491},
    pick("mexican", "mx-real", {from: 1492, to: 1856}),
    m("cu-peso", 1857, 2019, "pesos", [["peso", "pesos", 100], ["centavo", "centavos", 1]], [[1857, 1500], [1900, 3000], [1950, 8000], [1960, 10000], [1990, 15000], [2019, 40000]]),
    EB]},
  andean: {label: "The Andes", list: [
    m("andes-cloth", -99999, 1532, "cloth, labour and goods in kind", [["bale of cloth", "bales of cloth", 100], ["measure of maize", "measures of maize", 1]], [[1197, 600], [1532, 600]], false),
    pick("mexican", "mx-real", {from: 1533}),
    m("sol", 1863, 1985, "soles", [["sol", "soles", 100], ["centavo", "centavos", 1]], [[1863, 1000], [1900, 1500], [1950, 30000], [1970, 300000], [1985, 5e7]]),
    m("inti", 1986, 1990, "intis", [["inti", "intis", 100], ["céntimo", "céntimos", 1]], [[1986, 50000], [1990, 5e9]]),
    m("pen", 1991, 2019, "new soles", [["sol", "soles", 100], ["céntimo", "céntimos", 1]], [[1991, 15000], [2004, 50000], [2019, 100000]]),
    EB]},
  platine: {label: "The River Plate and Chile", list: [{...BARTER, to: 1535},
    pick("mexican", "mx-real", {from: 1536, to: 1880}),
    m("ar-peso", 1881, 1969, "pesos", [["peso", "pesos", 100], ["centavo", "centavos", 1]], [[1881, 3000], [1914, 10000], [1950, 50000], [1969, 2000000]]),
    m("ar-peso-2", 1970, 1991, "pesos (recut four times; house figures)", [["peso", "pesos", 100], ["centavo", "centavos", 1]], [[1970, 50000], [1980, 5000000], [1991, 1e8]]),
    m("ars", 1992, 2019, "pesos", [["peso", "pesos", 100], ["centavo", "centavos", 1]], [[1992, 50000], [2004, 80000], [2019, 1500000]]),
    EB]},
  kongo: {label: "Kongo and central Africa", list: [
    m("nzimbu", -99999, 1884, "nzimbu shells and raffia cloth", [["raffia cloth", "raffia cloths", 100], ["nzimbu shell", "nzimbu shells", 1]], [[1197, 600], [1600, 800], [1884, 1200]], false),
    m("cg-franc", 1885, 1960, "Congo francs", [["franc", "francs", 100], ["centime", "centimes", 1]], [[1885, 1000], [1920, 3000], [1950, 30000], [1960, 60000]], 1909),
    m("cd-franc", 1961, 2019, "zaires and Congolese francs (recut often; house figures)", [["franc", "francs", 100], ["centime", "centimes", 1]], [[1961, 300000], [1990, 1e8], [2019, 1e7]]),
    EB]},
  tibetan: {label: "Tibet and the Himalaya", list: [
    m("tea-brick", -99999, 1639, "silver by weight, tea bricks and barley", [["srang of silver", "srang of silver", 100], ["brick of tea", "bricks of tea", 10], ["measure of barley", "measures of barley", 1]], [[900, 60], [1197, 60], [1639, 80]], false),
    m("tangka", 1640, 1950, "tangka, srang and sho", [["srang", "srang", 100], ["sho", "sho", 10], ["skar", "skar", 1]], [[1640, 100], [1800, 200], [1900, 400], [1950, 1500]], false),
    pick("chinese", "rmb", {from: 1951}),
    EB]},
  canadian: {label: "Canada", list: [{...BARTER, to: 1607},
    pick("french", "tournois", {from: 1608, to: 1759}),
    m("ca-pound", 1760, 1857, "pounds, shillings and pence (Halifax currency)", LSD, [[1760, 480], [1857, 1440]], 1817),
    m("cad", 1858, 2019, "Canadian dollars", [["dollar", "dollars", 100], ["cent", "cents", 1]], [[1858, 2000], [1900, 4000], [1950, 20000], [1970, 50000], [1990, 150000], [2004, 200000], [2019, 300000]]),
    EB]}
});

/*
 * B3190: the Philippines, Indochina and the Balkans had coin of their own though WoDX Chronicle files them under a
 * wider region (the Malay world, mainland Southeast Asia, Hungary and the Balkans). A scene there names its money in
 * Where this scene stands; the chronicle's money (Coins of the day) can name them too. History rounded for play, a
 * house rule; the books name no coins or wages for these lands.
 */
Object.assign(MONIES, {
  philippine: {label: "The Philippines", list: [
    m("ph-gold", -99999, 1564, "gold by weight and piloncitos", [["tahil of gold", "tahils of gold", 16], ["mas", "mas", 1]], [[900, 4], [1197, 4], [1564, 4]], false),
    pick("mexican", "mx-real", {from: 1565, to: 1856}),
    m("ph-peso-es", 1857, 1902, "Philippine pesos", [["peso", "pesos", 100], ["centavo", "centavos", 1]], [[1857, 600], [1902, 800]], 1852),
    m("ph-peso", 1903, 1966, "Philippine pesos", [["peso", "pesos", 100], ["centavo", "centavos", 1]], [[1903, 1500], [1940, 3000], [1950, 6000], [1966, 12000]]),
    m("php", 1967, 2019, "piso", [["piso", "piso", 100], ["sentimo", "sentimo", 1]], [[1967, 15000], [1980, 60000], [1990, 250000], [2004, 600000], [2019, 1000000]]),
    EB]},
  indochinese: {label: "Indochina (Vietnam, Cambodia, Laos)", list: [
    m("dv-cash", -99999, 1884, "copper cash of Đại Việt", [["quan", "quan", 600], ["mạch", "mạch", 60], ["cash", "cash", 1]], [[900, 1500], [1197, 1800], [1600, 2400], [1884, 3000]], false),
    m("piastre", 1885, 1953, "French Indochinese piastres", [["piastre", "piastres", 100], ["cent", "cents", 1]], [[1885, 600], [1920, 1200], [1945, 3000], [1953, 15000]]),
    m("dong-1", 1954, 1977, "đồng (the riel and the kip beyond Vietnam)", [["đồng", "đồng", 100], ["xu", "xu", 1]], [[1954, 6000], [1977, 30000]]),
    m("vnd", 1978, 2019, "đồng (recut in 1985; house figures)", [["đồng", "đồng", 1]], [[1978, 100], [1986, 10000], [1990, 100000], [2004, 600000], [2019, 4000000]]),
    EB]},
  balkan: {label: "The Balkans (Serbia, Bulgaria, Romania, Bosnia)", list: [SHEKEL, ROMAN,
    pick("ottoman", "nomisma", {to: 1213}),
    m("rs-dinar", 1214, 1458, "Serbian silver dinars", [["perper", "perpers", 12], ["dinar", "dinars", 1]], [[1214, 60], [1458, 80]], false),
    pick("ottoman", "akce", {from: 1459}),
    pick("ottoman", "kurus", {to: 1866}),
    m("rs-dinar-2", 1867, 1919, "Serbian dinars (the leu and the lev alongside)", [["dinar", "dinars", 100], ["para", "para", 1]], [[1867, 3000], [1914, 6000], [1919, 20000]], 1884),
    m("yu-dinar", 1920, 1993, "Yugoslav dinars (recut in 1966; house figures)", [["dinar", "dinars", 100], ["para", "para", 1]], [[1920, 80000], [1940, 150000], [1965, 4000000], [1966, 40000], [1990, 5000000], [1993, 1e12]]),
    m("rsd", 1994, 2019, "new dinars", [["dinar", "dinars", 100], ["para", "para", 1]], [[1994, 10000], [2004, 1500000], [2019, 5000000]]),
    EB]}
});

/*
 * B3552: the Underworld's money. Oboli are the one coin every Stygian market takes (Wraith 20th p. 44); prices go as
 * low as a thirty-second of an obolus, paid with a cut fragment, so the smallest unit here is that fragment ("a
 * sliver", WoDX's word). Hard coin is scarce and most trade runs on ledgers of what would be owed (p. 45), so the
 * wage is small and no one banks it. One money for every era: after Stygia falls in 1999 the coins still pass, under
 * whoever holds the forges (COINS below). House figures; the books give no wage.
 */
MONIES.underworld = {label: "The Underworld (oboli)", list: [
  {id: "oboli", from: -99999, to: 99999, label: "oboli", units: [["obolus", "oboli", 32], ["sliver of an obolus", "slivers of an obolus", 1]], bank: false, wage: [[-99999, 16]]}]};


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

/* ---------------------------------------------------------------- money changers (0.56.0) */

/**
 * Money changers (Ben's pick on the Global World Desk, 2026-11-13; house figures, the books give none). A purse
 * keeps the coin of home. Far from home a price is still charged to that purse, with a changer's cut on top:
 * the share by age (the last year each share holds to), more where the land is troubled, never above `most`.
 */
export const CHANGER = {cut: [[1499, 0.06], [1799, 0.04], [1913, 0.02], [99999, 0.03]], troubled: 0.05, most: 0.15};

/** Do two money regions use the same money in a year (so nobody needs a changer)? */
export const sameMoney = (year, a, b) => moneyFor(year, a).id === moneyFor(year, b).id;

/** The changer's share of a sum changed in a year: 0 where both lands use one money. */
export function changerCut(year, {troubled = false, from = null, to = null} = {}) {
  if ( from && to && sameMoney(year, from, to) ) return 0;
  const y = Number(year) || 0;
  const base = (CHANGER.cut.find(([until]) => y <= until) ?? CHANGER.cut[CHANGER.cut.length - 1])[1];
  return Math.min(CHANGER.most, Math.round((base + (troubled ? CHANGER.troubled : 0)) * 100) / 100);
}

/** A sum in one region's money as the same buying power in another's (by the two wages), before any cut. */
export function exchange(amount, year, from = "moravian", to = "moravian") {
  const a = wageAt(year, from), b = wageAt(year, to);
  return a > 0 ? Math.round((Number(amount) || 0) * b / a) : 0;
}

/**
 * A price met far from home. homePrice: what the thing costs at home, in home money's smallest unit.
 * Returns {total (charged to the purse, cut included), cut (the changer's part), share, local (the price in the
 * money of the place, as the seller names it), localMoney}. Same money on both sides: no cut.
 */
export function priceAbroad(homePrice, year, home = "moravian", away = "moravian", {troubled = false} = {}) {
  const price = Math.max(0, Math.round(Number(homePrice) || 0));
  const share = changerCut(year, {troubled, from: home, to: away});
  const cut = share > 0 ? Math.max(price > 0 ? 1 : 0, Math.round(price * share)) : 0;
  const localMoney = moneyFor(year, away);
  return {total: price + cut, cut, share, local: Math.max(price > 0 ? 1 : 0, exchange(price, year, home, away)), localMoney};
}

/** Money changed outright (a purse turned into the coin of the place, or back): what is handed over after the cut. */
export function changeMoney(amount, year, from = "moravian", to = "moravian", {troubled = false} = {}) {
  const gross = exchange(amount, year, from, to), share = changerCut(year, {troubled, from, to});
  const cut = Math.round(gross * share);
  return {gross, cut, got: gross - cut, share, money: moneyFor(year, to)};
}

/** Months to pay when the clock moves from one month count to another: every month, twelve at most. */
export const monthsToPay = (paidMonth, month) => (paidMonth === null || paidMonth === undefined || paidMonth < 0) ? 1 : Math.max(0, Math.min(12, month - paidMonth));

/* ---------------------------------------------------------------- coin of the place in the purse (0.58.0) */

/**
 * Storyteller 0.58.0 (B2651): a purse can hold coin of other lands beside the coin of home, changed at a money
 * changer when a character travels. purse.foreign = {[money id]: {region (money region), amount (smallest unit)}}.
 * Abroad, a price is paid first from coin of the place, with no changer; what that coin cannot cover is still
 * charged to home money with the cut. House rule; the books give no exchange rules.
 */
export function cleanForeign(foreign) {
  const out = {};
  for ( const [id, f] of Object.entries(foreign && typeof foreign === "object" ? foreign : {}) ) {
    const amount = Math.max(0, Math.round(Number(f?.amount) || 0));
    if ( amount > 0 && f?.region && MONIES[f.region] ) out[id] = {region: f.region, amount};
  }
  return out;
}

/**
 * Pay a price met abroad, part from coin of the place. homeAmount: the price charged to home money, the cut
 * included (as priceAbroad's total). held: coin of the place in the purse. Returns {local (coin of the place
 * spent), home (home money still owed, cut included)}.
 */
export function splitAbroad(homeAmount, held, year, home = "moravian", away = "moravian", {troubled = false} = {}) {
  const amt = Math.max(0, Math.round(Number(homeAmount) || 0)), have = Math.max(0, Math.round(Number(held) || 0));
  if ( !amt || !have || sameMoney(year, home, away) ) return {local: 0, home: amt};
  const share = changerCut(year, {troubled, from: home, to: away});
  const need = Math.max(1, exchange(Math.round(amt / (1 + share)), year, home, away));
  if ( have >= need ) return {local: need, home: 0};
  return {local: have, home: Math.ceil(amt * (1 - have / need))};
}

/** Coin of other lands whose money has gone out of use by this year: [money id...] (they become keepsakes). */
export const staleForeign = (foreign, year) => Object.entries(cleanForeign(foreign)).filter(([id, f]) => moneyFor(year, f.region).id !== id).map(([id]) => id);
