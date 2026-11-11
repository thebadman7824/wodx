import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* WoDX Storyteller 0.21.0: teleport the selected tokens to the cursor. */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const S = p => join(root, "modules/wodx-storyteller/scripts", p);
const R = await import(S("teleport-rules.mjs"));

test("one token lands with its centre on the point", () => {
  const [t] = R.landing([{id: "a", x: 0, y: 0, w: 100, h: 100}], {x: 550, y: 350});
  assert.deepEqual(t, {id: "a", x: 500, y: 300});
});

test("a large token centres too", () => {
  const [t] = R.landing([{id: "big", x: 0, y: 0, w: 200, h: 300}], {x: 1000, y: 1000});
  assert.deepEqual(t, {id: "big", x: 900, y: 850});
});

test("several tokens keep their places around one another", () => {
  const to = R.landing([{id: "a", x: 0, y: 0, w: 100, h: 100}, {id: "b", x: 200, y: 0, w: 100, h: 100}], {x: 1050, y: 550});
  assert.deepEqual(to, [{id: "a", x: 900, y: 500}, {id: "b", x: 1100, y: 500}]);
  assert.equal(to[1].x - to[0].x, 200);
});

test("nobody lands outside the scene", () => {
  const rect = {x: 100, y: 100, width: 1000, height: 800};
  const [t] = R.landing([{id: "a", x: 500, y: 500, w: 100, h: 100}], {x: 0, y: 5000}, rect);
  assert.deepEqual(t, {id: "a", x: 100, y: 800});
  const [u] = R.landing([{id: "a", x: 500, y: 500, w: 100, h: 100}], {x: 9999, y: -50}, rect);
  assert.deepEqual(u, {id: "a", x: 1000, y: 100});
});

test("no tokens or no point gives nothing to move", () => {
  assert.deepEqual(R.landing([], {x: 1, y: 1}), []);
  assert.deepEqual(R.landing([{id: "a", x: 0, y: 0, w: 1, h: 1}], null), []);
  assert.deepEqual(R.landing([{id: "a", x: 0, y: 0, w: 1, h: 1}], {x: NaN, y: 2}), []);
  assert.equal(R.middleOf([]), null);
});

test("whole pixels only", () => {
  const [t] = R.landing([{id: "a", x: 0, y: 0, w: 75, h: 75}], {x: 10.4, y: 20.6});
  assert.ok(Number.isInteger(t.x) && Number.isInteger(t.y));
});

test("the button and key are the Storyteller's alone and jump through walls", () => {
  const main = readFileSync(S("main.mjs"), "utf8");
  assert.match(main, /wodxTeleport = \{[^}]*visible: game\.user\.isGM/);
  const tp = readFileSync(S("teleport.mjs"), "utf8");
  assert.match(tp, /restricted: true/);
  assert.match(tp, /action: "displace"/);
  assert.match(tp, /if \( !game\.user\?\.isGM \) return \[\]/);
});
