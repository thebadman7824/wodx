/**
 * WoDX Solo: the rules of The Lone Chronicle, with no Foundry in them (tools/harness/solo.test.mjs).
 *
 * WoDX works things out on the Storyteller's browser. For one person playing alone, a hidden browser holds that seat
 * and three things keep the night moving:
 *   the preset   every automation set to act by itself, with the old values kept for the way back
 *   the watcher  a card, window or queue entry that waits for a Storyteller is answered after a short wait, or logged
 *   the log      what the seat decided, kept from the player until asked for
 */
export const NAME = "The Lone Chronicle";
/** Worlds the mode never acts in, whatever the setting says. */
export const NEVER_WORLDS = ["rothenstein-live"];
export const LOG_CAP = 600;

/** What the one switch sets. A setting whose module is off or missing is skipped and named. */
export const PRESET = [
  {mod: "wodx-npc", key: "mode", to: "auto", what: "NPCs in combat act"},
  {mod: "wodx-npc", key: "routineMode", to: "auto", what: "routines and reactions run"},
  {mod: "wodx-npc", key: "factionMode", to: "auto", what: "factions take their turns"},
  {mod: "wodx-combat", key: "fightStart", to: "auto", what: "fights start by themselves"},
  {mod: "wodx-combat", key: "turnConductor", to: "everyone", what: "every turn ends itself"},
  {mod: "wodx-combat", key: "fightEnd", to: "auto", what: "a fight ends once one side is down or gone"},
  {mod: "wodx-actions", key: "dawnDusk", to: "auto", what: "New Night runs at dusk"},
  {mod: "wodx-actions", key: "sunDamage", to: "apply", what: "sunlight is rolled and applied"},
  {mod: "wodx-storyteller", key: "nightDraw", to: true, what: "the night is drawn at dusk"},
  {mod: "wodx-chronicle", key: "rule.lightTouch", to: false, what: "light-touch mode is off"},
  {mod: "wodx-chronicle", key: "npcCap", to: 0, what: "no cap on NPC proposals"}
];

/**
 * The changes the switch makes. read(mod, key) gives the present value, or undefined when the setting is not there.
 * @returns {{changes: {mod, key, from, to, what}[], missing: {mod, key}[]}}
 */
export function planPreset(read, preset = PRESET) {
  const changes = [], missing = [];
  for ( const p of preset ) {
    const from = read(p.mod, p.key);
    if ( from === undefined ) { missing.push({mod: p.mod, key: p.key}); continue; }
    if ( from !== p.to ) changes.push({mod: p.mod, key: p.key, from, to: p.to, what: p.what});
  }
  return {changes, missing};
}

/** The way back: each change is undone only where the value is still the one the switch set. */
export function planRestore(changes = [], read) {
  const back = [], kept = [];
  for ( const c of changes ?? [] ) {
    const now = read(c.mod, c.key);
    if ( now === undefined ) continue;
    if ( now === c.to ) back.push({mod: c.mod, key: c.key, to: c.from});
    else if ( now !== c.from ) kept.push({mod: c.mod, key: c.key, now});
  }
  return {back, kept};
}

/** The queue types that get a standing approval: every known type not already on, less those that never may. */
export function autoPlan(types = [], current = {}, never = ["request"]) {
  return (types ?? []).map(t => (typeof t === "string" ? t : t?.type)).filter(t => t && !never.includes(t) && current?.[t] !== true);
}

/* ------------------------------ the watcher ------------------------------ */

/* The watcher's reading of a card lives in WoDX Chronicle, so the Waiting tray makes the same choice (B2452). */
export {plain, buttonsOf, AVOID, PREFER, waits, pickButton, forStoryteller, titleOf, sourceOf} from "../../wodx-chronicle/scripts/waiting-rules.mjs";

/* ------------------------------ the log ------------------------------ */

