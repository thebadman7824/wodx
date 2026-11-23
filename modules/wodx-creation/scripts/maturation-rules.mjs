/**
 * Maturation (B7685-B7689), the pure part: how a Cainite grows over long downtime under Dark Ages: Vampire (2002,
 * printed pp. 166-167) and the Dark Ages Storytellers Companion (2002, pp. 71-75). V20 Dark Ages has no rule for it, so
 * the 2002 rule stands. No Foundry calls; dice come in as a function.
 *
 * - Points for the years: the longer the downtime, the slower the points come (1 a year for the first 5 years, then
 *   1 per 5, 10, 20, 25 and 30 years).
 * - How the years were spent: active (as the table), in danger (half again), in seclusion (half), research or practice
 *   (a point a decade more, kept for Knowledges or for Skills and physical Talents), torpor (only an old sleeper of
 *   strong mind, a point per 30 years, for mental traits).
 * - Risks and rewards: at the end of each century (or the downtime, if shorter) a Willpower roll at 7 (9 in seclusion,
 *   6 in danger); each success is a point more; a botch costs a die of points; in danger no success costs a die.
 * - Upkeep: each century every Background but Generation costs a point (2 in seclusion or torpor) or loses a dot.
 * - Tempting Fate: downtime in danger rolls Willpower at 7 for each Background; a botch loses a dot, a failure bars
 *   raising it this time, a success lets it be raised at +1 difficulty.
 * - Spending: costs by trait (Attributes 5 or 10, Abilities 2, Disciplines 3 rising with age, Virtues 2, Road 1 or 2,
 *   Willpower 2, Backgrounds 1 rising with age and a roll); only traits already held, at most a dot each per period.
 */

const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const SOURCE = "Dark Ages: Vampire (2002) pp. 166-167; Dark Ages Storytellers Companion (2002) pp. 71-75";
export const page = p => (p >= 160 ? `Dark Ages: Vampire (2002) p. ${p}` : `Dark Ages Storytellers Companion (2002) p. ${p}`);

/* ---------------- Points for the years (B7685) ---------------- */
/** Bands of downtime: [years in the band, years per point], the core book's to 130 years, the Companion's after. The last runs on. */
export const BANDS = [[5, 1], [25, 5], [100, 10], [370, 20], [250, 25], [Infinity, 30]];
/** Points for a downtime of `years` (fractions of a band count down). */
export function pointsFor(years) {
  let left = Math.max(0, Math.floor(n(years))), pts = 0;
  for ( const [span, per] of BANDS ) {
    if ( left <= 0 ) break;
    const y = Math.min(left, span);
    pts += Math.floor(y / per);
    left -= y;
  }
  return pts;
}

/** How the downtime was spent. mult scales the table; extra is points a decade for `only`. */
export const ACTIVITY = {
  active: {label: "Active: an ordinary unlife", mult: 1, roll: 7, upkeep: 1, raise: true, p: 71},
  danger: {label: "In danger: war, feud, the hunt", mult: 1.5, roll: 6, upkeep: 1, raise: true, tempting: true, p: 71},
  seclusion: {label: "In seclusion: hidden away", mult: 0.5, roll: 9, upkeep: 2, raise: false, noBotch: true, p: 71},
  research: {label: "Research: a manuscript, a question", mult: 1, roll: 7, upkeep: 2, raise: false, extra: 1, only: "knowledges", p: 71},
  practice: {label: "Practice: a craft or a fighting art", mult: 1, roll: 7, upkeep: 1, raise: true, extra: 1, only: "physical", p: 71},
  torpor: {label: "Torpor", mult: 0, roll: null, upkeep: 2, raise: false, p: 72}
};
export const ACTIVITY_KEYS = Object.keys(ACTIVITY);
/** A sleeper earns points only with Willpower 7+, Perception 4+ and 500 years or more (p. 72). */
export const TORPOR = {willpower: 7, perception: 4, age: 500, yearsPerPoint: 30, costShare: 0.75};
export const torporEarns = ({willpower = 0, perception = 0, age = 0} = {}) => n(willpower) >= TORPOR.willpower && n(perception) >= TORPOR.perception && n(age) >= TORPOR.age;

