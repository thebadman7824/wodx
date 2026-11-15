#!/usr/bin/env node
/**
 * Cross-module api paths (B6150): every place a WoDX module reaches into another module's api
 * (game.modules.get("wodx-x").api.a.b, or through a getter such as `const chron = () => game.modules.get(...).api`)
 * is listed with the property path it expects. The done-claims audit found features that were wired to a path
 * that does not exist (api.towns where the api has api.upkeep.towns, npc().carry.orderCarry where it is
 * npc().orderCarry), so the feature silently did nothing. tools/gate/gateapipaths.mjs checks every listed path
 * against the live api objects on the testbed.
 *
 *   node tools/audit/api-paths.mjs            prints the list as JSON
 *   node tools/audit/api-paths.mjs --write    writes tools/gate/fixtures/api-paths.json
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MODS = path.join(ROOT, "modules");
const ID = "[A-Za-z_$][A-Za-z0-9_$]*";
const CHAIN = `((?:\\??\\.${ID})*)`;
const GET = `game\\.modules\\.get\\(\\s*["'\`](wodx-[a-z]+)["'\`]\\s*\\)\\??\\.api`;

/** Split ".a?.b.c" into ["a","b","c"]. */
const parts = s => (s.match(new RegExp(`\\.${ID}`, "g")) ?? []).map(x => x.slice(1));

