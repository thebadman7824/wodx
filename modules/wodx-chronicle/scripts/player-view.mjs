/**
 * Beginner and Full views (B2800 to B2806). In Beginner view a player's WoDX toolbar buttons sit in five labelled
 * drawers, the WoDX token menu buttons sit behind Act, Move, Look and Talk, and Find anything (Ctrl+K) searches every
 * button, action, journal page and setting. Full view is the layout as it was. Nothing is taken away in either view;
 * the Storyteller's per-player hides still apply first. The rules are in player-view-rules.mjs.
 */
import {MODULE_ID, esc} from "./util.mjs";
import * as R from "./player-view-rules.mjs";
import {currentYear} from "./eras.mjs";

const {ApplicationV2} = foundry.applications.api;

const get = (key, fb) => { try { return game.settings.get(MODULE_ID, key) ?? fb; } catch { return fb; } };
const redraw = () => { try { ui.controls?.render?.({reset: true}); } catch (e) { /* drawn again at the next render */ } };

export function registerPlayerViewSettings() {
  game.settings.register(MODULE_ID, "playerViews", {
    scope: "world", config: false, type: Object, default: {}, onChange: () => { redraw(); applyBodyClass(); }
  });
  game.settings.register(MODULE_ID, "playerViewDefault", {
    name: "Players' view when nobody has picked one",
    hint: "Beginner puts each player's WoDX buttons in a few labelled drawers and groups the token menu. Full shows every button as before. Each player can change their own view, and you can pick for each player in Player toolbar buttons.",
    scope: "world", config: true, type: String, choices: R.VIEWS, default: "full", onChange: () => { redraw(); applyBodyClass(); }
  });
  game.settings.register(MODULE_ID, "myView", {
    name: "My view",
    hint: "Beginner puts the WoDX buttons in a few labelled drawers and groups the token menu; nothing is taken away, and Find anything (Ctrl+K) reaches every button. Full shows everything at once.",
    scope: "client", config: true, type: String,
    choices: {"": "As the Storyteller set it", ...R.VIEWS}, default: "", onChange: () => { redraw(); applyBodyClass(); }
  });
  game.keybindings.register(MODULE_ID, "findAnything", {
    name: "Find anything",
    hint: "Search every WoDX button, your character's actions, journal pages and settings.",
    editable: [{key: "KeyK", modifiers: ["Control"]}],
    onDown: () => { FindApp.open(); return true; },
    restricted: false
  });
}

let preview = null; // the Storyteller's look at a view, this session only

/** The Storyteller sees a view as a player would, until "full" or null, or a reload. */
export function previewView(view = null) {
  preview = R.VIEWS[view] ? view : null;
  redraw(); applyBodyClass();
  return currentView();
}

/** This user's view now. The Storyteller sees Full unless previewing. */
export function currentView(user = game.user) {
  if ( user?.isGM ) return user === game.user && preview ? preview : "full";
  return R.viewFor({mine: user === game.user ? get("myView", "") : "", byUser: get("playerViews", {})?.[user?.id] ?? "",
    fallback: get("playerViewDefault", "full")});
}

export function applyBodyClass() { document.body?.classList?.toggle("wodx-view-beginner", currentView() === "beginner"); }

/** The character the player plays now: the selected token's, else the assigned one. */
function myActor() { return canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character ?? null; }

function charCtx() {
  const actor = myActor();
  let kind = "";
  try { kind = actor ? (game.modules.get("wodx-actions")?.api?.getKind?.(actor) ?? "") : ""; } catch { kind = ""; }
  let year = null;
  try { year = currentYear(); } catch { year = null; }
  return {kind, year};
}

/* -------------------------------------------- */
/*  The toolbar drawers                         */
/* -------------------------------------------- */

let drawers = null;   // groupId -> {fit, more}, Beginner view only
let barTools = [];    // every token-control button this player may use, for Find anything

/** Registered at ready, after the Storyteller's per-player filter, so hidden buttons are already out. */
export function installViewFilter() {
  Hooks.on("getSceneControlButtons", controls => {
    const tokens = controls.tokens ?? controls.token;
    if ( !tokens?.tools ) return;
    tokens.tools.wodxFind = {name: "wodxFind", title: "Find anything (Ctrl+K): every button, action, page and setting",
      icon: "fa-solid fa-magnifying-glass", order: 109, button: true, visible: true, onChange: () => FindApp.open()};
    barTools = Object.values(tokens.tools).filter(t => t?.button && t.visible !== false && t.name !== "wodxFind")
      .map(t => ({name: t.name, title: t.title, icon: t.icon, onChange: t.onChange}));
    drawers = null;
    if ( currentView() !== "beginner" ) return;
    const sorted = R.sortTools(barTools.filter(t => t.name?.startsWith("wodx")), charCtx());
    drawers = sorted.drawers;
    R.GROUPS.forEach((g, i) => {
      const d = drawers[g.id];
      const n = d.fit.length + d.more.length;
      for ( const t of [...d.fit, ...d.more] ) tokens.tools[t.name].visible = false;
      if ( !n ) return;
      const name = `wodxGroup${g.id[0].toUpperCase()}${g.id.slice(1)}`;
      tokens.tools[name] = {name, title: `${g.label}: ${g.hint}`, icon: g.icon, order: 110 + i, button: true, visible: true,
        onChange: () => openDrawer(g.id, name)};
    });
  });
  // The drawers follow the character: a new assigned character or a new year can change what fits
  Hooks.on("updateUser", (user, change) => { if ( user === game.user && "character" in (change ?? {}) ) redraw(); });
  applyBodyClass();
  redraw();
}

