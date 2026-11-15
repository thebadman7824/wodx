/**
 * WoDX NPC (NPC Aftercare Desk, round two of the NPC review, B5800-B5806): what comes after an NPC is taken by the
 * law, hurt, faced down by a rival, fed on, bereaved, robbed or married. The pure part; aftercare.mjs acts on the world.
 *
 * Book basis (in WoDX's own words; printed pages):
 *   Healing times: bashing heals an hour a level to Wounded, then three, six and twelve hours; lethal and aggravated
 *   take a day, three days, a week, a month, two months, three months and five months, the times adding up; worse
 *   wounds need someone with Medicine (M20 pp. 408-409, the mortal chart the lines share).
 *   A vampire heals a level of bashing or lethal damage with a point of blood (V20, healing with blood).
 * WoDX readings: the hours, who moves on marriage, mourning days by faith, the rest.
 */

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
export const HOUR = 3600, DAY = 86400, YEAR = Math.round(365.25 * DAY);
const B = (from, to, place, activity, label, more = {}) => ({from, to, place, activity, when: "any", days: null, feast: "any", label, ...more});

/* ---- n1: the law ---- */

/** The NPC is held for trial at the watch-house, if there is one. */
export const heldDuty = place => (place ? B(0, 24, place, "rest", "Held for trial") : null);
/** After the verdict or the sentence: "free" (home first, then the routine), "time" (off the maps for seconds), "gone" (leaves for good), "dead". */
export function lawAfter(mark = null, {guilty = true} = {}) {
  if ( !guilty || !mark ) return {do: "free", seconds: 0};
  if ( mark.kind === "death" ) return {do: "dead", seconds: 0};
  if ( mark.kind === "banished" ) return {do: "gone", seconds: 0};
  if ( mark.kind === "time" ) return {do: "time", seconds: Math.max(1, num(mark.until) - num(mark.year)) * YEAR, away: !!mark.away};
  return {do: "free", seconds: 0};
}
/** Home first for an hour after being let go. */
export const HOME_FIRST = HOUR;
export const homeDuty = (place, now) => (place ? {...B(0, 24, place, "rest", "Home again"), until: num(now) + HOME_FIRST} : null);

/* ---- n2: wounds ---- */

export const BASHING_TIMES = [HOUR, HOUR, HOUR, HOUR, 3 * HOUR, 6 * HOUR, 12 * HOUR];
export const LETHAL_TIMES = [DAY, 3 * DAY, 7 * DAY, 30 * DAY, 60 * DAY, 90 * DAY, 150 * DAY];
const total = d => num(d?.bashing) + num(d?.lethal) + num(d?.aggravated);
/** The next level to heal (the top of the track: bashing first) and how long it takes, or null when unhurt. */
export function nextHeal(d = {}) {
  const n = Math.min(7, total(d));
  if ( n <= 0 ) return null;
  const type = num(d.bashing) > 0 ? "bashing" : num(d.lethal) > 0 ? "lethal" : "aggravated";
  return {type, seconds: (type === "bashing" ? BASHING_TIMES : LETHAL_TIMES)[n - 1]};
}
/** Wounds that want a healer: bashing to Wounded or worse, lethal or aggravated to Injured or worse (M20 p. 409). */
export const needsCare = d => (num(d?.lethal) + num(d?.aggravated) > 0 ? total(d) >= 3 : total(d) >= 4);
/** Hurt enough to keep to bed: Injured or worse. Back on the routine once no worse than Hurt. */
export const laidUp = d => total(d) >= 3;
/** Where the hurt go to be tended, in order, by the age: a hospital or infirmary, else a house of worship, else home. */
export const HEALERS = ["hospital", "church", "monastery", "temple", "synagogue", "mosque"];
export const tendDuty = (place, label = "Being tended") => (place ? B(0, 24, place, "rest", label) : null);
/** A Kindred NPC heals with blood: a point a level of bashing or lethal, keeping two points back. */
export const BLOOD_KEEP = 2;
export function bloodHeal(d = {}, blood = 0) {
  const can = Math.max(0, num(blood) - BLOOD_KEEP);
  const b = Math.min(num(d.bashing), can), l = Math.min(num(d.lethal), can - b);
  return {bashing: b, lethal: l, spent: b + l};
}

/**
 * B6315: every line that mends with its own power does so after a fight, as the Kindred do with blood. line: the
 * all-lines key (lines-rules.mjs); d: {bashing, lethal, aggravated}; pool: what the line spends, now.
 * Returns {pool, spent, bashing, lethal, aggravated, what} or null when the line has no such power (it heals with time).
 *   vampire, ghoul  a blood point a level of bashing or lethal (V20 pdf 276), two kept back (one for a ghoul)
 *   kuei-jin        a Chi point a level of bashing or lethal, five for an aggravated one (Kindred of the East
 *                   Companion pdf 32, "like a Kuei-jin"); Yang Chi first, then Yin; two kept back
 *   wraith          a Pathos point mends two bashing or one lethal Corpus level; aggravated cannot (Wraith 20th pdf 360)
 *   demon           a Faith point mends all bashing, another each lethal level; aggravated cannot (Demon: the Fallen pdf 172); one kept back
 * The Garou and Fera regenerate instead (WoDX Actions healPlan); every other line heals with time.
 */
