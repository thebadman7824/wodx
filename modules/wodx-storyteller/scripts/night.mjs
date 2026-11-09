/**
 * WoDX Storyteller: the night's draw and the story aids, in Foundry. The tables go to WoDX Chronicle's generator core
 * (folder "WoDX tables", editable); every draw is seeded and goes to the approval queue, and nothing reaches a player
 * or the world before the Storyteller approves it.
 */
import {MOD, esc, chron, setting, isActiveGM, log, entries, isPC, ownerOf} from "./core.mjs";
import * as N from "./night-rules.mjs";
export {N};
import {NIGHT_TABLES} from "../data/night-tables.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

export const TN = {night: `${MOD}.night`, aid: `${MOD}.aid`};
const all = c => (c ? [...(c.contents ?? c)] : []);
const NIGHTS = "WoDX nights", AIDS = "WoDX story aids", FOLDER = "WoDX chronicle";
let CAL = null;

export function registerNightSettings() {
  game.settings.register(MOD, "nightDraw", {name: "Draw each night at dusk", hint: "At the turn of each night the Storyteller's client draws the night (encounters and a rumour) and puts it in the approval queue.",
    scope: "world", config: true, type: Boolean, default: false});
  game.settings.register(MOD, "nightDrawn", {scope: "world", config: false, type: Number, default: 0});
  game.settings.register(MOD, "aidCount", {scope: "world", config: false, type: Number, default: 0});
}

/** At ready: the tables and the queue's handlers. */
export function registerNight() {
  const go = () => {
    chron()?.gen?.registerTables?.(MOD, NIGHT_TABLES);
    chron()?.registerApprovalHandler?.(TN.night, {label: "The night's draw", approve: e => approveNight(e.data)});
    chron()?.registerApprovalHandler?.(TN.aid, {label: "Story aid", approve: e => approveAid(e.data)});
  };
  if ( chron()?.gen ) go(); else Hooks.once("wodxChronicleReady", go);
}

/* ---- where and when ---- */

async function cal() { CAL ??= await import("../../wodx-chronicle/scripts/calendar.mjs").catch(() => null); return CAL; }
const latitude = () => { try { return Number(game.settings.get("wodx-chronicle", "latitude")) || 50.1; } catch (e) { return 50.1; } };

/** The night now: its date (the evening it began) and the part of the night. */
export async function nightNow(time = game.time.worldTime) {
  const C = await cal();
  const t = C?.describeTime?.(time, latitude());
  if ( !t ) return {jdn: Math.floor(time / 86400), part: "early", label: ""};
  const hours = t.hour + t.minute / 60;
  return {jdn: hours < 12 ? t.jdn - 1 : t.jdn, part: N.partOfNight(hours), label: t.dateLabel, hours};
}

/** The world layers in play: from the lines chosen at Start a chronicle, else from the player characters. */
export function layersInPlay() {
  let lines = setting("setup")?.lines ?? [];
  if ( !lines.length ) lines = all(game.actors).filter(isPC).map(a => String(a.type).toLowerCase());
  return N.layersFor(lines);
}

/** The chronicle's own places and people. */
export function fragmentsFor(actorId = null) {
  return N.fragments({entries: entries(), scenes: all(game.scenes).map(s => ({name: s.name})),
    actors: all(game.actors).map(a => ({id: a.id, name: a.name, pc: isPC(a) || /group/i.test(String(a.type))})), actor: actorId});
}

/* ---- the night ---- */

/** Draw a night. Seeded by the night's date: the same night and nonce give the same draw. */
export async function drawNight({jdn = null, part = null, nonce = 0} = {}) {
  const g = chron()?.gen;
  if ( !g ) return null;
  const at = await nightNow();
  jdn ??= at.jdn;
  part ??= at.part;
  const ctx = g.context();
  const tables = g.lookup(ctx);
  const f = fragmentsFor();
  const n = N.composeNight({randFor: k => g.random(`night:${jdn}:${k}`, nonce), tables, part, layers: layersInPlay(), vars: {places: f.places, people: f.people}});
  let weather = "";
  try { weather = game.modules.get("wodx-atmosphere")?.api?.weather?.on?.(jdn)?.label ?? ""; } catch (e) { weather = ""; }
  return {...n, jdn, nonce, date: jdn === at.jdn ? at.label : "", weather, era: ctx.eraId};
}

function nightHtml(n) {
  return `<p class="wodx-quiet">${esc(n.date || "")}${n.date ? ", " : ""}${esc(n.partLabel)}${n.weather ? `. ${esc(n.weather)}` : ""}</p>
    <p>${esc(n.opening)}</p><ul>${n.encounters.map(e => `<li><b>${esc(e.label)}:</b> ${esc(e.text)}</li>`).join("")}</ul>
    ${n.rumour ? `<p><b>A rumour:</b> ${esc(n.rumour)}</p>` : ""}`;
}

