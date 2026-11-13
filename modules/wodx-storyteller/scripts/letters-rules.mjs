/**
 * WoDX Storyteller 0.11.0: letters and news that travel. Pure rules, harness-tested.
 *
 * A player sends a letter or message from their character, by a carrier the year allows, to another player character
 * or to someone the Storyteller plays. It arrives when the carrier would bring it, on the clock. The Storyteller sees
 * every letter when it is sent and can hold it back (it was lost, stopped or read on the way) or let it go; nothing is
 * intercepted by a roll. A reply to someone the Storyteller plays is the Storyteller's own to write.
 * House figures: the books give no delivery times. The telephone date matches WoDX NPC's alarm carriers.
 *
 * Storyteller 0.59.0 (B2700 to B2704): a letter goes from one part of the world to another (WoDX Chronicle's world
 * regions) and takes the world map's journey time for the year, by the way the sender picks: a messenger (riders,
 * relays, ships, a courier by air), a traveller going that way, the post, a telegram, a call, an e-mail or the Net,
 * each only where and when that land has it. The Storyteller sees what is on the way and can lose it, delay it or
 * have it read; an answer goes back the same long way.
 */

const H = 3600, D = 86400;

/** Distances a sender can pick. Storyteller 0.59.0: only inside one part of the world; between parts the world map gives the way. */
export const REACH = {
  near: "In the same town",
  region: "A day's ride or so away",
  far: "Another land"
};

/**
 * Carriers. from/to: the years they can be used anywhere. time(reach, year): seconds on the way inside one part of
 * the world (and, for a letter without parts of the world, "far"), or null when it cannot reach that far in that
 * year. read: who may read it on the way, for the Storyteller's card. lost: the house chance in a hundred that one
 * goes astray, for a journey of a week (it grows with the days on the way).
 */
export const CARRIERS = {
  messenger: {label: "A messenger", from: 0, to: 9999, read: "the messenger, or whoever stops them", lost: 6,
    time: (r, y) => r === "near" ? H : r === "region" ? D : (y < 1500 ? 30 : 14) * D},
  traveller: {label: "With a traveller going that way", from: 0, to: 1900, read: "the traveller, and anyone they meet", lost: 18,
    time: r => r === "near" ? D : r === "region" ? 4 * D : 45 * D},
  post: {label: "The post", from: 1500, to: 9999, read: "anyone who opens the seal", lost: 3,
    time: (r, y) => y >= 1840 ? (r === "near" ? 4 * H : r === "region" ? D : 4 * D) : (r === "near" ? D : r === "region" ? 3 * D : 10 * D)},
  telegraph: {label: "A telegram", from: 1844, to: 1990, read: "the telegraph clerks", lost: 1,
    time: r => r === "near" ? H : r === "region" ? 2 * H : 4 * H},
  telephone: {label: "A telephone call", from: 1890, to: 9999, read: "an operator, or anyone on the line", lost: 0,
    time: (r, y) => (r === "far" && y < 1927) ? null : 0},
  email: {label: "An e-mail", from: 1995, to: 9999, read: "whoever holds the server", lost: 0,
    time: () => 60},
  net: {label: "A message over the Net", from: 2010, to: 9999, read: "whoever watches the Net", future: true, lost: 0,
    time: () => 0}
};

/**
 * Storyteller 0.59.0 (B2700): the year each way of sending reached each part of the world (WoDX Chronicle's world
 * regions). Columns: post, telegraph, telephone. post: a letter post anyone may use (a state courier for officials
 * only does not count: they send by messenger). telegraph: an office in the towns, joined to the next land.
 * telephone: lines in the towns. null: never there in WoDX. E-mail reads the internet year of WoDX Chronicle's
 * REGION_MEDIA. A house reading of history, rounded to the year a thing became common; the books give no such table.
 */
