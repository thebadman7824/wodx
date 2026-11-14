/**
 * WoDX Chronicle 0.16.0: how fast word travels in each age (B707 to B709); by region from 0.50.0 (B2570). Pure rules, shared by the rumour mill of
 * WoDX Storyteller and the Masquerade breaches of WoDX NPC, so the two never disagree about the year.
 *
 * House figures, rounded: the books give no rate for gossip. The years below are the Czech lands' (REGION_MEDIA has
 * every region's): printing in Moravia from
 * the late fifteenth century, the papers free to print after 1848, broadcast radio from 1923, television from 1953,
 * the internet in homes from the mid-1990s. The Net of the Future Darkness runs only on that branch.
 *
 *   heat     how many new people each knower tells a night
 *   places   how many new places a breach reaches a day, for each step of its severity
 *   flood    big news (a rumour marked big, or a breach of severity 2 or more) reaches everyone it can in one night
 */
export const MEDIA = [
  {id: "word", label: "Word of mouth", from: -9999, heat: 2, places: 1, flood: false},
  {id: "print", label: "Printed sheets and pamphlets", from: 1490, heat: 2, places: 1, flood: false, bigHeat: 4},
  {id: "papers", label: "The newspapers", from: 1848, heat: 3, places: 2, flood: true},
  {id: "radio", label: "The wireless", from: 1923, heat: 3, places: 2, flood: true},
  {id: "television", label: "Television", from: 1953, heat: 4, places: 3, flood: true},
  {id: "internet", label: "The internet", from: 1995, heat: 6, places: 4, flood: true},
  {id: "net", label: "The Net", from: 2026, heat: 8, places: 5, flood: true, future: true}
];

/**
 * Chronicle 0.50.0 (B2570): when each way of spreading word reached each of the world's regions (world-rules.mjs).
 * The years in MEDIA above are Moravia's; a region named here keeps its own. Columns: print, papers, radio,
 * television, internet. null: that way never takes hold there in WoDX (the age goes straight on to the next one).
 *
 *   print       news on paper anyone can buy: pamphlets, news sheets, gazettes (China's court gazette and its small
 *               private news sheets ran long before 1197; Japan's tile-block sheets from 1615; the Ottoman lands had
 *               almost no press until 1727 and no paper of their own until the 1830s; Brazil had no press before 1808)
 *   papers      papers cheap enough that big news reaches a whole town in a night (the penny press, a free press)
 *   radio       broadcast radio in many homes or in every square
 *   television  television in many homes
 *   internet    the internet in many homes, or in every pocket where phones came first
 *
 * A house reading of history, rounded to the year a thing became common, not the year of the first trial. The books
 * give no such table.
 */
