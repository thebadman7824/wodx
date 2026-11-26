/**
 * Action priority (the owner's ask of 25 Nov: "you shouldn't be able to trade items with an NPC while feeding from
 * them"). Pure rules, no Foundry.
 *
 * A character doing something that takes them up is "busy with" it: {kind, with, withName, since}. Every action has a
 * rank. While busy, an action starts only when its rank is above the busy kind's rank, or the kind lets it through
 * (stopping, defending, breaking free, frenzy). The one they are busy with is taken up too: no one trades with a
 * vessel while it is being fed from.
 *
 * Feeding: a vampire takes up to three blood points a turn (V20 Dark Ages p. 341), so a feeding lasts its turns; at the
 * table, the feeding window stands for them.
 */

/** What can take a character up, with its rank and what still gets through. */
export const BUSY = {
  feeding: {label: "feeding", prep: "from", rank: 5, allows: ["stop", "defend", "breakfree", "frenzy", "feed"]},
  fed: {label: "being fed from", prep: "by", rank: 5, allows: ["stop", "defend", "breakfree", "frenzy"]},
  held: {label: "held in a clinch", prep: "by", rank: 6, allows: ["stop", "defend", "breakfree", "frenzy", "attack", "power"]},
  trading: {label: "trading", prep: "with", rank: 2, allows: ["stop", "defend", "frenzy", "attack", "power", "trade"]}
};

/** How urgent each kind of action is. An action not listed counts as 1. */
export const RANK = {stop: 9, defend: 9, breakfree: 9, frenzy: 9, attack: 6, power: 6, feed: 3, social: 2, trade: 2, talk: 2, learn: 1, travel: 1, wait: 1};

/** A busy record older than this (ms) is stale: a window left open when a client closed. */
export const STALE_MS = 15 * 60 * 1000;

/** A busy record as stored, or null when there is none, it is unknown, or it is stale. */
export function liveBusy(rec, now = Date.now()) {
  if ( !rec || typeof rec !== "object" || !BUSY[rec.kind] ) return null;
  if ( Number(rec.since) > 0 && now - Number(rec.since) > STALE_MS ) return null;
  return rec;
}

/** Does this action get through while busy with this record? */
export function letsThrough(rec, action) {
  const b = BUSY[rec?.kind];
  if ( !b ) return true;
  return b.allows.includes(action) || (RANK[action] ?? 1) > b.rank;
}

/** What the character is busy with, in words: "feeding from Jana". */
export function busyWords(rec) {
  const b = BUSY[rec?.kind];
  if ( !b ) return "";
  return rec.withName ? `${b.label} ${b.prep} ${rec.withName}` : b.label;
}

/**
 * Why this action can't start now, or "". mine: the actor's own busy record; theirs: the other one's (the NPC traded
 * with, the vessel), as {name, rec}.
 */
export function busyWhy({name = "The character", mine = null, action = "social", theirs = null, now = Date.now()} = {}) {
  const m = liveBusy(mine, now);
  if ( m && !letsThrough(m, action) ) return `${name} is ${busyWords(m)}. Stop that first.`;
  const t = liveBusy(theirs?.rec, now);
  if ( t && !letsThrough(t, action) && !(t.with && t.with === theirs?.me) ) return `${theirs.name ?? "They"} ${theirs.name ? "is" : "are"} ${busyWords(t)} just now.`;
  return "";
}
