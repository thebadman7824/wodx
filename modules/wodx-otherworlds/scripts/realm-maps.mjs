/**
 * Realm maps in Foundry (WoDX Otherworlds 0.8.0). The Storyteller draws a realm's map from a seed and the year, as a
 * scene of its own in the folder WoDX realms: the art (an SVG in Data/wodx-assets/realms), its walls, and regions for
 * the arrival, the ways out, the landmarks and the hazards. Then the selected tokens can be sent there, the way a power
 * or a road carries them, and brought back to where they stood. The rules are in realm-maps-rules.mjs.
 */
import * as RM from "./realm-maps-rules.mjs";
import * as WR from "./wild-rules.mjs";
import {MODULE_ID} from "./ratings.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

export const ASSET_DIR = "wodx-assets/realms";
const FOLDER = "WoDX realms";
const GRID = 100;
const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const chron = () => game.modules.get("wodx-chronicle")?.api ?? null;
const year = () => { try { return chron()?.eras?.currentYear?.() ?? 1999; } catch (e) { return 1999; } };
const future = () => { try { return !!chron()?.rule?.("futureBranch"); } catch (e) { return false; } };
export const isRealmMap = scene => !!scene?.flags?.[MODULE_ID]?.realmMap;

async function ensureDir(dir) {
  const FP = foundry.applications.apps.FilePicker.implementation;
  let path = "";
  for ( const part of dir.split("/") ) {
    path = path ? `${path}/${part}` : part;
    try { await FP.createDirectory("data", path, {notify: false}); }
    catch (err) { if ( !/exists/i.test(String(err?.message ?? err)) ) throw err; }
  }
  return FP;
}

/** Foundry 14 keeps the map's picture on the scene's first level; older data keeps it on the scene. */
const firstLevel = scene => [...(scene?.levels ?? [])].sort((a, b) => (a.elevation?.bottom ?? 0) - (b.elevation?.bottom ?? 0))[0] ?? null;
export const artOf = scene => firstLevel(scene)?.background?.src ?? scene?.background?.src ?? null;
async function setArt(scene, src) {
  const l = firstLevel(scene);
  if ( l ) { if ( l.background?.src !== src ) await l.update({"background.src": src}); }
  else if ( scene.background?.src !== src ) await scene.update({"background.src": src});
}

/** Write the map's art to Data/wodx-assets/realms. Returns the path. */
export async function writeArt(model) {
  const FP = await ensureDir(ASSET_DIR);
  const name = `${model.art ?? model.realm}-${model.year}-${model.seed}-${model.size}.svg`;
  const file = new File([RM.svg(model)], name, {type: "image/svg+xml"});
  const result = await FP.upload("data", ASSET_DIR, file, {}, {notify: false});
  if ( result === false || result?.status === "error" ) throw new Error(`The map for ${model.label} could not be written.`);
  return `${ASSET_DIR}/${name}`;
}

/**
 * Draw a realm: a new scene with its map, walls and regions. opts: {realm, seed, year, size, name, keys}. keys: extra map keywords on top of the realm's own ("forest:2, ruins").
 * Returns the scene.
 */
