/* B7205: gates jobs for an old commit of a pull request are not run, and a running one stops after its current gates. */
import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {prMark, staleWhy} from "../pcq/stale.mjs";
import {readQueue, takeQueued, putBack, stop} from "../lanes/gate-queue.mjs";

test("prMark reads the pull request and commit from a job title", () => {
  assert.deepEqual(prMark("PC job: gates touched [PR #1848 6634b017fa67]"), {pr: 1848, sha: "6634b017fa67"});
  assert.equal(prMark("PC job: gates all"), null);
  assert.equal(prMark(undefined), null);
});

test("staleWhy: same head is current, a newer head, a merge or a close is stale, nothing known is current", () => {
  const mark = {pr: 7, sha: "6634b017fa67"};
  assert.equal(staleWhy(mark, {state: "open", head: {sha: "6634b017fa67ddf166d9e4cf9a7bf0082050530a"}}), null);
  assert.match(staleWhy(mark, {state: "open", head: {sha: "7daadaa431e0aaaa"}}), /moved on to 7daadaa4/);
  assert.match(staleWhy(mark, {state: "closed", merged_at: "2026-11-17T14:15:00Z", head: {sha: "6634b017fa67"}}), /merged/);
  assert.match(staleWhy(mark, {state: "closed", merged_at: null}), /closed/);
  assert.equal(staleWhy(mark, null), null);
  assert.equal(staleWhy(null, {state: "closed"}), null);
  assert.equal(staleWhy(mark, {state: "open", head: {}}), null);
});

test("stop empties a shared queue and putBack no longer refills it", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stale-"));
  const file = path.join(dir, "q.json");
  fs.writeFileSync(file, JSON.stringify(["a", "b", "c", "d"]));
  assert.equal(takeQueued(file, "3"), "a");
  assert.equal(stop(file), 3);
  assert.deepEqual(readQueue(file), []);
  assert.equal(takeQueued(file, "4"), null);
  assert.deepEqual(putBack(file, "3", ""), []);
  assert.deepEqual(readQueue(file), []);
  fs.rmSync(dir, {recursive: true, force: true});
});

test("the runner drops stale jobs before starting and stops running ones", () => {
  const src = fs.readFileSync(new URL("../pcq/runner.mjs", import.meta.url), "utf8");
  assert.match(src, /const why = await staleJob\(i\);/);
  assert.match(src, /await stopStale\(\);/);
  assert.match(src, /if \( g\.stale \) \{/);
  assert.match(src, /catch \(e\) \{ return null; \} \/\/ unknown: never drop/);
});

test("a stopped job does not retry a lane or recheck, and a fresh queue clears the stop", () => {
  const src = fs.readFileSync(new URL("../pcq/runner.mjs", import.meta.url), "utf8");
  assert.match(src, /if \( retried \|\| stopped\(\) \) return/);
  assert.match(src, /job\.recheck === false \|\| stopped\(\) \) return/);
  assert.match(src, /fs\.rmSync\(`\$\{file\}\.stop`, \{force: true\}\);/);
});
