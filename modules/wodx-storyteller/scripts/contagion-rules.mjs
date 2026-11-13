/**
 * WoDX Storyteller (B3260-B3266): sickness that spreads from town to town and from person to person. Pure rules, no
 * Foundry calls.
 *
 *   Diseases   Each has a toxin rating (health levels a week, bashing or lethal) and a Stamina difficulty to resist it,
 *              from the M20 toxin table (M20 p. 442) where the book lists the disease, and set beside the nearest
 *              listed one where it does not (B3261). blood: the sickness rides in the blood, so a vampire who drinks
 *              it can carry it on to later vessels (V20 p. 303; V20 Dark Ages p. 357).
 *   Towns      A town is a market (market-rules.mjs). An outbreak there runs a fixed number of weeks: few fall sick at
 *              first, most around the first third, then it wanes. attack is the share of the town that falls sick
 *              over the whole outbreak, death the share of the sick who die (B3262).
 *   Spread     Each week a town in the grip of it may pass it along every trade link and with every caravan that
 *              leaves it. Quarantine (the market cut off) cuts the chance to a sixth; summer or winter favours some
 *              sicknesses; railways and then aircraft carry it faster. A town that has just come through one sickness
 *              does not take the same one again for two years (B3263).
 *   History    Outbreaks the history books record, by region and year, from 1197 to 2022, so a chronicle anywhere on
 *              earth meets the sicknesses of its own time and land. Peoples who had never met smallpox, measles or
 *              influenza suffer far worse in the first century after contact (B3264).
 *   People     A living character in a sick town may be exposed each week and then rolls Stamina against the
 *              difficulty; once sick, a failed weekly roll deals the rating as damage (M20 p. 442) until the course
 *              runs out or two rolls in a row succeed. Slow sicknesses strike once a month (B3265).
 * The shares, chances, weeks and courses are the Storyteller's to change; WoDX starts from these (B3262-B3265).
 */

export const STATE_VERSION = 1;
export const WEEK = 7 * 24 * 60 * 60;
export const IMMUNE_WEEKS = 104;
export const QUARANTINE = 1 / 6;
export const LIST_CAP = 200;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const round3 = v => Math.round(v * 1000) / 1000;

/* ---------------- Diseases ---------------- */

const OLD_WORLD = ["moravia", "german-lands", "british-isles", "france", "iberia", "italy", "low-countries", "scandinavia", "poland-baltic",
  "carpathians-balkans", "russia", "aegean", "anatolia", "levant", "egypt", "arabia", "maghreb", "persia", "central-asia", "siberia",
  "tibet-himalaya", "india", "china", "japan", "korea", "southeast-asia", "nusantara", "west-africa", "east-africa", "southern-africa", "central-africa"];
const WARM_WET = ["west-africa", "central-africa", "east-africa", "india", "southeast-asia", "nusantara", "caribbean", "brazil", "mexico", "andes",
  "egypt", "italy", "levant", "china", "southern-africa", "north-america-east", "pacific-islands", "australia"];

/**
 * id: {label, rating, dmg ("bashing" | "lethal"), diff, ways, blood, attack, death, weeks (outbreak in one town),
 * spread (weekly chance along a link at the height), season ("summer" | "winter" | null), course (weeks a sick
 * character suffers; null: until cured), monthly (strikes every fourth week), from, to (years it can break out; null
 * for open), event (only a dated event starts it), virgin (far worse where it is new), ref, note}.
 */
