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
  assert.equal(j.version, "0.34.0");
  assert.equal(j.socket, true);
});

/* NPC 0.34.0: one tie, hard orders, sentries */

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

test("sheets: the Ties tab finds ghouls whose domitor is stored as {id, name}", async () => {
  const XR = await import(pathToFileURL(join(root, "modules/wodx-sheets/scripts/extras-rules.mjs")));
  assert.equal(XR.domitorId({domitor: {id: "v1", name: "Ilse"}}), "v1");
  assert.equal(XR.domitorId({domitor: "v1"}), "v1");
  assert.equal(XR.domitorId({}), null);
  assert.equal(XR.domitorId(null), null);
  assert.match(src("modules/wodx-sheets/scripts/extras.mjs"), /XR\.domitorId\(x\.flags/);
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
