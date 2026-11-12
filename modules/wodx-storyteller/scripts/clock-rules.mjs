/**
 * WoDX Storyteller 0.41.0: progress clocks, the pure part. No Foundry calls here (B1710-B1713).
 *
 * A clock is a circle cut into segments that fill as something comes nearer: long work, heat on a hunting ground,
 * a faction's plan, a tie that needs tending. Most clocks are read from numbers WoDX already keeps and change only
 * when those numbers do:
 *   task       a long task: successes so far of the goal (WoDX Storyteller long tasks)
 *   heat       heat on a hunting ground, of 10 (WoDX Storyteller upkeep)
 *   objective  a Ledger objective: steps done of all its steps
 *   tie        a tie that needs tending (a Fetter, a Passion, a herd, a domain): days since it was last tended of how
 *              often it needs it, shown once half the time has gone
 *   due        an open oath, debt, boon or consequence with a due date: time gone from when it was made to when it is due
 * The Storyteller also makes clocks of their own (kind "own"), for a faction's plan or a hunter closing in, and fills
 * them by hand or lets them tick by themselves on each faction turn, each session's end or each week of game time.
 *
 * Players see only the clocks the Storyteller shows them. A shown clock can be for everyone or for some characters.
 * Stored in the world setting wodx-storyteller.clocks: {v, own: [clock], shown: {"<derived id>": [actor ids] | true}}.
 */

export const CLOCKS_VERSION = 1;
export const SEGMENTS = [4, 6, 8, 10, 12];
export const TICKS = {none: "By hand only", faction: "Each faction turn", session: "Each session's end", week: "Each week of game time"};
export const KINDS = {task: "Long task", heat: "Heat", tie: "A tie to tend", objective: "Objective", due: "Comes due", own: "The Storyteller's"};
const WEEK = 7 * 86400;

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const ids = v => (Array.isArray(v) ? [...new Set(v.map(String).filter(Boolean))] : []);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const blankClocks = () => ({v: CLOCKS_VERSION, own: [], shown: {}});

/** A clean clock of the Storyteller's own. */
export function normClock(c = {}) {
  const segments = SEGMENTS.includes(Number(c.segments)) ? Number(c.segments) : 6;
  return {
    id: String(c.id ?? "").slice(0, 40) || Math.random().toString(36).slice(2, 12),
    kind: "own",
    name: String(c.name ?? "").trim().slice(0, 120) || "A clock",
    segments, filled: clamp(Math.round(n(c.filled)), 0, segments),
    tick: TICKS[c.tick] ? c.tick : "none",
    last: Number.isFinite(Number(c.last)) && c.last !== null ? Number(c.last) : null,
    faction: String(c.faction ?? "").slice(0, 120),
    note: String(c.note ?? "").slice(0, 500),
    // who sees it: false (the Storyteller only), true (everyone), or a list of actor ids
    shown: c.shown === true ? true : Array.isArray(c.shown) && c.shown.length ? ids(c.shown) : false
  };
}

export function normClocks(s) {
  const o = s && typeof s === "object" ? s : {};
  const shown = {};
  for ( const [k, v] of Object.entries(o.shown ?? {}) ) {
    if ( v === true ) shown[k] = true;
    else if ( Array.isArray(v) && v.length ) shown[k] = ids(v);
  }
  return {v: CLOCKS_VERSION, own: (Array.isArray(o.own) ? o.own : []).filter(c => c && typeof c === "object").map(normClock), shown};
}

/* ------------------------------------------------------------------ */
/*  Clocks read from other records                                     */
/* ------------------------------------------------------------------ */

/** The segments for a goal: the goal itself when it is small, else 8 (the fill is scaled). */
const segsFor = goal => (goal >= 2 && goal <= 12 ? goal : 8);
const scaled = (have, of, segs) => (of > 0 ? clamp(Math.floor((have / of) * segs), 0, segs) : 0);

/** Long tasks still running: `tasks` [{actorId, actorName, task}]; a task the actor's player can see. */
export function taskClocks(tasks = []) {
  return tasks.filter(x => x?.task && ["open", "paused"].includes(x.task.status)).map(({actorId, actorName, task}) => {
    const goal = Math.max(1, n(task.goal)), segments = segsFor(goal);
    return {id: `task:${actorId}:${task.id}`, kind: "task", name: `${actorName}: ${task.name}`, segments,
      filled: scaled(n(task.total), goal, segments), note: `${n(task.total)} of ${goal} successes${task.status === "paused" ? ", paused" : ""}.`, for: [String(actorId)]};
  });
}

/** Hunting grounds with heat: `places` [{id, name, heat}] with the heat already cooled to now. */
export function heatClocks(places = [], max = 10) {
  return places.filter(p => n(p?.heat) > 0).map(p => ({id: `heat:${p.id}`, kind: "heat", name: `Heat: ${p.name}`, segments: max,
    filled: clamp(Math.round(n(p.heat)), 0, max), note: p.band ? `${p.band}.` : "", for: []}));
}

