/**
 * WoDX NPC 0.27.0 (B970 to B975): passers-by. Pure rules, harness-tested; passersby.mjs puts them on the map.
 *
 * A scene the Storyteller turns on fills with people who walk in from the edge of the map, cross it or stop a while,
 * and walk off again. They belong to no faction and keep no routine. Who they are, what they wear and how many walk
 * the street at each hour follow the year, from 1197 to the Future Darkness; the scene's hunting ground (WoDX
 * Storyteller) sets how busy it is. Every one is an ordinary mortal vessel of ten blood points, so the
 * usual Feed works on them, and the rest of the crowd counts as Masquerade witnesses.
 *
 * House readings (docs/PENDING-REVIEW.md): the crowd sizes by hour and age, the kinds of people and their clothes,
 * how many are drunk, that no children are among them, and that the Future Darkness street is thinner and warier.
 *
 * NPC 0.51.0 (B2671): a scene outside Moravia follows its region's way of life (passerby-world.mjs): a dervish or a
 * monk on the alms round in place of the friar, a coffee house guest in place of the tavern drunk, and the faith and
 * origin tags of the region's people.
 */
import {PEOPLE_WORLD, tableFor, FAITH_TAG, PROTESTANT, SECULAR} from "./passerby-world.mjs";
import {localTable, LOCAL_LOOKS} from "./passerby-local.mjs";
import {sphereFor, mixFor} from "../../wodx-chronicle/scripts/world-rules.mjs";
import {faithFor} from "../../wodx-chronicle/scripts/faith-rules.mjs";
import {originFaith} from "./routine-rules.mjs";

/** Ages of the street. The first five match routine-rules.mjs AGES; the Future Darkness street is its own. */
export const AGES = {
  medieval: {label: "Medieval (to 1499)", from: -9999},
  early: {label: "Early modern (1500 to 1799)", from: 1500},
  industrial: {label: "Industrial (1800 to 1913)", from: 1800},
  c20: {label: "Twentieth century (1914 to 1979)", from: 1914},
  modern: {label: "Modern (1980 to 2024)", from: 1980},
  future: {label: "Future Darkness (2025 on)", from: 2025}
};
const AGE_ORDER = Object.keys(AGES);
export function ageOf(year) {
  const y = Number(year);
  if ( !Number.isFinite(y) || !y ) return "medieval";
  let out = "medieval";
  for ( const k of AGE_ORDER ) if ( y >= AGES[k].from ) out = k;
  return out;
}

/** Parts of the day. Dawn counts as day; evening runs to 22:00; night to 2:00; the small hours to 6:00. */
export function bandOf(hour) {
  const h = ((Math.floor(Number(hour) || 0) % 24) + 24) % 24;
  if ( h >= 6 && h < 18 ) return "day";
  if ( h >= 18 && h < 22 ) return "evening";
  if ( h >= 22 || h < 2 ) return "night";
  return "late";
}

/**
 * People on a market street at "normal" density, by age and part of the day. Before street lighting the town gates
 * shut and the curfew bell rang, so medieval nights are nearly empty; gaslight (1800s), electric light and late bars
 * (1980s) fill the night more and more.
 */
export const CROWD = {
  medieval: {day: 6, evening: 3, night: 1, late: 0},
  early: {day: 6, evening: 4, night: 1.5, late: 0.5},
  industrial: {day: 7, evening: 5, night: 2.5, late: 1},
  c20: {day: 7, evening: 5, night: 3, late: 1},
  modern: {day: 7, evening: 6, night: 4, late: 1.5},
  future: {day: 6, evening: 5, night: 3, late: 1.5}
};

/** The hunting grounds of V20 p. 334 (WoDX Actions HUNTING_GROUNDS): how busy each kind of street is. */
export const AREA_CROWD = {slums: 1.3, lower: 1.1, market: 1, merchant: 0.7, patrolled: 0.6};
export const DENSITY = {quiet: {label: "Quiet", mult: 0.5}, normal: {label: "Normal", mult: 1}, busy: {label: "Busy", mult: 1.6}};
export const MAX_CAP = 16;

/**
 * How a town's condition thins or fills its streets (B3321; WoDX Storyteller's towns, api.upkeep.towns.ofScene):
 * plague keeps people indoors, anger and ruin empty the street, good times fill it. 1 with no town.
 */
export function townCrowd(view) {
  if ( !view || typeof view !== "object" ) return 1;
  let m = 1;
  if ( view.plague ) m *= 0.5;
  if ( (view.marks ?? []).includes("famine") ) m *= 0.8;
  if ( Number(view.unrest) >= 4.5 ) m *= 0.6;
  else if ( Number(view.unrest) >= 3.5 ) m *= 0.8;
  if ( Number(view.prosperity) <= 1 ) m *= 0.8;
  else if ( Number(view.prosperity) >= 4 ) m *= 1.2;
  return Math.round(m * 100) / 100;
}

/** How many passers-by the street holds now. */
export function crowdSize({year, hour, area = "market", density = "normal", max = 8, place = "street"} = {}) {
  const age = ageOf(year), band = bandOf(hour);
  const base = CROWD[age]?.[band] ?? 0;
  const n = base * (AREA_CROWD[area] ?? 1) * (DENSITY[density]?.mult ?? 1) * (placeOf(place).crowd ?? 1);
  const cap = Math.max(0, Math.min(MAX_CAP, Math.floor(Number(max) || 0)));
  return Math.max(0, Math.min(cap, Math.round(n)));
}

