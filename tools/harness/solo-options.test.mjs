import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";
import {installActors} from "./actors-mock.mjs";

/*
 * Final audit (B6757): the Lone Chronicle has a way to Threads of Fate, hardship and bodies left behind. They are off
 * by default, in no preset, and Game Settings is the Storyteller's; the player's panel now has Chronicle options, and
 * the seat writes only the options on its list.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
await installActors(root);
globalThis.canvas = {tokens: {controlled: []}, scene: null};
await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
await import(join(root, "modules/wodx-storyteller/scripts/main.mjs"));
await import(join(root, "modules/wodx-solo/scripts/main.mjs"));
for ( const m of ["wodx-chronicle", "wodx-storyteller", "wodx-solo"] ) game.modules.set(m, {active: true});
const R = await import(join(root, "modules/wodx-solo/scripts/solo-rules.mjs"));
const SOLO = () => game.modules.get("wodx-solo").api;

test("set up: the Lone Chronicle is on", async () => {
  await Hooks.callAll("init"); mock.setupTime(); await Hooks.callAll("ready"); await mock.settle();
  await game.settings.set("wodx-solo", "on", true);
  await mock.settle();
  assert.equal(SOLO().isSeat(), true);
  for ( const k of ["threads", "hardship", "remains"] ) assert.ok(["off", false].includes(game.settings.get("wodx-storyteller", k)), `${k} starts off`);
});

test("the panel has Chronicle options for the three, and only these", () => {
  assert.ok(R.PANEL.some(b => b.id === "options"));
  assert.deepEqual(R.OPTIONS.map(o => o.key), ["threads", "hardship", "remains"]);
  assert.deepEqual(R.optionChange("hardship", "true"), {mod: "wodx-storyteller", key: "hardship", to: true, label: "Hardship on the road", word: "On"});
  assert.equal(R.optionChange("hardship", "yes"), null);
  assert.equal(R.optionChange("nightDraw", "true"), null, "nothing off the list");
});

test("the lone player's ask: the seat turns each one on, and tells them", async () => {
  const p1 = "p1";
  await SOLO().panel.setOption(p1, "threads", "auto");
  await SOLO().panel.setOption(p1, "hardship", "true");
  await SOLO().panel.setOption(p1, "remains", "true");
  await SOLO().panel.setOption(p1, "rumourGarble", "true");
  await mock.settle();
  assert.equal(game.settings.get("wodx-storyteller", "threads"), "auto");
  assert.equal(game.settings.get("wodx-storyteller", "hardship"), true);
  assert.equal(game.settings.get("wodx-storyteller", "remains"), true);
  assert.equal(game.settings.get("wodx-storyteller", "rumourGarble"), false, "not on the list");
  assert.ok(mock.log.chat.some(m => /Hardship on the road/.test(m.content) && m.whisper.includes(p1)));
});

test("with the mode off, the seat does nothing", async () => {
  await game.settings.set("wodx-solo", "on", false);
  await mock.settle();
  assert.equal(await SOLO().panel.setOption("p1", "hardship", "false"), null);
  assert.equal(game.settings.get("wodx-storyteller", "hardship"), true);
});
