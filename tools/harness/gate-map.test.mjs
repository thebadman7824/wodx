/* The gate map (B3083): every gate in tools/gate is mapped to the modules it covers, and a change runs only the
 * gates of the modules it touches. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as G from "../lanes/gate-map.mjs";

const map = G.gateMap();
const ids = G.moduleIds();

test("every gate with a run() is mapped to real modules", () => {
  const files = fs.readdirSync(path.join(G.ROOT, "tools/gate")).filter(f => /^gate[\w-]*\.mjs$/.test(f)
    && /export\s+(?:(?:async\s+)?function\s+run\b|const\s+run\s*=)/.test(fs.readFileSync(path.join(G.ROOT, "tools/gate", f), "utf8")));
  const not = new Set(G.loadExtra().notGates ?? []);
  assert.deepEqual(Object.keys(map).sort(), files.map(f => f.replace(/\.mjs$/, "")).filter(g => !not.has(g)).sort());
  for ( const [g, mods] of Object.entries(map) ) {
    assert.ok(mods.length, `${g} covers no module`);
    for ( const m of mods ) assert.ok(ids.includes(m), `${g}: ${m} is not a module`);
  }
  const extra = G.loadExtra();
  for ( const g of [...Object.keys(extra.add ?? {}), ...Object.keys(extra.remove ?? {}), ...(extra.notGates ?? [])] )
    assert.ok(fs.existsSync(path.join(G.ROOT, "tools/gate", `${g}.mjs`)), `gate-map-extra.json names ${g}, which is not in tools/gate`);
});

test("a gate's header and calls name the modules it covers", () => {
  const got = G.coveredBy('/** The case board (WoDX Interactables 0.32.0) ... */ const st = () => game.wodx?.storyteller; game.modules.get("wodx-npc")', ids);
  assert.deepEqual([...got].sort(), ["wodx-interactables", "wodx-npc", "wodx-storyteller"]);
});

test("a change runs only the gates it needs", () => {
  const all = Object.keys(map).length;
  const pd = G.touched(["modules/wodx-paperdoll/scripts/main.mjs"]);
  assert.deepEqual(pd.modules, ["wodx-paperdoll"]);
  const n = G.gatesFor(pd.modules, pd.gates, map).length;
  assert.ok(n > 0 && n < all / 4, `a Paperdoll change runs ${n} of ${all} gates`);
  assert.deepEqual(G.touched(["docs/DECISIONS.md", "tools/release/stamp.mjs", "changes/wodx-npc/x.md"]).modules, []);
  assert.equal(G.touched(["system/worldofdarkness/system.json"]).modules.length, ids.length);
  const ch = G.touched(["modules/wodx-chronicle/scripts/main.mjs"]).modules;
  for ( const m of ["wodx-npc", "wodx-actions", "wodx-sheets"] ) assert.ok(ch.includes(m), `a Chronicle change reaches ${m}`);
  const gate = G.touched(["tools/gate/gatecase.mjs"]);
  assert.deepEqual(G.gatesFor(gate.modules, gate.gates, map), ["gatecase"]);
  assert.deepEqual(G.touched(["modules/wodx-actions/scripts/main.js"], {direct: true}).modules.includes("wodx-sheets"), false);
});

test("B6951: two-browser gates (a player phase) are left out of the lane map", async () => {
  const map = G.gateMap();
  for ( const g of ["gatedebtsmarks", "gateplayerload", "gatetruthwalk", "gateplayerblows", "gatenpcrelay", "gatetruthrelay"] ) {
    assert.ok(!(g in map), `${g} is not in the map`);
  }
  assert.ok(G.TWO_BROWSER.test('if ( phase === "player" ) return player(ids);'));
  assert.ok("gatecharms" in map, "an ordinary gate stays");
});

test("B6952: the runner counts 0/0 and a summary with no tally as a failure, and names modules with no api", () => {
  const src = fs.readFileSync(path.join(G.ROOT, "tools/lanes/run-gate.mjs"), "utf8");
  assert.match(src, /m\[2\] === "0"/);
  assert.match(src, /no api after sign-in/);
  const B = fs.readFileSync(path.join(G.ROOT, "tools/lanes/browser.mjs"), "utf8");
  assert.match(B, /API_WAIT_MS = 180000/);
});

test("B7394: tier 1 runs a module's own gates, changed gates and the cross-module gates", async () => {
  const {tier1, gateOwners, gateMap, touched, gatesFor, CROSS_GATES} = await import("../lanes/gate-map.mjs");
  const map = gateMap(), owners = gateOwners(undefined, map);
  for ( const [g, o] of Object.entries(owners) ) {
    assert.ok(o.length, `${g} is for some module`);
    for ( const m of o ) assert.ok(map[g].includes(m), `${g} is only for modules it covers (${m})`);
  }
  for ( const g of CROSS_GATES ) assert.ok(map[g], `cross-module gate ${g} exists`);
  const chron = ["modules/wodx-chronicle/scripts/main.mjs"];
  const t = tier1(chron, {map});
  const wide = gatesFor(touched(chron).modules, [], map);
  assert.ok(t.length < wide.length, `a Chronicle change runs fewer gates (${t.length} of ${wide.length})`);
  for ( const g of Object.keys(owners).filter(g => owners[g].includes("wodx-chronicle")) ) assert.ok(t.includes(g), `${g} is for Chronicle`);
  for ( const g of CROSS_GATES ) assert.ok(t.includes(g));
  assert.deepEqual(tier1(["docs/README.md", "tools/pcq/runner.mjs"], {map}), [], "docs and tools need no gate");
  const one = Object.keys(map)[0];
  assert.deepEqual(tier1([`tools/gate/${one}.mjs`], {map}), [one], "a changed gate runs alone");
  assert.equal(tier1(["system/template.json"], {map}).length, Object.keys(map).length, "a system change runs every gate");
});

test("B7394: run-gate --touched takes tier 1, --wide the older list", () => {
  const src = fs.readFileSync(new URL("../lanes/run-gate.mjs", import.meta.url), "utf8");
  assert.match(src, /args\.includes\("--wide"\) \? gatesFor\(t\.modules, t\.gates, gateMap\(gateRoot\)\) : tier1\(paths, \{root: gateRoot\}\)/);
});
