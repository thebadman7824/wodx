/* B7202: the merge train. Pull requests labelled merge-train merge one at a time, the front one brought up to date
   with main, stamped and gated fresh, the rest left alone. */
import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {decide, line, statusOf, checkOf, othersFailed, isFrontJob, step, prepare, mergeFailure, redact, setupFault, TRAIN_LABEL, URGENT_LABEL} from "../pcq/train.mjs";

const H = 3600e3;
const ready = {draft: false, mergeable: true, behind: 0, fragments: 0, ownBranch: true, checks: "success", mergeRules: "success", gates: "success", frontFor: 0};

test("decide: conflict leaves, draft is marked ready, behind or unstamped is prepared, green merges", () => {
  assert.equal(decide(ready).action, "merge");
  assert.equal(decide({...ready, mergeable: false}).action, "leave");
  assert.equal(decide({...ready, ownBranch: false}).action, "leave");
  assert.equal(decide({...ready, draft: true}).action, "ready");
  assert.equal(decide({...ready, mergeable: null}).action, "wait");
  assert.equal(decide({...ready, behind: 2}).action, "prepare");
  assert.equal(decide({...ready, fragments: 3}).action, "prepare");
  assert.match(decide({...ready, behind: 2, fragments: 1}).why, /behind main by 2, 1 release note/);
  assert.equal(decide({...ready, checks: "failure"}).action, "leave");
  assert.equal(decide({...ready, mergeRules: "pending", gates: "failure"}).action, "leave", "failed gates leave even while the merge rules wait");
  assert.equal(decide({...ready, mergeRules: "pending", gates: "pending"}).action, "wait");
  assert.equal(decide({...ready, mergeRules: "pending", gates: null, frontFor: 4 * H}).action, "leave", "no result in 3 hours lets the line move");
  assert.equal(decide({...ready, mergeRules: "pending", frontFor: 4 * H}, {maxHours: 6}).action, "wait");
  // B7203: merge rules red only on the gate rule while the head's fresh gate run has not reported is a wait (PR 1880)
  const gateOnly = {...ready, mergeRules: "failure", mergeRulesWhy: "Not ready: gate result", gates: null};
  assert.equal(decide(gateOnly).action, "wait");
  assert.equal(decide({...gateOnly, gates: "pending"}).action, "wait");
  assert.equal(decide({...gateOnly, gates: "failure"}).action, "leave", "the fresh run failed: out");
  assert.equal(decide({...gateOnly, frontFor: 4 * H}).action, "leave", "no gate result in 3 hours: out");
  assert.equal(decide({...gateOnly, mergeRulesWhy: "Not ready: gate result, file review"}).action, "leave", "another rule broken: out");
  assert.equal(decide({...ready, gates: null}).action, "merge", "a change that needs no gate merges on checks and merge rules alone");
});

test("B7208: checks red only because the merge rules job waits on the gate result is a wait (PR 1848, 15:34Z)", () => {
  const gateOnly = {...ready, mergeRules: "failure", mergeRulesWhy: "Not ready: gate result", gates: null, checks: "failure"};
  assert.equal(decide({...gateOnly, otherChecksFailed: false}).action, "wait");
  assert.equal(decide({...gateOnly, otherChecksFailed: true}).action, "leave", "a real job failed: out");
  assert.equal(decide({...gateOnly}).action, "leave", "unknown other jobs with red checks: out, as before");
  assert.equal(decide({...gateOnly, otherChecksFailed: false, frontFor: 4 * H}).action, "leave");
  assert.equal(decide({...ready, checks: "failure", otherChecksFailed: false}).action, "leave", "no gate wait: red checks still put it out");
  const run = (name, conclusion, at = "2026-11-17T15:00:00Z") => ({name, status: "completed", conclusion, started_at: at});
  assert.equal(othersFailed([run("checks", "failure"), run("merge rules", "failure"), run("harness 1", "success"), run("quality", "success"), run("reject", "skipped")]), false);
  assert.equal(othersFailed([run("checks", "failure"), run("merge rules", "failure"), run("harness 2", "failure")]), true);
  assert.equal(othersFailed([run("harness 2", "failure", "2026-11-17T14:00:00Z"), run("harness 2", "success", "2026-11-17T15:00:00Z")]), false, "a rerun that passed counts");
});

