/**
 * WoDX Solo: Storyteller tools for the lone player (B4800 to B4805).
 *
 * Ben asked (14 November 2026) for a switch in single-player mode that shows Storyteller options, so the one person
 * playing can check that everything works as meant and hand their character things to try. The player stays a
 * player in Foundry's eyes: making them a Storyteller would set every WoDX module working on two browsers at once.
 * Instead each tool is an ask over the module's socket, and the seat (the hidden Storyteller browser) answers only the
 * player who switched the tools on:
 *   The Storyteller's cards   every card, roll and whisper meant for the Storyteller alone, sent on as it arrives,
 *                             and its buttons pressed by the seat when the player picks one
 *   Give my character an item any item in the world or an Item compendium, made on the character's sheet
 *   Check the systems         WoDX parts running, the switch's settings, the approval queue, what was left waiting
 *                             and errors seen on the seat
 *   What is hidden here       hidden tokens on the player's scene
 *
 *   setting wodx-solo.st      {on, userId, at}  who has the tools; only the seat writes it
 *   setting wodx-solo.stOffer Boolean           the Storyteller may take the switch off the panel
 *
 * Safety for a shared table (B4801): the tools go on only while The Lone Chronicle is on, outside the Live world, for a
 * player, with no other player logged in. Each ask checks that again, and the seat switches the tools off the moment
 * another player logs in or the mode goes off.
 */
import * as R from "./solo-rules.mjs";
import {addAsks, setStUi, ask, SOCKET, characterOf, placeOf, tell, SoloPanel} from "./panel.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const MOD = "wodx-solo";
const CHRON = "wodx-chronicle";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const all = c => c?.contents ?? [...(c?.values?.() ?? c ?? [])];
const {ApplicationV2, DialogV2} = foundry.applications.api;

let H = null; // from main.mjs: {isOn, isSeat, blocked, log, entries, get, read, findButton}

const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const activePlayers = () => all(game.users).filter(u => u.active && !u.isGM).map(u => u.id);
const state = () => R.normSt(H.get("st"));
const world = () => ({soloOn: H.isOn(), blocked: H.blocked(), activePlayers: activePlayers()});
const usable = userId => R.mayUse(state(), userId, world());
const mine = () => !game.user.isGM && usable(game.user.id);
const reply = (userId, type, data = {}) => game.socket.emit(SOCKET, {type, payload: {userId, ...data}});

/* ------------------------------------------------------------------ */
/*  The seat's side                                                    */
/* ------------------------------------------------------------------ */

async function setSt(value) { if ( H.isSeat() ) await game.settings.set(MOD, "st", value); }

async function toggle({userId, to}) {
  const user = game.users.get(userId);
  if ( !to ) {
    if ( state().userId !== userId && state().on ) return null;
    await setSt(R.ST_OFF());
    await H.log({kind: "note", source: MOD, title: "Storyteller tools off", note: user?.name ?? ""});
    await tell(userId, "<p>The Storyteller tools are off. The Storyteller's secrets are yours no more.</p>");
    return false;
  }
  const may = H.get("stOffer") === false ? {ok: false, why: "the Storyteller took them off the panel"}
    : R.mayTurnOn({...world(), userId, isGM: !!user?.isGM});
  if ( !may.ok ) { reply(userId, "st.refused", {why: may.why}); return null; }
  await setSt({on: true, userId, at: Date.now()});
  await H.log({kind: "note", source: MOD, title: "Storyteller tools on", note: user?.name ?? ""});
  await tell(userId, "<p>The Storyteller tools are on. They sit at the foot of your panel.</p>");
  return true;
}

/** A card as the player is shown it: the seat's own rendering, and the buttons read from its text. */
async function cardOf(msg) {
  let html = "";
  try { const el = await msg.renderHTML?.(); html = el?.outerHTML ?? ""; } catch (e) { html = ""; }
  if ( !html ) html = `<div class="message-content">${msg.content ?? ""}</div>`;
  return {id: msg.id, at: msg.timestamp ?? Date.now(), title: R.titleOf(msg), source: R.sourceOf(msg.flags), html,
    buttons: R.buttonsOf(msg.content).map(b => ({n: b.n, label: b.label})).filter(b => b.label)};
}
const secret = msg => msg && R.forStoryteller(msg.whisper, gmIds()) && !msg.flags?.[MOD]?.panel;

