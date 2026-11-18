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

test("B7206: jobOfLog names the job a log belongs to, on either path style", async () => {
  const {jobOfLog} = await import("../pcq/stale.mjs");
  assert.equal(jobOfLog("D:\\WoDX\\pcq\\logs\\job1932-l2.log"), "job1932");
  assert.equal(jobOfLog("/x/logs/job1949-l3-report.txt"), "job1949");
  assert.equal(jobOfLog("/x/logs/train.log"), null);
  assert.equal(jobOfLog(undefined), null);
});

test("B7206: a closed or pc-cancel job is cancelled: processes ended, lanes reset, no result posted", () => {
  const src = fs.readFileSync(new URL("../pcq/runner.mjs", import.meta.url), "utf8");
  assert.match(src, /await cancelCheck\(issues, openNums\);/);
  assert.match(src, /only a closed state read from the issue itself cancels/);
  assert.match(src, /for \( const p of ps \) \{ try \{ endTree\(p\);/);
  assert.match(src, /if \( g\.cancelled \) \{\n\s+for \( const l of new Set\(\[\.\.\.lanes, \.\.\.g\.used\]\) \) await lanesCmd\(\["reset"/);
  assert.match(src, /g\.finishing = true;/);
  assert.match(src, /halted\.has\(tag\)/);
  assert.match(src, /if \( !g\.cancelled \) await finish\(issue, false, `Runner error/);
  assert.match(src, /Not run: labelled pc-cancel\./);
});

test("B7207: runner-hold blocks only job pickup and lane growth; runner-off still updates the status", () => {
  const src = fs.readFileSync(new URL("../pcq/runner.mjs", import.meta.url), "utf8");
  assert.match(src, /const holding = fs\.existsSync\(path\.join\(HOME, "runner-hold"\)\);/);
  assert.match(src, /for \( const q of draining \|\| holding \? \[\] : ready \)/);
  assert.match(src, /if \( !draining && !holding && !res\.low\.length \) growJobs\(/);
  assert.match(src, /holding \? "runner-hold: taking no new jobs" : null\)/);
  assert.match(src, /await status\(\[\], "runner-off: stops once the running job\(s\) end"\)/);
  // The hold check comes after the runner-off branch and before the passes it must not skip. B7330: the runner-off
  // wait runs its own cancel pass, so the main loop's pass is the first one after the hold check.
  const hold = src.indexOf('const holding = '), off = src.indexOf('"runner-off"))'), sweepAt = src.indexOf("sweep(gh, {apply"), cancel = src.indexOf("await cancelCheck(", hold);
  assert.ok(off > 0 && off < hold && hold < sweepAt && hold < cancel);
});

test("B7209: a job is only dropped as stale on a pull request read just now, never on the cached head", () => {
  const src = fs.readFileSync(new URL("../pcq/runner.mjs", import.meta.url), "utf8");
  const fn = src.slice(src.indexOf("async function staleJob"), src.indexOf("async function drop("));
  assert.match(fn, /if \( !c \|\| !staleWhy\(mark, c\.pull\) \) return null;/);
  assert.match(fn, /if \( c\.at < Date\.now\(\) - 5000 \) c = await fetchPull\(\);/);
  assert.match(fn, /return c \? staleWhy\(mark, c\.pull\) : null;/);
});
