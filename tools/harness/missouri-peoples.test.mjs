import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* The village peoples of the Missouri in the People generator (B4130 to B4133): own names and villages before 1800, family names after */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const G = await import(join(root, "modules/wodx-chronicle/scripts/gen-core.mjs"));
const W = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));
const {PEOPLE_TABLES} = await import(join(root, "modules/wodx-creation/data/people.mjs"));
const PR = await import(join(root, "modules/wodx-creation/scripts/people-rules.mjs"));
// Names made by pattern from the same people's recorded parts (B5600) count as the people's own
const {PATTERNED} = await import(join(root, "modules/wodx-creation/data/people-patterned.mjs"));
const made = (o, sex) => PATTERNED[o]?.[sex] ?? [];
const MI = await import(join(root, "modules/wodx-creation/data/people-missouri.mjs"));
const split = s => s.split(",").map(x => x.trim()).filter(Boolean);
const WEST = W.cultureOf("north-america-west");
const people = (era, origin, n = 200) => Array.from({length: n}, (_, i) => PR.nameOf({rand: G.stream("mo", origin + era, i),
  tables: id => G.resolveTable(PEOPLE_TABLES, id, {era, culture: WEST}), origin, sex: i % 2 ? "female" : "male"}));
const PEOPLES = {mandan: [MI.MA_MEN, MI.MA_WOMEN, MI.MA_VILLAGES, MI.MA_FAMILY], hidatsa: [MI.HI_MEN, MI.HI_WOMEN, MI.HI_VILLAGES, MI.HI_FAMILY],
  arikara: [MI.AR_MEN, "", MI.AR_VILLAGES, MI.AR_FAMILY], pawnee: [MI.PA_MEN, "", MI.PA_BANDS, MI.PA_FAMILY]};

test("missouri: no list repeats itself, no pronoun words", () => {
  for ( const lists of Object.values(PEOPLES) ) for ( const l of lists.map(split) ) {
    assert.equal(new Set(l).size, l.length, l.join());
    for ( const n of l ) assert.doesNotMatch(n, /\b(he|she|her|hers|him|his)\b/i, n);
  }
});

test("missouri: own names before 1800 with no church names, women of a village, family names after", () => {
  for ( const [o, [men, women, villages, family]] of Object.entries(PEOPLES) ) {
    for ( const era of ["medieval", "early-modern"] ) {
      const ps = people(era, o);
      assert.ok(ps.every(p => p.name.trim() && !p.name.includes("{") && !p.family), `${o} ${era}: ${ps.find(p => p.name.includes("{") || p.family)?.name}`);
      assert.ok(ps.filter((p, i) => i % 2 === 0).every(p => (split(men).includes(p.name) || made(o, "male").includes(p.name))), `${o} ${era} men`);
      const byVillage = split(villages).map(v => `A woman of ${v}`);
      assert.ok(ps.filter((p, i) => i % 2).every(p => (split(women).includes(p.name) || made(o, "female").includes(p.name)) || byVillage.includes(p.name)), `${o} ${era} women`);
      assert.ok(ps.some(p => byVillage.includes(p.name)), `${o}: a woman of a village`);
    }
    assert.ok(people("modern", o, 60).every(p => split(family).includes(p.family) && !p.name.includes("{")), `${o} modern`);
  }
});

test("missouri: the four peoples are in the West's mix from 1197", () => {
  const origin = era => G.resolveTable(PEOPLE_TABLES, "people.origin", {era, culture: WEST})?.results.map(r => r.text) ?? [];
  for ( const o of Object.keys(PEOPLES) ) assert.ok(origin("medieval").includes(o) && origin("early-modern").includes(o), o);
  assert.ok(origin("industrial").includes("pawnee") && origin("modern").includes("hidatsa"));
});
