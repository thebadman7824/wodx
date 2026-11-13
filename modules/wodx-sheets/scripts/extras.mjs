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
 *  - a Print button that prints the sheet as it looks;
 *  - (0.13.0) a "changed since last session" strip, each line with its cause, cleared when marked read;
 *  - (0.13.0) a features card: every line feature in force, when it fires and when it last fired.
 * The pure parts are extras-rules.mjs and extras-html.mjs.
 */
import * as XR from "./extras-rules.mjs";
import * as XH from "./extras-html.mjs";
import { bodyHtml } from "./body-html.mjs";
import * as Doll from "./doll-draw.mjs";

const MOD = XR.MOD, LIB = "wodx-library";
const SOCKET = `module.${MOD}`;
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const chron = () => game.modules.get("wodx-chronicle")?.api;
const eraId = () => { try { return chron()?.eras?.activeEra?.()?.profile?.id ?? null; } catch (e) { return null; } };
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || Number(game.time?.components?.year) || 0; } catch (e) { return 0; } };
const place = () => { try { return game.settings.get(MOD, "coinPlace") || "german"; } catch (e) { return "german"; } };
/**
 * Coins of the time (0.15.2, B2653): with "The chronicle's money" chosen, the names come from WoDX Storyteller's
 * money of the place, which covers every world region, on a scene abroad the money of the land it stands in.
 * Otherwise, or without WoDX Storyteller, the sheet's own list for the German lands, England or the United States.
 */
export function coinsNow(scene = globalThis.canvas?.scene ?? null) {
  const y = yearNow(), p = place();
  if ( p === XR.CHRONICLE_COINS ) {
    try {
      const st = game.modules.get("wodx-storyteller"), R = st?.active ? st.api?.upkeep?.money?.rules : null;
      if ( R?.moneyFor ) {
        const w = chron()?.world;
        const here = scene && w?.isAbroad?.(scene) ? w.here(scene)?.money : null;
        const region = (here && R.MONIES?.[here]) ? here : (game.settings.get("wodx-storyteller", "moneyRegion") || "moravian");
        const names = XR.coinsFromMoney(R.moneyFor(y, region));
        if ( names ) return names;
      }
    } catch (e) { /* fall back to the sheet's own list */ }
    return XR.coinsAt("german", y);
  }
  return XR.coinsAt(p, y);
}

/* -------------------------------------------------------------- */
/*  Gear and goods lookups (WoDX Library's lists, when on disk)    */
/* -------------------------------------------------------------- */

let GOODS = null, GOODS_ERAS = null, USES = null;
export async function loadGoods() {
  if ( GOODS ) return;
  try {
    const g = await import("../../wodx-library/data/goods.mjs");
    GOODS = new Map();
    for ( const x of g.GOODS ?? [] ) for ( const n of [x.was, x.former, x.name] ) if ( n ) GOODS.set(n.toLowerCase(), x);
    GOODS_ERAS = g.ERAS ?? null;
    try { USES = (await import("../../wodx-library/scripts/use-rules.mjs")).abilitiesOf; } catch (e) { USES = null; }
  } catch (e) { GOODS = new Map(); }
}
/** What the lists say of an item: its eras (or years), its goods entry and its value. */
export function look(item) {
  const lib = item.flags?.[LIB] ?? {}, own = item.flags?.[MOD] ?? {};
  const good = GOODS?.get(item.name.toLowerCase()) ?? null;
  const firstYear = own.firstYear ?? lib.firstYear ?? good?.firstYear, lastYear = own.lastYear ?? lib.lastYear ?? good?.lastYear;
  const eras = own.eras ?? lib.eras ?? good?.tags?.era ?? good?.eras ?? null;
  const eraInfo = eras || Number.isFinite(firstYear) || Number.isFinite(lastYear) ? { eras: eras ?? [], firstYear, lastYear, order: GOODS_ERAS } : null;
  const usable = !!((good && USES?.(good)?.length) || lib.pages?.length);
  return { eraInfo, good, value: own.value ?? good?.tags?.value ?? null, usable };
}

