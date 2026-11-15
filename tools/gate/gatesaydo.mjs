/**
 * WoDX Actions gate: windows that used to only say now do (Say or Do Desk, B5750-B5758), in Foundry, in
 * rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatesaydo.mjs?${Date.now()}`)).run()
 * Makes its own scene and characters and removes them; never moves the clock.
 *   1. the Willpower window's automatic success waits on the character for the next roll
 *   2. vitae spent to heal takes bashing damage off a vampire
 *   3. a Delirium result given by hand acts on the map: catatonic fear leaves the witness Immobilized
 *   4. a lost Passion's Harrowing takes the quarry Passion to 0 and brings the wraith's token back from the fade
 *   5. a week of downtime on Resources puts money in the purse
 * Result: Data/wodx-gate/gatesaydo-result.json.
 */
import {gate} from "./kit.mjs";

const MOD = "wodx-actions";

export async function run() {
  const G = gate("gatesaydo");
  if ( G.notLive() ) return "Not on the Live world.";
  const X = () => game.modules.get(MOD)?.api;
  const auto = v => X().profiles.autoNext(v);
  let spend = null;
  try { spend = game.settings.get(MOD, "spendResources"); await game.settings.set(MOD, "spendResources", true); } catch (e) { /* not here */ }
  try {
    const scene = await G.scene();
    const [mortal, vamp, witness, wraith, rich] = await G.make(Actor, [
      {name: "Gate SayDo Steady", type: "Mortal", prototypeToken: {actorLink: true}},
      {name: "Gate SayDo Vampire", type: "Vampire", prototypeToken: {actorLink: true}},
      {name: "Gate SayDo Witness", type: "Mortal", prototypeToken: {actorLink: true}},
      {name: "Gate SayDo Wraith", type: "Mortal", prototypeToken: {actorLink: true}, items: [
        {name: "Gate quarry", type: "Trait", system: {type: "wod.types.passion", value: 4}},
        {name: "Gate other", type: "Trait", system: {type: "wod.types.passion", value: 3}}]},
      {name: "Gate SayDo Rich", type: "Vampire", prototypeToken: {actorLink: true}, items: [
        {name: "Resources", type: "Feature", system: {type: "wod.types.background", value: 5}}]}]);
    await mortal.update({"system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 5});
    await wraith.update({"system.advantages.willpower.permanent": 0, "system.advantages.willpower.temporary": 0});
    await X().setKind(vamp, "kindred");
    await X().setKind(rich, "kindred");
    await X().setKind(wraith, "wraith");
    const [, tw, tg] = await G.tokens(scene, [{actor: vamp, x: 2, y: 2}, {actor: witness, x: 4, y: 2}, {actor: wraith, x: 6, y: 2}]);

    await G.step("1 held success", async () => {
      await mortal.unsetFlag(MOD, "held");
      auto({use: 0, cost: 1});
      await X().uses({actor: mortal, resource: "willpower"});
      const held = mortal.getFlag(MOD, "held") ?? {};
      G.ok("1 held success", Number(held.wp) === 1 && mortal.system.advantages.willpower.temporary === 4, {held, temp: mortal.system.advantages.willpower.temporary});
    });

    await G.step("2 vitae heals", async () => {
      const bp = vamp.system?.advantages?.bloodpool ?? {};
      await vamp.update({"system.advantages.bloodpool.temporary": Math.max(5, Number(bp.temporary) || 0), "system.advantages.bloodpool.max": Math.max(10, Number(bp.max) || 0)});
      const C = game.wodxCombat;
      if ( C?.applyDamage ) await C.applyDamage(vamp, "bashing", 2); else await vamp.update({"system.health.damage.bashing": 2});
      const before = Number(vamp.system?.health?.damage?.bashing) || 0;
      auto({use: 0, cost: 1});
      await X().uses({actor: vamp, resource: "blood"});
      const after = Number(vamp.system?.health?.damage?.bashing) || 0;
      G.ok("2 vitae heals", before > 0 && after === before - 1, {before, after, combat: !!C?.healDamage});
    });

    await G.step("3 Delirium on the map", async () => {
      const id = tw.document?.id ?? tw.id;
      await X().witnessStep({actor: null, tokens: [tw], secret: "lupine", event: "the gate", given: {[id]: {reaction: "Catatonic fear", memory: "forgets"}}});
      const frozen = witness.effects.some(e => e.statuses?.has?.("wodx-immobilized"));
      G.ok("3 Delirium on the map", frozen, {effects: witness.effects.map(e => e.name)});
    });

    await G.step("4 Harrowing costs the Passion", async () => {
      const quarry = wraith.items.find(i => i.name === "Gate quarry");
      auto({kind: "passion", good: 0, quarry: quarry.id});
      await X().harrowing({actor: wraith});
      const now = Number(wraith.items.get(quarry.id)?.system?.value);
      const alpha = tg.document?.alpha ?? 1;
      G.ok("4 Harrowing costs the Passion", now === 0 && alpha === 1, {now, alpha});
    });

    await G.step("5 downtime money", async () => {
      const M = game.modules.get("wodx-storyteller")?.api?.upkeep?.money;
      const worth = () => { const p = M?.purse?.(rich) ?? {}; return (Number(p.carried) || 0) + (Number(p.bank) || 0); };
      const before = worth();
      auto({kind: "resources", from: "own", diff: 2, weeks: 1});
      await X().downtime({actor: rich});
      const after = worth();
      G.ok("5 downtime money", !!M && after > before, {before, after, money: !!M});
    });
  } finally {
    try { if ( spend !== null ) await game.settings.set(MOD, "spendResources", spend); } catch (e) { /* put back */ }
    return G.finish();
  }
}
