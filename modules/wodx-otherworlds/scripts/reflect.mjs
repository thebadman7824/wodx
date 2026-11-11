/**
 * Umbral reflection in Foundry (WoDX Otherworlds 0.9.0). For a scene made from the WoDX town generator, read its
 * sidecar (name.wodx.json beside the map) and give the Penumbra and Shadowlands levels what the place means: an
 * overlay tile on each twin level (looming, webbing, Blights, Wyld growth, relics, thin Shroud, Nihils) and regions
 * for the marks that matter in play. A scene with no twin levels yet gets plain tinted ones. Undo removes it all.
 * Rules in reflect-rules.mjs.
 */
import * as RF from "./reflect-rules.mjs";
import {MODULE_ID} from "./ratings.mjs";
import {LAYERS, layersOf} from "./twins.mjs";

export const ASSET_DIR = "wodx-assets/twins/reflect";
const chron = () => game.modules.get("wodx-chronicle")?.api ?? null;
const year = () => { try { return chron()?.eras?.currentYear?.() ?? null; } catch (e) { return null; } };
const future = () => { try { return !!chron()?.rule?.("futureBranch"); } catch (e) { return false; } };
const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const firstSrc = scene => (layersOf(scene).physical?.background?.src ?? scene?.background?.src ?? "");
/** Where the generator put the sidecar: beside the map's picture. */
export const guessPath = scene => { const s = firstSrc(scene); return s ? decodeURIComponent(s).split("?")[0].replace(/\.[^./]+$/, ".wodx.json") : ""; };

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

/** A twin level for the layer, made as a tinted copy of the physical one when the twin art has not been built. */
async function ensureLevel(scene, layer) {
  const L = layersOf(scene);
  if ( L[layer] ) return L[layer];
  const phys = L.physical;
  if ( !phys ) throw new Error(`${scene.name} has no level to copy.`);
  const src = phys.toObject();
  const span = Number.isFinite(phys.elevation?.top) && Number.isFinite(phys.elevation?.bottom) ? (phys.elevation.top - phys.elevation.bottom) || 20 : 20;
  if ( phys.getFlag?.(MODULE_ID, "layer") !== "physical" ) await phys.update({[`flags.${MODULE_ID}.layer`]: "physical"});
  const T = LAYERS[layer];
  const [lvl] = await scene.createEmbeddedDocuments("Level", [{name: T.name, elevation: {bottom: T.bottom, top: T.bottom + span},
    background: {src: src.background?.src ?? null, color: src.background?.color ?? "#000000", tint: T.tint, alphaThreshold: src.background?.alphaThreshold ?? 0.75},
    foreground: {src: src.foreground?.src ?? null, tint: T.tint, alphaThreshold: src.foreground?.alphaThreshold ?? 0.75},
    textures: src.textures ?? {}, visibility: {levels: []}, flags: {[MODULE_ID]: {layer, twinOf: phys.id, plainTwin: true}}}]);
  return lvl;
}

/** Remove a scene's reflection: its overlay tiles and regions. Plain twin levels it made stay (the twins window removes those). */
export async function undoReflection(scene) {
  if ( !game.user.isGM ) return 0;
  const tiles = scene.tiles.filter(t => t.flags?.[MODULE_ID]?.reflection).map(t => t.id);
  const regions = scene.regions.filter(r => r.flags?.[MODULE_ID]?.reflection).map(r => r.id);
  if ( tiles.length ) await scene.deleteEmbeddedDocuments("Tile", tiles);
  if ( regions.length ) await scene.deleteEmbeddedDocuments("Region", regions);
  await scene.update({[`flags.${MODULE_ID}.reflection`]: null});
  return tiles.length + regions.length;
}

/**
 * Reflect a generated map onto its twin levels. sidecar: the parsed .wodx.json (or read from path). Replaces any
 * earlier reflection. Returns {penumbra: marks, shadowlands: marks}.
 */
