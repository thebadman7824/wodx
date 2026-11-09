import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* WoDX NPC 0.6.0: NPCs walk gridless scenes on a square lattice laid over them. */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const NR = await import(join(root, "modules/wodx-npc/scripts/npc-rules.mjs"));

test("the lattice maps points to cells and back like a square grid", () => {
  const g = NR.latticeGrid(100);
  assert.deepEqual(g.getOffset({x: 250, y: 120}), {i: 1, j: 2});
  assert.deepEqual(g.getOffset({x: 0, y: 0}), {i: 0, j: 0});
  assert.deepEqual(g.getTopLeftPoint({i: 1, j: 2}), {x: 200, y: 100});
  assert.deepEqual(g.getCenterPoint({i: 1, j: 2}), {x: 250, y: 150});
  for ( const c of [{i: 0, j: 0}, {i: 3, j: 7}, {i: 12, j: 1}] ) assert.deepEqual(g.getOffset(g.getCenterPoint(c)), c);
  assert.equal(NR.latticeGrid(0).size, 100);
  assert.equal(NR.latticeGrid(140).size, 140);
});

test("a path on the lattice goes round a blocked cell, as on a square grid", () => {
  const wall = new Set(["0,1", "1,1"]);
  const pass = (a, b) => !wall.has(`${b.i},${b.j}`) && b.i >= 0 && b.j >= 0 && b.i < 5 && b.j < 5;
  const path = NR.findPath({i: 0, j: 0}, {i: 0, j: 2}, pass, {neighbors: NR.squareSteps});
  assert.ok(path && path.length > 3);
  assert.ok(path.every(c => !wall.has(`${c.i},${c.j}`)));
});

test("main.mjs walks gridless scenes on the lattice unless the setting says no, and routines use the same grid", () => {
  const src = readFileSync(join(root, "modules/wodx-npc/scripts/main.mjs"), "utf8");
  assert.match(src, /=== false \? "none" : "lattice"/);
  assert.match(src, /game\.settings\.register\(MOD, "gridless"/);
  const moving = src.slice(src.indexOf("/* Square grids anchor"), src.indexOf("/*  The Storyteller's card"));
  assert.doesNotMatch(moving, /canvas\.grid\.(getOffset|getTopLeftPoint|getCenterPoint)\(/);
  const r = readFileSync(join(root, "modules/wodx-npc/scripts/routines.mjs"), "utf8");
  assert.doesNotMatch(r.replace("ctx.grid?.() ?? canvas.grid", ""), /canvas\.grid\.(getOffset|getTopLeftPoint|getCenterPoint|size)\b/);
});
