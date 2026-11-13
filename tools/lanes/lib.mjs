/**
 * Testbed lanes: shared helpers for the gate runner, the fingerprint tool and the lane manager.
 * A lane is one local Foundry server with its own user-data folder and port (see lanes.json).
 * Lane state lives outside Foundry's Data folder, in <dataPath>/wodx-lane/:
 *   lock.json          who holds the lane right now (one gate run at a time per lane)
 *   clean.json         the world fingerprint taken after the last reset or --accept
 *   latest.json        the newest full fingerprint (code + world), written before every gate run
 *   server.pid         pid of a server this tooling started
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import https from "node:https";
import http from "node:http";
import {fileURLToPath} from "node:url";
import {execFileSync} from "node:child_process";

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, "../..");
const SKIP = new Set(["LOCK", "LOG", "LOG.old", ".DS_Store", "Thumbs.db"]);
/**
 * Compendium packs are LevelDB folders. A running server compacts them on its own, rewriting CURRENT, MANIFEST-n,
 * n.log and n.ldb with the same contents, so their bytes say nothing about drift. Their files are left out; the
 * package version and every other file still count.
 */
const LEVELDB = /^(CURRENT|MANIFEST-\d+|\d+\.(log|ldb|sst))$/;
export const isPackDb = rel => /(^|\/)packs\//.test(rel) && LEVELDB.test(rel.split("/").pop());

export function loadConfig(file = process.env.WODX_LANES ?? path.join(HERE, "lanes.json")) {
  const cfg = JSON.parse(fs.readFileSync(file, "utf8"));
  cfg.ignoreSettings ??= [];
  cfg.lockMaxMinutes ??= 180;
  // Paths may name environment variables as %NAME% (Windows style), read at run time, so the
  // file holds no user names. A variable that isn't set is left as written.
  const expand = v => typeof v === "string" ? v.replace(/%([A-Za-z_][A-Za-z0-9_]*)%/g, (m, n) => (process.env[n] ?? m).replace(/\\/g, "/")) : v;
  for ( const k of ["foundryMain", "knownGood", "backups"] ) cfg[k] = expand(cfg[k]);
  for ( const lane of cfg.lanes ?? [] ) lane.dataPath = expand(lane.dataPath);
  return cfg;
}
export function getLane(cfg, id) {
  const lane = cfg.lanes.find(l => String(l.id) === String(id));
  if ( !lane ) throw new Error(`No lane ${id} in lanes.json (lanes: ${cfg.lanes.map(l => l.id).join(", ")})`);
  return lane;
}
export const laneDir = lane => path.join(lane.dataPath, "wodx-lane");
export const laneUrl = lane => lane.url ?? `https://localhost:${lane.port}`;
export function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}
export function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, JSON.stringify(data, null, 1));
}
export const sha = s => crypto.createHash("sha256").update(s).digest("hex");

/* ---------- File hashing ---------- */

/** Every file under root as {relative/path: sha256}. A size+mtime cache skips files that have not changed. */
export function hashTree(root, cacheFile = null) {
  const cache = cacheFile ? readJson(cacheFile, {}) : {};
  const out = {}, next = {};
  const walk = dir => {
    let entries;
    try { entries = fs.readdirSync(dir, {withFileTypes: true}); } catch { return; }
    for ( const e of entries ) {
      if ( SKIP.has(e.name) ) continue;
      const full = path.join(dir, e.name);
      if ( e.isDirectory() ) { walk(full); continue; }
      if ( !e.isFile() ) continue;
      const rel = path.relative(root, full).split(path.sep).join("/");
      if ( isPackDb(rel) ) continue;
      const st = fs.statSync(full);
      const c = cache[rel];
      const hash = (c && c.size === st.size && c.mtimeMs === st.mtimeMs) ? c.hash
        : crypto.createHash("sha256").update(fs.readFileSync(full)).digest("hex");
      out[rel] = hash;
      next[rel] = {size: st.size, mtimeMs: st.mtimeMs, hash};
    }
  };
  walk(root);
  if ( cacheFile ) writeJson(cacheFile, next);
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a < b ? -1 : 1));
}
export const treeDigest = files => sha(Object.entries(files).map(([k, v]) => `${k}\t${v}`).join("\n"));

