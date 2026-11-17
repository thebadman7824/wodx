/** B7191: gate 7b deletes its arena at the end (B6050), so gate 7b1 must build one when none is there. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = f => fs.readFileSync(new URL(`../gate/${f}`, import.meta.url), "utf8");

test("B7191: gate 7b1 makes and removes its own arena after gate 7b has removed the old one", () => {
  const b = read("gate7b.mjs"), b1 = read("gate7b1.mjs");
  assert.match(b, /if \( sc && sc\.id !== canvas\.scene\?\.id \) await sc\.delete\(\)/, "gate 7b still removes its arena");
  assert.match(b, /^export function cast\(\)/m);
  assert.match(b, /^export async function arena\(roles\)/m);
  assert.match(b1, /if \( !sc \) \{[\s\S]*?g7b\.arena\(g7b\.cast\(\)\)/);
  assert.match(b1, /await madeArena\.delete\(\)/);
});
