#!/usr/bin/env node
/**
 * B8130: the push guard. A push to a pull request labelled merge-train takes it out of the train (B7332), and 6 of the
 * 32 pull requests ejected between 17 and 25 November left that way because a thread pushed after labelling. This
 * pre-push hook asks GitHub, before the push leaves, whether the branch's open pull request carries the label, and
 * refuses the push when it does. Take the label off first (the train then forgets it), push, and label again.
 *
 * Let through: a push whose new commits all carry the train's trailer "Merge-Train: yes" (the train's own merge and
 * stamp), WODX_PUSH_GUARD=off for a one-off, and any push when GitHub cannot be asked (offline: the train still
 * ejects as before, so the guard only ever saves a round trip). Git runs it through tools/git-hooks/pre-push once
 * core.hooksPath is tools/git-hooks; tools/git-hooks/install.mjs sets that, and review.mjs, claim.mjs and
 * merge-stamp.mjs call it, so every thread's clone has it by the time it labels.
 */
import {execFileSync} from "node:child_process";
import path from "node:path";
import {fileURLToPath} from "node:url";

export const REPO = "thebadman7824/wodx", OWNER = "thebadman7824", LABEL = "merge-train";
const ZERO = /^0+$/;

/** The branch pushes from git's pre-push stdin: [{branch, local, remote}], deletes left out. Pure. */
export function readPushes(stdin) {
  return String(stdin ?? "").split("\n").map(l => l.trim().split(/\s+/)).filter(p => p.length === 4)
    .map(([, local, ref, remote]) => ({branch: /^refs\/heads\/(.+)$/.exec(ref)?.[1] ?? null, local, remote}))
    .filter(p => p.branch && !ZERO.test(p.local));
}

/** Whether every new commit's message carries the train's trailer. Pure. */
export const trainOnly = messages => messages.length > 0 && messages.every(m => /^Merge-Train: yes$/m.test(m));

/**
 * The refusal for one push, or null. pr: the branch's open pull request ({number, labels}) or null; messages: the
 * new commits' messages. Pure.
 */
export function refusal(push, pr, messages) {
  if ( !pr || !(pr.labels ?? []).some(l => (l.name ?? l) === LABEL) ) return null;
  if ( trainOnly(messages) ) return null;
  return `Push refused: ${push.branch} is pull request #${pr.number}, which is labelled ${LABEL}. A push now takes it out of the train (B7332).\n`
    + `Take the label off first, push, then add it again when the branch is done (docs/WORKFLOW.md, section 6).\n`
    + `To push anyway, once: WODX_PUSH_GUARD=off git push ...`;
}

async function openPr(branch) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/pulls?state=open&head=${OWNER}:${encodeURIComponent(branch)}&per_page=5`,
      {headers: {accept: "application/vnd.github+json", "user-agent": "wodx-push-guard", ...(token ? {authorization: `Bearer ${token}`} : {})}, signal: ctl.signal});
    if ( !r.ok ) return undefined;
    const list = await r.json();
    return Array.isArray(list) ? list.find(p => p.head?.ref === branch) ?? null : undefined;
  } catch { return undefined; } finally { clearTimeout(t); }
}

function newMessages(push) {
  const range = ZERO.test(push.remote) ? [push.local, "--not", "--remotes=origin"] : [`${push.remote}..${push.local}`];
  try { return execFileSync("git", ["log", "--format=%B%x00", ...range], {encoding: "utf8"}).split("\0").map(s => s.trim()).filter(Boolean); }
  catch { return []; }
}

async function main() {
  if ( /^(off|0|no)$/i.test(process.env.WODX_PUSH_GUARD ?? "") ) process.exit(0);
  const url = process.argv[3] ?? "";
  if ( !url.includes(REPO) ) process.exit(0); // only this repository's pull requests are in the train
  let stdin = "";
  for await ( const c of process.stdin ) stdin += c;
  for ( const push of readPushes(stdin) ) {
    const pr = await openPr(push.branch);
    if ( pr === undefined ) { console.error(`push guard: could not ask GitHub about ${push.branch}; pushing without the check`); continue; }
    const why = refusal(push, pr, pr ? newMessages(push) : []);
    if ( why ) { console.error(why); process.exit(1); }
  }
}

if ( process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ) main();
