/**
 * Looks on the map (B3758): one layer every WoDX module calls to show players what happens to a place, instead of only
 * saying it in chat. The Storyteller's computer stores each look on its scene and places what everyone shares (the
 * drawn shape, its Token Magic FX filter, FXMaster weather or Foundry's own scene weather); each player's computer
 * draws the rest itself (Sequencer animations, the screen shake) at that player's own level (fxLevel: full, light, off).
 *
 *   const C = game.modules.get("wodx-chronicle").api.looks;
 *   const id = await C.show({scene, kind: "fire", at: {x, y, radius: 200}, until: {rounds: 3}, source: "Command the Flame"});
 *   await C.weather({scene, kind: "storm"});          // a scene-wide look, the same as show() with at null
 *   await C.end(id, scene);  await C.endAll({scene, source});  C.list(scene);
 *
 * Rules and kinds: looks-rules.mjs. Every module is optional: with none on, a look is its coloured shape and Foundry's
 * own scene weather.
 */
import {MODULE_ID} from "./util.mjs";
import * as R from "./looks-rules.mjs";

const FLAG = "looks";
const SEQ_PREFIX = "wodx-look-";
const seen = new Set();   // looks this computer has already drawn once (a quake shakes the screen once, when it lands)
let pathCache = null;

export const level = () => { try { return game.settings.get(MODULE_ID, "fxLevel") ?? R.DEFAULT_LEVEL; } catch { return R.DEFAULT_LEVEL; } };
const on = id => !!game.modules.get(id)?.active;
export function mods() {
  return {sequencer: on("sequencer") && !!globalThis.Sequencer, tokenmagic: on("tokenmagic") && !!globalThis.TokenMagic,
    fxmaster: on("fxmaster") && !!globalThis.FXMASTER?.api?.effects, jb2a: on("JB2A_DnD5e") || on("jb2a_patreon")};
}
const sceneOf = s => (typeof s === "string" ? game.scenes.get(s) ?? fromUuidSync?.(s) : s) ?? globalThis.canvas?.scene ?? null;
const now = () => game.time?.worldTime ?? 0;
const roundNow = () => game.combat?.started ? (game.combat.round ?? 0) : null;

/** The looks on a scene, as records. */
export function list(scene) {
  const sc = sceneOf(scene);
  return Object.values(sc?.getFlag?.(MODULE_ID, FLAG) ?? {});
}

/* ------------------------------------------------------------------ */
/*  The Storyteller's side: store, share, end                          */
/* ------------------------------------------------------------------ */

/** Show a look. Returns its id, or null (not the Storyteller, an unknown kind, no scene). */
export async function show(opts = {}) {
  if ( !game.user.isGM ) return null;
  const sc = sceneOf(opts.scene);
  const look = R.normLook(opts, {now: now(), round: roundNow() ?? 0});
  if ( !sc || !look ) return null;
  const M = mods(), K = R.KINDS[look.kind];
  // The shape everyone sees: one the caller already drew (WoDX Actions' ground areas), or a new one
  if ( look.at ) {
    if ( opts.drawing && sc.drawings.get(opts.drawing) ) look.drawing = opts.drawing;
    else if ( look.at.radius ) {
      const r = look.at.radius;
      const [d] = await sc.createEmbeddedDocuments("Drawing", [{x: look.at.x - r, y: look.at.y - r, shape: {type: "e", width: r * 2, height: r * 2},
        fillType: 1, fillColor: K.colour, fillAlpha: 0.35, strokeColor: K.colour, strokeAlpha: 0.8, strokeWidth: 4, hidden: false, locked: true,
        text: "", flags: {[MODULE_ID]: {look: look.id}}}]);
      look.drawing = d?.id ?? null;
      look.made_drawing = true;
    }
    if ( look.drawing && M.tokenmagic && K.tmfx ) {
      const d = sc.drawings.get(look.drawing);
      try { if ( d?.object ) await globalThis.TokenMagic.addUpdateFilters(d.object, tmfxParams(K.tmfx, look.id)); look.tmfx = true; }
      catch (e) { console.warn("WoDX | look filter", e); }
    }
  }
  // Scene-wide weather everyone shares
  const W = R.weatherPlan(look, M);
  if ( W?.fxmaster ) {
    try {
      const ids = await globalThis.FXMASTER.api.effects.play({scene: sc, particles: W.fxmaster.particles, filters: W.fxmaster.filters});
      look.fx = ids ?? null;
    } catch (e) { console.warn("WoDX | look weather (FXMaster)", e); }
  } else if ( W?.core ) {
    look.coreBefore = sc.weather ?? "";
    await sc.update({weather: W.core});
  }
  await sc.update({[`flags.${MODULE_ID}.${FLAG}.${look.id}`]: look});
  return look.id;
}

