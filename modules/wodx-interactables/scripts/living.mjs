/**
 * WoDX Interactables 0.15.0: living maps in the world. The rules are in living-rules.mjs.
 *
 * The active Storyteller's client looks at every tile with a living rule, on every scene, whenever the moment
 * changes (the date, day or night, tonight's weather, the church day, the dated events that have happened), and shows,
 * hides or repaints it. Nothing is done while WoDX Chronicle holds the world. A Storyteller can force a look with
 * api.living.sync({force: true}).
 */
import * as L from "./living-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const MOD = "wodx-interactables";
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const flagsOf = doc => doc?.flags?.[MOD] ?? {};
const tilesOf = scene => scene?.tiles?.contents ?? [...(scene?.tiles?.values?.() ?? [])];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const chron = () => game.modules.get("wodx-chronicle")?.api;

let CAL = null;
let lastKey = null, running = null;

/** The moment, as the rules read it. */
export async function context(time = game.time.worldTime) {
  CAL ??= await import("../../wodx-chronicle/scripts/calendar.mjs");
  let lat = 50;
  try { lat = game.settings.get("wodx-chronicle", "latitude"); } catch (e) { lat = 50; }
  const d = CAL.describeTime(time, lat);
  let church = null, weather = [], fired = [];
  try { church = chron()?.church?.on?.(d) ?? null; } catch (e) { church = null; }
  try { weather = game.modules.get("wodx-atmosphere")?.active ? (game.modules.get("wodx-atmosphere").api?.weather?.now?.()?.tags ?? []) : []; } catch (e) { weather = []; }
  try { fired = chron()?.events?.fired?.() ?? []; } catch (e) { fired = []; }
  return {year: d.year, month: d.month, day: d.day, isNight: d.isNight, church, weather, fired};
}

/** Every tile with a living rule that is switched on, on every scene. */
export function livingTiles() {
  const out = [];
  for ( const s of game.scenes ?? [] ) for ( const t of tilesOf(s) ) {
    const r = flagsOf(t).living;
    if ( r && r.mode && r.mode !== "off" ) out.push(t);
  }
  return out;
}

/** Bring one tile in line with its rule for a context. Returns the change made, or null. */
export async function syncOne(tile, ctx) {
  const rule = flagsOf(tile).living;
  if ( !rule ) return null;
  const on = L.holds(rule, ctx);
  const ch = L.changeFor(rule, on, {hidden: tile.hidden, src: tile.texture?.src ?? null, base: flagsOf(tile).livingBase ?? null});
  if ( !Object.keys(ch).length ) return null;
  const update = {};
  if ( "hidden" in ch ) update.hidden = ch.hidden;
  if ( ch.src ) update["texture.src"] = ch.src;
  if ( ch.base ) update[`flags.${MOD}.livingBase`] = ch.base;
  await tile.update(update, {wodxArt: true, wodxLiving: true});
  return {tile: tile.id, scene: tile.parent?.id, on, ...ch};
}

/** Look at every living tile. force: even when the moment has not changed, or the world is held. */
export async function sync({force = false} = {}) {
  if ( !isActiveGM() ) return [];
  if ( !force ) { try { if ( chron()?.isHeld?.() || chron()?.isSkipping?.() ) return []; } catch (e) { /* no Chronicle hold */ } }
  if ( running ) return running;
  running = (async () => {
    const ctx = await context();
    const key = L.momentKey(ctx);
    if ( !force && key === lastKey ) return [];
    lastKey = key;
    const done = [];
    for ( const t of livingTiles() ) {
      try { const c = await syncOne(t, ctx); if ( c ) done.push(c); } catch (e) { console.error(`${MOD} | living map`, e); }
    }
    return done;
  })();
  try { return await running; } finally { running = null; }
}

/* ------------------------------------------------------------------ */
/*  The tile config                                                    */
/* ------------------------------------------------------------------ */

