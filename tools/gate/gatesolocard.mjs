/**
 * The Lone Chronicle, step 3, card scenes (B6040 to B6044): places with no map, in rothenstein-wodx (the testing world),
 * as Gamemaster Test in one browser:
 *   await (await import(`/wodx-gate/gatesolocard.mjs?${Date.now()}`)).run()
 * The switch stays as it is: the seat's parts are called straight, as the seat would call them. The world clock does
 * not move (the trip and the look move only the gate character's own clock).
 *   1. the module and its new parts
 *   2. the list: towns of the country map that stand in the year, none of them with a scene of its own
 *   3. going there: a card scene is made for the town, set at the town on the country map, the character's token
 *      stands below the card, and the card names the town and the year; the player gets the same words
 *   4. the Travel window lists the card scene among the places
 *   5. looking around: half an hour on the character's clock, the card is still there, and anyone who came stands
 *      in plain sight on the card scene
 *   6. going again makes no second card scene
 * Result: Data/wodx-gate/gatesolocard-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

export async function run() {
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const G = gate("gatesolocard");
  const MOD = "wodx-solo", ST = "wodx-storyteller";
  for ( let i = 0; i < 120 && !(game.modules.get(MOD)?.api?.card && game.modules.get(ST)?.api?.travel); i++ ) await new Promise(r => setTimeout(r, 250));
  const S = game.modules.get(MOD)?.api, T = game.modules.get(ST)?.api;
  const C = S?.card;
  const scenes0 = new Set(game.scenes.map(s => s.id));
  const msgs0 = new Set(game.messages.map(m => m.id));
  const keepPersonal = foundry.utils.deepClone(game.settings.get(ST, "personal") ?? {});
  try {
    const [actor] = await G.make(Actor, [{name: "WoDX gate: lone traveller", type: "Mortal"}]);
    const start = await G.scene({name: "WoDX gate: solo card start", width: 2000, height: 1500, activate: true});
    await waitFor(() => canvas?.scene?.id === start.id, 8000);
    await start.createEmbeddedDocuments("Token", [(await actor.getTokenDocument({x: 1000, y: 700})).toObject()]);
    let list = null, town = null, card = null;

    await G.step("1. the module", async () => {
      G.ok("1. the module", !!C?.places && !!C?.go && !!C?.look && !!C?.scene && !!C?.rules?.cardLines
        && (S.rules?.PANEL ?? []).some(b => b.id === "places"), {version: game.modules.get(MOD)?.version});
    });
    await G.step("2. the list", async () => {
      list = await C.places(game.user.id, {actorId: actor.id, send: false});
      const rows = list?.rows ?? [];
      const year = T.tripContext(T.personalTime(actor.id), null)?.year ?? 0;
      const standing = rows.every(r => T.country.townStands(r.id, year));
      const mapped = game.scenes.filter(s => !s.flags?.[MOD]?.card && C.rules.sceneTown(s.flags?.[ST]?.travel)).map(s => C.rules.sceneTown(s.flags[ST].travel));
      town = rows.find(r => !game.scenes.some(s => s.flags?.[MOD]?.card === r.id))?.id ?? rows[0]?.id ?? null;
      G.ok("2. the list", rows.length > 0 && standing && !rows.some(r => mapped.includes(r.id)) && !list.onCard && !!town, {count: rows.length, year, town});
    });
    let cardId = null;
    await G.step("3. going there", async () => {
      const out = await C.go(game.user.id, {town, actorId: actor.id});
      const sc = game.scenes.get(out?.sceneId);
      cardId = sc?.id ?? null;
      const tok = sc ? sc.tokens.find(t => t.actorId === actor.id) : null;
      const drawing = sc ? sc.drawings.find(d => d.flags?.[MOD]?.card) : null;
      const name = T.country.townName(town);
      const pad = sc?.dimensions ? {x: sc.dimensions.sceneX, y: sc.dimensions.sceneY} : {x: 0, y: 0};
      const said = game.messages.filter(m => !msgs0.has(m.id) && m.flags?.[MOD]?.panel).some(m => (m.content ?? "").includes(`<h3>${name}</h3>`) || (m.content ?? "").includes(name));
      card = out?.card;
      G.ok("3. going there", !!out?.ok && !out.waiting && sc?.flags?.[MOD]?.card === town && C.rules.sceneTown(sc.flags?.[ST]?.travel) === town
        && !!tok && tok.x === pad.x + C.rules.CARD_ARRIVE.x && tok.y === pad.y + C.rules.CARD_ARRIVE.y
        && !!drawing && (drawing.text ?? "").startsWith(name.toUpperCase()) && /The year \d+/.test(drawing.text ?? "") && said,
        {scene: sc?.name, lines: card?.lines, token: tok ? [tok.x, tok.y] : null});
    });
    await G.step("4. the Travel window lists it", async () => {
      const places = T.travelPlaces();
      G.ok("4. the Travel window lists it", places.some(p => p.id === cardId), {places: places.length});
    });
    await G.step("5. looking around", async () => {
      const sc = game.scenes.get(cardId);
      const before = new Set(sc.tokens.map(t => t.id));
      const t0 = T.personalTime(actor.id);
      const out = await C.look(game.user.id, {actorId: actor.id});
      const t1 = T.personalTime(actor.id);
      const fresh = game.scenes.get(cardId).tokens.filter(t => !before.has(t.id));
      const still = game.scenes.get(cardId).drawings.some(d => d.flags?.[MOD]?.card);
      G.ok("5. looking around", out?.minutes === 30 && Math.round(t1 - t0) === 1800 && still && fresh.every(t => !t.hidden),
        {came: fresh.map(t => t.name), moved: t1 - t0});
    });
    await G.step("6. no second card scene", async () => {
      await start.view();
      const out = await C.go(game.user.id, {town, actorId: actor.id});
      const cards = game.scenes.filter(s => s.flags?.[MOD]?.card === town);
      G.ok("6. no second card scene", !!out?.ok && cards.length === 1 && out.sceneId === cardId, {cards: cards.length});
    });
  } finally {
    try { await game.settings.set(ST, "personal", keepPersonal); } catch (e) { /* kept */ }
    const made = game.scenes.filter(s => !scenes0.has(s.id) && s.flags?.[MOD]?.card).map(s => s.id);
    if ( made.length ) await Scene.deleteDocuments(made);
    const mine = game.messages.filter(m => !msgs0.has(m.id) && (m.flags?.[MOD] || m.flags?.[ST])).map(m => m.id);
    if ( mine.length ) await ChatMessage.deleteDocuments(mine);
    return G.finish();
  }
}
