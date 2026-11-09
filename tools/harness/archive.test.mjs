import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {performance} from "node:perf_hooks";
import {installMock} from "./foundry-mock.mjs";
import {installActors, Coll} from "./actors-mock.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
await installActors(root);
CONFIG.worldofdarkness.sheettype.changingbreed = "Changing Breed";
globalThis.canvas = {tokens: {controlled: []}};
const M = "wodx-creation";
await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
await import(join(root, "modules/wodx-creation/scripts/main.mjs"));
game.modules.set(M, {});
const api = () => game.modules.get(M).api;
const {getEngine} = await import(join(root, "modules/wodx-chronicle/scripts/calendar.mjs"));
const at = y => getEngine().dateToTime({year: y, month: 3, day: 1, hour: 21});

/* A world compendium, as Foundry's CompendiumCollection behaves for what the archive uses */
const packDocs = new Map();
let refuse = new Set();
const pack = {
  collection: "world.wodx-archive",
  async getIndex() { return new Map([...packDocs].map(([id, d]) => [id, {_id: id, name: d.name}])); },
  async getDocument(id) { const d = packDocs.get(id); return d && {...d, delete: async () => packDocs.delete(id)}; }
};
game.packs = new Map();
foundry.documents = {collections: {CompendiumCollection: {createCompendium: async meta => { pack.meta = meta; game.packs.set("world.wodx-archive", pack); return pack; }}}};
Actor.createDocuments = async (datas, {pack: p, keepId}) => {
  assert.equal(p, "world.wodx-archive"); assert.equal(keepId, true);
  for ( const d of datas ) if ( !refuse.has(d._id) ) packDocs.set(d._id, structuredClone(d));
};
Actor.deleteDocuments = async ids => { for ( const id of ids ) game.actors.delete(id); };
game.actors.importFromCompendium = async (p, id, changes, {keepId}) => {
  const d = packDocs.get(id); if ( !d ) return null;
  const a = new Actor({...structuredClone(d), ...changes, _id: keepId ? id : undefined}); game.actors.set(a.id, a); return a;
};
game.scenes = new Coll();

test("set up a chronicle with the dead, a copy, a player character and a dead man still on a map", async () => {
  await Hooks.callAll("init");
  mock.setupTime();
  await Hooks.callAll("ready");
  await mock.settle();
  await game.time.set(at(1400));
  const f = await Folder.create({name: "WoDX · The Dead", type: "Actor"});
  const mk = async (name, extra = {}) => Actor.create({name, type: "Mortal", folder: f.id, ...extra});
  const a = await mk("Old Smith"); await api().lineage.setChronology(a, {bornYear: 1300, died: at(1360), cause: "age"});
  const b = await mk("Hedwig"); await api().lineage.setChronology(b, {bornYear: 1320, died: at(1380), cause: "plague"});
  const pc = await mk("Anna's Jan", {ownership: {default: 0, p1: 3}}); await api().lineage.setChronology(pc, {died: at(1390)});
  const onMap = await mk("Gravedigger"); await api().lineage.setChronology(onMap, {died: at(1399)});
  game.scenes.set("s1", {id: "s1", name: "Churchyard", tokens: [{actorLink: true, actorId: onMap.id}]});
  const alive = await Actor.create({name: "Living Wenzel", type: "Mortal"});
  const copy = await Actor.create({name: "Radu (1300)", type: "Mortal", flags: {[M]: {snapshotOf: {id: alive.id, name: alive.name}}}});
  const c = api().archive.candidates();
  assert.deepEqual(c.map(x => x.name).sort(), ["Anna's Jan", "Gravedigger", "Hedwig", "Old Smith", "Radu (1300)"]);
  assert.equal(c.find(x => x.name === "Anna's Jan").stay, "a player's character");
  assert.match(c.find(x => x.name === "Gravedigger").stay, /linked token on Churchyard/);
  assert.equal(c.find(x => x.name === "Radu (1300)").kind, "copy");
  assert.ok(!c.some(x => x.name === "Living Wenzel"));
});

