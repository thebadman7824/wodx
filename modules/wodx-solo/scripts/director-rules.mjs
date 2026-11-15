/**
 * WoDX Solo: step 4 of The Lone Chronicle (B6045 to B6049): the director, experience from the night's log, and the
 * morning recap. Pure rules, no Foundry, so the harness can test them; director.mjs does the Foundry side.
 *
 *   The director    once each night, at dusk on the seat, it looks at what is already live for the character (their
 *                   flaws and merits that pull trouble, a storyline's next beat, open oaths and debts, the chronicle's
 *                   clocks, the rumours going round) and brings one or two of them, paced like a Storyteller would:
 *                   pressure after quiet nights, a rest after hard ones, scaled by the character's trouble dial
 *   Experience      at dawn, for the night just gone, from the line's own list in the book (WoDX Storyteller
 *                   wrapup-rules.mjs), using only what the log shows: the character was there, met real danger,
 *                   learned something (the oracle, a sign, a new place), or closed a lead (an oath kept, a debt paid)
 *   The recap       the first time the player is back after a night: that night as the character knows it, from the
 *                   entries about the character, never the seat's own log
 */
import {DAY} from "../../wodx-chronicle/scripts/terms.mjs";
import {pastNights, hardness, nightOf} from "../../wodx-storyteller/scripts/pacing-rules.mjs";

export {nightOf};

/* ------------------------------------------------------------------ */
/*  The director (B6045, B6046)                                        */
/* ------------------------------------------------------------------ */

/** How the director leans tonight. */
export const TEMPERS = {
  rest: {label: "A rest", count: 1, heavy: false},
  steady: {label: "Steady", count: 1, heavy: true},
  pressure: {label: "Pressure", count: 2, heavy: true}
};

/**
 * The temper from the character's last nights in the log: a hard night just past, or three hard of the last four,
 * is a rest; two quiet nights in a row or more is pressure; else steady. entries: the Storyteller's log, already only
 * those about the character (and the fights, which carry no character).
 */
export function temperOf(entries = [], now = 0) {
  const nights = pastNights(entries, now, 4);
  const hardOfFour = nights.filter(n => n.hard.length).length;
  if ( nights[0]?.hard.length || hardOfFour >= 3 ) return "rest";
  let quiet = 0;
  for ( const n of nights ) { if ( n.hard.length ) break; quiet++; }
  return quiet >= 2 ? "pressure" : "steady";
}

/** How many things the director brings: the temper's count, one fewer on a Quiet dial, one more on Often; 1 to 3. */
export function howMany(temper, dial = 1) {
  const base = TEMPERS[temper]?.count ?? 1;
  const d = Number(dial) || 1;
  const n = d < 1 ? base - 1 : d > 1 ? base + 1 : base;
  return Math.max(1, Math.min(3, n));
}

/** Things brought in the last few nights are not brought again until this many nights have passed. */
export const AGAIN_NIGHTS = 3;
export const BROUGHT_KEEP = 60;

/**
 * Pick tonight's things. things: [{key, kind, title, text, heavy, weight}]; brought: [{key, night}]; rand: () => [0, 1).
 * A rest takes no heavy thing while a light one is left. Each kind at most once, unless nothing else is left.
 * -> the picked things, in order
 */
export function pickThings({things = [], temper = "steady", count = 1, brought = [], night = 0, rand = Math.random} = {}) {
  const recent = new Set((brought ?? []).filter(b => night - (Number(b.night) || 0) < AGAIN_NIGHTS).map(b => b.key));
  let pool = things.filter(t => t?.key && !recent.has(t.key));
  if ( !TEMPERS[temper]?.heavy && pool.some(t => !t.heavy) ) pool = pool.filter(t => !t.heavy);
  const out = [];
  while ( out.length < count && pool.length ) {
    const kinds = new Set(out.map(t => t.kind));
    const fresh = pool.filter(t => !kinds.has(t.kind));
    const from = fresh.length ? fresh : pool;
    // pressure leans heavy, the rest lean light
    const w = t => Math.max(0.01, Number(t.weight) || 1) * (temper === "pressure" && t.heavy ? 2 : 1);
    const total = from.reduce((s, t) => s + w(t), 0);
    let r = rand() * total, pick = from[from.length - 1];
    for ( const t of from ) { r -= w(t); if ( r < 0 ) { pick = t; break; } }
    out.push(pick);
    pool = pool.filter(t => t !== pick);
  }
  return out;
}