const LN = (post, telegraph, telephone) => ({post, telegraph, telephone});
export const REGION_LINES = {
  "moravia": LN(1500, 1847, 1890), "german-lands": LN(1490, 1849, 1881), "british-isles": LN(1516, 1846, 1880), "france": LN(1477, 1845, 1880),
  "iberia": LN(1505, 1855, 1885), "italy": LN(1490, 1850, 1881), "low-countries": LN(1500, 1846, 1881), "scandinavia": LN(1624, 1853, 1880),
  "poland-baltic": LN(1558, 1852, 1890), "carpathians-balkans": LN(1700, 1855, 1895), "russia": LN(1665, 1852, 1882), "aegean": LN(1840, 1859, 1900),
  "anatolia": LN(1840, 1855, 1909), "levant": LN(1840, 1861, 1910), "egypt": LN(1865, 1856, 1884), "arabia": LN(1882, 1900, 1934),
  "maghreb": LN(1835, 1854, 1890), "persia": LN(1874, 1864, 1910), "central-asia": LN(1870, 1873, 1925), "siberia": LN(1700, 1869, 1920),
  "tibet-himalaya": LN(1910, 1904, 1950), "india": LN(1837, 1851, 1882), "china": LN(1400, 1881, 1900), "japan": LN(1663, 1869, 1890),
  "korea": LN(1884, 1885, 1902), "southeast-asia": LN(1850, 1870, 1890), "nusantara": LN(1746, 1856, 1882), "west-africa": LN(1880, 1886, 1910),
  "central-africa": LN(1890, 1910, 1930), "east-africa": LN(1890, 1890, 1910), "southern-africa": LN(1792, 1860, 1882), "canada": LN(1755, 1847, 1878),
  "north-america-east": LN(1692, 1844, 1878), "north-america-west": LN(1850, 1861, 1880), "mexico": LN(1580, 1851, 1882), "caribbean": LN(1760, 1870, 1885),
  "andes": LN(1570, 1870, 1888), "brazil": LN(1663, 1857, 1883), "southern-cone": LN(1748, 1857, 1881), "australia": LN(1809, 1854, 1880),
  "aotearoa": LN(1840, 1862, 1881), "pacific-islands": LN(1880, 1902, 1920), "arctic": LN(1900, 1920, 1950), "antarctica": LN(null, 1911, 1957)
};

/**
 * The great land masses, for the cables under the sea and the calls across it. A part of the world not named here is
 * on the old world (Europe, Asia and Africa, joined by land).
 */
export const LAND_MASS = {canada: "americas", "north-america-east": "americas", "north-america-west": "americas", mexico: "americas", caribbean: "americas",
  andes: "americas", brazil: "americas", "southern-cone": "americas", australia: "oceania", aotearoa: "oceania", "pacific-islands": "oceania",
  arctic: "poles", antarctica: "poles"};
export const massOf = region => LAND_MASS[region] ?? "old";
/**
 * Between two land masses: cable, the year a telegram crosses (the Atlantic cable of 1866, Australia joined by way of
 * Java in 1872, the Pacific cable of 1902; the poles by wireless); call, the year a telephone call crosses (the
 * radiotelephone over the Atlantic in 1927). Inside one land mass a call between two parts of the world needs the
 * long lines of LONG_CALLS.
 */
export const CROSSINGS = {"americas|old": {cable: 1866, call: 1927}, "oceania|old": {cable: 1872, call: 1930}, "americas|oceania": {cable: 1902, call: 1931},
  "old|poles": {cable: 1911, call: 1956}, "americas|poles": {cable: 1911, call: 1956}, "oceania|poles": {cable: 1911, call: 1956}};
export const LONG_CALLS = 1910;
const crossing = (a, b) => CROSSINGS[[massOf(a), massOf(b)].sort().join("|")] ?? null;

/**
 * Relays of fresh riders or runners (the Mongol yam, the Inca chasqui): a messenger inside one goes many times the
 * pace of a rider alone. regions, from, to (years) and pace (share of a lone rider's days).
 */
export const RELAYS = [
  {id: "yam", label: "the relay stations of the Mongol post", regions: ["china", "central-asia", "persia", "russia", "siberia", "korea", "tibet-himalaya", "anatolia"], from: 1235, to: 1368, pace: 0.3},
  {id: "chasqui", label: "the chasqui runners of the Inca roads", regions: ["andes"], from: 1450, to: 1533, pace: 0.25}
];
/** A lone rider with fresh horses on land, against the journey's pace for a traveller with baggage. */
export const RIDER_PACE = 0.5;
/** Days a letter waits at the post at each end, before and after the railways. */
export const POST_WAIT = year => (Number(year) >= 1840 ? 1 : 2);
/** Days before a traveller going the right way is found. */
export const TRAVELLER_WAIT = 5;

/** The year a way of sending reached a part of the world: null when never, -Infinity when it needs none. */
export function lineYear(how, region, {internet = null} = {}) {
  if ( !region ) return -Infinity;
  if ( how === "email" ) return internet ?? 1995;
  const own = REGION_LINES[region];
  if ( !own || !(how in own) ) return -Infinity;
  return own[how];
}
const lineOpen = (how, region, year, opts) => { const y = lineYear(how, region, opts); return y !== null && Number(year) >= y; };

