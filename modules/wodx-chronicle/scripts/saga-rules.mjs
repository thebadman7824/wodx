/**
 * The Rothenstein saga's rules (B3660-B3669). Pure, so the harness can test them: checking the saga, turning a book
 * into a story chain the clock deals out, the gaps between dated steps, which book comes next, the long clocks and
 * the words a step takes after an earlier ending.
 *
 * pod.mjs runs the books as story chains (a run with `saga` set) and keeps the saga's own state in podState.saga =
 * {endings: {<book>: <ending>}, clocks: {<key>: n}, books: {<book>: "running"|"done"|"skipped"|"offered"}}.
 */
import {SAGA, SAGA_CLOCKS, SAGA_ENDINGS} from "../data/saga-rothenstein.mjs";

export {SAGA, SAGA_CLOCKS, SAGA_ENDINGS};
export const DAY = 86400;
/** What a step may do to the town (WoDX Storyteller town-rules SAGA_TOWN has the same keys; B3670). */
export const TOWN_KINDS = ["boom", "war", "siege", "famine", "plague", "exile", "expulsion", "flood"];
export const SAGA_PREFIX = `saga:${SAGA.key}:`;
/** The book whose ending later books answer. */
export const FIRST_BOOK = "red-stone";
const STEP_KINDS = ["chapter", "interlude", "world"];

export const bookByKey = k => SAGA.books.find(b => b.key === k) ?? null;
export const chainKey = book => `${SAGA_PREFIX}${book}`;
export const isSagaKey = k => String(k ?? "").startsWith(SAGA_PREFIX);
export const bookOfKey = k => isSagaKey(k) ? bookByKey(String(k).slice(SAGA_PREFIX.length)) : null;

