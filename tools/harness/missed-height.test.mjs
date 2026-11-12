import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Missed connections x7 (Targeting 0.3.0): range and area shapes count a token's height */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const T = await import(pathToFileURL(join(root, "modules/wodx-targeting/scripts/target-rules.mjs")));

test("withHeight adds the height difference to the flat distance", () => {
  assert.equal(T.withHeight(30, 0, 40), 50);
  assert.equal(T.withHeight(5, 10, 10), 5);
  assert.equal(T.withHeight(null, 0, 10), null);
  assert.equal(T.withHeight(12), 12);
});

test("a burst around the caster misses a flyer high above, hits one close above", () => {
  const sh = {s: "b", size: 5}, at = {origin: {x: 0, y: 0, z: 0}, dir: 0};
  assert.equal(T.inShape(sh, at, {x: 1, y: 0, z: 20}, 0.5), false);
  assert.equal(T.inShape(sh, at, {x: 1, y: 0, z: 3}, 0.5), true);
  assert.equal(T.inShape(sh, at, {x: 1, y: 0}, 0.5), true, "no height means the ground, as before");
});

test("a line and a cone along the ground pass under a flyer", () => {
  const at = {origin: {x: 0, y: 0, z: 0}, dir: 0};
  assert.equal(T.inShape({s: "l", size: 20}, at, {x: 10, y: 0, z: 0}, 0.5), true);
  assert.equal(T.inShape({s: "l", size: 20}, at, {x: 10, y: 0, z: 8}, 0.5), false);
  assert.equal(T.inShape({s: "o", size: 10}, at, {x: 8, y: 0, z: 1}, 0.5), true);
  assert.equal(T.inShape({s: "o", size: 10}, at, {x: 2, y: 0, z: 9}, 0.5), false);
});

test("a caster in the air aims a cone at someone on the ground below", () => {
  const at = {origin: {x: 0, y: 0, z: 4}, dir: 0};
  assert.equal(T.inShape({s: "o", size: 12}, at, {x: 9, y: 0, z: 0}, 0.5), true);
});