async function eyes({userId}) {
  if ( !usable(userId) ) return reply(userId, "st.refused", {why: "the tools are off"});
  const list = game.messages.contents.filter(secret).slice(-30);
  const cards = [];
  for ( const m of list ) cards.push(await cardOf(m));
  reply(userId, "st.eyes", {cards, replace: true});
  return cards.length;
}

async function forward(msg) {
  const s = state();
  if ( !H.isSeat() || !s.on || !secret(msg) || !usable(s.userId) ) return;
  reply(s.userId, "st.eyes", {cards: [await cardOf(msg)]});
}

async function press({userId, messageId, n, label}) {
  if ( !usable(userId) ) return reply(userId, "st.refused", {why: "the tools are off"});
  const msg = game.messages.get(messageId);
  if ( !secret(msg) ) return reply(userId, "st.refused", {why: "that card is gone"});
  const el = H.findButton(messageId, {n: Number(n), label: String(label ?? "")});
  if ( el ) el.click();
  await H.log({kind: "card", source: R.sourceOf(msg.flags), title: R.titleOf(msg), buttons: [String(label)], choice: String(label),
    acted: !!el, note: el ? `pressed for ${game.users.get(userId)?.name ?? "the player"}` : "button not found on the seat's screen"});
  reply(userId, "st.pressed", {label, done: !!el});
  return !!el;
}

let index = null, indexAt = 0;
async function itemIndex() {
  if ( index && Date.now() - indexAt < 5 * 60 * 1000 ) return index;
  const rows = all(game.items).map(i => ({uuid: i.uuid, name: i.name, type: i.type, from: "This world"}));
  for ( const pack of all(game.packs).filter(p => p.documentName === "Item") ) {
    try {
      const idx = await pack.getIndex({fields: ["type"]});
      for ( const e of all(idx) ) rows.push({uuid: e.uuid ?? `Compendium.${pack.collection}.Item.${e._id}`, name: e.name, type: e.type, from: pack.title ?? pack.metadata?.label ?? pack.collection});
    } catch (e) { console.warn(`${MOD} | index ${pack.collection}`, e); }
  }
  index = rows; indexAt = Date.now();
  return rows;
}

async function items({userId, query}) {
  if ( !usable(userId) ) return reply(userId, "st.refused", {why: "the tools are off"});
  reply(userId, "st.items", {query: String(query ?? ""), rows: R.itemMatches(await itemIndex(), query)});
}

async function give({userId, uuid}) {
  if ( !usable(userId) ) return reply(userId, "st.refused", {why: "the tools are off"});
  const user = game.users.get(userId);
  const actor = characterOf(user);
  if ( !actor ) return reply(userId, "st.refused", {why: "you have no character to give it to"});
  const src = await fromUuid(String(uuid ?? "")).catch(() => null);
  if ( !src || src.documentName !== "Item" ) return reply(userId, "st.refused", {why: "that item is not there"});
  try {
    const [made] = await actor.createEmbeddedDocuments("Item", [R.grantData(src.toObject(), {by: user.name, at: game.time.worldTime})]);
    await H.log({kind: "note", source: MOD, title: `Given: ${src.name}`, note: `to ${actor.name}, asked by ${user.name}`});
    await tell(userId, `<p><b>${esc(src.name)}</b> is now on ${esc(actor.name)}'s sheet.</p>`);
    reply(userId, "st.given", {name: src.name, actor: actor.name, id: made?.id ?? null});
    return made ?? null;
  } catch (e) {
    reply(userId, "st.refused", {why: `${actor.name} cannot take ${src.name}: ${e.message}`});
    return null;
  }
}

/* Errors the seat sees, newest last, for the systems check */
const errors = [];
let sat = Date.now();
function catchErrors() {
  const keep = text => { errors.push({at: Date.now(), text: String(text ?? "").slice(0, 300)}); if ( errors.length > 30 ) errors.shift(); };
  globalThis.addEventListener?.("error", ev => keep(ev?.message ?? ev?.error));
  globalThis.addEventListener?.("unhandledrejection", ev => keep(ev?.reason?.message ?? ev?.reason));
  const was = console.error.bind(console);
  console.error = (...args) => { try { keep(args.map(a => a?.message ?? (typeof a === "string" ? a : "")).filter(Boolean).join(" ")); } catch (e) { /* keep going */ } was(...args); };
}

