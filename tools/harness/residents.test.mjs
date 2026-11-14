import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* WoDX NPC 0.46.0: the residents of a generated town (B2500 to B2504) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const RS = await import(join(root, "modules/wodx-npc/scripts/resident-rules.mjs"));
const RR = await import(join(root, "modules/wodx-npc/scripts/routine-rules.mjs"));
const A = await import(join(root, "modules/wodx-interactables/scripts/adopt-rules.mjs"));

/** A town sidecar, as the regions adopting it would leave them. */
function regionsOf(name) {
  const d = A.parseSidecar(readFileSync(join(root, `tools/mapgen/samples/${name}.wodx.json`), "utf8")).data;
  return d.regions.map(r => ({uuid: `Scene.s.Region.${r.id}`, name: r.label, flags: {
    ...(r.household ? {"wodx-interactables": {household: r.household}} : {}), ...(r.place ? {"wodx-npc": {place: r.place}} : {})}}));
}
/** A stand-in for the People generator: seeded by row, Czech names in both forms. */
const MALE = ["Jan", "Petr", "Václav"], FEMALE = ["Anna", "Ludmila", "Kateřina"];
function fakeDraw(i, {sex}) {
  const s = sex === "any" ? (i % 2 ? "female" : "male") : sex;
  return {sex: s, origin: "czech", given: (s === "female" ? FEMALE : MALE)[i % 3], family: s === "female" ? "Nováková" : "Novák", name: ""};
}

test("residents: every household of the sample towns is read, with its building as the place", () => {
  for ( const n of ["hohenhausen", "birbach", "rotheim-a2", "schondorf"] ) {
    const regs = regionsOf(n);
    const list = RS.householdsOn(regs);
    assert.ok(list.length >= 10, n);
    for ( const h of list ) {
      assert.ok(regs.some(r => r.uuid === h.region), h.household.id);
      assert.ok(h.household.people.length > 0);
      assert.deepEqual(h.seeded, []);
    }
  }
  assert.deepEqual(RS.householdsOn([{uuid: "x", flags: {}}, {uuid: "y", flags: {"wodx-interactables": {household: {people: []}}}}]), []);
});

test("residents: each role gets a routine that exists and a home; trades kept at home work there", () => {
  for ( const n of ["hohenhausen", "schondorf", "rotheim-a2"] ) for ( const h of RS.householdsOn(regionsOf(n)) ) {
    for ( const year of [1197, 1600, 1890, 1995, 2040] ) {
      const plans = RS.planHousehold(h, {year});
      assert.equal(plans.length, h.household.people.length);
      for ( const p of plans ) {
        assert.ok(RR.PRESETS[p.preset], `${h.household.id} ${p.role} ${p.preset}`);
        assert.ok(RR.presetBlocks(p.preset, RR.ageOf(year)).length, p.preset);
        assert.ok(p.roles.home === h.region || p.roles.work === h.region);
      }
      assert.equal(plans[0].master, true);
    }
  }
  const smithy = {region: "R", kind: "workplace", household: {trade: "smith", people: [{role: "smith"}, {role: "partner"}, {role: "child"}, {role: "apprentice"}, {role: "elder"}]}};
  const p = RS.planHousehold(smithy, {year: 1197});
  assert.equal(p[0].roles.work, "R");
  assert.equal(p[2].preset, "child");
  assert.equal(p[2].template, "child");
  assert.equal(p[3].roles.work, "R");
  assert.equal(p[4].preset, "recluse");
  assert.equal(p[1].label, "the smith's partner");
  // A modern nurse goes out to the hospital; a priest keeps the chapel
  const nurse = RS.planHousehold({region: "H", kind: "home", household: {trade: "nurse", people: [{role: "nurse"}]}}, {year: 1995})[0];
  assert.equal(nurse.preset, "orderly");
  assert.equal(nurse.roles.work, undefined);
  const priest = RS.planHousehold({region: "C", kind: "church", household: {trade: "priest", people: [{role: "priest"}, {role: "servant"}]}}, {year: 1300});
  assert.equal(priest[0].preset, "priest");
  assert.equal(priest[0].roles.church, "C");
  assert.equal(priest[1].preset, "servant");
  // The orderly's routine belongs to 1780 on; before it a nurse keeps the labourer's hours
  assert.equal(RS.planHousehold({region: "H", kind: "home", household: {trade: "nurse", people: [{role: "nurse"}]}}, {year: 1500})[0].preset, "labourer");
});

test("residents: a household shares its family name, in the form for each member's sex", () => {
  assert.equal(RS.czechFeminine("Novák"), "Nováková");
  assert.equal(RS.czechFeminine("Černý"), "Černá");
  assert.equal(RS.czechFeminine("Svoboda"), "Svobodová");
  assert.equal(RS.czechFeminine("Jelínek"), "Jelínková");
  assert.equal(RS.czechFeminine("Němec"), "Němcová");
  assert.equal(RS.czechFeminine("Krejčí"), "Krejčová");
  assert.equal(RS.czechFeminine("z Plzně"), "z Plzně");
  assert.equal(RS.germanFeminine("der Schmied"), "die Schmiedin");
  assert.equal(RS.germanFeminine("der Lange"), "die Lange");
  assert.equal(RS.germanFeminine("von Eger"), "von Eger");
  const h = {region: "R", kind: "workplace", household: {trade: "smith", people: [{role: "smith"}, {role: "partner"}, {role: "child"}, {role: "child"}, {role: "apprentice"}]}};
  const out = RS.nameHousehold(RS.planHousehold(h), (i, o) => ({...fakeDraw(i, o), family: i === 4 ? "Dvořák" : fakeDraw(i, o).family}), () => 0.5);
  assert.equal(out.length, 5);
  for ( const p of out.slice(0, 4) ) assert.equal(p.family, p.sex === "female" ? "Nováková" : "Novák", p.name);
  assert.notEqual(out[1].sex, out[0].sex);
  assert.equal(out[4].family, "Dvořák", "an apprentice keeps their own name");
  assert.ok(out.every(p => p.name.split(" ").length >= 2));
  // A woman at the head of the household still gives her children the right forms
  const head = RS.nameHousehold(RS.planHousehold(h), (i, o) => fakeDraw(i, i === 0 ? {sex: "female"} : o), () => 0.95);
  assert.equal(head[0].family, "Nováková");
  for ( const p of head ) assert.equal(p.family, p.sex === "female" ? "Nováková" : "Novák");
});

