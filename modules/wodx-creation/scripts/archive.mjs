import {MODULE_ID, esc, lineOf, chronology} from "./actor-data.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";
import {describeTime} from "../../wodx-chronicle/scripts/calendar.mjs";

/**
 * The archive of the dead. A long chronicle piles up the dead (filed in "WoDX · The Dead" by Pass the Years and
 * by hand) and the copies Pass the Years keeps ("WoDX · Before the years"). The Storyteller moves the ones the
 * table no longer needs into a world compendium, "WoDX · Archive of the dead", keeping each actor's id, so a
 * name or link that pointed at it still finds it there. A journal, "WoDX · Archive of the dead", lists everyone
 * in it with their dates and a link. Bring back returns an actor to the world, into its old folder kind.
 *
 * Nothing is lost: each actor is written to the compendium and found there before it leaves the world.
 * Left in the world: player characters, and anyone with a linked token on a scene (the token would break).
 */

export const PACK_NAME = "wodx-archive";
export const PACK_LABEL = "WoDX · Archive of the dead";
export const JOURNAL_NAME = "WoDX · Archive of the dead";
const DEAD_FOLDER = "WoDX · The Dead";
const SNAPSHOT_FOLDER = "WoDX · Before the years";

export function registerArchiveSettings() {
  // {actorId: {name, type, line, born, died, cause, kind, at}}
  game.settings.register(MODULE_ID, "archived", {scope: "world", config: false, type: Object, default: {}});
  game.settings.registerMenu(MODULE_ID, "archiveMenu", {
    name: "Archive of the dead",
    label: "Open the archive",
    hint: "Move the dead and Pass the Years' old copies out of the world into a compendium, or bring them back.",
    icon: "fa-solid fa-box-archive",
    type: ArchiveApp,
    restricted: true
  });
}

const year = time => { try { return describeTime(Number(time) || 0).dateLabel; } catch { return ""; } };

/** The pack, made the first time it is needed. */
export async function archivePack({create = true} = {}) {
  const found = game.packs?.get(`world.${PACK_NAME}`);
  if ( found || !create ) return found ?? null;
  const CC = foundry.documents?.collections?.CompendiumCollection ?? globalThis.CompendiumCollection;
  return CC.createCompendium({type: "Actor", label: PACK_LABEL, name: PACK_NAME});
}

/** Why an actor must stay in the world, or null. */
export function mustStay(actor) {
  if ( actor.hasPlayerOwner ) return "a player's character";
  for ( const s of game.scenes ?? [] ) for ( const t of s.tokens ?? [] ) {
    if ( t.actorLink && t.actorId === actor.id ) return `has a linked token on ${s.name}`;
  }
  return null;
}

/** Who could go to the archive: the dead and the old copies, each with why it can't if it can't. */
export function candidates() {
  const out = [];
  for ( const a of game.actors ?? [] ) {
    const folder = a.folder?.name;
    const c = chronology(a);
    const dead = c.died !== undefined && c.died !== null;
    const snapshot = !!a.getFlag?.(MODULE_ID, "snapshotOf");
    if ( !(folder === DEAD_FOLDER || dead || snapshot || folder === SNAPSHOT_FOLDER) ) continue;
    out.push({id: a.id, name: a.name, kind: snapshot || folder === SNAPSHOT_FOLDER ? "copy" : "dead",
      line: lineOf(a) ?? a.type, born: c.bornYear ?? null, died: dead ? c.died : null, cause: c.cause ?? "", stay: mustStay(a)});
  }
  return out.sort((x, y) => x.kind.localeCompare(y.kind) || x.name.localeCompare(y.name));
}

