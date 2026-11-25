import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* The infernal thrall of Dark Ages: Devil's Due (B7920-B7926; pp. 85-103, 124-125, 132-133) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const T = await imp("modules/wodx-actions/scripts/thrall-rules.js");
const RR = await imp("modules/wodx-storyteller/scripts/recipe-rules.mjs");

test("B7920: a new thrall, the Vices with their virtues, and Torment that rolls over at ten", () => {
  const f = T.thrallFlag({});
  assert.deepEqual([f.resolve.perm, f.torment.perm, f.torment.temp, f.vice], [1, 1, 0, "pride"]);
  assert.equal(Object.keys(T.VICES).length, 7);
  assert.equal(T.VICES.wrath.virtue, "mercy");
  assert.deepEqual(T.shiftTorment({perm: 3, temp: 9}, 1), {perm: 4, temp: 0});
  assert.deepEqual(T.shiftTorment({perm: 3, temp: 1}, -3), {perm: 2, temp: 8}, "a Pact or Taint below zero spends a permanent dot as ten");
  assert.deepEqual(T.shiftTorment({perm: 10, temp: 0}, 5), {perm: 10, temp: 0});
  assert.deepEqual(T.atone({perm: 3, temp: 2}), {perm: 3, temp: 1, xp: 1});
  assert.deepEqual(T.atone({perm: 3, temp: 0}), {perm: 2, temp: 9, xp: 1});
  assert.equal(T.atone({perm: 0, temp: 0}).xp, 0);
  assert.equal(T.resolveXp(2), 14);
  assert.equal(T.resolveXp(2, {thrall: false}), 10);
});

test("B7920: the hierarchy counts a thrall's Torment two higher; Conscience at 6, one harder with no Resolve", () => {
  assert.equal(T.sinApplies(2, 1), false, "giving in to one's own Vice at Torment 1 (counted 3) is no check");
  assert.equal(T.sinApplies(3, 1), true);
  assert.equal(T.sinApplies(4, 3), false);
  assert.equal(T.sinApplies(8, 3), true);
  assert.equal(T.sinApplies(2, 1, {thrall: false}), true, "a demon counts its own Torment");
  assert.equal(T.sinApplies(9, 10), false);
  assert.deepEqual(T.degeneration({resolve: {temp: 2}}), {trait: "conscience", difficulty: 6, empty: false});
  assert.equal(T.degeneration({resolve: {temp: 0}}).difficulty, 7);
  assert.equal(T.degeneration({resolve: {temp: 1}}, {thrall: false}).difficulty, 8);
  assert.equal(Object.keys(T.HIERARCHY).length, 9);
});

test("B7925: sins from play on the thrall's hierarchy", () => {
  assert.deepEqual(["kill", "killFrenzy", "theft", "wordBroken", "lie", "mindMortal", "vice"].map(T.sinForEvent), [8, 7, 4, 4, 5, 6, 2]);
  assert.equal(T.sinForEvent("starve"), null);
  assert.equal(T.sinForEvent("something else"), null);
});

test("B7920: Aura of Sin, Consumption, Vice Addiction and Vulnerability to Faith", () => {
  assert.equal(T.auraReadDiff(1), 10);
  assert.equal(T.auraReadDiff(5), 7);
  assert.deepEqual([1, 2, 3, 5, 6, 8, 9, 10].map(T.auraShift), [0, 0, 1, 1, 2, 2, 3, 3]);
  assert.equal(T.consumption(4, 2), 2);
  assert.equal(T.consumption(2, 4), 0);
  assert.deepEqual(T.viceAddiction(5, 4), {roll: true, trait: "selfcontrol", difficulty: 5});
  assert.equal(T.viceAddiction(4, 4).roll, false);
  assert.deepEqual(["botch", "resists", "indulges"], [T.addictionOutcome({botch: true}), T.addictionOutcome({successes: 1}), T.addictionOutcome({successes: 0})]);
  assert.deepEqual(T.faithBurn(3, 4), {dice: 3, type: "bashing", stay: {trait: "courage", difficulty: 4}});
  assert.equal(T.faithBurn(3, 1).dice, 0, "nothing at Torment 1");
  assert.equal(T.faithBurn(3, 4, {thrall: false}).type, "aggravated");
});

