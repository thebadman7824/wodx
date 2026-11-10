/**
 * WoDX Storyteller 0.15.0: long tasks over the clock. No Foundry calls here.
 *
 * A long task is an extended action (V20 pp. 251-252; V20 Dark Ages p. 324) that runs over days or weeks of game
 * time: making something, research, training with a teacher, a talen or fetish, a wonder. One roll is made each time
 * an interval of game time passes. Successes add up until the goal is reached; a botch loses them all, and in a
 * delicate task it ruins the work.
 */

export const HOUR = 3600;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;
export const MONTH = 30 * DAY;
export const INTERVALS = {hour: {label: "Each hour", s: HOUR}, day: {label: "Each night or day", s: DAY},
  week: {label: "Each week", s: WEEK}, month: {label: "Each month", s: MONTH}};
/** Rolls made in one clock change; more wait for the next change. */
export const MAX_ROLLS = 60;

export const ATTRS = ["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"];

/**
 * Kinds of long task. Pools, intervals and goals are suggestions the Storyteller can change on every task.
 * house: true marks a suggestion the books do not set.
 */
export const KINDS = {
  craft: {label: "Make or mend something", attr: "dexterity", ability: "crafts", diff: 6, interval: "day", goal: 5, delicate: false, house: true,
    ref: "Complex repairs take 10 minutes per success needed (V20 p. 264); the time for making things is the Storyteller's."},
  research: {label: "Research in books or records", attr: "intelligence", ability: "occult", diff: 6, interval: "week", goal: 5, delicate: false, house: true,
    ref: "Occult research can run a month or half a year (V20 p. 246)."},
  train: {label: "Learn from a teacher", attr: "intelligence", ability: "", diff: 6, interval: "week", goal: 5, delicate: false, house: true,
    ref: "A new trait needs a teacher and study as well as the experience, from a short course to years for a first dot of Thaumaturgy; no time is fixed (V20 p. 123)."},
  fetish: {label: "Make a fetish or talen", attr: "wits", ability: "rituals", diff: 10, interval: "day", goal: 1, delicate: true, house: false,
    ref: "The Rite of the Fetish: Wits + Rituals at difficulty 10, 2 less for each permanent Gnosis spent; talens come from the Rite of Binding, one more for each extra success (W20 pp. 213, 227-228)."},
  wonder: {label: "Make a wonder or talisman", attr: "intelligence", ability: "occult", diff: 7, interval: "week", goal: 10, delicate: true, house: true,
    ref: "Dark Ages: Mage gives no general rule for making a wonder; a creature part lowers the difficulty by 2 (p. 191)."},
  other: {label: "Something else", attr: "intelligence", ability: "", diff: 6, interval: "day", goal: 5, delicate: false, house: true,
    ref: "The Storyteller sets the pool, the interval, the difficulty and the goal (V20 p. 251; V20 Dark Ages p. 324)."}
};

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clampDiff = d => Math.max(2, Math.min(10, Math.round(n(d) || 6)));

/** A task as stored on the actor flag wodx-storyteller.tasks[id]. */
export function normTask(t = {}) {
  const kind = KINDS[t.kind] ? t.kind : t.kind === "talen" ? "fetish" : "other";
  const k = KINDS[kind];
  const interval = INTERVALS[t.interval] ? t.interval : k.interval;
  const started = n(t.started);
  return {
    id: String(t.id ?? ""), kind, name: String(t.name ?? "").trim() || k.label,
    attr: ATTRS.includes(t.attr) ? t.attr : k.attr, ability: String(t.ability ?? k.ability ?? ""),
    dice: Math.max(0, Math.round(n(t.dice))), diff: clampDiff(t.diff ?? k.diff), specialty: !!t.specialty,
    goal: Math.max(1, Math.round(n(t.goal) || k.goal)), interval, delicate: t.delicate === undefined ? k.delicate : !!t.delicate,
    total: Math.max(0, Math.round(n(t.total))), rolls: Math.max(0, Math.round(n(t.rolls))),
    started, next: t.next === undefined || t.next === null ? started + INTERVALS[interval].s : n(t.next),
    status: ["open", "paused", "done", "ruined"].includes(t.status) ? t.status : "open",
    note: String(t.note ?? ""), log: Array.isArray(t.log) ? t.log.slice(-20) : []
  };
}

/** Count one roll (V20 Dark Ages pp. 322-323; the same in V20): 10s count twice with a specialty, each 1 cancels a success, a botch is no successes with a 1. */
export function countFaces(faces, diff, {specialty = false} = {}) {
  let raw = 0, ones = 0;
  for ( const f of faces ) { if ( f === 1 ) ones++; if ( f >= diff ) raw += (specialty && f === 10) ? 2 : 1; }
  return {successes: Math.max(0, raw - ones), botch: raw === 0 && ones > 0};
}

/** How many rolls are due by `now`: one per whole interval passed since `next` came due. */
export function dueRolls(task, now) {
  const t = normTask(task);
  if ( t.status !== "open" || now < t.next ) return 0;
  return 1 + Math.floor((now - t.next) / INTERVALS[t.interval].s);
}

/** One interval's roll. A botch loses every success; in a delicate task the work is ruined. */
export function stepTask(task, roll, at) {
  const t = normTask(task);
  if ( t.status !== "open" ) return t;
  t.rolls += 1;
  t.next += INTERVALS[t.interval].s;
  if ( roll.botch ) {
    t.total = 0;
    if ( t.delicate ) t.status = "ruined";
    t.log.push({at, s: 0, botch: true});
  } else {
    t.total += Math.max(0, n(roll.successes));
    t.log.push({at, s: Math.max(0, n(roll.successes))});
    if ( t.total >= t.goal ) t.status = "done";
  }
  t.log = t.log.slice(-20);
  return t;
}

/** Resume a paused task: the next roll comes one interval from now, so paused time does not count. */
export function resumeTask(task, now) {
  const t = normTask(task);
  if ( t.status !== "paused" ) return t;
  t.status = "open";
  t.next = now + INTERVALS[t.interval].s;
  return t;
}

export function pauseTask(task) {
  const t = normTask(task);
  if ( t.status === "open" ) t.status = "paused";
  return t;
}

/** A short line for a card or the window. */
export function describe(task) {
  const t = normTask(task);
  const state = {open: `${t.total} of ${t.goal} successes after ${t.rolls} roll${t.rolls === 1 ? "" : "s"}`,
    paused: `paused at ${t.total} of ${t.goal}`, done: `finished after ${t.rolls} roll${t.rolls === 1 ? "" : "s"}`,
    ruined: "ruined by a botch"}[t.status];
  return `${t.name}: ${state}`;
}

/** A new id that does not clash with the ones in use. */
export function newId(existing = {}, rand = Math.random) {
  for ( let i = 0; i < 50; i++ ) {
    const id = `t${Math.floor(rand() * 36 ** 6).toString(36).padStart(6, "0")}`;
    if ( !existing[id] ) return id;
  }
  return `t${Date.now().toString(36)}`;
}
