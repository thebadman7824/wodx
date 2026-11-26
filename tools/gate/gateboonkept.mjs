/**
 * A boon marked "Kept or paid" in the Ledger window moves the holder's trust in the debtor, and the holder's
 * Relationships tab shows it (npc.trust), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateboonkept.mjs?${Date.now()}`)).run()
 * It makes its own two vampires and one boon, removes them, puts the Ledger and the Storyteller log back, and never
 * moves the clock.
 *   1. the boon's "Kept or paid" button in the Ledger window: on the holder's Relationships tab the debtor's row
 *      reads "Inclined to trust"
 * Result: Data/wodx-gate/gateboonkept-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const ST = "wodx-storyteller";
const el = app => app?.element instanceof HTMLElement ? app.element : app?.element?.[0] ?? null;

export async function run() {
  const G = gate("gateboonkept", {stepTimeout: 300000}); // saving the Ledger and sheets in a big world can take minutes
  const since = Date.now();
  // WoDX Storyteller logs the removals; its log and the Ledger are put back after the gate's own cleanup
  const log = foundry.utils.deepClone(game.settings.get(ST, "log"));
  const ledger0 = foundry.utils.deepClone(game.settings.get(ST, "ledger"));
  let sheet = null, win = null;
  try {
    await G.step("1. Kept or paid in the Ledger window: the holder's Relationships tab reads Inclined to trust", async () => {
      const [holder, debtor] = await G.make(Actor, [{name: "Gate Boon Holder", type: "Vampire"}, {name: "Gate Boon Debtor", type: "Vampire"}]);
      const L = game.modules.get(ST).api.ledger, T = game.modules.get("wodx-npc").api.trust;
      // setup: the holder keeps a tie to the debtor, and the debtor owes the holder a minor boon
      await holder.update({"flags.wodx-sheets.ties": [{uuid: `Actor.${debtor.id}`, role: "friend"}]});
      const e = await L.save({kind: "boon", size: "minor", what: "Gate boon kept", from: {id: debtor.id, name: debtor.name}, to: {id: holder.id, name: holder.name}});
      const before = T.of(holder, debtor);
      // the trigger: the Storyteller presses Kept or paid on that boon in the Ledger window
      win = L.open();
      await Promise.race([win, new Promise(r => setTimeout(r, 20000))]);
      const btn = () => document.querySelector(`#wodx-ledger button[data-action="status"][data-status="kept"][data-id="${e.id}"]`);
      await waitFor(btn, 30000);
      const pressed = !!btn();
      btn()?.click();
      await waitFor(() => T.of(game.actors.get(holder.id), debtor) === 1, 60000);
      // what the player sees: the debtor's row on the holder's Relationships tab
      sheet = game.actors.get(holder.id).sheet;
      await sheet.render({force: true});
      const rows = () => [...(el(sheet)?.querySelectorAll(`.tab.wodxties .wodx-tie[data-uuid="Actor.${debtor.id}"]`) ?? [])].map(r => [...r.querySelectorAll(".wodx-tie-name, .wodx-quiet")].map(x => x.textContent).join(" ").replace(/\s+/g, " ").trim());
      await waitFor(() => rows().some(t => /Inclined to trust/.test(t)), 30000);
      const shown = rows().join(" | ") || null;
      const status = L.state().entries.find(x => x.id === e.id)?.status ?? null;
      G.ok("1. Kept or paid in the Ledger window: the holder's Relationships tab reads Inclined to trust",
        pressed && status === "kept" && before === 0 && /Inclined to trust/.test(shown ?? ""), {pressed, status, before, after: T.of(holder, debtor), shown});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    try { await sheet?.close(); } catch (e) { /* closed */ }
    try { await win?.then?.(a => a?.close?.()); } catch (e) { /* closed */ }
    for ( const n of ["Gate Boon Holder", "Gate Boon Debtor"] ) { const a = game.actors.getName(n); if ( a ) { try { await a.delete(); } catch (e) { G.R.notes.push(`actor: ${e?.message ?? e}`); } } }
    await new Promise(r => setTimeout(r, 8000));
    for ( const x of game.messages.contents.filter(x => (x.timestamp ?? 0) >= since && /Gate Boon/.test(`${x.speaker?.alias ?? ""} ${x.content ?? ""}`)) ) { try { await x.delete(); } catch (e) { /* leave it */ } }
    try { await game.settings.set(ST, "ledger", ledger0); } catch (e) { G.R.notes.push(`ledger: ${e?.message ?? e}`); }
    try { await game.settings.set(ST, "log", log); } catch (e) { G.R.notes.push(`log: ${e?.message ?? e}`); }
    return G.finish();
  }
}
