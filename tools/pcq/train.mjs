/**
 * The merge train (B7202). Pull requests merge one at a time instead of racing each other to main.
 *
 * Before, every merge to main left the other open pull requests behind; the hourly sweep merged main into each of
 * them, each push started a full gate run again (150 to 300 gates, 50 to 80 minutes), and by the time a run passed
 * main had moved again. On 17 November 8 of 14 open pull requests had conflicts.
 *
 * A thread whose pull request meets the merge rules it can meet by itself (release notes, file reviews, registry)
 * adds the label `merge-train` and stops pushing. The PC runner (the Main PC's, every few minutes) then works on the
 * pull request at the front of the line, oldest label first, and leaves the rest alone:
 * A pull request labelled urgent as well joins at the front (B7420).
 *   1. A conflict with main, or a branch the train may not push to: the pull request leaves the train with a comment
 *      saying why (the label comes off), and the next one is the front. A draft is marked ready for review first.
 *   2. Behind main, or release notes still waiting under changes/: in its own worktree the runner merges main in
 *      (a merge, never a rebase), runs merge-stamp, and pushes. That push starts CI, and pc-gates.yml queues a fresh
 *      gate run for the new head, which the runner takes before other gate jobs.
 *   3. Up to date and stamped: it waits for the head's `checks` and `wodx/merge-rules` results. Both green: it
 *      merges with the head it saw. Either red, or no result within trainMaxHours (default 3): the pull request
 *      leaves the train with a comment.
 * Pull requests behind the front are not brought up to date and not gated again while they wait.
 *
 *   node tools/pcq/train.mjs           what the train would do now (reads GitHub, changes nothing)
 */
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath, pathToFileURL} from "node:url";
import {OWNER} from "./jobs.mjs";

export const TRAIN_LABEL = "merge-train";
/** B7420: a pull request labelled urgent as well as merge-train goes to the front of the line (registry/priorities.json urgentLabel). */
export const URGENT_LABEL = "urgent";
export const CHECKS = "checks", MERGE_RULES = "wodx/merge-rules", GATES = "wodx/gates";
const HOUR = 3600e3;

/**
 * The line, front first: open pull requests labelled merge-train, by the time the label went on (then number).
 * B7420: those also labelled urgent come first, in the same order among themselves. An urgent pull request that joins
 * while another is at the front takes the front at the runner's next step; the old front waits behind it and is
 * brought up to date again when its turn comes (its running gate job is not stopped).
 * prs: [{number, labelledAt (ms), urgent, draft, ...}].
 */
export function line(prs) {
  return [...prs].sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || (a.labelledAt ?? 0) - (b.labelledAt ?? 0) || a.number - b.number);
}

/**
 * What to do with the front pull request. f: {draft, mergeable (true|false|null), behind (commits), fragments (count
 * under changes/ at the head), ownBranch (a claude/ branch of this repository by the owner), checks ("success" |
 * "failure" | "pending" | null), mergeRules (same), mergeRulesWhy (that status's description), otherChecksFailed (a job besides checks and merge rules failed), gates (same), frontFor (ms the train has worked on this head)}.
 * Returns {action, why}; action: leave, ready, prepare, merge, wait.
 */
