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
  assert.equal(home.options.length, 5, "five homes to choose from");
  const homes = D.pathPool("child", 1700, "orphan").map(o => o.label);
  assert.ok(homes.some(l => l.startsWith("A house of faith")), "an orphan's homes");
  assert.ok(!homes.some(l => l.startsWith("Both parents")), "no parents for an orphan");
  assert.ok(home.options.every(o => homes.includes(o.label)));
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
    assert.equal(marks.length, D.stagesFor(45, D.comingOfAge(rid, y)).length * 2, "both picks of every stage show five");
    for ( const s of marks ) {
      assert.equal(s.options.length, 5, `${rid} ${y} ${s.id}`);
      const tones = s.options.map(o => o.tone).sort().join("");
      assert.equal(tones, ["+", "+", "-", "-", "0"].sort().join(""), `${rid} ${y} ${s.id}: ${tones}`);
    }
  }
  let d = start("france", 1700, 30);
  while ( !D.current(d).five ) d = D.pick(d, D.current(d).id, D.current(d).options[0].id);
  assert.equal(D.current(d).id, "c-path", "the first pick of a stage shows five too");
  const teen = D.stepsOf(walk(start("france", 1700, 30))).steps.find(x => x.id === "t-path");
  assert.ok(teen.options.some(o => o.local), "the land's own path is among the first five");
  const before = D.current(d).options.map(o => o.id).join();
  const again = D.reroll(d, D.current(d).id);
  assert.equal(D.current(again).options.length, 5);
  assert.notEqual(D.current(again).options.map(o => o.id).join(), before, "five others");
  assert.equal(D.current(D.newDrill({...d, picks: undefined, birthYear: 1700, age: 30, seed: d.seed})).id, "continent");
});

