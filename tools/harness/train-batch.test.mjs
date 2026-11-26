/* B7445: merge-train batches. Up to five green pull requests from the front of the line are merged onto main in one
   batch pull request, stamped once and gated once; when it merges each member's head is on main. A red batch is
   closed and the next one takes half as many, down to the front alone. */
import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {eligible, buildBatch, step, adoptBatch, BATCH_BRANCH, BATCH_MAX, TRAIN_LABEL} from "../pcq/train.mjs";

const green = {ownBranch: true, draft: false, mergeable: true, checks: "success", gates: null, mergeRules: "pending", mergeRulesWhy: ""};

test("only green pull requests that merge cleanly with main may join a batch", () => {
  assert.equal(eligible(green).ok, true);
  assert.equal(eligible({...green, mergeRules: "failure", mergeRulesWhy: "Not ready: gate result"}).ok, true, "a gate result still to come is what the batch brings");
  assert.match(eligible({...green, mergeRules: "failure", mergeRulesWhy: "Not ready: file review, gate result"}).why, /merge rules fail/);
  assert.match(eligible({...green, checks: "pending"}).why, /checks are pending/);
  const waits = {...green, checks: "failure", mergeRules: "failure", mergeRulesWhy: "Not ready: gate result"};
  assert.equal(eligible({...waits, otherChecksFailed: false}).ok, true, "checks red only because the merge rules job waits on the gates (PR 1880)");
  assert.match(eligible({...waits, otherChecksFailed: true}).why, /checks are failure/);
  assert.match(eligible({...green, checks: "failure"}).why, /checks are failure/);
  assert.match(eligible({...green, gates: "failure"}).why, /gates failed/);
  assert.match(eligible({...green, mergeable: false}).why, /conflict/);
  assert.match(eligible({...green, mergeable: null}).why, /not worked out/);
  assert.match(eligible({...green, draft: true}).why, /draft/);
  assert.match(eligible({...green, urgent: true}).why, /urgent/);
  assert.match(eligible({...green, ownBranch: false}).why, /owner/);
});

const sh = (cwd, ...a) => { const r = spawnSync("git", a, {cwd, encoding: "utf8"}); if ( r.status ) throw new Error(`git ${a.join(" ")}: ${r.stderr}`); return r.stdout.trim(); };

