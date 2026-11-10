/**
 * WoDX Sheets 0.7.0: the sheet extras in Foundry. Every WoDX character sheet gets them, in the book's layout or the
 * system's own:
 *  - an in-play strip across the top of every tab (health, Willpower, the line's pools, soak, initiative, conditions);
 *  - a Possessions tab in place of the Gear tab: containers, stacks, concealment sizes, items out of their era, value
 *    for the time, money by era, search and filters, give and leave on the map;
 *  - a Ties tab (ghouls, retainers, allies, mentors, kin, havens), with ghouls that name the character as domitor;
 *  - the Storyteller's own notes on the Notes tab, kept in a Storyteller-only journal entry so players never get them;
 *  - search boxes on the long power lists;
 *  - a History window in the header with Undo for this session's edits (kept in memory, so it costs no saves);
 *  - a Print button that prints the sheet as it looks.
 * The pure parts are extras-rules.mjs and extras-html.mjs.
 */
import * as XR from "./extras-rules.mjs";
import * as XH from "./extras-html.mjs";

const MOD = XR.MOD, LIB = "wodx-library";
const SOCKET = `module.${MOD}`;
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const chron = () => game.modules.get("wodx-chronicle")?.api;
const eraId = () => { try { return chron()?.eras?.activeEra?.()?.profile?.id ?? null; } catch (e) { return null; } };
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || Number(game.time?.components?.year) || 0; } catch (e) { return 0; } };
const place = () => { try { return game.settings.get(MOD, "coinPlace") || "german"; } catch (e) { return "german"; } };

/* -------------------------------------------------------------- */
/*  Gear and goods lookups (WoDX Library's lists, when on disk)    */
/* -------------------------------------------------------------- */

let GOODS = null, GOODS_ERAS = null;
async function loadGoods() {
  if ( GOODS ) return;
  try {
    const g = await import("../../wodx-library/data/goods.mjs");
    GOODS = new Map((g.GOODS ?? []).map(x => [x.name.toLowerCase(), x]));
    GOODS_ERAS = g.ERAS ?? null;
  } catch (e) { GOODS = new Map(); }
}
/** What the lists say of an item: its eras (or years), its goods entry and its value. */
export function look(item) {
  const lib = item.flags?.[LIB] ?? {}, own = item.flags?.[MOD] ?? {};
  const good = GOODS?.get(item.name.toLowerCase()) ?? null;
  const firstYear = own.firstYear ?? lib.firstYear ?? good?.firstYear, lastYear = own.lastYear ?? lib.lastYear ?? good?.lastYear;
  const eras = own.eras ?? lib.eras ?? good?.tags?.era ?? good?.eras ?? null;
  const eraInfo = eras || Number.isFinite(firstYear) || Number.isFinite(lastYear) ? { eras: eras ?? [], firstYear, lastYear, order: GOODS_ERAS } : null;
  return { eraInfo, good, value: own.value ?? good?.tags?.value ?? null };
}

/* -------------------------------------------------------------- */
/*  Storyteller's notes: one GM-only journal entry, a page each    */
/* -------------------------------------------------------------- */

const NOTES_NAME = "WoDX: Storyteller's notes on characters";
function notesEntry() { return game.journal?.find(j => j.getFlag?.(MOD, "stNotes")) ?? null; }
function stNotesOf(actor) {
  const j = notesEntry(); if ( !j ) return "";
  const p = j.pages.find(pg => pg.getFlag?.(MOD, "actor") === actor.id);
  return p ? String(p.text?.content ?? "").replace(/<\/?p>/g, "").replace(/<br\s*\/?>/g, "\n") : "";
}
async function saveStNotes(actor, text) {
  if ( !game.user.isGM ) return;
  let j = notesEntry();
  if ( !j ) j = await JournalEntry.create({ name: NOTES_NAME, ownership: { default: 0 }, flags: { [MOD]: { stNotes: true } } });
  const html = XH.esc(text).split("\n").map(l => `<p>${l}</p>`).join("");
  const p = j.pages.find(pg => pg.getFlag?.(MOD, "actor") === actor.id);
  if ( p ) await p.update({ name: actor.name, "text.content": html });
  else await j.createEmbeddedDocuments("JournalEntryPage", [{ name: actor.name, type: "text", text: { content: html }, flags: { [MOD]: { actor: actor.id } } }]);
}

