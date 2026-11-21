/**
 * Runs gates on whichever testbed lane is free, after a drift check.
 *   node tools/lanes/run-gate.mjs <gate> [<gate> ...] [--lane 2] [--wait 30] [--repo <checkout>] [--channel msedge]
 *   node tools/lanes/run-gate.mjs --touched [--base origin/main] [--wide]   only the gates the checkout's changes need (B3083;
 *                                                                            tier 1 since B7444, --wide the older wider list)
 *   node tools/lanes/run-gate.mjs --all [--shard 1/2]              every gate in the map (the nightly full run), or
 *                                                                 one share of them so two lanes split the list
 *   --report <file>       also write each gate's line and the exit code to this file
 *   --lanes 2,3           split the gates over these lanes, one process each, side by side (use it for a long
 *                         --touched or --all list)
 *   --gate-timeout 15     minutes one gate may take (default 15; gate-map-extra.json "timeouts" sets it per gate)
 *   --step-timeout 45     seconds a dialog or other window the gate opened may wait for an answer before the
 *                         runner closes it, so a step waiting on a click nobody makes goes on (default 45)
 *   --max-minutes N       the whole run's limit (default 15 plus the gate limits plus 2 minutes a gate)
 *   --hang-checks 4       B7201: while a gate runs, the lane's server and page are asked every --hang-every seconds
 *   --hang-every 30       (default 30) whether they still answer; this many misses in a row (0 turns it off) end the
 *                         run as a lane fault (exit 5) with the gate given back, so the PC runner resets the lane
 *   --list                print the gates the run would take, as "GATES [json]", and stop (B6526)
 *   --queue <file>        take gates one at a time from a JSON list shared with runs on other lanes (B6526)
 *   --world clean         run in the lane's clean world (wodx-clean, lanes.json "worlds"), checked against its own clean
 *                         fingerprint; the lane must be running it (lanes.mjs reset --lane N --world clean)
 *   --clean-set           add the clean smoke set (gate-map-extra.json "clean": gatecleanworld and the shared gates that
 *                         must pass with no chronicle in play); give it with --world clean
 * No run can hang a lane (B3089): a gate past its limit fails, its browser is closed and a new one signed in for the
 * next gate; past the whole run's limit the runner closes its browser, frees the lane and exits with 5. The lane lock
 * carries a deadline that moves on before each gate, so another run takes over a lane whose run has hung past it,
 * ending that process and its browser.
 * After each gate the runner puts back world settings the gate changed and removes ones it added; on lanes that are
 * reset every night it also deletes documents the gate left behind (B3086) and puts back the flags it changed on the
 * actors, scenes, tokens, journal entries, items and users that were there before it (B7181). Two-browser gates (gatesolo,
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
 * Exit codes: 0 all passed, 1 a gate failed, 3 no free lane, 4 drift found (nothing was run), 5 the lane failed
 * mid-run (past the whole run's limit, hung, or would not sign in again; the gate in hand is left for a retry).
 * Never point a lane at the Live world: lanes.json only lists local testbed folders.
 */
import path from "node:path";
import {loadConfig, getLane, laneDir, laneUrl, acquireLock, releaseLock, extendLock, pickLane, isUp, codeFingerprint, expectedCode,
  diffCode, diffRunning, cleanPath, WORLD_PROBE, worldFingerprint, settledFingerprint, diffWorld, readJson, writeJson, printDiffs, REPO,
  flagPlan, READ_FLAGS, PUT_FLAGS_BACK, sheetPlan, READ_SHEETS, PUT_SHEETS_BACK, pageNote, gateCaller} from "./lib.mjs";
