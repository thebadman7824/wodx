/* Shared folder limits (B3950-B3953): the daily file count and the weekly sweep of gates/ and jobs/, on a made-up folder. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";
import * as S from "../storage/files.mjs";

const hasZip = (() => { try { execFileSync("zip", ["-v"]); execFileSync("unzip", ["-v"]); return true; } catch { return false; } })();

const make = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "wodx-shared-"));
  const put = (rel, text = "x", ageDays = 0) => {
    const p = path.join(d, rel);
    fs.mkdirSync(path.dirname(p), {recursive: true});
    fs.writeFileSync(p, text);
    const t = new Date(Date.now() - ageDays * 86400000);
    fs.utimesSync(p, t, t);
  };
  return {d, put};
};

test("count totals by folder, flags picture sets and page-per-file books, and warns at the line", () => {
  const {d, put} = make();
  for ( let i = 0; i < 12; i++ ) put(`maps/set/a${i}.webp`);
  for ( let i = 1; i <= 3; i++ ) put(`book-text/b/x/p000${i}.txt`);
  put("book-text/b/y.txt"); put("notes/n.md"); put("top.md");
  const c = S.count(d, {pics: 10});
  assert.equal(c.total, 18);
  assert.deepEqual(c.top, {maps: 12, "book-text": 4, notes: 1, "(top level)": 1});
  assert.deepEqual(c.picDirs, [{dir: path.join("maps", "set"), images: 12}]);
  assert.deepEqual(c.pageDirs, [{dir: path.join("book-text", "b", "x"), pages: 3}]);
  assert.equal(S.summary(c, {warn: 20}).level, "OK");
  assert.equal(S.summary(c, {warn: 18}).level, "WARNING");
  assert.equal(S.summary(c, {warn: 10, limit: 18}).level, "FULL");
  assert.match(S.summary(c, {warn: 18}).text, /WARNING, 18 of 18 files|WARNING, 18 of 50000 files/);
});

test("the count command exits 3 at the warning line and writes its report", () => {
  const {d, put} = make();
  put("registry/file-count.md", "old"); put("a/b.md");
  const run = warn => { try { execFileSync(process.execPath, [path.join(import.meta.dirname, "../storage/files.mjs"), "count", "--root", d, "--warn", String(warn)]); return 0; } catch (e) { return e.status; } };
  assert.equal(run(10), 0);
  assert.equal(run(2), 3);
  assert.match(fs.readFileSync(path.join(d, "registry/file-count.md"), "utf8"), /WARNING, 2 of 50000/);
});

test("sweep zips only old gate and job files, keeps open jobs, and removes nothing until the zip checks out", {skip: !hasZip && "zip and unzip are not installed here"}, () => {
  const {d, put} = make();
  put("gates/old-results.md", "pass", 9); put("gates/run1/log.txt", "log", 10); put("gates/new.md", "today", 1);
  put("jobs/done-job.md", "# job\nfinished", 8); put("jobs/open-job.md", "# job\nStatus: open\n", 20); put("jobs/standing.md", "x", 30);
  put("notes/old.md", "not swept", 40);
  const list = S.sweepList(d, {days: 7, keep: /standing/});
  assert.deepEqual(list, ["gates/old-results.md", "gates/run1/log.txt", "jobs/done-job.md"].map(f => f.split("/").join(path.sep)));
  const r = S.sweep(d, list, {date: "2026-11-21"});
  assert.equal(r.removed, 3);
  assert.equal(path.basename(r.zip), "sweep-2026-11-21.zip");
  assert.equal(fs.existsSync(path.join(d, "gates/old-results.md")), false);
  assert.equal(fs.existsSync(path.join(d, "gates/run1")), false, "an emptied folder goes too");
  assert.equal(fs.existsSync(path.join(d, "gates")), true, "the swept folder itself stays");
  for ( const f of ["gates/new.md", "jobs/open-job.md", "jobs/standing.md", "notes/old.md"] ) assert.ok(fs.existsSync(path.join(d, f)), f);
  const inZip = execFileSync("unzip", ["-p", r.zip, "jobs/done-job.md"]).toString();
  assert.equal(inZip, "# job\nfinished", "the zip holds the text");
  assert.deepEqual(S.sweep(d, []), {zip: null, removed: 0});
});
