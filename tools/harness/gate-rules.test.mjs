/* The gate rules (B3731): no new gate may break them, and the list of older gates that still do may only shrink. */
import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {RULES, check, compare, loadBaseline, GATES} from "./gate-rules.mjs";

test("no gate breaks a gate rule it did not already break before the rules", () => {
  const {fresh} = compare(check(), loadBaseline());
  assert.deepEqual(fresh, [], `Follow the gate rules (tools/gate/kit.mjs, docs/WORKFLOW.md):\n  ${fresh.join("\n  ")}`);
});

test("the baseline lists only what is still broken (run gate-rules.mjs --baseline after moving a gate to the kit)", () => {
  const {cleared} = compare(check(), loadBaseline());
  assert.deepEqual(cleared, [], `Cleared, take out of tools/harness/gate-rules-baseline.json:\n  ${cleared.join("\n  ")}`);
});

test("each rule catches what it is for and passes the kit's way", () => {
  assert.ok(RULES.position("const made = await Actor.createDocuments(d); const a = made[0];").length);
  assert.ok(RULES.position("const t = game.actors.contents[0];").length);
  assert.deepEqual(RULES.position("const [a, b] = await G.make(Actor, d);"), []);
  assert.ok(RULES.laneScene("const s = canvas.scene; s.tokens;").length);
  assert.deepEqual(RULES.laneScene("const s = await G.scene(); canvas.scene;"), []);
  assert.ok(RULES.laneDoc('game.scenes.getName("Rothenstein Market")').length);
  assert.deepEqual(RULES.laneDoc('await Scene.create({name: "Gate X"}); game.scenes.getName("Gate X")'), []);
  assert.ok(RULES.version('m.version === "0.21.0"').length);
  assert.deepEqual(RULES.version('versionAtLeast(m.version, "0.21.0")'), []);
});

test("the kit is served with the gates and is not itself a gate", () => {
  const src = fs.readFileSync(path.join(GATES, "kit.mjs"), "utf8");
  for ( const f of ["export function gate(", "export function inOrder(", "export function byFlag(", "async function scene(", "async function fixture(", "async function cleanup("] ) assert.ok(src.includes(f), f);
  assert.ok(!/^export\s+(async\s+)?function\s+run\b/m.test(src), "kit.mjs exports no run()");
});
