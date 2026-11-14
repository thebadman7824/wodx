import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* The Great Basin in the People generator (B4150 to B4153): the Shoshone and the Ute, by division and band before 1800, family names after */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const G = await import(join(root, "modules/wodx-chronicle/scripts/gen-core.mjs"));
const W = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));
const {PEOPLE_TABLES} = await import(join(root, "modules/wodx-creation/data/people.mjs"));
const PR = await import(join(root, "modules/wodx-creation/scripts/people-rules.mjs"));
const B = await import(join(root, "modules/wodx-creation/data/people-basin.mjs"));
const split = s => s.split(",").map(x => x.trim()).filter(Boolean);
const WEST = W.cultureOf("north-america-west");
const people = (era, origin, n = 200) => Array.from({length: n}, (_, i) => PR.nameOf({rand: G.stream("gb", origin + era, i),
  tables: id => G.resolveTable(PEOPLE_TABLES, id, {era, culture: WEST}), origin, sex: i % 2 ? "female" : "male"}));
const PEOPLES = {shoshone: [B.SH_MEN, B.SH_WOMEN, B.SH_BANDS, B.SH_FAMILY], ute: [B.UT_MEN, B.UT_WOMEN, B.UT_BANDS, B.UT_FAMILY]};

test("basin: no list repeats itself, no pronoun words", () => {
  for ( const l of Object.values(PEOPLES).flat().map(split) ) {
    assert.equal(new Set(l).size, l.length, l.join());
    for ( const n of l ) assert.doesNotMatch(n, /\b(he|she|her|hers|him|his)\b/i, n);
  }
});

test("basin: own names and women of a band before 1800, family names after, and both in the West", () => {
  const origin = era => G.resolveTable(PEOPLE_TABLES, "people.origin", {era, culture: WEST})?.results.map(r => r.text) ?? [];
  for ( const [o, [men, women, bands, family]] of Object.entries(PEOPLES) ) {
    for ( const era of ["medieval", "early-modern"] ) {
      const ps = people(era, o);
      assert.ok(ps.every(p => !p.family && !p.name.includes("{")), `${o} ${era}`);
      assert.ok(ps.filter((p, i) => i % 2 === 0).every(p => split(men).includes(p.name)), `${o} ${era} men`);
      const byBand = split(bands).map(b => `A woman of ${b}`);
      assert.ok(ps.filter((p, i) => i % 2).every(p => split(women).includes(p.name) || byBand.includes(p.name)), `${o} ${era} women`);
    }
    assert.ok(people("modern", o, 60).every(p => split(family).includes(p.family)), `${o} modern`);
    assert.ok(origin("medieval").includes(o) && origin("industrial").includes(o), `${o} in the West`);
  }
});
