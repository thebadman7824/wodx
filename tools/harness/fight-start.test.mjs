import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import * as S from "../../modules/wodx-combat/scripts/start-rules.js";
import * as FR from "../../modules/wodx-npc/scripts/fight-rules.mjs";
import * as R from "../../modules/wodx-npc/scripts/routine-rules.mjs";
import * as W from "../../modules/wodx-chronicle/scripts/when-rules.mjs";

/* Fights that start by themselves (WoDX Combat 3.9.0, NPC 0.15.0, Chronicle 0.18.1) */

test("the mode in force: Off stays off, Light touch holds Auto at Suggest, the Storyteller's own hand starts it", () => {
  assert.equal(S.modeFor({mode: "off", byHand: true}), "off");
  assert.equal(S.modeFor({mode: "auto", lightTouch: true}), "suggest");
  assert.equal(S.modeFor({mode: "suggest", byHand: true}), "auto");
  assert.equal(S.modeFor({mode: "suggest"}), "suggest");
  assert.equal(S.modeFor({mode: "nonsense"}), "off");
});

test("a running fight is joined; a waiting encounter is used; else a new one", () => {
  const p1 = S.planStart([{id: "c1", started: true, tokenIds: ["a"]}], ["a", "b"]);
  assert.deepEqual(p1, {use: "c1", add: ["b"], start: false, already: ["a"]});
  const p2 = S.planStart([{id: "c2", started: false, tokenIds: []}], ["a", "b"]);
  assert.equal(p2.use, "c2"); assert.equal(p2.start, true);
  const p3 = S.planStart([], ["a", "b", "b"]);
  assert.equal(p3.use, null); assert.deepEqual(p3.add, ["a", "b"]);
  assert.ok(S.nothingToDo(S.planStart([{id: "c1", started: true, tokenIds: ["a", "b"]}], ["a", "b"]), ["a", "b"]));
  assert.ok(S.nothingToDo(S.planStart([], ["a"]), ["a"]), "one person is not a fight");
});

test("the same request stays quiet for a minute", () => {
  const m = new Map(), k = S.requestKey("sight", ["b", "a"]);
  assert.equal(k, S.requestKey("sight", ["a", "b"]));
  assert.equal(S.askedRecently(m, k, 1000), false);
  m.set(k, 1000);
  assert.equal(S.askedRecently(m, k, 30000), true);
  assert.equal(S.askedRecently(m, k, 62000), false);
});

test("frenzy: only the start of one counts, and the nearest living person in reach is the target", () => {
  assert.ok(S.frenzyBegan(false, true));
  assert.ok(!S.frenzyBegan(true, true));
  assert.ok(!S.frenzyBegan(false, false));
  assert.deepEqual(S.frenzyTargets([{id: "x", yards: 5, down: true}, {id: "y", yards: 9}, {id: "z", yards: 3}, {id: "far", yards: 50}]), ["z"]);
  assert.deepEqual(S.frenzyTargets([{id: "far", yards: 50}]), []);
});

test("who wants a fight: Hostile and Hunted on sight, guards on alarm, never a bystander", () => {
  const guard = {aggression: 0.8, template: "guard", tactics: ["melee"]};
  const civilian = {aggression: 0.2, template: "civilian"};
  assert.equal(FR.wantsFight(guard, -2).source, "sight");
  assert.equal(FR.wantsFight(guard, -3).why, "hunts them");
  assert.equal(FR.wantsFight(guard, -1), null);
  assert.equal(FR.wantsFight(guard, 0, {alarm: "alarm"}).source, "alarm");
  assert.equal(FR.wantsFight(guard, 1, {alarm: "alarm"}), null, "a known friend is let by");
  assert.equal(FR.wantsFight({aggression: 1, template: "neonate"}, 0, {alarm: "alarm"}), null, "only guards keep the alarm");
  assert.equal(FR.wantsFight(civilian, -3), null);
  assert.ok(FR.turnedHostile(-1, -2));
  assert.ok(!FR.turnedHostile(-2, -3), "already hostile");
  assert.ok(!FR.turnedHostile(0, -1));
});

test("pairs after a move: NPCs against characters only, not the fallen or hidden", () => {
  const others = [{id: "n1", pc: false}, {id: "n2", pc: false, down: true}, {id: "p2", pc: true}, {id: "n3", pc: false, hidden: true}];
  assert.deepEqual(FR.pairsFor({id: "p1", pc: true}, others), [{npc: "n1", pc: "p1"}]);
  assert.deepEqual(FR.pairsFor({id: "n9", pc: false}, others), [{npc: "n9", pc: "p2"}]);
  assert.equal(FR.sightRange(30, true), 10);
  assert.equal(FR.sightRange(30, false), 30);
});

test("a Reaction region's Fight is carried out in Auto only when fights start by themselves", () => {
  const opts = [{action: "fight", score: 3}];
  assert.equal(R.autoReaction(opts).act, null);
  assert.equal(R.autoReaction(opts, {fightOk: true}).act.action, "fight");
});

test("the fight outcome on doors and regions", () => {
  const {actions, problems} = W.parseThen("fight the Kessler farm; tell {name} is set upon");
  assert.deepEqual(problems, []);
  assert.equal(actions[0].does, "fight");
  assert.equal(actions[0].text, "the Kessler farm");
  const npcs = [{id: "a", name: "Old Kessler", household: "The Kessler farm", step: 0, yards: 10},
    {id: "b", name: "Hans", household: "", step: -1, yards: 4}, {id: "c", name: "Far", step: -3, yards: 90}];
  assert.deepEqual(W.fightFoes("the kessler farm", npcs), ["a"]);
  assert.deepEqual(W.fightFoes("", npcs), ["b"], "blank: those near who distrust the character");
  assert.deepEqual(W.fightFoes("Hans, old kessler", npcs), ["b", "a"]);
});

test("the starter is wired in: attacks, settings, API, socket, and the NPC triggers", () => {
  const main = readFileSync(new URL("../../modules/wodx-combat/scripts/main.js", import.meta.url), "utf8");
  assert.match(main, /ST\.registerStartSettings\(\)/);
  assert.match(main, /ST\.installStarter\(\)/);
  assert.match(main, /fight: ST\.fightApi/);
  assert.equal((main.match(/openFight\(attackerTok, targetTok\);/g) ?? []).length, 2);
  assert.match(main, /p\?\.action !== "startFight"/, "the damage socket ignores fight requests");
  const rt = readFileSync(new URL("../../modules/wodx-npc/scripts/routines.mjs", import.meta.url), "utf8");
  assert.match(rt, /Hooks\.on\("updateToken", onTokenMoved\)/);
  assert.match(rt, /Hooks\.on\("wodxAttitude"/);
  assert.match(rt, /source: "region"/);
  // 0.15.1: the sight check reads where the tokens stand, not where the moving token is drawn mid-walk
  assert.match(rt, /const yards = restYards\(nTok, pTok\)/);
  assert.match(rt, /sightBlocked\(restCentre\(nTok\), restCentre\(pTok\)\)/);
  const npc = readFileSync(new URL("../../modules/wodx-npc/scripts/main.mjs", import.meta.url), "utf8");
  assert.match(npc, /householdAnswers, kinNear, talk/);
});