export const MEND_KEEP = {vampire: 2, ghoul: 1, "kuei-jin": 2, wraith: 1, demon: 1};
export const MEND_WORD = {vampire: "blood", ghoul: "blood", "kuei-jin": "Chi", wraith: "Pathos", demon: "Faith"};
export function lineMend(line, d = {}, pool = 0) {
  if ( !MEND_WORD[line] ) return null;
  const can = Math.max(0, num(pool) - (MEND_KEEP[line] ?? 0));
  const out = {pool: num(pool), spent: 0, bashing: 0, lethal: 0, aggravated: 0, what: MEND_WORD[line]};
  if ( !can ) return out;
  if ( line === "vampire" || line === "ghoul" ) {
    const h = bloodHeal(d, can + BLOOD_KEEP);
    Object.assign(out, {bashing: h.bashing, lethal: h.lethal, spent: h.spent});
  } else if ( line === "kuei-jin" ) {
    let left = can;
    out.bashing = Math.min(num(d.bashing), left); left -= out.bashing;
    out.lethal = Math.min(num(d.lethal), left); left -= out.lethal;
    out.aggravated = Math.min(num(d.aggravated), Math.floor(left / 5)); left -= out.aggravated * 5;
    out.spent = can - left;
  } else if ( line === "wraith" ) {
    let left = can;
    out.lethal = Math.min(num(d.lethal), left); left -= out.lethal;
    const pairs = Math.min(Math.ceil(num(d.bashing) / 2), left);
    out.bashing = Math.min(num(d.bashing), pairs * 2); left -= pairs;
    out.spent = can - left;
  } else if ( line === "demon" ) {
    let left = can;
    if ( num(d.bashing) > 0 ) { out.bashing = num(d.bashing); left -= 1; }
    out.lethal = Math.min(num(d.lethal), left); left -= out.lethal;
    out.spent = can - left;
  }
  out.pool = num(pool) - out.spent;
  return out;
}

/* ---- n3: rivals who back down ---- */

/** Which of two rivals gives way: outnumbered first, then off its own ground, then the less bold. sides: [{id, us, them, ownGround, aggression}]. */
export function givesWay([a, b] = []) {
  if ( !a || !b ) return null;
  const score = x => (num(x.us) - num(x.them)) * 10 + (x.ownGround ? 5 : 0) + num(x.aggression);
  return score(a) < score(b) ? a.id : b.id;
}
/** The next meeting of the same two is likelier to come to blows. */
export const FLASH_BONUS = 10, STANDOFF_KEEP = 30 * DAY;
export const standoffBonus = (at, now) => (Number.isFinite(Number(at)) && num(now) - num(at) < STANDOFF_KEEP ? FLASH_BONUS : 0);

/* ---- n4: after the Kiss ---- */

export const DAZE_SECONDS = 10 * 60, WEAK_FROM = 3, MORNING = 6;
/** The world time of the next morning (06:00) after now. */
export function nextMorning(now) {
  const t = num(now), day = Math.floor(t / DAY) * DAY, m = day + MORNING * HOUR;
  return m > t ? m : m + DAY;
}
export const restDuty = (place, now) => (place ? {...B(0, 24, place, "rest", "Resting, pale and tired"), after: num(now) + DAZE_SECONDS, until: nextMorning(num(now) + DAZE_SECONDS)} : null);

/* ---- n5: mourning ---- */

/** Days of mourning and where the mourner goes each evening, by faith (WoDX Chronicle FAITHS ids). House reading. */
export const MOURNING = {
  western: {days: 7, place: ["church"], words: "a vigil, then black for a month"}, orthodox: {days: 9, place: ["church"], words: "the ninth-day prayers"},
  islamic: {days: 3, place: ["mosque"], words: "three days of mourning"}, jewish: {days: 7, place: ["synagogue"], words: "shiva, seven days"},
  hindu: {days: 13, place: ["temple"], words: "thirteen days of rites"}, theravada: {days: 7, place: ["temple", "monastery"], words: "seven days of merit-making"},
  tibetan: {days: 49, place: ["temple", "monastery"], words: "prayers through the forty-nine days"}, chinese: {days: 7, place: ["temple"], words: "the first seven days of mourning"},
  own: {days: 7, place: ["temple", "church"], words: "the rites of their own"}
};
export const mourningOf = faith => MOURNING[faith] ?? MOURNING.own;
/** Home by day, the place of worship each evening, for the mourning days. */
export function mournDuties(home, worship, now, faith) {
  const m = mourningOf(faith), until = num(now) + m.days * DAY;
  const out = {};
  if ( worship ) out.worship = {...B(18, 21, worship, "pray", "In mourning, at prayer"), until};
  if ( home ) out.home = {...B(0, 24, home, "rest", "In mourning"), until};
  return out;
}

/* ---- n6: after a robbery ---- */

/** A robber who got money spends the night at the tavern: from now to the next morning. */
export const spreeDuty = (place, now) => (place ? {...B(0, 24, place, "drink", "Spending what was taken"), until: nextMorning(now)} : null);

/* ---- n7: marriage ---- */

/**
 * Who moves in with whom: the one with no home moves; with two homes, the bride moves to the groom's (the custom of most
 * lands and ages, a house reading); otherwise the smaller household. people: [{id, home, sex, household}].
 */
export function whoMoves([a, b] = []) {
  if ( !a || !b ) return null;
  if ( !a.home && !b.home ) return null;
  if ( !a.home ) return {moves: a.id, to: b.id};
  if ( !b.home ) return {moves: b.id, to: a.id};
  if ( a.home === b.home ) return null;
  if ( a.sex === "female" && b.sex === "male" ) return {moves: a.id, to: b.id};
  if ( b.sex === "female" && a.sex === "male" ) return {moves: b.id, to: a.id};
  return num(a.household) <= num(b.household) ? {moves: a.id, to: b.id} : {moves: b.id, to: a.id};
}
