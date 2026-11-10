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
  assert.equal(j.version, "0.8.1");
  assert.equal(j.socket, true);
});
