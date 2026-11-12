/**
 * WoDX Interactables 0.32.0: the case board (rules in case-rules.mjs).
 *
 * A board is a journal in the "WoDX case boards" folder that every player owns, with the cards and lines in its flags.
 * Anyone opens it from the token tools (Case board); the Storyteller also has it in the Storyteller's hand. Drop an
 * actor, a scene, a journal or page (an Encyclopaedia entry too) or an item on the board to pin it; add notes; drag
 * cards about; join two with a line and a few words. The Storyteller can hide a card until it is earned; players do not
 * see hidden cards or the lines to them. A clue examined through Interactables goes on the open board by itself
 * (world setting), with what the finder learned.
 *
 * Hidden cards only hide: they are in the journal's data, which a player who owns the journal could read with the
 * browser's tools. Keep anything truly secret in the Storyteller's own notes.
 */
import * as C from "./case-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const MOD = "wodx-interactables";
const FLAG = "board";
// The harness loads main.mjs without Foundry's application classes; a stand-in keeps the module loading there
const API = globalThis.foundry?.applications?.api ?? {};
const ApplicationV2 = API.ApplicationV2 ?? class {};
const DialogV2 = API.DialogV2;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const ICON = {clue: "fa-magnifying-glass", person: "fa-user", place: "fa-location-dot", entry: "fa-book", note: "fa-note-sticky"};

function yearNow() {
  try { return Number(game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.()) || 0; } catch { return 0; }
}
const boards = () => [...(game.journal ?? [])].filter(j => j.flags?.[MOD]?.[FLAG]).sort((a, b) => a.name.localeCompare(b.name));
const boardOf = j => C.normalize(j?.flags?.[MOD]?.[FLAG]);
/** The open case: the board the Storyteller chose, or the only one there is. */
export function openBoard() {
  const id = game.settings.get(MOD, "caseBoard");
  const list = boards();
  return list.find(j => j.id === id) ?? (list.length === 1 ? list[0] : null);
}

async function folder() {
  return game.folders.find(f => f.type === "JournalEntry" && f.name === C.BOARD_FOLDER)
    ?? Folder.create({name: C.BOARD_FOLDER, type: "JournalEntry", color: "#6b3b3b"});
}
/** A new board, owned by every player so they can pin and move cards. Storyteller only. */
export async function newBoard(name) {
  if ( !game.user.isGM ) return null;
  const f = await folder();
  const j = await JournalEntry.create({name: C.boardName(name), folder: f?.id ?? null,
    ownership: {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER}, flags: {[MOD]: {[FLAG]: C.emptyBoard()}}});
  if ( j && !openBoard() ) await game.settings.set(MOD, "caseBoard", j.id);
  return j;
}
/** Change a board through one of the pure rules: fn(board) -> board. */
export async function change(j, fn) {
  if ( !j?.isOwner ) { ui.notifications?.warn?.("You cannot change this board."); return null; }
  const next = C.normalize(fn(boardOf(j)));
  await j.update({[`flags.${MOD}.${FLAG}`]: next});
  return next;
}

/** Put a found clue on the open board (called on the Storyteller's client after a look or an examine). */
export async function pinClue(o, tileDoc, texts, actor) {
  if ( !game.user.isGM || !game.settings.get(MOD, "caseClues") ) return false;
  const j = openBoard();
  if ( !j ) return false;
  const name = o?.label || o?.name || tileDoc?.name || "A clue";
  let added = false;
  await change(j, b => { const r = C.addCard(b, C.clueCard(name, texts, tileDoc?.uuid ?? "", actor?.name ?? "")); added = r.added; return r.board; });
  if ( added ) CaseBoardApp.refresh();
  return added;
}

async function ask(title, fields, ok = "Save") {
  return DialogV2.prompt({classes: ["wodx-dialog", "wix-case-dialog"], window: {title}, content: fields,
    ok: {label: ok, callback: (e, b) => Object.fromEntries(new FormData(b.form))}, rejectClose: false});
}

