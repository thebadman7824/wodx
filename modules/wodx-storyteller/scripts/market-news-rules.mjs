/**
 * WoDX Storyteller 0.36.0: news that moves a market (missed connections x4 and x5). Pure rules, no Foundry.
 *
 *   Dated events   A plague, a war, a crash or a collapse (WoDX Chronicle's dated events) suggests price and supply
 *                  changes for every market and a thinner crowd on scenes with passers-by. The Storyteller applies
 *                  it from a card, and taking the event back undoes it.
 *   Player trade   What the player characters buy from and sell to one market is counted per kind of goods over a
 *                  week. Past a threshold the market is glutted or short, again as a card to apply.
 * All numbers here are house rules.
 */

/** Kinds of market news. index: price multipliers by goods kind; supply: the supply step; crowd: passers-by density. */
export const PRESETS = {
  plague: {label: "Plague", note: "The sick stay home, fields and workshops stand idle, and anything that might cure is dear.",
    index: {food: 1.5, medicine: 2, faith: 1.3}, supply: {food: "short", medicine: "short"}, crowd: "quiet"},
  famine: {label: "Famine", note: "Bread is dear and short; people sell what they own to eat.",
    index: {food: 2.5, drink: 1.5, valuables: 0.8}, supply: {food: "short", drink: "short"}, crowd: "quiet"},
  war: {label: "War", note: "Armies take the grain, the horses and the iron; the young are gone from the streets.",
    index: {food: 1.5, fuel: 1.5, arms: 1.5, cloth: 1.3, materials: 1.3}, supply: {food: "short", fuel: "short", arms: "short"}, crowd: "quiet"},
  siege: {label: "Siege", note: "Nothing comes in through the gates.",
    index: {food: 3, fuel: 2, medicine: 2}, supply: {food: "none", fuel: "short", medicine: "short"}, crowd: "quiet"},
  crash: {label: "A crash", note: "Money is scarce; people sell their valuables cheap.",
    index: {valuables: 0.7, tech: 0.8}, supply: {}, crowd: null},
  collapse: {label: "A collapse", note: "Supply lines fail and the shelves empty; whoever has fuel or a gun names the price.",
    index: {food: 1.5, fuel: 2, medicine: 1.5, tech: 1.5, arms: 1.5}, supply: {food: "short", fuel: "short", tech: "short", medicine: "short"}, crowd: "quiet"},
  boom: {label: "Good times", note: "Money is about and the markets are full.",
    index: {valuables: 1.2}, supply: {food: "plenty", drink: "plenty"}, crowd: "busy"}
};

/**
 * The dated events (WoDX Chronicle ids) that carry market news. Most of the chronicle's events are hidden history
 * and move no prices; these are the ones the mortal world feels. An event of the Storyteller's own can name a preset
 * in a field called market.
 */
export const EVENT_NEWS = {
  "black-death": "plague",
  "fourth-great-maelstrom": "war",
  "wofd-1994-2": "crash",
  "wofd-1996-1": "collapse",
  "wofd-2000-2": "plague",
  "wofd-2012-2": "plague"
};

/** The preset key for an event, or null. */
export function newsFor(ev = {}) {
  const own = typeof ev?.market === "string" && PRESETS[ev.market] ? ev.market : null;
  return own ?? EVENT_NEWS[ev?.id] ?? null;
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round2 = v => Math.round(v * 100) / 100;

/**
 * The changes a preset makes to the markets: [{id, index: {kind: new}, supply: {kind: step}, prev: {index, supply}}].
 * markets: the markets state's list; kinds: the goods kinds that exist; lim: {min, max} for an index.
 */
export function marketChanges(preset, markets = [], kinds = [], lim = {min: 0.5, max: 3}) {
  const p = PRESETS[preset];
  if ( !p ) return [];
  const ok = k => !kinds.length || kinds.includes(k);
  return markets.map(m => {
    const index = {}, supply = {}, prev = {index: {}, supply: {}};
    for ( const [k, x] of Object.entries(p.index ?? {}) ) {
      if ( !ok(k) ) continue;
      const was = Number(m.index?.[k]) || 1;
      index[k] = round2(clamp(was * x, lim.min, lim.max));
      prev.index[k] = m.index?.[k] ?? null;
    }
    for ( const [k, s] of Object.entries(p.supply ?? {}) ) {
      if ( !ok(k) ) continue;
      supply[k] = s;
      prev.supply[k] = m.supply?.[k] ?? null;
    }
    return {id: m.id, name: m.name, index, supply, prev};
  }).filter(c => Object.keys(c.index).length || Object.keys(c.supply).length);
}

/** The patch that puts a market back as it was before a change (a kind with no value of its own goes back to normal). */
export function undoChange(change = {}) {
  const index = {}, supply = {};
  for ( const [k, v] of Object.entries(change.prev?.index ?? {}) ) index[k] = v === null || v === undefined ? 1 : v;
  for ( const [k, v] of Object.entries(change.prev?.supply ?? {}) ) supply[k] = v === null || v === undefined ? "normal" : v;
  return {index, supply};
}

/* ---- Player trade ---- */

export const WEEK = 7 * 24 * 60 * 60;
/** How many of one kind in a week before the market notices (house rule). */
export const TRADE_THRESHOLD = 10;
export const TRADE_STEP = {in: {supply: "plenty", index: 0.8, word: "glutted"}, out: {supply: "short", index: 1.25, word: "running short"}};

export const weekOf = worldTime => Math.floor((Number(worldTime) || 0) / WEEK);

/**
 * Count one trade. tally: {week, kinds: {kind: {in, out}}, told: [key]}. dir: "in" (sold to the market) or "out"
 * (bought from it). Returns {tally (a new copy), notice: {kind, dir} | null}: a notice the first time a kind passes
 * the threshold in a week.
 */
export function countTrade(tally = {}, {kind, dir, count = 1, worldTime = 0} = {}) {
  const week = weekOf(worldTime);
  const t = tally?.week === week ? {week, kinds: {...(tally.kinds ?? {})}, told: [...(tally.told ?? [])]} : {week, kinds: {}, told: []};
  if ( !kind || !TRADE_STEP[dir] ) return {tally: t, notice: null};
  const k = {in: 0, out: 0, ...(t.kinds[kind] ?? {})};
  k[dir] += Math.max(1, Math.round(Number(count) || 1));
  t.kinds[kind] = k;
  const key = `${kind}:${dir}`;
  if ( k[dir] >= TRADE_THRESHOLD && !t.told.includes(key) ) { t.told.push(key); return {tally: t, notice: {kind, dir, count: k[dir]}}; }
  return {tally: t, notice: null};
}

/** The change a trade notice suggests for one market. */
export function tradeChange(m = {}, notice = {}, lim = {min: 0.5, max: 3}) {
  const st = TRADE_STEP[notice.dir];
  if ( !st || !notice.kind ) return null;
  const was = Number(m.index?.[notice.kind]) || 1;
  return {id: m.id, name: m.name, index: {[notice.kind]: round2(clamp(was * st.index, lim.min, lim.max))}, supply: {[notice.kind]: st.supply},
    prev: {index: {[notice.kind]: m.index?.[notice.kind] ?? null}, supply: {[notice.kind]: m.supply?.[notice.kind] ?? null}}};
}
