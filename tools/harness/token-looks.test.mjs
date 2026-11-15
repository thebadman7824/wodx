import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import * as T from "../../modules/wodx-chronicle/scripts/token-look-rules.mjs";

/* Frenzy, Rotschreck and derangement bouts (B4632) */
test("token looks: looks combine, Light drops movement, Off shows nothing; each derangement has a screen edge", () => {
  const both = T.combine([T.CONDITION_LOOKS.frenzy, {tint: 0xd4dcc4}]);
  assert.equal(both.shake, 2);
  assert.equal(both.aura.color, T.CONDITION_LOOKS.frenzy.aura.color);
  assert.ok(both.tint < 0xffb0a8);
  const light = T.combine([T.CONDITION_LOOKS.frenzy, T.CONDITION_LOOKS.rotschreck], "light");
  assert.equal(light.shake, 0); assert.equal(light.flicker, false); assert.ok(light.aura);
  assert.equal(T.combine([T.CONDITION_LOOKS.frenzy], "off"), null);
  assert.equal(T.combine([]), null);
  assert.equal(T.mulTint(0xffffff, 0x808080), 0x808080);
  for ( const k of ["paranoia", "megalomania", "schizophrenia", "obsession", "multiple", "regression", "hysteria", "manic", "animism", "fugue", "synesthesia", "bulimia", "perfection", "phobia"] )
    assert.ok(T.EDGE_CSS[T.edgeOf([k])], k);
  assert.equal(T.edgeOf([]), null);
});

test("token looks: the sheet's own Frenzy box glows like the status (B6163)", () => {
  assert.equal(T.conditionOn("frenzy", {system: {conditions: {isfrenzy: true}}}), true);
  assert.equal(T.conditionOn("frenzy", {system: {conditions: {isfrenzy: false}}}), false);
  assert.equal(T.conditionOn("frenzy", {hasStatus: true}), true);
  assert.equal(T.conditionOn("rotschreck", {system: {conditions: {isfrenzy: true}}}), false);
  assert.equal(T.conditionOn("rotschreck", {hasStatus: true}), true);
});