export async function reflectScene(scene, {sidecar = null, path = null, year: y = null} = {}) {
  if ( !game.user.isGM ) throw new Error("Only the Storyteller reflects a map.");
  if ( !sidecar ) {
    const p = path || guessPath(scene);
    const res = await fetch(foundry.utils.getRoute?.(p) ?? p, {cache: "no-store"});
    if ( !res.ok ) throw new Error(`The map's WoDX file ${p} could not be read (${res.status}).`);
    sidecar = await res.json();
  }
  if ( sidecar?.format !== "wodx-map" ) throw new Error("That is not a WoDX map file.");
  await undoReflection(scene);
  const when = y ?? year() ?? sidecar.umbral?.year ?? 1197;
  const g = scene.grid?.size ?? 100;
  const d = scene.dimensions ?? {};
  const ox = d.sceneX ?? 0, oy = d.sceneY ?? 0;
  const FP = await ensureDir(ASSET_DIR);
  const out = {};
  for ( const layer of RF.LAYERS ) {
    const marks = RF.reflect(sidecar, layer, {year: when, future: future()});
    out[layer] = marks;
    if ( !marks.length ) continue;
    const level = await ensureLevel(scene, layer);
    const name = `${scene.id}-${layer}-${when}.svg`;
    const file = new File([RF.overlaySvg(marks, sidecar.cells, {cell: 50})], name, {type: "image/svg+xml"});
    const up = await FP.upload("data", ASSET_DIR, file, {}, {notify: false});
    if ( up === false || up?.status === "error" ) throw new Error(`The ${layer} overlay could not be written.`);
    const [cw, ch] = sidecar.cells ?? [scene.width / g, scene.height / g];
    await scene.createEmbeddedDocuments("Tile", [{texture: {src: `${ASSET_DIR}/${name}`}, x: ox, y: oy, width: cw * g, height: ch * g,
      elevation: (level.elevation?.bottom ?? LAYERS[layer].bottom) + 0.5, levels: [level.id], restrictions: {light: false, weather: false}, occlusion: {mode: 0},
      flags: {[MODULE_ID]: {reflection: layer}}}]);
    const regions = RF.regionsFor(marks, g).map(r => ({...r, levels: [level.id],
      shapes: r.shapes.map(s => s.type === "polygon" ? {...s, points: s.points.map((v, i) => v + (i % 2 ? oy : ox))} : {...s, x: s.x + ox, y: s.y + oy})}));
    if ( regions.length ) await scene.createEmbeddedDocuments("Region", regions);
  }
  await scene.update({[`flags.${MODULE_ID}.reflection`]: {year: when, map: sidecar.name ?? "", at: Date.now()}});
  ChatMessage.create({whisper: game.users.filter(u => u.isGM).map(u => u.id), speaker: {alias: "Otherworlds"},
    content: `<div class="wodx-card wodx-crossing"><h3>${esc(scene.name)}: the near worlds in ${when}</h3><p><b>Penumbra:</b> ${esc(RF.summary(out.penumbra))}.</p><p><b>Shadowlands:</b> ${esc(RF.summary(out.shadowlands))}.</p></div>`});
  return out;
}

/** The Storyteller's window for the current scene. */
export async function reflectDialog(scene = canvas?.scene) {
  if ( !game.user.isGM || !scene ) return null;
  const {DialogV2} = foundry.applications.api;
  const had = scene.flags?.[MODULE_ID]?.reflection;
  const pick = await DialogV2.wait({classes: ["wodx-dialog"], window: {title: "Reflect the map in the near worlds"}, rejectClose: false, position: {width: 520},
    content: `<p class="wodx-quiet">For a map made by the WoDX town generator. Churches and loved places loom in the Penumbra, rich streets and later railways carry the Weaver's webbing, dirty trades and bomb sites sour toward the Wyrm, and rivers and parks grow with the Wyld. In the Shadowlands, buildings later ages pulled down, and burned houses, stand again as relics. ${had ? `Reflected for ${had.year}.` : ""}</p>
      <div class="form-group"><label>The map's WoDX file</label><input type="text" name="path" value="${esc(guessPath(scene))}"></div>
      <div class="form-group"><label>Year</label><input type="number" name="year" value="${year() ?? ""}"></div>`,
    buttons: [{action: "go", label: "Reflect", default: true, callback: (e, b) => ({do: "go", path: b.form.elements.path.value, year: b.form.elements.year.value})},
      ...(had ? [{action: "undo", label: "Take the reflection off", callback: () => ({do: "undo"})}] : []), {action: "close", label: "Close"}]});
  if ( !pick || pick === "close" ) return null;
  try {
    if ( pick.do === "undo" ) { const n = await undoReflection(scene); ui.notifications.info(`Reflection removed (${n} pieces).`); return n; }
    return await reflectScene(scene, {path: pick.path, year: pick.year === "" ? null : Number(pick.year)});
  } catch (err) { ui.notifications.warn(err.message); return null; }
}
