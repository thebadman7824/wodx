import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync, readdirSync, statSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

// Foundry 14 keeps ApplicationV2 and HandlebarsApplicationMixin under foundry.applications.api, not on the window.
// A module file that uses one must take it from there (or import it); a bare use stops the whole module loading
// (Storyteller 0.43.0, battles.mjs, 12 November 2026).
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const NAMES = ["ApplicationV2", "HandlebarsApplicationMixin", "DialogV2"];

function files(dir, out = []) {
  for ( const f of readdirSync(dir) ) {
    if ( f === "node_modules" ) continue;
    const p = join(dir, f);
    if ( statSync(p).isDirectory() ) files(p, out);
    else if ( /\.(mjs|js)$/.test(f) ) out.push(p);
  }
  return out;
}

test("module files declare the Foundry application classes they use", () => {
  const bad = [];
  for ( const f of files(join(root, "modules")) ) {
    const src = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for ( const name of NAMES ) {
      const bare = new RegExp(`(?<![.\\w])${name}\\b(?!\\s*[:=])`);
      const uses = src.split("\n").some(line => bare.test(line) && !new RegExp(`[{,]\\s*${name}\\b[^}]*\\}\\s*=`).test(line));
      if ( !uses ) continue;
      const declared = new RegExp(`(const|let|var)\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*=|(const|let|var)\\s+${name}\\s*=|import[^;]*\\b${name}\\b|function\\s+${name}\\b|class\\s+${name}\\b`).test(src);
      if ( !declared ) bad.push(`${f.slice(root.length + 1)}: ${name}`);
    }
  }
  assert.deepEqual(bad, []);
});
