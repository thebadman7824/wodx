import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import * as V from "../../modules/wodx-otherworlds/scripts/veil-look-rules.mjs";

/* What only the right eyes see (B4634) */
test("veil looks: a thin Gauntlet shimmers for werebeasts and mages, a thin Shroud mists for the dead; the Wyrm's haze for those who sense it", () => {
  assert.deepEqual(V.veilFor({gauntlet: 3, shroud: 9}, {nature: "werebeast"}), {shimmer: true, mist: false});
  assert.deepEqual(V.veilFor({gauntlet: 3, shroud: 9}, {nature: "human"}), {shimmer: false, mist: false});
  assert.deepEqual(V.veilFor({gauntlet: 7, shroud: 4}, {nature: "ghost"}), {shimmer: false, mist: true});
  assert.deepEqual(V.veilFor({gauntlet: 7, shroud: 4}, {nature: "vampire"}), {shimmer: false, mist: false});
  assert.deepEqual(V.veilFor({gauntlet: 2, shroud: 4}, {gm: true}), {shimmer: true, mist: true});
  assert.deepEqual(V.veilFor({gauntlet: 0, shroud: null}, {gm: true}), {shimmer: false, mist: false}, "no Gauntlet at all is not a thin one");
  assert.ok(V.sensesWyrm({nature: "werebeast"}));
  assert.ok(V.sensesWyrm({nature: "vampire", powers: ["Sense Wyrm"]}));
  assert.ok(!V.sensesWyrm({nature: "vampire", powers: ["Auspex"]}));
});
