/**
 * The pixel map drawer's farmhouse in Foundry (B5730-B5735), in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatepixelmap.mjs?${Date.now()}`)).run()
 * Brings its own map: tools/gate/fixtures/pixel-farmhouse (written by tools/pixelmap/maps/farmhouse.py).
 *   1. the map: a scene made from the drawer's Universal VTT file as mapimport.mjs makes it (size, picture, walls,
 *      a door wall at each of the 5 doors and 7 windows), and the picture loads
 *   2. adopted: every door and window has a picture tile that follows its own wall; every chest, cask, crate and sack
 *      is a container tile showing its shut picture; the oven has its light
 *   3. a door opened shows its open picture, and shut again its shut one, for everyone (the tile's texture changes)
 *   4. a shutter shut shows its shut picture
 *   5. a chest opened shows its open picture, and shut again its shut one
 *   6. every picture the tiles use loads
 *   7. Undo the adoption removes every picture tile
 * The scene is removed at the end. Result: Data/wodx-gate/gatepixelmap-result.json.
 */
import {gate} from "./kit.mjs";
import {sizeOf, wallsOf, lightsOf} from "./mapimport.mjs";

const MOD = "wodx-interactables";
const DIR = "wodx-gate/fixtures/pixel-farmhouse/";
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 8000) { const t = Date.now(); while ( Date.now() - t < ms ) { if ( fn() ) return true; await sleep(150); } return !!fn(); }
const tilesOf = s => [...s.tiles];
const fl = d => d.flags?.[MOD] ?? {};

export async function run() {
  const G = gate("gatepixelmap", {stepTimeout: 60000});
  try {
    if ( game.world.id !== "rothenstein-wodx" ) { G.ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return; }
    const X = game.modules.get(MOD)?.api?.adopt;
    let scene, followers = [], boxes = [];
    await G.step("1. the map", async () => {
      const vtt = await G.fixture("pixel-farmhouse/pixel-farmhouse.dd2vtt");
      const vttObj = typeof vtt === "string" ? JSON.parse(vtt) : vtt;
      const sz = sizeOf(vttObj);
      scene = await G.scene({name: "WoDX gate: pixel farmhouse", width: sz.width, height: sz.height, grid: sz.ppg, padding: 0.25,
        background: {src: `${DIR}pixel-farmhouse.png`}, tokenVision: false});
      const d = scene.dimensions, fr = {x0: d.sceneX, y0: d.sceneY, size: d.size, distance: d.distance};
      const walls = wallsOf(vttObj, fr), lights = lightsOf(vttObj, fr);
      await scene.createEmbeddedDocuments("Wall", walls);
      if ( lights.length ) await scene.createEmbeddedDocuments("AmbientLight", lights);
      const pic = await fetch(`/${DIR}pixel-farmhouse.png`, {method: "HEAD"});
      const doors = [...scene.walls].filter(w => w.door);
      G.ok("1. the map", sz.cols === 20 && sz.rows === 14 && doors.length === 12 && [...scene.walls].length > doors.length && pic.ok,
        {cols: sz.cols, rows: sz.rows, walls: [...scene.walls].length, doors: doors.length, picture: pic.status});
    });
    await G.step("2. adopted", async () => {
      if ( typeof X?.rules?.followerData !== "function" ) { G.ok("2. adopted", false, {error: "WoDX Interactables has no picture tiles (B5733)"}); return; }
      const text = await (await fetch(`/${DIR}pixel-farmhouse.wodx.json?${Date.now()}`, {cache: "no-store"})).text();
      const got = await X.plan(scene, text);
      await X.apply(scene, got.p);
      followers = tilesOf(scene).filter(t => fl(t).follows);
      boxes = tilesOf(scene).filter(t => fl(t).container && fl(t).art);
      const tied = followers.every(t => scene.walls.get(fl(t).follows)?.door);
      const shut = boxes.every(t => t.texture.src === fl(t).art.closed);
      const oven = [...scene.lights].some(l => fl(l).adoptId?.startsWith("bake-oven"));
      G.ok("2. adopted", followers.length === 12 && tied && boxes.length === 14 && shut && oven && !got.errors.length,
        {followers: followers.length, tied, containers: boxes.length, shut, oven, errors: got.errors, notes: got.p.notes});
    });
    const doorTile = () => followers.find(t => fl(t).art?.open?.includes("front-door"));
    await G.step("3. a door opened and shut", async () => {
      const t = doorTile(), w = scene.walls.get(fl(t).follows);
      await w.update({ds: CONST.WALL_DOOR_STATES.OPEN});
      const opened = await until(() => scene.tiles.get(t.id).texture.src === fl(t).art.open);
      await w.update({ds: CONST.WALL_DOOR_STATES.CLOSED});
      const shut = await until(() => scene.tiles.get(t.id).texture.src === fl(t).art.closed);
      G.ok("3. a door opened and shut", opened && shut, {opened, shut, src: scene.tiles.get(t.id).texture.src});
    });
    await G.step("4. a shutter shut", async () => {
      const t = followers.find(x => fl(x).art?.open?.includes("/window")), w = scene.walls.get(fl(t).follows);
      const startOpen = t.texture.src === fl(t).art.open;
      await w.update({ds: CONST.WALL_DOOR_STATES.CLOSED});
      const shut = await until(() => scene.tiles.get(t.id).texture.src === fl(t).art.closed);
      G.ok("4. a shutter shut", startOpen && shut, {startOpen, shut});
    });
    await G.step("5. a chest opened and shut", async () => {
      const t = boxes.find(x => /red-painted-chest/.test(fl(x).art.closed));
      await t.update({[`flags.${MOD}.ds`]: "open"});
      const opened = await until(() => scene.tiles.get(t.id).texture.src === fl(t).art.open);
      await t.update({[`flags.${MOD}.ds`]: "closed"});
      const shut = await until(() => scene.tiles.get(t.id).texture.src === fl(t).art.closed);
      G.ok("5. a chest opened and shut", opened && shut, {opened, shut});
    });
    await G.step("6. every picture loads", async () => {
      const srcs = [...new Set(tilesOf(scene).flatMap(t => Object.values(fl(t).art ?? {})))];
      const bad = [];
      for ( const s of srcs ) { const r = await fetch(`/${s}`, {method: "HEAD"}); if ( !r.ok ) bad.push(s); }
      G.ok("6. every picture loads", srcs.length === 52 && !bad.length, {pictures: srcs.length, missing: bad.slice(0, 5)});
    });
    await G.step("7. undo", async () => {
      await X.undo(scene);
      const left = tilesOf(scene).filter(t => fl(t).art).length;
      G.ok("7. undo", left === 0, {left});
    });
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally { return G.finish(); }
}
