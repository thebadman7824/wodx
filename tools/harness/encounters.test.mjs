// Book one's encounters (B6640-B6649): the offer on the company's map and in season, once only, Not tonight and
// Never, the window that closes and what happens off the map, the ties, and the twist that waits for its encounter.
import {test} from "node:test";
import assert from "node:assert/strict";
import {join, dirname} from "node:path";
import {fileURLToPath} from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const E = await import(join(root, "modules/wodx-chronicle/scripts/encounter-rules.mjs"));
const TW = await import(join(root, "modules/wodx-chronicle/scripts/twist-rules.mjs"));
const F = await import(join(root, "modules/wodx-chronicle/scripts/front-rules.mjs"));
const DAY = 86400;

test("twenty-four encounters, each with maps, people, a window and what happens unmet", () => {
  assert.deepEqual(E.validate(), []);
  assert.deepEqual(E.ENCOUNTERS.map(e => e.n), Array.from({length: 24}, (_, i) => i + 1));
  for ( const e of E.ENCOUNTERS ) assert.ok(e.offmap.talk, `${e.n} has street talk`);
});

test("offered only on its maps, in its months and from its chapter", () => {
  const st = E.normState({}, 0);
  assert.deepEqual(E.due(st, {now: 0, played: [], month: 9, scene: "The Mountain Trail"}), [5]);
  assert.deepEqual(E.due(st, {now: 0, played: [], month: 9, scene: "Kranzfels · Inner Ward and Great Hall"}), []);
  assert.match(E.whyNot(st, 7, {now: 0, played: ["c1", "c2"], month: 9, scene: "Lower Town · Craftsmen's Lane"}), /fits from chapter 4|fits in December/);
  assert.match(E.whyNot(st, 7, {now: 0, played: ["c1", "c2", "c3"], month: 9, scene: "Lower Town · Craftsmen's Lane"}), /fits in December, January, February/);
  assert.equal(E.whyNot(st, 7, {now: 0, played: ["c1", "c2", "c3"], month: 12, scene: "Lower Town · Craftsmen's Lane"}), "");
  // Lenka waits a week in the valley; the missing child follows the hermit or the pack
  assert.match(E.whyNot(st, 3, {now: 3 * DAY, played: ["c1"], month: 9, scene: "Lower Town · Market Square"}), /7 days/);
  assert.equal(E.whyNot(st, 3, {now: 8 * DAY, played: ["c1"], month: 9, scene: "Lower Town · Market Square"}), "");
  assert.match(E.whyNot(st, 17, {now: 0, played: ["c1"], month: 9, scene: "Dolany Village"}), /follows encounter 8 or 10/);
  const met8 = E.play(st, 8, {now: 0});
  assert.equal(E.whyNot(met8, 17, {now: 0, played: ["c1"], month: 9, scene: "Dolany Village"}), "");
});

test("each plays once; Not tonight brings it back after a day; Never strikes it", () => {
  let st = E.normState({}, 0);
  const ctx = {now: 0, played: [], month: 9, scene: "The Mountain Trail"};
  st = E.play(st, 5, ctx);
  assert.throws(() => E.play(st, 5, ctx), /Already played/);
  assert.deepEqual(E.met(st), [5]);
  let b = E.later(E.normState({}, 0), 5, 0);
  assert.deepEqual(E.due(b, ctx), []);
  assert.deepEqual(E.due(b, {...ctx, now: DAY + 1}), [5]);
  b = E.never(b, 5, 0);
  assert.match(E.whyNot(b, 5, {...ctx, now: 2 * DAY}), /Struck/);
  // an offer is not repeated within a day while the company stays
  const o = E.offer(E.normState({}, 0), [5], 0);
  assert.deepEqual(E.due(o, {...ctx, now: DAY / 2}), []);
  assert.deepEqual(E.due(o, {...ctx, now: DAY}), [5]);
  assert.deepEqual(E.unplay(st, 5).played, {});
});

test("the window closes after its last best chapter, or when its months pass; unmet and struck both close", () => {
  let st = E.normState({}, 0);
  assert.ok(!E.closing(st, {played: ["c1"], month: 9}).includes(5));
  assert.ok(E.closing(st, {played: ["c1", "c2"], month: 9}).includes(5));
  // the harvest game's months come round and pass
  st = E.see(st, 9);
  assert.ok(!E.closing(st, {played: ["c1"], month: 10}).includes(2));
  assert.ok(E.closing(st, {played: ["c1"], month: 11, now: 0}).includes(2));
  // a struck encounter still closes, so the world still goes on
  const nv = E.never(E.normState({}, 0), 13, 0);
  assert.ok(E.closing(nv, {played: ["c1", "c2", "c3"], month: 9}).includes(13));
  const cl = E.close(st, [2], 5);
  assert.match(E.whyNot(cl, 2, {played: [], month: 9, scene: "Dolany"}), /window has closed/);
  // the any-time ones close at the choosing
  assert.equal(E.closesAfter(E.encounterOf(8)), "c9");
});

test("ties and off-map outcomes point at real fronts, clues and clocks", () => {
  assert.deepEqual(E.tiesOf(5).clues, [["sire", 0], ["sire", 1]]);
  assert.deepEqual(E.tiesOf(16).front, [["council", "dam"]]);
  assert.deepEqual(E.offmapOf(21).judge, ["yaroslava", "refuse"]);
  assert.deepEqual(E.offmapOf(19).moves, {church: 1});
  let fs = F.normState({}, 0);
  assert.equal(E.stepIsNext(fs, "council", "dam"), false);
  assert.equal(E.stepIsNext(fs, "council", "complaint"), true);
  fs = F.step(fs, "council", {now: 0, played: ["c1"], force: true}).state;
  assert.equal(E.stepIsNext(fs, "council", "letter"), true);
});

test("a twist waits for its encounter, unless forced", () => {
  assert.match(TW.whyNot(1, {revealed: {}}, {played: [], met: []}), /encounter \(1\) has not been played/);
  assert.equal(TW.whyNot(1, {revealed: {}}, {played: [], met: [1]}), "");
  assert.equal(TW.whyNot(1, {revealed: {}}, {played: [], met: [], force: true}), "");
  assert.throws(() => TW.reveal({revealed: {}}, 1, {played: [], met: []}), /not been played/);
  assert.ok(TW.reveal({revealed: {}}, 1, {played: [], met: [1]}).state.revealed[1]);
  // without the list (older callers), the twist rules are unchanged
  assert.equal(TW.whyNot(1, {revealed: {}}, {played: []}), "");
});
