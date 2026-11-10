/**
 * The end of the night and the session timer. No Foundry in this file.
 *
 *   Experience reasons: boxes for the Storyteller to tick, character by character. Nothing is awarded unless the
 *   Storyteller presses Award, and the amounts can be changed in the window. The reasons follow the Revised and V20
 *   pattern (a point for being there, then points for learning, acting, heroism; at a story's end success, danger
 *   and wisdom). Each line's own list replaces this once its book pages are checked.
 *
 *   The timer runs on real time (the clock on the wall, not the game's): a planned end, breaks that pause it, and one
 *   warning a set number of minutes before the end.
 */

export const SESSION_REASONS = [
  {key: "there", label: "Took part in the session", xp: 1, auto: true},
  {key: "learning", label: "Learned something from what happened", xp: 1},
  {key: "acting", label: "Played the character well: Nature, Demeanor, the line's Morality", xp: 1},
  {key: "heroism", label: "Risked something real for others or for the story", xp: 1}
];
export const STORY_REASONS = [
  {key: "success", label: "The coterie reached its goal", xp: 1},
  {key: "danger", label: "Survived real danger", xp: 1},
  {key: "wisdom", label: "Found a clever answer, or one that will matter", xp: 1}
];
/** Each line's reasons; the shared list until the line's pages are checked. */
export const LINE_REASONS = {};
export const reasonsFor = (line, {story = false} = {}) => [...(LINE_REASONS[line]?.session ?? SESSION_REASONS), ...(story ? (LINE_REASONS[line]?.story ?? STORY_REASONS) : [])];

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
