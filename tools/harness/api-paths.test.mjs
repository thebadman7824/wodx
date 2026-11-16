import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* B6200: the scanner behind gateapipaths (merge-stamp refreshes its fixture at every merge). */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const {collect} = await import(join(root, "tools/audit/api-paths.mjs"));
const {holds} = await import(join(root, "tools/gate/gateapipaths.mjs"));

test("the scanner sees getters, helpers and imported getters", () => {
  const list = collect();
  const has = (t, p) => list.some(r => r.target === t && r.path.join(".") === p);
  assert.ok(has("wodx-chronicle", "conditions.hasCondition"), "a getter: const chronicle = () => game.modules.get(...).api");
  assert.ok(has("wodx-storyteller", "upkeep.towns.ofScene"), "a module-id helper: api(\"wodx-storyteller\")");
  assert.ok(has("wodx-npc", "orderCarry") || list.some(r => r.target === "wodx-npc" && r.uses.some(u => u.includes("hunt-follow"))), "an imported getter: npc() from core.mjs");
});

test("holds walks a path and counts a key set to null", () => {
  const api = {a: {b: null, f: Object.assign(() => 1, {x: 1})}};
  assert.equal(holds(api, ["a", "b"]), true);
  assert.equal(holds(api, ["a", "f", "x"]), true);
  assert.equal(holds(api, ["a", "c"]), false);
  assert.equal(holds(api, ["a", "b", "c"]), false);
});
