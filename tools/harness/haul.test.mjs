import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Carrying and dragging the fallen, and moving large things (B5070 to B5086, Ben's Carry Bodies Desk). Pure rules of
   WoDX Interactables haul-rules.mjs, plus the wiring read from the source. */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const H = await import(pathToFileURL(join(root, "modules/wodx-interactables/scripts/haul-rules.mjs")));
const A = await import(pathToFileURL(join(root, "modules/wodx-actions/scripts/rules.js")));

test("the chart is the one WoDX Actions keeps (VtDA20 p. 335)", () => {
  for ( const [l, , kg] of A.LIFTING ) assert.equal(H.liftKg(l), kg, `Strength ${l}`);
  assert.equal(H.liftKg(0), 0);
  assert.equal(H.liftKg(16), 2720 + 450);
  assert.equal(H.levelFor(70), 3);
  assert.equal(H.levelFor(45), 2);
  assert.equal(H.levelFor(46), 3);
  assert.equal(H.stepsOver(70, 2), 1);
  assert.equal(H.stepsOver(70, 3), 0);
});

test("who is down: Foundry's and WoDX Chronicle's statuses, seven wounds, sleep (B5070)", () => {
  for ( const s of ["dead", "unconscious", "sleep", "wodx-incapacitated", "wodx-staked", "wodx-torpor"] ) assert.ok(H.fallenOf({statuses: [s]}).down, s);
  assert.ok(H.fallenOf({wounds: 7}).down);
  assert.ok(!H.fallenOf({wounds: 6}).down);
  assert.ok(H.fallenOf({asleep: true}).down);
  assert.equal(H.fallenOf({statuses: new Set(["wodx-staked"])}).why, "staked");
  assert.ok(!H.fallenOf({statuses: ["wodx-knockdown"]}).down, "knocked down is not carried off");
});

test("weights: a grown person 70 kg, a child less, a Crinos far more, mist none (B5071)", () => {
  assert.equal(H.bodyKg({}).kg, 70);
  assert.ok(H.bodyKg({growth: "child"}).kg < 70);
  assert.equal(H.bodyKg({shape: "crinos"}).kg, 300);
  assert.equal(H.bodyKg({shape: "mist"}).can, false);
  assert.equal(H.bodyKg({intangible: true}).can, false);
  assert.equal(H.bodyKg({creature: true, squares: 2}).kg, 450);
});

test("carry under the chart, drag over it; two together add Strength (B5071, B5072)", () => {
  const two = H.moveOf({kind: "body", kg: 70, strength: 2});
  assert.equal(two.mode, "drag"); assert.equal(two.factor, 0.25); assert.equal(two.roll, false);
  const three = H.moveOf({kind: "body", kg: 70, strength: 3});
  assert.equal(three.mode, "carry"); assert.equal(three.factor, 0.5);
  assert.equal(H.moveOf({kind: "body", kg: 70, strength: 3, want: "drag"}).mode, "drag", "a strong one may still drag");
  assert.equal(H.teamStrength([{strength: 2}, {strength: 1, potence: 1}]), 4);
  const crinos = H.moveOf({kind: "body", kg: 300, strength: 2});
  assert.equal(crinos.budge, false, "a Crinos is past a weak mortal");
  assert.ok(crinos.need > 0);
  assert.equal(H.moveOf({kind: "body", kg: 300, strength: 2 + 3}).budge, true, "with help it moves");
});

test("things: half pace under the chart, quarter and a roll up to two steps over, else it will not budge (B5081)", () => {
  const light = H.moveOf({kind: "thing", kg: 30, strength: 2});
  assert.equal(light.mode, "push"); assert.equal(light.factor, 0.5); assert.equal(light.roll, false);
  const heavy = H.moveOf({kind: "thing", kg: 180, strength: 2});
  assert.equal(heavy.mode, "strain"); assert.equal(heavy.factor, 0.25); assert.equal(heavy.roll, true);
  assert.equal(H.moveOf({kind: "thing", kg: 400, strength: 2}).budge, false);
  assert.equal(H.moveOf({kind: "thing", kg: 30, strength: 2, pile: true}).mode, "haul");
});

test("which tiles move: furniture and stores yes, counters and walls no; the Storyteller's weight wins (B5080, B5084)", () => {
  assert.equal(H.thingOf({container: true, kind: "chest"}, 5).kg, 35);
  assert.equal(H.thingOf({container: true, kind: "box", material: "heavy"}).label, "barrel");
  assert.equal(H.thingOf({container: true, kind: "box"}).pile, true);
  assert.equal(H.thingOf({hide: true, hideKind: "bed"}).label, "bed");
  assert.equal(H.thingOf({hide: true, hideKind: "shadows"}), null);
  assert.equal(H.thingOf({cover: true, coverKind: "table"}).label, "table");
  assert.equal(H.thingOf({cover: true, coverKind: "counter"}), null);
  assert.equal(H.thingOf({mount: true, mountKind: "cart"}).wheels, true);
  assert.equal(H.thingOf({mount: true, mountKind: "horse"}), null);
  assert.equal(H.thingOf({container: true, kind: "chest", haulFixed: true}), null);
  assert.equal(H.thingOf({haulKg: 80}).kg, 80, "any tile with a weight");
  assert.equal(H.thingOf({}), null);
});

test("wheels halve a load; rough ground takes that back (B5082)", () => {
  assert.equal(H.movingKg({kg: 250, wheels: true}), 125);
  assert.equal(H.movingKg({kg: 250, wheels: true, rough: true}), 250);
  assert.equal(H.movingKg({kg: 250}), 250);
  assert.ok(H.ROUGH.test("Muddy lane") && H.ROUGH.test("Rubble") && !H.ROUGH.test("Road"));
});

test("hands: carrying takes two, dragging one; a body with more hands keeps the rest (B5073)", () => {
  assert.equal(H.handsFree(2, "carry"), 0);
  assert.equal(H.handsFree(2, "drag"), 1);
  assert.equal(H.handsFree(4, "carry"), 2, "four arms: two free while carrying");
  const sword = H.attackWith({free: 0, hands: 2, weapon: {}, mode: "carry"});
  assert.ok(sword.blocked);
  const off = H.attackWith({free: 1, hands: 2, weapon: {}, mode: "drag"});
  assert.equal(off.blocked, ""); assert.equal(off.diff, 1);
  assert.equal(H.attackWith({free: 1, hands: 2, weapon: {}, mode: "drag", ambidextrous: true}).diff, 0);
  assert.ok(H.attackWith({free: 1, hands: 2, weapon: {twoHanded: true}, mode: "drag"}).blocked);
  assert.equal(H.attackWith({free: 2, hands: 4, weapon: {twoHanded: true}, mode: "carry"}).blocked, "", "four arms swing a greatsword while carrying");
  assert.equal(H.attackWith({free: 0, hands: 2, weapon: {natural: true}, mode: "carry"}).blocked, "", "fangs need no hands");
  assert.equal(H.shieldHeld({free: 1, weaponHands: 1}), false);
  assert.equal(H.shieldHeld({free: 3, weaponHands: 1}), true);
  assert.equal(H.DODGE, 1);
});

test("noise: heavy furniture scrapes loudly, a body drags quietly, carrying is silent (B5083)", () => {
  assert.equal(H.noiseOf({kind: "thing", kg: 60}), "loud");
  assert.equal(H.noiseOf({kind: "thing", kg: 60, wheels: true}), "quiet");
  assert.equal(H.noiseOf({kind: "body", mode: "drag"}), "quiet");
  assert.equal(H.noiseOf({kind: "body", mode: "carry"}), "silent");
});

test("struggling free: more successes than the carrier (B5078)", () => {
  assert.ok(H.struggleWins(2, 1));
  assert.ok(!H.struggleWins(1, 1));
});

test("on the map: a dragged body lies behind; a thing in a doorway is over the door; the floor patch stays on the map (B5075, B5085)", () => {
  assert.deepEqual(H.behind({x: 500, y: 500}, {x: 300, y: 500}, 100), {x: 400, y: 500});
  assert.ok(H.overDoor({x: 100, y: 100, w: 100, h: 100}, [150, 100, 150, 200]));
  assert.ok(!H.overDoor({x: 300, y: 100, w: 100, h: 100}, [150, 100, 150, 200]));
  assert.deepEqual(H.floorPatch({x: 200, y: 200, w: 100, h: 100}, {x: 400, y: 200}, {x: 0, y: 0, w: 1000, h: 1000}), {x: 100, y: 200, w: 100, h: 100});
  assert.equal(H.floorPatch({x: 0, y: 0, w: 100, h: 100}, {x: 100, y: 0}, {x: 0, y: 0, w: 100, h: 100}), null);
  assert.ok(H.bleeds({lethal: 1}) && H.bleeds({dead: true}) && !H.bleeds({}));
});

test("wiring: Interactables sets it up, the HUD, the api, cover from a barricade and the tile's own settings", () => {
  const main = src("modules/wodx-interactables/scripts/main.mjs"), haul = src("modules/wodx-interactables/scripts/haul.mjs");
  assert.match(main, /api\.haul = setupHaul\(/);
  assert.match(main, /flags\?\.\[MOD\]\?\.barricade \? 2 : 0/);
  assert.match(main, /name="\$\{p\}\.haulKg"/);
  for ( const k of ["burdenOf", "take", "release", "struggle", "optionsFor", "fallenOf", "handsOf"] ) assert.match(haul, new RegExp(`\\b${k}\\b`), k);
  assert.match(haul, /fa-people-carry-box/);
  assert.match(haul, /createEmbeddedDocuments\("Drawing"/, "the trail is drawn");
  assert.match(haul, /clueKind: "trail"/, "a tracker can find it");
  assert.match(haul, /createEmbeddedDocuments\("Wall"/, "a barricade blocks the door");
  assert.match(haul, /haulFloorOf/, "the floor left behind shows");
});
