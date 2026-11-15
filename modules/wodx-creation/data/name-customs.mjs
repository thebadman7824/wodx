/**
 * Naming customs by year (desk nm1, B6250 to B6253). The name tables give each people its names by era group; this
 * file says, for the exact year, what shape the second name takes and whether a household shares it:
 *
 *   given     one name only; a second name drawn from the tables is dropped
 *   byname    a second name that belongs to the person alone: a trade, a place, a nickname or the father's name.
 *             Kin do not share it; a child takes the father's name where the people names children that way.
 *   settling  bynames turning into family names: the share that is already inherited rises from `a` at `from` to
 *             `b` at `to` (straight line), drawn once for each person from their own name; `unset: "given"`
 *             where those who have no family name yet bear one name alone (Japan, Korea)
 *   family    a family name that passes to the household. A "son of" pattern drawn from an older table is replaced
 *             by a family name of the people's next list (the Turkish law of 1934, the patent of 1787 for Jews)
 *
 * `noble`: from this year a noble, knight, lord or samurai bears an inherited name whatever the commoners do.
 * Each people lists its stages oldest first; a stage holds until the next. A people not listed here keeps exactly
 * what its tables give (no stage was found in a source WoDX could check; listed in docs/PENDING-REVIEW.md as still open).
 * Every stage carries its source. No year is filled in by guess.
 */

/** A stage: from (year), form, and for settling `to`, `a`, `b`. */
const st = (from, form, more = {}) => ({from, form, ...more});

export const NAME_CUSTOMS = {
  // Bynames until the mid-1300s, inherited by most families in Bohemia and Moravia by the 1600s; the lords' "z" of
  // their seat from the 1200s. Source: D. Moldanová, Naše příjmení (1983); J. Beneš, O českých příjmeních (1962).
  czech: {noble: 1197, stages: [st(1197, "byname"), st(1350, "settling", {to: 1700, a: 0.1, b: 1})],
    source: "Moldanová, Naše příjmení (1983); Beneš, O českých příjmeních (1962)"},
  slovak: {stages: [st(1197, "family")], source: "the modern lists only (from 1990)"},
  // German bynames became inherited from the 1100s in the towns of the west and south to the 1500s in the
  // countryside. Source: A. Bach, Deutsche Namenkunde I (1952).
  german: {noble: 1197, stages: [st(1197, "byname"), st(1300, "settling", {to: 1600, a: 0.15, b: 1})],
    source: "Bach, Deutsche Namenkunde I (1952)"},
  // The Jews of the Habsburg lands: "ben" or "bat" the father's name, with a few old families, until Joseph II's
  // patent of 23 July 1787 required every Jewish family to take a fixed (German) family name.
  jewish: {stages: [st(1197, "byname"), st(1787, "family")],
    source: "Joseph II's patent on Jewish names, 23 July 1787; Beider, A Dictionary of Jewish Surnames from Galicia (2004)"},
  // English bynames became inherited between about 1250 and 1450, the gentry first.
  english: {noble: 1197, stages: [st(1197, "byname"), st(1250, "settling", {to: 1450, a: 0.1, b: 1})],
    source: "R. McKinley, A History of British Surnames (1990); Reaney and Wilson, A Dictionary of English Surnames (1991)"},
  anglo: {stages: [st(1197, "family")], source: "the American lists begin in the 1800s, long after English names were fixed"},
  // Ó and Mac names were inherited from the 10th and 11th centuries.
  irish: {stages: [st(1197, "family")], source: "E. MacLysaght, The Surnames of Ireland (1985)"},
  // French bynames became inherited from the 1200s to the 1400s; the ordinance of Villers-Cotterêts (1539) had the
  // parishes write them down.
  french: {noble: 1197, stages: [st(1197, "settling", {to: 1450, a: 0.2, b: 1}), st(1450, "family")],
    source: "A. Dauzat, Les noms de famille de France (1945); ordinance of Villers-Cotterêts, 1539"},
  // Italy, Spain and Portugal: bynames settling over the late Middle Ages; the Council of Trent's decree of 1563
  // on parish registers fixed them in writing.
  italian: {noble: 1197, stages: [st(1197, "settling", {to: 1564, a: 0.3, b: 1}), st(1564, "family")],
    source: "Council of Trent, session 24 (1563), Tametsi; E. De Felice, Dizionario dei cognomi italiani (1978)"},
  spanish: {noble: 1197, stages: [st(1197, "settling", {to: 1564, a: 0.3, b: 1}), st(1564, "family")],
    source: "Council of Trent, session 24 (1563), Tametsi; G. Salazar Acha, Génesis y evolución del apellido en España (1991)"},
  hispanic: {stages: [st(1197, "family")], source: "the American lists begin in the 1800s"},
  portuguese: {noble: 1197, stages: [st(1197, "settling", {to: 1564, a: 0.3, b: 1}), st(1564, "family")],
    source: "Council of Trent, session 24 (1563), Tametsi"},
  // The Low Countries: father's names (Janszoon) in much of the north until the French decree of 18 August 1811
  // made everyone register a fixed family name.
  dutch: {noble: 1197, stages: [st(1197, "settling", {to: 1811, a: 0.3, b: 0.8}), st(1811, "family")],
    source: "Napoleonic decree of 18 August 1811 (Kingdom of Holland); Meertens Instituut, Nederlandse Familienamenbank"},
  // Sweden: father's names (Eriksson, Eriksdotter) for most people; the Name Ordinance of 5 December 1901 froze the
  // name a person had, so from then children took it unchanged. The Name Act of 1963 required a family name of all.
  norse: {noble: 1197, stages: [st(1197, "byname"), st(1860, "settling", {to: 1901, a: 0.1, b: 0.9}), st(1901, "family")],
    source: "Name Ordinance of 5 December 1901 and Name Act 1963:521 (H. Högman, Name laws in Sweden)"},
  // Iranians bore titles, nisbas and father's names until the civil registration law of Reza Shah's reign (1925)
  // made every family take a family name.
  persian: {stages: [st(1197, "byname"), st(1925, "family")],
    source: "Civil registration law of 1925 (1304 SH); Encyclopaedia Iranica, 'Names, personal'"},
  // Turkey: no family names until the Surname Law of 21 June 1934.
  turkish: {noble: null, stages: [st(1197, "byname"), st(1934, "family")], source: "Surname Law no. 2525, 21 June 1934"},
  // Romania: father's names and bynames until the name reform of about 1850 brought given name and family name.
  romanian: {stages: [st(1197, "byname"), st(1850, "family")], source: "the name reform of about 1850 (Romanian civil records; Iordan, Dicționar al numelor de familie românești, 1983)"},
  // Japan: in the Edo years commoners could not use a family name in public; the edict of 19 September 1870 let them,
  // and the edict of 13 February 1875 made them take one. Samurai and the court nobles bore theirs throughout.
  japanese: {noble: 1197, stages: [st(1197, "given"), st(1870, "settling", {to: 1875, a: 0.3, b: 1, unset: "given"}), st(1875, "family")],
    source: "Heimin myōji kyoka rei, 19 September 1870, and Heimin myōji hisshō gimu rei, 13 February 1875 (National Archives of Japan)"},
  // Korea: family names spread from the nobility under Goryeo and Joseon; more than half of Koreans still had none
  // in 1910, when the registration of 1909 (Minjeok Act) gave everyone one.
  korean: {noble: 1197, stages: [st(1197, "settling", {to: 1909, a: 0.2, b: 0.5, unset: "given"}), st(1910, "family")],
    source: "Minjeok Act, 1909; the Kabo Reform, 1894 (Korean name, history)"},
  // Chinese and Vietnamese family names are inherited from long before 1197.
  chinese: {stages: [st(1197, "family")], source: "family names inherited since antiquity"},
  vietnamese: {stages: [st(1197, "family")], source: "family names inherited since the first millennium"},
  // Siam: no family names until the Surname Act of 1913 (King Vajiravudh).
  thai: {stages: [st(1197, "given"), st(1913, "family")], source: "Surname Act, 1913 (B.E. 2456)"},
  // The steppe: one name, then the father's name in the socialist years; clan names on ID cards since 2000 made no
  // real change.
  steppe: {stages: [st(1197, "given")], source: "Mongolian name: clan names on ID cards from 2000 have had no real effect"},
  // Hawaii: one name until the Act to Regulate Names of 1860 made a child's father's name the family name.
  hawaiian: {stages: [st(1197, "given"), st(1860, "family")], source: "Act to Regulate Names, 1860 (Hawaiian Kingdom)"},
  // The Sephardim bore inherited family names in medieval Iberia already.
  sephardi: {stages: [st(1197, "family")], source: "A. Faiguenboim, P. Valadares and A. Campagnano, Dicionário Sefaradi de Sobrenomes (2003)"},
  // The Philippines: Governor-General Clavería's decree of 21 November 1849 gave every family without one a family
  // name from the catalogue.
  filipino: {noble: null, stages: [st(1197, "given"), st(1849, "family")], source: "Clavería decree of 21 November 1849 (Catálogo alfabético de apellidos)"}
};

