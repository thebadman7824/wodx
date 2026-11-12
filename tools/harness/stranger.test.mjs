import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as F from "../../modules/wodx-npc/scripts/faces-rules.mjs";
import * as SR from "../../modules/wodx-actions/scripts/social-rules.js";
import * as U from "../../modules/wodx-library/scripts/use-rules.mjs";

/* What a character can tell about a stranger (NPC 0.34.0, Actions 3.46.0), and players' own disguises (Library 0.15.0) */
const src = p => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

test("the stranger line reads dress, side, condition, what they are doing and their manner", () => {
  assert.equal(F.autoStranger({station: 3, sides: ["livery"], activity: "patrol", step: -1}), "a well dressed stranger in livery, keeping watch, wary of you");
  assert.equal(F.autoStranger({station: 0, condition: ["bloody", "weapon"], step: 0}), "a ragged, bloodied stranger, armed");
  assert.equal(F.autoStranger({}), "a stranger");
  assert.equal(F.autoStranger({station: null, sides: ["kind:church"], step: 2}), "a stranger in a churchman's habit, friendly to you");
  assert.equal(F.autoStranger({animal: "Stray dog", activity: "wander"}), "a stray dog, out and about");
  assert.equal(F.autoStranger({animal: "owl"}), "an owl");
});

test("the Storyteller's own stranger text wins, then the line, then A stranger; names once met", () => {
  assert.equal(F.nameFor({name: "Anna", flags: {stranger: "a tall figure"}, auto: "a stranger, armed"}), "a tall figure");
  assert.equal(F.nameFor({name: "Anna", flags: {}, auto: "a stranger, armed"}), "a stranger, armed");
  assert.equal(F.nameFor({name: "Anna", flags: {}}), F.DEFAULT_STRANGER);
  assert.equal(F.nameFor({name: "Anna", flags: {metBy: ["pc1"]}, mine: ["pc1"], auto: "x"}), "Anna");
  assert.equal(F.nameFor({name: "Anna", flags: {}, gm: true, auto: "x"}), "Anna");
  assert.match(src("modules/wodx-npc/scripts/faces.mjs"), /autoFor\(token, a, ids\)/);
  assert.match(src("modules/wodx-npc/scripts/main.mjs"), /animals: AN\.ANIMALS/);
});

test("Look them over: a fact per success, nothing hidden shown early", () => {
  const info = {mood: "Distrusted", condition: ["armed"], station: 3, trade: "guard", doing: "keeping watch", belongs: "the Margrave's household", hidden: ["a dagger"], disguised: false};
  assert.deepEqual(SR.lookOverFacts(0, info), []);
  assert.deepEqual(SR.lookOverFacts(1, info), ["They seem distrusted toward you, and armed."]);
  const all = SR.lookOverFacts(4, info);
  assert.equal(all.length, 4);
  assert.equal(all[1], "By their dress and bearing: comfortable, guard, keeping watch.");
  assert.equal(all[2], "They carry themselves like someone of the Margrave's household.");
  assert.equal(all[3], "They carry something hidden: a dagger.");
  assert.match(SR.lookOverFacts(4, {...info, disguised: true})[3], /not what they are dressed as/);
  assert.equal(SR.lookOverFacts(4, {})[3], "They hide nothing that you can see.");
  assert.deepEqual(SR.askFacts(1, {said: "one of the watch", name: "Anna"}), ["People say they are one of the watch."]);
  assert.deepEqual(SR.askFacts(2, {said: "", name: "Anna"}), ["Nobody seems to know much about them.", "Their name is Anna."]);
  assert.deepEqual(SR.LOOKOVER.look.alts[0], ["perception", "empathy"]);
  assert.deepEqual(SR.LOOKOVER.ask.alts[0], ["wits", "streetwise"]);
  const so = src("modules/wodx-actions/scripts/social.js");
  assert.match(so, /act === "lookover" \|\| act === "askabout"/);
  assert.match(so, /pf\.line === "mortal"/, "a supernatural template's label never shows");
});

test("players can dress as someone else in their own clothes", () => {
  assert.equal(U.ABILITIES.dressas.effect, "dressas");
  assert.ok(U.abilitiesOf({kind: "cloth", name: "a wool cloak"}).includes("dressas"));
  assert.ok(!U.abilitiesOf({kind: "valuables", name: "a gold ring"}).includes("dressas"));
  assert.match(src("modules/wodx-library/scripts/use.mjs"), /case "dressas": return dressAs\(actor, item\);/);
});
