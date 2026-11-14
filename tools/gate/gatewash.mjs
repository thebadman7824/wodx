/**
 * WoDX Library gate: washing, grooming and cosmetics (B3909), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatewash.mjs?${Date.now()}`)).run()
 * Makes its own actors and removes them; never moves the clock.
 *   1. a lethal wound marks the character Bloody (a token status), and the look shows blood on them
 *   2. washing with a bar of soap takes the blood off and leaves them well groomed for the night
 *   3. the look: someone of standing meets the groomed character a step warmer ("well groomed" in the seed)
 * Result: Data/wodx-gate/gatewash-result.json.
 */
import {gate} from "./kit.mjs";

const wait = ms => new Promise(r => setTimeout(r, ms));
const settle = async (fn, ms = 4000) => { const t = Date.now(); while ( Date.now() - t < ms ) { if ( await fn() ) return true; await wait(150); } return !!(await fn()); };

export async function run() {
  const G = gate("gatewash");
  try {
    const lib = game.modules.get("wodx-library")?.api;
    const C = game.modules.get("wodx-chronicle")?.api?.conditions;
    const [a] = await G.make(Actor, [{name: "Gate Wash Traveller", type: "Mortal"}]);
    const [soap] = await a.createEmbeddedDocuments("Item", [{name: "a bar of scented soap", type: "Item"}]);
    const bloody = () => !!C?.hasCondition?.(a, "bloody");

    await G.step("1. a wound marks them bloody", async () => {
      const lethal = Number(a.system?.health?.damage?.lethal) || 0;
      await a.update({"system.health.damage.lethal": lethal + 1});
      await settle(() => bloody());
      const look = lib.look.of?.(a) ?? null;
      G.ok("1. a wound marks them bloody", bloody() && (look?.condition ?? []).includes("bloody"), {bloody: bloody(), condition: look?.condition ?? null});
    });

    await G.step("2. soap washes it off", async () => {
      await lib.use.run(soap, "wash", a);
      await settle(() => !bloody());
      const groomed = a.flags?.["wodx-library"]?.groomed;
      G.ok("2. soap washes it off", !bloody() && Number.isFinite(groomed), {bloody: bloody(), groomed});
    });

    await G.step("3. well groomed at a first meeting", async () => {
      const look = lib.look.of(a);
      const seed = lib.look.seed(look, {station: 3, mortal: true});
      G.ok("3. well groomed at a first meeting", (look?.condition ?? []).includes("groomed") && seed.names.includes("well groomed"), {condition: look?.condition, seed});
    });
  } finally { return G.finish(); }
}
