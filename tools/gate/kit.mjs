/**
 * The shared gate kit (B3730). Every gate follows the same rules (docs/WORKFLOW.md, "Gate rules"):
 *   1. Documents a gate makes are found by name or by the gate's flag, never by their place in a list: a batch
 *      create does not promise its order, and other gates' leftovers can sit in the same collection.
 *   2. A gate makes its own scratch scene and actors and removes them at the end. It never leans on what an
 *      earlier gate or the lane left behind (the viewed scene, a named actor, a setting).
 *   3. A gate checks what a feature does, not a count of rows, a version number or an old window's markup.
 *   4. A gate brings its own fixtures (tools/gate/fixtures/), such as a small map, instead of expecting them on the lane.
 *
 *   import {gate} from "./kit.mjs";
 *   export async function run() {
 *     const G = gate("gatefoo");
 *     try {
 *       const scene = await G.scene();                               // a scratch scene, viewed
 *       const [a, b] = await G.make(Actor, [{name: "Gate Foo A", type: "Mortal"}, {name: "Gate Foo B", type: "Mortal"}]);
 *       const [ta] = await G.tokens(scene, [{actor: a, x: 2, y: 2}]);
 *       await G.step("1. it works", async () => G.ok("1. it works", true, {detail: 1}));
 *     } finally { return G.finish(); }                            // removes what it made, saves the result file
 *   }
 *
 * The kit runs in the browser, served from Data/wodx-gate with the gates.
 */
const FLAG = "wodxGate";
const COLLECTIONS = ["actors", "items", "scenes", "journal", "tables", "macros", "playlists", "cards", "combats", "folders", "messages"];

/** Documents in the order of the data they were made from, matched by name (then by the order of equal names). */
export function inOrder(docs, data) {
  const left = [...docs];
  return data.map(d => {
    const i = left.findIndex(x => x.name === d.name);
    return i >= 0 ? left.splice(i, 1)[0] : undefined;
  });
}

/** Every document in a world collection whose flag or name matches. */
export function byFlag(collection, key, value) {
  return [...(collection ?? [])].filter(d => {
    const f = d.getFlag?.("world", FLAG) ?? d.flags?.world?.[FLAG];
    return value === undefined ? f?.[key] !== undefined : f?.[key] === value;
  });
}
export const byName = (collection, name) => [...(collection ?? [])].filter(d => d.name === name);

