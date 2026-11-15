/**
 * B4879: what a merit or flaw that came into play does (the Storyteller's Hand, pick t1). Before, the approval queue
 * only posted a card. Each trait here rolls for itself and lands an effect: a scene's or a night's difficulty or dice
 * on the rolls it touches, a Willpower point, a derangement bout, a point of Banality, a frenzy. House readings of
 * the books' wording; traits with no rule to roll (Cursed, Dark Fate and a few more) keep the card.
 *
 *   roll: [pool, difficulty]  pool: willpower, wits, intelligence, conscience, selfcontrol, rage, banality (the
 *                             permanent Banality as the difficulty, Willpower the dice)
 *   fail: what a failed roll (or, with no roll, the moment) does:
 *         {diff, dice, tags, lasts: "scene" | "night", name}   a timed effect read by the rolls
 *         {wp: -1}       a temporary Willpower point
 *         {spendWp}      a Willpower point if there is one, otherwise the timed effect in "else"
 *         {bout}         a derangement bout (the character's own, or hysteria)
 *         {banality: 1}  a point of temporary Banality
 *         {frenzy}       four or more successes on the roll set off a frenzy (Hatred)
 *         {hint}         a word of warning whispered to the player (Common Sense)
 *         {infect}       (B5175) the chance the vessel just fed on falls sick: it carries the disease, and is weak for a week
 *         {consume}      (B5175) the vessel is eaten as well as drunk: a mortal vessel dies
 *         {berserk}      (B5175) the player gets a button to go berserk: a frenzy, which ignores wound penalties
 */
export const BITES = {
  "eat-food": {fail: {diff: 1, tags: ["strength", "dexterity", "stamina"], lasts: "night", name: "Food sits heavy"}},
  "common-sense": {fail: {hint: true}},
  "impatient": {roll: ["willpower", 7], fail: {diff: 1, tags: ["social"], lasts: "scene", name: "Out of patience"}},
  "victim-of-the-masquerade": {roll: ["conscience", 7], fail: {wp: -1}},
  "guilt-wracked": {roll: ["conscience", 7], fail: {diff: 1, tags: ["all"], lasts: "scene", name: "Guilt"}},
  "flashbacks": {roll: ["willpower", 7], fail: {bout: "hysteria"}},
  "failure": {roll: ["willpower", 6], fail: {diff: 1, tags: ["all"], lasts: "scene", name: "The curse of failure"}},
  "compulsion": {fail: {spendWp: true, else: {diff: 1, tags: ["all"], lasts: "scene", name: "The compulsion"}}},
  "driving-goal": {fail: {spendWp: true, else: {diff: 1, tags: ["all"], lasts: "night", name: "Away from the goal"}}},
  "curiosity": {roll: ["wits", 7], fail: {diff: 1, tags: ["all"], lasts: "scene", name: "Must look"}},
  "absent-minded": {roll: ["intelligence", 6], fail: {dice: -1, tags: ["perception", "intelligence", "wits"], lasts: "night", name: "Absent-minded"}},
  "deranged": {fail: {bout: null}},
  "hatred": {roll: ["rage", 6], fail: {frenzy: true}},
  "obsession": {roll: ["willpower", 7], fail: {diff: 1, tags: ["all"], lasts: "scene", name: "The obsession"}},
  "ptsd": {roll: ["willpower", 7], fail: {diff: 2, tags: ["all"], lasts: "scene", name: "The old trauma"}},
  "chronic-depression": {roll: ["willpower", 7], fail: {dice: -1, tags: ["all"], lasts: "night", name: "Despair"}},
  "feral-mind": {fail: {diff: 1, tags: ["social"], lasts: "scene", name: "Feral manners"}},
  "stress-atavism": {roll: ["willpower", 7], fail: {diff: 1, tags: ["all"], lasts: "scene", name: "Reverting"}},
  "indecisive": {roll: ["willpower", 6], fail: {diff: 1, tags: ["all"], lasts: "scene", name: "Hesitation"}},
  "poetic-heart": {roll: ["banality", 0], fail: {banality: 1}},
  "bizarre-quality": {fail: {diff: 1, tags: ["stealth", "subterfuge"], lasts: "scene", name: "Stared at"}},
  "anachronism": {roll: ["intelligence", 7], fail: {diff: 1, tags: ["computer", "science", "drive", "academics"], lasts: "scene", name: "Out of time"}},
  // B5175: the feeding flaws and the Garou's berserk rage, from the books' wording (V20 pp. 481, 487; W20 p. 476)
  "infectious-bite": {fail: {infect: 0.2}},
  "conspicuous-consumption": {fail: {consume: true}},
  "berserker": {fail: {berserk: true}},
  "newflaws-anachronism": {roll: ["intelligence", 7], fail: {diff: 1, tags: ["computer", "science", "drive", "academics"], lasts: "scene", name: "Out of time"}}
};
export const biteOf = key => BITES[key] ?? null;
/** The sickness an infected bite leaves on a mortal vessel: a die off every roll for a week (house reading). */
export const FEVER = {name: "A fevered bite", dice: -1, tags: ["all"], seconds: 7 * 86400};
/** Does the bite infect? one in five (V20 p. 481). */
export const infects = (chance, d10) => Number(d10) <= Math.round((Number(chance) || 0) * 10);

/** Count a roll: successes less ones, and a botch. */
export function count(faces = [], diff = 6) {
  const hits = faces.filter(f => f >= diff).length, ones = faces.filter(f => f === 1).length;
  return {successes: Math.max(0, hits - ones), raw: hits, botch: hits === 0 && ones > 0};
}
/** What a bite's roll comes to: {held, frenzy}. Hatred frenzies on four successes or more (W20 p. 261). */
export function outcome(bite, r = null) {
  if ( !bite?.roll ) return {held: false, frenzy: false};
  if ( bite.fail?.frenzy ) return {held: (r?.raw ?? 0) < 4, frenzy: (r?.raw ?? 0) >= 4};
  return {held: (r?.successes ?? 0) > 0, frenzy: false};
}
/** The timed effects in force as roll effects: [{key, name, dice, diff}] for a roll with these tags. */
export function biteEffects(list = [], tags = []) {
  const want = new Set(tags.map(t => String(t).toLowerCase()));
  return list.filter(b => (b.tags ?? []).some(t => t === "all" || want.has(t)))
    .map(b => ({key: "trait-bite", name: b.name, dice: Number(b.dice) || 0, diff: Number(b.diff) || 0, note: ""}));
}
