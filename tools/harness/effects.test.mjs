import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* Scene video effects (WoDX Chronicle 0.5.3): each player can hide looping video tiles on a slow computer */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const settings = new Map();
const registered = {};
const hooks = {};
globalThis.game = {settings: {
  register: (m, k, cfg) => { registered[`${m}.${k}`] = cfg; settings.set(`${m}.${k}`, cfg.default); },
  get: (m, k) => { if ( !settings.has(`${m}.${k}`) ) throw new Error("not registered"); return settings.get(`${m}.${k}`); }
}};
globalThis.Hooks = {on: (h, fn) => { (hooks[h] ??= []).push(fn); }};
const FX = await import(join(root, "modules/wodx-chronicle/scripts/effects.mjs"));

function video() { return {paused: false, plays: 0, pause() { this.paused = true; }, play() { this.paused = false; this.plays++; return Promise.resolve(); }}; }
function tile(src, {autoplay = true, shape = "pixi7"} = {}) {
  const v = video();
  const texture = shape === "pixi7" ? {baseTexture: {resource: {source: v}}} : {source: {resource: v}};
  return {v, document: {texture: {src}, video: {autoplay}}, mesh: {renderable: true}, texture};
}

test("video paths are told from images", () => {
  for ( const s of ["fx/fog-loop.webm", "a/B.MP4", "x.m4v?v=2", "y.ogv#t=1", " fx/embers-loop.webm "] ) assert.ok(FX.isVideoSrc(s), s);
  for ( const s of ["maps/a.webp", "a.png", "webm.png", "", null, undefined, 3] ) assert.ok(!FX.isVideoSrc(s), String(s));
});

test("before the setting exists nothing is hidden", () => {
  assert.equal(FX.hiding(), false);
});

test("the setting is a client choice, shown, defaulting to show, with hooks on draw, refresh and scene load", () => {
  FX.registerEffectSettings();
  const cfg = registered["wodx-chronicle.sceneVideo"];
  assert.equal(cfg.scope, "client");
  assert.equal(cfg.config, true);
  assert.equal(cfg.default, "show");
  assert.deepEqual(Object.keys(cfg.choices), ["show", "hide"]);
  for ( const h of ["refreshTile", "drawTile", "canvasReady"] ) assert.equal(hooks[h]?.length, 1, h);
});

test("hiding pauses the video and stops drawing it; showing brings it back", () => {
  for ( const shape of ["pixi7", "pixi8"] ) {
    const t = tile("rothenstein-landing/fx/fog-loop.webm", {shape});
    assert.equal(FX.applyTile(t, true), true);
    assert.equal(t.mesh.renderable, false);
    assert.equal(t.v.paused, true);
    FX.applyTile(t, false);
    assert.equal(t.mesh.renderable, true);
    assert.equal(t.v.paused, false);
    assert.equal(t.v.plays, 1);
  }
});

test("a video set not to autoplay stays paused when shown again", () => {
  const t = tile("fx/snow-loop.webm", {autoplay: false});
  FX.applyTile(t, true);
  FX.applyTile(t, false);
  assert.equal(t.v.paused, true);
  assert.equal(t.mesh.renderable, true);
});

test("image tiles and broken tiles are left alone", () => {
  const t = tile("maps/roofs/lt-church--00.webp");
  assert.equal(FX.applyTile(t, true), false);
  assert.equal(t.mesh.renderable, true);
  assert.equal(t.v.paused, false);
  assert.equal(FX.applyTile(null, true), false);
  assert.equal(FX.applyTile({document: {texture: {src: "a.webm"}}}, true), true, "no mesh, no video: no error");
});

test("the hooks act only when this player hides effects", () => {
  globalThis.canvas = {tiles: {placeables: [tile("a.webm"), tile("b.webp"), tile("c.mp4")]}};
  hooks.canvasReady[0]();
  assert.ok(canvas.tiles.placeables.every(t => t.mesh.renderable), "show: untouched");
  settings.set("wodx-chronicle.sceneVideo", "hide");
  hooks.canvasReady[0]();
  assert.deepEqual(canvas.tiles.placeables.map(t => t.mesh.renderable), [false, true, false]);
  const later = tile("d.webm");
  hooks.refreshTile[0](later);
  assert.equal(later.mesh.renderable, false);
  settings.set("wodx-chronicle.sceneVideo", "show");
  assert.equal(registered["wodx-chronicle.sceneVideo"].onChange(), 2, "two video tiles on the scene");
  assert.ok(canvas.tiles.placeables.every(t => t.mesh.renderable), "show again: all drawn");
  delete globalThis.canvas;
});

test("the module loads the setting at init", () => {
  const main = readFileSync(join(root, "modules/wodx-chronicle/scripts/main.mjs"), "utf8");
  assert.match(main, /effects\.registerEffectSettings\(\)/);
});

test("the Garou test pack is no longer loaded for every player", () => {
  const main = readFileSync(join(root, "modules/wodx-actions/scripts/main.js"), "utf8");
  assert.doesNotMatch(main, /^import .*garou-testpack/m);
  assert.match(main, /import\("\.\/garou-testpack\.js"\)/);
});
