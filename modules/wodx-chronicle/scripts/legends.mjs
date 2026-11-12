import {MODULE_ID, esc, isActiveGM, setting, setSetting, log} from "./util.mjs";
import {getEngine} from "./calendar.mjs";
import {searchBox} from "./search.mjs";
import * as events from "./events.mjs";
import * as L from "./legends-rules.mjs";
import {officeTitle, polityFor} from "../../wodx-npc/scripts/politics-rules.mjs";

/**
 * WoDX Chronicle 0.33.0: the Legends book (B1500-B1502). A journal of what has really happened in this chronicle,
 * rebuilt when a session ends in WoDX Storyteller, before and after each time skip, and when the Storyteller asks.
 * It reads records other modules keep (their settings and actor flags, by name, so a module that is off is simply
 * skipped) and never changes them. The rules are in legends-rules.mjs.
 */

const JOURNAL_KIND = "legends";
const JOURNAL_NAME = "Legends of the Chronicle";
const CREATION = "wodx-creation", NPC = "wodx-npc", ST = "wodx-storyteller";

const on = id => !!game.modules.get(id)?.active;
const other = (mod, key, fallback) => { try { return on(mod) ? game.settings.get(mod, key) ?? fallback : fallback; } catch (e) { return fallback; } };
const today = () => { const d = getEngine().timeToDate(game.time.worldTime); return {year: d.year, month: d.month, day: d.day}; };
const dateOf = t => getEngine().timeToDate(t);

export function registerLegendsSettings() {
  game.settings.register(MODULE_ID, "legends", {scope: "world", config: false, type: Object, default: L.blankLegends(),
    onChange: () => LegendsApp.refresh()});
}

/** The book as stored. */
export const book = () => L.normLegends(setting("legends"));

/** The lines a viewer may see: the Storyteller sees all, a player only shown lines up to today. */
export function visible(filter = {}) {
  return L.filterEntries(book().entries, {...filter, players: !game.user.isGM, today: today()});
}

/* ------------------------------------------------------------------ */
/*  Gathering                                                          */
/* ------------------------------------------------------------------ */

function actorRows() {
  if ( !on(CREATION) ) return [];
  return game.actors.contents.map(a => {
    const f = a.flags?.[CREATION] ?? {};
    return {id: a.id, name: a.name, chronology: f.chronology ?? {}, lineage: f.lineage ?? {}};
  }).filter(r => r.chronology.died != null || r.chronology.embraced != null || r.chronology.ghouled != null);
}

function factionList() {
  const s = other(NPC, "factions", null);
  return Array.isArray(s?.factions) ? s.factions.filter(f => f?.id) : [];
}

function places() {
  const out = [];
  const ownerOf = doc => {
    const o = doc?.flags?.[ST]?.owner;
    if ( o && (o.id || o.name) ) return {id: o.id ?? null, name: o.name ?? "", since: o.since ?? null};
    const tag = doc?.flags?.[NPC]?.place?.owner;
    return tag ? {id: null, name: String(tag), since: null} : null;
  };
  for ( const s of game.scenes?.contents ?? [] ) {
    const so = ownerOf(s);
    if ( so ) out.push({uuid: s.uuid, name: s.navName || s.name, owner: so});
    for ( const r of s.regions?.contents ?? [] ) {
      const ro = ownerOf(r);
      if ( ro ) out.push({uuid: r.uuid, name: `${r.name}, ${s.navName || s.name}`, owner: ro});
    }
  }
  return out;
}

/** Everything the records say now, and the snapshot to compare with next time. */
export function gather(prevSnap = null) {
  const year = today().year;
  const fired = events.fired();
  const byId = new Map(events.list().map(ev => [ev.id, ev]));
  const nameOf = id => game.actors.get(id)?.name ?? other(CREATION, "archived", {})?.[id]?.name ?? "Someone";
  const titleOf = (f, key) => { try { return officeTitle(polityFor(f, year), key, f); } catch (e) { return key; } };
  const snap = {
    offices: on(NPC) ? L.officeSnapshot(factionList(), titleOf, nameOf) : (prevSnap?.offices ?? {}),
    holdings: on(ST) ? L.holdingSnapshot(places()) : (prevSnap?.holdings ?? {})
  };
  const at = game.time.worldTime, d = today();
  const when = {at, ...d};
  const lines = [
    ...L.eventLines(fired.map(id => byId.get(id)).filter(Boolean)),
    ...L.actorLines(actorRows(), other(CREATION, "archived", {}), dateOf),
    ...L.ledgerLines(other(ST, "ledger", {entries: []})?.entries ?? [], dateOf),
    ...L.officeLines(prevSnap?.offices ?? null, snap.offices, when),
    ...L.holdingLines(prevSnap?.holdings ?? null, snap.holdings, when)
  ];
  return {lines, snap, fired};
}

