/**
 * The Golconda gate (Ben's Golconda Desk, B5090-B5099), rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gategolconda.mjs?${Date.now()}`)).run()
 * Makes its own scene and a vampire, and puts the settings back.
 *   1. the setting and the api
 *   2. granted Golconda: the sheet's maximum reads 10, and a Strength of 6 bought on the sheet stays
 *   3. the sun falls a step weaker (the card says so)
 *   4. the Road drops to 6: Golconda ends by itself, a card, and the Generation's limit (5) returns, Strength with it
 *   5. the long road's readiness: Humanity 7 and Conscience 4 for the Grant button
 *   6. every other WoDX module still answers
 * Result: Data/wodx-gate/gategolconda-result.json.
 */
import {gate, waitFor, newestMessage} from "./kit.mjs";

const MOD = "wodx-actions";

export async function run() {
  const G = gate("gategolconda");
  if ( game.world.id !== "rothenstein-wodx" ) { G.ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return G.save(); }
  let keep;
  try { keep = game.settings.get(MOD, "golcondaRules"); } catch (e) { keep = undefined; }
  const t0 = Date.now();
  try {
    const A = game.modules.get(MOD)?.api;
    const pod = game.modules.get("wodx-chronicle")?.api?.pod;
    await G.step("1. setting and api", async () => {
      G.ok("1. setting and api", keep !== undefined && !!A?.applySun && typeof pod?.golcondaReadiness === "function", {setting: keep});
    });
    if ( keep !== undefined ) await game.settings.set(MOD, "golcondaRules", true);
    const scene = await G.scene({activate: true});
    const v = await G.make(Actor, {name: "WoDX gate: the saint", type: "Vampire"});
    await v.update({"system.generation": 12, "system.advantages.path.permanent": 8, "system.advantages.virtues.conscience.permanent": 4});
    await G.tokens(scene, [{actor: v, x: 3, y: 3}]);

    // B6155: the sheet's own maximum (system.settings.*.defaultmaxvalue and each Attribute's max), and a bought dot that stays
    const caps = () => ({attributes: Number(v.system?.settings?.attributes?.defaultmaxvalue), abilities: Number(v.system?.settings?.abilities?.defaultmaxvalue),
      powers: Number(v.system?.settings?.powers?.defaultmaxvalue), strengthMax: Number(v.system?.attributes?.strength?.max)});
    await G.step("2. Traits to 10", async () => {
      await v.setFlag(MOD, "golconda", true);
      await waitFor(() => caps().abilities === 10 && caps().strengthMax === 10, 8000);
      const up = caps();
      await v.update({"system.attributes.strength.value": 6});
      await new Promise(r => setTimeout(r, 1500)); // the system's recompute writes back after the update
      const strength = Number(v.system?.attributes?.strength?.value);
      G.ok("2. Traits to 10", up.attributes === 10 && up.abilities === 10 && up.powers === 10 && up.strengthMax === 10 && strength === 6, {up, strength});
    });

    await G.step("3. the sun a step weaker", async () => {
      const since = Date.now();
      await A.applySun(v, {light: "direct", exposure: 1, turns: 1, noRotschreck: true});
      const card = await waitFor(() => newestMessage(since, m => /Golconda's grace/.test(m.content ?? "")), 6000);
      G.ok("3. the sun a step weaker", !!card, {});
      await v.update({"system.health.damage.aggravated": 0});
    });

    await G.step("4. falls from Golconda", async () => {
      const since = Date.now();
      await v.update({"system.advantages.path.permanent": 6});
      const card = await waitFor(() => newestMessage(since, m => /falls from Golconda/.test(m.content ?? "")), 6000);
      await waitFor(() => !v.getFlag(MOD, "golconda") && caps().strengthMax === 5, 8000);
      await new Promise(r => setTimeout(r, 800));
      G.ok("4. falls from Golconda", !!card && !v.getFlag(MOD, "golconda") && caps().abilities === 5 && caps().strengthMax === 5 && Number(v.system?.attributes?.strength?.value) === 5,
        {flag: v.getFlag(MOD, "golconda") ?? null, lost: v.getFlag(MOD, "golcondaLost") ?? null, caps: caps(), strength: v.system?.attributes?.strength?.value});
    });

    await G.step("5. readiness for the Grant", async () => {
      const low = pod.golcondaReadiness(v);
      await v.update({"system.advantages.path.permanent": 7});
      const ok = pod.golcondaReadiness(v);
      G.ok("5. readiness for the Grant", low.pure === false && ok.pure === true, {low, ok});
    });

    await G.step("6. other modules answer", async () => {
      const ids = ["wodx-chronicle", "wodx-npc", "wodx-combat", "wodx-storyteller", "wodx-senses", "wodx-otherworlds", "wodx-creation"].filter(id => game.modules.get(id)?.active);
      G.ok("6. other modules answer", ids.every(id => !!game.modules.get(id).api), {ids, ms: Date.now() - t0});
    });
  } catch (e) {
    G.R.errors.push(e?.message ?? String(e));
  } finally {
    if ( keep !== undefined ) { try { await game.settings.set(MOD, "golcondaRules", keep); } catch (e) { /* gone */ } }
    return G.finish();
  }
}