/** Packages in a Foundry Data folder (or the repo's modules/ and system/ folders). */
function packageDirs(base, layout) {
  const out = [];
  const add = (kind, parent) => {
    let names = [];
    try { names = fs.readdirSync(parent, {withFileTypes: true}).filter(d => d.isDirectory()).map(d => d.name); } catch { }
    for ( const n of names ) out.push({key: `${kind}:${n}`, dir: path.join(parent, n), manifest: kind === "system" ? "system.json" : "module.json"});
  };
  if ( layout === "repo" ) { add("module", path.join(base, "modules")); add("system", path.join(base, "system")); }
  else { add("module", path.join(base, "Data", "modules")); add("system", path.join(base, "Data", "systems")); }
  return out;
}

/**
 * Code fingerprint: version and file hashes of every package. WoDX packages (the ones the repo holds) keep their
 * full file list so a mismatch can name each file; other packages keep a digest only.
 */
export function codeFingerprint(base, {layout = "data", only = null, cacheDir = null} = {}) {
  const pkgs = {};
  for ( const p of packageDirs(base, layout) ) {
    if ( only && !only.has(p.key) ) { pkgs[p.key] = {version: readJson(path.join(p.dir, p.manifest))?.version ?? null, digest: null}; continue; }
    const cache = cacheDir ? path.join(cacheDir, `hash-${sha(p.dir).slice(0, 12)}.json`) : null;
    const files = hashTree(p.dir, cache);
    const entry = {version: readJson(path.join(p.dir, p.manifest))?.version ?? null, digest: treeDigest(files)};
    if ( only ) entry.files = files;
    pkgs[p.key] = entry;
  }
  return pkgs;
}

/** What the lane should hold: the repo checkout's packages. */
export function expectedCode(repo = REPO, cacheDir = null) {
  const exp = {};
  for ( const p of packageDirs(repo, "repo") ) {
    const files = hashTree(p.dir, cacheDir ? path.join(cacheDir, `hash-${sha(p.dir).slice(0, 12)}.json`) : null);
    exp[p.key] = {version: readJson(path.join(p.dir, p.manifest))?.version ?? null, digest: treeDigest(files), files};
  }
  return exp;
}

/** Differences between the repo's packages and a lane's. Only packages the repo holds are checked. */
export function diffCode(expected, actual) {
  const diffs = [];
  for ( const [key, exp] of Object.entries(expected) ) {
    const got = actual[key];
    if ( !got ) { diffs.push({where: key, what: "not deployed on this lane"}); continue; }
    if ( exp.version !== got.version ) diffs.push({where: key, what: `version ${got.version} on the lane, ${exp.version} in the repo`});
    if ( exp.digest === got.digest ) continue;
    const ef = exp.files ?? {}, gf = got.files ?? {};
    for ( const f of Object.keys(ef) ) {
      if ( !(f in gf) ) diffs.push({where: `${key}/${f}`, what: "missing on the lane"});
      else if ( ef[f] !== gf[f] ) diffs.push({where: `${key}/${f}`, what: "differs from the repo"});
    }
    for ( const f of Object.keys(gf) ) if ( !(f in ef) ) diffs.push({where: `${key}/${f}`, what: "extra file on the lane"});
  }
  return diffs;
}

/** Packages that differ between two lanes (version or contents), for lanes.mjs compare. */
export function diffPackages(a, b) {
  const diffs = [];
  for ( const key of new Set([...Object.keys(a), ...Object.keys(b)]) ) {
    const x = a[key], y = b[key];
    if ( !x || !y ) { diffs.push({where: key, what: x ? "only on the first lane" : "only on the second lane"}); continue; }
    if ( x.version !== y.version ) diffs.push({where: key, what: `version ${x.version} vs ${y.version}`});
    else if ( x.digest && y.digest && x.digest !== y.digest ) diffs.push({where: key, what: "same version, different files"});
  }
  return diffs;
}

/* ---------- World fingerprint (runs inside the Foundry page) ---------- */

/** Passed to page.evaluate. Returns plain data; hashing happens in Node. */
export const WORLD_PROBE = () => {
  const val = v => { try { return JSON.stringify(v); } catch { return String(v); } };
  const settings = {};
  const store = game.settings.storage.get("world");
  for ( const s of (store?.contents ?? [...(store?.values?.() ?? [])]) ) settings[s.key] = val(s.value ?? s._source?.value);
  const modules = {};
  for ( const m of game.modules ) if ( m.active ) modules[m.id] = m.version ?? null;
  const docs = {};
  for ( const name of ["actors", "items", "scenes", "journal", "tables", "macros", "playlists", "cards", "combats", "folders", "users"] ) {
    const c = game[name];
    if ( !c ) continue;
    const rows = [...c].map(d => `${d.id}:${d._stats?.modifiedTime ?? ""}`).sort();
    docs[name] = {count: rows.length, rows};
  }
  return {world: game.world.id, core: game.version, system: {id: game.system.id, version: game.system.version},
    modules, settings, docs, worldTime: game.time.worldTime, paused: game.paused};
};

