/**
 * WoDX Storyteller: the country behind the travel sum. Moravia and its neighbours, written for WoDX from general
 * geography: rough shapes for the high and low ground, the main rivers as a few points each, the towns, and the
 * roads, railways, motorways, river routes and airfields with the year each opens. Positions are [east, north] in
 * degrees and good to a few km, which is all a 5 km square needs. Opening years are close, not exact; a Storyteller
 * who needs a date to the year should check it. Nothing here comes from a game or a rulebook.
 */

/** The map's edges (degrees) and the size of a square (km). */
export const BOUNDS = {west: 12.0, east: 20.0, south: 47.4, north: 51.2, cell: 5};

/**
 * High and low ground. Each is an ellipse: [name, kind, east, north, half-length km, half-width km, turn in degrees
 * (0 = lying east-west, 45 = running south-west to north-east)]. Later rows win. Ground no row covers is hills.
 */
export const LAND = [
  // low ground
  ["the Haná", "plain", 17.2, 49.5, 16, 34, 0],
  ["the lower Morava vale", "plain", 17.3, 48.95, 34, 11, 40],
  ["the Dyje and Svratka vale", "plain", 16.5, 48.9, 38, 15, 10],
  ["the Vienna basin", "plain", 16.7, 48.3, 30, 42, 0],
  ["the Danube lowland", "plain", 17.9, 48.05, 75, 36, -10],
  ["the Little Plain", "plain", 17.2, 47.65, 62, 26, 0],
  ["the Tulln field", "plain", 15.95, 48.33, 26, 8, 0],
  ["the Elbe lowland", "plain", 15.1, 50.12, 62, 15, 5],
  ["the Silesian lowland", "plain", 17.3, 51.0, 170, 34, -12],
  ["the Moravian Gate", "plain", 17.9, 49.68, 34, 9, 35],
  ["the Ostrava basin", "plain", 18.35, 49.9, 24, 16, 0],
  ["the Budějovice and Třeboň basins", "plain", 14.6, 49.02, 30, 20, 0],
  ["the upper Vistula", "plain", 19.5, 50.05, 40, 14, 0],
  // uplands
  ["the Bohemian-Moravian Highlands", "upland", 15.75, 49.42, 78, 34, 40],
  ["the Žďár hills", "upland", 16.0, 49.66, 20, 13, 0],
  ["the Drahany Highlands", "upland", 16.82, 49.42, 16, 26, 0],
  ["the Chřiby", "upland", 17.3, 49.15, 17, 8, 30],
  ["the Low Jeseníky", "upland", 17.55, 49.88, 36, 22, 20],
  ["the Hostýn and Vsetín hills", "upland", 17.95, 49.36, 28, 12, 15],
  ["the White Carpathians", "upland", 17.85, 49.02, 62, 12, 38],
  ["the Little Carpathians", "upland", 17.25, 48.42, 36, 8, 50],
  ["the Považský Inovec and Tribeč", "upland", 18.1, 48.6, 12, 34, 10],
  ["the Strážov hills", "upland", 18.45, 48.95, 20, 16, 0],
  ["the Slovak Ore Mountains", "upland", 19.4, 48.65, 50, 26, 0],
  ["the Waldviertel", "upland", 15.25, 48.62, 46, 28, 0],
  ["the Mühlviertel", "upland", 14.3, 48.52, 40, 18, 0],
  ["the Vienna Woods", "upland", 16.0, 48.13, 22, 12, 30],
  ["the Bohemian Forest's north", "upland", 12.6, 49.65, 12, 44, 0],
  ["the Brdy", "upland", 13.9, 49.7, 26, 10, 40],
  ["the Jizera hills", "upland", 15.25, 50.83, 20, 10, 0],
  ["the Lusatian hills", "upland", 14.6, 50.85, 26, 8, 0],
  ["the Beskid foothills", "upland", 19.3, 49.75, 50, 14, 0],
  // mountains
  ["the High Jeseníky", "mountain", 17.2, 50.08, 20, 14, 30],
  ["the Králický Sněžník", "mountain", 16.85, 50.2, 10, 9, 0],
  ["the Orlické hory", "mountain", 16.4, 50.3, 26, 7, -45],
  ["the Krkonoše", "mountain", 15.7, 50.73, 26, 9, -8],
  ["the Moravian-Silesian Beskids", "mountain", 18.45, 49.5, 28, 14, 10],
  ["the Šumava", "mountain", 13.6, 48.97, 66, 14, -38],
  ["the Ore Mountains", "mountain", 13.2, 50.52, 72, 9, 18],
  ["the Tatras and the Fatra", "mountain", 19.3, 49.12, 55, 26, 0],
  ["the Alps", "mountain", 13.8, 47.4, 150, 44, 4]
];