test("lists follow the year: no factory before 1760, no net before 1990", () => {
  const labels = y => D.pathPool("adult", y, "trade", "british-isles").map(o => o.label);
  assert.ok(!labels(1300).some(l => /Factory|Net and data|Office/.test(l)));
  assert.ok(labels(1850).some(l => /Factory/.test(l)));
  assert.ok(labels(1990).some(l => /Net and data/.test(l)));
  for ( let i = 0; i < 30; i++ ) {
    const d = walk(start("british-isles", 1270, 30, {seed: `y${i}`}), i);
    for ( const st of D.stepsOf(d).steps ) for ( const o of st.options ) assert.ok(!/Factory|Net and data|Office|School, and more/.test(o.label), o.label);
  }
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

test("every world region has its own ages, origins, teenage path and calling in every age", () => {
  for ( const rid of Object.keys(WORLD_REGIONS) ) for ( const y of [1250, 1650, 1850, 1990, 2060] ) {
    const L = D.localOf(rid, y);
    if ( rid === "antarctica" && y < 1789 ) { assert.equal(L, null, "no one is born on the southern ice before the sealers"); continue; }
    assert.ok(L?.age, `${rid} ${y}: an age name`);
    assert.ok(L.origins.length >= 2, `${rid} ${y}: origins`);
    assert.ok(L.teen && L.adult, `${rid} ${y}: a teenage path and a calling`);
    assert.ok(D.originsFor(rid, y).filter(o => o.local).length >= 2);
  }
  const words = /\b(he|she|him|her|his|hers|himself|herself|son|daughter|mother|father|wife|husband|boy|girl|man|woman|men|women|sons|daughters)\b/i;
  for ( const rid of Object.keys(WORLD_REGIONS) ) for ( const y of [1250, 1650, 1850, 1990, 2060] ) {
    const L = D.localOf(rid, y);
    if ( !L ) continue;
    for ( const t of [L.age, ...L.origins.map(o => o[0]), L.teen[0], L.adult[0]] ) { assert.ok(!words.test(t), t); assert.ok(!/[\u2013\u2014]/.test(t), t); }
  }
});

test("dated content: Moravia's origins by year of birth and marks by the years they happened", () => {
  assert.ok(D.datedOrigins("moravia", 1940).some(o => /occupation/.test(o[0])));
  assert.equal(D.datedOrigins("moravia", 1300).length, 0);
  assert.equal(D.datedOrigins("nowhere", 1940).length, 0);
  assert.ok(D.originsFor("moravia", 1940).filter(o => o.local).length >= 4, "dated origins beside the age's own");
  assert.ok(D.datedMarks("moravia", 1425, 1430).some(m => /Hussite/.test(m[0])));
  assert.ok(D.datedMarks("moravia", 1410, 1420).some(m => /Hussite/.test(m[0])), "a stage that only touches the years still counts");
  assert.equal(D.datedMarks("moravia", 1437, 1500).filter(m => /Hussite/.test(m[0])).length, 0);
  assert.equal(D.datedMarks("moravia", 1425, 1430, "wild").length, 0);
  let d = start("moravia", 1600, 45, {homeland: "moravia"});
  const seen = [];
  for ( let i = 0; i < 40 && D.current(d); i++ ) {
    const st = D.current(d);
    if ( /^a\d-mark$/.test(st.id) ) {
      assert.equal(st.options.length, 5);
      assert.equal(st.options.map(o => o.tone).sort().join(""), "++--0");
      const own = st.options.filter(o => o.local);
      assert.ok(own.length >= 1 && own.length <= 3, `${st.id}: one of each tone at most comes first, got ${own.length}`);
      d = D.pick(d, st.id, own[0].id);
      assert.ok(!seen.includes(own[0].id), "a dated mark is not offered again once picked");
      seen.push(own[0].id);
    } else d = D.pick(d, st.id, st.options[0].id);
  }
  assert.ok(D.done(d) && seen.length >= 2);
  assert.ok(D.story(d).some(x => /White Mountain|long war/.test(x.choice)));
  const words = /\b(he|she|him|her|his|hers|son|daughter|mother|father|wife|husband|boy|girl|man|woman|men|women)\b/i;
  for ( const m of D.datedMarks("moravia", 1100, 2300) ) assert.ok(!words.test(`${m[0]} ${m[4] ?? ""}`), m[0]);
  for ( const o of D.datedOrigins("moravia", 1940).concat(D.datedOrigins("moravia", 1630)) ) assert.ok(!words.test(o[0]), o[0]);
});

test("the years after the change: one optional pick of five for each age lived through", () => {
  assert.deepEqual(D.sinceSpans(1230, 1990).map(x => [x.group, x.from, x.to]), [["M", 1231, 1499], ["E", 1500, 1788], ["I", 1789, 1945], ["N", 1946, 1990]]);
  assert.deepEqual(D.sinceSpans(1980, 1990), [], "ten years are told by the first scenes after the turn");
  assert.deepEqual(D.sinceSpans(1490, 1530).map(x => x.group), ["E"], "an age needs twenty years lived in it");
  assert.deepEqual(D.sinceSpans(null, 1990), []);
  let s = D.newSince({turnYear: 1230, nowYear: 1990, line: "vampire", seed: "q"});
  const first = D.sinceCurrent(s);
  assert.equal(first.id, "s-M");
  assert.equal(first.options.length, 5);
  assert.equal(first.options.map(o => o.tone).sort().join(""), "++--0");
  assert.ok(!first.options.some(o => /machines|new age/.test(o.label)), "no machines in the Middle Ages");
  assert.notEqual(D.sinceCurrent(D.sinceReroll(s, "s-M")).options.map(o => o.id).join(), first.options.map(o => o.id).join());
  assert.equal(D.sincePick(s, "s-E", first.options[0].id), s, "only the step in turn can be answered");
  s = D.sincePick(s, "s-M", first.options[0].id);
  assert.ok(!D.sinceCurrent(s).options.some(o => o.id === first.options[0].id), "what was picked is not offered again");
  s = D.sinceSkip(s, "s-E");
  assert.equal(D.sinceCurrent(s).id, "s-I");
  s = D.sinceSurprise(s);
  s = D.sinceSurprise(s);
  assert.equal(D.sinceCurrent(s), null);
  assert.deepEqual(D.sinceStory(s).map(x => x.stage), ["s-M", "s-I", "s-N"]);
  assert.ok(D.sincePool(s).length >= 3);
  const b = D.sinceBack(s);
  assert.equal(D.sinceCurrent(b).id, "s-N");
  assert.equal(D.sinceCurrent(D.sinceBack(D.sinceBack(b))).id, "s-E", "back undoes a skip too");
  const d = walk(start("levant", 1200, 30, {line: "vampire"}));
  let p = R.newPath({line: "vampire", splat: "toreador", birthYear: 1200, turnYear: 1230, seed: "s", drill: d});
  while ( !R.done(p) ) p = R.choose(p, 0);
  const before = R.summary(p);
  p = {...p, since: s};
  const sum = R.summary(p, {nowYear: 1990});
  assert.equal(sum.story.length, before.story.length + 3);
  assert.equal(sum.story.at(-1).stage, "s-N");
  assert.equal(new Set(sum.gives.map(g => g.key)).size, sum.gives.length);
  assert.ok(JSON.parse(JSON.stringify(R.record(p, {}))).path.since.picks["s-M"]);
});

test("the Storyteller's limits: only some regions, some kinds of origin left out, the homeland always open", () => {
  assert.equal(D.cleanLimits({regions: ["atlantis"], noBases: ["nonsense"]}), null);
  assert.equal(D.cleanLimits(null), null);
  let d = D.newDrill({birthYear: 1700, age: 30, seed: "l", homeland: "moravia", limits: {regions: ["france", "japan", "atlantis"], noBases: ["noble", "bound"]}});
  assert.deepEqual(D.current(d).options.map(o => o.id), ["europe", "asia"]);
  assert.equal(D.pick(d, "continent", "africa"), d);
  d = D.pick(d, "continent", "europe");
  assert.deepEqual(D.current(d).options.map(o => o.id).sort(), ["france", "moravia"]);
  assert.equal(D.pick(d, "region", "italy"), d);
  d = D.pick(d, "region", "france");
  while ( D.current(d).id !== "origin" ) d = D.pick(d, D.current(d).id, D.current(d).options[0].id);
  assert.ok(D.current(d).options.length > 5);
  assert.ok(!D.current(d).options.some(o => o.base === "noble" || o.base === "bound"));
  d = walk(d);
  assert.ok(D.done(d));
  assert.equal(D.moveTo(d, "a0", "italy"), d, "no move to a closed region");
  assert.notEqual(D.moveTo(d, "a0", "japan"), d);
  assert.ok(D.done(walk(D.newDrill({birthYear: 1700, age: 30, seed: "l2", limits: {regions: ["antarctica"]}}))), "even one odd region walks to the end");
  assert.ok(D.originKinds().length >= 14 && D.originKinds().every(k => k.key && k.label));
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
    for ( const k of ["child", "teen", "adult"] ) for ( const b of ["trade", "orphan", "wild", "noble"] ) for ( const o of D.pathPool(k, y, b, rid) ) assert.ok(!words.test(o.label), o.label);
  }
});

test("dated content: every region of the world has origins and marks of its own years", async () => {
  const {LOCAL_EVENTS} = await import("../../modules/wodx-creation/data/lifepath-local-events.mjs");
  const {CONTINENTS} = await import("../../modules/wodx-creation/data/lifepath-drill.mjs");
  const ids = CONTINENTS.flatMap(c => c[1]).filter(id => !D.landOf(id)?.off);
  assert.equal(ids.length, 44);
  const words = /\b(he|she|him|her|his|hers|son|daughter|mother|father|wife|wives|husband|brother|sister|boy|girl|man|woman|men|women)\b/i;
  for ( const id of ids ) {
    const E = LOCAL_EVENTS[id];
    assert.ok(E?.origins?.length >= 1 && E?.marks?.length >= 12, `${id} has dated content`);
    for ( const t of ["+", "-", "0"] ) assert.ok(E.marks.filter(m => m[3] === t).length >= 1, `${id} has "${t}" marks`);
    for ( const m of E.marks ) { assert.ok(!words.test(`${m[0]} ${m[4] ?? ""}`), m[0]); assert.ok(!m[4] || m[4].split("|").length === 2, m[0]); }
    for ( const o of E.origins ) assert.ok(!words.test(o[0]), o[0]);
  }
  assert.ok(D.datedMarks("japan", 1940, 1946).some(m => /flash/.test(m[0])));
  assert.ok(D.datedMarks("west-africa", 1320, 1330).some(m => /pilgrimage/.test(m[0])));
  assert.ok(D.datedOrigins("andes", 1500).some(o => /four quarters/.test(o[0])));
  assert.equal(D.datedMarks("antarctica", 1200, 1800).length, 0);
  let d = D.newDrill({birthYear: 1840, age: 30, line: "mortal", seed: 5});
  d = D.pick(d, "continent", D.current(d).options.find(o => /South America/.test(o.label)).id);
  d = D.pick(d, "region", "brazil");
  let own = 0;
  for ( let i = 0; i < 40 && D.current(d); i++ ) { const st = D.current(d); const o = st.options.find(x => x.local && /-mark$/.test(st.id)) ?? st.options[0]; if ( o.local && /-mark$/.test(st.id) ) own++; d = D.pick(d, st.id, o.id); }
  assert.ok(D.done(d) && own >= 2, "a life in Brazil meets Brazil's own years");
});

test("beyond Earth: orbit, the Moon and Mars open only in the future age and from their own first years", () => {
  assert.ok(!D.continents().some(c => /Beyond/.test(c.label)), "the plain list is Earth");
  assert.equal(D.allLands().find(c => /Beyond/.test(c.label)).regions.length, 3);
  const beyond = d => D.current(d).options.find(o => /Beyond Earth/.test(o.label));
  assert.ok(!beyond(D.newDrill({birthYear: 1990, age: 15, now: 2005})), "a chronicle in 2005 has no births in orbit");
  assert.ok(!beyond(D.newDrill({birthYear: 1990, age: 30})), "nor one that gives no year");
  assert.ok(!beyond(D.newDrill({birthYear: 1990, age: 40, now: 2030})), "born before anyone lived there");
  let d = D.newDrill({birthYear: 2005, age: 30, now: 2035, homeland: "moravia", seed: 3});
  assert.ok(beyond(d));
  d = D.pick(d, "continent", beyond(d).id);
  assert.deepEqual(D.current(d).options.map(o => o.id), ["orbit"], "only orbit had people in 2005");
  d = D.pick(d, "region", "orbit");
  let own = 0, sawPeople = false, sawArrival = false;
  for ( let i = 0; i < 40 && D.current(d); i++ ) {
    const st = D.current(d);
    if ( st.id === "people" ) { sawPeople = true; assert.match(st.options[0].label, /on Earth/); }
    if ( st.id === "arrival" ) sawArrival = true;
    if ( st.id === "origin" ) { assert.ok(!st.options.some(o => /Born to the land|noble house|Born a wolf/.test(o.label)), "no farms or noble houses in orbit"); assert.match(st.age, /hired townships/); assert.ok(st.options.some(o => /first hired townships aloft/.test(o.label))); }
    const o = st.options.find(x => x.local && /-mark$/.test(st.id)) ?? st.options[0];
    if ( o.local && /-mark$/.test(st.id) ) own++;
    d = D.pick(d, st.id, o.id);
  }
  assert.ok(D.done(d) && sawPeople && sawArrival && own >= 1);
  assert.ok(D.story(d).some(x => /Orbit/.test(x.land ?? x.text ?? JSON.stringify(x))));
  const all = D.continents(2060, 2090).find(c => /Beyond/.test(c.label)).regions.map(r => r.id);
  assert.deepEqual(all, ["orbit", "luna", "mars"]);
  assert.ok(D.datedMarks("mars", 2055, 2065).some(m => /colony ship/.test(m[0])));
  const lim = D.cleanLimits({regions: ["luna", "nowhere"]});
  assert.deepEqual(lim.regions, ["luna"]);
  let e = D.newDrill({birthYear: 2060, age: 20, now: 2090, limits: lim});
  assert.deepEqual(D.current(e).options.map(o => o.label), ["Beyond Earth"]);
  let f = D.newDrill({birthYear: 2060, age: 30, now: 2090, seed: 9});
  f = D.pick(f, "continent", D.current(f).options.find(o => /Europe/.test(o.label)).id);
  f = D.pick(f, "region", "france");
  assert.ok(D.moveTo(f, "a1", "mars").place.a1 === "mars", "an adult chapter can be lived on Mars");
});

test("the years after the change: each line has its own ways, drawn first", async () => {
  const {SINCE_LINES} = await import("../../modules/wodx-creation/data/lifepath-since-lines.mjs");
  const lines = Object.keys(R.LINES).filter(k => k !== "mortal");
  assert.deepEqual(Object.keys(SINCE_LINES).sort(), lines.sort(), "every line that changes has a list");
  const words = /\b(he|she|him|her|his|hers|son|daughter|mother|father|wife|husband|brother|sister|boy|girl|man|woman|men|women|lord|lady)\b/i;
  for ( const [line, rows] of Object.entries(SINCE_LINES) ) {
    assert.ok(rows.length >= 10, `${line} has ten ways or more`);
    for ( const o of rows ) { assert.ok(!words.test(`${o[0]} ${o[4] ?? ""}`), o[0]); assert.ok(!/\u2014|\u2013/.test(o[0]), o[0]); }
  }
  for ( const line of lines ) {
    const turn = line === "demon" ? 1999 : line === "orpheus" ? 1990 : 1300;
    let s = D.newSince({turnYear: turn, nowYear: 2040, line, seed: `t:${line}`});
    const steps = D.sinceSteps(s);
    assert.ok(steps.length >= 1, `${line}: steps`);
    for ( const st of steps ) {
      assert.equal(st.options.length, 5, `${line} ${st.id}`);
      assert.equal(st.options.map(o => o.tone).sort().join(""), "++--0", `${line} ${st.id} shape`);
      const own = st.options.filter(o => o.line);
      assert.ok(own.length >= 1, `${line} ${st.id}: the line's own ways come first`);
      assert.ok(own.every(o => SINCE_LINES[line].some(r => r[0] === o.label)));
      assert.ok(!st.options.some(o => o.local));
    }
  }
  const mage = D.sinceSteps(D.newSince({turnYear: 1300, nowYear: 1800, line: "mage", seed: 1}));
  assert.ok(!mage.flatMap(s => s.options).some(o => /Technocracy/.test(o.label)), "no Technocracy before it is named");
  assert.equal(D.sinceOwn("mage", 1300, 1400).filter(o => /Technocracy/.test(o[0])).length, 0);
  assert.equal(D.sinceOwn("demon", 1500, 1700).length, 0);
  assert.equal(D.sinceOwn("mortal", 1500, 1700).length, 0);
});

test("B3180: elders get the ages before 1197, and their land's dated marks feed those ages", () => {
  assert.deepEqual(D.sinceSpans(-300, 1250).map(x => [x.group, x.from, x.to]), [["B", -299, 476], ["C", 477, 1196], ["M", 1197, 1250]]);
  const s = D.newSince({turnYear: 500, nowYear: 1200, line: "vampire", seed: "elder", region: "moravia"});
  assert.equal(s.region, "moravia");
  const c = D.sinceCurrent(s);
  assert.equal(c.id, "s-C");
  assert.equal(c.options.length, 5);
  const pool = D.datedMarks("moravia", 477, 1196).map(m => m[0]);
  assert.ok(pool.includes("Heard the brothers from Thessaloniki preach in your own tongue"));
  assert.equal(D.newSince({turnYear: 500, nowYear: 1200, region: "nowhere"}).region, null);
});
