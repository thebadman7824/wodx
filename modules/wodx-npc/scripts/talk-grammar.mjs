/**
 * WoDX NPC 0.36.0: the talk generator, the pure part. No Foundry here, so the harness can test it.
 *
 * It makes what an NPC says when the Storyteller has written nothing that fits. No AI model: a grammar, in the
 * manner of Tracery (symbols that expand into words), with rules picked the way Left 4 Dead's dialogue picks them
 * (the rule that fits the most facts wins) and slots filled from the scene, as Crusader Kings III fills its text.
 * The Storyteller's own talk sheet lines are always tried first, by talk.mjs; this file is only asked after them.
 *
 * A rule: {id, when: {fact: test, ...}, say: ["line", ...], boost}. Tests on a fact:
 *   "ventrue"            the fact is that value (or, if the fact is a list, holds it)
 *   ["brujah", "gangrel"] any of these
 *   "!child"             anything but this (a missing fact passes)
 *   year: [1300, 1526]   from and to, inclusive
 *   traits: {Dominate: 2} each trait rated at least this (the facts carry {traits: {Dominate: 3}})
 * A rule's score is how many tests it has, plus its boost. Of the rules whose tests all pass, only those with the
 * best score speak, their lines pooled. Ties pool on purpose: a merchant's own greetings mix with the era's.
 *
 * In a line: #symbol# expands from the grammar's symbols (a list of words, or rules like the above whose best
 * match is used), #symbol.cap# capitalises the first letter, #symbol.a# puts "a" or "an" before it. {fact} is
 * the fact's own words (a rumour, a feast, a name). #they# #them# #their# #theirs# #themself# #theyre# #theyve#
 * follow the fact "gender" ("m" or "f" when the Storyteller has set one), else they, so text stays neutral.
 */

/** Era bands, as stock talk (data/stock-talk.mjs) has them. */
export const BANDS = ["medieval", "earlymodern", "nineteenth", "twentieth", "modern", "future"];
export const REGARDS = ["hate", "dislike", "neutral", "like", "love"];
/** A year to stand for each band when only the band is known, and the band of a year (as talk-rules eraBand). */
export const BAND_YEAR = {medieval: 1350, earlymodern: 1650, nineteenth: 1850, twentieth: 1940, modern: 2000, future: 2040};
export const bandOf = year => { const y = Number(year); return y < 1500 ? "medieval" : y < 1800 ? "earlymodern" : y < 1900 ? "nineteenth" : y < 1980 ? "twentieth" : y < 2026 ? "modern" : "future"; };
export const warmthOf = regard => (regard === "hate" || regard === "dislike" ? "cold" : regard === "like" || regard === "love" ? "warm" : "neutral");

const lc = v => String(v ?? "").trim().toLowerCase();
const MAX_DEPTH = 8;

/** Does one test pass against the facts? */
export function testFact(key, want, facts = {}) {
  const have = facts[key];
  if ( key === "year" ) {
    const y = Number(facts.year);
    if ( !Number.isFinite(y) ) return false;
    const [from = -Infinity, to = Infinity] = Array.isArray(want) ? want : [want, want];
    return y >= (from ?? -Infinity) && y <= (to ?? Infinity);
  }
  if ( key === "traits" ) {
    const t = facts.traits ?? {};
    const rated = name => { const k = Object.keys(t).find(x => lc(x) === lc(name)); return k ? Number(t[k]) || 0 : 0; };
    return Object.entries(want ?? {}).every(([name, n]) => rated(name) >= (Number(n) || 1));
  }
  const haves = (Array.isArray(have) ? have : [have]).filter(v => v !== undefined && v !== null && v !== "").map(lc);
  const one = w => {
    const s = lc(w);
    if ( s.startsWith("!") ) return !haves.includes(s.slice(1));
    return haves.includes(s);
  };
  if ( Array.isArray(want) ) {
    const nots = want.filter(w => lc(w).startsWith("!")), yes = want.filter(w => !lc(w).startsWith("!"));
    return nots.every(one) && (!yes.length || yes.some(one));
  }
  if ( typeof want === "boolean" ) return want ? haves.length > 0 && !haves.includes("false") : !haves.length || haves.includes("false");
  return one(want);
}

/** How well a rule fits: -1 when a test fails, else its number of tests plus its boost. */
export function scoreRule(rule, facts = {}) {
  const when = rule?.when ?? {};
  let n = 0;
  for ( const [k, w] of Object.entries(when) ) {
    if ( !testFact(k, w, facts) ) return -1;
    n += k === "traits" ? Object.keys(w ?? {}).length : 1;
  }
  return n + (Number(rule?.boost) || 0);
}