export function decide(f, {maxHours = 3} = {}) {
  if ( !f.ownBranch ) return {action: "leave", why: "the train only takes the owner's pull requests from claude/ branches of this repository"};
  // Threads open draft pull requests; the label says the work is done, so the train marks it ready itself
  if ( f.draft ) return {action: "ready", why: "a draft: the label says it is done, so the train marks it ready for review"};
  if ( f.mergeable === false ) return {action: "leave", why: "it has a merge conflict with main: merge main into the branch, fix the conflict, push, then add the label again"};
  if ( f.mergeable === null ) return {action: "wait", why: "GitHub is still working out whether it merges cleanly"};
  if ( f.behind > 0 || f.fragments > 0 ) return {action: "prepare", why: [f.behind > 0 ? `behind main by ${f.behind}` : "", f.fragments > 0 ? `${f.fragments} release note(s) to stamp` : ""].filter(Boolean).join(", ")};
  if ( f.gates === "failure" ) return {action: "leave", why: "its gates failed on the head: fix them, push, then add the label again"};
  // B7203: right after the train pushes, the merge rules on the new head can fail only on the gate rule, because an
  // earlier gate failure still counts until the fresh run reports (PR 1880 was put out two minutes after its gate run
  // was queued). That is a wait: the runner reruns the merge rules job when the head's gate result lands.
  // B7208: the "merge rules" job then fails too, and with it the "checks" job that sums up every job, so a failed
  // checks counts as pending here while every other job passed (PR 1848 was put out at 15:34Z with 0 tests failed).
  const gatePending = f.mergeRules === "failure" && f.gates !== "failure" && /^Not ready: gate result$/.test(f.mergeRulesWhy ?? "");
  if ( gatePending && (f.checks !== "failure" || f.otherChecksFailed === false) )
    return f.frontFor > maxHours * HOUR ? {action: "leave", why: `no gate result on the head ${maxHours} hours after it reached the front: look at the gate job, then add the label again`}
      : {action: "wait", why: `waiting for the gate run on the head (gates ${f.gates ?? "not reported yet"})`};
  if ( f.checks === "failure" ) return {action: "leave", why: "its checks failed on the head: fix them, push, then add the label again"};
  if ( f.mergeRules === "failure" ) return {action: "leave", why: "its merge rules failed on the head: see the merge rules job, fix, push, then add the label again"};
  if ( f.checks === "success" && f.mergeRules === "success" ) return {action: "merge", why: "up to date with main, checks and merge rules green"};
  if ( f.frontFor > maxHours * HOUR ) return {action: "leave", why: `no green result ${maxHours} hours after it reached the front (checks ${f.checks ?? "none"}, merge rules ${f.mergeRules ?? "none"}, gates ${f.gates ?? "none"}): look at the gate job, then add the label again`};
  return {action: "wait", why: `waiting for checks (${f.checks ?? "not started"}), merge rules (${f.mergeRules ?? "not started"}) and gates (${f.gates ?? "not queued"})`};
}

/** The newest state of one commit status context, or of one check run by name: "success", "failure", "pending" or null. */
export function statusOf(statuses, context) {
  const s = (statuses ?? []).find(x => x.context === context); // GitHub lists them newest first
  if ( !s ) return null;
  return s.state === "success" ? "success" : s.state === "pending" ? "pending" : "failure";
}
/** B7208: whether any job other than the summing "checks" job and the "merge rules" job failed on its newest run. */
export const SUMMING = new Set([CHECKS, "merge rules"]);
export function othersFailed(runs) {
  const names = new Set((runs ?? []).map(r => r.name).filter(n => !SUMMING.has(n)));
  return [...names].some(n => checkOf(runs, n) === "failure");
}
export function checkOf(runs, name) {
  const r = (runs ?? []).filter(x => x.name === name).sort((a, b) => Date.parse(b.started_at ?? 0) - Date.parse(a.started_at ?? 0))[0];
  if ( !r ) return null;
  if ( r.status !== "completed" ) return "pending";
  return ["success", "neutral", "skipped"].includes(r.conclusion) ? "success" : "failure";
}

/** True when a gates job issue belongs to the train's front pull request (pc-gates.yml titles carry "[PR #n sha]"). */
export const isFrontJob = (title, front) => !!front && String(title ?? "").includes(`[PR #${front} `);

/**
 * One step of the train. ctx: {gh(method, url, body), graphql(query, variables), git(argv, cwd) (sync, returns spawnSync's result), home (the
 * runner folder), repoRoot (the runner's clone), log, apply, maxHours}. Returns {front, action, why, line} for the
 * status issue. Keeps its own small state in <home>/train-state.json (which head is at the front since when).
 */
