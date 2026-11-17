// Frozen test builds for the solo world (B7161): the label, the packages copied and the MD5 check.
import {test} from "node:test";
import assert from "node:assert/strict";
import {rcLabel, isLabel, packagesOf, md5Mismatches} from "../release/rc.mjs";

test("a release candidate is named rc-YYYY-MM-DD", () => {
  assert.equal(rcLabel(new Date(Date.UTC(2026, 10, 17, 23, 59))), "rc-2026-11-17");
  assert.equal(rcLabel("2026-11-28"), "rc-2026-11-28");
  assert.ok(isLabel("rc-2026-11-28") && isLabel("rc-2026-11-28b"));
  assert.ok(!isLabel("rc-x") && !isLabel("2026-11-28") && !isLabel("rc-2026-11-28; rm"));
  assert.throws(() => rcLabel("not a date"));
});

test("the system and only wodx- modules are copied", () => {
  assert.deepEqual(packagesOf({system: true, modules: ["wodx-solo", "other", "wodx-actions"]}), [
    {from: "system/worldofdarkness", to: "systems/worldofdarkness"},
    {from: "modules/wodx-actions", to: "modules/wodx-actions"},
    {from: "modules/wodx-solo", to: "modules/wodx-solo"}]);
  assert.deepEqual(packagesOf({system: false, modules: []}), []);
});

test("the MD5 check names missing and changed files, never the stamp", () => {
  const want = [{path: "a.mjs", md5: "1"}, {path: "b.mjs", md5: "2"}, {path: "release.json", md5: "3"}, {path: "c.mjs", md5: "4"}];
  const got = [{path: "a.mjs", md5: "1"}, {path: "b.mjs", md5: "x"}, {path: "release.json", md5: "stamped"}];
  assert.deepEqual(md5Mismatches(want, got), ["b.mjs", "c.mjs"]);
});
