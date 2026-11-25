/**
 * The Group sheet: a coterie's roster and pooled Backgrounds (V20 Dark Ages p. 182), in Foundry, in rothenstein-wodx,
 * as Gamemaster Test:
 *   await (await import(`/wodx-gate/gategroupsheet.mjs?${Date.now()}`)).run()
 * It makes its own coterie and two members, and removes them all.
 *   1. the coterie's own sheet opens on its members; a member's dots typed into the Resources pool save to the group
 *      and the pool's total on the sheet becomes the sum of both members' dots
 * Result: Data/wodx-gate/gategroupsheet-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

export async function run() {
  const G = gate("gategroupsheet", {stepTimeout: 180000}); // making actors in a big world can take over a minute before the sheet opens
  let sheet = null;
  try {
    await G.step("1. a member's dots typed on the Group sheet pool into the coterie", async () => {
      if ( !CONFIG.Actor?.dataModels?.Group ) return G.ok("1. a member's dots typed on the Group sheet pool into the coterie", false, {error: "no Group actor type"});
      const [anna, bors] = await G.make(Actor, [{name: "Gate Group Anna", type: "Mortal"}, {name: "Gate Group Bors", type: "Mortal"}]);
      const [group] = await G.make(Actor, [{name: "Gate Coterie", type: "Group"}]);
      const bg = foundry.utils.randomID(), t = game.time.worldTime;
      await group.update({"system.kind": "coterie",
        "system.roster": [{actorId: anna.id, role: "", joined: t, left: null}, {actorId: bors.id, role: "", joined: t, left: null}],
        "system.backgrounds": [{id: bg, name: "Resources", note: "", contributions: {[anna.id]: 2}}]});
      const g = () => game.actors.get(group.id);
      // the Storyteller opens the coterie's own sheet
      sheet = g().sheet;
      await sheet.render(true);
      const root = () => sheet.element instanceof HTMLElement ? sheet.element : sheet.element?.[0];
      await waitFor(() => root()?.querySelector(`input[data-contrib="${bg}"][data-actor="${bors.id}"]`), 10000);
      const roster = [...(root()?.querySelectorAll("a[data-action='openMember']") ?? [])].map(a => a.textContent.trim());
      const box = root()?.querySelector(`input[data-contrib="${bg}"][data-actor="${bors.id}"]`);
      if ( box ) { box.value = "3"; box.dispatchEvent(new Event("change", {bubbles: true})); }
      await waitFor(() => Number(g().system.backgrounds?.find(b => b.id === bg)?.contributions?.[bors.id]) === 3, 10000);
      const totalCell = () => root()?.querySelector(`input[data-contrib="${bg}"]`)?.closest("tr")?.querySelector("td.total")?.textContent?.trim();
      await waitFor(() => totalCell() === "5", 10000);
      const saved = g().system.backgrounds?.find(b => b.id === bg)?.contributions ?? {};
      G.ok("1. a member's dots typed on the Group sheet pool into the coterie",
        !!box && roster.includes(anna.name) && roster.includes(bors.name) && Number(saved[bors.id]) === 3 && Number(saved[anna.id]) === 2 && totalCell() === "5",
        {box: !!box, roster, saved, total: totalCell() ?? null, sheet: sheet?.constructor?.name ?? null});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    try { await sheet?.close?.(); } catch (e) { G.R.notes.push(`sheet: ${e?.message ?? e}`); }
    return G.finish();
  }
}
