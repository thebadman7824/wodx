/* Merge rules (B7000-B7009): tools/release/merge-rules.mjs blocks a pull request that has no release note for a
 * module it changes, no passing gate result for the code as it is, or a changed file with no current review verdict;
 * and it leaves version stamps and the owner's own work alone. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";
import * as R from "../release/merge-rules.mjs";

test("a version stamp is no change; any other edit is", () => {
  const a = 'export const VERSION = "1.2.3";\nconst x = 1;\n', b = 'export const VERSION = "1.3.0";\r\nconst x = 1;\r\n';
  assert.equal(R.hashOf(a), R.hashOf(b));
  assert.notEqual(R.hashOf(a), R.hashOf(a.replace("x = 1", "x = 2")));
  assert.equal(R.normalise('{"id": "m", "version": "0.4.1"}'), R.normalise('{"id": "m", "version": "0.5.0"}'));
  assert.equal(R.hashOf(null), "deleted");
});

test("stamped files and notes need no review of their own", () => {
  for ( const f of ["changes/wodx-npc/x.md", "changes/decisions/B1.md", "docs/reviews/b.jsonl", "modules/wodx-npc/CHANGELOG.md", "docs/MODULES.md", "docs/DECISIONS.md", "tools/gate/fixtures/api-paths.json"] )
    assert.ok(R.isStamped(f), f);
  for ( const f of ["changes/README.md", "docs/reviews/README.md", "modules/wodx-npc/scripts/main.mjs", "docs/WORKFLOW.md", "tools/pcq/runner.mjs"] ) assert.ok(!R.isStamped(f), f);
});

test("The owner's own work: every commit by the owner's account with no agent trailer", () => {
  const ben = {author: "thebadman7824", body: "Fix a typo"};
  assert.ok(R.bensOwn([ben]));
  assert.ok(!R.bensOwn([]));
  assert.ok(!R.bensOwn([ben, {author: "Claude", body: "x"}]));
  assert.ok(!R.bensOwn([{author: "thebadman7824", body: "x\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"}]));
  assert.ok(!R.bensOwn([{author: "thebadman7824", body: "x\n\nClaude-Session: https://claude.ai/code/s"}]));
  assert.ok(!R.bensOwn([{author: "openhands", body: "x"}]));
});

test("rule 1: a changed module needs a well formed note with effect and visible", () => {
  const frag = (meta, body = "A thing.") => ({meta, body});
  assert.match(R.noteProblems(["wodx-npc"], []).join(), /wodx-npc: files changed but no release note/);
  assert.deepEqual(R.noteProblems(["wodx-npc"], [{file: "changes/wodx-npc/a.md", module: "wodx-npc", frag: frag({bump: "patch"})}]), []);
  const minor = R.noteProblems(["wodx-npc"], [{file: "changes/wodx-npc/a.md", module: "wodx-npc", frag: frag({bump: "minor"})}]).join("\n");
  assert.match(minor, /no effect: line/);
  assert.match(minor, /no visible: line/);
  assert.deepEqual(R.noteProblems(["wodx-npc"], [{file: "changes/wodx-npc/a.md", module: "wodx-npc", frag: frag({bump: "minor", effect: "a roll card shows the new pool", visible: "the token flashes red on the map"})}]), []);
  assert.match(R.noteProblems(["wodx-npc"], [{file: "changes/wodx-npc/a.md", module: "wodx-npc", frag: null}]).join(), /no front matter/);
  // A note for a module the branch does not change is not this rule's business
  assert.deepEqual(R.noteProblems([], [{file: "changes/wodx-npc/a.md", module: "wodx-npc", frag: null}]), []);
});

test("rule 3: every changed file has a current verdict that says how it was checked", () => {
  const how = "read in full and ran the npc harness file";
  const f = {file: "modules/wodx-npc/scripts/a.mjs", hash: "aaaaaaaaaaaa", deleted: false};
  assert.match(R.reviewProblems([f], []).join(), /no review verdict/);
  assert.deepEqual(R.reviewProblems([f], [{file: f.file, verdict: "working", how, hash: f.hash}]), []);
  assert.match(R.reviewProblems([f], [{file: f.file, verdict: "working", how, hash: "bbbbbbbbbbbb"}]).join(), /changed after its review/);
  assert.match(R.reviewProblems([f], [{file: f.file, verdict: "broken", how, hash: f.hash}]).join(), /only working can merge/);
  assert.match(R.reviewProblems([f], [{file: f.file, verdict: "working", how: "ok", hash: f.hash}]).join(), /what was done to check it/);
  // The newest entry wins
  assert.deepEqual(R.reviewProblems([f], [{file: f.file, verdict: "broken", how, hash: f.hash}, {file: f.file, verdict: "working", how, hash: f.hash}]), []);
  // A glob covers assets, never scripts
  const png = {file: "modules/wodx-npc/assets/a/b.png", hash: "cccccccccccc", deleted: false};
  assert.deepEqual(R.reviewProblems([png], [{glob: "modules/wodx-npc/assets/**", verdict: "working", how}]), []);
  assert.match(R.reviewProblems([f], [{glob: "modules/wodx-npc/**", verdict: "working", how}]).join(), /no review verdict/);
  assert.match(R.reviewProblems([], [{glob: "modules/**/*.mjs", verdict: "working", how}]).join(), /may not cover script files/);
  // A deleted file may be dead
  const gone = {file: "modules/wodx-npc/scripts/old.mjs", hash: "deleted", deleted: true};
  assert.deepEqual(R.reviewProblems([gone], [{file: gone.file, verdict: "dead", how, hash: "deleted"}]), []);
});

