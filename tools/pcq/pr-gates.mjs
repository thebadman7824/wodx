#!/usr/bin/env node
/**
 * Queues a pull request's gates on the PC job queue (B7010). Run by .github/workflows/pc-gates.yml on the self-hosted
 * runner on the Secondary PC, in a checkout of the pull request's head, so threads no longer queue gates by hand.
 * The PC runner posts the result as the "wodx/gates" commit status (runner.mjs, B7000); this script never posts that
 * status, so it keeps one writer.
 *
 *   node tools/pcq/pr-gates.mjs [--dry]
 * Reads PR_NUMBER and GITHUB_TOKEN from the workflow and the rest (head, title, labels) from the live pull request.
 * The pc-job issue is opened with the owner's token from Git Credential Manager on the PC, because the PC runner only
 * takes jobs the owner's account opened; GITHUB_TOKEN is only used for the comment on the pull request.
 *
 * It queues nothing when:
 *   - the pull request is a hold or handoff (title starts "HOLD" or "Handoff", a label hold/handoff, a handoff/ branch)
 *   - run-gate.mjs --touched --list finds no gate for the change
 *   - an earlier commit of the pull request has a passing wodx/gates status and no module, system or gate file differs
 *     from it (version stamps ignored, the same test merge-rules.mjs uses), so stamp commits start nothing
 *   - a job for this exact commit is already queued or running
 * A queued job for an older commit of the same pull request that has not started is closed as superseded.
 * Exit 0 when it queued or skipped, 1 on a fault.
 */
import fs from "node:fs";
import path from "node:path";
import {spawnSync, execFileSync} from "node:child_process";
import {fileURLToPath, pathToFileURL} from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../..");
const REPO = "thebadman7824/wodx", GATE_CONTEXT = "wodx/gates", INPUTS = ["modules", "system", "tools/gate"];
const DRY = process.argv.includes("--dry");
const env = k => process.env[k] ?? "";
const summary = [];
const say = s => { console.log(s); summary.push(s); };
const finish = code => {
  if ( process.env.GITHUB_STEP_SUMMARY ) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary.map(s => `${s}\n`).join("") + "\n");
  process.exit(code);
};

