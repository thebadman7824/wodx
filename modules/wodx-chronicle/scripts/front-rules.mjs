/**
 * Book one's fronts, roles and clue carriers (B4910-B4919): when a front takes its next step, what holds or turns it
 * back, who plays each role as people fall, and how the clues add up. Pure, so the harness can test it; pod.mjs keeps
 * the state, draws the sights and shows the window.
 *
 * State: {fronts: {<key>: {at, last, held, pushed, slipped}}, start, gone: {<name>: true}, trust: {<name>: n},
 *   chosen: {<role>: name}, judged: {<key>: choice}, told: [<judgement:choice>], clues: {<key>: [carrier index]},
 *   courier: {rider, stopped}}.
 * Context: {now, played: [chapter keys], twists: the twist web's state}.
 */
import {FRONTS, JUDGEMENTS, ROLES, COURIER_GAP, CLUES, CHAPTERS, WEEK, DAY} from "../data/fronts-rothenstein.mjs";
export {FRONTS, JUDGEMENTS, ROLES, COURIER_GAP, CLUES, CHAPTERS, WEEK, DAY};

export const frontOf = k => FRONTS.find(f => f.key === k) ?? null;
export const roleOf = k => ROLES.find(r => r.key === k) ?? null;
export const clueOf = k => CLUES.find(c => c.key === k) ?? null;
export const judgementOf = k => JUDGEMENTS.find(j => j.key === k) ?? null;
const idx = k => CHAPTERS.indexOf(k);
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** The chapter the company is in: the first one not yet played. */
export const chapterNow = (played = []) => CHAPTERS.find(k => !played.includes(k)) ?? null;
/** Has chapter k begun (it is now, or played)? */
export const begun = (k, played = []) => { const now = chapterNow(played); return now === null || idx(k) <= idx(now); };

/** A clean state, every front at its start. */
export function normState(s = {}, now = 0) {
  const out = {fronts: {}, start: s.start ?? now, gone: {...(s.gone ?? {})}, trust: {...(s.trust ?? {})}, chosen: {...(s.chosen ?? {})},
    judged: {...(s.judged ?? {})}, told: [...(s.told ?? [])], clues: {}, courier: {rider: num(s.courier?.rider) || 1, stopped: s.courier?.stopped ?? null}};
  for ( const f of FRONTS ) {
    const o = s.fronts?.[f.key] ?? {};
    // A front's first step is due at once (its chapter still gates it)
    out.fronts[f.key] = {at: Math.max(0, Math.min(f.steps.length, num(o.at))), last: o.last ?? num(out.start) - f.every * DAY, held: !!o.held, pushed: !!o.pushed, slipped: o.slipped ?? null};
  }
  for ( const c of CLUES ) out.clues[c.key] = [...new Set((s.clues?.[c.key] ?? []).map(Number).filter(i => i >= 0 && i < c.carriers.length))].sort();
  return out;
}

/** The step a front takes next, or null when it has none left. */
export const nextStep = (st, k) => { const f = frontOf(k), at = st.fronts?.[k]?.at ?? 0; return f?.steps[at] ?? null; };
/** The step a front stands on (its last one taken), or null before its first. */
export const stepNow = (st, k) => { const f = frontOf(k), at = st.fronts?.[k]?.at ?? 0; return at > 0 ? f?.steps[at - 1] ?? null : null; };

/** Was a twist revealed in the week before `now`? */
export function twistWeek(twists = {}, now = 0) {
  const last = twists?.last;
  return last !== undefined && last !== null && Number.isFinite(Number(last)) && num(now) - Number(last) < WEEK && num(now) >= Number(last);
}

/**
 * Why front k does not take its next step now, or "" when it does. A front waits for its pace, for its step's chapter,
 * while held, and in a twist's week unless pushed (or it already gave way to one twist; no front waits twice running).
 */