export async function drawRealm({realm = "tempest", seed = null, year: y = null, size = "medium", name = "", keys = ""} = {}) {
  if ( !game.user.isGM ) throw new Error("Only the Storyteller draws realm maps.");
  const s = Number.isFinite(Number(seed)) && seed !== null && seed !== "" ? Math.trunc(Number(seed)) : Math.floor(Math.random() * 1e6);
  const extra = RM.parseKeys(keys).map(k => k.n > 1 ? `${k.key}:${k.n}` : k.key);
  const model = RM.generate({realm, seed: s, year: y ?? year(), size, future: future(), keys: extra});
  const src = await writeArt(model);
  const {walls, regions} = RM.sceneParts(model, GRID);
  const folder = game.folders.find(f => f.type === "Scene" && f.name === FOLDER) ?? await Folder.create({name: FOLDER, type: "Scene", color: "#2a3340"});
  const scene = await Scene.create({
    name: String(name || `${model.label} (${model.year})`).slice(0, 120), folder: folder?.id ?? null, navigation: false,
    width: model.cols * GRID, height: model.rows * GRID, padding: 0, backgroundColor: model.palette.void, grid: {size: GRID},
    background: {src}, environment: {darknessLevel: 0.55, globalLight: {enabled: true, darkness: {max: 1}}},
    flags: {[MODULE_ID]: {realm: realm, note: RM.realmNote(model),
      realmMap: {version: model.version, realm, seed: model.seed, year: model.year, size, shape: model.shape, world: model.world, keys: extra}}}
  });
  await setArt(scene, src);
  if ( walls.length ) await scene.createEmbeddedDocuments("Wall", walls);
  if ( regions.length ) await scene.createEmbeddedDocuments("Region", regions);
  return scene;
}

/** Draw it again with the same realm and year and a new seed (or a given one), replacing the art, walls and regions. */
export async function redrawRealm(scene, {seed = null, year: y = null} = {}) {
  const f = scene?.flags?.[MODULE_ID]?.realmMap;
  if ( !f ) throw new Error("That scene is not a drawn realm.");
  if ( f.wild ) throw new Error("Wild land is fixed by its seed and its place. Draw another wild with a new seed instead.");
  const s = seed ?? Math.floor(Math.random() * 1e6);
  const model = RM.generate({realm: f.realm, seed: s, year: y ?? f.year, size: f.size, future: future(), keys: f.keys ?? []});
  const src = await writeArt(model);
  const {walls, regions} = RM.sceneParts(model, GRID);
  const oldWalls = scene.walls.filter(w => w.flags?.[MODULE_ID]?.realmWall).map(w => w.id);
  const oldRegions = scene.regions.filter(r => r.flags?.[MODULE_ID]?.realmRegion && !r.behaviors?.size).map(r => r.id);
  if ( oldWalls.length ) await scene.deleteEmbeddedDocuments("Wall", oldWalls);
  if ( oldRegions.length ) await scene.deleteEmbeddedDocuments("Region", oldRegions);
  await setArt(scene, src);
  await scene.update({[`flags.${MODULE_ID}.note`]: RM.realmNote(model), [`flags.${MODULE_ID}.realmMap`]: {...f, seed: model.seed, year: model.year}});
  await scene.createEmbeddedDocuments("Wall", walls);
  // Linked regions (with behaviours) are kept; only the plain ones are made again
  const kept = new Set(scene.regions.filter(r => r.flags?.[MODULE_ID]?.realmRegion).map(r => r.flags[MODULE_ID].realmRegionId));
  await scene.createEmbeddedDocuments("Region", regions.filter(r => !kept.has(r.flags[MODULE_ID].realmRegionId)));
  return scene;
}

/** The model a drawn realm scene was made from, made again from its flags. */
export function modelOf(scene) {
  const f = scene?.flags?.[MODULE_ID]?.realmMap;
  if ( f?.wild ) return WR.wildTile({wild: f.wild, seed: f.seed, x: f.x, y: f.y, year: f.year, size: f.size, future: future()});
  return f ? RM.generate({realm: f.realm, seed: f.seed, year: f.year, size: f.size, future: future(), keys: f.keys ?? []}) : null;
}

/* ------------------------------------------------------------------ endless wild land (0.17.0) */
export const isWild = scene => !!scene?.flags?.[MODULE_ID]?.realmMap?.wild;
/** The scene already drawn for a piece of a wild, if any. */
export function wildScene({wild, seed, x, y, size = "medium"}) {
  return [...game.scenes].find(s => { const f = s.flags?.[MODULE_ID]?.realmMap; return f?.wild === wild && f.seed === seed && f.x === x && f.y === y && f.size === size; }) ?? null;
}

