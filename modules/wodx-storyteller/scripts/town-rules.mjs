/**
 * WoDX Storyteller (B3280-B3289): towns that change over time. Pure rules, no Foundry calls here.
 *
 * Every market (market-rules.mjs) is a town, and each town keeps a running condition: how many people live there,
 * how well it does (prosperity 0 to 5, 3 is getting by) and how angry it is (unrest 0 to 5). Once a week of game time
 * the town turn reads what the other systems already do to the place and turns it into lasting change:
 *
 *   the market     food short or gone, dear bread and fuel, a faction's tax, closed roads, shut shops
 *   war            a siege at the town or the market cut off; a siege lost is a sack (battles.mjs, wodxBattle)
 *   plague         outbreaks by year and by region of the world (TOWN_OUTBREAKS below), and plague news
 *   dated events   famine, war, a crash, a collapse or good times (market-news-rules.mjs presets)
 *   disasters      fire in a dry season (timber towns far more than stone), flood on a river in spring, a storm on
 *                  a coast, an earthquake on unsteady ground, and a failed harvest that brings famine
 *
 * and in turn: people are born, die and move (emigrants go to the linked town that does best), unrest boils over
 * into a riot and, held long enough at its height, a rising. The weekly numbers drift slowly; the events are what
 * the Storyteller sees. Every number here is a house rule (B3281 to B3286), rounded for play rather than history.
 *
 * A town's yearly record (history) is what other systems read for a town's past: the settlement ages of the
 * chronicle rebuild, passers-by and rumours.
 */

export const STATE_VERSION = 1;
export const MAX_SCARS = 24;
export const MAX_HISTORY = 120;
export const MAX_PEOPLE = 40000000;

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const r2 = v => Math.round(v * 100) / 100;
const str = (v, max = 200) => String(v ?? "").slice(0, max);

/* ------------------------------------------------------------------ */
/*  Words                                                              */
/* ------------------------------------------------------------------ */

export const PROSPERITY = ["Ruined", "Poor", "Struggling", "Getting by", "Thriving", "Rich"];
export const UNREST = ["Calm", "Grumbling", "Restless", "Angry", "Seething", "Rising"];
export const prosperityWord = p => PROSPERITY[clamp(Math.round(num(p)), 0, 5)];
export const unrestWord = u => UNREST[clamp(Math.round(num(u)), 0, 5)];

/** What a town is built of in a year when the Storyteller has not said: timber until the great rebuildings. */
export const BUILDS = {auto: "By the era", timber: "Mostly timber and thatch", stone: "Mostly stone, brick or concrete"};
export const builtOf = (town, year) => (town?.build === "timber" || town?.build === "stone" ? town.build : num(year) < 1700 ? "timber" : "stone");

/** Ground the Storyteller marks on a town: what kinds of disaster can reach it besides fire and famine. */
export const TAGS = {river: "On a river (spring floods)", coast: "On a coast (storms)", quakes: "On unsteady ground (earthquakes)"};

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

export function blankState() { return {v: STATE_VERSION, last: null, towns: {}}; }

/** A town as the Storyteller first sees it: people from the settlement record or a guess from its places. */
export function newTown(market = {}, {people = 0, prosperity = 3, unrest = 1, region = ""} = {}) {
  const guess = 400 + 200 * Math.max(1, (market.scenes ?? []).length) + 100 * (market.traders ?? []).length;
  return normTown({id: market.id, people: num(people) > 0 ? people : guess, prosperity, unrest, region});
}

