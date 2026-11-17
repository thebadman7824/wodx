import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";
import {installActors} from "./actors-mock.mjs";

/*
 * Final audit (B6758): deeds done in public count on standing, not only a rescue.
 *   a threat made openly and won (WoDX Actions' social act "threaten"): a deed, standing down one
 *   a sermon that moved its hearers (WoDX NPC's Following, preach): a deed, standing up one
 *   a quiet act (persuade) or a lost threat: no deed
 */
// WoDX NPC's passers-by and overheard lines tick on intervals; let the test end without them
{ const si = globalThis.setInterval; globalThis.setInterval = (...a) => { const t = si(...a); t?.unref?.(); return t; }; }
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
await installActors(root);
globalThis.canvas = {tokens: {controlled: []}, scene: null};
await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
await import(join(root, "modules/wodx-storyteller/scripts/main.mjs"));
await import(join(root, "modules/wodx-npc/scripts/main.mjs"));
for ( const m of ["wodx-chronicle", "wodx-storyteller", "wodx-npc"] ) game.modules.set(m, {active: true});
const NPC = () => game.modules.get("wodx-npc").api;
const deeds = a => a.flags?.["wodx-npc"]?.deeds ?? [];
let anna;

test("set up", async () => {
  await Hooks.callAll("init"); mock.setupTime(); await Hooks.callAll("ready"); await mock.settle();
  anna = await Actor.create({name: "Anna", type: "Mortal", ownership: {default: 0, p1: 3}, system: {attributes: {charisma: {value: 3}}, abilities: {leadership: {value: 3}}}});
  assert.ok(NPC()?.standing?.deed);
});

test("a threat made openly and won is a public deed; a quiet one or a lost one is not", async () => {
  Hooks.callAll("wodxSocial", {actor: anna, npc: {id: "n1", name: "the miller"}, act: "persuade", result: "win"});
  Hooks.callAll("wodxSocial", {actor: anna, npc: {id: "n1", name: "the miller"}, act: "threaten", result: "lose"});
  await mock.settle();
  assert.equal(deeds(anna).length, 0);
  Hooks.callAll("wodxSocial", {actor: anna, npc: {id: "n1", name: "the miller"}, act: "threaten", result: "win"});
  await mock.settle();
  assert.equal(deeds(anna).length, 1);
  assert.equal(deeds(anna)[0].delta, -1);
  assert.match(deeds(anna)[0].text, /threatened the miller openly/);
});

test("a sermon that moved its hearers is a public deed", async () => {
  await game.settings.set("wodx-npc", "cultsOn", true);
  const scene = {id: "sc1", uuid: "Scene.sc1", name: "The square", grid: {size: 100}, tokens: []};
  const tok = {id: "t1", actorId: anna.id, x: 0, y: 0, parent: scene, actor: anna};
  const listener = await Actor.create({name: "A listener", type: "Mortal"});
  scene.tokens.push(tok, {id: "t2", actorId: listener.id, x: 100, y: 0, parent: scene, actor: listener});
  game.scenes.set(scene.id, scene);
  globalThis.canvas.scene = scene;
  ChatMessage.getSpeaker ??= ({actor} = {}) => ({alias: actor?.name ?? ""});
  globalThis.Roll = class { constructor(f) { this.f = f; } async evaluate() { this.dice = [{results: [{result: 8}, {result: 9}, {result: 2}]}]; return this; } };
  const before = deeds(anna).length;
  await NPC().cults.preach({actorId: anna.id, text: "Repent, the end is near", pool: "leadership"});
  await mock.settle();
  const d = deeds(anna).slice(before);
  assert.equal(d.length, 1, JSON.stringify(deeds(anna)));
  assert.equal(d[0].delta, 1);
  assert.match(d[0].text, /preached at The square/);
});
