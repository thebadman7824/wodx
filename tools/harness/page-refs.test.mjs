/* Page references in in-game text (Phase 10): written "Book p. N" or "Book pdf N / p. N", and pinned to their
 * book in the windows and cards of the single-book files below, so a card read on its own names its source. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join, dirname} from "node:path";
import {fileURLToPath} from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PINNED = ["wodx-actions/scripts/demon.js", "wodx-actions/scripts/fae-da.js", "wodx-actions/scripts/kote.js",
  "wodx-actions/scripts/mage-da.js", "wodx-actions/scripts/mage-da-rules.js", "wodx-actions/scripts/mummy.js",
  "wodx-actions/scripts/reckoning.js", "wodx-actions/scripts/rules.js", "wodx-actions/scripts/wraith.js",
  "wodx-actions/scripts/kindred.js", "wodx-actions/scripts/main.js", "wodx-actions/scripts/c20.js",
  "wodx-combat/scripts/rules.js", "wodx-creation/scripts/change-of-state.mjs", "wodx-creation/scripts/time.mjs",
  "wodx-chronicle/scripts/conditions.mjs"];
const code = f => readFileSync(join(root, "modules", f), "utf8").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

test("page refs on cards in single-book files name their book", () => {
  const bare = [];
  for ( const f of PINNED ) for ( const m of code(f).matchAll(/[^\n]{0,40}(?<=["'`>] |[.,:;!?)\w] |["'`>])\(pp?\. \d+[^\n]{0,10}/g) ) bare.push(`${f}: ${m[0].trim()}`);
  assert.deepEqual(bare, []);
});

test("page refs use 'p.' and 'pdf N / p. N', not 'page' or 'pg.'", () => {
  const bad = [];
  for ( const f of PINNED ) for ( const m of code(f).matchAll(/\b(pg\.? ?\d+|pdf page \d+|printed page \d+|pp\. \d+\))/g) ) bad.push(`${f}: ${m[0]}`);
  assert.deepEqual(bad, []);
});