/**
 * Draw one piece of a wild: the open Umbra ("umbra") or the Tempest's storm sea ("tempest"), at a place (x, y) in it.
 * The same seed and place always give the same piece, and a piece already drawn is found again, not drawn twice.
 * Returns the scene.
 */
export async function drawWild({wild = "umbra", seed = null, x = 0, y = 0, year: yr = null, size = "medium"} = {}) {
  if ( !game.user.isGM ) throw new Error("Only the Storyteller draws realm maps.");
  const s = Number.isFinite(Number(seed)) && seed !== null && seed !== "" ? Math.trunc(Number(seed)) : Math.floor(Math.random() * 1e6);
  const model = WR.wildTile({wild, seed: s, x, y, year: yr ?? year(), size, future: future()});
  const had = wildScene({wild, seed: s, x: model.wild.x, y: model.wild.y, size: model.size});
  if ( had ) return had;
  const src = await writeArt(model);
  const {walls, regions} = RM.sceneParts(model, GRID);
  const folder = game.folders.find(f => f.type === "Scene" && f.name === FOLDER) ?? await Folder.create({name: FOLDER, type: "Scene", color: "#2a3340"});
  const scene = await Scene.create({
    name: String(model.label).slice(0, 120), folder: folder?.id ?? null, navigation: false,
    width: model.cols * GRID, height: model.rows * GRID, padding: 0, backgroundColor: model.palette.void, grid: {size: GRID},
    background: {src}, environment: {darknessLevel: 0.55, globalLight: {enabled: true, darkness: {max: 1}}},
    flags: {[MODULE_ID]: {realm: model.realm, note: RM.realmNote(model),
      realmMap: {version: model.version, realm: model.realm, wild, x: model.wild.x, y: model.wild.y, seed: model.seed, year: model.year, size: model.size, shape: model.shape, world: model.world, keys: []}}}
  });
  await setArt(scene, src);
  if ( walls.length ) await scene.createEmbeddedDocuments("Wall", walls);
  if ( regions.length ) await scene.createEmbeddedDocuments("Region", regions);
  return scene;
}

/**
 * Walk on off the side of a piece of wild ("n", "e", "s", "w"): the piece beside it is drawn (or found), and the
 * selected tokens are set down where they would walk in. They still remember where they first came from, so Bring
 * them back returns them to the living world however far they have gone. Returns {scene, tokens}.
 */
export async function walkOn(scene = canvas?.scene, side = "n", tokenDocs = canvas?.tokens?.controlled?.map(t => t.document) ?? [], {follow = true} = {}) {
  if ( !game.user.isGM ) throw new Error("The Storyteller moves travellers on.");
  const f = scene?.flags?.[MODULE_ID]?.realmMap;
  if ( !f?.wild ) throw new Error("Walking on works from a piece of wild land. Open one first.");
  if ( !WR.SIDES[side] ) throw new Error("Pick north, east, south or west.");
  const here = modelOf(scene);
  if ( !WR.waysOn(here).includes(side) ) throw new Error(`Nothing can be walked to the ${WR.SIDES[side][2]} from here.`);
  const to = WR.beside(f.x, f.y, side);
  const next = await drawWild({wild: f.wild, seed: f.seed, x: to.x, y: to.y, year: f.year, size: f.size});
  const movers = tokenDocs.filter(t => t.parent?.id === scene.id);
  let made = [];
  if ( movers.length ) {
    const spots = WR.entrySpots(modelOf(next), side, movers.length).map(c => ({x: c.x * GRID, y: c.y * GRID}));
    made = await carry(movers, next, spots, t => ({cameFrom: t.flags?.[MODULE_ID]?.cameFrom ?? {scene: t.parent.id, x: t.x, y: t.y, level: t._source?.level ?? null, elevation: t.elevation ?? 0}}));
    pull(next, made);
  }
  if ( follow ) await next.view();
  ChatMessage.create({whisper: game.users.filter(u => u.isGM).map(u => u.id), speaker: {alias: "Otherworlds"},
    content: `<div class="wodx-card wodx-crossing"><h3>On to the ${WR.SIDES[side][2]}</h3><p>${made.length ? `${made.map(t => esc(t.name)).join(", ")} walk on into ${esc(next.name)}.` : `${esc(next.name)} is ready.`}</p></div>`});
  return {scene: next, tokens: made};
}

