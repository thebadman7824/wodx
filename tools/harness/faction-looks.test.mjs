import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import * as R from "../../modules/wodx-npc/scripts/faction-look-rules.mjs";

/* Who holds a place, shown on its scene (B4631) */
test("faction banners: two at a held scene's gates, one at a held place, none for a secret faction", () => {
  const f = {id: "f1", name: "The Guild of Smiths", secret: false};
  const rect = {x: 0, y: 0, width: 3000, height: 2000};
  const a = R.bannersFor(f, {rect, grid: 100, seed: "Scene.x"});
  assert.equal(a.length, 2);
  for ( const l of a ) { assert.match(l.text, /Guild of Smiths/); assert.equal(l.color, R.colourOf("f1")); assert.ok(l.at.x >= 0 && l.at.x <= 3000 && l.at.y >= 0 && l.at.y <= 2000); }
  assert.deepEqual(a, R.bannersFor(f, {rect, grid: 100, seed: "Scene.x"}), "the same place, the same banners");
  assert.equal(R.bannersFor(f, {at: {x: 500, y: 500}, grid: 100}).length, 1);
  assert.deepEqual(R.bannersFor({...f, secret: true}, {rect}), []);
  assert.match(R.colourOf("f1"), /^#[0-9a-f]{6}$/);
  assert.notEqual(R.colourOf("f1"), R.colourOf("f2"));
  assert.deepEqual(R.middleOf({type: "rectangle", x: 100, y: 100, width: 200, height: 100}), {x: 200, y: 150});
  assert.deepEqual(R.middleOf({type: "polygon", points: [0, 0, 100, 0, 100, 100, 0, 100]}), {x: 50, y: 50});
});
