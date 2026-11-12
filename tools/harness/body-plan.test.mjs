import test from "node:test";
import assert from "node:assert/strict";
import * as B from "../../modules/wodx-combat/scripts/body-rules.js";
import { bodyHtml } from "../../modules/wodx-sheets/scripts/body-html.mjs";
import * as SB from "../../modules/wodx-storyteller/scripts/body-rules.mjs";
import { powersFor } from "../../modules/wodx-senses/scripts/senses-rules.mjs";

test("a person has two hands, wears armor, speaks, and no natural weapons", () => {
  const b = B.bodyOf({});
  assert.equal(b.shape, "person");
  assert.equal(b.hands, 2);
  assert.ok(b.holds && b.armor && b.speaks);
  assert.deepEqual(Object.keys(b.weapons), []);
  const t = B.hitTable(b);
  assert.equal(t.reduce((s, x) => s + x.weight, 0), 10);
});

test("Shape of the Beast: wolf by default, bat when named; a Gift naming a wolf changes nothing", () => {
  const wolf = B.bodyOf({effects: [{name: "Shape of the Beast"}]});
  assert.equal(wolf.shape, "wolf");
  assert.equal(wolf.holds, false);
  assert.equal(wolf.armor, false);
  assert.equal(wolf.weapons.bite.type, "aggravated");
  assert.equal(wolf.senses, "wolf");
  assert.equal(B.bodyOf({effects: [{name: "Shape of the Beast", description: "a bat"}]}).moves.fly, true);
  assert.equal(B.bodyOf({effects: [{name: "Call of the Wolf"}]}).shape, "person");
  assert.equal(B.bodyOf({effects: [{name: "Shaped", key: "wodx-effect-shape", description: "takes the shape of a raven"}]}).shape, "bird");
});

test("Feral Claws grows claws on the hands; losing both hands takes them away", () => {
  const fc = B.bodyOf({effects: [{name: "Feral Claws"}]});
  assert.deepEqual([fc.weapons.claw.type, fc.weapons.claw.bonus], ["aggravated", 1]);
  const none = B.bodyOf({effects: [{name: "Feral Claws"}], features: [{key: "lost", part: "arm-r"}, {key: "lost", part: "arm-l"}]});
  assert.equal(none.hands, 0);
  assert.equal(none.weapons.claw, undefined);
});

test("mist and earth: no parts to strike, nothing held; dedicated gear stays", () => {
  const m = B.bodyOf({effects: [{name: "Mist Form"}]});
  assert.equal(m.intangible, true);
  assert.deepEqual(B.hitTable(m), []);
  assert.equal(B.hitLocation(m), null);
  const drop = B.gearToDrop(m, [{id: "a", kind: "weapon", equipped: true}, {id: "b", kind: "armor", equipped: true, dedicated: true}, {id: "c", kind: "armor", equipped: false}]);
  assert.deepEqual(drop.map(d => d.id), ["a"]);
  assert.equal(B.bodyOf({effects: [{name: "Earth Meld"}]}).hidden, true);
});

test("Garou forms and Changing Breeds pick the right tree", () => {
  assert.equal(B.bodyOf({shifter: true, garouForm: "crinos"}).holds, true);
  assert.equal(B.bodyOf({shifter: true, garouForm: "crinos"}).armor, false);
  assert.equal(B.bodyOf({shifter: true, garouForm: "lupus"}).holds, false);
  assert.equal(B.bodyOf({shifter: true, garouForm: "glabro"}).armor, true);
  assert.equal(B.bodyOf({shifter: true, garouForm: "lupus", feraKey: "Corax"}).moves.fly, true);
  assert.equal(B.bodyOf({shifter: true, garouForm: "homid", feraKey: "Corax"}).shape, "homid");
  // the Storyteller's flag wins
  assert.equal(B.bodyOf({shifter: true, garouForm: "lupus", shapeFlag: "person"}).shape, "person");
});

