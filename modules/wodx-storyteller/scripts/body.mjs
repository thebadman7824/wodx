/**
 * WoDX Storyteller 0.16.0: bodies that change. The rules are in body-rules.mjs.
 *
 *   Actor flag wodx-storyteller.body [{id, source, part, what, appearance, shows, by, at, note}].
 *   The Storyteller adds a change from the character's sheet (header button "Lasting changes") or the API. A change
 *   to Appearance is applied to the sheet at once and taken back by Undo on the card or by removing the change. The
 *   owner sees the list on their sheet. WoDX Paperdoll can read the changes that show, by part.
 */
import * as B from "./body-rules.mjs";
import {MOD, esc} from "./core.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const ownerIds = a => game.users.filter(u => !u.isGM && a?.testUserPermission?.(u, "OWNER")).map(u => u.id);

export const bodyOf = a => B.normBody(a?.flags?.[MOD]?.body);
export const shownOf = a => B.shownByPart(a?.flags?.[MOD]?.body);

function appearanceOf(a) {
  const ap = a?.system?.attributes?.appearance;
  if ( !ap || typeof ap !== "object" ) return null;
  const locked = B.ZERO_APPEARANCE.test(`${a.system?.clan ?? ""} ${a.system?.bloodline ?? ""}`);
  return {value: num(ap.value), max: num(ap.max) || 5, locked};
}

/** Apply a change to Appearance; returns the dots actually moved (0 when held at 0 or at a limit). */
async function shiftAppearance(a, delta) {
  const ap = appearanceOf(a);
  if ( !ap || !delta ) return 0;
  const to = B.appearanceAfter(ap.value, delta, ap);
  if ( to === ap.value ) return 0;
  await a.update({"system.attributes.appearance.value": to});
  return to - ap.value;
}

/** Add a lasting change. Storyteller only. Returns the stored change. */
export async function addChange(a, data = {}) {
  if ( !game.user.isGM || !a ) return null;
  const c = B.normChange({...data, at: data.at ?? game.time?.worldTime ?? 0});
  if ( !c ) return null;
  const moved = await shiftAppearance(a, c.appearance);
  c.appearance = moved;
  await a.update({[`flags.${MOD}.body`]: [...bodyOf(a), c]});
  const ref = B.SOURCES[c.source].ref;
  await ChatMessage.create({speaker: ChatMessage.getSpeaker({actor: a}), whisper: [...gmIds(), ...ownerIds(a)],
    flags: {[MOD]: {body: {actor: a.id, change: c.id}}},
    content: `<div class="wodx-card wst-body-card"><p><b>${esc(a.name)}</b>: a lasting change. ${esc(B.describeChange(c))}.</p>
      <p><small>${esc(B.SOURCES[c.source].label)}${ref ? `, ${esc(ref)}` : ""}${data.appearance && !moved ? ". Appearance did not move (held at 0 or at its limit)" : ""}.</small></p>
      <button type="button" data-action="wst-body-undo">Undo</button></div>`});
  return c;
}

/** Take a change back off the record, and put back the Appearance it moved. */
export async function removeChange(a, id) {
  if ( !game.user.isGM || !a ) return null;
  const list = bodyOf(a), c = list.find(x => x.id === id);
  if ( !c ) return null;
  if ( c.appearance ) await shiftAppearance(a, -c.appearance);
  await a.update({[`flags.${MOD}.body`]: list.filter(x => x.id !== id)});
  return c;
}

async function undoCard(message) {
  const f = message.flags?.[MOD]?.body;
  const a = game.actors.get(f?.actor);
  if ( !a ) return;
  const c = await removeChange(a, f.change);
  if ( c ) await message.update({content: `<div class="wodx-card wst-body-card"><p><s>${esc(a.name)}: ${esc(B.describeChange(c))}</s> (undone)</p></div>`});
}

const opts = (obj, sel) => Object.entries(obj).map(([k, v]) => `<option value="${k}"${k === sel ? " selected" : ""}>${esc(typeof v === "string" ? v : v.label)}</option>`).join("");

