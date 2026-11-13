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
