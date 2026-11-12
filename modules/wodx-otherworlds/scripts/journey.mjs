/**
 * Otherworld journeys and the Shadowlands' decay, in Foundry. Journeys are drawn from WoDX's tables through WoDX
 * Chronicle's generator core, seeded, and go to the approval queue. The decay is drawn on each client for the token
 * it controls, when that token stands in the Shadowlands.
 */
import {MODULE_ID, placeOf} from "./ratings.mjs";
import {tokenLayer} from "./twins.mjs";
import {STATUS} from "./crossing.mjs";
import * as J from "./journey-rules.mjs";
import {JOURNEY_TABLES} from "../data/journey-tables.mjs";

export {J};
export const TYPE = `${MODULE_ID}.journey`;
const chron = () => game.modules.get("wodx-chronicle")?.api ?? null;
const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const all = c => (c ? [...(c.contents ?? c)] : []);

export function registerJourneySettings() {
  game.settings.register(MODULE_ID, "journeyCount", {scope: "world", config: false, type: Number, default: 0});
  game.settings.register(MODULE_ID, "decay", {name: "Shadowlands decay on the map", hint: "When your token stands in the Shadowlands, the map greys and rots by the local Shroud (lower Shroud, more decay).",
    scope: "client", config: true, type: Boolean, default: true, onChange: () => applyDecay()});
  game.settings.register(MODULE_ID, "looks", {name: "Looks of the other worlds", hint: "When your token stands in the Near Dreaming, its colours shimmer; when your character is jacked into the Net, the map shows as glowing lines.",
    scope: "client", config: true, type: Boolean, default: true, onChange: () => applyDecay()});
}

export function registerJourneys() {
  const go = () => {
    chron()?.gen?.registerTables?.(MODULE_ID, JOURNEY_TABLES);
    chron()?.registerApprovalHandler?.(TYPE, {label: "Otherworld journey", approve: e => approveJourney(e.data)});
  };
  if ( chron()?.gen ) go(); else Hooks.once("wodxChronicleReady", go);
}

/** Draw a journey, seeded by its count and the realm. */
export function drawJourney({realm = "tempest", hours = 2, storm = false, travellers = [], count = null, nonce = 0} = {}) {
  const g = chron()?.gen;
  if ( !g ) return null;
  count ??= game.settings.get(MODULE_ID, "journeyCount") ?? 0;
  const year = chron()?.eras?.currentYear?.() ?? null;
  let fired = null, moon = null;
  try { fired = chron()?.events?.fired?.() ?? null; } catch (e) { fired = null; }
  try { moon = moonNow(); } catch (e) { moon = null; }
  const j = J.planJourney({realm, hours, year, storm, fired, moon, tables: g.lookup(g.context()), randFor: k => g.random(`journey:${count}:${realm}:${k}`, nonce)});
  return {...j, travellers, count, nonce, year};
}

/** The moon's phase index now (0 new ... 4 full), from WoDX Chronicle's calendar. */
let CAL = null;
import("../../wodx-chronicle/scripts/calendar.mjs").then(m => { CAL = m; }).catch(() => { CAL = null; });
export function moonNow() {
  if ( !CAL ) return null;
  let lat;
  try { lat = game.settings.get("wodx-chronicle", "latitude"); } catch (e) { return null; }
  return CAL.describeTime(game.time.worldTime, lat)?.moon?.index ?? null;
}

function journeyHtml(j) {
  return `<p><b>${esc(j.realmLabel)}</b>, ${j.hours} hour${j.hours === 1 ? "" : "s"}${j.travellers.length ? `: ${esc(j.travellers.map(t => t.name).join(", "))}` : ""}</p>
    ${j.great ? `<p class="wodx-quiet">The year of ${esc(j.great)}: the storm is far likelier.</p>` : ""}
    ${j.moonRisk ? `<p class="wodx-quiet">${j.moonRisk < 1 ? "The moon is full or near it: the road is safer." : j.moonRisk > 1 ? "The moon is dark or nearly: the road is more dangerous." : "A half moon."}</p>` : ""}
    ${j.arrival ? `<p class="wodx-quiet">Time on the trod: ${esc(J.slipWords(j.arrival))}.</p>` : ""}
    ${j.note ? `<p class="wodx-quiet">${esc(j.note)}</p>` : ""}
    ${(() => { const t = J.timeOutside(j); return `<p class="wodx-quiet">Time: ${esc(t.words)}.${t.note ? ` ${esc(t.note)}` : ""}</p>`; })()}
    <ol>${j.legs.map(l => `<li>${esc(l.landmark)}${l.hazard ? `<br><b>Hazard:</b> ${esc(l.hazard)}` : ""}${l.maelstrom ? `<br><b>The Maelstrom:</b> ${esc(l.maelstrom)}` : ""}</li>`).join("")}</ol>`;
}

