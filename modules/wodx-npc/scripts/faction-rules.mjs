/**
 * WoDX NPC 0.3 (Phase 7d): the pure rules of factions, faction turns, hunting grounds and Masquerade breaches. No
 * Foundry calls, so the harness can test them; factions.mjs reads the world and hands the results here.
 *
 * Book basis (mechanics in WoDX's own words; printed pages):
 *   Herd adds a die per dot to hunting rolls; Domain and Fame lower the hunting difficulty by one a dot, to no less
 *   than 3; Domain dots may go to security, each adding 1 to the difficulty of intruding (V20 pp. 113, 114, 259-260;
 *   V20 Dark Ages pp. 180-181, 334).
 *   The hunting difficulty by area: V20 p. 260 (slum 4 to heavily patrolled 8); V20 Dark Ages p. 334 (slums 4,
 *   lower-class 5, market 6, merchant-class 7, heavily patrolled 8).
 *   Influence may stand in for an Ability on a roll to sway the mortal world (V20 p. 115).
 * The books give no rules for a faction acting on its own, for rumours spreading or for faction standing. Those parts
 * are WoDX readings, kept as small and plain as the books' own systems (B98 to B102).
 *
 * The world's state is one object: {v, factions: [Faction], breaches: [Breach], lastTurn, turns, log}.
 */

import {normPolitics, applyPolitics, POL_OPS, politicsBig, describePolitics, polityFor, innerTurn, POLITIES} from "./politics-rules.mjs";

export const STATE_VERSION = 1;
export const MAX_DOTS = 5;
export const STANDING = {min: -3, max: 3};
/** Every faction may act once per this many days of world time (B99). */
export const TURN_DAYS = 7;
/** A long skip runs at most this many turns; the rest are counted as quiet years (B99). */
export const TURN_CAP = 12;

export const KINDS = {
  kindred: "Kindred (a court, a coterie, a cult of the Blood)", mortal: "Mortal power (a council, a lord, a family)",
  church: "The Church or a religious order", guild: "A guild or a trade", folk: "Village folk or the commons",
  hunters: "Hunters", garou: "Garou or Kinfolk", mages: "Mages", fae: "Fae", spirits: "Spirits or the dead",
  mercenaries: "Soldiers or mercenaries", other: "Other"
};
/** Faction kinds whose own existence is a secret the Masquerade (or its like) keeps. */
export const HIDDEN_KINDS = new Set(["kindred", "garou", "mages", "fae", "spirits"]);

/** The Backgrounds a faction holds, as dots 0 to 5. Influence is held per sphere. */
export const ASSETS = {
  herd: "Herd", resources: "Resources", status: "Status", retainers: "Retainers", contacts: "Contacts",
  domain: "Domain", security: "Domain security", influence: "Influence"
};

/**
 * Spheres of Influence. The books rate Influence as one Trait (V20 p. 115; V20 Dark Ages p. 181). Holding it per
 * sphere, so a rival can contest one part of it, is a WoDX reading (B100). The Dark Ages list follows the powers of a
 * medieval town; the later list is the usual one for a modern city.
 */
export const SPHERES = {
  roads: {church: "The Church", crown: "Crown, court and law", guild: "Guilds and trade", military: "Garrisons and men-at-arms",
    folk: "Villages and the commons", underworld: "The underworld"},
  modern: {bureaucracy: "Bureaucracy", church: "Church", finance: "Finance", health: "Health", society: "High society", industry: "Industry",
    legal: "Legal", media: "Media", occult: "Occult", police: "Police", political: "Political", street: "Street", transport: "Transportation",
    underworld: "Underworld", university: "University"}
};
/**
 * NPC 0.17.0: the spheres by period, so a faction's sway follows the age from 1197 to the Future Darkness. The keys
 * carry over where a power lasts (the Church is "church" in every age), so dots held in one age keep their meaning in
 * the next. The periods and the sphere names between the Dark Ages and the modern list are a house rule (B830).
 */
SPHERES.early = {church: "The Church", crown: "Crown, court and law", guild: "Guilds, banks and trade", military: "Armies and garrisons",
  folk: "Villages and the commons", underworld: "The underworld", university: "Universities and learned societies", occult: "Occult"};
SPHERES.industrial = {bureaucracy: "Bureaucracy", church: "Church", finance: "Banks and finance", health: "Health", society: "High society",
  industry: "Mills, mines and industry", legal: "Legal", media: "The press", occult: "Occult", police: "Police", political: "Political",
  street: "Street", transport: "Railways and shipping", underworld: "Underworld", university: "University"};
SPHERES.future = {...SPHERES.modern, media: "Media and the networks", net: "The Net and data", transport: "Transport and the orbital lines"};
/** The periods, by the last year each covers (B830). */
export const PERIODS = [["medieval", 1450, "roads"], ["early", 1799, "early"], ["industrial", 1913, "industrial"], ["modern", 2022, "modern"], ["future", Infinity, "future"]];
export const periodOf = year => (PERIODS.find(([, last]) => Number(year) <= last) ?? PERIODS[PERIODS.length - 1])[0];
/** The spheres for an era: by the year where it is known, else by the era's morality (Roads: the Dark Ages list). */
export function spheresFor(morality, year) {
  if ( Number.isFinite(Number(year)) && year !== null && year !== "" ) return SPHERES[(PERIODS.find(([, last]) => Number(year) <= last) ?? PERIODS[4])[2]];
  return morality === "roads" ? SPHERES.roads : SPHERES.modern;
}
/** Every sphere name of every age, for a faction that holds sway from another age. */
export const sphereName = k => SPHERES.future[k] ?? SPHERES.industrial[k] ?? SPHERES.early[k] ?? SPHERES.roads[k] ?? SPHERES.modern[k] ?? k;
/** What each kind of faction is called in each period; the keys stay the same (B830). */
const KIND_WORDS = {
  early: {mortal: "Mortal power (a council, a prince, a family)", guild: "A guild, a bank or a trading house", mercenaries: "Soldiers, a regiment or mercenaries"},
  industrial: {mortal: "Mortal power (a council, a ministry, a family)", guild: "A union, a company or a trade", folk: "The townsfolk or the working poor", mercenaries: "Soldiers, police or a militia"},
  modern: {mortal: "Mortal power (a council, a government office, a family)", guild: "A company, a corporation or a union", folk: "The neighbourhood or the street", church: "A church or a religious order", mercenaries: "Soldiers, police or private security"},
  future: {mortal: "Mortal power (a council, a government office, a family)", guild: "A corporation or a union", folk: "The neighbourhood or the street", church: "A church or a religious order", mercenaries: "Soldiers, police or private security"}
};
export const kindsFor = year => ({...KINDS, ...(KIND_WORDS[periodOf(year ?? 1197)] ?? {})});

/** Hunting areas and their difficulty (V20 p. 260; V20 Dark Ages p. 334). */
export const AREAS = {
  roads: {slums: ["Slums or the Circus", 4], lower: ["Lower-class neighbourhood", 5], market: ["Market district", 6],
    merchant: ["Merchant-class neighbourhood", 7], patrolled: ["Heavily patrolled area", 8]},
  modern: {slums: ["Slum neighbourhood or the Rack", 4], lower: ["Lower-income or bohemian", 5], market: ["Downtown business district", 6],
    warehouse: ["Warehouse district", 6], merchant: ["Suburb", 7], patrolled: ["Heavily patrolled area", 8]}
};
export const areasFor = morality => (morality === "roads" ? AREAS.roads : AREAS.modern);
/** A first guess at a place's area from its 7c kind; the Storyteller sets the real one (WoDX reading). */
export const AREA_GUESS = {tavern: "lower", street: "lower", market: "market", workplace: "market", home: "merchant", church: "merchant",
  gate: "patrolled", castle: "patrolled", haven: "lower", wilds: "market", caern: "market", other: "market"};
/**
 * The kind of place a scene's name suggests, for a scene no one has tagged in 7c (WoDX reading). The first match wins,
 * so "Kranzfels · Outer Bailey" is a gate before it is a castle.
 */