export async function proposeNight(n) {
  return chron()?.propose?.({type: TN.night, key: `night:${n.jdn}:${n.nonce}`, title: `The night's draw${n.date ? `: ${n.date}` : ""}`, detail: N.nightText(n), data: n});
}

/** Approved: into the log and the nights journal. */
export async function approveNight(n) {
  if ( !n ) return;
  await log({kind: "world", text: `The night's draw: ${N.nightText(n)}`});
  await appendPage(NIGHTS, n.date || `Night ${n.jdn}`, nightHtml(n), "nights");
  // The night's rumour starts going round
  if ( n.rumour && setting("rumourNetwork") !== false ) await game.modules.get(MOD)?.api?.rumours?.start?.({text: n.rumour});
}

async function appendPage(name, pageName, html, kind) {
  let folder = all(game.folders).find(f => f.type === "JournalEntry" && f.name === FOLDER);
  folder ??= await Folder.create({name: FOLDER, type: "JournalEntry"});
  let j = all(game.journal).find(x => x.flags?.[MOD]?.drawn === kind);
  j ??= await JournalEntry.create({name, folder: folder.id, ownership: {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE}, flags: {[MOD]: {drawn: kind}}});
  await j.createEmbeddedDocuments("JournalEntryPage", [{name: pageName, type: "text", text: {content: html, format: 1}}]);
  return j;
}

/** The Storyteller's window for a night: re-roll until it fits, then send it to the queue. */
export async function nightDialog() {
  if ( !game.user.isGM ) return;
  const {DialogV2} = foundry.applications.api;
  let nonce = 0;
  for ( ;; ) {
    const n = await drawNight({nonce});
    if ( !n ) return ui.notifications.warn("WoDX Chronicle's generators are not ready.");
    const choice = await DialogV2.wait({classes: ["wodx-dialog", "wstory-dialog", "wstory-night"], window: {title: "The night's draw"}, rejectClose: false,
      content: `<div class="wstory-draw">${nightHtml(n)}<p class="wodx-quiet">Nothing reaches the players until you approve it in the queue.</p></div>`,
      buttons: [{action: "send", label: "Send to the queue", default: true}, {action: "again", label: "Draw again"}, {action: "close", label: "Close"}]});
    if ( choice === "again" ) { nonce++; continue; }
    if ( choice === "send" ) { await proposeNight(n); ui.notifications.info("The night's draw is in the approval queue."); }
    return n;
  }
}

/** At the turn of the night, when the setting is on. */
let drawing = false;
export async function maybeDrawNight() {
  if ( drawing || !isActiveGM() || !setting("nightDraw") || chron()?.isSkipping?.() ) return;
  const at = await nightNow();
  if ( at.hours !== undefined && at.hours >= 7 && at.hours < 17 ) return;
  if ( setting("nightDrawn") === at.jdn ) return;
  drawing = true;
  try {
    await game.settings.set(MOD, "nightDrawn", at.jdn);
    const n = await drawNight({jdn: at.jdn, part: "early"});
    if ( n ) await proposeNight(n);
  } finally { drawing = false; }
}

/** A road encounter when no table is set: WoDX's own, for the kind of place. */
export function roadEncounter({key, town = false} = {}) {
  const g = chron()?.gen;
  const r = g?.draw?.(`night.encounter.${town ? "town" : "wilds"}`, {key: `road:${key}`});
  return r?.text ?? null;
}

/* ---- story aids ---- */

export async function drawAid({kind, actorId = null, count = null, nonce = 0} = {}) {
  const g = chron()?.gen;
  if ( !g || !N.AIDS[kind] ) return null;
  count ??= setting("aidCount") ?? 0;
  const actor = game.actors.get(actorId);
  const f = fragmentsFor(actorId);
  const a = N.composeAid({kind, rand: g.random(`aid:${kind}:${actorId ?? "-"}:${count}`, nonce), tables: g.lookup(g.context()), vars: {actor: actor?.name, places: f.places, people: f.people}});
  return a ? {...a, actorId, actorName: actor?.name ?? null, count, nonce} : null;
}

function aidHtml(a) {
  return `<p><b>${esc(a.label)}${a.actorName ? ` for ${esc(a.actorName)}` : ""}</b></p><p>${esc(a.text)}</p>
    ${a.rating ? `<p class="wodx-quiet">Suggested ${esc(a.ratingLabel)}: ${a.rating}. Set it by the book for the line.</p>` : ""}`;
}