/** Main rivers, source to mouth: [name, big (a crossing costs time away from a road), [[east, north], ...]]. */
export const RIVERS = [
  ["the Morava", true, [[16.85, 50.2], [16.97, 49.97], [17.07, 49.7], [17.25, 49.59], [17.3, 49.4], [17.39, 49.3], [17.46, 49.07], [17.13, 48.85], [16.94, 48.62], [16.9, 48.35], [16.98, 48.17]]],
  ["the Dyje", true, [[15.5, 48.86], [16.05, 48.85], [16.35, 48.78], [16.62, 48.88], [16.88, 48.76], [16.94, 48.62]]],
  ["the Svratka", false, [[16.0, 49.7], [16.42, 49.35], [16.6, 49.18], [16.62, 48.88]]],
  ["the Svitava", false, [[16.47, 49.75], [16.65, 49.36], [16.62, 49.2]]],
  ["the Jihlava", false, [[15.59, 49.4], [15.88, 49.21], [16.38, 49.1], [16.6, 48.9]]],
  ["the Bečva", false, [[18.0, 49.34], [17.95, 49.47], [17.73, 49.55], [17.45, 49.46], [17.3, 49.4]]],
  ["the Opava", false, [[17.4, 50.1], [17.7, 50.09], [17.9, 49.94], [18.26, 49.86]]],
  ["the Oder", true, [[17.5, 49.62], [17.9, 49.7], [18.28, 49.84], [18.22, 50.09], [18.1, 50.35], [17.93, 50.67], [17.45, 50.9], [17.03, 51.11], [16.5, 51.2]]],
  ["the Vltava", true, [[14.3, 48.62], [14.47, 48.97], [14.42, 49.4], [14.4, 49.8], [14.42, 50.08], [14.47, 50.35]]],
  ["the Elbe", true, [[15.6, 50.7], [15.83, 50.21], [15.78, 50.04], [15.2, 50.03], [14.8, 50.18], [14.47, 50.35], [14.04, 50.66], [14.2, 50.9], [13.74, 51.05], [13.5, 51.2]]],
  ["the Danube", true, [[13.46, 48.57], [14.29, 48.31], [14.9, 48.2], [15.61, 48.41], [16.0, 48.33], [16.37, 48.21], [17.11, 48.15], [17.6, 47.85], [18.13, 47.76], [18.75, 47.8], [19.04, 47.5]]],
  ["the Váh", true, [[19.6, 49.08], [18.74, 49.22], [18.3, 49.1], [18.04, 48.89], [17.83, 48.59], [17.9, 48.2], [18.13, 47.76]]],
  ["the Vistula", true, [[18.9, 49.65], [19.2, 49.98], [19.94, 50.06]]]
];