/* -------------------------------------------------------------- */
/*  History (this session, in memory)                              */
/* -------------------------------------------------------------- */

const HISTORY = new Map();
export const historyOf = id => HISTORY.get(id) ?? [];
const remember = (actorId, e) => { if ( e ) HISTORY.set(actorId, XR.pushEntry(historyOf(actorId), e)); };
function installHistory() {
  Hooks.on("preUpdateActor", (actor, changes, options, userId) => {
    if ( userId !== game.user.id || options.wodxUndo || !actor.isOwner ) return;
    remember(actor.id, XR.entryFor(actor.toObject(), changes, { at: Date.now(), user: game.user.name }));
  });
  Hooks.on("preUpdateItem", (item, changes, options, userId) => {
    const a = item.parent;
    if ( !a || a.documentName !== "Actor" || userId !== game.user.id || options.wodxUndo ) return;
    const e = XR.entryFor(item.toObject(), changes, { at: Date.now(), user: game.user.name });
    if ( e ) remember(a.id, { ...e, kind: "item", id: item.id, label: `${item.name}: ${e.label}` });
  });
  Hooks.on("preDeleteItem", (item, options, userId) => {
    const a = item.parent;
    if ( !a || a.documentName !== "Actor" || userId !== game.user.id || options.wodxUndo ) return;
    remember(a.id, { at: Date.now(), user: game.user.name, kind: "deleted", label: `Removed ${item.name}`, data: item.toObject() });
  });
  Hooks.on("createItem", (item, options, userId) => {
    const a = item.parent;
    if ( !a || a.documentName !== "Actor" || userId !== game.user.id || options.wodxUndo ) return;
    remember(a.id, { at: Date.now(), user: game.user.name, kind: "created", label: `Added ${item.name}`, id: item.id });
  });
}
async function undo(actor, i) {
  const list = historyOf(actor.id), e = list[i];
  if ( !e ) return;
  const opt = { wodxUndo: true };
  if ( e.kind === "actor" ) await actor.update({ ...e.undo, "system.settings.isupdated": false }, opt);
  else if ( e.kind === "item" ) await actor.items.get(e.id)?.update(e.undo, opt);
  else if ( e.kind === "deleted" ) await actor.createEmbeddedDocuments("Item", [e.data], { ...opt, keepId: true });
  else if ( e.kind === "created" ) await actor.items.get(e.id)?.delete(opt);
  HISTORY.set(actor.id, list.filter((_, k) => k !== i));
}
export async function openHistory(actor) {
  const D = foundry.applications.api.DialogV2;
  const content = () => `<input type="search" class="wodx-search" data-search=".wodx-history" placeholder="Search changes" aria-label="Search changes">${XH.historyHtml(historyOf(actor.id))}`;
  const dlg = new D({
    window: { title: `Changes to ${actor.name}`, icon: "fa-solid fa-clock-rotate-left" }, classes: ["wodx-sheet-history"],
    content: content(), buttons: [{ action: "close", label: "Close", default: true }]
  });
  await dlg.render(true);
  dlg.element.addEventListener("click", async ev => {
    const b = ev.target.closest(".wodx-hist-undo"); if ( !b ) return;
    ev.preventDefault();
    await undo(actor, Number(b.dataset.i));
    const list = dlg.element.querySelector(".wodx-history, .wodx-history-empty");
    if ( list ) list.outerHTML = XH.historyHtml(historyOf(actor.id));
  });
}