/*
 * The kinds of people. day/night: how often each turns up by day and after dark (evening is between the two);
 * areas: more or fewer in a kind of street; drunk: the chance after dark that their blood is full of drink.
 * Every description is gender-neutral, and none is a child.
 */
const P = (who, looks, day, night, more = {}) => ({who, looks, day, night, ...more});
export const PEOPLE = {
  medieval: {
    carter: P("a carter", ["in a mud-spattered hood", "with a goad over one shoulder", "smelling of horse"], 3, 0.2),
    peasant: P("a peasant come to market", ["in a sheepskin", "with a basket of eggs", "in undyed wool and bast shoes"], 4, 0.1, {areas: {merchant: 0.5}}),
    burgher: P("a burgher", ["in a fur-trimmed gown", "with a fat purse at the belt", "in good German cloth"], 2, 0.3, {areas: {merchant: 2, slums: 0.2}}),
    apprentice: P("an apprentice", ["in a leather apron", "with soot to the elbows", "carrying a master's tools"], 3, 0.5, {drunk: 0.3}),
    servant: P("a servant on an errand", ["with a covered jug", "in the livery of a great house", "carrying a lantern"], 2, 0.6, {areas: {merchant: 1.5}}),
    friar: P("a friar", ["in a grey habit", "in a brown habit, barefoot", "telling beads"], 1.5, 0.3),
    pilgrim: P("a pilgrim", ["with a staff and scrip", "wearing a pilgrim's badge", "footsore from the road"], 1, 0.3),
    beggar: P("a beggar", ["in rags", "on a crutch", "with a wooden bowl"], 1.5, 1.5, {areas: {slums: 2, merchant: 0.4}}),
    reveller: P("a reveller from the tavern", ["swaying, cup in hand", "singing off-key", "looking for the way home"], 0.3, 1.5, {drunk: 0.9, areas: {slums: 1.5, lower: 1.3}}),
    gongfarmer: P("a night-soil carrier", ["with a reeking cart", "with a shovel and a bucket"], 0, 0.8)
  },
  early: {
    wagoner: P("a wagoner", ["in a broad hat", "with a whip in the belt", "dusty from the road"], 3, 0.3),
    hawker: P("a hawker", ["with a tray of ribbons and pins", "crying hot chestnuts", "with a pack of almanacs"], 3, 0.2),
    journeyman: P("a journeyman on the tramp", ["with a bundle on a stick", "in a craftsman's black coat"], 2, 0.6, {drunk: 0.4}),
    student: P("a student", ["in a scholar's gown", "with a book under one arm", "arguing Latin with no one"], 1.5, 1, {drunk: 0.5}),
    servant: P("a servant on an errand", ["carrying a lantern", "with a basket from the market", "in a house's livery"], 2, 0.7),
    priest: P("a priest", ["in a cassock", "carrying the viaticum to the dying"], 1.5, 0.4),
    soldier: P("a discharged soldier", ["in a faded regimental coat", "missing an arm", "begging a coin for the road"], 1, 1, {drunk: 0.5, areas: {slums: 1.5}}),
    beggar: P("a beggar", ["in rags", "with a licence badge on the coat", "on a crutch"], 1.5, 1.2, {areas: {slums: 2, merchant: 0.4}}),
    reveller: P("a drinker from the inn", ["swaying", "singing", "with a pipe gone cold"], 0.3, 1.5, {drunk: 0.9, areas: {slums: 1.5, lower: 1.3}}),
    lamplighter: P("a lamplighter", ["with a ladder and a lit taper"], 0, 0.6, {from: 1700})
  },
  industrial: {
    hand: P("a factory hand", ["in a cloth cap", "with oil-black hands", "with a lunch tin"], 3, 1, {areas: {lower: 1.5, slums: 1.3, merchant: 0.4}}),
    clerk: P("a clerk", ["in a bowler hat", "with sleeve guards and a ledger", "in a celluloid collar"], 3, 0.4, {areas: {merchant: 1.5}}),
    cabman: P("a cab driver off the box", ["in a caped coat", "with a whip and a lantern"], 1.5, 1.2),
    newsboy: P("a newspaper seller", ["crying the evening edition", "with a bundle of papers"], 2, 0.3, {from: 1848}),
    laundry: P("a laundry carrier", ["under a basket of washing", "with red, chapped hands"], 2, 0.1),
    soldier: P("a soldier of the garrison", ["in a blue tunic", "on a pass until midnight"], 1, 1, {drunk: 0.5}),
    student: P("a student", ["in a corps cap", "with a duelling scar", "with a satchel of books"], 1.5, 1, {drunk: 0.5}),
    lamplighter: P("a lamplighter", ["with a long pole", "lighting the gas"], 0.2, 0.8),
    nightshift: P("a night-shift worker", ["walking home with a lamp", "grey with coal dust"], 0.3, 1.5, {areas: {lower: 1.5}}),
    drinker: P("a drinker from the beer hall", ["swaying", "singing a soldiers' song", "with a pipe"], 0.3, 1.5, {drunk: 0.9, areas: {slums: 1.5, lower: 1.3}}),
    peddler: P("a peddler", ["with a tray of matches", "with a barrow of old clothes"], 2, 0.4, {areas: {slums: 1.5}})
  },
  c20: {
    worker: P("a factory worker", ["in blue overalls", "with a lunch tin", "on a bicycle"], 3, 1, {areas: {lower: 1.5, merchant: 0.5}}),
    clerk: P("an office clerk", ["in a grey suit and hat", "with a briefcase", "with a folded newspaper"], 3, 0.4, {areas: {merchant: 1.5}}),
    shopper: P("a shopper", ["with a string bag", "with a ration book", "queueing for bread"], 3, 0.2),
    conductor: P("a tram conductor going off shift", ["in a peaked cap", "counting coins"], 1, 1),
    soldier: P("a soldier on leave", ["in uniform", "with a kitbag"], 1, 1, {drunk: 0.5}),
    student: P("a student", ["with a scarf and a satchel", "carrying records under one arm"], 1.5, 1, {drunk: 0.4}),
    pensioner: P("a pensioner", ["with a walking stick", "feeding pigeons"], 2, 0.2),
    sweeper: P("a street sweeper", ["with a broom and a handcart", "in an orange vest"], 1, 0.8),
    drinker: P("a drinker from the pub", ["swaying", "singing", "with a cigarette"], 0.3, 1.5, {drunk: 0.9, areas: {slums: 1.5, lower: 1.3}}),
    nightshift: P("a night-shift worker", ["in a work jacket", "smoking on the way home"], 0.3, 1.2)
  },
  modern: {
    commuter: P("a commuter", ["in a raincoat", "with a briefcase", "checking a watch"], 4, 0.6, {areas: {merchant: 1.5}}),
    student: P("a student", ["with a rucksack", "in a band T-shirt", "eating chips from a paper cone"], 2, 1.5, {drunk: 0.5}),
    tourist: P("a tourist", ["with a camera round the neck", "studying a map", "with a guidebook"], 2, 0.5, {areas: {merchant: 1.5, slums: 0.3}}),
    clubber: P("a clubgoer", ["in black, ears ringing", "glitter on the face", "hunting for a taxi"], 0, 2, {drunk: 0.7, stim: 0.2}),
    drinker: P("a drinker from the bar", ["swaying", "singing", "with a can in hand"], 0.3, 1.5, {drunk: 0.9, areas: {slums: 1.5, lower: 1.3}}),
    courier: P("a delivery rider", ["with a box on the back", "in a helmet"], 2, 1),
    shift: P("a shift worker", ["in a hospital tunic under a coat", "in a security jacket off duty", "yawning"], 0.5, 1.5),
    jogger: P("a jogger", ["in a tracksuit", "with headphones"], 1.5, 0.3, {areas: {slums: 0.3}}),
    homeless: P("someone sleeping rough", ["with a sleeping bag", "with a cardboard sign", "in three coats"], 1, 1.5, {areas: {slums: 2, merchant: 0.5}, drunk: 0.3})
  },
  future: {
    salaryman: P("a corporate worker", ["in a company jacket", "talking to a wrist screen", "with an ID badge"], 4, 0.5, {areas: {merchant: 1.5}}),
    courier: P("a courier", ["on an electric board", "in a reflective rain shell"], 2, 1.5),
    vendor: P("a street vendor", ["with a noodle cart", "selling cheap chips and cables"], 2, 1.5, {areas: {slums: 1.5, merchant: 0.5}}),
    shift: P("a shift worker", ["in a paper face mask", "in factory coveralls", "half asleep on the feet"], 1, 1.5),
    clubber: P("a clubgoer", ["with lit-up nails", "in mirrored glasses", "with a ringing in the ears"], 0, 1.5, {drunk: 0.5, stim: 0.3}),
    drinker: P("a drinker from a bar", ["swaying", "with a bottle in a bag"], 0.3, 1.2, {drunk: 0.9, areas: {slums: 1.5}}),
    homeless: P("someone sleeping rough", ["under a plastic sheet", "with a cardboard sign"], 1, 1.5, {areas: {slums: 2, merchant: 0.3}, drunk: 0.3}),
    watcher: P("a wary local", ["hood up, eyes on every camera", "walking fast, keeping to the wall"], 1, 1)
  }
};

