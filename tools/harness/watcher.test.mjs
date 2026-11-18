/* The PC watcher on the laptop: it turns the PCs' status files, the runners' status issues, the job queue, the merge
   train and the alerts into problems and notes, and only looks and reports. */
import assert from "node:assert/strict";
import {test} from "node:test";
import {assess, report, parseTrain, statusStamp, LIMITS, PCS} from "../pcq/watcher.mjs";

const NOW = Date.parse("2026-11-18T03:00:00Z");
const iso = minAgo => new Date(NOW - minAgo * 60e3).toISOString();
const stamp = minAgo => `Updated ${iso(minAgo).slice(0, 16)}Z by the PC runner (x) at abc.`;
const pc = (key, minAgo, extra = {}) => ({host: key, time: iso(minAgo), runnerUp: true, lanes: PCS.find(p => p.key === key).lanes.map(id => ({id, up: true})), gpu: null, issues: 0, ...extra});
const statusIssue = (key, minAgo, more = "") => ({number: {main: 1066, secondary: 1822, laptop: 1805}[key], title: PCS.find(p => p.key === key).statusTitle, updated_at: iso(minAgo), body: `${stamp(minAgo)}\n${more}`});
const healthy = (over = {}) => ({now: NOW, pcs: {main: pc("main", 2), secondary: pc("secondary", 3), laptop: pc("laptop", 1)},
  statusIssues: [statusIssue("main", 1, "Merge train: front #1880, wait (gates not reported yet); line #1880, #1988"), statusIssue("secondary", 1), statusIssue("laptop", 1)],
  jobs: [], alerts: [], local: {runner: true, watchdog: true, statusPush: true}, ...over});

test("all clear when every PC, runner and job is fresh", () => {
  const a = assess(healthy());
  assert.deepEqual(a.problems, []);
  assert.equal(a.train.front, 1880);
  assert.match(report(a, NOW, "Laptop"), /All clear/);
});

test("a PC silent on both its status push and its runner reads as off; runner-only silence reads as a stopped runner", () => {
  const s = healthy({pcs: {...healthy().pcs, main: pc("main", 60)}});
  s.statusIssues[0] = statusIssue("main", 61);
  assert.ok(assess(s).problems.some(p => p.key === "main:silent" && /probably off/.test(p.text)));
  const r = healthy({pcs: {...healthy().pcs, secondary: pc("secondary", 2, {runnerUp: false})}});
  r.statusIssues[1] = statusIssue("secondary", 45);
  const p = assess(r).problems.find(x => x.key === "secondary:runner");
  assert.ok(p, "runner silent problem"); assert.match(p.text, /says the runner is not running/);
});

test("a missing status file or status issue counts as silent, not as fine", () => {
  const s = healthy({pcs: {...healthy().pcs, laptop: null}, statusIssues: healthy().statusIssues.filter(i => i.number !== 1805)});
  assert.ok(assess(s).problems.some(p => p.key === "laptop:silent"));
});

test("status push quiet but runner alive is a note, and its old lane readings are not trusted", () => {
  const s = healthy({pcs: {...healthy().pcs, secondary: pc("secondary", 25, {lanes: [{id: 8, up: false}]})}});
  const a = assess(s);
  assert.equal(a.problems.length, 0);
  assert.ok(a.notes.some(n => /status push has been quiet/.test(n)));
  const long = assess(healthy({pcs: {...healthy().pcs, secondary: pc("secondary", 2 * LIMITS.pushStaleMin + 5)}}));
  assert.ok(long.problems.some(p => p.key === "secondary:push"), "a push quiet past twice the limit is a problem");
});

test("lanes down and a hot graphics card on a live PC are problems", () => {
  const s = healthy({pcs: {...healthy().pcs, main: pc("main", 2, {lanes: [{id: 2, up: false}, {id: 3, up: true}], gpu: {tempC: 84, vramPct: 50, warning: "critical", loadPct: 99, jobHeld: true}})}});
  const keys = assess(s).problems.map(p => p.key);
  assert.ok(keys.includes("main:lanes:2")); assert.ok(keys.includes("main:gpu"));
});

test("jobs running or waiting past their limits are flagged; younger ones are not", () => {
  const h = x => iso(x * 60);
  const s = healthy({jobs: [
    {number: 1, title: "PC job: a", created_at: h(10), running: true, startedAt: h(LIMITS.jobRunHours + 1)},
    {number: 2, title: "PC job: b", created_at: h(10), running: true, startedAt: h(1)},
    {number: 3, title: "PC job: c", created_at: h(LIMITS.jobWaitHours + 1), running: false},
    {number: 4, title: "PC job: d", created_at: h(1), running: false}]});
  assert.deepEqual(assess(s).problems.map(p => p.key).sort(), ["job:1:run", "job:3:wait"]);
});

test("the train is stuck only when the same front stays past the limit across cycles", () => {
  const first = assess(healthy());
  assert.equal(first.state.train.front, 1880);
  const later = {...first.state, train: {front: 1880, since: NOW - (LIMITS.trainFrontHours + 0.5) * 3600e3}};
  assert.ok(assess(healthy(), later).problems.some(p => p.key === "train:1880"));
  const moved = {...first.state, train: {front: 1700, since: NOW - 10 * 3600e3}};
  assert.ok(!assess(healthy(), moved).problems.some(p => p.key.startsWith("train")), "a new front starts the clock again");
});

test("a problem is confirmed only on its second cycle in a row", () => {
  const s = healthy({local: {runner: false, watchdog: true, statusPush: true}});
  const one = assess(s);
  assert.equal(one.problems.length, 1); assert.equal(one.confirmed.length, 0);
  assert.equal(assess(s, one.state).confirmed.length, 1);
  assert.equal(assess(healthy(), one.state).confirmed.length, 0, "cleared resets the count");
});

test("alerts about a silent Main PC that is back are listed as left open; the watcher's own alert is skipped", () => {
  const s = healthy({alerts: [{number: 2000, title: "Second PC alert: the main PC runner has been silent for 24 minutes", created_at: iso(30)},
    {number: 1532, title: "PC runner alert: stale pull requests", created_at: iso(3000)},
    {number: 9, title: "PC watcher alert", created_at: iso(3000)}]});
  const a = assess(s);
  assert.ok(a.notes.some(n => /did not close.*#2000/.test(n)));
  assert.ok(a.notes.some(n => /over 24 h: #1532\./.test(n)));
});

test("the report says plainly that OCR cannot be seen", () => {
  assert.match(report(assess(healthy()), NOW, "Laptop"), /OCR \(Secondary PC\) publishes no status/);
});

test("parsers: the train line and the status stamp", () => {
  assert.deepEqual(parseTrain("x\nMerge train: front #12, merge (green); line #12, #13\n"), {front: 12, line: [12, 13], why: "merge (green)"});
  assert.equal(parseTrain("no train here"), null);
  assert.equal(statusStamp("Updated 2026-11-18T01:52Z by the PC runner"), "2026-11-18T01:52:00Z");
});
