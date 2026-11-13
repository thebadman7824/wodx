#!/usr/bin/env node
/**
 * Merge-time stamping (B3080, B3081): module versions, changelog lines, module table rows and decisions are written
 * just before a pull request merges, from small fragment files the branch carries, so two branches never edit the
 * same lines and never take the same version.
 *
 *   node tools/release/merge-stamp.mjs            fetch main, check the branch holds it, apply every fragment,
 *                                                 run the version, table and decision tests
 *   node tools/release/merge-stamp.mjs --commit   the same, then commit the stamp
 *   node tools/release/merge-stamp.mjs --check    change nothing; exit 1 if fragments are waiting, the branch is
 *                                                 behind main, or a hand-made version bump is not above main's
 *   --no-fetch                                    use origin/main as it is (no network)
 *   --dry                                         print what would change, write nothing
 *
 * Fragments live under changes/ at the repo root (see changes/README.md):
 *   changes/<module-id>/<any-name>.md     one release note: front matter `bump: major|minor|patch`, optional
 *                                         `what:` (a new "What it does" cell), then the note as one paragraph
 *   changes/decisions/<B-start>.md        a claimed decision block: front matter `block`, `feature`, `modules`, then
 *                                         the "## Bnnnn. Title (date)" sections
 * Several fragments for one module make one release: the largest bump, notes joined with "; ".
 */
