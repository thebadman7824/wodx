/**
 * WoDX Storyteller gate: the sick show it (B4633) and places of power glow (B4635), in Foundry, in rothenstein-wodx,
 * as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatesickpower.mjs?${Date.now()}`)).run()
 * Works on a scratch scene and a scratch actor; puts the contagion and places of power state back; never moves the
 * clock and never runs a week.
 *   1. a character who has caught a sickness gets the Sick status and a pale cast
 *   2. getting better takes both away
 *   3. a Node on the scene glows, for the Storyteller, and dims when drained
 *   4. a balefire burns as a flame that follows its ranks
 * Result: Data/wodx-gate/gatesickpower-result.json.
 */
import {gate} from "./kit.mjs";

const MOD = "wodx-storyteller";

export async function run() {
  const G = gate("gatesickpower");
  const sickBefore = foundry.utils.deepClone(game.settings.get(MOD, "contagionState"));
  const powerBefore = foundry.utils.deepClone(game.settings.get(MOD, "powerState"));
  const api = () => game.modules.get(MOD)?.api?.upkeep;
  const TK = () => game.modules.get("wodx-chronicle")?.api?.tokenLooks;
  const wait = async (f, ms = 5000) => { for ( let t = 0; t < ms && !f(); t += 100 ) await new Promise(r => setTimeout(r, 100)); return f(); };
  try {
    const scene = await G.scene({width: 1500, height: 1000});
    const [a] = await G.make(Actor, [{name: "Gate Fever", type: "Mortal"}]);
    const [td] = await G.tokens(scene, [{actor: a, x: 2, y: 2}]);
    const setSick = async on => {
      const st = foundry.utils.deepClone(game.settings.get(MOD, "contagionState"));
      st.people = {...(st.people ?? {})};
      if ( on ) st.people[a.id] = {disease: "plague", since: game.time.worldTime, weeks: 0, held: 0, where: "the gate"}; else delete st.people[a.id];
      await game.settings.set(MOD, "contagionState", st);
    };
    const sickNow = () => a.statuses?.has?.("wodx-sick");

    await G.step("1. sick: status and pallor", async () => {
      await setSick(true);
      await wait(() => sickNow());
      const look = TK()?.looksOf?.(canvas.tokens.get(td.id));
      G.ok("1. sick: status and pallor", sickNow() && look?.tint === api().sickLooks.PALLOR.tint, {status: sickNow(), tint: look?.tint});
    });

    await G.step("2. better: both go", async () => {
      await setSick(false);
      await wait(() => !sickNow());
      G.ok("2. better: both go", !sickNow() && !TK()?.looksOf?.(canvas.tokens.get(td.id)), {status: sickNow()});
    });

    const setPlaces = list => game.settings.set(MOD, "powerState", {...(powerBefore ?? {}), list: [...((powerBefore?.list) ?? []), ...list]});
    await G.step("3. a Node glows and dims", async () => {
      await setPlaces([{id: "gatenode", kind: "node", name: "Gate Node", scene: scene.id, rating: 4, store: {quint: 4, tass: 0}}]);
      await wait(() => api().powerLooks.glowsNow().length === 1);
      const full = api().powerLooks.glowsNow()[0]?.strength ?? 0;
      await setPlaces([{id: "gatenode", kind: "node", name: "Gate Node", scene: scene.id, rating: 4, store: {quint: 0, tass: 0}}]);
      await wait(() => (api().powerLooks.glowsNow()[0]?.strength ?? 1) < full);
      const dry = api().powerLooks.glowsNow()[0]?.strength ?? 0;
      G.ok("3. a Node glows and dims", full > 0 && dry > 0 && dry < full, {full, dry});
    });

    await G.step("4. a balefire's flame", async () => {
      await setPlaces([{id: "gatefh", kind: "freehold", name: "Gate Freehold", scene: scene.id, base: 4, rating: 3}]);
      await wait(() => api().powerLooks.glowsNow().some(g => g.flame));
      const g = api().powerLooks.glowsNow().find(x => x.flame);
      G.ok("4. a balefire's flame", !!g && g.kind === "freehold", {g});
    });
  } finally {
    try { await game.settings.set(MOD, "contagionState", sickBefore); await game.settings.set(MOD, "powerState", powerBefore); } catch (e) { G.R.notes.push(`state back: ${e?.message ?? e}`); }
    return G.finish();
  }
}
