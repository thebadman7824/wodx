import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
globalThis.foundry = {nue: {Tour: class { constructor(c) { this.config = c; this.steps = c.steps; } async _preStep() { this.pre = true; } }}, utils: {}};
let registered = [];
globalThis.game = {user: {isGM: false}, tours: {register: (ns, id, t) => registered.push([ns, id, t]), get: () => null}};
globalThis.document = {querySelector: sel => (sel.includes("wodxClock") ? {} : null)};
const T = await import(join(root, "modules/wodx-chronicle/scripts/tours.mjs"));

test("players get one tour, the Storyteller two; every step has a title and content", () => {
  assert.equal(T.registerTours(), true);
  assert.deepEqual(registered.map(r => r[1]), ["wodx-players"]);
  registered = []; game.user.isGM = true;
  T.registerTours();
  assert.deepEqual(registered.map(r => r[1]), ["wodx-players", "wodx-storyteller"]);
  for ( const tour of [T.PLAYER_TOUR, T.STORYTELLER_TOUR] ) for ( const s of tour.steps ) assert.ok(s.id && s.title && s.content, s.id);
});

test("a step whose button is not on screen loses its selector, so it shows in the middle", async () => {
  const tour = registered[0][2];
  tour.currentStep = {...T.PLAYER_TOUR.steps.find(s => s.id === "xcard")};
  await tour._preStep();
  assert.equal(tour.currentStep.selector, undefined);
  tour.currentStep = {...T.PLAYER_TOUR.steps.find(s => s.id === "clock")};
  await tour._preStep();
  assert.ok(tour.currentStep.selector);
});
