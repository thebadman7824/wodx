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
  build: {label: "Put up a building", attr: "dexterity", ability: "crafts", diff: 6, interval: "week", goal: 6, delicate: false, house: true,
    ref: "Built in stages, each an extended action; workers each add a die and each stage is paid for as it starts (house rule)."},
  other: {label: "Something else", attr: "intelligence", ability: "", diff: 6, interval: "day", goal: 5, delicate: false, house: true,
    ref: "The Storyteller sets the pool, the interval, the difficulty and the goal (V20 p. 251; V20 Dark Ages p. 324)."}
};

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const strs = v => (Array.isArray(v) ? v.map(x => String(x).slice(0, 120)).filter(Boolean).slice(0, 20) : []);
const stagesOf = v => (Array.isArray(v) ? v.slice(0, 8).map(x => ({name: String(x?.name ?? "").slice(0, 60) || "Work",
  goal: Math.max(1, Math.round(n(x?.goal) || 1)), cost: Math.max(0, Math.round(n(x?.cost)))})) : []);
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
    note: String(t.note ?? ""), log: Array.isArray(t.log) ? t.log.slice(-20) : [],
    needs: String(t.needs ?? "").slice(0, 1000).trim(), workshop: WORKSHOPS[t.workshop] ? t.workshop : "", makes: String(t.makes ?? "").slice(0, 120).trim(),
    made: !!t.made, waits: String(t.waits ?? "").slice(0, 200),
    // 0.27.0: recipes from the goods list, buildings in stages, who it is for
    good: String(t.good ?? "").slice(0, 80), materials: strs(t.materials), spent: strs(t.spent), quality: String(t.quality ?? "").slice(0, 20),
    building: String(t.building ?? "").slice(0, 40), stages: stagesOf(t.stages), stage: Math.max(0, Math.round(n(t.stage))),
    paidStage: Number.isFinite(Number(t.paidStage)) ? Math.round(Number(t.paidStage)) : -1, workers: Math.max(0, Math.min(10, Math.round(n(t.workers)))),
    owner: t.owner && typeof t.owner === "object" ? {...t.owner} : null, scene: String(t.scene ?? "").slice(0, 60), cost: Math.max(0, Math.round(n(t.cost))),
    faction: String(t.faction ?? "").slice(0, 60), place: String(t.place ?? "").slice(0, 160),
    // 0.31.0: recipes for food, drink, medicine and drugs (Library recipe-rules): the method, how many, how long the
    // result stands once made, its strength, and a train task that teaches a recipe
    recipe: String(t.recipe ?? "").slice(0, 40), batch: Math.max(1, Math.min(100, Math.round(n(t.batch) || 1))),
    wait: Math.max(0, Math.min(3650, Math.round(n(t.wait)))), waitWord: String(t.waitWord ?? "").slice(0, 40),
    strength: !!t.strength, impure: !!t.impure, leaves: strs(t.leaves), teaches: String(t.teaches ?? "").slice(0, 40),
    // 0.37.0: followers who help (WoDX NPC), and an errand a follower runs for its master
    helpers: strs(t.helpers).slice(0, 6), errand: String(t.errand ?? "").slice(0, 20), master: String(t.master ?? "").slice(0, 40)
  };
}

/* ------------------------------------------------------------------ */
/*  Recipes (Storyteller 0.20.0)                                       */
/* ------------------------------------------------------------------ */

/**
 * A long task can say what it needs, where, and what it makes. Each roll waits (the task pauses, with a note) while
 * the character does not carry what it needs, or the workshop does not exist yet in the chronicle's year. Finished,
 * the thing made goes to the character. The years are history, not the books: house figures (PENDING-REVIEW).
 */
export const WORKSHOPS = {
  "": {label: "Anywhere", from: null},
  forge: {label: "A forge or smithy", from: null},
  bench: {label: "A craftsman's bench (wood, leather, cloth)", from: null},
  still: {label: "A still or an alchemist's furnace", from: null},
  scriptorium: {label: "A scribe's desk, ink and parchment", from: null},
  chapel: {label: "A consecrated place", from: null},
  press: {label: "A printing press", from: 1450},
  laboratory: {label: "A chemist's laboratory", from: 1660},
  machine: {label: "A machine shop with lathes", from: 1800},
  darkroom: {label: "A photographer's darkroom", from: 1839},
  electronics: {label: "An electronics bench", from: 1920},
  computer: {label: "A computer and its software", from: 1975},
  fabricator: {label: "A fabricator (a 3D printer)", from: 2010},
  biolab: {label: "A gene lab", from: 2030},
  // 0.31.0: kits for recipes (Library data/recipes.mjs KIT_WORKSHOP)
  kitchen: {label: "A kitchen, or a pot over a fire", from: null},
  brewhouse: {label: "A brewhouse, or a big pot and a fire", from: null},
  apothecary: {label: "A herbalist's table", from: null},
  pharma: {label: "A pharmaceutical laboratory", from: 1900},
  printer: {label: "A food printer", from: 2040}
};

/** The lines of what a task needs, cleaned. */
export const needsOf = t => String(t?.needs ?? "").split(/\r?\n|;/).map(x => x.trim()).filter(Boolean).slice(0, 20);

/** Can the next roll be made? ctx: {year, carried: [item names]}. Returns {ok, why}. */
export function recipeCheck(task, {year = 0, carried = []} = {}) {
  const t = normTask(task);
  const w = WORKSHOPS[t.workshop];
  if ( w?.from && year && year < w.from ) return {ok: false, why: `there is no ${w.label.replace(/^an? /i, "").toLowerCase()} before about ${w.from}`};
  const have = (carried ?? []).map(x => String(x).toLowerCase());
  const missing = needsOf(t).filter(need => !have.some(h => h.includes(need.toLowerCase())));
  if ( missing.length ) return {ok: false, why: `needs ${missing.join(", ")}`};
  return {ok: true, why: ""};
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
    if ( t.total >= t.goal ) {
      // 0.27.0: a building moves to its next stage; only the last one finishes it
      if ( t.stages.length && t.stage < t.stages.length - 1 ) { t.stage += 1; t.goal = t.stages[t.stage].goal; t.total = 0; }
      else t.status = "done";
    }
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
  t.waits = "";
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

/**
 * 0.37.0 (B1610, house rule): followers helping on a long task. Each helper adds its own dots in the task's
 * Ability, at least one die, as workers do; V20 teamwork pools helpers' successes; WoDX adds dice instead. The
 * caller passes [{dots}] for the helpers still in the world.
 */
export function helperDice(helpers = []) {
  return (helpers ?? []).reduce((n, h) => n + Math.max(1, Math.trunc(Number(h?.dots) || 0)), 0);
}
