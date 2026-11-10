/**
 * WoDX Storyteller 0.1.0: the open world at the table. The rules are in world-rules.mjs; this file reads and writes
 * Foundry: the log, personal times, travel, solo play, convening, beats, dawn and the session report.
 *
 * Only the active Storyteller's client writes the world settings. A player's travel or solo request goes to it by
 * socket, and it answers by socket (pull the player's view to a new scene, or say why it waited).
 *
 * Small and big changes follow the open-world line: a player's own trip and solo act resolve at once (a locked place
 * asks first), while anything automation does to a player character (an encounter on the road, a beat that calls
 * characters together, a solo result that changes the world) waits in the approval queue.
 */
import * as W from "./world-rules.mjs";
import {secondsToNextDawn, secondsToNextDusk, describeTime} from "../../wodx-chronicle/scripts/calendar.mjs";

export const MOD = "wodx-storyteller";
export const SOCKET = `module.${MOD}`;
export const VERSION = "0.18.3";
export const T = {travel: `${MOD}.travel`, encounter: `${MOD}.encounter`, solo: `${MOD}.solo`, beat: `${MOD}.beat`};

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
export const chron = () => game.modules?.get?.("wodx-chronicle")?.api ?? null;
export const npc = () => game.modules?.get?.("wodx-npc")?.api ?? null;
export const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
export const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return null; } };
const all = c => c?.contents ?? [...(c?.values?.() ?? c ?? [])];
const now = () => game.time?.worldTime ?? 0;
const latitude = () => { try { return Number(game.settings.get("wodx-chronicle", "latitude")) || 50.1; } catch (e) { return 50.1; } };
const listeners = new Set();
/** Windows that show the open world redraw when it changes. */
export const onChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export const changed = () => { for ( const fn of listeners ) { try { fn(); } catch (e) { console.error(`${MOD} |`, e); } } };

/* ------------------------------------------------------------------ */
/*  Settings                                                           */
/* ------------------------------------------------------------------ */

export function registerSettings() {
  const hidden = (key, def) => game.settings.register(MOD, key, {scope: "world", config: false, type: Object, default: def, onChange: () => changed()});
  hidden("log", W.blankLog());
  hidden("personal", {});
  hidden("beats", []);
  hidden("convened", {});
  hidden("session", {at: null, real: null});
  const num = (key, name, hint, def, range) => game.settings.register(MOD, key, {name, hint, scope: "world", config: true, type: Number, default: def, range});
  const bool = (key, name, hint, def) => game.settings.register(MOD, key, {name, hint, scope: "world", config: true, type: Boolean, default: def});
  num("travelMinutes", "Minutes for a trip", "How long a trip takes when neither the route nor the place says.", 30, {min: 1, max: 600, step: 1});
  bool("encounters", "Encounters on the road", "Each hour on the road may turn up an encounter, drawn from the place's table or the world's. It waits in the approval queue.", true);
  num("encounterChance", "Encounter chance (percent an hour)", "The chance for each hour or part of an hour on the road.", 10, {min: 0, max: 100, step: 1});
  game.settings.register(MOD, "encounterTable", {name: "Encounter table", hint: "The name of a roll table to draw road encounters from, when the place has none of its own.",
    scope: "world", config: true, type: String, default: ""});
  num("soloLimit", "Solo actions a night", "How many solo actions each character may take in a night. 0 means no limit.", 0, {min: 0, max: 20, step: 1});
  num("dawnLead", "Dawn warning (minutes)", "How long before dawn a character's player is warned.", 60, {min: 10, max: 240, step: 5});
  bool("beatsOn", "Beats", "Beats fire on their time, place or flag. Off: they wait until the Storyteller turns this back on.", true);
}

/* ------------------------------------------------------------------ */
/*  The state (the active Storyteller writes it, one write at a time)  */
/* ------------------------------------------------------------------ */