/** The carriers open in a year. future: the World of Future Darkness branch is on. region: where it is sent from. */
export function carriersFor(year, {future = false, region = null, internet = null} = {}) {
  const y = Number(year) || 0;
  // A land with its own year for a way (REGION_LINES, the internet) uses that year in place of the carrier's own
  const own = id => region && (id === "email" || (REGION_LINES[region] && id in REGION_LINES[region]));
  return Object.entries(CARRIERS)
    .filter(([id, c]) => (!y || ((own(id) || y >= c.from) && y <= c.to)) && (!c.future || future) && (y || c.from === 0))
    .filter(([id]) => !y || lineOpen(id, region, y, {internet}))
    .map(([id, c]) => ({id, label: c.label}));
}

/** When a letter arrives. Returns {ok, why, seconds}. */
export function plan(how, reach, year, {future = false, region = null, internet = null} = {}) {
  const c = CARRIERS[how];
  if ( !c ) return {ok: false, why: "No such way to send it.", seconds: 0};
  if ( !carriersFor(year, {future, region, internet}).some(x => x.id === how) ) return {ok: false, why: `${c.label} cannot be had${region ? " there" : ""} in ${year}.`, seconds: 0};
  const r = REACH[reach] ? reach : "near";
  const s = c.time(r, Number(year) || 0);
  if ( s === null ) return {ok: false, why: `${c.label} cannot reach that far in ${year}.`, seconds: 0};
  return {ok: true, why: "", seconds: s};
}

const relayOf = (a, b, year) => RELAYS.find(r => r.regions.includes(a) && r.regions.includes(b) && year >= r.from && year <= r.to) ?? null;

/**
 * Storyteller 0.59.0 (B2700): a letter from one part of the world to another, on the world map's journey for the
 * year. how: carrier id; from, to: world region ids; year; j: the world map's journey(from's middle, to's middle,
 * {year, known}); internet: {from, to} years the internet reached each end (WoDX Chronicle's REGION_MEDIA).
 * Same part of the world: plan() with reach (near or region). Returns {ok, why, seconds, days, words: [lines]}.
 */
export function worldPlan(how, {from, to, year, j = null, reach = "region", future = false, internet = {}} = {}) {
  const c = CARRIERS[how], y = Number(year) || 0;
  if ( !c ) return {ok: false, why: "No such way to send it.", seconds: 0, words: []};
  if ( !from || !to || from === to ) {
    const p = plan(how, reach === "far" ? "region" : reach, y, {future, region: from, internet: internet.from ?? null});
    return {...p, days: p.seconds / D, words: []};
  }
  if ( !carriersFor(y, {future, region: from, internet: internet.from ?? null}).some(x => x.id === how) ) return {ok: false, why: `${c.label} cannot be had there in ${y}.`, seconds: 0, words: []};
  if ( !lineOpen(how, to, y, {internet: internet.to ?? null}) ) return {ok: false, why: `${c.label} cannot reach that land in ${y}: it has none yet.`, seconds: 0, words: []};
  const cross = massOf(from) !== massOf(to) ? crossing(from, to) : null;
  if ( how === "telegraph" ) {
    if ( cross && y < cross.cable ) return {ok: false, why: `No telegraph line crosses the sea to that land before ${cross.cable}.`, seconds: 0, words: []};
    const s = cross ? (y >= 1900 ? 3 * H : 6 * H) : (y >= 1900 ? 2 * H : 4 * H);
    return {ok: true, why: "", seconds: s, days: s / D, words: [cross ? "By cable under the sea, then a boy from the office." : "Down the wires from office to office, then a boy from the office."]};
  }
  if ( how === "telephone" ) {
    const need = cross ? cross.call : LONG_CALLS;
    if ( y < need ) return {ok: false, why: `No telephone call reaches that far before ${need}.`, seconds: 0, words: []};
    return {ok: true, why: "", seconds: 0, days: 0, words: [cross ? "Booked with the operator, by wireless or cable over the sea." : "By the long-distance lines."]};
  }
  if ( how === "email" || how === "net" ) return {ok: true, why: "", seconds: c.time(), days: c.time() / D, words: []};
  if ( !j || j.unknown || j.noWay || !j.surface ) return {ok: false, why: j?.unknown ? `In ${y} no one at home knows the way to that land.` : `In ${y} no known way leads there.`, seconds: 0, words: []};
  const words = [];
  let days;
  if ( how === "messenger" ) {
    const relay = relayOf(from, to, y);
    days = j.surface.legs.reduce((t, l) => t + l.days * (l.way === "land" ? (relay?.pace ?? RIDER_PACE) : 1), 0);
    if ( j.air && j.air.days < days ) { days = j.air.days; words.push(`A courier ${j.air.words}.`); }
    else if ( relay ) words.push(`Along ${relay.label}.`);
    else words.push(j.surface.legs.some(l => l.way === "sea" && l.km >= 50) ? "Riders on land, the first ship out by sea." : "Riders with fresh horses where they can be had.");
  } else if ( how === "traveller" ) {
    days = j.surface.days + TRAVELLER_WAIT;
    words.push("With merchants, pilgrims or soldiers going that way, at their pace.");
  } else {
    const air = j.best === "air" && j.air;
    days = (air ? j.air.days : j.surface.days) + POST_WAIT(y);
    words.push(air ? "By air mail." : j.surface.legs.some(l => l.way === "rail") ? "By mail train and mail ship." : "In the mail bags, by post road and ship.");
  }
  days = Math.max(1, Math.round(days * 10) / 10);
  return {ok: true, why: "", seconds: Math.round(days * D), days, words};
}

