/**
 * Gate: the era skip on its real trigger (Master Plan gap item, B83), in rothenstein-wodx only, as Gamemaster Test.
 * gateera plans and applies the skip with the module's functions; this gate opens the Pass the years window from the
 * Creation window and presses its own buttons, as a Storyteller does.
 *   1. the Creation window opens from its scene control button; its Pass the years button opens the Pass the years window
 *   2. 640 years typed and Show what happens pressed: the plan runs 1200 to 1840, Dark Ages to Victorian, with a row
 *      for each test character, the Road's pick offered for the vampire, and the old mortal's death ticked
 *   3. Pass the years pressed (every row but the test characters' unticked first) and Yes in its question: the clock
 *      stands in 1840 and the era is Victorian; the vampire's sheet has Firearms 3 for Archery 3, the Path of
 *      Honorable Accord at the same rating and 10 experience; the mortal is dead of age
 *   4. the Time Skips journal has the 1200 to 1840 page with the pick, and the window is ready for a new plan
 *   5. put back: the clock, the era, the era lock, the house rules, the hold and the test characters, and no
 *      character the gate did not make has changed
 * Every character already in the world is fingerprinted before and after. The years awake and the era history the
 * skip writes on each of them are put back as they were.
 */
import {gate, waitFor} from "./kit.mjs";

const C = "wodx-creation", CH = "wodx-chronicle";
const TAG = "Gate pass years";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const elOf = app => app?.element instanceof HTMLElement ? app.element : app?.element?.[0] ?? null;
const apps = () => [...new Set([...(foundry.applications.instances?.values?.() ?? []), ...Object.values(ui.windows ?? {})])];
const titled = t => apps().find(a => a.rendered && (a.title ?? a.options?.window?.title) === t);
const sorted = v => Array.isArray(v) ? v.map(sorted) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sorted(v[k])])) : v;
const shape = a => ({s: a.system, f: a.flags, folder: a.folder?.id ?? null, items: [...a.items].map(i => [i.id, i.name, i.system?.value])});
const print = a => JSON.stringify(sorted(shape(a)));
/** The paths that differ between two plain objects, a few at most. */
function paths(a, b, at = "", out = []) {
  if ( out.length >= 6 ) return out;
  if ( a && b && typeof a === "object" && typeof b === "object" ) {
    for ( const k of new Set([...Object.keys(a), ...Object.keys(b)]) ) paths(a[k], b[k], at ? `${at}.${k}` : k, out);
  } else if ( JSON.stringify(a) !== JSON.stringify(b) ) out.push(at);
  return out;
}
const RULES = {yearsThickBlood: false, yearsMortalDecline: true, yearsMoralityDrift: false, yearsExperience: true, yearsConvertAbilities: true};

