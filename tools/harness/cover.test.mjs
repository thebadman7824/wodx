import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import * as C from "../../modules/wodx-interactables/scripts/cover-rules.mjs";
import * as R from "../../modules/wodx-interactables/scripts/interact-rules.mjs";
import * as S from "../../modules/wodx-interactables/scripts/state-rules.mjs";
import {parseSidecar} from "../../modules/wodx-interactables/scripts/adopt-rules.mjs";

/* B4671 to B4673: cover on the map, and a table tipped over. */
const G = 100;
const table = {x: 400, y: 400, width: 200, height: 100, rotation: 0, level: 1, name: "The table"};

test("a target crouched behind a table is in light cover; shots across open floor are not", () => {
  const c = C.coverOnShot([500, 100], [500, 560], [table], G);       // shooter north, target just south of the table
  assert.equal(c.target?.level, 1);
  assert.equal(c.diff, 1);
  assert.equal(C.coverOnShot([100, 100], [100, 560], [table], G).diff, 0);   // the line passes beside it
  assert.equal(C.coverOnShot([500, 100], [500, 900], [table], G).diff, 0);   // the target is too far behind it
  assert.equal(C.coverOnShot([500, 100], [500, 450], [table], G).diff, 0);   // standing on it or under it: no shield
});

test("the shooter's own cover: one less, none for light cover", () => {
  const counter = {...table, level: 2, name: "The counter"};
  const both = C.coverOnShot([500, 560], [500, 160], [counter, {...counter, y: 200}], G);
  assert.equal(both.shooter?.level, 2);
  assert.equal(both.target?.level, 2);
  assert.equal(both.diff, 3);
  assert.equal(C.coverOnShot([500, 560], [500, 100], [table], G).diff, 0);
});

test("a turned tile is read in its own frame", () => {
  const turned = {...table, rotation: 90};                           // now 100 wide and 200 tall about the same middle
  assert.equal(C.coverOnShot([100, 450], [620, 450], [turned], G).target?.level, 1);
  assert.equal(C.coverOnShot([580, 100], [580, 560], [table], G).diff, 1);
  assert.equal(C.coverOnShot([580, 100], [580, 560], [turned], G).diff, 0);
});

test("a table tips over for good cover, loudly, and sets up again", () => {
  const o = R.describeCover({cover: true, coverKind: "table"});
  assert.equal(o.level, 1);
  const ops = R.optionsFor(o, {});
  const tip = ops.find(x => x.id === "tipOver");
  assert.ok(tip && tip.noise.success === "loud" && R.FIGHT_OPS.has("tipOver"));
  const res = R.resolve(o, tip, []);
  assert.equal(res.patch.flags.tipped, true);
  const down = R.describeCover({cover: true, coverKind: "table", tipped: true});
  assert.equal(down.level, 2);
  assert.match(R.nameOf(down), /tipped over \(good cover\)/);
  assert.equal(S.stateOf(down), "tipped");
  assert.equal(S.stateWord(S.groupOf(down), "tipped"), "Tipped over");
  assert.ok(R.optionsFor(down, {}).some(x => x.id === "setUpright"));
  const counter = R.describeCover({cover: true, coverKind: "counter", tipped: true});
  assert.equal(counter.level, 2);
  assert.ok(!R.optionsFor(counter, {}).some(x => x.id === "tipOver"));
});

test("a made map's tables and counters adopt as cover", () => {
  const p = parseSidecar({format: "wodx-map", version: 1, cells: [10, 10], features: [
    {id: "t1", label: "Table (Hall)", rect: [2, 2, 2, 1], flags: {cover: true, coverKind: "table", title: "The table"}}]});
  assert.equal(p.errors.length, 0, p.errors.join(" "));
  assert.equal(p.data.features[0].flags.cover, true);
});