export function report(userId) {
  const wodx = all(game.modules).filter(m => m.id.startsWith("wodx-"));
  const on = wodx.filter(m => m.active);
  const broken = on.map(m => ({id: m.id, title: m.title,
    needs: all(m.relationships?.requires ?? []).map(r => r.id).filter(id => id?.startsWith("wodx-") && !game.modules.get(id)?.active)})).filter(b => b.needs.length);
  const plan = H.isOn() ? R.planPreset(H.read) : {changes: [], missing: []};
  const q = H.read(CHRON, "approvals") ?? {};
  const {scene} = placeOf(game.users.get(userId));
  return {
    modules: on.map(m => ({id: m.id, title: m.title, version: m.version})), off: wodx.filter(m => !m.active).map(m => m.title ?? m.id), broken,
    drift: plan.changes, missing: plan.missing, pending: (q.pending ?? []).length, held: (q.held ?? []).length,
    waiting: R.stallReport(H.entries(), sat).waiting, errors: [...errors], paused: !!game.paused,
    sameScene: scene ? canvas?.scene?.id === scene.id : null, fights: all(game.combats).filter(c => c.started).length
  };
}

async function check({userId}) {
  if ( !usable(userId) ) return reply(userId, "st.refused", {why: "the tools are off"});
  const r = report(userId);
  reply(userId, "st.check", {rows: R.checkRows(r), versions: r.modules.map(m => `${m.title ?? m.id} ${m.version}`)});
}

async function hidden({userId}) {
  if ( !usable(userId) ) return reply(userId, "st.refused", {why: "the tools are off"});
  const {scene} = placeOf(game.users.get(userId));
  const rows = scene ? all(scene.tokens).filter(t => t.hidden).map(t => R.hiddenRow({name: t.name, kind: t.actor?.type ?? "",
    disposition: t.disposition, x: t.x, y: t.y}, scene.grid?.size)) : [];
  reply(userId, "st.hidden", {scene: scene?.name ?? null, rows});
}

/** The seat takes the tools away when a second player logs in or the mode goes off. */
async function guard(why) {
  const s = state();
  if ( !game.user.isGM || game.users.activeGM?.id !== game.user.id ) return;
  if ( !s.on || usable(s.userId) ) return;
  await game.settings.set(MOD, "st", R.ST_OFF());
  await H.log({kind: "note", source: MOD, title: "Storyteller tools off", note: why});
  if ( s.userId ) await tell(s.userId, `<p>The Storyteller tools are off: ${esc(why)}.</p>`);
}

/* ------------------------------------------------------------------ */
/*  The player's side                                                  */
/* ------------------------------------------------------------------ */

let seenCards = [], unread = 0;

class StEyes extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-solo-eyes", classes: ["wodx", "wsolo-dialog", "wsolo-eyes"],
    window: {title: "The Storyteller's cards", icon: "fa-solid fa-eye", resizable: true},
    position: {width: 520, height: 640},
    actions: {press: StEyes.#onPress}
  };
  static open() { return (foundry.applications.instances?.get?.("wodx-solo-eyes") ?? new StEyes()).render({force: true}); }
  async _renderHTML() {
    unread = 0;
    const div = document.createElement("div");
    const cards = [...seenCards].reverse();
    div.innerHTML = cards.length ? `${cards.length > 5 ? searchBox("ul.wsolo-eyes-list", "Find a card…", "Search the Storyteller's cards") : ""}
      <ul class="wsolo-eyes-list">${cards.map(c => `<li class="wsolo-eye">
        <div class="wsolo-eye-head"><b>${esc(c.title)}</b> <span class="wodx-quiet">${esc(c.source)}</span></div>
        <div class="wsolo-eye-card" inert>${c.html}</div>
        ${c.buttons.length ? `<div class="wsolo-eye-buttons">${c.buttons.map(b => `<button type="button" data-action="press" data-msg="${esc(c.id)}" data-n="${b.n}" data-label="${esc(b.label)}">${esc(b.label)}</button>`).join("")}</div>` : ""}
      </li>`).join("")}</ul>`
      : `<p>Nothing has come for the Storyteller alone yet. Cards show here as they arrive.</p>`;
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }
  _onClose(o) { super._onClose?.(o); refreshPanel(); }
  static #onPress(ev, t) {
    ask("ask.st.press", {messageId: t.dataset.msg, n: Number(t.dataset.n), label: t.dataset.label});
    t.disabled = true;
  }
}

