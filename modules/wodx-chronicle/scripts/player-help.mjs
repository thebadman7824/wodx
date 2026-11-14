/**
 * Help on every WoDX window and the player's own preferences (Chronicle 0.52.0, B2835 and B2836).
 *   - a ? in the title bar of every WoDX window opens its page in the Library's manual
 *   - the first time a player opens one of the main windows, a two-line tip says what it is for, with Got it and
 *     Never show tips
 *   - My WoDX preferences: the player's own settings from every WoDX module in one window, with the Light, Standard
 *     and Full presets; each setting can still be changed one by one, here or in Configure Settings
 */
import {MODULE_ID, esc} from "./util.mjs";
import * as R from "./player-view-rules.mjs";

const {ApplicationV2} = foundry.applications.api;

/** The main windows: how to know one, its manual page, and its tip (two short lines). */
export const WINDOWS = [
  {cls: "wodx-find", page: "Finding your way", tip: "Type a word to find any button, action, page or setting.|Enter opens the first one found."},
  {cls: "wodx-now", page: "Finding your way", tip: "The few things that make sense right now, one click each.|Stuck? The last row asks for help."},
  {cls: "wodx-prefs", page: "Sound and screen", tip: "Your own settings from every WoDX module, in one place.|A preset sets many at once; change any one after."},
  {cls: "wodx-wizard", page: "Your character", tip: "Your character, one step of the book at a time.|Quick start on the first page fills in a build you can change."},
  {cls: "wodx-lifepath", page: "Your character", tip: "The life before play.|Short asks where you come from and tells the rest; Long asks every step."},
  {cls: "wodx-first-night", page: "Your character", tip: "What to do before the first night of play.|The step marked Next is a good place to start."},
  {cls: "wix-case", page: "Finding your way", tip: "The case board: what the group knows, pinned up.|Drop people, places and pages on it, and join them with lines."},
  {cls: "wsolo-panel", page: "Getting started", tip: "Playing on your own.|What happens next? runs the clock until something happens."},
  {cls: "wodx-figure-app", page: "Your token's look", tip: "How your token is dressed.|Pick a part, then a piece; Keep this figure saves it."}
];

const get = (k, fb) => { try { return game.settings.get(MODULE_ID, k) ?? fb; } catch { return fb; } };
const libApi = () => (game.modules.get("wodx-library")?.active ? game.modules.get("wodx-library").api : null);
const shownNow = new Set();

export function registerPlayerHelpSettings() {
  game.settings.register(MODULE_ID, "tipsOn", {name: "First-time tips on WoDX windows", hint: "A short tip the first time you open each main WoDX window.",
    scope: "client", config: true, type: Boolean, default: true});
  game.settings.register(MODULE_ID, "tipsSeen", {scope: "client", config: false, type: Array, default: []});
  game.settings.registerMenu(MODULE_ID, "myPrefs", {name: "My WoDX preferences", label: "Open", hint: "Your own settings from every WoDX module in one window, with presets.",
    icon: "fa-solid fa-sliders", type: PrefsApp, restricted: false});
}

function windowOf(el) { return WINDOWS.find(w => el.classList?.contains(w.cls)) ?? null; }

export function installPlayerHelp() {
  Hooks.on("renderApplicationV2", (app, el) => {
    try {
      const root = el?.[0] ?? el ?? app.element;
      if ( !root?.classList?.contains("wodx") ) return;
      const w = windowOf(root);
      addHelpMark(app, root, w);
      if ( w ) addTip(app, root, w);
    } catch (e) { console.warn("WoDX | window help", e); }
  });
  Hooks.on("closeApplicationV2", app => {
    const root = app.element;
    const w = root ? windowOf(root) : null;
    if ( w && shownNow.has(w.cls) ) markSeen(w.cls);
  });
}

/** The ? in the title bar. */
function addHelpMark(app, root, w) {
  const header = app.window?.header ?? root.querySelector(".window-header");
  if ( !header || header.querySelector(".wodx-help-mark") ) return;
  const b = document.createElement("button");
  b.type = "button";
  b.className = "header-control icon fa-solid fa-circle-question wodx-help-mark";
  b.dataset.tooltip = "What is this window? (opens its page in the Library)";
  b.setAttribute("aria-label", "Help for this window");
  b.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); openHelp(w?.page ?? "Getting started"); });
  const close = header.querySelector("[data-action='close']");
  header.insertBefore(b, close ?? null);
}

export async function openHelp(page) {
  const L = libApi();
  if ( L?.manual?.page ) return L.manual.page(page);
  if ( L?.manual?.open ) return L.manual.open();
  ui.notifications.info("The help pages are in WoDX Library, which is not on in this world.");
  return null;
}
export async function openGlossary(term = "") {
  const L = libApi();
  if ( L?.glossary?.open ) return L.glossary.open(term);
  ui.notifications.info("The glossary is in WoDX Library, which is not on in this world.");
  return null;
}

function markSeen(cls) {
  const seen = new Set(get("tipsSeen", []));
  if ( seen.has(cls) ) return;
  seen.add(cls);
  game.settings.set(MODULE_ID, "tipsSeen", [...seen]).catch(() => null);
}

