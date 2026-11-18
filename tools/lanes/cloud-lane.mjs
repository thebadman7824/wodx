/**
 * Lane 9: a headless Foundry testbed inside a cloud thread's own Linux box (B7240), so a thread can run a gate without
 * waiting for a PC lane. Trial on 17 November 2026: setup about 2 minutes, gateplains 28/28 in 193 s, 3.1 GB RAM.
 *   node tools/lanes/cloud-lane.mjs setup [--cache <folder>]      (Foundry goes in ~/foundry, as lanes.json says)
 *   node tools/lanes/cloud-lane.mjs gate <gate> [<gate> ...] [run-gate options]
 *   node tools/lanes/cloud-lane.mjs stop
 * setup unpacks Foundry from a private cache folder (the Node build's zip and a signed license.json; default
 * /mnt/project-files/private/cloud-foundry, never the repo), fetches Node 24 from npm when the box runs an older Node
 * (Foundry 14 refuses anything below 24), deploys the repo's modules and system through lanes.mjs and records the
 * clean fingerprint. gate runs run-gate.mjs on lane 9. Both set WODX_HOST=cloud and NODE_USE_ENV_PROXY=1 (B7241).
 *
 * Licence (B7242): the cached license.json is signed for the cloud box's host name; Foundry signs again by itself only
 * when the key is entered on its licence page, so a box with another host name stops at the licence page and setup
 * says so. The key is never printed. EULA item 2 and the FAQ allow this second instance while nobody but the licence
 * owner can get past its login: lane 9 listens only inside the box, which nobody else can reach.
 *
 * World (B7243, B7300): when the cache holds the PC known-good world (testbed/testbed-known-good.zip.partNN, with a
 * SHA256 file) setup joins the parts, checks the hash and uses that world as lane 9's known-good copy and world; when
 * it holds the PC lane's other modules (modules/cloud-foundry-modules.zip.partNN) they go into the lane's Data folder
 * the same way. Without them the world is the repo's world.json with the WoDX modules on and a Gamemaster Test
 * account. Either way a cloud result is a hint, not a verdict: gate6b's werewolf form step failed on lane 9 with the
 * PC world and 28 of its 30 modules (17 to 18 November 2026) while it passed on a PC lane, so a cloud fail is
 * checked on a PC lane before anyone acts on it.
 */
import {spawnSync} from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createRequire} from "node:module";
import {HERE, REPO} from "./lib.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const cmd = args[0];
const ROOT = path.join(os.homedir(), "foundry");
const CACHE = opt("cache", "/mnt/project-files/private/cloud-foundry");
const ZIP = "FoundryVTT-Node-14.369.zip", NODE_PKG = "node-linux-x64@24.22.3";
const LANE = "9", LANE_URL = "http://localhost:30090", WORLD = "rothenstein-wodx";
const NODE24 = path.join(ROOT, "node24", "package", "bin", "node");
const env = {...process.env, WODX_HOST: "cloud", NODE_USE_ENV_PROXY: "1", WODX_LANES: path.join(HERE, "lanes.json")};
const die = (m, c = 1) => { console.error(m); process.exit(c); };
const run = (bin, a, o = {}) => {
  const r = spawnSync(bin, a, {stdio: "inherit", env, ...o});
  if ( r.status !== 0 && !o.allowFail ) die(`${path.basename(bin)} ${a.slice(0, 3).join(" ")} failed (exit ${r.status})`, r.status || 1);
  return r.status;
};
const timed = async (label, fn) => { const t = Date.now(); const v = await fn(); console.log(`${label}: ${((Date.now() - t) / 1000).toFixed(1)} s`); return v; };

/** The node to run Foundry and the lane tools with: this one if it is 24 or newer, else Node 24 from npm (B7241). */
function node24() {
  if ( Number(process.versions.node.split(".")[0]) >= 24 ) return process.execPath;
  if ( !fs.existsSync(NODE24) ) {
    fs.mkdirSync(path.dirname(path.dirname(NODE24)), {recursive: true});
    const dir = path.dirname(path.dirname(path.dirname(NODE24)));
    run("npm", ["pack", NODE_PKG, "--silent"], {cwd: dir, stdio: ["ignore", "ignore", "inherit"]});
    const tgz = fs.readdirSync(dir).find(f => f.endsWith(".tgz"));
    run("tar", ["xzf", tgz], {cwd: dir});
  }
  return NODE24;
}