export async function proposeJourney(j) {
  await game.settings.set(MODULE_ID, "journeyCount", (game.settings.get(MODULE_ID, "journeyCount") ?? 0) + 1);
  return chron()?.propose?.({type: TYPE, key: `journey:${j.count}:${j.realm}:${j.nonce}`, title: `Otherworld journey: ${j.realmLabel}`, detail: J.journeyText(j), data: j});
}

/** Approved: the Storyteller gets the card; the travellers' players get it too when asked; the tracker logs it. */
export async function approveJourney(j) {
  if ( !j ) return;
  const gms = all(game.users).filter(u => u.isGM).map(u => u.id);
  const owners = new Set(gms);
  if ( j.tell ) for ( const t of j.travellers ?? [] ) { const a = game.actors.get(t.actorId); for ( const u of all(game.users) ) if ( a?.testUserPermission?.(u, "OWNER") ) owners.add(u.id); }
  // 0.15.0: the Storyteller's copy has a button that lets the journey's time pass (B1964)
  const ids = (j.travellers ?? []).map(t => t.actorId).filter(Boolean);
  const t = J.timeOutside(j);
  const button = t.seconds && ids.length ? `<button type="button" class="wow-journey-time" data-gm-only><i class="fa-solid fa-hourglass-half"></i> Let the journey's time pass</button>` : "";
  await ChatMessage.create({content: `<div class="wodx-card wow-journey"><h3>The journey</h3>${journeyHtml(j)}${button}</div>`, whisper: [...owners], speaker: {alias: "The road"},
    flags: {[MODULE_ID]: {journey: j.count, time: button ? {ids, seconds: t.seconds, done: false} : null}}});
  try { await game.modules.get("wodx-storyteller")?.api?.log?.({kind: "travel", text: `Otherworld journey (${j.realmLabel}, ${j.hours} h): ${J.journeyText(j)}`}); } catch (e) { /* tracker off */ }
}

/** The Storyteller's window: realm, hours, the selected tokens as travellers; draw again until it fits. */
export async function journeyDialog() {
  if ( !game.user.isGM ) return;
  const {DialogV2} = foundry.applications.api;
  const travellers = (canvas?.tokens?.controlled ?? []).map(t => ({actorId: t.actor?.id ?? null, name: t.name}));
  const form = await DialogV2.wait({classes: ["wodx-dialog", "wow-dialog", "wow-journey-dialog"], window: {title: "An Otherworld journey"}, rejectClose: false,
    content: `<div class="form-group"><label>Through</label><select name="realm" data-fixed>${Object.entries(J.REALMS).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join("")}</select></div>
      <div class="form-group"><label>Hours on the way</label><input type="number" name="hours" value="4" min="1" max="16"></div>
      <div class="form-group"><label>A Maelstrom is raging</label><input type="checkbox" name="storm"></div>
      <div class="form-group"><label>Tell the travellers' players</label><input type="checkbox" name="tell"></div>
      <p class="wodx-quiet">${travellers.length ? `Travellers: ${esc(travellers.map(t => t.name).join(", "))}.` : "Select the travellers' tokens first to name them on the card."}</p>`,
    buttons: [{action: "draw", label: "Draw", default: true, callback: (ev, b) => ({realm: b.form.elements.realm.value, hours: Number(b.form.elements.hours.value) || 1,
      storm: b.form.elements.storm.checked, tell: b.form.elements.tell.checked})}, {action: "close", label: "Close"}]});
  if ( !form || form === "close" ) return;
  let nonce = 0;
  for ( ;; ) {
    const j = drawJourney({...form, travellers, nonce});
    if ( !j ) return ui.notifications.warn("WoDX Chronicle's generators are not ready.");
    j.tell = form.tell;
    const choice = await DialogV2.wait({classes: ["wodx-dialog", "wow-dialog", "wow-journey-dialog"], window: {title: "The journey"}, rejectClose: false,
      content: `<div class="wow-draw">${journeyHtml(j)}<p class="wodx-quiet">It goes to the approval queue; nothing reaches a player before you approve it.</p></div>`,
      buttons: [{action: "send", label: "Send to the queue", default: true}, {action: "again", label: "Draw again"}, {action: "close", label: "Close"}]});
    if ( choice === "again" ) { nonce++; continue; }
    if ( choice === "send" ) { await proposeJourney(j); ui.notifications.info("The journey is in the approval queue."); }
    return j;
  }
}

