// B8130: the merge-train push guard (tools/git-hooks/pre-push.mjs).
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync, spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {readPushes, refusal, trainOnly} from "../git-hooks/pre-push.mjs";
import {installHooks} from "../git-hooks/install.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const A = "a".repeat(40), B = "b".repeat(40), Z = "0".repeat(40);

test("git's pre-push lines become branch pushes; deletes and tags are left out", () => {
  const s = `refs/heads/x ${A} refs/heads/claude/x ${B}\nrefs/heads/y ${Z} refs/heads/claude/y ${B}\nrefs/tags/v ${A} refs/tags/v ${Z}\n`;
  assert.deepEqual(readPushes(s), [{branch: "claude/x", local: A, remote: B}]);
  assert.deepEqual(readPushes(""), []);
});

test("a push to a labelled pull request is refused, unless every new commit is the train's", () => {
  const push = {branch: "claude/x"}, pr = {number: 2294, labels: [{name: "merge-train"}]};
  assert.match(refusal(push, pr, ["Fix the test"]), /#2294.*merge-train/);
  assert.match(refusal(push, pr, ["Merge main\n\nMerge-Train: yes", "Fix the test"]), /refused/, "one thread commit among train commits");
  assert.equal(refusal(push, pr, ["Merge main into claude/x (merge train)\n\nMerge-Train: yes"]), null);
  assert.equal(refusal(push, {number: 1, labels: [{name: "urgent"}]}, ["x"]), null, "not in the train");
  assert.equal(refusal(push, null, ["x"]), null, "no pull request yet");
  assert.equal(trainOnly([]), false);
});

test("install points this clone at tools/git-hooks and leaves another hooks path alone", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wodx-hooks-"));
  execFileSync("git", ["init", "-q", dir]);
  assert.equal(installHooks(dir), "set");
  assert.equal(installHooks(dir), "already");
  execFileSync("git", ["-C", dir, "config", "core.hooksPath", ".husky"]);
  assert.equal(installHooks(dir), "other");
  fs.rmSync(dir, {recursive: true, force: true});
});

test("the hook script is executable and hands git's arguments to the guard", () => {
  const sh = path.join(ROOT, "tools/git-hooks/pre-push");
  if ( process.platform !== "win32" ) assert.ok(fs.statSync(sh).mode & 0o111, "pre-push must be executable");
  assert.match(fs.readFileSync(sh, "utf8"), /pre-push\.mjs" "\$@"/);
  // A push to another remote never asks GitHub and goes through
  const r = spawnSync(process.execPath, [path.join(ROOT, "tools/git-hooks/pre-push.mjs"), "origin", "/tmp/elsewhere.git"], {input: `refs/heads/x ${A} refs/heads/claude/x ${B}\n`, encoding: "utf8"});
  assert.equal(r.status, 0);
});
