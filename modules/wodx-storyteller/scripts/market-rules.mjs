/**
 * WoDX Storyteller 0.26.0: markets (the living economy, first build; Ben approved the study 2026-11-11). Pure rules.
 *
 * A market belongs to a settlement: the scenes that make it up, a price index and a supply level for each goods
 * category, and its traders. A trader is an NPC (whose purse is the till) and a container tile with a stock list.
 * Prices anywhere in the market are the money price times the category's index. When a trader's stock is drawn,
 * the category's supply thins or fills the draw, and the trader pays half price for what comes in.
 * Indexes and supply levels are house rules set by the Storyteller. The weekly market turn (Storyteller 0.48.0,
 * market-turn-rules.mjs) moves them: it reads links (other markets this one trades with), cut (a siege or quarantine:
 * the turn leaves the market alone) and seen (how many turns each kind's supply has stood at its level).
 * Storyteller 0.49.0 adds what factions do to a market (moves: taxes, monopolies, smuggling; market-moves-rules.mjs),
 * roads a raid has closed (unsafe: {market id: weeks left}) and, on each trader, the weeks its keep went unpaid
 * (behind), whether the shop has shut and for how long (shut, shutWeeks) and who backed its reopening (backer).
 */
export const STATE_VERSION = 1;
export const INDEX = {min: 0.5, max: 3};
/** Supply levels: what a stock draw gets of each line. */
export const SUPPLY = {
  none: {label: "None", keep: 0, count: 0},
  short: {label: "Short", keep: 0.5, count: 0.5},
  normal: {label: "Normal", keep: 1, count: 1},
  plenty: {label: "Plenty", keep: 1, count: 1.5}
};
export const RESTOCK_SHARE = 0.5;

const clampIndex = v => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(Math.max(INDEX.min, Math.min(INDEX.max, n)) * 100) / 100 : 1;
};
const slug = s => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "market";

export function blankState() { return {v: STATE_VERSION, markets: []}; }

/** A standing move on a market: a tax, a monopoly on one kind of goods, or smuggling that undercuts both. */
export const MOVE_TYPES = ["tax", "monopoly", "smuggle"];
export const TAX_RATES = [0.1, 0.2, 0.3];
export function normMove(v = {}, kinds = []) {
  if ( !MOVE_TYPES.includes(v?.type) || !v.faction ) return null;
  const goods = kinds.includes(v.goods) ? v.goods : "";
  if ( v.type === "monopoly" && !goods ) return null;
  const rate = v.type === "tax" ? (TAX_RATES.includes(Number(v.rate)) ? Number(v.rate) : TAX_RATES[0]) : 0;
  const weeks = Number.isFinite(Number(v.weeks)) && Number(v.weeks) > 0 ? Math.min(5200, Math.floor(Number(v.weeks))) : 0;
  return {id: String(v.id || `${v.type}-${v.faction}-${goods || "all"}`).slice(0, 80), type: v.type, faction: String(v.faction), name: String(v.name ?? "A faction").slice(0, 120),
    goods, rate, weeks, told: !!v.told, hand: !!v.hand};
}
function normTrader(t = {}) {
  const n = k => (Number.isFinite(Number(t[k])) && Number(t[k]) > 0 ? Math.min(520, Math.floor(Number(t[k]))) : 0);
  const out = {actor: String(t.actor), tile: String(t.tile)};
  if ( n("behind") ) out.behind = n("behind");
  if ( t.shut ) { out.shut = true; if ( n("shutWeeks") ) out.shutWeeks = n("shutWeeks"); }
  if ( t.backer ) out.backer = String(t.backer).slice(0, 120);
  return out;
}

export function normMarket(m = {}, kinds = []) {
  const index = {}, supply = {};
  for ( const k of kinds ) {
    const i = clampIndex(m.index?.[k]);
    if ( i !== 1 ) index[k] = i;
    const s = SUPPLY[m.supply?.[k]] ? m.supply[k] : "normal";
    if ( s !== "normal" ) supply[k] = s;
  }
  const seen = {};
  for ( const k of kinds ) {
    const s = m.seen?.[k];
    const level = supply[k] ?? "normal";
    if ( s && s.level === level && Number.isFinite(Number(s.weeks)) && Number(s.weeks) > 0 ) seen[k] = {level, weeks: Math.min(520, Math.floor(Number(s.weeks)))};
  }
  return {id: String(m.id || slug(m.name)), name: String(m.name ?? "A market").slice(0, 80), scenes: [...new Set((m.scenes ?? []).map(String))],
    index, supply, note: String(m.note ?? "").slice(0, 500),
    links: [...new Set((m.links ?? []).map(String).filter(Boolean))], cut: !!m.cut, seen,
    traders: (m.traders ?? []).filter(t => t?.actor && t?.tile).map(normTrader),
    moves: normMoves(m.moves, kinds), unsafe: normUnsafe(m.unsafe)};
}
/** One tax a faction, one monopoly a kind of goods, one smuggling ring a faction; the first of each stands. */
export function normMoves(moves, kinds = []) {
  const out = [], seen = new Set();
  for ( const v of Array.isArray(moves) ? moves : [] ) {
    const n = normMove(v, kinds);
    if ( !n ) continue;
    const key = n.type === "monopoly" ? `monopoly:${n.goods}` : `${n.type}:${n.faction}:${n.goods}`;
    if ( seen.has(key) ) continue;
    seen.add(key);
    let id = n.id, i = 2;
    while ( out.some(x => x.id === id) ) id = `${n.id}-${i++}`;
    out.push({...n, id});
  }
  return out.slice(0, 24);
}
function normUnsafe(u) {
  const out = {};
  for ( const [k, v] of Object.entries(u && typeof u === "object" ? u : {}) ) {
    const n = Math.floor(Number(v));
    if ( k && Number.isFinite(n) && n > 0 ) out[k] = Math.min(12, n);
  }
  return out;
}