/** A scene-wide look by kind (storm, rain, fog, snow, plague, calm): the weather a power or Atmosphere asks for. */
export const weather = ({scene, kind, until = null, source = "", id = null} = {}) => show({scene, kind, at: null, until, source, id});

/** End a look: its shape, filter and weather go; every computer stops its animations. */
export async function end(id, scene = null) {
  if ( !game.user.isGM ) return false;
  const sc = scene ? sceneOf(scene) : game.scenes.find(s => s.getFlag(MODULE_ID, FLAG)?.[id]);
  const look = sc?.getFlag(MODULE_ID, FLAG)?.[id];
  if ( !look ) return false;
  try {
    if ( look.drawing && look.made_drawing && sc.drawings.get(look.drawing) ) await sc.deleteEmbeddedDocuments("Drawing", [look.drawing]);
    else if ( look.tmfx && look.drawing ) { const d = sc.drawings.get(look.drawing); if ( d?.object ) await globalThis.TokenMagic?.deleteFilters?.(d.object, look.id); }
  } catch (e) { console.warn("WoDX | look shape", e); }
  if ( look.fx ) { try { await globalThis.FXMASTER?.api?.effects?.stop?.({scene: sc, ...look.fx}); } catch (e) { console.warn("WoDX | look weather stop", e); } }
  if ( look.coreBefore !== undefined && !list(sc).some(l => l.id !== id && l.coreBefore !== undefined) ) await sc.update({weather: look.coreBefore});
  await sc.update({[`flags.${MODULE_ID}.${FLAG}.-=${id}`]: null});
  return true;
}

/** End every look on a scene, or every look a source made there. Returns how many ended. */
export async function endAll({scene = null, source = null} = {}) {
  const sc = sceneOf(scene);
  let n = 0;
  for ( const l of list(sc) ) if ( source === null || l.source === source ) { if ( await end(l.id, sc) ) n++; }
  return n;
}

/** The Storyteller's computer ends looks whose time has run out. */
async function expire() {
  if ( !game.user.isGM || game.users.activeGM?.id !== game.user.id ) return;
  for ( const sc of game.scenes ) for ( const l of list(sc) ) if ( R.expired(l, {now: now(), round: roundNow()}) ) await end(l.id, sc);
}

/** Token Magic FX filters for a drawn shape, by kind. Only the filter type and an id: Token Magic FX fills in its own defaults. */
function tmfxParams(type, id) {
  const animated = {time: {active: true, speed: 0.0015, animType: "move"}};
  if ( type === "fire" ) return [{filterType: "fire", filterId: id, intensity: 1, blend: 2, amplitude: 1, animated}];
  if ( type === "flood" ) return [{filterType: "flood", filterId: id, color: 0x2f6f9f, billowy: 0.43, tintIntensity: 0.72, glint: 0.31, scale: 70, animated}];
  if ( type === "smoke" ) return [{filterType: "smoke", filterId: id, color: 0x5d5d5d, animated}];
  return [{filterType: type, filterId: id, animated}];
}

/* ------------------------------------------------------------------ */
/*  Each computer's side: draw at this player's level                  */
/* ------------------------------------------------------------------ */

/** Every animation path Sequencer knows, read once. */
function seqPaths() {
  if ( pathCache ) return pathCache;
  const D = globalThis.Sequencer?.Database;
  let paths = [];
  try {
    paths = D?.publicFlattenedSimpleEntries ?? D?.publicFlattenedEntries ?? D?.flattenedEntries ?? [];
    if ( !Array.isArray(paths) ) paths = Object.keys(paths);
    if ( !paths.length && D?.getPathsUnder ) {
      const walk = (p, depth) => { if ( depth > 6 ) return; for ( const k of D.getPathsUnder(p) ?? [] ) { const full = `${p}.${k}`; paths.push(full); walk(full, depth + 1); } };
      walk("jb2a", 0);
    }
  } catch (e) { paths = []; }
  pathCache = paths.filter(p => typeof p === "string");
  return pathCache;
}

