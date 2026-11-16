// B6390: how a body died, read from what the Kiss leaves on the vessel. Pure rules.
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const R = await import(pathToFileURL(join(root, "modules/wodx-storyteller/scripts/remains-rules.mjs")));

test("a vessel drained dry within the day is a body drained of blood", () => {
  assert.equal(R.causeAtDeath({vesselBlood: {value: 0, at: 1000}}, 1000 + 3600), "drained");
  assert.equal(R.causeAtDeath({vesselBlood: {value: 1, at: 1000}}, 1000), "drained");
});
test("blood left, or drunk days ago, says nothing of the death", () => {
  assert.equal(R.causeAtDeath({vesselBlood: {value: 4, at: 1000}}, 1000), "unknown");
  assert.equal(R.causeAtDeath({vesselBlood: {value: 0, at: 0}}, 3 * R.DAY), "unknown");
  assert.equal(R.causeAtDeath({}, 0), "unknown");
  assert.equal(R.causeAtDeath(null, 0), "unknown");
});
test("dying of the drinking is drained", () => {
  assert.equal(R.causeAtDeath({dying: {since: 5, why: "drained"}}, 99999999), "drained");
});
test("the cause reaches the body as saved", () => {
  assert.equal(R.normRemains({cause: R.causeAtDeath({vesselBlood: {value: 0, at: 0}}, 0)}, 0).cause, "drained");
});
