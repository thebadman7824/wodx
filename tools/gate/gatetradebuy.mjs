/**
 * Buying from an NPC in the trade window: the goods leave the NPC's sheet for the character's, and the price changes
 * purses (actions.trade), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatetradebuy.mjs?${Date.now()}`)).run()
 * It makes its own scene, a character and a trader with coin and one priced good, and removes them; never moves the
 * clock.
 *   1. the trade window, Buy from them, the trader's good, Deal: the good is on the character's sheet and off the
 *      trader's, and the character's purse fell by the price the trader's rose by
 * Result: Data/wodx-gate/gatetradebuy-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const el = app => app?.element instanceof HTMLElement ? app.element : app?.element?.[0] ?? null;
const winTitled = re => [...foundry.applications.instances.values()].filter(a => a.rendered && re.test(String(a.title ?? a.options?.window?.title ?? ""))).at(-1) ?? null;

export async function run() {
  const G = gate("gatetradebuy", {stepTimeout: 240000});
  const since = Date.now();
  const log = foundry.utils.deepClone(game.settings.get("wodx-storyteller", "log"));
  const M = game.modules.get("wodx-storyteller").api.upkeep.money;
  let sheet = null, opened = null;
  try {
    await G.step("1. Buy from them, then Deal: the good moves to the character's sheet and the price changes purses", async () => {
      const sc = await G.scene({width: 1200, height: 800});
      const pc = await G.make(Actor, {name: "Gate Trade Buyer", type: "Mortal", ownership: {default: 3}, prototypeToken: {actorLink: true}});
      const npc = await G.make(Actor, {name: "Gate Trade Seller", type: "Mortal", prototypeToken: {actorLink: true}});
      const [, nTok] = await G.tokens(sc, [{actor: pc, x: 3, y: 3}, {actor: npc, x: 4, y: 3}]);
      // setup: a priced good on the trader, and coin in both purses
      await M.findGood("");
      const GOODS = (await import("/modules/wodx-library/data/goods.mjs")).GOODS ?? [];
      const good = GOODS.find(x => x.kind !== "coin" && M.priceSync(x.name)?.each > 0);
      await M.receive(pc, 100000, {note: "Gate Trade purse"});
      await M.receive(npc, 100000, {note: "Gate Trade purse"});
      const [it] = await npc.createEmbeddedDocuments("Item", [{name: good.name, type: "Item"}]);
      const cash = a => { const p = M.purse(game.actors.get(a.id)); return (p.carried ?? 0) + (p.bank ?? 0); };
      const pc0 = cash(pc), npc0 = cash(npc);
      // the trade window, as With this person opens it
      opened = game.wodxActions.trade(pc, nTok.object ?? canvas.tokens.get(nTok.id), "buy");
      const win = () => el(winTitled(/^Trade with /));
      await waitFor(() => win()?.querySelector('select[name="want"]'), 30000);
      const sel = win()?.querySelector('select[name="want"]');
      const offered = [...(sel?.options ?? [])].some(o => o.value === `i${it.id}`);
      if ( sel ) { sel.value = `i${it.id}`; sel.dispatchEvent(new Event("change", {bubbles: true})); }
      win()?.querySelector('button[data-action="ok"]')?.click();
      const mine = () => game.actors.get(pc.id)?.items.find(i => i.name === good.name) ?? null;
      await waitFor(() => !!mine() && !game.actors.get(npc.id)?.items.get(it.id), 60000);
      const res = await Promise.race([opened, new Promise(r => setTimeout(() => r(null), 10000))]);
      // what the player sees: the character's sheet lists the good
      sheet = game.actors.get(pc.id).sheet;
      await sheet.render({force: true});
      await waitFor(() => el(sheet)?.isConnected, 20000);
      const listed = !!mine() && (!!el(sheet)?.querySelector(`[data-itemid="${mine().id}"], [data-item-id="${mine().id}"]`) || (el(sheet)?.textContent ?? "").includes(good.name));
      const paid = pc0 - cash(pc), got = cash(npc) - npc0;
      G.ok("1. Buy from them, then Deal: the good moves to the character's sheet and the price changes purses",
        offered && listed && !game.actors.get(npc.id)?.items.get(it.id) && paid > 0 && paid === got,
        {good: good?.name ?? null, offered, listed, paid, got, owe: res?.owe ?? null});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    try { await sheet?.close(); } catch (e) { /* closed */ }
    const w = winTitled(/^Trade with /);
    if ( w ) { try { await w.close(); } catch (e) { /* closed */ } }
    for ( const n of ["Gate Trade Buyer", "Gate Trade Seller"] ) {
      const a = game.actors.getName(n);
      if ( a ) { try { await a.delete(); } catch (e) { G.R.notes.push(`actor: ${e?.message ?? e}`); } }
    }
    await new Promise(r => setTimeout(r, 8000));
    for ( const x of game.messages.contents.filter(x => (x.timestamp ?? 0) >= since && /Gate Trade/.test(`${x.speaker?.alias ?? ""} ${x.content ?? ""} ${x.flavor ?? ""}`)) ) { try { await x.delete(); } catch (e) { /* leave it */ } }
    try { await game.settings.set("wodx-storyteller", "log", log); } catch (e) { G.R.notes.push(`log: ${e?.message ?? e}`); }
    return G.finish();
  }
}
