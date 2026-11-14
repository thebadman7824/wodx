/**
 * How much runs by itself, the pure rules (WoDX Chronicle 0.46.0, B2450-B2451). Three levels set many modules'
 * settings and the approval queue's standing rules at once:
 *   handsOn   today's values: whatever the Storyteller had set before a level was first chosen
 *   balanced  the Auto choices that come with an undo card, and the per-kind queue table below
 *   handsOff  everything acts by itself, as in the Lone Chronicle, without its hidden seat
 * The values before the first change are kept ("base") and Hands on puts them back, except where the Storyteller has
 * changed a setting by hand since. No Foundry here: the harness tests every function.
 */
import {NEVER_AUTO} from "./approvals-rules.mjs";

export const LEVELS = ["handsOn", "balanced", "handsOff"];
export const LEVEL_LABELS = {
  handsOn: "Hands on (as you set things)",
  balanced: "Balanced (small things run by themselves)",
  handsOff: "Hands off (everything runs by itself)"
};

/** What each level sets. A setting a level does not name keeps its base value. */
const BALANCED = [
  {mod: "wodx-npc", key: "mode", to: "auto", what: "NPCs in combat act, with an undo card"},
  {mod: "wodx-npc", key: "routineMode", to: "auto", what: "routines and reactions run, with an undo card"},
  {mod: "wodx-npc", key: "factionMode", to: "auto", what: "small faction changes apply, with an undo card"},
  {mod: "wodx-combat", key: "fightStart", to: "auto", what: "fights start by themselves, with Undo"},
  {mod: "wodx-combat", key: "fightEnd", to: "auto", what: "fights end by themselves"},
  {mod: "wodx-storyteller", key: "marketTurn", to: "auto", what: "markets move each week, with an Undo card"},
  {mod: "wodx-storyteller", key: "marketMoves", to: "auto", what: "factions act on markets, with an Undo card"}
];
const HANDS_OFF = [
  ...BALANCED,
  {mod: "wodx-combat", key: "turnConductor", to: "everyone", what: "every turn ends itself"},
  {mod: "wodx-actions", key: "dawnDusk", to: "auto", what: "New Night runs at dusk"},
  {mod: "wodx-actions", key: "sunDamage", to: "apply", what: "sunlight is rolled and applied"},
  {mod: "wodx-storyteller", key: "nightDraw", to: true, what: "the night is drawn at dusk"},
  {mod: "wodx-targeting", key: "mode", to: "everyone", what: "targeting picks by itself, for players too"},
  {mod: "wodx-chronicle", key: "rule.lightTouch", to: false, what: "light-touch mode is off"},
  {mod: "wodx-chronicle", key: "npcCap", to: 0, what: "no cap on NPC proposals"}
];
export const SETTINGS = {handsOn: [], balanced: BALANCED, handsOff: HANDS_OFF};
/** Every setting any level touches, once. */
export const TOUCHED = [...new Map(HANDS_OFF.map(p => [`${p.mod}.${p.key}`, p])).values()];

/**
 * The queue at the Balanced level, kind by kind (desk items q1 to q32, all picked as recommended on 12 November):
 * auto = approved on sight, small = approved when the kind's own rule calls it small, else queued; wait = queued.
 * A kind not named here waits. At Hands off every kind but a player's request is approved on sight.
 */
export const QUEUE = {
  // Chronicle
  "era-change": "wait", "tile-anchors-v14": "wait", "wodx-chronicle.traitPrompt": "small",
  "wodx-chronicle.sigCorrupt": "wait", "wodx-chronicle.sigVice": "wait", "wodx-chronicle.sigCause": "wait",
  "wodx-chronicle.sigFamily": "wait", "wodx-chronicle.podTeach": "wait", "wodx-chronicle.podLifepath": "wait",
  // Actions, Interactables
  "wodx-actions.effect": "small", "wodx-voice": "wait", "wodx-interactables.breach": "auto",
  // NPC
  "wodx-npc.attitude": "small", "wodx-npc.faction": "small", "wodx-npc.order": "wait",
  // Creation
  "xp-spend": "small", "wodx-lifepath-people": "auto", "wodx-people": "auto", "wodx-first-night-step": "auto",
  "wodx-first-night-hook": "wait",
  // Storyteller
  "wodx-storyteller.inherit": "wait", "wodx-storyteller.succeed": "wait", "wodx-storyteller.night": "auto",
  "wodx-storyteller.aid": "wait", "wodx-storyteller.market": "small", "wodx-storyteller.marketMove": "small",
  "wodx-storyteller.time": "small", "wodx-storyteller.travel": "small", "wodx-storyteller.encounter": "wait",
  "wodx-storyteller.solo": "auto", "wodx-storyteller.beat": "auto", "wodx-storyteller.build": "wait",
  "wodx-storyteller.between": "auto", "wodx-storyteller.heat": "wait", "wodx-storyteller.downtime": "small",
  // Otherworlds
  "wodx-disembodiment": "wait", "wodx-otherworlds.journey": "small", "wodx-umbra-year": "wait", "wodx-otherworlds.drift": "auto"
};
export const QUEUE_WORDS = {auto: "on its own", small: "on its own when small", wait: "waits"};