/** The base points for a downtime and how it was spent: {points, extra, only}. */
export function earned(years, activity = "active", traits = {}) {
  const a = ACTIVITY[activity] ?? ACTIVITY.active;
  if ( activity === "torpor" ) return {points: torporEarns(traits) ? Math.floor(n(years) / TORPOR.yearsPerPoint) : 0, extra: 0, only: torporEarns(traits) ? "mental" : null};
  const base = pointsFor(years);
  return {points: Math.floor(base * a.mult), extra: a.extra ? a.extra * Math.floor(n(years) / 10) : 0, only: a.only ?? null};
}

/** The periods a downtime is judged in: a century each, or the whole downtime if shorter (p. 72). */
export const periodsOf = years => Math.max(1, Math.ceil(Math.max(0, n(years)) / 100));

/* ---------------- Risks and rewards (B7686) ---------------- */
/**
 * One Willpower roll for one period: `roll(dice, diff)` returns {successes, botch}; `d10()` a die for a loss.
 * Returns {bonus, lost, why}.
 */
export function risksAndRewards(activity, willpower, roll, d10) {
  const a = ACTIVITY[activity] ?? ACTIVITY.active;
  if ( a.roll === null ) return {bonus: 0, lost: 0, why: "No roll in torpor."};
  const r = roll(n(willpower), a.roll);
  if ( r.botch && !a.noBotch ) { const l = d10(); return {bonus: 0, lost: l, why: `Willpower botched at ${a.roll}: ${l} points lost.`}; }
  if ( activity === "danger" && !r.successes ) { const l = d10(); return {bonus: 0, lost: l, why: `No success at ${a.roll} in danger: ${l} points lost.`}; }
  return {bonus: r.successes, lost: 0, why: `Willpower at ${a.roll}: ${r.successes} point${r.successes === 1 ? "" : "s"} more.`};
}

/* ---------------- Upkeep and Tempting Fate (B7687) ---------------- */
/** Backgrounds that need no upkeep and cannot be raised in downtime (p. 73). */
export const NO_UPKEEP = /^generation/i;
/** Upkeep for one Background for the whole downtime: points a century, 1 (2 in seclusion, research or torpor). */
export const upkeepOf = (activity, years) => (ACTIVITY[activity] ?? ACTIVITY.active).upkeep * periodsOf(years);

/**
 * Pay the upkeep: the Backgrounds in the order given (the player's priority), each costing its upkeep while points
 * last; one that cannot be paid loses a dot. A pooled anchor rated 6 or more needs two keepers (p. 74): its upkeep is
 * counted twice. Returns {left, kept: [name], lost: [name]}.
 */
export function payUpkeep(points, backgrounds = [], activity = "active", years = 0) {
  let left = Math.max(0, n(points));
  const kept = [], lost = [];
  for ( const b of backgrounds ) {
    if ( NO_UPKEEP.test(String(b.name ?? "")) || n(b.value) <= 0 ) continue;
    const cost = upkeepOf(activity, years) * (b.pooledAnchor && n(b.value) >= 6 ? 2 : 1);
    if ( left >= cost ) { left -= cost; kept.push(b.name); }
    else lost.push(b.name);
  }
  return {left, kept, lost};
}

/** Tempting Fate for one Background (p. 73): {lose, mayRaise, raiseDiff} from a Willpower roll at 7. */
export function temptingFate(willpower, roll) {
  const r = roll(n(willpower), 7);
  if ( r.botch ) return {lose: true, mayRaise: false, raiseDiff: 0, why: "Tempting Fate botched: a dot lost."};
  if ( !r.successes ) return {lose: false, mayRaise: false, raiseDiff: 0, why: "Tempting Fate failed: it cannot be raised this time."};
  return {lose: false, mayRaise: true, raiseDiff: 1, why: "Tempting Fate held: it may be raised, at +1 difficulty."};
}

/* ---------------- Spending (B7688) ---------------- */
/** Two centuries, then a point more for each two after (Disciplines and Backgrounds). */
export const ageStep = age => Math.max(0, Math.floor((n(age) - 200) / 200) + (n(age) > 200 ? 1 : 0));
/**
 * The cost of the next dot: kind is attribute, ability, specialty, discipline, virtue, road, willpower, background.
 * o: {age, willpower, road, outOfClan, path, torpor, isNew}. Returns {cost, dots} (a path Discipline buys two dots).
 */