const MY = (print, papers, radio, television, internet) => ({print, papers, radio, television, internet});
export const REGION_MEDIA = {
  "moravia": MY(1490, 1848, 1923, 1953, 1995),
  "german-lands": MY(1460, 1848, 1923, 1952, 1996),
  "british-isles": MY(1480, 1800, 1922, 1946, 1995),
  "france": MY(1470, 1789, 1922, 1950, 1997),
  "iberia": MY(1475, 1850, 1924, 1956, 1997),
  "italy": MY(1470, 1848, 1924, 1954, 1997),
  "low-countries": MY(1475, 1800, 1923, 1951, 1995),
  "scandinavia": MY(1490, 1830, 1923, 1956, 1994),
  "poland-baltic": MY(1475, 1860, 1925, 1952, 1998),
  "carpathians-balkans": MY(1475, 1848, 1925, 1957, 1999),
  "russia": MY(1700, 1865, 1924, 1951, 2000),
  "aegean": MY(1727, 1860, 1938, 1966, 1999),
  "anatolia": MY(1727, 1860, 1927, 1968, 2001),
  "levant": MY(1834, 1870, 1935, 1959, 2003),
  "egypt": MY(1828, 1876, 1934, 1960, 2003),
  "arabia": MY(1883, 1924, 1949, 1965, 2001),
  "maghreb": MY(1860, 1880, 1930, 1962, 2005),
  "persia": MY(1837, 1906, 1940, 1958, 2003),
  "central-asia": MY(1870, 1917, 1927, 1958, 2008),
  "siberia": MY(1857, 1890, 1930, 1965, 2005),
  "tibet-himalaya": MY(1925, 1950, 1959, 1985, 2012),
  "india": MY(1780, 1860, 1927, 1980, 2010),
  "china": MY(-9999, 1872, 1923, 1978, 2002),
  "japan": MY(1615, 1870, 1925, 1953, 1996),
  "korea": MY(1577, 1896, 1927, 1961, 1998),
  "southeast-asia": MY(1844, 1900, 1930, 1965, 2005),
  "nusantara": MY(1744, 1900, 1934, 1962, 2008),
  "west-africa": MY(1859, 1920, 1935, 1965, 2012),
  "central-africa": MY(1900, 1950, 1940, 1975, 2015),
  "east-africa": MY(1890, 1930, 1928, 1963, 2010),
  "southern-africa": MY(1800, 1860, 1924, 1976, 2003),
  "canada": MY(1752, 1840, 1922, 1952, 1995),
  "north-america-east": MY(1640, 1833, 1920, 1948, 1994),
  "north-america-west": MY(1835, 1860, 1922, 1948, 1994),
  "mexico": MY(1541, 1850, 1923, 1950, 2002),
  "caribbean": MY(1720, 1850, 1922, 1950, 2005),
  "andes": MY(1594, 1860, 1925, 1960, 2005),
  "brazil": MY(1808, 1850, 1923, 1950, 2000),
  "southern-cone": MY(1780, 1870, 1920, 1951, 2000),
  "australia": MY(1803, 1850, 1923, 1956, 1996),
  "aotearoa": MY(1840, 1860, 1922, 1960, 1996),
  "pacific-islands": MY(1822, 1880, 1922, 1952, 1998),
  "arctic": MY(1861, 1920, 1925, 1970, 2000),
  "antarctica": MY(1908, null, 1930, null, 2000)
};

/**
 * The ways word travels in a region, with that region's years (Moravia's for a region not listed), weakest first.
 * Where a stronger way came before a weaker one (the wireless in central Africa before cheap papers), the stronger
 * one stands from its own year.
 */
export function mediaOf(region = null) {
  const own = region && Object.hasOwn(REGION_MEDIA, region) ? REGION_MEDIA[region] : null;
  if ( !own ) return MEDIA;
  return MEDIA.map(m => (m.id in own ? {...m, from: own[m.id] ?? Infinity} : m));
}

/** The year a way of spreading word reached a region; null when it never does. */
export function mediaYear(id, region = null) {
  const m = mediaOf(region).find(x => x.id === id);
  return m && Number.isFinite(m.from) ? m.from : null;
}

/** The newest way word travels in a year (in a region: its own years). No year known: word of mouth. */
export function mediaFor(year, {future = false, region = null} = {}) {
  const y = Number(year);
  if ( !Number.isFinite(y) || !y ) return MEDIA[0];
  let out = MEDIA[0];
  for ( const m of mediaOf(region) ) if ( y >= m.from && (!m.future || future) ) out = m;
  return out;
}

/** How many each knower tells a night. big: news the papers (or the print shop) would carry. Infinity for a flood. */
export function rumourHeat(year, {big = false, future = false, region = null} = {}) {
  const m = mediaFor(year, {future, region});
  if ( big && m.flood ) return Infinity;
  if ( big && m.bigHeat ) return m.bigHeat;
  return m.heat;
}

/** How many new places a breach reaches in a day: its severity times the age's reach; a flood reaches them all. */
export function breachReach(severity, year, {future = false, region = null} = {}) {
  const s = Math.max(0, Math.trunc(Number(severity) || 0));
  if ( !s ) return 0;
  const m = mediaFor(year, {future, region});
  if ( s >= 2 && m.flood ) return Infinity;
  return s * m.places;
}

/** Chance that a telling twists the tale (the rumour mill's optional garbling). House figure. */
export const TWIST_CHANCE = 0.15;
