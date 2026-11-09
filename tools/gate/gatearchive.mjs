/**
 * Archive of the dead and large-world timing (WoDX Creation 0.7.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatearchive.mjs?${Date.now()}`)).run()
 * Back the world up first.
 *
 * It holds the world, makes its own folder of test characters (500 by default), times what a big world asks of
 * Foundry, archives its own dead, brings one back, and deletes everything it made (the test characters, their
 * archive entries, its chat cards). Characters it did not make are never archived or touched.
 *   1. the module: WoDX Creation 0.7.0 or later with the archive API and menu
 *   2. made N test characters (a third dead, in their own folder)
 *   3. timing: Pass the Years' plan over the whole world (budget 10 s)
 *   4. timing: the archive list (budget 3 s)
 *   5. timing: opening the archive window (budget 5 s)
 *   6. archived the test dead: gone from the world, in the compendium under their ids, listed in the index journal
 *   7. a test player character with a linked token stays
 *   8. bring back: one test character returns with its id
 *   9. put back: test characters, their archive entries and chat cards deleted; hold and clock as they were
 * Result: Data/wodx-gate/gatearchive-result.json.
 */
const C = "wodx-creation";
const CH = "wodx-chronicle";
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const newer = (a, b) => {
  const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number);
  for ( let i = 0; i < 3; i++ ) if ( (pa[i] ?? 0) !== (pb[i] ?? 0) ) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return true;
};

