/**
 * WoDX Storyteller gate: hardship weather shown on the scene (B4627), in Foundry, in rothenstein-wodx, as Gamemaster
 * Test:
 *   await (await import(`/wodx-gate/gatehardshipsky.mjs?${Date.now()}`)).run()
 * Works on a scratch scene; never moves the clock.
 *   1. deadly weather set by hand puts a blizzard or a storm on the scene (or a glare in a heat)
 *   2. harsh weather softens it to snow or rain
 *   3. "No hardship" takes it off and hands the scene back to WoDX Atmosphere
 * Result: Data/wodx-gate/gatehardshipsky-result.json.
 */
import {gate} from "./kit.mjs";

const MOD = "wodx-storyteller";

export async function run() {
  const G = gate("gatehardshipsky");
  const HS = () => game.modules.get(MOD)?.api?.hardship;
  const glare = scene => [...scene.drawings].some(d => d.flags?.[MOD]?.look?.source === `hardship:${scene.id}`)
    || (game.modules.get("wodx-chronicle")?.api?.looks?.list?.(scene) ?? []).some(l => l.source === `hardship:${scene.id}`);
  try {
    const scene = await G.scene({width: 2000, height: 1500});

    await G.step("1. deadly shows", async () => {
      await HS().weather(scene, "deadly");
      G.ok("1. deadly shows", ["blizzard", "rainStorm"].includes(scene.weather) || glare(scene), {weather: scene.weather, flag: scene.flags?.[MOD]?.hardshipSky, glare: glare(scene)});
    });

    await G.step("2. harsh softens", async () => {
      await HS().weather(scene, "harsh");
      G.ok("2. harsh softens", ["snow", "rain"].includes(scene.weather) || glare(scene), {weather: scene.weather, glare: glare(scene)});
    });

    await G.step("3. none hands back", async () => {
      await HS().weather(scene, "none");
      G.ok("3. none hands back", !scene.flags?.[MOD]?.hardshipSky && !glare(scene),
        {weather: scene.weather, flag: scene.flags?.[MOD]?.hardshipSky ?? null, glare: glare(scene)});
    });
  } finally {
    return G.finish();
  }
}
