#!/usr/bin/env node
/**
 * Merge rules (B7000-B7009): the checking rules a pull request must meet before it merges, enforced by CI rather
 * than left to each thread. The "merge rules" job in .github/workflows/checks.yml runs this on every pull request,
 * and its result feeds the one required "checks" result, so a pull request that breaks a rule cannot merge.
 *
 * A pull request's changes are the files that differ between the merge base with main and the head, ignoring the
 * version strings merge-stamp writes. Files merge-stamp writes itself (changelogs, docs/MODULES.md,
 * docs/DECISIONS.md, the api-paths fixture), changes/ and docs/reviews/ are left out. Three rules:
 *
 *   1. Note: every module with a changed file has a release note (changes/<module>/<name>.md) added on the branch,
 *      in the right form, with effect: and visible: lines when it is minor or major. merge-stamp removes the notes
 *      before the merge, so they are read from the branch's history.
 *   2. Gates: when the change needs gates (tools/lanes/gate-map.mjs, the same list run-gate.mjs --touched takes),
 *      a commit on the branch carries a passing "wodx/gates" status from the PC runner (a gates job with touched:
 *      true or all: true), and none of the changed module, system or gate files differ between that commit and the
 *      head. Version stamps do not count as a difference, so stamping after the gate run keeps the result.
 *   3. Review: every changed file has a verdict, written on the branch in docs/reviews/<name>.jsonl by
 *      tools/release/review.mjs, made on the file as it is at the head (its hash matches). The verdict must be
 *      "working" ("dead" for a deleted file), and "how" says what was done to check it.
 *
 * The owner's own work (every commit on the branch authored by thebadman7824 with no Claude or agent trailer) is
 * reported but never blocked. Pull requests from outside accounts never reach this (outside-guard.yml).
 *
 *   node tools/release/merge-rules.mjs [--base origin/main] [--head HEAD]     a thread checks its branch; the gate
 *                                                                           rule is read from GitHub when a token
 *                                                                           is set (GITHUB_TOKEN), else only listed
 *   --github          read gate statuses from GitHub (CI); needs GITHUB_TOKEN and GITHUB_REPOSITORY
 *   --summary <file>  also write the result as Markdown (CI's job summary)
 * Exit 0 when every rule is met (or the work is Ben's own), 1 when one is broken, 2 on a usage fault.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {parseFragment, checkModuleFragment, effectWarnings, visibleWarnings} from "./merge-stamp.mjs";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const GATE_CONTEXT = "wodx/gates";
export const REVIEW_DIR = "docs/reviews";

/** Files merge-stamp writes, or that hold the notes and reviews themselves: never need their own review. */
export const STAMPED = [/^changes\/[^/]+\//, /^docs\/reviews\/[^/]+\.jsonl$/, /^modules\/[\w-]+\/CHANGELOG\.md$/, /^docs\/MODULES\.md$/,
  /^docs\/DECISIONS\.md$/, /^tools\/gate\/fixtures\/api-paths\.json$/];
export const isStamped = f => STAMPED.some(r => r.test(f));
/** Files whose change can change a gate result (the inputs of gate-map's touched()). */
export const gateInput = f => /^(modules|system)\//.test(f) || /^tools\/gate\//.test(f);
/** Script files: a glob review entry may not stand in for these. */
export const isScript = f => /\.m?js$/.test(f);

/** Text with the version strings merge-stamp writes put to one value, so a stamp is no change. */
export function normalise(text) {
  return String(text).replace(/^﻿/, "").replace(/\r\n/g, "\n")
    .replace(/(\bconst VERSION\s*=\s*|\bversion:\s*)"\d+\.\d+\.\d+"/g, '$1"x.y.z"')
    .replace(/("version"\s*:\s*)"\d+\.\d+\.\d+"/g, '$1"x.y.z"');
}
/** The review hash of a file's content (null content: a deleted file). */
export const hashOf = text => text === null ? "deleted" : crypto.createHash("sha256").update(normalise(text)).digest("hex").slice(0, 12);

/* ---- git ---- */

