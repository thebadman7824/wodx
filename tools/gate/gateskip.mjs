/**
 * The 1197 to 2025 time-skip test, aging only its own five test characters, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateskip.mjs?${Date.now()}`)).run()
 * It holds the world, sets the clock to 1200 and passes the years to 2025 in six steps for the test cast alone
 * (WoDX Creation's skipCore with onlyCast), then puts the clock, era, era lock, hold, journals and chat back and
 * deletes every actor, folder and journal it made. Every character already in the world is fingerprinted before and
 * after, so the gate fails if any of them changed.
 *   1-n. the skip test's own checks (clock and era at each step, nothing lost, deaths by age, the ghoul, the bond, the elder's sheet)
 *   last. put back, and no existing character changed
 * Result: Data/wodx-gate/gateskip-result.json.
 */
const C = "wodx-creation", CH = "wodx-chronicle";
const chron = () => game.modules.get(CH).api;
const print = a => JSON.stringify({s: a.system, f: a.flags, folder: a.folder?.id ?? null, items: [...a.items].map(i => [i.id, i.name, i.system?.value])});

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const save = async () => {
    R.finished = new Date().toISOString();
    R.passed = R.steps.filter(s => s.pass).length; R.total = R.steps.length;
    const f = new File([JSON.stringify(R, null, 1)], "gateskip-result.json", {type: "application/json"});
    await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", f, {}, {notify: false});
    return `${R.passed}/${R.total} passed`;
  };
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(); }

  const start = {time: game.time.worldTime, era: game.settings.get(CH, "activeEra"), lock: game.settings.get(CH, "eraLock"), held: chron().isHeld()};
  const actorsBefore = new Map([...game.actors].map(a => [a.id, print(a)]));
  const foldersBefore = new Set(game.folders.map(f => f.id));
  const journalsBefore = new Set(game.journal.map(j => j.id));
  const pagesBefore = new Map(game.journal.map(j => [j.id, new Map([...j.pages].map(p => [p.id, p.text?.content ?? ""]))]));
  const msgsBefore = new Set(game.messages.map(m => m.id));
  await chron().hold(true);
  try {
    const {skipCore} = await import(`/modules/${C}/scripts/skip-test.mjs`);
    const out = await skipCore({onlyCast: true});
    out.results.forEach((r, i) => ok(`${i + 1}. ${r.name}`, r.pass, {seen: r.detail}));
    R.stepLog = out.stepLog;
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      // Actors first (sheets made here, snapshots, heirs), then journals and pages, folders, chat, and the clock
      const newActors = game.actors.filter(a => !actorsBefore.has(a.id)).map(a => a.id);
      if ( newActors.length ) await Actor.deleteDocuments(newActors);
      for ( const j of [...game.journal] ) {
        if ( !journalsBefore.has(j.id) ) { await j.delete(); continue; }
        const old = pagesBefore.get(j.id);
        const added = [...j.pages].filter(p => !old.has(p.id)).map(p => p.id);
        if ( added.length ) await j.deleteEmbeddedDocuments("JournalEntryPage", added);
        for ( const p of [...j.pages] ) if ( old.has(p.id) && (p.text?.content ?? "") !== old.get(p.id) ) await p.update({"text.content": old.get(p.id)});
      }
      const newFolders = game.folders.filter(f => !foldersBefore.has(f.id)).map(f => f.id);
      if ( newFolders.length ) await Folder.deleteDocuments(newFolders);
      if ( game.time.worldTime !== start.time ) await game.time.set(start.time);
      if ( game.settings.get(CH, "activeEra") !== start.era ) await game.settings.set(CH, "activeEra", start.era);
      if ( game.settings.get(CH, "eraLock") !== start.lock ) await game.settings.set(CH, "eraLock", start.lock);
      await new Promise(r => setTimeout(r, 800));
      const mine = game.messages.filter(m => !msgsBefore.has(m.id)).map(m => m.id);
      if ( mine.length ) await ChatMessage.deleteDocuments(mine);
      await chron().hold(start.held);
      await game.modules.get(C)?.api?.writeLineageJournal?.();
      const changed = [...game.actors].filter(a => actorsBefore.get(a.id) !== print(a)).map(a => a.name);
      const gone = [...actorsBefore.keys()].filter(id => !game.actors.get(id));
      ok(`${R.steps.length + 1}. put back, and no existing character changed`, game.time.worldTime === start.time && game.settings.get(CH, "activeEra") === start.era
        && chron().isHeld() === start.held && !changed.length && !gone.length && !game.actors.some(a => !actorsBefore.has(a.id)),
        {worldTime: game.time.worldTime, startTime: start.time, era: game.settings.get(CH, "activeEra"), startEra: start.era, changed, gone, removedCards: mine.length, removedActors: newActors.length});
    } catch (err) { ok("put back", false, {error: err.message}); }
  }
  return save();
}
