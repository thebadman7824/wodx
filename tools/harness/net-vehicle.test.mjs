// B6799: a vehicle worked by remote (the Net's vehicle remote, Technica 4's Remote Touch) moves on the map.
import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
mock.asGM();
globalThis.canvas = {scene: null};
const N = await import(join(root, "modules/wodx-rules/otherworlds/net-rules.mjs"));
const T = await import(join(root, "modules/wodx-otherworlds/scripts/technica.mjs"));
const IX = "wodx-interactables";
const docs = new Map();
globalThis.fromUuid = async u => docs.get(u) ?? null;

function street() {
  const sc = {id: "sc1", name: "Neon Row", grid: {size: 100, distance: 5, units: "ft"}, dimensions: {width: 3000, height: 3000}, walls: [], lights: [], tiles: [], tokens: []};
  const doc = (kind, id, o) => { const d = {id, uuid: `Scene.sc1.${kind}.${id}`, parent: sc, width: 1, height: 1, ...o, async update(u, opts) { this.opts = opts; for ( const [k, v] of Object.entries(u) ) { if ( k.startsWith("flags.") ) { const [, mod, key] = k.split("."); this.flags[mod][key] = v; } else this[k] = v; } }}; docs.set(d.uuid, d); return d; };
  return {sc, doc};
}

test("the drive's step: a compass way and a number of squares, or toward a target, stopping a square short", () => {
  assert.deepEqual(N.driveStep({dir: "e", squares: 3}, 100), {dx: 300, dy: 0, words: "3 squares east"});
  assert.deepEqual(N.driveStep({dir: "nw", squares: 1}, 100), {dx: -100, dy: -100, words: "1 square north-west"});
  assert.equal(N.driveStep({dir: "s", squares: 99}, 100).dy, N.DRIVE_MAX * 100);
  assert.deepEqual(N.driveStep({dir: "toward", squares: 10, toward: {dx: 500, dy: 0}}, 100), {dx: 400, dy: 0, words: "4 squares toward the target"});
  assert.equal(N.driveStep({dir: "toward", squares: 3, toward: {dx: 50, dy: 0}}, 100), null);
});

test("an empty car moves with its passenger aboard (B6799)", async () => {
  const {sc, doc} = street();
  const rider = doc("Token", "r1", {name: "Kat", x: 1000, y: 1000});
  const car = doc("Tile", "car", {x: 1000, y: 1000, width: 200, height: 100, flags: {[IX]: {mount: true, title: "The sedan", driver: null, riders: [{t: rider.uuid, a: "a1"}]}}});
  sc.tiles.push(car);
  const line = await T.steerVehicle(car, {dir: "e", squares: 3});
  assert.equal(car.x, 1300);
  assert.equal(rider.x, 1300);
  assert.equal(car.flags[IX].riders.length, 1, "the passenger stays aboard");
  assert.equal(rider.opts?.wodxCarried, true, "marked carried, so WoDX Interactables does not set them down");
  assert.match(line, /The sedan drives itself 3 squares east/);
});

test("with someone at the wheel, the driver's token moves, so WoDX Interactables carries the car", async () => {
  const {sc, doc} = street();
  const drv = doc("Token", "d1", {name: "Vic", x: 500, y: 500});
  const car = doc("Tile", "car2", {x: 500, y: 500, width: 200, height: 100, flags: {[IX]: {mount: true, title: "The van", driver: {t: drv.uuid, dx: 0, dy: 0}, riders: []}}});
  sc.tiles.push(car);
  await T.steerVehicle(car, {dir: "s", squares: 2});
  assert.equal(drv.y, 700);
  assert.equal(car.y, 500, "the tile itself follows through Interactables' own carry");
});

test("Technica 4's Remote Touch drives the nearest vehicle, not only a card", async () => {
  const {sc, doc} = street();
  const actor = {name: "Byte", items: [{type: "Power", name: "Technica", system: {value: 4, type: "wod.types.discipline"}}], system: {}, flags: {}, testUserPermission: () => false};
  const tok = doc("Token", "t1", {name: "Byte", actor, x: 1000, y: 1000});
  const car = doc("Tile", "car3", {x: 1200, y: 1000, width: 200, height: 100, flags: {[IX]: {mount: true, title: "The bike", riders: []}}});
  sc.tiles.push(car);
  const line = await T.remoteTouch(tok, "vehicle", {dir: "w", squares: 2});
  assert.equal(car.x, 1000);
  assert.match(line, /The bike answers Byte's touch from afar: The bike drives itself 2 squares west/);
});

test("WoDX Interactables keeps a passenger aboard whose move is marked carried, and sets one down who walks off", async () => {
  const IXM = await import(join(root, "modules/wodx-interactables/scripts/main.mjs"));
  const {sc, doc} = street();
  const rider = doc("Token", "r9", {name: "Kat", x: 1200, y: 1000});
  const car = doc("Tile", "car9", {x: 1200, y: 1000, width: 200, height: 100, flags: {[IX]: {mount: true, title: "The sedan", driver: null, riders: [{t: rider.uuid, a: "a1"}]}}});
  sc.tiles.push(car);
  sc.tokens.push(rider);
  const from = {x: 1050, y: 1050}, to = {x: 1250, y: 1050};
  assert.equal(await IXM.carryAboard(rider, sc, from, to, {x: 1200, y: 1000}, {carried: true}), "carried");
  assert.equal(car.flags[IX].riders.length, 1);
  assert.equal(await IXM.carryAboard(rider, sc, from, to, {x: 1200, y: 1000}), "off");
  assert.equal(car.flags[IX].riders.length, 0);
});
