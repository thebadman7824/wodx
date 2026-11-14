import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* The Taíno in the People generator (B4660 to B4663): the Caribbean named from 1197, church names at baptism from 1493 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const G = await import(join(root, "modules/wodx-chronicle/scripts/gen-core.mjs"));
const W = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));
const {PEOPLE_TABLES} = await import(join(root, "modules/wodx-creation/data/people.mjs"));
const PR = await import(join(root, "modules/wodx-creation/scripts/people-rules.mjs"));
const T = await import(join(root, "modules/wodx-creation/data/people-taino.mjs"));
const split = s => s.split(",").map(x => x.trim()).filter(Boolean);
const CB = W.cultureOf("caribbean");
const people = (era, n = 200) => Array.from({length: n}, (_, i) => PR.nameOf({rand: G.stream("ta", era, i),
  tables: id => G.resolveTable(PEOPLE_TABLES, id, {era, culture: CB}), origin: "taino", sex: i % 2 ? "female" : "male"}));
const origin = era => G.resolveTable(PEOPLE_TABLES, "people.origin", {era, culture: CB})?.results.map(r => r.text) ?? [];

test("taino: no list repeats itself, no pronoun words", () => {
  for ( const l of [T.TA_MEN, T.TA_WOMEN, T.TA_TOWNS, T.TA_FAMILY].map(split) ) {
    assert.equal(new Set(l).size, l.length, l.join());
    for ( const n of l ) assert.doesNotMatch(n, /\b(he|she|her|hers|him|his)\b/i, n);
  }
});

test("taino: own names before 1492, church names after, family names from 1800; the Caribbean from 1197", () => {
  const med = people("medieval");
  assert.ok(med.filter((p, i) => i % 2 === 0).every(p => split(T.TA_MEN).includes(p.name) && !p.family));
  assert.ok(med.some(p => /^A woman of /.test(p.name)) && med.some(p => split(T.TA_WOMEN).includes(p.name)));
  assert.ok(people("early-modern").some((p, i) => i % 2 === 0 && /^(Juan|Pedro|Francisco|Diego|Alonso|Hernando|Cristóbal|Andrés|Enrique|Gonzalo|Luis|Martín) /.test(p.name)));
  assert.ok(people("modern", 60).every(p => split(T.TA_FAMILY).includes(p.family)));
  assert.deepEqual(origin("medieval"), ["taino"]);
  assert.ok(["akan", "yoruba", "spanish", "taino"].every(o => origin("early-modern").includes(o)));
  assert.equal(W.hasPeopleIn("caribbean", 1300), true);
});
