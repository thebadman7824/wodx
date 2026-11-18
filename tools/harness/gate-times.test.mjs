/* B7390: the TIMES line run-gate.mjs adds to a report is read by gate-times.mjs and ignored by every report parser. */
import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import {parseTimes, timeTable} from "../pcq/gate-times.mjs";
import {failingGates, gatePassed, gateDigest} from "../pcq/jobs.mjs";

const report = [
  "==== 2026-11-18T09:30:06.521Z 3 gate(s)",
  "gate6b: 18/18 passed [20 setting(s) put back]",
  "gate7d: 9/10 passed; failed: 4. Suggest",
  "  FAIL {\"name\":\"4. Suggest\",\"pass\":false}",
  "gatetime: 8/8 passed",
  "  TIMES gate6b=12 gate7d=41 gatetime=7",
  "exit 1 on lane 2",
].join("\n");

test("parseTimes reads each gate's seconds, across lanes", () => {
  assert.deepEqual(parseTimes(report), {gate6b: [12], gate7d: [41], gatetime: [7]});
  const two = `${report}\n  TIMES gate6b=20`;
  assert.deepEqual(parseTimes(two).gate6b, [12, 20]);
  assert.deepEqual(parseTimes("gate6b: 18/18 passed"), {});
});

test("timeTable lists the slowest first", () => {
  const rows = timeTable({gatea: [5, 7, 9], gateb: [30], gatec: [1, 3]});
  assert.deepEqual(rows.map(r => [r.gate, r.median, r.max, r.runs]), [["gateb", 30, 30, 1], ["gatea", 7, 9, 3], ["gatec", 2, 3, 2]]);
});

test("the TIMES line changes no gate result", () => {
  const without = report.split("\n").filter(l => !/TIMES/.test(l)).join("\n");
  assert.deepEqual(failingGates(report), failingGates(without));
  assert.deepEqual(failingGates(report), ["gate7d"]);
  for ( const g of ["gate6b", "gate7d", "gatetime"] ) assert.equal(gatePassed(g, report), gatePassed(g, without));
  assert.equal(gateDigest([{text: report}]), gateDigest([{text: without}]));
});

test("run-gate.mjs writes the TIMES line indented, before the exit line", () => {
  const src = fs.readFileSync(new URL("../lanes/run-gate.mjs", import.meta.url), "utf8");
  assert.match(src, /`  TIMES \$\{times\.join\(" "\)\}`/);
  assert.ok(src.indexOf("reportTimes();\nreport(`exit") > 0);
});