let saving = Promise.resolve();
/** Change a world setting with a function of its latest value, in the queue of writes. */
export function mutate(key, fn) {
  let result;
  saving = saving.then(async () => {
    const cur = foundry.utils.deepClone(setting(key));
    const out = await fn(cur);
    result = out?.result;
    if ( out && "value" in out ) await game.settings.set(MOD, key, out.value);
  }).catch(e => console.error(`${MOD} |`, e));
  return saving.then(() => { changed(); return result; });
}
export const logState = () => W.normLog(setting("log"));
export const entries = () => logState().entries;
export const personalMap = () => setting("personal") ?? {};
export const beats = () => (setting("beats") ?? []).map(W.normBeat);
export const convenedMap = () => setting("convened") ?? {};
/** Players marked away for this session (the "Absent tonight" window); cleared when the session ends. */
export const absentIds = () => Object.entries(setting("absent") ?? {}).filter(([, v]) => v).map(([k]) => k);

/** Add a line to the log (the active Storyteller only; other clients drop it). */
export async function log(e) {
  if ( !isActiveGM() ) return;
  const entry = {id: foundry.utils.randomID(), at: now(), ...e};
  if ( entry.actor && entry.personal === undefined ) entry.personal = personalTime(entry.actor);
  await mutate("log", cur => ({value: W.addEntry(cur, entry)}));
  return entry;
}

/* ------------------------------------------------------------------ */
/*  Characters                                                         */
/* ------------------------------------------------------------------ */

/** Player characters: actors a player owns, groups left out. */
export const isPC = a => !!a && a.hasPlayerOwner && !/group/i.test(String(a.type ?? ""));
export const pcs = () => all(game.actors).filter(isPC);
/** The player who owns a character (the first non-GM owner). */
export function ownerOf(actor) {
  const owners = all(game.users).filter(u => !u.isGM && (actor?.testUserPermission?.(u, "OWNER") || actor?.ownership?.[u.id] === 3));
  return owners.find(u => u.character?.id === actor?.id) ?? owners[0] ?? null;
}
/** Where a character's token is: the scene the owner is viewing that holds one, else the first that does. */
export function whereIs(actor, {preferScene = null} = {}) {
  const scenes = all(game.scenes);
  const holds = s => all(s.tokens).some(t => t.actorId === actor?.id);
  const pref = preferScene ? scenes.find(s => s.id === preferScene && holds(s)) : null;
  return pref ?? scenes.find(s => s.active && holds(s)) ?? scenes.find(holds) ?? null;
}
export const sceneName = s => s?.navName || s?.name || "somewhere";
export const sunBurns = actor => {
  const kind = game.wodxCombat?.getKind?.(actor);
  return kind ? ["kindred", "kuei-jin"].includes(kind) : actor?.type === "Vampire";
};

/* ------------------------------------------------------------------ */
/*  Personal time and dawn                                             */
/* ------------------------------------------------------------------ */

export const personalTime = actorId => W.personalOf(personalMap()[actorId], now());
export async function setPersonal(actorId, t) {
  return mutate("personal", cur => ({value: {...(cur ?? {}), [actorId]: {...(cur?.[actorId] ?? {}), t: Math.round(t)}}}));
}
export async function advancePersonal(actorId, seconds) {
  return mutate("personal", cur => { const next = {...(cur ?? {})}; next[actorId] = W.advance(next[actorId], seconds, now()); return {value: next, result: next[actorId].t}; });
}
/** The next dawn after a time, as a world time. */
export const dawnAfter = t => t + secondsToNextDawn(t, latitude());
/** The latest dawn at or before a time. */
export function dawnBefore(t) {
  const at = dawnAfter(t - 86400);
  return at <= t ? at : at - 86400;
}
/** The night a time belongs to: the dusk that began it. */
export function nightOf(t) {
  const at = (t - 86400) + secondsToNextDusk(t - 86400, latitude());
  return at <= t ? at : at - 86400;
}
export const timeLabel = t => { try { const d = describeTime(t, latitude()); return `${d.timeLabel}, ${d.day} ${d.monthName}`; } catch (e) { return String(t); } };

/** When the world clock moves: nights a dawn has ended catch up, and players near dawn are warned. */
export async function onClock() {
  if ( !isActiveGM() ) return;
  const world = now(), lastDawn = dawnBefore(world);
  const caught = [];
  await mutate("personal", cur => {
    const next = {...(cur ?? {})};
    for ( const [id, rec] of Object.entries(next) ) {
      const r = W.dawnCatchUp(rec, world, lastDawn);
      if ( r.caught ) { next[id] = r.rec; caught.push(id); }
    }
    return caught.length ? {value: next} : null;
  });
  for ( const id of caught ) {
    const a = game.actors?.get(id);
    await log({kind: "dawn", actor: id, name: a?.name, user: ownerOf(a)?.id, text: "Dawn came while this character's night was behind the clock, so their time caught up."});
  }
  await dawnWarnings();
  await checkBeats({type: "time", world, personal: Object.fromEntries(Object.entries(personalMap()).map(([k, v]) => [k, v.t]))});
}

