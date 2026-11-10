/**
 * The generator core (Phase 7a, B52): seeded randomness and the table engine. Pure: no Foundry calls, so the harness
 * can test it. Three rules hold for every generator: seeded (the same seed and key give the same result), Storyteller
 * first (world changes go through the approval queue), and WoDX tables (era- and line-aware data in WoDX's own words).
 *
 * A table is {id, name, results: [{text, weight?, range?: [lo, hi]}], formula?}. Text may hold:
 *   {table.id}      a draw from another table
 *   {a|b|c}         one of these, evenly
 *   {{name}}        a value given by the caller (vars)
 */

/** A 128-bit hash of a string, as four 32-bit numbers (cyrb128). */
export function hash128(str) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for ( let i = 0; i < str.length; i++ ) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= (h2 ^ h3 ^ h4); h2 ^= h1; h3 ^= h1; h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** A random-number stream in [0, 1) from four 32-bit seeds (sfc32). */
export function sfc32(a, b, c, d) {
  return function () {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

/**
 * The stream for one result: the chronicle's seed and a key that names what is drawn ("people:1203-10-14:3"), with a
 * nonce for re-rolls. The same three always give the same stream.
 */
export function stream(seed, key, nonce = 0) {
  const r = sfc32(...hash128(`${seed}␟${key}␟${nonce}`));
  for ( let i = 0; i < 12; i++ ) r(); // warm up
  return r;
}

/** A whole number from lo to hi, both included. */
export const between = (rand, lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
/** One element of a list, evenly. */
export const pick = (rand, list) => list.length ? list[Math.floor(rand() * list.length)] : undefined;
/** Shuffle a copy (Fisher-Yates). */
export function shuffled(rand, list) {
  const a = [...list];
  for ( let i = a.length - 1; i > 0; i-- ) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/**
 * Draw one result. When the results carry ranges (as Foundry Roll Tables do), a number is rolled over the formula's
 * span (the lowest and highest range) and the result whose range holds it is taken; otherwise by weight.
 */
export function drawResult(rand, results) {
  const list = (results ?? []).filter(r => r && (r.weight ?? 1) > 0);
  if ( !list.length ) return null;
  if ( list.every(r => Array.isArray(r.range) && r.range.length === 2) ) {
    const lo = Math.min(...list.map(r => r.range[0])), hi = Math.max(...list.map(r => r.range[1]));
    const n = between(rand, lo, hi);
    return list.find(r => n >= r.range[0] && n <= r.range[1]) ?? list[list.length - 1];
  }
  const total = list.reduce((s, r) => s + (r.weight ?? 1), 0);
  let x = rand() * total;
  for ( const r of list ) { x -= (r.weight ?? 1); if ( x < 0 ) return r; }
  return list[list.length - 1];
}

/** Ranges for a list of weighted results, as a Foundry Roll Table wants them: [1, w1], [w1 + 1, w1 + w2]... */
export function withRanges(results) {
  let n = 0;
  return results.map(r => { const w = Math.max(1, Math.round(r.weight ?? 1)); const range = [n + 1, n + w]; n += w; return {...r, weight: w, range}; });
}

/**
 * Expand a template. tables: (id) => table or undefined. vars: values for {{name}}.
 * Unknown tables are left in braces so the Storyteller sees the gap rather than a silent blank.
 */
export function expand(template, {rand, tables, vars = {}, depth = 0} = {}) {
  if ( depth > 8 ) return String(template ?? "");
  let s = String(template ?? "").replace(/\{\{(\w+)\}\}/g, (m, k) => (vars[k] ?? m));
  s = s.replace(/\{([^{}]+)\}/g, (m, inner) => {
    if ( inner.includes("|") ) return expand(pick(rand, inner.split("|")), {rand, tables, vars, depth: depth + 1});
    const t = tables?.(inner.trim());
    if ( !t ) return m;
    const r = drawResult(rand, t.results);
    return r ? expand(r.text, {rand, tables, vars, depth: depth + 1}) : "";
  });
  return s;
}

/** Draw from a table by id and expand the result. */
export function draw(tableId, {rand, tables, vars} = {}) {
  const t = tables?.(tableId);
  if ( !t ) return null;
  const r = drawResult(rand, t.results);
  return r ? {result: r, text: expand(r.text, {rand, tables, vars})} : null;
}

/**
 * The tables that fit the chronicle: an id may have variants tagged by era group and culture
 * ("names.male" for medieval Bohemia). Picks the most specific: culture and era, then era, then culture, then plain.
 */
export function resolveTable(all, id, {era = null, culture = null} = {}) {
  const c = all.filter(t => t.id === id);
  const score = t => (t.era ? 2 : 0) + (t.culture ? 1 : 0);
  // The era group first, then the groups it borrows from while it has no table of its own (future: modern)
  for ( const g of groupChain(era) ) {
    const fit = t => (!t.era || t.era.includes(g)) && (!t.culture || t.culture.includes(culture));
    const best = c.filter(fit).sort((a, b) => score(b) - score(a))[0];
    if ( best && (best.era || g === groupChain(era).at(-1)) ) return best;
  }
  return null;
}

/**
 * Groups that borrow another's tables where they have none of their own: the World of Future Darkness draws the
 * modern tables, the years between the Great War and the modern era the industrial ones, the prologues the medieval.
 */
export const GROUP_FALLBACK = {future: ["modern"], "mid-century": ["industrial"], ancient: ["medieval"]};
export const groupChain = g => [g, ...(GROUP_FALLBACK[g] ?? [])];

/**
 * The era group for an era profile and a year. The profile decides, except in the years no era book covers between
 * the Great War and the modern era (1919 to 1989), which are their own group, mid-century.
 */
export function eraGroupFor(profileId, year = null) {
  const y = Number(year);
  const base = ERA_GROUP[profileId] ?? "medieval";
  if ( year !== null && year !== "" && Number.isFinite(y) && y >= 1919 && y <= 1989 && base !== "ancient" ) return "mid-century";
  return base;
}

/** Era profiles gathered into the groups the people tables are written for. */
export const ERA_GROUP = {
  "dark-ages": "medieval", "long-night": "medieval", "classical": "ancient", "living-gods": "ancient",
  "renaissance": "early-modern", "age-of-reason": "early-modern", "mid-century": "mid-century", "victorian": "industrial", "wild-west": "industrial", "great-war": "industrial",
  "modern": "modern", "time-of-judgment": "modern", "future-darkness": "future", "time-of-future-judgement": "future"
};
