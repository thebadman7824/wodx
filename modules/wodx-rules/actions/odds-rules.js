/**
 * WoDX Actions 3.43.0: the odds of a roll before it is made. Pure rules, no Foundry.
 *
 * The dice are the Storyteller System's (V20 core printed pp. 249-250; V20 Dark Ages pp. 322-324): each die at or above
 * the difficulty is a success, each 1 takes one away, a roll with no success and at least one 1 is a botch. A
 * specialty counts a 10 twice. Willpower adds one automatic success and keeps the roll from botching. countSuccesses()
 * in WoDX Combat's rules is the one that rolls; this file works out the same rules as chances, die by die, so the
 * two always agree (the harness checks it against every face).
 */

const clamp = d => Math.max(2, Math.min(10, Math.round(Number(d) || 6)));

/**
 * The chances for a pool. opts: {specialty, willpower, autoSuccesses, canBotch}.
 * Returns {dice, difficulty, atLeast(n), any, three, botch, fail, mean, dist} where dist[k] is the chance of exactly
 * k successes (k = 0 includes a botch) and botch is the chance of a botch.
 */
export function odds(dice, difficulty, opts = {}) {
  const { specialty = false, willpower = false, autoSuccesses = 0, canBotch = true } = opts;
  const n = Math.max(0, Math.min(60, Math.trunc(Number(dice) || 0)));
  const d = clamp(difficulty);
  // One die: a 1 (one in ten), a plain success, a 10 that a specialty counts twice, or nothing
  const pOne = 0.1;
  const pTen = specialty && d <= 10 ? 0.1 : 0;
  const pHit = (11 - d) / 10 - pTen;
  const pNone = 1 - pOne - pHit - pTen;
  // state "raw|ones" → chance
  let st = new Map([["0|0", 1]]);
  for (let i = 0; i < n; i++) {
    const next = new Map();
    const add = (k, p) => { if (p > 0) next.set(k, (next.get(k) ?? 0) + p); };
    for (const [k, p] of st) {
      const [raw, ones] = k.split("|").map(Number);
      add(`${raw}|${ones + 1}`, p * pOne);
      add(`${raw + 1}|${ones}`, p * pHit);
      add(`${raw + 2}|${ones}`, p * pTen);
      add(`${raw}|${ones}`, p * pNone);
    }
    st = next;
  }
  const auto = Math.max(0, Math.trunc(Number(autoSuccesses) || 0)) + (willpower ? 1 : 0);
  const dist = [];
  let botch = 0;
  for (const [k, p] of st) {
    const [raw, ones] = k.split("|").map(Number);
    const isBotch = canBotch && raw === 0 && ones > 0 && !willpower && !autoSuccesses;
    if (isBotch) botch += p;
    const s = Math.max(0, raw - ones) + auto;
    dist[s] = (dist[s] ?? 0) + p;
  }
  for (let i = 0; i < dist.length; i++) dist[i] ??= 0;
  const atLeast = m => dist.reduce((a, p, k) => a + (k >= m ? p : 0), 0);
  const mean = dist.reduce((a, p, k) => a + p * k, 0);
  return { dice: n, difficulty: d, dist, botch, any: atLeast(1), three: atLeast(3), fail: 1 - atLeast(1) - botch, mean, atLeast };
}

/** A chance as a whole percent, with "under 1%" and "over 99%" where rounding would mislead. */
export function pct(p) {
  const x = Number(p) || 0;
  if (x <= 0) return "0%";
  if (x >= 1) return "100%";
  if (x < 0.005) return "under 1%";
  if (x > 0.995) return "over 99%";
  return `${Math.round(x * 100)}%`;
}

/** A word for how good the odds are, so a player new to d10 pools can read them at a glance. */
export function verdict(p) {
  const x = Number(p) || 0;
  if (x >= 0.9) return "near certain";
  if (x >= 0.7) return "good";
  if (x >= 0.5) return "even or better";
  if (x >= 0.3) return "poor";
  if (x > 0) return "long odds";
  return "no chance";
}

/**
 * The line the roll window shows. o: from odds(); need: successes an extended or resisted roll asks for (shown as its
 * own chance when more than 1 and not 3). Plain text, the window escapes nothing in it.
 */
export function oddsLine(o, { need = 0 } = {}) {
  if (!o) return "";
  if (!o.dice && !o.atLeast(1)) return `No dice: the roll cannot succeed.`;
  const bits = [`at least one success ${pct(o.any)} (${verdict(o.any)})`, `three or more ${pct(o.three)}`];
  const k = Math.trunc(Number(need) || 0);
  if (k > 1 && k !== 3) bits.push(`${k} or more ${pct(o.atLeast(k))}`);
  bits.push(`botch ${pct(o.botch)}`);
  return `${o.dice} ${o.dice === 1 ? "die" : "dice"} at ${o.difficulty}: ${bits.join(", ")}.`;
}