/** Warn each player once a dawn, when their character's time is within the warning of it. */
export async function dawnWarnings() {
  if ( !isActiveGM() ) return;
  const lead = (Number(setting("dawnLead")) || 60) * 60;
  const map = personalMap();
  const warn = [];
  for ( const a of pcs() ) {
    const t = W.personalOf(map[a.id], now());
    const dawnAt = dawnAfter(t);
    if ( W.dawnWarning(dawnAt - t, dawnAt, map[a.id]?.warned, lead) ) warn.push({a, t, dawnAt});
  }
  if ( !warn.length ) return;
  await mutate("personal", cur => {
    const next = {...(cur ?? {})};
    for ( const {a, dawnAt} of warn ) next[a.id] = {...(next[a.id] ?? {}), warned: dawnAt};
    return {value: next};
  });
  for ( const {a, t, dawnAt} of warn ) {
    const u = ownerOf(a);
    await ChatMessage.create({
      content: `<div class="wodx-card wstory"><p><strong>Dawn is near.</strong> ${esc(a.name)} has ${esc(W.spanLabel(dawnAt - t))} before sunrise (${esc(timeLabel(dawnAt))}).</p></div>`,
      whisper: [u?.id, ...gmIds()].filter(Boolean), speaker: {alias: "The night"}
    });
  }
}
export const gmIds = () => all(game.users).filter(u => u.isGM).map(u => u.id);

/* ------------------------------------------------------------------ */
/*  Places and travel                                                  */
/* ------------------------------------------------------------------ */

/** A scene's travel settings. */
export const travelOf = scene => W.normPlace(scene?.flags?.[MOD]?.travel ?? {});
/**
 * The places a character can travel to: scenes the Storyteller marked, or, while none is marked, every scene that is
 * not a battle map or a test.
 */
export function travelPlaces() {
  const scenes = all(game.scenes);
  const marked = scenes.filter(s => s.flags?.[MOD]?.travel);
  const list = marked.length ? marked.filter(s => travelOf(s).on) : scenes.filter(s => !W.NOT_A_PLACE.test(s.name ?? ""));
  return list.map(s => ({id: s.id, uuid: s.uuid, name: sceneName(s), travel: s.flags?.[MOD]?.travel ?? {}, scene: s}))
    .sort((a, b) => a.name.localeCompare(b.name));
}
export async function setTravel(scene, data) {
  if ( !game.user.isGM ) return;
  return scene.update({[`flags.${MOD}.travel`]: W.normPlace(data)});
}

/** What a trip would be: minutes, arrival, dawn, and whether it waits for the Storyteller. */
export function planTrip(actor, destId) {
  const dest = travelPlaces().find(p => p.id === destId);
  if ( !dest ) return null;
  const from = whereIs(actor);
  const fromPlace = from ? {id: from.id, travel: from.flags?.[MOD]?.travel ?? {}} : null;
  const minutes = from?.id === dest.id ? 0 : W.travelMinutes(fromPlace, dest, setting("travelMinutes") ?? 30);
  const start = personalTime(actor.id);
  const arrive = start + (minutes * 60);
  const dawnAt = dawnAfter(start);
  const ask = W.travelNeedsAsk({place: dest, arrive, dawnAt, sunBurns: sunBurns(actor)});
  return {dest, from, minutes, start, arrive, dawnAt, ask};
}

/** Where a token lands on a scene: the place's own spot, else the middle of the scene. */
function landing(scene, actor) {
  const t = travelOf(scene);
  const d = scene.dimensions ?? {};
  const size = (d.size ?? scene.grid?.size ?? 100);
  const w = (actor?.prototypeToken?.width ?? 1) * size, h = (actor?.prototypeToken?.height ?? 1) * size;
  const cx = t.x ?? ((d.sceneX ?? 0) + ((d.sceneWidth ?? scene.width ?? 1000) / 2));
  const cy = t.y ?? ((d.sceneY ?? 0) + ((d.sceneHeight ?? scene.height ?? 1000) / 2));
  return {x: Math.round(cx - (w / 2)), y: Math.round(cy - (h / 2))};
}

