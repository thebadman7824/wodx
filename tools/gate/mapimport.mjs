/**
 * Import Dungeondraft exports as scenes, in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/mapimport.mjs?${Date.now()}`)).run()
 * The PC map watcher (tools/ddmod/wodx-watch.ps1) runs it through the headless runner after each new export.
 *
 * The watcher puts each export in Data/wodx-maps/<map>/<stamp>/: the Universal VTT file (<map>.dd2vtt), its picture
 * (<map>.png) and, when the generator made one, the WoDX file (<map>.wodx.json). For each such folder with no scene yet:
 *   1. a scene the map's size, 100 px a square, 5 ft a square, in the scene folder "Generated maps", with the picture
 *   2. the walls, doors and windows Dungeondraft drew, and its lights
 *   3. Adopt with the WoDX file: door and window settings, interactable things, places and trigger regions
 * Nothing is deleted or overwritten: a new export of the same map makes a new scene beside the old one.
 * Result: Data/wodx-gate/mapimport-result.json.
 */
const MOD = "wodx-interactables";
const ROOT = "wodx-maps";
const FOLDER = "Generated maps";

/* ---------- pure parts (harness-tested in tools/harness/mapimport.test.mjs) ---------- */

/** Size of the scene for a Universal VTT file: {cols, rows, ppg, width, height}. */
export function sizeOf(vtt) {
  const r = vtt?.resolution ?? {};
  const ppg = Number(r.pixels_per_grid) || 100;
  const cols = Number(r.map_size?.x) || 1, rows = Number(r.map_size?.y) || 1;
  return {cols, rows, ppg, width: Math.round(cols * ppg), height: Math.round(rows * ppg)};
}

const origin = vtt => [Number(vtt?.resolution?.map_origin?.x) || 0, Number(vtt?.resolution?.map_origin?.y) || 0];
/** A point in squares (Universal VTT) to scene pixels. fr: {x0, y0, size}. */
export const toPx = (vtt, fr, p) => { const [ox, oy] = origin(vtt); return [fr.x0 + (Number(p.x) - ox) * fr.size, fr.y0 + (Number(p.y) - oy) * fr.size]; };

/** Plain walls from line_of_sight (each a run of points) and door walls from portals. Zero-length pieces are dropped. */
export function wallsOf(vtt, fr) {
  const out = [];
  const seg = (a, b, extra = {}) => {
    const c = [...toPx(vtt, fr, a), ...toPx(vtt, fr, b)].map(Math.round);
    if ( c[0] === c[2] && c[1] === c[3] ) return;
    out.push({c, ...extra});
  };
  for ( const run of vtt?.line_of_sight ?? [] ) for ( let i = 1; i < run.length; i++ ) seg(run[i - 1], run[i]);
  for ( const p of vtt?.portals ?? [] ) {
    const b = p.bounds ?? [];
    if ( b.length >= 2 ) seg(b[0], b[1], {door: 1, ds: p.closed === false ? 1 : 0});
  }
  return out;
}

