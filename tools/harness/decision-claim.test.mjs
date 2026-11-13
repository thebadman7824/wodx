/* Decision-number blocks (B3082): a claim starts above everything already used or claimed, on a multiple of ten,
 * and a thread asking again gets its own block back. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync, spawn} from "node:child_process";
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
  const run = (...a) => execFileSync(process.execPath, [CLAIM, "--registry", reg, "--no-scan", ...a], {encoding: "utf8", env: {...process.env, WODX_CLAIM_SETTLE_MS: "0"}});
  assert.match(run("--thread", "t1", "--feature", "one"), /Claimed: B900010-B900019/);
  assert.match(run("--thread", "t2", "--feature", "two", "--size", "25"), /Claimed: B900020-B900049/);
  assert.match(run("--thread", "t1", "--feature", "one"), /Already claimed: B900010-B900019/);
  assert.match(run("--who", "B900033"), /B900020-B900049 t2 two/);
  assert.equal(JSON.parse(fs.readFileSync(reg, "utf8")).claims.length, 3);
  assert.ok(!fs.existsSync(`${reg}.lock`), "the lock is let go");
});

test("a claim lost from the JSON to another write still counts, and a block taken first is given up", () => {
  const reg = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "wodx-reg-")), "blocks.json");
  const run = (...a) => execFileSync(process.execPath, [CLAIM, "--registry", reg, "--no-scan", ...a], {encoding: "utf8", env: {...process.env, WODX_CLAIM_SETTLE_MS: "0"}});
  fs.writeFileSync(reg, JSON.stringify({claims: [{lo: 800000, hi: 800009, thread: "t0", feature: "old", at: "2026-01-01T00:00:00.000Z"}]}));
  assert.match(run("--thread", "a", "--feature", "one"), /Claimed: B800010-B800019/);
  fs.writeFileSync(reg, JSON.stringify({claims: [{lo: 800000, hi: 800009, thread: "t0", feature: "old", at: "2026-01-01T00:00:00.000Z"}]})); // another session's save
  assert.match(run("--list"), /B800010-B800019 .* a {2}one/, "the claim's own file keeps it");
  assert.match(run("--thread", "b", "--feature", "two"), /Claimed: B800020-B800029/, "the next claim goes above it");
  // Two claims of one block (the race): both are listed, the earlier keeps it, and the next claim goes above both.
  fs.writeFileSync(path.join(`${reg}.d`, "rival.json"), JSON.stringify({lo: 800030, hi: 800039, thread: "x", feature: "rival", at: "2026-01-01T00:00:01.000Z"}));
  fs.writeFileSync(path.join(`${reg}.d`, "rival2.json"), JSON.stringify({lo: 800030, hi: 800039, thread: "y", feature: "rival2", at: "2026-01-01T00:00:02.000Z"}));
  assert.match(run("--thread", "c", "--feature", "three"), /Claimed: B800040-B800049/);
});

test("a rival that took the same block a moment earlier makes the later claim move up", () => {
  const reg = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "wodx-reg-")), "blocks.json");
  fs.writeFileSync(reg, JSON.stringify({claims: [{lo: 700000, hi: 700009, thread: "t0", feature: "old", at: "2026-01-01T00:00:00.000Z"}]}));
  // Another session writes its claim of B700010 while this one waits to check its own (the race on the network share).
  const rival = JSON.stringify({lo: 700010, hi: 700019, thread: "r", feature: "rival", at: "2026-01-01T00:00:01.000Z"});
  const p = spawn(process.execPath, ["-e", `setTimeout(() => { require("fs").mkdirSync(${JSON.stringify(reg + ".d")}, {recursive: true});
    require("fs").writeFileSync(${JSON.stringify(path.join(reg + ".d", "rival.json"))}, ${JSON.stringify(rival)}); }, 400)`], {detached: false});
  const out = execFileSync(process.execPath, [CLAIM, "--registry", reg, "--no-scan", "--thread", "late", "--feature", "late"],
    {encoding: "utf8", env: {...process.env, WODX_CLAIM_SETTLE_MS: "1500"}});
  p.kill();
  assert.match(out, /B700010-B700019 was taken a moment earlier by r; trying again/);
  assert.match(out, /Claimed: B700020-B700029 for late/);
  const list = execFileSync(process.execPath, [CLAIM, "--registry", reg, "--list"], {encoding: "utf8"});
  assert.doesNotMatch(list, /B700010-B700019 .* late/, "the withdrawn claim is gone");
});
