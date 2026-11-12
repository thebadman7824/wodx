/**
 * WoDX Library 0.17.0: What they could know (rules in know-rules.mjs). The Storyteller picks a player character and
 * sees the Encyclopaedia entries that fit the character's line and the clock's year, with a suggestion and its reason.
 * Ticked entries go into the character's codex (WoDX Storyteller), so the player reads only what was put there.
 * Opened from the Storyteller's hand, or game.modules.get("wodx-library").api.know.open().
 */
import * as K from "./know-rules.mjs";
import * as E from "./ency-rules.mjs";
import {sources} from "./shelves.mjs";
import {lineOfActor} from "./use.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const MOD = "wodx-library";
const PACK = "world.wodx-encyclopedia";
const {ApplicationV2} = foundry.applications.api;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const yearNow = () => { try { return Number(game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.()) || 0; } catch { return 0; } };
const pcs = () => [...(game.actors ?? [])].filter(a => a.hasPlayerOwner).sort((a, b) => a.name.localeCompare(b.name));
const codex = () => game.modules.get("wodx-storyteller")?.active ? game.modules.get("wodx-storyteller").api?.codex : null;
const uuidOf = id => `Compendium.${PACK}.JournalEntry.${E.docId(id)}`;

/** Intelligence and Abilities from any sheet (value or total, and ability Trait items). */
export function dotsOf(actor) {
  const v = x => Number(x?.total ?? x?.value) || 0;
  const abilities = {};
  for ( const [k, a] of Object.entries(actor?.system?.abilities ?? {}) ) abilities[k.toLowerCase()] = v(a);
  for ( const i of actor?.items ?? [] ) if ( i.type === "Trait" && /ability$/.test(i.system?.type ?? "") ) abilities[String(i.name).toLowerCase().replace(/[^a-z]/g, "")] = Number(i.system?.value) || 0;
  return {intelligence: v(actor?.system?.attributes?.intelligence), abilities};
}

/** Where each page in a character's codex came from (a page UUID: the Encyclopaedia journal's UUID and the page). */
async function inCodex(actor) {
  const c = await codex()?.of?.(actor, {make: false});
  return [...(c?.pages ?? [])].map(p => String(p.flags?.["wodx-storyteller"]?.from ?? "")).filter(Boolean);
}

export class KnowApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-know",
    classes: ["wodx", "wodx-know"],
    window: {title: "What they could know", icon: "fa-solid fa-brain", resizable: true},
    position: {width: 640, height: 640},
    actions: {reveal: KnowApp.#onReveal}
  };
  static #instance;
  actorId = null;
  all = false;
  static open(actorId) {
    if ( !game.user.isGM ) return ui.notifications.warn("Only the Storyteller sees this.");
    this.#instance ??= new KnowApp();
    if ( actorId ) this.#instance.actorId = actorId;
    return this.#instance.render({force: true});
  }

  async _renderHTML() {
    const div = document.createElement("div");
    div.className = "wodx-body";
    const list = pcs();
    const actor = game.actors.get(this.actorId) ?? list[0] ?? null;
    if ( !actor ) { div.innerHTML = `<p>No player characters yet.</p>`; return div; }
    this.actorId = actor.id;
    const year = yearNow();
    const who = {line: lineOfActor(actor), year, dots: dotsOf(actor)};
    const entries = (await sources())?.encyclopedia?.entries ?? [];
    const rows = K.listFor(entries, who, {onlyKnown: !this.all});
    const have = await inCodex(actor);
    const items = rows.map(r => {
      const u = uuidOf(r.e.id), got = have.some(f => f === u || f.startsWith(`${u}.`));
      return `<li data-search-text="${esc(`${r.e.title} ${E.KINDS[r.e.kind] ?? r.e.kind} ${(r.e.lines ?? []).join(" ")}`)}">
        <label><input type="checkbox" name="pick" value="${esc(r.e.id)}"${got ? " disabled" : (r.known ? " checked" : "")}> <b>${esc(r.e.title)}</b></label>
        <span class="wodx-quiet">${esc(E.KINDS[r.e.kind] ?? r.e.kind)}, ${esc(r.why)}${got ? ", already in the codex" : ""}</span></li>`;
    }).join("");
    div.innerHTML = `<div class="wodx-top">
        <div class="form-group"><label>Character</label><div class="form-fields"><select name="actor" data-fixed aria-label="Character">${list.map(a => `<option value="${a.id}"${a.id === actor.id ? " selected" : ""}>${esc(a.name)}</option>`).join("")}</select></div></div>
        <label><input type="checkbox" name="all"${this.all ? " checked" : ""}> Show everything that has happened by ${year || "now"}, not only what they would likely know</label>
        ${searchBox("ul.wodx-know-list", "Search entries…", "Search entries")}
        <p class="hint">Only you see this. A suggestion is a house rule from the line and Intelligence + Occult, Academics or Politics; your call wins. Ticked entries go into ${esc(actor.name)}'s codex, which only their players read.</p></div>
      <ul class="wodx-scroll wodx-know-list">${items || `<li class="wodx-quiet">Nothing fits yet.</li>`}</ul>
      <footer class="form-footer wodx-footer"><button type="button" data-action="reveal"${codex() ? "" : " disabled title=\"Needs WoDX Storyteller\""}><i class="fa-solid fa-book-open-reader"></i> Put the ticked in the codex</button></footer>`;
    div.querySelector("select[name=actor]").addEventListener("change", ev => { this.actorId = ev.target.value; this.render(); });
    div.querySelector("input[name=all]").addEventListener("change", ev => { this.all = ev.target.checked; this.render(); });
    return div;
  }

  _replaceHTML(result, content) { content.replaceChildren(result); }

  static async #onReveal() {
    const actor = game.actors.get(this.actorId);
    const ids = [...this.element.querySelectorAll("input[name=pick]:checked:not(:disabled)")].map(x => x.value);
    if ( !actor || !ids.length ) return ui.notifications.warn("Tick the entries first.");
    const cx = codex();
    if ( !cx?.reveal ) return ui.notifications.warn("WoDX Storyteller is off: there is no codex to put them in.");
    let done = 0;
    for ( const id of ids ) {
      const doc = await fromUuid(uuidOf(id)).catch(() => null);
      if ( !doc ) continue;
      await cx.reveal(doc, [actor]);
      done++;
    }
    if ( done < ids.length ) ui.notifications.warn(`${ids.length - done} entries are not in the Encyclopaedia compendium yet: refresh the Library first.`);
    this.render();
  }
}

/** Called from the Library's ready hook: the Storyteller's hand gets the tool. */
export function setupKnow() {
  const add = () => {
    const hand = game.wodx?.storyteller?.hand;
    if ( !hand?.addTool ) return false;
    hand.addTool({key: "know", label: "What they could know", icon: "fa-brain", run: () => KnowApp.open()});
    return true;
  };
  if ( game.user?.isGM && !add() ) setTimeout(add, 2000);
  return {open: id => KnowApp.open(id), rules: K, dotsOf};
}
