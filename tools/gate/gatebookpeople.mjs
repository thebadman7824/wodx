/**
 * The People of the book window makes a sheet with the book's numbers (creation.book-people, V20 Dark Ages pp.
 * 383-396), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatebookpeople.mjs?${Date.now()}`)).run()
 * It removes the sheet it makes (and the folder if it made it).
 *   1. the Storyteller opens People of the book, picks the Curious Barber and presses Make: a Mortal sheet named for
 *      the barber has the book's Wits, Perception, Nature and Demeanor
 * Result: Data/wodx-gate/gatebookpeople-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const FOLDER = "WoDX · People of the book (V20 Dark Ages)";
const KEY = "curious-barber";
const dlg = () => [...document.querySelectorAll(".application.dialog, dialog.application")].find(d => /People of the book/.test(d.querySelector(".window-title")?.textContent ?? "")) ?? null;

export async function run() {
  const G = gate("gatebookpeople", {stepTimeout: 240000}); // making actors in a big world can take over a minute
  const hadFolder = !!game.folders.find(f => f.type === "Actor" && f.name === FOLDER);
  const before = new Set(game.actors.map(a => a.id));
  const fresh = () => game.actors.filter(a => !before.has(a.id) && a.getFlag("wodx-creation", "bookPerson") === KEY);
  let shown = null;
  try {
    await G.step("1. Make in People of the book gives the sheet the book's numbers", async () => {
      const api = game.modules.get("wodx-creation").api.bookPeople;
      const p = api.list().find(x => x.key === KEY);
      shown = api.open();
      await waitFor(() => dlg()?.querySelector(`select[name="who"] option[value="${KEY}"]`), 20000);
      const opt = dlg()?.querySelector(`select[name="who"] option[value="${KEY}"]`);
      for ( const o of dlg()?.querySelectorAll('select[name="who"] option') ?? [] ) o.selected = o === opt;
      dlg()?.querySelector('button[data-action="ok"]')?.click();
      await waitFor(() => fresh().length && Number(fresh()[0].system?.attributes?.wits?.value) === p.attributes.wits, 150000);
      const a = fresh()[0];
      G.ok("1. Make in People of the book gives the sheet the book's numbers",
        !!opt && !!a && a.name === p.name && a.type === "Mortal" && Number(a.system.attributes.wits.value) === p.attributes.wits
          && Number(a.system.attributes.perception.value) === p.attributes.perception && a.system.nature === p.nature && a.system.demeanor === p.demeanor,
        {picked: !!opt, book: {name: p.name, wits: p.attributes.wits, perception: p.attributes.perception, nature: p.nature, demeanor: p.demeanor},
          sheet: a ? {name: a.name, wits: a.system.attributes.wits.value, perception: a.system.attributes.perception.value, nature: a.system.nature, demeanor: a.system.demeanor} : null});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    dlg()?.querySelector('button[data-action="close"], .header-control[data-action="close"]')?.click();
    if ( shown ) await Promise.race([shown, new Promise(r => setTimeout(r, 30000))]);
    const made = fresh();
    for ( const a of made ) { try { await a.delete(); } catch (e) { G.R.notes.push(`sheet: ${e?.message ?? e}`); } }
    const folder = game.folders.find(f => f.type === "Actor" && f.name === FOLDER);
    if ( !hadFolder && folder && !folder.contents?.length ) { try { await folder.delete(); } catch (e) { G.R.notes.push(`folder: ${e?.message ?? e}`); } }
    for ( const m of game.messages.contents.slice(-10).filter(m => /People of the book/.test(m.content ?? "") && made.some(a => (m.content ?? "").includes(a.id))) ) { try { await m.delete(); } catch (e) { /* leave it */ } }
    G.R.notes.push(`removed ${made.length} sheet(s)`);
    return G.finish();
  }
}
