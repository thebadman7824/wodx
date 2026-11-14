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
 * B4622 on: marks that follow a state rather than the clock (a sick town's crosses and fog) go through setLooks,
 * which draws them again only when they change.
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
  if ( look.mark ) {
    const [d] = await scene.createEmbeddedDocuments("Drawing", [drawingFor(scene, look, {kind: look.kind, source, made: now(), until: look.until?.worldTime ?? null, note: look.note ?? "", mark: look.mark})]);
    return d?.id ?? null;
  }
  const [d] = await scene.createEmbeddedDocuments("Drawing", [{...data, fillType: 1, fillColor: look.color ?? c.color, fillAlpha: look.alpha ?? c.alpha, strokeWidth: 0, locked: true,
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
    const gone = ownDrawings(scene).filter(d => d.flags[MOD].look.until !== null && L.isOver({until: {worldTime: d.flags[MOD].look.until}}, now())).map(d => d.id);
    if ( gone.length ) { await scene.deleteEmbeddedDocuments("Drawing", gone); n += gone.length; }
  }
  return n;
}

/* ---- marks that follow a state, not the clock (B4622 on): sickness, hunters, holders, sieges, shut shops ---- */

/** The fallback drawing for one look (a spot, a mark with its text, or a whole-scene wash). */
function drawingFor(scene, look, flag) {
  const c = L.FALLBACK[look.kind] ?? L.FALLBACK.smoke;
  const {rect, grid} = rectOf(scene);
  const at = look.at;
  const text = look.text || (look.mark && L.MARK_TEXT[look.mark]);
  const base = at ? {x: at.x - at.radius, y: at.y - at.radius, shape: {type: text ? "r" : "e", width: at.radius * 2, height: at.radius * 2}}
    : {x: rect.x, y: rect.y, shape: {type: "r", width: rect.width, height: rect.height}};
  const fill = text ? {fillType: 0, fillAlpha: 0, text, fontSize: Math.max(14, Math.round((at?.radius ?? grid / 2) * (look.text ? 0.5 : 1.6))), textColor: look.color ?? L.MARK_COLOR[look.mark] ?? "#e6dcc0", textAlpha: 0.9}
    : {fillType: 1, fillColor: look.color ?? c.color, fillAlpha: look.alpha ?? c.alpha};
  return {...base, ...fill, strokeWidth: 0, locked: true, flags: {[MOD]: {look: flag}}};
}

/** The marks a state key holds on a scene: the layer's looks and this module's drawings. */
export function marksOf(scene, key) {
  const S = layer();
  const fromLayer = S?.list ? (S.list(scene) ?? []).filter(l => l.source === key) : [];
  return {layer: fromLayer, own: ownDrawings(scene).filter(d => d.flags[MOD].look.source === key)};
}

/**
 * Make a scene carry exactly these marks for one state key (e.g. "sick:<market>"): nothing is drawn again when the
 * marks are the same; an empty list takes them away. Returns how many it carries.
 */
const lookQueue = new Map();
export function setLooks(scene, key, looks = []) {
  if ( !game.user.isGM || !scene ) return Promise.resolve(0);
  const next = (lookQueue.get(scene.id) ?? Promise.resolve()).catch(() => 0).then(() => setLooksNow(scene, key, looks));
  lookQueue.set(scene.id, next);
  return next;
}
async function setLooksNow(scene, key, looks) {
  const sig = L.signatureOf(looks);
  const sigs = scene.flags?.[MOD]?.lookSigs ?? {};
  const have = marksOf(scene, key);
  if ( (sigs[key] ?? "") === sig && (have.layer.length + have.own.length) === looks.length ) return looks.length;
  const S = layer();
  if ( S?.endAll ) { try { await S.endAll({scene, source: key}); } catch (e) { console.warn(`${MOD} | looks layer`, e); } }
  const gone = have.own.map(d => d.id).filter(id => scene.drawings.has(id));
  if ( gone.length ) await scene.deleteEmbeddedDocuments("Drawing", gone).catch(() => []);
  const drawings = [];
  let n = 0;
  for ( const look of looks ) {
    if ( S?.show ) {
      try { if ( await S.show({scene, kind: look.kind, at: look.at, until: look.until ?? undefined, source: key}) ) { n++; continue; } } catch (e) { console.warn(`${MOD} | looks layer`, e); }
    }
    drawings.push(drawingFor(scene, look, {kind: look.kind, source: key, made: now(), until: look.until?.worldTime ?? null, note: look.note ?? "", mark: look.mark ?? null}));
  }
  if ( drawings.length ) n += (await scene.createEmbeddedDocuments("Drawing", drawings)).length;
  await scene.update({[`flags.${MOD}.lookSigs`]: {...sigs, [key]: sig}}, {townLookSync: true});
  return n;
}

/** Sickness on the map (B4622): every scene of every town shows its outbreak's phase; a town that is well shows none. */
export async function syncSick() {
  if ( !game.user.isGM ) return 0;
  let st, mst, R;
  try { R = await import("./contagion-rules.mjs"); st = R.normState(setting("contagionState")); mst = Markets.state(); } catch (e) { return 0; }
  const sickOn = setting("townLooks") !== false && setting("contagion") !== "off";
  let n = 0;
  for ( const m of mst?.markets ?? [] ) {
    const o = st.towns?.[m.id];
    const phase = sickOn && o && o.week > 0 ? R.phaseOf(o.week, o.weeks) : "over";
    for ( const id of m.scenes ?? [] ) {
      const scene = game.scenes.get(id);
      if ( !scene ) continue;
      const key = `sick:${m.id}`;
      const looks = L.sickLooksFor(phase, {...rectOf(scene), seed: `${m.id}:${id}`});
      if ( !looks.length && !(scene.flags?.[MOD]?.lookSigs?.[key]) ) continue;
      n += await setLooks(scene, key, looks);
    }
  }
  return n;
}

/** The town scenes of every market, with the market. */
function townScenes() {
  const out = [];
  for ( const m of Markets.state()?.markets ?? [] ) for ( const id of m.scenes ?? [] ) { const scene = game.scenes.get(id); if ( scene ) out.push({m, scene}); }
  return out;
}

/** Hunters on the map (B4623): every town scene shows its region's stage; a quiet region shows none. */
export async function syncHunters() {
  if ( !game.user.isGM ) return 0;
  let Hn;
  try { Hn = await import("./hunters.mjs"); } catch (e) { return 0; }
  const show = setting("townLooks") !== false && setting("hunterPressure") !== false;
  let n = 0;
  for ( const {m, scene} of townScenes() ) {
    const key = `hunters:${m.id}`;
    let looks = [];
    if ( show ) {
      try {
        const h = Hn.here(scene);
        const best = [...(h.files ?? [])].filter(f => f.level >= 2).sort((a, b) => b.level - a.level)[0];
        looks = L.hunterLooksFor(h.stage.key, {...rectOf(scene), seed: `${m.id}:${scene.id}`, sought: best?.name ?? ""});
      } catch (e) { looks = []; }
    }
    if ( !looks.length && !(scene.flags?.[MOD]?.lookSigs?.[key]) ) continue;
    n += await setLooks(scene, key, looks);
  }
  return n;
}

/** A raid or purge approved in a region: a crowd with torches on each town scene there, for the night. */
export async function torchesIn(regionId) {
  if ( !game.user.isGM || setting("townLooks") === false ) return 0;
  let Hn;
  try { Hn = await import("./hunters.mjs"); } catch (e) { return 0; }
  let n = 0;
  for ( const {m, scene} of townScenes() ) {
    if ( Hn.regionAt(scene) !== regionId ) continue;
    for ( const look of L.torchCrowd({...rectOf(scene), now: now(), seed: `${m.id}:${scene.id}:${now()}`}) ) {
      const S = layer();
      if ( S?.show ) { try { if ( await S.show({scene, kind: look.kind, at: look.at, until: look.until, source: `town:${m.id}`}) ) { n++; continue; } } catch (e) { /* fall back */ } }
      await scene.createEmbeddedDocuments("Drawing", [drawingFor(scene, look, {kind: look.kind, source: `town:${m.id}`, made: now(), until: look.until.worldTime, note: look.note, mark: look.mark})]);
      n++;
    }
  }
  return n;
}

/** Sieges on the map (B4624): each town under siege shows the camp round its scenes, and the breach once there is one. */
export async function syncSieges() {
  if ( !game.user.isGM ) return 0;
  let TR, Bt;
  try { TR = await import("./town-rules.mjs"); Bt = await import("./battles.mjs"); } catch (e) { return 0; }
  const markets = Markets.state()?.markets ?? [];
  const sceneName = id => { const s = game.scenes?.get(id); return s?.navName || s?.name || ""; };
  const sieges = {};
  if ( setting("townLooks") !== false ) {
    for ( const b of Bt.list() ) {
      if ( b.kind !== "siege" || b.over ) continue;
      const m = TR.townOfPlace(b.place || b.war?.place, markets, sceneName);
      if ( m ) sieges[m.id] = {breached: sieges[m.id]?.breached || !!b.breached};
    }
  }
  let n = 0;
  for ( const {m, scene} of townScenes() ) {
    const key = `siege:${m.id}`;
    const looks = sieges[m.id] ? L.siegeLooksFor(sieges[m.id], {...rectOf(scene), seed: `${m.id}:${scene.id}`}) : [];
    if ( !looks.length && !(scene.flags?.[MOD]?.lookSigs?.[key]) ) continue;
    n += await setLooks(scene, key, looks);
  }
  return n;
}

/** Shut shops on the map (B4625): boards over each shut trader's shop tile on the town's scenes; an open shop has none. */
export async function syncShops() {
  if ( !game.user.isGM ) return 0;
  const on = setting("townLooks") !== false;
  let n = 0;
  for ( const {m, scene} of townScenes() ) {
    const key = `shops:${m.id}`;
    const looks = [];
    if ( on ) {
      for ( const t of m.traders ?? [] ) {
        if ( !t.shut ) continue;
        const who = game.actors.get(t.actor)?.name ?? "";
        // the shop's tile on this scene (each trader keeps one)
        const tile = scene.tiles?.get?.(t.tile);
        if ( tile ) looks.push(L.shutLook({x: tile.x + tile.width / 2, y: tile.y + tile.height / 2, size: Math.min(tile.width, tile.height)}, who));
      }
    }
    if ( !looks.length && !(scene.flags?.[MOD]?.lookSigs?.[key]) ) continue;
    n += await setLooks(scene, key, looks);
  }
  return n;
}

/**
 * A rival's fire at a haven (B4626): a WoDX Actions fire area that burns whoever is in it, smoke over the scene while
 * it burns, and scorch marks that stay for weeks. Returns {area, marks}.
 */
export async function havenFire(scene, {who = "a rival"} = {}) {
  if ( !game.user.isGM || !scene ) return {area: null, marks: 0};
  const {at, looks} = L.havenFireFor({...rectOf(scene), now: now(), seed: `${scene.id}:${now()}`});
  let area = null;
  try { area = await game.wodxActions?.effects?.placeArea?.(L.havenFireArea(who), at, {caster: who, scene}); } catch (e) { console.warn(`${MOD} | haven fire area`, e); }
  if ( !area ) looks.unshift({kind: "fire", at: {...at, radius: Math.round((scene.grid?.size ?? 100) * 1.5)}, until: {worldTime: now() + L.HAVEN_FIRE.burns}, note: `fire set by ${who}`});
  let marks = 0;
  if ( setting("townLooks") !== false ) for ( const look of looks ) if ( await show(scene, look, `haven:${scene.id}`) ) marks++;
  return {area, marks};
}

/** The scenes a sign or a great event shows on: every town scene and the scene being played, each once. */
function skyScenes() {
  const out = new Map();
  for ( const {m, scene} of townScenes() ) if ( !out.has(scene.id) ) out.set(scene.id, {scene, town: m.id});
  const act = game.scenes.active;
  if ( act && !out.has(act.id) ) out.set(act.id, {scene: act, town: null});
  return [...out.values()];
}

/** An approved sign in the world (B4628), on every town scene and the scene being played, for a night. */
export async function showOmen(text) {
  if ( !game.user.isGM || setting("townLooks") === false ) return 0;
  let n = 0;
  for ( const {scene} of skyScenes() ) for ( const look of L.omenLooksFor(text, {...rectOf(scene), now: now(), seed: `${scene.id}:${now()}`}) ) if ( await show(scene, look, "omen") ) n++;
  return n;
}

/** A great dated event (B4628): its sky over every town scene and the scene being played. */
export async function showEvent(ev) {
  if ( !game.user.isGM || setting("townLooks") === false ) return 0;
  const look = L.eventLookFor(ev?.id, {now: now()});
  if ( !look ) return 0;
  let n = 0;
  for ( const {scene} of skyScenes() ) if ( await show(scene, look, `event:${ev.id}`) ) n++;
  return n;
}

/** A town's prosperity and unrest on its scenes (B4629): lit windows, beggars, words on the walls. */
export async function syncProsperity() {
  if ( !game.user.isGM ) return 0;
  let towns = {};
  try { towns = (await import("./towns.mjs")).state()?.towns ?? {}; } catch (e) { return 0; }
  const on = setting("townLooks") !== false;
  let n = 0;
  for ( const {m, scene} of townScenes() ) {
    const key = `prosper:${m.id}`;
    const t = towns[m.id];
    const looks = on && t ? L.prosperityLooksFor(t, {...rectOf(scene), seed: `${m.id}:${scene.id}`}) : [];
    if ( !looks.length && !(scene.flags?.[MOD]?.lookSigs?.[key]) ) continue;
    n += await setLooks(scene, key, looks);
  }
  return n;
}

let lastSweep = -Infinity;
export function setupTownLooks() {
  Hooks.on("wodxTown", p => {
    if ( !isActiveGM() ) return;
    showTownEvent(p).catch(e => console.error(`${MOD} | town looks`, e));
  });
  // B4622: the sick towns follow the contagion state, whoever changed it (the week, its Undo, the window, a power)
  let sickSoon = null;
  const sickLater = () => { if ( !isActiveGM() ) return; clearTimeout(sickSoon); sickSoon = setTimeout(() => syncSick().catch(e => console.error(`${MOD} | sick looks`, e)), 500); };
  Hooks.on("updateSetting", s => { if ( s?.key === `${MOD}.contagionState` || s?.key === `${MOD}.markets` ) sickLater(); });
  Hooks.on("createSetting", s => { if ( s?.key === `${MOD}.contagionState` ) sickLater(); });
  Hooks.on("wodxContagion", sickLater);
  sickLater();
  // B4623: the hunters' notices and lanterns follow each region's stage
  let huntSoon = null;
  const huntLater = () => { if ( !isActiveGM() ) return; clearTimeout(huntSoon); huntSoon = setTimeout(() => syncHunters().catch(e => console.error(`${MOD} | hunter looks`, e)), 500); };
  Hooks.on("updateSetting", s => { if ( s?.key === `${MOD}.hunterState` || s?.key === `${MOD}.markets` ) huntLater(); });
  Hooks.on("createSetting", s => { if ( s?.key === `${MOD}.hunterState` ) huntLater(); });
  Hooks.on("wodxHunterStage", huntLater);
  huntLater();
  // B4624: a siege's camp and breach follow the Battles window
  let siegeSoon = null;
  const siegeLater = () => { if ( !isActiveGM() ) return; clearTimeout(siegeSoon); siegeSoon = setTimeout(() => syncSieges().catch(e => console.error(`${MOD} | siege looks`, e)), 500); };
  Hooks.on("updateSetting", s => { if ( s?.key === `${MOD}.battles` || s?.key === `${MOD}.markets` ) siegeLater(); });
  Hooks.on("createSetting", s => { if ( s?.key === `${MOD}.battles` ) siegeLater(); });
  siegeLater();
  // B4625: shut shops follow the markets (a trader's shut flag) and where the trader's token stands
  let shopSoon = null;
  const shopLater = () => { if ( !isActiveGM() ) return; clearTimeout(shopSoon); shopSoon = setTimeout(() => syncShops().catch(e => console.error(`${MOD} | shop looks`, e)), 500); };
  Hooks.on("updateSetting", s => { if ( s?.key === `${MOD}.markets` ) shopLater(); });
  Hooks.on("wodxTraderBroke", shopLater);
  Hooks.on("updateTile", (doc, change) => { if ( "x" in change || "y" in change || "width" in change || "height" in change ) { const m = MK.marketOfScene(Markets.state(), doc.parent?.id); if ( m?.traders?.some(t => t.shut && t.tile === doc.id) ) shopLater(); } });
  shopLater();
  // B4629: prosperity and unrest follow the town state
  let prosSoon = null;
  const prosLater = () => { if ( !isActiveGM() ) return; clearTimeout(prosSoon); prosSoon = setTimeout(() => syncProsperity().catch(e => console.error(`${MOD} | town looks`, e)), 500); };
  Hooks.on("updateSetting", s => { if ( s?.key === `${MOD}.townState` || s?.key === `${MOD}.markets` ) prosLater(); });
  Hooks.on("createSetting", s => { if ( s?.key === `${MOD}.townState` ) prosLater(); });
  prosLater();
  Hooks.on("wodxEventFired", ev => { if ( isActiveGM() ) showEvent(ev).catch(e => console.error(`${MOD} | event looks`, e)); });
  Hooks.on("updateWorldTime", t => {
    if ( !isActiveGM() || Math.abs(t - lastSweep) < 600 ) return;
    lastSweep = t;
    huntLater(); // pressure cools with time
    sweep().catch(e => console.error(`${MOD} | town looks`, e));
  });
}

export const api = () => ({show, showTownEvent, endFor, sweep, setLooks, marksOf, syncSick, syncHunters, torchesIn, syncSieges, syncShops, havenFire, showOmen, showEvent, syncProsperity, rules: L});
