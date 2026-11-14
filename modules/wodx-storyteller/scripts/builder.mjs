/**
 * WoDX Storyteller 0.61.0: Build this chronicle (Rothenstein Rebuild Desk, B2780-B2785). The builder reads a recipe
 * (data/recipe-rothenstein.mjs) and makes the chronicle in the world it names, one step at a time. Each step is safe to
 * run twice (what it made carries a flag and is found again), and the steps that make documents can be taken back.
 *
 * Phase 1 steps: check the world (and turn on the WoDX modules in a world made for the recipe), Start a chronicle
 * with the recipe's homeland, opening night and lines, bring across the old world's documents from the carry file,
 * and mark the anchor places and people. The later steps are listed with the phase that brings them.
 *
 * The builder never works in rothenstein-live, and in no other world than the recipe's unless forced.
 */
import * as R from "./recipe-rules.mjs";
import * as S from "./setup-rules.mjs";
import * as Setup from "./setup.mjs";
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

const RUN = {check: stepCheck, settings: stepSettings, carry: stepCarry, anchors: stepAnchors};

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
