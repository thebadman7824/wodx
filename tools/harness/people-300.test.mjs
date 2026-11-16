import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* Peoples raised to 300 names (Ben 2026-11-13, B3310 on) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PW = await import(join(root, "modules/wodx-creation/data/people-world.mjs"));

test("raised peoples: 300 distinct names or more, no pronoun words, no repeats within a list", () => {
  assert.ok(PW.RAISED.length >= 1);
  for ( const o of PW.RAISED ) {
    const all = PW.namesOf(o);
    assert.ok(all.size >= 300, `${o}: ${all.size}`);
    for ( const n of all ) assert.doesNotMatch(n, /\b(he|she|her|hers|him|his)\b/i, `${o}: ${n}`);
  }
});

test("raised peoples: every list in every age has names", () => {
  const tables = PW.WORLD_PEOPLE_TABLES;
  for ( const o of PW.RAISED ) for ( const id of [`names.male.${o}`, `names.female.${o}`] ) {
    const t = tables.filter(x => x.id === id);
    assert.ok(t.length, id);
    for ( const x of t ) {
      assert.ok(x.results.length >= 50, `${x.name}: ${x.results.length}`);
      const texts = x.results.map(r => r.text);
      assert.equal(new Set(texts).size, texts.length, `${x.name} repeats a name`);
    }
  }
});

test("raised peoples: lists kept in the core People tables (German in Bohemia before 1900) have 50 names too", async () => {
  // B5640: the gate draws a people's names in every age, and the old German lists live in data/people.mjs
  const {PEOPLE_TABLES} = await import(join(root, "modules/wodx-creation/data/people.mjs"));
  for ( const o of PW.RAISED ) for ( const x of PEOPLE_TABLES.filter(t => t.id === `names.male.${o}` || t.id === `names.female.${o}`) ) {
    const texts = x.results.map(r => r.text);
    assert.ok(texts.length >= 50, `${x.name}: ${texts.length}`);
    assert.equal(new Set(texts).size, texts.length, `${x.name} repeats a name`);
  }
});

test("the release notes' counts and examples hold (B6410)", () => {
  assert.equal(PW.namesOf("english").size, 501);
  assert.equal(PW.namesOf("spanish").size, 437);
  assert.ok(PW.namesOf("zulu").size >= 402);
  for ( const n of ["Ntshingwayo", "Khoza", "Dabulamanzi", "Nandi"] ) assert.ok(PW.namesOf("zulu").has(n), n);
  for ( const n of ["Kang", "Gam-chan"] ) assert.ok(PW.namesOf("korean").has(n), n);
});

test("B6546: Sámi and Khmer hold 300 distinct names (old lists still short)", () => {
  for ( const o of PW.RAISED_SHORT_OLD ) {
    assert.ok(PW.namesOf(o).size >= 300, `${o}: ${PW.namesOf(o).size}`);
    for ( const n of PW.namesOf(o) ) assert.doesNotMatch(n, /\b(he|she|her|hers|him|his)\b/i, `${o}: ${n}`);
    for ( const t of PW.WORLD_PEOPLE_TABLES.filter(x => x.id.endsWith(`.${o}`)) ) {
      const texts = t.results.map(r => r.text);
      assert.equal(new Set(texts).size, texts.length, `${t.name} repeats a name`);
    }
  }
});
