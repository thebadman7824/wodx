import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Names follow each year's customs (desk nm1, B6250 to B6253) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const NC = await imp("modules/wodx-creation/data/name-customs.mjs");
const PR = await imp("modules/wodx-creation/scripts/people-rules.mjs");
const {PEOPLE_TABLES} = await imp("modules/wodx-creation/data/people.mjs");
const G = await imp("modules/wodx-chronicle/scripts/gen-core.mjs");
const RS = await imp("modules/wodx-npc/scripts/resident-rules.mjs");

const lookup = (era, culture = "bohemia") => id => G.resolveTable(PEOPLE_TABLES, id, {era, culture});
const people = (n, {era, culture, year, origin, sex = "male", trade = "farmer", later = null}) => Array.from({length: n}, (_, i) =>
  PR.person({rand: G.stream("nm1", `${origin}:${year}`, i), tables: lookup(era, culture), era, culture, sex, trade, origin, year, later}));

test("customs: every stage has a source, stages run oldest first, years in range", () => {
  for ( const [o, c] of Object.entries(NC.NAME_CUSTOMS) ) {
    assert.ok(c.source && c.source.length > 10, `${o}: no source`);
    assert.ok(c.stages.length, o);
    c.stages.forEach((s, i) => {
      assert.ok(["given", "byname", "settling", "family"].includes(s.form), `${o}: ${s.form}`);
      if ( i ) assert.ok(s.from > c.stages[i - 1].from, `${o}: stages out of order`);
      if ( s.form === "settling" ) assert.ok(s.to > s.from && s.a >= 0 && s.b <= 1, o);
    });
    assert.doesNotMatch(c.source, /\b(he|she|her|him|his)\b/i, o);
  }
});

test("customs: the dated laws fall where the sources put them", () => {
  assert.equal(NC.customFor("turkish", 1933).form, "byname");
  assert.equal(NC.customFor("turkish", 1934).form, "family");
  assert.equal(NC.customFor("jewish", 1786).form, "byname");
  assert.equal(NC.customFor("jewish", 1787).form, "family");
  assert.equal(NC.customFor("japanese", 1860).form, "given");
  assert.equal(NC.customFor("japanese", 1860, {noble: true}).form, "family", "a samurai bears the family name");
  assert.equal(NC.customFor("japanese", 1876).form, "family");
  assert.equal(NC.customFor("thai", 1912).form, "given");
  assert.equal(NC.customFor("thai", 1913).form, "family");
  assert.equal(NC.customFor("persian", 1925).form, "family");
  assert.equal(NC.customFor("dutch", 1811).form, "family");
  assert.equal(NC.customFor("hawaiian", 1859).form, "given");
  assert.equal(NC.customFor("filipino", 1849).form, "family");
  assert.equal(NC.customFor("steppe", 2020).form, "given", "Mongolia: clan names on cards made no real change");
  assert.equal(NC.customFor("czech", 1250).form, "byname");
  const s = NC.customFor("czech", 1500);
  assert.equal(s.form, "settling");
  assert.ok(s.share > 0.1 && s.share < 1);
  assert.equal(NC.customFor("czech", 1250, {noble: true}).form, "family", "a lord's seat name is inherited");
  assert.equal(NC.customFor("czech", null), null, "no year: the tables stand as they are");
  assert.equal(NC.customFor("nahua", 1500), null, "an unlisted people keeps its tables");
});

test("people: a Czech peasant of 1250 bears a byname of their own; a household does not share it", () => {
  const ps = people(20, {era: "medieval", year: 1250, origin: "czech"});
  for ( const p of ps ) {
    assert.equal(p.nameCustom.form, "byname");
    assert.equal(p.nameCustom.hereditary, false);
    assert.ok(p.family, p.name);
  }
  assert.match(PR.noteOf(ps[0]), /belongs to this person alone/);
  // By 1690 most Czech families pass the name down
  const late = people(60, {era: "early-modern", year: 1690, origin: "czech"});
  assert.ok(late.filter(p => p.nameCustom.hereditary).length > 45, "most are inherited by 1690");
});

