/**
 * Talk by region (Chronicle Packs Desk d3, B7600-B7603). Pure, so the harness can test it.
 *
 * The shared stock talk names no real place; a region's own lines (data/region-talk.mjs) join it when the talk
 * happens in that region, and small change is named in that region's money. "The region" is the scene's own region,
 * else the chronicle's homeland (WoDX Chronicle place.regionHere).
 *
 *   withRegion(base, add)      a stock table with a region's lines added (arrays join, nothing is lost)
 *   regionGrammar(table, pool) the region lines as talk-generator rules and symbols, each tested on {region}
 *   coinWords(money)           the two smallest coins of a money (WoDX Storyteller moneyFor) as people say them
 *   regionFacts(region, year)  the talk facts for a region: {region, coinSmall, coinBig}
 */

/** A copy of a stock table with another table's lines added: arrays join, objects merge, the rest is kept. */
export function withRegion(base = {}, add = null) {
  if ( !add ) return base;
  const join = (a, b) => {
    if ( Array.isArray(a) || Array.isArray(b) ) return [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])];
    if ( a && typeof a === "object" && b && typeof b === "object" ) {
      const out = {...a};
      for ( const [k, v] of Object.entries(b) ) out[k] = k in a ? join(a[k], v) : v;
      return out;
    }
    return b ?? a;
  };
  return join(base, add);
}

/**
 * The region lines as a grammar for talk-grammar mergeGrammars. pool is talk-grammar poolRules. Each rule gets the
 * test {region: <id>} and one less boost, so it scores level with the shared rule it joins and the two pool.
 * Symbols get the test too, so where they fit they win over the shared words (a region's list keeps the shared ones).
 */
export function regionGrammar(table = {}, pool) {
  const rules = {}, symbols = {};
  for ( const [id, t] of Object.entries(table ?? {}) ) {
    const stock = {NEWS: t.NEWS, GOSSIP: t.GOSSIP}, more = {SMALL: t.SMALL, VOICES: voicesOf(t.VOICES)};
    for ( const [kind, list] of Object.entries(pool ? pool(stock, more) : {}) ) {
      for ( const r of list ) {
        if ( /\.(hate|refuse)/.test(r.id ?? "") ) continue; // the brush-offs stay shared
        (rules[kind] ??= []).push({...r, id: `region.${id}.${r.id}`, when: {...r.when, region: id}, boost: (Number(r.boost) || 0) - 1});
      }
    }
    for ( const [name, list] of Object.entries(t.symbols ?? {}) ) {
      for ( const s of list ?? [] ) (symbols[name] ??= []).push({...s, when: {...(s.when ?? {}), region: id}});
    }
  }
  return {rules, symbols};
}
// A region's voice entry has gossip only; poolRules wants the other parts as empty lists
const voicesOf = (v = {}) => Object.fromEntries(Object.entries(v ?? {}).map(([k, d]) => [k, {greet: {}, none: [], gossip: d.gossip ?? []}]));

/** The two smallest coins of a money, plural, smallest first: [small, next]; one coin twice when there is one. */
export function coinWords(money) {
  const units = (money?.units ?? []).filter(u => Array.isArray(u) && u[1]);
  if ( !units.length ) return null;
  const small = units.at(-1)[1], next = (units.at(-2) ?? units.at(-1))[1];
  return [small, next];
}

/**
 * The talk facts for a region (a WORLD_REGIONS entry with its id, as place.regionHere gives it) in a year.
 * moneyFor is WoDX Storyteller's money-rules moneyFor. Moravia's coin stays the house grammar's own rows (B7602), so
 * no coin facts there; nor when the money is not known.
 */
export function regionFacts(region, year, moneyFor = null) {
  if ( !region?.id ) return {};
  const out = {region: region.id};
  if ( !region.money || region.money === "moravian" || typeof moneyFor !== "function" ) return out;
  let words = null;
  try { words = coinWords(moneyFor(year, region.money)); } catch (e) { words = null; }
  if ( words ) { out.coinSmall = words[0]; out.coinBig = words[1]; }
  return out;
}
