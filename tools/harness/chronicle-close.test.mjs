import {PACK} from "../../modules/wodx-rothenstein/scripts/register.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import * as CD from "../../modules/wodx-chronicle/scripts/chronicle-data.mjs";
import * as CL from "../../modules/wodx-chronicle/scripts/close-rules.mjs";
import * as S from "../../modules/wodx-chronicle/scripts/saga-rules.mjs";
import * as K from "../../modules/wodx-storyteller/scripts/carry-rules.mjs";

/* Close this chronicle (c1), next book or close at a book's end (c3), and carry to a new chronicle (c2) */

const sagaKey = PACK.saga.SAGA.key;
const world = () => ({cities: {}, chains: [
  {id: "a", key: `saga:${sagaKey}:red-stone`, at: 3, saga: {book: "red-stone", endings: {}}},
  {id: "b", key: "some-other-chain", at: 0}],
saga: {endings: {}, clocks: {}, books: {"red-stone": "running"}, twists: {revealed: {1: {at: 5}}}, fronts: {x: 1}}});

test("closing puts the chronicle's saga away under its own id and keeps every other story chain", () => {
  const s0 = world(), r = CL.closeState(s0, PACK, {at: 100, date: "1201-03-01"});
  assert.equal(r.state.saga, undefined, "no saga state is left in play");
  assert.deepEqual(r.state.chains.map(c => c.id), ["b"], "the other chain runs on");
  assert.equal(r.state.closed[PACK.id].chains[0].id, "a");
  assert.deepEqual(r.state.closed[PACK.id].saga.twists, {revealed: {1: {at: 5}}}, "twists, fronts and the rest are kept");
  assert.deepEqual(r.entry, {id: PACK.id, title: PACK.title, at: 100, date: "1201-03-01", book: "red-stone"});
  assert.ok(s0.saga, "the state handed in is not changed");
});

test("opening it again brings the saga back as it was put away", () => {
  const s0 = world(), shut = CL.closeState(s0, PACK).state, back = CL.reopenState(shut, PACK.id);
  assert.equal(back.error, undefined);
  assert.deepEqual(back.state.saga, s0.saga);
  assert.deepEqual(back.state.chains.map(c => c.id).sort(), ["a", "b"]);
  assert.equal(back.state.closed, undefined);
  assert.ok(CL.reopenState(world(), PACK.id).error, "a chronicle that is not closed cannot be opened again");
  const busy = {...shut, saga: {books: {other: "running"}}};
  assert.ok(CL.reopenState(busy, PACK.id).error, "it never comes back over another saga that has started since");
  assert.equal(CL.reopenState({...shut, saga: {endings: {}, clocks: {}, books: {}}}, PACK.id).error, undefined, "an empty saga state is no clash");
});

test("the book it stopped at is the one running, else the last one done", () => {
  assert.equal(CL.stoppedAt(PACK, {books: {"red-stone": "running"}}), "red-stone");
  const second = PACK.saga.SAGA.books[2].key;
  assert.equal(CL.stoppedAt(PACK, {books: {"red-stone": "done", [second]: "done"}}), second);
  assert.equal(CL.stoppedAt(PACK, {}), "");
});

test("a closed chronicle leaves play, the engines read nothing, and it comes back when opened again", () => {
  assert.equal(CD.currentId(), PACK.id);
  assert.ok(S.SAGA.books.length > 1);
  assert.equal(CD.settleInPlay([PACK.id]), null);
  assert.equal(CD.current(), null);
  assert.equal(S.SAGA.books.length, 0, "the saga engine sees no books");
  assert.ok(CD.isClosed(PACK.id));
  CD.registerChronicle(PACK);
  assert.equal(CD.current(), null, "registering again while closed does not put it back in play");
  assert.equal(CD.settleInPlay([])?.id, PACK.id, "opened again, it is back in play");
  assert.ok(S.SAGA.books.length > 1);
  assert.ok(!CD.isClosed(PACK.id));
});

test("the closed list adds and takes off one chronicle", () => {
  const l = CL.withClosed({}, {id: "x", title: "X"});
  assert.deepEqual(CL.closedIdsOf(l), ["x"]);
  assert.deepEqual(CL.withoutClosed(l, "x"), {});
});

test("at a book's end no later book is offered or passed until the Storyteller answers", () => {
  const first = S.SAGA.books.find(b => b.key === PACK.manifest.firstBook), next = CL.nextBook(S.SAGA, first.key);
  assert.ok(next && next.key !== first.key);
  const waiting = {books: {[first.key]: "done"}, after: {[first.key]: "ask"}};
  assert.ok(S.waitsAtEnd(waiting));
  assert.equal(S.dueBook(waiting, next.from), null);
  assert.deepEqual(S.passedBooks(waiting, next.to + 1), []);
  const carried = {books: {[first.key]: "done"}, after: {[first.key]: "next"}};
  assert.equal(S.dueBook(carried, next.from)?.key, next.key, "after Carry on, the next book comes when the year fits");
  assert.deepEqual(CL.endsWaiting(waiting), [first.key]);
  assert.deepEqual(CL.endsWaiting(carried), []);
});

