#!/usr/bin/env node
/**
 * Stale pull request sweeper (B4110). Old pull requests sat open for days because CI never ran on them: a branch far
 * behind main, a merge conflict, or a push that started no run. Every hour the PC runner sweeps every open pull
 * request of the owner's:
 *   - conflict (GitHub says it cannot merge): stuck, its thread must merge main by hand
 *   - behind main, last commit over 2 hours old: main is merged in (GitHub's update-branch, a merge, never a rebase);
 *     the push starts CI. A refusal (a conflict) makes it stuck
 *   - up to date but no CI run on its head, last commit over 30 minutes old and nothing queued: CI is started
 *     (workflow_dispatch of checks.yml on the branch). Still no run at the next sweep: stuck
 * The stuck ones are listed in one issue labelled pc-alert ("Stale pull requests"), updated each sweep and closed when
 * none are left. CI that ran and failed is listed there too, for the thread to fix; the sweeper changes nothing for it.
 * It runs with Ben's GitHub sign-in on the PC, because a push made with the workflow token starts no CI.
 *
 *   node tools/pcq/sweep.mjs            what it would do
 *   node tools/pcq/sweep.mjs --apply    do it (the runner does this every hour)
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {OWNER, LABEL} from "./jobs.mjs";

export const HOUR = 3600e3;
const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * What to do with one pull request. p: {number, mergeable, behind, checks, running, headAge (ms), failed, tried}
 * (tried: CI was started for this same head at an earlier sweep). Returns {action, why}; action is one of update,
 * dispatch, stuck, red, wait, ok.
 */
export function classify(p) {
  if ( p.mergeable === false ) return {action: "stuck", why: "merge conflict with main: its thread must merge main and fix the conflict"};
  if ( p.behind > 0 ) {
    if ( p.headAge < 2 * HOUR ) return {action: "wait", why: `behind main by ${p.behind}, last commit under 2 hours old`};
    return {action: "update", why: `behind main by ${p.behind} commit(s)`};
  }
  if ( p.running ) return {action: "wait", why: "CI is running"};
  if ( !p.checks ) {
    if ( p.tried ) return {action: "stuck", why: "no CI run even after it was started at the last sweep"};
    if ( p.headAge < HOUR / 2 ) return {action: "wait", why: "no CI yet, last commit under 30 minutes old"};
    return {action: "dispatch", why: "up to date with main but no CI run on its head"};
  }
  if ( p.failed ) return {action: "red", why: `CI failed (${p.failed}): its thread must fix it`};
  return {action: "ok", why: "CI ran"};
}