/** Move a character's token to another scene (the active Storyteller). Returns the new token, or null. */
export async function moveToScene(actor, scene, {from = null} = {}) {
  if ( !isActiveGM() || !actor || !scene ) return null;
  const origin = from ?? whereIs(actor);
  if ( origin?.id === scene.id ) return all(scene.tokens).find(t => t.actorId === actor.id) ?? null;
  const td = await actor.getTokenDocument(landing(scene, actor));
  const data = td?.toObject ? td.toObject() : td;
  const [made] = await scene.createEmbeddedDocuments("Token", [data], {wodxTravel: true});
  if ( origin ) {
    // A linked character leaves every linked token behind. An unlinked one (a retainer, a new character) leaves its
    // token only when it is the actor's one token there, so other copies of the same actor stay put.
    const mine = all(origin.tokens).filter(t => t.actorId === actor.id && t.id !== made?.id);
    const linked = mine.filter(t => t.actorLink);
    const old = (linked.length ? linked : (mine.length === 1 ? mine : [])).map(t => t.id);
    if ( old.length ) await origin.deleteEmbeddedDocuments("Token", old, {wodxTravel: true});
  }
  return made ?? null;
}

/** Tell a player's client to look at a scene. */
export function pull(userId, sceneId) {
  if ( !userId ) return;
  if ( userId === game.user.id ) return game.scenes.get(sceneId)?.view?.();
  game.socket.emit(SOCKET, {type: "pull", payload: {userId, sceneId}});
}
/** Tell a player something, privately. */
export async function tell(userId, html, {alsoGM = false} = {}) {
  return ChatMessage.create({content: `<div class="wodx-card wstory">${html}</div>`, whisper: [userId, ...(alsoGM ? gmIds() : [])].filter(Boolean), speaker: {alias: "Storyteller"}});
}

/** A seeded stream for the road, so a trip rolls the same when the world is replayed. */
function roadRand(key) {
  const g = chron()?.gen;
  if ( g?.random ) return g.random(`road:${key}`);
  return Math.random;
}
async function findTable(ref) {
  if ( !ref ) return null;
  try { const t = await fromUuid(ref); if ( t ) return t; } catch (e) { /* a name, not a uuid */ }
  return all(game.tables).find(t => t.name === ref || t.id === ref) ?? null;
}
async function drawEncounter(dest) {
  const table = await findTable(travelOf(dest.scene).table ?? setting("encounterTable"));
  if ( !table?.draw ) {
    // No table of its own: WoDX's road table for the era (folder WoDX tables), seeded by the place and the hour
    let own = null;
    try { own = chron()?.gen?.draw?.("night.encounter.wilds", {key: `road:${dest.uuid ?? dest.name}:${Math.floor(now() / 3600)}`})?.text ?? null; } catch (e) { own = null; }
    return own ? {text: own, table: "WoDX: encounters in the wilds"} : {text: "Something on the road (no encounter table is set: choose one in the settings, or on the place).", table: null};
  }
  try {
    const out = await table.draw({displayChat: false});
    const text = (out?.results ?? []).map(r => W.plain(r.description || r.text || r.name || "")).filter(Boolean).join("; ");
    return {text: text || "Something on the road.", table: table.name};
  } catch (e) {
    console.error(`${MOD} |`, e);
    return {text: "Something on the road (the encounter table could not be drawn).", table: table.name};
  }
}

/**
 * A trip, on the active Storyteller's client. A place that asks first, or a trip into the dawn for a character the sun
 * burns, goes to the approval queue unless approved is set.
 */