test("buildBatch merges each member's head onto main unchanged, carries reviews, stamps once and leaves out a clash", async () => {
  const {hashOf} = await import("../release/merge-rules.mjs");
  const real = new URL("../release/merge-rules.mjs", import.meta.url).href;
  const t = fs.mkdtempSync(path.join(os.tmpdir(), "train-batch-"));
  const origin = path.join(t, "o.git"), work = path.join(t, "w"), clone = path.join(t, "r"), home = path.join(t, "h");
  fs.mkdirSync(home);
  sh(t, "init", "-q", "--bare", "-b", "main", origin); sh(t, "clone", "-q", origin, work);
  sh(work, "config", "user.email", "t@example.com"); sh(work, "config", "user.name", "t");
  const put = (f, s) => { fs.mkdirSync(path.dirname(path.join(work, f)), {recursive: true}); fs.writeFileSync(path.join(work, f), s); };
  // a stand-in for merge-stamp: every waiting note becomes one line of stamped.txt, in one commit
  put("tools/release/merge-stamp.mjs", `import fs from "node:fs"; import {execSync} from "node:child_process";
const d = "changes/m"; const notes = fs.existsSync(d) ? fs.readdirSync(d) : [];
if ( notes.length ) { fs.writeFileSync("stamped.txt", notes.sort().join("\\n")); fs.rmSync(d, {recursive: true}); execSync("git add -A && git commit -q -m 'Stamp versions, changelogs and decisions for merge'"); console.log("Committed. Push"); }`);
  put("tools/release/merge-rules.mjs", `export {gitIn, branchReviews, hashOf, REVIEW_DIR} from ${JSON.stringify(real)};\n`);
  put("shared.txt", "one\ntwo\n"); put("a.txt", "a\n");
  sh(work, "add", "-A"); sh(work, "commit", "-q", "-m", "base"); sh(work, "push", "-q", "origin", "main");
  const branch = (name, files) => {
    sh(work, "checkout", "-q", "-B", name, "main");
    for ( const [f, s] of Object.entries(files) ) put(f, s);
    sh(work, "add", "-A"); sh(work, "commit", "-q", "-m", `work on ${name}`); sh(work, "push", "-q", "-f", "origin", name);
    return sh(work, "rev-parse", "HEAD");
  };
  const ha = branch("claude/a", {"a.txt": "a\nfrom a\n", "changes/m/a.md": "a"});
  const shared = "one\ntwo\nfrom b\n";
  const hb = branch("claude/b", {"shared.txt": shared, "changes/m/b.md": "b",
    "docs/reviews/claude-b.jsonl": JSON.stringify({file: "shared.txt", verdict: "working", how: "read in full; ran the tests", hash: hashOf(shared)}) + "\n"});
  const hc = branch("claude/c", {"a.txt": "a\nfrom c\n"});
  // main moves on the file b changes, so b's review no longer matches the file as the batch has it
  sh(work, "checkout", "-q", "main"); put("shared.txt", "zero\none\ntwo\n"); sh(work, "add", "-A"); sh(work, "commit", "-q", "-m", "main moves"); sh(work, "push", "-q", "origin", "main");
  sh(t, "clone", "-q", origin, clone); sh(clone, "config", "user.email", "t@example.com"); sh(clone, "config", "user.name", "t");
  const ctx = {git: async (argv, cwd) => spawnSync("git", argv, {cwd, encoding: "utf8"}), home, repoRoot: clone};
  const members = [{number: 1, ref: "claude/a", head: ha}, {number: 2, ref: "claude/c", head: hc}, {number: 3, ref: "claude/b", head: hb}];
  const r = await buildBatch(ctx, members);
  assert.equal(r.error, undefined, r.error);
  assert.deepEqual(r.members.map(m => m.number), [1, 3]);
  assert.deepEqual(r.skipped.map(s => s.number), [2]);
  assert.match(r.skipped[0].why, /changes a\.txt, as an earlier one in the batch does/);
  assert.equal(r.did, "#1, #3 merged onto main, 1 file review(s) carried over, release notes stamped once");
  const tip = sh(origin, "rev-parse", `refs/heads/${BATCH_BRANCH}`);
  assert.equal(tip, r.sha, "pushed to the batch branch");
  for ( const h of [ha, hb, sh(origin, "rev-parse", "main")] ) assert.equal(spawnSync("git", ["merge-base", "--is-ancestor", h, tip], {cwd: origin}).status, 0, "each head and main are in the batch unchanged");
  assert.equal(sh(origin, "show", `${tip}:stamped.txt`), "a.md\nb.md", "one stamp for both notes");
  const carried = sh(origin, "show", `${tip}:docs/reviews/claude-b.jsonl`).split("\n").map(l => JSON.parse(l));
  assert.equal(carried.length, 2);
  assert.equal(carried[1].hash, hashOf("zero\none\ntwo\nfrom b\n"));
  assert.match(carried[1].how, /^carried over by the merge train after the merge into the batch: /);
  // main moves again: the batch is built afresh on it, replacing the old batch head (the lease names it)
  put("other.txt", "x"); sh(work, "add", "-A"); sh(work, "commit", "-q", "-m", "main again"); sh(work, "push", "-q", "origin", "main");
  const again = await buildBatch(ctx, r.members, {max: 2, lease: tip});
  assert.equal(again.error, undefined, again.error);
  assert.notEqual(again.sha, tip);
  assert.equal(sh(origin, "rev-parse", `refs/heads/${BATCH_BRANCH}`), again.sha);
  // a stale lease is refused (main moves once more first: built in the same second from the same commits, the batch
  // would be the very commit already pushed, and git takes a push of what the branch already holds as done)
  put("other.txt", "y"); sh(work, "add", "-A"); sh(work, "commit", "-q", "-m", "main once more"); sh(work, "push", "-q", "origin", "main");
  const stale = await buildBatch(ctx, r.members, {max: 2, lease: tip});
  assert.match(stale.error ?? "", /push to claude\/merge-train-batch was refused/);
  // one member alone is no batch: nothing pushed
  const one = await buildBatch(ctx, [members[0], members[1]]);
  assert.deepEqual([one.members.length, one.sha], [1, undefined]);
  assert.equal(sh(origin, "rev-parse", `refs/heads/${BATCH_BRANCH}`), again.sha);
});