function closeDrawer() {
  document.querySelector(".wodx-drawer")?.remove();
  document.removeEventListener("pointerdown", outside, true);
  document.removeEventListener("keydown", onKey, true);
}
function outside(ev) { if ( !ev.target.closest?.(".wodx-drawer") && !ev.target.closest?.("[data-tool^='wodxGroup']") ) closeDrawer(); }
function onKey(ev) { if ( ev.key === "Escape" ) closeDrawer(); }

/** Open one drawer beside its button. */
export function openDrawer(id, toolName) {
  const open = document.querySelector(`.wodx-drawer[data-group="${id}"]`);
  closeDrawer();
  if ( open ) return; // a second press closes it
  const g = R.GROUPS.find(x => x.id === id);
  const d = drawers?.[id];
  if ( !g || !d ) return;
  const row = t => `<button type="button" role="menuitem" data-tool-name="${esc(t.name)}"><i class="${esc(t.icon)}" aria-hidden="true"></i> <span>${esc(t.title)}</span></button>`;
  const el = document.createElement("div");
  el.className = "wodx wodx-drawer"; el.dataset.group = id; el.setAttribute("role", "menu"); el.setAttribute("aria-label", g.label);
  el.innerHTML = `<h3>${esc(g.label)}</h3>${d.fit.map(row).join("")}`
    + (d.more.length ? `<details${d.fit.length ? "" : " open"}><summary>More (usually for other lines or years)</summary>${d.more.map(row).join("")}</details>` : "");
  el.addEventListener("click", ev => {
    const b = ev.target.closest?.("button[data-tool-name]");
    if ( !b ) return;
    const t = [...d.fit, ...d.more].find(x => x.name === b.dataset.toolName);
    closeDrawer();
    try { t?.onChange?.(ev, true); } catch (e) { console.error("WoDX | drawer button", e); }
  });
  document.body.append(el);
  const anchor = document.querySelector(`#scene-controls [data-tool="${toolName}"]`);
  const r = anchor?.getBoundingClientRect?.();
  const top = Math.max(8, Math.min((r?.top ?? 80), window.innerHeight - el.offsetHeight - 8));
  el.style.left = `${Math.round((r?.right ?? 60) + 8)}px`;
  el.style.top = `${Math.round(top)}px`;
  el.querySelector("button")?.focus();
  document.addEventListener("pointerdown", outside, true);
  document.addEventListener("keydown", onKey, true);
}

/* -------------------------------------------- */
/*  The token menu: Act, Move, Look, Talk       */
/* -------------------------------------------- */

export function installHudGroups() {
  Hooks.on("renderTokenHUD", (hud, html) => {
    if ( currentView() !== "beginner" ) return;
    const root = html instanceof HTMLElement ? html : html?.[0] ?? hud?.element;
    // After every module's own hook has added its buttons
    setTimeout(() => groupHud(root), 0);
  });
}

function groupHud(root) {
  if ( !root?.isConnected || root.querySelector(".wodx-hud-group") ) return;
  const left = root.querySelector(".col.left");
  if ( !left ) return;
  const buckets = {};
  for ( const b of root.querySelectorAll(".col.left > .control-icon, .col.right > .control-icon") ) {
    if ( b.dataset.action ) continue; // Foundry's own
    const g = R.hudGroupOf(b.className);
    if ( !g || g === "keep" ) continue;
    (buckets[g] ??= []).push(b);
  }
  for ( const g of R.HUD_GROUPS ) {
    const list = buckets[g.id];
    if ( !list?.length ) continue;
    const wrap = document.createElement("div");
    wrap.className = "wodx-hud-group";
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "control-icon wodx-hud-toggle";
    btn.dataset.tooltip = g.label; btn.setAttribute("aria-label", g.label); btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = `<i class="${g.icon}" aria-hidden="true"></i>`;
    const fly = document.createElement("div");
    fly.className = "wodx-hud-flyout";
    fly.append(...list);
    btn.addEventListener("click", ev => {
      ev.preventDefault(); ev.stopPropagation();
      const on = !wrap.classList.contains("open");
      root.querySelectorAll(".wodx-hud-group.open").forEach(w => { w.classList.remove("open"); w.querySelector(".wodx-hud-toggle")?.setAttribute("aria-expanded", "false"); });
      wrap.classList.toggle("open", on); btn.setAttribute("aria-expanded", String(on));
    });
    wrap.append(btn, fly);
    left.append(wrap);
  }
}

