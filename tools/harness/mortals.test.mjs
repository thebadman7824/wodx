import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import * as MR from "../../modules/wodx-npc/scripts/mortal-rules.mjs";
import * as NR from "../../modules/wodx-npc/scripts/npc-rules.mjs";
import * as R from "../../modules/wodx-npc/scripts/routine-rules.mjs";

/* Criminals, combatants and townsfolk (WoDX NPC 0.23.0, B1005 to B1009) */

const prof = k => NR.profileOf({}, k);
const foe = (more = {}) => ({id: "e1", name: "Foe", visible: true, distance: 1, reach: true, wounds: 0, fearSources: [], attackDice: 4, ...more});
const ally = id => ({id, name: id});

test("39 archetypes, each with a template, a routine that checks and tactics that exist", () => {
  const keys = Object.keys(MR.MORTALS);
  assert.equal(keys.length, 39);
  assert.deepEqual(["criminal", "combatant", "townsfolk"].map(g => MR.mortalsFor({group: g}).length), [13, 15, 11]);
  for ( const k of keys ) {
    assert.ok(NR.TEMPLATES[k], `${k} template`);
    assert.equal(NR.TEMPLATES[k].line, "mortal");
    const preset = R.DEFAULT_PRESET[k];
    assert.ok(R.PRESETS[preset], `${k} preset ${preset}`);
    for ( const age of Object.keys(R.AGES) ) {
      const blocks = R.presetBlocks(preset, age);
      assert.ok(blocks.length, `${k} in ${age}`);
      assert.deepEqual(R.checkBlocks(blocks), [], `${k} blocks`);
      for ( const b of blocks ) assert.ok(R.ROLES[b.place], `${k} role ${b.place}`);
    }
    for ( const t of NR.TEMPLATES[k].tactics ) assert.ok(NR.TACTICS[t], `${k} tactic ${t}`);
    assert.ok(NR.TEMPLATES[k].morale >= 0 && NR.TEMPLATES[k].morale <= 2);
  }
  for ( const k of ["guard", "soldier", "civilian", "neonate"] ) assert.equal(NR.TEMPLATES[k].morale, undefined, `${k} keeps no morale`);
});

test("archetypes follow the years", () => {
  assert.ok(MR.inYear("knight", 1300) && !MR.inYear("knight", 1700));
  assert.ok(MR.inYear("hussite", 1420) && !MR.inYear("hussite", 1500));
  assert.ok(!MR.inYear("gang", 1500) && MR.inYear("gang", 1900));
  assert.ok(!MR.inYear("fixer", 1950) && MR.inYear("fixer", 2050));
  assert.ok(MR.inYear("cutpurse", 1197) && MR.inYear("cutpurse", 2080));
  const p1300 = R.presetsFor(1300), p1990 = R.presetsFor(1990);
  assert.ok(p1300.hussite === undefined && R.presetsFor(1425).hussite);
  assert.ok(!p1990.highwayman && p1990.dealer, "presets past their years leave the picker");
  assert.ok(p1300.bandit && !p1990.bandit);
});

test("names guess the archetype for mortals only", () => {
  assert.equal(MR.guessMortal("Hans the footpad"), "footpad");
  assert.equal(MR.guessMortal("Landsknecht sergeant"), "man-at-arms");
  assert.equal(MR.guessMortal("Old Marta, a gossip"), "gossip");
  assert.equal(MR.guessMortal("Ludovic"), null);
  assert.equal(NR.templateFor({kind: "mortal", mortal: "bandit"}), "bandit");
  assert.equal(NR.templateFor({kind: "mortal", mortal: null, melee: 3}), "guard");
  assert.equal(NR.templateFor({kind: "kindred", mortal: "bandit"}), "neonate");
});

