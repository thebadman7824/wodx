/**
 * Book one's encounters, the rules (Rothenstein Rebuilt, Volume Two picks v1-v6, B6640-B6649). Pure functions over
 * the state in podState.saga.encounters; encounters.mjs puts them on the table. Data in data/encounters-rothenstein.mjs.
 *
 * An encounter is offered on a card when the company stands on one of its maps, in its months, from its chapter, after
 * any encounter it needs (v1). The Storyteller plays it, puts it off for tonight, or strikes it. Each plays once; put
 * off, it comes back after a day (v2). Its window closes once the last chapter it fits best is played, or when its
 * months have come and gone; unmet, what happens off the map happens: street talk, clocks, a sight, fronts (v3). Its
 * twist waits for it to be played (v5, twist-rules ctx.met).
 *
 * State: {since, played: {n: at}, later: {n: until}, never: {n: at}, closed: {n: at}, offered: {n: at}, seen: {n: 1},
 *   people: {n: [actor ids]}}.
 */
import {ENCOUNTERS, KINDS} from "../data/encounters-rothenstein.mjs";
import {CHAPTERS, chapterNow, pickScene, frontOf, clueOf, judgementOf} from "./front-rules.mjs";
import {SAGA_CLOCKS} from "./saga-rules.mjs";
import {DAY} from "./terms.mjs";

export {ENCOUNTERS, KINDS, DAY};
const idx = k => CHAPTERS.indexOf(k);
/** The chapter after which no new twist comes (twist-rules LAST_CHAPTER): an encounter for "any time" closes there. */
export const LAST = "c9";
/** How long Not tonight puts an encounter off. */
export const LATER = DAY;
/** An offered encounter is not offered again for this long, while the company stays. */
export const QUIET = DAY;

export const encounterOf = n => ENCOUNTERS.find(e => e.n === Number(n)) ?? null;
/** The chapter its window closes after. */
export const closesAfter = e => (e?.best?.length ? e.best[e.best.length - 1] : LAST);

export function normState(s = {}, now = 0) {
  const o = k => ({...(s?.[k] ?? {})});
  return {since: Number.isFinite(Number(s?.since)) && s?.since !== null ? Number(s.since) : now, played: o("played"), later: o("later"), never: o("never"),
    closed: o("closed"), offered: o("offered"), seen: o("seen"), people: o("people")};
}
/** The encounters played, as numbers (twist-rules ctx.met). */
export const met = st => Object.keys(st?.played ?? {}).map(Number).sort((a, b) => a - b);

const inMonths = (e, month) => !e.months?.length || e.months.includes(Number(month));
/** Does the company's scene fit one of the encounter's maps? */
export const onMap = (e, sceneName = "") => !!sceneName && e.scenes.some(h => pickScene([sceneName], h));

/**
 * Why encounter n cannot come now, or "" when it can. ctx: {now, played, month, scene (the company's scene name),
 * force}. Force skips the map and the months but not once-only, struck or closed.
 */
export function whyNot(st, n, ctx = {}) {
  const e = encounterOf(n);
  if ( !e ) return "There is no such encounter.";
  if ( st.played[e.n] !== undefined ) return "Already played.";
  if ( st.never[e.n] !== undefined ) return "Struck from the book.";
  if ( st.closed[e.n] !== undefined ) return "Its window has closed; it happened off the map.";
  const played = ctx.played ?? [], now = Number(ctx.now) || 0, ch = chapterNow(played);
  if ( ch && idx(e.from) > idx(ch) ) return `It fits from chapter ${idx(e.from) + 1}; the company is in chapter ${idx(ch) + 1}.`;
  if ( e.needs?.length && !e.needs.some(k => st.played[k] !== undefined) ) return `It follows encounter ${e.needs.join(" or ")}.`;
  if ( e.days && now - st.since < e.days * DAY ) return `It comes after ${e.days} days in the valley.`;
  if ( ctx.force ) return "";
  if ( Number(st.later[e.n]) > now ) return "Put off tonight.";
  if ( !inMonths(e, ctx.month) ) return `It fits in ${monthNames(e.months)}.`;
  if ( !onMap(e, ctx.scene) ) return `The company is not on its maps (${e.scenes.join(", ")}).`;
  return "";
}
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const monthNames = (ms = []) => ms.map(m => MONTHS[m - 1]).join(", ");

/** The encounters to offer now: open, on the company's map, not offered within QUIET. Best-fit chapters first. */
export function due(st, ctx = {}) {
  const now = Number(ctx.now) || 0, ch = chapterNow(ctx.played ?? []);
  return ENCOUNTERS.filter(e => !whyNot(st, e.n, ctx) && !(st.offered[e.n] !== undefined && now - Number(st.offered[e.n]) < QUIET))
    .sort((a, b) => Number(b.best?.includes(ch)) - Number(a.best?.includes(ch)) || a.n - b.n).map(e => e.n);
}
export const offer = (st, ns = [], now = 0) => ({...st, offered: {...st.offered, ...Object.fromEntries(ns.map(n => [n, now]))}});

