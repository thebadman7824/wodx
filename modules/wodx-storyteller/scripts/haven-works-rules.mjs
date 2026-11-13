/**
 * Haven works (B3359-B3363): upgrades, staff, traces and rival probes. Pure, no Foundry.
 *
 * A haven (haven-rules.mjs) gains three lists:
 *   upgrades  works put in, [{key, at}]. Each upgrade on the list below has a year span, a way of life where it is
 *             built that way, the successes its project needs, the security it adds, what it gives, and its traces.
 *   staff     the people who keep it, [{post, name, id, loyal}] (loyal 0-5, from the follower's loyalty or the
 *             Storyteller's word).
 *   traces    what the works left behind, [{key, at, w}]: builders who talk, deliveries seen. They fade by half a
 *             year at a time. Staff and some works leave standing traces while they last (servants can be bought, a
 *             ward glows to Awakened sight, a camera feed can be reached).
 * Every month a rival with a grudge (WoDX NPC memory) may probe: the chance grows with the traces and falls with the
 * haven's security. The probe fits the traces and the rival: scout, bribe a servant, read a ward, reach the feed, or
 * set a fire where the rival already knows the way. Every probe is the Storyteller's to approve (B3362).
 * The books give Domain, Chantry, Sanctum, caern and Holdings ratings (V20 pdf 121, M20 pdf 302 and 325, W20 pdf
 * 250-255, C20 pdf 172); prices, traces and odds here are house figures.
 */

export const DAY = 86400, MONTH = 30 * DAY, YEAR = 365 * DAY;
/** A trace left by the works fades by half every this long. */
export const TRACE_HALF = YEAR / 2;
/** Months between probes by one rival on one haven. */
export const PROBE_COOLDOWN = 3 * MONTH;

/** What a trace is, in words for the Storyteller. standing: it lasts while its cause does. */
export const TRACES = {
  builders: {label: "Builders talk", standing: false},
  deliveries: {label: "Deliveries were seen", standing: false},
  neighbours: {label: "Neighbours notice", standing: false},
  installers: {label: "The installer keeps records", standing: false},
  servants: {label: "Servants can be bought", standing: true},
  ward: {label: "A ward glows to Awakened sight", standing: true},
  spirit: {label: "Spirits gossip about the watcher", standing: true},
  data: {label: "The feed can be reached from outside", standing: true},
  dogs: {label: "The dogs bark at all hours", standing: true}
};

const COURTYARD = ["islamic", "indic", "sinic", "swahili", "sahel"];

/**
 * The upgrades. from/to: years (null: always). ways: the ways of life (world-rules spheres) where it is built so
 * (null: everywhere). goal: successes for its project. sec: security dots it adds (up to the cap). traces: what it
 * leaves; standing traces stay while it does. needs: the owner's kind of being (mage, werewolf) or null. show: it is
 * furnished for show.
 */
