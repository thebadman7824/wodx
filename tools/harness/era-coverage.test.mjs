import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import * as G from "../../modules/wodx-chronicle/scripts/gen-core.mjs";
import {NIGHT_TABLES} from "../../modules/wodx-storyteller/data/night-tables.mjs";
import {PEOPLE_TABLES} from "../../modules/wodx-creation/data/people.mjs";
import {COMMON} from "../../modules/wodx-creation/scripts/people-rules.mjs";
import * as F from "../../modules/wodx-interactables/scripts/fill-rules.mjs";
import * as S from "../../modules/wodx-library/scripts/shelf-rules.mjs";
import {isDarkAgesEra as faeDA} from "../../modules/wodx-actions/scripts/fae-da-rules.js";
import {isDarkAgesEra as mageDA} from "../../modules/wodx-actions/scripts/mage-da-rules.js";
import {werewolfSet} from "../../modules/wodx-creation/scripts/first-change.mjs";

/* The era audit (2026-11-10): every era gets content that fits it, 1197 to the World of Future Darkness */

test("era groups: the profile decides, mid-century between the wars and the modern era, future for Future Darkness", () => {
  assert.equal(G.eraGroupFor("dark-ages", 1200), "medieval");
  assert.equal(G.eraGroupFor("long-night", 1400), "medieval");
  assert.equal(G.eraGroupFor("renaissance", 1700), "early-modern");
  assert.equal(G.eraGroupFor("great-war", 1916), "industrial");
  assert.equal(G.eraGroupFor("great-war", 1950), "mid-century");
  assert.equal(G.eraGroupFor("modern", 1995), "modern");
  assert.equal(G.eraGroupFor("future-darkness", 2050), "future");
  assert.equal(G.eraGroupFor("time-of-future-judgement", 2099), "future");
  assert.equal(G.eraGroupFor("classical", null), "ancient");
  assert.equal(G.eraGroupFor("great-war", null), "industrial", "a locked era ignores the year");
});

test("tables fall back along the group chain, and a group's own table wins", () => {
  const all = [{id: "x", era: ["modern"], results: [{text: "modern"}]}, {id: "x", results: [{text: "plain"}]},
    {id: "y", era: ["industrial"], results: [{text: "ind"}]}, {id: "y", era: ["mid-century"], results: [{text: "mid"}]}];
  assert.equal(G.resolveTable(all, "x", {era: "future"}).results[0].text, "modern");
  assert.equal(G.resolveTable(all, "x", {era: "medieval"}).results[0].text, "plain");
  assert.equal(G.resolveTable(all, "y", {era: "mid-century"}).results[0].text, "mid");
  assert.equal(G.resolveTable(all, "y", {era: "ancient"}), null);
  // Prologues borrow the medieval people tables
  assert.ok(G.resolveTable(PEOPLE_TABLES, "names.given.male.czech", {era: "ancient", culture: "bohemia"})
    ?? G.resolveTable(PEOPLE_TABLES, "people.trade", {era: "ancient", culture: "bohemia"}));
});

test("the night's draw and the people have mid-century and future tables of their own", () => {
  for ( const id of ["night.encounter.town", "night.encounter.wilds", "night.rumour", "aid.symbol"] ) {
    for ( const g of ["mid-century", "future"] ) {
      const t = G.resolveTable(NIGHT_TABLES, id, {era: g});
      assert.ok(t?.era?.includes(g), `${id} ${g}`);
      assert.ok(t.results.length >= 10, `${id} ${g} has ten lines`);
    }
  }
  for ( const g of ["mid-century", "future"] ) {
    const t = G.resolveTable(PEOPLE_TABLES, "people.trade", {era: g, culture: "bohemia"});
    assert.ok(t?.era?.includes(g), `trades ${g}`);
    assert.ok(COMMON[g]?.length >= 10, `common abilities ${g}`);
  }
});

test("the Long Night keeps the Dark Ages books for Mage and the fae", () => {
  for ( const f of [faeDA, mageDA] ) {
    assert.ok(f("dark-ages")); assert.ok(f("long-night")); assert.ok(!f("renaissance")); assert.ok(!f("modern"));
  }
});

test("the First Change takes the Werewolf ability set the era profile names", () => {
  assert.equal(werewolfSet({id: "renaissance", system: {werewolf: "darkages"}}), "darkages");
  assert.equal(werewolfSet({id: "wild-west", system: {werewolf: "victorian"}}), "victorian");
  assert.equal(werewolfSet({id: "great-war", system: {werewolf: "victorian"}}), "victorian");
  assert.equal(werewolfSet({id: "future-darkness", system: {werewolf: "modern"}}), "modern");
  assert.equal(werewolfSet({id: "long-night"}), "darkages");
  assert.equal(werewolfSet(null), "modern");
});

test("2099 fills containers with Future Darkness gear; the shelves show the eras each era keeps", () => {
  const items = [{name: "Smartgun", type: "Ranged Weapon", flags: {"wodx-library": {eras: ["future-darkness"], kind: "ranged"}}}];
  assert.equal(F.candidates(items, {era: "time-of-future-judgement", place: "armory", container: "chest"}).length, 1);
  assert.equal(F.candidates(items, {era: "modern", place: "armory", container: "chest"}).length, 0);
  assert.ok(S.fits({lines: ["vampire"], eras: ["dark-ages"]}, {line: "vampire", era: "long-night"}));
  assert.ok(S.fits({lines: ["vampire"], eras: ["modern"]}, {line: "vampire", era: "time-of-judgment"}));
  assert.ok(!S.fits({lines: ["vampire"], eras: ["dark-ages"]}, {line: "vampire", era: "modern"}));
});

test("Wraith: the Great War Arcanoi serve 1914 to 1918 only, not the years after with no era book", async () => {
  const WR = await import("../../modules/wodx-actions/scripts/wraith-rules.js");
  assert.equal(WR.libraryFor("great-war", 1916), "gw");
  assert.equal(WR.libraryFor("great-war", null), "gw");
  assert.equal(WR.libraryFor("great-war", 1950), "w20");
  assert.equal(WR.libraryFor("modern", 1995), "w20");
});
