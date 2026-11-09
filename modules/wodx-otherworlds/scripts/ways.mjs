import * as WR from "./ways-rules.mjs";
import {MODULE_ID} from "./ratings.mjs";
import {layersOf} from "./twins.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

/** Ways and realms in Foundry: realm scenes, and Teleport Token regions between places on their Otherworld layers. */

const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const FOLDER = "WoDX realms";
export const isRealm = scene => !!scene?.flags?.[MODULE_ID]?.realm;

/** Make a scene for a deep realm, in the folder WoDX realms. */
export async function makeRealm(realm, name = "") {
  if ( !game.user.isGM ) return null;
  const d = WR.realmScene(realm, name);
  const folder = game.folders.find(f => f.type === "Scene" && f.name === FOLDER) ?? await Folder.create({name: FOLDER, type: "Scene", color: "#2a3340"});
  const {flags, ...data} = d;
  return Scene.create({...data, folder: folder?.id ?? null, flags: {[MODULE_ID]: flags}});
}

/** The level a way's end goes on, or null when the scene lacks that layer. */
function levelFor(scene, kind, end) {
  const layer = WR.endLayer(kind, end, {isRealm: isRealm(scene)});
  if ( layer === "realm" ) return [...(scene.levels ?? [])][0] ?? null;
  if ( !layer ) return null;
  return layersOf(scene)[layer] ?? null;
}

/** A way between two scenes: a region at each end, each carrying a token to the other. Returns {from, to}. */
export async function makeWay(kind, from, to) {
  if ( !game.user.isGM ) return null;
  const K = WR.WAY_KINDS[kind];
  if ( !K ) throw new Error(`No such way: ${kind}`);
  if ( !from || !to || from.id === to.id ) throw new Error("A way needs two different scenes.");
  const la = levelFor(from, kind, "from"), lb = levelFor(to, kind, "to");
  const missing = [!la && `${from.name} (${WR.endLayer(kind, "from", {isRealm: isRealm(from)}) ?? "a realm scene"})`, !lb && `${to.name} (${WR.endLayer(kind, "to", {isRealm: isRealm(to)}) ?? "a realm scene"})`].filter(Boolean);
  if ( missing.length ) throw new Error(`The way needs its layer on: ${missing.join(", ")}.`);
  const reg = (scene, level, other) => {
    const d = scene.dimensions ?? {};
    return WR.wayRegion({name: `${K.label.split(" (")[0]} to ${other.name}`, color: K.color, grid: scene.grid?.size,
      cx: (d.sceneX ?? 0) + (d.sceneWidth ?? scene.width ?? 2000) / 2, cy: (d.sceneY ?? 0) + (d.sceneHeight ?? scene.height ?? 2000) / 2,
      levelId: level?.id ?? null, flags: {[MODULE_ID]: {way: kind, to: other.id}}});
  };
  const [ra] = await from.createEmbeddedDocuments("Region", [reg(from, la, to)]);
  const [rb] = await to.createEmbeddedDocuments("Region", [reg(to, lb, from)]);
  const behavior = target => ({type: "teleportToken", name: K.label.split(" (")[0], system: {destinations: [target.uuid], placement: "random", snap: true, choice: true}});
  await ra.createEmbeddedDocuments("RegionBehavior", [behavior(rb)]);
  await rb.createEmbeddedDocuments("RegionBehavior", [behavior(ra)]);
  return {from: ra, to: rb};
}

/** The Storyteller's window: make a realm scene, or a way between two scenes. */
export async function waysDialog() {
  if ( !game.user.isGM ) return null;
  const {DialogV2} = foundry.applications.api;
  const scenes = [...game.scenes].sort((a, b) => a.name.localeCompare(b.name));
  const opts = scenes.map(s => `<option value="${s.id}">${esc(s.name)}${isRealm(s) ? " (realm)" : ""}</option>`).join("");
  const pick = await DialogV2.wait({classes: ["wodx-dialog"], window: {title: "Ways and realms"}, rejectClose: false, position: {width: 520},
    content: `<p class="wodx-quiet">A way is a pair of regions that carry a token from one place to the other, on the layer it belongs to. A realm scene is a bare dark scene for a deep realm, in the folder ${FOLDER}.</p>
      <h3>A way</h3>
      <div class="form-group"><label>Kind</label><select name="kind" data-fixed>${WR.WAY_ORDER.map(k => `<option value="${k}">${esc(WR.WAY_KINDS[k].label)}</option>`).join("")}</select></div>
      <div class="form-group"><label>From</label>${searchBox("select[name=from]", "Find a scene…", "Search scenes to start from")}<select name="from">${opts}</select></div>
      <div class="form-group"><label>To</label>${searchBox("select[name=to]", "Find a scene…", "Search scenes to go to")}<select name="to">${opts}</select></div>
      <h3>A realm scene</h3>
      <div class="form-group"><label>Realm</label><select name="realm" data-fixed>${WR.REALM_ORDER.map(k => `<option value="${k}">${esc(WR.DEEP_REALMS[k].label)}</option>`).join("")}</select></div>
      <div class="form-group"><label>Name</label><input type="text" name="name" maxlength="120" placeholder="As the realm is called"></div>`,
    buttons: [{action: "way", label: "Make the way", default: true, callback: (e, b) => ({do: "way", kind: b.form.elements.kind.value, from: b.form.elements.from.value, to: b.form.elements.to.value})},
      {action: "realm", label: "Make the realm scene", callback: (e, b) => ({do: "realm", realm: b.form.elements.realm.value, name: b.form.elements.name.value})},
      {action: "close", label: "Close"}]});
  if ( !pick || pick === "close" ) return null;
  try {
    if ( pick.do === "realm" ) { const s = await makeRealm(pick.realm, pick.name); ui.notifications.info(`${s.name} is made, in ${FOLDER}.`); return s; }
    const r = await makeWay(pick.kind, game.scenes.get(pick.from), game.scenes.get(pick.to));
    ui.notifications.info(`The way is made: ${r.from.name}.`);
    return r;
  } catch (err) { ui.notifications.warn(err.message); return null; }
}
