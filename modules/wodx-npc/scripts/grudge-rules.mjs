/**
 * WoDX NPC (NPC Motives Desk g1 and g2, B5690-B5691): what an NPC's grudge move and its knowing a wanted culprit do.
 * The pure part; memory.mjs and wanted.mjs act on the world. The books give no rules for either; every figure is a
 * house reading (docs/PENDING-REVIEW.md).
 */

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const DAY = 86400;

/** g1 boon: a boon called in falls due within the week. */
export const BOON_DAYS = 7;
export const boonDue = now => num(now) + BOON_DAYS * DAY;

/** g1 seat: the levers an NPC pulls against a character from its seat, gentlest first; the first its rank opens is used. */
export const SEAT_LEVERS = ["records", "rumour", "print", "licence", "permit", "denounce", "inquiry", "expel", "degree", "campaign", "ruin"];
export function pickLever(available = []) {
  const keys = new Set(available.map(l => l?.key ?? l));
  return SEAT_LEVERS.find(k => keys.has(k)) ?? null;
}

/** g1 violence: the harm comes at night, to wherever the character is; it waits a week at most, then lapses. */
export const HARM_WAIT = 7 * DAY;
export const harmNow = ({night = false, found = false} = {}) => !!night && !!found;
export const harmLapsed = (p, now) => !p || num(now) - num(p.at) >= HARM_WAIT;

/**
 * g2: what an NPC who knows a wanted culprit does, by its kind.
 *   keeper   a guard or a watchman: challenges, and the law comes where the law is on
 *   servant  serves the culprit: says nothing
 *   criminal keeps quiet and holds it over the culprit, a secret it can sell
 *   townsfolk slip away to tell
 */
export function knowsAct({servant = false, keeper = false, criminal = false} = {}) {
  if ( servant ) return "silent";
  if ( keeper ) return "challenge";
  if ( criminal ) return "hold";
  return "tell";
}
