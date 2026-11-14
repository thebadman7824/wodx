/**
 * WoDX Storyteller 0.61.0: Build this chronicle (Rothenstein Rebuild Desk, B2780-B2785). The builder reads a recipe
 * (data/recipe-rothenstein.mjs) and makes the chronicle in the world it names, one step at a time. Each step is safe to
 * run twice (what it made carries a flag and is found again), and the steps that make documents can be taken back.
 *
 * Phase 1 steps: check the world (and turn on the WoDX modules in a world made for the recipe), Start a chronicle
 * with the recipe's homeland, opening night and lines, bring across the old world's documents from the carry file,
 * mark the anchor places and people, and lay the Ways between the walkable maps. The later steps are listed with the phase that brings them.
 *
 * The builder never works in rothenstein-live, and in no other world than the recipe's unless forced.
 */
import * as R from "./recipe-rules.mjs";
import * as S from "./setup-rules.mjs";
import * as Setup from "./setup.mjs";
import * as Ways from "./ways.mjs";
import * as WR from "./way-rules.mjs";
import {MOD, esc} from "./core.mjs";
import {ROTHENSTEIN} from "../data/recipe-rothenstein.mjs";

export const RECIPES = {[ROTHENSTEIN.id]: ROTHENSTEIN};
const all = c => c?.contents ?? [...(c?.values?.() ?? c ?? [])];
const DEL = () => foundry.data?.operators?.ForcedDeletion ? new foundry.data.operators.ForcedDeletion() : null;

export function registerBuilderSettings() {
  game.settings.register(MOD, "builder", {scope: "world", config: false, type: Object, default: {}});
}

/** The recipe this world was made for (world flag wodx.recipe), else Rothenstein's. */
export const recipeId = () => game.world?.flags?.wodx?.recipe ?? ROTHENSTEIN.id;
export const recipe = (id = recipeId()) => RECIPES[id] ?? null;
/** Show the button only where a recipe belongs or the builder has run. */
export const wanted = () => !!game.user?.isGM && (!!game.world?.flags?.wodx?.recipe || !!Object.keys(record().steps ?? {}).length);

export const record = () => { try { return game.settings.get(MOD, "builder") ?? {}; } catch (e) { return {}; } };
async function saveStep(id, entry) {
  const r = foundry.utils.deepClone(record());
  r.recipe = recipeId(); r.version = R.RECIPE_VERSION; r.steps ??= {};
  if ( entry ) r.steps[id] = entry; else delete r.steps[id];
  await game.settings.set(MOD, "builder", r);
}

function moduleVersions() {
  const out = {};
  for ( const m of all(game.modules) ) if ( m.id?.startsWith?.("wodx-") ) out[m.id] = m.active ? m.version : null;
  return out;
}
export const plan = () => R.planSteps({modules: moduleVersions(), record: record()});

const builtFlag = (step, key) => ({[MOD]: {built: {recipe: recipeId(), step, key}}});
const builtKey = d => d?.flags?.[MOD]?.built?.key ?? null;

/* ---- The steps ---- */

async function stepCheck(r, {force}) {
  const here = R.canBuildHere(game.world.id, r, {force});
  if ( !here.ok ) return {error: here.reason};
  const regions = Object.keys(game.modules.get("wodx-chronicle")?.api?.world?.regions ?? {});
  const kinds = await import("../../wodx-npc/scripts/routine-rules.mjs").then(m => Object.keys(m.PLACE_KINDS ?? {})).catch(() => []);
  const problems = R.validate(r, {regions: regions.length ? regions : undefined, placeKinds: kinds.length ? kinds : undefined});
  if ( problems.length ) return {error: problems.join(" ")};
  // In a world made for this recipe, turn on the WoDX modules that are installed but off (Foundry reloads after)
  if ( game.world?.flags?.wodx?.recipe === r.id ) {
    const cfg = foundry.utils.deepClone(game.settings.get("core", "moduleConfiguration") ?? {});
    const turned = S.WODX_MODULES.filter(id => game.modules.get(id) && !game.modules.get(id).active && !cfg[id]);
    if ( turned.length ) {
      for ( const id of turned ) cfg[id] = true;
      await game.settings.set("core", "moduleConfiguration", cfg);
      return {wait: `Turned on ${turned.length} WoDX modules. Reload the world, then run this step again.`, turned};
    }
  }
  return {note: here.reason || "The world and the recipe are in order."};
}

