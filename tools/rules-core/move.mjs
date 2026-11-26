#!/usr/bin/env node
/**
 * Move a module's rules files into the rules core (B8062, docs/RULES-CORE.md) and rewrite every path to them.
 *
 *   node tools/rules-core/move.mjs wodx-paperdoll [--hold a-rules.mjs,b-rules.js] [--dry]
 *
 * Each rules file (*-rules.mjs, *-rules.js, rules.mjs, rules.js) of the module still listed under notMoved in
 * tools/harness/rules-core-baseline.json goes to modules/wodx-rules/<module without wodx->/ with `git mv`, so git
 * follows the rename when another branch edits the old file. --hold leaves the named files where they are.
 * Then, across modules/ and tools/ (not CHANGELOGs or docs, which keep history):
 *   - every relative import of a moved file points at its new place, and a moved file's own imports are redone from
 *     its new folder;
 *   - every path written as text ("modules/wodx-npc/scripts/x-rules.mjs", "/modules/wodx-npc/scripts/x-rules.mjs",
 *     and `/modules/${MOD}/scripts/x-rules.mjs` where MOD is a const naming the module in that file) is rewritten;
 *   - the moved files come off notMoved, and any file outside the package that a moved file imports goes on outside.
 * --dry prints the plan and changes nothing. Run the harness after it: anything the rewrite missed fails there.
 */
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BASELINE = path.join(ROOT, "tools/harness/rules-core-baseline.json");
const args = process.argv.slice(2);
const mod = args.find(a => !a.startsWith("--") && !args[args.indexOf(a) - 1]?.startsWith("--hold"));
const dry = args.includes("--dry");
const holdArg = args[args.indexOf("--hold") + 1];
const hold = new Set(args.includes("--hold") && holdArg ? holdArg.split(",").map(s => s.trim()) : []);
if ( !mod || !/^wodx-[a-z-]+$/.test(mod) || mod === "wodx-rules" ) {
  console.error("Usage: node tools/rules-core/move.mjs wodx-<module> [--hold a-rules.mjs,...] [--dry]");
  process.exit(1);
}

const posix = p => p.split(path.sep).join("/");
const rel = f => posix(path.relative(ROOT, f));
const abs = r => path.join(ROOT, r);
const walk = d => fs.readdirSync(d, {withFileTypes: true}).flatMap(e => {
  const p = path.join(d, e.name);
  if ( e.isDirectory() ) return ["node_modules", ".git"].includes(e.name) ? [] : walk(p);
  return [p];
});

const base = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
const short = mod.replace(/^wodx-/, "");
const moves = new Map();   // old repo path -> new repo path
for ( const r of base.notMoved ) {
  if ( !r.startsWith(`modules/${mod}/`) ) continue;
  if ( hold.has(path.basename(r)) ) continue;
  moves.set(r, `modules/wodx-rules/${short}/${path.basename(r)}`);
}
if ( !moves.size ) { console.log(`Nothing to move for ${mod}.`); process.exit(0); }
for ( const n of moves.values() ) if ( fs.existsSync(abs(n)) ) { console.error(`${n} already exists`); process.exit(1); }

const code = walk(abs("modules")).concat(walk(abs("tools")), walk(abs("registry")))
  .filter(f => /\.(m?js|json)$/.test(f) && !/CHANGELOG/.test(f) && path.resolve(f) !== BASELINE);
