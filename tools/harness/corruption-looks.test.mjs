import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import * as L from "../../modules/wodx-otherworlds/scripts/corruption-look-rules.mjs";
import {normPlace} from "../../modules/wodx-otherworlds/scripts/corruption-rules.mjs";

/* Wyrm corruption shown on the place's scene (B4621) */

const rect = {x: 100, y: 100, width: 3000, height: 2000};

test("wyrm looks: a clean place has none; the cast deepens with the band", () => {
  assert.deepEqual(L.looksFor(normPlace({level: 0, banes: 3}), {rect}), []);
  const cast = lv => L.looksFor(normPlace({level: lv}), {rect}).find(l => !l.at).intensity;
  assert.ok(cast(2) < cast(5) && cast(5) < cast(8) && cast(8) < cast(10));
  assert.equal(L.signature(normPlace({level: 0, banes: 4})), "clean");
});

test("wyrm looks: sludge at each source, haze for Banes (capped), seeded, inside the scene", () => {
  const p = normPlace({level: 6, banes: 9, sources: [{kind: "nest"}, {kind: "works", name: "The tannery"}]});
  const a = L.looksFor(p, {rect, grid: 100, seed: "s1"}), b = L.looksFor(p, {rect, grid: 100, seed: "s1"});
  assert.deepEqual(a, b);
  assert.equal(a.filter(l => l.kind === "taint" && l.at).length, 2);
  assert.equal(a.filter(l => l.kind === "smoke").length, L.MAX_HAZE);
  for ( const l of a.filter(x => x.at) ) assert.ok(l.at.x >= rect.x && l.at.x <= rect.x + rect.width && l.at.y >= rect.y && l.at.y <= rect.y + rect.height);
  assert.ok(a.some(l => /tannery/.test(l.note)));
  assert.notEqual(L.signature(p), L.signature({...p, banes: 1}), "fewer Banes redraws");
  for ( const l of a ) assert.ok(L.fallbackAlpha(l) > 0 && L.fallbackAlpha(l) <= 0.4);
});
