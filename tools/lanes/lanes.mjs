/**
 * Testbed lane manager. Lanes are listed in lanes.json; all of them are local only (UPnP off, no router forward).
 *   node tools/lanes/lanes.mjs status
 *   node tools/lanes/lanes.mjs setup    --lane 2          new lane folder: Config from lane 1 (port changed, UPnP off),
 *                                                         other modules from lane 1, WoDX from the repo, world from known-good
 *   node tools/lanes/lanes.mjs start    --lane 2          hidden server on the lane's port
 *   node tools/lanes/lanes.mjs stop     --lane 2          stops a server this tool started (never anything else)
 *   node tools/lanes/lanes.mjs deploy   --lane 2          mirrors the repo's modules and system into the lane, restarts, accepts
 *                                      [--if-changed]    only when the lane's code or gates differ from the checkout; a busy lane is skipped
 *   node tools/lanes/lanes.mjs snapshot --from 1          copies a stopped lane's world to the shared known-good copy
 *   node tools/lanes/lanes.mjs reset    --lane 2 [--if-free]   backs the lane's world up, puts known-good back, restarts, accepts
 *   node tools/lanes/lanes.mjs accept   --lane 2          records the running world as the lane's clean fingerprint
 *   node tools/lanes/lanes.mjs compare                    differences between lanes (packages and clean worlds)
 * Lane 1 is the testbed Ben also plays in: reset and snapshot-over-it refuse lane 1 unless --allow-lane-1 is given.
 * Every overwrite is preceded by a dated copy in the backups folder; nothing in the backups folder is ever removed.
 * Runs at below-normal priority.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {spawn, spawnSync} from "node:child_process";
import {loadConfig, getLane, laneDir, laneUrl, isUp, acquireLock, releaseLock, lockState, readJson, writeJson,
  codeFingerprint, expectedCode, diffCode, diffPackages, hashTree, treeDigest, WORLD_PROBE, worldFingerprint, diffWorld,
  printDiffs, pidAlive, REPO} from "./lib.mjs";

try { os.setPriority(os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { }
const args = process.argv.slice(2);
const cmd = args[0];
const opt = k => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };
const flag = k => args.includes(`--${k}`);
const cfg = loadConfig();
const repo = path.resolve(opt("repo") ?? REPO);
const stamp = () => new Date().toISOString().replace(/[:]/g, "").replace(/\..*/, "");
const sleep = ms => new Promise(r => setTimeout(r, ms));
const worldDir = lane => path.join(lane.dataPath, "Data", "worlds", cfg.world);
const die = (msg, code = 1) => { console.error(msg); process.exit(code); };

/** Copies a folder. mirror: the target ends up exactly like the source. robocopy on Windows (/R:0 for LevelDB locks). */
export function copyTree(src, dst, {mirror = false} = {}) {
  if ( !fs.existsSync(src) ) throw new Error(`Nothing to copy at ${src}`);
  if ( process.platform === "win32" ) {
    const r = spawnSync("robocopy", [src, dst, mirror ? "/MIR" : "/E", "/R:0", "/W:0", "/NFL", "/NDL", "/NJH", "/NJS", "/NP", "/XF", "LOCK"], {stdio: "inherit"});
    if ( r.status >= 8 ) throw new Error(`robocopy ${src} -> ${dst} failed (exit ${r.status})`);
    return;
  }
  if ( mirror ) fs.rmSync(dst, {recursive: true, force: true});
  fs.cpSync(src, dst, {recursive: true, filter: s => path.basename(s) !== "LOCK"});
}
function backup(src, name) {
  if ( !fs.existsSync(src) ) return null;
  const dst = path.join(cfg.backups, `${name}-${stamp()}`);
  copyTree(src, dst);
  console.log(`Backed up ${src} -> ${dst}`);
  return dst;
}

