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
