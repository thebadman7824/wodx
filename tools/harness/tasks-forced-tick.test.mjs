import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* B6481: a forced long-task tick waits for the clock's own tick that is still running, and then rolls */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const HOUR = 3600;

// a world with one character whose work is due; the first roll of the dice waits until the test lets it go
let release = null, rollsStarted = 0;
const flags = {"wodx-storyteller": {tasks: {}}};
const maker = {
  id: "a1", name: "Maker", type: "Mortal", items: [], system: {attributes: {}, abilities: {}}, flags,
  testUserPermission: () => false,
  async update(data) {
    for ( const [k, v] of Object.entries(data) ) {
      const m = /^flags\.wodx-storyteller\.tasks\.([^.]+)$/.exec(k);
      if ( m ) flags["wodx-storyteller"].tasks[m[1]] = v;
    }
  }
};
globalThis.game = {
  user: {id: "gm", isGM: true}, users: Object.assign([{id: "gm", isGM: true}], {activeGM: null}),
  settings: {get: (m, k) => (k === "longTasks" ? true : k === "log" ? [] : null), set: async () => null},
  modules: {get: () => null}, time: {worldTime: 100 * HOUR}, actors: [maker], items: null, packs: []
};
globalThis.foundry = {utils: {deepClone: o => structuredClone(o), getProperty: (o, p) => p.split(".").reduce((x, k) => x?.[k], o)}};
globalThis.Hooks = {callAll: () => null, on: () => null};
globalThis.ChatMessage = {create: async () => ({})};
globalThis.Roll = class {
  constructor(f) { this.n = Number(/^(\d+)d10/.exec(f)?.[1]) || 1; }
  async evaluate() {
    rollsStarted++;
    if ( rollsStarted === 1 ) await new Promise(r => { release = r; });
    this.dice = [{results: Array.from({length: this.n}, () => ({result: 3}))}];
    return this;
  }
};

const T = await import(pathToFileURL(join(root, "modules/wodx-storyteller/scripts/tasks.mjs")));
const R = await import(pathToFileURL(join(root, "modules/wodx-storyteller/scripts/tasks-rules.mjs")));

test("long tasks: a forced tick waits for the running tick, a clock tick does not (B6481)", async () => {
  flags["wodx-storyteller"].tasks.t1 = R.normTask({id: "t1", kind: "craft", name: "Chest", goal: 100, interval: "hour", trouble: false, started: 0, next: 98 * HOUR});
  const first = T.tick();
  await new Promise(r => setTimeout(r, 20));
  assert.equal(typeof release, "function", "the first tick is rolling");
  // the clock's own tick while one runs: nothing, at once
  assert.deepEqual(await T.tick(), []);
  // a forced tick waits: it has not ended while the first still rolls
  let forcedDone = false;
  const forced = T.tick({force: true}).then(r => { forcedDone = true; return r; });
  await new Promise(r => setTimeout(r, 20));
  assert.equal(forcedDone, false);
  // the work is set behind again by hand while the first rolls, as a gate does; the forced tick rolls it after
  release();
  const a = await first;
  assert.equal(a.length, 1);
  flags["wodx-storyteller"].tasks.t1 = {...flags["wodx-storyteller"].tasks.t1, next: 99 * HOUR};
  const b = await forced;
  assert.equal(forcedDone, true);
  assert.equal(b.length, 1, "the forced tick rolled after the first ended");
  assert.equal(b[0].lines[0].rolled, 2);
});
