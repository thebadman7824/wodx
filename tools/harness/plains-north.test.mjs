import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* The northern Plains in the People generator (B4140 to B4143): Crow clans, Blackfoot and Arapaho by division, family names after 1800 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const G = await import(join(root, "modules/wodx-chronicle/scripts/gen-core.mjs"));
const W = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));
const {PEOPLE_TABLES} = await import(join(root, "modules/wodx-creation/data/people.mjs"));
const PR = await import(join(root, "modules/wodx-creation/scripts/people-rules.mjs"));
const NP = await import(join(root, "modules/wodx-creation/data/people-plains-north.mjs"));
const HN = await import(join(root, "modules/wodx-creation/data/people-haudenosaunee.mjs"));
// Names made by pattern from the same people's recorded parts (B5600) count as the people's own
const {PATTERNED} = await import(join(root, "modules/wodx-creation/data/people-patterned.mjs"));
const split = s => s.split(",").map(x => x.trim()).filter(Boolean);
const WEST = W.cultureOf("north-america-west");
const people = (era, origin, n = 200) => Array.from({length: n}, (_, i) => PR.nameOf({rand: G.stream("np", origin + era, i),
  tables: id => G.resolveTable(PEOPLE_TABLES, id, {era, culture: WEST}), origin, sex: i % 2 ? "female" : "male"}));
const LISTS = [NP.CR_MEN, NP.CR_WOMEN, NP.CR_CLANS, NP.CR_FAMILY, NP.BF_MEN, NP.BF_WOMEN, NP.BF_BANDS, NP.BF_FAMILY, NP.AH_MEN, NP.AH_BANDS, NP.AH_FAMILY];

test("plains north: no list repeats itself, no pronoun words", () => {
  for ( const l of LISTS.map(split) ) {
    assert.equal(new Set(l).size, l.length, l.join());
    for ( const n of l ) assert.doesNotMatch(n, /\b(he|she|her|hers|him|his)\b/i, n);
  }
});

test("plains north: a Crow clan from the mother, Blackfoot and Arapaho women by division, family names after 1800", () => {
  for ( const era of ["medieval", "early-modern"] ) {
    const cr = people(era, "crow");
    assert.ok(cr.every(p => split(NP.CR_CLANS).map(HN.clanName).includes(p.family) && !p.name.includes("{")), `crow ${era}`);
    assert.ok(cr.every((p, i) => i % 2 || (split(NP.CR_MEN).includes(p.given) || PATTERNED.crow.male.includes(p.given))), "no church names for the Crow before 1800");
    for ( const [o, bands] of [["blackfoot", NP.BF_BANDS], ["arapaho", NP.AH_BANDS]] ) {
      const ps = people(era, o);
      assert.ok(ps.every(p => !p.family && !p.name.includes("{")), `${o} ${era}`);
      assert.ok(ps.some(p => split(bands).map(b => `A woman of ${b}`).includes(p.name)), `${o}: a woman of a division`);
    }
  }
  for ( const [o, fam] of [["crow", NP.CR_FAMILY], ["blackfoot", NP.BF_FAMILY], ["arapaho", NP.AH_FAMILY]] ) {
    assert.ok(people("modern", o, 60).every(p => split(fam).includes(p.family)), o);
  }
});

test("plains north: the three peoples are in the West's mix", () => {
  const origin = era => G.resolveTable(PEOPLE_TABLES, "people.origin", {era, culture: WEST})?.results.map(r => r.text) ?? [];
  for ( const o of ["crow", "blackfoot", "arapaho"] ) assert.ok(origin("medieval").includes(o) && origin("industrial").includes(o), o);
});
