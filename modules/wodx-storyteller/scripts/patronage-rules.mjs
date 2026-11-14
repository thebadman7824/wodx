/**
 * Patronage of the arts (B3374-B3378). Pure, no Foundry.
 *
 * A patron commissions a work (a downtime project of kind "commission") from an artist. When the project ends the work
 * is made: its quality comes from the artist's skill, the money spent and whether it is in the fashion of its year and
 * place. A finished work is an item with an owner. A fine one lifts its owner at a gathering, draws the Toreador's
 * eye and can become a Muse (V20 pdf 75). In fae hands the artist becomes a Dreamer who gives Glamour (C20 pdf 150),
 * or is Ravaged by harsh handling (C20 pdf 146, 260-263). Artists have careers on the clock: patrons keep them, and
 * without one they starve. Salons gather people round a host and start a tale. The art of each age and way of life is
 * history in WoDX's own words; every figure is a house figure.
 */

export const MONTH = 30 * 86400;
const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const str = (v, k) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, k);
const fits = (r, y) => !y || ((r.from == null || y >= r.from) && (r.to == null || y <= r.to));

/** Forms a work can take, by year. ability: what the artist's skill is (Expression or Crafts). goal: the project's successes. */
export const FORMS = [
  {key: "portrait", label: "A portrait", ability: "crafts", goal: 6},
  {key: "icon", label: "An icon or altarpiece", ability: "crafts", goal: 8},
  {key: "window", label: "A chapel window", ability: "crafts", goal: 10, from: 1140, to: 1650},
  {key: "manuscript", label: "An illuminated book", ability: "crafts", goal: 12, to: 1520},
  {key: "fresco", label: "A wall painting", ability: "crafts", goal: 10},
  {key: "tapestry", label: "A tapestry", ability: "crafts", goal: 12, to: 1800},
  {key: "sculpture", label: "A statue", ability: "crafts", goal: 10},
  {key: "poem", label: "A poem or a song", ability: "expression", goal: 4},
  {key: "music", label: "A mass, a suite or a symphony", ability: "expression", goal: 8},
  {key: "play", label: "A play", ability: "expression", goal: 8},
  {key: "opera", label: "An opera", ability: "expression", goal: 14, from: 1600},
  {key: "novel", label: "A novel", ability: "expression", goal: 12, from: 1740},
  {key: "photograph", label: "A photograph", ability: "crafts", goal: 3, from: 1840},
  {key: "film", label: "A film", ability: "expression", goal: 14, from: 1900},
  {key: "record", label: "A record", ability: "expression", goal: 8, from: 1925},
  {key: "comic", label: "A comic", ability: "expression", goal: 8, from: 1935},
  {key: "game", label: "A video game", ability: "expression", goal: 14, from: 1975},
  {key: "webart", label: "A work made for the internet", ability: "expression", goal: 6, from: 1995}
];
export const formsFor = year => FORMS.filter(f => fits(f, year));
export const form = key => FORMS.find(f => f.key === key) ?? null;

/**
 * Movements: what is in fashion, by years and ways of life (world-rules spheres; null: everywhere). forms: the forms
 * it favours.
 */