test("the line is oldest label first; statuses and check runs read the newest", () => {
  assert.deepEqual(line([{number: 9, labelledAt: 30}, {number: 4, labelledAt: 50}, {number: 7, labelledAt: 30}]).map(p => p.number), [7, 9, 4]);
  assert.equal(statusOf([{context: "wodx/gates", state: "failure"}, {context: "wodx/gates", state: "success"}], "wodx/gates"), "failure");
  assert.equal(statusOf([{context: "wodx/gates", state: "error"}], "wodx/gates"), "failure");
  assert.equal(statusOf([], "wodx/gates"), null);
  const runs = [{name: "checks", status: "completed", conclusion: "failure", started_at: "2026-11-17T10:00:00Z"}, {name: "checks", status: "in_progress", started_at: "2026-11-17T11:00:00Z"}];
  assert.equal(checkOf(runs, "checks"), "pending", "the rerun counts, not the old failure");
  assert.equal(checkOf([{name: "checks", status: "completed", conclusion: "success"}], "checks"), "success");
  assert.ok(isFrontJob("PC job: gates touched [PR #1597 f698174c38e8]", 1597));
  assert.ok(!isFrontJob("PC job: gates touched [PR #15970 f698174c38e8]", 1597));
  assert.ok(!isFrontJob("PC job: gates touched [PR #1597 f698]", null));
});

/** A mock GitHub with two labelled pull requests; #20 was labelled first. */
function mockGh(over = {}) {
  const calls = [];
  const pr = n => ({number: n, draft: false, mergeable: true, node_id: `N${n}`, user: {login: "thebadman7824"},
    head: {sha: `h${n}`, ref: `claude/b${n}`, repo: {full_name: "thebadman7824/wodx"}}, base: {ref: "main", repo: {full_name: "thebadman7824/wodx"}}, ...(over[n] ?? {})});
  const gh = async (method, url, body) => {
    calls.push(`${method} ${url}`);
    let m;
    if ( url.startsWith("/issues?") ) return [{number: 21, pull_request: {}, created_at: "2026-11-17T09:00:00Z", labels: over.labels21 ?? [{name: TRAIN_LABEL}]}, {number: 20, pull_request: {}, created_at: "2026-11-17T10:00:00Z", labels: [{name: TRAIN_LABEL}]}, {number: 5}];
    if ( (m = /^\/issues\/(\d+)\/events/.exec(url)) ) return [{event: "labeled", label: {name: TRAIN_LABEL}, created_at: m[1] === "20" ? "2026-11-17T11:00:00Z" : "2026-11-17T12:00:00Z"}];
    if ( (m = /^\/pulls\/(\d+)$/.exec(url)) ) return pr(+m[1]);
    if ( url.startsWith("/compare/") ) return {behind_by: over.behind ?? 0};
    if ( url.includes("/statuses") ) return over.statuses ?? [{context: "wodx/merge-rules", state: "success"}, {context: "wodx/gates", state: "success"}];
    if ( url.includes("/check-runs") ) return {check_runs: over.runs ?? [{name: "checks", status: "completed", conclusion: "success"}]};
    if ( url.startsWith("/contents/changes?") ) return [{type: "file", name: "README.md"}];
    return {};
  };
  return {gh, calls};
}

