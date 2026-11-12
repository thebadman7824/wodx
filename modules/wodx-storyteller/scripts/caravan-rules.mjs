/**
 * WoDX Storyteller 0.49.0: caravans, the trade between linked markets made into something on the road. Pure rules.
 *
 * When the weekly market turn has two linked markets trade, the goods leave as a caravan: a pack train in 1197, a
 * wagon train later, a goods train once the railways come, lorries after 1920 and an automated convoy in the World of
 * Future Darkness. It carries the kinds whose supply it will lift where they are short (ship) and up to three kinds
 * that are dear at the far end (kinds). The sending market gives up its goods at once; the market in want gets them
 * only when the caravan comes in. A caravan lost on the road delivers nothing, and what was dear grows dearer.
 *
 * A caravan has a place on the road at any hour: a share of the way, and, where both markets sit on the country map,
 * the ground it is crossing. It stands in its market of arrival for two days. Player characters who travel the same
 * road while it is out are told of it, and a raid on either market takes the caravan before it takes the stalls.
 * Every number here is a house rule (B2386 to B2389). The books give no rules for freight.
 */
import {SUPPLY, INDEX} from "./market-rules.mjs";

export const STATE_VERSION = 1;
export const DAY = 86400;
export const DEFAULT_KM = 40;
export const MAX_DAYS = 12;
export const IN_TOWN_DAYS = 2;
export const LOST_KEPT_DAYS = 7;
export const CARGO_MAX = 3;
export const LOSS_SHIFT = 0.1;
export const LIST_CAP = 60;

/** How freight moves in a year: the name of the caravan and the kilometres it makes in a day. */
export const FREIGHT = [
  {id: "pack", until: 1499, label: "a pack train", plural: "pack trains", kmDay: 25},
  {id: "wagon", until: 1839, label: "a wagon train", plural: "wagon trains", kmDay: 30},
  {id: "rail", until: 1919, label: "a goods train", plural: "goods trains", kmDay: 250, minKm: 20, short: "wagon"},
  {id: "lorry", until: 2019, label: "a lorry convoy", plural: "lorry convoys", kmDay: 500},
  {id: "auto", until: Infinity, label: "an automated freight convoy", plural: "automated freight convoys", kmDay: 700}
];
export function freightFor(year, km = DEFAULT_KM, {future = false} = {}) {
  const y = Number(year) || 0;
  let f = future ? FREIGHT[FREIGHT.length - 1] : FREIGHT.find(x => y <= x.until) ?? FREIGHT[FREIGHT.length - 1];
  if ( f.minKm && km < f.minKm ) f = FREIGHT.find(x => x.id === f.short) ?? f;
  return f;
}

const deep = o => JSON.parse(JSON.stringify(o));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round2 = v => Math.round(v * 100) / 100;
const LEVELS = ["none", "short", "normal", "plenty"];
const supOf = (m, k) => (SUPPLY[m?.supply?.[k]] ? m.supply[k] : "normal");
const idxOf = (m, k) => (Number.isFinite(Number(m?.index?.[k])) ? Number(m.index[k]) : 1);

export const blankState = () => ({v: STATE_VERSION, list: []});
export function normCaravan(c = {}) {
  if ( !c?.id || !c.from || !c.to || c.from === c.to ) return null;
  const left = Number(c.left), arrive = Number(c.arrive);
  if ( !Number.isFinite(left) || !Number.isFinite(arrive) || arrive <= left ) return null;
  const strs = a => [...new Set((Array.isArray(a) ? a : []).map(String).filter(Boolean))];
  const legs = (Array.isArray(c.legs) ? c.legs : []).filter(l => Number(l?.minutes) > 0).slice(0, 40)
    .map(l => ({from: String(l.from ?? ""), to: String(l.to ?? ""), minutes: Math.round(Number(l.minutes)), land: l.land ? String(l.land) : null}));
  return {id: String(c.id), from: String(c.from), to: String(c.to), fromName: String(c.fromName ?? "a market").slice(0, 80), toName: String(c.toName ?? "a market").slice(0, 80),
    ship: strs(c.ship), kinds: strs(c.kinds).slice(0, CARGO_MAX), way: FREIGHT.some(f => f.id === c.way) ? c.way : "wagon",
    km: Math.max(1, Math.round((Number(c.km) || DEFAULT_KM) * 10) / 10), left, arrive, guard: clamp(Math.round(Number(c.guard) || 0), 0, 5),
    state: ["road", "town", "lost"].includes(c.state) ? c.state : "road", ended: Number.isFinite(Number(c.ended)) ? Number(c.ended) : null,
    by: c.by ? String(c.by).slice(0, 120) : null, legs};
}
export function normState(s) {
  const out = blankState(), seen = new Set();
  for ( const c of s?.list ?? [] ) {
    const n = normCaravan(c);
    if ( n && !seen.has(n.id) ) { seen.add(n.id); out.list.push(n); }
  }
  out.list = out.list.slice(-LIST_CAP);
  return out;
}