test("rule 2: a passing gate status counts only while the gated code is unchanged", () => {
  const st = (state, d = "") => [{context: R.GATE_CONTEXT, state, description: d, target_url: "https://x/issues/1"}];
  assert.ok(R.gateVerdict([], [], () => true).ok);
  assert.ok(!R.gateVerdict(["gatea"], [], () => true).ok);
  assert.ok(R.gateVerdict(["gatea"], [{sha: "b".repeat(40), statuses: st("success")}], () => true).ok);
  assert.ok(!R.gateVerdict(["gatea"], [{sha: "b".repeat(40), statuses: st("success")}], () => false).ok, "code changed since the run");
  const failed = R.gateVerdict(["gatea"], [{sha: "c".repeat(40), statuses: st("failure", "2 of 9 failed")}], () => true);
  assert.ok(!failed.ok);
  assert.match(failed.problems[0], /gates failed .*2 of 9 failed/);
  // The newest status for the context on a commit counts (GitHub lists newest first)
  assert.ok(!R.gateVerdict(["gatea"], [{sha: "d".repeat(40), statuses: [...st("failure"), ...st("success")]}], () => true).ok);
  // An older passing commit with the same code still counts past a newer failed one with other code
  const two = [{sha: "e".repeat(40), statuses: st("failure")}, {sha: "f".repeat(40), statuses: st("success")}];
  assert.ok(R.gateVerdict(["gatea"], two, sha => sha.startsWith("f")).ok);
});

/* ---- a whole branch in a scratch repository ---- */

function scratch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "merge-rules-"));
  const git = (...a) => execFileSync("git", a, {cwd: dir, encoding: "utf8"}).trim();
  const put = (f, s) => { fs.mkdirSync(path.dirname(path.join(dir, f)), {recursive: true}); fs.writeFileSync(path.join(dir, f), s); };
  const commit = (msg, author = "Claude") => { git("add", "-A"); git("-c", `user.name=${author}`, "-c", "user.email=a@example.invalid", "commit", "-q", "-m", msg); return git("rev-parse", "HEAD"); };
  git("init", "-q", "-b", "main");
  put("modules/wodx-foo/module.json", '{"id": "wodx-foo", "version": "1.0.0"}\n');
  put("modules/wodx-foo/scripts/main.mjs", 'export const VERSION = "1.0.0";\nexport const n = 1;\n');
  put("modules/wodx-foo/CHANGELOG.md", "# Foo\n\n- 1.0.0 (first)\n");
  put("tools/gate/gatefoo.mjs", 'export async function run() { return "wodx-foo"; }\n');
  put("docs/WORKFLOW.md", "# Workflow\n");
  commit("base");
  git("checkout", "-q", "-b", "claude/x");
  return {dir, git, put, commit};
}
const trailer = "\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>";

