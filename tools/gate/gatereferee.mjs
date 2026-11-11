/**
 * Crossover referee gate (WoDX Chronicle 0.17.0), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatereferee.mjs?${Date.now()}`)).run()
 * Makes four actors (a Kindred of the 11th Generation, one of the 8th, a Garou, a mortal with True Faith 3), asks the
 * referee about them through the api, opens the window, rolls once, then deletes everything it made.
 *   1. the api, the key binding (Storyteller only) and the tool in the Storyteller's hand are there
 *   2. Dominate by the 11th on the 8th fails on Generation
 *   3. Dominate on the Garou goes against its Willpower
 *   4. Dominate on the mortal with Faith 3 does nothing (the era's Faith case comes first)
 *   5. the window opens with the selected token and the target filled in, and a ruling shows
 *   6. a roll goes to the Storyteller alone
 *   7. every other WoDX module still answers
 * Result: Data/wodx-gate/gatereferee-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
async function until(fn, ms = 5000) { const t = Date.now(); while ( Date.now() - t < ms ) { if ( fn() ) return true; await sleep(100); } return !!fn(); }

// Foundry 14 may hand back a batch of new actors out of order: match each one to its data by name
const createActors = async data => { const made = await Actor.create(data); return data.map(d => made.find(a => a.name === d.name) ?? null); };

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const api = () => game.wodx?.chronicle?.referee;
  const back = canvas.scene;
  let actors = [], scene, msgs = [];
  const flag = p => ({world: {wodx: {profile: p}}});
  try {
    actors = await createActors([
      {name: "WoDX gate: Referee young", type: "Vampire", system: {generation: 11}, flags: flag("kindred")},
      {name: "WoDX gate: Referee elder", type: "Vampire", system: {generation: 8}, flags: flag("kindred")},
      {name: "WoDX gate: Referee Garou", type: "Werewolf", flags: flag("lupine")},
      {name: "WoDX gate: Referee faithful", type: "Mortal", flags: {...flag("mortal"), "wodx-actions": {trueFaith: 3}}}]);
    // Actor.create does not keep the array's order: find each by name
    const by = n => actors.find(a => a.name === `WoDX gate: Referee ${n}`);
    const [young, elder, garou, faithful] = ["young", "elder", "Garou", "faithful"].map(by);

    await step("api, key and hand", async () => {
      const key = game.keybindings.actions.get("wodx-chronicle.referee");
      const hand = game.wodx?.storyteller?.hand?.tools ?? null;
      ok("api, key and hand", typeof api()?.ask === "function" && !!key?.restricted && (!hand || hand.some(t => t.key === "referee")),
        {key: !!key, hand: hand ? hand.map(t => t.key) : "Storyteller off"});
    });
    await step("Generation", async () => {
      const r = api().ask("mind", young, elder);
      ok("Generation", r[0]?.case.id === "mind-kindred" && r[0]?.test.verdict === "fails", {got: r.map(x => [x.case.id, x.test.verdict])});
    });
    await step("Garou", async () => {
      const r = api().ask("mind", young, garou);
      ok("Garou", r[0]?.case.id === "mind-garou" && /Willpower/.test(r[0]?.test.text), {got: r.map(x => [x.case.id, x.test.text])});
    });
    await step("True Faith", async () => {
      const r = api().ask("mind", young, faithful);
      ok("True Faith", /^mind-faith-/.test(r[0]?.case.id) && r[0]?.test.verdict === "fails", {got: r.map(x => [x.case.id, x.test.verdict])});
    });
    await step("the window", async () => {
      scene = await Scene.create({name: "WoDX gate: Referee", width: 1500, height: 1000, padding: 0, grid: {type: 1, size: 100}, tokenVision: false});
      await scene.view();
      await until(() => canvas.ready && canvas.scene?.id === scene.id, 10000);
      await scene.createEmbeddedDocuments("Token", [{name: "young", actorId: young.id, x: 100, y: 100}, {name: "elder", actorId: elder.id, x: 400, y: 100}]);
      const ty = scene.tokens.find(t => t.actorId === young.id), te = scene.tokens.find(t => t.actorId === elder.id);
      await until(() => ty.object && te.object);
      canvas.tokens.releaseAll(); ty.object.control();
      te.object.setTarget(true, {releaseOthers: true});
      await api().open({power: "mind"});
      await until(() => document.querySelector("#wodx-referee .wodx-referee-case"));
      const el = document.querySelector("#wodx-referee");
      const from = el?.querySelector("[name=from]")?.value, to = el?.querySelector("[name=to]")?.value;
      const text = el?.querySelector(".wodx-referee-case")?.textContent ?? "";
      ok("the window", from === "kindred" && to === "kindred" && /Generation/.test(text) && /young/i.test(el.textContent), {from, to, text: text.slice(0, 160)});
    });
    await step("a roll for the Storyteller", async () => {
      const m = await api().roll({who: "Gate", label: "Willpower", dice: 3, difficulty: 6});
      if ( m ) msgs.push(m);
      const gms = game.users.filter(u => u.isGM).map(u => u.id).sort();
      ok("a roll for the Storyteller", !!m && [...(m.whisper ?? [])].sort().join() === gms.join() && /dice at 6/.test(m.content), {whisper: m?.whisper});
    });
    await step("other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-npc", "wodx-interactables", "wodx-otherworlds", "wodx-storyteller"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("other modules", !off.length, {off});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      foundry.applications.instances?.get?.("wodx-referee")?.close?.();
      for ( const t of game.user.targets ) t.setTarget(false, {releaseOthers: false});
      if ( back && back.id !== scene?.id ) await back.view();
      if ( scene ) await scene.delete();
      for ( const m of msgs ) await m.delete();
      for ( const x of actors ) await game.actors.get(x.id)?.delete();
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatereferee-result.json");
}
