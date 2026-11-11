import * as X from "./codex-rules.mjs";
import {MOD, esc, isPC} from "./core.mjs";
import {describeTime} from "../../wodx-chronicle/scripts/calendar.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

/**
 * A player codex: one journal per player character, which only that character's players (and the Storyteller) can
 * open. The Storyteller reveals journal pages to characters from the journal's header ("Reveal to a codex") or the
 * journal list's menu; the codex gets a copy of each page with the in-game date it was learned. Revealing again
 * brings the copy up to date.
 */

const dateNow = () => { try { return describeTime(game.time?.worldTime ?? 0).dateLabel; } catch { return ""; } };
const owners = actor => [...(game.users ?? [])].filter(u => !u.isGM && actor?.testUserPermission?.(u, "OWNER"));
/** Intelligence and Abilities, for the codex thresholds (any sheet: value or total). */
export function dotsOf(actor) {
  const v = x => Number(x?.total ?? x?.value) || 0;
  const abilities = {};
  for ( const [k, a] of Object.entries(actor?.system?.abilities ?? {}) ) abilities[k.toLowerCase()] = v(a);
  for ( const i of actor?.items ?? [] ) if ( i.type === "Trait" && /ability$/.test(i.system?.type ?? "") ) abilities[String(i.name).toLowerCase().replace(/[^a-z]/g, "")] = Number(i.system?.value) || 0;
  return {intelligence: v(actor?.system?.attributes?.intelligence), abilities};
}
const needsFor = (entry, page) => X.needsOf(page?.name ?? "").length ? X.needsOf(page.name) : X.needsOf(entry?.name ?? "");
const pcs = () => [...(game.actors ?? [])].filter(a => isPC?.(a) ?? a.hasPlayerOwner).sort((a, b) => a.name.localeCompare(b.name));

async function folder() {
  return game.folders.find(f => f.type === "JournalEntry" && f.name === X.CODEX_FOLDER)
    ?? Folder.create({name: X.CODEX_FOLDER, type: "JournalEntry", color: "#3b4f6b"});
}

