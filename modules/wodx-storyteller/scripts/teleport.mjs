/**
 * Teleport to the cursor (Storyteller only). The selected tokens, players' characters or NPCs alike, jump to a point
 * on the map without walking there: walls, movement cost and animation are skipped. Two ways in:
 *   the toolbar button: click it, then click the map where the tokens should go (right click or Escape cancels);
 *   the key (Alt+Shift+P by default, set in Configure Controls): the tokens go to where the cursor is now.
 * Where each one lands is worked out in teleport-rules.mjs. Each token is snapped to the grid unless the scene is
 * gridless. Elevation and level stay as they are.
 */
import * as R from "./teleport-rules.mjs";
import {MOD} from "./core.mjs";

const note = (kind, text) => ui.notifications?.[kind]?.(text);
const chosen = () => [...(canvas?.tokens?.controlled ?? [])].filter(t => t?.document);
const board = () => canvas?.app?.view ?? canvas?.app?.canvas ?? document.getElementById("board");
let lastMouse = null;
let armed = null;

/** The cursor's spot on the map, in scene pixels. */
export function cursorPoint() {
  const m = canvas?.mousePosition;
  if ( m && Number.isFinite(m.x) && Number.isFinite(m.y) ) return {x: m.x, y: m.y};
  return lastMouse;
}

function toScene(ev) {
  try {
    if ( typeof canvas.canvasCoordinatesFromClient === "function" ) return canvas.canvasCoordinatesFromClient({x: ev.clientX, y: ev.clientY});
    const r = board().getBoundingClientRect();
    return canvas.stage.worldTransform.applyInverse({x: ev.clientX - r.left, y: ev.clientY - r.top});
  } catch (e) { return cursorPoint(); }
}

function snapped(token, pos) {
  if ( canvas?.grid?.isGridless || canvas?.scene?.grid?.type === 0 ) return pos;
  try {
    const s = token.getSnappedPosition?.(pos) ?? token.document?.getSnappedPosition?.(pos);
    if ( s && Number.isFinite(s.x) && Number.isFinite(s.y) ) return {x: s.x, y: s.y};
  } catch (e) { /* unsnapped below */ }
  return pos;
}

/** Move the selected tokens (or the ones given) so the group's middle sits on the point. */
export async function teleport(point = cursorPoint(), tokens = chosen()) {
  if ( !game.user?.isGM ) return [];
  if ( !tokens.length ) { note("warn", "Select a token first, then teleport it."); return []; }
  if ( !point ) { note("warn", "Point at the map first."); return []; }
  const rect = canvas?.dimensions?.sceneRect ?? null;
  const parts = tokens.map(t => ({id: t.document.id, x: t.document.x, y: t.document.y, w: t.w ?? t.width ?? 0, h: t.h ?? t.height ?? 0}));
  const to = R.landing(parts, point, rect);
  const moved = [];
  for ( const spot of to ) {
    const token = tokens.find(t => t.document.id === spot.id);
    const doc = token.document;
    const pos = snapped(token, {x: spot.x, y: spot.y});
    let done = false;
    if ( typeof doc.move === "function" && CONFIG.Token?.movement?.actions?.displace ) {
      try { await doc.move([{x: pos.x, y: pos.y, action: "displace"}], {animate: false}); done = true; } catch (e) { /* plain update below */ }
    }
    if ( !done ) await doc.update({x: pos.x, y: pos.y}, {animate: false, teleport: true});
    moved.push({id: doc.id, ...pos});
  }
  return moved;
}

function disarm() {
  if ( !armed ) return;
  window.removeEventListener("pointerdown", armed.down, true);
  window.removeEventListener("keydown", armed.key, true);
  window.removeEventListener("contextmenu", armed.menu, true);
  const el = board();
  if ( el ) el.style.cursor = armed.cursor ?? "";
  armed = null;
}

/** The toolbar button: the next click on the map is where the selected tokens go. A second press cancels. */
export function arm() {
  if ( !game.user?.isGM ) return false;
  if ( armed ) { disarm(); note("info", "Teleport cancelled."); return false; }
  if ( !chosen().length ) { note("warn", "Select a token first, then teleport it."); return false; }
  const el = board();
  if ( !el ) return false;
  const down = ev => {
    if ( ev.target !== el ) return;
    ev.stopPropagation(); ev.preventDefault();
    if ( ev.button === 2 ) { disarm(); note("info", "Teleport cancelled."); return; }
    if ( ev.button !== 0 ) return;
    const point = toScene(ev);
    disarm();
    teleport(point).catch(e => console.error(`${MOD} |`, e));
  };
  const key = ev => { if ( ev.key === "Escape" ) { disarm(); note("info", "Teleport cancelled."); } };
  const menu = ev => { if ( ev.target === el ) { ev.preventDefault(); ev.stopPropagation(); } };
  armed = {down, key, menu, cursor: el.style.cursor};
  window.addEventListener("pointerdown", down, true);
  window.addEventListener("keydown", key, true);
  window.addEventListener("contextmenu", menu, true);
  el.style.cursor = "crosshair";
  note("info", "Click the map where the selected tokens should go. Right click or Escape cancels.");
  return true;
}

export const isArmed = () => !!armed;

export function registerTeleportKeys() {
  game.keybindings?.register?.(MOD, "teleport", {name: "Teleport the selected tokens to the cursor",
    hint: "Storyteller only. The selected tokens jump to where the cursor is on the map, through walls.",
    editable: [{key: "KeyP", modifiers: ["Alt", "Shift"]}], restricted: true,
    onDown: () => { if ( game.user.isGM ) teleport().catch(e => console.error(`${MOD} |`, e)); return true; }});
}

export function registerTeleportHooks() {
  window.addEventListener("pointermove", ev => {
    if ( canvas?.mousePosition || !canvas?.ready || ev.target !== board() ) return;
    try { lastMouse = toScene(ev); } catch (e) { /* keep the last one */ }
  }, {passive: true});
  Hooks.on("canvasTearDown", () => disarm());
}