test("features add and take away parts", () => {
  const b = B.bodyOf({features: [{key: "wings"}, {key: "arms"}, {key: "talons"}, {key: "lost", part: "leg-r"}, {key: "lost", part: "eye-l"}]});
  assert.equal(b.moves.fly, true);
  assert.equal(b.hands, 4);
  assert.equal(b.weapons.claw.type, "lethal");
  assert.equal(b.mobility, 0.5);
  assert.deepEqual(b.lost, ["leg-r", "eye-l"]);
  const o = B.outline(b);
  assert.ok(o.some(p => p.id === "wing-r" && p.added));
  assert.ok(o.some(p => p.id === "leg-r" && p.lost));
  // losing the wings grounds the flier
  assert.equal(B.bodyOf({features: [{key: "wings"}, {key: "lost", part: "wing-r"}, {key: "lost", part: "wing-l"}]}).moves.fly, undefined);
  assert.equal(B.bodyOf({features: [{key: "lost", part: "leg-r"}, {key: "lost", part: "leg-l"}]}).mobility, 0);
});

test("hit locations: aimed at a part, at a size, or at random by weight", () => {
  const b = B.bodyOf({});
  assert.equal(B.hitLocation(b, {aimed: "hand-l"}).label, "Left hand");
  assert.equal(B.hitLocation(b, {aimed: "precise", r: 0}).size, "precise");
  assert.equal(B.hitLocation(b, {r: 0}).type, "body");
  assert.equal(B.hitLocation(b, {r: 0.999}).type, "leg");
  const aims = B.aimOptions(b);
  assert.ok(aims.some(a => a.id === "heart" && a.size === "precise"));
  assert.ok(!aims.some(a => a.id === "body"));
});

test("a maiming is only offered for heavy lethal or aggravated blows to a limb or eye", () => {
  const hand = {id: "hand-r", type: "hand", label: "Right hand"};
  assert.equal(B.maimOffer(hand, {levels: 2, type: "lethal"}), null);
  assert.equal(B.maimOffer(hand, {levels: 4, type: "bashing"}), null);
  assert.equal(B.maimOffer({id: "body", type: "body", label: "Body"}, {levels: 5, type: "lethal"}), null);
  assert.ok(B.maimOffer(hand, {levels: 3, type: "aggravated"}).stops);
  assert.ok(B.maimOffer({id: "eye-l", type: "eye", label: "Left eye"}, {levels: 3, type: "lethal"}));
});

test("the Storyteller record keeps the feature and the lost part", () => {
  const c = SB.normChange({what: "Left hand lost", part: "hands", feature: "lost", lostPart: "hand-l"});
  assert.deepEqual([c.feature, c.lostPart], ["lost", "hand-l"]);
  const bad = SB.normChange({what: "x", feature: "nonsense", lostPart: "../x"});
  assert.deepEqual([bad.feature, bad.lostPart], ["", ""]);
  for ( const k of SB.FEATURE_KEYS ) assert.ok(B.FEATURES[k], `combat knows feature ${k}`);
  for ( const id of Object.keys(SB.LOSABLE) ) assert.ok(B.flatten(B.PLANS.wingedPerson()).concat(B.flatten(B.PLANS.beast())).some(p => p.id === id), `part ${id} exists`);
});

test("Senses reads the body's senses", () => {
  assert.ok(powersFor({body: "wolf"}).smellFirst);
  assert.ok(powersFor({body: "bat"}).mods.some(m => m.senses?.includes("sound")));
});

test("the Body tab shows parts, losses and what the body can do", () => {
  const b = B.bodyOf({features: [{key: "lost", part: "hand-l"}]});
  const html = bodyHtml(b, {outline: B.outline(b), hitTable: B.hitTable(b), held: {"hand-r": "Sword"}, changes: [{what: "Left hand lost", shows: true}], gm: true, shapes: {person: "Person"}});
  assert.match(html, /Left hand/);
  assert.match(html, /lost/);
  assert.match(html, /holds Sword/);
  assert.match(html, /wodx-body-shape/);
  assert.match(bodyHtml(B.bodyOf({effects: [{name: "Mist Form"}]}), {}), /body of mist/);
  assert.match(bodyHtml(null), /needs WoDX Combat/);
});

test("a vampire's beast shape carries worn things along; held things drop; no soak from armor in the shape", () => {
  const w = B.bodyOf({effects: [{name: "Shape of the Beast"}]});
  assert.equal(w.carries, true);
  const drop = B.gearToDrop(w, [{id: "sword", kind: "weapon", equipped: true}, {id: "mail", kind: "armor", equipped: true}]);
  assert.deepEqual(drop.map(d => d.id), ["sword"]);
  const crinos = B.bodyOf({shifter: true, garouForm: "crinos"});
  assert.deepEqual(B.gearToDrop(crinos, [{id: "mail", kind: "armor", equipped: true}]).map(d => d.id), ["mail"]);
});
