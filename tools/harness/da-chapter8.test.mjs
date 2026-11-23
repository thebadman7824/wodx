import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as H from "../../modules/wodx-actions/scripts/hunter-rules.js";
import * as GR from "../../modules/wodx-actions/scripts/ghost-da-rules.js";
import * as SW from "../../modules/wodx-combat/scripts/swarm-rules.js";
import * as PM from "../../modules/wodx-actions/scripts/profile-menus.js";

const src = p => fs.readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

/* B7675: Holy Artifacts, V20 Dark Ages pp. 394-395 */
test("a Holy Artifact adds its True Faith to the holder's, to ten at most, and nothing while they stray", () => {
  assert.deepEqual(H.HOLY_ARTIFACTS.map(x => x.faith), [1, 3, 5]);
  assert.equal(H.artifactOf([{name: "Ring", flags: {"wodx-actions": {holyArtifact: 1}}}, {name: "Ji", flags: {"wodx-actions": {holyArtifact: 3}}}, {name: "Cup"}]).dots, 3);
  assert.equal(H.artifactOf([{name: "Cup"}]), null);
  assert.equal(H.artifactOf([{name: "X", flags: {"wodx-actions": {holyArtifact: 9}}}]).dots, 5);
  assert.equal(H.faithWithArtifact(0, 3), 3);
  assert.equal(H.faithWithArtifact(4, 3), 7);
  assert.equal(H.faithWithArtifact(7, 5), 10);
  assert.equal(H.faithWithArtifact(4, 3, true), 4);
  const h = src("modules/wodx-actions/scripts/hunter.js");
  assert.match(h, /H\.faithWithArtifact\(baseFaith\(actor\), a\.dots, strayed\(actor\)\)/);
  assert.match(src("modules/wodx-actions/scripts/main.js"), /holyArtifact: withActor\(a => hx\(\)\.holyArtifact\(a\)\)/);
});

/* B7676: ghosts, V20 Dark Ages p. 403 */
test("a Dark Ages ghost: Passion is its blood, it manifests for a point, and the Masked Trickster is the book's", () => {
  const d = GR.ghostActorData();
  assert.equal(d.type, "Wraith");
  assert.ok(GR.isDAGhost(d));
  assert.equal(d.system["advantages.pathos.temporary"], 10);
  assert.equal(d.system["attributes.strength.value"], 0);
  assert.deepEqual(d.flags["wodx-actions"].daGhost.manifest, {strength: 3});
  assert.deepEqual(d.items.filter(i => i.system.type === "wod.types.discipline").map(i => `${i.name} ${i.system.value}`), ["Chimerstry 4", "Dementation 4", "Obtenebration 3", "Thaumaturgy 3"]);
  assert.equal(GR.GHOST_DA.manifestCost, 1);
  assert.match(GR.deathsightOf(0), /nothing clear/);
  const m = src("modules/wodx-actions/scripts/main.js");
  assert.match(m, /if \(GHR\.isDAGhost\(actor\)\) \{ const p = actor\.system\?\.advantages\?\.pathos/);
  assert.match(m, /b\.passion \? "system\.advantages\.pathos\.temporary"/);
  assert.ok(PM.MENUS.ghostDA.sections.flatMap(([, b]) => b.map(([s]) => s)).includes("api:useDiscipline"));
  assert.match(src("modules/wodx-actions/scripts/profile-menus.js"), /kind === "wraith" && ctx\.isDAGhost\?\.\(actor\)\) \? MENUS\.ghostDA/);
  assert.equal(GR.isDAGhost({flags: {}}), false);
});

/* B7677: swarms, V20 Dark Ages p. 399 */
test("a swarm bites at 6 (4 when overrun), three before soak overrun, weapons do one a turn, fire in full", () => {
  assert.deepEqual(Object.values(SW.SWARMS).map(s => [s.damage, s.health, s.init]), [[1, 5, 2], [2, 7, 3], [2, 5, 4], [4, 9, 5], [3, 7, 3], [4, 9, 3], [4, 6, 6], [6, 15, 4]]);
  assert.deepEqual(SW.attackOn(SW.SWARMS.rats), {dice: 3, diff: 6, type: "lethal"});
  assert.equal(SW.attackOn(SW.SWARMS.rats, {overrun: true}).diff, 4);
  assert.equal(SW.SWARMS.smallbugs.type, "bashing");
  assert.deepEqual(SW.hitOn(3), {levels: 3, overrun: true});
  assert.deepEqual(SW.hitOn(4, 2), {levels: 2, overrun: false});
  assert.equal(SW.harmToSwarm(5), 1);
  assert.equal(SW.harmToSwarm(5, {takenThisTurn: 1}), 0);
  assert.equal(SW.harmToSwarm(5, {area: true}), 5);
  assert.equal(SW.stateOf(SW.SWARMS.rats, 6), "whole");
  assert.equal(SW.stateOf(SW.SWARMS.rats, 7), "dispersed");
  assert.equal(SW.stateOf(SW.SWARMS.rats, 9), "gone");
  assert.equal(SW.moveIn({}), "half");
  assert.equal(SW.moveIn({dodged: true}), "full");
  assert.equal(SW.SWARM_DA.dodgeDiff, 8);
  const c = src("modules/wodx-combat/scripts/main.js");
  assert.match(c, /if \(SWR\.isSwarm\(actor\)\) return SW\.harm\(actor, levels, \{ area: swarmArea \}\)/);
  assert.match(c, /SWR\.isSwarm\(a\) \? new Roll\(String\(SWR\.specOf\(a\)\?\.init \?\? 1\)\)/);
});

/* B7678: the spider, V20 Dark Ages p. 399 */
test("a spider: Perception + Alertness at 7 to notice it; unnoticed, a poisonous bite does its levels and a die off", () => {
  assert.deepEqual(SW.SPIDER_DA.notice, {attr: "perception", ability: "alertness", diff: 7});
  assert.deepEqual(SW.spiderBite({noticed: true, venom: "deadly"}), {bitten: false, levels: 0, penalty: 0});
  assert.deepEqual(SW.spiderBite({venom: "strong"}), {bitten: true, levels: 2, penalty: -1});
  assert.deepEqual(SW.spiderBite({}), {bitten: true, levels: 0, penalty: 0});
  const pm = src("modules/wodx-actions/scripts/profile-menus.js");
  for (const s of ["api:sampleGhost", "api:sampleSwarm", "api:spiderOn"]) assert.match(pm, new RegExp(`"${s}"`));
});