async function stepSettings(r) {
  const o = r.opening;
  const res = await Setup.runSetup({name: r.title, year: o.year, month: o.month, day: o.day, hour: o.hour, homeland: r.homeland,
    climate: r.climate, lines: r.lines, setDate: true});
  if ( !res || res.error ) return {error: res?.error === "date" ? "The opening date could not be set." : "Start a chronicle did not run."};
  // The saga over the years (B3671): the recipe's spine names it, and Chronicle's switch goes on in this world
  let saga = "";
  if ( r.spine?.saga ) {
    try { await game.settings.set("wodx-chronicle", "podSaga", true); saga = ", the Rothenstein saga on"; } catch (e) { saga = ", the saga switch was not found (WoDX Chronicle is too old)"; }
  }
  return {note: `Done: ${res.done.join(", ")}${saga}.`};
}

/** The carry file: {version, source, made, docs: {Folder: [...], Actor: [...], ...}} from tools/gate/carryexport.mjs. */
async function loadCarry(r) {
  const res = await fetch(`/${r.carry.file}?${Date.now()}`);
  if ( !res.ok ) throw new Error(`The carry file ${r.carry.file} was not found. The PC job copies it from rothenstein-wodx.`);
  return res.json();
}

async function stepCarry(r) {
  const file = await loadCarry(r);
  const made = [];
  let skipped = 0;
  for ( const type of R.CARRY_ORDER ) {
    const list = file.docs?.[type] ?? [];
    if ( !list.length ) continue;
    const coll = game.collections.get(type);
    const cls = foundry.utils.getDocumentClass(type);
    if ( !coll || !cls ) continue;
    const fresh = list.filter(d => !coll.get(d._id)).map(d => {
      const x = foundry.utils.deepClone(d);
      x.flags = foundry.utils.mergeObject(x.flags ?? {}, builtFlag("carry", `${file.source}:${type}.${d._id}`));
      if ( type === "Scene" ) x.active = false;
      return x;
    });
    skipped += list.length - fresh.length;
    if ( type === "Folder" ) {
      // A folder is made once its parent is here; a parent that never comes leaves the folder at the top
      let pending = fresh;
      while ( pending.length ) {
        let ready = pending.filter(f => !f.folder || coll.get(f.folder));
        if ( !ready.length ) { ready = pending.map(f => ({...f, folder: null})); pending = []; }
        else pending = pending.filter(f => !ready.includes(f));
        const docs = await cls.createDocuments(ready, {keepId: true, wodxBuilder: true});
        made.push(...docs.map(d => d.uuid));
      }
      continue;
    }
    for ( let i = 0; i < fresh.length; i += 50 ) {
      const docs = await cls.createDocuments(fresh.slice(i, i + 50), {keepId: true, wodxBuilder: true});
      made.push(...docs.map(d => d.uuid));
    }
  }
  const prev = record().steps?.carry?.made ?? [];
  return {made: [...new Set([...prev, ...made])], note: `Brought across ${made.length} documents${skipped ? `; ${skipped} were here already` : ""}.`};
}

async function stepAnchors(r) {
  const changes = record().steps?.anchors?.made ?? [];
  const seen = new Set(changes.map(c => c.uuid));
  const scenes = all(game.scenes).map(s => ({id: s.id, name: s.name}));
  const missing = [];
  for ( const a of R.placeAnchors(r, scenes) ) {
    if ( !a.ids.length ) missing.push(a.key);
    for ( const id of a.ids ) {
      const s = game.scenes.get(id);
      if ( !s || seen.has(s.uuid) ) continue;
      const hadKind = !!s.flags?.["wodx-npc"]?.place?.kind;
      const upd = {[`flags.${MOD}.anchor`]: {recipe: r.id, key: a.key, kind: a.kind}};
      // The authored tags win: a scene's own kind of place is kept
      if ( !hadKind ) upd["flags.wodx-npc.place.kind"] = a.kind;
      await s.update(upd);
      changes.push({uuid: s.uuid, setKind: !hadKind});
    }
  }
  const actors = all(game.actors).map(x => ({id: x.id, name: x.name, playerOwned: !!x.hasPlayerOwner}));
  for ( const p of R.peopleAnchors(r, actors) ) {
    if ( !p.id ) { missing.push(p.key); continue; }
    const a = game.actors.get(p.id);
    if ( seen.has(a.uuid) ) continue;
    await a.update({[`flags.${MOD}.anchor`]: {recipe: r.id, key: p.key, home: p.home, faction: p.faction}});
    changes.push({uuid: a.uuid, setKind: false});
  }
  return {made: changes, note: `${changes.length} anchors marked.${missing.length ? ` Not found: ${missing.join(", ")}.` : ""}`, missing};
}

