import * as N from "./naval-rules.mjs";
import * as C from "./core.mjs";
import {draw} from "./siege-works.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

/**
 * WoDX Storyteller 0.51.0: ships at sea, the Foundry side (B2480-B2487). The rules are in naval-rules.mjs.
 *
 * The Storyteller opens "Ships at sea" from the Storyteller's hand (or game.wodx.storyteller.naval.open()), sets
 * two ships of the year against each other and plays the fight step by step: the chase, the turn for position,
 * shooting, ramming, boarding, and each quarter hour of flooding and repair. Each step posts a card in words for
 * everyone and the dice for the Storyteller, and has an Undo. Nothing moves the clock by itself: "Let the time pass"
 * moves the world clock by the time the fight took.
 */

const {MOD, esc, setting} = C;
const {ApplicationV2} = foundry.applications?.api ?? {ApplicationV2: class {}};
const KEY = "naval";
const n = v => Number(v) || 0;
const now = () => globalThis.game?.time?.worldTime ?? 0;
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const opt = (o, cur) => Object.entries(o).map(([k, v]) => `<option value="${esc(k)}"${String(k) === String(cur) ? " selected" : ""}>${esc(v)}</option>`).join("");

export function registerNavalSettings() {
  game.settings.register(MOD, KEY, {scope: "world", config: false, type: Object, default: N.blankNaval(), onChange: () => NavalApp.refresh()});
}

export const state = () => N.normNaval(setting(KEY));
export const list = () => state().list;
export const get = id => list().find(f => f.id === id) ?? null;

async function put(fight) {
  if ( !game.user.isGM ) return null;
  const s = state(), f = N.normFight(fight);
  const i = s.list.findIndex(x => x.id === f.id);
  if ( i >= 0 ) s.list[i] = f; else s.list.push(f);
  await game.settings.set(MOD, KEY, N.normNaval(s));
  return f;
}
export async function remove(id) {
  if ( !game.user.isGM ) return;
  const s = state(); s.list = s.list.filter(f => f.id !== id);
  await game.settings.set(MOD, KEY, s);
}

/** The year and branch for a fight at sea. */
export function contextOf(fight) {
  const ctx = C.tripContext(now());
  return {year: fight?.year || ctx.year || 1197, branch: fight?.branch ?? (ctx.future ? "future" : "classic")};
}

export async function start(raw = {}) {
  const {year, branch} = contextOf(raw);
  return put({...raw, id: undefined, year, branch});
}

async function say(f, before) {
  const last = f.log.at(-1);
  if ( !last || f.log.length === before?.log?.length ) return;
  await ChatMessage.create({content: `<div class="wodx-card wst-naval-card"><h3>${esc(f.name)}</h3><p>${esc(last.words)}</p>${f.over && !before?.over ? `<p><strong>${esc(f.over.text)}</strong></p>` : ""}</div>`,
    speaker: {alias: "Ships at sea"}, flags: {[MOD]: {naval: f.id}}});
  if ( last.dice ) await ChatMessage.create({whisper: gmIds(), speaker: {alias: "Ships at sea"}, content: `<div class="wodx-card wst-naval-card"><p class="wodx-quiet">${esc(last.dice)}</p></div>`});
}