export async function step(ctx) {
  const {gh, log = () => {}, apply = false, home, maxHours = 3} = ctx;
  const stateFile = path.join(home, "train-state.json");
  const state = (() => { try { return JSON.parse(fs.readFileSync(stateFile, "utf8")); } catch { return {}; } })();
  const issues = await gh("GET", `/issues?state=open&labels=${TRAIN_LABEL}&per_page=100`);
  const prs = [];
  for ( const i of issues.filter(x => x.pull_request) ) {
    const ev = await gh("GET", `/issues/${i.number}/events?per_page=100`).catch(() => []);
    const at = (ev ?? []).filter(e => e.event === "labeled" && e.label?.name === TRAIN_LABEL).map(e => Date.parse(e.created_at)).at(-1);
    prs.push({number: i.number, title: i.title, labelledAt: at ?? Date.parse(i.created_at), urgent: (i.labels ?? []).some(l => (l.name ?? l) === URGENT_LABEL)});
  }
  const order = line(prs);
  const out = {front: null, action: "idle", why: "nothing in the train", line: order.map(p => p.number), urgent: order.filter(p => p.urgent).map(p => p.number)};
  if ( !order.length ) { save(stateFile, {}); return out; }
  const pr = order[0];
  out.front = pr.number;
  const full = await gh("GET", `/pulls/${pr.number}`);
  const head = full.head.sha;
  if ( state.pr !== pr.number || state.head !== head ) { state.pr = pr.number; state.head = head; state.since = Date.now(); }
  const [cmp, statuses, runs, tree] = await Promise.all([
    gh("GET", `/compare/${full.base.ref}...${head}`),
    gh("GET", `/commits/${head}/statuses?per_page=100`),
    gh("GET", `/commits/${head}/check-runs?per_page=100`),
    gh("GET", `/contents/changes?ref=${head}`).catch(() => [])]);
  // changes/ holds README.md and one folder per module or decisions; any .md below those is a note waiting
  let fragments = 0;
  for ( const d of (Array.isArray(tree) ? tree : []).filter(x => x.type === "dir") ) {
    const list = await gh("GET", `/contents/changes/${d.name}?ref=${head}`).catch(() => []);
    fragments += (Array.isArray(list) ? list : []).filter(x => x.type === "file" && x.name.endsWith(".md")).length;
  }
  const f = {draft: !!full.draft, mergeable: full.mergeable ?? null, behind: cmp.behind_by ?? 0, fragments,
    ownBranch: full.user?.login === OWNER && full.head.repo?.full_name === full.base.repo?.full_name && /^claude\//.test(full.head.ref),
    checks: checkOf(runs.check_runs, CHECKS), mergeRules: statusOf(statuses, MERGE_RULES), gates: statusOf(statuses, GATES),
    mergeRulesWhy: (statuses ?? []).find(x => x.context === MERGE_RULES)?.description ?? "",
    otherChecksFailed: othersFailed(runs.check_runs),
    frontFor: Date.now() - state.since};
  const d = decide(f, {maxHours});
  Object.assign(out, d);
  log(`train: #${pr.number} ${d.action}: ${d.why}`);
  if ( apply ) {
    if ( d.action === "leave" ) await leave(gh, pr.number, d.why);
    if ( d.action === "ready" ) {
      try { await ctx.graphql(`mutation($id: ID!) { markPullRequestReadyForReview(input: {pullRequestId: $id}) { pullRequest { isDraft } } }`, {id: full.node_id}); }
      catch (e) { await leave(gh, pr.number, `the train could not mark the draft ready (${String(e.message).slice(0, 120)}): mark it ready for review, then add the label again`); out.action = "leave"; }
    }
    if ( d.action === "prepare" ) {
      const r = await prepare(ctx, full.head.ref, head);
      if ( r.error ) { await leave(gh, pr.number, r.error); out.action = "leave"; out.why = r.error; }
      else { out.why += `: ${r.did}`; await comment(gh, pr.number, `Merge train: this pull request is at the front. ${r.did}; the gates run on the new head (${r.sha.slice(0, 8)}) and it merges when its checks are green.`); }
    }
    if ( d.action === "merge" ) {
      try {
        await gh("PUT", `/pulls/${pr.number}/merge`, {sha: head, merge_method: "merge", commit_title: `Merge pull request #${pr.number} from ${OWNER}/${full.head.ref} (merge train)`});
        await comment(gh, pr.number, `Merge train: merged at ${head.slice(0, 8)}. The branch is left for the owner to delete.`);
        log(`train: #${pr.number} merged`);
      } catch (e) { out.action = "wait"; out.why = `merge refused for now (${String(e.message).slice(0, 160)})`; log(`train: #${pr.number} ${out.why}`); }
    }
  }
  save(stateFile, out.action === "merge" || out.action === "leave" ? {} : state);
  return out;
}

