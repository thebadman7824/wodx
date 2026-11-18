// B7020-B7029: the nightly full gate run on the Secondary PC and its runner's below-normal priority.
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {minutesUntil, counts} from "../pcq/nightly-gates.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("give-up hour is counted in UTC and never goes below zero", () => {
  assert.equal(minutesUntil(13, new Date("2026-11-17T05:00:00Z")), 480);
  assert.equal(minutesUntil(13, new Date("2026-11-17T12:59:30Z")), 0);
  assert.equal(minutesUntil(13, new Date("2026-11-17T14:00:00Z")), 0);
});

test("result counts are read from the runner's comment", () => {
  assert.deepEqual(counts("310 gate(s) on lane 8: 305 passed, 5 failed"), {passed: 305, failed: 5, gates: 310});
  assert.deepEqual(counts("nothing here"), {passed: null, failed: null, gates: null});
});

test("the Secondary PC runner runs below normal, and only it", () => {
  const conf = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "pcq", "runner.benjamin-pc.json"), "utf8"));
  assert.equal(conf.priority, "BelowNormal");
  assert.equal(JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "pcq", "runner.json"), "utf8")).priority, undefined);
  const wrapper = fs.readFileSync(path.join(ROOT, "tools", "pcq", "run-runner.ps1"), "utf8");
  assert.match(wrapper, /\.priority/);
  assert.ok(wrapper.indexOf(".priority") < wrapper.lastIndexOf("runner.mjs"), "priority is set before the runner starts");
});

test("the nightly job is every gate on lane 8, through the GPU guard", () => {
  const src = fs.readFileSync(path.join(ROOT, "tools", "pcq", "nightly-gates.mjs"), "utf8");
  assert.match(src, /"--all", "--lane", String\(LANE\)/);
  assert.match(src, /LANE = 8/);
  assert.match(src, /guard\.acquire\(/);
  assert.match(src, /guard\?\.release\?\.\(\)/);
});

test("B7393: new failures since the last night name the pull requests merged in between", async () => {
  const {newFailures, mergedPulls} = await import("../pcq/nightly-gates.mjs");
  assert.deepEqual(newFailures(["gate7d", "gatetime"], ["gate7d", "gatefaith", "gatenew"]), ["gatefaith", "gatenew"]);
  assert.deepEqual(newFailures(null, ["gatea"]), ["gatea"]);
  assert.deepEqual(newFailures(["gatea"], []), []);
  assert.deepEqual(mergedPulls(["Merge pull request #2048 from x (urgent)", "File reviews", "Merge pull request #2045 from y", "Merge pull request #2048 again"]), [2048, 2045]);
});

test("B7393: the nightly run skips when main's gate inputs match the last nightly result", () => {
  const src = fs.readFileSync(path.join(ROOT, "tools", "pcq", "nightly-gates.mjs"), "utf8");
  assert.match(src, /"diff", "--name-only", last\.sha12, sha, "--", "modules", "system", "tools\/gate", "tools\/lanes"/);
  assert.ok(src.indexOf("skipped, nothing changed") < src.indexOf("submit.mjs\"), \"gates\", \"--all\""), "the skip comes before the job is queued");
  assert.match(src, /--force/);
});
