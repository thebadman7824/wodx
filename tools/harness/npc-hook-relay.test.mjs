import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";

/* B6760: a player's feeding, social roll or power reaches WoDX NPC's listeners on the Storyteller's client */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const mock = installMock({dataRoot: root});
game.ready = true;
const docs = new Map();
const doc = (uuid, owners = []) => { const d = {uuid, documentName: "Actor", id: uuid.split(".").pop(), name: uuid, testUserPermission: u => u.isGM || owners.includes(u.id)}; docs.set(uuid, d); return d; };
globalThis.fromUuidSync = uuid => docs.get(uuid) ?? null;
const R = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/hook-relay.mjs")));

test("a player's wodxFed is sent once and runs the listener on the Storyteller's client, as documents again", async () => {
  const pc = doc("Actor.pc1", ["p1"]), vessel = doc("Scene.s.Token.t.Actor.v1");
  const seen = [];
  R.onPlayerHook("wodxFed", p => { if ( game.user.isGM ) seen.push(p); });
  mock.asPlayer();
  await Hooks.callAll("wodxFed", {by: {uuid: pc.uuid, name: "Kai"}, vessel: {uuid: vessel.uuid, name: "A carter"}, drunk: 2, willing: false, fought: false});
  assert.equal(seen.length, 0, "nothing runs on the player's client");
  const sent = mock.log.socket.filter(m => m.data?.type === R.TYPE);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].name, "module.wodx-npc");
  await mock.deliver("gm");
  assert.equal(seen.length, 1, "the Storyteller's client runs it once");
  assert.equal(seen[0].vessel.uuid, vessel.uuid);
  assert.equal(seen[0].drunk, 2);
  assert.equal(seen[0].relayed, true);
  mock.asGM();
});

test("documents travel as uuids: wodxSocial's actor and wodxPowerShown's first argument come back as the documents", async () => {
  const pc = doc("Actor.pc2", ["p1"]), npc = doc("Actor.npc2");
  const got = [];
  R.onPlayerHook("wodxSocial", p => { if ( game.user.isGM ) got.push(["social", p]); });
  R.onPlayerHook("wodxPowerShown", (a, info) => { if ( game.user.isGM ) got.push(["power", a, info]); });
  mock.asPlayer();
  await Hooks.callAll("wodxSocial", {actor: pc, npc, act: "persuade", result: "win"});
  await Hooks.callAll("wodxPowerShown", pc, {power: "Awe", group: "Presence", target: npc});
  await mock.deliver("gm");
  assert.equal(got.length, 2);
  assert.equal(got[0][1].actor, pc); assert.equal(got[0][1].npc, npc); assert.equal(got[0][1].act, "persuade");
  assert.equal(got[1][1], pc); assert.equal(got[1][2].power, "Awe"); assert.equal(got[1][2].target, npc);
  mock.asGM();
});

test("the Storyteller's own hook is not sent; a sender who does not own the actor is refused; no Storyteller online, nothing is sent", async () => {
  const other = doc("Actor.pc3", ["someone-else"]);
  let ran = 0;
  R.onPlayerHook("wodxFed", () => { if ( game.user.isGM ) ran++; });
  mock.log.socket.length = 0;
  await Hooks.callAll("wodxFed", {by: {uuid: other.uuid}, vessel: {uuid: other.uuid}});
  assert.equal(mock.log.socket.length, 0, "the Storyteller's client does not send its own hooks");
  ran = 0;
  mock.asPlayer();
  await Hooks.callAll("wodxFed", {by: {uuid: other.uuid}, vessel: {uuid: other.uuid}});
  await mock.deliver("gm");
  assert.equal(ran, 0, "a player who does not own who fed is refused");
  globalThis.__gmOnline = false;
  mock.asPlayer();
  await Hooks.callAll("wodxFed", {by: {uuid: other.uuid}, vessel: {uuid: other.uuid}});
  assert.equal(mock.log.socket.length, 0);
  globalThis.__gmOnline = true;
  mock.asGM();
});

test("WoDX NPC's listeners for player-fired hooks use the relay", () => {
  const s = f => src(`modules/wodx-npc/scripts/${f}`);
  assert.match(s("aftercare.mjs"), /onPlayerHook\("wodxFed", p => onFed\(p\)/, "the Kiss (Dazed, rest until morning)");
  assert.match(s("rivalry.mjs"), /onPlayerHook\("wodxFed", p => onFed\(p\)/, "the vessel remembers who fed");
  assert.match(s("orders.mjs"), /onPlayerHook\("wodxFed", e =>/, "a follower fed on by its master");
  for ( const h of ["wodxFed", "wodxSocial", "wodxPowerShown"] ) assert.match(s("cults.mjs"), new RegExp(`onPlayerHook\\("${h}"`), `cult deeds: ${h}`);
  for ( const f of ["aftercare.mjs", "rivalry.mjs", "orders.mjs", "cults.mjs"] ) assert.doesNotMatch(s(f), /Hooks\.on\("(wodxFed|wodxSocial|wodxPowerShown)"/, f);
});
