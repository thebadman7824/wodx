import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import * as R from "../../modules/wodx-creation/scripts/lifepath-rules.mjs";
import {keepLifepath} from "../../modules/wodx-creation/scripts/actor-data.mjs";

/* WoDX Creation 0.11.0: lifepaths for every line and splat, 1197 to the World of Future Darkness (Improvement Desk cr1). */

const run = (line, year, {splat, pick = 0, seed = "s"} = {}) => {
  let p = R.newPath({line, birthYear: year - 25, turnYear: year, seed, splat});
  const missing = [];
  for ( let i = 0; i < 20 && !R.done(p); i++ ) {
    if ( !R.currentEvent(p) ) missing.push(R.stageNow(p));
    p = R.choose(p, pick);
  }
  return {p, missing};
};
const YEARS = [1197, 1241, 1348, 1420, 1530, 1620, 1700, 1805, 1848, 1890, 1916, 1930, 1942, 1968, 1989, 2001, 2030, 2099];

test("the tables are whole: titles, text, options, no unknown next scenes, no splat key twice", () => {
  assert.deepEqual(R.lint(), []);
  assert.ok(Object.values(R.SPLATS).flat().length >= 250, "a scene for every splat");
  for ( const line of Object.keys(R.LINES) ) assert.ok(R.SPLATS[line]?.length, `${line} has splats`);
});

test("every year from 1197 to 2300 has a birth scene and a band", () => {
  for ( let y = 1197; y <= 2300; y++ ) {
    const p = R.newPath({line: "mortal", birthYear: y, seed: "b"});
    assert.ok(R.currentEvent(p), `birth ${y}`);
    assert.ok(R.bandOf(y).label, `band ${y}`);
  }
  assert.equal(R.bandOf(1348).key, "plague");
  assert.equal(R.bandOf(2050).key, "future");
});

test("every line runs to the end in every era it is open, with a scene at every stage", () => {
  for ( const line of Object.keys(R.LINES) ) for ( const y of YEARS ) {
    if ( !R.lineOpen(line, y).ok ) continue;
    for ( const pick of [0, 1] ) {
      const {p, missing} = run(line, y, {pick, seed: `${line}${y}`, splat: R.splatsFor(line, y)[0]?.key});
      assert.ok(R.done(p), `${line} ${y} finishes`);
      assert.deepEqual(missing, [], `${line} ${y} has a scene at every stage`);
    }
  }
});

test("lines that open late say so: the Fallen from 1999, projectors from 1848", () => {
  assert.equal(R.lineOpen("demon", 1600).ok, false);
  assert.equal(R.lineOpen("demon", 1600).from, 1999);
  assert.equal(R.lineOpen("demon", 1999).ok, true);
  assert.equal(R.lineOpen("orpheus", 1700).ok, false);
  assert.equal(R.lineOpen("vampire", 1197).ok, true);
});

test("splats follow the years", () => {
  const has = (line, key, y) => R.splatsFor(line, y).some(s => s.key === key);
  assert.ok(has("vampire", "cappadocian", 1300) && !has("vampire", "cappadocian", 1500));
  assert.ok(!has("vampire", "giovanni", 1300) && has("vampire", "giovanni", 1500));
  assert.ok(has("vampire", "anda", 1250) && !has("vampire", "anda", 1900));
  assert.ok(has("changeling", "sidhe", 1250) && !has("changeling", "sidhe", 1600) && has("changeling", "sidhe", 1990));
  assert.ok(!has("mage", "itx", 1800) && has("mage", "itx", 1950) && has("mage", "orArtificers", 1800));
  assert.ok(!has("mage", "akashic", 1400) && has("mage", "daFellowships", 1400));
  assert.ok(has("hunter", "hh2", 1800) && !has("hunter", "avenger", 1800) && has("hunter", "avenger", 2005));
  assert.ok(has("mummy", "ishmaelites", 1500) && !has("mummy", "kherminu", 1500) && has("mummy", "kherminu", 2005));
  assert.ok(has("werewolf", "croatan", 1400) && !has("werewolf", "croatan", 1700));
});

test("hunters by era: the calling before 1500, what you saw to 1998, the Imbuing from 1999", () => {
  const turn = y => { let p = R.newPath({line: "hunter", birthYear: y - 25, turnYear: y, seed: "h"}); while ( R.stageNow(p) !== "turning" ) p = R.choose(p, 0); return R.candidates(p).map(c => c.event.id); };
  assert.deepEqual(turn(1300), ["h.turn.order"]);
  assert.ok(turn(1700).includes("h.turn.seen") && !turn(1700).includes("h.turn.imbued"));
  assert.ok(turn(2005).includes("h.turn.imbued") && !turn(2005).includes("h.turn.seen"));
});

