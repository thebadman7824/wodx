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

/* B6750 (final audit): the archive by itself waits through a hold or a time skip, as every per-tick job does.
 * gateskip held the world and passed 1200 to 2025: the archive took the test's dead out of the world mid-test. */
test("a hold keeps the long dead in the world; once it is lifted, the next day's look archives them", async () => {
  await Hooks.callAll("init");
  mock.setupTime();
  await Hooks.callAll("ready");
  await mock.settle();
  await game.settings.set(M, "autoArchive", 10);
  await game.time.set(at(1400));
  const f = await Folder.create({name: "WoDX · The Dead", type: "Actor"});
  const smith = await Actor.create({name: "Held Smith", type: "Mortal", folder: f.id});
  await api().lineage.setChronology(smith, {bornYear: 1300, died: at(1360), cause: "age"});
  await game.settings.set("wodx-chronicle", "hold", true);
  assert.equal(game.modules.get("wodx-chronicle").api.isQuiet(), true);
  await game.time.set(at(1401));
  await mock.settle();
  assert.equal(await api().archive.autoTick(at(1402)), null, "nothing archived while the world is held");
  assert.ok(game.actors.get(smith.id), "still in the world while held");
  await game.settings.set("wodx-chronicle", "hold", false);
  const r = await api().archive.autoTick(at(1403));
  assert.deepEqual(r?.archived?.map(a => a.name), ["Held Smith"]);
  assert.ok(!game.actors.get(smith.id), "archived once the hold is lifted");
});
