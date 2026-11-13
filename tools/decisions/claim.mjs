#!/usr/bin/env node
/**
 * Decision-number blocks, one per thread (B3082). A thread claims its block when it starts, so two threads never
 * write the same B number. Claims go to a shared registry that every thread sees at once (the project files folder),
 * not to a file in the repo, which other threads would only see after a merge.
 *
 *   node tools/decisions/claim.mjs --thread <thread id> --feature "what the block is for" [--size 10]
 *   node tools/decisions/claim.mjs --list
 *   node tools/decisions/claim.mjs --who B3075               which claim holds a number
 *   --registry <file>     default $WODX_REGISTRY, else /mnt/project-files/registry/decision-blocks.json
 *   --no-scan             skip the scan of origin's branches for numbers already written there
 *
 * A thread that already holds a block gets the same block back. The new block starts above everything in the
 * registry, every row and decision on main's docs/DECISIONS.md, the "Next free block" line, every fragment under
 * changes/decisions, and (unless --no-scan) every B number written in docs/DECISIONS.md on any origin branch.
 * Blocks start on a multiple of ten. The registry is locked while it is read and written, every claim also gets a
 * file of its own in <registry>.d/, and after a pause (WODX_CLAIM_SETTLE_MS, default 12 s) the claim is checked
 * again: when another session took an overlapping block first, this one withdraws and claims the next (B3088).
 * Write the block into a fragment (changes/decisions/<B-start>.md); tools/release/merge-stamp.mjs puts it in
 * docs/DECISIONS.md when the branch merges.
 */
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };
const REG = path.resolve(opt("registry") ?? process.env.WODX_REGISTRY ?? "/mnt/project-files/registry/decision-blocks.json");