/* -------------------------------------------- */
/*  Find anything                               */
/* -------------------------------------------- */

async function gather() {
  const out = [];
  for ( const t of barTools ) out.push({kind: "tool", label: t.title ?? t.name, hint: "", icon: t.icon, run: ev => t.onChange?.(ev, true)});
  const actor = myActor();
  const A = game.modules.get("wodx-actions");
  if ( actor && A?.active && A.api?.menuEntries ) {
    try {
      for ( const x of await A.api.menuEntries(actor) ) {
        out.push({kind: "action", label: x.label, hint: `${actor.name}. ${x.hint ?? ""}`, icon: "fa-solid fa-book-dead", run: () => A.api.runSpec(x.spec, actor)});
      }
    } catch (e) { console.warn("WoDX | Find anything: actions", e); }
  }
  for ( const j of game.journal ?? [] ) {
    if ( !j.testUserPermission?.(game.user, "OBSERVER") ) continue;
    for ( const p of j.pages ?? [] ) {
      if ( !p.testUserPermission?.(game.user, "OBSERVER") ) continue;
      out.push({kind: "page", label: p.name, hint: j.name, icon: "fa-solid fa-book-open", run: () => j.sheet?.render(true, {pageId: p.id})});
    }
  }
  for ( const s of game.settings.settings.values() ) {
    if ( !s.config ) continue;
    if ( s.scope === "world" && !game.user.isGM ) continue;
    if ( s.restricted && !game.user.isGM ) continue;
    const mod = game.modules.get(s.namespace)?.title ?? (s.namespace === "core" ? "Foundry" : s.namespace);
    const name = game.i18n.localize(s.name ?? s.key);
    out.push({kind: "setting", label: name, hint: `${mod}. ${game.i18n.localize(s.hint ?? "")}`, icon: "fa-solid fa-gear", run: () => openSetting(name)});
  }
  for ( const e of out ) e.kindLabel = R.KINDS[e.kind];
  return out;
}

async function openSetting(name) {
  const app = new foundry.applications.settings.SettingsConfig();
  await app.render({force: true});
  const box = app.element?.querySelector?.("input[type=search], input[name=filter]");
  if ( box ) { box.value = name; box.dispatchEvent(new Event("input", {bubbles: true})); }
}

export class FindApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-find", classes: ["wodx", "wodx-find"],
    window: {title: "Find anything", icon: "fa-solid fa-magnifying-glass", resizable: true},
    position: {width: 520, height: 560}
  };
  static #instance;
  static open() { this.#instance ??= new FindApp(); return this.#instance.render({force: true}); }
  #entries = [];
  #q = "";

  async _renderHTML() {
    this.#entries = await gather();
    const div = document.createElement("div");
    div.className = "wodx-body";
    div.innerHTML = `<input type="search" class="wodx-find-q" placeholder="What are you looking for? (feed, rage, letter, sound...)" aria-label="Find anything" value="${esc(this.#q)}">
      <p class="wodx-quiet wodx-find-count"></p><ul class="wodx-list wodx-find-list" role="listbox"></ul>`;
    return div;
  }
  _replaceHTML(result, content) {
    content.replaceChildren(result);
    const q = content.querySelector(".wodx-find-q");
    const list = content.querySelector(".wodx-find-list");
    const count = content.querySelector(".wodx-find-count");
    const draw = () => {
      this.#q = q.value;
      const found = R.search(this.#entries, q.value);
      count.textContent = q.value.trim() ? `${found.length ? found.length : "Nothing"} found${found.length === 40 ? " (the first 40; add a word to narrow it)" : ""}.`
        : `Type a word. ${this.#entries.length} buttons, actions, pages and settings to search.`;
      list.replaceChildren(...found.map((e, i) => {
        const li = document.createElement("li");
        li.innerHTML = `<button type="button" role="option" data-i="${i}"><i class="${esc(e.icon)}" aria-hidden="true"></i> <b>${esc(e.label)}</b> <span class="wodx-tag">${esc(e.kindLabel)}</span>${e.hint ? `<br><span class="wodx-quiet">${esc(String(e.hint).slice(0, 160))}</span>` : ""}</button>`;
        li.querySelector("button").addEventListener("click", ev => { this.close(); try { e.run(ev); } catch (err) { console.error("WoDX | Find anything", err); } });
        return li;
      }));
    };
    q.addEventListener("input", draw);
    q.addEventListener("keydown", ev => { if ( ev.key === "Enter" ) list.querySelector("button")?.click(); });
    draw();
    setTimeout(() => q.focus(), 0);
  }
}
