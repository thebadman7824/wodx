import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readdirSync, readFileSync, statSync} from "node:fs";

// B6810: Foundry's own icons/svg pictures that WoDX may name. Each was fetched on the testbed by gateicons (all served).
// possession, hammer, claw, tombstone and jar are not in Foundry 14 and showed as broken pictures. To add an icon,
// check it is in Foundry's public/icons/svg, add it here and run gateicons.
const SERVED = new Set(["angel","aura","biohazard","blind","blood","bones","book","cancel","clockwork","d10-grey","d20-highlight","daze","degen","door-exit","downgrade","explosion","eye","falling","fire","frozen","hazard","holy-shield","invisible","item-bag","lightning","mystery-man","net","padlock","pawprint","poison","portal","regen","shield","skull","sleep","sound","statue","stone-path","stoned","sun","sword","tankard","target","terror","unconscious","waterfall","windmill","wing"]);

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
function* files(dir) {
  for ( const n of readdirSync(dir) ) {
    if ( n === "node_modules" || n.startsWith(".") ) continue;
    const p = join(dir, n);
    if ( statSync(p).isDirectory() ) yield* files(p);
    else if ( /\.(m?js|json|hbs|html|css)$/.test(n) ) yield p;
  }
}

test("every Foundry core icon WoDX names is one Foundry serves", () => {
  const bad = [];
  for ( const top of ["modules", "system"] ) {
    for ( const f of files(join(root, top)) ) {
      for ( const m of readFileSync(f, "utf8").matchAll(/icons\/svg\/([a-z0-9_-]+)\.svg/g) ) {
        if ( !SERVED.has(m[1]) ) bad.push(`${f.slice(root.length + 1)}: ${m[0]}`);
      }
    }
  }
  assert.deepEqual(bad, []);
});
