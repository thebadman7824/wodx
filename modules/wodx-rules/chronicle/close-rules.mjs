/**
 * Closing a chronicle (Chronicle Packs Desk c1 and c3; Ben's picks, 18 Nov 2026). Pure, so the harness can test it.
 *
 * Closing stops the chronicle's engines for good in this world: no more saga books, fronts, twists, encounters, reveals,
 * Threads of Fate cards or world events from it. Its people, places and factions stay as they ended and become
 * ordinary world content for the shared systems. Nothing is deleted: the chronicle's saved state is put away under its
 * own id in podState.closed, so it can be opened again (or the close taken back with the night's work).
 *
 *   podState.closed[<chronicle id>] = {id, title, at, date, book, saga, chains}
 *     saga    the podState.saga it had (endings, clocks, books, fronts, twists, encounters, reveals)
 *     chains  its saga books that were still running
 *   setting wodx-chronicle.chroniclesClosed = {<chronicle id>: {id, title, at, date, book}}  (what the engines read)
 */

/** The story-chain key prefix of a chronicle's saga books (as saga-rules chainKey writes them). */
export const sagaPrefixOf = pack => `saga:${pack?.saga?.SAGA?.key ?? ""}:`;

/** The book the chronicle stopped at: the one running, else the last one done, else "". */
export function stoppedAt(pack, saga = {}) {
  const books = pack?.saga?.SAGA?.books ?? [], st = saga?.books ?? {};
  const running = books.find(b => st[b.key] === "running");
  if ( running ) return running.key;
  return [...books].reverse().find(b => st[b.key] === "done")?.key ?? "";
}

/**
 * The world's story state with the chronicle put away. state is podState (not changed); returns
 * {state, entry, chains} where entry is the line for the closed list and chains the saga runs taken off the clock.
 */
export function closeState(state = {}, pack, {at = 0, date = ""} = {}) {
  if ( !pack?.id ) throw new Error("Close needs a chronicle.");
  const s = structuredClone(state ?? {}), prefix = sagaPrefixOf(pack);
  s.chains ??= [];
  const chains = s.chains.filter(r => String(r?.key ?? "").startsWith(prefix));
  s.chains = s.chains.filter(r => !String(r?.key ?? "").startsWith(prefix));
  const saga = s.saga ?? {};
  const entry = {id: pack.id, title: pack.title ?? pack.id, at, date, book: stoppedAt(pack, saga)};
  (s.closed ??= {})[pack.id] = {...entry, saga, chains};
  delete s.saga;
  return {state: s, entry, chains};
}

/**
 * The world's story state with a closed chronicle brought back. Returns {state} or {error} in plain words: it will not
 * bring one back over another chronicle's saga that has started since.
 */
export function reopenState(state = {}, id) {
  const s = structuredClone(state ?? {}), kept = s.closed?.[id];
  if ( !kept ) return {error: "That chronicle is not closed in this world."};
  const busy = Object.values(s.saga ?? {}).some(v => v && typeof v === "object" ? Object.keys(v).length : !!v);
  if ( busy ) return {error: "Another chronicle's saga has started in this world since. Close that one first."};
  s.saga = kept.saga ?? {};
  s.chains = [...(s.chains ?? []), ...(kept.chains ?? [])];
  delete s.closed[id];
  if ( !Object.keys(s.closed).length ) delete s.closed;
  return {state: s};
}

/** The closed list with one chronicle added or taken off. */
export const withClosed = (list = {}, entry) => ({...(list ?? {}), [entry.id]: entry});
export function withoutClosed(list = {}, id) {
  const out = {...(list ?? {})};
  delete out[id];
  return out;
}
export const closedIdsOf = (list = {}) => Object.keys(list ?? {});

/* ---------------- the end of a book (c3) ---------------- */

/** The book after this one in the saga's order, or null (the future branch only when it is on). */
export function nextBook(saga, key, {future = false} = {}) {
  const books = (saga?.books ?? []).filter(b => future || b.branch !== "future");
  const i = books.findIndex(b => b.key === key);
  return i >= 0 ? books[i + 1] ?? null : null;
}

/** Books that ended and wait for the Storyteller's word: next book, or close here. */
export const endsWaiting = (st = {}) => Object.entries(st?.after ?? {}).filter(([, v]) => v === "ask").map(([k]) => k);

/** The question at a book's end, for the approval queue: approve carries on, reject closes the chronicle here. */
export function endAsk(saga, book, {future = false, name = "The chronicle's saga"} = {}) {
  const b = (saga?.books ?? []).find(x => x.key === book);
  if ( !b ) return null;
  const n = nextBook(saga, book, {future});
  if ( !n ) return null;
  const years = n.from === n.to ? `${n.from}` : `${n.from} to ${n.to}`;
  return {key: `saga-end:${book}`, title: `${name}: book ${b.n}, ${b.title}, is done. Carry on, or close the chronicle here?`,
    detail: `Approve to carry on: book ${n.n}, ${n.title} (${years}), comes to this queue when the year fits it. Reject to close ${saga.title} here: its saga, fronts, twists, encounters, cards and world events stop for good, and its people, places and factions carry on as ordinary parts of the world. Either can be taken back with the night's work.`,
    data: {book, next: n.key}};
}