export function gitIn(root) {
  const run = (...a) => execFileSync("git", a, {cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"]}).trim();
  const tryRun = (...a) => { try { return run(...a); } catch { return null; } };
  return {
    run, tryRun,
    show: (ref, f) => { try { return execFileSync("git", ["show", `${ref}:${f}`], {cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"]}); } catch { return null; } },
  };
}

/** The files the branch changes (stamp-only changes left out), with their head content hash. */
export function changedFiles(g, base, head) {
  const names = g.run("diff", "--name-only", "--no-renames", base, head).split("\n").filter(Boolean);
  const out = [];
  for ( const f of names ) {
    const a = g.show(base, f), b = g.show(head, f);
    if ( a !== null && b !== null && normalise(a) === normalise(b) ) continue;
    out.push({file: f, hash: hashOf(b), deleted: b === null});
  }
  return out;
}

/** Release notes added on the branch: [{file, module, frag}], each read as it last stood on the branch. */
export function branchNotes(g, base, head) {
  const added = new Set(g.run("log", "--format=", "--name-only", "--diff-filter=A", `${base}..${head}`, "--", "changes/").split("\n").filter(Boolean));
  const out = [];
  for ( const file of [...added].sort() ) {
    const m = /^changes\/([\w-]+)\/([^/]+\.md)$/.exec(file);
    if ( !m || m[1] === "decisions" || m[2] === "README.md" ) continue;
    let text = g.show(head, file);
    if ( text === null ) {
      // Gone at the head (merge-stamp removed it): the last commit on the branch that touched it removed it, so its
      // first parent holds the note's last form.
      const last = g.tryRun("rev-list", "-1", `${base}..${head}`, "--", file);
      text = last ? g.show(`${last}^1`, file) : null;
    }
    out.push({file, module: m[1], frag: text === null ? null : parseFragment(text)});
  }
  return out;
}

/** Review items written on the branch: the lines the branch added to docs/reviews/*.jsonl. */
export function branchReviews(g, base, head) {
  const diff = g.run("diff", "--no-renames", "-U0", base, head, "--", `${REVIEW_DIR}/`);
  const items = [], bad = [];
  let file = null;
  for ( const line of diff.split("\n") ) {
    const f = /^\+\+\+ b\/(.+)$/.exec(line);
    if ( f ) { file = f[1]; continue; }
    if ( !line.startsWith("+") || line.startsWith("+++") || !line.slice(1).trim() ) continue;
    if ( !file?.endsWith(".jsonl") ) continue;
    try { items.push(JSON.parse(line.slice(1))); } catch { bad.push(`${file}: a line that is not JSON: ${line.slice(1, 80)}`); }
  }
  return {items, bad};
}

/** The non-merge commits on the branch: [{sha, author, body}]. */
export function branchCommits(g, base, head) {
  const raw = g.run("log", "--no-merges", "--format=%H%x1f%an%x1f%B%x1e", `${base}..${head}`);
  return raw.split("\x1e").map(s => s.trim()).filter(Boolean).map(s => { const [sha, author, body] = s.split("\x1f"); return {sha, author, body: body ?? ""}; });
}

/* ---- the rules, pure so the harness can test them ---- */

const AI_TRAILER = /noreply@anthropic\.com|^Claude-Session:|Generated with \[Claude|^Co-Authored-By:.*\b(Claude|openhands|cline|devstral|qwen)\b/im;
/** The owner's own work: every commit authored by the owner's account, none with an agent's trailer. */
export function bensOwn(commits, owner = "thebadman7824") {
  return commits.length > 0 && commits.every(c => c.author === owner && !AI_TRAILER.test(c.body));
}

/** Rule 1. modules: module ids with a changed file. Returns problems. */
export function noteProblems(modules, notes) {
  const out = [];
  for ( const n of notes ) {
    if ( !modules.includes(n.module) ) continue;
    for ( const p of [...checkModuleFragment(n.frag), ...effectWarnings(n.frag), ...visibleWarnings(n.frag)] ) out.push(`${n.file}: ${p}`);
  }
  for ( const m of modules ) if ( !notes.some(n => n.module === m) )
    out.push(`${m}: files changed but no release note was added; write changes/${m}/<feature>.md (bump, effect:, visible:, one paragraph; see changes/README.md)`);
  return out;
}

const globRe = g => new RegExp(`^${g.split(/(\*\*\/?|\*)/).map(p => p === "**" || p === "**/" ? ".*" : p === "*" ? "[^/]*" : p.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("")}$`);
export const MIN_HOW = 15;

/** Rule 3. files: changedFiles() minus stamped ones; items: review items. Returns problems. */
export function reviewProblems(files, items) {
  const out = [];
  for ( const it of items ) {
    if ( it.glob && isScript(it.glob) ) out.push(`review entry ${it.glob}: a glob may not cover script files; give each script its own entry`);
  }
  for ( const f of files ) {
    const mine = items.filter(it => it.file === f.file || (it.glob && !isScript(f.file) && globRe(it.glob).test(f.file)));
    if ( !mine.length ) { out.push(`${f.file}: no review verdict; check it, then node tools/release/review.mjs add ${f.file} --how "what you did to check it"`); continue; }
    const it = mine.at(-1); // the newest entry wins
    const want = f.deleted ? ["dead", "working"] : ["working"];
    if ( !want.includes(it.verdict) ) { out.push(`${f.file}: verdict "${it.verdict ?? ""}"; only ${want.join(" or ")} can merge (fix it, then review it again)`); continue; }
    if ( String(it.how ?? "").trim().length < MIN_HOW ) { out.push(`${f.file}: the review's "how" must say what was done to check it (${MIN_HOW} characters at least)`); continue; }
    if ( it.file && it.hash !== f.hash ) out.push(`${f.file}: reviewed as ${it.hash ?? "no hash"}, but the head is ${f.hash}: the file changed after its review; review it again`);
  }
  return out;
}

/**
 * Rule 2. need: the gates the change needs; inputs: changed gate-input files; candidates: [{sha, statuses:
 * [{context, state, description, target_url}]}] newest first; sameAt(sha): true when every input file is the same
 * (normalised) at sha as at the head. Returns {ok, problems, by}.
 */
export function gateVerdict(need, candidates, sameAt) {
  if ( !need.length ) return {ok: true, problems: [], by: "no gate needed"};
  let failed = null;
  for ( const c of candidates ) {
    // GitHub lists a commit's statuses newest first; the newest one per context counts
    const s = (c.statuses ?? []).find(x => x.context === GATE_CONTEXT);
    if ( !s ) continue;
    if ( !sameAt(c.sha) ) continue;
    if ( s.state === "success" ) return {ok: true, problems: [], by: `${GATE_CONTEXT} passed on ${c.sha.slice(0, 8)}${s.description ? ` (${s.description})` : ""}`};
    failed ??= {c, s};
  }
  const queue = "node tools/pcq/submit.mjs gates --touched --ref <this branch> --lanes 2 --thread <thread id>";
  if ( failed ) return {ok: false, by: "", problems: [`gates failed on ${failed.c.sha.slice(0, 8)}: ${failed.s.description ?? ""} ${failed.s.target_url ?? ""}`.trim() + `; fix it, push and queue again: ${queue}`]};
  return {ok: false, by: "", problems: [`${need.length} gate(s) needed and no passing ${GATE_CONTEXT} result on the branch for the code as it is now; queue them: ${queue} (the check runs again by itself when the result comes)`]};
}

/* ---- the run ---- */

async function githubStatuses(shas) {
  const repo = process.env.GITHUB_REPOSITORY, token = process.env.GITHUB_TOKEN;
  if ( !repo || !token ) return null;
  const out = [];
  for ( const sha of shas ) {
    const r = await fetch(`https://api.github.com/repos/${repo}/commits/${sha}/statuses?per_page=100`, {headers: {Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "wodx-merge-rules"}});
    if ( !r.ok ) throw new Error(`GitHub statuses for ${sha.slice(0, 8)}: ${r.status}`);
    out.push({sha, statuses: await r.json()});
  }
  return out;
}

export async function evaluate({root = ROOT, base = "origin/main", head = "HEAD", statuses = githubStatuses} = {}) {
  const g = gitIn(root);
  const mb = g.run("merge-base", base, head), headSha = g.run("rev-parse", head);
  const commits = branchCommits(g, mb, headSha);
  const files = changedFiles(g, mb, headSha);
  const own = files.filter(f => !isStamped(f.file));
  const modules = [...new Set(own.map(f => /^modules\/([\w-]+)\//.exec(f.file)?.[1]).filter(m => m && fs.existsSync(path.join(root, "modules", m, "module.json"))))].sort();
  const result = {base: mb, head: headSha, files: own.length, modules, bensOwn: bensOwn(commits), rules: {}};

  result.rules.note = noteProblems(modules, branchNotes(g, mb, headSha));

  const {items, bad} = branchReviews(g, mb, headSha);
  result.rules.review = [...bad, ...reviewProblems(own, items)];

  const {touched, gatesFor, gateMap} = await import("../lanes/gate-map.mjs");
  const inputs = own.filter(f => gateInput(f.file));
  const t = touched(inputs.map(f => f.file), {root});
  const need = gatesFor(t.modules, t.gates, gateMap(root));
  result.gatesNeeded = need.length;
  let gate;
  if ( !need.length ) gate = {ok: true, problems: [], by: "no gate needed"};
  else {
    const shas = g.run("rev-list", "--max-count=60", `${mb}..${headSha}`).split("\n").filter(Boolean);
    const cands = statuses ? await statuses(shas) : null;
    if ( !cands ) gate = {ok: false, problems: [`${need.length} gate(s) needed; their result is on GitHub and was not read here (no GITHUB_TOKEN). CI checks it.`], by: "", unread: true};
    else {
      const headText = new Map(inputs.map(f => [f.file, f.deleted ? null : normalise(g.show(headSha, f.file))]));
      const sameAt = sha => inputs.every(f => { const x = g.show(sha, f.file); return (x === null ? null : normalise(x)) === headText.get(f.file); });
      gate = gateVerdict(need, cands, sameAt);
    }
  }
  result.rules.gates = gate.problems;
  result.gateBy = gate.by;
  result.gateUnread = !!gate.unread;
  result.ok = Object.values(result.rules).every(p => !p.length);
  return result;
}

export function report(r) {
  const lines = [`Merge rules for ${r.head.slice(0, 8)} (base ${r.base.slice(0, 8)}): ${r.files} changed file(s), modules ${r.modules.join(", ") || "none"}, ${r.gatesNeeded} gate(s) needed.`];
  const names = {note: "1. Release note", gates: "2. Gate result", review: "3. File review"};
  for ( const [k, label] of Object.entries(names) ) {
    const p = r.rules[k];
    lines.push(`${p.length ? "FAIL" : "ok  "} ${label}${k === "gates" && r.gateBy ? `: ${r.gateBy}` : ""}`);
    for ( const x of p.slice(0, 60) ) lines.push(`       ${x}`);
    if ( p.length > 60 ) lines.push(`       ... and ${p.length - 60} more`);
  }
  if ( r.ok ) lines.push("Every merge rule is met.");
  else if ( r.bensOwn ) lines.push("The owner's own work: reported, not blocked.");
  else lines.push("Not ready to merge: fix the lines marked FAIL (docs/WORKFLOW.md, section 6).");
  return lines.join("\n");
}

if ( process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ) {
  const args = process.argv.slice(2);
  const opt = k => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };
  const useGithub = args.includes("--github") || !!process.env.GITHUB_TOKEN;
  evaluate({base: opt("base") ?? "origin/main", head: opt("head") ?? "HEAD", statuses: useGithub ? githubStatuses : null}).then(r => {
    const text = report(r);
    console.log(text);
    if ( opt("summary") ) fs.appendFileSync(opt("summary"), `### Merge rules\n\n\`\`\`\n${text}\n\`\`\`\n`);
    // A local run cannot read the gate result; that alone is not a failure there
    const onlyUnread = !r.ok && r.gateUnread && r.rules.note.length + r.rules.review.length === 0;
    process.exit(r.ok || r.bensOwn || onlyUnread ? 0 : 1);
  }).catch(e => { console.error(`merge-rules: ${e.message}`); process.exit(2); });
}
