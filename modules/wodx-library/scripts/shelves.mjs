import * as S from "./shelf-rules.mjs";
import {MOD} from "./gear-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

/**
 * The Library's shelves: one world compendium per line (and one for rules, conditions and eras), filled from WoDX's
 * own summaries with page references, and the Library window that shows what fits the chronicle's era.
 */

export const SHELF_VERSION = 1;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const eraNow = () => game.modules.get("wodx-chronicle")?.api?.eras?.activeEra?.()?.profile?.id ?? null;
const eraName = id => game.modules.get("wodx-chronicle")?.api?.eras?.getProfile?.(id)?.name ?? id;
const CC = () => foundry.documents?.collections?.CompendiumCollection ?? globalThis.CompendiumCollection;

const json = async path => { try { const r = await fetch(path); return r.ok ? await r.json() : null; } catch { return null; } };
let SOURCES = null;
/** The data given directly (the tests and the UI fit check). */
export function setSources(src) { SOURCES = src; }
export async function sources() {
  if ( SOURCES ) return SOURCES;
  const A = "modules/wodx-actions/data";
  const [disciplines, roads, gifts, arcanoi, arcanoiGW, wraith, eras] = await Promise.all([`${A}/disciplines-daw.json`, `${A}/roads-daw.json`,
    `${A}/gifts-daw.json`, `${A}/arcanoi-w20.json`, `${A}/arcanoi-gw.json`, `${A}/wraith-w20.json`, "modules/wodx-chronicle/data/eras.json"].map(json));
  let conditions = [], houseRules = null;
  try { conditions = (await import("../../wodx-chronicle/scripts/conditions.mjs")).CORE_CONDITIONS ?? []; } catch { /* Chronicle missing */ }
  try { houseRules = (await import("../../wodx-chronicle/data/house-rules.mjs")).default; } catch { /* Chronicle missing */ }
  return {disciplines, roads, gifts, arcanoi, arcanoiGW, wraith, eras, conditions, houseRules};
}

const findPack = name => game.packs?.get?.(`world.${name}`) ?? [...(game.packs ?? [])].find(p => p.metadata?.name === name && p.metadata?.packageType === "world") ?? null;
const hash = S.hashOf;

/** Make the shelves, or bring them up to date: new entries added, changed ones remade, the Storyteller's own entries never touched. */
export async function installShelves() {
  if ( !game.user.isGM ) return null;
  const entries = S.buildShelves(await sources());
  const out = {created: 0, remade: 0, kept: 0, packs: []};
  for ( const key of S.SHELF_ORDER ) {
    const {name, label} = S.SHELVES[key];
    let pack = findPack(name);
    if ( !pack ) {
      try { pack = await CC().createCompendium({type: "JournalEntry", label, name}); }
      catch (err) { pack = findPack(name); if ( !pack ) throw err; }
    }
    out.packs.push(pack.collection);
    const mine = entries.filter(e => e.shelf === key).map(e => {
      const {shelf, ...doc} = e;
      doc.flags[MOD].hash = hash(doc);
      return doc;
    });
    const docs = await pack.getDocuments();
    const have = new Map(docs.filter(d => d.flags?.[MOD]?.shelf).map(d => [d.flags[MOD].shelf, d]));
    const create = [], remove = [];
    for ( const d of mine ) {
      const old = have.get(d.flags[MOD].shelf);
      if ( !old ) create.push(d);
      else if ( old.flags[MOD].hash !== d.flags[MOD].hash ) { remove.push(old.id); create.push(d); out.remade++; }
      else out.kept++;
    }
    if ( remove.length ) await JournalEntry.deleteDocuments(remove, {pack: pack.collection});
    if ( create.length ) await JournalEntry.createDocuments(create, {pack: pack.collection});
    out.created += create.length - remove.length;
  }
  await game.settings.set(MOD, "shelves", SHELF_VERSION);
  LibraryApp.refresh();
  return out;
}

