import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* The vehicle's own sheet (B4968, B4969): its figures by the year it was built, its Structure track, headlights. */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const VS = await import(pathToFileURL(join(root, "modules/wodx-interactables/scripts/vehicle-sheet-rules.mjs")).href);

test("a vehicle's figures come from the year it was built", () => {
  const old = VS.figures({kind: "car", built: 1925}, 1995), now = VS.figures({kind: "car"}, 1995);
  assert.equal(old.year, 1925);
  assert.equal(now.year, 1995, "blank: the chronicle's year");
  assert.ok(now.chart.top > old.chart.top, "a modern car is faster");
  assert.equal(VS.figures({kind: "tank"}, 1960).body.full, true);
  assert.equal(VS.figures({kind: "bicycle"}, 1900).speed > 0, true, "a bicycle has a pace, not a chart");
  assert.equal(VS.figures({kind: "horse"}, 1900).kind, "car", "beasts are not vehicles");
  assert.equal(VS.figures({kind: "plane"}, 1890).early, true, "before its time");
});

test("the Structure track marks like health", () => {
  const f = VS.figures({kind: "car", lost: 2}, 1990);
  assert.equal(f.track.length, f.body.structure);
  assert.deepEqual(f.track.slice(0, 3).map(b => b.lost), [true, true, false]);
  assert.equal(VS.markTrack(2, 4, 4), 4);
  assert.equal(VS.markTrack(2, 2, 4), 1, "the last box marked comes off");
  assert.equal(VS.figures({kind: "car", lost: 4}, 1990).hull.state, "wrecked");
});

test("headlights for motor vehicles from 1900, a cone ahead", () => {
  assert.equal(VS.headlights("car", 1950, true).angle, 70);
  assert.equal(VS.headlights("car", 1950, false), null);
  assert.equal(VS.headlights("cart", 1950, true), null);
  assert.ok(VS.headlights("truck", 1950, true).dim > VS.headlights("car", 1950, true).dim);
});

test("the module declares its vehicle kind and the system skips it", () => {
  const mj = JSON.parse(readFileSync(join(root, "modules/wodx-interactables/module.json"), "utf8"));
  assert.ok(mj.documentTypes?.Actor?.vehicle);
  const base = readFileSync(join(root, "system/worldofdarkness/module/actor/data/wod-actor-base.js"), "utf8");
  assert.ok((base.match(/String\(this\.type\)\.includes\("\."\)/g) ?? []).length >= 4);
});