test("a branch is blocked until it has its note, its gate result and its reviews, and a stamp keeps them", async () => {
  const s = scratch();
  try {
    s.put("modules/wodx-foo/scripts/main.mjs", 'export const VERSION = "1.0.0";\nexport const n = 2;\n');
    const code = s.commit(`Foo counts to two${trailer}`);
    const ev = statuses => R.evaluate({root: s.dir, base: "main", head: "HEAD", statuses});
    let r = await ev(async () => []);
    assert.ok(!r.ok && !r.bensOwn);
    assert.match(r.rules.note.join(), /wodx-foo: files changed but no release note/);
    assert.match(r.rules.gates.join(), /1 gate\(s\) needed and no passing/);
    assert.match(r.rules.review.join(), /modules\/wodx-foo\/scripts\/main\.mjs: no review verdict/);

    // The note, a review of the file as it is, and a passing gate run on the code commit
    s.put("changes/wodx-foo/two.md", "---\nbump: minor\neffect: the count card shows two\nvisible: the counter token on the map turns over to two\n---\nFoo counts to two.\n");
    const text = fs.readFileSync(path.join(s.dir, "modules/wodx-foo/scripts/main.mjs"), "utf8");
    s.put("docs/reviews/claude-x.jsonl", JSON.stringify({file: "modules/wodx-foo/scripts/main.mjs", verdict: "working", how: "read in full, ran the foo test", hash: R.hashOf(text)}) + "\n");
    s.commit(`Note and review${trailer}`);
    const pass = async shas => shas.map(sha => ({sha, statuses: sha === code ? [{context: R.GATE_CONTEXT, state: "success", description: "1 gate passed"}] : []}));
    r = await ev(pass);
    assert.ok(r.ok, JSON.stringify(r.rules));

    // merge-stamp: the note goes, the version moves in module.json and the script, a changelog line is added
    fs.rmSync(path.join(s.dir, "changes/wodx-foo/two.md"));
    s.put("modules/wodx-foo/module.json", '{"id": "wodx-foo", "version": "1.1.0"}\n');
    s.put("modules/wodx-foo/scripts/main.mjs", 'export const VERSION = "1.1.0";\nexport const n = 2;\n');
    s.put("modules/wodx-foo/CHANGELOG.md", "# Foo\n\n- 1.1.0 (Foo counts to two)\n- 1.0.0 (first)\n");
    s.commit("Stamp versions, changelogs and decisions for merge");
    r = await ev(pass);
    assert.ok(r.ok, `after the stamp: ${JSON.stringify(r.rules)}`);

    // A change after the gate run and the review: both are stale
    s.put("modules/wodx-foo/scripts/main.mjs", 'export const VERSION = "1.1.0";\nexport const n = 3;\n');
    s.commit(`Three${trailer}`);
    r = await ev(pass);
    assert.ok(!r.ok);
    assert.match(r.rules.review.join(), /changed after its review/);
    assert.match(r.rules.gates.join(), /no passing/);
    assert.deepEqual(r.rules.note, [], "the note stays found in the branch's history after the stamp removed it");
  } finally { fs.rmSync(s.dir, {recursive: true, force: true}); }
});

test("a docs-only branch needs a review but no note and no gate; the owner's own work is not blocked", async () => {
  const s = scratch();
  try {
    s.put("docs/WORKFLOW.md", "# Workflow\n\nMore.\n");
    s.commit("Docs", "thebadman7824");
    let r = await R.evaluate({root: s.dir, base: "main", head: "HEAD", statuses: async () => []});
    assert.deepEqual(r.rules.note, []);
    assert.deepEqual(r.rules.gates, []);
    assert.equal(r.rules.review.length, 1);
    assert.ok(!r.ok && r.bensOwn, "reported, not blocked");
    s.put("docs/WORKFLOW.md", "# Workflow\n\nMore still.\n");
    s.commit(`Docs again${trailer}`);
    r = await R.evaluate({root: s.dir, base: "main", head: "HEAD", statuses: async () => []});
    assert.ok(!r.bensOwn, "a commit by an agent makes the branch not Ben's own");
  } finally { fs.rmSync(s.dir, {recursive: true, force: true}); }
});