const NAME_KINDS = [
  ["tavern", /\b(tavern|inn|alehouse|taproom|brothel)\b/i], ["market", /\b(market|square|fair|plaza)\b/i],
  ["church", /\b(church|chapel|cloister|abbey|priory|monastery|convent|shrine|cathedral|parish|churchyard|graveyard)\b/i],
  ["gate", /\b(gate|gatehouse|watch|barracks|bailey|wall|tower)\b/i], ["castle", /\b(castle|keep|hall|ward|court|palace|kranzfels)\b/i],
  ["workplace", /\b(mill|forge|smithy|workshop|guild|mine|adit|quarry|tannery|brewery|bakery|shop|warehouse|dock|wharf)\b/i],
  ["street", /\b(street|lane|road|bridge|alley|crossroads?)\b/i], ["haven", /\b(haven|crypt|tomb|catacombs?|undercroft|cellar)\b/i],
  ["caern", /\b(caern|standing stones?|barrow)\b/i], ["wilds", /\b(wood|woods|forest|field|fields|marsh|river|lake|hill|valley|glade|moor|cave)\b/i],
  ["home", /\b(house|home|cottage|farm|village|hamlet|manor|homestead)\b/i]
];
export function kindFromName(name) {
  for ( const [k, rx] of NAME_KINDS ) if ( rx.test(String(name ?? "")) ) return k;
  return "other";
}
/** Scenes that are maps for a fight, not places in the world. */
export const NOT_A_PLACE = /battle ?map|\bcombat\b|\btest\b|\(gate/i;
export function areaOf(place, morality) {
  const table = areasFor(morality);
  const key = place?.area && table[place.area] ? place.area : (AREA_GUESS[place?.kind] ?? "market");
  return {key, label: table[key]?.[0] ?? key, difficulty: table[key]?.[1] ?? 6};
}

/* ------------------------------------------------------------------ */
/*  Records                                                            */
/* ------------------------------------------------------------------ */

const dot = v => Math.max(0, Math.min(MAX_DOTS, Math.round(Number(v) || 0)));
const uniq = list => [...new Set((list ?? []).filter(Boolean))];

export function blankState() { return {v: STATE_VERSION, factions: [], breaches: [], lastTurn: null, turns: 0, log: []}; }

/** A faction with every field present and every number in range. */
export function normFaction(f = {}) {
  const a = f.assets ?? {};
  const influence = {};
  for ( const [k, v] of Object.entries(a.influence ?? {}) ) if ( dot(v) ) influence[k] = dot(v);
  const standing = {};
  for ( const [k, v] of Object.entries(f.standing ?? {}) ) {
    const n = Math.max(STANDING.min, Math.min(STANDING.max, Math.round(Number(v) || 0)));
    if ( n && k !== f.id ) standing[k] = n;
  }
  const domain = dot(a.domain), security = Math.min(dot(a.security), MAX_DOTS - domain);
  return {
    id: String(f.id ?? ""), name: String(f.name ?? "A faction").slice(0, 120), kind: KINDS[f.kind] ? f.kind : "other",
    ruler: !!f.ruler, secret: f.secret === undefined ? HIDDEN_KINDS.has(f.kind) : !!f.secret, dormant: !!f.dormant,
    leader: f.leader || null, members: uniq(f.members), places: uniq(f.places),
    goals: (f.goals ?? []).filter(g => MOVES[g?.move]).map(g => ({move: g.move, sphere: g.sphere || null, target: g.target || null, place: g.place || null, note: String(g.note ?? "").slice(0, 200)})),
    assets: {herd: dot(a.herd), resources: dot(a.resources), status: dot(a.status), retainers: dot(a.retainers), contacts: dot(a.contacts), domain, security, influence},
    standing, people: normPeople(f.people), guard: Number(f.guard) || 0, notes: String(f.notes ?? "").slice(0, 2000),
    // NPC 0.17.0: who runs it, when it began and ended, and what it came from
    owners: uniq(f.owners), run: f.run === "orders" ? "orders" : "auto", orders: normOrders(f.orders),
    founded: yearOrNull(f.founded), ended: yearOrNull(f.ended), dormantBy: ["year", "event", "ended"].includes(f.dormantBy) ? f.dormantBy : null,
    risesOn: f.risesOn ? String(f.risesOn).slice(0, 60) : null, endsOn: f.endsOn ? String(f.endsOn).slice(0, 60) : null,
    fromEvent: f.fromEvent ? String(f.fromEvent).slice(0, 60) : null, parent: f.parent ? String(f.parent) : null, absorbedBy: f.absorbedBy ? String(f.absorbedBy) : null,
    // NPC 0.25.0: politics inside the faction (politics-rules.mjs)
    polity: f.polity === "none" || POLITIES[f.polity] ? f.polity : "", politics: normPolitics(f.politics)
  };
}
const yearOrNull = v => (v === null || v === undefined || String(v).trim() === "" || !Number.isFinite(Number(v)) ? null : Math.round(Number(v)));
/** A player-run faction's orders for its next turn: one of the six moves, with its aim. */
export function normOrders(o) {
  if ( !o || !MOVES[o.move] ) return null;
  return {move: o.move, target: o.target || null, sphere: o.sphere || null, place: o.place || null, by: o.by ? String(o.by).slice(0, 60) : null};
}

/* ------------------------------------------------------------------ */
/*  A character's standing with a faction (NPC 0.9.0)                  */
/* ------------------------------------------------------------------ */

/**
 * How a faction regards one character, -3 to +3, with a word for each step. The books have no such track; the
 * Status Background stays as each line's book defines it. These are house rules (PENDING-REVIEW).
 */
export const PEOPLE_STEPS = {"-3": "Hunted", "-2": "Hostile", "-1": "Distrusted", "0": "Unknown", "1": "Tolerated", "2": "Welcome", "3": "Honoured"};
export const peopleWord = n => PEOPLE_STEPS[String(Math.max(STANDING.min, Math.min(STANDING.max, Math.round(Number(n) || 0))))];
/** A word or a number to a step: "welcome" => 2. Returns null when it is neither. */
export function peopleStep(v) {
  const n = Number(v);
  if ( String(v ?? "").trim() !== "" && Number.isFinite(n) ) return Math.max(STANDING.min, Math.min(STANDING.max, Math.round(n)));
  const hit = Object.entries(PEOPLE_STEPS).find(([, w]) => w.toLowerCase() === String(v ?? "").trim().toLowerCase());
  return hit ? Number(hit[0]) : null;
}
export function normPeople(p = {}) {
  const out = {};
  for ( const [k, v] of Object.entries(p ?? {}) ) { const n = peopleStep(v); if ( n ) out[String(k).slice(0, 40)] = n; }
  return out;
}
/** A character's standing with every faction: {faction name and key, lower case: step}. */
export function peopleStandingOf(state, actorId) {
  const out = {};
  for ( const f of state?.factions ?? [] ) {
    const n = f.people?.[actorId] ?? 0;
    out[String(f.name).toLowerCase()] = n;
    if ( f.key ) out[String(f.key).toLowerCase()] = n;
    out[String(f.id).toLowerCase()] = n;
  }
  return out;
}
/**
 * NPC 0.16.0, standing that spills over (house rule, B841): when a faction's regard for a character moves, the
 * factions bound to it hear of it. A faction that holds this one as a close friend (standing +2 or more) moves the
 * same way by one step; one that holds it as an enemy (standing -2 or less) moves the other way by one step. Factions
 * at +1, 0 or -1 toward it don't care. Dormant factions and the faction itself are left out. Returns changes
 * [{op: "people", faction, actor, delta, why}] for the approval queue; empty when nothing would move.
 */
export const SPILL_AT = 2;
export function spillFrom(state, factionId, actorId, delta) {
  const d = Math.sign(Number(delta) || 0);
  if ( !d || !actorId ) return [];
  const src = (state?.factions ?? []).find(f => f.id === factionId);
  if ( !src ) return [];
  const out = [];
  for ( const o of state.factions ) {
    if ( o.id === src.id || o.dormant ) continue;
    const s = standingOf(o, src.id);
    const step = s >= SPILL_AT ? d : s <= -SPILL_AT ? -d : 0;
    if ( !step ) continue;
    const was = o.people?.[actorId] ?? 0, to = Math.max(STANDING.min, Math.min(STANDING.max, was + step));
    if ( to === was ) continue;
    out.push({op: "people", faction: o.id, actor: actorId, delta: step, why: s >= SPILL_AT ? "friend" : "enemy"});
  }
  return out;
}

/** Find a faction by id, key or name (whole name first, then a part of it). */
export function findFaction(state, ref) {
  const r = String(ref ?? "").trim().toLowerCase();
  if ( !r ) return null;
  const fs = state?.factions ?? [];
  return fs.find(f => f.id.toLowerCase() === r || String(f.key ?? "").toLowerCase() === r || f.name.toLowerCase() === r)
    ?? fs.find(f => f.name.toLowerCase().includes(r)) ?? fs.find(f => f.name.toLowerCase().includes(r.replace(/^the\s+/, ""))) ?? null;
}
export function normState(s) {
  const out = {...blankState(), ...(s ?? {})};
  out.factions = (out.factions ?? []).map(normFaction);
  out.breaches = (out.breaches ?? []).map(normBreach);
  out.log = (out.log ?? []).slice(0, 200);
  out.wrongs = (Array.isArray(out.wrongs) ? out.wrongs : []).filter(w => w && w.faction).map(normWrong).slice(-100);
  return out;
}

/* ------------------------------------------------------------------ */
/*  Wrongs done on the map (0.5.0)                                     */
/* ------------------------------------------------------------------ */

/** What a player can do on the map that a faction holding the place takes as a wrong. Fixed list. */
export const WRONG_KINDS = {force: "a door forced", break: "something broken", theft: "a theft", fire: "a fire set", desecrate: "a holy place desecrated"};
export function normWrong(w = {}) {
  const str = (v, n = 160) => (v === undefined || v === null ? null : String(v).slice(0, n));
  return {id: str(w.id, 60), at: Number(w.at) || 0, faction: str(w.faction, 60), kind: WRONG_KINDS[w.kind] ? w.kind : "break", place: str(w.place), by: str(w.by, 80), what: str(w.what, 80)};
}
/** The wrongs done to a faction since a time. */
export const wrongsSince = (state, factionId, since = 0) => (state.wrongs ?? []).filter(w => w.faction === factionId && w.at >= since);
export const influenceTotal = f => Object.values(f.assets.influence ?? {}).reduce((a, b) => a + b, 0);
/** The faction's strongest sphere, or null. */
export function topSphere(f) {
  let best = null;
  for ( const [k, v] of Object.entries(f.assets.influence ?? {}) ) if ( v > 0 && (!best || v > f.assets.influence[best]) ) best = k;
  return best;
}
export const standingOf = (f, otherId) => f?.standing?.[otherId] ?? 0;
/** Rivals: factions this one stands at -1 or worse with, worst first. */
export const rivalsOf = (state, f) => state.factions.filter(o => o.id !== f.id && !o.dormant && standingOf(f, o.id) < 0)
  .sort((a, b) => standingOf(f, a.id) - standingOf(f, b.id) || a.name.localeCompare(b.name));
/** The faction that rules the domain (the Prince or voivode's court): the flagged one, else the Kindred faction with most Status. */
export function rulerOf(state) {
  const live = state.factions.filter(f => !f.dormant);
  return live.find(f => f.ruler) ?? live.filter(f => f.kind === "kindred").sort((a, b) => b.assets.status - a.assets.status || b.assets.domain - a.assets.domain)[0] ?? null;
}
export const holderOf = (state, placeId) => state.factions.find(f => f.places.includes(placeId)) ?? null;

/* ------------------------------------------------------------------ */
/*  Dice                                                               */
/* ------------------------------------------------------------------ */

/** n ten-sided dice from a random stream. */
export const rollDice = (rand, n) => Array.from({length: Math.max(0, n)}, () => 1 + Math.floor(rand() * 10));
/** Successes at a difficulty: each die at or above it, less one for each 1; a botch is no successes and a 1 (V20 p. 249). */
export function successes(dice, difficulty) {
  const diff = Math.max(2, Math.min(10, difficulty));
  const hits = dice.filter(d => d >= diff).length, ones = dice.filter(d => d === 1).length;
  const net = hits - ones;
  return {net: Math.max(0, net), botch: hits === 0 && ones > 0, hits, ones};
}

/* ------------------------------------------------------------------ */
/*  Moves                                                              */
/* ------------------------------------------------------------------ */

/**
 * The six moves of a faction turn. The pool is the leader's Attribute plus the faction's Background for the move (V20
 * p. 115 lets Influence stand in for an Ability); a faction with no leader rolls an Attribute of 2. Against a rival the
 * rival rolls its defence, and the mover needs more successes (as a contested Stealth roll, V20 Dark Ages p. 169).
 * Difficulty 6, plus 1 if the rival stands on guard. All of this is a WoDX reading (B98).
 */
export const MOVES = {
  expand: {label: "Expand", attr: "manipulation", bg: "influence", rival: false,
    hint: "Grow a sphere of Influence, or take a place a rival holds."},
  defend: {label: "Defend", attr: "wits", bg: "domain", rival: false,
    hint: "Stand on guard until the next turn: moves against the faction are harder."},
  scheme: {label: "Scheme", attr: "manipulation", bg: "influence", rival: true,
    hint: "Undermine a rival in the sphere where it is strongest."},
  recruit: {label: "Recruit", attr: "charisma", bg: "status", rival: false,
    hint: "Win followers: a dot of Herd (Kindred) or Retainers (everyone else)."},
  hunt: {label: "Hunt", attr: "perception", bg: "contacts", rival: true,
    hint: "Track down a rival's people: it loses Retainers or Herd. Hunters may find someone."},
  lielow: {label: "Lie low", attr: "wits", bg: "resources", rival: false,
    hint: "Keep out of sight: a rumour about the faction quietens."}
};
export const MOVE_LIST = Object.keys(MOVES);
export const DEFAULT_ATTR = 2;
const BASE_DIFF = 6;

const poolBg = (f, move, sphere) => {
  const m = MOVES[move];
  if ( m.bg === "influence" ) return sphere ? (f.assets.influence[sphere] ?? 0) : (f.assets.influence[topSphere(f)] ?? 0);
  if ( move === "recruit" && f.kind !== "kindred" ) return Math.max(f.assets.status, f.assets.resources);
  return f.assets[m.bg] ?? 0;
};
/** The defence a rival rolls: Wits and its own Background for what is attacked. */
const defenceBg = (f, move, sphere) => (move === "hunt" ? Math.max(f.assets.security, f.assets.domain, f.assets.contacts)
  : sphere ? (f.assets.influence[sphere] ?? 0) : (f.assets.influence[topSphere(f)] ?? 0));

/**
 * Pick a faction's move for this turn. Goals weigh most; then the moment: a live breach the faction is blamed for
 * pushes it to lie low, a rival that stands at -2 or worse pushes it to defend or scheme, and hunters with a breach to
 * follow go hunting. The pick is drawn from the weights with the seeded stream (B52).
 *   ctx: {breaches (live, with .faction), turn}
 */
export function pickMove(state, f, rand, ctx = {}) {
  const w = {expand: 2, defend: 1, scheme: 1, recruit: 2, hunt: f.kind === "hunters" ? 2 : 0.5, lielow: 0.5};
  const goalFor = {};
  for ( const g of f.goals ) { w[g.move] += 4; goalFor[g.move] ??= g; }
  const blamed = (ctx.breaches ?? state.breaches).filter(b => b.state === "live" && b.faction === f.id);
  if ( blamed.length ) w.lielow += 3 + 2 * Math.max(...blamed.map(b => b.severity));
  const rivals = rivalsOf(state, f);
  const bitter = rivals.filter(r => standingOf(f, r.id) <= -2);
  if ( bitter.length ) { w.defend += 2; w.scheme += 2; }
  // A break-in, theft or fire at one of its places since the last turn: it looks to its defences
  if ( wrongsSince(state, f.id, ctx.since ?? Infinity).length ) w.defend += 3;
  if ( !rivals.length ) { w.scheme = 0; if ( f.kind !== "hunters" ) w.hunt = 0; }
  const quarry = huntersQuarry(state, f);
  if ( f.kind === "hunters" && quarry ) w.hunt += 6;
  if ( f.kind === "hunters" && !quarry && !rivals.length ) w.hunt = 0;
  if ( f.guard > (ctx.turn ?? 0) ) w.defend = 0; // already on guard
  const total = MOVE_LIST.reduce((a, k) => a + Math.max(0, w[k]), 0);
  let r = rand() * total, move = "recruit";
  for ( const k of MOVE_LIST ) { r -= Math.max(0, w[k]); if ( r < 0 ) { move = k; break; } }
  const g = goalFor[move] ?? null;
  let target = null, sphere = g?.sphere ?? null, place = g?.place ?? null;
  if ( move === "hunt" && f.kind === "hunters" && quarry ) target = g?.target ?? quarry.id;
  else if ( MOVES[move].rival || (move === "expand" && place) ) {
    const pick = g?.target && state.factions.some(o => o.id === g.target && !o.dormant) ? state.factions.find(o => o.id === g.target) : rivals[0];
    target = pick?.id ?? null;
    if ( move === "expand" && place ) target = holderOf(state, place)?.id ?? null;
  }
  if ( move === "scheme" && !sphere && target ) sphere = topSphere(state.factions.find(o => o.id === target));
  if ( move === "expand" && !sphere && !place ) sphere = weakestSphere(f, ctx.spheres);
  if ( MOVES[move].rival && !target ) move = "recruit";
  return {move, target, sphere, place, goal: g};
}
/** For expansion with no goal: a sphere the faction already works in and has room in, else the first sphere. */
function weakestSphere(f, spheres) {
  const held = Object.entries(f.assets.influence).filter(([, v]) => v < MAX_DOTS).sort((a, b) => b[1] - a[1]);
  if ( held.length ) return held[0][0];
  return Object.keys(spheres ?? SPHERES.roads)[0];
}
/** The faction a hunters' faction should go after: the one blamed for the worst breach that has reached the hunters. */
export function huntersQuarry(state, f) {
  if ( f.kind !== "hunters" ) return null;
  const b = state.breaches.filter(x => x.stage >= 2 && x.faction && ["live", "contained"].includes(x.state)).sort((a, z) => z.severity - a.severity)[0];
  return b ? state.factions.find(x => x.id === b.faction) ?? null : null;
}

/**
 * Roll a chosen move and say what it changes. Nothing is applied here.
 *   leaders: {factionId: {manipulation, wits, charisma, perception}} the leader's Attributes, where known
 *   ctx: {turn, rand2 (the defence's stream), places: [{id, kind, name}], pcActors: Set of actor ids}
 * Returns {faction, move, target, sphere, place, pool, difficulty, dice, net, botch, defence?, changes, text}.
 */
export function resolveMove(state, f, choice, rand, leaders = {}, ctx = {}) {
  const {move, target, sphere, place} = choice;
  const m = MOVES[move];
  const rival = target ? state.factions.find(o => o.id === target) : null;
  const attr = Number(leaders[f.id]?.[m.attr]) || DEFAULT_ATTR;
  const bg = poolBg(f, move, move === "scheme" ? null : sphere);
  const pool = attr + bg;
  const difficulty = BASE_DIFF + (rival && rival.guard > (ctx.turn ?? 0) ? 1 : 0);
  const dice = rollDice(rand, pool);
  const mine = successes(dice, difficulty);
  let defence = null;
  if ( rival && (m.rival || (move === "expand" && place)) ) {
    const dAttr = Number(leaders[rival.id]?.wits) || DEFAULT_ATTR;
    const dPool = dAttr + (move === "expand" ? Math.max(rival.assets.domain, rival.assets.security) : defenceBg(rival, move, sphere));
    const dDice = rollDice(ctx.rand2 ?? rand, dPool);
    defence = {pool: dPool, dice: dDice, ...successes(dDice, BASE_DIFF)};
  }
  const won = mine.net > 0 && (!defence || mine.net > defence.net);
  const out = {faction: f.id, move, target: rival?.id ?? null, sphere: sphere ?? null, place: place ?? null, pool, difficulty, dice, net: mine.net, botch: mine.botch,
    defence, won, changes: [], text: ""};
  const name = f.name, rname = rival?.name ?? "";
  const sphereName = k => (ctx.spheres ?? {})[k] ?? k;
  const placeName = id => (ctx.places ?? []).find(p => p.id === id)?.name ?? "a place";
  const add = c => out.changes.push(c);
  const noticed = () => { if ( rival && defence && defence.net >= mine.net && standingOf(rival, f.id) > STANDING.min ) add({op: "standing", faction: rival.id, other: f.id, delta: -1}); };

  if ( mine.botch ) {
    // A botch costs the faction: a dot of what it leaned on, and a Kindred faction hunting or expanding may be seen
    const key = m.bg === "influence" ? null : (m.bg in f.assets ? m.bg : null);
    if ( m.bg === "influence" && (f.assets.influence[sphere ?? topSphere(f)] ?? 0) > 0 ) add({op: "bg", faction: f.id, key: "influence", sphere: sphere ?? topSphere(f), delta: -1});
    else if ( key && f.assets[key] > 0 ) add({op: "bg", faction: f.id, key, delta: -1});
    if ( rival && standingOf(rival, f.id) > STANDING.min ) add({op: "standing", faction: rival.id, other: f.id, delta: -1});
    if ( f.secret && ["hunt", "expand", "recruit"].includes(move) && f.places.length )
      add({op: "breach", faction: f.id, place: f.places[0], severity: 1, event: `${name} overreached while trying to ${m.label.toLowerCase()}`});
    out.text = `${name} tried to ${m.label.toLowerCase()} and botched it.`;
    return out;
  }
  if ( !won ) {
    noticed();
    out.text = rival ? `${name} moved against ${rname} (${m.label.toLowerCase()}) and got nowhere.` : `${name} tried to ${m.label.toLowerCase()}, and nothing came of it.`;
    return out;
  }
  switch ( move ) {
    case "expand":
      if ( place && rival ) {
        add({op: "place", place, from: rival.id, to: f.id});
        add({op: "standing", faction: rival.id, other: f.id, delta: -2});
        out.text = `${name} takes ${placeName(place)} from ${rname}.`;
      } else if ( place && !rival ) {
        add({op: "place", place, from: null, to: f.id});
        out.text = `${name} claims ${placeName(place)}.`;
      } else {
        const k = sphere ?? topSphere(f) ?? "church";
        if ( (f.assets.influence[k] ?? 0) < MAX_DOTS ) add({op: "bg", faction: f.id, key: "influence", sphere: k, delta: 1});
        out.text = `${name} gains ground in ${sphereName(k)}.`;
      }
      break;
    case "defend":
      add({op: "guard", faction: f.id, until: (ctx.turn ?? 0) + 1});
      out.text = `${name} stands on guard.`;
      break;
    case "scheme": {
      const k = sphere ?? topSphere(rival);
      if ( k && (rival.assets.influence[k] ?? 0) > 0 ) add({op: "bg", faction: rival.id, key: "influence", sphere: k, delta: -1});
      else if ( rival.assets.status > 0 ) add({op: "bg", faction: rival.id, key: "status", delta: -1});
      if ( mine.net >= 3 && (f.assets.influence[k] ?? 0) < MAX_DOTS && k ) add({op: "bg", faction: f.id, key: "influence", sphere: k, delta: 1});
      out.text = `${name} undermines ${rname}${k ? ` in ${sphereName(k)}` : ""}.`;
      break;
    }
    case "recruit": {
      const key = f.kind === "kindred" ? "herd" : "retainers";
      if ( f.assets[key] < MAX_DOTS ) add({op: "bg", faction: f.id, key, delta: 1});
      else if ( f.assets.contacts < MAX_DOTS ) add({op: "bg", faction: f.id, key: "contacts", delta: 1});
      out.text = `${name} wins new followers.`;
      break;
    }
    case "hunt": {
      const key = rival.assets.retainers > 0 ? "retainers" : rival.assets.herd > 0 ? "herd" : rival.assets.contacts > 0 ? "contacts" : null;
      if ( key ) add({op: "bg", faction: rival.id, key, delta: -1});
      if ( f.kind === "hunters" && mine.net >= 3 ) {
        // A follower is found before the leader
        const who = rival.members.find(id => id !== rival.leader) ?? rival.leader;
        if ( who ) add({op: "found", faction: f.id, target: rival.id, actor: who});
      }
      noticed();
      out.text = `${name} hunts ${rname}'s people.`;
      break;
    }
    case "lielow": {
      const b = state.breaches.filter(x => x.faction === f.id && x.state === "live").sort((a, z) => z.severity - a.severity)[0];
      if ( b ) add({op: "breach-sev", id: b.id, delta: -1});
      out.text = b ? `${name} lies low, and the talk about it quietens.` : `${name} lies low.`;
      break;
    }
  }
  return out;
}

/**
 * Small or big (B86): small changes apply with an Undo in Auto; big ones always wait for the Storyteller. Big: a place
 * changing hands, a new member, someone found by hunters, a breach reaching the Prince or hunters, and anything that
 * touches a player character.
 */
export const BIG_OPS = new Set(["place", "found", "member", "stage", "faction-add", "faction-remove"]);
export function sizeOf(changes, {pcActors = new Set(), state = null} = {}) {
  for ( const c of changes ) {
    if ( BIG_OPS.has(c.op) ) return "big";
    if ( POL_OPS.has(c.op) ) { if ( politicsBig(c, pcActors) ) return "big"; continue; }
    if ( c.actor && pcActors.has(c.actor) ) return "big";
    if ( state && c.faction ) {
      const f = state.factions.find(x => x.id === c.faction);
      if ( f?.members.some(id => pcActors.has(id)) && c.op === "bg" && c.delta < 0 ) return "big";
    }
  }
  return "small";
}

/* ------------------------------------------------------------------ */
/*  Applying changes, with their inverse for Undo                      */
/* ------------------------------------------------------------------ */

const clone = o => JSON.parse(JSON.stringify(o));
/**
 * Apply changes to a copy of the state. Returns {state, inverse, applied}: inverse undoes exactly what changed (a dot
 * already at 5 or 0 changes nothing, and its inverse is empty).
 *   ids: a function giving a new id (for breaches), so tests can fix them
 *   now: the world time, for breaches
 */
export function applyChanges(state, changes, {ids = () => Math.random().toString(36).slice(2, 12), now = 0} = {}) {
  const s = clone(state);
  const inverse = [], applied = [];
  const fac = id => s.factions.find(f => f.id === id);
  for ( const c of changes ) {
    switch ( c.op ) {
      case "bg": {
        const f = fac(c.faction); if ( !f ) break;
        if ( c.key === "influence" ) {
          const was = f.assets.influence[c.sphere] ?? 0, to = dot(was + c.delta);
          if ( to === was ) break;
          if ( to ) f.assets.influence[c.sphere] = to; else delete f.assets.influence[c.sphere];
          inverse.unshift({op: "bg", faction: f.id, key: "influence", sphere: c.sphere, delta: was - to}); applied.push(c);
        } else {
          const was = f.assets[c.key] ?? 0;
          let to = dot(was + c.delta);
          if ( c.key === "security" ) to = Math.min(to, MAX_DOTS - f.assets.domain);
          if ( c.key === "domain" ) { to = Math.min(to, MAX_DOTS - f.assets.security); }
          if ( to === was ) break;
          f.assets[c.key] = to;
          inverse.unshift({op: "bg", faction: f.id, key: c.key, delta: was - to}); applied.push(c);
        }
        break;
      }
      case "standing": {
        const f = fac(c.faction); if ( !f || c.other === f.id ) break;
        const was = f.standing[c.other] ?? 0, to = Math.max(STANDING.min, Math.min(STANDING.max, was + c.delta));
        if ( to === was ) break;
        if ( to ) f.standing[c.other] = to; else delete f.standing[c.other];
        inverse.unshift({op: "standing", faction: f.id, other: c.other, delta: was - to}); applied.push(c);
        break;
      }
      case "people": {
        // NPC 0.16.0: how a faction regards one character, -3 to +3
        const f = fac(c.faction); if ( !f || !c.actor ) break;
        f.people = {...(f.people ?? {})};
        const was = f.people[c.actor] ?? 0, to = Math.max(STANDING.min, Math.min(STANDING.max, was + (Number(c.delta) || 0)));
        if ( to === was ) break;
        if ( to ) f.people[c.actor] = to; else delete f.people[c.actor];
        inverse.unshift({op: "people", faction: f.id, actor: c.actor, delta: was - to}); applied.push(c);
        break;
      }
      case "guard": {
        const f = fac(c.faction); if ( !f ) break;
        inverse.unshift({op: "guard", faction: f.id, until: f.guard}); f.guard = c.until; applied.push(c);
        break;
      }
      case "place": {
        const from = c.from ? fac(c.from) : s.factions.find(f => f.places.includes(c.place));
        const to = c.to ? fac(c.to) : null;
        if ( from ) from.places = from.places.filter(p => p !== c.place);
        for ( const f of s.factions ) if ( f !== to ) f.places = f.places.filter(p => p !== c.place);
        if ( to && !to.places.includes(c.place) ) to.places.push(c.place);
        inverse.unshift({op: "place", place: c.place, from: to?.id ?? null, to: from?.id ?? null}); applied.push(c);
        break;
      }
      case "member": {
        const f = fac(c.faction); if ( !f ) break;
        if ( c.remove ) { if ( !f.members.includes(c.actor) ) break; f.members = f.members.filter(a => a !== c.actor); inverse.unshift({op: "member", faction: f.id, actor: c.actor}); }
        else { if ( f.members.includes(c.actor) ) break; f.members.push(c.actor); inverse.unshift({op: "member", faction: f.id, actor: c.actor, remove: true}); }
        applied.push(c);
        break;
      }
      case "goal": {
        const f = fac(c.faction); if ( !f ) break;
        if ( c.remove ) { const i = f.goals.findIndex(g => g.move === c.goal.move && g.target === c.goal.target); if ( i < 0 ) break; f.goals.splice(i, 1); inverse.unshift({op: "goal", faction: f.id, goal: c.goal}); }
        else { if ( f.goals.some(g => g.move === c.goal.move && g.target === c.goal.target) ) break; f.goals.push({sphere: null, place: null, note: "", ...c.goal}); inverse.unshift({op: "goal", faction: f.id, goal: c.goal, remove: true}); }
        applied.push(c);
        break;
      }
      case "found": applied.push(c); break; // a report for the Storyteller; the world changes only by their hand
      case "faction-add": {
        const nf = normFaction(c.faction);
        if ( !nf.id || fac(nf.id) ) break;
        s.factions.push(nf);
        inverse.unshift({op: "faction-remove", id: nf.id}); applied.push(c);
        break;
      }
      case "faction-remove": {
        const i = s.factions.findIndex(f => f.id === c.id); if ( i < 0 ) break;
        const [f] = s.factions.splice(i, 1);
        inverse.unshift({op: "faction-add", faction: clone(f)}); applied.push(c);
        break;
      }
      case "faction-set": {
        const f = fac(c.faction); if ( !f ) break;
        const was = {};
        for ( const k of SETTABLE ) if ( c.set && k in c.set ) was[k] = clone(f[k] ?? null);
        if ( !Object.keys(was).length ) break;
        const next = normFaction({...f, ...Object.fromEntries(Object.keys(was).map(k => [k, c.set[k]]))});
        for ( const k of Object.keys(was) ) f[k] = next[k];
        inverse.unshift({op: "faction-set", faction: f.id, set: was}); applied.push(c);
        break;
      }
      case "breach": {
        const b = normBreach({id: c.id ?? ids(), severity: c.severity, place: c.place, faction: c.faction, by: c.by ?? null, event: c.event, started: now, lastStep: now, lastFed: now});
        s.breaches.push(b);
        inverse.unshift({op: "breach-remove", id: b.id}); applied.push({...c, id: b.id});
        break;
      }
      case "breach-remove": {
        const i = s.breaches.findIndex(b => b.id === c.id); if ( i < 0 ) break;
        const [b] = s.breaches.splice(i, 1);
        inverse.unshift({op: "breach-restore", breach: b}); applied.push(c);
        break;
      }
      case "breach-restore": s.breaches.push(clone(c.breach)); inverse.unshift({op: "breach-remove", id: c.breach.id}); applied.push(c); break;
      case "breach-sev": {
        const b = s.breaches.find(x => x.id === c.id); if ( !b ) break;
        const was = b.severity, wasState = b.state, to = Math.max(0, Math.min(5, was + c.delta));
        if ( to === was ) break;
        b.severity = to;
        if ( to === 0 && b.state === "live" ) b.state = "over";
        if ( to > 0 && b.state === "over" ) b.state = "live";
        if ( c.delta > 0 ) b.lastFed = now;
        inverse.unshift({op: "breach-set", id: b.id, severity: was, state: wasState}); applied.push(c);
        break;
      }
      case "breach-set": {
        const b = s.breaches.find(x => x.id === c.id); if ( !b ) break;
        inverse.unshift({op: "breach-set", id: b.id, severity: b.severity, state: b.state, stage: b.stage, heard: [...b.heard], known: [...b.known], lastStep: b.lastStep, lastFed: b.lastFed});
        if ( c.severity !== undefined ) b.severity = c.severity;
        if ( c.state !== undefined ) b.state = c.state;
        if ( c.stage !== undefined ) b.stage = c.stage;
        if ( c.heard !== undefined ) b.heard = [...c.heard];
        if ( c.known !== undefined ) b.known = [...c.known];
        if ( c.lastStep !== undefined ) b.lastStep = c.lastStep;
        if ( c.lastFed !== undefined ) b.lastFed = c.lastFed;
        applied.push(c);
        break;
      }
      case "heard": {
        const b = s.breaches.find(x => x.id === c.id); if ( !b ) break;
        inverse.unshift({op: "breach-set", id: b.id, heard: [...b.heard], known: [...b.known], lastStep: b.lastStep});
        for ( const p of c.places ?? [] ) if ( !b.heard.includes(p) ) b.heard.push(p);
        for ( const k of c.known ?? [] ) if ( !b.known.includes(k) ) b.known.push(k);
        if ( c.lastStep !== undefined ) b.lastStep = c.lastStep;
        applied.push(c);
        break;
      }
      case "stage": {
        const b = s.breaches.find(x => x.id === c.id); if ( !b || b.stage >= c.stage ) break;
        inverse.unshift({op: "breach-set", id: b.id, stage: b.stage});
        b.stage = c.stage; applied.push(c);
        break;
      }
      default: {
        // NPC 0.25.0: a change inside a faction's politics
        if ( !POL_OPS.has(c.op) ) break;
        const inv = applyPolitics(fac(c.faction), c);
        if ( inv ) { inverse.unshift(...inv); applied.push(c); }
      }
    }
  }
  return {state: s, inverse, applied};
}

/* ------------------------------------------------------------------ */
/*  Turns                                                              */
/* ------------------------------------------------------------------ */

/** How many faction turns are due between two world times: one a `days` (B99), at most `cap`. */
export function turnsDue(last, now, {days = TURN_DAYS, cap = TURN_CAP} = {}) {
  if ( !Number.isFinite(now) ) return {due: 0, skipped: 0};
  if ( last === null || last === undefined || !Number.isFinite(last) ) return {due: 0, skipped: 0, start: now};
  const span = days * 86400;
  const n = Math.max(0, Math.floor((now - last) / span));
  return {due: Math.min(n, cap), skipped: Math.max(0, n - cap), span};
}

/**
 * One faction turn for every active faction, in order of Status (the mighty move first). Each faction's result is
 * applied to a working copy before the next one picks, so a later faction sees what an earlier one did; the results
 * are returned with their size, and the caller decides what lands (Suggest: all queued; Auto: small ones apply).
 *   seedKey: the key for the seeded streams, such as "turn:5"
 *   streamFor(key): a seeded random stream (WoDX Chronicle's gen.random)
 */
export function runTurn(state, {streamFor, seedKey, leaders = {}, places = [], pcActors = new Set(), spheres = SPHERES.roads, turn = 0, now = 0, ids,
  year = null, gone = new Set(), alive = null, splits = false, name = null, politics = null} = {}) {
  let work = clone(state);
  const results = [];
  const order = work.factions.filter(f => activeIn(f, year)).sort((a, b) => b.assets.status - a.assets.status || a.name.localeCompare(b.name));
  const quiet = (f, move, text) => ({faction: f.id, move, target: null, sphere: null, place: null, pool: 0, difficulty: 0, dice: [], net: 0, botch: false, defence: null, won: false, changes: [], text});
  for ( const f0 of order ) {
    const f = work.factions.find(x => x.id === f0.id);
    const rand = streamFor(`${seedKey}:${f.id}`);
    // NPC 0.17.0: a faction its players run on orders waits for them; their orders are spent on the turn (B835)
    let choice;
    if ( f.owners.length && f.run === "orders" ) {
      if ( !f.orders ) { const q = quiet(f, "wait", `${f.name} waits for its players' orders.`); q.size = "small"; results.push(q); continue; }
      const o = f.orders, t = o.target ? work.factions.find(x => x.id === o.target && x.id !== f.id && !x.dormant) : null;
      choice = {move: o.move, target: t?.id ?? null, sphere: o.sphere, place: o.place, goal: null};
      if ( MOVES[o.move].rival && !t ) choice = {...choice, move: "recruit", target: null};
      if ( o.move === "expand" && o.place && !t ) choice.target = holderOf(work, o.place)?.id ?? null;
    } else choice = pickMove(work, f, rand, {turn, spheres, since: now - TURN_DAYS * 86400});
    const r = resolveMove(work, f, choice, rand, leaders, {turn, places, spheres, rand2: streamFor(`${seedKey}:${f.id}:defence`)});
    if ( f.orders ) r.changes.push({op: "faction-set", faction: f.id, set: {orders: null}});
    r.size = sizeOf(r.changes, {pcActors, state: work});
    results.push(r);
    // Only small results shape what later factions see: a big one waits for the Storyteller
    if ( r.size === "small" ) work = applyChanges(work, r.changes, {ids, now}).state;
    // A strained faction may split (B833); always a big change, its own card
    if ( splits ) {
      const g = work.factions.find(x => x.id === f.id);
      const ch = splinterChanges(work, g, {rand: streamFor(`${seedKey}:${f.id}:split`), newId: ids, year, name, alive,
        leaderGone: !!g.leader && gone.has(g.leader), botched: r.botch});
      if ( ch.length ) {
        const q = quiet(g, "split", `${g.name} splits: ${ch[0].faction.name}.`);
        q.changes = ch; q.size = "big"; results.push(q);
      }
    }
  }
  // NPC 0.25.0: politics inside each faction that keeps a polity. Small moves land together; each big one is its own card.
  if ( politics ) for ( const f0 of order ) {
    const f = work.factions.find(x => x.id === f0.id);
    if ( !f || f.dormant ) continue;
    const key = polityFor(f, year);
    if ( !key ) continue;
    const res = innerTurn(f, {rand: streamFor(`${seedKey}:${f.id}:politics`), polity: key, info: politics.info ?? {}, boons: politics.boons ?? [], hooks: politics.hooks ?? [], turn, year});
    if ( !res.groups.length ) continue;
    const small = {changes: [], lines: []};
    const bigs = [];
    for ( const g of res.groups ) {
      if ( g.changes.length && sizeOf(g.changes, {pcActors, state: work}) === "big" ) bigs.push(g);
      else { small.changes.push(...g.changes); small.lines.push(...g.lines); }
    }
    const title = `${f.name} (${POLITIES[key].label.replace(/^an? /i, "")})`;
    const mk = (g, size) => ({faction: f.id, move: "politics", target: null, sphere: null, place: null, pool: 0, difficulty: 0, dice: [], net: 0, botch: false, defence: null,
      won: false, changes: g.changes, lines: g.lines, size, gathering: res.gathering, polity: key, text: `${title}: ${g.lines.join(" ")}`});
    results.push(mk(small, "small"));
    if ( small.changes.length ) work = applyChanges(work, small.changes, {ids, now}).state;
    for ( const g of bigs ) results.push(mk(g, "big"));
  }
  return results;
}

/* ------------------------------------------------------------------ */
/*  Hunting grounds                                                    */
/* ------------------------------------------------------------------ */

/**
 * Hunting in a place, for one hunter (V20 pp. 259-260; V20 Dark Ages p. 334):
 *   the area sets the difficulty; the hunter's faction's Domain lowers it a dot each where that faction holds the place,
 *   and Fame lowers it a dot each, to no less than 3; Herd adds a die a dot where the herd could be (the faction's
 *   own places). In a domain another faction holds, the intruder's difficulty rises by that domain's security (V20
 *   p. 113) and the intrusion is a trespass the holder may answer (the Tradition of Domain).
 *   churchStep: the night's step from WoDX Chronicle's feast and fast days (-1, 0 or +1), for places in town only.
 *   hunter: {factions: [faction ids], herd (own dots), domain (own dots), fame}
 */
export function huntingAt(state, place, hunter = {}, morality = "roads", {churchStep = 0} = {}) {
  const area = areaOf(place, morality);
  const holder = holderOf(state, place?.id);
  const mine = holder && (hunter.factions ?? []).includes(holder.id);
  const ownFaction = state.factions.filter(f => (hunter.factions ?? []).includes(f.id));
  const herdFac = ownFaction.filter(f => f.places.includes(place?.id)).reduce((m, f) => Math.max(m, f.assets.herd), 0);
  const domainDots = mine ? Math.max(holder.assets.domain, Number(hunter.domain) || 0) : 0;
  const fame = Math.max(0, Number(hunter.fame) || 0);
  const herdDice = Math.max(Number(hunter.herd) || 0, herdFac);
  let difficulty = Math.max(3, area.difficulty - domainDots - fame);
  // Feast and fast days (WoDX Chronicle): a night of revel is 1 easier in town, a strict fast 1 harder; not in the wilds
  const church = ["wilds", "caern"].includes(place?.kind) ? 0 : Math.sign(Number(churchStep) || 0);
  if ( church ) difficulty = Math.min(10, Math.max(3, difficulty + church));
  const trespass = holder && !mine ? {faction: holder.id, name: holder.name, security: holder.assets.security, secret: holder.secret} : null;
  if ( trespass ) difficulty = Math.min(10, difficulty + trespass.security);
  return {area, holder: holder?.id ?? null, domainDots, fame, herdDice, church, difficulty, trespass};
}

/* ------------------------------------------------------------------ */
/*  Masquerade breaches                                                */
/* ------------------------------------------------------------------ */

/** Severity, 1 to 5 (WoDX reading, B101). */
export const SEVERITY = {1: "Whispers: one witness, nothing anyone could prove", 2: "A story: several witnesses, or a body",
  3: "A scandal: seen by a crowd, or told in the church", 4: "An outrage: many dead, or proof in hand", 5: "A catastrophe: the whole town knows"};
/** A first severity from the witnesses Actions recorded: one is 1, two to four is 2, five or more is 3. */
export const severityFor = witnesses => (witnesses >= 5 ? 3 : witnesses >= 2 ? 2 : 1);
export const STAGES = ["Talk in the town", "The Prince hears", "The hunters hear"];

export function normBreach(b = {}) {
  return {
    id: String(b.id ?? ""), severity: Math.max(0, Math.min(5, Math.round(Number(b.severity) || 0))), place: b.place || null,
    faction: b.faction || null, by: b.by || null, byName: String(b.byName ?? "").slice(0, 120), event: String(b.event ?? "").slice(0, 300),
    started: Number(b.started) || 0, lastStep: Number(b.lastStep ?? b.started) || 0, lastFed: Number(b.lastFed ?? b.started) || 0,
    heard: uniq(b.heard), known: uniq(b.known), stage: Math.max(0, Math.min(2, Number(b.stage) || 0)),
    state: ["live", "contained", "stopped", "over"].includes(b.state) ? b.state : "live", masq: b.masq || null
  };
}

/** Public places hear a rumour first: these kinds lead, in this order (WoDX reading). */
const PUBLIC_FIRST = ["tavern", "market", "church", "street", "workplace", "gate", "castle", "home", "wilds", "caern", "haven", "other"];

/**
 * One day of a rumour: it reaches as many new places as its severity (or perDay: the age's reach, from WoDX
 * Chronicle's media-rules.mjs, where the papers carry a severe breach to every place in a day), public places first (a seeded shuffle within a
 * kind), and every faction that holds a place it has reached, or whose Contacts hear it (heard places at least 6 less
 * Contacts), knows of it. Then it may rise: to the Prince when the ruling faction knows; to the hunters when a hunters'
 * faction knows and the severity is 2 or more. Each rise is its own change, so the Storyteller can stop it there.
 *   places: [{id, kind}] every tagged place
 * Returns {changes, rise: null | {stage, faction}}.
 */
export function spreadDay(state, b, places, rand, {now = 0, perDay = null} = {}) {
  const out = {changes: [], rise: null};
  if ( b.state !== "live" || b.severity <= 0 ) return out;
  const unheard = places.filter(p => !b.heard.includes(p.id));
  const ranked = PUBLIC_FIRST.flatMap(k => shuffle(rand, unheard.filter(p => (PUBLIC_FIRST.includes(p.kind) ? p.kind : "other") === k)));
  const reach = b.heard.length === 0 && b.place && !b.heard.includes(b.place) ? [b.place, ...ranked.filter(p => p.id !== b.place).map(p => p.id)] : ranked.map(p => p.id);
  const fresh = reach.slice(0, perDay === null ? b.severity : perDay);
  const heard = [...b.heard, ...fresh];
  const known = new Set(b.known);
  for ( const f of state.factions ) {
    if ( f.dormant || f.id === b.faction ) continue;
    if ( f.places.some(p => heard.includes(p)) ) known.add(f.id);
    else if ( f.assets.contacts > 0 && heard.length >= 6 - f.assets.contacts ) known.add(f.id);
  }
  const newly = [...known].filter(k => !b.known.includes(k));
  if ( fresh.length || newly.length ) out.changes.push({op: "heard", id: b.id, places: fresh, known: newly, lastStep: now});
  else out.changes.push({op: "heard", id: b.id, places: [], known: [], lastStep: now});
  const ruler = rulerOf(state);
  if ( b.stage < 1 && ruler && ruler.id !== b.faction && known.has(ruler.id) ) out.rise = {stage: 1, faction: ruler.id};
  else if ( b.stage < 1 && ruler && ruler.id === b.faction && heard.length >= 3 ) out.rise = {stage: 1, faction: ruler.id};
  else if ( b.stage >= 1 && b.stage < 2 && b.severity >= 2 ) {
    const h = state.factions.find(f => f.kind === "hunters" && !f.dormant && known.has(f.id));
    if ( h ) out.rise = {stage: 2, faction: h.id};
  }
  if ( out.rise ) out.changes.push({op: "stage", id: b.id, stage: out.rise.stage, faction: out.rise.faction});
  return out;
}
function shuffle(rand, list) {
  const a = [...list];
  for ( let i = a.length - 1; i > 0; i-- ) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
/** Whole days of rumour due since the breach last spread, at most `cap`. */
export const daysDue = (b, now, cap = 31) => (b.state === "live" ? Math.min(cap, Math.max(0, Math.floor((now - b.lastStep) / 86400))) : 0);
/** A week with nothing new to feed it, and a rumour the hunters have not heard loses a step of severity (WoDX reading). */
export function fades(b, now) {
  if ( b.state !== "live" || b.stage >= 2 ) return false;
  return now - b.lastFed >= 7 * 86400;
}

/**
 * The Backgrounds rule of era advancement (B83) for factions: a faction whose leader and members are all gone (dead,
 * in torpor, or missing) leaves its Backgrounds untended, and loses a dot of each per untended decade. Returns the
 * changes, for the Storyteller to tick.
 */
export function untendedLoss(f, decades) {
  if ( decades < 1 ) return [];
  const out = [];
  for ( const k of ["herd", "resources", "status", "retainers", "contacts", "domain"] ) if ( f.assets[k] > 0 ) out.push({op: "bg", faction: f.id, key: k, delta: -Math.min(decades, f.assets[k])});
  for ( const [k, v] of Object.entries(f.assets.influence) ) out.push({op: "bg", faction: f.id, key: "influence", sphere: k, delta: -Math.min(decades, v)});
  return out;
}

/* ------------------------------------------------------------------ */
/*  Founding, splitting, ending and absorbing (NPC 0.17.0)             */
/* ------------------------------------------------------------------ */

/** The Backgrounds a founder can pledge to a new faction (Domain security starts at 0). */
export const PLEDGE_KEYS = ["herd", "resources", "status", "retainers", "contacts", "domain", "influence"];

/**
 * A new faction from its founders' own Backgrounds. Each founder pledges up to the dots they hold; the faction's rating
 * in each Background is the sum of the pledges, to 5. Pooling follows the books' shared Backgrounds (a pack's Totem in
 * W20, a cabal's Chantry in M20); a faction has no shared pool rule of its own, so this is a house rule (B831). The
 * founders' sheets are not changed: the founding card lists the pledges for the Storyteller to mark.
 *   spec: {id, name, kind, leader, members, places, secret, owners, run, sphere (where pledged Influence goes), notes, year}
 *   founders: [{id, has: {herd, ..., influence}, pledge: {herd, ..., influence}}]
 * Returns {faction, pledged: [{id, key, dots}]}.
 */
export function foundFaction(spec = {}, founders = []) {
  const sum = {};
  const pledged = [];
  for ( const p of founders ) {
    for ( const k of PLEDGE_KEYS ) {
      const give = Math.min(dot(p.pledge?.[k]), dot(p.has?.[k]));
      if ( !give ) continue;
      sum[k] = (sum[k] ?? 0) + give;
      pledged.push({id: p.id, key: k, dots: give});
    }
  }
  const capped = k => Math.min(MAX_DOTS, sum[k] ?? 0);
  const sphere = spec.sphere || null;
  const assets = {herd: capped("herd"), resources: capped("resources"), status: capped("status"), retainers: capped("retainers"),
    contacts: capped("contacts"), domain: capped("domain"), security: 0, influence: sphere && capped("influence") ? {[sphere]: capped("influence")} : {}};
  const ids = uniq([spec.leader, ...(spec.members ?? []), ...founders.map(p => p.id)]);
  const faction = normFaction({id: spec.id, name: spec.name || "A new faction", kind: spec.kind || "other", leader: spec.leader || founders[0]?.id || null,
    members: ids, places: spec.places ?? [], secret: spec.secret, owners: spec.owners ?? [], run: spec.run, assets, founded: spec.year ?? null, notes: spec.notes ?? ""});
  return {faction, pledged};
}

/** Is a faction in the world at a year? Dormant ones are not; nor one not yet founded or already ended. */
export function activeIn(f, year) {
  if ( !f || f.dormant ) return false;
  if ( !Number.isFinite(Number(year)) || year === null ) return true;
  if ( f.founded !== null && f.founded !== undefined && f.founded > year ) return false;
  if ( f.ended !== null && f.ended !== undefined && f.ended <= year ) return false;
  return true;
}

/**
 * The year moved (a skip, an era jump, a skip back): factions the Storyteller dated wake or sleep by their years.
 * Only factions put to sleep by their years wake again; one the Storyteller made dormant stays so.
 */
export function yearChanges(state, year) {
  const out = [];
  if ( !Number.isFinite(Number(year)) ) return out;
  for ( const f of state.factions ) {
    const dated = (f.founded !== null && f.founded !== undefined) || (f.ended !== null && f.ended !== undefined);
    if ( !dated ) continue;
    const inYears = (f.founded === null || f.founded <= year) && (f.ended === null || f.ended > year);
    if ( !f.dormant && !inYears ) out.push({op: "faction-set", faction: f.id, set: {dormant: true, dormantBy: "year"}});
    else if ( f.dormant && f.dormantBy === "year" && inYears ) out.push({op: "faction-set", faction: f.id, set: {dormant: false, dormantBy: null}});
  }
  return out;
}

/** A faction comes to an end: it sleeps, its places are free, and the year is kept for the record. */
export function disbandChanges(state, id, year = null) {
  const f = state.factions.find(x => x.id === id);
  if ( !f ) return [];
  return [...f.places.map(p => ({op: "place", place: p, from: f.id, to: null})),
    {op: "faction-set", faction: f.id, set: {dormant: true, dormantBy: "ended", ended: Number.isFinite(Number(year)) && year !== null ? Math.round(year) : f.ended}}];
}

/**
 * One faction folds into another: its people join the winner, its places pass to it, and the winner gains half of the
 * loser's dots in each Background (rounded down, to 5). The loser ends. House rule (B832).
 */
export function absorbChanges(state, loserId, winnerId, year = null) {
  const lose = state.factions.find(x => x.id === loserId), win = state.factions.find(x => x.id === winnerId);
  if ( !lose || !win || lose.id === win.id ) return [];
  const out = [];
  for ( const a of uniq([lose.leader, ...lose.members]) ) if ( !win.members.includes(a) ) out.push({op: "member", faction: win.id, actor: a});
  for ( const p of lose.places ) out.push({op: "place", place: p, from: lose.id, to: win.id});
  for ( const k of ["herd", "resources", "status", "retainers", "contacts", "domain"] ) {
    const gain = Math.floor(lose.assets[k] / 2);
    if ( gain ) out.push({op: "bg", faction: win.id, key: k, delta: gain});
  }
  for ( const [k, v] of Object.entries(lose.assets.influence) ) if ( Math.floor(v / 2) ) out.push({op: "bg", faction: win.id, key: "influence", sphere: k, delta: Math.floor(v / 2)});
  out.push({op: "faction-set", faction: lose.id, set: {dormant: true, dormantBy: "ended", absorbedBy: win.id, ended: Number.isFinite(Number(year)) && year !== null ? Math.round(year) : lose.ended}});
  return out;
}

/** How likely a strained faction is to split at a turn: one chance in six (house rule, B833). */
export const SPLIT_CHANCE = 1 / 6;
/**
 * Is a faction strained? Its leader is gone (dead, in torpor, or none while it has members), it botched this turn, or a
 * live rumour of severity 3 or more is blamed on it.
 */
export function strained(state, f, {leaderGone = false, botched = false} = {}) {
  if ( leaderGone || botched ) return true;
  return state.breaches.some(b => b.state === "live" && b.faction === f.id && b.severity >= 3);
}
/**
 * A breakaway: a strained faction with at least three people besides its leader may split. The first of them leads the
 * new faction and takes a third of the others (the last listed), a dot of each Background the old one has two or more
 * of, and a dot of its strongest sphere; the two stand at -2 to each other. House rule (B833). Returns the changes, or
 * [] when it holds together. ctx: {rand, newId, year, name(actorId)}
 */
export function splinterChanges(state, f, {rand = Math.random, newId = () => Math.random().toString(36).slice(2, 12), year = null, name = null, leaderGone = false, botched = false, alive = null} = {}) {
  if ( !f || f.dormant || f.owners?.length ) return [];
  const people = f.members.filter(a => a !== f.leader && (!alive || alive.has(a)));
  if ( people.length < 3 || !strained(state, f, {leaderGone, botched}) ) return [];
  if ( rand() >= SPLIT_CHANCE ) return [];
  const lead = people[0], rest = people.slice(1), take = rest.slice(rest.length - Math.floor(rest.length / 3));
  const id = newId();
  const assets = {herd: 0, resources: 0, status: 0, retainers: 0, contacts: 0, domain: 0, security: 0, influence: {}};
  const out = [];
  for ( const k of ["herd", "resources", "status", "retainers", "contacts", "domain"] ) if ( f.assets[k] >= 2 ) { assets[k] = 1; out.push({op: "bg", faction: f.id, key: k, delta: -1}); }
  const top = topSphere(f);
  if ( top && f.assets.influence[top] >= 2 ) { assets.influence[top] = 1; out.push({op: "bg", faction: f.id, key: "influence", sphere: top, delta: -1}); }
  const who = name?.(lead) ?? "A member";
  const nf = normFaction({id, name: `${who}'s breakaway from ${f.name}`.slice(0, 120), kind: f.kind, secret: f.secret, leader: lead, members: [lead, ...take], assets,
    standing: {[f.id]: -2}, founded: Number.isFinite(Number(year)) && year !== null ? year : null, parent: f.id, notes: `Broke away from ${f.name}.`});
  return [{op: "faction-add", faction: nf}, ...out, ...[lead, ...take].map(a => ({op: "member", faction: f.id, actor: a, remove: true})),
    {op: "standing", faction: f.id, other: id, delta: -2}];
}

/**
 * New powers a dated event may bring to the domain, offered to the Storyteller through the queue and never applied by
 * themselves. Each answers an event in WoDX Chronicle's list (data/events.mjs), whose source gives the book; the local
 * faction it suggests is a house rule (B834).
 */
export const EVENT_POWERS = {
  camarilla: {kind: "kindred", name: "Camarilla loyalists", secret: true, note: "Elders of the domain who take up the new sect."},
  thorns: {kind: "kindred", name: "A Sabbat pack", secret: true, note: "Kindred who refused the Convention of Thorns and keep to the Sword of Caine."},
  "grand-convocation": {kind: "mages", name: "A Tradition cabal", secret: true, note: "Willworkers who answer to the new Council of Nine."},
  technocracy: {kind: "mages", name: "Technocratic agents", secret: true, note: "The Order of Reason, now the Technocratic Union, sets a watch on the domain."},
  "second-anarch-revolt": {kind: "kindred", name: "An Anarch gang", secret: true, note: "Young Kindred who will not bow to the elders."},
  reckoning: {kind: "hunters", name: "A cell of the imbued", secret: false, note: "Mortals who woke to see the monsters and hunt them."}
};
/**
 * What a dated event does to the factions: those set to rise on it wake (founded that year), those set to end on it
 * sleep (ended that year), and the event may offer a new power. Returns {changes, offer} where offer is a faction
 * record or null.
 */
export function eventChanges(state, eventId, year = null, {newId = () => Math.random().toString(36).slice(2, 12)} = {}) {
  const changes = [];
  const y = Number.isFinite(Number(year)) && year !== null ? Math.round(year) : null;
  for ( const f of state.factions ) {
    if ( f.risesOn === eventId && f.dormant ) changes.push({op: "faction-set", faction: f.id, set: {dormant: false, dormantBy: null, founded: y ?? f.founded}});
    if ( f.endsOn === eventId && !f.dormant ) changes.push({op: "faction-set", faction: f.id, set: {dormant: true, dormantBy: "event", ended: y ?? f.ended}});
  }
  const p = EVENT_POWERS[eventId];
  const offer = p && !state.factions.some(f => f.fromEvent === eventId) ? normFaction({id: newId(), name: p.name, kind: p.kind, secret: p.secret, founded: y, fromEvent: eventId, notes: p.note}) : null;
  return {changes, offer};
}

/** The fields a faction-set change may touch. */
export const SETTABLE = ["dormant", "dormantBy", "ended", "founded", "absorbedBy", "owners", "run", "orders", "leader"];

/** A change in a sentence, for cards and the queue. names: {faction(id), place(id), actor(id)}. */
export function describeChange(c, names = {}) {
  const fn = id => names.faction?.(id) ?? "a faction", pn = id => names.place?.(id) ?? "a place", an = id => names.actor?.(id) ?? "someone";
  const sp = k => names.sphere?.(k) ?? k;
  switch ( c.op ) {
    case "bg": {
      const what = c.key === "influence" ? `Influence (${sp(c.sphere)})` : ASSETS[c.key] ?? c.key;
      return `${fn(c.faction)}: ${what} ${c.delta > 0 ? "+" : ""}${c.delta}`;
    }
    case "standing": return `${fn(c.faction)} thinks ${c.delta > 0 ? "better" : "worse"} of ${fn(c.other)} (${c.delta > 0 ? "+" : ""}${c.delta})`;
    case "guard": return `${fn(c.faction)} stands on guard`;
    case "place": return c.to ? `${pn(c.place)} passes to ${fn(c.to)}${c.from ? ` from ${fn(c.from)}` : ""}` : `${pn(c.place)} is no longer held`;
    case "member": return c.remove ? `${an(c.actor)} leaves ${fn(c.faction)}` : `${an(c.actor)} joins ${fn(c.faction)}`;
    case "found": return `${fn(c.faction)} finds ${an(c.actor)} of ${fn(c.target)}`;
    case "faction-add": return `A new faction: ${c.faction?.name ?? "unnamed"}`;
    case "faction-remove": return `${fn(c.id)} is struck from the record`;
    case "faction-set": {
      const set = c.set ?? {}, bits = [];
      if ( set.absorbedBy ) bits.push(`folds into ${fn(set.absorbedBy)}`);
      else if ( set.dormant === true ) bits.push(set.dormantBy === "ended" || set.dormantBy === "event" ? "comes to an end" : "falls quiet");
      else if ( set.dormant === false ) bits.push("takes part again");
      if ( "orders" in set ) bits.push(set.orders ? `has its orders: ${MOVES[set.orders.move]?.label ?? set.orders.move}` : "carries out its orders");
      if ( "owners" in set ) bits.push(set.owners?.length ? `is run by ${set.owners.map(an).join(", ")}` : "is run by the Storyteller");
      if ( "leader" in set ) bits.push(set.leader ? `is led by ${an(set.leader)}` : "has no leader");
      return `${fn(c.faction)} ${bits.join(", ") || "changes"}`;
    }
    case "goal": return `${fn(c.faction)} takes up a goal: ${MOVES[c.goal?.move]?.label ?? c.goal?.move}${c.goal?.target ? ` against ${fn(c.goal.target)}` : ""}`;
    case "breach": return `A rumour starts at ${pn(c.place)}: ${c.event}`;
    case "breach-sev": return `A rumour ${c.delta < 0 ? "quietens" : "grows"} (${c.delta > 0 ? "+" : ""}${c.delta})`;
    case "heard": return c.places?.length ? `The rumour reaches ${c.places.map(pn).join(", ")}` : (c.known?.length ? "More people hear the rumour" : "The rumour lingers");
    case "stage": return `The rumour reaches ${c.stage === 1 ? `the Prince (${fn(c.faction)})` : `the hunters (${fn(c.faction)})`}`;
    default: return POL_OPS.has(c.op) ? describePolitics(c, names, names.state ?? null) : c.op;
  }
}
