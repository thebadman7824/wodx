/**
 * WoDX Storyteller gate: a town's prosperity and unrest on its scenes (B4629), in Foundry, in rothenstein-wodx, as
 * Gamemaster Test:
 *   await (await import(`/wodx-gate/gateprosperlooks.mjs?${Date.now()}`)).run()
 * Works on a scratch scene and a scratch market and town; puts the markets and towns back; never moves the clock and
 * never runs a town turn.
 *   1. a rich town lights its windows
 *   2. a poor, angry town has beggars and words on the walls, and the windows go dark
 *   3. a town getting by shows nothing
 * Result: Data/wodx-gate/gateprosperlooks-result.json.
 */
import {gate} from "./kit.mjs";

const MOD = "wodx-storyteller";

export async function run() {
  const G = gate("gateprosperlooks");
  const marketsBefore = foundry.utils.deepClone(game.settings.get(MOD, "markets"));
  const townsBefore = foundry.utils.deepClone(game.settings.get(MOD, "townState"));
  const TL = () => game.modules.get(MOD)?.api?.upkeep?.townLooks;
  const KEY = "prosper:gate-pr";
  const wait = async (f, ms = 6000) => { for ( let t = 0; t < ms && !f(); t += 100 ) await new Promise(r => setTimeout(r, 100)); return f(); };
  const setTown = async (prosperity, unrest) => {
    const st = foundry.utils.deepClone(game.settings.get(MOD, "townState") ?? {});
    st.towns = {...(st.towns ?? {}), "gate-pr": {id: "gate-pr", people: 2000, prosperity, unrest}};
    await game.settings.set(MOD, "townState", st);
  };
  try {
    const scene = await G.scene({width: 3000, height: 2000});
    const marks = () => { const m = TL().marksOf(scene, KEY); return [...m.layer.map(l => ({kind: l.kind})), ...m.own.map(d => ({...d.flags[MOD].look, text: d.text}))]; };
    await game.settings.set(MOD, "markets", {...marketsBefore, markets: [...(marketsBefore?.markets ?? []), {id: "gate-pr", name: "WoDX gate: Prosper", scenes: [scene.id], links: []}]});

    await G.step("1. rich: lit windows", async () => {
      await setTown(5, 1);
      await wait(() => marks().length === 10);
      G.ok("1. rich: lit windows", marks().length === 10 && marks().every(x => x.mark === "window" || !x.mark), {n: marks().length});
    });

    await G.step("2. poor and angry", async () => {
      await setTown(0, 5);
      await wait(() => marks().length === 12);
      const m = marks();
      G.ok("2. poor and angry", m.length === 12 && m.filter(x => x.mark === "beggar").length === 6 && !m.some(x => x.mark === "window"), {marks: m.map(x => x.mark ?? x.text)});
    });

    await G.step("3. getting by: nothing", async () => {
      await setTown(3, 1);
      await wait(() => marks().length === 0);
      G.ok("3. getting by: nothing", marks().length === 0, {left: marks().length});
    });
  } finally {
    try { await game.settings.set(MOD, "townState", townsBefore); await game.settings.set(MOD, "markets", marketsBefore); } catch (e) { G.R.notes.push(`state back: ${e?.message ?? e}`); }
    return G.finish();
  }
}