export const DISEASES = {
  plague: {label: "Plague", rating: 6, dmg: "lethal", diff: 9, ways: ["fleas", "breath"], blood: true, attack: 0.35, death: 0.6, weeks: 26, spread: 0.5,
    season: "summer", course: 2, from: 1197, to: 2022, ref: "M20 p. 442 (Bubonic Plague)",
    note: "Swellings in the groin and armpit, black patches, fever; the lung form passes on the breath."},
  cholera: {label: "Cholera", rating: 5, dmg: "bashing", diff: 8, ways: ["water"], blood: false, attack: 0.08, death: 0.45, weeks: 12, spread: 0.6,
    season: "summer", course: 1, from: 1817, to: 2022, ref: "M20 p. 442",
    note: "The blue death: purging, cramps and a sunken, bluish face. It follows the rivers, the wells and the poor quarters."},
  influenza: {label: "Influenza", rating: 3, dmg: "bashing", diff: 7, ways: ["breath"], blood: false, attack: 0.25, death: 0.01, weeks: 8, spread: 0.8,
    season: "winter", course: 2, from: 1197, to: 2022, virgin: true, ref: "M20 p. 442",
    note: "Fever, aching limbs and a cough. Most rise again in a week or two; the old and the frail do not."},
  "great-flu": {label: "The great influenza", rating: 5, dmg: "lethal", diff: 8, ways: ["breath"], blood: false, attack: 0.3, death: 0.05, weeks: 12, spread: 0.9,
    season: "winter", course: 3, from: 1889, to: 2022, virgin: true, ref: "M20 p. 442 (Severe Flu)",
    note: "It kills the young and strong as readily as the old. Faces turn dusky blue as the lungs fill."},
  smallpox: {label: "Smallpox", rating: 5, dmg: "lethal", diff: 8, ways: ["breath", "touch"], blood: false, attack: 0.3, death: 0.3, weeks: 16, spread: 0.5,
    season: null, course: 4, from: 1197, to: 1977, virgin: true, ref: "Rated beside Severe Flu, M20 p. 442",
    note: "Fever, then pustules over the face and hands. Those who live are scarred and never take it again."},
  measles: {label: "Measles", rating: 3, dmg: "bashing", diff: 7, ways: ["breath"], blood: false, attack: 0.4, death: 0.02, weeks: 8, spread: 0.7,
    season: "winter", course: 2, from: 1197, to: 2022, virgin: true, ref: "Rated beside Influenza, M20 p. 442",
    note: "A red rash, a cough and red eyes, mostly among children."},
  typhus: {label: "Typhus", rating: 5, dmg: "lethal", diff: 8, ways: ["lice"], blood: true, attack: 0.15, death: 0.2, weeks: 12, spread: 0.4,
    season: "winter", course: 3, from: 1197, to: 2022, ref: "Rated beside Severe Flu, M20 p. 442",
    note: "Gaol fever, camp fever, war fever: it lives in the lice of armies, prisons, ships and the starving."},
  typhoid: {label: "Typhoid", rating: 4, dmg: "lethal", diff: 8, ways: ["water", "touch"], blood: true, attack: 0.05, death: 0.15, weeks: 10, spread: 0.3,
    season: "summer", course: 4, from: 1197, to: 2022, ref: "Rated beside Leprosy, M20 p. 442",
    note: "A slow, climbing fever and rose spots on the belly. A cook who seems well can carry it for years."},
  flux: {label: "The bloody flux", rating: 4, dmg: "bashing", diff: 8, ways: ["water"], blood: false, attack: 0.15, death: 0.1, weeks: 6, spread: 0.4,
    season: "summer", course: 2, from: 1197, to: 2022, ref: "Rated beside Salmonella, M20 p. 442",
    note: "Dysentery: bloody purging in camps, sieges and crowded quarters."},
  sweat: {label: "The sweating sickness", rating: 5, dmg: "lethal", diff: 8, ways: ["breath"], blood: false, attack: 0.2, death: 0.3, weeks: 4, spread: 0.5,
    season: "summer", course: 1, from: 1485, to: 1551, ref: "Rated beside Severe Flu, M20 p. 442",
    note: "Cold shivers, then a drenching sweat; merry at dinner and dead by supper, as the saying went."},
  "yellow-fever": {label: "Yellow fever", rating: 5, dmg: "lethal", diff: 8, ways: ["mosquitoes"], blood: true, attack: 0.15, death: 0.25, weeks: 12, spread: 0.3,
    season: "summer", course: 2, from: 1197, to: 2022, ref: "Rated beside Severe Flu, M20 p. 442",
    note: "Yellow jack: fever, a yellow skin and black vomit. It comes with the ships to the hot ports."},
  malaria: {label: "Marsh fever", rating: 3, dmg: "bashing", diff: 7, ways: ["mosquitoes"], blood: true, attack: 0.1, death: 0.02, weeks: 20, spread: 0.2,
    season: "summer", course: 8, from: 1197, to: 2022, ref: "Rated beside Influenza, M20 p. 442",
    note: "Malaria, the ague: chills and fever that come back every few days, from the marshes and the low ground."},
  leprosy: {label: "Leprosy", rating: 4, dmg: "lethal", diff: 8, ways: ["touch"], blood: false, attack: 0.01, death: 0, weeks: 52, spread: 0.05,
    season: null, course: null, monthly: true, from: 1197, to: 2022, ref: "M20 p. 442",
    note: "The slow sickness: numb patches, then lost fingers and faces. The sick are cast out to the lazar houses."},
  consumption: {label: "Consumption", rating: 4, dmg: "lethal", diff: 8, ways: ["breath"], blood: false, attack: 0.05, death: 0.5, weeks: 52, spread: 0.1,
    season: null, course: null, monthly: true, from: 1197, to: 2022, ref: "Rated beside Leprosy, M20 p. 442",
    note: "The white plague, tuberculosis: a wasting cough, blood on the handkerchief, a slow fading over years."},
  hiv: {label: "HIV", rating: 4, dmg: "lethal", diff: 8, ways: ["blood"], blood: true, attack: 0.01, death: 0.9, weeks: 104, spread: 0.05,
    season: null, course: null, monthly: true, from: 1959, to: 2022, ref: "M20 p. 442; V20 p. 303",
    note: "It passes in blood and in bed. Several Kindred carry it from vessel to vessel."},
  coronavirus: {label: "A new lung fever", rating: 4, dmg: "lethal", diff: 8, ways: ["breath"], blood: false, attack: 0.15, death: 0.01, weeks: 16, spread: 0.8,
    season: "winter", course: 2, from: 2002, to: 2022, ref: "Rated beside Pneumonia, M20 p. 442",
    note: "A coronavirus: fever, a dry cough and failing breath. Masks, closed doors and empty streets."},
  ebola: {label: "Ebola", rating: 7, dmg: "lethal", diff: 9, ways: ["blood", "touch"], blood: true, attack: 0.02, death: 0.5, weeks: 20, spread: 0.2,
    season: null, course: 2, from: 1976, to: 2022, ref: "M20 p. 442",
    note: "Fever, then bleeding from within. It passes to those who nurse the sick and wash the dead."},
  bioplague: {label: "The bioplague", rating: 6, dmg: "lethal", diff: 9, ways: ["breath", "blood"], blood: true, attack: 0.25, death: 0.4, weeks: 20, spread: 0.7,
    season: null, course: 3, from: null, to: null, event: true, ref: "CP2020 pp. 177, 179; rated beside Bubonic Plague, M20 p. 442",
    note: "A made sickness out of the corporate labs. Cities seal their gates and the wasting spreads anyway."}
};

