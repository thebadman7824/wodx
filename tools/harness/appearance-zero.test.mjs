import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {lockedAtZero, findClan} from "../../modules/wodx-rules/creation/rules.mjs";

// B7660: a Nosferatu starts with Appearance 0 that cannot be raised (V20 Dark Ages p. 55); so does anyone Monstrous (p. 421).
test("a Nosferatu's Appearance is held at 0, other Attributes are not", () => {
  const nos = findClan("Nosferatu");
  assert.match(lockedAtZero({clan: nos, key: "appearance"}), /V20 Dark Ages p\. 55/);
  assert.equal(lockedAtZero({clan: nos, key: "charisma"}), null);
  assert.equal(lockedAtZero({clan: findClan("Toreador"), key: "appearance"}), null);
});

test("the Monstrous Flaw holds Appearance at 0 for any clan", () => {
  assert.match(lockedAtZero({clan: findClan("Brujah"), key: "appearance", flaws: ["Monstrous"]}), /p\. 421/);
  assert.equal(lockedAtZero({clan: null, key: "appearance", flaws: ["Mute"]}), null);
});