export function whyNot(st, k, ctx = {}) {
  const f = frontOf(k), o = st.fronts?.[k];
  if ( !f || !o ) return "There is no such front.";
  const n = nextStep(st, k);
  if ( !n ) return "It has taken every step.";
  if ( o.held ) return "Held.";
  const played = ctx.played ?? [];
  if ( !begun(n.from, played) ) return `Its next step waits for chapter ${idx(n.from) + 1}.`;
  const gap = num(ctx.now) - num(o.last), every = f.every * DAY;
  if ( !o.pushed && gap < every ) { const d = Math.ceil((every - gap) / DAY); return `Next step in ${d} ${d === 1 ? "day" : "days"}.`; }
  // It gives way to one twist; a front that already waited for an earlier twist is not held up by the next
  const gaveWay = o.slipped !== null && o.slipped !== undefined && Number(o.slipped) !== Number(ctx.twists?.last);
  if ( !o.pushed && !gaveWay && twistWeek(ctx.twists, ctx.now) ) return "A twist came this week; it waits a week.";
  return "";
}

/** Every front that steps now. */
export const dueFronts = (st, ctx = {}) => FRONTS.map(f => f.key).filter(k => !whyNot(st, k, ctx));

/**
 * The fronts that a tick keeps waiting for a twist: each notes the twist it gave way to, so the next twist does not
 * hold it up again before it has stepped. Returns a new state.
 */
export function slip(st, ctx = {}) {
  const out = normState(st);
  for ( const f of FRONTS ) if ( whyNot(out, f.key, ctx).startsWith("A twist") ) out.fronts[f.key].slipped ??= Number(ctx.twists?.last);
  return out;
}

/** Take front k's next step: a new state and the step. Throws with the reason when it cannot (force skips the pace). */
export function step(st, k, {now = 0, played = [], twists = {}, force = false} = {}) {
  const why = whyNot(st, k, {now, played, twists});
  const n = nextStep(st, k);
  if ( why && !(force && n && why !== "Held.") ) throw new Error(why);
  const out = normState(st);
  const o = out.fronts[k], f = frontOf(k);
  o.at += 1;
  // The pace counts from when the step was due, so a long skip still brings the steps one after another (one a tick)
  o.last = force || o.pushed || why ? num(now) : num(o.last) + f.every * DAY;
  if ( num(now) - o.last > 4 * f.every * DAY ) o.last = num(now) - f.every * DAY;
  o.pushed = false; o.slipped = null;
  return {state: out, step: n};
}

/** The company holds a front (a bribe, a threat, an ally inside), or the Storyteller does: it waits until let go. */
export function hold(st, k, on = true, now = 0) {
  const out = normState(st);
  if ( !out.fronts[k] ) return out;
  out.fronts[k].held = !!on;
  if ( !on ) out.fronts[k].last = num(now);
  return out;
}
/** The company strikes a front (a key person gone, a ledger taken): it goes back one step and its pace starts again. */
export function strike(st, k, now = 0) {
  const out = normState(st);
  const o = out.fronts[k];
  if ( !o ) return out;
  o.at = Math.max(0, o.at - 1);
  o.last = num(now);
  o.slipped = null;
  return out;
}
/** The company pushed a front (forced its hand): it steps at the next tick, twist or not. */
export function push(st, k) {
  const out = normState(st);
  if ( out.fronts[k] ) out.fronts[k].pushed = true;
  return out;
}

/* ---- roles ---- */

/** Is a name out of the story (dead, fled, turned away)? A twist's heart can take a role's first holder out. */
export function isGone(st, name, twists = {}) {
  if ( st.gone?.[name] ) return true;
  for ( const r of ROLES ) if ( r.twist && r.line[0] === name && twists?.revealed?.[r.twist.n]?.variant === r.twist.variant ) return true;
  return false;
}

/** Who plays role k now. The Storyteller's choice wins; otherwise the line's first who is not gone (or most trusted). */
export function holderOf(st, k, twists = {}) {
  const r = roleOf(k);
  if ( !r ) return null;
  const chosen = st.chosen?.[k];
  if ( chosen ) return chosen;
  const open = r.line.filter(n => !isGone(st, n, twists));
  if ( r.courier ) return `${r.line[0]} (rider ${num(st.courier?.rider) || 1})`;
  if ( !open.length ) return r.lasts ? r.line[r.line.length - 1] : null;
  if ( r.pick === "trust" ) {
    const best = Math.max(...open.map(n => num(st.trust?.[n])));
    return open.find(n => num(st.trust?.[n]) === best);
  }
  return open[0];
}
/** Every role and its holder. */
export const holders = (st, twists = {}) => Object.fromEntries(ROLES.map(r => [r.key, holderOf(st, r.key, twists)]));

