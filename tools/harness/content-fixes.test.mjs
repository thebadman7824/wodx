import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
const M = "wodx-chronicle";

/* ---- a world with the Rothenstein kinds of tile ---- */
function setPath(obj, path, value) {
  const parts = path.split("."); let o = obj;
  for ( const p of parts.slice(0, -1) ) o = (o[p] ??= {});
  o[parts.at(-1)] = value;
}
class Coll extends Map {
  find(f) { for ( const v of this.values() ) if ( f(v) ) return v; }
  filter(f) { return [...this.values()].filter(f); }
  [Symbol.iterator]() { return this.values(); }
}
const tile = (id, x, y, width, height, flags, anchor = 0.5) =>
  ({id, x, y, width, height, flags: structuredClone(flags), texture: {anchorX: anchor, anchorY: anchor}});
function makeScene(id, name, tiles) {
  const scene = {id, name, tiles: new Coll(tiles.map(t => [t.id, t])), updates: [],
    async updateEmbeddedDocuments(type, list) {
      assert.equal(type, "Tile");
      for ( const u of list ) {
        const t = this.tiles.get(u._id);
        for ( const [k, v] of Object.entries(u) ) if ( k !== "_id" ) setPath(t, k, v);
      }
      this.updates.push(list);
      return list;
    }};
  return scene;
}
const roof = {world: {tm5: {roof: true}}};
const dolany = makeScene("dolany", "Dolany Village", [
  tile("mill", 2838, 805, 724, 598, roof),            // The Village Mill roof
  tile("novotny", 917, 2326, 597, 516, roof)          // odd width and height
]);
const encounter = makeScene("enc01", "Encounter 01", [
  tile("twist", 0, 0, 2820, 2220, {world: {twist: true}}, 0),      // already anchored at its corner
  tile("fog", 0, 1260, 2820, 960, {world: {art5: true}}),
  tile("embers", 2010, -412, 600, 840, {world: {art5: true}})       // partly off the top edge
]);
const camp = makeScene("camp", "Player Camp", [
  tile("tent", 880, 560, 240, 240, {world: {builder: {group: "g1", module: "tent", kit: "camp", rot: 0}}}),
  tile("mine", 400, 400, 200, 200, {})                               // a tile the GM placed by hand
]);
game.scenes = new Coll([[dolany.id, dolany], [encounter.id, encounter], [camp.id, camp]]);
game.release = {generation: 14};

// The builder macros' placement lines, as the Rothenstein importer writes them
const ADD = `function buildDocs(mod, gx, gy, rot, group, label, kit, g) {
  const W = mod.w * g, H = mod.h * g;
  const [fw, fh] = (rot % 180) ? [H, W] : [W, H];
  const cx = gx + fw / 2, cy = gy + fh / 2;
  const tile = { x: Math.round(cx - W / 2), y: Math.round(cy - H / 2), width: W, height: H, rotation: rot, elevation: 0, sort: 10,
    texture: { src: mod.src, fit: "fill", alphaThreshold: 0.75 }, locked: false, flags: { world: { builder: { group, module: mod.key, kit, rot } } } };
  return { tile };
}`;
const SYNC = `${ADD}
function syncOne(t, mod, g) {
    const rot = ((Math.round((t.rotation ?? 0) / 90) * 90) % 360 + 360) % 360;
    const W = mod.w * g, H = mod.h * g;
    const [fw, fh] = (rot % 180) ? [H, W] : [W, H];
    const cx = t.x + W / 2, cy = t.y + H / 2;
    const gx = Math.round((cx - fw / 2) / g) * g, gy = Math.round((cy - fh / 2) / g) * g;
    return buildDocs(mod, gx, gy, rot, "g", "", "camp", g).tile;
}`;
const macro = (id, name, command) => ({id, name, command, async update(c) { Object.assign(this, c); }});
game.macros = new Coll([
  ["add", macro("add", "Builder: Add Module", ADD)],
  ["sync", macro("sync", "Builder: Sync Modules", SYNC)],
  ["other", macro("other", "World: Travel", "ui.notifications.info('travel');")]
]);

await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
const fixes = await import(join(root, "modules/wodx-chronicle/scripts/content-fixes.mjs"));
const pending = () => game.settings.get(M, "approvals").pending;

test("which tiles need the fix", () => {
  assert.equal(fixes.needsAnchorFix(dolany.tiles.get("mill")), true);
  assert.equal(fixes.needsAnchorFix(encounter.tiles.get("twist")), false, "corner-anchored tiles are left alone");
  assert.equal(fixes.needsAnchorFix(encounter.tiles.get("fog")), true);
  assert.equal(fixes.needsAnchorFix(camp.tiles.get("tent")), true);
  assert.equal(fixes.needsAnchorFix(camp.tiles.get("mine")), false, "tiles without a Rothenstein flag are left alone");
  assert.equal(fixes.needsAnchorFix({...dolany.tiles.get("mill"), flags: {...roof, [M]: {anchored: true}}}), false, "never moved twice");
});