/** Where tokens arrive on a realm scene, in pixels: the arrival cells, or the scene's middle. */
function landingSpots(scene, n) {
  const model = modelOf(scene);
  if ( model ) return RM.arrivalSpots(model, n).map(c => ({x: c.x * GRID, y: c.y * GRID}));
  const g = scene.grid?.size ?? GRID, d = scene.dimensions ?? {};
  const cx = (d.sceneX ?? 0) + (d.sceneWidth ?? scene.width ?? 2000) / 2, cy = (d.sceneY ?? 0) + (d.sceneHeight ?? scene.height ?? 2000) / 2;
  return Array.from({length: n}, (_, i) => ({x: Math.round(cx / g + (i % 3) - 1) * g, y: Math.round(cy / g + Math.floor(i / 3)) * g}));
}

/** Show a scene to the players who own the tokens moved there. */
function pull(scene, tokenDocs) {
  const users = new Set();
  for ( const t of tokenDocs ) for ( const u of game.users ) if ( !u.isGM && u.active && t.actor?.testUserPermission?.(u, "OWNER") ) users.add(u.id);
  for ( const id of users ) game.socket.emit("pullToScene", scene.id, id);
  return [...users];
}

/** Carry tokens to another scene at given spots: a copy is made there and the old one removed. */
async function carry(tokenDocs, scene, spots, flag) {
  const made = [];
  for ( let i = 0; i < tokenDocs.length; i++ ) {
    const t = tokenDocs[i];
    const data = t.toObject();
    delete data._id;
    delete data.level;
    data.x = spots[i]?.x ?? spots[0]?.x ?? 0;
    data.y = spots[i]?.y ?? spots[0]?.y ?? 0;
    data.flags = foundry.utils.mergeObject(data.flags ?? {}, {[MODULE_ID]: flag(t)}, {inplace: false});
    const [nt] = await scene.createEmbeddedDocuments("Token", [data]);
    if ( nt ) { made.push(nt); await t.delete(); }
  }
  return made;
}

/** Send the selected tokens (or the ones given) into a realm scene. Each remembers where it came from. */
export async function sendToRealm(scene, tokenDocs = canvas?.tokens?.controlled?.map(t => t.document) ?? [], {follow = false} = {}) {
  if ( !game.user.isGM ) throw new Error("The Storyteller sends travellers into a realm.");
  if ( !scene ) throw new Error("Pick a realm scene first.");
  if ( !tokenDocs.length ) throw new Error("Select the travellers' tokens first.");
  if ( tokenDocs.some(t => t.parent?.id === scene.id) ) throw new Error("Those tokens are already there.");
  const spots = landingSpots(scene, tokenDocs.length);
  const made = await carry(tokenDocs, scene, spots, t => ({cameFrom: {scene: t.parent.id, x: t.x, y: t.y, level: t._source?.level ?? null, elevation: t.elevation ?? 0}}));
  pull(scene, made);
  if ( follow ) await scene.view();
  ChatMessage.create({whisper: game.users.filter(u => u.isGM).map(u => u.id), speaker: {alias: "Otherworlds"},
    content: `<div class="wodx-card wodx-crossing"><h3>Into ${esc(scene.name)}</h3><p>${made.map(t => esc(t.name)).join(", ")} arrive.</p><p class="wodx-quiet">${esc(scene.flags?.[MODULE_ID]?.note ?? "")}</p></div>`});
  return made;
}

