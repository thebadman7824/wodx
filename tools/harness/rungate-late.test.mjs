// B7580: run-gate puts settings back a second time after a short settle, so a setting written by the hooks that putting
// the clock, scene and pause back sets off (gatebattle's wodx-chronicle.nightWork) does not leave the lane drifted.
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("run-gate puts settings back again after the clock, scene and pause are back", () => {
  const src = fs.readFileSync(new URL("../lanes/run-gate.mjs", import.meta.url), "utf8");
  const pause = src.indexOf("if ( game.paused !== paused ) await game.togglePause(paused");
  assert.ok(pause > 0, "the pause is put back");
  const after = src.slice(pause, pause + 900);
  assert.match(after, /setTimeout\(r, \d{4}\)/, "a settle wait follows");
  assert.match(after, /await settingsPass\(\)/, "then the settings pass runs again");
  assert.equal((src.match(/await settingsPass\(\)/g) ?? []).length, 2, "once before, once after the settle");
});