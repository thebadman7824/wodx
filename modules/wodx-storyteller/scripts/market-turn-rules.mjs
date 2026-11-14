/**
 * WoDX Storyteller 0.48.0: the weekly market turn (the living economy, steps 3 to 5 of the study Ben approved on
 * 2026-11-11). Pure rules, no Foundry.
 *
 * Once a week of game time every market that is not cut off takes one turn, in this order:
 *   Making     A kind the town's working places make (WoDX holdings) does not stay below what they keep up:
 *              one working place keeps it at normal, three or more at plenty. A turn lifts it one step.
 *   Recovery   A supply that is short, empty or plentiful comes back one step toward normal once it has stood
 *              a few weeks (never below what the workshops keep up).
 *   Trade      Linked markets trade. Where one has two steps more of a kind than the other, goods move: the richer
 *              steps down, the poorer up. Prices meet part way, more in an age of railways and lorries.
 *   Prices     Each price index drifts toward what its supply and the season call for, never more than a small
 *              step a week.
 * Seasons follow the year: winter and the lean months before harvest make food and fuel dear, the harvest makes
 * food cheap. The pull is full before 1850, half until 1950, and slight after, when goods come from far away.
 *
 * A change that takes a kind away from normal toward want (normal to short, or anything to none) is big. In a
 * market where a player character is, a big change waits in the approval queue; elsewhere it goes through quietly.
 * After a long skip, twelve weeks are played and the rest settle at once: supply back to normal (or what the
 * workshops keep up) and prices where the season puts them. A cut-off market is left as it is.
 * Every number here is a house rule (B2370 to B2376).
 *
 * Storyteller 0.49.0: the turn takes three things from the runner. shift(market, kind) is what taxes and monopolies add
 * to a price's goal; blocked(a, b) is a road a raid has closed, along which nothing trades; and defer leaves the goods
 * bound for a market in want on the road (shipments) for a caravan to bring in, with the kinds whose prices are meeting
 * (trades) as the rest of its load. onWay(market id, kind) says a caravan already carries that kind there, so no more is sent.
 */
import {SUPPLY, INDEX} from "./market-rules.mjs";

export const WEEK = 7 * 24 * 60 * 60;
export const TURN_CAP = 12;
export const LEVELS = ["none", "short", "normal", "plenty"];
/** The price a supply level calls for. */
export const SUPPLY_PRICE = {none: 2.2, short: 1.4, normal: 1, plenty: 0.8};
/** Weeks a level stands before one step back toward normal. */
export const RECOVER = {none: 2, short: 3, plenty: 2};
/** Share of the gap a price closes in a week, and the most it moves (a small swing, per the study). */
export const DRIFT = 0.35;
export const SMALL = 0.2;
/** Gap between linked markets' prices that starts talk of dear and cheap goods, and the gap that ends it. */
export const RUMOUR_GAP = 0.6;
export const RUMOUR_END = 0.3;

const round2 = v => Math.round(v * 100) / 100;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const clampIndex = v => round2(clamp(v, INDEX.min, INDEX.max));
const step = l => Math.max(0, LEVELS.indexOf(SUPPLY[l] ? l : "normal"));
const level = n => LEVELS[clamp(n, 0, LEVELS.length - 1)];
const NORMAL = step("normal");

/** How much the season moves prices in a year: 1 before 1850, 0.5 until 1950, 0.15 after. */
export function seasonDamp(year) {
  const y = Number(year) || 0;
  return y < 1850 ? 1 : y < 1950 ? 0.5 : 0.15;
}

/** Season shifts by kind and month (1 to 12), before damping. */
export const SEASON = {
  food: {12: 0.25, 1: 0.25, 2: 0.25, 3: 0.15, 4: 0.15, 5: 0.15, 6: 0.15, 8: -0.2, 9: -0.2, 10: -0.2},
  fuel: {11: 0.3, 12: 0.3, 1: 0.3, 2: 0.3, 3: 0.3, 6: -0.1, 7: -0.1, 8: -0.1},
  light: {11: 0.15, 12: 0.15, 1: 0.15, 2: 0.15},
  drink: {9: -0.1, 10: -0.1},
  seeds: {3: 0.2, 4: 0.2, 9: -0.1, 10: -0.1}
};
export function seasonShift(kind, month, year) {
  return round2((SEASON[kind]?.[Number(month)] ?? 0) * seasonDamp(year));
}