/** The standing rules a level gives: {type: true} approves on sight, {type: "small"} approves small ones. */
export function queueRules(level, types = [], base = {}) {
  const out = {};
  for ( const [k, v] of Object.entries(base ?? {}) ) if ( v === true || v === "small" ) out[k] = v;
  if ( level === "handsOn" || !LEVELS.includes(level) ) return out;
  const known = (types ?? []).map(t => (typeof t === "string" ? t : t?.type)).filter(Boolean);
  for ( const t of new Set([...known, ...Object.keys(QUEUE)]) ) {
    if ( NEVER_AUTO.includes(t) || out[t] === true ) continue;
    const how = level === "handsOff" ? "auto" : (QUEUE[t] ?? "wait");
    if ( how === "auto" ) out[t] = true;
    else if ( how === "small" ) out[t] = "small";
  }
  return out;
}

const key = p => `${p.mod}.${p.key}`;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The plan for a move to a level. read(mod, key) gives the present value, or undefined when the setting is not there.
 * base: what was kept at the first move away from Hands on ({at, values: {"mod.key": v}, set: {"mod.key": v}, auto}).
 * @returns {{changes: {mod, key, from, to, what}[], kept: {mod, key, now}[], missing: {mod, key}[], base, auto}}
 *   changes  what to set now; kept  what the Storyteller changed by hand and is left alone; base  the base to store
 *   ({} at Hands on); auto  the standing rules to store
 */
export function planLevel(level, read, {base = {}, types = [], autoNow = {}} = {}) {
  const lv = LEVELS.includes(level) ? level : "handsOn";
  const changes = [], kept = [], missing = [];
  const fresh = !base?.at;
  const b = fresh ? {at: 1, values: {}, set: {}, auto: {...(autoNow ?? {})}} : structuredClone(base);
  if ( fresh && lv === "handsOn" ) return {changes, kept, missing, base: {}, auto: {...(autoNow ?? {})}};
  const want = new Map(SETTINGS[lv].map(p => [key(p), p]));
  for ( const p of TOUCHED ) {
    const k = key(p), now = read(p.mod, p.key);
    if ( now === undefined ) { if ( want.has(k) ) missing.push({mod: p.mod, key: p.key}); continue; }
    if ( fresh ) b.values[k] = now;
    if ( !(k in b.values) ) b.values[k] = now;
    // A value moved by hand since the last level was set is the Storyteller's: keep it and make it the base
    if ( k in b.set && !same(now, b.set[k]) ) { kept.push({mod: p.mod, key: p.key, now}); b.values[k] = now; delete b.set[k]; continue; }
    const to = want.has(k) ? want.get(k).to : b.values[k];
    if ( !same(now, to) ) changes.push({mod: p.mod, key: p.key, from: now, to, what: want.get(k)?.what ?? "back as you had it"});
    if ( want.has(k) ) b.set[k] = to; else delete b.set[k];
  }
  const auto = queueRules(lv, types, b.auto);
  if ( lv === "handsOn" ) return {changes, kept, missing, base: {}, auto: {...(b.auto ?? {})}};
  return {changes, kept, missing, base: b, auto};
}

/** One line per change, for the card the Storyteller sees before and after a move. */
export const describe = changes => (changes ?? []).map(c => c.what);

/** How the standing rules differ: kinds now on sight, now small-only, now waiting again. */
export function queueDiff(before = {}, after = {}) {
  const on = [], small = [], off = [];
  for ( const k of new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]) ) {
    const a = before?.[k], b = after?.[k];
    if ( a === b ) continue;
    if ( b === true ) on.push(k); else if ( b === "small" ) small.push(k); else off.push(k);
  }
  return {on, small, off};
}