/**
 * B7300: joins <CACHE>/<sub>/<name>.zip.partNN into one zip in ROOT/tmp, checks it against <sub>/SHA256 when that file
 * is there, unzips it into dest and deletes the joined zip (it never goes back to the shared folder, whose files are
 * capped at 20 MiB). Skipped when dest already holds this hash (dest/.cloud-sha256). Returns true when it unpacked.
 */
async function fromParts(sub, name, dest) {
  const dir = path.join(CACHE, sub);
  const parts = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.startsWith(`${name}.zip.part`)).sort() : [];
  if ( !parts.length ) return false;
  const want = fs.existsSync(path.join(dir, "SHA256")) ? fs.readFileSync(path.join(dir, "SHA256"), "utf8").trim().split(/\s+/)[0] : null;
  const mark = path.join(dest, ".cloud-sha256");
  if ( want && fs.existsSync(mark) && fs.readFileSync(mark, "utf8").trim() === want ) return false;
  const tmp = path.join(ROOT, "tmp"), zip = path.join(tmp, `${name}.zip`);
  fs.mkdirSync(tmp, {recursive: true});
  fs.writeFileSync(zip, "");
  const hash = crypto.createHash("sha256");
  for ( const p of parts ) { const b = fs.readFileSync(path.join(dir, p)); hash.update(b); fs.appendFileSync(zip, b); }
  const got = hash.digest("hex");
  if ( want && got !== want ) { fs.rmSync(zip, {force: true}); die(`${name}: the joined parts do not match ${sub}/SHA256 (got ${got.slice(0, 12)}); ask for a fresh copy.`); }
  fs.mkdirSync(dest, {recursive: true});
  run("unzip", ["-q", "-o", zip, "-d", dest]);
  fs.rmSync(zip, {force: true});
  fs.writeFileSync(mark, got);
  return true;
}

/** Signs in as the world's first Gamemaster, adds Gamemaster Test (no password) and turns on every WoDX module. */
async function bootstrapWorld() {
  const {chromium} = createRequire(path.join(HERE, "../harness/package.json"))("playwright");
  const browser = await chromium.launch({headless: true});
  try {
    const page = await browser.newPage();
    await page.goto(`${LANE_URL}/join`);
    const SEL = "select[name=userid], select[name=userId]";
    await page.waitForSelector(SEL, {timeout: 90000});
    const users = await page.$$eval(`${SEL.split(", ").map(s => `${s} option`).join(", ")}`, os => os.map(o => [o.value, o.textContent.trim()]));
    if ( users.some(u => u[1] === "Gamemaster Test") ) return console.log("Gamemaster Test is already there.");
    const gm = users.find(u => u[0] && /Gamemaster/.test(u[1])) ?? die("The new world has no Gamemaster to sign in with.");
    await page.selectOption(SEL, gm[0]);
    await Promise.all([page.waitForURL(/\/game/, {timeout: 90000}), page.click("button[name=join]")]);
    await page.waitForFunction(() => window.game?.ready === true, null, {timeout: 180000});
    const ids = fs.readdirSync(path.join(REPO, "modules"));
    const out = await page.evaluate(async ids => {
      await User.create({name: "Gamemaster Test", role: CONST.USER_ROLES.GAMEMASTER});
      const cfg = game.settings.get("core", "moduleConfiguration") ?? {};
      for ( const id of ids ) if ( game.modules.get(id) ) cfg[id] = true;
      await game.settings.set("core", "moduleConfiguration", cfg);
      return ids.filter(i => !game.modules.get(i));
    }, ids);
    if ( out.length ) die(`Modules missing on lane 9 after deploy: ${out.join(", ")}`);
    console.log(`Gamemaster Test added; ${ids.length} WoDX modules on.`);
  } finally { await browser.close(); }
}

