#!/usr/bin/env node
/**
 * Which gates a change needs (B3083). Each gate in tools/gate covers the WoDX modules it names: "wodx-npc" strings,
 * "WoDX NPC" in its header, game.wodx.npc calls and imports from modules/wodx-npc. gate-map-extra.json adds or
 * removes modules by hand and lists files in tools/gate that are not gates.
 *
 *   node tools/lanes/gate-map.mjs                   the map: each gate and the modules it covers
 *   node tools/lanes/gate-map.mjs --touched [--base origin/main] [--direct]
 *                                                   the gates the branch's changes need, one per line
 *   node tools/lanes/gate-map.mjs --modules wodx-npc,wodx-sheets
 *                                                   the gates for these modules
 *
 * A change touches a module when it changes a file under modules/<id>/, and every module with a file that loads a
 * changed script. Modules that require a touched one (module.json relationships.requires) are touched too, all the
 * way up, unless --direct is given; so a Chronicle change runs nearly everything and a Paperdoll change only the
 * Paperdoll gates. A change to the
 * system (system/) touches every module. A changed gate file runs that gate. Docs, tools and changes/ alone need no
 * gate. run-gate.mjs uses this for --touched and --all.
 */
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const GATES = path.join(ROOT, "tools/gate");

export function moduleIds(root = ROOT) {
  return fs.readdirSync(path.join(root, "modules")).filter(d => fs.existsSync(path.join(root, "modules", d, "module.json"))).sort();
}

/** Short names as the gates write them in prose ("WoDX NPC", "WoDX Storyteller"). */
const shortName = id => id.replace(/^wodx-/, "");

/** The modules one gate's source names. */
export function coveredBy(src, ids) {
  const out = new Set();
  for ( const id of ids ) {
    const s = shortName(id);
    const re = new RegExp(String.raw`(["'\`/]${id}\b|\bWoDX ${s}\b|game\.wodx\??\.${s}\b|\bmodules/${id}/)`, "i");
    if ( re.test(src) ) out.add(id);
  }
  return out;
}

export function loadExtra(root = ROOT) {
  const f = path.join(root, "tools/lanes/gate-map-extra.json");
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {};
}

/** {gate: [module ids]} for every gate file (gate*.mjs with an exported run). */
export function gateMap(root = ROOT) {
  const ids = moduleIds(root), extra = loadExtra(root), not = new Set(extra.notGates ?? []);
  const map = {};
  for ( const f of fs.readdirSync(path.join(root, "tools/gate")).sort() ) {
    const name = f.replace(/\.mjs$/, "");
    if ( !/^gate[\w-]*\.mjs$/.test(f) || not.has(name) ) continue;
    const src = fs.readFileSync(path.join(root, "tools/gate", f), "utf8");
    if ( !/export\s+(async\s+)?function\s+run\b/.test(src) ) continue;
    const set = coveredBy(src, ids);
    for ( const m of extra.add?.[name] ?? [] ) set.add(m);
    for ( const m of extra.remove?.[name] ?? [] ) set.delete(m);
    if ( !set.size ) set.add("wodx-chronicle"); // a gate that names nothing still runs when the core changes
    map[name] = [...set].sort();
  }
  return map;
}

const walk = d => fs.existsSync(d) ? fs.readdirSync(d, {withFileTypes: true}).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : /\.m?js$/.test(e.name) ? [path.join(d, e.name)] : []) : [];
const rel = (root, f) => path.relative(root, f).split(path.sep).join("/");

/** {module: [modules that require it in module.json]}. */
export function requirers(root = ROOT) {
  const ids = moduleIds(root), out = Object.fromEntries(ids.map(i => [i, new Set()]));
  for ( const id of ids ) {
    const j = JSON.parse(fs.readFileSync(path.join(root, "modules", id, "module.json"), "utf8"));
    for ( const r of j.relationships?.requires ?? [] ) out[r.id]?.add(id);
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v].sort()]));
}

