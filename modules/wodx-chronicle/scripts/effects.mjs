/**
 * Scene video effects: each player can hide looping video tiles (fog, embers, snow) on their own computer.
 * A video tile is decoded every frame even when nobody looks at it, which slows weak graphics chips.
 * Hiding pauses the video and stops drawing the tile for this player only. Nothing is saved to the scene.
 */
import {MODULE_ID} from "./util.mjs";

export const VIDEO_CHOICES = {show: "Show", hide: "Hide"};
const VIDEO_EXT = /\.(webm|mp4|m4v|ogv)(?:[?#].*)?$/i;

/** True when a texture path points at a video file. */
export function isVideoSrc(src) {
  return typeof src === "string" && VIDEO_EXT.test(src.trim());
}

/** True when this player has chosen to hide scene video effects. */
export function hiding() {
  try { return game.settings.get(MODULE_ID, "sceneVideo") === "hide"; } catch { return false; }
}

/** The <video> element behind a tile, in any of the shapes PIXI and Foundry have used. */
export function videoOf(tile) {
  const tex = tile?.texture ?? tile?.mesh?.texture;
  const candidates = [
    tile?.sourceElement,
    tex?.baseTexture?.resource?.source,
    tex?.source?.resource,
    tex?.source?.resource?.source,
    tex?.source
  ];
  const Video = globalThis.HTMLVideoElement;
  return candidates.find(c => Video ? c instanceof Video : (c && typeof c.pause === "function" && "paused" in c)) ?? null;
}

/** Show or hide one tile for this player. Returns true when the tile is a video tile. */
export function applyTile(tile, hide = hiding()) {
  const doc = tile?.document;
  if ( !doc || !isVideoSrc(doc.texture?.src) ) return false;
  if ( tile.mesh ) tile.mesh.renderable = !hide;
  const video = videoOf(tile);
  if ( video ) {
    if ( hide ) { if ( !video.paused ) video.pause(); }
    else if ( video.paused && doc.video?.autoplay !== false ) video.play?.()?.catch?.(() => {});
  }
  return true;
}

/** Apply the choice to every tile on the scene in view. Returns how many video tiles there were. */
export function applyAll() {
  let n = 0;
  for ( const tile of globalThis.canvas?.tiles?.placeables ?? [] ) if ( applyTile(tile) ) n++;
  return n;
}

/** Client setting and hooks. Runs inside init. */
export function registerEffectSettings() {
  game.settings.register(MODULE_ID, "sceneVideo", {
    name: "Scene video effects",
    hint: "Looping video on the map, such as fog, embers and snow. Hide them on a slow computer: the map stays the same, only the moving overlays stop, and only for you.",
    scope: "client", config: true, type: String, choices: VIDEO_CHOICES, default: "show",
    onChange: () => applyAll()
  });
  // refreshTile runs after Foundry redraws a tile, so the choice holds through scene updates and video sync
  Hooks.on("refreshTile", tile => { if ( hiding() ) applyTile(tile, true); });
  Hooks.on("drawTile", tile => { if ( hiding() ) applyTile(tile, true); });
  Hooks.on("canvasReady", () => { if ( hiding() ) applyAll(); });
}
