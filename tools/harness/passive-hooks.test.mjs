import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Trait effects step 9 (Storyteller 0.30.0): codex pages that need knowledge, Survival against the weather */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const X = await import(pathToFileURL(join(root, "modules/wodx-storyteller/scripts/codex-rules.mjs")));
const H = await import(pathToFileURL(join(root, "modules/wodx-storyteller/scripts/hardship-rules.mjs")));
const src = p => readFileSync(join(root, p), "utf8");

test("a page tagged [Occult 5] needs Intelligence + Occult of 5; several tags are alternatives", () => {
  assert.deepEqual(X.needsOf("The Tremere Pyramid [Occult 5]"), [{ability: "occult", need: 5}]);
  assert.deepEqual(X.needsOf("Old charters [Law 4 or Academics 6]"), [{ability: "law", need: 4}, {ability: "academics", need: 6}]);
  assert.deepEqual(X.needsOf("A plain page"), []);
  assert.equal(X.knowsEnough([], {}), true);
  assert.equal(X.knowsEnough(X.needsOf("x [Occult 5]"), {intelligence: 3, abilities: {occult: 2}}), true);
  assert.equal(X.knowsEnough(X.needsOf("x [Occult 5]"), {intelligence: 3, abilities: {occult: 1}}), false);
  assert.equal(X.knowsEnough(X.needsOf("x [Law 4 or Academics 6]"), {intelligence: 2, abilities: {academics: 4}}), true);
  assert.equal(X.bareName("The Tremere Pyramid [Occult 5]"), "The Tremere Pyramid");
});

test("Survival adds to the Stamina roll against the weather", () => {
  assert.equal(H.weatherDice(2, 0), 2);
  assert.equal(H.weatherDice(2, 3), 5);
  assert.equal(H.weatherDice(0, 0), 1);
  const s = src("modules/wodx-storyteller/scripts/hardship.mjs");
  assert.match(s, /H\.weatherDice\(stamina\(a\), survival\(a\)\)/);
  const c = src("modules/wodx-storyteller/scripts/codex.mjs");
  assert.match(c, /X\.knowsEnough\(needs, dotsOf\(a\)\)/);
  assert.match(c, /name: X\.bareName\(p\.name\)/);
});
