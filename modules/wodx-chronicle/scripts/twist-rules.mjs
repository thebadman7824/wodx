/**
 * Book one's twist web (B4850-B4853): which twists can be revealed now, which a revealed twist rules out, and the one
 * twist a week of game time. Pure, so the harness can test it; pod.mjs keeps the state and shows the window.
 *
 * State: {revealed: {<n>: {at, variant, chapter}}, last: <world time of the last reveal>}.
 * Context: {now, played: [chapter keys played], force}.
 */
import {CHAINS, TWISTS, PAIRS, ORDER, LAST_CHAPTER, CHAPTERS, WEEK} from "../data/twists-rothenstein.mjs";
import {DAY} from "./terms.mjs";
export {CHAINS, TWISTS, PAIRS, ORDER, LAST_CHAPTER, CHAPTERS, WEEK};

export const twistOf = n => TWISTS.find(t => t.n === Number(n)) ?? null;
export const chainsOf = n => CHAINS.filter(c => c.twists.includes(Number(n))).map(c => c.key);
const idx = k => CHAPTERS.indexOf(k);

/** The chapter the company is in: the first one not yet played. */
export function chapterNow(played = []) {
  return CHAPTERS.find(k => !played.includes(k)) ?? null;
}

/** What revealing `n` does to the others: partners that need another heart, and a twist's other variant. */
export function changedBy(n, variant = "") {
  const out = [];
  for ( const p of PAIRS ) {
    if ( p.a === Number(n) ) out.push({n: p.b, note: p.note});
    if ( p.b === Number(n) ) out.push({n: p.a, note: p.note});
  }
  const t = twistOf(n);
  if ( t?.variants && variant ) for ( const v of Object.keys(t.variants) ) if ( v !== variant ) out.push({n: t.n, variant: v, note: `Only one heart can be used: ${t.variants[variant]}.`});
  return out;
}

/** The notes on a twist that a revealed partner changed (it can still be used, with the other heart). */
export function heartNotes(n, state = {}) {
  return Object.keys(state.revealed ?? {}).flatMap(r => changedBy(r, state.revealed[r]?.variant).filter(c => c.n === Number(n) && !c.variant).map(c => c.note));
}

/**
 * Why twist n cannot be revealed now, or "" when it can. `force` (the company dug it out by its own hand) skips the
 * week and the chapter; nothing skips a twist already spent or the end of new twists after the choosing.
 */
export function whyNot(n, state = {}, ctx = {}) {
  const t = twistOf(n);
  if ( !t ) return "There is no such twist.";
  if ( state.revealed?.[t.n] ) return "Already revealed.";
  const played = ctx.played ?? [];
  if ( played.includes(LAST_CHAPTER) ) return "No new twists after the choosing; the company pulls the last threads itself.";
  const now = chapterNow(played);
  if ( !ctx.force && now && idx(t.from) > idx(now) ) return `It fits from chapter ${idx(t.from) + 1}; the company is in chapter ${idx(now) + 1}.`;
  const last = state.last === undefined || state.last === null ? NaN : Number(state.last), at = Number(ctx.now) || 0;
  if ( !ctx.force && Number.isFinite(last) && at - last < WEEK ) {
    const days = Math.ceil((WEEK - (at - last)) / DAY);
    return `One twist a week: the next can come in ${days} ${days === 1 ? "day" : "days"}.`;
  }
  return "";
}

/** The twist to reveal next by the quick order, and the free quiet ones that fit tonight. */
export function suggest(state = {}, ctx = {}) {
  const open = n => !whyNot(n, state, {...ctx, force: false});
  const next = ORDER.find(open) ?? null;
  const quiet = TWISTS.filter(t => t.free && open(t.n)).map(t => t.n);
  return {next, quiet};
}

/** Reveal twist n: a new state, and the changes it makes to others. Throws with the reason when it cannot be. */
export function reveal(state = {}, n, {variant = "", now = 0, played = [], force = false} = {}) {
  const why = whyNot(n, state, {now, played, force});
  if ( why ) throw new Error(why);
  const t = twistOf(n);
  if ( t.variants && !t.variants[variant] ) throw new Error(`Choose its heart: ${Object.keys(t.variants).join(" or ")}.`);
  const out = {...state, revealed: {...(state.revealed ?? {}), [t.n]: {at: now, variant: t.variants ? variant : "", chapter: chapterNow(played)}}, last: now};
  return {state: out, changes: changedBy(t.n, variant)};
}

/** Each chain's knots: how many of its twists are revealed, and whether its pay-off chapters have come. */
export function chainTally(state = {}, played = []) {
  return CHAINS.map(c => ({key: c.key, label: c.label, of: c.twists.length, found: c.twists.filter(n => state.revealed?.[n]).length,
    due: c.pays.filter(k => played.includes(k) || chapterNow(played) === k)}));
}

/** The data checks: every twist on a chain or free, pairs and order name real twists, chapters exist. */
export function validate() {
  const out = [], ns = new Set(TWISTS.map(t => t.n));
  for ( const t of TWISTS ) {
    if ( !CHAPTERS.includes(t.from) ) out.push(`Twist ${t.n} names an unknown chapter.`);
    if ( !t.free && !chainsOf(t.n).length && !ORDER.includes(t.n) ) out.push(`Twist ${t.n} is on no chain and not free.`);
  }
  for ( const c of CHAINS ) for ( const n of c.twists ) if ( !ns.has(n) ) out.push(`The chain ${c.key} names twist ${n}, which is not there.`);
  for ( const p of PAIRS ) if ( !ns.has(p.a) || !ns.has(p.b) ) out.push(`A pair names a twist that is not there (${p.a}, ${p.b}).`);
  for ( const n of ORDER ) if ( !ns.has(n) ) out.push(`The order names twist ${n}, which is not there.`);
  return out;
}