const KINDS_MARK = new Set(["famine", "war", "hunger", "boom"]);
export function normTown(t = {}) {
  const tags = {};
  for ( const k of Object.keys(TAGS) ) if ( t.tags?.[k] ) tags[k] = true;
  const out = {id: str(t.id, 80), people: clamp(Math.round(num(t.people)), 0, MAX_PEOPLE), prosperity: r2(clamp(num(t.prosperity ?? 3), 0, 5)),
    unrest: r2(clamp(num(t.unrest ?? 1), 0, 5)), tags, build: BUILDS[t.build] ? t.build : "auto", region: str(t.region, 40),
    hungry: clamp(Math.round(num(t.hungry)), 0, 520), calm: clamp(Math.round(num(t.calm)), 0, 52), high: clamp(Math.round(num(t.high)), 0, 520), carry: r2(num(t.carry)),
    marks: (Array.isArray(t.marks) ? t.marks : []).filter(m => KINDS_MARK.has(m?.kind) && num(m.weeks) > 0).slice(0, 8)
      .map(m => ({kind: m.kind, weeks: clamp(Math.round(num(m.weeks)), 1, 520), why: str(m.why, 120)})),
    struck: t.struck && num(t.struck.weeks) > 0 ? {key: str(t.struck.key, 60), name: str(t.struck.name, 80), weeks: clamp(Math.round(num(t.struck.weeks)), 1, 104), share: clamp(num(t.struck.share), 0, 0.2)} : null,
    seen: (Array.isArray(t.seen) ? t.seen : []).map(s => str(s, 60)).slice(-40),
    scars: (Array.isArray(t.scars) ? t.scars : []).filter(s => s?.kind).slice(-MAX_SCARS).map(s => ({kind: str(s.kind, 20), year: Math.round(num(s.year)), month: Math.round(num(s.month)) || 1, text: str(s.text, 300)})),
    history: (Array.isArray(t.history) ? t.history : []).filter(h => Number.isFinite(Number(h?.year))).slice(-MAX_HISTORY)
      .map(h => ({year: Math.round(num(h.year)), people: Math.round(num(h.people)), prosperity: r2(num(h.prosperity)), unrest: r2(num(h.unrest))}))};
  if ( t.hand ) out.hand = true;
  return out;
}

export function normState(s = {}) {
  const towns = {};
  for ( const [id, t] of Object.entries(s?.towns && typeof s.towns === "object" ? s.towns : {}) ) if ( id ) towns[id] = normTown({...t, id});
  return {v: STATE_VERSION, last: Number.isFinite(Number(s?.last)) && s.last !== null ? Number(s.last) : null, towns};
}

/* ------------------------------------------------------------------ */
/*  Outbreaks, by year and by region of the world (B3283)              */
/* ------------------------------------------------------------------ */

const EUROPE = ["moravia", "german-lands", "british-isles", "france", "iberia", "italy", "low-countries", "scandinavia", "poland-baltic", "carpathians-balkans", "russia", "aegean"];
const NEAR_EAST = ["anatolia", "levant", "egypt", "arabia", "maghreb", "persia", "central-asia"];
/**
 * share: the part of a struck town's people the outbreak kills, spread over the weeks it lasts there; chance: the
 * chance each week that a town in its reach is struck while it runs (each town at most once an outbreak). Reach
 * "all" is the whole world. A rounded reading of the great outbreaks; the Storyteller's own dated events with
 * market "plague" add more.
 */
