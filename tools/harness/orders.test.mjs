import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Followers who take orders (WoDX NPC 0.8.0) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const O = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/order-rules.mjs")));

test("orders: only a follower that serves one of your characters, never a player's character", () => {
  assert.equal(O.canOrder({serves: ["pc1"], ownedActorIds: ["pc1"]}).ok, true);
  assert.equal(O.canOrder({serves: ["pc2"], ownedActorIds: ["pc1"]}).ok, false);
  assert.equal(O.canOrder({serves: [], ownedActorIds: ["pc1"]}).ok, false);
  assert.equal(O.canOrder({npcHasPlayerOwner: true, serves: ["pc1"], ownedActorIds: ["pc1"]}).ok, false);
  assert.equal(O.canOrder({isGM: true}).ok, true);
  assert.equal(O.canOrder({isGM: true, npcHasPlayerOwner: true}).ok, false);
});

test("orders: the leader is a character the follower serves and the player owns", () => {
  assert.equal(O.leaderFor({picked: "pc2", serves: ["pc1", "pc2"], ownedActorIds: ["pc2"]}), "pc2");
  assert.equal(O.leaderFor({picked: "pc3", serves: ["pc1", "pc2"], ownedActorIds: ["pc2", "pc3"]}), "pc2");
  assert.equal(O.leaderFor({picked: "pc3", serves: ["pc1"], ownedActorIds: ["pc3"]}), null);
  assert.equal(O.leaderFor({picked: "pc3", serves: [], ownedActorIds: [], isGM: true}), "pc3");
});

test("orders: a follower walks to the free cell beside its leader, and stays put when already there", () => {
  const beside = [{i: 4, j: 5}, {i: 5, j: 4}, {i: 6, j: 6}];
  assert.equal(O.followCell({i: 5, j: 5}, {i: 5, j: 6}, beside, () => true), null);
  assert.deepEqual(O.followCell({i: 5, j: 5}, {i: 1, j: 1}, beside, c => !(c.i === 4 && c.j === 5)), {i: 5, j: 4});
  assert.equal(O.followCell({i: 5, j: 5}, {i: 1, j: 1}, beside, () => false), null);
  // Standing on the leader's own cell counts as not beside it
  assert.deepEqual(O.followCell({i: 5, j: 5}, {i: 5, j: 5}, beside, () => true), {i: 4, j: 5});
});

test("orders: stored orders are checked and described", () => {
  assert.equal(O.normOrder({kind: "dance"}), null);
  assert.equal(O.normOrder({kind: "fetch", target: "t1"}).stage, "out");
  assert.equal(O.describeOrder({kind: "follow", leader: "pc1"}, {pc1: "Ada Brandt"}), "Following Ada Brandt");
  assert.equal(O.describeOrder({kind: "guard", hard: true}), "Guarding (a hard order)");
  assert.equal(O.describeOrder(null), "No order");
});

test("orders: wiring; the Storyteller's client acts; hard orders queue; a fight stops following", () => {
  const s = src("modules/wodx-npc/scripts/orders.mjs");
  assert.match(s, /if \( !isActiveGM\(\) \|\| !setting\("followerOrders"\) \) return/);
  assert.match(s, /order\.hard && !user\.isGM/);
  assert.match(s, /approvals\?\.propose/);
  assert.match(s, /c\.started && c\.scene\?\.id === leaderDoc\.parent\?\.id/);
  assert.match(s, /reason: "order"/);
  const m = src("modules/wodx-npc/scripts/main.mjs");
  assert.match(m, /orders\.registerSettings\(\)/);
  assert.match(m, /tools\.wodxOrders = \{[^}]*visible: true/);
  const j = JSON.parse(src("modules/wodx-npc/module.json"));
  assert.equal(j.socket, true);
});

/* NPC 0.38.0: one tie, hard orders, sentries */

test("orders: an NPC serves whoever any of the four ties names, once each", () => {
  assert.deepEqual(O.servesFrom({}), []);
  assert.deepEqual(O.servesFrom({"wodx-npc": {serves: ["pc1"]}}), ["pc1"]);
  assert.deepEqual(O.servesFrom({"wodx-chronicle": {bound: {actor: "pc2", bg: "retainers", role: "Retainer"}}}), ["pc2"]);
  assert.deepEqual(O.servesFrom({"wodx-creation": {lineage: {domitor: {id: "pc3", name: "Ilse"}}}}), ["pc3"]);
  assert.deepEqual(O.servesFrom({"wodx-creation": {lineage: {domitor: "pc3"}}}), ["pc3"]);
  assert.deepEqual(O.servesFrom({"wodx-creation": {ally: {patron: {id: "pc4", name: "Jan"}, payer: "self"}}}), ["pc4"]);
  assert.deepEqual(O.servesFrom({"wodx-npc": {serves: ["pc1", "pc3"]}, "wodx-creation": {lineage: {domitor: {id: "pc3"}}, ally: {patron: null}}}), ["pc1", "pc3"]);
  assert.deepEqual(O.servesFrom(null), []);
});

