import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import * as D from "../../modules/wodx-creation/scripts/lifepath-drill-rules.mjs";
import * as R from "../../modules/wodx-creation/scripts/lifepath-rules.mjs";
import {buildScenes} from "../../modules/wodx-creation/scripts/first-night-prelude-rules.mjs";
import {WORLD_REGIONS} from "../../modules/wodx-chronicle/scripts/world-rules.mjs";
import {MERITS_FLAWS, BACKGROUNDS} from "../../modules/wodx-chronicle/data/trait-effects.mjs";

/* WoDX Creation: the drill-down lifepath (Ben, 13 November 2026): continent, region, origin, childhood, teens, adult chapters. */

const YEARS = [1150, 1197, 1348, 1499, 1500, 1620, 1788, 1789, 1850, 1945, 1946, 1990, 2022, 2023, 2100, 2300];
/** Walk a drill to its end, always taking option n (wrapped) of each step. */
const walk = (d, n = 0, guard = 40) => {
  for ( let i = 0; i < guard; i++ ) { const s = D.current(d); if ( !s ) break; d = D.pick(d, s.id, s.options[n % s.options.length].id); }
  return d;
};
const start = (rid, birthYear, age, more = {}) => {
  let d = D.newDrill({birthYear, age, seed: `t:${rid}:${birthYear}:${age}`, ...more});
  d = D.pick(d, "continent", D.continentOf(rid).id);
  return D.pick(d, "region", rid);
};

test("the lists are whole, every reward is in the book tables, and every world region sits on one continent", () => {
  assert.deepEqual(D.lint({table: MERITS_FLAWS, backgrounds: BACKGROUNDS.map(b => b.name)}), []);
  const all = D.continents().flatMap(c => c.regions.map(r => r.id));
  assert.equal(all.length, Object.keys(WORLD_REGIONS).length);
  assert.equal(D.continents().length, 7);
});

test("every region in every year can be walked to the end at every age band", () => {
  for ( const rid of Object.keys(WORLD_REGIONS) ) for ( const y of YEARS ) for ( const age of [8, 15, 22, 40, 70] ) {
    const d = walk(start(rid, y, age), (y + age) % 5);
    assert.ok(D.done(d), `${rid} ${y} age ${age}`);
    for ( const s of D.stepsOf(d).steps ) assert.ok(s.options.length >= 2 || s.own, `${rid} ${y} ${s.id} has choices`);
  }
});

test("age closes the later stages, and coming of age moves with the era and the region", () => {
  const ids = (age, ages) => D.stagesFor(age, ages).map(s => s.id);
  assert.deepEqual(ids(8), ["c"]);
  assert.deepEqual(ids(12), ["c", "t"]);
  assert.deepEqual(ids(17), ["c", "t"]);
  assert.deepEqual(ids(18), ["c", "t", "a0"]);
  assert.equal(ids(29).length, 3);
  assert.equal(ids(30).length, 4);
  assert.equal(ids(59).length, 5);
  assert.equal(ids(90).length, 6);
  assert.deepEqual(D.comingOfAge("france", 1300), {teen: 10, adult: 14});
  assert.deepEqual(D.comingOfAge("france", 1700), {teen: 12, adult: 15});
  assert.deepEqual(D.comingOfAge("france", 1850), {teen: 12, adult: 16});
  assert.deepEqual(D.comingOfAge("france", 1990), {teen: 12, adult: 18});
  assert.equal(D.comingOfAge("japan", 1300).adult, 15);
  const medieval = D.comingOfAge("france", 1300);
  assert.deepEqual(ids(14, medieval), ["c", "t", "a0"], "an adult at 14 in the Middle Ages");
  assert.deepEqual(ids(13, medieval), ["c", "t"]);
  const young = walk(start("france", 1990, 16));
  assert.ok(D.done(young));
  assert.ok(!Object.keys(young.picks).some(k => /^a\d/.test(k)), "a character of 16 in 1990 has no adult picks");
  const old = walk(start("france", 1300, 16));
  assert.ok(Object.keys(old.picks).includes("a0-path"), "a character of 16 in 1300 has an adult chapter");
  assert.match(D.closedNote(16, {teen: 12, adult: 18}), /18/);
  assert.match(D.closedNote(9, {teen: 12, adult: 18}), /12/);
  assert.equal(D.closedNote(18, {teen: 12, adult: 18}), "");
  assert.match(D.stepsOf(young).closed, /18/);
  assert.equal(D.stagesFor(16).find(s => s.id === "t").to, 16);
});