export const TOWN_OUTBREAKS = [
  {key: "black-death", from: 1347, to: 1351, name: "The Black Death", share: 0.35, weeks: 26, chance: 0.04, reach: [...EUROPE, ...NEAR_EAST]},
  {key: "plague-1360", from: 1360, to: 1363, name: "The plague returns", share: 0.12, weeks: 20, chance: 0.03, reach: EUROPE},
  {key: "smallpox-1520", from: 1520, to: 1521, name: "Smallpox", share: 0.35, weeks: 30, chance: 0.08, reach: ["mexico", "caribbean"]},
  {key: "smallpox-1525", from: 1525, to: 1528, name: "Smallpox", share: 0.3, weeks: 30, chance: 0.04, reach: ["andes"]},
  {key: "cocoliztli-1545", from: 1545, to: 1548, name: "The great sickness", share: 0.4, weeks: 40, chance: 0.04, reach: ["mexico"]},
  {key: "plague-1634", from: 1634, to: 1635, name: "Plague in the war years", share: 0.1, weeks: 20, chance: 0.04, reach: ["moravia", "german-lands", "italy", "france", "low-countries"]},
  {key: "plague-1665", from: 1663, to: 1666, name: "The Great Plague", share: 0.15, weeks: 26, chance: 0.03, reach: ["british-isles", "low-countries"]},
  {key: "cholera-1817", from: 1817, to: 1824, name: "Cholera", share: 0.03, weeks: 12, chance: 0.02, reach: ["india", "southeast-asia", "nusantara", "china", "persia", "arabia", "east-africa"]},
  {key: "cholera-1831", from: 1830, to: 1832, name: "Cholera", share: 0.03, weeks: 12, chance: 0.04, reach: [...EUROPE, "india", "north-america-east", "canada", "egypt"]},
  {key: "cholera-1848", from: 1848, to: 1849, name: "Cholera", share: 0.03, weeks: 12, chance: 0.04, reach: [...EUROPE, "north-america-east", "egypt"]},
  {key: "plague-1855", from: 1855, to: 1900, name: "Plague", share: 0.04, weeks: 16, chance: 0.002, reach: ["china", "india"]},
  {key: "cholera-1866", from: 1866, to: 1866, name: "Cholera", share: 0.02, weeks: 10, chance: 0.05, reach: ["moravia", "german-lands"]},
  {key: "cholera-1892", from: 1892, to: 1892, name: "Cholera", share: 0.02, weeks: 10, chance: 0.05, reach: ["german-lands", "russia"]},
  {key: "influenza-1918", from: 1918, to: 1920, name: "Influenza", share: 0.03, weeks: 14, chance: 0.05, reach: "all"}
];
export const outbreaksIn = (year, region) => TOWN_OUTBREAKS.filter(o => num(year) >= o.from && num(year) <= o.to && (o.reach === "all" || o.reach.includes(region)));

/* ------------------------------------------------------------------ */
/*  Growth and drift (B3281)                                           */
/* ------------------------------------------------------------------ */

/** Births over deaths in a year, as a share of the people, in an ordinary year of the age. */
export function naturalGrowth(year) {
  const y = num(year);
  if ( y < 1750 ) return 0.002;
  if ( y < 1950 ) return 0.008;
  if ( y < 2023 ) return 0.004;
  return 0;
}
const WEEKS = 52;

export const UNREST_EASE = 0.1, PROSPERITY_EASE = 0.02;
/** Weeks after a riot before another can break out. */
export const RIOT_REST = 6;

/** The pressures on a town this week: each a number added to prosperity or unrest, and why. */
export function pressures(town, market = {}, ctx = {}) {
  const {taxes = 0, closedRoads = 0, shutShare = 0, besieged = false, foodSupply = "normal", foodIndex = 1, fuelIndex = 1} = ctx;
  const p = [], u = [];
  const add = (list, v, why) => { if ( v ) list.push({v: r2(v), why}); };
  if ( besieged || market.cut ) { add(p, -0.06, besieged ? "the siege" : "cut off from the world"); add(u, 0.1, besieged ? "the siege" : "cut off"); }
  if ( foodSupply === "none" ) { add(u, 0.3, "no bread to be had"); add(p, -0.02, "no bread"); }
  else if ( foodSupply === "short" ) add(u, 0.08, "bread is short");
  else if ( foodSupply === "plenty" ) { add(u, -0.03, "full tables"); add(p, 0.01, "full tables"); }
  const dear = Math.max(num(foodIndex), num(fuelIndex) * 0.8);
  if ( dear >= 1.5 ) add(u, r2(Math.min(0.2, (dear - 1.3) * 0.15)), "dear bread and fuel");
  if ( taxes > 0 ) { add(u, r2(taxes * 0.25), "the tax"); add(p, -r2(taxes * 0.1), "the tax"); }
  if ( closedRoads > 0 ) add(p, -r2(Math.min(0.04, 0.01 * closedRoads)), "closed roads");
  if ( shutShare > 0 ) add(p, -r2(0.03 * shutShare), "shut shops");
  for ( const m of town.marks ?? [] ) {
    if ( m.kind === "famine" ) { add(u, 0.15, "famine"); add(p, -0.02, "famine"); }
    if ( m.kind === "war" ) { add(u, 0.05, "the war"); add(p, -0.015, "the war"); }
    if ( m.kind === "boom" ) { add(p, 0.03, "good times"); add(u, -0.03, "good times"); }
  }
  if ( town.struck ) { add(u, 0.1, town.struck.name.toLowerCase()); add(p, -0.02, town.struck.name.toLowerCase()); }
  // Things settle: unrest eases a tenth of the way back to grumbling each week, prosperity a fiftieth of the way back
  // to getting by, so a pressure that lasts holds a town at its own level and a one-off blow wears off over a year or so
  add(u, -(num(town.unrest) - 1) * UNREST_EASE, "the weeks pass");
  add(p, -(num(town.prosperity) - 3) * PROSPERITY_EASE, "the weeks pass");
  return {p, u};
}