test("orders: WoDX spots a hard order in a fight or toward danger", () => {
  assert.deepEqual(O.hardReasons({kind: "follow"}), []);
  assert.deepEqual(O.hardReasons({kind: "follow", inFight: true}), []);
  assert.deepEqual(O.hardReasons({kind: "holdback", inFight: true}), []);
  assert.deepEqual(O.hardReasons({kind: "fetch", inFight: true}), ["it is sent across a fight"]);
  assert.equal(O.hardReasons({kind: "fetch", target: {hostile: true, obvious: true}}).length, 2);
  assert.deepEqual(O.hardReasons({kind: "guard", target: {hostile: true}}), []);
  assert.deepEqual(O.hardReasons({kind: "attack", inFight: true, target: {hostile: true}}), []);
  assert.deepEqual(O.hardReasons({kind: "attack", inFight: false}), ["it is told to start a fight"]);
  assert.equal(O.hardReasons({kind: "attack", inFight: true, target: {obvious: true}}).length, 1);
});

test("orders: the suggested loyalty roll follows the bond and the attitude", () => {
  const bound = O.loyaltyCheck({bondStage: 3, willpower: 4});
  assert.equal(bound.bound, true);
  assert.equal(bound.diff, 8);
  assert.equal(O.loyaltyCheck({bondStage: 0, step: 0, willpower: 3}).diff, 6);
  assert.equal(O.loyaltyCheck({bondStage: 2, step: 2}).diff, 9);
  assert.equal(O.loyaltyCheck({bondStage: 0, step: -3}).diff, 4);
  assert.equal(O.loyaltyCheck({bondStage: 5, step: 9}).bound, true);
  assert.equal(O.loyaltyCheck({willpower: 0}).pool, 1);
});

test("orders: sentries notice strangers only, and warn or step in the way", () => {
  assert.equal(O.isIntruder({}), true);
  assert.equal(O.isIntruder({pc: true}), false);
  assert.equal(O.isIntruder({passerby: true}), false);
  assert.equal(O.isIntruder({sharesMaster: true}), false);
  assert.equal(O.isIntruder({down: true}), false);
  assert.equal(O.sentryAct("watch", {noticed: false}), null);
  assert.equal(O.sentryAct("watch", {noticed: true, yards: 4}), "alarm");
  assert.equal(O.sentryAct("guard", {noticed: true, yards: 4}), "challenge");
  assert.equal(O.sentryAct("guard", {noticed: true, yards: 30}), "alarm");
  assert.equal(O.sentryAct("follow", {noticed: true}), null);
});

test("orders: the orders tool reads every tie, and sentries are wired to token moves", () => {
  const s = src("modules/wodx-npc/scripts/orders.mjs");
  assert.match(s, /servesOf = a => O\.servesFrom\(a\?\.flags\)/);
  assert.match(s, /sentries\(doc\)/);
  assert.match(src("modules/wodx-npc/scripts/routines.mjs"), /bookNow, noticeBy\}/);
});


test("orders: in a fight a follower's order moves its choices", () => {
  const opts = [{action: "attack", target: "t1", score: 6, why: "the nearest foe"}, {action: "attack", target: "t2", score: 4, why: "x"},
    {action: "flee", score: 3, why: "outnumbered"}, {action: "willpower", score: 2, why: "thin"}];
  assert.equal(O.fightShift(opts, null), opts);
  const atk = O.fightShift(opts, {kind: "attack", target: "t2"});
  assert.equal(atk[0].target, "t2");
  assert.match(atk[0].why, /ordered to attack/);
  const hold = O.fightShift(opts, {kind: "holdback"});
  assert.equal(hold[0].action, "flee");
  assert.ok(hold.some(o => o.action === "defend"));
  assert.ok(hold.filter(o => o.action === "attack").every(o => o.score < 1));
  const g = O.fightShift(opts, {kind: "guard"});
  assert.equal(g.find(o => o.action === "flee").score, 1);
  assert.equal(opts[0].score, 6, "the caller's list is left alone");
  assert.ok(O.NEEDS_TARGET.has("attack") && O.ORDERS.holdback);
});

test("orders: the fight AI reads the order and guards every master", () => {
  const m = src("modules/wodx-npc/scripts/main.mjs");
  assert.match(m, /OR\.fightShift\(options, actor\.flags\?\.\[MOD\]\?\.order\)/);
  assert.match(m, /masters\.includes\(t\.actor\?\.id\)/);
});

/* NPC 0.38.0: errands, help, clean-up, chases, loyalty */

