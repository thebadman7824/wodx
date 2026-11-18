/* One priority order for every project process (B7350-B7359): registry/priorities.json and tools/pcq/prio.mjs. */
import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import * as prio from "../pcq/prio.mjs";

const p = prio.load();
const HOUR = 3600e3;
const SCRIPT = fileURLToPath(new URL("../pcq/prio.mjs", import.meta.url));

test("the priorities file is well formed", () => {
  assert.deepEqual(prio.check(p), []);
});

test("check finds a broken file", () => {
  const bad = structuredClone(p);
  bad.classes["pr-gates"] = "R9";
  bad.ranks[1].yieldsTo = ["R3"];
  bad.threads[1].order = 5;
  bad.windows.planned = [{pc: "NOPE", from: "2026-11-21T17:00:00Z", to: "2026-11-21T15:00:00Z"}];
  const out = prio.check(bad).join("\n");
  for ( const s of ["no rank R9", "R1: yields to R3", "threads: order", "unknown pc NOPE", "from must be a time before to"] ) assert.match(out, new RegExp(s));
});

test("the ranks follow the owner's desk picks: train front, unblock, PR gates, health, side work", () => {
  assert.deepEqual(p.ranks.map(r => r.id), ["R0", "R1", "R2", "R3", "R4", "R5"]);
  assert.equal(prio.rankOf(p, "train-front"), "R1");
  assert.equal(prio.rankOf(p, "branch-tools"), "R2");
  assert.equal(prio.rankOf(p, "urgent"), "R2");
  assert.equal(prio.rankOf(p, "pr-gates"), "R3");
  assert.equal(prio.rankOf(p, "health"), "R4");
  assert.equal(prio.rankOf(p, "lookup"), "R5");
  assert.equal(prio.rankOf(p, "nonsense"), "R3", "an unknown class is treated as PR gates");
});

test("classOf works a job's class out from the job and its pull request", () => {
  assert.equal(prio.classOf(p, {kind: "gates", touched: true, ref: "abc1234"}, {front: true}), "train-front");
  assert.equal(prio.classOf(p, {kind: "gates", gates: ["gatex"], branchTools: true, ref: "claude/x"}), "branch-tools");
  assert.equal(prio.classOf(p, {kind: "gates", touched: true}, {labels: ["urgent"]}), "urgent");
  assert.equal(prio.classOf(p, {kind: "gates", touched: true}), "pr-gates");
  assert.equal(prio.classOf(p, {kind: "gates", all: true, ref: "4c48c153"}), "health");
  assert.equal(prio.classOf(p, {kind: "gates", all: true, ref: "claude/x"}), "hand", "a full run of a branch is not a health run");
  assert.equal(prio.classOf(p, {kind: "books-find"}), "lookup");
  assert.equal(prio.classOf(p, {kind: "gates", class: "health", gates: ["gatex"]}), "health", "a job may name its class");
});

test("aging works inside a rank only: a nightly run never climbs past PR gates (desk pick p4)", () => {
  const nightly = {number: 10, job: {kind: "gates", all: true, ref: "main", prio: 3}, waitedMs: 20 * HOUR};
  const pr = {number: 20, job: {kind: "gates", touched: true, prio: 3}, waitedMs: 0};
  const front = {number: 30, job: {kind: "gates", touched: true, prio: 3}, waitedMs: 0, ctx: {front: true}};
  assert.deepEqual(prio.sortQueue(p, [nightly, pr, front]).map(e => e.number), [30, 20, 10]);
  const oldPr = {number: 5, job: {kind: "gates", touched: true, prio: 5}, waitedMs: 3 * HOUR};
  const newPr = {number: 6, job: {kind: "gates", touched: true, prio: 3}, waitedMs: 0};
  assert.deepEqual(prio.sortQueue(p, [newPr, oldPr]).map(e => e.number), [5, 6], "a p5 job that waited 3 hours reaches p2 and goes first inside its rank");
});

test("a lower rank hands over to a higher one, never the other way", () => {
  assert.equal(prio.mayKeep(p, "R4", "R3"), false);
  assert.equal(prio.mayKeep(p, "R3", "R1"), false);
  assert.equal(prio.mayKeep(p, "R1", "R3"), true);
  assert.equal(prio.mayKeep(p, "R0", "R1"), true);
  assert.equal(p.preempt.mode, "gate-boundary");
});

