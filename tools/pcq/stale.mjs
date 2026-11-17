/**
 * B7205: a gates job queued for one commit of a pull request is worth nothing once the pull request moves on to a newer
 * commit, merges or closes. pr-gates.mjs already closes such jobs while they wait; these helpers let the runner drop
 * one it is about to start (for example a job queued again after a runner restart) and stop one that is running.
 */

/** The pull request and commit a job's title names ("[PR #12 abcdef123456]"), or null. */
export function prMark(title) {
  const m = /\[PR #(\d+) ([0-9a-f]{7,40})\]/.exec(title ?? "");
  return m ? {pr: Number(m[1]), sha: m[2]} : null;
}

/** Why the job is stale, or null while its commit is still the pull request's head (or nothing is known). */
export function staleWhy(mark, pull) {
  if ( !mark || !pull ) return null;
  if ( pull.state && pull.state !== "open" ) return `PR #${mark.pr} is ${pull.merged_at || pull.merged ? "merged" : "closed"}`;
  const head = String(pull.head?.sha ?? "");
  if ( !head ) return null;
  return head.startsWith(mark.sha) ? null : `PR #${mark.pr} moved on to ${head.slice(0, 8)}`;
}