async function start(lane) {
  if ( await isUp(lane) ) { console.log(`Lane ${lane.id} is already up on port ${lane.port}.`); return; }
  fs.mkdirSync(laneDir(lane), {recursive: true});
  fs.mkdirSync(path.join(lane.dataPath, "Logs"), {recursive: true});
  const log = fs.openSync(path.join(lane.dataPath, "Logs", "lane-server.log"), "a");
  const child = spawn(process.execPath, [cfg.foundryMain, `--dataPath=${lane.dataPath}`, `--port=${lane.port}`, `--world=${cfg.world}`, "--noupnp", "--noupdate"],
    {detached: true, stdio: ["ignore", log, log], windowsHide: true});
  child.unref();
  fs.writeFileSync(path.join(laneDir(lane), "server.pid"), String(child.pid));
  for ( let i = 0; i < 60; i++ ) { await sleep(3000); if ( await isUp(lane) ) { console.log(`Lane ${lane.id} up at ${laneUrl(lane)} (pid ${child.pid}).`); return; } }
  throw new Error(`Lane ${lane.id} did not come up within 3 minutes; see ${path.join(lane.dataPath, "Logs", "lane-server.log")}`);
}
async function stop(lane) {
  const pid = Number(readJson(path.join(laneDir(lane), "server.pid")) ?? 0);
  if ( !(await isUp(lane)) ) return false;
  if ( !pid || !pidAlive(pid) ) throw new Error(`Lane ${lane.id} is up, but not by a server this tool started. Stop it by hand first.`);
  process.kill(pid);
  for ( let i = 0; i < 20 && await isUp(lane); i++ ) await sleep(1000);
  fs.rmSync(path.join(laneDir(lane), "server.pid"), {force: true});
  await sleep(20000); // Foundry keeps the data folder locked for a while after it ends
  console.log(`Lane ${lane.id} stopped.`);
  return true;
}
async function accept(lane) {
  const {openGM} = await import("./browser.mjs");
  const {browser, page} = await openGM(laneUrl(lane));
  try {
    const now = worldFingerprint(await page.evaluate(WORLD_PROBE), cfg.ignoreSettings);
    const old = readJson(path.join(laneDir(lane), "clean.json"));
    if ( old ) {
      const d = diffWorld(old, now);
      fs.appendFileSync(path.join(laneDir(lane), "accept-log.txt"), `${new Date().toISOString()} accepted ${d.strict.length} change(s): ${d.strict.map(x => x.where).join(", ")}\n`);
      printDiffs("Accepted changes", d.strict);
    }
    writeJson(path.join(laneDir(lane), "clean.json"), now);
    console.log(`Lane ${lane.id}: clean fingerprint recorded (settings ${now.settingsDigest.slice(0, 12)}).`);
  } finally { await browser.close(); }
}
function deployFiles(lane) {
  const pkgs = [];
  for ( const d of fs.readdirSync(path.join(repo, "modules"), {withFileTypes: true}) ) if ( d.isDirectory() ) pkgs.push([path.join(repo, "modules", d.name), path.join(lane.dataPath, "Data", "modules", d.name), `lane${lane.id}-${d.name}`]);
  for ( const d of fs.readdirSync(path.join(repo, "system"), {withFileTypes: true}) ) if ( d.isDirectory() ) pkgs.push([path.join(repo, "system", d.name), path.join(lane.dataPath, "Data", "systems", d.name), `lane${lane.id}-${d.name}`]);
  for ( const [src, dst, name] of pkgs ) { backup(dst, name); copyTree(src, dst, {mirror: true}); }
  const gateSrc = path.join(repo, "tools", "gate"), gateDst = path.join(lane.dataPath, "Data", "wodx-gate");
  copyTree(gateSrc, gateDst); // adds and updates gate scripts; result files already there stay
  const expected = expectedCode(repo, path.join(laneDir(lane), "cache"));
  const diffs = diffCode(expected, codeFingerprint(lane.dataPath, {only: new Set(Object.keys(expected)), cacheDir: path.join(laneDir(lane), "cache")}));
  if ( diffs.length ) { printDiffs("Deploy check failed", diffs); throw new Error("Deployed files do not match the repo."); }
  console.log(`Lane ${lane.id}: ${pkgs.length} packages deployed and checked file by file.`);
}
function lockOrDie(lane, quietIfBusy = false) {
  const lock = acquireLock(lane, cfg, {gates: [`lanes.mjs ${cmd}`]});
  if ( !lock ) { if ( quietIfBusy ) { console.log(`Lane ${lane.id} is busy; skipped.`); process.exit(0); } die(`Lane ${lane.id} is busy (${JSON.stringify(lockState(lane, cfg).lock)}).`, 3); }
  return lock;
}

