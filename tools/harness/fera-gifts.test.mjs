/* Fera Gifts (B3756): every Gift of the W20 Changing Breeds list has a breed, a level, a page and a result on the effects card. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const E = await import("../../modules/wodx-actions/scripts/effects-rules.js");
const { outcomesOf } = await import("../../modules/wodx-actions/scripts/mage-da-effects.js");
const G = await import("../../modules/wodx-actions/scripts/garou-rules.js");
const GIFTS = JSON.parse(fs.readFileSync(new URL("../../modules/wodx-actions/data/gifts-fera.json", import.meta.url), "utf8")).gifts;
const FERA = JSON.parse(fs.readFileSync(new URL("../../modules/wodx-actions/data/fera.json", import.meta.url), "utf8")).breeds;

test("every Fera Gift has a known breed, level, page, keyword and a result (B3756)", () => {
  assert.ok(GIFTS.length >= 300);
  const ids = new Set();
  for ( const g of GIFTS ) {
    assert.ok(!ids.has(g.id), `${g.id}: unique`); ids.add(g.id);
    assert.ok(FERA[g.breed], `${g.n}: breed ${g.breed}`);
    assert.ok(g.l >= 1 && g.l <= 5, `${g.n}: level`);
    assert.ok(g.p >= 50 && g.p <= 250, `${g.n}: page`);
    assert.ok(E.KEYWORDS[g.spec.kw], `${g.n}: keyword ${g.spec.kw}`);
    assert.ok(outcomesOf(g.spec, { key: g.spec.kw, label: g.n }, 2, g.e).length, `${g.n}: results`);
    if ( g.r ) assert.ok(G.giftPool(g.r).every(x => x.kind !== "ability" || /^[a-z]+$/.test(x.key)), `${g.n}: pool ${g.r}`);
    assert.ok(!/\b(she|her|hers|he|him|his)\b/i.test(g.e) && !/—/.test(g.e), `${g.n}: text`);
  }
  for ( const b of ["Ajaba", "Ananasi", "Bastet", "Corax", "Gurahl", "Kitsune", "Mokole", "Nagah", "Nuwisha", "Ratkin", "Rokea", "Apis", "Grondr", "Camazotz"] )
    assert.ok(GIFTS.some(g => g.breed === b), `${b}: has Gifts`);
});

test("damage, healing and conditions land as effects (B3756)", () => {
  const by = n => GIFTS.find(g => g.n === n);
  const stare = outcomesOf(by("Withering Stare").spec, {}, 3)[0];
  assert.equal(stare.out.kind, "damage"); assert.equal(stare.out.levels, 3); assert.equal(stare.out.type, "aggravated");
  assert.equal(by("Replenishment of the Flesh").spec.kind, "heal");
  assert.equal(by("Blinding Spit").spec.condition, "blinded");
  assert.equal(G.giftCost(by("Clawstorm").c).rage, 1);
  assert.equal(G.giftCost(by("Clawstorm").c).willpower, 1);
});