/** Whole days from one [year, month, day] to the next (the proleptic calendar; good enough for gaps). */
export function daysBetween(a, b) {
  const t = ([y, m, d]) => { const x = new Date(0); x.setUTCFullYear(y, (m || 1) - 1, d || 1); x.setUTCHours(0, 0, 0, 0); return x.getTime(); };
  return Math.round((t(b) - t(a)) / (DAY * 1000));
}
export const dateText = ([y, m, d]) => `${y < 0 ? `${-y} BCE` : y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** The step's words for the endings reached so far (the first book's ending picks `by`). */
export function wordsFor(step = {}, endings = {}) {
  const e = endings?.[FIRST_BOOK];
  return e && step.by?.[e] ? `${step.text} ${step.by[e]}` : step.text;
}

/** A book as a story chain in the shape of Chronicle's CHAINS, with the saga's extras on each step. */
export function bookChain(book, endings = {}) {
  const b = typeof book === "string" ? bookByKey(book) : book;
  if ( !b ) return null;
  const steps = b.steps.map((x, i) => ({key: x.key, kind: x.kind, title: x.title, text: wordsFor(x, endings),
    days: i ? Math.max(0, daysBetween(b.steps[i - 1].at, x.at)) : 0, at: x.at, date: dateText(x.at),
    journal: x.journal && b.journal ? {entry: b.journal, page: x.journal} : null,
    clocks: x.clocks ?? null, signal: x.signal ? {region: SAGA.region, about: "", ...x.signal} : null,
    ending: x.ending ?? null, encounters: x.encounters ?? [], town: x.town ?? null}));
  return {key: chainKey(b.key), label: `${SAGA.title}, book ${b.n}: ${b.title}`, lines: b.lines, from: b.from, to: b.to,
    page: "The Rothenstein saga (WoDX's own story)", saga: b.key, steps};
}

/** Every book's state for the window: running, done, skipped, offered, ready (fits the year) or ahead/past. */
export function bookStates(st = {}, year = 1197, {future = false} = {}) {
  return SAGA.books.filter(b => future || b.branch !== "future").map(b => {
    const s = st.books?.[b.key];
    const fits = year >= b.from && year <= b.to;
    return {key: b.key, n: b.n, title: b.title, from: b.from, to: b.to, state: s ?? (fits ? "ready" : year < b.from ? "ahead" : "past")};
  });
}

/**
 * The book to offer for this year, or null: the first one the year fits that nobody has started, finished, skipped or
 * been offered, while no other book runs. The prologue fits only before 1197; the future book only on that branch.
 */
export function dueBook(st = {}, year = 1197, {future = false} = {}) {
  const books = st.books ?? {};
  if ( Object.values(books).includes("running") ) return null;
  return SAGA.books.find(b => year >= b.from && year <= b.to && !books[b.key] && (future || b.branch !== "future")) ?? null;
}

/**
 * Books whose years the clock has passed without anyone starting them. The world still moved: their world steps'
 * clock moves are summed so the valley is as it would be (the Storyteller sees a card and can set them back).
 */
export function passedBooks(st = {}, year = 1197, {future = false} = {}) {
  return SAGA.books.filter(b => b.to < year && !st.books?.[b.key] && (future || b.branch !== "future"));
}
export function worldDelta(book) {
  const d = {};
  for ( const x of book?.steps ?? [] ) if ( x.kind === "world" ) for ( const [k, v] of Object.entries(x.clocks ?? {}) ) d[k] = (d[k] ?? 0) + v;
  return d;
}

/** The long clocks after a step: each moved by its delta and held between empty and full. */
export function moveClocks(clocks = {}, delta = {}) {
  const out = {...clocks};
  for ( const c of SAGA_CLOCKS ) {
    if ( !(c.key in (delta ?? {})) ) { out[c.key] = Math.max(0, Math.min(c.size, Number(out[c.key]) || 0)); continue; }
    out[c.key] = Math.max(0, Math.min(c.size, (Number(out[c.key]) || 0) + (Number(delta[c.key]) || 0)));
  }
  return out;
}
/** The clocks that are full: the saga's warnings for the Storyteller. */
export const fullClocks = (clocks = {}) => SAGA_CLOCKS.filter(c => (Number(clocks[c.key]) || 0) >= c.size);

/** Years the saga covers, for the window and the gate: from the prologue's first step to the last book's last. */
export function span({future = false} = {}) {
  const books = SAGA.books.filter(b => future || b.branch !== "future");
  return {from: books[0].steps[0].at[0], to: books.at(-1).steps.at(-1).at[0], books: books.length,
    steps: books.reduce((n, b) => n + b.steps.length, 0)};
}

/** Problems with the saga in plain words; empty means it is sound. eras = the Chronicle era ids (optional). */
export function validate(saga = SAGA, {eras = null} = {}) {
  const out = [], keys = new Set(), clockKeys = SAGA_CLOCKS.map(c => c.key);
  let lastTo = -Infinity;
  for ( const b of saga.books ?? [] ) {
    if ( keys.has(b.key) ) out.push(`The book ${b.key} is named twice.`);
    keys.add(b.key);
    if ( !b.title || !b.text ) out.push(`The book ${b.key} has no title or text.`);
    if ( !(b.from <= b.to) ) out.push(`The book ${b.key} ends before it starts.`);
    if ( b.from <= lastTo ) out.push(`The book ${b.key} starts before the book ahead of it ends.`);
    lastTo = b.to;
    if ( eras && !eras.includes(b.era) ) out.push(`The book ${b.key} names an unknown era (${b.era}).`);
    if ( !(b.steps ?? []).length ) out.push(`The book ${b.key} has no steps.`);
    const sk = new Set();
    (b.steps ?? []).forEach((x, i) => {
      const id = `${b.key}/${x.key}`;
      if ( sk.has(x.key) ) out.push(`The step ${id} is named twice.`);
      sk.add(x.key);
      if ( !STEP_KINDS.includes(x.kind) ) out.push(`The step ${id} has an unknown kind (${x.kind}).`);
      if ( !Array.isArray(x.at) || x.at.length !== 3 ) out.push(`The step ${id} has no date.`);
      else {
        if ( x.at[0] < b.from || x.at[0] > b.to ) out.push(`The step ${id} falls outside its book's years.`);
        if ( i && daysBetween(b.steps[i - 1].at, x.at) < 0 ) out.push(`The step ${id} comes before the step ahead of it.`);
      }
      if ( !x.title || !x.text ) out.push(`The step ${id} has no title or text.`);
      for ( const k of Object.keys(x.clocks ?? {}) ) if ( !clockKeys.includes(k) ) out.push(`The step ${id} moves an unknown clock (${k}).`);
      for ( const k of Object.keys(x.by ?? {}) ) if ( !SAGA_ENDINGS[k] ) out.push(`The step ${id} answers an unknown ending (${k}).`);
      for ( const k of x.ending ?? [] ) if ( !SAGA_ENDINGS[k] ) out.push(`The step ${id} offers an unknown ending (${k}).`);
      if ( x.town && !TOWN_KINDS.includes(x.town) ) out.push(`The step ${id} names an unknown town change (${x.town}).`);
      if ( x.journal && !b.journal ) out.push(`The step ${id} points at a page, but its book has no journal.`);
    });
  }
  return out;
}