export const UPGRADES = [
  {key: "door", name: "An iron-bound door and a stout bar", to: 1850, goal: 4, sec: 1, traces: ["builders"], gives: "A door that holds against a shoulder and an axe for a while."},
  {key: "hidden", name: "A hidden stair or a priest's hole", goal: 6, sec: 1, traces: ["builders"], gives: "A way out, or a place to hide, that a search can miss."},
  {key: "cellar", name: "A cellar with no window, sealed from the day", goal: 5, sec: 0, traces: ["builders", "deliveries"], gives: "A dark place to sleep through the day."},
  {key: "shutters", name: "Heavy shutters on every window", from: 1300, to: 1950, goal: 3, sec: 0, traces: ["builders"], gives: "No light in, no eyes in."},
  {key: "wall", name: "A wall around the yard, with a gate", goal: 8, sec: 1, traces: ["builders", "deliveries"], gives: "Nobody reaches the door unseen."},
  {key: "courtyard", name: "Rooms turned inward on a closed courtyard", ways: COURTYARD, goal: 8, sec: 1, traces: ["builders"], gives: "Blank walls to the street; life goes on inside, unseen."},
  {key: "dogs", name: "Guard dogs", goal: 3, sec: 1, traces: ["dogs"], gives: "Someone always hears a stranger."},
  {key: "bars", name: "Bars on the low windows", from: 1650, goal: 3, sec: 1, traces: ["builders"], gives: "The windows can't be climbed through."},
  {key: "lock", name: "A lock of the better sort", from: 1784, goal: 3, sec: 1, traces: ["installers"], gives: "A lock that takes a skilled hand to pick."},
  {key: "strongroom", name: "A strongroom with a safe", from: 1835, goal: 6, sec: 1, traces: ["installers", "deliveries"], gives: "What matters most is behind iron."},
  {key: "alarm", name: "A bell alarm wired to the doors", from: 1858, goal: 4, sec: 1, traces: ["installers"], gives: "A door forced rings a bell."},
  {key: "steel", name: "Steel shutters that close at dawn", from: 1950, goal: 5, sec: 1, traces: ["installers"], gives: "Day can't reach the rooms, and nobody can force them."},
  {key: "cameras", name: "Cameras at the doors", from: 1975, goal: 4, sec: 1, traces: ["installers"], gives: "Whoever comes is seen and kept on tape."},
  {key: "monitored", name: "An alarm watched by a security firm", from: 1975, goal: 4, sec: 1, traces: ["installers", "data"], gives: "A forced door brings guards, and the police behind them."},
  {key: "networked", name: "Networked locks and cameras", from: 2005, goal: 5, sec: 1, traces: ["installers", "data"], gives: "Doors and cameras answered from a phone anywhere."},
  {key: "ward", name: "A ward on the threshold", needs: "mage", goal: 6, sec: 1, traces: ["ward"], gives: "A working that warns of, or turns, whoever crosses uninvited."},
  {key: "watcher", name: "A spirit bound to watch the bounds", needs: "werewolf", goal: 6, sec: 1, traces: ["spirit"], gives: "A spirit that tells the pack who came."},
  // Furnished for show: one by era (B3360)
  {key: "show-hall", name: "A hall hung with hangings, fit for guests", to: 1599, goal: 6, sec: 0, show: true, traces: ["deliveries"], gives: "Guests see wealth and taste."},
  {key: "show-salon", name: "A salon furnished in the fashion", from: 1600, to: 1899, goal: 6, sec: 0, show: true, traces: ["deliveries"], gives: "Guests see wealth and taste."},
  {key: "show-room", name: "Rooms done by a designer", from: 1900, goal: 6, sec: 0, show: true, traces: ["deliveries"], gives: "Guests see wealth and taste."}
];

/** Staff posts (B3361), by year. Every post leaves a standing trace: people can be bought. */
export const POSTS = [
  {key: "porter", name: "Doorkeeper or porter", to: 1950},
  {key: "servant", name: "Servant or housekeeper"},
  {key: "guard", name: "Guard or watchman", sec: 1},
  {key: "groom", name: "Groom or stable hand", to: 1920},
  {key: "driver", name: "Driver", from: 1900},
  {key: "security", name: "A guard from a security firm", from: 1950, sec: 1}
];

const fits = (row, year) => !year || ((row.from == null || year >= row.from) && (row.to == null || year <= row.to));
const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** The kind of being an actor type names, for upgrades that need one. */
export const beingOf = type => {
  const t = String(type ?? "").toLowerCase();
  if ( /mage|sorcer/.test(t) ) return "mage";
  if ( /werewolf|changing|garou/.test(t) ) return "werewolf";
  return t;
};

/** The upgrades open to a haven in a year, way of life and to its owners' kinds of being. */
export function upgradesFor({year = 0, way = "", beings = [], have = []} = {}) {
  const got = new Set(have);
  const kinds = new Set(beings.map(beingOf));
  return UPGRADES.filter(u => fits(u, year) && (!u.ways || !way || u.ways.includes(way)) && (!u.needs || kinds.has(u.needs)) && !got.has(u.key));
}
export const postsFor = year => POSTS.filter(p => fits(p, year));
export const upgrade = key => UPGRADES.find(u => u.key === key) ?? null;

export function normWorks(h = {}) {
  return {
    upgrades: (Array.isArray(h.upgrades) ? h.upgrades : []).map(u => ({key: String(u?.key ?? ""), at: n(u?.at)})).filter(u => upgrade(u.key)).slice(0, 40),
    staff: (Array.isArray(h.staff) ? h.staff : []).map(s => ({post: String(s?.post ?? ""), name: String(s?.name ?? "").slice(0, 80), id: String(s?.id ?? "").slice(0, 40), loyal: Math.max(0, Math.min(5, Math.round(n(s?.loyal ?? 3))))})).filter(s => POSTS.some(p => p.key === s.post)).slice(0, 20),
    traces: (Array.isArray(h.traces) ? h.traces : []).map(t => ({key: String(t?.key ?? ""), at: n(t?.at), w: Math.max(0, Math.min(5, n(t?.w ?? 1)))})).filter(t => TRACES[t.key]).slice(-40),
    probed: h.probed && typeof h.probed === "object" ? Object.fromEntries(Object.entries(h.probed).map(([k, v]) => [String(k), n(v)]).slice(0, 60)) : {}
  };
}