/* ---- the Shadowlands' decay ---- */

/** The look for this client now: the controlled token's layer (the Shadowlands' decay, the Dreaming's shimmer, the Net's lines). */
const flag = key => { try { return game.settings.get(MODULE_ID, key) !== false; } catch (e) { return true; } };
const viewer = () => globalThis.canvas?.tokens?.controlled?.[0]?.document ?? null;
const viewerLayer = t => t ? {layer: tokenLayer(t), inNet: !!t.actor?.statuses?.has?.(STATUS.net.id)} : {layer: "physical", inNet: false};
let phase = 1;
export function decayCss() {
  const t = viewer();
  if ( !t ) return "";
  const {layer, inNet} = viewerLayer(t);
  let shroud = null;
  if ( layer === "shadowlands" ) { try { shroud = placeOf(t)?.ratings?.shroud ?? null; } catch (e) { shroud = null; } }
  if ( inNet && flag("looks") ) netFilter();
  return J.layerLookCss({layer, inNet, shroud, phase, looks: flag("looks"), decay: flag("decay")});
}
export const lookCss = decayCss;
/** The Net's SVG filter, put in the page once. */
function netFilter() {
  if ( document.getElementById(J.NET_FILTER_ID) ) return;
  const holder = document.createElement("div");
  holder.id = `${J.NET_FILTER_ID}-holder`;
  holder.innerHTML = J.NET_SVG;
  document.body.appendChild(holder);
}
/** The Dreaming's sway: the hue eases one way and back while the viewer stands there. */
let sway = null;
function keepSway() {
  const {layer, inNet} = viewerLayer(viewer());
  const want = layer === "dreaming" && !inNet && flag("looks");
  const board = globalThis.document?.getElementById?.("board");
  if ( want && !sway ) {
    const half = J.LOOKS.dreaming.period / 2;
    if ( board ) board.style.transition = `filter ${half}ms ease-in-out`;
    sway = setInterval(() => { phase = -phase; applyDecay(); }, half);
  } else if ( !want && sway ) {
    clearInterval(sway); sway = null; phase = 1;
    if ( board ) board.style.transition = "";
  }
  return want;
}
export const swaying = () => !!sway;

/** Put it on the map: through WoDX Atmosphere's grade when that is on (the two filters join), else alone. */
let last = null;
export function applyDecay() {
  keepSway();
  const atmo = game.modules.get("wodx-atmosphere");
  if ( atmo?.active && atmo.api?.kit?.grade ) { atmo.api.kit.grade(); return; }
  const board = document.getElementById("board");
  if ( !board ) return;
  const css = decayCss();
  if ( css === last ) return;
  last = css;
  board.style.filter = css;
}

/** 0.15.0: Storyteller presses the card's button: the travellers' time passes (their own time when apart), once. */
export async function passJourneyTime(msg) {
  const d = msg?.getFlag?.(MODULE_ID, "time");
  if ( !game.user.isGM || !d || d.done ) return null;
  const time = game.modules.get("wodx-storyteller")?.active ? game.modules.get("wodx-storyteller")?.api?.time : null;
  let line;
  if ( time?.spend ) {
    const r = await time.spend({actorIds: d.ids ?? [], seconds: d.seconds, label: "an Otherworld journey"});
    line = time.note?.(r, (d.ids ?? []).map(id => game.actors.get(id)?.name).filter(Boolean).join(", ")) ?? "";
  } else { await game.time.advance(d.seconds); line = "The clock has moved on."; }
  await msg.setFlag(MODULE_ID, "time", {...d, done: true});
  if ( line ) ui.notifications.info(line);
  return line;
}
Hooks.on("renderChatMessageHTML", (msg, el) => {
  const b = el?.querySelector?.(".wow-journey-time");
  if ( !b ) return;
  if ( !game.user.isGM || msg.getFlag?.(MODULE_ID, "time")?.done ) { b.remove(); return; }
  b.addEventListener("click", () => { b.disabled = true; passJourneyTime(msg).catch(e => { b.disabled = false; console.error("WoDX | journey time", e); }); });
});