/** Move these actors into the archive. Returns {archived, kept: [{id, name, why}]}. */
export async function archive(ids) {
  if ( !game.user.isGM ) throw new Error("Only the Storyteller can archive characters.");
  const pack = await archivePack();
  const kept = [];
  const going = [];
  for ( const id of ids ) {
    const a = game.actors.get(id);
    if ( !a ) continue;
    const why = mustStay(a);
    if ( why ) { kept.push({id, name: a.name, why}); continue; }
    going.push(a);
  }
  if ( !going.length ) return {archived: [], kept};
  const datas = going.map(a => {
    const d = a.toCompendium ? a.toCompendium(pack, {keepId: true, clearFolder: true}) : a.toObject();
    d._id = a.id;
    return d;
  });
  const DocClass = globalThis.Actor?.implementation ?? globalThis.Actor;
  await DocClass.createDocuments(datas, {pack: pack.collection, keepId: true});
  // Only what the compendium now holds leaves the world
  const index = await pack.getIndex({fields: ["name"]});
  const safe = going.filter(a => index.get(a.id));
  for ( const a of going ) if ( !index.get(a.id) ) kept.push({id: a.id, name: a.name, why: "the compendium did not take it"});
  const record = {...(game.settings.get(MODULE_ID, "archived") ?? {})};
  const at = game.time.worldTime;
  for ( const a of safe ) {
    const c = chronology(a);
    record[a.id] = {name: a.name, type: a.type, line: lineOf(a) ?? a.type, born: c.bornYear ?? null, died: c.died ?? null, cause: c.cause ?? "",
      kind: a.getFlag?.(MODULE_ID, "snapshotOf") || a.folder?.name === SNAPSHOT_FOLDER ? "copy" : "dead", at};
  }
  await game.settings.set(MODULE_ID, "archived", record);
  if ( safe.length ) await DocClass.deleteDocuments(safe.map(a => a.id));
  await writeIndex(pack);
  return {archived: safe.map(a => ({id: a.id, name: a.name})), kept};
}

/** Bring archived actors back into the world, with their ids, into the folder for their kind. */
export async function restore(ids) {
  if ( !game.user.isGM ) throw new Error("Only the Storyteller can bring characters back.");
  const pack = await archivePack({create: false});
  if ( !pack ) return {restored: []};
  const record = {...(game.settings.get(MODULE_ID, "archived") ?? {})};
  const restored = [];
  for ( const id of ids ) {
    if ( game.actors.get(id) ) continue;
    const kind = record[id]?.kind === "copy" ? SNAPSHOT_FOLDER : DEAD_FOLDER;
    const folder = game.folders.find(f => f.type === "Actor" && f.name === kind)
      ?? await Folder.create({name: kind, type: "Actor"});
    const a = await game.actors.importFromCompendium(pack, id, {folder: folder.id}, {keepId: true});
    if ( !a ) continue;
    restored.push({id, name: a.name});
    await (await pack.getDocument(id))?.delete();
    delete record[id];
  }
  await game.settings.set(MODULE_ID, "archived", record);
  await writeIndex(pack);
  return {restored};
}

/** Look up an id that may have gone to the archive: the world actor, else the archive's entry. */
export function whereIs(id) {
  const a = game.actors.get(id);
  if ( a ) return {where: "world", actor: a, name: a.name};
  const r = (game.settings.get(MODULE_ID, "archived") ?? {})[id];
  return r ? {where: "archive", uuid: `Compendium.world.${PACK_NAME}.Actor.${id}`, name: r.name, ...r} : null;
}

export function indexHTML() {
  const record = game.settings.get(MODULE_ID, "archived") ?? {};
  const rows = Object.entries(record).sort(([, a], [, b]) => (a.died ?? 0) - (b.died ?? 0) || a.name.localeCompare(b.name))
    .map(([id, r]) => `<tr><td>@UUID[Compendium.world.${PACK_NAME}.Actor.${id}]{${esc(r.name)}}</td><td>${esc(r.line)}</td>
      <td>${r.born ?? ""}</td><td>${r.died !== null && r.died !== undefined ? esc(year(r.died)) : ""}</td><td>${esc(r.cause)}</td><td>${r.kind === "copy" ? "copy before the years" : "dead"}</td></tr>`).join("");
  return `<p>Characters moved out of the world into the compendium ${esc(PACK_LABEL)}. Each keeps its id, so links still find it. Bring one back in Configure Settings, Archive of the dead.</p>
    <table><thead><tr><th>Name</th><th>Kind</th><th>Born</th><th>Died</th><th>Cause</th><th>Entry</th></tr></thead><tbody>${rows || `<tr><td colspan="6">No one yet.</td></tr>`}</tbody></table>`;
}