/** Put in an upgrade: returns the works with it added and its passing traces left. */
export function install(works, key, at) {
  const w = normWorks(works);
  const u = upgrade(key);
  if ( !u || w.upgrades.some(x => x.key === key) ) return w;
  w.upgrades.push({key, at: n(at)});
  for ( const t of u.traces ?? [] ) if ( !TRACES[t].standing ) w.traces.push({key: t, at: n(at), w: 1});
  return w;
}

/** The security the works add: one a dot-giving upgrade or post, up to five. */
export const securityFrom = works => {
  const w = normWorks(works);
  return Math.min(5, w.upgrades.reduce((s, x) => s + n(upgrade(x.key)?.sec), 0) + w.staff.reduce((s, x) => s + n(POSTS.find(p => p.key === x.post)?.sec), 0));
};

/**
 * The traces now: [{key, label, w}], the passing ones faded and the standing ones from staff and works. w sums the
 * weight of each key (two talking builders count twice).
 */
export function tracesNow(works, now) {
  const w = normWorks(works);
  const sum = new Map();
  const add = (k, v) => { if ( v > 0.05 ) sum.set(k, (sum.get(k) ?? 0) + v); };
  for ( const t of w.traces ) add(t.key, t.w * Math.pow(0.5, Math.max(0, now - t.at) / TRACE_HALF));
  for ( const u of w.upgrades ) for ( const k of upgrade(u.key)?.traces ?? [] ) if ( TRACES[k].standing ) add(k, 1);
  // Loyal staff are harder to buy: each counts for less the more loyal they are
  for ( const s of w.staff ) add("servants", Math.max(0.2, 1 - s.loyal * 0.15));
  return [...sum.entries()].map(([key, v]) => ({key, label: TRACES[key].label, w: Math.round(v * 100) / 100}));
}

/** The chance a rival probes this month: 4 in 100 a point of trace, down a tenth a dot of security, at most 1 in 2. */
export function probeChance(traces, security = 0) {
  const W = (traces ?? []).reduce((s, t) => s + n(t.w), 0);
  return Math.max(0, Math.min(0.5, 0.04 * W) * (1 - 0.1 * Math.max(0, Math.min(5, n(security)))));
}

/** The probes (B3362), each needing a trace (or the rival knowing the way already). */
export const PROBES = [
  {key: "fire", label: "Sets a fire", needs: null, knows: true, violent: true},
  {key: "ward", label: "Reads the ward and follows it home", needs: "ward", awakened: true},
  {key: "hack", label: "Reaches the camera feed or the alarm firm's records", needs: "data", from: 1990},
  {key: "bribe", label: "Buys a word from a servant", needs: "servants"},
  {key: "spirit", label: "Asks the spirits who watch the place", needs: "spirit", umbra: true},
  {key: "scout", label: "Follows the talk of the works to the door", needs: ["builders", "deliveries", "neighbours", "installers", "dogs"]}
];

/**
 * Which probe a rival makes, or null. traces: tracesNow; rival: {violent, awakened, umbra, knows}; year.
 * A rival who knows already only probes to do harm.
 */
export function pickProbe(traces, rival = {}, year = 0) {
  const have = new Set((traces ?? []).filter(t => t.w > 0.05).map(t => t.key));
  for ( const p of PROBES ) {
    if ( p.knows && !(rival.knows && rival.violent) ) continue;
    if ( !p.knows && rival.knows ) continue;
    if ( p.awakened && !rival.awakened ) continue;
    if ( p.umbra && !rival.umbra ) continue;
    if ( p.from && year && year < p.from ) continue;
    const needs = p.needs === null ? [] : [].concat(p.needs);
    if ( needs.length && !needs.some(k => have.has(k)) ) continue;
    return p;
  }
  return null;
}

/** One month for one rival and one haven: {probe, chance} or null. */
export function probeMonth({works, security = 0, rival = {}, now = 0, year = 0, rand = Math.random} = {}) {
  const w = normWorks(works);
  if ( rival.id && Object.hasOwn(w.probed, rival.id) && now - w.probed[rival.id] < PROBE_COOLDOWN ) return null;
  const tr = tracesNow(w, now);
  const p = pickProbe(tr, rival, year);
  if ( !p ) return null;
  const chance = p.knows ? 0.1 : probeChance(tr, security);
  if ( !(rand() < chance) ) return null;
  return {probe: p, chance};
}
