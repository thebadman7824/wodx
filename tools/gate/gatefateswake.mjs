/**
 * Gate: an NPC in torpor wakes when a year passes (npc.fates), on its real trigger, in rothenstein-wodx only, as
 * Gamemaster Test:
 *   await (await import(`/wodx-gate/gatefateswake.mjs?${Date.now()}`)).run()
 * Off-screen lives (setting npcFates) run on a skip's end: a skip of a year or more makes one approval card for the
 * Storyteller. Pass the Years only passes whole years, so this is the way a sleeper wakes in play.
 *   1. the sleeper's sheet shows Torpor; Pass the years from the Creation window, 1 year, every row unticked, Yes (and
 *      Approve on the Off-screen lives card, should one come); the sleeper's sheet no longer shows Torpor
 * The world is released for the skip (a held world runs no skip hooks), so every module's year work runs: it is a
 * heavy gate. Everything is put back: the clock, the hold, the era, npcFates, the brood and approvals settings, every
 * character's data and effects as they were, new actors, folders, journals and chat, the Storyteller's log and
 * Chronicle's night work.
 * Result: Data/wodx-gate/gatefateswake-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const C = "wodx-creation", CH = "wodx-chronicle", NPC = "wodx-npc";
const NAME = "Gate Fates Sleeper";
const YEAR = 365.25 * 86400;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const elOf = app => app?.element instanceof HTMLElement ? app.element : app?.element?.[0] ?? null;
const apps = () => [...new Set([...(foundry.applications.instances?.values?.() ?? []), ...Object.values(ui.windows ?? {})])];
const titled = t => apps().find(a => a.rendered && (a.title ?? a.options?.window?.title) === t);

export async function run() {
  const G = gate("gatefateswake", {stepTimeout: 1500000});
  if ( game.world.id !== "rothenstein-wodx" ) { G.ok("1. world", false, {error: "Run this gate in rothenstein-wodx only"}); return G.finish(); }
  const api = game.modules.get(C)?.api, ch = game.modules.get(CH)?.api;
  const SETTINGS = [[NPC, "npcFates"], [NPC, "brood"], [CH, "approvals"], [CH, "activeEra"], [CH, "eraLock"]];
  const start = {time: game.time.worldTime, held: !!ch?.isHeld?.(), settings: SETTINGS.map(([m, k]) => [m, k, foundry.utils.deepClone(game.settings.get(m, k))])};
  const dataBefore = new Map([...game.actors].map(a => [a.id, a.toObject()]));
  const foldersBefore = new Set(game.folders.map(f => f.id));
  const journalsBefore = new Set(game.journal.map(j => j.id));
  const pagesBefore = new Map(game.journal.map(j => [j.id, new Map([...j.pages].map(p => [p.id, p.text?.content ?? ""]))]));
  const msgs0 = new Set(game.messages.map(m => m.id));
  const stored = key => game.settings.storage.get("world").getSetting?.(key) ?? null;
  const WRITTEN = ["wodx-storyteller.log", `${CH}.nightWork`];
  const writtenBefore = Object.fromEntries(WRITTEN.map(k => [k, stored(k)?.toObject?.() ?? null]));
  let creation = null, win = null, queue = null, sleeper = null, sheet = null;
  try {
    await G.step("1. a year passes and the sleeper's sheet no longer shows Torpor", async () => {
      await ch.hold(true);
      await game.settings.set(NPC, "npcFates", true);
      // the sleeper: an NPC vampire in torpor since twenty years ago, whose sleep ends within the coming year
      sleeper = await G.make(Actor, {name: NAME, type: "Vampire", system: {generation: 10}});
      await sleep(1000);
      await api.lineage.setChronology(sleeper, {embraced: game.time.worldTime - 120 * YEAR,
        torpor: {from: game.time.worldTime - 20 * YEAR, to: game.time.worldTime + 0.3 * YEAR}});
      await ch.conditions.setCondition(game.actors.get(sleeper.id), "torpor", true);
      // what the Storyteller sees on the sleeper's sheet
      sheet = game.actors.get(sleeper.id).sheet;
      const conds = () => [...(elOf(sheet)?.querySelectorAll(".wodx-cond") ?? [])].map(e => e.textContent.trim());
      await sheet.render({force: true});
      await waitFor(() => conds().length, 30000);
      const before = conds();
      // the trigger: Pass the years from the Creation window, one year, with every character's own changes unticked. The
      // world stays held while the plan is made (a running clock makes the window plan again), and is released at the
      // question, before Yes: a skip in a held world runs no skip hooks
      try { await ui.controls?.activate?.({control: "tokens"}); } catch {}
      const tool = document.querySelector("#scene-controls [data-tool='wodxCreation'], [data-tool='wodxCreation'], button[data-tool-name='wodxCreation']");
      if ( tool ) tool.click(); else { G.R.notes.push("no scene control button for Creation; opened it with its api"); await api.open(); }
      await waitFor(() => (creation = titled("Creation and experience")), 15000);
      elOf(creation)?.querySelector('button[data-action="passYears"]')?.click();
      await waitFor(() => (win = apps().find(a => a.rendered && a.id === "wodx-pass-years")), 15000);
      const box = elOf(win)?.querySelector("input[name=years]");
      if ( box ) { box.value = "1"; box.dispatchEvent(new Event("change", {bubbles: true})); }
      elOf(win)?.querySelector('button[data-action="plan"]')?.click();
      // the plan is drawn when the Pass the years button comes on
      await waitFor(() => win.plan && elOf(win)?.querySelector('button[data-action="apply"]:not([disabled])'), 180000);
      for ( const el of elOf(win).querySelectorAll("input[name^='accept.']") ) el.checked = false;
      const y0 = api.time.yearOf(game.time.worldTime);
      const applyBtn = elOf(win).querySelector('button[data-action="apply"]');
      const how = {window: !!win, plan: !!win?.plan, rows: win?.plan?.rows?.length ?? null, toYear: win?.plan?.toYear ?? null, apply: !!applyBtn, disabled: !!applyBtn?.disabled};
      applyBtn?.click();
      let ask = null;
      await waitFor(() => (ask = apps().find(a => a.rendered && a !== win && (a.title ?? a.options?.window?.title) === "Pass the years")), 15000);
      how.ask = !!ask; how.askButtons = [...(elOf(ask)?.querySelectorAll("button") ?? [])].map(b => b.dataset.action ?? b.textContent.trim());
      await ch.hold(false); await sleep(1500);
      elOf(ask)?.querySelector('button[data-action="yes"]')?.click();
      if ( !ask ) throw new Error(`no question after Pass the years: ${JSON.stringify(how)}`);
      await waitFor(() => api.time.yearOf(game.time.worldTime) >= y0 + 1 && !win.plan, 900000);
      if ( api.time.yearOf(game.time.worldTime) < y0 + 1 ) throw new Error(`the year did not pass: ${JSON.stringify(how)}`);
      // A whole calendar year is a day short of the 365.25 days off-screen lives counts as a year, so a one-year Pass
      // the years wakes the sleepers whose time is up at once (#2627). Should it make the Off-screen lives card
      // instead, the Storyteller approves it in the approvals queue
      const entry = () => ch.approvals.pending().find(p => String(p.key ?? "").startsWith("npc-fates:") && (p.data?.changes ?? {})[sleeper.id]?.wake);
      await waitFor(() => entry() || !game.actors.get(sleeper.id)?.getFlag(C, "chronology")?.torpor, 120000);
      const queued = !!entry();
      let pressed = false;
      if ( queued ) {
        queue = ch.approvals.ApprovalsApp.open();
        await Promise.race([queue, sleep(20000)]);
        const btn = () => [...document.querySelectorAll(`#wodx-approvals button[data-action="approve"]`)].find(x => x.dataset.id === entry()?.id) ?? null;
        await waitFor(btn, 30000);
        pressed = !!btn();
        btn()?.click();
        await waitFor(() => !entry(), 300000);
      }
      await sheet.render({force: true});
      await waitFor(() => !conds().includes("Torpor"), 60000);
      const after = conds();
      G.ok("1. a year passes and the sleeper's sheet no longer shows Torpor",
        before.includes("Torpor") && (!queued || pressed) && !after.includes("Torpor") && !game.actors.get(sleeper.id)?.getFlag(C, "chronology")?.torpor,
        {before, queued, pressed, after, year: [y0, api.time.yearOf(game.time.worldTime)]});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    try {
      for ( const w of [sheet, win, creation] ) { try { await w?.close?.(); } catch {} }
      try { (await queue)?.close?.(); } catch {}
      await ch.hold(true);
      if ( game.time.worldTime !== start.time ) await game.time.set(start.time);
      for ( const [m, k, v] of start.settings ) await game.settings.set(m, k, v);
      const newActors = game.actors.filter(a => !dataBefore.has(a.id)).map(a => a.id);
      if ( newActors.length ) await Actor.deleteDocuments(newActors);
      // every character the year changed (the year's work, the approved card) gets its data and effects back
      let back = 0;
      for ( const a of [...game.actors] ) {
        const was = dataBefore.get(a.id);
        if ( !was ) continue;
        const now = a.toObject();
        if ( JSON.stringify([now.system, now.flags, now.folder, now.effects]) === JSON.stringify([was.system, was.flags, was.folder, was.effects]) ) continue;
        back++;
        await a.update({system: was.system, flags: was.flags, folder: was.folder}, {diff: false, recursive: false, wodxQuiet: true, wodxGateTidy: true});
        const keep = new Set(was.effects.map(e => e._id));
        const extra = a.effects.filter(e => !keep.has(e.id)).map(e => e.id);
        if ( extra.length ) await a.deleteEmbeddedDocuments("ActiveEffect", extra, {wodxQuiet: true});
        const have = new Set(a.effects.map(e => e.id));
        const lost = was.effects.filter(e => !have.has(e._id));
        if ( lost.length ) await a.createEmbeddedDocuments("ActiveEffect", lost, {keepId: true, wodxQuiet: true});
      }
      G.R.notes.push(`${back} character(s) put back`);
      for ( const j of [...game.journal] ) {
        if ( !journalsBefore.has(j.id) ) { await j.delete(); continue; }
        const old = pagesBefore.get(j.id);
        const added = [...j.pages].filter(p => !old.has(p.id)).map(p => p.id);
        if ( added.length ) await j.deleteEmbeddedDocuments("JournalEntryPage", added);
        for ( const p of [...j.pages] ) if ( old.has(p.id) && (p.text?.content ?? "") !== old.get(p.id) ) await p.update({"text.content": old.get(p.id)});
      }
      const newFolders = game.folders.filter(f => !foldersBefore.has(f.id)).map(f => f.id);
      if ( newFolders.length ) await Folder.deleteDocuments(newFolders);
      const ids = game.messages.filter(m => !msgs0.has(m.id)).map(m => m.id);
      if ( ids.length ) await ChatMessage.deleteDocuments(ids);
    } catch (e) { G.R.errors.push(`put back: ${e?.message ?? e}`); }
  }
  try { await G.cleanup(); } catch (e) { G.R.errors.push(`cleanup: ${e?.message ?? e}`); }
  await ch?.hold?.(start.held);
  await sleep(3000);
  try {
    for ( const k of WRITTEN ) {
      const now = stored(k), was = writtenBefore[k];
      if ( !was && now ) await now.delete();
      else if ( was && now && JSON.stringify(now.value) !== JSON.stringify(was.value) ) await now.update({value: was.value});
      else if ( was && !now ) await game.settings.storage.get("world").documentClass.create(was);
    }
  } catch (e) { G.R.errors.push(`put back settings: ${e?.message ?? e}`); }
  return G.finish();
}