/** A mock GitHub: #20, #21 and #22 in the line (that order), each behind main and green on its own head. */
function mockGh(over = {}) {
  const calls = [], bodies = {};
  const pr = n => ({number: n, draft: false, mergeable: true, node_id: `N${n}`, user: {login: "thebadman7824"}, merged: (over.merged ?? []).includes(n),
    head: {sha: over.heads?.[n] ?? `h${n}`, ref: `claude/b${n}`, repo: {full_name: "thebadman7824/wodx"}}, base: {ref: "main", repo: {full_name: "thebadman7824/wodx"}}});
  const batch = () => ({number: 900, state: over.batchClosed ? "closed" : "open", merged: !!over.batchMerged, mergeable: true, body: over.batchBody ?? "",
    head: {sha: "hb900", ref: BATCH_BRANCH}, base: {ref: "main"}});
  const gh = async (method, url, body) => {
    calls.push(`${method} ${url}`);
    if ( body ) bodies[`${method} ${url}`] = body;
    let m;
    if ( url.startsWith("/issues?") ) return (over.line ?? [20, 21, 22]).map(n => ({number: n, pull_request: {}, created_at: "2026-11-18T09:00:00Z", labels: [{name: TRAIN_LABEL}]}));
    if ( (m = /^\/issues\/(\d+)\/events/.exec(url)) ) return [{event: "labeled", label: {name: TRAIN_LABEL}, created_at: `2026-11-18T1${m[1] - 20}:00:00Z`}];
    if ( url.startsWith("/pulls?") ) return over.openBatch ? [batch()] : [];
    if ( url === "/pulls" && method === "POST" ) return {number: 900};
    if ( url === "/pulls/900" ) return batch();
    if ( (m = /^\/pulls\/(\d+)$/.exec(url)) ) return pr(+m[1]);
    if ( url.startsWith("/compare/") ) return {behind_by: url.includes("hb900") ? (over.batchBehind ?? 0) : 2};
    if ( url.includes("hb900/statuses") ) return over.batchStatuses ?? [{context: "wodx/merge-rules", state: "success"}, {context: "wodx/gates", state: "success"}];
    if ( url.includes("/statuses") ) return [{context: "wodx/merge-rules", state: "pending"}];
    if ( url.includes("/check-runs") ) return {check_runs: [{name: "checks", status: "completed", conclusion: "success"}]};
    if ( url.startsWith("/contents/changes?") ) return [];
    return {};
  };
  return {gh, calls, bodies};
}
const stateOf = home => JSON.parse(fs.readFileSync(path.join(home, "train-state.json"), "utf8"));

