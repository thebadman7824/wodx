/**
 * Ownership gate (WoDX Storyteller 0.27.0, Interactables 0.24.2), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateowners.mjs?${Date.now()}`)).run()
 * Makes its own scene "WoDX gate: Owners" with one Region and one tile, two actors; views the scene, then goes back
 * to the scene it started on and deletes everything it made. The world clock is not moved.
 *   1. the api and the toolbar button (everyone)
 *   2. a Region tagged as a holding: owner, how held, worth, the NPC place tag in step
 *   3. taking from the owner's tile marks the thing stolen; whose() says yours / someone's
 *   4. a recipe: what can be made this year, start one with bought materials, finish it, the item carries its maker
 *   5. a building: a coop in stages, paid as each starts, a tagged Region when done; Undo takes it away
 *   6. pay day for holdings, the workshops' month and the faction builds' month run without error
 *   7. the windows open and close (Property and building, Make something, Put up a building)
 *   8. every other WoDX module still answers
 * Result: Data/wodx-gate/gateowners-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOD = "wodx-storyteller";
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
async function until(fn, ms = 5000) { const t = Date.now(); while ( Date.now() - t < ms ) { if ( await fn() ) return true; await sleep(100); } return !!(await fn()); }
/** Opens a window by a call that waits on it, then closes it. */
async function openClose(fn, cls) {
  const p = fn();
  const seen = await until(() => !!document.querySelector(`.${cls}`), 4000);
  const el = document.querySelector(`.${cls}`);
  const app = el ? [...foundry.applications.instances.values()].find(a => a.element === el) : null;
  await app?.close?.();
  await Promise.race([p, sleep(1500)]);
  return seen;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const back = canvas.scene;
  const st = () => game.modules.get(MOD)?.api;
  const own = () => st()?.owners;
  const msgs0 = new Set(game.messages.map(m => m.id));
  let scene, actors = [], A, Bt, region, tile;
  const longTasks = game.settings.get(MOD, "longTasks"), moneyOn = game.settings.get(MOD, "money");
  try {
    if ( !longTasks ) await game.settings.set(MOD, "longTasks", true);
    scene = await Scene.create({name: "WoDX gate: Owners", width: 2000, height: 1500, padding: 0, grid: {type: 1, size: 100}, tokenVision: false});
    await scene.view();
    await until(() => canvas.ready && canvas.scene?.id === scene.id, 10000);
    [region] = await scene.createEmbeddedDocuments("Region", [{name: "WoDX gate: the inn", shapes: [{type: "rectangle", x: 200, y: 200, width: 600, height: 600, rotation: 0, hole: false}]}]);
    [tile] = await scene.createEmbeddedDocuments("Tile", [{x: 300, y: 300, width: 100, height: 100, texture: {src: "icons/svg/chest.svg"}}]);
    actors = await Actor.create([{name: "WoDX gate: Owner Anna", type: "Mortal"}, {name: "WoDX gate: Taker Bertold", type: "Mortal"}]);
    [A, Bt] = actors;

    await step("api and button", async () => {
      const ctl = ui.controls?.controls?.tokens?.tools ?? ui.controls?.controls?.token?.tools ?? {};
      ok("api and button", typeof own()?.open === "function" && typeof own()?.startBuild === "function" && !!ctl.wodxProperty && ctl.wodxProperty.visible === true,
        {version: st()?.version});
    });

    await step("a holding", async () => {
      await own().saveHolding(region, {owner: {id: A.uuid, kind: "actor", name: A.name}, held: "", since: null, type: "tavern"});
      const h = own().holdings().find(x => x.doc.uuid === region.uuid);
      const tag = region.flags?.["wodx-npc"]?.place;
      ok("a holding", !!h && h.value > 0 && h.income > 0 && tag?.owner === A.name && tag?.kind === "tavern", {value: h?.value, upkeep: h?.upkeep, income: h?.income, tag});
    });

    await step("taking marks it stolen", async () => {
      await own().set(tile, {id: A.uuid, kind: "actor", name: A.name});
      const [it] = await Bt.createEmbeddedDocuments("Item", [{name: "WoDX gate: a silver cup", type: "Item"}]);
      Hooks.callAll("wodxItemsTaken", {actor: Bt, items: [it.id], doc: tile, scene});
      await until(() => Bt.items.get(it.id)?.flags?.[MOD]?.owner?.stolen === true, 4000);
      const rec = Bt.items.get(it.id)?.flags?.[MOD]?.owner;
      ok("taking marks it stolen", rec?.stolen === true && rec?.id === A.uuid && own().whose(tile, Bt) === "someone's" && own().whose(tile, A) === "yours"
        && own().stolen().some(s => s.item.id === it.id), {rec});
    });

    await step("a recipe", async () => {
      const can = await own().makeable();
      await st().upkeep.money.receive(A, 10 ** 7, {note: "gate"});
      const nail = can.find(x => x.good.name === "an iron nail") ?? can.find(x => x.r.task.materials.length) ?? can[0];
      const r = await own().startCraft(A, nail.good.id, {buy: true});
      const id = Object.keys(A.flags?.[MOD]?.tasks ?? {}).find(k => A.flags[MOD].tasks[k].good === nail.good.id);
      await A.update({[`flags.${MOD}.tasks.${id}.goal`]: 1, [`flags.${MOD}.tasks.${id}.diff`]: 2, [`flags.${MOD}.tasks.${id}.dice`]: 10, [`flags.${MOD}.tasks.${id}.next`]: game.time.worldTime, [`flags.${MOD}.tasks.${id}.workshop`]: ""});
      for ( let i = 0; i < 5 && A.flags[MOD].tasks[id].status !== "done"; i++ ) {
        await st().tasks.tick({force: true});
        await A.update({[`flags.${MOD}.tasks.${id}.next`]: game.time.worldTime});
      }
      const made = A.items.find(i => i.flags?.[MOD]?.madeBy === id);
      ok("a recipe", can.length > 50 && r.ok && A.flags[MOD].tasks[id].status === "done" && made?.flags?.[MOD]?.owner?.id === A.uuid && !!made.flags[MOD].quality,
        {makeable: can.length, good: nail.good.name, spent: A.flags[MOD].tasks[id].spent, quality: made?.flags?.[MOD]?.quality, why: r.why});
    });

    await step("a building", async () => {
      const r = await own().startBuild(A, "coop", {workers: 10, sceneId: scene.id});
      const id = Object.keys(A.flags?.[MOD]?.tasks ?? {}).find(k => A.flags[MOD].tasks[k].building === "coop");
      const t0 = A.flags[MOD].tasks[id];
      const easy = (t0.stages ?? []).map(s => ({...s, goal: 1}));
      await A.update({[`flags.${MOD}.tasks.${id}.stages`]: easy, [`flags.${MOD}.tasks.${id}.goal`]: 1, [`flags.${MOD}.tasks.${id}.diff`]: 2, [`flags.${MOD}.tasks.${id}.next`]: game.time.worldTime});
      const before = st().upkeep.money.purse(A).bank + st().upkeep.money.purse(A).carried;
      for ( let i = 0; i < 12 && A.flags[MOD].tasks[id].status !== "done"; i++ ) {
        await st().tasks.tick({force: true});
        await A.update({[`flags.${MOD}.tasks.${id}.next`]: game.time.worldTime});
      }
      const t = A.flags[MOD].tasks[id];
      const reg = scene.regions.find(x => x.flags?.[MOD]?.builtBy === id);
      const after = st().upkeep.money.purse(A).bank + st().upkeep.money.purse(A).carried;
      const card = game.messages.contents.filter(m => m.flags?.[MOD]?.tasks?.built?.length).pop();
      const undoBtn = !!card;
      if ( card ) await st().tasks.undo(card);
      const gone = !scene.regions.find(x => x.flags?.[MOD]?.builtBy === id);
      ok("a building", r.ok && t.status === "done" && !!reg && reg.flags?.["wodx-npc"]?.place?.kind === "workplace" && reg.flags?.[MOD]?.owner?.id === A.uuid
        && before - after >= 0 && undoBtn && gone, {stages: easy.length, status: t.status, paid: before - after, region: reg?.name, gone, why: r.why});
    });

    await step("the months run", async () => {
      const ph = await own().payHoldings(A, 1);
      const ws = await own().workshops();
      const fb = await own().factionBuilds(() => 0.99);
      ok("the months run", !!ph && Array.isArray(ws ?? []) && Array.isArray(fb) && fb.length === 0, {holdings: ph?.text, workshops: ws?.length ?? null});
    });

    await step("the windows", async () => {
      const a = await openClose(() => own().open(), "wst-own-dlg");
      const b = await openClose(() => own().craft(), "wst-craft");
      const c = await openClose(() => own().build(), "wst-build");
      ok("the windows", a && b && c, {property: a, craft: b, build: c});
    });

    await step("other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-npc", "wodx-interactables", "wodx-otherworlds", "wodx-library"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("other modules", !off.length, {off, interactables: game.modules.get("wodx-interactables")?.version});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      if ( !longTasks ) await game.settings.set(MOD, "longTasks", false);
      R.notes.push(`money setting ${moneyOn ? "on" : "off"}`);
      if ( back && back.id !== scene?.id ) await back.view();
      if ( scene ) await scene.delete();
      for ( const x of actors ) await game.actors.get(x.id)?.delete();
      const mine = game.messages.filter(m => !msgs0.has(m.id) && (m.flags?.[MOD] || /WoDX gate/.test(m.content ?? ""))).map(m => m.id);
      if ( mine.length ) await ChatMessage.deleteDocuments(mine);
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gateowners-result.json");
}