/* ------------------------------------------------------------------ */
/*  Disasters (B3282)                                                  */
/* ------------------------------------------------------------------ */

/** Months of the dry season and of spring floods, turned for the southern half of the world. */
const flip = (m, south) => (south ? ((m + 5) % 12) + 1 : m);
export const isDry = (month, lat = 50) => [6, 7, 8, 9].includes(flip(num(month), num(lat) < 0));
export const isSpring = (month, lat = 50) => [3, 4, 5].includes(flip(num(month), num(lat) < 0));
export const isHarvest = (month, lat = 50) => flip(num(month), num(lat) < 0) === 8;

/** The chance in a week of a great fire: timber towns in a dry season far more than stone ones, less with fire brigades. */
export function fireChance(town, {year = 1197, month = 1, lat = 50} = {}) {
  const timber = builtOf(town, year) === "timber";
  let c = timber ? 1 / 900 : 1 / 3000;
  if ( isDry(month, lat) ) c *= 2.5;
  if ( num(year) >= 1850 ) c *= 0.5;
  if ( num(year) >= 1950 ) c *= 0.4;
  return c;
}
/** A failed harvest, once a year at harvest time: common before the new farming, rare after, gone with world trade. */
export function harvestChance(year) {
  const y = num(year);
  return y < 1750 ? 1 / 12 : y < 1880 ? 1 / 30 : y < 1950 ? 1 / 80 : 0;
}

/**
 * The disasters a week may bring. rand: a number source. Returns [{kind, prosperity, unrest, dead, fled, marks, text, big}].
 * dead and fled are shares of the people.
 */
