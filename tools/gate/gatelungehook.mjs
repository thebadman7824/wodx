/**
 * WoDX Combat gate: the house Lunge and Hook and Pull leave marks Combat reads on the turn after (B6921), in Foundry,
 * in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatelungehook.mjs?${Date.now()}`)).run()
 * Makes its own scene, actors, tokens and fight and removes them; never moves the clock.
 *   1. the rules are there: a lunge marks the attacker, a hook that gets damage through marks the target
 *   2. an overextended fighter defends at +1 difficulty this turn and the next, and not the turn after
 *   3. a hooked fighter's turn opens with an "is off balance" card naming the lost move
 * Result: Data/wodx-gate/gatelungehook-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const CMB = "wodx-combat";
const body = name => ({name, type: "Mortal", ownership: {default: 3},
  system: {attributes: {dexterity: {value: 3, total: 3}, wits: {value: 2, total: 2}, strength: {value: 2, total: 2}, stamina: {value: 2, total: 2}},
    abilities: {athletics: {value: 2}, brawl: {value: 2}}}});

export async function run() {
  const G = gate("gatelungehook", {stepTimeout: 45000});
  try {
    const C = game.wodxCombat ?? game.modules.get(CMB)?.api;
    const scene = await G.scene({name: "WoDX gate: lunge and hook"});
    const [a, b] = await G.make(Actor, [body("Gate Lunger"), body("Gate Hooked")]);
    const [ta, tb] = await G.tokens(scene, [{actor: a, x: 2, y: 2, actorLink: true}, {actor: b, x: 3, y: 2, actorLink: true}]);
    await waitFor(() => ta?.object && tb?.object, 8000);
    const combat = await G.make(Combat, {scene: scene.id, active: true});
    await combat.createEmbeddedDocuments("Combatant", [ta, tb].map(t => ({tokenId: t.id, sceneId: scene.id, actorId: t.actorId})));
    await combat.startCombat();
    await waitFor(() => combat.started, 4000);
    const fist = {name: "Fist", ranged: false, type: "bashing"};
    const dodgeDiff = () => C.bestDefense(a, {}, fist, {}).plans.find(p => p.type === "dodge")?.diff;

    await G.step("1. the rules mark lunger and hooked", async () => {
      const now = {combat: combat.id, round: combat.round};
      const lunge = C.rules.houseAfter?.("lunge", {hit: false, now}) ?? [];
      const hook = C.rules.houseAfter?.("hook", {hit: true, levels: 1, now}) ?? [];
      const soaked = C.rules.houseAfter?.("hook", {hit: true, levels: 0, now}) ?? [];
      G.ok("1. the rules mark lunger and hooked", lunge[0]?.[1] === "overextended" && hook[0]?.[1] === "hooked" && soaked.length === 0, {lunge, hook, soaked});
    });

    await G.step("2. overextended defends at +1 this turn and the next", async () => {
      await a.unsetFlag(CMB, "overextended");
      const base = dodgeDiff();
      await a.setFlag(CMB, "overextended", {combat: combat.id, round: combat.round});
      const now = dodgeDiff();
      await combat.nextRound();
      const next = dodgeDiff();
      await combat.nextRound();
      const after = dodgeDiff();
      G.ok("2. overextended defends at +1 this turn and the next", now === base + 1 && next === base + 1 && after === base, {base, now, next, after});
    });

    await G.step("3. a hooked fighter's turn opens with the lost-move card", async () => {
      await b.setFlag(CMB, "hooked", {combat: combat.id, round: combat.round});
      const t0 = Date.now();
      await combat.nextRound();
      const idx = combat.turns.findIndex(c => c.actorId === b.id);
      if ( combat.turn === idx ) await combat.update({turn: (idx + 1) % combat.turns.length});
      await combat.update({turn: idx});
      const card = () => game.messages.contents.find(m => m.timestamp >= t0 && m.getFlag?.(CMB, "hooked")?.actor === b.uuid);
      const shown = await waitFor(() => !!card(), 6000);
      G.ok("3. a hooked fighter's turn opens with the lost-move card", shown && /loses this turn's move/.test(card()?.content ?? ""), {card: (card()?.content ?? "").slice(0, 200)});
    });
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally { return G.finish(); }
}
