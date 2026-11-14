/* WoDX Otherworlds 0.17.0: endless wild land (the open Umbra, the Tempest's storm sea). The pure rules, then walking
 * on from piece to piece against stand-ins. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as WR from "../../modules/wodx-otherworlds/scripts/wild-rules.mjs";
import * as RM from "../../modules/wodx-otherworlds/scripts/realm-maps-rules.mjs";

test("a piece is fixed by its seed and its place, and differs from its neighbours and from another seed", () => {
  for ( const wild of WR.WILD_ORDER ) {
    const a = WR.wildTile({wild, seed: 7, x: 2, y: -3, year: 1300}), b = WR.wildTile({wild, seed: 7, x: 2, y: -3, year: 1300});
    assert.deepEqual(a, b);
    assert.notDeepEqual(a.cells, WR.wildTile({wild, seed: 7, x: 3, y: -3, year: 1300}).cells);
    assert.notDeepEqual(a.cells, WR.wildTile({wild, seed: 8, x: 2, y: -3, year: 1300}).cells);
    assert.equal(a.cols, 40); assert.equal(a.rows, 30); assert.deepEqual(a.wild, {id: wild, x: 2, y: -3});
    assert.equal(WR.wildTile({wild, seed: 7, size: "large"}).cols, 56);
  }
  assert.throws(() => WR.wildTile({wild: "nowhere"}), /No such wild/);
});

test("pieces side by side meet square for square: the ground runs on unbroken, and so do the trails", () => {
  const ground = (wild, seed, year) => { const at = WR.groundAt(wild, seed, year); return (x, y) => at(x, y); };
  for ( const wild of WR.WILD_ORDER ) for ( const seed of [1, 7, 1197] ) {
    // The ground is one field: a cell read from either piece is the same cell
    const at = ground(wild, seed, 1999);
    const here = WR.wildTile({wild, seed, x: 0, y: 0}), east = WR.wildTile({wild, seed, x: 1, y: 0}), south = WR.wildTile({wild, seed, x: 0, y: 1});
    let same = 0, all = 0;
    for ( let y = 0; y < 30; y++ ) for ( let x = 0; x < 40; x++ ) { all++; if ( here.cells[y][x] === at(x, y) || here.cells[y][x] === RM.T.path || here.cells[y][x] === RM.T.hazard ) same++; }
    assert.ok(same >= all - 4, `${wild} ${seed}: the piece is the field (${all - same} cells differ)`);
    // A trail crossing the seam is path on both sides of it, in the same row (or column)
    const tr = WR.trails(seed, 40, 30);
    const row = tr.rowAt(40), col = tr.colAt(30);
    if ( row >= 0 && row < 30 ) { assert.equal(here.cells[row][39], RM.T.path, `${wild} ${seed}: east seam, this side`); assert.equal(east.cells[row][0], RM.T.path, `${wild} ${seed}: east seam, far side`); }
    if ( col >= 0 && col < 40 ) { assert.equal(here.cells[29][col], RM.T.path, `${wild} ${seed}: south seam, this side`); assert.equal(south.cells[0][col], RM.T.path, `${wild} ${seed}: south seam, far side`); }
  }
  // The trails are one line each across the whole wild
  const tr = WR.trails(7, 40, 30);
  for ( let wx = -200; wx < 200; wx++ ) assert.ok(Number.isInteger(tr.rowAt(wx)) && Number.isInteger(tr.colAt(wx)));
});

test("every piece can be stood on and drawn; ways on lead only where the travellers can walk", () => {
  let withTrail = 0, things = 0;
  for ( const wild of WR.WILD_ORDER ) for ( let x = -3; x <= 3; x++ ) for ( let y = -3; y <= 3; y++ ) {
    const m = WR.wildTile({wild, seed: 42, x, y, year: 1999});
    const arr = m.regions.find(r => r.kind === "arrival");
    assert.ok(arr && RM.walkable(m.cells[arr.at.y][arr.at.x]), `${wild} ${x},${y}: somewhere to stand`);
    const seen = RM.reach(m.cells, arr.at);
    for ( const r of m.regions.filter(r => r.kind === "exit") ) {
      assert.match(r.id, /^exit-[nesw]$/);
      assert.ok(seen.has(`${r.at.x},${r.at.y}`), `${wild} ${x},${y}: ${r.id} can be reached`);
      const side = r.id.slice(5);
      assert.ok(side === "n" ? r.at.y === 0 : side === "s" ? r.at.y === 29 : side === "w" ? r.at.x === 0 : r.at.x === 39);
      assert.deepEqual(r.to, WR.beside(x, y, side));
    }
    assert.equal(new Set(m.regions.map(r => r.id)).size, m.regions.length);
    assert.ok(RM.arrivalSpots(m, 4).length >= 1);
    assert.ok(RM.svg(m).startsWith("<svg") && RM.sceneParts(m).regions.length === m.regions.length);
    assert.match(RM.realmNote(m), /fixed by the seed 42/);
    if ( m.cells.flat().includes(RM.T.path) ) withTrail++;
    things += m.regions.filter(r => r.kind === "landmark" || r.kind === "hazard").length;
  }
  assert.ok(withTrail >= 10, "the trails cross a good many pieces");
  assert.ok(things >= 30, "most pieces hold something");
  // Open storm: far more of the Tempest is water than of the Umbra
  const share = wild => { let w = 0; for ( let x = 0; x < 4; x++ ) w += WR.wildTile({wild, seed: 3, x, y: 9}).cells.flat().filter(t => t === RM.T.water).length; return w / 4800; };
  assert.ok(share("tempest") > 0.6 && share("umbra") < 0.4);
});

test("the open Umbra sours as the ages pass, and webbing comes with the factories", () => {
  assert.equal(WR.souring(1300), 0);
  assert.ok(WR.souring(1700) < WR.souring(1900) && WR.souring(1900) < WR.souring(1999) && WR.souring(2060, {future: true}) > WR.souring(2060));
  const bad = year => { let n = 0; for ( let x = 0; x < 6; x++ ) n += WR.wildTile({wild: "umbra", seed: 5, x, y: 0, year}).cells.flat().filter(t => t === RM.T.hazard).length; return n; };
  assert.ok(bad(1300) < bad(1999));
  for ( let x = 0; x < 40; x++ ) assert.ok(!WR.wildTile({wild: "umbra", seed: 5, x, y: 2, year: 1300}).regions.some(r => /webbing/.test(r.label)));
});

test("walking on: where travellers stand on the next piece", () => {
  const here = WR.wildTile({wild: "umbra", seed: 42, x: 0, y: 0});
  const side = WR.waysOn(here)[0];
  const to = WR.beside(0, 0, side), next = WR.wildTile({wild: "umbra", seed: 42, x: to.x, y: to.y});
  const spots = WR.entrySpots(next, side, 3);
  assert.equal(spots.length, 3);
  for ( const c of spots ) assert.ok(RM.walkable(next.cells[c.y][c.x]));
  const back = next.regions.find(r => r.id === `exit-${WR.OPPOSITE[side]}`);
  if ( back ) assert.deepEqual(spots[0], back.at, "they stand where they walked in");
  assert.throws(() => WR.beside(0, 0, "up"), /No such side/);
});

/* ---- Foundry, against stand-ins ---- */
function coll(list = []) { const m = new Map(list.map(d => [d.id, d])); m.filter = f => [...m.values()].filter(f); m.find = f => [...m.values()].find(f); m[Symbol.iterator] = function* () { yield* Map.prototype.values.call(m); }; return m; }
let nid = 0;
class FakeScene {
  constructor(data) { Object.assign(this, structuredClone(data)); this.id = `W${++nid}`; this.walls = coll(); this.regions = coll(); this.tokens = coll(); this.levels = coll(); }
  async createEmbeddedDocuments(type, list) {
    const key = {Wall: "walls", Region: "regions", Token: "tokens"}[type];
    return list.map(({actor, ...d}) => { const doc = {...structuredClone(d), id: `${type}${++nid}`, parent: this, behaviors: new Map()};
      if ( type === "Token" ) { doc.toObject = () => { const {parent, toObject, delete: _, update, actor: a, behaviors, ...rest} = doc; return {...structuredClone({...rest, _id: doc.id}), actor: a}; };
        doc.delete = async () => this.tokens.delete(doc.id); doc.update = async u => Object.assign(doc, u); doc.actor = actor ?? null; }
      this[key].set(doc.id, doc); return doc; });
  }
  async update() {}
  async view() { this.viewed = true; }
}

