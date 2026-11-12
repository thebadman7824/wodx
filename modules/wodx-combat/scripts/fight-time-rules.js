/**
 * WoDX Combat 3.16.0: how long a fight took, the rules (no Foundry).
 *
 * Foundry moves no time for a round unless a system sets it, so a fight left the clock where it was. When a fight
 * ends, the clock now moves by rounds times the seconds a turn takes (house figure 3, a setting; 0 keeps fights
 * timeless), in one step so the timed parts wake once (B1606).
 */
export const DEFAULT_TURN = 3;

/** Seconds a fight of so many rounds took. */
export function fightSeconds(rounds, perTurn = DEFAULT_TURN) {
  const r = Math.max(0, Math.floor(Number(rounds) || 0));
  const s = Math.max(0, Math.min(60, Number(perTurn)));
  return Number.isFinite(s) ? Math.round(r * s) : 0;
}

export function fightWords(rounds, seconds) {
  const r = Math.max(0, Math.floor(Number(rounds) || 0));
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const t = s < 60 ? `${s} second${s === 1 ? "" : "s"}` : `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60} s` : ""}`;
  return `${r} turn${r === 1 ? "" : "s"}, about ${t}`;
}
