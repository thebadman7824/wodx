/**
 * A changeling enchants a mortal from its own Actions menu (actions.servant-actions, c1: C20 Enchantment), in Foundry,
 * in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateenchant.mjs?${Date.now()}`)).run()
 * It makes its own scratch scene, a changeling and a mortal, and removes them all.
 *   1. the changeling, with 3 Glamour and the mortal targeted, presses "Enchant a mortal" in its Actions menu, gives 2
 *      in the Enchant window and presses Enchant: its Glamour on the sheet is 1 and WoDX NPC's servant ledger holds the
 *      mortal as enchanted by it
 * Result: Data/wodx-gate/gateenchant-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const winTitled = re => [...foundry.applications.instances.values()].filter(a => a.rendered && re.test(String(a.title ?? a.options?.window?.title ?? ""))).at(-1) ?? null;
const el = app => app?.element instanceof HTMLElement ? app.element : app?.element?.[0] ?? null;

export async function run() {
  const G = gate("gateenchant", {stepTimeout: 180000}); // making actors in a big world can take over a minute
  let shown = null;
  try {
    const scene = await G.scene({name: "WoDX gate: enchantment"});
    await G.step("1. Enchant from the changeling's Actions menu spends Glamour and binds the mortal", async () => {
      // a C20 changeling (the Dark Ages menus have no Enchantment), so the menu is the C20 one in any era
      const [fae, mark] = await G.make(Actor, [
        {name: "Gate Enchant Fae", type: "Changeling", system: {advantages: {glamour: {temporary: 3, permanent: 5}}}, flags: {"wodx-actions": {daFae: {system: "c20"}}}},
        {name: "Gate Enchant Mortal", type: "Mortal"}]);
      const a = () => game.actors.get(fae.id);
      const [, tm] = await G.tokens(scene, [{actor: fae, x: 2, y: 2, actorLink: true}, {actor: mark, x: 3, y: 2, actorLink: true}]);
      await waitFor(() => canvas.scene?.id === scene.id && canvas.tokens?.get(tm.id), 20000);
      canvas.tokens.get(tm.id)?.setTarget(true, {releaseOthers: true});
      const before = Number(a().system.advantages?.glamour?.temporary);
      shown = game.wodxActions.menu({actor: a()});
      const btn = () => el(winTitled(/^WoDX Actions/))?.querySelector('button[data-k="api:enchant"]') ?? null;
      await waitFor(btn, 20000);
      const pressed = !!btn();
      btn()?.click();
      const dlg = () => el(winTitled(/^Enchant: /));
      await waitFor(() => dlg()?.querySelector('input[name="g"]'), 20000);
      const g = dlg()?.querySelector('input[name="g"]');
      if ( g ) { g.value = "2"; g.dispatchEvent(new Event("change", {bubbles: true})); }
      dlg()?.querySelector('button[data-action="ok"]')?.click();
      await waitFor(() => Number(a().system.advantages?.glamour?.temporary) === before - 2, 60000);
      const after = Number(a().system.advantages?.glamour?.temporary);
      const S = game.modules.get("wodx-npc")?.api?.servants;
      const ledger = () => (S?.servantsOf?.(a()) ?? []).find(x => x.actor?.id === mark.id)?.records ?? [];
      await waitFor(() => ledger().length, 30000);
      const rows = ledger();
      G.ok("1. Enchant from the changeling's Actions menu spends Glamour and binds the mortal",
        pressed && !!g && before === 3 && after === 1 && rows.length > 0,
        {pressed, field: !!g, before, after, ledger: rows.slice(0, 2).map(r => ({kind: r.kind ?? r.type ?? null, step: r.step ?? null, waiting: r.waiting ?? null}))});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    for ( const t of game.user.targets ?? [] ) { try { t.setTarget(false, {releaseOthers: false}); } catch (e) { /* gone */ } }
    for ( const re of [/^Enchant: /, /^WoDX Actions/] ) { const w = winTitled(re); if ( w ) { try { await w.close(); } catch (e) { /* closed */ } } }
    if ( shown ) await Promise.race([shown, new Promise(r => setTimeout(r, 1500))]);
    // the bond lives on the mortal, which the kit removes
    for ( const m of game.messages.contents.filter(m => /Gate Enchant/.test(m.speaker?.alias ?? "") || /Gate Enchant/.test(m.content ?? "")) ) { try { await m.delete(); } catch (e) { /* leave it */ } }
    return G.finish();
  }
}
