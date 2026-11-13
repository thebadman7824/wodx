import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";

/* WoDX Creation in the stand-in for Foundry: the lifepath window from setup through the drill-down to save, the sheet button, and the Storyteller's look at a player's own answers */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
installMock({dataRoot: root});
const M = await import(pathToFileURL(join(root, "modules/wodx-creation/scripts/lifepath.mjs")));

function fakeActor(type = "Vampire", system = {clan: "Toreador"}) {
  const a = {id: "a1", name: "Ada Brandt", type, isOwner: true, hasPlayerOwner: true, flags: {}, system, updates: [], items: [],
    async createEmbeddedDocuments(kind, rows) { for ( const r of rows ) this.items.push({id: `i${this.items.length}`, ...r}); return rows; },
    async updateEmbeddedDocuments(kind, rows) { for ( const r of rows ) { const it = this.items.find(i => i.id === r._id); if ( it ) it.system.value = r["system.value"]; } return rows; },
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
  assert.ok(app.drill && !app.path, "the drill-down comes first");
  assert.match(app.element.textContent, /Continent/);
  assert.ok(app.element.querySelector("[data-action=surprise]"));
  let guard = 0, five = 0, moved = 0, own = 0;
  while ( app.element.querySelector("[data-action=pick]") && guard++ < 40 ) {
    if ( app.element.querySelector("[data-action=others]") ) { five++; assert.equal(app.element.querySelectorAll("[data-action=pick]").length, 5); }
    if ( app.element.querySelector("select[name=place]") ) moved++;
    if ( app.element.querySelector("[data-action=own]") ) own++;
    const btn = app.element.querySelector("[data-action=pick]");
    await app.options.actions.pick.call(app, {}, btn);
  }
  assert.ok(app.element.querySelector("[data-action=save]"), "the end screen");
  assert.ok(app.element.querySelectorAll("input[name=keep]").length > 0);
  for ( const i of app.element.querySelectorAll("input[name=person]") ) i.checked = false;
  await app.options.actions.save.call(app);
  const rec = a.flags["wodx-creation"]?.lifepath;
  assert.ok(five >= 2 && moved >= 2 && own >= 4, `mark steps ${five}, movable steps ${moved}, own answers ${own}`);
  assert.ok(rec?.path?.steps?.length >= 2, "the turn and after are kept on the actor");
  assert.ok(rec.path.drill?.picks?.origin, "and the drill-down with them");
  assert.equal(rec.path.splat, "toreador");
  assert.ok(rec.kept.length > 0);
  assert.ok(a.items.length > 0, "the kept picks are on the sheet");
  assert.ok(a.items.every(i => i.type === "Feature" && i.system.value >= 1 && i.flags["wodx-creation"].lifepath));
  assert.ok(!rec.review, "the Storyteller's own lifepath waits for no one");
});

test("back from the first scene after the drill returns to the drill, and from the first step to the setup", async () => {
  const app = new M.LifepathApp({id: "wodx-lifepath-a2", actor: fakeActor()});
  await app.render({force: true});
  await app.options.actions.begin.call(app);
  await app.options.actions.back.call(app);
  assert.ok(!app.drill && app.element.querySelector("[data-action=begin]"), "back to the setup");
  await app.options.actions.begin.call(app);
  let guard = 0;
  while ( !app.path && guard++ < 40 ) await app.options.actions.surprise.call(app);
  assert.ok(app.path, "Surprise me walks the whole drill");
  await app.options.actions.back.call(app);
  assert.ok(!app.path && app.drill && app.element.querySelector("[data-action=surprise]"), "back in the drill");
});

test("a player's own answer waits for the Storyteller; approval puts the ticked picks on the sheet", async () => {
  const a = fakeActor("Mortal", {});
  const wasGM = game.user.isGM;
  const proposals = [];
  const mod = game.modules.get("wodx-chronicle") ?? {};
  const oldApi = mod.api;
  game.modules.set?.("wodx-chronicle", mod);
  mod.active = true;
  mod.api = {...(oldApi ?? {}), propose: async p => { proposals.push(p); return p; }};
  game.user.isGM = false;
  try {
    const app = new M.LifepathApp({id: "wodx-lifepath-a3", actor: a});
    await app.render({force: true});
    await app.options.actions.begin.call(app);
    let guard = 0, used = false;
    while ( !app.path && guard++ < 40 ) {
      const el = app.element;
      if ( !used && el.querySelector("select[name=ownBg]") ) {
        el.querySelector("input[name=ownText]").value = "Raised by a travelling puppet troupe";
        el.querySelector("select[name=ownBg]").value = "Allies";
        await app.options.actions.own.call(app);
        used = true;
      } else await app.options.actions.pick.call(app, {}, el.querySelector("[data-action=pick]"));
    }
    assert.ok(used && app.path);
    guard = 0;
    while ( app.element.querySelector("[data-action=pick]") && guard++ < 20 ) await app.options.actions.pick.call(app, {}, app.element.querySelector("[data-action=pick]"));
    assert.match(app.element.textContent, /Storyteller looks at it first/);
    for ( const i of app.element.querySelectorAll("input[name=person]") ) i.checked = false;
    await app.options.actions.save.call(app);
    const rec = a.flags["wodx-creation"].lifepath;
    assert.equal(rec.review, "waiting");
    assert.equal(a.items.length, 0, "nothing on the sheet before the Storyteller has looked");
    assert.equal(proposals.length, 1);
    assert.equal(proposals[0].type, "wodx-lifepath-review");
    game.user.isGM = true;
    game.actors.get = id => id === a.id ? a : null;
    const plan = await M.approveReview(proposals[0].data);
    assert.ok(plan.ops.length > 0);
    assert.ok(a.items.some(i => i.name === "Allies"), "the player's own Background is on the sheet");
    assert.equal(a.flags["wodx-creation"].lifepath.review, "approved");
  } finally { game.user.isGM = wasGM; mod.api = oldApi; }
});