export async function travel({actorId, destId, userId = null, approved = false} = {}) {
  if ( !isActiveGM() ) return {ok: false, why: "Only the Storyteller's client moves tokens."};
  const actor = game.actors.get(actorId);
  if ( !actor ) return {ok: false, why: "That character is gone."};
  if ( convenedMap()[actorId] && !approved ) return {ok: false, why: "This character is in a scene the Storyteller called. Travel waits until it ends."};
  const plan = planTrip(actor, destId);
  if ( !plan ) return {ok: false, why: "That place is not open for travel."};
  const user = userId ?? ownerOf(actor)?.id ?? null;
  if ( plan.ask && !approved ) {
    await chron()?.propose?.({type: T.travel, key: `travel:${actorId}:${destId}`, title: `${actor.name} wants to go to ${plan.dest.name}`,
      detail: `${plan.ask} The trip takes ${W.spanLabel(plan.minutes * 60)} and would arrive at ${timeLabel(plan.arrive)}.`, data: {actorId, destId, userId: user}});
    await log({kind: "ask", actor: actorId, name: actor.name, user, scene: plan.dest.uuid, place: plan.dest.name, text: `Asked to go to ${plan.dest.name}: ${plan.ask}`});
    return {ok: true, waiting: true, why: plan.ask};
  }
  const tok = await moveToScene(actor, plan.dest.scene, {from: plan.from});
  if ( plan.minutes ) await advancePersonal(actorId, plan.minutes * 60);
  await log({kind: "travel", actor: actorId, name: actor.name, user, scene: plan.dest.uuid, place: plan.dest.name, hours: plan.minutes / 60,
    text: `${plan.from ? `From ${sceneName(plan.from)} to` : "To"} ${plan.dest.name}, ${W.spanLabel(plan.minutes * 60)} on the way.`});
  pull(user, plan.dest.id);
  // The road
  if ( setting("encounters") !== false && plan.minutes > 0 ) {
    const hit = W.rollRoad(plan.minutes, setting("encounterChance") ?? 10, roadRand(`${actorId}:${plan.start}`));
    if ( hit >= 0 ) {
      const {text, table} = await drawEncounter(plan.dest);
      await chron()?.propose?.({type: T.encounter, key: `encounter:${actorId}:${plan.start}`, title: `On the road: ${actor.name} meets something`,
        detail: `Between ${plan.from ? sceneName(plan.from) : "the last place"} and ${plan.dest.name}, in hour ${hit + 1} of the trip${table ? ` (${table})` : ""}: ${text}`,
        data: {actorId, destId, userId: user, text}});
      await log({kind: "encounter", actor: actorId, name: actor.name, user, scene: plan.dest.uuid, place: plan.dest.name, attention: "An encounter on the road", text});
    }
  }
  await checkBeats({type: "place", actor: actorId, place: plan.dest.uuid});
  return {ok: true, token: tok ?? null, arrive: plan.arrive};
}

/* ------------------------------------------------------------------ */
/*  Solo play                                                          */
/* ------------------------------------------------------------------ */

/** A solo act, on the active Storyteller's client. */
export async function solo({actorId, kind = "other", hours = null, note = "", changesWorld = false, userId = null} = {}) {
  if ( !isActiveGM() ) return {ok: false, why: "Only the Storyteller's client records solo play."};
  const actor = game.actors.get(actorId);
  if ( !actor ) return {ok: false, why: "That character is gone."};
  const start = personalTime(actorId);
  const night = nightOf(start);
  const ok = W.soloAllowed({count: W.soloCount(entries(), actorId, night), limit: Number(setting("soloLimit")) || 0, convened: !!convenedMap()[actorId]});
  if ( !ok.ok ) return ok;
  const h = W.soloHours(kind, hours);
  const label = W.SOLO_KINDS[kind]?.label ?? W.SOLO_KINDS.other.label;
  const where = whereIs(actor);
  const user = userId ?? ownerOf(actor)?.id ?? null;
  const text = `${label}${note ? `: ${String(note).slice(0, 300)}` : ""} (${W.spanLabel(h * W.HOUR)})`;
  const end = start + (h * W.HOUR);
  const dawnAt = dawnAfter(start);
  const pastDawn = end >= dawnAt;
  await advancePersonal(actorId, h * W.HOUR);
  await log({kind: "solo", actor: actorId, name: actor.name, user, scene: where?.uuid ?? null, place: where ? sceneName(where) : null, hours: h, night, text,
    attention: changesWorld ? "A result that changes the world" : (pastDawn && sunBurns(actor) ? "Acting past dawn" : W.attentionOf(note))});
  if ( changesWorld ) {
    await chron()?.propose?.({type: T.solo, title: `${actor.name}: ${label}`, detail: `${note || "No details given."} The player says this changes the world.`, data: {actorId, userId: user}});
  }
  return {ok: true, hours: h, end, pastDawn, waiting: !!changesWorld};
}

/* ------------------------------------------------------------------ */
/*  Convening                                                          */
/* ------------------------------------------------------------------ */