/** Trades that bear an inherited name before commoners do. */
export const NOBLE_TRADE = /\b(knight|noble|lord|lady|baron|count|duke|prince|samurai|daimyo|courtier|kuge|yangban|grandee|hidalgo|patrician|steward)\b/i;

/**
 * The custom for a people in a year: {form, hereditary share (0 to 1), from, source} or null where WoDX keeps the
 * tables as they are (no year, or a people not listed). noble: the person bears a noble's name.
 */
export function customFor(origin, year, {noble = false} = {}) {
  const c = NAME_CUSTOMS[origin];
  const y = Number(year);
  if ( !c || year === null || year === undefined || year === "" || !Number.isFinite(y) ) return null;
  if ( noble && c.noble && y >= c.noble ) return {form: "family", share: 1, from: c.noble, noble: true, source: c.source};
  const s = [...c.stages].reverse().find(x => y >= x.from) ?? c.stages[0];
  if ( s.form === "settling" ) {
    const t = Math.min(1, Math.max(0, (y - s.from) / Math.max(1, s.to - s.from)));
    return {form: "settling", share: s.a + (s.b - s.a) * t, from: s.from, to: s.to, unset: s.unset ?? "byname", source: c.source};
  }
  return {form: s.form, share: s.form === "family" ? 1 : 0, from: s.from, source: c.source};
}

/** A result drawn from an older "son of" pattern: a template or the ben/bat, ibn/bint words. */
export const PATTERN = /\{|^(ben|bat|ibn|bint|bin|binti|ag|welet) /;

/**
 * Peoples who name a child for the father with a suffix, and the pairs the lists hold: norse "Eriksson/Eriksdotter"
 * gives Erik. Only names the lists hold are made, so no form is guessed.
 */
export function suffixPatrons(pairs = []) {
  const out = {};
  for ( const [m, f] of pairs ) {
    if ( !f || !/(son|zoon)$/.test(m) ) continue;
    // Lars + son, Erik + s + son, Jan + s + zoon: both cuts are kept, and only a real given name will match one
    for ( const father of [m.replace(/s?zoon$|son$/, ""), m.replace(/szoon$|sson$/, "")] ) if ( father && father !== m ) out[father] ??= [m, f];
  }
  return out;
}
