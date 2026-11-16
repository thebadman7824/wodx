/**
 * PC job queue (B4100-B4109): the job format, its checks and the commands each job runs. Shared by the PC runner
 * (runner.mjs) and the cloud helper (submit.mjs), and tested in tools/harness/pcq.test.mjs.
 *
 * A job is a GitHub issue in thebadman7824/wodx with the label pc-job, opened by the owner's account, whose body holds
 * one fenced json block:
 *
 *   {"kind": "gates", "gates": ["gateplains", "gatelifepath"], "ref": "main", "lanes": 2, "prio": 1,
 *    "thread": "cmsg_...", "after": 1234}
 *
 * Kinds (nothing else runs; every command is spawned with an argument list, never through a shell):
 *   gates       run-gate.mjs on testbed lanes: "gates" (names), or "touched": true, or "all": true; "lanes": how many
 *               lanes to split over (default 1); "reset": true resets each lane first. Lanes share one list of the
 *               gates (B6526) and lanes that free up later join while it holds work: up to "lanes", or every lane
 *               when no other lane job is waiting
 *   gate-two    a two-browser gate (gate-two.mjs) on one lane, reset before and after: "gate"
 *   deploy      deploy the ref to "lanes" lanes (or "lane": N), nothing else
 *   reset       reset "lane" N (a runner lane, never 1) to the known-good world
 *   setup-lane  set up "lane" N from lane 1's Config and the known-good world (only lanes listed in lanes.json);
 *               "again": true sets up a lane that has a world already, taking lane 1's installed modules afresh
 *   books-find  tools/books/books.mjs find over the PC's book texts: "terms" (up to 40), optional "book";
 *               the result lists book and page only, never the text (the repository is public)
 *   trove-find  names of files under F:\TheTrove whose name holds "pattern" (letters, digits, spaces, - _ . ( ) &),
 *               optional "under" (a folder below the Trove); names only
 * Common: "ref" is main (default), a claude/... branch or a commit sha; "prio" 1 (first) to 5 (default 3), matching
 * the Master Plan order; "after" an issue number this job waits for; "thread" the thread to tell.
 */
