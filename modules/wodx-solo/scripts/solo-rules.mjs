/**
 * WoDX Solo: the rules of The Lone Chronicle, with no Foundry in them (tools/harness/solo.test.mjs).
 *
 * WoDX works things out on the Storyteller's browser. For one person playing alone, a hidden browser holds that seat
 * and three things keep the night moving:
 *   the preset   every automation set to act by itself, with the old values kept for the way back
 *   the watcher  a card, window or queue entry that waits for a Storyteller is answered after a short wait, or logged
 *   the log      what the seat decided, kept from the player until asked for
 */
import {DAY} from "../../wodx-chronicle/scripts/terms.mjs";
import {LIVE_WORLDS} from "../../wodx-chronicle/scripts/live-worlds.mjs";
export const NAME = "The Lone Chronicle";
/** Worlds the mode never acts in, whatever the setting says. */
/** B7564: the one shared Live list (WoDX Chronicle live-worlds.mjs). */
export const NEVER_WORLDS = LIVE_WORLDS;
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
 * What the panel offers: step 2 of the plan (B2640), with the oracle and the Leads page of step 3 (B5980, B5982).
 * The director of step 4 is not on it yet.
 */
/**
 * The panel's one main button (Solo 0.3.0, B2831): the clock runs until something happens, an hour at most, with
 * the same stops as Wait an hour. The other buttons sit under More.
 */
export const NEXT = {id: "next", label: "What happens next?", icon: "fa-solid fa-forward", wait: "hour",
  hint: "The clock runs until something happens, an hour at most."};

export const PANEL = [
  // B5980, B5982: step 3 of the plan
  {id: "oracle", label: "Ask the oracle", icon: "fa-solid fa-circle-question"},
  {id: "leads", label: "Leads", icon: "fa-solid fa-route"},
  {id: "time", label: "Let time pass", icon: "fa-solid fa-hourglass-half"},
  {id: "travel", label: "Travel", icon: "fa-solid fa-person-walking-luggage"},
  // B6040: towns with no map drawn, as card scenes
  {id: "places", label: "Places with no map", icon: "fa-solid fa-map-location-dot"},
  // B6533: step 5, the years slept through
  {id: "years", label: "Sleep through the years", icon: "fa-solid fa-bed"},
  {id: "pause", label: "Pause or go on", icon: "fa-solid fa-pause"},
  {id: "stuck", label: "I am stuck", icon: "fa-solid fa-life-ring"},
  {id: "curtain", label: "Lift the curtain", icon: "fa-solid fa-masks-theater"},
  // B7160: a fault met in play, written down with the build, the scene and the recent errors
  {id: "report", label: "Report a problem", icon: "fa-solid fa-bug"},
  // B5079: ask a companion to carry someone who is down
  {id: "carry", label: "Carry the fallen", icon: "fa-solid fa-people-carry-box"},
  // B6757: the chronicle's own options the lone player may turn on (OPTIONS)
  {id: "options", label: "Chronicle options", icon: "fa-solid fa-sliders"}
];

/**
 * B6757: WoDX Storyteller's options that are off by default and in no preset, which the lone player may set from the
 * panel (Game Settings is the Storyteller's, and the player is not one). The seat checks each ask against this list.
 */
export const OPTIONS = [
  {mod: "wodx-storyteller", key: "threads", label: "Threads of Fate", hint: "Storylines woven from what happens in play.",
    choices: {off: "Off", auto: "On: a storyline opens by itself"}},
  {mod: "wodx-storyteller", key: "hardship", label: "Hardship on the road", hint: "Harsh weather, thirst, hunger and lost sleep for living characters as time passes.",
    choices: {false: "Off", true: "On"}},
  {mod: "wodx-storyteller", key: "remains", label: "Bodies left behind", hint: "The dead stay as bodies that rot, and the era's authorities may find them.",
    choices: {false: "Off", true: "On"}}
];
/** One ask from the panel: the setting and the value to write, or null when it is not on the list. */
export function optionChange(key, value) {
  const o = OPTIONS.find(x => x.key === key);
  const v = String(value);
  if ( !o || !Object.hasOwn(o.choices, v) ) return null;
  return {mod: o.mod, key: o.key, to: v === "true" ? true : v === "false" ? false : v, label: o.label, word: o.choices[v]};
}