class StGive extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-solo-give", classes: ["wodx", "wsolo-dialog", "wsolo-give"],
    window: {title: "Give my character an item", icon: "fa-solid fa-gift", resizable: true},
    position: {width: 460, height: 560},
    actions: {give: StGive.#onGive}
  };
  static open() { return (foundry.applications.instances?.get?.("wodx-solo-give") ?? new StGive()).render({force: true}); }
  async _renderHTML() {
    const div = document.createElement("div");
    const who = characterOf(game.user);
    div.innerHTML = `<p>${who ? `For <b>${esc(who.name)}</b>. ` : "You have no character yet. "}Type two letters or more of the item's name.</p>
      <input type="search" name="q" class="wsolo-give-q" placeholder="An item's name…" aria-label="An item's name" autocomplete="off">
      <ul class="wsolo-give-list" data-fixed></ul>`;
    let t = null;
    div.querySelector("input[name=q]").addEventListener("input", ev => {
      clearTimeout(t);
      const q = ev.target.value;
      t = setTimeout(() => { if ( q.trim().length >= 2 ) ask("ask.st.items", {query: q}); else StGive.show([]); }, 300);
    });
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }
  static show(rows = [], query = null) {
    const el = foundry.applications.instances?.get?.("wodx-solo-give")?.element;
    const box = el?.querySelector?.("input[name=q]"), ul = el?.querySelector?.("ul.wsolo-give-list");
    if ( !ul || (query !== null && box && box.value.trim() !== query.trim()) ) return;
    ul.innerHTML = rows.length ? rows.map(r => `<li><button type="button" data-action="give" data-uuid="${esc(r.uuid)}"><i class="fa-solid fa-gift"></i> ${esc(r.name)}</button>
      <span class="wodx-quiet">${esc(r.type)} · ${esc(r.from)}</span></li>`).join("")
      : (box?.value?.trim()?.length >= 2 ? "<li class=\"wodx-quiet\">No item by that name.</li>" : "");
  }
  static #onGive(ev, t) { ask("ask.st.give", {uuid: t.dataset.uuid}); }
}

function table(title, head, rows, width = 560) {
  const body = rows.length ? `<table class="wsolo-curtain"><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${
    rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>` : "<p>Nothing to show.</p>";
  return new DialogV2({classes: ["wodx", "wodx-dialog", "wsolo-dialog"], window: {title, resizable: true}, position: {width},
    content: body, buttons: [{action: "ok", label: "Close", default: true}]}).render({force: true});
}

const CLIENT = {
  "st.refused": p => ui.notifications.warn(`Storyteller tools: ${p.why}.`),
  "st.pressed": p => ui.notifications.info(p.done ? `The seat pressed ${p.label}.` : `${p.label} could not be pressed on the seat.`),
  "st.given": p => ui.notifications.info(`${p.name} is now on ${p.actor}'s sheet.`),
  "st.items": p => StGive.show(p.rows ?? [], p.query ?? null),
  "st.eyes": p => {
    const incoming = p.cards ?? [];
    seenCards = p.replace ? incoming.slice(-R.EYES_CAP) : incoming.reduce((l, c) => R.addEyes(l, c), seenCards);
    const app = foundry.applications.instances?.get?.("wodx-solo-eyes");
    if ( app?.rendered ) app.render();
    else if ( !p.replace ) { unread += incoming.length; refreshPanel(); }
  },
  "st.check": p => table("Check the systems", ["", "Part", "How it stands"], (p.rows ?? []).map(r => [
    r.state === "ok" ? '<i class="fa-solid fa-circle-check" title="fine"></i>' : '<i class="fa-solid fa-triangle-exclamation" title="look at this"></i>',
    esc(r.area), esc(r.text)]).concat((p.versions ?? []).length ? [["", "Versions", esc(p.versions.join(", "))]] : []), 640),
  "st.hidden": p => table(p.scene ? `Hidden on ${p.scene}` : "What is hidden here", ["Who", "Kind", "Stance", "Square (across, down)"],
    (p.rows ?? []).map(r => [esc(r.name), esc(r.kind), esc(r.disposition), esc(r.square)]))
};

