import "./win-paths.mjs";
// Sheet speed fixes: the fork's after-save recompute writes only what changed, runs on one client, and the system
// skips its own Core tab when WoDX Sheets draws one.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { systemChanges } from "../../system/worldofdarkness/module/scripts/wodx-save.js";

const SYS = "../../system/worldofdarkness/";
const read = p => fs.readFileSync(new URL(p, import.meta.url), "utf8");

test("systemChanges returns only changed leaves as dotted keys", () => {
  const before = { settings: { isupdated: false, variant: "" }, attributes: { strength: { value: 2, total: 2 } }, list: [1, 2] };
  const after = { settings: { isupdated: true, variant: "" }, attributes: { strength: { value: 2, total: 3 } }, list: [1, 2] };
  assert.deepEqual(systemChanges(before, after), { "system.settings.isupdated": true, "system.attributes.strength.total": 3 });
});

test("systemChanges treats arrays as one value and adds new branches whole", () => {
  assert.deepEqual(systemChanges({ a: [1] }, { a: [1, 2], b: { c: 1 } }), { "system.a": [1, 2], "system.b": { c: 1 } });
  assert.deepEqual(systemChanges({ a: { b: 1 } }, { a: { b: 1 } }), {});
  assert.deepEqual(systemChanges({ a: null }, { a: { b: 1 } }), { "system.a": { b: 1 } });
});

test("the after-save recompute runs only on the client that made the change and writes changes only", () => {
  const src = read(SYS + "module/actor/data/wod-actor-base.js");
  assert.match(src, /if \(user !== game\.user\.id\) return;/);
  assert.match(src, /if \(userId !== game\.user\.id\) return;/);
  assert.doesNotMatch(src, /await actor\.update\(updateData\)/);
  assert.doesNotMatch(src, /await this\.update\(actorData\)/);
});

test("no sheet prints the whole actor to the console on each redraw", () => {
  for (const f of ["mortal-actor-sheet.js", "pc-actor-sheet.js"]) assert.doesNotMatch(read(SYS + "module/actor/template/" + f), /^\s*console\.log\(data\.actor\);/m);
});

test("every line sheet skips its own Core tab when WoDX Sheets draws one", () => {
  const dir = new URL(SYS + "templates/actor/", import.meta.url);
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith("-sheet.html"))) {
    const t = fs.readFileSync(new URL(f, dir), "utf8");
    const cores = (t.match(/class="tab core/g) ?? []).length;
    assert.ok(cores >= 1, f);
    assert.equal((t.match(/\{\{#unless wodxCore\}\}/g) ?? []).length, cores, f);
  }
  assert.match(read("../../modules/wodx-sheets/scripts/main.mjs"), /data\.wodxCore = true;/);
});
