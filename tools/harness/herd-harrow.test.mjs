import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";
import {installActors} from "./actors-mock.mjs";

/*
 * Final audit (B6756): two cards that only told now start what they promise.
 *   an overfed district: "a vessel dies of it" names who, from the vessels fed on there, and files them among the dead
 *   a Fetter lost to neglect: "a Harrowing follows" carries a button that opens WoDX Actions' Harrowing for the wraith
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
const R = await import(join(root, "modules/wodx-storyteller/scripts/herd-rules.mjs"));
const Herds = await import(join(root, "modules/wodx-storyteller/scripts/herds.mjs"));
const Up = await import(join(root, "modules/wodx-storyteller/scripts/upkeep.mjs"));
const killed = [], harrowed = [];

test("set up", async () => {
  await Hooks.callAll("init"); mock.setupTime(); await Hooks.callAll("ready"); await mock.settle();
  game.modules.set("wodx-npc", {active: true, api: {fates: {apply: async d => { killed.push(...Object.keys(d.changes)); return "1 NPC changed"; }}}});
  game.modules.set("wodx-actions", {active: true, api: {harrowing: async o => { harrowed.push({id: o.actor?.id, kind: o.kind}); return true; }}});
});

test("who dies: the most fed-on vessels who are not player characters, each once", () => {
  let l = R.addVessel({}, 5, {uuid: "Actor.a", name: "Agnes"});
  l = R.addVessel(l, 5, {uuid: "Actor.b", name: "Bertil"});
  l = R.addVessel(l, 5, {uuid: "Actor.b", name: "Bertil"});
  l = R.addVessel(l, 5, {uuid: "Actor.p", name: "Pia", pc: true});
  assert.equal(l.list.length, 4);
  assert.deepEqual(R.pickDead(l.list, 1, () => 0.5), [{uuid: "Actor.b", name: "Bertil"}]);
  assert.deepEqual(R.pickDead(l.list, 3, () => 0.5).map(v => v.name), ["Bertil", "Agnes"], "never a player character");
  assert.equal(R.addVessel(l, 6, {uuid: "Actor.c", name: "Cord"}).list.length, 1, "a new month starts again");
  assert.deepEqual(R.pickDead([], 2), []);
});

test("an overfed month files a named vessel among the dead and marks a passer-by's token", async () => {
  const agnes = await Actor.create({name: "Agnes", type: "Mortal"});
  const marks = [];
  const passer = {id: "tokA", name: "A carter", isToken: true, toggleStatusEffect: async (s, o) => { marks.push([s, o.active]); return true; }};
  const prev = globalThis.fromUuidSync;
  globalThis.fromUuidSync = u => (u === `Actor.${agnes.id}` ? agnes : u === "Scene.x.Token.t.Actor.tokA" ? passer : null);
  try {
    const names = await Herds.buryDead(2, [{uuid: `Actor.${agnes.id}`, name: "Agnes"}, {uuid: "Scene.x.Token.t.Actor.tokA", name: "A carter"}]);
    assert.deepEqual(names.sort(), ["A carter", "Agnes"]);
    assert.deepEqual(killed, [agnes.id]);
    assert.deepEqual(marks, [["dead", true]]);
  } finally { globalThis.fromUuidSync = prev; }
  assert.ok(!/Storyteller says who/.test(await (await import("node:fs/promises")).readFile(join(root, "modules/wodx-storyteller/scripts/herds.mjs"), "utf8")));
});

test("a Fetter lost to neglect: the card's Face the Harrowing button opens a Fetter's Harrowing", async () => {
  const w = await Actor.create({name: "Wilhelm", type: "Wraith", ownership: {default: 0, p1: 3}});
  const [fet] = await w.createEmbeddedDocuments("Item", [{name: "The mill", type: "Feature", system: {type: "fetter", value: 1}}]);
  globalThis.Roll = class { constructor(f) { this.f = f; } async evaluate() { this.dice = [{results: [{result: 1}]}]; return this; } };
  await Q().propose({type: Up.T_LAPSE, key: `lapse:${w.id}`, title: "Wilhelm: the mill untended", detail: "", data: {actorId: w.id, itemId: fet.id, how: "neglect", name: "The mill", key: "fetter"}});
  const p = Q().pending().find(x => x.type === Up.T_LAPSE);
  assert.ok(p, "queued");
  await Q().decide(p.id, "approve");
  await mock.settle();
  const card = mock.log.chat.find(m => m.flags?.["wodx-storyteller"]?.harrow?.actorId === w.id);
  assert.ok(card, "the card carries the Harrowing");
  assert.match(card.content, /data-action="wst-harrow"/);
  // the button, as Foundry renders it
  let click = null;
  const el = {querySelector: s => (s === "[data-action=wst-harrow]" ? {addEventListener: (e, fn) => { click = fn; }, remove() {}} : null)};
  Up.bindHarrowCard({flags: card.flags}, el);
  assert.ok(click, "bound");
  await click();
  assert.deepEqual(harrowed, [{id: w.id, kind: "fetter"}]);
});