/** Weight of a kind of person at this part of the day, in this street, in this year. */
export function weightOf(p, band, area = "market", year = 0) {
  if ( p.from && Number(year) && Number(year) < p.from ) return 0;
  const w = band === "day" ? p.day : band === "evening" ? (p.day + p.night) / 2 : p.night;
  return Math.max(0, w * (p.areas?.[area] ?? 1));
}

/** Pick one from weighted [key, weight] pairs; rng returns [0, 1). */
function pickWeighted(pairs, rng) {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  if ( !(total > 0) ) return null;
  let r = rng() * total;
  for ( const [k, w] of pairs ) { if ( (r -= w) < 0 ) return k; }
  return pairs.at(-1)[0];
}

/**
 * One passer-by: {kind, who, look, name, vesselState, drinks}. vesselState matches WoDX Actions VESSEL_STATES
 * (V20 pp. 295, 301-302). sick: an outbreak is on in the town (WoDX Storyteller), so some carry it.
 */
export function makePasserby({year, hour, area = "market", sick = false, place = "street", region = null, rng = Math.random} = {}) {
  const age = ageOf(year), band = bandOf(hour), table = streetTable(year, region);
  const kind = pickWeighted(Object.entries(table).map(([k, p]) => [k, weightOf(p, band, area, year) * placeWeight(p, place)]), rng)
    ?? Object.keys(table)[0];
  const p = table[kind];
  const look = p.looks[Math.floor(rng() * p.looks.length)] ?? "";
  const dark = band !== "day";
  let vesselState = "clean", drinks = 0;
  if ( dark && rng() < (p.drunk ?? 0.05) ) { vesselState = "drunk"; drinks = 2 + Math.floor(rng() * 5); }
  else if ( dark && p.stim && rng() < p.stim ) vesselState = "stimulant";
  else if ( sick && rng() < 0.25 ) vesselState = "disease";
  const name = `${p.who.charAt(0).toUpperCase()}${p.who.slice(1)} ${look}`.trim();
  return {kind, age, cat: p.cat, who: p.who, look, name, vesselState, drinks, tags: tagsFor(kind, p, year, rng, region)};
}

