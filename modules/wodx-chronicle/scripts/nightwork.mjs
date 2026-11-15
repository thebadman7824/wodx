/**
 * The night's work (B6220-B6229): everything the Storyteller's Hand did, listed, and taken back in one Undo.
 *
 * Ben picked hd1 on the Improvement Desk (15 November 2026): now that approved things happen by themselves in many
 * systems, one bad approval can spread, and each card's own Undo is slow after a long night. So every piece of the
 * Hand's work is written down as it happens, on the Storyteller's client:
 *   an approval carried out   decide() runs the kind's approve inside record() (approved on its own or by the Storyteller)
 *   time passing              what the clock sets going in the seconds after the world's time moves
 *   the Lone Chronicle seat   a button or window choice the seat makes for the absent Storyteller (WoDX Solo)
 *   any module                api.nightwork.record(label, fn) or begin(label) around work of its own
 * While a piece of work is open, each document change this client makes (actors, items, tokens, tiles, lights, walls,
 * scenes, journals, fights and world settings) is kept with its old and new values, and each card it posts is noted.
 * The work closes once it has been quiet for a moment.
 *
 * The Night's work window (in the Storyteller's hand, and in the lone player's Storyteller tools) lists it newest first
 * since a chosen time, with a tick box on each. Undo takes back every ticked change, newest first: tokens it placed leave
 * the map, what it removed comes back, sheets and settings return to their old values, and its cards lose their buttons.
 * A field someone changed since (a player, the Storyteller, or later work of the Hand not being taken back) is shown with
 * a warning and kept as it is now unless the Storyteller says otherwise.
 *
 *   setting wodx-chronicle.nightWork  {v, entries: [{id, at, worldTime, label, kind, source, approvalId, ops, undone}]}
 */
import {MODULE_ID, esc, setting, setSetting} from "./util.mjs";
import {searchBox} from "./search.mjs";
import * as R from "./nightwork-rules.mjs";
import {currentYear} from "./eras.mjs";

const QUIET = {hand: 800, approved: 800, auto: 800, seat: 2500, clock: 4000};
const MAX = {hand: 30000, approved: 30000, auto: 30000, seat: 30000, clock: 90000};
const STALE = 60000;
const MOVE = /^(x|y|elevation|rotation|sort|level|movementAction|_movement\w*|_movementHistory)(\.|$)/;

let approvals = null;       // handed in at start: {history, undoById, markTakenBack}
const open = [];            // the pieces of work going on now
let undoing = 0;
const pending = {upd: new Map(), make: new Map(), del: new Map()};
const touched = new Map();  // uuid or Setting:key -> {userId, at}: changes made by other people's clients
let closed = [];
let writing = Promise.resolve();
let ticker = null;

export function registerNightSettings() {
  game.settings.register(MODULE_ID, "nightWork", {scope: "world", config: false, type: Object, default: {v: R.VERSION, entries: []},
    onChange: () => NightApp.refresh()});
}

/** The journal, with an approval taken back from its own card marked as taken back here too. */
function journalNow() {
  const j = journal();
  let gone = new Set();
  try { gone = new Set((approvals?.history?.() ?? []).filter(h => h.undone).map(h => h.id)); } catch (e) { /* no queue */ }
  for ( const e of j.entries ) if ( e.approvalId && gone.has(e.approvalId) && !e.undone ) { e.undone = true; e.byCard = true; }
  return j;
}

export const journal = () => { try { return R.normJournal(setting("nightWork")); } catch (e) { return R.normJournal(null); } };

/* ------------------------------------------------------------------ */
/*  Pieces of work                                                     */
/* ------------------------------------------------------------------ */

/** Start a piece of the Hand's work. It closes by itself once quiet (or call end with the id). */
export function begin(label, {kind = "hand", source = "", approvalId = null, handlerUndo = false, done = true} = {}) {
  if ( !game.user?.isGM || undoing ) return null;
  const now = Date.now();
  const w = {id: foundry.utils.randomID(), label: String(label ?? "The Hand").slice(0, 200), kind, source: String(source ?? "").slice(0, 100),
    approvalId, handlerUndo, opened: now, last: now, done, doneAt: now, ops: [], worldTime: game.time?.worldTime ?? 0,
    quiet: QUIET[kind] ?? 800, max: MAX[kind] ?? 30000};
  open.push(w);
  ticker ??= setInterval(tick, 250);
  return w.id;
}