/**
 * B5079 (the owner's Carry Bodies Desk, c10): the companion who carries a fallen one in a Lone Chronicle. list: the NPCs on the
 * scene, [{id, name, distance (yards to the fallen one), serves (serves the player's character), friendly, down, holding,
 * hands (any to take hold with), player (a player owns it)}]. One who serves the character goes first, then a friendly
 * one; the nearest of them, within maxYards. -> the chosen entry, or null
 */
export const CARRY_YARDS = 40;
export function companionFor(list = [], maxYards = CARRY_YARDS) {
  const ok = (list ?? []).filter(c => c && !c.player && !c.down && !c.holding && c.hands !== false && (c.serves || c.friendly)
    && Number.isFinite(Number(c.distance)) && Number(c.distance) <= maxYards);
  ok.sort((a, b) => (Number(!!b.serves) - Number(!!a.serves)) || (Number(a.distance) - Number(b.distance)));
  return ok[0] ?? null;
}

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
/** B8035 (#2501): a sheet the arrival makes now waits for the wizard's Ready button; older sheets carry no mark. */
export const READY_MARK = 1;
export const MAX_WAIT = 36 * 3600;

/* B8045 (#2477): hunting is one of the ways a night passes. The hunt rolls an hour at a time until prey is caught,
   and the clock then moves by the hours it took. */
export const HUNT_CHOICE = {label: "Hunt the rest of the night", hint: "Roll an hour at a time until you catch prey or dawn comes; the clock moves by the hours used."};
export const HUNT_MAX_HOURS = 12;
/** Whole hours a hunt may use before dawn: at least one, at most HUNT_MAX_HOURS. */
export function huntHours(toDawn = 0) {
  const h = Math.floor((Number(toDawn) || 0) / 3600);
  return Math.max(1, Math.min(HUNT_MAX_HOURS, h));
}
/** Seconds a spent stretch of time may move the clock: whole seconds, never below 0 or past HUNT_MAX_HOURS. */
export function spendSeconds(seconds = 0, maxHours = HUNT_MAX_HOURS) {
  const s = Math.round(Number(seconds) || 0);
  return Math.max(0, Math.min(Math.max(0, Number(maxHours) || 0) * 3600, s));
}
/** #2490: a trip's time on the world clock, at most a fortnight, in no more than about 60 steps so a long trip ends soon. */
export const TRIP_MAX_HOURS = 14 * 24;
export const TRIP_MIN_SECONDS = 10 * 60;
export const tripStep = total => Math.max(STEP, Math.ceil((Math.round(Number(total) || 0)) / 60));
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
  return Math.max(0, n + d - DAY);
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

/* ------------------------------ Storyteller tools (B4800 to B4805) ------------------------------ */

/**
 * The lone player may switch on Storyteller tools from the panel, to check that the world works and to hand their
 * character things to try out (the owner, 14 November 2026). The player stays a player: every tool asks the seat, and the
 * seat answers only that one player. Off unless switched on.
 */
export const ST_TOOLS = [
  {id: "eyes", label: "The Storyteller's cards", icon: "fa-solid fa-eye",
    hint: "Every card, roll and whisper meant for the Storyteller alone, as it arrives. You can press its buttons yourself."},
  {id: "give", label: "Give my character an item", icon: "fa-solid fa-gift",
    hint: "Any item in the world or the compendiums, put straight onto your character's sheet."},
  {id: "xp", label: "Add experience", icon: "fa-solid fa-star",
    hint: "Experience points for your character, recorded on the sheet like any award, to try out spends."},
  {id: "check", label: "Check the systems", icon: "fa-solid fa-stethoscope",
    hint: "Which WoDX parts are running, whether the switch still holds, what waits for a Storyteller and any errors on the seat."},
  {id: "hidden", label: "What is hidden here", icon: "fa-solid fa-user-secret",
    hint: "The hidden tokens on your scene, with where they stand."},
  // B6226: the night's work, everything the seat and the Hand did by themselves, with one Undo
  {id: "night", label: "The night's work", icon: "fa-solid fa-clock-rotate-left",
    hint: "Everything the Hand did by itself since a time you pick, and one Undo for what you tick. It warns where you changed the same thing since."}
];
export const ST_OFF = () => ({on: false, userId: null, at: 0});
export const normSt = s => ({on: s?.on === true, userId: s?.userId ? String(s.userId) : null, at: Number(s?.at) || 0});

