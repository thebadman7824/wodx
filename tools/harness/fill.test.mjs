import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Fill a container by place and era (Interactables 0.17.0) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const F = await imp("modules/wodx-interactables/scripts/fill-rules.mjs");
const gear = JSON.parse(src("modules/wodx-library/data/gear.json")).items;
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

test("fill: siege guns, ship armour and parries are never drawn", () => {
  for ( const it of gear ) {
    const k = String(it.flags["wodx-library"].kind ?? "");
    if ( /heavy|ship|crew-served|parry/.test(k) ) assert.equal(F.categoryOf(it), null, it.name);
  }
});

test("fill: a draw keeps to the era and the place", () => {
  const got = F.draw(gear, {era: "dark-ages", place: "armory", container: "chest", count: 6, rng: seq(0.1, 0.5, 0.9, 0.3)});
  assert.equal(got.length, 6);
  assert.equal(new Set(got.map(g => g.name)).size, 6);
  for ( const g of got ) assert.ok(g.flags["wodx-library"].eras.includes("dark-ages"), g.name);
  const church = F.draw(gear, {era: "dark-ages", place: "church", count: 12});
  for ( const g of church ) assert.equal(F.categoryOf(g), "melee");
  const clinic = F.draw(gear, {era: "dark-ages", place: "clinic", count: 4});
  for ( const g of clinic ) assert.notEqual(F.categoryOf(g), "cyber");
});

test("fill: a small container takes only small things", () => {
  const got = F.draw(gear, {era: "modern", place: "armory", container: "safe", count: 12});
  assert.ok(got.length > 0);
  for ( const g of got ) assert.ok(F.fits(g, "safe"), g.name);
  for ( const g of got ) assert.ok(!["armor", "shield"].includes(F.categoryOf(g)));
});

test("fill: kept links join the list once", () => {
  assert.equal(F.mergeLines("A\nB", ["B", "C"]), "A\nB\nC");
  assert.equal(F.mergeLines("", ["X"]), "X");
});

test("fill: the button, the review and the wiring", () => {
  const s = src("modules/wodx-interactables/scripts/fill.mjs");
  assert.match(s, /if \( !game\.user\.isGM \) return null;/);
  assert.match(s, /Draw again/);
  assert.match(s, /data-fixed/);
  const m = src("modules/wodx-interactables/scripts/main.mjs");
  assert.match(m, /data-wix-fill/);
  assert.match(m, /fill: \{open: Fill\.fillDialog/);
});

test("fill: the place starts from the container's own setting, then its region, then the scene", () => {
  assert.deepEqual(F.placeGuess({own: "armory", regions: ["church"], scene: "home"}), {place: "armory", from: "own"});
  assert.deepEqual(F.placeGuess({own: "nonsense", regions: ["street", "church"], scene: "home"}), {place: "church", from: "region"});
  assert.deepEqual(F.placeGuess({regions: ["caern"], scene: "gate"}), {place: "armory", from: "scene"});
  assert.deepEqual(F.placeGuess({regions: ["street"], scene: "other"}), {place: "home", from: null});
  assert.deepEqual(F.placeGuess(), {place: "home", from: null});
  for ( const v of Object.values(F.FROM_NPC_PLACE) ) assert.ok(v === null || F.PLACES[v], v);
});

test("fill: the runtime reads the place tag of the region a container sits in, the smallest first", async () => {
  globalThis.canvas = null;
  const Fi = await imp("modules/wodx-interactables/scripts/fill.mjs");
  const region = (name, kind, x, y, w, h) => ({name, flags: {"wodx-npc": {place: {kind}}}, shapes: [{width: w, height: h}],
    testPoint: p => p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h});
  const scene = {name: "Steading", flags: {"wodx-npc": {place: {kind: "wilds"}}},
    regions: {contents: [region("Yard", "street", 0, 0, 1000, 1000), region("Longhouse", "home", 100, 100, 300, 200), region("Chapel", "church", 600, 600, 100, 100)]}};
  const tile = (x, y, flags = {}) => ({parent: scene, x, y, width: 50, height: 50, flags: {"wodx-interactables": flags}});
  assert.deepEqual(Fi.guessFor(tile(150, 150)), {place: "home", from: "region", name: "Longhouse"});
  assert.deepEqual(Fi.guessFor(tile(620, 620)), {place: "church", from: "region", name: "Chapel"});
  assert.deepEqual(Fi.guessFor(tile(800, 100)), {place: "camp", from: "scene", name: "Steading"});
  assert.equal(Fi.guessFor(tile(150, 150, {fillPlace: "den"})).place, "den");
  assert.equal(Fi.guessFor(tile(150, 150, {fillPlace: "den"}), null).place, "home", "the form's blank choice wins over the saved one");
});
