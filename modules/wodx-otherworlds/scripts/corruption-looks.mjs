/**
 * WoDX Otherworlds: Wyrm corruption shown on the place's scene (B4621, show-don't-tell desk v2). Rules in
 * corruption-look-rules.mjs.
 *
 * Whenever a place's corruption flag changes (the weekly turn, its Undo, the Storyteller's window, a cleansing), the
 * scene's marks are drawn again to match: the sickly cast by band, sludge at each source, haze for the Banes. They go
 * through WoDX Chronicle's shared looks layer (api.looks.show) when it is there; without it, locked plain drawings stand
 * in. A clean place, or a scene taken out of corruption, has none. World setting wyrmLooks (on by default).
 */
import * as L from "./corruption-look-rules.mjs";
import {MODULE_ID} from "./ratings.mjs";
import {placeOf} from "./corruption.mjs";

const SOURCE = scene => `wyrm:${scene.id}`;
const layer = () => game.modules.get("wodx-chronicle")?.api?.looks ?? null;
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const on = () => { try { return game.settings.get(MODULE_ID, "wyrmLooks") !== false; } catch (e) { return true; } };

export function registerCorruptionLookSettings() {
  game.settings.register(MODULE_ID, "wyrmLooks", {name: "Show Wyrm corruption on the map", hint: "A tainted place's scene takes a sickly cast that deepens with its band, with sludge where its sources are and a murky haze for its Banes. Cleansing lifts it.",
    scope: "world", config: true, type: Boolean, default: true, onChange: () => { if ( isActiveGM() ) syncAll().catch(e => console.error(`${MODULE_ID} | wyrm looks`, e)); }});
}

function rectOf(scene) {
  const d = scene?.dimensions;
  const r = d?.sceneRect ?? {x: d?.sceneX ?? 0, y: d?.sceneY ?? 0, width: d?.sceneWidth ?? scene?.width ?? 2000, height: d?.sceneHeight ?? scene?.height ?? 1500};
  return {rect: {x: r.x, y: r.y, width: r.width, height: r.height}, grid: scene?.grid?.size ?? d?.size ?? 100};
}

const ownDrawings = scene => [...(scene?.drawings ?? [])].filter(d => d.flags?.[MODULE_ID]?.wyrmLook);

/** The marks this scene now carries for its corruption: [{kind, note, layer}] (for gates and the window). */
export function marksOn(scene) {
  const S = layer();
  const fromLayer = S?.list ? (S.list(scene) ?? []).filter(l => l.source === SOURCE(scene)).map(l => ({kind: l.kind, layer: true})) : [];
  return [...fromLayer, ...ownDrawings(scene).map(d => ({kind: d.flags[MODULE_ID].wyrmLook.kind, note: d.flags[MODULE_ID].wyrmLook.note, sig: d.flags[MODULE_ID].wyrmLook.sig, layer: false}))];
}

async function clear(scene) {
  const S = layer();
  if ( S?.endAll ) { try { await S.endAll({scene, source: SOURCE(scene)}); } catch (e) { console.warn(`${MODULE_ID} | looks layer`, e); } }
  const ids = ownDrawings(scene).map(d => d.id).filter(id => scene.drawings.has(id));
  if ( ids.length ) await scene.deleteEmbeddedDocuments("Drawing", ids).catch(() => []);
}

/** Draw a scene's corruption marks again to match its state, one draw at a time per scene. Returns how many it has. */
const queue = new Map();
export function sync(scene) {
  if ( !scene ) return Promise.resolve(0);
  const next = (queue.get(scene.id) ?? Promise.resolve()).catch(() => 0).then(() => syncNow(scene));
  queue.set(scene.id, next);
  return next;
}
async function syncNow(scene) {
  if ( !game.user.isGM || !scene ) return 0;
  const tracked = !!scene.flags?.[MODULE_ID]?.corruption;
  const place = tracked ? placeOf(scene) : null;
  const sig = tracked && on() ? L.signature(place) : "clean";
  const have = marksOn(scene);
  if ( sig === "clean" ) { if ( have.length ) await clear(scene); return 0; }
  if ( have.length && have.every(m => m.layer || m.sig === sig) && scene.flags?.[MODULE_ID]?.wyrmLookSig === sig ) return have.length;
  await clear(scene);
  const {rect, grid} = rectOf(scene);
  const looks = L.looksFor(place, {rect, grid, seed: scene.id});
  const S = layer();
  const drawings = [];
  let n = 0;
  for ( const look of looks ) {
    if ( S?.show ) {
      try { if ( await S.show({scene, kind: look.kind, at: look.at, intensity: look.intensity, source: SOURCE(scene)}) ) { n++; continue; } } catch (e) { console.warn(`${MODULE_ID} | looks layer`, e); }
    }
    const c = L.FALLBACK[look.kind] ?? L.FALLBACK.taint, at = look.at;
    drawings.push({...(at ? {x: at.x - at.radius, y: at.y - at.radius, shape: {type: "e", width: at.radius * 2, height: at.radius * 2}}
      : {x: rect.x, y: rect.y, shape: {type: "r", width: rect.width, height: rect.height}}),
      fillType: 1, fillColor: c.color, fillAlpha: L.fallbackAlpha(look), strokeWidth: 0, locked: true,
      flags: {[MODULE_ID]: {wyrmLook: {kind: look.kind, note: look.note, sig}}}});
  }
  if ( drawings.length ) n += (await scene.createEmbeddedDocuments("Drawing", drawings)).length;
  await scene.update({[`flags.${MODULE_ID}.wyrmLookSig`]: sig}, {wyrmLookSync: true});
  return n;
}

/** Every scene that carries corruption or still carries its marks. */
export async function syncAll() {
  if ( !game.user.isGM ) return 0;
  let n = 0;
  for ( const s of game.scenes ) if ( s.flags?.[MODULE_ID]?.corruption || ownDrawings(s).length || s.flags?.[MODULE_ID]?.wyrmLookSig ) n += await sync(s);
  return n;
}

export function setupCorruptionLooks() {
  const soon = new Map();
  Hooks.on("updateScene", (scene, change, opts) => {
    if ( opts?.wyrmLookSync || !isActiveGM() ) return;
    const f = change?.flags?.[MODULE_ID];
    if ( !f || !("corruption" in f || "-=corruption" in f) ) return;
    clearTimeout(soon.get(scene.id));
    soon.set(scene.id, setTimeout(() => sync(scene).catch(e => console.error(`${MODULE_ID} | wyrm looks`, e)), 250));
  });
  if ( isActiveGM() ) setTimeout(() => syncAll().catch(e => console.error(`${MODULE_ID} | wyrm looks`, e)), 4000);
}

export const api = () => ({sync, syncAll, marksOn, rules: L});