/** Turns the probe's raw data into a compact fingerprint with hashes. */
export function worldFingerprint(raw, ignore = []) {
  const skip = k => ignore.some(p => p.endsWith("*") ? k.startsWith(p.slice(0, -1)) : k === p);
  const settings = {};
  for ( const k of Object.keys(raw.settings).sort() ) if ( !skip(k) ) settings[k] = sha(raw.settings[k]).slice(0, 16);
  const docs = {};
  for ( const [n, d] of Object.entries(raw.docs) ) docs[n] = {count: d.count, digest: sha(d.rows.join("\n")).slice(0, 16)};
  return {world: raw.world, core: raw.core, system: raw.system, modules: raw.modules, worldTime: raw.worldTime,
    settingsDigest: sha(JSON.stringify(settings)), settings, docs};
}

/**
 * World drift between the clean fingerprint and now. "strict" entries stop a gate run: core, system and module
 * versions, the active module list, world settings and the clock. Document changes are warnings (test data a
 * gate forgot to clear), listed so they can be cleaned up.
 */
export function diffWorld(clean, now, {versions = true} = {}) {
  const strict = [], warn = [];
  if ( clean.world !== now.world ) strict.push({where: "world", what: `${now.world}, expected ${clean.world}`});
  if ( clean.core !== now.core ) strict.push({where: "Foundry core", what: `${now.core}, expected ${clean.core}`});
  if ( versions && clean.system?.version !== now.system?.version ) strict.push({where: `system ${now.system?.id}`, what: `${now.system?.version}, expected ${clean.system?.version}`});
  for ( const id of new Set([...Object.keys(clean.modules), ...Object.keys(now.modules)]) ) {
    const a = clean.modules[id], b = now.modules[id];
    if ( a === undefined ) strict.push({where: `module ${id}`, what: "switched on since the clean copy"});
    else if ( b === undefined ) strict.push({where: `module ${id}`, what: "switched off since the clean copy"});
    else if ( versions && a !== b ) strict.push({where: `module ${id}`, what: `version ${b}, clean copy had ${a}`});
  }
  if ( clean.worldTime !== now.worldTime ) strict.push({where: "clock", what: `world time ${now.worldTime}, clean copy ${clean.worldTime}`});
  if ( clean.settingsDigest !== now.settingsDigest ) {
    for ( const k of new Set([...Object.keys(clean.settings), ...Object.keys(now.settings)]) ) {
      if ( clean.settings[k] === now.settings[k] ) continue;
      if ( k === "core.time" ) continue; // reported as the clock above
      strict.push({where: `setting ${k}`, what: !(k in clean.settings) ? "added" : !(k in now.settings) ? "removed" : "changed"});
    }
  }
  for ( const n of new Set([...Object.keys(clean.docs), ...Object.keys(now.docs)]) ) {
    const a = clean.docs[n], b = now.docs[n];
    if ( !a || !b || a.digest !== b.digest ) warn.push({where: n, what: `${b?.count ?? 0} now, ${a?.count ?? 0} in the clean copy${a && b && a.count === b.count ? " (same count, edited)" : ""}`});
  }
  return {strict, warn};
}

/**
 * Versions the running server reports against the repo's. Foundry reads module.json once at start, so a lane whose
 * files match but whose server was not restarted still runs the old version; this catches that.
 */
export function diffRunning(expected, now) {
  const diffs = [];
  for ( const [key, exp] of Object.entries(expected) ) {
    const [kind, id] = key.split(":");
    const got = kind === "system" ? (now.system?.id === id ? now.system.version : undefined) : now.modules[id];
    if ( got === undefined ) continue; // not the active system, or a module switched off in this world
    if ( got !== exp.version ) diffs.push({where: `${kind} ${id}`, what: `server runs ${got}, repo has ${exp.version} (restart the lane)`});
  }
  return diffs;
}

/* ---------- Locks and lane picking ---------- */

