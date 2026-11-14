/**
 * WoDX Storyteller: the night's draw and the story aids, in Foundry. The tables go to WoDX Chronicle's generator core
 * (folder "WoDX tables", editable); every draw is seeded and goes to the approval queue, and nothing reaches a player
 * or the world before the Storyteller approves it.
 */
import {MOD, esc, chron, setting, isActiveGM, log, entries, isPC} from "./core.mjs";
import * as N from "./night-rules.mjs";
import * as Pace from "./pacing-rules.mjs";
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
  // B3924: the night card's "Put it on the scene" buttons (the Storyteller's only)
  Hooks.on("renderChatMessageHTML", (message, el) => {
    const html = el?.[0] ?? el;
    const f = message.flags?.[MOD]?.nightPlace;
    if ( !html || !f ) return;
    for ( const b of html.querySelectorAll?.("[data-action=wst-night-place]") ?? [] ) {
      if ( !game.user.isGM ) { b.remove(); continue; }
      const i = Number(b.dataset.i);
      if ( (f.done ?? []).includes(i) ) b.disabled = true;
      b.addEventListener("click", () => { b.disabled = true; placeFromCard(message, i).catch(e => console.error(`${MOD} | night place`, e)); });
    }
  });
  // 0.41.0: a fight goes in the log, so the pacing note knows a night was hard
  Hooks.on("wodxFightStarted", ({combat} = {}) => {
    if ( !isActiveGM() ) return;
    const sc = combat?.scene ?? canvas?.scene;
    log({kind: "note", place: sc?.id ?? null, text: `${Pace.FIGHT_TEXT}${sc ? ` on ${sc.navName || sc.name}` : ""}.`}).catch(e => console.error(`${MOD} |`, e));
  });
}

/** The pacing note for the night's draw (the Storyteller's only), or null. */
export function pacingNow() {
  try { return Pace.pacingNote(entries(), game.time.worldTime); } catch (e) { return null; }
}
const paceHtml = p => (p ? `<p class="wstory-pace"><i class="fa-solid fa-gauge-simple"></i> <b>Pacing:</b> ${esc(p.text)} <span class="wodx-quiet">It does not change the draw.</span></p>` : "");

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
  // B3652: one draw in three gives an open Threads of Fate storyline's beat as well (desk item 9)
  let thread = null;
  try { thread = game.modules.get(MOD)?.api?.threads?.nightBeat?.(g.random(`night:${jdn}:thread`, nonce)) ?? null; } catch (e) { thread = null; }
  return {...n, pulls: pullsFor(g, jdn, nonce), jdn, nonce, date: jdn === at.jdn ? at.label : "", weather, era: ctx.eraId,
    thread: thread ? {key: thread.key, title: thread.title, step: thread.step?.title ?? "", text: thread.step?.text ?? ""} : null};
}

/** The trouble dial set before the first night (WoDX Creation 0.12.0): 0.5, 1 or 1.5. */
function dialOf(actor) {
  try {
    const C = game.modules.get("wodx-creation")?.api;
    return C?.firstNightRules?.dialScale?.(C.firstNightOf?.(actor)?.dial) ?? 1;
  } catch (e) { return 1; }
}

/** Chronicle 0.22.0: what the player characters' merits and flaws bring into the night (Hunted, Haunted, Oracular Ability). */
function pullsFor(g, jdn, nonce) {
  const T = chron()?.traits;
  if ( !T?.pulls ) return [];
  const out = [];
  for ( const a of all(game.actors).filter(isPC) ) {
    const base = g.random(`night:${jdn}:pull:${a.id}`, nonce);
    // Creation 0.12.0: the character's trouble dial (Quiet, Normal, Often) scales how often their own flaws turn up
    const scale = dialOf(a);
    const rand = scale === 1 ? base : () => base() / scale;
    try { for ( const p of T.pulls(a, rand) ) out.push({actorId: a.id, actorName: a.name, ...p}); } catch (e) { /* no traits */ }
  }
  return out;
}

