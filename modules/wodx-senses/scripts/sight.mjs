/**
 * WoDX Senses 0.5.0: supernatural sight on the map. The player's character keeps the sight in use in a flag
 * (flags.wodx-senses.sight); each player's own map shows their own character's sight, and only if their setting
 * allows. The button "My sight" on the token tools steps through the sights the character has, then off.
 */
import * as S from "./sight-rules.mjs";
import {detectProfile} from "../../wodx-actions/scripts/profiles.js";

const MOD = "wodx-senses";
const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return null; } };
let H = null, layer = null, pending = null;

export function registerSight() {
  game.settings.register(MOD, "sightMap", {
    name: "Supernatural sight on my map", hint: "While my character uses Heightened Senses, Aura Perception or Lifesight, my own map shows it. Turn this off on a slow machine; chat answers are the same either way.",
    scope: "client", config: true, type: Boolean, default: true, onChange: () => drawSight()
  });
  game.settings.register(MOD, "colourSafe", {
    name: "Colour-blind safe colours", hint: "Aura and Lifesight rings, and the other WoDX tints that carry meaning, use colours that stay apart for colour-blind eyes. Every ring also shows its words on the map either way.",
    scope: "client", config: true, type: Boolean, default: false, onChange: () => { drawSight(); Hooks.callAll("wodxColourSafe", !!setting("colourSafe")); }
  });
  game.settings.register(MOD, "ringWords", {
    name: "Words under the sight rings", hint: "Each Aura Perception or Lifesight ring on my map says what it shows (pale, bright and wild, sparkling ...), so the colour is never the only sign.",
    scope: "client", config: true, type: Boolean, default: true, onChange: () => drawSight()
  });
}
/** Is this player's colour-blind palette on? Other WoDX modules read it through the Senses api. */
export const colourSafe = () => !!setting("colourSafe");

function myCharacter() {
  const tok = (canvas?.tokens?.controlled ?? []).find(t => t.actor?.isOwner);
  return tok?.actor ?? game.user?.character ?? null;
}
const profileOf = a => { try { return detectProfile(a); } catch (e) { return "mortal"; } };
export function sightsOf(a) {
  if ( !a ) return [];
  return S.sightsFor({auspex: H?.powerDots?.(a, /^(auspex|aura perception)$/i) ?? 0,
    heightenedGift: profileOf(a) === "lupine" && (H?.powerDots?.(a, /^heightened senses$/i) ?? 0) > 0, profile: profileOf(a)});
}
export const sightOf = a => { const s = a?.flags?.[MOD]?.sight; return S.SIGHTS[s] ? s : null; };

/** Step to the next sight the character has, or off. */
export async function cycleSight(a = myCharacter()) {
  if ( !a?.isOwner ) { ui.notifications.warn("Select your character's token first."); return null; }
  const have = sightsOf(a);
  if ( !have.length ) { ui.notifications.info(`${a.name} has no sight to use.`); return null; }
  const next = S.nextSight(sightOf(a), have);
  await a.update({[`flags.${MOD}.sight`]: next});
  ui.notifications.info(next ? `${a.name}: ${S.SIGHTS[next].label}` : `${a.name}: ordinary sight`);
  return next;
}

/** Draw this player's sight: the map's tint and the rings. Off for the Storyteller unless a token of theirs uses it. */
export function drawSight() {
  if ( pending ) return;
  pending = setTimeout(() => {
    pending = null;
    try {
      const board = document.getElementById("board");
      const a = myCharacter(), sight = setting("sightMap") === false ? null : sightOf(a);
      if ( board ) board.style.filter = sight ? S.SIGHTS[sight].filter : "";
      if ( !canvas?.ready ) return;
      const parent = canvas.interface ?? canvas.stage;
      if ( !layer || layer.destroyed || layer.parent !== parent ) { layer = new PIXI.Graphics(); layer.eventMode = "none"; layer.zIndex = 49; parent.addChild(layer); }
      layer.clear();
      for ( const c of [...layer.children] ) c.destroy();
      if ( !sight || !S.SIGHTS[sight].rings ) return;
      const safe = !!setting("colourSafe"), words = setting("ringWords") !== false;
      for ( const t of canvas.tokens?.placeables ?? [] ) {
        if ( !t.actor || !t.isVisible || t.actor === a ) continue;
        const ring = S.ringFor(sight, profileOf(t.actor), {safe});
        if ( !ring ) continue;
        const rad = Math.max(t.w, t.h) * 0.58;
        layer.lineStyle(Math.max(safe ? 4 : 3, t.w / (safe ? 10 : 14)), ring.colour, ring.alpha);
        layer.drawCircle(t.center.x, t.center.y, rad);
        if ( words && ring.words ) {
          const style = {fontFamily: "Signika, sans-serif", fontSize: Math.max(12, Math.round(t.h / 6)), fill: S.css(ring.colour), stroke: {color: "#000000", width: 3}, strokeThickness: 3};
          const label = typeof layer.circle === "function" ? new PIXI.Text({text: ring.words, style}) : new PIXI.Text(ring.words, style);
          label.anchor?.set?.(0.5, 0);
          label.x = t.center.x; label.y = t.center.y + rad + 2;
          layer.addChild(label);
        }
      }
      layer.lineStyle(0);
    } catch (e) { console.warn(`${MOD} | sight`, e); }
  }, 150);
}

export function setupSight(helpers) {
  H = helpers;
  for ( const h of ["controlToken", "canvasReady", "updateToken", "createToken", "deleteToken", "sightRefresh"] ) Hooks.on(h, () => drawSight());
  Hooks.on("updateActor", (a, ch) => { if ( ch?.flags?.[MOD] !== undefined || a === myCharacter() ) drawSight(); });
  Hooks.on("getSceneControlButtons", controls => {
    const tokens = controls.tokens ?? controls.find?.(c => c.name === "token");
    if ( !tokens?.tools ) return;
    tokens.tools.wodxSight = {name: "wodxSight", title: "My sight (Heightened Senses, Aura Perception, Lifesight; press again for the next, then off)",
      icon: "fa-solid fa-eye-low-vision", order: 122, button: true, visible: true, onChange: () => cycleSight()};
  });
}