/** The highest B number in a DECISIONS.md text: index rows, section headings, table rows and the next free line. */
export function highest(text) {
  let top = 0;
  for ( const m of String(text).matchAll(/^\| B(\d+)(?:-B(\d+))? \|/gm) ) top = Math.max(top, +(m[2] ?? m[1]));
  for ( const m of String(text).matchAll(/^#+ B(\d+)/gm) ) top = Math.max(top, +m[1]);
  const nf = /^Next free block: B(\d+)$/m.exec(String(text));
  if ( nf ) top = Math.max(top, +nf[1] - 1);
  return top;
}
export const nextStart = top => Math.floor(top / 10) * 10 + 10;

const git = (...a) => { try { return execFileSync("git", a, {cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 << 20}); } catch { return null; } };

function floorFromRepo(scan) {
  let top = 0;
  const local = path.join(ROOT, "docs/DECISIONS.md");
  if ( fs.existsSync(local) ) top = Math.max(top, highest(fs.readFileSync(local, "utf8")));
  const fr = path.join(ROOT, "changes/decisions");
  if ( fs.existsSync(fr) ) for ( const f of fs.readdirSync(fr) ) top = Math.max(top, highest(fs.readFileSync(path.join(fr, f), "utf8")),
    +(/block:\s*B\d+-B(\d+)/.exec(fs.readFileSync(path.join(fr, f), "utf8"))?.[1] ?? 0));
  if ( scan ) {
    git("fetch", "-q", "origin", "+refs/heads/*:refs/remotes/origin/*");
    for ( const ref of (git("for-each-ref", "--format=%(refname)", "refs/remotes/origin") ?? "").split("\n").filter(Boolean) ) {
      const t = git("show", `${ref}:docs/DECISIONS.md`);
      if ( t ) top = Math.max(top, highest(t));
      const ls = git("ls-tree", "--name-only", `${ref}`, "changes/decisions/");
      for ( const f of (ls ?? "").split("\n").filter(Boolean) ) {
        const s = git("show", `${ref}:${f}`) ?? "";
        top = Math.max(top, +(/block:\s*B\d+-B(\d+)/.exec(s)?.[1] ?? 0));
      }
    }
  }
  return top;
}

function withLock(fn) {
  const lock = `${REG}.lock`;
  fs.mkdirSync(path.dirname(REG), {recursive: true});
  const until = Date.now() + 30000;
  for ( ;; ) {
    try { fs.mkdirSync(lock); break; }
    catch {
      try { if ( Date.now() - fs.statSync(lock).mtimeMs > 120000 ) { fs.rmdirSync(lock); continue; } } catch {}
      if ( Date.now() > until ) throw new Error(`the registry is locked (${lock}); try again`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
    }
  }
  try { return fn(); } finally { fs.rmdirSync(lock); }
}

// Every claim is also written to a file of its own in <registry>.d/, named for the block and the thread, that nothing
// overwrites. A claim lost from the JSON to another session's write in the same moment (the project files folder is a
// network share, where the lock is not always seen in time) still counts, and two claims of one block are caught (B3088).
const MARKS = `${REG}.d`;
const markName = c => `B${c.lo}-B${c.hi}--${String(c.thread).replace(/[^\w-]/g, "_").slice(0, 80)}--${String(c.at).replace(/[^\dTZ]/g, "")}.json`;
function readMarks() {
  if ( !fs.existsSync(MARKS) ) return [];
  return fs.readdirSync(MARKS).filter(f => f.endsWith(".json")).flatMap(f => { try { return [JSON.parse(fs.readFileSync(path.join(MARKS, f), "utf8"))]; } catch { return []; } });
}
const same = (a, b) => a.lo === b.lo && a.hi === b.hi && a.thread === b.thread && a.at === b.at;
function load() {
  const r = fs.existsSync(REG) ? JSON.parse(fs.readFileSync(REG, "utf8")) : {about: "Decision-number blocks claimed by threads. Written by tools/decisions/claim.mjs; do not edit by hand while a claim runs.", claims: []};
  for ( const m of readMarks() ) if ( !m.withdrawn && !r.claims.some(c => same(c, m)) ) r.claims.push(m);
  const gone = readMarks().filter(m => m.withdrawn);
  r.claims = r.claims.filter(c => !gone.some(g => same(g, c))).sort((a, b) => a.lo - b.lo || String(a.at).localeCompare(String(b.at)));
  return r;
}
const mark = c => { fs.mkdirSync(MARKS, {recursive: true}); fs.writeFileSync(path.join(MARKS, markName(c)), JSON.stringify(c) + "\n", {flag: "wx"}); };
const withdraw = c => { fs.writeFileSync(path.join(MARKS, markName(c)), JSON.stringify({...c, withdrawn: true}) + "\n"); };
/** Of two claims of overlapping blocks, the earlier one keeps it (then the thread id decides), the same in every session. */
const firstOf = (a, b) => (String(a.at).localeCompare(String(b.at)) || String(a.thread).localeCompare(String(b.thread))) <= 0 ? a : b;
const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const SETTLE = Number(process.env.WODX_CLAIM_SETTLE_MS ?? 12000);
const save = r => { const tmp = `${REG}.tmp`; fs.writeFileSync(tmp, JSON.stringify(r, null, 1) + "\n"); fs.renameSync(tmp, REG); };
const label = c => `B${c.lo}-B${c.hi}`;

function main() {
  if ( args.includes("--list") ) {
    for ( const c of load().claims ) console.log(`${label(c).padEnd(12)} ${c.at.slice(0, 16)}  ${c.thread}  ${c.feature}`);
    return;
  }
  const who = opt("who");
  if ( who ) {
    const n = +String(who).replace(/^B/, "");
    const c = load().claims.find(c => n >= c.lo && n <= c.hi);
    console.log(c ? `${label(c)} ${c.thread} ${c.feature}` : `B${n} is in no claimed block`);
    return;
  }
  const thread = opt("thread"), feature = opt("feature"), size = Math.max(1, Number(opt("size") ?? 10));
  if ( !thread || !feature ) { console.error("Usage: node tools/decisions/claim.mjs --thread <id> --feature \"...\" [--size 10]"); process.exit(2); }
  const repoTop = floorFromRepo(!args.includes("--no-scan"));
  let c = null;
  for ( let attempt = 1; attempt <= 6 && !c; attempt++ ) {
    const got = withLock(() => {
      const r = load();
      const mine = r.claims.find(c => c.thread === thread && c.feature === feature);
      if ( mine ) return {...mine, again: true};
      const top = Math.max(repoTop, ...r.claims.map(c => c.hi));
      const lo = nextStart(top), hi = lo + Math.ceil(size / 10) * 10 - 1;
      const claim = {lo, hi, thread, feature, at: new Date().toISOString()};
      mark(claim);
      r.claims.push(claim);
      save(r);
      return claim;
    });
    if ( got.again ) { c = got; break; }
    // Let other sessions' writes reach this one, then check that no one else holds an overlapping block.
    sleep(SETTLE);
    const rival = load().claims.find(o => !same(o, got) && o.lo <= got.hi && got.lo <= o.hi);
    if ( rival && firstOf(rival, got) === rival ) {
      withLock(() => { withdraw(got); const r = load(); save(r); });
      console.log(`${label(got)} was taken a moment earlier by ${rival.thread}; trying again.`);
      continue;
    }
    withLock(() => { const r = load(); save(r); }); // writes back any claim another session's save had dropped
    c = got;
  }
  if ( !c ) { console.error("Could not claim a block after 6 tries; try again in a minute."); process.exit(1); }
  console.log(`${c.again ? "Already claimed" : "Claimed"}: ${label(c)} for ${c.feature}`);
  console.log(`Write the decisions in changes/decisions/B${c.lo}.md (block: ${label(c)}); see changes/README.md.`);
}

if ( process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ) main();