/** Where a disease can break out by itself (it can still be carried anywhere). null: everywhere. */
export const HOMES = {
  "yellow-fever": ["west-africa", "central-africa", "east-africa", "caribbean", "brazil", "mexico", "andes", "north-america-east", "iberia"],
  malaria: WARM_WET,
  sweat: ["british-isles", "german-lands", "low-countries", "scandinavia", "poland-baltic"],
  plague: OLD_WORLD.concat(["north-america-west", "southern-cone", "andes", "brazil"])
};

/** The years each land first met the old world's crowd sicknesses (smallpox, measles, influenza). */
export const CONTACT = {
  caribbean: 1493, mexico: 1519, andes: 1525, brazil: 1500, "southern-cone": 1536, "north-america-east": 1600, canada: 1616,
  "north-america-west": 1769, "pacific-islands": 1769, australia: 1789, aotearoa: 1790, arctic: 1721
};
export const VIRGIN_YEARS = 100;

/** Far worse where it is new: in the century after a land's first contact. {attack, death} multipliers. */
export function virginSoil(diseaseId, region, year) {
  const d = DISEASES[diseaseId];
  const first = CONTACT[region];
  if ( !d?.virgin || !first ) return {attack: 1, death: 1};
  const y = num(year);
  if ( y < first ) return {attack: 1, death: 1};
  return y - first < VIRGIN_YEARS ? {attack: 1.8, death: 4} : {attack: 1, death: 1};
}

/** Can it be in this place in this year? Contact lands meet the old world's sicknesses only after contact. */
export function canBreakOut(diseaseId, region, year) {
  const d = DISEASES[diseaseId];
  if ( !d || d.event ) return false;
  const y = num(year);
  if ( (d.from !== null && y < d.from) || (d.to !== null && y > d.to) ) return false;
  const home = HOMES[diseaseId];
  if ( home && region && !home.includes(region) ) return false;
  const first = CONTACT[region];
  if ( first && y < first && !["malaria", "flux", "typhoid", "consumption"].includes(diseaseId) ) return false;
  return true;
}

/** The diseases that fit a year and place, for the Storyteller's list. future: World of Future Darkness. */
export function diseasesFor(year, region = null, {future = false} = {}) {
  return Object.keys(DISEASES).filter(id => (future && DISEASES[id].event) || canBreakOut(id, region, Math.min(num(year), 2022)));
}

/* ---------------- The course of an outbreak in one town ---------------- */

/**
 * The share of the outbreak's sick who fall sick in week w (1-based) of n: a triangle that peaks a third of the way in.
 * The weeks add up to 1.
 */
export function weekShare(w, n) {
  const W = Math.max(1, Math.round(num(n)));
  if ( w < 1 || w > W ) return 0;
  const peak = Math.max(1, Math.round(W / 3));
  const h = x => (x <= peak ? x / peak : (W + 1 - x) / (W + 1 - peak));
  let total = 0;
  for ( let i = 1; i <= W; i++ ) total += h(i);
  return h(w) / total;
}

export const PHASES = {
  arriving: {label: "Arriving", note: "A few households are sick. Most people do not believe it yet."},
  rising: {label: "Spreading", note: "More fall sick every day. Those who can leave are leaving."},
  height: {label: "At its height", note: "The sick fill the houses and the dead the streets. Trade has stopped."},
  waning: {label: "Waning", note: "Fewer fall sick each week. People count their dead."},
  over: {label: "Over", note: "The sickness has passed for now."}
};

export function phaseOf(week, weeks) {
  const W = Math.max(1, Math.round(num(weeks)));
  const w = num(week);
  if ( w > W ) return "over";
  const peak = Math.max(1, Math.round(W / 3));
  if ( w <= Math.max(1, Math.floor(peak / 2)) ) return "arriving";
  if ( w < peak ) return "rising";
  if ( w <= Math.max(peak, Math.round(W / 2)) ) return "height";
  return "waning";
}

/** Summer or winter in a place: the southern lands have their seasons the other way round. */
export function seasonOf(month, lat = 50) {
  const m = ((Math.round(num(month)) - 1 + 12) % 12) + 1;
  const south = num(lat) < -10, tropics = Math.abs(num(lat)) <= 10 && lat !== null;
  if ( tropics ) return "warm";
  const north = m >= 6 && m <= 9 ? "summer" : m === 12 || m <= 2 ? "winter" : "between";
  if ( !south ) return north;
  return north === "summer" ? "winter" : north === "winter" ? "summer" : "between";
}

/** How much the season helps a sickness spread. */
export function seasonFactor(d, season) {
  if ( !d?.season ) return 1;
  if ( season === "warm" ) return d.season === "summer" ? 1.3 : 0.9;
  if ( season === "between" ) return 1;
  return season === d.season ? 1.5 : 0.5;
}

/** How fast people travel: before the railways, the railway age, the age of aircraft. */
export function speedFactor(year) {
  const y = num(year);
  return y >= 1950 ? 2 : y >= 1840 ? 1.5 : 1;
}