export function gate(name, {stepTimeout = 30000} = {}) {
  const run = `${name}-${Date.now().toString(36)}`;
  const R = {gate: name, run, started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const made = []; // [collection key, id]
  const before = {active: game.scenes.active?.id ?? null, viewed: canvas?.scene?.id ?? null, time: game.time.worldTime};
  const tag = data => foundry.utils.mergeObject(foundry.utils.deepClone(data), {[`flags.world.${FLAG}`]: {gate: name, run}});

  const ok = (step, pass, detail = {}) => { R.steps.push({name: step, pass: !!pass, ...detail}); return !!pass; };

  /** A step that throws, or waits on a window or a roll for longer than stepTimeout, fails instead of holding the lane;
   * windows it opened are closed. */
  async function step(stepName, fn) {
    const open = () => [...new Set([...(foundry.applications.instances?.values?.() ?? []), ...Object.values(ui.windows)])];
    const had = new Set(open());
    let timer;
    const late = new Promise((_, no) => { timer = setTimeout(() => no(new Error(`timed out after ${Math.round(stepTimeout / 1000)} s`)), stepTimeout); });
    try { await Promise.race([fn(), late]); }
    catch (e) {
      ok(stepName, false, {error: e?.message ?? String(e), stack: String(e?.stack ?? "").split("\n").slice(0, 3).join(" | ")});
      for ( const w of open() ) if ( !had.has(w) ) { try { await w.close?.(); } catch {} }
    } finally { clearTimeout(timer); }
  }

  const keyOf = cls => cls.metadata?.collection ?? cls.collectionName ?? cls.documentName?.toLowerCase();
  /** Makes documents tagged as this gate's, returned in the order of data whatever order the server gives. */
  async function make(cls, data, options = {}) {
    const list = Array.isArray(data) ? data : [data];
    const docs = await cls.createDocuments(list.map(tag), options);
    for ( const d of docs ) made.push([keyOf(cls) ?? d.collectionName, d.id]);
    const out = inOrder(docs, list);
    return Array.isArray(data) ? out : out[0];
  }

  /** A scratch scene of its own, viewed (and activated when asked), with a plain square grid. */
  async function scene({name: sceneName = `WoDX gate: ${name}`, width = 2000, height = 1500, grid = 100, activate = false, ...rest} = {}) {
    const s = await make(Scene, {name: sceneName, width, height, grid: {size: grid, type: 1}, padding: 0, tokenVision: false, fog: {exploration: false}, ...rest});
    if ( activate ) await s.activate(); else await s.view();
    await waitFor(() => canvas?.ready && canvas.scene?.id === s.id, 20000);
    return s;
  }

  /** Tokens for actors on a scene, at grid squares, returned in the order asked. */
  async function tokens(s, list) {
    const size = s.grid?.size ?? 100;
    const data = await Promise.all(list.map(async ({actor, x = 0, y = 0, ...rest}) => {
      const td = await actor.getTokenDocument({x: x * size, y: y * size, ...rest});
      return foundry.utils.mergeObject(td.toObject(), {[`flags.world.${FLAG}`]: {gate: name, run}});
    }));
    const docs = await s.createEmbeddedDocuments("Token", data);
    return list.map(({actor}, i) => docs.filter(t => t.actorId === actor.id)[list.slice(0, i).filter(o => o.actor.id === actor.id).length]);
  }

  /** A fixture from tools/gate/fixtures (served at /wodx-gate/fixtures/). JSON is parsed; other files come as text. */
  async function fixture(file) {
    const res = await fetch(`/wodx-gate/fixtures/${file}?${Date.now()}`);
    if ( !res.ok ) throw new Error(`no fixture ${file} (${res.status})`);
    return file.endsWith(".json") ? res.json() : res.text();
  }
  /** A scene made from a fixture (a scene's exported JSON: walls, tiles, lights and notes come with it). */
  async function fixtureScene(file, {activate = false} = {}) {
    const data = await fixture(file);
    delete data._id;
    return scene({...data, name: data.name ?? `WoDX gate: ${name}`, activate});
  }

  /** Removes everything this run made (tracked, or carrying its flag), puts the scene and the clock back. */
  async function cleanup() {
    const gone = {};
    for ( const key of COLLECTIONS ) {
      const col = game[key];
      if ( !col ) continue;
      const ids = new Set(made.filter(([k]) => k === key).map(([, id]) => id));
      for ( const d of byFlag(col, "run", run) ) ids.add(d.id);
      const have = [...ids].filter(id => col.get(id));
      if ( !have.length ) continue;
      try { await col.documentClass.deleteDocuments(have); gone[key] = have.length; }
      catch (e) { R.notes.push(`cleanup ${key}: ${e?.message ?? e}`); }
    }
    try {
      const act = before.active && game.scenes.get(before.active), view = before.viewed && game.scenes.get(before.viewed);
      if ( act && game.scenes.active?.id !== act.id ) await act.activate();
      if ( view && canvas?.scene?.id !== view.id ) await view.view();
    } catch (e) { R.notes.push(`scene back: ${e?.message ?? e}`); }
    const moved = game.time.worldTime - before.time;
    if ( moved ) await game.time.advance(-moved);
    R.cleaned = gone;
  }

  /** Saves Data/wodx-gate/<gate>-result.json and returns the summary line the runner reads. */
  async function save() {
    R.finished = new Date().toISOString();
    R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
    const file = new File([JSON.stringify(R, null, 1)], `${name}-result.json`, {type: "application/json"});
    try { await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false}); }
    catch (e) { R.notes.push(`save: ${e?.message ?? e}`); }
    return R.summary;
  }

  async function finish() {
    try { await cleanup(); } catch (e) { R.errors.push(`cleanup: ${e?.message ?? e}`); }
    return save();
  }

  return {name, run, R, ok, step, make, scene, tokens, fixture, fixtureScene, cleanup, save, finish,
    named: (docs, n) => docs.find(d => d?.name === n), byFlag: (col, k, v) => byFlag(col, k, v ?? run), byName, inOrder,
    notLive: () => game.world.id === "rothenstein-live"};
}

/** The newest chat message (by its time, not its place in the list), made since a time if given, that passes a test. */
export function newestMessage(since = 0, test = () => true) {
  return [...game.messages].filter(m => (m.timestamp ?? 0) >= since && test(m)).sort((x, y) => (x.timestamp ?? 0) - (y.timestamp ?? 0)).at(-1) ?? null;
}

/** Wraps an older gate's run() in the kit: a scratch scene of its own, viewed for the whole gate, and everything the
 * kit made removed after, whatever the gate does (B3733). The gate gets the kit as its argument. */
export function kitRun(name, body, opts = {}) {
  return async () => {
    const K = gate(name, opts);
    try { await K.scene(); } catch (e) { K.R.notes.push(`scratch scene: ${e?.message ?? e}`); }
    try { return await body(K); } finally { await K.cleanup().catch(() => {}); }
  };
}

export async function waitFor(test, ms = 10000, every = 100) {
  const until = Date.now() + ms;
  while ( Date.now() < until ) { try { if ( await test() ) return true; } catch {} await new Promise(r => setTimeout(r, every)); }
  return false;
}