function nightHtml(n) {
  return `<p class="wodx-quiet">${esc(n.date || "")}${n.date ? ", " : ""}${esc(n.partLabel)}${n.weather ? `. ${esc(n.weather)}` : ""}</p>
    <p>${esc(n.opening)}</p><ul>${n.encounters.map(e => `<li><b>${esc(e.label)}:</b> ${esc(e.text)}</li>`).join("")}</ul>
    ${n.rumour ? `<p><b>A rumour:</b> ${esc(n.rumour)}</p>` : ""}
    ${n.thread ? `<p><b>A storyline moves (${esc(n.thread.title)}):</b> ${esc(n.thread.step)}${n.thread.text ? `. ${esc(n.thread.text)}` : ""}</p>` : ""}
    ${(n.pulls ?? []).length ? `<p><b>From the characters' flaws and merits:</b></p><ul>${n.pulls.map(p => `<li><b>${esc(p.name)}</b> (${esc(p.actorName)}): ${esc(p.text || `a story aid is drawn for ${p.actorName}`)}</li>`).join("")}</ul>` : ""}`;
}

export async function proposeNight(n) {
  const p = pacingNow();
  return chron()?.propose?.({type: TN.night, key: `night:${n.jdn}:${n.nonce}`, title: `The night's draw${n.date ? `: ${n.date}` : ""}`, detail: `${p ? `Pacing: ${p.text} ` : ""}${N.nightText(n)}${n.thread ? ` A storyline moves (${n.thread.title}): ${n.thread.step}.` : ""}`, data: n});
}

/** Approved: into the log and the nights journal. */
export async function approveNight(n) {
  if ( !n ) return;
  await log({kind: "world", text: `The night's draw: ${N.nightText(n)}`});
  await appendPage(NIGHTS, n.date || `Night ${n.jdn}`, nightHtml(n), "nights");
  await placeCard(n);
  // The night's rumour starts going round
  if ( n.rumour && setting("rumourNetwork") !== false ) await game.modules.get(MOD)?.api?.rumours?.start?.({text: n.rumour});
  // Chronicle 0.22.0: a trait that brings a story aid draws it (into the queue), and the night's flaws are asked about
  for ( const p of (n.pulls ?? []).filter(x => x.aid) ) { try { await drawAid({kind: p.aid, actorId: p.actorId}).then(a => a && proposeAid(a)); } catch (e) { /* no aid */ } }
  try { await chron()?.traits?.prompt?.(all(game.actors).filter(isPC), "night", {at: `${n.jdn}`}); } catch (e) { /* no traits */ }
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
      content: `<div class="wstory-draw">${paceHtml(pacingNow())}${nightHtml(n)}<p class="wodx-quiet">Nothing reaches the players until you approve it in the queue.</p></div>`,
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
  const item = await makeAidItem(a);
  await appendPage(AIDS, `${a.label}${a.actorName ? `: ${a.actorName}` : ""}`, aidHtml(a) + (item ? `<p>The thing itself: @UUID[${item.uuid}]{${esc(item.name)}}. Drag it to whoever finds it.</p>` : ""), "aids");
  await log({kind: "note", actor: a.actorId ?? undefined, name: a.actorName ?? undefined, text: `${a.label}: ${a.text}`});
  return item;
}

/**
 * B3924: a relic, fetish or talisman aid becomes a real item in the Items folder "WoDX story aids", made by WoDX
 * Library's crafting kits so its Use buttons work (True Faith prayer, talisman charges, a fetish to attune). The
 * Storyteller hands it on; nothing goes to a character's sheet here. Returns the item, or null.
 */
export async function makeAidItem(a) {
  if ( !a || !game.user.isGM || !["relic", "fetish", "talisman"].includes(a.kind) ) return null;
  const W = game.modules.get("wodx-library")?.api?.wonders;
  if ( !W?.kitFor ) return null;
  const g = chron()?.gen;
  const rand = g?.random?.(`aid-item:${a.kind}:${a.actorId ?? "-"}:${a.count ?? 0}`, a.nonce ?? 0) ?? Math.random;
  const data = N.aidItem(a, {kitFor: W.kitFor, rowOf: W.rowOf, rows: line => W.kitFor(line)?.rows?.() ?? [], rand});
  if ( !data ) return null;
  const folder = all(game.folders).find(f => f.type === "Item" && f.name === AIDS) ?? await Folder.create({name: AIDS, type: "Item"});
  return Item.create({...data, folder: folder.id});
}

