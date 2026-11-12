import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";

/* WoDX Creation 0.12.0 in the stand-in for Foundry: the Before the First Night hub, a player's step, sign-off and seed cards */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
installMock({dataRoot: root});
const M = await import(pathToFileURL(join(root, "modules/wodx-creation/scripts/first-night.mjs")));

function fakeActor(id = "a1", system = {clan: "Toreador", concept: "Painter", nature: "Visionary", demeanor: "Bon Vivant", generation: 14}) {
  return {id, name: "Ada Brandt", type: "Vampire", isOwner: true, hasPlayerOwner: true, flags: {}, system, items: [], updates: [],
    testUserPermission: () => true,
    async update(u) { this.updates.push(u); for ( const [k, v] of Object.entries(u) ) { const ks = k.split("."); let o = this; for ( const p of ks.slice(0, -1) ) o = (o[p] ??= {}); o[ks.at(-1)] = v; } return this; }};
}

test("the hub renders every step, ticks concept from the sheet, and shows the forecast", async () => {
  const a = fakeActor();
  const app = new M.FirstNightApp({id: "wodx-first-night", actor: a});
  await app.render({force: true});
  const steps = app.element.querySelectorAll(".wodx-fn-step");
  assert.equal(steps.length, 10);
  assert.ok(app.element.querySelector(".wodx-fn-done"), "concept is done from the sheet");
  assert.match(app.element.textContent, /Trouble ahead/);
  assert.ok(app.element.querySelector("select[name=dial]"));
});

test("the Storyteller ticks and unticks a step; the record is kept on the actor", async () => {
  const a = fakeActor("a2");
  globalThis.game.actors = Object.assign([a], {get: id => (id === a.id ? a : null), find: f => [a].find(f), contents: [a]});
  const was = game.user.isGM;
  game.user.isGM = true;
  await M.tick(a.id, "ties");
  assert.equal(M.recordOf(a).steps.ties.done, true);
  await M.untick(a.id, "ties");
  assert.equal(M.recordOf(a).steps.ties, undefined);
  game.user.isGM = was;
});

test("the sheet gets the button only when the hub is on and the actor is a player's", async () => {
  M.registerSheetButton();
  const b = [];
  await Hooks.callAll("getActorSheetHeaderButtons", {actor: fakeActor()}, b);
  assert.equal(b.filter(x => x.label === "First Night").length, 1);
  const none = [];
  await Hooks.callAll("getActorSheetHeaderButtons", {actor: {...fakeActor(), hasPlayerOwner: false}}, none);
  assert.equal(none.filter(x => x.label === "First Night").length, 0);
});

test("the forecast runs with no other module on and still finds thin blood", async () => {
  const items = await M.forecastFor(fakeActor());
  assert.ok(items.some(i => i.key === "gen:thin"));
});