/**
 * The cargo that leaves this week, one caravan a direction of a link. shipments: [{from, to, kind}] goods on their
 * way to lift a supply; trades: [{cheap, dear, kind, gap}] kinds whose prices are meeting.
 * Returns [{from, to, ship: [kinds], kinds: [kinds]}].
 */
export function cargoes(shipments = [], trades = []) {
  const by = new Map();
  const at = (from, to) => { const k = `${from}>${to}`; if ( !by.has(k) ) by.set(k, {from, to, ship: [], kinds: [], gaps: []}); return by.get(k); };
  for ( const s of shipments ) { const c = at(s.from, s.to); if ( !c.ship.includes(s.kind) ) c.ship.push(s.kind); }
  for ( const t of trades ) at(t.cheap, t.dear).gaps.push({kind: t.kind, gap: Math.abs(Number(t.gap) || 0)});
  return [...by.values()].map(c => ({from: c.from, to: c.to, ship: c.ship,
    kinds: c.gaps.sort((a, b) => b.gap - a.gap || a.kind.localeCompare(b.kind)).map(g => g.kind).filter(k => !c.ship.includes(k)).slice(0, CARGO_MAX)}))
    .filter(c => c.ship.length || c.kinds.length);
}

/** A caravan setting out. cargo: one of cargoes(); names: {from, to}; km and legs from the trip between the markets. */
export function setOut(cargo, {id, now = 0, year = 1197, km = null, legs = [], names = {}, guard = 1, future = false} = {}) {
  const dist = Number(km) > 0 ? Number(km) : DEFAULT_KM;
  const f = freightFor(year, dist, {future});
  const days = clamp(Math.ceil(dist / f.kmDay), 1, MAX_DAYS);
  return normCaravan({id, from: cargo.from, to: cargo.to, fromName: names.from, toName: names.to, ship: cargo.ship, kinds: cargo.kinds,
    way: f.id, km: dist, left: now, arrive: now + (days * DAY), guard, state: "road", legs});
}
export const freightOf = c => FREIGHT.find(f => f.id === c?.way) ?? FREIGHT[1];
export const daysOf = c => Math.round((c.arrive - c.left) / DAY);

/** The guard a caravan hires: one, two when its sender keeps armed followers, one more when the road was raided of late. */
export const guardFor = ({senderForce = 0, raidedLately = false} = {}) => clamp(1 + (senderForce >= 3 ? 1 : 0) + (raidedLately ? 1 : 0), 0, 5);

/** The share of the way done at a moment, 0 to 1. */
export const shareDone = (c, now) => clamp((Number(now) - c.left) / Math.max(1, c.arrive - c.left), 0, 1);

/** Where a caravan is, in words. landWords: {plain: "open plain", ...} for the legs of a trip across the country map. */
export function whereWords(c, now, landWords = {}) {
  if ( c.state === "lost" ) return `lost on the road between ${c.fromName} and ${c.toName}`;
  if ( c.state === "town" ) return `in ${c.toName}`;
  const s = shareDone(c, now);
  if ( c.legs.length ) {
    const total = c.legs.reduce((a, l) => a + l.minutes, 0);
    let left = s * total;
    for ( const l of c.legs ) {
      if ( left < l.minutes ) return `in the ${landWords[l.land] ?? "country"} between ${l.from} and ${l.to}`;
      left -= l.minutes;
    }
  }
  if ( s < 0.25 ) return `not long out of ${c.fromName}`;
  if ( s > 0.75 ) return `nearing ${c.toName}`;
  return `about half way between ${c.fromName} and ${c.toName}`;
}

