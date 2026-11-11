import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Trait effects step 6 (Actions 3.35.0, Chronicle 0.21.0): sleep, feeding, blood costs, Lucky */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const T = await import(pathToFileURL(join(root, "modules/wodx-chronicle/scripts/trait-rules.mjs")));
const src = p => readFileSync(join(root, p), "utf8");
const feat = (name, kind = "merit") => ({id: name, name, kind, value: 1});

// trait-hooks.js reads the traits through game.modules; a small stand-in for Chronicle's api and the world's story id
const flags = {};
const actorOf = (kind, names) => {
  const view = {kind, features: names.map(([n, k]) => feat(n, k))};
  return {view, flags: {"wodx-actions": flags}, items: view.features, setFlag: async (s, k, v) => { flags[k] = v; }};
};
globalThis.game = {
  modules: {get: id => id === "wodx-chronicle" ? {active: true, api: {traits: {has: (a, key) => T.has(a.view, key), rules: T, effects: () => [], kindOf: a => a.view.kind}}} : null},
  settings: {get: (m, k) => (k === "storyId" ? "story-1" : k === "traitRolls" ? true : null)}
};
const TH = await import(pathToFileURL(join(root, "modules/wodx-actions/scripts/trait-hooks.js")));

test("Lucky rolls a failure again three times a story, then stops; a new story starts the count again", async () => {
  const a = actorOf("mortal", [["Lucky", "merit"]]);
  assert.equal(TH.luckyLeft(a), 3);
  assert.match(TH.luckyHtml(a), /3 left this story/);
  assert.deepEqual(await TH.useLucky(a), {left: 2});
  await TH.useLucky(a); await TH.useLucky(a);
  assert.equal(await TH.useLucky(a), null);
  assert.equal(TH.luckyHtml(a), "");
  flags.lucky = {story: "an old story", used: 3};
  assert.equal(TH.luckyLeft(a), 3);
  assert.equal(TH.luckyLeft(actorOf("mortal", [])), 0);
});

test("feeding, blood costs and sleep follow the traits, and only for a kind that holds them", () => {
  const k = actorOf("kindred", [["Efficient Digestion", "merit"], ["Thin Blood", "flaw"], ["Deep Sleeper", "flaw"], ["Prey Exclusion (clergy)", "flaw"]]);
  assert.equal(TH.digestionBonus(k, 5, 10), 2);
  assert.equal(TH.digestionBonus(k, 5, 1), 1);
  assert.equal(TH.bloodCostMult(k), 2);
  assert.deepEqual(TH.sleepMods(k), {diff: 2, light: false});
  assert.match(TH.preyNote(k), /clergy/);
  const m = actorOf("mortal", [["Thin Blood", "flaw"]]);
  assert.equal(TH.bloodCostMult(m), 1);
  assert.equal(TH.sleepMods(actorOf("kindred", [["Light Sleeper", "merit"]])).light, true);
});

test("the action, feeding, spending and waking windows use them", () => {
  const m = src("modules/wodx-actions/scripts/main.js");
  assert.match(m, /TH\.useLucky\(actor\)/);
  assert.match(m, /TH\.luckyHtml\(actor, esc\)/);
  assert.match(m, /k === "lucky"/);
  assert.match(m, /TH\.digestionBonus\(/);
  assert.match(m, /TH\.bloodCostMult\(actor\)/);
  assert.match(m, /TH\.sleepMods\(actor\)/);
  assert.match(m, /TH\.preyNote\(actor\)/);
});

test("the Trait effects window says what each handled trait does", () => {
  const line = key => T.describe({entry: T.buildIndex().byKey.get(key)});
  assert.match(line("lucky"), /three times a story/);
  assert.match(line("smell-of-the-grave"), /others nearby can sense it/);
  assert.match(line("friendly-face"), /warmer/);
  assert.match(line("deaf"), /no sound in WoDX Senses/);
  for ( const k of Object.keys(T.HANDLED) ) assert.ok(T.buildIndex().byKey.has(k), k);
});
