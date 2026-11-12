/**
 * Cook, brew or mix gate (WoDX Library 0.10.0, Storyteller 0.31.0), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatecook.mjs?${Date.now()}`)).run()
 * Makes its own scene "WoDX gate: Cook" (marked with a kitchen, a brewhouse and a laboratory) and one actor; views the
 * scene, then goes back to the scene it started on and deletes everything it made. The world clock is not moved.
 *   1. the apis: Storyteller cookery, Library recipes; the year has recipes
 *   2. the scene's kits are saved and read back
 *   3. an everyday dish with the ingredients carried: made at once, no roll, ingredients used up
 *   4. a brewed drink: a long task with the recipe's fields; the ingredients are used up
 *   5. a finished brew stands under its waiting name and takes its own name when its time comes (ripen)
 *   6. a made drug: strength and impure flags, the strength in its name
 *   7. teaching a recipe; a character without the know-how is refused
 *   8. the windows open and close (Cook, brew or mix; Property and building has the button); a tick runs without error
 *   9. every other WoDX module still answers
 * Result: Data/wodx-gate/gatecook-result.json.
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
async function openClose(fn, cls, check = null) {
  const p = fn();
  const seen = await until(() => !!document.querySelector(`.${cls}`), 4000);
  const el = document.querySelector(`.${cls}`);
  const extra = check ? check(el) : true;
  const app = el ? [...foundry.applications.instances.values()].find(a => a.element === el) : null;
  await app?.close?.();
  await Promise.race([p, sleep(1500)]);
  return seen && extra;
}
const qty = it => Math.max(1, Math.floor(Number(it?.flags?.["wodx-sheets"]?.qty) || 1));

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const back = canvas.scene;
  const st = () => game.modules.get(MOD)?.api;
  const ck = () => st()?.cookery;
  const msgs0 = new Set(game.messages.map(m => m.id));
  let scene, A;
  const longTasks = game.settings.get(MOD, "longTasks");
  try {
    if ( !longTasks ) await game.settings.set(MOD, "longTasks", true);
    scene = await Scene.create({name: "WoDX gate: Cook", width: 1500, height: 1000, padding: 0, grid: {type: 1, size: 100}, tokenVision: false});
    await scene.view();
    await until(() => canvas.ready && canvas.scene?.id === scene.id, 10000);
    [A] = await Actor.create([{name: "WoDX gate: Cook Clara", type: "Mortal"}]);
    await A.update({"system.attributes.dexterity.value": 3, "system.attributes.dexterity.total": 3, "system.attributes.intelligence.value": 3, "system.attributes.intelligence.total": 3,
      "system.abilities.crafts.value": 3, "system.abilities.medicine.value": 3});
    await scene.createEmbeddedDocuments("Token", [{name: A.name, actorId: A.id, x: 300, y: 300, width: 1, height: 1}]);
    const year = Number(game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.()) || 0;
    R.notes.push(`year ${year}`);

    await step("apis", async () => {
      const L = await ck()?.lib?.();
      const list = await ck().list(A);
      ok("apis", !!ck()?.open && !!game.modules.get("wodx-library")?.api?.recipes && !!L?.R && list.length > 20, {recipes: list.length, version: game.modules.get(MOD)?.version});
    });

    await step("scene kits", async () => {
      await ck().setKits(scene, ["kitchen", "brewhouse", "laboratory", "nonsense"]);
      const k = ck().kits(scene);
      ok("scene kits", k.length === 3 && k.includes("laboratory") && !k.includes("nonsense"), {kits: k});
    });

    await step("everyday dish", async () => {
      await A.createEmbeddedDocuments("Item", [{name: "vegetables", type: "Item", flags: {"wodx-sheets": {qty: 3}}}, {name: "an onion", type: "Item"}]);
      const {G} = await ck().lib();
      const soup = G.GOODS.find(g => g.name === "vegetable soup");
      const r = await ck().start(A, soup.id, {batch: 1});
      const made = A.items.find(i => i.name === "vegetable soup");
      const left = ["vegetables", "an onion"].reduce((s, n) => { const i = A.items.find(x => x.name === n); return s + (i ? qty(i) : 0); }, 0);
      ok("everyday dish", r.ok && r.now && !!made && left === 3, {r: {ok: r.ok, now: r.now, why: r.why}, left});
    });

    let task = null;
    await step("brewed drink", async () => {
      await A.createEmbeddedDocuments("Item", [{name: "an apple", type: "Item", flags: {"wodx-sheets": {qty: 6}}}]);
      const {G} = await ck().lib();
      const cider = G.GOODS.find(g => g.name === "cider");
      const r = await ck().start(A, cider.id, {batch: 2});
      task = r.task;
      const apples = A.items.find(i => i.name === "an apple");
      ok("brewed drink", r.ok && !r.now && task?.recipe === "cider" && task.batch === 2 && task.wait === 14 && !apples, {why: r.why, task: task && {name: task.name, goal: task.goal, workshop: task.workshop}});
    });

    await step("standing and ready", async () => {
      await ck().finish(A, {...task, total: task.goal + 2, status: "done"});
      const it = A.items.find(i => i.flags?.[MOD]?.ripens);
      const waitName = it?.name;
      await it?.update({[`flags.${MOD}.ripens.at`]: (game.time.worldTime ?? 0) - 1});
      await ck().ripen();
      const done = A.items.get(it?.id);
      ok("standing and ready", /fermenting/.test(waitName ?? "") && done && !done.flags?.[MOD]?.ripens && /^cider/.test(done.name) && qty(done) === 2, {waitName, now: done?.name});
    });

    await step("made drug", async () => {
      const {G} = await ck().lib();
      const opium = G.GOODS.find(g => g.name === "a lump of opium");
      await ck().finish(A, {id: "gate", good: opium.id, makes: opium.name, batch: 1, wait: 0, strength: true, impure: true, total: 9, goal: 3, leaves: []});
      const it = A.items.find(i => i.name.startsWith("a lump of opium"));
      ok("made drug", it?.flags?.[MOD]?.strength === "strong" && it.flags[MOD].impure === true && /strong/.test(it.name), {name: it?.name, flags: it?.flags?.[MOD]});
    });

    await step("know-how", async () => {
      await A.update({"system.abilities.crafts.value": 0});
      const {G} = await ck().lib();
      const wine = G.GOODS.find(g => g.name === "claret");
      const listBefore = (await ck().list(A)).find(x => x.good.id === wine.id);
      await ck().teach(A, "wine");
      const listAfter = (await ck().list(A)).find(x => x.good.id === wine.id);
      await A.update({"system.abilities.crafts.value": 3});
      ok("know-how", listBefore && !listBefore.know.ok && listAfter?.know?.how === "taught", {before: listBefore?.know, after: listAfter?.know});
    });

    await step("windows and tick", async () => {
      const a = await openClose(() => ck().open(A), "wst-cook-dlg", el => el?.querySelectorAll?.("input[name=good]")?.length > 5);
      const b = await openClose(() => st().owners.open(), "wst-own-dlg", el => /Cook, brew or mix/.test(el?.textContent ?? ""));
      await st().tasks.tick({force: true});
      ok("windows and tick", a && b, {cook: a, property: b});
    });

    await step("other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-npc", "wodx-interactables", "wodx-otherworlds", "wodx-library", "wodx-sheets"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("other modules", !off.length, {off});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      if ( !longTasks ) await game.settings.set(MOD, "longTasks", false);
      if ( back && back.id !== scene?.id ) await back.view();
      if ( scene ) await scene.delete();
      if ( A ) await game.actors.get(A.id)?.delete();
      const mine = game.messages.filter(m => !msgs0.has(m.id) && (m.flags?.[MOD] || /WoDX gate|wst-cook/.test(m.content ?? ""))).map(m => m.id);
      if ( mine.length ) await ChatMessage.deleteDocuments(mine);
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatecook-result.json");
}
