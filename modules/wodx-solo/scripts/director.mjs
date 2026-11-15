/**
 * WoDX Solo: step 4 of The Lone Chronicle (B6045 to B6049): the director, experience from the night's log, and the
 * morning recap. director-rules.mjs holds the rules; this file does the Foundry side, on the seat.
 *
 *   The director   at dusk, once a night: the character's live things (flaws and merits that pull trouble, a
 *                  storyline's beat, open oaths, debts and aims in the Ledger, the clocks the player sees, a sign), one
 *                  or two picked by the temper of the last nights and the trouble dial. Each comes as a card on the
 *                  Leads page; a clock it picks moves a step; under pressure the first heavy thing brings people onto
 *                  the character's scene. "I am stuck: bring me a lead" asks the director for one light thing now.
 *   Experience     in the morning after a night: the line's own reasons the log shows, awarded through WoDX Creation's
 *                  award, so it goes on the sheet with its date and log page
 *   The recap      when the player comes back after a night: that night as the character knows it, on a card
 *
 *   setting wodx-solo.directed   [night]            nights the director has looked at
 *   setting wodx-solo.brought    [{key, night}]     what it brought, so it is not brought again at once
 *   setting wodx-solo.awarded    ["actor:night"]    nights already awarded
 *   setting wodx-solo.recapped   ["user:night"]     recaps already shown
 *   setting wodx-solo.director   Boolean            "The director brings the night's trouble" (on)
 *   setting wodx-solo.nightXp    Boolean            "Experience at the end of each night" (on)
 */
import * as D from "./director-rules.mjs";
import * as WR from "../../wodx-storyteller/scripts/wrapup-rules.mjs";
import {lineFor} from "../../wodx-storyteller/scripts/prelude-rules.mjs";
import {ANSWERS} from "./world-rules.mjs";
import {nightTick} from "./world.mjs";
import {placeOf, tell} from "./panel.mjs";

const MOD = "wodx-solo";
const ST = "wodx-storyteller";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const all = c => c?.contents ?? [...(c?.values?.() ?? c ?? [])];
const stApi = () => (game.modules.get(ST)?.active ? game.modules.get(ST).api ?? null : null);
const chron = () => (game.modules.get("wodx-chronicle")?.active ? game.modules.get("wodx-chronicle").api ?? null : null);

let H = null; // from main.mjs: {isOn, isSeat, log, get}

/** The one person playing: an active player, else the first player with a character. */
function thePlayer() {
  const players = all(game.users).filter(u => !u.isGM);
  return players.find(u => u.active) ?? players.find(u => u.character) ?? null;
}
const playersOf = actor => all(game.users).filter(u => !u.isGM && actor?.testUserPermission?.(u, "OWNER"));

/** The Storyteller's log entries about the character, and the fights (which carry no character). */
function entriesFor(actor) {
  return (stApi()?.entries?.() ?? []).filter(e => e && (e.actor === actor.id || (!e.actor && String(e.text ?? "").startsWith("A fight began"))));
}
/** The trouble dial set before the first night: 0.5, 1 or 1.5. */
function dialOf(actor) {
  try {
    const C = game.modules.get("wodx-creation")?.api;
    return C?.firstNightRules?.dialScale?.(C.firstNightOf?.(actor)?.dial) ?? 1;
  } catch (e) { return 1; }
}
const asked = () => (H.get("oracle") ?? []).map(a => ({...a, label: ANSWERS[a.answer]?.label ?? a.answer}));

/* ------------------------------------------------------------------ */
/*  The director                                                       */
/* ------------------------------------------------------------------ */

/** Everything live for the character tonight, as the director's things. */
function thingsFor(actor, user) {
  const st = stApi();
  const out = [];
  try {
    for ( const p of chron()?.traits?.pulls?.(actor, () => 0) ?? [] ) {
      out.push({key: `pull:${p.key}`, kind: "flaw", heavy: true, title: p.name, text: p.text || `${p.name} makes itself felt tonight.`});
    }
  } catch (e) { /* no traits */ }
  try {
    let first = true;
    const beat = st?.threads?.nightBeat?.(() => (first ? ((first = false), 0) : Math.random()));
    if ( beat?.step ) out.push({key: `thread:${beat.key}:${beat.step.title}`, kind: "thread", heavy: true, title: beat.title, text: `${beat.step.title}${beat.step.text ? `. ${beat.step.text}` : ""}`});
  } catch (e) { /* no threads */ }
  try { out.push(...D.ledgerThings(st?.ledger?.state?.()?.entries ?? [], {id: actor.id, name: actor.name})); } catch (e) { /* no ledger */ }
  try { out.push(...D.clockThings(st?.clocks?.visible?.(user ?? game.user) ?? [])); } catch (e) { /* no clocks */ }
  // a sign is always there to fall back on
  out.push({key: `sign:${Date.now()}`, kind: "sign", heavy: false, weight: 0.5, title: "A sign", text: ""});
  return out;
}

