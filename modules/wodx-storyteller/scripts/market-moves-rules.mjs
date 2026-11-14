/**
 * WoDX Storyteller 0.49.0: what factions do to a market, and traders who go broke. Pure rules, no Foundry.
 *
 * The living economy study (approved 2026-11-11) left three things after the weekly turn: faction moves on markets,
 * traders going broke and caravans. This file holds the first two; caravans are in caravan-rules.mjs.
 *
 * A faction's standing moves on a market (market.moves):
 *   Tax        A faction with sway over the law that holds a place in the market (or rules the domain) takes a
 *              share of every sale: light, heavy or crushing. Prices rise by the rate and traders take less.
 *   Monopoly   A faction strong in trade corners one kind of goods. Its price rises, and traders outside the
 *              faction earn less on it.
 *   Smuggling  A faction strong in the underworld runs goods past a tax or monopoly it does not hold, which halves
 *              what they add to prices.
 * A raid is a single blow by a faction with armed followers against a market held by one it stands badly with. It
 * rolls its force against difficulty 6, less the guard. A win takes a caravan on the road if there is one, or else
 * strips a kind of goods from the stalls, robs a till and closes a road for some weeks.
 *
 * Each week a faction that runs itself may make one move, with one chance in six. A move on a market where a player
 * character stands, or by a faction a player character belongs to, waits in the approval queue. A move the Storyteller
 * sets by hand stands whatever the faction's dots, until the Storyteller ends it or the faction is gone.
 *
 * Traders. Each week a trader's takings follow the supply of what the shop sells, less taxes and a monopoly's
 * squeeze, against the keep of the shop. A normal week takes three tenths over the keep, so a heavy tax can be borne
 * in good times and a crushing one, or a lean season, cannot. A shortfall the till cannot pay puts the shop a week
 * behind; four weeks behind and it shuts. A shut shop draws no new stock. It opens again once it has stood shut
 * eight weeks and trade is good. A till grows from trade only up to six months' wages.
 *
 * The books give no rules for any of this (the nearest is Influence standing in for an Ability, V20 p. 115, printed).
 * Every number here is a house rule (B2380 to B2385).
 */
import {SUPPLY, TAX_RATES, normMoves} from "./market-rules.mjs";

export const CHANCE = 1 / 6;
export const MONOPOLY_SHIFT = 0.3;
export const SHIFT_CAP = 0.6;
export const MONOPOLY_SQUEEZE = 0.85;
export const RAID_DIFF = 6;
export const UNSAFE_MAX = 4;
export const GRUMBLE_WEEKS = 8;

/** The spheres of Influence that stand for each kind of power, across every period's list. */
export const POWERS = {
  law: ["crown", "political", "bureaucracy", "legal", "church"],
  trade: ["guild", "finance", "industry", "transport"],
  force: ["military", "police"],
  crime: ["underworld", "street"]
};
export const NEED = {tax: 2, monopoly: 3, raid: 2, smuggle: 2};

/** The age a year falls in, for the words a move goes by. */
export function ageOf(year, {future = false} = {}) {
  const y = Number(year) || 0;
  if ( future || y >= 2020 ) return "future";
  return y < 1500 ? "medieval" : y < 1800 ? "early" : y < 1920 ? "industrial" : "modern";
}
export const WORDS = {
  tax: {medieval: "a market toll", early: "an excise", industrial: "a duty", modern: "a sales tax", future: "a corporate levy"},
  monopoly: {medieval: "the staple right", early: "a royal patent", industrial: "a trust", modern: "a cartel", future: "an exclusive licence"},
  smuggle: {medieval: "smugglers", early: "free traders", industrial: "smugglers", modern: "the black market", future: "grey-market runners"},
  raid: {medieval: "robber knights", early: "highwaymen", industrial: "bandits", modern: "hijackers", future: "road gangs"}
};
export const wordFor = (type, year, opts) => WORDS[type]?.[ageOf(year, opts)] ?? type;
export const RATE_WORDS = {0.1: "light", 0.2: "heavy", 0.3: "crushing"};