/** Share of the price gap linked markets close in a week: cart and river, then railways, then lorries. */
export function tradeShare(year) {
  const y = Number(year) || 0;
  return y < 1830 ? 0.15 : y < 1920 ? 0.3 : 0.5;
}

/** The price index a kind's supply and the season call for. */
export const targetIndex = (lvl, kind, month, year) => clampIndex((SUPPLY_PRICE[lvl] ?? 1) + seasonShift(kind, month, year));

/** The level the working places keep a kind at: null (none), normal (1 or 2), plenty (3 or more). */
export const floorOf = n => (n >= 3 ? "plenty" : n >= 1 ? "normal" : null);

const deep = o => JSON.parse(JSON.stringify(o));
const idxOf = (m, k) => (Number.isFinite(Number(m.index?.[k])) ? Number(m.index[k]) : 1);
const supOf = (m, k) => (SUPPLY[m.supply?.[k]] ? m.supply[k] : "normal");
function setIdx(m, k, v) { const x = clampIndex(v); if ( x === 1 ) delete m.index[k]; else m.index[k] = x; }
function setSup(m, k, l) { if ( l === "normal" ) delete m.supply[k]; else m.supply[k] = l; }

/**
 * One week for every market. state: the markets state ({markets}); kinds: the goods kinds; month, year: the turn's
 * date; works: {marketId: {kind: working places}}; pcMarkets: ids of markets where a player character is.
 * Returns {state (a new copy), changes: [{id, name, kind, from: {index, supply}, to: {index, supply}, why: [], big, queue}]}.
 * Queued changes are left out of the returned state: they land only when the Storyteller approves them.
 */
