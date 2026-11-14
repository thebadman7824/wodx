import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* The Plains peoples in the People generator (B3820 to B3824): own names and band bynames before 1800, family names after */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const G = await import(join(root, "modules/wodx-chronicle/scripts/gen-core.mjs"));
const W = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));
const {PEOPLE_TABLES} = await import(join(root, "modules/wodx-creation/data/people.mjs"));
const PR = await import(join(root, "modules/wodx-creation/scripts/people-rules.mjs"));
const PL = await import(join(root, "modules/wodx-creation/data/people-plains.mjs"));
const HN = await import(join(root, "modules/wodx-creation/data/people-haudenosaunee.mjs"));
const split = s => s.split(",").map(x => x.trim()).filter(Boolean);
const WEST = W.cultureOf("north-america-west");
const people = (era, origin, n = 300) => Array.from({length: n}, (_, i) => PR.nameOf({rand: G.stream("pl", origin, i),
  tables: id => G.resolveTable(PEOPLE_TABLES, id, {era, culture: WEST}), origin, sex: i % 2 ? "female" : "male"}));
const PEOPLES = {lakota: [PL.OS_MEN, PL.OS_WOMEN, PL.OS_BANDS, PL.OS_FAMILY], cheyenne: [PL.CH_MEN, PL.CH_WOMEN, PL.CH_BANDS, PL.CH_FAMILY],
  comanche: [PL.CO_MEN, PL.CO_WOMEN, PL.CO_BANDS, PL.CO_FAMILY], kiowa: [PL.KI_MEN, "", PL.KI_BANDS, PL.KI_FAMILY]};

test("plains: the Oceti Sakowin reach 300 names, no list repeats itself, no pronoun words", () => {
  const os = new Set([PL.OS_MEN, PL.OS_WOMEN, PL.OS_FAMILY, HN.HN_CHURCH.male, HN.HN_CHURCH.female].flatMap(split));
  assert.ok(os.size >= 300, `${os.size} names`);
  for ( const lists of Object.values(PEOPLES) ) for ( const l of lists.map(split) ) {
    assert.equal(new Set(l).size, l.length, l.join());
    for ( const n of l ) assert.doesNotMatch(n, /\b(he|she|her|hers|him|his)\b/i, n);
  }
});

test("plains: own names before 1800 with no church names, women of a band where none is recorded", () => {
  for ( const [o, [men, women, bands]] of Object.entries(PEOPLES) ) {
    for ( const era of ["medieval", "early-modern"] ) {
      const ps = people(era, o);
      assert.ok(ps.every(p => !p.name.includes("{") && p.name.trim()), `${o} ${era}: ${ps.find(p => p.name.includes("{"))?.name}`);
      assert.ok(ps.filter((p, i) => i % 2 === 0).every(p => split(men).includes(p.name)), `${o} ${era} men: ${ps.find((p, i) => i % 2 === 0 && !split(men).includes(p.name))?.name}`);
      const byBand = split(bands).map(b => `A woman of ${b}`);
      assert.ok(ps.filter((p, i) => i % 2).every(p => split(women).includes(p.name) || byBand.includes(p.name)), `${o} ${era} women`);
      assert.ok(ps.some(p => byBand.includes(p.name)), `${o}: a woman of a band`);
    }
  }
});

test("plains: a church given name and a family name from 1800", () => {
  for ( const [o, [, , , family]] of Object.entries(PEOPLES) ) for ( const era of ["industrial", "modern"] ) {
    const ps = people(era, o, 100);
    assert.ok(ps.every(p => split(family).includes(p.family)), `${o} ${era}: ${ps.find(p => !split(family).includes(p.family))?.name}`);
  }
});

test("plains: the American West has its peoples from 1197, a share later, and the East borrows none", () => {
  const origin = (era, culture) => G.resolveTable(PEOPLE_TABLES, "people.origin", {era, culture})?.results.map(r => r.text) ?? [];
  assert.deepEqual(origin("medieval", WEST), ["lakota", "cheyenne", "comanche", "kiowa"]);
  assert.ok(origin("industrial", WEST).includes("lakota") && origin("industrial", WEST).includes("anglo"));
  assert.ok(origin("modern", WEST).includes("lakota"));
  assert.ok(!origin("medieval", W.cultureOf("north-america-east")).includes("lakota"));
  assert.equal(W.hasPeopleIn("north-america-west", 1197), true, "names for the West before the Spanish");
});
