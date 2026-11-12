import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import * as P from "../../modules/wodx-creation/scripts/first-night-prelude-rules.mjs";
import * as B from "../../modules/wodx-creation/scripts/first-night-build-rules.mjs";
import * as LP from "../../modules/wodx-creation/scripts/lifepath-rules.mjs";
import * as PR from "../../modules/wodx-storyteller/scripts/prelude-rules.mjs";
import {normRecord} from "../../modules/wodx-creation/scripts/first-night-rules.mjs";

/* WoDX Creation 0.13.0: the guided builder, the prelude runner and the troupe ties (Chronicle Start Desk b1, p1 to p3, t1, t2) */

test("the builder reads Attributes, Abilities by group and the Virtues in use", () => {
  const sys = {attributes: {strength: {value: 2}, charisma: {value: 3}, wits: {value: 1}},
    abilities: {alertness: {value: 1, type: "talent"}, melee: {value: 0, type: "skill", label: "wod.abilities.melee"}, occult: {value: 2, type: "knowledge"}, hidden: {value: 1, type: "talent", isvisible: false}},
    advantages: {virtues: {conscience: {permanent: 2}, conviction: {permanent: 0}, selfcontrol: {permanent: 1}, courage: {permanent: 3}}}};
  const g = B.traitGroups(sys);
  assert.deepEqual(g.physical.map(t => t.path), ["system.attributes.strength.value"]);
  assert.deepEqual(g.talent.map(t => t.label), ["Alertness"]);
  assert.equal(g.skill[0].label, "Melee");
  assert.deepEqual(g.virtues.map(t => t.label), ["Conscience", "Self-Control", "Courage"]);
  assert.equal(g.physical[0].min, 1);
  assert.equal(g.talent[0].min, 0);
  assert.equal(B.dots(3), "●●●○○");
});

test("the prelude runs the lifepath's scenes, then the line's template; a short prelude keeps the turn and after", () => {
  let path = LP.newPath({line: "vampire", birthYear: 1300, turnYear: 1330, seed: "fn", splat: "toreador"});
  for ( let i = 0; i < 20 && !LP.done(path); i++ ) path = LP.choose(path, 0);
  const story = LP.summary(path, {nowYear: 1340}).story;
  const parts = PR.composePrelude({line: "vampire", name: "Ada", year: 1340}).parts;
  const full = P.buildScenes({story, parts, name: "Ada"});
  assert.ok(full.length >= 5);
  assert.equal(full[0].from, "lifepath");
  assert.deepEqual(full.slice(-3).map(s => s.key), ["before", "turn", "after"]);
  assert.ok(full.every(s => s.beats.length), "every scene has beats");
  const short = P.buildScenes({story, parts, short: true});
  assert.deepEqual(short.map(s => s.key), ["turn", "after"]);
  const bare = P.buildScenes({parts});
  assert.deepEqual(bare.map(s => s.key), ["before", "turn", "after"]);
});

test("every era and line: the prelude has scenes", () => {
  for ( const line of PR.LINE_ORDER ) for ( const y of [1197, 1348, 1600, 1890, 1999, 2050] ) {
    const parts = PR.composePrelude({line, year: y}).parts;
    const sc = P.buildScenes({parts});
    assert.equal(sc.length, 3, `${line} ${y}`);
    assert.ok(sc[1].beats.length, `${line} ${y} turn`);
  }
});

test("stakes earn Flaws the trait tables know; rewards keep within 3 freebie points", () => {
  for ( const s of Object.values(P.STAKES) ) assert.ok(s.label && s.text);
  const costs = {ability: 2, background: 1, willpower: 1};
  assert.equal(P.canReward("ability", 0, costs), true);
  assert.equal(P.canReward("ability", 2, costs), false);
  assert.equal(P.canReward("background", 2, costs), true);
  assert.equal(P.canReward("willpower", 3, costs), false);
  assert.equal(P.successes([10, 6, 1, 3], 6), 1);
  assert.equal(P.successes([1, 1, 7], 6), -1);
});

test("the prelude record keeps inside the hub's record", () => {
  const r = normRecord({prelude: {scene: 2, log: [{text: "x"}], spent: 9}});
  assert.equal(P.normPrelude(r.prelude).spent, 3);
  assert.equal(P.normPrelude(r.prelude).scene, 2);
});

test("troupe ties: a ring where each asks about the next; a late joiner sees the chronicle under way", () => {
  assert.deepEqual(P.ring(["a", "b", "c"]).map(p => [p.from, p.about]), [["a", "b"], ["b", "c"], ["c", "a"]]);
  assert.deepEqual(P.ring(["a"]), []);
  assert.match(P.tieQuestion(0, "Jan"), /Jan/);
  assert.ok(!/\b(he|she|his|her|him)\b/i.test(P.TIE_QUESTIONS.join(" ")));
  assert.equal(P.underWay([{signed: false}, {signed: true}]), true);
  assert.equal(P.underWay([]), false);
});
