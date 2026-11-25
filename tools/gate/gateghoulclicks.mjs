/**
 * Gate: a mortal made a ghoul through the clicks a table makes (Master Plan gap item, V20 Dark Ages p. 399 and
 * pp. 341-342), in rothenstein-wodx only, as Gamemaster Test. gatedalines step 3 drives the same window but checks
 * a refusal; this gate checks an ordinary ghouling and its bond end to end, in the Dark Ages.
 *   1. the Creation window opens from its scene control button, and its Give vitae button opens the Give vitae window
 *   2. Drink, 2 points: the mortal's sheet becomes a ghoul's (Potence 1, a pool of 10 holding 2, the vampire as
 *      domitor, one drink toward the oath), the vampire's own pool is untouched, and a vitae card names them both
 *   3. the ghoul's sheet opens as the Dark Ages ghoul sheet, with the domitor's name and the Vitae button
 *   4. a second drink the same night (1 point): the pool holds 3 and the bond does not deepen
 *   5. the clock moves on a night and a third drink (1 point) deepens the bond to two drinks; the pool holds 4
 * At the end: the test characters, the chat cards, the Lineage journal, the era, the hold and the clock go back.
 */
import {gate, waitFor} from "./kit.mjs";

const C = "wodx-creation", CH = "wodx-chronicle";
const TAG = "Gate ghoul clicks";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const elOf = app => app?.element instanceof HTMLElement ? app.element : app?.element?.[0] ?? null;
const apps = () => [...new Set([...(foundry.applications.instances?.values?.() ?? []), ...Object.values(ui.windows ?? {})])];
const titled = t => apps().find(a => a.rendered && (a.title ?? a.options?.window?.title) === t);
const lineage = a => foundry.utils.deepClone(game.actors.get(a.id)?.getFlag?.(C, "lineage") ?? {});
const pool = a => game.actors.get(a.id)?.system?.advantages?.bloodpool ?? {};
const text = m => `${m.flavor ?? ""} ${m.content ?? ""}`.replace(/<[^>]+>/g, " ");

/** The Creation window: its scene control button when the Token controls show it, else the module's own opener. */
async function openCreation(G) {
  try { await ui.controls?.activate?.({control: "tokens"}); } catch {}
  await sleep(300);
  const btn = document.querySelector("#scene-controls [data-tool='wodxCreation'], [data-tool='wodxCreation'], button[data-tool-name='wodxCreation']");
  let how = "button";
  if ( btn ) btn.click();
  else { how = "api"; G.R.notes.push("no scene control button for Creation found; opened it with its api"); await game.modules.get(C).api.open(); }
  let w = null;
  await waitFor(() => (w = titled("Creation and experience")), 15000);
  return {w, how};
}

/** Press Give vitae in the Creation window, fill the window it opens, press Drink; true once the window was seen. */
async function drink(creation, {drinker, regnant, points}) {
  elOf(creation)?.querySelector('button[data-action="vitae"]')?.click();
  let d = null;
  await waitFor(() => (d = titled("Give vitae")), 15000);
  const root = elOf(d);
  if ( !root ) return false;
  for ( const [k, v] of Object.entries({drinker, regnant, points}) ) {
    const f = root.querySelector(`[name="${k}"]`);
    if ( !f ) continue;
    f.value = String(v);
    f.dispatchEvent(new Event("change", {bubbles: true}));
  }
  root.querySelector('button[data-action="ok"]')?.click();
  await waitFor(() => !d.rendered, 15000);
  return true;
}

