/* The PC job queue (B4100-B4109): job checks, queue order, lane clash checks and the submit preflight. */
import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {parseBody, validate, order, gateArgs, isInfraFault, laneClashes, fit, issueBody, resetsFirst} from "../pcq/jobs.mjs";
import {preflight, submitLanes} from "../pcq/submit.mjs";
import * as gpu from "../pcq/gpu.mjs";

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

test("a branchTools job is a one-lane named-gate test of a branch, with no recheck and no gate status (B7220)", () => {
  const j = validate({kind: "gates", gates: ["gateplains", "gatelifepath"], ref: "claude/project-thread-abc", branchTools: true, lanes: 3, prio: 1}, LANES).job;
  assert.equal(j.lanes, 1);
  assert.equal(j.recheck, false);
  assert.deepEqual(gateArgs(j, "3", 0, 1, "r"), ["gateplains", "gatelifepath", "--lane", "3", "--wait", "10", "--report", "r"]);
  assert.ok(validate({kind: "gates", gates: ["gatex"], ref: "fa2a3729", branchTools: true}, LANES).job);
  for ( const bad of [
    {kind: "gates", gates: ["gatex"], branchTools: true},
    {kind: "gates", gates: ["gatex"], ref: "main", branchTools: true},
    {kind: "gates", touched: true, ref: "claude/x", branchTools: true},
    {kind: "gates", all: true, ref: "claude/x", branchTools: true},
    {kind: "gates", gates: ["gatex"], ref: "claude/x", branchTools: "yes"},
    {kind: "gates", gates: ["gatex"], ref: "claude/x", branchTools: true, lane: 1}
  ] ) assert.ok(validate(bad, LANES).error, JSON.stringify(bad));
});

test("lane faults are retried, gate failures are not", () => {
  for ( const c of [3, 4, 5, null] ) assert.ok(isInfraFault(c));
  for ( const c of [0, 1, 2] ) assert.ok(!isInfraFault(c));
});