test("Ben's example: Europe, France, orphan, then childhood, teens and adult life", () => {
  let d = D.newDrill({birthYear: 1700, age: 34, seed: "ben"});
  assert.equal(D.current(d).id, "continent");
  d = D.pick(d, "continent", "europe");
  assert.ok(D.current(d).options.some(o => o.id === "france"));
  d = D.pick(d, "region", "france");
  while ( D.current(d).id !== "origin" ) d = D.pick(d, D.current(d).id, D.current(d).options[0].id);
  const origin = D.current(d);
  assert.ok(origin.options.some(o => o.local), "France has origins of its own in 1700");
  d = D.pick(d, "origin", "orphan-or-foundling");
  assert.equal(d.picks.origin.base, "orphan");
  const home = D.current(d);
  assert.ok(home.options.some(o => o.label.startsWith("A house of faith")), "an orphan's homes");
  assert.ok(!home.options.some(o => o.label.startsWith("Both parents")), "no parents for an orphan");
  d = walk(d);
  assert.ok(D.done(d));
  const keys = Object.keys(d.picks).filter(k => k !== "people");
  assert.deepEqual(keys.slice(0, 7), ["continent", "region", "origin", "c-path", "c-mark", "t-path", "t-mark"]);
  assert.ok(keys.includes("a0-path") && keys.includes("a1-mark"), "adult chapters for a life of 34 years");
  assert.ok(D.pool(d).some(g => g.kind === "bg"), "the life offers a Background");
  assert.ok(D.story(d).length >= 9);
});

test("what marked those years: five things, two good, two hard, one neither, and five others on request", () => {
  for ( const [rid, y] of [["france", 1700], ["japan", 1300], ["west-africa", 1990], ["andes", 2100]] ) {
    const d = walk(start(rid, y, 45));
    const marks = D.stepsOf(d).steps.filter(s => s.five);
    assert.ok(marks.length >= 3, "a mark step for each stage");
    for ( const s of marks ) {
      assert.equal(s.options.length, 5, `${rid} ${y} ${s.id}`);
      const tones = s.options.map(o => o.tone).sort().join("");
      assert.equal(tones, ["+", "+", "-", "-", "0"].sort().join(""), `${rid} ${y} ${s.id}: ${tones}`);
    }
  }
  let d = start("france", 1700, 30);
  while ( !D.current(d).five ) d = D.pick(d, D.current(d).id, D.current(d).options[0].id);
  const before = D.current(d).options.map(o => o.id).join();
  const again = D.reroll(d, D.current(d).id);
  assert.equal(D.current(again).options.length, 5);
  assert.notEqual(D.current(again).options.map(o => o.id).join(), before, "five others");
  assert.equal(D.current(D.newDrill({...d, picks: undefined, birthYear: 1700, age: 30, seed: d.seed})).id, "continent");
});

test("lists follow the year: no factory before 1760, no net before 1990", () => {
  const labels = (y, age, step) => { let d = walk(start("british-isles", y, age)); return D.stepsOf(d).steps.find(s => s.id === step).options.map(o => o.label); };
  assert.ok(!labels(1300, 30, "a0-path").some(l => /Factory|Net and data|Office/.test(l)));
  assert.ok(labels(1850, 30, "a0-path").some(l => /Factory/.test(l)));
  assert.ok(labels(1990, 30, "a0-path").some(l => /Net and data/.test(l)));
  assert.ok(!D.originsFor("france", 1300).some(o => o.base === "corp" || o.base === "labour"));
  assert.ok(D.originsFor("france", 2050).some(o => o.base === "corp"));
});

test("a stage can happen in another region, and a change drops the later picks", () => {
  let d = walk(start("west-africa", 1650, 40, {homeland: "moravia"}));
  assert.ok(D.done(d));
  d = D.moveTo(d, "a0", "brazil");
  assert.ok(!d.picks["a0-path"] && d.picks["t-mark"], "teens stay, adult picks go");
  assert.equal(D.current(d).region, "brazil");
  d = walk(d);
  assert.ok(D.done(d));
  assert.equal(D.lastHome(d), "brazil");
  assert.ok(D.fromAbroad(d, "moravia"));
  assert.ok(!D.fromAbroad(d, "brazil"));
  assert.ok(d.picks.arrival, "a life lived elsewhere ends with what brought the character here");
  assert.equal(D.moveTo(d, "c", "japan"), d, "childhood stays where the character was born");
  assert.equal(D.moveTo(d, "a0", "atlantis"), d);
  const back = D.unpick(d, "origin");
  assert.ok(!back.picks.origin && !back.picks["c-path"] && back.picks.region);
  const other = D.pick(d, "region", "west-africa");
  assert.deepEqual(other.place, {}, "a new birthplace forgets the moves");
  const local = walk(start("moravia", 1650, 40, {homeland: "moravia"}));
  assert.ok(!local.picks.arrival, "no arrival for a life at home");
});

