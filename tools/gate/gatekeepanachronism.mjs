/**
 * A thing out of its time on a character's sheet: the sheet warns about it, the Storyteller's "Out of their time" card
 * lists it, and Keep it on the card ends the sheet's warning (sheets.anachronism-check), in Foundry, in
 * rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatekeepanachronism.mjs?${Date.now()}`)).run()
 * It makes its own character with one thing not made until the far future, and removes it; never moves the clock and
 * leaves the stored year of the check alone.
 *   1. Keep it on the card: the sheet no longer says a thing does not belong to this year
 * Result: Data/wodx-gate/gatekeepanachronism-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-sheets";
const el = app => app?.element instanceof HTMLElement ? app.element : app?.element?.[0] ?? null;

export async function run() {
  const G = gate("gatekeepanachronism", {stepTimeout: 240000});
  const since = Date.now();
  const log = foundry.utils.deepClone(game.settings.get("wodx-storyteller", "log"));
  let sheet = null;
  try {
    await G.step("1. Keep it on the card: the sheet's out-of-its-time warning goes", async () => {
      const A = game.modules.get(MOD).api.anachronism;
      const pc = await G.make(Actor, {name: "Gate Anachronism Keeper", type: "Mortal", ownership: {default: 3}});
      const [it] = await pc.createEmbeddedDocuments("Item", [{name: "Gate Anachronism Lantern", type: "Item", flags: {"wodx-library": {firstYear: 2900, lastYear: 2999}}}]);
      // the sheet as the player sees it: a warning that one thing does not belong to this year
      sheet = game.actors.get(pc.id).sheet;
      await sheet.render({force: true});
      const warned = () => [...(el(sheet)?.querySelectorAll(".wodx-warn") ?? [])].some(w => /does not belong to this year/.test(w.textContent));
      await waitFor(warned, 30000);
      const before = warned();
      // setup: the Storyteller's "Out of their time" card for this character
      const E = game.modules.get("wodx-chronicle")?.api?.eras;
      const now = {era: E?.activeEra?.()?.profile?.id ?? null, year: Number(E?.currentYear?.()) || 0};
      const m = await A.report({}, now, [game.actors.get(pc.id)], {maps: false, all: true});
      const btn = () => document.querySelector(`[data-message-id="${m?.id}"] [data-wodx-keep="${pc.id}.${it.id}"]`);
      await waitFor(btn, 30000);
      const listed = !!btn();
      // the trigger: Keep it
      btn()?.click();
      await waitFor(() => !!game.actors.get(pc.id)?.items.get(it.id)?.flags?.[MOD]?.keepOutOfEra, 30000);
      await sheet.render({force: true});
      await waitFor(() => !warned(), 30000);
      G.ok("1. Keep it on the card: the sheet's out-of-its-time warning goes", before && listed && !warned(),
        {before, listed, after: warned(), kept: !!game.actors.get(pc.id)?.items.get(it.id)?.flags?.[MOD]?.keepOutOfEra, now});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    try { await sheet?.close(); } catch (e) { /* closed */ }
    const a = game.actors.getName("Gate Anachronism Keeper");
    if ( a ) { try { await a.delete(); } catch (e) { G.R.notes.push(`actor: ${e?.message ?? e}`); } }
    await new Promise(r => setTimeout(r, 8000));
    for ( const x of game.messages.contents.filter(x => (x.timestamp ?? 0) >= since && (x.flags?.[MOD]?.anachronism || /Gate Anachronism/.test(`${x.speaker?.alias ?? ""} ${x.content ?? ""}`))) ) { try { await x.delete(); } catch (e) { /* leave it */ } }
    try { await game.settings.set("wodx-storyteller", "log", log); } catch (e) { G.R.notes.push(`log: ${e?.message ?? e}`); }
    return G.finish();
  }
}