export function costOf(kind, o = {}) {
  const age = n(o.age);
  let cost = 0, dots = 1;
  switch ( kind ) {
    case "attribute": cost = age < n(o.willpower) * 100 ? 5 : 10; break;
    case "ability": cost = 2; break;
    case "specialty": cost = 1; break;
    case "discipline": cost = 3 + ageStep(age) + (o.outOfClan ? 1 : 0); dots = o.path ? 2 : 1; break;
    case "virtue": cost = 2; break;
    case "road": cost = n(o.road) < n(o.willpower) ? 1 : 2; break;
    case "willpower": cost = 2; break;
    case "background": cost = 1 + ageStep(age); break;
    default: return null;
  }
  // A trait not yet held costs at least double (p. 73); points earned in torpor cost three quarters (p. 72)
  if ( o.isNew ) cost *= 2;
  if ( o.torpor ) cost = Math.ceil(cost * TORPOR.costShare);
  return {cost, dots};
}

/** What points earned a certain way may buy (p. 71-72): research Knowledges, practice Skills and physical Talents, torpor mental traits. */
export const ONLY = {
  knowledges: {kinds: ["ability"], groups: ["knowledge"]},
  physical: {kinds: ["ability", "attribute"], groups: ["skill", "talent"], attributes: ["strength", "dexterity", "stamina"]},
  mental: {kinds: ["ability", "attribute", "discipline"], groups: ["knowledge"], attributes: ["perception", "intelligence", "wits"], disciplines: /^(auspex|dementation|dominate|presence|thaumaturgy|necromancy|mortis|obfuscate|chimerstry|mytherceria)/i}
};
/** May points kept for `only` buy this trait? t: {kind, group, key, name}. */
export function mayBuy(only, t = {}) {
  if ( !only ) return true;
  const o = ONLY[only];
  if ( !o || !o.kinds.includes(t.kind) ) return false;
  if ( t.kind === "attribute" ) return (o.attributes ?? []).includes(t.key);
  if ( t.kind === "ability" ) return (o.groups ?? []).includes(t.group);
  if ( t.kind === "discipline" ) return !!o.disciplines?.test(String(t.name ?? ""));
  return false;
}

/* ---------------- Raising a Background (B7689) ---------------- */
/** The roll to raise each Background in downtime (p. 74-75): difficulty and successes a dot after the first. */
export const BG_RAISE = {
  allies: {diff: 7, per: 2, spill: ["retainers"]}, contacts: {diff: 6, per: 2, spill: ["allies"]},
  domain: {diff: 7, per: 2, spill: ["allies", "resources"]}, herd: {diff: 6, per: 2, spill: ["retainers", "contacts"]},
  influence: {diff: 8, per: 3, spill: ["allies", "contacts"]}, mentor: {diff: 7, per: 2, spill: []},
  resources: {diff: 8, per: 2, spill: ["domain"]}, retainers: {diff: 6, per: 2, spill: ["allies"]},
  status: {diff: 8, per: 2, spill: []}
};
export const bgKey = name => Object.keys(BG_RAISE).find(k => String(name ?? "").trim().toLowerCase().startsWith(k)) ?? null;

/**
 * Raise one Background: o = {value, attempt (1 for the first this half-century, 2 the next...), tempted (+1 from
 * Tempting Fate), pooledBig (an anchor at 6 or more, +1)}. `roll(dice, diff)` → {successes, botch}.
 * Returns {ok, diff, gain, lose, why} or {ok: false, why} when it cannot be tried.
 */
export function raiseBackground(name, o = {}, roll) {
  const k = bgKey(name);
  if ( NO_UPKEEP.test(String(name ?? "")) ) return {ok: false, why: "Generation is raised only by diablerie, played out (p. 75)."};
  if ( !k ) return {ok: false, why: `${name}: no downtime roll in the book.`};
  if ( n(o.value) <= 0 ) return {ok: false, why: "A new Background is gained in play, not with maturation points (p. 74)."};
  const R = BG_RAISE[k];
  const diff = clamp(R.diff + Math.max(0, n(o.attempt) - 1) + (o.tempted ? 1 : 0) + (o.pooledBig ? 1 : 0), 2, 10);
  const r = roll(n(o.value), diff);
  if ( r.botch ) return {ok: true, diff, gain: 0, lose: 1, why: `Botched at ${diff}: a dot lost.`};
  if ( !r.successes ) return {ok: true, diff, gain: 0, lose: 0, why: `No success at ${diff}: no change.`};
  const gain = 1 + Math.floor((r.successes - 1) / R.per);
  return {ok: true, diff, gain, lose: 0, spill: R.spill, why: `${r.successes} success${r.successes === 1 ? "" : "es"} at ${diff}: +${gain}.`};
}

