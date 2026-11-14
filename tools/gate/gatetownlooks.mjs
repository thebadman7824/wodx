/**
 * WoDX Storyteller gate: town events shown on the town's scenes (B4620), in Foundry, in rothenstein-wodx, as
 * Gamemaster Test:
 *   await (await import(`/wodx-gate/gatetownlooks.mjs?${Date.now()}`)).run()
 * Works on a scratch scene and a scratch market of its own; puts the markets setting back; never moves the clock.
 *   1. the setting is on and api.upkeep.townLooks is up
 *   2. a town fire (the wodxTown hook, as the town turn fires it) puts fire, smoke and burnt-out marks on the town's scene
 *   3. the marks lie inside the scene and carry the time they end
 *   4. endFor (the town card's Undo) takes them all back
 *   5. a flood puts its water in the low third of the scene
 * Result: Data/wodx-gate/gatetownlooks-result.json.
 */
import {gate} from "./kit.mjs";

const MOD = "wodx-storyteller";

export async function run() {
  const G = gate("gatetownlooks");
  const marketsBefore = foundry.utils.deepClone(game.settings.get(MOD, "markets"));
  const TL = () => game.modules.get(MOD)?.api?.upkeep?.townLooks;
  // what is on the scene: the shared layer's looks when it is there, else this module's own drawings
  const marks = scene => {
    const layer = game.modules.get("wodx-chronicle")?.api?.looks;
    const fromLayer = layer?.list ? (layer.list(scene) ?? []).filter(l => String(l.source ?? "").startsWith("town:gate-")) : [];
    const own = [...scene.drawings].filter(d => String(d.flags?.[MOD]?.look?.source ?? "").startsWith("town:gate-"));
    return {layer: fromLayer, own, n: fromLayer.length + own.length};
  };
  try {
    const scene = await G.scene({width: 3000, height: 2000});
    await game.settings.set(MOD, "markets", {...marketsBefore, markets: [...(marketsBefore?.markets ?? []),
      {id: "gate-tl", name: "WoDX gate: Looks", scenes: [scene.id], links: []}]});

    await G.step("1. setting and api", async () => {
      G.ok("1. setting and api", game.settings.get(MOD, "townLooks") === true && typeof TL()?.showTownEvent === "function", {on: game.settings.get(MOD, "townLooks")});
    });

    let t0 = game.time.worldTime;
    await G.step("2. a town fire shows", async () => {
      Hooks.callAll("wodxTown", {town: "gate-tl", kind: "fire", text: "Fire in the gate town.", big: true});
      // the hook's handler runs on its own; wait for it
      for ( let i = 0; i < 50 && marks(scene).n < 7; i++ ) await new Promise(r => setTimeout(r, 100));
      const m = marks(scene);
      const kinds = [...m.layer.map(l => l.kind), ...m.own.map(d => d.flags[MOD].look.kind)].sort();
      G.ok("2. a town fire shows", m.n === 7 && kinds.filter(k => k === "fire").length === 3 && kinds.includes("smoke") && kinds.filter(k => k === "rubble").length === 3, {kinds, layer: m.layer.length, own: m.own.length});
    });

    await G.step("3. inside the scene, timed", async () => {
      const r = scene.dimensions.sceneRect;
      const own = marks(scene).own;
      const inside = own.every(d => d.x + d.shape.width / 2 >= r.x && d.x + d.shape.width / 2 <= r.x + r.width && d.y + d.shape.height / 2 >= r.y && d.y + d.shape.height / 2 <= r.y + r.height);
      const timed = own.every(d => Number(d.flags[MOD].look.until) > t0);
      G.ok("3. inside the scene, timed", inside && timed, {inside, timed, own: own.length, layer: marks(scene).layer.length});
    });

    await G.step("4. undo takes them back", async () => {
      const n = await TL().endFor({towns: ["gate-tl"], since: t0});
      G.ok("4. undo takes them back", n >= 7 && marks(scene).n === 0, {ended: n, left: marks(scene).n});
    });

    await G.step("5. flood water lies low", async () => {
      await TL().showTownEvent({town: "gate-tl", kind: "flood"}, {seed: "gate"});
      const r = scene.dimensions.sceneRect;
      const own = marks(scene).own.filter(d => d.flags[MOD].look.kind === "flood");
      const layerFlood = marks(scene).layer.filter(l => l.kind === "flood");
      const low = own.every(d => d.y + d.shape.height / 2 >= r.y + r.height * 2 / 3 - 1) && layerFlood.every(l => !l.at || l.at.y >= r.y + r.height * 2 / 3 - 1);
      G.ok("5. flood water lies low", own.length + layerFlood.length === 3 && low, {own: own.length, layer: layerFlood.length, low});
      await TL().endFor({towns: ["gate-tl"], since: 0});
    });
  } finally {
    try { await game.settings.set(MOD, "markets", marketsBefore); } catch (e) { G.R.notes.push(`markets back: ${e?.message ?? e}`); }
    return G.finish();
  }
}