export function end(id) {
  const w = open.find(x => x.id === id);
  if ( w ) { w.done = true; w.doneAt = Date.now(); }
}

/** Run fn as one piece of the Hand's work. Returns what fn returns. */
export async function record(label, fn, opts = {}) {
  const id = begin(label, {...opts, done: false});
  try { return await fn(); } finally { if ( id ) end(id); }
}

const current = () => { for ( let i = open.length - 1; i >= 0; i-- ) if ( !open[i].closed ) return open[i]; return null; };

function tick() {
  const now = Date.now();
  for ( const w of open ) {
    if ( w.closed ) continue;
    if ( (w.done && now - Math.max(w.last, w.doneAt) >= w.quiet) || now - w.opened >= w.max ) close(w);
  }
  for ( let i = open.length - 1; i >= 0; i-- ) if ( open[i].closed ) open.splice(i, 1);
  for ( const m of Object.values(pending) ) for ( const [k, list] of m ) { const keep = list.filter(p => now - p.t < STALE); if ( keep.length ) m.set(k, keep); else m.delete(k); }
  if ( !open.length && !Object.values(pending).some(m => m.size) ) { clearInterval(ticker); ticker = null; }
}

function close(w) {
  w.closed = true;
  const real = w.ops.filter(op => op.act !== "card");
  if ( !real.length && !(w.approvalId && w.handlerUndo) ) return;
  closed.push({id: w.id, at: w.opened, worldTime: w.worldTime, label: w.label, kind: w.kind, source: w.source, approvalId: w.approvalId,
    handlerUndo: !!w.handlerUndo, by: game.user.id, ops: w.ops});
  flush();
}

/** Write what closed into the journal, one change at a time so two writes never lose each other. */
function flush() {
  writing = writing.then(async () => {
    if ( !closed.length || !game.user.isGM ) return;
    const add = closed; closed = [];
    let j = journal();
    for ( const e of add ) j = R.addEntry(j, e);
    await setSetting("nightWork", j);
  }).catch(e => console.error(`${MODULE_ID} | night's work`, e));
  return writing;
}

/** Close everything open now and wait for the journal to be written. */
export async function settle() {
  for ( const w of [...open] ) if ( !w.closed ) close(w);
  open.length = 0;
  await flush();
}

/* ------------------------------------------------------------------ */
/*  Watching document changes                                          */
/* ------------------------------------------------------------------ */

const mine = userId => userId === game.user?.id;
const pushTo = (map, key, v) => { const l = map.get(key) ?? []; l.push(v); map.set(key, l); };
function takeFrom(map, key, match = () => true) {
  const l = map.get(key);
  if ( !l?.length ) return null;
  const i = l.findIndex(match);
  if ( i < 0 ) return null;
  const [v] = l.splice(i, 1);
  if ( !l.length ) map.delete(key);
  return v;
}
const nameOf = doc => String(doc?.name ?? doc?.title ?? doc?.text ?? doc?.label ?? doc?.key ?? doc?.documentName ?? "").slice(0, 80);
const parseValue = v => { if ( typeof v !== "string" ) return v; try { return JSON.parse(v); } catch (e) { return v; } };
const watchingMe = (userId, options) => mine(userId) && !undoing && !options?.wodxNightUndo && game.user.isGM;

function addOp(w, op) {
  if ( !w || w.closed ) return;
  w.ops.push({...op, by: game.user.id});
  w.last = Date.now();
}