test("the chain: a choice's flag weights what follows, rules scenes out, or names the next one (as Princes of Darkness does)", () => {
  const to = (p, stage) => { while ( R.stageNow(p) !== stage ) p = R.choose(p, 0); return p; };
  // Pick the hard schooling, then look at the first-years pool
  let p = to(R.newPath({line: "vampire", birthYear: 1300, turnYear: 1330, seed: "c"}), "turning");
  const turnId = R.currentEvent(p).id;
  p = R.choose(p, turnId === "v.turn.hunger" ? 0 : 0);
  p = to(p, "after");
  const teach = R.currentEvent(p);
  if ( teach.id === "v.after.teach" ) {
    const strict = R.candidates(R.choose(p, 0)), alone = R.candidates(R.choose(p, 2));
    const w = (list, id) => list.find(c => c.event.id === id)?.w ?? 0;
    assert.ok(w(strict, "v.after2.stick") > w(alone, "v.after2.stick"), "the stick is likelier after a hard schooling");
    assert.equal(w(alone, "v.after2.stick"), 0, "and never after being left alone");
  }
  // An abandoned childe always gets the scene for it
  let q = R.newPath({line: "vampire", birthYear: 1300, turnYear: 1330, seed: "c"});
  const fl = R.flagsOf({...q, steps: [{event: "v.turn.hunger", option: 1}]});
  assert.ok(fl.has("emb:abandoned"));
  const ab = {...q, steps: [{stage: "birth", event: "birth.highmed", option: 0}, {stage: "youth", event: "youth.mentor", option: 0}, {stage: "adult", event: "adult.trade", option: 0},
    {stage: "turning", event: "v.turn.hunger", option: 1}, {stage: "splat", event: null, option: null}]};
  assert.deepEqual(R.candidates(ab).map(c => c.event.id), ["v.after.alone"]);
  // A named next scene wins when it fits
  const pool = [{id: "a", stage: "birth", title: "A", text: "a", options: [{label: "x", n: {c: 1}}]},
    {id: "b", stage: "youth", title: "B", text: "b", options: [{label: "y"}]}, {id: "c", stage: "youth", title: "C", text: "c", options: [{label: "z"}]}];
  const t = R.choose(R.newPath({line: "mortal", birthYear: 1300, seed: "n"}), 0, pool);
  assert.deepEqual(R.candidates(t, pool).map(c => c.event.id), ["c"]);
});

test("seeded and steady: the same path shows the same scene; Back undoes; another scene draws again", () => {
  const p = R.newPath({line: "mortal", birthYear: 1500, seed: "x"});
  assert.equal(R.currentEvent(p).id, R.currentEvent({...p}).id);
  const q = R.choose(p, 0);
  assert.equal(q.steps.length, 1);
  assert.deepEqual(R.back(q).steps, []);
  assert.equal(p.steps.length, 0, "choose does not change the old path");
  let r = q, seen = new Set();
  for ( let i = 0; i < 12; i++ ) { seen.add(R.currentEvent(r).id); r = R.reroll(r); }
  assert.ok(seen.size > 1, "a re-roll can give another scene");
});

test("the summary: suggestions once each, the people, and who may still be alive", () => {
  const {p} = run("vampire", 1600, {seed: "sum", splat: "toreador"});
  const s = R.summary(p, {nowYear: 1610});
  assert.equal(s.story.length, p.steps.filter(x => x.event).length);
  assert.equal(new Set(s.gives.map(g => g.key)).size, s.gives.length);
  assert.ok(s.people.filter(x => x.pick).length <= R.PEOPLE_DEFAULT);
  const late = R.summary(p, {nowYear: 2020});
  assert.ok(late.people.every(x => !x.alive || x.year >= 2020 - R.PEOPLE_ALIVE_SPAN || x.pick !== undefined));
  assert.ok(late.people.filter(x => x.alive).length <= s.people.length);
  assert.match(R.summaryHtml(s, {name: "Test <b>"}), /Test &lt;b&gt;/);
  assert.deepEqual(R.parseGives("bg Allies|ab Crafts|note Free text|odd"), [{kind: "bg", name: "Allies"}, {kind: "ab", name: "Crafts"}, {kind: "note", name: "Free text"}, {kind: "note", name: "odd"}]);
});

test("the sheet suggests the line and the splat", () => {
  assert.equal(R.lineFor("Vampire"), "vampire");
  assert.equal(R.lineFor("Mortal", "ghoul"), "ghoul");
  assert.equal(R.lineFor("Mortal", "revenant"), "revenant");
  assert.equal(R.lineFor("Changing Breed"), "werewolf");
  assert.equal(R.lineFor("Exalted"), "kueijin");
  assert.equal(R.lineFor("Group"), "mortal");
  assert.equal(R.guessSplat("werewolf", "Get of Fenris Ahroun"), "fenris");
  assert.equal(R.guessSplat("vampire", "Toreador 9th"), "toreador");
  assert.equal(R.guessSplat("vampire", "Followers of Set"), "setite");
  assert.equal(R.guessSplat("vampire", "Salubri antitribu"), "salubriat");
  assert.equal(R.guessSplat("mage", "Virtual Adepts"), "va");
  assert.equal(R.guessSplat("vampire", ""), null);
});

test("a change of state keeps the lifepath, and nothing else of Creation's", () => {
  const src = {flags: {"wodx-creation": {lifepath: {v: 1}, lineage: {x: 1}}, other: {a: 1}}};
  const flags = {other: {a: 1}};
  assert.deepEqual(keepLifepath(flags, src), {other: {a: 1}, "wodx-creation": {lifepath: {v: 1}}});
  assert.deepEqual(keepLifepath({}, {flags: {}}), {});
});

test("the words are plain: no gendered pronouns, no long dashes", () => {
  const texts = [];
  const add = e => { texts.push(e.title, e.text); for ( const o of e.options ?? [] ) texts.push(o.label, o.text ?? "", o.g ?? "", o.p ?? ""); };
  R.allEvents().forEach(add);
  for ( const list of Object.values(R.SPLATS) ) for ( const s of list ) { texts.push(s.label); add(s.beat); }
  for ( const t of texts ) {
    assert.ok(!/\b(he|she|him|her|his|hers|himself|herself)\b/i.test(t), `gendered: ${t}`);
    assert.ok(!/[–—]/.test(t), `dash: ${t}`);
  }
});
