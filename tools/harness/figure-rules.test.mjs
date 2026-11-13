// The figure menu's rules (B2587): the catalogue on disk, a saved figure made safe, the quick picture's layers, the roster.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import * as F from "../../modules/wodx-paperdoll/scripts/figure-rules.mjs";
import * as SR from "../../modules/wodx-paperdoll/scripts/sprite-rules.mjs";
const at = p => new URL(`../../${p}`, import.meta.url);
const cat = JSON.parse(readFileSync(at(`${F.FOLDER}/catalogue.json`), "utf8"));

test("the catalogue: every piece has a known place and a layer, and the atlas is there", () => {
  assert.ok(existsSync(at(`${F.FOLDER}/atlas.png`)));
  assert.ok(cat.items.length > 400);
  const seen = new Set();
  for ( const e of cat.items ) {
    assert.ok(Object.hasOwn(F.SLOTS, e.s), `${e.n}: ${e.s}`);
    assert.ok(Number.isInteger(e.i) && e.i > 0 && !seen.has(e.i), e.n); seen.add(e.i);
  }
  for ( const s of Object.keys(F.SLOTS) ) assert.ok(F.piecesFor(cat, s).length > 0, `no pieces for ${s}`);
  assert.deepEqual([...F.DRAW].sort(), Object.keys(F.SLOTS).sort(), "every place is drawn");
  for ( const st of ["short", "long", "bun"] ) assert.ok(Number.isInteger(cat.hair[st]));
});

test("pieces by year: only what is in use then, and things with no years always", () => {
  const all = F.piecesFor(cat, "hand"), then = F.piecesFor(cat, "hand", 1230), late = F.piecesFor(cat, "hand", 2020);
  assert.ok(then.length < all.length && then.length > 0);
  assert.ok(then.some(e => e.n === "Broadsword") && !then.some(e => /SMG|Assault/.test(e.n)));
  assert.ok(late.some(e => e.n === "Broadsword"), "made things stay in the world");
});

test("a saved figure is made safe, pieces go in their own place, dyes are colours", () => {
  const body = F.piecesFor(cat, "body")[0], hand = F.piecesFor(cat, "hand")[0];
  const fig = F.normalize({skin: "E0B590", hair: "zzz", hairStyle: "mohawk", slots: {body: {n: body.n, c: "7A2E2E"}, legs: {n: hand.n}, hand: {n: hand.n, c: "red"}, nowhere: {n: body.n}}}, cat, {hair: "8a5a34"});
  assert.equal(fig.skin, "e0b590"); assert.equal(fig.hair, "8a5a34"); assert.equal(fig.hairStyle, "short");
  assert.deepEqual(fig.slots, {body: {n: body.n, c: "7a2e2e"}, hand: {n: hand.n}});
  const more = F.wear(fig, "hand", null, cat);
  assert.ok(!more.slots.hand && fig.slots.hand, "wear returns a new figure");
  assert.deepEqual(F.wear(fig, "legs", hand.n, cat).slots.legs, undefined, "a weapon is not trousers");
  assert.equal(F.dye(fig, "hand", "112233").slots.hand.c, "112233");
  assert.equal(F.dye(fig, "body", null).slots.body.c, undefined);
});

test("the quick picture: body first, hair under the hat, dyed pieces take the dye", () => {
  const body = F.piecesFor(cat, "body")[0], head = F.piecesFor(cat, "head")[0], hand = F.piecesFor(cat, "hand")[0];
  const fig = F.normalize({hairStyle: "long", slots: {body: {n: body.n, c: "112233"}, head: {n: head.n}, hand: {n: hand.n}}}, cat);
  const L = F.layersOf(fig, cat);
  assert.deepEqual(L[0], {i: cat.body, tint: fig.skin, mode: "multiply"});
  assert.deepEqual(L.map(l => l.i), [cat.body, body.i, cat.hair.long, head.i, hand.i]);
  assert.deepEqual(L[1], {i: body.i, tint: "112233", mode: "color"});
  assert.equal(F.layersOf(F.normalize({hairStyle: "bald"}, cat), cat).length, 1);
  assert.deepEqual(F.cellOf(cat, cat.cols + 2), {x: 2 * cat.w, y: cat.h, width: cat.w, height: cat.h});
});

test("the roster draws the figure the player put together, not the things marked as worn", () => {
  const fig = {skin: "e0b590", hair: "8a5a34", hairStyle: "long", slots: {body: {n: "a coarse wool tunic"}, legs: {n: "a long skirt", c: "7a2e2e"}, hand: {n: "Dagger"}, offhand: {n: "Buckler"}}};
  const e = SR.rosterOf({id: "k1", name: "Katarina", type: "Vampire", skin: "ffffff", hair: "000000", figure: fig, items: [{name: "Class Five", type: "Armor", worn: true}]});
  assert.deepEqual(e.look, {skin: "e0b590", hair: "8a5a34", hairStyle: "long"});
  assert.deepEqual(e.worn, [["a long skirt", "7a2e2e"], "a coarse wool tunic"]);
  assert.deepEqual(e.held, ["Dagger", "Buckler"]);
  assert.equal(e.figure, true);
  assert.deepEqual(F.rosterPart(F.normalize(fig, cat)).worn, e.worn, "the menu and the roster agree");
});
