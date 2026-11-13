import test from "node:test";
import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SR = await import(join(root, "modules/wodx-paperdoll/scripts/sprite-rules.mjs"));

test("a token faces the way it moves and keeps its facing near a diagonal", () => {
  assert.equal(SR.facingOf(10, 1), "right");
  assert.equal(SR.facingOf(-10, 1), "left");
  assert.equal(SR.facingOf(1, 10), "down");
  assert.equal(SR.facingOf(1, -10), "up");
  assert.equal(SR.facingOf(5, 5, "down"), "down");
  assert.equal(SR.facingOf(5, 5, "right"), "right");
  assert.equal(SR.facingOf(0, 0, "left"), "left");
});

test("one square of ground is one full walk cycle, and a still figure shows its idle frame", () => {
  let st = SR.start({x: 0, y: 0});
  assert.deepEqual(SR.frameOf(st, 100), {row: SR.ROW.down, col: SR.IDLE.down});
  const cols = [];
  for ( let i = 1; i <= 8; i++ ) { st = SR.step(st, {x: i * 12.5, y: 0}, 100, i * 16); cols.push(SR.frameOf(st, 100).col); }
  assert.deepEqual(cols, [1, 2, 3, 4, 5, 6, 7, 0]);
  assert.equal(SR.frameOf(st, 100).row, SR.ROW.right);
  st = SR.step(st, {x: 100, y: 0}, 100, 8 * 16 + 50);
  assert.equal(st.moving, true, "a short pause is still a walk");
  st = SR.step(st, {x: 100, y: 0}, 100, 8 * 16 + 400);
  assert.equal(st.moving, false);
  assert.deepEqual(SR.frameOf(st, 100), {row: SR.ROW.right, col: SR.IDLE.right});
});

test("a placement far away is not a walk", () => {
  const st = SR.step(SR.start({x: 0, y: 0}, "left"), {x: 900, y: 0}, 100, 5);
  assert.equal(st.moving, false);
  assert.equal(st.facing, "left");
  assert.equal(st.x, 900);
});

test("every sheet is in the module, at the size the rules cut frames from", () => {
  for ( const name of Object.keys(SR.SHEETS) ) {
    for ( const [path, w, h] of [[SR.sheetPath(name), SR.FRAME_W * SR.FRAMES, SR.FRAME_H * 4], [SR.stillPath(name), SR.FRAME_W, SR.FRAME_H]] ) {
      const file = join(root, path.replace("modules/", "modules/"));
      assert.ok(existsSync(file), path);
      const b = readFileSync(file);
      assert.equal(b.readUInt32BE(16), w, `${path} width`);
      assert.equal(b.readUInt32BE(20), h, `${path} height`);
    }
  }
  const r = SR.rectOf({row: 3, col: 7});
  assert.deepEqual(r, {x: 672, y: 336, width: 96, height: 112});
});