function watch(type) {
  Hooks.on(`preUpdate${type}`, (doc, changes, options, userId) => {
    if ( !watchingMe(userId, options) ) return;
    const w = current();
    if ( !w ) return;
    if ( type === "Setting" ) {
      if ( doc.user || R.skipSetting(doc.key) ) return;
      return pushTo(pending.upd, `Setting:${doc.key}`, {w, t: Date.now(), before: parseValue(doc._source?.value)});
    }
    const paths = R.pathsOf(changes);
    if ( !paths.length ) return;
    // A token walked by hand in the seconds after the clock moved is the Storyteller's, not the Hand's
    if ( w.kind === "clock" && type === "Token" && paths.every(p => MOVE.test(p)) ) return;
    const {set, gone} = R.beforeOf(doc._source ?? {}, paths);
    pushTo(pending.upd, doc.uuid, {w, t: Date.now(), paths, set, gone});
  });
  Hooks.on(`update${type}`, (doc, changes, options, userId) => {
    const key = type === "Setting" ? `Setting:${doc.key}` : doc.uuid;
    if ( !mine(userId) ) { touched.set(key, {userId, at: Date.now()}); return; }
    if ( type === "Setting" ) {
      const p = takeFrom(pending.upd, key);
      const op = p && R.settingOp(doc.key, p.before, parseValue(doc._source?.value), p.t);
      if ( op ) addOp(p.w, {...op, name: doc.key});
      return;
    }
    const got = R.pathsOf(changes);
    const p = takeFrom(pending.upd, key, x => x.paths.some(q => got.includes(q))) ?? takeFrom(pending.upd, key);
    if ( !p ) return;
    addOp(p.w, {t: p.t, doc: type, uuid: doc.uuid, name: nameOf(doc), act: "update", set: p.set, gone: p.gone, after: R.afterOf(doc._source ?? {}, p.paths)});
  });
  Hooks.on(`preCreate${type}`, (doc, data, options, userId) => {
    if ( !watchingMe(userId, options) ) return;
    const w = current();
    if ( !w ) return;
    if ( type === "Setting" ) { if ( !data?.user && !R.skipSetting(doc.key ?? data?.key) ) pushTo(pending.upd, `Setting:${doc.key ?? data?.key}`, {w, t: Date.now(), before: undefined}); return; }
    pushTo(pending.make, `${type}|${doc.parent?.uuid ?? ""}`, {w, t: Date.now()});
  });
  Hooks.on(`create${type}`, (doc, options, userId) => {
    if ( !mine(userId) ) { touched.set(type === "Setting" ? `Setting:${doc.key}` : doc.uuid, {userId, at: Date.now()}); return; }
    if ( type === "Setting" ) {
      const p = takeFrom(pending.upd, `Setting:${doc.key}`);
      const op = p && R.settingOp(doc.key, undefined, parseValue(doc._source?.value), p.t);
      if ( op ) addOp(p.w, {...op, name: doc.key});
      return;
    }
    const p = takeFrom(pending.make, `${type}|${doc.parent?.uuid ?? ""}`);
    if ( p ) addOp(p.w, {t: p.t, doc: type, uuid: doc.uuid, name: nameOf(doc), act: "create"});
  });
  if ( type === "Setting" ) return;
  Hooks.on(`preDelete${type}`, (doc, options, userId) => {
    if ( !watchingMe(userId, options) ) return;
    const w = current();
    if ( !w ) return;
    pushTo(pending.del, doc.uuid, {w, t: Date.now(), data: doc.toObject(), parent: doc.parent?.uuid ?? null, embedded: doc.parent ? type : null, name: nameOf(doc)});
  });
  Hooks.on(`delete${type}`, (doc, options, userId) => {
    if ( !mine(userId) ) { touched.set(doc.uuid, {userId, at: Date.now()}); return; }
    const p = takeFrom(pending.del, doc.uuid);
    if ( p ) addOp(p.w, {t: p.t, doc: type, uuid: doc.uuid, name: p.name, act: "delete", parent: p.parent, embedded: p.embedded, data: p.data});
  });
}

