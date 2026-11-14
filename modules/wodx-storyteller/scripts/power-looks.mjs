/**
 * WoDX Storyteller: places of power glow for those who could see them (B4635, show-don't-tell desk v13). Rules in
 * power-look-rules.mjs.
 *
 * Drawn on each client for its own viewer, never saved: on the scene of a Node, a caern or a freehold, a soft glow (or
 * for a balefire, a flickering flame) at the scene's heart, sized and dimmed by the place's strength, seen only by a
 * viewer whose character could see it (WoDX Otherworlds' nature of the viewer's tokens) and by the Storyteller.
 */
import * as L from "./power-look-rules.mjs";
import * as Power from "./power.mjs";
import {MOD} from "./core.mjs";

const natureOf = actor => { try { return game.modules.get("wodx-otherworlds")?.api?.senses?.natureOf?.(actor) ?? "human"; } catch (e) { return "human"; } };
const fxLevel = () => { try { return game.settings.get("wodx-chronicle", "fxLevel") ?? "full"; } catch (e) { return "full"; } };

function viewers() {
  const ctl = (canvas?.tokens?.controlled ?? []).filter(t => t.actor?.isOwner).map(t => t.actor);
  if ( ctl.length ) return ctl;
  return game.user.character ? [game.user.character] : [];
}

/** The glows this viewer sees on the scene being viewed. */
export function glowsNow(scene = canvas?.scene) {
  if ( !scene || fxLevel() === "off" ) return [];
  let list = [];
  try { list = Power.state().list ?? []; } catch (e) { list = []; }
  const here = list.filter(p => p.scene === scene.id || p.scene === scene.uuid).map(L.glowOf).filter(Boolean);
  const who = viewers().map(a => natureOf(a));
  return here.filter(g => L.sees(g, {gm: game.user.isGM}) || who.some(n => L.sees(g, {nature: n})));
}

let layer = null, flames = [];
export function drawGlows() {
  if ( !canvas?.ready ) return;
  const glows = glowsNow();
  if ( !glows.length ) { layer?.destroy(); layer = null; flames = []; return; }
  if ( !layer || layer.destroyed ) { layer = new PIXI.Container(); layer.eventMode = "none"; (canvas.interface ?? canvas.stage).addChild(layer); }
  layer.removeChildren().forEach(c => c.destroy());
  flames = [];
  const d = canvas.dimensions, rect = d.sceneRect ?? {x: d.sceneX, y: d.sceneY, width: d.sceneWidth, height: d.sceneHeight};
  const cx = rect.x + rect.width / 2, cy = rect.y + rect.height / 2;
  glows.forEach((g, i) => {
    const r = g.radius * d.size, gfx = new PIXI.Graphics();
    gfx.blendMode = PIXI.BLEND_MODES.ADD;
    // rings fading outwards make a soft glow without a filter
    for ( let k = 5; k >= 1; k-- ) gfx.beginFill(g.color, 0.06 * g.strength).drawCircle(cx + i * d.size, cy, r * k / 5).endFill();
    layer.addChild(gfx);
    if ( g.flame ) flames.push({gfx, base: g.strength});
  });
  layer.wodxGlows = glows;
}

let ticking = false;
function tick() {
  if ( fxLevel() !== "full" ) return;
  const t = performance.now() / 1000;
  for ( const f of flames ) if ( !f.gfx.destroyed ) f.gfx.alpha = 0.75 + 0.25 * Math.sin(t * 9 + Math.sin(t * 3));
}

export function setupPowerLooks() {
  const soon = (() => { let h = null; return () => { clearTimeout(h); h = setTimeout(drawGlows, 150); }; })();
  Hooks.on("canvasReady", soon);
  Hooks.on("controlToken", soon);
  Hooks.on("updateSetting", s => { if ( s?.key === `${MOD}.powerState` ) soon(); });
  Hooks.on("canvasReady", () => { if ( !ticking && canvas.app?.ticker ) { canvas.app.ticker.add(tick); ticking = true; } });
  soon();
}

export const api = () => ({glowsNow, draw: drawGlows, rules: L});
