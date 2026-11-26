import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Echoes that fire from village life (B7870-B7873; Dark Ages: Fae pp. 67-75, 112-113, 182) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const F = await imp("modules/wodx-rules/actions/fae-da-rules.js");
const H = await imp("modules/wodx-rules/actions/hunter-rules.js");

test("B7870: the 25 Echo effects, five to a level, with the eleven that were missing", () => {
  assert.equal(F.ECHO_EFFECTS.length, 25);
  for ( const l of [1, 2, 3, 4, 5] ) assert.equal(F.ECHO_EFFECTS.filter(e => e.level === l).length, 5, `level ${l}`);
  for ( const id of ["humble", "paranoia", "vitus", "fear", "backlash", "unleashed", "honest", "immolation", "frenzy", "lost", "terrible"] ) assert.ok(F.echoEffect(id), id);
  assert.equal(new Set(F.ECHO_EFFECTS.map(e => e.id)).size, 25);
  assert.deepEqual(F.echoEffect("immolation").apply.dmg, {type: "aggravated", n: 3});
  assert.equal(F.echoEffect("itch").apply.cond.ownDiff, 1);
  assert.equal(F.echoEffect("thin").apply.sheet, "thin");
  assert.equal(F.ECHO_PICKS[5].length, 5);
  for ( const e of F.ECHO_EFFECTS ) assert.ok(e.apply && (e.apply.note || e.apply.cond || e.apply.dmg || e.apply.sheet), e.id);
});

test("B7871: village triggers match the fae's Echoes and the goods people carry (p. 113)", () => {
  const echoes = [{trigger: "the sound of bells"}, {trigger: "touching cold iron"}, {trigger: "a horseshoe over the door"}, {trigger: "salt thrown over the shoulder"}];
  assert.deepEqual(F.echoesFor(echoes, "bells").map(e => e.index), [0]);
  assert.deepEqual(F.echoesFor(echoes, "iron").map(e => e.index), [1, 2]);
  assert.deepEqual(F.echoesFor(echoes, "salt").map(e => e.index), [3]);
  assert.deepEqual(F.echoesFor(echoes, "holy"), []);
  assert.deepEqual(F.goodsKinds("an iron horseshoe for over the door").sort(), ["horseshoe", "iron"]);
  assert.deepEqual(F.goodsKinds("a hag stone on a string"), ["charm"]);
  assert.deepEqual(F.goodsKinds("a corn dolly from the last sheaf"), ["charm"]);
  assert.deepEqual(F.goodsKinds("a rosary"), ["cross"]);
  assert.deepEqual(F.goodsKinds("a wooden cross on a cord"), ["cross"]);
  assert.deepEqual(F.goodsKinds("a loaf of rye bread"), []);
  // The bells ring at 6, 12 and 18 (a house reading), across midnight too
  assert.deepEqual(F.bellsBetween(5, 7), [6]);
  assert.deepEqual(F.bellsBetween(11, 19), [12, 18]);
  assert.deepEqual(F.bellsBetween(20, 7), [6]);
  assert.deepEqual(F.bellsBetween(12, 12), []);
});

test("B7872-B7873: each Court's Echoes, and an inquisitor's Conviction on the Echo roll (p. 182)", () => {
  assert.deepEqual(Object.keys(F.COURT_ECHOES).sort(), Object.keys(F.COURTS).sort());
  assert.equal(F.COURT_ECHOES.spring.page, 67); assert.equal(F.COURT_ECHOES.solstice.page, 75);
  assert.deepEqual(F.inquisitorEcho({willpower: 5, risk: 2, spend: 1}), {dice: 7, extra: 1});
  assert.equal(F.inquisitorEcho({willpower: 5, risk: 9}).dice, 8);
  assert.equal(H.riskConviction(2, {successes: 1, botch: false}, 4).after, 5);
});

test("B7870-B7873: wiring: the card's effect buttons, Thin Mists and Humble Fae read in play, the village prompts", () => {
  const fae = src("modules/wodx-actions/scripts/fae-da.js"), main = src("modules/wodx-actions/scripts/main.js"), it = src("modules/wodx-interactables/scripts/main.mjs");
  assert.match(fae, /data-fx="echopick:\$\{x\.id\}"/);
  assert.match(fae, /startsWith\("echopick:"\)/);
  assert.match(fae, /echoThin\?\.scene\) === LIM\.sceneNo\(\)/);
  assert.match(main, /echoHumble\?\.scene\) === LIM\.sceneNo\(\)/);
  assert.match(main, /daEchoFor:/);
  assert.match(it, /echoesOnMove\(tokDoc, actor, to\)/);
  assert.match(it, /FAER\.bellsBetween/);
  assert.match(it, /daEchoFor\?\.\(pre\)/);
});
