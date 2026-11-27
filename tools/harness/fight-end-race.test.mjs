import assert from "node:assert/strict";
import {test} from "node:test";

/* B7984 (#2675): fight-end checks for one fight run in turn; a fight being ended takes no further write. */

test("two quick turn changes end the fight once, and nothing is written to it after the delete", async () => {
  const log = [];
  const tick = () => new Promise(r => setTimeout(r, 5));
  const combats = new Map();
  const mk = (id, cbs) => {
    const flags = {};
    const c = {
      id, started: true, round: 2, turn: 0,
      combatants: {contents: [
        {name: "hero", actor: {hasPlayerOwner: true}, token: {id: "t1", disposition: 1}, isDefeated: false},
        {name: "foe", actor: {hasPlayerOwner: false}, token: {id: "t2", disposition: -1}, isDefeated: true}]},
      getFlag: (m, k) => flags[k] ?? null,
      setFlag: async (m, k, v) => { await tick(); if ( !combats.has(id) ) log.push("write-after-delete"); flags[k] = v; log.push("setFlag"); },
      unsetFlag: async (m, k) => { await tick(); if ( !combats.has(id) ) log.push("write-after-delete"); delete flags[k]; },
      delete: async () => { await tick(); if ( !combats.has(id) ) log.push("delete-twice"); combats.delete(id); log.push("delete"); cbs.forEach(f => f(c)); }
    };
    for ( const x of c.combatants.contents ) x.combat = c;
    c.scene = {tokens: {get: tid => ({id: tid})}};
    return c;
  };
  const hooks = {};
  globalThis.Hooks = {on: (n, f) => { (hooks[n] ??= []).push(f); }};
  globalThis.CONST = {TOKEN_DISPOSITIONS: {HOSTILE: -1, NEUTRAL: 0, FRIENDLY: 1}};
  globalThis.ChatMessage = {create: async () => { await tick(); await tick(); log.push("card"); }};
  globalThis.game = {user: {isGM: true, id: "gm"}, users: Object.assign([{isGM: true, id: "gm"}], {activeGM: {id: "gm"}}),
    combats: {get: id => combats.get(id)}, settings: {get: () => "auto"}};
  const FE = await import("../../modules/wodx-combat/scripts/fight-end.js");
  FE.installFightEnd();
  const c = mk("c1", hooks.deleteCombat ?? []);
  combats.set("c1", c);
  // the fight has looked over since round 1, turn 0: this turn change ends it, and a second comes straight after
  await c.setFlag("wodx-combat", "endWatch", {round: 1, turn: 0}); log.length = 0;
  const a = FE.fightEndApi.check(c), b = FE.fightEndApi.check(c);
  await Promise.all([a, b]);
  await FE.fightEndApi.idle?.(); await new Promise(r => setTimeout(r, 100));
  assert.deepEqual(log.filter(x => x === "delete").length, 1, log.join(","));
  assert.ok(!log.includes("write-after-delete") && !log.includes("delete-twice"), log.join(","));
  assert.ok(!combats.has("c1"));
});