/* The scenes that are tries and prototypes, not places: no Ways are laid in them. */
const NOT_WALKED = /\((gridless )?trial\)|^Prototype\b|^⚔|^WoDX gate/i;
const WAY_T = `${MOD}.${Ways.TYPE}`;
const FORBIDDEN = new RegExp(`^(${R.FORBIDDEN_WORLDS.join("|")})$`);
const hasWayTo = (scene, toId) => all(scene.regions).some(r => all(r.behaviors).some(b => b.type === WAY_T && b.system?.to === toId));
function sceneBox(scene) {
  const d = scene.dimensions ?? {};
  return {x: d.sceneX ?? 0, y: d.sceneY ?? 0, w: d.sceneWidth ?? scene.width ?? 2000, h: d.sceneHeight ?? scene.height ?? 2000, g: d.size ?? scene.grid?.size ?? 100};
}

/**
 * The Ways (B4810-B4813): each old exit between two walkable maps (a Teleport Token region) gets a WoDX Way in the
 * same region, and the teleport is switched off; each door in the recipe is made from its street to the place inside.
 * Then the network check runs over every place with a Way. Running it again adds only what is missing. The builder's
 * step calls it with the recipe; a gate may pass its own doors and `only` its own scenes, then takeBackWays.
 */
export async function layWays(r = recipe(), prev = record().steps?.ways?.made ?? [], {only = null} = {}) {
  if ( !game.user.isGM || FORBIDDEN.test(game.world.id) ) return {made: [], note: "Not here.", problems: [], missing: [], lost: []};
  const made = [...prev];
  // only: a list of scene ids to work in (the gate's own places); else every scene that is a place
  const scenes = only ? only.map(id => game.scenes.get(id)).filter(Boolean) : all(game.scenes).filter(s => !NOT_WALKED.test(s.name ?? ""));
  const view = scenes.map(s => ({id: s.id, name: s.name, regions: all(s.regions).map(x => ({id: x.id, name: x.name, flags: x.flags,
    behaviors: all(x.behaviors).map(b => ({id: b.id, type: b.type, disabled: b.disabled, system: b.system?.toObject?.() ?? b.system}))}))}));
  const {ways, lost} = WR.exitsToWays(view);
  let exits = 0, doors = 0;
  for ( const w of ways ) {
    const region = game.scenes.get(w.sceneId)?.regions.get(w.regionId);
    if ( !region || all(region.behaviors).some(b => b.type === WAY_T) ) continue;
    const [b] = await region.createEmbeddedDocuments("RegionBehavior", [{type: WAY_T, name: w.name, system: {to: w.to, arrive: w.arrive, kind: w.kind, shut: "", locked: false}}]);
    const tp = region.behaviors.get(w.behaviorId);
    if ( tp ) await tp.update({disabled: true});
    made.push({kind: "behavior", uuid: b.uuid, teleport: tp?.uuid ?? null});
    exits++;
  }
  const names = scenes.map(s => ({id: s.id, name: s.name}));
  const plan = WR.planDoors(r.doors ?? [], names);
  const onStreet = new Map();
  for ( const d of plan.doors ) {
    const street = game.scenes.get(d.street), inside = game.scenes.get(d.inside);
    const n = onStreet.get(street.id) ?? all(street.regions).filter(x => x.flags?.[MOD]?.door).length;
    onStreet.set(street.id, n + 1);
    if ( hasWayTo(street, inside.id) ) continue;
    const ends = await Ways.makeWay(street, inside, {kind: d.kind, shut: d.shut, fromRect: WR.doorSpot(n, sceneBox(street))});
    await ends.from.update({[`flags.${MOD}.door`]: true});
    made.push({kind: "region", uuid: ends.from.uuid}, {kind: "region", uuid: ends.to.uuid});
    doors++;
  }
  const walked = new Set([...ways.flatMap(w => [w.sceneId, w.to]), ...plan.doors.flatMap(d => [d.street, d.inside])]);
  const net = scenes.filter(s => walked.has(s.id)).map(s => ({id: s.id, name: s.name,
    ways: all(s.regions).flatMap(x => all(x.behaviors).filter(b => b.type === WAY_T && !b.disabled).map(b => ({to: b.system.to})))}));
  const problems = WR.checkNetwork(net);
  const missing = plan.missing;
  const note = `${exits} old exits became Ways and ${doors} doors were made; ${net.length} places can be walked.` +
    (problems.length ? ` The network check: ${problems.slice(0, 6).join(" ")}${problems.length > 6 ? ` And ${problems.length - 6} more.` : ""}` : " Every place can be reached and left.") +
    (missing.length ? ` Not found: ${missing.join(", ")}.` : "") + (lost.length ? ` ${lost.length} exits lead nowhere and were left as they were.` : "");
  return {made, note, problems, missing, lost};
}
const stepWays = r => layWays(r);