test("step batches the front with the green ones behind it, merges the batch, then tells each member", async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "train-"));
  let asked = null;
  const build = async (ctx, cands, opt) => { asked = {cands: cands.map(c => c.number), max: opt.max};
    return {sha: "hb900", members: cands.slice(0, 2), skipped: [{number: 22, why: "it changes x.txt, as an earlier one in the batch does"}], did: "#20, #21 merged onto main, release notes stamped once"}; };
  const dry = mockGh();
  const plan = await step({gh: dry.gh, home, apply: false, build});
  assert.equal(plan.action, "batch");
  assert.match(plan.why, /would batch #20, #21, #22 \(up to 5\)/);
  assert.ok(!dry.calls.some(c => /^(PUT|POST|PATCH|DELETE)/.test(c)) && asked === null, "without apply nothing is built or posted");

  const a = mockGh();
  const r = await step({gh: a.gh, home, apply: true, build});
  assert.deepEqual(asked, {cands: [20, 21, 22], max: 5});
  assert.equal(r.action, "batch");
  assert.equal(r.front, 900, "the batch pull request is the front, so its gate job goes first");
  assert.deepEqual(r.batch, [20, 21]);
  assert.match(r.why, /left out #22 \(it changes x\.txt/);
  assert.equal(a.bodies["POST /pulls"].head, BATCH_BRANCH);
  assert.equal(a.bodies["POST /pulls"].title, "Merge train batch: #20, #21");
  assert.ok(a.calls.includes("POST /issues/20/comments") && a.calls.includes("POST /issues/21/comments") && !a.calls.includes("POST /issues/22/comments"));
  assert.deepEqual(stateOf(home).batch.members.map(m => m.number), [20, 21]);

  const g = mockGh();
  const m = await step({gh: g.gh, home, apply: true, build});
  assert.equal(m.action, "merge");
  assert.equal(g.bodies["PUT /pulls/900/merge"].sha, "hb900", "merged with the head the train saw");
  assert.ok(!g.calls.some(c => /pulls\/2[012]\/merge/.test(c)), "the members are not merged one by one");

  // GitHub marks the members merged once their heads are on main; until then the train waits (up to two steps)
  const lag = mockGh({batchMerged: true, merged: [20]});
  assert.equal((await step({gh: lag.gh, home, apply: true, build})).action, "wait");
  const done = mockGh({batchMerged: true, merged: [20, 21], line: [22]});
  const f = await step({gh: done.gh, home, apply: true, build});
  assert.equal(f.action, "merged");
  assert.ok(done.calls.includes("POST /issues/20/comments") && done.calls.includes("POST /issues/21/comments"));
  assert.deepEqual(stateOf(home), {}, "the next step starts afresh");
});

test("a red batch is closed and the next one takes half as many; a pushed member or a move of main rebuilds", async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "train-"));
  const members = [{number: 20, ref: "claude/b20", head: "h20"}, {number: 21, ref: "claude/b21", head: "h21"}];
  const seed = extra => fs.writeFileSync(path.join(home, "train-state.json"), JSON.stringify({batch: {pr: 900, head: "hb900", members, since: Date.now()}, ...extra}));
  seed();
  const red = mockGh({batchStatuses: [{context: "wodx/gates", state: "failure"}, {context: "wodx/merge-rules", state: "failure", description: "Not ready: gate result"}]});
  const s = await step({gh: red.gh, home, apply: true, build: async () => assert.fail("no build on a red batch")});
  assert.equal(s.action, "split");
  assert.equal(red.bodies["PATCH /pulls/900"].state, "closed");
  assert.ok(red.calls.includes("POST /issues/900/comments"));
  assert.ok(!red.calls.some(c => /issues\/2[01]\/labels/.test(c)), "the members stay in the train");
  assert.equal(stateOf(home).maxBatch, 1);
  assert.equal(stateOf(home).batch, undefined);
  // with one at a time the front goes alone again
  const solo = await step({gh: mockGh().gh, home, apply: false, build: async () => assert.fail("no batch of one")});
  assert.equal(solo.action, "prepare");
  assert.equal(solo.front, 20);

  // a member pushed to: the batch is closed and a new one built at once
  seed();
  let built = 0;
  const pushed = mockGh({heads: {21: "h21new"}});
  const p = await step({gh: pushed.gh, home, apply: true, build: async (ctx, cands) => { built++; return {sha: "hb900", members: cands.slice(0, 2), skipped: [], did: "rebuilt"}; }});
  assert.ok(pushed.calls.includes("PATCH /pulls/900"), "the old batch is closed");
  assert.equal(built, 1);
  assert.equal(p.action, "batch");

  // main moved: built again on the new main with a lease on the old batch head; the members stay the same
  seed();
  let lease = null;
  const moved = mockGh({batchBehind: 3});
  const b = await step({gh: moved.gh, home, apply: true, build: async (ctx, ms, opt) => { lease = opt.lease; return {sha: "hb901", members: ms, skipped: [], did: "#20, #21 merged onto main"}; }});
  assert.equal(b.action, "prepare");
  assert.equal(lease, "hb900");
  assert.equal(stateOf(home).batch.head, "hb901");
  assert.ok(!moved.calls.some(c => c === "PATCH /pulls/900" && moved.bodies[c]?.state === "closed"));
});

