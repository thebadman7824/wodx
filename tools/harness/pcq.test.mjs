/* The PC job queue (B4100-B4109): job checks, queue order, lane clash checks and the submit preflight. */
import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {parseBody, validate, order, gateArgs, isInfraFault, laneClashes, fit, issueBody} from "../pcq/jobs.mjs";
import {preflight} from "../pcq/submit.mjs";

const LANES = [2, 3, 4, 5, 6];
const lanesCfg = JSON.parse(fs.readFileSync(new URL("../lanes/lanes.json", import.meta.url)));
const runnerCfg = JSON.parse(fs.readFileSync(new URL("../pcq/runner.json", import.meta.url)));

test("an issue body round-trips through issueBody and parseBody", () => {
  const job = {kind: "gates", gates: ["gateplains"], prio: 1};
  assert.deepEqual(parseBody(issueBody(job, "From the plains thread.")).job, job);
  assert.ok(parseBody("no block here").error);
  assert.ok(parseBody("```json\n{nope\n```").error);
});

test("validate accepts the job kinds and fills defaults", () => {
  const g = validate({kind: "gates", gates: ["gateplains", "gateplains", "gatelifepath"], lanes: 9}, LANES).job;
  assert.deepEqual(g.gates, ["gateplains", "gatelifepath"]);
  assert.equal(g.lanes, 2, "lanes is capped at the gate count (and the runner's lane count)");
  assert.equal(validate({kind: "gates", all: true, lanes: 9}, LANES).job.lanes, 5, "lanes is capped at the runner's lane count");
  assert.equal(g.ref, "main"); assert.equal(g.prio, 3);
  assert.equal(validate({kind: "gates", touched: true}, LANES).job.lanes, 1);
  assert.equal(validate({kind: "gates", gates: ["gatex"], lane: 4, lanes: 3}, LANES).job.lanes, 1);
  assert.ok(validate({kind: "gate-two", gate: "gatelookhand"}, LANES).job);
  assert.ok(validate({kind: "reset", lane: 3}, LANES).job);
  assert.ok(validate({kind: "books-find", terms: ["Four Bears", "Mato-Tope", "Buffalo Bird Woman"]}, LANES).job);
  assert.ok(validate({kind: "trove-find", pattern: "Catlin", under: "The Ultimate Trove - Books (C-D)"}, LANES).job);
  assert.ok(validate({kind: "gates", gates: ["gatex"], ref: "claude/project-thread-abc"}, LANES).job);
  assert.ok(validate({kind: "gates", gates: ["gatex"], ref: "fa2a3729"}, LANES).job);
});

test("validate refuses anything that could reach lane 1, Live, a shell or outside the Trove", () => {
  const bad = [
    {kind: "rm"}, {kind: "gates"}, {kind: "gates", gates: ["gatex; del *"]}, {kind: "gates", gates: ["../x"]},
    {kind: "reset", lane: 1}, {kind: "reset"}, {kind: "gates", gates: ["gatex"], lane: 7},
    {kind: "gates", gates: ["gatex"], ref: "origin/main"}, {kind: "gates", gates: ["gatex"], ref: "claude/../../x"},
    {kind: "gates", gates: ["gatex"], ref: "main; calc"}, {kind: "gates", gates: ["gatex"], prio: 9},
    {kind: "books-find", terms: []}, {kind: "books-find", terms: ['x" & calc']}, {kind: "books-find", terms: ["a\nb"]},
    {kind: "trove-find", pattern: "*"}, {kind: "trove-find", pattern: "Catlin", under: "..\\Windows"},
    {kind: "gates", gates: ["gatex"], thread: "anything"}, [], null,
  ];
  for ( const b of bad ) assert.ok(validate(b, LANES).error, JSON.stringify(b));
});

test("the queue runs priority first, then the oldest, and holds jobs waiting on an open issue", () => {
  const q = [{number: 5, job: {prio: 3}}, {number: 7, job: {prio: 1}}, {number: 6, job: {prio: 1}}, {number: 8, job: {prio: 1, after: 2}}, {number: 9, job: {prio: 2, after: 3}}];
  assert.deepEqual(order(q, new Set([2])).map(j => j.number), [6, 7, 9, 5]);
});

test("a waiting job gains a priority step each hour, so a p5 job is not passed over all day (B6490)", () => {
  const now = Date.parse("2026-11-15T18:00:00Z"), at = h => ({created_at: new Date(now - h * 3600000).toISOString()});
  const q = [{number: 1547, issue: at(3.6), job: {prio: 5}}, {number: 1605, issue: at(0.2), job: {prio: 1}}, {number: 1600, issue: at(0.5), job: {prio: 3}}];
  assert.deepEqual(order(q, new Set(), now).map(j => j.number), [1605, 1547, 1600]);
  assert.deepEqual(order(q, new Set(), now + 3600000).map(j => j.number), [1547, 1605, 1600]);
});

