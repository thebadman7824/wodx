// B7380: the recheck runs end to end with stand-in lanes, so a name it uses but does not have (B7310's stopped) fails here
// and not on the PCs.
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {recheck} from "../pcq/recheck.mjs";

function lanes(results) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "recheck-"));
  const mainDir = path.join(tmp, "main"), branchDir = path.join(tmp, "branch");
  for ( const d of [mainDir, branchDir] ) fs.mkdirSync(path.join(d, "tools", "gate"), {recursive: true});
  fs.writeFileSync(path.join(mainDir, "tools", "gate", "gatea.mjs"), "");
  const calls = [];
  const deps = {
    logs: tmp, log: () => {},
    lanesCmd: async argv => { calls.push(argv[0] === "deploy" ? `deploy${argv.includes("--if-changed") ? "?" : "!"}:${argv[argv.indexOf("--repo") + 1] === mainDir ? "main" : "alone"}` : argv[0]); return {code: 0}; },
    worktree: async () => ({dir: mainDir, sha: "m".repeat(40)}),
    // run-gate stand-in: writes the next scripted result for the side (branch or main) into the report file
    node: async (script, argv) => {
      const gate = argv[0], report = argv[argv.indexOf("--report") + 1], side = argv[argv.indexOf("--repo") + 1] === mainDir ? "main" : "alone";
      const pass = results[side].shift();
      fs.writeFileSync(report, `==== x\n${gate}: ${pass ? "2/2" : "1/2"} passed\n`);
      calls.push(`${side}:${gate}`);
      return {code: pass ? 0 : 1, out: ""};
    }
  };
  return {deps, calls, wt: {dir: branchDir, sha: "b".repeat(40)}};
}

test("a gate that fails alone twice and passes twice on main is NEW, after two runs a side", async () => {
  const {deps, calls, wt} = lanes({alone: [false, false], main: [true, true]});
  const out = await recheck({job: {ref: "claude/x"}, lane: "2", tag: "job1", wt, rep: "gatea: 1/2 passed\ngateb: 3/3 passed\n", L: "x.log", deps});
  assert.match(out, /- gatea: NEW with this change/);
  assert.match(out, /4 run\(s\)/);
  assert.deepEqual(calls.filter(c => c.includes(":") && !c.startsWith("deploy")), ["alone:gatea", "alone:gatea", "main:gatea", "main:gatea"]);
  assert.equal(calls.filter(c => c === "reset").length, 4, "every run starts from a reset");
  // B7540: each side's first run gets a full deploy (pack files are not in the --if-changed check), later runs check first
  assert.deepEqual(calls.filter(c => c.startsWith("deploy")), ["deploy!:alone", "deploy?:alone", "deploy!:main", "deploy?:main"]);
});

test("B7521: a flaky gate is run on main: passing there twice it stays flaky, failing there it is main's", async () => {
  const a = lanes({alone: [false, true], main: [true, true]});
  const out = await recheck({job: {ref: "claude/x"}, lane: "2", tag: "job2", wt: a.wt, rep: "gatea: 1/2 passed\n", L: "x.log", deps: a.deps});
  assert.match(out, /- gatea: flaky: failed once and passed once.*passes alone twice on main/);
  assert.equal(a.calls.filter(c => c.startsWith("main:")).length, 2);
  const b = lanes({alone: [true, false], main: [false]});
  const out2 = await recheck({job: {ref: "claude/x"}, lane: "2", tag: "job2b", wt: b.wt, rep: "gatea: 1/2 passed\n", L: "x.log", deps: b.deps});
  assert.match(out2, /- gatea: fails on main too \(here flaky/);
  assert.equal(b.calls.filter(c => c.startsWith("main:")).length, 1);
});

test("a cancelled job stops rechecking: stopped is honoured", async () => {
  const {deps, calls, wt} = lanes({alone: [false, false], main: [true, true]});
  const out = await recheck({job: {ref: "claude/x"}, lane: "2", tag: "job3", wt, rep: "gatea: 1/2 passed\n", L: "x.log", stopped: () => true, deps});
  assert.match(out, /- gatea: not settled: the recheck ran out of time/);
  assert.equal(calls.length, 0);
});

test("the runner hands the recheck its stop check and helpers", () => {
  const src = fs.readFileSync(new URL("../pcq/runner.mjs", import.meta.url), "utf8");
  assert.match(src, /await recheck\(job, lane, tag, wt, rep, L, stopped\)/);
  assert.match(src, /recheckRun\(\{job, lane, tag, wt, rep, L, stopped,/);
  assert.match(src, /deps: \{lanesCmd, node, worktree, stallFor, log, logs: LOGS(, mainCache)?\}/);
});

test("B7342: a second recheck on the same main commit reuses main's runs", async () => {
  const store = {};
  const mainCache = {read: sha => ({...(store[sha] ?? {})}), write: (sha, add) => { store[sha] = {...(store[sha] ?? {}), ...add}; }};
  const one = lanes({alone: [false, false], main: [false]});
  const out1 = await recheck({job: {ref: "claude/x"}, lane: "2", tag: "job4", wt: one.wt, rep: "gatea: 1/2 passed\n", L: "x.log", deps: {...one.deps, mainCache}});
  assert.match(out1, /- gatea: fails on main too/);
  assert.deepEqual(store["m".repeat(40)], {gatea: [false]});
  const two = lanes({alone: [false, false], main: []});
  const out2 = await recheck({job: {ref: "claude/y"}, lane: "2", tag: "job5", wt: two.wt, rep: "gatea: 1/2 passed\n", L: "x.log", deps: {...two.deps, mainCache}});
  assert.match(out2, /- gatea: fails on main too: not this change's fault \(main's runs reused/);
  assert.ok(!two.calls.some(c => c.startsWith("main:")), "main is not run again");
});