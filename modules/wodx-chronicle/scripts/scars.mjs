/**
 * Scars on the map (B3759): a disaster or a great power leaves its mark on a place until the place is rebuilt.
 * Rules in scars-rules.mjs. Only the Storyteller's computer changes the map; every change is remembered on the scene
 * (flags.wodx-chronicle.scars), so Undo, or the town's slow rebuilding, puts each piece back as it stood.
 *
 *   const S = game.modules.get("wodx-chronicle").api.scars;
 *   const id = await S.scar({scene, kind: "fire", severity: 2, at: {x, y, radius}, source: "town:abc"});  // at null: the whole scene
 *   await S.heal({scene, share: 0.25});   await S.undo(id, scene);   await S.undoFor({source, since});   S.list(scene);
 */
import {MODULE_ID} from "./util.mjs";
import * as R from "./scars-rules.mjs";
import {isLightTouch, holdScar, holdHeal} from "./quiet.mjs";

const FLAG = "scars";
const IX = "wodx-interactables";
const all = c => (c ? [...(c.contents ?? c)] : []);
const now = () => game.time?.worldTime ?? 0;
const sceneOf = s => (typeof s === "string" ? game.scenes.get(s) : s) ?? globalThis.canvas?.scene ?? null;
const adoptOf = d => d?.flags?.[IX]?.adoptId ?? null;
const artOk = new Map();

export function list(scene) { return Object.values(sceneOf(scene)?.flags?.[MODULE_ID]?.[FLAG] ?? {}); }

/** A region's box from its shapes. */
function boxOf(region) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for ( const s of region?.shapes ?? [] ) {
    const pts = s.points?.length ? s.points : null;
    if ( pts ) for ( let i = 0; i + 1 < pts.length; i += 2 ) { x0 = Math.min(x0, pts[i]); y0 = Math.min(y0, pts[i + 1]); x1 = Math.max(x1, pts[i]); y1 = Math.max(y1, pts[i + 1]); }
    else if ( s.radiusX !== undefined ) { x0 = Math.min(x0, s.x - s.radiusX); y0 = Math.min(y0, s.y - s.radiusY); x1 = Math.max(x1, s.x + s.radiusX); y1 = Math.max(y1, s.y + s.radiusY); }
    else if ( s.width !== undefined ) { x0 = Math.min(x0, s.x); y0 = Math.min(y0, s.y); x1 = Math.max(x1, s.x + s.width); y1 = Math.max(y1, s.y + s.height); }
  }
  return Number.isFinite(x0) ? {x: x0, y: y0, w: x1 - x0, h: y1 - y0} : null;
}

/** The scene's buildings (WoDX Interactables' adopted maps) and its loose pieces, for the rules. */
export function inventory(scene) {
  const tiles = all(scene.tiles), walls = all(scene.walls), lights = all(scene.lights);
  const buildings = [];
  for ( const r of all(scene.regions) ) {
    const key = adoptOf(r);
    const box = boxOf(r);
    if ( !key || !box ) continue;
    const mine = d => { const a = adoptOf(d); return a && (a === key || String(a).startsWith(`${key}-`)); };
    const bt = tiles.filter(mine);
    const bTileIds = new Set(bt.map(t => t.id));
    buildings.push({key, ...box, tiles: bt.map(t => t.id), walls: walls.filter(mine).map(w => ({id: w.id, door: Number(w.door) > 0})),
      lights: lights.filter(l => { const a = adoptOf(l); return mine(l) || (a && bTileIds.has(String(a).split(".")[0])); }).map(l => l.id)});
  }
  // Buildings are regions whose key no other building's key starts (a room region inside a building is not a building)
  const keys = buildings.map(b => b.key);
  const top = buildings.filter(b => !keys.some(k => k !== b.key && String(b.key).startsWith(`${k}-`)));
  const ours = d => d.flags?.[MODULE_ID]?.scar;
  const mid = w => ({x: (w.c[0] + w.c[2]) / 2, y: (w.c[1] + w.c[3]) / 2});
  const loose = {
    tiles: tiles.filter(t => !ours(t)).map(t => ({id: t.id, x: t.x + (t.width ?? 0) / 2, y: t.y + (t.height ?? 0) / 2})),
    walls: walls.filter(w => Array.isArray(w.c)).map(w => ({id: w.id, door: Number(w.door) > 0, ...mid(w)})),
    lights: lights.map(l => ({id: l.id, x: l.x, y: l.y}))
  };
  const d = scene.dimensions ?? {};
  const rect = d.sceneRect ? {x: d.sceneRect.x, y: d.sceneRect.y, width: d.sceneRect.width, height: d.sceneRect.height} : {x: 0, y: 0, width: scene.width ?? 2000, height: scene.height ?? 1500};
  return {buildings: top, loose, grid: scene.grid?.size ?? 100, rect};
}