test("a gates job splits over its lanes with a report file", () => {
  const job = validate({kind: "gates", gates: ["a", "b", "c"], lanes: 2}, LANES).job;
  assert.deepEqual(gateArgs(job, "4", 1, 2, "r.txt"), ["a", "b", "c", "--lane", "4", "--shard", "2/2", "--wait", "10", "--report", "r.txt"]);
  assert.deepEqual(gateArgs(validate({kind: "gates", touched: true}, LANES).job, "2", 0, 1, "r"), ["--touched", "--lane", "2", "--wait", "10", "--report", "r"]);
});

test("lane faults are retried, gate failures are not", () => {
  for ( const c of [3, 4, 5, null] ) assert.ok(isInfraFault(c));
  for ( const c of [0, 1, 2] ) assert.ok(!isInfraFault(c));
});

test("the runner's lanes are clean: no lane 1, no shared port or folder, all reset nightly, no Live world", () => {
  assert.deepEqual(laneClashes(lanesCfg, runnerCfg.lanes), []);
  assert.ok(runnerCfg.lanes.length >= 5, "at least lanes 2 to 6");
  assert.ok(!runnerCfg.lanes.includes(1));
  const clash = {world: "rothenstein-wodx", lanes: [{id: 1, port: 30000, dataPath: "a"}, {id: 2, port: 30020, dataPath: "b", autoReset: true}, {id: 3, port: 30020, dataPath: "B", autoReset: false}]};
  const out = laneClashes(clash, [1, 2, 3, 9]).join("\n");
  for ( const w of ["lane 9 is not in", "lane 1 is Ben's", "share port 30020", "share the data folder", "lane 3 is not reset"] ) assert.match(out, new RegExp(w));
  assert.match(laneClashes({...clash, world: "rothenstein-live"}, [2]).join(), /Live world/);
});

test("long results are cut to GitHub's comment limit", () => {
  assert.equal(fit("short"), "short");
  assert.ok(fit("x".repeat(70000)).length <= 60000);
});

test("submit's preflight catches a missing gate, a two-browser gate in a gates job and a gate that does not parse", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pcq-"));
  fs.writeFileSync(path.join(dir, "gateok.mjs"), "export async function run() { return 'ok'; }\n");
  fs.writeFileSync(path.join(dir, "gatetwo.mjs"), "export async function run({phase}) { if ( phase === \"player\" ) return []; }\n");
  fs.writeFileSync(path.join(dir, "gatebroken.mjs"), "export async function run( {\n");
  assert.deepEqual(await preflight({kind: "gates", gates: ["gateok"]}, dir), []);
  const out = (await preflight({kind: "gates", gates: ["gatenone", "gatetwo", "gatebroken"]}, dir)).join("\n");
  assert.match(out, /gatenone: no tools/); assert.match(out, /gatetwo is a two-browser gate/); assert.match(out, /gatebroken does not parse/);
  assert.deepEqual(await preflight({kind: "gate-two", gate: "gatetwo"}, dir), []);
  assert.match((await preflight({kind: "gate-two", gate: "gateok"}, dir)).join(), /not a two-browser gate/);
});

test("every real two-browser gate is caught by the preflight's pattern, and run-gate's map leaves them out", async () => {
  const {gateMap} = await import("../lanes/gate-map.mjs");
  const map = gateMap();
  for ( const g of ["gatelookhand", "gatesolo", "gatedisplayb", "gatedisplayd"] ) {
    assert.deepEqual(await preflight({kind: "gate-two", gate: g}), [], g);
    assert.ok(!(g in map), `${g} should not be in the gate map`);
  }
});

test("the runner and the submit helper parse", () => {
  for ( const f of ["runner.mjs", "submit.mjs", "jobs.mjs"] ) {
    const r = spawnSync(process.execPath, ["--check", new URL(`../pcq/${f}`, import.meta.url).pathname], {encoding: "utf8"});
    assert.equal(r.status, 0, r.stderr);
  }
});

test("the stale pull request sweep moves on what it can and lists what is stuck (B4110)", async () => {
  const {classify, HOUR} = await import("../pcq/sweep.mjs");
  const base = {mergeable: true, behind: 0, checks: 8, running: false, failed: "", headAge: 5 * HOUR, tried: false};
  assert.equal(classify(base).action, "ok");
  assert.equal(classify({...base, mergeable: false}).action, "stuck");
  assert.equal(classify({...base, behind: 1368}).action, "update");
  assert.equal(classify({...base, behind: 3, headAge: HOUR}).action, "wait", "a branch a thread pushed to in the last 2 hours is left alone");
  assert.equal(classify({...base, checks: 0}).action, "dispatch");
  assert.equal(classify({...base, checks: 0, headAge: 10 * 60e3}).action, "wait");
  assert.equal(classify({...base, checks: 0, tried: true}).action, "stuck");
  assert.equal(classify({...base, checks: 0, running: true}).action, "wait");
  assert.equal(classify({...base, failed: "harness 2"}).action, "red");
});

