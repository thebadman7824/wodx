/**
 * Runs gates on whichever testbed lane is free, after a drift check.
 *   node tools/lanes/run-gate.mjs <gate> [<gate> ...] [--lane 2] [--wait 30] [--repo <checkout>] [--channel msedge]
 *   node tools/lanes/run-gate.mjs --touched [--base origin/main]   only the gates the checkout's changes need (B3083)
 *   node tools/lanes/run-gate.mjs --all [--shard 1/2]              every gate in the map (the nightly full run), or
 *                                                                 one share of them so two lanes split the list
 *   --report <file>       also write each gate's line and the exit code to this file
 *   --lanes 2,3           split the gates over these lanes, one process each, side by side (use it for a long
 *                         --touched or --all list)
 *   --gate-timeout 15     minutes one gate may take (default 15; gate-map-extra.json "timeouts" sets it per gate)
 *   --step-timeout 45     seconds a dialog or other window the gate opened may wait for an answer before the
 *                         runner closes it, so a step waiting on a click nobody makes goes on (default 45)
 *   --max-minutes N       the whole run's limit (default 15 plus the gate limits plus 2 minutes a gate)
 * No run can hang a lane (B3089): a gate past its limit fails, its browser is closed and a new one signed in for the
 * next gate; past the whole run's limit the runner closes its browser, frees the lane and exits with 5. The lane lock
 * carries a deadline that moves on before each gate, so another run takes over a lane whose run has hung past it,
 * ending that process and its browser.
 * After each gate the runner puts back world settings the gate changed and removes ones it added; on lanes that are
 * reset every night it also deletes documents the gate left behind (B3086). Two-browser gates (gatesolo,
 * gatelookhand) are left out of the map; run them by name, alone.
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
import {loadConfig, getLane, laneDir, laneUrl, acquireLock, releaseLock, extendLock, pickLane, isUp, codeFingerprint, expectedCode,
  diffCode, diffRunning, WORLD_PROBE, worldFingerprint, diffWorld, readJson, writeJson, printDiffs, REPO} from "./lib.mjs";
import {openGM} from "./browser.mjs";
import {gateMap, touched, gatesFor, changedPaths, loadExtra} from "./gate-map.mjs";
import fs from "node:fs";
import {fileURLToPath} from "node:url";

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };
const valued = new Set(["lane", "wait", "repo", "channel", "base", "shard", "report", "lanes", "gate-timeout", "step-timeout", "max-minutes"]);
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
if ( opt("lanes") && !shard ) {
  const {spawn} = await import("node:child_process");
  const list = opt("lanes").split(",").map(x => x.trim()).filter(Boolean);
  const passOn = args.filter((a, i) => !["--lanes", "--lane", "--touched", "--all", "--shard"].includes(a)
    && !(i > 0 && ["--lanes", "--lane", "--shard", "--base"].includes(args[i - 1])) && !(gates.includes(a)));
  const codes = await Promise.all(list.map((l, i) => new Promise(done => {
    const p = spawn(process.execPath, [fileURLToPath(import.meta.url), ...gates, "--lane", l, "--shard", `${i + 1}/${list.length}`, ...passOn], {stdio: "inherit"});
    p.on("exit", c => done(c ?? 1));
  })));
  process.exit(Math.max(...codes));
}
const reportFile = opt("report");
const report = line => { if ( reportFile ) fs.appendFileSync(reportFile, line + "\n"); };
report(`==== ${new Date().toISOString()} ${gates.length} gate(s)${shard ? ` shard ${shard[0]}` : ""}`);
const cfg = loadConfig();
const repo = path.resolve(opt("repo") ?? REPO);
const only = opt("lane") ? [String(opt("lane"))] : null;
const waitMin = Number(opt("wait") ?? 0);

const gateMin = Number(opt("gate-timeout") ?? 15), stepSec = Number(opt("step-timeout") ?? 45);
const perGate = loadExtra().timeouts ?? {};
const limitOf = g => Number(perGate[g] ?? gateMin) * 60000;
const maxMs = Number(opt("max-minutes") ?? 0) * 60000 || (15 * 60000 + gates.reduce((t, g) => t + limitOf(g) + 120000, 0));
/** Rejects when p has not settled in ms (B3089). */
const within = (p, ms, what) => { let t; return Promise.race([p, new Promise((_, no) => { t = setTimeout(() => no(new Error(`${what} took longer than ${Math.round(ms / 1000)} s`)), ms); })]).finally(() => clearTimeout(t)); };