/** Whether a picture is on this Foundry. */
async function hasArt(path) {
  if ( artOk.has(path) ) return artOk.get(path);
  let ok = false;
  try { const r = await fetch(`/${path}`, {method: "HEAD"}); ok = r.ok; } catch { ok = false; }
  artOk.set(path, ok);
  return ok;
}
async function artFor(mark) {
  const out = [];
  for ( const p of R.ART[mark] ?? [] ) if ( await hasArt(p) ) out.push(p);
  return out;
}

/** Scar a scene. Returns the scar's id, or null. */
export async function scar({scene, kind, severity = 1, at = null, source = "", seed = "", label = ""} = {}) {
  if ( !game.user.isGM ) return null;
  const sc = sceneOf(scene), K = R.KINDS[R.SCAR_OF[kind] ?? kind];
  if ( !sc || !K ) return null;
  // B6380: in Light-touch mode the map is left as it stands; the scar is made when the mode ends
  if ( isLightTouch() ) { await holdScar({scene: sc.id, kind, severity, at, source, seed: seed || `${sc.id}:${now()}:${source}`, label}); return null; }
  const k = R.SCAR_OF[kind] ?? kind;
  const area = at && Number.isFinite(Number(at.x)) ? {x: Number(at.x), y: Number(at.y), radius: Math.max(20, Number(at.radius) || 150)} : null;
  const inv = inventory(sc);
  const p = R.plan(k, severity, inv, {at: area, seed: seed || `${sc.id}:${now()}:${source}`});
  const id = `scar-${foundry.utils.randomID(10)}`;
  // How each piece stood, then the change
  const byType = {tile: "Tile", light: "AmbientLight", wall: "Wall"};
  const changes = [];
  for ( const c of p.changes ) {
    const doc = sc.getEmbeddedDocument(byType[c.type], c.id);
    if ( !doc ) continue;
    const src = doc.toObject();
    const was = R.before(src, c.set);
    if ( JSON.stringify(was) === JSON.stringify(c.set) ) continue;
    changes.push({...c, before: was});
  }
  for ( const [type, cls] of Object.entries(byType) ) {
    const ups = changes.filter(c => c.type === type).map(c => ({_id: c.id, ...R.updateOf(c)}));
    if ( ups.length ) await sc.updateEmbeddedDocuments(cls, ups);
  }
  // Marks: a picture from the packs, else a plain blot
  const art = await artFor(K.marks), made = [];
  const flags = {[MODULE_ID]: {scar: id}};
  if ( art.length ) {
    const tiles = p.marks.map((m, i) => ({texture: {src: art[i % art.length]}, x: m.x - m.size / 2, y: m.y - m.size / 2, width: m.size, height: m.size,
      rotation: m.rotation, alpha: 0.9, locked: true, flags}));
    for ( const t of tiles.length ? await sc.createEmbeddedDocuments("Tile", tiles) : [] ) made.push({type: "Tile", id: t.id});
  } else if ( p.marks.length ) {
    const blots = p.marks.map(m => ({x: m.x - m.size / 2, y: m.y - m.size / 2, shape: {type: "p", width: m.size, height: m.size, points: blot(m.size, m.rotation)},
      fillType: 1, fillColor: K.markColour, fillAlpha: 0.55, strokeWidth: 0, strokeAlpha: 0, locked: true, hidden: false, flags}));
    for ( const d of await sc.createEmbeddedDocuments("Drawing", blots) ) made.push({type: "Drawing", id: d.id});
  }
  if ( !changes.length && !made.length ) return null;
  const record = {id, kind: k, severity: R.sev(severity), at: area, source: String(source ?? ""), label: label || K.label, made_at: now(), hit: p.hit, changes, made};
  await sc.update({[`flags.${MODULE_ID}.${FLAG}.${id}`]: record});
  Hooks.callAll("wodxScar", {scene: sc.id, id, kind: k, severity: record.severity, hit: p.hit});
  return id;
}

