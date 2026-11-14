import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import * as L from "../../modules/wodx-storyteller/scripts/power-look-rules.mjs";

/* Places of power glow for those who could see them (B4635) */
test("power looks: a Node glows for mages and dims when drained; a caern for werebeasts; a balefire for changelings", () => {
  const full = L.glowOf({kind: "node", rating: 4, store: {quint: 3, tass: 2}}), dry = L.glowOf({kind: "node", rating: 4, store: {quint: 0, tass: 0}});
  assert.ok(full.strength > dry.strength);
  assert.ok(L.sees(full, {nature: "witch"}) && !L.sees(full, {nature: "werebeast"}) && L.sees(full, {gm: true}));
  const caern = L.glowOf({kind: "caern", level: 3});
  assert.ok(L.sees(caern, {nature: "werebeast"}) && !L.sees(caern, {nature: "human"}));
  assert.equal(L.glowOf({kind: "caern", level: 0}), null);
  const fire = L.glowOf({kind: "freehold", base: 4, rating: 2});
  assert.ok(fire.flame && L.sees(fire, {nature: "fae"}) && !L.sees(fire, {nature: "witch"}));
  assert.ok(L.glowOf({kind: "freehold", base: 4, rating: 4}).radius > fire.radius, "the flame follows the ranks");
  assert.equal(L.glowOf({kind: "freehold", base: 4, rating: 0}), null);
  assert.equal(L.glowOf({kind: "chantry"}), null);
});
