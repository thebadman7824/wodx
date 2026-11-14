import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import * as PR from "../../modules/wodx-npc/scripts/passerby-rules.mjs";

/* A district fed on too much empties at night (B4630) */
test("herd crowd: fewer people out at night as the district thins; days and new months as before", () => {
  assert.equal(PR.herdCrowd("fine", 23), 1);
  assert.ok(PR.herdCrowd("thin", 23) > PR.herdCrowd("over", 23) && PR.herdCrowd("over", 23) > PR.herdCrowd("stripped", 2));
  assert.equal(PR.herdCrowd("stripped", 12), 1, "by day the streets are as the town makes them");
  const month = 30 * 86400;
  assert.equal(PR.herdStageAt({month: 5, stage: "over"}, 5 * month + 100), "over");
  assert.equal(PR.herdStageAt({month: 4, stage: "over"}, 5 * month + 100), "fine");
  assert.equal(PR.herdStageAt(null, 0), "fine");
});
