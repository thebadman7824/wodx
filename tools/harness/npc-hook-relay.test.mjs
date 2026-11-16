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

/* B6767: exactly once per event, however many ways it arrives */
test("exactly once: a player's feeding relayed here and again by another module runs each listener once; the GM's own runs once", async () => {
  const pc = doc("Actor.pc5", ["p1"]), vessel = doc("Actor.v5");
  let a = 0, b = 0;
  R.onPlayerHook("wodxFed", () => { if ( game.user.isGM ) a++; });
  R.onPlayerHook("wodxFed", () => { if ( game.user.isGM ) b++; });
  const ev = {by: {uuid: pc.uuid, name: "Kai"}, vessel: {uuid: vessel.uuid, name: "A carter"}, drunk: 3, willing: false, fought: false};
  mock.log.socket.length = 0;
  mock.asPlayer();
  await Hooks.callAll("wodxFed", structuredClone(ev));
  const msgs = mock.log.socket.splice(0); mock.asGM();
  for ( const m of msgs ) assert.equal(await R.receive(m.data), 4, "all four wodxFed listeners in this file, once each");
  assert.deepEqual([a, b], [1, 1], "the relay ran each listener once");
  // another module (say, a future WoDX Actions relay) fires the same event again on the Storyteller's client
  await Hooks.callAll("wodxFed", {...structuredClone(ev), relayed: true});
  assert.deepEqual([a, b], [1, 1], "the second relay of the same event is skipped");
  // and the other order: the other module's relay first, then ours
  const ev2 = {...ev, drunk: 1};
  await Hooks.callAll("wodxFed", {...structuredClone(ev2), relayed: true});
  mock.asPlayer(); await Hooks.callAll("wodxFed", structuredClone(ev2)); mock.asGM();
  for ( const m of mock.log.socket.splice(0) ) assert.equal(await R.receive(m.data), 0, "every listener had this event from the other relay already");
  assert.deepEqual([a, b], [2, 2]);
  // the Storyteller's own feeding is not relayed: it runs once, and twice for two feedings
  await Hooks.callAll("wodxFed", structuredClone(ev)); await Hooks.callAll("wodxFed", structuredClone(ev));
  assert.deepEqual([a, b], [4, 4]);
  assert.equal(mock.log.socket.length, 0, "nothing sent from the active Storyteller");
});

test("a second Storyteller who is not the active one sends too; the active one runs it once", async () => {
  const pc = doc("Actor.pc6", ["p1"]), npc = doc("Actor.npc6");
  let ran = 0;
  R.onPlayerHook("wodxSocial", p => { if ( game.user.id === "gm" && p.act === "intimidate" ) ran++; });
  const gm2 = {id: "gm2", name: "Second", isGM: true};
  game.users.set("gm2", gm2);
  const prev = game.user; game.user = gm2;
  mock.log.socket.length = 0;
  await Hooks.callAll("wodxSocial", {actor: pc, npc, act: "intimidate", result: "win"});
  game.user = prev;
  assert.equal(mock.log.socket.filter(m => m.data?.type === R.TYPE).length, 1);
  for ( const m of mock.log.socket.splice(0) ) await R.receive(m.data);
  assert.equal(ran, 1);
});

test("no other module relays wodxFed, wodxSocial or wodxPowerShown: they fire only where they happen", async () => {
  const {readdirSync, statSync} = await import("node:fs");
  const files = [];
  const walk = d => { for ( const f of readdirSync(d) ) { const p = join(d, f); if ( statSync(p).isDirectory() ) { if ( f !== "node_modules" && f !== "data" ) walk(p); } else if ( /\.(m?js)$/.test(f) ) files.push(p); } };
  walk(join(root, "modules"));
  const fires = [];
  for ( const f of files ) {
    const s = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for ( const m of s.matchAll(/Hooks\.call(?:All)?\(\s*([^,)]+)/g) ) {
      const arg = m[1].trim();
      if ( /^["'`](wodxFed|wodxSocial|wodxPowerShown)["'`]$/.test(arg) ) fires.push(f.slice(root.length + 1).replace(/\\/g, "/"));
      else if ( !/^["'`]/.test(arg) && /RELAYED|hook/i.test(arg) && !f.includes("wodx-npc/scripts/hook-relay") ) {
        // a generic relay (e.g. WoDX Combat's relayHook) must not list these hooks
        const list = /const RELAYED = \[([^\]]*)\]/.exec(s)?.[1] ?? "";
        assert.doesNotMatch(list, /wodxFed|wodxSocial|wodxPowerShown/, `${f}: relays one of these hooks; WoDX NPC's relay would run its listeners twice (B6767)`);
      }
    }
  }
  assert.deepEqual([...new Set(fires)].sort(), ["modules/wodx-actions/scripts/charms.js", "modules/wodx-actions/scripts/fomor.js", "modules/wodx-actions/scripts/main.js",
    "modules/wodx-actions/scripts/social.js", "modules/wodx-library/scripts/wonder-use.mjs", "modules/wodx-npc/scripts/carry-aftercare.mjs"],
    "a new place fires one of these hooks: check it is where the event happens, not a relay");
});
