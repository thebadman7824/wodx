import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Missed connections x6 (Actions 3.45.0): the hour, the era, the crowd and the weather nudge a hunt */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const HN = await import(pathToFileURL(join(root, "modules/wodx-actions/scripts/hunt-night-rules.js")));

test("a medieval town in the small hours is all but empty", () => {
  const nd = HN.huntNudge({year: 1230, hour: 3, area: "market"});
  assert.equal(nd.n, 2);
  assert.match(HN.nudgeText(nd), /^\+2: the streets are all but empty in the small hours$/);
});

test("a modern city at night needs no nudge, a medieval one does", () => {
  assert.equal(HN.huntNudge({year: 1995, hour: 23, area: "market"}).n, 0);
  assert.equal(HN.huntNudge({year: 1230, hour: 23, area: "market"}).n, 1);
});

test("storms keep people indoors, but not for an indoor scene", () => {
  const storm = {sky: "storm", precip: "rain", intensity: "heavy", wind: "gale", tempDay: 10, tempNight: 6};
  assert.equal(HN.huntNudge({year: 1995, hour: 23, weather: storm}).n, 1);
  assert.equal(HN.huntNudge({year: 1995, hour: 23, weather: storm, indoor: true}).n, 0);
  assert.equal(HN.huntNudge({year: 1995, hour: 23, weather: {sky: "clear", precip: "none", tempDay: 15, tempNight: 9}}).n, 0);
});

test("never more than +3, and the crowd setting counts", () => {
  const blizzard = {sky: "overcast", precip: "snow", intensity: "heavy", tempDay: -4, tempNight: -9};
  assert.ok(HN.huntNudge({year: 1230, hour: 3, weather: blizzard}).n <= 3);
  assert.equal(HN.huntNudge({year: 1230, hour: 19, density: "quiet"}).n, 1);
  assert.equal(HN.huntNudge({year: 1230, hour: 19, density: "busy"}).n, 0);
});