export async function run({count = 500} = {}) {
  const R = {started: new Date().toISOString(), world: game.world.id, count, steps: [], errors: [], timings: {}};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R, "gatearchive-result.json"); }
  const api = game.modules.get(C)?.api;
  const chron = game.modules.get(CH)?.api;
  const t0 = game.time.worldTime;
  const held = !!chron?.isHeld?.();
  const msgsBefore = new Set(game.messages.map(m => m.id));
  const archivedBefore = foundry.utils.deepClone(game.settings.get(C, "archived") ?? {});
  const made = new Set();
  let folder, scene;
  try {
    const mod = game.modules.get(C);
    ok("1. module", mod?.active && newer(mod.version, "0.7.0") && !!api?.archive && !!game.settings.menus.get(`${C}.archiveMenu`), {version: mod?.version});
    await chron.hold(true);

    folder = await Folder.create({name: "WoDX gate · archive test", type: "Actor"});
    const now = game.time.worldTime;
    const datas = [];
    for ( let i = 0; i < count; i++ ) {
      const dead = i % 3 === 0;
      datas.push({name: `Gate villager ${i}`, type: "Mortal", folder: folder.id,
        flags: {[C]: {chronology: dead ? {bornYear: 1150, died: now - 86400 * 365, cause: "gate"} : {bornYear: 1170}}}});
    }
    const t = performance.now();
    const actors = [];
    for ( let i = 0; i < datas.length; i += 100 ) actors.push(...await Actor.createDocuments(datas.slice(i, i + 100)));
    for ( const a of actors ) made.add(a.id);
    R.timings.create = Math.round(performance.now() - t);
    ok("2. test characters", actors.length === count, {made: actors.length, ms: R.timings.create});

    let s = performance.now();
    const plan = api.time.planSkip({from: game.time.worldTime, to: api.time.addYears(game.time.worldTime, 10)});
    R.timings.plan = Math.round(performance.now() - s);
    ok("3. plan over the whole world", R.timings.plan < 10000 && plan.rows.length >= count * 2 / 3, {ms: R.timings.plan, rows: plan.rows.length, actorsInWorld: game.actors.size});

    s = performance.now();
    const list = api.archive.candidates();
    R.timings.list = Math.round(performance.now() - s);
    const mine = list.filter(c => made.has(c.id));
    ok("4. archive list", R.timings.list < 3000 && mine.length === Math.ceil(count / 3), {ms: R.timings.list, mine: mine.length, all: list.length});

    s = performance.now();
    await api.archive.open(); await sleep(300);
    const app = [...foundry.applications.instances.values()].find(a => a.rendered && a.element?.classList.contains("wodx-archive"));
    R.timings.window = Math.round(performance.now() - s);
    ok("5. archive window", !!app && R.timings.window < 5000 && !!app.element.querySelector("input.wodx-search"), {ms: R.timings.window});
    await app?.close();

    // A dead player character with a linked token stays
    const pc = await Actor.create({name: "Gate player's dead", type: "Mortal", folder: folder.id,
      ownership: {default: 0, [game.users.find(u => !u.isGM)?.id ?? "none"]: 3}, flags: {[C]: {chronology: {died: now}}}});
    made.add(pc.id);
    scene = await Scene.create({name: "WoDX gate · archive scene", tokens: [{name: pc.name, actorId: pc.id, actorLink: true, x: 0, y: 0}]});

    s = performance.now();
    const res = await api.archive.archive([...mine.map(c => c.id), pc.id]);
    R.timings.archive = Math.round(performance.now() - s);
    const pack = game.packs.get("world.wodx-archive");
    const index = await pack?.getIndex();
    const inPack = res.archived.filter(a => index?.get(a.id)).length;
    const index_j = game.journal.find(j => j.getFlag(C, "kind") === "archive");
    const html = index_j?.pages.getName("Index")?.text?.content ?? "";
    ok("6. archived the test dead", res.archived.length === mine.length && inPack === mine.length && res.archived.every(a => !game.actors.get(a.id)) && html.includes("Gate villager 0"),
      {archived: res.archived.length, inPack, ms: R.timings.archive});
    const pcKept = res.kept.find(k => k.id === pc.id);
    ok("7. player character stays", !!game.actors.get(pc.id) && !!pcKept, {why: pcKept?.why});

    const back = res.archived[0];
    const r2 = await api.archive.restore([back.id]);
    ok("8. bring back", r2.restored.length === 1 && !!game.actors.get(back.id) && !(await pack.getIndex()).get(back.id), {id: back.id});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    let leftInPack = -1;
    try {
      // Only what the gate made: its actors in the world, its entries in the compendium and the archive record
      const ids = [...made];
      const inWorld = ids.filter(id => game.actors.get(id));
      for ( let i = 0; i < inWorld.length; i += 100 ) await Actor.deleteDocuments(inWorld.slice(i, i + 100));
      const pack = game.packs.get("world.wodx-archive");
      if ( pack ) {
        const index = await pack.getIndex();
        const inPack = ids.filter(id => index.get(id));
        for ( let i = 0; i < inPack.length; i += 100 ) await Actor.deleteDocuments(inPack.slice(i, i + 100), {pack: pack.collection});
        leftInPack = ids.filter(id => pack.index.get(id)).length;
        // The pack itself stays if anyone else is in it; the gate never made it before, so it goes if empty and new
        if ( !Object.keys(archivedBefore).length && pack.index.size === 0 ) await pack.deleteCompendium?.();
      }
      await game.settings.set(C, "archived", archivedBefore);
      const j = game.journal.find(x => x.getFlag(C, "kind") === "archive");
      if ( j && !Object.keys(archivedBefore).length ) await j.delete();
      await scene?.delete();
      await folder?.delete();
      if ( game.time.worldTime !== t0 ) await game.time.set(t0);
      const cards = game.messages.filter(m => !msgsBefore.has(m.id)).map(m => m.id);
      if ( cards.length ) await ChatMessage.deleteDocuments(cards);
      await chron?.hold?.(held);
      ok("9. put back", ![...made].some(id => game.actors.get(id)) && leftInPack <= 0 && game.time.worldTime === t0 && !!chron?.isHeld?.() === held,
        {leftInPack, removedCards: cards.length});
    } catch (err) {
      R.errors.push(`cleanup: ${err.message}`);
      ok("9. put back", false, {error: err.message});
    }
  }
  return save(R, "gatearchive-result.json");
}