let lane = null, lock = null;
const deadline = Date.now() + waitMin * 60000;
while ( !lock ) {
  lane = await pickLane(cfg, {only});
  if ( lane ) lock = acquireLock(lane, cfg, {gates, host: process.env.COMPUTERNAME ?? "", runner: "run-gate", until: new Date(Date.now() + 15 * 60000).toISOString()});
  if ( lock ) break;
  if ( Date.now() >= deadline ) {
    console.error(only ? `Lane ${only[0]} is busy or its server is not running.` : "No free lane: every lane is busy or stopped.");
    for ( const l of cfg.lanes ) console.error(`  lane ${l.id} (port ${l.port}): ${(await isUp(l)) ? "up" : "stopped"}`);
    process.exit(3);
  }
  await new Promise(r => setTimeout(r, 20000));
}
console.log(`Lane ${lane.id} (${laneUrl(lane)}) locked for ${gates.join(", ")}`);

let code = 0, browser = null, page = null;
const release = () => releaseLock(lane);
const closeBrowser = async () => { const b = browser; browser = null; if ( b ) await within(b.close(), 20000, "closing the browser").catch(() => {}); };
const bail = async (c, why) => { console.error(why); report(why); await closeBrowser(); release(); report(`exit ${c} on lane ${lane.id}`); process.exit(c); };
process.on("SIGINT", () => bail(130, `Stopped by hand on lane ${lane.id}.`));
process.on("SIGTERM", () => bail(143, `Stopped on lane ${lane.id}.`));
// The whole run's watchdog (B3089): the run ends itself instead of holding the lane.
setTimeout(() => bail(5, `Lane ${lane.id}: the run passed its ${Math.round(maxMs / 60000)} minute limit; browser closed, lane freed.`), maxMs);
const signIn = async () => {
  const session = await within(openGM(laneUrl(lane), {channel: opt("channel") ?? undefined}), 7 * 60000, "signing in");
  browser = session.browser; page = session.page;
};
try {
  // Code drift: the repo checkout against the lane's deployed files.
  const cache = path.join(laneDir(lane), "cache");
  const expected = expectedCode(repo, cache);
  const actual = codeFingerprint(lane.dataPath, {only: new Set(Object.keys(expected)), cacheDir: cache});
  const codeDiffs = diffCode(expected, actual);

  // World drift: the running world against its clean fingerprint.
  await signIn();
  const now = worldFingerprint(await within(page.evaluate(WORLD_PROBE), 120000, "the world check"), cfg.ignoreSettings);
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
    const copied = copyFixtures(repo, lane.dataPath);
    if ( copied.length ) console.log(`Copied ${copied.length} gate fixture(s) into Data/wodx-gate: ${copied.join(", ")}`);
    for ( const gate of gates ) {
      const limit = limitOf(gate);
      extendLock(lane, Date.now() + limit + 5 * 60000);
      if ( !page ) {
        try { await signIn(); }
        catch (e) { report(`${gate}: ERROR could not sign in again: ${e.message}`); code = 1; break; }
      }
      // B3086: each gate starts from the world as it was before it. World settings it changed are put back, settings
      // it added are removed, and on a lane that is reset every night (autoReset) the documents it left are deleted.
      const run = page.evaluate(async ({gate, ignore, cleanDocs, limit, stepMs}) => {
        const t0 = game.time.worldTime, paused = game.paused;
        const skip = k => ignore.some(p => p.endsWith("*") ? k.startsWith(p.slice(0, -1)) : k === p);
        const store = () => [...(game.settings.storage.get("world")?.contents ?? game.settings.storage.get("world")?.values?.() ?? [])];
        const before = new Map(store().map(s => [s.key, s._source?.value ?? s.value]));
        const COLS = ["actors", "items", "scenes", "journal", "tables", "macros", "playlists", "cards", "combats", "folders"];
        const ids = Object.fromEntries(COLS.filter(c => game[c]).map(c => [c, new Set([...game[c]].map(d => d.id))]));
        if ( paused ) await game.togglePause(false, {broadcast: true});
        let summary, error = null;
        // B3089: a window the gate opened (a dialog, a roll prompt) that waits longer than stepMs is closed, so the
        // step waiting on it goes on; document sheets the gate looks at are left open.
        const isSheet = a => (foundry.applications.api?.DocumentSheetV2 && a instanceof foundry.applications.api.DocumentSheetV2) || (foundry.appv1?.sheets?.DocumentSheet && a instanceof foundry.appv1.sheets.DocumentSheet) || !!a.document?.documentName;
        const windows = () => [...new Set([...(foundry.applications.instances?.values?.() ?? []), ...Object.values(ui.windows)])].filter(a => a?.rendered !== false && !isSheet(a));
        const had = new Set(windows()), seen = new Map(), shut = [];
        const sweep = setInterval(() => {
          const t = Date.now();
          for ( const w of windows() ) {
            if ( had.has(w) ) continue;
            if ( !seen.has(w) ) { seen.set(w, t); continue; }
            if ( t - seen.get(w) < stepMs ) continue;
            seen.delete(w); had.add(w);
            shut.push(String(w.title ?? w.options?.window?.title ?? w.constructor?.name ?? "window").slice(0, 40));
            try { Promise.resolve(w.close?.()).catch(() => {}); } catch {}
          }
        }, 5000);
        let timer;
        try {
          const mod = await import(`/wodx-gate/${gate}.mjs?${Date.now()}`);
          summary = await Promise.race([mod.run(), new Promise((_, no) => { timer = setTimeout(() => no(new Error(`timed out after ${Math.round(limit / 60000)} min`)), limit); })]);
        }
        catch (e) { error = e?.message ?? String(e); }
        finally { clearTimeout(timer); clearInterval(sweep); }
        const moved = game.time.worldTime - t0;
        if ( moved ) await game.time.advance(-moved);
        let settingsBack = 0, docsGone = 0;
        try {
          for ( const s of store() ) {
            if ( skip(s.key) ) continue;
            const was = before.get(s.key), now = s._source?.value ?? s.value;
            if ( was === undefined ) { await s.delete(); settingsBack++; }
            else if ( JSON.stringify(was) !== JSON.stringify(now) ) { await s.update({value: was}); settingsBack++; }
          }
          const have = new Set(store().map(s => s.key));
          for ( const [key, value] of before ) if ( !have.has(key) && !skip(key) ) { await getDocumentClass("Setting").create({key, value}); settingsBack++; }
        } catch (e) { error ??= `putting settings back: ${e?.message ?? e}`; }
        if ( cleanDocs ) for ( const c of COLS.filter(c => ids[c]) ) {
          const extra = [...game[c]].filter(d => !ids[c].has(d.id)).map(d => d.id);
          if ( !extra.length ) continue;
          try { await game[c].documentClass.deleteDocuments(extra); docsGone += extra.length; } catch {}
        }
        if ( game.paused !== paused ) await game.togglePause(paused, {broadcast: true});
        const text = typeof summary === "string" ? summary : summary?.summary ?? JSON.stringify(summary ?? null);
        return {summary: String(text).slice(0, 300), error, moved, back: game.time.worldTime === t0, settingsBack, docsGone, shut};
      }, {gate, ignore: cfg.ignoreSettings ?? [], cleanDocs: !!lane.autoReset, limit, stepMs: stepSec * 1000});
      let out;
      try { out = await within(run, limit + 3 * 60000, gate); }
      catch (e) {
        // The page itself stopped answering: this gate fails, and the next one gets a new browser.
        out = {error: `${e.message}; the browser was closed and the gate's changes were not put back`, moved: 0, back: true};
        run.catch(() => {});
        await closeBrowser(); page = null;
      }
      const tidy = [out.settingsBack ? `${out.settingsBack} setting(s) put back` : "", out.docsGone ? `${out.docsGone} leftover document(s) deleted` : "",
        out.shut?.length ? `closed ${out.shut.length} window(s) left waiting: ${out.shut.join("; ")}` : ""].filter(Boolean).join(", ");
      if ( tidy && out.error ) out.error += ` [${tidy}]`;
      if ( tidy ) out.summary += ` [${tidy}]`;
      const clock = out.moved ? ` (clock moved ${out.moved}s, ${out.back ? "put back" : "NOT put back"})` : "";
      if ( out.error ) { console.log(`${gate}: ERROR ${out.error}${clock}`); report(`${gate}: ERROR ${out.error}${clock}`); code = 1; continue; }
      console.log(`${gate}: ${out.summary}${clock}`);
      report(`${gate}: ${out.summary}${clock}`);
      const m = /(\d+)\s*\/\s*(\d+)\s+passed/.exec(out.summary);
      if ( (m && m[1] !== m[2]) || !out.back ) code = 1;
    }
    extendLock(lane, Date.now() + 10 * 60000);
    if ( !page ) await signIn();
    const after = worldFingerprint(await within(page.evaluate(WORLD_PROBE), 120000, "the world check after the gates"), cfg.ignoreSettings);
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
  await closeBrowser();
  release();
}
report(`exit ${code} on lane ${lane.id}`);
process.exit(code);


/**
 * The sample files gates read from Data/wodx-gate (B3462): the map sidecars and settlement records in
 * tools/mapgen/samples. A lane reset from a clean copy can lack them, and gateadopt then stops at its second step
 * ("Cannot read properties of null (reading 'cells')"). Copies each one that is missing or differs; returns their names.
 */
function copyFixtures(repo, dataPath) {
  const from = path.join(repo, "tools", "mapgen", "samples"), to = path.join(dataPath, "Data", "wodx-gate");
  if ( !fs.existsSync(from) ) return [];
  fs.mkdirSync(to, {recursive: true});
  const out = [];
  for ( const f of fs.readdirSync(from) ) {
    if ( !/\.(wodx|settlement)\.json$/.test(f) ) continue;
    const src = path.join(from, f), dst = path.join(to, f);
    const a = fs.readFileSync(src);
    if ( fs.existsSync(dst) && Buffer.compare(a, fs.readFileSync(dst)) === 0 ) continue;
    fs.writeFileSync(dst, a);
    out.push(f);
  }
  return out;
}
