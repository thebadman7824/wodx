import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import * as N from "../../modules/wodx-actions/scripts/nature-rules.js";

/* Acting to one's Nature gives a Willpower point back (B3916) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = f => readFileSync(join(root, f), "utf8");

test("nature: every V20 archetype has a cue, and the sheet's words find it", () => {
  assert.equal(Object.keys(N.NATURES).length, 30);
  assert.equal(N.natureKey("Caregiver"), "caregiver");
  assert.equal(N.natureKey("the Thrill Seeker"), "thrill-seeker");
  assert.equal(N.natureKey("Bon-Vivant"), "bon vivant");
  assert.equal(N.natureKey(""), null);
  assert.equal(N.cueFor("Something odd").key, null);
  assert.ok(N.cueFor("Something odd").cue);
  assert.equal(N.cueFor(""), null);
});

test("nature: a point back, never above the rating", () => {
  assert.equal(N.regain(3, 5), 4);
  assert.equal(N.regain(5, 5), 5);
  assert.equal(N.regain(6, 5), 6);
  assert.equal(N.regain(0, 0), 0);
});

test("nature: Actions offers it on the end-of-scene card and as a button, with Undo", () => {
  const a = src("modules/wodx-actions/scripts/main.js");
  assert.match(a, /await natureCard\(list\);/);
  assert.match(a, /nature: withActor\(a => nature\(\{ actor: a \}\)\)/);
  assert.match(a, /case "natureUndo":/);
  assert.match(a, /\/\^nature\(\\d\+\)\$\//);
});