async function writeIndex() {
  const content = indexHTML();
  let j = game.journal.find(x => x.getFlag?.(MODULE_ID, "kind") === "archive");
  if ( !j ) {
    j = await JournalEntry.create({name: JOURNAL_NAME, flags: {[MODULE_ID]: {kind: "archive"}},
      pages: [{name: "Index", type: "text", text: {content}}]});
    return j;
  }
  const page = j.pages.getName("Index");
  if ( page ) await page.update({"text.content": content});
  else await j.createEmbeddedDocuments("JournalEntryPage", [{name: "Index", type: "text", text: {content}}]);
  return j;
}

const {ApplicationV2} = foundry.applications?.api ?? {ApplicationV2: class {}};

/** The archive window: who could go, who is there. */
export class ArchiveApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-archive",
    tag: "form",
    classes: ["wodx", "wodx-archive"],
    window: {title: "Archive of the dead", icon: "fa-solid fa-box-archive", resizable: true},
    position: {width: 560, height: "auto"},
    form: {handler: ArchiveApp.#onSubmit, closeOnSubmit: false},
    actions: {restore: ArchiveApp.#onRestore}
  };

  static #instance;
  static open() {
    this.#instance ??= new ArchiveApp();
    return this.#instance.render({force: true});
  }

  async _renderHTML() {
    const list = candidates();
    const record = game.settings.get(MODULE_ID, "archived") ?? {};
    const row = c => `<label class="wodx-archive-row" data-search-item data-search-text="${esc(`${c.name} ${c.line} ${c.cause}`)}">
      <input type="checkbox" name="pick" value="${esc(c.id)}" ${c.stay ? "disabled" : ""}>
      <span>${esc(c.name)}</span> <span class="wodx-quiet">${esc(c.line)}${c.died !== null ? `, died ${esc(year(c.died))}` : ""}${c.kind === "copy" ? ", copy before the years" : ""}${c.stay ? `: stays, ${esc(c.stay)}` : ""}</span></label>`;
    const there = Object.entries(record).map(([id, r]) => `<div class="wodx-archive-row" data-search-item data-search-text="${esc(`${r.name} ${r.line}`)}">
      <span>${esc(r.name)}</span> <span class="wodx-quiet">${esc(r.line)}${r.died !== null && r.died !== undefined ? `, died ${esc(year(r.died))}` : ""}</span>
      <button type="button" data-action="restore" data-id="${esc(id)}"><i class="fa-solid fa-rotate-left"></i> Bring back</button></div>`).join("");
    const div = document.createElement("div");
    div.className = "wodx-body";
    div.innerHTML = `<div class="wodx-scroll">
      <h3>Could go to the archive (${list.length})</h3>
      ${searchBox(".wodx-archive-out", "Search the dead…", "Search the dead")}
      <div class="wodx-archive-out">${list.map(row).join("") || "<p class=\"wodx-quiet\">No one in WoDX · The Dead or WoDX · Before the years.</p>"}</div>
      <h3>In the archive (${Object.keys(record).length})</h3>
      ${searchBox(".wodx-archive-in", "Search the archive…", "Search the archive")}
      <div class="wodx-archive-in">${there || "<p class=\"wodx-quiet\">No one yet.</p>"}</div></div>
      <footer class="form-footer wodx-footer"><button type="submit"><i class="fa-solid fa-box-archive"></i> Archive the ticked</button></footer>`;
    return div;
  }

  _replaceHTML(result, content) { content.replaceChildren(result); }

  static async #onSubmit(event, form) {
    const ids = [...form.querySelectorAll("input[name=pick]:checked")].map(i => i.value);
    if ( !ids.length ) return ui.notifications.info("Tick who goes to the archive first.");
    const {archived, kept} = await archive(ids);
    ui.notifications.info(`${archived.length} moved to the archive.${kept.length ? ` Kept: ${kept.map(k => `${k.name} (${k.why})`).join(", ")}.` : ""}`);
    this.render();
  }

  static async #onRestore(event, target) {
    const {restored} = await restore([target.dataset.id]);
    if ( restored.length ) ui.notifications.info(`${restored[0].name} is back in the world.`);
    this.render();
  }
}
