/**
 * WoDX Library gate: seeds, fire-lighters and timepieces (B3911), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gategadgets.mjs?${Date.now()}`)).run()
 * Makes its own scene, actor and token and removes them. Moves the clock past the planting's days and the kit puts
 * it back after.
 *   1. seed potatoes planted are growing; once the clock passes their days they are harvested by themselves: 8
 *      potatoes in Possessions, no second Use (B6177)
 *   2. a match lights the tallow candle the character carries (the token carries a light)
 *   3. a wristwatch tells the hour on a card to its owner
 * Result: Data/wodx-gate/gategadgets-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const wait = ms => new Promise(r => setTimeout(r, ms));

export async function run() {
  const G = gate("gategadgets");
  try {
    const lib = game.modules.get("wodx-library")?.api;
    const scene = await G.scene();
    const [a] = await G.make(Actor, [{name: "Gate Gadgets Gardener", type: "Mortal"}]);
    const [tok] = await G.tokens(scene, [{actor: a, x: 2, y: 2, actorLink: true}]);
    const [seeds, match, candle, watch] = await a.createEmbeddedDocuments("Item", [{name: "seed potatoes", type: "Item"},
      {name: "a match", type: "Item"}, {name: "a tallow candle", type: "Item"}, {name: "a wristwatch", type: "Item"}]);

    await G.step("1. plant and harvest", async () => {
      await lib.use.run(seeds, "plant", a);
      const growing = !!a.items.get(seeds.id)?.flags?.["wodx-library"]?.planted;
      const days = (await import("/modules/wodx-library/scripts/gadget-rules.mjs")).cropOf("seed potatoes")?.days ?? 101;
      // the clock moves past the days; the Storyteller's client harvests on the time change
      await game.time.advance(days * 86400 + 3600);
      await waitFor(() => !a.items.get(seeds.id) && a.items.some(i => i.name === "potatoes"), 8000);
      const crop = a.items.find(i => i.name === "potatoes");
      G.ok("1. plant and harvest", growing && !a.items.get(seeds.id) && Number(crop?.flags?.["wodx-sheets"]?.qty) === 8, {growing, days, gone: !a.items.get(seeds.id), qty: crop?.flags?.["wodx-sheets"]?.qty ?? null});
    });

    await G.step("2. a match lights the candle", async () => {
      await lib.use.run(match, "strike", a);
      await wait(600);
      const td = (tok.document ?? tok);
      const carried = scene.tokens.get(td.id)?.flags?.["wodx-interactables"]?.carried ?? null;
      G.ok("2. a match lights the candle", !!carried, {carried, candle: !!a.items.get(candle.id)});
    });

    await G.step("3. a wristwatch tells the time", async () => {
      const t0 = Date.now();
      await lib.use.run(watch, "time", a);
      await wait(300);
      const m = game.messages.contents.filter(x => x.timestamp >= t0).find(x => /looks at a wristwatch/.test(x.content));
      G.ok("3. a wristwatch tells the time", !!m && /It is \d\d:\d\d/.test(m.content) && (m.whisper?.length ?? 0) > 0, {card: !!m});
    });
  } finally { return G.finish(); }
}