export class CaseBoardApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-case-board",
    classes: ["wodx", "wix-case"],
    window: {title: "Case board", icon: "fa-solid fa-diagram-project", resizable: true},
    position: {width: 900, height: 680},
    actions: {note: CaseBoardApp.#onNote, newBoard: CaseBoardApp.#onNew, makeOpen: CaseBoardApp.#onMakeOpen,
      card: CaseBoardApp.#onCard, line: CaseBoardApp.#onLine}
  };
  static #instance;
  boardId = null;
  linking = null;

  static open(id) {
    this.#instance ??= new CaseBoardApp();
    if ( id ) this.#instance.boardId = id;
    return this.#instance.render({force: true});
  }
  static refresh() { if ( this.#instance?.rendered ) this.#instance.render(); }

  get title() { return C.lookFor(yearNow()).title; }

  get journal() {
    return (this.boardId && game.journal?.get(this.boardId)?.flags?.[MOD]?.[FLAG] ? game.journal.get(this.boardId) : null) ?? openBoard() ?? boards()[0] ?? null;
  }

  async _renderHTML() {
    const j = this.journal;
    const look = C.lookFor(yearNow());
    const gm = game.user.isGM;
    const div = document.createElement("div");
    div.className = `wodx-body wix-case-${look.key}`;
    const list = boards().filter(x => gm || x.testUserPermission?.(game.user, "OBSERVER"));
    const pick = list.length ? `<select name="board" data-fixed aria-label="Board">${list.map(x => `<option value="${x.id}"${x.id === j?.id ? " selected" : ""}>${esc(x.name.replace(/^Case board:\s*/, ""))}${x.id === openBoard()?.id ? " (open case)" : ""}</option>`).join("")}</select>` : "";
    if ( !j ) {
      div.innerHTML = `<p>${esc(look.hint)} ${gm ? "There is no board yet." : "The Storyteller has not started one yet."}</p>
        ${gm ? `<footer class="form-footer wodx-footer"><button type="button" data-action="newBoard"><i class="fa-solid fa-plus"></i> Start a board</button></footer>` : ""}`;
      return div;
    }
    const b = C.visibleTo(boardOf(j), gm);
    const at = new Map(b.cards.map(c => [c.id, c]));
    const mid = c => ({x: c.x + C.CARD_W / 2, y: c.y + C.CARD_H / 2});
    const lines = b.links.map(l => {
      const p = mid(at.get(l.a)), q = mid(at.get(l.b));
      const lx = (p.x + q.x) / 2, ly = (p.y + q.y) / 2;
      return `<g class="wix-case-link" data-action="line" data-id="${l.id}"><line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}"/><line class="wix-case-hit" x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}"/>${l.label ? `<text x="${lx}" y="${ly - 4}" text-anchor="middle">${esc(l.label)}</text>` : ""}</g>`;
    }).join("");
    const cards = b.cards.map(c => `<div class="wix-case-card wix-case-${c.kind}${c.hidden ? " wix-case-hidden" : ""}${this.linking === c.id ? " wix-case-linking" : ""}" data-id="${c.id}" data-search-item data-search-text="${esc(`${c.title} ${c.text} ${C.KINDS[c.kind]}`)}" style="left:${c.x}px;top:${c.y}px;width:${C.CARD_W}px;min-height:${C.CARD_H}px">
        <header class="wix-case-grip" title="Drag to move"><i class="fa-solid ${ICON[c.kind]}" aria-hidden="true"></i> <b>${esc(c.title)}</b>${c.hidden ? ` <i class="fa-solid fa-eye-slash" title="Hidden from the players"></i>` : ""}</header>
        ${c.text ? `<p>${esc(c.text).replace(/\n/g, "<br>")}</p>` : ""}
        <div class="wix-case-tools">${c.ref ? `<button type="button" data-action="card" data-op="open" data-id="${c.id}" title="Open it" aria-label="Open it"><i class="fa-solid fa-up-right-from-square"></i></button>` : ""}
          <button type="button" data-action="card" data-op="link" data-id="${c.id}" title="Join to another card: press here, then on the other card" aria-label="Join"><i class="fa-solid fa-link"></i></button>
          <button type="button" data-action="card" data-op="edit" data-id="${c.id}" title="Change the words" aria-label="Change"><i class="fa-solid fa-pen"></i></button>
          ${gm ? `<button type="button" data-action="card" data-op="hide" data-id="${c.id}" title="${c.hidden ? "Show to the players" : "Hide from the players"}" aria-label="Hide or show"><i class="fa-solid ${c.hidden ? "fa-eye" : "fa-eye-slash"}"></i></button>` : ""}
          <button type="button" data-action="card" data-op="remove" data-id="${c.id}" title="Take it off the board" aria-label="Remove"><i class="fa-solid fa-xmark"></i></button>
          ${c.by ? `<small class="wodx-quiet">${esc(c.by)}</small>` : ""}</div></div>`).join("");
    div.innerHTML = `<div class="wodx-top wix-case-top">${pick}${b.cards.length > 6 ? searchBox(".wix-case-area", "Find a card…", "Search the cards") : ""}
        <p class="hint">${esc(look.hint)} Drop people, places, journal pages, Encyclopaedia entries or items here to pin them. ${this.linking ? "<b>Now press the join button on the other card.</b>" : ""}</p></div>
      <div class="wix-case-scroll"><div class="wix-case-area" style="width:${C.BOARD_W}px;height:${C.BOARD_H}px">
        <svg class="wix-case-lines" width="${C.BOARD_W}" height="${C.BOARD_H}" aria-hidden="true">${lines}</svg>${cards}
        ${b.cards.length ? "" : `<p class="wodx-quiet wix-case-empty">Nothing pinned yet.</p>`}</div></div>
      <footer class="form-footer wodx-footer"><button type="button" data-action="note"><i class="fa-solid fa-note-sticky"></i> Add a note</button>
        ${gm ? `<button type="button" data-action="newBoard"><i class="fa-solid fa-plus"></i> Start another board</button>${j.id !== openBoard()?.id ? `<button type="button" data-action="makeOpen"><i class="fa-solid fa-thumbtack"></i> Make this the open case</button>` : ""}` : ""}</footer>`;
    div.querySelector("select[name=board]")?.addEventListener("change", ev => { this.boardId = ev.target.value; this.linking = null; this.render(); });
    this.#wireDrag(div, j);
    const area = div.querySelector(".wix-case-area");
    area.addEventListener("dragover", ev => ev.preventDefault());
    area.addEventListener("drop", ev => this.#onDrop(ev, j).catch(e => console.error(`${MOD} | case board drop`, e)));
    return div;
  }

  _replaceHTML(result, content) { content.replaceChildren(result); }

  /** Move a card by its header; the board is saved when the mouse lets go. */
  #wireDrag(div, j) {
    for ( const grip of div.querySelectorAll(".wix-case-grip") ) grip.addEventListener("pointerdown", ev => {
      if ( ev.button !== 0 ) return;
      const card = grip.closest(".wix-case-card");
      const sx = ev.clientX, sy = ev.clientY, ox = parseInt(card.style.left) || 0, oy = parseInt(card.style.top) || 0;
      grip.setPointerCapture?.(ev.pointerId);
      const move = e => { card.style.left = `${ox + e.clientX - sx}px`; card.style.top = `${oy + e.clientY - sy}px`; };
      const up = e => {
        grip.removeEventListener("pointermove", move); grip.removeEventListener("pointerup", up);
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if ( Math.abs(dx) + Math.abs(dy) < 3 ) return;
        change(j, b => C.moveCard(b, card.dataset.id, ox + dx, oy + dy)).catch(err => console.error(`${MOD} |`, err));
      };
      grip.addEventListener("pointermove", move); grip.addEventListener("pointerup", up);
    });
  }

  async #onDrop(ev, j) {
    ev.preventDefault();
    const TE = foundry.applications?.ux?.TextEditor?.implementation ?? globalThis.TextEditor;
    const data = TE?.getDragEventData?.(ev) ?? {};
    const doc = data?.uuid ? await fromUuid(data.uuid).catch(() => null) : null;
    const card = C.cardFromDrop(data, doc?.name ?? "");
    if ( !card ) return ui.notifications.warn("Drop a person, a place, a journal or page, or an item.");
    const r = ev.currentTarget.getBoundingClientRect();
    const x = ev.clientX - r.left - C.CARD_W / 2, y = ev.clientY - r.top - 16;
    await change(j, b => C.addCard(b, {...card, x, y, by: game.user.name, hidden: game.user.isGM && !!ev.altKey}).board);
  }

  static async #onNote() {
    const j = this.journal;
    if ( !j ) return;
    const r = await ask("A note for the board", `<div class="form-group"><label>Title</label><input type="text" name="title" maxlength="80" autofocus></div>
      <div class="form-group stacked"><label>Note</label><textarea name="text" rows="4" maxlength="600"></textarea></div>
      ${game.user.isGM ? `<label><input type="checkbox" name="hidden"> Hide it from the players for now</label>` : ""}`, "Pin it");
    if ( !r?.title && !r?.text ) return;
    await change(j, b => C.addCard(b, {kind: "note", title: r.title || "Note", text: r.text, hidden: !!r.hidden, by: game.user.name}).board);
  }

  static async #onNew() {
    const r = await ask("Start a case board", `<div class="form-group"><label>The case</label><input type="text" name="name" maxlength="60" placeholder="The missing courier" autofocus></div>`, "Start");
    if ( !r ) return;
    const j = await newBoard(r.name);
    if ( j ) { this.boardId = j.id; this.render(); }
  }

  static async #onMakeOpen() {
    const j = this.journal;
    if ( !game.user.isGM || !j ) return;
    await game.settings.set(MOD, "caseBoard", j.id);
    ui.notifications.info(`${j.name} is the open case: found clues go on it.`);
    this.render();
  }

  static async #onCard(ev, target) {
    const j = this.journal, id = target.dataset.id;
    if ( !j ) return;
    const c = boardOf(j).cards.find(k => k.id === id);
    if ( !c ) return;
    const op = target.dataset.op;
    if ( op === "open" ) {
      const doc = await fromUuid(c.ref).catch(() => null);
      if ( !doc ) return ui.notifications.warn("That is gone, or you cannot see it.");
      if ( doc.documentName === "Scene" ) return doc.testUserPermission?.(game.user, "OBSERVER") ? doc.view() : ui.notifications.info(`${doc.name}: only the Storyteller can show it.`);
      if ( doc.documentName === "Tile" ) return ui.notifications.info(`${c.title} is on ${doc.parent?.name ?? "a scene"}.`);
      if ( doc.documentName === "JournalEntryPage" ) return doc.parent?.sheet?.render(true, {pageId: doc.id});
      return doc.sheet?.render(true);
    }
    if ( op === "link" ) {
      if ( !this.linking ) { this.linking = id; return this.render(); }
      const from = this.linking;
      this.linking = null;
      if ( from === id ) return this.render();
      const r = await ask("Join the cards", `<div class="form-group"><label>Words on the line</label><input type="text" name="label" maxlength="60" placeholder="paid by, seen with, lied about…" autofocus></div>`, "Join");
      if ( r === null || r === undefined ) return this.render();
      return change(j, b => C.link(b, from, id, r.label));
    }
    if ( op === "edit" ) {
      const r = await ask("Change the card", `<div class="form-group"><label>Title</label><input type="text" name="title" maxlength="80" value="${esc(c.title)}"></div>
        <div class="form-group stacked"><label>Note</label><textarea name="text" rows="4" maxlength="600">${esc(c.text)}</textarea></div>`);
      if ( !r ) return;
      return change(j, b => C.editCard(b, id, {title: r.title, text: r.text}));
    }
    if ( op === "hide" && game.user.isGM ) return change(j, b => C.editCard(b, id, {hidden: !c.hidden}));
    if ( op === "remove" ) {
      const ok = await DialogV2.confirm({window: {title: "Take it off the board"}, content: `<p>Take ${esc(c.title)} off the board, with its lines? What it stands for is not touched.</p>`, rejectClose: false});
      if ( ok ) return change(j, b => C.removeCard(b, id));
    }
  }

  static async #onLine(ev, target) {
    const j = this.journal, id = target.closest("[data-id]")?.dataset.id;
    const l = boardOf(j).links.find(k => k.id === id);
    if ( !l ) return;
    const r = await DialogV2.wait({window: {title: "The line"}, content: `<div class="form-group"><label>Words on the line</label><input type="text" name="label" maxlength="60" value="${esc(l.label)}"></div>`,
      buttons: [{action: "save", label: "Save", default: true, callback: (e, b) => ({save: b.form.elements.label.value})},
        {action: "cut", label: "Cut the line", callback: () => ({cut: true})}], rejectClose: false});
    if ( r?.cut ) return change(j, b => C.unlink(b, id));
    if ( r?.save !== undefined ) return change(j, b => C.link(b, l.a, l.b, r.save));
  }
}