test("ready proposes the fix once, with a plain description", async () => {
  await Hooks.callAll("init");
  mock.setupTime();
  await Hooks.callAll("ready");
  await mock.settle();
  const p = pending().filter(e => e.type === "tile-anchors-v14");
  assert.equal(p.length, 1);
  assert.match(p[0].detail, /5 tiles in 3 scenes \(2 roofs, 2 effects, 1 builder module\)/);
  assert.match(p[0].detail, /2 builder macros \(Builder: Add Module, Builder: Sync Modules\)/);
  assert.equal(dolany.tiles.get("mill").x, 2838, "nothing moves before approval");
  await game.modules.get(M).api.contentFixes.checkContentFixes();
  assert.equal(pending().filter(e => e.type === "tile-anchors-v14").length, 1, "not queued twice");
});

test("approving moves each tile by half its size and updates the macros", async () => {
  const id = pending().find(e => e.type === "tile-anchors-v14").id;
  await game.modules.get(M).api.approvals.decide(id, "approve");
  const at = (s, t) => [s.tiles.get(t).x, s.tiles.get(t).y];
  assert.deepEqual(at(dolany, "mill"), [3200, 1104]);
  assert.deepEqual(at(dolany, "novotny"), [1216, 2584], "odd sizes round to the nearest pixel");
  assert.deepEqual(at(encounter, "fog"), [1410, 1740]);
  assert.deepEqual(at(encounter, "embers"), [2310, 8]);
  assert.deepEqual(at(encounter, "twist"), [0, 0]);
  assert.deepEqual(at(camp, "tent"), [1000, 680]);
  assert.deepEqual(at(camp, "mine"), [400, 400]);
  assert.equal(dolany.tiles.get("mill").flags[M].anchored, true);
  assert.equal(game.macros.get("other").command, "ui.notifications.info('travel');");
  assert.doesNotMatch(game.macros.get("add").command, /cx - W \/ 2/);
  assert.match(game.macros.get("add").command, /"wodx-chronicle": \{ anchored: true \}/);
  assert.match(game.macros.get("sync").command, /const cx = t\.x, cy = t\.y;/);
  // Running it again changes nothing
  const before = dolany.updates.length;
  const again = await fixes.applyAnchorFix();
  assert.deepEqual(again, {moved: 0, patched: 0});
  assert.equal(dolany.updates.length, before);
  assert.equal(fixes.surveyAnchors().tiles, 0);
});

test("the updated builder macros place and sync a module by its centre", () => {
  const add = new Function(`${game.macros.get("add").command}; return buildDocs;`)();
  const mod = {w: 3, h: 3, key: "tent", src: "tent.webp"};
  const placed = add(mod, 880, 560, 0, "g", "", "camp", 80).tile;
  assert.deepEqual([placed.x, placed.y], [1000, 680], "a new module's tile is centred on its walls");
  assert.equal(placed.flags[M].anchored, true, "new tiles are marked so the fix leaves them alone");
  const sync = new Function(`${game.macros.get("sync").command}; return syncOne;`)();
  const synced = sync({x: 1000, y: 680, rotation: 0}, mod, 80);
  assert.deepEqual([synced.x, synced.y], [1000, 680], "syncing a fixed tile keeps it where it is");
  const turned = sync({x: 1040, y: 720, rotation: 90}, {...mod, w: 4, h: 2}, 80);
  assert.deepEqual([turned.x, turned.y], [1040, 720], "a turned module keeps its centre");
});

test("a declined fix is not asked again until something new needs it", async () => {
  const reimported = makeScene("hw", "The High Woods", [tile("r1", 100, 100, 200, 100, roof)]);
  game.scenes.set(reimported.id, reimported);
  const {contentFixes, approvals} = game.modules.get(M).api;
  await contentFixes.checkContentFixes();
  let p = pending().find(e => e.type === "tile-anchors-v14");
  assert.match(p.detail, /1 tiles in 1 scenes \(1 roof\)/);
  await approvals.decide(p.id, "reject");
  await contentFixes.checkContentFixes();
  assert.equal(pending().filter(e => e.type === "tile-anchors-v14").length, 0, "declined, so not asked again");
  reimported.tiles.set("r2", tile("r2", 300, 300, 100, 100, roof));
  await contentFixes.checkContentFixes();
  p = pending().find(e => e.type === "tile-anchors-v14");
  assert.ok(p, "asked again once more tiles need it");
  await approvals.decide(p.id, "approve");
  assert.deepEqual([reimported.tiles.get("r1").x, reimported.tiles.get("r1").y], [200, 150]);
  assert.deepEqual(game.settings.get(M, "declinedFixes"), {});
});
