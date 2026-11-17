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
 * It also warns, never blocking, when a thread did by hand work that docs/ROUTING.md sends to a machine (B7005).
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
import {parseFragment, checkModuleFragment, effectWarnings, visibleWarnings, blockRange, sectionNumbers} from "./merge-stamp.mjs";

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

/** B7067: decision fragments added on the branch, each as it last stood: [{file, block: {lo, hi} | null, thread, numbers}]. */
export function branchDecisions(g, base, head) {
  const added = new Set(g.run("log", "--full-history", "--no-merges", "--format=", "--name-only", "--diff-filter=A", `${base}..${head}`, "--", "changes/decisions/").split("\n").filter(Boolean));
  const out = [];
  for ( const file of [...added].sort() ) {
    if ( !/^changes\/decisions\/[^/]+\.md$/.test(file) ) continue;
    let text = g.show(head, file);
    if ( text === null ) { const gone = g.tryRun("log", "-1", "--full-history", "--no-merges", "--format=%H", "--diff-filter=D", `${base}..${head}`, "--", file)?.trim(); text = gone ? g.show(`${gone}^1`, file) : null; }
    const frag = text === null ? null : parseFragment(text);
    out.push({file, block: blockRange(frag?.meta.block), thread: frag?.meta.thread ?? "", numbers: frag ? sectionNumbers(frag.body) : []});
  }
  return out;
}

