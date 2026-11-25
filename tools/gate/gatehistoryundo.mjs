/**
 * Undo pressed in a sheet's own History window (sheets.history-print), in Foundry, in rothenstein-wodx, as Gamemaster
 * Test:
 *   await (await import(`/wodx-gate/gatehistoryundo.mjs?${Date.now()}`)).run()
 * It makes its own mortal and removes it.
 *   1. a mortal's Strength is raised from 2 to 4; the sheet's own History control opens the window, which lists the
 *      change, and its Undo button puts Strength back to 2 on the sheet and drops the line
 * Result: Data/wodx-gate/gatehistoryundo-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const histWin = name => [...document.querySelectorAll(".wodx-sheet-history")].find(e => e.textContent.includes(name)) ?? null;

export async function run() {
  const G = gate("gatehistoryundo", {stepTimeout: 180000}); // making actors in a big world can take over a minute before the sheet opens
  let sheet = null, how = null;
  try {
    await G.step("1. Undo in the sheet's History window puts Strength back", async () => {
      const [pc] = await G.make(Actor, [{name: "Gate History Mortal", type: "Mortal", system: {attributes: {strength: {value: 2}}}}]);
      const a = () => game.actors.get(pc.id);
      sheet = a().sheet;
      await sheet.render(true);
      const root = () => sheet.element instanceof HTMLElement ? sheet.element : sheet.element?.[0];
      await waitFor(() => root(), 15000);
      // the change this session's History keeps
      await a().update({"system.attributes.strength.value": 4});
      const raised = a().system.attributes.strength.value;
      // the sheet's own History control: the title bar menu's entry on a V2 sheet, the header button on a legacy one
      const ctl = root()?.querySelector('[data-action="wodxHistory"]') ?? root()?.closest(".app, .application")?.querySelector(".wodx-history-btn")
        ?? document.querySelector(`.wodx-history-btn`);
      if ( ctl ) { how = "control"; ctl.click(); }
      if ( !(await waitFor(() => histWin(pc.name), 15000)) && sheet.options?.actions?.wodxHistory ) {
        how = "menu action"; await sheet.options.actions.wodxHistory.call(sheet);
      }
      await waitFor(() => histWin(pc.name)?.querySelector(".wodx-hist-undo"), 15000);
      const win = histWin(pc.name);
      const lines = [...(win?.querySelectorAll(".wodx-hist-undo") ?? [])].map(b => b.parentElement?.textContent?.replace(/\s+/g, " ").trim());
      const btn = [...(win?.querySelectorAll(".wodx-hist-undo") ?? [])].find(b => /Strength/.test(b.parentElement?.textContent ?? ""));
      btn?.click();
      await waitFor(() => Number(a().system.attributes.strength.value) === 2, 60000); // one save can take most of a minute in a big world
      const after = a().system.attributes.strength.value;
      await waitFor(() => !/Strength/.test(histWin(pc.name)?.querySelector(".wodx-history, .wodx-history-empty")?.textContent ?? "x"), 15000);
      const left = histWin(pc.name)?.querySelector(".wodx-history, .wodx-history-empty")?.textContent?.replace(/\s+/g, " ").trim() ?? null;
      G.ok("1. Undo in the sheet's History window puts Strength back",
        Number(raised) === 4 && !!btn && Number(after) === 2 && !/Strength/.test(left ?? "Strength"),
        {how, raised, lines: lines.slice(0, 4), button: !!btn, after, left: left?.slice(0, 120) ?? null});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    for ( const w of document.querySelectorAll(".wodx-sheet-history") ) w.querySelector('button[data-action="close"]')?.click();
    try { await sheet?.close?.(); } catch (e) { G.R.notes.push(`sheet: ${e?.message ?? e}`); }
    return G.finish();
  }
}