test("step merges the front when it is green and leaves the rest alone", async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "train-"));
  const {gh, calls} = mockGh();
  const r = await step({gh, home, apply: true});
  assert.equal(r.front, 20, "the oldest label is the front");
  assert.deepEqual(r.line, [20, 21]);
  assert.equal(r.action, "merge");
  assert.ok(calls.includes("PUT /pulls/20/merge"));
  assert.ok(!calls.some(c => /pulls\/21\/merge|update-branch/.test(c)), "the second in line is not touched");
});

test("B7420: an urgent pull request goes to the front, in label order among the urgent ones", async () => {
  assert.deepEqual(line([{number: 9, labelledAt: 30}, {number: 4, labelledAt: 50, urgent: true}, {number: 7, labelledAt: 60, urgent: true}]).map(p => p.number), [4, 7, 9]);
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "train-"));
  const {gh, calls} = mockGh({labels21: [{name: TRAIN_LABEL}, {name: URGENT_LABEL}]});
  const r = await step({gh, home, apply: true});
  assert.equal(r.front, 21, "the urgent one is the front though #20 was labelled first");
  assert.deepEqual(r.line, [21, 20]);
  assert.deepEqual(r.urgent, [21]);
  assert.ok(calls.includes("PUT /pulls/21/merge") && !calls.includes("PUT /pulls/20/merge"));
});

test("step waits on a head whose merge rules fail only for its pending gate run (PR 1880)", async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "train-"));
  const m = mockGh({statuses: [{context: "wodx/merge-rules", state: "failure", description: "Not ready: gate result"}]});
  const r = await step({gh: m.gh, home, apply: true});
  assert.equal(r.action, "wait");
  assert.ok(!m.calls.some(c => /^(PUT|POST|DELETE)/.test(c)), "nothing posted, label kept");
});

test("step takes a red front out of the train and marks a draft ready", async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "train-"));
  const red = mockGh({runs: [{name: "checks", status: "completed", conclusion: "failure"}]});
  const r = await step({gh: red.gh, home, apply: true});
  assert.equal(r.action, "leave");
  assert.ok(red.calls.includes(`DELETE /issues/20/labels/${TRAIN_LABEL}`));
  assert.ok(red.calls.includes("POST /issues/20/comments"));
  assert.ok(!red.calls.includes("PUT /pulls/20/merge"));
  const draft = mockGh({20: {draft: true}});
  let asked = null;
  const d = await step({gh: draft.gh, home, apply: true, graphql: async (q, v) => { asked = v; return {}; }});
  assert.equal(d.action, "ready");
  assert.deepEqual(asked, {id: "N20"});
  const dry = mockGh();
  await step({gh: dry.gh, home, apply: false});
  assert.ok(!dry.calls.some(c => /^(PUT|POST|DELETE)/.test(c)), "without apply it changes nothing");
});

