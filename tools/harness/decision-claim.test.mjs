/* Decision-number blocks (B3082): a claim starts above everything already used or claimed, on a multiple of ten,
 * and a thread asking again gets its own block back. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {highest, nextStart} from "../decisions/claim.mjs";

const CLAIM = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../decisions/claim.mjs");

test("the highest number reads rows, headings and the next free line", () => {
  assert.equal(highest("Next free block: B3060\n| B3040-B3059 | x | y |\n## B3050. z"), 3059);
  assert.equal(highest("## B3071. late"), 3071);
  assert.equal(nextStart(3059), 3060);
  assert.equal(nextStart(3071), 3080);
  assert.equal(nextStart(3060), 3070);
});

test("claims go above the registry and the repo, and repeat for the same thread", () => {
  const reg = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "wodx-reg-")), "blocks.json");
  fs.writeFileSync(reg, JSON.stringify({claims: [{lo: 900000, hi: 900009, thread: "t0", feature: "old", at: "x"}]}));
  const run = (...a) => execFileSync(process.execPath, [CLAIM, "--registry", reg, "--no-scan", ...a], {encoding: "utf8"});
  assert.match(run("--thread", "t1", "--feature", "one"), /Claimed: B900010-B900019/);
  assert.match(run("--thread", "t2", "--feature", "two", "--size", "25"), /Claimed: B900020-B900049/);
  assert.match(run("--thread", "t1", "--feature", "one"), /Already claimed: B900010-B900019/);
  assert.match(run("--who", "B900033"), /B900020-B900049 t2 two/);
  assert.equal(JSON.parse(fs.readFileSync(reg, "utf8")).claims.length, 3);
  assert.ok(!fs.existsSync(`${reg}.lock`), "the lock is let go");
});