export function registerCaseSettings() {
  game.settings.register(MOD, "caseBoard", {scope: "world", config: false, type: String, default: ""});
  game.settings.register(MOD, "caseClues", {
    name: "Found clues go on the case board", hint: "A clue looked at or examined through Interact is pinned to the open case board, with what the finder learned.",
    scope: "world", config: true, type: Boolean, default: true
  });
}

/** Wire it up: the token tool for everyone, the Storyteller's hand, and redraws when the board changes. */
export function setupCase() {
  Hooks.on("getSceneControlButtons", controls => {
    const tokens = controls.tokens ?? controls.find?.(c => c.name === "token");
    if ( !tokens?.tools ) return;
    const tool = {name: "wodxCaseBoard", title: "Case board: clues, people and places joined up", icon: "fa-solid fa-diagram-project", order: 117, button: true, visible: true, onChange: () => CaseBoardApp.open()};
    if ( Array.isArray(tokens.tools) ) { if ( !tokens.tools.some(t => t.name === tool.name) ) tokens.tools.push(tool); }
    else tokens.tools.wodxCaseBoard = tool;
  });
  Hooks.on("updateJournalEntry", doc => { if ( doc.flags?.[MOD]?.[FLAG] ) CaseBoardApp.refresh(); });
  Hooks.on("deleteJournalEntry", doc => { if ( doc.flags?.[MOD]?.[FLAG] ) CaseBoardApp.refresh(); });
  Hooks.once("ready", () => {
    const add = () => {
      const hand = game.wodx?.storyteller?.hand;
      if ( !hand?.addTool ) return false;
      hand.addTool({key: "caseBoard", label: "The case board", icon: "fa-diagram-project", run: () => CaseBoardApp.open()});
      return true;
    };
    if ( game.user.isGM && !add() ) setTimeout(add, 2000);
  });
  return {open: id => CaseBoardApp.open(id), openBoard, newBoard, change, pinClue, boards, rules: C};
}
