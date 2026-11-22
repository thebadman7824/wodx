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
test("B7442: the last run's result is read from its comment, and only a clean one counts", async () => {
  const {jobResult} = await import("../pcq/pr-gates.mjs");
  const body = "**Failed** in 54 min, 3 gates shared over lanes 2, 3.\n\nLane 2, exit 1:\n```\ngatea: 3/3 passed [1 setting(s) put back]\ngateb: 1/3 passed; failed: x\ngatec: ERROR boom\ngated: 0/0 passed\n```";
  assert.deepEqual(jobResult(body), {passed: false, failing: ["gateb", "gatec", "gated"]});
  assert.deepEqual(jobResult("**Passed** in 9 min, 1 gates over lanes 2.\ngatea: 3/3 passed"), {passed: true, failing: []});
  assert.equal(jobResult("**Failed** in 54 min, 307 gates shared over lanes 2.\n\nLane 2, exit fault:\nRunner error on lane 2: x"), null, "a lane fault");
  assert.equal(jobResult(`${body}\n\n(cut: 900 more characters are in the runner log on the PC)`), null, "a cut comment may hide gate lines");
  assert.equal(jobResult("Started 2026-11-18T11:31Z on lane(s) 2"), null);
  assert.equal(jobResult("**Cancelled** after 3 min"), null);
});

test("B7442: only files the branch itself changed since the last run count as its own", async () => {
  const {ownChanges} = await import("../pcq/pr-gates.mjs");
  const files = {
    prior: {"modules/a/x.mjs": "old", "modules/b/y.mjs": "b1", "modules/c/z.mjs": "c-own", "modules/d/v.json": '{"version":"1.0.0"}'},
    head: {"modules/a/x.mjs": "main-new", "modules/b/y.mjs": "b-own-2", "modules/c/z.mjs": "c-own+main", "modules/d/v.json": '{"version":"1.0.1"}'},
    "origin/main": {"modules/a/x.mjs": "main-new", "modules/b/y.mjs": "b1", "modules/c/z.mjs": "c-main", "modules/d/v.json": '{"version":"1.0.0"}'},
  };
  const show = (ref, f) => files[ref]?.[f] ?? null;
  const norm = t => t.replace(/"version":"[^"]+"/, '"version":"x"');
  const names = Object.keys(files.head);
  // a: main's change, b: the branch's own edit, c: both (counted as its own), d: a version stamp only
  assert.deepEqual(ownChanges(names, show, {prior: "prior", head: "head", norm}), ["modules/b/y.mjs", "modules/c/z.mjs"]);
  assert.deepEqual(ownChanges(["modules/a/x.mjs", "modules/d/v.json"], show, {prior: "prior", head: "head", norm}), []);
});

test("B7442: a since job is a touched run with --base, and its status says so", async () => {
  const {validate, gateArgs, gateStatusFor} = await import("../pcq/jobs.mjs");
  const sha = "a".repeat(40), since = "b".repeat(40);
  const ok = validate({kind: "gates", touched: true, since, gates: ["gateb"], ref: sha}, ["2", "3"]);
  assert.ok(ok.job, ok.error);
  assert.match(validate({kind: "gates", gates: ["gateb"], since}, ["2"]).error, /since must be/);
  assert.match(validate({kind: "gates", touched: true, since: "abc"}, ["2"]).error, /since must be/);
  const a = gateArgs(ok.job, 2, 0, 1, "r.txt");
  assert.deepEqual(a.slice(0, 4), ["gateb", "--touched", "--base", since]);
  const st = gateStatusFor(ok.job, [{code: 0, sha, text: "gateb: 2/2 passed"}], true);
  assert.equal(st.body.state, "success");
  assert.match(st.body.description, /touched since bbbbbbbb/);
});

test("B7442: pr-gates and the runner pass since through to run-gate", () => {
  const pg = fs.readFileSync(new URL("../pcq/pr-gates.mjs", import.meta.url), "utf8");
  assert.match(pg, /"--touched", \.\.\.\(narrowed \? \["--since", since\.sha\] : \[\]\)/);
  const rn = fs.readFileSync(new URL("../pcq/runner.mjs", import.meta.url), "utf8");
  assert.match(rn, /job\.since \? \["--base", job\.since\]/);
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
test("a train push that merges main in is the train's own, though main's commits come with it (B7430)", async () => {
  const {addedByPush, isTrainPush} = await import("../pcq/pr-gates.mjs");
  const c = (sha, message) => ({sha, commit: {message}});
  // PR 2051, 18 Nov 15:55Z: main's commits, then the train's merge, review carry-over and stamp
  const main = [c("m1", "Merge pull request #2065 (urgent label)"), c("m2", "Stamp versions, changelogs and decisions for merge"), c("m3", "File reviews carried over the merge with main (B7420)")];
  const push = [...main, c("t1", "Merge main into claude/project-thread-wdrmjd (merge train)\n\nMerge-Train: yes"),
    c("t2", "Merge train: carry 1 file review(s) over the merge with main"), c("t3", "Stamp versions, changelogs and decisions for merge\n\nMerge-Train: yes")];
  assert.equal(isTrainPush(push.map(x => x.commit.message)), false, "the old check counted main's commits as from outside");
  assert.deepEqual(addedByPush(push, main).length, 3);
  assert.equal(isTrainPush(addedByPush(push, main)), true);
  // a thread commit pushed with a merge of main still counts as from outside
  assert.equal(isTrainPush(addedByPush([...push, c("x1", "Fix a test")], main)), false);
  assert.equal(isTrainPush(addedByPush([...main, c("x2", "Merge branch 'main' into claude/x")], main)), false, "a thread's own merge of main");
  assert.deepEqual(addedByPush(push, null).length, 6, "no main list: every commit counts, as before");
});