/*
 * Plain tags for rules that care who the vessel is (a Ventrue's palate, for one): station, sex, age band, faith and
 * origin. Never shown in game, so the descriptions stay gender-neutral. Faith and origin follow Moravia's history
 * (house readings): Catholic with a small Jewish community in the Middle Ages; Utraquist and Brethren Protestants
 * common from 1500 until 1620, then Catholic again; Protestants tolerated from 1781; Czech and German speakers side
 * by side until the Germans were expelled in 1945-1946; fewer churchgoers after 1948 and few in the Future Darkness.
 */
const YOUTH = new Set(["student", "apprentice", "jogger", "clubber", "newsboy"]);
const ELDER = new Set(["pensioner"]);
const STATION = {trade: "tradesperson", local: "townsperson", gentry: "gentry", worker: "labourer", street: "labourer", young: "student",
  servant: "servant", religious: "clergy", poor: "poor", drinker: "townsperson"};
function faithOf(year, rng) {
  const y = Number(year) || 1197, r = rng();
  if ( y < 1500 ) return r < 0.95 ? "catholic" : "jewish";
  if ( y < 1621 ) return r < 0.45 ? "catholic" : r < 0.95 ? "protestant" : "jewish";
  if ( y < 1781 ) return r < 0.94 ? "catholic" : "jewish";
  if ( y < 1946 ) return r < 0.8 ? "catholic" : r < 0.93 ? "protestant" : "jewish";
  if ( y < 2025 ) return r < 0.4 ? "catholic" : r < 0.45 ? "protestant" : null;
  return r < 0.15 ? "catholic" : null;
}
function originOf(year, kind, rng) {
  if ( kind === "tourist" || kind === "pilgrim" ) return "foreign";
  const y = Number(year) || 1197, r = rng();
  if ( y < 1946 ) return r < 0.62 ? "czech" : r < 0.97 ? "german" : "foreign";
  return r < 0.93 ? "czech" : r < 0.96 ? "slovak" : "foreign";
}
export function tagsFor(kind, p, year, rng = Math.random, region = null) {
  if ( region && region !== "moravia" ) return worldTags(kind, p, year, rng, region);
  const out = [kind, STATION[p.cat] ?? "townsperson", rng() < 0.5 ? "woman" : "man", YOUTH.has(kind) ? "youth" : ELDER.has(kind) ? "elder" : "adult"];
  if ( p.cat === "religious" ) out.push("catholic");
  else { const f = faithOf(year, rng); if ( f ) out.push(f); }
  const o = originOf(year, kind, rng);
  if ( o !== "foreign" ) out.push("moravian");
  out.push(o);
  return [...new Set(out)];
}

/** The street's table of people for a year in a region (null or Moravia: the central European one). */
export function streetTable(year, region = null) {
  const age = ageOf(year);
  if ( !region || region === "moravia" ) return PEOPLE[age];
  const sphere = sphereFor(region, year);
  /* 0.52.0 (B2674): then the region's own looks, so Fez and Isfahan no longer walk the same street */
  return localTable(tableFor(PEOPLE[age], sphere, age), region, sphere, age);
}
/** The region's era group for its mix of peoples (WoDX Chronicle ERA_GROUPS). */
const groupOf = y => y < 1500 ? "medieval" : y < 1800 ? "early-modern" : y < 1900 ? "industrial" : "modern";
/** Tags outside Moravia: the land's faith or the one an origin brings, and an origin from the region's mix. */
function worldTags(kind, p, year, rng, region) {
  const y = Number(year) || 1197;
  const out = [kind, STATION[p.cat] ?? "townsperson", rng() < 0.5 ? "woman" : "man", YOUTH.has(kind) ? "youth" : ELDER.has(kind) ? "elder" : "adult"];
  const mix = mixFor(region, groupOf(y));
  let origin = null;
  if ( kind === "tourist" || kind === "pilgrim" ) origin = "foreign";
  else if ( mix?.length ) {
    const total = mix.reduce((n, [, w]) => n + w, 0);
    let r = rng() * total;
    origin = mix.find(([, w]) => (r -= w) < 0)?.[0] ?? mix.at(-1)[0];
  }
  const land = faithFor(region, y);
  let faith = (origin && originFaith(origin)) || land;
  const secular = SECULAR[sphereFor(region, y)];
  const r = rng();
  if ( p.cat !== "religious" && secular && y >= secular && r < 0.5 ) faith = null;
  let tag = faith ? FAITH_TAG[faith] ?? null : null;
  const prot = PROTESTANT[region];
  if ( tag === "catholic" && prot && y >= prot[0] && rng() < prot[1] ) tag = "protestant";
  if ( tag ) out.push(tag);
  out.push(region);
  if ( origin ) out.push(origin);
  return [...new Set(out)];
}

