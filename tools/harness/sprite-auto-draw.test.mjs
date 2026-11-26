/* B8100 (#2491): a new character, a new NPC and a kept figure or look ask the PC sprite drawer by themselves, once for
 * many changes close together, on the Storyteller's computer only, and not with the setting off. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";

const hooks = new Map();
globalThis.Hooks = {on: (n, f) => { if ( !hooks.has(n) ) hooks.set(n, []); hooks.get(n).push(f); }, once() {}, callAll: (n, ...a) => { for ( const f of hooks.get(n) ?? [] ) f(...a); }};
const gm = {id: "gm", isGM: true, name: "Storyteller"}, pl = {id: "pl", isGM: false, name: "Player"};
let me = gm, autoDraw = true;
const notes = [], uploads = [];
globalThis.ui = {notifications: {info: m => notes.push(m), warn: m => notes.push(m)}};
globalThis.game = {users: {get activeGM() { return gm; }, filter: () => [gm]}, get user() { return me; }, world: {id: "w"}, actors: [],
  settings: {get: (m, k) => k === "spriteAutoDraw" ? autoDraw : true, register() {}, registerMenu() {}}, modules: new Map(), i18n: {localize: s => s}};
globalThis.foundry = {utils: {randomID: () => "abcdef"}, applications: {apps: {FilePicker: {implementation: {
  createDirectory: async () => null, upload: async (src, dir, file) => { uploads.push(file.name); return {}; }}}}}};
globalThis.fetch = async () => ({ok: false});
globalThis.performance ??= {now: () => Date.now()};
globalThis.canvas = {ready: false, grid: {size: 100}, tokens: {placeables: [], get: () => null}};
const S = await import("../../modules/wodx-paperdoll/scripts/sprites.mjs");
S.startSprites();
const wait = ms => new Promise(r => setTimeout(r, ms));

test("a character made in the world asks for its sprite, on the Storyteller's computer", () => {
  me = gm; autoDraw = true; S.cancelAsk();
  Hooks.callAll("createActor", {id: "a1"});
  assert.equal(S.askPending(), true);
  S.cancelAsk();
});

test("not on a player's computer, and not with the setting off", () => {
  S.cancelAsk();
  me = pl; autoDraw = true;
  Hooks.callAll("createActor", {id: "a2"});
  assert.equal(S.askPending(), false, "player");
  me = gm; autoDraw = false;
  Hooks.callAll("createActor", {id: "a3"});
  assert.equal(S.askPending(), false, "setting off");
  assert.equal(S.askSoon(), false);
  autoDraw = true;
});

test("many changes close together make one quiet request, with the roster", async () => {
  me = gm; autoDraw = true; uploads.length = 0; notes.length = 0; S.cancelAsk();
  for ( let i = 0; i < 5; i++ ) S.askSoon(30);
  await wait(120);
  assert.deepEqual(uploads.filter(n => n === "request.json").length, 1, "one request");
  assert.ok(uploads.includes("roster.json"), "the roster is written with it");
  assert.deepEqual(notes, [], "asked by itself, the game says nothing yet");
  assert.ok(S.spriteApi.drawWatched(), "and watches for the drawer's answer");
});
