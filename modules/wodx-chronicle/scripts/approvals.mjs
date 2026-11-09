import {MODULE_ID, esc, emit, isActiveGM, setting, setSetting} from "./util.mjs";
import {searchBox} from "./search.mjs";
import * as QR from "./approvals-rules.mjs";

/**
 * One approval queue for everything automation (or a player) proposes.
 * The queue lives in a world setting; only GMs write it. Players' proposals travel by socket to the active GM.
 */

const handlers = new Map();
const HISTORY_LIMIT = 50;

/**
 * Register what happens when a type of proposal is approved or rejected.
 * @param {string} type
 * @param {{label: string, approve?: Function, reject?: Function}} handler
 */
export function registerHandler(type, handler) {
  handlers.set(type, handler);
}

export function pending() {
  return setting("approvals")?.pending ?? [];
}

export function history() {
  return setting("approvals")?.history ?? [];
}

/**
 * Propose something for the Storyteller's approval. Works on any client.
 * @param {object} req
 * @param {string} req.type      A registered type, or "request" for a player's free-form request
 * @param {string} req.title
 * @param {string} [req.detail]
 * @param {string} [req.key]     Proposals with the same key are not queued twice
 * @param {object} [req.data]
 */
export async function propose(req) {
  const entry = {
    id: foundry.utils.randomID(),
    type: req.type,
    key: req.key ?? null,
    title: String(req.title ?? "").slice(0, 200),
    detail: String(req.detail ?? "").slice(0, 2000),
    data: req.data ?? {},
    from: game.user.isGM ? null : game.user.id,
    createdAt: Date.now(),
    worldTime: game.time.worldTime
  };
  if ( isActiveGM() ) return addToQueue(entry);
  return emit("approval.propose", entry, {needsGM: true});
}

/** The types that have a handler, with their labels, for the standing rules. */
export function types() {
  return [...handlers.entries()].map(([type, h]) => ({type, label: h?.label ?? type})).sort((a, b) => a.label.localeCompare(b.label));
}
/** NPC proposals queued since this Foundry session began (the cap's count). Kept on the Storyteller's client. */
let npcUsed = 0;
export const npcCount = () => npcUsed;
export function resetSession() { npcUsed = 0; }
const autoRules = () => { try { return setting("autoApprove") ?? {}; } catch (e) { return {}; } };
const npcCap = () => { try { return Number(setting("npcCap")) || 0; } catch (e) { return 0; } };

/** Active GM: add a proposal to the queue, approve it under a standing rule, or hold it back past the NPC cap. */
export async function addToQueue(entry) {
  if ( !isActiveGM() ) return;
  const q = foundry.utils.deepClone(setting("approvals") ?? {pending: [], history: []});
  q.held ??= [];
  if ( entry.key && (q.pending.some(p => p.key === entry.key) || q.held.some(p => p.key === entry.key)) ) return;
  const route = QR.routeProposal(entry.type, {auto: autoRules(), cap: npcCap(), used: npcUsed});
  if ( route === "hold" ) {
    q.held.push(entry);
    await setSetting("approvals", q);
    return "held";
  }
  if ( QR.isNpcType(entry.type) ) npcUsed++;
  q.pending.push(entry);
  await setSetting("approvals", q);
  if ( route === "auto" ) {
    await decide(entry.id, "approve", "", {auto: true});
    return "auto";
  }
  ui.notifications.info(`For your approval: ${entry.title}`);
  return "queued";
}

/** Decide many at once: every pending entry, less the exceptions. Returns how many were decided. */
export async function decideMany(verdict, {except = [], ids = null} = {}) {
  if ( !game.user.isGM ) return 0;
  const list = ids ?? QR.bulkIds(pending(), except);
  let n = 0;
  for ( const id of list ) { if ( pending().some(p => p.id === id) ) { await decide(id, verdict); n++; } }
  return n;
}

/** Put the held-back NPC proposals into the queue after all. */
export async function releaseHeld() {
  if ( !game.user.isGM ) return 0;
  const q = foundry.utils.deepClone(setting("approvals") ?? {pending: [], history: []});
  const held = q.held ?? [];
  if ( !held.length ) return 0;
  q.pending.push(...held);
  q.held = [];
  await setSetting("approvals", q);
  return held.length;
}
export const held = () => setting("approvals")?.held ?? [];

