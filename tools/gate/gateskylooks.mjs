/**
 * WoDX Storyteller gate: signs and great events in the sky (B4628), in Foundry, in rothenstein-wodx, as Gamemaster
 * Test:
 *   await (await import(`/wodx-gate/gateskylooks.mjs?${Date.now()}`)).run()
 * Works on a scratch scene and a scratch market; puts the markets back; never moves the clock and never fires a real
 * dated event (it calls the event's look with a made-up copy).
 *   1. an approved sign of crows puts crows on the town's scene, for a night
 *   2. a Great Maelstrom darkens the town's sky with its storm
 *   3. a sign nobody can see (milk souring) draws nothing
 * Result: Data/wodx-gate/gateskylooks-result.json.
 */
import {gate} from "./kit.mjs";

const MOD = "wodx-storyteller";

export async function run() {
  const G = gate("gateskylooks");
  const marketsBefore = foundry.utils.deepClone(game.settings.get(MOD, "markets"));
  const TL = () => game.modules.get(MOD)?.api?.upkeep?.townLooks;
  try {
    const scene = await G.scene({width: 2000, height: 1500});
    await game.settings.set(MOD, "markets", {...marketsBefore, markets: [...(marketsBefore?.markets ?? []), {id: "gate-sky", name: "WoDX gate: Sky", scenes: [scene.id], links: []}]});
    const mine = src => {
      const own = [...scene.drawings].filter(d => d.flags?.[MOD]?.look?.source === src).map(d => d.flags[MOD].look);
      const lay = (game.modules.get("wodx-chronicle")?.api?.looks?.list?.(scene) ?? []).filter(l => l.source === src);
      return [...own, ...lay];
    };

    await G.step("1. crows on the roofs", async () => {
      const n = await TL().showOmen("Crows gather on the roofs and do not leave.");
      const m = mine("omen");
      G.ok("1. crows on the roofs", n >= 8 && m.length === 8 && m.every(x => !x.until || Number(x.until?.worldTime ?? x.until) > game.time.worldTime), {n, m: m.length});
    });

    await G.step("2. a Maelstrom's storm", async () => {
      const n = await TL().showEvent({id: "fourth-great-maelstrom"});
      const m = mine("event:fourth-great-maelstrom");
      G.ok("2. a Maelstrom's storm", n >= 1 && m.length === 1 && m[0].kind === "storm", {n, kinds: m.map(x => x.kind)});
    });

    await G.step("3. an unseen sign draws nothing", async () => {
      const before = scene.drawings.size;
      const n = await TL().showOmen("Milk sours in every house on the same morning.");
      G.ok("3. an unseen sign draws nothing", n === 0 && scene.drawings.size === before, {n});
    });
  } finally {
    try { await game.settings.set(MOD, "markets", marketsBefore); } catch (e) { G.R.notes.push(`markets back: ${e?.message ?? e}`); }
    return G.finish();
  }
}