test("the sweep runs on a mock GitHub: updates the one behind, starts CI on the one with none, files one alert", async () => {
  const {sweep, HOUR} = await import("../pcq/sweep.mjs");
  const old = new Date(Date.now() - 5 * HOUR).toISOString(), calls = [];
  const prs = {
    1: {number: 1, title: "behind", user: {login: "thebadman7824"}, mergeable: true, head: {sha: "a1", ref: "claude/a"}, base: {ref: "main"}},
    2: {number: 2, title: "no ci", user: {login: "thebadman7824"}, mergeable: true, head: {sha: "b2", ref: "claude/b"}, base: {ref: "main"}},
    3: {number: 3, title: "conflict", user: {login: "thebadman7824"}, mergeable: false, head: {sha: "c3", ref: "claude/c"}, base: {ref: "main"}},
    4: {number: 4, title: "outside", user: {login: "someone"}, mergeable: true, head: {sha: "d4", ref: "x"}, base: {ref: "main"}},
  };
  const gh = async (method, url, body) => {
    calls.push(`${method} ${url}`);
    if ( url.startsWith("/pulls?") ) return Object.values(prs);
    let m;
    if ( (m = /^\/pulls\/(\d+)$/.exec(url)) ) return prs[m[1]];
    if ( (m = /^\/compare\/main\.\.\.(\w+)$/.exec(url)) ) return {behind_by: m[1] === "a1" ? 40 : 0};
    if ( (m = /^\/commits\/(\w+)\/check-runs/.exec(url)) ) return m[1] === "b2" ? {total_count: 0, check_runs: []} : {total_count: 1, check_runs: [{status: "completed", conclusion: "success", name: "checks"}]};
    if ( /^\/commits\/\w+$/.test(url) ) return {commit: {committer: {date: old}}};
    if ( url.startsWith("/actions/runs") ) return {workflow_runs: []};
    if ( url.startsWith("/issues?") ) return [];
    return {};
  };
  const r = await sweep(gh, {apply: true, log: () => {}});
  assert.equal(r.rows.length, 3, "only the owner's pull requests");
  assert.deepEqual(r.rows.map(x => x.action), ["update", "dispatch", "stuck"]);
  assert.ok(calls.includes("PUT /pulls/1/update-branch"));
  assert.ok(calls.includes("POST /actions/workflows/checks.yml/dispatches"));
  assert.ok(calls.includes("POST /issues"), "one alert issue for the stuck one");
  assert.ok(!calls.some(c => /pulls\/4|update-branch.*3/.test(c)));
});

test("a named gate list is never split over more lanes than it has gates", () => {
  assert.equal(validate({kind: "gates", gates: ["gatelibrary"], lanes: 2}, LANES).job.lanes, 1);
  assert.equal(validate({kind: "gates", gates: ["a", "b", "c"], lanes: 5}, LANES).job.lanes, 3);
  assert.equal(validate({kind: "gates", touched: true, lanes: 3}, LANES).job.lanes, 3);
});

test("failing gates and recheck verdicts", async () => {
  const {failingGates, recheckVerdicts} = await import("../pcq/jobs.mjs");
  const rep = "==== x\ngatea: 7/8 passed [1 setting(s) put back]\ngateb: 5/5 passed\ngatec: ERROR could not sign in\ngated: 2/3 passed\nexit 1 on lane 2\ngatea: 7/8 passed";
  assert.deepEqual(failingGates(rep), ["gatea", "gatec", "gated"]);
  const v = recheckVerdicts(["gatea", "gatec", "gated"], "gatea: 7/8 passed\ngatec: 4/4 passed\ngated: 2/3 passed", "gatea: 7/8 passed\ngated: 3/3 passed");
  assert.match(v[0].verdict, /fails on main too/);
  assert.match(v[1].verdict, /passes alone/);
  assert.match(v[2].verdict, /NEW/);
  assert.match(recheckVerdicts(["gatea"], "gatea: 1/2 passed", null)[0].verdict, /fails alone too/);
  // B5590: a gate the change adds fails on main only because it is not there: that is the change's to fix.
  assert.match(recheckVerdicts(["gatea"], "gatea: 1/2 passed", "gatea: ERROR no such gate", new Set(["gatea"]))[0].verdict, /NEW with this change: the gate is not on main/);
});