test("B7005: a soft warning when a thread does by hand work that ROUTING.md sends to a machine", () => {
  const routes = R.readRoutes(fs.readFileSync(path.join(R.ROOT, "docs/ROUTING.md"), "utf8"));
  assert.ok(routes.length >= 2 && routes.every(r => r.kind && r.home && r.paths?.length), "docs/ROUTING.md has its routes block");
  assert.deepEqual(R.readRoutes("no block here"), []);
  const names = [{file: "modules/wodx-creation/data/people-maya.mjs"}], thread = [{author: "Claude", body: "More names"}];
  routes.push({kind: "name lists", home: "the local-agent queue", paths: ["modules/wodx-creation/data/people-*.mjs"]}); // sample route: the real one is paused
  assert.match(R.routeWarnings(names, routes, thread).join(), /name lists .*local-agent queue/);
  assert.deepEqual(R.routeWarnings(names, routes, [...thread, {author: "openhands", body: "x"}]), [], "a local agent did it");
  assert.deepEqual(R.routeWarnings(names, routes, [{author: "Claude", body: "x\n\nrouted-by-hand: the PC was off"}]), []);
  assert.deepEqual(R.routeWarnings(names, routes, thread, [{frag: {body: "Names. routed-by-hand: a rules change, not data entry"}}]), []);
  assert.deepEqual(R.routeWarnings([{file: "modules/wodx-creation/scripts/main.mjs"}], routes, thread), []);
  assert.match(R.routeWarnings([{file: "modules/wodx-atmosphere/sounds/a/b.ogg"}], routes, thread).join(), /audio files/);
});

test("B7004: TOOLS.md and ROUTING.md exist and point at each other", () => {
  const t = fs.readFileSync(path.join(R.ROOT, "docs/TOOLS.md"), "utf8"), r = fs.readFileSync(path.join(R.ROOT, "docs/ROUTING.md"), "utf8");
  assert.match(t, /\(ROUTING\.md\)/);
  assert.match(r, /\(TOOLS\.md\)/);
  for ( const m of ["Main PC", "Secondary PC", "Laptop"] ) assert.ok(t.includes(`## ${m}`), m);
  assert.match(fs.readFileSync(path.join(R.ROOT, "docs/WORKFLOW.md"), "utf8"), /read TOOLS\.md and ROUTING\.md/);
});

