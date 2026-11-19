/* B7448-B7449: the PC runner orders its queue by registry/priorities.json (prio.mjs sortQueue), takes no new jobs in
   a planned window, and the merge train's front clock counts only time it ran. */
import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {order, validate} from "../pcq/jobs.mjs";
import * as PRIO from "../pcq/prio.mjs";
import {tick, CLOCK_GAP, step, TRAIN_LABEL} from "../pcq/train.mjs";

const P = PRIO.load();
const H = 3600e3, now = Date.parse("2026-11-18T20:00:00Z");
const at = h => new Date(now - h * H).toISOString();
const e = (number, job, h) => ({number, job: {prio: 3, ...job}, issue: {created_at: at(h), title: `PC job [PR #${number} abcdef123456]`}});

test("the queue goes by rank: train front, unblock, PR gates, then health, whatever their age", () => {
  const q = [
    e(1, {kind: "gates", all: true, ref: "0123456789abcdef0123456789abcdef01234567", class: "health"}, 9),
    e(2, {kind: "gates", touched: true, ref: "claude/a", prio: 2}, 1),
    e(3, {kind: "gates", touched: true, ref: "claude/b", prio: 2, class: "urgent"}, 0),
    e(4, {kind: "gates", gates: ["gatex"], ref: "claude/c", branchTools: true, prio: 1}, 0),
    e(5, {kind: "gates", touched: true, ref: "claude/d", prio: 2}, 0),
  ];
  const ranked = order(q, new Set(), now, {prio: P, sortQueue: PRIO.sortQueue, isFront: j => j.number === 5}).map(j => j.number);
  assert.deepEqual(ranked, [5, 4, 3, 2, 1], "front, then branch tools (prio 1) and urgent (prio 2) in R2, PR gates, the nine-hour-old health run last");
  const old = order(q, new Set(), now).map(j => j.number);
  assert.equal(old[0], 1, "the older order let a nine-hour-old nightly run go first");
  assert.deepEqual(order(q, new Set([9]), now, {prio: P, sortQueue: PRIO.sortQueue}).length, 5);
  const waiting = [e(6, {kind: "gates", touched: true, ref: "claude/e", after: 9}, 0), ...q];
  assert.ok(!order(waiting, new Set([9]), now, {prio: P, sortQueue: PRIO.sortQueue}).some(j => j.number === 6), "a job after an open one still waits");
});

test("a job may carry its class", () => {
  assert.equal(validate({kind: "gates", touched: true, ref: "claude/a", class: "urgent"}).job.class, "urgent");
  assert.match(validate({kind: "gates", touched: true, ref: "claude/a", class: "Urgent!"}).error, /class must be/);
  assert.match(validate({kind: "gates", touched: true, ref: "claude/a", class: 3}).error, /class must be/);
});

test("the front's clock counts time only while it runs, and never a long gap", () => {
  const s = {};
  assert.equal(tick(s, true, 1000), 0, "the first step starts the clock");
  assert.equal(tick(s, true, 1000 + 180e3), 180e3);
  assert.equal(tick(s, false, 1000 + 360e3), 0, "held: nothing counts");
  assert.equal(tick(s, true, 1000 + 540e3), 0, "the step after a hold starts again");
  assert.equal(tick(s, true, 1000 + 720e3), 180e3);
  assert.equal(tick(s, true, 1000 + 720e3 + CLOCK_GAP), 0, "a runner off or restarting for 15 minutes adds nothing");
});

test("a held runner's front waits past three hours of wall time without leaving the train", async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "train-clock-"));
  const calls = [];
  const gh = async (method, url) => {
    calls.push(`${method} ${url}`);
    if ( url.startsWith("/issues?") ) return [{number: 30, pull_request: {}, created_at: "2026-11-18T09:00:00Z", labels: [{name: TRAIN_LABEL}]}];
    if ( url.includes("/events") ) return [{event: "labeled", label: {name: TRAIN_LABEL}, created_at: "2026-11-18T10:00:00Z"}];
    if ( url.startsWith("/pulls?") ) return [];
    if ( url === "/pulls/30" ) return {number: 30, draft: false, mergeable: true, user: {login: "thebadman7824"}, head: {sha: "h30", ref: "claude/x", repo: {full_name: "thebadman7824/wodx"}}, base: {ref: "main", repo: {full_name: "thebadman7824/wodx"}}};
    if ( url.startsWith("/compare/") ) return {behind_by: 0};
    if ( url.includes("/statuses") ) return [{context: "wodx/merge-rules", state: "failure", description: "Not ready: gate result"}];
    if ( url.includes("/check-runs") ) return {check_runs: [{name: "checks", status: "completed", conclusion: "success"}]};
    return [];
  };
  // at the front for 4 hours of wall time, 2.5 of them on the clock, and now held
  fs.writeFileSync(path.join(home, "train-state.json"), JSON.stringify({pr: 30, head: "h30", since: Date.now() - 4 * H, ran: 2.5 * H, tick: Date.now() - 60e3, ticking: false}));
  const held = await step({gh, home, apply: true, clockRuns: false});
  assert.equal(held.action, "wait");
  assert.ok(!calls.some(c => c.startsWith("DELETE")), "the label stays");
  // the clock runs again and passes three hours: then it leaves as before
  fs.writeFileSync(path.join(home, "train-state.json"), JSON.stringify({pr: 30, head: "h30", since: Date.now() - 4 * H, ran: 3 * H, tick: Date.now() - 60e3, ticking: true}));
  const late = await step({gh, home, apply: true, clockRuns: true});
  assert.equal(late.action, "leave");
});

test("the runner uses the priorities file, its windows and the train clock; nightly runs are health, urgent PR runs urgent", () => {
  const read = f => fs.readFileSync(new URL(f, import.meta.url), "utf8");
  const runner = read("../pcq/runner.mjs");
  assert.match(runner, /order\(queue, openNums, Date\.now\(\), P \? \{prio: P, sortQueue: PRIO\.sortQueue, isFront:/);
  assert.match(runner, /const win = P \? PRIO\.activeWindow\(P, HOST\) : null;\n\s*const holding = hold \|\| !!win;/);
  assert.match(runner, /trainClock = P \? PRIO\.trainClockRuns\(P, \{held: hold, window: !!win\}\) : !hold;/);
  assert.match(runner, /clockRuns: trainClock\}/);
  assert.match(read("../pcq/nightly-gates.mjs"), /"--prio", "3", "--class", "health", "--json"/);
  assert.match(read("../pcq/pr-gates.mjs"), /labels\.includes\("urgent"\) \? \["--class", "urgent"\] : \[\]/);
  // a window in the file holds that PC from holdMinutesBefore ahead
  const p = {...P, windows: {holdMinutesBefore: 30, planned: [{pc: "BENJAMIN-PC", from: "2026-11-21T15:00:00Z", to: "2026-11-21T17:00:00Z", why: "RAM install"}]}};
  assert.equal(PRIO.activeWindow(p, "benjamin-pc", Date.parse("2026-11-21T14:40:00Z"))?.why, "RAM install");
  assert.equal(PRIO.activeWindow(p, "benjamin-pc", Date.parse("2026-11-21T14:20:00Z")), null);
  assert.equal(PRIO.trainClockRuns(p, {window: true}), false);
});