const deep = o => JSON.parse(JSON.stringify(o));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round2 = v => Math.round(v * 100) / 100;
const LEVELS = ["none", "short", "normal", "plenty"];
const supOf = (m, k) => (SUPPLY[m?.supply?.[k]] ? m.supply[k] : "normal");

/**
 * A faction as these rules read it, from WoDX NPC's record. markets: the markets state; a faction is at home in a
 * market when it holds one of its scenes (a place is a scene's uuid, or a region inside it).
 */
export function viewOf(f = {}, markets = []) {
  const inf = f.assets?.influence ?? {};
  const top = keys => Math.max(0, ...keys.map(k => Number(inf[k]) || 0));
  const places = f.places ?? [];
  const home = markets.filter(m => (m.scenes ?? []).some(s => places.some(p => p === `Scene.${s}` || String(p).startsWith(`Scene.${s}.`)))).map(m => m.id);
  return {id: String(f.id ?? ""), name: String(f.name ?? "A faction"), ruler: !!f.ruler, idle: !!f.dormant, own: f.run === "orders",
    law: top(POWERS.law), trade: top(POWERS.trade), crime: top(POWERS.crime),
    force: Math.max(Number(f.assets?.retainers) || 0, top(POWERS.force)), guard: Number(f.assets?.security) || 0,
    resources: Number(f.assets?.resources) || 0, standing: {...(f.standing ?? {})}, members: [...(f.members ?? [])], home};
}

const movesOf = m => m?.moves ?? [];
/** A levy on every sale leaves money itself alone. */
export const UNTAXED = new Set(["coin"]);
const covers = (mv, kind) => (mv.goods ? mv.goods === kind : !UNTAXED.has(kind));
export const taxOn = (m, kind) => round2(movesOf(m).filter(v => v.type === "tax" && covers(v, kind)).reduce((a, v) => a + v.rate, 0));
export const monopolyOn = (m, kind) => movesOf(m).find(v => v.type === "monopoly" && v.goods === kind) ?? null;
/** Smuggling undercuts a tax or monopoly held by anyone but the smugglers. */
export function smuggledOn(m, kind) {
  const rings = movesOf(m).filter(v => v.type === "smuggle" && covers(v, kind));
  if ( !rings.length ) return false;
  return movesOf(m).some(v => v.type !== "smuggle" && covers(v, kind) && rings.some(r => r.faction !== v.faction) && (v.type === "tax" || v.goods === kind));
}
/** What the moves add to the price index a kind's supply and the season call for. */
export function priceShift(m, kind) {
  const raw = taxOn(m, kind) + (monopolyOn(m, kind) ? MONOPOLY_SHIFT : 0);
  return round2(clamp(smuggledOn(m, kind) ? raw / 2 : raw, 0, SHIFT_CAP));
}
/** A road a raid has closed, seen from either end. */
export const closed = (a, b) => (a?.unsafe?.[b?.id] ?? 0) > 0 || (b?.unsafe?.[a?.id] ?? 0) > 0;

/* ------------------------------------------------------------------ */
/*  What a faction can do                                              */
/* ------------------------------------------------------------------ */

const holdersOf = (m, views) => views.filter(v => !v.idle && v.home.includes(m.id));
const hostileTo = (v, m, views) => holdersOf(m, views).some(h => h.id !== v.id && (v.standing[h.id] ?? 0) < 0);