export const KINDS = {card: "A card", window: "A window", queue: "The approval queue", preset: "The switch", scene: "A scene", note: "A note"};
export const blankLog = () => ({v: 1, entries: []});
export function normLog(l) {
  return {v: 1, entries: Array.isArray(l?.entries) ? l.entries.filter(e => e && typeof e === "object") : []};
}
export function addEntry(log, e, {cap = LOG_CAP} = {}) {
  const l = normLog(log);
  l.entries.push({at: Number(e.at) || 0, wt: Number(e.wt) || 0, kind: KINDS[e.kind] ? e.kind : "note", source: String(e.source ?? ""),
    title: String(e.title ?? "").slice(0, 120), buttons: (e.buttons ?? []).map(String).slice(0, 12),
    choice: e.choice == null ? null : String(e.choice), acted: !!e.acted, note: String(e.note ?? "").slice(0, 200)});
  if ( l.entries.length > cap ) l.entries.splice(0, l.entries.length - cap);
  return l;
}

/** The places play waited on a Storyteller since a time: cards, windows and queue entries. */
export const stalls = (entries = [], since = 0) => (entries ?? []).filter(e => ["card", "window", "queue"].includes(e.kind) && e.at >= since);

/** Stalls gathered by where they came from and how they ended, most frequent first. */
export function stallReport(entries = [], since = 0) {
  const by = new Map();
  for ( const e of stalls(entries, since) ) {
    const end = e.acted ? "answered by the seat" : e.choice ? "choice found, not pressed" : "left waiting";
    const key = `${e.kind}|${e.source}|${e.title}|${end}`;
    const r = by.get(key) ?? {kind: e.kind, source: e.source, title: e.title, end, choice: e.choice, count: 0};
    r.count++;
    by.set(key, r);
  }
  const rows = [...by.values()].sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
  return {total: rows.reduce((n, r) => n + r.count, 0), waiting: rows.filter(r => r.end === "left waiting").reduce((n, r) => n + r.count, 0), rows};
}

/* ------------------------------ the player's panel (0.2.0) ------------------------------ */

/**
 * What the panel offers in step 2 of the plan (B2640). The oracle, the Leads page and the trouble dial come in step 3
 * and the director in step 4, so they are not on it yet.
 */
/**
 * The panel's one main button (Solo 0.3.0, B2831): the clock runs until something happens, an hour at most, with
 * the same stops as Wait an hour. The other buttons sit under More.
 */
export const NEXT = {id: "next", label: "What happens next?", icon: "fa-solid fa-forward", wait: "hour",
  hint: "The clock runs until something happens, an hour at most."};

export const PANEL = [
  {id: "time", label: "Let time pass", icon: "fa-solid fa-hourglass-half"},
  {id: "travel", label: "Travel", icon: "fa-solid fa-person-walking-luggage"},
  {id: "pause", label: "Pause or go on", icon: "fa-solid fa-pause"},
  {id: "stuck", label: "I am stuck", icon: "fa-solid fa-life-ring"},
  {id: "curtain", label: "Lift the curtain", icon: "fa-solid fa-masks-theater"}
];

/**
 * Ways to let time pass. stops: what ends the wait early. A wait stops for a fight on the character's scene, a pause,
 * someone new arriving there or word sent to the player; sleeping through the day stops only for a fight or a pause,
 * since a sleeper notices nothing else (B2641).
 */
export const WAITS = {
  ten: {label: "Wait ten minutes", seconds: 600, stops: ["fight", "paused", "word", "newcomer"]},
  hour: {label: "Wait an hour", seconds: 3600, stops: ["fight", "paused", "word", "newcomer"]},
  dusk: {label: "Wait until dusk", to: "dusk", stops: ["fight", "paused", "word", "newcomer"]},
  dawn: {label: "Wait until dawn", to: "dawn", stops: ["fight", "paused", "word", "newcomer"]},
  day: {label: "Sleep the day", to: "dusk", stops: ["fight", "paused"], sleep: true}
};
export const MAX_WAIT = 36 * 3600;
export const STEP = 600;

/** Seconds a wait asks for. toDusk / toDawn: seconds from now to the next dusk and dawn where the character is. */
export function secondsFor(choice, {toDusk = 0, toDawn = 0} = {}) {
  const w = WAITS[choice];
  if ( !w ) return 0;
  const s = w.to === "dusk" ? Number(toDusk) : w.to === "dawn" ? Number(toDawn) : Number(w.seconds);
  return Math.max(0, Math.min(MAX_WAIT, Math.round(Number.isFinite(s) ? s : 0)));
}

