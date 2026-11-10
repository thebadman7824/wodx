/**
 * The end of the night and the session timer. No Foundry in this file.
 *
 *   Experience reasons: boxes for the Storyteller to tick, character by character. Nothing is awarded unless the
 *   Storyteller presses Award, and the amounts can be changed in the window. Each line has its core book's list, in
 *   this module's own words; a line whose book gives no list (V20 Dark Ages, Mummy, Kindred of the East) uses the V20
 *   list as a house rule. Pages are printed pages, with the pdf page after.
 *
 *   The timer runs on real time (the clock on the wall, not the game's): a planned end, breaks that pause it, and one
 *   warning a set number of minutes before the end.
 */

const R = (key, label, xp = 1, extra = {}) => ({key, label, xp, ...extra});
const THERE = R("there", "Took part in the session", 1, {auto: true});
const LEARNING = R("learning", "Learned something from what happened");
const ACTING = R("acting", "Played the character well");
const INSPIRED = R("inspired", "Inspired play (a second point for acting)");
const HEROISM = R("heroism", "Risked themselves for others");
const SUCCESS = R("success", "The group reached its goal");
const DANGER = R("danger", "Came through real danger");
const WISDOM = R("wisdom", "Found a clever answer, or one that will matter");

/** V20: 1 to 5 a session, more at a story's end (pp. 123-124, pdf 131-132). */
export const SESSION_REASONS = [THERE, LEARNING, ACTING, INSPIRED, HEROISM];
export const STORY_REASONS = [SUCCESS, DANGER, WISDOM];

const V20 = {session: SESSION_REASONS, story: STORY_REASONS, ref: "V20 pp. 123-124 (pdf 131-132): 1 to 5 points a session"};
const HOUSE = (book, ref) => ({...V20, ref: `${book} gives no list (${ref}); the V20 list is used as a house rule`});

/** Each line's own list. */
export const LINE_REASONS = {
  vampire: V20,
  ghoul: V20,
  revenant: V20,
  mortal: V20,
  werewolf: {session: [THERE, LEARNING, R("concept", "Played to the character's concept"), ACTING, HEROISM], story: STORY_REASONS,
    ref: "W20 pp. 243-244 (pdf 245-246): 1 to 5 a session, 1 to 3 more at a story's end"},
  mage: {session: [THERE, LEARNING, ACTING, R("focus", "Played to the mage's focus: paradigm, practice, instruments"), HEROISM],
    story: [SUCCESS, DANGER, WISDOM, R("drama", "Added to the story's drama")], ref: "M20 pp. 335-336 (pdf 336-337)"},
  wraith: {session: [THERE, LEARNING, ACTING, R("circle", "Worked with the circle"), HEROISM],
    story: [R("survival", "Came through the story"), SUCCESS, DANGER, WISDOM, R("shadow", "Shadow: as the Shadow's own experience rules say")],
    ref: "Wraith 20th pp. 301-302 (pdf 366-367)"},
  changeling: {session: [THERE, LEARNING, ACTING, HEROISM], story: STORY_REASONS, ref: "C20 p. 176 (pdf 177): 1 to 5 a session"},
  hunter: {session: [THERE, LEARNING, ACTING, HEROISM], story: STORY_REASONS, ref: "Hunter: The Reckoning p. 141 (pdf 142)"},
  demon: {session: [THERE, LEARNING, ACTING, HEROISM], story: STORY_REASONS, ref: "Demon: The Fallen p. 165 (pdf 166): up to 5 a session"},
  orpheus: {session: [THERE, LEARNING, ACTING, HEROISM], story: STORY_REASONS, ref: "Orpheus pp. 202-203 (pdf 203-204); the end of a chronicle adds three more"},
  mummy: HOUSE("Mummy Second Edition", "p. 70, pdf 71; Ba comes at each story's end, p. 112, pdf 113"),
  kote: HOUSE("Kindred of the East", "pdf 84")
};
/** In the Dark Ages, vampires use V20 Dark Ages, which leaves the amount to the Storyteller. */
export const DARK_AGES_VAMPIRE = HOUSE("V20 Dark Ages", "p. 185, pdf 186; no Trait rises more than one dot a story");