const lane = (opt("lane") || cmd === "status" || cmd === "compare" || cmd === "snapshot") ? (opt("lane") ? getLane(cfg, opt("lane")) : null) : die("Give --lane N.", 2);
try {
  switch ( cmd ) {
    case "status":
      for ( const l of cfg.lanes ) {
        const st = lockState(l, cfg), clean = readJson(path.join(laneDir(l), "clean.json")), drift = readJson(path.join(laneDir(l), "drift.json"));
        const nd = drift ? drift.code.length + drift.world.length : null;
        console.log(`lane ${l.id}  port ${l.port}  ${(await isUp(l)) ? "up     " : "stopped"}  ${st.held ? `busy (${st.lock.gates?.join(" ")})` : "free"}  clean: ${clean ? "yes" : "none"}  last check: ${nd === null ? "never" : nd ? `${nd} difference(s)` : "matched"}  ${l.dataPath}`);
      }
      break;
    case "start": await start(lane); break;
    case "stop": await stop(lane) || console.log(`Lane ${lane.id} was not running.`); break;
    case "accept": await accept(lane); break;
    case "deploy": {
      if ( flag("if-changed") ) {
        const cache = path.join(laneDir(lane), "cache"), expected = expectedCode(repo, cache);
        // Gate files and their fixtures folder (B3730) must match too.
        const gateSame = fs.readdirSync(path.join(repo, "tools", "gate"), {recursive: true}).map(String).every(f => {
          const src = path.join(repo, "tools", "gate", f), dst = path.join(lane.dataPath, "Data", "wodx-gate", f);
          if ( fs.statSync(src).isDirectory() ) return true;
          return fs.existsSync(dst) && fs.readFileSync(dst).equals(fs.readFileSync(src));
        });
        if ( !diffCode(expected, codeFingerprint(lane.dataPath, {only: new Set(Object.keys(expected)), cacheDir: cache})).length && gateSame ) {
          console.log(`Lane ${lane.id} already runs this checkout; no deploy needed.`);
          break;
        }
      }
      lockOrDie(lane, flag("if-changed"));
      try { await stop(lane); deployFiles(lane); await start(lane); await accept(lane); } finally { releaseLock(lane); }
      break;
    }
    case "setup": {
      if ( String(lane.id) === "1" ) die("Lane 1 is the existing testbed; nothing to set up.");
      const src = getLane(cfg, 1);
      if ( fs.existsSync(worldDir(lane)) && !flag("again") ) die(`Lane ${lane.id} already has a world at ${worldDir(lane)}. Use reset, or --again.`);
      if ( !fs.existsSync(path.join(cfg.knownGood, cfg.world)) ) die(`No known-good copy at ${cfg.knownGood}. Stop lane 1 and run: lanes.mjs snapshot --from 1`);
      for ( const d of ["Data/modules", "Data/systems", "Data/worlds", "Config", "Logs"] ) fs.mkdirSync(path.join(lane.dataPath, d), {recursive: true});
      // Config: everything from lane 1 (licence, certificate), then options.json with this lane's port and UPnP off.
      for ( const f of fs.readdirSync(path.join(src.dataPath, "Config")) ) if ( f !== "options.json" ) fs.cpSync(path.join(src.dataPath, "Config", f), path.join(lane.dataPath, "Config", f), {recursive: true});
      const o = readJson(path.join(src.dataPath, "Config", "options.json"), {});
      Object.assign(o, {port: lane.port, upnp: false, dataPath: lane.dataPath, updateChannel: o.updateChannel ?? "stable"});
      delete o.upnpLeaseDuration;
      writeJson(path.join(lane.dataPath, "Config", "options.json"), o);
      // Packages that are not WoDX's come from lane 1 as they are; WoDX's come from the repo.
      const wodx = new Set(fs.readdirSync(path.join(repo, "modules")));
      for ( const kind of ["modules", "systems"] ) for ( const d of fs.readdirSync(path.join(src.dataPath, "Data", kind), {withFileTypes: true}) ) {
        if ( !d.isDirectory() || wodx.has(d.name) || d.name === "worldofdarkness" ) continue;
        copyTree(path.join(src.dataPath, "Data", kind, d.name), path.join(lane.dataPath, "Data", kind, d.name), {mirror: true});
      }
      deployFiles(lane);
      copyTree(path.join(cfg.knownGood, cfg.world), worldDir(lane), {mirror: true});
      await start(lane);
      await accept(lane);
      console.log(`Lane ${lane.id} set up at ${laneUrl(lane)} (UPnP off; keep the port closed on the router).`);
      break;
    }
    case "snapshot": {
      const from = getLane(cfg, opt("from") ?? die("Give --from N.", 2));
      if ( await isUp(from) ) die(`Lane ${from.id} is running. Stop it first: a running world's database can't be copied safely.`);
      fs.mkdirSync(cfg.knownGood, {recursive: true});
      backup(path.join(cfg.knownGood, cfg.world), `testbed-known-good-${cfg.world}`);
      copyTree(worldDir(from), path.join(cfg.knownGood, cfg.world), {mirror: true});
      writeJson(path.join(cfg.knownGood, "known-good.json"), {from: from.id, at: new Date().toISOString(), world: cfg.world,
        digest: treeDigest(hashTree(path.join(cfg.knownGood, cfg.world))), packages: Object.fromEntries(Object.entries(codeFingerprint(from.dataPath)).map(([k, v]) => [k, v.version]))});
      console.log(`Known-good copy of ${cfg.world} taken from lane ${from.id}.`);
      break;
    }
    case "reset": {
      if ( String(lane.id) === "1" && !flag("allow-lane-1") ) die("Lane 1 is the testbed Ben plays in; reset it only with --allow-lane-1.");
      if ( !lane.autoReset && flag("if-free") ) { console.log(`Lane ${lane.id} has autoReset off; skipped.`); break; }
      const kg = path.join(cfg.knownGood, cfg.world);
      if ( !fs.existsSync(kg) ) die(`No known-good copy at ${kg}.`);
      lockOrDie(lane, flag("if-free"));
      try {
        await stop(lane);
        const same = fs.existsSync(worldDir(lane)) && treeDigest(hashTree(worldDir(lane))) === treeDigest(hashTree(kg));
        if ( same ) console.log(`Lane ${lane.id}'s world already matches known-good; no copy needed.`);
        else { backup(worldDir(lane), `lane${lane.id}-${cfg.world}`); copyTree(kg, worldDir(lane), {mirror: true}); }
        fs.rmSync(path.join(laneDir(lane), "clean.json"), {force: true});
        await start(lane);
        await accept(lane);
        console.log(`Lane ${lane.id} reset from known-good.`);
      } finally { releaseLock(lane); }
      break;
    }
    case "compare": {
      const fps = cfg.lanes.filter(l => fs.existsSync(path.join(l.dataPath, "Data"))).map(l => ({l, code: codeFingerprint(l.dataPath, {cacheDir: path.join(laneDir(l), "cache")}), clean: readJson(path.join(laneDir(l), "clean.json"))}));
      for ( let i = 1; i < fps.length; i++ ) {
        const a = fps[0], b = fps[i];
        console.log(`lane ${a.l.id} vs lane ${b.l.id}:`);
        const pk = diffPackages(a.code, b.code);
        printDiffs("  Packages", pk);
        if ( a.clean && b.clean ) { const w = diffWorld(a.clean, b.clean); printDiffs("  Clean worlds", [...w.strict, ...w.warn]); if ( !pk.length && !w.strict.length && !w.warn.length ) console.log("  no differences"); }
        else console.log("  (a lane has no clean fingerprint yet)");
      }
      break;
    }
    default: die("Commands: status, setup, start, stop, deploy, snapshot, reset, accept, compare", 2);
  }
} catch (e) { die(`lanes.mjs ${cmd}: ${e.message}`); }