/** A fresh outbreak. */
export function newOutbreak({market, disease, at = 0, year = 1197, region = null, source = "", scale = 1} = {}) {
  const d = DISEASES[disease];
  if ( !d || !market ) return null;
  const v = virginSoil(disease, region, year);
  return {market: String(market), disease, week: 0, weeks: d.weeks, start: num(at), region: region ?? null,
    attack: round3(clamp(d.attack * v.attack * clamp(num(scale) || 1, 0.1, 2), 0.001, 0.9)), death: round3(clamp(d.death * v.death, 0, 0.95)),
    sick: 0, dead: 0, source: String(source ?? "").slice(0, 200), quarantined: false, market0: null, crowd0: null, cut0: null};
}

export function normOutbreak(o = {}) {
  if ( !o || !DISEASES[o.disease] || !o.market ) return null;
  const d = DISEASES[o.disease];
  return {market: String(o.market), disease: o.disease, week: Math.max(0, Math.floor(num(o.week))), weeks: Math.max(1, Math.floor(num(o.weeks) || d.weeks)),
    start: num(o.start), region: o.region ?? null, attack: clamp(num(o.attack) || d.attack, 0.001, 0.9), death: clamp(num(o.death), 0, 0.95),
    sick: clamp(num(o.sick), 0, 1), dead: clamp(num(o.dead), 0, 1), source: String(o.source ?? "").slice(0, 200), quarantined: !!o.quarantined,
    market0: o.market0 && typeof o.market0 === "object" ? o.market0 : null, crowd0: Array.isArray(o.crowd0) ? o.crowd0 : null,
    cut0: o.cut0 === undefined || o.cut0 === null ? null : !!o.cut0};
}

/** One week on: who falls sick, who dies, and the phase it has reached. Returns {outbreak, newSick, newDead, phase, from}. */
export function advance(o) {
  const n = normOutbreak(o);
  if ( !n ) return null;
  const from = phaseOf(Math.max(1, n.week), n.weeks);
  const week = n.week + 1;
  const newSick = week <= n.weeks ? n.attack * weekShare(week, n.weeks) : 0;
  const newDead = newSick * n.death;
  const out = {...n, week, sick: round3(clamp(n.sick + newSick, 0, 1)), dead: round3(clamp(n.dead + newDead, 0, 1))};
  return {outbreak: out, newSick: round3(newSick), newDead: round3(newDead), phase: phaseOf(week, n.weeks), from: n.week === 0 ? null : from};
}

/** How hard the sickness presses this week, 0 to 1: its share of the sick this week against the height's. */
export function pressure(o) {
  const n = normOutbreak(o);
  if ( !n || n.week < 1 || n.week > n.weeks ) return 0;
  const peak = Math.max(1, Math.round(n.weeks / 3));
  return round3(weekShare(n.week, n.weeks) / weekShare(peak, n.weeks));
}

/* ---------------- The state ---------------- */

/** {v, towns: {marketId: outbreak}, immune: {marketId: {disease: until}}, seeded: [seed ids], people: {actorId: illness}} */
export const blankState = () => ({v: STATE_VERSION, towns: {}, immune: {}, seeded: [], people: {}});

export function normIllness(x = {}) {
  if ( !x || !DISEASES[x.disease] ) return null;
  return {disease: x.disease, since: num(x.since), weeks: Math.max(0, Math.floor(num(x.weeks))), held: Math.max(0, Math.floor(num(x.held))), where: String(x.where ?? "").slice(0, 80)};
}

export function normState(s) {
  const out = blankState();
  for ( const [k, o] of Object.entries(s?.towns ?? {}) ) { const n = normOutbreak({...o, market: o?.market ?? k}); if ( n ) out.towns[n.market] = n; }
  for ( const [k, m] of Object.entries(s?.immune ?? {}) ) {
    const keep = {};
    for ( const [d, t] of Object.entries(m ?? {}) ) if ( DISEASES[d] && Number.isFinite(Number(t)) ) keep[d] = Number(t);
    if ( Object.keys(keep).length ) out.immune[k] = keep;
  }
  out.seeded = [...new Set((s?.seeded ?? []).map(String))].slice(-LIST_CAP);
  for ( const [k, x] of Object.entries(s?.people ?? {}) ) { const n = normIllness(x); if ( n ) out.people[k] = n; }
  return out;
}

export const isImmune = (st, marketId, disease, now) => num(st?.immune?.[marketId]?.[disease]) > num(now);

/* ---------------- Spread ---------------- */

/**
 * The chance a sick town passes its sickness to another this week, along a trade link or with a caravan.
 * {quarantine: either town cut off, season, year, caravan: a caravan left along this road this week}.
 */
export function spreadChance(o, {quarantine = false, season = "between", year = 1197, caravan = false} = {}) {
  const n = normOutbreak(o);
  if ( !n ) return 0;
  const d = DISEASES[n.disease];
  let p = d.spread * pressure(n) * seasonFactor(d, season) * speedFactor(year);
  if ( caravan ) p = Math.max(p, d.spread * 0.5 * Math.max(pressure(n), 0.25));
  if ( quarantine || n.quarantined ) p *= QUARANTINE;
  return round3(clamp(p, 0, 0.95));
}

/**
 * The week's spread. markets: market-rules state markets ([{id, links, cut}]); routes: extra [{from, to}] (caravans
 * that left a sick town this week); seasonAt(id), yearNow, now; rng. Returns [{from, to, disease, chance}] for towns not
 * already sick nor newly immune, one per target town (the likeliest source).
 */
