import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

/* One shared Live-world list (Chronicle Packs Desk d4, B7564) and shared code that reads the chronicle in play (B7565) */

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = rel => import(pathToFileURL(path.join(root, rel)).href);
const LW = await imp("modules/wodx-chronicle/scripts/live-worlds.mjs");

test("the Live list guards rothenstein-live with every chronicle module off, and the flag counts", () => {
  assert.ok(LW.LIVE_WORLDS.includes("rothenstein-live"));
  assert.ok(LW.isLiveWorld("rothenstein-live"));
  assert.ok(LW.isLiveWorld({id: "x", flags: {wodx: {liveWorld: true}}}));
  assert.ok(!LW.isLiveWorld("rothenstein-wodx"));
  assert.ok(!LW.isLiveWorld({id: "wodx-clean", flags: {wodx: {clean: true}}}));
});

test("a chronicle's Live worlds join the list when it registers, and every module reads the same list", async () => {
  const CD = await imp("modules/wodx-chronicle/scripts/chronicle-data.mjs");
  CD.registerChronicle({id: "gate-live", manifest: {live: ["gate-live-world"]}});
  try {
    assert.ok(LW.isLiveWorld("gate-live-world"));
    const solo = await imp("modules/wodx-solo/scripts/solo-rules.mjs");
    const recipe = await imp("modules/wodx-rules/storyteller/recipe-rules.mjs");
    const auto = await imp("modules/wodx-rules/chronicle/automation-rules.mjs");
    for ( const list of [solo.NEVER_WORLDS, recipe.FORBIDDEN_WORLDS, auto.NEVER_SEED] ) {
      assert.equal(list, LW.LIVE_WORLDS);
      assert.ok(list.includes("gate-live-world"));
    }
    assert.equal(recipe.canBuildHere("gate-live-world", {world: "gate-live-world"}, {force: true}).ok, false);
  } finally { CD.unregisterChronicle("gate-live"); }
});

test("no WoDX module keeps its own copy of the Live list (a chronicle's manifest names its own)", () => {
  const hits = [];
  const walk = d => { for ( const e of fs.readdirSync(d, {withFileTypes: true}) ) {
    const p = path.join(d, e.name);
    if ( e.isDirectory() ) { if ( !["tests", "data", "node_modules"].includes(e.name) ) walk(p); }
    else if ( /\.m?js$/.test(e.name) && !p.endsWith(path.join("wodx-chronicle", "scripts", "live-worlds.mjs")) && e.name !== "chronicle.mjs" && /\[\s*"rothenstein-live"\s*\]/.test(fs.readFileSync(p, "utf8")) ) hits.push(path.relative(root, p));
  } };
  walk(path.join(root, "modules"));
  assert.deepEqual(hits, [], "read live-worlds.mjs instead");
});

test("the solo landing and its words follow the chronicle's town, and name none with no chronicle", async () => {
  const R = await imp("modules/wodx-solo/scripts/solo-rules.mjs");
  const s = (id, name, x = {}) => ({id, name, img: "map.webp", active: false, landing: false, ...x});
  const world = [s("a", "Field"), s("b", "Harbourtown: Quay"), s("c", "The yard", {active: true})];
  assert.equal(R.pickLanding(world, "", "Harbourtown"), "b");
  assert.equal(R.pickLanding(world), "c", "no chronicle: the active map");
  assert.equal(R.landingBlank("Harbourtown").name, "Harbourtown by night: the way in");
  assert.equal(R.landingBlank().name, "By night: the way in");
  assert.equal(R.arrivalTitle("Harbourtown"), "Who comes to Harbourtown?");
  assert.equal(R.arrivalTitle(), "Who comes in out of the night?");
  assert.equal(R.pickLanding([s("d", "A(b) gate")], "", "A(b)"), "d", "a town with odd characters is matched as written");
});
