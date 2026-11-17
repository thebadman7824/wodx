import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* B6778: WoDX Creation waits for a slow Chronicle instead of switching itself off after 20 s, so its api comes */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("B6778: a Chronicle that takes longer than 20 s still gets Creation started", async () => {
  const hooks = {};
  const px = () => new Proxy(function () {}, {get: (t, k) => k === Symbol.toPrimitive ? () => "" : k === "then" ? undefined : px(), apply: () => px(), construct: () => px()});
  const creation = {active: true}, chronicle = {active: true};
  const modules = new Map([["wodx-creation", creation], ["wodx-chronicle", chronicle]]);
  const saved = {Hooks: globalThis.Hooks, game: globalThis.game, foundry: globalThis.foundry, CONFIG: globalThis.CONFIG, ui: globalThis.ui, setTimeout: globalThis.setTimeout};
  const timers = [];
  globalThis.Hooks = {on: (h, f) => (hooks[h] ??= []).push(f), once: (h, f) => (hooks[h] ??= []).push(f), callAll() {}, call() { return true; }};
  globalThis.game = new Proxy({world: {flags: {wodx: {}}}, modules, user: {isGM: false}, settings: px(), socket: {on() {}}, i18n: {localize: s => s}}, {get: (t, k) => k in t ? t[k] : px()});
  globalThis.foundry = px(); globalThis.CONFIG = px(); globalThis.ui = px();
  try {
    await import(pathToFileURL(join(root, "modules/wodx-creation/scripts/main.mjs")));
    for ( const f of hooks.init ?? [] ) { try { f(); } catch (e) { /* stubs */ } }
    globalThis.setTimeout = (f, ms) => { timers.push(f); return timers.length; };
    for ( const f of hooks.ready ?? [] ) { try { f(); } catch (e) { /* stubs */ } }
    for ( const f of timers.splice(0) ) f(); // the 20 s pass with no Chronicle api yet
    for ( const f of hooks.wodxChronicleReady ?? [] ) { try { f(); } catch (e) { /* stubs */ } }
    assert.ok(creation.api?.people, "the api is in place once the Chronicle is ready");
  } finally { Object.assign(globalThis, saved); }
});
