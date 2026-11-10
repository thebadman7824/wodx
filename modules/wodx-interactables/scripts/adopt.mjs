/**
 * WoDX Interactables 0.19.0: adopt a generated map. The rules are in adopt-rules.mjs.
 *
 * Storyteller only. In the Scenes sidebar, a scene's right-click menu has "Adopt a generated map": pick the map's
 * WoDX file (name.wodx.json, written by the generator beside the map), read what it will do, and say yes. Doors and
 * shutters on the imported walls get their settings, chests, beds, hay, ovens and wells become interactable, and
 * places and trigger regions are drawn. "Undo the map adoption" takes it all back. Nothing runs on players' machines.
 */
import * as A from "./adopt-rules.mjs";

const MOD = "wodx-interactables";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const rowId = li => li?.dataset?.entryId ?? li?.[0]?.dataset?.entryId ?? li?.dataset?.documentId ?? li?.[0]?.dataset?.documentId;
const arr = c => c?.contents ?? [...(c?.values?.() ?? [])];
const plainOf = d => ({id: d.id, c: d.c ? [...d.c] : undefined, door: d.door, flags: d.flags ?? {}});
const unsetKey = path => {
  const Del = globalThis.foundry?.data?.operators?.ForcedDeletion;
  return Del ? {[path]: new Del()} : {[path.replace(/\.([^.]+)$/, ".-=$1")]: null};
};

/** The file the generator would have written beside the map's picture, as a first guess for the picker. */
function guessPath(scene) {
  const src = scene?.background?.src ?? scene?.img ?? "";
  return src ? src.replace(/\.[^./]+$/, ".wodx.json") : "";
}

async function pickFile(scene) {
  const FP = foundry.applications.apps.FilePicker.implementation;
  return new Promise(resolve => {
    const fp = new FP({type: "text", current: guessPath(scene), callback: path => resolve(path)});
    fp.render(true);
    // Closing the picker without choosing resolves nothing; the caller simply stops waiting
    const close = fp.close?.bind(fp);
    if ( close ) fp.close = async (...a) => { const r = await close(...a); resolve(null); return r; };
  });
}

/** Read a sidecar and work out the plan for a scene. Returns {sc, p, errors} or throws a plain message. */
export async function planFor(scene, text) {
  const parsed = A.parseSidecar(text);
  if ( !parsed.ok ) throw new Error(parsed.errors.join(" "));
  const types = new Set(Object.keys(CONFIG.RegionBehavior?.dataModels ?? {}));
  const fr = A.frameOf(scene);
  const p = A.plan(parsed.data, {walls: arr(scene.walls).map(plainOf), tiles: arr(scene.tiles).map(plainOf), lights: arr(scene.lights).map(plainOf), regions: arr(scene.regions).map(plainOf)}, fr, types);
  return {sc: parsed.data, p, errors: parsed.errors};
}

/** Carry out a plan on a scene and keep what Undo needs on the scene. */
export async function applyPlan(scene, p) {
  const made = {Wall: [], Tile: [], AmbientLight: [], Region: []};
  const ids = docs => docs.map(d => d.id);
  if ( p.wallUpdates.length ) await scene.updateEmbeddedDocuments("Wall", p.wallUpdates.map(u => ({_id: u._id, door: u.door, flags: u.flags})));
  if ( p.wallCreates.length ) made.Wall = ids(await scene.createEmbeddedDocuments("Wall", p.wallCreates.map(({label, ...d}) => d)));
  const lightIdFor = {};
  if ( p.lights.length ) {
    const ls = await scene.createEmbeddedDocuments("AmbientLight", p.lights.map(l => l.data));
    ls.forEach((l, i) => { lightIdFor[p.lights[i].featureId] = l.id; });
    made.AmbientLight = ids(ls);
  }
  if ( p.tiles.length ) {
    const data = p.tiles.map(t => {
      const f = t.flags[MOD], lid = lightIdFor[f.adoptId];
      return lid ? {...t, flags: {[MOD]: {...f, lightIds: lid}}} : t;
    });
    made.Tile = ids(await scene.createEmbeddedDocuments("Tile", data));
  }
  if ( p.regions.length ) made.Region = ids(await scene.createEmbeddedDocuments("Region", p.regions));
  const prev = scene.flags?.[MOD]?.adopted;
  const rec = A.record(made, p, Date.now());
  // A second adoption on the same scene adds to the first, so one Undo takes back both
  const merged = prev ? {at: rec.at, made: Object.fromEntries(Object.keys(made).map(k => [k, [...(prev.made?.[k] ?? []), ...made[k]]])), walls: [...(prev.walls ?? []), ...rec.walls]} : rec;
  await scene.update({[`flags.${MOD}.adopted`]: merged});
  return merged;
}