/* ------------------------------------------------------------------ */
/*  Walking                                                            */
/* ------------------------------------------------------------------ */

/** A point on the edge of rect {x, y, width, height}, inset by pad. side 0 top, 1 right, 2 bottom, 3 left. */
export function edgePoint(rect, side, t, pad = 0) {
  const {x, y, width: w, height: h} = rect;
  const s = ((Math.floor(side) % 4) + 4) % 4, f = Math.min(1, Math.max(0, t));
  if ( s === 0 ) return {x: x + pad + f * (w - 2 * pad), y: y + pad};
  if ( s === 1 ) return {x: x + w - pad, y: y + pad + f * (h - 2 * pad)};
  if ( s === 2 ) return {x: x + pad + f * (w - 2 * pad), y: y + h - pad};
  return {x: x + pad, y: y + pad + f * (h - 2 * pad)};
}

/**
 * A walk: in from one edge, out by another. Three in ten stop a while somewhere inside first (B972).
 * Returns {start, waypoints: [{x, y, wait}], exitSide}. wait: seconds to stand at that point.
 */
export function planWalk(rect, {rng = Math.random, pad = 0} = {}) {
  const inSide = Math.floor(rng() * 4);
  const outSide = (inSide + 1 + Math.floor(rng() * 3)) % 4;
  const start = edgePoint(rect, inSide, rng(), pad);
  const waypoints = [];
  if ( rng() < 0.3 ) {
    waypoints.push({x: rect.x + rect.width * (0.2 + 0.6 * rng()), y: rect.y + rect.height * (0.2 + 0.6 * rng()), wait: 10 + Math.floor(rng() * 40)});
  }
  waypoints.push({...edgePoint(rect, outSide, rng(), pad), wait: 0, exit: true});
  return {start, waypoints, exitSide: outSide};
}

/** One step from a toward b, at most max pixels. */
export function stepToward(a, b, max) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
  if ( d <= max || d === 0 ) return {x: b.x, y: b.y, arrived: true};
  return {x: a.x + dx / d * max, y: a.y + dy / d * max, arrived: false};
}

/** The nearest point on the edge of rect to p: where someone running away heads. */
export function nearestExit(rect, p, pad = 0) {
  const d = [p.y - rect.y, rect.x + rect.width - p.x, rect.y + rect.height - p.y, p.x - rect.x];
  const side = d.indexOf(Math.min(...d));
  const t = side % 2 === 0 ? (p.x - rect.x) / (rect.width || 1) : (p.y - rect.y) / (rect.height || 1);
  return {...edgePoint(rect, side, t, pad), exit: true, wait: 0};
}

/** A character this close (pixels) makes a passer-by stop: to be spoken to, asked the way, or led aside. */
export function holdsFor(me, pcs = [], reach) {
  return (pcs ?? []).some(p => Math.hypot(p.x - me.x, p.y - me.y) <= reach);
}

/** Where a follower stands: one step behind the leader, on the near side. */
export function followSpot(me, leader, gap) {
  const dx = me.x - leader.x, dy = me.y - leader.y, d = Math.hypot(dx, dy);
  if ( d <= gap * 1.2 ) return null;
  return {x: leader.x + (d ? dx / d : 0) * gap, y: leader.y + (d ? dy / d : 0) * gap};
}

/** Real-time milliseconds a kept passer-by (fed on, hurt, led away) waits before startup clears it anyway. */
export const KEPT_FOR = 24 * 60 * 60 * 1000;

/** A street tick that runs past STALE_MS is taken as lost; one gives up after TICK_MS (NPC 0.40.1). */
export const TICK_MS = 20 * 1000;
export const STALE_MS = 30 * 1000;
export const tickStale = (since, now = Date.now()) => !since || now - since > STALE_MS;
/** A promise that rejects after ms if p has not settled. */
export function withTimeout(p, ms) {
  let t;
  return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`passers-by tick took over ${ms} ms`)), ms); })]).finally(() => clearTimeout(t));
}

/**
 * Should a passer-by token go now? flag: its flags.wodx-npc.passerby; live: is its scene on and in view;
 * now: Date.now(). A kept one stays on its own scene until let go, and startup clears it after a day.
 */
export function shouldRemove(flag, {live = true, now = Date.now(), startup = false} = {}) {
  if ( !flag ) return false;
  if ( flag.kept ) return startup && now - (Number(flag.keptAt) || 0) > KEPT_FOR;
  if ( startup || !live ) return true;
  return now > (Number(flag.expires) || 0);
}

