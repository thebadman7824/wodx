import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import * as D from "../../modules/wodx-actions/scripts/discipline-looks.js";

// Dark Ages depth desk item 7 (B7641-B7643): Disciplines you can see on the map.
const DA = ["animalism", "auspex", "celerity", "chimerstry", "dementation", "dominate", "fortitude", "mortis", "obfuscate", "obtenebration",
  "potence", "presence", "protean", "quietus", "serpentis", "thaumaturgy", "vicissitude"];

test("every Discipline a Dark Ages clan starts with has an entry, and all but Obfuscate show a look", () => {
  for ( const k of DA ) assert.ok(D.DISCIPLINE_LOOKS[k], k);
  for ( const k of DA.filter(x => x !== "obfuscate") ) {
    const L = D.lookForPower({group: k[0].toUpperCase() + k.slice(1), power: "Some power"});
    assert.ok(L && (L.look.aura || L.look.tint), k);
    assert.equal(L.seconds, D.LOOK_SECONDS);
  }
  assert.equal(D.lookForPower({group: "Obfuscate", power: "Unseen Presence"}), null);
});

test("the power's family picks its own look: Dread Gaze is darker than Awe, Arms of Ahriman wider than Shroud of Night", () => {
  const awe = D.lookForPower({group: "Presence", power: "Awe"}), dread = D.lookForPower({group: "Presence", power: "Dread Gaze"});
  assert.notEqual(awe.look.aura.color, dread.look.aura.color);
  const shroud = D.lookForPower({group: "Obtenebration", power: "Shroud of Night"}), arms = D.lookForPower({group: "Obtenebration", power: "Arms of Ahriman"});
  assert.ok(arms.look.aura.radius > shroud.look.aura.radius);
  assert.equal(D.lookForPower({group: "Thaumaturgy", power: "Lure of Flames 2"}).look.aura.color, 0xff7020);
});

test("the Discipline is found from the group, else from the power's name; other powers have no look", () => {
  assert.equal(D.disciplineOf({group: "Discipline: Dominate", power: "Command"}), "dominate");
  assert.equal(D.disciplineOf({group: null, power: "Path of Blood: A Taste for Blood"}), "thaumaturgy");
  assert.equal(D.lookForPower({group: "Correspondence", power: "Spatial Perceptions"}), null);
  assert.equal(D.lookForPower({}), null);
});

test("Auspex is seen only by the one who works it and the Storyteller; open powers by everyone", () => {
  const sp = D.lookForPower({group: "Auspex", power: "Aura Perception"});
  assert.equal(sp.seen, "self");
  assert.equal(D.visibleTo("self", {isGM: false, isOwner: false}), false);
  assert.equal(D.visibleTo("self", {isOwner: true}), true);
  assert.equal(D.visibleTo("self", {isGM: true}), true);
  assert.equal(D.visibleTo("all", {}), true);
  assert.equal(D.visibleTo("none", {isGM: true}), false);
  assert.equal(D.live({key: "presence", until: 2000}, 1000), true);
  assert.equal(D.live({key: "presence", until: 2000}, 3000), false);
  assert.equal(D.live(null, 0), false);
});