/** Whether a faction can make a move on a market, and why not. Returns {ok, why}. */
export function can(view, type, market, views = [], {goods = ""} = {}) {
  const no = why => ({ok: false, why});
  if ( !view || view.idle ) return no("The faction is not active.");
  const here = view.home.includes(market.id);
  if ( type === "tax" ) {
    if ( !here && !view.ruler ) return no("It holds no place in this market.");
    if ( view.law < NEED.tax ) return no(`It needs ${NEED.tax} dots of Influence over the law.`);
    if ( movesOf(market).some(v => v.type === "tax" && v.faction === view.id && v.goods === goods) ) return no("It already taxes this.");
    return {ok: true, why: ""};
  }
  if ( type === "monopoly" ) {
    if ( !here ) return no("It holds no place in this market.");
    if ( view.trade < NEED.monopoly || view.resources < NEED.monopoly ) return no(`It needs ${NEED.monopoly} dots of Influence over trade and Resources ${NEED.monopoly}.`);
    if ( !goods ) return no("A monopoly is on one kind of goods.");
    if ( monopolyOn(market, goods) ) return no("Someone already holds that monopoly.");
    return {ok: true, why: ""};
  }
  if ( type === "smuggle" ) {
    if ( view.crime < NEED.smuggle ) return no(`It needs ${NEED.smuggle} dots of Influence in the underworld.`);
    if ( !movesOf(market).some(v => v.type !== "smuggle" && v.faction !== view.id) ) return no("There is no tax or monopoly here to run goods past.");
    if ( movesOf(market).some(v => v.type === "smuggle" && v.faction === view.id) ) return no("It already smuggles here.");
    return {ok: true, why: ""};
  }
  if ( type === "raid" ) {
    if ( view.force < NEED.raid ) return no(`It needs ${NEED.raid} dots of Retainers or armed Influence.`);
    if ( here ) return no("It holds a place here; it would be robbing itself.");
    if ( !hostileTo(view, market, views) ) return no("It stands badly with nobody who holds this market.");
    return {ok: true, why: ""};
  }
  return no("No such move.");
}

/** The guard a raid meets: the best Domain security among those who hold the market. */
export const guardOf = (market, views) => Math.max(0, ...holdersOf(market, views).map(h => h.guard));

/**
 * The move a faction would make this week, or null. Order: tax what it holds, corner the dearest kind, raid a
 * rival's market, smuggle past a rival's tax. kinds: goods kinds. rand: () => [0, 1).
 */
export function pickMove(view, state, views, {kinds = [], rand = Math.random, chance = CHANCE} = {}) {
  if ( !view || view.idle || view.own ) return null;
  if ( rand() >= chance ) return null;
  const open = (state?.markets ?? []).filter(m => !m.cut);
  for ( const m of open ) {
    if ( movesOf(m).some(v => v.type === "tax" && v.faction === view.id) ) continue;
    if ( can(view, "tax", m, views).ok ) return {type: "tax", market: m.id, faction: view.id, name: view.name, goods: "", rate: view.resources <= 2 ? TAX_RATES[1] : TAX_RATES[0]};
  }
  for ( const m of open ) {
    if ( movesOf(m).some(v => v.type === "monopoly" && v.faction === view.id) ) continue;
    const dear = kinds.filter(k => can(view, "monopoly", m, views, {goods: k}).ok)
      .map(k => ({k, i: Number(m.index?.[k]) || 1})).sort((a, b) => b.i - a.i || a.k.localeCompare(b.k))[0];
    if ( dear ) return {type: "monopoly", market: m.id, faction: view.id, name: view.name, goods: dear.k, rate: 0};
  }
  const prey = open.filter(m => can(view, "raid", m, views).ok);
  if ( prey.length ) return {type: "raid", market: prey[Math.floor(rand() * prey.length) % prey.length].id, faction: view.id, name: view.name, goods: "", rate: 0};
  for ( const m of open ) if ( can(view, "smuggle", m, views).ok ) return {type: "smuggle", market: m.id, faction: view.id, name: view.name, goods: "", rate: 0};
  return null;
}

/**
 * The week's moves: at most one a faction and one a market. pcMarkets: markets where a player character stands;
 * pcFactions: factions a player character belongs to. Each move comes back with queue set when it must wait.
 */
