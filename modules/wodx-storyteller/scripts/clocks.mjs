import * as K from "./clock-rules.mjs";
import * as C from "./core.mjs";
import * as T from "./tasks-rules.mjs";
import * as U from "./upkeep-rules.mjs";
import * as Led from "./ledger.mjs";
import {rawTasks} from "./tasks.mjs";
import {huntOf, tieActors, tiesOf} from "./upkeep.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

/**
 * WoDX Storyteller 0.35.0: progress clocks (B1510-B1513). The rules are in clock-rules.mjs. Read clocks follow long
 * tasks, heat, ties and the Ledger; the Storyteller's own clocks tick by hand or by themselves. Players see what the
 * Storyteller shows them, in the Clocks window.
 */

const {MOD, esc, setting, isActiveGM} = C;
const all = c => c?.contents ?? [...(c?.values?.() ?? c ?? [])];
const now = () => globalThis.game?.time?.worldTime ?? 0;

export function registerClockSettings() {
  game.settings.register(MOD, "clocks", {scope: "world", config: false, type: Object, default: K.blankClocks(), onChange: () => ClocksApp.refresh()});
}

export const state = () => K.normClocks(setting("clocks"));

/** Every clock now, read ones first. */
export function clocks() {
  const t = now();
  const tasks = [], ties = [];
  if ( setting("longTasks") ) for ( const a of all(game.actors) ) for ( const raw of Object.values(rawTasks(a)) ) tasks.push({actorId: a.id, actorName: a.name, task: T.normTask(raw)});
  try { if ( setting("ties") ) for ( const a of tieActors() ) for ( const tie of tiesOf(a, t) ) ties.push({actorId: a.id, actorName: a.name, tie}); } catch (e) { /* no ties yet */ }
  const places = setting("heat") ? all(game.scenes).map(s => { const h = huntOf(s), heat = U.cooled(h.heat, h.since, t); return {id: s.id, name: s.navName || s.name, heat, band: U.heatBand(heat).name}; }) : [];
  const derived = [...K.taskClocks(tasks), ...K.heatClocks(places, U.HEAT.max), ...K.tieClocks(ties, t), ...K.ledgerClocks(Led.ledger().entries, t)];
  return K.allClocks(setting("clocks"), derived);
}

/** The clocks this user sees: all for the Storyteller; for a player, those shown to them or their characters. */
export function visibleClocks(user = game.user) {
  const list = clocks();
  if ( user.isGM ) return list;
  const mine = all(game.actors).filter(a => a.testUserPermission?.(user, "OWNER")).map(a => a.id);
  return K.playerClocks(list, mine);
}

/* ---- Changing clocks (the Storyteller only; players only look) ---- */

async function save(s) { await game.settings.set(MOD, "clocks", K.normClocks(s)); }

export async function saveClock(raw) {
  if ( !game.user.isGM ) return null;
  const s = state(), c = K.normClock(raw);
  const i = s.own.findIndex(x => x.id === c.id);
  if ( i >= 0 ) s.own[i] = c; else s.own.push(c);
  await save(s);
  return c;
}
export async function removeClock(id) {
  if ( !game.user.isGM ) return;
  const s = state(); s.own = s.own.filter(c => c.id !== id); await save(s);
}
export async function stepClock(id, by = 1) {
  if ( !game.user.isGM ) return null;
  const r = K.step(state(), id, by);
  await save(r.state);
  if ( r.full ) await announce([r.clock]);
  return r.clock;
}
/** Who sees a clock: false, true (everyone) or a list of actor ids. Works for read clocks too. */
export async function showClock(id, shown) {
  if ( !game.user.isGM ) return;
  const s = state(), own = s.own.find(c => c.id === id);
  const v = shown === true ? true : Array.isArray(shown) && shown.length ? shown : false;
  if ( own ) own.shown = v;
  else if ( v ) s.shown[id] = v; else delete s.shown[id];
  await save(s);
}

async function announce(full) {
  if ( !full.length ) return;
  await ChatMessage.create({whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id), speaker: {alias: "Clocks"},
    content: `<div class="wodx-card"><h3>A clock is full</h3><ul>${full.map(c => `<li>${esc(c.name)}${c.faction ? ` (${esc(c.faction)})` : ""}</li>`).join("")}</ul><p class="wodx-quiet">What it was counting toward happens now, as you decide.</p></div>`});
}