/** The wait cut into steps of at most STEP seconds, so the world can answer between them. */
export function chunks(total, step = STEP) {
  const out = [];
  let left = Math.max(0, Math.round(Number(total) || 0));
  const size = Math.max(60, Math.round(Number(step) || STEP));
  while ( left > 0 ) { const n = Math.min(size, left); out.push(n); left -= n; }
  return out;
}

export const STOP_WORDS = {
  fight: "a fight started",
  paused: "the game was paused",
  word: "word came for you",
  newcomer: "someone came near"
};

/** Why a wait stops now, or null. seen: {fight, paused, word, newcomer} booleans. */
export function stopFor(choice, seen = {}) {
  const w = WAITS[choice];
  if ( !w ) return null;
  for ( const k of w.stops ) if ( seen?.[k] ) return k;
  return null;
}

/** Seconds as plain words: "1 hour 20 minutes", "10 minutes". */
export function span(seconds) {
  const m = Math.round((Number(seconds) || 0) / 60);
  if ( m < 1 ) return "no time";
  const h = Math.floor(m / 60), r = m % 60;
  const part = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  return [h ? part(h, "hour") : "", r ? part(r, "minute") : ""].filter(Boolean).join(" ");
}

/**
 * The fixes behind I am stuck (B2642). The lead is a foreshadowing drawn for the character and sent through the
 * approval queue until the director of step 4 takes its place.
 */
export const STUCK = {
  lead: {label: "Bring me a lead", hint: "Something is put in your character's way: a sign of what is coming."},
  token: {label: "Free my token", hint: "Your character is put back at the scene's way in."},
  fight: {label: "End a hung fight or window", hint: "A fight on your scene that will not finish ends, and any window waiting on the Storyteller's side closes."}
};

/**
 * The scene's way in: its starting view when it has one, else its middle. scene: {initial: {x, y}, width, height,
 * padding, grid: {size}}. Returns the token's top left {x, y}, snapped to the grid.
 */
export function wayIn(scene = {}, tokenSize = 1) {
  const g = Number(scene?.grid?.size ?? scene?.grid) || 100;
  const w = Number(scene?.width) || 0, h = Number(scene?.height) || 0;
  const pad = Number(scene?.padding) || 0;
  const offX = Math.ceil(w * pad / g) * g, offY = Math.ceil(h * pad / g) * g;
  const ix = Number(scene?.initial?.x), iy = Number(scene?.initial?.y);
  const cx = Number.isFinite(ix) && scene?.initial?.x != null ? ix : offX + w / 2;
  const cy = Number.isFinite(iy) && scene?.initial?.y != null ? iy : offY + h / 2;
  const half = (Number(tokenSize) || 1) * g / 2;
  return {x: Math.max(0, Math.round((cx - half) / g) * g), y: Math.max(0, Math.round((cy - half) / g) * g)};
}

/** When tonight began: the last dusk at or before now. toNextDusk: seconds from now to the next dusk. */
export function nightStart(now, toNextDusk) {
  const n = Number(now) || 0, d = Number(toNextDusk);
  if ( !Number.isFinite(d) || d <= 0 ) return n;
  return Math.max(0, n + d - 86400);
}

/** The log as the curtain shows it: tonight's entries, oldest first, in plain words. */
export function curtainRows(entries = [], since = 0) {
  return (entries ?? []).filter(e => e && (Number(e.wt) || 0) >= since).map(e => ({
    wt: Number(e.wt) || 0, kind: KINDS[e.kind] ?? KINDS.note, title: String(e.title ?? ""),
    what: e.acted ? `the seat chose ${e.choice}` : e.choice ? `the seat would choose ${e.choice}` : e.note ? String(e.note) : "",
    note: e.acted || e.choice ? String(e.note ?? "") : ""
  }));
}

/** The nights the player has looked behind the curtain: keys of the night's start, newest last, at most 60. */
export function markSeen(seen = [], key) {
  const k = Math.round(Number(key) || 0);
  const list = (Array.isArray(seen) ? seen : []).map(Number).filter(Number.isFinite).filter(x => x !== k);
  list.push(k);
  return list.slice(-60);
}