/** B7067: the B numbers taken in a DECISIONS.md text: every index row's range, every section heading. */
export function decisionsTaken(text) {
  const ranges = [];
  for ( const m of String(text ?? "").matchAll(/^\| B(\d+)(?:-B(\d+))? \|/gm) ) ranges.push({lo: +m[1], hi: +(m[2] ?? m[1])});
  for ( const m of String(text ?? "").matchAll(/^#+ B(\d+)/gm) ) ranges.push({lo: +m[1], hi: +m[1]});
  return ranges;
}

/** B7067: B numbers the branch's diff adds to docs/DECISIONS.md (headings and index rows). */
export function decisionsAdded(g, base, head) {
  const diff = g.run("diff", "--no-renames", "-U0", base, head, "--", "docs/DECISIONS.md");
  const out = [];
  for ( const line of diff.split("\n") ) {
    if ( !line.startsWith("+") || line.startsWith("+++") ) continue;
    const t = line.slice(1);
    const h = /^#+ B(\d+)/.exec(t);
    if ( h ) { out.push({lo: +h[1], hi: +h[1], line: t.slice(0, 80)}); continue; }
    const r = /^\| B(\d+)(?:-B(\d+))? \|/.exec(t);
    if ( r ) out.push({lo: +r[1], hi: +(r[2] ?? r[1]), line: t.slice(0, 80)});
  }
  return out;
}

/**
 * Rule 4 (B7067, decision-number collisions). frags: this branch's decision fragments; added: numbers its diff adds
 * to DECISIONS.md; taken: ranges already on the base (DECISIONS.md and the fragments there); claims: the shared claim
 * registry's rows, or null where it cannot be read (CI). Returns problems.
 */
export function decisionProblems(frags, added, taken, claims = null) {
  const out = [];
  const within = (x, r) => r && x.lo >= r.lo && x.hi <= r.hi;
  const overlaps = (a, b) => a.lo <= b.hi && b.lo <= a.hi;
  const name = r => r.lo === r.hi ? `B${r.lo}` : `B${r.lo}-B${r.hi}`;
  for ( const f of frags ) {
    if ( !f.block ) { out.push(`${f.file}: no block: line (B<lo>-B<hi>, from node tools/decisions/claim.mjs)`); continue; }
    for ( const n of f.numbers ) if ( n < f.block.lo || n > f.block.hi ) out.push(`${f.file}: B${n} is outside its block ${name(f.block)}`);
    // A block already on main may take more decisions later (merge-stamp, B3081): its own index row is no clash, a
    // section number already written there is
    const same = t => t.lo === f.block.lo && t.hi === f.block.hi;
    const hit = taken.filter(t => overlaps(t, f.block) && !same(t) && !(t.lo === t.hi && taken.some(same)));
    for ( const n of f.numbers ) if ( taken.some(same) && taken.some(t => t.lo === n && t.hi === n) ) out.push(`${f.file}: B${n} is already written on main`);
    if ( hit.length ) out.push(`${f.file}: block ${name(f.block)} is already taken on main (${hit.slice(0, 3).map(name).join(", ")}); claim a new block with tools/decisions/claim.mjs`);
    if ( !f.thread ) out.push(`${f.file}: no thread: line (the thread id that claimed ${name(f.block)} with tools/decisions/claim.mjs)`);
    if ( claims ) {
      const mine = claims.find(c => within(f.block, c));
      if ( !mine ) out.push(`${f.file}: block ${name(f.block)} is not a claim in the registry; claim one with tools/decisions/claim.mjs`);
      else if ( f.thread && !String(mine.thread ?? "").startsWith(f.thread) && !f.thread.startsWith(String(mine.thread ?? "x")) ) out.push(`${f.file}: block ${name(f.block)} is claimed by thread ${mine.thread}, not ${f.thread}`);
      const others = claims.filter(c => c !== mine && overlaps(c, f.block));
      if ( others.length ) out.push(`${f.file}: block ${name(f.block)} overlaps other claims (${others.map(c => `${name(c)} ${c.thread ?? ""}`.trim()).join("; ")})`);
    }
  }
  for ( const a of added ) if ( !frags.some(f => within(a, f.block)) ) out.push(`docs/DECISIONS.md: ${name(a)} added outside any claimed block of this branch (write decisions in a changes/decisions/ fragment): ${a.line}`);
  return out;
}

/** The shared claim registry's rows, or null when it is not readable here (CI runs without the project files). */
export function readClaims(file = process.env.WODX_REGISTRY ?? "/mnt/project-files/registry/decision-blocks.json") {
  try { const d = JSON.parse(fs.readFileSync(file, "utf8")); return Array.isArray(d) ? d : (d.claims ?? null); } catch { return null; }
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

/**
 * B7005: the routes in docs/ROUTING.md (its ```json routes block): [{kind, home, paths}], or [] when there are none.
 */
export function readRoutes(text) {
  const m = /```json routes\s*\n([\s\S]*?)\n```/.exec(String(text ?? ""));
  try { return m ? JSON.parse(m[1]) : []; } catch { return []; }
}
const LOCAL_AGENT = /^(openhands|local agent|la-runner)$/i;
/**
 * B7005: warnings (never blocking) for work a thread did by hand that docs/ROUTING.md sends to a machine. None when a
 * commit came from a local agent, or a commit message or release note says `routed-by-hand: <reason>`.
 */
export function routeWarnings(files, routes, commits, notes = []) {
  if ( commits.some(c => LOCAL_AGENT.test(c.author)) ) return [];
  const said = [...commits.map(c => c.body), ...notes.map(n => n.frag?.body ?? "")].some(t => /routed-by-hand:\s*\S/i.test(t));
  if ( said ) return [];
  const out = [];
  for ( const r of routes ) {
    const res = (r.paths ?? []).map(globRe), hit = files.filter(f => res.some(re => re.test(f.file)));
    if ( hit.length ) out.push(`${hit.length} file(s) of ${r.kind} (${hit.slice(0, 3).map(f => f.file).join(", ")}${hit.length > 3 ? ", ..." : ""}) were changed by hand; docs/ROUTING.md sends this work to ${r.home}. If that was right, say why with routed-by-hand: <reason> in a commit message or the release note`);
  }
  return out;
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

  const notes = branchNotes(g, mb, headSha);
  result.rules.note = noteProblems(modules, notes);
  result.warnings = result.bensOwn ? [] : routeWarnings(own, readRoutes(g.show(headSha, "docs/ROUTING.md")), commits, notes);

  // B7067: decision numbers only from a block this branch claimed, never one main already has
  const frags = branchDecisions(g, mb, headSha);
  const baseFrags = (g.tryRun("ls-tree", "--name-only", mb, "changes/decisions/") ?? "").split("\n").filter(f => /\.md$/.test(f) && !frags.some(x => x.file === f))
    .map(f => blockRange(parseFragment(g.show(mb, f) ?? "")?.meta.block)).filter(Boolean);
  const claims = readClaims();
  result.claimsRead = !!claims;
  result.rules.decisions = result.bensOwn ? [] : decisionProblems(frags, decisionsAdded(g, mb, headSha), [...decisionsTaken(g.show(mb, "docs/DECISIONS.md")), ...baseFrags], claims);

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
  const names = {note: "1. Release note", gates: "2. Gate result", review: "3. File review", decisions: "4. Decision numbers"};
  for ( const [k, label] of Object.entries(names) ) {
    const p = r.rules[k];
    lines.push(`${p.length ? "FAIL" : "ok  "} ${label}${k === "gates" && r.gateBy ? `: ${r.gateBy}` : ""}`);
    for ( const x of p.slice(0, 60) ) lines.push(`       ${x}`);
    if ( p.length > 60 ) lines.push(`       ... and ${p.length - 60} more`);
  }
  if ( r.claimsRead === false ) lines.push("note 4. the claim registry is not readable here, so blocks were checked against main only; a thread's own run checks the registry too");
  for ( const w of r.warnings ?? [] ) lines.push(`note ${w}`);
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
    const onlyUnread = !r.ok && r.gateUnread && r.rules.note.length + r.rules.review.length + (r.rules.decisions?.length ?? 0) === 0;
    process.exit(r.ok || r.bensOwn || onlyUnread ? 0 : 1);
  }).catch(e => { console.error(`merge-rules: ${e.message}`); process.exit(2); });
}