test("the question at a book's end names the next book and what each answer does", () => {
  const first = PACK.manifest.firstBook, a = CL.endAsk(S.SAGA, first, {name: "The saga"});
  assert.equal(a.key, `saga-end:${first}`);
  assert.match(a.title, /Carry on, or close the chronicle here\?/);
  assert.match(a.detail, /Approve to carry on/);
  assert.match(a.detail, /Reject to close/);
  assert.equal(a.data.next, CL.nextBook(S.SAGA, first).key);
  const lastMain = S.SAGA.books.filter(b => b.branch !== "future").at(-1);
  assert.equal(CL.nextBook(S.SAGA, lastMain.key), null, "the last book on the main line has no next book");
  assert.equal(CL.endAsk(S.SAGA, lastMain.key), null, "so nothing is asked; the card offers the close alone");
  if ( S.SAGA.books.some(b => b.branch === "future") ) assert.ok(CL.nextBook(S.SAGA, lastMain.key, {future: true}), "the future branch carries on when it is on");
});

/* Carry to a new chronicle */

const from = {world: "old-world", chronicle: PACK.id, title: PACK.title, date: "1202-11-11", book: "Book one", ending: "Sealed"};
const pc = () => ({_id: "pc1", name: "Anezka", type: "Vampire", folder: "f1", sort: 5, _stats: {x: 1},
  ownership: {default: 0, user1: 3, gm: 3}, system: {notes: "<p>Old notes.</p>"},
  items: [{_id: "i1", name: "Knife", flags: {wodx: {chronicle: PACK.id}}}],
  flags: {wodx: {chronicle: PACK.id}, "wodx-chronicle": {goal: {key: "g"}, golconda: {step: 2}}, "wodx-storyteller": {built: {step: "carry"}}}});

test("a carried character keeps the sheet whole and drops only the old world's ties", () => {
  const r = K.cleanDoc(pc(), from, {kind: "Actor", ties: ["member of The Old Guild"]});
  assert.equal(r.doc.flags.wodx.chronicle, undefined, "the chronicle mark is gone");
  assert.equal(r.doc.flags["wodx-chronicle"].goal, undefined, "the opening goal is gone");
  assert.deepEqual(r.doc.flags["wodx-chronicle"].golconda, {step: 2}, "the road to Golconda stays");
  assert.equal(r.doc.flags["wodx-storyteller"].built, undefined);
  assert.equal(r.doc.items[0].flags.wodx.chronicle, undefined, "held items lose the mark too");
  assert.deepEqual(r.doc.ownership, {default: 0});
  for ( const k of ["_id", "folder", "sort", "_stats"] ) assert.equal(r.doc[k], undefined, k);
  assert.equal(r.doc.flags["wodx-storyteller"].carried.sourceId, "pc1");
  assert.match(r.doc.system.notes, /^<p>Carried across from .+ after Book one \(Sealed\) on 1202-11-11\.<\/p><p>Old notes\.<\/p>$/);
  assert.ok(r.dropped.includes("member of The Old Guild"));
  assert.ok(r.dropped.some(d => /chronicle mark/.test(d)));
});

test("the carry file holds the picks and lists what stayed behind", () => {
  const f = K.bundle({Actor: [{doc: pc(), owners: ["Player One"]}], Item: [{doc: {_id: "it", name: "Relic", system: {description: ""}}}]}, from, {made: 0});
  assert.equal(f.kind, K.KIND);
  assert.equal(f.docs.Actor.length, 1);
  assert.equal(f.docs.Item.length, 1);
  assert.match(f.docs.Item[0].system.description, /Carried across/);
  assert.deepEqual(f.docs.Actor[0].flags["wodx-storyteller"].carried.owners, ["Player One"]);
  assert.equal(f.dropped[0].name, "Anezka");
  assert.deepEqual(K.check(f), []);
  assert.ok(K.check({kind: "x"}).length);
  assert.ok(K.check({...f, version: K.VERSION + 1}).some(e => /newer/.test(e)));
  assert.ok(K.check({...f, docs: {Actor: [], Item: []}}).some(e => /nothing/.test(e)));
});

test("reading the file in makes each document once and gives it back to the player of the same name", () => {
  const f = K.bundle({Actor: [{doc: pc(), owners: ["Player One", "Gone Player"]}]}, from, {made: 0});
  const plan = K.importPlan(f, {players: [{id: "u9", name: "Player One"}]});
  assert.equal(plan.make.Actor.length, 1);
  assert.deepEqual(plan.make.Actor[0].ownership, {default: 0, u9: 3});
  const again = K.importPlan(f, {have: [{sourceId: "pc1", world: "old-world"}]});
  assert.equal(again.make.Actor.length, 0);
  assert.equal(again.kept, 1);
  assert.match(K.fileName("old world!", Date.UTC(2026, 10, 20, 22, 5)), /^old-world--202611202205\.json$/);
});
