/**
 * WoDX Interactables gate: the trap, hazard and stock hooks have listeners the Storyteller sees (B6923), in Foundry,
 * in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateixhooks.mjs?${Date.now()}`)).run()
 * Makes its own scene, actor, token and tiles and removes them; fixes the d10 faces while it runs and puts them back.
 *   1. walking into a snare (every die a 2, no getting clear) marks the token Held; cutting the snare loose lifts it
 *   2. stepping onto a live wire marks the token Held; cutting the power lifts it
 *   3. a stock draw whispers the Storyteller a "Fresh stock" card naming the container and what came in
 * Result: Data/wodx-gate/gateixhooks-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-interactables";

export async function run() {
  const G = gate("gateixhooks", {stepTimeout: 45000});
  const uniform0 = CONFIG.Dice.randomUniform;
  const dice = async face => {
    for ( const u of [(face - 0.5) / 10, 1 - (face - 0.5) / 10] ) {
      CONFIG.Dice.randomUniform = () => u;
      if ( (await new Roll("1d10").evaluate()).dice[0].results[0].result === face ) return;
    }
    throw new Error(`could not fix the dice to ${face}`);
  };
  try {
    const IX = game.modules.get(MOD)?.api, K = game.modules.get("wodx-chronicle")?.api?.conditions;
    const scene = await G.scene({name: "WoDX gate: interactables hooks"});
    await scene.view();
    const [a] = await G.make(Actor, [{name: "Gate IxHooks Walker", type: "Mortal", ownership: {default: 3},
      system: {attributes: {dexterity: {value: 2, total: 2}, strength: {value: 2, total: 2}, stamina: {value: 2, total: 2}}}}]);
    const [ta] = await G.tokens(scene, [{actor: a, x: 2, y: 2, actorLink: true}]);
    await waitFor(() => !!ta?.object, 8000);
    const tileBy = tag => scene.tiles.find(t => t.flags?.[MOD]?.gate === tag);
    const walk = async (x, y) => {
      await ta.update({x, y}, {animate: false, teleport: true});
      await new Promise(r => setTimeout(r, 500));
    };
    const held = () => !!K?.hasCondition?.(game.actors.get(a.id), "held");

    await G.step("1. a snare marks the token Held until it is cut loose", async () => {
      await scene.createEmbeddedDocuments("Tile", [{x: 400, y: 200, width: 100, height: 100, texture: {src: "icons/svg/trap.svg"},
        flags: {[MOD]: {trap: true, trapKind: "snare", grade: "crude", found: true, gate: "snare"}}}]);
      await dice(2);
      await walk(400, 200);
      let caught = await waitFor(() => tileBy("snare")?.flags?.[MOD]?.holding === a.id, 3000);
      if ( !caught ) { await IX.onTokenMoved(ta, {x: 400, y: 200}); caught = await waitFor(() => tileBy("snare")?.flags?.[MOD]?.holding === a.id, 3000); }
      const on = await waitFor(held, 4000);
      await tileBy("snare").update({[`flags.${MOD}.holding`]: null});
      const off = await waitFor(() => !held(), 4000);
      G.ok("1. a snare marks the token Held until it is cut loose", caught && on && off, {caught, on, off});
    });

    await G.step("2. a live wire marks the token Held until the power is cut", async () => {
      await walk(200, 600);
      await scene.createEmbeddedDocuments("Tile", [{x: 300, y: 600, width: 100, height: 100, texture: {src: "icons/svg/lightning.svg"},
        flags: {[MOD]: {hazard: true, hazardKind: "shock", shock: "minor", gate: "wire"}}}]);
      await new Promise(r => setTimeout(r, 400));
      await walk(300, 600);
      let caught = await waitFor(() => tileBy("wire")?.flags?.[MOD]?.caught?.[a.id] === true, 3000);
      if ( !caught ) { await IX.onTokenMoved(ta, {x: 300, y: 600}); caught = await waitFor(() => tileBy("wire")?.flags?.[MOD]?.caught?.[a.id] === true, 3000); }
      const on = await waitFor(held, 4000);
      await tileBy("wire").update({[`flags.${MOD}.live`]: false});
      const off = await waitFor(() => !held(), 4000);
      G.ok("2. a live wire marks the token Held until the power is cut", caught && on && off, {caught, on, off});
    });

    await G.step("3. a stock draw brings the Storyteller a stock card", async () => {
      const [box] = await scene.createEmbeddedDocuments("Tile", [{x: 800, y: 200, width: 100, height: 100, texture: {src: "icons/svg/chest.svg"},
        flags: {[MOD]: {container: true, kind: "chest", title: "Gate IxHooks shelf", items: "", stock: "always: a gate loaf", restock: "week", gate: "box"}}}]);
      const t0 = Date.now();
      await IX.stock.draw(box);
      const card = () => game.messages.contents.find(m => m.timestamp >= t0 && m.getFlag?.(MOD, "stockCard"));
      const shown = await waitFor(() => !!card(), 6000);
      const text = card()?.content ?? "";
      G.ok("3. a stock draw brings the Storyteller a stock card", shown && /Gate IxHooks shelf/.test(text) && /a gate loaf/.test(text) && (card()?.whisper ?? []).includes(game.user.id),
        {text: text.slice(0, 200)});
      if ( card() ) await card().delete();
    });
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally {
    CONFIG.Dice.randomUniform = uniform0;
    return G.finish();
  }
}
