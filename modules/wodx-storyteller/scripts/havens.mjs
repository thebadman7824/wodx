/**
 * WoDX Storyteller 0.15.0: havens with security. The rules are in haven-rules.mjs.
 *
 *   Scene flag wodx-storyteller.haven {name, owners, guests, security, known: [{who, how, at}], note}.
 *   WoDX Interactables reads it: breaking in (picking, forcing, hacking, disarming, climbing) is harder by the
 *   security for anyone who is not an owner or guest. The window is the Storyteller's; exposing a haven logs it on the
 *   tracker with a flag for attention.
 */
import * as H from "./haven-rules.mjs";
import {MOD, esc, isPC, log} from "./core.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const unset = path => { const Del = globalThis.foundry?.data?.operators?.ForcedDeletion; return Del ? {[path]: new Del()} : {[path.replace(/\.([^.]+)$/, ".-=$1")]: null}; };

export const havenOf = scene => { const raw = scene?.flags?.[MOD]?.haven; return raw ? H.normHaven(raw) : null; };
export const havens = () => game.scenes.filter(s => s.flags?.[MOD]?.haven).map(s => ({scene: s, haven: havenOf(s)}));

/** A character's backgrounds as [{name, value}], from Feature items and the sheet's own list. */
export function backgroundsOf(a) {
  const out = [];
  for ( const i of a?.items ?? [] ) if ( i.type === "Feature" && /background/.test(String(i.system?.type ?? "")) ) out.push({name: i.name, value: num(i.system?.value)});
  for ( const [k, v] of Object.entries(a?.system?.backgrounds ?? {}) ) if ( v && typeof v === "object" ) out.push({name: v.label || k, value: num(v.value)});
  return out;
}

/** The owners' best home rating (Domain, Chantry, Sanctum, Holdings, Haunt). */
export function ratingOf(haven) {
  let best = null;
  for ( const id of haven?.owners ?? [] ) {
    const r = H.ratingFrom(backgroundsOf(game.actors.get(id)));
    if ( r && (!best || r.value > best.value) ) best = r;
  }
  return best;
}

export async function saveHaven(scene, data) {
  if ( !game.user.isGM || !scene ) return null;
  const h = H.normHaven({...(havenOf(scene) ?? {}), ...data});
  h.security = H.capSecurity(h.security, ratingOf(h));
  await scene.update({[`flags.${MOD}.haven`]: h});
  return h;
}

export async function removeHaven(scene) {
  if ( !game.user.isGM || !scene?.flags?.[MOD]?.haven ) return;
  await scene.update(unset(`flags.${MOD}.haven`));
}

/** Someone has learned where the haven is: add them to the list and tell the Storyteller's tracker. */
export async function expose(scene, who, how = "") {
  if ( !game.user.isGM || !scene ) return null;
  const cur = havenOf(scene);
  if ( !cur ) return null;
  const had = cur.known.some(k => k.who.toLowerCase() === String(who ?? "").trim().toLowerCase());
  const h = H.addKnown(cur, who, how, game.time?.worldTime ?? 0);
  await scene.update({[`flags.${MOD}.haven`]: h});
  if ( !had ) {
    const owner = game.actors.get(h.owners[0]);
    await log({kind: "haven", actor: isPC(owner) ? owner.id : null, name: owner?.name ?? null, attention: "A haven is known",
      text: `${who} knows where ${h.name || scene.navName || scene.name} is${how ? ` (${how})` : ""}.`});
  }
  return h;
}

export async function forget(scene, who) {
  if ( !game.user.isGM || !havenOf(scene) ) return null;
  const h = H.forget(havenOf(scene), who);
  await scene.update({[`flags.${MOD}.haven`]: h});
  return h;
}