/** The best-fitting rules of a list, pooled. Returns {score, rules}. */
export function bestRules(rules = [], facts = {}) {
  let best = -1, out = [];
  for ( const r of rules ) {
    if ( !(r?.say ?? []).length ) continue;
    const s = scoreRule(r, facts);
    if ( s < 0 ) continue;
    if ( s > best ) { best = s; out = [r]; }
    else if ( s === best ) out.push(r);
  }
  return {score: best, rules: out};
}

/** A small, steady hash so the same seed always gives the same pick (FNV-1a). */
export function mix(seed, salt) {
  let h = (Number(seed) >>> 0) ^ 2166136261;
  for ( const ch of String(salt) ) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

const PRONOUN = {
  they: {m: "he", f: "she", n: "they"}, them: {m: "him", f: "her", n: "them"}, their: {m: "his", f: "her", n: "their"},
  theirs: {m: "his", f: "hers", n: "theirs"}, themself: {m: "himself", f: "herself", n: "themself"},
  theyre: {m: "he's", f: "she's", n: "they're"}, theyve: {m: "he's", f: "she's", n: "they've"}
};
const genderOf = f => { const g = lc(f.gender); return g === "m" || g === "male" ? "m" : g === "f" || g === "female" ? "f" : "n"; };
const capFirst = s => s.replace(/^(\W*)(\p{L})/u, (m, a, b) => a + b.toUpperCase());
const withA = s => (/^[aeiou]/i.test(s.trim()) && !/^(uni|use|eu|one)/i.test(s.trim()) ? "an " : "a ") + s;

/** The words for one symbol: a plain list, or rules (best match). */
function symbolWords(entry, facts) {
  if ( !entry ) return null;
  if ( Array.isArray(entry) && entry.every(x => typeof x === "string") ) return entry;
  const rules = Array.isArray(entry) ? entry : [entry];
  const {rules: best} = bestRules(rules, facts);
  return best.flatMap(r => r.say);
}

/**
 * Expand #symbols# and {facts} in a line. Unknown symbols are left as they are so lint() can find them.
 * Returns the words.
 */
export function expand(text, facts = {}, symbols = {}, seed = 0, depth = 0) {
  let n = 0;
  let out = String(text ?? "").replace(/#([a-zA-Z][\w]*)((?:\.\w+)*)#/g, (m, name, mods) => {
    n += 1;
    let word;
    if ( PRONOUN[name] ) word = PRONOUN[name][genderOf(facts)];
    else {
      const words = symbolWords(symbols[name], facts);
      if ( !words?.length ) return m;
      const pick = words[mix(seed, `${name}|${n}|${depth}`) % words.length];
      word = depth < MAX_DEPTH ? expand(pick, facts, symbols, mix(seed, pick), depth + 1) : pick;
    }
    for ( const mod of mods.split(".").filter(Boolean) ) {
      if ( mod === "cap" ) word = capFirst(word);
      else if ( mod === "a" ) word = withA(word);
    }
    return word;
  });
  out = out.replace(/\{(\w+)\}/g, (m, k) => {
    const v = facts[k];
    return v === undefined || v === null || v === "" ? m : String(v).trim().replace(/^"|"$/g, "");
  });
  return out;
}

/**
 * Make a line. kind: greet, none, gossip, news, work, directions, farewell, cry:alarm, bark:<work>, ...
 * facts: what is true here (era, year, regard, warmth, voice, clan, mood, topic, traits, gender, rumour, ...).
 * seed: steady per NPC, character and day. recent: lines said lately, avoided when anything else fits.
 * A rule whose line needs a fact that is missing ({rumour} with no rumour) is skipped.
 * Returns {say, rule, score} or null.
 */