/**
 * Bring the list up to a moment. A caravan whose time has come stands in its market; one that has stood two days,
 * or was lost a week ago, leaves the list. Returns {state, arrived: [caravans that came in just now]}.
 */
export function tick(state, now) {
  const next = normState(state), arrived = [];
  const keep = [];
  for ( const c of next.list ) {
    if ( c.state === "road" && now >= c.arrive ) { c.state = "town"; c.ended = c.arrive; arrived.push(deep(c)); }
    if ( c.state === "town" && now >= (c.ended ?? c.arrive) + (IN_TOWN_DAYS * DAY) ) continue;
    if ( c.state === "lost" && now >= (c.ended ?? c.arrive) + (LOST_KEPT_DAYS * DAY) ) continue;
    keep.push(c);
  }
  next.list = keep;
  return {state: next, arrived};
}

/** A caravan comes in: each kind it ships lifts that supply a step at its market. Returns {markets state, changes}. */
export function deliver(markets, c) {
  const next = deep(markets ?? {markets: []}), changes = [];
  const m = (next.markets ?? []).find(x => x.id === c.to);
  if ( !m ) return {state: next, changes};
  m.supply ??= {};
  for ( const k of c.ship ) {
    const from = supOf(m, k), to = LEVELS[Math.min(LEVELS.length - 1, LEVELS.indexOf(from) + 1)];
    if ( to === from ) continue;
    if ( to === "normal" ) delete m.supply[k]; else m.supply[k] = to;
    changes.push({id: m.id, name: m.name, kind: k, from, to});
  }
  return {state: next, changes};
}

/** A caravan is lost: nothing it shipped arrives, and every kind it carried grows dearer where it was bound. */
export function lose(markets, c) {
  const next = deep(markets ?? {markets: []}), changes = [];
  const m = (next.markets ?? []).find(x => x.id === c.to);
  if ( !m ) return {state: next, changes};
  m.index ??= {};
  for ( const k of [...new Set([...c.ship, ...c.kinds])] ) {
    const from = idxOf(m, k), to = round2(clamp(from + LOSS_SHIFT, INDEX.min, INDEX.max));
    if ( to === from ) continue;
    if ( to === 1 ) delete m.index[k]; else m.index[k] = to;
    changes.push({id: m.id, name: m.name, kind: k, from, to});
  }
  return {state: next, changes};
}
export function markLost(state, id, {now = 0, by = null} = {}) {
  const next = normState(state);
  const c = next.list.find(x => x.id === id);
  if ( !c || c.state !== "road" ) return {state: next, caravan: null};
  c.state = "lost"; c.ended = now; c.by = by;
  return {state: next, caravan: deep(c)};
}

/** Caravans out on the road to or from a market. */
export const onRoadAt = (state, marketId) => (state?.list ?? []).filter(c => c.state === "road" && (c.from === marketId || c.to === marketId));
/** Caravans on the road between two markets, either way, at any time in a span. */
export const between = (state, a, b, t0, t1) => (state?.list ?? []).filter(c => c.state === "road"
  && ((c.from === a && c.to === b) || (c.from === b && c.to === a)) && c.left <= t1 && c.arrive >= t0);
/** Markets with a caravan standing in them. */
export const inTown = state => [...new Set((state?.list ?? []).filter(c => c.state === "town").map(c => c.to))];

/** One line for a caravan. kindLabel: a goods kind to words. */
export function describe(c, {kindLabel = k => k} = {}) {
  const load = [...c.ship, ...c.kinds].map(kindLabel);
  const f = freightOf(c);
  return `${f.label[0].toUpperCase()}${f.label.slice(1)} from ${c.fromName} to ${c.toName}${load.length ? ` with ${load.join(", ")}` : ""}`;
}