test("an open batch the state file lost is taken up again from the mark in its body", async () => {
  const members = [{number: 20, ref: "claude/b20", head: "h20"}, {number: 21, ref: "claude/b21", head: "h21"}];
  const m = mockGh({openBatch: true, batchBody: `text\n\n<!-- merge-train-batch ${JSON.stringify(members)} -->\n`});
  const b = await adoptBatch(m.gh);
  assert.deepEqual([b.pr, b.head, b.members], [900, "hb900", members]);
  assert.equal(await adoptBatch(mockGh().gh), null);
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "train-"));
  const r = await step({gh: m.gh, home, apply: true});
  assert.equal(r.front, 900);
  assert.equal(r.action, "merge");
});

test("B7960: a runner git fault while a batch is rebuilt keeps the batch open with an alert, for at most maxHours", async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "train-"));
  const members = [{number: 20, ref: "claude/b20", head: "h20"}, {number: 21, ref: "claude/b21", head: "h21"}];
  fs.writeFileSync(path.join(home, "train-state.json"), JSON.stringify({batch: {pr: 900, head: "hb900", members, since: Date.now()}}));
  const alerts = [];
  const fault = async () => ({setup: true, error: "git on the runner could not fetch main and the batch's branches (fatal: unable to access x): the runner's git setup needs a fix"});
  const moved = mockGh({batchBehind: 3});
  const w = await step({gh: moved.gh, home, apply: true, build: fault, alert: async k => alerts.push(k)});
  assert.equal(w.action, "wait");
  assert.deepEqual(alerts, ["train-git"]);
  assert.ok(!moved.calls.some(c => c === "PATCH /pulls/900"), "the batch stays open");
  assert.equal(stateOf(home).batch.pr, 900);
  // past the cap the batch closes, and its members (still labelled) go on alone
  fs.writeFileSync(path.join(home, "train-state.json"), JSON.stringify({batch: {...stateOf(home).batch, setupSince: Date.now() - 4 * 3600e3}}));
  const late = mockGh({batchBehind: 3});
  await step({gh: late.gh, home, apply: true, batch: 1, build: fault, prepare: async () => ({setup: true, error: "x"})});
  assert.equal(late.bodies["PATCH /pulls/900"]?.state, "closed");
  assert.match(late.bodies["POST /issues/900/comments"]?.body ?? "", /for over 3 hours/);
  assert.ok(!late.calls.some(c => /issues\/2[01]\/labels/.test(c)), "the members stay in the train");
});

test("B8170: batches hold up to five, and a red batch of five halves to three, then two, then one", async () => {
  assert.equal(BATCH_MAX, 5);
  const runner = fs.readFileSync(new URL("../pcq/runner.mjs", import.meta.url), "utf8");
  assert.match(runner, /batch: conf\.trainBatch \?\? BATCH_MAX/, "the runner's default follows BATCH_MAX");
  const red = {batchStatuses: [{context: "wodx/gates", state: "failure"}, {context: "wodx/merge-rules", state: "failure", description: "Not ready: gate result"}]};
  for ( const [n, next] of [[5, 3], [3, 2], [2, 1]] ) {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "train-"));
    const members = Array.from({length: n}, (_, i) => ({number: 20 + i, ref: `claude/b${20 + i}`, head: `h${20 + i}`}));
    fs.writeFileSync(path.join(home, "train-state.json"), JSON.stringify({batch: {pr: 900, head: "hb900", members, since: Date.now()}}));
    const s = await step({gh: mockGh({...red, line: members.map(m => m.number)}).gh, home, apply: true, build: async () => assert.fail("no build on a red batch")});
    assert.equal(s.action, "split", `a red batch of ${n} splits`);
    assert.equal(stateOf(home).maxBatch, next, `a red batch of ${n} is followed by at most ${next}`);
  }
});
