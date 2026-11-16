import test from "node:test";
import assert from "node:assert/strict";
import {openFindings, closedBy} from "../audit/findings.mjs";

const ctx = {inRef: s => s === "abc1234", tracked: f => f === "kept.png", rulings: {"group-traits": {pick: "Keep as story cards"}, "w1-2": {pick: "Keep"}}};

test("a fix note with no commit on main leaves the finding open", () => {
  assert.equal(closedBy({verdict: "broken", fix: "describe only"}, ctx), "");
  assert.equal(closedBy({verdict: "broken", fix: "B1 (deadbee)"}, ctx), "");
  assert.match(closedBy({verdict: "broken", fix: "B1 (abc1234)"}, ctx), /fix abc1234/);
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