/** Watch every kind of document, the cards the Hand posts, and the clock. Called at init. */
export function registerNightHooks() {
  for ( const t of R.DOC_TYPES ) watch(t);
  Hooks.on("createChatMessage", (msg, options, userId) => {
    if ( !watchingMe(userId, options) ) return;
    const w = current();
    if ( w ) addOp(w, {t: Date.now(), doc: "ChatMessage", uuid: msg.uuid, name: cardTitle(msg), act: "card"});
  });
  Hooks.on("updateWorldTime", () => {
    if ( !game.user?.isGM || game.users.activeGM?.id !== game.user.id || undoing ) return;
    const w = open.find(x => x.kind === "clock" && !x.closed);
    if ( w ) { w.last = Date.now(); w.label = clockLabel(); return; }
    begin(clockLabel(), {kind: "clock", source: "The clock"});
  });
  Hooks.on("renderChatMessageHTML", (msg, el) => {
    const html = el?.[0] ?? el;
    if ( !html || !msg.flags?.[MODULE_ID]?.nightUndo ) return;
    html.querySelector?.("[data-action=wodx-night-open]")?.addEventListener("click", () => NightApp.open());
  });
}

function clockLabel() {
  try { const y = currentYear(); return Number.isFinite(y) ? `Time passed in ${y}` : "Time passed"; } catch (e) { return "Time passed"; }
}
const cardTitle = msg => {
  const t = String(msg.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return t.slice(0, 70) || msg.speaker?.alias || "a card";
};

/* ------------------------------------------------------------------ */
/*  The world now, and taking work back                                */
/* ------------------------------------------------------------------ */

function settingNow(key) {
  const [ns, ...rest] = String(key).split(".");
  const k = rest.join(".");
  try { if ( game.settings.settings.has(key) ) return {registered: true, value: foundry.utils.deepClone(game.settings.get(ns, k))}; } catch (e) { /* read the stored one */ }
  const doc = game.settings.storage?.get?.("world")?.find?.(s => s.key === key);
  return {registered: false, doc, value: doc ? parseValue(doc._source?.value) : undefined};
}

function docNow(uuid) {
  try { return fromUuidSync(uuid) ?? null; } catch (e) { return null; }
}

/** The world now for one op, as the rules read it. */
export function look(op) {
  if ( op.act === "setting" ) {
    const s = settingNow(op.key), tr = touched.get(`Setting:${op.key}`);
    return {exists: s.value !== undefined, value: s.value, lastBy: tr?.userId ?? null, lastAt: tr?.at ?? 0};
  }
  const doc = docNow(op.uuid);
  if ( !doc ) return {exists: false};
  const tr = touched.get(op.uuid);
  return {exists: true, source: doc._source ?? {}, lastBy: tr?.userId ?? doc._stats?.lastModifiedBy ?? null, lastAt: tr?.at ?? doc._stats?.modifiedTime ?? 0};
}

const OPTS = () => ({wodxNightUndo: true});

async function applyStep(op, a) {
  if ( a.action !== "revert" ) return false;
  if ( op.act === "update" ) {
    const doc = docNow(op.uuid);
    const changes = R.revertUpdate(op, {skip: a.skip});
    if ( !doc || !Object.keys(changes).length ) return false;
    await doc.update(changes, OPTS());
    return true;
  }
  if ( op.act === "create" ) {
    const doc = docNow(op.uuid);
    if ( !doc ) return false;
    await doc.delete(OPTS());
    return true;
  }
  if ( op.act === "delete" ) {
    const data = foundry.utils.deepClone(op.data);
    if ( op.parent ) {
      const parent = docNow(op.parent);
      if ( !parent ) return false;
      await parent.createEmbeddedDocuments(op.embedded, [data], {...OPTS(), keepId: true});
    } else {
      const cls = getDocumentClass(op.doc);
      await cls.create(data, {...OPTS(), keepId: true});
    }
    return true;
  }
  if ( op.act === "setting" ) {
    const s = settingNow(op.key);
    const r = R.revertSetting(op, s.value, {skip: a.skip});
    const [ns, ...rest] = op.key.split(".");
    if ( !r.had ) {
      const doc = s.doc ?? game.settings.storage?.get?.("world")?.find?.(x => x.key === op.key);
      if ( doc ) await doc.delete(OPTS());
      return !!doc;
    }
    if ( s.registered ) await game.settings.set(ns, rest.join("."), r.value);
    else if ( s.doc ) await s.doc.update({value: JSON.stringify(r.value)}, OPTS());
    else return false;
    return true;
  }
  if ( op.act === "card" ) {
    const msg = docNow(op.uuid);
    if ( !msg || msg.flags?.[MODULE_ID]?.nightTakenBack ) return false;
    await msg.update({content: R.takenBackCard(msg.content), [`flags.${MODULE_ID}.nightTakenBack`]: true}, OPTS());
    return true;
  }
  return false;
}

/**
 * Take back the ticked pieces of work, newest change first.
 * @param {string[]} ids
 * @param {{keep?: boolean, by?: string}} o   keep: leave whatever was changed since as it is now (default true)
 * @returns {Promise<{plan: object[], text: string}|null>}
 */
export async function undo(ids, {keep = true, by = null} = {}) {
  if ( !game.user.isGM || !ids?.length ) return null;
  await settle();
  const j = journalNow();
  const steps = R.orderOps(j.entries, ids);
  const plan = [];
  undoing++;
  try {
    for ( const s of steps ) {
      // Read the world as it is at this step, so a newer change already taken back shows its old value
      const a = R.stepAction(s.op, look(s.op), {keep});
      try { a.done = await applyStep(s.op, a); }
      catch (e) { console.error(`${MODULE_ID} | night's work undo`, s.op, e); a.action = "none"; a.failed = String(e?.message ?? e); }
      plan.push({...s, ...a});
    }
    // Work that changed nothing here but whose kind keeps its own Undo (WoDX Chronicle's approval handlers)
    for ( const e of j.entries.filter(x => ids.includes(x.id) && !x.undone && !x.ops.length && x.approvalId && x.handlerUndo) ) {
      try { await approvals?.undoById?.(e.approvalId); } catch (err) { console.error(`${MODULE_ID} | night's work undo`, e.label, err); }
    }
    const done = j.entries.filter(x => ids.includes(x.id) && !x.undone && !x.tooBig);
    const kept = {};
    for ( const s of plan ) if ( s.action === "kept" || s.skip?.length ) kept[s.entry] = (kept[s.entry] ?? 0) + 1;
    await setSetting("nightWork", R.markUndone(journal(), done.map(x => x.id), {kept}));
    try { await approvals?.markTakenBack?.(done.map(x => x.approvalId).filter(Boolean)); } catch (e) { console.error(`${MODULE_ID} | night's work`, e); }
    const text = R.summary(plan);
    const keptLines = plan.filter(s => s.action === "kept" || s.skip?.length).slice(0, 12).map(s => `<li>${esc(R.opLine(s.op))}</li>`).join("");
    await ChatMessage.create({speaker: {alias: "The night's work"}, whisper: game.users.filter(u => u.isGM).map(u => u.id),
      flags: {[MODULE_ID]: {nightUndo: done.map(x => x.id)}},
      content: `<div class="wodx-card wodx-night-card"><h3><i class="fa-solid fa-rotate-left"></i> The night's work taken back</h3>
        <ul>${done.map(e => `<li>${esc(e.label)}</li>`).join("")}</ul><p>${esc(text)}.</p>${by ? `<p class="wodx-quiet">Asked by ${esc(by)}.</p>` : ""}
        ${keptLines ? `<p>Left as they are now:</p><ul class="wodx-quiet">${keptLines}</ul>` : ""}
        <div class="wodx-buttons"><button type="button" data-action="wodx-night-open">The night's work</button></div></div>`});
    Hooks.callAll("wodxNightUndone", {ids: done.map(x => x.id), plan});
    return {plan, text, ids: done.map(x => x.id)};
  } finally { undoing--; }
}

/** The rows for a window, newest first. */
export function list({since = "session", time = null, self = "you"} = {}) {
  let session = null;
  try { session = game.settings.get("wodx-storyteller", "session")?.real ?? null; } catch (e) { session = null; }
  const from = R.sinceMs(since, {session, time});
  const names = id => { const u = game.users.get(id); return u ? {name: u.isGM ? (u.id === game.user.id ? self : u.name) : u.name, isGM: u.isGM} : null; };
  return R.rows(journalNow(), {since: from, look, names});
}

/* ------------------------------------------------------------------ */
/*  The window                                                         */
/* ------------------------------------------------------------------ */

const {ApplicationV2, DialogV2} = foundry.applications?.api ?? {};
const Base = ApplicationV2 ?? class {};

export class NightApp extends Base {
  static DEFAULT_OPTIONS = {
    id: "wodx-night-work", classes: ["wodx", "wodx-night"],
    window: {title: "The night's work", icon: "fa-solid fa-clock-rotate-left", resizable: true},
    position: {width: 560, height: 640},
    actions: {undo: NightApp.#onUndo, tickAll: NightApp.#onTickAll}
  };
  static #instance;
  since = "session";
  time = "";
  keep = true;

  static open() {
    if ( !game.user.isGM ) return null;
    this.#instance ??= new NightApp();
    return this.#instance.render({force: true});
  }
  static refresh() { if ( this.#instance?.rendered ) this.#instance.render(); }

  async _renderHTML() {
    const rows = list({since: this.since, time: this.time ? new Date(this.time).getTime() : null});
    const div = document.createElement("div");
    div.className = "wodx-body wodx-scroll";
    div.innerHTML = `<p class="wodx-quiet">What the Hand did by itself: approvals carried out, what the clock set going, and the seat's choices in the Lone Chronicle. Tick what to take back. Undo goes newest first.</p>
      ${rows.length > 6 ? searchBox("ul.wodx-night-list", "Find a piece of work…", "Search the night's work") : ""}
      ${R.listHTML(rows, {since: this.since, time: this.time, keep: this.keep})}`;
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }
  _onRender() {
    this.element.querySelector("select.wodx-night-sel")?.addEventListener("change", ev => { this.since = ev.target.value; this.render(); });
    this.element.querySelector("input.wodx-night-time")?.addEventListener("change", ev => { this.time = ev.target.value; this.render(); });
    this.element.querySelectorAll("input[name=keep]").forEach(r => r.addEventListener("change", ev => { this.keep = ev.target.value === "1"; }));
  }
  static #onTickAll() {
    const boxes = [...this.element.querySelectorAll("input.wodx-night-tick:not([disabled])")];
    const on = !boxes.every(b => b.checked);
    boxes.forEach(b => { b.checked = on; });
  }
  static async #onUndo() {
    const ids = [...this.element.querySelectorAll("input.wodx-night-tick:checked")].map(b => b.dataset.id);
    if ( !ids.length ) return ui.notifications.warn("Tick the work to take back first.");
    const rows = list({since: "all"}).filter(r => ids.includes(r.id));
    const warn = rows.reduce((n, r) => n + r.warn, 0);
    const ok = await DialogV2.confirm({window: {title: "Take back the night's work"}, classes: ["wodx", "wodx-dialog"],
      content: `<p>Take back ${ids.length} piece${ids.length === 1 ? "" : "s"} of the Hand's work, newest first?</p>${warn
        ? `<p><i class="fa-solid fa-triangle-exclamation"></i> ${warn} change${warn === 1 ? " was" : "s were"} made since by someone else. ${this.keep ? "They will be kept as they are now." : "They will be put back as they were before the Hand."}</p>` : ""}`,
      rejectClose: false});
    if ( !ok ) return;
    const r = await undo(ids, {keep: this.keep});
    if ( r ) ui.notifications.info(`${r.text}.`);
    this.render();
  }
}

/* ------------------------------------------------------------------ */
/*  Start                                                              */
/* ------------------------------------------------------------------ */

/** At ready: the approval queue's side of an undo, the tool in the Storyteller's hand. */
export function start(approvalsApi) {
  approvals = approvalsApi;
  if ( !game.user.isGM ) return;
  const add = () => {
    const hand = game.wodx?.storyteller?.hand;
    if ( !hand?.addTool ) return false;
    hand.addTool({key: "nightWork", label: "The night's work", icon: "fa-clock-rotate-left", run: () => NightApp.open()});
    return true;
  };
  if ( !add() ) setTimeout(add, 2000);
}

export const api = () => ({begin, end, record, settle, undo, list, look, journal, open: () => NightApp.open(), rules: R});