export function livingConfigHtml(tile) {
  const r = L.cleanRule(flagsOf(tile).living ?? {});
  const p = `flags.${MOD}.living`;
  const events = (() => { try { return chron()?.events?.list?.() ?? []; } catch (e) { return []; } })();
  const field = (label, inner, hint = "") => `<div class="form-group"><label>${esc(label)}</label><div class="form-fields">${inner}</div>${hint ? `<p class="hint">${esc(hint)}</p>` : ""}</div>`;
  const modes = Object.entries(L.MODES).map(([k, v]) => `<option value="${k}"${k === r.mode ? " selected" : ""}>${esc(v)}</option>`).join("");
  const conds = Object.entries(L.CONDITIONS).map(([k, v]) => `<label class="checkbox"><input type="checkbox" name="${p}.when.${k}"${r.when.includes(k) ? " checked" : ""}> ${esc(v)}</label>`).join("");
  const evOpts = [`<option value="">No event</option>`, ...events.map(e => `<option value="${esc(e.id)}"${e.id === r.event ? " selected" : ""}>${esc(`${e.year} ${e.name}`)}</option>`)].join("");
  return `<fieldset class="wix-config wix-living"><legend>WoDX: living map</legend>
    <p class="hint">The tile follows the clock: snow on the roofs in winter, lanterns on a night of revel, a burned mill after a year. Every condition ticked must hold. While the world is held nothing changes.</p>
    ${field("What it does", `<select name="${p}.mode" data-fixed>${modes}</select>`)}
    <div class="form-group stacked"><label>When</label><div class="form-fields wix-living-conds">${conds}</div></div>
    ${field("A dated event", `${events.length > 5 ? searchBox(".wix-living select[name$='living.event']", "Search events…", "Search events") : ""}<select name="${p}.event">${evOpts}</select><select name="${p}.eventWhen" data-fixed><option value="after"${r.eventWhen === "after" ? " selected" : ""}>after it</option><option value="before"${r.eventWhen === "before" ? " selected" : ""}>before it</option></select>`)}
    ${field("Years", `<input type="number" name="${p}.from" value="${r.from ?? ""}" placeholder="From"> <input type="number" name="${p}.to" value="${r.to ?? ""}" placeholder="To">`, "Both included; leave either empty.")}
    ${field("Picture while it holds", `<input type="text" name="${p}.art" value="${esc(r.art ?? "")}" placeholder="Path to a file"><button type="button" class="wix-pick" data-target="${p}.art" data-type="image" title="Browse"><i class="fa-solid fa-file-import"></i></button>`, "For \"Changes picture\". Night pictures for night maps.")}
    <p class="hint">${esc(L.ruleWords(r, id => events.find(e => e.id === id)?.name ?? id))}</p>
  </fieldset>`;
}

function onRenderTileConfig(app, html) {
  if ( !game.user.isGM ) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  const form = root?.tagName === "FORM" ? root : root?.querySelector("form") ?? app.form;
  if ( !form || form.querySelector(".wix-living") ) return;
  const wrap = document.createElement("div");
  wrap.innerHTML = livingConfigHtml(app.document ?? app.object);
  const el = wrap.firstElementChild;
  const footer = form.querySelector("footer, .form-footer, .sheet-footer");
  if ( footer ) footer.before(el); else form.appendChild(el);
  el.querySelectorAll("button.wix-pick").forEach(b => b.addEventListener("click", ev => {
    ev.preventDefault();
    const input = form.querySelector(`[name="${b.dataset.target}"]`);
    const FP = foundry.applications?.apps?.FilePicker?.implementation ?? globalThis.FilePicker;
    if ( !FP || !input ) return;
    new FP({type: b.dataset.type, current: input.value, callback: path => { input.value = path; }}).render(true);
  }));
  app.setPosition?.({height: "auto"});
}

function onPreUpdateTile(doc, changes) {
  const lv = changes?.flags?.[MOD]?.living;
  if ( !lv || typeof lv !== "object" ) return;
  // A form sends the ticked boxes as {winter: true, ...}; keep the stored rule clean
  changes.flags[MOD].living = L.cleanRule({...(flagsOf(doc).living ?? {}), ...lv, when: lv.when ?? flagsOf(doc).living?.when ?? []});
}

export function setupLiving() {
  Hooks.on("renderTileConfig", onRenderTileConfig);
  Hooks.on("preUpdateTile", onPreUpdateTile);
  Hooks.on("updateWorldTime", () => { if ( isActiveGM() ) sync().catch(e => console.error(`${MOD} |`, e)); });
  Hooks.on("wodxEventFired", () => { lastKey = null; if ( isActiveGM() ) sync().catch(e => console.error(`${MOD} |`, e)); });
  Hooks.on("updateTile", (doc, changes, options) => {
    if ( options?.wodxLiving || !isActiveGM() || !changes?.flags?.[MOD]?.living ) return;
    context().then(ctx => syncOne(doc, ctx)).catch(e => console.error(`${MOD} |`, e));
  });
  Hooks.once("ready", () => { if ( isActiveGM() ) sync().catch(e => console.error(`${MOD} |`, e)); });
  return {sync, syncOne, context, livingTiles, livingConfigHtml, rules: L};
}
