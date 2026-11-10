/**
 * The rumour network (WoDX Storyteller 0.8.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gaterumours.mjs?${Date.now()}`)).run()
 * It makes four characters and a scene of its own (three of them with tokens on it, the fourth elsewhere), and
 * deletes them and its rumour at the end. The clock never moves: nights are spread by hand.
 *   1. the module: Storyteller 0.8.0 or later, api.rumours, the rumourNetwork setting
 *   2. the three on the scene talk to each other; the fourth to none of them
 *   3. a rumour started with one of them: known to one
 *   4. a night by hand: the other two on the scene hear it; the fourth does not
 *   5. nights with nobody new: it goes quiet; heardBy lists it for the first teller
 *   6. the window lists it with who knows it
 *   7. clean up
 * Result: Data/wodx-gate/gaterumours-result.json.
 */
const MOD = "wodx-storyteller";
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/7 passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gaterumours-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const M = game.modules.get(MOD), X = M?.api?.rumours;
  const actors = [];
  let scene = null, rumour = null;
  try {
    ok("1. module", M?.active && !foundry.utils.isNewerVersion("0.8.0", M.version) && typeof X?.start === "function" && game.settings.settings.has(`${MOD}.rumourNetwork`), {version: M?.version});
    for ( const n of ["Miller", "Smith", "Priest", "Hermit"] ) actors.push(await Actor.create({name: `WoDX gate: ${n}`, type: "Mortal"}));
    scene = await Scene.create({name: "WoDX gate: Rumours", width: 1000, height: 800, padding: 0});
    await scene.createEmbeddedDocuments("Token", actors.slice(0, 3).map((a, i) => ({...a.prototypeToken.toObject(), actorId: a.id, actorLink: true, name: a.name, x: 100 + 100 * i, y: 100})));
    await sleep(400);
    const [miller, smith, priest, hermit] = actors.map(a => a.id);
    const c = X.contacts();
    ok("2. who talks", [smith, priest].every(id => c[miller]?.includes(id)) && !(c[miller] ?? []).includes(hermit) && !c[hermit]?.length, {miller: c[miller], hermit: c[hermit] ?? []});

    rumour = await X.start({text: "WoDX gate: the bell rang under the river", tellers: [miller]});
    const r = () => X.list().find(x => x.id === rumour.id);
    ok("3. started", r()?.knownBy?.length === 1 && r().knownBy[0] === miller, {knownBy: r()?.knownBy});

    await X.tick({force: true, once: rumour.id}); await sleep(300);
    ok("4. a night", [miller, smith, priest].every(id => r().knownBy.includes(id)) && !r().knownBy.includes(hermit), {knownBy: r().knownBy});

    for ( let i = 0; i < 3; i++ ) await X.tick({force: true, once: rumour.id});
    await sleep(300);
    const quiet = r().quiet >= 3, heard = X.heardBy(miller).some(x => x.id === rumour.id);
    ok("5. goes quiet", quiet && heard, {quiet: r().quiet});

    X.open(); await sleep(800);
    const txt = document.querySelector("#wodx-rumours .wstory-rumours")?.textContent ?? "";
    ok("6. in the window", txt.includes("the bell rang under the river") && txt.includes("WoDX gate: Smith"), {len: txt.length});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      await foundry.applications.instances?.get?.("wodx-rumours")?.close?.();
      if ( rumour ) await X.remove(rumour.id);
      if ( scene ) await game.scenes.get(scene.id)?.delete();
      for ( const a of actors ) await game.actors.get(a.id)?.delete();
      ok("7. clean up", !X?.list?.().some(x => x.id === rumour?.id) && (!scene || !game.scenes.get(scene.id)) && actors.every(a => !game.actors.get(a.id)));
    } catch (err) { ok("7. clean up", false, {error: err.message}); }
  }
  return save(R);
}