export function weekTurn(state, {kinds = [], month = 1, year = 1197, works = {}, pcMarkets = [], shift = () => 0, blocked = () => false, defer = false, onWay = () => false} = {}) {
  const next = deep(state ?? {markets: []});
  next.markets ??= [];
  const pcs = new Set(pcMarkets);
  const before = new Map(next.markets.map(m => [m.id, deep(m)]));
  const why = new Map();
  const say = (id, k, w) => { const key = `${id}|${k}`; if ( !why.has(key) ) why.set(key, []); if ( !why.get(key).includes(w) ) why.get(key).push(w); };
  const open = next.markets.filter(m => !m.cut);
  for ( const m of open ) { m.index ??= {}; m.supply ??= {}; m.seen ??= {}; }

  // Making and recovery
  for ( const m of open ) for ( const k of kinds ) {
    const floor = floorOf(works[m.id]?.[k] ?? 0);
    const now = step(supOf(m, k)), fl = floor ? step(floor) : -1;
    if ( fl >= 0 && now < fl ) { setSup(m, k, level(now + 1)); say(m.id, k, "the town's workshops make more"); continue; }
    const lvl = supOf(m, k), weeks = m.seen[k]?.level === lvl ? m.seen[k].weeks : 0;
    if ( lvl !== "normal" && weeks >= (RECOVER[lvl] ?? 99) ) {
      const to = now < NORMAL ? now + 1 : now - 1;
      if ( to >= fl ) { setSup(m, k, level(to)); say(m.id, k, now < NORMAL ? "goods come back to the stalls" : "the glut is used up"); }
    }
  }

  // Trade along links (each pair once, both open)
  const share = tradeShare(year);
  const shipments = [], trades = [];
  const byId = new Map(open.map(m => [m.id, m]));
  const done = new Set();
  for ( const a of open ) for ( const bid of a.links ?? [] ) {
    const b = byId.get(bid);
    const pair = [a.id, bid].sort().join("|");
    if ( !b || done.has(pair) ) continue;
    done.add(pair);
    if ( blocked(a, b) ) continue;
    for ( const k of kinds ) {
      const sa = step(supOf(a, k)), sb = step(supOf(b, k));
      const [rich, poor] = sa > sb ? [a, b] : [b, a];
      if ( Math.abs(sa - sb) >= 2 && !(defer && onWay(poor.id, k)) ) {
        setSup(rich, k, level(step(supOf(rich, k)) - 1)); say(rich.id, k, `goods go to ${poor.name}`);
        if ( defer ) shipments.push({from: rich.id, to: poor.id, kind: k});
        else { setSup(poor, k, level(step(supOf(poor, k)) + 1)); say(poor.id, k, `goods come from ${rich.name}`); }
      }
      const ia = idxOf(a, k), ib = idxOf(b, k), gap = ib - ia;
      if ( Math.abs(gap) > 0.1 ) {
        trades.push({cheap: gap > 0 ? a.id : b.id, dear: gap > 0 ? b.id : a.id, kind: k, gap: round2(Math.abs(gap))});
        const mv = clamp(gap * share / 2, -SMALL, SMALL);
        setIdx(a, k, ia + mv); setIdx(b, k, ib - mv);
        say(a.id, k, `trade with ${b.name}`); say(b.id, k, `trade with ${a.name}`);
      }
    }
  }

  // Prices toward supply and season
  for ( const m of open ) for ( const k of kinds ) {
    const extra = Number(shift(m, k)) || 0;
    const was = idxOf(m, k), goal = clampIndex(targetIndex(supOf(m, k), k, month, year) + extra), gap = goal - was;
    if ( Math.abs(gap) < 0.02 ) continue;
    setIdx(m, k, was + clamp(gap * DRIFT, -SMALL, SMALL));
    if ( extra > 0 && gap > 0 ) say(m.id, k, "taxes and those who hold the trade");
    say(m.id, k, seasonShift(k, month, year) !== 0 && Math.abs(goal - (SUPPLY_PRICE[supOf(m, k)] ?? 1)) > 0.01 ? "the season" : "prices follow the stalls");
  }

  // What changed, what is big, what waits
  const changes = [];
  for ( const m of open ) {
    const b = before.get(m.id);
    for ( const k of kinds ) {
      const from = {index: idxOf(b, k), supply: supOf(b, k)}, to = {index: idxOf(m, k), supply: supOf(m, k)};
      if ( from.index === to.index && from.supply === to.supply ) continue;
      const big = step(to.supply) < step(from.supply) && step(to.supply) < NORMAL;
      const queue = big && pcs.has(m.id);
      changes.push({id: m.id, name: m.name, kind: k, from, to, why: why.get(`${m.id}|${k}`) ?? [], big, queue});
      if ( queue ) { setIdx(m, k, from.index); setSup(m, k, from.supply); }
    }
  }
  // Weeks at a level
  for ( const m of open ) {
    const seen = {};
    for ( const k of kinds ) {
      const lvl = supOf(m, k);
      if ( lvl === "normal" ) continue;
      seen[k] = {level: lvl, weeks: m.seen?.[k]?.level === lvl ? (m.seen[k].weeks ?? 0) + 1 : 1};
    }
    m.seen = seen;
  }
  return {state: next, changes, shipments, trades};
}

/** Weeks past the cap settle at once: supply to normal or the workshops' level, prices to the season's. */
export function settle(state, {kinds = [], month = 1, year = 1197, works = {}, shift = () => 0} = {}) {
  const next = deep(state ?? {markets: []});
  const changes = [];
  for ( const m of next.markets ?? [] ) {
    if ( m.cut ) continue;
    m.index ??= {}; m.supply ??= {};
    for ( const k of kinds ) {
      const from = {index: idxOf(m, k), supply: supOf(m, k)};
      const lvl = floorOf(works[m.id]?.[k] ?? 0) === "plenty" ? "plenty" : "normal";
      setSup(m, k, lvl); setIdx(m, k, targetIndex(lvl, k, month, year) + (Number(shift(m, k)) || 0));
      const to = {index: idxOf(m, k), supply: supOf(m, k)};
      if ( from.index !== to.index || from.supply !== to.supply ) changes.push({id: m.id, name: m.name, kind: k, from, to, why: ["the long quiet"], big: false, queue: false});
    }
    m.seen = {};
  }
  return {state: next, changes};
}

