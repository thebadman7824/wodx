// B7840-B7848: revenant families in every era (V20 Dark Ages pp. 453-454, V20 Ghouls and Revenants, Dark Ages: Vampire
// p. 289, Ghouls: Fatal Addiction p. 29), pure rules, and the wiring that reads them.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as RR from "../../modules/wodx-rules/creation/revenant-rules.mjs";
import {FAMILIES} from "../../modules/wodx-rules/creation/states-rules.mjs";
import {SPLATS} from "../../modules/wodx-creation/data/lifepaths-splats.mjs";

const src = f => readFileSync(new URL(`../../modules/${f}`, import.meta.url), "utf8");

test("the eight V20 Dark Ages families, with the book's Disciplines and weaknesses", () => {
  const eight = ["basarab", "bratovich", "danislav", "grimaldi", "obertus", "szantovich", "vlaszy", "khavi"];
  for ( const k of eight ) { assert.ok(RR.DA_FAMILIES[k], k); assert.equal(RR.DA_FAMILIES[k].disciplines.length, 3, k); assert.match(RR.DA_FAMILIES[k].page, /V20 Dark Ages p/); }
  assert.deepEqual(RR.DA_FAMILIES.basarab.disciplines, ["animalism", "dominate", "presence"]);
  assert.deepEqual(RR.DA_FAMILIES.bratovich.disciplines, ["animalism", "potence", "vicissitude"], "V20 Dark Ages, not Ghouls and Revenants' Fortitude");
  assert.deepEqual(RR.DA_FAMILIES.danislav.disciplines, ["auspex", "protean", "vicissitude"]);
  assert.equal(RR.DA_FAMILIES.grimaldi.mark.bloodMax, 8);
  assert.equal(RR.DA_FAMILIES.danislav.mark.silver, true);
  assert.equal(RR.DA_FAMILIES.khavi.mark.sun, "bashing");
  assert.deepEqual(RR.DA_FAMILIES.basarab.mark.repel, ["garlic", "holy symbol"]);
  assert.equal(RR.DA_FAMILIES.vlaszy.mark.oath, true);
  assert.equal(RR.DA_FAMILIES.bratovich.mark.frenzy, 2);
  assert.deepEqual(RR.DA_FAMILIES.krevcheski.disciplines, ["auspex", "dominate"], "Dark Ages: Vampire p. 289");
});

test("each year has its families: the Dark Ages write-ups before 1837, Ghouls and Revenants after", () => {
  const keys = y => RR.familiesIn(y).map(f => f.key);
  const y1197 = keys(1197);
  for ( const k of ["basarab", "danislav", "vlaszy", "khavi", "krevcheski", "bratovich", "grimaldi", "obertus", "szantovich"] ) assert.ok(y1197.includes(k), `${k} in 1197`);
  for ( const k of ["ducheski", "oprichniki", "rossellini", "anushin", "katayama"] ) assert.ok(!y1197.includes(k), `${k} not yet in 1197`);
  assert.ok(keys(1300).includes("ducheski") && !keys(1300).includes("krevcheski"), "the Krevcheski become the Ducheski");
  assert.ok(!keys(1600).includes("vlaszy") && keys(1600).includes("oprichniki"));
  assert.ok(!keys(2000).includes("basarab"), "the Basarab are extinct by modern nights");
  assert.ok(keys(2000).includes("katayama"));
  assert.equal(RR.familyIn("szantovich", 1300).label, "Szantovich");
  assert.equal(RR.familyIn("szantovich", 1600).label, "Zantosa");
  assert.equal(RR.familyIn("zantosa", 2000).key, "szantovich", "the modern key finds the same line");
  assert.equal(RR.familyIn("grimaldi", 1300).book, "da");
  assert.equal(RR.familyIn("grimaldi", 1900).book, "gr");
  assert.deepEqual(RR.familyIn("bratovich", 1900).disciplines, FAMILIES.bratovich.disciplines);
  assert.equal(RR.familyIn("basarab", 2000).alive, false);
  // every line names its reason, and a house year says so
  for ( const l of RR.LINES ) { assert.ok(l.why.length > 20, l.key); assert.ok(l.years[0] <= l.years[1], l.key); }
  // every Ghouls and Revenants family has a line
  for ( const k of Object.keys(FAMILIES) ) assert.ok(RR.LINES.some(l => l.gr === k), k);
});