/** Every shelved entry, from the compendium indexes: {uuid, name, shelf, book, lines, eras}. */
export async function catalogue() {
  const out = [];
  for ( const key of S.SHELF_ORDER ) {
    const pack = findPack(S.SHELVES[key].name);
    if ( !pack ) continue;
    const idx = await pack.getIndex({fields: [`flags.${MOD}`]});
    for ( const e of idx ) {
      const f = e.flags?.[MOD] ?? {};
      out.push({uuid: e.uuid ?? `Compendium.${pack.collection}.JournalEntry.${e._id}`, name: e.name, shelf: key, book: f.book ?? "", lines: f.lines ?? ["all"], eras: f.eras ?? []});
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

const {ApplicationV2} = foundry.applications?.api ?? {ApplicationV2: class {}};

export class LibraryApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-library",
    classes: ["wodx", "wodx-library-app"],
    window: {title: "The Library", icon: "fa-solid fa-book-atlas", resizable: true},
    position: {width: 620, height: 640},
    actions: {open: LibraryApp.#onOpen, install: LibraryApp.#onInstall, gear: () => game.modules.get(MOD)?.api?.open?.(),
      manual: () => game.modules.get(MOD)?.api?.manual?.open?.(), changelog: () => game.modules.get(MOD)?.api?.changelog?.open?.()}
  };
  static #instance;
  line = "all";
  eraOnly = true;
  static open() { this.#instance ??= new LibraryApp(); return this.#instance.render({force: true}); }
  static refresh() { if ( this.#instance?.rendered ) this.#instance.render(); }

  async _renderHTML() {
    const era = eraNow();
    const all = await catalogue();
    const list = all.filter(e => S.fits({lines: e.lines, eras: e.eras}, {line: this.line, era: this.eraOnly ? era : null}));
    const lines = Object.entries(S.LINE_LABELS).map(([k, v]) => `<option value="${k}"${k === this.line ? " selected" : ""}>${esc(v)}</option>`).join("");
    const rows = list.map(e => `<li class="wodx-shelf-row" data-search-text="${esc(`${e.name} ${S.SHELVES[e.shelf].label} ${e.book}`)}">
      <button type="button" class="wodx-shelf-open" data-action="open" data-uuid="${esc(e.uuid)}">${esc(e.name)}</button>
      <span class="wodx-quiet">${esc(S.SHELVES[e.shelf].label)}, ${esc(e.book)}</span></li>`).join("");
    const div = document.createElement("div");
    div.className = "wodx-body";
    div.innerHTML = `<div class="wodx-top">
        <div class="form-group"><label>Line</label><div class="form-fields"><select name="line" data-fixed aria-label="Line">${lines}</select></div></div>
        <div class="form-group"><label><input type="checkbox" name="eraOnly"${this.eraOnly ? " checked" : ""}> Only what fits ${esc(era ? eraName(era) : "this era")}</label></div>
        ${searchBox("ul.wodx-shelf-list", "Search the Library…", "Search the Library")}
        <p class="hint">${list.length} of ${all.length} entries. WoDX's own summaries with the book and page; read the book for the full text.</p></div>
      <ul class="wodx-scroll wodx-shelf-list">${rows || `<li class="wodx-quiet">${all.length ? "Nothing on these shelves fits." : "The shelves are not made yet."}</li>`}</ul>
      <footer class="form-footer wodx-footer">
        <button type="button" data-action="manual"><i class="fa-solid fa-circle-question"></i> How to use WoDX</button>
        <button type="button" data-action="changelog"><i class="fa-solid fa-clock-rotate-left"></i> What's new</button>
        <button type="button" data-action="gear"><i class="fa-solid fa-khanda"></i> Gear by era</button>
        ${game.user.isGM ? `<button type="button" data-action="install"><i class="fa-solid fa-book"></i> Refresh the shelves</button>` : ""}</footer>`;
    div.querySelector("select[name=line]").addEventListener("change", ev => { this.line = ev.target.value; this.render(); });
    div.querySelector("input[name=eraOnly]").addEventListener("change", ev => { this.eraOnly = ev.target.checked; this.render(); });
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }

  static async #onOpen(event, target) { (await fromUuid(target.dataset.uuid))?.sheet?.render(true); }
  static async #onInstall() {
    const r = await installShelves();
    if ( r ) ui.notifications.info(`The Library: ${r.created} added, ${r.remade} brought up to date, ${r.kept} unchanged.`);
  }
}

/* ---- The manual and what's new, as journals every player can read ---- */

const FOLDER = "WoDX Library";
async function libFolder() {
  return game.folders.find(f => f.type === "JournalEntry" && f.name === FOLDER) ?? Folder.create({name: FOLDER, type: "JournalEntry", color: "#3b4a5a"});
}
/** The modules of this build, with their versions. */
export function buildList() {
  return [...game.modules].filter(m => /^wodx-/.test(m.id) && m.active).map(m => ({id: m.id, title: m.title, version: m.version})).sort((a, b) => a.title.localeCompare(b.title));
}
/** Make or refresh one journal (found by its flag); pages are remade when the stamp changes. */
async function ensureJournal(kind, name, pages, stamp) {
  const O = CONST.DOCUMENT_OWNERSHIP_LEVELS;
  let j = game.journal.find(x => x.flags?.[MOD]?.kind === kind);
  if ( j && j.flags[MOD].stamp === stamp ) return j;
  if ( !game.user.isGM ) return j ?? null;
  const f = await libFolder();
  if ( !j ) return JournalEntry.create({name, folder: f?.id ?? null, ownership: {default: O.OBSERVER}, pages, flags: {[MOD]: {kind, stamp}}});
  await j.deleteEmbeddedDocuments("JournalEntryPage", j.pages.map(p => p.id));
  await j.createEmbeddedDocuments("JournalEntryPage", pages);
  await j.update({[`flags.${MOD}.stamp`]: stamp});
  return j;
}
export async function ensureManual() {
  const {MANUAL} = await import("../data/manual.mjs");
  const O = CONST.DOCUMENT_OWNERSHIP_LEVELS;
  const pages = MANUAL.map((p, i) => ({name: p.name, type: "text", sort: (i + 1) * 100, text: {content: p.html, format: 1},
    ...(p.who === "gm" ? {ownership: {default: O.NONE}} : {})}));
  return ensureJournal("manual", "WoDX · How to use WoDX", pages, S.hashOf(MANUAL));
}
export async function ensureChangelog() {
  const {CHANGES} = await import("../data/manual.mjs");
  const build = buildList();
  const news = `<ul>${CHANGES.map(c => `<li><strong>${esc(c.date)}:</strong> ${esc(c.what)}</li>`).join("")}</ul>`;
  const list = `<p>The WoDX modules on in this world:</p><ul>${build.map(m => `<li>${esc(m.title)} ${esc(m.version)}</li>`).join("")}</ul>`;
  return ensureJournal("changelog", "WoDX · What's new", [{name: "What's new", type: "text", sort: 100, text: {content: news, format: 1}},
    {name: "In this world", type: "text", sort: 200, text: {content: list, format: 1}}], S.hashOf({CHANGES, build}));
}
export const openManual = async () => (await ensureManual())?.sheet?.render(true);
export const openChangelog = async () => (await ensureChangelog())?.sheet?.render(true);