async function setup() {
  if ( process.platform !== "linux" ) die("cloud-lane.mjs is for a cloud thread's Linux box; PCs use lanes.mjs.");
  const node = node24();
  const app = path.join(ROOT, "app"), data = path.join(ROOT, "data");
  if ( !fs.existsSync(path.join(app, "main.mjs")) ) {
    const zip = path.join(CACHE, ZIP);
    if ( !fs.existsSync(zip) ) die(`No ${ZIP} in ${CACHE}. Ask Ben for a fresh timed download link (foundryvtt.com, Purchased Licenses, Linux/NodeJS) and save the zip there.`);
    await timed("Foundry unpacked", () => { fs.mkdirSync(app, {recursive: true}); run("unzip", ["-q", "-o", zip, "-d", app]); });
  }
  for ( const d of ["Config", "Data/worlds", "Logs"] ) fs.mkdirSync(path.join(data, d), {recursive: true});
  const lic = path.join(data, "Config", "license.json");
  if ( !fs.existsSync(lic) ) {
    if ( !fs.existsSync(path.join(CACHE, "license.json")) ) die(`No license.json in ${CACHE}: the server will stop at its licence page.`);
    fs.copyFileSync(path.join(CACHE, "license.json"), lic);
  }
  const host = JSON.parse(fs.readFileSync(lic, "utf8")).host;
  if ( host !== os.hostname() ) console.warn(`The cached licence is signed for host "${host}", this box is "${os.hostname()}": expect the licence page (B7242).`);
  const lanes = path.join(HERE, "lanes.mjs");
  // B7300: the PC lane's other modules, and the PC known-good world, from the cache when it has them
  if ( await timed("other modules checked", () => fromParts("modules", "cloud-foundry-modules", path.join(data, "Data"))) ) console.log("Other modules unpacked into the lane's Data folder.");
  const kgRoot = path.join(ROOT, "known-good"), laneWorld = path.join(data, "Data", "worlds", WORLD);
  const staged = path.join(ROOT, "tmp", "known-good");
  if ( await timed("known-good world checked", () => fromParts("testbed", "testbed-known-good", staged)) ) {
    fs.rmSync(path.join(kgRoot, WORLD), {recursive: true, force: true});
    fs.mkdirSync(kgRoot, {recursive: true});
    fs.renameSync(path.join(staged, "testbed-known-good", WORLD), path.join(kgRoot, WORLD));
    fs.copyFileSync(path.join(staged, "testbed-known-good", "known-good.json"), path.join(kgRoot, "known-good.json"));
    fs.rmSync(path.join(staged, "testbed-known-good"), {recursive: true, force: true});
    console.log("PC known-good world in place as lane 9's known-good copy.");
  }
  // A lane world that is only world.json (the first trial's) gives way to the PC world once there is one
  const realKg = fs.existsSync(path.join(kgRoot, "known-good.json"));
  if ( realKg && !fs.existsSync(path.join(laneWorld, "data")) ) {
    run(node, [lanes, "stop", "--lane", LANE], {allowFail: true});
    fs.rmSync(laneWorld, {recursive: true, force: true});
    fs.cpSync(path.join(kgRoot, WORLD), laneWorld, {recursive: true});
    console.log("Lane 9's world is now the PC known-good world.");
  }
  // Otherwise the lane tools' known-good copy and the lane's world are the repo's world.json (B7243)
  for ( const dir of [path.join(kgRoot, WORLD), laneWorld] ) {
    if ( fs.existsSync(path.join(dir, "world.json")) ) continue;
    fs.mkdirSync(dir, {recursive: true});
    fs.copyFileSync(path.join(REPO, "worlds", WORLD, "world.json"), path.join(dir, "world.json"));
  }
  fs.mkdirSync(path.join(ROOT, "backups"), {recursive: true});
  if ( !fs.existsSync(path.join(HERE, "../harness/node_modules/playwright")) ) await timed("harness tools installed",
    () => run("npm", ["install", "--no-audit", "--no-fund"], {cwd: path.join(HERE, "../harness"), env: {...env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1"}}));
  // The first deploy ends at the clean fingerprint, which needs Gamemaster Test: a fresh world has only the default
  // Gamemaster, so that step may fail once; the account is added and the fingerprint taken after it.
  const deployed = await timed("deployed", () => run(node, [lanes, "deploy", "--lane", LANE], {allowFail: true}));
  if ( deployed !== 0 ) { // the PC world has Gamemaster Test already, so this is only the world.json case
    await timed("world ready", bootstrapWorld);
    await timed("clean fingerprint", () => run(node, [lanes, "accept", "--lane", LANE]));
  }
  console.log(`Lane 9 ready at ${LANE_URL}. Run gates with: node tools/lanes/cloud-lane.mjs gate <gate>`);
}

if ( cmd === "setup" ) await setup();
else if ( cmd === "gate" ) process.exit(run(node24(), [path.join(HERE, "run-gate.mjs"), ...args.slice(1), "--lane", LANE], {allowFail: true}));
else if ( cmd === "stop" ) process.exit(run(node24(), [path.join(HERE, "lanes.mjs"), "stop", "--lane", LANE], {allowFail: true}));
else die("Use: cloud-lane.mjs setup | gate <gate> ... | stop", 2);
