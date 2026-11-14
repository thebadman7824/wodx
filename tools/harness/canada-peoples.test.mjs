import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* Canada's first nations in the People generator (B4160 to B4163): Cree and Anishinaabe by division and town, Haida and Tlingit clans */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const G = await import(join(root, "modules/wodx-chronicle/scripts/gen-core.mjs"));
const W = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));
const {PEOPLE_TABLES} = await import(join(root, "modules/wodx-creation/data/people.mjs"));
const PR = await import(join(root, "modules/wodx-creation/scripts/people-rules.mjs"));
const C = await import(join(root, "modules/wodx-creation/data/people-canada.mjs"));
const HN = await import(join(root, "modules/wodx-creation/data/people-haudenosaunee.mjs"));
const split = s => s.split(",").map(x => x.trim()).filter(Boolean);
const CA = W.cultureOf("canada");
const people = (era, origin, n = 200) => Array.from({length: n}, (_, i) => PR.nameOf({rand: G.stream("ca", origin + era, i),
  tables: id => G.resolveTable(PEOPLE_TABLES, id, {era, culture: CA}), origin, sex: i % 2 ? "female" : "male"}));
const LISTS = [C.CE_MEN, C.CE_BANDS, C.CE_FAMILY, C.AN_MEN, C.AN_WOMEN, C.AN_TOWNS, C.AN_FAMILY, C.HA_MEN, C.HA_CLANS, C.HA_FAMILY, C.TL_MEN, C.TL_CLANS, C.TL_FAMILY];

test("canada: no list repeats itself, no pronoun words", () => {
  for ( const l of LISTS.map(split) ) {
    assert.equal(new Set(l).size, l.length, l.join());
    for ( const n of l ) assert.doesNotMatch(n, /\b(he|she|her|hers|him|his)\b/i, n);
  }
});

test("canada: Cree and Anishinaabe by division or town, Haida and Tlingit by clan, family names after 1800", () => {
  for ( const era of ["medieval", "early-modern"] ) {
    for ( const [o, towns] of [["cree", C.CE_BANDS], ["anishinaabe", C.AN_TOWNS]] ) {
      const ps = people(era, o);
      assert.ok(ps.every(p => !p.family && !p.name.includes("{")), `${o} ${era}`);
      assert.ok(ps.some(p => split(towns).map(t => `A woman of ${t}`).includes(p.name)), `${o}: a woman of a town`);
    }
    for ( const [o, clans] of [["haida", C.HA_CLANS], ["tlingit", C.TL_CLANS]] ) {
      assert.ok(people(era, o).every(p => split(clans).map(HN.clanName).includes(p.family) && !p.name.includes("{")), `${o} ${era}`);
    }
  }
  for ( const [o, fam] of [["cree", C.CE_FAMILY], ["anishinaabe", C.AN_FAMILY], ["haida", C.HA_FAMILY], ["tlingit", C.TL_FAMILY]] ) {
    assert.ok(people("industrial", o, 60).every(p => split(fam).includes(p.family)), o);
  }
});