test("planned windows hold a PC from 30 minutes before to the end (desk pick p7)", () => {
  const q = structuredClone(p);
  q.windows.planned = [{pc: "BENJAMIN-PC", from: "2026-11-21T15:00:00Z", to: "2026-11-21T17:00:00Z", why: "RAM install"}];
  const at = s => Date.parse(s);
  assert.equal(prio.activeWindow(q, "BENJAMIN-PC", at("2026-11-21T14:20:00Z")), null);
  assert.ok(prio.activeWindow(q, "benjamin-pc", at("2026-11-21T14:31:00Z")));
  assert.ok(prio.activeWindow(q, "BENJAMIN-PC", at("2026-11-21T16:59:00Z")));
  assert.equal(prio.activeWindow(q, "BENJAMIN-PC", at("2026-11-21T17:00:00Z")), null);
  assert.equal(prio.activeWindow(q, "DESKTOP-MRKCMRG", at("2026-11-21T16:00:00Z")), null, "a window holds only its own PC");
});

test("the train clock stops while held, off or in a window (desk pick p5)", () => {
  assert.equal(prio.trainClockRuns(p, {}), true);
  for ( const k of ["hold", "off", "window"] ) assert.equal(prio.trainClockRuns(p, {[k]: true}), false, k);
});

test("ask: the OCR leads on the Secondary PC, art fits its budget on the Main PC (desk pick p2)", () => {
  const ocr = prio.ask(p, {cls: "ocr", pc: "BENJAMIN-PC"});
  assert.equal(ocr.go, true); assert.equal(ocr.ramGb, 12.5);
  assert.equal(prio.ask(p, {cls: "art", pc: "DESKTOP-MRKCMRG", freeGb: 20}).go, true);
  assert.equal(prio.ask(p, {cls: "art", pc: "DESKTOP-MRKCMRG", freeGb: 4}).go, false);
  assert.equal(prio.ask(p, {cls: "ocr", pc: "DESKTOP-MRKCMRG"}).go, false, "OCR is not a Main PC job");
  assert.equal(prio.ask(p, {cls: "ocr", pc: "SOMEWHERE"}).go, false);
  const q = structuredClone(p);
  q.windows.planned = [{pc: "BENJAMIN-PC", from: "2026-11-21T15:00:00Z", to: "2026-11-21T17:00:00Z", why: "RAM install"}];
  assert.equal(prio.ask(q, {cls: "ocr", pc: "BENJAMIN-PC", now: Date.parse("2026-11-21T15:30:00Z")}).go, false, "even the lead waits in a window");
});

test("claims of live processes count toward reserved memory; dead ones are dropped", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prio-"));
  prio.writeClaim(dir, {class: "ocr", pid: process.pid, ramGb: 6, since: "x"});
  prio.writeClaim(dir, {class: "art", pid: 2 ** 30, ramGb: 8, since: "x"});
  assert.equal(prio.reservedGb(dir), 6);
  assert.equal(fs.readdirSync(dir).length, 1, "the dead process's claim file is removed");
  prio.dropClaim(dir, "ocr", process.pid);
  assert.equal(prio.reservedGb(dir), 0);
  fs.rmSync(dir, {recursive: true, force: true});
});

test("the command line answers check, rank, ask and threads", () => {
  const run = (...a) => spawnSync(process.execPath, [SCRIPT, ...a], {encoding: "utf8"});
  assert.equal(run("check").status, 0);
  assert.equal(run("rank", "health").stdout.trim(), "R4");
  const a = run("ask", "--class", "ocr", "--pc", "BENJAMIN-PC");
  assert.equal(a.status, 0); assert.equal(JSON.parse(a.stdout).go, true);
  assert.equal(run("ask", "--class", "art", "--pc", "DESKTOP-MRKCMRG", "--free-gb", "2").status, 3);
  assert.match(run("threads").stdout, /^1\. Gate and runner fixes/);
  assert.equal(run("nope").status, 2);
});
