/**
 * WoDX Storyteller 0.1.0: the open world's rules, with no Foundry in them, so the harness can test every one.
 *
 *   The log       One feed of what every character does: where, at what hour, what they did and rolled, and what
 *                 needs the Storyteller's eye (a sin, a frenzy, a Masquerade breach, a voice's proposal).
 *   Personal time Each character keeps a place in the night while acting alone. The world clock stays the
 *                 Storyteller's. A dawn the world clock passes ends every night that was still behind it.
 *   Travel        A trip takes the route's minutes (or the place's, or the world's default). Each hour on the road
 *                 may turn up one encounter. A place marked "ask first" waits for the Storyteller.
 *   Solo play     Hunting, downtime, research, influence, talking to NPCs. A per-night limit, a pause while
 *                 convened, and anything that changes the world goes to the approval queue.
 *   Convening     The scene starts at the latest of the chosen characters' times. Whoever is ahead waits; whoever
 *                 is behind sums up the gap.
 *   Beats         A beat fires on a time, a place or a flag.
 *   Spotlight     Acts and hours for each player, since a point in time.
 *   Reports       A night's summary, and a report of everything since the session ended.
 */

export const LOG_VERSION = 1;
export const LOG_CAP = 1500;
export const HOUR = 3600;

/** What a log entry can be. Fixed list. */
export const KINDS = {
  arrive: "Arrived", travel: "Travel", roll: "Roll", solo: "On their own", cross: "Crossing", ask: "Waiting for you",
  breach: "Masquerade", convene: "Convened", release: "Released", encounter: "Encounter", beat: "Beat", dawn: "Dawn",
  world: "The world", session: "Session", note: "Note"
};

/** What a player may do alone, with the hours it usually takes. Fixed list. */
export const SOLO_KINDS = {
  hunt: {label: "Hunt or feed", hours: 1},
  downtime: {label: "Downtime", hours: 2},
  research: {label: "Research", hours: 2},
  influence: {label: "Use influence or contacts", hours: 1},
  talk: {label: "Talk to someone", hours: 1},
  other: {label: "Something else", hours: 1}
};

/* ------------------------------------------------------------------ */
/*  The log                                                            */
/* ------------------------------------------------------------------ */

export const blankLog = () => ({v: LOG_VERSION, entries: []});

export function normLog(s) {
  const out = s && typeof s === "object" ? {...s} : blankLog();
  out.v = LOG_VERSION;
  out.entries = Array.isArray(out.entries) ? out.entries.filter(e => e && typeof e === "object") : [];
  return out;
}

/** A clean entry: every field a string, a number or null, and the text cut short. */
export function normEntry(e = {}) {
  const str = (v, n = 200) => (v === undefined || v === null ? null : String(v).slice(0, n));
  const kind = KINDS[e.kind] ? e.kind : "note";
  return {
    id: str(e.id, 40), kind,
    at: Number(e.at) || 0,
    personal: e.personal === undefined || e.personal === null ? null : Number(e.personal) || 0,
    actor: str(e.actor, 40), name: str(e.name, 120), user: str(e.user, 40),
    scene: str(e.scene, 120), place: str(e.place, 160),
    text: str(e.text, 400) ?? "",
    hours: Math.max(0, Number(e.hours) || 0),
    attention: e.attention ? str(e.attention, 120) : null,
    night: e.night === undefined || e.night === null ? null : Number(e.night) || 0
  };
}

/** Add an entry, newest first, keeping the log to its cap. Returns a new log. */
export function addEntry(log, e, {cap = LOG_CAP} = {}) {
  const out = normLog(log);
  out.entries = [normEntry(e), ...out.entries].slice(0, cap);
  return out;
}

/**
 * Words in a chat card that need the Storyteller's eye, and what they mean. The first match wins. These follow the
 * names the books and WoDX Actions give these events; they are a net, not a judgment, so the Storyteller reads the card.
 */