/** Read the records now and bring the book up to date with them, after any build already running. */
export function buildNow(options = {}) {
  return build({...options, gathered: gather(book().snap), at: game.time.worldTime});
}

let chain = Promise.resolve();
/** Bring the book up to date. Active GM only; one build at a time. Returns the lines added. */
export function build(options = {}) {
  const run = chain.then(() => _build(options));
  chain = run.catch(() => {});
  return run;
}

async function _build({quiet = false, gathered = null, at = null} = {}) {
  if ( !isActiveGM() ) return null;
  const s = book();
  // `gathered` is read at the moment of asking (before a time skip moves the clock); its snapshot came from s.snap
  const {lines, snap, fired} = gathered ?? gather(s.snap);
  const {legends, added} = L.merge(s, lines, {firedIds: fired, snap, built: at ?? game.time.worldTime});
  const changed = added.length || legends.entries.length !== s.entries.length || JSON.stringify(legends.snap) !== JSON.stringify(s.snap);
  if ( changed ) await setSetting("legends", legends);
  await writeJournal(legends);
  if ( added.length && !quiet ) log(`Legends: ${added.length} new line${added.length === 1 ? "" : "s"}`);
  return added;
}

/** Show or hide one line from the players. */
export async function setShown(id, shown) {
  if ( !game.user.isGM ) return;
  const s = book();
  const e = s.entries.find(x => x.id === id);
  if ( !e || e.shown === !!shown ) return;
  e.shown = !!shown;
  await setSetting("legends", s);
  await writeJournal(s);
}

/* ------------------------------------------------------------------ */
/*  The journal                                                        */
/* ------------------------------------------------------------------ */

const lineHTML = e => `<li><strong>${esc(L.dateLabel(e))}.</strong> ${esc(e.text)}${e.place && !e.text.includes(e.place) ? ` <em>(${esc(e.place)})</em>` : ""}</li>`;

/**
 * The players' book: shown lines up to today, one page per century. The journal is open to everyone to read, and
 * rewritten as a whole each build, so it has no lines the players should not see.
 */
async function writeJournal(s) {
  if ( !isActiveGM() ) return;
  const lines = L.filterEntries(s.entries, {players: true, today: today()});
  const pages = L.chapters(lines);
  const intro = `<p>What has happened in this chronicle, as far as anyone tells it. The Storyteller keeps it; it grows as the chronicle runs.</p>
    <p>For a search by person, place, faction or year, open the Legends window (the book button with the token tools).</p>`;
  const data = [{name: "About this book", text: intro}, ...pages.map(c => ({name: c.name, text: `<ul>${c.entries.map(lineHTML).join("")}</ul>`}))];
  let j = game.journal.find(x => x.getFlag?.(MODULE_ID, "kind") === JOURNAL_KIND);
  if ( !j ) {
    j = await JournalEntry.create({name: JOURNAL_NAME, ownership: {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER}, flags: {[MODULE_ID]: {kind: JOURNAL_KIND}},
      pages: data.map((p, i) => ({name: p.name, type: "text", sort: (i + 1) * 100000, text: {content: p.text}}))});
    return;
  }
  const keep = new Set(data.map(p => p.name));
  const gone = j.pages.contents.filter(p => !keep.has(p.name)).map(p => p.id);
  if ( gone.length ) await j.deleteEmbeddedDocuments("JournalEntryPage", gone);
  const updates = [], creates = [];
  data.forEach((p, i) => {
    const page = j.pages.getName(p.name);
    if ( !page ) creates.push({name: p.name, type: "text", sort: (i + 1) * 100000, text: {content: p.text}});
    else if ( page.text?.content !== p.text || page.sort !== (i + 1) * 100000 ) updates.push({_id: page.id, sort: (i + 1) * 100000, "text.content": p.text});
  });
  if ( updates.length ) await j.updateEmbeddedDocuments("JournalEntryPage", updates);
  if ( creates.length ) await j.createEmbeddedDocuments("JournalEntryPage", creates);
}

/* ------------------------------------------------------------------ */
/*  The window                                                         */
/* ------------------------------------------------------------------ */

const {ApplicationV2} = foundry.applications?.api ?? {ApplicationV2: class {}};