/** Run one step of the rules on a stored fight, save it and post its cards. */
async function act(id, fn, {quiet = false} = {}) {
  const f0 = get(id);
  if ( !f0 || !game.user.isGM ) return null;
  if ( f0.over ) { ui.notifications?.info?.("This fight is over. Undo the last step to carry on."); return f0; }
  const f = await put(fn(f0));
  if ( !quiet ) await say(f, f0);
  return f;
}
export const navigate = (id, i, opts = {}, o) => act(id, f => N.navigate(f, i, opts, draw), o);
export const pursue = (id, chaser = 0, o) => act(id, f => N.pursue(f, chaser, draw), o);
export const manoeuvre = (id, o) => act(id, f => N.manoeuvre(f, draw), o);
export const fire = (id, i, opts = {}, o) => act(id, f => N.fire(f, i, opts, draw), o);
export const ram = (id, i, o) => act(id, f => N.ram(f, i, draw), o);
export const breakAway = (id, i, o) => act(id, f => N.breakAway(f, i, draw), o);
export const setGap = (id, yards, o) => act(id, f => N.setGap(f, n(yards)), o);
export const quarter = (id, opts = {}, o) => act(id, f => N.quarter(f, draw, opts), o);
export const boarding = (id, down = [0, 0], o) => act(id, f => N.boarding(f, down), o);
export const setRowing = async (id, i, rowing, push = 0) => {
  const f = get(id);
  if ( !f ) return null;
  return put({...f, ships: f.ships.map((s, k) => (k === i ? {...s, rowing: !!rowing, push: n(push)} : s))});
};
export async function undo(id) {
  const f0 = get(id);
  if ( !f0 ) return null;
  const f = await put(N.undo(f0));
  await ChatMessage.create({whisper: gmIds(), speaker: {alias: "Ships at sea"}, content: `<div class="wodx-card"><p>Undo: the last step of ${esc(f.name)} is taken back.</p></div>`});
  return f;
}
/** Move the world clock by the time the fight took, once. */
export async function passTime(id) {
  const f = get(id);
  if ( !f || !game.user.isGM ) return 0;
  const secs = Math.max(0, f.elapsed - f.timePassed);
  if ( !secs ) { ui.notifications.info("The time this fight took has already passed."); return 0; }
  await put({...f, timePassed: f.timePassed + secs});
  await game.time.advance(secs);
  return secs;
}

/* ---- The window ---- */

function shipForm(i, s, ships) {
  const p = `s${i}`;
  return `<fieldset><legend>${i ? "The second ship" : "The first ship"}</legend>
    <div class="form-group"><label>Name</label><input type="text" name="${p}.name" value="${esc(s.name)}" maxlength="120"></div>
    <div class="form-group"><label>Ship</label><select name="${p}.type" data-fixed>${opt(Object.fromEntries(ships.map(x => [x.id, `${x.label}${x.house ? " (house rule)" : ""}`])), s.type)}</select></div>
    <div class="form-group"><label title="The captain's Intelligence + Seamanship">Captain's seamanship</label><input type="number" name="${p}.seamanship" value="${s.seamanship}" min="1" max="15" style="width:4em"></div>
    <div class="form-group"><label title="The captain's Wits + Seamanship">Captain at the helm</label><input type="number" name="${p}.helm" value="${s.helm}" min="1" max="15" style="width:4em"></div>
    <div class="form-group"><label title="Dexterity + Archery for engines, Heavy Weaponry for guns">Gunners' dice</label><input type="number" name="${p}.gunners" value="${s.gunners}" min="1" max="15" style="width:4em"></div>
    <div class="form-group"><label title="Leave empty for the ship's usual numbers">Crew and soldiers</label><input type="number" name="${p}.crew" value="" placeholder="${N.SHIPS[s.type].crew}" min="0" max="5000" style="width:5em"><input type="number" name="${p}.soldiers" value="" placeholder="${N.SHIPS[s.type].soldiers ?? 0}" min="0" max="5000" style="width:5em"></div></fieldset>`;
}

