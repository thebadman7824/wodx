/**
 * WoDX NPC 0.7.0: faces you have met. The rules are in faces-rules.mjs.
 *
 * Each player's computer rewrites the name under an NPC's token to the description until one of their characters has
 * been introduced. The Storyteller's token HUD has a button to introduce the characters on the scene (or pick others)
 * and to write the description. From 0.33.0 (B1382) chat messages and the combat tracker use the description too, for
 * the NPCs on the scene or in the fight; sheets are not changed.
 */
import * as F from "./faces-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const MOD = "wodx-npc";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const on = () => { try { return !!game.settings.get(MOD, "faces"); } catch (e) { return false; } };
const isPC = a => !!a && a.hasPlayerOwner && !/group/i.test(String(a.type ?? ""));
const mine = () => (game.actors?.contents ?? []).filter(a => isPC(a) && a.isOwner).map(a => a.id);

export function registerFaceSettings() {
  game.settings.register(MOD, "faces", {name: "Faces you have met", hint: "Players see a short description under an NPC's token instead of the name until their character has been introduced (the NPC's token HUD).",
    scope: "world", config: true, type: Boolean, default: false, onChange: () => refreshAll()});
}

/** NPC 0.34.0: the stranger line, built from what shows, kept a few seconds per token (refreshToken fires often). */
const autoCache = new Map();
function autoFor(token, a, ids) {
  const key = token.document?.uuid ?? token.id, now = Date.now();
  const hit = autoCache.get(key);
  if ( hit && now - hit.at < 5000 ) return hit.text;
  let text = "";
  try {
    const base = (a.isToken ? a.token?.baseActor : null) ?? game.actors?.get?.(a.id) ?? a;
    const api = game.modules.get(MOD)?.api;
    const tpl = api?.profileFor?.(base, {phases: false})?.template ?? null;
    const animal = api?.animals?.[tpl] ? (api.animals[tpl].template?.label ?? api.animals[tpl].crowd ?? tpl) : null;
    const lk = game.modules.get("wodx-library")?.api?.look ?? null;
    const look = lk?.of?.(a) ?? null;
    const me = ids.map(id => game.actors.get(id)).find(Boolean) ?? null;
    let step = null;
    try { step = me ? api?.attitude?.of?.(base, me)?.step ?? null : null; } catch (e) { step = null; }
    text = F.autoStranger({station: look && look.worn?.length ? look.station : null, sides: look?.sides ?? [], condition: look?.condition ?? [],
      activity: base.flags?.[MOD]?.where?.activity ?? null, step, animal});
  } catch (e) { text = ""; }
  autoCache.set(key, {at: now, text});
  return text;
}

/** The nameplate for this player. */
export function applyName(token) {
  const a = token?.actor, plate = token?.nameplate;
  if ( !a || !plate || game.user.isGM ) return;
  const flags = a.flags?.[MOD] ?? {}, ids = mine();
  const auto = !String(flags.stranger ?? "").trim() && on() && !a.hasPlayerOwner && !F.knows(flags, ids) ? autoFor(token, a, ids) : "";
  const want = F.nameFor({name: token.document.name, flags, mine: ids, gm: game.user.isGM, on: on(), playerOwned: a.hasPlayerOwner, auto});
  if ( plate.text !== want ) plate.text = want;
}
function refreshAll() {
  for ( const t of canvas?.tokens?.placeables ?? [] ) { try { t.renderFlags?.set?.({refreshNameplate: true}); applyName(t); } catch (e) { /* drawn next refresh */ } }
}

