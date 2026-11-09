/**
 * WoDX Interactables 0.9.0: what an object looks like after a change, and what the change means to the world.
 * Pure rules, with no Foundry in them, so the harness can test every one.
 *
 *   States   Each kind of object has a short list of states read from its flags (open, broken, taken, burning ...).
 *            The first is its usual state. A tile can carry a picture for each state; with none set, the map shows a
 *            small marker with the state's word instead, so a change is never invisible.
 *   Events   Every applied result becomes one map event: {kind, scene, place, at, noise, who, object, heard,
 *            supernatural, ...}. Other modules listen for the hook wodxMapEvent and decide what the world does.
 *   Feedback A floating word and a sound radius for each event, played on every client that can see or hear it.
 */

/** The states of each kind of object, the usual one first, with the word shown on the map. Fixed lists. */
export const STATES = {
  door: {closed: "Closed", open: "Open", forced: "Forced", broken: "Broken", breached: "Broken through"},
  container: {closed: "Closed", open: "Open", forced: "Forced", empty: "Emptied"},
  trap: {hidden: "Hidden", found: "Found", sprung: "Sprung", disarmed: "Disarmed"},
  light: {dark: "Dark", lit: "Lit", broken: "Broken"},
  fire: {burning: "Burning", out: "Burnt out"},
  brazier: {upright: "Upright", burning: "Spilled and burning", out: "Spilled, burnt out"},
  sharp: {live: "Broken glass", cleared: "Swept clear"},
  shock: {live: "Live", dead: "Power cut"},
  sacred: {whole: "Whole", desecrated: "Desecrated", taken: "Taken"},
  plain: {plain: ""}
};

/** Which state list an object uses. o: an object from describe*() in interact-rules.mjs. */
export function groupOf(o) {
  if ( !o ) return "plain";
  if ( o.container ) return "container";
  if ( o.trap ) return "trap";
  if ( o.light ) return "light";
  if ( o.hazard ) return o.kind === "brazier" ? "brazier" : o.kind === "sharp" ? "sharp" : o.kind === "shock" ? "shock" : "fire";
  if ( o.sacred ) return "sacred";
  if ( o.clue || o.hide ) return "plain"; // never shown: it would give away a clue or a hidden person
  if ( o.door || o.breakable ) return "door";
  return "plain";
}

/** The state an object is in now. f: the raw flags (a few states live only there, such as a broken lock). */
export function stateOf(o, f = {}) {
  const g = groupOf(o);
  switch ( g ) {
    case "door":
      if ( o.breached ) return "breached";
      if ( o.broken ) return "broken";
      if ( f.lockBroken ) return "forced";
      return o.ds === "open" ? "open" : "closed";
    case "container":
      if ( o.taken ) return "empty";
      if ( f.lockBroken ) return "forced";
      return o.ds === "open" ? "open" : "closed";
    case "trap":
      if ( o.sprung ) return "sprung";
      if ( !o.armed ) return "disarmed";
      return o.found ? "found" : "hidden";
    case "light": return o.broken ? "broken" : o.on ? "lit" : "dark";
    case "fire": return o.burning ? "burning" : "out";
    case "brazier": return !o.spilled ? "upright" : o.burning ? "burning" : "out";
    case "sharp": return o.cleared ? "cleared" : "live";
    case "shock": return o.live ? "live" : "dead";
    case "sacred": return o.taken ? "taken" : o.desecrated ? "desecrated" : "whole";
    default: return "plain";
  }
}

export const usualState = g => Object.keys(STATES[g] ?? STATES.plain)[0];
export const stateWord = (g, s) => (STATES[g] ?? STATES.plain)[s] ?? "";

/** Groups whose objects get no marker: a lamp shows by its light, a trap by its own tile once found. */
const NO_MARKER = new Set(["plain", "light", "trap"]);

/**
 * The picture a tile should show, and whether a marker goes on it.
 *   art: {state: path} set by the Storyteller; base: the tile's own picture before WoDX first changed it.
 * Returns {src, marker: word or ""}. src null: leave the picture as it is.
 */
export function lookFor(g, state, {art = {}, base = null, current = null, markers = true} = {}) {
  const usual = state === usualState(g);
  const own = cleanPath(art?.[state]);
  if ( own ) return {src: own === current ? null : own, marker: ""};
  const back = base && current && current !== base ? base : null;
  const marker = markers && !usual && !NO_MARKER.has(g) ? stateWord(g, state) : "";
  return {src: back, marker};
}