/** Words with @role in them, the role's holder put in. */
export const fill = (text, st, twists = {}) => String(text ?? "").replace(/@(\w+)/g, (m, k) => (roleOf(k) ? holderOf(st, k, twists) ?? "nobody" : k === "company" ? "where the company is" : m));

/** Mark a name gone (or back). */
export function setGone(st, name, on = true) {
  const out = normState(st);
  if ( on ) out.gone[name] = true; else delete out.gone[name];
  return out;
}
/** The company leaned on a contact once more. */
export function lean(st, name, by = 1) {
  const out = normState(st);
  out.trust[name] = Math.max(0, num(out.trust[name]) + by);
  return out;
}
/** The Storyteller puts someone in a role (empty: back to the line). */
export function choose(st, k, name = "") {
  const out = normState(st);
  if ( name ) out.chosen[k] = String(name); else delete out.chosen[k];
  return out;
}
/** The courier was stopped: the next rider goes a week later. */
export function stopCourier(st, now = 0) {
  const out = normState(st);
  out.courier.stopped = num(now);
  return out;
}
/** Is the next courier due to ride? Returns the new state when it is, else null. */
export function courierRides(st, now = 0) {
  if ( st.courier?.stopped === null || st.courier?.stopped === undefined ) return null;
  if ( num(now) - num(st.courier.stopped) < COURIER_GAP ) return null;
  const out = normState(st);
  out.courier = {rider: out.courier.rider + 1, stopped: null};
  return out;
}

/* ---- judgements ---- */

/** Mark a judgement (empty: not yet judged). */
export function judge(st, k, choice = "") {
  const out = normState(st), j = judgementOf(k);
  if ( !j || (choice && !j.choices[choice]) ) return out;
  if ( choice ) out.judged[k] = choice; else delete out.judged[k];
  return out;
}
/** The judgements whose chapter has come and whose card has not gone yet: [{key, choice, ...}]. */
export function judgementsDue(st, played = []) {
  const out = [];
  for ( const j of JUDGEMENTS ) {
    const c = st.judged?.[j.key], ch = c && j.choices[c];
    if ( ch && begun(ch.chapter, played) && !(st.told ?? []).includes(`${j.key}:${c}`) ) out.push({key: j.key, choice: c, label: j.label, ...ch});
  }
  return out;
}
export function told(st, key, choice) {
  const out = normState(st);
  if ( !out.told.includes(`${key}:${choice}`) ) out.told.push(`${key}:${choice}`);
  return out;
}

/* ---- clues ---- */

/** A carrier found: the new state, and whether it is new and whether it completes the fact. */
export function find(st, k, i) {
  const c = clueOf(k);
  if ( !c || !c.carriers[i] ) throw new Error("There is no such carrier.");
  const out = normState(st);
  const was = out.clues[k];
  const fresh = !was.includes(Number(i));
  out.clues[k] = [...new Set([...was, Number(i)])].sort();
  return {state: out, fresh, whole: fresh && out.clues[k].length === c.carriers.length, carrier: c.carriers[i], clue: c};
}
/** Take a carrier back. */
export function unfind(st, k, i) {
  const out = normState(st);
  if ( out.clues[k] ) out.clues[k] = out.clues[k].filter(n => n !== Number(i));
  return out;
}
/** The card a carrier pins on the case board, and the one the third carrier pins. */
export function carrierCard(k, i) {
  const c = clueOf(k), car = c?.carriers[i];
  if ( !car ) return null;
  return {kind: car.kind === "thing" ? "clue" : car.kind, ref: `wodx-front-clue:${k}:${i}`, title: car.label, text: c.hint};
}
export function wholeCard(k) {
  const c = clueOf(k);
  return c ? {kind: "note", ref: `wodx-front-clue:${k}:whole`, title: c.label, text: c.whole} : null;
}

