/**
 * NPCs refill their own pools as the night turns (B6319), in Foundry, in rothenstein-wodx, as
 * Gamemaster Test:
 *   await (await import(`/wodx-gate/gatenpcrefill.mjs?${Date.now()}`)).run()
 * It makes its own scratch scene and an NPC changeling, moves the clock a day and back, and removes what it made.
 *   1. a changeling NPC with Holdings 2 regains 2 Glamour (Sanctuary, C20 p. 259) when the clock crosses into the next
 *      night, by the NPC module's own clock hook; the Storyteller gets the night's card naming it
 * Result: Data/wodx-gate/gatenpcrefill-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const N = "wodx-npc", DAY = 86400;

export async function run() {
  const G = gate("gatenpcrefill");
  const keep = [];
  try {
    for ( const k of ["npcRefill", "refillNight"] ) if ( game.settings.settings.has(`${N}.${k}`) ) keep.push([k, game.settings.get(N, k)]);
    await game.settings.set(N, "npcRefill", true);
    const scene = await G.scene();

    await G.step("1. a changeling NPC's Sanctuary refills Glamour at the new night", async () => {
      const [fae] = await G.make(Actor, [{name: "Gate Refill Sidhe", type: "Changeling"}]);
      await fae.update({"system.advantages.glamour.permanent": 6, "system.advantages.glamour.temporary": 1});
      await fae.createEmbeddedDocuments("Item", [{name: "Holdings", type: "Feature", system: {type: "wod.types.background", value: 2}}]);
      await G.tokens(scene, [{actor: fae, x: 2, y: 2}]);
      const a = () => game.actors.get(fae.id);
      const before = Number(a().system.advantages.glamour.temporary);
      const since = Date.now();
      // the clock's own move, a day on: the NPC module's updateWorldTime hook sees a night it has not run
      await game.time.advance(DAY);
      await waitFor(() => Number(a().system.advantages.glamour.temporary) >= before + 2, 60000).catch(() => null);
      await waitFor(() => game.messages.contents.some(m => (m.timestamp ?? 0) >= since && /NPCs refill/.test(m.content ?? "") && m.content.includes(fae.name)), 15000).catch(() => null);
      const after = Number(a().system.advantages.glamour.temporary);
      const card = game.messages.contents.find(m => (m.timestamp ?? 0) >= since && /NPCs refill/.test(m.content ?? "") && m.content.includes(fae.name));
      G.ok("1. a changeling NPC's Sanctuary refills Glamour at the new night", after >= before + 2 && !a().hasPlayerOwner && !!card && card.whisper?.length > 0,
        {before, after, card: !!card, whisper: card?.whisper?.length ?? 0, night: game.settings.get(N, "refillNight")});
    }, {timeout: 120000}); // a day's move runs every module's clock work over the whole world first
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    for ( const [k, v] of keep ) { try { await game.settings.set(N, k, v); } catch (e) { G.R.notes.push(`setting ${k}: ${e?.message ?? e}`); } }
    return G.finish();
  }
}