/**
 * Whether a user may switch the tools on (B4801). The world must be in solo mode and not one the mode never acts in,
 * the user must be a player, not a Storyteller, and nobody else may be playing: the one active player is this user.
 * @param {{soloOn: boolean, blocked: boolean, userId: string, isGM: boolean, activePlayers: string[]}} w
 * @returns {{ok: boolean, why: string|null}}
 */
export function mayTurnOn({soloOn = false, blocked = false, userId = null, isGM = false, activePlayers = []} = {}) {
  if ( blocked ) return {ok: false, why: "not in this world"};
  if ( !soloOn ) return {ok: false, why: `${NAME} is off`};
  if ( !userId ) return {ok: false, why: "no player asked"};
  if ( isGM ) return {ok: false, why: "a Storyteller has these already"};
  const others = (activePlayers ?? []).filter(id => id !== userId);
  if ( others.length ) return {ok: false, why: "someone else is playing"};
  return {ok: true, why: null};
}

/** Whether a user may use the tools now: they are on, for this user, and still nobody else is playing (B4801). */
export function mayUse(st, userId, {soloOn = false, blocked = false, activePlayers = []} = {}) {
  const s = normSt(st);
  if ( !s.on || !userId || s.userId !== userId ) return false;
  return mayTurnOn({soloOn, blocked, userId, isGM: false, activePlayers}).ok;
}

/** Items that match a search, best first: names that start with it, then names that hold it. At most `limit`. */
export function itemMatches(index = [], query = "", limit = 40) {
  const q = String(query ?? "").trim().toLowerCase();
  if ( q.length < 2 ) return [];
  const rows = (index ?? []).filter(r => r?.name && r?.uuid).map(r => ({r, n: String(r.name).toLowerCase()}));
  const starts = rows.filter(x => x.n.startsWith(q)), holds = rows.filter(x => !x.n.startsWith(q) && x.n.includes(q));
  const by = (a, b) => a.n.localeCompare(b.n) || String(a.r.from ?? "").localeCompare(String(b.r.from ?? ""));
  const seen = new Set(), out = [];
  for ( const x of [...starts.sort(by), ...holds.sort(by)] ) {
    if ( seen.has(x.r.uuid) ) continue;
    seen.add(x.r.uuid);
    out.push({uuid: String(x.r.uuid), name: String(x.r.name), type: String(x.r.type ?? ""), from: String(x.r.from ?? "")});
    if ( out.length >= limit ) break;
  }
  return out;
}

/** Item data made ready for a character: no id, no folder, no sort, and a note of where it came from. */
export function grantData(src = {}, {by = "", at = 0} = {}) {
  const d = JSON.parse(JSON.stringify(src ?? {}));
  delete d._id; delete d.folder; delete d.sort; delete d.ownership; delete d._stats;
  d.flags = {...(d.flags ?? {}), "wodx-solo": {...(d.flags?.["wodx-solo"] ?? {}), granted: {by: String(by), at: Number(at) || 0}}};
  return d;
}

/**
 * The systems check as rows (B4803). r: {modules: [{id, title, version}] running, off: [title] switched off,
 * broken: [{id, title, needs: [id]}] running parts whose required part is off, drift: [{mod, key, what}],
 * missing: [{mod, key}], pending, held, waiting, errors: [{at, text}], paused, sameScene, fights}
 * Each row: {area, state: "ok"|"warn", text}.
 */
