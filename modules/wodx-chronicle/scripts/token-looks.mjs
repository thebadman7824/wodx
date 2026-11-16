/**
 * WoDX Chronicle: tokens show what grips them (B4632, show-don't-tell desk c1 and c3). Rules in token-look-rules.mjs.
 *
 * Drawn on each client from the token's statuses and flags, so nothing is saved and every viewer sees what their own
 * character could: Frenzy's red glow and shake and Rotschreck's cold flicker for everyone; a derangement bout as the
 * edges of the screen for the character's own player only. Other modules add looks with registerTokenLook(key, fn),
 * where fn(token) returns a look ({tint, aura, shake, flicker}) or null; a look can depend on who is watching.
 * Each player's effects level (client setting wodx-chronicle.fxLevel, when WoDX Chronicle's shared looks set it up)
 * is obeyed: Light drops the movement, Off shows nothing.
 */
import * as R from "./token-look-rules.mjs";
import {MODULE_ID} from "./util.mjs";
import {STATUS_PREFIX} from "./conditions.mjs";

const lookers = new Map();
/** Add a token look from another module: fn(token) -> look or null. */
export function registerTokenLook(key, fn) { if ( typeof fn === "function" ) lookers.set(String(key), fn); refreshAll(); }

const fxLevel = () => { try { return game.settings.get(MODULE_ID, "fxLevel") ?? "full"; } catch (e) { return "full"; } };
const has = (token, id) => !!token?.actor?.statuses?.has?.(STATUS_PREFIX + id);

/** The looks a token has now, for this viewer. */
export function looksOf(token) {
  const out = [];
  for ( const [id, look] of Object.entries(R.CONDITION_LOOKS) ) if ( R.conditionOn(id, {hasStatus: has(token, id), system: token?.actor?.system}) ) out.push(look);
  for ( const fn of lookers.values() ) { try { const l = fn(token); if ( l ) out.push(l); } catch (e) { /* a broken look shows nothing */ } }
  return R.combine(out, fxLevel());
}

function apply(token) {
  if ( !token?.mesh ) return;
  const look = looksOf(token);
  const st = token._wodxLook ?? (token._wodxLook = {aura: null, baseTint: null});
  // the aura: a soft disc under the token
  if ( look?.aura ) {
    if ( !st.aura || st.aura.destroyed ) { st.aura = new PIXI.Graphics(); st.aura.eventMode = "none"; token.addChildAt(st.aura, 0); }
    const w = token.w ?? token.document.width * canvas.grid.size, h = token.h ?? token.document.height * canvas.grid.size;
    st.aura.blendMode = PIXI.BLEND_MODES.ADD;
    st.aura.clear().beginFill(look.aura.color, 1).drawEllipse(w / 2, h / 2, w * look.aura.radius, h * look.aura.radius).endFill();
    st.aura.alpha = look.aura.alpha;
    st.auraAlpha = look.aura.alpha;
  } else if ( st.aura ) { st.aura.destroy(); st.aura = null; }
  if ( look?.tint !== null && look?.tint !== undefined ) { token.mesh.tint = look.tint; st.tinted = true; }
  else if ( st.tinted ) { try { token.mesh.tint = Number(token.document.texture?.tint ?? 0xffffff); } catch (e) { token.mesh.tint = 0xffffff; } st.tinted = false; }
  // the mesh sits in the canvas's primary group at the token's middle: shake about where the refresh put it
  st.baseX = token.mesh.x;
  st.shake = look?.shake ?? 0;
  st.flicker = !!look?.flicker;
  st.on = !!look;
  if ( st.on ) moving.add(token); else { moving.delete(token); }
}

/** Shake and flicker, a few frames a second. */
const moving = new Set();
let ticking = false;
function tick() {
  const t = performance.now() / 1000;
  for ( const token of moving ) {
    const st = token._wodxLook;
    if ( !token.mesh || token.destroyed || !st?.on ) { moving.delete(token); continue; }
    if ( st.shake ) token.mesh.x = st.baseX + Math.sin(t * 40) * st.shake;
    if ( st.flicker && st.aura ) st.aura.alpha = st.auraAlpha * (0.6 + 0.4 * Math.abs(Math.sin(t * 7)));
  }
}

export function refreshAll() {
  if ( !globalThis.canvas?.ready ) return;
  for ( const t of canvas.tokens?.placeables ?? [] ) apply(t);
  refreshEdge();
}

/* ---- the screen edge, for the character's own player ---- */
let edgeEl = null;
function myCharacters() {
  const out = new Set();
  if ( game.user.character ) out.add(game.user.character);
  for ( const t of canvas?.tokens?.controlled ?? [] ) if ( t.actor?.isOwner ) out.add(t.actor);
  return [...out];
}
export function edgeNow() {
  if ( game.user.isGM || fxLevel() === "off" ) return null;
  for ( const a of myCharacters() ) {
    const bout = a.getFlag?.(MODULE_ID, "bout");
    if ( a.statuses?.has?.(STATUS_PREFIX + "deranged") ) return R.edgeOf(bout?.keys ?? []) ?? "dark";
  }
  return null;
}
function refreshEdge() {
  const edge = edgeNow();
  if ( !edge ) { edgeEl?.remove(); edgeEl = null; return; }
  if ( !edgeEl ) {
    edgeEl = document.createElement("div");
    edgeEl.id = "wodx-derangement-edge";
    edgeEl.setAttribute("aria-hidden", "true");
    document.body.appendChild(edgeEl);
  }
  edgeEl.style.cssText = `position:fixed;inset:0;pointer-events:none;z-index:30;background:${R.EDGE_CSS[edge]};${edge === "swim" && fxLevel() === "full" ? "animation:wodx-edge-swim 6s ease-in-out infinite;" : ""}`;
  edgeEl.dataset.edge = edge;
}

export function setupTokenLooks() {
  if ( !document.getElementById("wodx-edge-style") ) {
    const s = document.createElement("style");
    s.id = "wodx-edge-style";
    s.textContent = "@keyframes wodx-edge-swim{0%,100%{transform:scale(1);filter:blur(0)}50%{transform:scale(1.04);filter:blur(2px)}}";
    document.head.appendChild(s);
  }
  Hooks.on("refreshToken", t => apply(t));
  Hooks.on("canvasReady", () => refreshAll());
  Hooks.on("controlToken", () => refreshEdge());
  const soon = (() => { let h = null; return () => { clearTimeout(h); h = setTimeout(refreshAll, 100); }; })();
  for ( const k of ["createActiveEffect", "deleteActiveEffect", "updateActiveEffect", "updateActor", "updateToken"] ) Hooks.on(k, soon);
  if ( !ticking && globalThis.canvas?.app?.ticker ) { canvas.app.ticker.add(tick); ticking = true; }
  Hooks.on("canvasReady", () => { if ( !ticking && canvas.app?.ticker ) { canvas.app.ticker.add(tick); ticking = true; } });
  refreshAll();
}

export const api = () => ({register: registerTokenLook, looksOf, edgeNow, refresh: refreshAll, rules: R});