/** Note what was brought. */
export function addBrought(list = [], picked = [], night = 0) {
  const keep = (list ?? []).filter(b => !picked.some(p => p.key === b.key));
  return [...keep, ...picked.map(p => ({key: p.key, night}))].slice(-BROUGHT_KEEP);
}

/** The director's things from the open Ledger: an oath the character swore, a debt or boon owed, an objective. */
export function ledgerThings(ledger = [], me = {}) {
  const mine = x => !!x && ((me.id && x.id === me.id) || (!x.id && me.name && String(x.name ?? "").trim().toLowerCase() === String(me.name).trim().toLowerCase()));
  const out = [];
  for ( const e of ledger ?? [] ) {
    if ( e?.status !== "open" ) continue;
    const from = mine(e.from), to = mine(e.to);
    if ( !from && !to ) continue;
    const other = (from ? e.to?.name : e.from?.name) || "someone";
    if ( e.kind === "oath" && from ) out.push({key: `ledger:${e.id}`, kind: "ledger", heavy: false, title: `An oath to ${other}`, text: `${other} will want to know the oath${e.what ? ` (${e.what})` : ""} is being kept.`});
    else if ( (e.kind === "debt" || e.kind === "boon") && from ) out.push({key: `ledger:${e.id}`, kind: "ledger", heavy: true, title: `${other} calls in what is owed`, text: `Word comes from ${other}: the ${e.kind}${e.what ? ` (${e.what})` : ""} is due.`});
    else if ( (e.kind === "debt" || e.kind === "boon") && to ) out.push({key: `ledger:${e.id}`, kind: "ledger", heavy: false, title: `${other} owes you`, text: `${other} is near tonight, and still owes you${e.what ? `: ${e.what}` : ""}.`});
    else if ( e.kind === "objective" && from ) {
      const next = (e.steps ?? []).find(s => !s.done);
      if ( next ) out.push({key: `ledger:${e.id}:${next.text}`, kind: "ledger", heavy: false, title: e.what || "An aim", text: `A way to the next step shows itself: ${next.text}.`});
    }
  }
  return out;
}

/**
 * The director's things from the chronicle's clocks the player may see (WoDX Storyteller clock-rules.mjs): the
 * Storyteller's own clocks only, as only they can be moved. One that is near full is a heavy thing.
 */
export function clockThings(clocks = []) {
  return (clocks ?? []).filter(c => c?.id && c.kind === "own" && Number(c.segments) > 0 && Number(c.filled) < Number(c.segments)).map(c => {
    const left = Number(c.segments) - Number(c.filled) - 1;
    return {key: `clock:${c.id}:${c.filled}`, kind: "clock", heavy: left <= 1, weight: left <= 1 ? 2 : 1, clockId: c.id,
      title: c.name || "A clock", text: left <= 0 ? `${c.name || "Something"} comes to a head tonight.` : `${c.name || "Something"} moves a step closer; ${left} to go.`};
  });
}

/* ------------------------------------------------------------------ */
/*  Experience at dawn (B6047, B6048)                                  */
/* ------------------------------------------------------------------ */

/** The most the director's award gives for one night (V20's 1 to 5 a session). */
export const XP_NIGHT_MAX = 5;

/** The night's window: [start, end) in world seconds, noon to noon (WoDX Storyteller pacing). */
// B6183: a night runs noon to noon, as terms.nightIndex counts it
export const nightWindow = night => ({start: (Number(night) * DAY) + DAY / 2, end: ((Number(night) + 1) * DAY) + DAY / 2});

/**
 * What the log shows the character did in a night. entries: the Storyteller's log; me: {id, name}; asked: the
 * oracle's record; ledger; seen: place names visited before this night. -> {there, danger, learning, success, why}
 */