export function checkRows(r = {}) {
  const rows = [];
  const add = (area, bad, good, warn) => rows.push({area, state: bad ? "warn" : "ok", text: bad ? warn : good});
  const mods = r.modules ?? [], broken = r.broken ?? [];
  add("WoDX parts", broken.length > 0, `${mods.length} running${(r.off ?? []).length ? `; switched off: ${r.off.join(", ")}` : ""}`,
    `${broken.map(b => `${b.title ?? b.id} needs ${b.needs.join(", ")}, which is off`).join("; ")}`);
  const drift = r.drift ?? [];
  add("The switch", drift.length > 0, "every automation still acts by itself", `changed since the switch: ${drift.map(d => d.what ?? `${d.mod} ${d.key}`).join("; ")}`);
  if ( (r.missing ?? []).length ) rows.push({area: "The switch", state: "warn", text: `not found, so left alone: ${r.missing.map(m => `${m.mod} ${m.key}`).join(", ")}`});
  const q = (Number(r.pending) || 0) + (Number(r.held) || 0);
  add("Approval queue", q > 0, "nothing waits", `${Number(r.pending) || 0} waiting, ${Number(r.held) || 0} held back`);
  add("Tonight", (Number(r.waiting) || 0) > 0, "nothing was left waiting for a Storyteller", `${Number(r.waiting) || 0} cards or windows were left waiting for a Storyteller`);
  const errs = r.errors ?? [];
  add("Errors on the seat", errs.length > 0, "none since the seat sat down", `${errs.length}; newest: ${String(errs[errs.length - 1]?.text ?? "").slice(0, 160)}`);
  add("The seat's map", r.sameScene === false, "the seat views your scene", "the seat views another scene, so NPCs there cannot see you");
  add("The game", !!r.paused, "running", "paused: NPCs will not act until it goes on");
  rows.push({area: "Fights", state: "ok", text: Number(r.fights) ? `${Number(r.fights)} running` : "none running"});
  return rows;
}

/** A hidden token as the tool shows it: name, kind and grid square. */
export function hiddenRow(t = {}, grid = 100) {
  const g = Number(grid) || 100;
  const disp = {"-2": "secret", "-1": "hostile", "0": "neutral", "1": "friendly"}[String(t.disposition ?? 0)] ?? "neutral";
  return {name: String(t.name ?? "Someone"), kind: String(t.kind ?? ""), disposition: disp,
    square: `${Math.floor((Number(t.x) || 0) / g) + 1}, ${Math.floor((Number(t.y) || 0) / g) + 1}`};
}

/** Experience the tool may give at once (B4806): a whole number from 1 to XP_MAX, or null. */
export const XP_MAX = 100;
export function xpAmount(v) {
  const n = Number(v);
  if ( !Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > XP_MAX ) return null;
  return n;
}
/** The award's name on the sheet: the player's reason, or a plain one. */
export const xpNote = note => (String(note ?? "").trim().slice(0, 100) || "Given with the Storyteller tools");

export const EYES_CAP = 60;
/** B8050 (#2482): a chat card's header controls (delete, menu) taken out of its html, for a list where they cannot work. */
export function stripCardControls(html = "") {
  return String(html ?? "").replace(/<a\b[^>]*\b(?:message-delete|chat-control|message-control)\b[^>]*>[\s\S]*?<\/a>/gi, "")
    .replace(/<button\b[^>]*\b(?:message-delete|chat-control|message-control)\b[^>]*>[\s\S]*?<\/button>/gi, "")
    .replace(/<a\b[^>]*data-action="(?:deleteMessage|expandRoll|contextMenu)"[^>]*>[\s\S]*?<\/a>/gi, "");
}
/** Keep the newest cards, one per message, at most EYES_CAP. */
export function addEyes(list = [], card, cap = EYES_CAP) {
  const out = (list ?? []).filter(c => c && c.id !== card?.id);
  if ( card?.id ) out.push(card);
  return out.slice(-cap);
}

/* ------------------------------------------------------------------ */
/*  Arrival (B5140 to B5145)                                          */
/* ------------------------------------------------------------------ */

/**
 * The lines a lone player may start as on arrival, with the sheet type each one makes. The wizard then picks the
 * book for the sheet and the era by itself (Creation's lineFor). Vampire first, as the chronicle opens with it.
 */