/* ---- sights ---- */

/** The scene for a sight: a walkable map whose name holds the hint, before a session's or a trial's copy. */
export function pickScene(names = [], hint = "") {
  if ( !hint || hint === "@company" ) return null;
  const h = hint.toLowerCase(), skip = /^(sessio|encounter|landing|prototype|gate)\b|trial|⚔/i;
  const hits = names.filter(n => String(n).toLowerCase().includes(h));
  return hits.find(n => !skip.test(n)) ?? hits[0] ?? null;
}

/** A small seeded random, so a sight draws the same each time. */
function rand(seed) {
  let h = 2166136261;
  for ( const ch of String(seed) ) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}
/**
 * The looks for a sight on a scene: rect {x, y, width, height}. Each look spec becomes `spots` looks at {x, y, radius},
 * in a row when `line`; spots 0 is a scene-wide look (a quake, a wash). Shapes for the town-looks layer.
 */
export function sightLooks(sight, rect, seed = "") {
  const out = [], R = rand(seed), short = Math.max(1, Math.min(rect.width, rect.height));
  for ( const [j, l] of (sight?.looks ?? []).entries() ) {
    const base = {kind: l.kind, ...(l.mark ? {mark: l.mark} : {}), ...(l.text ? {text: l.text} : {}), ...(l.color ? {color: l.color} : {})};
    const n = num(l.spots);
    if ( n <= 0 ) { out.push(base); continue; }
    const radius = Math.max(20, Math.round(short * (l.r || 0.05)));
    const pad = radius + short * 0.08;
    if ( l.line ) {
      const y = rect.y + pad + R() * Math.max(1, rect.height - 2 * pad), x0 = rect.x + pad + R() * rect.width * 0.2, gap = radius * 2.4;
      for ( let q = 0; q < n; q++ ) out.push({...base, at: {x: Math.round(Math.min(rect.x + rect.width - pad, x0 + q * gap)), y: Math.round(y), radius}});
    } else for ( let q = 0; q < n; q++ ) {
      out.push({...base, at: {x: Math.round(rect.x + pad + R() * Math.max(1, rect.width - 2 * pad)), y: Math.round(rect.y + pad + R() * Math.max(1, rect.height - 2 * pad)), radius}});
    }
    void j;
  }
  return out;
}

/* ---- checks ---- */

/** The data checks: chapters exist, roles named by @ exist, every clue has a person, a place and a thing. */
export function validate() {
  const out = [];
  const roleRef = t => [...String(t ?? "").matchAll(/@(\w+)/g)].map(m => m[1]).filter(k => k !== "company" && !roleOf(k));
  for ( const f of FRONTS ) {
    if ( !(f.every > 0) ) out.push(`The front ${f.key} has no pace.`);
    let last = -1;
    for ( const s of f.steps ) {
      if ( !CHAPTERS.includes(s.from) ) out.push(`${f.key}.${s.key} names an unknown chapter.`);
      if ( idx(s.from) < last ) out.push(`${f.key}.${s.key} comes before the step ahead of it.`);
      last = Math.max(last, idx(s.from));
      if ( !s.sight?.scene || !s.sight.looks?.length ) out.push(`${f.key}.${s.key} has nothing to show on the map.`);
      if ( !s.talk ) out.push(`${f.key}.${s.key} has no street talk.`);
      for ( const p of [...(s.people ?? []), s.place] ) for ( const k of roleRef(p) ) out.push(`${f.key}.${s.key} names a role ${k} that is not there.`);
    }
  }
  for ( const j of JUDGEMENTS ) for ( const [c, v] of Object.entries(j.choices) ) {
    if ( !CHAPTERS.includes(v.chapter) ) out.push(`${j.key}.${c} names an unknown chapter.`);
    for ( const k of roleRef(v.text) ) out.push(`${j.key}.${c} names a role ${k} that is not there.`);
  }
  for ( const c of CLUES ) {
    const kinds = c.carriers.map(x => x.kind).sort().join(",");
    if ( kinds !== "person,place,thing" ) out.push(`The clue ${c.key} needs a person, a place and a thing.`);
  }
  return out;
}