/** The state of a passer-by after a tick, from what happened to it. */
export function keepIf(flag, {bloodLost = false, hurt = false, following = false, touched = null} = {}) {
  if ( flag.kept ) return flag;
  if ( bloodLost || hurt || following || touched ) return {...flag, kept: true, keptAt: Date.now(), why: bloodLost ? "fed" : hurt ? "hurt" : following ? "led" : touched};
  return flag;
}

/* ------------------------------------------------------------------ */
/*  Animals (Ben 2026-11-11)                                           */
/* ------------------------------------------------------------------ */

/*
 * Animals in the street. vessel: the WoDX Actions VESSELS key, so feeding takes the right blood (that table gives a
 * rat or bat at a quarter point, a cat 1, a dog 2, a cow or horse 5). Pigs and cattle count as a cow (5) and a goat
 * as a dog (2): house readings. Animals are never Masquerade witnesses and draining one is no killing of a person.
 */
const A = (who, looks, vessel, day, night, more = {}) => ({who, looks, vessel, day, night, ...more});
const STRAYS = {
  dog: A("a stray dog", ["nosing in the gutter", "thin as a rake", "with a torn ear"], "dog", 1.5, 1.5, {areas: {slums: 1.5, merchant: 0.5}}),
  cat: A("a cat", ["on a windowsill", "slinking along the wall", "with a mouse in its jaws"], "cat", 1, 2),
  rat: A("a rat", ["in the gutter", "on a midden heap", "under a cart"], "rat", 0.5, 3, {areas: {slums: 2, merchant: 0.5}}),
  bird: A("a pigeon", ["pecking at crumbs", "on a ledge"], "bird", 2, 0.2)
};
export const ANIMALS = {
  medieval: {...STRAYS,
    bird: A("a crow", ["picking at refuse", "on a gable"], "bird", 2, 0.2),
    pig: A("a pig rooting in the street", ["in the muck", "with a notched ear"], "cow", 2, 0.5, {areas: {slums: 2, merchant: 0.5}}),
    goat: A("a goat", ["tethered by a door", "chewing a thatch"], "dog", 1, 0.3),
    geese: A("a goose driven to market", ["hissing", "honking at the dogs"], "bird", 1.5, 0, {areas: {market: 2}}),
    horse: A("a horse led by the bridle", ["with a load of firewood", "lame in one leg"], "cow", 1.5, 0.2),
    cattle: A("a cow driven to the shambles", ["lowing", "with a rope halter"], "cow", 0.5, 0, {areas: {market: 2, merchant: 0.3}})},
  early: {...STRAYS,
    pig: A("a pig rooting in the street", ["in the muck"], "cow", 1, 0.3, {areas: {slums: 2, merchant: 0.3}}),
    horse: A("a horse", ["tied at an inn door", "pulling a cart"], "cow", 2, 0.5),
    geese: A("a goose driven to market", ["hissing"], "bird", 1, 0, {areas: {market: 2}})},
  industrial: {...STRAYS,
    horse: A("a cab horse", ["dozing in its traces", "with a nosebag"], "cow", 2, 1),
    pig: A("a pig in a yard", ["behind a slum tenement"], "cow", 0.3, 0.1, {areas: {slums: 2, merchant: 0}})},
  c20: {...STRAYS,
    horse: A("a dray horse", ["pulling a brewery cart"], "cow", 0.5, 0.1, {until: 1960})},
  modern: {...STRAYS,
    dog: A("a dog off its lead", ["with a collar and tag", "sniffing a lamppost"], "dog", 1.5, 1)},
  future: {...STRAYS}
};
/** Animals per person in the street, by age: towns had far more beasts in them before the motor car. */
export const ANIMAL_SHARE = {medieval: 0.6, early: 0.5, industrial: 0.35, c20: 0.2, modern: 0.15, future: 0.2};

/** How many animals the street holds now (on top of the people, within the same cap). */
export function animalCount({year, hour, area = "market", density = "normal", max = 8, people = null, place = "street"} = {}) {
  const age = ageOf(year), band = bandOf(hour);
  const base = CROWD[age]?.[band] ?? 0;
  // After dark the rats and cats come out even where people do not
  const pl = placeOf(place);
  if ( !Object.values(pl.animals ?? {}).some(v => v > 0) ) return 0;
  const n = (base * (AREA_CROWD[area] ?? 1) * (DENSITY[density]?.mult ?? 1) * (pl.crowd ?? 1) * (pl.share ?? 1) * (ANIMAL_SHARE[age] ?? 0.2)) + (band === "day" || pl.indoor ? 0 : 1);
  const room = Math.max(0, Math.min(MAX_CAP, Math.floor(Number(max) || 0)) - (people ?? 0));
  return Math.max(0, Math.min(room, Math.round(n)));
}

/** One animal: {kind, who, look, name, vessel, animal: true}. */
export function makeAnimal({year, hour, area = "market", place = "street", rng = Math.random} = {}) {
  const age = ageOf(year), band = bandOf(hour), table = ANIMALS[age];
  const w = (p) => (p.until && Number(year) && Number(year) > p.until) ? 0 : weightOf(p, band, area, year) * placeWeight(p, place, true);
  const kind = pickWeighted(Object.entries(table).map(([k, p]) => [k, w(p)]), rng);
  if ( !kind ) return null;
  const p = table[kind];
  const look = p.looks[Math.floor(rng() * p.looks.length)] ?? "";
  const name = `${p.who.charAt(0).toUpperCase()}${p.who.slice(1)} ${look}`.trim();
  return {kind, age, who: p.who, look, name, vessel: p.vessel, animal: true, vesselState: "clean", drinks: 0, tags: ["animal", kind, p.vessel, p.cat]};
}