test("a player's own answer is kept, flagged for the Storyteller, and never for continent or region", () => {
  let d = start("japan", 1600, 20);
  while ( D.current(d).id !== "origin" ) d = D.pick(d, D.current(d).id, D.current(d).options[0].id);
  const at = d;
  d = D.pickOwn(d, "origin", "Raised by a travelling puppet troupe", {gives: "ab Performance|bg Allies", base: "wander"});
  assert.equal(d.picks.origin.own, true);
  assert.equal(d.picks.origin.base, "wander");
  assert.ok(D.hasOwn(d));
  assert.ok(D.reviewReasons(d).length >= 1);
  d = walk(d);
  assert.ok(D.done(d));
  assert.ok(D.pool(d).some(g => g.name === "Performance"));
  const e = D.newDrill({birthYear: 1600, age: 20});
  assert.equal(D.pickOwn(e, "continent", "Atlantis"), e);
  assert.equal(D.pick(e, "continent", "nowhere"), e);
  assert.equal(D.pickOwn(at, "origin", "   "), at, "an empty answer changes nothing");
  assert.deepEqual(D.reviewReasons(walk(start("france", 1990, 30))), []);
  assert.ok(D.reviewReasons(walk(start("france", 1990, 9))).length === 1, "younger than 12 waits for the Storyteller");
});

test("your people: asked where more than one people lives, and open where no names are listed", () => {
  let n = 0, open = 0;
  for ( const rid of Object.keys(WORLD_REGIONS) ) {
    const s = D.stepsOf(start(rid, 1700, 25)).steps.find(x => x.kind === "people");
    if ( !s ) { assert.ok(D.peoplesOf(rid, 1700).length <= 1, rid); continue; }
    n++;
    assert.ok(s.own, `${rid}: the player can name the people`);
    if ( !D.peoplesOf(rid, 1700).length ) open++;
  }
  assert.ok(n > 5, "several regions ask");
  const na = D.continents(1300).find(c => c.id === "north-america").regions.find(r => r.id === "north-america-east");
  assert.equal(na.named, false);
  let d = start("north-america-east", 1300, 25);
  assert.equal(D.current(d).kind, "people");
  d = D.pickOwn(d, "people", "Lenape");
  assert.ok(D.done(walk(d)));
  assert.ok(open >= 1);
});

test("births of your kind are offered when the line fits, and only then", () => {
  const keys = line => D.originsFor("france", 1700, line).filter(o => o.line).map(o => o.label);
  assert.equal(keys("mortal").length, 0);
  assert.equal(keys("vampire").length ? keys("vampire").some(l => /wolf/i.test(l)) : false, false);
  assert.ok(keys("werewolf").some(l => /wolf/i.test(l)));
  let d = start("france", 1700, 20, {line: "werewolf"});
  while ( D.current(d).id !== "origin" ) d = D.pick(d, D.current(d).id, D.current(d).options[0].id);
  const wolf = D.current(d).options.find(o => /wolf/i.test(o.label));
  d = walk(D.pick(d, "origin", wolf.id));
  assert.ok(D.done(d));
});