/** Play it: once. Throws with the reason when it cannot be (force skips the map and the months). */
export function play(st, n, {now = 0, played = [], month = 0, scene = "", force = true} = {}) {
  const why = whyNot(st, n, {now, played, month, scene, force});
  if ( why ) throw new Error(why);
  const out = {...st, played: {...st.played, [n]: now}};
  const later = {...st.later}; delete later[n]; out.later = later;
  return out;
}
/** Not tonight: back after LATER. */
export function later(st, n, now = 0) { return {...st, later: {...st.later, [n]: now + LATER}}; }
/** Never: struck; its window still closes and the world still goes on. */
export function never(st, n, now = 0) { return {...st, never: {...st.never, [n]: now}}; }
/** Take a play, a put-off or a strike back (a slip of the hand). */
export function unplay(st, n) {
  const out = normState(st, st.since);
  for ( const k of ["played", "later", "never", "closed", "offered"] ) delete out[k][n];
  return out;
}
/** Record the people an encounter put on the map. */
export const keepPeople = (st, n, ids = []) => ({...st, people: {...st.people, [n]: [...new Set([...(st.people[n] ?? []), ...ids])]}});

/** Mark the months seen: an encounter whose months came round once closes when they pass. */
export function see(st, month) {
  const seen = {...st.seen};
  for ( const e of ENCOUNTERS ) if ( e.months?.length && e.months.includes(Number(month)) ) seen[e.n] = 1;
  return {...st, seen};
}

/** The encounters whose window closes now, unmet: the last best chapter played, or their months come and gone. */
export function closing(st, ctx = {}) {
  const played = ctx.played ?? [];
  return ENCOUNTERS.filter(e => st.played[e.n] === undefined && st.closed[e.n] === undefined && (
    played.includes(closesAfter(e)) || (e.months?.length && st.seen[e.n] && !inMonths(e, ctx.month) && Number(st.later[e.n] ?? 0) <= (Number(ctx.now) || 0))
  )).map(e => e.n);
}
export const close = (st, ns = [], now = 0) => ({...st, closed: {...st.closed, ...Object.fromEntries(ns.map(n => [n, now]))}});

/** What playing it moves, for the card and the glue: front steps that are next, fronts pushed, names leaned on, clues. */
export const tiesOf = n => encounterOf(n)?.ties ?? {};
/** What happens off the map when its window closes unmet. */
export const offmapOf = n => encounterOf(n)?.offmap ?? {};

/** A front step from a tie: it lands only if it is that front's next step. */
export const stepIsNext = (frontState, key, step) => {
  const f = frontOf(key), at = frontState?.fronts?.[key]?.at ?? 0;
  return !!f && f.steps[at]?.key === step;
};

/** The pairs, the people and the ties all refer to things that exist. */
export function validate() {
  const out = [], seen = new Set(), clocks = new Set(SAGA_CLOCKS.map(c => c.key));
  for ( const e of ENCOUNTERS ) {
    if ( seen.has(e.n) ) out.push(`${e.n}: twice`);
    seen.add(e.n);
    if ( !e.label || !KINDS[e.kind] ) out.push(`${e.n}: label or kind`);
    if ( !e.scenes?.length ) out.push(`${e.n}: no maps`);
    if ( idx(e.from) < 0 ) out.push(`${e.n}: from ${e.from}`);
    for ( const c of e.best ?? [] ) if ( idx(c) < 0 ) out.push(`${e.n}: best ${c}`);
    if ( e.best?.length && idx(closesAfter(e)) < idx(e.from) ) out.push(`${e.n}: closes before it opens`);
    for ( const m of e.months ?? [] ) if ( !(m >= 1 && m <= 12) ) out.push(`${e.n}: month ${m}`);
    for ( const k of e.needs ?? [] ) if ( !ENCOUNTERS.some(x => x.n === k) ) out.push(`${e.n}: needs ${k}`);
    for ( const p of e.people ?? [] ) if ( !p.name || !p.preset ) out.push(`${e.n}: person`);
    const t = e.ties ?? {}, o = e.offmap ?? {};
    for ( const [k, s] of [...(t.front ?? []), ...(o.front ?? [])] ) if ( !frontOf(k)?.steps.some(x => x.key === s) ) out.push(`${e.n}: front ${k}/${s}`);
    for ( const k of [...(t.push ?? []), ...(o.push ?? [])] ) if ( !frontOf(k) ) out.push(`${e.n}: push ${k}`);
    for ( const [k, i] of t.clues ?? [] ) if ( !clueOf(k)?.carriers[i] ) out.push(`${e.n}: clue ${k}/${i}`);
    for ( const k of Object.keys(o.moves ?? {}) ) if ( !clocks.has(k) ) out.push(`${e.n}: clock ${k}`);
    if ( o.judge && !judgementOf(o.judge[0])?.choices?.[o.judge[1]] ) out.push(`${e.n}: judgement`);
    if ( !o.talk ) out.push(`${e.n}: no street talk when it closes`);
  }
  if ( ENCOUNTERS.length !== 24 ) out.push(`${ENCOUNTERS.length} encounters, not 24`);
  return out;
}
