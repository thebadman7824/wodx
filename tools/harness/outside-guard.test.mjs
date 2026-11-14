import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync, writeFileSync, mkdtempSync, chmodSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {tmpdir} from "node:os";
import {join} from "node:path";

/* Outside contributions guard (B3030): .github/workflows/outside-guard.yml. */
const ALLOWED = ["thebadman7824"];
const yml = readFileSync(new URL("../../.github/workflows/outside-guard.yml", import.meta.url), "utf8");

// GitHub's && and || return operands, as JavaScript's do, so the job's `if` reads the same here.
const runs = ev => !ALLOWED.includes(ev.name === "issues" && ev.issue?.user?.login || ev.pull_request?.user?.login);

test("the job's condition and allow list are the ones tested here", () => {
  assert.match(yml, /contains\(fromJSON\('\["thebadman7824"\]'\),\s+github\.event_name == 'issues' && github\.event\.issue\.user\.login \|\| github\.event\.pull_request\.user\.login\)/);
  assert.match(yml, /^\s+if: >-\n\s+!contains/m);
});

test("only outside accounts are rejected", () => {
  assert.equal(runs({name: "pull_request_target", pull_request: {user: {login: "thebadman7824"}}}), false);
  assert.equal(runs({name: "issues", issue: {user: {login: "thebadman7824"}}}), false);
  assert.equal(runs({name: "pull_request_target", pull_request: {user: {login: "someone-else"}}}), true);
  assert.equal(runs({name: "issues", issue: {user: {login: "someone-else"}}}), true);
  assert.equal(runs({name: "pull_request_target", pull_request: {user: {login: "dependabot[bot]"}}}), true);
  assert.equal(runs({name: "pull_request_target", pull_request: {user: {login: "TheBadMan7824x"}}}), true);
});

test("the workflow never checks out or runs the pull request's code", () => {
  assert.doesNotMatch(yml, /actions\/checkout|git (clone|fetch|checkout)|npm |node /);
  assert.doesNotMatch(yml, /\$\{\{[^}]*(title|body|head\.|head_ref|comment)[^}]*\}\}/);
  assert.match(yml, /on:\n\s+pull_request_target:\n\s+types: \[opened, reopened\]/);
});

function script() {
  const m = yml.match(/run: \|\n((?:          .*\n?)+)/);
  return m[1].replace(/^ {10}/gm, "");
}

for (const kind of ["pull request", "issue"]) {
  test(`a dry run closes and locks an outside ${kind}`, () => {
    const dir = mkdtempSync(join(tmpdir(), "guard-"));
    const log = join(dir, "calls.log");
    writeFileSync(join(dir, "gh"), `#!/usr/bin/env bash\nprintf '%s\\n' "$*" >> "${log}"\n`);
    chmodSync(join(dir, "gh"), 0o755);
    const out = execFileSync("bash", ["-e", "-c", script()], {
      env: {PATH: `${dir}:${process.env.PATH}`, REPO: "thebadman7824/wodx", NUMBER: "901", KIND: kind}, encoding: "utf8"});
    const calls = readFileSync(log, "utf8").trim().split("\n");
    assert.equal(calls.length, 3);
    assert.match(calls[0], /^api -X POST repos\/thebadman7824\/wodx\/issues\/901\/comments -f body=Thanks/);
    assert.match(calls[0], new RegExp(`this ${kind} has been closed`));
    if (kind === "issue") assert.equal(calls[1], "api -X PATCH repos/thebadman7824/wodx/issues/901 -f state=closed -f state_reason=not_planned");
    else assert.equal(calls[1], "api -X PATCH repos/thebadman7824/wodx/pulls/901 -f state=closed");
    assert.equal(calls[2], "api -X PUT repos/thebadman7824/wodx/issues/901/lock -f lock_reason=off-topic");
    assert.match(out, new RegExp(`Closed ${kind} #901`));
  });
}