/* -------------------------------------------------------------- */
/*  Storyteller's notes: one GM-only journal entry, a page each    */
/* -------------------------------------------------------------- */

const NOTES_NAME = "WoDX: Storyteller's notes on characters";
function notesEntry() { return game.journal?.find(j => j.getFlag?.(MOD, "stNotes")) ?? null; }
export function stNotesOf(actor) {
  const j = notesEntry(); if ( !j ) return "";
  const p = j.pages.find(pg => pg.getFlag?.(MOD, "actor") === actor.id);
  return p ? String(p.text?.content ?? "").replace(/<\/?p>/g, "").replace(/<br\s*\/?>/g, "\n") : "";
}
export async function saveStNotes(actor, text) {
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
export async function undo(actor, i) {
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

export async function doGive({ from, item, to }) {
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
export async function doLeave({ from, item, scene, x, y }) {
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
  // The lineage keeps the domitor as {id, name} (0.11.0 fix: it was compared as a bare id, so these never showed)
  const domId = l => (typeof l?.domitor === "object" ? l.domitor?.id : l?.domitor) ?? null;
  const ghouls = game.actors.filter(x => domId(x.flags?.["wodx-creation"]?.lineage) === actor.id).map(x => ({ uuid: x.uuid, role: "ghoul", note: "", auto: true }));
  const dom = game.actors.get(domId(actor.flags?.["wodx-creation"]?.lineage));
  if ( dom ) ghouls.unshift({ uuid: dom.uuid, role: "domitor", note: "", auto: true });
  const resolve = uuid => {
    const d = fromUuidSync(uuid);
    if ( !d ) return null;
    if ( d.documentName === "Actor" ) return { name: d.name, kind: d.type, xpSpent: XR.xpSpent([...d.items]) };
    return { name: d.name, kind: d.documentName === "Scene" ? "Place" : d.documentName === "JournalEntry" ? "Notes" : d.documentName };
  };
  return XR.tieRows(own, ghouls, resolve);
}

/**
 * 0.11.0 (B1900): the Relationships tab's rows and extras, from WoDX NPC's ties (every link WoDX keeps, from both
 * ends, with secrets and the Storyteller's hidden ties left out for players). Null when WoDX NPC is off.
 */
const npcApi = () => (game.modules.get("wodx-npc")?.active ? game.modules.get("wodx-npc").api : null);
function relationsOf(actor, editable) {
  const api = npcApi();
  if ( !api?.ties?.of ) return null;
  const TR = api.ties.rules;
  const rows = api.ties.of(actor).map(e => {
    const d = e.uuid ? fromUuidSync(e.uuid) : null;
    const isActor = d?.documentName === "Actor";
    return { ...e, name: d?.name ?? e.to?.name ?? "(gone)", gone: !!e.uuid && !d, kindText: isActor ? d.type : d ? (d.documentName === "Scene" ? "Place" : d.documentName === "JournalEntry" ? "Notes" : d.documentName) : "",
      xpSpent: isActor && e.hand ? XR.xpSpent([...d.items]) : null };
  });
  const gm = !!game.user.isGM, owner = gm || actor.isOwner;
  const known = owner ? (api.secrets?.knownBy?.(actor) ?? []).filter(k => k.mine).map(k => ({ holder: k.holder.name, text: k.secret.text || TR.KINDS.other.label })) : [];
  const own = owner ? (api.secrets?.of?.(actor) ?? []).map(s => ({ text: s.text || api.secrets.rules.SECRET_KINDS[s.kind]?.label || "" })).filter(s => s.text) : [];
  let regard = "";
  try { regard = gm && !actor.hasPlayerOwner ? api.opinion?.regardHtml?.(actor) ?? "" : ""; } catch (e) { regard = ""; }
  let family = [];
  try { family = owner ? api.family?.lines?.(actor) ?? [] : []; } catch (e) { family = []; }
  return XH.relationsHtml(rows, { editable, gm, roles: TR.HAND_ROLES.map(k => [k, TR.KINDS[k]?.label ?? k]), known, own, regard, family, couples: !!api.family?.conceive, tree: !!api.openTree, followers: !!api.openFollowers && (gm || actor.hasPlayerOwner) });
}


/* -------------------------------------------------------------- */
/*  Changed since last session (0.13.0)                            */
/* -------------------------------------------------------------- */

const readJson = v => { if ( !v ) return null; if ( typeof v === "object" ) return v; try { return JSON.parse(v); } catch (e) { return null; } };
const snapOf = actor => readJson(actor.getFlag(MOD, "snap"));
const sinceOf = actor => readJson(actor.getFlag(MOD, "since")) ?? {};
const tracked = actor => !!actor && actor.documentName === "Actor" && !!actor.hasPlayerOwner;

/** The factions a character belongs to, in words (WoDX NPC's factions and their politics). */
function standingOf(actor) {
  const api = npcApi(), out = {};
  let st = null;
  try { st = api?.factions?.state?.(); } catch (e) { st = null; }
  if ( !st?.factions ) return out;
  const PO = api.politics?.rules, yr = yearNow();
  for ( const f of st.factions ) {
    const leader = f.leader === actor.id, member = (f.members ?? []).includes(actor.id);
    if ( !leader && !member ) continue;
    const parts = [leader ? "leader" : "member"];
    try {
      const pk = PO?.polityFor?.(f, yr);
      if ( pk && f.politics ) {
        const r = PO.rankOf(f, actor.id, {}, pk);
        if ( r ) parts.push(`rank ${r}`);
        for ( const o of PO.officesOf(f, actor.id) ) parts.push(PO.officeTitle(pk, o, f));
      }
    } catch (e) { /* no politics here */ }
    out[f.id] = `${f.name}: ${parts.join(", ")}`;
  }
  return out;
}
/** The hand ties and the domitor, by uuid; ties the Storyteller hides never enter, so players see nothing new. */
function tiesNow(actor) {
  const out = {};
  for ( const t of actor.getFlag(MOD, "ties") ?? [] ) if ( t?.uuid ) out[t.uuid] = fromUuidSync(t.uuid)?.name ?? t.name ?? "(gone)";
  const l = actor.flags?.["wodx-creation"]?.lineage, dom = typeof l?.domitor === "object" ? l.domitor?.id : l?.domitor;
  const d = dom ? game.actors.get(dom) : null;
  if ( d ) out[d.uuid] = `${d.name} (domitor)`;
  return out;
}
export function snapNow(actor) {
  const sys = actor.system ?? {};
  const label = (kind, k) => { const l = sys[kind]?.[k]?.label; return l ? game.i18n.localize(l) : XR.niceKey(k); };
  return XR.snapshotOf(sys, [...actor.items], { ties: tiesNow(actor), standing: standingOf(actor), year: yearNow(), at: Date.now(), label });
}
/** A fresh starting point: the strip empties until something moves again. */
export async function takeSnapshot(actor) {
  if ( !actor || !(game.user.isGM || actor.isOwner) ) return;
  await actor.update({ [`flags.${MOD}.snap`]: JSON.stringify(snapNow(actor)), [`flags.${MOD}.since`]: "{}" }, { wodxQuiet: true });
}
/** The strip's lines for a character, with causes. */
export function changesOf(actor) {
  return XR.withCauses(XR.changesSince(snapOf(actor), snapNow(actor)), sinceOf(actor));
}

/** The cause a change carries from the client that made it: a time skip, a chat card just pressed, or Undo. */
let CARD = null;
const CARD_MS = 4000;
function currentCause(options = {}) {
  if ( options.wodxUndo ) return "Undo";
  let skip = null;
  try { skip = game.settings.get("wodx-chronicle", "skipping"); } catch (e) { skip = null; }
  if ( skip ) return `the time skip${skip.label ? `: ${skip.label}` : ""}`;
  if ( CARD && Date.now() - CARD.at < CARD_MS ) return `a card: ${CARD.title}`;
  return "";
}
const pending = new Map();
/** Add a cause on the Storyteller's client, a moment later, so a burst of changes is one save. */
function noteCause(actor, cats, cause) {
  if ( !cats.length || !cause ) return;
  const p = pending.get(actor.id) ?? { cats: [], causes: [] };
  p.causes.push([cats, cause]);
  pending.set(actor.id, p);
  clearTimeout(p.timer);
  p.timer = setTimeout(async () => {
    pending.delete(actor.id);
    let since = sinceOf(actor), changed = false;
    for ( const [c, why] of p.causes ) { const n = XR.addCause(since, c, why); if ( n ) { since = n; changed = true; } }
    if ( changed && snapOf(actor) ) await actor.update({ [`flags.${MOD}.since`]: JSON.stringify(since) }, { wodxQuiet: true }).catch(e => console.warn("WoDX Sheets | changes", e));
  }, 600);
}
const causeFor = (options, userId) => options?.wodxCause || (game.users.get(userId)?.isGM ? "the Storyteller" : `${game.users.get(userId)?.name ?? "a player"}, by hand`);
function installChanges() {
  // Every client: a card pressed here names itself as the cause of what follows
  document.addEventListener("click", ev => {
    const b = ev.target.closest?.(".chat-message button, .chat-message [data-action]");
    if ( !b ) return;
    const m = b.closest(".chat-message");
    const title = (m?.querySelector(".message-content h3, .message-content h2, .flavor-text")?.textContent ?? "").trim().slice(0, 60);
    CARD = { title: title || "a chat card", at: Date.now() };
  }, true);
  const tag = (doc, options) => { if ( !options.wodxCause ) { const c = currentCause(options); if ( c ) options.wodxCause = c; } };
  Hooks.on("preUpdateActor", (a, ch, options) => tag(a, options));
  for ( const h of ["preUpdateItem", "preCreateItem", "preDeleteItem"] ) Hooks.on(h, (it, a1, a2) => tag(it, (h === "preDeleteItem" ? a1 : a2) ?? {}));
  // The active Storyteller's client keeps the causes
  Hooks.on("updateActor", (actor, changes, options, userId) => {
    if ( !isActiveGM() || options.wodxQuiet || !tracked(actor) ) return;
    noteCause(actor, XR.catsOf(XR.loudKeys(changes)), causeFor(options, userId));
  });
  const onItem = (item, options, userId, changes = {}) => {
    const a = item.parent;
    if ( !isActiveGM() || options?.wodxQuiet || !tracked(a) ) return;
    noteCause(a, XR.catsOf(XR.loudKeys(changes), item.type), causeFor(options, userId));
  };
  Hooks.on("updateItem", (item, changes, options, userId) => onItem(item, options, userId, changes));
  Hooks.on("createItem", (item, options, userId) => onItem(item, options, userId));
  Hooks.on("deleteItem", (item, options, userId) => onItem(item, options, userId));
  // A time skip is one cause for the year line, however far it goes
  Hooks.on("wodxSkipEnd", info => {
    if ( !isActiveGM() ) return;
    for ( const a of game.actors.filter(tracked) ) noteCause(a, ["time"], `the time skip${info?.label ? `: ${info.label}` : ""}`);
  });
  // The end of a session (WoDX Storyteller) is the new starting point; a character with none gets one now
  Hooks.on("wodxSessionEnded", async () => {
    if ( !isActiveGM() ) return;
    for ( const a of game.actors.filter(tracked) ) await takeSnapshot(a).catch(e => console.warn("WoDX Sheets | changes", e));
  });
  Hooks.once("ready", async () => {
    if ( !isActiveGM() ) return;
    for ( const a of game.actors.filter(x => tracked(x) && !snapOf(x)) ) await takeSnapshot(a).catch(e => console.warn("WoDX Sheets | changes", e));
  });
}

/* -------------------------------------------------------------- */
/*  The features card (0.13.0)                                     */
/* -------------------------------------------------------------- */

const FEATS_OPEN = new Set();
function featuresOf(actor) {
  try { return chron()?.signatures?.summary?.(actor) ?? []; } catch (e) { console.warn("WoDX Sheets | features", e); return []; }
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
  // 0.13.0: what changed since last session, then the features card, under the strip, for the owner and the Storyteller
  if ( game.user.isGM || actor.isOwner ) {
    let more = "";
    try {
      const snap = snapOf(actor);
      if ( snap ) more += XH.changesHtml(changesOf(actor), { canClear: true, since: snap.at ? `since ${new Date(snap.at).toLocaleDateString()}` : "" });
    } catch (e) { console.warn("WoDX Sheets | changes", e); }
    more += XH.featuresHtml(featuresOf(actor), { gm: !!game.user.isGM, open: FEATS_OPEN.has(actor.id) });
    if ( more ) el.querySelector(".wodx-strip")?.insertAdjacentHTML("afterend", more);
  }
  // Possessions in place of the Gear tab
  const gear = el.querySelector(".tab.gear");
  if ( gear ) {
    const notes = gear.querySelector(".sheet-gearArea, .editor")?.outerHTML ?? "";
    const view = XR.possessions(items, { look, era: eraId(), year: yearNow() });
    const money = { coins: XR.moneyOf(items), inUse: coinsNow(), carried: actor.system?.money?.carried ?? 0, bank: actor.system?.money?.bank ?? 0 };
    // The purse in one line (B2830), in the coin of the place and year when WoDX Storyteller keeps the purse
    try {
      const pu = game.modules.get("wodx-storyteller")?.active ? game.modules.get("wodx-storyteller").api?.upkeep?.money?.purse?.(actor) : null;
      if ( pu?.text?.carried ) { money.full = pu.text.carried; money.line = XR.purseLine(pu.text.carried); }
    } catch (e) { /* the plain numbers stay */ }
    money.folded = !!game.modules.get("wodx-chronicle")?.api?.playerView && game.modules.get("wodx-chronicle").api.playerView.current?.() === "beginner";
    gear.innerHTML = XH.possessionsHtml(view, { money, editable, gearNotes: notes });
  }
  // The Ties tab, beside Gear in the full menu
  const gearTab = el.querySelector("nav.sheet-tabs[data-group='primary'] [data-tab='gear']");
  if ( gearTab && !el.querySelector(".tab.wodxties") ) {
    gearTab.insertAdjacentHTML("afterend", `<div id="tabwodxties" class="item wodx-tab-icon" data-tab="wodxties" data-tab-area="item" title="Relationships"><i class="fa-solid fa-people-arrows"></i></div>`);
    let inner = null;
    try { inner = relationsOf(actor, editable); } catch (e) { console.warn("WoDX Sheets | relationships", e); inner = null; }
    el.querySelector(".tab.gear")?.insertAdjacentHTML("afterend", `<div class="tab wodxties sheet-inner-area" data-group="primary" data-tab="wodxties">${inner ?? XH.tiesHtml(tieList(actor), { editable })}</div>`);
  }
  // The Body tab (0.10.0): the body plan from WoDX Combat, after Ties
  const cb = game.wodxCombat?.body;
  const tiesTab = el.querySelector("nav.sheet-tabs[data-group='primary'] [data-tab='wodxties']");
  if ( cb && tiesTab && !el.querySelector(".tab.wodxbody") ) {
    let inner = "";
    try { inner = bodyTabHtml(actor, cb); } catch (e) { console.warn("WoDX Sheets | body", e); inner = bodyHtml(null); }
    tiesTab.insertAdjacentHTML("afterend", `<div id="tabwodxbody" class="item wodx-tab-icon" data-tab="wodxbody" data-tab-area="item" title="Body"><i class="fa-solid fa-person"></i></div>`);
    el.querySelector(".tab.wodxties")?.insertAdjacentHTML("afterend", `<div class="tab wodxbody sheet-inner-area" data-group="primary" data-tab="wodxbody">${inner}</div>`);
  }
  // WoDX tab buttons take the tile and glyph colours of the line's own tab buttons beside them
  const tileOf = el.querySelector("nav.sheet-tabs[data-group='primary'] .item:not(.wodx-tab-icon) svg");
  if ( tileOf ) {
    const fills = [...tileOf.querySelectorAll("path[fill]")].map(p => p.getAttribute("fill"));
    for ( const t of el.querySelectorAll("nav.sheet-tabs .wodx-tab-icon") ) {
      if ( fills[0] ) t.style.setProperty("--wodx-tab-tile", fills[0]);
      if ( fills[1] ) t.style.setProperty("--wodx-tab-glyph", fills[1]);
    }
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

/** The Body tab's content for one actor. */
export function bodyTabHtml(actor, cb) {
  const body = cb.of(actor), R = cb.rules;
  const held = {}, weapons = [...actor.items].filter(i => ["Melee Weapon", "Ranged Weapon"].includes(i.type) && i.system?.isequipped && !i.system?.isnatural);
  const hands = (body.parts ?? []).filter(p => p.type === "hand").map(p => p.id);
  weapons.forEach((w, n) => { if ( hands[n] ) held[hands[n]] = w.name; });
  const changes = (actor.flags?.["wodx-storyteller"]?.body ?? []).filter(c => c && (game.user.isGM || c.shows !== false));
  return bodyHtml(body, {held, changes, gm: game.user.isGM, shapeFlag: actor.flags?.["wodx-combat"]?.shape ?? "", doll: dollOf(actor, cb, body),
    shapes: Object.fromEntries(Object.entries(R.SHAPES).map(([k, v]) => [k, v.label])),
    hitTable: game.settings.get("wodx-combat", "hitLocations") ? R.hitTable(body) : [], outline: R.outline(body)});
}

/** The damage doll's data (0.16.0, B2690): the drawing spec and the wounds in words. */
function dollOf(actor, cb, body) {
  const R = cb.rules, wounds = cb.wounds?.(actor) ?? {};
  const fakes = (actor.flags?.["wodx-storyteller"]?.body ?? []).filter(c => c?.feature === "prosthetic" && c.lostPart).map(c => c.lostPart);
  const spec = Doll.specOf(body, {plan: R.SHAPES[body.shape]?.plan ?? "person", wounds, fakes, year: yearNow()});
  if ( !spec ) return null;
  const all = R.flatten(R.PLANS[R.SHAPES[body.shape]?.plan]?.() ?? null);
  const label = id => R.partLabel(body.parts.find(p => p.id === id) ?? all.find(p => p.id === id) ?? {type: id});
  spec.labels = Object.fromEntries([...spec.parts, ...spec.lost].map(id => [id, label(id)]));
  const KIND = {b: "bashing", l: "lethal", a: "aggravated"};
  const list = Object.entries(wounds).map(([id, w]) => ({label: label(id), text: ["a", "l", "b"].filter(k => w[k]).map(k => `${w[k]} ${KIND[k]}`).join(", ")}));
  return {spec, wounds: list, gm: game.user.isGM};
}

/** Draw the doll on its canvas, name parts under the pointer, and let the Storyteller place or clear wounds. */
function wireDoll(actor, root) {
  const cv = root.querySelector("canvas.wodx-doll");
  if ( !cv || cv.dataset.drawn ) return;
  cv.dataset.drawn = "1";
  let spec = null, res = null;
  try { spec = JSON.parse(cv.dataset.spec); res = Doll.draw(spec); cv.getContext("2d").putImageData(new ImageData(res.data, res.w, res.h), 0, 0); }
  catch (e) { console.warn("WoDX Sheets | doll", e); return; }
  const tip = root.querySelector(".wodx-doll-tip"), base = tip?.textContent ?? "";
  const at = ev => { const r = cv.getBoundingClientRect(), cs = getComputedStyle(cv), pad = parseFloat(cs.paddingLeft) || 0;
    const x = Math.floor((ev.clientX - r.left - pad) / (r.width - 2 * pad) * Doll.W), y = Math.floor((ev.clientY - r.top - pad) / (r.height - 2 * pad) * Doll.H);
    return x >= 0 && y >= 0 && x < Doll.W && y < Doll.H ? res.at(x, y) : null; };
  const name = id => id === "lost" ? `Lost: ${spec.lost.map(p => spec.labels?.[p] ?? p).join(", ").toLowerCase()}` : (spec.labels?.[id] ?? id) + (spec.fakes?.[id] ? " (false limb)" : "");
  cv.addEventListener("pointermove", ev => { const id = at(ev); if ( tip ) tip.textContent = id ? name(id) : base; });
  cv.addEventListener("pointerleave", () => { if ( tip ) tip.textContent = base; });
  if ( !game.user.isGM ) return;
  cv.addEventListener("click", async ev => {
    const id = at(ev), B = game.wodxCombat?.body;
    if ( !id || id === "lost" || !B?.placeWound ) return;
    const pick = await foundry.applications.api.DialogV2.wait({rejectClose: false, window: {title: `${actor.name}: ${name(id)}`}, classes: ["wodx-dialog"],
      content: `<p>Place one level already on the health track on this part, or clear the part. The health track itself does not change.</p>`,
      buttons: [{action: "bashing", label: "Bashing here"}, {action: "lethal", label: "Lethal here"}, {action: "aggravated", label: "Aggravated here"}, {action: "clear", label: "Clear this part"}, {action: "cancel", label: "Cancel", default: true}]});
    if ( !pick || pick === "cancel" ) return;
    if ( pick === "clear" ) await B.clearWound(actor, id); else await B.placeWound(actor, id, pick);
  });
}

/* -------------------------------------------------------------- */
/*  Listeners                                                      */
/* -------------------------------------------------------------- */

export function listen(sheet, root) {
  const actor = sheet.actor, editable = !!sheet.options.editable;
  // 0.13.0: mark the changes read; keep the features card open across redraws; the Storyteller sets a feature aside
  root.querySelector(".wodx-chg-read")?.addEventListener("click", ev => { ev.preventDefault(); takeSnapshot(actor).catch(e => console.warn("WoDX Sheets | changes", e)); });
  const feats = root.querySelector(".wodx-features");
  feats?.addEventListener("toggle", () => { if ( feats.open ) FEATS_OPEN.add(actor.id); else FEATS_OPEN.delete(actor.id); });
  feats?.addEventListener("change", ev => {
    const t = ev.target.closest(".wodx-feat-toggle");
    if ( !t || !game.user.isGM ) return;
    ev.stopPropagation();
    chron()?.signatures?.setOff?.(actor, t.dataset.feat, !t.checked);
  });
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
    if ( act === "fold" ) { const row = a.closest(".wodx-poss-row"); row?.parentElement?.querySelector(`:scope > .wodx-poss-contents[data-in="${row.dataset.wodxItem}"]`)?.classList.toggle("wodx-folded"); return; }
    if ( act === "desc" ) { const row = a.closest(".wodx-poss-row"), d = row?.parentElement?.querySelector(`:scope > .wodx-poss-desc[data-desc-of="${row.dataset.wodxItem}"]`); if ( d ) { d.hidden = !d.hidden; a.setAttribute("aria-expanded", String(!d.hidden)); } return; }
    if ( act === "open" ) return it?.sheet?.render(true);
    if ( !editable ) return;
    switch ( act ) {
      case "new-item": return actor.createEmbeddedDocuments("Item", [{ name: "New thing", type: "Item" }]).then(([d]) => d?.sheet?.render(true));
      case "qty-plus": return it.update({ [`flags.${MOD}.qty`]: XR.qtyOf(it) + 1 });
      case "qty-minus": return XR.qtyOf(it) > 1 ? it.update({ [`flags.${MOD}.qty`]: XR.qtyOf(it) - 1 }) : null;
      case "take-out": return it.update({ [`flags.${MOD}.in`]: null });
      case "use": return game.modules.get("wodx-library")?.api?.use?.open?.(it, actor);
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
  // Body tab: the Storyteller sets the shape or adds a lasting change
  const bodyEl = root.querySelector(".wodx-body");
  if ( bodyEl ) wireDoll(actor, bodyEl);
  if ( bodyEl && game.user.isGM ) {
    bodyEl.querySelector(".wodx-body-shape")?.addEventListener("change", ev => game.wodxCombat?.body?.setShape(actor, ev.target.value || null));
    bodyEl.querySelector(".wodx-body-add")?.addEventListener("click", () => {
      const api = game.modules.get("wodx-storyteller")?.active ? game.modules.get("wodx-storyteller").api?.body : null;
      if ( api?.newDialog ) api.newDialog(actor); else ui.notifications.warn("Lasting changes need WoDX Storyteller on.");
    });
  }
  // Ties
  const ties = root.querySelector(".wodx-ties");
  if ( ties ) {
    ties.addEventListener("click", async ev => {
      const a = ev.target.closest(".wodx-act"); if ( !a ) return;
      ev.preventDefault();
      const uuid = a.closest("[data-uuid]")?.dataset.uuid;
      if ( a.dataset.act === "tie-open" ) { const d = await fromUuid(a.closest("[data-open-uuid]")?.dataset.openUuid || uuid); return d?.sheet?.render(true); }
      if ( a.dataset.act === "tie-remove" && editable ) return setTies(actor, list => list.filter(t => t.uuid !== uuid));
      if ( a.dataset.act === "tie-hide" && editable && game.user.isGM ) return setTies(actor, list => list.map(t => t.uuid === uuid ? { ...t, hidden: !t.hidden } : t));
      if ( a.dataset.act === "tie-tree" ) return npcApi()?.openTree?.(actor);
      if ( a.dataset.act === "tie-child" && editable ) {
        const other = await fromUuid(a.closest("[data-open-uuid]")?.dataset.openUuid || uuid);
        if ( other?.documentName !== "Actor" ) return;
        return game.user.isGM ? npcApi()?.family?.conceive?.(actor, other) : npcApi()?.family?.askChild?.(actor, other);
      }
      if ( a.dataset.act === "tie-followers" ) return npcApi()?.openFollowers?.(actor);
      if ( a.dataset.act === "tie-secrets" && game.user.isGM ) return npcApi()?.openSecrets?.(actor);
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
  const coins = coinsNow().filter(c => !/of account/.test(c));
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
    name: "Coin of which land", hint: "The coins the sheet offers by year: the German lands, England, the United States, or the chronicle's money, which follows WoDX Storyteller's money for every region of the world (on a scene abroad, that land's).",
    scope: "world", config: true, type: String, default: "german", choices: {...Object.fromEntries(Object.entries(XR.CURRENCIES).map(([k, v]) => [k, v.label])), [XR.CHRONICLE_COINS]: "The chronicle's money (every region, from WoDX Storyteller)"}
  });
  installHistory();
  installChanges();
  Hooks.once("ready", installSocket);
  // Header buttons on every WoDX sheet
  Hooks.on("getActorSheetHeaderButtons", (sheet, buttons) => {
    if ( !sheet.constructor?.name?.startsWith?.("Wodx") ) return;
    buttons.unshift({ label: "Print", class: "wodx-print", icon: "fa-solid fa-print", onclick: () => printSheet(sheet) });
    if ( sheet.actor.isOwner ) buttons.unshift({ label: "History", class: "wodx-history-btn", icon: "fa-solid fa-clock-rotate-left", onclick: () => openHistory(sheet.actor) });
  });
}