/** Draw this scene's looks for this player: start missing animations, stop those whose look is gone. */
export async function render() {
  const sc = globalThis.canvas?.scene;
  if ( !sc ) return;
  const lv = level(), M = mods(), looks = list(sc);
  // Weather everyone shares, shown fainter or hidden on this computer only
  const a = R.weatherAlpha(lv);
  for ( const layer of [globalThis.canvas.weather, globalThis.canvas.fxmaster] ) if ( layer ) { layer.alpha = a; layer.visible = a > 0; }
  if ( M.sequencer ) {
    const EM = globalThis.Sequencer.EffectManager;
    const playing = new Set((EM?.getEffects?.({sceneId: sc.id}) ?? []).map(e => e?.data?.name).filter(n => n?.startsWith(SEQ_PREFIX)));
    const want = new Set();
    for ( const l of looks ) {
      const p = R.renderPlan(l, lv, M);
      if ( !p?.seq || !l.at?.radius ) continue;
      const name = `${SEQ_PREFIX}${l.id}`;
      want.add(name);
      if ( playing.has(name) ) continue;
      const file = R.pickPath(seqPaths(), p.seq.names);
      if ( !file ) continue;
      try {
        const s = new globalThis.Sequence();
        for ( let i = 0; i < p.seq.copies; i++ ) {
          const ang = (i / p.seq.copies) * Math.PI * 2, off = i ? l.at.radius * 0.45 : 0;
          s.effect().file(file).atLocation({x: l.at.x + Math.cos(ang) * off, y: l.at.y + Math.sin(ang) * off})
            .size(Math.round(l.at.radius * (i ? 1 : 1.6))).opacity(p.seq.alpha).fadeIn(l.fade).fadeOut(l.fade)
            .belowTokens().persist().name(name).locally();
        }
        await s.play();
      } catch (e) { console.warn("WoDX | look animation", e); }
    }
    for ( const name of playing ) if ( !want.has(name) ) { try { await EM.endEffects({name, sceneId: sc.id}); } catch {} }
  }
  // Token Magic FX filters live on the shared shape; this player's level shows or hides them here
  for ( const l of looks ) {
    if ( !l.tmfx || !l.drawing ) continue;
    const d = sc.drawings.get(l.drawing)?.object, keep = lv !== "off";
    if ( d ) for ( const o of [d, d.shape, d.mesh] ) for ( const f of o?.filters ?? [] ) if ( f?.filterId === l.id ) f.enabled = keep;
  }
  // A quake shakes this screen once, when it lands
  for ( const l of looks ) {
    if ( seen.has(l.id) ) continue;
    seen.add(l.id);
    const p = R.renderPlan(l, lv, M);
    if ( p?.shake && now() - (l.made ?? 0) < 60 ) shake(p.shake);
  }
}

/** Shake this player's view of the map. */
export function shake({ms = 1500, px = 12} = {}) {
  const stage = globalThis.canvas?.stage;
  if ( !stage || level() !== "full" ) return;
  const start = performance.now(), base = {x: stage.pivot.x, y: stage.pivot.y};
  const step = t => {
    const k = (t - start) / ms;
    if ( k >= 1 ) { stage.pivot.set(base.x, base.y); return; }
    const amp = px * (1 - k);
    stage.pivot.set(base.x + (Math.random() * 2 - 1) * amp, base.y + (Math.random() * 2 - 1) * amp);
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Settings and hooks. Runs inside init. */
export function registerLooks() {
  game.settings.register(MODULE_ID, "fxLevel", {
    name: "Moving effects on the map",
    hint: "Fire, floods, storms and earthquakes that powers and events bring. Light shows them fainter and fewer, Off keeps only the plain coloured shapes and still weather. Only for you: pick Light or Off on a slow computer.",
    scope: "client", config: true, type: String, choices: R.LEVELS, default: R.DEFAULT_LEVEL,
    onChange: () => render()
  });
  Hooks.on("canvasReady", () => { pathCache = null; for ( const l of list(globalThis.canvas?.scene) ) seen.add(l.id); render(); });
  Hooks.on("updateScene", (sc, ch) => { if ( sc.id === globalThis.canvas?.scene?.id && ch?.flags?.[MODULE_ID]?.[FLAG] !== undefined ) render(); });
  // Token Magic FX puts its filters back when a shape redraws: keep them off on a computer set to Off
  Hooks.on("refreshDrawing", d => {
    if ( level() !== "off" ) return;
    const ids = new Set(list(globalThis.canvas?.scene).filter(l => l.drawing === d?.document?.id).map(l => l.id));
    if ( ids.size ) for ( const o of [d, d.shape, d.mesh] ) for ( const f of o?.filters ?? [] ) if ( ids.has(f?.filterId) ) f.enabled = false;
  });
  Hooks.on("updateWorldTime", () => expire());
  Hooks.on("updateCombat", () => expire());
}

export const api = () => ({show, weather, end, endAll, list, level, mods, render, shake, rules: R});