/**
 * Call characters to a scene: their tokens arrive, their times line up (whoever was behind sums up the gap), solo play
 * pauses for them, and a call card tells each player why. The world clock moves on to the scene's time.
 */
export async function convene({actorIds = [], sceneId, reason = "", by = "the Storyteller"} = {}) {
  if ( !isActiveGM() ) return {ok: false, why: "Only the Storyteller convenes."};
  const scene = game.scenes.get(sceneId);
  const actors = actorIds.map(id => game.actors.get(id)).filter(Boolean);
  if ( !scene || !actors.length ) return {ok: false, why: "Choose a scene and at least one character."};
  const map = personalMap();
  const {target, rows} = W.reconcile(actors.map(a => ({id: a.id, rec: map[a.id]})), now());
  if ( target > now() ) await game.time.advance(target - now());
  await mutate("personal", cur => {
    const next = {...(cur ?? {})};
    for ( const a of actors ) next[a.id] = {...(next[a.id] ?? {}), t: target};
    return {value: next};
  });
  await mutate("convened", cur => {
    const next = {...(cur ?? {})};
    for ( const a of actors ) next[a.id] = {scene: scene.id, at: target, reason: String(reason).slice(0, 300)};
    return {value: next};
  });
  for ( const a of actors ) {
    await moveToScene(a, scene);
    const row = rows.find(r => r.id === a.id);
    const u = ownerOf(a);
    const gap = row?.status === "behind"
      ? `<p>${esc(a.name)} was ${esc(W.spanLabel(row.gap))} behind. Sum up what they did in that time, in a line or two.</p>`
      : row?.status === "ahead" ? `<p>${esc(a.name)} was ahead of the others and waits for them.</p>` : "";
    await tell(u?.id, `<p><strong>The Storyteller calls ${esc(a.name)} to ${esc(sceneName(scene))}</strong> at ${esc(timeLabel(target))}.</p>${reason ? `<p>${esc(reason)}</p>` : ""}${gap}`, {alsoGM: true});
    await log({kind: "convene", actor: a.id, name: a.name, user: u?.id, scene: scene.uuid, place: sceneName(scene), personal: target,
      text: `Called to ${sceneName(scene)} by ${by}${reason ? `: ${reason}` : ""}${row?.status === "behind" ? ` (sums up ${W.spanLabel(row.gap)})` : ""}.`});
    pull(u?.id, scene.id);
  }
  return {ok: true, target, rows};
}

/** End a convened scene for some characters (or all): solo play opens again. */
export async function release(actorIds = null) {
  if ( !isActiveGM() ) return;
  const map = convenedMap();
  const ids = actorIds ?? Object.keys(map);
  if ( !ids.some(id => map[id]) ) return;
  await mutate("convened", cur => { const next = {...(cur ?? {})}; for ( const id of ids ) delete next[id]; return {value: next}; });
  for ( const id of ids.filter(i => map[i]) ) {
    const a = game.actors.get(id);
    await log({kind: "release", actor: id, name: a?.name, user: ownerOf(a)?.id, text: "The scene ended; free to act alone again."});
  }
}

/* ------------------------------------------------------------------ */
/*  Beats                                                              */
/* ------------------------------------------------------------------ */

export async function saveBeat(beat) {
  if ( !game.user.isGM ) return;
  const b = W.normBeat({...beat, id: beat.id || foundry.utils.randomID()});
  await mutate("beats", cur => {
    const list = (cur ?? []).map(W.normBeat).filter(x => x.id !== b.id);
    return {value: [...list, b]};
  });
  return b;
}
export async function deleteBeat(id) {
  if ( !game.user.isGM ) return;
  await mutate("beats", cur => ({value: (cur ?? []).filter(x => x.id !== id)}));
}

/**
 * A map event from WoDX Interactables (0.3.0): a line in the log for what a player character did, and any beat set on
 * that change. Undo on the Interactables card takes the line back out (a beat that fired stays fired).
 */
