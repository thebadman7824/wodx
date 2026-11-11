/**
 * WoDX NPC 0.4.0: how a place takes an alarm, and how NPCs answer what happens on the map. Pure rules, no Foundry.
 *
 *   Alarm   A place (a scene) raised to alarm stays so for an hour of world time, then wary until the next dusk, then
 *           calm. Raising it again while it holds starts the hour over. House figures.
 *   Wary    Watchers there notice more easily: difficulty 5 when wary, 4 during the alarm (6 when calm). House figures.
 *   Map events  An event from WoDX Interactables (hook wodxMapEvent) names who heard it. Each who heard reacts by
 *           their profile; one asleep wakes instead, and reacts to the next thing they hear. An alarm raised by a
 *           keypad, bell or the Storyteller puts the place on alarm at once.
 */

export const ALARM_SECONDS = 3600;
export const LEVELS = {calm: "Calm", wary: "Wary", alarm: "Alarm"};
export const NOTICE_DIFF = {calm: 6, wary: 5, alarm: 4};

/** An alert as saved on a scene, cleaned. */
export function normAlert(a) {
  if ( !a || typeof a !== "object" ) return null;
  const n = v => Number(v) || 0;
  return {cause: String(a.cause ?? "").slice(0, 160), since: n(a.since), until: n(a.until), waryUntil: Math.max(n(a.waryUntil), n(a.until)), shown: LEVELS[a.shown] ? a.shown : "alarm"};
}

/** Raise an alarm at a place. toDusk(t): seconds from t to the next dusk (from the Chronicle calendar). */
export function raise(cur, {now = 0, cause = "", toDusk = () => 12 * 3600} = {}) {
  const until = now + ALARM_SECONDS;
  const waryUntil = until + Math.max(0, Number(toDusk(until)) || 0);
  const old = normAlert(cur);
  return {cause: String(cause || old?.cause || "").slice(0, 160), since: old && levelAt(old, now) !== "calm" ? old.since : now, until, waryUntil: Math.max(waryUntil, old?.waryUntil ?? 0), shown: "alarm"};
}

/** The level of a place's alert at a time. */
export function levelAt(alert, now = 0) {
  const a = normAlert(alert);
  if ( !a ) return "calm";
  if ( now < a.until ) return "alarm";
  if ( now < a.waryUntil ) return "wary";
  return "calm";
}

/** What the clock did to an alert: {level, changed, text} where text is the note for the Storyteller, if any. */
export function fade(alert, now, placeName = "the place") {
  const a = normAlert(alert);
  if ( !a ) return {level: "calm", changed: false, text: ""};
  const level = levelAt(a, now);
  if ( level === a.shown ) return {level, changed: false, text: ""};
  const text = level === "wary" ? `The alarm at ${placeName} dies down. The place stays wary until the next dusk.`
    : level === "calm" ? `${placeName} is calm again.` : `${placeName} is on alarm.`;
  return {level, changed: true, text};
}

/** Map events that raise the alarm by themselves, without anyone deciding to. */
export const RAISES = new Set(["alarm"]);

/**
 * Who among the hearers of a map event reacts, and who only wakes.
 * hearers: [{uuid, asleep, down}]. Returns {react: [uuid], wake: [uuid]}.
 */
export function sortHearers(hearers = []) {
  const out = {react: [], wake: []};
  for ( const h of hearers ) {
    if ( !h || h.down ) continue;
    (h.asleep ? out.wake : out.react).push(h.uuid);
  }
  return out;
}

/** The headline of a reaction card for a map event. */
export function eventHead(ev, whoName) {
  const what = ev.objectName ? ev.objectName.toLowerCase() : "something";
  const did = {noise: "a noise at", open: "opening", force: "forcing", break: "breaking", alarm: "an alarm at", theft: "taking from",
    fire: "setting fire to", desecrate: "desecrating", trap: "a trap going off at", use: "using", call: "a call on", crash: "a crash with", ride: "racing"}[ev.kind] ?? "something at";
  return `${whoName ?? "Someone"}: ${did} ${what}`.replace(/\s+/g, " ").trim();
}

/** The situation for the reaction rules, from a map event and the clock. */
export function eventSituation(ev, {night = false, curfew = false, weapon = false} = {}) {
  return {night, curfew, trespass: ["force", "break", "theft", "open", "desecrate", "fire"].includes(ev.kind), weapon, supernatural: !!ev.supernatural};
}

/* ------------------------------------------------------------------ */
/*  Marks and repairs                                                  */
/* ------------------------------------------------------------------ */

/** What gets put right, and how it reads. A fire, a theft or a desecration stays until the Storyteller says. */
export const REPAIRS = {force: "relocked", break: "mended"};

/**
 * The mark a map event leaves on a place, or null. toDawn(t): seconds from t to the next dawn. A forced door or a
 * broken pane is put right at the next dawn when someone lives or works there (owned: true). House reading.
 */
export function markFor(ev, {owned = false, toDawn = () => 6 * 3600} = {}) {
  if ( !ev || ev.undone || !REPAIRS[ev.kind] || !ev.object || ev.state === "breached" ) return null;
  const at = Number(ev.at) || 0;
  return {id: String(ev.message ?? `${ev.object}:${at}`).slice(0, 60), object: String(ev.object).slice(0, 40), objectType: ev.objectType === "Wall" ? "Wall" : "Tile",
    objectName: String(ev.objectName ?? "").slice(0, 80), kind: ev.kind, at, repairAt: owned ? at + Math.max(60, Number(toDawn(at)) || 0) : null};
}
/** The marks that are due for repair at a time. */
export const dueMarks = (marks = [], now = 0) => (marks ?? []).filter(m => m && m.repairAt !== null && m.repairAt !== undefined && m.repairAt <= now);