/** Turn a standing rule on or off for a type. */
export async function setAuto(type, on) {
  const a = {...autoRules()};
  if ( on ) a[type] = true; else delete a[type];
  await setSetting("autoApprove", QR.cleanAuto(a));
}

/**
 * Decide a proposal. GM only.
 * @param {string} id
 * @param {"approve"|"reject"} verdict
 * @param {string} [note]  A reply shown to the player who asked
 */
export async function decide(id, verdict, note = "", {auto = false} = {}) {
  if ( !game.user.isGM ) return;
  const q = foundry.utils.deepClone(setting("approvals") ?? {pending: [], history: []});
  const index = q.pending.findIndex(p => p.id === id);
  if ( index < 0 ) return;
  const [entry] = q.pending.splice(index, 1);
  entry.verdict = verdict;
  entry.note = note;
  entry.decidedAt = Date.now();
  if ( auto ) entry.auto = true;
  q.history.unshift(entry);
  q.history = q.history.slice(0, HISTORY_LIMIT);
  await setSetting("approvals", q);

  const handler = handlers.get(entry.type);
  try {
    if ( verdict === "approve" ) await handler?.approve?.(entry);
    else await handler?.reject?.(entry);
  } catch (err) {
    console.error(`WoDX | The ${entry.type} handler failed`, err);
    ui.notifications.error(`The change for "${entry.title}" failed. See the console (F12).`);
  }

  if ( entry.from && game.users.get(entry.from) ) {
    const word = verdict === "approve" ? "agreed to" : "turned down";
    await ChatMessage.create({
      content: `<div class="wodx-card"><p>The Storyteller ${word} your request: <strong>${esc(entry.title)}</strong></p>${note ? `<p>${esc(note)}</p>` : ""}</div>`,
      whisper: [entry.from],
      speaker: {alias: "Storyteller"}
    });
  }
}

/** A player's free-form request ("Ask the Storyteller"). */
registerHandler("request", {label: "Player request"});

/* -------------------------------------------- */
/*  Queue window                                */
/* -------------------------------------------- */

const {ApplicationV2} = foundry.applications.api;

