/**
 * WoDX Chronicle 0.37.0: the clock that runs with the table, the rules (no Foundry).
 *
 * Off by default (B1707). With it on, while the game runs the clock moves a set number of game minutes every so many
 * real minutes, the same for every scene. It waits while the game is paused, during a fight, while the world is held or
 * a time skip runs, and when no player is connected.
 */

/** Settings kept in range: {minutes: 0 (off) to 240, every: 1 to 120 real minutes}. */
export function cleanPace(minutes, every) {
  const m = Math.round(Number(minutes));
  const e = Math.round(Number(every));
  return {minutes: Number.isFinite(m) ? Math.max(0, Math.min(240, m)) : 0, every: Number.isFinite(e) ? Math.max(1, Math.min(120, e)) : 10};
}

/** Should the clock step now? s: {minutes, every, paused, fight, held, players, last, now (ms)}. */
export function shouldStep(s = {}) {
  const p = cleanPace(s.minutes, s.every);
  if ( !p.minutes || s.paused || s.fight || s.held || !(Number(s.players) > 0) ) return false;
  return Number(s.now) - Number(s.last) >= p.every * 60000;
}

export function paceWords(minutes, every) {
  const p = cleanPace(minutes, every);
  if ( !p.minutes ) return "";
  return `The clock runs with the table: ${p.minutes} game minute${p.minutes === 1 ? "" : "s"} every ${p.every} real minute${p.every === 1 ? "" : "s"}.`;
}