export function generate(kind, facts = {}, {grammar, seed = 0, recent = []} = {}) {
  const rules = grammar?.rules?.[kind];
  if ( !rules?.length ) return null;
  const f = {...facts, kind, regard: facts.regard ?? "neutral"};
  f.warmth = facts.warmth ?? warmthOf(f.regard);
  if ( !Number.isFinite(Number(f.year)) || f.year === null || f.year === "" ) f.year = BAND_YEAR[f.era] ?? 2000;
  f.era ??= bandOf(f.year);
  const needs = line => [...String(line).matchAll(/\{(\w+)\}/g)].every(m => f[m[1]] !== undefined && f[m[1]] !== null && f[m[1]] !== "");
  const fit = rules.map(r => ({...r, say: (r.say ?? []).filter(needs)}));
  const {score, rules: best} = bestRules(fit, f);
  if ( !best.length ) return null;
  const pool = best.flatMap(r => r.say.map(line => ({line, rule: r.id ?? null})));
  const said = new Set((recent ?? []).map(String));
  const start = mix(seed, kind) % pool.length;
  for ( let i = 0; i < pool.length; i++ ) {
    const p = pool[(start + i) % pool.length];
    const say = expand(p.line, f, grammar.symbols ?? {}, mix(seed, p.line));
    if ( !said.has(say) || i === pool.length - 1 ) return {say, rule: p.rule, score};
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Stock talk as grammar rules                                        */
/* ------------------------------------------------------------------ */

const R = (id, when, say, boost = 0) => ({id, when, say: [...(say ?? [])], ...(boost ? {boost} : {})});
const ONLY_VOICES = ["child", "beggar", "drunk"];

/**
 * The hand-written stock talk (data/stock-talk.mjs, data/stock-talk-more.mjs) turned into rules, so it speaks
 * through the generator as before: the same pools for the same era, regard and voice. Children, beggars and drunks
 * keep to their own lines (boost 1). Returns {kind: [rules]}.
 */
export function poolRules(stock = {}, more = {}) {
  const out = {};
  const add = (kind, rule) => { if ( rule.say.length ) (out[kind] ??= []).push(rule); };
  for ( const [era, by] of Object.entries(stock.GREET ?? {}) ) for ( const [r, l] of Object.entries(by) ) add("greet", R(`greet.${era}.${r}`, {era, regard: r}, l));
  for ( const [r, l] of Object.entries(stock.NONE ?? {}) ) add("none", R(`none.${r}`, {regard: r}, l));
  for ( const k of ["GOSSIP", "NEWS", "WORK"] ) {
    const kind = k.toLowerCase();
    for ( const [era, l] of Object.entries(stock[k] ?? {}) ) add(kind, R(`${kind}.${era}`, {era, regard: "!hate"}, l));
  }
  // news and work from someone who hates the character: a brush-off; gossip has its own refusals
  for ( const kind of ["news", "work"] ) add(kind, R(`${kind}.hate`, {regard: "hate"}, stock.NONE?.hate));
  for ( const [r, l] of Object.entries(stock.DIRECTIONS ?? {}) ) add("directions", R(`directions.${r}`, {regard: r}, l));
  for ( const [r, l] of Object.entries(stock.RUMOUR_LEAD ?? {}) ) add("rumour", R(`rumour.${r}`, {regard: r}, l));
  // refusals: someone who hates the character tells no rumour at all; someone who dislikes them shares no gossip
  for ( const [r, l] of Object.entries(stock.RUMOUR_REFUSE ?? {}) ) {
    if ( r === "hate" ) add("rumour", R(`rumour.refuse.${r}`, {regard: r}, l, 5));
    add("gossip", R(`gossip.refuse.${r}`, {regard: r}, l, 5));
  }
  for ( const [era, by] of Object.entries(more.FAREWELL ?? {}) ) for ( const [w, l] of Object.entries(by) ) add("farewell", R(`farewell.${era}.${w}`, {era, warmth: w}, l));
  for ( const [era, l] of Object.entries(more.CRY_ALARM ?? {}) ) add("cry:alarm", R(`cry.alarm.${era}`, {era}, l));
  for ( const [era, l] of Object.entries(more.CRY_THREAT ?? {}) ) add("cry:threat", R(`cry.threat.${era}`, {era}, l));
  add("cry:hurt", R("cry.hurt", {}, more.CRY_HURT));
  for ( const [a, l] of Object.entries(more.BARK ?? {}) ) add(`bark:${a}`, R(`bark.${a}`, {}, l));
  for ( const [era, by] of Object.entries(more.BARK_ERA ?? {}) ) for ( const [a, l] of Object.entries(by ?? {}) ) add(`bark:${a}`, R(`bark.${a}.${era}`, {era}, l, -1));
  for ( const [a, v] of Object.entries(more.TRADE ?? {}) ) {
    if ( Array.isArray(v) ) add(`trade:${a}`, R(`trade.${a}`, {}, v));
    else for ( const [w, l] of Object.entries(v ?? {}) ) add(`trade:${a}`, R(`trade.${a}.${w}`, {warmth: w}, l));
  }
  for ( const [a, v] of Object.entries(more.SOCIAL ?? {}) ) for ( const [wl, l] of Object.entries(v ?? {}) ) add(`social:${a}:${wl}`, R(`social.${a}.${wl}`, {}, l));
  for ( const [k, l] of Object.entries(more.NOTICE ?? {}) ) add(`notice:${k}`, R(`notice.${k}`, {}, l));
  for ( const [k, l] of Object.entries(more.SMALL ?? {}) ) add(`small:${k}`, R(`small.${k}`, {}, l));
  for ( const [r, l] of Object.entries(more.ABOUT_YOU ?? {}) ) add("about", R(`about.${r}`, {regard: r}, l));
  for ( const [k, by] of Object.entries(more.REMEMBER ?? {}) ) for ( const [w, l] of Object.entries(by) ) add(`remember:${k}`, R(`remember.${k}.${w}`, {warmth: w}, l));
  for ( const [k, l] of Object.entries(more.LEDGER ?? {}) ) add(`ledger:${k}`, R(`ledger.${k}`, {}, l));
  // voices: their own greetings, brush-offs and gossip, pooled with the era's (same score), or alone (boost)
  for ( const [v, d] of Object.entries(more.VOICES ?? {}) ) {
    const only = ONLY_VOICES.includes(v) ? 1 : 0, from = d.from ? {year: [d.from, null]} : {};
    for ( const [w, l] of Object.entries(d.greet ?? {}) ) add("greet", R(`voice.${v}.greet.${w}`, {voice: v, warmth: w, ...from}, l, only - (d.from ? 1 : 0)));
    add("none", R(`voice.${v}.none`, {voice: v, ...from}, d.none, (only ? 2 : 0) - (d.from ? 1 : 0)));
    add("gossip", R(`voice.${v}.gossip`, {voice: v, regard: "!hate", ...from}, d.gossip, only - (d.from ? 1 : 0)));
  }
  return out;
}

/**
 * Put grammars together: later ones add rules to a kind and add or replace symbols. A rule with the same id as an
 * earlier one replaces it, so the Storyteller's grammar can override the house's.
 */
export function mergeGrammars(...gs) {
  const rules = {}, symbols = {};
  for ( const g of gs.filter(Boolean) ) {
    for ( const [kind, list] of Object.entries(g.rules ?? {}) ) {
      const have = (rules[kind] ??= []);
      for ( const r of list ?? [] ) {
        const i = r.id ? have.findIndex(x => x.id === r.id) : -1;
        if ( i >= 0 ) have[i] = r; else have.push(r);
      }
    }
    Object.assign(symbols, g.symbols ?? {});
  }
  return {rules, symbols};
}

/* ------------------------------------------------------------------ */
/*  Checks for the harness                                             */
/* ------------------------------------------------------------------ */

const symbolsIn = text => [...String(text).matchAll(/#([a-zA-Z]\w*)(?:\.\w+)*#/g)].map(m => m[1]);

/** Problems in a grammar: unknown symbols, empty rules, symbols nobody uses. Returns a list of strings. */
export function lint(grammar = {}) {
  const out = [], used = new Set(), syms = grammar.symbols ?? {};
  const check = (where, text) => {
    for ( const s of symbolsIn(text) ) { used.add(s); if ( !PRONOUN[s] && !syms[s] ) out.push(`${where}: unknown symbol #${s}#`); }
  };
  for ( const [kind, list] of Object.entries(grammar.rules ?? {}) ) {
    for ( const r of list ) {
      if ( !(r.say ?? []).length ) out.push(`${kind} ${r.id ?? "?"}: no lines`);
      for ( const l of r.say ?? [] ) check(`${kind} ${r.id ?? "?"}`, l);
    }
  }
  for ( const [name, e] of Object.entries(syms) ) {
    const lines = Array.isArray(e) && e.every(x => typeof x === "string") ? e : (Array.isArray(e) ? e : [e]).flatMap(r => r.say ?? []);
    if ( !lines.length ) out.push(`#${name}#: no words`);
    lines.forEach(l => check(`#${name}#`, l));
  }
  for ( const name of Object.keys(syms) ) if ( !used.has(name) ) out.push(`#${name}#: never used`);
  return out;
}

/** Kinds that must speak for every era band and every regard (the harness checks them). */
export const MUST_SPEAK = ["greet", "none", "gossip", "news", "work", "directions", "farewell", "cry:alarm", "cry:threat", "cry:hurt"];
