import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* The 7b follow-on: the turn conductor (WoDX Combat 3.7.0) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CR = await import(join(root, "modules/wodx-combat/scripts/conductor-rules.js"));
const base = (o = {}) => ({level: "npc", paused: false, phase: "main", c: {isNPC: true, npcMode: "auto"}, npcDone: false, actionSpent: false, graceOver: false, timerOver: false, blocks: {}, ...o});

test("off means off; a paused game never advances", () => {
  assert.equal(CR.decide(base({level: "off", npcDone: true})).act, "wait");
  assert.equal(CR.decide(base({paused: true, npcDone: true})).act, "wait");
  assert.match(CR.decide(base({paused: true})).why, /paused/);
});

test("NPC turns: advance once WoDX NPC has acted; wait while it needs the Storyteller or its mode is Off", () => {
  assert.equal(CR.decide(base()).act, "wait");
  assert.equal(CR.decide(base({npcDone: true})).act, "advance");
  assert.equal(CR.decide(base({npcWaiting: true})).act, "wait");
  assert.equal(CR.decide(base({c: {isNPC: true, npcMode: "off"}, npcDone: true})).act, "wait");
  assert.match(CR.decide(base({c: {isNPC: true, npcMode: "suggest"}})).why, /accept/);
  assert.equal(CR.decide(base({c: {isNPC: true, npcMode: "suggest"}, npcDone: true})).act, "advance");
  assert.equal(CR.decide(base({c: {isNPC: true, cannotAct: true}})).act, "skip");
});

test("what holds a turn open: damage waiting, a token moving, an approval from this turn", () => {
  for ( const b of [{pendingDamage: true}, {moving: true}, {pendingApproval: true}] ) {
    const d = CR.decide(base({npcDone: true, blocks: b}));
    assert.equal(d.act, "wait", JSON.stringify(b));
  }
});

test("player turns are the players' at the NPC level; at Everyone they end on the action or the time", () => {
  const pc = (o = {}) => base({c: {isNPC: false}, ...o});
  assert.equal(CR.decide(pc({actionSpent: true, graceOver: true})).act, "wait", "NPC level: the player ends it");
  assert.equal(CR.decide(pc({c: {isNPC: false, cannotAct: true}})).act, "wait", "NPC level: even a fallen PC is the player's");
  const ev = (o = {}) => pc({level: "everyone", ...o});
  assert.equal(CR.decide(ev()).act, "wait");
  assert.equal(CR.decide(ev({actionSpent: true})).act, "wait", "the countdown runs first");
  assert.equal(CR.decide(ev({actionSpent: true, graceOver: true})).act, "advance");
  assert.equal(CR.decide(ev({timerOver: true})).act, "hold", "time out before acting: the action is held");
  assert.equal(CR.decide(ev({timerOver: true, actionSpent: true})).act, "advance", "time out after acting: the turn ends");
  assert.equal(CR.decide(ev({c: {isNPC: false, cannotAct: true}})).act, "skip");
  assert.equal(CR.decide(ev({c: {isNPC: false, held: true}})).act, "advance", "a held character's turn passes");
});

test("the extra-action pass: Initiative order, only those with extra actions, not the defeated (VtDA20 p. 344, W20 p. 268)", () => {
  const q = CR.extraPass([{id: "a", initiative: 12, extra: 1}, {id: "b", initiative: 18.05, extra: 2}, {id: "c", initiative: 15, extra: 0},
    {id: "d", initiative: 20, extra: 1, defeated: true}, {id: "e", initiative: 12, extra: 1}]);
  assert.deepEqual(q.map(x => x.id), ["b", "a", "e"]);
  assert.equal(q[0].n, 2);
  assert.deepEqual(CR.extraPass([]), []);
});

