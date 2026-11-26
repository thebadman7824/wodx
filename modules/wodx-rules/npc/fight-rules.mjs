/**
 * WoDX NPC 0.15.0 (B808, B809): when an NPC starts a fight by itself. The pure parts, so the harness can test them.
 * WoDX Combat's fight starter (start-rules.js) does the starting; this file says who wants one and why.
 *
 *   On sight   an NPC who regards a character as Hostile or Hunted, and sees them (the same noticing roll as a
 *              Reaction region: a sneaking character rolls Stealth against the watcher, Obfuscate needs Auspex).
 *   On alarm   guards at a place on alarm treat anyone they do not know or distrust as an intruder.
 *   Turning    an NPC whose attitude falls to Hostile (a social roll gone badly, a theft caught) while the character
 *              is in sight.
 * Timid NPCs (Aggression under a half: bystanders) never start one; they flee or call for help instead, as their
 * profile says. House rules, logged in docs/PENDING-REVIEW.md.
 */

export const HOSTILE = -2;
export const TIMID_BELOW = 0.5;
/** Seconds of real time before the same NPC rolls again to notice the same sneaking character. */
export const NOTICE_EVERY = 30;

const isGuard = p => p?.template === "guard" || (p?.tactics ?? []).includes("guard");

/**
 * Does this NPC want a fight with this character on sight? npc: {aggression, template, tactics}; step: the NPC's
 * attitude toward the character; alarm: the place's alert level ("calm", "wary", "alarm").
 * Returns {source: "sight"|"alarm", why} or null.
 */
export function wantsFight(npc = {}, step = 0, {alarm = "calm"} = {}) {
  if ( !(Number(npc.aggression) >= TIMID_BELOW) ) return null;
  const s = Number(step) || 0;
  if ( s <= HOSTILE ) return {source: "sight", why: s <= -3 ? "hunts them" : "is hostile to them"};
  if ( alarm === "alarm" && isGuard(npc) && s <= 0 ) return {source: "alarm", why: "is on guard, and the place is on alarm"};
  return null;
}

/** Did a change turn the NPC hostile? before/after: steps. Only a fall past the line counts. */
export const turnedHostile = (before, after) => Number(after) <= HOSTILE && !(Number(before) <= HOSTILE);

/** The pairs worth checking after a token moved. moved: {id, pc}; others: [{id, pc, down, hidden}]. */
export function pairsFor(moved, others = []) {
  if ( !moved ) return [];
  return others.filter(o => o && o.id !== moved.id && !o.down && !o.hidden && !!o.pc !== !!moved.pc)
    .map(o => (moved.pc ? {npc: o.id, pc: moved.id} : {npc: moved.id, pc: o.id}));
}

/** How far a watcher sees for this: yards by day, a third at night (at least 5). */
export const sightRange = (yards, night = false) => { const y = Math.max(5, Number(yards) || 30); return night ? Math.max(5, Math.round(y / 3)) : y; };