import fs from "node:fs";
import path from "node:path";
import {execFileSync, spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
const BUMPS = ["patch", "minor", "major"];

/** Front matter and body of a fragment. */
export function parseFragment(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(String(text).replace(/^﻿/, ""));
  if ( !m ) return null;
  const meta = {};
  for ( const line of m[1].split(/\r?\n/) ) {
    const kv = /^([a-z]+):\s*(.*)$/.exec(line.trim());
    if ( kv ) meta[kv[1]] = kv[2].trim();
  }
  return {meta, body: m[2].trim()};
}

export function bumpVersion(v, kind) {
  const m = SEMVER.exec(v);
  if ( !m ) throw new Error(`not an x.y.z version: ${v}`);
  const [a, b, c] = m.slice(1).map(Number);
  if ( kind === "major" ) return `${a + 1}.0.0`;
  if ( kind === "minor" ) return `${a}.${b + 1}.0`;
  if ( kind === "patch" ) return `${a}.${b}.${c + 1}`;
  throw new Error(`bump must be one of ${BUMPS.join(", ")}, not ${kind}`);
}

export function newer(a, b) {
  const x = SEMVER.exec(a)?.slice(1).map(Number), y = SEMVER.exec(b)?.slice(1).map(Number);
  if ( !x || !y ) return false;
  for ( let i = 0; i < 3; i++ ) if ( x[i] !== y[i] ) return x[i] > y[i];
  return false;
}

/** Problems with one module fragment (empty when it is fine). */
export function checkModuleFragment(f) {
  const out = [];
  if ( !f ) return ["no front matter (--- lines) found"];
  if ( !BUMPS.includes(f.meta.bump) ) out.push(`bump must be one of ${BUMPS.join(", ")}`);
  if ( !f.body ) out.push("the release note is empty");
  if ( /\n\s*\n/.test(f.body) ) out.push("the release note must be one paragraph (it becomes one changelog line)");
  if ( /^\s*[-*] \d+\.\d+\.\d+/.test(f.body) ) out.push("write the note without a version; the stamp adds it");
  if ( f.meta.what && f.meta.what.length > 300 ) out.push("what: is longer than 300 characters");
  return out;
}

export const blockRange = s => { const m = /^B(\d+)(?:-B(\d+))?$/.exec(String(s ?? "").trim()); return m ? {lo: +m[1], hi: +(m[2] ?? m[1])} : null; };
export const sectionNumbers = body => [...String(body).matchAll(/^## B(\d+)[a-z]?\b/gm)].map(m => +m[1]);

/** Problems with one decision fragment. */
export function checkDecisionFragment(f) {
  const out = [];
  if ( !f ) return ["no front matter (--- lines) found"];
  const r = blockRange(f.meta.block);
  if ( !r || r.lo > r.hi ) out.push("block must read like B3080-B3089");
  if ( !f.meta.feature ) out.push("feature: is missing");
  if ( !f.meta.modules ) out.push("modules: is missing");
  if ( f.meta.feature?.includes("|") || f.meta.modules?.includes("|") ) out.push("feature and modules may not hold a | (they become a table row)");
  const nums = sectionNumbers(f.body);
  if ( r ) for ( const n of nums ) if ( n < r.lo || n > r.hi ) out.push(`B${n} is outside the block ${f.meta.block}`);
  return out;
}

/** Read every fragment under changes/. */
export function readFragments(root = ROOT) {
  const dir = path.join(root, "changes");
  const modules = [], decisions = [];
  if ( !fs.existsSync(dir) ) return {modules, decisions};
  for ( const sub of fs.readdirSync(dir, {withFileTypes: true}) ) {
    if ( !sub.isDirectory() ) continue;
    for ( const f of fs.readdirSync(path.join(dir, sub.name)) ) {
      if ( !f.endsWith(".md") || f === "README.md" ) continue;
      const file = path.join("changes", sub.name, f);
      const frag = parseFragment(fs.readFileSync(path.join(root, file), "utf8"));
      (sub.name === "decisions" ? decisions : modules).push({file, module: sub.name, frag});
    }
  }
  modules.sort((a, b) => a.file.localeCompare(b.file));
  decisions.sort((a, b) => (blockRange(a.frag?.meta.block)?.lo ?? 0) - (blockRange(b.frag?.meta.block)?.lo ?? 0));
  return {modules, decisions};
}

/* ---- text edits, pure so the harness can test them ---- */

const VERSION_RE = old => new RegExp(String.raw`(\bconst VERSION\s*=\s*|\bversion:\s*)"${old.replace(/\./g, "\\.")}"`, "g");
export const stampScript = (src, old, next) => src.replace(VERSION_RE(old), `$1"${next}"`);
export const stampManifest = (src, old, next) => src.replace(new RegExp(String.raw`("version"\s*:\s*)"${old.replace(/\./g, "\\.")}"`), `$1"${next}"`);

export function stampChangelog(src, version, note) {
  const line = `- ${version} (${note})`;
  const lines = src.split("\n");
  const i = lines.findIndex(l => /^[-*] \d+\.\d+\.\d+\b/.test(l));
  if ( i >= 0 ) lines.splice(i, 0, line);
  else { while ( lines.length && lines.at(-1) === "" ) lines.pop(); lines.push("", line, ""); }
  return lines.join("\n");
}

export function stampTable(src, mod, version, what) {
  let hit = false;
  const out = src.split("\n").map(l => {
    const m = /^\| (wodx-[a-z]+) \| ([^|]*) \| ([^|]*) \| ([^|]*) \|$/.exec(l);
    if ( !m || m[1] !== mod ) return l;
    hit = true;
    return `| ${mod} | ${version} | ${what ?? m[3].trim()} | ${m[4].trim()} |`;
  }).join("\n");
  if ( !hit ) throw new Error(`docs/MODULES.md has no row for ${mod}`);
  return out;
}

/** Add a claimed block's index row and sections to docs/DECISIONS.md text. */
export function stampDecisions(src, frag) {
  const r = blockRange(frag.meta.block), nums = sectionNumbers(frag.body);
  const used = nums.length ? ` (used B${Math.min(...nums)}${nums.length > 1 ? `-B${Math.max(...nums)}` : ""})` : "";
  const row = `| ${frag.meta.block} | ${frag.meta.feature}${used} | ${frag.meta.modules} |`;
  const [head, rest] = src.split("<!-- decision-index:end -->");
  if ( rest === undefined ) throw new Error("docs/DECISIONS.md has no decision index markers");
  const [pre, index] = head.split("<!-- decision-index:start -->");
  const lines = index.split("\n");
  const rowAt = l => blockRange(/^\| (B\d+(?:-B\d+)?) \|/.exec(l)?.[1]);
  const same = lines.findIndex(l => { const x = rowAt(l); return x && x.lo === r.lo; });
  if ( same >= 0 ) lines[same] = row;
  else {
    for ( const l of lines ) { const x = rowAt(l); if ( x && x.lo <= r.hi && r.lo <= x.hi ) throw new Error(`${frag.meta.block} overlaps the index row ${l.slice(0, 40)}`); }
    let at = lines.findIndex(l => { const x = rowAt(l); return x && x.lo > r.lo; });
    if ( at < 0 ) { at = lines.length; while ( at > 0 && !lines[at - 1].startsWith("|") ) at--; }
    lines.splice(at, 0, row);
  }
  let top = pre.replace(/^Next free block: B(\d+)$/m, (s, n) => `Next free block: B${Math.max(+n, r.hi + 1)}`);
  let body = rest;
  if ( frag.body ) {
    const first = Math.min(...nums);
    const heads = [...body.matchAll(/^## B(\d+)[a-z]?\b/gm)];
    const after = heads.find(h => +h[1] > first);
    const text = frag.body.replace(/\s+$/, "") + "\n\n";
    if ( after ) body = body.slice(0, after.index) + text + body.slice(after.index);
    else body = body.replace(/\s*$/, "\n\n") + text.replace(/\n\n$/, "\n");
  }
  return `${top}<!-- decision-index:start -->${lines.join("\n")}<!-- decision-index:end -->${body}`;
}

/* ---- the run ---- */

const git = (...a) => execFileSync("git", a, {cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]}).trim();
const tryGit = (...a) => { try { return git(...a); } catch { return null; } };
const read = p => fs.readFileSync(path.join(ROOT, p), "utf8");

function scriptsOf(mod) {
  const out = [], walk = d => { if ( !fs.existsSync(d) ) return; for ( const e of fs.readdirSync(d, {withFileTypes: true}) ) {
    const p = path.join(d, e.name); if ( e.isDirectory() ) walk(p); else if ( /\.m?js$/.test(e.name) ) out.push(p); } };
  walk(path.join(ROOT, "modules", mod, "scripts"));
  return out;
}

function versionAt(ref, mod) {
  const s = ref && tryGit("show", `${ref}:modules/${mod}/module.json`);
  try { return s ? JSON.parse(s).version : null; } catch { return null; }
}

function main() {
  const args = new Set(process.argv.slice(2));
  const check = args.has("--check"), dry = args.has("--dry");
  if ( !args.has("--no-fetch") ) {
    const f = spawnSync("git", ["fetch", "-q", "origin", "main"], {cwd: ROOT, stdio: "inherit"});
    if ( f.status ) { console.error("git fetch origin main failed; use --no-fetch to stamp against the origin/main you have"); process.exit(2); }
  }
  const problems = [];
  if ( tryGit("merge-base", "--is-ancestor", "origin/main", "HEAD") === null )
    problems.push("the branch does not hold the newest main: git merge origin/main first (then run this again)");

  const {modules: mf, decisions: df} = readFragments();
  for ( const x of mf ) {
    if ( !fs.existsSync(path.join(ROOT, "modules", x.module, "module.json")) ) problems.push(`${x.file}: no module ${x.module}`);
    for ( const p of checkModuleFragment(x.frag) ) problems.push(`${x.file}: ${p}`);
  }
  for ( const x of df ) for ( const p of checkDecisionFragment(x.frag) ) problems.push(`${x.file}: ${p}`);

  // Hand-made bumps (branches from before merge-time stamping) must still land above main.
  const base = tryGit("merge-base", "origin/main", "HEAD");
  const mods = fs.readdirSync(path.join(ROOT, "modules")).filter(d => fs.existsSync(path.join(ROOT, "modules", d, "module.json")));
  const byMod = Object.groupBy ? Object.groupBy(mf, x => x.module) : mf.reduce((o, x) => ((o[x.module] ??= []).push(x), o), {});
  for ( const mod of mods ) {
    const here = JSON.parse(read(`modules/${mod}/module.json`)).version, there = versionAt("origin/main", mod);
    if ( !there || here === there || here === versionAt(base, mod) ) continue; // only versions this branch changed
    if ( byMod[mod] ) problems.push(`${mod}: the branch bumps by hand (${there} to ${here}) and has a fragment; keep one (prefer the fragment: put module.json, the api VERSION and the changelog back to ${there})`);
    else if ( !newer(here, there) ) problems.push(`${mod}: the branch says ${here}, main already has ${there}; bump above it or use a fragment`);
  }

  if ( check ) {
    if ( mf.length || df.length ) problems.push(`${mf.length + df.length} fragment(s) wait to be stamped: run node tools/release/merge-stamp.mjs`);
    for ( const p of problems ) console.log(`  ${p}`);
    console.log(problems.length ? `Not ready to merge: ${problems.length} problem(s).` : "Ready to merge: nothing waits to be stamped.");
    process.exit(problems.length ? 1 : 0);
  }
  if ( problems.length ) { for ( const p of problems ) console.log(`  ${p}`); console.log("Nothing was stamped."); process.exit(1); }
  if ( !mf.length && !df.length ) { console.log("No fragments under changes/: nothing to stamp."); process.exit(0); }

  const writes = new Map(), put = (p, s) => writes.set(p, s), get = p => writes.get(p) ?? read(p);
  for ( const [mod, list] of Object.entries(byMod) ) {
    const old = JSON.parse(read(`modules/${mod}/module.json`)).version;
    const kind = BUMPS[Math.max(...list.map(x => BUMPS.indexOf(x.frag.meta.bump)))];
    const next = bumpVersion(old, kind);
    const note = list.map(x => x.frag.body.replace(/\s+/g, " ").replace(/[.;]\s*$/, "")).join("; ");
    const what = list.map(x => x.frag.meta.what).filter(Boolean).at(-1);
    put(`modules/${mod}/module.json`, stampManifest(get(`modules/${mod}/module.json`), old, next));
    for ( const f of scriptsOf(mod) ) {
      const rel = path.relative(ROOT, f).split(path.sep).join("/"), s = get(rel), t = stampScript(s, old, next);
      if ( t !== s ) put(rel, t);
    }
    put(`modules/${mod}/CHANGELOG.md`, stampChangelog(get(`modules/${mod}/CHANGELOG.md`), next, note));
    put("docs/MODULES.md", stampTable(get("docs/MODULES.md"), mod, next, what));
    console.log(`${mod}: ${old} -> ${next} (${kind}, ${list.length} note(s))`);
  }
  for ( const x of df ) {
    put("docs/DECISIONS.md", stampDecisions(get("docs/DECISIONS.md"), x.frag));
    console.log(`decisions: ${x.frag.meta.block}, ${sectionNumbers(x.frag.body).length} section(s)`);
  }
  if ( dry ) { console.log(`--dry: ${writes.size} file(s) would change, ${mf.length + df.length} fragment(s) would go.`); process.exit(0); }
  for ( const [p, s] of writes ) fs.writeFileSync(path.join(ROOT, p), s);
  for ( const x of [...mf, ...df] ) fs.rmSync(path.join(ROOT, x.file));

  const tests = ["versions-agree", "modules-table", "decisions-index", "changes-fragments"].map(t => `${t}.test.mjs`)
    .filter(t => fs.existsSync(path.join(ROOT, "tools/harness", t)));
  const r = spawnSync(process.execPath, ["--test", ...tests], {cwd: path.join(ROOT, "tools/harness"), encoding: "utf8"});
  if ( r.status ) { console.log(r.stdout.split("\n").filter(l => /^not ok|^\s+(error|expected|actual):/.test(l)).join("\n")); console.log("Stamped, but the checks failed: fix before committing."); process.exit(1); }
  console.log(`Stamped ${writes.size} file(s); version, table and decision checks pass.`);
  if ( args.has("--commit") ) {
    spawnSync("git", ["add", "--", ...writes.keys(), ...[...mf, ...df].map(x => x.file.split(path.sep).join("/"))], {cwd: ROOT, stdio: "inherit"});
    const c = spawnSync("git", ["commit", "-q", "-m", "Stamp versions, changelogs and decisions for merge"], {cwd: ROOT, stdio: "inherit"});
    if ( c.status ) process.exit(1);
    console.log("Committed. Push, wait for the check, then merge.");
  } else console.log("Commit and push, wait for the check, then merge.");
}

if ( process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ) main();
