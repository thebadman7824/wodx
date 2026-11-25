/**
 * Powers that act each turn while they hold (B4832-B4834), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatetimedpowers.mjs?${Date.now()}`)).run()
 * It makes its own scratch scene, a mortal and a fight, and removes them all.
 *   1. a Heart Claw left in a mortal (W20 p. 173) takes an unsoakable lethal level on the bearer's next turn, as the
 *      fight moves on by itself, and the turn's card names the power
 * Result: Data/wodx-gate/gatetimedpowers-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-actions";
const wait = ms => new Promise(r => setTimeout(r, ms));

export async function run() {
  const G = gate("gatetimedpowers", {stepTimeout: 45000});
  let combat = null;
  try {
    const A = game.modules.get(MOD)?.api;
    const scene = await G.scene({name: "WoDX gate: timed powers"});

    await G.step("1. a Heart Claw takes a lethal level on the bearer's next turn", async () => {
      const rec = A?.turnRules?.EVERY_TURN?.["heart claw"];
      const [victim] = await G.make(Actor, [{name: "Gate Timed Victim", type: "Mortal"}]);
      await victim.update({"system.health.damage.lethal": 0, "system.health.damage.bashing": 0, "system.health.damage.aggravated": 0});
      const [vt] = await G.tokens(scene, [{actor: victim, x: 3, y: 3, actorLink: true}]);
      await A.turns.attach(victim, rec, {label: "Heart Claw", rounds: 3});
      const a = () => game.actors.get(victim.id);
      combat = await Combat.create({scene: scene.id, active: true});
      await combat.createEmbeddedDocuments("Combatant", [{tokenId: vt.id, sceneId: scene.id, actorId: victim.id}]);
      await combat.startCombat();
      await wait(1200);
      const before = Number(a().system.health.damage.lethal);
      const since = Date.now();
      // the fight moves on: the bearer's turn comes round again, and the hook works the claw
      await combat.nextRound();
      await waitFor(() => Number(a().system.health.damage.lethal) > before, 10000).catch(() => null);
      await waitFor(() => game.messages.contents.some(m => (m.timestamp ?? 0) >= since && /Heart Claw/.test(m.content ?? "")), 5000).catch(() => null);
      const after = Number(a().system.health.damage.lethal);
      const card = game.messages.contents.find(m => (m.timestamp ?? 0) >= since && /Heart Claw/.test(m.content ?? ""));
      G.ok("1. a Heart Claw takes a lethal level on the bearer's next turn", !!rec && after === before + 1 && !!card,
        {rec: !!rec, before, after, card: String(card?.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 200)});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    try { if ( combat && game.combats.get(combat.id) ) await combat.delete(); } catch (e) { G.R.notes.push(`combat: ${e?.message ?? e}`); }
    return G.finish();
  }
}
