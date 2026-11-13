/**
 * Runs gates on whichever testbed lane is free, after a drift check.
 *   node tools/lanes/run-gate.mjs <gate> [<gate> ...] [--lane 2] [--wait 30] [--repo <checkout>] [--channel msedge]
 *   node tools/lanes/run-gate.mjs --touched [--base origin/main]   only the gates the checkout's changes need (B3083)
 *   node tools/lanes/run-gate.mjs --all [--shard 1/2]              every gate in the map (the nightly full run), or
 *                                                                 one share of them so two lanes split the list
 *   --report <file>       also write each gate's line and the exit code to this file
 *
 * 1. Picks the first lane in lanes.json that is up and not locked (or the one --lane names) and locks it.
 *    --wait N keeps looking for N minutes when every lane is busy.
 * 2. Code check: every file of every package the repo checkout holds (modules/*, system/worldofdarkness) must match
 *    the lane's Data folder byte for byte, versions included. Any difference stops the run.
 * 3. World check: the running server's versions must match the repo (a lane not restarted after a deploy runs old
 *    code), and the active modules, every world setting and the clock must match the lane's clean
 *    fingerprint (taken at the last reset or with lanes.mjs accept). Any difference stops the run. Changed
 *    documents are listed as a warning.
 * 4. Writes <dataPath>/wodx-lane/latest.json (the fingerprint used) and drift.json (the differences, if any).
 * 5. Runs each gate (Data/wodx-gate/<gate>.mjs run()) and puts the clock and the pause back after each one.
 * Exit codes: 0 all passed, 1 a gate failed, 3 no free lane, 4 drift found (nothing was run).
 * Never point a lane at the Live world: lanes.json only lists local testbed folders.
 */
import path from "node:path";
import {loadConfig, getLane, laneDir, laneUrl, acquireLock, releaseLock, pickLane, isUp, codeFingerprint, expectedCode,
  diffCode, diffRunning, WORLD_PROBE, worldFingerprint, diffWorld, readJson, writeJson, printDiffs, REPO} from "./lib.mjs";
import {openGM} from "./browser.mjs";
import {gateMap, touched, gatesFor, changedPaths} from "./gate-map.mjs";
import fs from "node:fs";

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };
const valued = new Set(["lane", "wait", "repo", "channel", "base", "shard", "report"]);
let gates = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && valued.has(args[i - 1].slice(2))));
if ( args.includes("--all") ) gates.push(...Object.keys(gateMap()));
if ( args.includes("--touched") ) {
  const t = touched(changedPaths(opt("base") ?? "origin/main", path.resolve(opt("repo") ?? REPO)));
  const list = gatesFor(t.modules, t.gates);
  console.log(`Touched modules: ${t.modules.join(", ") || "none"}; ${list.length} gate(s) to run.`);
  if ( !list.length && !gates.length ) { console.log("Nothing in this change needs a gate."); process.exit(0); }
  gates.push(...list);
}
gates = [...new Set(gates)];
const shard = /^(\d+)\/(\d+)$/.exec(opt("shard") ?? "");
if ( shard ) gates = gates.filter((_, i) => i % +shard[2] === +shard[1] - 1);
if ( !gates.length || gates.some(g => !/^[\w-]+$/.test(g)) ) {
  console.error("Usage: node tools/lanes/run-gate.mjs <gate> [<gate> ...] | --touched | --all [--shard i/n] [--lane N] [--wait minutes]");
  process.exit(2);
}
const reportFile = opt("report");
const report = line => { if ( reportFile ) fs.appendFileSync(reportFile, line + "\n"); };
report(`==== ${new Date().toISOString()} ${gates.length} gate(s)${shard ? ` shard ${shard[0]}` : ""}`);
const cfg = loadConfig();
const repo = path.resolve(opt("repo") ?? REPO);
const only = opt("lane") ? [String(opt("lane"))] : null;
const waitMin = Number(opt("wait") ?? 0);

let lane = null, lock = null;
const deadline = Date.now() + waitMin * 60000;
while ( !lock ) {
  lane = await pickLane(cfg, {only});
  if ( lane ) lock = acquireLock(lane, cfg, {gates, host: process.env.COMPUTERNAME ?? ""});
  if ( lock ) break;
  if ( Date.now() >= deadline ) {
    console.error(only ? `Lane ${only[0]} is busy or its server is not running.` : "No free lane: every lane is busy or stopped.");
    for ( const l of cfg.lanes ) console.error(`  lane ${l.id} (port ${l.port}): ${(await isUp(l)) ? "up" : "stopped"}`);
    process.exit(3);
  }
  await new Promise(r => setTimeout(r, 20000));
}
console.log(`Lane ${lane.id} (${laneUrl(lane)}) locked for ${gates.join(", ")}`);