/** The Legends window: the book with filters. Everyone may open it; players see what the journal shows. */
export class LegendsApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-legends",
    classes: ["wodx", "wodx-legends-app"],
    window: {title: "Legends of the Chronicle", icon: "fa-solid fa-book-skull", resizable: true},
    position: {width: 640, height: 620},
    actions: {
      rebuild: LegendsApp.#onRebuild,
      journal: () => game.journal.find(x => x.getFlag?.(MODULE_ID, "kind") === JOURNAL_KIND)?.sheet?.render(true)
    }
  };

  static #instance;
  #filter = {kind: "", person: "", place: "", faction: "", from: "", to: ""};

  static open() {
    this.#instance ??= new LegendsApp();
    return this.#instance.render({force: true});
  }

  static refresh() {
    if ( this.#instance?.rendered ) this.#instance.render();
  }

  async _renderHTML() {
    const gm = game.user.isGM;
    const all = visible();
    const idx = L.indexOf(all);
    const f = this.#filter;
    const lines = L.filterEntries(all, f);
    const now = today();
    const list = (id, items) => `<datalist id="${id}">${items.map(v => `<option value="${esc(v)}">`).join("")}</datalist>`;
    const kinds = [`<option value="">Everything</option>`, ...Object.entries(L.KINDS).map(([k, v]) => `<option value="${k}"${f.kind === k ? " selected" : ""}>${esc(v)}</option>`)].join("");
    const rows = L.chapters(lines).map(c => `<h3>${esc(c.name)}</h3>${c.entries.map(e => `
      <div class="wodx-legend-row" data-search-item data-search-text="${esc(`${e.text} ${e.place} ${e.faction} ${e.people.map(p => p.name).join(" ")} ${e.year ?? ""}`)}">
        ${gm ? `<input type="checkbox" data-legend="${esc(e.id)}" ${e.shown ? "checked" : ""} aria-label="Players see this line" title="Players see this line">` : ""}
        <span><strong>${esc(L.dateLabel(e))}</strong> ${esc(e.text)}
        <span class="hint">${esc(L.KINDS[e.kind])}${e.place ? ` · ${esc(e.place)}` : ""}${e.faction ? ` · ${esc(e.faction)}` : ""}${gm && L.ahead(e, now) ? " · after today's date, players do not see it yet" : ""}</span></span>
      </div>`).join("")}`).join("") || `<p class="hint">Nothing yet${Object.values(f).some(Boolean) ? " for this filter" : ""}.</p>`;
    const div = document.createElement("div");
    div.className = "wodx-body";
    div.innerHTML = `<div class="wodx-top">
        <div class="form-group"><label for="wodx-legend-kind">Show</label><div class="form-fields"><select id="wodx-legend-kind" name="kind" data-fixed>${kinds}</select></div></div>
        <div class="form-group"><label>Person, place, faction</label><div class="form-fields">
          <input type="text" name="person" value="${esc(f.person)}" placeholder="Person" aria-label="Person" list="wodx-legend-people">
          <input type="text" name="place" value="${esc(f.place)}" placeholder="Place" aria-label="Place" list="wodx-legend-places">
          <input type="text" name="faction" value="${esc(f.faction)}" placeholder="Faction" aria-label="Faction" list="wodx-legend-factions"></div></div>
        <div class="form-group"><label>Years</label><div class="form-fields">
          <input type="number" name="from" value="${esc(f.from)}" placeholder="From" aria-label="From the year" step="1">
          <input type="number" name="to" value="${esc(f.to)}" placeholder="To" aria-label="To the year" step="1"></div></div>
        ${list("wodx-legend-people", idx.people)}${list("wodx-legend-places", idx.places)}${list("wodx-legend-factions", idx.factions)}
        ${searchBox(".wodx-legend-list", "Search the book…", "Search the book")}
        <p class="hint">${lines.length} of ${all.length} line${all.length === 1 ? "" : "s"}.${gm ? " Untick a line to keep it from the players. The book is rebuilt when a session ends and around each time skip." : ""}</p></div>
      <div class="wodx-scroll wodx-legend-list">${rows}</div>
      <footer class="form-footer wodx-footer">
        <button type="button" data-action="journal"><i class="fa-solid fa-book-open"></i> Open the journal</button>
        ${gm ? `<button type="button" data-action="rebuild"><i class="fa-solid fa-rotate"></i> Bring it up to date</button>` : ""}</footer>`;
    return div;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  _onRender() {
    const root = this.element;
    for ( const el of root.querySelectorAll(".wodx-top [name]") ) {
      el.addEventListener("change", () => { this.#filter[el.name] = el.value; this.render(); });
    }
    for ( const box of root.querySelectorAll("[data-legend]") ) {
      box.addEventListener("change", () => setShown(box.dataset.legend, box.checked));
    }
  }

  static async #onRebuild() {
    const added = await build();
    ui.notifications.info(added?.length ? `Legends: ${added.length} new line${added.length === 1 ? "" : "s"}.` : "Legends: the book is up to date.");
    LegendsApp.refresh();
  }
}