/** One sweep. gh(method, url, body) is the runner's GitHub call for the repository. Returns the summary text. */
export async function sweep(gh, {apply = false, log = console.log, stateFile = null} = {}) {
  const state = stateFile && fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, "utf8")) : {tried: {}};
  const prs = [];
  for ( let page = 1; page < 10; page++ ) {
    const list = await gh("GET", `/pulls?state=open&per_page=100&page=${page}`);
    prs.push(...list.filter(p => p.user?.login === OWNER));
    if ( list.length < 100 ) break;
  }
  const rows = [], tried = {};
  for ( const pr of prs ) {
    let full = await gh("GET", `/pulls/${pr.number}`);
    for ( let i = 0; i < 4 && full.mergeable === null; i++ ) { await sleep(3000); full = await gh("GET", `/pulls/${pr.number}`); }
    const sha = full.head.sha;
    const [cmp, runs, commit, wf] = await Promise.all([
      gh("GET", `/compare/${full.base.ref}...${sha}`),
      gh("GET", `/commits/${sha}/check-runs?per_page=100`),
      gh("GET", `/commits/${sha}`),
      gh("GET", `/actions/runs?branch=${encodeURIComponent(full.head.ref)}&per_page=5`)]);
    const checks = runs.total_count ?? 0;
    const running = (runs.check_runs ?? []).some(c => c.status !== "completed") || (wf.workflow_runs ?? []).some(r => r.status !== "completed");
    const failedRuns = (runs.check_runs ?? []).filter(c => c.status === "completed" && ["failure", "timed_out"].includes(c.conclusion));
    const p = {number: pr.number, mergeable: full.mergeable, behind: cmp.behind_by, checks, running, failed: failedRuns.map(c => c.name).join(", "),
      headAge: Date.now() - Date.parse(commit.commit.committer.date), tried: state.tried?.[pr.number] === sha};
    let {action, why} = classify(p);
    if ( apply && action === "update" ) {
      try { await gh("PUT", `/pulls/${pr.number}/update-branch`, {expected_head_sha: sha}); why += ": main merged in, CI starts on the push"; }
      catch (e) { action = "stuck"; why = `behind main and main could not be merged in (${String(e.message).slice(0, 120)}): its thread must merge main by hand`; }
    }
    if ( apply && action === "dispatch" ) {
      try { await gh("POST", "/actions/workflows/checks.yml/dispatches", {ref: full.head.ref}); tried[pr.number] = sha; why += ": CI started"; }
      catch (e) { action = "stuck"; why = `no CI run, and starting it failed (${String(e.message).slice(0, 120)})`; }
    }
    rows.push({number: pr.number, title: full.title, ref: full.head.ref, action, why});
    log(`#${pr.number} ${action}: ${why}`);
  }
  if ( apply && stateFile ) fs.writeFileSync(stateFile, JSON.stringify({at: new Date().toISOString(), tried}, null, 1));
  const stuck = rows.filter(r => r.action === "stuck"), red = rows.filter(r => r.action === "red");
  const fixed = rows.filter(r => r.action === "update" || r.action === "dispatch");
  const line = r => `- #${r.number} ${r.title.slice(0, 80)} (${r.ref}): ${r.why}`;
  const body = [`Swept ${new Date().toISOString().slice(0, 16)}Z: ${rows.length} open pull request(s).`, "",
    stuck.length ? `**Stuck (${stuck.length})**, a thread must act:` : "Nothing stuck.", ...stuck.map(line), "",
    ...(red.length ? [`CI failed (${red.length}):`, ...red.map(line), ""] : []),
    ...(fixed.length ? [`Moved on this sweep (${fixed.length}):`, ...fixed.map(line), ""] : []),
    "The PC runner sweeps every hour (tools/pcq/sweep.mjs) and closes this issue when nothing is stuck or red."].join("\n");
  if ( apply ) {
    const open = (await gh("GET", `/issues?state=open&labels=${LABEL.alert}&per_page=100`)).find(i => i.title === "PC runner alert: stale pull requests");
    if ( stuck.length || red.length ) {
      if ( open ) await gh("PATCH", `/issues/${open.number}`, {body});
      else await gh("POST", "/issues", {title: "PC runner alert: stale pull requests", labels: [LABEL.alert], body});
    } else if ( open ) { await gh("PATCH", `/issues/${open.number}`, {body, state: "closed"}); }
  }
  return {rows, stuck: stuck.length, red: red.length, fixed: fixed.length, body};
}

if ( process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ) {
  const {spawnSync} = await import("node:child_process");
  const {REPO_NAME} = await import("./jobs.mjs");
  const r = spawnSync("git", ["credential", "fill"], {input: "protocol=https\nhost=github.com\n\n", encoding: "utf8", windowsHide: true});
  const token = process.env.WODX_PCQ_TOKEN ?? /^password=(.+)$/m.exec(r.stdout ?? "")?.[1]?.trim();
  if ( !token ) { console.error("No GitHub token (git credential fill)."); process.exit(1); }
  const gh = async (method, url, body) => {
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO_NAME}${url}`, {method, body: body ? JSON.stringify(body) : undefined,
      headers: {Authorization: `token ${token}`, "User-Agent": "wodx-pcq", Accept: "application/vnd.github+json", "Content-Type": "application/json"}});
    const text = await res.text();
    if ( !res.ok ) throw new Error(`${res.status} ${text.slice(0, 200)}`);
    return text ? JSON.parse(text) : null;
  };
  const out = await sweep(gh, {apply: process.argv.includes("--apply"), stateFile: process.env.WODX_SWEEP_STATE});
  console.log(`\n${out.rows.length} open, ${out.stuck} stuck, ${out.red} red, ${out.fixed} moved on.`);
}