test("a revenant's start by the year's write-up", () => {
  const g = RR.startFor({family: "grimaldi", year: 1230});
  assert.deepEqual(g.disciplines, {potence: 1, celerity: 1});
  assert.equal(g.blood.max, 8, "the Dark Ages Grimaldi hold 8");
  assert.equal(RR.startFor({family: "grimaldi", year: 1900, era: "victorian"}).blood.max, 2, "V20 p. 501 limit in the V20 eras");
  const b = RR.startFor({family: "bratovich", year: 1230, way: "alternate", picks: ["vicissitude", "animalism"]});
  assert.deepEqual(b.disciplines, {vicissitude: 1, animalism: 1});
  const d = RR.startFor({family: "danislav", year: 1230, picks: ["protean"]});
  assert.deepEqual(d.disciplines, {potence: 1, protean: 1});
  const bad = RR.startFor({family: "danislav", year: 1230, picks: ["thaumaturgy"]});
  assert.ok(bad.errors.some(e => /own Disciplines/.test(e)));
  const gone = RR.startFor({family: "vlaszy", year: 1700});
  assert.ok(gone.errors.some(e => /not in the world/.test(e)));
  const m = RR.startFor({family: "marijava", year: 1300, picks: ["celerity"]});
  assert.deepEqual(m.disciplines, {potence: 1, celerity: 1}, "no Disciplines in the book: any may be taken");
  assert.equal(RR.startFor({family: "nobody"}).family, null);
});

test("the weaknesses as rolls and roll effects", () => {
  assert.deepEqual(RR.rollEffects(RR.DA_FAMILIES.bratovich.mark, ["frenzy"]).map(e => e.diff), [2]);
  assert.deepEqual(RR.rollEffects(RR.DA_FAMILIES.bratovich.mark, ["social"]), []);
  assert.deepEqual(RR.rollEffects(RR.GR_MARKS.dhabi, ["willpower"]).map(e => e.diff), [2]);
  const rp = RR.weaknessRoll(RR.DA_FAMILIES.basarab.mark, "repel");
  assert.equal(rp.difficulty, 6);
  const ad = RR.weaknessRoll(RR.DA_FAMILIES.szantovich.mark, "addiction");
  assert.equal(ad.difficulty, 6); assert.equal(ad.noWillpower, true);
  assert.equal(RR.weaknessRoll(RR.GR_MARKS.zantosa, "addiction").stSets, true);
  assert.equal(RR.weaknessRoll(RR.DA_FAMILIES.grimaldi.mark, "repel"), null);
});

test("a day of vitae, and aging on the family's blood", () => {
  assert.deepEqual(RR.dayOfVitae({value: 3, max: 10}), {value: 4, gained: 1});
  assert.deepEqual(RR.dayOfVitae({value: 8, max: 8}), {value: 8, gained: 0});
  const a = RR.ageOver({years: 100, age: 30, stamina: 2});
  assert.deepEqual([a.aged, a.lifespan, a.ageAfter, a.dies], [25, 250, 55, false]);
  assert.equal(RR.ageOver({years: 100, age: 30, stamina: 2, fed: true}).aged, 0);
  assert.equal(RR.ageOver({years: 400, age: 160, stamina: 1}).dies, true);
});

test("lifepaths offer each family in its years", () => {
  const rev = SPLATS.revenant;
  for ( const l of RR.LINES ) assert.ok(rev.some(s => s.key === l.key && JSON.stringify(s.spans) === JSON.stringify([l.years])), l.key);
});

test("the wiring: birth, the weakness window, the night, the sun, silver, aging and NPCs", () => {
  const states = src("wodx-creation/scripts/states.mjs");
  assert.match(states, /RR\.startFor\(/);
  assert.match(states, /RR\.familiesIn\(year\)/);
  assert.match(states, /mark\.oath && regnant/);
  assert.match(states, /wod\.types\.flaw/);
  const apps = src("wodx-creation/scripts/apps.mjs");
  assert.match(apps, /data-action="revenantWeakness"/);
  assert.match(apps, /revenantWeakness: \(\) => weaknessDialog\(\)/);
  const main = src("wodx-creation/scripts/main.mjs");
  assert.match(main, /revenant\.registerRevenant\(\)/);
  assert.match(main, /mark: revenant\.markOf/);
  const act = src("wodx-actions/scripts/main.js");
  assert.match(act, /revenantMark\(actor\)\?\.sun === "bashing"/);
  assert.match(act, /the family's vitae: blood/);
  assert.match(act, /fd\.attr === "special:willpower" \? \["willpower"\]/);
  assert.match(src("wodx-chronicle/scripts/traits.mjs"), /rm\?\.silver/);
  const time = src("wodx-creation/scripts/time.mjs");
  assert.match(time, /case "revenantAges":/);
  assert.match(time, /RR\.ageOver\(/);
  assert.match(src("wodx-rules/npc/supernatural-rules.mjs"), /basarab\|danislav\|vlaszy\|khavi/);
  // every select in the new windows is marked fixed
  for ( const f of ["wodx-creation/scripts/revenant.mjs"] ) for ( const m of src(f).matchAll(/<select name="[^"]+"([^>]*)>/g) ) assert.match(m[1], /data-fixed/, f);
});