/** Tick own clocks set to tick on a faction turn, a session's end, or each week. Active Storyteller only. */
export async function tick(on) {
  if ( !isActiveGM() ) return [];
  const r = K.tickAll(state(), on, now());
  if ( r.changed ) await save(r.state);
  await announce(r.filled);
  return r.filled;
}

export function registerClockHooks() {
  let last = 0;
  Hooks.on("updateWorldTime", () => {
    // At most once a game hour, and never while a skip runs (the skip's end catches up)
    const t = now();
    if ( Math.abs(t - last) < 3600 || C.chron()?.isSkipping?.() ) return;
    last = t;
    if ( state().own.some(c => c.tick === "week") ) tick("week");
  });
  Hooks.on("wodxSkipEnd", () => { if ( state().own.some(c => c.tick === "week") ) tick("week"); });
  const r = () => ClocksApp.refresh();
  for ( const h of ["updateActor", "updateScene"] ) Hooks.on(h, r);
  Hooks.on("updateSetting", s => { if ( /^wodx-storyteller\.(ledger|clocks)$/.test(s?.key ?? "") ) r(); });
}

/* ---- The window ---- */

const {ApplicationV2} = foundry.applications?.api ?? {ApplicationV2: class {}};

export class ClocksApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-clocks",
    classes: ["wodx", "wst-clocks-app"],
    window: {title: "Progress clocks", icon: "fa-solid fa-clock", resizable: true},
    position: {width: 560, height: 600},
    actions: {add: ClocksApp.#onEdit, edit: ClocksApp.#onEdit, plus: (e, t) => stepClock(t.dataset.id, 1), minus: (e, t) => stepClock(t.dataset.id, -1),
      remove: ClocksApp.#onRemove, show: ClocksApp.#onShow}
  };
  static #instance;
  static #timer = null;
  static open() { this.#instance ??= new ClocksApp(); return this.#instance.render({force: true}); }
  static refresh() {
    if ( !this.#instance?.rendered || this.#timer ) return;
    this.#timer = setTimeout(() => { this.#timer = null; if ( this.#instance?.rendered ) this.#instance.render(); }, 400);
  }

  async _renderHTML() {
    const gm = game.user.isGM;
    const list = visibleClocks();
    const seenBy = c => c.shown === true ? "Everyone sees it" : Array.isArray(c.shown) ? `Seen by ${c.shown.map(id => game.actors.get(id)?.name ?? "someone").join(", ")}` : "The Storyteller only";
    const row = c => `<div class="wst-clock-row" data-search-item data-search-text="${esc(`${c.name} ${c.faction ?? ""} ${K.KINDS[c.kind] ?? ""}`)}">
      ${K.clockSVG(c, 44)}
      <div class="wst-clock-text"><strong>${esc(c.name)}</strong> <span class="wodx-quiet">${c.filled} of ${c.segments}${c.faction ? `, ${esc(c.faction)}` : ""}</span>
        <div class="wodx-quiet">${esc(K.KINDS[c.kind] ?? "")}${c.kind === "own" && c.tick !== "none" ? `, ticks ${esc(K.TICKS[c.tick].toLowerCase())}` : ""}${c.note ? `. ${esc(c.note)}` : ""}${gm ? `. ${esc(seenBy(c))}.` : ""}</div></div>
      ${gm ? `<div class="wodx-buttons">${c.kind === "own" ? `<button type="button" data-action="minus" data-id="${esc(c.id)}" aria-label="Empty a segment" title="Empty a segment">-</button><button type="button" data-action="plus" data-id="${esc(c.id)}" aria-label="Fill a segment" title="Fill a segment">+</button><button type="button" data-action="edit" data-id="${esc(c.id)}" title="Change"><i class="fa-solid fa-pen"></i></button>` : ""}
        <button type="button" data-action="show" data-id="${esc(c.id)}" title="Who sees it"><i class="fa-solid fa-eye"></i></button></div>` : ""}</div>`;
    const div = document.createElement("div");
    div.className = "wodx-body";
    div.innerHTML = `${list.length > 6 ? searchBox(".wst-clock-list", "Find a clock…", "Search clocks") : ""}
      <p class="wodx-quiet">${gm ? "Read clocks follow long tasks, heat, ties and the Ledger. Your own clocks fill by hand or by themselves. Players see only what you show them." : "The clocks the Storyteller shows you."}</p>
      <div class="wodx-scroll wst-clock-list">${list.map(row).join("") || `<p class="wodx-quiet">No clocks${gm ? " yet" : " to show you"}.</p>`}</div>
      ${gm ? `<div class="wodx-buttons"><button type="button" data-action="add"><i class="fa-solid fa-plus"></i> A new clock</button></div>` : ""}`;
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }

  static async #onEdit(event, target) {
    const c = state().own.find(x => x.id === target?.dataset?.id) ?? K.normClock({});
    const fid = "wst-clock-factions";
    let factions = [];
    try { factions = (game.settings.get("wodx-npc", "factions")?.factions ?? []).map(f => f.name); } catch (e) { /* NPC is off */ }
    const opt = (o, cur) => Object.entries(o).map(([k, v]) => `<option value="${k}"${String(k) === String(cur) ? " selected" : ""}>${esc(v)}</option>`).join("");
    const content = `<div class="form-group"><label>Name</label><input type="text" name="name" value="${esc(c.name)}" maxlength="120"></div>
      <div class="form-group"><label>Segments</label><select name="segments" data-fixed>${opt(Object.fromEntries(K.SEGMENTS.map(x => [x, x])), c.segments)}</select></div>
      <div class="form-group"><label>Filled</label><input type="number" name="filled" value="${c.filled}" min="0" max="12" step="1"></div>
      <div class="form-group"><label>Fills by itself</label><select name="tick" data-fixed>${opt(K.TICKS, c.tick)}</select></div>
      <div class="form-group"><label>Faction (optional)</label><input type="text" name="faction" value="${esc(c.faction)}" list="${fid}"><datalist id="${fid}">${factions.map(f => `<option value="${esc(f)}">`).join("")}</datalist></div>
      <div class="form-group"><label>Note</label><textarea name="note" rows="2">${esc(c.note)}</textarea></div>`;
    const data = await foundry.applications.api.DialogV2.prompt({window: {title: target?.dataset?.id ? "Change the clock" : "A new clock"}, content,
      ok: {label: "Save", callback: (e, b) => new foundry.applications.ux.FormDataExtended(b.form).object}, rejectClose: false});
    if ( !data ) return;
    await saveClock({...c, ...data, last: data.tick === "week" && c.tick !== "week" ? now() : c.last});
  }

  static async #onRemove(event, target) { await removeClock(target.dataset.id); }

  static async #onShow(event, target) {
    const id = target.dataset.id, c = clocks().find(x => x.id === id);
    if ( !c ) return;
    const pcs = C.pcs();
    const cur = c.shown === true ? "all" : Array.isArray(c.shown) ? "some" : "none";
    const pick = Array.isArray(c.shown) ? c.shown : c.for ?? [];
    const content = `<div class="form-group"><label>Who sees it</label><select name="who" data-fixed>
        <option value="none"${cur === "none" ? " selected" : ""}>The Storyteller only</option><option value="all"${cur === "all" ? " selected" : ""}>Everyone</option>
        <option value="some"${cur === "some" ? " selected" : ""}>The players of these characters</option></select></div>
      ${pcs.length > 8 ? searchBox(".wst-clock-who", "Find a character…", "Search characters") : ""}
      <div class="wst-clock-who wodx-scroll">${pcs.map(a => `<label data-search-item data-search-text="${esc(a.name)}"><input type="checkbox" name="a.${a.id}"${pick.includes(a.id) ? " checked" : ""}> ${esc(a.name)}</label>`).join("<br>")}</div>
      ${c.kind === "own" ? `<p><label><input type="checkbox" name="remove"> Remove this clock</label></p>` : ""}`;
    const data = await foundry.applications.api.DialogV2.prompt({window: {title: `Who sees: ${c.name}`}, content,
      ok: {label: "Save", callback: (e, b) => new foundry.applications.ux.FormDataExtended(b.form).object}, rejectClose: false});
    if ( !data ) return;
    if ( data.remove ) return removeClock(id);
    const ids = Object.entries(data).filter(([k, v]) => k.startsWith("a.") && v).map(([k]) => k.slice(2));
    await showClock(id, data.who === "all" ? true : data.who === "some" ? ids : false);
  }
}