/** Bring one thing: its card on the Leads page, a clock moved, and people for a heavy thing under pressure. */
async function bring(actor, thing, {temper = "steady", people = false} = {}) {
  const st = stApi();
  let {title, text} = thing;
  if ( thing.kind === "sign" ) {
    const a = await st?.aid?.draw?.({kind: "foreshadow", actorId: actor.id, nonce: Date.now() % 997}).catch(() => null);
    if ( !a ) return null;
    title = a.label; text = a.text;
  }
  if ( thing.kind === "clock" && thing.clockId ) {
    const c = (st?.clocks?.list?.() ?? []).find(x => x.id === thing.clockId && x.kind === "own");
    if ( c ) await st.clocks.save({...c, filled: Math.min(c.segments, c.filled + 1), last: game.time.worldTime});
  }
  const whisper = [...new Set([...playersOf(actor), ...all(game.users).filter(u => u.isGM)].map(u => u.id))];
  await ChatMessage.create({whisper, speaker: {alias: actor.name},
    flags: {[ST]: {aid: "director"}, [MOD]: {director: thing.kind}},
    content: `<div class="wodx-card wstory-card"><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`});
  await st?.log?.({kind: "note", actor: actor.id, name: actor.name, text: `${title}: ${text}`});
  let came = null;
  if ( people ) {
    const {scene} = placeOf(playersOf(actor)[0] ?? thePlayer());
    if ( scene ) came = await nightTick({force: true, actorId: actor.id, sceneId: scene.id, title: "The director brought someone", salt: `:director:${Date.now() % 100000}`});
  }
  return {...thing, title, text, came: came?.tokens ?? []};
}

/**
 * The director looks at the night for the character. force (the gate): skip the switch and the once-a-night mark.
 * count: how many to bring instead of the temper's. light: only light things. -> {temper, count, brought} or null
 */
export async function direct({actorId = null, force = false, count = null, light = false} = {}) {
  if ( !game.user.isGM ) return null;
  if ( !force && (!H.isSeat() || H.get("director") === false) ) return null;
  const user = actorId ? null : thePlayer();
  const actor = actorId ? game.actors.get(actorId) : placeOf(user).actor;
  if ( !actor ) return null;
  const now = game.time.worldTime, night = D.nightOf(now);
  if ( !force && (H.get("directed") ?? []).includes(night) ) return null;
  if ( !force ) await game.settings.set(MOD, "directed", [...(H.get("directed") ?? []).filter(n => night - n < 60), night]);
  const temper = light ? "rest" : D.temperOf(entriesFor(actor), now);
  const n = count ?? D.howMany(temper, dialOf(actor));
  const picked = D.pickThings({things: thingsFor(actor, playersOf(actor)[0] ?? user), temper, count: n, brought: H.get("brought") ?? [], night});
  const brought = [];
  let peopleDone = false;
  for ( const t of picked ) {
    const people = temper === "pressure" && t.heavy && !peopleDone;
    const b = await bring(actor, t, {temper, people});
    if ( b ) { brought.push(b); if ( people ) peopleDone = true; }
  }
  await game.settings.set(MOD, "brought", D.addBrought(H.get("brought"), picked.filter(t => t.kind !== "sign"), night));
  await H.log({kind: "note", source: MOD, title: `The director: ${D.TEMPERS[temper].label}`, note: brought.map(b => b.title).join("; ") || "nothing to bring"});
  return {temper, count: n, brought};
}

/* ------------------------------------------------------------------ */
/*  Experience                                                         */
/* ------------------------------------------------------------------ */

/** The year now, for the Dark Ages list. */
function yearNow() {
  try { return stApi()?.tripContext?.(game.time.worldTime, null)?.year ?? null; } catch (e) { return null; }
}

