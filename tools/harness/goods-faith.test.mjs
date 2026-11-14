import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* The no-effect audit, faith and occult goods: pray, ward and divine do something (B3902 to B3904) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const F = await imp("modules/wodx-library/scripts/faith-rules.mjs");
const G = await imp("modules/wodx-library/data/goods.mjs");
const U = await imp("modules/wodx-library/scripts/use-rules.mjs");

test("every faith and occult good has a Use that rolls or changes something, never a bare note", () => {
  const goods = G.GOODS.filter(g => ["faith", "occult"].includes(g.kind));
  assert.ok(goods.length >= 80, `${goods.length}`);
  for ( const g of goods ) {
    const ab = U.abilitiesOf(g);
    assert.ok(ab.length, `${g.name} has no Use`);
    for ( const k of ab ) assert.notEqual(U.ABILITIES[k].effect, "note", `${g.name}: ${k} is only a note`);
  }
});

test("a prayer without True Faith: once a night, a success gives back one Willpower up to the rating", () => {
  const n = F.nightOf(86400 * 3 + 50000);
  assert.equal(F.nightOf(86400 * 3 + 50000 + 3600), n, "the same night an hour later");
  assert.equal(F.prayResult({successes: 1}, {temporary: 3, permanent: 5, night: n}).willpower, 4);
  assert.equal(F.prayResult({successes: 2}, {temporary: 5, permanent: 5, night: n}).willpower, 5);
  assert.equal(F.prayResult({successes: 0}, {temporary: 3, permanent: 5, night: n}).willpower, 3);
  assert.equal(F.prayResult({successes: 2}, {temporary: 3, permanent: 0, night: n}).willpower, 3, "never lowers Willpower");
  assert.ok(F.prayResult({botch: true}, {temporary: 3, permanent: 5, night: n}).doubt);
  const again = F.prayResult({successes: 3}, {temporary: 3, permanent: 5, prayedNight: n, night: n});
  assert.equal(again.ok, false); assert.equal(again.willpower, 3);
});

test("divining: the successes say how many questions the Storyteller answers", () => {
  assert.match(F.divineLine({successes: 0}), /no answer/);
  assert.match(F.divineLine({successes: 1}), /riddle/);
  assert.match(F.divineLine({successes: 2}), /one question plainly/);
  assert.match(F.divineLine({successes: 5}), /3 questions/);
  assert.match(F.divineLine({botch: true}), /false/);
});

test("a set ward carried makes mind powers and magic from the supernatural one harder", () => {
  const charm = {name: "a horseshoe", system: {isequipped: true}, flags: {"wodx-library": {ward: {on: true}}}};
  const ctx = {channel: "resist", tags: ["mind"], against: "kindred"};
  assert.deepEqual(F.wardEffects([charm], ctx).map(e => e.diff), [1]);
  assert.equal(F.wardEffects([charm], {...ctx, against: "mortal"}).length, 0);
  assert.equal(F.wardEffects([charm], {...ctx, tags: ["melee"]}).length, 0);
  assert.equal(F.wardEffects([charm], {...ctx, channel: "roll"}).length, 0);
  assert.equal(F.wardEffects([{...charm, system: {isequipped: false}}], ctx).length, 0, "left at home");
  assert.equal(F.wardEffects([{...charm, flags: {}}], ctx).length, 0, "not set");
  assert.equal(F.wardEffects([charm, charm], ctx).length, 1, "wards do not stack");
});

test("the Library registers its ward with Chronicle's trait effects", () => {
  const f = src("modules/wodx-library/scripts/faith-use.mjs");
  assert.match(f, /T\?\.addSource\?\.\(\(actor, ctx\) => F\.wardEffects/);
  assert.match(src("modules/wodx-library/scripts/main.mjs"), /setupFaith\(\)/);
  const u = src("modules/wodx-library/scripts/use.mjs");
  for ( const k of ["pray", "ward", "divine"] ) assert.match(u, new RegExp(`case "${k}": return FU\\.`));
});
