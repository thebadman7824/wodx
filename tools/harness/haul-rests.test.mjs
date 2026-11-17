/* B6789: a body laid on furniture (restsOn) goes with it when the furniture moves. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";

globalThis.canvas = {scene: null};
globalThis.game = {settings: {get: () => null}};
const H = await import("../../modules/wodx-interactables/scripts/haul.mjs");
const toks = [];
const scene = {id: "s", grid: {size: 100}, tokens: {get contents() { return toks; }}};
function tok(id, x, y, rests) {
  const t = {id, documentName: "Token", x, y, width: 1, height: 1, parent: scene, flags: {"wodx-interactables": rests ? {restsOn: rests} : {}},
    async update(u) { Object.assign(this, u); return this; }};
  toks.push(t); return t;
}
test("a body laid on a bed moves with the bed; a body elsewhere stays", async () => {
  const bed = {id: "bed1", x: 300, y: 300, width: 200, height: 100, parent: scene};
  const body = tok("b", 350, 300, "bed1");
  const other = tok("o", 800, 800, null);
  assert.deepEqual(H.restingOn(bed).map(t => t.id), ["b"]);
  bed.x = 600; bed.y = 400;
  await H.bodiesFollow(bed);
  assert.deepEqual([body.x, body.y], [650, 400], "on the middle of the bed where it now stands");
  assert.deepEqual([other.x, other.y], [800, 800]);
});
