/**
 * WoDX Chronicle 0.25.0: the pure rules of signature features (Splat Features Desk). No Foundry calls, so the harness
 * can test them. The table is data/signatures.mjs; the Foundry side is signatures.mjs.
 *
 * Records (all plain objects kept in flags):
 *   muse {id, name, kind (person|work|place), uuid, obsession 0..5, since, seen (world time), owned}
 *   corruption {by (actor id), byName, vice, step 0..5, log: [{at, delta, why}]}
 *   cause {key, label, custom, approved, rant 0..3}
 *   mark {key, at, until}
 */
import {VAMPIRE, CAUSES, VICES, CORRUPTION_STEPS, MARKS, WEEK, MARK_LASTS, RANT_POINTS, OBSESSION_MAX, CORRUPTION_MAX} from "../data/signatures.mjs";

export {VAMPIRE, CAUSES, VICES, CORRUPTION_STEPS, MARKS, WEEK, MARK_LASTS, RANT_POINTS, OBSESSION_MAX, CORRUPTION_MAX};

const n = v => Number.isFinite(Number(v)) ? Number(v) : 0;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const words = s => String(s ?? "").toLowerCase().replace(/^wod\.bio\.vampire\./, "").replace(/[_-]+/g, " ").replace(/[^a-z ]/g, " ").split(/\s+/).filter(Boolean);

/** The signature row for a clan or bloodline name, or null. Whole words only, so "Settler" is not a Setite. */
export function vampireRow(...names) {
  for ( const name of names.flat() ) {
    const w = words(name), text = ` ${w.join(" ")} `;
    if ( !w.length ) continue;
    for ( const row of VAMPIRE ) if ( row.match.some(m => text.includes(` ${m} `)) ) return row;
  }
  return null;
}

/* ---------------- Toreador: Muse and Obsession ---------------- */

export const MUSE_KINDS = {person: "a person", work: "a work of art", place: "a place"};

/** A new Muse record. */
export function newMuse({id, name, kind = "person", uuid = null, now = 0} = {}) {
  return {id: id || `muse-${Math.floor(n(now))}`, name: String(name ?? "a Muse"), kind: MUSE_KINDS[kind] ? kind : "person", uuid, obsession: 0, since: n(now), seen: n(now), owned: false};
}

/**
 * Bring a Muse up to date: one point of Obsession for each full week since it was last seen (V20 weakness stretched over
 * time, house rule). Returns {muse, rose}.
 */
export function museTick(muse, now) {
  if ( !muse ) return {muse, rose: 0};
  const weeks = Math.floor((n(now) - n(muse.seen)) / WEEK);
  const counted = Math.floor((n(muse.counted ?? muse.seen) - n(muse.seen)) / WEEK);
  const rose = Math.max(0, Math.min(OBSESSION_MAX - n(muse.obsession), weeks - counted));
  if ( weeks <= counted ) return {muse, rose: 0};
  return {muse: {...muse, obsession: clamp(n(muse.obsession) + rose, 0, OBSESSION_MAX), counted: n(muse.seen) + weeks * WEEK}, rose};
}

/** Seeing the Muse (how: "see" -1, "own" or "made" -2). */
export function museSeen(muse, now, how = "see") {
  const drop = how === "own" || how === "made" ? 2 : 1;
  return {...muse, obsession: clamp(n(muse.obsession) - drop, 0, OBSESSION_MAX), seen: n(now), counted: n(now), owned: muse.owned || how === "own"};
}

/** Harm to a Muse who is a person: +2 at once and a frenzy check. */
export function museHarmed(muse) {
  return {muse: {...muse, obsession: clamp(n(muse.obsession) + 2, 0, OBSESSION_MAX)}, frenzy: muse.kind === "person"};
}

/** The extra difficulty on the Toreador's Self-Control roll against beauty: the highest Obsession among their Muses. */
export function beautyPenalty(muses = []) {
  return muses.reduce((m, x) => Math.max(m, n(x?.obsession)), 0);
}

/* ---------------- Followers of Set: the Corruption ledger ---------------- */

/** Social acts that work on a victim, and how far a win moves the track. */
export const CORRUPTING_ACTS = {charm: 1, persuade: 1, con: 1, fasttalk: 1, bribe: 1};

export const viceByKey = key => VICES.find(v => v.key === key) ?? null;

/** Does a good (its name, category or substance) feed this vice? */
export function feedsVice(vice, good = {}) {
  const v = viceByKey(vice);
  if ( !v ) return false;
  const hay = [good.category, good.substance, good.kind, good.name].flat().filter(Boolean).map(x => String(x).toLowerCase()).join(" ");
  return v.feeds.some(f => hay.includes(f));
}