test("residents: a medieval Jewish household names the children for the master", () => {
  const h = {region: "R", kind: "home", household: {trade: "spicer", people: [{role: "spicer"}, {role: "partner"}, {role: "child"}]}};
  const draw = (i, {sex}) => {
    const s = sex === "any" ? (i === 2 ? "female" : "male") : sex;
    return {sex: s, origin: "jewish", given: ["Yosef", "Rivka", "Dina"][i] ?? "Meir", family: `${s === "female" ? "bat" : "ben"} Natan`};
  };
  const out = RS.nameHousehold(RS.planHousehold(h), draw, () => 0.1);
  assert.equal(out[0].name, "Yosef ben Natan");
  assert.equal(out[2].name, "Dina bat Yosef");
});

test("residents: the flags give the routine, the household and the record", () => {
  const h = RS.householdsOn(regionsOf("hohenhausen"))[0];
  const [p] = RS.nameHousehold(RS.planHousehold(h, {year: 1197}), fakeDraw, () => 0.5);
  const f = RS.residentFlags(p, h, "Scene.s");
  assert.equal(f.routine.on, true);
  assert.equal(f.routine.roles.home ?? f.routine.roles.work, h.region);
  assert.equal(f.behavior.household, h.household.label.slice(0, 60));
  assert.equal(f.resident.scene, "Scene.s");
  assert.equal(f.resident.master, true);
  const list = RS.householdsOn(regionsOf("schondorf"));
  const all = RS.countPeople(list);
  list[0].seeded = ["a"];
  assert.equal(RS.countPeople(list), all - list[0].household.people.length);
  assert.equal(RS.countPeople(list, {again: true}), all);
});

test("residents: a priest is a Christian man, a rabbi Jewish, and kin keep the household's faith", () => {
  // A stand-in generator whose early rows are Jewish women, then Czech people of both sexes
  const draw = (row, {sex}) => {
    const s = sex === "any" || !sex ? (row % 2 ? "female" : "male") : sex;
    if ( row < 200 ) return {sex: "female", origin: "jewish", given: "Bella", family: "bat David"};
    return {sex: s, origin: "czech", given: s === "female" ? "Anna" : "Jan", family: s === "female" ? "Nováková" : "Novák"};
  };
  const chapel = {region: "C", kind: "church", household: {trade: "priest", people: [{role: "priest"}, {role: "servant"}]}};
  const [priest] = RS.nameHousehold(RS.planHousehold(chapel, {year: 1300}), draw, () => 0.5, {year: 1300});
  assert.equal(priest.sex, "male");
  assert.notEqual(priest.origin, "jewish");
  assert.equal(priest.name, "Jan Novák");
  assert.equal(RS.wantsFor("rabbi").origin("jewish"), true);
  assert.equal(RS.wantsFor("rabbi").origin("czech"), false);
  assert.equal(RS.wantsFor("nun").sex, "female");
  assert.equal(RS.wantsFor("parson", {year: 1700}).sex, "male");
  assert.equal(RS.wantsFor("parson", {year: 2000}).sex, null);
  assert.equal(RS.wantsFor("smith").sex, null);
  // A Jewish weaver's partner is asked for by origin before 1946, so a generator that rarely draws Jewish people still fits
  const rare = (row, {sex, origin}) => {
    const s = sex === "any" || !sex ? "male" : sex;
    if ( row === 0 || origin === "jewish" ) return {sex: row === 0 ? "female" : s, origin: "jewish", given: row === 0 ? "Avigail" : "Natan", family: `${row === 0 ? "bat" : "ben"} Asher`};
    return {sex: s, origin: "czech", given: "Havel", family: "Rybář"};
  };
  const cottage = {region: "K", kind: "home", household: {trade: "weaver", people: [{role: "weaver"}, {role: "partner"}]}};
  const pair = RS.nameHousehold(RS.planHousehold(cottage, {year: 1300}), rare, () => 0.5, {year: 1300});
  assert.equal(pair[1].origin, "jewish", pair.map(p => p.name).join(", "));
  assert.equal(pair[1].sex, "male");
  // From 1946 a mixed household may be drawn
  const late = RS.nameHousehold(RS.planHousehold(cottage, {year: 1990}), rare, () => 0.5, {year: 1990});
  assert.equal(late[1].origin, "czech");
  // A Czech smith's household never takes a ben-or-bat name, and the children are not drawn Jewish
  const smithy = {region: "R", kind: "workplace", household: {trade: "smith", people: [{role: "smith"}, {role: "child"}]}};
  const czechFirst = (row, o) => row === 0 ? {sex: "male", origin: "czech", given: "Jan", family: "Kovář"} : draw(row, o);
  const out = RS.nameHousehold(RS.planHousehold(smithy, {year: 1300}), czechFirst, () => 0.5, {year: 1300});
  assert.ok(out.every(p => !/^(ben|bat) /.test(p.family) && p.origin !== "jewish"), out.map(p => p.name).join(", "));
});