/** A rough round blot, as polygon points inside a size-by-size box. */
function blot(size, turn = 0) {
  const pts = [], n = 10, c = size / 2;
  for ( let i = 0; i < n; i++ ) {
    const a = (i / n) * Math.PI * 2 + (turn * Math.PI) / 180, r = c * (0.65 + ((Math.sin(i * 2.3 + turn) + 1) / 2) * 0.35);
    pts.push(Math.round(c + Math.cos(a) * r), Math.round(c + Math.sin(a) * r));
  }
  return pts;
}

/** Put some of a scar's pieces back. idx: from R.healStep. */
async function restore(sc, record, {changes = [], made = []}) {
  const byType = {tile: "Tile", light: "AmbientLight", wall: "Wall"};
  for ( const [type, cls] of Object.entries(byType) ) {
    const ups = changes.map(i => record.changes[i]).filter(c => c?.type === type && sc.getEmbeddedDocument(cls, c.id)).map(c => ({_id: c.id, ...R.restoreOf(c)}));
    if ( ups.length ) await sc.updateEmbeddedDocuments(cls, ups);
  }
  for ( const cls of ["Tile", "Drawing"] ) {
    const ids = made.map(i => record.made[i]).filter(m => m?.type === cls && sc.getEmbeddedDocument(cls, m.id)).map(m => m.id);
    if ( ids.length ) await sc.deleteEmbeddedDocuments(cls, ids);
  }
  for ( const i of changes ) record.changes[i].healed = true;
  for ( const i of made ) record.made[i].healed = true;
}

/** Take a scar back whole: every piece as it stood, its marks gone. */
export async function undo(id, scene = null) {
  if ( !game.user.isGM ) return false;
  const sc = scene ? sceneOf(scene) : all(game.scenes).find(s => s.flags?.[MODULE_ID]?.[FLAG]?.[id]);
  const record = sc?.flags?.[MODULE_ID]?.[FLAG]?.[id];
  if ( !record ) return false;
  const r = foundry.utils.deepClone(record);
  await restore(sc, r, {changes: r.changes.map((c, i) => (c.healed ? -1 : i)).filter(i => i >= 0), made: r.made.map((m, i) => (m.healed ? -1 : i)).filter(i => i >= 0)});
  await sc.update({[`flags.${MODULE_ID}.${FLAG}.-=${id}`]: null});
  return true;
}

/** Take back every scar a source left since a time (a town card's Undo). */
export async function undoFor({source, since = 0} = {}) {
  let n = 0;
  for ( const sc of all(game.scenes) ) for ( const r of list(sc) ) if ( r.source === source && Number(r.made_at ?? 0) >= since ) { if ( await undo(r.id, sc) ) n++; }
  return n;
}

/** Rebuild a share of a scene's scars (the town's week). Returns how many scars are fully mended. */
export async function heal({scene, share = 0.2} = {}) {
  if ( !game.user.isGM ) return 0;
  const sc = sceneOf(scene);
  // B6380: the week's rebuilding waits in Light-touch mode and is done in one go when the mode ends
  if ( isLightTouch() ) { await holdHeal(sc?.id, share); return 0; }
  let done = 0;
  for ( const rec of list(sc) ) {
    const r = foundry.utils.deepClone(rec);
    const step = R.healStep(r, share);
    await restore(sc, r, step);
    if ( step.done ) { await sc.update({[`flags.${MODULE_ID}.${FLAG}.-=${r.id}`]: null}); done++; }
    else await sc.update({[`flags.${MODULE_ID}.${FLAG}.${r.id}`]: r});
  }
  return done;
}

export const api = () => ({scar, undo, undoFor, heal, list, inventory, rules: R});
