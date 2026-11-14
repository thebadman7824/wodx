/**
 * WoDX Storyteller: town events shown on the town's scenes (B4620, show-don't-tell desk v1). Rules in
 * town-look-rules.mjs.
 *
 * When a town event lands (wodxTown, from the town turn, a sack, news or a power), every scene of that market gets the
 * event's marks: fire and smoke the night it burns, then burnt-out spots for weeks; flood water in the low ground for
 * days; a storm for the day and its debris; rubble after an earthquake; barricades after a riot or rising. They go
 * through WoDX Chronicle's shared looks layer (api.looks.show), which draws them with FXMaster or Token Magic FX when
 * those are on and obeys each player's effects level; without that layer, a plain drawing stands in for each spot.
 * The marks end by themselves with game time; the town card's Undo takes them back with the turn.
 * World setting townLooks (on by default).
 */
import * as L from "./town-look-rules.mjs";
import * as MK from "./market-rules.mjs";
import * as Markets from "./markets.mjs";
import {MOD, chron, isActiveGM, setting} from "./core.mjs";

const all = c => (c ? [...(c.contents ?? c)] : []);
const now = () => game.time?.worldTime ?? 0;
const layer = () => chron()?.looks ?? null;

export function registerTownLookSettings() {
  game.settings.register(MOD, "townLooks", {name: "Show town events on the map", hint: "A town's fire, flood, storm, earthquake, riot or sack leaves marks on that town's scenes: fire and smoke, water in the low streets, rubble, barricades. They fade with game time.",
    scope: "world", config: true, type: Boolean, default: true});
}

/** The scene's playable rectangle and grid size. */
function rectOf(scene) {
  const d = scene?.dimensions;
  const r = d?.sceneRect ?? {x: d?.sceneX ?? 0, y: d?.sceneY ?? 0, width: d?.sceneWidth ?? scene?.width ?? 2000, height: d?.sceneHeight ?? scene?.height ?? 1500};
  return {rect: {x: r.x, y: r.y, width: r.width, height: r.height}, grid: scene?.grid?.size ?? d?.size ?? 100};
}

/** One look on a scene: the shared layer when it is there, else a plain drawing for a spot (a whole-scene look is a faint wash). */
export async function show(scene, look, source) {
  const S = layer();
  if ( S?.show ) {
    try { return await S.show({scene, kind: look.kind, at: look.at, until: look.until, source}); } catch (e) { console.warn(`${MOD} | looks layer`, e); }
  }
  const c = L.FALLBACK[look.kind] ?? L.FALLBACK.smoke;
  const {rect} = rectOf(scene);
  const at = look.at;
  const data = at
    ? {x: at.x - at.radius, y: at.y - at.radius, shape: {type: "e", width: at.radius * 2, height: at.radius * 2}}
    : {x: rect.x, y: rect.y, shape: {type: "r", width: rect.width, height: rect.height}};
  const [d] = await scene.createEmbeddedDocuments("Drawing", [{...data, fillType: 1, fillColor: c.color, fillAlpha: c.alpha, strokeWidth: 0, locked: true,
    flags: {[MOD]: {look: {kind: look.kind, source, made: now(), until: look.until?.worldTime ?? null, note: look.note ?? ""}}}}]);
  return d?.id ?? null;
}

/** The marks of a town event on every scene of its market. Returns [{scene, ids}]. */
export async function showTownEvent({town, kind} = {}, {seed = ""} = {}) {
  if ( !game.user.isGM || setting("townLooks") === false || !L.TOWN_LOOKS[kind] ) return [];
  const m = MK.marketById(Markets.state(), town);
  if ( !m ) return [];
  const out = [];
  for ( const id of m.scenes ?? [] ) {
    const scene = game.scenes.get(id);
    if ( !scene ) continue;
    const {rect, grid} = rectOf(scene);
    const ids = [];
    for ( const look of L.looksFor(kind, {rect, grid, now: now(), seed: `${town}:${id}:${seed || now()}`}) ) {
      const lid = await show(scene, look, `town:${town}`);
      if ( lid ) ids.push(lid);
    }
    out.push({scene: id, ids});
  }
  return out;
}

/** The fallback drawings this module made on a scene. */
const ownDrawings = scene => all(scene?.drawings).filter(d => d.flags?.[MOD]?.look);

/** End the town marks made since a time (the town card's Undo): towns, ids of markets; since, a world time. */
export async function endFor({towns = [], since = 0} = {}) {
  if ( !game.user.isGM ) return 0;
  const want = new Set(towns.map(t => `town:${t}`));
  let n = 0;
  const S = layer();
  for ( const scene of all(game.scenes) ) {
    if ( S?.list && S?.end ) {
      for ( const lk of S.list(scene) ?? [] ) if ( want.has(lk.source) && Number(lk.made ?? lk.at ?? 0) >= since ) { await S.end(lk.id); n++; }
    }
    const gone = ownDrawings(scene).filter(d => want.has(d.flags[MOD].look.source) && Number(d.flags[MOD].look.made) >= since).map(d => d.id);
    if ( gone.length ) { await scene.deleteEmbeddedDocuments("Drawing", gone); n += gone.length; }
  }
  return n;
}

/** Fallback drawings whose time is up go (the shared layer ends its own). */
export async function sweep() {
  if ( !isActiveGM() ) return 0;
  let n = 0;
  for ( const scene of all(game.scenes) ) {
    const gone = ownDrawings(scene).filter(d => L.isOver({until: {worldTime: d.flags[MOD].look.until}}, now())).map(d => d.id);
    if ( gone.length ) { await scene.deleteEmbeddedDocuments("Drawing", gone); n += gone.length; }
  }
  return n;
}

let lastSweep = -Infinity;
export function setupTownLooks() {
  Hooks.on("wodxTown", p => {
    if ( !isActiveGM() ) return;
    showTownEvent(p).catch(e => console.error(`${MOD} | town looks`, e));
  });
  Hooks.on("updateWorldTime", t => {
    if ( !isActiveGM() || Math.abs(t - lastSweep) < 600 ) return;
    lastSweep = t;
    sweep().catch(e => console.error(`${MOD} | town looks`, e));
  });
}

export const api = () => ({show, showTownEvent, endFor, sweep, rules: L});