export function spreadWeek(st, markets = [], {routes = [], seasonAt = () => "between", year = 1197, now = 0, rng = Math.random} = {}) {
  const s = normState(st);
  const byId = new Map(markets.map(m => [m.id, m]));
  const tries = [];
  for ( const o of Object.values(s.towns) ) {
    if ( o.week < 1 || o.week > o.weeks ) continue;
    const m = byId.get(o.market);
    if ( !m ) continue;
    const roads = new Map((m.links ?? []).map(l => [l, false]));
    for ( const r of routes ) if ( r.from === o.market && r.to && r.to !== o.market ) roads.set(r.to, true);
    for ( const [to, caravan] of roads ) {
      const t = byId.get(to);
      if ( !t || s.towns[to] || isImmune(s, to, o.disease, now) ) continue;
      const chance = spreadChance(o, {quarantine: !!(m.cut || t.cut), season: seasonAt(to), year, caravan});
      if ( chance > 0 ) tries.push({from: o.market, to, disease: o.disease, chance});
    }
  }
  const out = new Map();
  for ( const t of tries.sort((a, b) => b.chance - a.chance) ) {
    if ( out.has(t.to) ) continue;
    if ( rng() < t.chance ) out.set(t.to, t);
  }
  return [...out.values()];
}

/* ---------------- What a town feels ---------------- */

/** Price and supply for a sick town, by how hard it presses: [{kind, index, supply}] multipliers over the market's own. */
export function marketHit(o) {
  const n = normOutbreak(o);
  if ( !n || n.attack < 0.05 ) return null;
  const ph = phaseOf(Math.max(1, n.week), n.weeks);
  if ( ph === "over" || ph === "arriving" ) return null;
  const hard = ph === "height";
  return {index: {food: hard ? 1.5 : 1.25, medicine: hard ? 2 : 1.5, faith: hard ? 1.3 : 1.1}, supply: hard ? {food: "short", medicine: "short"} : {medicine: "short"}, crowd: "quiet"};
}

/** Feeding in a sick town: the sick are easy to find (one less difficulty) while it spreads or stands at its height. */
export function huntHit(o) {
  const n = normOutbreak(o);
  if ( !n ) return null;
  const ph = phaseOf(Math.max(1, n.week), n.weeks);
  const d = DISEASES[n.disease];
  return {disease: n.disease, name: d.label, phase: ph, note: `${PHASES[ph].note} ${d.note}`, blood: d.blood,
    sickShare: round3(n.attack * weekShare(Math.max(1, n.week), n.weeks) * 4), diff: (ph === "rising" || ph === "height") && n.attack >= 0.05 ? -1 : 0};
}

/** Words for a town's state. */
export function describe(o, name = "the town") {
  const n = normOutbreak(o);
  if ( !n ) return "";
  const d = DISEASES[n.disease];
  const ph = phaseOf(Math.max(1, n.week), n.weeks);
  const pct = v => (v >= 0.01 ? `${Math.round(v * 100)}%` : v > 0 ? "under 1%" : "none");
  return `${d.label} in ${name}: ${PHASES[ph].label.toLowerCase()}, week ${n.week} of about ${n.weeks}. Fallen sick so far: ${pct(n.sick)} of the people; dead: ${pct(n.dead)}.${n.quarantined ? " The town is shut in quarantine." : ""}`;
}

/* ---------------- People ---------------- */

/** Is this living character exposed this week? A chance by how hard it presses (house reading of M20 p. 442). */
export const exposeChance = o => round3(clamp(pressure(o) * (normOutbreak(o)?.attack ?? 0) * 2.5, 0, 0.9));

/**
 * One week of a sick character. rolled: {successes} for this week's Stamina roll against the difficulty (null when the
 * sickness does not strike this week: a slow one strikes every fourth week). Returns {illness, damage, dmg, over}.
 */
export function illnessWeek(x, rolled) {
  const n = normIllness(x);
  if ( !n ) return null;
  const d = DISEASES[n.disease];
  const weeks = n.weeks + 1;
  const strikes = !d.monthly || weeks % 4 === 0;
  if ( !strikes || !rolled ) return {illness: {...n, weeks}, damage: 0, dmg: d.dmg, over: false, strikes};
  const ok = num(rolled.successes) > 0;
  const held = ok ? n.held + 1 : 0;
  const over = (d.course !== null && weeks >= d.course) || (held >= 2 && d.dmg === "bashing");
  return {illness: over ? null : {...n, weeks, held}, damage: ok ? 0 : d.rating, dmg: d.dmg, over, strikes};
}
export const strikesThisWeek = x => { const n = normIllness(x); return !!n && (!DISEASES[n.disease].monthly || (n.weeks + 1) % 4 === 0); };

/* ---------------- History ---------------- */

/**
 * Outbreaks the histories record: id, disease, name, note, at: [[region, year], ...] (when it reached each land), last
 * (years it lingers in a land), scale (share of the usual attack). Drawn from general history; where the year of
 * arrival in a land is uncertain, the commonly cited one is used (B3264).
 */
