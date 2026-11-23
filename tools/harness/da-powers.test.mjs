import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {join, dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {powersFor, gargoyleRitual, overstimulation, revelationDiff} from "../../modules/wodx-actions/scripts/kindred-rules.js";
import {BOOK_RITUALS} from "../../modules/wodx-actions/scripts/book-rituals.js";

// B7662-B7663: the powers, rituals and Auspex rules the full check of V20 Dark Ages found missing (pp. 194-309).
const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const powers = JSON.parse(readFileSync(join(root, "modules/wodx-actions/data/disciplines-daw.json"), "utf8")).powers;

test("Flight, the four lesser paths and Genius Loci have five levels each", () => {
  for ( const d of ["Flight", "Thaumaturgy: Creatio Ignis", "Thaumaturgy: Iter Pernix", "Thaumaturgy: Potestas Motus", "Thaumaturgy: Potestas Tempestatum", "Koldunic Sorcery: Genius Loci"] ) {
    const rows = powers.filter(p => p.d === d);
    assert.deepEqual(rows.map(p => p.l), [1, 2, 3, 4, 5], d);
  }
  assert.equal(new Set(powers.map(p => p.id)).size, powers.length, "ids are unique");
  const ig = powers.find(p => p.id === "thaumaturgy-creatio-ignis-3");
  assert.equal(ig.diff, 6); assert.equal(ig.c, "b1"); assert.equal(ig.trad, "thaum");
  assert.equal(powers.find(p => p.id === "koldunic-sorcery-genius-loci-5").diff, 9);
});

test("a sheet's Flight and path dots reach the rows", () => {
  const got = powersFor(powers, [{name: "Flight", value: 2}, {name: "Creatio Ignis", value: 1}, {name: "Koldunic Sorcery: Genius Loci", value: 3}]);
  assert.deepEqual(got.filter(p => p.d === "Flight").map(p => p.l), [1, 2]);
  assert.deepEqual(got.filter(p => p.d === "Thaumaturgy: Creatio Ignis").map(p => p.l), [1]);
  assert.deepEqual(got.filter(p => /Genius Loci/.test(p.d)).map(p => p.l), [1, 2, 3]);
});

test("the three Necromancy rituals and the five Gargoyle Rituals", () => {
  const L = BOOK_RITUALS.v20da.list, by = n => L.find(r => r.n === n);
  assert.equal(by("Bastone del Diavolo")?.lvl, "4");
  assert.equal(by("Treasures of Hades")?.lvl, "5");
  assert.equal(by("Orphic Sojourn")?.lvl, "5");
  assert.deepEqual(L.filter(r => r.gargoyle).map(r => r.n).sort(),
    ["Donning the Mask of Shadows", "Firewalker", "Heart of Stone", "Mirror of Second Sight", "Stone Slumber"]);
  assert.equal(gargoyleRitual("Gargoyle", by("Heart of Stone")).ok, true);
  assert.equal(gargoyleRitual("Tremere", by("Heart of Stone")).ok, false);
  assert.equal(gargoyleRitual("Gargoyle", by("Blood Contract")).ok, false);
});

test("overstimulation and sudden revelations", () => {
  assert.deepEqual(overstimulation({willpower: 6}), {diff: 4, turns: 4, penalty: 2});
  assert.deepEqual(overstimulation({willpower: 10, intensity: 3}), {diff: 7, turns: 1, penalty: 2});
  assert.equal(revelationDiff(2), 4); assert.equal(revelationDiff(12), 9); assert.equal(revelationDiff(""), 6);
});

test("the 23 combination Disciplines of V20 Dark Ages", async () => {
  const C = JSON.parse(readFileSync(join(root, "modules/wodx-actions/data/rules/vampire/combinations-v20da.json"), "utf8")).rows;
  assert.equal(C.length, 23);
  assert.equal(new Set(C.map(r => r.id)).size, 23);
  const E = await import("../../modules/wodx-actions/scripts/effects-rules.js");
  for ( const r of C ) {
    assert.ok(r.needs.length >= 2 && r.xp > 0 && r.p >= 313 && r.p <= 317 && r.e.length <= 220, r.id);
    for ( const k of r.k ) assert.ok(E.KEYWORDS[k], `${r.id} ${k}`);
    assert.ok(!/\b(he|she|him|her|his|hers)\b/i.test(r.e), `${r.id}: no gendered pronoun`);
  }
  const heads = [...new Set([...powers, ...C].map(p => p.d))];
  const got = powersFor([...powers, ...C], [{name: "Auspex", value: 1}, {name: "Celerity", value: 1}, {name: "Fortitude", value: 1}]);
  const names = got.filter(p => p.needs).map(p => p.n).sort();
  assert.deepEqual(names, ["Guardian Vigil", "Hand of the Master Artisan"]);
  const v = powersFor(C, [{name: "Auspex", value: 4}, {name: "Valeren (Warrior)", value: 4}]).map(p => p.n);
  assert.ok(v.includes("Eye of Unforgiving Heaven") && v.includes("Glare of Lies"), "Glare of Lies takes any Valeren");
  assert.ok(heads.length > 0);
});
