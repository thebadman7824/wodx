import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import * as K from "../../modules/wodx-actions/scripts/kindred-rules.js";
import {FLOCKS} from "../../modules/wodx-npc/scripts/road-flock-rules.mjs";
import {ROAD_TO_PATH} from "../../modules/wodx-creation/data/advance.mjs";

const ROADS = JSON.parse(readFileSync(new URL("../../modules/wodx-actions/data/roads-daw.json", import.meta.url), "utf8"));

// B7669: the Roads of V20 Dark Ages Appendix B (pp. 432-449)
test("the Appendix B Roads are in, each found by name, with a group and a V20 Path to become", () => {
  const want = {blood: "Road of Blood", abyss: "Road of the Abyss", paradox: "Road of Paradox", samiel: "Code of Samiel", set: "Road of Set"};
  for ( const [k, name] of Object.entries(want) ) {
    assert.equal(K.roadFor(ROADS, name).key, k, name);
    assert.equal(ROADS.roads[k].sins.length, 10, k);
    assert.ok(FLOCKS[k]?.p >= 432, `${k} has a group`);
    assert.ok(ROAD_TO_PATH[k], `${k} becomes a V20 Path`);
  }
  assert.deepEqual(K.roadVirtues(K.roadFor(ROADS, "Road of Paradox")), {conviction: true, instinct: false});
  assert.deepEqual(K.roadVirtues(K.roadFor(ROADS, "Code of Samiel")), {conviction: false, instinct: false});
  assert.equal(ROADS.roads.blood.auraOn, "Willpower rolls");
  const apep = K.roadFor(ROADS, "Path of Apep");
  assert.equal(apep.key, "set"); assert.equal(apep.path.name, "Path of Apep");
  assert.equal(K.sinAt(K.hierarchyOf(apep), 1), "Upholding the law");
  assert.deepEqual(K.roadVirtues(apep), {conviction: true, instinct: true});
  for ( const k of ["abyss", "samiel", "set"] ) assert.match(ROADS.roads[k].house, /house reading/, k);
});

test("sins from play on the Appendix B Roads follow their hierarchies", () => {
  const f = n => K.roadFor(ROADS, n);
  assert.equal(K.sinForEvent(f("Road of Blood"), "frenzy"), 8);
  assert.equal(K.sinForEvent(f("Road of Blood"), "wordBroken"), 3);
  assert.equal(K.sinForEvent(f("Road of Blood"), "kill"), null);
  assert.equal(K.sinForEvent(f("Road of Paradox"), "killFeed"), 7);
  assert.equal(K.sinForEvent(f("Road of Paradox"), "kill"), 3);
  assert.equal(K.sinForEvent(f("Road of Paradox"), "embrace"), 1);
  assert.equal(K.sinForEvent(f("Road of the Abyss"), "starve"), 7);
  assert.equal(K.sinForEvent(f("Code of Samiel"), "lie"), 8);
  assert.equal(K.sinForEvent(f("Path of Apep"), "kill"), null);
});
