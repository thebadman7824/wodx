// B7010: the PC gates workflow's queue script (tools/pcq/pr-gates.mjs) and its lock-down.
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {isHold, parseGates, priorPass, marker} from "../pcq/pr-gates.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("hold and handoff pull requests are not queued", () => {
  assert.equal(isHold({title: "HOLD: local agent: names-04"}), true);
  assert.equal(isHold({title: "[HOLD] outside LLM"}), true);
  assert.equal(isHold({title: "Handoff: daily refresh"}), true);
  assert.equal(isHold({title: "Fix x", labels: ["hold"]}), true);
  assert.equal(isHold({title: "Fix x", headRef: "claude/handoff/today"}), true);
  assert.equal(isHold({title: "gatetruthrelay: a fighter the burn does not Daze", headRef: "claude/x"}), false);
  assert.equal(isHold({title: "Interactables: a wire holds you", headRef: "claude/x"}), false);
});

test("gate list is read from run-gate --list output", () => {
  assert.deepEqual(parseGates("Touched modules: wodx-combat; 2 gate(s) to run.\nGATES [\"gateplains\",\"gatelifepath\"]\n"), ["gateplains", "gatelifepath"]);
  assert.deepEqual(parseGates("Touched modules: none; 0 gate(s) to run.\nNothing in this change needs a gate.\n"), []);
  assert.deepEqual(parseGates("GATES [\"ok\",\"bad name;rm\"]"), ["ok"]);
});

test("an earlier pass counts only when the gate inputs match", () => {
  const ok = {context: "wodx/gates", state: "success"}, bad = {context: "wodx/gates", state: "failure"}, other = {context: "checks", state: "success"};
  const cands = [{sha: "c3", statuses: [other]}, {sha: "c2", statuses: [ok]}, {sha: "c1", statuses: [ok]}];
  assert.equal(priorPass(cands, () => true), "c2");
  assert.equal(priorPass(cands, s => s === "c1"), "c1");
  assert.equal(priorPass(cands, () => false), null);
  assert.equal(priorPass([{sha: "c1", statuses: [bad]}], () => true), null);
});

test("job marker ties the issue to the pull request and commit", () => {
  assert.equal(marker(1834, "0123456789abcdef0123"), "[PR #1834 0123456789ab]");
});

test("workflow is locked to owner pull requests from this repository's claude/ branches", () => {
  const wf = fs.readFileSync(path.join(ROOT, ".github", "workflows", "pc-gates.yml"), "utf8");
  assert.match(wf, /runs-on: \[self-hosted, wodx-gate\]/);
  assert.match(wf, /head\.repo\.full_name == github\.repository/);
  assert.match(wf, /user\.login == 'thebadman7824'/);
  assert.match(wf, /startsWith\(github\.event\.pull_request\.head\.ref, 'claude\/'\)/);
  assert.match(wf, /persist-credentials: false/);
  assert.doesNotMatch(wf, /pull_request_target|workflow_run|issue_comment/);
  assert.doesNotMatch(wf, /statuses: write|wodx\/gates.*state/);
});

test("no other workflow runs on the self-hosted runner", () => {
  const dir = path.join(ROOT, ".github", "workflows");
  for ( const f of fs.readdirSync(dir).filter(f => /\.ya?ml$/.test(f) && f !== "pc-gates.yml") )
    assert.doesNotMatch(fs.readFileSync(path.join(dir, f), "utf8"), /self-hosted|wodx-gate/, f);
});

test("the runner's job hook copy refuses forks and other workflows", () => {
  const hook = fs.readFileSync(path.join(ROOT, "tools", "pcq", "gh-runner", "job-started.ps1"), "utf8");
  for ( const s of ["thebadman7824/wodx", "pc-gates.yml", "head.repo.full_name", "pull_request", "workflow_dispatch", "exit 1"] ) assert.ok(hook.includes(s), s);
});