/** The first-time tip at the top of the window. */
function addTip(app, root, w) {
  if ( !get("tipsOn", true) || get("tipsSeen", []).includes(w.cls) ) return;
  const body = root.querySelector(".window-content");
  if ( !body || body.querySelector(":scope > .wodx-tip") ) return;
  shownNow.add(w.cls);
  const [a, b] = w.tip.split("|");
  const tip = document.createElement("div");
  tip.className = "wodx-tip";
  tip.setAttribute("role", "note");
  tip.innerHTML = `<p><i class="fa-solid fa-lightbulb" aria-hidden="true"></i> ${esc(a)}<br>${esc(b ?? "")}</p>
    <div class="wodx-tip-buttons"><button type="button" data-tip="ok">Got it</button><button type="button" data-tip="never">Never show tips</button>
    <a data-tip="glossary">Glossary</a></div>`;
  tip.addEventListener("click", ev => {
    const k = ev.target.closest?.("[data-tip]")?.dataset.tip;
    if ( !k ) return;
    ev.preventDefault();
    if ( k === "glossary" ) return openGlossary();
    markSeen(w.cls);
    if ( k === "never" ) game.settings.set(MODULE_ID, "tipsOn", false).catch(() => null);
    tip.remove();
  });
  body.prepend(tip);
}

/* -------------------------------------------- */
/*  My WoDX preferences                         */
/* -------------------------------------------- */

/** The player's own WoDX settings: client scope, shown in Configure Settings, from a WoDX module. */
function mySettings() {
  const out = [];
  for ( const s of game.settings.settings.values() ) {
    if ( !s.config || !String(s.namespace).startsWith("wodx") ) continue;
    if ( s.scope !== "client" && s.scope !== "user" ) continue;
    const type = s.type === Boolean ? "Boolean" : s.type === Number ? "Number" : s.type === String ? "String" : "";
    if ( !type ) continue;
    out.push({id: `${s.namespace}.${s.key}`, ns: s.namespace, key: s.key, name: game.i18n.localize(s.name ?? s.key), hint: game.i18n.localize(s.hint ?? ""),
      type, choices: s.choices ?? null, range: s.range ?? null, default: s.default, reload: !!s.requiresReload,
      module: game.modules.get(s.namespace)?.title ?? s.namespace});
  }
  return out.sort((a, b) => a.module.localeCompare(b.module) || a.name.localeCompare(b.name));
}

export class PrefsApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-prefs", classes: ["wodx", "wodx-prefs"],
    window: {title: "My WoDX preferences", icon: "fa-solid fa-sliders", resizable: true},
    position: {width: 560, height: 640}
  };
  static open() { return (foundry.applications.instances.get("wodx-prefs") ?? new PrefsApp()).render({force: true}); }

  async _renderHTML() {
    const list = mySettings();
    const div = document.createElement("div");
    div.className = "wodx-body";
    let mod = "";
    const rows = list.map(s => {
      const v = game.settings.get(s.ns, s.key);
      const head = s.module !== mod ? `<h3>${esc((mod = s.module))}</h3>` : "";
      let input;
      if ( s.type === "Boolean" ) input = `<input type="checkbox" data-id="${esc(s.id)}" ${v ? "checked" : ""}>`;
      else if ( s.choices ) input = `<select data-id="${esc(s.id)}" data-fixed>${Object.entries(s.choices).map(([k, l]) => `<option value="${esc(k)}" ${String(k) === String(v) ? "selected" : ""}>${esc(game.i18n.localize(l))}</option>`).join("")}</select>`;
      else if ( s.type === "Number" && s.range ) input = `<input type="range" data-id="${esc(s.id)}" min="${s.range.min}" max="${s.range.max}" step="${s.range.step ?? 1}" value="${esc(v)}">`;
      else input = `<input type="${s.type === "Number" ? "number" : "text"}" data-id="${esc(s.id)}" value="${esc(v)}">`;
      const fx = R.presetTouches(s) ? ` <span class="wodx-tag" data-tooltip="The presets change this one">preset</span>` : "";
      return `${head}<div class="form-group" data-search-text="${esc(`${s.name} ${s.module}`)}"><label>${esc(s.name)}${fx}</label><div class="form-fields">${input}</div>${s.hint ? `<p class="hint">${esc(s.hint)}</p>` : ""}</div>`;
    }).join("");
    const presets = Object.entries(R.PRESETS).map(([k, p]) => `<button type="button" data-preset="${k}" data-tooltip="${esc(p.hint)}">${esc(p.label)}</button>`).join("");
    div.innerHTML = `<div class="wodx-top"><p>Start from a preset, then change any setting below. These are yours alone; nobody else's screen changes.</p>
        <div class="wodx-buttons wodx-prefs-presets">${presets}</div></div>
      <div class="wodx-scroll">${rows || `<p class="wodx-quiet">No WoDX module on in this world has settings of your own.</p>`}</div>`;
    this._list = list;
    return div;
  }
  _replaceHTML(result, content) {
    content.replaceChildren(result);
    content.querySelectorAll("[data-id]").forEach(i => i.addEventListener("change", async ev => {
      const s = this._list.find(x => x.id === ev.target.dataset.id);
      if ( !s ) return;
      const v = s.type === "Boolean" ? ev.target.checked : s.type === "Number" ? Number(ev.target.value) : ev.target.value;
      await game.settings.set(s.ns, s.key, v);
      if ( s.reload ) ui.notifications.info(`${s.name}: reload the page (F5) for this one to take effect.`);
    }));
    content.querySelectorAll("[data-preset]").forEach(b => b.addEventListener("click", async ev => {
      ev.preventDefault();
      const preset = b.dataset.preset;
      let n = 0, reload = false;
      for ( const s of this._list ) {
        const v = R.presetValue(s, preset);
        if ( v === undefined || v === game.settings.get(s.ns, s.key) ) continue;
        await game.settings.set(s.ns, s.key, v); n++; reload ||= s.reload;
      }
      ui.notifications.info(`${R.PRESETS[preset].label}: ${n} ${n === 1 ? "setting" : "settings"} changed.${reload ? " Reload the page (F5) to see all of it." : ""}`);
      this.render();
    }));
  }
}