export function nightDeeds({entries = [], me = {}, asked = [], ledger = [], night = 0, seenBefore = []} = {}) {
  const {start, end} = nightWindow(night);
  const inNight = at => (Number(at) || 0) >= start && (Number(at) || 0) < end;
  const own = (entries ?? []).filter(e => e && inNight(e.at) && e.actor === me.id);
  const fights = (entries ?? []).filter(e => e && inNight(e.at) && !e.actor && hardness(e) === "a fight");
  const why = {};
  const there = own.length > 0 || (asked ?? []).some(a => a.actorId === me.id && inNight(a.at));
  if ( there ) why.there = "was out in the night";
  const hard = [...own, ...(own.length ? fights : [])].map(hardness).filter(Boolean);
  if ( hard.length ) why.danger = hard[0];
  const before = new Set((seenBefore ?? []).map(String));
  const newPlace = own.find(e => e.kind === "travel" && e.place && !before.has(String(e.place)));
  const oracle = (asked ?? []).find(a => a.actorId === me.id && inNight(a.at));
  if ( oracle ) why.learning = `asked: ${oracle.q}`;
  else if ( newPlace ) why.learning = `saw ${newPlace.place} for the first time`;
  const mine = x => !!x && ((me.id && x.id === me.id) || (!x.id && me.name && String(x.name ?? "").trim().toLowerCase() === String(me.name).trim().toLowerCase()));
  const closed = (ledger ?? []).find(e => e && e.status === "kept" && (mine(e.from) || mine(e.to)) && (e.history ?? []).some(h => inNight(h.at) && /^Marked/.test(String(h.what ?? ""))));
  if ( closed ) why.success = `${closed.kind} settled${closed.what ? `: ${closed.what}` : ""}`;
  return {there: !!why.there, danger: !!why.danger, learning: !!why.learning, success: !!why.success, why};
}

/** Which of the line's reasons the deeds tick, in the list's order. reasons: wrapup-rules reasonsFor(..., {story: true}). */
export function xpTicks(deeds = {}, reasons = []) {
  const want = new Set(Object.entries(deeds.why ?? {}).map(([k]) => k));
  // "there" is the book's "took part"; the rest by key
  return (reasons ?? []).filter(r => want.has(r.key)).map(r => r.key);
}

/** The award: the ticks' points, at most XP_NIGHT_MAX, and the note for the sheet. */
export function xpAward(ticks = [], reasons = []) {
  const set = new Set(ticks);
  const rows = (reasons ?? []).filter(r => set.has(r.key));
  const points = Math.min(XP_NIGHT_MAX, rows.reduce((s, r) => s + (Number(r.xp) || 0), 0));
  return {points, note: rows.length ? `The night: ${rows.map(r => r.label.toLowerCase()).join("; ")}` : ""};
}

/* ------------------------------------------------------------------ */
/*  The recap (B6049)                                                  */
/* ------------------------------------------------------------------ */

/** Log entries the character knows of, by kind; "ask" and the Storyteller's own notes stay out. */
const RECAP_KINDS = new Set(["travel", "solo", "encounter", "note", "scene", "director", "xp"]);
export const RECAP_MAX = 12;

/**
 * The recap of a night for the character: the entries about the character in that night, oldest first, in their own
 * words, plus the oracle's answers. -> [{at, text}]
 */
export function recapRows({entries = [], me = {}, asked = [], night = 0} = {}) {
  const {start, end} = nightWindow(night);
  const inNight = at => (Number(at) || 0) >= start && (Number(at) || 0) < end;
  const rows = (entries ?? []).filter(e => e && inNight(e.at) && e.actor === me.id && RECAP_KINDS.has(e.kind) && e.text && !e.secret)
    .map(e => ({at: Number(e.at), text: String(e.text)}));
  for ( const a of asked ?? [] ) if ( a?.actorId === me.id && inNight(a.at) ) rows.push({at: Number(a.at), text: `You asked the oracle: ${a.q} ${a.label ?? a.answer}.`});
  rows.sort((a, b) => a.at - b.at);
  return rows.length > RECAP_MAX ? [...rows.slice(0, RECAP_MAX - 1), {at: rows.at(-1).at, text: `And ${rows.length - RECAP_MAX + 1} more besides.`}] : rows;
}