test("archive: written to the compendium with the same id first, then out of the world; the rest stay", async () => {
  const ids = api().archive.candidates().map(c => c.id);
  const smith = game.actors.getName("Old Smith");
  const {archived, kept} = await api().archive.archive(ids);
  assert.deepEqual(archived.map(a => a.name).sort(), ["Hedwig", "Old Smith", "Radu (1300)"]);
  assert.deepEqual(kept.map(k => k.name).sort(), ["Anna's Jan", "Gravedigger"]);
  assert.ok(!game.actors.get(smith.id), "gone from the world");
  assert.equal(packDocs.get(smith.id).name, "Old Smith", "in the compendium under its own id");
  assert.equal(api().archive.whereIs(smith.id).where, "archive");
  assert.match(api().archive.whereIs(smith.id).uuid, new RegExp(`Compendium\\.world\\.wodx-archive\\.Actor\\.${smith.id}`));
  const j = game.journal.find(x => x.getFlag(M, "kind") === "archive");
  const html = j.pages.getName("Index").text.content;
  assert.match(html, /@UUID\[Compendium\.world\.wodx-archive\.Actor\.[^\]]+\]\{Old Smith\}/);
  assert.match(html, /plague/);
  assert.ok(game.actors.getName("Anna's Jan") && game.actors.getName("Gravedigger"));
});

test("an actor the compendium did not take stays in the world", async () => {
  const f = game.folders.find(x => x.name === "WoDX · The Dead");
  const z = await Actor.create({name: "Zdenek", type: "Mortal", folder: f.id});
  refuse = new Set([z.id]);
  const {archived, kept} = await api().archive.archive([z.id]);
  refuse = new Set();
  assert.equal(archived.length, 0);
  assert.equal(kept[0].why, "the compendium did not take it");
  assert.ok(game.actors.get(z.id));
});

test("bring back: the same id, in its folder kind, out of the compendium and the index", async () => {
  const id = Object.entries(game.settings.get(M, "archived")).find(([, r]) => r.name === "Old Smith")[0];
  const copyId = Object.entries(game.settings.get(M, "archived")).find(([, r]) => r.name === "Radu (1300)")[0];
  const {restored} = await api().archive.restore([id, copyId]);
  assert.equal(restored.length, 2);
  assert.equal(game.actors.get(id).folder?.name, "WoDX · The Dead");
  assert.equal(game.actors.get(copyId).folder?.name, "WoDX · Before the years");
  assert.ok(!packDocs.has(id));
  assert.equal(api().archive.whereIs(id).where, "world");
  const html = game.journal.find(x => x.getFlag(M, "kind") === "archive").pages.getName("Index").text.content;
  assert.doesNotMatch(html, /Old Smith/);
  assert.match(html, /Hedwig/);
});

test("a large world: 3000 characters and 400 journals, the plan, the archive list and the events stay quick", async () => {
  const f = game.folders.find(x => x.name === "WoDX · The Dead");
  for ( let i = 0; i < 3000; i++ ) {
    const dead = i % 3 === 0;
    const a = await Actor.create({name: `Villager ${i}`, type: i % 10 === 0 ? "Vampire" : "Mortal", folder: dead ? f.id : null});
    a.flags[M] = {chronology: dead ? {bornYear: 1300, died: at(1350)} : {bornYear: 1370 + (i % 20)}};
  }
  for ( let i = 0; i < 400; i++ ) await JournalEntry.create({name: `Note ${i}`, pages: [{name: "p", type: "text", text: {content: "<p>x</p>"}}]});
  const time = fn => { const t = performance.now(); const r = fn(); return [performance.now() - t, r]; };
  const [tPlan, plan] = time(() => api().time.planSkip({from: game.time.worldTime, to: at(1420)}));
  const [tList, list] = time(() => api().archive.candidates());
  const t0 = performance.now();
  await game.modules.get("wodx-chronicle").api.events.check();
  const tEvents = performance.now() - t0;
  const t1 = performance.now();
  const r = await api().archive.archive(list.filter(c => !c.stay).map(c => c.id));
  const tArchive = performance.now() - t1;
  console.log(`large world: plan ${tPlan.toFixed(0)} ms for ${plan.rows.length} rows, list ${tList.toFixed(0)} ms, events ${tEvents.toFixed(0)} ms, archive ${tArchive.toFixed(0)} ms for ${r.archived.length}`);
  assert.ok(plan.rows.length >= 2000);
  assert.ok(r.archived.length >= 1000);
  // Budgets on the stand-in; the gate measures the real thing
  assert.ok(tPlan < 8000, `plan ${tPlan} ms`);
  assert.ok(tList < 2000, `list ${tList} ms`);
  assert.ok(tEvents < 500, `events ${tEvents} ms`);
  assert.ok(tArchive < 8000, `archive ${tArchive} ms`);
});
