import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync, readdirSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* B6744: rule.ghoulsDarkAges is a record, not a switch. Creation's ghoul rules take no era, and the hint says so. */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const H = await import(pathToFileURL(join(root, "modules/wodx-chronicle/data/house-rules.mjs")));
const R = await import(pathToFileURL(join(root, "modules/wodx-creation/scripts/rules.mjs")));

test("the ghoul rules are the Dark Ages ones whatever the era, and the switch says off changes nothing", () => {
  const all = JSON.stringify(H);
  const m = all.match(/"id":"ghoulsDarkAges"[^}]*"hint":"([^"]*)"/);
  assert.ok(m, "switch still registered");
  assert.match(m[1], /Off changes nothing/);
  assert.equal(R.ghoulBloodMax(0), 10);
  assert.equal(R.ghoulBloodMax(250), 12);
  // nothing in the modules reads the switch: it stays a record
  const readers = [];
  for ( const mod of readdirSync(join(root, "modules")) ) {
    let files = [];
    try { files = readdirSync(join(root, "modules", mod, "scripts")); } catch (e) { continue; }
    for ( const f of files ) if ( f.endsWith(".mjs") && readFileSync(join(root, "modules", mod, "scripts", f), "utf8").includes("ghoulsDarkAges") ) readers.push(`${mod}/${f}`);
  }
  assert.deepEqual(readers, []);
});