test("Foundry: draw a piece, find it again, walk on and still come home", async () => {
  const uploads = [], chat = [];
  const scenes = coll();
  globalThis.foundry = {utils: {mergeObject: (a, b) => ({...a, ...b})}, applications: {apps: {FilePicker: {implementation: {
    createDirectory: async () => true, upload: async (src, dir, file) => { uploads.push(`${dir}/${file.name}`); return {status: "success"}; }}}}}};
  globalThis.File = class { constructor(parts, name, o) { this.name = name; this.type = o.type; } };
  globalThis.game = {user: {isGM: true}, users: [{id: "gm", isGM: true, active: true}], scenes, folders: coll(),
    modules: new Map([["wodx-chronicle", {api: {eras: {currentYear: () => 1999}, rule: () => false}}]]), socket: {emit: () => {}}};
  globalThis.Folder = {create: async d => ({id: "F1", ...d})};
  globalThis.Scene = {create: async d => { const s = new FakeScene(d); scenes.set(s.id, s); return s; }};
  globalThis.ChatMessage = {create: async m => chat.push(m)};
  globalThis.ui = {notifications: {warn: () => {}, info: () => {}}};
  globalThis.canvas = null;
  const RMF = await import("../../modules/wodx-otherworlds/scripts/realm-maps.mjs");
  const s = await RMF.drawWild({wild: "umbra", seed: 42});
  assert.ok(RMF.isWild(s) && RMF.isRealmMap(s));
  assert.deepEqual(uploads, ["wodx-assets/realms/wild-umbra-0_0-1999-42-medium.svg"]);
  assert.equal(await RMF.drawWild({wild: "umbra", seed: 42}), s, "a piece already drawn is found, not drawn twice");
  assert.equal(scenes.size, 1);
  assert.deepEqual(RMF.modelOf(s).cells, WR.wildTile({wild: "umbra", seed: 42, year: 1999}).cells);
  await assert.rejects(RMF.redrawRealm(s, {seed: 1}), /fixed by its seed/);
  // Tokens sent in from a town, then walked on twice
  const town = new FakeScene({name: "Rothenstein"}); scenes.set(town.id, town);
  const [a] = await town.createEmbeddedDocuments("Token", [{name: "Anna", x: 500, y: 600, elevation: 0}]);
  const [in1] = await RMF.sendToRealm(s, [a]);
  const side = WR.waysOn(RMF.modelOf(s))[0];
  const r1 = await RMF.walkOn(s, side, [in1], {follow: true});
  assert.notEqual(r1.scene, s); assert.ok(r1.scene.viewed);
  assert.deepEqual([r1.scene.flags["wodx-otherworlds"].realmMap.x, r1.scene.flags["wodx-otherworlds"].realmMap.y], Object.values(WR.beside(0, 0, side)));
  assert.equal(r1.tokens.length, 1); assert.equal(s.tokens.size, 0);
  const spot = WR.entrySpots(RMF.modelOf(r1.scene), side, 1)[0];
  assert.deepEqual([r1.tokens[0].x, r1.tokens[0].y], [spot.x * 100, spot.y * 100]);
  assert.equal(r1.tokens[0].flags["wodx-otherworlds"].cameFrom.scene, town.id, "they still know the way home");
  // Back the way they came: the first piece is found again
  const r2 = await RMF.walkOn(r1.scene, WR.OPPOSITE[side], r1.tokens);
  assert.equal(r2.scene, s);
  const home = await RMF.bringBack(r2.tokens);
  assert.deepEqual([home[0].x, home[0].y], [500, 600]);
  // What cannot be done says why
  await assert.rejects(RMF.walkOn(town, "n", []), /piece of wild land/);
  await assert.rejects(RMF.walkOn(s, "up", []), /north, east, south or west/);
  game.user.isGM = false;
  await assert.rejects(RMF.drawWild({wild: "tempest"}), /Only the Storyteller/);
});

test("wild land is wired and clean", () => {
  const main = readFileSync(new URL("../../modules/wodx-otherworlds/scripts/main.mjs", import.meta.url), "utf8");
  const ui = readFileSync(new URL("../../modules/wodx-otherworlds/scripts/realm-maps.mjs", import.meta.url), "utf8");
  assert.match(main, /drawWild: realmMaps\.drawWild, walkOn: realmMaps\.walkOn/);
  assert.match(ui, /name="wild" data-fixed/); assert.match(ui, /name="side" data-fixed/);
  const all = JSON.stringify(WR.WILDS) + readFileSync(new URL("../../modules/wodx-otherworlds/scripts/wild-rules.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(all, /—/);
  assert.doesNotMatch(all, /\b(he|she|him|her|his|hers)\b/i);
  assert.doesNotMatch(all, /Ben|decision B\d|Daggerfall/);
});