function refreshPanel() { if ( foundry.applications.instances?.get?.("wodx-solo-panel")?.rendered ) SoloPanel.open(); }

function toggleHtml() {
  if ( game.user.isGM || !H.isOn() || H.get("stOffer") === false ) return "";
  const on = mine();
  return `<button type="button" data-action="sttoggle" class="wsolo-st-toggle${on ? " active" : ""}" aria-pressed="${on}"
    title="Show Storyteller options, to check that things work and to give your character items to try"><i class="fa-solid ${on ? "fa-toggle-on" : "fa-toggle-off"}"></i> Storyteller tools: ${on ? "on" : "off"}</button>`;
}

function toolsHtml() {
  if ( !mine() ) return "";
  return `<details class="wsolo-st" open><summary>Storyteller tools</summary><div class="wsolo-buttons">${R.ST_TOOLS.map(t =>
    `<button type="button" data-action="st" data-id="${t.id}" title="${esc(t.hint)}"><i class="${t.icon}"></i> ${esc(t.label)}${t.id === "eyes" && unread ? ` (${unread} new)` : ""}</button>`).join("")}</div></details>`;
}

async function onToggle() {
  if ( mine() ) return ask("ask.st.toggle", {to: false});
  const yes = await DialogV2.confirm({classes: ["wodx", "wodx-dialog"], window: {title: "Storyteller tools"}, rejectClose: false,
    content: "<p>This shows you what the Storyteller sees: secret cards and rolls, hidden tokens, and the state of every system. It also lets you give your character any item. Turn it on?</p>"});
  if ( yes ) ask("ask.st.toggle", {to: true});
}

function openTool(id) {
  if ( !mine() ) return ui.notifications.warn("Storyteller tools are off.");
  if ( id === "eyes" ) { StEyes.open(); return ask("ask.st.eyes"); }
  if ( id === "give" ) return StGive.open();
  if ( id === "check" ) return ask("ask.st.check");
  if ( id === "hidden" ) return ask("ask.st.hidden");
}

/* ------------------------------------------------------------------ */
/*  Start                                                              */
/* ------------------------------------------------------------------ */

export function registerStSettings() {
  game.settings.register(MOD, "st", {scope: "world", config: false, type: Object, default: R.ST_OFF()});
  game.settings.register(MOD, "stOffer", {name: "Offer Storyteller tools to the lone player",
    hint: "A switch on the player's panel that shows them the Storyteller's cards, hidden tokens and a check of every system, and lets them give their character items. It works only while The Lone Chronicle is on and nobody else is playing.",
    scope: "world", config: true, type: Boolean, default: true});
}

export function installStTools(helpers) {
  H = helpers;
  addAsks({"ask.st.toggle": toggle, "ask.st.eyes": eyes, "ask.st.press": press, "ask.st.items": items, "ask.st.give": give,
    "ask.st.check": check, "ask.st.hidden": hidden}, CLIENT);
  setStUi({toggleHtml, toolsHtml, open: openTool, toggle: onToggle});
  // A world setting saved for the first time is created, not updated, so both hooks count
  const onSetting = s => {
    if ( s?.key === `${MOD}.st` ) refreshPanel();
    if ( s?.key === `${MOD}.on` || s?.key === `${MOD}.stOffer` ) { refreshPanel(); guard("The Lone Chronicle is off").catch(() => {}); }
  };
  Hooks.on("updateSetting", onSetting);
  Hooks.on("createSetting", onSetting);
  if ( !game.user.isGM ) return;
  catchErrors();
  sat = Date.now();
  Hooks.on("createChatMessage", m => { forward(m).catch(e => console.warn(`${MOD} | forward`, e)); });
  Hooks.on("updateChatMessage", m => { forward(m).catch(e => console.warn(`${MOD} | forward`, e)); });
  Hooks.on("userConnected", (u, on) => { if ( on && !u.isGM ) setTimeout(() => guard("someone else logged in").catch(() => {}), 500); });
  setTimeout(() => guard("someone else is playing").catch(() => {}), 3500);
}

export const stApi = {state, usable, report, mayUse: R.mayUse, open: openTool, toggle, eyes, press, items, give, check, hidden, guard,
  cards: () => [...seenCards]};