/** The house chance in a hundred that a letter goes astray: the carrier's for a week, more the longer it is on the way. */
export function lostChance(how, seconds) {
  const c = CARRIERS[how];
  if ( !c?.lost ) return 0;
  const weeks = Math.max(0, Number(seconds) || 0) / (7 * D);
  return Math.min(40, Math.round(c.lost * Math.max(0.5, Math.sqrt(weeks || 0.25))));
}

/** Every way of sending between two parts of the world in a year, for the world map and the Storyteller. */
export function letterTimes(opts = {}) {
  return Object.keys(CARRIERS).map(id => ({id, label: CARRIERS[id].label, ...worldPlan(id, opts)})).filter(p => p.ok);
}

/** Time on the way, in words. */
export function wayWords(seconds) {
  const s = Number(seconds) || 0;
  if ( s <= 60 ) return "at once";
  if ( s < H ) return "within the hour";
  if ( s < D ) return `in about ${Math.round(s / H)} hour${Math.round(s / H) === 1 ? "" : "s"}`;
  const d = Math.round(s / D);
  return `in about ${d} day${d === 1 ? "" : "s"}`;
}

const str = (v, max = 200) => String(v ?? "").slice(0, max);

/** Clean a letter for storage. */
export function normLetter(l = {}) {
  return {id: str(l.id, 40), from: str(l.from, 40), fromName: str(l.fromName, 120), to: str(l.to, 40), toName: str(l.toName, 120),
    how: CARRIERS[l.how] ? l.how : "messenger", reach: REACH[l.reach] ? l.reach : "near", text: str(l.text, 4000),
    sentAt: Number(l.sentAt) || 0, dueAt: Number(l.dueAt) || 0, sentLabel: str(l.sentLabel, 120),
    state: ["way", "held", "done"].includes(l.state) ? l.state : "way",
    fromRegion: str(l.fromRegion, 40), toRegion: str(l.toRegion, 40), readBy: str(l.readBy, 120), late: Math.max(0, Number(l.late) || 0),
    answers: str(l.answers, 40), toUser: str(l.toUser, 40), lost: Math.max(0, Math.min(100, Number(l.lost) || 0))};
}
export const normLetters = list => (Array.isArray(list) ? list : []).map(normLetter).filter(l => l.id);

/** Letters due by a time, still on the way. */
export const due = (list, now) => normLetters(list).filter(l => l.state === "way" && l.dueAt <= (Number(now) || 0));
/** Letters still on the way or held, soonest first, for the Storyteller's list. */
export const inTransit = list => normLetters(list).filter(l => l.state !== "done").sort((a, b) => a.dueAt - b.dueAt);
/** Put a letter back by some days (answered late, a storm, a lame horse). */
export const delay = (l, days) => ({...l, dueAt: l.dueAt + Math.max(0, Number(days) || 0) * D, late: l.late + Math.max(0, Number(days) || 0)});

/** Drop delivered letters older than a year of world time, so the setting stays small. */
export const prune = (list, now) => normLetters(list).filter(l => l.state !== "done" || (Number(now) || 0) - l.dueAt < 365 * D);