/** The form for a new change. */
export async function newChangeDialog(a) {
  if ( !game.user.isGM || !a ) return null;
  const ap = appearanceOf(a);
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 520}, window: {title: `A lasting change: ${a.name}`}, classes: ["wodx-dialog", "wst-body-new"],
    content: `<div class="form-group"><label>From</label><select name="source" data-fixed>${opts(B.SOURCES, "vicissitude")}</select></div>
      <div class="form-group"><label>Where</label><select name="part" data-fixed>${opts(B.PARTS, "face")}</select></div>
      <div class="form-group"><label>What changed</label><input type="text" name="what" placeholder="Cheekbones raised, a second row of teeth"></div>
      <div class="form-group"><label>Appearance</label><input type="number" name="appearance" value="0" min="-5" max="5"></div>
      <p class="hint">${ap ? `Appearance is ${ap.value} now.${ap.locked ? " This character is held at 0 by their clan, so the dots stay where they are." : ""}` : "This sheet has no Appearance."} Use the dots the power or the book gives; 0 keeps Appearance as it is.</p>
      <div class="form-group"><label><input type="checkbox" name="shows" checked> Others can see it</label></div>
      <div class="form-group"><label>Done by</label><input type="text" name="by" placeholder="Who did it, if anyone"></div>
      <div class="form-group"><label>Note</label><input type="text" name="note"></div>`,
    buttons: [{action: "save", label: "Add", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))}, {action: "cancel", label: "Cancel"}]});
  if ( !res || res === "cancel" ) return null;
  if ( !String(res.what ?? "").trim() ) { ui.notifications.warn("Say what changed."); return null; }
  return addChange(a, {...res, appearance: num(res.appearance), shows: !!res.shows});
}

/** The record for one character. The Storyteller can add and remove; the owner reads it. */
export async function bodyDialog(actorOrId) {
  const a = typeof actorOrId === "string" ? game.actors.get(actorOrId) : actorOrId;
  if ( !a || !(game.user.isGM || a.isOwner) ) return null;
  const gm = game.user.isGM;
  const list = bodyOf(a);
  const rows = list.map(c => `<li>${esc(B.describeChange(c))}<br><small>${esc(B.SOURCES[c.source].label)}${c.by ? `, by ${esc(c.by)}` : ""}${c.note ? `. ${esc(c.note)}` : ""}</small>
    ${gm ? ` <button type="button" data-wst-body="remove" data-id="${c.id}">Remove</button>` : ""}</li>`).join("");
  const wire = (ev, dlg) => {
    for ( const b of dlg?.element?.querySelectorAll?.("[data-wst-body]") ?? [] ) b.addEventListener("click", async () => {
      dlg.close();
      await removeChange(a, b.dataset.id);
      bodyDialog(a);
    });
  };
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, render: wire, position: {width: 560}, window: {title: `Lasting changes: ${a.name}`}, classes: ["wodx-dialog", "wst-body"],
    content: `<p>What has changed for good in ${esc(a.name)}'s body: flesh reshaped, a deformity from birth, a visage breaking through, a scar that never healed.</p>
      ${list.length > 5 ? searchBox("ul.wst-body-list", "Search changes…", "Search changes") : ""}<div class="wst-scroll"><ul class="wst-body-list">${rows || "<li>No lasting changes.</li>"}</ul></div>`,
    buttons: [...(gm ? [{action: "add", label: "Add a change", default: true}] : []), {action: "close", label: "Close"}]});
  if ( res === "add" ) { await newChangeDialog(a); return bodyDialog(a); }
  return null;
}

export function registerBodyHooks() {
  const can = a => !!a && (game.user.isGM || (a.isOwner && bodyOf(a).length > 0));
  Hooks.on("getHeaderControlsActorSheetV2", (app, controls) => {
    const a = app.document;
    if ( !can(a) || controls.some(c => c.action === "wstBody") ) return;
    const go = () => bodyDialog(a);
    if ( app.options?.actions ) app.options.actions.wstBody = go;
    controls.push({icon: "fa-solid fa-dna", label: "Lasting changes", action: "wstBody", onClick: go});
  });
  Hooks.on("getActorSheetHeaderButtons", (sheet, buttons) => {
    if ( !can(sheet.actor) || buttons.some(b => b.class === "wst-body") ) return;
    buttons.unshift({label: "Lasting changes", class: "wst-body", icon: "fa-solid fa-dna", onclick: () => bodyDialog(sheet.actor)});
  });
  Hooks.on("renderChatMessageHTML", (message, el) => {
    const html = el?.[0] ?? el;
    if ( !game.user.isGM || !html || !message.flags?.[MOD]?.body ) return;
    html.querySelector?.("[data-action=wst-body-undo]")?.addEventListener("click", () => undoCard(message));
  });
}
