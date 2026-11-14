/**
 * WoDX Storyteller gate: a siege at a town shown on its scenes (B4624), in Foundry, in rothenstein-wodx, as
 * Gamemaster Test:
 *   await (await import(`/wodx-gate/gatesiegelooks.mjs?${Date.now()}`)).run()
 * Works on a scratch scene and a scratch market; puts the markets and battles back; never moves the clock and never
 * rolls a siege week.
 *   1. a siege at the town puts tents and camp smoke round the scene's edges
 *   2. a breach adds fallen stone in the wall
 *   3. the siege over, the camp goes
 * Result: Data/wodx-gate/gatesiegelooks-result.json.
 */
import {gate} from "./kit.mjs";

const MOD = "wodx-storyteller";

export async function run() {
  const G = gate("gatesiegelooks");
  const marketsBefore = foundry.utils.deepClone(game.settings.get(MOD, "markets"));
  const battlesBefore = foundry.utils.deepClone(game.settings.get(MOD, "battles"));
  const TL = () => game.modules.get(MOD)?.api?.upkeep?.townLooks;
  const KEY = "siege:gate-sg";
  const wait = async (f, ms = 6000) => { for ( let t = 0; t < ms && !f(); t += 100 ) await new Promise(r => setTimeout(r, 100)); return f(); };
  const B = await import("/modules/wodx-storyteller/scripts/battle-rules.mjs");
  const setSiege = async patch => {
    const s = foundry.utils.deepClone(game.settings.get(MOD, "battles") ?? {});
    const list = (s.list ?? []).filter(b => b.id !== "gatesiege");
    if ( patch ) list.push(B.normBattle({id: "gatesiege", name: "Gate siege", kind: "siege", place: "WoDX gate: Besieged", ...patch}));
    await game.settings.set(MOD, "battles", {...s, list});
  };
  try {
    const scene = await G.scene({width: 3000, height: 2000});
    const marks = () => { const m = TL().marksOf(scene, KEY); return [...m.layer.map(l => ({kind: l.kind})), ...m.own.map(d => d.flags[MOD].look)]; };
    await game.settings.set(MOD, "markets", {...marketsBefore, markets: [...(marketsBefore?.markets ?? []), {id: "gate-sg", name: "WoDX gate: Besieged", scenes: [scene.id], links: []}]});

    await G.step("1. a siege: camp and smoke", async () => {
      await setSiege({breach: 2, breached: false});
      await wait(() => marks().length === 9);
      const m = marks();
      G.ok("1. a siege: camp and smoke", m.length === 9 && m.filter(x => x.kind === "smoke").length === 3, {kinds: m.map(x => x.kind)});
    });

    await G.step("2. a breach: fallen stone", async () => {
      await setSiege({breach: 8, breached: true});
      await wait(() => marks().length === 11);
      const m = marks();
      G.ok("2. a breach: fallen stone", m.length === 11 && m.filter(x => x.kind === "rubble").length === 2, {kinds: m.map(x => x.kind)});
    });

    await G.step("3. over: the camp goes", async () => {
      await setSiege(null);
      await wait(() => marks().length === 0);
      G.ok("3. over: the camp goes", marks().length === 0, {left: marks().length});
    });
  } finally {
    try { await game.settings.set(MOD, "battles", battlesBefore); await game.settings.set(MOD, "markets", marketsBefore); } catch (e) { G.R.notes.push(`state back: ${e?.message ?? e}`); }
    return G.finish();
  }
}
