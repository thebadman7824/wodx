// The fork's mortal sheet: every method that sets `found` declares it, and the Dark Ages vampire setup still sets it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("../../system/worldofdarkness/module/actor/template/mortal-actor-sheet.js", import.meta.url), "utf8");
const methods = src.split(/\n\t(?=(?:async |static )?[_A-Za-z]+\s*\([^)]*\)\s*\{)/);
test("no undeclared found in the mortal sheet", () => {
  const bad = methods.filter(b => /\bfound = true/.test(b) && !/let found/.test(b)).map(b => b.slice(0, 40));
  assert.deepEqual(bad, []);
});
test("bonus branch of _onItemCreate does not touch found", () => {
  const m = methods.find(b => b.startsWith("async _onItemCreate"));
  assert.ok(m);
  assert.ok(!/itemtype == "Bonus"\) \{\s*found/.test(m));
});
test("Dark Ages vampire setup sets found so the era is saved", () => {
  assert.match(src, /sheettype\.vampire\) \{\s*found = true;\s*await CreateHelper\.SetVampireAbilities\(this\.actor, "darkages"\)/);
});