test("Hold: a held character steps in right after the current one", () => {
  assert.equal(CR.stepInInitiative(15, 9), 12);
  assert.ok(CR.stepInInitiative(15, 14.99) < 15 && CR.stepInInitiative(15, 14.99) > 14.99);
  assert.ok(CR.stepInInitiative(7, null) < 7, "last in the order: just below");
  assert.equal(CR.secondsLeft(null), null);
  assert.equal(CR.secondsLeft(10_500, 10_000), 1);
  assert.equal(CR.secondsLeft(9_000, 10_000), 0);
  assert.equal(CR.actionsAllowed({extra: 2}), 3);
});

test("wiring: Combat 3.7.0 loads the conductor; NPC 0.1.3 reports its turns; players ask, the Storyteller's client acts", () => {
  const m = JSON.parse(readFileSync(join(root, "modules/wodx-combat/module.json"), "utf8"));
  assert.equal(m.version, "3.9.0");
  const main = readFileSync(join(root, "modules/wodx-combat/scripts/main.js"), "utf8");
  assert.match(main, /CD\.registerConductorSettings\(\)/);
  assert.match(main, /CD\.installConductor\(\)/);
  const cd = readFileSync(join(root, "modules/wodx-combat/scripts/conductor.js"), "utf8");
  assert.match(cd, /if \(!p\?\.conductor \|\| !isActiveGM\(\)\) return/);
  assert.match(cd, /testUserPermission\?\.\(user, "OWNER"\)/, "only an owner (or the Storyteller) can end, hold or step in");
  const npc = readFileSync(join(root, "modules/wodx-npc/scripts/main.mjs"), "utf8");
  assert.match(npc, /Hooks\.callAll\("wodxNpcTurnDone"/);
  assert.ok(!/\b(he|she|him|her|his|hers)\b/.test(cd.match(/`[^`]*`/g).join(" ").replace(/<[^>]+>/g, " ")), "gender-neutral text (B48)");
});

test("Combat 3.7.3: a turn come back to starts afresh; a time limit set mid-turn starts counting", () => {
  const cd = readFileSync(join(root, "modules/wodx-combat/scripts/conductor.js"), "utf8");
  assert.match(cd, /cur = null;\n\s+if \(isActiveGM\(\) && combat\.started && level\(\) !== "off"\) startTurn\(combat\);/);
  assert.match(cd, /if \(!isNPC && !cur\.timerEndsAt && !cur\.actionSpent && level\(\) === "everyone" && limit > 0\)/);
});

test("Combat 3.7.4: Act next on a tie with the next combatant moves the current one up first", () => {
  const cd = readFileSync(join(root, "modules/wodx-combat/scripts/conductor.js"), "utf8");
  assert.match(cd, /nextInit !== null && nextInit >= curInit \? Math\.round\(\(nextInit \+ 0\.002\) \* 10000\) \/ 10000 : curInit/);
  // the hero then lands strictly between them
  assert.ok(CR.stepInInitiative(8.002, 8) < 8.002 && CR.stepInInitiative(8.002, 8) > 8);
});

test("Combat 3.8.1: out of turn, a player's token stays put; the Storyteller never is stopped", () => {
  const base = {mode: "block", isGM: false, inFight: true, isCurrent: false, held: false};
  assert.equal(CR.turnMove({...base, mode: "off"}).ok, true);
  assert.equal(CR.turnMove({...base, isGM: true}).ok, true);
  assert.equal(CR.turnMove({...base, inFight: false}).ok, true, "a token outside the fight moves freely");
  assert.equal(CR.turnMove({...base, isCurrent: true}).ok, true);
  assert.equal(CR.turnMove(base).ok, false);
  assert.match(CR.turnMove({...base, held: true}).why, /Act next/);
  const main = readFileSync(join(root, "modules/wodx-combat/scripts/main.js"), "utf8");
  assert.ok(main.indexOf('setting("turnMoves")') < main.indexOf('setting("movementLimit")'), "the turn check runs before the yards are counted");
  assert.match(main, /s\("turnMoves"[\s\S]*?"off", \{ choices: CR\.TURN_MOVES \}/);
});
