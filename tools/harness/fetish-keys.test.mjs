// B7088: every Garou fetish or talen in the Library whose line a keyword can carry has its keywords; the rest are named.
import { test } from "node:test";
import assert from "node:assert/strict";

const L = await import("../../modules/wodx-actions/scripts/power-keywords-lines.js");
const W = await import("../../modules/wodx-rules/library/data/wonders.mjs");
const E = await import("../../modules/wodx-rules/actions/effects-rules.js");
const F = (L.LINE_KEYWORDS ?? L.default).fetish;
// Weapons and plain gear: their own item does the work (B6737)
const TEXT_ONLY = ["magpies-swag", "dsiah", "fang-dagger", "sun-whip", "ironhammer", "klaive", "puda", "grand-klaive", "jarlhammer", "wind-snorkel", "blade-of-the-kings"];

test("B7088: each Garou fetish and talen is keyed or named as text-only", () => {
  const fet = W.WONDERS.filter(w => w.line === "garou" && /fetish|talen/.test(w.kind));
  const missing = fet.filter(w => !F[w.key] && !TEXT_ONLY.includes(w.key)).map(w => w.key);
  assert.deepEqual(missing, []);
});

test("B7088: every fetish keyword is one the effects system reads", () => {
  for (const [k, v] of Object.entries(F)) for (const kw of v.k) assert.ok(E.KEYWORDS[kw.split(":")[0]], `${k}: ${kw}`);
});