/** Towns: id: [name, east, north, founded (a year, or 0 for older than the chronicle)]. */
export const TOWNS = {
  prague: ["Prague", 14.42, 50.08, 0], brno: ["Brno", 16.61, 49.19, 0], olomouc: ["Olomouc", 17.25, 49.59, 0],
  znojmo: ["Znojmo", 16.05, 48.86, 0], jihlava: ["Jihlava", 15.59, 49.4, 1240], vienna: ["Vienna", 16.37, 48.21, 0],
  pressburg: ["Pressburg (Bratislava)", 17.11, 48.15, 0], opava: ["Opava", 17.9, 49.94, 0], ostrava: ["Ostrava", 18.28, 49.83, 1267],
  kromeriz: ["Kroměříž", 17.39, 49.3, 0], hradiste: ["Uherské Hradiště", 17.46, 49.07, 1257], mikulov: ["Mikulov", 16.64, 48.81, 0],
  breclav: ["Břeclav", 16.88, 48.76, 0], trebic: ["Třebíč", 15.88, 49.21, 0], telc: ["Telč", 15.45, 49.18, 0],
  hradec: ["Jindřichův Hradec", 15.0, 49.14, 1220], budejovice: ["České Budějovice", 14.47, 48.97, 1265], tabor: ["Tábor", 14.66, 49.41, 1420],
  kutnahora: ["Kutná Hora", 15.27, 49.95, 1280], kolin: ["Kolín", 15.2, 50.03, 1261], kralove: ["Hradec Králové", 15.83, 50.21, 0],
  pardubice: ["Pardubice", 15.78, 50.04, 1340], litomysl: ["Litomyšl", 16.31, 49.87, 0], svitavy: ["Svitavy", 16.47, 49.76, 1256],
  trebova: ["Česká Třebová", 16.44, 49.9, 1278], prerov: ["Přerov", 17.45, 49.46, 0], hranice: ["Hranice", 17.73, 49.55, 0],
  prostejov: ["Prostějov", 17.11, 49.47, 0], vyskov: ["Vyškov", 17.0, 49.28, 0], hodonin: ["Hodonín", 17.13, 48.85, 0],
  zlin: ["Zlín", 17.67, 49.23, 1322], vsetin: ["Vsetín", 18.0, 49.34, 1308], sumperk: ["Šumperk", 16.97, 49.97, 1269],
  krnov: ["Krnov", 17.7, 50.09, 1240], tesin: ["Těšín", 18.63, 49.75, 0], wroclaw: ["Breslau (Wrocław)", 17.03, 51.11, 0],
  nysa: ["Nysa", 17.33, 50.47, 1223], klodzko: ["Kladsko", 16.65, 50.44, 0], opole: ["Opole", 17.93, 50.67, 0],
  krakow: ["Kraków", 19.94, 50.06, 0], raciborz: ["Ratibor", 18.22, 50.09, 0], linz: ["Linz", 14.29, 48.31, 0],
  krems: ["Krems", 15.61, 48.41, 0], passau: ["Passau", 13.46, 48.57, 0], plzen: ["Plzeň", 13.38, 49.75, 1295],
  cheb: ["Cheb", 12.37, 50.08, 0], usti: ["Ústí nad Labem", 14.04, 50.66, 0], liberec: ["Liberec", 15.06, 50.77, 1352],
  dresden: ["Dresden", 13.74, 51.05, 1206], trencin: ["Trenčín", 18.04, 48.89, 0], nitra: ["Nitra", 18.09, 48.31, 0],
  zilina: ["Žilina", 18.74, 49.22, 1208], trnava: ["Trnava", 17.59, 48.37, 0], gyor: ["Győr", 17.63, 47.69, 0],
  sopron: ["Sopron", 16.59, 47.68, 0], neustadt: ["Wiener Neustadt", 16.24, 47.81, 0], polten: ["Sankt Pölten", 15.63, 48.2, 0],
  freistadt: ["Freistadt", 14.5, 48.51, 1220], brod: ["Havlíčkův Brod", 15.58, 49.61, 1256], boskovice: ["Boskovice", 16.66, 49.49, 1222],
  komarno: ["Komárno", 18.13, 47.76, 0], buda: ["Buda", 19.04, 47.5, 0]
};

