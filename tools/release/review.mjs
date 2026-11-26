#!/usr/bin/env node
/**
 * Per-file review record (B7001): the coverage report a pull request carries for merge rule 3
 * (tools/release/merge-rules.mjs). Each line of docs/reviews/<branch>.jsonl gives one changed file a verdict, made
 * on the file as it is now (its hash), so a file changed after its review shows as unreviewed again.
 *
 *   node tools/release/review.mjs todo                         the branch's changed files with no current verdict
 *   node tools/release/review.mjs add <file> [<file> ...] --how "what was done to check it" [--verdict working]
 *   node tools/release/review.mjs add --glob "modules/wodx-x/assets/**" --how "..."   non-script files only
 *   --base origin/main   the branch's base (default)
 * Verdicts: working (checked and fine) or dead (a deleted file, checked to be unused). Anything else (broken,
 * only-tells) means the file is not ready: fix it first. "how" names what was done: read in full, ran which test or
 * gate, opened which window. Write it honestly: the record is the proof that the check happened.
 */
import fs from "node:fs";
import path from "node:path";
import {ROOT, REVIEW_DIR, MIN_HOW, gitIn, changedFiles, branchReviews, reviewProblems, isStamped, isScript, hashOf} from "./merge-rules.mjs";
import {installHooks} from "../git-hooks/install.mjs";

installHooks(); // B8130: the merge-train push guard

const args = process.argv.slice(2), cmd = args[0];
const valued = new Set(["how", "verdict", "base", "glob"]);
const opt = k => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };
const pos = args.slice(1).filter((a, i, all) => !a.startsWith("--") && !(i > 0 && all[i - 1].startsWith("--") && valued.has(all[i - 1].slice(2))));
const g = gitIn(ROOT);
const base = g.run("merge-base", opt("base") ?? "origin/main", "HEAD");
const branch = g.run("rev-parse", "--abbrev-ref", "HEAD");
const reviewFile = path.join(ROOT, REVIEW_DIR, `${branch.replace(/[^\w.-]+/g, "-")}.jsonl`);
// The working tree counts: a thread reviews before it commits
const files = () => changedFiles(g, base, "HEAD").filter(f => !isStamped(f.file)).map(f => {
  const p = path.join(ROOT, f.file), text = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
  return {file: f.file, hash: hashOf(text), deleted: text === null};
});
const work = g.run("diff", "--name-only", "HEAD").split("\n").filter(Boolean).concat(g.run("ls-files", "--others", "--exclude-standard").split("\n").filter(Boolean));
const allFiles = () => {
  const seen = new Map(files().map(f => [f.file, f]));
  for ( const f of work ) if ( !seen.has(f) && !isStamped(f) ) { const p = path.join(ROOT, f), t = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null; seen.set(f, {file: f, hash: hashOf(t), deleted: t === null}); }
  return [...seen.values()];
};
const items = () => {
  const committed = branchReviews(g, base, "HEAD").items;
  const local = fs.existsSync(reviewFile) ? fs.readFileSync(reviewFile, "utf8").split("\n").filter(l => l.trim()).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : [];
  return [...committed, ...local];
};

if ( cmd === "todo" ) {
  const p = reviewProblems(allFiles(), items());
  for ( const x of p ) console.log(`  ${x}`);
  console.log(p.length ? `${p.length} file(s) need a review.` : "Every changed file has a current verdict.");
  process.exit(p.length ? 1 : 0);
} else if ( cmd === "add" ) {
  const how = String(opt("how") ?? "").trim(), verdict = opt("verdict") ?? "working", glob = opt("glob");
  if ( how.length < MIN_HOW ) { console.error(`--how must say what was done to check the file (${MIN_HOW} characters at least).`); process.exit(2); }
  if ( !["working", "dead"].includes(verdict) ) { console.error("--verdict is working or dead; a broken file is fixed before it is reviewed."); process.exit(2); }
  if ( glob && isScript(glob) ) { console.error("A glob may not cover script files; give each script its own entry."); process.exit(2); }
  if ( !pos.length && !glob ) { console.error("Name the files (or --glob)."); process.exit(2); }
  const at = new Date().toISOString().slice(0, 16) + "Z", lines = [];
  for ( const f of pos ) {
    const rel = f.replace(/\\/g, "/"), p = path.join(ROOT, rel), text = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
    if ( text === null && verdict !== "dead" && !g.tryRun("cat-file", "-e", `${base}:${rel}`) ) { console.error(`${rel}: no such file`); process.exit(2); }
    lines.push({file: rel, verdict, how, hash: hashOf(text), at});
  }
  if ( glob ) lines.push({glob, verdict, how, at});
  fs.mkdirSync(path.dirname(reviewFile), {recursive: true});
  fs.appendFileSync(reviewFile, lines.map(l => JSON.stringify(l)).join("\n") + "\n");
  console.log(`${lines.length} verdict(s) written to ${path.relative(ROOT, reviewFile)}; commit it with the change.`);
} else {
  console.error("Usage: node tools/release/review.mjs todo | add <file...> --how \"...\" [--verdict working|dead] [--glob pattern]");
  process.exit(2);
}