/** Award the night for the character. force (the gate): award again. -> {points, ticks, note, deeds} or null */
export async function awardNight({actorId = null, night = null, force = false} = {}) {
  if ( !game.user.isGM ) return null;
  if ( !force && (!H.isSeat() || H.get("nightXp") === false) ) return null;
  const actor = actorId ? game.actors.get(actorId) : placeOf(thePlayer()).actor;
  if ( !actor ) return null;
  night ??= D.nightOf(game.time.worldTime);
  const key = `${actor.id}:${night}`;
  if ( !force && (H.get("awarded") ?? []).includes(key) ) return null;
  await game.settings.set(MOD, "awarded", [...(H.get("awarded") ?? []).slice(-200), key]);
  const st = stApi();
  const entries = entriesFor(actor);
  const {start} = D.nightWindow(night);
  const seenBefore = entries.filter(e => e.kind === "travel" && (Number(e.at) || 0) < start).map(e => e.place).filter(Boolean);
  const deeds = D.nightDeeds({entries, me: {id: actor.id, name: actor.name}, asked: asked(), ledger: st?.ledger?.state?.()?.entries ?? [], night, seenBefore});
  const year = yearNow();
  const reasons = WR.reasonsFor(lineFor(actor.type, actor.system?.settings?.variant ?? ""), {story: true, early: Number.isFinite(year) && year < 1500});
  const ticks = D.xpTicks(deeds, reasons);
  const {points, note} = D.xpAward(ticks, reasons);
  if ( !points ) return {points: 0, ticks, note, deeds};
  const award = game.modules.get("wodx-creation")?.api?.award;
  if ( !award ) { await H.log({kind: "note", source: MOD, title: "No experience given", note: "WoDX Creation is not active"}); return {points: 0, ticks, note, deeds}; }
  await award([actor], points, note);
  await st?.log?.({kind: "note", actor: actor.id, name: actor.name, text: `${points} experience for the night (${note.replace(/^The night: /, "")}).`});
  for ( const u of playersOf(actor) ) await tell(u.id, `<p><b>${points} experience</b> for the night: ${esc(note.replace(/^The night: /, ""))}. It is on your sheet, ready to spend.</p>`);
  return {points, ticks, note, deeds};
}

/* ------------------------------------------------------------------ */
/*  The recap                                                          */
/* ------------------------------------------------------------------ */

/** The night to recap: this morning's night before noon, else last night. */
const lastNight = now => (((Number(now) % 86400) + 86400) % 86400 < 43200 ? D.nightOf(now) : D.nightOf(now) - 1);

/** Show the player their character's last night, once. force (the gate): show it again. -> the rows, or null */
export async function recap(userId, {force = false, night = null, actorId = null} = {}) {
  if ( !game.user.isGM ) return null;
  if ( !force && !H.isSeat() ) return null;
  const user = game.users.get(userId);
  const actor = (force && actorId ? game.actors.get(actorId) : null) ?? placeOf(user).actor;
  if ( !user || !actor ) return null;
  night ??= lastNight(game.time.worldTime);
  const key = `${userId}:${night}`;
  if ( !force && (H.get("recapped") ?? []).includes(key) ) return null;
  const rows = D.recapRows({entries: entriesFor(actor), me: {id: actor.id, name: actor.name}, asked: asked(), night});
  if ( !rows.length ) return [];
  await game.settings.set(MOD, "recapped", [...(H.get("recapped") ?? []).slice(-200), key]);
  await tell(userId, `<h3>Last night</h3><ul class="wsolo-recap">${rows.map(r => `<li>${esc(r.text)}</li>`).join("")}</ul>`);
  return rows;
}

/* ------------------------------------------------------------------ */
/*  Wiring                                                             */
/* ------------------------------------------------------------------ */

export function registerDirectorSettings() {
  for ( const k of ["directed", "brought", "awarded", "recapped"] ) game.settings.register(MOD, k, {scope: "world", config: false, type: Array, default: []});
  game.settings.register(MOD, "director", {name: "The director brings the night's trouble",
    hint: "Once a night, at dusk, one or two of the character's live threads come to them: flaws that pull trouble, a storyline's beat, oaths and debts, clocks. Pressure after quiet nights, a rest after hard ones, by the trouble dial.",
    scope: "world", config: true, type: Boolean, default: true});
  game.settings.register(MOD, "nightXp", {name: "Experience at the end of each night",
    hint: "In the morning, the lone player's character gets the experience the log shows for the night, from the line's own list in the book: being there, real danger, something learned, a lead closed. At most 5.",
    scope: "world", config: true, type: Boolean, default: true});
}

export function installDirector(helpers) {
  H = helpers;
  let last = 0, busy = false;
  Hooks.on("updateWorldTime", () => {
    if ( !H.isSeat() || busy ) return;
    const t = Date.now();
    if ( t - last < 1000 ) return;
    last = t;
    busy = true;
    (async () => {
      const cal = await import("../../wodx-chronicle/scripts/calendar.mjs");
      let lat = 50;
      try { lat = game.settings.get("wodx-chronicle", "latitude") ?? 50; } catch (e) { lat = 50; }
      const now = game.time.worldTime;
      const night = cal.secondsToNextDawn(now, lat) < cal.secondsToNextDusk(now, lat);
      if ( night ) await direct();
      else if ( ((now % 86400) + 86400) % 86400 < 43200 ) await awardNight();
    })().catch(e => console.error(`${MOD} | director`, e)).finally(() => { busy = false; });
  });
  Hooks.on("userConnected", (u, on) => {
    if ( !on || u.isGM || !H.isSeat() ) return;
    setTimeout(() => recap(u.id).catch(e => console.error(`${MOD} | recap`, e)), 4000);
  });
}

export const directorApi = {rules: D, direct, award: awardNight, recap};
