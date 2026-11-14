/**
 * The Waiting tray (WoDX Chronicle 0.46.0, B2452): one place for everything still waiting for the Storyteller.
 * It lists the approval queue's entries and every card whispered to the Storytellers in the last twelve hours that
 * still has a button nobody has pressed, oldest first. "Take the recommended" approves a queue entry, or presses the
 * card's safe button: the same choice the Lone Chronicle's seat makes (waiting-rules.mjs pickButton), never undo,
 * reject, delete or edit. A card with no plain choice can only be shown or set aside.
 *
 * Pressed or set-aside cards are remembered in a client setting, so a reload does not bring them back.
 * Storyteller only; nothing here reaches a player.
 */
import {MODULE_ID, esc} from "./util.mjs";
import * as WR from "./waiting-rules.mjs";
import * as approvals from "./approvals.mjs";

const SPAN = 12 * 3600 * 1000;
const CAP = 500;
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const doneIds = () => { try { return new Set(game.settings.get(MODULE_ID, "waitingDone") ?? []); } catch (e) { return new Set(); } };
let saving = Promise.resolve();
function markDone(id) {
  if ( !id || !game.user.isGM ) return saving;
  const ids = [...doneIds()];
  if ( ids.includes(id) ) return saving;
  ids.push(id);
  saving = saving.then(() => game.settings.set(MODULE_ID, "waitingDone", ids.slice(-CAP))).catch(() => {});
  WaitingApp.soon();
  return saving;
}

/** The cards still waiting: whispered to Storytellers alone, recent, with a button that goes ahead, not yet pressed. */
export function cards({now = Date.now()} = {}) {
  if ( !game.user.isGM ) return [];
  const done = doneIds(), gms = gmIds(), out = [];
  for ( const m of game.messages?.contents ?? [] ) {
    if ( done.has(m.id) || (m.timestamp ?? 0) < now - SPAN ) continue;
    if ( !WR.forStoryteller(m.whisper, gms) ) continue;
    const buttons = WR.buttonsOf(m.content);
    if ( !WR.waits(buttons) ) continue;
    // A rendered card whose every "go ahead" button is greyed out has been answered
    const el = document.querySelector(`#chat [data-message-id="${m.id}"], .chat-log [data-message-id="${m.id}"]`);
    if ( el ) {
      const live = [...el.querySelectorAll("button, a[data-action]")].filter(b => !b.disabled && !b.hasAttribute("disabled") && !WR.AVOID.test(WR.plain(b.innerHTML)));
      if ( !live.length ) continue;
    }
    out.push({kind: "card", id: m.id, at: m.timestamp ?? 0, title: WR.titleOf(m), source: WR.sourceOf(m.flags), pick: WR.pickButton(buttons), buttons});
  }
  return out;
}

/** The queue's entries, as tray rows. Taking the recommended on one approves it. */
export function queueRows() {
  if ( !game.user.isGM ) return [];
  const label = t => approvals.types().find(x => x.type === t)?.label ?? t;
  return approvals.pending().map(p => ({kind: "queue", id: p.id, at: p.createdAt ?? 0, title: p.title, source: label(p.type), pick: {label: "Approve", why: "the queue's go-ahead"}}));
}

export const rows = () => [...queueRows(), ...cards()].sort((a, b) => a.at - b.at);
export const count = () => rows().length;

/** The live button on a rendered card, found by place and then by label. */
function findButton(id, pick) {
  for ( const root of document.querySelectorAll(`[data-message-id="${id}"]`) ) {
    const live = [...root.querySelectorAll("button, a[data-action]")].filter(b => !b.disabled && !b.hasAttribute("disabled"));
    const el = live[pick.n];
    if ( el && WR.plain(el.innerHTML) === pick.label ) return el;
    const byLabel = live.find(b => WR.plain(b.innerHTML) === pick.label);
    if ( byLabel ) return byLabel;
  }
  return null;
}

/** Take the recommended on one row. Returns true when something was pressed or approved. */
export async function take(row) {
  if ( !game.user.isGM || !row ) return false;
  if ( row.kind === "queue" ) { await approvals.decide(row.id, "approve"); return true; }
  if ( !row.pick ) return false;
  let el = findButton(row.id, row.pick);
  if ( !el ) { show(row.id); el = findButton(row.id, row.pick); }
  if ( !el ) { ui.notifications.warn(`"${row.title}": open the chat log at that card to answer it.`); return false; }
  el.click();
  await markDone(row.id);
  return true;
}

/** Bring a card into view in the chat log. */
function show(id) {
  ui.sidebar?.changeTab?.("chat", "primary");
  const el = document.querySelector(`#chat [data-message-id="${id}"], .chat-log [data-message-id="${id}"]`);
  el?.scrollIntoView?.({block: "center"});
}