test("B7921: the three-part Pact, the Arcana cap and Willpower x 5 for Taints and Pacts", () => {
  assert.equal(T.pactValue({obligation: 2, frequency: 1, consequence: 1}).value, 2, "the book's prayer of thanks");
  assert.equal(T.pactValue({obligation: 2, frequency: 1, consequence: 5}).value, 6, "the book's never kill a fellow thrall");
  const ab = T.pactValue({obligation: 4, frequency: 5, consequence: 2, avoid: true});
  assert.deepEqual([ab.frequency, ab.value], [3, 3]);
  assert.equal(T.pactValue({obligation: 1, frequency: 5, consequence: 1}).ok, false);
  assert.equal(T.failedConsequence({consequence: 4}), 4);
  assert.equal(T.failedConsequence({consequence: 4}, {chosen: false}), 0, "forced: only the warning");
  const s = T.stateOf({torment: {perm: 1, temp: 2}, taints: [{value: 2}], pacts: [{value: 3}], arcana: [{cost: 9}]});
  assert.equal(T.arcanaCap(s), 17);
  assert.equal(T.canInvest(s, 8).ok, true);
  assert.equal(T.canInvest(s, 9).ok, false);
  assert.equal(T.taintCap(3), 15);
  assert.equal(T.addBurden(s, 11, 3).ok, false);
  assert.deepEqual(T.addBurden(s, 3, 3).torment, {perm: 0, temp: 9});
});

test("B7922: Rites, research by the week, and performing a summoning or a binding", () => {
  const r = T.rite({demon: "Skrik", kind: "bind", resolve: 2, torment: 5, known: {nature: true, vice: true}, ready: false});
  assert.equal(r.id, "rite-bind-skrik");
  assert.deepEqual(T.researchPlan(r), {difficulty: 6, need: 7, have: 0});
  assert.equal(T.researchPlan({...r, trueName: true}, {ability: "occult"}).difficulty, 5);
  let x = T.researchWeek(r, {successes: 4});
  assert.deepEqual([x.progress, x.ready], [4, false]);
  x = T.researchWeek(x, {botch: true});
  assert.deepEqual([x.progress, x.botches], [0, 1]);
  x = T.researchWeek(x, {botch: true});
  assert.deepEqual([x.ready, x.spoiled], [true, true], "two botches in a row: it seems complete");
  assert.equal(T.ritesCap(2), 2);
  assert.deepEqual(T.performPlan({...r, resolve: 4}), {ok: true, difficulty: 5, need: 4, interval: "minute"}, "5 at least");
  assert.equal(T.performPlan({...r, resolve: 9}, {ability: "occult"}).ok, false, "past 10");
  assert.equal(T.performPlan({...r, resolve: 9}, {helpers: 25}).difficulty, 7);
  assert.equal(T.performPlan({...r, master: true}, {thrall: true}).ok, false, "a thrall cannot bind the master");
  assert.equal(T.performPlan({...r, kind: "summon", master: true}, {thrall: true}).interval, "hour");
  assert.deepEqual(T.performRun(r, [{successes: 1}, {successes: 0}, {successes: 1}]), {done: true, ok: true, steps: 3, got: 2});
  assert.deepEqual(T.performRun(r, [{successes: 1}, {successes: 0}, {successes: 0}]), {done: true, ok: false, steps: 3, got: 1}, "two misses in a row");
  assert.equal(T.performRun({...r, kind: "summon"}, [{successes: 0}, {successes: 0}, {successes: 0}]).done, false, "a summoning goes on");
  assert.equal(T.performRun(r, [{successes: 3}], {spoiled: true}).botch, true);
  const b = T.boundDemon({name: "Skrik", willpower: 4, sinceDay: 10});
  assert.equal(T.bondDue(b, 10), false, "the first day it obeys");
  assert.equal(T.bondDue(b, 11), true);
  assert.equal(T.bondDue({...b, lastDay: 11}, 11), false);
  assert.equal(T.bondHolds({successes: 2}, {successes: 2}), true);
  assert.equal(T.bondHolds({successes: 1}, {successes: 2}), false);
});

