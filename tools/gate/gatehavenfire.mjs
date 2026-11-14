/**
 * WoDX Storyteller gate: a rival's fire at a haven shown and felt on the map (B4626), in Foundry, in rothenstein-wodx,
 * as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatehavenfire.mjs?${Date.now()}`)).run()
 * Works on a scratch scene and a scratch actor; never moves the clock.
 *   1. the fire is a WoDX Actions fire area on the scene, with its drawing for the players
 *   2. smoke over the scene and three scorch marks, timed
 *   3. a token walking into the fire takes the burn (the area records it)
 * Result: Data/wodx-gate/gatehavenfire-result.json.
 */
import {gate} from "./kit.mjs";

const MOD = "wodx-storyteller", ACT = "wodx-actions";

export async function run() {
  const G = gate("gatehavenfire");
  const TL = () => game.modules.get(MOD)?.api?.upkeep?.townLooks;
  const wait = async (f, ms = 6000) => { for ( let t = 0; t < ms && !f(); t += 100 ) await new Promise(r => setTimeout(r, 100)); return f(); };
  try {
    const scene = await G.scene({width: 2000, height: 1500});
    const [a] = await G.make(Actor, [{name: "Gate Fire Walker", type: "Mortal"}]);
    const [tk] = await G.tokens(scene, [{actor: a, x: 1, y: 1}]);
    let res = null;

    await G.step("1. a fire area", async () => {
      res = await TL().havenFire(scene, {who: "Gate Rival"});
      const region = [...scene.regions].find(r => r.flags?.[ACT]?.effectArea?.item?.out?.world === "blaze");
      const drawing = region && scene.drawings.get(region.flags[ACT].effectArea.drawing);
      G.ok("1. a fire area", !!region && !!drawing, {area: res?.area, region: region?.id, drawing: !!drawing});
    });

    await G.step("2. smoke and scorch", async () => {
      const own = [...scene.drawings].filter(d => d.flags?.[MOD]?.look?.source === `haven:${scene.id}`);
      const layer = game.modules.get("wodx-chronicle")?.api?.looks;
      const fromLayer = layer?.list ? (layer.list(scene) ?? []).filter(l => l.source === `haven:${scene.id}`) : [];
      const kinds = [...own.map(d => d.flags[MOD].look.kind), ...fromLayer.map(l => l.kind)];
      G.ok("2. smoke and scorch", res.marks === 4 && kinds.filter(k => k === "rubble").length === 3 && kinds.includes("smoke") && own.every(d => d.flags[MOD].look.until > game.time.worldTime), {kinds});
    });

    await G.step("3. walking in burns", async () => {
      const region = [...scene.regions].find(r => r.flags?.[ACT]?.effectArea?.item?.out?.world === "blaze");
      const ea = region.flags[ACT].effectArea, g = scene.grid.size;
      await tk.update({x: ea.x - g / 2, y: ea.y - g / 2}, {animate: false, teleport: true});
      await wait(() => (scene.regions.get(region.id)?.flags?.[ACT]?.effectArea?.applied ?? []).includes(tk.id));
      G.ok("3. walking in burns", (scene.regions.get(region.id)?.flags?.[ACT]?.effectArea?.applied ?? []).includes(tk.id), {applied: scene.regions.get(region.id)?.flags?.[ACT]?.effectArea?.applied});
    });
  } finally {
    return G.finish();
  }
}