export const OWNER = "thebadman7824", REPO_NAME = "wodx";
export const LABEL = {job: "pc-job", running: "pc-running", done: "pc-done", failed: "pc-failed", alert: "pc-alert", status: "pc-status"};
export const KINDS = ["gates", "gate-two", "deploy", "reset", "setup-lane", "books-find", "trove-find"];
export const LANE_KINDS = new Set(["gates", "gate-two", "deploy", "reset", "setup-lane"]);
const NAME = /^[\w-]{1,64}$/;
const REF = /^(main|claude\/[\w.\/-]{1,80}|[0-9a-f]{7,40})$/;
const TERM = /^[\p{L}\p{N} '’.,()&-]{1,80}$/u;
const PATTERN = /^[\p{L}\p{N} _.()&-]{2,80}$/u;
const UNDER = /^[\p{L}\p{N} _.()&\[\]\\\/-]{1,200}$/u;

/** The json block of an issue body, or an error. */
export function parseBody(body) {
  const m = /```(?:json)?\s*\n([\s\S]*?)\n```/.exec(String(body ?? ""));
  if ( !m ) return {error: "No ```json block in the issue body."};
  try { return {job: JSON.parse(m[1])}; } catch (e) { return {error: `The json block does not parse: ${e.message}`}; }
}

/** Checks a job against the format above. Returns {job} (normalised) or {error}. laneIds: the runner's lanes. */
export function validate(raw, laneIds = []) {
  const err = error => ({error});
  if ( !raw || typeof raw !== "object" || Array.isArray(raw) ) return err("The job must be a json object.");
  const j = {...raw};
  if ( !KINDS.includes(j.kind) ) return err(`kind must be one of ${KINDS.join(", ")}.`);
  j.ref = j.ref ?? "main";
  if ( typeof j.ref !== "string" || !REF.test(j.ref) || j.ref.includes("..") ) return err("ref must be main, a claude/... branch or a commit sha.");
  j.prio = j.prio ?? 3;
  if ( !Number.isInteger(j.prio) || j.prio < 1 || j.prio > 5 ) return err("prio must be a whole number from 1 to 5.");
  if ( j.after !== undefined && !(Number.isInteger(j.after) && j.after > 0) ) return err("after must be an issue number.");
  if ( j.thread !== undefined && !/^cmsg_\w{10,80}$/.test(j.thread) ) return err("thread must be a cmsg_ id.");
  const lanes = laneIds.map(String);
  const oneLane = () => {
    if ( j.lane === undefined ) return null;
    if ( String(j.lane) === "1" ) return "Lane 1 is Ben's own testbed; the runner never uses it.";
    if ( !lanes.includes(String(j.lane)) ) return `lane must be one of the runner's lanes (${lanes.join(", ")}).`;
    return null;
  };
  const e = oneLane(); if ( e ) return err(e);
  switch ( j.kind ) {
    case "gates": {
      const list = j.gates ?? [];
      if ( !Array.isArray(list) || list.some(g => typeof g !== "string" || !NAME.test(g)) ) return err("gates must be a list of gate names.");
      if ( !list.length && !j.touched && !j.all ) return err("Give gates, or touched: true, or all: true.");
      if ( list.length > 300 ) return err("At most 300 gates in one job.");
      j.gates = [...new Set(list)];
      j.lanes = j.lane !== undefined ? 1 : (j.lanes ?? 1);
      if ( !Number.isInteger(j.lanes) || j.lanes < 1 ) return err("lanes must be a whole number, 1 or more.");
      j.lanes = Math.min(j.lanes, Math.max(1, lanes.length));
      // a named list is never split over more lanes than it has gates (an empty share used to read as a failure)
      if ( list.length && !j.touched && !j.all ) j.lanes = Math.min(j.lanes, j.gates.length);
      break;
    }
    case "gate-two":
      if ( typeof j.gate !== "string" || !NAME.test(j.gate) ) return err("gate must be a gate name.");
      j.lanes = 1; break;
    case "deploy":
      j.lanes = j.lane !== undefined ? 1 : Math.min(Math.max(1, Number.isInteger(j.lanes) ? j.lanes : 1), Math.max(1, lanes.length)); break;
    case "reset": case "setup-lane":
      if ( j.lane === undefined ) return err(`${j.kind} needs lane.`);
      j.lanes = 1; break;
    case "books-find": {
      const t = j.terms;
      if ( !Array.isArray(t) || !t.length || t.length > 40 || t.some(x => typeof x !== "string" || !TERM.test(x)) )
        return err("terms must be 1 to 40 words or phrases (letters, digits, spaces and simple punctuation).");
      if ( j.book !== undefined && !(typeof j.book === "string" && NAME.test(j.book)) ) return err("book must be a book id.");
      j.lanes = 0; break;
    }
    case "trove-find":
      if ( typeof j.pattern !== "string" || !PATTERN.test(j.pattern) ) return err("pattern must be 2 to 80 letters, digits, spaces or - _ . ( ) &.");
      if ( j.under !== undefined && (typeof j.under !== "string" || !UNDER.test(j.under) || j.under.includes("..")) ) return err("under must be a folder below the Trove.");
      j.lanes = 0; break;
  }
  return {job: j};
}

/**
 * Queue order: priority first, then the older issue. Skips jobs waiting on an open issue (after).
 * B6490: a job gains one priority step for each hour it has waited (never past 1), so a p5 job is not passed over all
 * day by newer p1 and p3 jobs. A job's wait counts from its issue's created_at; `now` is for tests.
 */
export function effectivePrio(j, now = Date.now()) {
  const made = Date.parse(j.issue?.created_at ?? j.created_at ?? "");
  const hours = Number.isFinite(made) ? Math.max(0, Math.floor((now - made) / 3600000)) : 0;
  return Math.max(1, j.job.prio - hours);
}
export function order(jobs, openNumbers = new Set(), now = Date.now()) {
  return jobs.filter(j => !(j.job.after && openNumbers.has(j.job.after)))
    .sort((a, b) => effectivePrio(a, now) - effectivePrio(b, now) || a.number - b.number);
}

/**
 * The run-gate.mjs arguments for one lane's share of a gates job. i: 0-based share, n: lanes in the job.
 * Two-browser gates are not in the gate map and are left to gate-two jobs.
 */
export function gateArgs(job, lane, i, n, report) {
  // B6526: a shared queue: every lane takes the next gate from the same list until it is empty
  if ( job.queue ) return ["--queue", job.queue, "--lane", String(lane), "--wait", "10", "--report", report, ...(job.maxMinutes ? ["--max-minutes", String(job.maxMinutes)] : [])];
  const a = [...job.gates];
  if ( job.touched ) a.push("--touched");
  if ( job.all ) a.push("--all");
  a.push("--lane", String(lane));
  if ( n > 1 ) a.push("--shard", `${i + 1}/${n}`);
  a.push("--wait", "10", "--report", report);
  return a;
}

/** The gates a run-gate report lists as failing (x/y passed with x < y, or ERROR), each once, in order. */
export function failingGates(report = "") {
  const out = [];
  for ( const m of String(report).matchAll(/^(gate[\w-]*): (?:(\d+)\/(\d+) passed|ERROR)/gm) )
    if ( (m[2] === undefined || Number(m[2]) < Number(m[3])) && !out.includes(m[1]) ) out.push(m[1]);
  return out;
}

/**
 * What a recheck says about each failing gate (B4610). first: the job's report; alone: the same gates rerun alone on
 * a fresh lane on the same commit; main: rerun on main (null when the job ran main). Returns [{gate, verdict}]:
 * "fails on main too" (not this change's: the gate or main is at fault), "new with this change", "passes alone"
 * (it fails only after other gates: leftovers or order), or "fails" on main jobs.
 */
export function recheckVerdicts(gates, alone, main, notOnMain = new Set()) {
  const bad = r => new Set(failingGates(r));
  const a = bad(alone), m = main === null ? null : bad(main);
  return gates.map(gate => {
    if ( !a.has(gate) ) return {gate, verdict: "passes alone: it fails only after other gates (leftovers or order)"};
    // B5590: a gate this change adds cannot run on main, so its failure there says nothing: the change must fix it.
    if ( notOnMain.has(gate) ) return {gate, verdict: "NEW with this change: the gate is not on main yet, so this change must fix it"};
    if ( m === null ) return {gate, verdict: "fails alone too"};
    return {gate, verdict: m.has(gate) ? "fails on main too: not this change's fault" : "NEW with this change: passes on main"};
  });
}

/** Exit codes of run-gate.mjs that mean the lane, not the code, went wrong: worth one retry after a reset. */
export const INFRA_CODES = new Set([3, 4, 5]);
export const isInfraFault = code => INFRA_CODES.has(code) || code === null;

/**
 * Checks the runner's lane list before it starts: no lane 1, no lane twice, no port twice or on 30000 (lane 1) or
 * 30010 (the solo world), no shared data folder, no Live world. Returns a list of problems.
 */
export function laneClashes(cfg, runnerLanes) {
  const out = [], lanes = cfg.lanes ?? [];
  const pick = runnerLanes.map(id => lanes.find(l => String(l.id) === String(id)));
  runnerLanes.forEach((id, i) => { if ( !pick[i] ) out.push(`lane ${id} is not in lanes.json`); });
  const ok = pick.filter(Boolean);
  if ( ok.some(l => String(l.id) === "1") ) out.push("lane 1 is Ben's testbed and cannot be a runner lane");
  const seen = (key, what) => {
    const m = new Map();
    for ( const l of lanes ) { const k = String(l[key]).toLowerCase().replace(/\\/g, "/"); if ( m.has(k) ) out.push(`lanes ${m.get(k)} and ${l.id} share ${what} ${l[key]}`); else m.set(k, l.id); }
  };
  seen("id", "the id"); seen("port", "port"); seen("dataPath", "the data folder");
  for ( const l of ok ) {
    if ( [30000, 30010].includes(Number(l.port)) && String(l.id) !== "1" ) out.push(`lane ${l.id} uses port ${l.port}, kept for lane 1 or the solo world`);
    if ( /live/i.test(String(cfg.world)) || /live/i.test(String(l.world ?? "")) ) out.push(`lane ${l.id} points at a Live world`);
    if ( !l.autoReset ) out.push(`lane ${l.id} is not reset nightly (autoReset false)`);
  }
  return out;
}

/** Cuts a comment to GitHub's limit, keeping the start. */
export const fit = (s, max = 60000) => s.length <= max ? s : `${s.slice(0, max - 200)}\n\n(cut: ${s.length - max + 200} more characters are in the runner log on the PC)`;

/** The issue body for a job, as submit.mjs prints it and the runner reads it. */
export const issueBody = (job, note = "") => `${note ? note + "\n\n" : ""}\`\`\`json\n${JSON.stringify(job, null, 1)}\n\`\`\`\n\nRun by the PC runner (tools/pcq). Testbed lanes only; never lane 1 or Live.`;
