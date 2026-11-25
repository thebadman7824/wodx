/**
 * Gate: the sheet's second page and the archive of the dead, through the clicks a table makes (Master Plan gap
 * items, B7265-B7271), in rothenstein-wodx only, as Gamemaster Test. gatesheet5 and gatearchive call the modules'
 * functions; this gate opens the windows and presses their own buttons.
 *   1. a Dark Ages vampire's sheet shows its second page: Combat, Possessions, Rituals, Paths, Derangements and
 *      History and Description, with the History written on the Bio tab
 *   2. a sword given to the character shows on that page's Combat block, with its line, while the sheet stays open
 *   3. clicking the sword's row on the page opens the sword's own sheet
 *   4. Feed on the page's row of actions: its window opens, and its Feed button raises the blood pool by the 2 asked
 *   5. the archive window: a test dead ticked and "Archive the ticked" pressed leaves the world for the archive
 *      compendium under the same id and is listed in the index journal; a test dead with a linked token on a scene
 *      cannot be ticked, and stays
 *   6. "Bring back" in the window returns that character to the world, same id, in WoDX · The Dead
 *   7. the clock: a test dead who died fifteen years ago goes into the archive by itself when the released clock
 *      moves on (Archive the long dead by itself, ten years)
 * At the end: the test characters, their archive entries, the index, the archived list, the hold and the clock go
 * back as they were. Characters the gate did not make are never ticked; step 7 runs only when no one else is due.
 */
import {gate, waitFor} from "./kit.mjs";

const C = "wodx-creation", CH = "wodx-chronicle", ST = "wodx-storyteller";
const TAG = "Gate page two";
const sleep = ms => new Promise(r => setTimeout(r, ms));
/** Waits until what read() gives has not changed for three seconds (thirty at most): the night work has finished writing. */
async function settle(read, {quiet = 3000, most = 30000} = {}) {
  const t = Date.now();
  let last = read(), since = Date.now();
  while ( Date.now() - t < most ) {
    await sleep(500);
    const now = read();
    if ( now !== last ) { last = now; since = Date.now(); } else if ( Date.now() - since >= quiet ) return;
  }
}
const elOf = app => app?.element instanceof HTMLElement ? app.element : app?.element?.[0] ?? null;
const apps = () => [...(foundry.applications.instances?.values?.() ?? []), ...Object.values(ui.windows ?? {})];
const titled = t => apps().find(a => a.rendered && (a.title ?? a.options?.window?.title) === t);

