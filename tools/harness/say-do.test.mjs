// Say or Do Desk (B5823-B5825): pure rules for sentences, buildings and project complications.
import test from "node:test";
import assert from "node:assert/strict";
import * as LP from "../../modules/wodx-chronicle/scripts/law-punish-rules.mjs";
import * as PR from "../../modules/wodx-storyteller/scripts/projects-rules.mjs";
import * as TR from "../../modules/wodx-storyteller/scripts/town-rules.mjs";

test("B5823: a fine is a month's modest living at weight 3, scaled and bounded", () => {
  assert.equal(LP.fineAmount(100, 3), 100);
  assert.equal(LP.fineAmount(100, 9), 300);
  assert.equal(LP.fineAmount(100, 0), 50);
  assert.equal(LP.fineAmount(0, 3), 1);
});

test("B5824: raising and restoring a building lift the town", () => {
  const b = TR.powerEvent("build", "t1"), r = TR.powerEvent("restore", "t1", {label: "The chapel"});
  assert.ok(b.prosperity > 0 && r.prosperity > 0);
  assert.match(r.text, /^The chapel: /);
});

test("B5825: every complication does something to the work", () => {
  const keys = new Set(Object.values(PR.TROUBLE).flat().map(r => r.key));
  for ( const k of keys ) {
    const d = PR.TROUBLE_DOES[k];
    assert.ok(d && (d.delay || d.setback || d.cost || d.rumour), `complication ${k} has no effect`);
  }
  const t = PR.troubleTask({next: 100, total: 3}, {delay: 2, setback: 5}, 10);
  assert.deepEqual([t.next, t.total], [120, 0]);
  assert.deepEqual(PR.troubleDoes("nothing-like-it"), {delay: 2});
});

test("B5990: time away is served in the year it ends", () => {
  assert.equal(LP.servedBy({until: 1205}, 1204), false);
  assert.equal(LP.servedBy({until: 1205}, 1205), true);
  assert.equal(LP.servedBy({}, 1300), false);
});