export const HISTORY = [
  {id: "black-death", disease: "plague", name: "The Great Mortality", last: 4, note: "The Black Death comes on the trade roads and the ships.",
    at: [["central-asia", 1345], ["russia", 1346], ["anatolia", 1347], ["aegean", 1347], ["italy", 1347], ["egypt", 1347], ["levant", 1347],
      ["france", 1348], ["iberia", 1348], ["british-isles", 1348], ["maghreb", 1348], ["arabia", 1349], ["persia", 1349], ["german-lands", 1349],
      ["low-countries", 1349], ["scandinavia", 1349], ["carpathians-balkans", 1349], ["moravia", 1350, 0.4], ["poland-baltic", 1351, 0.4]]},
  {id: "plague-1360", disease: "plague", name: "The plague returns", last: 3, note: "The second coming of the pestilence takes the young.",
    at: [["france", 1360], ["british-isles", 1361], ["italy", 1361], ["german-lands", 1362], ["moravia", 1362], ["poland-baltic", 1363], ["low-countries", 1361]]},
  {id: "plague-1380", disease: "plague", name: "Plague in the crown lands", last: 2, note: "The pestilence comes back to Bohemia and Moravia.",
    at: [["moravia", 1380], ["german-lands", 1380]]},
  {id: "sweat-1485", disease: "sweat", name: "The English sweat", last: 1, note: "A new sickness comes with the soldiers of the new king.",
    at: [["british-isles", 1485], ["british-isles", 1508], ["british-isles", 1517], ["british-isles", 1528], ["german-lands", 1529], ["low-countries", 1529],
      ["scandinavia", 1529], ["poland-baltic", 1529], ["british-isles", 1551]]},
  {id: "pox-americas", disease: "smallpox", name: "The great dying", last: 6, note: "A sickness the land has never known runs ahead of the strangers' ships.",
    at: [["caribbean", 1518], ["mexico", 1520], ["andes", 1525], ["brazil", 1562], ["southern-cone", 1560], ["north-america-east", 1633], ["canada", 1634],
      ["north-america-west", 1775], ["australia", 1789], ["pacific-islands", 1853], ["arctic", 1782]]},
  {id: "flu-1580", disease: "influenza", name: "The catarrhal fever", last: 1, note: "A fever runs from Asia across Europe in a single season.",
    at: [["central-asia", 1580], ["russia", 1580], ["anatolia", 1580], ["italy", 1580], ["iberia", 1580], ["france", 1580], ["german-lands", 1580], ["moravia", 1580], ["british-isles", 1580]]},
  {id: "typhus-1620", disease: "typhus", name: "The war fever", last: 10, note: "The armies of the long war carry lice and fever from town to town.",
    at: [["moravia", 1620], ["german-lands", 1625], ["carpathians-balkans", 1620], ["poland-baltic", 1630]]},
  {id: "plague-1629", disease: "plague", name: "The plague of Milan", last: 3, note: "Armies carry it over the Alps.", at: [["italy", 1629]]},
  {id: "plague-1634", disease: "plague", name: "Plague in the war years", last: 2, note: "Armies carry it from town to town.", at: [["german-lands", 1634], ["moravia", 1634]]},
  {id: "yf-1647", disease: "yellow-fever", name: "Yellow jack", last: 2, note: "The sickness of the slave ships reaches the sugar islands.", at: [["caribbean", 1647], ["mexico", 1648]]},
  {id: "plague-1647", disease: "plague", name: "The plague of Seville", last: 4, note: "The great port empties.", at: [["iberia", 1647]]},
  {id: "plague-1665", disease: "plague", name: "The Great Plague", last: 2, note: "Doors marked with red crosses; watchmen keep the sick inside.", at: [["british-isles", 1665], ["low-countries", 1664]]},
  {id: "plague-1679", disease: "plague", name: "The plague of Vienna and Prague", last: 2, note: "Plague columns will rise in the squares after it.",
    at: [["german-lands", 1679], ["moravia", 1680], ["carpathians-balkans", 1679]]},
  {id: "plague-1708", disease: "plague", name: "The plague of the Northern War", last: 4, note: "It follows the armies round the Baltic.",
    at: [["poland-baltic", 1708], ["scandinavia", 1710], ["russia", 1710], ["german-lands", 1711]]},
  {id: "plague-1720", disease: "plague", name: "The plague of Marseille", last: 2, note: "A ship from the Levant; a wall across the hills to hold it in.", at: [["france", 1720]]},
  {id: "plague-1771", disease: "plague", name: "The Moscow plague", last: 2, note: "Riots when the icons are taken from the gates.", at: [["russia", 1771]]},
  {id: "flu-1781", disease: "influenza", name: "The Russian catarrh", last: 1, note: "A fever from the east across the whole of Europe.",
    at: [["china", 1781], ["russia", 1781], ["poland-baltic", 1782], ["german-lands", 1782], ["moravia", 1782], ["france", 1782], ["british-isles", 1782], ["italy", 1782]]},
  {id: "yf-1793", disease: "yellow-fever", name: "Fever in the port", last: 1, note: "The capital empties; the carts collect the dead each morning.", at: [["north-america-east", 1793]]},
  {id: "yf-1800", disease: "yellow-fever", name: "Fever in Cádiz", last: 2, note: "A ship from the Americas brings it.", at: [["iberia", 1800]]},
  {id: "typhus-1812", disease: "typhus", name: "The fever of the retreat", last: 2, note: "The great army dies of lice and cold.", at: [["russia", 1812], ["poland-baltic", 1813], ["german-lands", 1813]]},
  {id: "cholera-1817", disease: "cholera", name: "Cholera", last: 6, note: "A sickness out of Bengal runs along the trade roads.",
    at: [["india", 1817], ["southeast-asia", 1820], ["nusantara", 1821], ["china", 1820], ["persia", 1821], ["arabia", 1821], ["levant", 1822], ["east-africa", 1821]]},
  {id: "cholera-1830", disease: "cholera", name: "Cholera", last: 3, note: "The blue death follows the rivers and the poor quarters.",
    at: [["russia", 1830], ["poland-baltic", 1831], ["moravia", 1831], ["german-lands", 1831], ["carpathians-balkans", 1831], ["british-isles", 1832], ["france", 1832],
      ["low-countries", 1832], ["canada", 1832], ["north-america-east", 1832], ["mexico", 1833], ["iberia", 1833], ["italy", 1835], ["egypt", 1831]]},
  {id: "typhus-1847", disease: "typhus", name: "Famine fever", last: 2, note: "The starving bring it onto the emigrant ships.", at: [["british-isles", 1847], ["canada", 1847], ["north-america-east", 1847]]},
  {id: "cholera-1848", disease: "cholera", name: "Cholera", last: 2, note: "It comes back with the revolutions.",
    at: [["russia", 1847], ["german-lands", 1848], ["moravia", 1849], ["british-isles", 1848], ["france", 1849], ["north-america-east", 1849], ["north-america-west", 1850], ["brazil", 1855]]},
  {id: "plague-1855", disease: "plague", name: "The third plague", last: 10, note: "Out of the southern mountains, then down to the ports.",
    at: [["china", 1855], ["china", 1894], ["india", 1896], ["north-america-west", 1900], ["southern-cone", 1899], ["andes", 1903], ["east-africa", 1899], ["southern-africa", 1901]]},
  {id: "cholera-1866", disease: "cholera", name: "Cholera", last: 1, note: "Soldiers bring it home from the war.", at: [["moravia", 1866], ["german-lands", 1866], ["carpathians-balkans", 1866]]},
  {id: "pox-1870", disease: "smallpox", name: "Smallpox in the war", last: 3, note: "Prisoners of war carry it home.", at: [["france", 1870], ["german-lands", 1871], ["british-isles", 1871], ["moravia", 1872]]},
  {id: "measles-1875", disease: "measles", name: "The measles", last: 1, note: "A royal visit brings it back; a quarter of the islands die.", at: [["pacific-islands", 1875]]},
  {id: "yf-1878", disease: "yellow-fever", name: "Fever on the river", last: 1, note: "It climbs the great river from the gulf.", at: [["north-america-east", 1878]]},
  {id: "flu-1889", disease: "great-flu", name: "The Russian flu", last: 1, note: "The railways carry it round the world in months.", scale: 0.6,
    at: [["russia", 1889], ["poland-baltic", 1889], ["german-lands", 1889], ["moravia", 1889], ["france", 1889], ["british-isles", 1890], ["north-america-east", 1890], ["india", 1890]]},
  {id: "cholera-1892", disease: "cholera", name: "Cholera in Hamburg", last: 1, note: "Bad water in the port city; quarantine on the railways.", at: [["german-lands", 1892], ["russia", 1892]]},
  {id: "typhus-1914", disease: "typhus", name: "The war typhus", last: 2, note: "It kills soldiers and doctors alike behind the lines.", at: [["carpathians-balkans", 1914], ["russia", 1918]]},
  {id: "flu-1918", disease: "great-flu", name: "The great influenza", last: 2, note: "Masks, closed theatres, hospitals past full.",
    at: [["north-america-east", 1918], ["north-america-west", 1918], ["canada", 1918], ["france", 1918], ["british-isles", 1918], ["iberia", 1918], ["italy", 1918],
      ["german-lands", 1918], ["moravia", 1918], ["poland-baltic", 1918], ["russia", 1918], ["scandinavia", 1918], ["india", 1918], ["china", 1918], ["japan", 1918],
      ["west-africa", 1918], ["southern-africa", 1918], ["east-africa", 1918], ["brazil", 1918], ["mexico", 1918], ["andes", 1919], ["southern-cone", 1919],
      ["australia", 1919], ["aotearoa", 1918], ["pacific-islands", 1918], ["arctic", 1918], ["persia", 1918], ["levant", 1918], ["egypt", 1918], ["nusantara", 1918],
      ["southeast-asia", 1918], ["korea", 1918], ["anatolia", 1918], ["aegean", 1918], ["carpathians-balkans", 1918], ["low-countries", 1918], ["maghreb", 1918]]},
  {id: "typhus-1945", disease: "typhus", name: "Typhus in the camps", last: 1, note: "Lice and hunger in the ruins at the war's end.", at: [["german-lands", 1945], ["poland-baltic", 1945]]},
  {id: "flu-1957", disease: "influenza", name: "The Asian flu", last: 1, note: "A new strain; schools close for weeks.",
    at: [["china", 1957], ["southeast-asia", 1957], ["india", 1957], ["japan", 1957], ["british-isles", 1957], ["north-america-east", 1957], ["german-lands", 1957], ["moravia", 1957], ["russia", 1957]]},
  {id: "cholera-1961", disease: "cholera", name: "Cholera", last: 4, note: "A new strain out of the islands.", at: [["nusantara", 1961], ["southeast-asia", 1962], ["india", 1964], ["persia", 1965], ["west-africa", 1970]]},
  {id: "flu-1968", disease: "influenza", name: "The Hong Kong flu", last: 1, note: "Soldiers coming home carry it.",
    at: [["china", 1968], ["southeast-asia", 1968], ["north-america-east", 1968], ["north-america-west", 1968], ["british-isles", 1969], ["france", 1969], ["german-lands", 1969]]},
  {id: "ebola-1976", disease: "ebola", name: "A fever by the river", last: 1, note: "A mission hospital becomes the place where it spreads.", at: [["central-africa", 1976], ["east-africa", 1976], ["central-africa", 1995]]},
  {id: "hiv-1981", disease: "hiv", name: "A new sickness of the blood", last: 20, note: "Young people in the great cities fall to rare sicknesses, then everyone else.",
    at: [["central-africa", 1981], ["north-america-east", 1981], ["north-america-west", 1981], ["east-africa", 1983], ["caribbean", 1983], ["brazil", 1985],
      ["southern-africa", 1990], ["southeast-asia", 1990], ["india", 1992], ["russia", 1996], ["france", 1983], ["british-isles", 1984], ["german-lands", 1984]]},
  {id: "cholera-1991", disease: "cholera", name: "Cholera", last: 2, note: "It comes back to the coast after a century away.", at: [["andes", 1991], ["mexico", 1991], ["brazil", 1992]]},
  {id: "sars-2002", disease: "coronavirus", name: "SARS", last: 1, note: "A new lung fever; masks at the airports.", scale: 0.05,
    at: [["china", 2002], ["southeast-asia", 2003], ["canada", 2003]]},
  {id: "flu-2009", disease: "influenza", name: "The swine flu", last: 1, note: "A new strain from the farms crosses the world in weeks.",
    at: [["mexico", 2009], ["north-america-east", 2009], ["north-america-west", 2009], ["british-isles", 2009], ["german-lands", 2009], ["moravia", 2009], ["india", 2009], ["australia", 2009]]},
  {id: "cholera-2010", disease: "cholera", name: "Cholera", last: 3, note: "After the earthquake, in the camps.", at: [["caribbean", 2010]]},
  {id: "ebola-2014", disease: "ebola", name: "Ebola", last: 2, note: "It reaches the crowded cities for the first time.", at: [["west-africa", 2014]]},
  {id: "covid-2020", disease: "coronavirus", name: "The coronavirus pandemic", last: 3, note: "Lockdowns, empty streets and masks in every shop.",
    at: [["china", 2019], ...["japan", "korea", "southeast-asia", "nusantara", "india", "persia", "levant", "anatolia", "aegean", "italy", "iberia", "france", "german-lands", "moravia",
      "low-countries", "british-isles", "scandinavia", "poland-baltic", "carpathians-balkans", "russia", "egypt", "maghreb", "arabia", "west-africa", "east-africa",
      "southern-africa", "central-africa", "canada", "north-america-east", "north-america-west", "mexico", "caribbean", "andes", "brazil", "southern-cone",
      "australia", "aotearoa", "pacific-islands", "central-asia", "siberia", "tibet-himalaya", "arctic"].map(r => [r, 2020])]}
];

