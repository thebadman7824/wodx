import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as S from "../../modules/wodx-chronicle/scripts/saga-rules.mjs";
import * as P from "../../modules/wodx-chronicle/scripts/pod-rules.mjs";

/* The Rothenstein saga over years and ages (B3660-B3669) */

const eras = JSON.parse(readFileSync(new URL("../../modules/wodx-chronicle/data/eras.json", import.meta.url))).profiles.map(e => e.id);

test("the saga is sound: dated steps in order, books apart, known eras, clocks and endings", () => {
  assert.deepEqual(S.validate(S.SAGA, {eras}), []);
});

test("the saga covers every era of the main timeline from 1197, and the prologue before it", () => {
  const sp = S.span();
  assert.equal(sp.from, 880);
  assert.equal(sp.to, 2030);
  for ( const e of ["dark-ages", "long-night", "age-of-reason", "victorian", "great-war", "mid-century", "modern", "time-of-judgment", "migration-age"] )
    assert.ok(S.SAGA.books.some(b => b.era === e), e);
  assert.ok(S.SAGA.books.some(b => b.branch === "future" && b.era === "future-darkness"), "the future book is on the branch");
  assert.ok(S.span({future: true}).to > 2030);
});

test("the first book runs five years, not ten nights", () => {
  const b = S.bookByKey("red-stone"), c = S.bookChain(b);
  assert.equal(b.steps.filter(x => x.kind === "chapter").length, 10, "ten chapters, one for each old session");
  const days = c.steps.reduce((n, x) => n + x.days, 0);
  assert.ok(days > 4 * 365 && days < 6 * 365, `${days} days`);
  assert.equal(c.steps[0].days, 0);
  assert.ok(c.steps.every(x => x.days >= 0));
  assert.equal(c.steps.at(-1).kind, "interlude");
  assert.ok(c.steps.find(x => x.key === "c10").ending.includes("take"));
});

test("a gap on the clock is the gap between the dates", () => {
  assert.equal(S.daysBetween([1197, 10, 1], [1197, 10, 2]), 1);
  assert.equal(S.daysBetween([1199, 1, 1], [1200, 1, 1]), 365);
  assert.equal(S.daysBetween([902, 6, 1], [906, 10, 31]) > 1500, true);
  assert.equal(S.dateText([1202, 6, 23]), "1202-06-23");
});

test("the first book's ending changes later words", () => {
  const step = S.bookByKey("plague").steps.find(x => x.key === "pass");
  assert.equal(S.wordsFor(step, {}), step.text);
  assert.ok(S.wordsFor(step, {"red-stone": "seal"}).endsWith(step.by.seal));
  const c = S.bookChain("chalice", {"red-stone": "take"});
  assert.ok(c.steps.find(x => x.key === "grove").text.includes("holder of the door"));
});

test("a book is a story chain the clock can deal out", () => {
  const run = {id: "r", key: S.chainKey("red-stone"), where: "Rothenstein", at: 0, last: 100, saga: {book: "red-stone", endings: {}}};
  const c = P.chainOf(run, 1197);
  assert.equal(c.saga, "red-stone");
  assert.match(c.label, /What Sleeps Beneath Rothenstein, book 1/);
  let n = P.nextStep(run, 1197);
  assert.equal(n.key, "c1");
  assert.equal(n.due, 100);
  run.at = 1; n = P.nextStep(run, 1197);
  assert.equal(n.key, "i1");
  assert.equal(n.due, 100 + 50 * S.DAY);
  assert.ok(P.chainByKey(S.chainKey("lantern")).steps.length >= 10);
  assert.equal(P.chainByKey("black-death").key, "black-death", "the old chains still work");
  assert.ok(!P.chainsFor(1200).some(c => S.isSagaKey(c.key)), "saga books stay out of the plain chain list");
  assert.equal(P.saga.SAGA.key, "rothenstein");
});

test("the next book: one at a time, by year, never one already dealt with", () => {
  assert.equal(S.dueBook({}, 1197).key, "red-stone");
  assert.equal(S.dueBook({}, 900).key, "prologue");
  assert.equal(S.dueBook({books: {"red-stone": "running"}}, 1203), null, "not while another runs");
  assert.equal(S.dueBook({books: {"red-stone": "done"}}, 1203).key, "patriarch");
  assert.equal(S.dueBook({books: {"plague": "skipped"}}, 1350), null);
  assert.equal(S.dueBook({}, 1999).key, "red-star");
  assert.equal(S.dueBook({}, 2050), null, "the future book only on its branch");
  assert.equal(S.dueBook({}, 2050, {future: true}).key, "arcology");
  assert.equal(S.dueBook({}, 1300).key, "silver");
});

