// B8132: the train settles merge conflicts in the review list and generated files itself (tools/pcq/train.mjs).
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {prepare, settleable, settlePending} from "../pcq/train.mjs";

const HEAD = "# Pending review\n\n## Approved\n\n| Date | Question | Choice made | How to reverse it |\n|---|---|---|---|\n";
const WAIT = "\n## Waiting for review\n\n| Date | Question | Choice made | How to reverse it |\n|---|---|---|---|\n";
const r = (d, q) => `| 2026-11-${d} | ${q} | c | r |`;

test("only conflicts in the review list and generated files are settled", () => {
  assert.equal(settleable("docs/PENDING-REVIEW.md\n"), true);
  assert.equal(settleable("docs/FEATURES.md\ntools/gate/fixtures/api-paths.json"), true);
  assert.equal(settleable("docs/PENDING-REVIEW.md\nmodules/wodx-npc/scripts/a.mjs"), false);
  assert.equal(settleable(""), false);
});

test("the settled review list is main's, with the branch's new rows at the end", () => {
  const base = HEAD + WAIT + r(24, "old") + "\n";
  const ours = base + r(25, "branch row") + "\n";
  const theirs = HEAD + r(24, "old") + "\n" + WAIT + r(25, "main row") + "\n"; // main approved "old" and added a row
  const out = settlePending(base, ours, theirs);
  assert.equal(out, theirs + r(25, "branch row") + "\n");
  assert.equal(out.split(r(24, "old")).length, 2, "the approved row is not brought back to Waiting");
  assert.equal(settlePending(base, base, theirs), theirs, "nothing added");
});

const sh = (cwd, ...a) => { const x = spawnSync("git", a, {cwd, encoding: "utf8"}); if ( x.status ) throw new Error(`git ${a.join(" ")}: ${x.stderr}`); return x.stdout.trim(); };
function setup() {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), "train-settle-"));
  const origin = path.join(t, "origin.git"), work = path.join(t, "work"), clone = path.join(t, "runner"), home = path.join(t, "home");
  fs.mkdirSync(home);
  sh(t, "init", "-q", "--bare", "-b", "main", origin); sh(t, "clone", "-q", origin, work);
  sh(work, "config", "user.email", "t@example.com"); sh(work, "config", "user.name", "t");
  fs.mkdirSync(path.join(work, "tools", "release"), {recursive: true}); fs.mkdirSync(path.join(work, "docs"));
  fs.writeFileSync(path.join(work, "tools", "release", "merge-stamp.mjs"), "console.log('nothing to stamp');");
  fs.writeFileSync(path.join(work, "docs", "PENDING-REVIEW.md"), HEAD + WAIT + r(24, "old") + "\n");
  fs.writeFileSync(path.join(work, "a.txt"), "a");
  sh(work, "add", "-A"); sh(work, "commit", "-q", "-m", "base"); sh(work, "push", "-q", "origin", "main");
  return {t, origin, work, clone, home};
}
const write = (w, f, s) => fs.writeFileSync(path.join(w, f), s);

test("prepare settles a review-list conflict, commits the merge with the train's trailer, and pushes", async () => {
  const {origin, work, clone, home} = setup();
  sh(work, "checkout", "-q", "-b", "claude/x");
  write(work, "docs/PENDING-REVIEW.md", HEAD + WAIT + r(24, "old") + "\n" + r(25, "branch row") + "\n");
  write(work, "b.txt", "b");
  sh(work, "add", "-A"); sh(work, "commit", "-q", "-m", "branch"); sh(work, "push", "-q", "origin", "claude/x");
  const head = sh(work, "rev-parse", "HEAD");
  sh(work, "checkout", "-q", "main");
  const mainText = HEAD + r(24, "old") + "\n" + WAIT + r(25, "main row") + "\n";
  write(work, "docs/PENDING-REVIEW.md", mainText); sh(work, "add", "-A"); sh(work, "commit", "-q", "-m", "auto-approval"); sh(work, "push", "-q", "origin", "main");
  sh(fs.realpathSync(path.dirname(clone)), "clone", "-q", origin, clone);
  sh(clone, "config", "user.email", "t@example.com"); sh(clone, "config", "user.name", "t");
  const git = async (argv, cwd) => spawnSync("git", argv, {cwd, encoding: "utf8"});
  const out = await prepare({git, home, repoRoot: clone}, "claude/x", head);
  assert.equal(out.error, undefined, out.error);
  assert.match(out.did, /conflicts settled in docs\/PENDING-REVIEW\.md/);
  const tip = sh(origin, "rev-parse", "refs/heads/claude/x");
  assert.equal(sh(origin, "show", `${tip}:docs/PENDING-REVIEW.md`), (mainText + r(25, "branch row")).trim());
  assert.match(sh(origin, "log", "-1", "--format=%B", tip), /^Merge-Train: yes$/m, "the push guard and B7332 know it as the train's");
  assert.equal(sh(origin, "show", `${tip}:b.txt`), "b");
});

test("a conflict in any other file still leaves, naming the files", async () => {
  const {origin, work, clone, home} = setup();
  sh(work, "checkout", "-q", "-b", "claude/y");
  write(work, "docs/PENDING-REVIEW.md", HEAD + WAIT + r(24, "old") + "\n" + r(25, "branch row") + "\n");
  write(work, "a.txt", "branch side");
  sh(work, "add", "-A"); sh(work, "commit", "-q", "-m", "branch"); sh(work, "push", "-q", "origin", "claude/y");
  const head = sh(work, "rev-parse", "HEAD");
  sh(work, "checkout", "-q", "main");
  write(work, "docs/PENDING-REVIEW.md", HEAD + WAIT + r(25, "main row") + "\n"); write(work, "a.txt", "main side");
  sh(work, "add", "-A"); sh(work, "commit", "-q", "-m", "main"); sh(work, "push", "-q", "origin", "main");
  sh(path.dirname(clone), "clone", "-q", origin, clone);
  sh(clone, "config", "user.email", "t@example.com"); sh(clone, "config", "user.name", "t");
  const git = async (argv, cwd) => spawnSync("git", argv, {cwd, encoding: "utf8"});
  const out = await prepare({git, home, repoRoot: clone}, "claude/y", head);
  assert.match(out.error ?? "", /does not merge in cleanly \(conflicts in a\.txt, docs\/PENDING-REVIEW\.md\)/);
  assert.equal(spawnSync("git", ["status", "--porcelain"], {cwd: path.join(home, "train"), encoding: "utf8"}).stdout.trim(), "");
});