export const ATTENTION = [
  [/\b(frenzy|frenzies|r[öo]tschreck|red fear|wassail|fox frenzy|thrall of rage)\b/i, "A frenzy"],
  [/\b(masquerade|breach of the veil|breach)\b/i, "A Masquerade breach"],
  [/\b(degenerat\w*|conscience roll|conviction roll|sin against|a sin\b|loses? a dot of (humanity|the road|the path|road|path))\b/i, "A sin"],
  [/\b(inner voice|the voice proposes|the beast's voice|shadow (speaks|proposes)|torment)\b/i, "A voice's proposal"],
  [/\b(paradox|backlash)\b/i, "Paradox"],
  [/\b(harano|hauglosk)\b/i, "Harano or Hauglosk"],
  [/\b(catharsis|spectre)\b/i, "The Shadow rises"],
  [/\b(banality|bedlam)\b/i, "Banality or Bedlam"],
  [/\b(diablerie|diablerise|amaranth)\b/i, "Diablerie"],
  [/\b(torpor|final death|slain|dies\b|killed)\b/i, "A death or torpor"]
];
export function attentionOf(text) {
  const t = String(text ?? "");
  for ( const [re, why] of ATTENTION ) if ( re.test(t) ) return why;
  return null;
}

/** HTML to one line of plain text. */
export const plain = html => String(html ?? "").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/\s+/g, " ").trim();

/** The entries a filter keeps. Every field is optional; text matches name, place and text, ignoring case. */
export function filterEntries(entries, {actor = null, place = null, kind = null, attention = false, since = null, until = null, text = ""} = {}) {
  const q = String(text ?? "").trim().toLowerCase();
  return (entries ?? []).filter(e => (!actor || e.actor === actor) && (!place || e.place === place || e.scene === place)
    && (!kind || e.kind === kind) && (!attention || !!e.attention)
    && (since === null || e.at >= since) && (until === null || e.at < until)
    && (!q || `${e.name ?? ""} ${e.place ?? ""} ${e.text ?? ""}`.toLowerCase().includes(q)));
}

/* ------------------------------------------------------------------ */
/*  Personal time                                                      */
/* ------------------------------------------------------------------ */

/** A character's time: their own, or the world clock's when they have none. */
export const personalOf = (rec, world) => (rec && Number.isFinite(rec.t) ? rec.t : world);
/** Seconds ahead of the world clock (negative: behind). */
export const aheadOf = (rec, world) => personalOf(rec, world) - world;
/** A record moved on by some seconds. */
export const advance = (rec, seconds, world) => ({...(rec ?? {}), t: personalOf(rec, world) + Math.max(0, Math.round(seconds))});

/**
 * Dawn comes for everyone. When the world clock has passed a dawn that a character's night is still behind, their time
 * catches up to the world clock. lastDawn: the latest dawn at or before the world clock.
 */
export function dawnCatchUp(rec, world, lastDawn) {
  const t = personalOf(rec, world);
  if ( !rec || !Number.isFinite(rec.t) || !Number.isFinite(lastDawn) ) return {rec, caught: false};
  if ( t < lastDawn && lastDawn <= world ) return {rec: {...rec, t: world}, caught: true};
  return {rec, caught: false};
}

/** Should a dawn warning go out? toDawn: seconds to the next dawn from the character's time. Once for each dawn. */
export function dawnWarning(toDawn, dawnAt, warnedFor, lead = HOUR) {
  return Number.isFinite(toDawn) && toDawn > 0 && toDawn <= lead && warnedFor !== dawnAt;
}

/** "1 h 20 min", "45 min", "on time" */
export function spanLabel(seconds) {
  const s = Math.abs(Math.round(seconds));
  if ( s < 60 ) return "on time";
  const h = Math.floor(s / HOUR), m = Math.round((s % HOUR) / 60);
  if ( !h ) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}
export function aheadLabel(seconds) {
  if ( Math.abs(seconds) < 60 ) return "with the clock";
  return `${spanLabel(seconds)} ${seconds > 0 ? "ahead" : "behind"}`;
}

/* ------------------------------------------------------------------ */
/*  Travel                                                             */
/* ------------------------------------------------------------------ */

/** Scenes that are battle maps or tests are not places to travel to. */
export const NOT_A_PLACE = /battle ?map|\bcombat\b|\btest\b|\(gate/i;

/** A place's travel settings, cleaned. */
export function normPlace(p = {}) {
  const routes = {};
  for ( const [k, v] of Object.entries(p.routes ?? {}) ) { const n = Math.round(Number(v)); if ( k && n > 0 ) routes[k] = Math.min(24 * 60, n); }
  const minutes = Math.round(Number(p.minutes));
  return {on: p.on !== false, ask: !!p.ask, minutes: minutes > 0 ? Math.min(24 * 60, minutes) : null, routes,
    table: p.table ? String(p.table) : null, x: Number.isFinite(p.x) ? p.x : null, y: Number.isFinite(p.y) ? p.y : null};
}

/** Minutes from one place to another: the route either way, then the destination's own, then the default. */
export function travelMinutes(from, to, fallback = 30) {
  const a = normPlace(from?.travel ?? {}), b = normPlace(to?.travel ?? {});
  if ( from?.id && b.routes[from.id] ) return b.routes[from.id];
  if ( to?.id && a.routes[to.id] ) return a.routes[to.id];
  if ( b.minutes ) return b.minutes;
  return Math.max(1, Math.round(Number(fallback) || 30));
}

/** One check for each hour or part of an hour on the road. */
export const encounterChecks = minutes => Math.max(0, Math.ceil((Number(minutes) || 0) / 60));

/**
 * Roll the road. chance: percent for each check. At most one encounter a trip; returns the check it came on (0-based)
 * or -1. rand: a function giving [0, 1).
 */
export function rollRoad(minutes, chance, rand = Math.random) {
  const p = Math.max(0, Math.min(100, Number(chance) || 0)) / 100;
  if ( !p ) return -1;
  for ( let i = 0; i < encounterChecks(minutes); i++ ) if ( rand() < p ) return i;
  return -1;
}

/** Does a trip wait for the Storyteller? A locked place, or a trip that would end after dawn for a character the sun burns. */
export function travelNeedsAsk({place, arrive, dawnAt = null, sunBurns = false} = {}) {
  if ( normPlace(place?.travel ?? {}).ask ) return "This place asks the Storyteller first.";
  if ( sunBurns && Number.isFinite(dawnAt) && arrive >= dawnAt ) return "The trip would end after dawn.";
  return null;
}

/* ------------------------------------------------------------------ */
/*  Solo play                                                          */
/* ------------------------------------------------------------------ */

/** May this solo act go ahead? count: solo acts already tonight; limit 0 means no limit. */
export function soloAllowed({count = 0, limit = 0, convened = false} = {}) {
  if ( convened ) return {ok: false, why: "The Storyteller has called this character to a scene. Solo play waits until the scene ends."};
  if ( limit > 0 && count >= limit ) return {ok: false, why: `The Storyteller allows ${limit} solo ${limit === 1 ? "action" : "actions"} a night, and tonight's are used.`};
  return {ok: true, why: null};
}

/** How many solo acts a character has taken in a night. */
export const soloCount = (entries, actor, night) => (entries ?? []).filter(e => e.kind === "solo" && e.actor === actor && e.night === night).length;

/** Hours for a solo act: the player's, or the kind's usual, from a quarter hour to twelve hours. */
export function soloHours(kind, hours) {
  const n = Number(hours);
  const h = Number.isFinite(n) && n > 0 ? n : (SOLO_KINDS[kind]?.hours ?? 1);
  return Math.min(12, Math.max(0.25, Math.round(h * 4) / 4));
}

/* ------------------------------------------------------------------ */
/*  Convening                                                          */
/* ------------------------------------------------------------------ */

/**
 * Line up the chosen characters' times. The scene starts at the latest of their times and the world clock.
 * Returns {target, rows: [{id, from, gap, status}]}: status "ahead" (the latest; they wait for the others),
 * "behind" (they sum up the gap) or "with" (already at the scene's time).
 */
export function reconcile(chars, world) {
  const list = (chars ?? []).map(c => ({id: c.id, from: personalOf(c.rec, world)}));
  const target = Math.max(world, ...list.map(c => c.from));
  const rows = list.map(c => {
    const gap = target - c.from;
    const status = gap >= 60 ? "behind" : (c.from > world + 59 ? "ahead" : "with");
    return {id: c.id, from: c.from, gap, status};
  });
  return {target, rows};
}

/* ------------------------------------------------------------------ */
/*  Beats                                                              */
/* ------------------------------------------------------------------ */

export const BEAT_ON = {time: "A time", place: "A place", flag: "A flag on a character", map: "A change on the map"};

export function normBeat(b = {}) {
  const on = BEAT_ON[b.on] ? b.on : "time";
  return {id: b.id ? String(b.id) : null, name: String(b.name ?? "A beat").slice(0, 120), on,
    time: Number.isFinite(Number(b.time)) ? Number(b.time) : null,
    place: b.place ? String(b.place) : null, actor: b.actor ? String(b.actor) : null,
    flag: b.flag ? String(b.flag).slice(0, 120) : null, value: b.value === undefined || b.value === null || b.value === "" ? null : String(b.value).slice(0, 120),
    convene: Array.isArray(b.convene) ? b.convene.map(String) : [], scene: b.scene ? String(b.scene) : null,
    reason: String(b.reason ?? "").slice(0, 400), fired: !!b.fired, firedAt: Number.isFinite(b.firedAt) ? b.firedAt : null};
}

const getPath = (obj, path) => String(path ?? "").split(".").filter(Boolean).reduce((o, k) => (o === undefined || o === null ? undefined : o[k]), obj);

/**
 * Does a beat fire on an event?
 *   {type: "time", world, personal: {actorId: seconds}}
 *   {type: "place", actor, place}            a character arrives somewhere (place: a scene id or uuid)
 *   {type: "flag", actor, flags}             a character's flags changed
 *   {type: "map", actor, place, kind, state} something changed on the map (WoDX Interactables): the beat's place is
 *                                            the scene, its value (blank: any) the kind of change or the new state
 */
export function beatFires(beat, ev) {
  const b = normBeat(beat);
  if ( b.fired || !ev || b.on !== ev.type ) return false;
  if ( b.on === "time" ) {
    if ( b.time === null ) return false;
    const t = b.actor && ev.personal && Number.isFinite(ev.personal[b.actor]) ? ev.personal[b.actor] : ev.world;
    return t >= b.time;
  }
  if ( b.actor && ev.actor !== b.actor ) return false;
  if ( b.on === "place" ) return !!b.place && (ev.place === b.place || String(ev.place ?? "").endsWith(`.${b.place}`) || String(b.place).endsWith(`.${ev.place}`));
  if ( b.on === "map" ) {
    if ( b.place && !(ev.place === b.place || String(ev.place ?? "").startsWith(`${b.place}.`)) ) return false;
    return b.value === null || b.value === ev.kind || b.value === ev.state;
  }
  if ( b.on === "flag" ) {
    if ( !b.flag ) return false;
    const v = getPath(ev.flags, b.flag);
    return b.value === null ? !!v : String(v) === b.value;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/*  Spotlight and reports                                              */
/* ------------------------------------------------------------------ */

/** A log line for a map event from WoDX Interactables, or null for one not worth the log (a noise nobody heard). */
const MAP_WORDS = {noise: "made a noise at", open: "opened", force: "forced", break: "broke", alarm: "set off the alarm at", theft: "took what was in",
  fire: "set fire to", fireOut: "put out", light: "lit", dark: "put out", desecrate: "desecrated", trap: "set off", disarm: "disarmed", hazard: "was hurt by",
  holy: "stood on", found: "found something at", use: "used"};
export function mapEntry(ev) {
  if ( !ev || ev.undone ) return null;
  if ( ev.kind === "noise" && !(ev.heard ?? []).length ) return null;
  if ( ["hazard", "holy", "light", "dark"].includes(ev.kind) ) return null;
  const big = ["force", "break", "alarm", "theft", "fire", "desecrate"].includes(ev.kind);
  const heard = (ev.heard ?? []).length;
  return {id: `map:${String(ev.message ?? "").slice(0, 40)}`, kind: "world", scene: ev.scene ?? null, place: ev.place ?? null,
    text: `${ev.whoName ?? "Someone"} ${MAP_WORDS[ev.kind] ?? "used"} ${String(ev.objectName ?? "something").toLowerCase()}${heard ? ` (heard by ${heard})` : ""}.`,
    attention: big ? "A change on the map" : null};
}

/** What counts toward a player's share of the spotlight. */
const SPOT = new Set(["solo", "travel", "roll", "arrive", "convene", "encounter", "cross"]);

/**
 * Each player's share since a time: acts (log entries of their characters) and hours (solo and travel time).
 * players: [{id, name}]. Returns rows sorted from the least time to the most, so the quietest comes first.
 */
export function spotlight(entries, players, {since = null} = {}) {
  const rows = new Map((players ?? []).map(p => [p.id, {id: p.id, name: p.name, acts: 0, hours: 0, scenes: 0}]));
  for ( const e of entries ?? [] ) {
    if ( !e.user || !rows.has(e.user) || !SPOT.has(e.kind) ) continue;
    if ( since !== null && e.at < since ) continue;
    const r = rows.get(e.user);
    r.acts += 1;
    r.hours += e.hours || 0;
    if ( e.kind === "convene" ) r.scenes += 1;
  }
  const out = [...rows.values()];
  const most = Math.max(1, ...out.map(r => r.acts));
  for ( const r of out ) { r.hours = Math.round(r.hours * 4) / 4; r.share = Math.round((r.acts / most) * 100); }
  return out.sort((a, b) => a.acts - b.acts || a.hours - b.hours || String(a.name).localeCompare(String(b.name)));
}

/** A night's summary: one line for each character, in the order they first acted. */
export function nightSummary(entries, {since = null, until = null} = {}) {
  const within = filterEntries(entries, {since, until}).slice().reverse();
  const by = new Map();
  for ( const e of within ) {
    if ( !e.actor ) continue;
    if ( !by.has(e.actor) ) by.set(e.actor, {name: e.name ?? "Someone", places: [], rolls: 0, solo: [], attention: []});
    const r = by.get(e.actor);
    if ( e.place && r.places.at(-1) !== e.place ) r.places.push(e.place);
    if ( e.kind === "roll" ) r.rolls += 1;
    if ( e.kind === "solo" ) r.solo.push(e.text);
    if ( e.attention ) r.attention.push(e.attention);
  }
  return [...by.values()].map(r => {
    const bits = [];
    if ( r.places.length ) bits.push(`went to ${r.places.join(", then ")}`);
    if ( r.solo.length ) bits.push(`on their own: ${r.solo.join("; ")}`);
    if ( r.rolls ) bits.push(`${r.rolls} ${r.rolls === 1 ? "roll" : "rolls"}`);
    if ( r.attention.length ) bits.push(`look at: ${[...new Set(r.attention)].join(", ")}`);
    return `${r.name}: ${bits.length ? bits.join("; ") : "nothing logged"}.`;
  });
}

/**
 * The report for the Storyteller of everything since the session ended: who moved, what changed hands, what is brewing.
 *   entries        the log
 *   since          the world time the session ended (null: everything)
 *   sinceReal      the real time (ms) it ended, for the faction log and the queue
 *   factionLog     WoDX NPC's faction turns: [{at, reason, lines: [text]}]
 *   pending        the approval queue: [{title, createdAt}]
 *   breaches       live rumours: [{event, stage}]
 *   beats          beats still to fire: [{name}]
 */
export function sessionReport({entries = [], since = null, factionLog = [], pending = [], breaches = [], beats = []} = {}) {
  const recent = filterEntries(entries, {since});
  const moved = new Map();
  for ( const e of recent.slice().reverse() ) {
    if ( !e.actor || !["arrive", "travel", "cross", "convene"].includes(e.kind) || !e.place ) continue;
    if ( !moved.has(e.actor) ) moved.set(e.actor, {name: e.name ?? "Someone", places: []});
    const r = moved.get(e.actor);
    if ( r.places.at(-1) !== e.place ) r.places.push(e.place);
  }
  const who = [...moved.values()].map(r => `${r.name}: ${r.places.join(", then ")}`);
  const HANDS = /\b(holds|takes|took|lost|loses|gains|gained|seized|changes hands|now holds|founded|joins|joined|leaves|left)\b/i;
  const turns = (factionLog ?? []).filter(t => since === null || (Number(t.at) || 0) >= since);
  const hands = turns.flatMap(t => (t.lines ?? []).filter(l => HANDS.test(l)));
  const otherTurns = turns.flatMap(t => (t.lines ?? []).filter(l => !HANDS.test(l)));
  const attention = recent.filter(e => e.attention).map(e => `${e.name ?? "The world"}: ${e.attention} (${e.text.slice(0, 120)})`);
  const brewing = [
    ...(pending ?? []).map(p => `Waiting for you: ${p.title}`),
    ...(breaches ?? []).map(b => `A rumour: ${b.event}${b.stage ? ` (${b.stage})` : ""}`),
    ...(beats ?? []).map(b => `A beat still to come: ${b.name}`)
  ];
  return [
    {title: "Who moved", lines: who},
    {title: "What changed hands", lines: hands},
    {title: "The factions' other moves", lines: otherTurns},
    {title: "What needs a look", lines: attention},
    {title: "What is brewing", lines: brewing}
  ];
}