export function rollDisasters(town, {year = 1197, month = 1, lat = 50, rand = Math.random} = {}) {
  const out = [];
  const timber = builtOf(town, year) === "timber";
  if ( rand() < fireChance(town, {year, month, lat}) ) {
    const size = rand();
    out.push({kind: "fire", prosperity: -(timber ? 0.6 + size : 0.3 + size * 0.5), unrest: 0.4, dead: timber ? 0.004 : 0.001, fled: timber ? 0.02 + size * 0.04 : 0.01,
      text: size > 0.7 ? "A great fire burns through whole streets." : "A fire takes a row of houses before it is put out.", big: size > 0.7});
  }
  if ( town.tags?.river && isSpring(month, lat) && rand() < (num(year) >= 1900 ? 1 / 250 : 1 / 120) ) {
    const size = rand();
    out.push({kind: "flood", prosperity: -(0.3 + size * 0.6), unrest: 0.2, dead: 0.001 + size * 0.003, fled: 0.01,
      text: size > 0.7 ? "The river breaks its banks and the low town goes under." : "The river rises into the lower streets.", big: size > 0.7});
  }
  if ( town.tags?.coast && rand() < 1 / 300 ) {
    const size = rand();
    out.push({kind: "storm", prosperity: -(0.2 + size * 0.5), unrest: 0.1, dead: size * 0.002, fled: 0,
      text: size > 0.7 ? "A storm wrecks the harbour and drowns the boats at anchor." : "A storm tears roofs and sinks boats.", big: size > 0.7});
  }
  if ( town.tags?.quakes && rand() < 1 / 2000 ) {
    const size = rand();
    out.push({kind: "quake", prosperity: -(0.5 + size * 1.5), unrest: 0.5, dead: 0.005 + size * 0.04, fled: 0.03,
      text: size > 0.7 ? "The ground shakes and half the town falls." : "An earthquake cracks walls and brings down chimneys.", big: size > 0.5});
  }
  if ( isHarvest(month, lat) && rand() < harvestChance(year) ) {
    out.push({kind: "famine", prosperity: -0.3, unrest: 0.3, dead: 0, fled: 0, marks: [{kind: "famine", weeks: 26, why: "a failed harvest"}],
      text: "The harvest fails. Bread will be short until the next.", big: true, food: true});
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Riots and risings (B3284)                                          */
/* ------------------------------------------------------------------ */

/** The chance in a week that unrest boils over into a riot. */
export const riotChance = u => (num(u) >= 3.5 ? Math.min(0.5, (num(u) - 3) * 0.15) : 0);
/** Weeks unrest must stand at 4.5 or more before a rising can come, and its chance each week after. */
export const RISING_AFTER = 4, RISING_CHANCE = 0.2;

export function riotWords(year, why = "") {
  const y = num(year);
  const what = /bread|famine|food/.test(why) ? "bread riot" : /tax/.test(why) ? (y < 1800 ? "rising against the tax" : "riot over the tax") : "riot";
  return `A ${what} breaks out; windows are broken and a storehouse is looted.`;
}
export function risingWords(year) {
  const y = num(year);
  if ( y < 1500 ) return "The town rises in revolt against its lords.";
  if ( y < 1789 ) return "The town rises: the gates are taken and the council thrown out.";
  if ( y < 1990 ) return "An uprising: barricades in the streets and the town hall taken.";
  return "Mass protests turn into an uprising; the streets are held against the police.";
}

/* ------------------------------------------------------------------ */
/*  The week                                                           */
/* ------------------------------------------------------------------ */

/**
 * One week for every town. markets: the markets state's list; ctxFor(market) gives the market pressures (see
 * pressures); regionOf(town) the town's world region; latOf(town, region) its latitude (seasons turn south of the
 * equator); randFor(id) a number source for that town; events: news from outside to fold in this week.
 * Returns {state, events: [{town, name, kind, text, big, effect}], moved: [{from, to, people}]}.
 * Effects of events are already in the returned state; the caller decides whether they stand (Undo restores).
 */
export function weekTowns(state, markets = [], {year = 1197, month = 1, latOf = () => 50, ctxFor = () => ({}), regionOf = t => t.region || "moravia", randFor = () => Math.random, events: outside = []} = {}) {
  const st = normState(state);
  const events = [], moved = [];
  const byId = new Map(markets.map(m => [m.id, m]));
  for ( const m of markets ) if ( !st.towns[m.id] ) st.towns[m.id] = newTown(m);
  for ( const id of Object.keys(st.towns) ) if ( !byId.has(id) ) delete st.towns[id];
  for ( const m of markets ) {
    const t = st.towns[m.id], rand = randFor(m.id), ctx = ctxFor(m) ?? {};
    const region = regionOf(t), lat = latOf(t, region);
    const say = (kind, text, big, effect = {}) => events.push({town: m.id, name: m.name, kind, text, big: !!big, effect});
    // Plague: a town in an outbreak's reach may be struck, once for each outbreak
    if ( !t.struck ) {
      for ( const o of outbreaksIn(year, region) ) {
        if ( t.seen.includes(o.key) ) continue;
        if ( rand() < o.chance ) {
          t.struck = {key: o.key, name: o.name, weeks: o.weeks, share: r2(o.share / o.weeks * 1000) / 1000};
          t.seen.push(o.key);
          say("plague", `${o.name} reaches the town.`, true, {share: o.share});
          break;
        }
      }
    }
    // Outside news for this town (dated events, a sack)
    for ( const e of outside.filter(e => e.town === m.id || e.town === "*") ) applyEvent(t, e, {year, month}, say);
    // Disasters
    for ( const d of rollDisasters(t, {year, month, lat, rand}) ) applyEvent(t, d, {year, month}, say);
    // Pressures move prosperity and unrest
    const pr = pressures(t, m, ctx);
    t.prosperity = r2(clamp(t.prosperity + pr.p.reduce((s, x) => s + x.v, 0), 0, 5));
    t.unrest = r2(clamp(t.unrest + pr.u.reduce((s, x) => s + x.v, 0), 0, 5));
    t.hungry = ctx.foodSupply === "none" ? t.hungry + 1 : 0;
    // People: births and deaths, plague, hunger, and leaving or coming for work
    let rate = naturalGrowth(year) / WEEKS + (t.prosperity - 3) * 0.004 / WEEKS;
    if ( t.struck ) rate -= t.struck.share;
    if ( t.hungry >= 4 || t.marks.some(x => x.kind === "famine") ) rate -= 0.0015;
    if ( ctx.besieged ) rate -= 0.001;
    const leave = t.unrest >= 4 ? 0.0004 : 0;
    const exact = t.people * rate + t.carry;
    const change = Math.trunc(exact);
    t.carry = r2(exact - change);
    t.people = clamp(t.people + change, 0, MAX_PEOPLE);
    const fled = Math.floor(t.people * leave);
    if ( fled > 0 ) { t.people -= fled; moved.push({from: m.id, people: fled}); }
    // Riots and risings
    const top = [...pr.u].sort((a, b) => b.v - a.v)[0]?.why ?? "";
    t.high = t.unrest >= 4.5 ? t.high + 1 : 0;
    if ( t.high >= RISING_AFTER && rand() < RISING_CHANCE ) {
      const eff = {prosperity: -1, unrest: -2.5, dead: 0.002};
      applyEffect(t, eff);
      t.high = 0;
      say("rising", risingWords(year), true, eff);
    } else if ( t.calm > 0 ) t.calm -= 1;
    else if ( rand() < riotChance(t.unrest) ) {
      t.calm = RIOT_REST;
      const eff = {prosperity: -0.3, unrest: -1.2, dead: 0.0002};
      applyEffect(t, eff);
      say("riot", riotWords(year, top), t.unrest >= 3, eff);
    }
    // Time runs down on what lasts
    t.marks = t.marks.map(x => ({...x, weeks: x.weeks - 1})).filter(x => x.weeks > 0);
    if ( t.struck ) { t.struck.weeks -= 1; if ( t.struck.weeks <= 0 ) { say("plague-ends", `${t.struck.name} leaves the town.`, false); t.struck = null; } }
  }
  // Emigrants go to the linked town that does best; with no better one they leave the region
  for ( const mv of moved ) {
    const links = (byId.get(mv.from)?.links ?? []).map(l => st.towns[l]).filter(Boolean).filter(x => x.prosperity > st.towns[mv.from].prosperity && x.unrest < 4);
    const to = links.sort((a, b) => b.prosperity - a.prosperity)[0];
    if ( to ) { to.people = clamp(to.people + mv.people, 0, MAX_PEOPLE); mv.to = to.id; }
  }
  // A line in each town's history at the turn of the year
  for ( const t of Object.values(st.towns) ) {
    const last = t.history[t.history.length - 1];
    if ( !last || last.year < year ) t.history.push({year, people: t.people, prosperity: t.prosperity, unrest: t.unrest});
    else Object.assign(last, {people: t.people, prosperity: t.prosperity, unrest: t.unrest});
    t.history = t.history.slice(-MAX_HISTORY);
  }
  return {state: normState(st), events, moved};
}

function applyEffect(t, e = {}) {
  t.prosperity = r2(clamp(t.prosperity + num(e.prosperity), 0, 5));
  t.unrest = r2(clamp(t.unrest + num(e.unrest), 0, 5));
  const lost = Math.floor(t.people * clamp(num(e.dead) + num(e.fled), 0, 0.9));
  t.people = Math.max(0, t.people - lost);
  for ( const mk of e.marks ?? [] ) {
    const had = t.marks.find(x => x.kind === mk.kind);
    if ( had ) had.weeks = Math.max(had.weeks, mk.weeks); else t.marks.push({...mk});
  }
  return lost;
}

function applyEvent(t, e, {year, month}, say) {
  const effect = {prosperity: num(e.prosperity), unrest: num(e.unrest), dead: num(e.dead), fled: num(e.fled), marks: e.marks ?? []};
  if ( e.kind === "plague" && !t.struck && e.share ) {
    t.struck = {key: e.key ?? "news", name: e.name ?? "Plague", weeks: e.weeks ?? 20, share: r2(e.share / (e.weeks ?? 20) * 1000) / 1000};
  }
  const lost = applyEffect(t, effect);
  t.scars.push({kind: e.kind, year: Math.round(num(year)), month: Math.round(num(month)) || 1, text: e.text});
  t.scars = t.scars.slice(-MAX_SCARS);
  say(e.kind, e.text, e.big, {...effect, lost, food: !!e.food});
}

/* ------------------------------------------------------------------ */
/*  News from outside the week (B3285)                                 */
/* ------------------------------------------------------------------ */

/** What a market news preset (a dated event) does to every town. */
export const NEWS_EFFECT = {
  plague: {kind: "plague", share: 0.08, weeks: 20, unrest: 0.3, text: "Plague comes with the news.", big: true},
  famine: {kind: "famine", prosperity: -0.4, unrest: 0.4, marks: [{kind: "famine", weeks: 26, why: "famine"}], text: "Famine in the land.", big: true},
  war: {kind: "war", prosperity: -0.3, unrest: 0.3, marks: [{kind: "war", weeks: 26, why: "war"}], text: "War takes the young men and the grain.", big: true},
  siege: {kind: "war", prosperity: -0.5, unrest: 0.5, marks: [{kind: "war", weeks: 12, why: "siege"}], text: "Siege and war in the land.", big: true},
  crash: {kind: "crash", prosperity: -1, unrest: 0.5, text: "A crash: money is gone and the workshops lay people off.", big: true},
  collapse: {kind: "collapse", prosperity: -1.5, unrest: 1, marks: [{kind: "war", weeks: 26, why: "collapse"}], text: "Order collapses; whoever has fuel or a gun rules the street.", big: true},
  boom: {kind: "boom", prosperity: 0.5, unrest: -0.3, marks: [{kind: "boom", weeks: 26, why: "good times"}], text: "Good times: money is about.", big: false}
};
export function newsEvent(preset, {name = ""} = {}) {
  const e = NEWS_EFFECT[preset];
  return e ? {...e, town: "*", name: e.kind === "plague" ? (name || "Plague") : undefined, text: name ? `${name}: ${e.text.charAt(0).toLowerCase()}${e.text.slice(1)}` : e.text} : null;
}

/**
 * News that lands at once (a dated event, a sack): applied to the towns it names ("*" for all) outside the week.
 * Returns {state, events} like weekTowns.
 */
export function applyNow(state, news = [], {year = 1197, month = 1} = {}) {
  const st = normState(state), events = [];
  for ( const e of news ) {
    for ( const t of Object.values(st.towns).filter(t => e.town === "*" || e.town === t.id) ) {
      applyEvent(t, e, {year, month}, (kind, text, big, effect) => events.push({town: t.id, kind, text, big: !!big, effect}));
    }
  }
  return {state: normState(st), events};
}

/** A battle at a town: a siege won by the attackers is a sack; a lost siege or a field battle nearby costs less. */
export function battleEvent(battle, townId) {
  if ( !battle?.over ) return null;
  if ( battle.kind === "siege" ) {
    if ( battle.over.winner === 0 ) return {town: townId, kind: "sack", prosperity: -2, unrest: 1, dead: 0.08, fled: 0.05, text: "The town is taken by storm and sacked.", big: true};
    return {town: townId, kind: "siege-lifted", prosperity: -0.3, unrest: -0.3, text: "The siege is lifted; the town counts its dead and its debts.", big: false};
  }
  return {town: townId, kind: "battle", prosperity: -0.4, unrest: 0.3, dead: 0.005, text: "A battle is fought at the town; fields and houses are wrecked.", big: false};
}
const fold = s => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
/** The market a battle's place names: its name, or the name of one of its scenes. */
export function townOfPlace(place, markets = [], sceneName = () => "") {
  const p = fold(place);
  if ( !p ) return null;
  return markets.find(m => fold(m.name) === p || (m.scenes ?? []).some(s => fold(sceneName(s)) === p))
    ?? markets.find(m => fold(m.name).length > 2 && p.includes(fold(m.name))) ?? null;
}

/* ------------------------------------------------------------------ */
/*  Skipped weeks and what others read                                 */
/* ------------------------------------------------------------------ */

/** Weeks that passed unplayed: only births and deaths of an ordinary year, and things settle; no events. */
export function settleWeeks(state, weeks, {year = 1197} = {}) {
  const st = normState(state);
  const w = Math.max(0, Math.floor(num(weeks)));
  if ( !w ) return st;
  for ( const t of Object.values(st.towns) ) {
    t.people = clamp(Math.round(t.people * Math.pow(1 + naturalGrowth(year) / WEEKS + (t.prosperity - 3) * 0.004 / WEEKS, w)), 0, MAX_PEOPLE);
    t.unrest = r2(1 + (t.unrest - 1) * Math.pow(1 - UNREST_EASE, w));
    t.prosperity = r2(3 + (t.prosperity - 3) * Math.pow(1 - PROSPERITY_EASE, w));
    t.marks = t.marks.map(x => ({...x, weeks: x.weeks - w})).filter(x => x.weeks > 0);
    if ( t.struck ) { t.people = Math.max(0, Math.round(t.people * (1 - t.struck.share * Math.min(w, t.struck.weeks)))); t.struck.weeks -= w; if ( t.struck.weeks <= 0 ) t.struck = null; }
    t.high = 0; t.hungry = 0; t.calm = 0;
  }
  return st;
}

/** A town's condition in words, for passers-by, rumours and the Storyteller. */
export function view(t) {
  if ( !t ) return null;
  return {id: t.id, people: t.people, prosperity: t.prosperity, unrest: t.unrest, prosperityWord: prosperityWord(t.prosperity), unrestWord: unrestWord(t.unrest),
    mood: t.unrest >= 3.5 ? "angry" : t.struck ? "afraid" : t.prosperity <= 1 ? "grim" : t.prosperity >= 4 ? "cheerful" : "ordinary",
    plague: t.struck?.name ?? null, marks: t.marks.map(m => m.kind), scars: t.scars.slice(-5), history: t.history};
}

/** The size word for a number of people, by age (a city of 10,000 was a great one in 1300). */
export function sizeWord(people, year) {
  const p = num(people), big = num(year) < 1800 ? 1 : num(year) < 1900 ? 3 : 10;
  return p < 200 ? "hamlet" : p < 1000 ? "village" : p < 5000 * big ? "town" : p < 40000 * big ? "city" : "great city";
}

/** Put towns back as they were: snapshot of the towns a turn touched. */
export const snapshot = (state, ids = []) => ids.map(id => ({id, town: state.towns?.[id] ? JSON.parse(JSON.stringify(state.towns[id])) : null}));
export function restore(state, snap = []) {
  const st = normState(state);
  for ( const s of snap ) { if ( s.town ) st.towns[s.id] = normTown(s.town); else delete st.towns[s.id]; }
  return st;
}