test("B7006: a pull request waiting only for its PC gates is pending, not failed; anything else broken fails", async () => {
  const s = scratch();
  try {
    s.put("modules/wodx-foo/scripts/main.mjs", 'export const VERSION = "1.0.0";\nexport const n = 5;\n');
    s.put("changes/wodx-foo/five.md", "---\nbump: patch\n---\nFoo counts to five.\n");
    const text = fs.readFileSync(path.join(s.dir, "modules/wodx-foo/scripts/main.mjs"), "utf8");
    s.put("docs/reviews/claude-x.jsonl", JSON.stringify({file: "modules/wodx-foo/scripts/main.mjs", verdict: "working", how: "read in full, ran the foo test", hash: R.hashOf(text)}) + "\n");
    const code = s.commit(`Five${trailer}`);
    const ev = statuses => R.evaluate({root: s.dir, base: "main", head: "HEAD", statuses});
    const gate = state => async shas => shas.map(sha => ({sha, statuses: sha === code ? [{context: R.GATE_CONTEXT, state, description: "x"}] : []}));

    // No gate result yet: pending, and the job does not fail
    let r = await ev(async shas => shas.map(sha => ({sha, statuses: []})));
    assert.equal(R.outcome(r), "pending");
    const pend = R.statusBody(r, "https://github.com/o/r/actions/runs/1");
    assert.equal(pend.context, R.RULES_CONTEXT);
    assert.match(pend.description, /Waiting for the PC gates \(1 needed\)/);
    assert.ok(pend.description.length <= 140);
    assert.match(R.report(r), /Waiting for the PC gates/);

    // The gates passed: success
    r = await ev(gate("success"));
    assert.equal(R.outcome(r), "success");
    assert.equal(R.statusBody(r).description, "Every merge rule is met");

    // The gates failed: a real failure
    r = await ev(gate("failure"));
    assert.equal(R.outcome(r), "failure");
    assert.match(R.statusBody(r).description, /Not ready: gate result/);

    // Waiting for gates but a file has no review: a real failure, not pending
    s.put("modules/wodx-foo/scripts/main.mjs", 'export const VERSION = "1.0.0";\nexport const n = 6;\n');
    s.commit(`Six${trailer}`);
    r = await ev(async shas => shas.map(sha => ({sha, statuses: []})));
    assert.equal(R.outcome(r), "failure");
    assert.match(R.statusBody(r).description, /file review/);
  } finally { fs.rmSync(s.dir, {recursive: true, force: true}); }
});

test("B7006: the owner's own work and a branch needing no gate are success", () => {
  const base = {ok: false, bensOwn: true, gateWaiting: true, gatesNeeded: 2, rules: {note: [], gates: ["x"], review: ["y"]}};
  assert.equal(R.outcome(base), "success");
  assert.equal(R.outcome({...base, bensOwn: false, ok: true, rules: {note: [], gates: [], review: []}}), "success");
  assert.equal(R.outcome({...base, bensOwn: false, rules: {note: [], gates: ["x"], review: []}}), "pending");
  assert.equal(R.outcome({...base, bensOwn: false, gateWaiting: false, rules: {note: [], gates: ["x"], review: []}}), "failure");
});

test("B7520: notes and decision fragments stay found after a stamp and a second merge of main", () => {
  const s = scratch();
  try {
    s.put("modules/wodx-foo/scripts/main.mjs", 'export const VERSION = "1.0.0";\nexport const n = 2;\n');
    s.put("changes/wodx-foo/two.md", "---\nbump: patch\n---\nFoo counts to two.\n");
    s.put("changes/decisions/B9001.md", "## B9001. Two\n\nFoo counts to two.\n");
    s.commit(`Foo counts to two${trailer}`);
    // the train stamps: the note and the fragment go
    fs.rmSync(path.join(s.dir, "changes/wodx-foo/two.md"));
    fs.rmSync(path.join(s.dir, "changes/decisions/B9001.md"));
    s.put("docs/DECISIONS.md", "## B9001. Two\n");
    s.commit("Stamp versions, changelogs and decisions for merge");
    // main moves on with a fragment of its own and is merged in: the merge's changes/ matches main's side
    s.git("checkout", "-q", "main");
    s.put("changes/decisions/B9002.md", "## B9002. Other\n\nOther work.\n");
    s.commit(`Other work${trailer}`);
    s.git("checkout", "-q", "claude/x");
    s.git("-c", "user.name=Claude", "-c", "user.email=a@example.invalid", "merge", "-q", "--no-edit", "main");
    const g = R.gitIn(s.dir), base = s.git("merge-base", "main", "HEAD");
    assert.equal(s.git("log", "--format=%h", "--diff-filter=A", `${base}..HEAD`, "--", "changes/"), "",
      "plain git log hides the adding commit here, which is the fault");
    assert.deepEqual(R.branchNotes(g, base, "HEAD").map(n => n.file), ["changes/wodx-foo/two.md"]);
    assert.ok(R.branchNotes(g, base, "HEAD")[0].frag, "the note is read as it stood before the stamp");
    assert.deepEqual(R.branchDecisions(g, base, "HEAD").map(d => d.file), ["changes/decisions/B9001.md"]);
  } finally { fs.rmSync(s.dir, {recursive: true, force: true}); }
});
