// Book one's twist web (B4850-B4853): chains, pairs, one twist a week, chapters and the end of new twists.
import {test} from "node:test";
import assert from "node:assert/strict";
import {join, dirname} from "node:path";
import {fileURLToPath} from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const T = await import(join(root, "modules/wodx-chronicle/scripts/twist-rules.mjs"));
const DAY = 86400;

test("the web holds together: 24 twists, six chains, the pairs and the order name real twists", () => {
  assert.deepEqual(T.validate(), []);
  assert.equal(T.TWISTS.length, 24);
  assert.equal(T.CHAINS.length, 6);
  assert.deepEqual(T.TWISTS.filter(t => t.free).map(t => t.n), [4, 10, 12, 14]);
  assert.deepEqual(T.chainsOf(17).sort(), ["egon", "white"]);
});

test("one twist a week of game time, unless the company dug it out itself", () => {
  let s = T.reveal({}, 1, {now: 0}).state;
  assert.match(T.whyNot(5, s, {now: 3 * DAY}), /One twist a week: the next can come in 4 days/);
  assert.equal(T.whyNot(5, s, {now: 3 * DAY, force: true}), "");
  assert.equal(T.whyNot(5, s, {now: 7 * DAY}), "");
  assert.throws(() => T.reveal(s, 5, {now: DAY}), /One twist a week/);
});

test("a twist waits for its chapter, and none come after the choosing is played", () => {
  assert.match(T.whyNot(16, {}, {played: ["c1"]}), /fits from chapter 8; the company is in chapter 2/);
  assert.equal(T.whyNot(16, {}, {played: ["c1", "c2", "c3", "c4", "c5", "c6", "c7"]}), "");
  assert.match(T.whyNot(13, {}, {played: [...T.CHAPTERS.slice(0, 9)], force: true}), /No new twists after the choosing/);
  assert.equal(T.chapterNow(["c1", "c2"]), "c3");
});

test("a revealed twist gives its partner another heart, and a twist with two hearts takes one", () => {
  const r = T.reveal({}, 15, {now: 0, played: ["c1", "c2", "c3"]});
  assert.deepEqual(r.changes.map(c => c.n), [17]);
  assert.match(T.heartNotes(17, r.state)[0], /drowned bride/);
  assert.throws(() => T.reveal({}, 22, {now: 0}), /Choose its heart: tool or seer/);
  const v = T.reveal({}, 22, {now: 0, variant: "seer"});
  assert.equal(v.state.revealed[22].variant, "seer");
  assert.deepEqual(v.changes, [{n: 22, variant: "tool", note: "Only one heart can be used: they are a true seer's."}]);
});

test("the quick order suggests the next, with the quiet twists beside it, and chains count their knots", () => {
  let s = {};
  assert.deepEqual(T.suggest(s, {played: []}), {next: 1, quiet: [4, 10, 12, 14]});
  s = T.reveal(s, 1, {now: 0}).state;
  assert.equal(T.suggest(s, {now: 7 * DAY, played: []}).next, 5);
  const letter = T.chainTally(s, []).find(c => c.key === "letter");
  assert.deepEqual([letter.found, letter.of, letter.due], [1, 4, ["c1"]]);
});