test("prepare merges main into the branch, stamps, and pushes with a lease", async () => {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), "train-git-"));
  const sh = (cwd, ...a) => { const r = spawnSync("git", a, {cwd, encoding: "utf8"}); if ( r.status ) throw new Error(`git ${a.join(" ")}: ${r.stderr}`); return r.stdout.trim(); };
  const origin = path.join(t, "origin.git"), work = path.join(t, "work"), clone = path.join(t, "runner"), home = path.join(t, "home");
  fs.mkdirSync(home);
  sh(t, "init", "-q", "--bare", "-b", "main", origin);
  sh(t, "clone", "-q", origin, work);
  for ( const c of [work] ) { sh(c, "config", "user.email", "t@example.com"); sh(c, "config", "user.name", "t"); }
  fs.mkdirSync(path.join(work, "tools", "release"), {recursive: true});
  // a stand-in for merge-stamp: commits a stamp file when a note waits under changes/
  fs.writeFileSync(path.join(work, "tools", "release", "merge-stamp.mjs"), `import fs from "node:fs"; import {execSync} from "node:child_process";
if ( fs.existsSync("changes/m/note.md") ) { fs.rmSync("changes/m/note.md"); fs.writeFileSync("stamped.txt", "1"); execSync("git add -A && git commit -q -m stamp"); console.log("Committed. Push"); }`);
  fs.writeFileSync(path.join(work, "a.txt"), "a");
  sh(work, "add", "-A"); sh(work, "commit", "-q", "-m", "base"); sh(work, "push", "-q", "origin", "main");
  sh(work, "checkout", "-q", "-b", "claude/x");
  fs.mkdirSync(path.join(work, "changes", "m"), {recursive: true});
  fs.writeFileSync(path.join(work, "changes", "m", "note.md"), "---\nbump: patch\n---\nx");
  fs.writeFileSync(path.join(work, "b.txt"), "b");
  sh(work, "add", "-A"); sh(work, "commit", "-q", "-m", "branch work"); sh(work, "push", "-q", "origin", "claude/x");
  const head = sh(work, "rev-parse", "HEAD");
  sh(work, "checkout", "-q", "main"); fs.writeFileSync(path.join(work, "m.txt"), "main moved"); sh(work, "add", "-A"); sh(work, "commit", "-q", "-m", "main moves"); sh(work, "push", "-q", "origin", "main");
  sh(t, "clone", "-q", origin, clone);
  sh(clone, "config", "user.email", "t@example.com"); sh(clone, "config", "user.name", "t");
  const git = async (argv, cwd) => spawnSync("git", argv, {cwd, encoding: "utf8"});
  const r = await prepare({git, home, repoRoot: clone}, "claude/x", head);
  assert.equal(r.error, undefined, r.error);
  assert.equal(r.did, "main merged in and release notes stamped");
  const tip = sh(origin, "rev-parse", "refs/heads/claude/x");
  assert.equal(tip, r.sha, "pushed");
  assert.equal(spawnSync("git", ["merge-base", "--is-ancestor", "main", tip], {cwd: origin}).status, 0, "the branch now holds main");
  assert.equal(sh(origin, "show", `${tip}:stamped.txt`), "1");
  // a thread that pushed meanwhile wins: the lease refuses the train's push
  sh(work, "checkout", "-q", "claude/x"); sh(work, "pull", "-q", "--no-rebase", "origin", "claude/x"); fs.writeFileSync(path.join(work, "c.txt"), "c"); sh(work, "add", "-A"); sh(work, "commit", "-q", "-m", "more"); sh(work, "push", "-q", "origin", "claude/x");
  sh(work, "checkout", "-q", "main"); fs.writeFileSync(path.join(work, "m2.txt"), "again"); sh(work, "add", "-A"); sh(work, "commit", "-q", "-m", "main again"); sh(work, "push", "-q", "origin", "main");
  const stale = await prepare({git, home, repoRoot: clone}, "claude/x", tip);
  assert.match(stale.error ?? "", /push to claude\/x was refused/);
  // a conflict with main is named, and the worktree is left clean
  sh(work, "checkout", "-q", "claude/x"); sh(work, "pull", "-q", "--no-rebase", "origin", "claude/x"); fs.writeFileSync(path.join(work, "a.txt"), "branch side"); sh(work, "add", "-A"); sh(work, "commit", "-q", "-m", "edit a"); sh(work, "push", "-q", "origin", "claude/x");
  const h2 = sh(work, "rev-parse", "HEAD");
  sh(work, "checkout", "-q", "main"); fs.writeFileSync(path.join(work, "a.txt"), "main side"); sh(work, "add", "-A"); sh(work, "commit", "-q", "-m", "edit a on main"); sh(work, "push", "-q", "origin", "main");
  const clash = await prepare({git, home, repoRoot: clone}, "claude/x", h2);
  assert.match(clash.error ?? "", /does not merge in cleanly/);
  assert.equal(spawnSync("git", ["status", "--porcelain"], {cwd: path.join(home, "train"), encoding: "utf8"}).stdout.trim(), "");
});

