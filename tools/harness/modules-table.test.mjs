/* The module table in docs/MODULES.md: one row per WoDX module, its version as in module.json, and a short cell.
 * Release notes go in each module's CHANGELOG.md, newest first, so the table stays readable. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const table = fs.readFileSync(path.join(ROOT, "docs/MODULES.md"), "utf8");
const rows = new Map();
for ( const line of table.split(/\r?\n/) ) {
  const m = /^\| (wodx-[a-z]+) \| ([^|]*) \| ([^|]*) \| ([^|]*) \|$/.exec(line);
  if ( m ) rows.set(m[1], {version: m[2].trim(), what: m[3].trim(), enable: m[4].trim()});
}
const modules = fs.readdirSync(path.join(ROOT, "modules")).filter(d => fs.existsSync(path.join(ROOT, "modules", d, "module.json")));

test("every WoDX module has one row in the module table", () => {
  assert.deepEqual([...rows.keys()].sort(), modules.sort());
});

test("each row's version is the one in its module.json", () => {
  for ( const mod of modules ) {
    const v = JSON.parse(fs.readFileSync(path.join(ROOT, "modules", mod, "module.json"), "utf8")).version;
    assert.equal(rows.get(mod)?.version, v, `${mod}: docs/MODULES.md says ${rows.get(mod)?.version}, module.json says ${v}`);
  }
});

test("each module keeps a changelog and the table cells stay short", () => {
  for ( const mod of modules ) {
    assert.ok(fs.existsSync(path.join(ROOT, "modules", mod, "CHANGELOG.md")), `${mod} has no CHANGELOG.md`);
    const r = rows.get(mod);
    assert.ok(r.what.length <= 300, `${mod}: the "What it does" cell is ${r.what.length} characters; put release notes in modules/${mod}/CHANGELOG.md`);
    assert.ok(r.enable.length <= 200, `${mod}: the "Enable in" cell is ${r.enable.length} characters; deploy notes go in the release log`);
  }
});
