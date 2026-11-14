/**
 * The signal board (B3651), the pure part. No Foundry here, so the harness can test it.
 *
 * When something notable happens, a system posts a short note to one shared list: what kind of thing it is, who it
 * is about (an actor id or ""), where (a world region id or ""), how serious (weight 1 to 3), and a few words. This is
 * the shape the omens system already reads (omen-rules.mjs), so dreams can foreshadow anything on the board, and
 * Threads of Fate (threads-rules.mjs) picks its story hooks from it. Neither has to look inside another system.
 *
 * A post with the same key as one already on the board updates it (the heavier weight wins) instead of adding a copy.
 * A signal stays live for a while by its weight, then drops off. A storyline that grows from a signal marks it used,
 * so the same signal does not open two storylines. Every figure here is a house reading.
 */

export const DAY = 86400;
/** How long a signal stays live, by weight. */
export const TTL = {1: 14 * DAY, 2: 28 * DAY, 3: 56 * DAY};
/** The most signals the board keeps; the oldest light ones go first. */
export const MAX = 200;
/**
 * The kinds of signal. The first eight are the omens kinds (omen-rules.mjs KINDS); a kind omens has no symbols for
 * falls back to "change" there. "saga" is a step of a Rothenstein saga book (WoDX Chronicle, wodxSaga).
 */
export const KINDS = ["grudge", "hunters", "plague", "war", "fire", "flood", "death", "change",
  "fight", "rumour", "tale", "fate", "cult", "wyrm", "caern", "node", "freehold", "town", "seat", "arrest", "trial",
  "law", "project", "event", "breach", "debt", "lifepath", "hook", "arrival", "chain", "saga"];
/** Kinds that come from a player character's own story: they are woven first (B3652, desk item 13). */
export const OWN = ["hook", "lifepath"];
/** Kinds that bring the past back: used as a storyline's echo (B3652). */
export const ECHO = ["grudge", "tale", "debt", "lifepath", "hook", "fate"];

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const str = (v, n = 200) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const clampW = w => Math.max(1, Math.min(3, Math.round(num(w) || 1)));

/** A signal in its clean shape, or null when it has no kind or key. */
export function normSignal(s = {}) {
  const kind = KINDS.includes(String(s.kind)) ? String(s.kind) : null;
  const key = str(s.key, 120);
  if ( !kind || !key ) return null;
  return {key, kind, about: str(s.about, 40), region: str(s.region, 40), weight: clampW(s.weight), what: str(s.what),
    who: str(s.who, 80), where: str(s.where, 80), from: str(s.from, 40), at: num(s.at), used: str(s.used, 80)};
}

/** Is a signal still live at this time? */
export const live = (s, now) => !!s && num(now) - num(s.at) <= (TTL[clampW(s.weight)] ?? TTL[1]);

/** The board in its clean shape: an array of signals. */
export const normBoard = (b = []) => (Array.isArray(b) ? b : []).map(normSignal).filter(Boolean);

/**
 * Post a signal. Returns {board, signal, added}. The same key updates the one already there: the heavier weight and
 * the newer words win, the time moves to now, and a mark of use stays.
 */
export function post(board = [], sig = {}, now = 0) {
  const b = normBoard(board);
  const s = normSignal({...sig, at: num(sig.at) || num(now)});
  if ( !s ) return {board: b, signal: null, added: false};
  const i = b.findIndex(x => x.key === s.key);
  if ( i >= 0 ) {
    const old = b[i];
    const merged = {...old, ...Object.fromEntries(Object.entries(s).filter(([k, v]) => v !== "" && k !== "used")),
      weight: Math.max(old.weight, s.weight), at: Math.max(old.at, s.at)};
    b[i] = merged;
    return {board: prune(b, now), signal: merged, added: false};
  }
  b.push(s);
  return {board: prune(b, now), signal: s, added: true};
}

/** Drop signals past their time, then the oldest light ones over MAX. */
export function prune(board = [], now = 0) {
  const b = normBoard(board).filter(s => live(s, now));
  if ( b.length <= MAX ) return b;
  const order = [...b].sort((x, y) => (x.weight - y.weight) || (x.at - y.at));
  const drop = new Set(order.slice(0, b.length - MAX).map(s => s.key));
  return b.filter(s => !drop.has(s.key));
}

/** The live signals not yet used by a storyline, heaviest and then newest first. Player-owned kinds go first. */
export function fresh(board = [], now = 0) {
  return normBoard(board).filter(s => live(s, now) && !s.used)
    .sort((a, b) => (OWN.includes(b.kind) - OWN.includes(a.kind)) || (b.weight - a.weight) || (b.at - a.at));
}

/** Mark signals as used by a storyline. */
export function markUsed(board = [], keys = [], story = "") {
  const k = new Set(keys);
  return normBoard(board).map(s => (k.has(s.key) ? {...s, used: str(story, 80) || "used"} : s));
}

/** Free the signals a closed or refused storyline held, so they can feed another. */
export function release(board = [], story = "") {
  return normBoard(board).map(s => (s.used === story ? {...s, used: ""} : s));
}

/** Is any fresh signal strong enough (weight 3) to run the weave at once instead of waiting a week (B3650)? */
export const urgent = (board = [], now = 0) => fresh(board, now).some(s => s.weight >= 3);

/**
 * The omens kind for each board kind that omens has no symbols of its own for. A fight dreams as war, an arrest as
 * hunters, an heir as a death; the rest dream as change.
 */
export const OMEN_KIND = {fight: "war", seat: "war", arrest: "hunters", trial: "hunters", law: "hunters", breach: "hunters",
  fate: "death", saga: "change", debt: "grudge", tale: "grudge", lifepath: "grudge", hook: "grudge"};
const OMEN_KINDS = KINDS.slice(0, 8);
export const omenKind = k => (OMEN_KINDS.includes(k) ? k : (OMEN_KIND[k] ?? "change"));

/**
 * The board as the omens system reads it: {key, kind, about, region, weight, who, where, what}, with the kind put in
 * omens terms. Only weight 2 and up: a passing scuffle is not worth a dream.
 */
export const forOmens = (board = [], now = 0) => normBoard(board).filter(s => live(s, now) && s.weight >= 2)
  .map(({key, kind, about, region, weight, who, where, what}) => ({key, kind: omenKind(kind), about, region, weight, who, where, what}));