export async function setupDialog() {
  if ( !game.user.isGM ) return null;
  const f = N.normFight({});
  const {year, branch} = contextOf(f);
  const ships = N.shipsFor(year, branch);
  if ( ships.length ) f.ships = f.ships.map((s, i) => N.normShip({...s, type: ships[Math.min(i, ships.length - 1)].id}, s.name));
  const content = `<p class="wodx-quiet">${esc(String(year))}. The ships of the age; those marked as house rules are WoDX figures after the book's.</p>
    <div class="form-group"><label>Name</label><input type="text" name="name" value="" placeholder="A fight at sea" maxlength="120"></div>
    <div class="form-group"><label>Place</label><input type="text" name="place" value="" maxlength="120"></div>
    <div class="form-group"><label>Yards between them</label><input type="number" name="gap" value="2000" min="0" max="50000" style="width:6em"></div>
    ${shipForm(0, f.ships[0], ships)}${shipForm(1, f.ships[1], ships)}
    <p class="wodx-quiet">The chase, the turn for position, boarding, damage and repair follow Spoils of War; guns, torpedoes and ramming follow Wraith: The Great War, read for ships of the living world.</p>`;
  const data = await foundry.applications.api.DialogV2.prompt({window: {title: "A fight at sea", icon: "fa-solid fa-anchor"}, position: {width: 520}, content,
    ok: {label: "Start", callback: (e, btn) => new foundry.applications.ux.FormDataExtended(btn.form).object}, rejectClose: false});
  if ( !data ) return null;
  const ship = i => {
    const o = {name: data[`s${i}.name`], type: data[`s${i}.type`], seamanship: data[`s${i}.seamanship`], helm: data[`s${i}.helm`], gunners: data[`s${i}.gunners`]};
    if ( data[`s${i}.crew`] !== "" && data[`s${i}.crew`] !== null ) o.crew = data[`s${i}.crew`];
    if ( data[`s${i}.soldiers`] !== "" && data[`s${i}.soldiers`] !== null ) o.soldiers = data[`s${i}.soldiers`];
    return o;
  };
  const out = await start({name: data.name, place: data.place, gap: data.gap, year, branch, ships: [ship(0), ship(1)]});
  NavalApp.open(out?.id);
  return out;
}

