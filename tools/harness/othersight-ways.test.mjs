import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";

/*
 * B6791: a mage's Correspondence sight marks every way out of the scene on the player's map. WoDX's ways, trods,
 * Moon Paths and twin travel regions are Teleport Token behaviours whose Foundry 14 data is a set of destinations;
 * the sight used to read a single `destination` and so drew none of them. Runs drawOther() on a stand-in canvas.
 */
const regions = new Map();
const far = {id: "r2", name: "Moon Path to the Old Mill", parent: {id: "s2", name: "The Old Mill", navName: "The Old Mill"}};
regions.set("Scene.s2.Region.r2", far);
const here = {id: "r1", name: "Moon Path", shapes: [{type: "rectangle", x: 400, y: 300, width: 200, height: 200}],
  behaviors: [{type: "teleportToken", disabled: false, system: {destinations: new Set(["Scene.s2.Region.r2"])}}]};
const scene = {id: "s1", name: "The Square", regions: [here], flags: {}, grid: {size: 100}};
globalThis.game = {modules: new Map(), settings: {get: () => null}, time: {worldTime: 0}, user: {isGM: false}, users: [], scenes: new Map([["s2", far.parent]])};
globalThis.Hooks = {on() {}, once() {}, callAll() {}};
globalThis.fromUuidSync = u => regions.get(u) ?? null;
globalThis.canvas = {scene, dimensions: {sceneX: 0, sceneY: 0, sceneWidth: 2000, sceneHeight: 1500}, tokens: {placeables: []}};
const texts = [];
globalThis.PIXI = {Text: class { constructor(t, style) { this.text = typeof t === "object" ? t.text : t; this.style = typeof t === "object" ? t.style : style; this.anchor = {set() {}}; texts.push(this); } }};
const layer = {circles: [], lineStyle() {}, drawCircle(x, y, r) { this.circles.push({x, y, r}); }, moveTo() {}, lineTo() {}, addChild() {}};

const OW = await import("../../modules/wodx-senses/scripts/otherworld-sight.mjs");

test("Correspondence: a way with Foundry 14's destinations set is marked on the map and named in the lines", () => {
  const lines = OW.drawOther(layer, "correspondence", {id: "mage", name: "Iris", system: {spheres: {correspondence: {value: 2}}}});
  assert.ok(layer.circles.some(c => c.x === 500 && c.y === 400), JSON.stringify(layer.circles));
  assert.ok(lines.some(l => /Old Mill/.test(l)), lines.join(" / "));
  assert.ok(texts.some(t => /Old Mill/.test(t.text)), texts.map(t => t.text).join(" / "));
  assert.equal(typeof texts[0].style.stroke, "number", "the label's outline is a plain colour");
});