test("books the clock passed still moved the world", () => {
  const gone = S.passedBooks({books: {"red-stone": "done"}}, 1350);
  assert.ok(gone.some(b => b.key === "riders") && !gone.some(b => b.key === "red-stone") && !gone.some(b => b.key === "plague"));
  assert.deepEqual(S.worldDelta(S.bookByKey("riders")), {sleeper: 1});
});

test("the long clocks hold between empty and full", () => {
  let c = S.moveClocks({}, {sleeper: 3});
  assert.equal(c.sleeper, 3);
  assert.equal(c.church, 0);
  c = S.moveClocks(c, {sleeper: 20, church: -5});
  assert.equal(c.sleeper, 10);
  assert.equal(c.church, 0);
  assert.deepEqual(S.fullClocks(c).map(k => k.key), ["sleeper"]);
});

test("every chapter of the sequels points at its own session page", () => {
  for ( const k of ["patriarch", "lantern", "enoch"] ) {
    const c = S.bookChain(k), ch = c.steps.filter(x => x.journal);
    assert.equal(ch.length, 10, k);
    ch.forEach((x, i) => assert.equal(x.journal.page, `Session ${i + 1}`, `${k} ${x.key}`));
  }
});

test("the saga's words: no gendered pronouns, no long dashes, real people offstage", () => {
  const words = [];
  for ( const b of S.SAGA.books ) {
    words.push(b.title, b.text, ...Object.values(b.doors ?? {}));
    for ( const x of b.steps ) words.push(x.title, x.text, ...Object.values(x.by ?? {}), x.signal?.words ?? "");
  }
  words.push(S.SAGA.origin.text, ...S.SAGA_CLOCKS.map(c => c.text), ...Object.values(S.SAGA_ENDINGS).map(e => e.text));
  for ( const w of words ) {
    assert.doesNotMatch(w, /\b(he|she|him|his|her|hers|himself|herself)\b/i, w);
    assert.doesNotMatch(w, /—/, w);
    assert.doesNotMatch(w, /\bB\d{3,4}\b/, w);
  }
});

test("saga steps that change the town name a change the towns know (B3670)", async () => {
  const TR = await import("../../modules/wodx-storyteller/scripts/town-rules.mjs");
  assert.deepEqual([...S.TOWN_KINDS].sort(), Object.keys(TR.SAGA_TOWN).sort());
  const kinds = S.SAGA.books.flatMap(b => b.steps.map(x => x.town).filter(Boolean));
  assert.ok(kinds.length >= 15 && kinds.includes("flood") && kinds.includes("expulsion"));
  assert.equal(S.bookChain("red-star").steps.find(x => x.key === "flood").town, "flood");
  const e = TR.sagaEvent("expulsion", "m1", "The trains west");
  assert.equal(e.town, "m1");
  assert.ok(e.fled > 0.3 && /^The trains west: a whole people/.test(e.text));
  assert.equal(TR.sagaEvent("nothing", "m1"), null);
  const st = TR.normState({towns: {m1: TR.newTown({id: "m1", name: "Rothenstein"}, {people: 2000})}});
  const r = TR.applyNow(st, [TR.sagaEvent("flood", "m1", "The flood")], {year: 1997, month: 7});
  assert.equal(r.events.length, 1);
  assert.ok(r.state.towns.m1.scars.some(s => s.kind === "flood"));
});

test("a long skip deals every saga step it passes, on the book's own calendar (B3672)", () => {
  const run = {key: S.chainKey("red-stone"), at: 0, last: 0, saga: {book: "red-stone", endings: {}}};
  const t = 6 * 365 * S.DAY, dealt = [];
  let n = P.nextStep(run, 1200);
  while ( n && n.due <= t ) { dealt.push(n.key); run.at = n.index + 1; run.last = n.due; n = P.nextStep(run, 1200); }
  assert.equal(dealt.length, S.bookByKey("red-stone").steps.length);
  assert.equal(dealt.at(-1), "e1");
});
