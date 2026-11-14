/**
 * WoDX Storyteller gate: the night's people put on a scene and story-aid things made real (B3924), in Foundry, in
 * rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatenightplace.mjs?${Date.now()}`)).run()
 * Works on a scratch scene of its own; removes the people, items and cards it makes; never moves the clock.
 *   1. the api is up (night.place, night.placeCard, night.placeFrom, aid.makeItem) with WoDX Creation and Library
 *   2. a relic aid makes a real item with a True Faith prayer, in the Items folder "WoDX story aids"
 *   3. a talisman aid has charges, a fetish aid is a Fetish item with the aid's spirit
 *   4. "Three soldiers and a merchant" puts four hidden tokens on the scene, people made by WoDX Creation
 *   5. the night card has a button per physical encounter, and pressing one marks it done and places the people
 * Result: Data/wodx-gate/gatenightplace-result.json.
 */
import {gate} from "./kit.mjs";

export async function run() {
  const G = gate("gatenightplace");
  const actors = new Set(), items = new Set(), msgs = new Set();
  const ST = () => game.modules.get("wodx-storyteller")?.api;
  try {
    const scene = await G.scene();

    await G.step("1. api", async () => {
      const S = ST();
      G.ok("1. api", typeof S?.night?.place === "function" && typeof S?.night?.placeCard === "function" && typeof S?.aid?.makeItem === "function"
        && !!game.modules.get("wodx-creation")?.api?.people?.generate && !!game.modules.get("wodx-library")?.api?.wonders?.kitFor,
        {place: typeof S?.night?.place, makeItem: typeof S?.aid?.makeItem});
    });

    await G.step("2. relic item", async () => {
      const it = await ST().aid.makeItem({kind: "relic", rating: 2, text: "a finger bone of a local saint in a silver reliquary", count: 0, nonce: 0});
      if ( it ) items.add(it.id);
      const w = it?.flags?.["wodx-library"]?.wonder;
      G.ok("2. relic item", !!it && w?.relic?.rating === 2 && (w.powers ?? []).length > 0 && it.folder?.name === "WoDX story aids",
        {name: it?.name, rating: w?.relic?.rating, powers: (w?.powers ?? []).map(p => p.id), folder: it?.folder?.name});
    });

    await G.step("3. talisman and fetish", async () => {
      const t = await ST().aid.makeItem({kind: "talisman", rating: 3, text: "a brass astrolabe that sometimes turns by itself", count: 1, nonce: 0});
      const f = await ST().aid.makeItem({kind: "fetish", rating: 1, text: "a river stone that holds a spirit of the current", count: 2, nonce: 0});
      for ( const x of [t, f] ) if ( x ) items.add(x.id);
      const tw = t?.flags?.["wodx-library"]?.wonder, fw = f?.flags?.["wodx-library"]?.wonder;
      G.ok("3. talisman and fetish", tw?.uses?.value === 3 && f?.type === "Fetish" && /spirit of the current/.test(fw?.spirit ?? ""),
        {uses: tw?.uses, fetish: f?.type, spirit: fw?.spirit});
    });

    await G.step("4. people placed", async () => {
      const before = scene.tokens.size;
      const made = await ST().night.place("Three soldiers and a merchant argue at the gate.", {key: `gate${G.run}`, x: 300, y: 300});
      for ( const t of made ) if ( t.actorId ) actors.add(t.actorId);
      const hidden = made.filter(t => t.hidden).length;
      G.ok("4. people placed", made.length === 4 && hidden === 4 && scene.tokens.size === before + 4,
        {made: made.length, hidden, names: made.map(t => t.name)});
    });

    await G.step("5. night card", async () => {
      const msg = await ST().night.placeCard({jdn: 1, nonce: 0, encounters: [
        {layer: "physical", label: "In town", text: "A beggar by the church steps knows more than a beggar should."},
        {layer: "shadowlands", label: "The Shadowlands", text: "A wraith watches."}]});
      if ( msg ) msgs.add(msg.id);
      const buttons = (msg?.content.match(/wst-night-place/g) ?? []).length;
      const before = scene.tokens.size;
      const made = msg ? await ST().night.placeFrom(msg, 0) : [];
      for ( const t of made ?? [] ) if ( t.actorId ) actors.add(t.actorId);
      const done = game.messages.get(msg?.id)?.flags?.["wodx-storyteller"]?.nightPlace?.done ?? [];
      G.ok("5. night card", buttons === 1 && done.includes(0) && scene.tokens.size === before + 1, {buttons, done, placed: scene.tokens.size - before});
    });
  } finally {
    try {
      // the Creation card for each batch, and the people and items
      for ( const m of game.messages.filter(m => /New people/.test(m.content ?? "") && [...actors].some(id => (m.content ?? "").includes(id))) ) msgs.add(m.id);
      if ( actors.size ) await Actor.deleteDocuments([...actors].filter(id => game.actors.get(id)));
      if ( items.size ) await Item.deleteDocuments([...items].filter(id => game.items.get(id)));
      if ( msgs.size ) await ChatMessage.deleteDocuments([...msgs].filter(id => game.messages.get(id)));
    } catch (e) { G.R.notes.push(`cleanup: ${e?.message ?? e}`); }
    return G.finish();
  }
}
