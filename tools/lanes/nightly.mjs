#!/usr/bin/env node
/**
 * The nightly full gate run (B3084), started by lane-reset.cmd after lanes 2 and 3 are reset.
 *   node tools/lanes/nightly.mjs [--lanes 2,3] [--no-pull]
 * 1. Pulls this clone's main (fast-forward only; a clone with local changes is left alone).
 * 2. Deploys it to each lane, only where the lane's code or gates differ (lanes.mjs deploy --if-changed).
 * 3. Runs every gate in the gate map, split between the lanes, each lane in its own process at below-normal
 *    priority, through run-gate.mjs (so the drift check still guards every run).
 * Each gate's line goes to %LOCALAPPDATA%\FoundryVTT\nightly-gates.log; the last line of each run there says its exit
 * code. Put a file named nightly-off next to this script to skip the full run.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawn, spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../..");
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };
const lanes = (opt("lanes") ?? "2,3").split(",").map(s => s.trim()).filter(Boolean);
const base = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "FoundryVTT") : os.tmpdir();
const report = path.join(base, "nightly-gates.log");
const log = (...a) => console.log(new Date().toISOString(), ...a);

if ( fs.existsSync(path.join(HERE, "nightly-off")) ) { log("nightly-off is there: no full run."); process.exit(0); }
if ( !args.includes("--no-pull") ) {
  const dirty = spawnSync("git", ["status", "--porcelain", "--untracked-files=no"], {cwd: ROOT, encoding: "utf8"}).stdout.trim();
  if ( dirty ) log("The clone has local changes; not pulling.");
  else log("git pull:", spawnSync("git", ["pull", "-q", "--ff-only"], {cwd: ROOT, encoding: "utf8"}).status === 0 ? "ok" : "failed (running what is there)");
}
for ( const l of lanes ) spawnSync(process.execPath, [path.join(HERE, "lanes.mjs"), "deploy", "--lane", l, "--if-changed"], {cwd: ROOT, stdio: "inherit"});

const runs = lanes.map((l, i) => new Promise(done => {
  const p = spawn(process.execPath, [path.join(HERE, "run-gate.mjs"), "--all", "--shard", `${i + 1}/${lanes.length}`, "--lane", l, "--wait", "30", "--report", report],
    {cwd: ROOT, stdio: "inherit"});
  try { os.setPriority(p.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch {}
  p.on("exit", code => done({lane: l, code}));
}));
const out = await Promise.all(runs);
log("Nightly full run:", out.map(r => `lane ${r.lane} exit ${r.code}`).join(", "), `(details in ${report})`);
process.exit(out.some(r => r.code) ? 1 : 0);