const save = (f, s) => { try { fs.writeFileSync(f, JSON.stringify(s)); } catch { /* the next step starts the clock again */ } };
const comment = (gh, n, text) => gh("POST", `/issues/${n}/comments`, {body: `${text}\n\n---\n_Generated by [Claude Code](https://claude.ai/code)_`}).catch(() => null);
async function leave(gh, n, why) {
  await comment(gh, n, `Merge train: this pull request left the train because ${why}.`);
  await gh("DELETE", `/issues/${n}/labels/${TRAIN_LABEL}`).catch(() => null);
}

/**
 * Brings the branch up to date in the train's own worktree (<home>/train): merge origin/main in, stamp the release
 * notes, push with a lease on the head the train saw (a thread that pushed meanwhile wins, and the train looks again).
 * Returns {sha, did} or {error}.
 */
export async function prepare(ctx, ref, head) {
  const {git, home, repoRoot} = ctx;
  const dir = path.join(home, "train");
  const ok = r => r && r.status === 0;
  if ( !ok(await git(["fetch", "-q", "origin", "main", `+refs/heads/${ref}:refs/remotes/origin/${ref}`], repoRoot)) ) return {error: `the train could not fetch ${ref}`};
  if ( !fs.existsSync(path.join(dir, ".git")) && !ok(await git(["worktree", "add", "--detach", "-f", dir, head], repoRoot)) ) return {error: "the train could not make its worktree"};
  await git(["merge", "--abort"], dir);
  if ( !ok(await git(["checkout", "-q", "-f", "--detach", head], dir)) ) return {error: `the train could not check out ${head.slice(0, 8)}`};
  await git(["clean", "-q", "-fd"], dir);
  const did = [];
  const behind = (await git(["merge-base", "--is-ancestor", "origin/main", "HEAD"], dir)).status !== 0;
  if ( behind ) {
    const m = await git(["merge", "--no-edit", "-m", `Merge main into ${ref} (merge train)\n\nMerge-Train: yes`, "origin/main"], dir);
    if ( !ok(m) ) { await git(["merge", "--abort"], dir); return {error: "main does not merge in cleanly: merge main into the branch, fix the conflict, push, then add the label again"}; }
    did.push("main merged in");
    const carried = await carryReviews(dir, head);
    if ( carried.error ) { await git(["reset", "-q", "--hard", head], dir); return {error: carried.error}; }
    if ( carried.n ) did.push(`${carried.n} file review(s) carried over`);
  }
  const st = spawnSync(process.execPath, [path.join(dir, "tools", "release", "merge-stamp.mjs"), "--commit", "--no-fetch"], {cwd: dir, encoding: "utf8", windowsHide: true});
  if ( st.status !== 0 ) { await git(["reset", "-q", "--hard", head], dir); return {error: `merge-stamp refused: ${(st.stdout + st.stderr).trim().split("\n").slice(-4).join(" ").slice(0, 400)}`}; }
  if ( /Committed\./.test(st.stdout) ) {
    did.push("release notes stamped");
    // B7332: the stamp commit carries the train's trailer, so pc-gates.yml knows this push as the train's own
    await git(["commit", "--amend", "-q", "--no-edit", "--trailer", "Merge-Train: yes"], dir);
  }
  const sha = (await git(["rev-parse", "HEAD"], dir)).stdout.trim();
  if ( sha === head ) return {error: "the train had nothing to do but the branch still reads as behind or unstamped"};
  const p = await git(["push", "-q", "origin", `HEAD:refs/heads/${ref}`, `--force-with-lease=refs/heads/${ref}:${head}`], dir);
  if ( !ok(p) ) return {error: `the push to ${ref} was refused (${String(p.stderr ?? "").trim().slice(0, 200)}); if the thread pushed meanwhile, add the label again`};
  return {sha, did: did.join(" and ")};
}

/** The lines a diff adds and removes, without positions: what the branch itself did to a file. */
export const ownChange = diff => String(diff ?? "").split("\n").filter(l => /^[+-]/.test(l) && !/^(\+\+\+|---) /.test(l)).join("\n");