import {openGM, waitApis, apiState, LATE_APIS} from "./browser.mjs";
import {gateMap, touched, gatesFor, tier1, changedPaths, loadExtra} from "./gate-map.mjs";
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {readQueue, takeQueued} from "./gate-queue.mjs";
import {watchHang} from "./hang-watch.mjs";

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };
const valued = new Set(["world", "lane", "wait", "repo", "channel", "base", "shard", "report", "lanes", "gate-timeout", "step-timeout", "max-minutes", "queue", "recycle", "hang-checks", "hang-every"]);
let gates = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && valued.has(args[i - 1].slice(2))));
const gateRoot = path.resolve(opt("repo") ?? REPO);   // the checkout under test: a gate new on the branch is only there
if ( args.includes("--all") ) gates.push(...Object.keys(gateMap(gateRoot)));
if ( args.includes("--clean-set") ) gates.push(...(loadExtra(gateRoot).clean ?? []));
if ( args.includes("--touched") ) {
  const paths = changedPaths(opt("base") ?? "origin/main", gateRoot);
  const t = touched(paths, {root: gateRoot});
  // B7444: tier 1 (the changed modules' own gates, changed gates and the cross-module gates); --wide: the old list
  const list = args.includes("--wide") ? gatesFor(t.modules, t.gates, gateMap(gateRoot)) : tier1(paths, {root: gateRoot});
  console.log(`Touched modules: ${t.modules.join(", ") || "none"}; ${list.length} gate(s) to run.`);
  if ( !list.length && !gates.length ) { console.log("Nothing in this change needs a gate."); process.exit(0); }
  gates.push(...list);
}
gates = [...new Set(gates)];
// B6526: --list prints the gates this run would take (after --touched/--all) as JSON and stops; the PC runner fills a
// shared queue from it
if ( args.includes("--list") ) { console.log(`GATES ${JSON.stringify(gates.filter(g => /^[\w-]+$/.test(g)))}`); process.exit(0); }
// B6526: --queue FILE takes the gates one at a time from a JSON list shared with other lanes, so a lane that joins
// late or runs quick gates takes more of the work (the list given on the line is ignored)
const queueFile = opt("queue");
if ( queueFile ) {
  gates = readQueue(queueFile);
  if ( !gates.length ) { const line = `==== ${new Date().toISOString()} 0 gate(s): the shared queue is empty`; console.log(line); if ( opt("report") ) fs.appendFileSync(opt("report"), `${line}\nexit 0\n`); process.exit(0); }
}
const shard = /^(\d+)\/(\d+)$/.exec(opt("shard") ?? "");
if ( shard ) {
  const before = gates.length;
  gates = gates.filter((_, i) => i % +shard[2] === +shard[1] - 1);
  // More lanes than gates: this share is empty, which is nothing to run, not a usage fault
  if ( before && !gates.length && gates.every(g => /^[\w-]+$/.test(g)) ) {
    const line = `==== ${new Date().toISOString()} 0 gate(s) shard ${shard[0]}: nothing left for this share (${before} gate(s) over ${shard[2]} shares)`;
    console.log(line);
    if ( opt("report") ) fs.appendFileSync(opt("report"), `${line}\nexit 0\n`);
    process.exit(0);
  }
}
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
const times = [];
// B7440: indented, so the report parsers (gate lines start at the line start) never read it as a gate
const reportTimes = () => { if ( !times.length ) return; const t = `  TIMES ${times.join(" ")}`; console.log(t); report(t); times.length = 0; };
const report = line => { if ( reportFile ) fs.appendFileSync(reportFile, line + "\n"); };
report(`==== ${new Date().toISOString()} ${gates.length} gate(s)${shard ? ` shard ${shard[0]}` : ""}`);
const cfg = loadConfig(undefined, {world: opt("world") ?? process.env.WODX_WORLD});
const repo = path.resolve(opt("repo") ?? REPO);
const only = opt("lane") ? [String(opt("lane"))] : null;
const waitMin = Number(opt("wait") ?? 0);

