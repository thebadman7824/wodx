/**
 * WoDX Library: gambling with dice, cards and board games (B3910). No Foundry calls here; gamble-use.mjs does the rest.
 *
 * Wits + Streetwise at difficulty 6 (house reading: knowing the game and the people at the table; a Gambling
 * ability counts in its place when the sheet has one). Against another character, both roll and the higher
 * successes take the stake from the other; a tie is no money moved. Against the house (nobody targeted): two or more
 * successes win the stake, one breaks even, none loses it, a botch loses twice the stake. The stake is a share of
 * what the gambler carries. Money moves through WoDX Storyteller's purse. All house rules.
 */
export const DIFF = 6;
export const STAKES = {small: {label: "A little", share: 0.05}, fair: {label: "A fair sum", share: 0.2}, big: {label: "A lot", share: 0.5}};

/** The stake for a share of what they carry: at least 1 of the smallest coin, never more than they carry. */
export function stakeOf(carried, key = "small") {
  const c = Math.max(0, Math.floor(Number(carried) || 0));
  if ( !c ) return 0;
  return Math.min(c, Math.max(1, Math.round(c * (STAKES[key]?.share ?? STAKES.small.share))));
}

/** The pool: Wits plus the better of Gambling and Streetwise. */
export const poolOf = (wits, streetwise = 0, gambling = 0) => Math.max(1, (Number(wits) || 0) + Math.max(Number(streetwise) || 0, Number(gambling) || 0));

/**
 * What the game comes to for the gambler: {delta, line}. delta: the money the gambler wins (+) or loses (-).
 * mine, theirs: {successes, botch}; theirs null for the house.
 */
export function gambleResult(mine = {}, theirs = null, stake = 0) {
  const s = Math.max(0, Math.round(Number(stake) || 0));
  const m = Number(mine.successes) || 0;
  if ( theirs ) {
    const t = Number(theirs.successes) || 0;
    if ( m > t ) return {delta: s, line: "They win the hand and take the stake."};
    if ( t > m ) return {delta: -s, line: "They lose the hand and pay the stake."};
    return {delta: 0, line: "Even: the stakes go back."};
  }
  if ( mine.botch ) return {delta: -2 * s, line: "A disaster: they lose twice the stake, chasing it."};
  if ( m >= 2 ) return {delta: s, line: "The house pays: they win the stake."};
  if ( m === 1 ) return {delta: 0, line: "They break even."};
  return {delta: -s, line: "The house wins: they lose the stake."};
}
