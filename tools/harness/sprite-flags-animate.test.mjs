import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";

/* B7986 (#2598): Foundry 14 stops a token's running move on any update with {animate: false}, so Paperdoll's pose and
   look flags (sent as a figure gets up to walk, or mid-walk) must not carry it. */
test("Paperdoll's flag-only token updates never pass animate: false", () => {
  const src = readFileSync(new URL("../../modules/wodx-paperdoll/scripts/sprites.mjs", import.meta.url), "utf8");
  const bad = src.split("\n").map((l, i) => [i + 1, l]).filter(([, l]) => /\.update\(\{flags:/.test(l) && /animate:\s*false/.test(l));
  assert.deepEqual(bad, [], bad.map(([n, l]) => `${n}: ${l.trim()}`).join("\n"));
});