export const MOVEMENTS = [
  {key: "romanesque", name: "Romanesque", from: 1000, to: 1200, ways: ["latin"], forms: ["icon", "fresco", "sculpture", "manuscript"]},
  {key: "troubadour", name: "Court poetry and the troubadours", from: 1100, to: 1320, ways: ["latin"], forms: ["poem", "music"]},
  {key: "gothic", name: "Gothic", from: 1140, to: 1500, ways: ["latin"], forms: ["window", "sculpture", "manuscript", "icon"]},
  {key: "byzantine", name: "Icon painting of the Eastern church", from: 1000, to: 1700, ways: ["orthodox"], forms: ["icon", "fresco", "music"]},
  {key: "persian", name: "Persian miniature painting", from: 1300, to: 1700, ways: ["islamic"], forms: ["manuscript", "poem", "tapestry"]},
  {key: "ink", name: "Ink landscape painting", from: 960, to: 1368, ways: ["sinic"], forms: ["portrait", "poem"]},
  {key: "literati", name: "The scholar painters", from: 1368, to: 1911, ways: ["sinic"], forms: ["portrait", "poem", "music"]},
  {key: "yamato", name: "Court painting and the tale scrolls", from: 1100, to: 1500, ways: ["japanese"], forms: ["manuscript", "poem"]},
  {key: "noh", name: "Noh theatre", from: 1370, to: 1700, ways: ["japanese"], forms: ["play", "music"]},
  {key: "ukiyoe", name: "Pictures of the floating world", from: 1660, to: 1900, ways: ["japanese"], forms: ["portrait", "play"]},
  {key: "mughal", name: "Mughal painting", from: 1550, to: 1850, ways: ["indic", "islamic"], forms: ["portrait", "manuscript"]},
  {key: "griot", name: "The griots' epics", from: 1200, to: null, ways: ["sahel"], forms: ["poem", "music"]},
  {key: "bronze", name: "Court bronzes and ivories", from: 1300, to: 1897, ways: ["sahel"], forms: ["sculpture"]},
  {key: "renaissance", name: "The Renaissance", from: 1400, to: 1600, ways: ["latin"], forms: ["portrait", "fresco", "sculpture", "music"]},
  {key: "baroque", name: "Baroque", from: 1600, to: 1750, ways: ["latin", "orthodox"], forms: ["opera", "music", "fresco", "sculpture", "play"]},
  {key: "rococo", name: "Rococo", from: 1730, to: 1780, ways: ["latin"], forms: ["portrait", "music", "tapestry"]},
  {key: "neoclassical", name: "Neoclassicism", from: 1760, to: 1830, ways: ["latin", "orthodox"], forms: ["sculpture", "portrait", "play"]},
  {key: "romantic", name: "Romanticism", from: 1800, to: 1860, ways: null, forms: ["poem", "music", "novel", "opera"]},
  {key: "realism", name: "Realism", from: 1848, to: 1890, ways: null, forms: ["novel", "portrait", "photograph"]},
  {key: "impressionism", name: "Impressionism", from: 1870, to: 1905, ways: null, forms: ["portrait", "music"]},
  {key: "nouveau", name: "Art Nouveau", from: 1890, to: 1914, ways: null, forms: ["window", "poem", "portrait"]},
  {key: "modernism", name: "Modernism", from: 1905, to: 1940, ways: null, forms: ["novel", "poem", "film", "sculpture"]},
  {key: "surrealism", name: "Dada and Surrealism", from: 1916, to: 1950, ways: null, forms: ["portrait", "film", "poem"]},
  {key: "socialist", name: "Socialist realism", from: 1932, to: 1989, ways: ["orthodox"], forms: ["film", "sculpture", "novel"]},
  {key: "jazz", name: "Jazz", from: 1917, to: 1960, ways: null, forms: ["record", "music"]},
  {key: "abstract", name: "Abstract painting", from: 1945, to: 1965, ways: null, forms: ["portrait", "sculpture"]},
  {key: "pop", name: "Pop art and rock and roll", from: 1955, to: 1975, ways: null, forms: ["record", "comic", "film"]},
  {key: "punk", name: "Punk", from: 1975, to: 1986, ways: null, forms: ["record", "poem", "comic"]},
  {key: "hiphop", name: "Hip hop", from: 1979, to: null, ways: null, forms: ["record", "poem"]},
  {key: "digital", name: "Games and the internet", from: 1995, to: null, ways: null, forms: ["game", "webart", "film"]}
];

/** What is in fashion in a year and way of life. */
export const fashionFor = (year, way = "") => MOVEMENTS.filter(m => fits(m, year) && (!m.ways || !way || m.ways.includes(way)));
export const inFashion = (formKey, year, way = "") => fashionFor(year, way).some(m => m.forms.includes(formKey));