/** Edit the haven on one scene (the one in view by default). */
export async function editHaven(sceneId = null) {
  if ( !game.user.isGM ) return null;
  const scene = game.scenes.get(sceneId) ?? canvas?.scene;
  if ( !scene ) return ui.notifications.warn("Open a scene first.");
  const h = havenOf(scene) ?? H.normHaven({name: scene.navName || scene.name});
  const pcs = game.actors.filter(a => isPC(a));
  const box = (name, a, on) => `<li><label><input type="checkbox" name="${name}.${a.id}"${on ? " checked" : ""}> ${esc(a.name)}</label></li>`;
  const r = ratingOf(h);
  const d = H.defences({walls: scene.walls?.contents ?? [], tiles: scene.tiles?.contents ?? []});
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 560}, window: {title: `Haven: ${scene.navName || scene.name}`}, classes: ["wodx-dialog", "wst-haven-edit"],
    content: `<div class="form-group"><label>Name</label><input type="text" name="name" value="${esc(h.name)}"></div>
      ${pcs.length > 5 ? searchBox("ul.wst-haven-owners", "Search characters…", "Search characters") : ""}
      <p><b>Who lives here</b> (owner) and <b>who is welcome</b> (guest):</p>
      <div class="wst-scroll"><ul class="wst-haven-owners">${pcs.map(a => `<li>${esc(a.name)}: <label><input type="checkbox" name="owner.${a.id}"${h.owners.includes(a.id) ? " checked" : ""}> owner</label> <label><input type="checkbox" name="guest.${a.id}"${h.guests.includes(a.id) ? " checked" : ""}> guest</label></li>`).join("") || "<li>No player characters yet.</li>"}</ul></div>
      <div class="form-group"><label>Dots of security</label><input type="number" name="security" value="${h.security}" min="0" max="5"></div>
      <p class="hint">${r ? `Rated by ${esc(r.kind)} ${r.value} (${esc(r.ref)}).${r.kind === "Domain" ? " Each dot of Domain buys size or security; security can't be more than the Domain." : ""}` : "No owner has a Domain, Chantry, Sanctum, Holdings or Haunt on the sheet; the security is a house rule."}
        Each dot of security adds 1 to the difficulty of anyone else breaking in, and takes 1 from tracking them (V20 pp. 112-113). On this scene: ${d.locks} lock${d.locks === 1 ? "" : "s"}, ${d.traps} trap${d.traps === 1 ? "" : "s"}.</p>
      <div class="form-group"><label>Note</label><input type="text" name="note" value="${esc(h.note)}"></div>`,
    buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))},
      ...(havenOf(scene) ? [{action: "remove", label: "Not a haven"}] : []), {action: "cancel", label: "Cancel"}]});
  if ( !res || res === "cancel" ) return null;
  if ( res === "remove" ) return removeHaven(scene);
  const owners = pcs.filter(a => res[`owner.${a.id}`]).map(a => a.id), guests = pcs.filter(a => res[`guest.${a.id}`] && !res[`owner.${a.id}`]).map(a => a.id);
  return saveHaven(scene, {name: res.name, owners, guests, security: num(res.security), note: res.note});
}

/** Every haven: who lives there, its security, who knows where it is. */
export async function havensDialog() {
  if ( !game.user.isGM ) return null;
  const list = havens();
  const nm = id => game.actors.get(id)?.name ?? "someone gone";
  const rows = list.map(({scene, haven: h}) => `<tr><td>${esc(h.name || scene.navName || scene.name)}<br><small>${esc(scene.navName || scene.name)}</small></td>
    <td>${esc(h.owners.map(nm).join(", ") || "nobody")}</td><td>${h.security}</td>
    <td>${h.known.length ? esc(h.known.map(k => k.who).join(", ")) : "<i>nobody else</i>"}</td>
    <td><button type="button" data-wst-haven="edit" data-scene="${scene.id}">Change</button> <button type="button" data-wst-haven="expose" data-scene="${scene.id}">Someone knows…</button></td></tr>`).join("");
  const wire = (ev, dlg) => {
    for ( const b of dlg?.element?.querySelectorAll?.("[data-wst-haven]") ?? [] ) b.addEventListener("click", async () => {
      dlg.close();
      if ( b.dataset.wstHaven === "edit" ) await editHaven(b.dataset.scene);
      else await exposeDialog(b.dataset.scene);
      havensDialog();
    });
  };
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, render: wire, position: {width: 720}, window: {title: "Havens"}, classes: ["wodx-dialog", "wst-havens"],
    content: `<p>Where the characters sleep, how hard it is to break in, and who knows the way.</p>
      ${list.length > 5 ? searchBox("table.wst-havens-t", "Search havens…", "Search havens") : ""}<div class="wst-scroll"><table class="wst-havens-t"><thead><tr><th>Haven</th><th>Who lives there</th><th>Security</th><th>Who knows</th><th></th></tr></thead><tbody>${rows || "<tr><td colspan='5'>No havens yet. Open the scene and choose Make this scene a haven.</td></tr>"}</tbody></table></div>`,
    buttons: [{action: "here", label: "Make this scene a haven", default: true}, {action: "close", label: "Close"}]});
  if ( res === "here" ) { await editHaven(); return havensDialog(); }
  return null;
}

export async function exposeDialog(sceneId) {
  const scene = game.scenes.get(sceneId);
  const h = havenOf(scene);
  if ( !h ) return null;
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 480}, window: {title: `Who knows: ${h.name || scene.name}`}, classes: ["wodx-dialog", "wst-haven-known"],
    content: `${h.known.length > 5 ? searchBox("ul.wst-known", "Search…", "Search who knows") : ""}<ul class="wst-known">${h.known.map(k => `<li><label><input type="checkbox" name="forget.${esc(k.who)}"> forget</label> <b>${esc(k.who)}</b>${k.how ? `: ${esc(k.how)}` : ""}</li>`).join("") || "<li>Nobody else knows yet.</li>"}</ul>
      <div class="form-group"><label>Now known to</label><input type="text" name="who" placeholder="A rival, a faction, a hunter"></div>
      <div class="form-group"><label>How</label><input type="text" name="how" placeholder="Followed home before dawn"></div>`,
    buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))}, {action: "cancel", label: "Cancel"}]});
  if ( !res || res === "cancel" ) return null;
  for ( const k of Object.keys(res).filter(x => x.startsWith("forget.")) ) await forget(scene, k.slice(7));
  if ( String(res.who ?? "").trim() ) await expose(scene, res.who.trim(), res.how);
  return havenOf(scene);
}
