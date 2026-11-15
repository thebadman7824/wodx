/**
 * The line skins, loaded line by line (B6060 to B6062). styles/wodx-skins.css (on every page) holds only the fonts and
 * the loading rule; each line's papers and rules sit in styles/skins/<line>.css and load the first time a sheet of
 * that line draws, so a page never parses the skins of lines nobody has open.
 * Each file goes in straight after styles/wodx-skins.css, in the order of skins-index.mjs, so the cascade is the one
 * the single stylesheet had and nothing looks different. While a sheet's file is on its way, its page waits blank
 * (class wodx-wait-skin) rather than flashing the system's look.
 */
import { SKINS } from "./skins-index.mjs";

const CORE = "wodx-sheets/styles/wodx-skins.css";
const loading = new Map(), ready = new Set();
const WAIT_MS = 4000;

const coreLink = () => [...document.querySelectorAll('link[rel="stylesheet"]')].find(l => (l.getAttribute("href") ?? "").includes(CORE)) ?? null;

/** Where a line's file is: beside the core stylesheet, so a route prefix on the server is kept. */
function urlOf(id) {
  const core = coreLink();
  if (core) return new URL(`skins/${id}.css`, core.href).href;
  const path = `modules/${CORE.replace("wodx-skins.css", "")}skins/${id}.css`;
  return globalThis.foundry?.utils?.getRoute ? foundry.utils.getRoute(path) : `/${path}`;
}

/** Put a line's link where the single stylesheet had that line: after the core sheet and every earlier line. */
function place(link, order) {
  const before = [...document.querySelectorAll("link[data-wodx-skin]")].filter(l => +l.dataset.order < order);
  const after = before.at(-1) ?? coreLink();
  if (after) after.after(link); else document.head.append(link);
}

/** Load one line's skin (once). Resolves when it has loaded, failed, or taken too long. */
export function load(id) {
  const order = SKINS.findIndex(s => s.id === id);
  if (order < 0) return Promise.resolve(false);
  if (!loading.has(id)) loading.set(id, new Promise(resolve => {
    const link = document.createElement("link");
    link.rel = "stylesheet"; link.href = urlOf(id);
    link.dataset.wodxSkin = id; link.dataset.order = String(order);
    const done = ok => { if (ok) ready.add(id); resolve(ok); };
    link.addEventListener("load", () => done(true), { once: true });
    link.addEventListener("error", () => { console.warn(`WoDX Sheets | the ${id} skin did not load`); done(false); }, { once: true });
    setTimeout(() => done(false), WAIT_MS);
    place(link, order);
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
const onRender = (app, html) => { const el = elOf(app, html); if (el) dress(el); };

/** Watch every sheet as it draws, on either sheet engine. */
export function setup() {
  Hooks.on("renderApplication", onRender);
  Hooks.on("renderApplicationV2", onRender);
}

/** For gates and the console: which line skins this page has loaded. */
export const loaded = () => [...ready];