/** "ffeccd8b" (alpha first, as Dungeondraft writes it) or "#eccd8b" to "#eccd8b". */
export function colourOf(c) {
  const s = String(c ?? "").replace(/^#/, "");
  if ( /^[0-9a-f]{8}$/i.test(s) ) return `#${s.slice(2)}`;
  if ( /^[0-9a-f]{6}$/i.test(s) ) return `#${s}`;
  return "#ffd9a0";
}

/** Lights. Range is in squares in the file and in scene units (5 ft a square) here; half of it is bright. */
export function lightsOf(vtt, fr) {
  return (vtt?.lights ?? []).map(l => {
    const [x, y] = toPx(vtt, fr, l.position ?? {});
    const dim = Math.max(0, Number(l.range) || 0) * fr.distance;
    return {x: Math.round(x), y: Math.round(y), config: {dim, bright: dim / 2, color: colourOf(l.color), alpha: Math.min(1, Math.max(0.1, (Number(l.intensity) || 1) * 0.5))}};
  });
}

/** The exports under the root that no scene has come from yet. files: paths ending .dd2vtt; done: Set of folders. */
export function pending(files, done) {
  return files.filter(f => /\.dd2vtt$/i.test(f)).map(f => ({vtt: f, dir: f.replace(/\/[^/]+$/, ""), base: f.replace(/\.dd2vtt$/i, "")}))
    .filter(x => !done.has(x.dir)).sort((a, b) => a.dir.localeCompare(b.dir));
}

/* ---------- in Foundry ---------- */

const FP = () => foundry.applications.apps.FilePicker.implementation;

async function walk(path, out = []) {
  let res;
  try { res = await FP().browse("data", path); } catch (e) { return out; }
  for ( const f of res.files ?? [] ) out.push(decodeURIComponent(f));
  for ( const d of res.dirs ?? [] ) await walk(decodeURIComponent(d), out);
  return out;
}

async function folderId() {
  const have = game.folders.find(f => f.type === "Scene" && f.name === FOLDER);
  return (have ?? await Folder.create({name: FOLDER, type: "Scene"})).id;
}

async function readText(path) {
  const r = await fetch(`/${encodeURI(path)}?${Date.now()}`, {cache: "no-store"});
  if ( !r.ok ) throw new Error(`${path}: ${r.status}`);
  return r.text();
}

async function importOne(x, R) {
  const vtt = JSON.parse(await readText(x.vtt));
  const png = `${x.base}.png`, side = `${x.base}.wodx.json`;
  let sideText = null;
  try { sideText = await readText(side); } catch (e) { /* a map drawn by hand has no WoDX file */ }
  const sc = sideText ? JSON.parse(sideText) : null;
  const sz = sizeOf(vtt);
  let name = sc?.name ?? x.base.split("/").pop();
  if ( game.scenes.find(s => s.name === name) ) name = `${name} (${x.dir.split("/").pop()})`;
  const scene = await Scene.create({name, width: sz.width, height: sz.height, padding: 0.25, folder: await folderId(),
    grid: {size: sz.ppg, distance: 5, units: "ft"}, background: {src: png}, tokenVision: true,
    flags: {[MOD]: {importedFrom: x.dir}}});
  const d = scene.dimensions, fr = {x0: d.sceneX, y0: d.sceneY, size: d.size, distance: d.distance};
  const walls = wallsOf(vtt, fr), lights = lightsOf(vtt, fr);
  if ( walls.length ) await scene.createEmbeddedDocuments("Wall", walls);
  if ( lights.length ) await scene.createEmbeddedDocuments("AmbientLight", lights);
  const row = {dir: x.dir, scene: scene.name, id: scene.id, walls: walls.filter(w => !w.door).length, doors: walls.filter(w => w.door).length, lights: lights.length};
  if ( sideText ) {
    const X = game.modules.get(MOD)?.api?.adopt;
    if ( !X ) row.adopt = "WoDX Interactables is off: walls only";
    else {
      const got = await X.plan(scene, sideText);
      await X.apply(scene, got.p);
      row.adopt = X.rules.summary(got.p);
      row.notes = [...got.p.notes, ...got.errors];
    }
  } else row.adopt = "no WoDX file: walls and lights only";
  try { const t = await scene.createThumbnail({img: png}); if ( t?.thumb ) await scene.update({thumb: t.thumb}); } catch (e) { row.thumb = e.message; }
  return row;
}

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.imported.length} imported, ${R.failed.length} failed`;
  const file = new File([JSON.stringify(R, null, 1)], "mapimport-result.json", {type: "application/json"});
  await FP().upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, imported: [], failed: [], errors: []};
  if ( game.world.id !== "rothenstein-wodx" ) { R.errors.push("Run this in rothenstein-wodx only"); return save(R); }
  if ( !game.user.isGM ) { R.errors.push("Needs a Storyteller"); return save(R); }
  const done = new Set(game.scenes.map(s => s.flags?.[MOD]?.importedFrom).filter(Boolean));
  for ( const x of pending(await walk(ROOT), done) ) {
    try { R.imported.push(await importOne(x, R)); }
    catch (e) { R.failed.push({dir: x.dir, error: e.message}); }
  }
  return save(R);
}
