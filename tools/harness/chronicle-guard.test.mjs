/* Chronicle packs (Chronicle Packs Desk, Ben 18 Nov 2026): a chronicle's words stay in its own module. */
import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {check, compare, loadBaseline, countMarks, chronicles} from "./chronicle-guard.mjs";
import * as CD from "../../modules/wodx-chronicle/scripts/chronicle-data.mjs";

test("no shared module names a chronicle's own words (move it into the chronicle's module)", async () => {
  const {fresh} = compare(await check(), loadBaseline());
  assert.deepEqual(fresh, [], `These name a chronicle in shared code; move the content into its module, or read the word from the chronicle in play:\n  ${fresh.join("\n  ")}`);
});

test("the baseline lists only mentions still there (run chronicle-guard.mjs --baseline after moving one out)", async () => {
  const {cleared} = compare(await check(), loadBaseline());
  assert.deepEqual(cleared, [], `Cleared, take out of tools/harness/chronicle-guard-baseline.json:\n  ${cleared.join("\n  ")}`);
});

test("the guard counts whole words only", () => {
  assert.equal(countMarks("Rothenstein's market, rothenstein-live, Rothensteiner", ["Rothenstein"]), 1);
  assert.equal(countMarks("book red-stone; red-stones", ["red-stone"]), 1);
  assert.equal(countMarks("Kranzfels · Outer Bailey and Kranzfels", ["Kranzfels"]), 2);
});

test("every chronicle module has a manifest with an id and its marks", async () => {
  const list = await chronicles();
  assert.ok(list.some(c => c.id === "rothenstein"), "WoDX Rothenstein is a chronicle module");
  for ( const c of list ) {
    assert.ok(c.id, `${c.module} names its id`);
    assert.ok(c.marks.length, `${c.module} names its marks`);
  }
});

test("with no chronicle in play the story engines have nothing to tell", () => {
  const before = CD.currentId();
  CD.useChronicle("");
  try {
    assert.equal(CD.current(), null);
    assert.equal(CD.SAGA.books.length, 0);
    assert.deepEqual([CD.FRONTS, CD.TWISTS, CD.ENCOUNTERS, CD.CHAPTERS].map(x => x.length), [0, 0, 0, 0]);
    assert.equal(CD.FIRST_BOOK, "");
  } finally { CD.useChronicle(before); }
});

test("a registered chronicle goes into play, and another can be put in play in its place", () => {
  const before = CD.currentId();
  CD.registerChronicle({id: "test-shanghai", title: "Test", saga: {SAGA: {key: "shanghai", title: "T", where: "Shanghai", books: [{key: "b1"}]}, FIRST_BOOK: "b1"}});
  try {
    if ( !before ) assert.equal(CD.currentId(), "test-shanghai");
    CD.useChronicle("test-shanghai");
    assert.equal(CD.SAGA_PREFIX, "saga:shanghai:");
    assert.equal(CD.FIRST_BOOK, "b1");
    assert.equal(CD.FRONTS.length, 0, "a chronicle with no fronts has none");
  } finally { CD.unregisterChronicle("test-shanghai"); CD.useChronicle(before); }
  assert.equal(CD.currentId(), before);
});

test("a saga left running with its chronicle module off is found, and the one in play is not", async () => {
  const S = await import("../../modules/wodx-chronicle/scripts/saga-rules.mjs");
  const CD = await import("../../modules/wodx-chronicle/scripts/chronicle-data.mjs");
  const chains = [{key: "saga:rothenstein:red-stone"}, {key: "saga:rothenstein:second"}, {key: "lp:abc"}, {key: "saga:other:x"}];
  const was = CD.currentId();
  try {
    CD.useChronicle("");
    assert.deepEqual(S.orphanSagas(chains), ["other", "rothenstein"]);
    await import("../../modules/wodx-rothenstein/scripts/register.mjs");
    CD.useChronicle("rothenstein");
    assert.deepEqual(S.orphanSagas(chains), ["other"]);
    assert.deepEqual(S.orphanSagas(null), []);
  } finally { CD.useChronicle(was); }
});
