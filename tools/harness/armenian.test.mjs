import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* The Armenians in the People generator (B3940 to B3942) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const G = await import(join(root, "modules/wodx-chronicle/scripts/gen-core.mjs"));
const W = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));
const {PEOPLE_TABLES} = await import(join(root, "modules/wodx-creation/data/people.mjs"));
const PR = await import(join(root, "modules/wodx-creation/scripts/people-rules.mjs"));
const {ARMENIAN_LISTS: L} = await import(join(root, "modules/wodx-creation/data/people-armenian.mjs"));
const split = s => s.split(",").map(x => x.trim()).filter(Boolean);
const people = (era, region = "anatolia", n = 200) => Array.from({length: n}, (_, i) => PR.nameOf({rand: G.stream("hy", era, i),
  tables: id => G.resolveTable(PEOPLE_TABLES, id, {era, culture: W.cultureOf(region)}), origin: "armenian", sex: i % 2 ? "female" : "male"}));

test("armenian: over 300 names, no list repeats itself, no pronoun words", () => {
  assert.ok(new Set(Object.values(L).flatMap(split)).size >= 300);
  for ( const l of Object.values(L).map(split) ) {
    assert.equal(new Set(l).size, l.length, l.join());
    for ( const n of l ) assert.doesNotMatch(n, /\b(he|she|her|hers|him|his)\b/i, n);
  }
});

test("armenian: a town byname before 1800, a family name in -ian or -yan after", () => {
  for ( const era of ["medieval", "early-modern"] ) assert.ok(people(era).every(p => split(L.TOWNS).includes(p.family) && !p.name.includes("{")), era);
  for ( const era of ["industrial", "modern"] ) assert.ok(people(era).every(p => /(ian|yan)$/.test(p.family)), era);
});

test("armenian: in Anatolia, Persia, Constantinople, the Levant and Russia; few in Turkey after 1915", () => {
  const share = (region, era) => W.mixFor(region, era)?.find(([o]) => o === "armenian")?.[1] ?? 0;
  assert.equal(share("anatolia", "medieval"), 12);
  assert.equal(share("anatolia", "industrial"), 12);
  assert.equal(share("anatolia", "modern"), 1);
  assert.ok(share("persia", "early-modern") && share("aegean", "early-modern") && share("levant", "medieval") && share("russia", "industrial"));
  assert.equal(share("persia", "medieval"), 0, "New Julfa from 1605");
});