/** The Storyteller's window: who has met this face, and what strangers see. */
export async function openFaces(actor) {
  if ( !game.user.isGM || !actor ) return;
  const f = actor.flags?.[MOD] ?? {}, met = new Set(F.metList(f));
  const here = new Set((canvas.scene?.tokens?.contents ?? []).map(t => t.actor?.id).filter(Boolean));
  const pcs = (game.actors?.contents ?? []).filter(isPC).sort((x, y) => (here.has(y.id) - here.has(x.id)) || x.name.localeCompare(y.name));
  const rows = pcs.map(p => `<label class="wnpc-face" data-search-item><input type="checkbox" name="pc" value="${p.id}" ${met.has(p.id) || (!met.size && here.has(p.id)) ? "checked" : ""}> ${esc(p.name)}${here.has(p.id) ? " (here)" : ""}</label>`).join("");
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, classes: ["wodx-dialog", "wnpc-faces"],
    window: {title: `Who knows ${actor.name}?`},
    content: `<div class="form-group"><label>What strangers see</label><input type="text" name="stranger" maxlength="80" value="${esc(f.stranger ?? "")}" placeholder="${F.DEFAULT_STRANGER}"></div>
      <p class="hint">Ticked characters know the name.${on() ? "" : " The world setting \"Faces you have met\" is off, so players see every name for now."}</p>
      ${searchBox(".wnpc-face-list", "Search characters…", "Search characters")}<div class="wnpc-face-list">${rows || "<p>No player characters.</p>"}</div>`,
    buttons: [{action: "save", label: "Save", default: true, callback: (ev, btn) => ({stranger: btn.form.elements.stranger.value, pcs: [...btn.form.querySelectorAll("input[name=pc]:checked")].map(i => i.value)})}, {action: "cancel", label: "Cancel"}]});
  if ( !res?.pcs ) return;
  await actor.update({[`flags.${MOD}.metBy`]: F.introduce({}, res.pcs), [`flags.${MOD}.stranger`]: String(res.stranger ?? "").trim().slice(0, 80)});
}

/** 0.33.0 (B1382): who this player should not see named yet, from the scene's tokens and the fight's. */
function swapsNow(extra = []) {
  if ( game.user.isGM || !on() ) return [];
  const docs = new Set([...(canvas?.scene?.tokens?.contents ?? []), ...(game.combat?.combatants?.contents ?? []).map(c => c.token).filter(Boolean), ...extra]);
  const people = [...docs].filter(d => d?.actor).map(d => ({name: d.name, flags: d.actor.flags?.[MOD] ?? {}, playerOwned: d.actor.hasPlayerOwner}));
  const own = (game.actors?.contents ?? []).filter(a => a.isOwner).map(a => a.name);
  return F.swapsFor({people, mine: mine(), gm: false, on: true, own});
}
/** Swap the names in every text node under el. */
function maskEl(el, swaps) {
  if ( !el || !swaps.length ) return;
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for ( let n = walk.nextNode(); n; n = walk.nextNode() ) { const t = F.maskText(n.nodeValue, swaps); if ( t !== n.nodeValue ) n.nodeValue = t; }
  for ( const x of el.querySelectorAll("[data-tooltip], [title], img[alt]") ) for ( const k of ["data-tooltip", "title", "alt"] ) {
    const v = x.getAttribute(k); if ( v ) { const t = F.maskText(v, swaps); if ( t !== v ) x.setAttribute(k, t); }
  }
}
function speakerDoc(msg) {
  const sp = msg?.speaker ?? {};
  try { return sp.token ? game.scenes.get(sp.scene)?.tokens?.get(sp.token) ?? null : null; } catch (e) { return null; }
}

export function registerFaceHooks() {
  // chat: the speaker and the text (barks, Actions cards, anything naming an NPC this player has not met)
  Hooks.on("renderChatMessageHTML", (msg, el) => { try { const d = speakerDoc(msg); maskEl(el?.[0] ?? el, swapsNow(d ? [d] : [])); } catch (e) { /* leave it */ } });
  // the combat tracker
  Hooks.on("renderCombatTracker", (app, el) => { try { maskEl(el?.[0] ?? el, swapsNow()); } catch (e) { /* leave it */ } });
  Hooks.on("refreshToken", t => { try { applyName(t); } catch (e) { /* ignore */ } });
  Hooks.on("updateActor", (a, ch) => { if ( ch?.flags?.[MOD] ) for ( const t of a.getActiveTokens?.() ?? [] ) { try { t.renderFlags?.set?.({refreshNameplate: true}); applyName(t); } catch (e) { /* ignore */ } } });
  Hooks.on("renderTokenHUD", (hud, html) => {
    if ( !game.user.isGM ) return;
    const root = html instanceof HTMLElement ? html : html?.[0];
    const actor = hud.object?.actor, col = root?.querySelector(".col.right");
    if ( !actor || !col || actor.hasPlayerOwner ) return;
    const b = document.createElement("div");
    b.className = "control-icon wnpc-hud wnpc-faces-hud";
    b.dataset.tooltip = "Who knows this face (introduce, or write what strangers see)";
    b.innerHTML = '<i class="fa-solid fa-handshake"></i>';
    b.addEventListener("click", () => openFaces(actor).catch(e => console.error(`${MOD} |`, e)));
    col.appendChild(b);
  });
}
