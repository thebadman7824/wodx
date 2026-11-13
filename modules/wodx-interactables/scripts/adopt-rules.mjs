/**
 * WoDX Interactables 0.19.0: adopt a generated map. The rules only; the runtime is adopt.mjs.
 *
 * A map generator (such as the farmstead script that writes Dungeondraft maps) writes a second file beside the map, a
 * WoDX sidecar (name.wodx.json), that says what each thing on the map is. After the map is imported into Foundry,
 * "Adopt a generated map" reads the sidecar and sets the map up:
 *   openings  doors, gates and shutters: the door wall the import made at that spot gets its kind, material, lock and
 *             bar; if the import made none, a new door wall is drawn there
 *   features  tiles over chests, beds, hay, an oven, a well: containers, hiding places, lights and climbs
 *   regions   places for NPC routines (a home, a workplace) and trigger regions where a track comes in
 *   households  (0.21.0, a town generator's) who lives in each building, roles only: kept on that building's region
 *   (0.22.0) a feature may carry a rotation in degrees, and a region an outline (points), for an organic town whose
 *   buildings are turned to face winding streets
 * Positions in the sidecar are grid cells from the map's top-left corner, so the scale the map was imported at does
 * not matter. Everything made is marked with the sidecar's id for it: adopting again skips what is already there, and
 * Undo removes what was made and puts the door walls back as they were.
 */

export const FORMAT = "wodx-map";
export const VERSION = 1;
const MOD = "wodx-interactables";
const NPC = "wodx-npc";
/** A wall counts as the one at an opening when its middle is within this many cells of the opening's middle. */
export const MATCH_CELLS = 0.5;
/** The tile flags a feature may carry, and which of them mark its kind. */
export const TILE_KINDS = ["container", "trap", "clue", "light", "hide", "hazard", "sacred", "watch", "mount", "climb", "isTarget"];
const OPENING_KEYS = new Set(["kind", "material", "build", "lock", "electronic", "keyName", "barred", "stuck", "wall"]);
const PLACE_KINDS = new Set(["home", "workplace", "church", "mosque", "synagogue", "temple", "tavern", "haven", "gate", "market", "street", "castle", "wilds", "caern", "alley", "yard", "docks", "park", "sewer", "hospital", "station", "elysium", "chantry", "other"]);
/** Region behaviours a sidecar may ask for, by its short name: the full type comes from WoDX NPC. */
export const BEHAVIORS = {trigger: `${NPC}.trigger`, alertZone: `${NPC}.alertZone`, reaction: `${NPC}.reaction`};

const num = v => (typeof v === "number" && Number.isFinite(v) ? v : NaN);
const isRect = r => Array.isArray(r) && r.length === 4 && r.every(v => Number.isFinite(num(v))) && r[2] > 0 && r[3] > 0;
const isSeg = c => Array.isArray(c) && c.length === 4 && c.every(v => Number.isFinite(num(v))) && (c[0] !== c[2] || c[1] !== c[3]);
const plain = o => o && typeof o === "object" && !Array.isArray(o);
const idOk = s => typeof s === "string" && /^[A-Za-z0-9._-]{1,80}$/.test(s);

/**
 * Read a sidecar (text or an object). Returns {ok, errors, data}: data keeps only what is well formed, and errors say
 * in plain words what was left out and why.
 */