/** A file path a Storyteller typed or picked: trimmed, no quotes or angle brackets, at most 400 characters. */
export function cleanPath(p) {
  const s = String(p ?? "").trim().replace(/["'<>]/g, "");
  return s ? s.slice(0, 400) : "";
}
/** The art map from a form: only the states the group has, only non-empty paths. */
export function cleanArt(g, art = {}) {
  const out = {};
  for ( const k of Object.keys(STATES[g] ?? {}) ) { const p = cleanPath(art?.[k]); if ( p ) out[k] = p; }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Events                                                             */
/* ------------------------------------------------------------------ */

/** What can happen on the map. Fixed list; the hook passes the key. */
export const EVENT_KINDS = {
  noise: "A noise", open: "Opened", force: "Forced", break: "Broken", alarm: "An alarm", theft: "Taken", fire: "Set alight",
  fireOut: "Put out", light: "A light lit", dark: "A light out", desecrate: "Desecrated", trap: "A trap sprung", disarm: "A trap disarmed",
  hazard: "Hurt by a hazard", holy: "Holy ground", found: "Found", use: "Used"
};

const OPEN_OPS = new Set(["open", "openQuiet", "pick", "key", "unlock", "unbar", "hack", "heave", "unstick"]);
const FORCE_OPS = new Set(["force", "kick", "ram", "breach"]);
/**
 * The kind of a map event from a card. op: the option's id; result: done | progress | fail | botch;
 * before and after: the object's state before and after; extra: {alarm, waiting, noise}.
 * Null when nothing worth telling the world happened (a silent failure, a look, a listen).
 */
export function eventKind(op, result, before, after, extra = {}) {
  if ( op === "spring" ) return "trap";
  if ( op === "hazard" ) return "hazard";
  if ( op === "holy" ) return "holy";
  if ( extra.alarm ) return "alarm";
  if ( op === "search" || op === "searchHide" ) return extra.found ? "found" : null;
  const changed = before !== after || !!extra.waiting;
  if ( (result === "done" || result === "botch") && changed ) {
    if ( after === "breached" || extra.waiting ) return "break";
    if ( after === "broken" ) return "break";
    if ( after === "forced" || FORCE_OPS.has(op) ) return "force";
    if ( after === "empty" || after === "taken" ) return "theft";
    if ( after === "desecrated" ) return "desecrate";
    if ( after === "burning" ) return "fire";
    if ( after === "out" && before === "burning" ) return "fireOut";
    if ( after === "lit" ) return "light";
    if ( after === "dark" ) return "dark";
    if ( after === "disarmed" ) return "disarm";
    if ( after === "sprung" ) return "trap";
    if ( after === "open" || OPEN_OPS.has(op) ) return "open";
    return "use";
  }
  if ( result === "done" && op === "take" ) return "theft";
  if ( extra.noise && extra.noise !== "silent" ) return "noise";
  return null;
}

/** Events that point to something no mortal did. */
const SUPERNATURAL = new Set(["desecrate", "holy"]);
export const isSupernatural = (kind, {power = false} = {}) => SUPERNATURAL.has(kind) || !!power;

/**
 * One map event, cleaned. Every field a string, number, boolean, list of strings or null, so it can be saved and sent.
 */
export function mapEvent(e = {}) {
  const str = (v, n = 200) => (v === undefined || v === null || v === "" ? null : String(v).slice(0, n));
  const kind = EVENT_KINDS[e.kind] ? e.kind : "use";
  return {
    v: 1, kind, scene: str(e.scene, 40), place: str(e.place, 80), at: Number(e.at) || 0,
    noise: ["silent", "quiet", "loud"].includes(e.noise) ? e.noise : "silent",
    who: str(e.who, 120), whoName: str(e.whoName, 80), object: str(e.object, 40), objectName: str(e.objectName, 80),
    objectType: e.objectType === "Wall" ? "Wall" : "Tile", state: str(e.state, 20), before: str(e.before, 20),
    x: Number.isFinite(Number(e.x)) ? Math.round(Number(e.x)) : null, y: Number.isFinite(Number(e.y)) ? Math.round(Number(e.y)) : null,
    owner: str(e.owner, 80), placeKind: str(e.placeKind, 40), heard: (Array.isArray(e.heard) ? e.heard : []).map(h => String(h).slice(0, 120)).slice(0, 40),
    supernatural: !!e.supernatural, message: str(e.message, 40), undone: !!e.undone
  };
}

/* ------------------------------------------------------------------ */
/*  Feedback                                                           */
/* ------------------------------------------------------------------ */

/** The word that floats over the object for each event; empty: none. Fixed list. */
export const EVENT_WORDS = {
  open: "Opened", force: "Forced", break: "Smashed", alarm: "Alarm!", theft: "Taken", fire: "Alight", fireOut: "Put out",
  light: "", dark: "", desecrate: "Desecrated", trap: "Sprung!", disarm: "Disarmed", hazard: "", holy: "", found: "Found", use: "", noise: ""
};
/** How far a one-shot sound carries, in yards, by the noise rating (the same earshot as hearing). */
export const SOUND_YARDS = {silent: 3, quiet: 5, loud: 30};

/** The effects settings a player can choose. Fixed list. */
export const EFFECTS = {full: "Full: words, flashes and sounds", light: "Light: words and sounds", off: "Off: only the lasting change"};

/**
 * What one client plays for one event. effects: the player's choice; sees: the client can see the spot (or is the
 * Storyteller); src: the object's sound for a change, if any.
 * Returns {word, flash, sound: {src, yards} | null}.
 */
export function feedbackFor(ev, {effects = "full", sees = true, src = ""} = {}) {
  const none = {word: "", flash: false, sound: null};
  if ( !ev || ev.undone || effects === "off" ) return none;
  const sound = cleanPath(src) && ev.kind !== "noise" ? {src: cleanPath(src), yards: SOUND_YARDS[ev.noise] ?? 3} : null;
  if ( !sees ) return {...none, sound};
  return {word: EVENT_WORDS[ev.kind] ?? "", flash: effects === "full" && ev.noise === "loud", sound};
}

/** Whether a sound tied to an object plays in this state: a fire while burning, a wire while live, an alarm while ringing. */
export function soundOn(g, state, {alarm = false} = {}) {
  if ( alarm ) return true;
  return (g === "fire" || g === "brazier") ? state === "burning" : g === "shock" ? state === "live" : g === "light" ? state === "lit" : false;
}