/** Dated events (WoDX Chronicle ids) that start a sickness in the homeland: the Future Darkness plagues (the Black Death comes by HISTORY). */
export const EVENT_SICKNESS = {"wofd-2000-2": "bioplague", "wofd-2012-2": "bioplague"};

/** The historic outbreaks that reach a region in a year: [{key, id, disease, name, note, scale, year}]. key is unique per arrival. */
export function historyFor(region, year) {
  const y = num(year), out = [];
  for ( const h of HISTORY ) {
    for ( const [r, at, sc] of h.at ) {
      if ( r !== region || y < at || y > at + Math.max(0, (h.last ?? 1) - 1) ) continue;
      out.push({key: `${h.id}:${r}:${at}`, id: h.id, disease: h.disease, name: h.name, note: h.note, scale: sc ?? h.scale ?? 1, year: at});
    }
  }
  return out;
}

/** The historic outbreak running in a region in a year, for words where no town is set up (the newest arrival). */
export function historicHere(region, year) {
  const hs = historyFor(region, year);
  return hs.length ? hs.sort((a, b) => b.year - a.year)[0] : null;
}

/**
 * The seeds due now: historic arrivals in the regions of the markets that have not been offered yet. regionOf(marketId)
 * gives a market's region. Returns [{key, market, disease, name, note, scale}] (the first clean market of each region).
 */