/** Bring tokens back from a realm to where each came from (or, for one with no record, leave it and say so). */
export async function bringBack(tokenDocs = canvas?.tokens?.controlled?.map(t => t.document) ?? [], {follow = false} = {}) {
  if ( !game.user.isGM ) throw new Error("The Storyteller brings travellers back.");
  const groups = new Map(), stuck = [];
  for ( const t of tokenDocs ) {
    const from = t.flags?.[MODULE_ID]?.cameFrom;
    const home = from && game.scenes.get(from.scene);
    if ( !home ) { stuck.push(t.name); continue; }
    if ( !groups.has(home.id) ) groups.set(home.id, {home, list: []});
    groups.get(home.id).list.push(t);
  }
  const back = [];
  for ( const {home, list} of groups.values() ) {
    const spots = list.map(t => ({x: t.flags[MODULE_ID].cameFrom.x, y: t.flags[MODULE_ID].cameFrom.y}));
    const made = await carry(list, home, spots, () => ({cameFrom: null}));
    // Put each back on its old level and height
    for ( let i = 0; i < made.length; i++ ) {
      const from = list[i].flags?.[MODULE_ID]?.cameFrom ?? {};
      const upd = {};
      if ( from.level && home.levels?.get?.(from.level) ) upd.level = from.level;
      if ( Number.isFinite(from.elevation) ) upd.elevation = from.elevation;
      if ( Object.keys(upd).length ) await made[i].update(upd);
    }
    pull(home, made);
    if ( follow ) await home.view();
    back.push(...made);
  }
  if ( stuck.length ) ui.notifications.warn(`${stuck.join(", ")}: no record of where they came from. Move them by hand.`);
  return back;
}

const realmOptions = () => RM.LINES.map(line => {
  const ids = RM.REALM_ORDER.filter(id => RM.REALMS[id].line === line);
  if ( !ids.length ) return "";
  return `<optgroup label="${esc(line[0].toUpperCase() + line.slice(1))}">${ids.map(id => `<option value="${id}">${esc(RM.REALMS[id].label)}</option>`).join("")}</optgroup>`;
}).join("");

