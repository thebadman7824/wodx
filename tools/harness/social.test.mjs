import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* "With this person" (Actions 3.20.0), the NPC attitude track (NPC 0.11.0) and the new "Only when" tests (Chronicle 0.15.0) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SR = await import(pathToFileURL(join(root, "modules/wodx-actions/scripts/social-rules.js")));
const AT = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/attitude-rules.mjs")));
const W = await import(pathToFileURL(join(root, "modules/wodx-chronicle/scripts/when-rules.mjs")));

test("first meeting takes the household's standing, else a faction's, else Unknown", () => {
  const st = {"the kessler farm": 2, "kessler": 2, "the watch": -1};
  assert.deepEqual(AT.seedFrom({household: "The Kessler farm", factions: ["the watch"]}, st), {step: 2, from: "The Kessler farm"});
  assert.deepEqual(AT.seedFrom({household: "The mill", factions: ["The Watch"]}, st), {step: -1, from: "The Watch"});
  assert.deepEqual(AT.seedFrom({household: "", factions: []}, st), {step: 0, from: ""});
});

test("after the first meeting the attitude is the NPC's own", () => {
  const seed = {step: 2, from: "The Kessler farm"};
  let all = {};
  assert.deepEqual(AT.attitudeOf(all, "c1", seed), {step: 2, word: "Welcome", met: false, from: "The Kessler farm"});
  all = {c1: AT.changed(all, "c1", {delta: -1, why: "threatened", at: 5}, seed)};
  assert.equal(all.c1.step, 1);
  assert.equal(all.c1.log[0].why, "First met: as The Kessler farm regards them");
  // The faction later turns hostile: the NPC's own attitude stays
  assert.equal(AT.attitudeOf(all, "c1", {step: -3, from: "x"}).step, 1);
  all = {c1: AT.changed(all, "c1", {to: "honoured"}, seed)};
  assert.equal(all.c1.step, 3);
  all = {c1: AT.changed(all, "c1", {delta: 9}, seed)};
  assert.equal(all.c1.step, 3, "never past Honoured");
  for (let i = 0; i < 30; i++) all = {c1: AT.changed(all, "c1", {delta: 0, why: String(i)}, seed)};
  assert.equal(all.c1.log.length, AT.LOG_LIMIT);
});

test("attitude moves the difficulty by a step past Unknown, at most two; intimidation ignores it", () => {
  assert.equal(AT.difficultyShift(0), 0);
  assert.equal(AT.difficultyShift(1), -1);
  assert.equal(AT.difficultyShift(3), -2);
  assert.equal(AT.difficultyShift(-2), 2);
  assert.equal(AT.difficultyShift(-3), 2);
  assert.equal(AT.difficultyShift(-3, {ignore: true}), 0);
  assert.ok(SR.actByKey("intimidate").noShift && SR.actByKey("threaten").noShift);
});

test("resisted outcomes: ties, botches, and a lie that must be beaten", () => {
  assert.deepEqual(SR.outcome({successes: 3}, {successes: 1}), {result: "win", margin: 2});
  assert.deepEqual(SR.outcome({successes: 1}, {successes: 1}), {result: "tie", margin: 0});
  assert.deepEqual(SR.outcome({successes: 0, botch: true}, {successes: 0}), {result: "botch", margin: 0});
  assert.equal(SR.outcome({successes: 2}, {successes: 2}, {needMore: true}).result, "win");
  assert.equal(SR.outcome({successes: 2}, {successes: 3}, {needMore: true}).result, "lose");
  assert.equal(SR.outcome({successes: 2}, {successes: 4, botch: true}).result, "win", "a botched resist resists nothing");
});

test("each act uses a dramatic system and moves the attitude as the house rules say", () => {
  for (const a of SR.ACTS) {
    assert.ok(a.preset && a.ref && a.note, a.key);
    assert.equal(SR.attitudeMove(a, "tie"), 0);
  }
  assert.equal(SR.attitudeMove(SR.actByKey("bribe"), "win"), 1);
  assert.equal(SR.attitudeMove(SR.actByKey("con"), "botch"), -2);
  assert.equal(SR.offerDice("lavish"), 3);
  assert.equal(SR.outcomeText(SR.actByKey("con"), {result: "lose", margin: 1}, "The miller"), "The miller sees through it.");
});

