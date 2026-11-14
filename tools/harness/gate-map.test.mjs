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