/** Script files of every module, with the files each one loads (relative imports and other modules' paths). */
export function importGraph(root = ROOT) {
  const files = {};
  for ( const id of moduleIds(root) ) for ( const f of walk(path.join(root, "modules", id, "scripts")) ) {
    const src = fs.readFileSync(f, "utf8"), deps = new Set();
    for ( const m of src.matchAll(/(?:from\s*|import\s*\(\s*|import\s+)["'`]([^"'`]+\.m?js)["'`]/g) ) {
      const spec = m[1];
      if ( spec.startsWith(".") ) deps.add(rel(root, path.resolve(path.dirname(f), spec)));
    }
    for ( const m of src.matchAll(/(wodx-[a-z]+)\/(scripts\/[\w./-]+\.m?js)/g) ) deps.add(`modules/${m[1]}/${m[2]}`);
    files[rel(root, f)] = deps;
  }
  return files;
}

/** The modules and gate files a list of changed paths touches.
 * A changed script touches its module and every module holding a file that loads it, however many files lie
 * between (Chronicle loading one NPC rules file brings in Chronicle only when that file or one it loads changed).
 * Then every module that requires a module whose own files changed is touched too, all the way up, unless direct
 * is set (a module touched only because it loads a changed file does not pull in its own requirers). */
export function touched(paths, {root = ROOT, direct = false} = {}) {
  const ids = moduleIds(root), mods = new Set(), gates = new Set(), changed = [];
  for ( const p of paths.map(p => p.replace(/\\/g, "/")) ) {
    const m = /^modules\/(wodx-[a-z]+)\//.exec(p);
    if ( m && ids.includes(m[1]) ) { mods.add(m[1]); if ( /\.m?js$/.test(p) ) changed.push(p); }
    else if ( p.startsWith("system/") ) ids.forEach(i => mods.add(i));
    else if ( /^tools\/gate\/(gate[\w-]*)\.mjs$/.test(p) ) gates.add(/^tools\/gate\/(gate[\w-]*)\.mjs$/.exec(p)[1]);
  }
  const owners = new Set(mods);
  if ( changed.length ) {
    const g = importGraph(root), users = {};
    for ( const [f, deps] of Object.entries(g) ) for ( const d of deps ) (users[d] ??= []).push(f);
    const seen = new Set(changed), queue = [...changed];
    while ( queue.length ) for ( const u of users[queue.shift()] ?? [] ) if ( !seen.has(u) ) { seen.add(u); queue.push(u); }
    for ( const f of seen ) mods.add(/^modules\/(wodx-[a-z]+)\//.exec(f)[1]);
  }
  if ( !direct ) {
    const req = requirers(root), queue = [...owners];
    while ( queue.length ) for ( const d of req[queue.shift()] ?? [] ) if ( !mods.has(d) ) { mods.add(d); queue.push(d); }
  }
  return {modules: [...mods].sort(), gates: [...gates].sort()};
}

/** Gates for a set of modules, plus the named gate files that are real gates. */
export function gatesFor(mods, extraGates = [], map = gateMap()) {
  const want = new Set(mods);
  return Object.keys(map).filter(g => extraGates.includes(g) || map[g].some(m => want.has(m)));
}

export function changedPaths(base = "origin/main", root = ROOT) {
  const run = (...a) => execFileSync("git", a, {cwd: root, encoding: "utf8"}).trim();
  const mb = run("merge-base", base, "HEAD");
  const committed = run("diff", "--name-only", mb, "HEAD").split("\n");
  const work = run("diff", "--name-only", "HEAD").split("\n");
  return [...new Set([...committed, ...work].filter(Boolean))];
}

function main() {
  const args = process.argv.slice(2), opt = k => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };
  const map = gateMap();
  if ( args.includes("--touched") ) {
    const t = touched(changedPaths(opt("base") ?? "origin/main"), {direct: args.includes("--direct")});
    const list = gatesFor(t.modules, t.gates, map);
    console.error(`Touched modules: ${t.modules.join(", ") || "none"}; ${list.length} of ${Object.keys(map).length} gates.`);
    console.log(list.join("\n"));
    return;
  }
  if ( opt("modules") ) { console.log(gatesFor(opt("modules").split(","), [], map).join("\n")); return; }
  for ( const [g, mods] of Object.entries(map) ) console.log(`${g.padEnd(22)} ${mods.join(" ")}`);
}

if ( process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ) main();
