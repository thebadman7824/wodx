/**
 * WoDX NPC: an NPC of every line refills its own pool, the way its book says, as a Kindred NPC feeds on its hunt (B6319).
 * The pure part; line-refill.mjs reads the sheet, rolls and writes the pool.
 *
 * Two kinds of refill:
 *   enrolled  WoDX Actions already rolls a daily refill for any character marked for it (a shapechanger's meditation
 *             for Gnosis, a mage's daily draw of Quintessence, a mummy's day in the haven for Sekhem). A player marks
 *             their own character in a dialog; an NPC is marked here once, so the same rolls run for it.
 *   own       lines with no daily roll in WoDX Actions, rolled here once a night (book basis, in WoDX's own words):
 *             - a changeling in its freehold takes the freehold's rating in Glamour for a night's sleep there
 *               (Sanctuary, C20 p. 259); one with Dreamers muses one in a Reverie (C20 pdf 170, 262-263, read
 *               B6453): Perception + Kenning at 8, a success a dot of Dreamers, sets the time with the Dreamer (one a
 *               month, two a fortnight, three a week, four a day, five a few hours); then Manipulation + the best of
 *               Empathy, Performance, Leadership and Intimidation at 6 gives a Glamour a success. A failure means
 *               another week of study; a botch blocks the Dreamer (a month, WoDX's reading) and the muse starts again
 *             - a wraith lives its strongest Passion in its nightly round and rolls its rating at 6, a Pathos a
 *               success (Wraith 20th pdf 370); once a week it rolls Memoriam at 8 for being remembered (pdf 180)
 *             - a demon with no thralls to offer it Faith reaps a mortal: Willpower at 7 against the mortal's
 *               Willpower (3, an ordinary person) at 7; a win takes a point of Faith (Demon p. 250)
 * Lines kept as they are: the Kindred and Kuei-jin (their hunt, hunt-npc), the hunters (Conviction comes back with
 * each new story in WoDX Actions), mortals and ghouls (no pool of their own that refills by itself).
 */

import * as TERMS from "../../wodx-chronicle/scripts/terms.mjs";
import {HOUR, DAY} from "../../wodx-chronicle/scripts/terms.mjs";

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Lines WoDX Actions already refills daily once marked: the flag to set, and its value. */
export const ENROLL = {
  werewolf: {what: "meditation for Gnosis", ref: "W20 p. 146"},
  fera: {what: "meditation for Gnosis", ref: "W20 p. 146"},
  mage: {what: "the day's draw of Quintessence", ref: "M20 p. 332"},
  sorcerer: {what: "the day's draw of Quintessence", ref: "M20 p. 332"},
  mummy: {what: "a day of meditation in the haven for Sekhem", ref: "Mummy: the Resurrection p. 144"}
};

/** Lines refilled here, once a night. */
export const OWN = new Set(["changeling", "wraith", "demon"]);

/** The night a time falls in: a night begins at 18:00, so a day key turns at dusk. */
export const nightOf = t => Math.floor((num(t) - 18 * HOUR) / DAY);
export const weekOf = night => Math.floor(num(night) / 7);

/**
 * The Actions flag patch that marks an NPC for its line's daily refill, or null when nothing applies or the sheet is
 * already marked. cur: {meditates, m20, mummy} as they stand on the sheet's wodx-actions flags. node: the Node
 * Background, for a mage.
 */
export function enrollPatch(line, cur = {}, {node = 0} = {}) {
  if ( line === "werewolf" || line === "fera" ) return cur.meditates ? null : {key: "meditates", value: {hours: 2}};
  if ( line === "mage" || line === "sorcerer" ) return cur.m20?.draws ? null : {key: "m20", value: {...(cur.m20 ?? {}), draws: {node: Math.max(0, Math.min(5, num(node)))}}};
  if ( line === "mummy" ) return cur.mummy?.dailyRegain ? null : {key: "mummy", value: {...(cur.mummy ?? {}), dailyRegain: {k: "haven", sh: 6}}};
  return null;
}

/** Room left in a pool: {temp, cap}. */
const room = p => Math.max(0, num(p?.cap) - num(p?.temp));

/**
 * The refills one NPC is owed tonight, as steps to roll. Pure: no dice here.
 * s: the sheet read: {glamour, pathos, faith: {temp, cap}, holdings, dreamers, perception, kenning, manipulation,
 *    inspire (the best of Empathy, Performance, Leadership, Intimidation), passion,
 *    memoriam, willpower, thralls}
 * f: what was done before: {night, reverieWeek, reverieDue, memoriamWeek}
 * Returns [{pool, word, ref, fixed?, dice?, diff?, auto?, reverie?, contest?: {dice, diff, vs, vsDiff}, mark?}].
 */
