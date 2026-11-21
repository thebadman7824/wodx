import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

/* The clean testbed world (Chronicle Packs Desk c2/e2): lane config, module list, world.json, the gate's sources */

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const L = await import(pathToFileURL(path.join(root, "tools/lanes/lib.mjs")));
const CW = await import(pathToFileURL(path.join(root, "tools/lanes/clean-world.mjs")));
const LANES = path.join(root, "tools/lanes/lanes.json");
const extra = JSON.parse(fs.readFileSync(path.join(root, "tools/lanes/gate-map-extra.json"), "utf8"));

test("--world clean picks wodx-clean with its own known-good copy and clean fingerprint; the default is unchanged", () => {
  const d = L.loadConfig(LANES, {world: undefined});
  assert.equal(d.world, "rothenstein-wodx");
  assert.equal(d.cleanName, "clean.json");
  const c = L.loadConfig(LANES, {world: "clean"});
  assert.equal(c.world, "wodx-clean");
  assert.equal(c.worldKey, "clean");
  assert.equal(c.knownGood, `${d.knownGood}-clean`);
  assert.equal(c.cleanName, "clean-clean.json");
  assert.equal(c.defaultWorld.world, "rothenstein-wodx");
  const lane = c.lanes[0];
  assert.notEqual(L.cleanPath(lane, c), L.cleanPath(lane, d));
  assert.equal(L.loadConfig(LANES, {world: "default"}).world, "rothenstein-wodx");
});

test("an unknown world or one that points at Live is refused", () => {
  assert.throws(() => L.loadConfig(LANES, {world: "nope"}), /No world "nope"/);
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "wodx-cw-")), "lanes.json");
  const cfg = JSON.parse(fs.readFileSync(LANES, "utf8"));
  cfg.worlds.bad = {world: "rothenstein-live"};
  fs.writeFileSync(f, JSON.stringify(cfg));
  assert.throws(() => L.loadConfig(f, {world: "bad"}), /Live world/);
});

test("the clean world turns on every WoDX module but the chronicle modules, and the default world's other modules", () => {
  const mods = CW.repoModules(root);
  assert.ok(mods.chronicles.includes("wodx-rothenstein"), "wodx-rothenstein has a chronicle.mjs");
  assert.ok(!mods.chronicles.includes("wodx-chronicle"));
  const cfg = CW.cleanModuleConfig(mods, {"wodx-rothenstein": "0.0.0", "wodx-npc": "1", "lib-wrapper": "1.12", "fxmaster": "6"});
  for ( const id of mods.ids ) assert.equal(cfg[id], !mods.chronicles.includes(id), id);
  assert.equal(cfg["lib-wrapper"], true);
  assert.equal(cfg.fxmaster, true);
  assert.equal(cfg["wodx-rothenstein"], false);
});

test("its world.json comes from the template, with its own id and the clean flag", () => {
  const tpl = JSON.parse(fs.readFileSync(path.join(root, "worlds/wodx-template/world.json"), "utf8"));
  const w = CW.cleanWorldJson(tpl, {world: "wodx-clean", title: "WoDX Clean (testbed)"});
  assert.equal(w.id, "wodx-clean");
  assert.equal(w.flags.wodx.clean, true);
  assert.equal(w.flags.wodx.template, true, "Start a chronicle still treats it as a template world");
  assert.equal(w.system, tpl.system);
  assert.equal(tpl.id, "wodx-template", "the template itself is not changed");
});

test("gatecleanworld reads the chronicles' marks, cards and events from their modules and names none itself", async () => {
  const src = fs.readFileSync(path.join(root, "tools/gate/gatecleanworld.mjs"), "utf8");
  assert.match(src, /\/modules\/\$\{m\.id\}\/chronicle\.mjs/);
  assert.match(src, /MANIFEST\?\.marks/);
  const {chronicles} = await import(pathToFileURL(path.join(root, "tools/harness/chronicle-guard.mjs")));
  const {countMarks} = await import(pathToFileURL(path.join(root, "tools/harness/chronicle-guard.mjs")));
  for ( const c of await chronicles() ) assert.equal(countMarks(src, c.marks), 0, `gatecleanworld names a mark of ${c.id}`);
  const {PACK} = await import(pathToFileURL(path.join(root, "modules/wodx-rothenstein/chronicle.mjs")));
  for ( const e of await PACK.events() ) assert.ok(!src.includes(e.id), `gatecleanworld types the event id ${e.id}`);
});

test("gatecleanworld is out of the gate map and first in the clean smoke set; every gate in the set exists", () => {
  assert.ok(extra.notGates.includes("gatecleanworld"));
  assert.equal(extra.clean[0], "gatecleanworld");
  for ( const g of extra.clean ) assert.ok(fs.existsSync(path.join(root, "tools/gate", `${g}.mjs`)), g);
});