/** A line's list. early: a Dark Ages era. */
export function lineReasons(line, {early = false} = {}) {
  if ( early && (line === "vampire" || line === "ghoul") ) return DARK_AGES_VAMPIRE;
  return LINE_REASONS[line] ?? V20;
}
export const reasonsFor = (line, {story = false, early = false} = {}) => {
  const l = lineReasons(line, {early});
  return [...l.session, ...(story ? l.story : [])];
};
/** Every reason any of the lines uses, in a steady order, for the window's columns. */
export function columnsFor(lines = [], {story = false, early = false} = {}) {
  const out = new Map();
  for ( const line of (lines.length ? lines : ["vampire"]) ) for ( const r of reasonsFor(line, {story, early}) ) if ( !out.has(r.key) ) out.set(r.key, r);
  return [...out.values()];
}

/** The total for one character's ticked reasons (keys) and any extra points, never below 0. */
export function totalFor(ticked = [], reasons = SESSION_REASONS, extra = 0) {
  const set = new Set(ticked);
  const base = reasons.filter(r => set.has(r.key)).reduce((t, r) => t + (Number(r.xp) || 0), 0);
  return Math.max(0, base + (Math.round(Number(extra)) || 0));
}

/** A short note for the experience log: the reasons ticked, in order. */
export function noteFor(ticked = [], reasons = SESSION_REASONS, extra = 0) {
  const set = new Set(ticked);
  const names = reasons.filter(r => set.has(r.key)).map(r => r.label.toLowerCase());
  if ( extra ) names.push(`${extra > 0 ? "+" : ""}${extra} by the Storyteller`);
  return names.length ? `Session: ${names.join("; ")}` : "Session";
}

/** The wrap-up's steps, in order. have: which modules can do which step. */
export function steps(have = {}) {
  return [
    {key: "scene", label: "End the scene (scene-long effects end)", on: !!have.chronicle},
    {key: "factions", label: "Every faction takes its turn", on: !!have.npc},
    {key: "xp", label: "Experience for each character", on: !!have.creation},
    {key: "session", label: "Mark the end of the session (the report between sessions starts here)", on: true},
    {key: "timer", label: "Stop the session timer", on: true}
  ].filter(s => s.on);
}

/* ---- The session timer (real time, milliseconds) ---- */

export const blankTimer = () => ({start: null, end: null, paused: null, pausedFor: 0, warnAt: 30, warned: false});

export function normTimer(t = {}) {
  const n = v => (Number.isFinite(Number(v)) && v !== null ? Number(v) : null);
  return {start: n(t.start), end: n(t.end), paused: n(t.paused), pausedFor: Math.max(0, Number(t.pausedFor) || 0),
    warnAt: Math.max(0, Math.min(240, Math.round(Number(t.warnAt ?? 30)) || 0)), warned: !!t.warned};
}

/** Start a timer that ends after `minutes`, warning `warnAt` minutes before. */
export const startTimer = (nowMs, minutes, warnAt = 30) => normTimer({start: nowMs, end: nowMs + Math.max(1, Number(minutes) || 0) * 60000, warnAt});
/** Pause (a break) and go on: the end moves later by the length of the break. */
export const pauseTimer = (t, nowMs) => (t.start === null || t.paused !== null ? t : {...normTimer(t), paused: nowMs});
export function resumeTimer(t, nowMs) {
  const x = normTimer(t);
  if ( x.paused === null ) return x;
  const gap = Math.max(0, nowMs - x.paused);
  return {...x, paused: null, pausedFor: x.pausedFor + gap, end: x.end === null ? null : x.end + gap};
}

/** What the timer shows now: {running, paused, left (ms, may be negative), played (ms), warn (true once, when due)}. */
export function readTimer(t, nowMs) {
  const x = normTimer(t);
  if ( x.start === null ) return {running: false, paused: false, left: null, played: 0, warn: false, over: false};
  const at = x.paused ?? nowMs;
  const left = x.end === null ? null : x.end - at;
  const played = Math.max(0, at - x.start - x.pausedFor);
  const warn = !x.warned && left !== null && x.paused === null && left <= x.warnAt * 60000 && left > -60000;
  return {running: true, paused: x.paused !== null, left, played, warn, over: left !== null && left <= 0};
}

/** "1 h 05 min", "12 min", "4 min over". */
export function clockWords(ms) {
  if ( ms === null || ms === undefined ) return "no end set";
  const over = ms < 0, m = Math.round(Math.abs(ms) / 60000), h = Math.floor(m / 60), r = m % 60;
  const words = h ? `${h} h ${String(r).padStart(2, "0")} min` : `${r} min`;
  return over ? `${words} over` : words;
}
