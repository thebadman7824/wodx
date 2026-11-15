/**
 * The line skins, loaded line by line (B6060 to B6063). styles/wodx-skins.css (on every page) holds only the fonts and
 * the loading rule; each line's papers and rules sit in styles/skins/<line>.css and load the first time a sheet of
 * that line draws, so a page never parses the skins of lines nobody has open.
 * Each file goes in exactly where the core sheet sits, after it and after any earlier line, in the order of
 * skins-index.mjs, so the cascade is the one the single stylesheet had and nothing looks different. Foundry may bring
 * the core sheet in as a <link> or as an @import into a cascade layer: a line file follows the same way, into the same
 * layer (B6063). While a sheet's file is on its way, its page waits blank (class wodx-wait-skin) rather than flashing
 * the system's look.
 */
import { SKINS } from "./skins-index.mjs";

const CORE = "wodx-sheets/styles/wodx-skins.css";
const loading = new Map(), ready = new Set();
const WAIT_MS = 4000;
const seen = { hooks: 0, observed: 0, how: null, layer: null, failed: [] };

const rulesOf = sheet => { try { return [...sheet.cssRules]; } catch { return []; } };

/** The core skins stylesheet as the page has it: its own sheet, however it came in. */
function coreSheet() {
  const walk = sheet => {
    if ((sheet.href ?? "").includes(CORE)) return sheet;
    for (const r of rulesOf(sheet)) if (r instanceof CSSImportRule && r.styleSheet) { const f = walk(r.styleSheet); if (f) return f; }
    return null;
  };
  for (const s of document.styleSheets) { const f = walk(s); if (f) return f; }
  return null;
}

/** Where a line's file is: beside the core stylesheet, so a route prefix on the server is kept. */
function urlOf(id, core = coreSheet()) {
  if (core?.href) return new URL(`skins/${id}.css`, core.href).href;
  const path = `modules/${CORE.replace("wodx-skins.css", "")}skins/${id}.css`;
  return globalThis.foundry?.utils?.getRoute ? foundry.utils.getRoute(path) : `/${path}`;
}

const lineOrder = href => { const m = /styles\/skins\/([a-z0-9-]+)\.css/i.exec(href ?? ""); return m ? SKINS.findIndex(s => s.id === m[1]) : -1; };

/** As a <link> or <style> after the core sheet's own node and every earlier line's node. */
function placeNode(node, order, anchor) {
  const before = [...document.querySelectorAll("[data-wodx-skin]")].filter(n => +n.dataset.order < order);
  const after = before.at(-1) ?? anchor;
  if (after?.parentNode) after.after(node); else document.head.append(node);
}

/** Wait for an @import rule's sheet to arrive. */
function importLoaded(rule) {
  return new Promise(resolve => {
    const t0 = Date.now();
    const tick = () => {
      const s = rule.styleSheet;
      if (s && rulesOf(s).length) return resolve(true);
      if (Date.now() - t0 > WAIT_MS) return resolve(false);
      setTimeout(tick, 40);
    };
    tick();
  });
}

/** Put one line's file in place; resolves true once it has loaded. */
function attach(id, order) {
  const core = coreSheet(), url = urlOf(id, core);
  const viaLink = () => new Promise(resolve => {
    const link = document.createElement("link");
    link.rel = "stylesheet"; link.href = url; link.dataset.wodxSkin = id; link.dataset.order = String(order);
    link.addEventListener("load", () => resolve(true), { once: true });
    link.addEventListener("error", () => resolve(false), { once: true });
    setTimeout(() => resolve(false), WAIT_MS);
    placeNode(link, order, core?.ownerNode ?? null);
  });
  const owner = core?.ownerRule;
  if (!(owner instanceof CSSImportRule)) { seen.how = "link"; return viaLink(); }
  // The core sheet is an @import: the line file is imported into the same sheet, just after the core sheet and the
  // earlier lines, into the same layer
  const parent = owner.parentStyleSheet, layer = owner.layerName;
  seen.how = "import"; seen.layer = layer;
  const text = `@import url("${url}")${layer ? ` layer(${layer})` : ""};`;
  const rules = rulesOf(parent);
  let at = rules.indexOf(owner) + 1;
  while (at < rules.length && rules[at] instanceof CSSImportRule && lineOrder(rules[at].href) >= 0 && lineOrder(rules[at].href) < order) at++;
  try {
    parent.insertRule(text, at);
    return importLoaded(parent.cssRules[at]);
  } catch (e) {
    // A sheet that will not take a new @import: a <style> of its own just after the one that imports the core sheet
    seen.how = "style";
    const style = document.createElement("style");
    style.textContent = text; style.dataset.wodxSkin = id; style.dataset.order = String(order);
    placeNode(style, order, parent.ownerNode ?? null);
    return importLoaded(rulesOf(style.sheet)[0] ?? {});
  }
}

/** Load one line's skin (once). Resolves when it has loaded, failed, or taken too long. */
export function load(id) {
  const order = SKINS.findIndex(s => s.id === id);
  if (order < 0) return Promise.resolve(false);
  if (!loading.has(id)) loading.set(id, attach(id, order).then(ok => {
    if (ok) ready.add(id);
    else { seen.failed.push(id); loading.delete(id); console.warn(`WoDX Sheets | the ${id} skin did not load`); }
    return ok;
  }));
  return loading.get(id);
}

/** The lines whose skins a sheet's window wears. */
export const linesOf = win => SKINS.filter(s => { try { return win.matches(s.test); } catch { return false; } }).map(s => s.id);

/** Make sure a drawn sheet has its line's skin; the page waits blank while the file loads. */
export function dress(el) {
  if (!document.body.classList.contains("wodx-skin")) return Promise.resolve();
  const win = el?.closest?.(".wod20.wod-sheet");
  if (!win) return Promise.resolve();
  const need = linesOf(win).filter(id => !ready.has(id));
  if (!need.length) { win.classList.remove("wodx-wait-skin"); return Promise.resolve(); }
  win.classList.add("wodx-wait-skin");
  return Promise.all(need.map(load)).then(() => win.classList.remove("wodx-wait-skin"));
}

/** Every open sheet (when the Sheet look is turned back to WoDX). */
export const dressAll = () => Promise.all([...document.querySelectorAll(".wod20.wod-sheet")].map(dress));

const elOf = (app, html) => {
  const h = html?.[0] ?? html;
  if (h instanceof HTMLElement) return h;
  const e = app?.element?.[0] ?? app?.element;
  return e instanceof HTMLElement ? e : null;
};
const onRender = (app, html) => { seen.hooks++; const el = elOf(app, html); if (el) dress(el); };

/** Watch every sheet as it draws, on either sheet engine; a watch on the page catches any window the hooks miss. */
export function setup() {
  for (const h of ["renderApplication", "renderApplicationV2", "renderActorSheet", "renderActorSheetV2"]) Hooks.on(h, onRender);
  const watch = () => new MutationObserver(list => {
    for (const m of list) for (const n of m.addedNodes) {
      if (n.nodeType !== 1) continue;
      // Only the node itself and its parents are looked at, so a busy page pays next to nothing
      if (n.closest?.(".wod20.wod-sheet")) { seen.observed++; dress(n); }
    }
  }).observe(document.body, { childList: true, subtree: true });
  document.body ? watch() : document.addEventListener("DOMContentLoaded", watch, { once: true });
}

/** For gates and the console: which line skins this page has loaded. */
export const loaded = () => [...ready];
/** For gates: how the core sheet came in and what the loader has seen. */
export const report = () => ({ ...seen, core: coreSheet()?.href ?? null, ready: [...ready], failed: [...seen.failed] });