/** Roads between towns: [a, b, kind]. highway = an old trade road, later a post road; road = a lesser road. */
export const WAYS = [
  ["vienna", "mikulov", "highway"], ["mikulov", "brno", "highway"], ["brno", "vyskov", "highway"], ["vyskov", "prostejov", "highway"],
  ["prostejov", "olomouc", "highway"], ["olomouc", "prerov", "highway"], ["prerov", "hranice", "highway"], ["hranice", "ostrava", "highway"],
  ["hranice", "opava", "road"], ["opava", "ostrava", "highway"], ["opava", "raciborz", "highway"], ["raciborz", "opole", "highway"],
  ["opole", "wroclaw", "highway"], ["ostrava", "tesin", "highway"], ["tesin", "krakow", "highway"], ["ostrava", "raciborz", "road"],
  ["prague", "kolin", "highway"], ["kolin", "kutnahora", "road"], ["kolin", "brod", "highway"], ["brod", "jihlava", "highway"],
  ["jihlava", "znojmo", "highway"], ["znojmo", "vienna", "highway"], ["jihlava", "trebic", "highway"], ["trebic", "brno", "highway"],
  ["kolin", "pardubice", "road"], ["pardubice", "litomysl", "highway"], ["litomysl", "svitavy", "highway"], ["svitavy", "olomouc", "highway"],
  ["svitavy", "boskovice", "road"], ["boskovice", "brno", "road"], ["litomysl", "trebova", "road"], ["pardubice", "kralove", "road"],
  ["prague", "kralove", "highway"], ["kralove", "klodzko", "highway"], ["klodzko", "wroclaw", "highway"], ["klodzko", "nysa", "road"],
  ["nysa", "krnov", "road"], ["krnov", "opava", "road"], ["nysa", "wroclaw", "road"], ["nysa", "opole", "road"],
  ["prague", "tabor", "highway"], ["tabor", "budejovice", "highway"], ["budejovice", "freistadt", "highway"], ["freistadt", "linz", "highway"],
  ["tabor", "hradec", "road"], ["hradec", "telc", "road"], ["telc", "jihlava", "road"], ["telc", "znojmo", "road"], ["budejovice", "hradec", "road"],
  ["prague", "plzen", "highway"], ["plzen", "cheb", "highway"], ["plzen", "budejovice", "road"], ["prague", "usti", "highway"],
  ["usti", "dresden", "highway"], ["prague", "liberec", "road"], ["liberec", "kralove", "road"],
  ["passau", "linz", "highway"], ["linz", "polten", "highway"], ["polten", "vienna", "highway"], ["krems", "polten", "road"],
  ["krems", "znojmo", "road"], ["krems", "vienna", "road"], ["vienna", "pressburg", "highway"], ["pressburg", "trnava", "highway"],
  ["trnava", "trencin", "highway"], ["trencin", "zilina", "highway"], ["trnava", "nitra", "road"], ["pressburg", "gyor", "highway"],
  ["gyor", "komarno", "highway"], ["komarno", "buda", "highway"], ["nitra", "komarno", "road"], ["vienna", "neustadt", "highway"],
  ["neustadt", "sopron", "road"], ["sopron", "gyor", "road"], ["brno", "znojmo", "road"], ["brno", "breclav", "road"],
  ["mikulov", "breclav", "road"], ["breclav", "hodonin", "road"], ["hodonin", "hradiste", "road"], ["hradiste", "kromeriz", "road"],
  ["kromeriz", "prerov", "road"], ["kromeriz", "vyskov", "road"], ["hradiste", "trencin", "road"], ["zlin", "kromeriz", "road"],
  ["zlin", "hradiste", "road"], ["vsetin", "hranice", "road"], ["vsetin", "zlin", "road"], ["olomouc", "sumperk", "road"],
  ["sumperk", "klodzko", "road"], ["tesin", "zilina", "road"], ["breclav", "pressburg", "road"], ["olomouc", "krnov", "road"],
  ["zilina", "krakow", "road"], ["opole", "krakow", "road"]
];