test("the runner's lanes are clean: no lane 1, no shared port or folder, all reset nightly, no Live world", () => {
  assert.deepEqual(laneClashes(lanesCfg, runnerCfg.lanes), []);
  assert.ok(runnerCfg.lanes.length >= 4, "at least lanes 2 to 5");
  assert.ok(!runnerCfg.lanes.includes(6), "lane 6 is kept for the local agents (B6527)");
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
  for ( const g of ["gatelookhand", "gatesolo", "gatedisplayb", "gatedisplayd", "gatetruthlooks"] ) {
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
  // B7202: a branch behind main is left for the merge train; the hourly update comes back only when asked for
  assert.equal(classify({...base, behind: 1368}).action, "ok");
  assert.equal(classify({...base, behind: 1368, checks: 0}).action, "dispatch", "behind with no CI still gets CI started");
  assert.equal(classify({...base, behind: 1368}, {update: true}).action, "update");
  assert.equal(classify({...base, behind: 3, headAge: HOUR}, {update: true}).action, "wait", "a branch a thread pushed to in the last 2 hours is left alone");
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
  const quiet = await sweep(gh, {apply: true, log: () => {}});
  assert.deepEqual(quiet.rows.map(x => x.action), ["ok", "dispatch", "stuck"], "B7202: the one behind is left for the merge train");
  assert.ok(!calls.includes("PUT /pulls/1/update-branch"));
  calls.length = 0;
  const r = await sweep(gh, {apply: true, log: () => {}, update: true});
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

test("B7310: each failing gate is rechecked alone, and no verdict rests on one run", async () => {
  const {gatePassed, recheckStep} = await import("../pcq/jobs.mjs");
  assert.equal(gatePassed("gatea", "gatea: 3/3 passed [1 setting(s) put back]"), true);
  assert.equal(gatePassed("gatea", "gatea: 2/3 passed; failed: x"), false);
  assert.equal(gatePassed("gatea", "gatea: ERROR could not sign in"), false);
  assert.equal(gatePassed("gatea", "gateb: 3/3 passed"), null);
  const step = (a, m, o) => recheckStep(a, m, o);
  assert.equal(step([], []).next, "alone");
  assert.equal(step([true], []).next, "alone", "B7441: one pass alone is run again");
  assert.match(step([true, true], []).verdict, /^order fault: passes alone twice/);
  assert.match(step([true, false], []).verdict, /^flaky/);
  assert.match(step([true], [], {once: true}).verdict, /passes alone/, "old one-run reports keep their answer");
  assert.equal(step([false], []).next, "alone", "one failure alone is run again");
  assert.match(step([false, true], []).verdict, /flaky/);
  assert.equal(step([false, false], []).next, "main");
  assert.match(step([false, false], [false]).verdict, /fails on main too/);
  assert.equal(step([false, false], [true]).next, "main", "one pass on main is confirmed before NEW");
  assert.match(step([false, false], [true, true]).verdict, /NEW with this change/);
  assert.match(step([false, false], [true, false]).verdict, /flaky on main/);
  assert.match(step([false, false], null).verdict, /fails alone too/);
  assert.match(step([false, false], [], {notOnMain: true}).verdict, /not on main yet/);
  assert.match(step([false, null], []).verdict, /not rechecked/);
  assert.match(step([false, false], [null]).verdict, /main could not be rechecked/);
  // job 2006: one bad draw of gate7b among other gates was called NEW; now it needs two failures alone and two passes on main
  assert.notEqual(step([false], []).verdict?.startsWith("NEW"), true);
});

test("B7310: the runner reruns one gate per run-gate call", async () => {
  const src = fs.readFileSync(new URL("../pcq/runner.mjs", import.meta.url), "utf8");
  const body = fs.readFileSync(new URL("../pcq/recheck.mjs", import.meta.url), "utf8");
  assert.match(body, /\[gate, "--lane"/, "run-gate gets a single gate");
  assert.doesNotMatch(body, /\.\.\.failing, "--lane"/, "no longer all failing gates in one call");
  assert.match(body, /lanesCmd\(\["reset"/, "each run starts from a reset");
  assert.match(body, /recheckStep\(/);
});

// Graphics card heat watch.
test("gpu line parses and N/A memory is null", () => {
  const r = gpu.parseLine("2026/11/15 22:30:00.000, 72, N/A, 250.51, 73, 98, 8400");
  assert.equal(r.core, 72); assert.equal(r.memory, null); assert.equal(r.watts, 250.51);
  assert.equal(gpu.parseLine("garbage"), null);
});
test("gpu alert only after the heat holds, clears after it cools", () => {
  const w = gpu.watcher(), m = 60000, hot = {core: 86, memory: null}, ok = {core: 70, memory: null};
  assert.equal(w(hot, 0), null); assert.equal(w(hot, 4 * m), null); assert.equal(w(hot, 5 * m), "hot");
  assert.equal(w(hot, 6 * m), null); assert.equal(w(ok, 7 * m), null); assert.equal(w(ok, 17 * m), "cool");
  const w2 = gpu.watcher(); w2(hot, 0); w2(ok, m); assert.equal(w2(hot, 2 * m), null); assert.equal(w2(hot, 6 * m), null);
  const w3 = gpu.watcher(); w3({core: 70, memory: 104}, 0); assert.equal(w3({core: 70, memory: 104}, 5 * m), "hot");
});

// B6526: the shared gate queue.
test("gates jobs on a shared queue: every gate taken once, gates of a lane that died go back", async () => {
  const {takeQueued, putBack, readQueue} = await import("../lanes/gate-queue.mjs");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gq-")), f = path.join(dir, "q.json");
  fs.writeFileSync(f, JSON.stringify(["ga", "gb", "gc", "gd"]));
  assert.equal(takeQueued(f, "2"), "ga"); assert.equal(takeQueued(f, "3"), "gb"); assert.equal(takeQueued(f, "2"), "gc");
  assert.deepEqual(putBack(f, "2", "==== x 4 gate(s)\nga: PASS 3/3\n"), ["gc"]);
  assert.deepEqual(readQueue(f), ["gc", "gd"]);
  assert.deepEqual(putBack(f, "2", ""), [], "takes already settled are not looked at again");
  assert.deepEqual(putBack(f, "3", ""), ["gb"]); assert.deepEqual(readQueue(f), ["gb", "gc", "gd"]);
  // Several processes taking at once: no gate twice, none lost
  fs.writeFileSync(f, JSON.stringify(Array.from({length: 60}, (_, i) => `g${i}`))); fs.rmSync(`${f}.taken`, {force: true});
  const mod = new URL("../lanes/gate-queue.mjs", import.meta.url).href;
  const kid = l => `import {takeQueued} from ${JSON.stringify(mod)}; const out = []; let g; while ( (g = takeQueued(${JSON.stringify(f)}, "${l}")) ) out.push(g); console.log(JSON.stringify(out));`;
  const {spawn} = await import("node:child_process");
  const runs = await Promise.all(["2", "3", "4"].map(l => new Promise(res => { let o = ""; const p = spawn(process.execPath, ["--input-type=module", "-e", kid(l)]); p.stdout.on("data", d => o += d); p.on("close", () => res(JSON.parse(o))); })));
  const all = runs.flat();
  assert.equal(all.length, 60); assert.equal(new Set(all).size, 60);
  fs.rmSync(dir, {recursive: true, force: true});
});
test("gateArgs in queue mode hands run-gate the shared list", () => {
  assert.deepEqual(gateArgs({kind: "gates", gates: ["x"], queue: "q.json", maxMinutes: 60}, "5", 0, 1, "r"),
    ["--queue", "q.json", "--lane", "5", "--wait", "10", "--report", "r", "--max-minutes", "60"]);
});
test("submit takes the other PCs' lanes from lanes.json, never lane 6 or lane 1 (B6980)", () => {
  const runnerCfg = JSON.parse(fs.readFileSync(new URL("../pcq/runner.json", import.meta.url)));
  const ids = submitLanes(runnerCfg, lanesCfg);
  for ( const n of [2, 3, 4, 5, 7, 8] ) assert.ok(ids.includes(n), `lane ${n} can be named`);
  assert.ok(!ids.includes(6) && !ids.includes(1), "lane 6 stays the local agents' and lane 1 stays the owner's");
  assert.ok(validate({kind: "gates", gates: ["gatex"], lane: 8}, ids).job, "a gates job can go to lane 8");
  assert.ok(validate({kind: "reset", lane: 7}, ids).job, "lane 7 can be reset from a thread");
  assert.ok(validate({kind: "reset", lane: 6}, ids).error, "lane 6 is still refused");
  assert.deepEqual(submitLanes({lanes: [2]}, {lanes: [{id: 1, host: "x"}, {id: 9, host: "y", reserved: "z"}]}), [2]);
});

test("B7002: a touched or all gates job sets the wodx/gates status on the one commit it ran", async () => {
  const {gateStatusFor, GATE_CONTEXT} = await import("../pcq/jobs.mjs");
  const sha = "a".repeat(40), job = {kind: "gates", touched: true, ref: "claude/x"};
  const pass = [{code: 0, sha, text: "gatea: 5/5 passed\ngateb: 3/3 passed"}];
  const st = gateStatusFor(job, pass, true, undefined, "https://github.com/o/r/issues/9");
  assert.equal(st.sha, sha);
  assert.deepEqual(st.body, {state: "success", context: GATE_CONTEXT, description: "2 gate(s) passed (touched)", target_url: "https://github.com/o/r/issues/9"});
  assert.equal(gateStatusFor({...job, touched: undefined, gates: ["gatea"]}, pass, true), null, "a hand-picked list says nothing about the branch");
  assert.equal(gateStatusFor({kind: "deploy"}, pass, true), null);
  assert.equal(gateStatusFor(job, [{code: null, sha, text: ""}], false), null, "a lane fault is no result");
  assert.equal(gateStatusFor(job, [...pass, {code: 0, sha: "b".repeat(40), text: "gatec: 1/1 passed"}], true), null, "two commits");
  assert.equal(gateStatusFor({...job, queueSha: "c".repeat(40)}, pass, true), null, "the queue was listed from another commit");
  const fail = [{code: 1, sha, text: "gatea: 5/5 passed\ngateb: 1/3 passed\n\nRecheck (each failing gate rerun on a fresh lane):\n- gateb: NEW with this change: passes on main"}];
  const f = gateStatusFor(job, fail, false);
  assert.equal(f.body.state, "failure");
  assert.match(f.body.description, /1 of 2 gate\(s\) failed: gateb/);
  const mainToo = [{code: 1, sha, text: "gatea: 5/5 passed\ngateb: 1/3 passed\n\nRecheck (each failing gate rerun on a fresh lane):\n- gateb: fails on main too: not this change's fault"}];
  const m = gateStatusFor(job, mainToo, false);
  assert.equal(m.body.state, "success");
  assert.match(m.body.description, /failing on main too: gateb/);
  // B7441: an order fault (passes alone twice) is named and does not hold the pull request; a flaky gate still does
  const rc = "\n\nRecheck (each failing gate alone on a fresh lane, 4 run(s)):\n";
  const ord = gateStatusFor(job, [{code: 1, sha, text: `gatea: 5/5 passed\ngateb: 1/3 passed\ngatec: 0/2 passed${rc}- gateb: order fault: passes alone twice, each on a fresh lane; it fails only after other gates (leftovers or order)\n- gatec: fails on main too: not this change's fault`}], false);
  assert.equal(ord.body.state, "success");
  assert.match(ord.body.description, /failing on main too: gatec; order faults: gateb/);
  const fl = gateStatusFor(job, [{code: 1, sha, text: `gatea: 5/5 passed\ngateb: 1/3 passed${rc}- gateb: flaky: passed once and failed once, alone on a fresh lane`}], false);
  assert.equal(fl.body.state, "failure");
  const mixed = gateStatusFor(job, [{code: 1, sha, text: `gateb: 1/3 passed\ngatec: 0/1 passed${rc}- gateb: order fault: passes alone twice\n- gatec: NEW with this change: fails alone twice here, passes alone twice on main`}], false);
  assert.equal(mixed.body.state, "failure", "a NEW failure still holds it");
  assert.ok(validate({kind: "gates", touched: true, ref: "handoff/la-names-04"}, ["2"]).job, "a handoff branch can be gated");
});

test("B6993: the job comment starts with every gate's line, failures first-hand, so the size cap never hides results", async () => {
  const J = await import("../pcq/jobs.mjs");
  const d = J.gateDigest([{lane: 8, text: "==== start\ngatea: 3/3 passed [1 setting(s) put back]\n  DIAG console noise\ngateb: 1/2 passed; failed: 2. x\ngatec: ERROR boom\ngated: 0/0 passed"}]);
  assert.match(d, /^1 of 4 gate\(s\) passed\./);
  assert.match(d, /- gateb: 1\/2 passed/); assert.match(d, /- gatec: ERROR boom/); assert.match(d, /- gated: 0\/0/);
  assert.doesNotMatch(d, /gatea|DIAG/);
  assert.equal(J.gateDigest([{text: "no gates here"}]), "");
  assert.match(fs.readFileSync(new URL("../pcq/runner.mjs", import.meta.url), "utf8"), /gateDigest\(parts\)/);
});

test("B7190: gates jobs start on a reset lane unless they say reset: false", () => {
  assert.equal(resetsFirst({kind: "gates", touched: true}), true);
  assert.equal(resetsFirst({kind: "gates", gates: ["gate7b"], reset: false}), false);
  assert.equal(resetsFirst({kind: "gate-two", gate: "gate7b"}), true);
  assert.equal(resetsFirst({kind: "deploy"}), false);
  const src = fs.readFileSync(new URL("../pcq/runner.mjs", import.meta.url), "utf8");
  assert.match(src, /if \( resetsFirst\(job\) \) await lanesCmd\(\["reset"/);
});

test("B7194: a runner whose own code is current moves to main in place when only the lane tools changed", () => {
  const src = fs.readFileSync(new URL("../pcq/runner.mjs", import.meta.url), "utf8");
  const due = src.slice(src.indexOf("async function updateDue"), src.indexOf("// ---- two PCs"));
  assert.match(due, /"diff", "--quiet", MY_SHA, "origin\/main", "--", "tools\/pcq"\]/, "it checks the runner's own code first");
  assert.match(due, /"checkout", "-q", "-f", "--detach", "origin\/main"\]/, "and moves the checkout in place");
  assert.match(due, /MY_SHA = now; return false;/, "without exiting");
  assert.match(src, /^let MY_SHA = /m);
});

test("B7341: a restarted gates job keeps what passed and runs the rest", async () => {
  const {resumeState} = await import("../pcq/jobs.mjs");
  const lane2 = "==== x\ngatea: 3/3 passed [1 setting(s) put back]\ngateb: 2/3 passed; failed: 1\ngatec: ERROR lost the page\n";
  const lane3 = "gated: 5/5 passed\ngatee: 0/0 passed\n";
  const st = resumeState(["gatef", "gateg"], ["gateh", "gatea"], [lane2, lane3]);
  assert.deepEqual(st.passed, ["gatea: 3/3 passed [1 setting(s) put back]", "gated: 5/5 passed"]);
  assert.deepEqual(st.left.sort(), ["gateb", "gatec", "gatee", "gatef", "gateg", "gateh"].sort(), "failed, errored, no-step, taken-unfinished and queued gates run again");
  // a gate that failed then passed later in the same run counts as passed
  assert.deepEqual(resumeState([], [], ["gatea: 1/2 passed\ngatea: 2/2 passed"]).passed, ["gatea: 2/2 passed"]);
});

test("B7341, B7340, B7342: the runner wires them in", () => {
  const src = fs.readFileSync(new URL("../pcq/runner.mjs", import.meta.url), "utf8");
  assert.match(src, /saveResume\(`job\$\{i\.number\}`\)/, "a job running at restart keeps its progress");
  assert.match(src, /resume\?\.sha === wt\.sha/, "progress is used only on the same commit");
  assert.match(src, /growJobs\(ready\.some\(q => LANE_KINDS\.has\(q\.job\.kind\) && !active\.has\(q\.number\) && couldStartNow\(q\.job\)\)\)/);
  assert.match(src, /deps: \{lanesCmd, node, worktree, stallFor, log, logs: LOGS, mainCache\}/, "the runner hands the recheck its cache");
  const re = fs.readFileSync(new URL("../pcq/recheck.mjs", import.meta.url), "utf8");
  assert.match(re, /mainCache\?\.read\(m\.sha\)/);
  assert.match(re, /mainSettled\(st\[g\]\.main\)/);
});

test("B7342: only settled main runs are kept", async () => {
  const {mainSettled} = await import("../pcq/jobs.mjs");
  assert.equal(mainSettled([false]), true);
  assert.equal(mainSettled([true, true]), true);
  assert.equal(mainSettled([true, false]), true);
  assert.equal(mainSettled([true]), false);
  assert.equal(mainSettled([false, null]), false);
  assert.equal(mainSettled(null), false);
});

test("B7330: a runner stopping with runner-off still acts on pc-cancel", () => {
  const src = fs.readFileSync(new URL("../pcq/runner.mjs", import.meta.url), "utf8");
  const off = src.indexOf('if ( fs.existsSync(path.join(HOME, "runner-off")) )');
  assert.ok(off > 0);
  const block = src.slice(off, src.indexOf("continue;", off));
  assert.match(block, /cancelCheck\(/, "the runner-off wait runs the cancel pass");
});

test("B7447: the gates a lane finished before a fault and a reset keep their lines, and a failure among them counts", async () => {
  const {withEarlier, failingGates} = await import("../pcq/jobs.mjs");
  const before = "==== 2026-11-18T16:26:30Z 309 gate(s)\ngate-interact: 9/9 passed\ngate6b: 3/4 passed; failed: 2. x\n";
  const after = "==== 2026-11-18T16:52:55Z 289 gate(s)\ngate7e: 10/10 passed\nexit 0 on lane 4\n";
  const r = withEarlier(before, after, 0, 4);
  assert.deepEqual([...r.report.matchAll(/^(gate[\w-]+): /gm)].map(m => m[1]), ["gate-interact", "gate6b", "gate7e"]);
  assert.match(r.report, /lane 4 was reset after that and the run went on/);
  assert.equal(r.code, 1, "gate6b failed before the fault, so the lane fails though the retry passed");
  assert.deepEqual(failingGates(r.report), ["gate6b"]);
  assert.equal(withEarlier(before.replace("3/4", "4/4").replace("; failed: 2. x", ""), after, 0, 4).code, 0);
  assert.deepEqual(withEarlier("", after, 0, 4), {report: after, code: 0}, "no fault: unchanged");
  const src = fs.readFileSync(new URL("../pcq/runner.mjs", import.meta.url), "utf8");
  assert.match(src, /faultRetry\(`run-gate on lane \$\{lane\} stopped with [^\n]*, own, true\)/);
  assert.match(src, /return laneWork\(job, lane, i, n, tag, true, carry && job\.queue \? out : ""\)/, "only on a shared queue");
});