/** Each trait may rise one dot a period (a century, or the downtime) at most (p. 73). */
export const maxDotsFor = years => periodsOf(years);

/* ---------------- The Sleep of Ages and the Thirst of Caine (B7692-B7693) ---------------- */
/**
 * The Sleep of Ages (DASC 2002 pp. 75-76): past 500 years a Cainite must sleep or hold it off with a Willpower point
 * and a roll of the Road at 8: a decade more for each success; a failure means voluntary torpor, a botch torpor and a
 * Derangement. Returns null under 500 years, else {decades, torpor, derangement, why}.
 */
export const SLEEP = {age: 500, diff: 8, yearsPerSuccess: 10};
export function sleepOfAges(age, road, roll) {
  if ( n(age) < SLEEP.age ) return null;
  const r = roll(n(road), SLEEP.diff);
  if ( r.botch ) return {decades: 0, torpor: true, derangement: true, why: "The Sleep of Ages: the roll botched, so torpor and a Derangement; waking early costs Willpower."};
  if ( !r.successes ) return {decades: 0, torpor: true, derangement: false, why: "The Sleep of Ages: no success, so voluntary torpor; waking early costs Willpower."};
  return {decades: r.successes, torpor: false, derangement: false, why: `The Sleep of Ages held off ${r.successes} decade${r.successes === 1 ? "" : "s"} more for a point of Willpower.`};
}

/**
 * The Thirst of Caine (DASC 2002 pp. 76-77), the book's systematic option: the triggers a sheet shows. v = {road,
 * roadKey, age, nature, extra (triggers the Storyteller ticks: diablerist, sire addicted, blood Derangement, five
 * childer, five under oath)}. Returns [label].
 */
export const THIRST_ROADS = ["beast", "metamorphosis", "blood"];
export const CALM_NATURES = ["architect", "caregiver", "cavalier", "martyr"];
export function thirstTriggers(v = {}) {
  const t = [];
  if ( n(v.road) > 0 && n(v.road) <= 3 ) t.push("Road 3 or less");
  if ( THIRST_ROADS.includes(String(v.roadKey ?? "")) ) t.push("the Road of the Beast, Metamorphosis or Blood");
  if ( n(v.age) >= 500 ) t.push("active 500 years or more");
  if ( v.nature && !CALM_NATURES.includes(String(v.nature).trim().toLowerCase()) ) t.push("a Nature other than Architect, Caregiver, Cavalier or Martyr");
  for ( const x of v.extra ?? [] ) t.push(String(x));
  return t;
}
/** One roll: Willpower at the number of triggers (2 at least). stage none → wavering → addicted; a botch, addicted. */
export const THIRST_STAGES = ["none", "wavering", "addicted"];
export function thirstRoll(stage, willpower, triggers, roll) {
  const now = THIRST_STAGES.includes(stage) ? stage : "none";
  if ( now === "addicted" || !n(triggers) ) return {stage: now, diff: 0, why: ""};
  const diff = clamp(Math.max(2, n(triggers)), 2, 10);
  const r = roll(n(willpower), diff);
  if ( r.botch ) return {stage: "addicted", diff, why: `The Thirst of Caine: botched at ${diff}; only Cainite vitae feeds them now.`};
  if ( r.successes ) return {stage: now, diff, why: `The Thirst of Caine: held at ${diff}.`};
  const next = now === "none" ? "wavering" : "addicted";
  return {stage: next, diff, why: next === "wavering" ? `The Thirst of Caine: failed at ${diff}; they crave Cainite vitae and drink it when they can.` : `The Thirst of Caine: failed again at ${diff}; they must drink Cainite vitae to survive.`};
}