export function planMoves(state, views = [], {kinds = [], randFor = () => Math.random, pcMarkets = [], pcFactions = [], chance = CHANCE} = {}) {
  const out = [], taken = new Set();
  const pcs = new Set(pcMarkets), mine = new Set(pcFactions);
  for ( const v of [...views].sort((a, b) => a.id.localeCompare(b.id)) ) {
    const left = {...state, markets: (state?.markets ?? []).filter(m => !taken.has(m.id))};
    const mv = pickMove(v, left, views, {kinds, rand: randFor(v.id), chance});
    if ( !mv ) continue;
    taken.add(mv.market);
    out.push({...mv, queue: pcs.has(mv.market) || mine.has(v.id)});
  }
  return out;
}

/** Put a standing move on its market. Returns {state, move} (move null when it could not stand). */
export function addMove(state, mv, kinds = []) {
  const next = deep(state ?? {markets: []});
  const m = (next.markets ?? []).find(x => x.id === mv.market);
  if ( !m ) return {state: next, move: null};
  const before = movesOf(m).length;
  m.moves = normMoves([...movesOf(m), {type: mv.type, faction: mv.faction, name: mv.name, goods: mv.goods, rate: mv.rate, weeks: 0, hand: !!mv.hand}], kinds);
  return {state: next, move: m.moves.length > before ? m.moves[m.moves.length - 1] : null};
}
export function dropMove(state, marketId, moveId) {
  const next = deep(state ?? {markets: []});
  const m = (next.markets ?? []).find(x => x.id === marketId);
  if ( m ) m.moves = movesOf(m).filter(v => v.id !== moveId);
  return next;
}

/** One line for a move, in the words of the year. */
export function describe(mv, {year = 1197, kindLabel = k => k, future = false} = {}) {
  const w = wordFor(mv.type, year, {future});
  if ( mv.type === "tax" ) return `${mv.name} lays ${w} on ${mv.goods ? kindLabel(mv.goods) : "every sale"} (${RATE_WORDS[mv.rate] ?? "light"}: prices up by ${mv.rate})`;
  if ( mv.type === "monopoly" ) return `${mv.name} takes ${w} on ${kindLabel(mv.goods)} (its price up by ${MONOPOLY_SHIFT})`;
  if ( mv.type === "smuggle" ) return `${mv.name} runs goods past the tax and the monopoly (${w}: half of what they add to prices is undone)`;
  if ( mv.type === "raid" ) return `${mv.name} sends ${w} against the market`;
  return mv.name;
}

/* ------------------------------------------------------------------ */
/*  Raids                                                              */
/* ------------------------------------------------------------------ */

/** A raid's roll: force dice at difficulty 6, ones take successes away, the guard takes more. */
export function rollRaid(force, guard, rand = Math.random) {
  const dice = Array.from({length: clamp(Math.round(force), 1, 10)}, () => 1 + Math.floor(rand() * 10));
  const hits = dice.filter(d => d >= RAID_DIFF).length, ones = dice.filter(d => d === 1).length;
  const successes = Math.max(0, hits - ones);
  return {dice, successes, botch: hits === 0 && ones > 0, net: Math.max(0, successes - Math.max(0, Math.round(guard)))};
}

/**
 * What a raid that got through does to a market with no caravan to take: a kind of goods on the stalls drops a step,
 * one trader's till is robbed of a quarter for each success (three quarters at most), and one road is closed for a
 * week for each success (four at most). Returns {state, kind, from, to, trader, share, road, weeks}.
 */