export class NavalApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-naval",
    classes: ["wodx", "wst-naval-app"],
    window: {title: "Ships at sea", icon: "fa-solid fa-anchor", resizable: true},
    position: {width: 580, height: 660},
    actions: {
      newFight: () => setupDialog(), pick: (e, t) => NavalApp.open(t.dataset.id), back: () => NavalApp.open(null),
      navChase: (e, t) => pursue(t.dataset.id, Number(t.dataset.ship)),
      navTurn: (e, t) => manoeuvre(t.dataset.id),
      navFire: (e, t) => fire(t.dataset.id, Number(t.dataset.ship), {range: NavalApp.field("range")?.value || "medium"}),
      navRam: (e, t) => ram(t.dataset.id, Number(t.dataset.ship)),
      navBreak: (e, t) => breakAway(t.dataset.id, Number(t.dataset.ship)),
      navGap: (e, t) => setGap(t.dataset.id, n(NavalApp.field("gap")?.value)),
      navCourse: (e, t) => navigate(t.dataset.id, Number(t.dataset.ship), {land: !!NavalApp.field("land")?.checked, compass: !!NavalApp.field("compass")?.checked, pilot: !!NavalApp.field("pilot")?.checked}),
      navQuarter: (e, t) => quarter(t.dataset.id, {repair: [0, 1].map(k => !!NavalApp.field(`fix${k}`)?.checked), pool: [0, 1].map(k => n(NavalApp.field(`fixPool${k}`)?.value) || 3), helpers: [0, 1].map(k => n(NavalApp.field(`fixHelp${k}`)?.value))}),
      navBoard: (e, t) => boarding(t.dataset.id, [0, 1].map(k => n(NavalApp.field(`down${k}`)?.value))),
      navRow: (e, t) => setRowing(t.dataset.id, Number(t.dataset.ship), !!NavalApp.field(`row${t.dataset.ship}`)?.checked, n(NavalApp.field(`push${t.dataset.ship}`)?.value)),
      navUndo: (e, t) => undo(t.dataset.id), navTime: (e, t) => passTime(t.dataset.id), navRemove: (e, t) => NavalApp.#onRemove(t)
    }
  };
  static #instance;
  static #timer = null;
  #current = null;
  static open(id = undefined) {
    if ( !game.user.isGM ) return null;
    this.#instance ??= new NavalApp();
    if ( id !== undefined ) this.#instance.#current = id;
    return this.#instance.render({force: true});
  }
  static refresh() {
    if ( !this.#instance?.rendered || this.#timer ) return;
    this.#timer = setTimeout(() => { this.#timer = null; if ( this.#instance?.rendered ) this.#instance.render(); }, 300);
  }
  static field(name) { return this.#instance?.element?.querySelector(`[name="${CSS.escape(name)}"]`) ?? null; }

  async _renderHTML() {
    const div = document.createElement("div");
    div.className = "wodx-body";
    const f = this.#current ? get(this.#current) : null;
    div.innerHTML = f ? this.#detail(f) : this.#list();
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }

  #list() {
    const all = [...list()].reverse();
    const row = f => `<div class="wst-naval-row" data-search-item data-search-text="${esc(`${f.name} ${f.place} ${f.ships.map(s => s.name).join(" ")}`)}">
      <button type="button" data-action="pick" data-id="${esc(f.id)}">${esc(f.name)}</button>
      <span class="wodx-quiet">${f.year ? esc(String(f.year)) : ""}${f.place ? `, ${esc(f.place)}` : ""}: ${f.over ? esc(f.over.text) : `${esc(f.ships[0].name)} and ${esc(f.ships[1].name)}, ${f.gap} yards apart`}</span></div>`;
    return `${all.length > 6 ? searchBox(".wst-naval-list", "Find a fight at sea…", "Search fights at sea") : ""}
      <p class="wodx-quiet">Two ships at sea: the chase, the turn for position, shooting, ramming and boarding, with each ship slowed and flooded by its damage.</p>
      <div class="wodx-scroll wst-naval-list">${all.map(row).join("") || `<p class="wodx-quiet">No fights at sea yet.</p>`}</div>
      <div class="wodx-buttons"><button type="button" data-action="newFight"><i class="fa-solid fa-anchor"></i> A fight at sea</button></div>`;
  }

  #detail(f) {
    const id = esc(f.id), live = !f.over, close = f.gap === 0;
    const ship = (s, i) => {
      const T = N.SHIPS[s.type], st = N.stateOf(s);
      const arms = T.arms.map(([a, k]) => `${N.armOf(a)?.label ?? a} x${k}`).join(", ") || "no engines or guns";
      const up = Math.max(0, s.crew + s.soldiers - s.down);
      return `<div class="wst-naval-ship"><strong>${esc(s.name)}</strong> <span class="wodx-quiet">(${esc(T.label)})</span>
        <div>Health ${Math.max(0, st.health)} of ${T.health}, soak ${T.soak}. Speed ${st.speed}, Maneuverability ${st.maneuver}.${st.flooding ? " Flooding." : ""}${s.sunk ? " Sunk." : ""}${s.struck ? " Colours struck." : ""}</div>
        <div class="wodx-quiet">${esc(arms)}. ${up} of ${s.crew + s.soldiers} aboard still fighting.${s.repair ? ` Repair under way: ${s.repair} of ${s.damage}.` : ""}${T.oars ? ` Rowed ${s.rowed} of 12 hours today.` : ""}</div>
        ${live ? `<div class="wodx-buttons">
          <button type="button" data-action="navChase" data-id="${id}" data-ship="${i}" title="Four hours of the chase, this ship giving chase">Give chase</button>
          <button type="button" data-action="navFire" data-id="${id}" data-ship="${i}"${T.arms.length ? "" : " disabled"}>Shoot</button>
          ${close ? `<button type="button" data-action="navRam" data-id="${id}" data-ship="${i}">Ram</button><button type="button" data-action="navBreak" data-id="${id}" data-ship="${i}">Break away</button>` : ""}
          <button type="button" data-action="navCourse" data-id="${id}" data-ship="${i}" title="Intelligence + Seamanship to hold a course">Navigate</button></div>
          <div class="form-group"><label><input type="checkbox" name="fix${i}"> Repair each quarter hour</label><input type="number" name="fixPool${i}" value="3" min="1" max="15" style="width:4em" title="The carpenter's dice">
            <label title="Up to 6 helpers, each a die">helpers</label><input type="number" name="fixHelp${i}" value="${s.helpers}" min="0" max="6" style="width:3.5em"></div>
          ${T.oars ? `<div class="form-group"><label><input type="checkbox" name="row${i}"${s.rowing ? " checked" : ""}> Under oars</label><select name="push${i}" data-fixed>${opt({0: "At the usual stroke", 1: "Pushed 1", 2: "Pushed 2", 3: "Pushed 3"}, s.push)}</select>
            <button type="button" data-action="navRow" data-id="${id}" data-ship="${i}">Set</button></div>` : ""}
          ${close ? `<div class="form-group"><label>Down in the boarding</label><input type="number" name="down${i}" value="0" min="0" max="5000" style="width:5em"></div>` : ""}` : ""}</div>`;
    };
    const logs = [...f.log].reverse().slice(0, 30).map(l => `<li>${esc(l.words)}</li>`).join("");
    const left = f.elapsed - f.timePassed;
    return `<p><button type="button" data-action="back"><i class="fa-solid fa-arrow-left"></i> All fights at sea</button></p>
      <h3>${esc(f.name)}${f.place ? ` <span class="wodx-quiet">off ${esc(f.place)}</span>` : ""}</h3>
      <p class="wodx-quiet">${f.year ? esc(String(f.year)) : ""}. ${close ? "The ships are alongside." : `${f.gap} yards apart.`}${f.initiative === null ? "" : ` ${esc(f.ships[f.initiative].name)} has the wind (+${f.edge} initiative).`} ${esc(N.timeWords(f.elapsed))} so far.</p>
      ${f.over ? `<p><strong>${esc(f.over.text)}</strong></p>` : ""}
      ${f.ships.map(ship).join("")}
      ${live ? `<div class="form-group"><label>Range for shooting</label><select name="range" data-fixed>${opt({short: "Short", medium: "Medium", long: "Long"}, f.gap < 300 ? "short" : f.gap < 1500 ? "medium" : "long")}</select>
        <label>Yards apart</label><input type="number" name="gap" value="${f.gap}" min="0" max="50000" style="width:6em"><button type="button" data-action="navGap" data-id="${id}">Set</button></div>
        <div class="form-group"><label><input type="checkbox" name="land" checked> In sight of land</label><label><input type="checkbox" name="compass"> Compass</label><label><input type="checkbox" name="pilot"> Pilot's book</label></div>` : ""}
      <div class="wodx-buttons">
        ${live ? `<button type="button" data-action="navTurn" data-id="${id}" title="Resisted Intelligence + Seamanship for the wind and the initiative">Turn for position</button>
          <button type="button" data-action="navQuarter" data-id="${id}" title="Flooding and repair">A quarter hour passes</button>
          ${close ? `<button type="button" data-action="navBoard" data-id="${id}">Boarding</button>` : ""}` : ""}
        ${f.history.length ? `<button type="button" data-action="navUndo" data-id="${id}">Undo</button>` : ""}
        ${left > 0 ? `<button type="button" data-action="navTime" data-id="${id}" title="Move the world clock by the time the fight took">Let the time pass (${esc(N.timeWords(left))})</button>` : ""}
        <button type="button" data-action="navRemove" data-id="${id}">Remove</button></div>
      ${logs ? `<details open><summary>What has happened</summary><ol reversed>${logs}</ol></details>` : ""}`;
  }

  static async #onRemove(target) {
    const f = get(target.dataset.id);
    if ( !f ) return;
    const ok = await foundry.applications.api.DialogV2.confirm({window: {title: "Remove the fight at sea"}, content: `<p>Remove ${esc(f.name)} from the list? Cards already in the chat stay.</p>`, rejectClose: false});
    if ( ok ) { await remove(f.id); NavalApp.open(null); }
  }
}