export async function onMapEvent(ev) {
  if ( !isActiveGM() || !ev ) return null;
  const id = `map:${String(ev.message ?? "").slice(0, 40)}`;
  if ( ev.undone ) {
    if ( ev.message ) await mutate("log", cur => { const l = W.normLog(cur); if ( !l.entries.some(e => e.id === id) ) return null; return {value: {...l, entries: l.entries.filter(e => e.id !== id)}}; });
    return null;
  }
  const tok = ev.who ? (() => { try { return fromUuidSync(ev.who); } catch (e) { return null; } })() : null;
  const actor = tok?.actor ?? null;
  const e = W.mapEntry(ev);
  let entry = null;
  if ( e && isPC(actor) ) entry = await log({...e, actor: actor.id, name: actor.name, user: ownerOf(actor)?.id ?? null});
  const scene = ev.scene ? game.scenes.get(ev.scene) : null;
  await checkBeats({type: "map", actor: isPC(actor) ? actor.id : null, place: scene?.uuid ?? ev.place, kind: ev.kind, state: ev.state});
  return entry;
}

let checking = false;
/** Fire the beats an event sets off. A beat that calls characters goes to the queue; one that only reminds is a card. */
export async function checkBeats(ev) {
  if ( !isActiveGM() || setting("beatsOn") === false || checking ) return [];
  checking = true;
  try {
    const due = beats().filter(b => W.beatFires(b, ev));
    if ( !due.length ) return [];
    await mutate("beats", cur => ({value: (cur ?? []).map(W.normBeat).map(b => due.some(d => d.id === b.id) ? {...b, fired: true, firedAt: now()} : b)}));
    for ( const b of due ) {
      const scene = b.scene ? game.scenes.get(b.scene) : null;
      const who = b.convene.map(id => game.actors.get(id)?.name).filter(Boolean);
      if ( who.length && scene ) {
        await chron()?.propose?.({type: T.beat, key: `beat:${b.id}`, title: `A beat: ${b.name}`,
          detail: `Call ${who.join(", ")} to ${sceneName(scene)}.${b.reason ? ` ${b.reason}` : ""}`, data: {beatId: b.id, actorIds: b.convene, sceneId: scene.id, reason: b.reason || b.name}});
      } else {
        await ChatMessage.create({content: `<div class="wodx-card wstory"><p><strong>A beat: ${esc(b.name)}</strong></p>${b.reason ? `<p>${esc(b.reason)}</p>` : ""}</div>`,
          whisper: gmIds(), speaker: {alias: "WoDX Storyteller"}});
      }
      await log({kind: "beat", actor: ev.actor ?? null, name: ev.actor ? game.actors.get(ev.actor)?.name : null, attention: "A beat fired", text: `${b.name}${who.length ? ` (call ${who.join(", ")})` : ""}`});
    }
    return due;
  } finally { checking = false; }
}

/* ------------------------------------------------------------------ */
/*  The approval queue                                                 */
/* ------------------------------------------------------------------ */

export function registerHandlers() {
  const c = chron();
  if ( !c?.registerApprovalHandler ) return;
  c.registerApprovalHandler(T.travel, {label: "Travel",
    approve: async e => { const r = await travel({...e.data, approved: true}); if ( !r.ok ) ui.notifications.warn(r.why); },
    reject: async e => { const a = game.actors.get(e.data?.actorId); await log({kind: "note", actor: e.data?.actorId, name: a?.name, user: e.data?.userId, text: "The Storyteller turned down a trip."}); }});
  c.registerApprovalHandler(T.encounter, {label: "Encounter",
    approve: async e => { const a = game.actors.get(e.data?.actorId); await log({kind: "note", actor: e.data?.actorId, name: a?.name, user: e.data?.userId, text: `The Storyteller will play the encounter: ${e.data?.text ?? ""}`}); },
    reject: async e => { const a = game.actors.get(e.data?.actorId); await log({kind: "note", actor: e.data?.actorId, name: a?.name, user: e.data?.userId, text: "The road was quiet after all."}); }});
  c.registerApprovalHandler(T.solo, {label: "Solo result"});
  c.registerApprovalHandler(T.beat, {label: "Beat",
    approve: async e => { const d = e.data ?? {}; const r = await convene({actorIds: d.actorIds ?? [], sceneId: d.sceneId, reason: d.reason ?? "", by: "a beat"}); if ( !r.ok ) ui.notifications.warn(r.why); }});
}

/* ------------------------------------------------------------------ */
/*  The session                                                        */
/* ------------------------------------------------------------------ */

