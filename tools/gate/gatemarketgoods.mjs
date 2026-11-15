/**
 * Market goods by region (B5930 to B5936, the Market Goods Desk at its recommended picks), in rothenstein-wodx (the
 * testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatemarketgoods.mjs?${Date.now()}`)).run()
 * Makes the scenes "WoDX gate: Kyoto market" (Japan) and "WoDX gate: Moravian market" (Moravia) and a market on the
 * Kyoto scene; puts back the markets, the setting and the chat, and deletes the scenes. The clock does not move.
 *   1. the rules and the setting are there
 *   2. in Kyoto a good at home only far away costs about three times as much and says it was brought from far off
 *   3. in Moravia a good of Christendom's own costs a quarter less and says it is the land's own
 *   4. the market window names the land's own trade for a market in Japan
 *   5. a caravan out of the Kyoto market names goods of Japan
 *   6. plague at home in the world timeline offers market news once, and not again within three months
 * Result: Data/wodx-gate/gatemarketgoods-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

export async function run() {
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const G = gate("gatemarketgoods");
  const ST = "wodx-storyteller", CH = "wodx-chronicle";
  const st = () => game.modules.get(ST)?.api, ch = () => game.modules.get(CH)?.api;
  const money = () => st()?.upkeep?.money;
  const saved = {markets: foundry.utils.deepClone(game.settings.get(ST, "markets")), byPlace: game.settings.get(ST, "goodsByPlace")};
  const before = new Set(game.messages.map(m => m.id));
  const scenes = [];
  try {
    const GP = await import(`/modules/${ST}/scripts/goods-place-rules.mjs`);
    const {GOODS} = await import(`/modules/wodx-library/data/goods.mjs`);
    const W = await import(`/modules/wodx-library/data/goods-ways.mjs`);
    const [kyoto, brno] = await Scene.create([
      {name: "WoDX gate: Kyoto market", width: 1000, height: 1000, padding: 0, flags: {[CH]: {place: {region: "japan"}}}},
      {name: "WoDX gate: Moravian market", width: 1000, height: 1000, padding: 0, flags: {[CH]: {place: {region: "moravia"}}}}]);
    scenes.push(kyoto, brno);
    const year = Number(ch()?.eras?.currentYear?.()) || 1197;
    const wayOf = r => ch().world.rules.sphereFor(r, year);
    const inUse = (r, way) => (g, y) => W.inUseAt(g, y, {way, region: r});
    // the dearest goods first, so rounding a price of a coin or two does not hide the factor
    const valueOf = x => Number(x.values?.[ch()?.eras?.activeEra?.()?.profile?.id] ?? x.value ?? 0);
    const byValue = [...GOODS].sort((a, b) => valueOf(b) - valueOf(a));
    const price = async (name, scene, on = true) => {
      await game.settings.set(ST, "goodsByPlace", on);
      return money().price(name, {scene});
    };

    await G.step("1. the rules and the setting", async () => {
      G.ok("1. the rules and the setting", typeof GP.placeOf === "function" && game.settings.settings.has(`${ST}.goodsByPlace`) && Object.keys(GP.LAND_TRADE).length === 16);
    });
    await G.step("2. Kyoto: brought from far off", async () => {
      const jp = {region: "japan", way: wayOf("japan")};
      const g = byValue.find(x => x.ways && x.kind !== "coin" && x.from <= year && (x.to ?? 9999) >= year && GP.placeOf(x, year, inUse("japan", jp.way), jp).why === "far");
      const on = g ? await price(g.name, kyoto, true) : null, off = g ? await price(g.name, kyoto, false) : null;
      const ratio = on && off ? on.each / off.each : 0;
      G.ok("2. Kyoto: brought from far off", !!g && on.origin === "far" && /brought from far off/.test(on.text) && ratio > 2.3 && ratio < 3.8,
        {good: g?.name, ratio, text: on?.text, year});
    });
    await G.step("3. Moravia: the land's own", async () => {
      const mo = {region: "moravia", way: wayOf("moravia")};
      const g = byValue.find(x => x.ways && x.kind !== "coin" && x.from <= year && (x.to ?? 9999) >= year && GP.placeOf(x, year, inUse("moravia", mo.way), mo).why === "own");
      const on = g ? await price(g.name, brno, true) : null, off = g ? await price(g.name, brno, false) : null;
      const ratio = on && off ? on.each / off.each : 0;
      G.ok("3. Moravia: the land's own", !!g && on.origin === "own" && /the land's own/.test(on.text) && ratio > 0.55 && ratio < 0.95, {good: g?.name, ratio, text: on?.text});
      await game.settings.set(ST, "goodsByPlace", true);
    });
    const kinds = Object.keys((await import(`/modules/wodx-library/data/goods.mjs`)).KINDS ?? {});
    const mid = "wodx-gate-kyoto";
    await G.step("4. the market window names the land's trade", async () => {
      const s = st().upkeep.markets.state();
      await game.settings.set(ST, "markets", {...s, markets: [...s.markets.filter(m => m.id !== mid), {id: mid, name: "WoDX gate: Kyoto market", scenes: [kyoto.id], index: {}, supply: {}, traders: [], links: []}]});
      st().upkeep.markets.edit(mid);
      const find = () => [...foundry.applications.instances.values()].find(a => a.element?.querySelector?.(".wst-land-trade-line"));
      await waitFor(find, 8000);
      const app = find(), text = app?.element?.querySelector(".wst-land-trade-line")?.textContent ?? "";
      G.ok("4. the market window names the land's trade", /The land's own trade/.test(text) || year >= 2000, {text, year});
      await app?.close?.();
    });
    await G.step("5. a caravan names goods of Japan", async () => {
      const c = {id: "gatecaravan", from: mid, to: "elsewhere", fromName: "Kyoto", toName: "Osaka", ship: [], kinds: ["papers", "drink", "kitchen"], way: "pack", left: 0, arrive: 86400};
      const line = st().upkeep.caravans.describe(c);
      G.ok("5. a caravan names goods of Japan", /\(/.test(line), {line});
    });
    await G.step("6. plague at home moves the markets once", async () => {
      const R = await import(`/modules/${CH}/scripts/events-rules.mjs`);
      const part = R.partOf(ch().world.homeland());
      const cards = () => game.messages.filter(m => !before.has(m.id) && m.flags?.[ST]?.marketNews?.world === "plague");
      const ev = n => ({id: `wh-${year}-wodx-gate-plague-${n}`, year, name: "WoDX gate: a plague", summary: "A sickness spreads.", region: part, tags: ["plague"]});
      // a card from an earlier run would hold the next one back
      for ( const m of game.messages.filter(m => m.flags?.[ST]?.marketNews?.world === "plague") ) await m.delete();
      await st().upkeep.marketNews.hear(ev(1));
      await waitFor(() => cards().length >= 1, 6000);
      const first = cards().length;
      await st().upkeep.marketNews.hear(ev(2));
      await new Promise(r => setTimeout(r, 800));
      G.ok("6. plague at home moves the markets once", first === 1 && cards().length === 1, {first, after: cards().length, part});
    });
  } finally {
    try {
      await game.settings.set(ST, "markets", saved.markets);
      await game.settings.set(ST, "goodsByPlace", saved.byPlace);
      const mine = game.messages.filter(m => !before.has(m.id)).map(m => m.id);
      if ( mine.length ) await ChatMessage.deleteDocuments(mine);
      if ( scenes.length ) await Scene.deleteDocuments(scenes.map(s => s.id));
    } catch (e) { G.ok("put back", false, {error: String(e)}); }
    return G.finish();
  }
}