const SPEC = /((?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["'])(\.{1,2}\/[^"'?]+)((?:\?[^"']*)?["'])/g;
const where = new Map([...moves].map(([o, n]) => [o, n]));
const newPathOf = r => where.get(r) ?? r;
/** Chronicle's re-exports of the rules core: a moved file imports the core itself, so it stays inside the package. */
const SHIMS = new Map([
  ["modules/wodx-chronicle/scripts/terms.mjs", "modules/wodx-rules/core/terms.mjs"],
  ["modules/wodx-chronicle/scripts/calendar-math.mjs", "modules/wodx-rules/core/calendar-math.mjs"],
  ["modules/wodx-chronicle/scripts/calendar.mjs", "modules/wodx-rules/core/calendar.mjs"]
]);
const specFrom = (fromFile, toRel) => {
  let s = posix(path.relative(path.dirname(fromFile), abs(toRel)));
  return s.startsWith(".") ? s : `./${s}`;
};

const edits = [];
const outsideNeeded = new Set();
for ( const f of code ) {
  const r = rel(f);
  const src = fs.readFileSync(f, "utf8");
  const isMoved = moves.has(r);
  const newFile = abs(newPathOf(r));
  let out = src;
  if ( /\.m?js$/.test(f) ) {
    out = out.replace(SPEC, (all, pre, spec, post) => {
      const target = rel(path.resolve(path.dirname(f), spec));
      if ( !isMoved && !moves.has(target) ) return all;
      const dest = isMoved && SHIMS.has(target) ? SHIMS.get(target) : newPathOf(target);
      if ( isMoved && !dest.startsWith("modules/wodx-rules/") && fs.existsSync(abs(dest)) ) outsideNeeded.add(dest);
      return `${pre}${specFrom(newFile, dest)}${post}`;
    });
    // paths built from a const that names the module: `/modules/${MOD}/scripts/x-rules.mjs`
    const consts = new Map([...out.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*["'](wodx-[a-z-]+)["']/g)].map(m => [m[1], m[2]]));
    out = out.replace(/\/modules\/\$\{([A-Za-z_$][\w$]*)\}\/((?:scripts|data)\/[\w./-]+?\.m?js)/g, (all, name, tail) => {
      const old = `modules/${consts.get(name)}/${tail}`;
      return moves.has(old) ? `/${moves.get(old)}` : all;
    });
  }
  // paths written as text
  for ( const [o, n] of moves ) {
    // with or without the modules/ in front ("wodx-npc/scripts/x-rules.mjs" too)
    const oldTail = o.replace(/^modules\//, ""), newTail = n.replace(/^modules\//, "");
    out = out.split(oldTail).join(newTail);
  }
  if ( out !== src ) edits.push([f, out]);
}

console.log(`${mod}: ${moves.size} file(s) to move, ${edits.length} file(s) to rewrite${hold.size ? `, holding ${[...hold].join(", ")}` : ""}.`);
for ( const [o, n] of moves ) console.log(`  ${o} -> ${n}`);
if ( outsideNeeded.size ) console.log(`Outside files the moved files import (${outsideNeeded.size}):`, [...outsideNeeded].sort());
if ( dry ) process.exit(0);

// write the rewrites at the old paths first, then move, so git sees a rename with the edits
for ( const [f, out] of edits ) fs.writeFileSync(f, out);
fs.mkdirSync(abs(`modules/wodx-rules/${short}`), {recursive: true});
for ( const [o, n] of moves ) execFileSync("git", ["mv", o, n], {cwd: ROOT});

// the baseline: moved files off notMoved, the outside files they need on outside
const text = fs.readFileSync(BASELINE, "utf8");
const b = JSON.parse(text);
b.notMoved = b.notMoved.filter(r => !moves.has(r));
b.outside = [...new Set([...b.outside, ...outsideNeeded])].filter(r => !r.startsWith("modules/wodx-rules/")).sort();
const lines = ["{"];
const keys = Object.keys(b);
keys.forEach((k, i) => {
  const v = b[k], end = i < keys.length - 1 ? "," : "";
  if ( !Array.isArray(v) ) lines.push(`  ${JSON.stringify(k)}: ${JSON.stringify(v)}${end}`);
  else if ( !v.length ) lines.push(`  ${JSON.stringify(k)}: []${end}`);
  else { lines.push(`  ${JSON.stringify(k)}: [`); v.forEach((x, j) => lines.push(`    ${JSON.stringify(x)}${j < v.length - 1 ? "," : ""}`)); lines.push(`  ]${end}`); }
});
lines.push("}");
fs.writeFileSync(BASELINE, lines.join("\n") + "\n");
console.log("Done. Now run the harness: cd tools/harness && node --test *.test.mjs");
