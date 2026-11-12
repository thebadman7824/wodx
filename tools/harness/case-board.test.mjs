import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as C from "../../modules/wodx-interactables/scripts/case-rules.mjs";
import * as K from "../../modules/wodx-library/scripts/know-rules.mjs";

/* WoDX Interactables 0.32.0: the case board. */
test("cards go on free spots, and the same thing is not pinned twice", () => {
  let r = C.addCard(C.emptyBoard(), {kind: "person", ref: "Actor.a", title: "Anezka"});
  assert.equal(r.added, true);
  assert.equal(r.card.id, "c1");
  const first = {x: r.card.x, y: r.card.y};
  r = C.addCard(r.board, {kind: "place", ref: "Scene.s", title: "The mill"});
  assert.notDeepEqual({x: r.card.x, y: r.card.y}, first);
  const again = C.addCard(r.board, {kind: "person", ref: "Actor.a", title: "Anezka"});
  assert.equal(again.added, false);
  assert.equal(again.board.cards.length, 2);
});
test("a clue examined again with more successes says more on the same card", () => {
  let r = C.addCard(C.emptyBoard(), C.clueCard("Bloodstain", ["Dried blood."], "Scene.s.Tile.t", "Jan"));
  assert.equal(r.card.kind, "clue");
  assert.equal(r.card.by, "Jan");
  r = C.addCard(r.board, C.clueCard("Bloodstain", ["Dried blood.", "Two days old."], "Scene.s.Tile.t", "Jan"));
  assert.equal(r.added, false);
  assert.equal(r.board.cards[0].text, "Dried blood.\nTwo days old.");
});
test("lines join two cards once, never a card to itself, and go with a removed card", () => {
  let b = C.addCard(C.emptyBoard(), {kind: "note", title: "A"}).board;
  b = C.addCard(b, {kind: "note", title: "B"}).board;
  b = C.addCard(b, {kind: "note", title: "C"}).board;
  b = C.link(b, "c1", "c2", "paid");
  b = C.link(b, "c2", "c1", "paid by");
  b = C.link(b, "c1", "c1", "self");
  b = C.link(b, "c3", "c2");
  assert.equal(b.links.length, 2);
  assert.equal(b.links[0].label, "paid by");
  b = C.removeCard(b, "c2");
  assert.equal(b.links.length, 0);
  assert.deepEqual(b.cards.map(c => c.title), ["A", "C"]);
  b = C.unlink(C.link(b, "c1", "c3", "x"), "l1");
  assert.equal(b.links.length, 0);
});
test("players do not see hidden cards or the lines to them; the Storyteller sees all", () => {
  let b = C.addCard(C.emptyBoard(), {kind: "note", title: "Open"}).board;
  b = C.addCard(b, {kind: "note", title: "Secret", hidden: true}).board;
  b = C.link(b, "c1", "c2", "knows");
  const p = C.visibleTo(b, false), g = C.visibleTo(b, true);
  assert.deepEqual(p.cards.map(c => c.title), ["Open"]);
  assert.equal(p.links.length, 0);
  assert.equal(g.cards.length, 2);
  assert.equal(g.links.length, 1);
  b = C.editCard(b, "c2", {hidden: false, title: "Not secret"});
  assert.equal(C.visibleTo(b, false).cards.length, 2);
});
test("stored boards are made safe: bad kinds, positions off the board, broken lines", () => {
  const b = C.normalize({cards: [{id: "c1", kind: "bomb", title: "x", x: -50, y: 99999}, {id: "c1", kind: "note"}, {id: "c2", kind: "note", title: ""}],
    links: [{id: "l1", a: "c1", b: "c9"}, {id: "l2", a: "c1", b: "c2"}, {id: "l3", a: "c2", b: "c1"}]});
  assert.equal(b.cards.length, 2);
  assert.equal(b.cards[0].kind, "note");
  assert.equal(b.cards[0].x, 0);
  assert.equal(b.cards[0].y, C.BOARD_H - C.CARD_H);
  assert.equal(b.cards[1].title, "Note");
  assert.deepEqual(b.links.map(l => l.id), ["l2"]);
  const m = C.moveCard(b, "c1", 300, 200);
  assert.deepEqual([m.cards[0].x, m.cards[0].y], [300, 200]);
  assert.deepEqual(C.normalize(null), C.emptyBoard());
});
test("dropped documents become the right kind of card", () => {
  assert.equal(C.cardFromDrop({type: "Actor", uuid: "Actor.a"}, "Anezka").kind, "person");
  assert.equal(C.cardFromDrop({type: "Scene", uuid: "Scene.s"}, "Mill").kind, "place");
  assert.equal(C.cardFromDrop({type: "JournalEntry", uuid: "Compendium.world.wodx-encyclopedia.JournalEntry.x"}, "Gehenna").kind, "entry");
  assert.equal(C.cardFromDrop({type: "JournalEntryPage", uuid: "JournalEntry.j.JournalEntryPage.p"}).kind, "entry");
  assert.equal(C.cardFromDrop({type: "Item", uuid: "Item.i"}, "Knife").kind, "clue");
  assert.equal(C.cardFromDrop({type: "Macro", uuid: "Macro.m"}), null);
  assert.equal(C.cardFromDrop({type: "Actor"}), null);
});
test("the board looks like its era, from 1197 to the World of Future Darkness", () => {
  assert.equal(C.lookFor(1197).key, "parchment");
  assert.equal(C.lookFor(1600).key, "commonplace");
  assert.equal(C.lookFor(1888).key, "pinboard");
  assert.equal(C.lookFor(1999).key, "corkboard");
  assert.equal(C.lookFor(2023).key, "display");
  assert.equal(C.lookFor(2400).key, "display");
  assert.equal(C.lookFor(0).key, "corkboard");
  for ( const l of C.LOOKS ) { assert.ok(l.title); assert.ok(l.hint); }
});
test("the board window is wired: declared classes, the token tool, the hand, clues pinned on a look", () => {
  const src = readFileSync(new URL("../../modules/wodx-interactables/scripts/case.mjs", import.meta.url), "utf8");
  assert.match(src, /const ApplicationV2 = API\.ApplicationV2/);
  assert.match(src, /getSceneControlButtons/);
  assert.match(src, /addTool\(\{key: "caseBoard"/);
  assert.match(src, /OWNER/);
  const main = readFileSync(new URL("../../modules/wodx-interactables/scripts/main.mjs", import.meta.url), "utf8");
  assert.match(main, /await pinClue\(/);
  assert.match(main, /registerCaseSettings\(\)/);
});

/* WoDX Library 0.16.0: what a character could know. */
const camarilla = {id: "camarilla", title: "The Camarilla", kind: "faction", lines: ["vampire"], eras: ["renaissance", "modern"]};
const convention = {id: "convention-of-thorns", title: "The Convention of Thorns", kind: "event", lines: ["vampire"], eras: ["renaissance"], date: {from: 1493}};
const caern = {id: "caern", title: "Caern", kind: "term", lines: ["werewolf"], eras: ["dark-ages", "modern"]};
const prince = {id: "a-prince", title: "A prince", kind: "character", lines: ["vampire"], eras: ["dark-ages"]};
const v = (int, ab = {}) => ({intelligence: int, abilities: ab});

test("nothing is suggested before it has happened", () => {
  assert.equal(K.happened(convention, 1197), false);
  assert.equal(K.happened(convention, 1493), true);
  assert.equal(K.happened(camarilla, 1197), false);
  assert.equal(K.happened(camarilla, 1500), true);
  assert.equal(K.happened(caern, 1197), true);
  assert.equal(K.happened({eras: []}, 1197), true);
  const s = K.suggest(camarilla, {line: "vampire", year: 1197, dots: v(5, {occult: 5})});
  assert.deepEqual([s.fits, s.known], [false, false]);
});
test("the character's own line is known by its common words; the rest needs Intelligence and a Knowledge", () => {
  assert.equal(K.suggest(camarilla, {line: "vampire", year: 1999, dots: v(1)}).known, true);
  assert.equal(K.suggest(convention, {line: "vampire", year: 1999, dots: v(2, {academics: 1})}).known, false);
  assert.equal(K.suggest(convention, {line: "vampire", year: 1999, dots: v(2, {academics: 2})}).known, true);
  assert.match(K.suggest(prince, {line: "vampire", year: 1230, dots: v(2)}).why, /Politics 2 of 4/);
  assert.equal(K.suggest(caern, {line: "vampire", year: 1999, dots: v(3, {occult: 2})}).known, false);
  assert.equal(K.suggest(caern, {line: "vampire", year: 1999, dots: v(3, {occult: 3})}).known, true);
  assert.equal(K.suggest(caern, {line: "mortal", year: 1999, dots: v(3, {occult: 3})}).known, true);
});
test("a ghoul reads vampire entries as its own, a little harder", () => {
  assert.equal(K.suggest(camarilla, {line: "ghoul", year: 1999, dots: v(2, {occult: 2})}).known, false);
  assert.equal(K.suggest(camarilla, {line: "ghoul", year: 1999, dots: v(3, {occult: 2})}).known, true);
});
test("the list puts the character's own line first and leaves out what has not happened", () => {
  const rows = K.listFor([caern, convention, camarilla, prince], {line: "vampire", year: 1230, dots: v(2, {politics: 2})}, {onlyKnown: false});
  assert.deepEqual(rows.map(r => r.e.id), ["a-prince", "caern"]);
  const known = K.listFor([caern, camarilla, prince], {line: "vampire", year: 1999, dots: v(1)});
  assert.deepEqual(known.map(r => r.e.id), ["camarilla"]);
  for ( const era of ["dark-ages", "renaissance", "victorian", "modern", "future-darkness"] ) assert.ok(Number.isFinite(K.ERA_FROM[era]));
});
test("the Library opens What they could know and puts entries through the codex", () => {
  const src = readFileSync(new URL("../../modules/wodx-library/scripts/know.mjs", import.meta.url), "utf8");
  assert.match(src, /const \{ApplicationV2\} = foundry\.applications\.api/);
  assert.match(src, /cx\.reveal\(doc, \[actor\]\)/);
  assert.match(src, /isGM/);
  const main = readFileSync(new URL("../../modules/wodx-library/scripts/main.mjs", import.meta.url), "utf8");
  assert.match(main, /import\("\.\/know\.mjs"\)/);
});