function scanFile(file, text, mod, shared = []) {
  const out = [];
  const lineOf = i => text.slice(0, i).split("\n").length;
  const rel = path.relative(ROOT, file).replaceAll("\\", "/");
  // 1. String constants naming a module: const MOD = "wodx-npc", IX = "wodx-interactables"
  const consts = {};
  for ( const m of text.matchAll(new RegExp(`\\b(${ID})\\s*=\\s*["'\`](wodx-[a-z]+)["'\`]`, "g")) ) consts[m[1]] = m[2];
  const modOf = arg => { const a = arg.trim(); const q = a.match(/^["'`](wodx-[a-z]+)["'`]$/); return q ? q[1] : consts[a] ?? null; };
  // 2. Helpers that take a module id: const api = id => game.modules.get(id)?.active ? game.modules.get(id).api : null
  const helpers = new Set();
  for ( const m of text.matchAll(new RegExp(`(?:const|let|function)\\s+(${ID})\\s*=?\\s*\\(?\\s*(${ID})\\s*\\)?\\s*(?:=>)?[^\\n]{0,80}?game\\.modules\\??\\.get\\??\\.?\\(\\s*\\2\\s*\\)[^\\n]{0,40}?\\.api`, "g")) ) helpers.add(m[1]);
  // 3. Normalise every way of reaching an api into one marker: \u0001wodx-x\u0002
  let t = text.replace(new RegExp(`game\\.modules\\??\\.get\\??\\.?\\(\\s*([^()\\n]{1,40}?)\\s*\\)\\??\\.api\\b`, "g"), (all, arg) => { const m = modOf(arg); return m ? `\u0001${m}\u0002${" ".repeat(Math.max(0, all.length - m.length - 2))}` : all; });
  for ( const h of helpers ) t = t.replace(new RegExp(`(?<![.\\w$])${h}\\(\\s*([^()\\n]{1,40}?)\\s*\\)`, "g"), (all, arg) => { const m = modOf(arg); return m ? `\u0001${m}\u0002${" ".repeat(Math.max(0, all.length - m.length - 2))}` : all; });
  const add = (target, chain, i, how) => {
    const p = parts(chain);
    if ( p.length ) out.push({from: mod, file: rel, line: lineOf(i), target, path: p, how});
  };
  // Direct reads off the marker
  for ( const m of t.matchAll(new RegExp(`\u0001(wodx-[a-z]+)\u0002\\s*${CHAIN}`, "g")) ) add(m[1], m[2], m.index, "direct");
  // Getters and saved apis: const X = () => <marker>.a ;  X = <marker>  (also inside try/ternary on one line)
  const getters = [];
  for ( const m of t.matchAll(new RegExp(`(?<![.\\w$])(${ID})\\s*=\\s*(\\(\\s*\\)\\s*=>\\s*)?[^;\\n=]{0,60}?\u0001(wodx-[a-z]+)\u0002\\s*${CHAIN}`, "g")) ) {
    if ( helpers.has(m[1]) ) continue;
    // A value saved from a call (const spot = await fx().pickPoint(...)) is not the api's shape
    if ( /^\s*\(/.test(t.slice(m.index + m[0].length, m.index + m[0].length + 3)) ) continue;
    // A saved api in a short-lived name that the file declares again or takes as a parameter is too easily shadowed
    if ( !m[2] ) {
      const n = m[1].replace(/\$/g, "\\$");
      const decl = (t.match(new RegExp(`\\b(?:const|let|var)\\s+${n}\\b|[(,]\\s*${n}\\s*(?=[,)=])|\\b${n}\\s*=>|\\{\\s*${n}\\s*[,}]`, "g")) ?? []).length;
      if ( decl > 1 || n.length < 2 ) continue;
    }
    getters.push({name: m[1], target: m[3], prefix: parts(m[4]), fn: !!m[2]});
  }
  // Getters another file of the module exports, imported here by name
  for ( const g of shared ) {
    if ( getters.some(x => x.name === g.name) ) continue;
    if ( new RegExp(`import\\s*\\{[^}]*\\b${g.name}\\b[^}]*\\}`).test(t) ) getters.push(g);
  }
  scanFile.lastGetters = getters.filter(g => new RegExp(`export\\s+(?:const|let)\\s+${g.name}\\b`).test(t));
  for ( const g of getters ) {
    const use = g.fn ? `(?<![.\\w$])${g.name}\\(\\s*\\)${CHAIN}` : `(?<![.\\w$])${g.name}${CHAIN}`;
    for ( const m of t.matchAll(new RegExp(use, "g")) ) {
      const rest = parts(m[1]);
      if ( rest.length ) add(g.target, `.${[...g.prefix, ...rest].join(".")}`, m.index, `via ${g.name}`);
    }
  }
  return out;
}

export function collect() {
  const all = [];
  for ( const mod of fs.readdirSync(MODS).filter(d => d.startsWith("wodx-")) ) {
    const files = [];
    const walk = dir => {
      for ( const e of fs.readdirSync(dir, {withFileTypes: true}) ) {
        const f = path.join(dir, e.name);
        if ( e.isDirectory() ) walk(f);
        else if ( /\.(m?js)$/.test(e.name) ) files.push(f);
      }
    };
    const s = path.join(MODS, mod, "scripts");
    if ( fs.existsSync(s) ) walk(s);
    const shared = [];
    for ( const f of files ) { scanFile(f, fs.readFileSync(f, "utf8"), mod); shared.push(...scanFile.lastGetters); }
    for ( const f of files ) all.push(...scanFile(f, fs.readFileSync(f, "utf8"), mod, shared));
  }
  // A path a module reads from its own api is still a path; keep them all, one row per distinct target+path.
  const seen = new Map();
  for ( const r of all ) {
    const k = `${r.target}:${r.path.join(".")}`;
    if ( !seen.has(k) ) seen.set(k, {target: r.target, path: r.path, uses: []});
    seen.get(k).uses.push(`${r.file}:${r.line}`);
  }
  return [...seen.values()].sort((a, b) => `${a.target}.${a.path}`.localeCompare(`${b.target}.${b.path}`));
}

if ( process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ) {
  const list = collect();
  if ( process.argv.includes("--write") ) {
    const f = path.join(ROOT, "tools", "gate", "fixtures", "api-paths.json");
    fs.writeFileSync(f, JSON.stringify(list, null, 1) + "\n");
    console.log(`${list.length} paths written to ${path.relative(ROOT, f)}`);
  } else console.log(JSON.stringify(list, null, 1));
}
