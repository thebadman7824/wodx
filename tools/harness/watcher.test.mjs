/* The PC watcher on the laptop: it turns the PCs' status files, the runners' status issues, the job queue, the merge
   train and the alerts into problems and notes, and only looks and reports. */
import assert from "node:assert/strict";
import {test} from "node:test";
import {assess, report, parseTrain, statusStamp, greenAt, trainSource, LIMITS, PCS, TRAIN_LABEL, OCR_RUN} from "../pcq/watcher.mjs";
import {comfyFrom, ocrLogState} from "../pcq/status-push.mjs";

const NOW = Date.parse("2026-11-18T03:00:00Z");
const iso = minAgo => new Date(NOW - minAgo * 60e3).toISOString();
const stamp = minAgo => `Updated ${iso(minAgo).slice(0, 16)}Z by the PC runner (x) at abc.`;
const pc = (key, minAgo, extra = {}) => ({host: key, time: iso(minAgo), runnerUp: true, lanes: PCS.find(p => p.key === key).lanes.map(id => ({id, up: true})), gpu: null, issues: 0, ...extra});
const statusIssue = (key, minAgo, more = "") => ({number: {main: 1066, secondary: 1822, laptop: 1805, newpc: 2308}[key], title: PCS.find(p => p.key === key).statusTitle, updated_at: iso(minAgo), body: `${stamp(minAgo)}\n${more}`});
const healthy = (over = {}) => ({now: NOW, pcs: {main: pc("main", 2), secondary: pc("secondary", 3), laptop: pc("laptop", 1), newpc: pc("newpc", 2)},
  statusIssues: [statusIssue("main", 1, "Merge train: front #1880, wait (gates not reported yet); line #1880, #1988"), statusIssue("secondary", 1), statusIssue("laptop", 1), statusIssue("newpc", 1)],
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

test("the New PC is watched like the Main PC and the Secondary: lanes 10 to 13, its own status issue, silent, push and lane problems", () => {
  const p = PCS.find(x => x.key === "newpc");
  assert.deepEqual([p.label, p.statusTitle, p.lanes], ["New PC", "PC runner status (New PC)", [10, 11, 12, 13]]);
  const a = assess(healthy());
  assert.ok(a.rows.some(r => r.pc === "New PC" && r.lanes === "10, 11, 12, 13" && r.state === "ok" && /#2308/.test(r.runner)));
  const off = healthy({pcs: {...healthy().pcs, newpc: null}, statusIssues: healthy().statusIssues.filter(i => i.number !== 2308)});
  assert.ok(assess(off).problems.some(x => x.key === "newpc:silent" && /New PC is silent/.test(x.text)));
  // No status file yet (status-push not started there) while its runner is alive: a push problem, not "off".
  const noPush = assess(healthy({pcs: {...healthy().pcs, newpc: null}}));
  assert.ok(noPush.problems.some(x => x.key === "newpc:push" && /never sent a status file \(registry\/pc-status\/newpc\.json\).*PC_STATUS_NAME=newpc PC_LANES=10,11,12,13/.test(x.text)));
  assert.ok(!noPush.problems.some(x => x.key === "newpc:silent"));
  assert.ok(noPush.rows.some(r => r.pc === "New PC" && r.state === "no status push"));
  const lane = assess(healthy({pcs: {...healthy().pcs, newpc: pc("newpc", 2, {lanes: [{id: 10, up: false}]})}}));
  assert.ok(lane.problems.some(x => x.key === "newpc:lane:10" && /New PC: lane 10 not answering/.test(x.text)));
  const run = healthy(); run.statusIssues[3] = statusIssue("newpc", LIMITS.runnerStaleMin + 5);
  assert.ok(assess(run).problems.some(x => x.key === "newpc:runner"));
  // Its runner's "main PC runner has been silent" alert is listed as leaked once the Main PC is back, like the others'.
  const leak = assess(healthy({alerts: [{number: 9, title: "New PC alert: the main PC runner has been silent for 30 minutes", created_at: iso(10)}]}));
  assert.ok(leak.notes.some(n => /#9/.test(n)));
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
  assert.ok(keys.includes("main:lane:2")); assert.ok(keys.includes("main:gpu"));
});

test("lanes: one key each, lane 6 skipped, confirmed only after three cycles even when another lane flaps", () => {
  const withLanes = lanes => healthy({pcs: {...healthy().pcs, main: pc("main", 2, {lanes: lanes.map(([id, up]) => ({id, up}))})}});
  const a1 = assess(withLanes([[2, false], [6, false]]));
  assert.deepEqual(a1.problems.map(p => p.key), ["main:lane:2"], "lane 6 is down on purpose");
  const a2 = assess(withLanes([[2, false], [3, false]]), a1.state);
  assert.equal(a2.confirmed.length, 0);
  const a3 = assess(withLanes([[2, false]]), a2.state);
  assert.deepEqual(a3.confirmed.map(p => p.key), ["main:lane:2"], "lane 2 counts up while lane 3 comes and goes");
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

test("the report says plainly that OCR and ComfyUI cannot be seen when no PC sends them", () => {
  const r = report(assess(healthy()), NOW, "Laptop");
  assert.match(r, /OCR \(Secondary PC\) sends no status yet/); assert.match(r, /ComfyUI sends no status yet/);
});

test("renders: work in ComfyUI with nothing finished for over the limit is a problem; idle or busy-and-moving is a note", () => {
  const withComfy = comfy => healthy({pcs: {...healthy().pcs, main: pc("main", 2, {comfy})}});
  assert.ok(assess(withComfy({up: true, running: 1, pending: 3, lastDoneMin: LIMITS.renderStallMin + 5})).problems.some(p => p.key === "main:render"));
  const down = {up: false, running: 0, pending: 0, lastDoneMin: null};
  const held = healthy({pcs: {...healthy().pcs, main: pc("main", 2, {comfy: down, gpu: {tempC: 60, vramPct: 20, warning: "ok", loadPct: 30, jobHeld: true}})}});
  assert.ok(assess(held).problems.some(p => p.key === "main:comfy"), "ComfyUI down while a render holds the guard");
  for ( const c of [{up: true, running: 1, pending: 0, lastDoneMin: 4}, {up: true, running: 0, pending: 0, lastDoneMin: 600}, down] ) {
    const a = assess(withComfy(c));
    assert.equal(a.problems.length, 0, JSON.stringify(c)); assert.ok(a.notes.some(n => /Main PC: ComfyUI/.test(n)));
  }
});

test("OCR: gave up or workers with no output past the limit are problems; waiting for memory alone is a note", () => {
  const withOcr = ocr => healthy({pcs: {...healthy().pcs, secondary: pc("secondary", 2, {ocr})}});
  const assessRun = (snap, prev = {}) => assess(snap, prev, {ocrRun: true});
  assert.ok(assessRun(withOcr({workers: 1, lastOutputMin: 5, memWait: true, gaveUp: true})).problems.some(p => p.key === "secondary:ocr:gaveup"));
  const st = assessRun(withOcr({workers: 2, lastOutputMin: LIMITS.ocrStallMin + 1, memWait: true, gaveUp: false})).problems.find(p => p.key === "secondary:ocr:stalled");
  assert.ok(st); assert.match(st.text, /waiting for memory/);
  assert.ok(assessRun(withOcr({workers: 0, loopUp: false, lastOutputMin: 900, memWait: true, gaveUp: false, stopped: false})).problems.some(p => p.key === "secondary:ocr:loop"), "a dead loop");
  assert.equal(assessRun(withOcr({workers: 0, loopUp: false, lastOutputMin: 900, memWait: false, gaveUp: false, stopped: true})).problems.length, 0, "stopped on purpose");
  assert.equal(assessRun(withOcr({workers: 0, loopUp: true, lastOutputMin: 900, memWait: true, gaveUp: false, stopped: false})).problems.length, 0, "the loop waiting between batches");
  const ok = assessRun(withOcr({workers: 1, lastOutputMin: 10, memWait: true, gaveUp: false}));
  assert.equal(ok.problems.length, 0); assert.ok(ok.notes.some(n => /book OCR 1 worker running.*waiting for memory/.test(n)));
});

test("B8110: with no OCR run under way, a stopped OCR loop is a note, not a problem", () => {
  assert.equal(OCR_RUN, false, "the OCR pass finished on 25 November 2026");
  const snap = healthy({pcs: {...healthy().pcs, secondary: pc("secondary", 2, {ocr: {workers: 0, loopUp: false, lastOutputMin: 900, memWait: false, gaveUp: true, stopped: false}})}});
  const a = assess(snap);
  assert.equal(a.problems.filter(p => /:ocr:/.test(p.key)).length, 0);
  assert.ok(a.notes.some(n => /no OCR run is under way/.test(n)));
  assert.ok(assess(snap, {}, {ocrRun: true}).problems.some(p => p.key === "secondary:ocr:loop" || p.key === "secondary:ocr:gaveup"));
});

test("status push: ComfyUI's queue and history become counts and minutes", () => {
  const now = Date.parse("2026-11-18T04:00:00Z");
  const hist = {a: {status: {messages: [["execution_start", {timestamp: now - 50 * 60e3}], ["execution_success", {timestamp: now - 40 * 60e3}]]}},
    b: {status: {messages: [["execution_error", {timestamp: now - 12 * 60e3}]]}}};
  assert.deepEqual(comfyFrom({queue_running: [[1]], queue_pending: [[2], [3]]}, hist, now), {up: true, running: 1, pending: 2, lastDoneMin: 12});
  assert.deepEqual(comfyFrom({}, {}, now), {up: true, running: 0, pending: 0, lastDoneMin: null});
  const st = (memWait, gaveUp, stopped) => ({memWait, gaveUp, stopped});
  assert.deepEqual(ocrLogState(["page 12 done", "waiting for free memory (3.1 GB, need 4)"]), st(true, false, false));
  assert.deepEqual(ocrLogState(["page 13 done"]), st(false, false, false));
});

test("status push: the Secondary PC's real OCR log wordings, NULs from UTF-16 lines stripped, newest state wins", () => {
  const st = (memWait, gaveUp, stopped) => ({memWait, gaveUp, stopped});
  const u16 = s => [...s].join("\0") + "\0";
  assert.deepEqual(ocrLogState(["2026-11-17T23:05:36-05:00 waiting: 8.5 GB free commit, 10013 pages left"]), st(true, false, false));
  assert.deepEqual(ocrLogState(["batch cut short: 3.2 GB free commit"]), st(true, false, false));
  assert.deepEqual(ocrLogState([u16("gpu guard: waited 120 min for 7 GB free, gave up"), "batch 14 exit 3"]), st(false, true, false));
  assert.deepEqual(ocrLogState(["waiting: 8.5 GB free commit, 10013 pages left", "pause file present; stopping", "loop end"]), st(false, false, true));
  assert.deepEqual(ocrLogState(["gpu guard: waited 120 min for 7 GB free, gave up", "batch 14 exit 3", "waiting: 9.1 GB free commit, 10000 pages left"]), st(true, false, false), "a newer wait replaces an older give-up");
});

test("parsers: the train line and the status stamp", () => {
  assert.deepEqual(parseTrain("x\nMerge train: front #12, merge (green); line #12, #13\n"), {front: 12, line: [12, 13], why: "merge (green)"});
  assert.equal(parseTrain("no train here"), null);
  assert.equal(statusStamp("Updated 2026-11-18T01:52Z by the PC runner"), "2026-11-18T01:52:00Z");
});

test("B7421: a green pull request nobody will merge raises the alert at once; one waiting behind the train front is a note", () => {
  const ms = minAgo => NOW - minAgo * 60e3;
  const prs = [
    {number: 2055, title: "Recheck stopped fix", draft: true, labels: [], greenSince: ms(20)},       // the 18 November wait
    {number: 2035, title: "gatecorruption", draft: true, labels: [], greenSince: ms(10)},           // not 15 minutes yet
    {number: 1880, title: "Shared dice", draft: false, labels: [TRAIN_LABEL], greenSince: ms(30)},  // the train front
    {number: 1988, title: "Waiting", draft: false, labels: [TRAIN_LABEL], greenSince: ms(90)},      // behind the front
    {number: 1855, title: "HOLD: names", draft: true, labels: [], greenSince: ms(90)},              // held on purpose
    {number: 1999, title: "Red", draft: false, labels: [], greenSince: null}];
  const a = assess(healthy({prs}), {train: {front: 1880, since: ms(40)}});
  assert.deepEqual(a.problems.map(p => p.key).sort(), ["pr:1880:green", "pr:2055:green"]);
  assert.deepEqual(a.confirmed.map(p => p.key).sort(), ["pr:1880:green", "pr:2055:green"], "no second cycle needed: the age is already measured");
  assert.match(a.problems.find(p => p.key === "pr:2055:green").text, /#2055 \(draft\).*20 min.*not in the merge train/);
  assert.match(a.problems.find(p => p.key === "pr:1880:green").text, /front #1880.*has not merged it/);
  assert.ok(a.notes.some(n => /waiting their turn in the merge train: #1988\./.test(n)));
  assert.deepEqual(assess(healthy()).problems, [], "no pull request list (an old snapshot) is fine");
  const justFront = assess(healthy({prs: [{number: 1880, title: "Shared dice", labels: [TRAIN_LABEL], greenSince: ms(300)}]}), {train: {front: 1880, since: ms(5)}});
  assert.deepEqual(justFront.problems, [], "a front reached 5 minutes ago, green for hours, is still being brought up to date");
  const stuck = assess(healthy({prs: [{number: 1880, title: "Shared dice", labels: [TRAIN_LABEL], greenSince: ms(300)}]}), {train: {front: 1880, since: ms(20)}});
  assert.ok(stuck.problems.some(p => p.key === "pr:1880:green" && /20 min/.test(p.text)));
});

test("B7421: green means the newest checks run passed and the newest merge rules status is success", () => {
  const run = (conclusion, started, done) => ({name: "checks", status: "completed", conclusion, started_at: started, completed_at: done});
  const ok = [{context: "wodx/merge-rules", state: "success", created_at: "2026-11-18T15:19:08Z"}];
  assert.equal(greenAt([run("success", "2026-11-18T15:10:00Z", "2026-11-18T15:20:45Z")], ok), Date.parse("2026-11-18T15:20:45Z"), "the later of the two");
  assert.equal(greenAt([run("success", "2026-11-18T15:00:00Z", "2026-11-18T15:05:00Z"), run("failure", "2026-11-18T15:10:00Z", "2026-11-18T15:20:00Z")], ok), null, "a newer red run wins");
  assert.equal(greenAt([{name: "checks", status: "in_progress", started_at: "2026-11-18T15:10:00Z"}], ok), null);
  assert.equal(greenAt([run("success", "x", "2026-11-18T15:20:45Z")], [{context: "wodx/merge-rules", state: "pending"}, ...ok]), null, "newest status first");
  assert.equal(greenAt([], ok), null);
});

test("B7550: the train is read from the runner that drives it, not a silent Main PC's last line", () => {
  // The Main PC died with #1848 at the front of its last status; the Secondary PC drives the train now and shows it empty.
  const snap = healthy({pcs: {main: null, secondary: pc("secondary", 3), laptop: pc("laptop", 1)},
    statusIssues: [statusIssue("main", 1700, "Merge train: front #1848, prepare (behind main by 47: main merged in); line #1848, #2104"),
      statusIssue("secondary", 1, "Merge train: empty (label a ready pull request merge-train)"), statusIssue("laptop", 1)]});
  const a = assess(snap, {train: {front: 1848, since: NOW - 28 * 3600e3}});
  assert.equal(a.train.front, null, "the Secondary PC's empty train wins over the dead Main PC's front");
  assert.equal(a.trainPc, "Secondary PC");
  assert.ok(!a.problems.some(p => p.key.startsWith("train")), "no stuck-train problem from a stale line");
  assert.equal(a.state.train, null);
  assert.match(report(a, NOW, "Laptop"), /Merge train: empty \(from the Secondary PC's runner\)/);
  // A front on the Secondary PC is tracked and blamed on it when its runner goes quiet.
  const front = healthy({statusIssues: [statusIssue("main", 1700, "Merge train: front #1848, wait; line #1848"),
    statusIssue("secondary", LIMITS.runnerStaleMin + 5, "Merge train: front #2098, wait (gates); line #2098"), statusIssue("laptop", 1)],
    pcs: {main: null, secondary: null, laptop: pc("laptop", 1)}});
  const b = assess(front, {train: {front: 2098, since: NOW - (LIMITS.trainFrontHours + 1) * 3600e3}});
  assert.equal(b.train.front, 2098, "both silent: the freshest line wins");
  assert.match(b.problems.find(p => p.key === "train:2098").text, /The Secondary PC, which drives the train, is silent\./);
});

test("B7550: trainSource prefers a live runner, then the freshest stamp, and skips issues with no train line", () => {
  const st = {main: statusIssue("main", 1, "Merge train: front #1, wait; line #1"), secondary: statusIssue("secondary", 5, "Merge train: front #2, wait; line #2"), laptop: statusIssue("laptop", 1)};
  assert.equal(trainSource(st, {main: false, secondary: false}).key, "main", "both live: the fresher one");
  assert.equal(trainSource(st, {main: true, secondary: false}).key, "secondary", "a live runner beats a silent one");
  assert.equal(trainSource({main: null, secondary: null, laptop: statusIssue("laptop", 1)}), null);
});