export function normState(s, kinds = []) {
  const out = blankState();
  const seen = new Set();
  for ( const m of s?.markets ?? [] ) {
    const n = normMarket(m, kinds);
    let id = n.id, i = 2;
    while ( seen.has(id) ) id = `${n.id}-${i++}`;
    seen.add(id);
    out.markets.push({...n, id});
  }
  // Links go both ways and only to markets that exist
  const ids = new Set(out.markets.map(m => m.id));
  for ( const m of out.markets ) m.links = m.links.filter(l => l !== m.id && ids.has(l));
  for ( const m of out.markets ) for ( const l of m.links ) {
    const o = out.markets.find(x => x.id === l);
    if ( !o.links.includes(m.id) ) o.links.push(m.id);
  }
  // A closed road is closed from both ends, and only along a link
  for ( const m of out.markets ) for ( const k of Object.keys(m.unsafe) ) if ( !m.links.includes(k) ) delete m.unsafe[k];
  for ( const m of out.markets ) for ( const [k, v] of Object.entries(m.unsafe) ) {
    const o = out.markets.find(x => x.id === k);
    if ( o && o.links.includes(m.id) ) o.unsafe[m.id] = Math.max(o.unsafe[m.id] ?? 0, v);
  }
  return out;
}

export const marketById = (state, id) => (state?.markets ?? []).find(m => m.id === id) ?? null;
export const marketOfScene = (state, sceneId) => (state?.markets ?? []).find(m => m.scenes.includes(String(sceneId))) ?? null;
export const marketOfTile = (state, tileUuid) => (state?.markets ?? []).find(m => m.traders.some(t => t.tile === tileUuid)) ?? null;
export const traderOfTile = (state, tileUuid) => {
  const m = marketOfTile(state, tileUuid);
  return m ? {market: m, ...m.traders.find(t => t.tile === tileUuid)} : null;
};
/** A trader NPC may keep more than one shop; the first market that lists the actor. */
export const marketOfActor = (state, actorId) => (state?.markets ?? []).find(m => m.traders.some(t => t.actor === actorId)) ?? null;

export const indexOf = (market, kind) => clampIndex(market?.index?.[kind] ?? 1);
export const supplyOf = (market, kind) => (SUPPLY[market?.supply?.[kind]] ? market.supply[kind] : "normal");

/** A stock line "silver pennies (7)" to {name, count}. */
export function splitLine(line) {
  const m = /^(.*?)\s*\((\d+)\)\s*$/.exec(String(line ?? ""));
  return m ? {name: m[1].trim(), count: Number(m[2])} : {name: String(line ?? "").trim(), count: 1};
}
export const joinLine = (name, count) => (count > 1 ? `${name} (${count})` : name);

/**
 * Thin or fill a fresh stock draw by the market's supply. kindOf(name) -> category or null (lines that are not
 * everyday goods are left alone). Returns the new lines.
 */
export function applySupply(lines = [], market, kindOf = () => null, rng = Math.random) {
  const out = [];
  for ( const line of lines ) {
    const {name, count} = splitLine(line);
    const kind = kindOf(name);
    if ( !kind || !market ) { out.push(line); continue; }
    const s = SUPPLY[supplyOf(market, kind)];
    if ( s.keep <= 0 ) continue;
    if ( s.keep < 1 && rng() >= s.keep ) continue;
    const n = Math.max(1, Math.round(count * s.count));
    out.push(joinLine(name, n));
  }
  return out;
}

/** What a restock costs the trader: half the market price of each line. priceOf(name, count) -> amount or null. */
export function restockCost(lines = [], priceOf = () => null) {
  let total = 0;
  for ( const line of lines ) {
    const {name, count} = splitLine(line);
    const p = priceOf(name, count);
    if ( Number.isFinite(p) ) total += Math.floor(p * RESTOCK_SHARE);
  }
  return total;
}

/**
 * Lines the till can pay for, in order, so a trader with little money gets a thin restock rather than none.
 * Returns {lines, cost}.
 */
export function affordable(lines = [], till = 0, priceOf = () => null) {
  const kept = [];
  let cost = 0;
  for ( const line of lines ) {
    const c = restockCost([line], priceOf);
    if ( cost + c > till ) continue;
    kept.push(line); cost += c;
  }
  return {lines: kept, cost};
}