test("orders: errands become long tasks on the follower's own dice", () => {
  const t = O.errandTask("buy", {sheet: {commerce: {value: 2}}, master: "pc1", masterName: "Ilse", note: "a lantern", cost: 12});
  assert.equal(t.ability, "commerce");
  assert.equal(t.attr, "manipulation");
  assert.equal(t.errand, "buy");
  assert.equal(t.master, "pc1");
  assert.equal(t.cost, 12);
  assert.match(t.name, /Errand for Ilse: buy something: a lantern/);
  assert.equal(O.errandTask("buy", {sheet: {finance: {}}}).ability, "finance");
  assert.equal(O.errandTask("spy").interval, "day");
  assert.equal(O.errandTask("nope"), null);
  for ( const k of Object.keys(O.ERRANDS) ) { assert.ok(O.errandResult(k, "done")); assert.ok(O.errandResult(k, "ruined")); }
  const n = O.normOrder({kind: "errand", errand: "vessel", task: "t1", cost: "5"});
  assert.equal(n.errand, "vessel"); assert.equal(n.task, "t1"); assert.equal(n.cost, 5);
  assert.equal(O.normOrder({kind: "errand", errand: "dance"}).errand, null);
});

test("orders: dealing with a witness", () => {
  assert.equal(O.cleanupOutcome({successes: 2}).state, "convinced");
  assert.equal(O.cleanupOutcome({successes: 0}).state, null);
  assert.equal(O.cleanupOutcome({botch: true}).state, "told");
  assert.ok(O.NEEDS_TARGET.has("cleanup") && O.NEEDS_TARGET.has("cutoff"));
});

test("orders: loyalty drifts a step at a time and never to Hostile", () => {
  assert.deepEqual(O.drift("drank", {step: 0}).delta, 1);
  assert.equal(O.drift("drank", {step: 3}), null);
  assert.equal(O.drift("unfed", {step: -1}), null);
  const d = O.drift("fedOn", {step: 0});
  assert.equal(d.delta, -1); assert.equal(d.wavers, true);
  assert.equal(O.drift("hard", {step: 2}).wavers, false);
  assert.match(O.drift("unfed", {step: 1, months: 2}).why, /2 months/);
  assert.equal(O.drift("errand", {step: 0}), null);
});

test("storyteller: helpers add their dots, at least one die each, and errands are kept on the task", async () => {
  const R = await import(pathToFileURL(join(root, "modules/wodx-storyteller/scripts/tasks-rules.mjs")));
  assert.equal(R.helperDice([]), 0);
  assert.equal(R.helperDice([{dots: 3}, {dots: 0}]), 4);
  const t = R.normTask({kind: "other", helpers: ["a", "b"], errand: "buy", master: "pc1"});
  assert.deepEqual(t.helpers, ["a", "b"]); assert.equal(t.errand, "buy"); assert.equal(t.master, "pc1");
  assert.deepEqual(R.normTask({}).helpers, []);
  const s = src("modules/wodx-storyteller/scripts/tasks.mjs");
  assert.match(s, /Hooks\.callAll\("wodxTaskDone"/);
  assert.match(s, /R\.helperDice\(/);
});

test("interactables: a follower joins a running chase level with the slowest pursuer", async () => {
  const C = await import(pathToFileURL(join(root, "modules/wodx-interactables/scripts/chase-rules.mjs")));
  const st = C.newChase({quarry: {id: "q", way: "foot", lead: 10}, pursuers: [{id: "p1", way: "foot"}, {id: "p2", way: "foot"}]});
  st.pursuers[0].total = 3; st.pursuers[1].total = 1;
  const j = C.joinChase(st, {id: "f", way: "foot", name: "the ghoul"});
  assert.equal(j.pursuers.length, 3);
  assert.equal(j.pursuers[2].total, 1);
  assert.equal(C.joinChase(j, {id: "f"}), j);
  assert.equal(C.joinChase(st, {id: "q"}), st);
  assert.equal(C.joinChase({...st, status: "caught"}, {id: "g"}).pursuers.length, 2);
  assert.match(src("modules/wodx-interactables/scripts/chase.mjs"), /return \{open, start, rollTurn, end, undoTurn, join,/);
});

test("followers: the hooks other modules call are wired", () => {
  const s = src("modules/wodx-npc/scripts/orders.mjs");
  for ( const h of ["wodxTaskDone", "wodxChase", "wodxFed", "wodxGhoulFix", "wodxBreach"] ) assert.match(s, new RegExp(`Hooks\\.on\\("${h}"`));
  assert.match(src("modules/wodx-actions/scripts/main.js"), /Hooks\.callAll\("wodxFed"/);
  assert.match(src("modules/wodx-chronicle/scripts/signatures.mjs"), /Hooks\.callAll\("wodxGhoulFix", \{actor: a, drank: true/);
});
