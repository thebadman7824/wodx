import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const S = await import(join(root, "modules/wodx-otherworlds/scripts/spirit-rules.mjs"));

test("moves change the chosen court, or the courts the move names", () => {
  let r = S.applyMove({}, "paid", {court: "weaver", at: 5});
  assert.deepEqual(r.changes, [{court: "weaver", from: 0, to: 1}]);
  assert.equal(r.spirits.log[0].why, "Chiminage paid");
  r = S.applyMove(r.spirits, "bane");
  assert.deepEqual(Object.fromEntries(r.changes.map(c => [c.court, c.to])), {wyld: 1, totem: 1, wyrm: -1});
  r = S.applyMove(r.spirits, "banBroken");
  assert.equal(r.spirits.standing.totem, -2);
  r = S.applyMove(r.spirits, "custom", {court: "beast", by: 3, why: "Saved the pack's wolves"});
  assert.equal(r.spirits.standing.beast, 3);
  assert.equal(r.spirits.log.at(-1).why, "Saved the pack's wolves");
});

test("standing stays between -5 and +5, and a move that changes nothing is not logged", () => {
  let r = S.applyMove({standing: {wyrm: -4}}, "custom", {court: "wyrm", by: -9});
  assert.equal(r.spirits.standing.wyrm, -5);
  assert.equal(r.changes[0].to - r.changes[0].from, -1);
  r = S.applyMove(r.spirits, "slight", {court: "wyrm"});
  assert.deepEqual(r.changes, []);
  assert.equal(r.spirits.log.length, 1);
  assert.deepEqual(S.applyMove({}, "paid", {court: "nonsense"}).changes, []);
});

test("what standing does to a roll with the court's spirits", () => {
  assert.deepEqual([5, 3, 2, 0, -2, -3, -5].map(n => S.effect(n).diff), [-2, -1, 0, 0, 0, 1, 2]);
  assert.equal(S.effect(-5).refuses, true);
  assert.equal(S.effect(-4).refuses, false);
  assert.match(S.effect(-3).note, /^\+1 difficulty.*house rule/);
  assert.equal(S.effect(0).note, "");
});

test("words for standing, and a summary with the totem's name", () => {
  assert.deepEqual([5, 3, 1, 0, -1, -3, -5].map(n => S.band(n).word), ["honoured", "well regarded", "known kindly", "unknown", "mistrusted", "resented", "scorned"]);
  assert.deepEqual(S.summary({standing: {totem: 2, weaver: -3}, totem: "Grandmother Spider"}), ["Weaver spirits: resented (-3)", "Grandmother Spider: known kindly (+2)"]);
  assert.ok(S.summary({standing: {totem: 2}, totem: "Grandmother Spider"})[0].startsWith("Grandmother Spider: known kindly"));
});

test("the courts across the eras: the Weaver grows with industry and the Net, the Future Darkness has its own", () => {
  assert.match(S.eraNotes(1197).weaver, /towns, roads, mills/);
  assert.match(S.eraNotes(1850).weaver, /Mills, rail and wire/);
  assert.match(S.eraNotes(1999).weaver, /The Net/);
  assert.match(S.eraNotes(1600).wyrm, /war, plague/);
  assert.match(S.eraNotes(1900).wyrm, /Industry/);
  assert.equal(S.eraNotes(1450).future, undefined);
  assert.match(S.eraNotes(2050, {future: true}).future, /World of Future Darkness/);
});

test("a broken record is read safely", () => {
  const s = S.normSpirits({standing: {weaver: "9", nope: 3, wyld: 0}, log: [{court: "nope"}, {court: "wyld", by: 1, why: "x"}], totem: 5});
  assert.deepEqual(s.standing, {weaver: 5});
  assert.equal(s.log.length, 1);
  assert.equal(s.totem, "5");
  assert.deepEqual(S.normSpirits(null), {standing: {}, totem: "", log: []});
});