test("B7923: Absolution of the Damned; the mage thrall at dawn", () => {
  assert.equal(T.absolutionDiff(3), 6);
  assert.equal(T.absolutionDiff(9), 10);
  assert.equal(T.absolutionDice({arcana: [{cost: 3}, {cost: 3}, {cost: 3}, {cost: 1}]}), 2);
  assert.equal(T.absolutionDice({arcana: [{cost: 4}]}), 0);
  const s = T.stateOf({resolve: {perm: 3, temp: 1}});
  assert.equal(T.dawnResolve(s), 2);
  assert.equal(T.dawnResolve(s, {mageSuccesses: 4}), 3);
  assert.equal(T.dawnIndex(6 * 3600, 86400, 3600), 0);
  assert.equal(T.dawnIndex(6 * 3600 - 1, 86400, 3600), -1);
  assert.equal(T.mageBacklashOnes(4), 4);
});

test("B7924: the apothecary is cast as a thrall with a bound imp", async () => {
  const R = await imp("modules/wodx-rothenstein/data/recipe.mjs");
  const recipe = Object.values(R).find(x => x?.cast);
  const plan = RR.castPlan(recipe, [{id: "a", name: "Master Eckhart", playerOwned: false}]);
  const ch = plan.set.find(c => c.id === "a");
  assert.ok(ch?.thrall);
  const f = RR.castFields(ch)["flags.wodx-actions.thrall"];
  assert.deepEqual([f.vice, f.resolve.perm, f.torment.perm, f.pacts[0].value, f.bound[0].name, f.rites[0].kind], ["pride", 2, 3, 2, "Skrik", "bind"]);
  assert.equal(T.absolutionDice(f), 2, "absolution would cost two dice of lethal");
  assert.equal(RR.castPlan(recipe, [{id: "a", name: "Master Eckhart Voss", playerOwned: false, thrall: true}]).set.filter(c => c.thrall).length, 0, "a thrall sheet already there is left alone");
  const made = RR.castPlan(recipe, []).make.find(p => p.name === "Master Eckhart Voss");
  assert.ok(made.sheet["flags.wodx-actions.thrall"].arcana.length === 4);
  assert.ok(!/\b(he|she|his|her|him)\b/i.test(JSON.stringify(made)));
});

test("B7920-B7926: wiring", () => {
  const m = src("modules/wodx-actions/scripts/main.js"), k = src("modules/wodx-actions/scripts/kindred.js"), h = src("modules/wodx-actions/scripts/trait-hooks.js");
  assert.match(m, /\(\) => thx\(\)\.dawn\(\)/);
  assert.match(m, /thrallSin: \(a, e, w\) => thx\(\)\.sinPrompt\(a, e, w\)/);
  assert.match(m, /thx\(\)\.auraEffects\(actor, ctx\)/);
  assert.match(m, /isVampire\(actor\) \|\| THX\.isThrall\(actor\)/);
  assert.match(m, /button\.vta-btn\[data-thx\]/);
  assert.match(k, /const thrall = await ctx\.thrallSin\?\.\(actor, event, what\);/);
  assert.match(k, /await sinPrompt\(killer, "kill", `\$\{actor\.name\} is killed`\);/);
  assert.match(h, /for \(const t of AURA_TICKS\)/);
  assert.match(src("modules/wodx-actions/scripts/profile-menus.js"), /"api:thrall"/);
  const shared = src("modules/wodx-actions/scripts/thrall.js") + src("modules/wodx-actions/scripts/thrall-rules.js");
  assert.ok(!/Skrik|Voss|Eckhart|Rothenstein/.test(shared), "the shared module names no chronicle");
  assert.ok(!/—/.test(shared));
});
