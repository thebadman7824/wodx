/**
 * The sheet in a player's Beginner view (Sheets 0.19.0, B2822 to B2825). Drawn after every render, on this screen only:
 *   - a quick roll row at the top of Core: common checks the player can add to and take from, and the line's powers;
 *     a click rolls at once, Shift+click opens the roll window first
 *   - Abilities at zero fold behind Show all
 *   - Settings, Effects, Body and the system's Wiki link sit behind a More tab button; the power tabs follow Core
 *   - hover help in plain words on traits and pools, and the first sentence of a power's own description
 * Full view draws the sheet as before. The rules are in beginner-rules.mjs.
 */
import * as B from "./beginner-rules.mjs";
import * as CK from "../../wodx-actions/scripts/checks-rules.js";
import {MENU_PLAN} from "../../wodx-actions/scripts/theme-rules.js";

const MOD = "wodx-sheets";
const SHOW_ALL = new Set();   // actor ids whose zero Abilities are shown this session
const TABS_OPEN = new Set();  // actor ids whose More tabs are open this session
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));

export function beginner() {
  try { return game.modules.get("wodx-chronicle")?.api?.playerView?.current?.() === "beginner"; } catch (e) { return false; }
}
const actionsApi = () => (game.modules.get("wodx-actions")?.active ? game.modules.get("wodx-actions").api : null);
const yearNow = () => { try { return Number(game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.()) || null; } catch (e) { return null; } };

export function decorate(sheet, html) {
  const root = html?.[0] ?? html;
  const actor = sheet?.actor;
  if ( !root?.querySelector || !actor || actor.limited || !beginner() ) return;
  root.classList.add("wodx-beginner");
  try { quickRow(root, actor, !!sheet.isEditable); } catch (e) { console.warn("WoDX Sheets | quick rolls", e); }
  try { foldZero(root, actor); } catch (e) { console.warn("WoDX Sheets | fold", e); }
  try { tuckTabs(root, actor); } catch (e) { console.warn("WoDX Sheets | tabs", e); }
  try { hoverHelp(root, actor); } catch (e) { console.warn("WoDX Sheets | help", e); }
}

/* Quick rolls (B2822) */
function quickRow(root, actor, editable) {
  const core = root.querySelector(".tab.core");
  if ( !core || core.querySelector(".wodx-quickrolls") ) return;
  const A = actionsApi();
  if ( !A?.quickCheck ) return;
  const known = new Set(CK.CHECKS.map(c => c.key));
  const list = B.quickList(actor.getFlag(MOD, "quickRolls"), known);
  const short = c => c.label.replace(/\s*\(.*\)\s*$/, "");
  const kind = (() => { try { return A.getKind?.(actor) ?? ""; } catch (e) { return ""; } })();
  const power = B.powerSpec(kind, MENU_PLAN);
  const btns = list.map(k => CK.byKey(k)).filter(Boolean).map(c =>
    `<button type="button" class="wodx-quick" data-check="${esc(c.key)}" data-tooltip="${esc(`${c.label}. Click to roll; Shift+click to change the roll first${editable ? "; right-click to take it off this row" : ""}.`)}">${esc(short(c))}</button>`);
  if ( power && A.runSpec ) btns.push(`<button type="button" class="wodx-quick wodx-quick-power" data-spec="${esc(power)}" data-tooltip="Your powers: pick one and roll it."><i class="fa-solid fa-wand-sparkles" aria-hidden="true"></i> Your powers</button>`);
  const add = editable ? `<select class="wodx-quick-add" aria-label="Add a quick roll"><option value="">Add a roll...</option>${
    CK.CHECKS.filter(c => !list.includes(c.key)).map(c => `<option value="${esc(c.key)}">${esc(c.label)}</option>`).join("")}</select>` : "";
  core.insertAdjacentHTML("afterbegin", `<div class="wodx-quickrolls" role="group" aria-label="Quick rolls"><span class="wodx-quick-head">Quick rolls</span>${btns.join("")}${add}</div>`);
  const row = core.querySelector(".wodx-quickrolls");
  row.addEventListener("click", ev => {
    const b = ev.target.closest?.("button.wodx-quick");
    if ( !b ) return;
    ev.preventDefault();
    if ( b.dataset.spec ) return A.runSpec(b.dataset.spec, actor);
    return A.quickCheck({actor, check: b.dataset.check, direct: !ev.shiftKey});
  });
  row.addEventListener("contextmenu", async ev => {
    const b = ev.target.closest?.("button.wodx-quick[data-check]");
    if ( !b || !editable ) return;
    ev.preventDefault();
    await actor.setFlag(MOD, "quickRolls", B.toggleQuick(list, b.dataset.check));
  });
  row.querySelector(".wodx-quick-add")?.addEventListener("change", async ev => {
    const k = ev.target.value;
    if ( !k ) return;
    const next = B.toggleQuick(list, k);
    if ( !next ) { ui.notifications.info(`The row holds ${B.QUICK_MAX} rolls. Right-click one to take it off first.`); ev.target.value = ""; return; }
    await actor.setFlag(MOD, "quickRolls", next);
  });
}