/* ------------------------------------------------------------------ */
/*  Alarm carriers and trigger regions                                 */
/* ------------------------------------------------------------------ */

/**
 * How an alarm reaches another place. A bell or a shout carries at once to a place within earshot; a telephone from
 * about 1890 and a radio from about 1930 (the same dates as WoDX Interactables' watch points); a runner takes the
 * trip's minutes (the route's, else the setting's). House figures.
 */
export const CARRIERS = {
  bell: {label: "A bell, horn or shout (at once)", from: null, runner: false},
  phone: {label: "A telephone (from about 1890)", from: 1890, runner: false},
  radio: {label: "A radio (from about 1930)", from: 1930, runner: false},
  runner: {label: "A runner (the trip's minutes)", from: null, runner: true}
};

/**
 * Can a carrier take an alarm, and when does it arrive? year: the chronicle's year (0: unknown, allowed).
 * minutes: the zone's own figure (0: the trip's). tripMinutes: the route's or the setting's.
 * Returns {ok, why, seconds}.
 */
export function carryPlan(carrier, {year = 0, minutes = 0, tripMinutes = 30} = {}) {
  const c = CARRIERS[carrier] ?? CARRIERS.bell;
  if ( c.from && year && year < c.from ) return {ok: false, why: `there is no ${carrier === "phone" ? "telephone" : "radio"} before about ${c.from}`, seconds: 0};
  const m = Math.max(0, Number(minutes) || 0);
  const seconds = c.runner ? Math.max(60, (m || Math.max(1, Number(tripMinutes) || 30)) * 60) : m * 60;
  return {ok: true, why: "", seconds};
}

/** A carried alarm waiting on the road, cleaned. */
export function normCarry(c = {}) {
  const str = (v, n = 120) => (v === undefined || v === null || v === "" ? null : String(v).slice(0, n));
  return {to: str(c.to), from: str(c.from), fromName: str(c.fromName, 80), carrier: CARRIERS[c.carrier] ? c.carrier : "runner", at: Number(c.at) || 0, raisedAt: Number(c.raisedAt) || 0};
}
export const dueCarries = (list = [], now = 0) => (list ?? []).map(normCarry).filter(c => c.to && c.at <= now);

/** The scenes an Alert zone sends its alarm to: names, ids or UUIDs separated by commas, never the place itself. */
export function carryTargets(text, scenes = [], selfId = null) {
  const want = String(text ?? "").split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  const out = [];
  for ( const w of want ) {
    const lw = w.toLowerCase();
    const s = scenes.find(x => x.uuid === w || x.id === w) ?? scenes.find(x => String(x.name ?? "").toLowerCase() === lw)
      ?? scenes.find(x => String(x.name ?? "").toLowerCase().includes(lw));
    if ( s && s.id !== selfId && !out.includes(s) ) out.push(s);
  }
  return out;
}

/** What a WoDX: Trigger region does when someone walks in. Fixed list. */
export const TRIGGER_DOES = {note: "Tell the Storyteller", alarm: "Raise the alarm", event: "Only pass it on (for beats and the log)"};

/** Does a trigger region fire for this token? r: the behaviour's settings; t: {pc, npc, hidden}. */
export function triggerFires(r = {}, t = {}) {
  if ( r.once && r.fired ) return false;
  if ( (r.who ?? "pcs") === "pcs" && !t.pc ) return false;
  return true;
}

/** The map event for a trigger region, in the same shape as WoDX Interactables' events. */
export function triggerEvent({does = "note", label = "", scene = null, place = null, region = null, regionName = "", who = null, whoName = null, at = 0, x = null, y = null} = {}) {
  const str = (v, n = 120) => (v === undefined || v === null || v === "" ? null : String(v).slice(0, n));
  const name = str(label, 80) ?? str(regionName, 80) ?? "a marked spot";
  return {v: 1, kind: does === "alarm" ? "alarm" : "trigger", scene: str(scene, 40), place: str(place), at: Number(at) || 0, noise: does === "alarm" ? "loud" : "silent",
    who: str(who), whoName: str(whoName, 80), object: str(region, 40), objectName: name, objectType: "Region", objectKind: "trigger", state: name.toLowerCase().slice(0, 60),
    before: null, x: Number.isFinite(Number(x)) ? Math.round(Number(x)) : null, y: Number.isFinite(Number(y)) ? Math.round(Number(y)) : null,
    owner: null, placeKind: null, heard: [], supernatural: false, message: null, undone: false};
}

/* ------------------------------------------------------------------ */
/*  Households that answer together (NPC 0.9.0)                        */
/* ------------------------------------------------------------------ */

/**
 * A household is a name the Storyteller gives NPCs who stand by each other: a family on a farm, a coterie, a pack, a
 * chantry's apprentices, a guild workshop, a gang. When one is hurt, the others within call come. The call is a
 * voice: it reaches as far as the setting says (40 yards by default, a house figure) in any era; further than that,
 * an Alert zone carries the alarm by the era's own means.
 */
export const normHousehold = v => String(v ?? "").trim().toLowerCase().slice(0, 60);

/** Who answers. victim: {id, household}; others: [{id, name, household, yards, pc, down, inFight}]. */
export function kinToAnswer(victim = {}, others = [], {reach = 40} = {}) {
  const h = normHousehold(victim.household);
  if ( !h ) return [];
  return (others ?? []).filter(t => t && t.id !== victim.id && !t.pc && !t.down && !t.inFight && normHousehold(t.household) === h
    && Number.isFinite(Number(t.yards)) && Number(t.yards) <= reach).sort((a, b) => a.yards - b.yards);
}