/** The line for the wrap-up: what is still open as the session ends. */
export function wrapLine() {
  const n = count();
  return n ? `${n} thing${n === 1 ? " is" : "s are"} still waiting for you (Waiting tray).` : "";
}

const {ApplicationV2} = foundry.applications.api;

export class WaitingApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-waiting", classes: ["wodx", "wodx-waiting"],
    window: {title: "Waiting for you", icon: "fa-solid fa-hourglass-half", resizable: true},
    position: {width: 460, height: "auto"},
    actions: {take: WaitingApp.#onTake, takeAll: WaitingApp.#onTakeAll, show: WaitingApp.#onShow, aside: WaitingApp.#onAside, queue: () => approvals.ApprovalsApp.open()}
  };
  static #instance;
  static #timer = null;
  static open() { this.#instance ??= new WaitingApp(); return this.#instance.render({force: true}); }
  static refresh() { if ( this.#instance?.rendered ) this.#instance.render(); }
  static soon() { clearTimeout(this.#timer); this.#timer = setTimeout(() => this.refresh(), 300); }

  async _renderHTML() {
    const list = rows();
    const age = at => { const m = Math.max(0, Math.round((Date.now() - at) / 60000)); return m < 1 ? "just now" : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`; };
    const items = list.map(r => `<li class="wodx-wait-row" data-id="${esc(r.id)}" data-kind="${r.kind}">
        <header><span class="wodx-tag">${r.kind === "queue" ? "Queue" : "Card"}</span> <strong>${esc(r.title)}</strong></header>
        <p class="wodx-quiet">${esc(r.source)}, ${age(r.at)}${r.pick ? `. Recommended: ${esc(r.pick.label)}` : ". No plain choice: answer it on the card"}</p>
        <div class="wodx-buttons">
          ${r.pick ? `<button type="button" data-action="take" data-id="${esc(r.id)}">Take the recommended</button>` : ""}
          ${r.kind === "card" ? `<button type="button" data-action="show" data-id="${esc(r.id)}">Show the card</button><button type="button" data-action="aside" data-id="${esc(r.id)}">Set aside</button>` : `<button type="button" data-action="queue">Open the queue</button>`}
        </div></li>`).join("");
    const takeable = list.filter(r => r.pick).length;
    const div = document.createElement("div");
    div.className = "wodx-body wodx-scroll";
    div.innerHTML = list.length
      ? `<p class="wodx-quiet">Oldest first. Take the recommended never presses Undo, Reject, Delete or Edit.</p>
         ${takeable > 1 ? `<div class="wodx-buttons"><button type="button" data-action="takeAll">Take the recommended for all ${takeable}</button></div>` : ""}
         <ul class="wodx-list wodx-waitlist">${items}</ul>`
      : `<p class="wodx-quiet">Nothing is waiting for you.</p>`;
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }

  static #row(target) { return rows().find(r => r.id === target.dataset.id) ?? null; }
  static async #onTake(event, target) { await take(WaitingApp.#row(target)); WaitingApp.soon(); }
  static async #onTakeAll() {
    let n = 0;
    for ( const r of rows() ) { if ( r.pick && await take(r) ) n++; }
    ui.notifications.info(`Took the recommended on ${n}.`);
    WaitingApp.soon();
  }
  static #onShow(event, target) { show(target.dataset.id); }
  static async #onAside(event, target) { await markDone(target.dataset.id); }
}

export function registerWaitingSettings() {
  game.settings.register(MODULE_ID, "waitingDone", {scope: "client", config: false, type: Array, default: []});
}

/** Hooks: a press on any card button marks it answered; new or changed cards and queue changes refresh the tray. */
export function initWaiting() {
  if ( !game.user.isGM ) return;
  document.addEventListener("click", ev => {
    const b = ev.target?.closest?.("button, a[data-action]");
    const card = b?.closest?.("[data-message-id]");
    if ( !b || !card || b.closest(".wodx-waiting") ) return;
    // Any answer counts (Reject too); only a look (open, show, details) leaves the card waiting
    if ( /\b(open|show|details?)\b/i.test(WR.plain(b.innerHTML)) ) return;
    markDone(card.dataset.messageId);
  }, true);
  // The Undo button on an "approved on its own" card
  document.addEventListener("click", ev => {
    const b = ev.target?.closest?.("button.wodx-approval-undo");
    if ( !b ) return;
    ev.preventDefault();
    approvals.undoAuto(b.dataset.id).then(ok => { if ( ok ) b.disabled = true; });
  });
  for ( const h of ["createChatMessage", "updateChatMessage", "deleteChatMessage"] ) Hooks.on(h, () => WaitingApp.soon());
}