export function raidMarket(state, marketId, net, {kinds = [], rand = Math.random} = {}) {
  const next = deep(state ?? {markets: []});
  const m = (next.markets ?? []).find(x => x.id === marketId);
  const out = {state: next, kind: null, from: null, to: null, trader: null, share: 0, road: null, weeks: 0};
  if ( !m || net < 1 ) return out;
  const stocked = kinds.filter(k => !UNTAXED.has(k) && LEVELS.indexOf(supOf(m, k)) > 0);
  if ( stocked.length ) {
    const k = stocked[Math.floor(rand() * stocked.length) % stocked.length];
    const from = supOf(m, k), to = LEVELS[LEVELS.indexOf(from) - 1];
    m.supply ??= {};
    if ( to === "normal" ) delete m.supply[k]; else m.supply[k] = to;
    Object.assign(out, {kind: k, from, to});
  }
  const open = (m.traders ?? []).filter(t => !t.shut);
  if ( open.length ) { out.trader = open[Math.floor(rand() * open.length) % open.length].actor; out.share = Math.min(0.75, 0.25 * net); }
  const roads = (m.links ?? []).filter(l => !(m.unsafe?.[l] > 0));
  if ( roads.length ) {
    const l = roads[Math.floor(rand() * roads.length) % roads.length], weeks = Math.min(UNSAFE_MAX, net);
    m.unsafe = {...(m.unsafe ?? {}), [l]: weeks};
    const o = next.markets.find(x => x.id === l);
    if ( o ) o.unsafe = {...(o.unsafe ?? {}), [m.id]: weeks};
    Object.assign(out, {road: l, weeks});
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  The week for moves already standing                                */
/* ------------------------------------------------------------------ */

/**
 * A week passes for the moves: each stands a week longer, closed roads count down, and a move lapses when its faction
 * is gone, idle or no longer has the hold or the dots for it. Returns {state, lapsed: [{market, name, move, why}],
 * opened: [{a, b}] roads safe again, grumbles: [{market, name, move}] heavy taxes that have stood long enough to be
 * talked of (once each).
 */
export function weekMoves(state, views = [], {weeks = 1} = {}) {
  const next = deep(state ?? {markets: []});
  const by = new Map(views.map(v => [v.id, v]));
  const lapsed = [], opened = [], grumbles = [], seen = new Set();
  for ( const m of next.markets ?? [] ) {
    if ( m.cut ) continue;
    const keep = [];
    for ( const mv of movesOf(m) ) {
      const v = by.get(mv.faction);
      let why = "";
      if ( !v ) why = "the faction is gone";
      else if ( v.idle ) why = "the faction lies idle";
      else if ( mv.hand ) why = "";   // set by the Storyteller: it stands until the Storyteller ends it
      else if ( mv.type === "tax" && !v.home.includes(m.id) && !v.ruler ) why = "it no longer holds a place here";
      else if ( mv.type === "tax" && v.law < NEED.tax ) why = "it has lost its sway over the law";
      else if ( mv.type === "monopoly" && (!v.home.includes(m.id) || v.trade < NEED.monopoly) ) why = "it has lost its hold on the trade";
      else if ( mv.type === "smuggle" && v.crime < NEED.smuggle ) why = "its runners are scattered";
      if ( why ) { lapsed.push({market: m.id, name: m.name, move: mv, why}); continue; }
      mv.weeks = (mv.weeks ?? 0) + weeks;
      if ( mv.type === "tax" && mv.rate >= TAX_RATES[1] && mv.weeks >= GRUMBLE_WEEKS && !mv.told ) { mv.told = true; grumbles.push({market: m.id, name: m.name, move: {...mv}}); }
      keep.push(mv);
    }
    // Smuggling with nothing left to run goods past ends too
    m.moves = [];
    for ( const mv of keep ) {
      if ( mv.type === "smuggle" && !mv.hand && !keep.some(o => o.type !== "smuggle" && o.faction !== mv.faction) ) lapsed.push({market: m.id, name: m.name, move: mv, why: "there is nothing left to run goods past"});
      else m.moves.push(mv);
    }
    for ( const [l, w] of Object.entries(m.unsafe ?? {}) ) {
      const left = w - weeks;
      if ( left > 0 ) { m.unsafe[l] = left; continue; }
      delete m.unsafe[l];
      const pair = [m.id, l].sort().join("|");
      if ( !seen.has(pair) ) { seen.add(pair); opened.push({a: m.id, b: l}); }
    }
  }
  return {state: next, lapsed, opened, grumbles};
}

/* ------------------------------------------------------------------ */
/*  Traders going broke                                                */
/* ------------------------------------------------------------------ */

/** The week's keep of a shop as a share of the month's wage, and what a normal week takes over it. */
export const KEEP_SHARE = 0.25;
export const MARGIN = 1.3;
/** A till grows from the week's trade only up to this many months' wages; the rest goes on living. */
export const TILL_MONTHS = 6;
export const SUPPLY_TAKE = {none: 0.2, short: 0.7, normal: 1, plenty: 1.1};
export const BROKE_AT = 4;
export const REOPEN_AFTER = 8;
export const GOOD_TRADE = 0.95;

/** How good trade is for a shop: the supply of what it sells (or of everything), less taxes and a monopoly's squeeze. */
export function tradeFactor(market, {sells = [], kinds = [], member = () => false} = {}) {
  const ks = sells.length ? sells : kinds;
  if ( !ks.length ) return 1;
  let sum = 0;
  for ( const k of ks ) {
    const tax = smuggledOn(market, k) ? taxOn(market, k) / 2 : taxOn(market, k);
    const mono = monopolyOn(market, k);
    sum += (SUPPLY_TAKE[supOf(market, k)] ?? 1) * (1 - Math.min(0.5, tax)) * (mono && !member(mono.faction) ? MONOPOLY_SQUEEZE : 1);
  }
  return round2(sum / ks.length);
}

/** A week's sums for a shop, in the smallest unit of money: {keep, takings, net}. wage: the month's wage of the year. */
export function shopWeek(wage, factor) {
  const keep = Math.max(1, Math.round((Number(wage) || 0) * KEEP_SHARE));
  const takings = Math.round(keep * MARGIN * factor);
  return {keep, takings, net: takings - keep};
}

/**
 * Some weeks for one trader. trader: {behind, shut, shutWeeks}; till: what the purse holds. A good week pays off a
 * week of arrears before it fills the till. A week the till cannot cover puts the shop a week behind; at four it
 * shuts. A shut shop counts its weeks and opens again after eight once trade is good.
 * Returns {trader (new fields), till (the change to the purse, + or -), shutNow, openNow}.
 */
export function traderWeeks(trader = {}, {wage = 0, factor = 1, till = 0, weeks = 1} = {}) {
  const t = {behind: trader.behind ?? 0, shut: !!trader.shut, shutWeeks: trader.shutWeeks ?? 0};
  let have = Math.max(0, Math.round(Number(till) || 0)), shutNow = false, openNow = false;
  const start = have, cap = Math.round((Number(wage) || 0) * TILL_MONTHS);
  for ( let i = 0; i < weeks; i++ ) {
    if ( t.shut ) {
      t.shutWeeks++;
      if ( t.shutWeeks >= REOPEN_AFTER && factor >= GOOD_TRADE ) { t.shut = false; t.shutWeeks = 0; t.behind = 0; openNow = true; shutNow = false; }
      continue;
    }
    const w = shopWeek(wage, factor);
    if ( w.net > 0 ) { if ( t.behind > 0 ) t.behind--; else have = Math.max(have, Math.min(cap, have + w.net)); }
    else if ( w.net < 0 ) {
      const need = -w.net;
      if ( have >= need ) have -= need;
      else { have = 0; t.behind++; }
    }
    if ( t.behind >= BROKE_AT ) { t.shut = true; t.shutWeeks = 0; shutNow = true; openNow = false; }
  }
  return {trader: t, till: have - start, shutNow: shutNow && t.shut, openNow: openNow && !t.shut};
}
