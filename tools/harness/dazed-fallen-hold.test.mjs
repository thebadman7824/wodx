/* B6660: Dazed costs the whole turn in a fight (no roll, no attack, no move for a player). B6661: a failed stand-up
 * keeps a player's token in place for that turn. The Storyteller is exempt from both. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as AC from "../../modules/wodx-actions/scripts/after-cost-rules.js";
import * as R from "../../modules/wodx-combat/scripts/rules.js";
import * as LIM from "../../modules/wodx-actions/scripts/limits.js";

const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const DAZED = {id: "dazed", name: "Dazed", source: "V20 Dark Ages p. 348", summary: "s", mods: {noAction: true}};
const GAS = {id: "fomor-gas", name: "Gaseous form", mods: {noAction: true}};

test("B6660: cannotActWhy counts Dazed in a fight only, and never a fomor's gas form", () => {
  assert.equal(AC.cannotActWhy({name: "Anna", conds: [DAZED]}), "");
  assert.match(AC.cannotActWhy({name: "Anna", conds: [DAZED], inFight: true}), /Anna is Dazed and loses this turn's action \(V20 Dark Ages p\. 348\)/);
  assert.equal(AC.cannotActWhy({conds: [GAS], inFight: true}), "");
  // out cold still wins, and still counts outside a fight
  assert.match(AC.cannotActWhy({name: "Anna", conds: [DAZED, AC.CONDITIONS.asleep], inFight: true}), /cannot act: Asleep/);
  assert.deepEqual(AC.LOSES_TURN, ["dazed"]);
});

/* A small Foundry: one actor, a Chronicle that reports its statuses, and a fight that may or may not hold it. */
function world({dazed = true, fight = true, isGM = false} = {}) {
  const actor = {id: "a1", name: "Anna", getFlag: () => null};
  const warned = [];
  globalThis.ui = {notifications: {warn: m => warned.push(m)}};
  const combat = {started: fight, combatants: [{actor, token: {actorLink: true}}]};
  globalThis.game = {
    user: {isGM},
    combats: [combat],
    modules: {get: id => id === "wodx-chronicle" ? {api: {conditions: {conditionsOf: () => dazed ? [DAZED] : []}}} : null}
  };
  return {actor, warned};
}

test("B6660: WoDX Actions' cannotAct and refuseIdle read the fight; the Storyteller and outCold pass", () => {
  let w = world();
  assert.equal(LIM.inFight(w.actor), true);
  assert.match(LIM.cannotAct(w.actor), /Dazed/);
  assert.equal(LIM.refuseIdle(w.actor), true);
  assert.match(w.warned[0], /Dazed/);
  // Rage's Ignore being stunned reads only out cold
  assert.equal(LIM.refuseIdle(w.actor, {outCold: true}), false);
  w = world({isGM: true});
  assert.equal(LIM.refuseIdle(w.actor), false);
  w = world({fight: false});
  assert.equal(LIM.cannotAct(w.actor), "");
  w = world({dazed: false});
  assert.equal(LIM.cannotAct(w.actor), "");
  delete globalThis.game; delete globalThis.ui;
});

test("B6660: the callers: attacks (with Actions off too), token moves, the Rage use", () => {
  const m = read("modules/wodx-combat/scripts/main.js");
  assert.match(m, /function noAttackWhy[\s\S]*api\?\.cannotAct\?\.\(attacker\)[\s\S]*!game\.user\.isGM && game\.combat\?\.started && chronicle\(\)\?\.conditions\?\.hasCondition\?\.\(attacker, "dazed"\)/);
  const b = read("modules/wodx-actions/scripts/binds.js");
  assert.match(b, /game\.user\.isGM \) return true;[\s\S]*B6660[\s\S]*const idle = cannotAct\(tok\.actor\)/);
  const pm = read("modules/wodx-actions/scripts/profile-menus.js");
  assert.match(pm, /LIM\.refuseIdle\(actor, \{ outCold: spec === "uses:rage" \}\)/);
});

test("B6661: lostMoveWhy: a failed stand-up this round holds the move; a Phobia bout and another round do not", () => {
  const c = {id: "c1", round: 3};
  assert.match(R.lostMoveWhy({combat: "c1", round: 3}, c, "Anna"), /^Anna failed to stand up and has lost this turn's action, the move with it/);
  assert.equal(R.lostMoveWhy({combat: "c1", round: 3, why: "a phobia of fire"}, c), "");
  assert.equal(R.lostMoveWhy({combat: "c1", round: 2}, c), "");
  assert.equal(R.lostMoveWhy({combat: "c2", round: 3}, c), "");
  assert.equal(R.lostMoveWhy(null, c), "");
  assert.equal(R.lostMoveWhy({combat: "c1", round: 3}, null), "");
});

test("B6661: WoDX Combat's token hook refuses a player's move, before the yards count; the Storyteller is exempt", () => {
  const m = read("modules/wodx-combat/scripts/main.js");
  const block = m.indexOf("export function lostMoveBlock"), count = m.indexOf('setting("movementLimit"); } catch (e) { return; }');
  assert.ok(block > 0 && block < count, "the lost-move hook comes before the yards count");
  assert.match(m, /export function lostMoveBlock\(doc, changes, options\) \{\n\s*if \(game\.user\.isGM \|\|[^\n]*options\?\.wodxMove === false\) return true;[\s\S]*R\.lostMoveWhy\(doc\.actor\?\.getFlag\?\.\(MOD, "lostAction"\), f\.combat, doc\.name\)/);
  assert.match(m, /Hooks\.on\("preUpdateToken", \(doc, changes, options\) => lostMoveBlock\(doc, changes, options\) === false \? false : undefined\);/);
});