/** How many turns are due since the last: {due, skipped}; the first call only starts the count. */
export function turnsDue(last, now, {cap = TURN_CAP} = {}) {
  if ( !Number.isFinite(Number(now)) || last === null || last === undefined || !Number.isFinite(Number(last)) ) return {due: 0, skipped: 0, start: true};
  const n = Math.max(0, Math.floor((Number(now) - Number(last)) / WEEK));
  return {due: Math.min(n, cap), skipped: Math.max(0, n - cap), start: false};
}

/**
 * Several turns in a row. dates: [{month, year}] for each turn; settleAt: {month, year} when weeks were skipped.
 * Changes are merged per market and kind (first from, last to); queued ones are kept apart, the latest of each.
 */
export function runTurns(state, {dates = [], skipped = 0, settleAt = null, kinds = [], works = {}, pcMarkets = [], shift, blocked, defer = false, onWay} = {}) {
  let st = state;
  const merged = new Map(), queued = new Map();
  const add = c => {
    const key = `${c.id}|${c.kind}`;
    if ( c.queue ) { queued.set(key, c); return; }
    const was = merged.get(key);
    merged.set(key, was ? {...was, to: c.to, why: [...new Set([...was.why, ...c.why])]} : c);
  };
  // Goods wait on the road only when a single week is played: over a longer span the caravans have come in already.
  const wait = !!defer && dates.length === 1 && !skipped;
  let shipments = [], trades = [];
  for ( const d of dates ) {
    const r = weekTurn(st, {kinds, works, pcMarkets, month: d.month, year: d.year, shift, blocked, defer: wait, onWay});
    st = r.state; r.changes.forEach(add);
    shipments = r.shipments; trades = r.trades;
  }
  if ( skipped > 0 && settleAt ) {
    const r = settle(st, {kinds, works, shift, ...settleAt});
    st = r.state; r.changes.forEach(add);
  }
  const changes = [...merged.values()].filter(c => c.from.index !== c.to.index || c.from.supply !== c.to.supply);
  return {state: st, changes, queued: [...queued.values()], shipments: wait ? shipments : [], trades: wait ? trades : []};
}

/**
 * Talk of dear and cheap goods between linked markets. told: keys already talked of. Returns {fresh: [{key, kind,
 * dear: {id, name, index}, cheap: {id, name, index}}], told: next keys}. A key ends once the gap closes.
 */
export function rumoursDue(state, told = [], {kinds = [], gap = RUMOUR_GAP, end = RUMOUR_END} = {}) {
  const ms = (state?.markets ?? []).filter(m => !m.cut);
  const byId = new Map(ms.map(m => [m.id, m]));
  const keep = new Set(), fresh = [], done = new Set();
  for ( const a of ms ) for ( const bid of a.links ?? [] ) {
    const b = byId.get(bid);
    const pair = [a.id, bid].sort().join("|");
    if ( !b || done.has(pair) ) continue;
    done.add(pair);
    for ( const k of kinds ) {
      const ia = idxOf(a, k), ib = idxOf(b, k);
      const [dear, cheap] = ia >= ib ? [a, b] : [b, a];
      const key = `${dear.id}>${cheap.id}:${k}`;
      const g = Math.abs(ia - ib);
      if ( told.includes(key) && g >= end ) { keep.add(key); continue; }
      if ( g >= gap ) { keep.add(key); fresh.push({key, kind: k, dear: {id: dear.id, name: dear.name, index: idxOf(dear, k)}, cheap: {id: cheap.id, name: cheap.name, index: idxOf(cheap, k)}}); }
    }
  }
  return {fresh, told: [...keep]};
}

/** The patch that puts each touched market back as it was (index, supply, seen), from a snapshot. */
export function snapshot(state, ids = []) {
  const want = new Set(ids);
  return (state?.markets ?? []).filter(m => want.has(m.id)).map(m => ({id: m.id, index: deep(m.index ?? {}), supply: deep(m.supply ?? {}), seen: deep(m.seen ?? {})}));
}
export function restore(state, snap = []) {
  const next = deep(state ?? {markets: []});
  for ( const s of snap ) {
    const m = (next.markets ?? []).find(x => x.id === s.id);
    if ( m ) Object.assign(m, {index: deep(s.index), supply: deep(s.supply), seen: deep(s.seen)});
  }
  return next;
}
