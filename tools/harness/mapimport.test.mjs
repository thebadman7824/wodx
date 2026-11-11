// Dungeondraft Universal VTT import (tools/gate/mapimport.mjs): the pure parts.
import test from "node:test";
import assert from "node:assert/strict";
import {sizeOf, wallsOf, lightsOf, colourOf, pending, toPx} from "../gate/mapimport.mjs";

const vtt = {
  format: 0.3,
  resolution: {map_origin: {x: 0, y: 0}, map_size: {x: 20, y: 12}, pixels_per_grid: 100},
  line_of_sight: [[{x: 1, y: 1}, {x: 5, y: 1}, {x: 5, y: 1}, {x: 5, y: 4}]],
  portals: [{position: {x: 3, y: 4}, bounds: [{x: 2.5, y: 4}, {x: 3.5, y: 4}], rotation: 0, closed: true, freestanding: false},
            {position: {x: 6, y: 4}, bounds: [{x: 5.5, y: 4}, {x: 6.5, y: 4}], closed: false}],
  lights: [{position: {x: 2, y: 2}, range: 4, intensity: 1, color: "ffeccd8b", shadows: true}],
};
const fr = {x0: 500, y0: 300, size: 100, distance: 5};

test("scene size comes from the map size and pixels per square", () => {
  assert.deepEqual(sizeOf(vtt), {cols: 20, rows: 12, ppg: 100, width: 2000, height: 1200});
  assert.equal(sizeOf({}).width, 100);
});

test("points are moved by the scene's padding and the map origin", () => {
  assert.deepEqual(toPx(vtt, fr, {x: 1, y: 2}), [600, 500]);
  assert.deepEqual(toPx({resolution: {map_origin: {x: -2, y: 1}}}, fr, {x: 0, y: 1}), [700, 300]);
});

test("walls follow each run, drop zero-length pieces, and portals become door walls", () => {
  const w = wallsOf(vtt, fr);
  assert.equal(w.filter(x => !x.door).length, 2);
  assert.deepEqual(w[0].c, [600, 400, 1000, 400]);
  const doors = w.filter(x => x.door === 1);
  assert.equal(doors.length, 2);
  assert.deepEqual(doors[0].c, [750, 700, 850, 700]);
  assert.equal(doors[0].ds, 0);
  assert.equal(doors[1].ds, 1);
});

test("lights get their range in feet and the colour without its alpha", () => {
  const [l] = lightsOf(vtt, fr);
  assert.deepEqual([l.x, l.y], [700, 500]);
  assert.equal(l.config.dim, 20);
  assert.equal(l.config.bright, 10);
  assert.equal(l.config.color, "#eccd8b");
  assert.equal(colourOf("#123456"), "#123456");
  assert.equal(colourOf("nonsense"), "#ffd9a0");
});

test("only exports with no scene yet are pending, oldest folder first", () => {
  const files = ["wodx-maps/bp/2026-11-11-1800/bp.dd2vtt", "wodx-maps/bp/2026-11-11-1800/bp.png",
    "wodx-maps/bp/2026-11-11-1700/bp.dd2vtt", "wodx-maps/bank/2026-11-11-1700/bank.dd2vtt"];
  const p = pending(files, new Set(["wodx-maps/bank/2026-11-11-1700"]));
  assert.deepEqual(p.map(x => x.dir), ["wodx-maps/bp/2026-11-11-1700", "wodx-maps/bp/2026-11-11-1800"]);
  assert.equal(p[0].base, "wodx-maps/bp/2026-11-11-1700/bp");
});
