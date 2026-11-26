/**
 * A hunter uses an edge from a creed book (B7834, Hunter Book: Defender p. 76): Protect, from the edge window, costs a
 * Conviction and its card names the creed book's page (actions.hunter-creed-edges), in Foundry, in rothenstein-wodx,
 * as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatecreededge.mjs?${Date.now()}`)).run()
 * It makes its own hunter, and removes it; never moves the clock.
 *   1. Use an edge, Protect, Use: Conviction 4 to 3, and the card reads Hunter Book: Defender p. 76
 * Result: Data/wodx-gate/gatecreededge-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const el = app => app?.element instanceof HTMLElement ? app.element : app?.element?.[0] ?? null;
const winTitled = re => [...foundry.applications.instances.values()].filter(a => a.rendered && re.test(String(a.title ?? a.options?.window?.title ?? ""))).at(-1) ?? null;

export async function run() {
  const G = gate("gatecreededge", {stepTimeout: 240000});
  const since = Date.now();
  const log = foundry.utils.deepClone(game.settings.get("wodx-storyteller", "log"));
  let hunter = null;
  const me = () => game.actors.get(hunter?.id);
  const conv = () => Number(me()?.system.advantages?.conviction?.temporary);
  try {
    await G.step("1. Use an edge, Protect: a Conviction spent, the card names Hunter Book: Defender p. 76", async () => {
      hunter = await G.make(Actor, {name: "Gate Creed Defender", type: "Hunter", ownership: {default: 3},
        system: {creed: "Defender", advantages: {conviction: {permanent: 4, temporary: 4}, virtues: {mercy: {permanent: 1}, vision: {permanent: 0}, zeal: {permanent: 4}}}}});
      await hunter.createEmbeddedDocuments("Item", [{name: "Protect", type: "Power", system: {type: "wod.types.edge", value: 4}}]);
      // set after creating: the create helper resets a new sheet's resources
      await me().update({"system.advantages.conviction.permanent": 4, "system.advantages.conviction.temporary": 4});
      await me().unsetFlag("wodx-actions", "riskScene");
      const before = conv();
      // the trigger: the edge window, as the hunter's menu and sheet open it
      game.wodxActions.useEdge({actor: me()});
      const win = () => el(winTitled(/^Use an edge: Gate Creed Defender/));
      await waitFor(() => win()?.querySelector('select[name="edge"]'), 30000);
      const sel = win().querySelector('select[name="edge"]');
      sel.value = "protect"; sel.dispatchEvent(new Event("change", {bubbles: true}));
      const info = win().querySelector(".wodx-edge-info")?.textContent ?? "";
      win().querySelector('button[data-action="ok"]')?.click();
      const card = () => game.messages.contents.filter(m => (m.timestamp ?? 0) >= since && /Gate Creed Defender: Protect/.test(`${m.content ?? ""} ${m.flavor ?? ""}`)).at(-1);
      await waitFor(() => !!card(), 60000);
      const text = card()?.content ?? "";
      G.ok("1. Use an edge, Protect: a Conviction spent, the card names Hunter Book: Defender p. 76", before === 4 && conv() === 3 && /Hunter Book: Defender p\. 76/.test(text),
        {before, after: conv(), info: info.slice(0, 200), card: text.replace(/<[^>]+>/g, " ").slice(0, 300)});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    const w = winTitled(/^Use an edge: /);
    if ( w ) { try { await w.close(); } catch (e) { /* closed */ } }
    const a = game.actors.getName("Gate Creed Defender");
    if ( a ) { try { await a.delete(); } catch (e) { G.R.notes.push(`actor: ${e?.message ?? e}`); } }
    await new Promise(r => setTimeout(r, 8000));
    for ( const x of game.messages.contents.filter(x => (x.timestamp ?? 0) >= since && /Gate Creed/.test(`${x.speaker?.alias ?? ""} ${x.content ?? ""} ${x.flavor ?? ""}`)) ) { try { await x.delete(); } catch (e) { /* leave it */ } }
    try { await game.settings.set("wodx-storyteller", "log", log); } catch (e) { G.R.notes.push(`log: ${e?.message ?? e}`); }
    return G.finish();
  }
}