/** Blood points a vessel kind holds (WoDX Actions VESSELS); a token keeps at least 1 on its sheet. */
export const VESSEL_POOL = {human: 10, cow: 5, dog: 2, cat: 1, bird: 0.5, rat: 0.25};

/* ------------------------------------------------------------------ */
/*  Kinds of place (Ben 2026-11-11)                                    */
/* ------------------------------------------------------------------ */

/** What kind of person each is, for where they are found. */
const PERSON_CAT = {
  carter: "trade", wagoner: "trade", hawker: "trade", peddler: "trade", courier: "trade", cabman: "trade", vendor: "trade", newsboy: "trade",
  peasant: "local", shopper: "local", pensioner: "local", soldier: "local", conductor: "local", watcher: "local", tourist: "gentry",
  burgher: "gentry", clerk: "gentry", commuter: "gentry", salaryman: "gentry",
  apprentice: "worker", hand: "worker", worker: "worker", shift: "worker", nightshift: "worker", sweeper: "worker", laundry: "worker",
  gongfarmer: "street", lamplighter: "street", jogger: "young", student: "young", journeyman: "worker",
  servant: "servant", friar: "religious", priest: "religious", pilgrim: "religious",
  beggar: "poor", homeless: "poor", reveller: "drinker", drinker: "drinker", clubber: "drinker"
};
/** What kind of animal each is. */
const ANIMAL_CAT = {pig: "livestock", goat: "livestock", cattle: "livestock", horse: "livestock", geese: "poultry", dog: "stray", cat: "cat", rat: "rat", bird: "bird"};
for ( const t of Object.values(PEOPLE) ) for ( const [k, p] of Object.entries(t) ) p.cat = PERSON_CAT[k] ?? "local";
// 0.51.0: the kinds only other ways of life have
Object.assign(PERSON_CAT, {water: "trade", scholar: "young", griot: "trade", sailor: "worker", herder: "local", runner: "trade", fisher: "trade", cleric: "religious"});
for ( const s of Object.values(PEOPLE_WORLD) ) for ( const t of Object.values(s) ) for ( const [k, p] of Object.entries(t ?? {}) ) if ( p ) p.cat = PERSON_CAT[k] ?? "local";
// 0.52.0 (B2674): the kinds only one region has
Object.assign(PERSON_CAT, {tanner: "worker", teller: "trade", porter: "worker", boatman: "worker", mamluk: "gentry", dates: "trade", tea: "trade",
  diver: "worker", fur: "trade", exile: "street", weaver: "trade", catechist: "religious", gold: "trade", hunter: "local", vaquero: "worker",
  prospector: "worker", voyageur: "worker", gatherer: "local", convict: "street", drover: "worker", digger: "worker", carver: "trade",
  whaler: "worker", copra: "trade", coffee: "worker", gaucho: "worker", muleteer: "worker", link: "street", coster: "trade", skipper: "worker",
  amber: "trade", shepherd: "local"});
for ( const s of Object.values(LOCAL_LOOKS) ) for ( const ages of Object.values(s) ) for ( const t of Object.values(ages) ) {
  for ( const [k, p] of Object.entries(t ?? {}) ) if ( p?.who ) p.cat = PERSON_CAT[k] ?? "local";
}
for ( const t of Object.values(ANIMALS) ) for ( const [k, p] of Object.entries(t) ) p.cat = ANIMAL_CAT[k] ?? "stray";

/*
 * Kinds of place the Storyteller gives a scene. crowd: how busy against a street; people: more or fewer of each kind
 * of person (unlisted 1); animals: every kind listed, 0 where it is not found: no livestock in a back alley, no birds
 * or strays indoors in a palace. indoor: no one comes in drunk from the weather, and the lamplighter stays outside.
 */