/** Take back what layWays made: its Ways and doors come off, and the old teleports come back on. */
export async function takeBackWays(made = []) {
  if ( !game.user.isGM ) return 0;
  let n = 0;
  for ( const c of [...made].reverse() ) {
    const d = fromUuidSync(c.uuid);
    if ( d ) { await d.delete(); n++; }
    const tp = c.teleport ? fromUuidSync(c.teleport) : null;
    if ( tp ) await tp.update({disabled: false});
  }
  return n;
}

const RUN = {check: stepCheck, settings: stepSettings, carry: stepCarry, anchors: stepAnchors, ways: stepWays};

/**
 * Run one step. opts: {force} lets the builder work in another world than the recipe's (never in Live).
 * Returns {ok, id, note | wait | error}.
 */
export async function runStep(id, {force = false} = {}) {
  if ( !game.user.isGM ) return {ok: false, id, error: "Only the Storyteller builds."};
  const r = recipe();
  const row = plan().find(x => x.id === id);
  if ( !r || !row ) return {ok: false, id, error: "No such step."};
  if ( row.state === "later" || row.state === "blocked" ) return {ok: false, id, error: row.reason};
  if ( id !== "check" ) { const here = R.canBuildHere(game.world.id, r, {force}); if ( !here.ok ) return {ok: false, id, error: here.reason}; }
  try {
    const res = await RUN[id](r, {force});
    if ( res.error || res.wait ) return {ok: false, id, ...res};
    await saveStep(id, {at: Date.now(), made: res.made ?? [], note: res.note ?? "", forced: !!force});
    return {ok: true, id, ...res};
  } catch (e) {
    console.error(`${MOD} | builder ${id}`, e);
    return {ok: false, id, error: e.message};
  }
}

/** A step already done runs again (to pick up what is new); its record is kept and added to. */
export async function rerunStep(id, opts = {}) {
  const r = foundry.utils.deepClone(record());
  const prev = r.steps?.[id];
  if ( prev ) { delete r.steps[id]; await game.settings.set(MOD, "builder", r); }
  const res = await runStep(id, opts);
  if ( !res.ok && prev ) await saveStep(id, prev);
  return res;
}

/** Take a step back: delete what it made, or unmark what it marked. Only steps marked undo in recipe-rules.mjs. */
export async function undoStep(id) {
  if ( !game.user.isGM ) return {ok: false, id};
  const s = R.stepOf(id);
  const rec = record().steps?.[id];
  if ( !s?.undo || !rec ) return {ok: false, id, error: "Nothing to take back."};
  let n = 0;
  if ( id === "carry" ) {
    // Only what the builder made: a document is deleted only when it still carries the builder's flag
    const byType = {};
    for ( const uuid of rec.made ?? [] ) {
      const d = fromUuidSync(uuid);
      if ( !d || !builtKey(d) ) continue;
      (byType[d.documentName] ??= []).push(d.id);
    }
    for ( const type of [...R.CARRY_ORDER].reverse() ) {
      const ids = byType[type];
      if ( !ids?.length ) continue;
      await foundry.utils.getDocumentClass(type).deleteDocuments(ids);
      n += ids.length;
    }
  } else if ( id === "ways" ) {
    n = await takeBackWays(rec.made ?? []);
  } else if ( id === "anchors" ) {
    for ( const c of rec.made ?? [] ) {
      const d = fromUuidSync(c.uuid);
      if ( !d ) continue;
      const upd = {[`flags.${MOD}.anchor`]: DEL() ?? null};
      if ( c.setKind ) upd["flags.wodx-npc.place.kind"] = DEL() ?? null;
      await d.update(upd);
      n++;
    }
  }
  await saveStep(id, null);
  return {ok: true, id, note: `${n} taken back.`};
}

