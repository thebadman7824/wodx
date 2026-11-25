/**
 * The People window makes a person with the numbers it shows (creation.people), in Foundry, in rothenstein-wodx, as
 * Gamemaster Test:
 *   await (await import(`/wodx-gate/gatepeoplemake.mjs?${Date.now()}`)).run()
 * It removes the person it makes (and the People folder if it made it), and the batch count is put back.
 *   1. the Storyteller opens People, asks for 1, presses Roll and then "Make them now": a Mortal sheet with that
 *      person's name has the Nature, Demeanor and Willpower the window showed
 * Result: Data/wodx-gate/gatepeoplemake-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const el = () => { const a = foundry.applications.instances?.get?.("wodx-people"); return a?.element instanceof HTMLElement ? a.element : a?.element?.[0] ?? null; };

export async function run() {
  const G = gate("gatepeoplemake", {stepTimeout: 360000}); // the tables load and the sheet saves slowly in a big world
  const hadFolder = !!game.folders.find(f => f.type === "Actor" && f.name === "WoDX people");
  const before = new Set(game.actors.map(a => a.id));
  let made = [];
  try {
    await G.step("1. Make them now gives the sheet the window's Nature, Demeanor and Willpower", async () => {
      await game.modules.get("wodx-creation").api.people.open();
      await waitFor(() => el()?.querySelector('input[name="count"]'), 20000);
      const count = el().querySelector('input[name="count"]');
      count.value = "1"; count.dispatchEvent(new Event("change", {bubbles: true}));
      el().querySelector('button[data-action="roll"]')?.click();
      await waitFor(() => el()?.querySelectorAll("table.wodx-people-list tbody tr").length === 1, 150000); // the first roll loads the name and trade tables, slow in a big world
      const rows = el()?.querySelectorAll("table.wodx-people-list tbody tr").length ?? 0;
      const tr = el()?.querySelector("table.wodx-people-list tbody tr");
      const name = tr?.querySelector("strong")?.textContent?.trim() ?? "";
      const nd = tr?.children?.[2]?.textContent ?? "";
      const [nature, demeanor] = (nd.split(/Willpower/)[0] ?? "").split("/").map(s => s.trim());
      const wp = Number(/Willpower (\d+)/.exec(nd)?.[1]);
      el()?.querySelector('button[data-action="create"]')?.click();
      const fresh = () => game.actors.filter(a => !before.has(a.id) && a.name === name);
      await waitFor(() => fresh().length && Number(fresh()[0].system?.advantages?.willpower?.permanent) === wp, 120000);
      made = game.actors.filter(a => !before.has(a.id) && a.getFlag("wodx-creation", "people"));
      const a = fresh()[0];
      G.ok("1. Make them now gives the sheet the window's Nature, Demeanor and Willpower",
        !!name && !!a && a.type === "Mortal" && a.system.nature === nature && a.system.demeanor === demeanor && Number(a.system.advantages?.willpower?.permanent) === wp,
        {person: name, rows, window: el()?.querySelector(".wodx-empty, .wodx-scroll")?.textContent?.trim()?.slice(0, 120) ?? null, shown: {nature, demeanor, willpower: wp}, sheet: a ? {type: a.type, nature: a.system.nature, demeanor: a.system.demeanor, willpower: a.system.advantages?.willpower?.permanent} : null});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    try { await foundry.applications.instances?.get?.("wodx-people")?.close(); } catch (e) { G.R.notes.push(`window: ${e?.message ?? e}`); }
    made = [...new Set([...made, ...game.actors.filter(a => !before.has(a.id) && a.getFlag("wodx-creation", "people"))])];
    for ( const a of made ) { try { await a.delete(); } catch (e) { G.R.notes.push(`person: ${e?.message ?? e}`); } }
    const folder = game.folders.find(f => f.type === "Actor" && f.name === "WoDX people");
    if ( !hadFolder && folder && !folder.contents?.length ) { try { await folder.delete(); } catch (e) { G.R.notes.push(`folder: ${e?.message ?? e}`); } }
    for ( const m of game.messages.contents.slice(-10).filter(m => /New people/.test(m.content ?? "") && made.some(a => (m.content ?? "").includes(a.id))) ) { try { await m.delete(); } catch (e) { /* leave it */ } }
    G.R.notes.push(`removed ${made.length} made person(s)`);
    return G.finish();
  }
}