test("sway notes: one per kind and NPC, an hour long, the old ones pruned", () => {
  let l = SR.addSway([], {kind: "persuaded", npc: "n1", npcName: "Miller"}, 100);
  l = SR.addSway(l, {kind: "persuaded", npc: "n1", npcName: "Miller"}, 200);
  assert.equal(l.length, 1);
  assert.equal(l[0].until, 200 + SR.SWAY_SECONDS);
  l = SR.addSway(l, {kind: "bribed", npc: "n2"}, 200 + SR.SWAY_SECONDS + 1);
  assert.deepEqual(l.map(x => x.kind), ["bribed"]);
});

test("Only when: attitude and persuaded tests", () => {
  const ctx = {time: 50, actor: {name: "Anna", sways: [{kind: "fooled", npc: "n1", npcName: "Old Grete", until: 99}]}, npc: {id: "n1", name: "Old Grete", attitude: -1}};
  const ok = w => W.checkWhen(W.parseWhen(w), ctx).ok;
  assert.ok(ok("attitude <= distrusted"));
  assert.ok(!ok("attitude >= tolerated"));
  assert.ok(ok("fooled"));
  assert.ok(ok("fooled by grete"));
  assert.ok(!ok("persuaded"));
  assert.ok(!ok("fooled by the abbot"));
  assert.ok(ok("not charmed"));
  assert.equal(W.parseWhen("attitude welcome").problems.length, 1);
  assert.equal(W.parseWhen("persuaded the miller").problems.length, 1);
  // No NPC in the check: a bare test cannot be answered
  assert.ok(!W.checkWhen(W.parseWhen("fooled"), {...ctx, npc: null}).ok);
});

test("lift and plant: what fits a pocket, who notices, what the hand finds, coins and pockets by era", () => {
  const items = [
    {id: "a", name: "silver ring", type: "Item", flags: {"wodx-sheets": {conceal: "P"}}},
    {id: "b", name: "letter", type: "Item", flags: {"wodx-sheets": {conceal: "J"}}},
    {id: "c", name: "sack of grain", type: "Item", flags: {"wodx-sheets": {conceal: "N"}}},
    {id: "d", name: "knife", type: "Melee Weapon", system: {conceal: "P"}},
    {id: "e", name: "sword", type: "Melee Weapon", system: {}},
    {id: "f", name: "satchel", type: "Item", system: {iscontainer: true}},
    {id: "g", name: "mail shirt", type: "Armor"},
    {id: "h", name: "bronze coin", type: "Item", flags: {"wodx-sheets": {coin: {denom: "d"}, qty: 7}}},
    {id: "i", name: "trinket", type: "Item"}
  ];
  assert.deepEqual(SR.liftable(items).map(i => i.id), ["a", "b", "d", "h", "i"]);
  assert.deepEqual(SR.liftOutcome({successes: 2}, {successes: 2}), {done: true, noticed: false, net: 0});
  assert.deepEqual(SR.liftOutcome({successes: 1}, {successes: 2}), {done: false, noticed: true, net: -1});
  assert.deepEqual(SR.liftOutcome({successes: 0}, {successes: 0}), {done: false, noticed: false, net: 0});
  assert.equal(SR.liftOutcome({successes: 0, botch: true}, {successes: 0}).noticed, true);
  const small = SR.liftable(items);
  assert.equal(SR.liftPick(small, 2, "b").id, "b");
  assert.equal(SR.liftPick(small, 1, "b", 0).id, "a", "one success: the first thing the hand finds");
  assert.equal(SR.coinShare(100, 1), 10);
  assert.equal(SR.coinShare(100, 2), 25);
  assert.equal(SR.coinShare(100, 5), 50);
  assert.equal(SR.coinShare(3, 1), 1);
  assert.equal(SR.coinShare(0, 3), 0);
  assert.match(SR.pocketsIn(1197), /belt/);
  assert.match(SR.pocketsIn(1750), /coat/);
  assert.match(SR.pocketsIn(1995), /wallet/);
  assert.match(SR.pocketsIn(2090), /cred chip/);
  assert.ok(SR.PRESETS.liftNpc.opp.needMore);
});
