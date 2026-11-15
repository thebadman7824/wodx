/**
 * WoDX NPC (NPC Motives Desk r2, B5688): footpads, burglars, bandits and highwaymen out on the prowl pick a mark and
 * demand money, and the player answers: pay, talk or fight. The pure part; prowl.mjs reads the map and posts the card.
 * The books give no rules for this; every figure is a house reading (docs/PENDING-REVIEW.md).
 */

/** The kinds that prowl, and when: footpads and burglars by night, bandits by day, highwaymen at either. */
export const PROWLERS = {
  footpad: {when: "night", line: "Your purse. Now, and quietly."},
  burglar: {when: "night", line: "Not a sound. Turn out your pockets."},
  bandit: {when: "day", line: "Stand. The road has a toll, and we keep it."},
  highwayman: {when: "any", line: "Stand and deliver."}
};
/** How near a lone character must be before a prowler notices them, and how close it closes before it speaks (yards). */
export const NOTICE_YARDS = 30;
export const ALONE_YARDS = 10;
/** A prowler tries the same mark at most once in this long. */
export const AGAIN_SECONDS = 12 * 3600;

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Is this NPC prowling now? key: its mortal archetype; activity: its routine's; night: is it dark. */
export function prowling(key, activity, night) {
  const p = PROWLERS[key];
  if ( !p || activity !== "hunt" ) return false;
  return p.when === "any" || (p.when === "night") === !!night;
}

/**
 * The mark, if any: a player's character alone (no one within ten yards), within notice, not tried lately, and not
 * plainly too much for the prowler (more than two on the mark's side near, or an armed guard near).
 * cands: [{id, player, yards, side (the mark's side within ten yards, the mark included), guards, tried (time)}]
 */
export function pickMark(cands = [], now = 0) {
  const ok = cands.filter(c => c.player && num(c.yards) <= NOTICE_YARDS && num(c.side) <= 1 && !num(c.guards)
    && (c.tried === null || c.tried === undefined || num(now) - num(c.tried) >= AGAIN_SECONDS));
  ok.sort((a, b) => num(a.yards) - num(b.yards));
  return ok[0]?.id ?? null;
}
/** Is this mark plainly too much for one prowler? (The rule above, for a gate or a card.) */
export const outmatched = ({side = 1, guards = 0} = {}) => num(side) > 2 || num(guards) > 0;

/** What paying costs: half of what the character carries, at least one (in the purse's smallest unit). */
export const demandOf = carried => (num(carried) > 0 ? Math.max(1, Math.floor(num(carried) / 2)) : 0);

/**
 * Talking a prowler down: the better of Manipulation + Intimidation and Charisma + Persuasion, against 6, one harder for
 * a bold one (aggression 1 or more). Returns {pool, difficulty, ability}.
 */
export function talkRoll(sheet = {}, prowler = {}) {
  const intim = num(sheet.manipulation) + num(sheet.intimidation), pers = num(sheet.charisma) + num(sheet.persuasion);
  return {pool: Math.max(1, intim, pers), ability: intim >= pers ? "Manipulation + Intimidation" : "Charisma + Persuasion",
    difficulty: 6 + (num(prowler.aggression) >= 1 ? 1 : 0)};
}

/** What follows each answer. pay: takes the money and goes; talk: goes if talked down, else fights; fight: fights. */
export function after(answer, {talked = false, paid = true} = {}) {
  if ( answer === "pay" ) return paid ? {go: true, fight: false, memory: "warm", text: "takes the money and melts away"} : {go: false, fight: true, memory: "harm", text: "finds the purse empty and turns ugly"};
  if ( answer === "talk" ) return talked ? {go: true, fight: false, memory: "cold", text: "thinks better of it and backs off"} : {go: false, fight: true, memory: "harm", text: "is not talked out of it"};
  return {go: false, fight: true, memory: "harm", text: "meets a fight"};
}
