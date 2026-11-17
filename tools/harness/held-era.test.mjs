import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/*
 * Final audit (B6759): while the world is held (a gate, a flashback), an era put in force does not write to the
 * characters. gateskip found existing characters changed by a held skip: an era change fires wodxEraApplied, and two
 * listeners wrote to actors without asking about the hold (WoDX Atmosphere's aging faces, WoDX NPC's year sweep of
 * the factions). The gate drives the real path (gateskip, last step, which now lists what changed on each).
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const hookBody = (s, name) => s.split("\n").filter(l => l.includes(`Hooks.on("${name}"`));

test("WoDX Atmosphere ages no face on an era change while the world is held", () => {
  const lines = hookBody(src("modules/wodx-atmosphere/scripts/main.mjs"), "wodxEraApplied");
  assert.equal(lines.length, 1);
  assert.match(lines[0], /if \( !chron\(\)\?\.isHeld\?\.\(\) \) ageEverything\(\)/);
});

test("WoDX NPC sweeps the factions' years on an era change only when the clock is free", () => {
  const lines = hookBody(src("modules/wodx-npc/scripts/factions.mjs"), "wodxEraApplied");
  assert.equal(lines.length, 1);
  assert.match(lines[0], /!skipping\(\)/);
});

test("gateskip says what changed on each character it finds changed", () => {
  const g = src("tools/gate/gateskip.mjs");
  assert.match(g, /changed, what, gone/);
});