export function newCorruption({by, byName = "", vice = "", now = 0} = {}) {
  return {by: String(by ?? ""), byName: String(byName ?? ""), vice: viceByKey(vice) ? vice : "", step: 0, since: n(now), log: []};
}

/** Move a track by delta, with a reason. Keeps the last 20 log lines. */
export function corrupt(rec, delta, why = "", now = 0) {
  const before = n(rec?.step);
  const step = clamp(before + n(delta), 0, CORRUPTION_MAX);
  const log = [...(rec?.log ?? []), {at: n(now), delta: step - before, why: String(why)}].slice(-20);
  return {rec: {...rec, step, log}, before, after: step, crossed: crossed(before, step)};
}

/** The thresholds a move crossed upward (3 and 5 matter in play). */
export function crossed(before, after) {
  return [3, 5].filter(t => before < t && after >= t);
}

/** The step a social act moves the track: wins push it, a botch pushes it back, a tie or loss does nothing. */
export function stepFromSocial(act, result) {
  const base = CORRUPTING_ACTS[act];
  if ( !base ) return 0;
  if ( result === "win" ) return base;
  if ( result === "botch" ) return -1;
  return 0;
}

/** The step a trade moves the track: a gift (mode give, or nothing asked back) of a good that feeds the vice. */
export function stepFromTrade(rec, {mode, give, want} = {}) {
  if ( !rec?.vice || !give ) return 0;
  const gift = mode === "give" || mode === "gift" || !want;
  return gift && feedsVice(rec.vice, typeof give === "string" ? {name: give} : give) ? 1 : 0;
}

/** Extra difficulty on the victim's own Self-Control or Willpower rolls against the vice. */
export const resistPenalty = rec => n(rec?.step);
export const stepText = s => CORRUPTION_STEPS[clamp(n(s), 0, CORRUPTION_MAX)];

/* ---------------- Brujah: the Cause ---------------- */

/** The causes open in a year (a cause with from: later than the year is not yet thought of). */
export const causesAt = year => CAUSES.filter(c => !c.from || n(year) >= c.from);

export function newCause({key = "", custom = "", year = 1197} = {}) {
  const c = causesAt(year).find(x => x.key === key);
  if ( c ) return {key: c.key, label: c.label, custom: false, approved: true, rant: 0};
  const text = String(custom ?? "").trim();
  return text ? {key: "custom", label: text, custom: true, approved: false, rant: 0} : null;
}

/** A temper roll kept against the Cause: one Rant point; at RANT_POINTS the Rant is ready. */
export function causeKept(cause) {
  const rant = clamp(n(cause?.rant) + 1, 0, RANT_POINTS);
  return {cause: {...cause, rant}, ready: rant >= RANT_POINTS};
}
export const rantSpent = cause => ({...cause, rant: 0});

/** The Brujah temper roll: the frenzy difficulty with the clan's +2 (V20 pdf 59). */
export const temperDifficulty = (base = 6) => clamp(n(base) + 2, 3, 10);

/* ---------------- Gangrel: Marks of the Beast ---------------- */

export const markByKey = key => MARKS.find(m => m.key === key) ?? null;

/** A random mark not already held (rand: () => 0..1). */
export function pickMark(held = [], rand = Math.random) {
  const have = new Set(held.map(m => m.key));
  const open = MARKS.filter(m => !have.has(m.key));
  const pool = open.length ? open : MARKS;
  return pool[Math.floor(rand() * pool.length) % pool.length];
}

export function newMark(key, now) {
  return markByKey(key) ? {key, at: n(now), until: n(now) + MARK_LASTS} : null;
}

/** Marks still showing at a time; the others have healed (house rule, Ben 2026-11-12). */
export const activeMarks = (list = [], now = 0) => list.filter(m => markByKey(m.key) && n(m.until) > n(now));

/** The roll effects the showing marks give, in the trait effect shape {tags, dice, why}. */
export function markEffects(list = [], now = 0) {
  return activeMarks(list, now).flatMap(m => markByKey(m.key).effects.map(e => ({...e, why: markByKey(m.key).label})));
}

/** Healing a mark early: as an aggravated wound, five blood points (house reading of V20 healing) or a month. */
export const HEAL_EARLY_BLOOD = 5;

/** Do any showing marks break the Masquerade to a mortal eye? */
export const marksShow = (list = [], now = 0) => activeMarks(list, now).some(m => markByKey(m.key).sign || markByKey(m.key).key === "claws");