/* ---- B3924: the night's people, put on a scene ---- */

const MAX_PLACED = 6;
/** After a night is approved: a card for the Storyteller with a "Put it on the scene" button for each physical encounter. */
export async function placeCard(n) {
  const enc = (n?.encounters ?? []).map((e, i) => ({i, label: e.label, text: e.text, layer: e.layer})).filter(e => e.layer === "physical");
  if ( !enc.length || !game.user.isGM ) return null;
  const rows = enc.map(e => `<li><b>${esc(e.label)}:</b> ${esc(e.text)} <button type="button" data-action="wst-night-place" data-i="${e.i}">Put it on the scene</button></li>`).join("");
  return ChatMessage.create({speaker: {alias: "Storyteller"}, whisper: all(game.users).filter(u => u.isGM).map(u => u.id),
    content: `<div class="wodx-card wstory-card"><h3>Tonight's people</h3><ul>${rows}</ul><p class="wodx-quiet">The button makes the people with WoDX Creation and puts them, hidden, at the middle of the scene you are looking at.</p></div>`,
    flags: {[MOD]: {nightPlace: {jdn: n.jdn, nonce: n.nonce ?? 0, encounters: enc, done: []}}}});
}

export async function placeFromCard(message, i) {
  const f = message.flags?.[MOD]?.nightPlace;
  const e = f?.encounters?.find(x => x.i === i);
  if ( !e || (f.done ?? []).includes(i) ) return null;
  const made = await placeEncounter(e.text, {key: `night${f.jdn}x${i}`, nonce: f.nonce});
  await message.update({[`flags.${MOD}.nightPlace.done`]: [...(f.done ?? []), i]});
  return made;
}

/**
 * Make the people one encounter line brings (N.peopleIn) with WoDX Creation's people generator, seeded by key, and put
 * their tokens hidden on the current scene. Returns the tokens made (or the actors when no scene is open).
 */
export async function placeEncounter(text, {key = "night", nonce = 0, x = null, y = null} = {}) {
  if ( !game.user.isGM ) return [];
  const P = game.modules.get("wodx-creation")?.api?.people;
  const g = chron()?.gen;
  if ( !P?.generate || !P?.create || !g ) { ui.notifications?.warn?.("WoDX Creation makes the night's people; it is not active."); return []; }
  const trades = g.lookup(g.context())("people.trade")?.results?.map(r => r.text) ?? [];
  const who = N.peopleIn(text);
  const people = [];
  let row = 0;
  for ( const w of who ) for ( let k = 0; k < w.count && people.length < MAX_PLACED; k++, row++ ) {
    const trade = N.tradeFor(w.role, trades, g.random(`${key}:trade:${row}`, nonce));
    try { people.push(P.generate({batch: key, row, nonce, trade})); } catch (err) { console.warn(`${MOD} | night person`, err); }
  }
  if ( !people.length ) return [];
  const actors = await P.create({people});
  const scene = canvas?.scene;
  if ( !scene ) return actors;
  const size = scene.grid?.size ?? 100;
  const cx = x ?? (canvas.stage?.pivot?.x ?? 0), cy = y ?? (canvas.stage?.pivot?.y ?? 0);
  const tokens = [];
  for ( const [j, a] of actors.entries() ) {
    const t = await a.getTokenDocument({x: cx + (j % 3) * size, y: cy + Math.floor(j / 3) * size, hidden: true});
    tokens.push(t.toObject());
  }
  const made = tokens.length ? await scene.createEmbeddedDocuments("Token", tokens) : [];
  await log({kind: "note", place: scene.id, text: `Put on ${scene.navName || scene.name}: ${actors.map(a => a.name).join(", ")} (${text})`});
  return made;
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
