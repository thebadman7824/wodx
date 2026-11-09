/**
 * Otherworld journeys and the Shadowlands' decay, in Foundry. Journeys are drawn from WoDX's tables through WoDX
 * Chronicle's generator core, seeded, and go to the approval queue. The decay is drawn on each client for the token
 * it controls, when that token stands in the Shadowlands.
 */
import {MODULE_ID, placeOf} from "./ratings.mjs";
import {tokenLayer} from "./twins.mjs";
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
  const j = J.planJourney({realm, hours, year, storm, tables: g.lookup(g.context()), randFor: k => g.random(`journey:${count}:${realm}:${k}`, nonce)});
  return {...j, travellers, count, nonce, year};
}

function journeyHtml(j) {
  return `<p><b>${esc(j.realmLabel)}</b>, ${j.hours} hour${j.hours === 1 ? "" : "s"}${j.travellers.length ? `: ${esc(j.travellers.map(t => t.name).join(", "))}` : ""}</p>
    ${j.great ? `<p class="wodx-quiet">The year of ${esc(j.great)}: the storm is far likelier.</p>` : ""}
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
  await ChatMessage.create({content: `<div class="wodx-card wow-journey"><h3>The journey</h3>${journeyHtml(j)}</div>`, whisper: [...owners], speaker: {alias: "The road"},
    flags: {[MODULE_ID]: {journey: j.count}}});
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

/** The decay for this client now: the controlled token's, when it stands in the Shadowlands. */
export function decayCss() {
  let on = true;
  try { on = game.settings.get(MODULE_ID, "decay"); } catch (e) { on = true; }
  if ( !on ) return "";
  const t = canvas?.tokens?.controlled?.[0]?.document;
  if ( !t || tokenLayer(t) !== "shadowlands" ) return "";
  let shroud = null;
  try { shroud = placeOf(t)?.ratings?.shroud ?? null; } catch (e) { shroud = null; }
  return J.decayCss(shroud);
}

/** Put it on the map: through WoDX Atmosphere's grade when that is on (the two filters join), else alone. */
let last = null;
export function applyDecay() {
  const atmo = game.modules.get("wodx-atmosphere");
  if ( atmo?.active && atmo.api?.kit?.grade ) { atmo.api.kit.grade(); return; }
  const board = document.getElementById("board");
  if ( !board ) return;
  const css = decayCss();
  if ( css === last ) return;
  last = css;
  board.style.filter = css;
}
