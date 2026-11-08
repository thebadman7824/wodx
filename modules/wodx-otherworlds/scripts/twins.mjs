import {MODULE_ID} from "./ratings.mjs";

/**
 * Phase 5: twin levels. A world map gets a Penumbra level and a Shadowlands level on the same scene, each showing
 * the twin night map made from the physical one (Data/wodx-assets/twins). Roofs are copied onto each twin level
 * with their twin art; lights are copied with a colder colour. Travel regions (Teleport Token) are copied too, so a
 * road out of a map's Penumbra leads to the next map's Penumbra. Walls, sounds, notes and other regions stay on
 * every level (house rule: the spirit and shadow worlds keep the physical world's shape).
 * Nothing is deleted while building. The scene is written to Data/wodx-backups/scenes first.
 */

export const ASSET_ROOT = "wodx-assets/twins";
export const MANIFEST = `${ASSET_ROOT}/manifest.json`;
export const BACKUP_DIR = "wodx-backups/scenes";

export const LAYERS = {
  penumbra: {id: "penumbra", name: "Penumbra", bottom: 1000, light: "#b9c9ee", lightFactor: 0.9, tint: "#c4d0e8"},
  shadowlands: {id: "shadowlands", name: "Shadowlands", bottom: 2000, light: "#a6dcb6", lightFactor: 0.75, tint: "#a3aba6"}
};
export const TWIN_LAYERS = Object.keys(LAYERS);

const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const clean = p => decodeURIComponent(String(p ?? "")).replace(/^\/+/, "").split("?")[0];

/** The layer a level stands for: "physical", "penumbra" or "shadowlands". Unflagged levels are physical. */
export function layerOf(level) {
  return level?.getFlag?.(MODULE_ID, "layer") ?? level?.flags?.[MODULE_ID]?.layer ?? "physical";
}

/** The physical level and the twin levels of a scene. */
export function layersOf(scene) {
  const levels = scene?.levels ? [...scene.levels] : [];
  const out = {physical: null, penumbra: null, shadowlands: null, otherPhysical: []};
  for ( const l of levels ) {
    const k = layerOf(l);
    if ( k === "physical" ) {
      if ( !out.physical ) out.physical = l; else out.otherPhysical.push(l);
    } else if ( k in LAYERS && !out[k] ) out[k] = l;
  }
  return out;
}

/** The level a token stands on, as a layer name. */
export function tokenLayer(tokenDoc) {
  const level = tokenDoc?.parent?.levels?.get?.(tokenDoc._source?.level ?? tokenDoc.level);
  return level ? layerOf(level) : "physical";
}

let manifestCache = null;
/** The twin art list written with the art: {files: {"<original path>": {penumbra: "<path>", shadowlands: "<path>"}}} */
export async function loadManifest(path = MANIFEST, {fresh = false} = {}) {
  if ( manifestCache && !fresh && manifestCache.path === path ) return manifestCache.data;
  const url = foundry.utils.getRoute?.(path) ?? path;
  const response = await fetch(url, {cache: "no-store"});
  if ( !response.ok ) throw new Error(`The twin map list ${path} could not be read (${response.status}). Copy the twin art into Data/${ASSET_ROOT} first.`);
  const data = await response.json();
  manifestCache = {path, data};
  return data;
}

export function twinOf(manifest, src, layer) {
  return manifest?.files?.[clean(src)]?.[layer] ?? null;
}