export async function run() {
  const G = gate("gatepassyears", {stepTimeout: 540000});
  if ( game.world.id !== "rothenstein-wodx" ) { G.ok("1. world", false, {error: "Run this gate in rothenstein-wodx only"}); return G.save(); }
  const api = game.modules.get(C)?.api;
  const ch = game.modules.get(CH)?.api;
  const start = {time: game.time.worldTime, era: game.settings.get(CH, "activeEra"), lock: game.settings.get(CH, "eraLock"), held: !!ch?.isHeld?.(),
    rules: Object.fromEntries(Object.keys(RULES).map(k => [k, game.settings.get(CH, `rule.${k}`)]))};
  const actorsBefore = new Map([...game.actors].map(a => [a.id, print(a)]));
  const shapesBefore = new Map([...game.actors].map(a => [a.id, foundry.utils.deepClone(shape(a))]));
  const dataBefore = new Map([...game.actors].map(a => [a.id, a.toObject()]));
  const chronoBefore = new Map([...game.actors].map(a => [a.id, foundry.utils.deepClone(a.flags?.[C]?.chronology ?? null)]));
  const foldersBefore = new Set(game.folders.map(f => f.id));
  const journalsBefore = new Set(game.journal.map(j => j.id));
  const pagesBefore = new Map(game.journal.map(j => [j.id, new Map([...j.pages].map(p => [p.id, p.text?.content ?? ""]))]));
  const msgs0 = new Set(game.messages.map(m => m.id));
  // the clock and the chat lines write these two world settings; they are put back as they were
  const stored = key => game.settings.storage.get("world").getSetting?.(key) ?? null;
  const WRITTEN = ["wodx-storyteller.log", `${CH}.nightWork`];
  const writtenBefore = Object.fromEntries(WRITTEN.map(k => [k, stored(k)?.toObject?.() ?? null]));
  let creation = null, win = null, vamp = null, mortal = null;
  try {
    await ch?.hold?.(true);
    for ( const [k, v] of Object.entries(RULES) ) if ( game.settings.get(CH, `rule.${k}`) !== v ) await game.settings.set(CH, `rule.${k}`, v);
    if ( start.era !== "dark-ages" ) await game.settings.set(CH, "activeEra", "dark-ages");
    const from = api.time.addYears(game.time.worldTime, 1200 - api.time.yearOf(game.time.worldTime));
    if ( from !== game.time.worldTime ) await game.time.set(from);
    await G.scene();
    [vamp, mortal] = await G.make(Actor, [
      {name: `${TAG} vampire`, type: "Vampire", system: {generation: 10, advantages: {path: {permanent: 6, custom: "Road of Kings"}}}},
      {name: `${TAG} mortal`, type: "Mortal"}]);
    await sleep(1500);
    await api.lineage.setChronology(vamp, {embraced: api.time.addYears(game.time.worldTime, -50)});
    await api.lineage.setChronology(mortal, {bornYear: 1170});
    const archery = vamp.items.find(i => i.type === "Trait" && /archery/i.test(i.name));
    if ( archery ) await archery.update({"system.value": 3});
    else await vamp.createEmbeddedDocuments("Item", [{name: game.i18n.localize("wod.abilities.archery"), type: "Trait", system: {type: "wod.types.skillsecondability", value: 3, max: 5}}]);

    await G.step("1. the Pass the years window from its button", async () => {
      try { await ui.controls?.activate?.({control: "tokens"}); } catch {}
      await sleep(300);
      const tool = document.querySelector("#scene-controls [data-tool='wodxCreation'], [data-tool='wodxCreation'], button[data-tool-name='wodxCreation']");
      let how = "button";
      if ( tool ) tool.click();
      else { how = "api"; G.R.notes.push("no scene control button for Creation found; opened it with its api"); await api.open(); }
      await waitFor(() => (creation = titled("Creation and experience")), 15000);
      const btn = elOf(creation)?.querySelector('button[data-action="passYears"]');
      btn?.click();
      await waitFor(() => (win = apps().find(a => a.rendered && a.id === "wodx-pass-years")), 15000);
      G.ok("1. the Pass the years window from its button", !!creation && !!btn && !!win, {opened: how, creation: !!creation, button: !!btn, window: !!win});
    });

    // the vampire's row has two picks (the Ability's new name and the Road); the Road's offers Honorable Accord
    const roadOf = () => [...(elOf(win)?.querySelectorAll(`select[name^="choice.${vamp.id}."]`) ?? [])].find(x => [...x.options].some(o => o.value === "accord")) ?? null;
    const rowOf = id => elOf(win)?.querySelector(`input[name^="accept.${id}."]`)?.closest("tr") ?? null;
    await G.step("2. Show what happens", async () => {
      const box = elOf(win)?.querySelector("input[name=years]");
      if ( box ) { box.value = "640"; box.dispatchEvent(new Event("change", {bubbles: true})); }
      elOf(win)?.querySelector('button[data-action="plan"]')?.click();
      await waitFor(() => rowOf(vamp.id) && rowOf(mortal.id), 60000);
      const road = roadOf();
      const death = [...(rowOf(mortal.id)?.querySelectorAll("label") ?? [])].find(l => /Dies of age/.test(l.textContent))?.querySelector("input");
      const plan = win.plan;
      G.ok("2. Show what happens", plan?.fromYear === 1200 && plan?.toYear === 1840 && plan?.toEra?.id === "victorian"
        && [...(road?.options ?? [])].map(o => o.value).join() === "innervoice,accord" && !!death?.checked,
        {from: plan?.fromYear, to: plan?.toYear, toEra: plan?.toEra?.id, road: [...(road?.options ?? [])].map(o => o.value), deathTicked: !!death?.checked, rows: plan?.rows?.length});
    });

    await G.step("3. Pass the years", async () => {
      const root = elOf(win);
      // every character the gate did not make stays as it is: its changes are unticked, as a Storyteller may
      for ( const el of root.querySelectorAll("input[name^='accept.']") ) {
        const id = el.name.split(".")[1];
        if ( id !== vamp.id && id !== mortal.id ) el.checked = false;
      }
      const road = roadOf();
      if ( road ) { road.value = "accord"; road.dispatchEvent(new Event("change", {bubbles: true})); }
      root.querySelector('button[data-action="apply"]')?.click();
      let ask = null;
      await waitFor(() => (ask = apps().find(a => a.rendered && a !== win && (a.title ?? a.options?.window?.title) === "Pass the years")), 15000);
      elOf(ask)?.querySelector('button[data-action="yes"]')?.click();
      // every character in the world gets its years written, so a full world takes minutes
      await waitFor(() => api.time.yearOf(game.time.worldTime) === 1840 && !win.plan, 480000);
      await sleep(1000);
      const v = game.actors.get(vamp.id), m = game.actors.get(mortal.id);
      const arch = v?.items.find(i => i.type === "Trait" && /archery/i.test(i.name));
      const seen = {question: !!ask, year: api.time.yearOf(game.time.worldTime), era: game.settings.get(CH, "activeEra"),
        firearms: v?.system?.abilities?.firearms?.value, archery: arch?.system?.value, path: v?.system?.advantages?.path?.label,
        rating: v?.system?.advantages?.path?.permanent, xp: v?.items.filter(i => i.type === "Experience").map(i => i.system.amount) ?? [],
        mortalDied: m?.getFlag(C, "chronology")?.died != null};
      G.ok("3. Pass the years", seen.question && seen.year === 1840 && seen.era === "victorian" && seen.firearms === 3 && seen.archery === 0
        && seen.path === "wod.advantages.path.accord" && seen.rating === 6 && seen.xp.includes(10) && seen.mortalDied, seen);
    });

    await G.step("4. the Time Skips page and a fresh window", async () => {
      const pageOf = () => game.journal.find(x => x.getFlag(C, "kind") === "time-skips")?.pages.find(p => p.name === "1200 to 1840");
      await waitFor(() => pageOf() && elOf(win)?.querySelector('button[data-action="apply"][disabled]'), 60000);
      const page = pageOf();
      const fresh = !!elOf(win)?.querySelector('button[data-action="apply"][disabled]');
      G.ok("4. the Time Skips page and a fresh window", /Path of Honorable Accord/.test(page?.text?.content ?? "") && (page?.text?.content ?? "").includes(vamp.name) && fresh,
        {page: page?.name ?? null, fresh});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    try {
      for ( const w of apps().filter(a => a.rendered && ["Pass the years", "WoDX Time Skips", "WoDX Lineage"].includes(a.title ?? a.options?.window?.title)) ) await w.close?.();
      await win?.close?.(); await creation?.close?.();
      // Actors first (the test characters and their snapshots), then journals and pages, folders, chat
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
      // the clock and the era first: a sheet updated while the era is still Victorian works its maxima out for that era
      if ( game.time.worldTime !== start.time ) await game.time.set(start.time);
      if ( game.settings.get(CH, "activeEra") !== start.era ) await game.settings.set(CH, "activeEra", start.era);
      if ( game.settings.get(CH, "eraLock") !== start.lock ) await game.settings.set(CH, "eraLock", start.lock);
      for ( const [k, v] of Object.entries(start.rules) ) if ( game.settings.get(CH, `rule.${k}`) !== v ) await game.settings.set(CH, `rule.${k}`, v);
      await sleep(1500);
      // the years awake and the era history written on every character: put back as they were
      const back = [];
      for ( const a of game.actors ) {
        if ( !chronoBefore.has(a.id) ) continue;
        const was = chronoBefore.get(a.id), now = a.flags?.[C]?.chronology ?? null;
        if ( JSON.stringify(was) === JSON.stringify(now) ) continue;
        back.push(a.id);
        // a character with no Creation flags before the skip gets none back, not an empty set
        if ( shapesBefore.get(a.id)?.f?.[C] === undefined ) { await a.update({[`flags.-=${C}`]: null}, {wodxQuiet: true}); continue; }
        await a.update({[`flags.${C}.-=chronology`]: null}, {wodxQuiet: true});
        if ( was !== null ) await a.update({[`flags.${C}.chronology`]: was}, {wodxQuiet: true});
      }
      G.R.notes.push(`chronology put back on ${back.length} character(s)`);
      // a sheet the system works over on any update (its maxima, its health levels) gets its own figures back, as run-gate does
      const sheets = [];
      for ( const a of game.actors ) {
        const was = shapesBefore.get(a.id)?.s;
        if ( !was || JSON.stringify(sorted(a.system)) === JSON.stringify(sorted(was)) ) continue;
        sheets.push(a.name);
        await a.update({system: was}, {diff: false, recursive: false, wodxGateTidy: true, wodxQuiet: true});
      }
      if ( sheets.length ) G.R.notes.push(`sheet figures put back on ${sheets.length}: ${sheets.slice(0, 5).join(", ")}`);
      await sleep(800);
      const ids = game.messages.filter(m => !msgs0.has(m.id)).map(m => m.id);
      if ( ids.length ) await ChatMessage.deleteDocuments(ids);
    } catch (e) { G.R.errors.push(`put back: ${e?.message ?? e}`); }
  }
  try { await G.cleanup(); } catch (e) { G.R.errors.push(`cleanup: ${e?.message ?? e}`); }
  await ch?.hold?.(start.held);
  await sleep(1500);
  try {
    for ( const k of WRITTEN ) {
      const now = stored(k), was = writtenBefore[k];
      if ( !was && now ) await now.delete();
      else if ( was && now && JSON.stringify(now.value) !== JSON.stringify(was.value) ) await now.update({value: was.value});
      else if ( was && !now ) await game.settings.storage.get("world").documentClass.create(was);
    }
  } catch (e) { G.R.errors.push(`put back settings: ${e?.message ?? e}`); }
  const changedIds = [...actorsBefore].filter(([id, p]) => !game.actors.get(id) || print(game.actors.get(id)) !== p).map(([id]) => id);
  // A sheet whose stored figures the system works out again on any update at all (stale maxima, health levels) is
  // not changed by the skip: a copy made from its data before the gate, updated once, must match it exactly
  const settled = [];
  for ( const id of [...changedIds] ) {
    const a = game.actors.get(id), was = dataBefore.get(id);
    if ( !a || !was ) continue;
    const onlySystem = JSON.stringify(sorted({...shape(a), s: null})) === JSON.stringify(sorted({...shapesBefore.get(id), s: null}));
    if ( !onlySystem ) continue;
    let copy = null;
    try {
      const data = foundry.utils.deepClone(was);
      delete data._id; data.name = `${TAG} copy of ${a.name}`; data.folder = null;
      copy = await Actor.create(data, {wodxQuiet: true});
      await copy.update({"flags.world.wodxGateTouch": 1}, {wodxQuiet: true});
      await sleep(300);
      if ( JSON.stringify(sorted(copy.system)) === JSON.stringify(sorted(a.system)) ) { settled.push(a.name); changedIds.splice(changedIds.indexOf(id), 1); }
    } catch (e) { G.R.notes.push(`copy check ${a.name}: ${e?.message ?? e}`); }
    finally { await copy?.delete?.(); }
  }
  if ( settled.length ) G.R.notes.push(`${settled.length} sheet(s) the system works over on any update, not the skip: ${settled.join(", ")}`);
  const changed = changedIds.map(id => game.actors.get(id)?.name ?? id);
  const how = changedIds.slice(0, 3).map(id => game.actors.get(id) ? paths(shapesBefore.get(id), foundry.utils.deepClone(shape(game.actors.get(id)))) : ["gone"]);
  G.ok("5. put back, and no other character changed", game.time.worldTime === start.time && game.settings.get(CH, "activeEra") === start.era
    && game.settings.get(CH, "eraLock") === start.lock && !!ch?.isHeld?.() === start.held && !game.actors.get(vamp?.id) && !game.actors.get(mortal?.id) && !changed.length,
    {worldTime: game.time.worldTime, startTime: start.time, settled, changed: changed.slice(0, 10), changedCount: changed.length, how});
  return G.save();
}