/**
 * B7203: merging main in changes the files the branch shares with main, so their review hashes stop matching and the
 * merge rules fail "file review" (PR 1836 after the train's first merge), though nobody changed what the branch did.
 * For each file whose verdict matched it at the old head and no longer does, the branch's own change (what the old
 * head adds and removes against its merge base, and what the new head adds and removes against main) is compared;
 * when it is the same, the verdict is written again for the file as it is now, saying it was carried over and keeping
 * the earlier "how". A file whose own change differs (a conflict resolved by hand) keeps its stale verdict, and the
 * merge rules send it back to its thread. Commits the new lines; returns {n} or {error}.
 */
export async function carryReviews(dir, oldHead) {
  const MR = await import(`${pathToFileURL(path.join(dir, "tools", "release", "merge-rules.mjs")).href}?${Date.now()}`).catch(() => null);
  if ( !MR?.branchReviews || !MR?.hashOf ) return {n: 0};
  const g = MR.gitIn(dir);
  const before = g.tryRun("merge-base", oldHead, "HEAD^2");
  if ( !before ) return {n: 0};
  const latest = new Map();
  for ( const it of MR.branchReviews(g, before, oldHead).items ) latest.set(it.file, it);
  const files = (g.tryRun("diff", "--name-only", "--no-renames", "HEAD^2", "HEAD") ?? "").split("\n").filter(Boolean);
  const lines = [];
  for ( const file of files ) {
    const v = latest.get(file);
    if ( !v || !["working", "dead"].includes(v.verdict) ) continue;
    const was = g.show(oldHead, file), now = g.show("HEAD", file);
    if ( MR.hashOf(was) !== v.hash || MR.hashOf(now) === v.hash ) continue; // stale before, or still current
    const mine = ownChange(g.tryRun("diff", "-U0", "--no-renames", before, oldHead, "--", file));
    if ( !mine || mine !== ownChange(g.tryRun("diff", "-U0", "--no-renames", "HEAD^2", "HEAD", "--", file)) ) continue;
    lines.push({file, verdict: v.verdict, how: `carried over by the merge train after main merged in: the branch's own change to this file is the same; earlier check: ${v.how}`.slice(0, 900),
      hash: MR.hashOf(now), at: new Date().toISOString().slice(0, 16) + "Z"});
  }
  if ( !lines.length ) return {n: 0};
  const reviewFiles = (g.tryRun("diff", "--name-only", before, oldHead, "--", `${MR.REVIEW_DIR}/`) ?? "").split("\n").filter(f => f.endsWith(".jsonl"));
  const target = reviewFiles[0];
  if ( !target ) return {n: 0};
  fs.appendFileSync(path.join(dir, target), lines.map(l => JSON.stringify(l)).join("\n") + "\n");
  const add = spawnSync("git", ["add", "--", target], {cwd: dir, encoding: "utf8"});
  const c = spawnSync("git", ["commit", "-q", "-m", `Merge train: carry ${lines.length} file review(s) over the merge with main`], {cwd: dir, encoding: "utf8"});
  if ( add.status || c.status ) return {error: `the train could not commit the carried reviews (${(c.stderr || add.stderr || "").trim().slice(0, 160)})`};
  return {n: lines.length};
}

if ( process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ) {
  const {REPO_NAME} = await import("./jobs.mjs");
  const r = spawnSync("git", ["credential", "fill"], {input: "protocol=https\nhost=github.com\n\n", encoding: "utf8", windowsHide: true});
  const token = process.env.WODX_PCQ_TOKEN ?? process.env.GITHUB_TOKEN ?? /^password=(.+)$/m.exec(r.stdout ?? "")?.[1]?.trim();
  if ( !token ) { console.error("No GitHub token."); process.exit(1); }
  const gh = async (method, url, body) => {
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO_NAME}${url}`, {method, body: body ? JSON.stringify(body) : undefined,
      headers: {Authorization: `token ${token}`, "User-Agent": "wodx-train", Accept: "application/vnd.github+json", "Content-Type": "application/json"}});
    const text = await res.text();
    if ( !res.ok ) throw new Error(`${res.status} ${text.slice(0, 200)}`);
    return text ? JSON.parse(text) : null;
  };
  const tmp = fs.mkdtempSync(path.join((await import("node:os")).tmpdir(), "train-"));
  const out = await step({gh, home: tmp, log: console.log, apply: false});
  console.log(`line: ${out.line.map(n => `#${n}`).join(", ") || "empty"}; front ${out.front ? `#${out.front}` : "none"}: ${out.action} (${out.why})`);
}