export async function run() {
  const G = gate("gateghoulclicks", {stepTimeout: 90000});
  if ( game.world.id !== "rothenstein-wodx" ) { G.ok("1. world", false, {error: "Run this gate in rothenstein-wodx only"}); return G.save(); }
  const ch = game.modules.get(CH)?.api;
  const saved = {held: !!ch?.isHeld?.(), era: game.settings.get(CH, "activeEra")};
  const lineageJ = game.journal.find(j => j.getFlag?.(C, "kind") === "lineage");
  const lineagePages = lineageJ ? new Map([...lineageJ.pages].map(p => [p.id, p.text?.content ?? ""])) : null;
  const msgs0 = new Set(game.messages.map(m => m.id));
  // the clock's night and the chat lines write these two world settings; they are put back as they were
  const stored = key => game.settings.storage.get("world").getSetting?.(key) ?? null;
  const WRITTEN = ["wodx-storyteller.log", `${CH}.nightWork`];
  const writtenBefore = Object.fromEntries(WRITTEN.map(k => [k, stored(k)?.toObject?.() ?? null]));
  let creation = null, sheet = null;
  try {
    await ch?.hold?.(true);
    if ( saved.era !== "dark-ages" ) await game.settings.set(CH, "activeEra", "dark-ages");
    await G.scene();
    const [vamp, mortal] = await G.make(Actor, [
      {name: `${TAG} domitor`, type: "Vampire", system: {generation: 10, advantages: {bloodpool: {temporary: 8, max: 13}}}},
      {name: `${TAG} servant`, type: "Mortal"}]);
    await sleep(1500);
    const vampPool0 = Number(pool(vamp).temporary) || 0;

    await G.step("1. Creation window and Give vitae", async () => {
      const o = await openCreation(G);
      creation = o.w;
      const btn = elOf(creation)?.querySelector('button[data-action="vitae"]');
      G.ok("1. Creation window and Give vitae", !!creation && !!btn, {opened: o.how, window: !!creation, button: !!btn});
    });

    await G.step("2. Drink makes a ghoul", async () => {
      const t = Date.now();
      const seen = await drink(creation, {drinker: mortal.id, regnant: vamp.id, points: 2});
      await waitFor(() => game.actors.get(mortal.id)?.system?.settings?.variant === "ghoul" && lineage(mortal).bonds?.[vamp.id], 20000);
      await waitFor(() => game.messages.find(m => !msgs0.has(m.id) && /becomes a ghoul/.test(text(m))), 15000);
      const m = game.actors.get(mortal.id);
      const potence = m.items.find(i => /^potence$/i.test(i.name));
      const l = lineage(mortal), p = pool(mortal);
      const card = game.messages.find(m2 => !msgs0.has(m2.id) && /becomes a ghoul/.test(text(m2)));
      const seenV = {variant: m.system.settings?.variant, potence: Number(potence?.system?.value ?? -1), max: Number(p.max), held: Number(p.temporary),
        domitor: l.domitor?.id === vamp.id, drinks: l.bonds?.[vamp.id]?.drinks ?? null, ghouled: m.getFlag(C, "chronology")?.ghouled !== undefined,
        vampPool: Number(pool(vamp).temporary) || 0, card: !!card && text(card).includes(vamp.name) && text(card).includes(mortal.name), ms: Date.now() - t};
      G.ok("2. Drink makes a ghoul", seen && seenV.variant === "ghoul" && seenV.potence === 1 && seenV.max === 10 && seenV.held === 2 && seenV.domitor
        && seenV.drinks === 1 && seenV.ghouled && seenV.vampPool === vampPool0 && seenV.card, {window: seen, ...seenV});
    });

    await G.step("3. the ghoul's sheet", async () => {
      sheet = game.actors.get(mortal.id).sheet;
      await sheet.render(true);
      await waitFor(() => sheet.rendered && elOf(sheet)?.querySelector(".wodx-book"), 60000);
      const root = elOf(sheet);
      const kind = root?.querySelector(".wodx-book")?.dataset?.sheet ?? null;
      const vitae = !!root?.querySelector('[data-roll="ghoulBlood"]');
      const named = (root?.textContent ?? "").includes(vamp.name);
      G.ok("3. the ghoul's sheet", kind === "ghoulDA" && vitae && named, {sheet: kind, vitaeButton: vitae, domitorShown: named});
      await sheet.close(); sheet = null;
    });

    await G.step("4. the same night", async () => {
      const seen = await drink(creation, {drinker: mortal.id, regnant: vamp.id, points: 1});
      await waitFor(() => Number(pool(mortal).temporary) === 3, 15000);
      G.ok("4. the same night", seen && Number(pool(mortal).temporary) === 3 && lineage(mortal).bonds?.[vamp.id]?.drinks === 1,
        {window: seen, held: Number(pool(mortal).temporary), drinks: lineage(mortal).bonds?.[vamp.id]?.drinks ?? null});
    });

    await G.step("5. the next night", async () => {
      await game.time.advance(86400);
      await sleep(500);
      const seen = await drink(creation, {drinker: mortal.id, regnant: vamp.id, points: 1});
      await waitFor(() => lineage(mortal).bonds?.[vamp.id]?.drinks === 2 && Number(pool(mortal).temporary) === 4, 15000);
      G.ok("5. the next night", seen && Number(pool(mortal).temporary) === 4 && lineage(mortal).bonds?.[vamp.id]?.drinks === 2
        && game.actors.get(mortal.id)?.system?.settings?.variant === "ghoul",
        {window: seen, held: Number(pool(mortal).temporary), drinks: lineage(mortal).bonds?.[vamp.id]?.drinks ?? null});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    try {
      await sheet?.close?.();
      await creation?.close?.();
      const ids = game.messages.filter(m => !msgs0.has(m.id)).map(m => m.id);
      if ( ids.length ) await ChatMessage.deleteDocuments(ids);
    } catch (e) { G.R.errors.push(`put back: ${e?.message ?? e}`); }
  }
  // the kit removes the test characters and moves the clock back; then the Lineage journal, the era and the hold
  try { await G.cleanup(); } catch (e) { G.R.errors.push(`cleanup: ${e?.message ?? e}`); }
  try {
    const j = game.journal.find(x => x.getFlag?.(C, "kind") === "lineage");
    if ( j && !lineageJ ) await j.delete();
    else if ( j && lineagePages ) {
      const added = [...j.pages].filter(p => !lineagePages.has(p.id)).map(p => p.id);
      if ( added.length ) await j.deleteEmbeddedDocuments("JournalEntryPage", added);
      for ( const p of [...j.pages] ) if ( lineagePages.has(p.id) && (p.text?.content ?? "") !== lineagePages.get(p.id) ) await p.update({"text.content": lineagePages.get(p.id)});
    }
    if ( game.settings.get(CH, "activeEra") !== saved.era ) await game.settings.set(CH, "activeEra", saved.era);
    await ch?.hold?.(saved.held);
    await sleep(1500);
    for ( const k of WRITTEN ) {
      const now = stored(k), was = writtenBefore[k];
      if ( !was && now ) await now.delete();
      else if ( was && now && JSON.stringify(now.value) !== JSON.stringify(was.value) ) await now.update({value: was.value});
      else if ( was && !now ) await game.settings.storage.get("world").documentClass.create(was);
    }
  } catch (e) { G.R.errors.push(`put back: ${e?.message ?? e}`); }
  return G.save();
}