/* Abilities at zero fold behind Show all (B2823) */
function foldZero(root, actor) {
  const rows = [];
  for ( const lab of root.querySelectorAll(".tab.core label.vrollable[data-ability], .tab.core label.wodx-missing") ) {
    const row = lab.closest(".wodx-row, .clearareaBox");
    if ( !row ) continue;
    const v = row.querySelector(".resource-value[data-value]");
    if ( lab.classList.contains("wodx-missing") || (v && Number(v.dataset.value) === 0) ) rows.push(row);
  }
  if ( !rows.length ) return;
  rows.forEach(r => r.classList.add("wodx-zero"));
  const area = rows[0].closest(".wodx-cols, .area-box, .clearareaBox")?.parentElement ?? rows[0].parentElement;
  if ( area.querySelector(":scope > .wodx-showall") ) return;
  const open = SHOW_ALL.has(actor.id);
  root.classList.toggle("wodx-zero-shown", open);
  const btn = document.createElement("button");
  btn.type = "button"; btn.className = "wodx-showall";
  const label = () => (root.classList.contains("wodx-zero-shown") ? `Hide the ${rows.length} at zero` : `Show all (${rows.length} more at zero)`);
  btn.textContent = label();
  btn.setAttribute("aria-expanded", String(open));
  btn.addEventListener("click", ev => {
    ev.preventDefault();
    const on = root.classList.toggle("wodx-zero-shown");
    if ( on ) SHOW_ALL.add(actor.id); else SHOW_ALL.delete(actor.id);
    btn.textContent = label(); btn.setAttribute("aria-expanded", String(on));
  });
  area.append(btn);
}

/* Fewer tabs at a time (B2824) */
function tuckTabs(root, actor) {
  const nav = root.querySelector("nav.sheet-tabs[data-group='primary']");
  if ( !nav || nav.querySelector(".wodx-tab-more") ) return;
  const items = [...nav.children].filter(x => x.classList.contains("item"));
  const {order, tucked} = B.tabOrder(items.map(x => x.dataset.tab ?? ""));
  if ( !tucked.length ) return;
  for ( const i of order ) nav.append(items[i]);
  for ( const i of tucked ) items[i].classList.add("wodx-tucked");
  const more = document.createElement("a");
  more.className = "item wodx-tab-icon wodx-tab-more";
  more.dataset.tooltip = "More tabs: settings, effects, body"; more.setAttribute("aria-label", "More tabs");
  more.innerHTML = `<i class="fa-solid fa-ellipsis" aria-hidden="true"></i>`;
  // The line's own tile and glyph colours, as the other WoDX tab buttons take them (layout rules, 12 November)
  const tile = nav.querySelector(".wodx-tab-icon:not(.wodx-tab-more)")?.style;
  for ( const v of ["--wodx-tab-tile", "--wodx-tab-glyph"] ) if ( tile?.getPropertyValue(v) ) more.style.setProperty(v, tile.getPropertyValue(v));
  const firstTucked = items[tucked[0]];
  nav.insertBefore(more, firstTucked);
  const active = items.some((x, i) => tucked.includes(i) && x.classList.contains("active"));
  nav.classList.toggle("wodx-tabs-open", TABS_OPEN.has(actor.id) || active);
  more.addEventListener("click", ev => {
    ev.preventDefault(); ev.stopPropagation();
    const on = nav.classList.toggle("wodx-tabs-open");
    if ( on ) TABS_OPEN.add(actor.id); else TABS_OPEN.delete(actor.id);
  });
}

/* Hover help in plain words (B2825) */
function hoverHelp(root, actor) {
  const year = yearNow();
  for ( const el of root.querySelectorAll("label.vrollable, .sheet-banner-text, .headlineNormal, label") ) {
    if ( el.dataset.tooltip || el.title ) continue;
    const h = B.helpFor(el.textContent, {year});
    if ( h ) el.dataset.tooltip = h;
  }
  for ( const el of root.querySelectorAll(".width-namebox[data-itemid]") ) {
    if ( el.dataset.tooltip ) continue;
    const it = actor.items.get(el.dataset.itemid);
    const s = B.firstSentence(it?.system?.description ?? "");
    if ( s ) el.dataset.tooltip = s;
  }
}