const gateMin = Number(opt("gate-timeout") ?? 15), stepSec = Number(opt("step-timeout") ?? 45);
const perGate = loadExtra(gateRoot).timeouts ?? {};
const limitOf = g => Number(perGate[g] ?? gateMin) * 60000;
const hangChecks = Number(opt("hang-checks") ?? 4), hangEveryMs = Number(opt("hang-every") ?? 30) * 1000;
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
const bail = async (c, why) => { console.error(why); report(why); reportTimes(); await closeBrowser(); release(); report(`exit ${c} on lane ${lane.id}`); process.exit(c); };
process.on("SIGINT", () => bail(130, `Stopped by hand on lane ${lane.id}.`));
process.on("SIGTERM", () => bail(143, `Stopped on lane ${lane.id}.`));
// The whole run's watchdog (B3089): the run ends itself instead of holding the lane.
setTimeout(() => bail(5, `Lane ${lane.id}: the run passed its ${Math.round(maxMs / 60000)} minute limit; browser closed, lane freed.`), maxMs);
// B6352: a browser kept for a long run grew past 6 GB and held the queue below its memory floor; it is closed and a
// new one signed in every RECYCLE gates (--recycle N, 0 for never), which also drops what earlier gates left in memory
const RECYCLE = Number(opt("recycle") ?? 15) || 0;
let sinceSignIn = 0;
const signIn = async () => {
  const session = await within(openGM(laneUrl(lane), {channel: opt("channel") ?? undefined}), 7 * 60000, "signing in");
  browser = session.browser; page = session.page; sinceSignIn = 0;
  // B6952: modules still without an api after the wait are named on the next gate's line
  lateApis = session.late ?? [];
  diagLog = session.diag ?? []; diagFrom = 0;
  life = session.life ?? {loads: 0}; loadsSeen = life.loads;
};
// B6970: --diag writes, under each failing gate, the console errors and warnings since the last gate (since sign-in for
// the first) and every failing step in full, so a lane failure can be read from the job's report.
const DIAG = args.includes("--diag");
let diagLog = [], diagFrom = 0;
let lateApis = [];
// B6992: page loads seen by the end of the last gate; more by the next gate means the world reloaded in between
let life = {loads: 0}, loadsSeen = 0;
try {
  // Code drift: the repo checkout against the lane's deployed files.
  const cache = path.join(laneDir(lane), "cache");
  const expected = expectedCode(repo, cache);
  const actual = codeFingerprint(lane.dataPath, {only: new Set(Object.keys(expected)), cacheDir: cache});
  const codeDiffs = diffCode(expected, actual);

  // World drift: the running world against its clean fingerprint.
  await signIn();
  const now = await within(settledFingerprint(page, cfg.ignoreSettings), 150000, "the world check");
  const clean = readJson(cleanPath(lane, cfg));
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
    // Gates that draw on the canvas need a viewed scene; a fresh sign-in may view none (B3089).
    await within(page.evaluate(async () => { if ( !canvas?.scene && game.scenes.active ) await game.scenes.active.view(); }), 60000, "viewing the scene").catch(() => {});
    const copied = copyFixtures(repo, lane.dataPath);
    if ( copied.length ) console.log(`Copied ${copied.length} gate fixture(s) into Data/wodx-gate: ${copied.join(", ")}`);
    for ( let gate, k = 0; (gate = queueFile ? takeQueued(queueFile, lane.id) : gates[k++]); ) {
      const limit = limitOf(gate);
      const gateStart = Date.now();
      extendLock(lane, Date.now() + limit + 5 * 60000);
      if ( page && RECYCLE && sinceSignIn >= RECYCLE ) { console.log(`Lane ${lane.id}: a new browser after ${sinceSignIn} gates (B6352).`); await closeBrowser(); page = null; }
      if ( !page ) {
        try { await signIn(); await within(page.evaluate(async () => { if ( !canvas?.scene && game.scenes.active ) await game.scenes.active.view(); }), 60000, "viewing the scene").catch(() => {}); }
        // B7201: a lane that will not sign in again has failed, not the gate: the gate is given back (no line of its
        // own in the report) and the runner resets the lane and runs what is left
        catch (e) { await bail(5, `Lane ${lane.id}: could not sign in again before ${gate} (${e.message}); lane fault, the gate goes back on the queue.`); }
      }
      // B6960: the WoDX apis are looked for again before each gate (a world that lost them mid-lane is named, not the gate)
      const reloadsBefore = life.loads - loadsSeen;
      const lostApis = await waitApis(page).catch(() => []);
      const diagStart = diagFrom;
      if ( lostApis.length ) console.log(`Lane ${lane.id}: no api before ${gate} after 120 s: ${lostApis.join(", ")}`);
      // B7181: on a lane reset every night, the flags of the shared documents are read now and put back after the gate.
      const flagsBefore = lane.autoReset ? await page.evaluate(READ_FLAGS).catch(() => null) : null;
      const sheetsBefore = lane.autoReset ? await page.evaluate(READ_SHEETS).catch(() => null) : null;
      // B3086: each gate starts from the world as it was before it. World settings it changed are put back, settings
      // it added are removed, and on a lane that is reset every night (autoReset) the documents it left are deleted.
      const run = page.evaluate(async ({gate, ignore, cleanDocs, limit, stepMs, callerSrc}) => {
        const t0 = game.time.worldTime, paused = game.paused, startedAt = Date.now();
        const activeId = game.scenes.active?.id ?? null, viewedId = canvas?.scene?.id ?? null;
        const skip = k => ignore.some(p => p.endsWith("*") ? k.startsWith(p.slice(0, -1)) : k === p);
        const store = () => [...(game.settings.storage.get("world")?.contents ?? game.settings.storage.get("world")?.values?.() ?? [])];
        const before = new Map(store().map(s => [s.key, s._source?.value ?? s.value]));
        const COLS = ["actors", "items", "scenes", "journal", "tables", "macros", "playlists", "cards", "combats", "folders"];
        const ids = Object.fromEntries(COLS.filter(c => game[c]).map(c => [c, new Set([...game[c]].map(d => d.id))]));
        if ( paused ) await game.togglePause(false, {broadcast: true});
        let summary, error = null;
        // B3089: a dialog the gate opened (a confirm, a prompt, a roll dialog) that waits longer than stepMs is closed,
        // so the step waiting on it goes on. Only dialogs: other windows a gate opens it may be reading.
        const isDialog = a => (foundry.applications.api?.DialogV2 && a instanceof foundry.applications.api.DialogV2) || (foundry.appv1?.api?.Dialog && a instanceof foundry.appv1.api.Dialog) || /Dialog|Prompt/.test(a?.constructor?.name ?? "");
        const windows = () => [...new Set([...(foundry.applications.instances?.values?.() ?? []), ...Object.values(ui.windows)])].filter(a => a?.rendered !== false && isDialog(a));
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
        // B7230: what a gate leaves running in the page itself is put back after it too. Hooks and intervals the gate's
        // own code registers (its file is the caller) are removed, functions it swapped (the dice, notices, chat) are
        // restored, and a property it laid over game.user (isGM) is taken off. A module's own hooks are left alone.
        const H = globalThis.Hooks, onWas = H.on, onceWas = H.once, ivWas = window.setInterval;
        // the test for "the gate's own code called this" is lib.mjs gateCaller, handed in as source (harness-tested)
        let isGate;
        try { isGate = new Function(`return (${callerSrc});`)(); } catch (e) { isGate = st => /\/wodx-gate\//.test(String(st).split("\n").slice(3, 4).join("")); }
        const byGate = () => isGate(new Error().stack);
        const gateHooks = new Map(), gateIntervals = [];
        H.on = function wodxGateOn(hook, fn, opts) { const id = onWas.call(this, hook, fn, opts); if ( byGate() ) gateHooks.set(`${hook}|${id}`, [hook, id]); return id; };
        H.once = function wodxGateOnce(hook, fn) { const id = onceWas.call(this, hook, fn); if ( byGate() ) gateHooks.set(`${hook}|${id}`, [hook, id]); return id; };
        window.setInterval = function wodxGateInterval(...a) { const id = ivWas.apply(this, a); if ( byGate() ) gateIntervals.push(id); return id; };
        const refs = [[CONFIG?.Dice, "randomUniform"], [ui?.notifications, "info"], [ui?.notifications, "warn"], [ui?.notifications, "error"],
          [ui?.notifications, "notify"], [canvas?.interface, "createScrollingText"], [globalThis.ChatMessage, "create"], [game.time, "advance"]]
          .filter(([o]) => o).map(([o, k]) => ({o, k, own: Object.prototype.hasOwnProperty.call(o, k), v: o[k]}));
        const userOwn = new Set(Object.getOwnPropertyNames(game.user));
        const pageBack = () => {
          H.on = onWas; H.once = onceWas; window.setInterval = ivWas;
          const out = {hooks: [], intervals: 0, refs: [], user: []};
          for ( const [hook, id] of gateHooks.values() ) {
            const live = H.events?.[hook];
            if ( Array.isArray(live) && !live.some(x => x?.id === id) ) continue;
            try { H.off(hook, id); out.hooks.push(hook); } catch (e) { /* gone */ }
          }
          for ( const id of gateIntervals ) { clearInterval(id); out.intervals++; }
          for ( const r of refs ) {
            if ( r.o[r.k] === r.v ) continue;
            if ( r.own ) r.o[r.k] = r.v; else delete r.o[r.k];
            out.refs.push(r.k);
          }
          for ( const k of Object.getOwnPropertyNames(game.user) ) {
            if ( userOwn.has(k) || !(k in Object.getPrototypeOf(game.user)) ) continue;
            try { delete game.user[k]; out.user.push(k); } catch (e) { /* fixed */ }
          }
          return out;
        };
        let timer;
        try {
          // B6952: a busy server can drop the fetch of the gate file itself; one more try after a pause
          const mod = await import(`/wodx-gate/${gate}.mjs?${Date.now()}`).catch(async () => { await new Promise(r => setTimeout(r, 5000)); return import(`/wodx-gate/${gate}.mjs?${Date.now()}`); });
          summary = await Promise.race([mod.run(), new Promise((_, no) => { timer = setTimeout(() => no(new Error(`timed out after ${Math.round(limit / 60000)} min`)), limit); })]);
        }
        catch (e) { error = e?.message ?? String(e); }
        finally { clearTimeout(timer); clearInterval(sweep); }
        // B5830: a gate that does not name its failed steps in the summary (the older gates) has them read from its
        // result file, so a failure on a lane can be fixed without going back to the PC for the file.
        const tally = typeof summary === "string" ? /(\d+)\s*\/\s*(\d+)\s+passed/.exec(summary) : null;
        if ( tally && tally[1] !== tally[2] && !/failed:/.test(summary) ) {
          try {
            const res = await (await fetch(`/wodx-gate/${gate}-result.json?${Date.now()}`, {cache: "no-store"})).json();
            const fresh = !res?.started || Date.parse(res.started) >= startedAt - 5000;
            const bad = fresh ? (res?.steps ?? []).filter(st => !st.pass).map(({name, pass, ...d}) => `${name} ${JSON.stringify(d).slice(0, 300)}`) : [];
            if ( bad.length ) summary += `; failed: ${bad.join("; ")}`.slice(0, 900);
          } catch (e) { /* no result file */ }
        }
        // Writes a gate set off just before it ended (an approval queued by a hook) land first, then are put back.
        await new Promise(r => setTimeout(r, 1500));
        let page0 = {hooks: [], intervals: 0, refs: [], user: []};
        try { page0 = pageBack(); } catch (e) { error ??= `putting the page back: ${e?.message ?? e}`; }
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
        // The scene that was active and the one viewed come back too: a gate's own scene deleted above must not leave
        // the next gate with no scene to view.
        try {
          const act = activeId && game.scenes.get(activeId), view = viewedId && game.scenes.get(viewedId);
          if ( act && game.scenes.active?.id !== activeId ) await act.activate();
          if ( view && canvas?.scene?.id !== viewedId ) await view.view();
        } catch (e) { error ??= `putting the scene back: ${e?.message ?? e}`; }
        if ( game.paused !== paused ) await game.togglePause(paused, {broadcast: true});
        const text = typeof summary === "string" ? summary : summary?.summary ?? JSON.stringify(summary ?? null);
        return {summary: String(text).slice(0, 600), error, moved, back: game.time.worldTime === t0, settingsBack, docsGone, shut, page: page0};
      }, {gate, ignore: cfg.ignoreSettings ?? [], cleanDocs: !!lane.autoReset, limit, stepMs: stepSec * 1000, callerSrc: gateCaller.toString()});
      let out;
      sinceSignIn++;
      // B7201: the hang watch runs beside the gate and ends the run within minutes when the lane stops answering
      const watch = hangChecks > 0 ? watchHang({everyMs: hangEveryMs, misses: hangChecks,
        probe: async () => (await isUp(lane, 5000)) && (await within(page.evaluate(() => 1), 20000, "the hang check")) === 1}) : null;
      try { out = await within(watch ? Promise.race([run, watch.hung]) : run, limit + 3 * 60000, gate); }
      catch (e) {
        if ( e?.hang ) { run.catch(() => {}); await bail(5, `Lane ${lane.id}: ${e.message} during ${gate}; lane fault, the gate goes back on the queue.`); }
        // The page itself stopped answering: this gate fails, and the next one gets a new browser.
        out = {error: `${e.message}; the browser was closed and the gate's changes were not put back`, moved: 0, back: true};
        run.catch(() => {});
        await closeBrowser(); page = null;
      } finally { watch?.stop(); }
      // B7192: sheets first (a system update can move flags through hooks), then flags
      if ( sheetsBefore && page ) {
        try { out.sheetsBack = await page.evaluate(PUT_SHEETS_BACK, sheetPlan(sheetsBefore, await page.evaluate(READ_SHEETS))); }
        catch (e) { out.sheetsBack = 0; const note = `putting sheets back: ${e?.message ?? e}`; if ( out.error ) out.error += `; ${note}`; else out.error = note; }
      }
      if ( flagsBefore && page ) {
        try { out.flagsBack = await page.evaluate(PUT_FLAGS_BACK, flagPlan(flagsBefore, await page.evaluate(READ_FLAGS))); }
        catch (e) { out.flagsBack = 0; const note = `putting flags back: ${e?.message ?? e}`; if ( out.error ) out.error += `; ${note}`; else out.error = note; }
      }
      const tidy = [out.settingsBack ? `${out.settingsBack} setting(s) put back` : "", out.docsGone ? `${out.docsGone} leftover document(s) deleted` : "",
        out.flagsBack ? `flags put back on ${out.flagsBack} document(s)` : "",
        out.sheetsBack ? `sheets put back on ${out.sheetsBack} document(s)` : "",
        out.shut?.length ? `closed ${out.shut.length} window(s) left waiting: ${out.shut.join("; ")}` : "",
        pageNote(out.page)].filter(Boolean).join(", ");
      if ( tidy && out.error ) out.error += ` [${tidy}]`;
      if ( tidy ) out.summary += ` [${tidy}]`;
      const signInNote = lateApis.length > 0;
      if ( lateApis.length ) { const note = ` [no api after sign-in: ${lateApis.join(", ")}]`; if ( out.error ) out.error += note; else out.summary += note; lateApis = []; }
      if ( lostApis.length && !signInNote ) { const note = ` [no api before this gate: ${lostApis.join(", ")}]`; if ( out.error ) out.error += note; else out.summary += note; }
      // B6992: the page reloaded before this gate (after the last one ended) or while it ran
      const reloadsDuring = life.loads - loadsSeen - reloadsBefore;
      loadsSeen = life.loads;
      for ( const [k, w] of [[reloadsBefore, "before this gate"], [reloadsDuring, "during this gate"]] ) if ( k > 0 ) { const note = ` [page reloaded ${w}${k > 1 ? ` ${k} times` : ""}]`; if ( out.error ) out.error += note; else out.summary += note; }
      // B7440: each gate's seconds (sign-in, the run and the put-back), for the TIMES line at the end of the report
      times.push(`${gate}=${Math.round((Date.now() - gateStart) / 1000)}`);
      const clock = out.moved ? ` (clock moved ${out.moved}s, ${out.back ? "put back" : "NOT put back"})` : "";
      const diagDump = async () => {
        if ( !DIAG ) return;
        const lines = diagLog.slice(diagStart);
        report(`  DIAG console since ${diagStart ? "the last gate" : "sign-in"} (${lines.length} line(s)):`);
        for ( const l of lines.slice(-150) ) report(`    ${l}`);
        const res = await page.evaluate(async g => { try { return await (await fetch(`/wodx-gate/${g}-result.json?${Date.now()}`, {cache: "no-store"})).json(); } catch (e) { return {fetchError: e.message}; } }, gate).catch(e => ({fetchError: e.message}));
        for ( const st of (res?.steps ?? []).filter(x => !x.pass) ) report(`  DIAG step ${JSON.stringify(st).slice(0, 12000)}`);
        for ( const e of (res?.errors ?? []) ) report(`  DIAG error ${String(e).slice(0, 4000)}`);
        if ( res?.fetchError ) report(`  DIAG no result file: ${res.fetchError}`);
        // B6992: which WoDX modules have their api now, and what Creation kept from its start-up
        const st = await page.evaluate(apiState, LATE_APIS).catch(e => [{error: e.message}]);
        report(`  DIAG apis ${JSON.stringify(st).slice(0, 3000)}`);
      };
      if ( out.error ) { console.log(`${gate}: ERROR ${out.error}${clock}`); report(`${gate}: ERROR ${out.error}${clock}`); code = 1; await diagDump(); diagFrom = diagLog.length; continue; }
      console.log(`${gate}: ${out.summary}${clock}`);
      report(`${gate}: ${out.summary}${clock}`);
      const m = /(\d+)\s*\/\s*(\d+)\s+passed/.exec(out.summary);
      // B6952: a gate that ran no step at all (0/0) or did not say how it did (no tally, and no "pass": true) has not passed
      const failed = (m ? m[1] !== m[2] || m[2] === "0" : !/^\{"pass":true\b/.test(out.summary)) || !out.back;
      if ( failed ) { code = 1; await diagDump(); }
      diagFrom = diagLog.length;
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
  // B7446: into the report too, so the job comment says why the run stopped before a gate
  report(`Lane ${lane.id}: ${e.message}`);
  code = 1;
} finally {
  await closeBrowser();
  release();
}
reportTimes();
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

/* B6526: the shared gate queue (a JSON list), taken from under a lock file so two lanes never take the same gate */
