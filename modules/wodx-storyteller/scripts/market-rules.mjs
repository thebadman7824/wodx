/**
 * WoDX Storyteller 0.24.0: markets (the living economy, first build; Ben approved the study 2026-11-11). Pure rules.
 *
 * A market belongs to a settlement: the scenes that make it up, a price index and a supply level for each goods
 * category, and its traders. A trader is an NPC (whose purse is the till) and a container tile with a stock list.
 * Prices anywhere in the market are the money price times the category's index. When a trader's stock is drawn,
 * the category's supply thins or fills the draw, and the trader pays half price for what comes in.
 * Indexes and supply levels are house rules set by the Storyteller; the weekly market turn comes in a later build.
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

export function normMarket(m = {}, kinds = []) {
  const index = {}, supply = {};
  for ( const k of kinds ) {
    const i = clampIndex(m.index?.[k]);
    if ( i !== 1 ) index[k] = i;
    const s = SUPPLY[m.supply?.[k]] ? m.supply[k] : "normal";
    if ( s !== "normal" ) supply[k] = s;
  }
  return {id: String(m.id || slug(m.name)), name: String(m.name ?? "A market").slice(0, 80), scenes: [...new Set((m.scenes ?? []).map(String))],
    index, supply, note: String(m.note ?? "").slice(0, 500),
    traders: (m.traders ?? []).filter(t => t?.actor && t?.tile).map(t => ({actor: String(t.actor), tile: String(t.tile)}))};
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
