import test from "node:test";
import assert from "node:assert/strict";
import {openFindings, closedBy} from "../audit/findings.mjs";

const ctx = {inRef: s => s === "abc1234", landed: n => n >= 6740 && n <= 6748, tracked: f => f === "kept.png", rulings: {"group-traits": {pick: "Keep as story cards"}, "w1-2": {pick: "Keep"}}};

test("a fix note with no commit on main leaves the finding open", () => {
  assert.equal(closedBy({verdict: "broken", fix: "describe only"}, ctx), "");
  assert.equal(closedBy({verdict: "broken", fix: "B1 (deadbee)"}, ctx), "");
  assert.match(closedBy({verdict: "broken", fix: "B1 (abc1234)"}, ctx), /fix abc1234/);
  assert.match(closedBy({verdict: "broken", fix: "fixed (B6744)"}, ctx), /fix B6744/);
  assert.equal(closedBy({verdict: "broken", fix: "fixed (B6750)"}, ctx), "");
});
test("a dead file closes only once it is gone", () => {
  assert.equal(closedBy({verdict: "dead", file: "kept.png"}, ctx), "");
  assert.equal(closedBy({verdict: "dead", file: "gone.png"}, ctx), "deleted");
});
test("a desk ruling closes an item or its group", () => {
  assert.match(closedBy({verdict: "only-tells", id: "w1-2"}, ctx), /ruling/);
  assert.match(closedBy({verdict: "only-tells", id: "w3-9", group: "traits"}, ctx), /ruling/);
  const open = openFindings([{verdict: "working"}, {verdict: "only-tells", id: "w9-1"}, {verdict: "broken", fix: "abc1234"}], ctx);
  assert.deepEqual(open.map(o => o.id), ["w9-1"]);
});
test("a re-check record closes a finding only with a commit on main and a test", () => {
  const items = [{verdict: "broken", id: "w1-5", fix: "gone1234"}, {closes: "w1-5", commit: "abc1234", test: "gatex step 3"},
    {verdict: "broken", id: "w1-6"}, {closes: "w1-6", commit: "abc1234"}, {verdict: "broken", id: "w1-7"}, {closes: "w1-7", commit: "nothere1", test: "t"}];
  assert.deepEqual(openFindings(items, ctx).map(o => o.id), ["w1-6", "w1-7"]);
});