const NONE = {livestock: 0, poultry: 0, stray: 0, cat: 0, rat: 0, bird: 0};
export const PLACES = {
  street: {label: "Street", crowd: 1, people: {}, animals: {livestock: 0.6, poultry: 0.5, stray: 1, cat: 1, rat: 1, bird: 1}},
  alley: {label: "Back alley or courtyard", crowd: 0.4, people: {gentry: 0.2, trade: 0.3, religious: 0.3, servant: 0.5, drinker: 1.5, poor: 1.5, worker: 1.2},
    animals: {...NONE, stray: 1.2, cat: 1.5, rat: 2, bird: 0.4}},
  square: {label: "Market square", crowd: 1.4, people: {trade: 1.5, gentry: 1.2, local: 1.2}, animals: {livestock: 1, poultry: 1.5, stray: 1, cat: 0.5, rat: 0.5, bird: 2}},
  yard: {label: "Farmyard, stable or village", crowd: 0.4, share: 3, people: {gentry: 0.2, drinker: 0.3, trade: 1.2, worker: 1.2, local: 1.5, street: 0, young: 0.3},
    animals: {livestock: 3, poultry: 3, stray: 1, cat: 1, rat: 1, bird: 1}},
  road: {label: "Country road", crowd: 0.3, people: {trade: 2, religious: 1.5, local: 1, gentry: 0.3, drinker: 0.2, street: 0, poor: 0.5, servant: 0.3},
    animals: {livestock: 2, poultry: 0.5, stray: 0.5, cat: 0, rat: 0.2, bird: 1}},
  docks: {label: "Docks or riverside", crowd: 0.8, people: {trade: 1.5, worker: 2, drinker: 1.2, gentry: 0.3, religious: 0.3},
    animals: {livestock: 0.3, poultry: 0.3, stray: 1, cat: 1, rat: 3, bird: 2}},
  park: {label: "Park, garden or churchyard", crowd: 0.6, people: {young: 2, gentry: 1, poor: 1, trade: 0.3, worker: 0.5},
    animals: {...NONE, stray: 1, cat: 1, rat: 0.5, bird: 2}},
  tavern: {label: "Tavern, inn or bar (indoors)", crowd: 1, indoor: true, people: {drinker: 3, trade: 1, worker: 1, gentry: 0.6, religious: 0.2, street: 0, poor: 0.3},
    animals: {...NONE, stray: 0.4, cat: 1, rat: 0.5}},
  church: {label: "Church or chapel (indoors)", crowd: 0.4, indoor: true, people: {religious: 4, poor: 1.5, local: 1.2, drinker: 0, street: 0, trade: 0.3, young: 0.5},
    animals: {...NONE, cat: 0.3, rat: 0.5}},
  interior: {label: "Palace, hall or great house (indoors)", crowd: 0.5, indoor: true,
    people: {servant: 5, gentry: 2, religious: 0.5, trade: 0.2, worker: 0.4, poor: 0, drinker: 0.2, street: 0, local: 0.3, young: 0.3},
    animals: {...NONE, cat: 0.6, rat: 0.3}}
};
PLACES.home = {label: "Home (indoors)", crowd: 0.2, indoor: true, people: {servant: 2, local: 2, gentry: 0.5, poor: 0, drinker: 0.2, street: 0, trade: 0.2, religious: 0.3},
  animals: {...NONE, stray: 0.5, cat: 1, rat: 0.5}};
PLACES.workplace = {label: "Workplace or shop (indoors)", crowd: 0.5, indoor: true, people: {trade: 2, worker: 2, gentry: 1, local: 1, poor: 0.2, drinker: 0.1, street: 0},
  animals: {...NONE, cat: 1, rat: 0.6}};
PLACES.sewer = {label: "Sewer, cellar or tunnels", crowd: 0.1, people: {poor: 3, worker: 1, drinker: 0.5, gentry: 0, servant: 0, religious: 0, trade: 0.2, young: 0.2, local: 0.2, street: 1},
  animals: {...NONE, rat: 4, cat: 0.3, stray: 0.3}};
PLACES.hospital = {label: "Hospital or asylum (indoors)", crowd: 0.5, indoor: true, people: {religious: 2, servant: 1.5, worker: 1.5, local: 1.5, poor: 1, gentry: 0.5, drinker: 0, street: 0, trade: 0.2},
  animals: {...NONE, cat: 0.3, rat: 0.3}};
PLACES.station = {label: "Station or depot", crowd: 1.2, people: {trade: 1.5, gentry: 1.5, worker: 1.2, local: 1.2, young: 1.2, religious: 0.3},
  animals: {...NONE, stray: 0.6, cat: 0.3, rat: 1, bird: 1.5}};
PLACES.elysium = {label: "Elysium (indoors): a thin, well-dressed evening crowd", crowd: 0.3, indoor: true,
  people: {gentry: 4, servant: 3, trade: 0.3, religious: 0.2, worker: 0.2, local: 0.3, young: 0.5, poor: 0, drinker: 0.3, street: 0},
  animals: {...NONE, cat: 0.2}};
PLACES.none = {label: "Nobody passes", crowd: 0, people: {}, animals: {...NONE}};
/*
 * The kind of place is WoDX NPC's own place tag (flags.wodx-npc.place.kind, PLACE_KINDS in routine-rules.mjs), the one
 * Interactables, Atmosphere and the Masquerade read; this is the crowd each kind draws. A haven or a chantry draws nobody.
 */
export const CROWD_OF_KIND = {street: "street", market: "square", church: "church", mosque: "church", synagogue: "church", temple: "church", tavern: "tavern", castle: "interior", home: "home",
  workplace: "workplace", gate: "street", haven: "none", wilds: "road", caern: "road", alley: "alley", yard: "yard", docks: "docks", park: "park", sewer: "sewer", hospital: "hospital", station: "station", elysium: "elysium", chantry: "none", office: "workplace", courthouse: "interior", technocracy: "workplace", other: "street"};
/** The crowd profile for a kind of place (a PLACE_KINDS key, or a crowd profile key). */
export const placeOf = key => PLACES[CROWD_OF_KIND[key] ?? key] ?? PLACES.street;
/** How a kind of place weighs a person or animal (p.cat). */
export function placeWeight(p, place = "street", animal = false) {
  const pl = placeOf(place);
  if ( animal ) return Number(pl.animals?.[p.cat] ?? 0);
  return Number(pl.people?.[p.cat] ?? 1);
}