/* -------------------------------------------------------------- */
/*  Print                                                          */
/* -------------------------------------------------------------- */

export function printSheet(sheet) {
  const el = sheet.element?.[0] ?? sheet.element;
  if ( !el ) return;
  const w = window.open("", "_blank", "width=900,height=1100");
  if ( !w ) return ui.notifications.warn("The browser stopped the print window. Allow pop-ups for this page.");
  const css = [...document.querySelectorAll("link[rel=stylesheet], style")].map(n => n.outerHTML).join("");
  const body = el.querySelector(".window-content")?.cloneNode(true) ?? el.cloneNode(true);
  // Every tab, one after another, with the controls left out
  body.querySelectorAll(".tab").forEach(t => { t.classList.add("active"); t.style.display = "block"; });
  body.querySelectorAll("nav, .wodx-poss-tools, .wodx-poss-bar, input[type=search], .macroBtn, .wodx-actions-row").forEach(n => n.remove());
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${XH.esc(sheet.actor.name)}</title>${css}
    <style>body{background:#fff;color:#000;overflow:visible}.window-content{overflow:visible!important;height:auto!important}.tab{page-break-inside:avoid}</style></head>
    <body class="${document.body.className} wodx-print"><div class="app window-app sheet actor ${[...el.classList].join(" ")}">${body.outerHTML}</div></body></html>`);
  w.document.close();
  w.addEventListener("load", () => { w.focus(); w.print(); });
}

/* -------------------------------------------------------------- */
/*  Give and leave on the map (the Storyteller's client does it)   */
/* -------------------------------------------------------------- */

/** The item and everything inside it, as data, with the inside pointing at new parents by position. */
function bundle(actor, id) {
  const items = [...actor.items];
  const root = actor.items.get(id);
  return [root, ...XR.contentsOf(id, items)].filter(Boolean).map(i => i.toObject());
}
/**
 * Make the bundle on another actor, keeping who sits inside whom. data: the top item then everything inside it, a
 * parent always before what it holds (as bundle gives it). seed: old id to new id for items already made there.
 */
async function makeOn(target, data, parentId = null, seed = new Map()) {
  const map = new Map(seed), top = data[0]?._id;
  for ( const d of data ) {
    if ( map.has(d._id) ) continue;
    const c = foundry.utils.deepClone(d); delete c._id;
    const oldIn = d._id === top ? null : d.flags?.[MOD]?.in;
    foundry.utils.setProperty(c, `flags.${MOD}.in`, d._id === top ? parentId : map.get(oldIn) ?? null);
    const [m] = await target.createEmbeddedDocuments("Item", [c]);
    if ( m ) map.set(d._id, m.id);
  }
  return target.items.get(map.get(top));
}

async function doGive({ from, item, to }) {
  const a = game.actors.get(from), b = await fromUuid(to);
  const target = b?.actor ?? b;
  if ( !a || !target || target.documentName !== "Actor" ) return;
  const data = bundle(a, item);
  if ( !data.length ) return;
  await makeOn(target, data);
  await a.deleteEmbeddedDocuments("Item", data.map(d => d._id));
  ChatMessage.create({ content: `<p>${XH.esc(a.name)} gives ${XH.esc(data[0].name)} to ${XH.esc(target.name)}.</p>`, speaker: ChatMessage.getSpeaker({ actor: a }) });
}

const LEFT_FOLDER = "WoDX: things left on maps";
async function doLeave({ from, item, scene, x, y }) {
  const a = game.actors.get(from), sc = game.scenes.get(scene);
  if ( !a || !sc ) return;
  const data = bundle(a, item);
  if ( !data.length ) return;
  let folder = game.folders.find(fo => fo.type === "Item" && fo.getFlag?.(MOD, "left"));
  if ( !folder ) folder = await Folder.create({ name: LEFT_FOLDER, type: "Item", flags: { [MOD]: { left: true } } });
  // Everything goes in loose: the map container is the one holding them now
  const made = await Item.createDocuments(data.map(d => { const c = foundry.utils.deepClone(d); delete c._id; delete c.flags?.[MOD]?.in; c.folder = folder.id; c.ownership = { default: 0 }; return c; }));
  const g = sc.grid?.size ?? 100;
  await sc.createEmbeddedDocuments("Tile", [{
    x: x - g / 4, y: y - g / 4, width: g / 2, height: g / 2, texture: { src: "icons/svg/item-bag.svg" },
    flags: { "wodx-interactables": { container: true, kind: "box", ds: "open", items: made.map(m => m.uuid).join("\n") }, [MOD]: { leftBy: a.id, name: data[0].name } }
  }]);
  await a.deleteEmbeddedDocuments("Item", data.map(d => d._id));
  ChatMessage.create({ content: `<p>${XH.esc(a.name)} leaves ${XH.esc(data[0].name)} here.</p>`, speaker: ChatMessage.getSpeaker({ actor: a }) });
}
function installSocket() {
  game.socket?.on(SOCKET, msg => {
    if ( !isActiveGM() || !msg?.op ) return;
    if ( msg.op === "give" ) doGive(msg);
    if ( msg.op === "leave" ) doLeave(msg);
  });
}
const viaGM = (msg, local) => (isActiveGM() ? local(msg) : game.socket.emit(SOCKET, msg));

async function pickRecipient(actor) {
  const scene = canvas?.scene;
  const near = scene ? scene.tokens.filter(t => t.actor && t.actor.id !== actor.id).map(t => ({ uuid: t.uuid, name: t.name })) : [];
  const pcs = game.actors.filter(x => x.id !== actor.id && x.hasPlayerOwner).map(x => ({ uuid: x.uuid, name: x.name }));
  const all = [...near, ...pcs.filter(p => !near.some(n => n.name === p.name))];
  if ( !all.length ) { ui.notifications.info("Nobody here to give it to."); return null; }
  return foundry.applications.api.DialogV2.prompt({
    window: { title: "Give to whom?" },
    content: `<input type="search" class="wodx-search" data-search=".wodx-give-pick" placeholder="Search" aria-label="Search"><select class="wodx-give-pick" name="to" size="8" style="width:100%">${all.map(o => `<option value="${o.uuid}">${XH.esc(o.name)}</option>`).join("")}</select>`,
    ok: { label: "Give", callback: (ev, b) => b.form.elements.to.value || null }, rejectClose: false
  });
}

/* -------------------------------------------------------------- */
/*  Drawing on the sheet                                           */
/* -------------------------------------------------------------- */

function healthLabel(actor) {
  const k = actor.system?.health?.damage?.woundlevel;
  return k ? game.i18n.localize(k) : "";
}
function conditionNames(actor) {
  try { return (chron()?.conditions?.conditionsOf?.(actor) ?? []).map(c => c?.label ?? c?.name ?? String(c)); }
  catch (e) { return []; }
}
function tieList(actor) {
  const own = actor.getFlag(MOD, "ties") ?? [];
  const ghouls = game.actors.filter(x => x.flags?.["wodx-creation"]?.lineage?.domitor === actor.id).map(x => ({ uuid: x.uuid, role: "ghoul", note: "", auto: true }));
  const dom = game.actors.get(actor.flags?.["wodx-creation"]?.lineage?.domitor);
  if ( dom ) ghouls.unshift({ uuid: dom.uuid, role: "domitor", note: "", auto: true });
  const resolve = uuid => {
    const d = fromUuidSync(uuid);
    if ( !d ) return null;
    if ( d.documentName === "Actor" ) return { name: d.name, kind: d.type, xpSpent: XR.xpSpent([...d.items]) };
    return { name: d.name, kind: d.documentName === "Scene" ? "Place" : d.documentName === "JournalEntry" ? "Notes" : d.documentName };
  };
  return XR.tieRows(own, ghouls, resolve);
}

/** Add the extras to a freshly drawn sheet (jQuery or element). */
export async function decorate(sheet, html) {
  await loadGoods();
  const el = html[0] ?? html, actor = sheet.actor, editable = !!sheet.options.editable;
  if ( actor.limited ) return;
  const items = [...actor.items];
  // The strip, under the headline, on every tab
  const strip = XH.stripHtml(XR.strip(actor.system, { healthLabel: healthLabel(actor), conditions: conditionNames(actor) }));
  const head = el.querySelector(".sheet-body > .sheet-headline") ?? el.querySelector(".sheet-body");
  head?.insertAdjacentHTML(head.classList.contains("sheet-headline") ? "afterend" : "afterbegin", strip);
  // Possessions in place of the Gear tab
  const gear = el.querySelector(".tab.gear");
  if ( gear ) {
    const notes = gear.querySelector(".sheet-gearArea, .editor")?.outerHTML ?? "";
    const view = XR.possessions(items, { look, era: eraId(), year: yearNow() });
    const money = { coins: XR.moneyOf(items), inUse: XR.coinsAt(place(), yearNow()), carried: actor.system?.money?.carried ?? 0, bank: actor.system?.money?.bank ?? 0 };
    gear.innerHTML = XH.possessionsHtml(view, { money, editable, gearNotes: notes });
  }
  // The Ties tab, beside Gear in the full menu
  const gearTab = el.querySelector("nav.sheet-tabs[data-group='primary'] [data-tab='gear']");
  if ( gearTab && !el.querySelector(".tab.wodxties") ) {
    gearTab.insertAdjacentHTML("afterend", `<div id="tabwodxties" class="item wodx-tab-icon" data-tab="wodxties" data-tab-area="item" title="Ties"><i class="fa-solid fa-people-arrows"></i></div>`);
    el.querySelector(".tab.gear")?.insertAdjacentHTML("afterend", `<div class="tab wodxties sheet-inner-area" data-group="primary" data-tab="wodxties">${XH.tiesHtml(tieList(actor), { editable })}</div>`);
  }
  // The Storyteller's notes, for the Storyteller only
  if ( game.user.isGM ) el.querySelector(".tab.note")?.insertAdjacentHTML("afterbegin", XH.stNotesHtml(stNotesOf(actor)));
  // Search boxes on the long power lists
  el.querySelectorAll(".tab.discipline, .tab.gift, .tab.power, .tab.charms, .tab.lore, .tab.death, .tab.scarab, .tab.magic, .tab.numina, .tab.note").forEach(t => {
    const rows = t.querySelectorAll(".item-row-area");
    if ( rows.length < 4 || t.querySelector(":scope > .wodx-list-search") ) return;
    rows.forEach(r => r.setAttribute("data-search-item", ""));
    const key = [...t.classList].find(c => !["tab", "sheet-inner-area", "active"].includes(c));
    t.setAttribute("data-wodx-list", key);
    t.insertAdjacentHTML("afterbegin", `<div class="wodx-list-search">${XH.esc("")}<input type="search" class="wodx-search" data-search=".tab.${key}[data-wodx-list]" placeholder="Search" aria-label="Search this tab" autocomplete="off"></div>`);
  });
}

/* -------------------------------------------------------------- */
/*  Listeners                                                      */
/* -------------------------------------------------------------- */

export function listen(sheet, root) {
  const actor = sheet.actor, editable = !!sheet.options.editable;
  const itemOf = el => actor.items.get(el.closest("[data-wodx-item]")?.dataset.wodxItem);
  const poss = root.querySelector(".wodx-possessions");
  poss?.querySelector(".wodx-poss-filter")?.addEventListener("change", ev => {
    const v = ev.target.value;
    poss.querySelectorAll(".wodx-poss-group").forEach(g => { g.style.display = !v || v === "off-era" || g.dataset.group === v ? "" : "none"; });
    poss.querySelectorAll(".wodx-poss-row").forEach(r => { r.style.display = v === "off-era" && !r.classList.contains("off-era") ? "none" : ""; });
  });
  poss?.addEventListener("click", async ev => {
    const a = ev.target.closest(".wodx-act"); if ( !a ) return;
    ev.preventDefault(); ev.stopPropagation();
    const it = itemOf(a), act = a.dataset.act, F = it?.flags?.[MOD] ?? {};
    if ( act === "fold" ) { a.closest(".wodx-poss-row")?.nextElementSibling?.classList.toggle("wodx-folded"); return; }
    if ( act === "open" ) return it?.sheet?.render(true);
    if ( !editable ) return;
    switch ( act ) {
      case "new-item": return actor.createEmbeddedDocuments("Item", [{ name: "New thing", type: "Item" }]).then(([d]) => d?.sheet?.render(true));
      case "qty-plus": return it.update({ [`flags.${MOD}.qty`]: XR.qtyOf(it) + 1 });
      case "qty-minus": return XR.qtyOf(it) > 1 ? it.update({ [`flags.${MOD}.qty`]: XR.qtyOf(it) - 1 }) : null;
      case "take-out": return it.update({ [`flags.${MOD}.in`]: null });
      case "edit": return it.sheet.render(true);
      case "delete": return deleteWithContents(actor, it);
      case "split": return split(actor, it);
      case "container": return containerSettings(it);
      case "give": { const to = await pickRecipient(actor); if ( to ) viaGM({ op: "give", from: actor.id, item: it.id, to }, doGive); return; }
      case "leave": {
        const tok = actor.getActiveTokens?.()?.[0];
        if ( !tok ) return ui.notifications.warn("Put the character's token on the map first.");
        return viaGM({ op: "leave", from: actor.id, item: it.id, scene: tok.scene.id, x: tok.center.x, y: tok.center.y }, doLeave);
      }
      case "add-coins": return addCoins(actor);
    }
  });
  // Merge stacks: drop a thing on another of the same name; put in: drop on a container; take out: drop on a heading
  if ( poss && editable ) {
    poss.querySelectorAll("[data-wodx-item][draggable=true]").forEach(r => r.addEventListener("dragstart", ev => {
      ev.stopPropagation();
      const it = actor.items.get(r.dataset.wodxItem);
      ev.dataTransfer.setData("text/plain", JSON.stringify({ type: "Item", uuid: it.uuid, wodx: { actor: actor.id, id: it.id } }));
    }));
    const onDrop = async ev => {
      let data; try { data = JSON.parse(ev.dataTransfer.getData("text/plain")); } catch (e) { return; }
      if ( data?.wodx?.actor !== actor.id ) return; // from elsewhere: the sheet's own drop takes it
      ev.preventDefault(); ev.stopPropagation();
      const it = actor.items.get(data.wodx.id); if ( !it ) return;
      const onRow = ev.target.closest("[data-wodx-item]"), onIn = ev.target.closest("[data-in]");
      const target = onRow ? actor.items.get(onRow.dataset.wodxItem) : onIn ? actor.items.get(onIn.dataset.in) : null;
      if ( target && XR.canStack(it, target, [...actor.items]) ) {
        await target.update({ [`flags.${MOD}.qty`]: XR.qtyOf(target) + XR.qtyOf(it) });
        return it.delete();
      }
      const box = target && XR.isContainer(target) ? target : target ? actor.items.get(XR.parentOf(target)) ?? null : null;
      const ok = XR.canPut(it, box, [...actor.items], look(it).good);
      if ( !ok.ok ) return ui.notifications.warn(ok.why);
      return it.update({ [`flags.${MOD}.in`]: box?.id ?? null });
    };
    poss.addEventListener("dragover", ev => ev.preventDefault());
    poss.addEventListener("drop", onDrop, true);
  }
  // Ties
  const ties = root.querySelector(".wodx-ties");
  if ( ties ) {
    ties.addEventListener("click", async ev => {
      const a = ev.target.closest(".wodx-act"); if ( !a ) return;
      ev.preventDefault();
      const uuid = a.closest("[data-uuid]")?.dataset.uuid;
      if ( a.dataset.act === "tie-open" ) { const d = await fromUuid(uuid); return d?.sheet?.render(true); }
      if ( a.dataset.act === "tie-remove" && editable ) return setTies(actor, list => list.filter(t => t.uuid !== uuid));
    });
    ties.addEventListener("change", ev => {
      if ( !editable ) return;
      const uuid = ev.target.closest("[data-uuid]")?.dataset.uuid;
      if ( ev.target.matches(".wodx-tie-role-pick") ) return setTies(actor, list => list.map(t => t.uuid === uuid ? { ...t, role: ev.target.value } : t));
      if ( ev.target.matches(".wodx-tie-note") ) return setTies(actor, list => list.map(t => t.uuid === uuid ? { ...t, note: String(ev.target.value).slice(0, 200) } : t));
    });
    ties.addEventListener("dragover", ev => ev.preventDefault());
    ties.addEventListener("drop", ev => {
      let data; try { data = JSON.parse(ev.dataTransfer.getData("text/plain")); } catch (e) { return; }
      if ( !editable || !data?.uuid || !["Actor", "Scene", "JournalEntry"].includes(data.type) ) return;
      ev.preventDefault(); ev.stopPropagation();
      const role = data.type === "Scene" ? "haven" : "ally";
      return setTies(actor, list => list.some(t => t.uuid === data.uuid) ? list : [...list, { uuid: data.uuid, role, note: "" }]);
    }, true);
  }
  // The Storyteller's notes save when the box loses focus
  root.querySelector(".wodx-st-text")?.addEventListener("change", ev => { ev.stopPropagation(); saveStNotes(actor, ev.target.value); });
  // Search boxes and the notes box are not part of the sheet's form
  root.querySelectorAll(".wodx-search, .wodx-st-text, .wodx-poss-filter, .wodx-tie-role-pick, .wodx-tie-note").forEach(n => n.addEventListener("change", ev => ev.stopPropagation()));
}
const setTies = (actor, fn) => actor.setFlag(MOD, "ties", fn(foundry.utils.deepClone(actor.getFlag(MOD, "ties") ?? [])));

async function deleteWithContents(actor, it) {
  const inside = XR.contentsOf(it.id, [...actor.items]);
  if ( !inside.length ) return it.deleteDialog ? it.deleteDialog() : it.delete();
  const D = foundry.applications.api.DialogV2;
  const how = await D.wait({
    window: { title: `Remove ${it.name}` }, content: `<p>${XH.esc(it.name)} holds ${inside.length === 1 ? "one thing" : `${inside.length} things`}.</p>`,
    buttons: [{ action: "empty", label: "Take them out first", default: true }, { action: "all", label: "Remove them too" }, { action: "cancel", label: "Keep it" }], rejectClose: false
  });
  if ( how === "empty" ) {
    await actor.updateEmbeddedDocuments("Item", inside.filter(i => XR.parentOf(i) === it.id).map(i => ({ _id: i.id, [`flags.${MOD}.in`]: XR.parentOf(it) })));
    return it.delete();
  }
  if ( how === "all" ) return actor.deleteEmbeddedDocuments("Item", [it.id, ...inside.map(i => i.id)]);
}
async function split(actor, it) {
  const q = XR.qtyOf(it);
  const n = await foundry.applications.api.DialogV2.prompt({
    window: { title: `Split ${it.name}` }, content: `<label>How many to take off (1 to ${q - 1}) <input type="number" name="n" min="1" max="${q - 1}" value="${Math.floor(q / 2)}"></label>`,
    ok: { label: "Split", callback: (ev, b) => Number(b.form.elements.n.value) }, rejectClose: false
  });
  const k = Math.max(1, Math.min(q - 1, Math.floor(Number(n) || 0)));
  if ( !n ) return;
  const copy = it.toObject(); delete copy._id;
  foundry.utils.setProperty(copy, `flags.${MOD}.qty`, k);
  await it.update({ [`flags.${MOD}.qty`]: q - k });
  return actor.createEmbeddedDocuments("Item", [copy]);
}
async function containerSettings(it) {
  const r = await foundry.applications.api.DialogV2.prompt({
    window: { title: `${it.name}: container` }, content: XH.containerFormHtml(it, XR.holdsOf(it)),
    ok: { label: "Save", callback: (ev, b) => ({ on: b.form.elements.iscontainer.checked, holds: b.form.elements.holds.value }) }, rejectClose: false
  });
  if ( r ) return it.update({ "system.iscontainer": r.on, [`flags.${MOD}.holds`]: r.holds });
}
async function addCoins(actor) {
  // Coins of account were never struck, so nobody carries them
  const coins = XR.coinsAt(place(), yearNow()).filter(c => !/of account/.test(c));
  const boxes = actor.items.filter(XR.isContainer);
  const r = await foundry.applications.api.DialogV2.prompt({
    window: { title: "Add coins" },
    content: `<label>Coin <select name="denom" data-fixed>${coins.map(c => `<option>${XH.esc(c)}</option>`).join("")}</select></label>
      <label>How many <input type="number" name="n" min="1" value="10"></label>
      <label>Carried in <select name="box">${["<option value=''>Loose</option>", ...boxes.map(b => `<option value="${b.id}">${XH.esc(b.name)}</option>`)].join("")}</select></label>`,
    ok: { label: "Add", callback: (ev, b) => ({ denom: b.form.elements.denom.value, n: Math.max(1, Number(b.form.elements.n.value) || 1), box: b.form.elements.box.value || null }) }, rejectClose: false
  });
  if ( !r ) return;
  const name = r.denom;
  const have = actor.items.find(i => i.flags?.[MOD]?.coin?.denom === r.denom && (XR.parentOf(i) ?? null) === r.box);
  if ( have ) return have.update({ [`flags.${MOD}.qty`]: XR.qtyOf(have) + r.n });
  return actor.createEmbeddedDocuments("Item", [{ name: `${name} coins`, type: "Item", img: "icons/commodities/currency/coins-plain-stack-silver.webp",
    flags: { [MOD]: { coin: { denom: r.denom }, qty: r.n, in: r.box, conceal: "P" } } }]);
}

/** When a container comes over from another character's sheet, its contents come with it. */
export async function afterDrop(target, made, data) {
  if ( !data?.wodx?.actor || data.wodx.actor === target.id || !made ) return;
  const src = game.actors.get(data.wodx.actor);
  if ( !src ) return;
  const all = bundle(src, data.wodx.id);
  if ( all.length > 1 ) await makeOn(target, all, null, new Map([[data.wodx.id, made.id]]));
}

export function setup() {
  game.settings.register(MOD, "coinPlace", {
    name: "Coin of which land", hint: "The coins the sheet offers by year: the German lands, England or the United States.",
    scope: "world", config: true, type: String, default: "german", choices: Object.fromEntries(Object.entries(XR.CURRENCIES).map(([k, v]) => [k, v.label]))
  });
  installHistory();
  Hooks.once("ready", installSocket);
  // Header buttons on every WoDX sheet
  Hooks.on("getActorSheetHeaderButtons", (sheet, buttons) => {
    if ( !sheet.constructor?.name?.startsWith?.("Wodx") ) return;
    buttons.unshift({ label: "Print", class: "wodx-print", icon: "fa-solid fa-print", onclick: () => printSheet(sheet) });
    if ( sheet.actor.isOwner ) buttons.unshift({ label: "History", class: "wodx-history-btn", icon: "fa-solid fa-clock-rotate-left", onclick: () => openHistory(sheet.actor) });
  });
}
