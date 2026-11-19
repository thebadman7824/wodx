/* The GPU guard reads its class order from registry/priorities.json (B7510, desk pick p10). */
import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const SCRIPT = fileURLToPath(new URL("../pcq/gpuguard.mjs", import.meta.url));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gpuguard-"));
process.env.GPU_GUARD_DIR = dir;
const G = await import(SCRIPT);

test("the class order is the file's gpu.order", () => {
  const file = JSON.parse(fs.readFileSync(fileURLToPath(new URL("../../registry/priorities.json", import.meta.url)), "utf8"));
  assert.deepEqual(Object.keys(G.RANK), file.gpu.order);
  assert.ok(G.RANK.art < G.RANK.ocr && G.RANK.ocr < G.RANK.local && G.RANK.local < G.RANK.other);
});

test("a missing or broken order falls back to the built-in one", () => {
  for ( const bad of [null, undefined, [], "art", [1, 2]] ) assert.deepEqual(Object.keys(G.rankFrom(bad)), G.DEFAULT_ORDER);
  assert.deepEqual(G.rankFrom(["other", "art"]), {other: 0, art: 1});
});

test("waiters line up by the order, then by arrival; an unknown class goes last", () => {
  const w = path.join(dir, "waiters");
  fs.mkdirSync(w, {recursive: true});
  const me = process.pid; // a live pid, so the guard keeps the files
  const put = (cls, since) => fs.writeFileSync(path.join(w, `${cls}-${since}.json`), JSON.stringify({pid: me, class: cls, since}));
  put("other", "2026-11-18T01:00:00Z"); put("mystery", "2026-11-18T00:00:00Z");
  put("ocr", "2026-11-18T03:00:00Z"); put("art", "2026-11-18T04:00:00Z"); put("ocr", "2026-11-18T02:00:00Z");
  const order = G.state().waiters.map(x => `${x.class}@${x.since.slice(11, 13)}`);
  assert.deepEqual(order, ["art@04", "ocr@02", "ocr@03", "other@01", "mystery@00"]);
  fs.rmSync(w, {recursive: true, force: true});
});

test("the command line takes the ocr class and turns away an unknown one", () => {
  const run = (...a) => spawnSync(process.execPath, [SCRIPT, ...a], {encoding: "utf8", env: {...process.env, GPU_GUARD_DIR: dir}});
  const bad = run("run", "--class", "nope", "--", "node", "-e", "0");
  assert.equal(bad.status, 2); assert.match(bad.stderr, /art\|ocr\|local\|other/);
  assert.equal(run("nope").status, 2);
});

test.after(() => fs.rmSync(dir, {recursive: true, force: true}));
