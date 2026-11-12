import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";

/* WoDX Creation 0.11.0 in the stand-in for Foundry: the lifepath window from setup to save, and the sheet button */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
installMock({dataRoot: root});
const M = await import(pathToFileURL(join(root, "modules/wodx-creation/scripts/lifepath.mjs")));

function fakeActor(type = "Vampire", system = {clan: "Toreador"}) {
  const a = {id: "a1", name: "Ada Brandt", type, isOwner: true, hasPlayerOwner: true, flags: {}, system, updates: [],
    testUserPermission: () => true,
    async update(u) { this.updates.push(u); for ( const [k, v] of Object.entries(u) ) { const ks = k.split("."); let o = this; for ( const p of ks.slice(0, -1) ) o = (o[p] ??= {}); o[ks.at(-1)] = v; } return this; }};
  return a;
}

test("the sheet gets a Lifepath button for an owner, not for a group", async () => {
  M.registerSheetButton();
  const b = [];
  await Hooks.callAll("getActorSheetHeaderButtons", {actor: fakeActor()}, b);
  assert.equal(b.filter(x => x.label === "Lifepath").length, 1);
  const none = [];
  await Hooks.callAll("getActorSheetHeaderButtons", {actor: {...fakeActor(), type: "Group"}}, none);
  await Hooks.callAll("getActorSheetHeaderButtons", {actor: {...fakeActor(), isOwner: false}}, none);
  assert.equal(none.filter(x => x.label === "Lifepath").length, 0);
});

test("setup guesses the line and splat, the scenes play to the end, and the save keeps the record", async () => {
  const a = fakeActor();
  const app = new M.LifepathApp({id: "wodx-lifepath-a1", actor: a});
  assert.equal(app.setup.line, "vampire");
  assert.equal(app.setup.splat, "toreador");
  await app.render({force: true});
  assert.ok(app.element.querySelector("select[name=splat] option[value=toreador][selected]"));
  await app.options.actions.begin.call(app);
  let guard = 0;
  while ( app.element.querySelector("[data-action=pick]") && guard++ < 20 ) {
    const btn = app.element.querySelector("[data-action=pick]");
    await app.options.actions.pick.call(app, {}, btn);
  }
  assert.ok(app.element.querySelector("[data-action=save]"), "the end screen");
  assert.ok(app.element.querySelectorAll("input[name=keep]").length > 0);
  for ( const i of app.element.querySelectorAll("input[name=person]") ) i.checked = false;
  await app.options.actions.save.call(app);
  const rec = a.flags["wodx-creation"]?.lifepath;
  assert.ok(rec?.path?.steps?.length >= 6, "the path is kept on the actor");
  assert.equal(rec.path.splat, "toreador");
  assert.ok(rec.kept.length > 0);
});