export async function proposeAid(a) {
  await game.settings.set(MOD, "aidCount", (setting("aidCount") ?? 0) + 1);
  return chron()?.propose?.({type: TN.aid, key: `aid:${a.kind}:${a.actorId ?? "-"}:${a.count}:${a.nonce}`, title: `${a.label}${a.actorName ? ` for ${a.actorName}` : ""}`, detail: a.text, data: a});
}

/** Approved: a dream or vision is whispered to the character's players; a thing goes into the story aids journal. */
export async function approveAid(a) {
  if ( !a ) return;
  const actor = game.actors.get(a.actorId);
  if ( N.AIDS[a.kind]?.whisper && actor ) {
    const users = all(game.users).filter(u => u.isGM || actor.testUserPermission?.(u, "OWNER")).map(u => u.id);
    await ChatMessage.create({content: `<div class="wodx-card wstory-card"><h3>${esc(a.label)}</h3><p>${esc(a.text)}</p></div>`, whisper: users,
      speaker: {alias: actor.name}, flags: {[MOD]: {aid: a.kind}}});
  }
  await appendPage(AIDS, `${a.label}${a.actorName ? `: ${a.actorName}` : ""}`, aidHtml(a), "aids");
  await log({kind: "note", actor: a.actorId ?? undefined, name: a.actorName ?? undefined, text: `${a.label}: ${a.text}`});
}

export async function aidDialog() {
  if ( !game.user.isGM ) return;
  const {DialogV2} = foundry.applications.api;
  const chars = all(game.actors).filter(a => !/group/i.test(String(a.type))).sort((x, y) => (isPC(y) - isPC(x)) || x.name.localeCompare(y.name));
  const pick = await DialogV2.wait({classes: ["wodx-dialog", "wstory-dialog", "wstory-aid"], window: {title: "A story aid"}, rejectClose: false,
    content: `<div class="form-group"><label>What</label><select name="kind" data-fixed>${Object.entries(N.AIDS).map(([k, v]) => `<option value="${k}">${esc(v.label.replace(/^An? /, ""))}</option>`).join("")}</select></div>
      <div class="form-group"><label>For</label>${searchBox("select[name=actor]", "Find a character…")}<select name="actor"><option value="">Nobody in particular</option>${chars.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join("")}</select></div>
      <p class="wodx-quiet">Built from the chronicle's own places and people, the character's first.</p>`,
    buttons: [{action: "draw", label: "Draw", default: true, callback: (ev, b) => ({kind: b.form.elements.kind.value, actorId: b.form.elements.actor.value || null})}, {action: "close", label: "Close"}]});
  if ( !pick || pick === "close" ) return;
  let nonce = 0;
  for ( ;; ) {
    const a = await drawAid({...pick, nonce});
    if ( !a ) return ui.notifications.warn("Nothing could be drawn for that.");
    const choice = await DialogV2.wait({classes: ["wodx-dialog", "wstory-dialog", "wstory-aid"], window: {title: a.label}, rejectClose: false,
      content: `<div class="wstory-draw">${aidHtml(a)}<p class="wodx-quiet">It goes to the approval queue; nothing reaches a player before you approve it.</p></div>`,
      buttons: [{action: "send", label: "Send to the queue", default: true}, {action: "again", label: "Draw again"}, {action: "close", label: "Close"}]});
    if ( choice === "again" ) { nonce++; continue; }
    if ( choice === "send" ) { await proposeAid(a); ui.notifications.info("The story aid is in the approval queue."); }
    return a;
  }
}

/** One button for the generators: the night, a story aid, and an Otherworld journey when WoDX Otherworlds has it. */
export async function drawChooser() {
  if ( !game.user.isGM ) return;
  const {DialogV2} = foundry.applications.api;
  const ow = game.modules.get("wodx-otherworlds")?.api?.journeyDialog;
  const choice = await DialogV2.wait({classes: ["wodx-dialog", "wstory-dialog"], window: {title: "Draw for the story"}, rejectClose: false,
    content: `<p>Seeded draws from WoDX's tables (folder WoDX tables, yours to edit). Each goes to the approval queue.</p>`,
    buttons: [{action: "night", label: "Tonight", default: true}, {action: "aid", label: "A story aid"}, ...(ow ? [{action: "journey", label: "An Otherworld journey"}] : []), {action: "dreams", label: "Dreams you write"}, {action: "rumours", label: "The rumour mill"}, {action: "prelude", label: "A prelude"}, {action: "close", label: "Close"}]});
  if ( choice === "night" ) return nightDialog();
  if ( choice === "aid" ) return aidDialog();
  if ( choice === "journey" ) return ow();
  if ( choice === "dreams" ) return game.modules.get(MOD)?.api?.dreams?.open?.();
  if ( choice === "rumours" ) return game.modules.get(MOD)?.api?.rumours?.open?.();
  if ( choice === "prelude" ) return game.modules.get(MOD)?.api?.prelude?.dialog?.();
}
