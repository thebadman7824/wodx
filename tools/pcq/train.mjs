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
 *   4. B7445: when the front would be prepared and up to two green pull requests behind it change other files, the
 *      train builds one batch pull request of them instead (buildBatch, batchStep below); that batch is the front.
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
  // B7449: the front's 3-hour limit counts only time its clock ran (ctx.clockRuns from the runner)
  const ran = tick(state, ctx.clockRuns ?? true);
  const issues = await gh("GET", `/issues?state=open&labels=${TRAIN_LABEL}&per_page=100`);
  const prs = [];
  for ( const i of issues.filter(x => x.pull_request) ) {
    const ev = await gh("GET", `/issues/${i.number}/events?per_page=100`).catch(() => []);
    const at = (ev ?? []).filter(e => e.event === "labeled" && e.label?.name === TRAIN_LABEL).map(e => Date.parse(e.created_at)).at(-1);
    prs.push({number: i.number, title: i.title, labelledAt: at ?? Date.parse(i.created_at), urgent: (i.labels ?? []).some(l => (l.name ?? l) === URGENT_LABEL)});
  }
  const order = line(prs);
  const out = {front: null, action: "idle", why: "nothing in the train", line: order.map(p => p.number), urgent: order.filter(p => p.urgent).map(p => p.number)};
  // B7445: a batch pull request in flight is the front until it merges, fails or goes stale
  if ( !state.batch ) { const adopted = await adoptBatch(gh); if ( adopted ) state.batch = adopted; }
  if ( state.batch ) {
    state.batch.ran = (state.batch.ran ?? 0) + ran;
    const b = await batchStep(ctx, state, order);
    if ( b ) { save(stateFile, state); log(`train: batch #${b.front} ${b.action}: ${b.why}`); return {...out, ...b}; }
  }
  if ( !order.length ) { save(stateFile, {}); return out; }
  const pr = order[0];
  out.front = pr.number;
  const full = await gh("GET", `/pulls/${pr.number}`);
  const head = full.head.sha;
  if ( state.pr !== pr.number || state.head !== head ) { state.pr = pr.number; state.head = head; state.since = Date.now(); state.ran = 0; }
  else state.ran = (state.ran ?? 0) + ran;
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
    frontFor: state.ran};
  const d = decide(f, {maxHours});
  // B7445: a front that needs main and a stamp anyway takes up to two green pull requests behind it into one batch
  const maxBatch = state.maxBatch ?? ctx.batch ?? BATCH_MAX;
  if ( d.action === "prepare" && maxBatch >= 2 && !pr.urgent && eligible(f).ok ) {
    const cands = [{number: pr.number, ref: full.head.ref, head}];
    for ( const p of order.slice(1, 1 + BATCH_LOOK) ) {
      const m = await memberFacts(gh, p).catch(() => null);
      if ( m && eligible(m).ok ) cands.push(m);
    }
    if ( cands.length >= 2 ) {
      const names = cands.map(c => `#${c.number}`).join(", ");
      if ( !apply ) { Object.assign(out, {action: "batch", why: `${d.why}: would batch ${names} (up to ${maxBatch})`}); log(`train: #${pr.number} ${out.action}: ${out.why}`); return out; }
      const r = await (ctx.build ?? buildBatch)(ctx, cands, {max: maxBatch});
      if ( r.error ) log(`train: no batch (${r.error}); #${pr.number} goes alone`);
      else if ( r.members.length >= 2 ) {
        const bp = await openBatch(gh, r);
        delete state.pr; delete state.head;
        state.batch = {pr: bp.number, head: r.sha, members: r.members.map(({number, ref, head: h}) => ({number, ref, head: h})), since: Date.now(), ran: 0};
        for ( const m of r.members ) await comment(gh, m.number, `Merge train: batched with ${r.members.filter(x => x !== m).map(x => `#${x.number}`).join(", ")} in #${bp.number}. Its gates run there once for all of them; when #${bp.number} merges, this head (${m.head.slice(0, 8)}) is on main and this pull request shows as merged. Do not push to this branch meanwhile.`);
        const skipped = r.skipped.length ? `; left out ${r.skipped.map(x => `#${x.number} (${x.why})`).join(", ")}` : "";
        Object.assign(out, {front: bp.number, batch: r.members.map(m => m.number), action: "batch", why: `${r.did}${skipped}`});
        save(stateFile, state);
        log(`train: batch #${bp.number} of ${out.batch.map(n => `#${n}`).join(", ")}: ${out.why}`);
        return out;
      }
      else log(`train: no batch (${r.skipped.map(x => `#${x.number} ${x.why}`).join("; ") || "nothing to add"}); #${pr.number} goes alone`);
    }
  }
  Object.assign(out, d);
  log(`train: #${pr.number} ${d.action}: ${d.why}`);
  if ( apply ) {
    if ( d.action === "leave" ) await leave(gh, pr.number, d.why);
    if ( d.action === "ready" ) {
      try { await ctx.graphql(`mutation($id: ID!) { markPullRequestReadyForReview(input: {pullRequestId: $id}) { pullRequest { isDraft } } }`, {id: full.node_id}); }
      catch (e) { await leave(gh, pr.number, `the train could not mark the draft ready (${String(e.message).slice(0, 120)}): mark it ready for review, then add the label again`); out.action = "leave"; }
    }
    if ( d.action === "prepare" ) {
      const r = await (ctx.prepare ?? prepare)(ctx, full.head.ref, head);
      // B7960 (#2121): a git fault on the runner (no identity, a locked index) is not the pull request's fault, so it
      // keeps its label and says so once per head, instead of every pull request in the line leaving in turn
      // The runner raises a pc-alert for it too (ctx.alert), since the whole line waits until the PC is fixed.
      if ( r.error && r.setup ) {
        out.action = "wait"; out.why = r.error;
        await ctx.alert?.("train-git", "the merge train cannot run git merges (runner setup fault)", `${r.error}\n\nThe pull requests keep their labels and wait. The runner log has git's full output.`);
        if ( state.setupWarned !== head ) { state.setupWarned = head; await comment(gh, pr.number, `Merge train: ${r.error}. This pull request keeps its place; the train tries again at its next step.`); }
      }
      else if ( r.error ) { await leave(gh, pr.number, r.error); out.action = "leave"; out.why = r.error; }
      else { out.why += `: ${r.did}`; await comment(gh, pr.number, `Merge train: this pull request is at the front. ${r.did}; the gates run on the new head (${r.sha.slice(0, 8)}) and it merges when its checks are green.`); }
      if ( !r.setup ) await ctx.recovered?.("train-git");
    }
    if ( d.action === "merge" ) {
      try {
        await gh("PUT", `/pulls/${pr.number}/merge`, {sha: head, merge_method: "merge", commit_title: `Merge pull request #${pr.number} from ${OWNER}/${full.head.ref} (merge train)`});
        await comment(gh, pr.number, `Merge train: merged at ${head.slice(0, 8)}. The branch is left for the owner to delete.`);
        log(`train: #${pr.number} merged`);
        await retireJobs(gh, [pr.number], head, log);
      } catch (e) { out.action = "wait"; out.why = `merge refused for now (${String(e.message).slice(0, 160)})`; log(`train: #${pr.number} ${out.why}`); }
    }
  }
  save(stateFile, out.action === "merge" || out.action === "leave" ? {} : state);
  return out;
}

/**
 * B7590: once the train has merged a pull request, its gate jobs still in the queue are closed unrun and a running one
 * is labelled pc-cancel, since no result for a merged head is used. Job #2111 started 2 s after PR 2085 merged on an
 * earlier pass (18 Nov 22:37Z): the runner's pull request cache still read it as open.
 */
export async function retireJobs(gh, prs, sha, log = () => {}) {
  const open = await gh("GET", `/issues?state=open&labels=pc-job&per_page=100`).catch(() => []);
  for ( const i of jobsFor(open, prs) ) {
    const running = (i.labels ?? []).some(l => (l.name ?? l) === "pc-running");
    await comment(gh, i.number, `PR #${i.prs} merged at ${String(sha).slice(0, 8)} on the merge train, so this gate run's result could not be used; ${running ? "cancelled" : "closed unrun"} to free the lane.`);
    if ( running ) await gh("POST", `/issues/${i.number}/labels`, {labels: ["pc-cancel"]}).catch(() => null);
    else await gh("PATCH", `/issues/${i.number}`, {state: "closed", state_reason: "not_planned"}).catch(() => null);
    log(`train: #${i.number} ${running ? "cancelled" : "closed"} (its PR merged)`);
  }
}
/** The open gate jobs of these pull requests, by the "[PR #N sha]" in their titles. Pure. */
export function jobsFor(open, prs) {
  const want = new Set(prs.map(Number));
  return (open ?? []).map(i => ({...i, prs: Number(/\[PR #(\d+) /.exec(i.title ?? "")?.[1])})).filter(i => want.has(i.prs) && !(i.labels ?? []).some(l => (l.name ?? l) === "pc-cancel"));
}
/**
 * B7449 (desk pick p5): the time since the last step that counts on the front's clock. It counts only when the clock ran
 * at both steps (no runner-hold, no planned window: prio.mjs trainClockRuns) and the steps were less than CLOCK_GAP
 * apart, so a runner that was off or restarting adds nothing. Updates state.tick and state.ticking.
 */
export const CLOCK_GAP = 15 * 60e3;
export function tick(state, runs, now = Date.now()) {
  const gap = state.tick ? now - state.tick : 0;
  const counted = runs && state.ticking !== false && gap > 0 && gap < CLOCK_GAP ? gap : 0;
  state.tick = now; state.ticking = !!runs;
  return counted;
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
    if ( !ok(m) ) {
      const f = mergeFailure(m, (await git(["diff", "--name-only", "--diff-filter=U"], dir))?.stdout);
      await git(["merge", "--abort"], dir);
      ctx.log?.(`train: git merge of main into ${ref} failed (exit ${m.status}): ${f.said}`);
      if ( f.conflict ) return {error: "main does not merge in cleanly: merge main into the branch, fix the conflict, push, then add the label again"};
      return {setup: true, error: `git on the runner could not merge main in, though nothing conflicts (${redact(f.said)}): the runner's git setup needs a fix`};
    }
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

/**
 * B7960 (#2121): tells a real merge conflict from any other git failure, from the failed merge's spawnSync result and
 * the unmerged paths (`git diff --name-only --diff-filter=U`, read before the abort). said: the last lines git printed,
 * for the log and the comment. A merge refused for a missing identity (Secondary PC, 19 Nov) is not a conflict. Pure.
 */
export function mergeFailure(m, unmerged = "") {
  const text = `${m?.stdout ?? ""}\n${m?.stderr ?? ""}`;
  const conflict = /^CONFLICT\b/m.test(text) || String(unmerged ?? "").trim() !== "";
  const said = text.split("\n").map(l => l.trim()).filter(Boolean).slice(-3).join(" ").slice(0, 300) || `git exited ${m?.status ?? "with no status"}`;
  return {conflict, said};
}

/** git's words with addresses and local paths taken out, for a comment on the public repo (the log keeps them). Pure. */
export const redact = s => String(s ?? "").replace(/[^\s'"()]+@[^\s'"()]+/g, "<address>").replace(/(?:[A-Za-z]:\\|\/(?:home|Users)\/)[^\s'"]*/g, "<path>");

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
export async function carryReviews(dir, oldHead, {other = "HEAD^2", what = "the merge with main"} = {}) {
  const MR = await import(`${pathToFileURL(path.join(dir, "tools", "release", "merge-rules.mjs")).href}?${Date.now()}`).catch(() => null);
  if ( !MR?.branchReviews || !MR?.hashOf ) return {n: 0};
  const g = MR.gitIn(dir);
  const before = g.tryRun("merge-base", oldHead, other);
  if ( !before ) return {n: 0};
  const latest = new Map();
  for ( const it of MR.branchReviews(g, before, oldHead).items ) latest.set(it.file, it);
  const files = (g.tryRun("diff", "--name-only", "--no-renames", other, "HEAD") ?? "").split("\n").filter(Boolean);
  const lines = [];
  for ( const file of files ) {
    const v = latest.get(file);
    if ( !v || !["working", "dead"].includes(v.verdict) ) continue;
    const was = g.show(oldHead, file), now = g.show("HEAD", file);
    if ( MR.hashOf(was) !== v.hash || MR.hashOf(now) === v.hash ) continue; // stale before, or still current
    const mine = ownChange(g.tryRun("diff", "-U0", "--no-renames", before, oldHead, "--", file));
    if ( !mine || mine !== ownChange(g.tryRun("diff", "-U0", "--no-renames", other, "HEAD", "--", file)) ) continue;
    lines.push({file, verdict: v.verdict, how: `carried over by the merge train after ${other === "HEAD^2" ? "main merged in" : "the merge into the batch"}: the branch's own change to this file is the same; earlier check: ${v.how}`.slice(0, 900),
      hash: MR.hashOf(now), at: new Date().toISOString().slice(0, 16) + "Z"});
  }
  if ( !lines.length ) return {n: 0};
  const reviewFiles = (g.tryRun("diff", "--name-only", before, oldHead, "--", `${MR.REVIEW_DIR}/`) ?? "").split("\n").filter(f => f.endsWith(".jsonl"));
  const target = reviewFiles[0];
  if ( !target ) return {n: 0};
  fs.appendFileSync(path.join(dir, target), lines.map(l => JSON.stringify(l)).join("\n") + "\n");
  const add = spawnSync("git", ["add", "--", target], {cwd: dir, encoding: "utf8"});
  const c = spawnSync("git", ["commit", "-q", "-m", `Merge train: carry ${lines.length} file review(s) over ${what}`], {cwd: dir, encoding: "utf8"});
  if ( add.status || c.status ) return {error: `the train could not commit the carried reviews (${(c.stderr || add.stderr || "").trim().slice(0, 160)})`};
  return {n: lines.length};
}

/* ---- B7445: batches. Up to BATCH_MAX green pull requests from the front of the line merge as one ---- */

export const BATCH_BRANCH = "claude/merge-train-batch", BATCH_MAX = 3, BATCH_LOOK = 6;
const MARK = /<!-- merge-train-batch (\[.*?\]) -->/;

/**
 * Whether a pull request may join a batch. f: the facts decide() reads, plus urgent. Its own checks must be green on its
 * head (or red only because the merge rules job waits on a gate result, B7208), its gates not red, its merge rules not
 * red for any reason but a gate result still to come (the batch brings that), and it must merge cleanly with main.
 * Returns {ok, why}.
 */
export function eligible(f) {
  if ( !f.ownBranch ) return {ok: false, why: "not the owner's claude/ branch"};
  if ( f.draft ) return {ok: false, why: "a draft"};
  if ( f.urgent ) return {ok: false, why: "urgent pull requests go alone"};
  if ( f.mergeable !== true ) return {ok: false, why: f.mergeable === false ? "a conflict with main" : "GitHub has not worked out whether it merges"};
  if ( f.gates === "failure" ) return {ok: false, why: "its gates failed"};
  const gateOnly = /^Not ready: gate result$/.test(f.mergeRulesWhy ?? "");
  if ( f.mergeRules === "failure" && !gateOnly ) return {ok: false, why: `its merge rules fail (${f.mergeRulesWhy || "no reason given"})`};
  // B7208: a merge rules job that waits on the gate result fails, and the summing checks job with it (PR 1880, 18 Nov)
  const checksOk = f.checks === "success" || (f.checks === "failure" && f.mergeRules === "failure" && gateOnly && f.otherChecksFailed === false);
  if ( !checksOk ) return {ok: false, why: `its checks are ${f.checks ?? "missing"}`};
  return {ok: true, why: ""};
}

/** The facts eligible() needs for a pull request in the line. */
async function memberFacts(gh, p) {
  const full = await gh("GET", `/pulls/${p.number}`);
  const h = full.head.sha;
  const [statuses, runs] = await Promise.all([gh("GET", `/commits/${h}/statuses?per_page=100`), gh("GET", `/commits/${h}/check-runs?per_page=100`)]);
  return {number: p.number, ref: full.head.ref, head: h, urgent: !!p.urgent, draft: !!full.draft, mergeable: full.mergeable ?? null,
    ownBranch: full.user?.login === OWNER && full.head.repo?.full_name === full.base.repo?.full_name && /^claude\//.test(full.head.ref),
    checks: checkOf(runs?.check_runs, CHECKS), gates: statusOf(statuses, GATES), mergeRules: statusOf(statuses, MERGE_RULES),
    mergeRulesWhy: (statuses ?? []).find(x => x.context === MERGE_RULES)?.description ?? "", otherChecksFailed: othersFailed(runs?.check_runs)};
}

/**
 * Builds the batch branch in the train's batch worktree (<home>/train-batch): main, then each member's head merged in
 * (never changed: when the batch merges, each member's head is on main), with its file reviews carried over where main
 * changed the same file, then one merge-stamp for all of them. A member that changes a file an earlier member changes,
 * or does not merge cleanly, is left out (it goes later, alone or in the next batch). Pushes to BATCH_BRANCH with a lease
 * (lease: the head to replace; by default whatever the branch holds now, an old batch). members: [{number, ref, head}]
 * front first. Returns {sha, members, skipped: [{number, why}], did} or {error}; fewer than two members pushes nothing.
 */
export async function buildBatch(ctx, members, {max = BATCH_MAX, lease = null, branch = BATCH_BRANCH} = {}) {
  const {git, home, repoRoot} = ctx;
  const dir = path.join(home, "train-batch");
  const ok = r => r && r.status === 0;
  const refs = members.map(m => `+refs/heads/${m.ref}:refs/remotes/origin/${m.ref}`);
  if ( !ok(await git(["fetch", "-q", "origin", "main", ...refs], repoRoot)) ) return {error: "the train could not fetch main and the batch's branches"};
  if ( !fs.existsSync(path.join(dir, ".git")) && !ok(await git(["worktree", "add", "--detach", "-f", dir, "origin/main"], repoRoot)) ) return {error: "the train could not make its batch worktree"};
  await git(["merge", "--abort"], dir);
  if ( !ok(await git(["checkout", "-q", "-f", "--detach", "origin/main"], dir)) ) return {error: "the train could not check out main"};
  await git(["clean", "-q", "-fd"], dir);
  const taken = new Set(), chosen = [], skipped = [];
  for ( const m of members ) {
    if ( chosen.length >= max ) break;
    const mb = (await git(["merge-base", "origin/main", m.head], dir)).stdout?.trim();
    if ( !mb ) { skipped.push({number: m.number, why: `its head ${m.head.slice(0, 8)} was not fetched`}); continue; }
    const files = String((await git(["diff", "--name-only", "--no-renames", mb, m.head], dir)).stdout ?? "").split("\n").filter(Boolean);
    const both = files.filter(f => taken.has(f));
    if ( both.length ) { skipped.push({number: m.number, why: `it changes ${both.slice(0, 3).join(", ")}${both.length > 3 ? " and more" : ""}, as an earlier one in the batch does`}); continue; }
    const before = (await git(["rev-parse", "HEAD"], dir)).stdout.trim();
    const mg = await git(["merge", "--no-ff", "--no-edit", "-m", `Merge #${m.number} (${m.ref}) into the batch (merge train)\n\nMerge-Train: yes`, m.head], dir);
    if ( !ok(mg) ) {
      const f = mergeFailure(mg, (await git(["diff", "--name-only", "--diff-filter=U"], dir))?.stdout);
      await git(["merge", "--abort"], dir); await git(["reset", "-q", "--hard", before], dir);
      ctx.log?.(`train: git merge of #${m.number} into the batch failed (exit ${mg.status}): ${f.said}`);
      skipped.push({number: m.number, why: f.conflict ? "it does not merge cleanly into the batch" : `git could not merge it into the batch, though nothing conflicts (${redact(f.said)})`});
      continue;
    }
    const carried = await carryReviews(dir, m.head, {other: "HEAD^1", what: `the merge of #${m.number} into the batch`});
    if ( carried.error ) { await git(["reset", "-q", "--hard", before], dir); skipped.push({number: m.number, why: carried.error}); continue; }
    for ( const f of files ) taken.add(f);
    chosen.push({...m, carried: carried.n ?? 0});
  }
  const names = chosen.map(m => `#${m.number}`).join(", ");
  if ( chosen.length < 2 ) return {members: chosen, skipped};
  const st = spawnSync(process.execPath, [path.join(dir, "tools", "release", "merge-stamp.mjs"), "--commit", "--no-fetch"], {cwd: dir, encoding: "utf8", windowsHide: true});
  if ( st.status !== 0 ) return {error: `merge-stamp refused the batch of ${names}: ${(st.stdout + st.stderr).trim().split("\n").slice(-4).join(" ").slice(0, 400)}`};
  const stamped = /Committed\./.test(st.stdout);
  if ( stamped ) await git(["commit", "--amend", "-q", "--no-edit", "--trailer", "Merge-Train: yes"], dir);
  const sha = (await git(["rev-parse", "HEAD"], dir)).stdout.trim();
  const now = lease ?? (String((await git(["ls-remote", "origin", `refs/heads/${branch}`], dir)).stdout ?? "").split(/\s/)[0] || "");
  const p = await git(["push", "-q", "origin", `HEAD:refs/heads/${branch}`, `--force-with-lease=refs/heads/${branch}:${now}`], dir);
  if ( !ok(p) ) return {error: `the push to ${branch} was refused (${String(p.stderr ?? "").trim().slice(0, 200)})`};
  const carried = chosen.reduce((n, m) => n + m.carried, 0);
  return {sha, members: chosen, skipped, did: [`${names} merged onto main`, carried ? `${carried} file review(s) carried over` : "", stamped ? "release notes stamped once" : ""].filter(Boolean).join(", ")};
}

const batchTitle = ms => `Merge train batch: ${ms.map(m => `#${m.number}`).join(", ")}`;
function batchBody(r) {
  const list = r.members.map(m => `- #${m.number} at ${m.head.slice(0, 8)} (${m.ref})`).join("\n");
  const keep = r.members.map(({number, ref, head}) => ({number, ref, head}));
  return `The merge train (B7445) put these pull requests together, so they are brought up to date, stamped and gated once instead of one after another:\n\n${list}\n\nEach head is merged in unchanged, so when this pull request merges each of them shows as merged too. If the checks or gates fail here, the train closes this pull request and tries again with half as many (in the end one at a time), so the one that fails is found and leaves the train with the reason.\n\n<!-- merge-train-batch ${JSON.stringify(keep)} -->\n\n---\n_Generated by [Claude Code](https://claude.ai/code)_`;
}

/** Opens the batch pull request, or updates the open one on the batch branch. Returns the pull request. */
async function openBatch(gh, r) {
  const open = await gh("GET", `/pulls?state=open&head=${OWNER}:${BATCH_BRANCH}`).catch(() => []);
  const was = Array.isArray(open) ? open[0] : null;
  if ( was ) return gh("PATCH", `/pulls/${was.number}`, {title: batchTitle(r.members), body: batchBody(r)});
  return gh("POST", "/pulls", {title: batchTitle(r.members), head: BATCH_BRANCH, base: "main", body: batchBody(r), maintainer_can_modify: false});
}

/** An open batch pull request the state file lost (a restart): its members come from the mark in its body. */
export async function adoptBatch(gh) {
  const open = await gh("GET", `/pulls?state=open&head=${OWNER}:${BATCH_BRANCH}`).catch(() => null);
  const p = Array.isArray(open) ? open[0] : null;
  const m = p && MARK.exec(p.body ?? "");
  if ( !m ) return null;
  try { return {pr: p.number, head: p.head.sha, members: JSON.parse(m[1]), since: Date.now()}; } catch { return null; }
}

/**
 * One step for the batch in flight (state.batch: {pr, head, members, since}). Returns the step's result, or null when
 * the batch is gone and the line goes on as usual. Merged: each member is told (after up to two more steps for GitHub
 * to mark it merged). A member that left the line or was pushed to, or an urgent pull request at the front: the batch
 * is closed and built again. Main moved: built again on the new main. Red, or no green result in maxHours: closed,
 * and the next batch takes half as many (state.maxBatch), down to one at a time.
 */
export async function batchStep(ctx, state, order) {
  const {gh, apply = false, maxHours = 3} = ctx;
  const b = state.batch;
  const n = b.members.length, nums = b.members.map(m => `#${m.number}`).join(", ");
  const res = (action, why) => ({front: b.pr, batch: b.members.map(m => m.number), action, why});
  const bp = await gh("GET", `/pulls/${b.pr}`);
  const close = async why => { if ( apply ) { await comment(gh, b.pr, `Merge train: closing this batch because ${why}.`); await gh("PATCH", `/pulls/${b.pr}`, {state: "closed"}).catch(() => null); } };
  if ( bp.merged ) {
    const ps = await Promise.all(b.members.map(m => gh("GET", `/pulls/${m.number}`).catch(() => null)));
    const open = b.members.filter((m, i) => !ps[i]?.merged);
    b.waits = (b.waits ?? 0) + 1;
    if ( open.length && b.waits < 3 ) return res("wait", `merged; waiting for GitHub to mark ${open.map(m => `#${m.number}`).join(", ")} merged`);
    if ( apply ) for ( const m of b.members ) {
      if ( !open.includes(m) ) await comment(gh, m.number, `Merge train: merged to main with batch #${b.pr} at ${m.head.slice(0, 8)}. The branch is left for the owner to delete.`);
      else { await comment(gh, m.number, `Merge train: this head (${m.head.slice(0, 8)}) is on main through batch #${b.pr}, but GitHub has not marked this pull request merged; close it by hand.`); await gh("DELETE", `/issues/${m.number}/labels/${TRAIN_LABEL}`).catch(() => null); }
    }
    for ( const k of Object.keys(state) ) delete state[k];
    return res("merged", `batch of ${nums} merged${open.length ? `; ${open.map(m => `#${m.number}`).join(", ")} not marked merged by GitHub` : ""}`);
  }
  if ( bp.state === "closed" ) { delete state.batch; return null; }
  const inLine = new Map(order.map(p => [p.number, p]));
  const gone = [];
  for ( const m of b.members ) {
    if ( !inLine.has(m.number) ) { gone.push(`#${m.number} left the line`); continue; }
    const p = await gh("GET", `/pulls/${m.number}`).catch(() => null);
    if ( p?.head?.sha && p.head.sha !== m.head ) gone.push(`#${m.number} has a new head (${p.head.sha.slice(0, 8)})`);
  }
  const first = order[0];
  if ( first?.urgent && !b.members.some(m => m.number === first.number) ) gone.push(`#${first.number} is urgent`);
  if ( gone.length ) {
    if ( !apply ) return res("wait", `would close: ${gone.join(", ")}`);
    await close(`${gone.join(", ")}; the train builds a new batch`); delete state.batch; return null;
  }
  const cmp = await gh("GET", `/compare/${bp.base.ref}...${bp.head.sha}`);
  if ( (cmp.behind_by ?? 0) > 0 ) {
    if ( !apply ) return res("prepare", `behind main by ${cmp.behind_by}: would build the batch again`);
    const r = await (ctx.build ?? buildBatch)(ctx, b.members, {max: n, lease: bp.head.sha});
    if ( r.error || r.members?.length !== n ) { await close(r.error ?? `not all of ${nums} merge onto the new main`); delete state.batch; return null; }
    await gh("PATCH", `/pulls/${b.pr}`, {body: batchBody(r)}).catch(() => null);
    Object.assign(b, {head: r.sha, since: Date.now(), ran: 0});
    return res("prepare", `main moved: built again (${r.did}); the gates run on ${r.sha.slice(0, 8)}`);
  }
  const head = bp.head.sha;
  if ( b.head !== head ) Object.assign(b, {head, since: Date.now(), ran: 0});
  const [statuses, runs] = await Promise.all([gh("GET", `/commits/${head}/statuses?per_page=100`), gh("GET", `/commits/${head}/check-runs?per_page=100`)]);
  const d = decide({draft: false, mergeable: bp.mergeable ?? null, behind: 0, fragments: 0, ownBranch: true,
    checks: checkOf(runs?.check_runs, CHECKS), mergeRules: statusOf(statuses, MERGE_RULES), gates: statusOf(statuses, GATES),
    mergeRulesWhy: (statuses ?? []).find(x => x.context === MERGE_RULES)?.description ?? "", otherChecksFailed: othersFailed(runs?.check_runs),
    frontFor: b.ran ?? 0}, {maxHours});
  if ( d.action === "merge" ) {
    if ( !apply ) return res("merge", d.why);
    try { await gh("PUT", `/pulls/${b.pr}/merge`, {sha: head, merge_method: "merge", commit_title: `Merge pull request #${b.pr}: ${nums} (merge train batch)`}); }
    catch (e) { return res("wait", `merge refused for now (${String(e.message).slice(0, 160)})`); }
    await retireJobs(gh, [b.pr, ...(String(nums).match(/\d+/g) ?? []).map(Number)], head, ctx.log ?? (() => {}));
    return res("merge", `merged at ${head.slice(0, 8)}; ${nums} follow`);
  }
  if ( d.action === "leave" ) {
    const next = Math.ceil(n / 2);
    await close(`${d.why.replace(/: fix them.*$|: see the merge rules.*$|: look at the gate job.*$/, "")}. The next batch takes ${next === 1 ? "the front alone" : `${next} at most`}, so the one that fails is found`);
    if ( apply ) { delete state.batch; state.maxBatch = next; }
    return res("split", d.why);
  }
  return res("wait", d.why);
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
