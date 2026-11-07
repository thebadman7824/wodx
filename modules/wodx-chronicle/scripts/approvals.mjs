import {MODULE_ID, esc, emit, isActiveGM, setting, setSetting} from "./util.mjs";

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

/** Active GM: add a proposal to the queue. */
export async function addToQueue(entry) {
  if ( !isActiveGM() ) return;
  const q = foundry.utils.deepClone(setting("approvals") ?? {pending: [], history: []});
  if ( entry.key && q.pending.some(p => p.key === entry.key) ) return;
  q.pending.push(entry);
  await setSetting("approvals", q);
  ui.notifications.info(`For your approval: ${entry.title}`);
}

/**
 * Decide a proposal. GM only.
 * @param {string} id
 * @param {"approve"|"reject"} verdict
 * @param {string} [note]  A reply shown to the player who asked
 */
export async function decide(id, verdict, note = "") {
  if ( !game.user.isGM ) return;
  const q = foundry.utils.deepClone(setting("approvals") ?? {pending: [], history: []});
  const index = q.pending.findIndex(p => p.id === id);
  if ( index < 0 ) return;
  const [entry] = q.pending.splice(index, 1);
  entry.verdict = verdict;
  entry.note = note;
  entry.decidedAt = Date.now();
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
      reject: ApprovalsApp.#onReject
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
        <header><span class="wodx-tag">${esc(label(p.type))}</span> <strong>${esc(p.title)}</strong></header>
        ${p.detail ? `<p>${esc(p.detail)}</p>` : ""}
        <p class="wodx-quiet">From ${esc(who(p.from))}</p>
        <textarea name="note" rows="2" placeholder="Optional reply"></textarea>
        <div class="wodx-buttons">
          <button type="button" data-action="approve" data-id="${p.id}"><i class="fa-solid fa-check"></i> Approve</button>
          <button type="button" data-action="reject" data-id="${p.id}"><i class="fa-solid fa-xmark"></i> Reject</button>
        </div>
      </li>`).join("");
    const past = history().slice(0, 10).map(h => `
      <li><span class="wodx-tag ${h.verdict}">${h.verdict === "approve" ? "Approved" : "Rejected"}</span> ${esc(h.title)}</li>`).join("");
    const div = document.createElement("div");
    div.className = "wodx-body wodx-scroll";
    div.innerHTML = `
      ${items ? `<ul class="wodx-list">${items}</ul>` : `<p class="wodx-quiet">Nothing is waiting.</p>`}
      ${past ? `<details><summary>Recently decided</summary><ul class="wodx-list wodx-history">${past}</ul></details>` : ""}`;
    return div;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
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