/** Run every ready step in order until one stops. */
export async function runAll(opts = {}) {
  const out = [];
  for ( let guard = 0; guard < R.STEPS.length; guard++ ) {
    const next = plan().find(x => x.state === "ready");
    if ( !next ) break;
    const res = await runStep(next.id, opts);
    out.push(res);
    if ( !res.ok ) break;
  }
  return out;
}

/* ---- The window ---- */

const {ApplicationV2} = foundry.applications?.api ?? {ApplicationV2: class {}};
const STATE_WORDS = {done: "Done", ready: "Ready", blocked: "Waiting", later: "Later"};

export class BuilderApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-builder",
    classes: ["wodx", "wst-builder-app"],
    window: {title: "Build this chronicle", icon: "fa-solid fa-chess-rook", resizable: true},
    position: {width: 600, height: 620},
    actions: {run: BuilderApp.#onRun, again: BuilderApp.#onAgain, undo: BuilderApp.#onUndo, all: BuilderApp.#onAll}
  };
  static #instance;
  static #last = "";
  static open() { this.#instance ??= new BuilderApp(); return this.#instance.render({force: true}); }

  async _renderHTML() {
    const r = recipe();
    const rows = plan();
    const here = r ? R.canBuildHere(game.world.id, r) : {ok: false, reason: "No recipe."};
    const rec = record().steps ?? {};
    const row = s => `<li class="wst-build-row" data-state="${s.state}" data-search-item data-search-text="${esc(s.label)}">
      <div><strong>${esc(s.label)}</strong> <span class="wodx-quiet">${esc(STATE_WORDS[s.state])}${s.reason ? `: ${esc(s.reason)}` : ""}${rec[s.id]?.note ? `. ${esc(rec[s.id].note)}` : ""}</span></div>
      <div class="wodx-buttons">${s.state === "ready" ? `<button type="button" data-action="run" data-id="${s.id}">Run</button>` : ""}
        ${s.state === "done" && s.id !== "check" ? `<button type="button" data-action="again" data-id="${s.id}" title="Run again to pick up what is new; nothing is made twice">Again</button>` : ""}
        ${s.state === "done" && s.undo ? `<button type="button" data-action="undo" data-id="${s.id}">Undo</button>` : ""}</div></li>`;
    const div = document.createElement("div");
    div.className = "wodx-body";
    div.innerHTML = `<p>${esc(r?.title ?? "")}: ${esc(r ? `${r.homeland}, opening ${r.opening.year}` : "")}. ${here.ok ? "This is the recipe's world." : `<strong>${esc(here.reason)}</strong>`}</p>
      <p class="wodx-quiet">Each step can run twice without making copies. Undo takes back only what the builder made.</p>
      <ol class="wodx-scroll wst-build-list" data-fixed>${rows.map(row).join("")}</ol>
      ${BuilderApp.#last ? `<p class="wst-build-last">${esc(BuilderApp.#last)}</p>` : ""}
      <div class="wodx-buttons"><button type="button" data-action="all"${here.ok ? "" : " disabled"}>Run every ready step</button></div>`;
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }

  static #say(res) { this.#last = (Array.isArray(res) ? res : [res]).map(x => `${R.stepOf(x.id)?.label ?? x.id}: ${x.note ?? x.wait ?? x.error ?? ""}`).join(" "); }
  static async #onRun(e, t) { BuilderApp.#say(await runStep(t.dataset.id)); this.render(); }
  static async #onAgain(e, t) { BuilderApp.#say(await rerunStep(t.dataset.id)); this.render(); }
  static async #onAll() { BuilderApp.#say(await runAll()); this.render(); }
  static async #onUndo(e, t) {
    const s = R.stepOf(t.dataset.id);
    const ok = await foundry.applications.api.DialogV2.confirm({window: {title: "Take a step back"}, classes: ["wodx-dialog"],
      content: `<p>Take back "${esc(s?.label)}"? Only what the builder made in this world is removed or unmarked.</p>`});
    if ( !ok ) return;
    BuilderApp.#say(await undoStep(t.dataset.id));
    this.render();
  }
}

export const openBuilder = () => (game.user.isGM ? BuilderApp.open() : null);
