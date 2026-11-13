/* The parallel GitHub check runs every harness file exactly once (shard.mjs). */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {testFiles, loadTimes, shards, docsFiles} from "./shard.mjs";

test("every test file lands in exactly one shard", () => {
  const files = testFiles();
  for (const n of [1, 3, 5, 6]) {
    const all = shards(files, loadTimes(), n).flatMap(b => b.files);
    assert.equal(all.length, files.length, `${n} shards`);
    assert.deepEqual([...all].sort(), files, `${n} shards`);
  }
});

test("shards balance by recorded time and place unknown files", () => {
  const bins = shards(["a", "b", "c", "d", "new"], {a: 100, b: 60, c: 40, d: 10}, 2);
  assert.deepEqual(bins.map(b => b.ms).sort((x, y) => x - y), [130, 140]);
  assert.ok(bins.some(b => b.files.includes("new")));
});

test("the docs-only run keeps the tests that read docs", () => {
  const d = docsFiles();
  for (const f of ["decisions-index.test.mjs", "modules-table.test.mjs", "versions-agree.test.mjs", "path-case.test.mjs"]) assert.ok(d.includes(f), f);
});

test("the check runs the harness through shard.mjs with a set shard count", () => {
  const yml = readFileSync(new URL("../../.github/workflows/checks.yml", import.meta.url), "utf8");
  const total = Number(yml.match(/SHARDS: "(\d+)"/)?.[1]);
  assert.ok(total >= 2 && total <= 8, "SHARDS between 2 and 8");
  assert.match(yml, /node shard\.mjs "\$SHARD" "\$SHARDS"/);
  assert.match(yml, /--test-concurrency=1/);
  assert.match(yml, /needs: \[changes, quality, harness\]/);
});
