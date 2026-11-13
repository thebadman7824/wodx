import { test } from "node:test";
import assert from "node:assert/strict";
import * as I from "../../modules/wodx-interactables/scripts/investigation-rules.mjs";
import * as C from "../../modules/wodx-interactables/scripts/case-rules.mjs";

function board() {
  let b = C.emptyBoard();
  for ( const t of ["A", "B", "C", "D"] ) b = C.addCard(b, {kind: "note", title: t}).board;
  b = C.link(b, "c1", "c2"); b = C.link(b, "c2", "c3"); b = C.link(b, "c3", "c4");
  return b;
}

test("investigation: the board keeps theories and the truth, and players never see the truth", () => {
  let b = board();
  b = {...b, theories: [{id: "t1", who: "The miller", rests: ["l1", "l2", "nope"]}], truth: [I.keyOf("c1", "c2"), "x|y"]};
  const n = C.normalize(b);
  assert.deepEqual(n.theories[0].rests, ["l1", "l2"]);
  assert.deepEqual(n.truth, ["c1|c2"]);
  assert.deepEqual(C.visibleTo(n, false).truth, []);
  assert.deepEqual(C.visibleTo(n, true).truth, ["c1|c2"]);
  // cutting a line drops it from theories and truth
  const cut = C.normalize(C.unlink(n, "l1"));
  assert.deepEqual(cut.theories[0].rests, ["l2"]);
  assert.deepEqual(cut.truth, []);
  assert.deepEqual(C.normalize(null), C.emptyBoard());
});

test("investigation: a test says more with more successes, never which lines", () => {
  const b = board();
  const t = {id: "t1", rests: ["l1", "l2", "l3"]};
  const m = I.measure(t, b.links, ["c1|c2", "c3|c4", "c1|c4"]);
  assert.deepEqual(m, {holds: 2, of: 3, missed: 1});
  assert.match(I.verdict(m, 0), /can't be judged/);
  assert.match(I.verdict(m, 1), /Some of it/);
  assert.match(I.verdict(m, 2), /More than half/);
  assert.match(I.verdict(m, 3), /^2 of the 3 lines it rests on hold up\.$/);
  assert.match(I.verdict(m, 5), /1 more true link/);
  assert.match(I.verdict({holds: 0, of: 2, missed: 0}, 1), /None/);
  assert.match(I.verdict({holds: 0, of: 0, missed: 0}, 3), /rests on no line/);
  assert.equal(I.theoryText({who: "x"}), "Who: x.");
});

test("investigation: evidence fades, faster outdoors in the rain, and merges within the hour", () => {
  const e = {kind: "tracks", at: 0};
  assert.equal(I.freshness(e, 0), 1);
  assert.ok(I.freshness(e, I.DAY) > 0.4);
  assert.equal(I.freshness(e, 3 * I.DAY), 0);
  assert.ok(I.freshness({...e, indoors: true}, 3 * I.DAY) > 0);
  assert.ok(I.freshness({...e, wet: 4}, I.DAY) < I.freshness(e, I.DAY));
  assert.equal(I.freshness({kind: "witness", at: 0, wet: 100}, I.DAY), I.freshness({kind: "witness", at: 0}, I.DAY), "rain does not wash a witness");
  let list = I.leave([], {kind: "blood", scene: "s", by: "a", at: 0});
  list = I.leave(list, {kind: "blood", scene: "s", by: "a", at: 600, text: "more"});
  assert.equal(list.length, 1);
  list = I.leave(list, {kind: "blood", scene: "s", by: "a", at: 2 * I.HOUR});
  assert.equal(list.length, 2);
  assert.equal(I.prune([{kind: "tracks", at: 0}], 10 * I.DAY).length, 0);
  assert.ok(I.searchDiff(0.1) > I.searchDiff(0.9));
});

test("investigation: what a find tells follows the science of the year", () => {
  assert.equal(I.scienceFor("prints", 1800).dice, 0);
  assert.equal(I.scienceFor("prints", 1900).dice, 2);
  assert.equal(I.scienceFor("traces", 1980).dice, 0);
  assert.equal(I.scienceFor("traces", 1990).dice, 2);
  assert.ok(!I.kindsFor(1900).includes("footage"));
  assert.ok(I.kindsFor(1990).includes("footage"));
  assert.ok(!I.leftBy("fire", 1500).includes("footage"));
  assert.deepEqual(I.searchResult({kind: "prints"}, 3, 1800), {found: true, names: false});
  assert.deepEqual(I.searchResult({kind: "prints"}, 3, 1950), {found: true, names: true});
  assert.deepEqual(I.searchResult({kind: "prints"}, 0, 1950), {found: false, names: false});
  assert.match(I.findWords({kind: "prints", byName: "Ota", text: "On the sill."}, {names: true, year: 1950}), /points to Ota/);
});