/** Take an adoption back: remove what it made and put the door walls back as they were. */
export async function undoAdoption(scene) {
  const rec = scene?.flags?.[MOD]?.adopted;
  if ( !rec ) return false;
  for ( const [type, coll] of [["Region", scene.regions], ["Tile", scene.tiles], ["AmbientLight", scene.lights], ["Wall", scene.walls]] ) {
    const there = (rec.made?.[type] ?? []).filter(id => coll?.get?.(id));
    if ( there.length ) await scene.deleteEmbeddedDocuments(type, there);
  }
  for ( const w of rec.walls ?? [] ) {
    const doc = scene.walls?.get?.(w.id);
    if ( !doc ) continue;
    await doc.update({door: w.door, ...unsetKey(`flags.${MOD}`)});
    if ( w.flags ) await doc.update({[`flags.${MOD}`]: w.flags});
  }
  await scene.update(unsetKey(`flags.${MOD}.adopted`));
  return true;
}

/** The Storyteller's flow: pick the file, read the plan, say yes. */
export async function adoptDialog(scene) {
  if ( !game.user.isGM || !scene ) return null;
  const path = await pickFile(scene);
  if ( !path ) return null;
  let text;
  try { text = await (await fetch(path, {cache: "no-store"})).text(); }
  catch (e) { ui.notifications.warn(`The file could not be read: ${e.message}`); return null; }
  let got;
  try { got = await planFor(scene, text); }
  catch (e) { ui.notifications.warn(e.message); return null; }
  const lines = A.summary(got.p);
  if ( !lines.length ) { ui.notifications.info("Everything in that file is already on this scene."); return null; }
  const notes = [...got.p.notes, ...got.errors];
  const ok = await foundry.applications.api.DialogV2.confirm({window: {title: `Adopt ${got.sc.name}`}, position: {width: 520}, classes: ["wodx-dialog", "wix-adopt"],
    content: `<p>On ${esc(scene.name)}, this will:</p><ul data-fixed>${lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>
      ${notes.length ? `<p><b>Note</b></p><ul data-fixed>${notes.map(l => `<li>${esc(l)}</li>`).join("")}</ul>` : ""}
      <p class="hint">Right-click the scene and choose Undo the map adoption to take it all back.</p>`,
    yes: {label: "Adopt it"}, no: {label: "Cancel"}, rejectClose: false});
  if ( !ok ) return null;
  const rec = await applyPlan(scene, got.p);
  ui.notifications.info(`${got.sc.name} adopted on ${scene.name}.`);
  return rec;
}

export function setupAdopt() {
  Hooks.on("getSceneContextOptions", (app, options) => {
    options.push({name: "Adopt a generated map", icon: '<i class="fa-solid fa-map-location-dot"></i>', condition: () => game.user.isGM,
      callback: li => adoptDialog(game.scenes.get(rowId(li))).catch(e => { console.error(`${MOD} |`, e); ui.notifications.error(`Adopting the map failed: ${e.message}`); })});
    options.push({name: "Undo the map adoption", icon: '<i class="fa-solid fa-rotate-left"></i>',
      condition: li => game.user.isGM && !!game.scenes.get(rowId(li))?.flags?.[MOD]?.adopted,
      callback: async li => {
        const scene = game.scenes.get(rowId(li));
        const ok = await foundry.applications.api.DialogV2.confirm({window: {title: "Undo the map adoption"}, content: `<p>Remove everything adopting the map made on ${esc(scene?.name)}, and put its doors back as they were?</p>`, rejectClose: false});
        if ( ok && await undoAdoption(scene) ) ui.notifications.info(`The adoption on ${scene.name} is undone.`);
      }});
  });
  return {plan: planFor, apply: applyPlan, undo: undoAdoption, open: adoptDialog, rules: A};
}