export function parseSidecar(input) {
  const errors = [];
  let d = input;
  if ( typeof input === "string" ) {
    try { d = JSON.parse(input); } catch (e) { return {ok: false, errors: ["The file is not JSON."], data: null}; }
  }
  if ( !plain(d) || d.format !== FORMAT ) return {ok: false, errors: ["This is not a WoDX map file."], data: null};
  if ( Number(d.version) > VERSION ) return {ok: false, errors: [`The file is version ${d.version}; this module reads version ${VERSION}. Update WoDX Interactables.`], data: null};
  const cells = Array.isArray(d.cells) && d.cells.length === 2 && d.cells.every(v => Number.isInteger(v) && v > 0 && v <= 1000) ? d.cells : null;
  if ( !cells ) return {ok: false, errors: ["The file does not give the map's size in squares."], data: null};
  const seen = new Set();
  const fresh = (what, x) => {
    if ( !idOk(x?.id) ) { errors.push(`A ${what} has no usable id, so it was left out.`); return false; }
    if ( seen.has(x.id) ) { errors.push(`Two things share the id ${x.id}; the second was left out.`); return false; }
    seen.add(x.id); return true;
  };
  const onMap = (vals, w = 0, h = 0) => vals[0] >= -1 && vals[1] >= -1 && vals[0] + w <= cells[0] + 1 && vals[1] + h <= cells[1] + 1;
  const openings = [];
  for ( const o of Array.isArray(d.openings) ? d.openings : [] ) {
    if ( !fresh("door or window", o) ) continue;
    if ( !isSeg(o.c) || !onMap(o.c) || !onMap(o.c.slice(2)) ) { errors.push(`${o.id}: its position is not a line on the map.`); continue; }
    const flags = Object.fromEntries(Object.entries(plain(o.flags) ? o.flags : {}).filter(([k]) => OPENING_KEYS.has(k)));
    const inside = Array.isArray(o.inside) && o.inside.length === 2 && o.inside.every(v => Number.isFinite(num(v))) ? o.inside : null;
    openings.push({id: o.id, label: String(o.label ?? o.id).slice(0, 80), c: o.c.map(Number), inside, barInside: !!o.barInside && !!inside, flags});
  }
  const features = [];
  for ( const f of Array.isArray(d.features) ? d.features : [] ) {
    if ( !fresh("thing", f) ) continue;
    if ( !isRect(f.rect) || !onMap(f.rect, f.rect[2], f.rect[3]) ) { errors.push(`${f.id}: its place is not on the map.`); continue; }
    const flags = plain(f.flags) ? f.flags : {};
    const kinds = TILE_KINDS.filter(k => flags[k] === true);
    if ( kinds.length !== 1 ) { errors.push(`${f.id}: it must be exactly one kind of thing (a container, a hiding place, a light ...).`); continue; }
    const light = kinds[0] === "light" && plain(f.light) ? {dim: Math.max(0, Math.min(60, Number(f.light.dim) || 3)), bright: Math.max(0, Math.min(60, Number(f.light.bright) || 1)),
      color: /^#[0-9a-fA-F]{6}$/.test(String(f.light.color ?? "")) ? f.light.color : "#ff9a3c", on: f.light.on !== false} : null;
    const clean = Object.fromEntries(Object.entries(flags).filter(([k, v]) => /^[A-Za-z]{1,30}$/.test(k) && ["string", "number", "boolean"].includes(typeof v)));
    // 0.22.0: a thing turned with its building (organic towns): degrees about its middle; the rect is its unturned size
    const rotation = Number.isFinite(num(f.rotation)) ? ((f.rotation % 360) + 360) % 360 : 0;
    features.push({id: f.id, label: String(f.label ?? f.id).slice(0, 80), rect: f.rect.map(Number), rotation, flags: clean, light});
  }
  const regions = [];
  for ( const r of Array.isArray(d.regions) ? d.regions : [] ) {
    if ( !fresh("region", r) ) continue;
    if ( !isRect(r.rect) || !onMap(r.rect, r.rect[2], r.rect[3]) ) { errors.push(`${r.id}: its area is not on the map.`); continue; }
    const place = plain(r.place) && PLACE_KINDS.has(r.place.kind) ? {kind: r.place.kind, owner: String(r.place.owner ?? "").slice(0, 80), private: !!r.place.private} : null;
    const behaviors = (Array.isArray(r.behaviors) ? r.behaviors : []).filter(b => {
      if ( plain(b) && BEHAVIORS[b.type] ) return true;
      errors.push(`${r.id}: a behaviour of an unknown type was left out.`); return false;
    }).map(b => ({type: b.type, system: plain(b.system) ? b.system : {}}));
    if ( !place && !behaviors.length ) { errors.push(`${r.id}: it is neither a place nor has a behaviour, so it was left out.`); continue; }
    // 0.22.0: an outline for a turned building or a winding street, as x, y pairs in squares; the rect stays as its box
    let points = null;
    if ( r.points !== undefined ) {
      const ok = Array.isArray(r.points) && r.points.length >= 6 && r.points.length % 2 === 0 && r.points.length <= 400
        && r.points.every(v => Number.isFinite(num(v))) && r.points.every((v, i) => (i % 2 ? v >= -1 && v <= cells[1] + 1 : v >= -1 && v <= cells[0] + 1));
      if ( ok ) points = r.points.map(Number);
      else errors.push(`${r.id}: its outline is not a shape on the map, so its box was used.`);
    }
    regions.push({id: r.id, label: String(r.label ?? r.id).slice(0, 80), rect: r.rect.map(Number), points, place, behaviors});
  }
  // 0.21.0: a town's households (roles only), each kept on its building's region for WoDX NPC to seed later
  const households = [];
  for ( const h of Array.isArray(d.households) ? d.households : [] ) {
    if ( !fresh("household", h) ) continue;
    const reg = regions.find(r => r.id === h.building && r.place);
    if ( !reg ) { errors.push(`${h.id}: its building ${h.building ?? "(none)"} is not a place on the map, so it was left out.`); continue; }
    const people = (Array.isArray(h.people) ? h.people : []).filter(p => plain(p) && typeof p.role === "string" && p.role.trim()).slice(0, 20)
      .map(p => ({role: p.role.trim().slice(0, 40)}));
    if ( !people.length ) { errors.push(`${h.id}: nobody lives in it, so it was left out.`); continue; }
    const hh = {id: h.id, label: String(h.label ?? h.id).slice(0, 80), trade: String(h.trade ?? "").slice(0, 40), people};
    reg.household = hh;
    (reg.households ??= []).push(hh);                         // 0.35.2: a block of flats keeps every flat's household
    households.push(hh);
  }
  // 0.26.2: the kind of place the whole map is (WoDX NPC's place tag on the scene: what passers-by, sounds and the Masquerade read)
  const place = plain(d.place) && PLACE_KINDS.has(d.place.kind) ? {kind: d.place.kind} : null;
  if ( d.place !== undefined && !place ) errors.push("The map's kind of place is not one WoDX knows, so it was left out.");
  // 0.35.2: the settlement the map is part of (the town generator's --settle), for the plan to say where its record goes
  const settlement = plain(d.settlement) && idOk(d.settlement.id) ? {id: d.settlement.id, name: String(d.settlement.name ?? d.name ?? "").slice(0, 120), year: Math.round(Number(d.settlement.year)) || 0} : null;
  return {ok: true, errors, data: {name: String(d.name ?? "Generated map").slice(0, 120), map: String(d.map ?? ""), cells, openings, features, regions, households, place, settlement}};
}

/**
 * Where the map sits on the scene. scene: {dimensions: {sceneX, sceneY, size, distance}} or the same keys flat.
 * Cells convert to pixels by the grid size from the scene's top-left corner (inside any padding).
 */
export function frameOf(scene) {
  const d = scene?.dimensions ?? scene ?? {};
  return {x0: Number(d.sceneX) || 0, y0: Number(d.sceneY) || 0, size: Number(d.size) || 100, distance: Number(d.distance) || 5,
    cols: d.sceneWidth ? d.sceneWidth / (Number(d.size) || 100) : null, rows: d.sceneHeight ? d.sceneHeight / (Number(d.size) || 100) : null};
}
export const px = (fr, x, y) => [fr.x0 + x * fr.size, fr.y0 + y * fr.size];
const mid = c => [(c[0] + c[2]) / 2, (c[1] + c[3]) / 2];
const unit = c => { const dx = c[2] - c[0], dy = c[3] - c[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };

/** Does the scene's size fit the sidecar's? Returns null if it does, else a warning in plain words. */
export function sizeWarning(sc, fr) {
  if ( fr.cols === null || fr.rows === null ) return null;
  if ( Math.abs(fr.cols - sc.cells[0]) <= 1 && Math.abs(fr.rows - sc.cells[1]) <= 1 ) return null;
  return `The file is for a map of ${sc.cells[0]} by ${sc.cells[1]} squares, but this scene is ${Math.round(fr.cols)} by ${Math.round(fr.rows)}. Things may land in the wrong places.`;
}

/** Which side of a wall (c, in pixels) a point is on: the same reading as the bar's side in interact-rules.mjs. */
export function sideOf(c, p) {
  const cross = (c[2] - c[0]) * (p[1] - c[1]) - (c[3] - c[1]) * (p[0] - c[0]);
  return cross > 0 ? "a" : cross < 0 ? "b" : null;
}

/**
 * Find the wall the import made at each opening. walls: [{id, c, door, flags}] in pixels. A wall matches when it runs
 * the same way as the opening and its middle lies within MATCH_CELLS squares of the opening's middle; door walls come
 * before plain ones, the nearest first, and a wall serves one opening only.
 * Returns {pairs: [{opening, wall, c}], missing: [{opening, c}]} with c the opening in pixels.
 */
export function matchOpenings(openings, walls, fr) {
  const used = new Set(), pairs = [], missing = [];
  for ( const o of openings ) {
    const c = [...px(fr, o.c[0], o.c[1]), ...px(fr, o.c[2], o.c[3])];
    const [mx, my] = mid(c), [ux, uy] = unit(c);
    let best = null;
    for ( const w of walls ) {
      if ( used.has(w.id) || !Array.isArray(w.c) || w.c.length !== 4 ) continue;
      const [wx, wy] = mid(w.c), [vx, vy] = unit(w.c);
      if ( Math.abs(ux * vy - uy * vx) > 0.2 ) continue;
      const d = Math.hypot(wx - mx, wy - my);
      if ( d > MATCH_CELLS * fr.size ) continue;
      const rank = (w.door > 0 ? 0 : 1) * 1e9 + d;
      if ( !best || rank < best.rank ) best = {w, rank};
    }
    if ( best ) { used.add(best.w.id); pairs.push({opening: o, wall: best.w, c}); } else missing.push({opening: o, c});
  }
  return {pairs, missing};
}

/** The WoDX settings for an opening on a wall with ends c (pixels): its flags, with the bar on the inside. */
export function openingFlags(o, c, fr) {
  const f = {...o.flags, adoptId: o.id};
  if ( o.barInside && o.inside ) { const s = sideOf(c, px(fr, o.inside[0], o.inside[1])); if ( s ) f.barSide = s; }
  return f;
}

/** A tile for a feature, with its WoDX settings. The tile has no picture of its own: the map already shows the thing. */
export function tileData(f, fr) {
  const [x, y] = px(fr, f.rect[0], f.rect[1]);
  return {x: Math.round(x), y: Math.round(y), width: Math.max(1, Math.round(f.rect[2] * fr.size)), height: Math.max(1, Math.round(f.rect[3] * fr.size)),
    rotation: f.rotation ?? 0, hidden: false, texture: {src: null}, flags: {[MOD]: {...f.flags, adoptId: f.id}}};
}

/** The light for a light feature, centred on it. Radii are in squares in the sidecar and in scene units here. */
export function lightData(f, fr) {
  const [x, y] = px(fr, f.rect[0] + f.rect[2] / 2, f.rect[1] + f.rect[3] / 2);
  return {x: Math.round(x), y: Math.round(y), hidden: !f.light.on,
    config: {dim: f.light.dim * fr.distance, bright: f.light.bright * fr.distance, color: f.light.color, animation: {type: "torch", speed: 3, intensity: 3}},
    flags: {[MOD]: {adoptId: `${f.id}.light`}}};
}

/** A region for a sidecar region. types: the region behaviour types this world has; behaviours it lacks are skipped. */
export function regionData(r, fr, types = new Set()) {
  const [x, y] = px(fr, r.rect[0], r.rect[1]);
  const skipped = [];
  const behaviors = r.behaviors.filter(b => (types.has(BEHAVIORS[b.type]) ? true : (skipped.push(b.type), false)))
    .map(b => ({type: BEHAVIORS[b.type], name: b.system.label ? String(b.system.label).slice(0, 80) : r.label, system: b.system}));
  const data = {name: r.label, color: r.place ? "#7a6a4f" : "#9b3b3b",
    shapes: [r.points
      ? {type: "polygon", points: r.points.flatMap((v, i, a) => (i % 2 ? [] : px(fr, v, a[i + 1]).map(Math.round))), hole: false}
      : {type: "rectangle", x: Math.round(x), y: Math.round(y), width: Math.round(r.rect[2] * fr.size), height: Math.round(r.rect[3] * fr.size), rotation: 0, hole: false}],
    behaviors, flags: {[MOD]: {adoptId: r.id, ...(r.household ? {household: r.household} : {}), ...(r.households?.length > 1 ? {households: r.households.slice(0, 80)} : {})},
      ...(r.place ? {[NPC]: {place: r.place}} : {})}};
  return {data, skipped};
}

/**
 * The whole plan for a scene. scene: {walls, tiles, lights, regions} as arrays of plain {id, c?, door?, flags}, plus
 * the frame. types: the region behaviour types this world has. Nothing already adopted (same id) is made twice.
 * Returns {wallUpdates, wallCreates, tiles, lights: [{data, featureId}], regions, notes}.
 */
export function plan(sc, scene, fr, types = new Set()) {
  const have = new Set();
  for ( const k of ["walls", "tiles", "lights", "regions"] ) for ( const d of scene[k] ?? [] ) { const a = d.flags?.[MOD]?.adoptId; if ( a ) have.add(`${k}:${a}`); }
  const notes = [];
  const warn = sizeWarning(sc, fr); if ( warn ) notes.push(warn);
  const todo = sc.openings.filter(o => !have.has(`walls:${o.id}`));
  const free = (scene.walls ?? []).filter(w => !w.flags?.[MOD]?.adoptId);
  const {pairs, missing} = matchOpenings(todo, free, fr);
  const wallUpdates = pairs.map(({opening, wall, c}) => ({_id: wall.id, door: wall.door > 0 ? wall.door : 1, flags: {[MOD]: openingFlags(opening, wall.c, fr)}, label: opening.label,
    before: {door: wall.door ?? 0, flags: wall.flags?.[MOD] ? structuredClone(wall.flags[MOD]) : null}}));
  const wallCreates = missing.map(({opening, c}) => ({c: c.map(Math.round), door: 1, flags: {[MOD]: openingFlags(opening, c, fr)}, label: opening.label}));
  if ( missing.length ) notes.push(`No wall was found at ${missing.length === 1 ? "one door or window" : `${missing.length} doors or windows`} (${missing.map(m => m.opening.label).join(", ")}): a new door wall is drawn there.`);
  const feats = sc.features.filter(f => !have.has(`tiles:${f.id}`));
  const tiles = feats.map(f => tileData(f, fr));
  const lights = feats.filter(f => f.light && !have.has(`lights:${f.id}.light`)).map(f => ({data: lightData(f, fr), featureId: f.id}));
  const regions = [];
  for ( const r of sc.regions.filter(x => !have.has(`regions:${x.id}`)) ) {
    const {data, skipped} = regionData(r, fr, types);
    if ( skipped.length && !data.behaviors.length && !r.place ) { notes.push(`${r.label}: left out, because WoDX NPC is off and it only has NPC behaviours.`); continue; }
    if ( skipped.length ) notes.push(`${r.label}: made without its ${skipped.join(", ")} behaviour, because WoDX NPC is off. Add it by hand later.`);
    regions.push(data);
  }
  const already = sc.openings.length - todo.length + sc.features.length - feats.length;
  if ( already ) notes.push(`${already} ${already === 1 ? "thing was" : "things were"} adopted before and ${already === 1 ? "is" : "are"} left as ${already === 1 ? "it is" : "they are"}.`);
  // The scene's own kind of place stays if the Storyteller already set one, or cleared it after an earlier adoption
  const scenePlace = sc.place && !scene.placeKind && !have.size ? sc.place : null;
  if ( sc.place && scene.placeKind && scene.placeKind !== sc.place.kind ) notes.push(`The scene is already tagged as ${scene.placeKind}; the map's ${sc.place.kind} was left out.`);
  if ( sc.settlement && regions.some(r => r.flags?.[MOD]?.household) )
    notes.push(`This map is part of ${sc.settlement.name || "a settlement"}${sc.settlement.year ? ` as it stands in ${sc.settlement.year}` : ""}. Bring in its record under Settlements in the Storyteller's hand before seeding the residents.`);
  return {wallUpdates, wallCreates, tiles, lights, regions, notes, scenePlace};
}

/** One plain line for each part of a plan, for the Storyteller to read before saying yes. */
export function summary(p) {
  const n = (k, one, many) => (k === 1 ? `1 ${one}` : `${k} ${many}`);
  const out = [];
  if ( p.wallUpdates.length ) out.push(`${n(p.wallUpdates.length, "door or window", "doors and windows")} on the imported walls set up`);
  if ( p.wallCreates.length ) out.push(`${n(p.wallCreates.length, "door wall", "door walls")} drawn new`);
  if ( p.tiles.length ) out.push(`${n(p.tiles.length, "thing", "things")} made interactable (${TILE_KINDS.filter(k => p.tiles.some(t => t.flags[MOD][k] === true)).map(k => KIND_WORDS[k]).join(", ")})`);
  if ( p.lights.length ) out.push(`${n(p.lights.length, "light", "lights")} placed`);
  if ( p.regions.length ) {
    const names = p.regions.map(r => r.name), shown = names.slice(0, 8).join(", ");
    out.push(`${n(p.regions.length, "region", "regions")} drawn (${names.length > 8 ? `${shown} and ${names.length - 8} more` : shown})`);
  }
  const hh = p.regions.flatMap(r => r.flags?.[MOD]?.households ?? r.flags?.[MOD]?.household ?? []).filter(Boolean);
  if ( hh.length ) out.push(`${n(hh.length, "household", "households")} of ${hh.reduce((s, h) => s + h.people.length, 0)} people noted on their buildings, for WoDX NPC to seed later`);
  if ( p.scenePlace ) out.push(`the scene tagged as a kind of place: ${p.scenePlace.kind}`);
  return out;
}
const KIND_WORDS = {container: "containers", trap: "traps", clue: "clues", light: "lights", hide: "hiding places", hazard: "hazards", sacred: "sacred things",
  watch: "things to watch through", mount: "mounts", climb: "climbs", isTarget: "targets"};

/** What Undo needs: the ids made and each wall's settings from before. */
export function record(made, p, at) {
  return {at, made, walls: p.wallUpdates.map(u => ({id: u._id, door: u.before.door, flags: u.before.flags}))};
}
