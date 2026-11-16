import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";
import {installActors} from "./actors-mock.mjs";

/*
 * Final audit (B6751-B6752): an approved proposal changes the world, it does not only post a card.
 *   a solo result that changes the world: approved, a tale about the character goes round; turned down, none
 *   a downtime request: study and making start a long task; hunting gets a button that opens the hunt
 * The approvals go through WoDX Chronicle's own queue (decide), as the approval window and the standing rules do.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
await installActors(root);
globalThis.canvas = {tokens: {controlled: []}, scene: null};
await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
await import(join(root, "modules/wodx-storyteller/scripts/main.mjs"));
game.modules.set("wodx-chronicle", {active: true});
game.modules.set("wodx-storyteller", {active: true});
const ST = () => game.modules.get("wodx-storyteller").api;
const Q = () => game.modules.get("wodx-chronicle").api.approvals;
const C = await import(join(root, "modules/wodx-storyteller/scripts/core.mjs"));
let anna;
const pendingOf = type => Q().pending().filter(p => p.type === type);

test("set up: Chronicle and Storyteller start, the approval kinds are registered", async () => {
  await Hooks.callAll("init");
  mock.setupTime();
  await Hooks.callAll("ready");
  await mock.settle();
  const kinds = Q().types().map(t => t.type);
  for ( const k of ["wodx-storyteller.solo", "wodx-storyteller.downtime"] ) assert.ok(kinds.includes(k), k);
  anna = await Actor.create({name: "Anna", type: "Mortal", ownership: {default: 0, p1: 3}});
  assert.ok(C.isPC(anna));
});

test("a solo result that changes the world, approved: a tale about the character goes round", async () => {
  const r = await C.solo({actorId: anna.id, kind: "other", hours: 1, note: "Burned the tithe barn at the crossroads", changesWorld: true});
  assert.equal(r.ok, true);
  const p = pendingOf("wodx-storyteller.solo");
  assert.equal(p.length, 1);
  const before = ST().rumours.list().length;
  await Q().decide(p[0].id, "approve");
  await mock.settle();
  const tales = ST().rumours.list().filter(x => x.about === anna.id);
  assert.equal(ST().rumours.list().length, before + 1, "one rumour more");
  assert.match(tales.at(-1)?.text ?? "", /tithe barn/);
  assert.ok(C.entries().some(e => e.actor === anna.id && /let it stand/.test(e.text)));
});

test("turned down, it stays a private act: no tale", async () => {
  await C.solo({actorId: anna.id, kind: "other", hours: 1, note: "Freed the miller's ox", changesWorld: true});
  const p = pendingOf("wodx-storyteller.solo");
  const before = ST().rumours.list().length;
  await Q().decide(p[0].id, "reject");
  await mock.settle();
  assert.equal(ST().rumours.list().length, before);
  assert.ok(C.entries().some(e => e.actor === anna.id && /private act/.test(e.text)));
});

test("downtime to study, approved: a long task to learn is under way on the sheet", async () => {
  await ST().between.downtime({actorId: anna.id, kind: "study", nights: 3, what: "Latin with the parish priest. Every evening."});
  const p = pendingOf("wodx-storyteller.downtime");
  assert.equal(p.length, 1);
  await Q().decide(p[0].id, "approve");
  await mock.settle();
  const tasks = Object.values(ST().tasks.of(anna) ?? {});
  const t = tasks.find(x => x.kind === "train");
  assert.ok(t, `a train task: ${JSON.stringify(tasks.map(x => x.kind))}`);
  assert.equal(t.name, "Latin with the parish priest");
  assert.equal(t.status, "open");
});

test("downtime to make something, approved: a craft task; to hunt: a card with the Hunt button", async () => {
  await ST().between.downtime({actorId: anna.id, kind: "craft", nights: 2, what: "Mends the cart wheel"});
  await Q().decide(pendingOf("wodx-storyteller.downtime")[0].id, "approve");
  await mock.settle();
  assert.ok(Object.values(ST().tasks.of(anna) ?? {}).some(x => x.kind === "craft" && x.name === "Mends the cart wheel"));
  await ST().between.downtime({actorId: anna.id, kind: "feed", nights: 1, what: "Hunts the docks"});
  await Q().decide(pendingOf("wodx-storyteller.downtime")[0].id, "approve");
  await mock.settle();
  const card = mock.log.chat.find(m => m.flags?.["wodx-storyteller"]?.downtimeGo?.kind === "feed");
  assert.ok(card, "the hunt card");
  assert.match(card.content, /data-action="wst-downtime-go"/);
  assert.ok(card.whisper.includes("p1"), "whispered to the player");
});

test("hunting on your own opens WoDX Actions' hunt for that character once the act is recorded (B6754)", async () => {
  const A = await import(join(root, "modules/wodx-storyteller/scripts/apps.mjs"));
  const asked = [];
  game.modules.set("wodx-actions", {active: true, api: {hunt: ({actor}) => { asked.push(actor?.id); return true; }}});
  const r = await A.request("solo", {actorId: anna.id, kind: "hunt", hours: 1, note: "The docks"});
  assert.equal(r.ok, true);
  assert.deepEqual(asked, [anna.id]);
  await A.request("solo", {actorId: anna.id, kind: "talk", hours: 1, note: "The ferryman"});
  assert.deepEqual(asked, [anna.id], "other acts open no hunt");
  game.modules.delete("wodx-actions");
});
