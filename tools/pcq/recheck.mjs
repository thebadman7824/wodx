/**
 * B4610, B7310, B7380: the recheck of a gates job's failing gates, apart from runner.mjs so the harness can run it
 * with stand-in lanes. Each failing gate runs ALONE, one gate per run-gate call on a freshly reset lane, and no verdict
 * rests on a single run (jobs.mjs recheckStep): a failure alone is run once more (two different results: flaky), and
 * two failures alone then go to main the same way, where a pass is confirmed by a second run before it says NEW. All
 * the runs on this commit come first and the runs on main after, so the lane is deployed twice at most. The recheck
 * stops taking runs after RECHECK_MINUTES, or when stopped() says the job was cancelled or made stale; gates it did
 * not finish say so.
 *
 * deps: {lanesCmd(argv, opts) -> {code}, node(script, argv, opts), worktree(lane, ref) -> {dir, sha, error},
 *        stallFor(dir) -> minutes, log(msg), logs: folder for the per-run reports}
 */
import fs from "node:fs";
import path from "node:path";
import {failingGates, gatePassed, recheckStep} from "./jobs.mjs";

export const RECHECK_MINUTES = 120;

export async function recheck({job, lane, tag, wt, rep, L, stopped = () => false, deps}) {
  const {lanesCmd, node, worktree, stallFor = () => undefined, log = () => {}, logs} = deps;
  const failing = failingGates(rep).slice(0, 12);
  if ( !failing.length ) return "";
  const until = Date.now() + RECHECK_MINUTES * 60000;
  let runs = 0;
  const runOne = async (dir, gate) => {
    const f = path.join(logs, `${tag}-l${lane}-re${++runs}-${gate}.txt`);
    fs.rmSync(f, {force: true});
    await lanesCmd(["reset", "--lane", lane, "--repo", dir], {logTo: L});
    const d = await lanesCmd(["deploy", "--lane", lane, "--if-changed", "--repo", dir], {logTo: L});
    if ( d.code !== 0 ) return null;
    await node("tools/lanes/run-gate.mjs", [gate, "--lane", String(lane), "--wait", "10", "--report", f, "--repo", dir], {logTo: L, minutes: 36, stallMinutes: stallFor(dir)});
    return fs.existsSync(f) ? gatePassed(gate, fs.readFileSync(f, "utf8")) : null;
  };
  log(`${tag} lane ${lane}: rechecking ${failing.join(" ")}, each alone on a fresh lane`);
  const st = Object.fromEntries(failing.map(g => [g, {alone: [], main: job.ref === "main" ? null : [], notOnMain: false}]));
  const outOfTime = new Set();
  const settle = async (dir, side) => {
    for ( const g of failing ) {
      for ( ;; ) {
        const s = recheckStep(st[g].alone, st[g].main, {notOnMain: st[g].notOnMain});
        if ( s.next !== side ) break;
        if ( stopped() || Date.now() > until ) { outOfTime.add(g); break; }
        st[g][side].push(await runOne(dir, g));
      }
    }
  };
  await settle(wt.dir, "alone");
  if ( job.ref !== "main" && failing.some(g => recheckStep(st[g].alone, st[g].main).next === "main") ) {
    const m = await worktree(lane, "main");
    if ( m.error ) failing.forEach(g => { if ( st[g].main ) st[g].main.push(null); });
    else {
      for ( const g of failing ) if ( !fs.existsSync(path.join(m.dir, "tools", "gate", `${g}.mjs`)) ) st[g].notOnMain = true;
      if ( m.sha === wt.sha ) failing.forEach(g => { st[g].main = [...st[g].alone]; });
      else await settle(m.dir, "main");
    }
  }
  const rows = failing.map(g => {
    const s = recheckStep(st[g].alone, st[g].main, {notOnMain: st[g].notOnMain});
    const v = s.verdict ?? (outOfTime.has(g) ? `not settled: the recheck ran out of time (alone ${JSON.stringify(st[g].alone)}, main ${JSON.stringify(st[g].main)})` : "not settled");
    return `- ${g}: ${v}`;
  });
  return [`Recheck (each failing gate alone on a fresh lane, ${runs} run(s)):`, ...rows].join("\n");
}