/** Mark the end of a session. Factions take their turn too when WoDX NPC is on and factions is set. */
export async function endSession({factions = true} = {}) {
  if ( !isActiveGM() ) return;
  if ( factions ) { try { await npc()?.endSession?.(); } catch (e) { console.error(`${MOD} |`, e); } }
  await release();
  await game.settings.set(MOD, "session", {at: now(), real: Date.now()});
  try { if ( absentIds().length ) await game.settings.set(MOD, "absent", {}); } catch (e) { /* the setting comes with 0.18.0 */ }
  await log({kind: "session", text: "The session ended."});
}

/** The report of everything since the last session ended. */
export function report() {
  const mark = setting("session") ?? {};
  const since = Number.isFinite(mark.at) ? mark.at : null;
  let factionLog = [], breaches = [];
  try {
    const st = npc()?.factions?.state?.();
    factionLog = st?.log ?? [];
    breaches = (st?.breaches ?? []).filter(b => b.state === "live").map(b => ({event: b.event, stage: ["Talk in the town", "The Prince hears", "The hunters hear"][b.stage] ?? ""}));
  } catch (e) { /* WoDX NPC off */ }
  const pending = chron()?.approvals?.pending?.() ?? [];
  // The feed since the session ended: everything newer than the latest session line
  const feed = entries(), cut = feed.findIndex(e => e.kind === "session");
  const recent = cut < 0 ? feed : feed.slice(0, cut);
  return {since, sections: W.sessionReport({entries: recent, since, factionLog, pending, breaches, beats: beats().filter(b => !b.fired)})};
}

/* ------------------------------------------------------------------ */
/*  Watching the table                                                 */
/* ------------------------------------------------------------------ */

/** A chat card from a player character: a roll goes in the log, and so does any card with something to look at. */
export async function onChat(msg) {
  if ( !isActiveGM() ) return;
  const actor = msg?.speaker?.actor ? game.actors.get(msg.speaker.actor) : null;
  if ( !isPC(actor) ) return;
  if ( msg.flags?.[MOD] ) return;
  const text = W.plain(msg.flavor || msg.content || "").slice(0, 300);
  const why = W.attentionOf(`${msg.flavor ?? ""} ${W.plain(msg.content ?? "")}`);
  const rolled = (msg.rolls?.length ?? 0) > 0;
  if ( !rolled && !why ) return;
  const scene = msg.speaker?.scene ? game.scenes.get(msg.speaker.scene) : whereIs(actor);
  await log({kind: rolled ? "roll" : "note", actor: actor.id, name: actor.name, user: msg.author?.id ?? msg.user?.id ?? ownerOf(actor)?.id,
    scene: scene?.uuid ?? null, place: scene ? sceneName(scene) : null, text: text || (rolled ? "A roll" : "A card"), attention: why});
}

/** A token arrives on a scene (not by WoDX travel, which logs itself). */
export async function onToken(doc, options) {
  if ( !isActiveGM() || options?.wodxTravel ) return;
  if ( doc?.flags?.["wodx-otherworlds"]?.twinOf ) return; // a twin level's copy, not an arrival
  const actor = doc?.actor ?? (doc?.actorId ? game.actors.get(doc.actorId) : null);
  if ( !isPC(actor) ) return;
  const scene = doc.parent;
  await log({kind: "arrive", actor: actor.id, name: actor.name, user: ownerOf(actor)?.id, scene: scene?.uuid ?? null, place: scene ? sceneName(scene) : null, text: `Arrived at ${sceneName(scene)}.`});
  await checkBeats({type: "place", actor: actor.id, place: scene?.uuid});
}

export async function onActorFlags(actor, change) {
  if ( !isActiveGM() || !isPC(actor) || !change?.flags ) return;
  await checkBeats({type: "flag", actor: actor.id, flags: actor.flags});
}

/** Proposals waiting in the queue show in the feed, once each. */
const seen = new Set();
export function primeQueue() { for ( const p of chron()?.approvals?.pending?.() ?? [] ) seen.add(p.id); }
export async function onQueue() {
  if ( !isActiveGM() ) return;
  for ( const p of chron()?.approvals?.pending?.() ?? [] ) {
    if ( seen.has(p.id) ) continue;
    seen.add(p.id);
    if ( String(p.type ?? "").startsWith(`${MOD}.`) ) continue; // logged where it was asked
    await log({kind: "ask", user: p.from ?? null, text: p.title, attention: "In the approval queue"});
  }
}
