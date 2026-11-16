import {test} from "node:test";
import assert from "node:assert/strict";
import {verdictsByFile, openFiles, scriptFiles} from "../audit/coverage.mjs";

test("B6899: a file counts as checked only with a real verdict", () => {
  const files = ["modules/a/scripts/u.mjs", "modules/a/scripts/x.mjs", "modules/a/scripts/y.mjs", "modules/a/scripts/z.mjs", "system/worldofdarkness/module/w.js"];
  const items = [
    {file: "modules/a/scripts/x.mjs", verdict: "working"},
    {where: "modules/a/scripts/y.mjs:12", verdict: "not-checked"},
    {where: "system/worldofdarkness/module/w.js:3, modules/a/scripts/q.mjs", verdict: "broken"},
    {file: "modules/a/scripts/u.mjs", verdict: "unreferenced"}
  ];
  const open = openFiles(verdictsByFile(items, files));
  assert.deepEqual(open, [{file: "modules/a/scripts/u.mjs", why: "unreferenced"}, {file: "modules/a/scripts/y.mjs", why: "not-checked"}, {file: "modules/a/scripts/z.mjs", why: "no item"}]);
});

test("B6899: the scope holds module scripts and the system's code", () => {
  const f = scriptFiles();
  assert.ok(f.length > 500 && f.some(x => x.startsWith("system/worldofdarkness/module/")) && f.every(x => /\.m?js$/.test(x)));
});