export class ApprovalsApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-approvals",
    classes: ["wodx", "wodx-approvals"],
    window: {title: "Approval queue", icon: "fa-solid fa-inbox", resizable: true},
    position: {width: 480, height: "auto"},
    actions: {
      approve: ApprovalsApp.#onApprove,
      reject: ApprovalsApp.#onReject,
      approveTicked: ApprovalsApp.#onApproveTicked,
      rejectTicked: ApprovalsApp.#onRejectTicked,
      tickAll: ApprovalsApp.#onTickAll,
      release: ApprovalsApp.#onRelease
    }
  };

  static #instance;

  static open() {
    this.#instance ??= new ApprovalsApp();
    return this.#instance.render({force: true});
  }

  static refresh() {
    if ( this.#instance?.rendered ) this.#instance.render();
  }

  async _renderHTML() {
    const who = id => (id ? game.users.get(id)?.name : null) ?? "Automation";
    const label = type => handlers.get(type)?.label ?? type;
    const items = pending().map(p => `
      <li class="wodx-approval" data-id="${p.id}">
        <header><input type="checkbox" class="wodx-tick" data-id="${p.id}" checked aria-label="Include in the ticked decision"> <span class="wodx-tag">${esc(label(p.type))}</span> <strong>${esc(p.title)}</strong></header>
        ${p.detail ? `<p>${esc(p.detail)}</p>` : ""}
        <p class="wodx-quiet">From ${esc(who(p.from))}</p>
        <textarea name="note" rows="2" placeholder="Optional reply"></textarea>
        <div class="wodx-buttons">
          <button type="button" data-action="approve" data-id="${p.id}"><i class="fa-solid fa-check"></i> Approve</button>
          <button type="button" data-action="reject" data-id="${p.id}"><i class="fa-solid fa-xmark"></i> Reject</button>
        </div>
      </li>`).join("");
    const past = history().slice(0, 10).map(h => `
      <li><span class="wodx-tag ${h.verdict}">${h.verdict === "approve" ? (h.auto ? "Approved on its own" : "Approved") : "Rejected"}</span> ${esc(h.title)}</li>`).join("");
    const n = pending().length, kept = held().length, auto = autoRules(), cap = npcCap();
    const bulk = n > 1 ? `<div class="wodx-buttons wodx-bulk">
        <button type="button" data-action="approveTicked"><i class="fa-solid fa-check-double"></i> Approve the ticked</button>
        <button type="button" data-action="rejectTicked"><i class="fa-solid fa-xmark"></i> Reject the ticked</button>
        <button type="button" data-action="tickAll">Tick all or none</button></div>
        <p class="wodx-quiet">Untick the ones to leave for later.</p>` : "";
    const heldNote = kept ? `<p class="wodx-held">${kept} NPC proposal${kept === 1 ? " is" : "s are"} held back: past this session's cap of ${cap}. <button type="button" data-action="release">Put them in the queue</button></p>` : "";
    const ts = types().filter(t => !QR.NEVER_AUTO.includes(t.type));
    const rules = ts.map(t => `<li><label><input type="checkbox" class="wodx-auto" data-type="${esc(t.type)}"${auto[t.type] ? " checked" : ""}> ${esc(t.label)}</label></li>`).join("");
    const standing = `<section class="wodx-standing"><h3>Approve on its own${Object.keys(auto).length ? ` (${Object.keys(auto).length})` : ""}</h3>
        <p class="wodx-quiet">A ticked kind is approved the moment it is proposed, and listed as approved on its own. A player's own request always waits. The cap on NPC proposals a session is in Configure Settings${cap ? ` (now ${cap})` : " (now none)"}.</p>
        ${ts.length > 8 ? searchBox("ul.wodx-autolist", "Search kinds…", "Search kinds of proposal") : ""}<ul class="wodx-list wodx-autolist"${ts.length > 8 ? "" : " data-fixed"}>${rules}</ul></section>`;
    const div = document.createElement("div");
    div.className = "wodx-body wodx-scroll";
    div.innerHTML = `
      ${heldNote}
      ${items ? `${searchBox("ul.wodx-pending", "Search requests…", "Search requests")}${bulk}<ul class="wodx-list wodx-pending">${items}</ul>` : `<p class="wodx-quiet">Nothing is waiting.</p>`}
      ${standing}
      ${past ? `<details><summary>Recently decided</summary>${searchBox("ul.wodx-history", "Search decided…", "Search decided requests")}<ul class="wodx-list wodx-history">${past}</ul></details>` : ""}`;
    return div;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  _onRender() {
    this.element.querySelectorAll("input.wodx-auto").forEach(b => b.addEventListener("change", ev => setAuto(ev.target.dataset.type, ev.target.checked)));
  }

  static #except(target) {
    const root = target.closest(".wodx-body") ?? document;
    return [...root.querySelectorAll("input.wodx-tick")].filter(b => !b.checked).map(b => b.dataset.id);
  }

  static async #onApproveTicked(event, target) {
    await decideMany("approve", {except: ApprovalsApp.#except(target)});
  }

  static async #onRejectTicked(event, target) {
    await decideMany("reject", {except: ApprovalsApp.#except(target)});
  }

  static #onTickAll(event, target) {
    const boxes = [...(target.closest(".wodx-body") ?? document).querySelectorAll("input.wodx-tick")];
    const on = !boxes.every(b => b.checked);
    boxes.forEach(b => { b.checked = on; });
  }

  static async #onRelease() {
    await releaseHeld();
  }

  static #note(target) {
    return target.closest(".wodx-approval")?.querySelector("textarea[name=note]")?.value?.trim() ?? "";
  }

  static async #onApprove(event, target) {
    await decide(target.dataset.id, "approve", ApprovalsApp.#note(target));
  }

  static async #onReject(event, target) {
    await decide(target.dataset.id, "reject", ApprovalsApp.#note(target));
  }
}

/** A player asks the Storyteller for something. */
export async function askStoryteller() {
  const {DialogV2} = foundry.applications.api;
  const result = await DialogV2.prompt({
    classes: ["wodx", "wodx-dialog"],
    window: {title: "Ask the Storyteller"},
    content: `
      <div class="form-group"><label>What are you asking for?</label><input type="text" name="title" maxlength="200" required></div>
      <div class="form-group"><label>Details</label><textarea name="detail" rows="4" maxlength="2000"></textarea></div>`,
    ok: {
      label: "Send",
      callback: (event, button) => ({title: button.form.elements.title.value.trim(), detail: button.form.elements.detail.value.trim()})
    },
    rejectClose: false
  });
  if ( !result?.title ) return;
  const sent = await propose({type: "request", title: result.title, detail: result.detail});
  if ( sent !== false ) ui.notifications.info("Sent to the Storyteller.");
}