test("B7203: a file review is carried over a merge with main when the branch's own change is the same", async () => {
  const {hashOf} = await import("../release/merge-rules.mjs");
  const real = new URL("../release/merge-rules.mjs", import.meta.url).href;
  const t = fs.mkdtempSync(path.join(os.tmpdir(), "train-rev-"));
  const sh = (cwd, ...a) => { const r = spawnSync("git", a, {cwd, encoding: "utf8"}); if ( r.status ) throw new Error(`git ${a.join(" ")}: ${r.stderr}`); return r.stdout.trim(); };
  const origin = path.join(t, "o.git"), work = path.join(t, "w"), clone = path.join(t, "r"), home = path.join(t, "h");
  fs.mkdirSync(home);
  sh(t, "init", "-q", "--bare", "-b", "main", origin); sh(t, "clone", "-q", origin, work);
  sh(work, "config", "user.email", "t@example.com"); sh(work, "config", "user.name", "t");
  const put = (f, s) => { fs.mkdirSync(path.dirname(path.join(work, f)), {recursive: true}); fs.writeFileSync(path.join(work, f), s); };
  put("tools/release/merge-stamp.mjs", "");
  put("tools/release/merge-rules.mjs", `export {gitIn, branchReviews, hashOf, REVIEW_DIR} from ${JSON.stringify(real)};\n`);
  put("shared.txt", "one\ntwo\nthree\n"); put("other.txt", "x\n");
  sh(work, "add", "-A"); sh(work, "commit", "-q", "-m", "base"); sh(work, "push", "-q", "origin", "main");
  sh(work, "checkout", "-q", "-b", "claude/r");
  put("shared.txt", "one\ntwo\nthree\nbranch line\n"); put("other.txt", "x\nbranch\n");
  const review = [{file: "shared.txt", verdict: "working", how: "read in full; ran the tests", hash: hashOf("one\ntwo\nthree\nbranch line\n")},
    {file: "other.txt", verdict: "working", how: "read in full; ran the tests", hash: "stale0000000"}];
  put("docs/reviews/claude-r.jsonl", review.map(r => JSON.stringify(r)).join("\n") + "\n");
  sh(work, "add", "-A"); sh(work, "commit", "-q", "-m", "branch"); sh(work, "push", "-q", "origin", "claude/r");
  const head = sh(work, "rev-parse", "HEAD");
  sh(work, "checkout", "-q", "main"); put("shared.txt", "zero\none\ntwo\nthree\n"); put("other.txt", "main\nx\n");
  sh(work, "add", "-A"); sh(work, "commit", "-q", "-m", "main edits the shared files"); sh(work, "push", "-q", "origin", "main");
  sh(t, "clone", "-q", origin, clone); sh(clone, "config", "user.email", "t@example.com"); sh(clone, "config", "user.name", "t");
  const r = await prepare({git: async (argv, cwd) => spawnSync("git", argv, {cwd, encoding: "utf8"}), home, repoRoot: clone}, "claude/r", head);
  assert.equal(r.error, undefined, r.error);
  assert.match(r.did, /main merged in and 1 file review\(s\) carried over/);
  const lines = sh(origin, "show", `${r.sha}:docs/reviews/claude-r.jsonl`).split("\n").map(l => JSON.parse(l));
  const added = lines.slice(2);
  assert.equal(added.length, 1, "only the file whose verdict was current before the merge");
  assert.equal(added[0].file, "shared.txt");
  assert.equal(added[0].hash, hashOf("zero\none\ntwo\nthree\nbranch line\n"));
  assert.match(added[0].how, /^carried over by the merge train after main merged in: .*earlier check: read in full; ran the tests$/);
});

