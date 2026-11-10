/* A WoDX module that loads a file from a sibling module (../../wodx-x/...) finds that file and every name it asks for.
 * The sibling may be off in a world, but it must be installed (docs/MODULES.md). */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync, statSync, existsSync} from "node:fs";
import {join, dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); if ( f === "node_modules" || f === "tests" ) return []; return statSync(p).isDirectory() ? walk(p) : /\.m?js$/.test(f) ? [p] : []; });
const exportsOf = f => {
  const s = readFileSync(f, "utf8"), names = new Set();
  for ( const m of s.matchAll(/export\s+(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/g) ) names.add(m[1]);
  for ( const m of s.matchAll(/export\s*\{([^}]*)\}/g) ) for ( const n of m[1].split(",") ) { const x = n.trim().split(/\s+as\s+/).pop(); if ( x ) names.add(x); }
  if ( /export\s+default/.test(s) ) names.add("default");
  return names;
};

test("files and names loaded from sibling modules exist", () => {
  const bad = [];
  for ( const f of walk(join(root, "modules")) ) {
    for ( const m of readFileSync(f, "utf8").matchAll(/^\s*(?:import|export)\s*(?:\{([^}]*)\}|\*\s+as\s+\w+)\s*from\s*["'](\.\.\/\.\.\/wodx-[^"']+)["']/gm) ) {
      const target = resolve(dirname(f), m[2]);
      if ( !existsSync(target) ) { bad.push(`${f.slice(root.length + 1)}: no ${m[2]}`); continue; }
      const have = exportsOf(target);
      for ( const n of (m[1] ?? "").split(",").map(x => x.trim().split(/\s+as\s+/)[0]).filter(Boolean) )
        if ( !have.has(n) ) bad.push(`${f.slice(root.length + 1)}: ${m[2]} has no ${n}`);
    }
  }
  assert.deepEqual(bad, []);
});