export function pidAlive(pid) {
  if ( !pid ) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; }
}
/** A lock counts only while its process lives and it is younger than lockMaxMinutes. */
export function lockState(lane, cfg, now = Date.now(), alive = pidAlive) {
  const lock = readJson(path.join(laneDir(lane), "lock.json"));
  if ( !lock ) return {held: false};
  const ageMin = (now - Date.parse(lock.since)) / 60000;
  if ( !alive(lock.pid) ) return {held: false, stale: "its process has ended", lock};
  // B3089: a gate run sets a deadline and moves it on before each gate; a run past it has hung.
  if ( lock.until && now > Date.parse(lock.until) ) return {held: false, stale: `past its deadline (${lock.until})`, overdue: true, lock};
  // A lock with a deadline is judged by it alone, so a long nightly run that keeps moving it on is never taken over.
  if ( !lock.until && ageMin > cfg.lockMaxMinutes ) return {held: false, stale: `older than ${cfg.lockMaxMinutes} minutes`, overdue: true, lock};
  return {held: true, lock};
}
/** Ends a gate run that hung past its lane lock's deadline, with its browser (B3089). Only a lock a gate run wrote
 * (runner "run-gate") is acted on, and on Windows only when that process id is still a node process. */
export function endOverdue(lock, {platform = process.platform, exec = execFileSync} = {}) {
  if ( lock?.runner !== "run-gate" || !lock.pid || lock.pid === process.pid ) return false;
  try {
    if ( platform === "win32" ) {
      const row = String(exec("tasklist", ["/FI", `PID eq ${lock.pid}`, "/FO", "CSV", "/NH"], {encoding: "utf8"}));
      if ( !/^"node(\.exe)?"/im.test(row) ) return false;
      exec("taskkill", ["/PID", String(lock.pid), "/T", "/F"], {stdio: "ignore"});
    } else process.kill(lock.pid, "SIGKILL");
    return true;
  } catch { return false; }
}
/** Moves this process's lane lock deadline on (B3089). */
export function extendLock(lane, until) {
  const file = path.join(laneDir(lane), "lock.json");
  const lock = readJson(file);
  if ( lock?.pid !== process.pid ) return;
  lock.until = new Date(until).toISOString();
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(lock)); fs.renameSync(tmp, file);
}
export function acquireLock(lane, cfg, info) {
  const file = path.join(laneDir(lane), "lock.json");
  fs.mkdirSync(laneDir(lane), {recursive: true});
  const st = lockState(lane, cfg);
  if ( st.held ) return null;
  if ( st.overdue && endOverdue(st.lock) ) console.log(`Ended the hung run on lane ${lane.id} (process ${st.lock.pid}, ${st.stale}).`);
  if ( st.stale ) fs.rmSync(file, {force: true});
  const lock = {pid: process.pid, since: new Date().toISOString(), ...info};
  try { fs.writeFileSync(file, JSON.stringify(lock), {flag: "wx"}); } catch { return null; }
  return lock;
}
export function releaseLock(lane) {
  const file = path.join(laneDir(lane), "lock.json");
  const lock = readJson(file);
  if ( lock?.pid === process.pid ) fs.rmSync(file, {force: true});
}

/**
 * Answers true when a Foundry server responds on the lane's port (https first, then http). Only localhost is asked,
 * and the testbed lanes use Foundry's self-signed certificate, so the certificate is not checked for this probe.
 */
export function isUp(lane, timeout = 3000) {
  const tryOne = mod => new Promise(res => {
    const req = mod.get({host: "localhost", port: lane.port, path: "/api/status", rejectUnauthorized: false, timeout}, r => { r.resume(); res(r.statusCode < 500); });
    req.on("error", () => res(false));
    req.on("timeout", () => { req.destroy(); res(false); });
  });
  return tryOne(https).then(ok => ok || tryOne(http));
}

/** The first lane, in lanes.json order, that is up and not held. `only` limits the choice to some lane ids. */
export async function pickLane(cfg, {only = null, up = isUp, state = l => lockState(l, cfg)} = {}) {
  const free = [];
  for ( const lane of cfg.lanes ) {
    if ( only && !only.includes(String(lane.id)) ) continue;
    if ( lane.disabled ) continue;
    if ( state(lane).held ) continue;
    if ( await up(lane) ) free.push(lane);
  }
  return free[0] ?? null;
}

export function printDiffs(title, list) {
  if ( !list.length ) return;
  console.log(`${title} (${list.length}):`);
  for ( const d of list.slice(0, 60) ) console.log(`  - ${d.where}: ${d.what}`);
  if ( list.length > 60 ) console.log(`  ... and ${list.length - 60} more (full list in the lane's drift file)`);
}