/** What building would do, without doing it. */
export function planTwins(scene, manifest) {
  const problems = [];
  const {physical, otherPhysical, ...have} = layersOf(scene);
  if ( !physical ) problems.push("The scene has no level.");
  if ( otherPhysical.length ) problems.push(`The scene has ${otherPhysical.length + 1} physical levels (floors). Twins are made for single-level maps only.`);
  const bg = physical?.background?.src ?? null;
  const fg = physical?.foreground?.src ?? null;
  const layers = {};
  for ( const k of TWIN_LAYERS ) {
    const src = bg ? twinOf(manifest, bg, k) : null;
    layers[k] = {exists: !!have[k], level: have[k], src, fg: fg ? twinOf(manifest, fg, k) : null};
    if ( !src ) problems.push(`No ${LAYERS[k].name} art for the map ${bg ?? "(none)"}.`);
  }
  const isTwinCopy = d => !!d.getFlag?.(MODULE_ID, "twinOf");
  const onPhysical = d => !d.levels?.size || (physical && d.levels.has(physical.id));
  const tiles = [...(scene.tiles ?? [])].filter(t => !isTwinCopy(t) && onPhysical(t)).map(t => ({
    doc: t, art: Object.fromEntries(TWIN_LAYERS.map(k => [k, twinOf(manifest, t.texture?.src, k)])),
    copied: Object.fromEntries(TWIN_LAYERS.map(k => [k, !!copyOf(scene.tiles, t.id, k)]))
  }));
  const lights = [...(scene.lights ?? [])].filter(l => !isTwinCopy(l) && onPhysical(l)).map(l => ({
    doc: l, copied: Object.fromEntries(TWIN_LAYERS.map(k => [k, !!copyOf(scene.lights, l.id, k)]))
  }));
  const travel = [...(scene.regions ?? [])].filter(r => !isTwinCopy(r) && onPhysical(r) && (hasTeleport(r) || isDestination(r))).map(r => ({
    doc: r, copied: Object.fromEntries(TWIN_LAYERS.map(k => [k, !!copyOf(scene.regions, r.id, k)]))
  }));
  const built = TWIN_LAYERS.every(k => layers[k].exists) && tiles.every(t => TWIN_LAYERS.every(k => t.copied[k]))
    && lights.every(l => TWIN_LAYERS.every(k => l.copied[k])) && travel.every(r => TWIN_LAYERS.every(k => r.copied[k]));
  return {scene, ok: !problems.length, problems, physical, layers, tiles, lights, travel, built,
    untwinnedTiles: tiles.filter(t => TWIN_LAYERS.some(k => !t.art[k])).length};
}

const TELEPORT = "teleportToken";
const hasTeleport = r => [...(r.behaviors ?? [])].some(b => b.type === TELEPORT);

/** The region a Teleport Token destination names: "Scene.<id>.Region.<id>", or ".Region.<id>" relative to its scene. */
export function resolveRegion(uuid, fromScene) {
  const m = String(uuid ?? "").match(/^(?:Scene\.([^.]+))?\.?Region\.([^.]+)$/);
  if ( !m ) return null;
  const scene = m[1] ? game.scenes?.get(m[1]) : fromScene;
  return scene?.regions?.get?.(m[2]) ?? null;
}

/** Is this region where some Teleport Token behavior, on any scene, sends tokens? */
function isDestination(region) {
  for ( const s of game.scenes ?? [] ) for ( const r of s.regions ?? [] ) for ( const b of r.behaviors ?? [] ) {
    if ( b.type !== TELEPORT ) continue;
    for ( const d of b.system?.destinations ?? [] ) if ( resolveRegion(d, s) === region ) return true;
  }
  return false;
}

function copyOf(collection, id, layer) {
  for ( const d of collection ?? [] ) {
    const f = d.getFlag?.(MODULE_ID, "twinOf");
    if ( f === id && d.getFlag(MODULE_ID, "layer") === layer ) return d;
  }
  return null;
}

