/**
 * The Creation window's own Award button (creation.creation-window), in Foundry, in rothenstein-wodx, as Gamemaster
 * Test:
 *   await (await import(`/wodx-gate/gatecreationaward.mjs?${Date.now()}`)).run()
 * It makes its own character and removes it.
 *   1. the Storyteller opens the Creation window, presses Award experience, ticks only the gate's character, types 3
 *      and presses Award: the character gains 3 unspent experience points
 * Result: Data/wodx-gate/gatecreationaward-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const xpOf = a => (a?.items ?? []).filter(i => i.type === "Experience" && !i.system?.isspent).reduce((n, i) => n + (Number(i.system?.amount) || 0), 0);
const el = app => app?.element instanceof HTMLElement ? app.element : app?.element?.[0] ?? null;

export async function run() {
  const G = gate("gatecreationaward", {stepTimeout: 180000}); // making actors in a big world can take over a minute
  try {
    await G.step("1. the Creation window's Award button gives the ticked character 3 experience", async () => {
      const [pc] = await G.make(Actor, [{name: "Gate Award Mortal", type: "Mortal"}]);
      const a = () => game.actors.get(pc.id);
      const before = xpOf(a());
      await game.modules.get("wodx-creation").api.open();
      const win = () => foundry.applications.instances?.get?.("wodx-creation") ?? null;
      const awardBtn = () => el(win())?.querySelector('button[data-action="award"]') ?? null;
      await waitFor(awardBtn, 15000);
      const pressed = !!awardBtn();
      awardBtn()?.click();
      // the Award experience window: only the gate's character, 3 points
      const dlg = () => [...document.querySelectorAll(".application.dialog, dialog.application")].find(d => /Award experience/.test(d.querySelector(".window-title")?.textContent ?? d.textContent ?? "")) ?? null;
      await waitFor(() => dlg()?.querySelector(`input[name="who"][value="${pc.id}"]`), 15000);
      const box = dlg()?.querySelector(`input[name="who"][value="${pc.id}"]`);
      for ( const c of dlg()?.querySelectorAll('input[name="who"]') ?? [] ) c.checked = c.value === pc.id;
      const amount = dlg()?.querySelector('input[name="amount"]');
      if ( amount ) amount.value = "3";
      const note = dlg()?.querySelector('input[name="note"]');
      if ( note ) note.value = "Gate award";
      dlg()?.querySelector('button[data-action="ok"]')?.click();
      await waitFor(() => xpOf(a()) >= before + 3, 30000);
      const after = xpOf(a());
      const item = a().items.find(i => i.type === "Experience" && i.name === "Gate award");
      G.ok("1. the Creation window's Award button gives the ticked character 3 experience",
        pressed && !!box && !!amount && after === before + 3 && Number(item?.system.amount) === 3 && item?.system.isspent === false,
        {pressed, box: !!box, amount: !!amount, before, after, item: item ? {amount: item.system.amount, spent: item.system.isspent} : null});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    try { await foundry.applications.instances?.get?.("wodx-creation")?.close(); } catch (e) { G.R.notes.push(`window: ${e?.message ?? e}`); }
    for ( const m of game.messages.contents.filter(m => /Gate Award Mortal/.test(m.content ?? "")) ) { try { await m.delete(); } catch (e) { /* leave it */ } }
    return G.finish();
  }
}