test("B7331: gate jobs for a PR's older commits are closed or cancelled", async () => {
  const {staleJobs, marker} = await import("../pcq/pr-gates.mjs");
  const head = "a".repeat(40), old = "b".repeat(40), older = "c".repeat(40);
  const open = [
    {number: 1, title: `PC job: gates touched ${marker(7, head)}`, labels: []},
    {number: 2, title: `PC job: gates touched ${marker(7, old)}`, labels: [{name: "pc-running"}]},
    {number: 3, title: `PC job: gates touched ${marker(7, older)}`, labels: []},
    {number: 4, title: `PC job: gates touched ${marker(8, old)}`, labels: [{name: "pc-running"}]},
    {number: 5, title: `PC job: gates touched ${marker(7, "d".repeat(40))}`, labels: [{name: "pc-running"}, {name: "pc-cancel"}]},
    {number: 6, title: `PC job: gates touched ${marker(70, old)}`, labels: []}];
  const s = staleJobs(open, 7, head);
  assert.deepEqual(s.close.map(i => i.number), [3], "the unstarted older job is closed; the head's own and other PRs' are left");
  assert.deepEqual(s.cancel.map(i => i.number), [2], "the running older job is cancelled once");
});

test("B7332: only the train's own commits keep a pull request in the train", async () => {
  const {isTrainPush} = await import("../pcq/pr-gates.mjs");
  assert.equal(isTrainPush(["Merge main into claude/x (merge train)\n\nMerge-Train: yes", "Merge train: carry 2 file review(s) over the merge with main", "Stamp versions, changelogs and decisions for merge\n\nMerge-Train: yes"]), true);
  assert.equal(isTrainPush(["Stamp versions, changelogs and decisions for merge\n\nMerge-Train: yes"]), true, "a stamp-only train push");
  assert.equal(isTrainPush(["Merge main into claude/x (merge train)", "Stamp versions, changelogs and decisions for merge"]), true, "older train commits, before the trailer");
  assert.equal(isTrainPush(["Review PENDING-REVIEW again after merging main"]), false, "PR 1995 at 11:12Z");
  assert.equal(isTrainPush(["Stamp versions, changelogs and decisions for merge"]), false, "a thread's own stamp");
  assert.equal(isTrainPush(["Merge main into claude/x (merge train)", "Fix a test"]), false, "a thread commit after the train's");
  assert.equal(isTrainPush([]), false);
});

test("B7332: the workflow hands the script the head before the push", () => {
  const wf = fs.readFileSync(path.join(ROOT, ".github", "workflows", "pc-gates.yml"), "utf8");
  assert.match(wf, /BEFORE_SHA: \$\{\{ github\.event\.before \}\}/);
  const train = fs.readFileSync(path.join(ROOT, "tools", "pcq", "train.mjs"), "utf8");
  assert.equal((train.match(/Merge-Train: yes/g) ?? []).length >= 2, true, "the train marks its merge and its stamp");
});
test("B7390: a push made while the merge-train label was off does not eject", async () => {
  const {labelledBefore} = await import("../pcq/pr-gates.mjs");
  const ev = (event, at) => ({event, label: {name: "merge-train"}, created_at: at});
  // PR 1880, 18 Nov: label off, push 15:37:30, label on 15:37:41; the workflow ran after the label went back on
  const pr1880 = [ev("labeled", "2026-11-18T11:26:04Z"), ev("unlabeled", "2026-11-18T15:36:50Z"), ev("labeled", "2026-11-18T15:37:41Z")];
  assert.equal(labelledBefore(pr1880, "2026-11-18T15:37:30Z"), false);
  // PR 1995: label on 11:11:47, thread pushed 11:12:42 while labelled
  const pr1995 = [ev("unlabeled", "2026-11-18T11:10:21Z"), ev("labeled", "2026-11-18T11:11:47Z")];
  assert.equal(labelledBefore(pr1995, "2026-11-18T11:12:42Z"), true);
  assert.equal(labelledBefore(pr1995, null), true, "no push time: counts as labelled, as before");
  assert.equal(labelledBefore([], "2026-11-18T11:12:42Z"), false, "never labelled");
  assert.equal(labelledBefore([{event: "labeled", label: {name: "urgent"}, created_at: "2026-11-18T10:00:00Z"}], "2026-11-18T11:00:00Z"), false, "other labels do not count");
});

test("B7390: the workflow passes the push time", () => {
  const wf = fs.readFileSync(path.join(ROOT, ".github", "workflows", "pc-gates.yml"), "utf8");
  assert.match(wf, /EVENT_AT: \$\{\{ github\.event\.pull_request\.updated_at \}\}/);
  const src = fs.readFileSync(path.join(ROOT, "tools", "pcq", "pr-gates.mjs"), "utf8");
  assert.match(src, /labelledBefore\(events, pushedAt\)/);
});