/** Ledger entries: open objectives by their steps; open entries with a due date by the time gone. */
export function ledgerClocks(entries = [], now = 0) {
  const out = [];
  const name = p => (p && typeof p === "object" ? p.name : p) || "";
  for ( const e of entries ) {
    if ( !e?.id || e.status !== "open" ) continue;
    const who = [name(e.from), name(e.to)].filter(Boolean).join(" to ");
    const label = String(e.what ?? "").split(/[.:]/)[0].trim().slice(0, 80) || e.kind;
    if ( e.kind === "objective" && Array.isArray(e.steps) && e.steps.length ) {
      const done = e.steps.filter(s => s?.done).length;
      out.push({id: `objective:${e.id}`, kind: "objective", name: `Objective: ${label}`, segments: clamp(e.steps.length, 2, 12),
        filled: e.steps.length > 12 ? scaled(done, e.steps.length, 12) : done, note: `${done} of ${e.steps.length} steps.`, for: []});
    } else if ( Number.isFinite(Number(e.due)) && e.due !== null && Number.isFinite(Number(e.made)) && Number(e.due) > Number(e.made) ) {
      const span = Number(e.due) - Number(e.made), gone = clamp(n(now) - Number(e.made), 0, span);
      out.push({id: `due:${e.id}`, kind: "due", name: `Comes due: ${label}${who ? ` (${who})` : ""}`, segments: 6,
        filled: scaled(gone, span, 6), note: gone >= span ? "Due now." : "", for: []});
    }
  }
  return out;
}

/** Ties that need tending: `ties` [{actorId, actorName, tie}] with tie {key, name, every (days), last, off}. */
export function tieClocks(ties = [], now = 0) {
  const out = [];
  for ( const {actorId, actorName, tie} of ties ) {
    if ( !tie || tie.off || !Number.isFinite(Number(tie.last)) || !(n(tie.every) > 0) ) continue;
    const span = n(tie.every) * 86400, gone = clamp(n(now) - Number(tie.last), 0, span);
    if ( gone < span / 2 ) continue;
    out.push({id: `tie:${actorId}:${tie.key}`, kind: "tie", name: `${actorName}: ${tie.name}`, segments: 6, filled: scaled(gone, span, 6),
      note: gone >= span ? "Needs tending now." : `Needs tending every ${n(tie.every)} days.`, for: [String(actorId)]});
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Seeing and ticking                                                 */
/* ------------------------------------------------------------------ */

/** Every clock, with who sees it: own clocks carry their own `shown`; read ones take it from `state.shown`. */
export function allClocks(state, derived = []) {
  const s = normClocks(state);
  return [...derived.map(c => ({...c, shown: s.shown[c.id] ?? false})), ...s.own];
}

/** Can a player whose characters are `actorIds` see this clock? */
export function canSee(clock, actorIds = []) {
  if ( clock.shown === true ) return true;
  if ( !Array.isArray(clock.shown) ) return false;
  return clock.shown.some(id => actorIds.includes(id));
}

/** The clocks a player sees. */
export const playerClocks = (clocks, actorIds) => clocks.filter(c => canSee(c, actorIds));

/** Fill or empty an own clock by `by` segments. Returns {state, clock, full} (full: it just filled). */
export function step(state, id, by = 1) {
  const s = normClocks(state);
  const c = s.own.find(x => x.id === id);
  if ( !c ) return {state: s, clock: null, full: false};
  const was = c.filled;
  c.filled = clamp(was + Math.round(n(by)), 0, c.segments);
  return {state: s, clock: c, full: was < c.segments && c.filled === c.segments};
}

/**
 * Tick every own clock set to tick on `on` ("faction", "session" or "week"). For "week", one segment per full week
 * since the clock last ticked (it starts counting the first time it is seen). Returns {state, filled: [clocks that
 * just filled], changed}.
 */
export function tickAll(state, on, now = 0) {
  const s = normClocks(state);
  const filled = [];
  let changed = false;
  for ( const c of s.own ) {
    if ( c.tick !== on || c.filled >= c.segments ) continue;
    let by = 1;
    if ( on === "week" ) {
      if ( c.last === null ) { c.last = n(now); changed = true; continue; }
      by = Math.floor((n(now) - c.last) / WEEK);
      if ( by <= 0 ) {
        // The clock went back: count from now
        if ( n(now) < c.last ) { c.last = n(now); changed = true; }
        continue;
      }
      c.last += by * WEEK;
    }
    const was = c.filled;
    c.filled = clamp(was + by, 0, c.segments);
    changed = true;
    if ( c.filled === c.segments ) filled.push(c);
  }
  return {state: s, filled, changed};
}

/** A clock as an SVG circle in segments, filled ones shaded. Size in pixels. */
export function clockSVG(clock, size = 40) {
  const segs = Math.max(2, clock.segments), r = size / 2 - 2, cx = size / 2, cy = size / 2;
  const pt = a => [cx + r * Math.sin(a), cy - r * Math.cos(a)].map(v => v.toFixed(2)).join(" ");
  const parts = [];
  for ( let i = 0; i < segs; i++ ) {
    const a0 = (i / segs) * 2 * Math.PI, a1 = ((i + 1) / segs) * 2 * Math.PI;
    parts.push(`<path d="M ${cx} ${cy} L ${pt(a0)} A ${r} ${r} 0 0 1 ${pt(a1)} Z" class="${i < clock.filled ? "on" : "off"}"/>`);
  }
  const label = `${clock.filled} of ${clock.segments}`;
  return `<svg class="wst-clock" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label}"><title>${label}</title>${parts.join("")}</svg>`;
}