export function seedsDue(st, markets = [], {regionOf = () => null, year = 1197, now = 0} = {}) {
  const s = normState(st);
  const done = new Set(s.seeded), out = [];
  const regions = new Map();
  for ( const m of markets ) { const r = regionOf(m.id); if ( r && !regions.has(r) ) regions.set(r, []); if ( r ) regions.get(r).push(m); }
  for ( const [r, ms] of regions ) {
    for ( const h of historyFor(r, year) ) {
      if ( done.has(h.key) ) continue;
      const m = ms.find(x => !s.towns[x.id] && !isImmune(s, x.id, h.disease, now));
      if ( m ) out.push({key: h.key, market: m.id, disease: h.disease, name: h.name, note: h.note, scale: h.scale, region: r});
    }
  }
  return out;
}

/** The week's run for every town: advance each, mark the over ones immune. Returns {state, rows: [{market, ...advance}]} . */
export function weekTowns(st, {now = 0} = {}) {
  const s = normState(st);
  const rows = [];
  for ( const [id, o] of Object.entries(s.towns) ) {
    const r = advance(o);
    if ( !r ) continue;
    rows.push({market: id, ...r});
    if ( r.phase === "over" ) {
      delete s.towns[id];
      s.immune[id] = {...(s.immune[id] ?? {}), [o.disease]: num(now) + IMMUNE_WEEKS * WEEK};
    } else s.towns[id] = r.outbreak;
  }
  // Immunity runs out
  for ( const [id, m] of Object.entries(s.immune) ) {
    for ( const [d, t] of Object.entries(m) ) if ( t <= num(now) ) delete m[d];
    if ( !Object.keys(m).length ) delete s.immune[id];
  }
  return {state: s, rows};
}