test("people: the draws other than the name are the same as before (seeds keep their people)", () => {
  const rand = () => G.stream("keep", "x", 7);
  const a = PR.person({rand: rand(), tables: lookup("medieval"), era: "medieval", culture: "bohemia", sex: "male", origin: "czech"});
  const b = PR.person({rand: rand(), tables: lookup("medieval"), era: "medieval", culture: "bohemia", sex: "male", origin: "czech", year: 1250});
  for ( const k of ["given", "trade", "nature", "demeanor", "motive", "secret", "look", "willpower"] ) assert.deepEqual(a[k], b[k], k);
  assert.equal(a.nameCustom, undefined, "no year, no custom");
});

test("people: a Jew of Bohemia in 1790 bears a family name, not ben or bat", () => {
  const ps = people(30, {era: "early-modern", year: 1790, origin: "jewish", later: lookup("industrial")});
  for ( const p of ps ) {
    assert.equal(p.nameCustom.form, "family");
    assert.doesNotMatch(p.family, /^(ben|bat) /, p.name);
  }
  const old = people(30, {era: "early-modern", year: 1700, origin: "jewish"});
  assert.ok(old.some(p => /^ben /.test(p.family)), "before 1787 the father's name is still borne");
});

test("households: kin of 1250 keep their own bynames; a child of a ben-or-bat or a suffix people takes the father's", () => {
  const h = {region: "R", kind: "home", household: {trade: "smith", people: [{role: "smith"}, {role: "partner"}, {role: "child"}, {role: "child"}]}};
  const mk = (i, {sex}) => {
    const s = sex === "any" ? (i % 2 ? "female" : "male") : sex;
    return {sex: s, origin: "czech", given: ["Jan", "Bětka", "Vít", "Ofka"][i % 100] ?? "Petr", family: ["Kovář", "Ryšavá", "Malý", "z Prahy"][i % 100] ?? "Tesař",
      nameCustom: {form: "byname", hereditary: false, childNames: null}};
  };
  const out = RS.nameHousehold(RS.planHousehold(h), mk, () => 0.5, {year: 1250});
  assert.equal(out[0].name, "Jan Kovář");
  assert.notEqual(out[2].family, "Kovář", "the child keeps their own byname");
  // Sweden in 1700: the children are Eriksson and Eriksdotter after the father
  const norse = (i, {sex}) => {
    const s = sex === "any" ? (i === 3 ? "female" : "male") : sex;
    return {sex: s, origin: "norse", given: ["Erik", "Karin", "Nils", "Anna"][i % 100] ?? "Per", family: ["Olofsson", "Larsdotter", "Persson", "Johansdotter"][i % 100] ?? "Persson",
      nameCustom: {form: "byname", hereditary: false, childNames: i % 100 === 0 ? {male: "Eriksson", female: "Eriksdotter"} : null}};
  };
  const sv = RS.nameHousehold(RS.planHousehold(h), norse, () => 0.95, {year: 1700});
  assert.equal(sv[0].name, "Erik Olofsson");
  assert.equal(sv[2].family, "Eriksson");
  assert.equal(sv[3].family, "Eriksdotter");
  assert.notEqual(sv[1].family, "Olofsson", "the partner keeps their own name");
});

test("childNamesOf: patterns and listed pairs only", async () => {
  const {WORLD_PEOPLE_TABLES} = await imp("modules/wodx-creation/data/people-world.mjs");
  const lk = era => id => G.resolveTable(WORLD_PEOPLE_TABLES, id, {era, culture: null});
  const n = PR.childNamesOf(lk("early-modern"), "norse", "Erik");
  assert.deepEqual(n, {male: "Eriksson", female: "Eriksdotter"});
  assert.deepEqual(PR.childNamesOf(lk("industrial"), "turkish", "Mehmed"), {male: "Mehmedoğlu", female: "Mehmedoğlu"});
  assert.equal(PR.childNamesOf(lk("early-modern"), "norse", "Zzz"), null, "no guessed form");
});