/** A gathering of the arts, by year (B3377). */
export function salonName(year = 0) {
  const y = n(year);
  if ( y && y < 1400 ) return "a court of song";
  if ( y && y < 1650 ) return "an evening of music and verse";
  if ( y && y < 1900 ) return "a salon";
  if ( y && y < 1990 ) return "a gallery opening";
  return "a launch party";
}

export const QUALITY = ["", "poor", "plain", "good", "fine", "a masterpiece"];

/** A work's quality, 1-5 (B3375): the artist's skill, a dot for every two dots of money spent, one for fashion. */
export function qualityOf({skill = 0, money = 0, fashion = false, ravaged = false} = {}) {
  return Math.max(1, Math.min(5, Math.round(n(skill)) + Math.floor(Math.max(0, n(money)) / 2) + (fashion ? 1 : 0) - (ravaged ? 1 : 0)));
}

/** What a work does for its owner at a gathering: +1 Status die for fine, +2 for a masterpiece in fashion (B3376). */
export const statusFor = (quality, fashion) => (n(quality) >= 5 && fashion ? 2 : n(quality) >= 4 ? 1 : 0);

export function normArtist(a = {}) {
  return {id: str(a.id, 40), actor: str(a.actor, 40), name: str(a.name, 80) || "An artist", skill: Math.max(0, Math.min(5, Math.round(n(a.skill)))),
    fame: Math.max(0, Math.min(5, Math.round(n(a.fame)))), patron: str(a.patron, 40), since: n(a.since), lastPaid: n(a.lastPaid),
    state: ["working", "starving", "dead"].includes(a.state) ? a.state : "working", dreamer: !!a.dreamer, ravaged: !!a.ravaged, works: Math.max(0, Math.round(n(a.works)))};
}

/**
 * One month of an artist's life (B3378). A patron keeps them; six months without one and with fame under 2 they
 * starve; a starving artist dies 1 in 60 a month, finds a patron of their own 1 in 10 (with fame), or goes on.
 * Returns {artist, event} where event is "", "starving", "dead" or "found".
 */
export function monthArtist(artist, {now = 0, rand = Math.random} = {}) {
  const a = normArtist(artist);
  if ( a.state === "dead" ) return {artist: a, event: ""};
  if ( a.patron ) return {artist: {...a, state: "working", lastPaid: now}, event: a.state === "starving" ? "found" : ""};
  const idle = now - (a.lastPaid || a.since);
  if ( a.state === "working" && idle >= 6 * MONTH && a.fame < 2 ) return {artist: {...a, state: "starving"}, event: "starving"};
  if ( a.state === "starving" ) {
    const r = rand();
    if ( r < 1 / 60 ) return {artist: {...a, state: "dead"}, event: "dead"};
    if ( r < 1 / 60 + 0.1 * Math.max(1, a.fame) ) return {artist: {...a, state: "working", lastPaid: now}, event: "found"};
  }
  return {artist: a, event: ""};
}

/** A finished commission (B3375, B3376): the quality, and what the artist and the patron get. */
export function finish({artist, formKey, money = 0, year = 0, way = "", fae = false, handling = "kind"} = {}) {
  const a = normArtist(artist);
  const fashion = inFashion(formKey, year, way);
  const quality = qualityOf({skill: a.skill, money, fashion, ravaged: a.ravaged});
  const next = {...a, works: a.works + 1, fame: Math.min(5, a.fame + (quality >= 4 ? 1 : 0))};
  if ( fae && handling === "kind" ) next.dreamer = true;
  if ( fae && handling === "harsh" ) { next.ravaged = true; next.dreamer = false; next.skill = Math.max(0, next.skill - 1); }
  return {quality, label: QUALITY[quality], fashion, status: statusFor(quality, fashion), artist: next, toreador: quality >= 4};
}
