/* B7834: the creed books' new edges (Hunter Books: Avenger to Wayward), read from the page images, and the Hermit and Deviance paths. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";

const K = await import("../../modules/wodx-actions/scripts/reckoning-rules.js");
const PK = await import("../../modules/wodx-actions/scripts/power-keywords.js");

test("39 creed-book edges: five a book (Innocent four, its last page missing from the scan), each with its book and page", () => {
  const book = K.EDGES.filter(e => e.book);
  assert.equal(book.length, 39);
  const by = b => book.filter(e => e.book === b).map(e => e.level);
  for ( const b of ["avenger", "defender", "hermit", "judge", "martyr", "redeemer", "wayward"] ) assert.deepEqual(by(b), [1, 2, 3, 4, 5], b);
  assert.deepEqual(by("innocent"), [1, 2, 3, 4]);
  assert.equal(new Set(K.EDGES.map(e => e.id)).size, K.EDGES.length, "ids unique");
  for ( const e of book ) {
    assert.ok(K.EDGE_BOOKS[e.book], e.id);
    assert.match(e.ref, /^Hunter Book: \w+ (PDF )?p\. \d+$/, e.id);
    assert.ok(PK.keywordsOf("htr", `${e.path}-${e.id}`), `${e.id}: keywords`);
    assert.ok(e.e.length > 20, `${e.id}: a summary`);
  }
});

test("the Vision creeds' own paths, and the book edges keep the core rules (B7834)", () => {
  assert.equal(K.PATHS.hermit.virtue, "vision");
  assert.equal(K.PATHS.deviance.virtue, "vision");
  assert.equal(K.edgeFor("Muse of Flame").name, "Muse of Flame");
  assert.equal(K.edgeFor("Fool's Luck").diff, 8);
  assert.equal(K.edgeDifficulty(K.edgeFor("Imprison"), {t: {stamina: 5}}), 8);
  assert.equal(K.edgeFor("Harpoon").conviction, 2);
  assert.equal(K.edgeAllowed(K.edgeFor("Spiral"), {vision: 4}), false);
  assert.equal(K.edgeFor("Reap").ref, "Hunter Book: Wayward PDF p. 86");
  assert.equal(K.edgeFor("Cleave").ref, "Hunter: The Reckoning p. 162");
});

test("Spiral's whirlwind works each turn, a yard and a half of radius a success (B7834)", async () => {
  const TR = await import("../../modules/wodx-actions/scripts/turn-rules.js");
  const r = TR.resolveRec(TR.everyTurnOf("Spiral", "Hunter (HtR)"), {successes: 4});
  assert.equal(r.area.yards, 6);
  assert.equal(r.counter.value, 4);
  assert.equal(r.each.damage.levels, "counter");
  assert.equal(TR.everyTurnOf("Spiral", "Mage (M20)"), null);
});