test("morale: a levy breaks when its leader falls, a knight fights on", () => {
  const state = (k, more = {}) => NR.scoreOptions(prof(k), {self: {wounds: 0}, enemies: [foe()], allies: [ally("a"), ally("b")], ...more});
  assert.equal(state("militia")[0].action, "attack");
  const broken = state("militia", {leaderDown: true});
  assert.ok(["flee", "surrender"].includes(broken[0].action));
  assert.match(broken.find(o => o.action === "flee").why, /leader is down/);
  assert.equal(state("knight", {leaderDown: true})[0].action, "attack");
  assert.ok(state("militia", {sideDown: 0.6}).find(o => o.action === "flee").why.includes("half their side"));
  // the old templates ignore morale
  const guard = NR.scoreOptions(prof("guard"), {self: {wounds: 0}, enemies: [foe()], allies: [], leaderDown: true});
  assert.ok(!(guard.find(o => o.action === "flee")?.why ?? "").includes("leader"));
});

test("surrender: a beaten footpad yields, and a yielded NPC only waits", () => {
  const p = prof("footpad");
  const beaten = NR.scoreOptions(p, {self: {wounds: 3}, enemies: [foe()], allies: []});
  assert.ok(beaten.some(o => o.action === "surrender"));
  assert.ok(NR.SELF_ACTING.includes("surrender"));
  const fresh = NR.scoreOptions(p, {self: {wounds: 0}, enemies: [foe()], allies: []});
  assert.ok(!fresh.some(o => o.action === "surrender"));
  const done = NR.scoreOptions(p, {self: {wounds: 3, surrendered: true}, enemies: [foe()], allies: []});
  assert.deepEqual(done.map(o => o.action), ["wait"]);
});

test("cover and formation", () => {
  const shoot = k => NR.scoreOptions(prof(k), {self: {wounds: 0}, enemies: [foe({reach: false, distance: 20})], allies: [ally("a"), ally("b")], canRanged: true})
    .find(o => o.action === "shoot").score;
  assert.ok(shoot("swat") > shoot("guard"));
  const flee = k => NR.scoreOptions(prof(k), {self: {wounds: 4}, enemies: [foe()], allies: [ally("a"), ally("b")]}).find(o => o.action === "flee")?.score ?? 0;
  const lone = NR.scoreOptions(prof("musketeer"), {self: {wounds: 4}, enemies: [foe()], allies: []}).find(o => o.action === "flee")?.score ?? 0;
  assert.ok(flee("musketeer") < lone, "the line holds while others stand beside");
});

test("hostage when cornered with a bystander near", () => {
  const opts = NR.scoreOptions(prof("dealer"), {self: {wounds: 2}, enemies: [foe()], allies: [], witnesses: 1});
  assert.ok(opts.some(o => o.action === "hostage"));
  assert.ok(!NR.SELF_ACTING.includes("hostage"), "the Storyteller decides a hostage");
});

test("tell someone later: informers, children and servants", () => {
  for ( const k of ["informer", "child", "servant", "gossip", "journalist"] ) {
    const r = R.pickReaction(prof(k), {supernatural: true});
    assert.ok(r.some(o => o.action === "report"), k);
  }
  assert.ok(!R.pickReaction(prof("guard"), {supernatural: true}).some(o => o.action === "report"));
  assert.ok(!R.pickReaction(prof("informer"), {}).some(o => o.action === "report"), "nothing amiss, nothing to tell");
  assert.ok(R.SELF_RESPONSES.includes("report") && R.RESPONSES.report);
  assert.equal(MR.REPORT_HOURS, 2);
});

test("the runtime wires it in", () => {
  const main = readFileSync(new URL("../../modules/wodx-npc/scripts/main.mjs", import.meta.url), "utf8");
  const rt = readFileSync(new URL("../../modules/wodx-npc/scripts/routines.mjs", import.meta.url), "utf8");
  assert.match(main, /mortal: mortalOf\(actor\)/);
  assert.match(main, /case "surrender":/);
  assert.match(main, /leaderDown, sideDown/);
  assert.match(main, /surrendered: t\.document\.getFlag\(MOD, "surrendered"\)/);
  assert.match(rt, /case "report": \{/);
  assert.match(rt, /Word reaches the watch/);
  assert.match(rt, /snap\?\.reports/);
});
