/**
 * WoDX Storyteller gate: sickness in a town shown on its scenes (B4622), in Foundry, in rothenstein-wodx, as
 * Gamemaster Test:
 *   await (await import(`/wodx-gate/gatesicklooks.mjs?${Date.now()}`)).run()
 * Works on a scratch scene and a scratch market; puts the markets and contagion state back; never moves the clock
 * and never runs a contagion week.
 *   1. a town arriving at plague shows one cross on a door
 *   2. the same town at the height shows six crosses, the cart for the dead and the low fog
 *   3. the same state again draws nothing new
 *   4. the outbreak over, every mark goes
 * Result: Data/wodx-gate/gatesicklooks-result.json.
 */
import {gate} from "./kit.mjs";

const MOD = "wodx-storyteller";

export async function run() {
  const G = gate("gatesicklooks");
  const marketsBefore = foundry.utils.deepClone(game.settings.get(MOD, "markets"));
  const stateBefore = foundry.utils.deepClone(game.settings.get(MOD, "contagionState"));
  const TL = () => game.modules.get(MOD)?.api?.upkeep?.townLooks;
  const KEY = "sick:gate-sl";
  const wait = async (f, ms = 6000) => { for ( let t = 0; t < ms && !f(); t += 100 ) await new Promise(r => setTimeout(r, 100)); return f(); };
  const setWeek = async week => {
    const st = foundry.utils.deepClone(game.settings.get(MOD, "contagionState"));
    st.towns = {...(st.towns ?? {})};
    if ( week === null ) delete st.towns["gate-sl"];
    else st.towns["gate-sl"] = {market: "gate-sl", disease: "plague", week, weeks: 26, start: 0, attack: 0.3, death: 0.5, sick: 0.1, dead: 0.05, source: "gate"};
    await game.settings.set(MOD, "contagionState", st);
  };
  try {
    const scene = await G.scene({width: 3000, height: 2000});
    const marks = () => { const m = TL().marksOf(scene, KEY); return [...m.layer.map(l => ({kind: l.kind})), ...m.own.map(d => d.flags[MOD].look)]; };
    await game.settings.set(MOD, "markets", {...marketsBefore, markets: [...(marketsBefore?.markets ?? []), {id: "gate-sl", name: "WoDX gate: Sick", scenes: [scene.id], links: []}]});

    await G.step("1. arriving: one cross", async () => {
      await setWeek(3);
      await wait(() => marks().length === 1);
      const m = marks();
      G.ok("1. arriving: one cross", m.length === 1 && m[0].kind === "plague", {m});
    });

    await G.step("2. height: crosses, cart, fog", async () => {
      await setWeek(10);
      await wait(() => marks().length === 8);
      const m = marks();
      G.ok("2. height: crosses, cart, fog", m.length === 8 && m.filter(x => x.kind === "fog").length === 1 && m.filter(x => x.kind === "plague").length === 7,
        {kinds: m.map(x => x.kind), marks: m.map(x => x.mark ?? null)});
    });

    await G.step("3. same state, nothing new", async () => {
      const ids = [...scene.drawings].map(d => d.id).sort().join();
      const n = await TL().syncSick();
      G.ok("3. same state, nothing new", n >= 8 && [...scene.drawings].map(d => d.id).sort().join() === ids, {n});
    });

    await G.step("4. over: all gone", async () => {
      await setWeek(null);
      await wait(() => marks().length === 0);
      G.ok("4. over: all gone", marks().length === 0, {left: marks().length});
    });
  } finally {
    try { await game.settings.set(MOD, "contagionState", stateBefore); await game.settings.set(MOD, "markets", marketsBefore); } catch (e) { G.R.notes.push(`state back: ${e?.message ?? e}`); }
    return G.finish();
  }
}
