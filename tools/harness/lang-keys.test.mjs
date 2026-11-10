/* Every fixed language key the system fork and the WoDX modules ask for exists in the system's en.json,
 * so no window shows a raw key. Keys built at run time (ending in ".") are left out. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync, statSync} from "node:fs";
import {join, dirname} from "node:path";
import {fileURLToPath} from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const sys = join(root, "system/worldofdarkness");
const flat = new Set();
(function f(o, p) { for ( const [k, v] of Object.entries(o) ) { const q = p ? `${p}.${k}` : k; if ( v && typeof v === "object" ) f(v, q); else flat.add(q); } })(JSON.parse(readFileSync(join(sys, "lang/en.json"), "utf8")), "");
const walk = d => readdirSync(d).flatMap(f => {
  const p = join(d, f);
  if ( ["lib", "packs", "node_modules", "lang"].includes(f) ) return [];
  return statSync(p).isDirectory() ? walk(p) : /\.(m?js|hbs|html)$/.test(f) ? [p] : [];
});

test("language keys used by the system and the modules exist in en.json", () => {
  const missing = new Set();
  for ( const f of [...walk(sys), ...walk(join(root, "modules"))] ) {
    for ( const m of readFileSync(f, "utf8").matchAll(/(?:localize|i18n\.format)\s*\(?\s*["'](wod\.[A-Za-z0-9_.]+)["'](?!\s*\+)/g) )
      if ( !m[1].endsWith(".") && !flat.has(m[1]) ) missing.add(`${m[1]} (${f.slice(root.length + 1)})`);
  }
  assert.deepEqual([...missing], []);
});