/** The Storyteller's window: draw a realm, send the selected tokens into one, or bring them back. */
export async function realmMapsDialog() {
  if ( !game.user.isGM ) return null;
  const {DialogV2} = foundry.applications.api;
  const drawn = [...game.scenes].filter(isRealmMap).sort((a, b) => a.name.localeCompare(b.name));
  const sceneOpts = drawn.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join("");
  const sel = canvas?.tokens?.controlled?.length ?? 0;
  const pick = await DialogV2.wait({classes: ["wodx-dialog"], window: {title: "Realm maps"}, rejectClose: false, position: {width: 540},
    content: `<p class="wodx-quiet">Every realm past the Penumbra, the Shadowlands and the Near Dreaming can have a map of its own, drawn from a seed for the year in force (${year()}). Travellers are sent there by the power or road that takes them, and brought back to where they stood.</p>
      <h3>Draw a realm</h3>
      <div class="form-group"><label>Realm</label>${searchBox("select[name=realm]", "Find a realm…", "Search realms")}<select name="realm">${realmOptions()}</select></div>
      <div class="form-group"><label>Size</label><select name="size" data-fixed><option value="small">Small (30 by 22)</option><option value="medium" selected>Medium (40 by 30)</option><option value="large">Large (56 by 40)</option></select></div>
      <div class="form-group"><label>Seed</label><input type="number" name="seed" placeholder="Leave empty for a new map"></div>
      <div class="form-group"><label>Year</label><input type="number" name="year" value="${year()}"></div>
      <div class="form-group"><label>Extra keywords</label><input type="text" name="keys" maxlength="200" placeholder="Added to the realm's own, as forest:2, ruins" list="wodx-realm-keys"><datalist id="wodx-realm-keys">${Object.entries(RM.KEYWORDS).map(([k, v]) => `<option value="${k}">${v.label}: ${v.about}</option>`).join("")}</datalist></div>
      <p class="wodx-quiet">Keywords: ${Object.keys(RM.KEYWORDS).join(", ")}. Add :2 or :3 for more. The realm's own: shown on the scene's note.</p>
      <div class="form-group"><label>Name</label><input type="text" name="name" maxlength="120" placeholder="As the realm is called"></div>
      <h3>Wild land with no edge</h3>
      <p class="wodx-quiet">The open Umbra and the Tempest's storm sea go on for ever. Draw a piece by its place; walking on off a side draws the piece beside it, and the same seed always gives the same land.${isWild(canvas?.scene) ? "" : " Open a piece of wild land to walk on from it."}</p>
      <div class="form-group"><label>Wild</label><select name="wild" data-fixed>${WR.WILD_ORDER.map(id => `<option value="${id}">${esc(WR.WILDS[id].label)}</option>`).join("")}</select></div>
      <div class="form-group"><label>Place (east, south)</label><div class="form-fields"><input type="number" name="wx" value="${canvas?.scene?.flags?.[MODULE_ID]?.realmMap?.x ?? 0}" step="1"><input type="number" name="wy" value="${canvas?.scene?.flags?.[MODULE_ID]?.realmMap?.y ?? 0}" step="1"></div></div>
      <div class="form-group"><label>Walk on to the</label><select name="side" data-fixed>${Object.entries(WR.SIDES).map(([k, v]) => `<option value="${k}">${v[2][0].toUpperCase() + v[2].slice(1)}</option>`).join("")}</select></div>
      <h3>Send or bring back (${sel} token${sel === 1 ? "" : "s"} selected)</h3>
      <div class="form-group"><label>Into</label>${searchBox("select[name=scene]", "Find a drawn realm…", "Search drawn realms")}<select name="scene">${sceneOpts || `<option value="">No realm drawn yet</option>`}</select></div>
      <div class="form-group"><label>Go there too</label><input type="checkbox" name="follow"></div>`,
    buttons: [
      {action: "draw", label: "Draw the realm", default: true, callback: (e, b) => ({do: "draw", ...Object.fromEntries(["realm", "size", "seed", "year", "name", "keys"].map(k => [k, b.form.elements[k].value]))})},
      {action: "wild", label: "Draw wild land", callback: (e, b) => ({do: "wild", ...Object.fromEntries(["wild", "size", "seed", "year", "wx", "wy"].map(k => [k, b.form.elements[k].value]))})},
      {action: "walk", label: "Walk on", callback: (e, b) => ({do: "walk", side: b.form.elements.side.value})},
      {action: "send", label: "Send the selected tokens", callback: (e, b) => ({do: "send", scene: b.form.elements.scene.value, follow: b.form.elements.follow.checked})},
      {action: "back", label: "Bring them back", callback: (e, b) => ({do: "back", follow: b.form.elements.follow.checked})},
      {action: "close", label: "Close"}]});
  if ( !pick || pick === "close" ) return null;
  try {
    if ( pick.do === "draw" ) {
      const s = await drawRealm({realm: pick.realm, size: pick.size, seed: pick.seed === "" ? null : pick.seed, year: pick.year === "" ? null : Number(pick.year), name: pick.name, keys: pick.keys});
      ui.notifications.info(`${s.name} is drawn, in ${FOLDER}.`);
      return s;
    }
    if ( pick.do === "wild" ) {
      const s = await drawWild({wild: pick.wild, size: pick.size, seed: pick.seed === "" ? null : pick.seed, year: pick.year === "" ? null : Number(pick.year), x: Number(pick.wx) || 0, y: Number(pick.wy) || 0});
      ui.notifications.info(`${s.name} is drawn, in ${FOLDER}. Its seed is ${s.flags[MODULE_ID].realmMap.seed}.`);
      return s;
    }
    if ( pick.do === "walk" ) return (await walkOn(canvas?.scene, pick.side)).scene;
    if ( pick.do === "send" ) return await sendToRealm(game.scenes.get(pick.scene), undefined, {follow: pick.follow});
    return await bringBack(undefined, {follow: pick.follow});
  } catch (err) { ui.notifications.warn(err.message); return null; }
}
