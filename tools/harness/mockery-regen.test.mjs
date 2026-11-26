/* B7820: the Mockery Breeds regenerate at the Garou's rate (W20 Book of the Wyrm), on a Creature sheet (#2096). */
import "./win-paths.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import { readFileSync } from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const G = await import(pathToFileURL(join(root, "modules/wodx-rules/actions/garou-rules.js")));

test("every Mockery Breed mockeryOf() knows regenerates, with its page", () => {
  for (const k of ["warwolves", "anurana", "samsa", "kerasi", "yeren"]) {
    const r = G.mockeryRegeneration(k);
    assert.equal(r.regen, true, k);
    assert.match(r.page, /^W20 Book of the Wyrm p\. 1(6[7-9]|7[0-4])$/, k);
  }
  assert.equal(G.mockeryRegeneration("WarWolves").regen, true, "case does not matter");
  assert.equal(G.mockeryRegeneration("").regen, false);
  assert.equal(G.mockeryRegeneration("fomor").regen, false);
});

test("the round's regeneration reads a Mockery Breed through the Chronicle traits api", () => {
  const src = readFileSync(join(root, "modules/wodx-actions/scripts/garou.js"), "utf8");
  assert.match(src, /chronicle\(\)\?\.traits\?\.mockeryOf\?\.\(a\)/);
  assert.match(src, /mock \? G\.mockeryRegeneration\(mock\)/);
  const tr = readFileSync(join(root, "modules/wodx-chronicle/scripts/traits.mjs"), "utf8");
  assert.match(tr, /export const traitsApi = \{[^}]*\bmockeryOf\b/);
});
