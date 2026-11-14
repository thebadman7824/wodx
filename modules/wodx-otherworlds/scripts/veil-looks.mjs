/**
 * WoDX Otherworlds: what only the right eyes see (B4634, show-don't-tell desk v14 and c4). Rules in veil-look-rules.mjs.
 *
 * Drawn on each client for its own viewer, never saved: a faint shimmer over the scene where the Gauntlet is thin, a
 * faint grey mist where the Shroud is thin, each only for a viewer whose character could see it; and a dark haze round
 * a Wyrm-tainted person, through WoDX Chronicle's token looks, only for a viewer who senses the Wyrm.
 */
import * as V from "./veil-look-rules.mjs";
import {MODULE_ID, placeOf as ratingsAt} from "./ratings.mjs";
import {natureOf} from "./senses.mjs";
import {taintOf} from "./corruption.mjs";
import {registersAsWyrm} from "./corruption-rules.mjs";

const chron = () => game.modules.get("wodx-chronicle")?.api ?? null;
const fxOff = () => { try { return game.settings.get("wodx-chronicle", "fxLevel") === "off"; } catch (e) { return false; } };

/** The viewer's own tokens on the scene being viewed: the controlled ones, else their character's. */
function myTokens() {
  const ctl = (canvas?.tokens?.controlled ?? []).filter(t => t.actor?.isOwner);
  if ( ctl.length ) return ctl;
  const c = game.user.character;
  return c ? (canvas?.tokens?.placeables ?? []).filter(t => t.actor?.id === c.id) : [];
}
const powersOf = actor => (actor?.items?.contents ?? [...(actor?.items ?? [])]).map(i => i.name);

/** What this viewer sees over the scene now: {shimmer, mist}. */
export function veilNow() {
  const none = {shimmer: false, mist: false};
  if ( fxOff() || !canvas?.scene ) return none;
  const mine = myTokens();
  if ( !mine.length ) return game.user.isGM ? V.veilFor(sceneRatings(), {gm: true}) : none;
  const out = {...none};
  for ( const t of mine ) {
    let r = {};
    try { r = ratingsAt(t.document); } catch (e) { r = {}; }
    const v = V.veilFor({gauntlet: r.gauntlet, shroud: r.ratings?.shroud}, {nature: natureOf(t.actor), gm: game.user.isGM});
    out.shimmer ||= v.shimmer; out.mist ||= v.mist;
  }
  return out;
}
function sceneRatings() {
  // the Storyteller with no token: the scene as a whole, read from a spot in its middle
  const s = canvas.scene, d = s.dimensions;
  try { const r = ratingsAt({parent: s, x: d.sceneX + d.sceneWidth / 2, y: d.sceneY + d.sceneHeight / 2, width: 1, height: 1, object: null}); return {gauntlet: r.gauntlet, shroud: r.ratings?.shroud}; }
  catch (e) { return {}; }
}

/** Does this viewer sense the Wyrm? */
export function viewerSensesWyrm() {
  if ( game.user.isGM ) return true;
  return myTokens().some(t => V.sensesWyrm({nature: natureOf(t.actor), powers: powersOf(t.actor)}));
}

let layer = null;
export function drawVeil() {
  if ( !canvas?.ready ) return;
  const v = veilNow();
  if ( !v.shimmer && !v.mist ) { layer?.destroy(); layer = null; return; }
  if ( !layer || layer.destroyed ) { layer = new PIXI.Graphics(); layer.eventMode = "none"; (canvas.interface ?? canvas.stage).addChild(layer); }
  const d = canvas.dimensions, rect = d.sceneRect ?? {x: d.sceneX, y: d.sceneY, width: d.sceneWidth, height: d.sceneHeight};
  layer.clear();
  if ( v.mist ) layer.beginFill(V.MIST.color, V.MIST.alpha).drawRect(rect.x, rect.y, rect.width, rect.height).endFill();
  if ( v.shimmer ) layer.beginFill(V.SHIMMER.color, V.SHIMMER.alpha).drawRect(rect.x, rect.y, rect.width, rect.height).endFill();
  layer.wodxVeil = v;
}

export function setupVeilLooks() {
  const soon = (() => { let h = null; return () => { clearTimeout(h); h = setTimeout(drawVeil, 150); }; })();
  Hooks.on("canvasReady", soon);
  Hooks.on("controlToken", soon);
  // who the viewer is looking through decides whether the Wyrm's haze shows: redraw the token looks too
  Hooks.on("controlToken", (() => { let h = null; return () => { clearTimeout(h); h = setTimeout(() => chron()?.tokenLooks?.refresh?.(), 150); }; })());
  Hooks.on("updateToken", (doc, ch) => { if ( "x" in ch || "y" in ch ) soon(); });
  Hooks.on("updateScene", (s, ch) => { if ( s.id === canvas?.scene?.id && ch?.flags?.[MODULE_ID] ) soon(); });
  // c4: the Wyrm's haze round a tainted person, for those who sense it
  const reg = () => chron()?.tokenLooks?.register?.("otherworlds.wyrm", token => (token?.actor && registersAsWyrm(taintOf(token.actor)) && taintOf(token.actor).level > 0 && viewerSensesWyrm() ? V.HAZE : null));
  if ( chron()?.tokenLooks ) reg(); else Hooks.once("wodxChronicleReady", reg);
  soon();
}

export const api = () => ({veilNow, viewerSensesWyrm, draw: drawVeil, rules: V});
