import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* B6779h: gatefeed step 3 undoes the feeding card, not whatever card came last */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
test("step 3 picks the card with the feeding's undo and says what came after", () => {
  const g = readFileSync(join(root, "tools/gate/gatefeed.mjs"), "utf8");
  const step = g.slice(g.indexOf('step("3 undo"'), g.indexOf('step("4'));
  assert.doesNotMatch(step, /feedUndo\(lastMsg\(\)\)/);
  assert.match(step, /flags\?\.\[M\]\?\.undo\?\.uuid/);
  assert.match(step, /cardsAfter/);
});