export function refillSteps(line, s = {}, f = {}, night = 0) {
  if ( !OWN.has(line) || num(f.night) === num(night) && f.night !== undefined ) return [];
  const out = [], week = weekOf(night);
  if ( line === "changeling" && room(s.glamour) > 0 ) {
    if ( num(s.holdings) > 0 ) out.push({pool: "glamour", word: "Sanctuary", ref: "C20 p. 259", fixed: Math.max(1, num(s.holdings))});
    else if ( num(s.dreamers) > 0 ) {
      const due = f.reverieDue === undefined || f.reverieDue === null ? null : num(f.reverieDue);
      if ( due !== null && num(night) >= due ) {
        out.push({pool: "glamour", word: "Reverie", ref: "C20 pdf 263", dice: num(s.manipulation) + num(s.inspire), diff: 6, reverie: "inspire", mark: {reverieDue: null}});
      } else if ( due === null && num(f.reverieWeek) !== week ) {
        out.push({pool: "glamour", word: "Reverie (studying a Dreamer)", ref: "C20 pdf 170, 262", dice: num(s.perception) + num(s.kenning), diff: 8, auto: num(s.dreamers), reverie: "study", mark: {reverieWeek: week}});
      }
    }
  }
  if ( line === "wraith" && room(s.pathos) > 0 ) {
    if ( num(s.passion) > 0 ) out.push({pool: "pathos", word: "Passion", ref: "Wraith 20th pdf 370", dice: num(s.passion), diff: 6});
    if ( num(s.memoriam) > 0 && num(f.memoriamWeek) !== week ) out.push({pool: "pathos", word: "Memoriam", ref: "Wraith 20th pdf 180", dice: num(s.memoriam), diff: 8, mark: {memoriamWeek: week}});
  }
  if ( line === "demon" && room(s.faith) > 0 && !num(s.thralls) && num(s.willpower) > 0 ) {
    out.push({pool: "faith", word: "Reaping", ref: "Demon p. 250", contest: {dice: num(s.willpower), diff: 7, vs: 3, vsDiff: 7}});
  }
  return out;
}

/** C20 pdf 262: nights with the Dreamer for the study roll's successes (0: none found this week). */
export const REVERIE_NIGHTS = [0, 30, 14, 7, 1, 0];
export function reverieNights(succ) { const n = Math.max(0, Math.floor(num(succ))); return n <= 0 ? null : REVERIE_NIGHTS[Math.min(5, n)]; }
/**
 * What a Reverie roll leaves on the sheet's mark, by the book: a study sets the night the musing ends; a failed
 * musing means another week; a botch blocks the Dreamer for a month and the study starts over.
 */
export function reverieMark(step, {succ = 0, botch = false} = {}, night = 0) {
  if ( step.reverie === "study" ) { const n = reverieNights(succ); return n === null ? {} : {reverieDue: num(night) + n}; }
  if ( step.reverie === "inspire" ) {
    if ( botch ) return {reverieDue: null, reverieWeek: weekOf(num(night) + 30)};
    if ( num(succ) <= 0 ) return {reverieDue: num(night) + 7};
    return {reverieDue: null};
  }
  return {};
}
/** A roll botches when it has no successes and at least one 1. */
export const botched = (faces = [], diff = 6) => TERMS.successes(faces, diff).botch;

/** Successes of a set of d10 faces at a difficulty: 10s count, 1s cancel (never below 0 here; a botch gives nothing). */
export function successes(faces = [], diff = 6) {
  return TERMS.successes(faces, diff).successes;
}

/**
 * What a step gives, from its dice: fixed steps give their amount; a contest gives a point when the NPC wins;
 * others a point per success. Never past the pool's room.
 */
export function stepGain(step, {mine = 0, theirs = 0} = {}, pool = {}) {
  if ( step.reverie === "study" ) return 0;
  const raw = step.fixed !== undefined ? num(step.fixed) : step.contest ? (num(mine) > num(theirs) ? 1 : 0) : num(mine);
  return Math.max(0, Math.min(room(pool), raw));
}

/** The word over the token and in the card: "+2 Glamour (Sanctuary)". */
export const POOL_WORD = {glamour: "Glamour", pathos: "Pathos", faith: "Faith"};
export const gainWord = (pool, n, why) => `+${n} ${POOL_WORD[pool] ?? pool}${why ? ` (${why})` : ""}`;
export const POOL_COLOUR = {glamour: "#e7a8ff", pathos: "#9fb7d6", faith: "#f2e6a0"};