/** True when the pull request is a hold or handoff and its gates should not be queued by themselves. */
export function isHold({title = "", labels = [], headRef = ""}) {
  if ( /^\s*\[?\s*(HOLD|handoff)\b/i.test(title) ) return true;
  if ( labels.some(l => /^(hold|handoff|do not merge)$/i.test(l)) ) return true;
  return /(^|\/)handoff\//i.test(headRef);
}

/** The gate names from run-gate.mjs --list output ("GATES [...]"), or [] when the change needs none. */
export function parseGates(out) {
  const m = /^GATES (\[.*\])\s*$/m.exec(out ?? "");
  return m ? JSON.parse(m[1]).filter(g => /^[\w-]+$/.test(g)) : [];
}

/** The newest earlier commit with a passing wodx/gates status whose gate inputs match the head, or null. */
export function priorPass(candidates, sameAt) {
  for ( const c of candidates ) {
    const s = (c.statuses ?? []).find(x => x.context === GATE_CONTEXT);
    if ( s?.state === "success" && sameAt(c.sha) ) return c.sha;
  }
  return null;
}

/** Marker in the job issue title that ties it to the pull request and commit. */
export const marker = (pr, sha) => `[PR #${pr} ${String(sha).slice(0, 12)}]`;

/**
 * B7331: the pull request's gate jobs that are for an older commit than head: {close} not started yet (closed unrun),
 * {cancel} already running (labelled pc-cancel, so the runner ends them). A newer push makes their result useless,
 * and a stale run held a lane for up to two hours (10.7 lane-hours in the week to 18 Nov).
 */
export function staleJobs(open, pr, head) {
  const mine = (open ?? []).filter(i => i.title?.includes(`[PR #${pr} `) && !i.title.includes(marker(pr, head)));
  const running = i => (i.labels ?? []).some(l => (l.name ?? l) === "pc-running");
  const cancelled = i => (i.labels ?? []).some(l => (l.name ?? l) === "pc-cancel");
  return {close: mine.filter(i => !running(i)), cancel: mine.filter(i => running(i) && !cancelled(i))};
}

/** B7332: a commit the merge train made (its merge of main, its carried reviews, or a stamp it marked). */
export const TRAIN_TRAILER = "Merge-Train: yes";

/**
 * B7390: whether the merge-train label was on when the push happened: the newest "labeled" event for it is at or
 * before pushedAt (an ISO time). With no time to go by, it counts as on (the B7332 behaviour).
 */
export function labelledBefore(events, pushedAt) {
  const at = (events ?? []).filter(e => e.event === "labeled" && e.label?.name === "merge-train").map(e => Date.parse(e.created_at)).filter(Number.isFinite);
  if ( !at.length ) return false;
  const push = Date.parse(pushedAt ?? "");
  return !Number.isFinite(push) || Math.max(...at) <= push;
}
export const isTrainCommit = msg => /\(merge train\)|^Merge train: /m.test(msg) || msg.includes(TRAIN_TRAILER);
/**
 * B7332: whether the commits a push added (oldest first) are the train's own. A stamp right after a train commit counts
 * (merge-stamp writes it in the train's worktree); anything else is a push from outside the train.
 */
export function isTrainPush(messages) {
  if ( !messages?.length ) return false;
  let train = false;
  for ( const m of messages ) {
    if ( isTrainCommit(m) ) { train = true; continue; }
    if ( train && /^Stamp versions, changelogs and decisions for merge/.test(m) ) continue;
    return false;
  }
  return train;
}

function ownerToken() {
  const r = spawnSync("git", ["credential", "fill"], {input: "protocol=https\nhost=github.com\n\n", encoding: "utf8", windowsHide: true, env: {...process.env, GCM_INTERACTIVE: "never"}});
  const t = /^password=(.+)$/m.exec(r.stdout ?? "")?.[1];
  if ( !t ) throw new Error("no owner token from git credential fill");
  return t;
}

async function api(token, method, p, body) {
  const r = await fetch(`https://api.github.com/repos/${REPO}${p}`, {method,
    headers: {Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "wodx-pr-gates"},
    body: body ? JSON.stringify(body) : undefined});
  if ( !r.ok ) throw new Error(`${method} ${p}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.status === 204 ? null : r.json();
}

/** sameAt from merge-rules.mjs when it is there (it ignores version stamps), else a plain diff of the input folders. */
async function sameAtFn(headSha) {
  const git = (...a) => execFileSync("git", a, {cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]}).trim();
  const mr = path.join(ROOT, "tools", "release", "merge-rules.mjs");
  let normalise = null;
  if ( fs.existsSync(mr) ) { try { normalise = (await import(pathToFileURL(mr).href)).normalise ?? null; } catch {} }
  return sha => {
    let names;
    try { names = git("diff", "--name-only", sha, headSha, "--", ...INPUTS).split("\n").filter(Boolean); } catch { return false; }
    if ( !names.length ) return true;
    if ( !normalise ) return false;
    const show = (s, f) => { try { return git("show", `${s}:${f}`); } catch { return null; } };
    return names.every(f => { const a = show(sha, f), b = show(headSha, f); return a !== null && b !== null && normalise(a) === normalise(b); });
  };
}

async function main() {
  const pr = Number(env("PR_NUMBER"));
  if ( !Number.isInteger(pr) || pr <= 0 ) { console.error("PR_NUMBER is needed"); finish(1); }
  const owner = ownerToken();
  const p = await api(env("GITHUB_TOKEN") || owner, "GET", `/pulls/${pr}`);
  const head = p.head?.sha ?? "", headRef = p.head?.ref ?? "", title = p.title ?? "", labels = (p.labels ?? []).map(l => l.name);
  // The same lock-down as the workflow's if: and the runner's job hook, checked once more on the live pull request
  if ( p.state !== "open" || p.head?.repo?.full_name !== REPO || p.user?.login !== "thebadman7824" || !headRef.startsWith("claude/") ) {
    say(`PR #${pr} is not an open owner pull request from a claude/ branch of this repository: nothing queued.`); finish(0);
  }
  const checkedOut = execFileSync("git", ["rev-parse", "HEAD"], {cwd: ROOT, encoding: "utf8"}).trim();
  if ( checkedOut !== head ) { say(`PR #${pr} moved on (${head.slice(0, 8)}, checkout ${checkedOut.slice(0, 8)}): the newer run queues it.`); finish(0); }

  // B7332: a push from outside the train to a pull request in the merge train takes it out of the train at once, so
  // the train never gates or merges code a thread changed after saying it was done.
  const before = env("BEFORE_SHA");
  if ( labels.includes("merge-train") && /^[0-9a-f]{40}$/.test(before) && before !== head ) {
    const cmp = await api(owner, "GET", `/compare/${before}...${head}`).catch(() => null);
    const msgs = cmp?.status === "ahead" ? (cmp.commits ?? []).map(c => c.commit?.message ?? "") : null;
    // B7390: only a push made while the label was on counts. A thread that takes the label off, pushes and labels
    // again is following the rule (PR 1880, 18 Nov: pushed 15:37, re-labelled 15:37:41, ejected 15:37:55 by B7332).
    const events = await api(owner, "GET", `/issues/${pr}/events?per_page=100`).catch(() => []);
    const lastCommit = (cmp?.commits ?? []).at(-1)?.commit?.committer?.date ?? null;
    const pushedAt = env("EVENT_AT") || lastCommit;
    if ( (!msgs || !isTrainPush(msgs)) && labelledBefore(events, pushedAt) ) {
      const why = msgs ? `${msgs.length} commit(s) pushed from outside the train` : "the branch was rewritten";
      say(`PR #${pr}: ${why} while it was in the merge train; taking it out of the train.`);
      if ( !DRY ) {
        await api(owner, "POST", `/issues/${pr}/comments`, {body: `Merge train: this pull request left the train because ${why} (${before.slice(0, 8)} to ${head.slice(0, 8)}) while it was labelled merge-train, and the train must not gate or merge code that changed after the label went on. Finish pushing, then add the label again.\n\n---\n_Generated by [Claude Code](https://claude.ai/code)_`});
        await api(owner, "DELETE", `/issues/${pr}/labels/merge-train`).catch(() => null);
      }
    }
  }

  // B7331: gate jobs for this pull request's older commits are closed (not started) or cancelled (running): their
  // result could not be used, and a running one held a lane for up to two hours
  const open = await api(owner, "GET", `/issues?state=open&labels=pc-job&per_page=100`);
  const stale = staleJobs(open, pr, head);
  for ( const i of stale.close ) {
    say(`Closing #${i.number}: superseded by ${head.slice(0, 8)}`);
    if ( !DRY ) {
      await api(owner, "POST", `/issues/${i.number}/comments`, {body: `Superseded by a newer commit (${head.slice(0, 8)}) of PR #${pr}; not run.`});
      await api(owner, "PATCH", `/issues/${i.number}`, {state: "closed", state_reason: "not_planned"});
    }
  }
  for ( const i of stale.cancel ) {
    say(`Cancelling #${i.number}: running on an older commit than ${head.slice(0, 8)}`);
    if ( !DRY ) {
      await api(owner, "POST", `/issues/${i.number}/comments`, {body: `PR #${pr} moved on to ${head.slice(0, 8)} while this ran, so its result could not be used; cancelled to free the lane.`});
      await api(owner, "POST", `/issues/${i.number}/labels`, {labels: ["pc-cancel"]});
    }
  }

  if ( isHold({title, labels, headRef}) ) { say(`PR #${pr} is a hold or handoff: no gates queued.`); finish(0); }

  const list = spawnSync(process.execPath, [path.join(ROOT, "tools", "lanes", "run-gate.mjs"), "--touched", "--list", "--base", "origin/main", "--repo", ROOT], {cwd: ROOT, encoding: "utf8", windowsHide: true});
  if ( list.status !== 0 ) { console.error((list.stderr || list.stdout || "").slice(-1500)); say("run-gate.mjs --touched --list failed"); finish(1); }
  const gates = parseGates(list.stdout);
  if ( !gates.length ) { say(`PR #${pr}: nothing in this change needs a gate.`); finish(0); }

  const commits = (await api(owner, "GET", `/pulls/${pr}/commits?per_page=100`)).map(c => c.sha).filter(s => s !== head).reverse();
  const candidates = [];
  for ( const sha of commits.slice(0, 30) ) candidates.push({sha, statuses: await api(owner, "GET", `/commits/${sha}/statuses?per_page=100`)});
  const passed = priorPass(candidates, await sameAtFn(head));
  if ( passed ) { say(`PR #${pr}: ${GATE_CONTEXT} already passed on ${passed.slice(0, 8)} and no module, system or gate file changed since: nothing queued.`); finish(0); }

  // A job for this exact commit already queued or running
  if ( open.some(i => i.title.includes(marker(pr, head))) ) { say(`PR #${pr}: a job for ${head.slice(0, 8)} is already queued.`); finish(0); }

  const sub = spawnSync(process.execPath, [path.join(HERE, "submit.mjs"), "gates", "--touched", "--ref", head, "--prio", "2", "--json"], {cwd: ROOT, encoding: "utf8", windowsHide: true});
  if ( sub.status !== 0 ) { console.error((sub.stderr || sub.stdout || "").slice(-1500)); say("submit.mjs refused the job"); finish(1); }
  const job = JSON.parse(sub.stdout.slice(sub.stdout.indexOf("{")));
  const issue = {title: `PC job: gates touched ${marker(pr, head)}`, labels: ["pc-job"],
    body: `Queued by pc-gates.yml for PR #${pr} (${gates.length} gate(s)).\n\n\`\`\`json\n${JSON.stringify(job, null, 1)}\n\`\`\`\n`};
  if ( DRY ) { say(`DRY: would open "${issue.title}" with ${JSON.stringify(job)}`); finish(0); }
  const made = await api(owner, "POST", "/issues", issue);
  say(`PR #${pr}: queued ${gates.length} gate(s) for ${head.slice(0, 8)} as #${made.number}. The result arrives as the ${GATE_CONTEXT} status.`);
  const gh = env("GITHUB_TOKEN");
  if ( gh ) await api(gh, "POST", `/issues/${pr}/comments`, {body: `Gates queued for ${head.slice(0, 8)}: #${made.number} (${gates.length} gate(s)). The result will show as the \`${GATE_CONTEXT}\` check.`}).catch(e => console.log(`PR comment failed: ${e.message}`));
  finish(0);
}

if ( import.meta.url === pathToFileURL(process.argv[1] ?? "").href ) main().catch(e => { console.error(e.message); say(`fault: ${e.message}`); finish(1); });