let code = 0, browser = null;
const release = () => releaseLock(lane);
process.on("SIGINT", () => { release(); process.exit(130); });
try {
  // Code drift: the repo checkout against the lane's deployed files.
  const cache = path.join(laneDir(lane), "cache");
  const expected = expectedCode(repo, cache);
  const actual = codeFingerprint(lane.dataPath, {only: new Set(Object.keys(expected)), cacheDir: cache});
  const codeDiffs = diffCode(expected, actual);

  // World drift: the running world against its clean fingerprint.
  const session = await openGM(laneUrl(lane), {channel: opt("channel") ?? undefined});
  browser = session.browser;
  const page = session.page;
  const now = worldFingerprint(await page.evaluate(WORLD_PROBE), cfg.ignoreSettings);
  const clean = readJson(path.join(laneDir(lane), "clean.json"));
  const world = clean ? diffWorld(clean, now, {versions: false}) : {strict: [{where: "clean fingerprint", what: "none yet: reset the lane or run lanes.mjs accept"}], warn: []};
  world.strict.push(...diffRunning(expected, now));
  const fp = {lane: lane.id, at: new Date().toISOString(), repo, code: actual, world: now};
  writeJson(path.join(laneDir(lane), "latest.json"), fp);
  const drift = {lane: lane.id, at: fp.at, code: codeDiffs, world: world.strict, warnings: world.warn};
  writeJson(path.join(laneDir(lane), "drift.json"), drift);
  printDiffs("Leftover or edited documents (warning only)", world.warn);
  if ( codeDiffs.length || world.strict.length ) {
    console.log(`DRIFT on lane ${lane.id}: no gate was run.`);
    printDiffs("Deployed files that do not match the repo", codeDiffs);
    printDiffs("World differences from the clean fingerprint", world.strict);
    code = 4;
    report(`DRIFT on lane ${lane.id}: no gate was run (see ${path.join(laneDir(lane), "drift.json")})`);
  } else {
    console.log(`Lane ${lane.id} matches the repo and its clean fingerprint.`);
    for ( const gate of gates ) {
      const out = await page.evaluate(async gate => {
        const t0 = game.time.worldTime, paused = game.paused;
        if ( paused ) await game.togglePause(false, {broadcast: true});
        let summary, error = null;
        try { summary = await (await import(`/wodx-gate/${gate}.mjs?${Date.now()}`)).run(); }
        catch (e) { error = e?.message ?? String(e); }
        const moved = game.time.worldTime - t0;
        if ( moved ) await game.time.advance(-moved);
        if ( game.paused !== paused ) await game.togglePause(paused, {broadcast: true});
        return {summary: typeof summary === "string" ? summary : JSON.stringify(summary ?? null), error, moved, back: game.time.worldTime === t0};
      }, gate);
      const clock = out.moved ? ` (clock moved ${out.moved}s, ${out.back ? "put back" : "NOT put back"})` : "";
      if ( out.error ) { console.log(`${gate}: ERROR ${out.error}${clock}`); report(`${gate}: ERROR ${out.error}${clock}`); code = 1; continue; }
      console.log(`${gate}: ${out.summary}${clock}`);
      report(`${gate}: ${out.summary}${clock}`);
      const m = /(\d+)\s*\/\s*(\d+)\s+passed/.exec(out.summary);
      if ( (m && m[1] !== m[2]) || !out.back ) code = 1;
    }
    const after = worldFingerprint(await page.evaluate(WORLD_PROBE), cfg.ignoreSettings);
    const left = diffWorld(clean, after, {versions: false});
    writeJson(path.join(laneDir(lane), "after.json"), {lane: lane.id, at: new Date().toISOString(), gates, world: after, drift: left});
    if ( left.strict.length ) {
      console.log(`The gates left world changes on lane ${lane.id}; the next run there will stop until the lane is reset or accepted.`);
      printDiffs("Changes left behind", left.strict);
    }
  }
} catch (e) {
  console.error(`Lane ${lane.id}: ${e.message}`);
  code = 1;
} finally {
  await browser?.close().catch(() => {});
  release();
}
report(`exit ${code} on lane ${lane.id}`);
process.exit(code);