test("the sheet plan: an Ability one dot up to the book's cap, a Background at one or up one, Merits and Flaws at book cost under the Flaw cap", () => {
  const view = {abilities: [{path: "system.abilities.alertness.value", label: "Alertness", value: 3}, {path: "system.abilities.stealth.value", label: "Stealth", value: 1}],
    features: [{id: "f1", name: "Resources", type: "wod.types.background", value: 2}]};
  const kept = [{key: "ab:Alertness", kind: "ab", name: "Alertness"}, {key: "ab:Stealth", kind: "ab", name: "Stealth"}, {key: "ab:Basket Weaving", kind: "ab", name: "Basket Weaving"},
    {key: "bg:Resources", kind: "bg", name: "Resources"}, {key: "bg:Allies", kind: "bg", name: "Allies"},
    ...MERITS_FLAWS.filter(t => t.kind === "flaw").slice(0, 12).map(t => ({key: `flaw:${t.name}`, kind: "flaw", name: t.name})),
    {key: "merit:No Such Merit", kind: "merit", name: "No Such Merit"}];
  const plan = D.sheetPlan(view, kept, {abilityCap: 3, flaws: 7, table: MERITS_FLAWS});
  const op = k => plan.ops.filter(o => o.op === k);
  assert.deepEqual(op("ability").map(o => [o.label, o.to]), [["Stealth", 2]]);
  assert.deepEqual(op("raise").map(o => [o.name, o.to]), [["Resources", 3]]);
  assert.ok(op("create").some(o => o.name === "Allies" && o.value === 1 && o.type === "wod.types.background"));
  assert.ok(plan.flawPoints <= 7, `flaws stop at 7, got ${plan.flawPoints}`);
  const why = plan.skipped.map(x => x.key);
  assert.ok(why.includes("ab:Alertness") && why.includes("ab:Basket Weaving") && why.includes("merit:No Such Merit"));
  assert.ok(plan.skipped.some(x => x.key.startsWith("flaw:")), "the Flaws past the cap are left off");
  const twice = D.sheetPlan({abilities: [], features: [{id: "m", name: op("create").find(o => o.type === "wod.types.flaw").name, type: "wod.types.flaw", value: 1}]}, kept.filter(k => k.kind === "flaw").slice(0, 1), {table: MERITS_FLAWS});
  assert.equal(twice.ops.length, 0, "a Flaw already on the sheet is not added twice");
});

test("the drill rides inside the path: the summary tells the mortal years, then the turn and after", () => {
  const d = walk(start("levant", 1160, 30, {line: "vampire"}));
  const p0 = R.newPath({line: "vampire", splat: "toreador", birthYear: 1160, turnYear: 1190, seed: "s", drill: d});
  assert.ok(!R.stagesOf(p0).some(s => ["birth", "youth", "adult", "later"].includes(s)), "the old mortal scenes step aside");
  assert.ok(R.stagesFor("vampire").includes("birth"), "a path without a drill is unchanged");
  let p = p0, guard = 0;
  while ( !R.done(p) && guard++ < 20 ) p = R.choose(p, 0);
  assert.ok(R.done(p));
  const sum = R.summary(p);
  const drill = sum.story.filter(s => s.drill);
  assert.ok(drill.length >= 8);
  assert.ok(sum.story.length > drill.length, "the turn and the first years follow");
  assert.ok(sum.story.every((s, i) => i === 0 || s.year >= sum.story[i - 1].year), "in order of years");
  assert.equal(new Set(sum.gives.map(g => g.key)).size, sum.gives.length, "no reward twice");
  assert.ok(sum.gives.length > 3);
  const scenes = buildScenes({story: sum.story}).filter(x => x.from === "lifepath");
  assert.equal(scenes[0].title, "1160: Born");
  assert.ok(scenes.length >= 4 && scenes.length <= 7, `one prelude scene per life stage, got ${scenes.length}`);
  assert.equal(new Set(scenes.map(x => x.key)).size, scenes.length);
  assert.ok(scenes[1].beats.length === 3, "how the years were spent, what marked them, and the playing note");
  const rec = R.record(p, {kept: sum.gives.map(g => g.key), people: sum.people});
  assert.equal(rec.path.drill.picks.region.id, "levant");
  assert.ok(JSON.parse(JSON.stringify(rec)).path.drill, "the record survives saving");
});

test("no gendered words and no option id twice in a step", () => {
  const words = /\b(he|she|him|her|his|hers|himself|herself|son|daughter|mother|father|wife|husband|boy|girl|man|woman)\b/i;
  for ( const rid of ["france", "japan", "west-africa", "andes", "levant", "north-america-west", "moravia", "india"] ) for ( const y of YEARS ) for ( const line of ["mortal", "werewolf", "mage"] ) {
    const d = walk(start(rid, y, 65, {line}));
    for ( const s of D.stepsOf(d).steps ) {
      const ids = s.options.map(o => o.id);
      assert.equal(new Set(ids).size, ids.length, `${rid} ${y} ${s.id}: an option id twice`);
      for ( const o of s.options ) assert.ok(!words.test(`${o.label} ${o.text} ${String(o.p ?? "")}`), `${rid} ${y}: "${o.label}"`);
    }
  }
});
