/**
 * Servants and bonds, step three (B5120-B5127), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateservants3.mjs?${Date.now()}`)).run()
 * It makes scratch actors and a scene and deletes them. It does not move the clock (the programme's next roll is set back).
 *   1. the API
 *   2. a fomor: powers on the sheet that WoDX Actions plays, serves a Black Spiral Dancer
 *   3. a mummy's death: the cult guards the vessel
 *   4. a Social Conditioning programme rolls by itself when its time comes
 *   5. NPC keepers: a month's turn binds an unbound mortal to an NPC master, and Undo takes it back
 *   6. experience: a player character's new servant becomes their ally, paid by the master
 * Result: Data/wodx-gate/gateservants3-result.json.
 */
import {gate} from "./kit.mjs";

export async function run() {
  const G = gate("gateservants3");
  const NPC = game.modules.get("wodx-npc")?.api, S = NPC?.servants, W = S?.world;
  const before = {keepers: game.settings.get("wodx-npc", "npcKeepers"), turn: game.settings.get("wodx-npc", "keeperTurn")};
  try {
    await G.step("1. the API", async () => G.ok("1. the API", !!W?.fomorise && !!W?.keeperTurn && !!W?.socialClock && !!S?.openSocial, {version: game.modules.get("wodx-npc")?.version}));
    const scene = await G.scene();
    const [spiral, victim, mummy, cultist, agent, captive, elder, pc] = await G.make(Actor, [
      {name: "Gate Servants3 Spiral", type: "Werewolf", system: {tribe: "Black Spiral Dancers"}},
      {name: "Gate Servants3 Ridden", type: "Mortal"},
      {name: "Gate Servants3 Mummy", type: "Mummy"},
      {name: "Gate Servants3 Cultist", type: "Mortal"},
      {name: "Gate Servants3 Agent", type: "Mage"},
      {name: "Gate Servants3 Captive", type: "Mortal", system: {advantages: {willpower: {permanent: 2, temporary: 0}}}},
      {name: "Gate Servants3 Elder", type: "Vampire"},
      {name: "Gate Servants3 Player", type: "Vampire", ownership: {default: 0, ...Object.fromEntries(game.users.filter(u => !u.isGM).slice(0, 1).map(u => [u.id, 3]))}}]);
    await G.tokens(scene, [{actor: spiral, x: 2, y: 2}, {actor: victim, x: 3, y: 2}, {actor: mummy, x: 5, y: 5}, {actor: cultist, x: 6, y: 5}]);

    await G.step("2. a fomor", async () => {
      const FP = game.wodxActions?.fomor?.rules;
      const r = await W.fomorise(victim, {powers: [FP.BY_KEY.berserker, FP.BY_KEY.animalcontrol]});
      await new Promise(r => setTimeout(r, 900));
      const a = game.actors.get(victim.id);
      const items = a.items.filter(i => i.flags?.["wodx-npc"]?.fomori);
      const bond = a.flags?.["wodx-npc"]?.held?.[`fomor:${spiral.id}`];
      G.ok("2. a fomor", items.length === 2 && game.wodxActions.fomor.powersOf(a).length === 2 && !!bond && r?.master?.id === spiral.id,
        {items: items.length, known: game.wodxActions.fomor.powersOf(a).map(x => x.key), master: r?.master?.name});
    });

    await G.step("3. a mummy's death", async () => {
      await S.bind(cultist, mummy, "cult", {step: 2, quiet: true, flash: false});
      Hooks.callAll("wodxDamageApplied", mummy, {condition: "dead"});
      await new Promise(r => setTimeout(r, 1200));
      const keeps = game.actors.get(cultist.id).flags?.["wodx-npc"]?.keepsVessel;
      G.ok("3. a mummy's death", keeps?.of === mummy.id, {keeps});
    });

    await G.step("4. a programme on the clock", async () => {
      await S.bind(captive, agent, "social", {step: 1, quiet: true, flash: false, data: {stage: 2, group: "union", nextAt: game.time.worldTime - 10, agentDice: 9}});
      await W.socialClock();
      const rec = game.actors.get(captive.id).flags?.["wodx-npc"]?.held?.[`social:${agent.id}`];
      G.ok("4. a programme on the clock", Number(rec?.data?.nextAt) > game.time.worldTime, {stage: rec?.data?.stage, nextAt: rec?.data?.nextAt});
    });

    await G.step("5. NPC keepers", async () => {
      const made = await W.keeperTurn({force: true, only: [elder.id]});
      const mine = (made ?? []).filter(x => x.master === elder.id);
      const ok1 = mine.length >= 1;
      await W.undoKeepers(made ?? []);
      const left = (made ?? []).filter(x => x.kind === "blood" ? !!game.actors.get(x.servant)?.flags?.["wodx-creation"]?.lineage?.bonds?.[x.master] : !!game.actors.get(x.servant)?.flags?.["wodx-npc"]?.held?.[`${x.kind}:${x.master}`]);
      G.ok("5. NPC keepers", ok1 && left.length === 0, {made: made?.length ?? 0, forElder: mine.length, left: left.length});
    });

    await G.step("6. experience", async () => {
      const hasPlayer = game.actors.get(pc.id).hasPlayerOwner;
      await S.bind(cultist, pc, "pact", {step: 1, quiet: true, flash: false});
      await new Promise(r => setTimeout(r, 600));
      const ally = game.actors.get(cultist.id).flags?.["wodx-creation"]?.ally;
      G.ok("6. experience", !hasPlayer || (ally?.patron?.id === pc.id && ally.payer === "patron"), {hasPlayer, ally: ally?.patron?.name ?? null});
    });
  } catch (e) {
    G.R.errors.push(String(e?.stack ?? e));
  } finally {
    await game.settings.set("wodx-npc", "npcKeepers", before.keepers);
    await game.settings.set("wodx-npc", "keeperTurn", before.turn);
    return G.finish();
  }
}