export const ARRIVAL_LINES = [
  {id: "vampire", type: "Vampire", label: "Vampire", hint: "one of the Cainites, who wake at dusk"},
  {id: "werewolf", type: "Werewolf", label: "Werewolf", hint: "a Garou of the hills and the old grove"},
  {id: "mage", type: "Mage", label: "Mage", hint: "a wise one who bends the world by will"},
  {id: "changeling", type: "Changeling", label: "Changeling", hint: "a fae soul in a borrowed body"},
  {id: "wraith", type: "Wraith", label: "Wraith", hint: "one of the restless dead"},
  {id: "hunter", type: "Hunter", label: "Hunter", hint: "one who hunts what hides in the night"},
  {id: "mortal", type: "Mortal", label: "Mortal", hint: "a living soul of the valley"}
];
export const NAME_MAX = 60;
export const DEFAULT_NAME = "A stranger";
export const arrivalLine = id => ARRIVAL_LINES.find(l => l.id === String(id ?? "").toLowerCase()) ?? null;
/** A name typed on arrival: plain text, trimmed, at most NAME_MAX characters, never empty. */
export function arrivalName(v) {
  const s = String(v ?? "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, NAME_MAX).trim();
  return s || DEFAULT_NAME;
}

/**
 * Names that mark the scene a chronicle opens on: a market first, then a scene named for the chronicle's town (the
 * town in the manifest of the chronicle in play, B7565), then a lower town, then any scene that names the town.
 * Shared code names no chronicle: with none in play only the market and the lower town count.
 */
export function landingNames(town = "") {
  const t = String(town ?? "").trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [/Market (Street|Square)/i, ...(t ? [new RegExp(`^${t}\\b`, "i")] : []), /Lower Town/i, ...(t ? [new RegExp(t, "i")] : [])];
}
export const LANDING_NAMES = landingNames();

/**
 * The scene the lone player lands on. scenes: [{id, name, active, landing, img}], where landing is the scene's
 * wodx-solo.landing flag and img its background. chosen: the world setting's scene id. Order: the flagged scene, the
 * chosen one, a scene of the chronicle's town with a map (market first), the active scene, any scene with a map. Null when none
 * fits; the seat then makes the plain night scene (LANDING_BLANK).
 */
/** Foundry's own welcome scene, which a new world opens on; never a landing, and always given way to. */
export const isCoreScene = s => s?.id === "NUEDEFAULTSCENE0" || /nue\/defaultscene/i.test(String(s?.img ?? ""));

/**
 * May the landing take the active scene's place? Only when nothing is active, the active scene has no map, or it is
 * Foundry's welcome scene: a map the Storyteller made active stays (B5147).
 */
export function mayReplaceActive(active = null) {
  if ( !active ) return true;
  return !active.img || isCoreScene(active);
}

/**
 * An actor counts as a player's own only when the player is named its owner: an actor every player owns by default
 * (an old test actor, a shared sheet) is nobody's character (B5146).
 */
export function ownsByName(ownership = {}, userId = "") {
  return Number(ownership?.[String(userId)]) >= 3;
}

export function pickLanding(scenes = [], chosen = "", town = "", named = "") {
  const list = (scenes ?? []).filter(s => s?.id && !isCoreScene(s));
  // B8032 (#2486): the chronicle names its own landing (its manifest's landing), ahead of any older pick. A scene
  // flagged as the landing still comes first, unless it is the plain night scene arrival made before the maps came
  const want = String(named ?? "").trim().toLowerCase();
  const own = want ? list.find(s => s.img && String(s.name ?? "").trim().toLowerCase().startsWith(want)) : null;
  const flagged = list.find(s => s.landing);
  if ( flagged && (flagged.img || !flagged.made || !own) ) return flagged.id;
  if ( own ) return own.id;
  if ( chosen && list.some(s => s.id === chosen) ) return chosen;
  const mapped = list.filter(s => s.img);
  for ( const re of landingNames(town) ) {
    const hit = mapped.find(s => re.test(String(s.name ?? "")));
    if ( hit ) return hit.id;
  }
  return list.find(s => s.active && s.img)?.id ?? mapped[0]?.id ?? null;
}

/**
 * The plain scene made when the world has no map at all: a dark square of night with a grid, token vision on so the
 * night shows. A map can be set on it later; the flag keeps it the landing. Only this scene is dark by itself: an
 * existing map the player lands on shows the light the clock gives it (WoDX Atmosphere's light from the clock, on by
 * default out of doors, B6168), so the arrival is "at night" only when the clock says night (B6169).
 */
export const LANDING_BLANK = {
  name: "By night: the way in",
  width: 3000, height: 2000, padding: 0.1, backgroundColor: "#0b0f1a",
  grid: {size: 100, type: 1},
  tokenVision: true,
  environment: {darknessLevel: 0.85, globalLight: {enabled: false}},
  initial: {x: 1500, y: 1000, scale: 1}
};
/** The plain night scene, named for the chronicle's town when one is in play (B7565). */
export const landingBlank = (town = "") => ({...LANDING_BLANK, name: String(town ?? "").trim() ? `${String(town).trim()} by night: the way in` : LANDING_BLANK.name});
/** The arrival window's title: the chronicle's town when one is in play (B7565). */
export const arrivalTitle = (town = "") => (String(town ?? "").trim() ? `Who comes to ${String(town).trim()}?` : "Who comes in out of the night?");

/**
 * What arrival does for a player. has: {character, token, onLanding, viewing}: the player has a character, it has a
 * token on some scene, that token is on the landing, the player views the token's scene. Returns
 * "make" (ask the player for a name and a line), "place" (put a token on the landing), "pull" (bring the player to
 * the token's scene) or "ready".
 */
export function arrivalStep(has = {}) {
  if ( !has.character ) return "make";
  if ( !has.token ) return "place";
  if ( !has.viewing ) return "pull";
  return "ready";
}

/**
 * B8033 (#2475): how far a new character sees in the dark with no light, in squares. Range 0 left a night map black.
 * A few squares of dim sight, as anyone has by starlight; Auspex, Gifts and lights add to it through WoDX Senses.
 */
export const SIGHT_SQUARES = 6;
/** The token's sight range in the scene's own units (Foundry measures sight in grid distance, not squares). */
export const sightRange = (gridDistance = 1) => Math.max(1, Math.round(SIGHT_SQUARES * (Number(gridDistance) > 0 ? Number(gridDistance) : 1) * 10) / 10);

/**
 * The sight a player's token gets where it stands (#2475, the owner's pick of 25 Nov): a few squares outdoors, where
 * the stars or the moon give something to see by, and none in an unlit interior. Foundry still shows any lit place in
 * view, so a lit room, a carried light and the token's own light all show. null: leave the token alone (a power's
 * darkvision, or a range someone set by hand). The book: a Cainite with no powers sees like a human, and pitch dark
 * adds 2 to difficulty (V20 Dark Ages p. 346); Eyes of the Beast sees in pitch dark (p. 240).
 */
export function sightFor({indoor = false, gridDistance = 1, visionMode = "basic", range = null} = {}) {
  if ( visionMode && visionMode !== "basic" ) return null;
  const out = sightRange(gridDistance);
  if ( range !== null && range !== undefined && Number(range) !== 0 && Number(range) !== out ) return null;
  return indoor ? 0 : out;
}

/** The data for the lone player's new character. The seat makes it; the player owns it, and its token is linked. */
export function newCharacterData({name, line, userId, at = 0} = {}) {
  const L = arrivalLine(line) ?? arrivalLine("mortal");
  const n = arrivalName(name);
  return {
    name: n, type: L.type,
    ownership: {default: 0, [String(userId)]: 3},
    prototypeToken: {name: n, actorLink: true, disposition: 1, displayName: 30, sight: {enabled: true, range: SIGHT_SQUARES, visionMode: "basic"}},
    flags: {"wodx-solo": {arrival: {line: L.id, userId: String(userId), at: Number(at) || 0, ready: READY_MARK}}}
  };
}
