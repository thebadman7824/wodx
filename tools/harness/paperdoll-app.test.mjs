import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";

/* WoDX Paperdoll in the stand-in for Foundry: the sheet button, the window, saving a look, the health hook */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
installMock({dataRoot: root});
game.modules.set("wodx-paperdoll", {active: true});
const M = await import(pathToFileURL(join(root, "modules/wodx-paperdoll/scripts/main.mjs")));
await Hooks.callAll("init");
await Hooks.callAll("ready");

function fakeActor() {
  const a = {id: "a1", name: "Ada Brandt", isOwner: true, hasPlayerOwner: true, flags: {},
    system: {health: {damage: {bashing: 0, lethal: 0, aggravated: 0}}}, updates: [],
    async update(u) { this.updates.push(u); for ( const [k, v] of Object.entries(u) ) { const ks = k.split("."); let o = this; for ( const p of ks.slice(0, -1) ) o = (o[p] ??= {}); o[ks.at(-1)] = v; } }};
  return a;
}

test("the sheet gets a Paperdoll button for an owner of a character with a health track", async () => {
  const a = fakeActor(), buttons = [];
  await Hooks.callAll("getActorSheetHeaderButtons", {actor: a}, buttons);
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].label, "Paperdoll");
  const none = [];
  await Hooks.callAll("getActorSheetHeaderButtons", {actor: {...a, isOwner: false}}, none);
  await Hooks.callAll("getActorSheetHeaderButtons", {actor: {...a, system: {}}}, none);
  assert.equal(none.length, 0);
});

test("the window: steppers, choices, and a player's save", async () => {
  const a = fakeActor();
  const app = new M.PaperdollApp({id: "wodx-paperdoll-a1", actor: a});
  await app.render({force: true});
  const el = app.element;
  assert.equal(el.querySelectorAll(".wodx-step").length, 14);
  assert.ok([...el.querySelectorAll("select")].every(s => s.hasAttribute("data-fixed")));
  assert.ok(el.querySelector("button[data-action=save]"));
  const before = app.look.face.eyes;
  await app.click('button[data-action=step][data-part="eyes"][data-by="1"]');
  assert.notEqual(app.look.face.eyes, before);
  const hw = el.querySelector("select[name=headwear]");
  hw.value = "fillet"; hw.dispatchEvent(new window.Event("change"));
  await new Promise(r => setTimeout(r, 0));
  assert.equal(app.look.clothes.headwear, "fillet");
  assert.ok(app.element.querySelector("select[name=veil]"));
  const user = game.user;
  game.user = game.users.get("p1");
  try { await app.click("button[data-action=save]"); }
  finally { game.user = user; }
  assert.equal(a.flags["wodx-paperdoll"].look.clothes.headwear, "fillet");
  assert.equal(a.updates.length, 1);
});

test("the state: health level, mood and the ring", () => {
  const a = fakeActor();
  a.flags["wodx-paperdoll"] = {look: {seed: "x"}};
  a.system.health = {damage: {bashing: 2}};
  for ( const k of ["bruised", "hurt", "injured", "wounded", "mauled", "crippled", "incapacitated"] ) a.system.health[k] = {value: 1, total: 1};
  const s = M.stateOf(a);
  assert.equal(s.level, 2);
  assert.equal(s.mood, "disgruntled");
  assert.equal(s.ring, true);
  a.system.conditions = {isfrenzy: true};
  assert.equal(M.stateOf(a).mood, "snarling");
});