/** Railways: [a, b, year the line opens]. */
export const RAILS = [
  ["vienna", "breclav", 1839], ["breclav", "brno", 1839], ["breclav", "hodonin", 1841], ["hodonin", "hradiste", 1841], ["hradiste", "prerov", 1841],
  ["prerov", "olomouc", 1841], ["prerov", "hranice", 1847], ["hranice", "ostrava", 1847], ["ostrava", "raciborz", 1848], ["ostrava", "krakow", 1856],
  ["olomouc", "trebova", 1845], ["trebova", "pardubice", 1845], ["pardubice", "kolin", 1845], ["kolin", "prague", 1845],
  ["brno", "svitavy", 1849], ["svitavy", "trebova", 1849], ["prague", "usti", 1851], ["usti", "dresden", 1851],
  ["vienna", "polten", 1858], ["polten", "linz", 1858], ["linz", "passau", 1861], ["prague", "plzen", 1862], ["plzen", "cheb", 1872],
  ["vienna", "neustadt", 1841], ["neustadt", "sopron", 1847], ["vienna", "pressburg", 1848], ["pressburg", "komarno", 1850], ["komarno", "buda", 1850],
  ["pressburg", "trnava", 1873], ["trnava", "trencin", 1876], ["trencin", "zilina", 1883], ["vienna", "gyor", 1855], ["gyor", "komarno", 1856],
  ["vienna", "znojmo", 1871], ["znojmo", "jihlava", 1871], ["jihlava", "brod", 1871], ["brod", "kolin", 1871],
  ["brno", "trebic", 1886], ["trebic", "jihlava", 1886], ["prague", "tabor", 1871], ["tabor", "budejovice", 1871], ["budejovice", "linz", 1873],
  ["budejovice", "plzen", 1868], ["tabor", "hradec", 1887], ["hradec", "jihlava", 1887], ["brno", "vyskov", 1869], ["vyskov", "prerov", 1869],
  ["olomouc", "krnov", 1872], ["krnov", "opava", 1872], ["opava", "ostrava", 1855], ["ostrava", "tesin", 1871], ["tesin", "zilina", 1871],
  ["wroclaw", "opole", 1843], ["opole", "raciborz", 1846], ["wroclaw", "klodzko", 1874], ["kralove", "pardubice", 1857], ["kralove", "liberec", 1859],
  ["olomouc", "sumperk", 1873], ["hradiste", "trencin", 1888], ["zlin", "hradiste", 1899], ["vsetin", "hranice", 1885], ["krems", "polten", 1889],
  ["nysa", "opole", 1848], ["sopron", "gyor", 1876], ["olomouc", "prostejov", 1870], ["trnava", "nitra", 1897]
];

/** Motorways: [a, b, year the stretch is open end to end]. */
export const MOTORWAYS = [
  ["wroclaw", "opole", 1940], ["vienna", "neustadt", 1962], ["vienna", "polten", 1967], ["polten", "linz", 1967], ["linz", "passau", 1984],
  ["prague", "jihlava", 1977], ["jihlava", "brno", 1980], ["brno", "breclav", 1980], ["breclav", "pressburg", 1980], ["pressburg", "trnava", 1978],
  ["brno", "vyskov", 1988], ["vyskov", "prostejov", 1992], ["prostejov", "olomouc", 1992], ["vienna", "gyor", 1994], ["prague", "liberec", 1995],
  ["gyor", "buda", 1996], ["prague", "plzen", 1997], ["trnava", "trencin", 1998], ["pressburg", "gyor", 1998], ["olomouc", "hranice", 1998],
  ["opole", "krakow", 2005], ["vyskov", "kromeriz", 2005], ["prague", "kralove", 2006], ["usti", "dresden", 2006], ["vienna", "pressburg", 2007],
  ["hranice", "ostrava", 2009], ["trencin", "zilina", 2010], ["kromeriz", "prerov", 2011], ["prague", "usti", 2016], ["vienna", "mikulov", 2017]
];

/** Rivers that carry passengers and goods: [a, b]. */
export const WATERWAYS = [
  ["passau", "linz"], ["linz", "krems"], ["krems", "vienna"], ["vienna", "pressburg"], ["pressburg", "komarno"], ["komarno", "buda"],
  ["prague", "usti"], ["usti", "dresden"], ["raciborz", "opole"], ["opole", "wroclaw"]
];

/** Airfields with passenger flights: town: the year they start. */
export const AIRFIELDS = {prague: 1920, vienna: 1925, brno: 1926, pressburg: 1923, krakow: 1925, wroclaw: 1925, buda: 1925, dresden: 1935, linz: 1955, ostrava: 1959};