/** Write the scene's data to Data/wodx-backups/scenes/<id>-<time>.json. Returns the path. */
export async function backupScene(scene) {
  const FP = foundry.applications.apps.FilePicker.implementation;
  for ( const dir of ["wodx-backups", BACKUP_DIR] ) {
    try { await FP.createDirectory("data", dir, {notify: false}); }
    catch (err) { if ( !/exists/i.test(String(err?.message ?? err)) ) throw err; }
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const name = `${scene.id}-${stamp}.json`;
  const file = new File([JSON.stringify(scene.toObject(), null, 1)], name, {type: "application/json"});
  const result = await FP.upload("data", BACKUP_DIR, file, {}, {notify: false});
  if ( result === false || result?.status === "error" ) throw new Error(`The backup of ${scene.name} could not be written.`);
  return `${BACKUP_DIR}/${name}`;
}

/**
 * Build or complete the twin levels of a scene. Safe to run again: only what is missing is made.
 * @returns {Promise<{scene, backup, made: {levels: number, tiles: number, lights: number}, plan}>}
 */
export async function buildTwins(scene, {manifest, backup = true} = {}) {
  if ( !game.user.isGM ) throw new Error("Only the Storyteller can build twin levels.");
  manifest ??= await loadManifest();
  const plan = planTwins(scene, manifest);
  if ( !plan.ok ) throw new Error(`${scene.name}: ${plan.problems.join(" ")}`);
  const made = {levels: 0, tiles: 0, lights: 0};
  if ( plan.built ) return {scene, backup: null, made, plan};
  const backupPath = backup ? await backupScene(scene) : null;

  // The physical level: mark it, and close it at the top so the twins' elevations never overlap it
  const physical = plan.physical;
  const span = Number.isFinite(physical.elevation.top) && Number.isFinite(physical.elevation.bottom)
    ? (physical.elevation.top - physical.elevation.bottom) || (scene.grid?.distance ?? 5) * 4
    : (scene.grid?.distance ?? 5) * 4;
  const physBottom = Number.isFinite(physical.elevation.bottom) ? physical.elevation.bottom : 0;
  const physUpdate = {};
  if ( physical.getFlag(MODULE_ID, "layer") !== "physical" ) physUpdate[`flags.${MODULE_ID}.layer`] = "physical";
  if ( !Number.isFinite(physical.elevation.top) ) physUpdate["elevation.top"] = physBottom + span;
  if ( !Number.isFinite(physical.elevation.bottom) ) physUpdate["elevation.bottom"] = physBottom;
  if ( Object.keys(physUpdate).length ) await physical.update(physUpdate);

  // The twin levels
  const src = physical.toObject();
  const levelIds = {};
  const create = [];
  for ( const k of TWIN_LAYERS ) {
    const L = LAYERS[k];
    const p = plan.layers[k];
    if ( p.exists ) {
      levelIds[k] = p.level.id;
      if ( p.level.background?.src !== p.src ) await p.level.update({"background.src": p.src});
      continue;
    }
    create.push({
      name: L.name,
      elevation: {bottom: L.bottom, top: L.bottom + span},
      // The twin art is already the twin; any tint the night map carries is kept so both read the same at the table
      background: {src: p.src, color: src.background?.color ?? "#000000", tint: src.background?.tint ?? "#ffffff", alphaThreshold: src.background?.alphaThreshold ?? 0.75},
      foreground: {src: p.fg ?? src.foreground?.src ?? null, tint: p.fg ? (src.foreground?.tint ?? "#ffffff") : L.tint, alphaThreshold: src.foreground?.alphaThreshold ?? 0.75},
      textures: src.textures ?? {},
      visibility: {levels: []},
      flags: {[MODULE_ID]: {layer: k, twinOf: physical.id}}
    });
  }
  if ( create.length ) {
    const docs = await scene.createEmbeddedDocuments("Level", create);
    for ( const d of docs ) levelIds[d.getFlag(MODULE_ID, "layer")] = d.id;
    made.levels = docs.length;
  }

  const shift = (elevation, k) => (Number(elevation) || 0) - physBottom + LAYERS[k].bottom;

  // Roofs and other tiles: the physical one stays on the physical level; a copy with the twin art on each twin level
  const tileUpdates = [];
  const tileCreates = [];
  for ( const t of plan.tiles ) {
    const d = t.doc;
    if ( !d.levels?.size ) tileUpdates.push({_id: d.id, levels: [physical.id], [`flags.${MODULE_ID}.wasOnAllLevels`]: true});
    for ( const k of TWIN_LAYERS ) {
      if ( t.copied[k] ) continue;
      const data = d.toObject();
      delete data._id;
      data.levels = [levelIds[k]];
      data.elevation = shift(d.elevation, k);
      if ( t.art[k] ) data.texture = {...data.texture, src: t.art[k]};
      else data.texture = {...data.texture, tint: LAYERS[k].tint}; // no twin art: the same art, tinted
      data.flags = foundry.utils.mergeObject(data.flags ?? {}, {[MODULE_ID]: {twinOf: d.id, layer: k}}, {inplace: false});
      tileCreates.push(data);
    }
  }
  if ( tileUpdates.length ) await scene.updateEmbeddedDocuments("Tile", tileUpdates);
  if ( tileCreates.length ) made.tiles = (await scene.createEmbeddedDocuments("Tile", tileCreates)).length;

  // Lights: colder and a little dimmer in the twins
  const lightUpdates = [];
  const lightCreates = [];
  for ( const l of plan.lights ) {
    const d = l.doc;
    if ( !d.levels?.size ) lightUpdates.push({_id: d.id, levels: [physical.id], [`flags.${MODULE_ID}.wasOnAllLevels`]: true});
    for ( const k of TWIN_LAYERS ) {
      if ( l.copied[k] ) continue;
      const data = d.toObject();
      delete data._id;
      data.levels = [levelIds[k]];
      data.elevation = shift(d.elevation, k);
      const c = data.config ?? {};
      data.config = {...c, color: LAYERS[k].light, bright: (Number(c.bright) || 0) * LAYERS[k].lightFactor, dim: (Number(c.dim) || 0) * LAYERS[k].lightFactor};
      data.flags = foundry.utils.mergeObject(data.flags ?? {}, {[MODULE_ID]: {twinOf: d.id, layer: k}}, {inplace: false});
      lightCreates.push(data);
    }
  }
  if ( lightUpdates.length ) await scene.updateEmbeddedDocuments("AmbientLight", lightUpdates);
  if ( lightCreates.length ) made.lights = (await scene.createEmbeddedDocuments("AmbientLight", lightCreates)).length;

  // Travel regions. A destination on a scene with several levels must name one level (Foundry refuses a teleport
  // into a region on every level of such a scene), so the physical one keeps to the physical level and each twin
  // level gets its own copy, linked to the same place's twin on the far side.
  made.regions = 0;
  const regionUpdates = [];
  for ( const r of plan.travel ) {
    const d = r.doc;
    if ( !d.levels?.size ) regionUpdates.push({_id: d.id, levels: [physical.id], [`flags.${MODULE_ID}.wasOnAllLevels`]: true});
    for ( const k of TWIN_LAYERS ) {
      if ( r.copied[k] ) continue;
      const data = d.toObject();
      delete data._id;
      const behaviors = data.behaviors ?? [];
      delete data.behaviors;
      data.name = `${data.name} (${LAYERS[k].name})`;
      data.levels = [levelIds[k]];
      if ( Number.isFinite(data.elevation?.bottom) ) data.elevation.bottom = shift(data.elevation.bottom, k);
      if ( Number.isFinite(data.elevation?.top) ) data.elevation.top = shift(data.elevation.top, k);
      data.flags = foundry.utils.mergeObject(data.flags ?? {}, {[MODULE_ID]: {twinOf: d.id, layer: k}}, {inplace: false});
      const [copy] = await scene.createEmbeddedDocuments("Region", [data]);
      // Teleports start switched off; relinkTravel points them at the far side's twin and switches them on
      const bs = behaviors.map(b => {
        const {_id, ...rest} = b;
        const out = {...rest, flags: foundry.utils.mergeObject(rest.flags ?? {}, {[MODULE_ID]: {twinOfBehavior: _id, wasDisabled: !!rest.disabled}}, {inplace: false})};
        if ( b.type === TELEPORT ) out.disabled = true;
        return out;
      });
      if ( bs.length ) await copy.createEmbeddedDocuments("RegionBehavior", bs);
      made.regions++;
    }
  }
  if ( regionUpdates.length ) await scene.updateEmbeddedDocuments("Region", regionUpdates);
  await relinkTravel();

  await scene.setFlag(MODULE_ID, "twins", {built: game.time.worldTime ?? 0, backup: backupPath, version: manifest.version ?? 1});
  return {scene, backup: backupPath, made, plan: planTwins(scene, manifest)};
}

/**
 * Take the twins off a scene: the twin levels and the copies made for them. Physical tiles and lights that were
 * on every level go back to every level. Asks first (standing rule: ask before deleting); writes a backup.
 */
export async function removeTwins(scene, {confirmed = false, backup = true} = {}) {
  if ( !game.user.isGM ) return null;
  const {physical, penumbra, shadowlands} = layersOf(scene);
  const levels = [penumbra, shadowlands].filter(Boolean);
  const copies = kind => [...(scene[kind] ?? [])].filter(d => d.getFlag(MODULE_ID, "twinOf"));
  const tiles = copies("tiles");
  const lights = copies("lights");
  const regions = copies("regions");
  const tokensThere = [...(scene.tokens ?? [])].filter(t => levels.some(l => l.id === t._source?.level));
  if ( !levels.length && !tiles.length && !lights.length && !regions.length ) return {removed: 0};
  if ( !confirmed ) {
    const ok = await foundry.applications.api.DialogV2.confirm({
      classes: ["wodx", "wodx-dialog"], window: {title: "Remove twin levels"},
      content: `<p>Delete from <strong>${esc(scene.name)}</strong>: ${levels.length} twin level(s), ${tiles.length} twin tile(s), ${lights.length} twin light(s) and ${regions.length} twin travel region(s)?</p>
        <p>The physical map, its roofs, walls and lights are kept. A backup of the scene is written first.</p>
        ${tokensThere.length ? `<p><strong>${tokensThere.length} token(s)</strong> stand on a twin level; they are moved to the physical level.</p>` : ""}`,
      rejectClose: false
    });
    if ( !ok ) return null;
  }
  const backupPath = backup ? await backupScene(scene) : null;
  for ( const t of tokensThere ) await t.move?.({level: physical.id, elevation: physical.elevation.base ?? 0, action: "displace"});
  if ( tiles.length ) await scene.deleteEmbeddedDocuments("Tile", tiles.map(d => d.id));
  if ( lights.length ) await scene.deleteEmbeddedDocuments("AmbientLight", lights.map(d => d.id));
  if ( regions.length ) await scene.deleteEmbeddedDocuments("Region", regions.map(d => d.id));
  const Del = foundry.data?.operators?.ForcedDeletion;
  const unflag = Del ? {[`flags.${MODULE_ID}.wasOnAllLevels`]: new Del()} : {[`flags.${MODULE_ID}.-=wasOnAllLevels`]: null};
  const restore = kind => [...(scene[kind] ?? [])].filter(d => d.getFlag(MODULE_ID, "wasOnAllLevels"))
    .map(d => ({_id: d.id, levels: [], ...unflag}));
  const rt = restore("tiles"); if ( rt.length ) await scene.updateEmbeddedDocuments("Tile", rt);
  const rl = restore("lights"); if ( rl.length ) await scene.updateEmbeddedDocuments("AmbientLight", rl);
  const rr = restore("regions"); if ( rr.length ) await scene.updateEmbeddedDocuments("Region", rr);
  if ( levels.length ) await scene.deleteEmbeddedDocuments("Level", levels.map(l => l.id));
  await scene.unsetFlag(MODULE_ID, "twins");
  await relinkTravel();
  return {removed: levels.length + tiles.length + lights.length + regions.length, backup: backupPath};
}

/* -------------------------------------------- */
/*  Umbral paths                                */
/* -------------------------------------------- */

/**
 * A moon path between two twinned scenes: a region on each scene's Penumbra level with a Teleport Token behavior
 * to the other. A region on one level only acts on tokens on that level, so only travelers in the Umbra take the
 * path; tokens in the physical world walk over it. The regions are made at the middle of each map, two squares wide;
 * move and reshape them afterwards.
 */
export async function makeUmbralPath(from, to, {name} = {}) {
  if ( !game.user.isGM ) return null;
  const a = layersOf(from).penumbra;
  const b = layersOf(to).penumbra;
  if ( !a || !b ) throw new Error(`Both scenes need a Penumbra level first: ${[!a && from.name, !b && to.name].filter(Boolean).join(", ")}.`);
  const region = (scene, level, other) => {
    const size = (scene.grid?.size ?? 100) * 2;
    const d = scene.dimensions ?? {};
    const cx = (d.sceneX ?? 0) + (d.sceneWidth ?? scene.width ?? 2000) / 2;
    const cy = (d.sceneY ?? 0) + (d.sceneHeight ?? scene.height ?? 2000) / 2;
    return {
      name: name ?? `Moon path to ${other.name}`, color: "#9fb4e8",
      shapes: [{type: "rectangle", x: cx, y: cy, width: size, height: size, anchorX: 0.5, anchorY: 0.5, rotation: 0}],
      elevation: {bottom: null, top: null}, levels: [level.id],
      flags: {[MODULE_ID]: {umbralPath: true, to: other.id}}
    };
  };
  const [ra] = await from.createEmbeddedDocuments("Region", [region(from, a, to)]);
  const [rb] = await to.createEmbeddedDocuments("Region", [region(to, b, from)]);
  const behavior = target => ({type: "teleportToken", name: "Umbral path", system: {destinations: [target.uuid], placement: "random", snap: true, choice: true}});
  await ra.createEmbeddedDocuments("RegionBehavior", [behavior(rb)]);
  await rb.createEmbeddedDocuments("RegionBehavior", [behavior(ra)]);
  return {from: ra, to: rb};
}

/**
 * Point every twin travel region at the same layer's twin of its destination, on every scene. A teleport whose far
 * side has no twin yet stays switched off, so nobody in the Umbra is dropped into the physical world.
 * @returns {Promise<{linked: number, waiting: number}>}
 */
export async function relinkTravel() {
  let linked = 0;
  let waiting = 0;
  for ( const scene of game.scenes ?? [] ) {
    for ( const copy of scene.regions ?? [] ) {
      const layer = copy.getFlag?.(MODULE_ID, "layer");
      const origin = layer && scene.regions.get(copy.getFlag(MODULE_ID, "twinOf"));
      if ( !origin ) continue;
      for ( const b of copy.behaviors ?? [] ) {
        if ( b.type !== TELEPORT ) continue;
        const source = origin.behaviors?.get?.(b.getFlag(MODULE_ID, "twinOfBehavior"));
        const far = [...(source?.system?.destinations ?? [])].map(d => {
          const dest = resolveRegion(d, scene);
          return dest ? copyOf(dest.parent.regions, dest.id, layer) : null;
        });
        const ok = far.length > 0 && far.every(Boolean);
        const destinations = ok ? far.map(r => r.uuid) : [...(b.system?.destinations ?? [])];
        const disabled = ok ? !!(source?.disabled || b.getFlag(MODULE_ID, "wasDisabled")) : true;
        const same = !!b.disabled === disabled && JSON.stringify([...(b.system?.destinations ?? [])]) === JSON.stringify(destinations);
        if ( !same ) await b.update({"system.destinations": destinations, disabled});
        if ( ok ) linked++; else waiting++;
      }
    }
  }
  return {linked, waiting};
}