test("B7960 (#2121): a merge refused for a git fault is not a conflict; it names git's error and keeps the label", async () => {
  // pure: a real conflict, the unmerged paths alone, and the 19 Nov identity fault
  assert.equal(mergeFailure({status: 1, stdout: "Auto-merging a.txt\nCONFLICT (content): Merge conflict in a.txt\nAutomatic merge failed; fix conflicts and then commit the result.\n"}).conflict, true);
  assert.equal(mergeFailure({status: 1, stdout: ""}, "a.txt\n").conflict, true);
  const id = mergeFailure({status: 128, stderr: "Committer identity unknown\n\n*** Please tell me who you are.\n\nfatal: unable to auto-detect email address (got 'pc@host.(none)')\n"});
  assert.equal(id.conflict, false);
  assert.match(id.said, /unable to auto-detect email address/);
  assert.equal(id.setup, true, "a missing identity is the runner's fault");
  assert.equal(mergeFailure({status: 1}).said, "git exited 1");
  const unrelated = mergeFailure({status: 128, stderr: "fatal: refusing to merge unrelated histories\n"});
  assert.deepEqual([unrelated.conflict, unrelated.setup], [false, false], "unrelated histories are the branch's fault: it leaves, with git's words");
  assert.ok(setupFault("fatal: Unable to create 'C:/Users/Jane Doe/wodx/.git/index.lock': File exists."));
  assert.ok(!setupFault("error: Your local changes would be overwritten by merge"));
  assert.ok(!setupFault("Error: EACCES: permission denied, open 'modules/x/y.json'"), "a Node error from the branch's own files is not git's");
  assert.ok(!setupFault("not ok 3 - a test that says Permission denied"), "only git's own fatal and error lines count");

  // real git: a runner clone with no identity at all
  const t = fs.mkdtempSync(path.join(os.tmpdir(), "train-id-"));
  const sh = (cwd, ...a) => { const r = spawnSync("git", a, {cwd, encoding: "utf8"}); if ( r.status ) throw new Error(`git ${a.join(" ")}: ${r.stderr}`); return r.stdout.trim(); };
  const origin = path.join(t, "o.git"), work = path.join(t, "w"), clone = path.join(t, "r"), home = path.join(t, "h");
  fs.mkdirSync(home);
  sh(t, "init", "-q", "--bare", "-b", "main", origin); sh(t, "clone", "-q", origin, work);
  sh(work, "config", "user.email", "t@example.com"); sh(work, "config", "user.name", "t");
  fs.mkdirSync(path.join(work, "tools", "release"), {recursive: true});
  fs.writeFileSync(path.join(work, "tools", "release", "merge-stamp.mjs"), "");
  fs.writeFileSync(path.join(work, "a.txt"), "a");
  sh(work, "add", "-A"); sh(work, "commit", "-q", "-m", "base"); sh(work, "push", "-q", "origin", "main");
  sh(work, "checkout", "-q", "-b", "claude/id"); fs.writeFileSync(path.join(work, "b.txt"), "b");
  sh(work, "add", "-A"); sh(work, "commit", "-q", "-m", "branch"); sh(work, "push", "-q", "origin", "claude/id");
  const head = sh(work, "rev-parse", "HEAD");
  sh(work, "checkout", "-q", "main"); fs.writeFileSync(path.join(work, "m.txt"), "m"); sh(work, "add", "-A"); sh(work, "commit", "-q", "-m", "main moves"); sh(work, "push", "-q", "origin", "main");
  sh(t, "clone", "-q", origin, clone);
  sh(clone, "config", "user.useConfigOnly", "true");
  const env = {...process.env, GIT_CONFIG_GLOBAL: path.join(t, "none"), GIT_CONFIG_NOSYSTEM: "1"};
  for ( const k of ["GIT_AUTHOR_NAME", "GIT_AUTHOR_EMAIL", "GIT_COMMITTER_NAME", "GIT_COMMITTER_EMAIL", "EMAIL"] ) delete env[k];
  const logged = [];
  const git = async (argv, cwd) => spawnSync("git", argv, {cwd, encoding: "utf8", env});
  const r = await prepare({git, home, repoRoot: clone, log: s => logged.push(s)}, "claude/id", head);
  assert.equal(r.setup, true, r.error);
  assert.ok(logged.some(s => /identity|email|who you are/i.test(s)), logged.join("; "));
  assert.doesNotMatch(r.error, /does not merge in cleanly/);
  assert.match(r.error, /runner's git setup needs a fix/);
  assert.ok(logged.some(s => /git merge of main into claude\/id failed \(exit \d+\): .+/.test(s)), "git's own words are logged");
  assert.equal(sh(origin, "rev-parse", "refs/heads/claude/id"), head, "nothing pushed");
  assert.equal(spawnSync("git", ["status", "--porcelain"], {cwd: path.join(home, "train"), encoding: "utf8"}).stdout.trim(), "", "the worktree is left clean");

  // step: the pull request keeps its label, and the comment comes once per head
  const h2 = fs.mkdtempSync(path.join(os.tmpdir(), "train-"));
  const m = mockGh({behind: 3});
  const fake = async () => ({setup: true, error: "git on the runner could not merge main in, though nothing conflicts (fatal: x): the runner's git setup needs a fix"});
  const alerts = [], cleared = [];
  const hooks = {alert: async (k, t) => alerts.push(`${k}: ${t}`), recovered: async k => cleared.push(k)};
  const s1 = await step({gh: m.gh, home: h2, apply: true, batch: 1, prepare: fake, ...hooks});
  assert.deepEqual(alerts, ["train-git: the merge train cannot run git merges (runner setup fault)"], "the runner raises a pc-alert, since the whole line waits");
  assert.deepEqual(cleared, []);
  assert.equal(s1.action, "wait");
  assert.match(s1.why, /git setup needs a fix/);
  assert.ok(!m.calls.some(c => c.startsWith("DELETE")), "label kept");
  assert.equal(m.calls.filter(c => c === "POST /issues/20/comments").length, 1);
  await step({gh: m.gh, home: h2, apply: true, batch: 1, prepare: fake, ...hooks});
  assert.equal(m.calls.filter(c => c === "POST /issues/20/comments").length, 1, "no second comment for the same head");
  // once git works again the alert clears
  const okm = mockGh({behind: 3});
  await step({gh: okm.gh, home: h2, apply: true, batch: 1, prepare: async () => ({sha: "abcdef1234", did: "main merged in"}), ...hooks});
  assert.deepEqual(cleared, ["train-git"]);
  // git's words reach the public repo without addresses or local paths
  assert.equal(redact("fatal: unable to auto-detect email address (got 'pc@HOST.(none)') in C:\\Users\\pc\\wodx and /home/pc/x"), "fatal: unable to auto-detect email address (got '<address>(none)') in <path> and <path>");
  assert.equal(redact("fatal: Unable to create 'C:/Users/Jane Doe/wodx/.git/index.lock': File exists."), "fatal: Unable to create '<path>': File exists.");
  // a merge that fails for the branch's own reason, not a conflict, leaves with git's words
  const u = mockGh({behind: 3});
  const s4 = await step({gh: u.gh, home: fs.mkdtempSync(path.join(os.tmpdir(), "train-")), apply: true, batch: 1, prepare: async () => ({error: "git could not merge main in, though nothing conflicts (fatal: refusing to merge unrelated histories): fix the branch, push, then add the label again"})});
  assert.equal(s4.action, "leave");
  // a runner wait is capped: after maxHours on one head the pull request leaves, so a misread fault never holds the line for good
  const capHome = fs.mkdtempSync(path.join(os.tmpdir(), "train-"));
  const cap = mockGh({behind: 3});
  await step({gh: cap.gh, home: capHome, apply: true, batch: 1, prepare: fake});
  const st = JSON.parse(fs.readFileSync(path.join(capHome, "train-state.json"), "utf8"));
  assert.equal(st.setupHead, "h20");
  fs.writeFileSync(path.join(capHome, "train-state.json"), JSON.stringify({...st, setupSince: Date.now() - 4 * 3600e3}));
  const late = await step({gh: cap.gh, home: capHome, apply: true, batch: 1, prepare: fake});
  assert.equal(late.action, "leave");
  assert.match(late.why, /for over 3 hours/);
  // a real conflict still leaves, as before
  const c = mockGh({behind: 3});
  const s3 = await step({gh: c.gh, home: fs.mkdtempSync(path.join(os.tmpdir(), "train-")), apply: true, batch: 1, prepare: async () => ({error: "main does not merge in cleanly: merge main into the branch, fix the conflict, push, then add the label again"})});
  assert.equal(s3.action, "leave");
  assert.ok(c.calls.includes(`DELETE /issues/20/labels/${TRAIN_LABEL}`));
});

test("B7960: a stamp refused for the runner's missing identity keeps a level branch in the train", async () => {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), "train-st-"));
  const sh = (cwd, ...a) => { const r = spawnSync("git", a, {cwd, encoding: "utf8"}); if ( r.status ) throw new Error(`git ${a.join(" ")}: ${r.stderr}`); return r.stdout.trim(); };
  const origin = path.join(t, "o.git"), work = path.join(t, "w"), clone = path.join(t, "r"), home = path.join(t, "h");
  fs.mkdirSync(home);
  sh(t, "init", "-q", "--bare", "-b", "main", origin); sh(t, "clone", "-q", origin, work);
  sh(work, "config", "user.email", "t@example.com"); sh(work, "config", "user.name", "t");
  fs.mkdirSync(path.join(work, "tools", "release"), {recursive: true});
  // a stand-in for merge-stamp that commits, as the real one does
  fs.writeFileSync(path.join(work, "tools", "release", "merge-stamp.mjs"), `import fs from "node:fs"; import {execSync} from "node:child_process";
fs.writeFileSync("stamped.txt", "1"); execSync("git add -A && git commit -q -m stamp", {stdio: "inherit"}); console.log("Committed.");`);
  fs.writeFileSync(path.join(work, "a.txt"), "a");
  sh(work, "add", "-A"); sh(work, "commit", "-q", "-m", "base"); sh(work, "push", "-q", "origin", "main");
  sh(work, "checkout", "-q", "-b", "claude/st"); fs.writeFileSync(path.join(work, "b.txt"), "b");
  sh(work, "add", "-A"); sh(work, "commit", "-q", "-m", "branch"); sh(work, "push", "-q", "origin", "claude/st");
  const head = sh(work, "rev-parse", "HEAD");
  sh(t, "clone", "-q", origin, clone); sh(clone, "config", "user.useConfigOnly", "true");
  const env = {...process.env, GIT_CONFIG_GLOBAL: path.join(t, "none"), GIT_CONFIG_NOSYSTEM: "1"};
  for ( const k of ["GIT_AUTHOR_NAME", "GIT_AUTHOR_EMAIL", "GIT_COMMITTER_NAME", "GIT_COMMITTER_EMAIL", "EMAIL"] ) delete env[k];
  const saved = {...process.env};
  Object.assign(process.env, {GIT_CONFIG_GLOBAL: env.GIT_CONFIG_GLOBAL, GIT_CONFIG_NOSYSTEM: "1"});
  for ( const k of ["GIT_AUTHOR_NAME", "GIT_AUTHOR_EMAIL", "GIT_COMMITTER_NAME", "GIT_COMMITTER_EMAIL", "EMAIL"] ) delete process.env[k];
  try {
    const r2 = await prepare({git: async (argv, cwd) => spawnSync("git", argv, {cwd, encoding: "utf8", env}), home, repoRoot: clone}, "claude/st", head);
    assert.equal(r2.setup, true, r2.error);
    assert.match(r2.error, /could not commit the stamp/);
  } finally { for ( const k of Object.keys(process.env) ) if ( !(k in saved) ) delete process.env[k]; Object.assign(process.env, saved); }
});