/** A character's codex, made the first time it is needed. */
export async function codexOf(actor, {make = true} = {}) {
  if ( !actor ) return null;
  const have = game.journal.find(j => j.flags?.[MOD]?.codex === actor.id);
  if ( have || !make || !game.user.isGM ) return have ?? null;
  const ownership = {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE};
  for ( const u of owners(actor) ) ownership[u.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
  const f = await folder();
  return JournalEntry.create({name: X.codexName(actor.name), folder: f?.id ?? null, ownership, flags: {[MOD]: {codex: actor.id}}});
}

const pageData = p => ({uuid: p.uuid, name: X.bareName(p.name), type: p.type, text: p.text?.content ?? "", img: p.src ?? null, sort: p.sort});
function toDoc(cp) {
  const d = {name: cp.name, type: cp.type, sort: cp.sort, flags: {[MOD]: {from: cp.flags.from}}};
  if ( cp.type === "image" ) Object.assign(d, {src: cp.src, image: {caption: cp.caption}});
  else Object.assign(d, {text: {content: cp.text, format: 1}});
  return d;
}

/** Reveal pages (or a whole journal) to characters. Returns {actorId: number of pages written}. */
export async function reveal(source, actors) {
  if ( !game.user.isGM ) return {};
  const pages = source?.documentName === "JournalEntryPage" ? [source] : [...(source?.pages ?? [])];
  const when = dateNow();
  const out = {};
  for ( const actor of actors ?? [] ) {
    const codex = await codexOf(actor);
    if ( !codex ) continue;
    const existing = [...codex.pages].map(p => ({id: p.id, from: p.flags?.[MOD]?.from}));
    const {add, change} = X.planReveal(existing, pages.map(p => X.codexPage(pageData(p), when)));
    if ( add.length ) await codex.createEmbeddedDocuments("JournalEntryPage", add.map(toDoc));
    if ( change.length ) await codex.updateEmbeddedDocuments("JournalEntryPage", change.map(c => ({_id: c.id, ...toDoc(c)})));
    out[actor.id] = add.length + change.length;
  }
  const names = (actors ?? []).map(a => a.name).join(", ");
  if ( names ) ui.notifications?.info?.(`Revealed to ${names}.`);
  for ( const actor of actors ?? [] ) {
    const who = owners(actor).map(u => u.id);
    if ( who.length ) await ChatMessage.create({whisper: who, speaker: {alias: "Storyteller"},
      content: `<div class="wodx-card wstory"><p>${esc(actor.name)} learns something new: ${esc(pages.map(p => p.name).join(", "))}. It is in the codex.</p></div>`});
  }
  return out;
}

/** The Storyteller's dialog: which characters learn the journal (or the page in view). */
export async function revealDialog(entry, page = null) {
  if ( !game.user.isGM || !entry ) return null;
  const list = pcs();
  if ( !list.length ) return ui.notifications.warn("No player characters to reveal it to.");
  const {DialogV2} = foundry.applications.api;
  // Step 9: a page tagged "[Occult 5]" is ticked for the characters whose Intelligence + Occult reach 5
  const needs = needsFor(entry, page);
  const knows = a => X.knowsEnough(needs, dotsOf(a));
  const tag = needs.length ? needs.map(n => `Intelligence + ${n.ability[0].toUpperCase()}${n.ability.slice(1)} ${n.need}`).join(" or ") : "";
  const rows = list.map(a => `<li><label><input type="checkbox" name="pc" value="${a.id}"${needs.length && knows(a) ? " checked" : ""}> ${esc(a.name)}${needs.length ? ` <small>(${knows(a) ? "knows enough" : "not enough"})</small>` : ""}</label></li>`).join("");
  const pageOpt = page ? `<div class="form-group"><label>What</label><select name="what" data-fixed><option value="page">This page: ${esc(page.name)}</option><option value="all">The whole journal (${entry.pages.size} pages)</option></select></div>` : "";
  const r = await DialogV2.prompt({classes: ["wodx-dialog", "wstory-dialog"], window: {title: `Reveal ${entry.name} to a codex`},
    content: `<p class="wodx-quiet">Each chosen character's codex gets a copy, dated today in the chronicle. Their players are told.</p>${tag ? `<p>Needs ${esc(tag)}: those who reach it are ticked.</p>` : ""}${pageOpt}
      ${list.length > 8 ? searchBox("ul.wstory-codex-pcs", "Search characters…", "Search characters") : ""}<ul class="wodx-list wstory-codex-pcs"${list.length > 8 ? "" : " data-fixed"}>${rows}</ul>`,
    ok: {label: "Reveal", callback: (e, b) => ({ids: [...b.form.querySelectorAll("input[name=pc]:checked")].map(i => i.value), what: b.form.elements.what?.value ?? "all"})},
    rejectClose: false});
  if ( !r?.ids?.length ) return null;
  return reveal(r.what === "page" && page ? page : entry, r.ids.map(id => game.actors.get(id)).filter(Boolean));
}

export function registerCodexHooks() {
  // The journal's own header
  Hooks.on("getHeaderControlsJournalEntrySheet", (app, controls) => {
    if ( !game.user.isGM || app.document?.flags?.[MOD]?.codex ) return;
    if ( controls.some(c => c.action === "wodxRevealCodex") ) return;
    const go = () => revealDialog(app.document, app.document?.pages?.get?.(app.pageId ?? app._pageId ?? "") ?? null);
    // The action is found on the sheet's own actions; onClick is there for builds that read it
    if ( app.options?.actions ) app.options.actions.wodxRevealCodex = go;
    controls.push({icon: "fa-solid fa-book-bookmark", label: "Reveal to a codex", action: "wodxRevealCodex", onClick: go});
  });
  // The journal list's menu
  const menu = (app, options) => {
    options.push({name: "Reveal to a codex", icon: '<i class="fa-solid fa-book-bookmark"></i>', condition: () => game.user.isGM,
      callback: li => { const id = li?.dataset?.entryId ?? li?.[0]?.dataset?.entryId ?? li?.dataset?.documentId; return revealDialog(game.journal.get(id)); }});
  };
  Hooks.on("getJournalEntryContextOptions", menu);
}
