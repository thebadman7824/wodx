/**
 * WoDX Library, Storyteller and Interactables gate: household things and tack on the road (B3905 to B3907), in
 * Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateroad.mjs?${Date.now()}`)).run()
 * Makes its own scratch scene, actors and tokens and removes them; never moves the clock.
 *   1. the Library's api.house reads a carried blanket and saddle
 *   2. hardship in harsh weather: the weather roll for the one with a blanket says it is one easier (hardship is for
 *      player characters, so the rider is given to every player for the step; the world needs one player user)
 *   3. a chase turn: a rider on horseback with a saddle and no bridle rolls at +1 ("no bridle +1" on the Storyteller card)
 * Result: Data/wodx-gate/gateroad-result.json.
 */
import {gate} from "./kit.mjs";

const wait = ms => new Promise(r => setTimeout(r, ms));
const body = name => ({name, type: "Mortal", system: {attributes: {stamina: {value: 2}, dexterity: {value: 3}}, abilities: {athletics: {value: 2}}}});

export async function run() {
  const G = gate("gateroad");
  try {
    const lib = game.modules.get("wodx-library")?.api;
    const ST = game.modules.get("wodx-storyteller")?.api?.hardship;
    const CH = game.modules.get("wodx-interactables")?.api?.chase;
    const scene = await G.scene();
    const [a, b] = await G.make(Actor, [body("Gate Road Rider"), body("Gate Road Runner")]);
    await a.createEmbeddedDocuments("Item", [{name: "a woollen blanket", type: "Item"}, {name: "a saddle", type: "Item"}]);
    const [ta, tb] = await G.tokens(scene, [{actor: a, x: 2, y: 2}, {actor: b, x: 8, y: 2}]);

    await G.step("1. the road kit", async () => {
      const k = lib?.house?.roadKit?.([...a.items]);
      G.ok("1. the road kit", !!k?.cold && !!k?.saddle && !k?.bridle, {kit: k});
    });

    await G.step("2. a blanket in harsh weather", async () => {
      // hardship is for player characters: every player owns the scratch rider for this step
      await a.update({"ownership.default": CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER});
      const pc = !!a.hasPlayerOwner;
      await ST.weather(scene, "harsh");
      const t = game.time.worldTime;
      const x = ST.rules.normNeeds({}, t);
      x.exposed = t - 2 * 3600;
      await a.setFlag("wodx-storyteller", "needs", x);
      const out = await ST.tick({force: true, actorIds: [a.id]});
      const lines = (out ?? []).find(r => r.actor === a.id)?.lines ?? [];
      G.ok("2. a blanket in harsh weather", lines.some(l => /a woollen blanket against the cold, -1 difficulty/.test(l)), {pc, players: game.users.filter(u => !u.isGM).length, lines});
    });

    await G.step("3. a chase without a bridle", async () => {
      const st = await CH.start(scene, {quarry: (tb.document ?? tb).id, pursuers: [(ta.document ?? ta).id], ground: "open", lead: 30});
      const next = structuredClone(st ?? scene.getFlag("wodx-interactables", "chase"));
      next.pursuers[0].way = "horse";
      const t0 = Date.now();
      await CH.rollTurn(scene, next);
      await wait(400);
      const card = game.messages.contents.filter(m => m.timestamp >= t0).find(m => m.flags?.["wodx-interactables"]?.chaseTurn);
      await CH.end(scene);
      G.ok("3. a chase without a bridle", !!card && /no bridle \+1/.test(card.content), {card: !!card});
    });
  } finally { return G.finish(); }
}