export async function run() {
  const G = gate("gateplaypage", {stepTimeout: 120000});
  if ( game.world.id !== "rothenstein-wodx" ) { G.ok("1. world", false, {error: "Run this gate in rothenstein-wodx only"}); return G.save(); }
  const api = game.modules.get(C)?.api?.archive;
  const ch = game.modules.get(CH)?.api;
  const {getEngine} = await import(`/modules/${CH}/scripts/calendar.mjs`);
  const t0 = game.time.worldTime;
  const year = getEngine().timeToDate?.(t0)?.year ?? 1200;
  const at = y => getEngine().dateToTime({year: y, month: 3, day: 1, hour: 12});
  const saved = {held: !!ch?.isHeld?.(), archived: foundry.utils.deepClone(game.settings.get(C, "archived") ?? {}), auto: game.settings.get(C, "autoArchive")};
  const stored = key => game.settings.storage.get("world").getSetting?.(key) ?? null;
  const WRITTEN = [`${ST}.log`, `${CH}.nightWork`];
  const writtenBefore = Object.fromEntries(WRITTEN.map(k => [k, stored(k)?.toObject?.() ?? null]));
  const journalBefore = !!game.journal.find(j => j.getFlag?.(C, "kind") === "archive");
  const packBefore = !!game.packs.get("world.wodx-archive");
  const msgs0 = new Set(game.messages.map(m => m.id));
  const mine = new Set();
  let sheet = null;
  try {
    await ch?.hold?.(true);
    const scene = await G.scene();
    const deadFolder = game.folders.find(f => f.type === "Actor" && f.name === "WoDX · The Dead") ?? await G.make(Folder, {name: "WoDX · The Dead", type: "Actor"});
    const [vamp, gone, stays, old] = await G.make(Actor, [
      {name: `${TAG} vampire`, type: "Vampire", system: {background: "Embraced in Olomouc in the winter of 1150.", derangement: "Gate fixation",
        advantages: {bloodpool: {temporary: 7, max: 10}}}},
      {name: `${TAG} dead villager`, type: "Mortal", folder: deadFolder.id, flags: {[C]: {chronology: {bornYear: year - 40, died: at(year - 1), cause: "gate"}}}},
      {name: `${TAG} dead on the map`, type: "Mortal", folder: deadFolder.id, flags: {[C]: {chronology: {bornYear: year - 40, died: at(year - 1), cause: "gate"}}}},
      {name: `${TAG} long dead`, type: "Mortal", folder: deadFolder.id, flags: {[C]: {chronology: {bornYear: year - 60, died: at(year - 15), cause: "gate"}}}}]);
    for ( const a of [vamp, gone, stays, old] ) mine.add(a.id);
    await G.tokens(scene, [{actor: stays, x: 2, y: 2, actorLink: true}]);

    sheet = vamp.sheet;
    const page = () => elOf(sheet)?.querySelector(".wodx-page2");
    await G.step("1. the second page", async () => {
      await sheet.render(true);
      await waitFor(() => sheet.rendered && page(), 60000);
      const heads = [...(page()?.querySelectorAll(".headlineGroup") ?? [])].map(h => h.textContent.trim());
      const want = ["Combat", "Possessions", "Rituals", "Paths", "Derangements", "History and Description"];
      const text = page()?.textContent ?? "";
      G.ok("1. the second page", want.every(w => heads.includes(w)) && /Embraced in Olomouc/.test(text) && /Gate fixation/.test(text),
        {sheet: elOf(sheet)?.querySelector(".wodx-book")?.dataset?.sheet ?? null, heads});
    });

    let sword = null;
    await G.step("2. a sword shows on Combat", async () => {
      [sword] = await vamp.createEmbeddedDocuments("Item", [{name: "Gate sword", type: "Melee Weapon", system: {difficulty: 6, damage: {attribute: "strength", bonus: 2, type: "lethal"}}}]);
      await waitFor(() => page()?.querySelector(`.wodx-open[data-itemid="${sword.id}"]`), 20000);
      const row = page()?.querySelector(`.wodx-open[data-itemid="${sword.id}"]`)?.textContent ?? "";
      G.ok("2. a sword shows on Combat", /Gate sword \(.+\)/.test(row) && sheet.rendered, {row});
    });

    await G.step("3. clicking the sword's row opens it", async () => {
      page()?.querySelector(`.wodx-open[data-itemid="${sword.id}"]`)?.click();
      const opened = await waitFor(() => sword.sheet?.rendered, 15000);
      G.ok("3. clicking the sword's row opens it", opened && !!elOf(sword.sheet)?.textContent?.includes("Gate sword"), {opened});
      await sword.sheet?.close?.();
    });

    await G.step("4. Feed from the page", async () => {
      const before = Number(vamp.system.advantages?.bloodpool?.temporary) || 0;
      const btn = elOf(sheet)?.querySelector('.wodx-actions-row .wodx-roll[data-roll="feed"]');
      btn?.click();
      await waitFor(() => titled("WoDX Feed"), 15000);
      const dlg = titled("WoDX Feed");
      const take = elOf(dlg)?.querySelector("input[name=take]");
      if ( take ) take.value = "2";
      elOf(dlg)?.querySelector('button[data-action="ok"]')?.click();
      await waitFor(() => (Number(game.actors.get(vamp.id)?.system?.advantages?.bloodpool?.temporary) || 0) !== before, 20000);
      const after = Number(game.actors.get(vamp.id)?.system?.advantages?.bloodpool?.temporary) || 0;
      const isCard = m => !msgs0.has(m.id) && /feeds/.test(`${m.flavor ?? ""} ${m.content ?? ""}`) && `${m.flavor ?? ""} ${m.content ?? ""}`.includes(vamp.name);
      await waitFor(() => game.messages.find(isCard), 15000);
      const card = game.messages.find(m => !msgs0.has(m.id) && /feeds/.test(`${m.flavor ?? ""} ${m.content ?? ""}`) && `${m.flavor ?? ""} ${m.content ?? ""}`.includes(vamp.name));
      const fresh = game.messages.filter(m => !msgs0.has(m.id)).map(m => `${m.speaker?.alias ?? ""}: ${String(m.flavor ?? "").slice(0, 40)} ${String(m.content ?? "").replace(/<[^>]+>/g, " ").slice(0, 60)}`);
      G.ok("4. Feed from the page", !!btn && !!dlg && after === before + 2 && !!card, {button: !!btn, window: !!dlg, before, after, card: !!card, fresh: card ? undefined : fresh.slice(-3)});
    });
    await sheet.close(); sheet = null;

    let win = null;
    await G.step("5. Archive the ticked", async () => {
      await api.open();
      await waitFor(() => (win = titled("Archive of the dead")), 15000);
      const root = elOf(win);
      const box = id => root.querySelector(`input[name=pick][value="${id}"]`);
      const pick = box(gone.id), held = box(stays.id);
      if ( pick ) pick.checked = true;
      root.querySelector('button[type="submit"]')?.click();
      const indexed = () => (game.journal.find(x => x.getFlag?.(C, "kind") === "archive")?.pages?.getName("Index")?.text?.content ?? "").includes(`${TAG} dead villager`);
      await waitFor(() => !game.actors.get(gone.id) && indexed(), 60000);
      const pack = game.packs.get("world.wodx-archive");
      const inPack = !!(await pack?.getIndex())?.get(gone.id);
      const j = game.journal.find(x => x.getFlag?.(C, "kind") === "archive");
      const listed = (j?.pages?.getName("Index")?.text?.content ?? "").includes(`${TAG} dead villager`);
      G.ok("5. Archive the ticked", !!pick && !!held?.disabled && !game.actors.get(gone.id) && inPack && listed && !!game.actors.get(stays.id),
        {ticked: !!pick, staysDisabled: !!held?.disabled, inPack, listed, stays: !!game.actors.get(stays.id)});
    });

    await G.step("6. Bring back", async () => {
      await waitFor(() => elOf(win)?.querySelector(`[data-action="restore"][data-id="${gone.id}"]`), 15000);
      const t = Date.now();
      elOf(win)?.querySelector(`[data-action="restore"][data-id="${gone.id}"]`)?.click();
      // the actor comes back first; its archive entry and its line in the list go once the links are written again
      await waitFor(() => game.actors.get(gone.id) && !(game.settings.get(C, "archived") ?? {})[gone.id], 80000);
      const ms = Date.now() - t;
      const back = game.actors.get(gone.id);
      const pack = game.packs.get("world.wodx-archive");
      const inPack = !!(await pack.getIndex()).get(gone.id), listed = !!(game.settings.get(C, "archived") ?? {})[gone.id];
      G.ok("6. Bring back", !!back && back.folder?.name === "WoDX · The Dead" && !inPack && !listed, {back: !!back, folder: back?.folder?.name ?? null, inPack, listed, ms});
      await win?.close?.();
    });

    await G.step("7. the clock archives the long dead", async () => {
      await game.settings.set(C, "autoArchive", 10);
      // the clock looks once a world day, so step just past the next midnight (an earlier gate may have looked today)
      const step = 86400 - (((game.time.worldTime % 86400) + 86400) % 86400) + 60;
      const due = api.dueNow(game.time.worldTime + step, 10).map(c => c.id);
      const others = due.filter(id => !mine.has(id));
      if ( others.length ) return G.ok("7. the clock archives the long dead", false, {error: `${others.length} character(s) the gate did not make are due; not run`});
      await ch?.hold?.(false); await sleep(500);
      await game.time.advance(step);
      await waitFor(() => !game.actors.get(old.id), 30000);
      await ch?.hold?.(true);
      const pack = game.packs.get("world.wodx-archive");
      G.ok("7. the clock archives the long dead", due.includes(old.id) && !due.includes(gone.id) && !game.actors.get(old.id) && !!(await pack.getIndex()).get(old.id) && !!game.actors.get(gone.id),
        {due: due.length, gone: !game.actors.get(old.id)});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    try {
      await sheet?.close?.();
      await ch?.hold?.(true);
      if ( game.time.worldTime !== t0 ) { await game.time.set(t0); await sleep(500); }
      const pack = game.packs.get("world.wodx-archive");
      if ( pack ) {
        const idx = await pack.getIndex();
        const inPack = [...mine].filter(id => idx.get(id));
        if ( inPack.length ) await Actor.deleteDocuments(inPack, {pack: pack.collection});
      }
      await game.settings.set(C, "archived", saved.archived);
      await game.settings.set(C, "autoArchive", saved.auto);
      const p2 = game.packs.get("world.wodx-archive");
      if ( p2 && !packBefore && (await p2.getIndex()).size === 0 ) await p2.deleteCompendium?.();
      const j = game.journal.find(x => x.getFlag?.(C, "kind") === "archive");
      if ( j && !journalBefore ) await j.delete();
      else if ( j && game.packs.get("world.wodx-archive") ) await api.restore([]);
      // the gate's chat lines go first: deleting them can write to the Storyteller's log, which is put back after
      const ids = game.messages.filter(m => !msgs0.has(m.id)).map(m => m.id);
      if ( ids.length ) await ChatMessage.deleteDocuments(ids);
      // then the hold as it was: a released clock's catch-up writes its night work, which is put back after
      await ch?.hold?.(saved.held);
      await (ch?.nightwork ?? game.modules.get(CH)?.api?.nightwork)?.settle?.();
      await settle(() => WRITTEN.map(k => JSON.stringify(stored(k)?.value ?? null)).join());
      for ( const k of WRITTEN ) {
        const now = stored(k), was = writtenBefore[k];
        if ( !was && now ) await now.delete();
        else if ( was && now && JSON.stringify(now.value) !== JSON.stringify(was.value) ) await now.update({value: was.value});
        else if ( was && !now ) await game.settings.storage.get("world").documentClass.create(was);
      }
    } catch (e) { G.R.errors.push(`put back: ${e?.message ?? e}`); }
  }
  return G.finish();
}
